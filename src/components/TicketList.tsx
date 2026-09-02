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
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyMine, setOnlyMine] = useState(true);

  const myEmail = useMemo(() => {
    try {
      return localStorage.getItem("submitter_email")?.trim().toLowerCase() || null;
    } catch {
      return null;
    }
  }, []);

  // Tickets scoped by the "My Tickets" toggle, before status/search filters
  const scopedTickets = useMemo(() => {
    if (!onlyMine || !myEmail) return tickets;
    return tickets.filter((t) => t.email.trim().toLowerCase() === myEmail);
  }, [tickets, onlyMine, myEmail]);

  // Count tickets per status category
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of scopedTickets) {
      const displayStatus =
        t.status === "OPEN" ? "Not Started" : t.status || "Not Started";
      counts[displayStatus] = (counts[displayStatus] || 0) + 1;
    }
    return counts;
  }, [scopedTickets]);

  // Helper to handle filter selection cleanly
  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset page directly on user click
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  // Filter tickets by selected status pill and search term (already scoped to "mine" if active)
  const filteredTickets = scopedTickets.filter((t) => {
    if (statusFilter !== "All") {
      const displayStatus =
        t.status === "OPEN" ? "Not Started" : t.status || "Not Started";
      if (displayStatus !== statusFilter) return false;
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const refStr = t.ticket_ref || `TK-${t.id}`;
      const matchesSearch =
        t.subject.toLowerCase().includes(term) ||
        t.name.toLowerCase().includes(term) ||
        refStr.toLowerCase().includes(term) ||
        (t.main_description && t.main_description.toLowerCase().includes(term));
      if (!matchesSearch) return false;
    }

    return true;
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
        {/* List Header, Search & Refresh Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1f2937] pb-3">
          <div>
            <h3 className="text-[15px] font-bold text-white">
              Submitted Tickets
            </h3>
            <p className="text-[11.5px] text-[#6b7280]">
              Track and manage all submitted requests
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full sm:w-56 bg-[#111827] border border-[#1f2937] rounded-lg pl-8 pr-3 py-1.5 text-[11.5px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2563eb] transition-all"
              />
              <svg
                className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b7280]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <button
              type="button"
              onClick={() => {
                setOnlyMine((prev) => !prev);
                setCurrentPage(1);
              }}
              disabled={!myEmail}
              title={myEmail ? "Show only tickets you submitted" : "Submit a ticket first to use this filter"}
              className={`text-[12px] px-3.5 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed font-bold whitespace-nowrap flex-shrink-0 border flex items-center gap-1.5 ${
                onlyMine
                  ? "bg-[#2563eb] border-[#2563eb] text-white shadow-[0_0_14px_rgba(37,99,235,0.5)] ring-1 ring-[#60a5fa]/50"
                  : "bg-[#111827] hover:bg-[#1f2937] border-[#1f2937] text-[#9ca3af] hover:text-white"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>My Tickets</span>
            </button>
            <button
              onClick={onRefresh}
              disabled={fetchingTickets}
              className="text-[11.5px] bg-[#111827] hover:bg-[#1f2937] border border-[#1f2937] text-[#60a5fa] px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-50 font-medium whitespace-nowrap flex-shrink-0"
            >
              {fetchingTickets ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
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
              {scopedTickets.length}
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
            {searchTerm.trim() ? (
              <>
                No tickets match "
                <span className="text-white font-medium">{searchTerm}</span>".
              </>
            ) : onlyMine ? (
              <>
                None of your submitted tickets are currently in "
                <span className="text-gray font-medium">{statusFilter}</span>
                ".
              </>
            ) : (
              <>
                No tickets found with status "
                <span className="text-white font-medium">{statusFilter}</span>
                ".
              </>
            )}
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
