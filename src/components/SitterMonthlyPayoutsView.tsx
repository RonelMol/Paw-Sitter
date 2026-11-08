import React, { useState, useEffect } from "react";
import {
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  DollarSign,
  TrendingUp,
  Download,
  Info,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Eye,
  Filter
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { useCurrency } from "../lib/CurrencyContext";
import { useAuth } from "../lib/AuthContext";

interface PayoutRecord {
  bookingId: number;
  status: string;
  payoutStatus: "PAID_OUT" | "HELD_IN_ESCROW" | "EXPECTED_CONFIRMED" | "PENDING_ACCEPTANCE" | "DISPUTED" | "CANCELLED";
  modality: string;
  startTime: string;
  endTime: string;
  monthKey: string;
  grossCents: number;
  commissionCents: number;
  tipCents: number;
  netPayoutCents: number;
  grossPhp: string;
  commissionPhp: string;
  tipPhp: string;
  netPayoutPhp: string;
  owner: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  disbursement: {
    referenceNumber: string;
    payoutChannel: string;
    bankName: string;
    accountNumber: string;
    disbursedAt: string;
    adminNotes: string;
  } | null;
  releaseDate: string | null;
}

interface MonthlySummary {
  monthKey: string;
  monthLabel: string;
  paidOutCents: number;
  expectedCents: number;
  paidOutPhp: string;
  expectedPhp: string;
  totalProjectedCents: number;
  totalProjectedPhp: string;
  completedJobsCount: number;
  upcomingJobsCount: number;
}

interface PayoutsSummaryData {
  currentYearMonth: string;
  currentMonthLabel: string;
  thisMonthPaidOutCents: number;
  thisMonthPaidOutPhp: string;
  thisMonthExpectedCents: number;
  thisMonthExpectedPhp: string;
  pendingEscrowCents: number;
  pendingEscrowPhp: string;
  lifetimeEarningsCents: number;
  lifetimeEarningsPhp: string;
  disbursementAccount: {
    bankName: string;
    bankAccountName: string;
    bankAccountNumber: string;
    status: string;
    isVerified: boolean;
  } | null;
  monthlyBreakdown: MonthlySummary[];
  records: PayoutRecord[];
}

interface SitterMonthlyPayoutsViewProps {
  onNavigateToDisbursement?: () => void;
}

export const SitterMonthlyPayoutsView: React.FC<SitterMonthlyPayoutsViewProps> = ({
  onNavigateToDisbursement
}) => {
  const { user, loading: authLoading } = useAuth();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PayoutsSummaryData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [inspectBooking, setInspectBooking] = useState<PayoutRecord | null>(null);

  const fetchPayouts = async () => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = (await user?.getIdToken?.().catch(() => null)) || localStorage.getItem("pawshield_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/sitters/me/payouts-summary", { headers });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.cause || errorData?.error || "Failed to load your payout summary.");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error("Payouts load error:", err);
      setError(err.message || "Error loading payout data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchPayouts();
    }
  }, [user, authLoading]);

  const formatModality = (m: string) => {
    switch (m) {
      case "DOG_WALKING":
        return "Dog Walking";
      case "HOUSE_SITTING":
        return "House Sitting";
      case "BOARDING":
        return "Pet Boarding";
      case "DROP_IN":
        return "Drop-In Visit";
      default:
        return m.replace(/_/g, " ");
    }
  };

  const getStatusBadge = (status: PayoutRecord["payoutStatus"]) => {
    switch (status) {
      case "PAID_OUT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Paid Out
          </span>
        );
      case "HELD_IN_ESCROW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Held in Escrow
          </span>
        );
      case "EXPECTED_CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Expected (Upcoming)
          </span>
        );
      case "DISPUTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Disputed / Frozen
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            Pending
          </span>
        );
    }
  };

  if (!user && !authLoading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-xs space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
          <Wallet className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Sign In to View Caregiver Payouts</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Please sign in to your caregiver account to view your monthly earnings ledger, expected payout forecasts, and escrow status.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <p className="text-slate-600 font-medium">Calculating your monthly earnings and expected payouts...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="font-medium">{error || "Unable to load payouts."}</p>
        </div>
        <button
          onClick={fetchPayouts}
          className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const filteredRecords = data.records.filter((rec) => {
    if (selectedMonth !== "ALL" && rec.monthKey !== selectedMonth) {
      return false;
    }
    if (statusFilter !== "ALL") {
      if (statusFilter === "PAID_OUT" && rec.payoutStatus !== "PAID_OUT") return false;
      if (statusFilter === "EXPECTED" && rec.payoutStatus !== "HELD_IN_ESCROW" && rec.payoutStatus !== "EXPECTED_CONFIRMED") return false;
      if (statusFilter === "DISPUTED" && rec.payoutStatus !== "DISPUTED") return false;
    }
    return true;
  });

  // Calculate selected month stats
  const activeMonthStats = selectedMonth === "ALL"
    ? {
        label: "All Time Overview",
        paidOutPhp: data.lifetimeEarningsPhp,
        expectedPhp: data.thisMonthExpectedPhp,
      }
    : data.monthlyBreakdown.find((m) => m.monthKey === selectedMonth) || {
        label: selectedMonth,
        paidOutPhp: "0.00",
        expectedPhp: "0.00",
      };

  // Prepare chart data
  const chartData = data.monthlyBreakdown.map((m) => ({
    name: m.monthLabel.split(" ")[0], // e.g. "Sep"
    fullLabel: m.monthLabel,
    "Paid Out": parseFloat(m.paidOutPhp),
    "Expected Payout": parseFloat(m.expectedPhp),
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner / Headline */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 lg:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-3">
              <ShieldCheck className="w-4 h-4" />
              PawShield Guaranteed Escrow Protection
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
              Sitter Earnings & Payout Ledger
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Track your paid-out disbursements and expected payouts for every month. Funds are held safely in escrow during pet care and released straight to your Philippine bank or e-wallet upon completion.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchPayouts}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/10"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            {onNavigateToDisbursement && (
              <button
                onClick={onNavigateToDisbursement}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold transition-colors shadow-sm"
              >
                <Building2 className="w-4 h-4" />
                Payout Account
              </button>
            )}
          </div>
        </div>

        {/* Highlight Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
              Paid Out This Month ({data.currentMonthLabel.split(" ")[0]})
            </span>
            <div className="text-2xl lg:text-3xl font-extrabold text-emerald-400">
              {formatPrice(parseFloat(data.thisMonthPaidOutPhp))}
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-300/80 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Disbursed to your account
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
              Expected To Pay Out
            </span>
            <div className="text-2xl lg:text-3xl font-extrabold text-amber-400">
              {formatPrice(parseFloat(data.thisMonthExpectedPhp))}
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-300/80 mt-1">
              <Clock className="w-3.5 h-3.5" />
              In escrow & confirmed upcoming
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
              Pending in Escrow
            </span>
            <div className="text-2xl lg:text-3xl font-extrabold text-blue-300">
              {formatPrice(parseFloat(data.pendingEscrowPhp))}
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-200/80 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Clearing 24h review window
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
              All-Time Lifetime Earnings
            </span>
            <div className="text-2xl lg:text-3xl font-extrabold text-white">
              {formatPrice(parseFloat(data.lifetimeEarningsPhp))}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-300/80 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Cumulative payouts released
            </div>
          </div>
        </div>
      </div>

      {/* Disbursement Account Indicator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm">Disbursement Destination:</span>
              {data.disbursementAccount ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  {data.disbursementAccount.isVerified ? "Verified Account" : "Registered"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  <AlertCircle className="w-3 h-3" />
                  Account Needed
                </span>
              )}
            </div>
            {data.disbursementAccount ? (
              <p className="text-sm text-slate-600 mt-0.5">
                <strong className="text-slate-900">{data.disbursementAccount.bankName}</strong> • {data.disbursementAccount.bankAccountName} • Acc:{" "}
                <span className="font-mono text-slate-700">{data.disbursementAccount.bankAccountNumber}</span>
              </p>
            ) : (
              <p className="text-sm text-amber-700 mt-0.5">
                Please configure your Philippine bank (BDO, BPI, UnionBank) or E-Wallet (GCash, Maya) to receive your payouts.
              </p>
            )}
          </div>
        </div>

        {onNavigateToDisbursement && (
          <button
            onClick={onNavigateToDisbursement}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors shrink-0"
          >
            {data.disbursementAccount ? "Manage Account" : "Setup Payout Account"}
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Monthly Chart and Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Monthly Earnings & Projections</h3>
              <p className="text-xs text-slate-500">Comparing paid-out earnings with expected payouts by month</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Paid Out
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                Expected Payout
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => `₱${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(val: any) => [formatPrice(Number(val)), ""]}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px"
                  }}
                />
                <Bar dataKey="Paid Out" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="Expected Payout" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Monthly Selector & Payout Rules */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Select Month Filter</h3>
            <p className="text-xs text-slate-500 mb-4">Focus ledger and metrics on a specific service month:</p>

            <div className="space-y-2">
              <button
                onClick={() => setSelectedMonth("ALL")}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between border ${
                  selectedMonth === "ALL"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                }`}
              >
                <span>All Months (Complete History)</span>
                <span className="text-xs font-semibold opacity-90">{data.records.length} jobs</span>
              </button>

              {data.monthlyBreakdown.map((m) => {
                const isSelected = selectedMonth === m.monthKey;
                return (
                  <button
                    key={m.monthKey}
                    onClick={() => setSelectedMonth(m.monthKey)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between border ${
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <span>{m.monthLabel}</span>
                    <span className="text-xs font-semibold">
                      {formatPrice(parseFloat(m.totalProjectedPhp))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-start gap-2.5 text-xs text-slate-600">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">How Escrow Payouts Work:</strong>
                <p className="mt-0.5 text-slate-500">
                  Pet parents are charged upfront upon booking. Your net 80% payout + 100% of owner tips clear into your disbursement account 24 hours after service check-out.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Ledger Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Payout Ledger: {selectedMonth === "ALL" ? "All Time" : (data.monthlyBreakdown.find(m => m.monthKey === selectedMonth)?.monthLabel || selectedMonth)}
            </h3>
            <p className="text-xs text-slate-500">
              Showing {filteredRecords.length} pet care bookings with calculated payouts
            </p>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {(["ALL", "PAID_OUT", "EXPECTED", "DISPUTED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {st === "ALL" && "All Statuses"}
                {st === "PAID_OUT" && "Paid Out"}
                {st === "EXPECTED" && "Expected / In Escrow"}
                {st === "DISPUTED" && "Disputed"}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-medium text-slate-700">No bookings match the selected filters.</p>
            <p className="text-xs text-slate-500 mt-1">Try choosing another month or resetting your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Booking & Service</th>
                  <th className="py-3.5 px-4">Service Dates</th>
                  <th className="py-3.5 px-4">Pet Parent</th>
                  <th className="py-3.5 px-4">Gross Charge</th>
                  <th className="py-3.5 px-4">Platform Fee (20%)</th>
                  <th className="py-3.5 px-4">Your Net Payout</th>
                  <th className="py-3.5 px-4">Payout Status</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRecords.map((rec) => {
                  const startDate = new Date(rec.startTime).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
                  const endDate = new Date(rec.endTime).toLocaleDateString([], { month: "short", day: "numeric" });

                  return (
                    <tr key={rec.bookingId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-500">#{rec.bookingId}</span>
                          <span className="font-semibold text-slate-900">{formatModality(rec.modality)}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-600">
                        {startDate} - {endDate}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-900 text-xs">{rec.owner.name}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{rec.owner.email}</div>
                      </td>

                      <td className="py-4 px-4 font-mono text-xs text-slate-600">
                        {formatPrice(parseFloat(rec.grossPhp))}
                      </td>

                      <td className="py-4 px-4 font-mono text-xs text-slate-500">
                        -{formatPrice(parseFloat(rec.commissionPhp))}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 text-sm font-mono">
                          {formatPrice(parseFloat(rec.netPayoutPhp))}
                        </div>
                        {rec.tipCents > 0 && (
                          <div className="text-[11px] text-emerald-600 font-medium">
                            +{formatPrice(parseFloat(rec.tipPhp))} tip included
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {getStatusBadge(rec.payoutStatus)}
                        {rec.disbursement && (
                          <div className="text-[11px] text-slate-500 mt-1 font-mono">
                            Ref: {rec.disbursement.referenceNumber}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => setInspectBooking(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
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

      {/* Inspect Modal */}
      {inspectBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Booking #{inspectBooking.bookingId} Financial Breakdown
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {formatModality(inspectBooking.modality)} Payout Statement
                </h3>
              </div>
              <button
                onClick={() => setInspectBooking(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Client / Pet Parent</span>
                <span className="font-semibold text-slate-900">{inspectBooking.owner.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Service Dates</span>
                <span className="font-medium text-slate-800">
                  {new Date(inspectBooking.startTime).toLocaleDateString()} to {new Date(inspectBooking.endTime).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Gross Booking Charge</span>
                <span className="font-mono font-medium text-slate-800">{formatPrice(parseFloat(inspectBooking.grossPhp))}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Platform Sitter Commission (20%)</span>
                <span className="font-mono text-rose-600 font-medium">-{formatPrice(parseFloat(inspectBooking.commissionPhp))}</span>
              </div>
              {inspectBooking.tipCents > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">100% Owner Tip (No fee)</span>
                  <span className="font-mono text-emerald-600 font-semibold">+{formatPrice(parseFloat(inspectBooking.tipPhp))}</span>
                </div>
              )}
              <div className="flex justify-between py-2 bg-emerald-50/80 px-3 rounded-xl border border-emerald-100">
                <span className="font-bold text-emerald-900">Your Net Disbursed Payout</span>
                <span className="font-mono font-extrabold text-emerald-700 text-base">
                  {formatPrice(parseFloat(inspectBooking.netPayoutPhp))}
                </span>
              </div>

              {/* Disbursement Details if released */}
              {inspectBooking.disbursement && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-700 mt-3">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Disbursement Information
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Channel / Provider:</span>
                    <span className="font-medium">{inspectBooking.disbursement.payoutChannel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference Number:</span>
                    <span className="font-mono font-bold text-slate-900">{inspectBooking.disbursement.referenceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destination Account:</span>
                    <span className="font-mono">{inspectBooking.disbursement.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Processed On:</span>
                    <span>{new Date(inspectBooking.disbursement.disbursedAt).toLocaleString()}</span>
                  </div>
                  {inspectBooking.disbursement.adminNotes && (
                    <div className="pt-1.5 border-t border-slate-200 text-slate-600 italic">
                      "{inspectBooking.disbursement.adminNotes}"
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setInspectBooking(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
