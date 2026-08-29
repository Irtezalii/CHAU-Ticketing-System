import type { Env } from "../types";
import {
  extractCommentText,
  extractStatusAndPriority,
  fetchNotionComment,
  fetchNotionPage,
  fetchNotionUserName,
  verifyNotionSignature,
} from "../services/notion";
import {
  mapNotionPriorityToAppPriority,
  mapNotionStatusToAppStatus,
} from "../config/notionMappings";

interface NotionWebhookEvent {
  id?: string;
  type?: string;
  entity?: { id?: string; type?: string };
  data?: Record<string, any>;
}

// ----------------------------------------------------
// POST /api/webhooks/notion (Notion -> App)
// ----------------------------------------------------
export async function handleNotionWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const rawBody = await request.text();

  let parsed: NotionWebhookEvent & { verification_token?: string };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return Response.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  // One-time URL verification handshake: Notion sends this once, unsigned,
  // when the subscription is first created. Log the token so the operator
  // can paste it back into Notion's webhook UI, then store it as
  // NOTION_WEBHOOK_SECRET for signature verification on every real event.
  if (parsed.verification_token) {
    console.log(
      "Notion webhook verification token (copy this into the Notion integration's Webhooks UI):",
      parsed.verification_token,
    );
    return Response.json({ success: true });
  }

  const signatureHeader = request.headers.get("X-Notion-Signature");
  const isValid = await verifyNotionSignature(
    rawBody,
    signatureHeader,
    env.NOTION_WEBHOOK_SECRET,
  );
  if (!isValid) {
    console.error("Rejected Notion webhook: invalid or missing signature");
    return Response.json({ success: false, message: "Invalid signature" }, { status: 401 });
  }

  switch (parsed.type) {
    case "page.properties_updated":
      ctx.waitUntil(handlePagePropertiesUpdated(parsed, env));
      break;
    case "comment.created":
      ctx.waitUntil(handleCommentCreated(parsed, env));
      break;
    default:
      console.log("Ignoring unhandled Notion webhook event type:", parsed.type);
  }

  return Response.json({ success: true });
}

async function handlePagePropertiesUpdated(
  event: NotionWebhookEvent,
  env: Env,
): Promise<void> {
  const pageId = event.entity?.id;
  if (!pageId) return;

  const ticket = await env.ticketing_db
    .prepare("SELECT * FROM tickets WHERE notion_page_id = ?")
    .bind(pageId)
    .first<Record<string, any>>();

  if (!ticket) {
    console.log("No ticket tracked for Notion page:", pageId);
    return;
  }

  const page = await fetchNotionPage(pageId, env);
  if (!page) return;

  const { status: notionStatus, priority: notionPriority } = extractStatusAndPriority(page);
  const mappedStatus = mapNotionStatusToAppStatus(notionStatus);
  const mappedPriority = mapNotionPriorityToAppPriority(notionPriority);

  if (notionStatus && !mappedStatus) {
    console.warn(
      `Unmapped Notion status "${notionStatus}" for ticket ${ticket.ticket_ref}; skipping status sync. Update worker/config/notionMappings.ts.`,
    );
  }

  const statusChanged = mappedStatus !== null && mappedStatus !== ticket.status;
  const priorityChanged = mappedPriority !== null && mappedPriority !== ticket.priority;

  if (!statusChanged && !priorityChanged) return;

  await env.ticketing_db
    .prepare(
      `UPDATE tickets
       SET status = COALESCE(?, status),
           priority = COALESCE(?, priority),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(statusChanged ? mappedStatus : null, priorityChanged ? mappedPriority : null, ticket.id)
    .run();

  const exactRef = ticket.ticket_ref || String(ticket.id);
  const messages: string[] = [];
  if (statusChanged) messages.push(`Status changed to ${mappedStatus}`);
  if (priorityChanged) messages.push(`Priority changed to ${mappedPriority}`);

  for (const message of messages) {
    await env.ticketing_db
      .prepare(
        `INSERT INTO ticket_messages (ticket_ref, sender_name, sender_role, message)
         VALUES (?, 'System', 'system', ?)`,
      )
      .bind(exactRef, message)
      .run();
  }
}

async function handleCommentCreated(
  event: NotionWebhookEvent,
  env: Env,
): Promise<void> {
  const commentId = event.entity?.id;
  const pageId = event.data?.page_id;
  if (!commentId || !pageId) return;

  const ticket = await env.ticketing_db
    .prepare("SELECT * FROM tickets WHERE notion_page_id = ?")
    .bind(pageId)
    .first<Record<string, any>>();

  if (!ticket) {
    console.log("No ticket tracked for Notion page:", pageId);
    return;
  }

  const comment = await fetchNotionComment(pageId, commentId, env);
  if (!comment) return;

  const text = extractCommentText(comment);
  if (!text) return;

  const userId = comment.created_by?.id as string | undefined;
  const senderName = userId ? await fetchNotionUserName(userId, env) : "Notion User";
  const exactRef = ticket.ticket_ref || String(ticket.id);

  try {
    await env.ticketing_db
      .prepare(
        `INSERT INTO ticket_messages (ticket_ref, sender_name, sender_role, message, notion_comment_id)
         VALUES (?, ?, 'agent', ?, ?)`,
      )
      .bind(exactRef, senderName, text, commentId)
      .run();
  } catch (err) {
    // Unique constraint on notion_comment_id — Notion retried a delivery we
    // already processed. Safe to ignore.
    console.log("Duplicate Notion comment webhook delivery ignored:", commentId, err);
  }
}
