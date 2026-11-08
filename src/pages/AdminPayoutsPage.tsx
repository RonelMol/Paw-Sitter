import React, { useState, useEffect } from "react";
import { AdminLayout } from "../components/AdminLayout";
import {
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  DollarSign,
  TrendingUp,
  Download,
  Search,
  Filter,
  RefreshCw,
  Send,
  Copy,
  Check,
  Eye,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  Sparkles,
  FileSpreadsheet
} from "lucide-react";
import { useCurrency } from "../lib/CurrencyContext";
import { useAuth } from "../lib/AuthContext";

interface PayoutItem {
  bookingId: number;
  bookingStatus: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  sitter: {
    id: number;
    name: string;
    email: string;
    phone: string;
    kycStatus: string;
    disbursementAccount: {
      bankName: string;
      accountName: string;
      accountNumber: string;
    };
  };
  owner: {
    id: number;
    name: string;
    email: string;
  };
  financials: {
    grossCents: number;
    commissionCents: number;
    tipCents: number;
    sitterPayoutCents: number;
    grossPhp: string;
    commissionPhp: string;
    tipPhp: string;
    sitterPayoutPhp: string;
  };
  payment: {
    id: number;
    status: string;
    transferGroup: string;
    disputeFlag: boolean;
  };
  payoutStatus: "PENDING_DISBURSEMENT" | "DISBURSED" | "HELD_IN_ESCROW" | "DISPUTED" | "UPCOMING_CONFIRMED" | "CANCELLED";
  disbursement: {
    id: number;
    referenceNumber: string;
    payoutChannel: string;
    bankName: string;
    accountNumber: string;
    adminNotes: string;
    disbursedAt: string;
    processedByAdminName: string;
  } | null;
}

interface SitterBrief {
  id: number;
  name: string;
  email: string;
  phone: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  kycStatus: string;
}

