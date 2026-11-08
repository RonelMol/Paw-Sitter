import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { useCurrency } from "../lib/CurrencyContext";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Lock,
  Plus,
  Trash2,
  User,
  CreditCard,
  Building2,
  Phone,
  Eye,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Play,
  MessageSquare,
  Camera,
  Wallet,
  Tag
} from "lucide-react";
import { SitterProfileEditor } from "../components/SitterProfileEditor";
import { SitterInboxView } from "../components/SitterInboxView";
import { SitterDisbursementEditor } from "../components/SitterDisbursementEditor";
import { SitterMonthlyPayoutsView } from "../components/SitterMonthlyPayoutsView";
import { SitterAppKycModule } from "../components/SitterAppKycModule";
import { SitterRatesPage } from "./SitterRatesPage";
import { SitterBookingReviewModal } from "../components/SitterBookingReviewModal";

const PHILIPPINE_BANKS = [
  "BDO Unibank",
  "BPI (Bank of the Philippine Islands)",
  "Metrobank",
  "UnionBank of the Philippines",
  "GCash (G-Xchange Inc)",
  "Maya (PayMaya Philippines)",
  "Landbank of the Philippines",
  "Security Bank",
  "RCBC (Rizal Commercial Banking Corp)",
  "Philippine National Bank (PNB)",
  "Chinabank",
];

const PHILIPPINE_IDS = [
  "PhilSys National ID (Philsys)",
  "UMID (Unified Multi-Purpose ID)",
  "Driver's License (LTO)",
  "Philippine Passport (DFA)",
  "Postal ID (PhilPost)",
  "SSS ID / PhilHealth ID",
  "PRC Professional License",
];

export type SitterTabType = "PAYOUTS" | "BOOKINGS" | "RATES" | "INBOX" | "PROFILE" | "DISBURSEMENT" | "KYC" | "SCHEDULE";

interface SitterLandingPageProps {
  defaultTab?: SitterTabType;
}

