import React, { useState, useEffect } from 'react';
import TicketChat from './components/TicketChat';
import AdminTable from './components/AdminTable';

type RequestType = '' | 'problem' | 'question' | 'workspace' | 'campaign' | 'other';
type ImpactLevel = 'blocked' | 'workaround' | 'minor' | '';

interface FormState {
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

interface TicketRecord {
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

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  title: '',
  mainDescription: '',
  requestType: '',
  expectedBehavior: '',
  impact: '',
  leadPhone: '',
  platformArea: '',
  workspaceKind: 'A new workspace',
  workspaceName: '',
  workspaceUse: '',
  neededBy: '',
  campaignName: '',
  campaignGoal: '',
  goLiveDate: '',
  otherTimeframe: 'No particular deadline',
};

const SLA_MAP: Record<string, string> = {
  P1: 'within 1 hour',
  P2: 'within 4 business hours',
  P3: 'within 1 business day',
};

const ITEMS_PER_PAGE = 10;

export default function App() {
  const [activeTab, setActiveTab] = useState<'submit' | 'list'>('submit');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ticketRef, setTicketRef] = useState<string | null>(null);
  const [ticketSla, setTicketSla] = useState<string>('');

  // Tickets List state
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [fetchingTickets, setFetchingTickets] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [isAdminView, setIsAdminView] = useState<boolean>(() => window.location.pathname === '/admin');

