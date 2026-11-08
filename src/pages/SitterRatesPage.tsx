import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { 
  Save, Sparkles, Lock, Award, Check, Clock, 
  DollarSign, Moon, Sun, Footprints, Home, Plus, Minus,
  Users, Calendar, Info, CheckCircle2, PawPrint, Calculator,
  ShieldCheck, AlertCircle
} from "lucide-react";
import { cn } from "../lib/utils";
import { useCurrency } from "../lib/CurrencyContext";

interface DurationOption {
  minutes: number;
  label: string;
  tag?: string;
  detail: string;
}

interface ServiceModality {
  id: string;
  label: string;
  iconName: "moon" | "home" | "sun" | "clock" | "footprints";
  subtitle: string;
  unitLabel: string;
  shortUnit: string;
  defaultDurationMinutes: number;
  durationOptions: DurationOption[];
}

const MODALITIES: ServiceModality[] = [
  { 
    id: "BOARDING", 
    label: "Pet Boarding", 
    iconName: "moon",
    subtitle: "Overnight pet hospitality hosted at your home",
    unitLabel: "per overnight stay (24h)",
    shortUnit: "/ night",
    defaultDurationMinutes: 1440,
    durationOptions: [
      {
        minutes: 1440,
        label: "24 Hours",
        tag: "Standard",
        detail: "Standard 24-hour overnight stay (e.g. 10:00 AM to 10:00 AM next day)"
      },
      {
        minutes: 2160,
        label: "36 Hours",
        tag: "Extended",
        detail: "Full overnight plus extended daytime care through evening pick-up"
      }
    ]
  },
  { 
    id: "HOUSE_SITTING", 
    label: "House Sitting", 
    iconName: "home",
    subtitle: "Overnight pet & house care at owner's home",
    unitLabel: "per overnight stay (24h)",
    shortUnit: "/ night",
    defaultDurationMinutes: 1440,
    durationOptions: [
      {
        minutes: 1440,
        label: "24 Hours",
        tag: "Standard",
        detail: "Standard overnight stay in pet's familiar residence"
      },
      {
        minutes: 2160,
        label: "36 Hours",
        tag: "Extended",
        detail: "Overnight stay plus extended daytime home presence"
      }
    ]
  },
  { 
    id: "DAY_CARE", 
    label: "Doggy Day Care", 
    iconName: "sun",
    subtitle: "Daytime pet companionship and exercise at your home",
    unitLabel: "per daytime care session",
    shortUnit: "/ day",
    defaultDurationMinutes: 480,
    durationOptions: [
      {
        minutes: 480,
        label: "8 Hours",
        tag: "Full Day",
        detail: "Standard workday care (e.g. 8:30 AM to 4:30 PM)"
      },
      {
        minutes: 240,
        label: "4 Hours",
        tag: "Half Day",
        detail: "Morning or afternoon quick socialization session"
      },
      {
        minutes: 600,
        label: "10 Hours",
        tag: "Extended",
        detail: "Extended workday care with extra play breaks"
      }
    ]
  },
  { 
    id: "DROP_IN", 
    label: "Drop-In Visits", 
    iconName: "clock",
    subtitle: "Scheduled home check-ins for feeding, playtime & care",
    unitLabel: "per scheduled visit",
    shortUnit: "/ visit",
    defaultDurationMinutes: 60,
    durationOptions: [
      {
        minutes: 60,
        label: "60 Minutes",
        tag: "Standard",
        detail: "Full visit: meal service, fresh water, yard/litter cleanup & play"
      },
      {
        minutes: 30,
        label: "30 Minutes",
        tag: "Express",
        detail: "Quick potty break, fresh water top-up, and wellness check"
      }
    ]
  },
  { 
    id: "DOG_WALKING", 
    label: "Dog Walking", 
    iconName: "footprints",
    subtitle: "Active neighborhood leash walk with GPS route tracking",
    unitLabel: "per outdoor walk",
    shortUnit: "/ walk",
    defaultDurationMinutes: 60,
    durationOptions: [
      {
        minutes: 60,
        label: "60 Minutes",
        tag: "Standard",
        detail: "Full energetic walk with sniff enrichment time"
      },
      {
        minutes: 30,
        label: "30 Minutes",
        tag: "Express",
        detail: "Focused potty walk and gentle stroll"
      }
    ]
  },
];

