import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { 
  Star, 
  ShieldCheck, 
  MapPin, 
  Sparkles, 
  ChevronRight, 
  Check, 
  X, 
  Info, 
  CalendarCheck,
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react";
import { useCurrency } from "../lib/CurrencyContext";
import { cn } from "../lib/utils";

export interface RateCard {
  id?: number;
  modality: string;
  baseRate: number;
  baseRateCents?: number;
  durationUnitMinutes?: number;
  extraPetFee?: number;
  puppyRate?: number;
  medicationSurcharge?: number;
  holidayMultiplier?: string | number;
  rushHourSurcharge?: number;
  status?: string;
}

export interface SitterProfileCardProps {
  sitter: {
    id: number | string;
    user_id?: number | string;
    profile_id?: number | string;
    name?: string;
    email?: string;
    rating?: number | string;
    rate?: number;
    bio?: string;
    distance?: number;
    verified?: boolean;
    is_verified?: boolean;
    profile_picture?: string;
    profilePicture?: string;
    photos?: string[];
    rateCards?: RateCard[];
    services?: string[];
    petPreferences?: {
      acceptsDogs?: boolean;
      acceptsCats?: boolean;
      acceptsPuppies?: boolean;
      acceptsSeniorPets?: boolean;
      fencedYard?: boolean;
    };
    tags?: string[];
    reviewCount?: number;
  };
  activeFilterModality?: string;
  onTagClick?: (tag: string) => void;
}

const MODALITY_LABELS: Record<string, string> = {
  BOARDING: "Boarding",
  HOUSE_SITTING: "House Sitting",
  DROP_IN: "Drop-In",
  DAY_CARE: "Day Care",
  DOG_WALKING: "Dog Walking",
};

const DEFAULT_RATES: RateCard[] = [
  { modality: "BOARDING", baseRate: 1200, durationUnitMinutes: 1440, extraPetFee: 250, puppyRate: 250 },
  { modality: "HOUSE_SITTING", baseRate: 1000, durationUnitMinutes: 1440, extraPetFee: 250, puppyRate: 250 },
  { modality: "DROP_IN", baseRate: 450, durationUnitMinutes: 60, extraPetFee: 250, puppyRate: 250 },
  { modality: "DAY_CARE", baseRate: 800, durationUnitMinutes: 60, extraPetFee: 250, puppyRate: 250 },
  { modality: "DOG_WALKING", baseRate: 350, durationUnitMinutes: 60, extraPetFee: 250, puppyRate: 250 },
];

function getUnitLabel(modality: string, durationMinutes?: number) {
  if (modality === "BOARDING" || modality === "HOUSE_SITTING") return "/night";
  if (modality === "DOG_WALKING") return durationMinutes ? `/${durationMinutes}m` : "/walk";
  if (modality === "DAY_CARE") return "/day";
  if (modality === "DROP_IN") return durationMinutes ? `/${durationMinutes}m` : "/visit";
  return "/service";
}

export function SitterProfileCard({ sitter, activeFilterModality, onTagClick }: SitterProfileCardProps) {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const sitterId = sitter?.profile_id || sitter?.id || 1;
  const profileAvatar = sitter?.profile_picture || (sitter as any)?.profilePicture;
  const photoList = Array.isArray(sitter?.photos) ? sitter.photos : [];
  
  // Prioritize actual profile picture so search matches profile exactly
  const photo = profileAvatar || (photoList.length > 0 ? photoList[0] : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80");
  
  const petPrefs = sitter?.petPreferences ?? {};
  const tags = sitter?.tags ?? [];
  const isVerified = sitter?.verified ?? sitter?.is_verified ?? false;

  // Rate cards resolution: Use database rates or fallbacks
  const availableRates: RateCard[] = (sitter?.rateCards && sitter.rateCards.length > 0)
    ? sitter.rateCards.map(rc => ({
        ...rc,
        baseRate: rc.baseRate >= 10000 ? Math.round(rc.baseRate / 100) : rc.baseRate,
        extraPetFee: rc.extraPetFee && rc.extraPetFee >= 10000 ? Math.round(rc.extraPetFee / 100) : (rc.extraPetFee || 250),
        puppyRate: rc.puppyRate && rc.puppyRate >= 10000 ? Math.round(rc.puppyRate / 100) : (rc.puppyRate || 250),
      }))
    : DEFAULT_RATES;

  // Selected modality state: matches search filter if available, otherwise first rate
  const initialModality = (activeFilterModality && availableRates.some(r => r.modality === activeFilterModality))
    ? activeFilterModality
    : (availableRates[0]?.modality || "BOARDING");

  const [selectedModality, setSelectedModality] = useState<string>(initialModality);
  const [showRatesModal, setShowRatesModal] = useState<boolean>(false);

  // Sync selected modality if activeFilterModality changes
  React.useEffect(() => {
    if (activeFilterModality && availableRates.some(r => r.modality === activeFilterModality)) {
      setSelectedModality(activeFilterModality);
    }
  }, [activeFilterModality, availableRates]);

  const activeRateCard = availableRates.find(r => r.modality === selectedModality) || availableRates[0];
  const currentPrice = activeRateCard?.baseRate ?? sitter?.rate ?? 1200;
  const currentUnit = getUnitLabel(selectedModality, activeRateCard?.durationUnitMinutes);

  return (
    <>
      <div className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group h-full flex flex-col">
        {/* Photo Container */}
        <div className="relative h-44 bg-slate-200 overflow-hidden">
          <Link to={`/sitters/${sitterId}?modality=${selectedModality}`} className="block w-full h-full cursor-pointer">
            <img 
              src={photo} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              alt={sitter?.name || "Verified Sitter"} 
              referrerPolicy="no-referrer"
            />
          </Link>

          {/* Rating Badge */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-xs font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{sitter?.rating || "4.9"}</span>
            {sitter?.reviewCount && (
              <span className="text-slate-400 font-normal">({sitter.reviewCount})</span>
            )}
          </div>

          {/* Current Service Rate Pill */}
          <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5">
            <span className="text-purple-300 font-semibold">{MODALITY_LABELS[selectedModality] || selectedModality}:</span>
            <span className="text-white font-black">{formatPrice(currentPrice)}</span>
            <span className="text-slate-300 text-[10px]">{currentUnit}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 flex flex-col flex-1">
          {/* Header & Main Price */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <Link to={`/sitters/${sitterId}?modality=${selectedModality}`} className="hover:text-purple-700 transition-colors">
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-1.5">
                  <span>{sitter?.name || sitter?.email?.split("@")[0] || "Verified Sitter"}</span>
                  {isVerified && (
                    <span title="PawShield Identity & Escrow Verified">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 inline" />
                    </span>
                  )}
                </h3>
              </Link>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>{typeof sitter?.distance === "number" ? `${sitter.distance.toFixed(1)} km away` : "Nearby • Within 10 km"}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-purple-700">
                {formatPrice(currentPrice)}
              </span>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">
                {currentUnit.replace("/", "per ")}
              </p>
            </div>
          </div>

          {/* Interactive Services Set by Sitter */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600">Available Services & Rates:</span>
              <button 
                type="button"
                onClick={() => setShowRatesModal(true)}
                className="text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-0.5 cursor-pointer"
              >
                <Info className="w-3 h-3" /> Full Rates
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableRates.map((rc) => {
                const isSelected = selectedModality === rc.modality;
                return (
                  <button
                    key={rc.modality}
                    type="button"
                    onClick={() => setSelectedModality(rc.modality)}
                    className={cn(
                      "text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all border flex items-center gap-1 cursor-pointer",
                      isSelected
                        ? "bg-purple-700 text-white border-purple-700 shadow-xs ring-2 ring-purple-600/20"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50 hover:border-purple-200"
                    )}
                  >
                    <span>{MODALITY_LABELS[rc.modality] || rc.modality}</span>
                    <span className={cn("font-black", isSelected ? "text-purple-200" : "text-purple-700")}>
                      {formatPrice(rc.baseRate)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bio */}
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
            {sitter?.bio || "Experienced pet caregiver offering attentive home boarding, medication support, and daily video check-ins."}
          </p>

          {/* Pet Preference Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {petPrefs?.acceptsDogs !== false && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                <Check className="w-3 h-3 text-emerald-600" /> Dogs
              </span>
            )}
            {petPrefs?.acceptsCats && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                <Check className="w-3 h-3 text-emerald-600" /> Cats
              </span>
            )}
            {petPrefs?.fencedYard && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" /> Fenced Yard
              </span>
            )}
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick?.(tag)}
                className="text-[10px] font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 px-2 py-0.5 rounded-md transition-colors border border-purple-200 cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>

          {/* Action Row */}
          <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <Link 
              to={`/sitters/${sitterId}?modality=${selectedModality}`} 
              className="text-xs font-bold text-slate-600 hover:text-purple-700 flex items-center gap-0.5 transition-colors"
            >
              View Profile <ChevronRight className="w-3.5 h-3.5" />
            </Link>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowRatesModal(true)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="View full rate cards and policy details"
              >
                Rates
              </button>
              
              <button
                type="button"
                onClick={() => navigate(`/book/${sitterId}?modality=${selectedModality}`)}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Book {MODALITY_LABELS[selectedModality] || "Care"}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick View Rates & Services Modal */}
      {showRatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <img 
                  src={photo} 
                  alt={sitter?.name || "Sitter"} 
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200" 
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                    <span>{sitter?.name || "Verified Pet Sitter"}</span>
                    {isVerified && <ShieldCheck className="w-4 h-4 text-emerald-600 inline" />}
                  </h3>
                  <p className="text-xs text-slate-500">Caregiver Services & Standard Rates</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRatesModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close rates modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Service Rates List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Services Offered by this Sitter
              </h4>
              {availableRates.map((rc) => {
                const isSelected = selectedModality === rc.modality;
                return (
                  <div
                    key={rc.modality}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all",
                      isSelected
                        ? "border-purple-600 bg-purple-50/70 shadow-xs"
                        : "border-slate-200 bg-slate-50/50 hover:bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {MODALITY_LABELS[rc.modality] || rc.modality}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-black bg-purple-700 text-white px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-purple-700">
                          {formatPrice(rc.baseRate)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium ml-1">
                          {getUnitLabel(rc.modality, rc.durationUnitMinutes)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 mt-2 gap-2">
                      <div className="flex items-center gap-3">
                        <span>Additional Pet: <strong className="text-slate-700">+{formatPrice(rc.extraPetFee ?? 250)}</strong></span>
                        {(rc.puppyRate ?? 0) > 0 && (
                          <span>Puppy Care: <strong className="text-slate-700">+{formatPrice(rc.puppyRate!)}</strong></span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModality(rc.modality);
                          setShowRatesModal(false);
                          navigate(`/book/${sitterId}?modality=${rc.modality}`);
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer ml-auto"
                      >
                        <span>Book</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sitter Policies & Protection */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>PawShield Protection Guarantee</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                All bookings are held securely in platform escrow and only disbursed after stay completion. Includes 24/7 emergency vet support and free cancellation up to 48 hours before check-in.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Link
                to={`/sitters/${sitterId}?modality=${selectedModality}`}
                onClick={() => setShowRatesModal(false)}
                className="text-xs font-bold text-purple-700 hover:text-purple-800 underline"
              >
                View Full Bio & Reviews
              </Link>
              <button
                type="button"
                onClick={() => setShowRatesModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
