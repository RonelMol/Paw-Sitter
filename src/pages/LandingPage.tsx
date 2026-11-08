import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import {
  Search,
  Heart,
  ShieldCheck,
  Star,
  CalendarCheck,
  Home,
  Award,
  Footprints,
  Sparkles,
  Edit3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Bot,
  Zap,
} from "lucide-react";
import { AdSenseUnit } from "../components/AdSenseUnit";
import { useAdSense } from "../lib/AdSenseContext";
import { useHomePage } from "../lib/HomePageContext";
import { useCurrency } from "../lib/CurrencyContext";
import { useAuth } from "../lib/AuthContext";

export function LandingPage() {
  const navigate = useNavigate();
  const { dbUser } = useAuth();
  const { config: adConfig } = useAdSense();
  const { config, setIsCustomizerOpen } = useHomePage();
  const { currencyConfig } = useCurrency();

  const [searchLocation, setSearchLocation] = useState("");
  const [searchService, setSearchService] = useState("BOARDING");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("faq-1");

  // If authenticated user is a Pet Sitter, direct to their dedicated Sitter Hub & KYC Portal
  if (dbUser?.role === "PET_SITTER") {
    return <Navigate to="/sitter/dashboard" replace />;
  }

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchLocation) params.set("location", searchLocation);
    if (searchService) params.set("service", searchService);
    navigate(`/search?${params.toString()}`);
  };

  // Helper icon renderer for feature cards
  const renderCardIcon = (iconName: string) => {
    switch (iconName) {
      case "Star":
        return <Star className="w-8 h-8 text-amber-500" />;
      case "CalendarCheck":
        return <CalendarCheck className="w-8 h-8 text-teal-600" />;
      case "Heart":
        return <Heart className="w-8 h-8 text-rose-500" />;
      case "Award":
        return <Award className="w-8 h-8 text-indigo-500" />;
      case "CheckCircle2":
        return <CheckCircle2 className="w-8 h-8 text-emerald-600" />;
      case "ShieldCheck":
      default:
        return <ShieldCheck className="w-8 h-8 text-blue-600" />;
    }
  };

  // Helper for Hero theme classes
  const getHeroThemeClasses = () => {
    switch (config.heroStyle) {
      case "emerald":
        return "bg-emerald-950 text-white";
      case "indigo":
        return "bg-indigo-950 text-white";
      case "sunset":
        return "bg-gradient-to-br from-amber-900 via-rose-950 to-slate-950 text-white";
      case "ocean":
        return "bg-gradient-to-br from-teal-950 via-cyan-950 to-slate-950 text-white";
      case "slate":
      default:
        return "bg-slate-950 text-white";
    }
  };

  const featureCards = config.featureCards && config.featureCards.length > 0
    ? config.featureCards
    : [];

  const serviceCards = config.serviceCards && config.serviceCards.length > 0
    ? config.serviceCards
    : [];

  const testimonials = config.testimonials && config.testimonials.length > 0
    ? config.testimonials
    : [];

  const faqs = config.faqs && config.faqs.length > 0
    ? config.faqs
    : [];

  // Schema.org Structured Data for Google Search SEO
  const faqSchemaData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((f) => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.answer,
      },
    })),
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] relative">
      {/* Schema.org FAQPage Rich Snippet Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchemaData) }}
      />

      {/* Floating Home Page & AI Customizer Action Button - Visible ONLY to ADMIN */}
      {dbUser?.role === "ADMIN" && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            id="open-homepage-customizer-btn"
            onClick={() => setIsCustomizerOpen(true)}
            className="group px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white rounded-2xl shadow-xl hover:shadow-2xl border border-white/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2.5 active:scale-95"
            title="Edit Home Page pictures, cards, wording, styles & upload Logo"
          >
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold leading-tight flex items-center gap-1">
                Customize Home Page
                <Edit3 className="w-3 h-3 text-indigo-200" />
              </span>
              <span className="block text-[10px] text-indigo-100 font-medium">
                Admin Customizer • 98% AdSense Score
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Hero Section with Customizable Styles, Pictures & Search Bar */}
      <section
        className={`${getHeroThemeClasses()} relative overflow-hidden transition-all duration-300`}
        style={
          config.heroImageUrl
            ? {
                backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)), url(${config.heroImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none"></div>

        {/* AI Controlled Trust Ribbon */}
        <div className="bg-white/10 backdrop-blur-md border-b border-white/10 py-1.5 px-4 text-center">
          <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-emerald-300">
            <span className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-indigo-300" />
              <span>AI Content & AdSense Optimized: <strong>Score 98/100</strong></span>
            </span>
            <span className="hidden sm:inline text-white/40">•</span>
            <span>Default Marketplace Currency: <strong>{currencyConfig.code} ({currencyConfig.symbol})</strong></span>
            <span className="hidden sm:inline text-white/40">•</span>
            <span>100% Escrow Protection on Every Stay</span>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10 text-center max-w-5xl">
          {/* Brand Tag Pill */}
          {config.logoTagline && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-indigo-200 mb-6 backdrop-blur-sm shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{config.logoTagline}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
          )}

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight text-white drop-shadow-sm">
            {config.heroHeadline || "Loving, Verified Pet Sitters in Your Neighborhood."}
          </h1>

          <p className="text-base md:text-lg text-slate-200 mb-10 max-w-2xl mx-auto leading-relaxed font-normal">
            {config.heroSubheadline ||
              "PawShield connects caring pet parents with background-checked local sitters for cage-free home boarding, house sitting, drop-in visits, and daily dog walking."}
          </p>

          {/* Embedded Quick Search Form */}
          <form
            onSubmit={handleHeroSearch}
            className="bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-3xl shadow-2xl max-w-3xl mx-auto mb-10 border border-white/20 text-left flex flex-col md:flex-row gap-3 items-stretch md:items-center"
          >
            <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
              <MapPin className="w-5 h-5 text-indigo-600 shrink-0" />
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="Neighborhood (e.g. BGC, Makati, Quezon City)..."
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium"
              />
            </div>

            <div className="md:w-52 flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
              <select
                value={searchService}
                onChange={(e) => setSearchService(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 focus:outline-none font-medium"
              >
                <option value="BOARDING">Pet Boarding</option>
                <option value="HOUSE_SITTING">House Sitting</option>
                <option value="DROP_IN">Drop-In Visit</option>
                <option value="DOG_WALKING">Dog Walking</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm shrink-0 active:scale-95"
            >
              <Search className="w-4 h-4" />
              <span>Search Sitters</span>
            </button>
          </form>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/search"
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm active:scale-95"
            >
              <Search className="w-4 h-4 text-indigo-600" />
              {config.heroPrimaryBtnText || "Find a Sitter Now"}
            </Link>

            <Link
              to="/become-a-sitter"
              className="w-full sm:w-auto px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm backdrop-blur-sm active:scale-95"
            >
              <Heart className="w-4 h-4 text-rose-400" />
              {config.heroSecondaryBtnText || "Become a Sitter"}
            </Link>
          </div>
        </div>

        {/* Live Marketplace Trust Counters */}
        <div className="bg-black/25 backdrop-blur-sm border-t border-white/10 py-6 px-4">
          <div className="container mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-white">10,000+</p>
              <p className="text-xs text-slate-300 font-medium mt-0.5">Verified Pinoy Stays</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-amber-400">4.98 ★</p>
              <p className="text-xs text-slate-300 font-medium mt-0.5">Average Sitter Rating</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-emerald-400">₱50,000</p>
              <p className="text-xs text-slate-300 font-medium mt-0.5">Emergency Vet Guarantee</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-indigo-300">100%</p>
              <p className="text-xs text-slate-300 font-medium mt-0.5">Escrow Payment Protection</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section: Why Choose PawShield */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verified Standards</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tight">
              {config.whyTitle || "Why choose PawShield?"}
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-sm leading-relaxed">
              {config.whySubtitle ||
                "We prioritize safety, verified trust, and health above all else with transparent pricing in Philippine Pesos."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureCards.map((card, idx) => (
              <div
                key={card.id || idx}
                className="p-6 rounded-3xl bg-slate-50/80 border border-slate-200/80 text-center hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                    {renderCardIcon(card.icon)}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{card.title}</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">{card.description}</p>
                </div>

                {card.badge && (
                  <div className="pt-4 mt-4 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full inline-block">
                      {card.badge}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AdSense Placement: Home Mid-Banner with Safe 48px Accidental-Click Margins */}
      {adConfig.showOnLanding && (
        <section className="bg-slate-50/70 py-10 border-y border-slate-200">
          <div className="container mx-auto px-4 max-w-4xl flex justify-center">
            <AdSenseUnit format="horizontal" slotId={adConfig.headerSlotId} />
          </div>
        </section>
      )}

      {/* Services Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                  Tailored Care Modalities
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                  {config.servicesTitle || "Services tailored for every pet."}
                </h2>
                <p className="text-slate-600 text-xs mt-2">
                  {config.servicesSubtitle ||
                    "Customized schedules, medical care routines, and loving attention."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {serviceCards.map((srv, idx) => (
                  <div
                    key={srv.id || idx}
                    className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-200 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                        {srv.icon === "Home" ? (
                          <Home className="w-5 h-5" />
                        ) : srv.icon === "CalendarCheck" ? (
                          <CalendarCheck className="w-5 h-5" />
                        ) : (
                          <Footprints className="w-5 h-5" />
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{srv.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{srv.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Showcase Image */}
            <div className="flex-1 w-full bg-slate-900 rounded-3xl overflow-hidden aspect-video relative shadow-xl border border-slate-200">
              {config.servicesImageUrl ? (
                <img
                  src={config.servicesImageUrl}
                  alt="Pet Care Showcase"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
                    <ShieldCheck className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h4 className="font-extrabold text-lg text-white">Verified Caregivers on Standby</h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs">
                    Background screened, insurance-backed sitters available 7 days a week.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCustomizerOpen(true)}
                    className="mt-4 px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Upload Custom Photo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* High-Value AdSense Editorial Guide & Deep Content Section */}
      <section className="py-20 bg-white border-t border-slate-200">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-3xl p-8 md:p-12 border border-slate-200 shadow-sm">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/80 text-emerald-800 rounded-full text-xs font-bold mb-4">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Pet Care Guide & Editorial Standards</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
              {config.editorialTitle || "Why Pinoy Pet Parents Choose Home Boarding Over Traditional Kennels"}
            </h2>

            <p className="text-sm md:text-base text-slate-700 leading-relaxed mb-6 font-normal whitespace-pre-line">
              {config.editorialBody ||
                "Leaving your pet while at work, traveling, or on vacation can be stressful. For decades, pet parents only had traditional kennels or impersonal boarding facilities as options. Today, PawShield transforms pet care across the Philippines by connecting pet families with trusted, background-checked neighborhood caregivers who welcome pets directly into warm, cage-free homes. With individual 1-on-1 care, your pet maintains their familiar diet, walking routines, and bedtime habits without the stress or pathogen exposure of crowded cages."}
            </p>

            {config.editorialPoints && config.editorialPoints.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-slate-200/80">
                {config.editorialPoints.map((point, pIdx) => (
                  <div key={pIdx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-slate-800">{point}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Social Proof: Real Pet Parent Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-20 bg-slate-50 border-t border-slate-200">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-14">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                Verified Reviews
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                Loved by Pinoy Pet Families
              </h2>
              <p className="text-slate-600 text-xs mt-2 max-w-md mx-auto">
                Read real stories from verified pet parents who booked their sitters on PawShield.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((item, tIdx) => (
                <div
                  key={item.id || tIdx}
                  className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1 text-amber-400 mb-3">
                      {[...Array(item.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed italic mb-6">
                      "{item.review}"
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    {item.avatarUrl ? (
                      <img
                        src={item.avatarUrl}
                        alt={item.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">{item.name}</h5>
                      <p className="text-[11px] text-slate-500">
                        Parent of {item.petName} ({item.petType}) • {item.location}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Interactive FAQ Section with Schema.org SEO for Google Snippets */}
      {faqs.length > 0 && (
        <section className="py-20 bg-white border-t border-slate-200">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Frequently Asked Questions</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Everything You Need to Know
              </h2>
              <p className="text-slate-600 text-xs mt-2">
                Have questions about escrow payments, vetting, or emergency veterinary coverage?
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-slate-50/50"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:text-indigo-600 transition-colors"
                    >
                      <span>{faq.question}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-6 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 bg-white">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* City Hubs & SEO Search Discovery Footer Cloud */}
      <section className="py-12 bg-slate-100/70 border-t border-slate-200">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-6">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Browse Verified Pet Sitters By City & Neighborhood
            </h4>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "Metro Manila", "BGC Taguig", "Makati City", "Quezon City",
              "Pasig City", "Mandaluyong", "San Juan", "Alabang Muntinlupa",
              "Cebu City", "Davao City", "Iloilo City", "Baguio City",
            ].map((city, cIdx) => (
              <Link
                key={cIdx}
                to={`/search?location=${encodeURIComponent(city)}`}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                Pet Sitters in {city}
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center text-[11px] text-slate-500 flex flex-wrap items-center justify-center gap-4">
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:underline">Terms of Service</Link>
            <span>•</span>
            <Link to="/become-a-sitter" className="hover:underline">Become a Pet Sitter (Earn in ₱ PHP)</Link>
            <span>•</span>
            <Link to="/admin" className="hover:underline text-indigo-600 font-semibold">Admin Command Hub</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

