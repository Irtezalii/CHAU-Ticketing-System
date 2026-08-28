import React, { useState } from 'react';
import TicketCard from './TicketCard';
import type { TicketRecord } from '../types/ticket';
import { STATUS_THEME, ITEMS_PER_PAGE } from '../constants/ticket';

interface TicketListProps {
  tickets: TicketRecord[];
  fetchingTickets: boolean;
  fetchError: string | null;
  onRefresh: () => void;
  onOpenChat: (ticketRef: string) => void;
  onSwitchToSubmit: () => void;
}

export default function TicketList({
  tickets,
  fetchingTickets,
  fetchError,
  onRefresh,
  onOpenChat,
  onSwitchToSubmit,
}: TicketListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Helper to handle filter selection cleanly
  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset page directly on user click
  };

  // Filter tickets by selected status pill
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'All') return true;
    const displayStatus = t.status === 'OPEN' ? 'Not Started' : t.status || 'Not Started';
    return displayStatus === statusFilter;
  });

  // Calculate pagination boundaries
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="p-5 sm:p-7 space-y-5 flex flex-col justify-between min-h-[520px] transition-opacity duration-150 ease-in-out">
      <div className="space-y-4">
        {/* List Header & Refresh Button */}
        <div className="flex justify-between items-center border-b border-[#242e3f] pb-3">
          <div>
            <h3 className="text-[15px] font-bold text-white">Submitted Tickets</h3>
            <p className="text-[11.5px] text-[#7b8697]">
              Showing {filteredTickets.length > 0 ? startIndex + 1 : 0}–
              {Math.min(startIndex + ITEMS_PER_PAGE, filteredTickets.length)} of {filteredTickets.length} total
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={fetchingTickets}
            className="text-[11.5px] bg-[#141b28] hover:bg-[#1a2538] border border-[#242e3f] text-[#7cb5ff] px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-50 font-medium whitespace-nowrap"
          >
            {fetchingTickets ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {/* Color-Coded Filter Pills */}
        <div className="flex flex-wrap gap-2 pt-1 pb-2">
          <button
            onClick={() => handleFilterChange('All')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all border uppercase ${
              statusFilter === 'All'
                ? 'bg-[#3b82f6]/30 text-[#60a5fa] border-[#3b82f6] ring-2 ring-[#3b82f6]/40'
                : 'bg-[#141b28] text-[#9ca3af] border-[#242e3f] hover:border-[#3b82f6]/50'
            }`}
          >
            All
          </button>

          {Object.keys(STATUS_THEME).map((statusKey) => {
            const theme = STATUS_THEME[statusKey];
            const isActive = statusFilter === statusKey;
            return (
              <button
                key={statusKey}
                onClick={() => handleFilterChange(statusKey)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${theme} ${
                  isActive ? 'ring-2 ring-white/40 scale-105 shadow-md' : 'opacity-85 hover:opacity-100'
                }`}
              >
                {statusKey}
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {fetchError && (
          <div className="bg-[#f87171]/10 border border-[#f87171]/30 text-[#fca5a5] rounded-lg p-3 text-[12px]">
            {fetchError}
          </div>
        )}

        {/* Dynamic Ticket State List */}
        {fetchingTickets && tickets.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-[#7b8697]">
            Loading tickets from D1 database...
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center text-[#7b8697] space-y-2">
            <p className="text-[14px]">No tickets submitted yet.</p>
            <button
              onClick={onSwitchToSubmit}
              className="text-[12.5px] text-[#7cb5ff] hover:underline font-semibold"
            >
              Submit your first ticket
            </button>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-[#7b8697]">
            No tickets found with status "<span className="text-white font-medium">{statusFilter}</span>".
          </div>
        ) : (
          <div className={`space-y-4 ${fetchingTickets ? 'opacity-60 pointer-events-none transition-opacity duration-150' : ''}`}>
            {paginatedTickets.map((t) => (
              <TicketCard
                key={t.id}
                ticket={t}
                onOpenChat={onOpenChat}
                onTicketReopened={onRefresh}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[#242e3f] text-[12.5px] mt-auto">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="bg-[#141b28] hover:bg-[#1a2538] border border-[#242e3f] text-[#e9edf3] px-3.5 py-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          >
            ← Previous
          </button>

          <span className="text-[#7b8697] font-medium">
            Page <span className="text-white font-semibold">{currentPage}</span> of{' '}
            <span className="text-white font-semibold">{totalPages}</span>
          </span>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="bg-[#141b28] hover:bg-[#1a2538] border border-[#242e3f] text-[#e9edf3] px-3.5 py-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
