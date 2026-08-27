import React, { useState, useEffect } from 'react';

interface Ticket {
  id: number;
  ticket_ref: string;
  name: string;
  email: string;
  subject: string;
  request_type: string;
  priority: string;
  status: string;
  assignee: string | null;
  main_description: string | null;
  created_at: string;
}

interface AdminTableProps {
  onOpenChat: (ref: string) => void;
  onGoHome: () => void;
}

const STATUS_OPTIONS = [
  'Not Started',
  'Initial Response',
  'In Progress',
  'Waiting on Client',
  'Completed by Dev',
  'Resolved'
];

// Define colors for each status to be used in filters and table dropdowns
const STATUS_THEME: Record<string, { text: string; border: string; bg: string; activeBg: string }> = {
  'Not Started':       { text: 'text-[#9ca3af]', border: 'border-[#374151]',    bg: 'bg-[#1f2937]/30', activeBg: 'bg-[#374151]' },
  'Initial Response':  { text: 'text-[#c084fc]', border: 'border-[#7e22ce]/50', bg: 'bg-[#7e22ce]/10', activeBg: 'bg-[#7e22ce]' },
  'In Progress':       { text: 'text-[#fbbf24]', border: 'border-[#b45309]/50', bg: 'bg-[#b45309]/10', activeBg: 'bg-[#d97706]' },
  'Waiting on Client': { text: 'text-[#60a5fa]', border: 'border-[#1d4ed8]/50', bg: 'bg-[#1d4ed8]/10', activeBg: 'bg-[#2563eb]' },
  'Completed by Dev':  { text: 'text-[#2dd4bf]', border: 'border-[#0f766e]/50', bg: 'bg-[#0f766e]/10', activeBg: 'bg-[#0d9488]' },
  'Resolved':          { text: 'text-[#4ade80]', border: 'border-[#15803d]/50', bg: 'bg-[#15803d]/10', activeBg: 'bg-[#16a34a]' },
};

const ASSIGNEE_OPTIONS = ['Unassigned', 'Irtaza Ali', 'Support Agent', 'Backend Dev'];
const ITEMS_PER_PAGE = 10;

