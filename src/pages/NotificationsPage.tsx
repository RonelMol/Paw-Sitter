import React, { useState } from "react";
import { Link } from "react-router";
import { useNotifications, NotificationItem } from "../lib/NotificationContext";
import { useToast } from "../components/ToastContext";
import { useAuth } from "../lib/AuthContext";
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  Calendar,
  CreditCard,
  Heart,
  Shield,
  Clock,
  Sparkles,
  Play,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Info,
  MapPin,
  Dog,
  Lock,
  ChevronRight
} from "lucide-react";
import { cn } from "../lib/utils";

export function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    unreadByRole,
    loading,
    filterRole,
    setFilterRole,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    simulateAction
  } = useNotifications();

  const { toast } = useToast();
  const { dbUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);

  // Role action simulator triggers
  const handleSimulate = async (actionKey: string, label: string) => {
    try {
      setSimulating(actionKey);
      await simulateAction(actionKey);
      toast({
        title: "Action Dispatched!",
        description: `Simulated "${label}". Relevant role notifications generated instantly.`,
        type: "success"
      });
    } catch (err: any) {
      toast({
        title: "Simulation Failed",
        description: err.message || "Could not trigger action.",
        type: "error"
      });
    } finally {
      setSimulating(null);
    }
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case "PET_OWNER":
        return {
          label: "Pet Owner Alert",
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
          ring: "ring-emerald-500/20"
        };
      case "PET_SITTER":
        return {
          label: "Pet Sitter Alert",
          badge: "bg-blue-50 text-blue-700 border-blue-200",
          ring: "ring-blue-500/20"
        };
      case "ADMIN":
        return {
          label: "Admin & Security Alert",
          badge: "bg-purple-50 text-purple-700 border-purple-200",
          ring: "ring-purple-500/20"
        };
      default:
        return {
          label: "System Alert",
          badge: "bg-slate-100 text-slate-700 border-slate-200",
          ring: "ring-slate-500/20"
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "BOOKING":
        return <Calendar className="w-5 h-5 text-emerald-600" />;
      case "PAYMENT":
        return <CreditCard className="w-5 h-5 text-blue-600" />;
      case "CARE_ACTIVITY":
        return <Heart className="w-5 h-5 text-rose-500" />;
      case "SECURITY":
      case "ACCOUNT":
        return <Shield className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  // Filter list
  const filteredNotifications = notifications.filter(n => {
    // Role filter
    if (filterRole !== "ALL" && n.targetRole !== filterRole) return false;
    // Type filter
    if (selectedType !== "ALL" && n.type !== selectedType) return false;
    // Unread only
    if (unreadOnly && n.isRead) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.actionType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Role Notification & Activity Hub
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Every role receives tailored notifications for every action across reservations, pet care routines, escrow, and admin audits.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => refreshNotifications()}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Refresh feed"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </button>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear all notifications?")) {
                  clearAll();
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Simulator Card: Interactive Role-Action Trigger Bar */}
      <div className="my-6 p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Real-Time Role Action Simulator
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">
              Test Role Notifications Across Every Action
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              Click any action below to trigger instant, realistic notifications for each role (Pet Owner, Sitter, and Admin). Watch the notification bell update live.
            </p>
          </div>

          {/* Action Simulation Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 shrink-0">
            <button
              disabled={simulating !== null}
              onClick={() => handleSimulate("BOOKING_REQUEST", "Booking Submitted")}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                <Calendar className="w-3.5 h-3.5" />
                <span>1. Booking Request</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Owner books sitter</p>
            </button>

            <button
              disabled={simulating !== null}
              onClick={() => handleSimulate("BOOKING_CONFIRM", "Booking Confirmed")}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>2. Sitter Confirms</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Locks in routine</p>
            </button>

            <button
              disabled={simulating !== null}
              onClick={() => handleSimulate("VISIT_GPS_CHECKIN", "GPS Check-In")}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <MapPin className="w-3.5 h-3.5" />
                <span>3. GPS Arrival</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Live timer alert</p>
            </button>

            <button
              disabled={simulating !== null}
              onClick={() => handleSimulate("CARE_ACTIVITY", "Pet Care Logged")}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                <Heart className="w-3.5 h-3.5" />
                <span>4. Care Log (Feed/Walk)</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Photo & notes sent</p>
            </button>

            <button
              disabled={simulating !== null}
              onClick={() => handleSimulate("ESCROW_PAYOUT", "Escrow Released")}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                <CreditCard className="w-3.5 h-3.5" />
                <span>5. Escrow Payout</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Sitter paid, receipt</p>
            </button>

            <button
              disabled={simulating !== null}
              onClick={() => handleSimulate("ADMIN_AUDIT", "Admin Verification")}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                <Shield className="w-3.5 h-3.5" />
                <span>6. Admin Audit</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">Trust badge granted</p>
            </button>
          </div>
        </div>
      </div>

      {/* Role Tabs and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Role Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "All Roles", count: unreadCount },
            { id: "PET_OWNER", label: "Pet Owner", count: unreadByRole.PET_OWNER },
            { id: "PET_SITTER", label: "Pet Sitter", count: unreadByRole.PET_SITTER },
            { id: "ADMIN", label: "Admin & Security", count: unreadByRole.ADMIN }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterRole(tab.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap",
                filterRole === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold",
                    filterRole === tab.id ? "bg-white/20 text-white" : "bg-emerald-600 text-white"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Secondary Category Filters */}
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-slate-300"
          >
            <option value="ALL">All Categories</option>
            <option value="BOOKING">Bookings</option>
            <option value="CARE_ACTIVITY">Pet Care & Activities</option>
            <option value="PAYMENT">Payments & Escrow</option>
            <option value="ACCOUNT">Account & Roles</option>
            <option value="SECURITY">Security & Admin</option>
          </select>

          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-semibold border transition-colors",
              unreadOnly
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            Unread Only
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search notifications by title, notes, or booking reference..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-sm"
        />
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Notifications Found</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              No notifications match your current filter criteria. Use the Action Simulator above to generate real-time alerts for any role!
            </p>
          </div>
        ) : (
          filteredNotifications.map(n => {
            const roleStyle = getRoleStyle(n.targetRole);
            return (
              <div
                key={n.id}
                className={cn(
                  "p-4 sm:p-5 rounded-2xl bg-white border transition-all hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                  n.isRead ? "border-slate-200/80" : "border-emerald-300 bg-emerald-50/20 shadow-sm"
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Category Icon */}
                  <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                    {getTypeIcon(n.type)}
                  </div>

                  {/* Body */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-[11px] font-bold px-2.5 py-0.5 rounded-full border", roleStyle.badge)}>
                        {roleStyle.label}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {n.actionType.replace(/_/g, " ")}
                      </span>
                      {!n.isRead && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "}
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className={cn("text-sm sm:text-base text-slate-900", !n.isRead ? "font-bold" : "font-semibold")}>
                      {n.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {n.linkUrl && (
                    <Link
                      to={n.linkUrl}
                      onClick={() => !n.isRead && markAsRead(n.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      View <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {!n.isRead && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Read
                    </button>
                  )}

                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Dismiss"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Role Architecture Documentation Guide */}
      <div className="mt-12 p-6 sm:p-8 bg-slate-50 rounded-3xl border border-slate-200">
        <div className="flex items-center gap-2.5 mb-4">
          <Info className="w-5 h-5 text-slate-700" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Role Notification Matrix: What Each Role Receives on Every Action
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed text-slate-600">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2 text-emerald-700">
              <Heart className="w-4 h-4" /> 1. Pet Owner
            </div>
            <ul className="space-y-1.5 list-disc list-inside">
              <li><strong>Booking Placed:</strong> Confirmation and total fee snapshot.</li>
              <li><strong>Sitter Acceptance:</strong> Notice that booking is confirmed.</li>
              <li><strong>Arrival Check-In:</strong> Live GPS notification when sitter arrives at home.</li>
              <li><strong>Care Tasks:</strong> Feeding, walking, and medication photos & notes in real-time.</li>
              <li><strong>Completion:</strong> Service concluded, escrow release receipt.</li>
            </ul>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2 text-blue-700">
              <Calendar className="w-4 h-4" /> 2. Pet Sitter
            </div>
            <ul className="space-y-1.5 list-disc list-inside">
              <li><strong>New Request:</strong> Instant alert with dates, pet details, and payout.</li>
              <li><strong>Escrow Guarantee:</strong> Notification that owner funds are secured.</li>
              <li><strong>Visit Routine:</strong> Checklist and timer reminders during the booking.</li>
              <li><strong>Task Confirmed:</strong> Confirmation that care logs are published.</li>
              <li><strong>Payout Disbursed:</strong> Stripe payout confirmation upon completion.</li>
            </ul>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2 text-purple-700">
              <Shield className="w-4 h-4" /> 3. Admin & Security
            </div>
            <ul className="space-y-1.5 list-disc list-inside">
              <li><strong>Marketplace Oversight:</strong> Every reservation placed across the platform.</li>
              <li><strong>Care Compliance:</strong> Audit feed of sitter task completion rate.</li>
              <li><strong>Escrow & Revenue:</strong> Notifications of platform take-rate captures.</li>
              <li><strong>User Role Audit:</strong> Administrative credential & badge updates.</li>
              <li><strong>Policy Changes:</strong> Platform fee modifications logged automatically.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
