export interface Env {
  ticketing_db: D1Database;
  ticket_attachments: R2Bucket;
  NOTION_API_KEY?: string;
  NOTION_DATABASE_ID?: string;
  NOTION_WEBHOOK_SECRET?: string;
  ADMIN_SECRET_TOKEN?: string;
  SENDGRID_API_KEY?: string;
  SENDGRID_FROM_EMAIL?: string;
  SENDGRID_FROM_NAME?: string;
}

export interface TicketRequestBody {
  ticketRef?: string;
  name?: string;
  email?: string;
  subject?: string;
  requestType?: string;
  priority?: string;
  mainDescription?: string;
  expectedBehavior?: string;
  impact?: string;
  phone?: string;
  leadPhone?: string;
  platformArea?: string;
  workspaceKind?: string;
  workspaceName?: string;
  workspaceUse?: string;
  neededBy?: string;
  campaignName?: string;
  campaignGoal?: string;
  goLiveDate?: string;
  otherTimeframe?: string;
}

export interface MessageRequestBody {
  senderName?: string;
  senderRole?: "user" | "agent" | "system";
  message?: string;
}
