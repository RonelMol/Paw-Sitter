import { Router, Response } from "express";
import { pool } from "../db/index.ts";
import { AuthRequest, requireAuth, requireRole } from "../middleware/auth.ts";

export const buyMeCoffeeRouter = Router();

let isTableInitialized = false;

export async function ensureBuyMeCoffeeTables() {
  if (isTableInitialized) return;
  try {
    // Config table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS buy_me_coffee_configs (
        id SERIAL PRIMARY KEY,
        is_enabled BOOLEAN DEFAULT TRUE,
        require_for_cash BOOLEAN DEFAULT TRUE,
        coffee_url TEXT DEFAULT 'https://buymeacoffee.com/ronelmol',
        coffee_price_php INTEGER DEFAULT 150,
        custom_message TEXT DEFAULT 'Support PawShield Care! For Cash on Service bookings, a small community coffee (₱150) ensures instant booking slot reservation and platform maintenance guarantee.',
        goal_amount_php INTEGER DEFAULT 5000,
        maintenance_title TEXT DEFAULT 'Platform & Infrastructure Maintenance Fund',
        manual_trigger_override BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ensure columns exist if table previously existed without them
    await pool.query(`
      ALTER TABLE buy_me_coffee_configs ADD COLUMN IF NOT EXISTS goal_amount_php INTEGER DEFAULT 5000;
      ALTER TABLE buy_me_coffee_configs ADD COLUMN IF NOT EXISTS maintenance_title TEXT DEFAULT 'Platform & Infrastructure Maintenance Fund';
    `);

    // Ensure default record exists with the user's correct link
    const configCheck = await pool.query(`SELECT id, coffee_url FROM buy_me_coffee_configs LIMIT 1`);
    if (configCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO buy_me_coffee_configs (
          is_enabled, 
          require_for_cash, 
          coffee_url, 
          coffee_price_php, 
          custom_message, 
          goal_amount_php,
          maintenance_title
        ) VALUES (
          TRUE, 
          TRUE, 
          'https://buymeacoffee.com/ronelmol', 
          150, 
          'Help us keep PawShield fast, reliable, and secure for pets and sitters. A quick ₱150 coffee powers hosting, escrow safety, and live GPS tracking.',
          5000,
          'Platform & Infrastructure Maintenance Fund'
        );
      `);
    } else if (configCheck.rows[0].coffee_url && configCheck.rows[0].coffee_url.includes("pawshield")) {
      // Migrate old placeholder to the user's explicit link
      await pool.query(`
        UPDATE buy_me_coffee_configs 
        SET coffee_url = 'https://buymeacoffee.com/ronelmol'
        WHERE id = $1
      `, [configCheck.rows[0].id]);
    }
  } catch (configErr) {
    console.warn("buy_me_coffee_configs setup note:", configErr);
  }

  try {
    // Analytics Events Table: tracks REACH, CLICK, ATTEMPT, COPY_LINK
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coffee_events (
        id SERIAL PRIMARY KEY,
        event_type TEXT NOT NULL, -- 'REACH', 'CLICK', 'ATTEMPT', 'COPY_LINK'
        source TEXT DEFAULT 'PLATFORM', -- 'PLATFORM_NAV', 'PLATFORM_BANNER', 'BOOKING_FLOW', 'MODAL', 'ADMIN'
        user_id INTEGER,
        user_email TEXT,
        ip_address TEXT,
        user_agent TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_coffee_events_type ON coffee_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_coffee_events_date ON coffee_events(created_at);
    `);
  } catch (eventErr) {
    console.warn("coffee_events setup note:", eventErr);
  }

  try {
    // Confirmed Tips Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coffee_tips (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        booking_id INTEGER,
        supporter_name TEXT,
        amount_php INTEGER NOT NULL DEFAULT 150,
        reference_code TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'CONFIRMED',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    isTableInitialized = true;
  } catch (tipErr) {
    console.warn("coffee_tips setup note:", tipErr);
  }
}

// Auto-run on module load
ensureBuyMeCoffeeTables().catch(() => {});