  // Active Chat State
  const [activeChatRef, setActiveChatRef] = useState<string | null>(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/ticket\/([^/]+)$/);
    return match ? match[1] : null;
  });

  // Listen only for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      if (currentPath === '/admin') {
        setIsAdminView(true);
        setActiveChatRef(null);
      } else {
        setIsAdminView(false);
        const pathMatch = currentPath.match(/^\/ticket\/([^/]+)$/);
        setActiveChatRef(pathMatch ? pathMatch[1] : null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openTicketChat = (ref: string) => {
    setActiveChatRef(ref);
    setIsAdminView(false);
    window.history.pushState({}, '', `/ticket/${ref}`);
  };

  const closeTicketChat = () => {
    setActiveChatRef(null);
    window.history.pushState({}, '', '/');
  };

  const fetchTicketsFromD1 = async (silent = false) => {
    if (!silent) setFetchingTickets(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();

      if (res.ok && data.success) {
        setTickets(data.tickets || []);
      } else {
        setFetchError(data.message || 'Failed to load tickets.');
      }
    } catch {
      setFetchError('Network error while loading tickets.');
    } finally {
      setFetchingTickets(false);
      setInitialLoaded(true);
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (activeTab === 'list' && !isAdminView) {
      const loadTickets = async () => {
        if (!initialLoaded) setFetchingTickets(true);
        setFetchError(null);
        try {
          const res = await fetch('/api/tickets');
          const data = await res.json();
          if (isMounted) {
            if (res.ok && data.success) {
              setTickets(data.tickets || []);
            } else {
              setFetchError(data.message || 'Failed to load tickets.');
            }
          }
        } catch {
          if (isMounted) {
            setFetchError('Network error while loading tickets.');
          }
        } finally {
          if (isMounted) {
            setFetchingTickets(false);
            setInitialLoaded(true);
          }
        }
      };

      loadTickets();
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab, initialLoaded, isAdminView]);

  const calculatePriority = (): { priority: string; label: string } => {
    if (!form.requestType) return { priority: 'P3', label: 'Medium' };
    if (form.requestType !== 'problem') return { priority: 'P3', label: 'Medium' };

    if (form.impact === 'blocked') return { priority: 'P1', label: 'Urgent' };
    if (form.impact === 'workaround') return { priority: 'P2', label: 'High' };
    if (form.impact === 'minor') return { priority: 'P2', label: 'Medium' };
    return { priority: 'P3', label: 'Medium' };
  };

  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrorMsg(null);
  };

  const validate = (): string[] => {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push('your name');
    if (!form.email.trim()) missing.push('your email');
    if (!form.title.trim()) missing.push('a short title');
    if (!form.mainDescription.trim()) missing.push('what you need (description)');
    if (!form.requestType) missing.push('request category');

    if (form.requestType === 'problem') {
      if (!form.expectedBehavior.trim()) missing.push('what should have happened');
      if (!form.impact) missing.push('whether you can still work');
    } else if (form.requestType === 'workspace') {
      if (!form.workspaceName.trim()) missing.push('a workspace name');
      if (!form.workspaceUse.trim()) missing.push('what it is for');
    } else if (form.requestType === 'campaign') {
      if (!form.campaignName.trim()) missing.push('a campaign name');
      if (!form.campaignGoal.trim()) missing.push('what it should do');
    }

    return missing;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missingFields = validate();

    if (missingFields.length > 0) {
      setErrorMsg(`Almost there — we still need ${missingFields.join(', ')}.`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const { label: derivedPriorityLabel, priority: pCode } = calculatePriority();
    const generatedRef = `TK-${Math.floor(1000 + Math.random() * 9000)}`;

    const payload = {
      ticketRef: generatedRef,
      name: form.name,
      email: form.email,
      subject: form.title,
      requestType: form.requestType,
      priority: derivedPriorityLabel,
      mainDescription: form.mainDescription,
      expectedBehavior: form.expectedBehavior,
      impact: form.impact,
      leadPhone: form.leadPhone,
      platformArea: form.platformArea,
      workspaceKind: form.workspaceKind,
      workspaceName: form.workspaceName,
      workspaceUse: form.workspaceUse,
      neededBy: form.neededBy,
      campaignName: form.campaignName,
      campaignGoal: form.campaignGoal,
      goLiveDate: form.goLiveDate,
      otherTimeframe: form.otherTimeframe,
    };

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTicketRef(data.ticket?.ticket_ref || generatedRef);
        setTicketSla(SLA_MAP[pCode] || 'within 4 business hours');
        fetchTicketsFromD1(true);
      } else {
        setErrorMsg(data.message || 'Error submitting ticket.');
      }
    } catch {
      setErrorMsg('Network error. Unable to send ticket.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setTicketRef(null);
    setErrorMsg(null);
  };

  const currentPriorityInfo = calculatePriority();

  // Pagination calculation
  const totalPages = Math.ceil(tickets.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTickets = tickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e9edf3] flex flex-col font-sans selection:bg-[#1a2c47] selection:text-[#7cb5ff]">

      {/* Top Navbar Header */}
      <header className="border-b border-[#242e3f] bg-[#0f1521]/80 backdrop-blur sticky top-0 z-50 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#63B3ED] flex items-center justify-center text-[#2D3748] font-black text-lg shadow">
            T
          </div>
          <span className="font-bold text-lg text-white tracking-wide">
            Support Desk
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-medium text-[#90CDF4] bg-[#90CDF4]/10 border border-[#90CDF4]/20 px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#63B3ED] animate-pulse"></span>
          <span>System Operational</span>
        </div>
      </header>

      {/* Main Container */}
      <main className={`flex-1 flex flex-col justify-start items-center ${activeChatRef || isAdminView ? 'p-2 sm:p-4 overflow-hidden' : 'p-4 sm:p-8 pt-6 sm:pt-10'}`}>

        {isAdminView ? (
          <AdminTable
            onOpenChat={(ref) => openTicketChat(ref)}
            onGoHome={() => {
              setIsAdminView(false);
              window.history.pushState({}, '', '/');
            }}
          />
        ) : activeChatRef ? (
          <TicketChat ticketRef={activeChatRef} onBack={closeTicketChat} />
        ) : (
          <div className="w-full max-w-[680px] bg-[#0f1521] border border-[#242e3f] rounded-2xl overflow-hidden shadow-2xl flex flex-col">

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#242e3f]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center flex-shrink-0 shadow">
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                  <path d="M3 7a2 2 0 012-2h10a2 2 0 012 2v1.2a1.8 1.8 0 000 3.6V13a2 2 0 01-2 2H5a2 2 0 01-2-2v-1.2a1.8 1.8 0 000-3.6V7z" stroke="#3d2a06" strokeWidth="1.6" strokeLinejoin="round"/>
                  <path d="M12 5.5v9" stroke="#3d2a06" strokeWidth="1.6" strokeDasharray="1.8 2"/>
                </svg>
              </div>
              <div className="font-bold text-[15.5px] flex-1 text-white">Support Tickets</div>
              <span className="bg-[#f5a524]/15 text-[#f5a524] border border-[#f5a524]/30 text-[10.5px] font-bold tracking-wider px-2.5 py-0.5 rounded-full">
                LIVE SUPPORT
              </span>
            </div>

            {/* Dynamic Navigation Tabs */}
            <div className="flex gap-1.5 p-2 border-b border-[#242e3f] bg-[#0b1019]">
              <button
                type="button"
                onClick={() => setActiveTab('submit')}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition-all duration-150 ${
                  activeTab === 'submit'
                    ? 'bg-[#1a2c47] border border-[#3b82f6]/40 text-[#7cb5ff]'
                    : 'bg-transparent text-[#aab4c2] hover:text-white hover:bg-[#141b28]'
                }`}
              >
                Submit New
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold flex justify-center items-center gap-1.5 transition-all duration-150 ${
                  activeTab === 'list'
                    ? 'bg-[#1a2c47] border border-[#3b82f6]/40 text-[#7cb5ff]'
                    : 'bg-transparent text-[#aab4c2] hover:text-white hover:bg-[#141b28]'
                }`}
              >
                My Tickets{' '}
                <span className="text-[10px] bg-[#3b82f6]/20 text-[#7cb5ff] font-bold px-1.5 py-0.5 rounded-full">
                  {tickets.length || 'D1'}
                </span>
              </button>
            </div>

            {/* TAB 1: SUBMIT FORM */}
            {activeTab === 'submit' && (
              <div className="transition-opacity duration-150 ease-in-out">
                {!ticketRef ? (
                  <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5">

                    {/* User Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12.5px] font-semibold text-[#e9edf3] mb-1">
                          Name <span className="text-[#f87171]">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={handleTextChange}
                          placeholder="Jane Doe"
                          className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#5a6474] focus:outline-none focus:border-[#3b82f6]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12.5px] font-semibold text-[#e9edf3] mb-1">
                          Email <span className="text-[#f87171]">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleTextChange}
                          placeholder="jane@example.com"
                          className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#5a6474] focus:outline-none focus:border-[#3b82f6]"
                        />
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label htmlFor="title" className="block text-[12.5px] font-semibold text-[#e9edf3] mb-1">
                        Give it a short title <span className="text-[#f87171]">*</span>
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        maxLength={80}
                        value={form.title}
                        onChange={handleTextChange}
                        placeholder="e.g. Bookings not showing in calendar"
                        className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#5a6474] focus:outline-none focus:border-[#3b82f6]"
                      />
                    </div>

                    {/* Main Description */}
                    <div>
                      <label htmlFor="mainDescription" className="block text-[12.5px] font-semibold text-[#e9edf3] mb-1">
                        Tell us what you need <span className="text-[#f87171]">*</span>
                      </label>
                      <textarea
                        id="mainDescription"
                        name="mainDescription"
                        rows={3}
                        value={form.mainDescription}
                        onChange={handleTextChange}
                        placeholder="Describe your request, steps to reproduce, or details..."
                        className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#5a6474] focus:outline-none focus:border-[#3b82f6] resize-none"
                      />
                    </div>

                    <div className="h-px bg-[#242e3f] my-3"></div>

                    {/* Request Category */}
                    <div>
                      <label htmlFor="requestType" className="block text-[12.5px] font-semibold text-[#e9edf3] mb-0.5">
                        What do you need? <span className="text-[#f87171]">*</span>
                      </label>
                      <p className="text-[11.5px] text-[#7b8697] mb-2">Pick one and we'll only ask what's relevant.</p>
                      <select
                        id="requestType"
                        name="requestType"
                        value={form.requestType}
                        onChange={handleTextChange}
                        className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white focus:outline-none focus:border-[#3b82f6] cursor-pointer"
                      >
                        <option value="">Choose one…</option>
                        <option value="problem">Fix a problem</option>
                        <option value="question">Ask a question</option>
                        <option value="workspace">New workspace or channel</option>
                        <option value="campaign">New campaign</option>
                        <option value="other">Something else</option>
                      </select>
                    </div>

                    {/* Conditional Fields */}
                    {form.requestType === 'problem' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[12.5px] font-semibold text-[#e9edf3] mb-1">
                            Lead Phone Number
                          </label>
                          <p className="text-[11.5px] text-[#7b8697] mb-1.5">Phone number of affected contact/lead if applicable.</p>
                          <input
                            type="tel"
                            name="leadPhone"
                            value={form.leadPhone}
                            onChange={handleTextChange}
                            placeholder="+1 555 0199"
                            className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#5a6474] focus:outline-none focus:border-[#3b82f6]"
                          />
                        </div>
                        <div>
                          <label className="block text-[12.5px] font-semibold text-[#e9edf3] mb-1">
                            What should have happened? <span className="text-[#f87171]">*</span>
                          </label>
                          <textarea
                            name="expectedBehavior"
                            rows={2}
                            value={form.expectedBehavior}
                            onChange={handleTextChange}
                            placeholder="The booking should show in the calendar within a minute."
                            className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#5a6474] focus:outline-none focus:border-[#3b82f6] resize-none"
                          />
                        </div>
                        <div>
                          <fieldset>
                            <legend className="text-[12.5px] font-semibold text-[#e9edf3] mb-0.5">
                              Can you still work? <span className="text-[#f87171]">*</span>
                            </legend>
                            <p className="text-[11.5px] text-[#7b8697] mb-2">This is how we decide what to pick up first.</p>
                            <div className="space-y-2">
                              {[
                                { id: 'blocked', title: "No — I'm completely stuck", desc: 'No way around it' },
                                { id: 'workaround', title: "Yes, but it's painful", desc: "There's a slow workaround" },
                                { id: 'minor', title: 'Yes — it just looks wrong', desc: 'Not stopping me' },
                              ].map((op) => (
                                <label
                                  key={op.id}
                                  className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                                    form.impact === op.id
                                      ? 'bg-[#1a2c47] border-[#3b82f6]'
                                      : 'bg-[#141b28] border-[#242e3f] hover:border-[#2e3a4e]'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="impact"
                                    value={op.id}
                                    checked={form.impact === op.id}
                                    onChange={handleTextChange}
                                    className="mt-0.5 accent-[#3b82f6]"
                                  />
                                  <div>
                                    <div className="text-[13px] font-semibold text-[#e9edf3]">{op.title}</div>
                                    <div className="text-[11.5px] text-[#7b8697]">{op.desc}</div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </fieldset>
                        </div>
                      </div>
                    )}

                    {form.requestType === 'question' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[12.5px] font-semibold text-[#e9edf3] mb-1">
                            Which part of the platform?
                          </label>
                          <select
                            name="platformArea"
                            value={form.platformArea}
                            onChange={handleTextChange}
                            className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white focus:outline-none focus:border-[#3b82f6]"
                          >
                            <option value="">Not sure</option>
                            <option>Appointment booking</option>
                            <option>AI assistant</option>
                            <option>Campaigns & messaging</option>
                            <option>Contacts & lists</option>
                            <option>Reporting</option>
                            <option>Integrations</option>
                            <option>Billing & account</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {form.requestType === 'workspace' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[12.5px] font-semibold text-[#e9edf3] mb-1">
                            What do you need set up? <span className="text-[#f87171]">*</span>
                          </label>
                          <select
                            name="workspaceKind"
                            value={form.workspaceKind}
                            onChange={handleTextChange}
                            className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white focus:outline-none focus:border-[#3b82f6]"
                          >
                            <option>A new workspace</option>
                            <option>A new channel in an existing workspace</option>
                            <option>A new phone number</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12.5px] font-semibold text-[#e9edf3] mb-1">
                            What should it be called? <span className="text-[#f87171]">*</span>
                          </label>
                          <input
                            type="text"
                            name="workspaceName"
                            value={form.workspaceName}
                            onChange={handleTextChange}
                            placeholder="e.g. Bright Smile — South Clinic"
                            className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#5a6474] focus:outline-none focus:border-[#3b82f6]"
                          />
                        </div>
                        <div>
                          <label className="block text-[12.5px] font-semibold text-[#e9edf3] mb-1">
                            What will it be used for? <span className="text-[#f87171]">*</span>
                          </label>
                          <textarea
                            name="workspaceUse"
                            rows={2}
                            value={form.workspaceUse}
                            onChange={handleTextChange}
                            placeholder="New clinic opening in September — needs its own booking calendar and reminders."
                            className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#5a6474] focus:outline-none focus:border-[#3b82f6] resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[12.5px] font-semibold text-[#e9edf3] mb-1">
                            Needed by
                          </label>
                          <input
                            type="date"
                            name="neededBy"
                            value={form.neededBy}
                            onChange={handleTextChange}
                            className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white focus:outline-none focus:border-[#3b82f6]"
                          />
                        </div>
                      </div>
                    )}

                    {form.requestType === 'campaign' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[12.5px] font-semibold text-[#e9edf3] mb-1">
                            Campaign name <span className="text-[#f87171]">*</span>
                          </label>
                          <input
                            type="text"
                            name="campaignName"
                            value={form.campaignName}
                            onChange={handleTextChange}
                            placeholder="e.g. September check-up reminders"
                            className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#5a6474] focus:outline-none focus:border-[#3b82f6]"
                          />
                        </div>
                        <div>
                          <label className="block text-[12.5px] font-semibold text-[#e9edf3] mb-0.5">
                            What should it do? <span className="text-[#f87171]">*</span>
                          </label>
                          <p className="text-[11.5px] text-[#7b8697] mb-1.5">Who it goes to, what it should say, and what counts as success.</p>
                          <textarea
                            name="campaignGoal"
                            rows={3}
                            value={form.campaignGoal}
                            onChange={handleTextChange}
                            placeholder="Text every patient who hasn't been in for 9 months, offering a check-up slot."
                            className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#5a6474] focus:outline-none focus:border-[#3b82f6] resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[12.5px] font-semibold text-[#e9edf3] mb-1">
                            Go-live date
                          </label>
                          <input
                            type="date"
                            name="goLiveDate"
                            value={form.goLiveDate}
                            onChange={handleTextChange}
                            className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white focus:outline-none focus:border-[#3b82f6]"
                          />
                        </div>
                      </div>
                    )}

                    {form.requestType === 'other' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[12.5px] font-semibold text-[#e9edf3] mb-1">
                            When do you need it?
                          </label>
                          <select
                            name="otherTimeframe"
                            value={form.otherTimeframe}
                            onChange={handleTextChange}
                            className="w-full bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white focus:outline-none focus:border-[#3b82f6]"
                          >
                            <option>No particular deadline</option>
                            <option>This week</option>
                            <option>This month</option>
                            <option>Specific date — I'll explain above</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Footer / SLA Box */}
                    {form.requestType && (
                      <div className="space-y-3 pt-2">
                        <div className="bg-[#34d399]/10 border border-[#34d399]/25 rounded-xl p-3.5 text-[11.8px] text-[#9fe3c6] leading-relaxed">
                          <b className="text-[#c9f5e3]">What happens next:</b> You'll get a reference ID, then a reply{' '}
                          <b className="text-[#c9f5e3]">
                            {SLA_MAP[currentPriorityInfo.priority] || 'within 4 business hours'}
                          </b>.
                        </div>

                        {errorMsg && (
                          <div className="bg-[#f87171]/10 border border-[#f87171]/30 text-[#fca5a5] rounded-lg p-2.5 text-[12px]">
                            {errorMsg}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-[#3b82f6] hover:bg-[#2f74e8] text-white font-semibold py-3 px-4 rounded-xl shadow transition duration-150 disabled:opacity-50 text-[14px]"
                        >
                          {loading ? 'Submitting Ticket...' : 'Submit ticket'}
                        </button>

                        <div className="text-center text-[11px] text-[#7b8697]">
                          A person reads every ticket. No bots replying.
                        </div>
                      </div>
                    )}
                  </form>
                ) : (
                  /* Confirmation View */
                  <div className="p-6 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-[#34d399]/15 border border-[#34d399]/30 flex items-center justify-center mx-auto text-[#34d399]">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[17px] font-bold text-white">Thanks — we've got it</h3>
                      <p className="text-[12.8px] text-[#aab4c2] mt-1">It's with the support team now.</p>
                    </div>

                    <div className="inline-block bg-[#141b28] border border-[#242e3f] rounded-lg px-3.5 py-1.5 text-[14px] font-bold text-[#7cb5ff] tracking-wide">
                      {ticketRef}
                    </div>

                    <div className="text-left bg-[#141b28] border border-[#242e3f] rounded-xl p-3.5 space-y-2 text-[12.3px] text-[#aab4c2]">
                      <div className="relative pl-4 before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-[#3b82f6] before:rounded-full">
                        <b className="text-white">A person will reply {ticketSla}</b>
                      </div>
                      <div className="relative pl-4 before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-[#3b82f6] before:rounded-full">
                        You'll get updates as it progresses.
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                      <button
                        onClick={() => openTicketChat(ticketRef)}
                        className="flex-1 bg-[#3b82f6] hover:bg-[#2f74e8] text-white font-semibold py-2.5 rounded-xl text-[13px] transition-all duration-150 flex justify-center items-center gap-1.5"
                      >
                        Open Chat
                      </button>
                      <button
                        onClick={resetForm}
                        className="flex-1 bg-[#1a2c47] hover:bg-[#223859] border border-[#3b82f6]/40 text-[#7cb5ff] font-semibold py-2.5 rounded-xl text-[13px] transition-all duration-150"
                      >
                        Submit another ticket
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MY TICKETS LIST */}
            {activeTab === 'list' && (
              <div className="p-5 sm:p-7 space-y-5 flex flex-col justify-start transition-opacity duration-150 ease-in-out">
                <div className="flex justify-between items-center border-b border-[#242e3f] pb-3">
                  <div>
                    <h3 className="text-[15px] font-bold text-white">Submitted Tickets</h3>
                    <p className="text-[11.5px] text-[#7b8697]">
                      Showing {tickets.length > 0 ? startIndex + 1 : 0}–
                      {Math.min(startIndex + ITEMS_PER_PAGE, tickets.length)} of {tickets.length} total
                    </p>
                  </div>
                  <button
                    onClick={() => fetchTicketsFromD1(false)}
                    disabled={fetchingTickets}
                    className="text-[11.5px] bg-[#141b28] hover:bg-[#1a2538] border border-[#242e3f] text-[#7cb5ff] px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-50 font-medium"
                  >
                    {fetchingTickets ? 'Refreshing...' : '↻ Refresh'}
                  </button>
                </div>

                {fetchError && (
                  <div className="bg-[#f87171]/10 border border-[#f87171]/30 text-[#fca5a5] rounded-lg p-3 text-[12px]">
                    {fetchError}
                  </div>
                )}

                {fetchingTickets && tickets.length === 0 ? (
                  <div className="py-12 text-center text-[13px] text-[#7b8697]">
                    Loading tickets from D1 database...
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="py-12 text-center text-[#7b8697] space-y-2">
                    <p className="text-[14px]">No tickets submitted yet.</p>
                    <button
                      onClick={() => setActiveTab('submit')}
                      className="text-[12.5px] text-[#7cb5ff] hover:underline font-semibold"
                    >
                      Submit your first ticket
                    </button>
                  </div>
                ) : (
                  <div className={`space-y-3 min-h-[160px] ${fetchingTickets ? 'opacity-60 pointer-events-none transition-opacity duration-150' : ''}`}>
                    {paginatedTickets.map((t) => {
                      const refStr = t.ticket_ref || `TK-${t.id}`;
                      return (
                        <div
                          key={t.id}
                          className="bg-[#141b28] border border-[#242e3f] hover:border-[#2e3a4e] rounded-xl p-4 space-y-2.5 transition-all duration-150"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-bold tracking-wider text-[#7cb5ff] bg-[#3b82f6]/10 px-2 py-0.5 rounded border border-[#3b82f6]/20">
                                {refStr}
                              </span>
                              <h4 className="text-[14px] font-bold text-white pt-1">{t.subject}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openTicketChat(refStr)}
                                className="text-[11px] bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 border border-[#3b82f6]/30 text-[#7cb5ff] font-semibold px-2.5 py-1 rounded-lg transition"
                              >
                                💬 Chat Thread
                              </button>
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
                      );
                    })}
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-[#242e3f] text-[12.5px]">
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
            )}

          </div>
        )}

        {/* Footer Credit Link */}
        <div className="mt-6 text-center text-xs text-[#7b8697]">
          Powered by{' '}
          <a
            href="https://channelautomation.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7cb5ff] hover:underline font-semibold"
          >
            Channel Automation
          </a>
        </div>
      </main>
    </div>
  );
}
