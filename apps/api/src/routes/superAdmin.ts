import { Hono } from "hono";
import { createAuthMiddleware } from "../lib/auth";
import { requireSuperAdmin } from "../middleware/permissions";
import type { JWTPayload } from "../lib/auth";
import {
  getSystemStatus,
  getClubsOverview,
  getClubDetail,
  getErrorFeed,
  resolveError,
  getAiUsageSummary,
  getGrowthStats,
  getAllFeatureFlags,
  updateGlobalFeatureFlag,
  approvePlanChange,
  deactivateClub,
  reactivateClub,
} from "../services/superAdminService";

export const superAdminRoutes = new Hono();

// Auth + Super Admin check on ALL routes
superAdminRoutes.use("*", createAuthMiddleware());
superAdminRoutes.use("*", requireSuperAdmin());

// ─── SYSTEM STATUS ──────────────────────────────────────────────────────────

superAdminRoutes.get("/status", async (c) => {
  try {
    const status = await getSystemStatus();
    return c.json(status);
  } catch (err) {
    console.error("Failed to get system status:", err);
    return c.json({ error: "Failed to load system status" }, 500);
  }
});

// ─── CLUBS ──────────────────────────────────────────────────────────────────

superAdminRoutes.get("/clubs", async (c) => {
  try {
    const limit = Number(c.req.query("limit")) || 20;
    const offset = Number(c.req.query("offset")) || 0;
    const search = c.req.query("search") || undefined;
    const result = await getClubsOverview({ limit, offset, search });
    return c.json(result);
  } catch (err) {
    console.error("Failed to get clubs overview:", err);
    return c.json({ error: "Failed to load clubs" }, 500);
  }
});

superAdminRoutes.get("/clubs/:clubId", async (c) => {
  try {
    const clubId = c.req.param("clubId");
    const detail = await getClubDetail(clubId);
    return c.json(detail);
  } catch (err) {
    console.error("Failed to get club detail:", err);
    return c.json({ error: "Club not found" }, 404);
  }
});

superAdminRoutes.patch("/clubs/:clubId/plan", async (c) => {
  try {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const { planTier } = await c.req.json();

    if (!["FREE", "STARTER", "PRO", "ENTERPRISE"].includes(planTier)) {
      return c.json({ error: "Invalid plan tier" }, 400);
    }

    const updated = await approvePlanChange(clubId, planTier, user.userId);
    return c.json(updated);
  } catch (err) {
    console.error("Failed to update plan:", err);
    return c.json({ error: "Failed to update plan" }, 500);
  }
});

superAdminRoutes.patch("/clubs/:clubId/deactivate", async (c) => {
  try {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const { reason } = await c.req.json();

    if (!reason || typeof reason !== "string") {
      return c.json({ error: "Reason is required" }, 400);
    }

    const updated = await deactivateClub(clubId, reason, user.userId);
    return c.json(updated);
  } catch (err) {
    console.error("Failed to deactivate club:", err);
    return c.json({ error: "Failed to deactivate club" }, 500);
  }
});

superAdminRoutes.patch("/clubs/:clubId/reactivate", async (c) => {
  try {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const updated = await reactivateClub(clubId, user.userId);
    return c.json(updated);
  } catch (err) {
    console.error("Failed to reactivate club:", err);
    return c.json({ error: "Failed to reactivate club" }, 500);
  }
});

// ─── ERRORS ─────────────────────────────────────────────────────────────────

superAdminRoutes.get("/errors", async (c) => {
  try {
    const severity = c.req.query("severity") || undefined;
    const resolved = c.req.query("resolved") || undefined;
    const limit = Number(c.req.query("limit")) || 50;
    const offset = Number(c.req.query("offset")) || 0;
    const result = await getErrorFeed({ severity, resolved, limit, offset });
    return c.json(result);
  } catch (err) {
    console.error("Failed to get error feed:", err);
    return c.json({ error: "Failed to load errors" }, 500);
  }
});

superAdminRoutes.patch("/errors/:errorLogId/resolve", async (c) => {
  try {
    const user = c.get("user") as JWTPayload;
    const errorLogId = c.req.param("errorLogId");
    const updated = await resolveError(errorLogId, user.userId);
    return c.json(updated);
  } catch (err) {
    console.error("Failed to resolve error:", err);
    return c.json({ error: "Failed to resolve error" }, 500);
  }
});

// ─── AI USAGE ───────────────────────────────────────────────────────────────

superAdminRoutes.get("/ai-usage", async (c) => {
  try {
    const period = (c.req.query("period") as "day" | "week" | "month") || "month";
    if (!["day", "week", "month"].includes(period)) {
      return c.json({ error: "Invalid period. Use day, week, or month" }, 400);
    }
    const result = await getAiUsageSummary({ period });
    return c.json(result);
  } catch (err) {
    console.error("Failed to get AI usage:", err);
    return c.json({ error: "Failed to load AI usage" }, 500);
  }
});

// ─── GROWTH ─────────────────────────────────────────────────────────────────

superAdminRoutes.get("/growth", async (c) => {
  try {
    const stats = await getGrowthStats();
    return c.json(stats);
  } catch (err) {
    console.error("Failed to get growth stats:", err);
    return c.json({ error: "Failed to load growth stats" }, 500);
  }
});

// ─── FEATURE FLAGS ──────────────────────────────────────────────────────────

superAdminRoutes.get("/features", async (c) => {
  try {
    const flags = await getAllFeatureFlags();
    return c.json(flags);
  } catch (err) {
    console.error("Failed to get feature flags:", err);
    return c.json({ error: "Failed to load feature flags" }, 500);
  }
});

superAdminRoutes.patch("/features/:featureKey", async (c) => {
  try {
    const user = c.get("user") as JWTPayload;
    const featureKey = c.req.param("featureKey");
    const { state } = await c.req.json();

    if (!["GLOBALLY_ON", "CLUB_CONFIGURABLE", "GLOBALLY_OFF"].includes(state)) {
      return c.json({ error: "Invalid state. Use GLOBALLY_ON, CLUB_CONFIGURABLE, or GLOBALLY_OFF" }, 400);
    }

    const updated = await updateGlobalFeatureFlag(featureKey, state, user.userId);
    return c.json(updated);
  } catch (err) {
    console.error("Failed to update feature flag:", err);
    return c.json({ error: "Failed to update feature flag" }, 500);
  }
});
