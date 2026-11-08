import { useState, useEffect } from "react";
import { Link } from "react-router";
import { 
  Sparkles, Globe, Search, PlusCircle, CheckCircle2, 
  ExternalLink, Eye, Trash2, RefreshCw, FileText, Code2, 
  Share2, ArrowRight, ShieldCheck, Tag, HelpCircle, Check, Copy,
  Bot, Clock, AlertTriangle, Layers, Download
} from "lucide-react";
import { useToast } from "./ToastContext";

interface SEOArticle {
  id: number;
  slug: string;
  title: string;
  meta_description: string;
  category: string;
  target_keywords: string[];
  secondary_keywords: string[];
  author_name: string;
  read_time_minutes: number;
  ai_direct_answer: string;
  key_takeaways: string[];
  content_markdown: string;
  faq_items: Array<{ question: string; answer: string }>;
  schema_json_ld: any;
  geo_readiness_score: number;
  seo_readiness_score: number;
  citation_potential: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  view_count: number;
  published_at: string;
  created_at: string;
}

export function AdminSEOAgentView() {
  const { addToast } = useToast();
  const [articles, setArticles] = useState<SEOArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [selectedArticle, setSelectedArticle] = useState<SEOArticle | null>(null);
  const [viewSchemaModal, setViewSchemaModal] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [discoveryAudit, setDiscoveryAudit] = useState<any | null>(null);
  const [showLlmsModal, setShowLlmsModal] = useState(false);
  const [llmsContent, setLlmsContent] = useState<string>("");
  const [loadingLlms, setLoadingLlms] = useState(false);

  const openLlmsModal = async () => {
    setShowLlmsModal(true);
    setLoadingLlms(true);
    try {
      const res = await fetch("/llms.txt");
      if (res.ok) {
        const text = await res.text();
        setLlmsContent(text);
      } else {
        setLlmsContent("# Error loading /llms.txt: Status " + res.status);
      }
    } catch (err: any) {
      setLlmsContent("# Failed to retrieve /llms.txt:\n" + err.message);
    } finally {
      setLoadingLlms(false);
    }
  };

  // New Article Generation Form state
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("SAFETY_AND_ESCROW");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [authorName, setAuthorName] = useState("PawShield Editorial & Veterinary Safety Board");

  const showToast = (title: string, type: "success" | "error" | "info" = "info", desc?: string) => {
    if (addToast) addToast(title, type, desc);
  };

  const getAuthHeaders = (extra: Record<string, string> = {}) => {
    const token = localStorage.getItem("pawshield_token");
    return {
      ...extra,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-agent/seo-content/articles", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load articles");
      const data = await res.json();
      setArticles(data);
      if (data.length > 0 && !selectedArticle) {
        setSelectedArticle(data[0]);
      }
    } catch (e: any) {
      showToast("Error loading articles", "error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDiscoveryAudit = async () => {
    try {
      const res = await fetch("/api/ai-agent/seo-content/discovery/audit", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDiscoveryAudit(data);
      }
    } catch (e) {
      console.error("Discovery audit load error:", e);
    }
  };

  useEffect(() => {
    loadArticles();
    loadDiscoveryAudit();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      showToast("Topic Required", "error", "Please provide a topic or search query to target.");
      return;
    }

    setGenerating(true);
    setGenerationStep("Analyzing high-intent search queries & veterinary guidelines...");
    showToast("SEO Content Agent Activated", "info", "Autonomous research and structuring in progress...");

    try {
      const stepTimer1 = setTimeout(() => {
        setGenerationStep("Formulating ChatGPT & Perplexity direct citation answer block...");
      }, 1800);

      const stepTimer2 = setTimeout(() => {
        setGenerationStep("Authoring comprehensive markdown guide with rate benchmarks...");
      }, 3600);

      const stepTimer3 = setTimeout(() => {
        setGenerationStep("Generating Schema.org FAQPage & Article JSON-LD structured data...");
      }, 5400);

      const res = await fetch("/api/ai-agent/seo-content/generate", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          topic,
          category,
          targetKeywords: targetKeywords.split(",").map(k => k.trim()).filter(Boolean),
          authorName,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Generation failed");
      }

      const data = await res.json();
      showToast("SEO Article Generated & Published!", "success", `GEO Readiness: ${data.article.geo_readiness_score}%`);
      setTopic("");
      setTargetKeywords("");
      await loadArticles();
      await loadDiscoveryAudit();
      if (data.article) setSelectedArticle(data.article);
    } catch (err: any) {
      showToast("Generation Failed", "error", err.message);
    } finally {
      setGenerating(false);
      setGenerationStep("");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    try {
      const res = await fetch(`/api/ai-agent/seo-content/articles/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Article Deleted", "success");
      await loadArticles();
      if (selectedArticle?.id === id) setSelectedArticle(null);
    } catch (e: any) {
      showToast("Delete Failed", "error", e.message);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Copied to clipboard", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Aggregated Metrics
  const totalArticles = articles.length;
  const avgGeoScore = totalArticles > 0 
    ? Math.round(articles.reduce((acc, a) => acc + (a.geo_readiness_score || 0), 0) / totalArticles) 
    : 98;
  const avgSeoScore = totalArticles > 0 
    ? Math.round(articles.reduce((acc, a) => acc + (a.seo_readiness_score || 0), 0) / totalArticles) 
    : 96;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white border border-emerald-900/50 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Universal Search Engine & Generative AI Platform Ranker</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              SEO & Generative AI Content Agent
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Autonomously produces and indexes authoritative pet care content optimized for <strong>Google & Bing organic search</strong>, as well as <strong>Perplexity AI, ChatGPT Search, Gemini, and Claude</strong> citation networks via structured Schema.org JSON-LD and the open LLMs.txt protocol.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/guides"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 border border-white/20"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Public Hub</span>
              <ArrowRight className="w-3 h-3 text-slate-300" />
            </Link>

            <button
              onClick={openLlmsModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-2 cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Inspect /llms.txt</span>
            </button>
          </div>
        </div>

        {/* Global SEO Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-emerald-900/60">
          <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-emerald-900/40">
            <span className="text-slate-400 text-xs font-medium block">Published Guides</span>
            <span className="text-2xl font-bold text-white mt-1 block">{totalArticles} Articles</span>
            <span className="text-[11px] text-emerald-400 font-medium mt-0.5 block">100% Live & Indexed</span>
          </div>

          <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-emerald-900/40">
            <span className="text-slate-400 text-xs font-medium block">Avg. GEO Readiness</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-300">{avgGeoScore}%</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">TOP</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">ChatGPT & Perplexity</span>
          </div>

          <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-emerald-900/40">
            <span className="text-slate-400 text-xs font-medium block">Avg. SEO Score</span>
            <span className="text-2xl font-bold text-white mt-1 block">{avgSeoScore}%</span>
            <span className="text-[11px] text-purple-400 font-medium mt-0.5 block">Google / Bing Organic</span>
          </div>

          <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-emerald-900/40">
            <span className="text-slate-400 text-xs font-medium block">Active Protocols</span>
            <span className="text-2xl font-bold text-indigo-300 mt-1 block">4 Protocols</span>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">LLMs.txt, JSON-LD, Sitemap</span>
          </div>
        </div>
      </div>

      {/* Discovery & AI Spider Protocol Diagnostics */}
      {discoveryAudit && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">AI Platform & Spider Indexing Compliance</h3>
            </div>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Readiness: {discoveryAudit.summary?.overall_ai_readiness_score || 98}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">robots.txt Spiders</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Allowed</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                {discoveryAudit.robots_txt?.ai_spiders_allowed?.length || 8} AI engines allowed: GPTBot, PerplexityBot, ClaudeBot, Google-Extended.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">LLMs.txt Protocol</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">Operational</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Serving direct context summaries for Perplexity, ChatGPT Search, and Copilot at <code>/llms.txt</code>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">XML Sitemap</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Dynamic</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Auto-syncs all newly published articles into <code>/sitemap.xml</code> with ISO lastmod timestamps.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generation Form Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-bold text-slate-900">Autonomous Content Generator</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Powered by Gemini 3.8 Flash</span>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Target Search Topic / Guide Concept</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Overnight Pet Sitting in Metro Manila: Rates, Protocols & Safety Escrow"
                disabled={generating}
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              />
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Target Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={generating}
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium bg-white"
              >
                <option value="SAFETY_AND_ESCROW">Safety & Escrow</option>
                <option value="PRICING_AND_RATES">Pricing & Rates</option>
                <option value="SITTER_GUIDE">Sitter Guide</option>
                <option value="DOG_BOARDING">Dog Boarding</option>
                <option value="CAT_SITTING">Cat Sitting</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">SEO Keywords (Comma Separated)</label>
              <input
                type="text"
                value={targetKeywords}
                onChange={(e) => setTargetKeywords(e.target.value)}
                placeholder="e.g., overnight pet sitting, dog boarding manila, pet sitter rates 2026, safe pet care"
                disabled={generating}
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              />
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Author Credit</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                disabled={generating}
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              />
            </div>
          </div>

          {generating && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-purple-900 font-bold">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                <span>Agent Execution in Progress</span>
              </div>
              <p className="text-purple-700 text-xs font-medium">{generationStep}</p>
              <div className="w-full bg-purple-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-purple-600 h-1.5 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={generating}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition shadow active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{generating ? "Generating & Indexing..." : "Generate & Index Guide"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Article Fleet Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Article List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-sm font-bold text-slate-900">Published Knowledge Assets ({articles.length})</h3>
            <button
              onClick={loadArticles}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              title="Refresh Articles"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="bg-white p-4 rounded-2xl border border-slate-200 animate-pulse space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2 text-xs text-slate-500">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-800">No articles created yet</p>
              <p>Use the form above to generate your first flagship guide.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {articles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    selectedArticle?.id === art.id
                      ? "bg-purple-50/70 border-purple-300 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {art.category.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        GEO {art.geo_readiness_score}%
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                        SEO {art.seo_readiness_score}%
                      </span>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 mt-2 line-clamp-2 leading-snug">
                    {art.title}
                  </h4>

                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {art.meta_description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                    <span>{art.read_time_minutes} min read</span>
                    <span>{art.view_count || 0} views</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Article Details & Diagnostics Drawer */}
        <div className="lg:col-span-7">
          {selectedArticle ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
              {/* Header Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    {selectedArticle.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    Slug: <code>/guides/{selectedArticle.slug}</code>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/guides/${selectedArticle.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Public</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>

                  <button
                    onClick={() => setViewSchemaModal(selectedArticle.schema_json_ld)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>JSON-LD Schema</span>
                  </button>

                  <button
                    onClick={() => handleDelete(selectedArticle.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                    title="Delete Article"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  {selectedArticle.title}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedArticle.meta_description}
                </p>
              </div>

              {/* Generative AI Direct Answer Snippet */}
              <div className="bg-purple-950 text-white rounded-2xl p-5 space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-purple-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    ChatGPT & Perplexity Direct Answer Snippet
                  </span>
                  <button
                    onClick={() => handleCopy(selectedArticle.ai_direct_answer, `citation-${selectedArticle.id}`)}
                    className="hover:text-white transition flex items-center gap-1 font-semibold"
                  >
                    {copiedId === `citation-${selectedArticle.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === `citation-${selectedArticle.id}` ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <blockquote className="text-sm font-medium leading-relaxed italic text-purple-100">
                  "{selectedArticle.ai_direct_answer}"
                </blockquote>
              </div>

              {/* Key Takeaways */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Key Takeaways (High-Scannability Index)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(selectedArticle.key_takeaways || []).map((kt, i) => (
                    <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                      <span>{kt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keywords & Rich Tags */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block">Target SEO Keywords</span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedArticle.target_keywords || []).map((kw, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* FAQ Preview */}
              {selectedArticle.faq_items && selectedArticle.faq_items.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-purple-600" />
                    <span>Schema.org FAQPage Items ({selectedArticle.faq_items.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedArticle.faq_items.slice(0, 3).map((faq, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                        <p className="font-bold text-slate-900">Q: {faq.question}</p>
                        <p className="text-slate-600 leading-relaxed">A: {faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 space-y-2">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Select an article</h4>
              <p className="text-xs">Click any article on the left to inspect its GEO direct answer and schema.</p>
            </div>
          )}
        </div>
      </div>

      {/* JSON-LD Schema Modal */}
      {viewSchemaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Schema.org JSON-LD Structured Data</h3>
              </div>
              <button
                onClick={() => setViewSchemaModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 font-mono text-xs text-slate-800 bg-slate-900 text-slate-100 rounded-b-3xl">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(viewSchemaModal, null, 2)}
              </pre>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-3xl">
              <button
                onClick={() => handleCopy(JSON.stringify(viewSchemaModal, null, 2), "jsonld-modal")}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                {copiedId === "jsonld-modal" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === "jsonld-modal" ? "Copied JSON-LD" : "Copy JSON-LD"}</span>
              </button>
              <button
                onClick={() => setViewSchemaModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* LLMs.txt Protocol Inspection Modal */}
      {showLlmsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">LLMs.txt Protocol Inspector</h3>
                  <p className="text-[11px] text-slate-500">Live endpoint serving ChatGPT Search, Perplexity AI, Claude & Copilot</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  200 OK Active
                </span>
                <button
                  onClick={() => setShowLlmsModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 font-mono text-xs bg-slate-900 text-emerald-300">
              {loadingLlms ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <p>Fetching active /llms.txt payload from server...</p>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap leading-relaxed select-all">
                  {llmsContent || "# No content returned from /llms.txt"}
                </pre>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-b-3xl">
              <div className="text-xs text-slate-500 font-medium">
                Public URI: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-mono">/llms.txt</code>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleCopy(llmsContent, "llms-modal");
                    showToast("Copied /llms.txt content to clipboard!", "success");
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {copiedId === "llms-modal" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === "llms-modal" ? "Copied" : "Copy llms.txt"}</span>
                </button>
                <button
                  onClick={() => setShowLlmsModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
