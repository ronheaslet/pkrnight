import { Hono } from "hono";
import { createAuthMiddleware, type JWTPayload } from "../lib/auth";
import {
  requireClubMember,
  requirePermission,
  requireRole,
} from "../middleware/permissions";
import {
  finalizeGameResults,
  getGameResults,
} from "../services/resultsService";
import {
  getStandings,
  getPlayerSeasonStats,
  getClubAllTimeStats,
} from "../services/standingsService";
import {
  getTrophiesForClub,
  getTrophiesForPerson,
  createTrophy,
  awardTrophy,
} from "../services/trophyService";
import { sendPostGameResults } from "../services/postGameService";
import {
  getMockGameResults,
  getMockStandings,
  getMockAllTimeStats,
  getMockPlayerSeasonStats,
  getMockTrophies,
  getMockTrophyAwards,
} from "../lib/mockData";

export const resultsRoutes = new Hono();
resultsRoutes.use("*", createAuthMiddleware());

// ---------------------------------------------------------------------------
// POST /:clubId/games/:gameId/finalize
// ---------------------------------------------------------------------------
resultsRoutes.post(
  "/:clubId/games/:gameId/finalize",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const gameId = c.req.param("gameId");

    try {
      const results = await finalizeGameResults(gameId, user.userId);
      // Also send notifications to all club members
      const notifications = await sendPostGameResults(gameId);
      return c.json({ results, notifications });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 400);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /:clubId/games/:gameId/results
// ---------------------------------------------------------------------------
resultsRoutes.get(
  "/:clubId/games/:gameId/results",
  requireClubMember(),
  async (c) => {
    const gameId = c.req.param("gameId");

    try {
      const results = await getGameResults(gameId);
      return c.json(results);
    } catch {
      if (gameId === "mock-game-001") {
        c.header("X-Mock-Data", "true");
        return c.json(getMockGameResults());
      }
      return c.json({ error: "Game not found" }, 404);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /:clubId/standings/all-time — MUST be before :seasonId route
// ---------------------------------------------------------------------------
resultsRoutes.get(
  "/:clubId/standings/all-time",
  requireClubMember(),
  async (c) => {
    const clubId = c.req.param("clubId");

    try {
      const stats = await getClubAllTimeStats(clubId);
      return c.json(stats);
    } catch {
      if (clubId === "mock-club-001") {
        c.header("X-Mock-Data", "true");
        return c.json(getMockAllTimeStats());
      }
      return c.json({ error: "Club not found" }, 404);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /:clubId/standings/:seasonId
// ---------------------------------------------------------------------------
resultsRoutes.get(
  "/:clubId/standings/:seasonId",
  requireClubMember(),
  async (c) => {
    const clubId = c.req.param("clubId");
    const seasonId = c.req.param("seasonId");
    const type = (c.req.query("type") ?? "points") as
      | "points"
      | "bounties"
      | "earnings"
      | "games";

    try {
      const standings = await getStandings(clubId, seasonId, type);
      return c.json({ type, seasonId, standings });
    } catch {
      if (clubId === "mock-club-001") {
        c.header("X-Mock-Data", "true");
        return c.json({ type, seasonId, standings: getMockStandings() });
      }
      return c.json({ error: "Standings not found" }, 404);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /:clubId/standings/:seasonId/player/:personId
// ---------------------------------------------------------------------------
resultsRoutes.get(
  "/:clubId/standings/:seasonId/player/:personId",
  requireClubMember(),
  async (c) => {
    const clubId = c.req.param("clubId");
    const personId = c.req.param("personId");
    const seasonId = c.req.param("seasonId");

    try {
      const stats = await getPlayerSeasonStats(clubId, personId, seasonId);
      return c.json(stats);
    } catch {
      if (clubId === "mock-club-001") {
        c.header("X-Mock-Data", "true");
        return c.json(getMockPlayerSeasonStats());
      }
      return c.json({ error: "Player stats not found" }, 404);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /:clubId/trophies
// ---------------------------------------------------------------------------
resultsRoutes.get(
  "/:clubId/trophies",
  requireClubMember(),
  async (c) => {
    const clubId = c.req.param("clubId");

    try {
      const trophies = await getTrophiesForClub(clubId);
      return c.json(trophies);
    } catch {
      if (clubId === "mock-club-001") {
        c.header("X-Mock-Data", "true");
        return c.json(getMockTrophies());
      }
      return c.json({ error: "Trophies not found" }, 404);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /:clubId/trophies/person/:personId
// ---------------------------------------------------------------------------
resultsRoutes.get(
  "/:clubId/trophies/person/:personId",
  requireClubMember(),
  async (c) => {
    const clubId = c.req.param("clubId");
    const personId = c.req.param("personId");

    try {
      const awards = await getTrophiesForPerson(clubId, personId);
      return c.json(awards);
    } catch {
      if (clubId === "mock-club-001") {
        c.header("X-Mock-Data", "true");
        return c.json(getMockTrophyAwards());
      }
      return c.json({ error: "Trophy awards not found" }, 404);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /:clubId/trophies
// ---------------------------------------------------------------------------
resultsRoutes.post(
  "/:clubId/trophies",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const body = await c.req.json();

    try {
      const trophy = await createTrophy(clubId, body, user.userId);
      return c.json(trophy, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 400);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /:clubId/trophies/:trophyId/award
// ---------------------------------------------------------------------------
resultsRoutes.post(
  "/:clubId/trophies/:trophyId/award",
  requireClubMember(),
  requirePermission("award_trophies"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const trophyId = c.req.param("trophyId");
    const body = await c.req.json();

    try {
      const award = await awardTrophy(
        clubId,
        trophyId,
        body.personId,
        user.userId,
        {
          seasonId: body.seasonId,
          gameId: body.gameId,
          note: body.note,
        }
      );
      return c.json(award, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 400);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /:clubId/games/:gameId/send-results
// ---------------------------------------------------------------------------
resultsRoutes.post(
  "/:clubId/games/:gameId/send-results",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const gameId = c.req.param("gameId");

    try {
      const result = await sendPostGameResults(gameId);
      return c.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 400);
    }
  }
);
