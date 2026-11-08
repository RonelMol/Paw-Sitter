import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "./ToastContext";
import { CountryPhoneInput } from "./CountryPhoneInput";
import {
  User,
  Camera,
  Upload,
  Phone,
  Mail,
  MapPin,
  Save,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Building2,
  MessageSquare,
  Calendar,
  ExternalLink,
  Image,
  AlertCircle,
  Home,
  Clock,
  Award,
  PawPrint,
  Plus,
  Trash2,
  Check,
  ShieldAlert,
  Info
} from "lucide-react";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80"
];

const SKILL_OPTIONS = [
  { id: "oral_meds", label: "Administering Oral Medications" },
  { id: "inject_meds", label: "Injectable Medications / Insulin Care" },
  { id: "cpr_certified", label: "Pet CPR & First Aid Certified" },
  { id: "senior_care", label: "Senior Pet & Mobility Support" },
  { id: "puppy_training", label: "Puppy Socialization & Leash Training" },
  { id: "separation_anxiety", label: "Separation Anxiety Experience" },
  { id: "daily_updates", label: "Real-time Photo & Video Updates" },
  { id: "raw_food", label: "Special Diet & Raw Food Prep" },
];

const HOME_TYPES = ["Single-Family House", "Townhouse", "Apartment / Condominium", "Rural / Farm Acreage"];
const YARD_TYPES = ["Fully Fenced Private Yard", "Partially Fenced Yard", "Open Garden / Balcony", "Walking Trails / No Yard"];

interface SitterProfileEditorProps {
  onSaved?: () => void;
  showNavigationShortcuts?: boolean;
}