export const AdminPayoutsPage: React.FC = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [sittersList, setSittersList] = useState<SitterBrief[]>([]);
  const [adhocDisbursements, setAdhocDisbursements] = useState<any[]>([]);

  // Filters
  const [activeTab, setActiveTab] = useState<"PENDING" | "DISBURSED" | "ALL" | "ADHOC">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("ALL");

  // Manual Disburse Modal State
  const [disburseModalItem, setDisburseModalItem] = useState<PayoutItem | null>(null);
  const [refNumberInput, setRefNumberInput] = useState("");
  const [channelInput, setChannelInput] = useState("GCASH");
  const [adminNotesInput, setAdminNotesInput] = useState("");
  const [submittingDisburse, setSubmittingDisburse] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Batch Selection
  const [selectedBookingIds, setSelectedBookingIds] = useState<number[]>([]);
  const [batchRefInput, setBatchRefInput] = useState("");
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // Ad-hoc Modal State
  const [showAdhocModal, setShowAdhocModal] = useState(false);
  const [adhocSitterId, setAdhocSitterId] = useState<number | "">("");
  const [adhocAmountPhp, setAdhocAmountPhp] = useState("");
  const [adhocReason, setAdhocReason] = useState("PERFORMANCE_BONUS");
  const [adhocRef, setAdhocRef] = useState("");
  const [adhocChannel, setAdhocChannel] = useState("GCASH");
  const [adhocNotes, setAdhocNotes] = useState("");
  const [submittingAdhoc, setSubmittingAdhoc] = useState(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getAuthHeaders = async () => {
    const token = user ? await user.getIdToken() : "";
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const fetchAdminPayouts = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/admin/payouts", { headers });
      if (!res.ok) {
        throw new Error("Failed to fetch admin payouts data.");
      }
      const data = await res.json();
      setSummary(data.summary);
      setPayouts(data.payouts || []);
      setSittersList(data.sittersList || []);
      setAdhocDisbursements(data.adhocDisbursements || []);
    } catch (err: any) {
      console.error("Admin payouts error:", err);
      setError(err.message || "Error loading payouts data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminPayouts();
  }, [user]);

  const openManualDisburse = (item: PayoutItem) => {
    setDisburseModalItem(item);
    setChannelInput(item.sitter.disbursementAccount.bankName?.toUpperCase() || "GCASH");
    // Pre-generate recommended audit reference
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    setRefNumberInput(`${item.sitter.disbursementAccount.bankName?.toUpperCase() || "PAY"}-${dateStr}-${item.bookingId}`);
    setAdminNotesInput(`Manual payout released to ${item.sitter.name} (${item.sitter.disbursementAccount.bankName})`);
  };

  const handleConfirmDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disburseModalItem || !refNumberInput.trim()) return;

    try {
      setSubmittingDisburse(true);
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/admin/payouts/manual-disburse", {
        method: "POST",
        headers,
        body: JSON.stringify({
          bookingId: disburseModalItem.bookingId,
          referenceNumber: refNumberInput.trim(),
          payoutChannel: channelInput,
          bankName: disburseModalItem.sitter.disbursementAccount.bankName,
          accountName: disburseModalItem.sitter.disbursementAccount.accountName,
          accountNumber: disburseModalItem.sitter.disbursementAccount.accountNumber,
          adminNotes: adminNotesInput,
          amountCents: disburseModalItem.financials.sitterPayoutCents,
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to process manual disbursement.");
      }

      setActionSuccessMsg(json.message);
      setDisburseModalItem(null);
      await fetchAdminPayouts();
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to disburse.");
    } finally {
      setSubmittingDisburse(false);
    }
  };

  const handleBatchDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBookingIds.length === 0 || !batchRefInput.trim()) return;

    try {
      setSubmittingBatch(true);
      const headers = await getAuthHeaders();
      const res = await fetch("/api/v1/admin/payouts/batch-disburse", {
        method: "POST",
        headers,
        body: JSON.stringify({
          bookingIds: selectedBookingIds,
          batchReference: batchRefInput.trim(),
          payoutChannel: channelInput,
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Batch disbursement failed.");
      }

      setActionSuccessMsg(json.message);
      setSelectedBookingIds([]);
      setShowBatchModal(false);
      await fetchAdminPayouts();
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || "Error processing batch.");
    } finally {
      setSubmittingBatch(false);
    }
  };

  const handleCreateAdhoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adhocSitterId || !adhocAmountPhp || !adhocRef.trim()) return;

    try {
      setSubmittingAdhoc(true);
      const amountCents = Math.round(parseFloat(adhocAmountPhp) * 100);
      const headers = await getAuthHeaders();

      const res = await fetch("/api/v1/admin/payouts/adhoc", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sitterId: adhocSitterId,
          amountCents,
          reason: adhocReason,
          referenceNumber: adhocRef.trim(),
          payoutChannel: adhocChannel,
          adminNotes: adhocNotes,
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create ad-hoc payout.");
      }

      setActionSuccessMsg(json.message);
      setShowAdhocModal(false);
      setAdhocSitterId("");
      setAdhocAmountPhp("");
      setAdhocRef("");
      setAdhocNotes("");
      await fetchAdminPayouts();
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || "Ad-hoc payout error.");
    } finally {
      setSubmittingAdhoc(false);
    }
  };

  // Filtered List
  const filteredPayouts = payouts.filter((p) => {
    // Tab filter
    if (activeTab === "PENDING" && p.payoutStatus !== "PENDING_DISBURSEMENT") return false;
    if (activeTab === "DISBURSED" && p.payoutStatus !== "DISBURSED") return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSitter = p.sitter.name.toLowerCase().includes(q) || p.sitter.email.toLowerCase().includes(q);
      const matchOwner = p.owner.name.toLowerCase().includes(q);
      const matchRef = p.disbursement?.referenceNumber?.toLowerCase().includes(q);
      const matchBooking = String(p.bookingId).includes(q);
      if (!matchSitter && !matchOwner && !matchRef && !matchBooking) return false;
    }

    // Channel filter
    if (channelFilter !== "ALL") {
      const bank = p.sitter.disbursementAccount.bankName?.toUpperCase();
      if (channelFilter === "GCASH" && !bank?.includes("GCASH")) return false;
      if (channelFilter === "MAYA" && !bank?.includes("MAYA")) return false;
      if (channelFilter === "BANK" && (bank?.includes("GCASH") || bank?.includes("MAYA"))) return false;
    }

    return true;
  });

  const exportCsvManifest = () => {
    const rows = [
      ["Booking ID", "Sitter Name", "Sitter Email", "Sitter Phone", "Bank / Provider", "Account Name", "Account Number", "Payout Amount (PHP)", "Status", "Reference #", "Disbursed At"]
    ];

    filteredPayouts.forEach((p) => {
      rows.push([
        String(p.bookingId),
        `"${p.sitter.name}"`,
        `"${p.sitter.email}"`,
        `"${p.sitter.phone || ""}"`,
        `"${p.sitter.disbursementAccount.bankName}"`,
        `"${p.sitter.disbursementAccount.accountName}"`,
        `"${p.sitter.disbursementAccount.accountNumber}"`,
        p.financials.sitterPayoutPhp,
        p.payoutStatus,
        `"${p.disbursement?.referenceNumber || ""}"`,
        `"${p.disbursement?.disbursedAt || ""}"`,
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pawshield_payouts_manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout activeNav="payouts">
      <div className="space-y-6">
        {/* Header and Quick Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Wallet className="w-7 h-7 text-emerald-600" />
              Sitter Payouts & Escrow Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review completed caregiver bookings, manage escrow releases, and issue manual disbursements to Philippine bank & e-wallet accounts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportCsvManifest}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export CSV Manifest
            </button>
            <button
              onClick={() => setShowAdhocModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Issue Manual Bonus / Adjustment
            </button>
          </div>
        </div>

        {/* Action notification banner */}
        {actionSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Top Metric Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Pending Escrow
              </span>
              <div className="text-2xl font-bold text-amber-600 mt-1 font-mono">
                {formatPrice(parseFloat(summary.totalPendingEscrowPhp))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {summary.completedAwaitingPayoutCount} completed jobs waiting
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Disbursed This Month
              </span>
              <div className="text-2xl font-bold text-emerald-600 mt-1 font-mono">
                {formatPrice(parseFloat(summary.totalDisbursedThisMonthPhp))}
              </div>
              <p className="text-xs text-slate-500 mt-1">Released to sitters</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Sitters Awaiting Payout
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {summary.pendingSittersCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">Unique care providers</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Lifetime Disbursed
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {formatPrice(parseFloat(summary.totalDisbursedLifetimePhp))}
              </div>
              <p className="text-xs text-slate-500 mt-1">Total caregiver earnings</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Disputed / Frozen
              </span>
              <div className="text-2xl font-bold text-rose-600 mt-1">
                {summary.disputedCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">Frozen for review</p>
            </div>
          </div>
        )}

        {/* Research & Manual Module Insights Box */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 space-y-1">
              <div className="font-bold text-emerald-950 text-sm">
                Manual Payout Architecture (Philippine Banking & E-Wallets)
              </div>
              <p>
                <strong>Workflow:</strong> 1) Admin copies the sitter's verified GCash, Maya, or Bank account number with 1-click. 2) Admin sends the funds via your preferred disbursement portal (GCash for Business, Maya Business, BDO/BPI Instapay). 3) Admin enters the reference number below to record the audit log and trigger an instant notification to the caregiver.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs & Controls Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "PENDING"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Pending Disbursement Queue
              {summary && summary.completedAwaitingPayoutCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {summary.completedAwaitingPayoutCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("DISBURSED")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "DISBURSED"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Disbursed History
            </button>

            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "ALL"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Bookings ({payouts.length})
            </button>

            <button
              onClick={() => setActiveTab("ADHOC")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "ADHOC"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ad-hoc Payouts ({adhocDisbursements.length})
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sitter, owner, ref#..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700"
            >
              <option value="ALL">All Channels</option>
              <option value="GCASH">GCash Only</option>
              <option value="MAYA">Maya Only</option>
              <option value="BANK">Traditional Banks</option>
            </select>

            <button
              onClick={fetchAdminPayouts}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Batch Actions Bar (when pending items selected) */}
        {activeTab === "PENDING" && selectedBookingIds.length > 0 && (
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {selectedBookingIds.length} bookings selected for batch disbursement
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedBookingIds([])}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white"
              >
                Clear Selection
              </button>
              <button
                onClick={() => {
                  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
                  setBatchRefInput(`BATCH-${dateStr}`);
                  setShowBatchModal(true);
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors"
              >
                Disburse Selected ({selectedBookingIds.length})
              </button>
            </div>
          </div>
        )}

        {/* Ad-hoc Disbursements View */}
        {activeTab === "ADHOC" ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Manual Ad-hoc Adjustments & Bonuses</h3>
                <p className="text-xs text-slate-500">Custom payouts issued directly to pet sitters outside standard bookings</p>
              </div>
              <button
                onClick={() => setShowAdhocModal(true)}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800"
              >
                + Issue New Bonus
              </button>
            </div>

            {adhocDisbursements.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-medium text-slate-700">No ad-hoc adjustments have been issued yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Sitter</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Channel & Bank</th>
                      <th className="py-3 px-4">Account Number</th>
                      <th className="py-3 px-4">Reference #</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4">Processed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {adhocDisbursements.map((ad) => (
                      <tr key={ad.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(ad.disbursedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{ad.sitterName}</td>
                        <td className="py-3 px-4 font-bold text-emerald-600 font-mono text-sm">
                          {formatPrice(parseFloat(ad.amountPhp))}
                        </td>
                        <td className="py-3 px-4">{ad.bankName || ad.payoutChannel}</td>
                        <td className="py-3 px-4 font-mono">{ad.accountNumber}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{ad.referenceNumber}</td>
                        <td className="py-3 px-4 text-slate-600 italic">{ad.adminNotes}</td>
                        <td className="py-3 px-4 text-slate-500">{ad.adminName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Main Payouts Table */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            {filteredPayouts.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-medium text-slate-700">No payout records found for this view.</p>
                <p className="text-xs text-slate-500 mt-1">Completed bookings awaiting disbursement will appear in the Pending Queue.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      {activeTab === "PENDING" && (
                        <th className="py-3.5 px-3 w-8">
                          <input
                            type="checkbox"
                            checked={
                              selectedBookingIds.length > 0 &&
                              selectedBookingIds.length === filteredPayouts.filter(p => p.payoutStatus === "PENDING_DISBURSEMENT").length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBookingIds(
                                  filteredPayouts
                                    .filter(p => p.payoutStatus === "PENDING_DISBURSEMENT")
                                    .map(p => p.bookingId)
                                );
                              } else {
                                setSelectedBookingIds([]);
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                        </th>
                      )}
                      <th className="py-3.5 px-4">Booking</th>
                      <th className="py-3.5 px-4">Caregiver (Sitter)</th>
                      <th className="py-3.5 px-4">Disbursement Destination</th>
                      <th className="py-3.5 px-4">Gross Charge</th>
                      <th className="py-3.5 px-4">Platform Fee</th>
                      <th className="py-3.5 px-4">Net Sitter Payout</th>
                      <th className="py-3.5 px-4">Escrow Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredPayouts.map((item) => {
                      const isSelected = selectedBookingIds.includes(item.bookingId);
                      const accNumber = item.sitter.disbursementAccount.accountNumber;
                      const bankName = item.sitter.disbursementAccount.bankName;

                      return (
                        <tr key={item.bookingId} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? "bg-emerald-50/40" : ""}`}>
                          {activeTab === "PENDING" && (
                            <td className="py-3.5 px-3">
                              {item.payoutStatus === "PENDING_DISBURSEMENT" && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedBookingIds([...selectedBookingIds, item.bookingId]);
                                    } else {
                                      setSelectedBookingIds(selectedBookingIds.filter(id => id !== item.bookingId));
                                    }
                                  }}
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                              )}
                            </td>
                          )}

                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            <div>#{item.bookingId}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(item.startTime).toLocaleDateString()}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 flex items-center gap-1">
                              {item.sitter.name}
                              {item.sitter.kycStatus === "APPROVED" && (
                                <span title="KYC Approved">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">{item.sitter.email}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{bankName}</span>
                              <button
                                onClick={() => copyToClipboard(accNumber, `acc-${item.bookingId}`)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono"
                                title="Click to copy account number"
                              >
                                {copiedId === `acc-${item.bookingId}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-slate-500" />
                                    {accNumber}
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Name: {item.sitter.disbursementAccount.accountName}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {formatPrice(parseFloat(item.financials.grossPhp))}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            -{formatPrice(parseFloat(item.financials.commissionPhp))}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 font-mono text-sm">
                              {formatPrice(parseFloat(item.financials.sitterPayoutPhp))}
                            </div>
                            {item.financials.tipCents > 0 && (
                              <div className="text-[10px] text-emerald-600 font-medium">
                                +{formatPrice(parseFloat(item.financials.tipPhp))} tip
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {item.payoutStatus === "DISBURSED" ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" /> Disbursed
                                </span>
                                {item.disbursement && (
                                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                    Ref: {item.disbursement.referenceNumber}
                                  </div>
                                )}
                              </div>
                            ) : item.payoutStatus === "PENDING_DISBURSEMENT" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3" /> Ready for Payout
                              </span>
                            ) : item.payoutStatus === "UPCOMING_CONFIRMED" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
                                Upcoming Stay
                              </span>
                            ) : item.payoutStatus === "DISPUTED" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                Disputed
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">{item.payoutStatus}</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {item.payoutStatus === "PENDING_DISBURSEMENT" ? (
                              <button
                                onClick={() => openManualDisburse(item)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-2xs"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Process Payout
                              </button>
                            ) : item.disbursement ? (
                              <div className="text-[11px] text-slate-500">
                                Disbursed by {item.disbursement.processedByAdminName || "Admin"}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Manual Disburse Modal */}
        {disburseModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    Manual Payout Module
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    Disburse ₱{disburseModalItem.financials.sitterPayoutPhp} to {disburseModalItem.sitter.name}
                  </h3>
                </div>
                <button
                  onClick={() => setDisburseModalItem(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmDisburse} className="space-y-4 py-4 text-sm">
                {/* Sitter Bank Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Sitter Payout Destination:</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-sm">
                    <span className="font-bold text-slate-900">
                      {disburseModalItem.sitter.disbursementAccount.bankName}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(disburseModalItem.sitter.disbursementAccount.accountNumber, "modal-acc")}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs hover:bg-slate-50"
                    >
                      {copiedId === "modal-acc" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                      {disburseModalItem.sitter.disbursementAccount.accountNumber}
                    </button>
                  </div>
                  <div className="text-xs text-slate-600">
                    Account Name: <strong>{disburseModalItem.sitter.disbursementAccount.accountName}</strong>
                  </div>
                </div>

                {/* Form fields */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Disbursement Channel / Provider *
                  </label>
                  <select
                    value={channelInput}
                    onChange={(e) => setChannelInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="GCASH">GCash (Instant)</option>
                    <option value="MAYA">Maya (Instant)</option>
                    <option value="BDO">BDO Unibank (Instapay / PESONet)</option>
                    <option value="BPI">BPI (Bank of the Philippine Islands)</option>
                    <option value="UNIONBANK">UnionBank</option>
                    <option value="METROBANK">Metrobank</option>
                    <option value="CASH">Cash in Hand / Counter</option>
                    <option value="STRIPE">Stripe Connect Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction Reference Number * (e.g. GCash Ref, Instapay Trace#)
                  </label>
                  <input
                    type="text"
                    required
                    value={refNumberInput}
                    onChange={(e) => setRefNumberInput(e.target.value)}
                    placeholder="e.g. GCASH-2026-99214"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    This reference will be saved to the database audit log and sent to the sitter.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admin Audit Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={adminNotesInput}
                    onChange={(e) => setAdminNotesInput(e.target.value)}
                    placeholder="Notes regarding disbursement"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDisburseModalItem(null)}
                    className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingDisburse}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {submittingDisburse ? "Recording Payout..." : "Confirm & Release Payout"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Batch Modal */}
        {showBatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Batch Disburse {selectedBookingIds.length} Payouts
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                This will mark all selected bookings as RELEASED, record a disbursement audit log for each sitter, and fire payout notifications.
              </p>

              <form onSubmit={handleBatchDisburse} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch Reference ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={batchRefInput}
                    onChange={(e) => setBatchRefInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Channel
                  </label>
                  <select
                    value={channelInput}
                    onChange={(e) => setChannelInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="GCASH_BATCH">GCash Batch Portal</option>
                    <option value="BANK_PESONET_BATCH">PESONet / Bank File Batch</option>
                    <option value="MAYA_BATCH">Maya Business Batch</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBatch}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                  >
                    {submittingBatch ? "Processing..." : "Confirm Batch Release"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Ad-hoc Payout Modal */}
        {showAdhocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                    Manual Sitter Compensation
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    Issue Manual Bonus / Adjustment
                  </h3>
                </div>
                <button
                  onClick={() => setShowAdhocModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateAdhoc} className="space-y-4 py-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Pet Sitter *
                  </label>
                  <select
                    required
                    value={adhocSitterId}
                    onChange={(e) => setAdhocSitterId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
                  >
                    <option value="">-- Choose Sitter --</option>
                    {sittersList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.bankName}: {s.accountNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Amount in PHP (₱) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 500"
                      value={adhocAmountPhp}
                      onChange={(e) => setAdhocAmountPhp(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason
                    </label>
                    <select
                      value={adhocReason}
                      onChange={(e) => setAdhocReason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                      <option value="PERFORMANCE_BONUS">Performance Bonus</option>
                      <option value="REFERRAL_REWARD">Referral Reward</option>
                      <option value="DISPUTE_COMPENSATION">Dispute Compensation</option>
                      <option value="HOLIDAY_BONUS">Holiday Care Bonus</option>
                      <option value="OTHER">Other Manual Adjustment</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Channel
                    </label>
                    <select
                      value={adhocChannel}
                      onChange={(e) => setAdhocChannel(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                      <option value="GCASH">GCash</option>
                      <option value="MAYA">Maya</option>
                      <option value="BDO">BDO</option>
                      <option value="BPI">BPI</option>
                      <option value="UNIONBANK">UnionBank</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reference Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GCASH-BONUS-912"
                      value={adhocRef}
                      onChange={(e) => setAdhocRef(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admin Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5-star pet review incentive"
                    value={adhocNotes}
                    onChange={(e) => setAdhocNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdhocModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdhoc}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {submittingAdhoc ? "Issuing..." : "Issue Bonus Payout"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