interface CapacityOption {
  pets: number;
  label: string;
  tagline: string;
}

const CAPACITY_OPTIONS: CapacityOption[] = [
  { pets: 1, label: "1 Pet Only", tagline: "Dedicated 1-on-1 solo attention" },
  { pets: 2, label: "Up to 2 Pets", tagline: "Bonded sibling pairs & playmates" },
  { pets: 3, label: "Up to 3 Pets", tagline: "Small friendly group with space" },
  { pets: 4, label: "Up to 4 Pets", tagline: "Maximum allowable platform pack" },
];

interface SitterRatesPageProps {
  embedded?: boolean;
}

export function SitterRatesPage({ embedded = false }: SitterRatesPageProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { formatPrice } = useCurrency();
  
  const [activeModality, setActiveModality] = useState("BOARDING");
  const [rates, setRates] = useState<Record<string, any>>({});
  const [enabledServices, setEnabledServices] = useState<Record<string, boolean>>({
    BOARDING: true,
    HOUSE_SITTING: true,
    DROP_IN: true,
    DAY_CARE: true,
    DOG_WALKING: true,
  });

  const [maxPets, setMaxPets] = useState<number>(2);
  const [simulatedPets, setSimulatedPets] = useState<number>(2);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Platform policy & Tier metadata
  const [sitterTier, setSitterTier] = useState<"NOVICE" | "STANDARD" | "PRO">("NOVICE");
  const [completedBookings, setCompletedBookings] = useState(0);
  const [ratesLocked, setRatesLocked] = useState(false);
  const [rateApprovalStatus, setRateApprovalStatus] = useState("APPROVED");
  const [rateRejectionReason, setRateRejectionReason] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user) return;
    const fetchRates = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/sitters/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          
          setSitterTier(data.sitterTier || "NOVICE");
          setCompletedBookings(data.completedBookingsCount || 0);
          setRatesLocked(Boolean(data.ratesLocked));
          setRateApprovalStatus(data.rateApprovalStatus || "APPROVED");
          setRateRejectionReason(data.rateRejectionReason || null);
          setMaxPets(Number(data.maxPetsPerBooking) || 2);
          setSimulatedPets(Math.min(Number(data.maxPetsPerBooking) || 2, 2));

          const policyMap: Record<string, any> = {};
          if (Array.isArray(data.ratePolicies)) {
            data.ratePolicies.forEach((p: any) => {
              policyMap[p.modality] = p;
            });
          }
          setPolicies(policyMap);

          const ratesMap: Record<string, any> = {};
          const enabledMap: Record<string, boolean> = {};

          MODALITIES.forEach(m => {
            const pol = policyMap[m.id];
            const defaultBaseRate = pol ? pol.fixed_new_sitter_rate_php : 500;

            ratesMap[m.id] = {
              baseRate: defaultBaseRate,
              durationUnitMinutes: m.defaultDurationMinutes,
              extraPetFee: pol?.additional_pet_fee_php || 250,
              puppyRate: pol?.max_puppy_rate_php || 250,
              holidayMultiplier: pol?.max_holiday_multiplier || 1.25,
              rushHourSurcharge: 150
            };
            enabledMap[m.id] = false;
          });
          
          if (data.rateCards && data.rateCards.length > 0) {
            data.rateCards.forEach((rc: any) => {
              const rawBase = rc.base_rate !== undefined ? rc.base_rate : rc.baseRate;
              const normalizedBase = rawBase >= 10000 ? Math.round(rawBase / 100) : rawBase;
              ratesMap[rc.modality] = {
                ...ratesMap[rc.modality],
                ...rc,
                baseRate: normalizedBase || (ratesMap[rc.modality]?.baseRate || 350),
                durationUnitMinutes: rc.duration_unit_minutes || rc.durationUnitMinutes || MODALITIES.find(m => m.id === rc.modality)?.defaultDurationMinutes || 60,
                extraPetFee: policyMap[rc.modality]?.additional_pet_fee_php || 250,
                puppyRate: 250,
                rushHourSurcharge: 150,
              };
              if (policyMap[rc.modality]?.is_active !== false) {
                enabledMap[rc.modality] = true;
              }
            });
          } else {
            MODALITIES.forEach(m => {
              if (policyMap[m.id]?.is_active !== false) {
                enabledMap[m.id] = true;
              }
            });
          }

          setRates(ratesMap);
          setEnabledServices(enabledMap);
        }
      } catch (e) {
        console.error("Failed to fetch rates", e);
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, [user]);

  const currentModalityObj = MODALITIES.find(m => m.id === activeModality) || MODALITIES[0];
  const activePolicy = policies[activeModality] || {};
  const currentRate = rates[activeModality] || {};
  const isEnabled = enabledServices[activeModality] !== false;

  const isNovice = sitterTier === "NOVICE" || ratesLocked;
  const fixedRatePhp = activePolicy.fixed_new_sitter_rate_php || 350;
  const minRatePhp = activePolicy.standard_min_rate_php || 250;
  const maxRatePhp = isNovice
    ? fixedRatePhp
    : (sitterTier === "PRO" ? activePolicy.pro_max_rate_php : activePolicy.standard_max_rate_php) || 800;

  const currentBaseRate = isNovice ? fixedRatePhp : (Number(currentRate.baseRate) || fixedRatePhp);
  const isBelowFloor = !isNovice && currentBaseRate < minRatePhp;
  const isAboveCeiling = !isNovice && currentBaseRate > maxRatePhp;
  const hasValidationError = isBelowFloor || isAboveCeiling;

  const currentDurationMinutes = Number(currentRate.durationUnitMinutes || currentModalityObj.defaultDurationMinutes);
  const effectiveExtraPetFee = activePolicy.additional_pet_fee_php || currentRate.extraPetFee || 250;
  const effectivePuppyFee = activePolicy.max_puppy_rate_php || 250;
  const effectiveHolidayMultiplier = activePolicy.max_holiday_multiplier || "1.25";
  const platformCeilingMaxPets = activePolicy.max_pets_allowed || 4;

  // Earnings calculations
  const clientBookingTotal = currentBaseRate + Math.max(0, simulatedPets - 1) * effectiveExtraPetFee;
  const platformFee = Math.round(clientBookingTotal * 0.2);
  const sitterTakeHome = clientBookingTotal - platformFee;

  const adjustBaseRate = (delta: number) => {
    if (isNovice) return;
    const newVal = Math.max(minRatePhp, Math.min(maxRatePhp, currentBaseRate + delta));
    setRates({
      ...rates,
      [activeModality]: {
        ...currentRate,
        baseRate: newVal
      }
    });
  };

  const handleSave = async () => {
    if (!user) return;
    if (hasValidationError) {
      addToast(`Base rate for ${currentModalityObj.label} must be between ₱${minRatePhp} and ₱${maxRatePhp}.`, "error");
      return;
    }

    setSaving(true);
    try {
      const token = await user.getIdToken();
      const payload = Object.keys(rates)
        .filter(modality => enabledServices[modality])
        .map(modality => {
          const pol = policies[modality];
          const rateObj = rates[modality];
          const effectiveBase = isNovice 
            ? (pol ? pol.fixed_new_sitter_rate_php * 100 : 35000)
            : Math.round(Number(rateObj.baseRate) * 100);

          const defaultDur = (modality === "BOARDING" || modality === "HOUSE_SITTING") ? 1440 : (modality === "DAY_CARE" ? 480 : 60);

          return {
            modality,
            baseRate: effectiveBase,
            durationUnitMinutes: Number(rateObj.durationUnitMinutes || defaultDur),
            extraPetFee: Math.round(Number(pol?.additional_pet_fee_php || rateObj.extraPetFee || 250) * 100),
            puppyRate: Math.round(Number(pol?.max_puppy_rate_php || rateObj.puppyRate || 250) * 100),
            holidayMultiplier: String(pol?.max_holiday_multiplier || rateObj.holidayMultiplier || "1.25"),
            rushHourSurcharge: Math.round(Number(rateObj.rushHourSurcharge || 0) * 100),
            maxPetsPerBooking: maxPets
          };
        });

      if (payload.length === 0) {
        addToast("Please enable at least one service modality before saving.", "error");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/sitters/me/rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          rates: payload,
          maxPetsPerBooking: maxPets 
        })
      });

      if (res.ok) {
        addToast("Services, rates, and pet capacity saved successfully!", "success");
      } else {
        const err = await res.json();
        addToast(err.error || "Could not save rates", "error");
      }
    } catch (e: any) {
      console.error(e);
      addToast(e.message || "Failed to save rates.", "error");
    } finally {
      setSaving(false);
    }
  };

  const renderIcon = (iconName: string, className = "w-4 h-4") => {
    switch (iconName) {
      case "moon": return <Moon className={className} />;
      case "home": return <Home className={className} />;
      case "sun": return <Sun className={className} />;
      case "clock": return <Clock className={className} />;
      case "footprints": return <Footprints className={className} />;
      default: return <PawPrint className={className} />;
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-3">
        <div className="animate-spin h-8 w-8 border-3 border-teal-600 border-t-transparent rounded-full" />
        <span className="font-medium text-slate-600">Loading your service configuration...</span>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6 w-full" : "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"}>
      
      {/* Top Header Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-teal-400" />
              Sitter Pricing Authority
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {sitterTier} Tier · {completedBookings} Completed Jobs
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Services, Rates &amp; Pet Capacity
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Set your custom base rates, choose your care durations, and define maximum pet limits.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Net Take-Home</span>
            <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">80% Guaranteed</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || hasValidationError}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Warning Notice if rejected */}
      {rateApprovalStatus === "REJECTED" && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-900">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Rate Notice from Platform Administration</span>
            <p className="mt-0.5 text-rose-800">{rateRejectionReason || "Please adjust your rates to match community safety standards."}</p>
          </div>
        </div>
      )}

      {/* Service Selector Tabs Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {MODALITIES.map((mod) => {
          const active = activeModality === mod.id;
          const isPlatformActive = policies[mod.id]?.is_active !== false;
          const enabled = isPlatformActive && (enabledServices[mod.id] !== false);
          const rObj = rates[mod.id] || {};
          const displayPrice = isNovice ? (policies[mod.id]?.fixed_new_sitter_rate_php || 350) : (rObj.baseRate || 350);

          return (
            <button
              key={mod.id}
              onClick={() => setActiveModality(mod.id)}
              className={cn(
                "p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5",
                active 
                  ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10" 
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className={cn(
                  "p-2 rounded-xl",
                  active ? "bg-slate-800 text-teal-400" : "bg-slate-100 text-slate-600"
                )}>
                  {renderIcon(mod.iconName)}
                </span>
                
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-md",
                  !isPlatformActive 
                    ? "bg-rose-100 text-rose-700" 
                    : enabled 
                      ? active ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30" : "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-400"
                )}>
                  {!isPlatformActive ? "Paused" : enabled ? "Active" : "Off"}
                </span>
              </div>

              <div>
                <span className="font-bold text-xs block truncate">{mod.label}</span>
                <span className={cn("text-xs font-mono font-black block mt-0.5", active ? "text-teal-300" : "text-slate-900")}>
                  ₱{displayPrice} <span className={cn("text-[10px] font-normal", active ? "text-slate-400" : "text-slate-500")}>{mod.shortUnit}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Focused Service Settings (8 Cols on Desktop) */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          
          {/* Service Title & Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                {renderIcon(currentModalityObj.iconName, "w-5 h-5")}
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">{currentModalityObj.label}</h2>
                <p className="text-xs text-slate-500">{currentModalityObj.subtitle}</p>
              </div>
            </div>

            {activePolicy.is_active !== false && (
              <label className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-xs font-bold text-slate-800 hover:bg-slate-100 transition shrink-0">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => {
                    setEnabledServices({
                      ...enabledServices,
                      [activeModality]: e.target.checked
                    });
                  }}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <span>Offer this service</span>
              </label>
            )}
          </div>

          {!isEnabled ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-3 bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <p className="font-bold text-slate-700 text-sm">{currentModalityObj.label} is Switched Off</p>
              <p className="text-slate-500 max-w-sm mx-auto">Toggle this service on to set rates and accept client booking requests.</p>
              <button
                type="button"
                onClick={() => setEnabledServices({ ...enabledServices, [activeModality]: true })}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Enable {currentModalityObj.label}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Section 1: Base Price per Unit */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>Base Rate {currentModalityObj.unitLabel}</span>
                    </h3>
                    <p className="text-xs text-slate-500">Covers the 1st pet in the booking.</p>
                  </div>

                  <span className={cn(
                    "text-[11px] font-bold px-2.5 py-0.5 rounded-full self-start sm:self-center",
                    isNovice ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-blue-50 text-blue-800 border border-blue-200"
                  )}>
                    {isNovice ? `Fixed Novice Floor: ₱${fixedRatePhp}` : `Allowed Range: ₱${minRatePhp} – ₱${maxRatePhp}`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[160px]">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-black text-slate-400">₱</span>
                    <input 
                      type="number"
                      disabled={isNovice}
                      value={currentBaseRate}
                      onChange={(e) => {
                        setRates({
                          ...rates,
                          [activeModality]: {
                            ...currentRate,
                            baseRate: Number(e.target.value)
                          }
                        });
                      }}
                      className={cn(
                        "w-full pl-8 pr-4 py-2.5 rounded-xl text-lg font-black font-mono border",
                        isNovice 
                          ? "bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed"
                          : hasValidationError
                            ? "bg-rose-50 border-rose-300 text-rose-900 focus:ring-rose-500"
                            : "bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-teal-500"
                      )}
                    />
                  </div>

                  {!isNovice && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => adjustBaseRate(-50)}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1"
                      >
                        <Minus className="w-3.5 h-3.5" /> ₱50
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustBaseRate(50)}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> ₱50
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustBaseRate(100)}
                        className="p-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl border border-teal-200 transition cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> ₱100
                      </button>
                    </div>
                  )}
                </div>

                {hasValidationError && (
                  <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Base rate must be between ₱{minRatePhp} and ₱{maxRatePhp}.
                  </p>
                )}
              </div>

              {/* Section 2: Care Duration Preset Options */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>Duration &amp; Service Window</span>
                  </h3>
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    Selected: {Math.round(currentDurationMinutes / 60)}h ({currentDurationMinutes}m)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentModalityObj.durationOptions.map((opt) => {
                    const isSelected = currentDurationMinutes === opt.minutes;
                    return (
                      <div
                        key={opt.minutes}
                        onClick={() => {
                          setRates({
                            ...rates,
                            [activeModality]: {
                              ...currentRate,
                              durationUnitMinutes: opt.minutes
                            }
                          });
                        }}
                        className={cn(
                          "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2",
                          isSelected
                            ? "bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{opt.label}</span>
                            {opt.tag && (
                              <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded",
                                isSelected ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                              )}>
                                {opt.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.detail}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Pet Capacity Limit (1-4) */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>Maximum Pet Capacity Limit</span>
                    </h3>
                    <p className="text-xs text-slate-500">How many pets can you safely care for at the same time?</p>
                  </div>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                    Platform Cap: {platformCeilingMaxPets} Max
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {CAPACITY_OPTIONS.map((cap) => {
                    const isSelected = maxPets === cap.pets;
                    const isExceeding = cap.pets > platformCeilingMaxPets;
                    return (
                      <button
                        key={cap.pets}
                        type="button"
                        disabled={isExceeding}
                        onClick={() => {
                          setMaxPets(cap.pets);
                          if (simulatedPets > cap.pets) setSimulatedPets(cap.pets);
                        }}
                        className={cn(
                          "p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1",
                          isExceeding
                            ? "opacity-40 cursor-not-allowed bg-slate-50 border-slate-200"
                            : isSelected
                              ? "bg-purple-50 border-purple-500 ring-2 ring-purple-500/20 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black",
                          isSelected ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700"
                        )}>
                          {cap.pets}
                        </div>
                        <span className="text-xs font-bold text-slate-900">{cap.label}</span>
                        <span className="text-[10px] text-slate-500 line-clamp-1">{cap.tagline}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Standardized Add-On Surcharges Strip */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span>Standardized Add-On Surcharges</span>
                  </h3>
                  <p className="text-xs text-slate-500">Automatically added at checkout for transparency and guaranteed caregiver earnings.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-medium text-slate-500 block">Extra Pet Surcharge</span>
                    <span className="text-base font-black text-slate-900 font-mono">+₱{effectiveExtraPetFee}</span>
                    <span className="text-[10px] text-teal-700 block mt-0.5">Applies to pets #2, #3, #4</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-medium text-slate-500 block">Puppy Care Premium</span>
                    <span className="text-base font-black text-slate-900 font-mono">+₱{effectivePuppyFee}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">For puppies under 1 year</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-medium text-slate-500 block">Holiday Multiplier</span>
                    <span className="text-base font-black text-slate-900 font-mono">{effectiveHolidayMultiplier}x</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">National holidays &amp; peak dates</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Right Column: Live Earnings Calculator (4 Cols on Desktop) */}
        <div className="lg:col-span-4 w-full sticky top-6 space-y-4">
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>Live Earnings Preview</span>
              </h3>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                80% Net
              </span>
            </div>

            {/* Interactive Pet Count Toggle */}
            <div className="space-y-1.5">
              <span className="text-xs text-slate-400 font-semibold block">Simulate Pets in Booking:</span>
              <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {[1, 2, 3, 4].map((num) => {
                  const isDisabled = num > maxPets;
                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSimulatedPets(num)}
                      className={cn(
                        "py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer",
                        isDisabled
                          ? "opacity-25 cursor-not-allowed text-slate-600"
                          : simulatedPets === num
                            ? "bg-emerald-500 text-slate-950 shadow-xs"
                            : "text-slate-400 hover:text-white"
                      )}
                    >
                      <PawPrint className="w-3 h-3" />
                      <span>{num}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between text-slate-400">
                <span>1st Pet Base Rate:</span>
                <span className="font-mono text-white">₱{currentBaseRate.toLocaleString()}</span>
              </div>

              {simulatedPets > 1 && (
                <div className="flex justify-between text-slate-400">
                  <span>Extra Pets ({simulatedPets - 1}x ₱{effectiveExtraPetFee}):</span>
                  <span className="font-mono text-emerald-300">
                    +₱{((simulatedPets - 1) * effectiveExtraPetFee).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-2">
                <span>Gross Booking Total:</span>
                <span className="font-mono text-white font-bold">₱{clientBookingTotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Platform Escrow Fee (20%):</span>
                <span className="font-mono text-rose-300">-₱{platformFee.toLocaleString()}</span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between font-bold text-sm">
                <span className="text-emerald-400">You Receive (80%):</span>
                <span className="font-mono text-emerald-400 text-xl">
                  ₱{sitterTakeHome.toLocaleString()}
                </span>
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={saving || hasValidationError}
              className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-2xl shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 text-xs cursor-pointer"
            >
              <Save className="w-4 h-4" /> 
              <span>{saving ? "Saving Configuration..." : "Save Rate Card"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
