import { Hono } from "hono";
import { prisma } from "../../../../packages/db/src/client";
import { createAuthMiddleware, type JWTPayload } from "../lib/auth";
import { requireClubMember, requireRole } from "../middleware/permissions";
import {
  createOrUpdateVenueProfile,
  getVenueProfile,
  getPublicVenues,
} from "../services/venueService";
import {
  getBonusChipConfig,
  setBonusChipConfig,
  grantBonusChips,
  getBonusChipLeaderboard,
} from "../services/bonusChipService";
import {
  checkInByQr,
  checkInByName,
  checkInSelectedMember,
  createWalkIn,
  claimWalkIn,
  getCheckedInPlayers,
} from "../services/checkInService";
import {
  getTableAssignments,
  balanceTables,
  approveMoves,
  formFinalTable,
} from "../services/tableService";
import {
  createCircuit,
  getCircuit,
  updateCircuit,
  deactivateCircuit,
  addVenueToCircuit,
  removeVenueFromCircuit,
  getCircuitVenues,
  createSeason,
  updateSeason,
  getSeasons,
  joinCircuit,
  getCircuitStandings,
  recalculateStandings,
} from "../services/circuitService";
import {
  getMockVenueProfile,
  getMockCheckInList,
  getMockTableAssignments,
  getMockBalanceSuggestion,
  getMockBonusChipLeaderboard,
} from "../lib/mockData";

// ============================================================
// Pub Poker Routes — mounted at /pub
// ============================================================
export const pubPokerRoutes = new Hono();

// Most routes require auth — but public venues and walk-in claim do not
const authed = new Hono();
authed.use("*", createAuthMiddleware());

// --------------------------------------------------
// Venue routes
// --------------------------------------------------

// GET /pub/clubs/:clubId/venue
authed.get("/clubs/:clubId/venue", requireClubMember(), async (c) => {
  const clubId = c.req.param("clubId");
  try {
    const profile = await getVenueProfile(clubId);
    return c.json(profile ?? { _empty: true });
  } catch {
    if (clubId === "mock-club-pub-001") {
      return c.json(getMockVenueProfile());
    }
    return c.json({ error: "Failed to load venue profile" }, 500);
  }
});

// PUT /pub/clubs/:clubId/venue
authed.put(
  "/clubs/:clubId/venue",
  requireClubMember(),
  requireRole("OWNER"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const body = await c.req.json();

    try {
      const profile = await createOrUpdateVenueProfile(clubId, body, user.userId);
      return c.json(profile);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update venue";
      return c.json({ error: message }, 400);
    }
  }
);

// --------------------------------------------------
// Bonus chip routes
// --------------------------------------------------

// GET /pub/clubs/:clubId/bonus-config
authed.get(
  "/clubs/:clubId/bonus-config",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const clubId = c.req.param("clubId");
    try {
      const config = await getBonusChipConfig(clubId);
      return c.json(config);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load config";
      return c.json({ error: message }, 400);
    }
  }
);

