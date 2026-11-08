import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Cookie, ShieldCheck, X } from "lucide-react";

export function CookieConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("pawshield_cookie_consent");
      if (!consent) {
        // Show after a brief delay so page loads smoothly
        const timer = setTimeout(() => setShow(true), 800);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("pawshield_cookie_consent", "accepted");
    } catch (e) {}
    setShow(false);
  };

  const handleReject = () => {
    try {
      localStorage.setItem("pawshield_cookie_consent", "essential_only");
    } catch (e) {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <aside
      aria-label="Cookie and Advertising Consent"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0 mt-0.5 border border-amber-100">
          <Cookie className="w-5 h-5" />
        </div>
        <div className="flex-1 text-sm text-slate-600 space-y-1.5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
              <span>Privacy & Advertising Choices</span>
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </h2>
            <button
              onClick={handleReject}
              className="text-slate-500 hover:text-slate-600 p-1 -mr-1"
              aria-label="Close cookie banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            We and our advertising partners (including Google AdSense) use cookies and device identifiers to personalize advertisements, ensure platform security, and analyze web traffic in accordance with Google's EU User Consent Policy.
          </p>
          <div className="pt-1">
            <Link
              to="/privacy"
              className="text-xs text-blue-600 hover:text-blue-700 underline font-medium"
            >
              Read our full Privacy & AdSense Policy
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
        <button
          onClick={handleReject}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Essential Only
        </button>
        <button
          onClick={handleAccept}
          className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
        >
          Accept All & Continue
        </button>
      </div>
    </aside>
  );
}
