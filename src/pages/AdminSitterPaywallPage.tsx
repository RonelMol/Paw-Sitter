import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Save, 
  Users, 
  Sliders, 
  CreditCard, 
  Zap, 
  Percent, 
  Eye, 
  ChevronRight,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { SitterMembershipModal } from "../components/SitterMembershipModal";

interface MembershipConfig {
  default_max_free_bookings: number;
  monthly_pro_fee_php: number;
  annual_pro_fee_php: number;
  pro_commission_discount_pct: number;
  paywall_enforced: boolean;
}

interface SitterMembershipRow {
  user_id: number;
  name: string | null;
  email: string;
  is_verified: boolean;
  plan_type: string;
  status: string;
  accepted_bookings_count: number;
  max_free_bookings: number;
  activated_at: string | null;
  expires_at: string | null;
  payment_reference: string | null;
}

export function AdminSitterPaywallPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [config, setConfig] = useState<MembershipConfig>({
    default_max_free_bookings: 3,
    monthly_pro_fee_php: 499,
    annual_pro_fee_php: 4990,
    pro_commission_discount_pct: 10,
    paywall_enforced: true,
  });

  const [sitters, setSitters] = useState<SitterMembershipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Override dialog state
  const [selectedSitter, setSelectedSitter] = useState<SitterMembershipRow | null>(null);
  const [overridePlan, setOverridePlan] = useState<string>("PRO_MONTHLY");
  const [overrideLimit, setOverrideLimit] = useState<number>(3);
  const [overrideCount, setOverrideCount] = useState<number>(0);
  const [updatingOverride, setUpdatingOverride] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = user ? await user.getIdToken() : "";
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [configRes, sittersRes] = await Promise.all([
        fetch("/api/v1/admin/membership-config", { headers }),
        fetch("/api/v1/admin/sitter-memberships", { headers })
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }

      if (sittersRes.ok) {
        const sittersData = await sittersRes.json();
        setSitters(sittersData);
      }
    } catch (e: any) {
      console.error("Failed to load paywall data:", e);
      toast({ title: "Notice", description: "Loaded default membership policies", type: "info" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch("/api/v1/admin/membership-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(config)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.config) {
          setConfig(data.config);
        }
        toast({ title: "Configuration Saved", description: "Sitter 3-booking limits & paywall rules updated dynamically!", type: "success" });
      } else {
        toast({ title: "Update Failed", description: data.cause ? `${data.error}: ${data.cause}` : (data.error || "Failed to update configuration"), type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "error" });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleApplyOverride = async () => {
    if (!selectedSitter) return;
    setUpdatingOverride(true);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch("/api/v1/admin/sitter-memberships/override", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userId: selectedSitter.user_id,
          planType: overridePlan,
          maxFreeBookings: overrideLimit,
          acceptedCount: overrideCount,
          status: "ACTIVE"
        })
      });

      if (res.ok) {
        toast({ title: "Sitter Updated", description: `Membership for ${selectedSitter.email} was successfully modified.`, type: "success" });
        setSelectedSitter(null);
        fetchData();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to update sitter", type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "error" });
    } finally {
      setUpdatingOverride(false);
    }
  };

  // Stats calculation
  const totalSitters = sitters.length;
  const proSitters = sitters.filter(s => s.plan_type.includes("PRO")).length;
  const freeSitters = sitters.filter(s => s.plan_type === "FREE_TIER");
  const cappedSitters = freeSitters.filter(s => s.accepted_bookings_count >= (s.max_free_bookings || config.default_max_free_bookings)).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-purple-100">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
                Monetization & Limits Engine
              </span>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Live Enforced
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              Sitter 3-Booking Free Limit & Pro Paywall
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl">
              Configure free tier allowance, Pro subscription pricing, and manage individual sitter quotas, overrides, and paywall locks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreviewModal(true)}
            className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 transition-colors flex items-center gap-2"
          >
            <Eye className="w-4 h-4" /> Preview Sitter Paywall
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Sitters</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalSitters}</div>
          <div className="text-xs text-slate-500 mt-1">Registered care providers</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">PawShield Pro</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-700">{proSitters}</div>
          <div className="text-xs text-purple-600/80 mt-1">Unlimited booking pass</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Free Tier Active</span>
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700">{freeSitters.length}</div>
          <div className="text-xs text-amber-600/80 mt-1">Subject to 3-booking cap</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Paywall Triggered</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-700">{cappedSitters}</div>
          <div className="text-xs text-rose-600/80 mt-1">Ready for Pro upgrade</div>
        </div>
      </div>

      {/* Dynamic Settings Form */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Dynamic Paywall & Limits Configuration</h2>
              <p className="text-xs text-slate-500">Changes here dynamically update runtime booking validation and paywall barriers.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Free Bookings Limit */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Free Accepted Bookings Limit</span>
                <span className="text-purple-600 font-black">{config.default_max_free_bookings} Bookings</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.default_max_free_bookings}
                  onChange={(e) => setConfig({ ...config, default_max_free_bookings: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Number of accepted reservations before a sitter is gated by the Pro Paywall.
              </p>
            </div>

            {/* Monthly Pro Fee */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Monthly Pro Sitter Fee</span>
                <span className="text-purple-600 font-black">₱{config.monthly_pro_fee_php} / mo</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold text-sm">₱</span>
                <input
                  type="number"
                  min={99}
                  step={50}
                  value={config.monthly_pro_fee_php}
                  onChange={(e) => setConfig({ ...config, monthly_pro_fee_php: parseInt(e.target.value, 10) || 0 })}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Philippine Peso subscription rate for 30-day unlimited booking privileges.
              </p>
            </div>

            {/* Annual Pro Fee */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Annual Pro Sitter Fee</span>
                <span className="text-emerald-600 font-black">₱{config.annual_pro_fee_php} / yr</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold text-sm">₱</span>
                <input
                  type="number"
                  min={999}
                  step={100}
                  value={config.annual_pro_fee_php}
                  onChange={(e) => setConfig({ ...config, annual_pro_fee_php: parseInt(e.target.value, 10) || 0 })}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Discounted annual subscription with 2 months free.
              </p>
            </div>

            {/* Pro Commission Take Rate Discount */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Pro Sitter Platform Fee</span>
                <span className="text-purple-600 font-black">{config.pro_commission_discount_pct}% (from 20%)</span>
              </label>
              <div className="relative">
                <span className="absolute right-3.5 top-3.5 text-slate-400 font-bold text-sm">%</span>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={config.pro_commission_discount_pct}
                  onChange={(e) => setConfig({ ...config, pro_commission_discount_pct: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Reduced platform commission percentage taken on bookings completed by Pro Sitters.
              </p>
            </div>

            {/* Paywall Hard-Enforcement */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Paywall Enforcement Mode
              </label>
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {config.paywall_enforced ? "Hard Enforcement (Active)" : "Grace Period / Soft Mode"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {config.paywall_enforced ? "Blocks 4th booking acceptance until upgrade." : "Shows modal warning without blocking."}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, paywall_enforced: !config.paywall_enforced })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    config.paywall_enforced ? "bg-purple-600 justify-end" : "bg-slate-300 justify-start"
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={savingConfig}
                className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {savingConfig ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Update Platform Policies
                  </>
                )}
              </button>
            </div>

          </div>
        </form>
      </div>

      {/* Sitter Limit Tracker & Overrides Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Sitter Free Limit & Upgrade Tracker</h2>
            <p className="text-xs text-slate-500">Inspect each sitter's booking tally, quota remaining, and apply administrative overrides.</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {sitters.length} Sitters Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-extrabold">
              <tr>
                <th className="py-3.5 px-4">Sitter Name & Email</th>
                <th className="py-3.5 px-4">Membership Plan</th>
                <th className="py-3.5 px-4">Accepted Bookings</th>
                <th className="py-3.5 px-4">Quota Status</th>
                <th className="py-3.5 px-4">Paywall State</th>
                <th className="py-3.5 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sitters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No sitter records found in database.
                  </td>
                </tr>
              ) : (
                sitters.map((s) => {
                  const maxFree = s.max_free_bookings || config.default_max_free_bookings;
                  const accepted = s.accepted_bookings_count;
                  const isPro = s.plan_type.includes("PRO");
                  const isCapped = !isPro && accepted >= maxFree;
                  const progressPct = isPro ? 100 : Math.min(100, Math.round((accepted / maxFree) * 100));

                  return (
                    <tr key={s.user_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{s.name || "Pet Sitter"}</div>
                        <div className="text-[11px] text-slate-500">{s.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isPro ? (
                          <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-[10px]">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            {s.plan_type === "PRO_ANNUAL" ? "PawShield Pro (Annual)" : "PawShield Pro (Monthly)"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                            <Lock className="w-3 h-3 text-slate-400" /> Free Tier ({maxFree} Cap)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {accepted} Accepted {isPro && <span className="text-[10px] text-emerald-600 font-normal">(Unlimited)</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        {isPro ? (
                          <div className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Unlimited Bookings
                          </div>
                        ) : (
                          <div className="w-32 space-y-1">
                            <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                              <span>{accepted} / {maxFree} free</span>
                              <span>{Math.max(0, maxFree - accepted)} left</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  isCapped ? "bg-rose-500" : accepted >= 2 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isPro ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Bypassed (Pro)
                          </span>
                        ) : isCapped ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Paywall Active (4th Blocked)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            Allowance Active
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedSitter(s);
                            setOverridePlan(s.plan_type);
                            setOverrideLimit(s.max_free_bookings || config.default_max_free_bookings);
                            setOverrideCount(s.accepted_bookings_count);
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg shadow-sm transition-all inline-flex items-center gap-1 active:scale-95"
                        >
                          <Sliders className="w-3 h-3 text-amber-400" /> Override Quota
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Dialog Modal */}
      {selectedSitter && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Adjust Sitter Membership Quota</h3>
                  <p className="text-xs text-slate-500">{selectedSitter.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSitter(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Membership Plan</label>
                <select
                  value={overridePlan}
                  onChange={(e) => setOverridePlan(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="FREE_TIER">FREE_TIER (Constrained by booking limit)</option>
                  <option value="PRO_MONTHLY">PRO_MONTHLY (₱499/mo Unlimited Bookings)</option>
                  <option value="PRO_ANNUAL">PRO_ANNUAL (₱4,990/yr Unlimited Bookings)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Max Free Bookings Limit</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={overrideLimit}
                  onChange={(e) => setOverrideLimit(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Standard platform default is {config.default_max_free_bookings}.</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Accepted Bookings Count (Tally)</label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={overrideCount}
                  onChange={(e) => setOverrideCount(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Resetting to 0 will give the sitter a clean quota slate.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedSitter(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingOverride}
                onClick={handleApplyOverride}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                {updatingOverride ? "Applying..." : "Save Sitter Override"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sitter Paywall Modal Preview */}
      <SitterMembershipModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        acceptedCount={3}
      />
    </div>
  );
}
