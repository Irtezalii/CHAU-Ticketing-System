import React, { useState } from 'react';

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
  created_at: string;
}

interface TicketsListProps {
  tickets: TicketRecord[];
  fetchingTickets: boolean;
  fetchError: string | null;
  onRefresh: () => void;
  onNavigateToSubmit: () => void;
}

const ITEMS_PER_PAGE = 10;

export const TicketsList: React.FC<TicketsListProps> = ({
  tickets,
  fetchingTickets,
  fetchError,
  onRefresh,
  onNavigateToSubmit,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(tickets.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTickets = tickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="p-5 sm:p-7 space-y-5">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-[#242e3f] pb-3">
        <div>
          <h3 className="text-[15px] font-bold text-white">Submitted Tickets</h3>
          <p className="text-[11.5px] text-[#7b8697]">
            Showing {tickets.length > 0 ? startIndex + 1 : 0}–
            {Math.min(startIndex + ITEMS_PER_PAGE, tickets.length)} of {tickets.length} total
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={fetchingTickets}
          className="text-[11.5px] bg-[#141b28] hover:bg-[#1a2538] border border-[#242e3f] text-[#7cb5ff] px-3 py-1.5 rounded-lg transition disabled:opacity-50 font-medium"
        >
          {fetchingTickets ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {fetchError && (
        <div className="bg-[#f87171]/10 border border-[#f87171]/30 text-[#fca5a5] rounded-lg p-3 text-[12px]">
          {fetchError}
        </div>
      )}

      {fetchingTickets ? (
        <div className="py-12 text-center text-[13px] text-[#7b8697]">
          Loading tickets from D1 database...
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-12 text-center text-[#7b8697] space-y-2">
          <p className="text-[14px]">No tickets submitted yet.</p>
          <button
            onClick={onNavigateToSubmit}
            className="text-[12.5px] text-[#7cb5ff] hover:underline font-semibold"
          >
            Submit your first ticket
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedTickets.map((t) => (
            <div
              key={t.id}
              className="bg-[#141b28] border border-[#242e3f] hover:border-[#2e3a4e] rounded-xl p-4 space-y-2.5 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold tracking-wider text-[#7cb5ff] bg-[#3b82f6]/10 px-2 py-0.5 rounded border border-[#3b82f6]/20">
                    {t.ticket_ref || `TK-${t.id}`}
                  </span>
                  <h4 className="text-[14px] font-bold text-white pt-1">{t.subject}</h4>
                </div>
                <span
                  className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    t.status === 'OPEN'
                      ? 'bg-[#34d399]/15 text-[#34d399] border border-[#34d399]/30'
                      : 'bg-[#94a3b8]/15 text-[#94a3b8] border border-[#94a3b8]/30'
                  }`}
                >
                  {t.status}
                </span>
              </div>

              <p className="text-[12.5px] text-[#c3cbd6]">
                {t.main_description || 'No description provided.'}
              </p>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#1e2736] text-[11px] text-[#7b8697]">
                <div>
                  <span className="text-[#aab4c2]">By:</span> {t.name} ({t.email})
                </div>
                <div>•</div>
                <div>
                  <span className="text-[#aab4c2]">Category:</span> {t.request_type}
                </div>
                <div>•</div>
                <div>
                  <span className="text-[#aab4c2]">Priority:</span> {t.priority}
                </div>
                {t.lead_phone && (
                  <>
                    <div>•</div>
                    <div>
                      <span className="text-[#aab4c2]">Lead Phone:</span> {t.lead_phone}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#242e3f] text-[12.5px]">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="bg-[#141b28] hover:bg-[#1a2538] border border-[#242e3f] text-[#e9edf3] px-3.5 py-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                ← Previous
              </button>

              <span className="text-[#7b8697] font-medium">
                Page <span className="text-white font-semibold">{currentPage}</span> of{' '}
                <span className="text-white font-semibold">{totalPages}</span>
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="bg-[#141b28] hover:bg-[#1a2538] border border-[#242e3f] text-[#e9edf3] px-3.5 py-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
