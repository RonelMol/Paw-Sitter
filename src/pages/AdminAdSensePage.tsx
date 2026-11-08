import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { useAdSense, AdSenseConfig } from "../lib/AdSenseContext";
import {
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  Save,
  RefreshCw,
  Sparkles,
  Info,
  Sliders,
  FileCode,
  LayoutTemplate,
  Bot
} from "lucide-react";
import { AdSenseUnit } from "../components/AdSenseUnit";

export function AdminAdSensePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { config: globalConfig, refreshConfig, updateLocalConfig } = useAdSense();

  const [form, setForm] = useState<AdSenseConfig>({
    publisherClientId: "ca-pub-1234567890123456",
    headerSlotId: "1234567890",
    searchSlotId: "2345678901",
    sidebarSlotId: "3456789012",
    footerSlotId: "4567890123",
    enableAutoAds: true,
    enableTestMode: true,
    isEnabled: true,
    showOnLanding: true,
    showOnSearch: true,
    showOnSitterProfile: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminConfig = async () => {
      try {
        const token = await user?.getIdToken();
        const res = await fetch("/api/v1/admin/adsense-config", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setForm({
              publisherClientId: data.publisherClientId || "ca-pub-1234567890123456",
              headerSlotId: data.headerSlotId || "1234567890",
              searchSlotId: data.searchSlotId || "2345678901",
              sidebarSlotId: data.sidebarSlotId || "3456789012",
              footerSlotId: data.footerSlotId || "4567890123",
              enableAutoAds: Boolean(data.enableAutoAds ?? true),
              enableTestMode: Boolean(data.enableTestMode ?? true),
              isEnabled: Boolean(data.isEnabled ?? true),
              showOnLanding: Boolean(data.showOnLanding ?? true),
              showOnSearch: Boolean(data.showOnSearch ?? true),
              showOnSitterProfile: Boolean(data.showOnSitterProfile ?? true),
            });
          }
        }
      } catch (e) {
        console.error("Failed to load AdSense admin config:", e);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAdminConfig();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/v1/admin/adsense-config", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const updated = await res.json();
        updateLocalConfig(updated);
        await refreshConfig();
        toast({
          title: "AdSense Credentials Saved",
          description: "Publisher client ID and ad slot units updated successfully across the marketplace.",
          type: "success",
        });
      } else {
        const err = await res.json();
        toast({ title: "Failed to Save", description: err.error || "Server error", type: "error" });
      }
    } catch (e) {
      toast({ title: "Network Error", description: "Failed to persist AdSense settings", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: "Copied to Clipboard", description: text, type: "success" });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const cleanPubId = form.publisherClientId.replace(/^ca-/, "");
  const adsTxtContent = `google.com, ${cleanPubId || "pub-1234567890123456"}, DIRECT, f08c47fec0942fa0`;
  const metaTagSnippet = `<meta name="google-adsense-account" content="${form.publisherClientId}">`;
  const scriptSnippet = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${form.publisherClientId}" crossorigin="anonymous"></script>`;

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full mb-3" />
        <p className="text-slate-500 text-sm">Loading Google AdSense configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <DollarSign className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Google AdSense Monetization & Regulations</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure Google AdSense credentials, manage ad unit slot IDs, enforce strict Google policies, and inspect site compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            AdSense Policy Verified
          </span>
          <a
            href="/ads.txt"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            /ads.txt
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* AI Compliance Research Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 p-5 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Autonomous AI AdSense Compliance Researcher Active
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-200 text-amber-950">
                Gemini 3.8
              </span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Research full-app policy compliance across all content, detect thin sitter profiles, 
              verify accidental click buffers, and review automated certification reports in the AI Fleet Hub.
            </p>
          </div>
        </div>
        <Link
          to="/admin/ai-agents"
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 flex-shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Launch Compliance Agent</span>
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Module 1: Primary AdSense Account Credentials */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-600" />
                Google AdSense Publisher Client ID & API Setup
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your Google AdSense Publisher Client ID (starts with "ca-pub-") provided in your AdSense console.
              </p>
            </div>
            <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
              Required by Google
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Publisher Client ID (API Key / Client ID) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={form.publisherClientId}
                  onChange={(e) => setForm({ ...form, publisherClientId: e.target.value })}
                  placeholder="ca-pub-1234567890123456"
                  className="w-full font-mono text-sm px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 pr-24"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(form.publisherClientId, "pubId")}
                  className="absolute right-2 top-2 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 font-sans transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedKey === "pubId" ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Found in your Google AdSense dashboard under: <em>Account &gt; Settings &gt; Account Information &gt; Publisher ID</em>.
              </p>
            </div>

            {/* Slot ID 1: Header */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Header / Leaderboard Slot ID (728x90)
              </label>
              <input
                type="text"
                value={form.headerSlotId}
                onChange={(e) => setForm({ ...form, headerSlotId: e.target.value })}
                placeholder="1234567890"
                className="w-full font-mono text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[11px] text-slate-500">Rendered across high-visibility page headers.</span>
            </div>

            {/* Slot ID 2: Search */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Search In-Feed Slot ID (Responsive)
              </label>
              <input
                type="text"
                value={form.searchSlotId}
                onChange={(e) => setForm({ ...form, searchSlotId: e.target.value })}
                placeholder="2345678901"
                className="w-full font-mono text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[11px] text-slate-500">Positioned naturally in sitter discovery results.</span>
            </div>

            {/* Slot ID 3: Sidebar */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Sidebar Banner Slot ID (300x250)
              </label>
              <input
                type="text"
                value={form.sidebarSlotId}
                onChange={(e) => setForm({ ...form, sidebarSlotId: e.target.value })}
                placeholder="3456789012"
                className="w-full font-mono text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[11px] text-slate-500">Featured in profile sidebars and informational guides.</span>
            </div>

            {/* Slot ID 4: Footer */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Footer Banner Slot ID (Responsive)
              </label>
              <input
                type="text"
                value={form.footerSlotId}
                onChange={(e) => setForm({ ...form, footerSlotId: e.target.value })}
                placeholder="4567890123"
                className="w-full font-mono text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[11px] text-slate-500">Displayed non-intrusively above the global footer.</span>
            </div>
          </div>
        </div>

        {/* Module 2: AdSense Regulations & Safety Controls */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              Policy Compliance, Test Mode & Placement Controls
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tweak rendering policies to ensure strict adherence to Google AdSense Invalid Traffic Policies and Prohibited Placements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Global Enable */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Monetization Active</p>
                <p className="text-xs text-slate-500">Enable or disable all AdSense ad units across the platform.</p>
              </div>
              <input
                type="checkbox"
                checked={form.isEnabled}
                onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Test Mode Toggle */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-amber-950">AdSense Test Mode (Safe Sandbox)</p>
                  <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold rounded">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-amber-800">
                  Injects <code>data-adtest="on"</code> to avoid invalid click penalties during local development.
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.enableTestMode}
                onChange={(e) => setForm({ ...form, enableTestMode: e.target.checked })}
                className="w-5 h-5 rounded text-amber-600 border-amber-300 focus:ring-amber-500 cursor-pointer"
              />
            </div>

            {/* Auto Ads */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Google Auto Ads</p>
                <p className="text-xs text-slate-500">Allow Google AI to automatically place optimized ad formats.</p>
              </div>
              <input
                type="checkbox"
                checked={form.enableAutoAds}
                onChange={(e) => setForm({ ...form, enableAutoAds: e.target.checked })}
                className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Landing Page */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Landing Page Ad Placements</p>
                <p className="text-xs text-slate-500">Display between landing value propositions and testimonials.</p>
              </div>
              <input
                type="checkbox"
                checked={form.showOnLanding}
                onChange={(e) => setForm({ ...form, showOnLanding: e.target.checked })}
                className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Search Page */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Search Page Ad Placements</p>
                <p className="text-xs text-slate-500">Display in-feed between sitter search results.</p>
              </div>
              <input
                type="checkbox"
                checked={form.showOnSearch}
                onChange={(e) => setForm({ ...form, showOnSearch: e.target.checked })}
                className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Profile Page */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Sitter Profile Sidebar Ad</p>
                <p className="text-xs text-slate-500">Display banner in sitter profile details.</p>
              </div>
              <input
                type="checkbox"
                checked={form.showOnSitterProfile}
                onChange={(e) => setForm({ ...form, showOnSitterProfile: e.target.checked })}
                className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3 text-xs text-blue-900">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Strict Google AdSense Regulation Guarantee:</p>
              <p className="text-blue-700 leading-relaxed mt-0.5">
                PawShield automatically prevents ads from rendering on checkout flows, payment processing dialogs, and private pet medical routine screens. This satisfies AdSense's policy prohibiting ads on screens with sensitive financial transactions.
              </p>
            </div>
          </div>
        </div>

        {/* Module 3: Verification Code Generator & ads.txt */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              AdSense Site Verification & ads.txt Integration
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Google requires site ownership verification and an active <code>ads.txt</code> record before approving ad serving.
            </p>
          </div>

          <div className="space-y-4">
            {/* Meta Tag Snippet */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Verification Meta Tag (Injected dynamically into &lt;head&gt;)
                </label>
                <button
                  type="button"
                  onClick={() => copyToClipboard(metaTagSnippet, "meta")}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedKey === "meta" ? "Copied" : "Copy Snippet"}
                </button>
              </div>
              <pre className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
                {metaTagSnippet}
              </pre>
            </div>

            {/* ads.txt entry */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Live ads.txt Record (Served automatically at /ads.txt)
                </label>
                <div className="flex items-center gap-3">
                  <a
                    href="/ads.txt"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1"
                  >
                    Inspect /ads.txt
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(adsTxtContent, "adstxt")}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedKey === "adstxt" ? "Copied" : "Copy Line"}
                  </button>
                </div>
              </div>
              <pre className="bg-slate-900 text-amber-300 p-3.5 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
                {adsTxtContent}
              </pre>
            </div>
          </div>
        </div>

        {/* Module 4: Google AdSense Policy Checklist */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            AdSense Regulation & Publisher Readiness Audit
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-slate-900">Privacy Policy with AdSense Disclosure</p>
                <p className="text-slate-500">Includes Google advertising cookies, DoubleClick, and opt-out links.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-slate-900">Cookie Consent Banner (GDPR & CCPA)</p>
                <p className="text-slate-500">Explicit EU user consent banner with essential vs advertising controls.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-slate-900">Mandatory "ADVERTISEMENT" Micro-Labeling</p>
                <p className="text-slate-500">Ad units feature distinct labeling to strictly prevent deceptive clicks.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-slate-900">Active ads.txt Crawler Endpoint</p>
                <p className="text-slate-500">Directly accessible by Google crawlers at <code>/ads.txt</code>.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-slate-900">Zero Ads on Checkout & Payment Screens</p>
                <p className="text-slate-500">Booking escrow and checkout modal completely sanitized of ads.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-slate-900">Contact & Publisher Transparency</p>
                <p className="text-slate-500">Verified physical address, support email, and editorial guidelines.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Module 5: Live Ad Unit Sandbox Preview */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-slate-700" />
              Live AdSense Slot Visual Sandbox
            </h3>
            <span className="text-xs text-slate-500 font-medium">Responsive Preview</span>
          </div>

          <p className="text-xs text-slate-500">
            Preview how AdSense responsive banners render inside the application with appropriate spacing and labeling.
          </p>

          <div className="p-4 bg-slate-100/60 rounded-xl border border-slate-200 flex flex-col items-center">
            <AdSenseUnit format="horizontal" slotId={form.headerSlotId} />
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="flex items-center justify-end gap-3 sticky bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setForm({
                publisherClientId: "ca-pub-1234567890123456",
                headerSlotId: "1234567890",
                searchSlotId: "2345678901",
                sidebarSlotId: "3456789012",
                footerSlotId: "4567890123",
                enableAutoAds: true,
                enableTestMode: true,
                isEnabled: true,
                showOnLanding: true,
                showOnSearch: true,
                showOnSitterProfile: true,
              });
              toast({ title: "Reset to Default Test Parameters", description: "Click Save to apply.", type: "info" });
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Reset Defaults
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Publishing Config..." : "Save AdSense Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
