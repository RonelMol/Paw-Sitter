import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, RefreshCw, 
  Play, Download, Copy, Check, Terminal, FileText, Lock, 
  Eye, Cpu, Bug, Zap, ExternalLink, Sparkles, Filter, Search,
  ChevronDown, ChevronRight, Activity, ArrowUpRight, ArrowDownRight,
  Shield, Layers, Flame, Database, Key, Server, BarChart3, HelpCircle
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import type { OwaspAuditReport, OwaspTestResult, OwaspCategorySummary, SeverityLevel, TestStatus, OwaspCategory } from "../types/owasp";

export function AdminOwaspSecurityPage() {
  const { user, dbUser } = useAuth();
  const { addToast } = useToast();

  const [report, setReport] = useState<OwaspAuditReport | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"explorer" | "categories" | "history" | "ai_prompts">("explorer");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  // AI Prompt Hub state
  const [promptTargetModel, setPromptTargetModel] = useState<string>("gemini");
  const [selectedTestCodesForPrompt, setSelectedTestCodesForPrompt] = useState<string[]>([]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [copiedPromptCode, setCopiedPromptCode] = useState<string | null>(null);

  // Historical comparison modal
  const [selectedHistoryScan, setSelectedHistoryScan] = useState<OwaspAuditReport | null>(null);
  const [loadingHistoryDetails, setLoadingHistoryDetails] = useState(false);

  const scanIntervalRef = useRef<any>(null);

  const fetchLatestAudit = async () => {
    try {
      setLoading(true);
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/security/owasp/latest", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error("Failed to fetch latest OWASP audit:", err);
      addToast("Failed to load security audit data", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/security/owasp/history?limit=15", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch audit history:", err);
    }
  };

  useEffect(() => {
    fetchLatestAudit();
    fetchHistory();
  }, [user]);

  // Execute a new live OWASP scan
  const handleRunScan = async () => {
    try {
      setScanning(true);
      setScanProgress(10);
      
      // Animate progress smoothly
      scanIntervalRef.current = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.floor(Math.random() * 15) + 5;
        });
      }, 150);

      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/security/owasp/scan", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      clearInterval(scanIntervalRef.current);
      setScanProgress(100);

      if (res.ok) {
        const data = await res.json();
        setReport(data);
        addToast("Full OWASP 2026 Security Audit Completed!", "success");
        fetchHistory();
      } else {
        const errData = await res.json();
        addToast(errData.error || "Security scan failed", "error");
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      addToast("Failed to complete security scan", "error");
    } finally {
      setTimeout(() => {
        setScanning(false);
        setScanProgress(0);
      }, 400);
    }
  };

  // Generate customized AI Fix Prompt
  const handleGeneratePrompt = async () => {
    try {
      setGeneratingPrompt(true);
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/security/owasp/generate-fix-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          testCodes: selectedTestCodesForPrompt.length > 0 ? selectedTestCodesForPrompt : undefined,
          targetModel: promptTargetModel,
          customInstructions: customInstructions || undefined,
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedPrompt(data.prompt);
        addToast("AI Remediation Prompt generated!", "success");
      }
    } catch (err) {
      console.error("Prompt generation error:", err);
      addToast("Failed to generate AI fix prompt", "error");
    } finally {
      setGeneratingPrompt(false);
    }
  };

  // Copy text helper
  const handleCopyText = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptCode(identifier);
    addToast("Copied to clipboard!", "success");
    setTimeout(() => {
      setCopiedPromptCode(null);
    }, 2500);
  };

  // Export JSON Report
  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `owasp-2026-audit-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Exported JSON Security Audit Report", "success");
  };

  // Export Markdown Playbook
  const handleExportMarkdown = () => {
    if (!report) return;
    let md = `# 🛡️ PawShield Cyber Security Audit Report (OWASP 2026 Spec)\n\n`;
    md += `**Date:** ${new Date(report.createdAt).toLocaleString()}\n`;
    md += `**Overall Security Score:** ${report.overallScore}/100 (Grade ${report.grade})\n`;
    md += `**Risk Level:** ${report.riskLevel}\n`;
    md += `**Auditor:** ${report.triggeredBy}\n`;
    md += `**Total Tests Executed:** ${report.totalTests} | Passed: ${report.passedTests} | Warnings: ${report.warningTests} | Failed: ${report.failedTests}\n\n`;
    md += `---\n\n## 📊 OWASP 2026 Category Breakdown\n\n`;
    report.categorySummaries.forEach((cat) => {
      md += `### ${cat.title}\n`;
      md += `- Score: ${cat.score}%\n- Passed: ${cat.passed}/${cat.total} | Status: ${cat.status}\n\n`;
    });
    md += `---\n\n## 🔍 Detailed Test Findings & Evidence\n\n`;
    report.testResults.forEach((t, i) => {
      md += `### ${i + 1}. [${t.status}] ${t.code} - ${t.name}\n`;
      md += `- **Severity:** ${t.severity} | **CWE:** ${t.cwe} | **CVSS:** ${t.cvssScore}\n`;
      md += `- **Target:** ${t.targetEndpoint}\n`;
      md += `- **Description:** ${t.description}\n`;
      md += `- **Evidence:** ${t.evidence}\n`;
      md += `- **Recommendation:** ${t.recommendation}\n\n`;
      md += `#### AI Remediation Directive:\n\`\`\`text\n${t.remediationPrompt}\n\`\`\`\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `owasp-2026-remediation-playbook-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Exported Markdown Remediation Playbook", "success");
  };

  // Filtered test results
  const filteredTests = (report?.testResults || []).filter((test) => {
    if (selectedCategory !== "ALL" && test.category !== selectedCategory) return false;
    if (selectedStatus !== "ALL" && test.status !== selectedStatus) return false;
    if (selectedSeverity !== "ALL" && test.severity !== selectedSeverity) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        test.name.toLowerCase().includes(q) ||
        test.code.toLowerCase().includes(q) ||
        test.description.toLowerCase().includes(q) ||
        test.targetEndpoint.toLowerCase().includes(q) ||
        test.cwe.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const loadHistoricalScan = async (id: number) => {
    try {
      setLoadingHistoryDetails(true);
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/admin/security/owasp/scan/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedHistoryScan(data);
      }
    } catch (err) {
      console.error("Failed to load historical scan:", err);
      addToast("Failed to load historical scan details", "error");
    } finally {
      setLoadingHistoryDetails(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Top Header & Command Actions */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Background Cyber Glow & Grid Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                OWASP TOP 10 (2026 SPEC)
              </span>
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                AI FIX PROMPT ENGINE
              </span>
              <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-mono rounded-full">
                Active Defense & IDOR Armor
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Cyber Security & OWASP 2026 Auditor
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Automated full-stack vulnerability scanner testing all application endpoints, role barriers, escrow protocols, and prompt injection vectors. Generate ready-to-use AI fix prompts and historical compliance reports.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleRunScan}
              disabled={scanning}
              className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-200 shadow-lg flex items-center gap-2 cursor-pointer ${
                scanning
                  ? "bg-emerald-600/80 text-white cursor-not-allowed"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 hover:shadow-emerald-500/40"
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? `Auditing (${scanProgress}%)...` : "Run Full OWASP 2026 Audit"}
            </button>

            <button
              onClick={() => {
                setActiveTab("ai_prompts");
                handleGeneratePrompt();
              }}
              className="px-4 py-3 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-300" />
              Generate Master AI Fix Prompt
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJson}
                title="Export JSON Audit Report"
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-2xl transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleExportMarkdown}
                title="Export Markdown Remediation Playbook"
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-2xl transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Progress Bar during active scan */}
        {scanning && (
          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span className="flex items-center gap-2 text-emerald-400">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                Executing Automated Vulnerability Probes across 20+ Endpoints...
              </span>
              <span>{scanProgress}% Completed</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-200"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Hero Scorecard & Threat Posture Matrix */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Overall Security Score */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-slate-100"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeDasharray={213.6}
                  strokeDashoffset={213.6 - (213.6 * report.overallScore) / 100}
                  strokeLinecap="round"
                  className={
                    report.overallScore >= 90
                      ? "text-emerald-500"
                      : report.overallScore >= 75
                      ? "text-amber-500"
                      : "text-rose-500"
                  }
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-slate-900">{report.overallScore}</span>
                <span className="text-[10px] font-bold text-slate-400">/ 100</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Posture</span>
                <span className={`px-2 py-0.5 text-[10px] font-black rounded-md ${
                  report.grade === "A+" || report.grade === "A"
                    ? "bg-emerald-100 text-emerald-800"
                    : report.grade === "B"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  Grade {report.grade}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {report.overallScore >= 95 ? "Hardened & Clean" : report.overallScore >= 80 ? "Well Protected" : "Action Required"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Risk Level: <span className="font-semibold text-slate-700">{report.riskLevel}</span>
              </p>
            </div>
          </div>

          {/* 2. Passed & Verified Tests */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tests Passed</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900">{report.passedTests}</span>
                <span className="text-xs font-medium text-slate-500">/ {report.totalTests} rules</span>
              </div>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                {((report.passedTests / (report.totalTests || 1)) * 100).toFixed(0)}% verification rate
              </p>
            </div>
          </div>

          {/* 3. Warnings & Recommendations */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hardening Warnings</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-amber-600">{report.warningTests}</span>
                <span className="text-xs font-medium text-slate-500">items</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {report.failedTests > 0 ? `${report.failedTests} critical failures` : "0 Critical vulnerabilities"}
              </p>
            </div>
          </div>

          {/* 4. Active Defense Radar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Defenses</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900">10 / 10</span>
                <span className="text-xs font-medium text-emerald-600 font-bold">Armed</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit took <span className="font-semibold text-slate-700">{report.durationMs}ms</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl">
          <button
            onClick={() => setActiveTab("explorer")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "explorer"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            Vulnerability Explorer & Fixes ({filteredTests.length})
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "categories"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            OWASP 2026 Categories (10)
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
            Historical Reports ({history.length})
          </button>
          <button
            onClick={() => setActiveTab("ai_prompts")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "ai_prompts"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-indigo-600 hover:text-indigo-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Prompt Generator
          </button>
        </div>

        {report && (
          <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
            <span>Last Scanned: {new Date(report.createdAt).toLocaleTimeString()}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VULNERABILITY EXPLORER & INTERACTIVE TESTS */}
      {/* ========================================================================= */}
      {activeTab === "explorer" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by test code, CWE, endpoint, or vulnerability..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Categories (A01 - A10)</option>
                <option value="A01_BROKEN_ACCESS_CONTROL">A01: Broken Access Control & IDOR</option>
                <option value="A02_CRYPTOGRAPHIC_FAILURES">A02: Cryptographic Failures</option>
                <option value="A03_INJECTION">A03: Injection & Parameter Tampering</option>
                <option value="A04_INSECURE_DESIGN">A04: Insecure Design & Logic</option>
                <option value="A05_SECURITY_MISCONFIGURATION">A05: Security Misconfiguration</option>
                <option value="A06_VULNERABLE_COMPONENTS">A06: Supply Chain & Dependencies</option>
                <option value="A07_AUTH_FAILURES">A07: Authentication & Session</option>
                <option value="A08_DATA_INTEGRITY">A08: Software & Data Integrity</option>
                <option value="A09_LOGGING_MONITORING">A09: Logging & Telemetry</option>
                <option value="A10_SSRF_API_ABUSE">A10: SSRF & AI Prompt Injection</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Statuses</option>
                <option value="PASSED">Passed Only</option>
                <option value="WARNING">Warnings Only</option>
                <option value="FAILED">Failed Only</option>
              </select>

              {/* Severity Filter */}
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {(searchQuery || selectedCategory !== "ALL" || selectedStatus !== "ALL" || selectedSeverity !== "ALL") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("ALL");
                    setSelectedStatus("ALL");
                    setSelectedSeverity("ALL");
                  }}
                  className="px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Test Cards List */}
          <div className="space-y-3">
            {filteredTests.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">No Tests Found Matching Filter</h3>
                <p className="text-xs text-slate-400 mt-1">Try resetting the category, status, or search keywords.</p>
              </div>
            ) : (
              filteredTests.map((test) => {
                const isExpanded = expandedTestId === test.id;
                const isPassed = test.status === "PASSED";
                const isWarning = test.status === "WARNING";
                const isFailed = test.status === "FAILED";

                return (
                  <div
                    key={test.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
                      isFailed
                        ? "border-rose-300 ring-1 ring-rose-300/50"
                        : isWarning
                        ? "border-amber-300"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/75 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        {/* Status Icon */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isPassed
                              ? "bg-emerald-50 text-emerald-600"
                              : isWarning
                              ? "bg-amber-50 text-amber-600"
                              : "bg-rose-50 text-rose-600"
                          }`}
                        >
                          {isPassed ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : isWarning ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : (
                            <ShieldAlert className="w-5 h-5" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {test.code}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-black rounded-md ${
                                test.severity === "CRITICAL"
                                  ? "bg-rose-100 text-rose-800"
                                  : test.severity === "HIGH"
                                  ? "bg-orange-100 text-orange-800"
                                  : test.severity === "MEDIUM"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {test.severity}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {test.cwe} (CVSS: {test.cvssScore})
                            </span>
                            {test.testDurationMs && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                • {test.testDurationMs}ms
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">{test.name}</h4>
                          <p className="text-xs text-slate-500 line-clamp-1">{test.description}</p>
                        </div>
                      </div>

                      {/* Right Action & Status Badge */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                            isPassed
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isWarning
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {test.status}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyText(test.remediationPrompt, test.id);
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          {copiedPromptCode === test.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                              Copy AI Fix Prompt
                            </>
                          )}
                        </button>

                        <div className="p-1 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details Drawer */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Evidence & Endpoint */}
                          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                              Target Endpoint & Evidence
                            </span>
                            <div className="font-mono text-xs text-indigo-600 bg-indigo-50/60 p-2 rounded-lg border border-indigo-100">
                              {test.targetEndpoint}
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">{test.evidence}</p>
                            {test.simulatedPayload && (
                              <div className="pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Tested Probe Payload:
                                </span>
                                <code className="text-[11px] font-mono text-slate-600 bg-slate-100 p-1.5 rounded block">
                                  {test.simulatedPayload}
                                </code>
                              </div>
                            )}
                          </div>

                          {/* Recommendation */}
                          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                              Defensive Recommendation
                            </span>
                            <p className="text-xs text-slate-700 leading-relaxed">{test.recommendation}</p>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                              <span>Target File:</span>
                              <code className="font-mono text-indigo-600 font-medium">
                                {test.targetFile || "server.ts / routes"}
                              </code>
                            </div>
                          </div>
                        </div>

                        {/* Code Patch Snippet */}
                        {test.codePatchSnippet && (
                          <div className="bg-slate-900 rounded-xl p-4 text-slate-200 space-y-2 font-mono text-xs">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                              <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
                                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                                Recommended Defensive Code Patch
                              </span>
                              <button
                                onClick={() => handleCopyText(test.codePatchSnippet!, `${test.id}-patch`)}
                                className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                {copiedPromptCode === `${test.id}-patch` ? "Copied!" : "Copy Snippet"}
                              </button>
                            </div>
                            <pre className="overflow-x-auto text-[11px] leading-relaxed text-emerald-300">
                              {test.codePatchSnippet}
                            </pre>
                          </div>
                        )}

                        {/* Dedicated AI Fix Prompt Block */}
                        <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-indigo-600" />
                              Ready-To-Use AI Fix Prompt
                            </span>
                            <button
                              onClick={() => handleCopyText(test.remediationPrompt, `${test.id}-box`)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              {copiedPromptCode === `${test.id}-box` ? "Copied!" : "Copy Full Prompt"}
                            </button>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-indigo-100 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                            {test.remediationPrompt}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: OWASP 2026 CATEGORY COMPLIANCE BREAKDOWN */}
      {/* ========================================================================= */}
      {activeTab === "categories" && report && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.categorySummaries.map((cat) => (
              <div
                key={cat.category}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      OWASP 2026 Standard
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{cat.title}</h3>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg shrink-0 ${
                      cat.status === "SECURE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : cat.status === "NEEDS_ATTENTION"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {cat.status === "SECURE" ? "Hardened" : cat.status.replace("_", " ")}
                  </span>
                </div>

                {/* Progress Bar & Score */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Category Security Score</span>
                    <span className="font-black text-slate-900">{cat.score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        cat.score >= 90
                          ? "bg-emerald-500"
                          : cat.score >= 70
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold block">Total Tests</span>
                    <span className="text-sm font-bold text-slate-900">{cat.total}</span>
                  </div>
                  <div className="bg-emerald-50/60 p-2 rounded-xl">
                    <span className="text-[10px] text-emerald-600 font-bold block">Passed</span>
                    <span className="text-sm font-bold text-emerald-700">{cat.passed}</span>
                  </div>
                  <div className="bg-amber-50/60 p-2 rounded-xl">
                    <span className="text-[10px] text-amber-600 font-bold block">Warnings</span>
                    <span className="text-sm font-bold text-amber-700">{cat.warnings}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedCategory(cat.category);
                    setActiveTab("explorer");
                  }}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View All Tests in Category
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HISTORICAL AUDIT REPORTS */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Historical Security Audits & Logs</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete audit trail of all previous OWASP scans, security grades, and posture evolution.
                </p>
              </div>
              <button
                onClick={fetchHistory}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh History
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-mono uppercase">
                    <th className="py-3 px-4 font-bold">Scan ID</th>
                    <th className="py-3 px-4 font-bold">Timestamp</th>
                    <th className="py-3 px-4 font-bold">Score</th>
                    <th className="py-3 px-4 font-bold">Grade</th>
                    <th className="py-3 px-4 font-bold">Risk Level</th>
                    <th className="py-3 px-4 font-bold">Tests</th>
                    <th className="py-3 px-4 font-bold">Duration</th>
                    <th className="py-3 px-4 font-bold">Triggered By</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No previous security audit records found. Click "Run Full OWASP 2026 Audit" to record your first scan.
                      </td>
                    </tr>
                  ) : (
                    history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          #{h.id}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(h.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <span className={h.overall_score >= 90 ? "text-emerald-600 font-black" : "text-amber-600 font-black"}>
                            {h.overall_score} / 100
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-black text-[10px]">
                            {h.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            h.risk_level === "CLEAN" || h.risk_level === "LOW"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {h.risk_level}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="text-emerald-600 font-bold">{h.passed_tests}P</span>
                          {h.warning_tests > 0 && <span className="text-amber-600 font-bold ml-1">{h.warning_tests}W</span>}
                          {h.failed_tests > 0 && <span className="text-rose-600 font-bold ml-1">{h.failed_tests}F</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {h.duration_ms}ms
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {h.triggered_by}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => loadHistoricalScan(h.id)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Historical Scan Viewer Modal / Drawer */}
          {selectedHistoryScan && (
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold rounded-lg">
                    HISTORICAL AUDIT #{selectedHistoryScan.id}
                  </span>
                  <span className="text-xs text-slate-400">
                    Recorded: {new Date(selectedHistoryScan.createdAt).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedHistoryScan(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Close Snapshot ✕
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-800/80 p-3 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block">Overall Score</span>
                  <span className="text-xl font-black text-emerald-400">{selectedHistoryScan.overallScore}/100</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block">Grade</span>
                  <span className="text-xl font-black text-white">{selectedHistoryScan.grade}</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block">Passed Tests</span>
                  <span className="text-xl font-black text-emerald-400">{selectedHistoryScan.passedTests}</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block">Audited By</span>
                  <span className="text-sm font-bold text-slate-300">{selectedHistoryScan.triggeredBy}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Showing archived snapshot with {selectedHistoryScan.testResults?.length || 0} evaluated security rules.
                </p>
                <button
                  onClick={() => {
                    setReport(selectedHistoryScan);
                    setActiveTab("explorer");
                    addToast(`Loaded historical audit #${selectedHistoryScan.id} into active view`, "info");
                  }}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Load Snapshot into Explorer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AI REMEDIATION PROMPT GENERATOR COMMAND HUB */}
      {/* ========================================================================= */}
      {activeTab === "ai_prompts" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold rounded-md">
                  AI PROMPT ARCHITECT
                </span>
                <span className="text-xs text-slate-500 font-medium">1-Click Remediation Workflow</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">
                AI Cyber Security Fix Prompt Generator
              </h3>
              <p className="text-xs text-slate-600 max-w-3xl leading-relaxed mt-1">
                Generate highly engineered, context-aware prompt playbooks you can paste directly into Gemini, Claude, or any AI assistant to implement robust security patches, defensive middleware, and verification tests.
              </p>
            </div>

            {/* Prompt Config Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target AI Model / Assistant Format
                </label>
                <select
                  value={promptTargetModel}
                  onChange={(e) => setPromptTargetModel(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="gemini">Google Gemini 2.5 / 3.0 (Structured Engineering Prompt)</option>
                  <option value="claude">Anthropic Claude 3.7 Sonnet (Constitutional AppSec Prompt)</option>
                  <option value="openai">OpenAI GPT-4o (Strict Code Patch Directive)</option>
                  <option value="markdown">Standard Markdown AppSec Playbook</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Additional Custom Directives (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prioritize strict TypeScript typing, maintain zero downtime..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Generate Trigger */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Generates complete multi-finding directive with code snippets, CWE references, and test instructions.
              </p>

              <button
                onClick={handleGeneratePrompt}
                disabled={generatingPrompt}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {generatingPrompt ? "Synthesizing AI Playbook..." : "Generate Master Fix Prompt"}
              </button>
            </div>

            {/* Prompt Output Viewer */}
            {generatedPrompt && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-indigo-600" />
                    Generated AI Prompt (Ready to Copy & Paste)
                  </span>

                  <button
                    onClick={() => handleCopyText(generatedPrompt, "master-prompt")}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {copiedPromptCode === "master-prompt" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied Prompt!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Master Fix Prompt
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-inner">
                  <pre className="text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {generatedPrompt}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
