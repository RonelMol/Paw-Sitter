import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { 
  Tag, Shield, Lock, Unlock, CheckCircle2, AlertCircle, 
  Search, Sliders, RefreshCw, Edit3, Award, Users, 
  ChevronRight, Save, DollarSign, X, AlertTriangle, ArrowUpDown
} from "lucide-react";

interface ServiceRatePolicy {
  id: number;
  modality: string;
  title: string;
  fixed_new_sitter_rate_php: number;
  standard_min_rate_php: number;
  standard_max_rate_php: number;
  pro_max_rate_php: number;
  max_pets_allowed: number;
  additional_pet_fee_php: number;
  max_extra_pet_fee_php: number;
  max_puppy_rate_php: number;
  max_medication_surcharge_php: number;
  max_holiday_multiplier: string | number;
  is_active: boolean;
  updated_at?: string;
}

interface SitterAuditRecord {
  sitter_id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  profile_picture?: string;
  is_verified: boolean;
  profile_id?: number;
  sitter_tier: "NOVICE" | "STANDARD" | "PRO";
  rates_locked: boolean;
  rate_approval_status: "APPROVED" | "PENDING_REVIEW" | "REJECTED";
  rate_rejection_reason?: string;
  max_pets_per_booking?: number;
  experience_details?: string;
  completed_bookings: number;
  total_bookings: number;
  total_earnings_cents: number;
  avg_rating?: string | null;
  rateCards: Array<{
    id?: number;
    modality: string;
    base_rate: number;
    duration_unit_minutes?: number;
    extra_pet_fee?: number;
    puppy_rate?: number;
    holiday_multiplier?: string | number;
    rush_hour_surcharge?: number;
    is_admin_override?: boolean;
    status?: string;
  }>;
}