// GET /api/buy-me-coffee/config - Public
buyMeCoffeeRouter.get("/config", async (_req, res: Response) => {
  try {
    await ensureBuyMeCoffeeTables();
    const result = await pool.query(`
      SELECT * FROM buy_me_coffee_configs ORDER BY id DESC LIMIT 1
    `);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      res.json({
        id: row.id,
        isEnabled: row.is_enabled ?? true,
        requireForCash: row.require_for_cash ?? true,
        coffeeUrl: row.coffee_url || "https://buymeacoffee.com/ronelmol",
        coffeePricePhp: row.coffee_price_php || 150,
        customMessage: row.custom_message || "",
        goalAmountPhp: row.goal_amount_php || 5000,
        maintenanceTitle: row.maintenance_title || "Platform & Infrastructure Maintenance Fund",
        manualTriggerOverride: row.manual_trigger_override ?? false,
      });
    } else {
      res.json({
        isEnabled: true,
        requireForCash: true,
        coffeeUrl: "https://buymeacoffee.com/ronelmol",
        coffeePricePhp: 150,
        customMessage: "Help us keep PawShield fast, reliable, and secure for pets and sitters. A quick ₱150 coffee powers hosting, escrow safety, and live GPS tracking.",
        goalAmountPhp: 5000,
        maintenanceTitle: "Platform & Infrastructure Maintenance Fund",
        manualTriggerOverride: false,
      });
    }
  } catch (error: any) {
    console.error("Fetch coffee config error:", error);
    res.status(500).json({ error: "Failed to fetch coffee configuration" });
  }
});

