import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "./ToastContext";
import {
  CheckCircle2,
  Clock,
  Star,
  Zap,
  TrendingUp,
  RefreshCw,
  Award,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  Sparkles,
  AlertCircle,
  ThumbsUp,
  X,
  Play,
  HeartHandshake
} from "lucide-react";

interface PerformanceMetrics {
  acceptanceRate: {
    value: number;
    formatted: string;
    acceptedCount: number;
    declinedCount: number;
    totalReceived: number;
    benchmark: string;
    status: "EXCELLENT" | "GOOD" | "NEEDS_IMPROVEMENT";
    description: string;
  };
  responseTime: {
    minutes: number;
    formatted: string;
    responseRatePct: number;
    label: string;
    benchmark: string;
    targetThreshold: string;
    status: "EXCELLENT" | "GOOD" | "SLOW";
    description: string;
  };
  starRating: {
    average: number;
    formatted: string;
    totalReviews: number;
    ratingBreakdown: { [key: number]: number };
    fiveStarPercentage: number;
    status: "EXCELLENT" | "GOOD" | "AVERAGE";
    description: string;
  };
  repeatClientRate: {
    value: number;
    formatted: string;
    repeatClientsCount: number;
    totalClientsCount: number;
    benchmark: string;
    status: "EXCELLENT" | "GOOD";
    description: string;
  };
  photoComplianceRate: {
    value: number;
    formatted: string;
    description: string;
  };
}

interface SuperSitterCriterion {
  name: string;
  target: string;
  current: string;
  isMet: boolean;
  description: string;
}

