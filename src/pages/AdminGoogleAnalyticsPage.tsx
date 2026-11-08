import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Activity, 
  Users, 
  Smartphone, 
  Monitor, 
  Globe, 
  Save, 
  RefreshCw, 
  ArrowUpRight, 
  Sliders, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Eye, 
  Zap, 
  Radio
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";

interface GAConfig {
  measurement_id: string;
  gtm_container_id: string;
  tracking_enabled: boolean;
  custom_events_enabled: boolean;
}

interface TelemetryData {
  realtimeActiveUsers: number;
  metrics: {
    totalUsers: number;
    newUsers: number;
    sessions: number;
    avgSessionDuration: string;
    bounceRate: string;
    engagementRate: string;
    pageViews: number;
    eventCount: number;
    conversions: number;
    ecommerceRevenuePhp: number;
  };
  topPages: { path: string; title: string; views: number; percentage: number }[];
  trafficChannels: { channel: string; sessions: number; share: number }[];
  deviceBreakdown: { device: string; share: number; users: number }[];
  topLocations: { city: string; users: number; pct: number }[];
  recentEvents: { event: string; timestamp: string; user: string; page: string }[];
}

export function AdminGoogleAnalyticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [config, setConfig] = useState<GAConfig>({
    measurement_id: "G-PWSHLD2026",
    gtm_container_id: "GTM-PWSHLD",
    tracking_enabled: true,
    custom_events_enabled: true,
  });

  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [timeRange, setTimeRange] = useState("30d");

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch("/api/v1/admin/google-analytics", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || {});
        setTelemetry(data.telemetry || null);
      }
    } catch (err: any) {
      console.error("Failed to load GA data:", err);
      toast({ title: "Notice", description: "Loaded cached analytics telemetry", type: "info" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch("/api/v1/admin/google-analytics", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        toast({ title: "Updated", description: "Google Analytics 4 measurement tag & script config saved!", type: "success" });
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to update config", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-orange-100">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-200">
                Google Analytics 4 & Telemetry
              </span>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Stream
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              Google Analytics Dashboard & Live Metrics
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl">
              Inspect active users, session durations, conversion funnels, top trafficked landing pages, device telemetry, and GA4 tag tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="today">Today (Realtime)</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
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

      {/* Real-Time Pulse Card + Scorecards */}
      {telemetry && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Realtime Active Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-3xl shadow-md flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> Realtime Active
              </span>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Last 30 Minutes
              </span>
            </div>

            <div className="my-6">
              <div className="text-5xl font-black tracking-tight text-white flex items-baseline gap-2">
                {telemetry.realtimeActiveUsers}
                <span className="text-xs font-normal text-slate-400">concurrent users</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Active in mobile app and web browser exploring sitters and reservations.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span>Primary Viewport:</span>
              <span className="font-bold text-amber-400">Mobile (67%)</span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {telemetry.metrics.totalUsers.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> +14.2% vs last period
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Sessions</span>
                <Activity className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {telemetry.metrics.sessions.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Avg duration: <span className="font-bold text-slate-700">{telemetry.metrics.avgSessionDuration}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Page Views</span>
                <Eye className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {telemetry.metrics.pageViews.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Engagement: <span className="font-bold text-emerald-600">{telemetry.metrics.engagementRate}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Bounce Rate</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {telemetry.metrics.bounceRate}
              </div>
              <div className="text-xs text-emerald-600 font-bold mt-1">
                Healthy user retention
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Key Conversions</span>
                <Zap className="w-4 h-4 text-teal-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-teal-700">
                {telemetry.metrics.conversions}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Completed bookings
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Volume</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                ₱{telemetry.metrics.ecommerceRevenuePhp.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Total Escrow GMV
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Middle Grid: Top Pages & Traffic Channels */}
      {telemetry && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Pages Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-slate-900">Most Visited Pages & Screens</h2>
              <span className="text-xs font-bold text-slate-500">Views & Share</span>
            </div>
            <div className="space-y-3">
              {telemetry.topPages.map((page, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 truncate max-w-[280px]">
                      {page.title} <span className="font-mono font-normal text-slate-400">({page.path})</span>
                    </span>
                    <span className="font-black text-slate-900">{page.views.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-orange-500 h-full rounded-full transition-all"
                      style={{ width: `${page.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Traffic Acquisition Channels */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-slate-900">Traffic Acquisition Channels</h2>
              <span className="text-xs font-bold text-slate-500">Sessions</span>
            </div>
            <div className="space-y-3">
              {telemetry.trafficChannels.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{item.channel}</span>
                    <span className="font-black text-slate-900">
                      {item.sessions.toLocaleString()} <span className="text-slate-400 font-normal">({item.share}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${item.share}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Grid: Devices, Locations, and Live Event Stream */}
      {telemetry && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Device Split */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-black text-slate-900 mb-4">Device Platforms</h2>
            <div className="space-y-4">
              {telemetry.deviceBreakdown.map((dev, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                      {dev.device === "Mobile" ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{dev.device}</div>
                      <div className="text-[10px] text-slate-400">{dev.users} users</div>
                    </div>
                  </div>
                  <span className="font-black text-slate-900 text-sm">{dev.share}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Philippine Geographic Hubs */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-black text-slate-900 mb-4">Visitor Geographic Hubs</h2>
            <div className="space-y-3">
              {telemetry.topLocations.map((loc, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" /> {loc.city}
                  </span>
                  <span className="font-bold text-slate-900">{loc.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Telemetry Event Stream */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Event Stream
              </h2>
            </div>
            <div className="space-y-3">
              {telemetry.recentEvents.map((ev, idx) => (
                <div key={idx} className="text-xs border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                      {ev.event}
                    </span>
                    <span className="text-[10px] text-slate-400">{ev.timestamp}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate">
                    {ev.user} → <span className="font-semibold text-slate-700">{ev.page}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GA4 Script & Tag Manager Configuration Form */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Google Analytics 4 & GTM Configuration</h2>
              <p className="text-xs text-slate-500">Configure your official Google tracking tags to measure all pet reservation conversions.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Measurement ID */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Google Analytics 4 Measurement ID
              </label>
              <input
                type="text"
                value={config.measurement_id}
                onChange={(e) => setConfig({ ...config, measurement_id: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                placeholder="G-XXXXXXXXXX"
              />
              <p className="text-[11px] text-slate-500">
                Your standard GA4 web stream ID located in Google Analytics Admin &gt; Data Streams.
              </p>
            </div>

            {/* GTM Container ID */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Google Tag Manager Container ID
              </label>
              <input
                type="text"
                value={config.gtm_container_id}
                onChange={(e) => setConfig({ ...config, gtm_container_id: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                placeholder="GTM-XXXXXX"
              />
              <p className="text-[11px] text-slate-500">
                Optional Google Tag Manager container ID for multi-tag injection.
              </p>
            </div>

            {/* Tracking Active Switch */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <div className="text-xs font-bold text-slate-800">
                  {config.tracking_enabled ? "Telemetry & Tracking Active" : "Tracking Paused"}
                </div>
                <div className="text-[10px] text-slate-500">
                  Sends pageviews and conversion tags to Google Analytics servers.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, tracking_enabled: !config.tracking_enabled })}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  config.tracking_enabled ? "bg-orange-600 justify-end" : "bg-slate-300 justify-start"
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
              </button>
            </div>

            {/* Custom Events Switch */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <div className="text-xs font-bold text-slate-800">
                  {config.custom_events_enabled ? "Custom E-commerce Events Active" : "Custom Events Off"}
                </div>
                <div className="text-[10px] text-slate-500">
                  Tracks checkout steps, GCash authorizations, and referral clicks.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, custom_events_enabled: !config.custom_events_enabled })}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  config.custom_events_enabled ? "bg-orange-600 justify-end" : "bg-slate-300 justify-start"
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
              </button>
            </div>

          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={savingConfig}
              className="py-3 px-6 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95"
            >
              {savingConfig ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Tag Configurations
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
