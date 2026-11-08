import React, { useState, useEffect } from "react";
import { 
  Share2, 
  DollarSign, 
  Gift, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Save, 
  RefreshCw, 
  Copy, 
  Sliders, 
  ExternalLink,
  Wallet,
  AlertCircle,
  Clock,
  Send
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";

interface ReferralConfig {
  referrer_reward_php: number;
  referee_discount_php: number;
  min_payout_php: number;
  payout_schedule: string;
  program_enabled: boolean;
}

interface ReferralRecord {
  id: number;
  user_id: number;
  referral_code: string;
  total_clicks: number;
  total_signups: number;
  total_bookings_completed: number;
  reward_balance_php: number;
  lifetime_earned_php: number;
  created_at: string;
  user_name: string | null;
  user_email: string;
  user_role: string;
}

export function AdminReferralsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [config, setConfig] = useState<ReferralConfig>({
    referrer_reward_php: 250,
    referee_discount_php: 150,
    min_payout_php: 250,
    payout_schedule: "Immediate / Manual",
    program_enabled: true,
  });

  const [stats, setStats] = useState<any>({
    total_codes: 0,
    total_clicks: 0,
    total_signups: 0,
    total_referral_bookings: 0,
    total_pending_payouts_php: 0,
    total_lifetime_paid_php: 0,
  });

  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Selected referral for adjustment
  const [selectedReferral, setSelectedReferral] = useState<ReferralRecord | null>(null);
  const [adjustBalance, setAdjustBalance] = useState<number>(0);
  const [adjustLifetime, setAdjustLifetime] = useState<number>(0);
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = user ? await user.getIdToken() : "";
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [configRes, listRes] = await Promise.all([
        fetch("/api/v1/admin/referral-config", { headers }),
        fetch("/api/v1/admin/referrals-overview", { headers })
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }

      if (listRes.ok) {
        const data = await listRes.json();
        setStats(data.stats || {});
        setReferrals(data.referrals || []);
      }
    } catch (err: any) {
      console.error("Failed to load referral data:", err);
      toast({ title: "Notice", description: "Loaded default referral rules", type: "info" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch("/api/v1/admin/referral-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        toast({ title: "Updated", description: "Referral program rewards & commission rules updated dynamically!", type: "success" });
      } else {
        const data = await res.json();
        toast({ title: "Failed", description: data.error || "Could not update config", type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "error" });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleMarkPaid = async (ref: ReferralRecord) => {
    if (ref.reward_balance_php <= 0) {
      toast({ title: "Notice", description: "This user has no pending commission balance to disburse.", type: "info" });
      return;
    }

    setProcessingAction(true);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch("/api/v1/admin/referrals/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          referralId: ref.id,
          markPaid: true
        })
      });

      if (res.ok) {
        toast({ 
          title: "Commission Disbursed", 
          description: `Disbursed ₱${ref.reward_balance_php} to ${ref.user_email}. Balance moved to lifetime earnings.`, 
          type: "success" 
        });
        fetchData();
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "error" });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSaveManualAdjustment = async () => {
    if (!selectedReferral) return;
    setProcessingAction(true);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch("/api/v1/admin/referrals/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          referralId: selectedReferral.id,
          rewardBalancePhp: adjustBalance,
          lifetimeEarnedPhp: adjustLifetime
        })
      });

      if (res.ok) {
        toast({ title: "Updated", description: "Commission balance updated.", type: "success" });
        setSelectedReferral(null);
        fetchData();
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "error" });
    } finally {
      setProcessingAction(false);
    }
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Copied", description: "Referral URL copied to clipboard!", type: "info" });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-100">
            <Share2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Growth & Commission Hub
              </span>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Live Tracking Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              Referral Link & Commission Module
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl">
              Dynamically adjust referral reward commissions, first-booking promo credits, monitor affiliate attribution, and process payouts.
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors self-start md:self-auto"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Link Clicks</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total_clicks}</div>
          <div className="text-xs text-slate-500 mt-1">Attributed visitors</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Signups Generated</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total_signups}</div>
          <div className="text-xs text-slate-500 mt-1">New pet owners & sitters</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Commissions</span>
            <Wallet className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700">
            ₱{Number(stats.total_pending_payouts_php).toLocaleString()}
          </div>
          <div className="text-xs text-amber-600/80 mt-1">Awaiting disbursement</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Lifetime Paid Out</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">
            ₱{Number(stats.total_lifetime_paid_php).toLocaleString()}
          </div>
          <div className="text-xs text-emerald-600/80 mt-1">Total rewards distributed</div>
        </div>
      </div>

      {/* Dynamic Program Settings Form */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Referral Program Commission Rules</h2>
              <p className="text-xs text-slate-500">Update rewards dynamically across all generated links and user accounts.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Referrer Reward */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Referrer Reward (Inviter)</span>
                <span className="text-emerald-600 font-black">₱{config.referrer_reward_php} PHP</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold text-sm">₱</span>
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={config.referrer_reward_php}
                  onChange={(e) => setConfig({ ...config, referrer_reward_php: parseInt(e.target.value, 10) || 0 })}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Amount credited to the referrer when an invited friend completes their first verified pet reservation.
              </p>
            </div>

            {/* Referee Discount */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Referee Discount (Invited Friend)</span>
                <span className="text-teal-600 font-black">₱{config.referee_discount_php} PHP</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold text-sm">₱</span>
                <input
                  type="number"
                  min={50}
                  step={25}
                  value={config.referee_discount_php}
                  onChange={(e) => setConfig({ ...config, referee_discount_php: parseInt(e.target.value, 10) || 0 })}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Discount automatically applied to the friend's first booking checkout.
              </p>
            </div>

            {/* Minimum Payout */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Minimum Payout Threshold</span>
                <span className="text-slate-900 font-black">₱{config.min_payout_php} PHP</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold text-sm">₱</span>
                <input
                  type="number"
                  min={100}
                  step={50}
                  value={config.min_payout_php}
                  onChange={(e) => setConfig({ ...config, min_payout_php: parseInt(e.target.value, 10) || 0 })}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Minimum accumulated commission required before a user can request payout.
              </p>
            </div>

            {/* Payout Schedule Description */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Disbursement Policy & Schedule
              </label>
              <input
                type="text"
                value={config.payout_schedule}
                onChange={(e) => setConfig({ ...config, payout_schedule: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. Every Friday via GCash / Maya"
              />
              <p className="text-[11px] text-slate-500">
                Displayed on user referral dashboards for transparency.
              </p>
            </div>

            {/* Program Enabled Switch */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Referral Program Status
              </label>
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {config.program_enabled ? "Active & Rewarding" : "Program Paused"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {config.program_enabled ? "Tracking links are generating rewards." : "Link clicks record but rewards paused."}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, program_enabled: !config.program_enabled })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    config.program_enabled ? "bg-emerald-600 justify-end" : "bg-slate-300 justify-start"
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={savingConfig}
                className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {savingConfig ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Referral Policies
                  </>
                )}
              </button>
            </div>

          </div>
        </form>
      </div>

      {/* Referral Accounts & Commission Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Referral Links & Commission Ledger</h2>
            <p className="text-xs text-slate-500">Monitor individual affiliate performance, click conversions, and approve payouts.</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {referrals.length} Active Affiliate Accounts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-extrabold">
              <tr>
                <th className="py-3.5 px-4">User & Role</th>
                <th className="py-3.5 px-4">Referral Code & Link</th>
                <th className="py-3.5 px-4">Clicks</th>
                <th className="py-3.5 px-4">Signups</th>
                <th className="py-3.5 px-4">Pending Balance</th>
                <th className="py-3.5 px-4">Lifetime Paid</th>
                <th className="py-3.5 px-4 text-right">Commission Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No referral accounts found in database.
                  </td>
                </tr>
              ) : (
                referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{r.user_name || "PawShield Member"}</div>
                      <div className="text-[11px] text-slate-500">{r.user_email}</div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        {r.user_role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                          {r.referral_code}
                        </span>
                        <button
                          onClick={() => copyLink(r.referral_code)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500"
                          title="Copy Full Referral URL"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {r.total_clicks}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {r.total_signups}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-black text-sm ${r.reward_balance_php > 0 ? "text-amber-600" : "text-slate-400"}`}>
                        ₱{r.reward_balance_php}
                      </span>
                      {r.reward_balance_php >= config.min_payout_php && (
                        <span className="block text-[9px] font-bold text-emerald-600">Ready for Payout</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      ₱{r.lifetime_earned_php}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleMarkPaid(r)}
                        disabled={processingAction || r.reward_balance_php <= 0}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all inline-flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Mark Disbursed
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReferral(r);
                          setAdjustBalance(r.reward_balance_php);
                          setAdjustLifetime(r.lifetime_earned_php);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Sliders className="w-3 h-3" /> Adjust
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Balance Adjust Dialog */}
      {selectedReferral && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Adjust Referral Balance</h3>
                  <p className="text-xs text-slate-500">{selectedReferral.user_email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReferral(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Unpaid Reward Balance (PHP)</label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={adjustBalance}
                  onChange={(e) => setAdjustBalance(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Lifetime Total Earned (PHP)</label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={adjustLifetime}
                  onChange={(e) => setAdjustLifetime(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReferral(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingAction}
                onClick={handleSaveManualAdjustment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                {processingAction ? "Saving..." : "Save Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
