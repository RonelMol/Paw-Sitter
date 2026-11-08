import React, { useState, useRef } from "react";
import { useHomePage, FeatureCardConfig, ServiceCardConfig } from "../lib/HomePageContext";
import {
  X,
  Upload,
  Image as ImageIcon,
  Palette,
  Layout,
  Type,
  CheckCircle2,
  RotateCcw,
  Save,
  ShieldCheck,
  Star,
  CalendarCheck,
  Heart,
  Award,
  Sparkles,
  Trash2,
  Eye,
} from "lucide-react";
import { useToast } from "./ToastContext";

export function HomePageCustomizerModal() {
  const {
    config,
    updateConfig,
    resetConfig,
    isCustomizerOpen,
    setIsCustomizerOpen,
    saveToServer,
    loading,
  } = useHomePage();

  const { toast, addToast } = useToast();
  const notify = (msg: string, type: "success" | "error" | "info" = "info") => {
    if (typeof addToast === "function") {
      addToast(msg, type);
    } else if (typeof toast === "function") {
      toast({ title: msg, type });
    }
  };
  const [activeTab, setActiveTab] = useState<"brand" | "hero" | "features" | "services">("brand");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroImageInputRef = useRef<HTMLInputElement>(null);
  const servicesImageInputRef = useRef<HTMLInputElement>(null);

  if (!isCustomizerOpen) return null;

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        notify("Logo image must be under 2MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        updateConfig({ logoUrl: result });
        notify("Custom logo uploaded successfully!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Hero Image Upload
  const handleHeroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        notify("Hero image must be under 4MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        updateConfig({ heroImageUrl: result });
        notify("Hero showcase image updated!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Services Image Upload
  const handleServicesImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        notify("Services image must be under 4MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        updateConfig({ servicesImageUrl: result });
        notify("Services photo updated!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    await saveToServer();
    notify("Home Page customizations published and saved to database!", "success");
    setIsCustomizerOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 leading-tight">
                Home Page & Brand Customizer
              </h2>
              <p className="text-xs text-slate-500">
                Edit pictures, logo, cards, wording, and visual styles live
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCustomizerOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-4 bg-white">
          <button
            onClick={() => setActiveTab("brand")}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "brand"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Logo & Brand
          </button>
          <button
            onClick={() => setActiveTab("hero")}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "hero"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Palette className="w-3.5 h-3.5" /> Hero & Theme
          </button>
          <button
            onClick={() => setActiveTab("features")}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "features"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layout className="w-3.5 h-3.5" /> Why Choose Cards
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "services"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Type className="w-3.5 h-3.5" /> Services Section
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: LOGO & BRAND */}
          {activeTab === "brand" && (
            <div className="space-y-6">
              <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider mb-1">
                  Brand Identity & Logo Uploader
                </h4>
                <p className="text-xs text-indigo-800/80">
                  Upload your brand logo file or adjust the platform brand name. Changes appear immediately in the Header and Footer.
                </p>
              </div>

              {/* Logo Preview & File Uploader */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Brand Logo Image
                </label>
                <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-2 shadow-sm overflow-hidden flex-shrink-0">
                    {config.logoUrl ? (
                      <img
                        src={config.logoUrl}
                        alt="Brand Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 text-center p-1">
                        <ShieldCheck className="w-8 h-8 text-blue-600" />
                        <span className="text-[9px] font-semibold text-slate-500 mt-1">Default</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <p className="text-xs text-slate-600">
                      Upload your high-resolution PNG, SVG, or JPG logo (recommended size: 250x80px).
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        ref={logoInputRef}
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload Logo File
                      </button>

                      {config.logoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            updateConfig({ logoUrl: "" });
                            notify("Logo reset to default", "info");
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Name Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Platform Name / Logo Text
                </label>
                <input
                  type="text"
                  value={config.logoText}
                  onChange={(e) => updateConfig({ logoText: e.target.value })}
                  placeholder="e.g. PawShield"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Brand Tagline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Brand Tagline
                </label>
                <input
                  type="text"
                  value={config.logoTagline}
                  onChange={(e) => updateConfig({ logoTagline: e.target.value })}
                  placeholder="e.g. Verified Pet Care Network"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: HERO & THEME */}
          {activeTab === "hero" && (
            <div className="space-y-6">
              {/* Hero Style / Theme Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Hero Section Visual Theme & Style
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: "slate", name: "Dark Slate", bg: "bg-slate-900 text-white" },
                    { id: "emerald", name: "Emerald Fresh", bg: "bg-emerald-900 text-white" },
                    { id: "indigo", name: "Royal Indigo", bg: "bg-indigo-900 text-white" },
                    { id: "sunset", name: "Sunset Warmth", bg: "bg-gradient-to-r from-amber-700 to-rose-800 text-white" },
                    { id: "ocean", name: "Ocean Breeze", bg: "bg-teal-900 text-white" },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => updateConfig({ heroStyle: style.id as any })}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                        config.heroStyle === style.id
                          ? "border-indigo-600 ring-2 ring-indigo-500/30 shadow-md"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className={`w-full h-5 rounded-md ${style.bg} flex items-center px-1.5`}>
                        <div className="w-2 h-2 rounded-full bg-white/40"></div>
                      </div>
                      <span className="text-xs font-bold text-slate-800">{style.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Headline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Hero Headline
                </label>
                <input
                  type="text"
                  value={config.heroHeadline}
                  onChange={(e) => updateConfig({ heroHeadline: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Subheadline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Hero Subheadline
                </label>
                <textarea
                  rows={3}
                  value={config.heroSubheadline || ""}
                  onChange={(e) => updateConfig({ heroSubheadline: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* CTA Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Primary Button Wording
                  </label>
                  <input
                    type="text"
                    value={config.heroPrimaryBtnText}
                    onChange={(e) => updateConfig({ heroPrimaryBtnText: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Secondary Button Wording
                  </label>
                  <input
                    type="text"
                    value={config.heroSecondaryBtnText}
                    onChange={(e) => updateConfig({ heroSecondaryBtnText: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Hero Background / Showcase Photo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Hero Showcase Background Image (Optional)
                </label>
                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {config.heroImageUrl ? (
                        <img src={config.heroImageUrl} alt="Hero preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      {config.heroImageUrl ? "Custom hero image applied" : "Using color theme background"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="file"
                      ref={heroImageInputRef}
                      accept="image/*"
                      onChange={handleHeroImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => heroImageInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                    >
                      Browse
                    </button>
                    {config.heroImageUrl && (
                      <button
                        type="button"
                        onClick={() => updateConfig({ heroImageUrl: "" })}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WHY CHOOSE CARDS */}
          {activeTab === "features" && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Section Header
                </label>
                <input
                  type="text"
                  value={config.whyTitle}
                  onChange={(e) => updateConfig({ whyTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-2"
                />
                <input
                  type="text"
                  value={config.whySubtitle}
                  onChange={(e) => updateConfig({ whySubtitle: e.target.value })}
                  placeholder="Section subtitle..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* 3 Cards Form */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Edit 3 Highlight Feature Cards
                </label>

                {config.featureCards.map((card, idx) => (
                  <div key={card.id || idx} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                        Card #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 font-medium">Icon:</span>
                        <select
                          value={card.icon}
                          onChange={(e) => {
                            const newCards = [...config.featureCards];
                            newCards[idx].icon = e.target.value as any;
                            updateConfig({ featureCards: newCards });
                          }}
                          className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-700"
                        >
                          <option value="ShieldCheck">Shield</option>
                          <option value="Star">Star</option>
                          <option value="CalendarCheck">Calendar</option>
                          <option value="Heart">Heart</option>
                          <option value="Award">Award</option>
                          <option value="CheckCircle2">Checkmark</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Card Title</label>
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => {
                          const newCards = [...config.featureCards];
                          newCards[idx].title = e.target.value;
                          updateConfig({ featureCards: newCards });
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Card Description</label>
                      <textarea
                        rows={2}
                        value={card.description || ""}
                        onChange={(e) => {
                          const newCards = [...config.featureCards];
                          newCards[idx].description = e.target.value;
                          updateConfig({ featureCards: newCards });
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Optional Badge Tag</label>
                      <input
                        type="text"
                        value={card.badge || ""}
                        onChange={(e) => {
                          const newCards = [...config.featureCards];
                          newCards[idx].badge = e.target.value;
                          updateConfig({ featureCards: newCards });
                        }}
                        placeholder="e.g. Escrow Protected"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-700"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SERVICES SECTION */}
          {activeTab === "services" && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Services Section Header
                </label>
                <input
                  type="text"
                  value={config.servicesTitle}
                  onChange={(e) => updateConfig({ servicesTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-2"
                />
                <input
                  type="text"
                  value={config.servicesSubtitle}
                  onChange={(e) => updateConfig({ servicesSubtitle: e.target.value })}
                  placeholder="Section subtitle..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Service Cards */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Service Offerings Cards
                </label>

                {config.serviceCards.map((srv, idx) => (
                  <div key={srv.id || idx} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Service #{idx + 1}</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Service Title</label>
                      <input
                        type="text"
                        value={srv.title}
                        onChange={(e) => {
                          const newSrv = [...config.serviceCards];
                          newSrv[idx].title = e.target.value;
                          updateConfig({ serviceCards: newSrv });
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Service Description</label>
                      <textarea
                        rows={2}
                        value={srv.description || ""}
                        onChange={(e) => {
                          const newSrv = [...config.serviceCards];
                          newSrv[idx].description = e.target.value;
                          updateConfig({ serviceCards: newSrv });
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Services Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Services Showcase Photo
                </label>
                <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300">
                      {config.servicesImageUrl ? (
                        <img src={config.servicesImageUrl} alt="Services Showcase" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Custom Pet Care Photo</p>
                      <p className="text-[11px] text-slate-500">Replaces placeholder in services section</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="file"
                      ref={servicesImageInputRef}
                      accept="image/*"
                      onChange={handleServicesImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => servicesImageInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                    >
                      Upload Photo
                    </button>
                    {config.servicesImageUrl && (
                      <button
                        type="button"
                        onClick={() => updateConfig({ servicesImageUrl: "" })}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={resetConfig}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 hover:bg-slate-200/50 rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCustomizerOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save & Publish Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
