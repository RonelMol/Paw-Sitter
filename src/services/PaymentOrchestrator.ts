import { db, pool } from "../db/index.ts";
import { users, bookings, payments, bookingFinancialSnapshots } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { getStripe, isStripeConfigured } from "../lib/stripe.ts";
import crypto from "crypto";

export class PaymentOrchestrator {
  /**
   * Generates a Stripe Connect onboarding link for sitters (Express/Custom),
   * or a simulated link if Stripe is not configured.
   */
  static async generateOnboardingLink(sitterId: number, refreshUrl: string, returnUrl: string) {
    const sitterRecords = await db.select().from(users).where(eq(users.id, sitterId));
    if (sitterRecords.length === 0) {
      throw new Error("Sitter not found");
    }
    const sitter = sitterRecords[0];

    const stripe = getStripe();
    if (!stripe) {
      return `${returnUrl}?stripe_setup=simulated_cash_mode`;
    }

    let accountId = sitter.stripeAccountId;

    if (!accountId) {
      // Create a new Express connected account
      const account = await stripe.accounts.create({
        type: "express",
        email: sitter.email,
        capabilities: {
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      // Save the connected account ID to the user record
      await db.update(users).set({ stripeAccountId: accountId }).where(eq(users.id, sitterId));
    }

    // Create the account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return accountLink.url;
  }

  /**
   * Confirms a booking using Cash / Pay on Service. No card or Stripe needed.
   * Enforces SERIALIZABLE transaction isolation to eliminate race conditions under concurrent testing.
   */
  static async confirmCashBooking(bookingId: number) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE");

      // Pessimistic lock row for update to eliminate concurrency race conditions
      const bookingRes = await client.query(
        "SELECT id, status, sitter_id, owner_id FROM bookings WHERE id = $1 FOR UPDATE",
        [bookingId]
      );

      if (bookingRes.rows.length === 0) {
        throw new Error("Booking not found");
      }

      await client.query(
        "UPDATE bookings SET status = 'CONFIRMED' WHERE id = $1",
        [bookingId]
      );

      const payRes = await client.query(
        "SELECT id FROM payments WHERE booking_id = $1 FOR UPDATE",
        [bookingId]
      );

      if (payRes.rows.length > 0) {
        await client.query(
          "UPDATE payments SET status = 'AUTHORIZED' WHERE id = $1",
          [payRes.rows[0].id]
        );
      } else {
        const transferGroup = `cash_${crypto.randomBytes(8).toString("hex")}`;
        await client.query(
          "INSERT INTO payments (booking_id, transfer_group, status) VALUES ($1, $2, 'AUTHORIZED')",
          [bookingId, transferGroup]
        );
      }

      await client.query("COMMIT");
      return { success: true, bookingId, status: "CONFIRMED", paymentMethod: "CASH" };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Creates a PaymentIntent for authorization and puts the payment under escrow custody.
   * If Stripe is not configured, automatically defaults to Cash / Direct confirmation.
   */
  static async createBookingPaymentIntent(bookingId: number) {
    const bookingRecords = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRecords.length === 0) {
      throw new Error("Booking not found");
    }
    const booking = bookingRecords[0];

    const snapshotRecords = await db.select().from(bookingFinancialSnapshots).where(eq(bookingFinancialSnapshots.bookingId, bookingId));
    if (snapshotRecords.length === 0) {
      throw new Error("Booking financial snapshot not found");
    }
    const snapshot = snapshotRecords[0];

    let paymentRecords = await db.select().from(payments).where(eq(payments.bookingId, bookingId));
    const totalAmountToCharge = snapshot.calculatedTotalOwnerCharge + snapshot.tipAmount;

    const stripe = getStripe();
    if (!stripe) {
      // Default to cash confirmation if Stripe is not configured
      await this.confirmCashBooking(bookingId);
      return {
        clientSecret: null,
        isCashMode: true,
        message: "Stripe is not configured. Booking confirmed with Cash on Service.",
      };
    }
    
    // Generate a unique transfer group for this booking
    const transferGroup = `booking_${crypto.randomBytes(8).toString("hex")}`;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountToCharge,
      currency: "usd",
      transfer_group: transferGroup,
      capture_method: "automatic",
      metadata: {
        bookingId: bookingId.toString(),
      }
    });

    if (paymentRecords.length > 0) {
      // Update existing record
      await db.update(payments).set({
        stripePaymentIntentId: paymentIntent.id,
        transferGroup,
        status: "AUTHORIZED",
      }).where(eq(payments.id, paymentRecords[0].id));
    } else {
      // Create new payment record
      await db.insert(payments).values({
        bookingId: bookingId,
        stripePaymentIntentId: paymentIntent.id,
        transferGroup,
        status: "AUTHORIZED",
      });
    }

    return {
      clientSecret: paymentIntent.client_secret,
      transferGroup,
      isCashMode: false,
    };
  }

