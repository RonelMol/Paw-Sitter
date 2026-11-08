import { ShieldCheck, ShieldAlert, FileCheck, Scale, AlertCircle, Lock, Ban } from "lucide-react";
import { Link } from "react-router";

export function TermsOfServicePage() {
  const lastUpdated = "September 18, 2026";

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="border-b border-slate-200 pb-8 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded-full mb-3 border border-slate-200">
          <Scale className="w-4 h-4 text-slate-600" />
          <span>User Agreement & Marketplace Terms</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          PawShield Terms of Service
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Effective & Last Updated: {lastUpdated}
        </p>
      </div>

      <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
        <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-600" />
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using the PawShield application, website, and associated marketplace services, you agree to be bound by these Terms of Service. If you do not agree to these terms, you must discontinue your use of PawShield immediately.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            2. Two-Sided Marketplace Operations & Sitter Independence
          </h2>
          <p>
            PawShield operates exclusively as an introductory communications venue and directory connecting independent pet owners with independent third-party pet sitters. Sitters are independent service providers, not employees, agents, or partners of PawShield.
          </p>
        </section>

        {/* Explicit No Insurance Disclosure */}
        <section className="bg-amber-50/70 p-6 rounded-2xl border border-amber-200 space-y-3">
          <h2 className="text-base font-bold text-amber-950 flex items-center gap-2">
            <Ban className="w-4 h-4 text-amber-600" />
            3. No Insurance Provided — Not an Insurance Company
          </h2>
          <p className="text-amber-900 leading-relaxed">
            <strong>PawShield does not sell, underwrite, broker, or provide insurance of any kind.</strong> The platform does NOT provide veterinary insurance, pet health coverage, accidental loss policies, or property liability insurance. Any veterinary expenses or medical needs incurred during or following a pet sitting stay are the sole responsibility of the pet owner and sitter under their independent agreement.
          </p>
        </section>

        {/* Zero Liability for Loss or Damage */}
        <section className="bg-rose-50/60 p-6 rounded-2xl border border-rose-200 space-y-3">
          <h2 className="text-base font-bold text-rose-950 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            4. Comprehensive Limitation of Liability — Zero Liability for Damage or Loss
          </h2>
          <p className="text-rose-900 leading-relaxed">
            To the maximum extent permitted by applicable law, PawShield, its parent organization, officers, directors, employees, and software providers shall have <strong>ZERO liability</strong> for:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-rose-900 text-xs">
            <li>Any injury, illness, disease, escape, accidental injury, or death of any animal before, during, or after a booking;</li>
            <li>Any damage, loss, or destruction of real or personal property (including home damage, broken fixtures, stained furniture, or lost house keys);</li>
            <li>Any actions, omissions, negligence, misconduct, or disputes between pet owners and sitters;</li>
            <li>Any arrangements, agreements, or physical encounters conducted offline or outside the verified PawShield interface.</li>
          </ul>
        </section>

        {/* Anti-Scam & Social Engineering Protection */}
        <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600" />
            5. Anti-Scam, Phishing & Social Engineering Protection
          </h2>
          <p className="text-slate-700 leading-relaxed">
            Users must exercise vigilance against social engineering, impersonators, and off-platform scams:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs">
            <li><strong>Official Communication:</strong> PawShield administrators will NEVER contact users via phone, WhatsApp, SMS, or external messaging asking for banking passwords, OTPs, PINs, or direct bank deposits.</li>
            <li><strong>Zero Liability for Off-Platform Scams:</strong> If a user agrees to transfer funds, share sensitive credentials, or conduct business outside the platform, PawShield bears no responsibility or liability for any resulting financial loss or fraud.</li>
            <li><strong>Reporting Malicious Conduct:</strong> Immediately report suspicious accounts, off-platform payment solicitations, or impersonation attempts to platform administrators.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-600" />
            6. Advertising & Monetization Disclosures
          </h2>
          <p>
            PawShield displays non-intrusive advertisements operated by Google AdSense and qualified advertising networks. Users agree not to artificially inflate ad impressions or perform invalid clicks on advertisements. Violations of ad network integrity will lead to immediate account termination.
          </p>
        </section>

        <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <p>Questions? Contact our legal team at <a href="mailto:legal@pawshield.local" className="text-blue-600 underline">legal@pawshield.local</a></p>
          <Link to="/privacy" className="text-blue-600 hover:underline font-medium">Read Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
