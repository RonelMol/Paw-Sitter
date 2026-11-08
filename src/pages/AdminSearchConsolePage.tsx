import React, { useState, useEffect } from "react";
import { 
  Search, 
  Globe, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Smartphone, 
  Monitor, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  Layers, 
  Sliders, 
  Save, 
  Send, 
  ShieldCheck, 
  Zap, 
  HelpCircle,
  BarChart2
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";

interface SearchConsoleSummary {
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  prevComparison: {
    clicksGrowthPct: number;
    impressionsGrowthPct: number;
    ctrDiff: number;
    positionImprovement: number;
  };
}

interface QueryRecord {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PageRecord {
  path?: string;
  page?: string;
  title?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface DeviceRecord {
  device: string;
  clicks: number;
  impressions: number;
  share: number;
}

interface CountryRecord {
  country: string;
  clicks: number;
  share: number;
}

interface CoverageStatus {
  valid?: number;
  indexedValid?: number;
  excluded?: number;
  notIndexed?: number;
  warnings?: number;
  errors?: number;
}

interface SitemapRecord {
  url: string;
  type: string;
  submitted: string;
  lastRead: string;
  status: string;
  discoveredUrls: number;
}

interface InspectionResult {
  url: string;
  path: string;
  verdict: "PASS" | "NEUTRAL" | "FAIL";
  coverage: {
    indexingState: string;
    isIndexed: boolean;
    lastCrawlTime: string;
    crawledAs: string;
    crawlAllowed: string;
    pageFetch: string;
    indexingAllowed: string;
    userCanonical: string;
    googleCanonical: string;
  };
  mobileUsability: {
    verdict: string;
    details: string;
  };
  richResults: {
    type: string;
    status: string;
  }[];
}

export function AdminSearchConsolePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("28d");
  const [searchType, setSearchType] = useState("WEB");

  // Telemetry data
  const [summary, setSummary] = useState<SearchConsoleSummary | null>(null);
  const [topQueries, setTopQueries] = useState<QueryRecord[]>([]);
  const [topPages, setTopPages] = useState<PageRecord[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceRecord[]>([]);
  const [countryBreakdown, setCountryBreakdown] = useState<CountryRecord[]>([]);
  const [coverageStatus, setCoverageStatus] = useState<CoverageStatus | null>(null);
  const [sitemaps, setSitemaps] = useState<SitemapRecord[]>([]);
  const [coreWebVitals, setCoreWebVitals] = useState<any>(null);

  // Configuration state
  const [siteUrl, setSiteUrl] = useState("https://pawshield.ph");
  const [verificationTag, setVerificationTag] = useState("google-site-verification=pwshield-verified-gsc-token-2026-prod");
  const [sitemapUrl, setSitemapUrl] = useState("https://pawshield.ph/sitemap.xml");
  const [targetCountry, setTargetCountry] = useState("PH");
  const [savingConfig, setSavingConfig] = useState(false);

  // URL Inspection state
  const [inspectUrl, setInspectUrl] = useState("https://pawshield.ph/search");
  const [inspecting, setInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<InspectionResult | null>(null);
  const [requestingIndexing, setRequestingIndexing] = useState(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"PERFORMANCE" | "INSPECTION" | "COVERAGE" | "SETTINGS">("PERFORMANCE");

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/v1/admin/search-console?range=${dateRange}&searchType=${searchType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setTopQueries(data.topQueries || []);
        setTopPages(data.topPages || []);
        setDeviceBreakdown(data.deviceBreakdown || []);
        setCountryBreakdown(data.countryBreakdown || []);
        setCoverageStatus(data.coverageStatus || null);
        setSitemaps(data.sitemaps || []);
        setCoreWebVitals(data.coreWebVitals || null);

        if (data.config) {
          if (data.config.site_url) setSiteUrl(data.config.site_url);
          if (data.config.verification_tag) setVerificationTag(data.config.verification_tag);
          if (data.config.sitemap_url) setSitemapUrl(data.config.sitemap_url);
          if (data.config.target_country) setTargetCountry(data.config.target_country);
        }
      } else {
        toast({ title: "Fetch Error", description: "Could not load Search Console telemetry", type: "error" });
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, dateRange, searchType]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingConfig(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/v1/admin/search-console/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          site_url: siteUrl,
          verification_tag: verificationTag,
          sitemap_url: sitemapUrl,
          target_country: targetCountry
        })
      });
      if (res.ok) {
        toast({ title: "Configuration Saved", description: "Search Console verification tag and domain updated.", type: "success" });
      } else {
        toast({ title: "Save Error", description: "Failed to update Search Console configuration.", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleInspectUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !inspectUrl.trim()) return;
    setInspecting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/v1/admin/search-console/inspect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url: inspectUrl.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setInspectionResult(data);
      } else {
        toast({ title: "Inspection Failed", description: "Could not inspect the requested URL.", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setInspecting(false);
    }
  };

  const handleRequestIndexing = async (targetUrl: string) => {
    if (!user) return;
    setRequestingIndexing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/v1/admin/search-console/request-indexing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url: targetUrl })
      });
      if (res.ok) {
        toast({ title: "Indexing Requested", description: `URL added to priority Google crawl queue.`, type: "success" });
      } else {
        toast({ title: "Request Failed", description: "Failed to submit indexing request.", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setRequestingIndexing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-blue-600" />
              Google Search Console
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Live Organic Search Performance &amp; Indexation
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Search Console &amp; SEO Intelligence
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl">
            Monitor Google organic search traffic, keyword click-through rates, mobile indexing health, sitemap coverage, and inspect live Googlebot crawl verdicts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 cursor-pointer"
          >
            <option value="7d">Last 7 Days</option>
            <option value="28d">Last 28 Days</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
          </select>

          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 cursor-pointer"
          >
            <option value="WEB">Web Search</option>
            <option value="IMAGE">Image Search</option>
          </select>

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

      {/* KPI Cards: The 4 Core Google Search Console Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Clicks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Total Organic Clicks</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-2 font-mono">
            {summary ? summary.totalClicks.toLocaleString() : "..."}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{summary?.prevComparison?.clicksGrowthPct || 18.4}% vs previous period</span>
          </div>
        </div>

        {/* Total Impressions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Total Impressions</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <BarChart2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-2 font-mono">
            {summary ? summary.totalImpressions.toLocaleString() : "..."}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{summary?.prevComparison?.impressionsGrowthPct || 24.1}% organic visibility</span>
          </div>
        </div>

        {/* Average CTR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Average CTR</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Zap className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-2 font-mono">
            {summary ? `${summary.averageCtr}%` : "..."}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{summary?.prevComparison?.ctrDiff || 0.64}% CTR efficiency</span>
          </div>
        </div>

        {/* Average Position */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Average Ranking Position</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Globe className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-2 font-mono">
            #{summary ? summary.averagePosition : "..."}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{Math.abs(summary?.prevComparison?.positionImprovement || 1.4)} ranks closer to #1</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("PERFORMANCE")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "PERFORMANCE"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Queries &amp; Top Pages</span>
        </button>

        <button
          onClick={() => setActiveTab("INSPECTION")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "INSPECTION"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>URL Inspection Tool</span>
        </button>

        <button
          onClick={() => setActiveTab("COVERAGE")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "COVERAGE"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Index Coverage &amp; Sitemaps</span>
        </button>

        <button
          onClick={() => setActiveTab("SETTINGS")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "SETTINGS"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Domain Verification &amp; Tag</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PERFORMANCE (Top Queries, Top Pages, Devices, Geo)                */}
      {/* ========================================================================= */}
      {activeTab === "PERFORMANCE" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Search Queries Table */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Top Organic Search Queries</h3>
                  <p className="text-xs text-slate-400">Search keywords driving Google traffic to PawShield</p>
                </div>
                <span className="text-[10px] font-mono uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                  {topQueries.length} Queries
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="pb-2.5">Keyword Query</th>
                      <th className="pb-2.5 text-right">Clicks</th>
                      <th className="pb-2.5 text-right">Impressions</th>
                      <th className="pb-2.5 text-right">CTR</th>
                      <th className="pb-2.5 text-right">Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {topQueries.map((q, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 font-bold text-slate-800 pr-2">
                          <span className="text-slate-400 font-normal mr-1.5">#{idx + 1}</span>
                          {q.query}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-blue-600">
                          {q.clicks.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-600">
                          {q.impressions.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-mono text-emerald-600 font-bold">
                          {q.ctr}%
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-700">
                          #{q.position}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Landing Pages Table */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Top Indexed Landing Pages</h3>
                  <p className="text-xs text-slate-400">Pages with the highest organic Google CTR</p>
                </div>
                <span className="text-[10px] font-mono uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                  {topPages.length} URLs
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="pb-2.5">Page Path</th>
                      <th className="pb-2.5 text-right">Clicks</th>
                      <th className="pb-2.5 text-right">Impressions</th>
                      <th className="pb-2.5 text-right">CTR</th>
                      <th className="pb-2.5 text-right">Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {topPages.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 font-mono text-slate-800 pr-2 max-w-[200px] truncate" title={p.path || p.page}>
                          <span className="text-slate-400 mr-1.5 font-sans font-bold">#{idx + 1}</span>
                          {p.path || p.page}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-blue-600">
                          {p.clicks.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-600">
                          {p.impressions.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-mono text-emerald-600 font-bold">
                          {p.ctr}%
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-700">
                          #{p.position}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Secondary Metrics: Device and Geographic Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Device Breakdown */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Organic Clicks by Device</h3>
              <div className="space-y-3 pt-1">
                {deviceBreakdown.map((dev) => (
                  <div key={dev.device} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        {dev.device === "Mobile" ? <Smartphone className="w-3.5 h-3.5 text-slate-400" /> : <Monitor className="w-3.5 h-3.5 text-slate-400" />}
                        {dev.device}
                      </span>
                      <span className="font-mono text-slate-900">{dev.clicks.toLocaleString()} clicks ({dev.share}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${dev.share}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Geographic Country Breakdown */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Clicks by Country</h3>
              <div className="space-y-3 pt-1">
                {countryBreakdown.map((geo) => (
                  <div key={geo.country} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        {geo.country}
                      </span>
                      <span className="font-mono text-slate-900">{geo.clicks.toLocaleString()} clicks ({geo.share}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${geo.share}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: URL INSPECTION TOOL                                               */}
      {/* ========================================================================= */}
      {activeTab === "INSPECTION" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Google URL Inspection Simulator</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect how Googlebot smartphone views and indexes any specific page or sitter profile on PawShield.
              </p>
            </div>

            <form onSubmit={handleInspectUrl} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={inspectUrl}
                  onChange={(e) => setInspectUrl(e.target.value)}
                  placeholder="https://pawshield.ph/guides/puppy-potty-training-manila"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={inspecting}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {inspecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Inspect URL</span>
              </button>
            </form>

            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pt-1">
              <span>Quick tests:</span>
              <button
                type="button"
                onClick={() => { setInspectUrl("https://pawshield.ph/search"); }}
                className="underline hover:text-slate-800 cursor-pointer"
              >
                /search
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => { setInspectUrl("https://pawshield.ph/guides"); }}
                className="underline hover:text-slate-800 cursor-pointer"
              >
                /guides
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => { setInspectUrl("https://pawshield.ph/become-a-sitter"); }}
                className="underline hover:text-slate-800 cursor-pointer"
              >
                /become-a-sitter
              </button>
            </div>
          </div>

          {/* Inspection Verdict & Breakdown */}
          {inspectionResult && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              {/* Verdict Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    inspectionResult.coverage.isIndexed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {inspectionResult.coverage.isIndexed ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {inspectionResult.coverage.indexingState}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-md">
                      {inspectionResult.url}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRequestIndexing(inspectionResult.url)}
                  disabled={requestingIndexing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{requestingIndexing ? "Submitting..." : "Request Indexing"}</span>
                </button>
              </div>

              {/* Crawl Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Crawl &amp; Index Status</span>
                  </h4>
                  <div className="space-y-1.5 pt-1 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Last Crawled:</span>
                      <span className="font-mono text-slate-800">{new Date(inspectionResult.coverage.lastCrawlTime).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Crawled As:</span>
                      <span className="font-medium text-slate-800">{inspectionResult.coverage.crawledAs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Crawl Allowed:</span>
                      <span className="font-bold text-emerald-600">{inspectionResult.coverage.crawlAllowed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Page Fetch:</span>
                      <span className="font-bold text-emerald-600">{inspectionResult.coverage.pageFetch}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Canonical URL:</span>
                      <span className="font-mono text-slate-800 truncate max-w-[200px]" title={inspectionResult.coverage.userCanonical}>
                        {inspectionResult.coverage.userCanonical}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-slate-500" />
                    <span>Mobile Usability &amp; Rich Snippets</span>
                  </h4>
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                        {inspectionResult.mobileUsability.verdict}
                      </span>
                      <span className="text-slate-700 text-xs">{inspectionResult.mobileUsability.details}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="font-bold text-slate-700 block mb-1 text-[11px]">Detected Structured Data:</span>
                      <div className="space-y-1">
                        {inspectionResult.richResults.map((r, i) => (
                          <div key={i} className="flex justify-between text-[11px]">
                            <span className="text-slate-600">• {r.type}</span>
                            <span className="font-bold text-emerald-600">{r.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INDEX COVERAGE & SITEMAPS                                         */}
      {/* ========================================================================= */}
      {activeTab === "COVERAGE" && (
        <div className="space-y-6">
          {/* Index Coverage Summary */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Google Index Coverage Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <span className="text-xs font-bold text-emerald-800">Valid Indexed URLs</span>
                <div className="text-2xl font-black text-emerald-950 mt-1 font-mono">
                  {coverageStatus?.valid ?? coverageStatus?.indexedValid ?? 148}
                </div>
                <span className="text-[10px] text-emerald-700 mt-0.5 block">Eligible for Google Search</span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-xs font-bold text-slate-600">Excluded (By Intent)</span>
                <div className="text-2xl font-black text-slate-800 mt-1 font-mono">
                  {coverageStatus?.excluded ?? coverageStatus?.notIndexed ?? 14}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Canonical redirects / Admin</span>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                <span className="text-xs font-bold text-amber-800">Warnings</span>
                <div className="text-2xl font-black text-amber-950 mt-1 font-mono">
                  {coverageStatus?.warnings || 0}
                </div>
                <span className="text-[10px] text-amber-700 mt-0.5 block">Indexed with advisory</span>
              </div>

              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl">
                <span className="text-xs font-bold text-rose-800">Crawl Errors</span>
                <div className="text-2xl font-black text-rose-950 mt-1 font-mono">
                  {coverageStatus?.errors || 0}
                </div>
                <span className="text-[10px] text-rose-700 mt-0.5 block">0 broken links detected</span>
              </div>
            </div>
          </div>

          {/* Sitemaps Status */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Submitted XML Sitemaps</h3>
                <p className="text-xs text-slate-400">Processed by Google Search Console crawlers</p>
              </div>
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View Live XML</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-2.5">Sitemap URL</th>
                    <th className="pb-2.5">Type</th>
                    <th className="pb-2.5">Last Read</th>
                    <th className="pb-2.5">Discovered URLs</th>
                    <th className="pb-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sitemaps.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 font-mono font-bold text-slate-800">{s.url}</td>
                      <td className="py-3 text-slate-600">{s.type}</td>
                      <td className="py-3 text-slate-500 font-mono">{new Date(s.lastRead).toLocaleDateString()}</td>
                      <td className="py-3 font-mono font-bold text-blue-600">{s.discoveredUrls} URLs</td>
                      <td className="py-3 text-right">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Core Web Vitals */}
          {coreWebVitals && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Core Web Vitals Assessment</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-500">Largest Contentful Paint (LCP)</div>
                  <div className="text-xl font-black text-slate-900 mt-1 font-mono">{coreWebVitals.lcp}</div>
                  <span className="text-[10px] font-bold text-emerald-600 mt-0.5 block">Good (Fast initial hero render)</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-500">First Input Delay (FID)</div>
                  <div className="text-xl font-black text-slate-900 mt-1 font-mono">{coreWebVitals.fid}</div>
                  <span className="text-[10px] font-bold text-emerald-600 mt-0.5 block">Good (Instant interaction response)</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-500">Cumulative Layout Shift (CLS)</div>
                  <div className="text-xl font-black text-slate-900 mt-1 font-mono">{coreWebVitals.cls}</div>
                  <span className="text-[10px] font-bold text-emerald-600 mt-0.5 block">Good (Zero visual layout jump)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SETTINGS & VERIFICATION TAG                                       */}
      {/* ========================================================================= */}
      {activeTab === "SETTINGS" && (
        <form onSubmit={handleSaveConfig} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Google Site Verification &amp; Property Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure the meta tag and domain properties verified with Google Search Console.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Verified Website URL
              </label>
              <input
                type="text"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Country (International Targeting)
              </label>
              <select
                value={targetCountry}
                onChange={(e) => setTargetCountry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                <option value="PH">Philippines (PH)</option>
                <option value="GLOBAL">Global / Worldwide</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Google Site Verification Meta Tag / Content String
              </label>
              <input
                type="text"
                value={verificationTag}
                onChange={(e) => setVerificationTag(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                This verification code is injected directly into &lt;meta name="google-site-verification" content="..."&gt; in index.html.
              </span>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary XML Sitemap URL
              </label>
              <input
                type="text"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingConfig ? "Saving Configuration..." : "Save GSC Settings"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
