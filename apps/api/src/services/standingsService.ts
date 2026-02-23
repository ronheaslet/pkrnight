import { db } from "../../../../packages/db/src/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type StandingsType = "points" | "bounties" | "earnings" | "games";

interface PlayerAgg {
  personId: string;
  displayName: string;
  avatarUrl: string | null;
  totalPoints: number;
  totalBounties: number;
  totalEarnings: number;
  totalInvested: number;
  gamesPlayed: number;
  winCount: number;
}

// ---------------------------------------------------------------------------
// Helper: aggregate all sessions for completed games in a scope
// ---------------------------------------------------------------------------
async function aggregateSessions(
  where: { clubId: string; seasonId?: string }
) {
  const gameFilter: any = {
    clubId: where.clubId,
    status: "COMPLETED",
  };
  if (where.seasonId) {
    gameFilter.event = { seasonId: where.seasonId };
  }

  const games = await db.game.findMany({
    where: gameFilter,
    include: {
      gameSessions: {
        include: {
          person: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  const playerMap = new Map<string, PlayerAgg>();

  for (const game of games) {
    for (const s of game.gameSessions) {
      const existing = playerMap.get(s.personId) ?? {
        personId: s.personId,
        displayName: s.person.displayName,
        avatarUrl: s.person.avatarUrl,
        totalPoints: 0,
        totalBounties: 0,
        totalEarnings: 0,
        totalInvested: 0,
        gamesPlayed: 0,
        winCount: 0,
      };
      existing.totalPoints += s.pointsEarned;
      existing.totalBounties += s.bountiesWon;
      existing.totalEarnings += s.payout - s.totalPaid;
      existing.totalInvested += s.totalPaid;
      existing.gamesPlayed += 1;
      if (s.finishPosition === 1) existing.winCount += 1;
      playerMap.set(s.personId, existing);
    }
  }

  return Array.from(playerMap.values()).filter((p) => p.gamesPlayed >= 1);
}

// ---------------------------------------------------------------------------
// getStandings
// ---------------------------------------------------------------------------
export async function getStandings(
  clubId: string,
  seasonId: string,
  type: StandingsType = "points"
) {
  const players = await aggregateSessions({ clubId, seasonId });

  // Sort based on type
  const sortFn: Record<StandingsType, (a: PlayerAgg, b: PlayerAgg) => number> =
    {
      points: (a, b) => b.totalPoints - a.totalPoints,
      bounties: (a, b) => b.totalBounties - a.totalBounties,
      earnings: (a, b) => b.totalEarnings - a.totalEarnings,
      games: (a, b) => b.gamesPlayed - a.gamesPlayed,
    };

  players.sort(sortFn[type]);

  return players.slice(0, 50).map((p, i) => ({
    rank: i + 1,
    personId: p.personId,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    ...(type === "points" && {
      totalPoints: p.totalPoints,
      gamesPlayed: p.gamesPlayed,
      avgPoints:
        p.gamesPlayed > 0
          ? Math.round((p.totalPoints / p.gamesPlayed) * 10) / 10
          : 0,
    }),
    ...(type === "bounties" && {
      totalBounties: p.totalBounties,
      gamesPlayed: p.gamesPlayed,
    }),
    ...(type === "earnings" && {
      totalEarnings: p.totalEarnings,
      totalInvested: p.totalInvested,
      netPosition: p.totalEarnings,
      gamesPlayed: p.gamesPlayed,
    }),
    ...(type === "games" && {
      gamesPlayed: p.gamesPlayed,
      winCount: p.winCount,
    }),
  }));
}

// ---------------------------------------------------------------------------
// getPlayerSeasonStats
// ---------------------------------------------------------------------------
export async function getPlayerSeasonStats(
  clubId: string,
  personId: string,
  seasonId: string
) {
  // Get standings for all types to determine ranks
  const [pointsStandings, bountyStandings, earningsStandings, gamesStandings] =
    await Promise.all([
      getStandings(clubId, seasonId, "points"),
      getStandings(clubId, seasonId, "bounties"),
      getStandings(clubId, seasonId, "earnings"),
      getStandings(clubId, seasonId, "games"),
    ]);

  const findRank = (standings: Array<{ personId: string }>, pid: string) => {
    const idx = standings.findIndex((s) => s.personId === pid);
    return idx === -1 ? null : idx + 1;
  };

  // Get individual sessions for detailed stats
  const sessions = await db.gameSession.findMany({
    where: {
      personId,
      game: {
        clubId,
        event: { seasonId },
        status: "COMPLETED",
      },
    },
    include: {
      game: {
        select: { completedAt: true, event: { select: { startsAt: true } } },
      },
    },
    orderBy: { game: { completedAt: "desc" } },
  });

  const gamesPlayed = sessions.length;
  const wins = sessions.filter((s) => s.finishPosition === 1).length;
  const top3Finishes = sessions.filter(
    (s) => s.finishPosition && s.finishPosition <= 3
  ).length;
  const totalPoints = sessions.reduce((sum, s) => sum + s.pointsEarned, 0);
  const totalBounties = sessions.reduce((sum, s) => sum + s.bountiesWon, 0);
  const netEarnings = sessions.reduce(
    (sum, s) => sum + (s.payout - s.totalPaid),
    0
  );

  const positions = sessions
    .map((s) => s.finishPosition)
    .filter((p): p is number => p !== null);
  const bestFinish = positions.length ? Math.min(...positions) : null;

  // Streak: count consecutive games played from most recent
  // (the "streak" here means consecutive attendance, not consecutive wins)
  let currentStreak = 0;
  // Get all season games to check for gaps
  const allSeasonGames = await db.game.findMany({
    where: {
      clubId,
      event: { seasonId },
      status: "COMPLETED",
    },
    orderBy: { completedAt: "desc" },
    select: { id: true },
  });

  const playerGameIds = new Set(sessions.map((s) => s.gameId));
  for (const game of allSeasonGames) {
    if (playerGameIds.has(game.id)) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Last 5 games
  const lastFive = sessions.slice(0, 5).map((s) => ({
    date: (
      s.game.event?.startsAt ??
      s.game.completedAt ??
      new Date()
    ).toISOString(),
    position: s.finishPosition,
    pointsEarned: s.pointsEarned,
    payout: s.payout,
    net: s.payout - s.totalPaid,
  }));

  return {
    personId,
    ranks: {
      points: findRank(pointsStandings, personId),
      bounties: findRank(bountyStandings, personId),
      earnings: findRank(earningsStandings, personId),
      games: findRank(gamesStandings, personId),
    },
    stats: {
      gamesPlayed,
      wins,
      top3Finishes,
      totalPoints,
      totalBounties,
      netEarnings,
      bestFinish,
      currentStreak,
    },
    lastFiveGames: lastFive,
  };
}

// ---------------------------------------------------------------------------
// getClubAllTimeStats
// ---------------------------------------------------------------------------
export async function getClubAllTimeStats(clubId: string) {
  const players = await aggregateSessions({ clubId });

  // Leaders
  const byPoints = [...players].sort(
    (a, b) => b.totalPoints - a.totalPoints
  )[0] ?? null;
  const byBounties = [...players].sort(
    (a, b) => b.totalBounties - a.totalBounties
  )[0] ?? null;
  const byEarnings = [...players].sort(
    (a, b) => b.totalEarnings - a.totalEarnings
  )[0] ?? null;
  const byGames = [...players].sort(
    (a, b) => b.gamesPlayed - a.gamesPlayed
  )[0] ?? null;

  // Single-game records: need individual sessions
  const allSessions = await db.gameSession.findMany({
    where: { game: { clubId, status: "COMPLETED" } },
    include: {
      person: { select: { id: true, displayName: true } },
    },
  });

  const biggestPayout = allSessions.length
    ? allSessions.reduce((best, s) => (s.payout > best.payout ? s : best))
    : null;
  const mostRebuys = allSessions.length
    ? allSessions.reduce((best, s) => (s.rebuys > best.rebuys ? s : best))
    : null;

  const leaderShape = (p: PlayerAgg | null, field: string) =>
    p
      ? {
          personId: p.personId,
          displayName: p.displayName,
          total: (p as any)[field],
        }
      : null;

  return {
    totalGames: new Set(allSessions.map((s) => s.gameId)).size,
    totalPlayers: players.length,
    leaders: {
      points: leaderShape(byPoints, "totalPoints"),
      bounties: leaderShape(byBounties, "totalBounties"),
      earnings: leaderShape(byEarnings, "totalEarnings"),
      gamesPlayed: leaderShape(byGames, "gamesPlayed"),
    },
    records: {
      biggestSinglePayout: biggestPayout
        ? {
            personId: biggestPayout.personId,
            displayName: biggestPayout.person.displayName,
            amount: biggestPayout.payout,
            gameId: biggestPayout.gameId,
          }
        : null,
      mostRebuysOneGame: mostRebuys
        ? {
            personId: mostRebuys.personId,
            displayName: mostRebuys.person.displayName,
            count: mostRebuys.rebuys,
            gameId: mostRebuys.gameId,
          }
        : null,
    },
  };
}
