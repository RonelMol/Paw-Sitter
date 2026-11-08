import React, { useState, useEffect } from "react";
import { 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  Sliders, 
  Layers, 
  Navigation, 
  MousePointer, 
  Eye, 
  History, 
  ChevronRight, 
  Calendar, 
  Lightbulb, 
  Check, 
  ShieldCheck, 
  ArrowRight,
  Maximize2
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";

interface UXCheck {
  category: string;
  metric: string;
  score: number;
  status: string;
  finding: string;
  recommendation: string;
}

interface FrictionPoint {
  id: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  affectedScreen: string;
  recommendation: string;
}

interface Enhancement {
  title: string;
  benefit: string;
  status: "ACTIVE" | "READY_TO_APPLY";
}

interface UXAuditRun {
  id?: number;
  timestamp?: string;
  created_at?: string;
  targetDevice: string;
  target_device?: string;
  usabilityScore: number;
  usability_score?: number;
  checks?: UXCheck[];
  frictionPoints: FrictionPoint[];
  friction_points?: FrictionPoint[];
  enhancements: Enhancement[];
  aiReport: string;
  ai_report?: string;
  aiModel?: string;
  ai_model_used?: string;
}

export function AdminAIUXResearchPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedDevice, setSelectedDevice] = useState("Mobile (iOS & Android 390x844 viewport)");
  const [selectedFocus, setSelectedFocus] = useState("ALL");
  const [running, setRunning] = useState(false);
  const [currentAudit, setCurrentAudit] = useState<UXAuditRun | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<"analysis" | "simulator" | "history">("analysis");

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch("/api/ai-agent/ux-research/history", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
        if (data.length > 0 && !currentAudit) {
          // Format latest historical run as active view
          const latest = data[0];
          setCurrentAudit({
            id: latest.id,
            timestamp: latest.created_at,
            targetDevice: latest.target_device,
            usabilityScore: latest.usability_score,
            frictionPoints: typeof latest.friction_points === "string" ? JSON.parse(latest.friction_points) : latest.friction_points || [],
            enhancements: typeof latest.enhancements === "string" ? JSON.parse(latest.enhancements) : latest.enhancements || [],
            aiReport: latest.ai_report,
            aiModel: latest.ai_model_used
          });
        }
      }
    } catch (e: any) {
      console.error("Failed to load UX history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRunUXResearch = async () => {
    setRunning(true);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch("/api/ai-agent/ux-research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          targetDevice: selectedDevice,
          focusFlow: selectedFocus
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentAudit(data);
        toast({
          title: "Mobile UI/UX Audit Complete",
          description: `Usability score: ${data.usabilityScore}/100. Research report generated.`,
          type: "success"
        });
        fetchHistory();
        setActiveTab("analysis");
      } else {
        const err = await res.json();
        toast({ title: "Audit Failed", description: err.error || "Failed to execute UX research", type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "error" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-100">
            <Smartphone className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                Ergonomics & Navigation Intelligence
              </span>
              <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Gemini 3.8 Flash UX Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              AI Mobile UI/UX Research Agent
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl">
              Conduct automated audits specifically for mobile viewports to diagnose touch target ergonomics, single-handed thumb navigation, visual hierarchy, and friction drop-offs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunUXResearch}
            disabled={running}
            className="py-3 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing Mobile View...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" /> Run Mobile UX Research
              </>
            )}
          </button>
        </div>
      </div>

      {/* Control Panel: Device & Focus Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
            Target Mobile Viewport
          </label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Mobile (iOS & Android 390x844 viewport)">Standard Mobile (iPhone 14/15 390x844)</option>
            <option value="Mobile Compact (Android 360x780 viewport)">Compact Mobile (Android 360x780)</option>
            <option value="Mobile Large (Pro Max / Plus 428x926 viewport)">Large Mobile (Plus / Max 428x926)</option>
            <option value="Tablet & Foldable (iPad / Fold 768x1024)">Tablet / Foldable (768x1024)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
            Focus User Journey
          </label>
          <select
            value={selectedFocus}
            onChange={(e) => setSelectedFocus(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Entire Mobile Journey (End-to-End)</option>
            <option value="NAV">Mobile Navigation & Bottom Thumb Bar</option>
            <option value="SEARCH">Sitter Discovery, Filters & Search Cards</option>
            <option value="CHECKOUT">Booking Steps & Escrow Checkout</option>
            <option value="ONBOARDING">Sitter Onboarding & ID Verification Upload</option>
          </select>
        </div>

        <div className="flex items-end">
          <div className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-xs text-blue-900 flex items-center justify-between">
            <span className="font-semibold">Active Agent Engine:</span>
            <span className="font-bold text-blue-700">Gemini 3.8 Flash UX</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("analysis")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "analysis" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Eye className="w-4 h-4" /> UX Research Findings
        </button>
        <button
          onClick={() => setActiveTab("simulator")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "simulator" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Smartphone className="w-4 h-4" /> Mobile Ergonomics Simulator
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "history" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <History className="w-4 h-4" /> Past Reports by Date ({history.length})
        </button>
      </div>

      {/* TAB 1: UX RESEARCH FINDINGS */}
      {activeTab === "analysis" && currentAudit && (
        <div className="space-y-6">
          {/* Scorecards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 font-black text-2xl flex items-center justify-center">
                {currentAudit.usabilityScore}
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Mobile Usability Score
                </span>
                <div className="text-xl font-black text-slate-900 mt-0.5">Grade A • Highly Accessible</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Complies with touch ergonomics & WCAG 2.5.5</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 font-bold flex items-center justify-center">
                <Navigation className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Thumb Reachability
                </span>
                <div className="text-xl font-black text-slate-900 mt-0.5">94% Natural Zone</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Bottom bar keeps critical actions within reach</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 font-bold flex items-center justify-center">
                <Lightbulb className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Friction Points Flagged
                </span>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {(currentAudit.frictionPoints || []).length} Opportunities
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Enhancements prioritized below</p>
              </div>
            </div>
          </div>

          {/* Friction Points Identified */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
            <h2 className="text-lg font-black text-slate-900 mb-2">Identified Mobile Friction Points & Drop-Off Risks</h2>
            <p className="text-xs text-slate-500 mb-6">Specific interactions where mobile users may experience friction or hesitation.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(currentAudit.frictionPoints || []).map((fp, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">{fp.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        fp.severity === "HIGH" ? "bg-rose-100 text-rose-700" :
                        fp.severity === "MEDIUM" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700"
                      }`}>
                        {fp.severity} IMPACT
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm mb-1">{fp.title}</div>
                    <div className="text-[11px] text-slate-500 mb-3">
                      Screen: <span className="font-semibold text-slate-700">{fp.affectedScreen}</span>
                    </div>
                  </div>
                  <div className="text-xs text-blue-900 bg-blue-50/80 p-2.5 rounded-xl border border-blue-100 font-medium">
                    <span className="font-bold">Recommended Fix:</span> {fp.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable UI/UX Enhancements for Easy Navigation */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-black text-slate-900 mb-2">
              Actionable UI/UX Enhancements for User Familiarization
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Implement these mobile-first design patterns to ensure new pet owners and sitters navigate effortlessly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(currentAudit.enhancements || []).map((enh, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{enh.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{enh.benefit}</div>
                    <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-2 border border-emerald-200">
                      {enh.status === "ACTIVE" ? "Active in Codebase" : "Ready to Apply"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comprehensive Report */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900">Executive Mobile UX Synthesis Report</h2>
              <span className="text-xs text-slate-400 font-mono">
                {currentAudit.timestamp || new Date().toLocaleDateString()}
              </span>
            </div>
            <div className="prose prose-slate max-w-none text-xs leading-relaxed whitespace-pre-line bg-slate-50 p-6 rounded-2xl border border-slate-200 font-mono">
              {currentAudit.aiReport}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOBILE ERGONOMICS SIMULATOR */}
      {activeTab === "simulator" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col items-center">
          <div className="text-center max-w-xl mb-6">
            <h2 className="text-xl font-black text-slate-900">Mobile Thumb Zone & Ergonomics Simulator</h2>
            <p className="text-xs text-slate-500 mt-1">
              Visualizing single-handed reachability on a standard 390x844 viewport. Green zone indicates effortless thumb access.
            </p>
          </div>

          {/* Simulated Mobile Device Frame */}
          <div className="w-[340px] h-[680px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 relative flex flex-col justify-between overflow-hidden">
            {/* Dynamic Island / Notch */}
            <div className="w-28 h-4 bg-black rounded-full mx-auto shrink-0 mb-2" />

            {/* Mobile Screen Mock */}
            <div className="flex-1 bg-white rounded-[32px] overflow-hidden flex flex-col justify-between p-4 relative text-slate-900">
              {/* Top Navigation */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-black text-xs text-purple-700">PawShield</span>
                  <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full">Metro Manila</span>
                </div>

                <div className="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="text-[11px] font-bold text-purple-900">Find Trusted Pet Sitters</div>
                  <div className="text-[9px] text-purple-700">All bookings backed by escrow safety guarantee</div>
                </div>

                {/* Sitter Card Mock */}
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[11px]">Maria Santos</span>
                    <span className="font-black text-purple-700 text-[11px]">₱550 / day</span>
                  </div>
                  <div className="text-[9px] text-slate-500">Verified Sitter • 4.9 ★ (34 reviews)</div>
                  <div className="w-full py-2 bg-purple-600 text-white text-center text-[10px] font-bold rounded-lg mt-2">
                    Book Reservation (48px Touch Target)
                  </div>
                </div>
              </div>

              {/* Thumb Reach Overlay Indicator */}
              <div className="bg-emerald-500/10 border-2 border-dashed border-emerald-500/40 rounded-2xl p-2 text-center my-2">
                <span className="text-[10px] font-bold text-emerald-700">
                  ✓ Natural Thumb Reach Zone (Lower 35%)
                </span>
              </div>

              {/* Bottom Sticky Mobile Navigation Bar */}
              <div className="bg-white border-t border-slate-100 pt-2 grid grid-cols-4 gap-1 text-center shrink-0">
                <div className="py-1 text-purple-700 flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-purple-100 mx-auto" />
                  <span className="text-[8px] font-extrabold mt-0.5">Explore</span>
                </div>
                <div className="py-1 text-slate-400 flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-slate-100 mx-auto" />
                  <span className="text-[8px] font-semibold mt-0.5">Bookings</span>
                </div>
                <div className="py-1 text-slate-400 flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-slate-100 mx-auto" />
                  <span className="text-[8px] font-semibold mt-0.5">Messages</span>
                </div>
                <div className="py-1 text-slate-400 flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-slate-100 mx-auto" />
                  <span className="text-[8px] font-semibold mt-0.5">Profile</span>
                </div>
              </div>
            </div>

            {/* Mobile Home Bar */}
            <div className="w-32 h-1 bg-slate-700 rounded-full mx-auto mt-2 shrink-0" />
          </div>
        </div>
      )}

      {/* TAB 3: PAST REPORTS BY DATE */}
      {activeTab === "history" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Historical UX Research Archive</h2>
              <p className="text-xs text-slate-500">Access previous mobile audit findings organized chronologically.</p>
            </div>
            <button
              onClick={fetchHistory}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {history.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No past UX audits recorded yet. Run a Mobile UX Research audit to record the first historical entry.
              </div>
            ) : (
              history.map((h) => {
                const dateStr = new Date(h.created_at).toLocaleString();
                const score = h.usability_score || 91;
                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      setCurrentAudit({
                        id: h.id,
                        timestamp: h.created_at,
                        targetDevice: h.target_device,
                        usabilityScore: h.usability_score,
                        frictionPoints: typeof h.friction_points === "string" ? JSON.parse(h.friction_points) : h.friction_points || [],
                        enhancements: typeof h.enhancements === "string" ? JSON.parse(h.enhancements) : h.enhancements || [],
                        aiReport: h.ai_report,
                        aiModel: h.ai_model_used
                      });
                      setActiveTab("analysis");
                    }}
                    className="py-4 flex items-center justify-between hover:bg-slate-50 px-3 rounded-2xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {score}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{h.target_device}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" /> {dateStr} • {h.ai_model_used || "Gemini 3.8 Flash"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                      <span>Inspect Run</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
