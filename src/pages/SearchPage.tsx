import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useToast } from "../components/ToastContext";
import { 
  Search, 
  MapPin, 
  Star, 
  ShieldCheck, 
  Filter, 
  Map, 
  ShieldAlert, 
  X, 
  SlidersHorizontal,
  Calendar,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { cn } from "../lib/utils";
import { AdSenseUnit } from "../components/AdSenseUnit";
import { SitterProfileCard } from "../components/SitterProfileCard";
import { useAdSense } from "../lib/AdSenseContext";
import { useAuth } from "../lib/AuthContext";
import { useCurrency } from "../lib/CurrencyContext";

const DEFAULT_MODALITIES = ["BOARDING", "HOUSE_SITTING", "DROP_IN", "DAY_CARE", "DOG_WALKING"];

export function SearchPage() {
  const { dbUser } = useAuth();
  const navigate = useNavigate();
  const { config } = useAdSense();
  const { formatPrice } = useCurrency();
  const [sitters, setSitters] = useState<any[]>([]);
  const [activeServices, setActiveServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Fetch active service policies from platform administration
  useEffect(() => {
    async function loadActiveServices() {
      try {
        const res = await fetch("/api/search/services");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.services)) {
            const active = data.services.filter((s: any) => s.is_active !== false);
            setActiveServices(active);
            if (active.length > 0 && !active.some((s: any) => s.modality === filters.modality)) {
              setFilters(prev => ({ ...prev, modality: active[0].modality }));
            }
          }
        }
      } catch (err) {
        console.warn("Could not load active services", err);
      }
    }
    loadActiveServices();
  }, []);

  // Compute available modalities (or fallback to defaults if loading)
  const availableModalities = activeServices.length > 0
    ? activeServices.map(s => s.modality)
    : DEFAULT_MODALITIES;

  // Pet Sitter Role Restriction: Cannot browse/book other sitters
  if (dbUser?.role === "PET_SITTER") {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900">Find a Sitter Disabled for Caregivers</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            As a registered Pet Sitter, your account is configured to receive bookings from pet owners rather than booking other sitters.
          </p>
          <button
            onClick={() => navigate("/sitter/dashboard")}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors inline-block"
          >
            Go to Sitter Hub & Bookings
          </button>
        </div>
      </div>
    );
  }

  const [filters, setFilters] = useState({
    modality: "BOARDING",
    minPrice: 300,
    maxPrice: 2500,
    date: "",
    verifiedOnly: false,
  });

  useEffect(() => {
    fetchSitters();
  }, [filters]);

  const fetchSitters = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.modality) query.append("modality", filters.modality);
      if (filters.maxPrice) query.append("maxPrice", filters.maxPrice.toString());
      if (filters.date) query.append("date", filters.date);

      query.append("lat", "14.5995");
      query.append("lng", "120.9842");

      const res = await fetch(`/api/search/sitters?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          let list = data;
          if (filters.verifiedOnly) {
            list = list.filter((s: any) => s.is_verified || s.verified);
          }
          setSitters(list);
        } else {
          setSitters([]);
        }
      } else {
        setSitters([]);
      }
    } catch {
      setSitters([]);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      modality: "BOARDING",
      minPrice: 300,
      maxPrice: 2500,
      date: "",
      verifiedOnly: false,
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Column: Filters & Grid */}
        <div className="flex-1 space-y-5">
          
          {/* Mobile Filter Trigger Bar (Lower Screen Thumb Ergonomics) */}
          <div className="md:hidden flex items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span className="px-3 py-1 bg-purple-50 text-purple-800 text-xs font-bold rounded-full whitespace-nowrap border border-purple-200">
                {filters.modality.replace("_", " ")}
              </span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full whitespace-nowrap">
                Max ₱{filters.maxPrice}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 active:bg-purple-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Desktop Filter Bar */}
          <div className="hidden md:block bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            {/* Modality Tabs */}
            <div className="flex overflow-x-auto pb-2 mb-4 gap-2 no-scrollbar">
              {availableModalities.map((mod) => (
                <button
                  key={mod}
                  onClick={() => setFilters({ ...filters, modality: mod })}
                  className={cn(
                    "px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-colors",
                    filters.modality === mod
                      ? "bg-purple-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {mod.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Desktop Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4 items-center">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                  Dates Required
                </label>
                <input 
                  type="date" 
                  value={filters.date}
                  onChange={(e) => setFilters({...filters, date: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Max Rate (PHP)
                  </span>
                  <span className="text-sm font-black text-purple-700">
                    ₱{filters.maxPrice}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="300" max="3000" step="50"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: parseInt(e.target.value)})}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 pt-4 md:pt-0">
                <input
                  type="checkbox"
                  id="verified-desktop"
                  checked={filters.verifiedOnly}
                  onChange={(e) => setFilters({...filters, verifiedOnly: e.target.checked})}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="verified-desktop" className="text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> PawShield Verified Only
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>{sitters.length} Sitters near you</span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Verified Local
              </span>
            </h2>
          </div>

          {/* AdSense Placement: Search Header In-Feed */}
          {config.showOnSearch && (
            <div className="w-full flex justify-center my-2">
              <AdSenseUnit format="horizontal" slotId={config.searchSlotId} />
            </div>
          )}

          {/* Sitter Grid or Empty State */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>
              ))}
            </div>
          ) : sitters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sitters.map((sitter) => (
                <SitterProfileCard 
                  key={sitter.profile_id || sitter.id} 
                  sitter={sitter}
                  activeFilterModality={filters.modality}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
                <Search className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-black text-slate-900">No Pet Sitters Found</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  There are currently no active registered pet sitters in the database matching this search criteria.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
                <Link
                  to="/become-a-sitter"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Become a Pet Sitter
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Map Placeholder */}
        <div className="hidden lg:block w-[380px] xl:w-[420px]">
          <div className="sticky top-24 bg-slate-100 rounded-3xl overflow-hidden h-[calc(100vh-8rem)] flex flex-col items-center justify-center border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mb-3">
              <Map className="w-6 h-6" />
            </div>
            <p className="text-slate-900 font-bold">Interactive Metro Manila Map</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              Displaying {sitters.length} verified caregivers with direct neighborhood geofences and safety clusters.
            </p>
          </div>
        </div>
        
      </div>

      {/* MOBILE FILTER DRAWER: Native Bottom Sheet with Sticky Footer Button & Live Count Badge */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col border-t border-slate-200 animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Drag Bar & Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Search Filters</h3>
                  <p className="text-[11px] text-slate-500">Fine-tune care modalities and rates</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-800 px-2 py-1"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Filter Content */}
            <div className="overflow-y-auto p-5 space-y-5 pb-28">
              {/* Care Modalities */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Care Modality
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableModalities.map((mod) => (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => setFilters({ ...filters, modality: mod })}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-xs font-bold transition-colors",
                        filters.modality === mod
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700"
                      )}
                    >
                      {mod.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Booking Date Range
                </label>
                <input 
                  type="date" 
                  value={filters.date}
                  onChange={(e) => setFilters({...filters, date: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Price Range Slider in Philippine Peso (₱) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Price Range (PHP)
                  </span>
                  <span className="text-sm font-black text-purple-700">
                    ₱{filters.minPrice} - ₱{filters.maxPrice}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="300" max="3000" step="50"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: parseInt(e.target.value)})}
                  className="w-full accent-purple-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-medium">
                  <span>₱300</span>
                  <span>₱3,000</span>
                </div>
              </div>

              {/* Verified Filter Toggle */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">PawShield Verified Only</h5>
                    <p className="text-[11px] text-slate-500">Government ID & background checked</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={filters.verifiedOnly}
                  onChange={(e) => setFilters({...filters, verifiedOnly: e.target.checked})}
                  className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                />
              </div>
            </div>

            {/* STICKY FOOTER BUTTON WITH LIVE COUNT BADGE: Eliminates vertical scrolling friction on iPhone SE / small viewports */}
            <div className="p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-3.5 px-5 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-lg flex items-center justify-between transition-all"
              >
                <span className="text-sm">
                  View {sitters.length} Sitter{sitters.length === 1 ? "" : "s"}
                </span>
                <span className="bg-purple-800/80 px-3 py-1 rounded-xl text-xs font-bold text-purple-100">
                  ₱{filters.minPrice} - ₱{filters.maxPrice}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
