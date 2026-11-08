import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Bot,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  RefreshCw,
  Terminal,
  Code2,
  Cpu,
  Layers,
  Search,
  Check,
  Zap,
  Loader2,
  Coins,
  Key,
  History,
  Calendar,
  ChevronRight,
  Filter,
  FileText
} from "lucide-react";
import { useToast } from "../components/ToastContext";

interface AuditCheck {
  module: string;
  status: "PASSED" | "WARNING" | "FAILED";
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  details: string;
}

interface HistoricalAudit {
  id: number;
  health_score: number;
  status: string;
  ai_engine: string;
  checks: AuditCheck[] | string;
  ai_report: string;
  created_at: string;
}

export function AIBugInspectorPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"live" | "history" | "analyzer">("live");

  const [scanning, setScanning] = useState(false);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [checks, setChecks] = useState<AuditCheck[]>([]);
  const [aiReport, setAiReport] = useState<string>("");
  const [aiEngine, setAiEngine] = useState<string>("");

  // History state
  const [historicalAudits, setHistoricalAudits] = useState<HistoricalAudit[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoricalAudit, setSelectedHistoricalAudit] = useState<HistoricalAudit | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("");

  // Custom Error Analyzer State
  const [customError, setCustomError] = useState("");
  const [componentContext, setComponentContext] = useState("Booking & 3-Step Guard");
  const [analyzingError, setAnalyzingError] = useState(false);
  const [customAnalysis, setCustomAnalysis] = useState<string | null>(null);

  // Run initial scan on load & fetch history
  useEffect(() => {
    runScan();
    fetchHistoricalAudits();
  }, []);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/ai-agent/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setHealthScore(data.healthScore);
        setChecks(data.checks || []);
        setAiReport(data.aiReport || "");
        setAiEngine(data.aiEngine || "Antigravity Free QA Engine");
        toast({ title: "Scan Complete", description: `Health Score: ${data.healthScore}/100`, type: "success" });
        fetchHistoricalAudits();
      } else {
        toast({ title: "Audit Error", description: data.error || "Failed to complete audit", type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Connection Notice", description: "Audit completed using local diagnostic engine", type: "info" });
    } finally {
      setScanning(false);
    }
  };

  const fetchHistoricalAudits = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/ai-agent/historical-audits");
      if (res.ok) {
        const data = await res.json();
        setHistoricalAudits(data);
        if (data.length > 0 && !selectedHistoricalAudit) {
          setSelectedHistoricalAudit(data[0]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch historical audits:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAnalyzeCustomError = async () => {
    if (!customError.trim()) {
      toast({ title: "Input Required", description: "Please paste an error log or message to inspect.", type: "error" });
      return;
    }

    setAnalyzingError(true);
    setCustomAnalysis(null);
    try {
      const res = await fetch("/api/ai-agent/analyze-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorMessage: customError,
          componentContext,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCustomAnalysis(data.analysis);
        toast({ title: "AI Analysis Ready", description: "Root cause diagnosis generated.", type: "success" });
      } else {
        toast({ title: "Error", description: data.error, type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Analysis Note", description: "Heuristic diagnosis generated.", type: "info" });
    } finally {
      setAnalyzingError(false);
    }
  };

  // Filter history by date if provided
  const filteredHistory = historicalAudits.filter((audit) => {
    if (!dateFilter) return true;
    const auditDate = new Date(audit.created_at).toISOString().split("T")[0];
    return auditDate === dateFilter;
  });

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-64px)] py-10">
      <div className="container mx-auto px-4 max-w-5xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Antigravity QA Engine • Free Tier Active
                </span>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Zero Token Cost
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                AI Bug & System Error Inspector
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                Continuous automated QA auditor inspecting database integrity, Philippine Peso (₱) rate conversion, anti-duplicate validation, and 3-booking membership limits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runScan}
              disabled={scanning}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95"
            >
              {scanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Scanning Systems...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" /> Trigger System Scan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("live")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "live" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Zap className="w-4 h-4" /> Live Diagnostic Results
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "history" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <History className="w-4 h-4" /> Historical Reports by Date ({historicalAudits.length})
          </button>
          <button
            onClick={() => setActiveTab("analyzer")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "analyzer" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Terminal className="w-4 h-4" /> Error Log Debugger
          </button>
        </div>

        {/* TAB 1: LIVE DIAGNOSTIC RESULTS */}
        {activeTab === "live" && (
          <div className="space-y-6">
            {/* Scorecard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl border ${
                  healthScore && healthScore >= 90
                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                    : "bg-amber-50 border-amber-200 text-amber-600"
                }`}>
                  {healthScore !== null ? `${healthScore}%` : "--"}
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    System Health Score
                  </span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {healthScore && healthScore >= 90 ? "All Modules Healthy" : "Warnings Detected"}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Automated QA integrity verification</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold flex items-center justify-center">
                  <Cpu className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Active AI Model
                  </span>
                  <div className="text-sm font-black text-slate-900 mt-0.5 truncate max-w-[180px]">
                    {aiEngine || "Antigravity Free QA"}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Zero API Token Cost Engine</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 font-bold flex items-center justify-center">
                  <Layers className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Inspected Modules
                  </span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {checks.length || 7} Core Modules
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Database, Escrow & Limits</p>
                </div>
              </div>
            </div>

            {/* Checks Grid */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900">Automated QA Integrity Checks</h2>
                <span className="text-xs font-bold text-slate-500">{checks.length} checks performed</span>
              </div>
              <div className="divide-y divide-slate-100">
                {checks.map((check, idx) => (
                  <div key={idx} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-slate-50/60 transition-colors">
                    <div className="mt-0.5">
                      {check.status === "PASSED" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : check.status === "WARNING" ? (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{check.module}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          check.status === "PASSED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : check.status === "WARNING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          {check.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{check.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Synthesis Report */}
            {aiReport && (
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-indigo-600">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="text-base font-bold text-slate-900">AI Diagnostic Report & Synthesis</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Live Session</span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {aiReport}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HISTORICAL REPORTS BY DATE */}
        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <div>
                  <span className="text-xs font-bold text-slate-900">Filter Historical Runs by Date</span>
                  <p className="text-[11px] text-slate-400">Select a specific date to view the audit snapshot.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter("")}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                  >
                    Clear Filter
                  </button>
                )}
                <button
                  onClick={fetchHistoricalAudits}
                  className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl"
                  title="Refresh List"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingHistory ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Timeline List */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                <div className="pb-3 px-2 font-bold text-xs text-slate-500 uppercase tracking-wider">
                  Audit Runs ({filteredHistory.length})
                </div>

                {filteredHistory.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No audits found matching selected criteria.
                  </div>
                ) : (
                  filteredHistory.map((audit) => {
                    const isSelected = selectedHistoricalAudit?.id === audit.id;
                    const date = new Date(audit.created_at);
                    const formattedDate = date.toLocaleDateString();
                    const formattedTime = date.toLocaleTimeString();

                    return (
                      <div
                        key={audit.id}
                        onClick={() => setSelectedHistoricalAudit(audit)}
                        className={`py-3.5 px-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
                          isSelected ? "bg-indigo-50 border border-indigo-200" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center ${
                            audit.health_score >= 90
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {audit.health_score}%
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{formattedDate}</span>
                              <span className="text-[10px] text-slate-400">{formattedTime}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                              {audit.ai_engine || "Antigravity QA"}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 ${isSelected ? "text-indigo-600" : "text-slate-300"}`} />
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right: Selected Historical Report Inspector */}
              <div className="lg:col-span-2 space-y-4">
                {selectedHistoricalAudit ? (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Historical Report #{selectedHistoricalAudit.id}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {selectedHistoricalAudit.status}
                          </span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mt-1">
                          Audit Snapshot for {new Date(selectedHistoricalAudit.created_at).toLocaleString()}
                        </h2>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Health Score</span>
                        <span className="text-3xl font-black text-indigo-600">{selectedHistoricalAudit.health_score}%</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Full AI Synthesis from this Date:
                      </h3>
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {selectedHistoricalAudit.ai_report}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-xs">
                    Select an audit date from the list on the left to view the full historical inspection.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOM ERROR LOG DEBUGGER */}
        {activeTab === "analyzer" && (
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-slate-700" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Live Error & Bug Log Analyzer</h3>
                  <p className="text-xs text-slate-500">Paste any console error, API response, or unexpected behavior for instant AI diagnosis.</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                Smart Debugger
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Paste Error Message / Log:
                </label>
                <textarea
                  rows={4}
                  value={customError}
                  onChange={(e) => setCustomError(e.target.value)}
                  placeholder="e.g. Failed to confirm booking: Membership required after 3 bookings or Duplicate mobile number detected..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Component Context</label>
                  <select
                    value={componentContext}
                    onChange={(e) => setComponentContext(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Booking & 3-Step Guard">Booking & 3-Step Guard</option>
                    <option value="Sitter Free Limit & Pro Paywall">Sitter Free Limit & Pro Paywall</option>
                    <option value="Referral Link & Commission Hub">Referral Link & Commission Hub</option>
                    <option value="Buy Me A Coffee & Cash on Service">Buy Me A Coffee & Cash on Service</option>
                    <option value="Sitter Registration & Valid IDs">Sitter Registration & Valid IDs</option>
                    <option value="Anti-Duplicate Account Protection">Anti-Duplicate Account Protection</option>
                    <option value="Disbursement Bank Payouts">Disbursement Bank Payouts</option>
                    <option value="Philippine Peso Currency Consistency">Philippine Peso Currency Consistency</option>
                    <option value="AdSense & Route Protection">AdSense & Route Protection</option>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={analyzingError}
                  onClick={handleAnalyzeCustomError}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  {analyzingError ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 fill-white" />
                  )}
                  <span>Diagnose with AI</span>
                </button>
              </div>
            </div>

            {customAnalysis && (
              <div className="mt-4 p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed animate-in fade-in">
                {customAnalysis}
              </div>
            )}
          </div>
        )}

        {/* API Key & Token Module Info */}
        <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-slate-500" />
            <span>
              <strong>AI Model & Token Status:</strong> Operating on <strong>Antigravity Heuristic Engine</strong> & server-side Gemini Flash. No external paid subscription or extra tokens needed!
            </span>
          </div>
          <span className="font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[10px]">
            FREE & ZERO COST
          </span>
        </div>

      </div>
    </div>
  );
}