export function SitterProfileEditor({ onSaved, showNavigationShortcuts = true }: SitterProfileEditorProps) {
  const { user, dbUser, refreshUser, updateUserDbState } = useAuth();
  const { toast } = useToast();

  // Name split: First, Middle, Last
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Phone with Country format validation
  const [phone, setPhone] = useState(dbUser?.phone || "");
  const [countryCode, setCountryCode] = useState(dbUser?.countryCode || "+63");
  const [isPhoneValid, setIsPhoneValid] = useState(true);

  // Bio & Basics
  const [bio, setBio] = useState("");
  const [experienceDetails, setExperienceDetails] = useState("");
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState(10);
  const [profilePicture, setProfilePicture] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  // Modern Info 1: Proof & Care Photo Album
  const [proofAlbum, setProofAlbum] = useState<Array<{ url: string; caption: string; tag: string }>>([]);
  const [newProofUrl, setNewProofUrl] = useState("");
  const [newProofCaption, setNewProofCaption] = useState("");
  const [newProofTag, setNewProofTag] = useState("Play Space");

  // Modern Info 2: Home & Environment Info
  const [environmentInfo, setEnvironmentInfo] = useState({
    homeType: "Single-Family House",
    yardType: "Fully Fenced Private Yard",
    hasAc: true,
    smokeFree: true,
    noResidentPets: true,
    firstAidKit: true,
    continuousSupervision: true,
  });

  // Modern Info 3: Pet Preferences & Size Limits
  const [petPreferences, setPetPreferences] = useState({
    acceptedTypes: ["Dogs", "Cats"],
    dogSizes: ["Small (0-15 lbs)", "Medium (15-40 lbs)", "Large (40-80 lbs)"],
    requireVaccinations: true,
    requireSpayNeuter: true,
    maxPetsPerStay: 2,
  });

  // Modern Info 4: Daily Routine & Care Schedule
  const [dailyRoutine, setDailyRoutine] = useState({
    morning: "7:00 AM - Morning potty break, fresh bowl of filtered water, personalized breakfast according to parent instructions.",
    midday: "12:30 PM - Interactive backyard play, mental enrichment toy, gentle walk or potty walk.",
    evening: "6:30 PM - Dinner service, sunset stroll around neighborhood, warm brushing, bedtime cuddle & check-in."
  });

  // Modern Info 5: Specialized Skills
  const [skillsList, setSkillsList] = useState<string[]>([
    "Administering Oral Medications",
    "Pet CPR & First Aid Certified",
    "Real-time Photo & Video Updates"
  ]);

  const [activeTab, setActiveTab] = useState<"BASICS" | "ENVIRONMENT" | "PREFERENCES" | "ROUTINE" | "ALBUM">("BASICS");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [urlInputOpen, setUrlInputOpen] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState("");

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/sitters/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          // Initialize split names
          setFirstName(data.user.firstName || "");
          setMiddleName(data.user.middleName || "");
          setLastName(data.user.lastName || "");
          
          if (!data.user.firstName && data.user.name) {
            const parts = data.user.name.trim().split(" ");
            if (parts.length === 1) {
              setFirstName(parts[0]);
            } else if (parts.length === 2) {
              setFirstName(parts[0]);
              setLastName(parts[1]);
            } else if (parts.length > 2) {
              setFirstName(parts[0]);
              setMiddleName(parts.slice(1, -1).join(" "));
              setLastName(parts[parts.length - 1]);
            }
          }

          setPhone(data.user.phone || "");
          setCountryCode(data.user.countryCode || "+63");
          
          if (data.user.profilePicture) {
            setProfilePicture(data.user.profilePicture);
          }
        }

        if (data.profile) {
          setBio(data.profile.bio || "");
          setExperienceDetails(data.profile.experienceDetails || "");
          setServiceRadiusMiles(data.profile.serviceRadiusMiles || 10);
          if (data.profile.photos && Array.isArray(data.profile.photos) && data.profile.photos.length > 0) {
            setPhotos(data.profile.photos);
            if (!profilePicture && !data.user?.profilePicture) {
              setProfilePicture(data.profile.photos[0] || "");
            }
          }
          if (Array.isArray(data.profile.proofAlbum) && data.profile.proofAlbum.length > 0) {
            setProofAlbum(data.profile.proofAlbum);
          }
          if (data.profile.environmentInfo && Object.keys(data.profile.environmentInfo).length > 0) {
            setEnvironmentInfo(prev => ({ ...prev, ...data.profile.environmentInfo }));
          }
          if (data.profile.petPreferences && Object.keys(data.profile.petPreferences).length > 0) {
            setPetPreferences(prev => ({ ...prev, ...data.profile.petPreferences }));
          }
          if (data.profile.dailyRoutine && Object.keys(data.profile.dailyRoutine).length > 0) {
            setDailyRoutine(prev => ({ ...prev, ...data.profile.dailyRoutine }));
          }
          if (Array.isArray(data.profile.skillsList) && data.profile.skillsList.length > 0) {
            setSkillsList(data.profile.skillsList);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load sitter profile:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please choose an image file smaller than 4MB.",
        type: "error"
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        const photoData = reader.result;
        setProfilePicture(photoData);
        // Instantly reflect in dbUser local state so header updates immediately
        if (updateUserDbState) {
          updateUserDbState({ profilePicture: photoData });
        }
        toast({
          title: "Photo Ready",
          description: "Preview updated. Click 'Save Profile' to commit changes.",
          type: "info"
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (!customPhotoUrl.trim()) return;
    const url = customPhotoUrl.trim();
    setProfilePicture(url);
    if (updateUserDbState) {
      updateUserDbState({ profilePicture: url });
    }
    setCustomPhotoUrl("");
    toast({ title: "Avatar Updated", description: "Image link applied.", type: "info" });
  };

  const handleAddProofPhoto = () => {
    if (!newProofUrl.trim()) {
      toast({ title: "URL Required", description: "Please enter an image link.", type: "error" });
      return;
    }
    setProofAlbum(prev => [
      ...prev,
      {
        url: newProofUrl.trim(),
        caption: newProofCaption.trim() || "Care facility / happy client",
        tag: newProofTag
      }
    ]);
    setNewProofUrl("");
    setNewProofCaption("");
    toast({ title: "Photo Added", description: "Photo added to your care album.", type: "success" });
  };

  const handleRemoveProofPhoto = (index: number) => {
    setProofAlbum(prev => prev.filter((_, idx) => idx !== index));
  };

  const toggleSkill = (skillLabel: string) => {
    setSkillsList(prev => 
      prev.includes(skillLabel)
        ? prev.filter(s => s !== skillLabel)
        : [...prev, skillLabel]
    );
  };

  const toggleAcceptedType = (type: string) => {
    setPetPreferences(prev => {
      const current = prev.acceptedTypes || [];
      const updated = current.includes(type)
        ? current.filter(t => t !== type)
        : [...current, type];
      return { ...prev, acceptedTypes: updated };
    });
  };

  const toggleDogSize = (size: string) => {
    setPetPreferences(prev => {
      const current = prev.dogSizes || [];
      const updated = current.includes(size)
        ? current.filter(s => s !== size)
        : [...current, size];
      return { ...prev, dogSizes: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check name requirements
    if (!firstName.trim() && !lastName.trim()) {
      toast({ title: "First & Last Name Required", description: "Please enter your first and last legal name.", type: "error" });
      return;
    }

    // Enforce 100-character bio minimum for high quality and AdSense compliance
    if (bio.trim().length > 0 && bio.trim().length < 100) {
      toast({
        title: "Bio Too Short (100 Characters Minimum)",
        description: `Your bio is currently ${bio.trim().length} characters. Please write at least 100 characters to meet quality standards and help pet parents trust your service.`,
        type: "error"
      });
      return;
    }

    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const compositeName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ");

      const payload = {
        name: compositeName,
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        countryCode: countryCode,
        phone: phone.trim(),
        bio: bio.trim(),
        experienceDetails: experienceDetails.trim(),
        serviceRadiusMiles: Number(serviceRadiusMiles),
        profilePicture: profilePicture.trim() || undefined,
        photos: profilePicture.trim() ? [profilePicture.trim(), ...photos.filter(p => p !== profilePicture.trim())] : photos,
        proofAlbum,
        environmentInfo,
        petPreferences,
        dailyRoutine,
        skillsList,
      };

      const res = await fetch("/api/sitters/me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const resData = await res.json();
        
        // Immediately synchronize user avatar and profile in top header
        if (updateUserDbState && resData.user) {
          updateUserDbState({
            ...resData.user,
            profilePicture: profilePicture.trim() || resData.user.profilePicture,
            name: compositeName,
          });
        }

        if (refreshUser) {
          await refreshUser();
        }

        toast({
          title: "Profile Updated!",
          description: "Your full name, phone, header picture, and modern care profile have been saved.",
          type: "success"
        });

        if (onSaved) {
          onSaved();
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "Update Failed",
          description: err.error || "Could not save profile details.",
          type: "error"
        });
      }
    } catch (err: any) {
      toast({ title: "Network Error", description: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar = profilePicture || dbUser?.profilePicture || user?.photoURL || AVATAR_PRESETS[0];

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Sitter Hub Navigation */}
      {showNavigationShortcuts && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 text-xs font-bold uppercase tracking-wider mb-2 border border-purple-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-300" /> Verified Pet Sitter Portal
              </div>
              <h2 className="text-xl font-black tracking-tight">Caregiver Profile Management</h2>
              <p className="text-xs text-purple-200 mt-0.5">
                Update your legal name, contact phone, header photo, and comprehensive pet care info.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/sitter/inbox"
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-white/20"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-300" />
                <span>Open Inbox</span>
              </Link>
              <Link
                to="/sitter/dashboard?tab=disbursement"
                className="px-3 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-200" />
                <span>Payout Account</span>
              </Link>
              <Link
                to="/sitter/dashboard"
                className="px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                <span>Sitter Hub</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        
        {/* Navigation Tabs for Profile Sections */}
        <div className="flex flex-wrap gap-2 pb-4 mb-6 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("BASICS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "BASICS"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <User className="w-4 h-4" /> Personal & Avatar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ENVIRONMENT")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "ENVIRONMENT"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Home className="w-4 h-4" /> Home & Environment
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PREFERENCES")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "PREFERENCES"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <PawPrint className="w-4 h-4" /> Pet Preferences
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ROUTINE")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "ROUTINE"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" /> Daily Routine
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ALBUM")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "ALBUM"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Camera className="w-4 h-4" /> Care Album & Skills
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* TAB 1: BASICS & AVATAR */}
          {activeTab === "BASICS" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Section 1: Profile Picture Management */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Camera className="w-5 h-5 text-purple-600" /> Profile Picture & Header Display
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your photo appears directly on the top header navigation and in client search results.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Required</span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  {/* Picture Preview */}
                  <div className="relative group shrink-0">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-purple-200 shadow-sm bg-purple-50 flex items-center justify-center">
                      <img
                        src={currentAvatar}
                        alt={firstName ? `${firstName} ${lastName}` : "Sitter"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = AVATAR_PRESETS[0];
                        }}
                      />
                    </div>
                    <label
                      htmlFor="sitter-avatar-upload"
                      className="absolute -bottom-2 -right-2 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-xl shadow-md cursor-pointer transition-transform group-hover:scale-105"
                      title="Upload image file"
                    >
                      <Upload className="w-4 h-4" />
                      <input
                        id="sitter-avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Photo Controls */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <label
                        htmlFor="sitter-avatar-upload-btn"
                        className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold border border-purple-200 cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload New Photo</span>
                        <input
                          id="sitter-avatar-upload-btn"
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setUrlInputOpen(!urlInputOpen)}
                        className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1.5"
                      >
                        <Image className="w-3.5 h-3.5 text-slate-500" />
                        <span>Use Image URL</span>
                      </button>
                    </div>

                    {urlInputOpen && (
                      <div className="flex gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                          type="url"
                          placeholder="Paste image link: https://..."
                          value={customPhotoUrl}
                          onChange={(e) => setCustomPhotoUrl(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCustomUrl}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                        >
                          Apply
                        </button>
                      </div>
                    )}

                    {/* Avatar Presets */}
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Or choose a preset caregiver avatar:</p>
                      <div className="flex items-center gap-2">
                        {AVATAR_PRESETS.map((presetUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setProfilePicture(presetUrl);
                              if (updateUserDbState) {
                                updateUserDbState({ profilePicture: presetUrl });
                              }
                              toast({ title: "Avatar Selected", description: "Avatar updated and synced to header.", type: "info" });
                            }}
                            className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all ${
                              profilePicture === presetUrl ? "border-purple-600 ring-2 ring-purple-200 scale-105" : "border-slate-200 opacity-70 hover:opacity-100"
                            }`}
                          >
                            <img src={presetUrl} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Personal Contact Information with Name Split & Country Phone */}
              <div>
                <div className="border-b border-slate-100 pb-3 mb-5">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600" /> Full Legal Name & Contact Validation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Separated into First, Middle, and Last name with country-specific phone validation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Maria"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Middle Name <span className="text-slate-400 lowercase font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="e.g. Dela Cruz"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Santos"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Country Code & Phone with Validation */}
                <div className="mt-5">
                  <CountryPhoneInput
                    id="sitter-profile-phone"
                    label="Mobile Contact Number *"
                    value={phone}
                    defaultCountryCode={countryCode || "+63"}
                    required={true}
                    onChange={(val, valid, cCode) => {
                      setPhone(val);
                      setIsPhoneValid(valid);
                      if (cCode) setCountryCode(cCode);
                    }}
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Used by pet parents to contact you after booking confirmation.
                  </p>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Email (Verified)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || ""}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Caregiver Profile Bio & Radius */}
              <div>
                <div className="border-b border-slate-100 pb-3 mb-5">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" /> Caregiver Bio & Experience
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Introduce your background and love for animals to prospective pet parents.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      About Me / Public Caregiver Bio *
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Introduce yourself, your love for animals, and what makes your pet care special... (Minimum 100 characters required)"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none resize-y"
                    />
                    <div className="flex items-center justify-between mt-1 text-xs">
                      <span className={bio.trim().length >= 100 ? "text-emerald-600 font-semibold flex items-center gap-1" : "text-amber-600 font-medium"}>
                        {bio.trim().length >= 100 ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Bio meets quality standards ({bio.trim().length} chars)
                          </>
                        ) : (
                          `Minimum 100 characters required (${bio.trim().length}/100)`
                        )}
                      </span>
                      <span className="text-slate-400 text-[11px]">PawShield Content Quality Standard</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Years of Experience & Special Background
                    </label>
                    <textarea
                      rows={2}
                      value={experienceDetails}
                      onChange={(e) => setExperienceDetails(e.target.value)}
                      placeholder="e.g. 5+ years caring for senior dogs, experienced with oral medication, puppy leash training..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none resize-y"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Service Radius: <span className="text-purple-600 font-black">{serviceRadiusMiles} miles (~{Math.round(serviceRadiusMiles * 1.6)} km)</span>
                      </label>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-purple-600" /> Travel distance
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={serviceRadiusMiles}
                      onChange={(e) => setServiceRadiusMiles(Number(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HOME & ENVIRONMENT INFO */}
          {activeTab === "ENVIRONMENT" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Home className="w-5 h-5 text-indigo-600" /> Home Environment & Pet Safety
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pet parents want to know the surroundings where their pets will sleep, play, and stay.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Home / Residence Type
                  </label>
                  <select
                    value={environmentInfo.homeType}
                    onChange={(e) => setEnvironmentInfo(prev => ({ ...prev, homeType: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  >
                    {HOME_TYPES.map(ht => (
                      <option key={ht} value={ht}>{ht}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Yard & Outdoor Space
                  </label>
                  <select
                    value={environmentInfo.yardType}
                    onChange={(e) => setEnvironmentInfo(prev => ({ ...prev, yardType: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  >
                    {YARD_TYPES.map(yt => (
                      <option key={yt} value={yt}>{yt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Safety Badges Checklist */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Safety & Living Conditions
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "hasAc", label: "Air Conditioned / Climate Controlled", desc: "Maintains optimal cool comfort for active dogs and cats." },
                    { key: "smokeFree", label: "100% Smoke-Free Household", desc: "No indoor smoking or vapor exposure." },
                    { key: "noResidentPets", label: "No Other Resident Pets", desc: "Ideal for pets that need non-reactive, solo care." },
                    { key: "firstAidKit", label: "Pet First Aid Kit on Premises", desc: "Fully equipped with pet bandages, antiseptic, and thermometers." },
                    { key: "continuousSupervision", label: "24/7 Caregiver Supervision", desc: "Pets are never left unattended for extended periods." },
                  ].map(item => (
                    <label
                      key={item.key}
                      className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-purple-50/40 border border-slate-200 hover:border-purple-200 rounded-xl cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={(environmentInfo as any)[item.key] || false}
                        onChange={(e) => setEnvironmentInfo(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-slate-300"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{item.label}</div>
                        <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PET PREFERENCES & SIZE LIMITS */}
          {activeTab === "PREFERENCES" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PawPrint className="w-5 h-5 text-indigo-600" /> Pet Preferences & Capacity Limits
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set the species, dog weight classes, and health prerequisites for accepted pets.
                </p>
              </div>

              {/* Accepted Pet Species */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Accepted Pet Species
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Dogs", "Cats", "Puppies (< 1 Year)", "Senior Dogs (8+ Years)", "Birds & Small Pets"].map(type => {
                    const isChecked = petPreferences.acceptedTypes?.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleAcceptedType(type)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                          isChecked
                            ? "bg-purple-50 border-purple-300 text-purple-800"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 text-purple-600" />}
                        <span>{type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dog Weight Classes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Accepted Dog Weight Categories
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    "Small (0-15 lbs)",
                    "Medium (15-40 lbs)",
                    "Large (40-80 lbs)",
                    "Giant (80+ lbs)"
                  ].map(size => {
                    const isChecked = petPreferences.dogSizes?.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleDogSize(size)}
                        className={`p-3 rounded-xl text-xs font-bold text-center border transition-all ${
                          isChecked
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Health and Behavioral Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={petPreferences.requireVaccinations}
                    onChange={(e) => setPetPreferences(prev => ({ ...prev, requireVaccinations: e.target.checked }))}
                    className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-slate-300"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Up-to-Date Rabies & DHPP Required</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Protects the caregiver and client safety.</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={petPreferences.requireSpayNeuter}
                    onChange={(e) => setPetPreferences(prev => ({ ...prev, requireSpayNeuter: e.target.checked }))}
                    className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-slate-300"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Must Be Spayed or Neutered</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Required for all adult boarding stays.</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: DAILY ROUTINE */}
          {activeTab === "ROUTINE" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" /> Daily Care Schedule & Routine
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Give pet owners full peace of mind by sharing a typical day in your care.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                    Morning Routine (Breakfast & Awakening)
                  </label>
                  <textarea
                    rows={2}
                    value={dailyRoutine.morning}
                    onChange={(e) => setDailyRoutine(prev => ({ ...prev, morning: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                    Midday Attention (Exercise, Enrichment & Play)
                  </label>
                  <textarea
                    rows={2}
                    value={dailyRoutine.midday}
                    onChange={(e) => setDailyRoutine(prev => ({ ...prev, midday: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                    Evening & Bedtime (Dinner, Relaxation & Settling In)
                  </label>
                  <textarea
                    rows={2}
                    value={dailyRoutine.evening}
                    onChange={(e) => setDailyRoutine(prev => ({ ...prev, evening: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ALBUM & SPECIAL SKILLS */}
          {activeTab === "ALBUM" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Specialized Care Skills Badges */}
              <div>
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600" /> Specialized Pet Care Skills
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select the advanced capabilities that appear as badges on your profile.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SKILL_OPTIONS.map(skill => {
                    const isSelected = skillsList.includes(skill.label);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleSkill(skill.label)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-purple-50/70 border-purple-400 text-purple-900 ring-1 ring-purple-300"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-xs font-bold">{skill.label}</span>
                        {isSelected ? (
                          <Check className="w-4 h-4 text-purple-600 shrink-0" />
                        ) : (
                          <Plus className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Care & Proof Photo Album */}
              <div>
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-indigo-600" /> Proof of Care Photo Album
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Show off your clean sleeping quarters, fenced yards, and previous happy clients.
                  </p>
                </div>

                {/* Add Photo to Album */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 mb-5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add Photo to Album</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="url"
                        placeholder="Image URL (e.g. https://images.unsplash.com/...)"
                        value={newProofUrl}
                        onChange={(e) => setNewProofUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                    <div>
                      <select
                        value={newProofTag}
                        onChange={(e) => setNewProofTag(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      >
                        <option value="Play Space">Play Space</option>
                        <option value="Sleeping Area">Sleeping Area</option>
                        <option value="Fenced Yard">Fenced Yard</option>
                        <option value="Outdoor Walk">Outdoor Walk</option>
                        <option value="Happy Client">Happy Client</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Brief caption (e.g. Spacious carpeted lounge with orthopedic dog beds)"
                      value={newProofCaption}
                      onChange={(e) => setNewProofCaption(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddProofPhoto}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Photo
                    </button>
                  </div>
                </div>

                {/* Album Gallery Grid */}
                {proofAlbum.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-semibold">No album photos added yet.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Add pictures of your home, play area, and outdoor walks.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {proofAlbum.map((item, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs">
                        <div className="h-32 bg-slate-100 overflow-hidden">
                          <img
                            src={item.url}
                            alt={item.caption}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = AVATAR_PRESETS[0];
                            }}
                          />
                        </div>
                        <div className="p-2.5">
                          <span className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-bold mb-1">
                            {item.tag}
                          </span>
                          <p className="text-xs font-medium text-slate-800 line-clamp-1">{item.caption}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveProofPhoto(idx)}
                          className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions (Sticky footer on tab changes) */}
          <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>All updates sync immediately with the top header avatar and live directory.</span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving All Details..." : "Save Caregiver Profile"}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
