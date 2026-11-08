import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "./ToastContext";
import { useCurrency } from "../lib/CurrencyContext";
import {
  MessageSquare,
  Search,
  User,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  Phone,
  Mail,
  ChevronRight,
  Sparkles
} from "lucide-react";

interface SitterInboxViewProps {
  initialBookingId?: number | null;
}

export function SitterInboxView({ initialBookingId }: SitterInboxViewProps) {
  const { user, dbUser } = useAuth();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(initialBookingId || null);

  // Selected thread messages
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatWarning, setChatWarning] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  useEffect(() => {
    if (selectedBookingId) {
      loadMessages(selectedBookingId);
      // Auto-poll messages every 6 seconds
      const timer = setInterval(() => {
        loadMessages(selectedBookingId, false);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [selectedBookingId]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/sitters/me/conversations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !selectedBookingId && !initialBookingId) {
          setSelectedBookingId(data[0].bookingId);
        }
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (bookingId: number, showLoading = true) => {
    if (showLoading) setLoadingMessages(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${bookingId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (e) {
      console.error("Failed to load messages:", e);
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedBookingId) return;

    setSending(true);
    setChatWarning(null);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${selectedBookingId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: newMessage.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isFlagged) {
          setChatWarning(data.flagReason || "Message flagged for off-platform contact sharing.");
        }
        setNewMessage("");
        loadMessages(selectedBookingId, false);
        loadConversations();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "Message Failed",
          description: err.error || "Could not deliver message.",
          type: "error"
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      (c.owner?.name && c.owner.name.toLowerCase().includes(term)) ||
      (c.modality && c.modality.toLowerCase().includes(term)) ||
      String(c.bookingId).includes(term) ||
      (c.latestMessage?.message && c.latestMessage.message.toLowerCase().includes(term))
    );
  });

  const selectedConversation = conversations.find((c) => c.bookingId === selectedBookingId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-700">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Pet Sitter Messages & Owner Inbox</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review past communications, pet parent inquiries, and active care updates.
          </p>
        </div>

        <button
          onClick={() => {
            loadConversations();
            if (selectedBookingId) loadMessages(selectedBookingId);
          }}
          className="self-start sm:self-auto px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Messages</span>
        </button>
      </div>

      {/* Main 2-Column Split: Conversation List | Active Chat */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left: Conversation List */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-white ${selectedBookingId ? "hidden md:flex" : "flex"}`}>
          {/* Search bar */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search owner, pet, or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400">Loading your conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">No messages found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  When pet owners send booking requests or inquiries, they will appear here.
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.bookingId === selectedBookingId;
                return (
                  <button
                    key={c.bookingId}
                    type="button"
                    onClick={() => setSelectedBookingId(c.bookingId)}
                    className={`w-full p-4 text-left transition-colors flex items-start gap-3 hover:bg-slate-50 ${
                      isSelected ? "bg-indigo-50/70 border-l-4 border-indigo-600" : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm shrink-0 border border-purple-200">
                      {c.owner?.name ? c.owner.name.charAt(0).toUpperCase() : "P"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {c.owner?.name || "Pet Parent"}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          #{c.bookingId}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {c.modality?.replace("_", " ")}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            c.status === "CONFIRMED"
                              ? "bg-emerald-100 text-emerald-800"
                              : c.status === "COMPLETED"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 truncate">
                        {c.latestMessage?.message || "No messages sent yet"}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 self-center" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Message Thread */}
        <div className={`flex-1 flex flex-col bg-slate-50/40 ${!selectedBookingId ? "hidden md:flex" : "flex"}`}>
          {selectedConversation ? (
            <>
              {/* Thread Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedBookingId(null)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                    title="Back to list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-base border border-purple-200">
                    {selectedConversation.owner?.name?.charAt(0).toUpperCase() || "P"}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {selectedConversation.owner?.name || "Pet Parent"}
                      </h3>
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">
                        Booking #{selectedConversation.bookingId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>{selectedConversation.modality?.replace("_", " ")}</span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-700">₱{selectedConversation.totalPrice}</span>
                      {selectedConversation.owner?.phone && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {selectedConversation.owner.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  to={`/sitter/visits/${selectedConversation.bookingId}`}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition-colors"
                >
                  <span>Visit Dashboard</span>
                </Link>
              </div>

              {/* Security Banner */}
              <div className="px-4 py-2 bg-indigo-50/60 border-b border-indigo-100 text-indigo-900 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>PawShield Secure Messaging:</strong> All communications are monitored by automated escrow protection to prevent off-platform disintermediation.
                </span>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {loadingMessages ? (
                  <div className="p-8 text-center">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs text-slate-400">Loading message history...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 m-4">
                    <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No messages in this booking yet</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      Send a warm greeting to the pet owner to introduce yourself and confirm any special care notes for their pet!
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === dbUser?.id || m.senderRole === "PET_SITTER";
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10px] font-bold text-slate-500">
                            {isMe ? "You (Caregiver)" : m.senderName || "Pet Parent"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div
                          className={`max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-2xs leading-relaxed ${
                            isMe
                              ? "bg-indigo-600 text-white rounded-br-none"
                              : "bg-white text-slate-900 border border-slate-200 rounded-bl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.message}</p>
                          {m.isFlagged && (
                            <div className="mt-1.5 pt-1.5 border-t border-white/20 text-[10px] text-amber-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-300 shrink-0" />
                              <span>Automated platform advisory: Contact sharing flagged</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              {chatWarning && (
                <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{chatWarning}</span>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your reply to the pet owner..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{sending ? "Sending..." : "Send"}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">Select a conversation</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Click on any owner message thread on the left to review your chat history and reply.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
