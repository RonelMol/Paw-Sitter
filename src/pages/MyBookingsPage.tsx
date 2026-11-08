import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { useCurrency } from "../lib/CurrencyContext";
import { BookingChatModal } from "../components/BookingChatModal";
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Activity, 
  User, 
  DollarSign, 
  Eye, 
  Receipt, 
  MessageSquare, 
  Search, 
  Sparkles, 
  ChevronRight, 
  Filter, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  CreditCard,
  Banknote,
  PawPrint,
  FileText,
  MapPin
} from "lucide-react";
import { cn } from "../lib/utils";

interface BookingOrder {
  id: number;
  ownerId: number;
  sitterId: number;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  startTime: string;
  endTime: string;
  totalAmount: number;
  totalPrice: string;
  modality: string;
  houseLocationAddress?: string;
  houseLocationDetails?: any;
  intakeQuestionnaire?: any;
  routineApprovalStatus?: string;
  routineApprovedAt?: string;
  routineApprovedBy?: number;
  routineProposalNotes?: string;
  createdAt: string;
  sitter: {
    id: number;
    name: string;
    email: string;
    profile?: any;
  };
  owner: {
    id: number;
    name: string;
    email: string;
  };
  financialSnapshot?: {
    calculatedBaseTotal: number;
    calculatedOwnerFee: number;
    calculatedSitterPayout: number;
    calculatedTotalOwnerCharge: number;
  } | null;
  payment?: {
    isCash: boolean;
    status: string;
  };
  pets?: any[];
  activities?: any[];
  activityStats?: {
    total: number;
    completed: number;
    pending: number;
    progressPercent: number;
  };
}

