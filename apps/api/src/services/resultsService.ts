import { db } from "../../../../packages/db/src/client";
import { checkAutoTrophies } from "./trophyService";
import { autoEnrollCircuitMembers } from "./circuitService";

// ---------------------------------------------------------------------------
// Points formula constants
// ---------------------------------------------------------------------------
const POSITION_BONUS: Record<number, number> = {
  1: 50,
  2: 30,
  3: 20,
  4: 10,
  5: 5,
  6: 2,
  7: 2,
  8: 2,
  9: 2,
  10: 2,
};
const BASE_POINTS = 10;
const BOUNTY_POINTS = 5;

// ---------------------------------------------------------------------------
// finalizeGameResults
// ---------------------------------------------------------------------------
export async function finalizeGameResults(gameId: string, actorId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      event: { select: { seasonId: true, title: true } },
      gameSessions: {
        include: {
          person: { select: { id: true, displayName: true } },
        },
      },
    },
  });

  if (!game) throw new Error("Game not found");
  if (game.status !== "COMPLETED")
    throw new Error("Game must be COMPLETED to finalize results");
  if (!game.financialLockedAt)
    throw new Error("Financials must be locked before finalizing results");

  // 1. Calculate and update points for each session
  await db.$transaction(async (tx) => {
    for (const session of game.gameSessions) {
      const positionBonus = session.finishPosition
        ? POSITION_BONUS[session.finishPosition] ?? 0
        : 0;
      const totalPoints =
        BASE_POINTS + session.bountiesWon * BOUNTY_POINTS + positionBonus;

      await tx.gameSession.update({
        where: { id: session.id },
        data: { pointsEarned: totalPoints },
      });
    }

    // 2. Update NetworkEdge for ALL player pairs
    const personIds = game.gameSessions.map((s) => s.personId);
    const gameStarted = game.startedAt ?? new Date(0);
    const gameCompleted = game.completedAt ?? new Date();

    for (let i = 0; i < personIds.length; i++) {
      for (let j = i + 1; j < personIds.length; j++) {
        const personAId =
          personIds[i]! < personIds[j]! ? personIds[i]! : personIds[j]!;
        const personBId =
          personIds[i]! < personIds[j]! ? personIds[j]! : personIds[i]!;

        const existing = await tx.networkEdge.findUnique({
          where: { personAId_personBId: { personAId, personBId } },
        });

        if (existing) {
          // Only increment if this edge wasn't already touched during this game
          const alreadyCounted = existing.lastPlayedAt >= gameStarted;
          await tx.networkEdge.update({
            where: { personAId_personBId: { personAId, personBId } },
            data: {
              lastPlayedAt: gameCompleted,
              ...(alreadyCounted ? {} : { gamesShared: { increment: 1 } }),
            },
          });
        } else {
          await tx.networkEdge.create({
            data: {
              personAId,
              personBId,
              firstPlayedAt: gameStarted,
              lastPlayedAt: gameCompleted,
              gamesShared: 1,
            },
          });
        }
      }
    }
  });

  // 3. Check automatic trophies
  const trophiesAwarded = await checkAutoTrophies(gameId);

  // 3b. Auto-enroll players as circuit members if venue belongs to a circuit
  const personIds = game.gameSessions.map((s) => s.personId);
  autoEnrollCircuitMembers(game.clubId, personIds).catch(() => {});

  // 4. Audit log
  await db.auditLog.create({
    data: {
      clubId: game.clubId,
      actorId,
      action: "CREATE",
      entityType: "GameResults",
      entityId: gameId,
      newValue: {
        pointsCalculated: game.gameSessions.length,
        trophiesAwarded: trophiesAwarded.length,
      },
    },
  });

  // 5. Return full results
  return getGameResults(gameId);
}

// ---------------------------------------------------------------------------
// getGameResults
// ---------------------------------------------------------------------------
export async function getGameResults(gameId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      event: { select: { id: true, title: true, startsAt: true } },
      gameSessions: {
        include: {
          person: { select: { id: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { finishPosition: "asc" },
      },
    },
  });

  if (!game) throw new Error("Game not found");

  const standings = game.gameSessions.map((s) => ({
    position: s.finishPosition,
    personId: s.personId,
    displayName: s.person.displayName,
    avatarUrl: s.person.avatarUrl,
    pointsEarned: s.pointsEarned,
    payout: s.payout,
    totalPaid: s.totalPaid,
    net: s.payout - s.totalPaid,
    rebuys: s.rebuys,
    bountiesWon: s.bountiesWon,
    bountiesLost: s.bountiesLost,
  }));

  const durationMinutes =
    game.startedAt && game.completedAt
      ? Math.round(
          (game.completedAt.getTime() - game.startedAt.getTime()) / 60000
        )
      : null;

  const winner = standings.find((s) => s.position === 1) ?? null;
  const biggestEarner = standings.length
    ? standings.reduce((best, s) => (s.net > best.net ? s : best))
    : null;
  const mostBountiesPlayer = standings
    .filter((s) => s.bountiesWon > 0)
    .sort((a, b) => b.bountiesWon - a.bountiesWon)[0] ?? null;

  return {
    metadata: {
      gameId: game.id,
      eventId: game.event?.id ?? null,
      eventTitle: game.event?.title ?? "Untitled Game",
      date: (
        game.event?.startsAt ??
        game.startedAt ??
        new Date()
      ).toISOString(),
      durationMinutes,
      playerCount: game.gameSessions.length,
      prizePool: game.prizePool,
      status: game.status,
    },
    standings,
    topStats: {
      winner: winner
        ? { personId: winner.personId, displayName: winner.displayName }
        : null,
      biggestEarner: biggestEarner
        ? {
            personId: biggestEarner.personId,
            displayName: biggestEarner.displayName,
            net: biggestEarner.net,
          }
        : null,
      mostBounties: mostBountiesPlayer
        ? {
            personId: mostBountiesPlayer.personId,
            displayName: mostBountiesPlayer.displayName,
            count: mostBountiesPlayer.bountiesWon,
          }
        : null,
    },
  };
}

// ---------------------------------------------------------------------------
// getResultsSummaryText — formatted text for notifications / SMS
// ---------------------------------------------------------------------------
export async function getResultsSummaryText(gameId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      club: { select: { name: true } },
      event: { select: { id: true, title: true, startsAt: true } },
      gameSessions: {
        include: {
          person: { select: { displayName: true } },
        },
        orderBy: { finishPosition: "asc" },
      },
    },
  });

  if (!game) throw new Error("Game not found");

  const clubName = game.club?.name ?? "PKR Night";
  const eventTitle = game.event?.title ?? "Game Night";
  const eventDate = game.event?.startsAt ?? game.startedAt ?? new Date();
  const dateStr = eventDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const eventId = game.event?.id ?? gameId;

  const top3 = game.gameSessions
    .filter((s) => s.finishPosition && s.finishPosition <= 3)
    .sort((a, b) => (a.finishPosition ?? 99) - (b.finishPosition ?? 99));

  const positionLabels = ["1st", "2nd", "3rd"];
  const lines = [
    `🏆 ${clubName} results — ${eventTitle} (${dateStr})`,
    ...top3.map(
      (s, i) =>
        `${positionLabels[i]}: ${s.person.displayName} (+$${s.payout})`
    ),
    `${game.gameSessions.length} players · $${game.prizePool} prize pool`,
    `Full results: pkrnight.com/events/${eventId}`,
  ];

  return lines.join("\n");
}
