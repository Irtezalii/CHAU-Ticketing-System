import type { Env } from "../types";

const NOTION_VERSION = "2022-06-28";

// ----------------------------------------------------
// App -> Notion: create a ticket page
// ----------------------------------------------------
export async function syncTicketToNotion(
  ticket: Record<string, any>,
  env: Env,
): Promise<string | null> {
  if (!env.NOTION_API_KEY || !env.NOTION_DATABASE_ID) {
    console.warn("Notion credentials missing in env; skipping Notion sync.");
    return null;
  }

  const ticketRef = ticket.ticket_ref || "TK-UNKNOWN";
  const subject = ticket.subject || "No Subject";
  const email = ticket.email || "N/A";
  const requestType = ticket.request_type || "General";
  const priority = ticket.priority || "Medium";
  const mainDescription = ticket.main_description || "No description provided.";

  try {
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_API_KEY}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: env.NOTION_DATABASE_ID },
        properties: {
          Name: {
            title: [{ text: { content: `${subject}` } }],
          },
          Priority: {
            select: { name: priority },
          },
          Status: {
            status: { name: "Not started" },
          },
          Category: {
            select: { name: requestType },
          },
          Text: {
            rich_text: [{ text: { content: `[${ticketRef}]` } }],
          },
          "Submitted By": {
            email: email,
          },
        },
        children: [
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [{ text: { content: "Ticket Details" } }],
            },
          },
          {
            object: "block",
            type: "heading_3",
            heading_3: {
              rich_text: [{ text: { content: "Main Description" } }],
            },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ text: { content: mainDescription } }],
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Failed to sync ticket to Notion:", errText);
      return null;
    }

    const page = (await response.json()) as { id?: string };
    console.log(`Successfully created Notion page for ${ticketRef}!`);
    return page.id ?? null;
  } catch (err) {
    console.error("Error connecting to Notion API:", err);
    return null;
  }
}

// ----------------------------------------------------
// App -> Notion: push a status/priority change to an existing page
// ----------------------------------------------------
export async function updateNotionPage(
  pageId: string,
  updates: { status?: string; priority?: string },
  env: Env,
): Promise<boolean> {
  if (!env.NOTION_API_KEY) return false;

  const properties: Record<string, any> = {};
  if (updates.status) {
    properties.Status = { status: { name: updates.status } };
  }
  if (updates.priority) {
    properties.Priority = { select: { name: updates.priority } };
  }
  if (Object.keys(properties).length === 0) return true;

  try {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.NOTION_API_KEY}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      console.error(
        "Failed to push ticket update to Notion:",
        pageId,
        await response.text(),
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error pushing ticket update to Notion:", pageId, err);
    return false;
  }
}

// ----------------------------------------------------
// App -> Notion: append an uploaded attachment as a file block
// ----------------------------------------------------
export async function appendAttachmentToNotion(
  pageId: string,
  attachment: { url: string; name: string },
  env: Env,
): Promise<boolean> {
  if (!env.NOTION_API_KEY) return false;

  try {
    const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.NOTION_API_KEY}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        children: [
          {
            object: "block",
            type: "file",
            file: {
              type: "external",
              external: { url: attachment.url },
              caption: [{ type: "text", text: { content: attachment.name } }],
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(
        "Failed to append attachment to Notion page:",
        pageId,
        await response.text(),
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error appending attachment to Notion page:", pageId, err);
    return false;
  }
}

// ----------------------------------------------------
// Notion -> App: webhook signature verification
// ----------------------------------------------------
export async function verifyNotionSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody),
  );
  const hex = [...new Uint8Array(signatureBuffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expected = `sha256=${hex}`;

  return timingSafeEqual(expected, signatureHeader);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// ----------------------------------------------------
// Notion -> App: fetch current page state
// ----------------------------------------------------
export async function fetchNotionPage(
  pageId: string,
  env: Env,
): Promise<Record<string, any> | null> {
  if (!env.NOTION_API_KEY) return null;

  try {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: {
        Authorization: `Bearer ${env.NOTION_API_KEY}`,
        "Notion-Version": NOTION_VERSION,
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch Notion page:", pageId, await response.text());
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error("Error fetching Notion page:", pageId, err);
    return null;
  }
}

export function extractStatusAndPriority(page: Record<string, any>): {
  status: string | null;
  priority: string | null;
} {
  const status = page?.properties?.Status?.status?.name ?? null;
  const priority = page?.properties?.Priority?.select?.name ?? null;
  return { status, priority };
}

// ----------------------------------------------------
// Notion -> App: fetch a specific comment on a page
// ----------------------------------------------------
export async function fetchNotionComment(
  pageId: string,
  commentId: string,
  env: Env,
): Promise<Record<string, any> | null> {
  if (!env.NOTION_API_KEY) return null;

  try {
    let cursor: string | undefined;
    do {
      const url = new URL("https://api.notion.com/v1/comments");
      url.searchParams.set("block_id", pageId);
      if (cursor) url.searchParams.set("start_cursor", cursor);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${env.NOTION_API_KEY}`,
          "Notion-Version": NOTION_VERSION,
        },
      });

      if (!response.ok) {
        console.error(
          "Failed to list Notion comments for page:",
          pageId,
          await response.text(),
        );
        return null;
      }

      const data = (await response.json()) as {
        results?: Array<Record<string, any>>;
        has_more?: boolean;
        next_cursor?: string;
      };

      const found = (data.results || []).find((c) => c.id === commentId);
      if (found) return found;

      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);

    return null;
  } catch (err) {
    console.error("Error fetching Notion comment:", commentId, err);
    return null;
  }
}

export function extractCommentText(comment: Record<string, any>): string {
  const richText = comment?.rich_text as Array<{ plain_text?: string }> | undefined;
  return (richText || []).map((t) => t.plain_text || "").join("").trim();
}

// ----------------------------------------------------
// Notion -> App: resolve a user id to a display name
// ----------------------------------------------------
export async function fetchNotionUserName(
  userId: string,
  env: Env,
): Promise<string> {
  if (!env.NOTION_API_KEY) return "Notion User";

  try {
    const response = await fetch(`https://api.notion.com/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${env.NOTION_API_KEY}`,
        "Notion-Version": NOTION_VERSION,
      },
    });

    if (!response.ok) return "Notion User";

    const user = (await response.json()) as { name?: string };
    return user.name || "Notion User";
  } catch (err) {
    console.error("Error fetching Notion user:", userId, err);
    return "Notion User";
  }
}
