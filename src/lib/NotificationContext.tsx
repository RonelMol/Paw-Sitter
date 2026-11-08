import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

export interface NotificationItem {
  id: number;
  userId: number;
  targetRole: "PET_OWNER" | "PET_SITTER" | "ADMIN" | "SUPPORT_AGENT" | "ALL";
  title: string;
  message: string;
  type: "BOOKING" | "PAYMENT" | "CARE_ACTIVITY" | "ACCOUNT" | "SECURITY" | "SYSTEM";
  actionType: string;
  entityType?: string;
  entityId?: number;
  linkUrl?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  unreadByRole: Record<string, number>;
  loading: boolean;
  filterRole: string;
  setFilterRole: (role: string) => void;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: (role?: string) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
  simulateAction: (actionKey: string, customTitle?: string, customMessage?: string) => Promise<any>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadByRole, setUnreadByRole] = useState<Record<string, number>>({
    PET_OWNER: 0,
    PET_SITTER: 0,
    ADMIN: 0,
    ALL: 0
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [filterRole, setFilterRole] = useState<string>("ALL");

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      if (!silent) setLoading(true);
      const token = await user.getIdToken();
      const roleParam = filterRole !== "ALL" ? `&role=${filterRole}` : "";
      const res = await fetch(`/api/notifications?limit=60${roleParam}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setUnreadByRole(data.unreadByRole || { PET_OWNER: 0, PET_SITTER: 0, ADMIN: 0, ALL: 0 });
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, filterRole]);

  // Initial fetch and on auth or filter change
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Polling every 15 seconds for real-time responsiveness
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const markAsRead = async (id: number) => {
    if (!user) return;
    try {
      const target = notifications.find(n => n.id === id);
      if (target && target.isRead) return;

      // Optimistic update
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      if (target?.targetRole) {
        const role = target.targetRole;
        setUnreadByRole(prev => ({
          ...prev,
          [role]: Math.max(0, (prev[role] || 0) - 1),
          ALL: Math.max(0, (prev.ALL || 0) - 1),
        }));
      }

      const token = await user.getIdToken();
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        // Sync server counts silently
        fetchNotifications(true);
      }
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const markAllAsRead = async (role?: string) => {
    if (!user) return;
    try {
      const targetRole = role || filterRole;
      setNotifications(prev =>
        prev.map(n => (targetRole === "ALL" || n.targetRole === targetRole ? { ...n, isRead: true } : n))
      );
      
      if (targetRole === "ALL") {
        setUnreadCount(0);
        setUnreadByRole({ PET_OWNER: 0, PET_SITTER: 0, ADMIN: 0, ALL: 0 });
      } else {
        setUnreadByRole(prev => ({
          ...prev,
          [targetRole]: 0,
          ALL: Math.max(0, (prev.ALL || 0) - (prev[targetRole] || 0))
        }));
        setUnreadCount(prev => Math.max(0, prev - (unreadByRole[targetRole] || 0)));
      }

      const token = await user.getIdToken();
      await fetch(`/api/notifications/read-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: targetRole })
      });
      fetchNotifications(true);
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  const deleteNotification = async (id: number) => {
    if (!user) return;
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      const token = await user.getIdToken();
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications(true);
    } catch (err) {
      console.error("Delete notification error:", err);
    }
  };

  const clearAll = async () => {
    if (!user) return;
    try {
      setNotifications([]);
      setUnreadCount(0);
      const token = await user.getIdToken();
      await fetch(`/api/notifications/clear-all/all`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Clear all error:", err);
    }
  };

  const simulateAction = async (actionKey: string, customTitle?: string, customMessage?: string) => {
    if (!user) throw new Error("Please log in to test role notifications");
    const token = await user.getIdToken();
    const res = await fetch(`/api/notifications/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ action: actionKey, customTitle, customMessage })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Simulation failed");
    }

    const data = await res.json();
    await fetchNotifications(true);
    return data;
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        unreadByRole,
        loading,
        filterRole,
        setFilterRole,
        refreshNotifications: () => fetchNotifications(false),
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        simulateAction
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
