import React, { useState, useEffect } from "react";
import { 
  Key, ShieldCheck, CheckCircle2, AlertTriangle, ExternalLink, 
  Copy, Check, RefreshCw, Lock, Sparkles, Terminal, Edit3, Eye, EyeOff, Info, Search, Filter
} from "lucide-react";
import { useToast } from "../components/ToastContext";

interface EnvItem {
  key: string;
  name: string;
  category: string;
  description: string;
  required: boolean;
  setupGuideUrl: string;
  isConfigured: boolean;
  maskedValue: string | null;
  runtimeOverride: string | null;
  targetFile: string;
  hint: string;
}

export function AdminEnvironmentPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<{
    environment: string;
    totalVariables: number;
    configuredCount: number;
    variables: EnvItem[];
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<EnvItem | null>(null);
  const [newVal, setNewVal] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEnv = async () => {
    try {
      const res = await fetch("/api/v1/admin/environment");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error fetching environment variables", err);
      toast({ title: "Fetch Failed", description: "Could not load environment variables", type: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEnv();
  }, []);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast({ title: "Copied to Clipboard", description: `Copied definition for ${keyName}`, type: "success" });
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveRuntimeConfig = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/environment/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configKey: editingItem.key,
          configValue: newVal.trim(),
          category: editingItem.category,
          description: editingItem.description,
        }),
      });
      if (res.ok) {
        toast({
          title: "Configuration Saved",
          description: `Successfully updated runtime value for ${editingItem.key}.`,
          type: "success",
        });
        setEditingItem(null);
        setNewVal("");
        fetchEnv();
      } else {
        const err = await res.json();
        toast({ title: "Save Failed", description: err.error || "Could not save configuration", type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Network Error", description: e.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const categories = ["ALL", "AI & Intelligence", "Payments & Financial Escrow", "Monetization & Ad Networks", "Platform Ingress & Hosting", "Community & Server Fund", "Database & Storage", "Authentication & Security", "Threat Intelligence & Cyber Defense"];

  const filteredVariables = data?.variables.filter((v) => {
    const matchesSearch = v.key.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "ALL" || v.category === selectedCategory;
    return matchesSearch && matchesCat;
  }) || [];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Environment & API Secrets Module
              </span>
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Environment & API Keys Hub
          </h2>
          <p className="text-sm text-slate-500 max-w-2xl mt-1 leading-relaxed">
            Centralized registry for managing third-party APIs, AI endpoints, payment gateway keys, and platform services.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchEnv();
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Status
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Total Integrations
          </div>
          <div className="text-3xl font-black text-slate-900">
            {data?.totalVariables || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Platform microservices & keys</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            Configured & Active
          </div>
          <div className="text-3xl font-black text-emerald-600">
            {data?.configuredCount || 0}
          </div>
          <div className="text-xs text-emerald-700 mt-1">Ready for production runtime</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
            Pending Setup / Optional
          </div>
          <div className="text-3xl font-black text-amber-600">
            {(data?.totalVariables || 0) - (data?.configuredCount || 0)}
          </div>
          <div className="text-xs text-amber-700 mt-1">Stripe or additional keys to set</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search API keys, services, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "ALL" ? "All Categories" : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Keys List */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full mb-3" />
          <p className="text-xs font-medium text-slate-500">Scanning environment configurations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredVariables.map((item) => (
            <div
              key={item.key}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      {item.key}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{item.name}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {item.category}
                    </span>
                    {item.isConfigured ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Not Set
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Current Value: <strong className="font-mono text-slate-700">{item.maskedValue || "None"}</strong>
                    </span>
                    {item.runtimeOverride && (
                      <span className="text-indigo-600 font-semibold">
                        (Runtime Override: {item.runtimeOverride})
                      </span>
                    )}
                    <span className="text-slate-400">|</span>
                    <span>Source: {item.targetFile}</span>
                  </div>

                  {item.hint && (
                    <div className="text-[11px] text-slate-500 italic bg-slate-50/70 p-2 rounded-xl border border-slate-100 mt-2">
                      💡 {item.hint}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                  <a
                    href={item.setupGuideUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    Setup Guide
                  </a>

                  <button
                    onClick={() => handleCopy(`${item.key}=""`, item.key)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    {copiedKey === item.key ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy Variable
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setNewVal(item.runtimeOverride || "");
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    Set Value
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredVariables.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
              <Key className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No environment keys match your search</p>
              <p className="text-xs text-slate-500 mt-1">Try selecting "All Categories" or changing your keyword.</p>
            </div>
          )}
        </div>
      )}

      {/* .env.example Reference Box */}
      <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 border border-slate-800 shadow-lg">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
              .env.example Platform Reference
            </h3>
          </div>
          <button
            onClick={() =>
              handleCopy(
                `# PawShield Environment Configuration Template\nGEMINI_API_KEY="YOUR_GEMINI_KEY"\nAPP_URL="YOUR_APPLET_URL"\nVITE_GOOGLE_ADSENSE_CLIENT_ID="ca-pub-1234567890123456"\nSTRIPE_SECRET_KEY="sk_test_..."\nSTRIPE_PUBLISHABLE_KEY="pk_test_..."\nSTRIPE_WEBHOOK_SECRET="whsec_..."\nBUY_ME_COFFEE_URL="https://buymeacoffee.com/ronelmol"\n`,
                "env_template"
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono rounded-lg transition-colors"
          >
            {copiedKey === "env_template" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            Copy Template
          </button>
        </div>
        <pre className="font-mono text-xs text-slate-300 bg-slate-950 p-4 rounded-2xl overflow-x-auto leading-relaxed border border-slate-800">
{`# Gemini AI API Key (Required for AI Bug Inspector, Sitter Smart Match)
GEMINI_API_KEY="MY_GEMINI_API_KEY"

# Canonical App URL (Auto-injected in Cloud Run, used for Stripe Webhooks)
APP_URL="https://your-domain.com"

# Google AdSense Publisher ID
VITE_GOOGLE_ADSENSE_CLIENT_ID="ca-pub-1234567890123456"

# Stripe Payments & Escrow (Optional for Cash/Coffee mode)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Buy Me a Coffee Support Maintenance URL
BUY_ME_COFFEE_URL="https://buymeacoffee.com/ronelmol"`}
        </pre>
      </div>

      {/* Edit Runtime Config Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {editingItem.category}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Configure {editingItem.name}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Set or update the runtime value for <span className="font-mono font-bold">{editingItem.key}</span>. 
              This is safely stored in your PostgreSQL database and takes precedence during runtime operations.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Value for {editingItem.key}
                </label>
                <input
                  type={editingItem.key.toLowerCase().includes("secret") ? "password" : "text"}
                  value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  placeholder={`Enter ${editingItem.name}...`}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  For sensitive keys like <strong>GEMINI_API_KEY</strong>, it is best practice to configure them in the AI Studio Secrets panel. This runtime override allows testing in your active session.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRuntimeConfig}
                disabled={saving || !newVal.trim()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
              >
                {saving ? "Saving Config..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
