import { db } from "../../../../packages/db/src/client";
import { assertPubPoker } from "../lib/pubPokerGuard";

// ---------------------------------------------------------------------------
// Circuit CRUD
// ---------------------------------------------------------------------------

export async function createCircuit(
  ownerId: string,
  data: { name: string; slug: string; description?: string; city?: string; state?: string }
) {
  return db.circuit.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      ownerId,
    },
  });
}

export async function getCircuit(circuitId: string) {
  const circuit = await db.circuit.findUnique({
    where: { id: circuitId },
    include: {
      owner: { select: { id: true, displayName: true } },
      venues: {
        where: { isActive: true },
        include: {
          club: {
            include: {
              venueProfile: true,
              _count: { select: { games: { where: { status: "COMPLETED" } } } },
            },
          },
        },
      },
      seasons: { orderBy: { startDate: "desc" } },
      _count: { select: { members: true } },
    },
  });

  if (!circuit) throw new Error("Circuit not found");

  const activeSeason = circuit.seasons.find((s) => s.isActive) ?? null;

  return {
    ...circuit,
    activeSeason,
    memberCount: circuit._count.members,
  };
}

export async function updateCircuit(
  circuitId: string,
  ownerId: string,
  data: {
    name?: string;
    description?: string;
    city?: string;
    state?: string;
    logoUrl?: string;
    isPublic?: boolean;
  }
) {
  const circuit = await db.circuit.findUnique({ where: { id: circuitId } });
  if (!circuit) throw new Error("Circuit not found");
  if (circuit.ownerId !== ownerId) throw new Error("Only the circuit owner can update settings");

  return db.circuit.update({
    where: { id: circuitId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.state !== undefined && { state: data.state }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
    },
  });
}

export async function deactivateCircuit(circuitId: string, ownerId: string) {
  const circuit = await db.circuit.findUnique({ where: { id: circuitId } });
  if (!circuit) throw new Error("Circuit not found");
  if (circuit.ownerId !== ownerId) throw new Error("Only the circuit owner can deactivate");

  return db.circuit.update({
    where: { id: circuitId },
    data: { isActive: false },
  });
}

// ---------------------------------------------------------------------------
// Venue management
// ---------------------------------------------------------------------------

