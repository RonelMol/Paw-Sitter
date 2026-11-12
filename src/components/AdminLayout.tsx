import { Outlet, Link, useLocation } from "react-router";
import { 
  ShieldCheck, BarChart3, Settings, ScrollText, Users, Key, ShieldAlert, 
  LogIn, Sparkles, CheckCircle2, DollarSign, Bell, Radar, Coffee, Bot, 
  Menu, X, ChevronRight, ChevronLeft, Server, Zap, Lock, Share2, Smartphone, 
  FlaskConical, Activity, Wallet, Database, Tag, Search, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen,
  Cpu
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../lib/AuthContext";
import React, { useState } from "react";

interface AdminLayoutProps {
  children?: React.ReactNode;
  activeNav?: string;
}

interface NavGroup {
  groupTitle: string;
  items: {
    name: string;
    path: string;
    icon: any;
    badge?: string;
    badgeColor?: string;
  }[];
}

export function AdminLayout({ children }: AdminLayoutProps = {}) {
  const location = useLocation();
  const { user, dbUser, loading, login, updateMyRole } = useAuth();
  const [upgrading, setUpgrading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navGroups: NavGroup[] = [
    {
      groupTitle: "Virtual Office & Real-Time Ops",
      items: [
        { name: "Virtual Office Floor Map", path: "/admin/command-center", icon: Radar, badge: "2.5D Live", badgeColor: "bg-purple-100 text-purple-800" },
        { name: "Sitter Activities", path: "/admin/activities", icon: CheckCircle2 },
        { name: "Coffee Maintenance", path: "/admin/coffee", icon: Coffee, badge: "₱150", badgeColor: "bg-amber-100 text-amber-800" },
        { name: "User Management", path: "/admin/users", icon: Users },
      ],
    },
    {
      groupTitle: "Governance & Monetization",
      items: [
        { name: "Sitter Payouts & Escrow", path: "/admin/payouts", icon: Wallet, badge: "Disburse", badgeColor: "bg-emerald-100 text-emerald-800" },
        { name: "Sitter Free Limit & Paywall", path: "/admin/sitter-paywall", icon: Lock, badge: "3-Cap", badgeColor: "bg-purple-100 text-purple-800" },
        { name: "Sitter Rates & Price Caps", path: "/admin/sitter-rates", icon: Tag, badge: "Policy", badgeColor: "bg-teal-100 text-teal-800" },
        { name: "Referral Link & Commission", path: "/admin/referrals", icon: Share2, badge: "₱250", badgeColor: "bg-emerald-100 text-emerald-800" },
        { name: "Google Analytics Dashboard", path: "/admin/google-analytics", icon: Activity, badge: "GA4 Live", badgeColor: "bg-orange-100 text-orange-800" },
        { name: "Google Search Console", path: "/admin/search-console", icon: Search, badge: "GSC Live", badgeColor: "bg-blue-100 text-blue-800" },
        { name: "Platform Fees", path: "/admin/platform-fees", icon: DollarSign },
        { name: "Google AdSense", path: "/admin/adsense", icon: Settings },
        { name: "Home Page AI & Marketing Director", path: "/admin/homepage-agent", icon: Sparkles, badge: "AI Control", badgeColor: "bg-indigo-100 text-indigo-800" },
        { name: "Role Definitions", path: "/admin/roles", icon: Key },
      ],
    },
    {
      groupTitle: "DevOps, AI & Security",
      items: [
        { name: "OWASP 2026 Cyber Security", path: "/admin/security-owasp", icon: ShieldCheck, badge: "2026 Spec", badgeColor: "bg-emerald-100 text-emerald-800" },
        { name: "CPU & Memory Process Monitor", path: "/admin/system-metrics", icon: Cpu, badge: "Real-Time", badgeColor: "bg-purple-100 text-purple-800" },
        { name: "AI Agent Command Hub", path: "/admin/ai-agents", icon: Bot, badge: "Fleet 7", badgeColor: "bg-purple-100 text-purple-800" },
        { name: "AI Mobile UI/UX Researcher", path: "/admin/ai-ux-research", icon: Smartphone, badge: "Mobile UX", badgeColor: "bg-blue-100 text-blue-800" },
        { name: "QA Testing & Playwright Suite", path: "/admin/qa-suite", icon: FlaskConical, badge: "E2E Suite", badgeColor: "bg-teal-100 text-teal-800" },
        { name: "AI QA & Bug Verifier", path: "/admin/ai-qa", icon: Zap, badge: "Dual-Agent", badgeColor: "bg-purple-100 text-purple-800" },
        { name: "AI Bug & Error Inspector", path: "/admin/bugs", icon: Bot, badge: "Historical", badgeColor: "bg-indigo-100 text-indigo-800" },
        { name: "Database & Tables Explorer", path: "/admin/database", icon: Database, badge: "Postgres", badgeColor: "bg-blue-100 text-blue-800" },
        { name: "Environment & API Keys", path: "/admin/environment", icon: Server, badge: "Config", badgeColor: "bg-emerald-100 text-emerald-800" },
        { name: "Krawl Honey-Trap", path: "/admin/krawl", icon: Radar, badge: "Active", badgeColor: "bg-rose-100 text-rose-800" },
        { name: "Role Notifications", path: "/notifications", icon: Bell },
        { name: "System Audit Logs", path: "/admin/audit-logs", icon: ScrollText },
      ],
    },
  ];

  // Flattened for mobile active title finder
  const allNavItems = navGroups.flatMap(g => g.items);
  const currentItem = allNavItems.find(item => location.pathname.startsWith(item.path)) || allNavItems[0];

  if (loading) {
    return (
      <div className="w-full px-4 py-20 flex flex-col items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full mb-4" />
        <p className="text-slate-500 text-sm font-medium">Verifying Administrator Access...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Administrator Sign-In</h2>
          <p className="text-sm text-slate-600">
            Please sign in to access the PawShield Platform Admin console.
          </p>
          <button
            onClick={() => login("ADMIN")}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" /> Sign In to Admin Console
          </button>
        </div>
      </div>
    );
  }

  if (dbUser && dbUser.role !== "ADMIN") {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Admin Role Required</h2>
          <p className="text-sm text-slate-600">
            Your account (<span className="font-semibold">{user.email}</span>) is currently set as{" "}
            <span className="font-bold text-slate-900">{dbUser.role.replace("_", " ")}</span>.
          </p>
          <button
            disabled={upgrading}
            onClick={async () => {
              setUpgrading(true);
              await updateMyRole("ADMIN");
              setUpgrading(false);
            }}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" /> 
            {upgrading ? "Promoting..." : "Switch to Admin Role"}
          </button>
          <Link
            to="/profile"
            className="block text-xs text-slate-500 hover:text-slate-800 font-medium"
          >
            Manage profile & roles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[90vh] bg-slate-50/50 py-4 sm:py-6 w-full">
      {/* Full-width responsive container spanning the viewport */}
      <div className="w-full px-3 sm:px-6 lg:px-8 xl:px-10">
        
        {/* Mobile Top Navigation Header */}
        <div className="md:hidden bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin Module</div>
                <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  {currentItem.name}
                </div>
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span>{mobileMenuOpen ? "Close" : "Modules"}</span>
            </button>
          </div>

          {/* Mobile Collapsible Navigation Menu */}
          {mobileMenuOpen && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
              {navGroups.map((group) => (
                <div key={group.groupTitle} className="space-y-1.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2">
                    {group.groupTitle}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active = location.pathname.startsWith(item.path);
                      return (
                        <Link
                          key={item.name}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors",
                            active
                              ? "bg-slate-900 text-white shadow-sm"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <item.icon className={cn("w-4 h-4", active ? "text-amber-400" : "text-slate-400")} />
                            <span>{item.name}</span>
                          </div>
                          {item.badge && (
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", item.badgeColor)}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Layout: Flexible Sidebar + Maximized Full-Width Canvas */}
        <div className="flex flex-col md:flex-row gap-5 lg:gap-6 items-start w-full">
          
          {/* Vertical Sidebar with Collapse Toggle */}
          <aside className={cn(
            "hidden md:block shrink-0 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm sticky top-20 transition-all duration-200",
            sidebarCollapsed ? "w-20" : "w-64 lg:w-72"
          )}>
            {/* Sidebar Header with Collapse / Expand button */}
            <div className={cn(
              "flex items-center justify-between pb-4 border-b border-slate-100 mb-4",
              sidebarCollapsed && "flex-col gap-2 pb-3"
            )}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                {!sidebarCollapsed && (
                  <div>
                    <h1 className="text-sm font-black text-slate-900 leading-tight">Admin Console</h1>
                    <p className="text-[10px] text-slate-400 font-medium">SecOps &amp; Governance</p>
                  </div>
                )}
              </div>

              {/* Sidebar toggle button */}
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                title={sidebarCollapsed ? "Expand Sidebar (Wider Menu)" : "Collapse Sidebar (Maximize Canvas)"}
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-teal-600" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>

            {/* Vertical Groups */}
            <div className="space-y-5">
              {navGroups.map((group) => (
                <div key={group.groupTitle} className="space-y-1">
                  {!sidebarCollapsed && (
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 py-0.5">
                      {group.groupTitle}
                    </div>
                  )}
                  <nav className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = location.pathname.startsWith(item.path);
                      return (
                        <Link
                          key={item.name}
                          to={item.path}
                          title={sidebarCollapsed ? item.name : undefined}
                          className={cn(
                            "group flex items-center rounded-2xl text-xs font-bold transition-all",
                            sidebarCollapsed 
                              ? "justify-center p-2.5" 
                              : "justify-between px-3 py-2",
                            active
                              ? "bg-slate-900 text-white shadow-xs"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          )}
                        >
                          <div className={cn("flex items-center", !sidebarCollapsed && "gap-2.5")}>
                            <item.icon
                              className={cn(
                                "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                                active ? "text-amber-400" : "text-slate-400 group-hover:text-slate-700"
                              )}
                            />
                            {!sidebarCollapsed && <span>{item.name}</span>}
                          </div>

                          {!sidebarCollapsed && item.badge && (
                            <span
                              className={cn(
                                "text-[9px] px-1.5 py-0.2 rounded-full font-bold",
                                active ? "bg-slate-800 text-amber-300 border border-slate-700" : item.badgeColor
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>

            {/* Bottom Status Info */}
            {!sidebarCollapsed && (
              <div className="mt-6 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Full Width Mode
                </span>
                <span className="font-mono text-[9px] text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                  Maximized
                </span>
              </div>
            )}
          </aside>

          {/* Maximized Main Content Canvas */}
          <main className="flex-1 min-w-0 w-full">
            {children || <Outlet />}
          </main>

        </div>
      </div>
    </div>
  );
}
