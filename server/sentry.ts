/**
 * Sentry Error Tracking Integration
 * ==================================
 * Centralized error monitoring and reporting
 *
 * Setup:
 * 1. Create a Sentry account at https://sentry.io
 * 2. Create a new Node.js project
 * 3. Copy the DSN and add to .env as SENTRY_DSN
 */

import { Express, Request, Response, NextFunction } from "express";

// ============================================================================
// Configuration
// ============================================================================

const SENTRY_DSN = process.env.SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const APP_VERSION = process.env.APP_VERSION || "1.0.0";

// ============================================================================
// Dynamic Sentry Module Loading
// ============================================================================

let Sentry: typeof import("@sentry/node") | null = null;
let nodeProfilingIntegration: typeof import("@sentry/profiling-node").nodeProfilingIntegration | null = null;

async function loadSentryModules(): Promise<boolean> {
  try {
    Sentry = await import("@sentry/node");
    const profilingModule = await import("@sentry/profiling-node");
    nodeProfilingIntegration = profilingModule.nodeProfilingIntegration;
    return true;
  } catch (error) {
    console.log("[Sentry] Sentry packages not available - error tracking disabled");
    return false;
  }
}

// ============================================================================
// Initialization
// ============================================================================

let sentryInitialized = false;

export async function initSentry(app?: Express): Promise<boolean> {
  if (!SENTRY_DSN) {
    console.log("[Sentry] No SENTRY_DSN configured - error tracking disabled");
    return false;
  }

  if (sentryInitialized) {
    console.log("[Sentry] Already initialized");
    return true;
  }

  // Try to load Sentry modules
  const modulesLoaded = await loadSentryModules();
  if (!modulesLoaded || !Sentry || !nodeProfilingIntegration) {
    return false;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      release: `trial-navigator@${APP_VERSION}`,

      // Performance monitoring
      tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0, // 10% in production, 100% in dev
      profilesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,

      // Integrations
      integrations: [
        nodeProfilingIntegration(),
      ],

      // Filter sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }

        // Remove sensitive data from request body
        if (event.request?.data) {
          const sensitiveFields = ["password", "token", "apiKey", "secret"];
          const data = event.request.data;
          if (typeof data === "object") {
            sensitiveFields.forEach(field => {
              if (field in data) {
                (data as any)[field] = "[REDACTED]";
              }
            });
          }
        }

        return event;
      },

      // Ignore certain errors
      ignoreErrors: [
        // Network errors that aren't our fault
        "ECONNRESET",
        "ETIMEDOUT",
        "ENOTFOUND",
        // Expected errors
        "Authentication required",
        "Access denied",
      ],
    });

    // Setup Express integration if app provided
    // Note: Sentry v8 uses automatic instrumentation via OpenTelemetry
    // No need for explicit request/tracing handlers

    sentryInitialized = true;
    console.log("[Sentry] Initialized successfully");
    return true;
  } catch (error) {
    console.error("[Sentry] Failed to initialize:", error);
    return false;
  }
}

// ============================================================================
// Express Error Handler
// ============================================================================

export function sentryErrorHandler() {
  // Return error handler middleware compatible with Sentry v8
  return (err: any, _req: Request, _res: Response, next: NextFunction) => {
    if (!Sentry || !sentryInitialized) {
      return next(err);
    }

    // Determine if we should capture this error
    const shouldCapture =
      (err.statusCode >= 500) ||
      (err.statusCode >= 400 && err.code !== "VALIDATION_ERROR");

    if (shouldCapture) {
      Sentry.captureException(err);
    }

    next(err);
  };
}

// ============================================================================
// Manual Error Capture
// ============================================================================

export function captureException(error: Error, context?: Record<string, any>): string | null {
  if (!sentryInitialized || !Sentry) {
    console.error("[Sentry] Not initialized - error not captured:", error.message);
    return null;
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info"): string | null {
  if (!sentryInitialized || !Sentry) {
    console.log(`[Sentry] Not initialized - message not captured: ${message}`);
    return null;
  }

  return Sentry.captureMessage(message, level);
}

// ============================================================================
// User Context
// ============================================================================

export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  if (!sentryInitialized || !Sentry) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}

// ============================================================================
// Custom Context & Tags
// ============================================================================

export function setTag(key: string, value: string): void {
  if (!sentryInitialized || !Sentry) return;
  Sentry.setTag(key, value);
}

export function setContext(name: string, context: Record<string, any>): void {
  if (!sentryInitialized || !Sentry) return;
  Sentry.setContext(name, context);
}

// ============================================================================
// Breadcrumbs
// ============================================================================

export function addBreadcrumb(
  message: string,
  category: string = "custom",
  level: "debug" | "info" | "warning" | "error" = "info",
  data?: Record<string, any>
): void {
  if (!sentryInitialized || !Sentry) return;

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

// ============================================================================
// Flush (for graceful shutdown)
// ============================================================================

export async function flush(timeout: number = 2000): Promise<boolean> {
  if (!sentryInitialized || !Sentry) return true;
  return Sentry.flush(timeout);
}

// ============================================================================
// Check if Sentry is enabled
// ============================================================================

export function isEnabled(): boolean {
  return sentryInitialized;
}

// ============================================================================
// Express Middleware for setting user context
// ============================================================================

export function userContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (user) {
    setUser({
      id: user.claims?.sub || user.id,
      email: user.claims?.email || user.email,
    });
  }
  next();
}
