import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { 
  Calendar, CheckCircle, XCircle, MessageSquare, AlertTriangle, 
  Clock, MapPin, DollarSign, ChevronLeft, ChevronRight, Play, ShieldAlert, Settings, User
} from "lucide-react";
import { cn } from "../lib/utils";
import { BookingChatModal } from "../components/BookingChatModal";
import { SitterInboxView } from "../components/SitterInboxView";

export function SitterInboxPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainView, setMainView] = useState<"MESSAGES" | "SCHEDULE" | "REQUESTS">("MESSAGES");
  const [requestTab, setRequestTab] = useState<"PENDING" | "CONFIRMED" | "PAST">("CONFIRMED");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  
  // Chat Modal State
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatBookingId, setChatBookingId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchBookings = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/bookings", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setBookings(data);
        }
      } catch (e) {
        console.error("Fetch inbox error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [user]);

  const handleAction = async (id: number, action: string) => {
    toast({ 
      title: "Booking Updated", 
      description: `Marked booking #${id} as ${action === 'accept' ? 'CONFIRMED' : 'DECLINED'}.`, 
      type: action === 'accept' ? 'success' : 'info' 
    });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: action === 'accept' ? 'CONFIRMED' : 'CANCELLED' } : b));
  };

  // Safe modality badge color
  const getModalityColor = (modality: string) => {
    switch (modality?.toUpperCase()) {
      case "BOARDING": return "bg-purple-100 text-purple-800 border-purple-200";
      case "HOUSE_SITTING": return "bg-blue-100 text-blue-800 border-blue-200";
      case "DROP_IN": return "bg-amber-100 text-amber-800 border-amber-200";
      case "DOG_WALKING": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  // Schedule filtering: bookings that have confirmed status
  const confirmedSchedule = bookings.filter(b => b.status === "CONFIRMED" || b.status === "IN_PROGRESS");
  
  // Tab filtered requests
  const filteredRequests = bookings.filter(b => {
    if (requestTab === "PENDING") return b.status === "PENDING";
    if (requestTab === "CONFIRMED") return b.status === "CONFIRMED" || b.status === "IN_PROGRESS";
    return b.status === "COMPLETED" || b.status === "CANCELLED";
  });

  const totalEarnings = confirmedSchedule.reduce((acc, curr) => acc + (parseFloat(curr.totalPrice) || (curr.totalAmount ? curr.totalAmount / 100 : 0)), 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
              Caregiver Workspace
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-medium">Pet Sitter Hub</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Booked Schedule & Operations
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage your daily appointment calendar, execute live visits with GPS check-in, and respond to owner requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            to="/sitter/rates" 
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
          >
            <Settings className="w-4 h-4" /> Rate Card
          </Link>
          <button 
            onClick={() => toast({ title: "Availability Status", description: "Your calendar is live and accepting new bookings.", type: "success" })}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
          >
            <CheckCircle className="w-4 h-4" /> Accepting Bookings
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{confirmedSchedule.length}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled Bookings</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {bookings.filter(b => b.status === "PENDING").length}
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Inquiries</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">${totalEarnings.toFixed(2)}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projected Payouts</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Play className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {bookings.filter(b => b.status === "IN_PROGRESS").length}
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active In-Progress</div>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-200 mb-6 gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMainView("MESSAGES")}
            className={cn(
              "px-4 sm:px-5 py-3 text-sm font-black border-b-2 flex items-center gap-2 transition-colors",
              mainView === "MESSAGES" 
                ? "border-purple-600 text-purple-700" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <MessageSquare className="w-4 h-4 text-purple-600" /> Sitter Inbox & Chat History
          </button>
          <button
            onClick={() => setMainView("SCHEDULE")}
            className={cn(
              "px-4 sm:px-5 py-3 text-sm font-black border-b-2 flex items-center gap-2 transition-colors",
              mainView === "SCHEDULE" 
                ? "border-slate-900 text-slate-900" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Calendar className="w-4 h-4" /> Booked Schedule & Calendar
          </button>
          <button
            onClick={() => setMainView("REQUESTS")}
            className={cn(
              "px-4 sm:px-5 py-3 text-sm font-black border-b-2 flex items-center gap-2 transition-colors",
              mainView === "REQUESTS" 
                ? "border-slate-900 text-slate-900" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <CheckCircle className="w-4 h-4" /> All Requests & Statuses
          </button>
        </div>

        {mainView === "REQUESTS" && (
          <div className="flex items-center gap-2 pb-2 sm:pb-0">
            {(["PENDING", "CONFIRMED", "PAST"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setRequestTab(tab)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors",
                  requestTab === tab 
                    ? "bg-slate-900 text-white" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEW 0: DEDICATED SITTER INBOX & FULL MESSAGING HUB */}
      {mainView === "MESSAGES" && (
        <div className="space-y-6">
          <SitterInboxView initialBookingId={chatBookingId} />
        </div>
      )}

      {/* VIEW 1: BOOKED SCHEDULE & CALENDAR */}
      {mainView === "SCHEDULE" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Upcoming Confirmed Bookings Timeline
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ordered by service start date and time. Click "Execute Visit" when arriving at the client's home.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button 
                  onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                >
                  Today
                </button>
              </div>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-28 bg-slate-100 rounded-xl w-full"></div>
                <div className="h-28 bg-slate-100 rounded-xl w-full"></div>
              </div>
            ) : confirmedSchedule.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">No Confirmed Bookings on Schedule</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  When pet owners request and confirm services through your profile, your upcoming booked calendar will appear here.
                </p>
                <button 
                  onClick={() => setMainView("REQUESTS")}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  View Pending Requests
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {confirmedSchedule.map(booking => {
                  const modality = (booking.modality || "DOG_WALKING").replace(/_/g, " ");
                  const startDate = new Date(booking.startTime);
                  const endDate = new Date(booking.endTime);
                  const isToday = new Date().toDateString() === startDate.toDateString();

                  return (
                    <div 
                      key={booking.id} 
                      className={cn(
                        "p-5 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6",
                        isToday 
                          ? "bg-indigo-50/40 border-indigo-200 shadow-sm ring-1 ring-indigo-200" 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Time box */}
                        <div className="flex flex-col items-center justify-center w-20 h-20 bg-slate-900 text-white rounded-xl flex-shrink-0 text-center p-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {startDate.toLocaleDateString(undefined, { month: 'short' })}
                          </span>
                          <span className="text-xl font-black leading-none my-0.5">
                            {startDate.getDate()}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-300 truncate">
                            {startDate.toLocaleDateString(undefined, { weekday: 'short' })}
                          </span>
                        </div>

                        {/* Details */}
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={cn("px-2 py-0.5 rounded text-xs font-bold uppercase border", getModalityColor(booking.modality))}>
                              {modality}
                            </span>
                            {isToday && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900">
                                Today's Schedule
                              </span>
                            )}
                            <span className="text-xs font-medium text-slate-400">Booking #{booking.id}</span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900">
                            {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </h3>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-2">
                            <span className="flex items-center gap-1 font-medium">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              Owner: <span className="font-semibold text-slate-800">{booking.ownerName || booking.ownerEmail || "Pet Owner"}</span>
                            </span>
                            <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              <DollarSign className="w-3.5 h-3.5" /> Payout: ${booking.totalPrice || (booking.totalAmount ? (booking.totalAmount / 100).toFixed(2) : "0.00")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                        <button
                          onClick={() => { setChatBookingId(booking.id); setChatModalOpen(true); }}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Message Owner
                        </button>
                        
                        <Link 
                          to={`/sitter/visits/${booking.id}`} 
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" /> Execute Visit (GPS)
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: REQUESTS & STATUSES */}
      {mainView === "REQUESTS" && (
        <div className="space-y-4">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-slate-100 rounded-2xl w-full"></div>
              <div className="h-32 bg-slate-100 rounded-2xl w-full"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 font-medium">No {requestTab.toLowerCase()} bookings found.</p>
            </div>
          ) : (
            filteredRequests.map(booking => {
              const modality = (booking.modality || "DOG_WALKING").replace(/_/g, " ");
              return (
                <div key={booking.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("px-2.5 py-0.5 rounded text-xs font-bold uppercase border", getModalityColor(booking.modality))}>
                        {modality}
                      </span>
                      <span className="text-sm font-semibold text-slate-500">Booking #{booking.id}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{booking.status}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                      {new Date(booking.startTime).toLocaleDateString()} - {new Date(booking.endTime).toLocaleDateString()}
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Total Payout: <span className="font-bold text-slate-900">${booking.totalPrice || (booking.totalAmount ? (booking.totalAmount / 100).toFixed(2) : "0.00")}</span> (est.)
                    </p>
                    <button 
                      onClick={() => { setChatBookingId(booking.id); setChatModalOpen(true); }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center gap-1"
                    >
                      <MessageSquare className="w-4 h-4" /> Message Owner
                    </button>
                  </div>

                  {requestTab === "PENDING" && (
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                      <button onClick={() => handleAction(booking.id, 'accept')} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-xs">
                        <CheckCircle className="w-4 h-4" /> Accept
                      </button>
                      <button onClick={() => toast({ title: "Meet & Greet", description: "Request dispatched to pet owner." })} className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-xs">
                        <Calendar className="w-4 h-4" /> Request Meet & Greet
                      </button>
                      <button onClick={() => handleAction(booking.id, 'decline')} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-xs">
                        <XCircle className="w-4 h-4" /> Decline
                      </button>
                    </div>
                  )}

                  {requestTab === "CONFIRMED" && (
                    <div className="flex gap-3">
                      <Link to={`/sitter/visits/${booking.id}`} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-xs">
                        <Play className="w-3.5 h-3.5" /> Execute Visit
                      </Link>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Dynamic Chat History Modal */}
      {(() => {
        const activeBookingForChat = bookings.find((b) => b.id === chatBookingId);
        return (
          <BookingChatModal
            bookingId={chatBookingId}
            isOpen={chatModalOpen}
            onClose={() => setChatModalOpen(false)}
            bookingDetails={{
              ownerName: activeBookingForChat?.ownerName || activeBookingForChat?.ownerEmail || "Pet Owner",
              modality: activeBookingForChat?.modality,
              status: activeBookingForChat?.status,
              totalPrice: activeBookingForChat?.totalPrice,
            }}
          />
        );
      })()}
    </div>
  );
}
