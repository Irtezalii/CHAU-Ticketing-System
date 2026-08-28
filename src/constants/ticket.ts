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
  "Not Started": "bg-[#0891b2]/15 text-[#67e8f9] border-[#06b6d4]/40",
  "Initial Response": "bg-[#7e22ce]/15 text-[#e9d5ff] border-[#c084fc]/40",
  "In Progress": "bg-[#ca8a04]/15 text-[#fef08a] border-[#eab308]/40",
  "Waiting on Client": "bg-[#e11d48]/15 text-[#fda4af] border-[#f43f5e]/40",
  "Completed by Dev": "bg-[#0f766e]/15 text-[#99f6e4] border-[#2dd4bf]/40",
  Resolved: "bg-[#16a34a]/15 text-[#86efac] border-[#22c55e]/40",
};

export const STATUS_BORDER_LEFT: Record<string, string> = {
  "Not Started": "border-l-[#06b6d4]",
  "Initial Response": "border-l-[#c084fc]",
  "In Progress": "border-l-[#eab308]",
  "Waiting on Client": "border-l-[#f43f5e]",
  "Completed by Dev": "border-l-[#2dd4bf]",
  Resolved: "border-l-[#22c55e]",
};

export interface StatusPillConfig {
  label: string;
  dot: string;
  active: string;
  inactive: string;
  badgeActive: string;
  badgeInactive: string;
}

export const STATUS_PILL_CONFIG: Record<string, StatusPillConfig> = {
  "Not Started": {
    label: "PENDING",
    dot: "bg-[#06b6d4]",
    active:
      "border-[#22d3ee]/80 text-[#67e8f9] bg-[#0891b2]/25 shadow-[0_0_12px_rgba(34,211,238,0.25)]",
    inactive:
      "border-[#1e293b] text-[#94a3b8] hover:text-[#67e8f9] hover:border-[#0e7490]/60 bg-[#0c121e]/80",
    badgeActive: "bg-[#06b6d4]/30 text-[#cffafe]",
    badgeInactive: "bg-[#1e293b] text-[#64748b]",
  },
  "Initial Response": {
    label: "INITIAL RESPONSE",
    dot: "bg-[#c084fc]",
    active:
      "border-[#c084fc]/80 text-[#e9d5ff] bg-[#7e22ce]/25 shadow-[0_0_12px_rgba(192,132,252,0.25)]",
    inactive:
      "border-[#1e293b] text-[#94a3b8] hover:text-[#e9d5ff] hover:border-[#6b21a8]/60 bg-[#0c121e]/80",
    badgeActive: "bg-[#c084fc]/30 text-[#f3e8ff]",
    badgeInactive: "bg-[#1e293b] text-[#64748b]",
  },
  "In Progress": {
    label: "IN PROGRESS",
    dot: "bg-[#eab308]",
    active:
      "border-[#eab308]/80 text-[#fef08a] bg-[#ca8a04]/20 shadow-[0_0_12px_rgba(234,179,8,0.25)]",
    inactive:
      "border-[#1e293b] text-[#94a3b8] hover:text-[#fef08a] hover:border-[#854d0e]/60 bg-[#0c121e]/80",
    badgeActive: "bg-[#eab308]/25 text-[#fef9c3]",
    badgeInactive: "bg-[#1e293b] text-[#64748b]",
  },
  "Waiting on Client": {
    label: "WAITING ON CLIENT",
    dot: "bg-[#f43f5e]",
    active:
      "border-[#fb7185]/80 text-[#fda4af] bg-[#e11d48]/25 shadow-[0_0_12px_rgba(251,113,133,0.25)]",
    inactive:
      "border-[#1e293b] text-[#94a3b8] hover:text-[#fda4af] hover:border-[#9f1239]/60 bg-[#0c121e]/80",
    badgeActive: "bg-[#f43f5e]/30 text-[#ffe4e6]",
    badgeInactive: "bg-[#1e293b] text-[#64748b]",
  },
  "Completed by Dev": {
    label: "COMPLETED DEV",
    dot: "bg-[#2dd4bf]",
    active:
      "border-[#2dd4bf]/80 text-[#99f6e4] bg-[#0f766e]/25 shadow-[0_0_12px_rgba(45,212,191,0.25)]",
    inactive:
      "border-[#1e293b] text-[#94a3b8] hover:text-[#99f6e4] hover:border-[#134e4a]/60 bg-[#0c121e]/80",
    badgeActive: "bg-[#2dd4bf]/30 text-[#ccfbf1]",
    badgeInactive: "bg-[#1e293b] text-[#64748b]",
  },
  Resolved: {
    label: "RESOLVED",
    dot: "bg-[#22c55e]",
    active:
      "border-[#4ade80]/80 text-[#86efac] bg-[#16a34a]/25 shadow-[0_0_12px_rgba(74,222,128,0.25)]",
    inactive:
      "border-[#1e293b] text-[#94a3b8] hover:text-[#86efac] hover:border-[#15803d]/60 bg-[#0c121e]/80",
    badgeActive: "bg-[#22c55e]/30 text-[#dcfce7]",
    badgeInactive: "bg-[#1e293b] text-[#64748b]",
  },
};

export const ITEMS_PER_PAGE = 10;
