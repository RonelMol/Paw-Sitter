import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "./ToastContext";
import {
  CreditCard,
  Building2,
  Lock,
  CheckCircle2,
  ShieldCheck,
  Save,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Smartphone,
  History,
  FileCheck,
  Upload,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight
} from "lucide-react";

export const PHILIPPINE_FINANCIAL_INSTITUTIONS = [
  { id: "GCash", name: "GCash (G-Xchange Inc)", type: "E-Wallet", placeholder: "09XXXXXXXXX (11 digits)" },
  { id: "Maya", name: "Maya (PayMaya Philippines)", type: "E-Wallet", placeholder: "09XXXXXXXXX (11 digits)" },
  { id: "BDO", name: "BDO Unibank", type: "Bank", placeholder: "10 or 12-digit Account Number" },
  { id: "BPI", name: "BPI (Bank of the Philippine Islands)", type: "Bank", placeholder: "10-digit Account Number" },
  { id: "Metrobank", name: "Metrobank", type: "Bank", placeholder: "13-digit Account Number" },
  { id: "UnionBank", name: "UnionBank of the Philippines", type: "Bank", placeholder: "12-digit Account Number" },
  { id: "Landbank", name: "Landbank of the Philippines", type: "Bank", placeholder: "10-digit Account Number" },
  { id: "SecurityBank", name: "Security Bank", type: "Bank", placeholder: "13-digit Account Number" },
  { id: "RCBC", name: "RCBC (Rizal Commercial Banking Corp)", type: "Bank", placeholder: "10-digit Account Number" },
  { id: "PNB", name: "Philippine National Bank (PNB)", type: "Bank", placeholder: "12-digit Account Number" },
  { id: "Chinabank", name: "Chinabank", type: "Bank", placeholder: "10 or 12-digit Account Number" }
];

