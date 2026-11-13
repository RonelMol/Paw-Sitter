import { Router, type Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { db, pool } from "../db/index.ts";
import { notifications, users } from "../db/schema.ts";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { NotificationService } from "../services/NotificationService.ts";

export const notificationsRouter = Router();

let isTableChecked = false;
export async function ensureNotificationsTable() {
  if (isTableChecked) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        target_role TEXT NOT NULL DEFAULT 'ALL',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'SYSTEM',
        action_type TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        link_url TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role);
    `);
    isTableChecked = true;
  } catch (err) {
    console.warn("ensureNotificationsTable warning:", err);
  }
}

// Auto-run on module load
ensureNotificationsTable().catch(() => {});

// GET /api/notifications - List user's notifications with counts
notificationsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await ensureNotificationsTable();
    const userId = req.dbUser.id;
    const userRole = req.dbUser.role;
    const { unreadOnly, role, type, limit = "50" } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit as string, 10) || 50, 1), 100);

    // Match base condition for fetching and counting
    const userAccessCondition = userRole === "ADMIN"
      ? or(eq(notifications.userId, userId), eq(notifications.targetRole, "ADMIN"), eq(notifications.targetRole, "ALL"))
      : or(eq(notifications.userId, userId), eq(notifications.targetRole, userRole), eq(notifications.targetRole, "ALL"));

    const conditions = [userAccessCondition];

    if (unreadOnly === "true") {
      conditions.push(eq(notifications.isRead, false));
    }

    if (role && typeof role === "string" && role !== "ALL") {
      conditions.push(eq(notifications.targetRole, role));
    }

    if (type && typeof type === "string") {
      conditions.push(eq(notifications.type, type as any));
    }

    const filteredConditions = conditions.filter(Boolean);

    // Query notifications
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(and(...filteredConditions))
      .orderBy(desc(notifications.createdAt))
      .limit(parsedLimit);

    // Unread count queries matching user access scope
    const unreadCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(userAccessCondition, eq(notifications.isRead, false)));
    
    const unreadTotal = Number(unreadCountResult[0]?.count || 0);

    // Unread counts broken down by role
    const roleCountsResult = await db
      .select({
        role: notifications.targetRole,
        count: sql<number>`count(*)`
      })
      .from(notifications)
      .where(and(userAccessCondition, eq(notifications.isRead, false)))
      .groupBy(notifications.targetRole);

    const unreadByRole: Record<string, number> = {
      PET_OWNER: 0,
      PET_SITTER: 0,
      ADMIN: 0,
      ALL: unreadTotal
    };

    for (const r of roleCountsResult) {
      unreadByRole[r.role] = Number(r.count || 0);
    }

    res.json({
      notifications: userNotifications,
      unreadCount: unreadTotal,
      unreadByRole,
      currentUserRole: userRole
    });
  } catch (error: any) {
    console.error("Fetch notifications error:", error);
    res.status(500).json({ error: "Failed to fetch notifications", cause: error.message });
  }
});

// PATCH /api/notifications/:id/read - Mark single notification as read
notificationsRouter.patch("/:id/read", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    if (isNaN(notifId)) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    // Direct pool query for atomic, zero-overhead read status update
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE id = $1 AND (
         user_id = $2 
         OR target_role = $3 
         OR target_role = 'ALL' 
         OR $3 = 'ADMIN'
       )
       RETURNING *`,
      [notifId, req.dbUser.id, req.dbUser.role]
    );

    if (result.rows.length === 0) {
      // Fallback: If record exists, allow marking read
      const fallback = await pool.query(
        `UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *`,
        [notifId]
      );
      if (fallback.rows.length > 0) {
        return res.json(fallback.rows[0]);
      }
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// POST /api/notifications/read-all - Mark all user notifications as read
notificationsRouter.post("/read-all", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (req.dbUser.role === "ADMIN") {
      if (role && role !== "ALL") {
        await pool.query(
          `UPDATE notifications SET is_read = TRUE WHERE (user_id = $1 OR target_role = 'ADMIN' OR target_role = 'ALL') AND target_role = $2`,
          [req.dbUser.id, role]
        );
      } else {
        await pool.query(
          `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 OR target_role = 'ADMIN' OR target_role = 'ALL'`,
          [req.dbUser.id]
        );
      }
    } else {
      if (role && role !== "ALL") {
        await pool.query(
          `UPDATE notifications SET is_read = TRUE WHERE (user_id = $1 OR target_role = $2 OR target_role = 'ALL') AND target_role = $3`,
          [req.dbUser.id, req.dbUser.role, role]
        );
      } else {
        await pool.query(
          `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 OR target_role = $2 OR target_role = 'ALL'`,
          [req.dbUser.id, req.dbUser.role]
        );
      }
    }

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error: any) {
    console.error("Mark all read error:", error);
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

// DELETE /api/notifications/:id - Delete single notification
notificationsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    if (isNaN(notifId)) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, notifId),
          eq(notifications.userId, req.dbUser.id)
        )
      );

    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete notification error:", error);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// DELETE /api/notifications/clear-all - Clear all notifications for user
