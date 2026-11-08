import React from "react";
import { useAuth } from "../lib/AuthContext";
import { Link } from "react-router";
import { ShieldAlert, LogIn, Search, ArrowLeft, ShieldCheck } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, dbUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full">
              Member Access Only
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900">Sign In Required</h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              This module is reserved for registered pet parents and verified service providers. To protect user privacy and comply with platform security standards, please sign in to access this page.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={() => {
                const signInBtn = document.querySelector("#header-sign-in-btn") as HTMLElement;
                if (signInBtn) {
                  signInBtn.click();
                } else {
                  window.location.href = "/";
                }
              }}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" /> Sign In to Your Account
            </button>

            <Link
              to="/search"
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-3.5 h-3.5" /> Browse Public Sitter Directory
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Google AdSense & Identity Compliance Secured</span>
          </div>
        </div>
      </div>
    );
  }

  // Check specific role requirements if provided
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = dbUser?.role || "PET_OWNER";
    const hasRole = allowedRoles.includes(userRole) || userRole === "ADMIN";

    if (!hasRole) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-slate-900">Restricted Module</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your current account role (<strong>{userRole}</strong>) does not have access permissions for this section.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Homepage
              </Link>
              <Link
                to="/become-a-sitter"
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all"
              >
                Apply to Become a Verified Sitter
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
