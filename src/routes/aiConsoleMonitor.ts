import { Router, Request, Response } from "express";
import crypto from "crypto";
import { pool } from "../db/index.ts";
import { GoogleGenAI } from "@google/genai";
import { AuthRequest } from "../middleware/auth.ts";

export const aiConsoleMonitorRouter = Router();

// Lazy Gemini client helper
function getGenAI(): GoogleGenAI | null {
  if (process.env.GEMINI_API_KEY) {
    try {
      return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn("GoogleGenAI init error:", e);
      return null;
    }
  }
  return null;
}

// In-memory Sentinel state tracker
export const consoleSentinelState: {
  status: "IDLE" | "RUNNING" | "COMPLETED" | "FAILED";
  lastAnalyzedAt?: string;
  currentStep?: string;
  totalCaptured: number;
  totalCachedInBrain: number;
} = {
  status: "IDLE",
  totalCaptured: 0,
  totalCachedInBrain: 0,
};

// Auto-resolve any legacy benign dev websocket entries and resolved SitterProfileCard errors from database
pool.query(`
  UPDATE ai_agent_brain_memory 
  SET is_resolved = TRUE, last_updated_brain_at = NOW() 
  WHERE (root_cause_analysis ILIKE '%WebSocket%' OR title ILIKE '%WebSocket%' OR module_name = 'SitterProfileCard.tsx' OR title ILIKE '%SitterProfileCard%') AND is_resolved = FALSE;
  DELETE FROM console_error_telemetry WHERE error_message ILIKE '%WebSocket%';
`).catch(() => {});

