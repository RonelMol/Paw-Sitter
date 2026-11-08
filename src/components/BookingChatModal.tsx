import React, { useState, useEffect, useRef } from "react";
import { 
  X, Send, ShieldCheck, ShieldAlert, User, Clock, RefreshCw, 
  Sparkles, CheckCircle2, MessageSquare, AlertTriangle, Check
} from "lucide-react";
import { useToast } from "./ToastContext";
import { useAuth } from "../lib/AuthContext";

export interface ChatMessage {
  id: number;
  bookingId: number;
  senderId: number;
  senderRole: string;
  senderName: string | null;
  message: string;
  isFlagged: boolean;
  flagReason?: string | null;
  createdAt: string;
}

interface BookingChatModalProps {
  bookingId: number | null;
  isOpen: boolean;
  onClose: () => void;
  partnerName?: string;
  bookingDetails?: {
    ownerName?: string;
    sitterName?: string;
    modality?: string;
    status?: string;
    totalPrice?: string | number;
  };
}

export function BookingChatModal({
  bookingId,
  isOpen,
  onClose,
  bookingDetails,
}: BookingChatModalProps) {
  const { user, dbUser } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [warning, setWarning] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async (showLoading = true) => {
    if (!bookingId) return;
    if (showLoading) setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user) {
        try {
          const token = await user.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch {}
      }
      const res = await fetch(`/api/bookings/${bookingId}/messages`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn("Could not load messages:", err);
      }
    } catch (e) {
      console.error("Fetch messages failed:", e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial load and periodic polling
  useEffect(() => {
    if (isOpen && bookingId) {
      fetchMessages(true);
      const timer = setInterval(() => {
        fetchMessages(false);
      }, 5000);
      return () => clearInterval(timer);
    } else {
      setMessages([]);
      setText("");
      setWarning(null);
    }
  }, [isOpen, bookingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Disintermediation regex
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const offPlatformRegex = /(venmo|cashapp|zelle|paypal|cash on hand|gcash|maya)/i;

    if (phoneRegex.test(val) || emailRegex.test(val) || offPlatformRegex.test(val)) {
      setWarning(
        "Security Alert: Sharing direct phone, email, or off-platform payment info violates PawShield Trust & Safety standards and voids booking insurance coverage."
      );
    } else {
      setWarning(null);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !bookingId || sending) return;
    const content = text.trim();
    setSending(true);

    // Optimistic message
    const tempId = Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      bookingId,
      senderId: dbUser?.id || 0,
      senderRole: dbUser?.role || "PET_SITTER",
      senderName: dbUser?.name || user?.displayName || "You",
      message: content,
      isFlagged: Boolean(warning),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setText("");
    setWarning(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        try {
          const token = await user.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: content }),
      });

      if (res.ok) {
        const savedMsg = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === tempId ? savedMsg : m)));
        toast({ title: "Message Sent", description: "Delivered to booking conversation", type: "success" });
      } else {
        const err = await res.json();
        toast({ title: "Failed to Send", description: err.error || "Message delivery failed", type: "error" });
        // Revert optimistic on fail
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (e: any) {
      toast({ title: "Network Error", description: e.message, type: "error" });
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickReplies = [
    "🐾 I'm heading over now!",
    "📸 Photo update coming shortly!",
    "✅ Visit completed smoothly and pet is happy!",
    "❓ Any special feeding or walk instructions today?",
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Chat Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Chat with {bookingDetails?.ownerName || "Pet Owner"}
                </h3>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                  Booking #{bookingId}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Direct Chat Active
                </span>
                {bookingDetails?.modality && (
                  <>
                    <span>•</span>
                    <span className="capitalize font-medium">{bookingDetails.modality.replace(/_/g, " ").toLowerCase()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchMessages(true)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Refresh conversation"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Safety & Compliance Micro-Notice */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            Protected by PawShield Insurance & Escrow Guarantee
          </span>
          <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">
            In-app records are saved
          </span>
        </div>

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 min-h-[300px] max-h-[420px]">
          {loading && messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mb-2 text-slate-400" />
              <p className="text-xs font-medium">Loading chat history...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-700">No previous messages</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Send a greeting to start your conversation!</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === dbUser?.id || (m.senderRole === dbUser?.role && m.senderName === (dbUser?.name || user?.displayName));
              const isOwner = m.senderRole === "PET_OWNER";
              const timeString = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"} space-y-1`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 px-1">
                    <span>{m.senderName || (isOwner ? "Pet Parent" : "Verified Sitter")}</span>
                    <span className="font-normal opacity-70">({isOwner ? "Owner" : "Sitter"})</span>
                    <span>•</span>
                    <span className="font-normal">{timeString}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-sm ${
                      isMe
                        ? "bg-slate-900 text-white rounded-br-xs font-medium"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs font-medium"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.message}</p>
                    {m.isFlagged && (
                      <div className="mt-2 pt-2 border-t border-red-200/40 text-[10px] text-red-500 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Safety Filter Triggered</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Warning Banner */}
        {warning && (
          <div className="bg-rose-50 border-t border-rose-200 p-3 px-4 flex items-start gap-2.5 text-xs text-rose-800 animate-in slide-in-from-bottom-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <strong className="font-bold">Trust & Safety Notice: </strong>
              {warning}
            </div>
          </div>
        )}

        {/* Quick Suggestion Pills */}
        <div className="px-4 pt-2.5 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setText(reply)}
              className="text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors shrink-0"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white">
          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent transition-all">
            <textarea
              ref={textareaRef}
              rows={2}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Write a message to pet parent... (Enter to send)"
              className="w-full bg-transparent border-none text-xs text-slate-900 placeholder-slate-400 focus:outline-none resize-none px-2 py-1 leading-relaxed"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
            >
              {sending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
