import React from "react";
import { Link } from "react-router";
import { Mail, ExternalLink, Shield, Globe } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { useAuth } from "../lib/AuthContext";
import { useCurrency } from "../lib/CurrencyContext";

export function Footer() {
  const { user, dbUser } = useAuth();
  const { currencyConfig } = useCurrency();
  const isSitterOrAdmin = dbUser?.role === "PET_SITTER" || dbUser?.role === "ADMIN";

  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 text-sm mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Col */}
          <div className="space-y-3">
            <BrandLogo showTagline={true} size="md" />
            <p className="text-xs text-slate-500 leading-relaxed pt-1">
              A verified two-sided pet sitting marketplace connecting loving pet parents with screened, insured local sitters.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Identity Verified & Insured Network</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Platform Currency: <strong>{currencyConfig.code} ({currencyConfig.symbol})</strong></span>
            </div>
          </div>

          {/* Quick Links - AdSense Compliant based on user auth */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">Explore Services</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/search" className="hover:text-slate-900 transition-colors">
                  Find Pet Sitters & Dog Walkers
                </Link>
              </li>
              <li>
                <Link to="/guides" className="hover:text-purple-700 font-semibold transition-colors flex items-center gap-1 text-purple-600">
                  <span>Pet Care Knowledge Hub & Guides</span>
                </Link>
              </li>
              <li>
                <Link to="/become-a-sitter" className="hover:text-slate-900 transition-colors">
                  Become a Verified Sitter & Member
                </Link>
              </li>
              <li>
                <Link to="/qa-testing" className="hover:text-emerald-600 transition-colors flex items-center gap-1 font-medium text-emerald-700">
                  <span>QA Testing Suite</span>
                </Link>
              </li>
              {user && isSitterOrAdmin ? (
                <>
                  <li>
                    <Link to="/sitter/rates" className="hover:text-slate-900 transition-colors">
                      Sitter Rate Card Calculator
                    </Link>
                  </li>
                  <li>
                    <Link to="/sitter/inbox" className="hover:text-slate-900 transition-colors">
                      Sitter Inbox & Schedule
                    </Link>
                  </li>
                  {dbUser?.role === "ADMIN" && (
                    <li>
                      <Link to="/admin/krawl" className="hover:text-emerald-700 font-semibold transition-colors flex items-center gap-1 text-emerald-600">
                        <span>Krawl Honey-Trap Monitor</span>
                        <span className="text-[9px] bg-emerald-50 border border-emerald-200 px-1 rounded">Active</span>
                      </Link>
                    </li>
                  )}
                </>
              ) : (
                <>
                  <li>
                    <Link to="/terms" className="hover:text-slate-900 transition-colors">
                      Safety & Escrow Guarantee
                    </Link>
                  </li>
                  <li>
                    <Link to="/about" className="hover:text-slate-900 transition-colors">
                      How Booking Rates Work
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Legal & AdSense Compliance Policies */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">Legal & Compliance</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/privacy" className="hover:text-blue-600 font-medium transition-colors flex items-center gap-1">
                  Privacy Policy & AdSense Notice
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-slate-900 transition-colors">
                  Terms of Service & Escrow Rules
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-slate-900 transition-colors">
                  About Us & Editorial Standards
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-slate-900 transition-colors">
                  Contact Support & Publisher Inquiries
                </Link>
              </li>
            </ul>
          </div>

          {/* Monetization & Advertising Transparency */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">AdSense Transparency</h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Monetized through service fees and non-intrusive Google AdSense display advertising. Advertisements are labeled and served in compliance with Google AdSense Publisher Policies.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Contact: support@pawshield.local</span>
            </div>
            <div className="mt-2">
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noreferrer noopener"
                className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Google Ad Personalization Settings
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} PawShield. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link to="/guides" className="hover:text-slate-700">Guides</Link>
            <Link to="/privacy" className="hover:text-slate-700">Privacy</Link>
            <Link to="/terms" className="hover:text-slate-700">Terms</Link>
            <Link to="/about" className="hover:text-slate-700">About</Link>
            <Link to="/contact" className="hover:text-slate-700">Contact</Link>
            <a href="/llms.txt" className="text-purple-600 hover:text-purple-800 font-mono">
              llms.txt
            </a>
            <a href="/sitemap.xml" className="text-slate-500 hover:text-slate-700 font-mono">
              sitemap.xml
            </a>
            <a href="/ads.txt" className="text-slate-500 hover:text-slate-700 font-mono">
              ads.txt
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
