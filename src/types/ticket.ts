export type RequestType = '' | 'problem' | 'question' | 'workspace' | 'campaign' | 'other';
export type ImpactLevel = 'blocked' | 'workaround' | 'minor' | '';

export interface FormState {
  name: string;
  email: string;
  title: string;
  mainDescription: string;
  requestType: RequestType;
  expectedBehavior: string;
  impact: ImpactLevel;
  leadPhone: string;
  platformArea: string;
  workspaceKind: string;
  workspaceName: string;
  workspaceUse: string;
  neededBy: string;
  campaignName: string;
  campaignGoal: string;
  goLiveDate: string;
  otherTimeframe: string;
}

export interface TicketRecord {
  id: number;
  ticket_ref: string | null;
  name: string;
  email: string;
  subject: string;
  request_type: string;
  priority: string;
  status: string;
  main_description: string | null;
  lead_phone: string | null;
  expected_behavior: string | null;
  notion_page_id?: string | null;
  created_at: string;
  last_agent_message_at?: string | null;
  agent_message_count?: number;
}
