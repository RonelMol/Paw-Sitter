/**
 * PawShield AI Console Sentinel & Cognitive Brain Reporter
 * Autonomous client-side observer that captures runtime exceptions, unhandled rejections,
 * and console errors, and dispatches them to the AI Agent's Cognitive Brain Memory.
 */

// In-memory deduplication cache to prevent telemetry flooding
const recentErrorSignatures = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 10000; // 10 seconds

export interface ErrorReportContext {
  moduleName?: string;
  componentPart?: string;
  triggerAction?: string;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  metadata?: Record<string, any>;
}

/**
 * Reports a caught or intercepted error directly to the Agent's Brain Memory.
 */
export async function reportErrorToBrain(
  error: Error | string,
  context: ErrorReportContext = {}
): Promise<void> {
  try {
    const errorMessage = typeof error === "string" ? error : error?.message || "Unknown error";
    const errorStack = typeof error === "string" ? "" : error?.stack || "";

    // Ignore benign environment Vite WebSocket closures and ResizeObserver events
    if (
      errorMessage.includes("WebSocket closed without opened") ||
      errorMessage.includes("failed to connect to websocket") ||
      errorMessage.includes("WebSocket connection") ||
      errorMessage.includes("ResizeObserver loop")
    ) {
      return;
    }
    const pageRoute = window.location.pathname || "/";
    const moduleName = context.moduleName || extractModuleFromStack(errorStack) || "ClientApp";
    const componentPart = context.componentPart || getActiveElementContext() || "Global";
    const triggerAction = context.triggerAction || "RUNTIME_EXCEPTION";
    const severity = context.severity || (errorStack.includes("TypeError") || errorStack.includes("ReferenceError") ? "CRITICAL" : "HIGH");

    // Generate lightweight in-browser signature
    const signature = `${pageRoute}:${moduleName}:${errorMessage.slice(0, 100)}`;
    const now = Date.now();
    const lastSent = recentErrorSignatures.get(signature);

    if (lastSent && now - lastSent < DEDUPLICATION_WINDOW_MS) {
      // Suppress duplicate spam within the window
      return;
    }
    recentErrorSignatures.set(signature, now);

    const payload = {
      errorMessage,
      errorStack,
      pageRoute,
      moduleName,
      componentPart,
      triggerAction,
      severity,
      metadata: {
        ...context.metadata,
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        timestamp: new Date().toISOString(),
      },
    };

    // Dispatch to Agent Brain Telemetry endpoint
    await fetch("/api/ai-agent/console/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Silently catch to avoid cyclic error loops
    });
  } catch (err) {
    // Fail-safe: Sentinel must never crash the host application
  }
}

/**
 * Initializes global runtime window and console listeners.
 * Safe to call multiple times (guarded by window flag).
 */
export function initConsoleSentinel(): void {
  if (typeof window === "undefined") return;

  const WIN = window as any;
  if (WIN.__PAWSHIELD_CONSOLE_SENTINEL_INITIALIZED__) return;
  WIN.__PAWSHIELD_CONSOLE_SENTINEL_INITIALIZED__ = true;

  // 1. Intercept unhandled window errors
  window.addEventListener("error", (event: ErrorEvent) => {
    // Ignore benign cross-origin script errors or Vite HMR reconnect noise
    const msg = event.message || "";
    if (
      msg.includes("ResizeObserver") || 
      msg.includes("failed to connect to websocket") ||
      msg.includes("WebSocket closed without opened") ||
      msg.includes("WebSocket")
    ) {
      return;
    }

    reportErrorToBrain(event.error || event.message, {
      moduleName: event.filename ? extractFileName(event.filename) : undefined,
      componentPart: `Line ${event.lineno}:${event.colno}`,
      triggerAction: "UNCAUGHT_WINDOW_ERROR",
      severity: "CRITICAL",
    });
  });

  // 2. Intercept unhandled promise rejections
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const msg = typeof reason === "string" ? reason : reason?.message || "Unhandled Promise Rejection";

    // Ignore benign network aborts and benign Vite HMR websocket disconnects
    if (
      msg.includes("AbortError") || 
      msg.includes("Failed to fetch") ||
      msg.includes("WebSocket closed without opened") ||
      msg.includes("failed to connect to websocket") ||
      msg.includes("WebSocket")
    ) {
      return;
    }

    reportErrorToBrain(reason || msg, {
      triggerAction: "UNHANDLED_PROMISE_REJECTION",
      severity: "HIGH",
    });
  });

  // 3. Wrap console.error to capture non-thrown errors logged by third-party libs or React error boundary
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    originalConsoleError.apply(console, args);

    try {
      const firstArg = args[0];
      const errorStr = typeof firstArg === "string" ? firstArg : (firstArg?.message || JSON.stringify(firstArg));

      // Filter out benign Vite/Dev server logs and internal Sentinel logs
      if (
        typeof errorStr === "string" && 
        (errorStr.includes("[vite]") || 
         errorStr.includes("WebSocket") || 
         errorStr.includes("Warning:") || 
         errorStr.includes("[Sentinel") || 
         errorStr.includes("[AI Sentinel") ||
         errorStr.includes("telemetry ingestion") ||
         errorStr.includes("Failed to record console error"))
      ) {
        return;
      }

      if (firstArg instanceof Error) {
        reportErrorToBrain(firstArg, { triggerAction: "CONSOLE_ERROR_CALL" });
      } else if (typeof firstArg === "string" && firstArg.length > 5) {
        reportErrorToBrain(firstArg, { triggerAction: "CONSOLE_ERROR_CALL" });
      }
    } catch {
      // Silently protect native console
    }
  };
}

// Helpers
function extractFileName(fullPath: string): string {
  try {
    const parts = fullPath.split("/");
    return parts[parts.length - 1] || fullPath;
  } catch {
    return fullPath;
  }
}

function extractModuleFromStack(stack?: string): string | null {
  if (!stack) return null;
  const match = stack.match(/at\s+([A-Za-z0-9_]+)\s+\((.*):(\d+):(\d+)\)/);
  if (match && match[1]) {
    return `${match[1]}.tsx`;
  }
  return null;
}

function getActiveElementContext(): string {
  try {
    const el = document.activeElement;
    if (!el || el === document.body) return "WindowContext";
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const className = typeof el.className === "string" ? `.${el.className.split(" ")[0]}` : "";
    return `${tag}${id || className}`;
  } catch {
    return "DOMTarget";
  }
}
