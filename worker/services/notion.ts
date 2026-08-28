import type { Env } from "../types";

export async function syncTicketToNotion(
  ticket: Record<string, any>,
  env: Env,
): Promise<void> {
  if (!env.NOTION_API_KEY || !env.NOTION_DATABASE_ID) {
    console.warn("Notion credentials missing in env; skipping Notion sync.");
    return;
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
        "Notion-Version": "2022-06-28",
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
    } else {
      console.log(`Successfully created Notion page for ${ticketRef}!`);
    }
  } catch (err) {
    console.error("Error connecting to Notion API:", err);
  }
}
