import type { Context, Next } from "hono";
import type { JWTPayload } from "../lib/auth";
import { prisma } from "../../../../packages/db/src/client";

// In-memory cache: key = "clubId:featureKey", value = { result, expiresAt }
const featureCache = new Map<
  string,
  { result: boolean; expiresAt: number }
>();

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Invalidate a specific cache entry. Called when a club's feature flag is updated.
 */
export function invalidateFeatureCache(
  clubId: string,
  featureKey: string
): void {
  featureCache.delete(`${clubId}:${featureKey}`);
}

/**
 * Hono middleware factory. Checks a feature is accessible for the current club:
 * 1. Load GlobalFeatureFlag where featureKey matches
 * 2. If GLOBALLY_OFF: 403
 * 3. If GLOBALLY_ON: pass through
 * 4. If CLUB_CONFIGURABLE: check ClubFeatureFlag for clubId
 *    - No record = enabled by default
 *    - isEnabled false = 403
 * 5. Cache results for 60s per clubId+featureKey
 */
export function requireFeature(featureKey: string) {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as JWTPayload | undefined;
    if (!user) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const clubId = user.clubId || c.req.param("clubId");
    if (!clubId) {
      return c.json({ error: "no_club_context" }, 400);
    }

    // Check cache first
    const cacheKey = `${clubId}:${featureKey}`;
    const cached = featureCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      if (!cached.result) {
        return c.json(
          { error: "feature_disabled_for_club", featureKey },
          403
        );
      }
      await next();
      return;
    }

    try {
      const globalFlag = await prisma.globalFeatureFlag.findUnique({
        where: { featureKey },
      });

      if (!globalFlag) {
        return c.json({ error: "feature_not_found", featureKey }, 404);
      }

      if (globalFlag.state === "GLOBALLY_OFF") {
        featureCache.set(cacheKey, {
          result: false,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return c.json({ error: "feature_disabled", featureKey }, 403);
      }

      if (globalFlag.state === "GLOBALLY_ON") {
        featureCache.set(cacheKey, {
          result: true,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        await next();
        return;
      }

      // CLUB_CONFIGURABLE — check club-level flag
      const clubFlag = await prisma.clubFeatureFlag.findUnique({
        where: { clubId_featureKey: { clubId, featureKey } },
      });

      // Default to enabled if no club-level record exists
      const isEnabled = clubFlag ? clubFlag.isEnabled : true;

      featureCache.set(cacheKey, {
        result: isEnabled,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      if (!isEnabled) {
        return c.json(
          { error: "feature_disabled_for_club", featureKey },
          403
        );
      }

      await next();
    } catch {
      // If DB is unavailable, allow the feature (fail-open for dev)
      await next();
    }
  };
}

/**
 * Helper function (not middleware). For context-locked features:
 * - If gameId provided, check Game.status
 * - If ACTIVE or PAUSED: return false (feature locked)
 * - Otherwise: return true
 */
export async function checkContextLock(
  featureKey: string,
  gameId?: string
): Promise<boolean> {
  if (!gameId) return true;

  try {
    const globalFlag = await prisma.globalFeatureFlag.findUnique({
      where: { featureKey },
    });

    if (!globalFlag?.isContextLocked) return true;

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { status: true },
    });

    if (!game) return true;

    if (game.status === "ACTIVE" || game.status === "PAUSED") {
      return false; // Feature locked during live game
    }

    return true;
  } catch {
    return true; // Fail-open
  }
}
