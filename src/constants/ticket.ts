import type { FormState } from "../types/ticket"; // FIXED: added 'type' keyword

export const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  title: "",
  mainDescription: "",
  requestType: "",
  expectedBehavior: "",
  impact: "",
  leadPhone: "",
  platformArea: "",
  workspaceKind: "A new workspace",
  workspaceName: "",
  workspaceUse: "",
  neededBy: "",
  campaignName: "",
  campaignGoal: "",
  goLiveDate: "",
  otherTimeframe: "No particular deadline",
};

export const SLA_MAP: Record<string, string> = {
  P1: "within 1 hour",
  P2: "within 4 business hours",
  P3: "within 1 business day",
};

export const STATUS_THEME: Record<string, string> = {
  "Not Started": "bg-[#1f2937]/40 text-[#9ca3af] border-[#374151]",
  "Initial Response": "bg-[#7e22ce]/20 text-[#c084fc] border-[#7e22ce]/40",
  "In Progress": "bg-[#b45309]/20 text-[#fbbf24] border-[#b45309]/40",
  "Waiting on Client": "bg-[#1d4ed8]/20 text-[#60a5fa] border-[#1d4ed8]/40",
  "Completed by Dev": "bg-[#0f766e]/20 text-[#2dd4bf] border-[#0f766e]/40",
  Resolved: "bg-[#15803d]/20 text-[#4ade80] border-[#15803d]/40",
};

export const STATUS_BORDER_LEFT: Record<string, string> = {
  "Not Started": "border-l-[#64748b]",
  "Initial Response": "border-l-[#a855f7]",
  "In Progress": "border-l-[#f59e0b]",
  "Waiting on Client": "border-l-[#3b82f6]",
  "Completed by Dev": "border-l-[#14b8a6]",
  Resolved: "border-l-[#22c55e]",
};

export const ITEMS_PER_PAGE = 10;
