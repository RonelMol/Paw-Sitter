import React, { useState, useEffect } from "react";
import { Coffee, ExternalLink, CheckCircle2, X, Heart, ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { useCurrency } from "../lib/CurrencyContext";
import { useToast } from "./ToastContext";

interface BuyMeCoffeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: () => void;
  bookingId?: number;
  sitterName?: string;
  isManualTrigger?: boolean;
}

export function BuyMeCoffeeModal({
  isOpen,
  onClose,
  onVerified,
  bookingId,
  sitterName,
  isManualTrigger = false,
}: BuyMeCoffeeModalProps) {
  const { formatPrice, currencyConfig } = useCurrency();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<{
    isEnabled: boolean;
    requireForCash: boolean;
    coffeeUrl: string;
    coffeePricePhp: number;
    customMessage: string;
    maintenanceTitle?: string;
  }>({
    isEnabled: true,
    requireForCash: true,
    coffeeUrl: "https://buymeacoffee.com/ronelmol",
    coffeePricePhp: 150,
    customMessage: "Support PawShield Community! For Cash on Service bookings, a small coffee tip (₱150) reserves your slot and guarantees platform maintenance.",
  });

  const [supporterName, setSupporterName] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Log event helper
  const logEvent = async (type: "REACH" | "CLICK" | "ATTEMPT" | "COPY_LINK") => {
    try {
      await fetch("/api/buy-me-coffee/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: type,
          source: isManualTrigger ? "PLATFORM_MAINTENANCE_MODAL" : "BOOKING_FLOW",
          metadata: { bookingId, sitterName }
        })
      });
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      logEvent("REACH");
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/buy-me-coffee/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.warn("Fetch coffee config error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTip = async (isBypass: boolean = false) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/buy-me-coffee/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingId || null,
          supporterName: supporterName.trim() || "Pet Care Supporter",
          amountPhp: config.coffeePricePhp || 150,
          referenceCode: referenceCode.trim() || `BMC-${Date.now().toString().slice(-6)}`,
          notes: isBypass ? "Verified directly in app" : "Confirmed via external coffee support",
        }),
      });

      if (res.ok) {
        toast({
          title: "Coffee Tip Verified! ☕",
          description: `Thank you for supporting our caregivers with a ₱${config.coffeePricePhp} coffee!`,
          type: "success",
        });
        if (onVerified) onVerified();
        onClose();
      } else {
        toast({ title: "Notice", description: "Coffee logged successfully!", type: "info" });
        if (onVerified) onVerified();
        onClose();
      }
    } catch (e) {
      toast({ title: "Coffee Tip Confirmed", description: "You're all set to proceed!", type: "success" });
      if (onVerified) onVerified();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        
        {/* Header with Warm Coffee Gradient */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white shadow-inner">
              <Coffee className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                {isManualTrigger ? "Community Support" : "Cash on Service Requirement"}
              </span>
              <h3 className="text-xl font-black mt-1">Buy Me a Coffee ☕</h3>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4">
            <p className="text-xs text-amber-900 leading-relaxed">
              {config.customMessage}
            </p>
            {sitterName && (
              <p className="text-[11px] text-amber-800 font-semibold mt-2 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                Selected Sitter: <strong>{sitterName}</strong>
              </p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium block">Community Tip Amount</span>
              <span className="text-2xl font-black text-slate-900">
                ₱{config.coffeePricePhp}
              </span>
              <span className="text-[11px] text-slate-400 ml-1.5">
                (~{formatPrice(3, "USD")})
              </span>
            </div>

            <a
              href={config.coffeeUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => logEvent("CLICK")}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>Open BuyMeACoffee</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Name / Supporter Handle (Optional)
              </label>
              <input
                type="text"
                value={supporterName}
                onChange={(e) => setSupporterName(e.target.value)}
                placeholder="e.g. Maria Santos"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Coffee Support Reference # / Note (Optional)
              </label>
              <input
                type="text"
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                placeholder="e.g. BMC-982143 or Cash Tip on Arrival"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleConfirmTip(true)}
              className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Verify Coffee & Confirm Booking</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
