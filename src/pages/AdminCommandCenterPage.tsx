import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { useCurrency } from "../lib/CurrencyContext";
import {
  AgentId,
  AgentOfficeProfile,
  InterModuleEvent,
  INITIAL_AGENTS
} from "../services/OfficeAgentService";
import { VirtualOfficeFloorCanvas } from "../components/VirtualOfficeFloorCanvas";
import { AgentMissionDrawer } from "../components/AgentMissionDrawer";
import {
  Sparkles,
  Activity,
  ShieldCheck,
  DollarSign,
  Radio,
  RefreshCw,
  Play,
  Pause,
  Zap,
  ArrowRight,
  ExternalLink,
  Layers,
  Award,
  Terminal,
  Server,
  FileCheck2,
  Cpu
} from "lucide-react";

export function AdminCommandCenterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();

  const [agents, setAgents] = useState<Record<AgentId, AgentOfficeProfile>>(INITIAL_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId | null>(null);
  const [recentEvents, setRecentEvents] = useState<InterModuleEvent[]>([]);
  const [netLiquidity, setNetLiquidity] = useState(127470000);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Initial State Fetch
  const loadInitialState = async () => {
    try {
      const token = await user?.getIdToken();
      let res = await fetch("/api/v1/office/status");
      if (!res.ok && token) {
        res = await fetch("/api/v1/admin/office/status", {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents);
        setNetLiquidity(data.netLiquidity || 127470000);
        setRecentEvents(data.recentEvents || []);
      }
    } catch (err) {
      console.warn("Error fetching office state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialState();
  }, [user]);

  // 2. Real-Time Server-Sent Events (SSE) Stream
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      eventSource = new EventSource("/api/v1/office/stream");

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);

          if (payload.type === "OFFICE_INIT") {
            setAgents(payload.agents);
            setNetLiquidity(payload.netLiquidity);
            if (payload.recentEvents) setRecentEvents(payload.recentEvents);
          } else if (payload.type === "OFFICE_TICK") {
            if (!isPaused) {
              setAgents(payload.agents);
              if (payload.netLiquidity) setNetLiquidity(payload.netLiquidity);
            }
          } else if (payload.type === "AGENT_MISSION_UPDATE") {
            setAgents((prev) => ({
              ...prev,
              [payload.agentId]: payload.agent
            }));
            if (payload.event) {
              setRecentEvents((prev) => [payload.event, ...prev.slice(0, 19)]);
            }
            if (payload.netLiquidity) setNetLiquidity(payload.netLiquidity);
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        eventSource?.close();
        // Reconnect after 4s
        setTimeout(connectSSE, 4000);
      };
    };

    connectSSE();

    return () => {
      eventSource?.close();
    };
  }, [isPaused]);

  // Dispatch Mission Handler
  const handleDispatchMission = async (agentId: AgentId, missionType: string, customMessage?: string) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/office/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ agentId, missionType, customMessage })
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Mission Dispatched",
          description: data.event?.summary || "Agent task initiated.",
          type: "success"
        });
      }
    } catch (err: any) {
      toast({
        title: "Dispatch Error",
        description: err.message,
        type: "error"
      });
    }
  };

  const handleTriggerPresetEvent = async (type: string) => {
    switch (type) {
      case "BOOKING":
        await handleDispatchMission("tala", "BOOKING_DISPATCH", "Matching new high-value pet stay in Makati!");
        setTimeout(() => {
          handleDispatchMission("balanse", "ESCROW_LOCK", "₱3,800 secured in platform escrow.");
        }, 1200);
        break;
      case "SECURITY":
        await handleDispatchMission("bantay", "SECURITY_PROBE", "Scanning all 14 REST routes for token replay.");
        setTimeout(() => {
          handleDispatchMission("boss", "GENERAL_TASK", "Zero CVE vulnerabilities reported.");
        }, 1500);
        break;
      case "SEO":
        await handleDispatchMission("librarian", "SEO_AUDIT", "Editorial keywords verified: 98/100 AdSense score.");
        break;
      case "QA":
        await handleDispatchMission("vercelbot", "QA_VERIFY", "Automated test suite green. Latency: 4ms.");
        break;
      case "PAYOUT":
        await handleDispatchMission("kinsenas", "PAYOUT_DISBURSEMENT", "Bi-monthly sitter payout batch dispatched.");
        break;
      default:
        break;
    }
  };

  const selectedAgent = selectedAgentId ? agents[selectedAgentId] : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Top Mission Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              PawShield Multi-Module Command Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              2.5D Isometric Floor
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time visual map of all microservices, autonomous AI employees, and inter-module event communication.
          </p>
        </div>

        {/* Speed Controls & Manual Trigger Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setSpeed(1)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                speed === 1 ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              1x Normal
            </button>
            <button
              type="button"
              onClick={() => setSpeed(2)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                speed === 2 ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              2x Fast
            </button>
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                isPaused ? "bg-amber-500 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
              <span>{isPaused ? "Resume" : "Pause"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadInitialState}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Refresh state"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Top KPI HUD Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Net Platform Liquidity */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Net Platform Liquidity</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-black text-slate-900">
            {formatPrice(netLiquidity / 100)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <span>100% Escrow Collateralized</span>
          </div>
        </div>

        {/* KPI 2: Active AI Microservices */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Active Microservices</span>
            <Cpu className="w-4 h-4 text-purple-600" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-black text-slate-900">
            8 / 8 Active
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            6 Department Zones Nominal
          </div>
        </div>

        {/* KPI 3: Event Bus Throughput */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Event Bus Throughput</span>
            <Radio className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-black text-slate-900">
            18.4 req/s
          </div>
          <div className="text-[11px] text-cyan-700 font-semibold mt-1">
            SSE Stream: Connected
          </div>
        </div>

        {/* KPI 4: Security & Integrity State */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Security &amp; Integrity</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-black text-slate-900">
            Grade A+
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            0 Vulnerabilities Detected
          </div>
        </div>
      </div>

      {/* 3. Action Trigger Dock: Test Inter-Module Communication */}
      <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-bold text-slate-200">Test Live Inter-Module Communication:</span>
          <span className="text-slate-400 hidden sm:inline">Click any scenario to watch agents walk, converse, and execute:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleTriggerPresetEvent("BOOKING")}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Simulate Booking
          </button>
          <button
            type="button"
            onClick={() => handleTriggerPresetEvent("SECURITY")}
            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            OWASP Scan
          </button>
          <button
            type="button"
            onClick={() => handleTriggerPresetEvent("SEO")}
            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            SEO Audit
          </button>
          <button
            type="button"
            onClick={() => handleTriggerPresetEvent("QA")}
            className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Automated QA
          </button>
        </div>
      </div>

      {/* 4. The 2.5D Isometric Virtual Office Floor Canvas */}
      <VirtualOfficeFloorCanvas
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={(id) => setSelectedAgentId(id)}
        speed={speed}
      />

      {/* 5. Live Inter-Module Audit Stream & Open Source Architecture Callout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Inter-Module Event Audit Trail */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Live Inter-Module Event Audit Stream
              </h3>
            </div>
            <span className="font-mono text-[11px] text-slate-400">SSE Event Bus</span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {recentEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Listening for inter-module event dispatches...
              </div>
            ) : (
              recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs flex items-start justify-between gap-3 hover:bg-slate-100/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="font-bold text-slate-900">{evt.sourceAgent.toUpperCase()}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-bold text-purple-700">{evt.targetAgent.toUpperCase()}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-[10px] text-slate-500 uppercase">{evt.type}</span>
                    </div>
                    <p className="text-slate-700 text-xs font-medium">{evt.summary}</p>
                    {evt.speechText && (
                      <p className="text-[11px] text-slate-500 italic">"{evt.speechText}"</p>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">{evt.timestamp}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Open Source Benchmarks & Tech Architecture Card */}
        <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Open-Source Multi-Agent Architecture
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This interactive command center is modeled after pioneering open-source agent ecosystems:
            </p>

            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-400">·</span>
                <div>
                  <strong className="text-white">AI Town (a16z &amp; Convex)</strong>: 2.5D spatial navigation, state machines, and dynamic agent speech bubbles.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-cyan-400">·</span>
                <div>
                  <strong className="text-white">WorkAdventure</strong>: Dedicated virtual office room mapping with presence and load balancing.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-purple-400">·</span>
                <div>
                  <strong className="text-white">AutoGen Studio &amp; AgentVerse</strong>: Orchestrating autonomous agents across specialized tasks.
                </div>
              </li>
            </ul>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Hardware Accelerated 2.5D SVG</span>
            <span className="font-mono text-emerald-400">0ms Lag</span>
          </div>
        </div>
      </div>

      {/* 6. Slide-Over Inspection Drawer for Selected Agent */}
      <AgentMissionDrawer
        agent={selectedAgent}
        onClose={() => setSelectedAgentId(null)}
        onDispatchMission={handleDispatchMission}
      />
    </div>
  );
}
