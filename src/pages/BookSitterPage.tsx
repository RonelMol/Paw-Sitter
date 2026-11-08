import React, { useState, useEffect, FormEvent } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { 
  ShieldCheck, 
  ShieldAlert,
  Info, 
  Check, 
  MapPin, 
  Calendar, 
  Clock, 
  CreditCard, 
  FileText,
  Banknote, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  CalendarCheck, 
  User, 
  Sparkles, 
  AlertTriangle,
  PawPrint,
  Utensils,
  Footprints,
  Pill,
  ArrowRight,
  HeartHandshake,
  Coffee,
  Phone,
  Lock,
  Home,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { DynamicTripCalendar } from "../components/DynamicTripCalendar";
import { BookingActivityTimeline, CareActivityItem } from "../components/BookingActivityTimeline";
import { BookingVerificationModal } from "../components/BookingVerificationModal";
import { BuyMeCoffeeModal } from "../components/BuyMeCoffeeModal";
import { AuthModal } from "../components/AuthModal";
import { useCurrency } from "../lib/CurrencyContext";
import { CurrencySelector } from "../components/CurrencySelector";

// Initialize Stripe. Use the env var or fallback test key for UI purposes.
const stripePromise = loadStripe((import.meta as any).env?.VITE_STRIPE_PUBLIC_KEY || "pk_test_TYooMQauvdEDq54NiTphI7jx");

// Default initial dates (Tomorrow to Day After Tomorrow) to prevent empty string RangeErrors
const getInitialBookingDates = () => {
  const d1 = new Date();
  d1.setDate(d1.getDate() + 1);
  const d2 = new Date();
  d2.setDate(d2.getDate() + 2);
  const y1 = d1.getFullYear();
  const m1 = String(d1.getMonth() + 1).padStart(2, "0");
  const day1 = String(d1.getDate()).padStart(2, "0");
  const y2 = d2.getFullYear();
  const m2 = String(d2.getMonth() + 1).padStart(2, "0");
  const day2 = String(d2.getDate()).padStart(2, "0");
  return { start: `${y1}-${m1}-${day1}`, end: `${y2}-${m2}-${day2}` };
};

export function BookSitterPage() {
  const { sitterId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, dbUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Multi-Stop Stepper State: 1 = Time & Service, 2 = Care Timeline, 3 = Vet & Notes, 4 = Review & Confirm
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  const initialDates = getInitialBookingDates();
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const [hasScheduleConflict, setHasScheduleConflict] = useState(false);
  const [conflictReason, setConflictReason] = useState<string | undefined>();
  const [canForceConfirm, setCanForceConfirm] = useState(false);

  const initialModality = searchParams.get("modality") || "BOARDING";
  const [modality, setModality] = useState(initialModality);
  const [instructions, setInstructions] = useState("");

  // Sitter profile data (loaded dynamically or fallbacks)
  const [sitterInfo, setSitterInfo] = useState<any>(null);

  // Pets state
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPets, setSelectedPets] = useState<number[]>([]);
  const [newPetName, setNewPetName] = useState("");
  const [showQuickAddPet, setShowQuickAddPet] = useState(false);

  // Care Routine & Activity Timeline (Optional - Step 2)
  const [activities, setActivities] = useState<CareActivityItem[]>([]);

  // Vet Release & Day Care Questionnaire (Step 3)
  const [primaryVet, setPrimaryVet] = useState("Central Animal Hospital (Dr. Miller)");
  const [emergencyVet, setEmergencyVet] = useState("24/7 Metropolitan Veterinary Emergency");
  const [authSpend, setAuthSpend] = useState("500");
  const [signed, setSigned] = useState(true);

  // Day Care Specific Questionnaire (Required if modality === 'DAY_CARE')
  const [dayCareLocation, setDayCareLocation] = useState("");
  const [dayCareLandmark, setDayCareLandmark] = useState("");
  const [dayCareHomeType, setDayCareHomeType] = useState("Single-Family House / Fenced Yard");
  const [dayCareFencedYard, setDayCareFencedYard] = useState("Yes - Fully Enclosed Fenced Yard");
  const [dayCareDropOffContact, setDayCareDropOffContact] = useState("");
  const [dayCareOtherInfo, setDayCareOtherInfo] = useState(""); // optional other else to know

  // Quote State
  const [quote, setQuote] = useState<any>(null);
  const [quoting, setQuoting] = useState(false);
  const [meetAndGreetDone, setMeetAndGreetDone] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "STRIPE">("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showCoffeeModal, setShowCoffeeModal] = useState(false);
  const [coffeeVerified, setCoffeeVerified] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [createdBookingId, setCreatedBookingId] = useState<number | null>(null);

  // Global Currency Localization (Default: Philippine Pesos ₱)
  const { formatPrice, currencyConfig } = useCurrency();

  // Fetch Sitter Details
  useEffect(() => {
    if (!sitterId) return;
    const fetchSitter = async () => {
      try {
        const res = await fetch(`/api/sitters/${sitterId}`);
        if (res.ok) {
          const data = await res.json();
          setSitterInfo(data);
          if (Array.isArray(data.rateCards) && data.rateCards.length > 0) {
            const hasCurrent = data.rateCards.some((rc: any) => rc.modality === modality);
            if (!hasCurrent) {
              setModality(data.rateCards[0].modality);
            }
          }
        } else {
          // Fallback mock info
          setSitterInfo({
            name: `Professional Caregiver #${sitterId}`,
            rating: 4.95,
            reviewsCount: 38,
            location: "Metro Area",
            bio: "Certified pet lover with 8+ years experience, CPR/First-Aid trained.",
          });
        }
      } catch (e) {
        setSitterInfo({
          name: `Verified Sitter #${sitterId}`,
          rating: 4.9,
          reviewsCount: 24,
          location: "Downtown",
        });
      }
    };
    fetchSitter();
  }, [sitterId]);

  // Fetch Owner's Pets
  useEffect(() => {
    if (!user) return;
    const fetchPets = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/pets", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPets(data);
          if (data.length > 0) {
            setSelectedPets([data[0].id]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch pets", e);
      }
    };
    fetchPets();
  }, [user]);

  // Handle Quick Add Pet if user has none
  const handleCreateQuickPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPetName.trim() || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/pets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newPetName.trim(),
          type: "DOG",
          breed: "Companion",
          age: 3,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setPets((prev) => [...prev, created]);
        setSelectedPets((prev) => [...prev, created.id]);
        setNewPetName("");
        setShowQuickAddPet(false);
        toast({ title: "Pet Added", description: `${created.name} added to profile!`, type: "success" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to add pet.", type: "error" });
    }
  };

  // Recalculate quote whenever schedule, modality, or pets change
  useEffect(() => {
    if (!user || !startDate || !endDate || !startTime || !endTime) return;
    const timeout = setTimeout(() => {
      fetchQuote();
    }, 400);
    return () => clearTimeout(timeout);
  }, [startDate, endDate, startTime, endTime, modality, selectedPets, user]);

  const fetchQuote = async () => {
    setQuoting(true);
    try {
      const token = await user!.getIdToken();
      const start = new Date(`${startDate}T${startTime}:00`).toISOString();
      const end = new Date(`${endDate}T${endTime}:00`).toISOString();

      const res = await fetch("/api/pricing/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sitterId: Number(sitterId) || 1,
          modality,
          startTime: start,
          endTime: end,
          petIds: selectedPets,
          isHoliday: false,
          isRushHour: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setQuote(data);
      } else {
        // Fallback calculation in case of quote endpoint glitch
        setQuote({
          appliedRates: { baseRateApplied: 65000 },
          totals: {
            calculatedBaseTotal: 65000,
            calculatedOwnerFee: 3250,
            calculatedTotalOwnerCharge: 68250,
          },
        });
      }
    } catch (e) {
      console.error("Quote fetch error:", e);
    } finally {
      setQuoting(false);
    }
  };

  // Step 1 Validation & Next
  const handleProceedToCareTimeline = () => {
    if (!user) {
      setAuthModalOpen(true);
      toast({ 
        title: "Account Required to Book", 
        description: "You must create an account using our form or sign in with Google to book.", 
        type: "info" 
      });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: "Dates Required", description: "Please select start and end dates.", type: "error" });
      return;
    }
    const start = new Date(`${startDate}T${startTime}:00`);
    const end = new Date(`${endDate}T${endTime}:00`);
    if (end <= start) {
      toast({ title: "Invalid Times", description: "End time must be after start time.", type: "error" });
      return;
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 2 Validation & Next
  const handleProceedToCareNotes = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 3 Validation & Next
  const handleProceedToReview = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    // If modality is Day Care, validate the required house location and drop-off info
    if (modality === "DAY_CARE" || modality === "Day Care" || modality === "DAYCARE") {
      if (!dayCareLocation.trim()) {
        toast({ 
          title: "House Location Required for Day Care", 
          description: "Please specify the house address / location where the day care drop-off or service will take place.", 
          type: "error" 
        });
        return;
      }
    }
    if (!signed) {
      toast({ title: "Agreement Required", description: "Please acknowledge the Platform Terms & Limitation of Liability waiver.", type: "error" });
      return;
    }
    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 4: Submit Final Booking
  const handleBookingSubmit = async (force: boolean = false) => {
    if (!user) {
      setAuthModalOpen(true);
      toast({ 
        title: "Account Required", 
        description: "You must create an account or sign in with Google to complete your booking.", 
        type: "error" 
      });
      return;
    }
    if (hasScheduleConflict && !force) {
      toast({
        title: "Double-Booking Conflict",
        description: conflictReason || "The sitter has another reservation at this time. Please change dates or click Proceed Anyway.",
        type: "error",
      });
      setCanForceConfirm(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const start = new Date(`${startDate}T${startTime}:00`).toISOString();
      const end = new Date(`${endDate}T${endTime}:00`).toISOString();

      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sitterId: Number(sitterId) || 1,
          modality,
          startTime: start,
          endTime: end,
          petIds: selectedPets,
          paymentMethod,
          activities,
          forceConfirm: force,
          houseLocationAddress: dayCareLocation.trim() || undefined,
          houseLocationDetails: {
            landmark: dayCareLandmark.trim(),
            homeType: dayCareHomeType,
            fencedYard: dayCareFencedYard,
            dropOffContact: dayCareDropOffContact.trim(),
          },
          intakeQuestionnaire: {
            isDayCare: modality === "DAY_CARE" || modality === "Day Care" || modality === "DAYCARE",
            dayCareLocation: dayCareLocation.trim(),
            landmark: dayCareLandmark.trim(),
            homeType: dayCareHomeType,
            fencedYard: dayCareFencedYard,
            dropOffContact: dayCareDropOffContact.trim(),
            optionalSitterNotes: dayCareOtherInfo.trim() || instructions.trim(),
            primaryVet,
            emergencyVet
          }
        }),
      });

      if (!bookingRes.ok) {
        const errorData = await bookingRes.json().catch(async () => ({ error: await bookingRes.text() }));
        if (bookingRes.status === 409 && errorData.canForceConfirm) {
          setCanForceConfirm(true);
        }
        throw new Error(errorData.error || "Failed to create booking");
      }

      const bookingData = await bookingRes.json();
      const bId = bookingData.booking.id;
      setCreatedBookingId(bId);

      // Instant confirmation for cash or confirmed bookings
      if (paymentMethod === "CASH" || bookingData.confirmed) {
        toast({
          title: "Booking Confirmed! 🎉",
          description: "Your reservation is confirmed! You can pay cash directly to your sitter upon service.",
          type: "success",
        });
        navigate(`/bookings/${bId}/confirmation`);
        return;
      }

      // Stripe Card Flow
      try {
        const intentRes = await fetch(`/api/payments/${bId}/intent`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!intentRes.ok) {
          throw new Error("Stripe checkout unavailable");
        }

        const intentData = await intentRes.json();
        if (intentData.isCashMode || !intentData.clientSecret) {
          toast({
            title: "Booking Confirmed!",
            description: "Online processing is currently in Cash mode. Your booking is confirmed!",
            type: "success",
          });
          navigate(`/bookings/${bId}/confirmation`);
          return;
        }

        setClientSecret(intentData.clientSecret);
        setShowPaymentModal(true);
      } catch (stripeErr) {
        // Fallback to Cash automatically
        await fetch(`/api/payments/${bId}/cash-confirm`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        toast({
          title: "Booking Confirmed via Cash",
          description: "Stripe card gateway was bypassed. Your reservation is confirmed with Cash on Service.",
          type: "success",
        });
        navigate(`/bookings/${bId}/confirmation`);
      }
    } catch (err: any) {
      console.error("Booking error:", err);
      toast({ title: "Booking Notice", description: err.message || "Failed to confirm booking.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, title: "Time & Service", desc: "Dates, times & pets" },
    { num: 2, title: "Care Timeline", desc: "Activities (Optional)", optional: true },
    { num: 3, title: "Care Notes & Terms", desc: "Notes & liability waiver" },
    { num: 4, title: "Review & Confirm", desc: "Summary & payment" },
  ];

  const modalityLabel = {
    BOARDING: "Boarding (at sitter's home)",
    HOUSE_SITTING: "House Sitting (at your home)",
    DROP_IN: "Drop-In Visit",
    DAY_CARE: "Day Care",
    DOG_WALKING: "Dog Walking",
  }[modality] || modality;

  // Pet Sitter Role Restriction: Cannot book other sitters
  if (dbUser?.role === "PET_SITTER") {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900">Booking Disabled for Pet Sitters</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            As a registered Pet Sitter, your account is configured to receive and fulfill care bookings from pet owners rather than booking other sitters.
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Top Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
              Verified Reservation Flow
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Book Pet Care with {sitterInfo?.name || `Sitter #${sitterId}`}
            </h1>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5 self-start md:self-auto bg-slate-100 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>PawShield Guarantee Protected</span>
          </div>
        </div>
      </div>

      {/* Auth Gate Banner if not signed in */}
      {!user && (
        <div className="mb-8 p-5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base">Account Required to Book Caregivers</h3>
              <p className="text-xs text-amber-100 mt-0.5">
                To guarantee pet safety and escrow insurance, you must sign in with Google or create an account using our registration form.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-amber-50 text-slate-900 font-bold text-xs rounded-2xl shadow-md transition-all shrink-0 active:scale-95"
          >
            Create Account / Sign In
          </button>
        </div>
      )}

      {/* MULTI-STOP PROGRESS BAR */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <div className="flex items-center justify-between relative">
          {/* Connecting Background Line */}
          <div className="absolute left-6 right-6 top-5 h-1 bg-slate-100 -z-0" />
          {/* Filled Progress Line */}
          <div 
            className="absolute left-6 top-5 h-1 bg-emerald-500 transition-all duration-300 -z-0"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />

          {stepsList.map((step) => {
            const isCompleted = step.num < currentStep;
            const isActive = step.num === currentStep;

            return (
              <button
                key={step.num}
                type="button"
                onClick={() => {
                  // Allow jumping to any previously completed step or current step
                  if (step.num < currentStep) {
                    setCurrentStep(step.num);
                  }
                }}
                disabled={step.num > currentStep}
                className={`relative z-10 flex flex-col items-center text-center transition-all ${
                  step.num <= currentStep ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200 shadow-sm ${
                    isCompleted
                      ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                      : isActive
                      ? "bg-slate-900 text-white ring-4 ring-slate-200 scale-105"
                      : "bg-white border-2 border-slate-300 text-slate-400"
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : step.num}
                </div>
                <div className="mt-2 hidden sm:block">
                  <span className={`text-xs font-bold block ${isActive ? "text-slate-900" : isCompleted ? "text-emerald-800" : "text-slate-500"}`}>
                    {step.title}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{step.desc}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Mobile Step Title Label */}
        <div className="mt-4 pt-3 border-t border-slate-100 sm:hidden flex items-center justify-between text-xs">
          <span className="text-slate-500">Step {currentStep} of {totalSteps}:</span>
          <span className="font-bold text-slate-900">{stepsList[currentStep - 1].title}</span>
        </div>
      </div>

      {/* Meet & Greet Recommendation Banner */}
      {!meetAndGreetDone && currentStep === 1 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3 items-start">
          <Info className="text-amber-600 w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-bold">First time booking this sitter?</strong> We recommend confirming key details and schedules. A free Meet & Greet can also be scheduled anytime.
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Step Views (Left Area) */}
        <div className="flex-1 space-y-6">

          {/* ========================================================================= */}
          {/* STOP 1: TIME & SERVICE                                                    */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    1. Choose Service & Preferred Dates
                  </h2>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Step 1 of 4
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Modality Selector */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Service Type
                    </label>
                    <select
                      value={modality}
                      onChange={(e) => setModality(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {sitterInfo?.rateCards && sitterInfo.rateCards.length > 0 ? (
                        sitterInfo.rateCards.map((rc: any) => {
                          const labels: Record<string, string> = {
                            BOARDING: "Boarding (at sitter's home)",
                            HOUSE_SITTING: "House Sitting (at your home)",
                            DROP_IN: "Drop-In Visit (30-60 min)",
                            DAY_CARE: "Day Care (Full day)",
                            DOG_WALKING: "Dog Walking (30 min)",
                          };
                          return (
                            <option key={rc.modality} value={rc.modality}>
                              {labels[rc.modality] || rc.modality}
                            </option>
                          );
                        })
                      ) : (
                        <>
                          <option value="BOARDING">Boarding (at sitter's home)</option>
                          <option value="HOUSE_SITTING">House Sitting (at your home)</option>
                          <option value="DROP_IN">Drop-In Visit (30-60 min)</option>
                          <option value="DAY_CARE">Day Care (Full day)</option>
                          <option value="DOG_WALKING">Dog Walking (30 min)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Pet Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Pets Included
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddPet(!showQuickAddPet)}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        + Add Pet
                      </button>
                    </div>

                    {showQuickAddPet ? (
                      <form onSubmit={handleCreateQuickPet} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          required
                          value={newPetName}
                          onChange={(e) => setNewPetName(e.target.value)}
                          placeholder="Pet name (e.g. Bella)"
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                        >
                          Save
                        </button>
                      </form>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {pets.length === 0 ? (
                        <div className="w-full p-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                          <p className="text-xs text-slate-500">No pets saved yet.</p>
                          <button
                            type="button"
                            onClick={() => setShowQuickAddPet(true)}
                            className="text-xs font-bold text-emerald-600 mt-1"
                          >
                            + Quick Add Pet Name
                          </button>
                        </div>
                      ) : (
                        pets.map((pet, index) => (
                          <button
                            key={pet.id ? `pet-${pet.id}` : `pet-idx-${index}-${pet.name}`}
                            type="button"
                            onClick={() => {
                              setSelectedPets((prev) =>
                                prev.includes(pet.id)
                                  ? prev.filter((id) => id !== pet.id)
                                  : [...prev, pet.id]
                              );
                            }}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2 ${
                              selectedPets.includes(pet.id)
                                ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm ring-1 ring-emerald-300"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {pet.photoUrl ? (
                              <img 
                                src={pet.photoUrl} 
                                alt={pet.name} 
                                className="w-5 h-5 rounded-full object-cover border border-slate-200" 
                              />
                            ) : (
                              <PawPrint className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>{pet.name} ({pet.type || "Dog"}{pet.weight ? ` · ${pet.weight}kg` : ""})</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Calendar & Conflict Checker */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">Select Date Range & Preferred Hours</h3>
                    <p className="text-xs text-slate-500">
                      The calendar checks sitter availability in real-time to avoid double-bookings.
                    </p>
                  </div>

                  <DynamicTripCalendar
                    sitterId={sitterId || "1"}
                    startDate={startDate}
                    endDate={endDate}
                    startTime={startTime}
                    endTime={endTime}
                    onDateChange={(sDate, eDate) => {
                      setStartDate(sDate);
                      setEndDate(eDate);
                    }}
                    onTimeChange={(sTime, eTime) => {
                      setStartTime(sTime);
                      setEndTime(eTime);
                    }}
                    onConflictChange={(conflict, reason) => {
                      setHasScheduleConflict(conflict);
                      setConflictReason(reason);
                    }}
                    modality={modality}
                  />
                </div>

                {/* Conflict Notice */}
                {hasScheduleConflict && (
                  <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-xs text-rose-900">Sitter Has an Existing Booking</h5>
                      <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                        {conflictReason || "This slot overlaps with another reservation. You can select another open time slot on the calendar, or proceed if you are testing."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Bottom Navigation for Step 1 */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Next Stop:</span> Care Routine & Activity Timeline (Optional)
                  </div>
                  <button
                    type="button"
                    onClick={handleProceedToCareTimeline}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    Continue to Care Timeline <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STOP 2: CARE SCHEDULE & ACTIVITY TIMELINE (OPTIONAL)                      */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-emerald-600" />
                      2. Care Schedule & Activity Timeline
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Schedule meals, walks, potty breaks, and medications for {startDate} to {endDate}.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Step 2 of 4 (Optional)
                  </span>
                </div>

                {/* Timeline Component */}
                <BookingActivityTimeline
                  activities={activities}
                  onChange={setActivities}
                  preferredStartTime={startTime}
                  preferredEndTime={endTime}
                  startDate={startDate}
                  endDate={endDate}
                  pets={pets}
                />

                {/* Bottom Navigation for Step 2 */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Time & Service
                  </button>

                  <div className="flex items-center gap-3">
                    {activities.length === 0 && (
                      <button
                        type="button"
                        onClick={handleProceedToCareNotes}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
                      >
                        Skip for now
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleProceedToCareNotes}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      Continue to Care Notes & Terms <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STOP 3: CARE NOTES & PLATFORM LIABILITY WAIVER                            */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    3. Pet Care Notes & Platform Agreement
                  </h2>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Step 3 of 4
                  </span>
                </div>

                {/* Practical Care Notes & Day Care Specific Intake Questionnaire */}
                <div className="space-y-5 mb-6">
                  {/* Day Care Specific Questionnaire Section */}
                  {(modality === "DAY_CARE" || modality === "Day Care" || modality === "DAYCARE") && (
                    <div className="bg-amber-50/70 border-2 border-amber-300/80 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
                        <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                          <Home className="w-4 h-4 text-amber-700" /> Day Care Location & Drop-Off Questionnaire (Required)
                        </h3>
                        <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-full">
                          Required for Day Care
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-700" />
                            House / Drop-off Location Address *
                          </label>
                          <input
                            type="text"
                            required
                            value={dayCareLocation}
                            onChange={(e) => setDayCareLocation(e.target.value)}
                            placeholder="e.g. 142 Acacia Avenue, Bel-Air Village, Makati City, Metro Manila"
                            className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-1">
                            Nearby Landmark / Gate Instructions
                          </label>
                          <input
                            type="text"
                            value={dayCareLandmark}
                            onChange={(e) => setDayCareLandmark(e.target.value)}
                            placeholder="e.g. Near clubhouse gate, guard requires ID deposit"
                            className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-1">
                            Drop-Off / Pick-Up Authorized Contact Phone
                          </label>
                          <input
                            type="text"
                            value={dayCareDropOffContact}
                            onChange={(e) => setDayCareDropOffContact(e.target.value)}
                            placeholder="e.g. 0917-888-4321 (Owner Mobile)"
                            className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-1">
                            Residence Type
                          </label>
                          <select
                            value={dayCareHomeType}
                            onChange={(e) => setDayCareHomeType(e.target.value)}
                            className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="Single-Family House / Fenced Yard">Single-Family House / Fenced Yard</option>
                            <option value="Townhouse / Gated Compound">Townhouse / Gated Compound</option>
                            <option value="Condominium / High-Rise (Pet Friendly)">Condominium / High-Rise (Pet Friendly)</option>
                            <option value="Sitter Home Day Care (Host Residence)">Sitter Home Day Care (Host Residence)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-1">
                            Yard & Perimeter Enclosure
                          </label>
                          <select
                            value={dayCareFencedYard}
                            onChange={(e) => setDayCareFencedYard(e.target.value)}
                            className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="Yes - Fully Enclosed Fenced Yard">Yes - Fully Enclosed Fenced Yard</option>
                            <option value="Balcony / Secured Terrace Only">Balcony / Secured Terrace Only</option>
                            <option value="Indoor Play Area Only (Leash Outdoors)">Indoor Play Area Only (Leash Outdoors)</option>
                            <option value="No Outdoor Yard">No Outdoor Yard</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Home Access & Pet Care Instructions
                    </label>
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      rows={2}
                      placeholder="e.g. Lockbox code #4821 by front porch; feeds at 7:30 AM & 6 PM; likes sleeping in living room; afraid of fireworks."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Other Things for Sitter to Know (Optional)
                    </label>
                    <textarea
                      value={dayCareOtherInfo}
                      onChange={(e) => setDayCareOtherInfo(e.target.value)}
                      rows={2}
                      placeholder="e.g. Bring extra leash, allergic to chicken treats, loves tummy rubs after 3 PM walk..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        Emergency Backup Contact (Friend / Relative)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Maria Santos (0917-555-0192)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Preferred Local Vet Clinic (Reference Only)
                      </label>
                      <input
                        type="text"
                        value={primaryVet}
                        onChange={(e) => setPrimaryVet(e.target.value)}
                        placeholder="e.g. Animal Care Clinic (optional info for sitter)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Platform Non-Liability & Anti-Scam Protection Warning */}
                <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-5 mb-6 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>PawShield Platform Disclaimer & Limitation of Liability</span>
                  </div>

                  <div className="space-y-2 text-xs text-amber-950 leading-relaxed">
                    <p>
                      <strong>1. No Insurance Provided:</strong> PawShield is an independent introductory marketplace connecting pet owners with local sitters. PawShield does NOT sell, provide, or underwrite veterinary insurance, health coverage, or damage insurance policies.
                    </p>
                    <p>
                      <strong>2. Zero Platform Liability for Damages or Loss:</strong> PawShield and its operating company assume NO responsibility or liability for any pet illness, injury, death, loss, property damage, accidents, or theft occurring during or outside of any booking. Pet owners and sitters contract independently and assume all associated risks.
                    </p>
                    <p>
                      <strong>3. Social Engineering, Phishing & Anti-Scam Warning:</strong> PawShield will NEVER call, email, or message you asking for credit card OTPs, banking PINs, or wire transfers. The platform assumes zero liability for off-platform arrangements, external cash transfers, or social engineering scams conducted outside this application.
                    </p>
                  </div>
                </div>

                {/* Required Checkbox Agreement */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="sign"
                    checked={signed}
                    onChange={(e) => setSigned(e.target.checked)}
                    className="mt-1 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="sign" className="text-xs text-slate-700 cursor-pointer leading-relaxed">
                    <strong>Platform Terms & Waiver Agreement:</strong> I acknowledge that PawShield is an introductory platform that does NOT provide insurance and assumes NO liability for pet injuries, veterinary expenses, property loss/damages, off-platform communications, or social engineering scams.
                  </label>
                </div>

                {/* Bottom Navigation for Step 3 */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(2);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Care Timeline
                  </button>

                  <button
                    type="button"
                    onClick={handleProceedToReview}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    Review & Confirm Reservation <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STOP 4: REVIEW & CONFIRM                                                  */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    4. Review Reservation & Confirm
                  </h2>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Final Step
                  </span>
                </div>

                {/* Review Cards Grid */}
                <div className="space-y-4">
                  {/* Service & Sitter Summary */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base">
                        {sitterInfo?.name ? sitterInfo.name[0] : "S"}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{sitterInfo?.name || `Sitter #${sitterId}`}</h4>
                        <p className="text-xs text-slate-500">{modalityLabel}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs font-bold text-emerald-700 hover:underline self-end sm:self-auto"
                    >
                      Edit Service
                    </button>
                  </div>

                  {/* Dates & Preferred Hours */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Trip Dates & Times
                      </span>
                      <div className="text-xs text-slate-800 space-y-0.5">
                        <p className="font-semibold">
                          {startDate} ({startTime}) → {endDate} ({endTime})
                        </p>
                        <p className="text-slate-500">
                          Preferred drop-off {startTime} • Pick-up {endTime}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      Change Dates
                    </button>
                  </div>

                  {/* Scheduled Care Timeline Summary */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Care Routine Timeline ({activities.length} Scheduled)
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        Edit Timeline
                      </button>
                    </div>

                    {activities.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">
                        Standard customary care requested. Sitter will provide daily feedings, walks, and check-ins.
                      </p>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        {activities.map((act) => (
                          <div key={act.id} className="flex items-center justify-between text-xs py-1 px-2.5 bg-white rounded-lg border border-slate-100">
                            <span className="font-medium text-slate-800 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <strong className="text-slate-700">{act.scheduledTime}:</strong> {act.title}
                            </span>
                            {act.isRequired ? (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                Required
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                Optional
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Day Care Intake Summary (If Day Care modality) */}
                  {(modality === "DAY_CARE" || modality === "Day Care" || modality === "DAYCARE") && (
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5 text-amber-700" /> Day Care Location & Drop-off Info
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(3)}
                          className="text-xs font-bold text-amber-800 hover:underline"
                        >
                          Edit Location
                        </button>
                      </div>
                      <div className="text-xs text-slate-800 space-y-1 bg-white p-3 rounded-lg border border-amber-200/80">
                        <p><strong>House / Drop-off Location:</strong> {dayCareLocation || "Not specified"}</p>
                        {dayCareLandmark && <p><strong>Landmark / Gate Instructions:</strong> {dayCareLandmark}</p>}
                        <p><strong>Residence & Yard:</strong> {dayCareHomeType} ({dayCareFencedYard})</p>
                        {dayCareDropOffContact && <p><strong>Drop-off Contact Phone:</strong> {dayCareDropOffContact}</p>}
                        {dayCareOtherInfo && <p><strong>Sitter Notes:</strong> {dayCareOtherInfo}</p>}
                      </div>
                    </div>
                  )}

                  {/* Platform Terms & Non-Liability Status */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">Platform Terms & Safe Care Waiver</span>
                      <span className="text-slate-500">
                        Agreed: PawShield provides no insurance and accepts zero liability for damages, pet health, or off-platform scams.
                      </span>
                    </div>
                    <span className="text-emerald-700 font-bold flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-4 h-4" /> Agreed
                    </span>
                  </div>
                </div>

                {/* Schedule Conflict Retry Alert */}
                {hasScheduleConflict && (
                  <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h5 className="font-bold text-xs text-rose-900">Schedule Overlap Detected</h5>
                        <p className="text-xs text-rose-800 mt-1">
                          {conflictReason || "This sitter already has another booking during this window."}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 text-xs font-bold rounded-lg hover:bg-rose-50"
                          >
                            Change Dates / Times
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBookingSubmit(true)}
                            className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 shadow-sm"
                          >
                            Proceed & Confirm Anyway
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Back Button */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(3);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Care Notes & Terms
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowVerificationModal(true)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Verify Details & Place Booking
                  </button>
                </div>
              </section>
            </div>
          )}

        </div>

        {/* Right Col: Cost Summary & Final Payment */}
        <div className="w-full lg:w-[380px] flex-shrink-0">
          <div className="sticky top-24 bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-slate-900">Cost Summary</h3>
              <CurrencySelector variant="compact" />
            </div>

            {quoting ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
              </div>
            ) : quote ? (
              <div className="space-y-3.5 text-xs text-slate-600">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <span>
                    Base Rate (
                    {quote.appliedRates?.baseRateApplied
                      ? formatPrice(quote.appliedRates.baseRateApplied / 100, "PHP")
                      : formatPrice(450, "PHP")}
                    /unit)
                  </span>
                  <span className="text-slate-900 font-semibold">
                    {formatPrice(
                      (quote.totals?.calculatedBaseTotal ?? quote.subtotalBase ?? 45000) /
                        (quote.totals ? 100 : 1),
                      "PHP"
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <span className="flex items-center gap-1">
                    Platform Fee <Info className="w-3 h-3 text-slate-400" />
                  </span>
                  <span className="text-slate-900 font-semibold">
                    {formatPrice(
                      (quote.totals?.calculatedOwnerFee ?? quote.ownerFee ?? 2250) /
                        (quote.totals ? 100 : 1),
                      "PHP"
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 text-base font-bold text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-emerald-700 text-lg font-extrabold">
                    {formatPrice(
                      (quote.totals?.calculatedTotalOwnerCharge ?? quote.totalOwnerCharge ?? 47250) /
                        (quote.totals ? 100 : 1),
                      "PHP"
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">
                Select dates and times to view exact rates.
              </p>
            )}

            {/* Payment Method Selector */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Payment Method
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    paymentMethod === "CASH"
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      paymentMethod === "CASH" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">Cash on Service</span>
                      <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Pay directly upon visit. Instant confirmation.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("STRIPE")}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    paymentMethod === "STRIPE"
                      ? "border-blue-500 bg-blue-50/70 text-blue-950 shadow-sm ring-2 ring-blue-500/20"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      paymentMethod === "STRIPE" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">Credit Card</span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        Stripe Escrow
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Held securely in platform escrow.
                    </p>
                  </div>
                </button>

                {/* Buy Me A Coffee Manual / Cash Support Card */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-[11px] text-amber-900 font-medium">
                      {paymentMethod === "CASH" ? "Cash slot guaranteed with ₱150 coffee" : "Support sitter with a coffee (₱150)"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCoffeeModal(true)}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    ☕ {coffeeVerified ? "Verified ✓" : "Trigger Coffee"}
                  </button>
                </div>
              </div>
            </div>

            {/* Stepper Progress Enforcement: Step 1 -> 2 -> 3 -> 4 */}
            <div className="mt-6">
              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={handleProceedToCareTimeline}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs"
                >
                  <span>Continue to Care Routine (Step 2 of 4)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={handleProceedToCareNotes}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs"
                >
                  <span>Continue to Care Notes & Terms (Step 3 of 4)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {currentStep === 3 && (
                <button
                  type="button"
                  onClick={handleProceedToReview}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs"
                >
                  <span>Continue to Review & Confirm (Step 4 of 4)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {/* ONLY ON STEP 4: Trigger Review & Confirmation Modal */}
              {currentStep === 4 && (
                <button
                  type="button"
                  onClick={() => setShowVerificationModal(true)}
                  disabled={isSubmitting}
                  className={`w-full py-3.5 font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-white disabled:opacity-50 text-xs ${
                    hasScheduleConflict && !canForceConfirm
                      ? "bg-rose-600 hover:bg-rose-700"
                      : paymentMethod === "CASH"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                      : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {isSubmitting ? (
                    <span>Confirming Reservation...</span>
                  ) : hasScheduleConflict && !canForceConfirm ? (
                    <span>⚠️ Conflict Detected (Review Step 1)</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify Details & Confirm Booking</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-center text-[11px] text-slate-500 mt-3 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {currentStep < 4
                ? `Step ${currentStep} of 4: Complete all steps to confirm`
                : "Verify all details before placing booking"}
            </p>
          </div>
        </div>
      </div>

      {/* Booking Verification & Review Modal */}
      <BookingVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onConfirm={async () => {
          setShowVerificationModal(false);
          if (paymentMethod === "CASH" && !coffeeVerified) {
            try {
              const bmcRes = await fetch("/api/buy-me-coffee/config");
              const bmcData = await bmcRes.json();
              if (bmcData.requireForCash || bmcData.manualTriggerOverride) {
                setShowCoffeeModal(true);
                return;
              }
            } catch (e) {}
          }
          await handleBookingSubmit(canForceConfirm);
        }}
        sitterName={sitterInfo?.name || `Sitter #${sitterId}`}
        modality={modalityLabel}
        startDate={startDate}
        endDate={endDate}
        startTime={startTime}
        endTime={endTime}
        petsCount={selectedPets.length}
        primaryVet={primaryVet}
        emergencyVet={emergencyVet}
        authSpend={authSpend === "unlimited" ? "Unlimited" : formatPrice(Number(authSpend) || 500, "PHP")}
        paymentMethod={paymentMethod}
        totalAmountFormatted={formatPrice(
          (quote?.totals?.calculatedTotalOwnerCharge ?? quote?.totalOwnerCharge ?? 47250) /
            (quote?.totals ? 100 : 1),
          "PHP"
        )}
        baseRateFormatted={formatPrice(
          (quote?.totals?.calculatedBaseTotal ?? quote?.subtotalBase ?? 45000) /
            (quote?.totals ? 100 : 1),
          "PHP"
        )}
        feeFormatted={formatPrice(
          (quote?.totals?.calculatedOwnerFee ?? quote?.ownerFee ?? 2250) /
            (quote?.totals ? 100 : 1),
          "PHP"
        )}
        scheduledActivitiesCount={activities.length}
        instructions={instructions}
        isSubmitting={isSubmitting}
      />

      {/* Buy Me A Coffee Cash on Service Verification Modal */}
      <BuyMeCoffeeModal
        isOpen={showCoffeeModal}
        onClose={() => setShowCoffeeModal(false)}
        onVerified={() => {
          setCoffeeVerified(true);
          handleBookingSubmit(canForceConfirm);
        }}
        sitterName={sitterInfo?.name}
      />

      {/* Stripe Payment Modal */}
      {showPaymentModal && clientSecret && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-2">Secure Checkout</h2>
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3 mb-5">
              <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900 leading-relaxed">
                <strong>Platform Escrow:</strong> Funds are held securely and only released to the sitter 48 hours after visit completion.
              </p>
            </div>

            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
              <CheckoutForm bookingId={createdBookingId!} clientSecret={clientSecret} />
            </Elements>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2 text-center">
              <button
                type="button"
                onClick={async () => {
                  setShowPaymentModal(false);
                  const token = await user?.getIdToken();
                  if (createdBookingId) {
                    await fetch(`/api/payments/${createdBookingId}/cash-confirm`, {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    toast({ title: "Switched to Cash", description: "Booking confirmed with Cash on Service!", type: "success" });
                    navigate(`/bookings/${createdBookingId}/confirmation`);
                  }
                }}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold py-1.5 px-3 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                💵 Prefer to pay cash instead? Switch to Cash on Service
              </button>

              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Gate Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title="Sign In to Book Caregiver"
        subtitle="Create an account using our registration form or sign in with Google to reserve your pet caregiver."
      />
    </div>
  );
}

// Sub-component for Stripe Elements
function CheckoutForm({ bookingId, clientSecret }: { bookingId: number; clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/bookings/${bookingId}/confirmation`,
      },
      redirect: "if_required",
    });

    if (error) {
      toast({ title: "Payment Failed", description: error.message || "Something went wrong.", type: "error" });
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      toast({ title: "Booking Confirmed!", description: "Your payment is secured in escrow.", type: "success" });
      navigate(`/bookings/${bookingId}/confirmation`);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />
      <button
        disabled={!stripe || loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
      >
        {loading ? "Processing..." : "Confirm & Authorize Payment"}
      </button>
    </form>
  );
}