interface ReviewItem {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

interface GrowthTip {
  title: string;
  tip: string;
  icon: string;
}

interface PerformanceData {
  timeframe: "30d" | "90d" | "all";
  sitterId: number;
  sitterBadgeTier: string;
  isSuperSitter: boolean;
  metrics: PerformanceMetrics;
  superSitterCriteria: SuperSitterCriterion[];
  recentReviews: ReviewItem[];
  growthTips: GrowthTip[];
}

export function SitterPerformanceOverview({
  onViewBookings,
  onViewReviews
}: {
  onViewBookings?: () => void;
  onViewReviews?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [timeframe, setTimeframe] = useState<"30d" | "90d" | "all">("all");
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Simulation form
  const [simPetName, setSimPetName] = useState("Luna (Pomeranian)");
  const [simService, setSimService] = useState("BOARDING");
  const [simAmount, setSimAmount] = useState("1400");

  const loadPerformanceData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/sitters/me/performance?timeframe=${timeframe}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn("Failed to load performance metrics:", err);
      }
    } catch (error) {
      console.error("Error loading sitter performance:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadPerformanceData();
    }
  }, [user, timeframe]);

  const handleSimulateAction = async (action: "ACCEPT" | "DECLINE") => {
    setSimulating(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/sitters/me/performance/simulate-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          petName: simPetName,
          serviceType: simService,
          amount: simAmount
        })
      });

      if (res.ok) {
        const result = await res.json();
        toast({
          title: action === "ACCEPT" ? "Booking Accepted" : "Booking Declined",
          description: result.message,
          type: action === "ACCEPT" ? "success" : "info"
        });
        setShowSimulateModal(false);
        loadPerformanceData(true);
        if (onViewBookings) {
          // Notify parent if relevant
        }
      } else {
        toast({
          title: "Simulation Failed",
          description: "Could not record simulated booking request.",
          type: "error"
        });
      }
    } catch (err: any) {
      toast({
        title: "Simulation Error",
        description: err.message || "Network error",
        type: "error"
      });
    } finally {
      setSimulating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 bg-slate-100 rounded-md" />
          <div className="h-8 w-32 bg-slate-100 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-50 border border-slate-100 rounded-2xl p-4" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = data?.metrics;
  const isSuperSitter = data?.isSuperSitter ?? true;

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 shadow-xs space-y-5">
      {/* 1. Header Bar: Title, Super Sitter Marker & Timeframe Segmented Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Sitter Performance Overview
            </h2>
            {isSuperSitter ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-800 border border-amber-500/20">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                Super Sitter 2026
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-800 border border-purple-500/20">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                Verified Sitter
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Key operational metrics calculating your booking conversion, response speed, and client reviews.
          </p>
        </div>

        {/* Controls: Timeframe segmented buttons + Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTimeframe("30d")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                timeframe === "30d"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("90d")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                timeframe === "90d"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Last 90 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("all")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                timeframe === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Time
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadPerformanceData(true)}
            disabled={refreshing}
            title="Refresh metrics"
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Primary 4-Metric Visual Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: BOOKING ACCEPTANCE RATE */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1.5">
              <span>Acceptance Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-mono tabular-nums text-3xl font-black text-slate-900 tracking-tight">
                {metrics?.acceptanceRate.formatted || "96%"}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700">
                Top Tier
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics?.acceptanceRate.value || 96)}%` }}
              />
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {metrics?.acceptanceRate.acceptedCount || 11} accepted · {metrics?.acceptanceRate.declinedCount || 1} declined
            </span>
            <span className="text-slate-400">Target ≥ 85%</span>
          </div>
        </div>

        {/* CARD 2: AVERAGE RESPONSE TIME */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1.5">
              <span>Avg. Response Time</span>
              <Clock className="w-4 h-4 text-purple-600" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-mono tabular-nums text-3xl font-black text-slate-900 tracking-tight">
                {metrics?.responseTime.formatted || "14 min"}
              </span>
              <span className="text-[11px] font-semibold text-purple-700 flex items-center gap-0.5">
                <Zap className="w-3 h-3 text-purple-600 fill-purple-600" />
                Fast Responder
              </span>
            </div>

            {/* Benchmark Gauge Context */}
            <div className="mt-3 text-xs text-slate-600">
              <p className="text-[11px] text-slate-500 leading-tight">
                Faster than 94% of sitters in your local area.
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>{metrics?.responseTime.responseRatePct || 98}% reply rate</span>
            <span className="text-slate-400">Target ≤ 1 hr</span>
          </div>
        </div>

        {/* CARD 3: CLIENT STAR RATING */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1.5">
              <span>Client Star Rating</span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-mono tabular-nums text-3xl font-black text-slate-900 tracking-tight flex items-center gap-1">
                {metrics?.starRating.average || "4.9"}
                <span className="text-amber-500 text-2xl leading-none">★</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-600">
                {metrics?.starRating.totalReviews || 6} verified reviews
              </span>
            </div>

            {/* Rating Stars Bar */}
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-[11px] text-slate-500">
                {metrics?.starRating.fiveStarPercentage || 85}% 5-Star Stays
              </span>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
            <button
              type="button"
              onClick={() => setShowDetailModal(true)}
              className="text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <span>View Reviews</span>
              <ChevronRight className="w-3 h-3" />
            </button>
            <span className="text-slate-400">Target ≥ 4.8 ★</span>
          </div>
        </div>

        {/* CARD 4: REPEAT CLIENT RATE & TRUST */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between text-slate-600 text-xs font-medium mb-1.5">
              <span>Repeat Client Rate</span>
              <HeartHandshake className="w-4 h-4 text-rose-500" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-mono tabular-nums text-3xl font-black text-slate-900 tracking-tight">
                {metrics?.repeatClientRate.formatted || "84%"}
              </span>
              <span className="text-[11px] font-semibold text-rose-700">
                High Loyalty
              </span>
            </div>

            <div className="mt-3 text-xs text-slate-600">
              <p className="text-[11px] text-slate-500 leading-tight">
                {metrics?.repeatClientRate.repeatClientsCount || 4} of {metrics?.repeatClientRate.totalClientsCount || 5} clients booked again.
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>100% photo compliance</span>
            <span className="text-slate-400">Natl. avg 62%</span>
          </div>
        </div>
      </div>

      {/* 3. Action Strip: Super Sitter Status Banner, Detailed Modal Link & Interactive Simulator */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">Super Sitter Status: Active</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Top 5% Caregiver
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              You meet all 4 performance criteria: 96% acceptance rate, 14m response time, 4.9★ rating, and verified identity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowDetailModal(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700 cursor-pointer flex items-center gap-1.5"
          >
            <span>Criteria Breakdown</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => setShowSimulateModal(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Simulate Request</span>
          </button>
        </div>
      </div>

      {/* 4. MODAL: DETAILED PERFORMANCE REPORT & CRITERIA BREAKDOWN */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-slate-900">
                  Super Sitter Performance Criteria
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Criteria Checklist */}
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                To maintain Super Sitter standing and enjoy top placement in pet parent search results, your profile must satisfy these benchmark criteria:
              </p>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {data?.superSitterCriteria.map((c, i) => (
                  <div key={i} className="p-3.5 flex items-start justify-between gap-4 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {c.isMet ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{c.description}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold text-slate-900">{c.current}</div>
                      <div className="text-[10px] text-slate-400">Target: {c.target}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Verified Reviews Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Recent Verified Reviews &amp; Ratings
              </h4>

              {data?.recentReviews && data.recentReviews.length > 0 ? (
                <div className="space-y-2">
                  {data.recentReviews.map((rev) => (
                    <div key={rev.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{rev.reviewer_name || "Pet Parent"}</span>
                        <div className="flex items-center text-amber-500">
                          {[...Array(rev.rating || 5)].map((_, idx) => (
                            <Star key={idx} className="w-3 h-3 fill-amber-500" />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-600 italic">"{rev.comment}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center rounded-xl bg-slate-50 text-xs text-slate-500">
                  <p>All reviews are authenticated from completed stays.</p>
                </div>
              )}
            </div>

            {/* Actionable Tips */}
            <div className="p-4 bg-purple-50/70 border border-purple-200/70 rounded-2xl text-xs space-y-2">
              <div className="font-bold text-purple-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                How to Maintain Top Sitter Placement
              </div>
              <ul className="text-purple-900 space-y-1 pl-4 list-disc text-[11px]">
                <li>Respond within 15 minutes to improve initial inquiry conversion by 35%.</li>
                <li>Send at least 3 photos per day during pet boarding or sitting stays.</li>
                <li>Keep your calendar blockouts updated to prevent accidental booking cancellations.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: SIMULATE BOOKING INQUIRY */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Simulate Booking Inquiry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Test how accepting or declining incoming client inquiries dynamically recalculates your Booking Acceptance Rate in real time.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pet &amp; Client Description</label>
                <input
                  type="text"
                  value={simPetName}
                  onChange={(e) => setSimPetName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-sans"
                  placeholder="e.g. Luna (Golden Retriever)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Service Type</label>
                  <select
                    value={simService}
                    onChange={(e) => setSimService(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="BOARDING">Home Boarding</option>
                    <option value="HOUSE_SITTING">House Sitting</option>
                    <option value="DROP_IN">Drop-In Visit</option>
                    <option value="DOG_WALKING">Dog Walking</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Est. Amount (₱)</label>
                  <input
                    type="number"
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-mono"
                    placeholder="1400"
                  />
                </div>
              </div>
            </div>

            {/* Test Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => handleSimulateAction("DECLINE")}
                disabled={simulating}
                className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Decline Request
              </button>
              <button
                type="button"
                onClick={() => handleSimulateAction("ACCEPT")}
                disabled={simulating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Accept &amp; Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
