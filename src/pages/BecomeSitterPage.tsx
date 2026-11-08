import React, { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { useNavigate } from "react-router";
import {
  Heart,
  MapPin,
  Search,
  ArrowRight,
  ShieldCheck,
  Upload,
  CreditCard,
  UserCheck,
  Building2,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Crown,
  Loader2,
  Phone,
  Calendar,
  Lock,
  Edit3,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
} from "lucide-react";

const PHILIPPINE_BANKS = [
  "GCash (G-Xchange Inc)",
  "Maya (PayMaya Philippines)",
  "BDO Unibank",
  "BPI (Bank of the Philippine Islands)",
  "Metrobank",
  "UnionBank of the Philippines",
  "Landbank of the Philippines",
  "Security Bank",
  "RCBC (Rizal Commercial Banking Corp)",
  "Philippine National Bank (PNB)",
  "Chinabank",
];

const PHILIPPINE_IDS = [
  "PhilSys National ID (Philsys)",
  "UMID (Unified Multi-Purpose ID)",
  "Driver's License (LTO)",
  "Philippine Passport (DFA)",
  "Postal ID (PhilPost)",
  "SSS ID / PhilHealth ID",
  "PRC Professional License",
];

export function BecomeSitterPage() {
  const { user, dbUser, loginWithGoogle, registerWithEmail } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [showOptionalBank, setShowOptionalBank] = useState(false);
  const [declarationAgreed, setDeclarationAgreed] = useState(true);

  const [formData, setFormData] = useState({
    // Personal Info
    legalFirstName: "",
    legalLastName: "",
    mobileNumber: "",
    email: "",
    password: "123",
    birthDate: "",
    address: "",
    city: "Manila",
    province: "Metro Manila",
    bio: "",
    experienceDetails: "",
    serviceRadius: 10,

    // Government ID
    idType: PHILIPPINE_IDS[0],
    idNumber: "",
    idFrontUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80",
    idBackUrl: "",
    selfieWithIdUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80",

    // Disbursement Bank (Optional)
    bankName: PHILIPPINE_BANKS[0],
    bankAccountName: "",
    bankAccountNumber: "",
  });

  // Auto-fill fields if user logs in or was already logged in
  React.useEffect(() => {
    if (user) {
      const nameParts = (user.displayName || "").trim().split(" ");
      const fName = nameParts[0] || "";
      const lName = nameParts.slice(1).join(" ") || "";
      setFormData((prev) => ({
        ...prev,
        legalFirstName: prev.legalFirstName || fName,
        legalLastName: prev.legalLastName || lName,
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  if (dbUser?.role === "PET_SITTER" && !duplicateError) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-lg">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Verified Sitter & Caregiver
        </span>
        <h1 className="text-3xl font-black text-slate-900 mt-3 mb-3">You are an active PawShield Sitter!</h1>
        <p className="text-sm text-slate-600 mb-8 leading-relaxed">
          Your sitter profile is active on PawShield. You can manage your neighborhood rate cards, booking requests, and disbursement payouts from your dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate("/sitter/rates")}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm text-sm"
          >
            Manage Rate Card (₱)
          </button>
          <button
            onClick={() => navigate("/sitter/inbox")}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-sm text-sm"
          >
            Open Sitter Inbox
          </button>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (step === 1) {
      if (!formData.legalFirstName.trim() || !formData.legalLastName.trim() || !formData.mobileNumber.trim()) {
        toast({ title: "Incomplete Details", description: "Please provide your legal name and mobile number.", type: "error" });
        return;
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (step === 2) {
      if (!formData.idNumber.trim()) {
        toast({ title: "ID Number Required", description: "Please enter your government ID number.", type: "error" });
        return;
      }
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDuplicateError(null);

    if (!declarationAgreed) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that the provided information and ID belong to you.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      let activeToken: string | null = null;
      if (user) {
        activeToken = await user.getIdToken();
      } else {
        // Automatically create account inline
        if (!formData.email || !formData.email.includes("@")) {
          toast({ title: "Email Required", description: "Please enter a valid email address.", type: "error" });
          setLoading(false);
          setStep(1);
          return;
        }
        await registerWithEmail(
          formData.email.trim(),
          formData.password || "123",
          `${formData.legalFirstName} ${formData.legalLastName}`.trim(),
          "PET_SITTER",
          formData.mobileNumber.trim()
        );
        activeToken = localStorage.getItem("pawshield_token");
      }

      if (!activeToken) {
        throw new Error("Unable to establish authenticated session.");
      }

      const res = await fetch("/api/sitter-verifications/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          legalFirstName: formData.legalFirstName,
          legalLastName: formData.legalLastName,
          mobileNumber: formData.mobileNumber,
          email: formData.email || user?.email,
          birthDate: formData.birthDate,
          address: formData.address,
          city: formData.city,
          province: formData.province,
          idType: formData.idType,
          idNumber: formData.idNumber,
          idFrontUrl: formData.idFrontUrl,
          idBackUrl: formData.idBackUrl,
          selfieWithIdUrl: formData.selfieWithIdUrl,
          bankName: formData.bankAccountNumber.trim() ? formData.bankName : "",
          bankAccountName: formData.bankAccountNumber.trim()
            ? (formData.bankAccountName || `${formData.legalFirstName} ${formData.legalLastName}`)
            : "",
          bankAccountNumber: formData.bankAccountNumber.trim(),
          bio: formData.bio || "Passionate pet care specialist and verified sitter.",
          experienceDetails: formData.experienceDetails,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Registration Approved! 🎉",
          description: "Your Sitter profile is active with 3 free accepted bookings included.",
          type: "success",
        });

        setTimeout(() => {
          window.location.href = "/sitter/rates";
        }, 1200);
      } else {
        if (data.duplicateBlocked) {
          setDuplicateError(data.error);
          toast({
            title: "Duplicate Account Blocked",
            description: data.error,
            type: "error",
          });
        } else {
          toast({
            title: "Registration Error",
            description: data.error || "Failed to register sitter profile",
            type: "error",
          });
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to submit application", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-64px)] py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Heart className="w-6 h-6 fill-rose-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Become a PawShield Sitter & Member</h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto mt-2 leading-relaxed">
            Join the trusted pet care network in the Philippines. Fill in your details, submit your government ID, and start receiving pet sitting requests in your neighborhood.
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="mb-8 max-w-md mx-auto">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 -z-0" />
            
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold transition-all ${
                step >= 1 ? "bg-slate-900 text-white shadow-md ring-4 ring-slate-100" : "bg-slate-200 text-slate-500"
              }`}
            >
              1
            </button>
            <button
              type="button"
              onClick={() => step > 1 && setStep(2)}
              className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold transition-all ${
                step >= 2 ? "bg-slate-900 text-white shadow-md ring-4 ring-slate-100" : "bg-slate-200 text-slate-500"
              }`}
            >
              2
            </button>
            <button
              type="button"
              onClick={() => step > 2 && setStep(3)}
              className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold transition-all ${
                step >= 3 ? "bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100" : "bg-slate-200 text-slate-500"
              }`}
            >
              3
            </button>
          </div>

          <div className="flex justify-between text-[11px] font-bold text-slate-500 mt-2 px-1">
            <span className={step === 1 ? "text-slate-900 font-extrabold" : ""}>1. Personal Info</span>
            <span className={step === 2 ? "text-slate-900 font-extrabold" : ""}>2. Valid ID Upload</span>
            <span className={step === 3 ? "text-emerald-600 font-extrabold" : ""}>3. Review & Submit</span>
          </div>
        </div>

        {/* Duplicate Error Alert */}
        {duplicateError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold">Anti-Fraud Duplicate Detected</h4>
              <p className="text-xs mt-0.5 leading-relaxed">{duplicateError}</p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-10">
            
            <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-6">

              {/* STEP 1: Personal Information */}
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in">
                  
                  {/* Google Quick Auto-fill banner */}
                  {!user && (
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                      <div>
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          Auto-fill with Google
                        </span>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Connect Google to automatically populate your legal name and email address instantly.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => loginWithGoogle("PET_SITTER")}
                        className="px-4 py-2 bg-white hover:bg-amber-100 text-slate-800 text-xs font-bold rounded-xl border border-amber-300 shadow-sm flex items-center gap-2 shrink-0 transition-all active:scale-95"
                      >
                        ⚡ Continue with Google
                      </button>
                    </div>
                  )}

                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      Step 1: Legal Personal Information
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Please provide your real legal details matching your government ID.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Legal First Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.legalFirstName}
                        onChange={(e) => setFormData({ ...formData, legalFirstName: e.target.value })}
                        placeholder="e.g. Maria Clara"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Legal Last Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.legalLastName}
                        onChange={(e) => setFormData({ ...formData, legalLastName: e.target.value })}
                        placeholder="e.g. Dela Cruz"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  {/* Email and Password fields aligned with manual user creation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. sitter@example.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    {!user && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Account Password *</label>
                        <input
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="At least 3 characters (e.g. 123)"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        Mobile Number * (Checked for Duplicates)
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.mobileNumber}
                        onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                        placeholder="0917 123 4567 or +63 917..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> Complete Home Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="House / Unit No., Street, Barangay"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">City / Municipality *</label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g. Quezon City"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sitter Bio & Care Experience</label>
                    <textarea
                      rows={3}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Share your pet care experience, routines you excel in (e.g. dog walking, administering medications, puppy sitting)..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                    />
                  </div>

                  {/* Optional Disbursement Bank Section */}
                  <div className="border border-slate-200 rounded-2xl bg-slate-50/60 p-4 transition-all">
                    <button
                      type="button"
                      onClick={() => setShowOptionalBank(!showOptionalBank)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="text-xs font-bold text-slate-800">
                            Disbursement Bank / E-Wallet (Optional)
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {formData.bankAccountNumber.trim()
                              ? `Added: ${formData.bankName} (${formData.bankAccountNumber})`
                              : "Not required to register — you can add this anytime later in your Sitter Settings"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 shrink-0">
                        <span>{showOptionalBank ? "Hide" : (formData.bankAccountNumber ? "Edit" : "+ Add Now")}</span>
                        {showOptionalBank ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {showOptionalBank && (
                      <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-4 animate-in fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Bank / E-Wallet Provider</label>
                            <select
                              value={formData.bankName}
                              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            >
                              {PHILIPPINE_BANKS.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Account Holder Name</label>
                            <input
                              type="text"
                              value={formData.bankAccountName || `${formData.legalFirstName} ${formData.legalLastName}`.trim()}
                              onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                              placeholder="e.g. Maria Clara Dela Cruz"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            Account Number / GCash Mobile #
                          </label>
                          <input
                            type="text"
                            value={formData.bankAccountNumber}
                            onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                            placeholder="e.g. 0917 123 4567 or 0012 3456 7890"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            Optional. You can leave this blank and proceed with your registration.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 active:scale-95"
                    >
                      <span>Continue to Step 2: Valid ID</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Government Valid ID Upload */}
              {step === 2 && (
                <div className="space-y-5 animate-in fade-in">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-indigo-600" />
                      Step 2: Government Valid ID Upload
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      PawShield enforces 100% identity verification. Upload a clear, valid Philippine Government-issued ID.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Select Valid ID Type *</label>
                      <select
                        value={formData.idType}
                        onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        {PHILIPPINE_IDS.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Government ID Number * (Checked for Duplicates)
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.idNumber}
                        onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                        placeholder="e.g. 1234-5678-9012-3456"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  {/* ID Photo Uploads */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center hover:bg-slate-100/60 transition-colors">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                      <span className="text-xs font-bold text-slate-700 block">Front of ID Document</span>
                      <span className="text-[10px] text-slate-400 block mb-3">Clear photo or scan (PNG, JPG, PDF)</span>
                      <input
                        type="text"
                        value={formData.idFrontUrl}
                        onChange={(e) => setFormData({ ...formData, idFrontUrl: e.target.value })}
                        placeholder="ID Document image URL"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700"
                      />
                    </div>

                    <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center hover:bg-slate-100/60 transition-colors">
                      <UserCheck className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                      <span className="text-xs font-bold text-slate-700 block">Selfie Holding ID</span>
                      <span className="text-[10px] text-slate-400 block mb-3">Face clearly visible alongside your ID</span>
                      <input
                        type="text"
                        value={formData.selfieWithIdUrl}
                        onChange={(e) => setFormData({ ...formData, selfieWithIdUrl: e.target.value })}
                        placeholder="Biometric Selfie photo URL"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 active:scale-95"
                    >
                      <span>Continue to Step 3: Review & Submit</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Review Application & Submit */}
              {step === 3 && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Step 3: Review Your Application
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Please verify all your details before activating your Sitter profile. You can edit any section if needed.
                    </p>
                  </div>

                  {/* Review Section 1: Personal & Contact Profile */}
                  <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 mb-3">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        1. Personal & Contact Profile
                      </span>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">Full Legal Name</span>
                        <span className="font-bold text-slate-800">
                          {formData.legalFirstName} {formData.legalLastName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">Email Address</span>
                        <span className="font-bold text-slate-800">{formData.email || user?.email || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">Mobile Number</span>
                        <span className="font-bold text-slate-800">{formData.mobileNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">Date of Birth</span>
                        <span className="font-bold text-slate-800">{formData.birthDate || "Not specified"}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 font-medium block text-[11px]">Address & City</span>
                        <span className="font-bold text-slate-800">
                          {formData.address}, {formData.city}, {formData.province}
                        </span>
                      </div>
                      {formData.bio && (
                        <div className="sm:col-span-2">
                          <span className="text-slate-400 font-medium block text-[11px]">Sitter Bio</span>
                          <span className="text-slate-700 italic block mt-0.5">"{formData.bio}"</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Section 2: Government Valid ID */}
                  <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 mb-3">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-indigo-600" />
                        2. Philippine Government ID
                      </span>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">Document Type</span>
                        <span className="font-bold text-slate-800">{formData.idType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">ID Document Number</span>
                        <span className="font-mono font-bold text-slate-800">{formData.idNumber}</span>
                      </div>
                      <div className="sm:col-span-2 pt-1 flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <Check className="w-3.5 h-3.5" /> Front ID Attached
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <Check className="w-3.5 h-3.5" /> Biometric Selfie Attached
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Review Section 3: Disbursement Bank (Optional) */}
                  <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 mb-3">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-amber-600" />
                        3. Payout Disbursement Method
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setStep(1);
                          setShowOptionalBank(true);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {formData.bankAccountNumber.trim() ? "Edit" : "+ Add Bank / GCash"}
                      </button>
                    </div>

                    {formData.bankAccountNumber.trim() ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-xs">
                        <div>
                          <span className="text-slate-400 font-medium block text-[11px]">Disbursement Bank / Provider</span>
                          <span className="font-bold text-slate-800">{formData.bankName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[11px]">Account Name</span>
                          <span className="font-bold text-slate-800">
                            {formData.bankAccountName || `${formData.legalFirstName} ${formData.legalLastName}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block text-[11px]">Account / GCash Number</span>
                          <span className="font-mono font-bold text-slate-800">{formData.bankAccountNumber}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            ✓ Ready for Direct Payouts
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 flex items-start gap-2 bg-amber-50/60 border border-amber-200/70 p-3 rounded-xl">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-900 block">Not Provided Yet (Optional)</span>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            You can proceed without entering bank details now. You can add your GCash or Philippine bank account anytime from your Sitter Dashboard when you are ready to receive payouts.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Membership & Free Tier Highlights */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
                    <Crown className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-indigo-950">
                      <span className="font-bold block">Free Tier Membership & 3 Free Bookings Included</span>
                      <p className="mt-0.5 leading-relaxed text-[11px] text-indigo-900/80">
                        Your account is automatically enrolled in the <strong>Free Sitter Tier</strong> with <strong>3 free accepted client bookings</strong>. You can customize your custom rates (Boarding, House Sitting, Walking, Day Care) immediately upon submission.
                      </p>
                    </div>
                  </div>

                  {/* Legal Declaration */}
                  <div className="pt-1">
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 border border-slate-200/80 transition-colors">
                      <input
                        type="checkbox"
                        checked={declarationAgreed}
                        onChange={(e) => setDeclarationAgreed(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-0.5 shrink-0"
                      />
                      <span className="text-xs text-slate-700 leading-snug">
                        I certify that all information and government identification provided are accurate, genuine, and belong to me. I agree to uphold the PawShield Pet Safety Standards.
                      </span>
                    </label>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all"
                    >
                      Back to Step 2
                    </button>

                    <button
                      type="submit"
                      disabled={loading || !declarationAgreed}
                      className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Submit Application & Activate Sitter Profile</span>
                    </button>
                  </div>
                </div>
              )}

            </form>

          </div>
        </div>

      </div>
    </div>
  );
}
