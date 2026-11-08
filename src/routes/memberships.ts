import { Router, Response } from "express";
import { pool } from "../db/index.ts";
import { AuthRequest, requireAuth } from "../middleware/auth.ts";

export const membershipsRouter = Router();

// GET /api/memberships/me - Current status
membershipsRouter.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    let result = await pool.query(`SELECT * FROM user_memberships WHERE user_id = $1`, [userId]);

    if (result.rows.length === 0) {
      // Calculate count of accepted bookings from bookings table
      const bookingsCountResult = await pool.query(`
        SELECT COUNT(*) as cnt FROM bookings 
        WHERE sitter_id = $1 AND status IN ('CONFIRMED', 'COMPLETED', 'IN_PROGRESS')
      `, [userId]);
      const initialCount = parseInt(bookingsCountResult.rows[0]?.cnt || "0", 10);

      const inserted = await pool.query(`
        INSERT INTO user_memberships (user_id, plan_type, status, accepted_bookings_count, max_free_bookings)
        VALUES ($1, 'FREE_TIER', 'ACTIVE', $2, 3)
        RETURNING *
      `, [userId, initialCount]);
      result = inserted;
    }

    const row = result.rows[0];
    const isPro = row.plan_type !== "FREE_TIER" && row.status === "ACTIVE";
    const acceptedCount = row.accepted_bookings_count || 0;
    const maxFree = row.max_free_bookings || 3;
    const canAcceptMore = isPro || acceptedCount < maxFree;

    res.json({
      id: row.id,
      userId: row.user_id,
      planType: row.plan_type,
      status: row.status,
      acceptedBookingsCount: acceptedCount,
      maxFreeBookings: maxFree,
      remainingFreeBookings: Math.max(0, maxFree - acceptedCount),
      canAcceptMore,
      monthlyFeePhp: row.monthly_fee_php || 499,
      annualFeePhp: row.annual_fee_php || 4999,
      activatedAt: row.activated_at,
      expiresAt: row.expires_at,
      isPro,
    });
  } catch (error: any) {
    console.error("Fetch membership error:", error);
    res.status(500).json({ error: "Failed to fetch membership details" });
  }
});

// POST /api/memberships/upgrade - Upgrade to Pro Monthly / Annual
membershipsRouter.post("/upgrade", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    const { planType = "PRO_MONTHLY", paymentMethod = "GCASH_CARD" } = req.body;
    const isAnnual = planType === "PRO_ANNUAL";
    const feePhp = isAnnual ? 4999 : 499;

    const expiry = new Date();
    if (isAnnual) {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }

    const ref = `MEM-${Date.now().toString().slice(-8)}`;

    const result = await pool.query(`
      INSERT INTO user_memberships (
        user_id, plan_type, status, monthly_fee_php, annual_fee_php,
        activated_at, expires_at, payment_reference, updated_at
      ) VALUES ($1, $2, 'ACTIVE', 499, 4999, NOW(), $3, $4, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        plan_type = EXCLUDED.plan_type,
        status = 'ACTIVE',
        activated_at = NOW(),
        expires_at = EXCLUDED.expires_at,
        payment_reference = EXCLUDED.payment_reference,
        updated_at = NOW()
      RETURNING *
    `, [userId, planType, expiry.toISOString(), ref]);

    res.json({
      success: true,
      message: `Successfully upgraded to PawShield ${isAnnual ? 'Annual Pro' : 'Monthly Pro'} Membership (₱${feePhp.toLocaleString()})! You can now accept unlimited bookings.`,
      membership: result.rows[0],
    });
  } catch (error: any) {
    console.error("Upgrade membership error:", error);
    res.status(500).json({ error: "Failed to upgrade membership", cause: error.message });
  }
});

// POST /api/memberships/validate-accept-booking - Sitter attempts to accept a booking
membershipsRouter.post("/validate-accept-booking", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const sitterId = req.dbUser.id;
    const { bookingId } = req.body;

    let mResult = await pool.query(`SELECT * FROM user_memberships WHERE user_id = $1`, [sitterId]);
    if (mResult.rows.length === 0) {
      await pool.query(`
        INSERT INTO user_memberships (user_id, plan_type, status, accepted_bookings_count, max_free_bookings)
        VALUES ($1, 'FREE_TIER', 'ACTIVE', 0, 3)
      `, [sitterId]);
      mResult = await pool.query(`SELECT * FROM user_memberships WHERE user_id = $1`, [sitterId]);
    }

    const membership = mResult.rows[0];
    const isPro = membership.plan_type !== "FREE_TIER" && membership.status === "ACTIVE";
    const acceptedCount = membership.accepted_bookings_count || 0;
    const maxFree = membership.max_free_bookings || 3;

    if (!isPro && acceptedCount >= maxFree) {
      return res.status(403).json({
        membershipRequired: true,
        acceptedCount,
        maxFree,
        error: `Membership Required: You have completed ${acceptedCount} free accepted bookings. To accept this booking, please activate your PawShield Pro Sitter Membership (₱499/month).`,
      });
    }

    // Allowed: increment accepted bookings count
    const updated = await pool.query(`
      UPDATE user_memberships 
      SET accepted_bookings_count = accepted_bookings_count + 1, updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `, [sitterId]);

    res.json({
      allowed: true,
      membership: updated.rows[0],
    });
  } catch (error: any) {
    console.error("Validate accept booking error:", error);
    res.status(500).json({ error: "Failed to validate booking acceptance" });
  }
});
