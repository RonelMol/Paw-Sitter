import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "./ToastContext";
import { CountryPhoneInput } from "./CountryPhoneInput";
import {
  ShieldCheck,
  FileCheck2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Upload,
  ArrowRight,
  ArrowLeft,
  History,
  XCircle,
  Clock,
  User,
  MapPin,
  Camera,
  FileText,
  Building2,
  Calendar,
  Eye,
  Check
} from "lucide-react";

export const PHILIPPINE_IDS = [
  "Philippine National ID (PhilSys)",
  "Driver's License (LTO)",
  "Philippine Passport (DFA)",
  "Unified Multi-Purpose ID (UMID)",
  "Social Security System (SSS)",
  "Professional Regulation Commission (PRC)",
  "Postal ID (PHLPost)",
  "Voter's ID / Comelec Certificate",
  "Senior Citizen ID",
  "Overseas Workers Welfare Administration (OWWA)"
];

export function SitterAppKycModule() {
  const { user, dbUser, updateUserDbState } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Legal Identity
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("+63");
  const [phone, setPhone] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Step 2: Address
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Step 3: ID Document Upload Module
  const [idType, setIdType] = useState(PHILIPPINE_IDS[0]);
  const [idNumber, setIdNumber] = useState("");
  const [idFrontUrl, setIdFrontUrl] = useState("");
  const [idBackUrl, setIdBackUrl] = useState("");
  const [idSelfieUrl, setIdSelfieUrl] = useState("");

  // Step 4: Attestation
  const [attestationConfirmed, setAttestationConfirmed] = useState(false);

  // Status & Trails
  const [isKycLocked, setIsKycLocked] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [historyTrail, setHistoryTrail] = useState<any[]>([]);
  const [trailLoading, setTrailLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadKycData();
    loadHistoryTrail();
  }, [user]);

  const loadKycData = async () => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/sitter-verifications/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.verification) {
            const v = data.verification;
            setFirstName(v.legalFirstName || v.legal_first_name || dbUser?.firstName || "");
            setMiddleName(v.legalMiddleName || v.legal_middle_name || dbUser?.middleName || "");
            setLastName(v.legalLastName || v.legal_last_name || dbUser?.lastName || "");
            setCountryCode(v.countryCode || v.country_code || dbUser?.countryCode || "+63");
            setPhone(v.phone || v.mobileNumber || v.mobile_number || dbUser?.phone || "");
            setIsPhoneValid(Boolean(v.phone || v.mobileNumber || v.mobile_number));
            const dob = v.dateOfBirth || v.birthDate || v.birth_date;
            setDateOfBirth(dob ? String(dob).split("T")[0] : "");

            setAddressLine(v.addressLine || v.address || v.address_line || "");
            setCity(v.city || "");
            setStateProvince(v.stateProvince || v.province || v.state_province || "");
            setPostalCode(v.postalCode || v.postal_code || "");

            if (v.idType || v.id_type) setIdType(v.idType || v.id_type);
            setIdNumber(v.idNumber || v.id_number || "");
            setIdFrontUrl(v.idFrontUrl || v.id_front_url || "");
            setIdBackUrl(v.idBackUrl || v.id_back_url || "");
            setIdSelfieUrl(v.idSelfieUrl || v.selfieWithIdUrl || v.selfie_with_id_url || "");

            const isApproved = v.status === "APPROVED";
            setIsKycLocked(isApproved);
            setKycStatus(v.status);
          } else {
            // Prefill from dbUser
            if (dbUser?.firstName) setFirstName(dbUser.firstName);
            if (dbUser?.middleName) setMiddleName(dbUser.middleName);
            if (dbUser?.lastName) setLastName(dbUser.lastName);
            if (dbUser?.phone) {
              setPhone(dbUser.phone);
              setIsPhoneValid(true);
            }
            if (dbUser?.name && !firstName && !lastName) {
              const parts = dbUser.name.split(" ");
              setFirstName(parts[0] || "");
              setLastName(parts.slice(1).join(" ") || "");
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to load KYC verification:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryTrail = async () => {
    setTrailLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/sitter-verifications/me/kyc-trail", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setHistoryTrail(Array.isArray(data) ? data : (data.trail || []));
        }
      }
    } catch (e) {
      console.error("Failed to load KYC trail:", e);
    } finally {
      setTrailLoading(false);
    }
  };

  const handleDocumentUpload = (
    field: "front" | "back" | "selfie",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image under 5MB.",
        type: "error"
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        if (field === "front") setIdFrontUrl(reader.result);
        if (field === "back") setIdBackUrl(reader.result);
        if (field === "selfie") setIdSelfieUrl(reader.result);
        toast({
          title: "Document Ready",
          description: `${field === "front" ? "Front ID" : field === "back" ? "Back ID" : "Selfie with ID"} attached.`,
          type: "success"
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const validateStep1 = () => {
    if (!firstName.trim()) {
      toast({ title: "First Name Required", description: "Please enter your legal first name.", type: "error" });
      return false;
    }
    if (!lastName.trim()) {
      toast({ title: "Last Name Required", description: "Please enter your legal last name.", type: "error" });
      return false;
    }
    if (!phone.trim()) {
      toast({ title: "Phone Number Required", description: "Please provide a valid contact number.", type: "error" });
      return false;
    }
    if (!dateOfBirth) {
      toast({ title: "Date of Birth Required", description: "Please select your date of birth.", type: "error" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!addressLine.trim() || !city.trim() || !stateProvince.trim()) {
      toast({
        title: "Incomplete Address",
        description: "Please complete street address, city, and province/state.",
        type: "error"
      });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!idNumber.trim()) {
      toast({ title: "ID Number Required", description: "Please enter your government ID number.", type: "error" });
      return false;
    }
    if (!idFrontUrl.trim()) {
      toast({
        title: "Front ID Document Required",
        description: "Please upload or attach the front side of your ID document.",
        type: "error"
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
    else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
    else if (currentStep === 3 && validateStep3()) setCurrentStep(4);
  };

  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isKycLocked) {
      toast({
        title: "KYC Locked",
        description: "Your verification is approved and locked. Contact support for updates.",
        type: "error"
      });
      return;
    }

    if (!attestationConfirmed) {
      toast({
        title: "Declaration Required",
        description: "Please check the box confirming your identity attestation.",
        type: "error"
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = await user?.getIdToken();
      const payload = {
        legalFirstName: firstName.trim(),
        legalMiddleName: middleName.trim() || undefined,
        legalLastName: lastName.trim(),
        countryCode: countryCode.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth,
        addressLine: addressLine.trim(),
        city: city.trim(),
        stateProvince: stateProvince.trim(),
        postalCode: postalCode.trim(),
        idType,
        idNumber: idNumber.trim(),
        idFrontUrl: idFrontUrl.trim(),
        idBackUrl: idBackUrl.trim() || undefined,
        idSelfieUrl: idSelfieUrl.trim() || undefined
      };

      const res = await fetch("/api/v1/sitter-verifications/me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast({
          title: "App KYC Submitted!",
          description: "Your identification has been recorded in the audit trail and sent for Admin verification.",
          type: "success"
        });
        updateUserDbState({
          firstName: firstName.trim(),
          middleName: middleName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          countryCode: countryCode.trim(),
          name: [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ")
        });
        loadKycData();
        loadHistoryTrail();
        setCurrentStep(1);
      } else {
        const err = await res.json();
        toast({
          title: "Submission Error",
          description: err.error || "Could not submit KYC verification.",
          type: "error"
        });
      }
    } catch (e: any) {
      toast({
        title: "Network Error",
        description: e.message || "Failed to submit verification.",
        type: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PawShield App Caregiver KYC</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Identity & Document Verification Module
          </h1>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            Verify your legal caregiver identity to safeguard pets and families. This App KYC module features multi-step verification and a tamper-evident audit history trail.
          </p>
        </div>
      </div>

      {/* KYC Status Alert */}
      {kycStatus === "APPROVED" ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-emerald-950 uppercase tracking-wide">
              App KYC Verified & Approved
            </h4>
            <p className="text-emerald-800 mt-1">
              Your legal identity documents have been approved by Administration. Your Caregiver profile displays the verified badge to prospective pet owners.
            </p>
          </div>
        </div>
      ) : kycStatus === "PENDING" ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-amber-950 uppercase tracking-wide">
              KYC Under Admin Compliance Review
            </h4>
            <p className="text-amber-800 mt-1">
              Your submitted identity documents are being reviewed by the platform safety team. You will receive an update once approved.
            </p>
          </div>
        </div>
      ) : null}

      {/* Multi-Step Wizard Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Step Indicator Bar */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  currentStep === 1
                    ? "bg-slate-900 text-white shadow-xs ring-4 ring-slate-100"
                    : currentStep > 1
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
              </div>
              <span className={`text-xs font-bold hidden sm:inline ${currentStep === 1 ? "text-slate-900" : "text-slate-500"}`}>
                Identity
              </span>
            </div>

            <div className={`h-0.5 flex-1 mx-2 sm:mx-3 ${currentStep > 1 ? "bg-emerald-500" : "bg-slate-200"}`} />

            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  currentStep === 2
                    ? "bg-slate-900 text-white shadow-xs ring-4 ring-slate-100"
                    : currentStep > 2
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
              </div>
              <span className={`text-xs font-bold hidden sm:inline ${currentStep === 2 ? "text-slate-900" : "text-slate-500"}`}>
                Address
              </span>
            </div>

            <div className={`h-0.5 flex-1 mx-2 sm:mx-3 ${currentStep > 2 ? "bg-emerald-500" : "bg-slate-200"}`} />

            {/* Step 3 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  currentStep === 3
                    ? "bg-slate-900 text-white shadow-xs ring-4 ring-slate-100"
                    : currentStep > 3
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {currentStep > 3 ? <Check className="w-3.5 h-3.5" /> : "3"}
              </div>
              <span className={`text-xs font-bold hidden sm:inline ${currentStep === 3 ? "text-slate-900" : "text-slate-500"}`}>
                Documents
              </span>
            </div>

            <div className={`h-0.5 flex-1 mx-2 sm:mx-3 ${currentStep > 3 ? "bg-emerald-500" : "bg-slate-200"}`} />

            {/* Step 4 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  currentStep === 4
                    ? "bg-slate-900 text-white shadow-xs ring-4 ring-slate-100"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                4
              </div>
              <span className={`text-xs font-bold hidden sm:inline ${currentStep === 4 ? "text-slate-900" : "text-slate-500"}`}>
                Review
              </span>
            </div>
          </div>
        </div>

        {/* Wizard Form Content */}
        <div className="p-6 md:p-8">
          {/* STEP 1: Legal Identity */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  Step 1: Legal Full Name & Contact Identity
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your name exactly as it appears on your government identification card.
                </p>
              </div>

              {/* Separated Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isKycLocked}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Maria"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Middle Name <span className="text-[10px] text-slate-400 lowercase font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    disabled={isKycLocked}
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="e.g. Dela Cruz"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isKycLocked}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Santos"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Phone Input with Country Dropdown & Validation */}
              <div className="pt-1">
                <CountryPhoneInput
                  value={phone}
                  defaultCountryCode={countryCode}
                  disabled={isKycLocked}
                  required
                  onChange={(fullPhone, valid, cCode, nationalNum) => {
                    setPhone(fullPhone);
                    setIsPhoneValid(valid);
                    setCountryCode(cCode);
                  }}
                />
              </div>

              {/* Date of Birth */}
              <div className="max-w-xs">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  disabled={isKycLocked}
                  value={dateOfBirth}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Caregivers must be at least 18 years of age.</p>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
                >
                  <span>Continue to Residential Address</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Residential Address */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  Step 2: Residential Address
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Provide your permanent residential address for background safety verification.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Street Address / Barangay / Unit *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isKycLocked}
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="e.g. Unit 402, Sunset Residences, Brgy. San Antonio"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      City / Municipality *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isKycLocked}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Makati City"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Province / State *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isKycLocked}
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      placeholder="e.g. Metro Manila"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Postal / ZIP Code
                    </label>
                    <input
                      type="text"
                      disabled={isKycLocked}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 1203"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
                >
                  <span>Continue to ID Documents</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ID Document Upload Module */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-indigo-600" />
                  Step 3: Identification Document Upload Module
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload clear photos of your valid government ID. Files are encrypted and accessed solely for caregiver verification.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    ID Document Type *
                  </label>
                  <select
                    disabled={isKycLocked}
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none disabled:opacity-60"
                  >
                    {PHILIPPINE_IDS.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    ID Serial / Card Number *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isKycLocked}
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="e.g. 1234-5678-9012-3456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              {/* 3 Upload Slots: Front, Back, Selfie */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. ID Front */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900">1. ID Front Side *</span>
                      {idFrontUrl && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Front view with photo and full name clearly visible.
                    </p>
                  </div>

                  {idFrontUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-100 flex items-center justify-center">
                      <img src={idFrontUrl} alt="Front ID" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setIdFrontUrl("")}
                        className="absolute top-1.5 right-1.5 p-1 bg-slate-900/70 text-white rounded-full hover:bg-slate-900 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-2 text-center">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-500">Attach front ID</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="cursor-pointer block text-center w-full py-1.5 px-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs">
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isKycLocked}
                        onChange={(e) => handleDocumentUpload("front", e)}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      disabled={isKycLocked}
                      value={idFrontUrl}
                      onChange={(e) => setIdFrontUrl(e.target.value)}
                      placeholder="or URL"
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-mono"
                    />
                  </div>
                </div>

                {/* 2. ID Back */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900">2. ID Back Side</span>
                      {idBackUrl && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Back view showing barcodes or issue stamps.
                    </p>
                  </div>

                  {idBackUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-100 flex items-center justify-center">
                      <img src={idBackUrl} alt="Back ID" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setIdBackUrl("")}
                        className="absolute top-1.5 right-1.5 p-1 bg-slate-900/70 text-white rounded-full hover:bg-slate-900 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-2 text-center">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-500">Attach back ID</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="cursor-pointer block text-center w-full py-1.5 px-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs">
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isKycLocked}
                        onChange={(e) => handleDocumentUpload("back", e)}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      disabled={isKycLocked}
                      value={idBackUrl}
                      onChange={(e) => setIdBackUrl(e.target.value)}
                      placeholder="or URL"
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-mono"
                    />
                  </div>
                </div>

                {/* 3. Selfie Holding ID */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900">3. Selfie with ID</span>
                      {idSelfieUrl && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Your face clearly visible holding your ID card.
                    </p>
                  </div>

                  {idSelfieUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-100 flex items-center justify-center">
                      <img src={idSelfieUrl} alt="Selfie with ID" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setIdSelfieUrl("")}
                        className="absolute top-1.5 right-1.5 p-1 bg-slate-900/70 text-white rounded-full hover:bg-slate-900 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-2 text-center">
                      <Camera className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-500">Attach verification selfie</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="cursor-pointer block text-center w-full py-1.5 px-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs">
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isKycLocked}
                        onChange={(e) => handleDocumentUpload("selfie", e)}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      disabled={isKycLocked}
                      value={idSelfieUrl}
                      onChange={(e) => setIdSelfieUrl(e.target.value)}
                      placeholder="or URL"
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
                >
                  <span>Review & Attestation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Final Submission */}
          {currentStep === 4 && (
            <form onSubmit={handleSubmitKyc} className="space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Step 4: Review Verification Details & Legal Attestation
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Carefully review all submitted identity data before transmitting to the platform verification registry.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identity</span>
                  <div className="font-bold text-slate-900">
                    {[firstName, middleName, lastName].filter(Boolean).join(" ")}
                  </div>
                  <div className="text-slate-600">{phone}</div>
                  <div className="text-slate-500">DOB: {dateOfBirth}</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</span>
                  <div className="font-bold text-slate-900">{addressLine}</div>
                  <div className="text-slate-600">{city}, {stateProvince}</div>
                  <div className="text-slate-500">Postal: {postalCode || "N/A"}</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document</span>
                  <div className="font-bold text-slate-900">{idType}</div>
                  <div className="font-mono text-slate-600">{idNumber}</div>
                  <div className="text-emerald-700 font-bold flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {idFrontUrl ? "Front uploaded" : "No front"}
                    {idBackUrl ? " • Back" : ""}
                    {idSelfieUrl ? " • Selfie" : ""}
                  </div>
                </div>
              </div>

              {/* Legal Attestation */}
              <label className="flex items-start gap-3 p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={attestationConfirmed}
                  onChange={(e) => setAttestationConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-indigo-950 leading-relaxed font-medium">
                  I solemnly declare under penalty of perjury and platform exclusion that all identity documents and personal information provided are authentic, unmodified, and belong directly to me. I authorize PawShield to verify these credentials against official registries.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || !attestationConfirmed || isKycLocked}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? "Submitting..." : "Submit App KYC for Admin Review"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Historical App KYC Submissions Trail */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                App KYC Submissions Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                Chronological historical log of all identity submissions and Administrative approvals or rejection notes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadHistoryTrail}
            disabled={trailLoading}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>{trailLoading ? "Refreshing..." : "Refresh Audit Trail"}</span>
          </button>
        </div>

        {historyTrail.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No historical App KYC records found. Once you submit, your full audit trail will be logged here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 pr-4">Date Submitted</th>
                  <th className="pb-3 pr-4">Legal Name</th>
                  <th className="pb-3 pr-4">ID Type</th>
                  <th className="pb-3 pr-4">Masked ID Number</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Admin Feedback / Decision Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyTrail.map((item) => {
                  const status = item.status || "PENDING";
                  const isApproved = status === "APPROVED";
                  const isRejected = status === "REJECTED";
                  const isPending = status === "PENDING";

                  const fullName = [item.legalFirstName, item.legalMiddleName, item.legalLastName]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 pr-4 text-slate-600 font-medium">
                        {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "Recent"}
                        <span className="block text-[10px] text-slate-400">
                          {item.submittedAt ? new Date(item.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 font-bold text-slate-900">
                        {fullName || "N/A"}
                      </td>
                      <td className="py-3.5 pr-4 text-slate-700">
                        {item.idType || "N/A"}
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-slate-800">
                        {item.idNumber ? (
                          item.idNumber.length > 4
                            ? `•••• ${item.idNumber.slice(-4)}`
                            : item.idNumber
                        ) : "N/A"}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isApproved
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : isRejected
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {isApproved && <CheckCircle2 className="w-3 h-3" />}
                          {isRejected && <XCircle className="w-3 h-3" />}
                          {isPending && <Clock className="w-3 h-3" />}
                          {status}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-600">
                        {item.adminNotes ? (
                          <span className="italic">{item.adminNotes}</span>
                        ) : isApproved ? (
                          <span className="text-emerald-700 font-medium">Verified by Administration</span>
                        ) : isPending ? (
                          <span className="text-slate-400">Under review by platform security team</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {item.reviewedAt && (
                          <span className="block text-[10px] text-slate-400">
                            Reviewed: {new Date(item.reviewedAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
