import React, { useState, useEffect } from "react";
import { Share2, Copy, Check, Gift, Users, Award, ExternalLink, ArrowRight, DollarSign, X, Loader2 } from "lucide-react";
import { useToast } from "./ToastContext";
import { useCurrency } from "../lib/CurrencyContext";

interface ReferralShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReferralShareModal({ isOpen, onClose }: ReferralShareModalProps) {
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchReferral();
    }
  }, [isOpen]);

  const fetchReferral = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/referrals/me");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.warn("Fetch referral error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    toast({ title: "Link Copied!", description: "Share your referral link with pet parents and sitters!", type: "success" });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClaimPayout = async () => {
    setClaiming(true);
    try {
      const res = await fetch("/api/referrals/claim-payout", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        toast({ title: "Payout Requested!", description: json.message, type: "success" });
        fetchReferral();
      } else {
        toast({ title: "Payout Notice", description: json.error || "Cannot claim payout yet.", type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: "Network error requesting payout", type: "error" });
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen) return null;

  const ref = data?.referral;
  const balance = ref?.reward_balance_php || 0;
  const lifetime = ref?.lifetime_earned_php || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white shadow-inner">
              <Gift className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                Earn ₱250 Per Referral
              </span>
              <h3 className="text-xl font-black mt-1">PawShield Referral Program</h3>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <span className="text-[10px] text-slate-400 font-bold block">Clicks</span>
              <span className="text-lg font-black text-slate-900">{ref?.total_clicks || 0}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <span className="text-[10px] text-slate-400 font-bold block">Signups</span>
              <span className="text-lg font-black text-slate-900">{ref?.total_signups || 0}</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
              <span className="text-[10px] text-emerald-600 font-bold block">Available Balance</span>
              <span className="text-lg font-black text-emerald-700">₱{balance}</span>
            </div>
          </div>

          {/* Link Copy Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Your Personal Referral Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={data?.referralLink || "Generating your link..."}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Quick Share:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Book verified pet care on PawShield! Use my link: ${data?.referralLink}`)}`}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold text-center transition-colors"
              >
                WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data?.referralLink || "")}`}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold text-center transition-colors"
              >
                Facebook
              </a>
              <a
                href={`viber://forward?text=${encodeURIComponent(`Book verified pet care on PawShield! Use my link: ${data?.referralLink}`)}`}
                className="py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold text-center transition-colors"
              >
                Viber
              </a>
            </div>
          </div>

          {/* Payout Claim Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Payout to Disbursement Bank</span>
              <span className="text-[11px] text-slate-500">Min. payout ₱250 (Direct to BDO, BPI, GCash, Maya)</span>
            </div>

            <button
              type="button"
              disabled={claiming || balance < 250}
              onClick={handleClaimPayout}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              {claiming ? "Processing..." : "Claim Payout"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