// POST /api/buy-me-coffee/event - Public or Authenticated (Track Reach, Clicks, Attempts)
buyMeCoffeeRouter.post("/event", async (req: AuthRequest, res: Response) => {
  try {
    await ensureBuyMeCoffeeTables();
    const { eventType, source = "PLATFORM", metadata = {} } = req.body;
    
    if (!eventType || !["REACH", "CLICK", "ATTEMPT", "COPY_LINK"].includes(eventType)) {
      return res.status(400).json({ error: "Invalid eventType. Allowed: REACH, CLICK, ATTEMPT, COPY_LINK" });
    }

    const ipAddress = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0].trim();
    const userAgent = (req.headers["user-agent"] || "").slice(0, 255);
    const userId = req.dbUser?.id || null;
    const userEmail = req.dbUser?.email || null;

    const inserted = await pool.query(`
      INSERT INTO coffee_events (event_type, source, user_id, user_email, ip_address, user_agent, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [eventType, source, userId, userEmail, ipAddress, userAgent, JSON.stringify(metadata)]);

    res.status(201).json({ success: true, event: inserted.rows[0] });
  } catch (error: any) {
    console.error("Log coffee event error:", error);
    res.status(500).json({ error: "Failed to log coffee event" });
  }
});

// GET /api/buy-me-coffee/analytics - Admin & Authorized Roles
buyMeCoffeeRouter.get("/analytics", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await ensureBuyMeCoffeeTables();

    // Check if user is ADMIN or has custom role permission for buy_me_coffee
    const userRole = req.dbUser?.role;
    const customPermissions = req.dbUser?.customPermissions || {};
    const hasPermission = userRole === "ADMIN" || customPermissions?.buy_me_coffee?.read;

    if (!hasPermission) {
      return res.status(403).json({ error: "Forbidden: You do not have permission to access coffee analytics" });
    }

    // Aggregated stats
    const reachRes = await pool.query(`SELECT COUNT(*)::int as count FROM coffee_events WHERE event_type = 'REACH'`);
    const clickRes = await pool.query(`SELECT COUNT(*)::int as count FROM coffee_events WHERE event_type = 'CLICK'`);
    const attemptRes = await pool.query(`SELECT COUNT(*)::int as count FROM coffee_events WHERE event_type = 'ATTEMPT'`);
    const copyRes = await pool.query(`SELECT COUNT(*)::int as count FROM coffee_events WHERE event_type = 'COPY_LINK'`);

    const tipsAggRes = await pool.query(`
      SELECT 
        COUNT(*)::int as count, 
        COALESCE(SUM(amount_php), 0)::int as total_amount 
      FROM coffee_tips 
      WHERE status = 'CONFIRMED'
    `);

    const totalReaches = reachRes.rows[0]?.count || 0;
    const totalClicks = clickRes.rows[0]?.count || 0;
    const totalAttempts = attemptRes.rows[0]?.count || 0;
    const totalCopies = copyRes.rows[0]?.count || 0;
    const totalTips = tipsAggRes.rows[0]?.count || 0;
    const totalAmountPhp = tipsAggRes.rows[0]?.total_amount || 0;

    // Rates
    const reachToClickRate = totalReaches > 0 ? ((totalClicks / totalReaches) * 100).toFixed(1) : "0.0";
    const clickToAttemptRate = totalClicks > 0 ? ((totalAttempts / totalClicks) * 100).toFixed(1) : "0.0";
    const overallConversionRate = totalReaches > 0 ? (((totalAttempts + totalTips) / totalReaches) * 100).toFixed(1) : "0.0";

    // Recent 50 events
    const recentEventsRes = await pool.query(`
      SELECT id, event_type, source, user_id, user_email, ip_address, metadata, created_at 
      FROM coffee_events 
      ORDER BY created_at DESC 
      LIMIT 50
    `);

    // Recent 20 tips
    const recentTipsRes = await pool.query(`
      SELECT id, user_id, booking_id, supporter_name, amount_php, reference_code, notes, status, created_at 
      FROM coffee_tips 
      ORDER BY created_at DESC 
      LIMIT 20
    `);

    // Events by source
    const bySourceRes = await pool.query(`
      SELECT source, COUNT(*)::int as count 
      FROM coffee_events 
      GROUP BY source 
      ORDER BY count DESC
    `);

    // Config info
    const configRes = await pool.query(`SELECT * FROM buy_me_coffee_configs ORDER BY id DESC LIMIT 1`);
    const currentConfig = configRes.rows[0] || {};

    res.json({
      summary: {
        totalReaches,
        totalClicks,
        totalAttempts,
        totalCopies,
        totalTips,
        totalAmountPhp,
        reachToClickRate: Number(reachToClickRate),
        clickToAttemptRate: Number(clickToAttemptRate),
        overallConversionRate: Number(overallConversionRate),
        goalAmountPhp: currentConfig.goal_amount_php || 5000,
        goalProgressPercent: Math.min(Math.round((totalAmountPhp / (currentConfig.goal_amount_php || 5000)) * 100), 100),
      },
      currentConfig: {
        coffeeUrl: currentConfig.coffee_url || "https://buymeacoffee.com/ronelmol",
        isEnabled: currentConfig.is_enabled ?? true,
        requireForCash: currentConfig.require_for_cash ?? true,
        coffeePricePhp: currentConfig.coffee_price_php || 150,
        customMessage: currentConfig.custom_message || "",
        maintenanceTitle: currentConfig.maintenance_title || "Platform & Infrastructure Maintenance Fund",
      },
      recentEvents: recentEventsRes.rows,
      recentTips: recentTipsRes.rows,
      bySource: bySourceRes.rows,
    });
  } catch (error: any) {
    console.error("Fetch coffee analytics error:", error);
    res.status(500).json({ error: "Failed to fetch coffee analytics", cause: error.message });
  }
});

// POST /api/buy-me-coffee/config - Admin & Authorized Roles
buyMeCoffeeRouter.post("/config", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await ensureBuyMeCoffeeTables();
    
    // Role check: ADMIN or custom role with write permission
    const userRole = req.dbUser?.role;
    const customPermissions = req.dbUser?.customPermissions || {};
    const hasPermission = userRole === "ADMIN" || customPermissions?.buy_me_coffee?.write;

    if (!hasPermission) {
      return res.status(403).json({ error: "Forbidden: You do not have permission to edit coffee configuration" });
    }

    const { 
      isEnabled, 
      requireForCash, 
      coffeeUrl, 
      coffeePricePhp, 
      customMessage, 
      goalAmountPhp,
      maintenanceTitle,
      manualTriggerOverride 
    } = req.body;

    const finalUrl = (coffeeUrl || "").trim() || "https://buymeacoffee.com/ronelmol";

    const existing = await pool.query(`SELECT id FROM buy_me_coffee_configs LIMIT 1`);
    if (existing.rows.length > 0) {
      const updated = await pool.query(`
        UPDATE buy_me_coffee_configs 
        SET 
          is_enabled = $1, 
          require_for_cash = $2, 
          coffee_url = $3, 
          coffee_price_php = $4, 
          custom_message = $5, 
          goal_amount_php = $6,
          maintenance_title = $7,
          manual_trigger_override = $8, 
          updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `, [
        isEnabled !== undefined ? Boolean(isEnabled) : true,
        requireForCash !== undefined ? Boolean(requireForCash) : true,
        finalUrl,
        Number(coffeePricePhp) || 150,
        customMessage || "",
        Number(goalAmountPhp) || 5000,
        maintenanceTitle || "Platform & Infrastructure Maintenance Fund",
        manualTriggerOverride !== undefined ? Boolean(manualTriggerOverride) : false,
        existing.rows[0].id
      ]);
      res.json(updated.rows[0]);
    } else {
      const inserted = await pool.query(`
        INSERT INTO buy_me_coffee_configs (
          is_enabled, 
          require_for_cash, 
          coffee_url, 
          coffee_price_php, 
          custom_message, 
          goal_amount_php,
          maintenance_title,
          manual_trigger_override
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        isEnabled !== undefined ? Boolean(isEnabled) : true,
        requireForCash !== undefined ? Boolean(requireForCash) : true,
        finalUrl,
        Number(coffeePricePhp) || 150,
        customMessage || "",
        Number(goalAmountPhp) || 5000,
        maintenanceTitle || "Platform & Infrastructure Maintenance Fund",
        manualTriggerOverride ? Boolean(manualTriggerOverride) : false,
      ]);
      res.json(inserted.rows[0]);
    }
  } catch (error: any) {
    console.error("Save coffee config error:", error);
    res.status(500).json({ error: "Failed to update coffee config", cause: error.message });
  }
});