// PUT /pub/clubs/:clubId/bonus-config
authed.put(
  "/clubs/:clubId/bonus-config",
  requireClubMember(),
  requireRole("OWNER"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const body = await c.req.json();

    try {
      const config = await setBonusChipConfig(clubId, body, user.userId);
      return c.json(config);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save config";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /pub/clubs/:clubId/games/:gameId/bonus
authed.post(
  "/clubs/:clubId/games/:gameId/bonus",
  requireClubMember(),
  async (c) => {
    const clubId = c.req.param("clubId");
    const gameId = c.req.param("gameId");
    const { personId, verifiedBy } = await c.req.json();

    try {
      const tx = await grantBonusChips(clubId, gameId, personId, verifiedBy);
      return c.json(tx, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to grant bonus";
      return c.json({ error: message }, 400);
    }
  }
);

// GET /pub/clubs/:clubId/games/:gameId/bonus/leaderboard
authed.get(
  "/clubs/:clubId/games/:gameId/bonus/leaderboard",
  requireClubMember(),
  async (c) => {
    const clubId = c.req.param("clubId");
    const gameId = c.req.param("gameId");

    try {
      const leaderboard = await getBonusChipLeaderboard(clubId, gameId);
      return c.json(leaderboard);
    } catch {
      if (clubId === "mock-club-pub-001") {
        return c.json(getMockBonusChipLeaderboard());
      }
      return c.json([], 200);
    }
  }
);

// --------------------------------------------------
// Check-in routes
// --------------------------------------------------

// POST /pub/clubs/:clubId/games/:gameId/checkin/qr
authed.post(
  "/clubs/:clubId/games/:gameId/checkin/qr",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const gameId = c.req.param("gameId");
    const { personId } = await c.req.json();

    try {
      const session = await checkInByQr(clubId, gameId, personId, user.userId);
      return c.json(session, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Check-in failed";
      return c.json({ error: message }, 400);
    }
  }
);

// GET /pub/clubs/:clubId/games/:gameId/checkin/search
authed.get(
  "/clubs/:clubId/games/:gameId/checkin/search",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const gameId = c.req.param("gameId");
    const name = c.req.query("name") ?? "";

    try {
      const matches = await checkInByName(clubId, gameId, name, user.userId);
      return c.json(matches);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Search failed";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /pub/clubs/:clubId/games/:gameId/checkin/member
authed.post(
  "/clubs/:clubId/games/:gameId/checkin/member",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const gameId = c.req.param("gameId");
    const { personId } = await c.req.json();

    try {
      const session = await checkInSelectedMember(clubId, gameId, personId, user.userId);
      return c.json(session, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Check-in failed";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /pub/clubs/:clubId/games/:gameId/checkin/walkin
authed.post(
  "/clubs/:clubId/games/:gameId/checkin/walkin",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const gameId = c.req.param("gameId");
    const { tempName } = await c.req.json();

    try {
      const result = await createWalkIn(clubId, gameId, tempName, user.userId);
      return c.json(result, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Walk-in failed";
      return c.json({ error: message }, 400);
    }
  }
);

// GET /pub/clubs/:clubId/games/:gameId/players
authed.get(
  "/clubs/:clubId/games/:gameId/players",
  requireClubMember(),
  async (c) => {
    const clubId = c.req.param("clubId");
    const gameId = c.req.param("gameId");

    try {
      const players = await getCheckedInPlayers(clubId, gameId);
      return c.json(players);
    } catch {
      if (clubId === "mock-club-pub-001") {
        return c.json(getMockCheckInList());
      }
      return c.json([], 200);
    }
  }
);

// --------------------------------------------------
// Table management routes
// --------------------------------------------------

// GET /pub/clubs/:clubId/games/:gameId/tables
authed.get(
  "/clubs/:clubId/games/:gameId/tables",
  requireClubMember(),
  async (c) => {
    const gameId = c.req.param("gameId");
    const clubId = c.req.param("clubId");

    try {
      const assignments = await getTableAssignments(gameId);
      return c.json(assignments);
    } catch {
      if (clubId === "mock-club-pub-001") {
        return c.json(getMockTableAssignments());
      }
      return c.json([], 200);
    }
  }
);

// POST /pub/clubs/:clubId/games/:gameId/tables/balance
authed.post(
  "/clubs/:clubId/games/:gameId/tables/balance",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const gameId = c.req.param("gameId");
    const clubId = c.req.param("clubId");

    try {
      const result = await balanceTables(gameId, user.userId);
      return c.json(result);
    } catch {
      if (clubId === "mock-club-pub-001") {
        return c.json(getMockBalanceSuggestion());
      }
      return c.json({ suggestions: [], isBalanced: true }, 200);
    }
  }
);

// POST /pub/clubs/:clubId/games/:gameId/tables/approve-moves
authed.post(
  "/clubs/:clubId/games/:gameId/tables/approve-moves",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const gameId = c.req.param("gameId");
    const { moves } = await c.req.json();

    try {
      const assignments = await approveMoves(gameId, moves, user.userId);
      return c.json(assignments);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Move approval failed";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /pub/clubs/:clubId/games/:gameId/tables/final-table
authed.post(
  "/clubs/:clubId/games/:gameId/tables/final-table",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const gameId = c.req.param("gameId");

    try {
      const assignments = await formFinalTable(gameId, user.userId);
      return c.json(assignments);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Final table failed";
      return c.json({ error: message }, 400);
    }
  }
);

// Mount authed routes
pubPokerRoutes.route("/", authed);

// --------------------------------------------------
// Public routes (no auth required)
// --------------------------------------------------

// GET /pub/venues — public discovery
pubPokerRoutes.get("/venues", async (c) => {
  try {
    const venues = await getPublicVenues();
    return c.json(venues);
  } catch {
    return c.json([], 200);
  }
});

// POST /pub/walkin/claim — no auth required
pubPokerRoutes.post("/walkin/claim", async (c) => {
  const { claimToken, phone } = await c.req.json();
  if (!claimToken || !phone) {
    return c.json({ error: "claimToken and phone are required" }, 400);
  }

  try {
    const result = await claimWalkIn(claimToken, phone);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Claim failed";
    return c.json({ error: message }, 400);
  }
});

// ============================================================
// Circuit Routes — mounted at /circuits
// ============================================================
export const circuitRoutes = new Hono();
circuitRoutes.use("*", createAuthMiddleware());

// GET /circuits/me — get circuits the current user belongs to
circuitRoutes.get("/me", async (c) => {
  const user = c.get("user") as JWTPayload;
  try {
    const memberships = await prisma.circuitMember.findMany({
      where: { userId: user.userId },
      include: {
        circuit: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
      },
    });
    const circuits = memberships
      .filter((m) => m.circuit.isActive)
      .map((m) => ({
        id: m.circuit.id,
        name: m.circuit.name,
        slug: m.circuit.slug,
      }));
    return c.json(circuits);
  } catch {
    return c.json([]);
  }
});

// POST /circuits — create circuit
circuitRoutes.post("/", async (c) => {
  const user = c.get("user") as JWTPayload;
  const body = await c.req.json();

  if (!body.name || !body.slug) {
    return c.json({ error: "name and slug are required" }, 400);
  }

  try {
    const circuit = await createCircuit(user.userId, body);
    return c.json(circuit, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create circuit";
    return c.json({ error: message }, 400);
  }
});

// GET /circuits/:circuitId — get circuit details
circuitRoutes.get("/:circuitId", async (c) => {
  const circuitId = c.req.param("circuitId");

  try {
    const circuit = await getCircuit(circuitId);
    return c.json(circuit);
  } catch {
    return c.json({ error: "Circuit not found" }, 404);
  }
});

// PATCH /circuits/:circuitId — update circuit settings
circuitRoutes.patch("/:circuitId", async (c) => {
  const user = c.get("user") as JWTPayload;
  const circuitId = c.req.param("circuitId");
  const body = await c.req.json();

  try {
    const circuit = await updateCircuit(circuitId, user.userId, body);
    return c.json(circuit);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update circuit";
    return c.json({ error: message }, 400);
  }
});

// DELETE /circuits/:circuitId — deactivate circuit
circuitRoutes.delete("/:circuitId", async (c) => {
  const user = c.get("user") as JWTPayload;
  const circuitId = c.req.param("circuitId");

  try {
    const result = await deactivateCircuit(circuitId, user.userId);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to deactivate circuit";
    return c.json({ error: message }, 400);
  }
});

// -- Venues --

// POST /circuits/:circuitId/venues — add a venue
circuitRoutes.post("/:circuitId/venues", async (c) => {
  const user = c.get("user") as JWTPayload;
  const circuitId = c.req.param("circuitId");
  const { clubId, venueLabel } = await c.req.json();

  try {
    const venue = await addVenueToCircuit(circuitId, clubId, user.userId, venueLabel);
    return c.json(venue, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add venue";
    return c.json({ error: message }, 400);
  }
});

// DELETE /circuits/:circuitId/venues/:clubId — remove a venue
circuitRoutes.delete("/:circuitId/venues/:clubId", async (c) => {
  const user = c.get("user") as JWTPayload;
  const circuitId = c.req.param("circuitId");
  const clubId = c.req.param("clubId");

  try {
    const result = await removeVenueFromCircuit(circuitId, clubId, user.userId);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove venue";
    return c.json({ error: message }, 400);
  }
});

// GET /circuits/:circuitId/venues — list all venues
circuitRoutes.get("/:circuitId/venues", async (c) => {
  const circuitId = c.req.param("circuitId");

  try {
    const venues = await getCircuitVenues(circuitId);
    return c.json(venues);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load venues";
    return c.json({ error: message }, 400);
  }
});

// -- Seasons --

// POST /circuits/:circuitId/seasons — create season
circuitRoutes.post("/:circuitId/seasons", async (c) => {
  const user = c.get("user") as JWTPayload;
  const circuitId = c.req.param("circuitId");
  const body = await c.req.json();

  try {
    const season = await createSeason(circuitId, user.userId, body);
    return c.json(season, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create season";
    return c.json({ error: message }, 400);
  }
});

// PATCH /circuits/:circuitId/seasons/:seasonId — update season
circuitRoutes.patch("/:circuitId/seasons/:seasonId", async (c) => {
  const user = c.get("user") as JWTPayload;
  const circuitId = c.req.param("circuitId");
  const seasonId = c.req.param("seasonId");
  const body = await c.req.json();

  try {
    const season = await updateSeason(circuitId, seasonId, user.userId, body);
    return c.json(season);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update season";
    return c.json({ error: message }, 400);
  }
});

// GET /circuits/:circuitId/seasons — list seasons
circuitRoutes.get("/:circuitId/seasons", async (c) => {
  const circuitId = c.req.param("circuitId");

  try {
    const seasons = await getSeasons(circuitId);
    return c.json(seasons);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load seasons";
    return c.json({ error: message }, 400);
  }
});

// -- Standings --

// GET /circuits/:circuitId/standings — current active season standings
circuitRoutes.get("/:circuitId/standings", async (c) => {
  const circuitId = c.req.param("circuitId");
  const seasonId = c.req.query("seasonId") || undefined;

  try {
    const result = await getCircuitStandings(circuitId, seasonId);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load standings";
    return c.json({ error: message }, 400);
  }
});

// POST /circuits/:circuitId/recalculate — recompute standings
circuitRoutes.post("/:circuitId/recalculate", async (c) => {
  const user = c.get("user") as JWTPayload;
  const circuitId = c.req.param("circuitId");

  try {
    const result = await recalculateStandings(circuitId, user.userId);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to recalculate";
    return c.json({ error: message }, 400);
  }
});

// -- Members --

// POST /circuits/:circuitId/members — join the circuit
circuitRoutes.post("/:circuitId/members", async (c) => {
  const user = c.get("user") as JWTPayload;
  const circuitId = c.req.param("circuitId");

  try {
    const member = await joinCircuit(circuitId, user.userId);
    return c.json(member, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to join circuit";
    return c.json({ error: message }, 400);
  }
});
