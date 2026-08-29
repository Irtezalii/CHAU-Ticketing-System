// Maps a Notion "Status" select/status option name back to the exact status
// string this app stores in D1 / expects in src/components/AdminTable.tsx's
// STATUS_OPTIONS. Keys are matched case-insensitively.
//
// IMPORTANT: this list is a best-effort default. It was NOT verified against
// the live Notion database's actual configured Status options (no access to
// the Notion workspace from here). Open the ticket database in Notion, check
// the exact option names on the Status property, and adjust the keys below to
// match exactly if a status change stops syncing.
const NOTION_STATUS_TO_APP_STATUS: Record<string, string> = {
  "not started": "Not Started",
  "initial response": "Initial Response",
  "in progress": "In Progress",
  "waiting on client": "Waiting on Client",
  "completed by dev": "Completed by Dev",
  "resolved": "Resolved",
  // Notion's own default Status-property option names, in case the database
  // was left on Notion's built-in groups instead of the app's custom labels.
  "done": "Resolved",
  "complete": "Resolved",
  "not_started": "Not Started",
};

export function mapNotionStatusToAppStatus(notionStatusName: string | null | undefined): string | null {
  if (!notionStatusName) return null;
  const key = notionStatusName.trim().toLowerCase();
  return NOTION_STATUS_TO_APP_STATUS[key] ?? null;
}

// Priority is a Notion "select" property that syncTicketToNotion() creates
// on the fly with the app's own priority label ("Urgent" | "High" | "Medium"),
// so Notion's option name already matches the app's stored value verbatim in
// the common case. This only normalizes casing/whitespace; it does not
// invent values that were never seen before.
const KNOWN_APP_PRIORITIES = ["Urgent", "High", "Medium", "Low"];

export function mapNotionPriorityToAppPriority(notionPriorityName: string | null | undefined): string | null {
  if (!notionPriorityName) return null;
  const trimmed = notionPriorityName.trim();
  const match = KNOWN_APP_PRIORITIES.find(
    (p) => p.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ?? trimmed;
}