// POST /api/buy-me-coffee/tip - Public or Authenticated
buyMeCoffeeRouter.post("/tip", async (req: AuthRequest, res: Response) => {
  try {
    await ensureBuyMeCoffeeTables();
    const { userId, bookingId, supporterName, amountPhp, referenceCode, notes } = req.body;
    const finalAmount = Number(amountPhp) || 150;
    const finalRef = referenceCode || `BMC-${Date.now().toString().slice(-6)}`;

    const result = await pool.query(`
      INSERT INTO coffee_tips (user_id, booking_id, supporter_name, amount_php, reference_code, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMED')
      RETURNING *
    `, [
      userId || req.dbUser?.id || null, 
      bookingId || null, 
      supporterName || req.dbUser?.name || "Pet Lover", 
      finalAmount, 
      finalRef, 
      notes || "Platform maintenance contribution"
    ]);

    // Also log as ATTEMPT / TIP event in coffee_events
    const ipAddress = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0].trim();
    await pool.query(`
      INSERT INTO coffee_events (event_type, source, user_id, user_email, ip_address, metadata)
      VALUES ('ATTEMPT', 'TIP_CONFIRMATION', $1, $2, $3, $4)
    `, [
      req.dbUser?.id || null,
      req.dbUser?.email || null,
      ipAddress,
      JSON.stringify({ referenceCode: finalRef, amount: finalAmount })
    ]);

    res.status(201).json({
      success: true,
      tip: result.rows[0],
      message: `Thank you for supporting platform maintenance! (₱${finalAmount} confirmed)`
    });
  } catch (error: any) {
    console.error("Record coffee tip error:", error);
    res.status(500).json({ error: "Failed to record coffee tip" });
  }
});

// GET /api/buy-me-coffee/tips - Admin
buyMeCoffeeRouter.get("/tips", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await ensureBuyMeCoffeeTables();
    const result = await pool.query(`
      SELECT * FROM coffee_tips ORDER BY created_at DESC LIMIT 50
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Fetch tips error:", error);
    res.status(500).json({ error: "Failed to fetch tips" });
  }
});