export function MyBookingsPage() {
  const { user, dbUser } = useAuth();
  const { toast } = useToast();
  const { formatPrice, currencyConfig } = useCurrency();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<BookingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<"ALL" | "ACTIVE" | "COMPLETED" | "CANCELLED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Active Chat Modal State
  const [selectedChatBooking, setSelectedChatBooking] = useState<BookingOrder | null>(null);

  // Detailed Modal View
  const [selectedDetailsBooking, setSelectedDetailsBooking] = useState<BookingOrder | null>(null);

  // Completing booking state
  const [completingId, setCompletingId] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = await user?.getIdToken();
      const res = await fetch("/api/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load your orders");
      }

      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleMarkCompleted = async (bookingId: number) => {
    try {
      setCompletingId(bookingId);
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${bookingId}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to mark booking as finished");
      }

      toast({
        title: "Service Completed!",
        description: "Job marked as completed. Thank you for verifying the care provided.",
        type: "success",
      });

      // Update local state
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "COMPLETED" } : b))
      );
      if (selectedDetailsBooking?.id === bookingId) {
        setSelectedDetailsBooking((prev) => (prev ? { ...prev, status: "COMPLETED" } : null));
      }
    } catch (err: any) {
      toast({ title: "Action Failed", description: err.message, type: "error" });
    } finally {
      setCompletingId(null);
    }
  };

  const handleApproveRoutine = async (bookingId: number) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${bookingId}/routine/owner-approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve routine");
      }

      toast({
        title: "Care Routine Approved! 🎉",
        description: "Your sitter's proposed care schedule is confirmed and approved.",
        type: "success",
      });

      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, routineApprovalStatus: "APPROVED" } : b))
      );
      if (selectedDetailsBooking?.id === bookingId) {
        setSelectedDetailsBooking((prev) => (prev ? { ...prev, routineApprovalStatus: "APPROVED" } : null));
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  };

  // Filtered Bookings
  const filteredBookings = bookings.filter((b) => {
    const isCompleted = b.status === "COMPLETED";
    const isCancelled = b.status === "CANCELLED";
    const isActive = b.status === "CONFIRMED" || b.status === "IN_PROGRESS" || b.status === "PENDING";

    if (filterTab === "ACTIVE" && !isActive) return false;
    if (filterTab === "COMPLETED" && !isCompleted) return false;
    if (filterTab === "CANCELLED" && !isCancelled) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const sitterMatch = b.sitter?.name?.toLowerCase().includes(q) || b.sitter?.email?.toLowerCase().includes(q);
      const idMatch = `#bk-${b.id}`.includes(q) || b.id.toString().includes(q);
      const modalityMatch = b.modality?.toLowerCase().includes(q);
      return sitterMatch || idMatch || modalityMatch;
    }

    return true;
  });

  // Calculate Metrics
  const activeCount = bookings.filter((b) => b.status === "CONFIRMED" || b.status === "IN_PROGRESS" || b.status === "PENDING").length;
  const completedCount = bookings.filter((b) => b.status === "COMPLETED").length;
  const totalSpentPesos = bookings
    .filter((b) => b.status === "COMPLETED" || b.status === "CONFIRMED")
    .reduce((acc, b) => acc + (Number(b.totalPrice) || 0), 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-0.5 rounded-full uppercase tracking-wider">
              {dbUser?.role === "PET_SITTER" ? "Sitter Care Missions" : "Pet Owner Order Management"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            My Bookings & Care Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track current and past pet care sessions, monitor real-time job progress, and inspect billing details in Philippine Pesos (₱).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-600", refreshing && "animate-spin")} />
            Refresh
          </button>
          
          <Link
            to="/search"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <PawPrint className="w-3.5 h-3.5" /> Book New Sitter
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Active & Upcoming</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{activeCount} Orders</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Completed Jobs</span>
            <span className="text-2xl font-black text-blue-600 mt-1 block">{completedCount} Orders</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Billed & Spent</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {formatPrice(totalSpentPesos, "PHP")}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterTab("ALL")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              filterTab === "ALL"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            All Orders ({bookings.length})
          </button>
          <button
            onClick={() => setFilterTab("ACTIVE")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              filterTab === "ACTIVE"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Active & Current ({activeCount})
          </button>
          <button
            onClick={() => setFilterTab("COMPLETED")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              filterTab === "COMPLETED"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Finished Jobs ({completedCount})
          </button>
          <button
            onClick={() => setFilterTab("CANCELLED")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              filterTab === "CANCELLED"
                ? "bg-white text-rose-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Cancelled ({bookings.filter((b) => b.status === "CANCELLED").length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by sitter or #BK-ID..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Main List of Bookings */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="animate-spin w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600 font-medium text-sm">Loading your orders and job activities...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <PawPrint className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Orders Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            {searchQuery
              ? `No bookings match your search query "${searchQuery}".`
              : "You haven't placed any bookings in this category yet. Connect with a verified caregiver today!"}
          </p>
          <Link
            to="/search"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md transition-all"
          >
            <Search className="w-4 h-4" /> Find Caregivers in the Philippines
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((order) => {
            const startD = new Date(order.startTime);
            const endD = new Date(order.endTime);
            const startStr = startD.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const endStr = endD.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const startTimeStr = startD.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            const endTimeStr = endD.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

            const isDone = order.status === "COMPLETED";
            const isCancelled = order.status === "CANCELLED";
            const isActive = order.status === "CONFIRMED" || order.status === "IN_PROGRESS";
            const totalTasks = order.activityStats?.total || (order.activities?.length || 0);
            const completedTasks = order.activityStats?.completed || (order.activities?.filter(a => a.status === "COMPLETED").length || 0);
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return (
              <div
                key={order.id}
                className={cn(
                  "bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md",
                  isActive ? "border-emerald-200 ring-1 ring-emerald-100" : isDone ? "border-slate-200" : "border-slate-200 opacity-80"
                )}
              >
                {/* Top status & ID header */}
                <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-extrabold text-slate-800">
                      Order #BK-{order.id}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      {order.modality?.replace("_", " ") || "Pet Sitting"}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] text-slate-500">
                      Booked {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  {/* Status Pill Badge */}
                  <div className="flex items-center gap-2">
                    {isDone ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Job Finished & Verified
                      </span>
                    ) : isCancelled ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> Cancelled
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        Active / In Progress
                      </span>
                    )}
                  </div>
                </div>

                {/* Sitter Routine Proposal Banner (Awaiting Owner Approval) */}
                {order.routineApprovalStatus === "PENDING_OWNER_APPROVAL" && (
                  <div className="px-6 py-3 bg-amber-50 border-b border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold block text-amber-950">
                          Care Routine Update Proposed by Sitter
                        </span>
                        <span className="text-[11px] text-amber-800 block">
                          "{order.routineProposalNotes || 'Sitter proposed custom care task schedule updates.'}"
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApproveRoutine(order.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve Proposed Routine
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDetailsBooking(order)}
                        className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold"
                      >
                        View Schedule
                      </button>
                    </div>
                  </div>
                )}

                {/* Main Card Body */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Sitter Details (4 cols) */}
                  <div className="lg:col-span-4 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-lg flex items-center justify-center border border-emerald-200 shrink-0">
                      {order.sitter?.name?.charAt(0) || "S"}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-slate-900 text-sm">{order.sitter?.name || "Professional Caregiver"}</h4>
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-xs text-slate-500">{order.sitter?.email}</p>
                      <button
                        type="button"
                        onClick={() => setSelectedChatBooking(order)}
                        className="mt-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Direct Chat with Sitter
                      </button>
                    </div>
                  </div>

                  {/* Schedule & Timing (3 cols) */}
                  <div className="lg:col-span-3 text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" /> {startStr} - {endStr}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> In: {startTimeStr} • Out: {endTimeStr}
                    </div>
                  </div>

                  {/* Real-time Job Progress (2 cols) */}
                  <div className="lg:col-span-2">
                    <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Care Tasks</span>
                      <span className="text-emerald-700">{completedTasks}/{totalTasks || "Direct"}</span>
                    </div>
                    {totalTasks > 0 ? (
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">Customary Care</span>
                    )}
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      {isDone ? "100% Completed" : progress > 0 ? `${progress}% checked off` : "Awaiting check-in"}
                    </span>
                  </div>

                  {/* Financial & Actions (3 cols) */}
                  <div className="lg:col-span-3 flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Total Billed</span>
                      <span className="text-xl font-black text-slate-900 block">
                        {formatPrice(Number(order.totalPrice) || 0, "PHP")}
                      </span>
                      <span className="text-[11px] font-medium text-emerald-700 block">
                        {order.payment?.isCash ? "Cash on Service (₱)" : "Escrow Paid"}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 w-full lg:w-auto">
                      <Link
                        to={`/bookings/${order.id}/live-tracker`}
                        className="flex-1 lg:flex-initial px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Live Tracker
                      </Link>

                      <button
                        type="button"
                        onClick={() => setSelectedDetailsBooking(order)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Receipt className="w-3.5 h-3.5" /> Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comprehensive Order & Billing Details Modal */}
      {selectedDetailsBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between rounded-t-3xl">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Order & Billing Breakdown
                </span>
                <h3 className="text-xl font-bold">Booking #BK-{selectedDetailsBooking.id}</h3>
              </div>
              <button
                onClick={() => setSelectedDetailsBooking(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Sitter & Service Information */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" /> Sitter & Service Details
                </h4>
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedDetailsBooking.sitter?.name}</p>
                    <p className="text-slate-500">{selectedDetailsBooking.sitter?.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-700 block">
                      Service: {selectedDetailsBooking.modality?.replace("_", " ")}
                    </span>
                    <span className="text-emerald-700 font-bold block">
                      Status: {selectedDetailsBooking.status}
                    </span>
                  </div>
                </div>

                {selectedDetailsBooking.houseLocationAddress && (
                  <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-slate-900">Service Location Address:</span>
                      <p className="text-slate-600">{selectedDetailsBooking.houseLocationAddress}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sitter Proposed Routine Action Card (Inside Modal) */}
              {selectedDetailsBooking.routineApprovalStatus === "PENDING_OWNER_APPROVAL" && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-sm text-amber-950">Sitter Proposed Routine Schedule</h4>
                      <p className="text-xs text-amber-800 mt-0.5">
                        "{selectedDetailsBooking.routineProposalNotes || 'Your sitter requested schedule revisions for your review.'}"
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApproveRoutine(selectedDetailsBooking.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Approve Sitter's Proposed Schedule
                    </button>
                  </div>
                </div>
              )}

              {/* Schedule Dates & Times */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">Service Start</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {new Date(selectedDetailsBooking.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="text-emerald-800 mt-0.5">
                    {new Date(selectedDetailsBooking.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">Service End</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {new Date(selectedDetailsBooking.endTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="text-emerald-800 mt-0.5">
                    {new Date(selectedDetailsBooking.endTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              {/* Financial & Billing Breakdown (Philippine Pesos) */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Billing Breakdown ({currencyConfig.name} {currencyConfig.symbol})
                </h4>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Base Sitter Rate</span>
                    <span className="font-semibold text-slate-900">
                      {formatPrice(
                        selectedDetailsBooking.financialSnapshot
                          ? selectedDetailsBooking.financialSnapshot.calculatedBaseTotal / 100
                          : Number(selectedDetailsBooking.totalPrice) || 0,
                        "PHP"
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Platform Safety & Support Fee</span>
                    <span className="font-semibold text-slate-900">
                      {formatPrice(
                        selectedDetailsBooking.financialSnapshot
                          ? selectedDetailsBooking.financialSnapshot.calculatedOwnerFee / 100
                          : 0,
                        "PHP"
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 text-sm font-extrabold text-slate-900 border-t border-slate-200">
                    <span>Total Amount</span>
                    <span className="text-emerald-700">
                      {formatPrice(Number(selectedDetailsBooking.totalPrice) || 0, "PHP")}
                    </span>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-emerald-50 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-700" /> Payment Method:
                  </span>
                  <span className="font-bold">
                    {selectedDetailsBooking.payment?.isCash ? "Cash on Service (Direct Payment)" : "Card Authorized"}
                  </span>
                </div>
              </div>

              {/* Scheduled Care Routine / Activity List */}
              {selectedDetailsBooking.activities && selectedDetailsBooking.activities.length > 0 && (
                <div className="border border-slate-200 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" /> Scheduled Care Routine ({selectedDetailsBooking.activities.length} Tasks)
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedDetailsBooking.activities.map((act) => (
                      <div
                        key={act.id}
                        className={cn(
                          "p-2.5 rounded-xl border text-xs flex items-center justify-between",
                          act.status === "COMPLETED"
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        )}
                      >
                        <div>
                          <p className="font-bold">{act.title}</p>
                          <p className="text-[11px] text-slate-500">
                            {act.scheduledDate} at {act.scheduledTime} • {act.activityType}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            act.status === "COMPLETED"
                              ? "bg-emerald-200 text-emerald-900"
                              : "bg-slate-200 text-slate-700"
                          )}
                        >
                          {act.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Link
                  to={`/bookings/${selectedDetailsBooking.id}/order-summary`}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <FileText className="w-4 h-4" /> Printable Receipt
                </Link>

                <Link
                  to={`/bookings/${selectedDetailsBooking.id}/live-tracker`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-4 h-4" /> Open Live Visit Tracker
                </Link>

                {selectedDetailsBooking.status === "CONFIRMED" && (
                  <button
                    type="button"
                    onClick={() => handleMarkCompleted(selectedDetailsBooking.id)}
                    disabled={completingId === selectedDetailsBooking.id}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {completingId === selectedDetailsBooking.id ? "Verifying..." : "Approve & Mark Job Done"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct Chat Modal */}
      {selectedChatBooking && (
        <BookingChatModal
          isOpen={true}
          onClose={() => setSelectedChatBooking(null)}
          bookingId={selectedChatBooking.id}
          partnerName={selectedChatBooking.sitter?.name || "Sitter"}
        />
      )}
    </div>
  );
}