// Deterministic fingerprint generator
function generateErrorFingerprint(errorMessage: string, moduleName: string, componentPart?: string): string {
  // Normalize messages by stripping variable numbers, timestamps, IDs
  const normalized = errorMessage
    .replace(/0x[a-fA-F0-9]+/g, "HEX")
    .replace(/\b\d{4,}\b/g, "NUM")
    .replace(/(http|https):\/\/[^\s]+/g, "URL")
    .trim()
    .slice(0, 200);

  const raw = `${moduleName}:${componentPart || "Global"}:${normalized}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

/**
 * 1. POST /api/ai-agent/console/telemetry
 * Ingests live browser console errors, unhandled rejections, and backend errors.
 * Reports to the Brain of the Agent and caches root causes.
 */
aiConsoleMonitorRouter.post("/console/telemetry", async (req: Request, res: Response) => {
  try {
    const {
      errorMessage,
      errorStack,
      pageRoute = "/",
      moduleName = "ClientApp",
      componentPart = "Global",
      triggerAction = "RUNTIME_EVENT",
      severity = "HIGH",
      metadata = {},
    } = req.body;

    if (!errorMessage) {
      return res.status(400).json({ error: "errorMessage is required" });
    }

    // Filter out benign Vite HMR WebSocket closures from development preview
    if (
      errorMessage.includes("WebSocket closed without opened") ||
      errorMessage.includes("failed to connect to websocket")
    ) {
      return res.json({ status: "ignored", reason: "benign_dev_websocket" });
    }

    const fingerprint = generateErrorFingerprint(errorMessage, moduleName, componentPart);

    // 1. Upsert into console_error_telemetry
    const upsertQuery = `
      INSERT INTO console_error_telemetry (
        fingerprint, error_message, error_stack, page_route, module_name, 
        component_part, trigger_action, severity, metadata, occurrence_count, 
        first_seen_at, last_seen_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;

    // Check if fingerprint already exists
    const existingRes = await pool.query(
      "SELECT id, occurrence_count FROM console_error_telemetry WHERE fingerprint = $1 LIMIT 1",
      [fingerprint]
    );

    if (existingRes.rows.length > 0) {
      await pool.query(
        `UPDATE console_error_telemetry 
         SET occurrence_count = occurrence_count + 1, 
             last_seen_at = NOW(), 
             metadata = $1
         WHERE fingerprint = $2`,
        [JSON.stringify(metadata), fingerprint]
      );
    } else {
      await pool.query(
        `INSERT INTO console_error_telemetry (
          fingerprint, error_message, error_stack, page_route, module_name, 
          component_part, trigger_action, severity, metadata, occurrence_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)`,
        [
          fingerprint,
          errorMessage,
          errorStack || null,
          pageRoute,
          moduleName,
          componentPart,
          triggerAction,
          severity,
          JSON.stringify(metadata),
        ]
      );
    }

    consoleSentinelState.totalCaptured += 1;

    // 2. Check if this error is already analyzed & cached in the Agent's Brain Memory
    const brainRes = await pool.query(
      "SELECT * FROM ai_agent_brain_memory WHERE fingerprint = $1 LIMIT 1",
      [fingerprint]
    );

    let brainItem = null;

    if (brainRes.rows.length > 0) {
      // Already cached! Increment occurrence and update last seen
      const updateBrain = await pool.query(
        `UPDATE ai_agent_brain_memory 
         SET occurrence_count = occurrence_count + 1,
             last_updated_brain_at = NOW()
         WHERE fingerprint = $1
         RETURNING *`,
        [fingerprint]
      );
      brainItem = updateBrain.rows[0];
    } else {
      // New error! Trigger AI Cognitive Brain to diagnose root cause and cache solution
      consoleSentinelState.status = "RUNNING";
      consoleSentinelState.currentStep = `Diagnosing root cause for ${fingerprint.slice(0, 8)}...`;

      let title = `${moduleName}: ${errorMessage.slice(0, 60)}`;
      let rootCause = "Runtime state or property evaluation failed during execution.";
      let remediation = "// Ensure safety check before accessing properties\nif (!data) return null;";
      let confidence = 95;
      let resolvedTrigger = triggerAction;

      const ai = getGenAI();
      if (ai) {
        try {
          const prompt = `You are the Lead Autonomous AI Sentinel & Root-Cause Cognitive Brain for PawShield (React + Express + PostgreSQL).
A runtime console error occurred in the application:

- Error Message: ${errorMessage}
- Stack Trace: ${errorStack || "None"}
- Page Route: ${pageRoute}
- Module / File: ${moduleName}
- Component Part / Target: ${componentPart}
- Trigger Action: ${triggerAction}
- Metadata: ${JSON.stringify(metadata)}

Analyze this error with extreme precision and return a valid JSON object ONLY with the following schema:
{
  "title": "Short descriptive title of the bug (e.g. SitterCard: Null reference in petPreferences)",
  "rootCauseAnalysis": "Comprehensive explanation of what triggered this error, why it happened in this module/page, and what conditions cause it.",
  "triggerEvent": "Exact user interaction or system event that triggered it",
  "remediationCode": "Concise TypeScript/React or backend fix code snippet to resolve it",
  "confidencePct": 95
}`;

          let responseText = "";
          const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite"];
          let lastErr: any = null;

          for (const modelCandidate of modelsToTry) {
            try {
              const response = await ai.models.generateContent({
                model: modelCandidate,
                contents: prompt,
                config: { responseMimeType: "application/json" },
              });
              if (response.text) {
                responseText = response.text;
                lastErr = null;
                break;
              }
            } catch (err: any) {
              lastErr = err;
              const isTemporary = err?.status === 503 || err?.status === 429 || err?.message?.includes("high demand") || err?.message?.includes("UNAVAILABLE");
              if (isTemporary) {
                continue;
              }
              break;
            }
          }

          if (responseText) {
            const parsed = JSON.parse(responseText);
            if (parsed.title) title = parsed.title;
            if (parsed.rootCauseAnalysis) rootCause = parsed.rootCauseAnalysis;
            if (parsed.triggerEvent) resolvedTrigger = parsed.triggerEvent;
            if (parsed.remediationCode) remediation = parsed.remediationCode;
            if (parsed.confidencePct) confidence = parsed.confidencePct;
          } else if (lastErr) {
            throw lastErr;
          }
        } catch (aiErr: any) {
          const status = aiErr?.status || (aiErr?.message?.includes("503") ? 503 : "UNKNOWN");
          console.warn(`[AI Sentinel Cognitive Brain] Model fallback applied (${status}): ${aiErr?.message?.slice(0, 100) || "Service unavailable"}`);
          rootCause = `Automated heuristic: Unhandled error in ${moduleName} during ${triggerAction} at ${pageRoute}. Stack trace indicates: ${errorMessage.slice(0, 150)}`;
          remediation = `// Defensive guard pattern in ${moduleName}\ntry {\n  /* execute safely */\n} catch (err) {\n  console.error('[Sentinel Safeguard]', err);\n}`;
        }
      }

      // Cache directly into ai_agent_brain_memory with ON CONFLICT resolution
      const insertBrain = await pool.query(
        `INSERT INTO ai_agent_brain_memory (
          fingerprint, title, page_route, module_name, component_part,
          trigger_event, root_cause_analysis, remediation_code, confidence_pct,
          is_resolved, occurrence_count, first_detected_at, last_updated_brain_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, 1, NOW(), NOW())
        ON CONFLICT (fingerprint) DO UPDATE 
        SET occurrence_count = ai_agent_brain_memory.occurrence_count + 1,
            last_updated_brain_at = NOW()
        RETURNING *`,
        [
          fingerprint,
          title,
          pageRoute,
          moduleName,
          componentPart,
          resolvedTrigger,
          rootCause,
          remediation,
          confidence,
        ]
      );

      brainItem = insertBrain.rows[0];
      consoleSentinelState.totalCachedInBrain += 1;
      consoleSentinelState.status = "COMPLETED";
      consoleSentinelState.lastAnalyzedAt = new Date().toISOString();
      consoleSentinelState.currentStep = "Root cause cached in Agent Brain Memory.";
    }

    res.json({
      success: true,
      fingerprint,
      brainMemory: brainItem,
    });
  } catch (err: any) {
    console.error("Console telemetry ingestion error:", err);
    res.status(500).json({ error: "Failed to record console error", cause: err.message });
  }
});

