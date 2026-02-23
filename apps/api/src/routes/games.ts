import { Hono } from "hono";
import { createAuthMiddleware } from "../lib/auth";
import type { JWTPayload } from "../lib/auth";
import { getMockGameState } from "../lib/mockData";
import {
  getGameState,
  startGame,
  pauseGame,
  resumeGame,
  advanceLevel,
  eliminatePlayer,
  updatePlayerStack,
  endGame,
} from "../services/gameService";
import { updateChipDenomination } from "../services/chipService";

export const gameRoutes = new Hono();
export const chipRoutes = new Hono();

const auth = createAuthMiddleware();

// Helper: check if user has required permission or is admin/owner
function hasPermission(user: JWTPayload, permission: string): boolean {
  if (user.isSuperAdmin) return true;
  if (user.permissions.includes(permission)) return true;
  // Check via roles — we check the permission name directly in the flat permissions array
  return false;
}

function isAdminOrOwner(user: JWTPayload): boolean {
  if (user.isSuperAdmin) return true;
  // Roles array may contain systemRole values from membership
  return user.roles.includes("OWNER") || user.roles.includes("ADMIN");
}

function canDo(user: JWTPayload, permission: string): boolean {
  return hasPermission(user, permission) || isAdminOrOwner(user);
}

// Helper to attempt DB call and fall back to mock data
async function tryGetGameState(gameId: string, c: any) {
  try {
    const state = await getGameState(gameId);
    if (state) return { state, isMock: false };
  } catch (e) {
    console.warn("DB unavailable, returning mock data:", (e as Error).message);
  }
  // Fallback to mock
  return { state: getMockGameState(), isMock: true };
}

// -------------------------------------------------------
// GET /games/:gameId/state
// -------------------------------------------------------
gameRoutes.get("/:gameId/state", auth, async (c) => {
  const gameId = c.req.param("gameId");
  const { state, isMock } = await tryGetGameState(gameId, c);

  if (!state) {
    return c.json({ error: "Game not found" }, 404);
  }

  if (isMock) {
    c.header("X-Mock-Data", "true");
  }

  return c.json(state);
});

// -------------------------------------------------------
// POST /games/:gameId/start
// -------------------------------------------------------
gameRoutes.post("/:gameId/start", auth, async (c) => {
  const user = c.get("user") as JWTPayload;
  if (!canDo(user, "start_game")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const state = await startGame(c.req.param("gameId"), user.userId);
    return c.json(state);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

// -------------------------------------------------------
// POST /games/:gameId/pause
// -------------------------------------------------------
gameRoutes.post("/:gameId/pause", auth, async (c) => {
  const user = c.get("user") as JWTPayload;
  if (!canDo(user, "pause_timer")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const state = await pauseGame(c.req.param("gameId"), user.userId);
    return c.json(state);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

// -------------------------------------------------------
// POST /games/:gameId/resume
// -------------------------------------------------------
gameRoutes.post("/:gameId/resume", auth, async (c) => {
  const user = c.get("user") as JWTPayload;
  if (!canDo(user, "pause_timer")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const state = await resumeGame(c.req.param("gameId"), user.userId);
    return c.json(state);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

// -------------------------------------------------------
// POST /games/:gameId/advance-level
// -------------------------------------------------------
gameRoutes.post("/:gameId/advance-level", auth, async (c) => {
  const user = c.get("user") as JWTPayload;
  if (!canDo(user, "pause_timer")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  try {
    const state = await advanceLevel(c.req.param("gameId"), user.userId);
    return c.json(state);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

// -------------------------------------------------------
// POST /games/:gameId/eliminate
// -------------------------------------------------------
gameRoutes.post("/:gameId/eliminate", auth, async (c) => {
  const user = c.get("user") as JWTPayload;
  if (!canDo(user, "eliminate_players")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const body = await c.req.json();
  const { personId, eliminatedBy } = body;

  if (!personId) {
    return c.json({ error: "personId is required" }, 400);
  }

  try {
    const state = await eliminatePlayer(
      c.req.param("gameId"),
      personId,
      user.userId,
      eliminatedBy
    );
    return c.json(state);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

// -------------------------------------------------------
// PATCH /games/:gameId/sessions/:sessionId/stack
// -------------------------------------------------------
gameRoutes.patch("/:gameId/sessions/:sessionId/stack", auth, async (c) => {
  const user = c.get("user") as JWTPayload;
  const body = await c.req.json();
  const { stackValue } = body;

  if (typeof stackValue !== "number" || stackValue < 0) {
    return c.json({ error: "stackValue must be a non-negative number" }, 400);
  }

  // Any authenticated player can update their own stack; admins can update anyone's
  // (Session ownership check would require reading the session, but for simplicity
  //  we trust the JWT user here — full ownership check is a Phase 3 refinement)

  try {
    const session = await updatePlayerStack(
      c.req.param("sessionId"),
      stackValue,
      user.userId
    );
    return c.json(session);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

// -------------------------------------------------------
// POST /games/:gameId/end
// -------------------------------------------------------
gameRoutes.post("/:gameId/end", auth, async (c) => {
  const user = c.get("user") as JWTPayload;
  if (!isAdminOrOwner(user)) {
    return c.json({ error: "Only Owner or Admin can end a game" }, 403);
  }

  try {
    const state = await endGame(c.req.param("gameId"), user.userId);
    return c.json(state);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

// -------------------------------------------------------
// PATCH /chips/denominations/:denominationId
// -------------------------------------------------------
chipRoutes.patch("/denominations/:denominationId", auth, async (c) => {
  const user = c.get("user") as JWTPayload;
  if (!canDo(user, "manage_money")) {
    return c.json({ error: "Insufficient permissions" }, 403);
  }

  const body = await c.req.json();
  const { newValue, gameId } = body;

  if (typeof newValue !== "number" || newValue <= 0) {
    return c.json({ error: "newValue must be a positive number" }, 400);
  }

  try {
    const result = await updateChipDenomination(
      c.req.param("denominationId"),
      newValue,
      user.userId,
      gameId
    );
    return c.json(result);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});
