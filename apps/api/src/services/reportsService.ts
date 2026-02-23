import { db } from "../../../../packages/db/src/client";

// ---------------------------------------------------------------------------
// getGameNightReport
// ---------------------------------------------------------------------------
export async function getGameNightReport(gameId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      event: { select: { title: true, startsAt: true } },
      gameSessions: {
        include: {
          person: { select: { id: true, displayName: true } },
        },
        orderBy: { finishPosition: "asc" },
      },
      transactions: {
        where: { isVoided: false },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!game) throw new Error("Game not found");

  const txns = game.transactions;
  const buyIns = txns.filter((t) => t.type === "BUY_IN");
  const rebuys = txns.filter((t) => t.type === "REBUY");
  const addOns = txns.filter((t) => t.type === "ADD_ON");
  const payouts = txns.filter((t) => t.type === "PAYOUT");
  const bounties = txns.filter((t) => t.type === "BOUNTY_COLLECTED");
  const expenses = txns.filter((t) => t.type === "EXPENSE");

  const totalBuyIns = buyIns.reduce((s, t) => s + t.amount, 0);
  const totalRebuys = rebuys.reduce((s, t) => s + t.amount, 0);
  const totalAddOns = addOns.reduce((s, t) => s + t.amount, 0);
  const totalPayouts = payouts.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const totalBounties = bounties.reduce((s, t) => s + t.amount, 0);

  const moneyIn = totalBuyIns + totalRebuys + totalAddOns;
  const variance = moneyIn - game.prizePool;

  // Duration
  let durationMinutes: number | null = null;
  if (game.startedAt && game.completedAt) {
    durationMinutes = Math.round(
      (game.completedAt.getTime() - game.startedAt.getTime()) / 60000
    );
  }

  // Person name lookup
  const personIds = [
    ...new Set(txns.map((t) => t.personId).filter(Boolean) as string[]),
  ];
  const persons = await db.person.findMany({
    where: { id: { in: personIds } },
    select: { id: true, displayName: true },
  });
  const nameMap = new Map(persons.map((p) => [p.id, p.displayName]));

  // Treasury impact
  const treasury = await db.treasuryBalance.findUnique({
    where: { clubId: game.clubId },
  });

  return {
    metadata: {
      gameId: game.id,
      eventTitle: game.event.title,
      date: game.event.startsAt.toISOString(),
      playerCount: game.playersRegistered,
      durationMinutes,
      status: game.status,
    },
    financialSummary: {
      prizePool: game.prizePool,
      totalExpenses,
      netPrizePool: game.prizePool - totalExpenses,
      moneyIn,
      variance,
    },
    buyIns: buyIns.map((t) => ({
      personId: t.personId,
      displayName: nameMap.get(t.personId ?? "") ?? "Unknown",
      amount: t.amount,
    })),
    rebuys: rebuys.map((t) => ({
      personId: t.personId,
      displayName: nameMap.get(t.personId ?? "") ?? "Unknown",
      amount: t.amount,
    })),
    addOns: addOns.map((t) => ({
      personId: t.personId,
      displayName: nameMap.get(t.personId ?? "") ?? "Unknown",
      amount: t.amount,
    })),
    payouts: game.gameSessions
      .filter((s) => s.payout > 0)
      .map((s) => ({
        personId: s.personId,
        displayName: s.person.displayName,
        finishPosition: s.finishPosition,
        amount: s.payout,
      })),
    bountySummary: {
      totalBountyPool: game.bountyEnabled
        ? game.playersRegistered * game.bountyAmount
        : 0,
      totalBountiesPaid: totalBounties,
      bounties: bounties.map((t) => ({
        winnerId: t.personId,
        winnerName: nameMap.get(t.personId ?? "") ?? "Unknown",
        loserId: t.bountyFromPersonId,
        loserName: nameMap.get(t.bountyFromPersonId ?? "") ?? "Unknown",
        amount: t.amount,
      })),
    },
    varianceStatus: variance === 0 ? "BALANCED" : "VARIANCE_DETECTED",
    treasuryImpact: {
      currentBalance: treasury?.currentBalance ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
// getSeasonSummary
// ---------------------------------------------------------------------------
export async function getSeasonSummary(clubId: string, seasonId: string) {
  // Get all events in this season that have completed games
  const events = await db.event.findMany({
    where: { clubId, seasonId, status: "COMPLETED" },
    include: {
      game: {
        include: {
          gameSessions: {
            include: {
              person: { select: { id: true, displayName: true } },
            },
          },
          transactions: { where: { isVoided: false } },
        },
      },
    },
  });

  const games = events.map((e) => e.game).filter(Boolean) as NonNullable<
    (typeof events)[0]["game"]
  >[];

  const totalGames = games.length;
  const allSessions = games.flatMap((g) => g.gameSessions);
  const allTransactions = games.flatMap((g) => g.transactions);
  const uniquePlayerIds = new Set(allSessions.map((s) => s.personId));

  const totalBuyIns = allTransactions
    .filter((t) => ["BUY_IN", "REBUY", "ADD_ON"].includes(t.type))
    .reduce((s, t) => s + t.amount, 0);

  const totalPrizes = allTransactions
    .filter((t) => t.type === "PAYOUT")
    .reduce((s, t) => s + t.amount, 0);

  // Per-player earnings
  const playerEarnings = new Map<
    string,
    { name: string; paid: number; won: number; rebuys: number; bounties: number }
  >();
  for (const session of allSessions) {
    const existing = playerEarnings.get(session.personId) ?? {
      name: session.person.displayName,
      paid: 0,
      won: 0,
      rebuys: 0,
      bounties: 0,
    };
    existing.paid += session.totalPaid;
    existing.won += session.payout;
    existing.rebuys += session.rebuys;
    existing.bounties += session.bountiesWon;
    playerEarnings.set(session.personId, existing);
  }

  const earningsArr = [...playerEarnings.entries()].map(([id, data]) => ({
    personId: id,
    displayName: data.name,
    net: data.won - data.paid,
    totalPaid: data.paid,
    totalWon: data.won,
    totalRebuys: data.rebuys,
    totalBounties: data.bounties,
  }));

  const topEarners = [...earningsArr].sort((a, b) => b.net - a.net).slice(0, 5);
  const mostRebuys = [...earningsArr]
    .sort((a, b) => b.totalRebuys - a.totalRebuys)
    .slice(0, 1);
  const mostBounties = [...earningsArr]
    .sort((a, b) => b.totalBounties - a.totalBounties)
    .slice(0, 1);

  const avgPlayersPerGame =
    totalGames > 0
      ? Math.round(allSessions.length / totalGames)
      : 0;
  const avgPrizePool =
    totalGames > 0
      ? Math.round(games.reduce((s, g) => s + g.prizePool, 0) / totalGames)
      : 0;

  return {
    seasonId,
    totalGames,
    totalPlayers: uniquePlayerIds.size,
    totalBuyInsCollected: totalBuyIns,
    totalPrizesPaid: totalPrizes,
    topEarners,
    mostRebuys: mostRebuys[0] ?? null,
    mostBounties: mostBounties[0] ?? null,
    avgPlayersPerGame,
    avgPrizePool,
  };
}

// ---------------------------------------------------------------------------
// getMemberFinancialSummary
// ---------------------------------------------------------------------------
export async function getMemberFinancialSummary(
  clubId: string,
  personId: string
) {
  const sessions = await db.gameSession.findMany({
    where: { clubId, personId },
    orderBy: { createdAt: "desc" },
  });

  const totalGames = sessions.length;
  const totalBuyIns = sessions.reduce((s, gs) => s + gs.totalPaid, 0);
  const totalRebuys = sessions.reduce((s, gs) => s + gs.rebuys, 0);
  const totalAddOns = sessions.reduce((s, gs) => s + gs.addOns, 0);
  const totalWinnings = sessions.reduce((s, gs) => s + gs.payout, 0);
  const netPosition = totalWinnings - totalBuyIns;
  const bountiesWon = sessions.reduce((s, gs) => s + gs.bountiesWon, 0);
  const bountiesLost = sessions.reduce((s, gs) => s + gs.bountiesLost, 0);

  const finishPositions = sessions
    .map((s) => s.finishPosition)
    .filter((p): p is number => p !== null);

  const bestFinish =
    finishPositions.length > 0 ? Math.min(...finishPositions) : null;
  const worstFinish =
    finishPositions.length > 0 ? Math.max(...finishPositions) : null;
  const avgFinish =
    finishPositions.length > 0
      ? Math.round(
          (finishPositions.reduce((s, p) => s + p, 0) /
            finishPositions.length) *
            10
        ) / 10
      : null;

  return {
    personId,
    totalGames,
    totalBuyIns,
    totalRebuys,
    totalAddOns,
    totalWinnings,
    netPosition,
    bestFinish,
    worstFinish,
    avgFinish,
    bountiesWon,
    bountiesLost,
  };
}

// ---------------------------------------------------------------------------
// getDuesReport
// ---------------------------------------------------------------------------
export async function getDuesReport(clubId: string, seasonId: string) {
  const records = await db.duesRecord.findMany({
    where: { clubId, seasonId },
  });

  const personIds = records.map((r) => r.personId);
  const persons = await db.person.findMany({
    where: { id: { in: personIds } },
    select: { id: true, displayName: true },
  });
  const nameMap = new Map(persons.map((p) => [p.id, p.displayName]));

  const now = new Date();
  const totalExpected = records.reduce((s, r) => s + r.amountDue, 0);
  const totalCollected = records.reduce((s, r) => s + r.amountPaid, 0);
  const totalOutstanding = totalExpected - totalCollected;

  const members = records.map((r) => {
    const daysOverdue = r.dueDate && !r.isPaid
      ? Math.max(
          0,
          Math.floor(
            (now.getTime() - r.dueDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : 0;

    return {
      personId: r.personId,
      displayName: nameMap.get(r.personId) ?? "Unknown",
      amountDue: r.amountDue,
      amountPaid: r.amountPaid,
      remaining: Math.max(0, r.amountDue - r.amountPaid),
      isPaid: r.isPaid,
      daysOverdue,
    };
  });

  return {
    seasonId,
    totalExpected,
    totalCollected,
    totalOutstanding,
    members,
  };
}