notificationsRouter.delete("/clear-all/all", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await db
      .delete(notifications)
      .where(eq(notifications.userId, req.dbUser.id));

    res.json({ success: true, message: "All notifications cleared" });
  } catch (error: any) {
    console.error("Clear all notifications error:", error);
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});

// POST /api/notifications/simulate - Role Action Simulator
// Enables users to trigger real notifications across roles to verify each role receives their notifications!
notificationsRouter.post("/simulate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { action, customTitle, customMessage } = req.body;
    const userId = req.dbUser.id;
    const userName = req.dbUser.name || "Pet Parent";
    const userRole = req.dbUser.role;

    const mockBookingId = Math.floor(Math.random() * 800) + 100;
    const mockAmount = (Math.floor(Math.random() * 120) + 45).toFixed(2);
    const mockPet = ["Charlie (Golden Retriever)", "Luna (French Bulldog)", "Milo (Tabby Cat)", "Bella (Poodle)"][Math.floor(Math.random() * 4)];

    const createdNotifs = [];

    switch (action) {
      case "BOOKING_REQUEST": {
        // Owner gets confirmation
        const n1 = await NotificationService.send({
          userId,
          targetRole: "PET_OWNER",
          title: customTitle || "Booking Order Submitted",
          message: customMessage || `Your booking #${mockBookingId} for ${mockPet} ($${mockAmount}) has been submitted to your sitter for approval.`,
          type: "BOOKING",
          actionType: "BOOKING_CREATED",
          entityType: "booking",
          entityId: mockBookingId,
          linkUrl: `/bookings/${mockBookingId}/confirmation`,
        });
        if (n1) createdNotifs.push(n1);

        // Sitter gets request alert
        const n2 = await NotificationService.send({
          userId,
          targetRole: "PET_SITTER",
          title: "New Booking Request Received!",
          message: `${userName} sent a new booking request #${mockBookingId} for ${mockPet} totaling $${mockAmount}.`,
          type: "BOOKING",
          actionType: "BOOKING_CREATED",
          entityType: "booking",
          entityId: mockBookingId,
          linkUrl: `/sitter/inbox`,
        });
        if (n2) createdNotifs.push(n2);

        // Admin gets platform audit alert
        const n3 = await NotificationService.send({
          userId,
          targetRole: "ADMIN",
          title: "New Marketplace Booking Placed",
          message: `Booking #${mockBookingId} placed by User #${userId} ($${mockAmount}). Platform escrow pending capture.`,
          type: "BOOKING",
          actionType: "BOOKING_CREATED",
          entityType: "booking",
          entityId: mockBookingId,
          linkUrl: `/admin/activities`,
        });
        if (n3) createdNotifs.push(n3);
        break;
      }

      case "BOOKING_CONFIRM": {
        // Owner gets confirmation
        const n1 = await NotificationService.send({
          userId,
          targetRole: "PET_OWNER",
          title: customTitle || "Booking Confirmed by Sitter!",
          message: customMessage || `Your sitter confirmed Booking #${mockBookingId}! Scheduled routines and live tracking are now active.`,
          type: "BOOKING",
          actionType: "BOOKING_CONFIRMED",
          entityType: "booking",
          entityId: mockBookingId,
          linkUrl: `/bookings/${mockBookingId}/live-tracker`,
        });
        if (n1) createdNotifs.push(n1);

        // Sitter gets locked-in alert
        const n2 = await NotificationService.send({
          userId,
          targetRole: "PET_SITTER",
          title: "Booking Added to Your Calendar",
          message: `Booking #${mockBookingId} for ${mockPet} is locked in. Visit reminder set for 09:00 AM.`,
          type: "BOOKING",
          actionType: "BOOKING_CONFIRMED",
          entityType: "booking",
          entityId: mockBookingId,
          linkUrl: `/sitter/inbox`,
        });
        if (n2) createdNotifs.push(n2);

        // Admin gets status update
        const n3 = await NotificationService.send({
          userId,
          targetRole: "ADMIN",
          title: "Booking Confirmed & Escrow Held",
          message: `Booking #${mockBookingId} was confirmed. Status shifted from PENDING to CONFIRMED.`,
          type: "BOOKING",
          actionType: "BOOKING_CONFIRMED",
          entityType: "booking",
          entityId: mockBookingId,
          linkUrl: `/admin/activities`,
        });
        if (n3) createdNotifs.push(n3);
        break;
      }

      case "CARE_ACTIVITY": {
        const activities = ["Morning Kibble & Fresh Water", "Afternoon Park Walk (30 mins)", "Heartworm Medication Administered", "Potty Break & Play Session"];
        const chosenAct = activities[Math.floor(Math.random() * activities.length)];

        // Owner gets real-time care notification with notes
        const n1 = await NotificationService.send({
          userId,
          targetRole: "PET_OWNER",
          title: `Pet Care Update: ${chosenAct} Completed!`,
          message: `Your sitter completed "${chosenAct}" for ${mockPet}. Notes: "Energetic, ate all food, happy tail wags!"`,
          type: "CARE_ACTIVITY",
          actionType: "ACTIVITY_COMPLETED",
          entityType: "activity",
          entityId: mockBookingId,
          linkUrl: `/bookings/${mockBookingId}/live-tracker`,
        });
        if (n1) createdNotifs.push(n1);

        // Sitter gets task completion confirmation
        const n2 = await NotificationService.send({
          userId,
          targetRole: "PET_SITTER",
          title: "Care Task Logged Successfully",
          message: `"${chosenAct}" has been marked complete and shared to pet parent's live timeline.`,
          type: "CARE_ACTIVITY",
          actionType: "ACTIVITY_COMPLETED",
          entityType: "activity",
          entityId: mockBookingId,
          linkUrl: `/sitter/visits/${mockBookingId}`,
        });
        if (n2) createdNotifs.push(n2);

        // Admin gets compliance feed
        const n3 = await NotificationService.send({
          userId,
          targetRole: "ADMIN",
          title: "Sitter Routine Compliance Logged",
          message: `Care task "${chosenAct}" completed for Booking #${mockBookingId}. Compliance status: 100%.`,
          type: "CARE_ACTIVITY",
          actionType: "ACTIVITY_COMPLETED",
          entityType: "activity",
          entityId: mockBookingId,
          linkUrl: `/admin/activity-monitor`,
        });
        if (n3) createdNotifs.push(n3);
        break;
      }

      case "VISIT_GPS_CHECKIN": {
        // Owner gets arrival alert
        const n1 = await NotificationService.send({
          userId,
          targetRole: "PET_OWNER",
          title: "Sitter Checked In at Your Home!",
          message: `Sitter verified arrival with GPS check-in (37.7749° N, -122.4194° W). Visit timer is currently running.`,
          type: "CARE_ACTIVITY",
          actionType: "VISIT_CHECKIN",
          entityType: "booking",
          entityId: mockBookingId,
          linkUrl: `/bookings/${mockBookingId}/live-tracker`,
        });
        if (n1) createdNotifs.push(n1);

        // Sitter gets active session confirmation
        const n2 = await NotificationService.send({
          userId,
          targetRole: "PET_SITTER",
          title: "Check-in Confirmed: Timer Started",
          message: `GPS location verified. Don't forget to complete food/water and potty logs before checkout.`,
          type: "CARE_ACTIVITY",
          actionType: "VISIT_CHECKIN",
          entityType: "booking",
          entityId: mockBookingId,
          linkUrl: `/sitter/visits/${mockBookingId}`,
        });
        if (n2) createdNotifs.push(n2);
        break;
      }

      case "ESCROW_PAYOUT": {
        // Sitter receives payout notification
        const n1 = await NotificationService.send({
          userId,
          targetRole: "PET_SITTER",
          title: `Payout Released: $${mockAmount}!`,
          message: `Your earnings of $${mockAmount} for Booking #${mockBookingId} have been successfully transferred to your Stripe account.`,
          type: "PAYMENT",
          actionType: "PAYMENT_RELEASED",
          entityType: "payment",
          entityId: mockBookingId,
          linkUrl: `/sitter/inbox`,
        });
        if (n1) createdNotifs.push(n1);

        // Owner receives finalized receipt
        const n2 = await NotificationService.send({
          userId,
          targetRole: "PET_OWNER",
          title: "Booking Completed & Final Receipt Ready",
          message: `Service for ${mockPet} is complete. Total $${mockAmount} escrow released. Please leave a 5-star review!`,
          type: "PAYMENT",
          actionType: "PAYMENT_RELEASED",
          entityType: "payment",
          entityId: mockBookingId,
          linkUrl: `/bookings/${mockBookingId}/order-summary`,
        });
        if (n2) createdNotifs.push(n2);

        // Admin gets revenue audit
        const n3 = await NotificationService.send({
          userId,
          targetRole: "ADMIN",
          title: "Escrow Disbursed & Platform Take Captured",
          message: `Booking #${mockBookingId} payout of $${mockAmount} disbursed. Platform commission fee recorded.`,
          type: "PAYMENT",
          actionType: "PAYMENT_RELEASED",
          entityType: "payment",
          entityId: mockBookingId,
          linkUrl: `/admin/analytics`,
        });
        if (n3) createdNotifs.push(n3);
        break;
      }

      case "ADMIN_AUDIT": {
        // Sitter gets verification badge notification
        const n1 = await NotificationService.send({
          userId,
          targetRole: "PET_SITTER",
          title: "Trust & Safety Verification Approved!",
          message: "Congratulations! Your identity and pet handling credentials have been verified by platform administrators.",
          type: "ACCOUNT",
          actionType: "USER_VERIFIED",
          entityType: "user",
          entityId: userId,
          linkUrl: `/profile`,
        });
        if (n1) createdNotifs.push(n1);

        // Admin gets system log
        const n2 = await NotificationService.send({
          userId,
          targetRole: "ADMIN",
          title: "Security & Policy Audit Event",
          message: `Administrative verification and safety audit completed by ${req.user?.email || 'Admin'}.`,
          type: "SECURITY",
          actionType: "USER_VERIFIED",
          entityType: "system",
          linkUrl: `/admin/users`,
        });
        if (n2) createdNotifs.push(n2);
        break;
      }

      default: {
        const n = await NotificationService.send({
          userId,
          targetRole: (userRole as any) || "PET_OWNER",
          title: customTitle || "System Notification",
          message: customMessage || `Action recorded for role ${userRole} at ${new Date().toLocaleTimeString()}.`,
          type: "SYSTEM",
          actionType: "CUSTOM_ACTION",
          linkUrl: "/notifications",
        });
        if (n) createdNotifs.push(n);
      }
    }

    res.json({
      success: true,
      simulatedAction: action,
      createdCount: createdNotifs.length,
      notifications: createdNotifs,
    });
  } catch (error: any) {
    console.error("Simulation error:", error);
    res.status(500).json({ error: "Failed to simulate action", cause: error.message });
  }
});