  /**
   * Releases escrow payout to the sitter 48 hours post-checkout (or manually triggered).
   */
  static async releaseEscrowPayout(bookingId: number) {
    const paymentRecords = await db.select().from(payments).where(eq(payments.bookingId, bookingId));
    if (paymentRecords.length === 0) {
      throw new Error("Payment record not found for booking");
    }
    const payment = paymentRecords[0];

    if (payment.disputeFlag) {
      throw new Error("Cannot release payout. Payment is currently under dispute freeze.");
    }
    
    if (payment.status === "RELEASED") {
      throw new Error("Payout has already been released.");
    }
    
    if (payment.status !== "AUTHORIZED" && payment.status !== "HELD_IN_ESCROW") {
      throw new Error(`Cannot release payout from status: ${payment.status}`);
    }

    const bookingRecords = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRecords.length === 0) {
      throw new Error("Booking not found");
    }
    const booking = bookingRecords[0];

    const snapshotRecords = await db.select().from(bookingFinancialSnapshots).where(eq(bookingFinancialSnapshots.bookingId, bookingId));
    const snapshot = snapshotRecords[0];

    const sitterRecords = await db.select().from(users).where(eq(users.id, booking.sitterId));
    const sitter = sitterRecords[0];

    const stripe = getStripe();
    if (!stripe || !sitter?.stripeAccountId) {
      // Direct release without Stripe transfer
      await db.update(payments).set({
        status: "RELEASED",
        escrowReleaseTimestamp: new Date(),
      }).where(eq(payments.id, payment.id));

      return { simulated: true, status: "RELEASED" };
    }

    const amountToTransfer = snapshot.calculatedSitterPayout + snapshot.tipAmount;

    // Execute transfer using the unique transfer_group
    const transfer = await stripe.transfers.create({
      amount: amountToTransfer,
      currency: "usd",
      destination: sitter.stripeAccountId,
      transfer_group: payment.transferGroup,
      metadata: {
        bookingId: bookingId.toString(),
      }
    });

    // Update payment record to reflect released funds
    await db.update(payments).set({
      status: "RELEASED",
      escrowReleaseTimestamp: new Date(),
    }).where(eq(payments.id, payment.id));

    return transfer;
  }

  /**
   * Freezes payouts by setting dispute flag and updating status.
   */
  static async handleDisputeEscrowFreeze(bookingId: number) {
    const paymentRecords = await db.select().from(payments).where(eq(payments.bookingId, bookingId));
    if (paymentRecords.length === 0) {
      throw new Error("Payment record not found for booking");
    }
    const payment = paymentRecords[0];

    if (payment.status === "RELEASED") {
      throw new Error("Cannot freeze escrow. Funds have already been released.");
    }

    const updatedPayment = await db.update(payments).set({
      status: "DISPUTED",
      disputeFlag: true,
    }).where(eq(payments.id, payment.id)).returning();

    return updatedPayment[0];
  }
}
