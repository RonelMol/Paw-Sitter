import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useNotifications, NotificationItem } from "../lib/NotificationContext";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Calendar,
  CreditCard,
  Heart,
  Shield,
  Trash2,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  Activity
} from "lucide-react";
import { cn } from "../lib/utils";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    unreadByRole,
    filterRole,
    setFilterRole,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "PET_OWNER":
        return { label: "Pet Owner", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "PET_SITTER":
        return { label: "Pet Sitter", bg: "bg-blue-50 text-blue-700 border-blue-200" };
      case "ADMIN":
        return { label: "Admin & Security", bg: "bg-purple-50 text-purple-700 border-purple-200" };
      default:
        return { label: "System", bg: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "BOOKING":
        return <Calendar className="w-4 h-4 text-emerald-600" />;
      case "PAYMENT":
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case "CARE_ACTIVITY":
        return <Heart className="w-4 h-4 text-rose-500" />;
      case "SECURITY":
      case "ACCOUNT":
        return <Shield className="w-4 h-4 text-purple-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffSecs = Math.floor((now.getTime() - past.getTime()) / 1000);
      if (diffSecs < 60) return "Just now";
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "Recent";
    }
  };

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.isRead) {
      markAsRead(n.id);
    }
    if (n.linkUrl) {
      setIsOpen(false);
      navigate(n.linkUrl);
    }
  };

  // Filter items in dropdown
  const filteredItems = notifications.filter(n => {
    if (filterRole === "ALL") return true;
    return n.targetRole === filterRole;
  });

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300",
          isOpen && "bg-slate-100 text-slate-900"
        )}
        aria-label="Notifications"
        title="View Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 min-w-[16px] px-1 bg-emerald-600 text-[10px] font-bold text-white items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs text-slate-600 hover:text-emerald-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-white"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Mark read
                </button>
              )}
            </div>
          </div>

          {/* Role Filter Tabs */}
          <div className="px-3 py-2 bg-white border-b border-slate-100 flex gap-1.5 overflow-x-auto text-xs">
            {[
              { id: "ALL", label: "All Roles", count: unreadCount },
              { id: "PET_OWNER", label: "Pet Owner", count: unreadByRole.PET_OWNER },
              { id: "PET_SITTER", label: "Pet Sitter", count: unreadByRole.PET_SITTER },
              { id: "ADMIN", label: "Admin", count: unreadByRole.ADMIN }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterRole(tab.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full whitespace-nowrap transition-all font-medium flex items-center gap-1",
                  filterRole === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                      filterRole === tab.id ? "bg-white/20 text-white" : "bg-emerald-600 text-white"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">No notifications in this view</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  When actions happen across pet care, bookings, and payments, role-specific alerts will appear here.
                </p>
                <Link
                  to="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Open Action Simulator
                </Link>
              </div>
            ) : (
              filteredItems.slice(0, 15).map(n => {
                const badge = getRoleBadge(n.targetRole);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "p-3.5 hover:bg-slate-50/90 transition-colors cursor-pointer flex gap-3 items-start relative group",
                      !n.isRead && "bg-emerald-50/30"
                    )}
                  >
                    {/* Unread Indicator Pill */}
                    {!n.isRead && (
                      <div className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
                    )}

                    {/* Type Icon */}
                    <div className="mt-0.5 p-2 rounded-xl bg-slate-100 shrink-0 border border-slate-200/60">
                      {getTypeIcon(n.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                            badge.bg
                          )}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>

                      <h4 className={cn("text-xs leading-snug text-slate-900", !n.isRead ? "font-bold" : "font-medium")}>
                        {n.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>

                      {n.linkUrl && (
                        <div className="mt-2 flex items-center text-[11px] font-medium text-emerald-600 hover:text-emerald-700">
                          View details <ChevronRight className="w-3 h-3 ml-0.5" />
                        </div>
                      )}
                    </div>

                    {/* Delete action button on hover */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                      title="Dismiss notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center flex items-center justify-between">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mx-auto py-1"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Role Notification Center & Action Simulator
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
