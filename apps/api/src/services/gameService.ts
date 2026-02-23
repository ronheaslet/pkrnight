import { db } from "../../../../packages/db/src/client";

// ---------------------------------------------------------------------------
// getGameState — Returns full game state for polling
// ---------------------------------------------------------------------------
export async function getGameState(gameId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      blindStructure: {
        include: {
          levels: { orderBy: { levelNumber: "asc" } },
        },
      },
      chipSet: {
        include: {
          denominations: { orderBy: { sortOrder: "asc" } },
        },
      },
      gameSessions: {
        include: {
          person: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!game) return null;

  const levels = game.blindStructure?.levels ?? [];
  const currentLevel = levels.find((l) => l.levelNumber === game.currentLevel);
  const nextLevel = levels.find(
    (l) => l.levelNumber === game.currentLevel + 1
  );

  // Calculate time remaining
  let timeRemainingMs = 0;
  if (currentLevel && game.levelStartedAt) {
    const levelDurationMs = currentLevel.durationMinutes * 60 * 1000;
    const elapsedMs =
      game.status === "PAUSED" && game.pausedAt
        ? game.pausedAt.getTime() -
          game.levelStartedAt.getTime() -
          game.totalPausedMs
        : Date.now() - game.levelStartedAt.getTime() - game.totalPausedMs;
    timeRemainingMs = Math.max(0, levelDurationMs - elapsedMs);
  }

  const activeSessions = game.gameSessions.filter(
    (s) => s.status === "ACTIVE"
  );

  return {
    game: {
      id: game.id,
      clubId: game.clubId,
      eventId: game.eventId,
      status: game.status,
      currentLevel: game.currentLevel,
      levelStartedAt: game.levelStartedAt?.toISOString() ?? null,
      pausedAt: game.pausedAt?.toISOString() ?? null,
      totalPausedMs: game.totalPausedMs,
      playersRegistered: game.playersRegistered,
      playersRemaining: game.playersRemaining,
      prizePool: game.prizePool,
      totalRebuys: game.totalRebuys,
      totalAddOns: game.totalAddOns,
      buyInAmount: game.buyInAmount,
      rebuyAmount: game.rebuyAmount,
      addOnAmount: game.addOnAmount,
      rebuyLimit: game.rebuyLimit,
      bountyEnabled: game.bountyEnabled,
      bountyAmount: game.bountyAmount,
      startedAt: game.startedAt?.toISOString() ?? null,
      completedAt: game.completedAt?.toISOString() ?? null,
    },
    currentLevel: currentLevel
      ? {
          levelNumber: currentLevel.levelNumber,
          smallBlind: currentLevel.smallBlind,
          bigBlind: currentLevel.bigBlind,
          ante: currentLevel.ante,
          durationMinutes: currentLevel.durationMinutes,
          isBreak: currentLevel.isBreak,
          breakLabel: currentLevel.breakLabel,
        }
      : null,
    nextLevel: nextLevel
      ? {
          levelNumber: nextLevel.levelNumber,
          smallBlind: nextLevel.smallBlind,
          bigBlind: nextLevel.bigBlind,
          ante: nextLevel.ante,
          durationMinutes: nextLevel.durationMinutes,
          isBreak: nextLevel.isBreak,
          breakLabel: nextLevel.breakLabel,
        }
      : null,
    timeRemainingMs,
    players: game.gameSessions.map((s) => ({
      sessionId: s.id,
      personId: s.personId,
      displayName: s.person.displayName,
      avatarUrl: s.person.avatarUrl,
      status: s.status,
      currentStack: s.currentStack,
      startingStack: s.startingStack,
      finishPosition: s.finishPosition,
      rebuys: s.rebuys,
      addOns: s.addOns,
      bountiesWon: s.bountiesWon,
      payout: s.payout,
      pointsEarned: s.pointsEarned,
      totalPaid: s.totalPaid,
      eliminatedAt: s.eliminatedAt?.toISOString() ?? null,
      eliminatedBy: s.eliminatedBy,
    })),
    playersRemaining: activeSessions.length,
    chipSet: game.chipSet
      ? {
          id: game.chipSet.id,
          name: game.chipSet.name,
          mode: game.chipSet.mode,
          denominations: game.chipSet.denominations.map((d) => ({
            id: d.id,
            colorName: d.colorName,
            colorHex: d.colorHex,
            value: d.value,
            sortOrder: d.sortOrder,
          })),
        }
      : null,
    blindStructure: game.blindStructure
      ? {
          id: game.blindStructure.id,
          name: game.blindStructure.name,
          levels: levels.map((l) => ({
            levelNumber: l.levelNumber,
            smallBlind: l.smallBlind,
            bigBlind: l.bigBlind,
            ante: l.ante,
            durationMinutes: l.durationMinutes,
            isBreak: l.isBreak,
            breakLabel: l.breakLabel,
          })),
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// startGame
// ---------------------------------------------------------------------------
export async function startGame(gameId: string, _actorId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: { gameSessions: true },
  });

  if (!game) throw new Error("Game not found");
  if (game.status !== "PENDING")
    throw new Error(`Cannot start game in ${game.status} status`);

  const playerCount = game.gameSessions.length;

  await db.game.update({
    where: { id: gameId },
    data: {
      status: "ACTIVE",
      currentLevel: 1,
      levelStartedAt: new Date(),
      startedAt: new Date(),
      playersRegistered: playerCount,
      playersRemaining: playerCount,
    },
  });

  return getGameState(gameId);
}

// ---------------------------------------------------------------------------
// pauseGame
// ---------------------------------------------------------------------------
export async function pauseGame(gameId: string, _actorId: string) {
  const game = await db.game.findUnique({ where: { id: gameId } });

  if (!game) throw new Error("Game not found");
  if (game.status !== "ACTIVE" && game.status !== "BREAK")
    throw new Error(`Cannot pause game in ${game.status} status`);

  await db.game.update({
    where: { id: gameId },
    data: {
      status: "PAUSED",
      pausedAt: new Date(),
    },
  });

  return getGameState(gameId);
}

// ---------------------------------------------------------------------------
// resumeGame
// ---------------------------------------------------------------------------
export async function resumeGame(gameId: string, _actorId: string) {
  const game = await db.game.findUnique({ where: { id: gameId } });

  if (!game) throw new Error("Game not found");
  if (game.status !== "PAUSED")
    throw new Error(`Cannot resume game in ${game.status} status`);

  const pauseDuration = game.pausedAt
    ? Date.now() - game.pausedAt.getTime()
    : 0;

  await db.game.update({
    where: { id: gameId },
    data: {
      status: "ACTIVE",
      totalPausedMs: game.totalPausedMs + pauseDuration,
      pausedAt: null,
    },
  });

  return getGameState(gameId);
}

// ---------------------------------------------------------------------------
// advanceLevel
// ---------------------------------------------------------------------------
export async function advanceLevel(gameId: string, _actorId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      blindStructure: {
        include: { levels: { orderBy: { levelNumber: "asc" } } },
      },
    },
  });

  if (!game) throw new Error("Game not found");

  const nextLevelNumber = game.currentLevel + 1;
  const nextLevel = game.blindStructure?.levels.find(
    (l) => l.levelNumber === nextLevelNumber
  );

  const newStatus = nextLevel?.isBreak ? "BREAK" : "ACTIVE";

  await db.game.update({
    where: { id: gameId },
    data: {
      currentLevel: nextLevelNumber,
      levelStartedAt: new Date(),
      totalPausedMs: 0, // reset pause tracking for new level
      pausedAt: null,
      status: newStatus,
    },
  });

  return getGameState(gameId);
}

