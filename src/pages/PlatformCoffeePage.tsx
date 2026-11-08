import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { Coffee, ExternalLink, Heart, ShieldCheck, CheckCircle2, Sparkles, Server, Zap, Lock, Copy, ShieldAlert } from "lucide-react";
import { useCurrency } from "../lib/CurrencyContext";
import { useToast } from "../components/ToastContext";
import { useAuth } from "../lib/AuthContext";

export function PlatformCoffeePage() {
  const { user, dbUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();

  const [config, setConfig] = useState<any>({
    coffeeUrl: "https://buymeacoffee.com/ronelmol",
    coffeePricePhp: 150,
    maintenanceTitle: "Platform & Infrastructure Maintenance Fund",
    customMessage: "Help us keep PawShield lightning-fast, highly reliable, and secure for thousands of pets and sitters across the country.",
    goalAmountPhp: 5000,
  });
  const [supporterName, setSupporterName] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Access control: Coffee Fund Module is restricted exclusively to ADMIN
  if (!authLoading && dbUser?.role !== "ADMIN") {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900">Admin Access Restricted</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            The Coffee Fund & Platform Maintenance Module is reserved exclusively for Platform Administrators.
          </p>
          <Link
            to="/"
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors inline-block"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Log Reach Event
    fetch("/api/buy-me-coffee/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "REACH", source: "PLATFORM_COFFEE_PAGE" })
    }).catch(() => {});

    // Fetch live config
    fetch("/api/buy-me-coffee/config")
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(console.warn);
  }, []);

  const handleLinkClick = () => {
    fetch("/api/buy-me-coffee/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "CLICK", source: "PLATFORM_COFFEE_PAGE" })
    }).catch(() => {});
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(config.coffeeUrl || "https://buymeacoffee.com/ronelmol");
    toast({ title: "Link Copied!", description: "Buy Me a Coffee URL copied to clipboard.", type: "success" });
    fetch("/api/buy-me-coffee/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "COPY_LINK", source: "PLATFORM_COFFEE_PAGE" })
    }).catch(() => {});
  };

  const handleSubmitTip = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/buy-me-coffee/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supporterName: supporterName.trim() || user?.displayName || "Community Member",
          amountPhp: config.coffeePricePhp || 150,
          referenceCode: referenceCode.trim() || `COFFEE-${Date.now().toString().slice(-6)}`,
          notes: "Contributed from Platform Maintenance Page",
        })
      });

      if (res.ok) {
        setSubmitted(true);
        toast({ title: "Thank You! ☕", description: "Your coffee tip has been recorded. We appreciate your support!", type: "success" });
      }
    } catch (e) {
      toast({ title: "Error submitting tip", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl space-y-10 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden text-center sm:text-left">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur rounded-full text-xs font-bold uppercase tracking-wider text-amber-200">
            <Coffee className="w-4 h-4" /> Platform Infrastructure & Maintenance
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            {config.maintenanceTitle || "Platform Maintenance Fund"}
          </h1>
          <p className="text-sm sm:text-base text-amber-100/90 leading-relaxed">
            {config.customMessage || "Support our community servers, 24/7 GPS pet tracking, and escrow infrastructure. A small coffee goes a long way!"}
          </p>

          <div className="pt-2 flex flex-wrap gap-3 justify-center sm:justify-start">
            <a
              href={config.coffeeUrl || "https://buymeacoffee.com/ronelmol"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="px-6 py-3.5 bg-white text-slate-900 font-black text-sm rounded-2xl shadow-lg hover:bg-amber-50 active:scale-95 transition-all flex items-center gap-2"
            >
              <Coffee className="w-4 h-4 text-amber-600" />
              <span>Buy Us a Coffee (₱{config.coffeePricePhp || 150})</span>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>

            <button
              onClick={handleCopyLink}
              className="px-5 py-3.5 bg-white/15 hover:bg-white/25 text-white font-bold text-sm rounded-2xl backdrop-blur transition-all flex items-center gap-2"
            >
              <Copy className="w-4 h-4" /> Copy Direct Link
            </button>
          </div>
        </div>
      </div>

      {/* Feature Cards: What Your Coffee Funds */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Cloud Servers & DB Uptime</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Keeps PawShield available 24/7 with zero lag, instant notifications, and automated database backups.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Real-Time Live GPS Care</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Powers caregiver geolocation tracking so pet owners know their dogs and cats are safe at all times.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Fraud & Escrow Protection</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Maintains the cryptographic escrow security and caregiver background verification pipeline.
          </p>
        </div>
      </div>

      {/* Supporter Confirmation Card */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-slate-900">Already Sent a Coffee?</h2>
          <p className="text-xs text-slate-500">
            Enter your reference code or name so we can record your support in the platform hall of fame!
          </p>
        </div>

        {submitted ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-emerald-900 text-sm">Thank You for Fueling PawShield!</h4>
            <p className="text-xs text-emerald-700">
              Your contribution helps keep the platform free, fast, and secure for everyone.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitTip} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Your Name / Handle
              </label>
              <input
                type="text"
                value={supporterName}
                onChange={(e) => setSupporterName(e.target.value)}
                placeholder="e.g. Maria Santos"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reference Code or Message
              </label>
              <input
                type="text"
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                placeholder="e.g. BMC-10294 or 'Keep up the good work!'"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {submitting ? "Recording..." : "Record My Coffee Tip"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
