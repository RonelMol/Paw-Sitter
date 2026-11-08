import { ShieldCheck, ExternalLink, Lock, Eye, Cookie, FileText } from "lucide-react";
import { Link } from "react-router";

export function PrivacyPolicyPage() {
  const lastUpdated = "September 18, 2026";

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Header */}
      <div className="border-b border-slate-200 pb-8 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full mb-3 border border-blue-100">
          <ShieldCheck className="w-4 h-4" />
          <span>Official Publisher Compliance & GDPR Notice</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          PawShield Privacy Policy
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Effective & Last Updated: {lastUpdated}
        </p>
      </div>

      <div className="prose prose-slate max-w-none space-y-8 text-slate-700 text-sm leading-relaxed">
        {/* Intro */}
        <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            1. Commitment to User Privacy
          </h2>
          <p>
            PawShield ("we", "our", or "us") is dedicated to protecting the privacy, security, and integrity of personal information collected through our marketplace platform located at PawShield. This Privacy Policy discloses our practices regarding the collection, storage, processing, and disclosure of personal data when you use our website, book pet sitting services, or interact with advertisements.
          </p>
        </section>

        {/* GOOGLE ADSENSE & ADVERTISING POLICY SECTION - STRICTLY MANDATED BY GOOGLE ADSENSE */}
        <section className="bg-amber-50/70 p-6 rounded-2xl border border-amber-200 space-y-4">
          <div className="flex items-center gap-2">
            <Cookie className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              2. Google AdSense & Third-Party Advertising Disclosures
            </h2>
          </div>
          <p className="text-slate-800 font-medium">
            This section contains mandatory disclosures required by Google LLC under the Google AdSense Publisher Policies and EU User Consent Policy.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>
              <strong>Third-Party Vendors & Google Cookies:</strong> Third-party vendors, including Google LLC, use cookies, device identifiers, and web beacons to serve advertisements based on a user's prior visits to PawShield or other websites across the Internet.
            </li>
            <li>
              <strong>DoubleClick / Advertising Cookies:</strong> Google's use of advertising cookies enables it and its certified advertising partners to serve personalized or contextual ads to our visitors based on their visit to PawShield and other destinations on the web.
            </li>
            <li>
              <strong>Personalized Advertising Opt-Out:</strong> Users may opt out of personalized advertising by visiting{" "}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noreferrer noopener"
                className="text-blue-600 font-semibold underline inline-flex items-center gap-1"
              >
                Google Ads Settings
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              . Alternatively, users may opt out of third-party vendor use of cookies for personalized advertising by visiting the Network Advertising Initiative opt-out page at{" "}
              <a
                href="https://www.aboutads.info/choices/"
                target="_blank"
                rel="noreferrer noopener"
                className="text-blue-600 font-semibold underline inline-flex items-center gap-1"
              >
                aboutads.info
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              .
            </li>
            <li>
              <strong>Clear Ad Labeling & Prohibition of Accidental Clicks:</strong> In compliance with Google AdSense terms, all advertising banners on PawShield are isolated from core navigation and booking actions and are explicitly marked with <em>"ADVERTISEMENT"</em> or <em>"SPONSORED"</em> to ensure visitors are never deceived or induced into accidental clicks.
            </li>
          </ul>
        </section>

        {/* Information We Collect */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-600" />
            3. Information We Collect
          </h2>
          <p>We collect information you provide directly to us, including:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Account details: name, verified email address, role (Pet Owner or Sitter).</li>
            <li>Pet profiles: name, species, breed, medical needs, vet contact info, feeding routines.</li>
            <li>Booking requests: service dates, addresses, care instructions, emergency contacts.</li>
            <li>Log files: Internet Protocol (IP) addresses, browser type, Internet Service Provider (ISP), date/time stamps, referring/exit pages.</li>
          </ul>
        </section>

        {/* GDPR & CCPA Rights */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            4. User Data Rights (GDPR & CCPA / CPRA)
          </h2>
          <p>
            Under the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA), you enjoy the right to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Request access to the personal data we hold about you.</li>
            <li>Request correction of inaccurate or incomplete personal records.</li>
            <li>Request erasure of your personal data ("Right to be Forgotten").</li>
            <li>Opt out of the sale or sharing of personal data for cross-context behavioral advertising.</li>
          </ul>
        </section>

        {/* Contact and Inquiries */}
        <section className="p-6 bg-slate-100/70 rounded-xl border border-slate-200">
          <h2 className="text-base font-bold text-slate-900 mb-2">5. Publisher & Privacy Contact</h2>
          <p className="text-xs text-slate-600 mb-3">
            If you have questions regarding this Privacy Policy, our Google AdSense implementation, or wish to exercise your data subject rights, please contact our Data Protection Officer:
          </p>
          <div className="text-xs font-mono text-slate-800 space-y-1">
            <p>PawShield Compliance & Data Privacy Officer</p>
            <p>Email: <a href="mailto:privacy@pawshield.local" className="text-blue-600 underline">privacy@pawshield.local</a></p>
            <p>Publisher Address: 100 Market Street, Suite 400, San Francisco, CA</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 flex gap-4 text-xs font-semibold">
            <Link to="/terms" className="text-blue-600 hover:underline">View Terms of Service</Link>
            <Link to="/contact" className="text-blue-600 hover:underline">Contact Support</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
