import { Router, type Request, type Response } from "express";
import { pool } from "../db/index.ts";

export const krawlRouter = Router();

// Ensure Krawl tables exist
export async function ensureKrawlTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS krawl_attack_logs (
        id SERIAL PRIMARY KEY,
        ip_address TEXT NOT NULL,
        user_agent TEXT,
        target_path TEXT NOT NULL,
        attack_type TEXT NOT NULL,
        payload TEXT,
        action_taken TEXT NOT NULL DEFAULT 'TRAPPED',
        delay_ms INTEGER DEFAULT 500,
        reputation_score INTEGER DEFAULT 80,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS krawl_configs (
        id SERIAL PRIMARY KEY,
        spider_trap_enabled BOOLEAN DEFAULT TRUE,
        decoy_env_enabled BOOLEAN DEFAULT TRUE,
        canary_tokens_enabled BOOLEAN DEFAULT TRUE,
        artificial_delay_ms INTEGER DEFAULT 800,
        auto_quarantine BOOLEAN DEFAULT TRUE,
        cloudflare_sync BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed initial config if missing
    const existing = await pool.query("SELECT id FROM krawl_configs LIMIT 1");
    if (existing.rows.length === 0) {
      await pool.query(`
        INSERT INTO krawl_configs (spider_trap_enabled, decoy_env_enabled, canary_tokens_enabled, artificial_delay_ms, auto_quarantine, cloudflare_sync)
        VALUES (TRUE, TRUE, TRUE, 800, TRUE, FALSE)
      `);
    }

    // Seed some initial demo attack logs if table is empty
    const logCheck = await pool.query("SELECT id FROM krawl_attack_logs LIMIT 1");
    if (logCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO krawl_attack_logs (ip_address, user_agent, target_path, attack_type, payload, action_taken, delay_ms, reputation_score, created_at)
        VALUES 
          ('185.220.101.45', 'sqlmap/1.7.2#stable', '/api/v1/debug?id=1 UNION SELECT null,password FROM users', 'SQL_INJECTION', 'UNION SELECT null,password FROM users', 'POISONED_RESPONSE', 1200, 95, NOW() - INTERVAL '45 minutes'),
          ('45.146.165.37', 'Mozilla/5.0 (compatible; SemrushBot/7~bl)', '/krawl/trap/node_7192/crawl', 'WEB_SCRAPER_BOT', 'Recursive crawl attempt', 'SPIDER_TRAPPED', 850, 70, NOW() - INTERVAL '30 minutes'),
          ('194.26.29.112', 'Python/3.10 aiohttp/3.8.4', '/.env', 'SENSITIVE_FILE_PROBE', 'GET /.env (Attempting to steal AWS/DB secrets)', 'CANARY_DECOY_SERVED', 900, 90, NOW() - INTERVAL '15 minutes'),
          ('103.149.28.18', 'Go-http-client/1.1', '/wp-config.php', 'CONFIGURATION_LEAK_PROBE', 'GET /wp-config.php', 'DECOY_CONFIG_SERVED', 1000, 85, NOW() - INTERVAL '5 minutes');
      `);
    }
  } catch (err) {
    console.error("Failed to ensure krawl tables:", err);
  }
}

// 1. Krawl Metrics & Threat Stats
krawlRouter.get("/metrics", async (req: Request, res: Response) => {
  try {
    await ensureKrawlTables();

    const totalLogsRes = await pool.query("SELECT COUNT(*) as count FROM krawl_attack_logs");
    const totalTrapped = parseInt(totalLogsRes.rows[0]?.count || "0", 10);

    const attacksByTypeRes = await pool.query(`
      SELECT attack_type, COUNT(*) as count 
      FROM krawl_attack_logs 
      GROUP BY attack_type 
      ORDER BY count DESC
    `);

    const recentLogsRes = await pool.query(`
      SELECT * FROM krawl_attack_logs 
      ORDER BY created_at DESC 
      LIMIT 20
    `);

    const quarantinedIpsRes = await pool.query(`
      SELECT ip_address, attack_type, MAX(reputation_score) as score, COUNT(*) as hits, MAX(created_at) as last_seen
      FROM krawl_attack_logs
      GROUP BY ip_address, attack_type
      ORDER BY last_seen DESC
      LIMIT 10
    `);

    const configRes = await pool.query("SELECT * FROM krawl_configs ORDER BY id DESC LIMIT 1");
    const config = configRes.rows[0] || {
      spider_trap_enabled: true,
      decoy_env_enabled: true,
      canary_tokens_enabled: true,
      artificial_delay_ms: 800,
      auto_quarantine: true,
      cloudflare_sync: false
    };

    // Calculate wasted attacker resources (estimated 1.5 seconds per trap)
    const wastedSeconds = Math.max(totalTrapped * 1.5, 45);

    res.json({
      success: true,
      metrics: {
        totalTrapped,
        wastedSeconds,
        threatLevel: totalTrapped > 50 ? "ELEVATED" : "GUARDED",
        activeDecoys: 8,
        activeTraps: 5,
        quarantinedIpsCount: quarantinedIpsRes.rows.length,
      },
      attackBreakdown: attacksByTypeRes.rows,
      recentLogs: recentLogsRes.rows,
      quarantinedIps: quarantinedIpsRes.rows,
      config: {
        spiderTrapEnabled: config.spider_trap_enabled,
        decoyEnvEnabled: config.decoy_env_enabled,
        canaryTokensEnabled: config.canary_tokens_enabled,
        artificialDelayMs: config.artificial_delay_ms,
        autoQuarantine: config.auto_quarantine,
        cloudflareSync: config.cloudflare_sync,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Update Krawl Settings
krawlRouter.put("/config", async (req: Request, res: Response) => {
  try {
    await ensureKrawlTables();
    const {
      spiderTrapEnabled,
      decoyEnvEnabled,
      canaryTokensEnabled,
      artificialDelayMs,
      autoQuarantine,
      cloudflareSync
    } = req.body;

    const result = await pool.query(`
      UPDATE krawl_configs 
      SET 
        spider_trap_enabled = $1,
        decoy_env_enabled = $2,
        canary_tokens_enabled = $3,
        artificial_delay_ms = $4,
        auto_quarantine = $5,
        cloudflare_sync = $6,
        updated_at = NOW()
      WHERE id = (SELECT id FROM krawl_configs ORDER BY id DESC LIMIT 1)
      RETURNING *
    `, [
      spiderTrapEnabled !== undefined ? Boolean(spiderTrapEnabled) : true,
      decoyEnvEnabled !== undefined ? Boolean(decoyEnvEnabled) : true,
      canaryTokensEnabled !== undefined ? Boolean(canaryTokensEnabled) : true,
      Number(artificialDelayMs) || 800,
      autoQuarantine !== undefined ? Boolean(autoQuarantine) : true,
      cloudflareSync !== undefined ? Boolean(cloudflareSync) : false
    ]);

    res.json({ success: true, config: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Honeypot Attack Simulator (allows admin or security tester to verify Krawl's traps)
krawlRouter.post("/simulate", async (req: Request, res: Response) => {
  try {
    await ensureKrawlTables();
    const { attackType, customPayload } = req.body;

    const mockIps = [
      "198.51.100.74",
      "203.0.113.195",
      "192.0.2.88",
      "185.191.171.4",
      "45.33.32.156"
    ];
    const simulatedIp = mockIps[Math.floor(Math.random() * mockIps.length)];

    let targetPath = "/krawl/trap";
    let payload = customPayload || "Automated scan probe";
    let action = "SPIDER_TRAPPED";
    let score = 75;

    if (attackType === "SQL_INJECTION") {
      targetPath = "/api/v1/debug?query=";
      payload = customPayload || "' UNION SELECT 1,table_name,column_name FROM information_schema.columns--";
      action = "POISONED_RESPONSE";
      score = 95;
    } else if (attackType === "SENSITIVE_FILE_PROBE") {
      targetPath = "/.env";
      payload = "Direct GET request for root environment variables";
      action = "CANARY_DECOY_SERVED";
      score = 90;
    } else if (attackType === "ADMIN_CREDENTIAL_PROBE") {
      targetPath = "/wp-admin/login";
      payload = "Brute force payload: username='admin' password='Password123!'";
      action = "CREDENTIAL_TRAP_LOGGED";
      score = 85;
    } else if (attackType === "PATH_TRAVERSAL") {
      targetPath = "/api/files/download?path=../../../../etc/passwd";
      payload = "../../../../etc/passwd";
      action = "SANDBOX_BLOCKED";
      score = 92;
    }

    const insertRes = await pool.query(`
      INSERT INTO krawl_attack_logs 
        (ip_address, user_agent, target_path, attack_type, payload, action_taken, delay_ms, reputation_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      simulatedIp,
      "KrawlDeceptionTester/2.4 (Security Audit Simulator)",
      targetPath,
      attackType || "WEB_SCRAPER_BOT",
      payload,
      action,
      950,
      score
    ]);

    res.json({
      success: true,
      message: `Simulated attack successfully captured and neutralized by Krawl Honeypot.`,
      interceptedLog: insertRes.rows[0]
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. IP Quarantine Management (Block / Release)
krawlRouter.post("/quarantine", async (req: Request, res: Response) => {
  try {
    await ensureKrawlTables();
    const { ipAddress, action } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ success: false, error: "Missing ipAddress" });
    }

    if (action === "UNBLOCK") {
      await pool.query("DELETE FROM krawl_attack_logs WHERE ip_address = $1", [ipAddress]);
      return res.json({ success: true, message: `IP ${ipAddress} released from quarantine.` });
    }

    // Default: Add blacklist log
    await pool.query(`
      INSERT INTO krawl_attack_logs 
        (ip_address, user_agent, target_path, attack_type, payload, action_taken, delay_ms, reputation_score)
      VALUES ($1, 'Admin Blacklist Rule', '/manual-quarantine', 'ADMINISTRATIVE_BLOCK', 'Manual administrative IP quarantine', 'PERMANENTLY_BLOCKED', 0, 100)
    `, [ipAddress]);

    res.json({ success: true, message: `IP ${ipAddress} blacklisted and quarantined.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Clear / Reset Logs
krawlRouter.post("/clear-logs", async (req: Request, res: Response) => {
  try {
    await ensureKrawlTables();
    await pool.query("DELETE FROM krawl_attack_logs");
    res.json({ success: true, message: "Krawl deception logs cleared." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================================
// PUBLIC HONEYPOT DECEPTION ENDPOINTS (Catch real crawlers, scanners & scrapers)
// =========================================================================

// Spider Trap Generator (Endless Maze)
krawlRouter.get("/trap/:depth?/:seed?", async (req: Request, res: Response) => {
  const depth = parseInt(req.params.depth || "1", 10);
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown";

  try {
    await ensureKrawlTables();
    await pool.query(`
      INSERT INTO krawl_attack_logs 
        (ip_address, user_agent, target_path, attack_type, payload, action_taken, delay_ms, reputation_score)
      VALUES ($1, $2, $3, 'WEB_SCRAPER_BOT', 'Crawler entered recursive spider trap', 'SPIDER_TRAPPED', 800, 75)
    `, [String(ip), userAgent, req.originalUrl]);
  } catch (e) {
    // Ignore logging failures to not disrupt trap response
  }

  // Generate 8-12 deceptive recursive links to trap the crawler
  const randomSubIds = Array.from({ length: 10 }, (_, i) => `node_${Math.floor(Math.random() * 90000 + 10000)}`);
  
  const linksHtml = randomSubIds.map(id => `
    <li>
      <a href="/api/krawl/trap/${depth + 1}/${id}">
        Document Archive Index [REF-${id}] - Internal Schema Listing
      </a>
    </li>
  `).join("");

  res.type("text/html");
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Directory Index - Internal Cluster Node #${depth}</title>
      <meta name="robots" content="noindex, follow">
    </head>
    <body style="font-family: monospace; padding: 2rem; background: #0f172a; color: #94a3b8;">
      <h2 style="color: #38bdf8;">Cluster Database Storage System - Level ${depth}</h2>
      <p>Decoy Storage Registry Partition: Seed 0x${Math.random().toString(16).slice(2, 8)}</p>
      <hr style="border-color: #334155;" />
      <ul>
        ${linksHtml}
      </ul>
      <p style="font-size: 11px; color: #475569;">Krawl Web Deception Server v2.5 - Honeypot Maze Active</p>
    </body>
    </html>
  `);
});

// Decoy .env File (Catches scanners hunting for keys)
export async function handleDecoyEnv(req: Request, res: Response) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown";

  try {
    await ensureKrawlTables();
    await pool.query(`
      INSERT INTO krawl_attack_logs 
        (ip_address, user_agent, target_path, attack_type, payload, action_taken, delay_ms, reputation_score)
      VALUES ($1, $2, '/.env', 'SENSITIVE_FILE_PROBE', 'Direct probe for environment secrets & API credentials', 'CANARY_DECOY_SERVED', 900, 92)
    `, [String(ip), userAgent]);
  } catch (e) {}

  res.type("text/plain");
  res.send(`# PRODUCTION ENVIRONMENT CONFIGURATION (CANARY TRAP)
NODE_ENV=production
DATABASE_URL=postgres://canary_user:cny_9a87f61b29a@krawl-canary-db.internal:5432/pawshield_prod
JWT_SECRET=canary_token_f931d8e6a2b0c1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7CANARY
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYCANARYTRAP
STRIPE_SECRET_KEY=sk_live_canary_092183921839218392183
HONEYPOT_ID=KRAWL-DECEPTION-NODE-ACTIVE
`);
}

// Decoy Backup SQL File
export async function handleDecoyBackup(req: Request, res: Response) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown";

  try {
    await ensureKrawlTables();
    await pool.query(`
      INSERT INTO krawl_attack_logs 
        (ip_address, user_agent, target_path, attack_type, payload, action_taken, delay_ms, reputation_score)
      VALUES ($1, $2, '/admin/backup.sql', 'CONFIGURATION_LEAK_PROBE', 'Attempted download of raw database backup', 'DECOY_SQL_DUMP_SERVED', 1100, 96)
    `, [String(ip), userAgent]);
  } catch (e) {}

  res.type("text/plain");
  res.send(`-- PawShield Database Backup Export (Decoy Canary Dump)
-- Host: krawl-honeypot-db Database: pawshield_vault
-- ------------------------------------------------------
CREATE TABLE "admin_accounts" (
  "id" int NOT NULL,
  "username" varchar(50) DEFAULT 'superadmin',
  "canary_token" varchar(128) DEFAULT 'CANARY_TRAP_0x99238',
  "password_hash" varchar(255) DEFAULT '$2b$12$e8Yk...canary_decoy_hash'
);
-- Honeypot Trap Signature: BlessedRebuS/Krawl Deception
`);
}
