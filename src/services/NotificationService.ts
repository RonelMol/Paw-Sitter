import { db, pool } from "../db/index.ts";
import { notifications, users, bookings } from "../db/schema.ts";
import { eq, desc, and, inArray, sql } from "drizzle-orm";

export interface CreateNotificationParams {
  userId: number;
  targetRole: "PET_OWNER" | "PET_SITTER" | "ADMIN" | "SUPPORT_AGENT" | "ALL";
  title: string;
  message: string;
  type: "BOOKING" | "PAYMENT" | "CARE_ACTIVITY" | "ACCOUNT" | "SECURITY" | "SYSTEM";
  actionType: string;
  entityType?: "booking" | "activity" | "payment" | "user" | "system" | "platform";
  entityId?: number;
  linkUrl?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Insert a single targeted notification
   */
  static async send(params: CreateNotificationParams) {
    try {
      const result = await db.insert(notifications).values({
        userId: params.userId,
        targetRole: params.targetRole,
        title: params.title,
        message: params.message,
        type: params.type,
        actionType: params.actionType,
        entityType: params.entityType,
        entityId: params.entityId,
        linkUrl: params.linkUrl,
        metadata: params.metadata || {},
      }).returning();
      return result[0];
    } catch (error) {
      console.error("Failed to send notification:", error);
      return null;
    }
  }

  /**
   * Broadcast a notification to all users matching a target role (e.g. all ADMINs)
   */
  static async broadcastToRole(role: "ADMIN" | "PET_SITTER" | "PET_OWNER", params: Omit<CreateNotificationParams, "userId" | "targetRole">) {
    try {
      const targetUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, role));
      if (!targetUsers.length) return [];

      const payload = targetUsers.map(u => ({
        userId: u.id,
        targetRole: role,
        title: params.title,
        message: params.message,
        type: params.type,
        actionType: params.actionType,
        entityType: params.entityType,
        entityId: params.entityId,
        linkUrl: params.linkUrl,
        metadata: params.metadata || {},
      }));

