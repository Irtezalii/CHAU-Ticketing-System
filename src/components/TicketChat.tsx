import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ALLOWED_ATTACHMENT_TYPES,
  ATTACHMENT_INPUT_ACCEPT,
  MAX_ATTACHMENT_SIZE,
  formatAttachmentSize,
} from "../constants/attachments";

interface TicketDetail {
  id: number;
  ticket_ref: string;
  name: string;
  email: string;
  subject: string;
  request_type: string;
  priority: string;
  status: string;
  main_description: string | null;
  created_at: string;
}

interface Message {
  id: number;
  ticket_ref: string;
  sender_name: string;
  sender_role: "user" | "agent" | "system" | string;
  message: string;
  created_at: string;
  attachment_id?: number | null;
  attachment_file_name?: string | null;
  attachment_content_type?: string | null;
  attachment_size_bytes?: number | null;
}

interface TicketChatProps {
  ticketRef: string;
  onBack: () => void;
}

export default function TicketChat({ ticketRef, onBack }: TicketChatProps) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<
    { id: number; file: File; previewUrl: string | null }[]
  >([]);
  const pendingIdCounter = useRef(0);

  // Agent vs. user is determined by whether this browser is logged into the
  // admin panel, not by a self-selectable toggle -- the server independently
  // re-verifies the admin token before ever recording a message as "agent".
  const adminToken = localStorage.getItem("admin_token");
  const isAdmin = Boolean(adminToken);

  const feedRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initialLoadDone = useRef(false);
  const prevMessageCount = useRef(0);

  // Auto-resize textarea height dynamically based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [newMessage]);

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, []);

  // Fetch Ticket Meta Details
  const fetchTicketDetails = useCallback(
    async (isMounted = true) => {
      try {
        const res = await fetch(`/api/tickets/${ticketRef}`);
        const data = await res.json();
        if (isMounted && res.ok && data.success) {
          setTicket(data.ticket);
        }
      } catch {
        console.error("Failed to load ticket details");
      }
    },
    [ticketRef],
  );

  // Fetch Chat Messages
  const fetchMessages = useCallback(
    async (isMounted = true) => {
      try {
        const res = await fetch(`/api/tickets/${ticketRef}/messages`);
        const data = await res.json();
        if (isMounted && res.ok && data.success) {
          setMessages(data.messages || []);
          try {
            localStorage.setItem(`ticket_read_${ticketRef}`, new Date().toISOString());
          } catch {
            // ignore
          }
        }
      } catch {
        console.error("Failed to load messages");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    },
    [ticketRef],
  );

  useEffect(() => {
    let isMounted = true;
    try {
      localStorage.setItem(`ticket_read_${ticketRef}`, new Date().toISOString());
    } catch {
      // ignore
    }

    const timer = setTimeout(() => {
      if (isMounted) {
        void fetchTicketDetails(isMounted);
        void fetchMessages(isMounted);
      }
    }, 0);

    const interval = setInterval(() => {
      if (isMounted) {
        void fetchMessages(isMounted);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchTicketDetails, fetchMessages]);

  // Scroll to bottom on initial load, and again whenever a new message arrives
  // (but not if the user has scrolled up to read older history).
  useEffect(() => {
    if (loading || messages.length === 0) return;

    if (!initialLoadDone.current) {
      scrollToBottom();
      initialLoadDone.current = true;
    } else if (messages.length > prevMessageCount.current) {
      const feed = feedRef.current;
      const distanceFromBottom = feed
        ? feed.scrollHeight - feed.scrollTop - feed.clientHeight
        : 0;
      if (distanceFromBottom < 150) {
        scrollToBottom();
      }
    }

    prevMessageCount.current = messages.length;
  }, [loading, messages, scrollToBottom]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newMessage.trim();
    if ((!trimmed && pendingAttachments.length === 0) || sending) return;

    setSending(true);
    try {
      if (pendingAttachments.length > 0) {
        const toUpload = pendingAttachments;
        setPendingAttachments([]);
        for (const pending of toUpload) {
          await uploadFile(pending.file);
          if (pending.previewUrl) URL.revokeObjectURL(pending.previewUrl);
        }
      }

      if (trimmed) {
        const res = await fetch(`/api/tickets/${ticketRef}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(isAdmin && adminToken
              ? { Authorization: `Bearer ${adminToken}` }
              : {}),
          },
          body: JSON.stringify({
            senderName: isAdmin
              ? localStorage.getItem("admin_user") || "Support Specialist"
              : ticket?.name || "Submitter",
            message: trimmed,
          }),
        });

        if (res.ok) {
          setNewMessage("");
          if (textareaRef.current) textareaRef.current.style.height = "auto";
        }
      }

      await fetchMessages(true);
      scrollToBottom(); // Auto-scroll on user action when sending a message
    } catch {
      console.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async (file: File) => {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setAttachError(`${file.name} is larger than 10MB.`);
      return;
    }
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      setAttachError(`${file.name} isn't a supported file type.`);
      return;
    }

    setUploadingCount((c) => c + 1);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "senderName",
        isAdmin
          ? localStorage.getItem("admin_user") || "Support Specialist"
          : ticket?.name || "Submitter",
      );

      const res = await fetch(`/api/tickets/${ticketRef}/attachments`, {
        method: "POST",
        headers: {
          ...(isAdmin && adminToken
            ? { Authorization: `Bearer ${adminToken}` }
            : {}),
        },
        body: formData,
      });

      if (res.ok) {
        await fetchMessages(true);
        scrollToBottom();
      } else {
        const data = await res.json().catch(() => null);
        setAttachError(data?.message || `Failed to upload ${file.name}.`);
      }
    } catch {
      setAttachError(`Failed to upload ${file.name}.`);
    } finally {
      setUploadingCount((c) => Math.max(0, c - 1));
    }
  };

  const stageFiles = (files: File[]) => {
    setAttachError(null);
    const accepted: { id: number; file: File; previewUrl: string | null }[] = [];

    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        setAttachError(`${file.name} is larger than 10MB.`);
        continue;
      }
      if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
        setAttachError(`${file.name} isn't a supported file type.`);
        continue;
      }
      accepted.push({
        id: ++pendingIdCounter.current,
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      });
    }

    if (accepted.length > 0) {
      setPendingAttachments((prev) => [...prev, ...accepted]);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";
    if (selected.length === 0) return;
    stageFiles(selected);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageFiles = items
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);

    if (imageFiles.length === 0) return;

    // A pasted screenshot has no meaningful text payload alongside it, so
    // keep it out of the message textarea -- stage it as a pending
    // attachment the user can review and remove before it's actually sent.
    e.preventDefault();
    stageFiles(imageFiles);
  };

  const removePendingAttachment = (id: number) => {
    setPendingAttachments((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const pendingAttachmentsRef = useRef(pendingAttachments);
  pendingAttachmentsRef.current = pendingAttachments;

  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const initialLetter = (name?: string) =>
    name ? name.charAt(0).toUpperCase() : "A";

  const formattedDate = ticket?.created_at
    ? new Date(ticket.created_at)
        .toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
        .toUpperCase()
    : new Date()
        .toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
        .toUpperCase();

  return (
    <div className="w-full max-w-[680px] bg-[#0c1017] border border-[#1f2937] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[650px] text-[#e5e7eb] font-sans my-auto">
      {/* Component-scoped Thin Scrollbar Styles */}
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

      {/* Top Navigation & User Header */}
      <div className="px-5 py-3 border-b border-[#1f2937] bg-[#0c1017] flex items-center justify-between z-10 relative flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-xs bg-[#161f2e] hover:bg-[#1e2a3e] border border-[#2d3a4e] text-[#60a5fa] px-2.5 py-1 rounded-lg transition cursor-pointer"
          >
            ← Back
          </button>

          <div className="w-8 h-8 rounded-full bg-[#2563eb] flex items-center justify-center font-bold text-white text-xs">
            {initialLetter(ticket?.name)}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-white">
                {ticket?.name || "Submitter"}
              </span>
              <span className="text-[10.5px] text-[#6b7280]">#{ticketRef}</span>
            </div>
            <p className="text-[10.5px] text-[#9ca3af]">
              You · {ticket?.email || "email@example.com"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/30 text-[9.5px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase">
            ONLINE
          </span>
        </div>
      </div>

      {/* Main Relative Container */}
      <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Accordion Toggle Bar */}
        <div className="w-full z-10 bg-[#0c1017] border-b border-[#1f2937] flex-shrink-0">
          <button
            type="button"
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="w-full px-5 py-2.5 flex items-center justify-between text-[12px] font-medium text-[#9ca3af] hover:text-white transition cursor-pointer"
          >
            <span>
              Ticket details <span className="mx-1">•</span>{" "}
              <strong className="text-white font-semibold">
                {ticket?.subject || "Loading..."}
              </strong>
            </span>
            <span className="text-xs">{detailsOpen ? "▲" : "▼"}</span>
          </button>
        </div>

        {/* Absolute Floating Glass Panel Overlay */}
        {detailsOpen && (
          <div className="absolute top-[41px] left-0 right-0 z-20 px-5 py-4 space-y-4 text-left border-b border-[#1f2937] bg-[#0c1017]/90 backdrop-blur-md shadow-2xl max-h-[260px] overflow-y-auto custom-chat-scrollbar transition-all duration-200">
            <div>
              <div className="text-[10px] font-bold tracking-wider text-[#6b7280] uppercase mb-1">
                TITLE
              </div>
              <h4 className="text-[14px] font-bold text-white">
                {ticket?.subject || "No subject"}
              </h4>
            </div>

            <div>
              <div className="text-[10px] font-bold tracking-wider text-[#6b7280] uppercase mb-1">
                DESCRIPTION
              </div>
              <p className="text-[12.5px] text-[#d1d5db] leading-relaxed whitespace-pre-line">
                {ticket?.main_description || "No description available."}
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="bg-[#1e293b]/80 text-[#94a3b8] border border-[#334155]/80 text-[10.5px] font-semibold px-2.5 py-0.5 rounded-md">
                {ticket?.request_type || "General"}
              </span>
              <span className="bg-[#f59e0b]/15 text-[#fbbf24] border border-[#f59e0b]/30 text-[10.5px] font-bold px-2.5 py-0.5 rounded-md uppercase">
                {ticket?.priority || "MEDIUM"} PRIORITY
              </span>
            </div>
          </div>
        )}

        {/* Messages Feed */}
        <div
          ref={feedRef}
          className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#080b10] flex flex-col custom-chat-scrollbar"
        >
          {/* Dynamic Date Divider */}
          <div className="relative flex py-1 items-center flex-shrink-0">
            <div className="flex-grow border-t border-[#1f2937]"></div>
            <span className="flex-shrink mx-4 text-[9.5px] font-bold tracking-wider text-[#6b7280] uppercase">
              {formattedDate}
            </span>
            <div className="flex-grow border-t border-[#1f2937]"></div>
          </div>

          {/* Ready Badge */}
          <div className="mx-auto bg-[#111827] border border-[#1f2937] text-[#9ca3af] text-[11.5px] px-3.5 py-1 rounded-full shadow-sm text-center flex-shrink-0">
            Your ticket chat is ready. We will post updates here.
          </div>

          {loading ? (
            <div className="text-center text-xs text-[#6b7280] py-8">
              Loading conversation...
            </div>
          ) : (
            messages.map((m) => {
              const isSystem =
                m.sender_role === "system" ||
                m.sender_name?.toLowerCase() === "system";

              if (isSystem) {
                const isReopen = m.message.toLowerCase().includes("reopen");
                const isResolved = m.message.toLowerCase().includes("resolved");
                const isWaiting = m.message.toLowerCase().includes("waiting");
                const isDev = m.message.toLowerCase().includes("completed");

                const dotColor = isReopen
                  ? "bg-[#eab308]"
                  : isResolved
                    ? "bg-[#22c55e]"
                    : isWaiting
                      ? "bg-[#f43f5e]"
                      : isDev
                        ? "bg-[#2dd4bf]"
                        : "bg-[#60a5fa]";

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-center my-2 flex-shrink-0 select-none"
                  >
                    <div className="mx-auto bg-[#111827] border border-[#1f2937] text-[#9ca3af] text-[11.5px] px-3.5 py-1 rounded-full shadow-sm text-center flex items-center gap-2 max-w-[90%]">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse flex-shrink-0`}
                      />
                      <span>{m.message}</span>
                    </div>
                  </div>
                );
              }

              // Fixed layout regardless of who's viewing: agent messages always
              // on the right, user messages always on the left.
              const isAgentMessage = m.sender_role === "agent";
              const attachmentUrl = m.attachment_id
                ? `/api/attachments/${m.attachment_id}`
                : null;
              const isImage = m.attachment_content_type?.startsWith("image/");
              const isVideo = m.attachment_content_type?.startsWith("video/");

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isAgentMessage ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-[#6b7280] mb-0.5 px-1">
                    <span className="font-semibold text-[#9ca3af]">
                      {m.sender_name}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase ${
                        m.sender_role === "agent"
                          ? "bg-[#f59e0b]/20 text-[#fbbf24]"
                          : "bg-[#2563eb]/20 text-[#60a5fa]"
                      }`}
                    >
                      {m.sender_role}
                    </span>
                  </div>

                  {attachmentUrl ? (
                    <div
                      className={`max-w-[85%] rounded-2xl overflow-hidden shadow ${
                        isAgentMessage
                          ? "bg-[#1e293b] border border-[#1e293b] rounded-br-none"
                          : "bg-[#111827] border border-[#1f2937] rounded-bl-none"
                      }`}
                    >
                      {isImage ? (
                        <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={attachmentUrl}
                            alt={m.attachment_file_name || "attachment"}
                            className="max-w-[300px] max-h-[240px] w-full object-cover block"
                          />
                          <div className="px-3 py-2 text-[11px] text-[#9ca3af] truncate">
                            {m.attachment_file_name}
                            {typeof m.attachment_size_bytes === "number" &&
                              ` · ${formatAttachmentSize(m.attachment_size_bytes)}`}
                          </div>
                        </a>
                      ) : isVideo ? (
                        <div>
                          <video
                            src={attachmentUrl}
                            controls
                            preload="metadata"
                            className="w-[300px] max-h-[260px] bg-black block"
                          />
                          <div className="px-3 py-2 text-[11px] text-[#9ca3af] truncate">
                            {m.attachment_file_name}
                            {typeof m.attachment_size_bytes === "number" &&
                              ` · ${formatAttachmentSize(m.attachment_size_bytes)}`}
                          </div>
                        </div>
                      ) : (
                        <a
                          href={attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-white/5 transition"
                        >
                          <span className="w-9 h-9 rounded-lg bg-[#2563eb]/15 border border-[#2563eb]/30 flex items-center justify-center flex-shrink-0 text-[#60a5fa]">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[12px] font-semibold text-white truncate">
                              {m.attachment_file_name}
                            </span>
                            <span className="block text-[10.5px] text-[#6b7280] inline-flex items-center gap-1">
                              {typeof m.attachment_size_bytes === "number"
                                ? `${formatAttachmentSize(m.attachment_size_bytes)} · `
                                : ""}
                              Open
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M7 17L17 7M9 7h8v8" />
                              </svg>
                            </span>
                          </span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words ${
                        isAgentMessage
                          ? "bg-[#1e293b] text-white rounded-br-none shadow border border-[#1e293b]"
                          : "bg-[#111827] border border-[#1f2937] text-[#e5e7eb] rounded-bl-none"
                      }`}
                    >
                      {m.message}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pending attachment review strip */}
      {pendingAttachments.length > 0 && (
        <div className="px-3 pt-2.5 pb-1 border-t border-[#1f2937] bg-[#0c1017] flex-shrink-0 flex flex-wrap gap-2">
          {pendingAttachments.map((p) =>
            p.previewUrl ? (
              <div
                key={p.id}
                className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#1f2937] flex-shrink-0"
              >
                <img src={p.previewUrl} alt={p.file.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePendingAttachment(p.id)}
                  title="Remove"
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center text-[10px] leading-none transition"
                >
                  ×
                </button>
              </div>
            ) : (
              <div
                key={p.id}
                className="relative flex items-center gap-1.5 h-14 max-w-[170px] pl-2 pr-6 rounded-lg border border-[#1f2937] bg-[#111827] flex-shrink-0"
              >
                <span className="w-8 h-8 rounded-md bg-[#2563eb]/15 border border-[#2563eb]/30 flex items-center justify-center flex-shrink-0 text-[#60a5fa]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </span>
                <span className="min-w-0 text-[10.5px] text-[#e5e7eb] truncate">{p.file.name}</span>
                <button
                  type="button"
                  onClick={() => removePendingAttachment(p.id)}
                  title="Remove"
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center text-[10px] leading-none transition"
                >
                  ×
                </button>
              </div>
            ),
          )}
        </div>
      )}

      {/* Attachment status strip */}
      {(uploadingCount > 0 || attachError) && (
        <div className="px-4 py-1.5 border-t border-[#1f2937] bg-[#0c1017] flex-shrink-0 text-[11px]">
          {uploadingCount > 0 && (
            <span className="text-[#9ca3af]">
              Uploading {uploadingCount} file{uploadingCount > 1 ? "s" : ""}…
            </span>
          )}
          {attachError && <span className="text-[#f87171]">{attachError}</span>}
        </div>
      )}

      {/* Dynamic Expandable Input Bar with Hidden Scrollbar */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-[#1f2937] bg-[#0c1017] flex items-end gap-2.5 z-10 flex-shrink-0"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ATTACHMENT_INPUT_ACCEPT}
          onChange={handleFileSelected}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleAttachClick}
          disabled={uploadingCount > 0}
          className="text-[#6b7280] hover:text-[#9ca3af] p-2 transition cursor-pointer mb-0.5 disabled:opacity-40"
          title="Attach file"
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            pendingAttachments.length > 0
              ? "Add a caption, or just hit send…"
              : "Talk to Support Agent"
          }
          className="flex-1 bg-[#111827] border border-[#1f2937] rounded-2xl px-4 py-2.5 text-[12.5px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#2563eb] transition resize-none max-h-[140px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        />

        <button
          type="submit"
          disabled={sending || (!newMessage.trim() && pendingAttachments.length === 0)}
          className="w-10 h-10 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer shadow flex-shrink-0 mb-0.5"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  );
}
