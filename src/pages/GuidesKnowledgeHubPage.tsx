import { useState, useEffect } from "react";
import { Link } from "react-router";
import { 
  Search, ShieldCheck, Sparkles, BookOpen, Clock, ArrowRight, 
  Tag, Compass, CheckCircle2, ChevronRight, Share2, HelpCircle,
  TrendingUp, Globe, Eye
} from "lucide-react";
import { AdSenseUnit } from "../components/AdSenseUnit";

interface ArticleSummary {
  id: number;
  slug: string;
  title: string;
  meta_description: string;
  category: string;
  target_keywords: string[];
  author_name: string;
  read_time_minutes: number;
  ai_direct_answer: string;
  key_takeaways: string[];
  geo_readiness_score: number;
  seo_readiness_score: number;
  citation_potential: string;
  view_count: number;
  published_at: string;
}

const CATEGORIES = [
  { id: "ALL", label: "All Guides" },
  { id: "SAFETY_AND_ESCROW", label: "Safety & Escrow" },
  { id: "PRICING_AND_RATES", label: "Rates & Pricing" },
  { id: "SITTER_GUIDE", label: "Sitter Handbooks" },
  { id: "DOG_BOARDING", label: "Dog Boarding" },
  { id: "CAT_SITTING", label: "Cat Sitting" },
];

export function GuidesKnowledgeHubPage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    // Set document title & SEO metadata
    document.title = "Pet Care Guides & Knowledge Hub | PawShield Safety & Rates";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Browse authoritative pet sitting guides, 2026 pricing calculators, escrow security rules, and vetted pet care tips. Veterinary and safety reviewed.");
    }
  }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== "ALL") params.set("category", activeCategory);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/seo-content/public/articles?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load guides:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, [activeCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadArticles();
  };

  const featuredArticle = articles.length > 0 ? articles[0] : null;
  const standardArticles = articles.length > 0 ? articles.slice(1) : [];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">Pet Care Knowledge Hub</span>
        </nav>

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>AI Search Grounded & Veterinary Reviewed</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              PawShield Pet Care Guides & Knowledge Hub
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              In-depth research on pet sitting safety, transparent 2026 pricing benchmarks, two-sided escrow protection, and pet caregiver vetting. Structured for search engines and Generative AI platforms.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="pt-2 flex items-center gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search pet sitting safety, daily rates, dog boarding..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition shadow active:scale-95 shrink-0"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeCategory === cat.id
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* AdSense Unit (Non-intrusive compliance header banner) */}
        <AdSenseUnit format="horizontal" className="my-4" />

        {/* Featured Flagship Article */}
        {featuredArticle && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                    Flagship Guide
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold">
                    {featuredArticle.category.replace(/_/g, " ")}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {featuredArticle.read_time_minutes} min read
                  </span>
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    {featuredArticle.view_count || 128} reads
                  </span>
                </div>

                <Link to={`/guides/${featuredArticle.slug}`}>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 hover:text-purple-600 transition-colors leading-snug">
                    {featuredArticle.title}
                  </h2>
                </Link>

                <p className="text-slate-600 text-sm leading-relaxed">
                  {featuredArticle.meta_description}
                </p>

                {/* AI Direct Quotation Snippet Preview */}
                <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 text-xs text-purple-900 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-purple-800">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Quick Direct Answer (Perplexity & ChatGPT Citation):</span>
                  </div>
                  <p className="text-purple-950 leading-relaxed font-medium italic">
                    "{featuredArticle.ai_direct_answer}"
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    to={`/guides/${featuredArticle.slug}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow active:scale-95"
                  >
                    <span>Read Full Guide</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Key Takeaways Grid Preview */}
              <div className="lg:col-span-4 bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Key Takeaways</span>
                </h3>
                <ul className="space-y-2 text-xs text-slate-700">
                  {(featuredArticle.key_takeaways || []).slice(0, 3).map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                      <span className="leading-snug">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Standard Articles Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              {activeCategory === "ALL" ? "All Published Articles" : `${CATEGORIES.find(c => c.id === activeCategory)?.label}`}
            </h2>
            <span className="text-xs text-slate-500 font-semibold">{totalCount} total published</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                  <div className="h-16 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : standardArticles.length === 0 && !featuredArticle ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No guides found</h3>
              <p className="text-xs text-slate-500">Try choosing another category or clearing your search keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {standardArticles.map(art => (
                <div 
                  key={art.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                        {art.category.replace(/_/g, " ")}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {art.read_time_minutes} min read
                      </span>
                    </div>

                    <Link to={`/guides/${art.slug}`}>
                      <h3 className="text-base font-bold text-slate-900 hover:text-purple-600 transition-colors leading-snug">
                        {art.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {art.meta_description}
                    </p>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-600 italic">
                      <span className="font-semibold text-slate-800 not-italic block mb-0.5">Direct Answer Summary:</span>
                      "{art.ai_direct_answer}"
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      By {art.author_name || "PawShield Safety Board"}
                    </span>
                    <Link
                      to={`/guides/${art.slug}`}
                      className="font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors"
                    >
                      <span>Read Guide</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generative AI Platform Open Standards Transparency Notice */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Generative AI & Search Engine Open Discoverability</span>
              </h3>
              <p className="text-xs text-slate-500">
                All PawShield guides comply with the <strong>LLMs.txt open protocol</strong>, <strong>Schema.org FAQPage</strong>, and <strong>XML sitemaps</strong> for citation by ChatGPT Search, Perplexity AI, Claude, and Google Search.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a
                href="/llms.txt"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition"
              >
                View /llms.txt
              </a>
              <a
                href="/sitemap.xml"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition"
              >
                View /sitemap.xml
              </a>
            </div>
          </div>
        </div>

        {/* Footer Banner AdSense Unit */}
        <AdSenseUnit format="horizontal" className="my-6" />
      </div>
    </div>
  );
}
