import React, { useState } from 'react';
import type { FormState } from '../types/ticket';
import { INITIAL_FORM, SLA_MAP } from '../constants/ticket';
import {
  ALLOWED_ATTACHMENT_TYPES,
  ATTACHMENT_INPUT_ACCEPT,
  MAX_ATTACHMENT_SIZE,
  MAX_ATTACHMENTS_PER_TICKET,
  formatAttachmentSize,
} from '../constants/attachments';

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
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    if (selected.length === 0) return;

    setFileError(null);
    setFiles((prev) => {
      const next = [...prev];
      for (const file of selected) {
        if (next.length >= MAX_ATTACHMENTS_PER_TICKET) {
          setFileError(`You can attach up to ${MAX_ATTACHMENTS_PER_TICKET} files.`);
          break;
        }
        if (file.size > MAX_ATTACHMENT_SIZE) {
          setFileError(`${file.name} is larger than 10MB.`);
          continue;
        }
        if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
          setFileError(`${file.name} isn't a supported file type.`);
          continue;
        }
        next.push(file);
      }
      return next;
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  };

  const uploadAttachments = async (ticketRef: string) => {
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('senderName', form.name);
        await fetch(`/api/tickets/${ticketRef}/attachments`, {
          method: 'POST',
          body: formData,
        });
      } catch {
        // Best-effort: the ticket is already created, so a failed attachment
        // upload shouldn't block the confirmation screen.
      }
    }
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
        const finalRef = data.ticket?.ticket_ref || generatedRef;
        if (files.length > 0) {
          await uploadAttachments(finalRef);
        }
        setSubmittedRef(finalRef);
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
    setFiles([]);
    setFileError(null);
  };

  const currentPriorityInfo = calculatePriority();

  return (


    <div className="transition-opacity duration-150 ease-in-out">
      {!submittedRef ? (
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-1">
                Name <span className="text-[#f87171]">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleTextChange}
                placeholder="Jane Doe"
                className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2563eb]"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-1">
                Email <span className="text-[#f87171]">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleTextChange}
                placeholder="jane@example.com"
                className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="title" className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-1">
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
              className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2563eb]"
            />
          </div>

          <div>
            <label htmlFor="mainDescription" className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-1">
              Tell us what you need <span className="text-[#f87171]">*</span>
            </label>
            <textarea
              id="mainDescription"
              name="mainDescription"
              rows={3}
              value={form.mainDescription}
              onChange={handleTextChange}
              placeholder="Describe your request, steps to reproduce, or details..."
              className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2563eb] resize-none"
            />
          </div>

          <div className="h-px bg-[#1f2937] my-3"></div>

          <div>
            <label htmlFor="requestType" className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-0.5">
              What do you need? <span className="text-[#f87171]">*</span>
            </label>
            <p className="text-[11.5px] text-[#6b7280] mb-2">Pick one and we'll only ask what's relevant.</p>
            <select
              id="requestType"
              name="requestType"
              value={form.requestType}
              onChange={handleTextChange}
              className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white focus:outline-none focus:border-[#2563eb] cursor-pointer"
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
                <label className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-1">
                  Lead Phone Number
                </label>
                <p className="text-[11.5px] text-[#6b7280] mb-1.5">Phone number of affected contact/lead if applicable.</p>
                <input
                  type="tel"
                  name="leadPhone"
                  value={form.leadPhone}
                  onChange={handleTextChange}
                  placeholder="+1 555 0199"
                  className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2563eb]"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-1">
                  What should have happened? <span className="text-[#f87171]">*</span>
                </label>
                <textarea
                  name="expectedBehavior"
                  rows={2}
                  value={form.expectedBehavior}
                  onChange={handleTextChange}
                  placeholder="The booking should show in the calendar within a minute."
                  className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2563eb] resize-none"
                />
              </div>
              <div>
                <fieldset>
                  <legend className="text-[12.5px] font-semibold text-[#e5e7eb] mb-0.5">
                    Can you still work? <span className="text-[#f87171]">*</span>
                  </legend>
                  <p className="text-[11.5px] text-[#6b7280] mb-2">This is how we decide what to pick up first.</p>
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
                            ? 'bg-[#2563eb]/15 border-[#2563eb]'
                            : 'bg-[#111827] border-[#1f2937] hover:border-[#374151]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="impact"
                          value={op.id}
                          checked={form.impact === op.id}
                          onChange={handleTextChange}
                          className="mt-0.5 accent-[#2563eb]"
                        />
                        <div>
                          <div className="text-[13px] font-semibold text-[#e5e7eb]">{op.title}</div>
                          <div className="text-[11.5px] text-[#6b7280]">{op.desc}</div>
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
                <label className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-1">
                  Which part of the platform?
                </label>
                <select
                  name="platformArea"
                  value={form.platformArea}
                  onChange={handleTextChange}
                  className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white focus:outline-none focus:border-[#2563eb]"
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
                <label className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-1">
                  What do you need set up? <span className="text-[#f87171]">*</span>
                </label>
                <select
                  name="workspaceKind"
                  value={form.workspaceKind}
                  onChange={handleTextChange}
                  className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white focus:outline-none focus:border-[#2563eb]"
                >
                  <option>A new workspace</option>
                  <option>A new channel in an existing workspace</option>
                  <option>A new phone number</option>
                </select>
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-1">
                  What should it be called? <span className="text-[#f87171]">*</span>
                </label>
                <input
                  type="text"
                  name="workspaceName"
                  value={form.workspaceName}
                  onChange={handleTextChange}
                  placeholder="e.g. Bright Smile — South Clinic"
                  className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2563eb]"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-1">
                  What will it be used for? <span className="text-[#f87171]">*</span>
                </label>
                <textarea
                  name="workspaceUse"
                  rows={2}
                  value={form.workspaceUse}
                  onChange={handleTextChange}
                  placeholder="New clinic opening in September — needs its own booking calendar and reminders."
                  className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2563eb] resize-none"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-1">
                  Needed by
                </label>
                <input
                  type="date"
                  name="neededBy"
                  value={form.neededBy}
                  onChange={handleTextChange}
                  className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white focus:outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>
          )}

          {form.requestType === 'campaign' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-1">
                  Campaign name <span className="text-[#f87171]">*</span>
                </label>
                <input
                  type="text"
                  name="campaignName"
                  value={form.campaignName}
                  onChange={handleTextChange}
                  placeholder="e.g. September check-up reminders"
                  className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2563eb]"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-0.5">
                  What should it do? <span className="text-[#f87171]">*</span>
                </label>
                <p className="text-[11.5px] text-[#6b7280] mb-1.5">Who it goes to, what it should say, and what counts as success.</p>
                <textarea
                  name="campaignGoal"
                  rows={3}
                  value={form.campaignGoal}
                  onChange={handleTextChange}
                  placeholder="Text every patient who hasn't been in for 9 months, offering a check-up slot."
                  className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2563eb] resize-none"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-1">
                  Go-live date
                </label>
                <input
                  type="date"
                  name="goLiveDate"
                  value={form.goLiveDate}
                  onChange={handleTextChange}
                  className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white focus:outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>
          )}

          {form.requestType === 'other' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-1">
                  When do you need it?
                </label>
                <select
                  name="otherTimeframe"
                  value={form.otherTimeframe}
                  onChange={handleTextChange}
                  className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-2.5 text-[13.5px] text-white focus:outline-none focus:border-[#2563eb]"
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
            <div>
              <label htmlFor="attachments" className="block text-[12.5px] font-semibold text-[#e5e7eb] mb-0.5">
                Attachments <span className="text-[#6b7280] font-normal">(optional)</span>
              </label>
              <p className="text-[11.5px] text-[#6b7280] mb-2">
                Got a screenshot, doc, or short recording? Attach it here — it helps us fix things faster.
              </p>

              <label
                htmlFor="attachments"
                className="flex flex-col items-center justify-center gap-1.5 border border-dashed border-[#374151] rounded-lg px-3.5 py-5 text-center cursor-pointer hover:border-[#2563eb] transition-colors duration-150"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-[12.5px] text-[#9ca3af]">
                  <span className="text-[#60a5fa] font-semibold">Click to attach a screenshot</span> or other file
                </span>
                <span className="text-[10.5px] text-[#6b7280]">Images, PDF, DOC, or video — up to 10MB each, {MAX_ATTACHMENTS_PER_TICKET} max</span>
              </label>
              <input
                id="attachments"
                type="file"
                multiple
                accept={ATTACHMENT_INPUT_ACCEPT}
                onChange={handleFileSelect}
                className="hidden"
              />

              {files.length > 0 && (
                <ul className="mt-2.5 space-y-1.5">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 bg-[#111827] border border-[#1f2937] rounded-lg px-3 py-2 text-[12px] text-[#e5e7eb]"
                    >
                      <span className="truncate">
                        {file.name} <span className="text-[#6b7280]">({formatAttachmentSize(file.size)})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="shrink-0 text-[#f87171] hover:text-[#fca5a5] text-[11px] font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {fileError && (
                <p className="text-[11.5px] text-[#f87171] mt-1.5">{fileError}</p>
              )}
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
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold py-3 px-4 rounded-xl shadow transition duration-150 disabled:opacity-50 text-[14px]"
              >
                {loading ? 'Submitting Ticket...' : 'Submit ticket'}
              </button>

              <div className="text-center text-[11px] text-[#6b7280]">
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
            <p className="text-[12.8px] text-[#9ca3af] mt-1">It's with the support team now.</p>
          </div>

          <div className="inline-block bg-[#111827] border border-[#1f2937] rounded-lg px-3.5 py-1.5 text-[14px] font-bold text-[#60a5fa] tracking-wide">
            {submittedRef}
          </div>

          <div className="text-left bg-[#111827] border border-[#1f2937] rounded-xl p-3.5 space-y-2 text-[12.3px] text-[#9ca3af]">
            <div className="relative pl-4 before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-[#2563eb] before:rounded-full">
              <b className="text-white">A person will reply {ticketSla}</b>
            </div>
            <div className="relative pl-4 before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-[#2563eb] before:rounded-full">
              You'll get updates as it progresses.
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button
              onClick={() => onOpenChat(submittedRef)}
              className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold py-2.5 rounded-xl text-[13px] transition-all duration-150 flex justify-center items-center gap-1.5"
            >
              Open Chat
            </button>
            <button
              onClick={resetForm}
              className="flex-1 bg-[#2563eb]/15 hover:bg-[#2563eb]/25 border border-[#2563eb]/40 text-[#60a5fa] font-semibold py-2.5 rounded-xl text-[13px] transition-all duration-150"
            >
              Submit another ticket
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