export function SitterLandingPage({ defaultTab }: SitterLandingPageProps = {}) {
  const { user, dbUser } = useAuth();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tabFromQuery = searchParams.get("tab")?.toUpperCase() as SitterTabType | null;
  const initialTab: SitterTabType = defaultTab || (tabFromQuery && ["PAYOUTS", "BOOKINGS", "RATES", "INBOX", "PROFILE", "DISBURSEMENT", "KYC", "SCHEDULE"].includes(tabFromQuery) ? tabFromQuery : "BOOKINGS");

  const [activeTab, setActiveTab] = useState<SitterTabType>(initialTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    } else if (tabFromQuery && ["PAYOUTS", "BOOKINGS", "RATES", "INBOX", "PROFILE", "DISBURSEMENT", "KYC", "SCHEDULE"].includes(tabFromQuery)) {
      setActiveTab(tabFromQuery);
    }
  }, [defaultTab, tabFromQuery]);
  const [bookingFilter, setBookingFilter] = useState<"ALL" | "PENDING" | "CONFIRMED" | "COMPLETED">("ALL");

  // Bookings state
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [reviewBooking, setReviewBooking] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // KYC state
  const [kycData, setKycData] = useState<any | null>(null);
  const [isKycLocked, setIsKycLocked] = useState(false);
  const [loadingKyc, setLoadingKyc] = useState(true);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [kycForm, setKycForm] = useState({
    legalFirstName: "",
    legalLastName: "",
    mobileNumber: "",
    city: "Metro Manila",
    province: "NCR",
    idType: PHILIPPINE_IDS[0],
    idNumber: "",
    idFrontUrl: "",
    idBackUrl: "",
    idSelfieUrl: "",
    bankName: PHILIPPINE_BANKS[0],
    bankAccountName: "",
    bankAccountNumber: "",
  });

  // Schedule & Blockouts state
  const [blockouts, setBlockouts] = useState<any[]>([]);
  const [newBlockoutStart, setNewBlockoutStart] = useState("");
  const [newBlockoutEnd, setNewBlockoutEnd] = useState("");
  const [savingBlockouts, setSavingBlockouts] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadBookings();
    loadKyc();
    loadSitterProfile();
  }, [user]);

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Filter bookings where current user is the sitter
        const sitterBookings = data.filter((b: any) => b.sitterId === dbUser?.id || !b.userId || b.sitterId);
        setBookings(sitterBookings.length > 0 ? sitterBookings : data);
      }
    } catch (err) {
      console.error("Error loading bookings:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const loadKyc = async () => {
    setLoadingKyc(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/sitter-verifications/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.verification) {
          setKycData(data.verification);
          setIsKycLocked(Boolean(data.isLocked));
          setKycForm({
            legalFirstName: data.verification.legalFirstName || "",
            legalLastName: data.verification.legalLastName || "",
            mobileNumber: data.verification.mobileNumber || "",
            city: data.verification.city || "Metro Manila",
            province: data.verification.province || "NCR",
            idType: data.verification.idType || PHILIPPINE_IDS[0],
            idNumber: data.verification.idNumber || "",
            idFrontUrl: data.verification.idFrontUrl || "",
            idBackUrl: data.verification.idBackUrl || "",
            idSelfieUrl: data.verification.idSelfieUrl || "",
            bankName: data.verification.bankName || PHILIPPINE_BANKS[0],
            bankAccountName: data.verification.bankAccountName || "",
            bankAccountNumber: data.verification.bankAccountNumber || "",
          });
        }
      }
    } catch (err) {
      console.error("Error loading KYC:", err);
    } finally {
      setLoadingKyc(false);
    }
  };

  const loadSitterProfile = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/sitters/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.blockouts) {
          setBlockouts(data.blockouts);
        }
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  };

  // Sitter Booking Action: Accept & Confirm or Decline
  const handleBookingStatusChange = async (bookingId: number, status: "CONFIRMED" | "CANCELLED") => {
    setActionLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast({
          title: status === "CONFIRMED" ? "Booking Confirmed!" : "Booking Declined",
          description:
            status === "CONFIRMED"
              ? "The booking is confirmed. The pet owner has been sent an automated notification."
              : "The booking has been declined.",
          type: status === "CONFIRMED" ? "success" : "info",
        });
        setReviewBooking(null);
        loadBookings();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "Update Failed",
          description: err.error || "Could not update booking status",
          type: "error",
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Sitter KYC Form Submit
  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isKycLocked) {
      toast({
        title: "Account Locked",
        description: "Your disbursement and KYC details are verified and locked to prevent unauthorized tampering.",
        type: "info",
      });
      return;
    }
    setSubmittingKyc(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/sitter-verifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(kycForm),
      });

      if (res.ok) {
        toast({
          title: "KYC Documents Submitted!",
          description: "Your government ID and disbursement account are submitted for Admin review. Verification is typically completed within 24 hours.",
          type: "success",
        });
        loadKyc();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "Submission Failed",
          description: err.error || "Failed to submit KYC",
          type: "error",
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setSubmittingKyc(false);
    }
  };

  // Sitter Schedule / Blockouts Submit
  const handleAddBlockout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockoutStart || !newBlockoutEnd) {
      toast({ title: "Invalid Dates", description: "Please specify both start and end dates.", type: "error" });
      return;
    }
    if (new Date(newBlockoutStart) > new Date(newBlockoutEnd)) {
      toast({ title: "Invalid Range", description: "Start date must be before or equal to end date.", type: "error" });
      return;
    }

    const updatedList = [
      ...blockouts.map((b) => ({ startDate: b.startDate, endDate: b.endDate })),
      { startDate: newBlockoutStart, endDate: newBlockoutEnd },
    ];

    setSavingBlockouts(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/sitters/me/blockouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ blockouts: updatedList }),
      });

      if (res.ok) {
        toast({
          title: "Schedule Updated",
          description: `Blocked out dates from ${newBlockoutStart} to ${newBlockoutEnd}. Pet owners cannot book you during this period.`,
          type: "success",
        });
        setNewBlockoutStart("");
        setNewBlockoutEnd("");
        loadSitterProfile();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Update Failed", description: err.error || "Failed to save blockouts", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setSavingBlockouts(false);
    }
  };

  const handleRemoveBlockout = async (index: number) => {
    const updatedList = blockouts
      .filter((_, i) => i !== index)
      .map((b) => ({ startDate: b.startDate, endDate: b.endDate }));

    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/sitters/me/blockouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ blockouts: updatedList }),
      });
      if (res.ok) {
        toast({ title: "Blockout Removed", description: "Dates are now available for client booking.", type: "info" });
        loadSitterProfile();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  };

  const pendingBookings = bookings.filter((b) => b.status === "PENDING");
  const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED" || b.status === "IN_PROGRESS");
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED");
  const totalEarnings = confirmedBookings.concat(completedBookings).reduce(
    (acc, curr) => acc + (parseFloat(curr.totalPrice) || (curr.totalAmount ? curr.totalAmount / 100 : 0)),
    0
  );

  const displayedBookings = bookings.filter((b) => {
    if (bookingFilter === "PENDING") return b.status === "PENDING";
    if (bookingFilter === "CONFIRMED") return b.status === "CONFIRMED" || b.status === "IN_PROGRESS";
    if (bookingFilter === "COMPLETED") return b.status === "COMPLETED";
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      {/* Sitter Hero Landing Card */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Official Pet Sitter Portal
              </span>
              {kycData?.status === "APPROVED" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  KYC Verified Caregiver
                </span>
              ) : kycData?.status === "PENDING" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  KYC Pending Admin Review
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  KYC Verification Required
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Welcome, {dbUser?.name || user?.displayName || "Caregiver"}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
              Manage your client booking requests, review job specifications before confirmation, maintain your availability schedule, and manage your verified disbursement account.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 backdrop-blur-xs">
            <div className="text-center px-2">
              <div className="text-xl font-black text-amber-400">{pendingBookings.length}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Pending Review</div>
            </div>
            <div className="text-center px-2 border-x border-slate-700">
              <div className="text-xl font-black text-emerald-400">{confirmedBookings.length}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Active Jobs</div>
            </div>
            <div className="text-center px-2">
              <div className="text-xl font-black text-white">{formatPrice(totalEarnings)}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Earnings</div>
            </div>
          </div>
        </div>
      </div>

      {/* KYC Alert Notification Banner */}
      {kycData?.status === "PENDING" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 shadow-xs">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <p className="font-bold text-sm text-amber-950">KYC Verification In Progress</p>
            <p className="mt-0.5">
              Your government ID document ({kycData.idType}) and disbursement details for <strong>{kycData.bankName}</strong> are currently under Admin review. To safeguard your account, disbursement information is locked from editing.
            </p>
          </div>
        </div>
      )}

      {kycData?.status === "APPROVED" && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900">
            <p className="font-bold text-sm text-emerald-950">Identity Verified & Payout Account Locked</p>
            <p className="mt-0.5">
              Your account has been fully verified by Platform Administration. Direct payout disbursements will be deposited to <strong>{kycData.bankName} ({kycData.bankAccountNumber?.slice(-4) ? `•••• ${kycData.bankAccountNumber.slice(-4)}` : "Verified"})</strong>.
            </p>
          </div>
        </div>
      )}

      {(!kycData || kycData.status === "REJECTED") && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3 text-xs text-rose-900">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-rose-950">
                {kycData?.status === "REJECTED" ? "KYC Verification Rejected" : "Complete KYC to Unlock Sitter Disbursements"}
              </p>
              <p className="mt-0.5">
                {kycData?.adminNotes
                  ? `Reason: "${kycData.adminNotes}". Please update and re-submit your ID documents.`
                  : "Submit a valid Philippine government-issued ID and bank/e-wallet account for automated earnings disbursement."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("KYC")}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs"
          >
            Submit KYC Now
          </button>
        </div>
      )}

      {/* Modern Vertical & Responsive Sitter Workspace Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left Vertical Navigation Sidebar */}
        <aside className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-3 shadow-xs space-y-1">
            <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Sitter Modules
            </div>

            <button
              onClick={() => setActiveTab("PAYOUTS")}
              className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                activeTab === "PAYOUTS"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wallet className={`w-4 h-4 ${activeTab === "PAYOUTS" ? "text-emerald-400" : "text-emerald-600"}`} />
                <span>Monthly Payouts</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === "PAYOUTS" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30" : "bg-emerald-50 text-emerald-700"
              }`}>
                Escrow Ledger
              </span>
            </button>

            <button
              onClick={() => setActiveTab("BOOKINGS")}
              className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                activeTab === "BOOKINGS"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className={`w-4 h-4 ${activeTab === "BOOKINGS" ? "text-purple-400" : "text-purple-600"}`} />
                <span>Bookings & Jobs</span>
              </div>
              {pendingBookings.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                  {pendingBookings.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("RATES")}
              className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                activeTab === "RATES"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Tag className={`w-4 h-4 ${activeTab === "RATES" ? "text-teal-400" : "text-teal-600"}`} />
                <span>Services &amp; Rates</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                activeTab === "RATES" ? "bg-teal-500/20 text-teal-300 border border-teal-400/30" : "bg-teal-50 text-teal-700"
              }`}>
                Pricing
              </span>
            </button>

            <button
              onClick={() => setActiveTab("INBOX")}
              className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                activeTab === "INBOX"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className={`w-4 h-4 ${activeTab === "INBOX" ? "text-blue-400" : "text-blue-600"}`} />
                <span>Messages & Inbox</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("PROFILE")}
              className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                activeTab === "PROFILE"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Camera className={`w-4 h-4 ${activeTab === "PROFILE" ? "text-emerald-400" : "text-slate-500"}`} />
                <span>Profile & Picture</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("DISBURSEMENT")}
              className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                activeTab === "DISBURSEMENT"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className={`w-4 h-4 ${activeTab === "DISBURSEMENT" ? "text-teal-400" : "text-teal-600"}`} />
                <span>Payout Account</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Banks/GCash</span>
            </button>

            <button
              onClick={() => setActiveTab("KYC")}
              className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                activeTab === "KYC"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileCheck2 className={`w-4 h-4 ${activeTab === "KYC" ? "text-indigo-400" : "text-indigo-600"}`} />
                <span>App KYC Verification</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                kycData?.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
              }`}>
                {kycData?.status || "PENDING"}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("SCHEDULE")}
              className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between ${
                activeTab === "SCHEDULE"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className={`w-4 h-4 ${activeTab === "SCHEDULE" ? "text-amber-400" : "text-amber-600"}`} />
                <span>Availability Calendar</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">{blockouts.length} Blocked</span>
            </button>
          </div>

          {/* Sitter Profile Quick Card */}
          <div className="hidden lg:block bg-slate-900 text-white rounded-3xl p-5 shadow-xs border border-slate-800">
            <div className="flex items-center gap-3">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-xl object-cover border border-white/20" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                  {(user?.displayName?.[0] || "S").toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{user?.displayName || "Caregiver"}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Escrow Security:</span>
              <span className="font-semibold text-emerald-400">Guaranteed</span>
            </div>
            {dbUser?.id && (
              <Link
                to={`/sitters/${dbUser.id}`}
                className="mt-3 block text-center py-2 px-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold text-slate-200 transition-colors"
              >
                View Public Profile Page
              </Link>
            )}
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="flex-1 min-w-0 w-full space-y-4">
          {/* TAB 0: MONTHLY PAYOUTS & EXPECTED PAYOUTS */}
          {activeTab === "PAYOUTS" && (
            <SitterMonthlyPayoutsView onNavigateToDisbursement={() => setActiveTab("DISBURSEMENT")} />
          )}

          {/* TAB 1: MANAGE BOOKINGS & REVIEW */}
      {activeTab === "BOOKINGS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
              <button
                onClick={() => setBookingFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  bookingFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Bookings ({bookings.length})
              </button>
              <button
                onClick={() => setBookingFilter("PENDING")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  bookingFilter === "PENDING"
                    ? "bg-white text-amber-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Needs Review ({pendingBookings.length})
              </button>
              <button
                onClick={() => setBookingFilter("CONFIRMED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  bookingFilter === "CONFIRMED"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Confirmed & Active ({confirmedBookings.length})
              </button>
              <button
                onClick={() => setBookingFilter("COMPLETED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  bookingFilter === "COMPLETED"
                    ? "bg-white text-blue-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Finished Jobs ({completedBookings.length})
              </button>
            </div>

            <button
              onClick={loadBookings}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors flex items-center gap-1 text-xs font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {loadingBookings ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading your bookings...
            </div>
          ) : displayedBookings.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Bookings in this view</h3>
              <p className="text-xs text-slate-400 mt-1">
                {bookingFilter === "PENDING"
                  ? "You have no pending requests awaiting review."
                  : "No bookings recorded yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {displayedBookings.map((b) => {
                const isPending = b.status === "PENDING";
                const isConfirmed = b.status === "CONFIRMED" || b.status === "IN_PROGRESS";

                return (
                  <div
                    key={b.id}
                    className={`bg-white rounded-2xl p-5 border transition-all shadow-xs ${
                      isPending ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-500">Booking #{b.id}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              b.status === "CONFIRMED"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : b.status === "PENDING"
                                ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                                : b.status === "IN_PROGRESS"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {b.status}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {b.modality || "Pet Care"}
                          </span>
                        </div>

                        <div className="text-sm font-bold text-slate-900">
                          {b.petName ? `Pet: ${b.petName}` : "Pet Care Appointment"} • Owner: {b.ownerName || b.userEmail || "Client"}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {b.startTime ? new Date(b.startTime).toLocaleString() : "TBD"} –{" "}
                            {b.endTime ? new Date(b.endTime).toLocaleTimeString() : "TBD"}
                          </span>
                          <span className="flex items-center gap-1 font-bold text-slate-800">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            Total: {formatPrice(parseFloat(b.totalPrice) || (b.totalAmount ? b.totalAmount / 100 : 0))}
                          </span>
                        </div>

                        {b.notes && (
                          <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-xl">
                            Special Instructions: "{b.notes}"
                          </p>
                        )}
                      </div>

                      {/* Review & Decision Actions */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => setReviewBooking(b)}
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Review Booking First
                            </button>
                            <button
                              onClick={() => handleBookingStatusChange(b.id, "CONFIRMED")}
                              disabled={actionLoading}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                              title="Accept and confirm booking"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Accept & Confirm
                            </button>
                            <button
                              onClick={() => handleBookingStatusChange(b.id, "CANCELLED")}
                              disabled={actionLoading}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                              title="Decline this request"
                            >
                              <X className="w-3.5 h-3.5" />
                              Decline
                            </button>
                          </>
                        ) : isConfirmed ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setReviewBooking(b)}
                              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Review Details & Routine
                            </button>
                            <Link
                              to={`/sitter/visits/${b.id}`}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Live GPS Visit
                            </Link>
                            <Link
                              to={`/bookings/${b.id}/live-tracker`}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Tracker
                            </Link>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setReviewBooking(b)}
                              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Job Specs & Routine
                            </button>
                            <Link
                              to={`/bookings/${b.id}/live-tracker`}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Live Tracker
                            </Link>
                            <Link
                              to={`/bookings/${b.id}/order-summary`}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                              <Tag className="w-3.5 h-3.5" />
                              Summary
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: SERVICES & RATES GOVERNANCE */}
      {activeTab === "RATES" && (
        <SitterRatesPage embedded={true} />
      )}

      {/* TAB 2: SCHEDULE & AVAILABILITY (BLOCKOUTS) */}
      {activeTab === "SCHEDULE" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Add Blockout Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Make Schedule / Block Dates</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set dates when you are off-duty, traveling, or unavailable. Pet owners will be prevented from booking you during blocked periods.
              </p>
            </div>

            <form onSubmit={handleAddBlockout} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Start Date *
                </label>
                <input
                  required
                  type="date"
                  value={newBlockoutStart}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setNewBlockoutStart(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  End Date *
                </label>
                <input
                  required
                  type="date"
                  value={newBlockoutEnd}
                  min={newBlockoutStart || new Date().toISOString().split("T")[0]}
                  onChange={(e) => setNewBlockoutEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                💡 When dates are blocked out, client booking attempts for those dates will immediately return an unavailability notice.
              </div>

              <button
                type="submit"
                disabled={savingBlockouts}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {savingBlockouts ? "Saving..." : "Add Blockout to Schedule"}
              </button>
            </form>
          </div>

          {/* Existing Blockouts List */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">Current Blocked Out Periods</h2>
                <p className="text-xs text-slate-500">Dates you have marked as unavailable for appointments.</p>
              </div>
              <span className="text-xs font-bold text-slate-500">{blockouts.length} active periods</span>
            </div>

            {blockouts.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No Blocked Out Dates</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You are currently marked available on all upcoming calendar dates.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {blockouts.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                        OFF
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {b.startDate} to {b.endDate}
                        </div>
                        <div className="text-[11px] text-slate-500">Unavailable for client bookings</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveBlockout(idx)}
                      className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors"
                      title="Remove blockout and become available"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: APP KYC VERIFICATION MODULE */}
      {activeTab === "KYC" && (
        <div className="space-y-4">
          <SitterAppKycModule />
        </div>
      )}

      {/* TAB 4: MESSAGES & INBOX */}
      {activeTab === "INBOX" && (
        <div className="space-y-4">
          <SitterInboxView />
        </div>
      )}

      {/* TAB 5: PROFILE & PICTURE */}
      {activeTab === "PROFILE" && (
        <div className="space-y-4">
          <SitterProfileEditor showNavigationShortcuts={false} onSaved={loadSitterProfile} />
        </div>
      )}

      {/* TAB 6: PAYOUT DISBURSEMENT ACCOUNT (PHILIPPINE BANKS / E-WALLETS) */}
      {activeTab === "DISBURSEMENT" && (
        <div className="space-y-4">
          <SitterDisbursementEditor />
        </div>
      )}
        </main>
      </div>

      {/* Sitter Review Booking First Modal */}
      {reviewBooking && (
        <SitterBookingReviewModal
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onStatusChange={handleBookingStatusChange}
          onBookingUpdated={() => loadBookings()}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}
