import { verifyAdminToken } from "../config/auth";
import { appendAttachmentToNotion } from "../services/notion";
import type { Env } from "../types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_TICKET = 20;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "video/mp4",
  "video/quicktime",
]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "attachment";
}

// ----------------------------------------------------
// POST /api/tickets/:ticketRef/attachments (PUBLIC)
// ----------------------------------------------------
export async function handleUploadAttachment(
  ticketRef: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  try {
    const ticket = await env.ticketing_db
      .prepare("SELECT ticket_ref, notion_page_id FROM tickets WHERE ticket_ref = ? OR id = ?")
      .bind(ticketRef, ticketRef)
      .first();

    if (!ticket) {
      return Response.json(
        { success: false, message: "Ticket not found" },
        { status: 404 },
      );
    }
    const exactRef = (ticket as Record<string, any>).ticket_ref || ticketRef;

    const countRow = await env.ticketing_db
      .prepare(
        "SELECT COUNT(*) as count FROM ticket_attachments WHERE ticket_ref = ?",
      )
      .bind(exactRef)
      .first();
    const existingCount = Number((countRow as Record<string, any>)?.count || 0);
    if (existingCount >= MAX_FILES_PER_TICKET) {
      return Response.json(
        {
          success: false,
          message: `Limit of ${MAX_FILES_PER_TICKET} attachments per ticket reached`,
        },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { success: false, message: "No file provided" },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { success: false, message: "File exceeds the 10MB limit" },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        { success: false, message: `Unsupported file type: ${file.type || "unknown"}` },
        { status: 400 },
      );
    }

    const safeName = sanitizeFileName(file.name);
    const r2Key = `${exactRef}/${crypto.randomUUID()}-${safeName}`;

    await env.ticket_attachments.put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const inserted = await env.ticketing_db
      .prepare(
        `INSERT INTO ticket_attachments (ticket_ref, r2_key, file_name, content_type, size_bytes)
         VALUES (?, ?, ?, ?, ?)
         RETURNING *;`,
      )
      .bind(exactRef, r2Key, file.name, file.type, file.size)
      .first();
    const attachment = inserted as Record<string, any>;

    // Every attachment also becomes a chat message so it shows up inline in
    // the live chat for both the submitter and the agent, not just as a
    // silent row in the attachments table.
    const isAdmin = verifyAdminToken(request, env);
    const senderRole = isAdmin ? "agent" : "user";
    const senderName =
      (formData.get("senderName") as string | null)?.trim() ||
      (isAdmin ? "Support Specialist" : "Anonymous");

    const insertedMessage = await env.ticketing_db
      .prepare(
        `INSERT INTO ticket_messages (ticket_ref, sender_name, sender_role, message, attachment_id)
         VALUES (?, ?, ?, ?, ?)
         RETURNING *;`,
      )
      .bind(exactRef, senderName, senderRole, `📎 ${file.name}`, attachment.id)
      .first();

    // Best-effort: mirror the attachment onto the ticket's Notion page so
    // it shows up there too, not just in the live chat.
    const notionPageId = (ticket as Record<string, any>).notion_page_id;
    if (notionPageId) {
      const fileUrl = `${new URL(request.url).origin}/api/attachments/${attachment.id}`;
      ctx.waitUntil(
        appendAttachmentToNotion(notionPageId, { url: fileUrl, name: file.name }, env),
      );
    }

    return Response.json(
      { success: true, attachment, message: insertedMessage },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Failed to upload attachment",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ----------------------------------------------------
// GET /api/tickets/:ticketRef/attachments (PUBLIC)
// ----------------------------------------------------
export async function handleGetAttachments(
  ticketRef: string,
  env: Env,
): Promise<Response> {
  try {
    const { results } = await env.ticketing_db
      .prepare(
        `SELECT id, ticket_ref, file_name, content_type, size_bytes, created_at
         FROM ticket_attachments WHERE ticket_ref = ? ORDER BY id ASC`,
      )
      .bind(ticketRef)
      .all();

    return Response.json({ success: true, attachments: results });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Failed to fetch attachments",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ----------------------------------------------------
// GET /api/attachments/:id (PUBLIC) - streams the file from R2
// ----------------------------------------------------
export async function handleDownloadAttachment(
  attachmentId: string,
  env: Env,
): Promise<Response> {
  try {
    const attachment = await env.ticketing_db
      .prepare("SELECT * FROM ticket_attachments WHERE id = ?")
      .bind(attachmentId)
      .first();

    if (!attachment) {
      return new Response("Not Found", { status: 404 });
    }

    const record = attachment as Record<string, any>;
    const object = await env.ticket_attachments.get(record.r2_key);

    if (!object) {
      return new Response("Not Found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set(
      "content-disposition",
      `inline; filename="${record.file_name.replace(/"/g, "")}"`,
    );

    return new Response(object.body, { headers });
  } catch (error) {
    return new Response(
      `Failed to fetch attachment: ${error instanceof Error ? error.message : String(error)}`,
      { status: 500 },
    );
  }
}
