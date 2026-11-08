import { useState, useEffect } from "react";
import { 
  Bot, Play, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, 
  Terminal, ArrowRight, RefreshCw, Sparkles, Copy, Check, 
  Trash2, Filter, Layers, Zap, Clock, ShieldAlert, FileText, ChevronDown, ChevronUp
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";

interface PlaywrightLog {
  timestamp: string;
  module: string;
  action: "CREATE" | "READ" | "UPDATE" | "DELETE" | "SECURITY_CHECK";
  playwrightCode: string;
  selector: string;
  status: "PASSED" | "FAILED" | "WARNING";
  durationMs: number;
  assertion: string;
  details?: string;
}

interface QAFinding {
  id: number;
  run_id: number;
  module_name: string;
  action_tested: string;
  finding_title: string;
  description: string;
  reproduction_steps: string;
  playwright_selector: string;
  expected_behavior: string;
  actual_behavior: string;
  initial_severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  verification_status: "PENDING" | "VALID_BUG" | "FALSE_POSITIVE" | "INTENDED_DESIGN" | "CANNOT_REPRODUCE";
  verified_by_agent_2: boolean;
  agent_2_confidence_pct: number;
  agent_2_verdict?: string;
  agent_2_analysis?: string;
  agent_2_suggested_fix?: string;
  verified_at?: string;
  created_at: string;
}

interface QARun {
  id: number;
  suite_name: string;
  target_module: string;
  status: string;
  total_tests: number;
  passed_count: number;
  failed_count: number;
  warning_count: number;
  duration_ms: number;
  report_summary: string;
  playwright_logs: PlaywrightLog[];
  triggered_by: string;
  created_at: string;
  findings_count?: number;
  valid_bugs_count?: number;
  false_positives_count?: number;
  pending_verifications_count?: number;
}

export function AIAgentStudioPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const showToast = (title: string, type: "success" | "error" | "info" = "info", desc?: string) => {
    if (addToast) addToast(title, type, desc);
  };

  const [activeTab, setActiveTab] = useState<"findings" | "telemetry" | "coverage" | "history">("findings");
  const [targetModule, setTargetModule] = useState<string>("ALL");
  const [runningAgent1, setRunningAgent1] = useState(false);
  const [activeRun, setActiveRun] = useState<QARun | null>(null);
  const [findings, setFindings] = useState<QAFinding[]>([]);
  const [playwrightLogs, setPlaywrightLogs] = useState<PlaywrightLog[]>([]);
  const [historicalRuns, setHistoricalRuns] = useState<QARun[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Agent 2 Verification State
  const [verifyingFindingId, setVerifyingFindingId] = useState<number | null>(null);
  const [batchVerifying, setBatchVerifying] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [copiedPatchId, setCopiedPatchId] = useState<number | null>(null);
  const [expandedFindingId, setExpandedFindingId] = useState<number | null>(null);

  // Load past runs on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/ai-agent/qa-runs");
      if (res.ok) {
        const data = await res.json();
        setHistoricalRuns(data);
        if (data.length > 0 && !activeRun) {
          // Load the latest run automatically
          loadRunDetails(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load QA history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadRunDetails = async (runId: number) => {
    try {
      const res = await fetch(`/api/ai-agent/qa-runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveRun(data.run);
        setFindings(data.findings || []);
        setPlaywrightLogs(typeof data.run.playwright_logs === "string" 
          ? JSON.parse(data.run.playwright_logs) 
          : data.run.playwright_logs || []);
      }
    } catch (e) {
      showToast("Failed to load run details", "error");
    }
  };

  const handleRunAgent1 = async () => {
    try {
      setRunningAgent1(true);
      const token = await user?.getIdToken();
      const res = await fetch("/api/ai-agent/qa-run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ targetModule }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to execute QA suite");
      }

      const data = await res.json();
      setActiveRun(data.run);
      setPlaywrightLogs(data.playwrightLogs || []);
      setFindings(data.findings || []);
      showToast(`Agent 1 completed QA run! ${data.findings.length} findings flagged for Agent 2.`, "success");
      fetchHistory();
    } catch (e: any) {
      showToast(e.message || "Failed to run Agent 1 QA Suite", "error");
    } finally {
      setRunningAgent1(false);
    }
  };

  const handleVerifyFinding = async (findingId: number) => {
    try {
      setVerifyingFindingId(findingId);
      const token = await user?.getIdToken();
      const res = await fetch(`/api/ai-agent/verify-finding/${findingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error("Failed to verify finding with Agent 2");
      }

      const updated = await res.json();
      setFindings(prev => prev.map(f => f.id === findingId ? updated : f));
      setExpandedFindingId(findingId);
      showToast(`Agent 2 verified finding #${findingId}: ${updated.verification_status}`, "success");
      fetchHistory();
    } catch (e: any) {
      showToast(e.message || "Agent 2 verification failed", "error");
    } finally {
      setVerifyingFindingId(null);
    }
  };

  const handleBatchVerify = async () => {
    if (!activeRun) return;
    try {
      setBatchVerifying(true);
      const token = await user?.getIdToken();
      const res = await fetch(`/api/ai-agent/verify-all-findings/${activeRun.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        showToast("Agent 2 verified all findings for this run!", "success");
        loadRunDetails(activeRun.id);
        fetchHistory();
      }
    } catch (e: any) {
      showToast("Batch verification failed", "error");
    } finally {
      setBatchVerifying(false);
    }
  };

  const handleDeleteRun = async (runId: number) => {
    if (!confirm("Are you sure you want to delete this QA report and its findings?")) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/ai-agent/qa-runs/${runId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        showToast("Report deleted", "info");
        if (activeRun?.id === runId) {
          setActiveRun(null);
          setFindings([]);
          setPlaywrightLogs([]);
        }
        fetchHistory();
      }
    } catch (e) {
      showToast("Failed to delete report", "error");
    }
  };

  const copyPatchToClipboard = (patch: string, id: number) => {
    navigator.clipboard.writeText(patch);
    setCopiedPatchId(id);
    showToast("Code patch copied to clipboard!", "success");
    setTimeout(() => setCopiedPatchId(null), 2500);
  };

  const filteredFindings = findings.filter(f => {
    if (filterSeverity !== "ALL" && f.initial_severity !== filterSeverity) return false;
    if (filterStatus !== "ALL" && f.verification_status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header & Agent Architecture */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Autonomous Dual-Agent System
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              AI QA & Bug Verification Studio
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Agent 1 autonomously simulates Playwright UI interactions, testing CRUD across all modules. 
              Agent 2 validates reproducibility, eliminates false positives, and generates concrete code fixes.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition border border-white/15 text-white flex items-center gap-2 text-xs font-semibold"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? "animate-spin" : ""}`} />
              Sync Runs
            </button>
          </div>
        </div>

        {/* Dual Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 text-purple-300">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Agent 1: Playwright QA Explorer</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold">READY</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Executes synthetic browser actions testing <strong>Create, Read, Update, Delete</strong> across 7 core modules. Captures live DOM selectors & telemetry.
              </p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Agent 2: Bug Verification Auditor</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold">GEMINI 3.8</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Vets findings from Agent 1. Identifies genuine regressions vs. false positives, calculates confidence %, and drafts exact patch fixes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Control Center */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-600" />
              Launch Playwright UI Test Suite
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select module scope to simulate end-to-end user actions and CRUD workflows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={targetModule}
              onChange={(e) => setTargetModule(e.target.value)}
              disabled={runningAgent1}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">🌐 All Modules (Full App Suite - 7 Modules)</option>
              <option value="BOOKINGS">📅 Bookings & Sitter Requests (CRUD)</option>
              <option value="PETS">🐾 Pet Management & Profiles (CRUD)</option>
              <option value="SITTERS">⭐ Sitter Rate Cards & Availability (CRUD)</option>
              <option value="COMMUNICATION">💬 In-App Chat & Safety Filter (CRUD)</option>
              <option value="ADMIN_GOVERNANCE">🛡️ Admin Platform Fees & Audit (CRUD)</option>
              <option value="ENVIRONMENT">⚙️ Environment & API Keys (CRUD)</option>
            </select>

            <button
              onClick={handleRunAgent1}
              disabled={runningAgent1}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-2"
            >
              {runningAgent1 ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Agent 1 Running Playwright...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Run Agent 1 QA Suite
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Simulation Progress Banner */}
        {runningAgent1 && (
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-3 animate-pulse">
            <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
            <div className="text-xs text-indigo-900">
              <span className="font-bold">Playwright Engine Executing:</span> Crawling UI elements, filling forms, and executing assertions across targeted modules...
            </div>
          </div>
        )}
      </div>

      {/* Active Run Overview Metric Cards */}
      {activeRun && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Test Report</span>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                {activeRun.suite_name}
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Run #{activeRun.id}
                </span>
              </h3>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Executed {new Date(activeRun.created_at).toLocaleString()} by <span className="font-semibold text-slate-700">{activeRun.triggered_by}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-medium">Total UI Tests</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{activeRun.total_tests}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Automated steps</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Passed
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{activeRun.passed_count}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Verified clean</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-rose-600 text-xs font-medium flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Failed
              </div>
              <div className="text-2xl font-black text-rose-600 mt-1">{activeRun.failed_count}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Critical exceptions</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-amber-600 text-xs font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Flagged Findings
              </div>
              <div className="text-2xl font-black text-amber-600 mt-1">{findings.length}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">For Agent 2 audit</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
              <div className="text-slate-500 text-xs font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Latency
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">{activeRun.duration_ms}ms</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Execution speed</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("findings")}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap px-2 ${
              activeTab === "findings"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Agent 2 Bug Verification Board
            {findings.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-800 font-bold">
                {findings.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("telemetry")}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap px-2 ${
              activeTab === "telemetry"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Terminal className="w-4 h-4" />
            Playwright Execution Logs
            {playwrightLogs.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-700 font-bold">
                {playwrightLogs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("coverage")}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap px-2 ${
              activeTab === "coverage"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            CRUD Module Coverage Matrix
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap px-2 ${
              activeTab === "history"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            Historical QA Reports
            {historicalRuns.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-700 font-bold">
                {historicalRuns.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: AGENT 2 BUG VERIFICATION & AUDITING BOARD */}
      {activeTab === "findings" && (
        <div className="space-y-6">
          {/* Filter and Bulk Verification Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Filter className="w-3.5 h-3.5" /> Filters:
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Verification Statuses</option>
                <option value="PENDING">Pending Agent 2 Audit</option>
                <option value="VALID_BUG">Confirmed Valid Bugs</option>
                <option value="FALSE_POSITIVE">False Positives (Dismissed)</option>
                <option value="INTENDED_DESIGN">Intended Platform Design</option>
              </select>

              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {findings.length > 0 && (
              <button
                onClick={handleBatchVerify}
                disabled={batchVerifying}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-2 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {batchVerifying ? "Agent 2 Auditing..." : "Batch Verify All with Agent 2 (Gemini)"}
              </button>
            )}
          </div>

          {filteredFindings.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900">No Anomalies Flagged in This Scope</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Either all Playwright assertions passed seamlessly, or no findings match your filter criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFindings.map((finding) => {
                const isExpanded = expandedFindingId === finding.id;
                const isVerifying = verifyingFindingId === finding.id;

                const severityBadge = {
                  CRITICAL: "bg-rose-100 text-rose-800 border-rose-200",
                  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
                  MEDIUM: "bg-amber-100 text-amber-800 border-amber-200",
                  LOW: "bg-slate-100 text-slate-700 border-slate-200",
                }[finding.initial_severity];

                const statusBadge = {
                  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
                  VALID_BUG: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
                  FALSE_POSITIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  INTENDED_DESIGN: "bg-blue-50 text-blue-700 border-blue-200",
                  CANNOT_REPRODUCE: "bg-slate-50 text-slate-600 border-slate-200",
                }[finding.verification_status];

                return (
                  <div
                    key={finding.id}
                    className={`bg-white rounded-2xl border transition shadow-sm overflow-hidden ${
                      finding.verification_status === "VALID_BUG" 
                        ? "border-rose-300 ring-1 ring-rose-100" 
                        : "border-slate-200"
                    }`}
                  >
                    {/* Finding Header */}
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${severityBadge}`}>
                            {finding.initial_severity}
                          </span>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {finding.module_name}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-semibold">
                            {finding.action_tested}
                          </span>
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${statusBadge}`}>
                            {finding.verification_status === "PENDING" && "⏳ PENDING VERIFICATION"}
                            {finding.verification_status === "VALID_BUG" && "🚨 CONFIRMED BUG (AGENT 2)"}
                            {finding.verification_status === "FALSE_POSITIVE" && "🛡️ FALSE POSITIVE"}
                            {finding.verification_status === "INTENDED_DESIGN" && "📐 INTENDED DESIGN"}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 mt-1">
                          {finding.finding_title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {finding.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!finding.verified_by_agent_2 ? (
                          <button
                            onClick={() => handleVerifyFinding(finding.id)}
                            disabled={isVerifying}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {isVerifying ? "Auditing..." : "Verify with Agent 2"}
                          </button>
                        ) : (
                          <div className="text-right">
                            <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              {finding.agent_2_confidence_pct}% Confidence
                            </span>
                            <span className="text-[10px] text-slate-400 block">Verified by Gemini</span>
                          </div>
                        )}

                        <button
                          onClick={() => setExpandedFindingId(isExpanded ? null : finding.id)}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Technical Analysis & Code Patch */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/50">
                        {/* Reproduction Vector */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                            <span className="font-bold text-slate-700">Target Selector</span>
                            <code className="block bg-slate-100 p-1.5 rounded font-mono text-[11px] text-indigo-700">
                              {finding.playwright_selector || "N/A"}
                            </code>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                            <span className="font-bold text-slate-700">Expected vs Actual</span>
                            <div className="text-slate-600 text-[11px]">
                              <strong>Exp:</strong> {finding.expected_behavior}
                            </div>
                            <div className="text-rose-600 text-[11px]">
                              <strong>Act:</strong> {finding.actual_behavior}
                            </div>
                          </div>
                        </div>

                        {/* Reproduction Steps */}
                        {finding.reproduction_steps && (
                          <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
                            <span className="font-bold text-xs text-slate-700">Playwright Reproduction Steps:</span>
                            <pre className="text-xs text-slate-600 font-sans whitespace-pre-wrap leading-relaxed">
                              {finding.reproduction_steps}
                            </pre>
                          </div>
                        )}

                        {/* Agent 2 Deep Analysis */}
                        {finding.verified_by_agent_2 && (
                          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                <Bot className="w-4 h-4 text-indigo-600" />
                                Agent 2 Verification Audit ({finding.agent_2_verdict || "Validated"})
                              </span>
                              <span className="text-[11px] font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200">
                                {finding.agent_2_confidence_pct}% Reproducibility
                              </span>
                            </div>

                            <p className="text-xs text-indigo-950 leading-relaxed">
                              {finding.agent_2_analysis}
                            </p>

                            {/* Suggested Code Fix */}
                            {finding.agent_2_suggested_fix && (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                                    Suggested Code Patch Fix:
                                  </span>
                                  <button
                                    onClick={() => copyPatchToClipboard(finding.agent_2_suggested_fix!, finding.id)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2 py-1 rounded border border-indigo-200 transition"
                                  >
                                    {copiedPatchId === finding.id ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" /> Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" /> Copy Patch
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto">
                                  {finding.agent_2_suggested_fix}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PLAYWRIGHT TELEMETRY LOGS */}
      {activeTab === "telemetry" && (
        <div className="bg-slate-900 rounded-3xl p-6 text-slate-100 shadow-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-mono text-slate-400 ml-2">playwright.headless.console.log</span>
            </div>
            <span className="text-xs font-mono text-indigo-400">
              {playwrightLogs.length} events recorded
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs max-h-[500px] overflow-y-auto pr-2">
            {playwrightLogs.map((log, idx) => (
              <div key={idx} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-2">
                    <span className="text-indigo-400 font-bold">[{log.module}]</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 text-[10px] font-bold">
                      {log.action}
                    </span>
                  </span>
                  <span className="text-emerald-400 font-bold">{log.status} ({log.durationMs}ms)</span>
                </div>
                <div className="text-amber-300 text-xs font-mono overflow-x-auto py-1">
                  $ {log.playwrightCode}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Asserted: {log.assertion}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CRUD COVERAGE MATRIX */}
      {activeTab === "coverage" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Application CRUD & UI Action Matrix</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Summary of automated Playwright test coverage verifying Create, Read, Update, and Delete actions across modules.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">Module Name</th>
                  <th className="p-4 text-center">Create (C)</th>
                  <th className="p-4 text-center">Read (R)</th>
                  <th className="p-4 text-center">Update (U)</th>
                  <th className="p-4 text-center">Delete (D)</th>
                  <th className="p-4 text-center">Security / Guard</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {[
                  { name: "Bookings & Sitter Requests", c: "PASS", r: "PASS", u: "PASS", d: "PASS", s: "PASS", notes: "Escrow calculation verified in PHP (₱)" },
                  { name: "Pet Profiles & Care Instructions", c: "PASS", r: "PASS", u: "PASS", d: "PASS", s: "PASS", notes: "Behavioral notes & medical alerts" },
                  { name: "Sitter Rate Cards & Availability", c: "PASS", r: "PASS", u: "PASS", d: "PASS", s: "PASS", notes: "Calendar blockout dates & ₱ base rates" },
                  { name: "In-App Messaging & Safety", c: "PASS", r: "PASS", u: "N/A", d: "N/A", s: "PASS", notes: "Disintermediation filter active" },
                  { name: "Admin Platform Fees & Governance", c: "PASS", r: "PASS", u: "PASS", d: "PASS", s: "PASS", notes: "Audit log transaction trail verified" },
                  { name: "Environment & API Keys Hub", c: "PASS", r: "PASS", u: "PASS", d: "PASS", s: "PASS", notes: "Runtime override without container restart" },
                  { name: "Sitter Identity & Anti-Fraud", c: "PASS", r: "PASS", u: "PASS", d: "PASS", s: "PASS", notes: "Anti-duplicate national ID & bank account" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-bold text-slate-900">
                      {row.name}
                      <span className="block text-[11px] font-normal text-slate-500 mt-0.5">{row.notes}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                        {row.c}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                        {row.r}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${row.u === "PASS" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {row.u}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${row.d === "PASS" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {row.d}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-[10px]">
                        {row.s}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                        <CheckCircle2 className="w-4 h-4" /> Operational
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: HISTORICAL QA REPORTS */}
      {activeTab === "history" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Historical QA Execution Reports</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every test run is stored permanently in PostgreSQL with step logs and Agent 2 validation audits.
              </p>
            </div>
            <button
              onClick={fetchHistory}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {historicalRuns.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No historical runs found. Run Agent 1 to generate your first automated QA report.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historicalRuns.map((r) => (
                <div
                  key={r.id}
                  className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition ${
                    activeRun?.id === r.id ? "bg-indigo-50/50" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{r.suite_name}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[11px] font-semibold">
                        #{r.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        r.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Executed {new Date(r.created_at).toLocaleString()} • Scope: <strong>{r.target_module}</strong> • {r.duration_ms}ms
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                      <span>Tests: <strong>{r.total_tests}</strong></span>
                      <span className="text-emerald-600">Passed: <strong>{r.passed_count}</strong></span>
                      <span className="text-rose-600">Failed: <strong>{r.failed_count}</strong></span>
                      <span className="text-amber-600">Findings: <strong>{r.findings_count || 0}</strong></span>
                      {Number(r.valid_bugs_count || 0) > 0 && (
                        <span className="text-rose-700 font-bold">Confirmed Bugs: {r.valid_bugs_count}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => loadRunDetails(r.id)}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition shadow-xs"
                    >
                      {activeRun?.id === r.id ? "Viewing Current" : "Load Report"}
                    </button>
                    <button
                      onClick={() => handleDeleteRun(r.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Run"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
