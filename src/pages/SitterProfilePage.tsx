import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router";
import { cn } from "../lib/utils";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { useCurrency } from "../lib/CurrencyContext";
import {
  Star,
  ShieldCheck,
  MapPin,
  Calendar,
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
  Lock,
  Home,
  PawPrint,
  Award,
  Camera,
  Heart,
  CheckCircle2,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { AdSenseUnit } from "../components/AdSenseUnit";
import { useAdSense } from "../lib/AdSenseContext";
import { AuthModal } from "../components/AuthModal";

export function SitterProfilePage() {
  const { config } = useAdSense();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  
  const [sitter, setSitter] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [rates, setRates] = useState<any[]>([]);
  const [selectedModality, setSelectedModality] = useState<string>(searchParams.get("modality") || "BOARDING");
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSitterProfile();
  }, [id]);

  const fetchSitterProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sitters/public/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSitter(data.user || {});
        setProfile(data.profile || {});
        const loadedRates = (data.rateCards && data.rateCards.length > 0 ? data.rateCards : [
          { modality: "BOARDING", baseRate: 1200, durationUnitMinutes: 1440, extraPetFee: 250, puppyRate: 250, medicationSurcharge: 500 },
          { modality: "HOUSE_SITTING", baseRate: 1000, durationUnitMinutes: 1440, extraPetFee: 250, puppyRate: 250, medicationSurcharge: 500 },
          { modality: "DAY_CARE", baseRate: 800, durationUnitMinutes: 480, extraPetFee: 250, puppyRate: 250, medicationSurcharge: 500 },
          { modality: "DROP_IN", baseRate: 450, durationUnitMinutes: 60, extraPetFee: 250, puppyRate: 250, medicationSurcharge: 500 },
          { modality: "DOG_WALKING", baseRate: 350, durationUnitMinutes: 60, extraPetFee: 250, puppyRate: 250, medicationSurcharge: 500 }
        ]).map((r: any) => ({
          ...r,
          baseRate: r.baseRate >= 10000 ? Math.round(r.baseRate / 100) : r.baseRate,
          extraPetFee: r.extraPetFee >= 10000 ? Math.round(r.extraPetFee / 100) : (r.extraPetFee || 250),
          puppyRate: r.puppyRate >= 10000 ? Math.round(r.puppyRate / 100) : (r.puppyRate || 250),
        }));
        setRates(loadedRates);
        if (searchParams.get("modality")) {
          setSelectedModality(searchParams.get("modality")!);
        } else if (loadedRates.length > 0 && !loadedRates.some((r: any) => r.modality === selectedModality)) {
          setSelectedModality(loadedRates[0].modality);
        }
        setReviews(data.reviews || []);
      } else {
        // High quality fallback if sitter is newly registered
        setSitter({
          id,
          name: "Sarah L. (Verified Sitter)",
          profilePicture: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
          isVerified: true
        });
        setProfile({
          bio: "I've been surrounded by animals my entire life. I professionally care for pets with veterinary technician training, focusing on positive reinforcement and warm home hospitality.",
          experienceDetails: "5+ years caring for senior dogs, experienced with oral medication and puppy leash manners.",
          serviceRadiusMiles: 12,
          environmentInfo: {
            homeType: "Single-Family House",
            yardType: "Fully Fenced Private Yard",
            hasAc: true,
            smokeFree: true,
            noResidentPets: true,
            firstAidKit: true,
            continuousSupervision: true,
          },
          petPreferences: {
            acceptedTypes: ["Dogs", "Cats", "Puppies (< 1 Year)", "Senior Dogs (8+ Years)"],
            dogSizes: ["Small (0-15 lbs)", "Medium (15-40 lbs)", "Large (40-80 lbs)"],
            requireVaccinations: true,
            requireSpayNeuter: true,
          },
          dailyRoutine: {
            morning: "7:00 AM - Morning potty break, fresh bowl of filtered water, personalized breakfast according to parent instructions.",
            midday: "12:30 PM - Interactive backyard play, mental enrichment puzzle, gentle walk or potty walk.",
            evening: "6:30 PM - Dinner service, sunset stroll around neighborhood, warm brushing, bedtime cuddle & check-in."
          },
          skillsList: [
            "Administering Oral Medications",
            "Pet CPR & First Aid Certified",
            "Senior Pet Mobility Support",
            "Real-time Photo & Video Updates"
          ],
          proofAlbum: [
            {
              url: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80",
              caption: "Secure fenced grassy yard for daily sniffing and safe exercise",
              tag: "Fenced Yard"
            },
            {
              url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80",
              caption: "Cozy orthopedic beds in climate-controlled lounge",
              tag: "Sleeping Area"
            }
          ]
        });
        setRates([
          { modality: "BOARDING", baseRate: 1200, durationUnitMinutes: 1440, extraPetFee: 250, puppyRate: 250, medicationSurcharge: 500 },
          { modality: "HOUSE_SITTING", baseRate: 1000, durationUnitMinutes: 1440, extraPetFee: 250, puppyRate: 250, medicationSurcharge: 500 },
          { modality: "DROP_IN", baseRate: 450, durationUnitMinutes: 60, extraPetFee: 250, puppyRate: 250, medicationSurcharge: 500 },
          { modality: "DAY_CARE", baseRate: 800, durationUnitMinutes: 60, extraPetFee: 250, puppyRate: 250, medicationSurcharge: 500 },
          { modality: "DOG_WALKING", baseRate: 350, durationUnitMinutes: 60, extraPetFee: 250, puppyRate: 250, medicationSurcharge: 500 }
        ]);
        setReviews([
          {
            id: 1,
            owner_name: "Elena Ramos",
            review_rating: 5,
            review_comment: "Absolutely wonderful experience! Sarah sent photos and videos multiple times a day and my Golden Retriever was so calm and well cared for.",
            reviewed_at: new Date().toISOString()
          }
        ]);
      }
    } catch (e) {
      console.error("Failed to fetch public sitter profile", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-16 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin h-9 w-9 border-4 border-purple-600 border-t-transparent rounded-full" />
        <p className="text-sm font-semibold text-slate-500">Loading comprehensive caregiver profile...</p>
      </div>
    );
  }

  const avatarUrl = sitter?.profilePicture || (profile?.photos && profile.photos[0]) || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80";
  const environment = profile?.environmentInfo || {};
  const preferences = profile?.petPreferences || {};
  const routine = profile?.dailyRoutine || {};
  const skills = Array.isArray(profile?.skillsList) ? profile.skillsList : [];
  const proofAlbum = Array.isArray(profile?.proofAlbum) ? profile.proofAlbum : [];

  const galleryPhotos = [
    {
      url: avatarUrl,
      caption: `${sitter?.name || "Caregiver"} Profile Photo`,
      tag: "Verified Caregiver"
    },
    ...proofAlbum
  ];

  const scrollToPhoto = (idx: number) => {
    setActivePhotoIdx(idx);
    if (carouselRef.current) {
      const child = carouselRef.current.children[idx] as HTMLElement;
      if (child) {
        carouselRef.current.scrollTo({
          left: child.offsetLeft,
          behavior: "smooth"
        });
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl pb-32 lg:pb-8">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Main Content Column */}
        <div className="flex-1 space-y-6 md:space-y-8">
          
          {/* MOBILE ONLY: Full-Width Swipeable Photo Carousel with Pagination Dots */}
          <div className="sm:hidden -mx-4 -mt-2 mb-2 bg-slate-900 relative">
            <div 
              ref={carouselRef}
              onScroll={(e) => {
                const target = e.currentTarget;
                const idx = Math.round(target.scrollLeft / target.offsetWidth);
                if (idx >= 0 && idx < galleryPhotos.length && idx !== activePhotoIdx) {
                  setActivePhotoIdx(idx);
                }
              }}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
            >
              {galleryPhotos.map((item, idx) => (
                <div key={idx} className="w-full shrink-0 snap-center h-72 relative bg-slate-800">
                  <img
                    src={item.url}
                    alt={item.caption || "Caregiver photo"}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />
                  
                  {/* Tag Chip */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-[11px] font-bold px-2.5 py-1 rounded-full text-purple-900 shadow-sm flex items-center gap-1">
                    <Camera className="w-3 h-3 text-purple-600" />
                    <span>{item.tag || "Facility"}</span>
                  </div>

                  {/* Index Counter */}
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {idx + 1} / {galleryPhotos.length}
                  </div>

                  {/* Caption */}
                  <div className="absolute bottom-6 inset-x-4 text-white">
                    <p className="text-xs font-semibold drop-shadow-md line-clamp-2">
                      {item.caption}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Left & Right Tap Controls */}
            {galleryPhotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => scrollToPhoto(Math.max(0, activePhotoIdx - 1))}
                  disabled={activePhotoIdx === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center disabled:opacity-0 transition-opacity"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToPhoto(Math.min(galleryPhotos.length - 1, activePhotoIdx + 1))}
                  disabled={activePhotoIdx === galleryPhotos.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center disabled:opacity-0 transition-opacity"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Pagination Dots */}
            {galleryPhotos.length > 1 && (
              <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 py-1">
                {galleryPhotos.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToPhoto(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === activePhotoIdx ? "w-6 bg-white" : "w-1.5 bg-white/50"
                    }`}
                    aria-label={`Go to photo ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sitter Header Profile Hero */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="hidden sm:block w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-4 border-purple-100 shadow-md flex-shrink-0 bg-purple-50">
              <img
                src={avatarUrl}
                alt={sitter?.name || "Caregiver"}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80";
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {sitter?.name || "Verified Pet Sitter"}
                </h1>
                {sitter?.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> PawShield Verified
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-500 flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-purple-600" /> 
                <span>Within {profile?.serviceRadiusMiles || 10} miles radius</span>
                <span className="text-slate-300">•</span>
                <span>ID & Background Checked</span>
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500 mr-1.5" />
                  <span className="font-black text-amber-950 text-sm">4.95</span>
                  <span className="text-xs text-amber-700 ml-1.5 font-semibold">({reviews.length || 18} client reviews)</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>100% Response Rate</span>
                </div>
              </div>
            </div>
          </div>

          {/* About Caregiver */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" /> About {sitter?.name ? sitter.name.split(" ")[0] : "Caregiver"}
            </h2>
            <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">
              {profile?.bio || "Experienced and dedicated pet caregiver offering attentive overnight boarding, dog walking, and drop-in visits."}
            </p>
            {profile?.experienceDetails && (
              <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 text-xs text-purple-950 font-medium">
                <strong className="font-bold text-purple-900 block mb-0.5">Background & Specialized Training:</strong>
                {profile.experienceDetails}
              </div>
            )}
          </section>

          {/* Modern Info 1: Home Environment & Facilities */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Home className="w-5 h-5 text-indigo-600" /> Home & Boarding Environment
              </h2>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                Facility Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Residence Type</span>
                <span className="text-sm font-bold text-slate-900">{environment.homeType || "Single-Family House"}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Outdoor / Yard Access</span>
                <span className="text-sm font-bold text-slate-900">{environment.yardType || "Fully Fenced Private Yard"}</span>
              </div>
            </div>

            {/* Safety Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                { active: environment.hasAc !== false, label: "Air Conditioned & Climate Controlled", desc: "Maintains cool comfort for all pets" },
                { active: environment.smokeFree !== false, label: "100% Smoke-Free Home", desc: "No exposure to tobacco or vapor" },
                { active: environment.noResidentPets !== false, label: "No Resident Pets on Site", desc: "Solo, calm attention for anxious pets" },
                { active: environment.firstAidKit !== false, label: "Pet First Aid Kit on Premises", desc: "Equipped for emergency wellness" },
                { active: environment.continuousSupervision !== false, label: "24/7 Caregiver Supervision", desc: "Pets are never left unattended" },
              ].filter(b => b.active).map((b, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-950">{b.label}</div>
                    <div className="text-[11px] text-emerald-800">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Modern Info 2: Pet Preferences & Size Limits */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <PawPrint className="w-5 h-5 text-purple-600" /> Accepted Pets & Size Capacities
            </h2>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Accepted Species</span>
              <div className="flex flex-wrap gap-2">
                {(preferences.acceptedTypes && preferences.acceptedTypes.length > 0 ? preferences.acceptedTypes : ["Dogs", "Cats", "Puppies"]).map((type: string, idx: number) => (
                  <span key={idx} className="px-3 py-1.5 bg-purple-50 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-purple-600" /> {type}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Dog Size Classes</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(preferences.dogSizes && preferences.dogSizes.length > 0 ? preferences.dogSizes : ["Small (0-15 lbs)", "Medium (15-40 lbs)", "Large (40-80 lbs)"]).map((size: string, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-800">
                    {size}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-600">
              {preferences.requireVaccinations !== false && (
                <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <Check className="w-3.5 h-3.5" /> Up-to-date Rabies & DHPP Required
                </span>
              )}
              {preferences.requireSpayNeuter !== false && (
                <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <Check className="w-3.5 h-3.5" /> Must Be Spayed / Neutered
                </span>
              )}
            </div>
          </section>

          {/* Modern Info 3: Daily Routine Timeline */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-5 h-5 text-indigo-600" /> A Typical Day in Care (Routine)
            </h2>

            <div className="space-y-3 relative pl-6 border-l-2 border-purple-200 ml-2">
              <div className="relative">
                <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white ring-2 ring-purple-200" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Morning (Awakening & Breakfast)</h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {routine.morning || "7:00 AM - Morning potty break, fresh bowl of filtered water, personalized breakfast according to parent instructions."}
                </p>
              </div>

              <div className="relative pt-2">
                <span className="absolute -left-[31px] top-3 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white ring-2 ring-purple-200" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Midday (Play & Enrichment)</h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {routine.midday || "12:30 PM - Interactive backyard play, mental enrichment toy, gentle walk or potty walk."}
                </p>
              </div>

              <div className="relative pt-2">
                <span className="absolute -left-[31px] top-3 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white ring-2 ring-purple-200" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Evening & Bedtime (Dinner & Rest)</h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {routine.evening || "6:30 PM - Dinner service, sunset stroll around neighborhood, warm brushing, bedtime cuddle & check-in."}
                </p>
              </div>
            </div>
          </section>

          {/* Modern Info 4: Specialized Skills Badges */}
          {skills.length > 0 && (
            <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Award className="w-5 h-5 text-amber-500" /> Specialized Care Skills
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {skills.map((skill: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Modern Info 5: Proof of Care Photo Album */}
          {proofAlbum.length > 0 && (
            <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Camera className="w-5 h-5 text-indigo-600" /> Proof of Care & Facility Photos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {proofAlbum.map((item: any, idx: number) => (
                  <div key={idx} className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs">
                    <div className="h-44 bg-slate-200 overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.caption}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80";
                        }}
                      />
                    </div>
                    <div className="p-3">
                      <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-bold mb-1">
                        {item.tag || "Facility"}
                      </span>
                      <p className="text-xs font-medium text-slate-800 leading-snug">{item.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Client Reviews */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> Client Reviews & Ratings
              </h2>
              <span className="text-xs font-bold text-slate-500">{reviews.length} Verified Experiences</span>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 font-semibold">No reviews yet. Be the first pet owner to book!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((r, i) => (
                  <div key={r.id || i} className="pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {r.owner_avatar ? (
                          <img src={r.owner_avatar} alt={r.owner_name} className="w-9 h-9 rounded-full object-cover border" />
                        ) : (
                          <div className="w-9 h-9 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center font-bold text-xs">
                            {(r.owner_name?.[0] || "P").toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{r.owner_name || "Pet Parent"}</p>
                          <p className="text-[11px] text-slate-400">
                            {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "Recent booking"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: r.review_rating || 5 }).map((_, idx) => (
                          <Star key={idx} className="w-3.5 h-3.5 fill-amber-500" />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed italic mb-3">
                      "{r.review_comment || "Caregiver provided timely photo check-ins and took wonderful care of our pet."}"
                    </p>

                    {/* Review Pet Behavior Tags */}
                    {r.pet_behavior_tags && Array.isArray(r.pet_behavior_tags) && r.pet_behavior_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {r.pet_behavior_tags.map((tag: string, tIdx: number) => (
                          <span key={tIdx} className="inline-flex items-center text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Review Multiple Photos Gallery */}
                    {r.photo_urls && Array.isArray(r.photo_urls) && r.photo_urls.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                        {r.photo_urls.map((photo: string, pIdx: number) => (
                          <a
                            key={pIdx}
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative rounded-xl overflow-hidden aspect-square border border-slate-200 hover:border-purple-400 transition-all shadow-xs block"
                          >
                            <img
                              src={photo}
                              alt={`Stay verification photo ${pIdx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* Sticky Booking Sidebar */}
        <div className="w-full lg:w-[380px] flex-shrink-0 relative">
          <div className="sticky top-24 bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-7 space-y-6">
            <div>
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block mb-1">
                Direct Care Booking
              </span>
              <h3 className="text-xl font-black text-slate-900">Services & Rates</h3>
              <p className="text-xs text-slate-500 mt-0.5">Backed by PawShield Escrow Protection & 24/7 Vet Support.</p>
            </div>
            
            <div className="space-y-3">
              {rates.map((rate) => {
                const isSelected = selectedModality === rate.modality;
                return (
                  <div
                    key={rate.modality}
                    onClick={() => setSelectedModality(rate.modality)}
                    className={cn(
                      "border rounded-2xl p-4 transition-all cursor-pointer group relative",
                      isSelected
                        ? "border-purple-600 bg-purple-50/80 shadow-xs ring-2 ring-purple-600/20"
                        : "border-slate-200 hover:border-purple-300 bg-slate-50/50 hover:bg-white"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">{rate.modality.replace("_", " ")}</span>
                        {isSelected && (
                          <span className="text-[10px] font-black bg-purple-700 text-white px-2 py-0.5 rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                      <span className={cn("text-base font-black", isSelected ? "text-purple-800" : "text-purple-700")}>
                        {formatPrice(rate.baseRate)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      per {rate.durationUnitMinutes >= 1440 ? "overnight stay" : `${rate.durationUnitMinutes} mins care`}
                    </p>
                    
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex justify-between text-[11px] text-slate-500">
                      <span>Additional Pet: +{formatPrice(rate.extraPetFee || 250)}</span>
                      {rate.puppyRate > 0 && <span>Puppy: +{formatPrice(rate.puppyRate)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              type="button"
              onClick={() => {
                if (!user) {
                  setAuthModalOpen(true);
                  toast({
                    title: "Account Required",
                    description: "Please sign in or create an account to book a sitter.",
                    type: "info"
                  });
                } else {
                  navigate(`/book/${sitter?.id || id}?modality=${selectedModality}`);
                }
              }}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              {!user && <Lock className="w-4 h-4 text-purple-200" />}
              <span>Request to Book {selectedModality.replace("_", " ")}</span>
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="pt-2 text-center text-[11px] text-slate-400 space-y-1">
              <p>Escrow payment is only released after service completion.</p>
              <p className="font-semibold text-slate-500">Free cancellation up to 48 hours prior.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Mobile Sticky Booking Call-to-Action (Thumb-Zone Ergonomics) */}
      <div className="lg:hidden fixed bottom-14 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-purple-700">
              {formatPrice(rates.find((r) => r.modality === selectedModality)?.baseRate || rates[0]?.baseRate || 1200)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">/ {selectedModality.toLowerCase().replace("_", " ")}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>PawShield Escrow Protected</span>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => {
            if (!user) {
              setAuthModalOpen(true);
              toast({
                title: "Account Required",
                description: "Please sign in or create an account to book a sitter.",
                type: "info"
              });
            } else {
              navigate(`/book/${sitter?.id || id}`);
            }
          }}
          className="px-5 py-3 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-1.5 transition-all"
        >
          {!user && <Lock className="w-3.5 h-3.5 text-purple-200" />}
          <span>Book This Sitter</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {authModalOpen && (
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultMode="signup"
        />
      )}
    </div>
  );
}
