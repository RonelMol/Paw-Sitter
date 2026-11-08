import { Router, Response } from "express";
import { pool } from "../db/index.ts";
import { AuthRequest, requireAuth } from "../middleware/auth.ts";

export const referralsRouter = Router();

// GET /api/referrals/me - Fetch or generate referral profile
referralsRouter.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    let result = await pool.query(`SELECT * FROM referrals WHERE user_id = $1`, [userId]);

    if (result.rows.length === 0) {
      const code = `PAW-${(req.dbUser.name || "REF").replace(/\s+/g, "").toUpperCase().slice(0, 4)}${userId}${Math.floor(100 + Math.random() * 900)}`;
      const inserted = await pool.query(`
        INSERT INTO referrals (user_id, referral_code, reward_balance_php, lifetime_earned_php)
        VALUES ($1, $2, 0, 0)
        RETURNING *
      `, [userId, code]);
      result = inserted;
    }

    const row = result.rows[0];

    // Fetch attributions / friends referred
    const attributions = await pool.query(`
      SELECT ra.*, u.name as referred_name, u.email as referred_email
      FROM referral_attributions ra
      LEFT JOIN users u ON u.id = ra.referred_user_id
      WHERE ra.referrer_user_id = $1
      ORDER BY ra.created_at DESC
      LIMIT 20
    `, [userId]);

    res.json({
      referral: row,
      referralLink: `${req.protocol}://${req.get("host")}/?ref=${row.referral_code}`,
      attributions: attributions.rows,
    });
  } catch (error: any) {
    console.error("Fetch referral error:", error);
    res.status(500).json({ error: "Failed to fetch referral details" });
  }
});

// POST /api/referrals/track-click - Public
referralsRouter.post("/track-click", async (req, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Missing referral code" });

    await pool.query(`
      UPDATE referrals 
      SET total_clicks = total_clicks + 1 
      WHERE referral_code = $1
    `, [code.trim().toUpperCase()]);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Track click error:", error);
    res.status(500).json({ error: "Failed to track click" });
  }
});

// POST /api/referrals/claim-payout - Transfer to sitter's registered disbursement bank
referralsRouter.post("/claim-payout", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    const refResult = await pool.query(`SELECT * FROM referrals WHERE user_id = $1`, [userId]);
    if (refResult.rows.length === 0) return res.status(404).json({ error: "Referral profile not found" });

    const balance = refResult.rows[0].reward_balance_php || 0;
    if (balance < 250) {
      return res.status(400).json({ error: "Minimum referral payout claim is ₱250." });
    }

    // Check disbursement bank
    const bankResult = await pool.query(`SELECT * FROM sitter_verifications WHERE user_id = $1`, [userId]);
    const bank = bankResult.rows[0];
    const bankInfo = bank ? `${bank.bank_name} (Acct: ${bank.bank_account_number})` : "Default Registered Bank";

    await pool.query(`
      UPDATE referrals 
      SET reward_balance_php = 0, lifetime_earned_php = lifetime_earned_php + $1 
      WHERE user_id = $2
    `, [balance, userId]);

    res.json({
      success: true,
      claimedAmountPhp: balance,
      payoutDestination: bankInfo,
      message: `Successfully requested payout of ₱${balance.toLocaleString()} to ${bankInfo}! Processing takes 1-2 business days.`
    });
  } catch (error: any) {
    console.error("Claim payout error:", error);
    res.status(500).json({ error: "Failed to claim referral payout" });
  }
});