export async function addVenueToCircuit(
  circuitId: string,
  clubId: string,
  ownerId: string,
  venueLabel?: string
) {
  const circuit = await db.circuit.findUnique({ where: { id: circuitId } });
  if (!circuit) throw new Error("Circuit not found");
  if (circuit.ownerId !== ownerId) throw new Error("Only the circuit owner can add venues");

  await assertPubPoker(clubId);

  return db.circuitVenue.create({
    data: {
      circuitId,
      clubId,
      venueLabel: venueLabel ?? null,
    },
    include: {
      club: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function removeVenueFromCircuit(
  circuitId: string,
  clubId: string,
  ownerId: string
) {
  const circuit = await db.circuit.findUnique({ where: { id: circuitId } });
  if (!circuit) throw new Error("Circuit not found");
  if (circuit.ownerId !== ownerId) throw new Error("Only the circuit owner can remove venues");

  await db.circuitVenue.update({
    where: { circuitId_clubId: { circuitId, clubId } },
    data: { isActive: false },
  });

  return { removed: true };
}

export async function getCircuitVenues(circuitId: string) {
  return db.circuitVenue.findMany({
    where: { circuitId, isActive: true },
    include: {
      club: {
        include: {
          venueProfile: true,
          _count: { select: { games: { where: { status: "COMPLETED" } } } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Season management
// ---------------------------------------------------------------------------

export async function createSeason(
  circuitId: string,
  ownerId: string,
  data: { name: string; startDate: string; endDate: string }
) {
  const circuit = await db.circuit.findUnique({ where: { id: circuitId } });
  if (!circuit) throw new Error("Circuit not found");
  if (circuit.ownerId !== ownerId) throw new Error("Only the circuit owner can create seasons");

  return db.circuitSeason.create({
    data: {
      circuitId,
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
  });
}

export async function updateSeason(
  circuitId: string,
  seasonId: string,
  ownerId: string,
  data: { name?: string; startDate?: string; endDate?: string; isActive?: boolean }
) {
  const circuit = await db.circuit.findUnique({ where: { id: circuitId } });
  if (!circuit) throw new Error("Circuit not found");
  if (circuit.ownerId !== ownerId) throw new Error("Only the circuit owner can update seasons");

  if (data.isActive === true) {
    await db.circuitSeason.updateMany({
      where: { circuitId, isActive: true },
      data: { isActive: false },
    });
  }

  return db.circuitSeason.update({
    where: { id: seasonId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
      ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function getSeasons(circuitId: string) {
  return db.circuitSeason.findMany({
    where: { circuitId },
    orderBy: { startDate: "desc" },
    include: { _count: { select: { standings: true } } },
  });
}

// ---------------------------------------------------------------------------
// Circuit member management
// ---------------------------------------------------------------------------

export async function joinCircuit(circuitId: string, userId: string) {
  return db.circuitMember.upsert({
    where: { circuitId_userId: { circuitId, userId } },
    create: { circuitId, userId },
    update: {},
  });
}

// ---------------------------------------------------------------------------
// Standings & Recalculation
// ---------------------------------------------------------------------------

export async function getCircuitStandings(circuitId: string, seasonId?: string) {
  let targetSeasonId = seasonId;
  if (!targetSeasonId) {
    const activeSeason = await db.circuitSeason.findFirst({
      where: { circuitId, isActive: true },
    });
    if (!activeSeason) return { standings: [], season: null };
    targetSeasonId = activeSeason.id;
  }

  const season = await db.circuitSeason.findUnique({ where: { id: targetSeasonId } });
  if (!season) return { standings: [], season: null };

  const standings = await db.circuitStanding.findMany({
    where: { seasonId: targetSeasonId },
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { rank: "asc" },
  });

  return {
    standings: standings.map((s) => ({
      rank: s.rank,
      userId: s.userId,
      displayName: s.user.displayName,
      avatarUrl: s.user.avatarUrl,
      points: s.points,
      gamesPlayed: s.gamesPlayed,
    })),
    season: {
      id: season.id,
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      isActive: season.isActive,
    },
  };
}

export async function recalculateStandings(circuitId: string, ownerId: string) {
  const circuit = await db.circuit.findUnique({ where: { id: circuitId } });
  if (!circuit) throw new Error("Circuit not found");
  if (circuit.ownerId !== ownerId) throw new Error("Only the circuit owner can recalculate");

  const activeSeason = await db.circuitSeason.findFirst({
    where: { circuitId, isActive: true },
  });
  if (!activeSeason) throw new Error("No active season found");

  const venues = await db.circuitVenue.findMany({
    where: { circuitId, isActive: true },
    select: { clubId: true },
  });
  const clubIds = venues.map((v) => v.clubId);
  if (clubIds.length === 0) return { playersUpdated: 0, gamesProcessed: 0 };

  const games = await db.game.findMany({
    where: {
      clubId: { in: clubIds },
      status: "COMPLETED",
      completedAt: {
        gte: activeSeason.startDate,
        lte: activeSeason.endDate,
      },
    },
    include: {
      gameSessions: {
        select: {
          personId: true,
          finishPosition: true,
          bountiesWon: true,
          pointsEarned: true,
        },
      },
    },
  });

  // Aggregate using already-calculated pointsEarned from each game session
  const playerStats = new Map<string, { points: number; gamesPlayed: number; bestFinish: number | null }>();

  for (const game of games) {
    for (const session of game.gameSessions) {
      const existing = playerStats.get(session.personId) ?? { points: 0, gamesPlayed: 0, bestFinish: null };
      existing.points += session.pointsEarned;
      existing.gamesPlayed += 1;
      if (session.finishPosition !== null) {
        if (existing.bestFinish === null || session.finishPosition < existing.bestFinish) {
          existing.bestFinish = session.finishPosition;
        }
      }
      playerStats.set(session.personId, existing);
    }
  }

  const ranked = Array.from(playerStats.entries())
    .sort((a, b) => b[1].points - a[1].points)
    .map(([userId, stats], i) => ({ userId, rank: i + 1, ...stats }));

  await db.$transaction(async (tx) => {
    await tx.circuitStanding.deleteMany({ where: { seasonId: activeSeason.id } });

    for (const entry of ranked) {
      await tx.circuitStanding.create({
        data: {
          seasonId: activeSeason.id,
          userId: entry.userId,
          rank: entry.rank,
          points: entry.points,
          gamesPlayed: entry.gamesPlayed,
        },
      });

      await tx.circuitMember.upsert({
        where: { circuitId_userId: { circuitId, userId: entry.userId } },
        create: {
          circuitId,
          userId: entry.userId,
          totalPoints: entry.points,
          gamesPlayed: entry.gamesPlayed,
          bestFinish: entry.bestFinish,
        },
        update: {
          totalPoints: entry.points,
          gamesPlayed: entry.gamesPlayed,
          bestFinish: entry.bestFinish,
        },
      });
    }
  });

  return { playersUpdated: ranked.length, gamesProcessed: games.length };
}

// ---------------------------------------------------------------------------
// Auto-enrollment: called from game finalization
// ---------------------------------------------------------------------------

export async function autoEnrollCircuitMembers(clubId: string, personIds: string[]) {
  const circuitVenues = await db.circuitVenue.findMany({
    where: { clubId, isActive: true },
    select: { circuitId: true },
  });

  if (circuitVenues.length === 0) return;

  for (const cv of circuitVenues) {
    for (const userId of personIds) {
      await db.circuitMember.upsert({
        where: { circuitId_userId: { circuitId: cv.circuitId, userId } },
        create: { circuitId: cv.circuitId, userId },
        update: {},
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Public discovery
// ---------------------------------------------------------------------------

export async function getPublicCircuits() {
  return db.circuit.findMany({
    where: { isActive: true, isPublic: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      city: true,
      state: true,
      logoUrl: true,
      _count: { select: { venues: { where: { isActive: true } }, members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPublicCircuitBySlug(slug: string) {
  const circuit = await db.circuit.findUnique({
    where: { slug },
    include: {
      venues: {
        where: { isActive: true },
        include: {
          club: {
            select: { id: true, name: true, slug: true, venueCity: true, logoUrl: true },
            include: { venueProfile: true },
          },
        },
      },
      seasons: { where: { isActive: true }, take: 1 },
      _count: { select: { members: true } },
    },
  });

  if (!circuit || !circuit.isActive) return null;

  const activeSeason = circuit.seasons[0] ?? null;
  let topStandings: Array<{
    rank: number;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    points: number;
    gamesPlayed: number;
  }> = [];

  if (activeSeason) {
    const result = await getCircuitStandings(circuit.id, activeSeason.id);
    topStandings = result.standings.slice(0, 10);
  }

  return {
    id: circuit.id,
    name: circuit.name,
    slug: circuit.slug,
    description: circuit.description,
    city: circuit.city,
    state: circuit.state,
    logoUrl: circuit.logoUrl,
    memberCount: circuit._count.members,
    activeSeason,
    topStandings,
    venues: circuit.venues.map((v) => ({
      clubId: v.club.id,
      name: v.club.name,
      slug: v.club.slug,
      city: v.club.venueCity,
      logoUrl: v.club.logoUrl,
      venueProfile: v.club.venueProfile,
    })),
  };
}
