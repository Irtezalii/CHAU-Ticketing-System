import React from 'react';
import type { TicketRecord } from '../types/ticket';
import { STATUS_THEME } from '../constants/ticket';

interface TicketCardProps {
  ticket: TicketRecord;
  onOpenChat: (ticketRef: string) => void;
}

export default function TicketCard({ ticket, onOpenChat }: TicketCardProps) {
  const refStr = ticket.ticket_ref || `TK-${ticket.id}`;
  const displayStatus = ticket.status === 'OPEN' ? 'Not Started' : (ticket.status || 'Not Started');
  const statusStyles = STATUS_THEME[displayStatus] || 'bg-[#1f2937]/30 text-[#9ca3af] border-[#374151]';

  return (
    <div className="bg-[#141b28] border border-[#242e3f] hover:border-[#2e3a4e] rounded-xl p-5 space-y-3 transition-all duration-150 shadow-sm flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[11px] font-bold tracking-wider text-[#7cb5ff] bg-[#3b82f6]/10 px-2.5 py-0.5 rounded border border-[#3b82f6]/20">
            {refStr}
          </span>
          <h4 className="text-[14.5px] font-bold text-white pt-1 leading-snug">{ticket.subject}</h4>
        </div>

        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border whitespace-nowrap ${statusStyles}`}>
          {displayStatus}
        </span>
      </div>

      <p className="text-[12.5px] text-[#c3cbd6] line-clamp-2 leading-relaxed">
        {ticket.main_description || 'No description provided.'}
      </p>

      <div className="flex items-center justify-between pt-3.5 border-t border-[#1e2736]">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#7b8697]">
          <div>
            <span className="text-[#aab4c2]">By:</span> {ticket.name}
          </div>
          <div>•</div>
          <div>
            <span className="text-[#aab4c2]">Category:</span> {ticket.request_type}
          </div>
          <div>•</div>
          <div>
            <span className="text-[#aab4c2]">Priority:</span> {ticket.priority}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenChat(refStr)}
          className="text-[11.5px] bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm flex-shrink-0 ml-2 flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          View Chat
        </button>
      </div>
    </div>
  );
}