      const inserted = await db.insert(notifications).values(payload).returning();
      return inserted;
    } catch (error) {
      console.error(`Failed to broadcast notification to role ${role}:`, error);
      return [];
    }
  }

  /**
   * Action: New Booking Created
   * - Pet Owner gets confirmation alert
   * - Pet Sitter gets new reservation request
   * - Admin gets oversight notice
   */
  static async onBookingCreated(booking: any, ownerUser: any, sitterUser: any) {
    const formattedAmount = (booking.totalAmount / 100).toFixed(2);
    const bookingLink = `/bookings/${booking.id}/confirmation`;
    const sitterLink = `/sitter/inbox`;
    const adminLink = `/admin/activities`;

    // 1. Alert Pet Owner
    await this.send({
      userId: ownerUser.id,
      targetRole: "PET_OWNER",
      title: "Booking Order Submitted",
      message: `Your booking request #${booking.id} for $${formattedAmount} has been sent to ${sitterUser.name || 'your sitter'}. Awaiting confirmation.`,
      type: "BOOKING",
      actionType: "BOOKING_CREATED",
      entityType: "booking",
      entityId: booking.id,
      linkUrl: bookingLink,
      metadata: { bookingId: booking.id, totalAmount: booking.totalAmount },
    });

    // 2. Alert Sitter
    await this.send({
      userId: sitterUser.id,
      targetRole: "PET_SITTER",
      title: "New Booking Request Received!",
      message: `${ownerUser.name || 'A pet owner'} requested a booking (#${booking.id}) for $${formattedAmount}. Review and confirm in your inbox.`,
      type: "BOOKING",
      actionType: "BOOKING_CREATED",
      entityType: "booking",
      entityId: booking.id,
      linkUrl: sitterLink,
      metadata: { bookingId: booking.id, totalAmount: booking.totalAmount },
    });

    // 3. Alert Admins
    await this.broadcastToRole("ADMIN", {
      title: "Platform Order Placed",
      message: `New booking #${booking.id} placed: Owner #${ownerUser.id} -> Sitter #${sitterUser.id} ($${formattedAmount}).`,
      type: "BOOKING",
      actionType: "BOOKING_CREATED",
      entityType: "booking",
      entityId: booking.id,
      linkUrl: adminLink,
      metadata: { bookingId: booking.id },
    });
  }

  /**
   * Action: Booking Status Changed (CONFIRMED, CANCELLED, COMPLETED)
   */
  static async onBookingStatusChanged(booking: any, status: string, actorUser?: any) {
    const ownerLink = `/bookings/${booking.id}/live-tracker`;
    const sitterLink = `/sitter/inbox`;
    const adminLink = `/admin/activities`;

    if (status === "CONFIRMED") {
      // Notify Owner
      await this.send({
        userId: booking.ownerId,
        targetRole: "PET_OWNER",
        title: "Booking Confirmed by Sitter!",
        message: `Great news! Your booking #${booking.id} has been confirmed. You can now monitor live routines and updates.`,
        type: "BOOKING",
        actionType: "BOOKING_CONFIRMED",
        entityType: "booking",
        entityId: booking.id,
        linkUrl: ownerLink,
      });

      // Notify Sitter
      await this.send({
        userId: booking.sitterId,
        targetRole: "PET_SITTER",
        title: "Booking Schedule Locked In",
        message: `Booking #${booking.id} is confirmed and active in your schedule. Be ready for scheduled pet care routines.`,
        type: "BOOKING",
        actionType: "BOOKING_CONFIRMED",
        entityType: "booking",
        entityId: booking.id,
        linkUrl: sitterLink,
      });

      // Notify Admin
      await this.broadcastToRole("ADMIN", {
        title: "Booking Confirmed",
        message: `Booking #${booking.id} confirmed by Sitter #${booking.sitterId}.`,
        type: "BOOKING",
        actionType: "BOOKING_CONFIRMED",
        entityType: "booking",
        entityId: booking.id,
        linkUrl: adminLink,
      });
    } else if (status === "COMPLETED") {
      // Notify Owner
      await this.send({
        userId: booking.ownerId,
        targetRole: "PET_OWNER",
        title: "Booking Completed - Service Ended",
        message: `Booking #${booking.id} has ended. All pet care tasks and check-ins have been completed. Thank you for using PawShield!`,
        type: "BOOKING",
        actionType: "BOOKING_COMPLETED",
        entityType: "booking",
        entityId: booking.id,
        linkUrl: `/bookings/${booking.id}/confirmation`,
      });

      // Notify Sitter
      await this.send({
        userId: booking.sitterId,
        targetRole: "PET_SITTER",
        title: "Booking Completed & Payout Authorized",
        message: `Booking #${booking.id} is complete! Your earnings are ready for release to your payout account.`,
        type: "PAYMENT",
        actionType: "BOOKING_COMPLETED",
        entityType: "booking",
        entityId: booking.id,
        linkUrl: sitterLink,
      });

      // Notify Admin
      await this.broadcastToRole("ADMIN", {
        title: "Booking Successfully Completed",
        message: `Booking #${booking.id} concluded successfully. Payout escrow processed.`,
        type: "BOOKING",
        actionType: "BOOKING_COMPLETED",
        entityType: "booking",
        entityId: booking.id,
        linkUrl: adminLink,
      });
    }
  }

  /**
   * Action: Sitter completes a pet care activity (Feeding, Walking, Medication, Potty, etc.)
   */
  static async onActivityCompleted(activity: any, booking: any, sitterName: string) {
    const ownerLink = `/bookings/${booking.id}/live-tracker`;
    const adminLink = `/admin/activity-monitor`;

    // Notify Pet Owner in real-time
    await this.send({
      userId: booking.ownerId,
      targetRole: "PET_OWNER",
      title: `Pet Care Update: ${activity.title} Done!`,
      message: `${sitterName} just logged "${activity.title}" (${activity.activityType}) as completed with notes: "${activity.completedNotes || 'All went smoothly!'}".`,
      type: "CARE_ACTIVITY",
      actionType: "ACTIVITY_COMPLETED",
      entityType: "activity",
      entityId: activity.id,
      linkUrl: ownerLink,
      metadata: { activityId: activity.id, activityType: activity.activityType },
    });

    // Notify Admin Compliance
    await this.broadcastToRole("ADMIN", {
      title: "Care Activity Verified",
      message: `Sitter logged "${activity.title}" for Booking #${booking.id} at ${new Date().toLocaleTimeString()}.`,
      type: "CARE_ACTIVITY",
      actionType: "ACTIVITY_COMPLETED",
      entityType: "activity",
      entityId: activity.id,
      linkUrl: adminLink,
    });
  }

  /**
   * Action: Sitter GPS Visit Check-in
   */
  static async onVisitCheckin(bookingId: number, ownerId: number, sitterId: number, sitterName: string, lat?: string | number, lng?: string | number) {
    const locText = lat && lng ? `(GPS: ${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)})` : "";
    
    // Notify Owner
    await this.send({
      userId: ownerId,
      targetRole: "PET_OWNER",
      title: "Sitter Arrived & Checked In!",
      message: `${sitterName} has arrived and checked in for your pet's visit ${locText}. Live timer started.`,
      type: "CARE_ACTIVITY",
      actionType: "VISIT_CHECKIN",
      entityType: "booking",
      entityId: bookingId,
      linkUrl: `/bookings/${bookingId}/live-tracker`,
    });

    // Notify Sitter Confirmation
    await this.send({
      userId: sitterId,
      targetRole: "PET_SITTER",
      title: "Visit Started",
      message: `Your check-in for Booking #${bookingId} is recorded with GPS validation. Remember to complete required pet routines.`,
      type: "CARE_ACTIVITY",
      actionType: "VISIT_CHECKIN",
      entityType: "booking",
      entityId: bookingId,
      linkUrl: `/sitter/visits/${bookingId}`,
    });
  }

  /**
   * Action: Escrow Payment Authorization or Release
   */
  static async onPaymentAction(bookingId: number, ownerId: number, sitterId: number, amountCents: number, action: "AUTHORIZED" | "RELEASED" | "DISPUTED") {
    const formatted = (amountCents / 100).toFixed(2);

    if (action === "AUTHORIZED") {
      // Owner
      await this.send({
        userId: ownerId,
        targetRole: "PET_OWNER",
        title: "Escrow Payment Secured",
        message: `Payment of $${formatted} is held safely in escrow. Funds will only be disbursed when you are satisfied with the service.`,
        type: "PAYMENT",
        actionType: "ESCROW_AUTHORIZED",
        entityType: "booking",
        entityId: bookingId,
        linkUrl: `/bookings/${bookingId}/confirmation`,
      });

      // Sitter
      await this.send({
        userId: sitterId,
        targetRole: "PET_SITTER",
        title: "Escrow Funded & Guaranteed",
        message: `Booking #${bookingId} has verified escrow funding of $${formatted}. You are guaranteed payout upon completion.`,
        type: "PAYMENT",
        actionType: "ESCROW_AUTHORIZED",
        entityType: "booking",
        entityId: bookingId,
        linkUrl: `/sitter/inbox`,
      });
    } else if (action === "RELEASED") {
      // Sitter
      await this.send({
        userId: sitterId,
        targetRole: "PET_SITTER",
        title: "Payout Transferred!",
        message: `Congratulations! Payout of $${formatted} for Booking #${bookingId} has been released to your account.`,
        type: "PAYMENT",
        actionType: "PAYMENT_RELEASED",
        entityType: "booking",
        entityId: bookingId,
        linkUrl: `/sitter/inbox`,
      });

      // Owner
      await this.send({
        userId: ownerId,
        targetRole: "PET_OWNER",
        title: "Service Receipt Finalized",
        message: `Escrow for Booking #${bookingId} ($${formatted}) has been released. Thank you!`,
        type: "PAYMENT",
        actionType: "PAYMENT_RELEASED",
        entityType: "booking",
        entityId: bookingId,
        linkUrl: `/bookings/${bookingId}/order-summary`,
      });
    }
  }

  /**
   * Action: Admin user update or verification
   */
  static async onUserVerificationUpdated(targetUserId: number, isVerified: boolean, adminEmail: string) {
    await this.send({
      userId: targetUserId,
      targetRole: "PET_SITTER",
      title: isVerified ? "Account Verified by Platform Admin!" : "Account Verification Updated",
      message: isVerified
        ? "Congratulations! Your profile has been reviewed and verified by PawShield trust & safety team. You now have the verified badge."
        : "Your account verification status was updated by trust & safety administration.",
      type: "ACCOUNT",
      actionType: "USER_VERIFIED",
      entityType: "user",
      entityId: targetUserId,
      linkUrl: "/profile",
    });

    await this.broadcastToRole("ADMIN", {
      title: "User Verification Changed",
      message: `Admin ${adminEmail} marked User #${targetUserId} as ${isVerified ? "VERIFIED" : "UNVERIFIED"}.`,
      type: "SECURITY",
      actionType: "USER_VERIFIED",
      entityType: "user",
      entityId: targetUserId,
      linkUrl: "/admin/users",
    });
  }

  /**
   * Action: Platform fee configuration modified
   */
  static async onPlatformFeeUpdated(adminEmail: string, ownerFee: string, sitterFee: string) {
    await this.broadcastToRole("ADMIN", {
      title: "Platform Fee Rates Adjusted",
      message: `Admin ${adminEmail} updated fee schedule: Owner fee ${ownerFee}%, Sitter commission ${sitterFee}%.`,
      type: "SYSTEM",
      actionType: "FEE_UPDATED",
      entityType: "platform",
      linkUrl: "/admin/platform-fees",
    });
  }
}
