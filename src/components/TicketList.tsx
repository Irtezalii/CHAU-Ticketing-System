import { useMemo, useState } from "react";
import { ITEMS_PER_PAGE, STATUS_PILL_CONFIG } from "../constants/ticket";
import type { TicketRecord } from "../types/ticket";
import TicketCard from "./TicketCard";

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
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Count tickets per status category
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tickets) {
      const displayStatus =
        t.status === "OPEN" ? "Not Started" : t.status || "Not Started";
      counts[displayStatus] = (counts[displayStatus] || 0) + 1;
    }
    return counts;
  }, [tickets]);

  // Helper to handle filter selection cleanly
  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset page directly on user click
  };

  // Filter tickets by selected status pill
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === "All") return true;
    const displayStatus =
      t.status === "OPEN" ? "Not Started" : t.status || "Not Started";
    return displayStatus === statusFilter;
  });

  // Calculate pagination boundaries
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTickets = filteredTickets.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  return (
    <div className="p-5 sm:p-7 space-y-5 flex flex-col justify-between min-h-[520px] transition-opacity duration-150 ease-in-out">
      <div className="space-y-4">
        {/* List Header & Refresh Button */}
        <div className="flex justify-between items-center border-b border-[#1f2937] pb-3">
          <div>
            <h3 className="text-[15px] font-bold text-white">
              Submitted Tickets
            </h3>
            <p className="text-[11.5px] text-[#6b7280]">
              Track and manage all submitted requests
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={fetchingTickets}
            className="text-[11.5px] bg-[#111827] hover:bg-[#1f2937] border border-[#1f2937] text-[#60a5fa] px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-50 font-medium whitespace-nowrap"
          >
            {fetchingTickets ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {/* Sleek Wrapping Status Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 py-1 pb-2 w-full">
          <span className="text-[10px] font-mono tracking-widest text-[#6b7280] font-bold uppercase pl-0.5 select-none mr-0.5">
            STATUS
          </span>

          {/* ALL PILL */}
          <button
            type="button"
            onClick={() => handleFilterChange("All")}
            className={`px-2 py-0.5 rounded-full text-[9.5px] font-mono font-medium tracking-wide uppercase transition-all duration-150 border flex items-center gap-1.5 cursor-pointer select-none ${
              statusFilter === "All"
                ? "border-[#38bdf8]/80 text-[#7dd3fc] bg-[#0284c7]/20 shadow-[0_0_12px_rgba(56,189,248,0.25)]"
                : "border-[#1e293b] text-[#94a3b8] hover:text-[#e2e8f0] hover:border-[#334155] bg-[#0c121e]/80"
            }`}
          >
            <span>All</span>
            <span
              className={`text-[9px] font-mono px-1 py-0.2 rounded-full font-semibold leading-none ${
                statusFilter === "All"
                  ? "bg-[#38bdf8]/30 text-[#e0f2fe]"
                  : "bg-[#1e293b] text-[#64748b]"
              }`}
            >
              {tickets.length}
            </span>
          </button>

          {/* DYNAMIC STATUS PILLS */}
          {Object.entries(STATUS_PILL_CONFIG).map(([statusKey, config]) => {
            const isActive = statusFilter === statusKey;
            const count = statusCounts[statusKey] || 0;
            return (
              <button
                key={statusKey}
                type="button"
                onClick={() => handleFilterChange(statusKey)}
                className={`px-2 py-0.5 rounded-full text-[9.5px] font-mono font-medium tracking-wide uppercase transition-all duration-150 border flex items-center gap-1.5 cursor-pointer select-none ${
                  isActive ? config.active : config.inactive
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`}
                />
                <span>{config.label}</span>
                <span
                  className={`text-[9px] font-mono px-1 py-0.2 rounded-full font-semibold leading-none ${
                    isActive ? config.badgeActive : config.badgeInactive
                  }`}
                >
                  {count}
                </span>
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
          <div className="py-12 text-center text-[13px] text-[#6b7280]">
            Loading tickets from D1 database...
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center text-[#6b7280] space-y-2">
            <p className="text-[14px]">No tickets submitted yet.</p>
            <button
              onClick={onSwitchToSubmit}
              className="text-[12.5px] text-[#60a5fa] hover:underline font-semibold"
            >
              Submit your first ticket
            </button>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-[#6b7280]">
            No tickets found with status "
            <span className="text-white font-medium">{statusFilter}</span>".
          </div>
        ) : (
          <div
            className={`space-y-4 ${fetchingTickets ? "opacity-60 pointer-events-none transition-opacity duration-150" : ""}`}
          >
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
        <div className="flex items-center justify-between pt-4 border-t border-[#1f2937] text-[12.5px] mt-auto">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="bg-[#111827] hover:bg-[#1f2937] border border-[#1f2937] text-[#e5e7eb] px-3.5 py-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          >
            ← Previous
          </button>

          <span className="text-[#6b7280] font-medium">
            Page <span className="text-white font-semibold">{currentPage}</span>{" "}
            of <span className="text-white font-semibold">{totalPages}</span>
          </span>

          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="bg-[#111827] hover:bg-[#1f2937] border border-[#1f2937] text-[#e5e7eb] px-3.5 py-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
