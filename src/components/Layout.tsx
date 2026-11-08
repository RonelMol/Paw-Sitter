import { Outlet, Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { 
  LogIn, 
  LogOut, 
  Search, 
  Map, 
  Calendar, 
  Settings, 
  ShieldCheck, 
  Menu, 
  X, 
  Bell, 
  Heart, 
  Info, 
  Sparkles, 
  Coffee, 
  MessageSquare,
  Home,
  User as UserIcon,
  ChevronLeft,
  Star
} from "lucide-react";
import { useState } from "react";
import { Footer } from "./Footer";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { NotificationBell } from "./NotificationBell";
import { CurrencySelector } from "./CurrencySelector";
import { BrandLogo } from "./BrandLogo";
import { HomePageCustomizerModal } from "./HomePageCustomizerModal";
import { useHomePage } from "../lib/HomePageContext";
import { AuthModal } from "./AuthModal";
import { MicroOnboardingCoachmarks } from "./MicroOnboardingCoachmarks";

export function Layout() {
  const { user, dbUser, loading, login, logout } = useAuth();
  const { setIsCustomizerOpen } = useHomePage();
  const navigate = useNavigate();
  const location = useLocation();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isPetSitter = dbUser?.role === "PET_SITTER";
  const isAdmin = dbUser?.role === "ADMIN";
  const isSitterOrAdmin = isPetSitter || isAdmin;
  const isRootPage = location.pathname === "/";

  const handleRoleBasedLogout = async () => {
    const currentRole = dbUser?.role;
    await logout();
    setMobileMenuOpen(false);
    // Role-based default destination routing
    if (currentRole === "PET_SITTER") {
      navigate("/sitter", { replace: true });
    } else if (currentRole === "ADMIN") {
      navigate("/admin", { replace: true });
    } else {
      // Pet Owner / Guest defaults to Home
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Dedicated Circular Back Button on sub-pages (prevents browser swipe form reset) */}
            {!isRootPage && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="md:hidden w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95 shrink-0"
                aria-label="Go back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <BrandLogo showTagline={false} size="md" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5">
            {/* Find a Sitter is disabled/hidden for Pet Sitters */}
            {!isPetSitter && (
              <Link to="/search" className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
                <Search className="h-4 w-4" /> Find a Sitter
              </Link>
            )}

            {/* Coffee Fund is exclusively for Platform ADMIN */}
            {isAdmin && (
              <Link to="/coffee" className="text-sm font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1.5 bg-amber-50/90 px-2.5 py-1 rounded-xl border border-amber-200 transition-colors">
                <Coffee className="h-4 w-4 text-amber-600" /> Coffee Fund
              </Link>
            )}

            {/* Public Links visible when logged out for AdSense compliance */}
            {!user ? (
              <>
                <Link to="/become-a-sitter" className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
                  <Heart className="h-4 w-4 text-rose-500" /> Become a Sitter
                </Link>
                <Link to="/about" className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
                  <Info className="h-4 w-4 text-slate-400" /> About Us
                </Link>
              </>
            ) : (
              /* Authenticated Member / Sitter Modules */
              <>
                {isPetSitter && (
                  <>
                    <Link to="/sitter/dashboard" className="text-sm font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200 transition-colors">
                      <Calendar className="h-4 w-4 text-purple-600" /> Sitter Hub & Bookings
                    </Link>
                    <Link to="/reviews" className="text-sm font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1.5 bg-amber-50/80 px-2.5 py-1 rounded-xl border border-amber-200 transition-colors">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-400" /> Reviews & Ratings
                    </Link>
                    <Link to="/sitter/inbox" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200 transition-colors">
                      <MessageSquare className="h-4 w-4 text-indigo-600" /> Messages & Inbox
                    </Link>
                  </>
                )}

                {!isPetSitter && !isAdmin && (
                  <>
                    <Link to="/my-bookings" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 bg-emerald-50/70 px-2.5 py-1 rounded-xl border border-emerald-200 transition-colors">
                      <Calendar className="h-4 w-4 text-emerald-600" /> My Bookings & Orders
                    </Link>
                    <Link to="/reviews" className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
                      <Star className="h-4 w-4 text-amber-500" /> Reviews & Ratings
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <>
                    <Link to="/reviews" className="text-sm font-semibold text-purple-800 hover:text-purple-950 flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200 transition-colors">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-400" /> Reviews Center
                    </Link>
                    <Link to="/sitter/inbox" className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
                      <MessageSquare className="h-4 w-4 text-indigo-600" /> Sitter Inbox
                    </Link>
                    <Link to="/admin" className="text-sm font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80 transition-colors">
                      <ShieldCheck className="h-4 w-4 text-amber-600" /> Platform Admin
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Currency Switcher (Default: Philippine Peso ₱) */}
            <CurrencySelector variant="header" />

            {user && <NotificationBell />}

            {!loading && (
              user ? (
                <div className="flex items-center gap-3">
                  <Link to="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-bold leading-none text-slate-900">{dbUser?.name || user.displayName || "My Profile"}</p>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">{dbUser?.role || "Member"}</p>
                    </div>
                    {dbUser?.profilePicture || user.photoURL ? (
                      <img
                        key={dbUser?.profilePicture || user.photoURL || "avatar"}
                        src={dbUser?.profilePicture || user.photoURL || ""}
                        alt="Avatar"
                        className="w-9 h-9 rounded-full border border-slate-200 object-cover shadow-xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center text-xs font-bold">
                        {((dbUser?.name || user.displayName || user.email)?.[0] || "U").toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <button onClick={handleRoleBasedLogout} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Log Out">
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button
                  id="header-sign-in-btn"
                  onClick={() => setAuthModalOpen(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  Sign In
                </button>
              )
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu - AdSense Compliant */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1.5">
            {!isPetSitter && (
              <Link
                to="/search"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                <Search className="h-4 w-4 text-slate-500" /> Find a Sitter
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/coffee"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-sm font-medium text-amber-800 hover:text-amber-950 bg-amber-50/80 px-3 rounded-xl border border-amber-200/80"
              >
                <Coffee className="h-4 w-4 text-amber-600" /> Coffee Fund
              </Link>
            )}

            {!user ? (
              <>
                <Link
                  to="/become-a-sitter"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  <Heart className="h-4 w-4 text-rose-500" /> Become a Verified Sitter
                </Link>
                <Link
                  to="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  <Info className="h-4 w-4 text-slate-500" /> About Us
                </Link>
                <Link
                  to="/terms"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Safety & Escrow Guarantee
                </Link>
              </>
            ) : (
              <>
                {!isPetSitter && (
                  <Link
                    to="/my-bookings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50/70 px-3 rounded-xl border border-emerald-200/80"
                  >
                    <Calendar className="h-4 w-4 text-emerald-600" /> My Bookings & Orders
                  </Link>
                )}

                {isPetSitter && (
                  <>
                    <Link
                      to="/sitter/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-sm font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 px-3 rounded-xl border border-purple-200"
                    >
                      <Calendar className="h-4 w-4 text-purple-600" /> Sitter Hub & Bookings
                    </Link>
                    <Link
                      to="/sitter/inbox"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-3 rounded-xl border border-indigo-200"
                    >
                      <MessageSquare className="h-4 w-4 text-indigo-600" /> Messages & Inbox
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <Link
                    to="/sitter/inbox"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                  >
                    <MessageSquare className="h-4 w-4 text-indigo-600" /> Sitter Schedule & Inbox
                  </Link>
                )}
                <Link
                  to="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2 text-sm font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50/50 px-3 rounded-lg border border-emerald-200"
                >
                  <Bell className="h-4 w-4 text-emerald-600" /> Notifications & Activity
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 py-2 text-sm font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 px-3 rounded-lg border border-amber-200"
                  >
                    <ShieldCheck className="h-4 w-4 text-amber-600" /> Platform Admin Console
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleRoleBasedLogout}
                  className="w-full flex items-center gap-2 py-2 text-sm font-semibold text-rose-600 hover:text-rose-800 bg-rose-50/50 hover:bg-rose-50 px-3 rounded-lg border border-rose-200 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4 text-rose-500" /> Log Out ({dbUser?.role || "Account"})
                </button>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar: Ergonomic Thumb-Zone Reach (Lower 30% of Viewport) */}
      <nav 
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 flex justify-around items-center safe-area-bottom"
      >
        <Link
          to="/"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            location.pathname === "/" ? "text-purple-700 font-bold" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Home className={`w-5 h-5 ${location.pathname === "/" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
        </Link>

        {!isPetSitter ? (
          <Link
            to="/search"
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              location.pathname.startsWith("/search") ? "text-purple-700 font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Search className={`w-5 h-5 ${location.pathname.startsWith("/search") ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">Find Sitters</span>
          </Link>
        ) : (
          <Link
            to="/sitter/dashboard"
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              location.pathname.startsWith("/sitter/dashboard") ? "text-purple-700 font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Calendar className={`w-5 h-5 ${location.pathname.startsWith("/sitter/dashboard") ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">Sitter Hub</span>
          </Link>
        )}

        <Link
          to={isPetSitter || isAdmin ? "/sitter/inbox" : (user ? "/notifications" : "/terms")}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            location.pathname.includes("inbox") || location.pathname.includes("notifications") 
              ? "text-purple-700 font-bold" 
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {isPetSitter || isAdmin ? (
            <MessageSquare className={`w-5 h-5 ${location.pathname.includes("inbox") ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          ) : (
            <ShieldCheck className={`w-5 h-5 ${location.pathname.includes("notifications") || location.pathname.includes("terms") ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          )}
          <span className="text-[10px] mt-0.5 tracking-tight">
            {isPetSitter || isAdmin ? "Inbox" : "Protection"}
          </span>
        </Link>

        {user ? (
          <Link
            to="/profile"
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              location.pathname.startsWith("/profile") ? "text-purple-700 font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {dbUser?.profilePicture || user.photoURL ? (
              <img
                src={dbUser?.profilePicture || user.photoURL || ""}
                alt="Profile"
                className="w-5 h-5 rounded-full object-cover border border-purple-200"
              />
            ) : (
              <UserIcon className={`w-5 h-5 ${location.pathname.startsWith("/profile") ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            )}
            <span className="text-[10px] mt-0.5 tracking-tight">Account</span>
          </Link>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-500 hover:text-purple-700 transition-all"
          >
            <LogIn className="w-5 h-5 stroke-[1.8]" />
            <span className="text-[10px] mt-0.5 tracking-tight">Sign In</span>
          </button>
        )}
      </nav>

      <Footer />
      <CookieConsentBanner />
      <HomePageCustomizerModal />
      <MicroOnboardingCoachmarks />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title="Sign In to PawShield"
        subtitle="Create an account using our registration form or sign in with Google."
      />
    </div>
  );
}
