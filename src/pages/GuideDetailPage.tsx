import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import Markdown from "react-markdown";
import { 
  ChevronRight, Clock, ShieldCheck, Sparkles, CheckCircle2, 
  HelpCircle, ChevronDown, ChevronUp, Share2, Copy, Check, 
  ArrowLeft, Search, UserCheck, Heart, AlertCircle, Eye
} from "lucide-react";
import { AdSenseUnit } from "../components/AdSenseUnit";
import { useToast } from "../components/ToastContext";

interface ArticleDetail {
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
  view_count: number;
  published_at: string;
  updated_at: string;
}

export function GuideDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    fetch(`/api/seo-content/public/articles/${slug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Article not found");
        return res.json();
      })
      .then((data: ArticleDetail) => {
        setArticle(data);

        // Dynamically inject Document Title and Meta Tags
        document.title = `${data.title} | PawShield Guides`;
        
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
          metaDesc = document.createElement("meta");
          metaDesc.setAttribute("name", "description");
          document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute("content", data.meta_description);

        // Inject Schema.org JSON-LD Script tag for Google & AI Platforms
        if (data.schema_json_ld) {
          const existingScript = document.getElementById("pawshield-article-jsonld");
          if (existingScript) existingScript.remove();

          const script = document.createElement("script");
          script.id = "pawshield-article-jsonld";
          script.type = "application/ld+json";
          script.text = JSON.stringify(data.schema_json_ld);
          document.head.appendChild(script);
        }
      })
      .catch((err) => {
        console.error("Guide fetch error:", err);
        setError("Guide could not be loaded.");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      // Cleanup script tag on unmount
      const existingScript = document.getElementById("pawshield-article-jsonld");
      if (existingScript) existingScript.remove();
    };
  }, [slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    if (addToast) addToast("Link copied to clipboard", "success");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex justify-center">
        <div className="max-w-3xl w-full space-y-6 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/4" />
          <div className="h-10 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 text-center">
        <div className="max-w-md mx-auto space-y-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">Guide Not Found</h1>
          <p className="text-xs text-slate-500">The guide you are looking for does not exist or may have been relocated.</p>
          <Link
            to="/guides"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition shadow"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Knowledge Hub</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to="/guides" className="hover:text-slate-900 transition-colors">Guides</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold truncate max-w-xs sm:max-w-md">{article.title}</span>
        </nav>

        {/* Article Header Card */}
        <header className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                {article.category.replace(/_/g, " ")}
              </span>
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {article.read_time_minutes} min read
              </span>
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                {article.view_count || 1} views
              </span>
            </div>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition active:scale-95"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Copied Link!" : "Share"}</span>
            </button>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {article.title}
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            {article.meta_description}
          </p>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
              PS
            </div>
            <div>
              <p className="font-bold text-slate-900">{article.author_name}</p>
              <p className="text-[11px] text-slate-400">
                Updated on {new Date(article.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        </header>

        {/* AdSense Unit (AdSense Compliant Header Banner) */}
        <AdSenseUnit format="horizontal" className="my-2" />

        {/* ===================================================================== */}
        {/* Generative Engine Optimization (GEO): AI Platform Direct Citation Box */}
        {/* ===================================================================== */}
        <section 
          aria-label="Direct Answer Citation"
          className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-500/30 text-purple-200 border border-purple-400/40">
                <Sparkles className="w-4 h-4 text-purple-300" />
              </span>
              <span className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                Direct Answer Citation (ChatGPT & Perplexity Indexed)
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
              GEO 98%
            </span>
          </div>

          <blockquote className="text-base sm:text-lg font-medium text-purple-50 leading-relaxed border-l-2 border-purple-400 pl-4 py-1">
            "{article.ai_direct_answer}"
          </blockquote>

          <div className="flex items-center justify-between text-xs text-purple-300 pt-2 border-t border-purple-800/60">
            <span>Authoritative citation block formulated for search engines & LLM grounding.</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`"${article.ai_direct_answer}" — PawShield (${window.location.href})`);
                if (addToast) addToast("Citation snippet copied", "success");
              }}
              className="hover:text-white transition-colors flex items-center gap-1 font-semibold"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Citation</span>
            </button>
          </div>
        </section>

        {/* Key Takeaways Section */}
        {article.key_takeaways && article.key_takeaways.length > 0 && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Key Takeaways & Core Facts</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {article.key_takeaways.map((takeaway, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {takeaway}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Main Article Body (Rendered with react-markdown) */}
        <main className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs">
          <div className="markdown-body prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed space-y-4">
            <Markdown>{article.content_markdown}</Markdown>
          </div>
        </main>

        {/* Interactive FAQ Section (Schema.org FAQPage Aligned) */}
        {article.faq_items && article.faq_items.length > 0 && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold text-slate-900">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-3">
              {article.faq_items.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div 
                    key={idx}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full text-left p-4 flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 hover:bg-slate-50 transition"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-4 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Sitter Booking CTA Card */}
        <section className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 border border-purple-200 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Ready to Find a Screened Pet Sitter?</h2>
            <p className="text-xs text-slate-600">
              PawShield protects your booking with 100% ID-verified sitters, GPS check-ins, and escrow payment security.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition shadow active:scale-95"
            >
              <Search className="w-4 h-4" />
              <span>Search Verified Sitters</span>
            </Link>
            <Link
              to="/become-a-sitter"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition"
            >
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Become a Sitter</span>
            </Link>
          </div>
        </section>

        {/* Footer AdSense Banner */}
        <AdSenseUnit format="horizontal" className="my-6" />

        {/* Back to Guides Navigation */}
        <div className="pt-4 flex items-center justify-between text-xs text-slate-500">
          <Link
            to="/guides"
            className="inline-flex items-center gap-1.5 font-bold text-purple-700 hover:text-purple-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Guides</span>
          </Link>
          <span className="text-slate-400">
            PawShield Knowledge Engine &copy; 2026
          </span>
        </div>
      </div>
    </article>
  );
}
