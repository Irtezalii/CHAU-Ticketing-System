// match exactly if a status change stops syncing.
const NOTION_STATUS_TO_APP_STATUS: Record<string, string> = {
  "not started": "Not Started",
  "initial response": "Initial Response",
  "in progress": "In Progress",
  "waiting on client": "Waiting on Client",
  "completed by dev": "Completed by Dev",
  "resolved": "Resolved",
  "done": "Resolved",
  "complete": "Resolved",
  "not_started": "Not Started",
};

export function mapNotionStatusToAppStatus(notionStatusName: string | null | undefined): string | null {
  if (!notionStatusName) return null;
  const key = notionStatusName.trim().toLowerCase();
  return NOTION_STATUS_TO_APP_STATUS[key] ?? null;
}

const KNOWN_APP_PRIORITIES = ["Urgent", "High", "Medium", "Low"];

export function mapNotionPriorityToAppPriority(notionPriorityName: string | null | undefined): string | null {
  if (!notionPriorityName) return null;
  const trimmed = notionPriorityName.trim();
  const match = KNOWN_APP_PRIORITIES.find(
    (p) => p.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ?? trimmed;
}
