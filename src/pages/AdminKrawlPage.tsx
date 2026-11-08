import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Shield, 
  Bug, 
  Radar, 
  Activity, 
  Zap, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink, 
  Sliders, 
  Terminal, 
  Ban, 
  Lock, 
  Play,
  FileCode,
  Flame
} from "lucide-react";
import { useToast } from "../components/ToastContext";

interface KrawlMetrics {
  totalTrapped: number;
  wastedSeconds: number;
  threatLevel: string;
  activeDecoys: number;
  activeTraps: number;
  quarantinedIpsCount: number;
}

interface AttackLog {
  id: number;
  ip_address: string;
  user_agent: string;
  target_path: string;
  attack_type: string;
  payload: string;
  action_taken: string;
  delay_ms: number;
  reputation_score: number;
  created_at: string;
}

interface QuarantinedIp {
  ip_address: string;
  attack_type: string;
  score: number;
  hits: number;
  last_seen: string;
}

interface KrawlConfig {
  spiderTrapEnabled: boolean;
  decoyEnvEnabled: boolean;
  canaryTokensEnabled: boolean;
  artificialDelayMs: number;
  autoQuarantine: boolean;
  cloudflareSync: boolean;
}

export function AdminKrawlPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<KrawlMetrics | null>(null);
  const [logs, setLogs] = useState<AttackLog[]>([]);
  const [quarantinedIps, setQuarantinedIps] = useState<QuarantinedIp[]>([]);
  const [attackBreakdown, setAttackBreakdown] = useState<{ attack_type: string; count: string }[]>([]);
  const [config, setConfig] = useState<KrawlConfig>({
    spiderTrapEnabled: true,
    decoyEnvEnabled: true,
    canaryTokensEnabled: true,
    artificialDelayMs: 800,
    autoQuarantine: true,
    cloudflareSync: false,
  });

  const [simulating, setSimulating] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [selectedAttackType, setSelectedAttackType] = useState("SQL_INJECTION");
  const [customPayload, setCustomPayload] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  const fetchKrawlData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/krawl/metrics");
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        setLogs(data.recentLogs || []);
        setQuarantinedIps(data.quarantinedIps || []);
        setAttackBreakdown(data.attackBreakdown || []);
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (err) {
      console.error("Failed to fetch Krawl metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKrawlData();
  }, []);

  const handleSimulateAttack = async (type?: string) => {
    const attackToRun = type || selectedAttackType;
    try {
      setSimulating(true);
      const res = await fetch("/api/krawl/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attackType: attackToRun,
          customPayload: customPayload || undefined
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Attacker Intercepted & Trapped!",
          description: `Krawl honeypot successfully captured: ${attackToRun}`,
          type: "success",
        });
        fetchKrawlData();
      } else {
        toast({ title: "Simulation Failed", description: data.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setSimulating(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      const res = await fetch("/api/krawl/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Krawl Defense Config Updated", description: "Honeypot parameters synchronized.", type: "success" });
      }
    } catch (err: any) {
      toast({ title: "Save Error", description: err.message, type: "error" });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleQuarantine = async (ipAddress: string, action: "BLOCK" | "UNBLOCK") => {
    try {
      const res = await fetch("/api/krawl/quarantine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipAddress, action }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "IP Status Updated", description: data.message, type: "success" });
        fetchKrawlData();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to clear all intercepted intruder logs?")) return;
    try {
      const res = await fetch("/api/krawl/clear-logs", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Logs Cleared", description: "All intrusion logs reset.", type: "info" });
        fetchKrawlData();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterType === "ALL") return true;
    return log.attack_type === filterType;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner & Krawl Identity */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-8 -top-8 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold tracking-wide">
              <Radar className="w-3.5 h-3.5 animate-pulse" />
              <span>KRAWL WEB DECEPTION & HONEYPOT ACTIVE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Krawl Anti-Crawler & Deception Engine
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Cloud-native cyber deception system (based on <em>BlessedRebuS/Krawl</em>). Lures malicious scrapers, vulnerability scanners, and automated bots into infinite recursive labyrinths, poisoning attacker telemetry and protecting customer data.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchKrawlData}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <a
              href="/api/krawl/trap/1/preview"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Live Trap
            </a>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Trapped Crawlers</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bug className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics?.totalTrapped ?? 0}</span>
            <span className="text-xs text-indigo-600 font-semibold">Probes Neutralized</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Attacker CPU/Time Wasted</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics?.wastedSeconds ? `${metrics.wastedSeconds}s` : "45s"}</span>
            <span className="text-xs text-amber-600 font-semibold">Bot Latency Delay</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Decoys</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">8 Paths</span>
            <span className="text-xs text-emerald-600 font-semibold">In robots.txt Traps</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Quarantined IPs</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics?.quarantinedIpsCount ?? 0}</span>
            <span className="text-xs text-rose-600 font-semibold">High Threat IPs</span>
          </div>
        </div>
      </div>

      {/* Simulator Section & Config Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Honeypot & Deception Simulator */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                <Terminal className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Honey-Trap Intrusion Simulator</h2>
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
              Audit & Verification Tool
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Test how Krawl intercepts and poisons incoming malicious crawler payloads in real time. Choose an attack vector below to simulate an intrusion attempt:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => handleSimulateAttack("SQL_INJECTION")}
              disabled={simulating}
              className="p-3 text-left rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition group"
            >
              <div className="flex items-center justify-between mb-1">
                <Flame className="w-4 h-4 text-rose-500" />
                <Play className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
              </div>
              <span className="font-bold text-xs text-slate-900 block">SQL Injection</span>
              <span className="text-[10px] text-slate-500">Poisoned SQL</span>
            </button>

            <button
              onClick={() => handleSimulateAttack("WEB_SCRAPER_BOT")}
              disabled={simulating}
              className="p-3 text-left rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition group"
            >
              <div className="flex items-center justify-between mb-1">
                <Bug className="w-4 h-4 text-amber-500" />
                <Play className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
              </div>
              <span className="font-bold text-xs text-slate-900 block">Spider Trap</span>
              <span className="text-[10px] text-slate-500">Infinite loop</span>
            </button>

            <button
              onClick={() => handleSimulateAttack("SENSITIVE_FILE_PROBE")}
              disabled={simulating}
              className="p-3 text-left rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition group"
            >
              <div className="flex items-center justify-between mb-1">
                <FileCode className="w-4 h-4 text-emerald-500" />
                <Play className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
              </div>
              <span className="font-bold text-xs text-slate-900 block">.env Canary</span>
              <span className="text-[10px] text-slate-500">Fake API keys</span>
            </button>

            <button
              onClick={() => handleSimulateAttack("ADMIN_CREDENTIAL_PROBE")}
              disabled={simulating}
              className="p-3 text-left rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition group"
            >
              <div className="flex items-center justify-between mb-1">
                <Lock className="w-4 h-4 text-purple-500" />
                <Play className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
              </div>
              <span className="font-bold text-xs text-slate-900 block">Admin Brute</span>
              <span className="text-[10px] text-slate-500">Decoy auth</span>
            </button>
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Custom Attack Payload Tester
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                placeholder="e.g. ' OR 1=1; DROP TABLE users; --"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => handleSimulateAttack()}
                disabled={simulating}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                {simulating ? "Trapping..." : "Launch Probe"}
              </button>
            </div>
          </div>

          {/* Active Honeypot Paths */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Active Decoy Endpoints Advertised in robots.txt
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <a 
                href="/.env" 
                target="_blank" 
                rel="noreferrer"
                className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-between"
              >
                <span>GET /.env</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-sans font-bold">Canary Decoy</span>
              </a>
              <a 
                href="/admin/backup.sql" 
                target="_blank" 
                rel="noreferrer"
                className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-between"
              >
                <span>GET /admin/backup.sql</span>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-sans font-bold">Fake SQL Dump</span>
              </a>
              <a 
                href="/krawl-trap" 
                target="_blank" 
                rel="noreferrer"
                className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-between"
              >
                <span>GET /krawl-trap</span>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-sans font-bold">Spider Trap Maze</span>
              </a>
              <a 
                href="/wp-admin" 
                target="_blank" 
                rel="noreferrer"
                className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-between"
              >
                <span>GET /wp-admin</span>
                <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-sans font-bold">Lure Trap</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right: Defense Parameters & Config */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Deception Controls</h2>
            </div>
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition"
            >
              {savingConfig ? "Saving..." : "Save Settings"}
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900 block">Spider Trap Infinite Loop</span>
                <span className="text-slate-500">Generate recursive links to exhaust crawler RAM & CPU</span>
              </div>
              <input
                type="checkbox"
                checked={config.spiderTrapEnabled}
                onChange={(e) => setConfig({ ...config, spiderTrapEnabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900 block">Decoy Secrets & Canary Tokens</span>
                <span className="text-slate-500">Serve deceptive .env and database dumps to scanners</span>
              </div>
              <input
                type="checkbox"
                checked={config.canaryTokensEnabled}
                onChange={(e) => setConfig({ ...config, canaryTokensEnabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900 block">Auto-Quarantine Malicious IPs</span>
                <span className="text-slate-500">Blacklist IPs with threat reputation score &gt; 80</span>
              </div>
              <input
                type="checkbox"
                checked={config.autoQuarantine}
                onChange={(e) => setConfig({ ...config, autoQuarantine: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
            </label>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Artificial Bot Delay (Tarpit)</span>
                <span className="font-mono font-bold text-indigo-600">{config.artificialDelayMs} ms</span>
              </div>
              <input
                type="range"
                min="200"
                max="3000"
                step="100"
                value={config.artificialDelayMs}
                onChange={(e) => setConfig({ ...config, artificialDelayMs: Number(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Slows down aggressive bots before returning deceptive output to exhaust their request concurrency.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Intruder Log & Interception Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Intercepted Bot & Scanner Traps
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit trail of attacks neutralized by Krawl deception endpoints.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Attack Types</option>
              <option value="SQL_INJECTION">SQL Injection</option>
              <option value="WEB_SCRAPER_BOT">Web Scrapers</option>
              <option value="SENSITIVE_FILE_PROBE">File Probes</option>
              <option value="CONFIGURATION_LEAK_PROBE">Config Probes</option>
            </select>

            <button
              onClick={handleClearLogs}
              className="px-3 py-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold transition"
            >
              Clear Logs
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Time</th>
                <th className="py-3.5 px-4">Attacker IP</th>
                <th className="py-3.5 px-4">Decoy Target</th>
                <th className="py-3.5 px-4">Attack Vector</th>
                <th className="py-3.5 px-4">Captured Payload</th>
                <th className="py-3.5 px-4">Action Taken</th>
                <th className="py-3.5 px-4 text-right">Quarantine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No intercepted intruder logs match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {log.ip_address}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 max-w-[150px] truncate" title={log.target_path}>
                      {log.target_path}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        log.attack_type === "SQL_INJECTION"
                          ? "bg-rose-100 text-rose-800"
                          : log.attack_type === "SENSITIVE_FILE_PROBE"
                          ? "bg-amber-100 text-amber-800"
                          : log.attack_type === "WEB_SCRAPER_BOT"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}>
                        {log.attack_type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 max-w-[220px] truncate" title={log.payload}>
                      {log.payload}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-emerald-700 flex items-center gap-1 mt-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{log.action_taken.replace(/_/g, " ")}</span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleQuarantine(log.ip_address, "BLOCK")}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-lg border border-rose-200 transition"
                      >
                        Blacklist
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
  );
}
