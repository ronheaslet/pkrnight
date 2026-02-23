import { db } from "../../../../packages/db/src/client";

// ────────────────────────────────────────────────────────────
// getNetworkForPerson
// ────────────────────────────────────────────────────────────

export async function getNetworkForPerson(
  personId: string,
  options: { depth?: 1 | 2 } = {}
) {
  const depth = options.depth ?? 1;

  // Depth 1: direct connections
  const edges = await db.networkEdge.findMany({
    where: {
      OR: [{ personAId: personId }, { personBId: personId }],
    },
    include: {
      personA: { select: { id: true, displayName: true, avatarUrl: true } },
      personB: { select: { id: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { lastPlayedAt: "desc" },
  });

  const depth1: Array<{
    personId: string;
    displayName: string;
    avatarUrl: string | null;
    gamesShared: number;
    lastPlayedAt: Date;
    depth: 1 | 2;
  }> = [];

  const depth1Ids = new Set<string>([personId]);

  for (const edge of edges) {
    const other = edge.personAId === personId ? edge.personB : edge.personA;
    depth1Ids.add(other.id);
    depth1.push({
      personId: other.id,
      displayName: other.displayName,
      avatarUrl: other.avatarUrl,
      gamesShared: edge.gamesShared,
      lastPlayedAt: edge.lastPlayedAt,
      depth: 1,
    });
  }

  if (depth === 1) return depth1;

  // Depth 2: connections of connections
  const depth1PersonIds = depth1.map((d) => d.personId);

  const depth2Edges = await db.networkEdge.findMany({
    where: {
      OR: [
        { personAId: { in: depth1PersonIds } },
        { personBId: { in: depth1PersonIds } },
      ],
    },
    include: {
      personA: { select: { id: true, displayName: true, avatarUrl: true } },
      personB: { select: { id: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { lastPlayedAt: "desc" },
  });

  const depth2: typeof depth1 = [];

  for (const edge of depth2Edges) {
    const otherA = edge.personA;
    const otherB = edge.personB;

    // For each edge, pick the side that's NOT already in depth1Ids
    for (const other of [otherA, otherB]) {
      if (!depth1Ids.has(other.id)) {
        depth1Ids.add(other.id); // prevent duplicates
        depth2.push({
          personId: other.id,
          displayName: other.displayName,
          avatarUrl: other.avatarUrl,
          gamesShared: edge.gamesShared,
          lastPlayedAt: edge.lastPlayedAt,
          depth: 2,
        });
      }
    }
  }

  // Cap at 200 total
  const combined = [...depth1, ...depth2];
  return combined.slice(0, 200);
}

// ────────────────────────────────────────────────────────────
// getNetworkStats
// ────────────────────────────────────────────────────────────

export async function getNetworkStats(personId: string) {
  const edges = await db.networkEdge.findMany({
    where: {
      OR: [{ personAId: personId }, { personBId: personId }],
    },
    include: {
      personA: { select: { id: true, displayName: true } },
      personB: { select: { id: true, displayName: true } },
    },
    orderBy: { lastPlayedAt: "desc" },
  });

  const directConnections = edges.length;

  // Get depth-1 person IDs for depth-2 count
  const depth1Ids = new Set<string>([personId]);
  const connections: Array<{
    personId: string;
    displayName: string;
    gamesShared: number;
    lastPlayedAt: Date;
  }> = [];

  for (const edge of edges) {
    const other = edge.personAId === personId ? edge.personB : edge.personA;
    depth1Ids.add(other.id);
    connections.push({
      personId: other.id,
      displayName: other.displayName,
      gamesShared: edge.gamesShared,
      lastPlayedAt: edge.lastPlayedAt,
    });
  }

  // Count depth-2 (one hop further)
  const depth2Count = await db.networkEdge.count({
    where: {
      OR: [
        { personAId: { in: Array.from(depth1Ids) }, personBId: { notIn: Array.from(depth1Ids) } },
        { personBId: { in: Array.from(depth1Ids) }, personAId: { notIn: Array.from(depth1Ids) } },
      ],
    },
  });

  // Most played with — top 5
  const sorted = [...connections].sort((a, b) => b.gamesShared - a.gamesShared);
  const mostPlayedWith = sorted.slice(0, 5).map((c) => ({
    personId: c.personId,
    displayName: c.displayName,
    gamesShared: c.gamesShared,
  }));

  // Recently played — last 3
  const recentlyPlayed = connections.slice(0, 3).map((c) => ({
    personId: c.personId,
    displayName: c.displayName,
    lastPlayedAt: c.lastPlayedAt,
  }));

  // Clubs represented — count unique clubs across network members' memberships
  const networkPersonIds = connections.map((c) => c.personId);
  const clubsResult = networkPersonIds.length > 0
    ? await db.membership.findMany({
        where: { personId: { in: networkPersonIds }, status: "ACTIVE" },
        select: { clubId: true },
        distinct: ["clubId"],
      })
    : [];

  return {
    directConnections,
    totalReach: directConnections + depth2Count,
    mostPlayedWith,
    recentlyPlayed,
    clubsRepresented: clubsResult.length,
  };
}

// ────────────────────────────────────────────────────────────
// getSharedHistory
// ────────────────────────────────────────────────────────────

export async function getSharedHistory(personAId: string, personBId: string) {
  // Find the edge between these two people
  const edge = await db.networkEdge.findFirst({
    where: {
      OR: [
        { personAId, personBId },
        { personAId: personBId, personBId: personAId },
      ],
    },
  });

  if (!edge) {
    return {
      gamesShared: 0,
      firstPlayedAt: null,
      lastPlayedAt: null,
      recentGames: [],
    };
  }

  // Find recent games they've played together via GameSession
  const sessionsA = await db.gameSession.findMany({
    where: { personId: personAId },
    select: { gameId: true },
  });
  const gameIdsA = new Set(sessionsA.map((s) => s.gameId));

  const sharedSessions = await db.gameSession.findMany({
    where: {
      personId: personBId,
      gameId: { in: Array.from(gameIdsA) },
    },
    include: {
      game: {
        select: {
          id: true,
          startedAt: true,
          event: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return {
    gamesShared: edge.gamesShared,
    firstPlayedAt: edge.firstPlayedAt,
    lastPlayedAt: edge.lastPlayedAt,
    recentGames: sharedSessions.map((s) => ({
      gameId: s.gameId,
      title: s.game.event?.title ?? "Untitled Game",
      date: s.game.startedAt,
    })),
  };
}
