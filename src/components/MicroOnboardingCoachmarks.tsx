import React, { useState, useEffect } from "react";
import { Search, ShieldCheck, X, ChevronRight, Check } from "lucide-react";
import { useNavigate } from "react-router";

export function MicroOnboardingCoachmarks() {
  const [step, setStep] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Only show if user hasn't seen it yet
    try {
      const seen = localStorage.getItem("pawshield_mobile_onboarding_completed");
      if (!seen) {
        // Slight delay so the page loads and user gets oriented
        const timer = setTimeout(() => {
          setStep(1);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage fallback
    }
  }, []);

  const handleDismiss = () => {
    setStep(null);
    try {
      localStorage.setItem("pawshield_mobile_onboarding_completed", "true");
    } catch {
      // ignore
    }
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else {
      handleDismiss();
    }
  };

  if (step === null) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 md:hidden max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/60 ring-1 ring-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
              {step === 1 ? <Search className="w-4 h-4 text-purple-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300">
                Quick Guide • Step {step} of 2
              </span>
              <h4 className="text-sm font-bold text-white">
                {step === 1 ? "1. Find Trusted Sitters" : "2. Guaranteed Escrow Protection"}
              </h4>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            aria-label="Dismiss guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
          {step === 1
            ? "Browse verified local pet caregivers with verified reviews, clear Philippine Peso (₱) pricing, and comprehensive safety certifications."
            : "Your funds stay safe in escrow and are only released to the caregiver after pet care is successfully fulfilled."}
        </p>

        <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full transition-colors ${step === 1 ? "bg-purple-400" : "bg-slate-600"}`} />
            <span className={`w-2 h-2 rounded-full transition-colors ${step === 2 ? "bg-emerald-400" : "bg-slate-600"}`} />
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                onClick={() => {
                  handleDismiss();
                  navigate("/search");
                }}
                className="text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-1"
              >
                Go to Search
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-md active:scale-95"
            >
              <span>{step === 1 ? "Next" : "Got it!"}</span>
              {step === 1 ? <ChevronRight className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
