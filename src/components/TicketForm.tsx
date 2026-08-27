import React, { useState } from 'react';
import type { FormState } from '../types/ticket';
import { INITIAL_FORM, SLA_MAP } from '../constants/ticket';

interface TicketFormProps {
  onTicketSubmitted: () => void;
  onOpenChat: (ticketRef: string) => void;
}

export default function TicketForm({ onTicketSubmitted, onOpenChat }: TicketFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [ticketSla, setTicketSla] = useState<string>('');

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
        setSubmittedRef(data.ticket?.ticket_ref || generatedRef);
        setTicketSla(SLA_MAP[pCode] || 'within 4 business hours');
        onTicketSubmitted();
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
    setSubmittedRef(null);
    setErrorMsg(null);
  };

  const currentPriorityInfo = calculatePriority();

  return (
    <div className="transition-opacity duration-150 ease-in-out">
      {!submittedRef ? (
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5">
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
            {submittedRef}
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
              onClick={() => onOpenChat(submittedRef)}
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
  );
}