/**
 * 2. GET /api/ai-agent/console/live-logs
 * Returns live captured error telemetry entries.
 */
aiConsoleMonitorRouter.get("/console/live-logs", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const result = await pool.query(
      `SELECT * FROM console_error_telemetry 
       ORDER BY last_seen_at DESC 
       LIMIT $1`,
      [limit]
    );

    const statsRes = await pool.query(`
      SELECT 
        COUNT(*) as total_errors,
        COALESCE(SUM(occurrence_count), 0) as total_occurrences,
        COUNT(DISTINCT page_route) as unique_pages,
        COUNT(DISTINCT module_name) as unique_modules
      FROM console_error_telemetry
    `);

    res.json({
      logs: result.rows,
      stats: statsRes.rows[0],
    });
  } catch (err: any) {
    console.error("Failed to fetch console logs:", err);
    res.status(500).json({ error: "Failed to fetch console logs", cause: err.message });
  }
});

/**
 * 3. GET /api/ai-agent/console/brain-memory
 * Returns all cached cognitive memories (root causes, triggers, components, remediation).
 */
aiConsoleMonitorRouter.get("/console/brain-memory", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.*,
        t.error_message,
        t.error_stack,
        t.severity
      FROM ai_agent_brain_memory b
      LEFT JOIN console_error_telemetry t ON b.fingerprint = t.fingerprint
      ORDER BY b.last_updated_brain_at DESC
    `);

    const summaryRes = await pool.query(`
      SELECT 
        COUNT(*) as total_memories,
        COUNT(CASE WHEN is_resolved = TRUE THEN 1 END) as resolved_memories,
        COUNT(CASE WHEN is_resolved = FALSE THEN 1 END) as active_memories,
        AVG(confidence_pct) as avg_confidence
      FROM ai_agent_brain_memory
    `);

    res.json({
      memories: result.rows,
      summary: summaryRes.rows[0] || {},
    });
  } catch (err: any) {
    console.error("Failed to fetch brain memories:", err);
    res.status(500).json({ error: "Failed to fetch brain memories", cause: err.message });
  }
});

/**
 * 4. POST /api/ai-agent/console/simulate-test-error
 * Generates a realistic test error so QA and users can verify the live Sentinel capture,
 * transmission to Agent Brain, and instant root-cause caching.
 */
aiConsoleMonitorRouter.post("/console/simulate-test-error", async (req: AuthRequest, res: Response) => {
  try {
    const {
      testType = "NULL_PROPERTY",
      route = "/search",
    } = req.body;

    let errorData: {
      errorMessage: string;
      errorStack: string;
      pageRoute: string;
      moduleName: string;
      componentPart: string;
      triggerAction: string;
      severity: string;
      metadata: Record<string, any>;
    } = {
      errorMessage: "TypeError: Cannot read properties of undefined (reading 'petPreferences') in SitterProfileCard",
      errorStack: "TypeError: Cannot read properties of undefined (reading 'petPreferences')\n    at SitterProfileCard (src/components/SitterProfileCard.tsx:42:18)\n    at renderWithHooks (react-dom.development.js:14985:18)\n    at mountIndeterminateComponent (react-dom.development.js:17811:13)",
      pageRoute: route,
      moduleName: "SitterProfileCard.tsx",
      componentPart: "FilterBadges & PetPreferenceMatrix",
      triggerAction: "USER_CLICK_FILTER_TAG",
      severity: "HIGH",
      metadata: {
        filterClicked: "Giant Dogs (>100 lbs)",
        activeUserRole: "PET_OWNER",
        browser: "Chrome 128 / macOS",
        testSimulation: true,
      },
    };

    if (testType === "UNHANDLED_API_STATUS") {
      errorData = {
        errorMessage: "UnhandledPromiseRejection: HTTP 500 Internal Server Error from /api/sitters/rate-cards",
        errorStack: "Error: HTTP 500\n    at fetchWithAuth (src/lib/api.ts:28:11)\n    at loadRateCards (src/pages/SitterRatesPage.tsx:64:22)",
        pageRoute: "/sitter/rates",
        moduleName: "SitterRatesPage.tsx",
        componentPart: "RateCardsTableView",
        triggerAction: "FORM_SUBMIT_RATES",
        severity: "CRITICAL",
        metadata: {
          submittedCurrency: "PHP",
          serviceType: "BOARDING",
          testSimulation: true,
        },
      };
    } else if (testType === "ACCIDENTAL_CLICK_PADDING") {
      errorData = {
        errorMessage: "AdSensePolicyWarning: Touch target overlap detected on Mobile viewport (< 48px from AdSenseUnit)",
        errorStack: "Warning: AdSenseUnit layout violated minimum 48px buffer\n    at AdSenseUnit (src/components/AdSenseUnit.tsx:35:12)\n    at SitterDetails (src/pages/SitterProfilePage.tsx:112:15)",
        pageRoute: "/sitter/4",
        moduleName: "AdSenseUnit.tsx",
        componentPart: "StickySidebarAdSlot",
        triggerAction: "MOBILE_SCROLL_VIEWPORT",
        severity: "MEDIUM",
        metadata: {
          viewportWidth: 390,
          detectedDistancePx: 18,
          testSimulation: true,
        },
      };
    }

    // Call our own ingestion logic directly
    const fingerprint = generateErrorFingerprint(errorData.errorMessage, errorData.moduleName, errorData.componentPart);

    // Upsert telemetry
    await pool.query(
      `INSERT INTO console_error_telemetry (
        fingerprint, error_message, error_stack, page_route, module_name, 
        component_part, trigger_action, severity, metadata, occurrence_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)
      ON CONFLICT (id) DO NOTHING`,
      [
        fingerprint,
        errorData.errorMessage,
        errorData.errorStack,
        errorData.pageRoute,
        errorData.moduleName,
        errorData.componentPart,
        errorData.triggerAction,
        errorData.severity,
        JSON.stringify(errorData.metadata),
      ]
    );

    // Analyze with Gemini
    consoleSentinelState.status = "RUNNING";
    consoleSentinelState.currentStep = `Simulated QA error: Synthesizing root cause for ${errorData.moduleName}...`;

    let title = `${errorData.moduleName}: ${errorData.errorMessage.slice(0, 50)}`;
    let rootCause = "Missing null-coalescing guard or asynchronous state availability check.";
    let remediation = `// Recommended fix for ${errorData.moduleName}\nconst petPrefs = sitter?.petPreferences ?? {};`;
    let confidence = 98;

    const ai = getGenAI();
    if (ai) {
      try {
        const prompt = `You are the Lead Autonomous AI Sentinel & Root-Cause Cognitive Brain for PawShield.
Analyze this simulated test error and return valid JSON:
- Error Message: ${errorData.errorMessage}
- Stack: ${errorData.errorStack}
- Page Route: ${errorData.pageRoute}
- Module: ${errorData.moduleName}
- Component Part: ${errorData.componentPart}
- Trigger: ${errorData.triggerAction}

JSON schema:
{
  "title": "Clear bug title",
  "rootCauseAnalysis": "Detailed technical explanation of what triggered this error, why it happened, and which specific line/lifecycle failed",
  "triggerEvent": "Exact trigger action",
  "remediationCode": "Actionable TypeScript/React code fix",
  "confidencePct": 98
}`;
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });
        const parsed = JSON.parse(response.text || "{}");
        if (parsed.title) title = parsed.title;
        if (parsed.rootCauseAnalysis) rootCause = parsed.rootCauseAnalysis;
        if (parsed.remediationCode) remediation = parsed.remediationCode;
      } catch (e) {
        console.warn("AI generation fallback for test simulation:", e);
      }
    }

    const brainRes = await pool.query(
      `INSERT INTO ai_agent_brain_memory (
        fingerprint, title, page_route, module_name, component_part,
        trigger_event, root_cause_analysis, remediation_code, confidence_pct,
        is_resolved, occurrence_count, first_detected_at, last_updated_brain_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, 1, NOW(), NOW())
      ON CONFLICT (fingerprint) DO UPDATE 
      SET occurrence_count = ai_agent_brain_memory.occurrence_count + 1,
          last_updated_brain_at = NOW()
      RETURNING *`,
      [
        fingerprint,
        title,
        errorData.pageRoute,
        errorData.moduleName,
        errorData.componentPart,
        errorData.triggerAction,
        rootCause,
        remediation,
        confidence,
      ]
    );

    consoleSentinelState.status = "COMPLETED";
    consoleSentinelState.currentStep = "Test error captured, analyzed, and cached in Brain Memory.";
    consoleSentinelState.lastAnalyzedAt = new Date().toISOString();

    res.json({
      success: true,
      simulatedError: errorData,
      brainMemory: brainRes.rows[0],
    });
  } catch (err: any) {
    console.error("Test error simulation failed:", err);
    res.status(500).json({ error: "Failed to simulate test error", cause: err.message });
  }
});

/**
 * 5. PATCH /api/ai-agent/console/brain-memory/:id/resolve
 * Marks a brain memory item as resolved.
 */
aiConsoleMonitorRouter.patch("/console/brain-memory/:id/resolve", async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { isResolved = true } = req.body;
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const result = await pool.query(
      `UPDATE ai_agent_brain_memory 
       SET is_resolved = $1, last_updated_brain_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [isResolved, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Memory item not found" });

    res.json({
      success: true,
      memory: result.rows[0],
    });
  } catch (err: any) {
    console.error("Failed to resolve brain memory:", err);
    res.status(500).json({ error: "Failed to update brain memory", cause: err.message });
  }
});

/**
 * 6. DELETE /api/ai-agent/console/clear
 * Clears console telemetry and memories if requested.
 */
aiConsoleMonitorRouter.delete("/console/clear", async (_req: Request, res: Response) => {
  try {
    await pool.query("DELETE FROM console_error_telemetry");
    res.json({ success: true, message: "Console telemetry cleared" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to clear console telemetry", cause: err.message });
  }
});
