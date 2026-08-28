import { useState } from "react";
import {
  STATUS_BORDER_LEFT,
  STATUS_PILL_CONFIG,
  STATUS_THEME,
} from "../constants/ticket";
import type { TicketRecord } from "../types/ticket";
import { parseServerTimestamp } from "../utils/date";

interface TicketCardProps {
  ticket: TicketRecord;
  onOpenChat: (ticketRef: string) => void;
  onTicketReopened?: () => void;
}

export default function TicketCard({
  ticket,
  onOpenChat,
  onTicketReopened,
}: TicketCardProps) {
  const [isReopening, setIsReopening] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);

  const refStr = ticket.ticket_ref || `TK-${ticket.id}`;
  const displayStatus =
    ticket.status === "OPEN" ? "Not Started" : ticket.status || "Not Started";
  const statusStyles =
    STATUS_THEME[displayStatus] ||
    "bg-[#1f2937]/30 text-[#9ca3af] border-[#374151]";
  const leftBorderColor =
    STATUS_BORDER_LEFT[displayStatus] || "border-l-[#64748b]";
  const statusDot = STATUS_PILL_CONFIG[displayStatus]?.dot || "bg-[#94a3b8]";

  const isResolved = displayStatus === "Resolved";

  // Check if there is an unread agent reply
  const lastReadAt = typeof window !== 'undefined' ? localStorage.getItem(`ticket_read_${refStr}`) : null;
  const hasUnreadReply = Boolean(
    ticket.last_agent_message_at &&
      (!lastReadAt ||
        parseServerTimestamp(ticket.last_agent_message_at).getTime() >
          new Date(lastReadAt).getTime())
  );

  const handleOpenChat = () => {
    try {
      localStorage.setItem(`ticket_read_${refStr}`, new Date().toISOString());
    } catch {
      // ignore
    }
    onOpenChat(refStr);
  };

  const handleReopen = async () => {
    setIsReopening(true);
    setReopenError(null);
    try {
      const res = await fetch(
        `/api/tickets/${encodeURIComponent(refStr)}/reopen`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const data = await res.json();
      if (res.ok && data.success) {
        if (onTicketReopened) {
          onTicketReopened();
        }
      } else {
        setReopenError(data.message || "Failed to reopen ticket");
      }
    } catch {
      setReopenError("Network error while reopening ticket");
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <div
      className={`bg-[#111827] border ${
        hasUnreadReply
          ? "border-[#f43f5e]/50 ring-1 ring-[#f43f5e]/40 shadow-[0_0_15px_rgba(244,63,94,0.12)]"
          : "border-[#1f2937] hover:border-[#374151]"
      } border-l-4 ${leftBorderColor} hover:${leftBorderColor} rounded-xl p-5 space-y-3 transition-all duration-150 shadow-sm flex flex-col`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold tracking-wider text-[#60a5fa] bg-[#2563eb]/10 px-2.5 py-0.5 rounded border border-[#2563eb]/20">
              {refStr}
            </span>

            {/* Glowing Red Blinking Unread Notification Badge */}
            {hasUnreadReply && (
              <span className="inline-flex items-center gap-1.5 bg-[#f43f5e]/15 border border-[#f43f5e]/50 text-[#fda4af] text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f43f5e] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f43f5e]"></span>
                </span>
                <span>NEW AGENT REPLY</span>
              </span>
            )}
          </div>

          <h4 className="text-[14.5px] font-bold text-white pt-1 leading-snug">
            {ticket.subject}
          </h4>
        </div>

        <span
          className={`text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full uppercase tracking-wider border whitespace-nowrap flex items-center gap-1.5 ${statusStyles}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`}
          />
          <span>{displayStatus}</span>
        </span>
      </div>

      <p className="text-[12.5px] text-[#d1d5db] line-clamp-2 leading-relaxed">
        {ticket.main_description || "No description provided."}
      </p>

      {reopenError && (
        <div className="text-[11px] text-[#f87171] bg-[#f87171]/10 border border-[#f87171]/20 rounded px-2.5 py-1">
          {reopenError}
        </div>
      )}

      <div className="flex items-center justify-between pt-3.5 border-t border-[#1f2937]">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6b7280]">
          <div>
            <span className="text-[#9ca3af]">By:</span> {ticket.name}
          </div>
          <div>•</div>
          <div>
            <span className="text-[#9ca3af]">Category:</span>{" "}
            {ticket.request_type}
          </div>
          <div>•</div>
          <div>
            <span className="text-[#9ca3af]">Priority:</span> {ticket.priority}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {isResolved && (
            <button
              type="button"
              onClick={handleReopen}
              disabled={isReopening}
              title="Reopen ticket and move back to In Progress"
              className="text-[11.5px] bg-[#d97706]/15 hover:bg-[#d97706]/25 border border-[#d97706]/40 hover:border-[#d97706]/70 text-[#fbbf24] font-semibold px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isReopening ? "animate-spin" : ""}
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
              <span>{isReopening ? "Reopening..." : "Reopen"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenChat}
            className={`text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
              hasUnreadReply
                ? "bg-[#e11d48] hover:bg-[#be123c] text-white ring-2 ring-[#f43f5e]/50 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>{hasUnreadReply ? "View Reply" : "View Chat"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