export function AdminSitterRatesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"POLICIES" | "SITTERS">("POLICIES");
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<ServiceRatePolicy[]>([]);
  const [sitters, setSitters] = useState<SitterAuditRecord[]>([]);
  const [savingPolicies, setSavingPolicies] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");

  // Admin Override Modal
  const [selectedSitter, setSelectedSitter] = useState<SitterAuditRecord | null>(null);
  const [modalTier, setModalTier] = useState<"NOVICE" | "STANDARD" | "PRO">("NOVICE");
  const [modalRatesLocked, setModalRatesLocked] = useState<boolean>(false);
  const [modalApprovalStatus, setModalApprovalStatus] = useState<"APPROVED" | "PENDING_REVIEW" | "REJECTED">("APPROVED");
  const [modalRejectionReason, setModalRejectionReason] = useState("");
  const [modalMaxPets, setModalMaxPets] = useState<number>(2);
  const [modalCustomRates, setModalCustomRates] = useState<Record<string, number>>({});
  const [savingOverride, setSavingOverride] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/v1/admin/sitters/rates-audit", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies || []);
        setSitters(data.sitters || []);
      } else {
        toast({ title: "Error", description: "Failed to load rate policies & sitters", type: "error" });
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Network Error", description: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Save Global Policies
  const handleSavePolicies = async () => {
    if (!user) return;
    setSavingPolicies(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/v1/admin/rate-policies", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ policies }),
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies);
        toast({
          title: "Rate Policies Saved",
          description: "Global price ceilings, min floors, and new sitter fixed rates updated across the marketplace.",
          type: "success",
        });
      } else {
        const err = await res.json();
        toast({ title: "Failed to Save", description: err.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setSavingPolicies(false);
    }
  };

  // Open Sitter Override Modal
  const handleOpenOverride = (sitter: SitterAuditRecord) => {
    setSelectedSitter(sitter);
    setModalTier(sitter.sitter_tier);
    setModalRatesLocked(sitter.rates_locked);
    setModalApprovalStatus(sitter.rate_approval_status || "APPROVED");
    setModalRejectionReason(sitter.rate_rejection_reason || "");
    setModalMaxPets(sitter.max_pets_per_booking || 2);

    const customRatesMap: Record<string, number> = {};
    sitter.rateCards.forEach((rc) => {
      customRatesMap[rc.modality] = Math.round(rc.base_rate / 100);
    });
    setModalCustomRates(customRatesMap);
  };

  // Save Sitter Override
  const handleSaveOverride = async () => {
    if (!user || !selectedSitter) return;
    setSavingOverride(true);
    try {
      const token = await user.getIdToken();
      
      const customRatesPayload = Object.keys(modalCustomRates).map((modality) => ({
        modality,
        baseRate: Math.round(modalCustomRates[modality] * 100),
      }));

      const res = await fetch(`/api/v1/admin/sitters/${selectedSitter.sitter_id}/rate-override`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sitter_tier: modalTier,
          rates_locked: modalRatesLocked,
          rate_approval_status: modalApprovalStatus,
          rate_rejection_reason: modalRejectionReason,
          max_pets_per_booking: Number(modalMaxPets),
          custom_rates: customRatesPayload.length > 0 ? customRatesPayload : undefined,
        }),
      });

      if (res.ok) {
        toast({
          title: "Sitter Override Applied",
          description: `Sitter #${selectedSitter.sitter_id} rate policies and tier updated successfully.`,
          type: "success",
        });
        setSelectedSitter(null);
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: "Override Failed", description: err.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setSavingOverride(false);
    }
  };

  // Filtered sitters
  const filteredSitters = sitters.filter((s) => {
    const matchesSearch = 
      (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === "ALL" || s.sitter_tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const noviceCount = sitters.filter((s) => s.sitter_tier === "NOVICE").length;
  const standardCount = sitters.filter((s) => s.sitter_tier === "STANDARD").length;
  const proCount = sitters.filter((s) => s.sitter_tier === "PRO").length;
  const lockedCount = sitters.filter((s) => s.rates_locked).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              Rate Governance & Price Caps
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Standardized Philippine Marketplace
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Sitter Rates & Service Governance
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl">
            Standardize service fees, set mandatory fixed rates for new pet sitters, cap maximum allowable charges by caregiver experience level, and apply administrative overrides.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Level 1 (Novice)</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Lock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{noviceCount}</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-0.5">Fixed Platform Rates</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Level 2 (Standard)</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Sliders className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{standardCount}</div>
          <div className="text-[11px] text-blue-700 font-semibold mt-0.5">Custom within Bounds</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Level 3 (Pro)</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Award className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{proCount}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">Elevated Price Caps</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Admin Locked</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Shield className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{lockedCount}</div>
          <div className="text-[11px] text-purple-700 font-semibold mt-0.5">Overridden / Restricted</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("POLICIES")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "POLICIES"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Global Service Price Caps & Fixed Rules</span>
        </button>
        <button
          onClick={() => setActiveTab("SITTERS")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "SITTERS"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Sitter Directory & Rate Overrides ({sitters.length})</span>
        </button>
      </div>

      {/* TAB 1: GLOBAL POLICIES */}
      {activeTab === "POLICIES" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-bold text-sm text-amber-950">How Standardized Rate Controls Function</p>
              <p className="mt-1">
                • <strong>Fixed New Sitter Rate:</strong> All Level 1 / Novice sitters (&lt; 3 completed jobs) are strictly locked to this fee. They cannot change this rate until reaching verified experience.
              </p>
              <p>
                • <strong>Standard Floor &amp; Ceiling:</strong> Standard sitters can only set rates within this range to prevent both race-to-the-bottom undercutting and client price gouging.
              </p>
              <p>
                • <strong>Admin Override:</strong> As an Administrator, you can manually promote any sitter or directly override their custom rates at any time.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {policies.map((p, idx) => (
              <div key={p.modality} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-base">{p.title}</h3>
                      <p className="text-[11px] text-slate-400 font-mono uppercase">{p.modality}</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={p.is_active}
                      onChange={(e) => {
                        const updated = [...policies];
                        updated[idx].is_active = e.target.checked;
                        setPolicies(updated);
                      }}
                      className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                    />
                    <span>Service Active in Marketplace</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Fixed Rate for New Sitters */}
                  <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Fixed Rate (New Sitter)</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-sm font-bold text-amber-800">₱</span>
                      <input
                        type="number"
                        value={p.fixed_new_sitter_rate_php}
                        onChange={(e) => {
                          const updated = [...policies];
                          updated[idx].fixed_new_sitter_rate_php = Number(e.target.value);
                          setPolicies(updated);
                        }}
                        className="w-full bg-white border border-amber-300 rounded-xl px-2.5 py-1 text-sm font-black text-slate-900 font-mono focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <span className="text-[10px] text-amber-700 font-medium block mt-1">Mandatory for &lt;3 bookings</span>
                  </div>

                  {/* Standard Floor */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-700 mb-1">
                      Min Rate Floor (Standard)
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-sm font-bold text-slate-500">₱</span>
                      <input
                        type="number"
                        value={p.standard_min_rate_php}
                        onChange={(e) => {
                          const updated = [...policies];
                          updated[idx].standard_min_rate_php = Number(e.target.value);
                          setPolicies(updated);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-sm font-black text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block mt-1">Lowest allowable price</span>
                  </div>

                  {/* Standard Max Ceiling */}
                  <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200">
                    <div className="text-xs font-bold text-blue-900 mb-1">
                      Max Price Cap (Standard)
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-sm font-bold text-blue-700">₱</span>
                      <input
                        type="number"
                        value={p.standard_max_rate_php}
                        onChange={(e) => {
                          const updated = [...policies];
                          updated[idx].standard_max_rate_php = Number(e.target.value);
                          setPolicies(updated);
                        }}
                        className="w-full bg-white border border-blue-300 rounded-xl px-2.5 py-1 text-sm font-black text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <span className="text-[10px] text-blue-700 font-medium block mt-1">Upper limit for 3-10 bookings</span>
                  </div>

                  {/* Pro Max Ceiling */}
                  <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-900 mb-1">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Max Price Cap (Pro)</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-sm font-bold text-emerald-700">₱</span>
                      <input
                        type="number"
                        value={p.pro_max_rate_php}
                        onChange={(e) => {
                          const updated = [...policies];
                          updated[idx].pro_max_rate_php = Number(e.target.value);
                          setPolicies(updated);
                        }}
                        className="w-full bg-white border border-emerald-300 rounded-xl px-2.5 py-1 text-sm font-black text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <span className="text-[10px] text-emerald-700 font-medium block mt-1">Top tier max allowance</span>
                  </div>
                </div>

                {/* Multi-Pet & Admin Surcharges Policy Row */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-purple-600" />
                    <span>Admin Governed Add-On Surcharges &amp; Pet Capacity (Locked from Sitter Edit)</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                    <div className="p-2.5 bg-purple-50/50 rounded-xl border border-purple-100">
                      <span className="text-purple-900 block text-[11px] font-bold">Add-on Pet Fee (₱)</span>
                      <input
                        type="number"
                        value={p.additional_pet_fee_php ?? 250}
                        onChange={(e) => {
                          const updated = [...policies];
                          updated[idx].additional_pet_fee_php = Number(e.target.value);
                          setPolicies(updated);
                        }}
                        className="w-full bg-white border border-purple-200 rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1"
                      />
                      <span className="text-[9px] text-purple-600 mt-0.5 block">Per extra pet charged</span>
                    </div>

                    <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100">
                      <span className="text-blue-900 block text-[11px] font-bold">Max Pet Capacity</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={p.max_pets_allowed ?? 4}
                        onChange={(e) => {
                          const updated = [...policies];
                          updated[idx].max_pets_allowed = Number(e.target.value);
                          setPolicies(updated);
                        }}
                        className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs font-mono font-bold mt-1"
                      />
                      <span className="text-[9px] text-blue-600 mt-0.5 block">Max pets per booking</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px] font-medium">Puppy Fee (₱)</span>
                      <input
                        type="number"
                        value={p.max_puppy_rate_php}
                        onChange={(e) => {
                          const updated = [...policies];
                          updated[idx].max_puppy_rate_php = Number(e.target.value);
                          setPolicies(updated);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px] font-medium">Medication Fee (₱)</span>
                      <input
                        type="number"
                        value={p.max_medication_surcharge_php}
                        onChange={(e) => {
                          const updated = [...policies];
                          updated[idx].max_medication_surcharge_php = Number(e.target.value);
                          setPolicies(updated);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px] font-medium">Holiday Surge (x)</span>
                      <input
                        type="number"
                        step="0.05"
                        value={p.max_holiday_multiplier}
                        onChange={(e) => {
                          const updated = [...policies];
                          updated[idx].max_holiday_multiplier = Number(e.target.value);
                          setPolicies(updated);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSavePolicies}
              disabled={savingPolicies}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingPolicies ? "Saving Policies..." : "Save All Rate Policies"}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SITTER DIRECTORY & RATE OVERRIDES */}
      {activeTab === "SITTERS" && (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sitter by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <span className="text-xs text-slate-400 font-bold whitespace-nowrap">Tier Filter:</span>
              {["ALL", "NOVICE", "STANDARD", "PRO"].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setTierFilter(tier)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    tierFilter === tier
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Sitter Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Caregiver</th>
                    <th className="p-4">Level / Tier</th>
                    <th className="p-4">Completed Jobs</th>
                    <th className="p-4">Active Rates</th>
                    <th className="p-4">Lock Status</th>
                    <th className="p-4 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSitters.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                        No registered sitters found matching search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSitters.map((s) => (
                      <tr key={s.sitter_id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {s.profile_picture ? (
                              <img src={s.profile_picture} alt="" className="w-9 h-9 rounded-xl object-cover border border-slate-200" />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                                {(s.name?.[0] || "S").toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{s.name || `Sitter #${s.sitter_id}`}</span>
                                {s.is_verified && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-slate-400 font-mono">{s.email}</span>
                                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded-full">
                                  {s.max_pets_per_booking || 2} pets max
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          {s.sitter_tier === "NOVICE" ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
                              <Lock className="w-3 h-3 text-amber-600" />
                              Level 1: Novice
                            </span>
                          ) : s.sitter_tier === "STANDARD" ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 w-fit">
                              <Sliders className="w-3 h-3 text-blue-600" />
                              Level 2: Standard
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                              <Award className="w-3 h-3 text-emerald-600" />
                              Level 3: Pro
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-slate-800">{s.completed_bookings} completed</div>
                          <div className="text-[11px] text-slate-400">
                            {s.avg_rating ? `★ ${s.avg_rating}` : "No reviews yet"}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {s.rateCards.length === 0 ? (
                              <span className="text-slate-400 italic text-[11px]">No rate cards configured</span>
                            ) : (
                              s.rateCards.map((rc) => (
                                <span
                                  key={rc.modality}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                    rc.is_admin_override
                                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {rc.modality.replace("_", " ")}: ₱{(rc.base_rate / 100).toFixed(0)}
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        <td className="p-4">
                          {s.rates_locked ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1 w-fit">
                              <Lock className="w-3 h-3 text-purple-600" />
                              Locked
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center gap-1 w-fit">
                              <Unlock className="w-3 h-3 text-slate-500" />
                              Flexible
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenOverride(s)}
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 ml-auto shadow-xs cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Override</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN OVERRIDE MODAL */}
      {selectedSitter && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Admin Sitter Rate &amp; Tier Override
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target: {selectedSitter.name} ({selectedSitter.email}) • Sitter #{selectedSitter.sitter_id}
                </p>
              </div>
              <button
                onClick={() => setSelectedSitter(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Sitter Tier Assignment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Assign Sitter Experience Tier
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalTier("NOVICE")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      modalTier === "NOVICE"
                        ? "bg-amber-50 border-amber-400 ring-2 ring-amber-500/20"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-amber-950 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      Level 1: Novice
                    </div>
                    <div className="text-[10px] text-amber-800 mt-0.5">Fixed Platform Rates</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalTier("STANDARD")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      modalTier === "STANDARD"
                        ? "bg-blue-50 border-blue-400 ring-2 ring-blue-500/20"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-blue-950 flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-blue-600" />
                      Level 2: Standard
                    </div>
                    <div className="text-[10px] text-blue-800 mt-0.5">Custom in Range</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalTier("PRO")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      modalTier === "PRO"
                        ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-emerald-950 flex items-center gap-1">
                      <Award className="w-3 h-3 text-emerald-600" />
                      Level 3: Pro
                    </div>
                    <div className="text-[10px] text-emerald-800 mt-0.5">Elevated Cap</div>
                  </button>
                </div>
              </div>

              {/* Rate Locking Toggle */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Lock Rates to Fixed Standard</div>
                  <div className="text-[11px] text-slate-500">
                    If locked, this sitter cannot change base rates on their portal.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalRatesLocked}
                    onChange={(e) => setModalRatesLocked(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Approval Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rate Card Approval Status
                </label>
                <select
                  value={modalApprovalStatus}
                  onChange={(e) => setModalApprovalStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
                >
                  <option value="APPROVED">APPROVED (Active in Search &amp; Bookings)</option>
                  <option value="PENDING_REVIEW">PENDING_REVIEW (Awaiting Approval)</option>
                  <option value="REJECTED">REJECTED (Rates Blocked from Booking)</option>
                </select>
              </div>

              {/* Pet Capacity Override */}
              <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-200">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>Max Concurrent Pets per Booking (Capacity)</span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    {modalMaxPets} {modalMaxPets === 1 ? "Pet" : "Pets"} Max
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Admin safety limit based on home size, pet-proofing, and caregiver certification.
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setModalMaxPets(num)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        modalMaxPets === num
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {num} {num === 1 ? "Pet" : "Pets"}
                    </button>
                  ))}
                </div>
              </div>

              {modalApprovalStatus === "REJECTED" && (
                <div>
                  <label className="block text-xs font-bold text-rose-700 mb-1">
                    Rejection Reason (Visible to Sitter)
                  </label>
                  <textarea
                    value={modalRejectionReason}
                    onChange={(e) => setModalRejectionReason(e.target.value)}
                    placeholder="Provide actionable feedback on why their rates were rejected..."
                    className="w-full bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs"
                    rows={2}
                  />
                </div>
              )}

              {/* Direct Custom Base Rate Overrides */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Direct Custom Base Rates (PHP ₱)
                  </label>
                  <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded">
                    Admin Force Override
                  </span>
                </div>
                <div className="space-y-2">
                  {policies.map((p) => (
                    <div key={p.modality} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="font-bold text-slate-800 text-xs">
                        {p.title}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          Platform Cap: ₱{p.standard_max_rate_php}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 w-32">
                        <span className="text-xs font-bold text-slate-400">₱</span>
                        <input
                          type="number"
                          placeholder={String(p.fixed_new_sitter_rate_php)}
                          value={modalCustomRates[p.modality] ?? p.fixed_new_sitter_rate_php}
                          onChange={(e) => {
                            setModalCustomRates({
                              ...modalCustomRates,
                              [p.modality]: Number(e.target.value),
                            });
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50 rounded-b-3xl">
              <button
                onClick={() => setSelectedSitter(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOverride}
                disabled={savingOverride}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingOverride ? "Applying Override..." : "Save Sitter Override"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
