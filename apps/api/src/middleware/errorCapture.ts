import type { Context } from "hono";
import { db } from "../../../../packages/db/src/client";
import { sendSms } from "../services/notificationService";
import type { JWTPayload } from "../lib/auth";

type ErrorSeverity = "P0_CRITICAL" | "P1_HIGH" | "P2_MEDIUM" | "P3_LOW";

/**
 * Global error handler for Hono's app.onError().
 * Logs unhandled errors to ErrorLog table and sends P0 SMS alerts.
 */
export function errorCaptureHandler(err: Error, c: Context) {
  const severity = determineSeverity(c, err);
  const user = c.get("user") as JWTPayload | undefined;

  // Write to ErrorLog table (non-blocking — don't await)
  db.errorLog
    .create({
      data: {
        clubId: user?.clubId ?? null,
        personId: user?.userId ?? null,
        severity,
        errorType: err.name || "UnknownError",
        message: err.message,
        stackTrace: err.stack ?? null,
        route: c.req.path,
        requestData: sanitizeRequest(c),
      },
    })
    .catch(console.error); // never let logging crash the response

  // P0: send SMS to Ron via Twilio
  if (severity === "P0_CRITICAL") {
    sendP0Alert(c, err).catch(console.error);
  }

  console.error(
    `[${severity}] ${err.name}: ${err.message} on ${c.req.method} ${c.req.path}`
  );

  return c.json({ error: "Internal server error" }, 500);
}

function determineSeverity(c: Context, error: Error): ErrorSeverity {
  const path = c.req.path;
  // P0: auth failures, unhandled 500s on critical routes
  if (path.includes("/auth") || path.includes("/games")) {
    return "P0_CRITICAL";
  }
  // P1: other 500s
  return "P1_HIGH";
}

async function sendP0Alert(c: Context, error: Error) {
  const adminPhone = process.env.SUPER_ADMIN_PHONE;

  if (!adminPhone) {
    console.log(
      `[P0 ALERT STUB] 🚨 PKR Night P0: ${error.name} on ${c.req.path} | ${new Date().toISOString()}`
    );
    return;
  }

  const user = c.get("user") as JWTPayload | undefined;
  const message = `🚨 PKR Night P0: ${error.name} on ${c.req.path} | Club: ${user?.clubId ?? "none"} | ${new Date().toISOString()}`;

  await sendSms(adminPhone, message);
}

function sanitizeRequest(c: Context) {
  return {
    method: c.req.method,
    path: c.req.path,
    // Never log: Authorization header, phone numbers, tokens
  } as { method: string; path: string };
}
