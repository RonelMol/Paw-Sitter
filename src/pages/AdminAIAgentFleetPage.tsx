import { useState, useEffect } from "react";
import { 
  Bot, Play, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, 
  Terminal, ArrowRight, RefreshCw, Sparkles, Copy, Check, 
  Layers, Zap, Clock, ShieldAlert, FileText, ChevronDown, ChevronUp,
  Cpu, Compass, CheckSquare, Search, ExternalLink, Sliders, Smartphone,
  DollarSign, Activity, FileCheck, Shield, AlertCircle, Bug, Code, Globe
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { AdminSEOAgentView } from "../components/AdminSEOAgentView";

export interface BrainMemory {
  id: number;
  memory_type: string;
  fingerprint: string;
  title: string;
  page_route: string;
  module_name: string;
  component_part: string;
  trigger_event: string;
  root_cause_analysis: string;
  remediation_code?: string;
  confidence_pct: number;
  is_resolved: boolean;
  occurrence_count: number;
  first_detected_at: string;
  last_updated_brain_at: string;
  error_message?: string;
  error_stack?: string;
  severity?: string;
}

export interface ConsoleLog {
  id: number;
  fingerprint: string;
  error_message: string;
  error_stack?: string;
  page_route: string;
  module_name: string;
  component_part: string;
  trigger_action: string;
  severity: string;
  metadata: any;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

interface FleetAgent {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  category: string;
  model: string;
  description: string;
  status: "IDLE" | "RUNNING" | "COMPLETED" | "FAILED";
  currentStep?: string;
  lastRunAt?: string;
  durationMs: number;
  scoreLabel: string;
  scoreValue: string;
  scoreQuality: "positive" | "warning" | "danger";
  latestReportId?: number;
  reportType: string;
  actionEndpoint?: string;
  reportEndpoint?: string;
}

interface AdSenseAudit {
  id: number;
  audit_scope: string;
  status: string;
  compliance_score: number;
  risk_level: string;
  total_rules_checked: number;
  passed_rules_count: number;
  violations_count: number;
  warnings_count: number;
  pages_audited: Array<{
    pageName: string;
    route: string;
    adUnitAllowed: boolean;
    hasRichEditorialContent: boolean;
    wordCountEstimate: number;
    contentToAdRatio: string;
    accidentalClickRisk: string;
    complianceStatus: string;
    notes: string;
  }>;
  policy_breakdown: Record<string, string>;
  findings: Array<{
    id: string;
    ruleId: string;
    title: string;
    severity: string;
    page: string;
    description: string;
    googlePolicyCitation: string;
    remediationCode: string;
    actionStatus: string;
  }>;
  full_report_markdown: string;
  remediation_plan: any[];
  triggered_by: string;
  duration_ms: number;
  created_at: string;
}

interface StrategicActionItem {
  id: string;
  title: string;
  category: string;
  priority: string;
  effort: string;
  impact: string;
  originAgent: string;
  description: string;
  suggestedFix: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
}

interface StrategicPlan {
  id: number;
  title: string;
  status: string;
  overall_health_score: number;
  adsense_readiness_pct: number;
  qa_stability_pct: number;
  ux_benchmark_score: number;
  agent_runs_ingested: any;
  executive_summary: string;
  prioritized_action_items: StrategicActionItem[];
  chronological_roadmap: Array<{
    phaseNumber: number;
    phaseTitle: string;
    timeframe: string;
    focus: string;
    status: string;
    items: string[];
  }>;
  cross_agent_synergies: Array<{
    synergyTitle: string;
    description: string;
  }>;
  full_markdown_report: string;
  action_progress: Record<string, string>;
  triggered_by: string;
  duration_ms: number;
  created_at: string;
  updated_at: string;
}

export function AdminAIAgentFleetPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const showToast = (title: string, type: "success" | "error" | "info" = "info", desc?: string) => {
    if (addToast) addToast(title, type, desc);
  };

  // Tab navigation
  const [activeTab, setActiveTab] = useState<"fleet" | "adsense" | "planner" | "console" | "seo" | "reports">("fleet");

  // Fleet state
  const [fleetAgents, setFleetAgents] = useState<FleetAgent[]>([]);
  const [loadingFleet, setLoadingFleet] = useState(false);
  const [activeRunningCount, setActiveRunningCount] = useState(0);

  // Console Sentinel & Cognitive Brain Memory state
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [consoleStats, setConsoleStats] = useState<any>({});
  const [brainMemories, setBrainMemories] = useState<BrainMemory[]>([]);
  const [brainSummary, setBrainSummary] = useState<any>({});
  const [loadingConsole, setLoadingConsole] = useState(false);
  const [simulatingError, setSimulatingError] = useState(false);
  const [consoleSubTab, setConsoleSubTab] = useState<"brain" | "logs">("brain");
  const [selectedMemory, setSelectedMemory] = useState<BrainMemory | null>(null);

  // AdSense Compliance state
  const [runningAdSenseAudit, setRunningAdSenseAudit] = useState(false);
  const [adSenseLiveStep, setAdSenseLiveStep] = useState<string>("");
  const [latestAdSenseAudit, setLatestAdSenseAudit] = useState<AdSenseAudit | null>(null);
  const [adSenseHistory, setAdSenseHistory] = useState<any[]>([]);
  const [adSenseScope, setAdSenseScope] = useState<string>("FULL_APP");

  // Strategic Planning state
  const [runningPlanner, setRunningPlanner] = useState(false);
  const [plannerLiveStep, setPlannerLiveStep] = useState<string>("");
  const [latestPlan, setLatestPlan] = useState<StrategicPlan | null>(null);
  const [plansHistory, setPlansHistory] = useState<any[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  // Copy helper state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast("Copied to clipboard", "success");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Load Fleet Status
  const loadFleetStatus = async () => {
    setLoadingFleet(true);
    try {
      const res = await fetch("/api/ai-agent/fleet-status");
      if (!res.ok) throw new Error("Failed to load fleet status");
      const data = await res.json();
      setFleetAgents(data.fleet || []);
      setActiveRunningCount(data.summary?.activeRunningCount || 0);
    } catch (e: any) {
      console.error("Fleet status load error:", e);
    } finally {
      setLoadingFleet(false);
    }
  };

  // Load latest AdSense Audit
  const loadAdSenseAudits = async () => {
    try {
      const res = await fetch("/api/ai-agent/adsense-compliance/audits");
      if (!res.ok) throw new Error("Failed to fetch AdSense audits");
      const list = await res.json();
      setAdSenseHistory(list);
      if (list.length > 0) {
        const detailRes = await fetch(`/api/ai-agent/adsense-compliance/audits/${list[0].id}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          setLatestAdSenseAudit(detail);
        }
      }
    } catch (e) {
      console.error("Failed to load AdSense audits:", e);
    }
  };

  // Load latest Strategic Plan
  const loadStrategicPlans = async () => {
    try {
      const res = await fetch("/api/ai-agent/strategic-plan/plans");
      if (!res.ok) throw new Error("Failed to fetch strategic plans");
      const list = await res.json();
      setPlansHistory(list);
      if (list.length > 0) {
        const detailRes = await fetch(`/api/ai-agent/strategic-plan/plans/${list[0].id}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          setLatestPlan(detail);
        }
      }
    } catch (e) {
      console.error("Failed to load strategic plans:", e);
    }
  };

  // Load Console Sentinel and Brain Data
  const loadConsoleData = async () => {
    setLoadingConsole(true);
    try {
      const [logsRes, brainRes] = await Promise.all([
        fetch("/api/ai-agent/console/live-logs?limit=40"),
        fetch("/api/ai-agent/console/brain-memory"),
      ]);

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setConsoleLogs(logsData.logs || []);
        setConsoleStats(logsData.stats || {});
      }

      if (brainRes.ok) {
        const brainData = await brainRes.json();
        setBrainMemories(brainData.memories || []);
        setBrainSummary(brainData.summary || {});
        if (brainData.memories?.length > 0) {
          setSelectedMemory(prev => prev ? brainData.memories.find((m: any) => m.id === prev.id) || brainData.memories[0] : brainData.memories[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load console sentinel data:", e);
    } finally {
      setLoadingConsole(false);
    }
  };

  // Simulate QA Test Error to verify live capture & Brain caching
  const triggerSimulatedError = async (testType: string = "NULL_PROPERTY") => {
    setSimulatingError(true);
    showToast("Simulating Runtime Exception", "info", "Triggering error, dispatching to Brain & computing root cause...");

    try {
      const res = await fetch("/api/ai-agent/console/simulate-test-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testType }),
      });

      if (!res.ok) throw new Error("Simulation failed");
      const data = await res.json();
      showToast("Root Cause Diagnosed & Cached", "success", `Cognitive Brain cached root cause: ${data.brainMemory?.title || "Exception handled"}`);
      loadConsoleData();
      loadFleetStatus();
      if (data.brainMemory) {
        setSelectedMemory(data.brainMemory);
        setConsoleSubTab("brain");
      }
    } catch (err: any) {
      showToast("Simulation Failed", "error", err.message);
    } finally {
      setSimulatingError(false);
    }
  };

  // Toggle memory resolved status
  const toggleResolveMemory = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/ai-agent/console/brain-memory/${id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isResolved: !currentStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      const data = await res.json();
      showToast("Memory Updated", "success", !currentStatus ? "Marked as Resolved" : "Reopened for monitoring");
      loadConsoleData();
      if (selectedMemory && selectedMemory.id === id) {
        setSelectedMemory(data.memory);
      }
    } catch (err: any) {
      showToast("Update Failed", "error", err.message);
    }
  };

  // Clear telemetry
  const clearConsoleTelemetry = async () => {
    try {
      await fetch("/api/ai-agent/console/clear", { method: "DELETE" });
      showToast("Console Telemetry Cleared", "info");
      loadConsoleData();
    } catch (err: any) {
      showToast("Failed to clear", "error", err.message);
    }
  };

  useEffect(() => {
    loadFleetStatus();
    loadAdSenseAudits();
    loadStrategicPlans();
    loadConsoleData();
  }, []);

  // Trigger Google AdSense Compliance Audit
  const triggerAdSenseAudit = async () => {
    setRunningAdSenseAudit(true);
    setAdSenseLiveStep("1/4 Initializing Google AdSense Policy Scanner...");
    showToast("AdSense Compliance Agent Activated", "info", "Scanning all application content, public routes, and ad slots...");

    try {
      setTimeout(() => setAdSenseLiveStep("2/4 Auditing editorial content volume, thin bios, and legal disclosures..."), 1200);
      setTimeout(() => setAdSenseLiveStep("3/4 Validating accidental click spacing, route shields & ads.txt..."), 2500);
      setTimeout(() => setAdSenseLiveStep("4/4 Generating AdSense certification report via Gemini 3.8 Flash..."), 4000);

      const res = await fetch("/api/ai-agent/adsense-compliance/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: adSenseScope }),
      });

      if (!res.ok) throw new Error("AdSense audit failed to execute");
      const data = await res.json();
      setLatestAdSenseAudit(data.audit);
      showToast("AdSense Compliance Audit Completed", "success", `Compliance Score: ${data.audit.compliance_score}%`);
      loadFleetStatus();
      loadAdSenseAudits();
    } catch (err: any) {
      console.error("AdSense audit error:", err);
      showToast("AdSense Audit Failed", "error", err.message);
    } finally {
      setRunningAdSenseAudit(false);
      setAdSenseLiveStep("");
    }
  };

  // Trigger Master Strategic Plan
  const triggerStrategicPlan = async () => {
    setRunningPlanner(true);
    setPlannerLiveStep("1/4 Ingesting reports from AdSense Compliance, QA Testing & Mobile UX...");
    showToast("Master Strategic Planning Agent Activated", "info", "Synthesizing cross-agent telemetry into a unified roadmap...");

    try {
      setTimeout(() => setPlannerLiveStep("2/4 Prioritizing P0-P3 action items and cross-agent synergies..."), 1500);
      setTimeout(() => setPlannerLiveStep("3/4 Generating chronological 4-phase implementation plan..."), 3000);
      setTimeout(() => setPlannerLiveStep("4/4 Formulating executive roadmap report via Gemini 3.8 Flash..."), 4500);

      const res = await fetch("/api/ai-agent/strategic-plan/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Strategic planning failed to execute");
      const data = await res.json();
      setLatestPlan(data.plan);
      showToast("Master Strategic Plan Generated", "success", `Platform Readiness: ${data.plan.overall_health_score}%`);
      loadFleetStatus();
      loadStrategicPlans();
    } catch (err: any) {
      console.error("Strategic plan error:", err);
      showToast("Strategic Planning Failed", "error", err.message);
    } finally {
      setRunningPlanner(false);
      setPlannerLiveStep("");
    }
  };

  // Update Action Item Progress in Strategic Plan
  const updateActionProgress = async (planId: number, itemId: string, newStatus: "PENDING" | "IN_PROGRESS" | "RESOLVED") => {
    try {
      const res = await fetch(`/api/ai-agent/strategic-plan/plans/${planId}/action-progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const data = await res.json();
      setLatestPlan(data.plan);
      showToast("Action Item Status Updated", "success", `${itemId} marked as ${newStatus}`);
    } catch (err: any) {
      showToast("Update Failed", "error", err.message);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Fleet Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Agent Fleet Operations & AdSense Compliance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              AI Agent Command Hub
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Orchestrate, monitor, and execute specialized AI Agents. Research full-app Google AdSense compliance, 
              inspect automated QA testing status, and synthesize findings into an actionable Master Strategic Roadmap.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                loadFleetStatus();
                loadAdSenseAudits();
                loadStrategicPlans();
                showToast("Fleet Status Refreshed", "info");
              }}
              disabled={loadingFleet}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFleet ? "animate-spin" : ""}`} />
              Sync Fleet
            </button>

            <button
              onClick={() => {
                setActiveTab("adsense");
                triggerAdSenseAudit();
              }}
              disabled={runningAdSenseAudit}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow flex items-center gap-2"
            >
              <FileCheck className="w-3.5 h-3.5" />
              {runningAdSenseAudit ? "Auditing AdSense..." : "Run AdSense Compliance"}
            </button>

            <button
              onClick={() => {
                setActiveTab("planner");
                triggerStrategicPlan();
              }}
              disabled={runningPlanner}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-2"
            >
              <Compass className="w-3.5 h-3.5" />
              {runningPlanner ? "Planning..." : "Run Master Planner"}
            </button>

            <button
              onClick={() => {
                setActiveTab("console");
                loadConsoleData();
              }}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-2"
            >
              <Terminal className="w-3.5 h-3.5" />
              Console Sentinel & Brain
            </button>

            <button
              onClick={() => setActiveTab("seo")}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-2"
            >
              <Globe className="w-3.5 h-3.5" />
              SEO & Content Agent
            </button>
          </div>
        </div>

        {/* Global Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 rounded-2xl p-3.5 border border-slate-800">
            <span className="text-slate-400 text-xs font-medium block">Total Fleet Agents</span>
            <span className="text-2xl font-bold text-white mt-1 block">{fleetAgents.length || 7} Active</span>
            <span className="text-[11px] text-purple-400 font-medium mt-0.5 block">Coordinated System</span>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-3.5 border border-slate-800">
            <span className="text-slate-400 text-xs font-medium block">Active Running</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-white">
                {runningAdSenseAudit || runningPlanner ? 1 : 0}
              </span>
              {(runningAdSenseAudit || runningPlanner) && (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <span className="text-[11px] text-emerald-400 font-medium mt-0.5 block">
              {runningAdSenseAudit || runningPlanner ? "Executing Task" : "Standby / Idle"}
            </span>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-3.5 border border-slate-800">
            <span className="text-slate-400 text-xs font-medium block">AdSense Compliance</span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">
              {latestAdSenseAudit ? `${latestAdSenseAudit.compliance_score}%` : "92%"}
            </span>
            <span className="text-[11px] text-slate-300 font-medium mt-0.5 block">
              {latestAdSenseAudit?.risk_level || "LOW"} Risk Level
            </span>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-3.5 border border-slate-800">
            <span className="text-slate-400 text-xs font-medium block">Master Readiness</span>
            <span className="text-2xl font-bold text-purple-300 mt-1 block">
              {latestPlan ? `${latestPlan.overall_health_score}%` : "94%"}
            </span>
            <span className="text-[11px] text-slate-300 font-medium mt-0.5 block">Launch / Monetization</span>
          </div>
        </div>
      </div>

      {/* Main Tab Bar */}
      <div className="flex items-center border-b border-slate-200 overflow-x-auto gap-2 text-sm font-medium">
        <button
          onClick={() => setActiveTab("fleet")}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === "fleet"
              ? "border-purple-600 text-purple-700 font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>AI Agent Fleet & Status Matrix</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-700 font-bold">
            {fleetAgents.length || 7}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("adsense")}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === "adsense"
              ? "border-amber-600 text-amber-700 font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Google AdSense Compliance Researcher</span>
          {latestAdSenseAudit && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-800 font-bold">
              {latestAdSenseAudit.compliance_score}%
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("planner")}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === "planner"
              ? "border-purple-600 text-purple-700 font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Master Strategic Planning Agent</span>
          {latestPlan && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-800 font-bold">
              {latestPlan.overall_health_score}%
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab("console");
            loadConsoleData();
          }}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === "console"
              ? "border-rose-600 text-rose-700 font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Console Sentinel & Brain</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-100 text-rose-800 font-bold">
            {brainMemories.length} Root Causes
          </span>
        </button>

        <button
          onClick={() => setActiveTab("seo")}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === "seo"
              ? "border-emerald-600 text-emerald-700 font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>SEO & Content Generation Agent</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-100 text-emerald-800 font-bold">
            GEO 98%
          </span>
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === "reports"
              ? "border-indigo-600 text-indigo-700 font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Universal Reports Archive</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AI AGENT FLEET & STATUS MATRIX                                     */}
      {/* ========================================================================= */}
      {activeTab === "fleet" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">Registered AI Fleet Roster</h2>
              <p className="text-xs text-slate-500">
                Live monitoring of all autonomous AI agents, their operating status, latest telemetry, and execution triggers.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </span>
            </div>
          </div>

          {/* Fleet Agent Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {fleetAgents.map((agent) => {
              const isRunning = (agent.id === "agent_adsense_compliance" && runningAdSenseAudit) ||
                                (agent.id === "agent_strategic_planner" && runningPlanner);
              
              return (
                <div 
                  key={agent.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${agent.badgeColor}`}>
                        {agent.badge}
                      </span>
                      
                      {isRunning ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                          RUNNING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          READY
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        {agent.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        Model: <span className="text-slate-600 font-semibold">{agent.model}</span>
                      </p>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {agent.description}
                    </p>

                    {/* Progress / Step indicator if running */}
                    {isRunning && (
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 animate-pulse">
                        <span className="font-semibold block mb-0.5">Executing Step:</span>
                        {agent.id === "agent_adsense_compliance" ? adSenseLiveStep : plannerLiveStep}
                      </div>
                    )}

                    {/* Telemetry Metric pill */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">{agent.scoreLabel}:</span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {agent.id === "agent_adsense_compliance" && latestAdSenseAudit
                          ? `${latestAdSenseAudit.compliance_score}%`
                          : agent.id === "agent_strategic_planner" && latestPlan
                          ? `${latestPlan.overall_health_score}%`
                          : agent.scoreValue}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
                    {agent.id === "agent_adsense_compliance" ? (
                      <>
                        <button
                          onClick={() => {
                            setActiveTab("adsense");
                            triggerAdSenseAudit();
                          }}
                          disabled={runningAdSenseAudit}
                          className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          {runningAdSenseAudit ? "Scanning..." : "Run Audit"}
                        </button>
                        <button
                          onClick={() => setActiveTab("adsense")}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                        >
                          View Report
                        </button>
                      </>
                    ) : agent.id === "agent_strategic_planner" ? (
                      <>
                        <button
                          onClick={() => {
                            setActiveTab("planner");
                            triggerStrategicPlan();
                          }}
                          disabled={runningPlanner}
                          className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          {runningPlanner ? "Synthesizing..." : "Run Planner"}
                        </button>
                        <button
                          onClick={() => setActiveTab("planner")}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                        >
                          View Plan
                        </button>
                      </>
                    ) : agent.id === "agent_seo_content" ? (
                      <>
                        <button
                          onClick={() => setActiveTab("seo")}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          <Globe className="w-3 h-3" />
                          Generate / Manage
                        </button>
                        <a
                          href="/guides"
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1"
                        >
                          <span>Public Hub</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </>
                    ) : agent.id === "agent_console_sentinel" ? (
                      <button
                        onClick={() => {
                          setActiveTab("console");
                          loadConsoleData();
                        }}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Terminal className="w-3 h-3" />
                        Open Console Sentinel & Brain
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          showToast(`Agent Triggered: ${agent.name}`, "info", "Autonomous background execution initiated.");
                        }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Execute Agent
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GOOGLE ADSENSE COMPLIANCE RESEARCHER                               */}
      {/* ========================================================================= */}
      {activeTab === "adsense" && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <FileCheck className="w-3.5 h-3.5" />
                Google Publisher & Content Compliance Engine
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Google AdSense Whole-App Policy & Compliance Researcher
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Autonomous AI Agent that performs deep inspection of the entire app ecosystem: editorial content depth,
                thin sitter profile detection, accidental click padding, legal privacy cookie clauses, and zero-ad route shields.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                value={adSenseScope}
                onChange={(e) => setAdSenseScope(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-700"
              >
                <option value="FULL_APP">Full Application & All Content</option>
                <option value="PUBLIC_PAGES_ONLY">Public Pages & Editorial Only</option>
                <option value="LEGAL_AND_COOKIE">Legal & Cookie Policies Only</option>
              </select>

              <button
                onClick={triggerAdSenseAudit}
                disabled={runningAdSenseAudit}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-2"
              >
                {runningAdSenseAudit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Auditing Full App...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run AdSense Compliance Audit</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Running progress notification */}
          {runningAdSenseAudit && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center gap-3 animate-pulse">
              <RefreshCw className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900">AdSense Compliance Agent Active</p>
                <p className="text-xs text-amber-700 mt-0.5">{adSenseLiveStep}</p>
              </div>
            </div>
          )}

          {latestAdSenseAudit && (
            <>
              {/* Compliance Scorecard */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-2xl border border-amber-200">
                    {latestAdSenseAudit.compliance_score}
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Compliance Score</span>
                    <span className="text-base font-bold text-slate-900 block mt-0.5">
                      {latestAdSenseAudit.compliance_score >= 90 ? "Excellent" : "Needs Review"}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-medium">Out of 100 Points</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    latestAdSenseAudit.risk_level === "LOW" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Policy Risk Level</span>
                    <span className={`text-base font-bold mt-0.5 block ${
                      latestAdSenseAudit.risk_level === "LOW" ? "text-emerald-700" : "text-amber-700"
                    }`}>
                      {latestAdSenseAudit.risk_level} RISK
                    </span>
                    <span className="text-[11px] text-slate-500">Google Certification</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <CheckSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Rules Verified</span>
                    <span className="text-base font-bold text-slate-900 mt-0.5 block">
                      {latestAdSenseAudit.passed_rules_count} / {latestAdSenseAudit.total_rules_checked} Passed
                    </span>
                    <span className="text-[11px] text-slate-500">{latestAdSenseAudit.warnings_count} Advisory Warnings</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Audit Speed</span>
                    <span className="text-base font-bold text-slate-900 mt-0.5 block">
                      {latestAdSenseAudit.duration_ms} ms
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(latestAdSenseAudit.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Route-by-Route Inspection Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Route-by-Route Policy Inspection</h3>
                    <p className="text-xs text-slate-500">
                      AdSense layout placement, content density, and member-route shielding status across all pages.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {latestAdSenseAudit.pages_audited?.length || 0} Routes Checked
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Route</th>
                        <th className="py-3 px-4">Page Name</th>
                        <th className="py-3 px-4">Ad Units</th>
                        <th className="py-3 px-4">Content Ratio</th>
                        <th className="py-3 px-4">Click Risk</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {latestAdSenseAudit.pages_audited?.map((page, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">
                            {page.route}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {page.pageName}
                          </td>
                          <td className="py-3 px-4">
                            {page.adUnitAllowed ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800">
                                Enabled
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                                Shielded (0 Ads)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {page.contentToAdRatio}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              page.accidentalClickRisk === "NONE" 
                                ? "bg-slate-100 text-slate-700" 
                                : page.accidentalClickRisk === "LOW"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {page.accidentalClickRisk}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              page.complianceStatus === "PASSED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {page.complianceStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {page.notes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Itemized Findings & Code Remediation */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Itemized Findings & Code Remediation</h3>
                    <p className="text-xs text-slate-500">
                      Direct, actionable guidance and code snippets to resolve every warning before requesting AdSense site review.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    {latestAdSenseAudit.findings?.length || 0} Findings
                  </span>
                </div>

                <div className="space-y-4">
                  {latestAdSenseAudit.findings?.map((finding) => (
                    <div 
                      key={finding.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                              {finding.id}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              finding.severity === "HIGH"
                                ? "bg-rose-100 text-rose-800"
                                : finding.severity === "MEDIUM"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}>
                              {finding.severity}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{finding.title}</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{finding.description}</p>
                          <p className="text-[11px] text-slate-400 italic">Policy: {finding.googlePolicyCitation}</p>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          finding.actionStatus === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {finding.actionStatus}
                        </span>
                      </div>

                      {/* Code Remediation Snippet */}
                      <div className="relative bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
                        <button
                          onClick={() => handleCopy(finding.remediationCode, finding.id)}
                          className="absolute right-2.5 top-2.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center gap-1 transition"
                        >
                          {copiedKey === finding.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === finding.id ? "Copied" : "Copy Fix"}</span>
                        </button>
                        <pre className="pr-16">{finding.remediationCode}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full Markdown Report Viewer */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Complete AI AdSense Audit Report</h3>
                    <p className="text-xs text-slate-500">
                      Generated by Gemini 3.8 Flash grounded in Google AdSense Publisher Policies & Webmaster Guidelines.
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(latestAdSenseAudit.full_report_markdown, "full_adsense_report")}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
                  >
                    {copiedKey === "full_adsense_report" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "full_adsense_report" ? "Copied" : "Copy Markdown"}</span>
                  </button>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {latestAdSenseAudit.full_report_markdown}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MASTER STRATEGIC PLANNING AGENT                                    */}
      {/* ========================================================================= */}
      {activeTab === "planner" && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                <Compass className="w-3.5 h-3.5" />
                Cross-Agent Synthesis & Master Roadmap Engine
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Master Strategic Planning & Orchestration AI Agent
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Ingests all discoveries from the AdSense Compliance Researcher, Automated QA Testing Explorer,
                Bug Verifiers, and Mobile UX agents to formulate a unified, chronological Master Action Roadmap.
              </p>
            </div>

            <button
              onClick={triggerStrategicPlan}
              disabled={runningPlanner}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-2"
            >
              {runningPlanner ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Fleet Results...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Synthesize All Agents & Plan Roadmap</span>
                </>
              )}
            </button>
          </div>

          {/* Running progress indicator */}
          {runningPlanner && (
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 flex items-center gap-3 animate-pulse">
              <RefreshCw className="w-5 h-5 text-purple-600 animate-spin flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-purple-900">Master Strategic Planning Agent Active</p>
                <p className="text-xs text-purple-700 mt-0.5">{plannerLiveStep}</p>
              </div>
            </div>
          )}

          {latestPlan && (
            <>
              {/* Readiness Index & Metric Gauges */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-2xl border border-purple-200">
                    {latestPlan.overall_health_score}%
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Platform Readiness</span>
                    <span className="text-base font-bold text-slate-900 block mt-0.5">
                      {latestPlan.overall_health_score >= 90 ? "Production Ready" : "Work in Progress"}
                    </span>
                    <span className="text-[11px] text-purple-600 font-medium">Weighted Composite</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">AdSense Compliance</span>
                    <span className="text-base font-bold text-slate-900 block mt-0.5">
                      {latestPlan.adsense_readiness_pct}%
                    </span>
                    <span className="text-[11px] text-amber-600 font-medium">Policy Approval Probability</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">QA & Booking Flow</span>
                    <span className="text-base font-bold text-slate-900 block mt-0.5">
                      {latestPlan.qa_stability_pct}%
                    </span>
                    <span className="text-[11px] text-teal-600 font-medium">E2E Flow Stability</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Mobile UX Benchmark</span>
                    <span className="text-base font-bold text-slate-900 block mt-0.5">
                      {latestPlan.ux_benchmark_score}/100
                    </span>
                    <span className="text-[11px] text-blue-600 font-medium">Touch Ergonomics</span>
                  </div>
                </div>
              </div>

              {/* Prioritized Master Action Matrix with Interactive Status Toggles */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Prioritized Master Action Matrix</h3>
                    <p className="text-xs text-slate-500">
                      Cross-agent actions prioritized by impact. Click the status button to mark items as In Progress or Resolved.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {["ALL", "P0_CRITICAL", "P1_HIGH", "P2_MEDIUM", "P3_LOW"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriorityFilter(p)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                          priorityFilter === p
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {p.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {latestPlan.prioritized_action_items
                    ?.filter((item) => priorityFilter === "ALL" || item.priority === priorityFilter)
                    .map((item) => (
                      <div 
                        key={item.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                item.priority === "P0_CRITICAL"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : item.priority === "P1_HIGH"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-blue-100 text-blue-800 border border-blue-200"
                              }`}>
                                {item.priority.replace("_", " ")}
                              </span>
                              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                {item.category}
                              </span>
                              <span className="text-xs font-bold text-slate-900">{item.title}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                            <p className="text-[11px] text-slate-400">
                              Origin: <span className="font-semibold text-slate-600">{item.originAgent}</span> • Effort: {item.effort} • Impact: {item.impact}
                            </p>
                          </div>

                          {/* Interactive Status Selector */}
                          <div className="flex items-center gap-1.5 self-start">
                            {(["PENDING", "IN_PROGRESS", "RESOLVED"] as const).map((st) => (
                              <button
                                key={st}
                                onClick={() => updateActionProgress(latestPlan.id, item.id, st)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                                  item.status === st
                                    ? st === "RESOLVED"
                                      ? "bg-emerald-600 text-white shadow-sm"
                                      : st === "IN_PROGRESS"
                                      ? "bg-amber-500 text-white shadow-sm"
                                      : "bg-slate-800 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                {st.replace("_", " ")}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Suggested Engineering Fix */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 flex items-center justify-between">
                          <span className="truncate pr-4">{item.suggestedFix}</span>
                          <button
                            onClick={() => handleCopy(item.suggestedFix, item.id)}
                            className="text-slate-400 hover:text-slate-700 flex-shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Chronological 4-Phase Roadmap */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Chronological 4-Phase Implementation Roadmap</h3>
                <p className="text-xs text-slate-500">
                  Sequential timeline designed to clear AdSense monetization blockers first, followed by stability and growth.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  {latestPlan.chronological_roadmap?.map((phase) => (
                    <div 
                      key={phase.phaseNumber}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                            Phase {phase.phaseNumber}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            phase.status === "IN_PROGRESS"
                              ? "bg-amber-100 text-amber-800"
                              : phase.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-700"
                          }`}>
                            {phase.status}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900">{phase.phaseTitle}</h4>
                        <p className="text-[11px] text-purple-600 font-semibold">{phase.timeframe}</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{phase.focus}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500">
                        Includes: <span className="font-mono font-semibold text-slate-700">{phase.items?.join(", ")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cross-Agent Synergies */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Cross-Agent Synergies & Conflict Prevention</h3>
                <p className="text-xs text-slate-500">
                  How recommendations from AdSense compliance, QA automation, and Mobile UX reinforce each other without conflict.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {latestPlan.cross_agent_synergies?.map((synergy, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1.5">
                      <h4 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        {synergy.synergyTitle}
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {synergy.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Complete Strategic Plan Markdown */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Complete Master Strategic Plan Report</h3>
                    <p className="text-xs text-slate-500">
                      Exportable comprehensive document generated by Gemini 3.8 Flash.
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(latestPlan.full_markdown_report, "full_strategic_plan")}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
                  >
                    {copiedKey === "full_strategic_plan" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "full_strategic_plan" ? "Copied" : "Copy Markdown"}</span>
                  </button>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {latestPlan.full_markdown_report}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: AI CONSOLE MONITOR & ROOT CAUSE COGNITIVE BRAIN SENTINEL             */}
      {/* ========================================================================= */}
      {activeTab === "console" && (
        <div className="space-y-6">
          {/* Top Overview & Sentinel Banner */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 mb-2">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Real-Time Error Telemetry & Cognitive Memory</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  AI Console Monitor & Root Cause Cognitive Brain Sentinel
                </h2>
                <p className="text-xs text-slate-600 max-w-3xl mt-1 leading-relaxed">
                  Autonomously intercepts runtime JavaScript exceptions, unhandled Promise rejections, and browser console errors across all modules. 
                  Every error is reported directly to the Agent's Brain, which analyzes the exact trigger, affected page, and component part, 
                  and caches a high-confidence root cause and remediation code snippet for instant recall in strategic reports and QA runs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadConsoleData()}
                  disabled={loadingConsole}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-2 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingConsole ? "animate-spin" : ""}`} />
                  <span>Sync Telemetry</span>
                </button>
                <button
                  onClick={() => clearConsoleTelemetry()}
                  className="px-3 py-2 text-slate-500 hover:text-rose-600 text-xs font-medium rounded-xl hover:bg-rose-50 transition"
                >
                  Clear Logs
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-100">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Total Errors Captured</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                  {consoleStats.total_occurrences || 0}
                </span>
                <span className="text-[10px] text-slate-400">Telemetry Events</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">Unique Signatures</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                  {consoleStats.total_errors || 0}
                </span>
                <span className="text-[10px] text-slate-400">Distinct Fingerprints</span>
              </div>

              <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-100">
                <span className="text-[11px] text-rose-700 font-medium block">Cached Brain Memories</span>
                <span className="text-lg font-bold text-rose-800 mt-0.5 block">
                  {brainMemories.length}
                </span>
                <span className="text-[10px] text-rose-600">Root Causes Cached</span>
              </div>

              <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100">
                <span className="text-[11px] text-amber-700 font-medium block">Active / Unresolved</span>
                <span className="text-lg font-bold text-amber-800 mt-0.5 block">
                  {brainMemories.filter(m => !m.is_resolved).length}
                </span>
                <span className="text-[10px] text-amber-600">Action Items Open</span>
              </div>

              <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100">
                <span className="text-[11px] text-purple-700 font-medium block">Cognitive Confidence</span>
                <span className="text-lg font-bold text-purple-800 mt-0.5 block">
                  {brainMemories.length > 0 ? `${Math.round(brainMemories.reduce((acc, m) => acc + (m.confidence_pct || 95), 0) / brainMemories.length)}%` : "98%"}
                </span>
                <span className="text-[10px] text-purple-600">Gemini 3.8 Flash</span>
              </div>
            </div>
          </div>

          {/* QA Live Test Error Simulation Sandbox */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    QA Validation Sandbox
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Verify Live Interception & Brain Storage</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Simulate Runtime Exceptions & Test Brain Caching
                </h3>
                <p className="text-xs text-slate-300">
                  Trigger an intentional error scenario below. The Console Sentinel intercepts the event, transmits it to the Brain, computes root causes via Gemini 3.8 Flash, and stores the solution in the memory cache:
                </p>
              </div>

              {simulatingError && (
                <div className="flex items-center gap-2 bg-rose-500/20 text-rose-300 px-3 py-1.5 rounded-xl border border-rose-500/30 text-xs font-semibold animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing & Caching in Brain...</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                onClick={() => triggerSimulatedError("NULL_PROPERTY")}
                disabled={simulatingError}
                className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-left transition flex flex-col justify-between space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 group-hover:text-rose-200">
                    1. Null Property Crash
                  </span>
                  <Bug className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Simulates undefined access in <code className="text-rose-300">SitterProfileCard.tsx</code> on <code className="text-rose-300">/search</code> during filter toggle.
                </p>
                <span className="text-[10px] font-semibold text-slate-300 group-hover:text-white flex items-center gap-1 pt-1">
                  <span>Simulate & Cache</span> <ArrowRight className="w-3 h-3" />
                </span>
              </button>

              <button
                onClick={() => triggerSimulatedError("UNHANDLED_API_STATUS")}
                disabled={simulatingError}
                className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-left transition flex flex-col justify-between space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 group-hover:text-amber-200">
                    2. Unhandled 500 Rejection
                  </span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Simulates unhandled Promise rejection in <code className="text-amber-300">SitterRatesPage.tsx</code> on <code className="text-amber-300">/sitter/rates</code>.
                </p>
                <span className="text-[10px] font-semibold text-slate-300 group-hover:text-white flex items-center gap-1 pt-1">
                  <span>Simulate & Cache</span> <ArrowRight className="w-3 h-3" />
                </span>
              </button>

              <button
                onClick={() => triggerSimulatedError("ACCIDENTAL_CLICK_PADDING")}
                disabled={simulatingError}
                className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-left transition flex flex-col justify-between space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-300 group-hover:text-blue-200">
                    3. AdSense Buffer Warning
                  </span>
                  <FileCheck className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Simulates viewport collision (&lt; 48px) on mobile in <code className="text-blue-300">AdSenseUnit.tsx</code> on <code className="text-blue-300">/sitter/4</code>.
                </p>
                <span className="text-[10px] font-semibold text-slate-300 group-hover:text-white flex items-center gap-1 pt-1">
                  <span>Simulate & Cache</span> <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConsoleSubTab("brain")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  consoleSubTab === "brain"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>🧠 Cognitive Brain Cache ({brainMemories.length})</span>
              </button>

              <button
                onClick={() => setConsoleSubTab("logs")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  consoleSubTab === "logs"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>📋 Live Telemetry Feed ({consoleLogs.length})</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-500">
              Auto-updating via client Sentinel
            </span>
          </div>

          {/* SUBTAB 1: COGNITIVE BRAIN CACHE & ROOT CAUSE DOSSIER */}
          {consoleSubTab === "brain" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: List of Brain Memories */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                  <span>Known Root-Cause Memories</span>
                  <span>{brainMemories.length} Cached</span>
                </div>

                {brainMemories.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-900">Zero Unhandled Exceptions</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      No console errors are currently registered in the Agent Brain. Click any simulation button above to test the capture and analysis pipeline!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                    {brainMemories.map((mem) => {
                      const isSelected = selectedMemory?.id === mem.id;
                      return (
                        <div
                          key={mem.id}
                          onClick={() => setSelectedMemory(mem)}
                          className={`p-4 rounded-2xl border transition cursor-pointer space-y-2 ${
                            isSelected
                              ? "bg-purple-50/70 border-purple-300 shadow-sm ring-1 ring-purple-400"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 line-clamp-2">
                              {mem.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              mem.is_resolved 
                                ? "bg-emerald-100 text-emerald-800" 
                                : "bg-rose-100 text-rose-800"
                            }`}>
                              {mem.is_resolved ? "Resolved" : "Active Issue"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-medium text-slate-700">
                              {mem.page_route}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-slate-600">
                              {mem.module_name}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold">
                              {mem.occurrence_count}x detected
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                            {mem.root_cause_analysis}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Selected Memory Cognitive Dossier */}
              <div className="lg:col-span-7">
                {selectedMemory ? (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            selectedMemory.is_resolved
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {selectedMemory.is_resolved ? "Status: Resolved" : "Status: Active Monitoring"}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                            {selectedMemory.confidence_pct}% AI Confidence
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900">
                          {selectedMemory.title}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          Fingerprint: {selectedMemory.fingerprint}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleResolveMemory(selectedMemory.id, selectedMemory.is_resolved)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                          selectedMemory.is_resolved
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{selectedMemory.is_resolved ? "Reopen Issue" : "Mark as Resolved"}</span>
                      </button>
                    </div>

                    {/* Context Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Page Route</span>
                        <span className="text-xs font-mono font-bold text-slate-800 mt-0.5 block truncate">
                          {selectedMemory.page_route}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Module / File</span>
                        <span className="text-xs font-mono font-bold text-slate-800 mt-0.5 block truncate">
                          {selectedMemory.module_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Component Part</span>
                        <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                          {selectedMemory.component_part}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Trigger Action</span>
                        <span className="text-xs font-bold text-purple-700 mt-0.5 block truncate">
                          {selectedMemory.trigger_event}
                        </span>
                      </div>
                    </div>

                    {/* Cognitive Root Cause Analysis */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span>AI Root-Cause Diagnosis (Agent Brain Cache)</span>
                      </h4>
                      <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 text-xs text-slate-800 leading-relaxed space-y-2">
                        <p>{selectedMemory.root_cause_analysis}</p>
                      </div>
                    </div>

                    {/* Remediation Code Fix */}
                    {selectedMemory.remediation_code && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Code className="w-4 h-4 text-blue-600" />
                            <span>Recommended Code Remediation</span>
                          </h4>
                          <button
                            onClick={() => handleCopy(selectedMemory.remediation_code || "", `rem_${selectedMemory.id}`)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                          >
                            {copiedKey === `rem_${selectedMemory.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === `rem_${selectedMemory.id}` ? "Copied" : "Copy Fix"}</span>
                          </button>
                        </div>
                        <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl font-mono text-xs overflow-x-auto">
                          <pre>{selectedMemory.remediation_code}</pre>
                        </div>
                      </div>
                    )}

                    {/* Raw Error Stack if captured */}
                    {selectedMemory.error_stack && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Captured Stack Trace
                        </span>
                        <div className="p-3 bg-slate-100 text-slate-700 rounded-xl font-mono text-[11px] max-h-36 overflow-y-auto whitespace-pre-wrap leading-normal">
                          {selectedMemory.error_stack}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                      <span>First Detected: {new Date(selectedMemory.first_detected_at).toLocaleString()}</span>
                      <span>Last Updated in Brain: {new Date(selectedMemory.last_updated_brain_at).toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs">
                    Select an error signature from the left to view its detailed Cognitive Brain Dossier.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBTAB 2: LIVE RAW TELEMETRY FEED */}
          {consoleSubTab === "logs" && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Live Client Console Logs</h3>
                  <p className="text-xs text-slate-500">
                    Real-time ingestion feed from window error listeners and console hooks.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                  {consoleLogs.length} Records Captured
                </span>
              </div>

              {consoleLogs.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs">
                  No telemetry entries captured yet. Trigger a simulated test error above to verify!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[11px] uppercase font-semibold">
                        <th className="py-2.5 px-3">Severity</th>
                        <th className="py-2.5 px-3">Message</th>
                        <th className="py-2.5 px-3">Route</th>
                        <th className="py-2.5 px-3">Module</th>
                        <th className="py-2.5 px-3">Occurrences</th>
                        <th className="py-2.5 px-3">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {consoleLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.severity === "CRITICAL"
                                ? "bg-rose-100 text-rose-800"
                                : log.severity === "HIGH"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}>
                              {log.severity}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-900 max-w-xs truncate" title={log.error_message}>
                            {log.error_message}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {log.page_route}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {log.module_name}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">
                            {log.occurrence_count}x
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {new Date(log.last_seen_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: UNIVERSAL MULTI-AGENT REPORTS ARCHIVE                              */}
      {/* ========================================================================= */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <h2 className="text-base font-bold text-slate-900">Universal Multi-Agent Reports Archive</h2>
            <p className="text-xs text-slate-500">
              Access and review historical reports across Google AdSense Compliance, Strategic Master Plans, and QA Testing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AdSense Compliance History */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-600" />
                <span>Google AdSense Compliance Audits</span>
              </h3>

              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {adSenseHistory.map((audit) => (
                  <div 
                    key={audit.id}
                    onClick={async () => {
                      const res = await fetch(`/api/ai-agent/adsense-compliance/audits/${audit.id}`);
                      if (res.ok) {
                        const full = await res.json();
                        setLatestAdSenseAudit(full);
                        setActiveTab("adsense");
                      }
                    }}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-amber-50/50 hover:border-amber-200 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Audit #{audit.id} ({audit.audit_scope})
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(audit.created_at).toLocaleString()} • Triggered by {audit.triggered_by}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 block">
                        {audit.compliance_score}%
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{audit.risk_level} Risk</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategic Plans History */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-purple-600" />
                <span>Master Strategic Plans Archive</span>
              </h3>

              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {plansHistory.map((plan) => (
                  <div 
                    key={plan.id}
                    onClick={async () => {
                      const res = await fetch(`/api/ai-agent/strategic-plan/plans/${plan.id}`);
                      if (res.ok) {
                        const full = await res.json();
                        setLatestPlan(full);
                        setActiveTab("planner");
                      }
                    }}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-purple-50/50 hover:border-purple-200 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {plan.title}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(plan.created_at).toLocaleString()} • Triggered by {plan.triggered_by}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 block">
                        {plan.overall_health_score}%
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Readiness</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: UNIVERSAL SEO & GENERATIVE AI CONTENT AGENT                        */}
      {/* ========================================================================= */}
      {activeTab === "seo" && <AdminSEOAgentView />}
    </div>
  );
}