export default function AdminTable({ onOpenChat, onGoHome }: AdminTableProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' means All
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      if (res.ok && data.success) {
        setTickets(data.tickets || []);
      }
    } catch {
      console.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTickets();
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handleUpdate = async (ticketRef: string, field: 'status' | 'assignee', value: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketRef}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) => (t.ticket_ref === ticketRef || String(t.id) === ticketRef ? { ...t, [field]: value } : t))
        );
      }
    } catch {
      console.error('Failed to update ticket');
    }
  };

  // Pre-calculate counts for the filter tabs
  const totalCount = tickets.length;
  const statusCounts = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status] = tickets.filter((t) => {
      const s = t.status === 'OPEN' ? 'Not Started' : (t.status || 'Not Started');
      return s === status;
    }).length;
    return acc;
  }, {} as Record<string, number>);

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.ticket_ref && t.ticket_ref.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.main_description && t.main_description.toLowerCase().includes(searchTerm.toLowerCase()));

    // If the ticket is 'OPEN' (legacy) and we filter for 'Not Started', map it, otherwise exact match
    const currentStatus = t.status === 'OPEN' ? 'Not Started' : (t.status || 'Not Started');
    const matchesStatus = statusFilter ? currentStatus === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  // Pagination Math
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="w-full max-w-[1280px] h-[85vh] min-h-[730px] bg-[#0c1017] border border-[#1f2937] rounded-2xl overflow-hidden shadow-2xl flex flex-col text-[#e5e7eb] font-sans my-auto">

      <style>{`
        .custom-chat-scrollbar {
          scrollbar-width: thin !important;
          scrollbar-color: #1f2937 #080b10 !important;
        }
        .custom-chat-scrollbar::-webkit-scrollbar {
          width: 5px !important;
          height: 5px !important;
        }
        .custom-chat-scrollbar::-webkit-scrollbar-track {
          background: #080b10 !important;
        }
        .custom-chat-scrollbar::-webkit-scrollbar-thumb {
          background: #1f2937 !important;
          border-radius: 9999px !important;
        }
        .custom-chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #374151 !important;
        }
      `}</style>

      {/* Table Header */}
      <div className="px-6 py-4 border-b border-[#1f2937] bg-[#0c1017] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white">Admin Ticket Console</h2>
          <p className="text-xs text-[#9ca3af]">Manage incoming client issues and assignments</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#111827] border border-[#1f2937] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2563eb] w-48 sm:w-64 transition-all"
            />
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

        </div>
      </div>

      {/* Quick Status Filter Tabs with Counts */}
      <div className="px-6 py-3 bg-[#080b10] border-b border-[#1f2937] flex flex-wrap items-center gap-2 flex-shrink-0 custom-chat-scrollbar overflow-x-auto">
        <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mr-1">Filter:</span>
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            statusFilter === ''
              ? 'bg-[#2563eb] text-white border border-[#2563eb]'
              : 'bg-[#111827] text-[#9ca3af] border border-[#1f2937] hover:border-[#3b82f6]/50 hover:text-white'
          }`}
        >
          All Tickets
          <span className={`text-[10px] px-1.5 rounded-full ${statusFilter === '' ? 'bg-white/20 text-white' : 'bg-[#1f2937] text-[#6b7280]'}`}>
            {totalCount}
          </span>
        </button>
        {STATUS_OPTIONS.map((status) => {
          const theme = STATUS_THEME[status];
          const isActive = statusFilter === status;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap border ${
                isActive
                  ? `${theme.activeBg} ${theme.border} text-white shadow-sm`
                  : `bg-[#111827] border-[#1f2937] ${theme.text} hover:${theme.border} hover:${theme.bg}`
              }`}
            >
              {status}
              <span className={`text-[10px] px-1.5 rounded-full ${isActive ? 'bg-black/20 text-white' : `bg-[#1f2937] ${theme.text}`}`}>
                {statusCounts[status]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table Content - Flex-1 ensures it fills remaining space and scrolls internally */}
      <div className="flex-1 overflow-y-auto custom-chat-scrollbar bg-[#080b10] flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-[#6b7280]">
            Loading ticket database...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-[#6b7280]">
            No tickets match your filters.
          </div>
        ) : (
          <div className="w-full overflow-x-auto custom-chat-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-[#1f2937] text-[10px] font-bold tracking-wider text-[#6b7280] uppercase sticky top-0 bg-[#080b10] z-10">
                  <th className="py-3 px-4">Ref</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Submitter</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]/50 text-[11.5px]">
                {paginatedTickets.map((t) => {
                  const refStr = t.ticket_ref || `TK-${t.id}`;
                  const submittedDate = t.created_at
                    ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'N/A';

                  // Map legacy 'OPEN' to 'Not Started' for styling
                  const currentStatus = t.status === 'OPEN' ? 'Not Started' : (t.status || 'Not Started');
                  const theme = STATUS_THEME[currentStatus];

                  return (
                    <tr key={t.id} className="hover:bg-[#111827]/50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#60a5fa] whitespace-nowrap">{refStr}</td>
                      <td className="py-3 px-4 font-medium text-white max-w-[160px] truncate" title={t.subject}>
                        {t.subject}
                      </td>
                      <td className="py-3 px-4 text-[#9ca3af] max-w-[200px] truncate" title={t.main_description || ''}>
                        {t.main_description || 'No description'}
                      </td>
                      <td className="py-3 px-4 text-[#9ca3af] max-w-[140px] truncate">
                        <div className="truncate text-white">{t.name}</div>
                        <div className="text-[10px] text-[#6b7280] truncate">{t.email}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="bg-[#1e293b] text-[#94a3b8] px-2 py-0.5 rounded text-[10.5px]">
                          {t.request_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="bg-[#f59e0b]/15 text-[#fbbf24] px-2 py-0.5 rounded text-[10.5px] font-bold">
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {/* Updated to rounded-md, px-2.5, shadow-sm */}
                        <select
                          value={currentStatus}
                          onChange={(e) => handleUpdate(refStr, 'status', e.target.value)}
                          className={`border rounded-md px-2.5 py-1.5 text-[11px] font-semibold shadow-sm focus:outline-none cursor-pointer transition-colors ${theme.bg} ${theme.border} ${theme.text}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s} className="bg-[#161f2e] text-[#e5e7eb] font-medium">
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {/* Updated to rounded-md, px-2.5, shadow-sm to match Status */}
                        <select
                          value={t.assignee || 'Unassigned'}
                          onChange={(e) => handleUpdate(refStr, 'assignee', e.target.value)}
                          className="bg-[#161f2e] border border-[#2d3a4e] rounded-md px-2.5 py-1.5 text-[11px] text-white shadow-sm focus:outline-none cursor-pointer"
                        >
                          {ASSIGNEE_OPTIONS.map((a) => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-[#9ca3af] whitespace-nowrap">
                        {submittedDate}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onOpenChat(refStr)}
                          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[11px] font-semibold px-2.5 py-1 rounded transition cursor-pointer"
                        >
                          Live Chat
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer - Pinned to bottom */}
      <div className="px-6 py-4 bg-[#0c1017] border-t border-[#1f2937] flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="text-xs bg-[#111827] hover:bg-[#1f2937] disabled:opacity-30 disabled:hover:bg-[#111827] disabled:cursor-not-allowed border border-[#1f2937] text-[#e5e7eb] px-4 py-2 rounded-lg transition"
        >
          ← Previous
        </button>

        <span className="text-[11.5px] text-[#9ca3af]">
          Page <span className="text-white font-semibold">{currentPage}</span> of{' '}
          <span className="text-white font-semibold">{totalPages}</span>
        </span>

        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="text-xs bg-[#111827] hover:bg-[#1f2937] disabled:opacity-30 disabled:hover:bg-[#111827] disabled:cursor-not-allowed border border-[#1f2937] text-[#e5e7eb] px-4 py-2 rounded-lg transition"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