export function SitterDisbursementEditor() {
  const { user, dbUser } = useAuth();
  const { toast } = useToast();

  // Multi-step state: 1 = Provider, 2 = Account Details, 3 = Proof & Review
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [selectedInstId, setSelectedInstId] = useState<string>("GCash");
  const [bankName, setBankName] = useState(PHILIPPINE_FINANCIAL_INSTITUTIONS[0].name);
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [proofDocumentUrl, setProofDocumentUrl] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [isLocked, setIsLocked] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trailLoading, setTrailLoading] = useState(false);
  const [historyTrail, setHistoryTrail] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadDisbursementData();
    loadHistoryTrail();
  }, [user]);

  const loadDisbursementData = async () => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/sitter-verifications/me/disbursement", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          const disb = data.disbursement || data;
          if (disb && (disb.bankName || disb.bank_name)) {
            const bName = disb.bankName || disb.bank_name || PHILIPPINE_FINANCIAL_INSTITUTIONS[0].name;
            setBankName(bName);
            const found = PHILIPPINE_FINANCIAL_INSTITUTIONS.find(i => i.name === bName || i.id === bName);
            if (found) setSelectedInstId(found.id);
            setBankAccountName(disb.bankAccountName || disb.bank_account_name || dbUser?.name || "");
            setBankAccountNumber(disb.bankAccountNumber || disb.bank_account_number || "");
          } else if (dbUser?.name && !bankAccountName) {
            setBankAccountName(dbUser.name);
          }
          setIsLocked(Boolean(data.isLocked));
          setKycStatus(data.kycStatus || data.status || null);
        }
      }
    } catch (e) {
      console.error("Failed to load disbursement details:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryTrail = async () => {
    setTrailLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/sitter-verifications/me/disbursement-trail", {
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
      console.error("Failed to load disbursement trail:", e);
    } finally {
      setTrailLoading(false);
    }
  };

  const handleProviderSelect = (inst: typeof PHILIPPINE_FINANCIAL_INSTITUTIONS[0]) => {
    setSelectedInstId(inst.id);
    setBankName(inst.name);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 4MB.",
        type: "error"
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setProofDocumentUrl(reader.result);
        toast({
          title: "Proof Uploaded",
          description: "Account document proof has been attached.",
          type: "success"
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!bankName) {
        toast({ title: "Selection Required", description: "Please select a bank or e-wallet.", type: "error" });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!bankAccountName.trim()) {
        toast({ title: "Account Name Required", description: "Please enter the account holder name matching your government ID.", type: "error" });
        return;
      }
      if (!bankAccountNumber.trim()) {
        toast({ title: "Account Number Required", description: "Please enter your valid bank or e-wallet account number.", type: "error" });
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      toast({
        title: "Account Locked",
        description: "Your verified payout account is locked. Please contact support to request changes.",
        type: "error"
      });
      return;
    }

    if (!bankAccountName.trim() || !bankAccountNumber.trim()) {
      toast({
        title: "Incomplete Details",
        description: "Please enter both Account Holder Name and Account Number.",
        type: "error"
      });
      return;
    }

    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/sitter-verifications/me/disbursement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bankName: bankName.trim(),
          bankAccountName: bankAccountName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          proofDocumentUrl: proofDocumentUrl.trim() || undefined,
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Disbursement Account Submitted!",
          description: "Your payout details have been recorded in the historical audit trail for verification.",
          type: "success"
        });
        loadDisbursementData();
        loadHistoryTrail();
        setCurrentStep(1);
      } else {
        const err = await res.json();
        toast({
          title: "Submission Failed",
          description: err.error || "Could not save disbursement account.",
          type: "error"
        });
      }
    } catch (e: any) {
      toast({
        title: "Network Error",
        description: e.message || "Failed to reach server.",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedInst = PHILIPPINE_FINANCIAL_INSTITUTIONS.find(i => i.id === selectedInstId) || PHILIPPINE_FINANCIAL_INSTITUTIONS[0];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-400/30 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Philippine Payout Disbursement</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Bank & E-Wallet Disbursement Account
          </h1>
          <p className="text-xs md:text-sm text-emerald-100/90 leading-relaxed">
            Configure where your earnings from completed pet sitting bookings will be disbursed. Submissions follow a verified multi-step flow with a full historical audit trail.
          </p>
        </div>
      </div>

      {/* Verification Status Warning */}
      {isLocked ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-amber-900 uppercase tracking-wide">
              Payout Account Locked & Verified
            </h4>
            <p className="text-amber-800 mt-1">
              Your registered disbursement account is locked to prevent unauthorized alterations. If you need to change your payout destination, please request an administrative unlock.
            </p>
          </div>
        </div>
      ) : null}

      {/* Multi-Step Wizard Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Step Indicator Bar */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  currentStep === 1
                    ? "bg-emerald-600 text-white shadow-xs ring-4 ring-emerald-100"
                    : currentStep > 1
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : "1"}
              </div>
              <span className={`text-xs font-bold ${currentStep === 1 ? "text-slate-900" : "text-slate-500"}`}>
                Provider
              </span>
            </div>

            <div className={`h-0.5 flex-1 mx-3 ${currentStep > 1 ? "bg-emerald-500" : "bg-slate-200"}`} />

            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  currentStep === 2
                    ? "bg-emerald-600 text-white shadow-xs ring-4 ring-emerald-100"
                    : currentStep > 2
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : "2"}
              </div>
              <span className={`text-xs font-bold ${currentStep === 2 ? "text-slate-900" : "text-slate-500"}`}>
                Account Details
              </span>
            </div>

            <div className={`h-0.5 flex-1 mx-3 ${currentStep > 2 ? "bg-emerald-500" : "bg-slate-200"}`} />

            {/* Step 3 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  currentStep === 3
                    ? "bg-emerald-600 text-white shadow-xs ring-4 ring-emerald-100"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                3
              </div>
              <span className={`text-xs font-bold ${currentStep === 3 ? "text-slate-900" : "text-slate-500"}`}>
                Proof & Submit
              </span>
            </div>
          </div>
        </div>

        {/* Wizard Step Forms */}
        <div className="p-6 md:p-8">
          {/* STEP 1: Select Financial Institution */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Step 1: Choose Bank or E-Wallet Destination
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Select your preferred Philippine bank or electronic wallet provider.
                </p>
              </div>

              {/* Institution Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {PHILIPPINE_FINANCIAL_INSTITUTIONS.map((inst) => {
                  const isSelected = selectedInstId === inst.id;
                  const isEwallet = inst.type === "E-Wallet";

                  return (
                    <button
                      key={inst.id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleProviderSelect(inst)}
                      className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      } disabled:opacity-60`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isEwallet
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-purple-100 text-purple-800 border border-purple-200"
                          }`}
                        >
                          {inst.type}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-black text-xs text-slate-900">{inst.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{inst.placeholder}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
                >
                  <span>Continue to Account Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Account Holder Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Step 2: Account Holder & Number Details
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Selected Provider: <span className="font-bold text-emerald-700">{bankName}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                >
                  Change Provider
                </button>
              </div>

              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Account Holder Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLocked}
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="e.g. Maria Santos Dela Cruz"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    ⚠️ Must match your submitted Government KYC Identity name to prevent payout holds or rejection.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    {selectedInst.type === "E-Wallet" ? "Mobile / Wallet Number *" : "Bank Account Number *"}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLocked}
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder={selectedInst.placeholder}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {selectedInst.type === "E-Wallet"
                      ? "Enter your 11-digit Philippine mobile number starting with 09 (e.g. 09171234567)."
                      : "Enter numbers only without hyphens or spaces."}
                  </p>
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
                  <span>Continue to Proof & Review</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Proof Attachment & Final Submission */}
          {currentStep === 3 && (
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Step 3: Verification Attachment & Final Confirmation
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload an optional proof document (e.g. screenshot of account details or QR code) to expedite verification.
                </p>
              </div>

              {/* Review Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Submission Summary
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Institution</span>
                    <span className="font-bold text-slate-900">{bankName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Account Holder</span>
                    <span className="font-bold text-slate-900">{bankAccountName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Account / Mobile Number</span>
                    <span className="font-mono font-bold text-slate-900">{bankAccountNumber}</span>
                  </div>
                </div>
              </div>

              {/* Document Upload Module */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Upload Bank Passbook / E-Wallet Profile Screenshot
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    PNG, JPG, or PDF up to 4MB (Optional but recommended for faster Admin approval)
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <label className="cursor-pointer px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs">
                    Choose Local File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-400">or paste URL below</span>
                </div>

                <div className="max-w-md mx-auto pt-2">
                  <input
                    type="url"
                    value={proofDocumentUrl}
                    onChange={(e) => setProofDocumentUrl(e.target.value)}
                    placeholder="https://.../account_proof.png"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {proofDocumentUrl && (
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Proof Document Attached
                    </span>
                  </div>
                )}
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  required
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  I attest that I am the authorized legal owner of this disbursement account and that all provided financial information is true, accurate, and belongs to me.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="submit"
                  disabled={saving || !agreedToTerms || isLocked}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Submitting..." : "Submit Disbursement Account"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Historical Submissions Trail Module */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Disbursement Submissions Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                Complete record of all payout accounts submitted and their Admin approval status.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadHistoryTrail}
            disabled={trailLoading}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>{trailLoading ? "Refreshing..." : "Refresh Audit Trail"}</span>
          </button>
        </div>

        {historyTrail.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No historical disbursement submissions recorded yet. Once you submit, your trail will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 pr-4">Date Submitted</th>
                  <th className="pb-3 pr-4">Institution</th>
                  <th className="pb-3 pr-4">Account Holder</th>
                  <th className="pb-3 pr-4">Account Number</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Admin Notes / Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyTrail.map((item) => {
                  const status = item.status || "PENDING_APPROVAL";
                  const isApproved = status === "APPROVED";
                  const isRejected = status === "REJECTED";
                  const isPending = status === "PENDING_APPROVAL" || status === "PENDING";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 pr-4 text-slate-600 font-medium">
                        {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "Recent"}
                        <span className="block text-[10px] text-slate-400">
                          {item.submittedAt ? new Date(item.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 font-bold text-slate-900">
                        {item.bankName}
                      </td>
                      <td className="py-3.5 pr-4 text-slate-700">
                        {item.bankAccountName}
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-slate-800">
                        {item.bankAccountNumber ? (
                          item.bankAccountNumber.length > 4
                            ? `•••• ${item.bankAccountNumber.slice(-4)}`
                            : item.bankAccountNumber
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
                          {status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-600">
                        {item.adminNotes ? (
                          <span className="italic">{item.adminNotes}</span>
                        ) : isApproved ? (
                          <span className="text-emerald-700 font-medium">Approved for automated batch disbursements</span>
                        ) : isPending ? (
                          <span className="text-slate-400">Under standard security compliance review</span>
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
