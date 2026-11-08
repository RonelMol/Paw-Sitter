import { ShieldCheck, Heart, Users, Award, Sparkles, CheckCircle2 } from "lucide-react";
import { Link } from "react-router";

export function AboutUsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="border-b border-slate-200 pb-8 mb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full mb-3 border border-blue-100">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>About PawShield & Our Mission</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Safe, Verified Pet Care in Every Neighborhood
        </h1>
        <p className="text-base text-slate-600 mt-2 max-w-2xl">
          We built PawShield to deliver absolute peace of mind for pet parents and empowering financial independence for dedicated animal caregivers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900">Background Checked</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every sitter undergoes identity verification, criminal history screening, and reference validation before accepting bookings.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900">Real-Time Verification</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Live GPS check-in cards, potty tracking, medication checklists, and photo updates delivered right to your smartphone.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900">Transparent Monetization</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Funded by modest platform service fees and policy-compliant Google AdSense contextual advertising to keep sitter commissions low.
          </p>
        </div>
      </div>

      <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 space-y-4 text-sm text-slate-700 leading-relaxed">
        <h2 className="text-lg font-bold text-slate-900">Publisher & Editorial Integrity</h2>
        <p>
          PawShield maintains strict editorial standards. All sitter profiles are reviewed by human trust-and-safety specialists. User reviews are 100% verified from confirmed completed stays. Our advertising partnerships, including Google AdSense, do not influence search ranking or sitter qualification standards.
        </p>
        <div className="pt-4 flex flex-wrap gap-4 text-xs font-semibold">
          <Link to="/search" className="text-blue-600 hover:underline">Browse Verified Sitters</Link>
          <Link to="/become-a-sitter" className="text-blue-600 hover:underline">Apply to Become a Sitter</Link>
          <Link to="/contact" className="text-blue-600 hover:underline">Publisher Contact</Link>
        </div>
      </div>
    </div>
  );
}
