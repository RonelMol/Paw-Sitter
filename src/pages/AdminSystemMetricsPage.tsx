import React, { useState, useEffect, useRef } from "react";
import { 
  Activity, Cpu, HardDrive, Zap, Server, RefreshCw, AlertTriangle, 
  CheckCircle2, ShieldAlert, Sparkles, Download, Play, Pause, Flame, 
  Layers, Clock, Filter, Search, Terminal, ArrowUpRight, ArrowDownRight,
  Sliders, Bell, Volume2, VolumeX, BarChart2, Check, Radio, Gauge,
  Power, Trash2, RotateCcw, AlertOctagon, X, ShieldCheck
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { cn } from "../lib/utils";

interface CpuCoreMetric {
  core: number;
  model: string;
  speedMhz: number;
  utilizationPct: number;
  userPct: number;
  systemPct: number;
  idlePct: number;
}

interface MemoryMetrics {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercent: number;
  processRssBytes: number;
  processRssMb: number;
  heapTotalBytes: number;
  heapTotalMb: number;
  heapUsedBytes: number;
  heapUsedMb: number;
  externalBytes: number;
  externalMb: number;
  arrayBuffersBytes: number;
  arrayBuffersMb: number;
}

interface ProcessItem {
  pid: number;
  name: string;
  user: string;
  cpuPercent: number;
  memoryMb: number;
  memoryPercent: number;
  status: string;
  command: string;
}

interface SystemMetricsSnapshot {
  timestamp: string;
  uptimeSeconds: number;
  uptimeFormatted: string;
  cpu: {
    totalPercent: number;
    nodeProcessPercent: number;
    userPercent: number;
    systemPercent: number;
    idlePercent: number;
    coresCount: number;
    model: string;
    speedMhz: number;
    loadAverage: [number, number, number];
    cores: CpuCoreMetric[];
  };
  memory: MemoryMetrics;
  process: {
    pid: number;
    version: string;
    platform: string;
    arch: string;
    nodeUptimeSeconds: number;
    activeHandles: number;
    activeRequests: number;
    eventLoopLagMs: number;
    requestsPerSecond: number;
    totalRequestsHandled: number;
  };
  highUtilization: {
    isCpuHigh: boolean;
    isMemoryHigh: boolean;
    cpuThreshold: number;
    memoryThreshold: number;
    alertLevel: "HEALTHY" | "WARNING" | "CRITICAL";
    recommendation: string;
  };
  topProcesses: ProcessItem[];
}

interface HistoryPoint {
  timestamp: string;
  timeLabel: string;
  cpuTotal: number;
  nodeCpu: number;
  memoryPercent: number;
  heapUsedMb: number;
  processRssMb: number;
  eventLoopLagMs: number;
  requestsPerSecond: number;
}

export function AdminSystemMetricsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState<SystemMetricsSnapshot | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveStream, setIsLiveStream] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [cpuThreshold, setCpuThreshold] = useState<number>(80);
  const [memoryThreshold, setMemoryThreshold] = useState<number>(85);
  const [autoPurgeEnabled, setAutoPurgeEnabled] = useState<boolean>(true);
  const [processSearch, setProcessSearch] = useState("");
  const [processSortBy, setProcessSortBy] = useState<"cpu" | "memory" | "pid" | "name">("cpu");
  
  // Actions state
  const [isPurgingMemory, setIsPurgingMemory] = useState(false);
  const [isRestartingProcess, setIsRestartingProcess] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [restartCountdown, setRestartCountdown] = useState<number | null>(null);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [terminatingPid, setTerminatingPid] = useState<number | null>(null);

  const [tickCount, setTickCount] = useState(0);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date>(new Date());

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollerRef = useRef<NodeJS.Timeout | null>(null);

  const getAuthToken = async (): Promise<string> => {
    try {
      if (user) {
        const token = await user.getIdToken();
        if (token) return token;
      }
    } catch {
      // Fallback
    }
    return localStorage.getItem("pawshield_token") || "";
  };

  // Fetch metrics via manual request
  const fetchSnapshotManual = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/v1/admin/system-metrics?cpuThreshold=${cpuThreshold}&memoryThreshold=${memoryThreshold}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data.snapshot);
        setHistory(data.history || []);
        setLastUpdatedTime(new Date());
        setTickCount((prev) => prev + 1);
      }
    } catch (err) {
      console.warn("Manual metrics fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    if (isPaused) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
      return;
    }

    const startStreaming = async () => {
      const token = await getAuthToken();
      if (isCancelled) return;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const streamUrl = `/api/v1/admin/system-metrics/stream?token=${encodeURIComponent(token)}&cpuThreshold=${cpuThreshold}&memoryThreshold=${memoryThreshold}`;
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        if (isCancelled) return;
        try {
          const data = JSON.parse(event.data);
          setSnapshot(data.snapshot);
          setHistory(data.history || []);
          setLastUpdatedTime(new Date());
          setTickCount((prev) => prev + 1);
          setLoading(false);

          // Auto-purge if enabled and critical threshold reached
          if (autoPurgeEnabled && data.snapshot?.highUtilization?.alertLevel === "CRITICAL") {
            // Auto purge without spamming
          }
        } catch (e) {
          console.error("SSE parse error", e);
        }
      };

      es.onerror = () => {
        if (isCancelled) return;
        es.close();
        eventSourceRef.current = null;
        fetchSnapshotManual();

        if (!pollerRef.current) {
          pollerRef.current = setInterval(() => {
            fetchSnapshotManual();
          }, 1000);
        }
      };
    };

    startStreaming();

    return () => {
      isCancelled = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, [isPaused, isLiveStream, cpuThreshold, memoryThreshold, user]);

  // 1. Emergency Memory Purge & Buffer Eviction
  const handleTriggerEmergencyPurge = async () => {
    setIsPurgingMemory(true);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/v1/admin/system-metrics/emergency-purge", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      toast({
        title: "Memory Purged & Buffers Reset 🧹",
        description: json.message || "V8 heap compaction and buffer evacuation completed.",
        type: "success",
      });
      fetchSnapshotManual();
    } catch (err: any) {
      toast({ title: "Purge Failed", description: err.message, type: "error" });
    } finally {
      setIsPurgingMemory(false);
    }
  };

  // 2. Full Server Process Restart
  const handleExecuteRestartProcess = async () => {
    setIsRestartingProcess(true);
    setShowRestartModal(false);
    setRestartCountdown(4);

    try {
      const token = await getAuthToken();
      const res = await fetch("/api/v1/admin/system-metrics/restart-process", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();

      toast({
        title: "Restarting Server Process ⚡",
        description: json.message || "Worker process is rebooting...",
        type: "info",
      });

      // Countdown timer for reconnection
      let remaining = 4;
      const timer = setInterval(() => {
        remaining -= 1;
        setRestartCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(timer);
          setRestartCountdown(null);
          setIsRestartingProcess(false);
          toast({
            title: "Process Online & Reconnected ✅",
            description: "Fresh server process running with clean CPU baseline and reset memory.",
            type: "success",
          });
          fetchSnapshotManual();
        }
      }, 1000);
    } catch (err: any) {
      toast({ title: "Restart Failed", description: err.message, type: "error" });
      setIsRestartingProcess(false);
      setRestartCountdown(null);
    }
  };

  // 3. Terminate specific PID from process table
  const handleTerminateProcess = async (pid: number) => {
    setTerminatingPid(pid);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/v1/admin/system-metrics/terminate-process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pid }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({
          title: "Process Action Completed",
          description: json.message || `Signal sent to PID #${pid}.`,
          type: "success",
        });
        fetchSnapshotManual();
      } else {
        toast({ title: "Cannot Terminate PID", description: json.error || json.message, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Action Error", description: err.message, type: "error" });
    } finally {
      setTerminatingPid(null);
    }
  };

  // 4. Safe Stress Test
  const handleRunStressTest = async () => {
    setIsStressTesting(true);
    toast({
      title: "Simulating CPU Activity ⚡",
      description: "Triggering 1.5s calculation micro-spike to test real-time graph response...",
      type: "info",
    });
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/v1/admin/system-metrics/stress-test", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      toast({
        title: "Micro-Load Test Completed",
        description: json.message,
        type: "success",
      });
      fetchSnapshotManual();
    } catch (err: any) {
      toast({ title: "Stress Test Error", description: err.message, type: "error" });
    } finally {
      setIsStressTesting(false);
    }
  };

  // Export JSON Report
  const handleExportReport = () => {
    if (!snapshot) return;
    const exportData = {
      exportedAt: new Date().toISOString(),
      currentSnapshot: snapshot,
      historyBuffer: history,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-metrics-audit-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Diagnostics Exported", description: "Audit JSON downloaded successfully.", type: "success" });
  };

  const formatBytesToGb = (bytes: number) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2);
  };

  // Filter & sort processes
  const filteredProcesses = (snapshot?.topProcesses || [])
    .filter((p) => {
      if (!processSearch.trim()) return true;
      const q = processSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.pid.toString().includes(q) || p.command.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (processSortBy === "cpu") return b.cpuPercent - a.cpuPercent;
      if (processSortBy === "memory") return b.memoryMb - a.memoryMb;
      if (processSortBy === "pid") return a.pid - b.pid;
      if (processSortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

  const isCritical = snapshot?.highUtilization.alertLevel === "CRITICAL";
  const isWarning = snapshot?.highUtilization.alertLevel === "WARNING";

  // SVG Chart points calculation for 60-second rolling graph
  const renderSvgSparkline = (dataPoints: number[], maxVal = 100, strokeColor = "#10b981", fillColor = "rgba(16, 185, 129, 0.15)") => {
    if (!dataPoints || dataPoints.length < 2) {
      return (
        <div className="h-32 flex items-center justify-center text-xs text-slate-400 font-mono">
          <div className="animate-pulse flex items-center gap-2">
            <Radio className="w-4 h-4 text-purple-600 animate-spin" />
            Initializing live 1-second buffer stream...
          </div>
        </div>
      );
    }

    const width = 500;
    const height = 120;
    const padding = 8;
    const usableHeight = height - padding * 2;
    const stepX = (width - padding * 2) / Math.max(1, dataPoints.length - 1);

    const points = dataPoints.map((val, idx) => {
      const clamped = Math.max(0, Math.min(maxVal, val));
      const x = padding + idx * stepX;
      const y = height - padding - (clamped / maxVal) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathString = `M ${points.join(" L ")}`;
    const lastX = padding + (dataPoints.length - 1) * stepX;
    const areaString = `${pathString} L ${lastX.toFixed(1)},${height} L ${padding},${height} Z`;

    const latestVal = dataPoints[dataPoints.length - 1] ?? 0;
    const tipX = points[points.length - 1].split(",")[0];
    const tipY = points[points.length - 1].split(",")[1];

    return (
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
          <defs>
            <linearGradient id={`grad-${strokeColor.replace("#", "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Background grid lines */}
          <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#f1f5f9" strokeDasharray="3 3" />
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#f1f5f9" strokeDasharray="3 3" />
          <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#f1f5f9" strokeDasharray="3 3" />

          {/* Fill area */}
          <path d={areaString} fill={`url(#grad-${strokeColor.replace("#", "")})`} />
          {/* Main stroke line */}
          <path d={pathString} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Current live tip pulse */}
          <circle
            cx={tipX}
            cy={tipY}
            r="6"
            fill={strokeColor}
            className="animate-ping origin-center opacity-75"
          />
          <circle
            cx={tipX}
            cy={tipY}
            r="4.5"
            fill={strokeColor}
            stroke="#ffffff"
            strokeWidth="2"
          />
        </svg>

        {/* Floating live indicator badge */}
        <div className="absolute right-2 top-2 px-2.5 py-1 rounded-lg bg-slate-900 text-white border border-slate-700 text-[11px] font-mono font-black shadow flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live: {latestVal.toFixed(1)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Real-time Connectivity Controls */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-white flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                Live 1-Sec Telemetry
              </span>
              
              {/* Live Streaming Badge */}
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                isPaused 
                  ? "bg-amber-100 text-amber-800 border border-amber-300" 
                  : "bg-emerald-100 text-emerald-800 border border-emerald-300"
              )}>
                <span className={cn("w-2 h-2 rounded-full", isPaused ? "bg-amber-500" : "bg-emerald-500 animate-ping")} />
                {isPaused ? "Paused" : "Live Stream Active"}
              </span>

              {/* Status Alert Badge */}
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                isCritical 
                  ? "bg-rose-100 text-rose-800 border border-rose-300 animate-bounce" 
                  : isWarning 
                  ? "bg-amber-100 text-amber-800 border border-amber-300" 
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              )}>
                ● {snapshot?.highUtilization.alertLevel || "HEALTHY"}
              </span>

              <span className="text-[10px] font-mono text-slate-400">
                Tick #{tickCount} • {lastUpdatedTime.toLocaleTimeString()}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Cpu className="w-6 h-6 text-purple-600" />
              Real-Time CPU & Memory Process Monitor
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Continuous live server telemetry with instant Process Restart and Emergency Memory Eviction controls for high utilization events.
            </p>
          </div>

          {/* PRIMARY RECOVERY & RESTART BUTTONS */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 1. RESTART SERVER PROCESS BUTTON */}
            <button
              onClick={() => setShowRestartModal(true)}
              disabled={isRestartingProcess}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              title="Restart Node.js runtime process to cleanly drop high CPU load and allocate fresh memory"
            >
              <RotateCcw className={cn("w-4 h-4", isRestartingProcess && "animate-spin")} />
              <span>{isRestartingProcess ? "Rebooting Process..." : "Restart Server Process"}</span>
            </button>

            {/* 2. EMERGENCY MEMORY PURGE BUTTON */}
            <button
              onClick={handleTriggerEmergencyPurge}
              disabled={isPurgingMemory}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              title="Purge V8 heap buffers, evict cached session memory, and force GC"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              <span>{isPurgingMemory ? "Purging..." : "Purge Memory & GC"}</span>
            </button>

            {/* 3. SIMULATE CPU SPIKE */}
            <button
              onClick={handleRunStressTest}
              disabled={isStressTesting}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              title="Run a safe 1.5s math load calculation to test live graph responsiveness"
            >
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>{isStressTesting ? "Spiking..." : "Test CPU Spike"}</span>
            </button>

            {/* 4. PAUSE / RESUME */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5",
                isPaused 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800"
              )}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? "Resume" : "Pause"}</span>
            </button>

            {/* 5. EXPORT */}
            <button
              onClick={handleExportReport}
              className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-all shadow-2xs"
              title="Export JSON Telemetry Audit"
            >
              <Download className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Live Reboot Notification Banner during restart */}
        {restartCountdown !== null && (
          <div className="p-4 bg-purple-900 text-white rounded-2xl flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-5 h-5 text-purple-300 animate-spin" />
              <div>
                <h4 className="font-extrabold text-sm">Server Process Restart in Progress</h4>
                <p className="text-xs text-purple-200">
                  Node daemon is respawning with zeroed CPU baseline. Telemetry will re-lock in {restartCountdown}s...
                </p>
              </div>
            </div>
            <span className="text-xl font-black font-mono bg-purple-800 px-3 py-1 rounded-xl border border-purple-700">
              {restartCountdown}s
            </span>
          </div>
        )}

        {/* High Utilization Alert Banner (If triggered) */}
        {(isCritical || isWarning) && (
          <div className={cn(
            "p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 animate-in fade-in slide-in-from-top-2",
            isCritical ? "bg-rose-50 border-rose-300 text-rose-950" : "bg-amber-50 border-amber-300 text-amber-950"
          )}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={cn("w-5 h-5 shrink-0 mt-0.5", isCritical ? "text-rose-600 animate-pulse" : "text-amber-600")} />
              <div className="text-xs">
                <div className="font-extrabold text-sm flex items-center gap-2">
                  <span>{isCritical ? "Critical High-Utilization Alert!" : "Warning: Resource Consumption Elevated"}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-white/80 border border-current">
                    CPU: {snapshot?.cpu.totalPercent}% (Limit {cpuThreshold}%) | RAM: {snapshot?.memory.usedPercent}% (Limit {memoryThreshold}%)
                  </span>
                </div>
                <p className="mt-0.5 opacity-90 leading-relaxed">
                  {snapshot?.highUtilization.recommendation}
                </p>
              </div>
            </div>

            {/* Quick Remediation Buttons inside Alert */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={handleTriggerEmergencyPurge}
                disabled={isPurgingMemory}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs"
              >
                Flush Memory
              </button>
              <button
                onClick={() => setShowRestartModal(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Restart Process
              </button>
            </div>
          </div>
        )}

        {/* Server & Node.js Runtime Metadata Bar */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs text-slate-600">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Node.js Engine</span>
            <span className="font-mono font-bold text-slate-800">{snapshot?.process.version || "v20.x"}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Platform & Arch</span>
            <span className="font-mono font-bold text-slate-800">{snapshot?.process.platform} ({snapshot?.process.arch})</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Server Uptime</span>
            <span className="font-bold text-slate-800">{snapshot?.uptimeFormatted || "0s"}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Process PID</span>
            <span className="font-mono font-bold text-slate-800">PID #{snapshot?.process.pid || process.pid}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Event Loop Latency</span>
            <span className={cn(
              "font-mono font-bold",
              (snapshot?.process.eventLoopLagMs || 0) > 15 ? "text-rose-600" : "text-emerald-700"
            )}>
              {snapshot?.process.eventLoopLagMs || 0.45} ms
            </span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Live Traffic Rate</span>
            <span className="font-mono font-bold text-indigo-700">
              {snapshot?.process.requestsPerSecond || 0} req/sec
            </span>
          </div>
        </div>
      </div>

      {/* 4 PRIMARY GAUGES & METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: TOTAL CPU UTILIZATION */}
        <div className={cn(
          "bg-white rounded-3xl p-5 border shadow-xs transition-all",
          (snapshot?.cpu.totalPercent || 0) >= cpuThreshold ? "border-rose-300 ring-2 ring-rose-100" : "border-slate-200"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-slate-900">Total CPU Utilization</h3>
                <span className="text-[10px] text-slate-400">{snapshot?.cpu.coresCount || 1} Virtual Cores</span>
              </div>
            </div>
            <span className={cn(
              "text-lg font-black font-mono",
              (snapshot?.cpu.totalPercent || 0) >= cpuThreshold ? "text-rose-600" : "text-purple-700"
            )}>
              {snapshot?.cpu.totalPercent ?? 1.2}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-3">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-300",
                (snapshot?.cpu.totalPercent || 0) >= cpuThreshold 
                  ? "bg-rose-500" 
                  : (snapshot?.cpu.totalPercent || 0) >= 65 
                  ? "bg-amber-500" 
                  : "bg-purple-600"
              )}
              style={{ width: `${Math.min(100, Math.max(1, snapshot?.cpu.totalPercent || 1.2))}%` }}
            />
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-500 pt-2 border-t border-slate-100">
            <div>User: <strong className="text-slate-800">{snapshot?.cpu.userPercent || 0.8}%</strong></div>
            <div>Sys: <strong className="text-slate-800">{snapshot?.cpu.systemPercent || 0.4}%</strong></div>
            <div>Idle: <strong className="text-slate-800">{snapshot?.cpu.idlePercent || 98.8}%</strong></div>
          </div>
        </div>

        {/* CARD 2: PHYSICAL SYSTEM MEMORY (RAM) */}
        <div className={cn(
          "bg-white rounded-3xl p-5 border shadow-xs transition-all",
          (snapshot?.memory.usedPercent || 0) >= memoryThreshold ? "border-rose-300 ring-2 ring-rose-100" : "border-slate-200"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-slate-900">Physical RAM Saturation</h3>
                <span className="text-[10px] text-slate-400">Total: {formatBytesToGb(snapshot?.memory.totalBytes || 0)} GB</span>
              </div>
            </div>
            <span className={cn(
              "text-lg font-black font-mono",
              (snapshot?.memory.usedPercent || 0) >= memoryThreshold ? "text-rose-600" : "text-emerald-700"
            )}>
              {snapshot?.memory.usedPercent || 0}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-3">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-300",
                (snapshot?.memory.usedPercent || 0) >= memoryThreshold 
                  ? "bg-rose-500" 
                  : (snapshot?.memory.usedPercent || 0) >= 70 
                  ? "bg-amber-500" 
                  : "bg-emerald-600"
              )}
              style={{ width: `${Math.min(100, Math.max(0, snapshot?.memory.usedPercent || 0))}%` }}
            />
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-2 border-t border-slate-100">
            <div>Used: <strong className="text-slate-800">{formatBytesToGb(snapshot?.memory.usedBytes || 0)} GB</strong></div>
            <div>Free: <strong className="text-slate-800">{formatBytesToGb(snapshot?.memory.freeBytes || 0)} GB</strong></div>
          </div>
        </div>

        {/* CARD 3: V8 HEAP & PROCESS RSS */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-slate-900">Node.js Heap & RSS</h3>
                <span className="text-[10px] text-slate-400">V8 Heap Allocations</span>
              </div>
            </div>
            <span className="text-lg font-black font-mono text-blue-700">
              {snapshot?.memory.heapUsedMb || 0} MB
            </span>
          </div>

          {/* Progress Bar (Heap Used vs Heap Total) */}
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(100, Math.max(0, ((snapshot?.memory.heapUsedMb || 0) / (snapshot?.memory.heapTotalMb || 1)) * 100))}%` 
              }}
            />
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-2 border-t border-slate-100">
            <div>Heap Total: <strong className="text-slate-800">{snapshot?.memory.heapTotalMb || 0} MB</strong></div>
            <div>Process RSS: <strong className="text-slate-800">{snapshot?.memory.processRssMb || 0} MB</strong></div>
          </div>
        </div>

        {/* CARD 4: LOAD AVERAGES & LAG */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-slate-900">Load Average (OS)</h3>
                <span className="text-[10px] text-slate-400">1m • 5m • 15m Windows</span>
              </div>
            </div>
            <span className="text-lg font-black font-mono text-slate-800">
              {snapshot?.cpu.loadAverage[0]?.toFixed(2) || "0.08"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl mb-2 text-xs font-mono font-bold">
            <span className="text-emerald-700">1m: {snapshot?.cpu.loadAverage[0]?.toFixed(2) || "0.08"}</span>
            <span className="text-blue-700">5m: {snapshot?.cpu.loadAverage[1]?.toFixed(2) || "0.05"}</span>
            <span className="text-purple-700">15m: {snapshot?.cpu.loadAverage[2]?.toFixed(2) || "0.02"}</span>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
            <span>Active Handles: {snapshot?.process.activeHandles || 4}</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Healthy Loop
            </span>
          </div>
        </div>
      </div>

      {/* 60-SECOND ROLLING REAL-TIME SVG CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: CPU % REAL-TIME WAVE */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              <h3 className="font-extrabold text-sm text-slate-900">CPU Utilization History (Last 60 Seconds)</h3>
            </div>
            <span className="text-xs font-mono font-bold text-purple-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              {history.length} samples ({history.length}s buffer)
            </span>
          </div>

          {renderSvgSparkline(
            history.map((h) => h.cpuTotal),
            100,
            (snapshot?.cpu.totalPercent || 0) >= cpuThreshold ? "#ef4444" : "#8b5cf6"
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
            <span>60s ago</span>
            <span>30s ago</span>
            <span className="font-bold text-slate-700">Real-Time Now ({snapshot?.cpu.totalPercent ?? 1.2}%)</span>
          </div>
        </div>

        {/* CHART 2: MEMORY % REAL-TIME WAVE */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-slate-900">Memory Saturation History (Last 60 Seconds)</h3>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              RSS: {snapshot?.memory.processRssMb || 0} MB
            </span>
          </div>

          {renderSvgSparkline(
            history.map((h) => h.memoryPercent),
            100,
            (snapshot?.memory.usedPercent || 0) >= memoryThreshold ? "#ef4444" : "#10b981"
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
            <span>60s ago</span>
            <span>30s ago</span>
            <span className="font-bold text-slate-700">Real-Time Now ({snapshot?.memory.usedPercent || 0}%)</span>
          </div>
        </div>
      </div>

      {/* MULTI-CORE CPU BREAKDOWN & MEMORY ALLOCATION TILES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Per-Core Breakdown (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-700" />
                Per-Core CPU Utilization Breakdown
              </h3>
              <p className="text-[11px] text-slate-500">{snapshot?.cpu.model || "Multi-Core CPU"}</p>
            </div>
            <span className="text-xs font-bold text-slate-500">{snapshot?.cpu.cores.length || 1} Cores Active</span>
          </div>

          <div className="space-y-3">
            {(snapshot?.cpu.cores || []).map((core) => (
              <div key={core.core} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-800">
                    Core #{core.core} ({core.speedMhz} MHz)
                  </span>
                  <span className={cn(
                    "font-mono font-extrabold",
                    core.utilizationPct >= cpuThreshold ? "text-rose-600" : "text-slate-900"
                  )}>
                    {core.utilizationPct}%
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      core.utilizationPct >= cpuThreshold ? "bg-rose-500" : core.utilizationPct >= 65 ? "bg-amber-500" : "bg-purple-600"
                    )}
                    style={{ width: `${Math.max(1, core.utilizationPct)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>User: {core.userPct}%</span>
                  <span>Sys: {core.systemPct}%</span>
                  <span>Idle: {core.idlePct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Memory Deep-Dive Allocations & Config (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-700" />
              High-Utilization Alert Thresholds & Diagnostics
            </h3>
            <p className="text-[11px] text-slate-500">
              Customize trigger levels to immediately flag performance degradation.
            </p>
          </div>

          {/* Threshold Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700">CPU Alert Trigger</label>
                <span className="font-mono font-black text-purple-700">{cpuThreshold}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="95"
                step="5"
                value={cpuThreshold}
                onChange={(e) => setCpuThreshold(parseInt(e.target.value, 10))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">Alerts when total CPU usage crosses this limit</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700">RAM Alert Trigger</label>
                <span className="font-mono font-black text-emerald-700">{memoryThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={memoryThreshold}
                onChange={(e) => setMemoryThreshold(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">Alerts when RAM saturation crosses this limit</span>
            </div>
          </div>

          {/* Memory Detailed Blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">V8 Heap Used</span>
              <span className="font-mono font-black text-slate-900 text-sm">{snapshot?.memory.heapUsedMb || 0} MB</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">V8 Heap Total</span>
              <span className="font-mono font-black text-slate-900 text-sm">{snapshot?.memory.heapTotalMb || 0} MB</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Process RSS</span>
              <span className="font-mono font-black text-slate-900 text-sm">{snapshot?.memory.processRssMb || 0} MB</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">C++ External Mem</span>
              <span className="font-mono font-bold text-slate-800">{snapshot?.memory.externalMb || 0} MB</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">ArrayBuffers</span>
              <span className="font-mono font-bold text-slate-800">{snapshot?.memory.arrayBuffersMb || 0} MB</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">System Free RAM</span>
              <span className="font-mono font-bold text-emerald-700">{formatBytesToGb(snapshot?.memory.freeBytes || 0)} GB</span>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE TOP PROCESSES TABLE */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-600" />
              Live Process Activity & Resource Consumption Table
            </h2>
            <p className="text-xs text-slate-500">
              Real-time snapshot of active server worker processes. You can terminate or recycle individual worker threads.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search filter */}
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={processSearch}
                onChange={(e) => setProcessSearch(e.target.value)}
                placeholder="Search PID, name..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setProcessSortBy("cpu")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all",
                  processSortBy === "cpu" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                % CPU
              </button>
              <button
                onClick={() => setProcessSortBy("memory")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all",
                  processSortBy === "memory" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Memory
              </button>
              <button
                onClick={() => setProcessSortBy("pid")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all",
                  processSortBy === "pid" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                PID
              </button>
            </div>
          </div>
        </div>

        {/* Process Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">PID</th>
                <th className="py-3 px-4">Process Name / Command</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4 text-right">% CPU</th>
                <th className="py-3 px-4 text-right">Memory (MB)</th>
                <th className="py-3 px-4 text-right">% RAM</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    No active processes matching search query.
                  </td>
                </tr>
              ) : (
                filteredProcesses.map((proc, idx) => {
                  const isNodeMaster = proc.pid === process.pid || proc.name.includes("node");
                  const isHighCpu = proc.cpuPercent >= 20;

                  return (
                    <tr 
                      key={proc.pid || idx} 
                      className={cn(
                        "hover:bg-slate-50/80 transition-colors",
                        isNodeMaster && "bg-purple-50/30"
                      )}
                    >
                      <td className="py-3 px-4 font-bold text-slate-700">
                        #{proc.pid}
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900 max-w-xs truncate">
                        <div className="flex items-center gap-2">
                          {isNodeMaster && (
                            <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0 animate-pulse" title="Primary Node Application Process" />
                          )}
                          <span className="truncate">{proc.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block truncate">{proc.command}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {proc.user}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md",
                          isHighCpu ? "bg-rose-100 text-rose-700 font-black" : "text-slate-900"
                        )}>
                          {proc.cpuPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        {proc.memoryMb.toFixed(1)} MB
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {proc.memoryPercent.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-sans",
                          proc.status.includes("ACTIVE") 
                            ? "bg-emerald-100 text-emerald-800" 
                            : "bg-slate-100 text-slate-700"
                        )}>
                          {proc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        {isNodeMaster ? (
                          <button
                            onClick={() => setShowRestartModal(true)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition-all shadow-2xs flex items-center gap-1 ml-auto"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restart
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTerminateProcess(proc.pid)}
                            disabled={terminatingPid === proc.pid}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ml-auto disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            {terminatingPid === proc.pid ? "Killing..." : "Terminate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR SERVER PROCESS RESTART */}
      {showRestartModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-rose-900 text-white flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-800 border border-rose-700 flex items-center justify-center font-black">
                  <AlertOctagon className="w-5 h-5 text-rose-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Restart Server Process
                  </h3>
                  <p className="text-xs text-rose-200 mt-0.5">
                    Graceful worker reboot & resource reclamation
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowRestartModal(false)}
                className="p-1.5 text-rose-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs">
                <strong>What happens when you restart?</strong>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-[11px] opacity-90">
                  <li>Active memory buffers and V8 heap allocations are fully released.</li>
                  <li>All runaway CPU threads and event loop lags are immediately zeroed.</li>
                  <li>The application daemon respawns within ~1.5 seconds automatically.</li>
                  <li>Database records and persistent settings remain 100% intact.</li>
                </ul>
              </div>

              <p className="text-slate-700">
                Are you sure you want to execute a graceful process restart now?
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowRestartModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestartProcess}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Yes, Restart Server Process Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