// ---------------------------------------------------------------------------
// eliminatePlayer
// ---------------------------------------------------------------------------
export async function eliminatePlayer(
  gameId: string,
  personId: string,
  actorId: string,
  eliminatedByPersonId?: string
) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      gameSessions: { where: { status: "ACTIVE" } },
    },
  });

  if (!game) throw new Error("Game not found");

  const session = game.gameSessions.find((s) => s.personId === personId);
  if (!session) throw new Error("Player session not found or already eliminated");

  const finishPosition = game.gameSessions.filter(
    (s) => s.status === "ACTIVE"
  ).length;

  // Eliminate the player
  await db.gameSession.update({
    where: { id: session.id },
    data: {
      status: "ELIMINATED",
      eliminatedAt: new Date(),
      eliminatedBy: eliminatedByPersonId ?? null,
      finishPosition,
    },
  });

  // Decrement players remaining
  await db.game.update({
    where: { id: gameId },
    data: {
      playersRemaining: { decrement: 1 },
    },
  });

  // Create NetworkEdge records between eliminated player and all other active players
  const otherActiveSessions = game.gameSessions.filter(
    (s) => s.personId !== personId && s.status === "ACTIVE"
  );

  for (const other of otherActiveSessions) {
    const personAId =
      personId < other.personId ? personId : other.personId;
    const personBId =
      personId < other.personId ? other.personId : personId;

    await db.networkEdge.upsert({
      where: {
        personAId_personBId: { personAId, personBId },
      },
      update: {
        lastPlayedAt: new Date(),
        gamesShared: { increment: 1 },
      },
      create: {
        personAId,
        personBId,
        firstPlayedAt: new Date(),
        lastPlayedAt: new Date(),
        gamesShared: 1,
      },
    });
  }

  return getGameState(gameId);
}

// ---------------------------------------------------------------------------
// updatePlayerStack
// ---------------------------------------------------------------------------
export async function updatePlayerStack(
  gameSessionId: string,
  stackValue: number,
  _actorId: string
) {
  const session = await db.gameSession.update({
    where: { id: gameSessionId },
    data: { currentStack: stackValue },
  });
  return session;
}

// ---------------------------------------------------------------------------
// endGame
// ---------------------------------------------------------------------------
export async function endGame(gameId: string, _actorId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      gameSessions: { where: { status: "ACTIVE" } },
    },
  });

  if (!game) throw new Error("Game not found");

  // Mark the last remaining player as winner
  if (game.gameSessions.length === 1) {
    await db.gameSession.update({
      where: { id: game.gameSessions[0]!.id },
      data: {
        status: "WINNER",
        finishPosition: 1,
      },
    });
  }

  await db.game.update({
    where: { id: gameId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  return getGameState(gameId);
}
