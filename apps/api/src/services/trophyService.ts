import { db } from "../../../../packages/db/src/client";

// ---------------------------------------------------------------------------
// Default trophies seeded for every new club
// ---------------------------------------------------------------------------
const DEFAULT_TROPHIES = [
  {
    name: "Champion",
    emoji: "🏆",
    description: "Win a game",
    isAutomatic: true,
    triggerCondition: { type: "first_place" },
  },
  {
    name: "Bounty Hunter",
    emoji: "🎯",
    description: "Most bounties in a game",
    isAutomatic: true,
    triggerCondition: { type: "most_bounties_game" },
  },
  {
    name: "Comeback Kid",
    emoji: "🔄",
    description: "Awarded for an impressive comeback",
    isAutomatic: false,
    triggerCondition: null,
  },
  {
    name: "Chip Leader",
    emoji: "💰",
    description: "Dominated the chip count",
    isAutomatic: false,
    triggerCondition: null,
  },
  {
    name: "Final Two",
    emoji: "🤝",
    description: "Made it to the final two",
    isAutomatic: true,
    triggerCondition: { type: "final_two" },
  },
  {
    name: "Bubble Boy",
    emoji: "😤",
    description: "Just missed the money",
    isAutomatic: false,
    triggerCondition: null,
  },
  {
    name: "All In",
    emoji: "🎲",
    description: "Bold play deserves recognition",
    isAutomatic: false,
    triggerCondition: null,
  },
  {
    name: "Hat Trick",
    emoji: "🎩",
    description: "Win 3 games in a season",
    isAutomatic: true,
    triggerCondition: { type: "wins_season", threshold: 3 },
  },
] as const;

// ---------------------------------------------------------------------------
// seedDefaultTrophies — called from clubService.createClub inside its tx
// ---------------------------------------------------------------------------
export async function seedDefaultTrophies(clubId: string, tx?: any) {
  const client = tx ?? db;
  for (const trophy of DEFAULT_TROPHIES) {
    await client.trophy.create({
      data: {
        clubId,
        name: trophy.name,
        emoji: trophy.emoji,
        description: trophy.description,
        isAutomatic: trophy.isAutomatic,
        triggerCondition: trophy.triggerCondition as any,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// awardTrophy
// ---------------------------------------------------------------------------
export async function awardTrophy(
  clubId: string,
  trophyId: string,
  personId: string,
  actorId: string,
  options?: { seasonId?: string; gameId?: string; note?: string }
) {
  const trophy = await db.trophy.findUnique({ where: { id: trophyId } });
  if (!trophy) throw new Error("Trophy not found");
  if (trophy.clubId !== clubId)
    throw new Error("Trophy does not belong to this club");

  const award = await db.trophyAward.create({
    data: {
      trophyId,
      personId,
      clubId,
      seasonId: options?.seasonId ?? null,
      gameId: options?.gameId ?? null,
      awardedBy: actorId,
      note: options?.note ?? null,
    },
  });

  await db.notification.create({
    data: {
      clubId,
      personId,
      type: "TROPHY",
      channel: "IN_APP",
      title: `${trophy.emoji} ${trophy.name}`,
      body: options?.note
        ? `You've been awarded ${trophy.emoji} ${trophy.name}! ${options.note}`
        : `You've been awarded ${trophy.emoji} ${trophy.name}!`,
      data: { trophyId, trophyAwardId: award.id, gameId: options?.gameId },
    },
  });

  await db.auditLog.create({
    data: {
      clubId,
      actorId,
      action: "CREATE",
      entityType: "TrophyAward",
      entityId: award.id,
      newValue: {
        trophyId,
        trophyName: trophy.name,
        personId,
        gameId: options?.gameId,
      },
    },
  });

  return award;
}

// ---------------------------------------------------------------------------
// checkAutoTrophies — evaluate automatic trophies after game finalization
// ---------------------------------------------------------------------------
export async function checkAutoTrophies(gameId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      event: { select: { seasonId: true } },
      gameSessions: {
        include: {
          person: { select: { id: true, displayName: true } },
        },
        orderBy: { finishPosition: "asc" },
      },
    },
  });

  if (!game) throw new Error("Game not found");

  const trophies = await db.trophy.findMany({
    where: { clubId: game.clubId, isAutomatic: true },
  });

  const awarded: Array<{ trophyName: string; personId: string; displayName: string }> = [];
  const sessions = game.gameSessions;
  const seasonId = game.event?.seasonId ?? null;

  for (const trophy of trophies) {
    const trigger = trophy.triggerCondition as Record<string, any> | null;
    if (!trigger?.type) continue;

    const personIds: string[] = [];

    switch (trigger.type) {
      case "first_place": {
        const winner = sessions.find((s) => s.finishPosition === 1);
        if (winner) personIds.push(winner.personId);
        break;
      }

      case "most_bounties_game": {
        const maxBounties = Math.max(...sessions.map((s) => s.bountiesWon));
        if (maxBounties >= 1) {
          const winners = sessions.filter(
            (s) => s.bountiesWon === maxBounties
          );
          personIds.push(...winners.map((s) => s.personId));
        }
        break;
      }

      case "most_rebuys_game": {
        const maxRebuys = Math.max(...sessions.map((s) => s.rebuys));
        if (maxRebuys >= 2) {
          const winners = sessions.filter((s) => s.rebuys === maxRebuys);
          personIds.push(...winners.map((s) => s.personId));
        }
        break;
      }

      case "final_two": {
        const top2 = sessions.filter(
          (s) => s.finishPosition === 1 || s.finishPosition === 2
        );
        personIds.push(...top2.map((s) => s.personId));
        break;
      }

      case "bounty_count_season": {
        if (!seasonId) break;
        const threshold = trigger.threshold ?? 1;
        const seasonSessions = await db.gameSession.findMany({
          where: {
            game: {
              clubId: game.clubId,
              event: { seasonId },
              status: "COMPLETED",
            },
          },
        });
        // Aggregate bounties by person
        const bountyMap = new Map<string, number>();
        for (const s of seasonSessions) {
          bountyMap.set(s.personId, (bountyMap.get(s.personId) ?? 0) + s.bountiesWon);
        }
        for (const [pid, total] of bountyMap) {
          if (total >= threshold) personIds.push(pid);
        }
        break;
      }

      case "wins_season": {
        if (!seasonId) break;
        const threshold = trigger.threshold ?? 1;
        const seasonSessions = await db.gameSession.findMany({
          where: {
            finishPosition: 1,
            game: {
              clubId: game.clubId,
              event: { seasonId },
              status: "COMPLETED",
            },
          },
        });
        // Count wins by person
        const winMap = new Map<string, number>();
        for (const s of seasonSessions) {
          winMap.set(s.personId, (winMap.get(s.personId) ?? 0) + 1);
        }
        for (const [pid, total] of winMap) {
          if (total >= threshold) personIds.push(pid);
        }
        break;
      }
    }

    // Award to each qualifying person (dedup — skip if already awarded)
    for (const pid of personIds) {
      const existing = await db.trophyAward.findFirst({
        where: { trophyId: trophy.id, personId: pid, gameId },
      });
      if (existing) continue;

      // For season-based trophies, also check if already awarded this season
      if (
        (trigger.type === "bounty_count_season" ||
          trigger.type === "wins_season") &&
        seasonId
      ) {
        const seasonExisting = await db.trophyAward.findFirst({
          where: { trophyId: trophy.id, personId: pid, seasonId },
        });
        if (seasonExisting) continue;
      }

      await awardTrophy(game.clubId, trophy.id, pid, "system", {
        seasonId: seasonId ?? undefined,
        gameId,
      });

      const person = sessions.find((s) => s.personId === pid)?.person;
      awarded.push({
        trophyName: trophy.name,
        personId: pid,
        displayName: person?.displayName ?? "Unknown",
      });
    }
  }

  return awarded;
}

// ---------------------------------------------------------------------------
// getTrophiesForClub
// ---------------------------------------------------------------------------
export async function getTrophiesForClub(clubId: string) {
  const trophies = await db.trophy.findMany({
    where: { clubId },
    include: { _count: { select: { awards: true } } },
    orderBy: { createdAt: "asc" },
  });

  return trophies.map((t) => ({
    id: t.id,
    clubId: t.clubId,
    name: t.name,
    emoji: t.emoji,
    description: t.description,
    isAutomatic: t.isAutomatic,
    triggerCondition: t.triggerCondition,
    totalAwards: t._count.awards,
  }));
}

// ---------------------------------------------------------------------------
// getTrophiesForPerson
// ---------------------------------------------------------------------------
export async function getTrophiesForPerson(clubId: string, personId: string) {
  const awards = await db.trophyAward.findMany({
    where: { clubId, personId },
    include: { trophy: true },
    orderBy: { createdAt: "desc" },
  });

  return awards.map((a) => ({
    id: a.id,
    trophyName: a.trophy.name,
    trophyEmoji: a.trophy.emoji,
    trophyDescription: a.trophy.description,
    awardedAt: a.createdAt.toISOString(),
    gameId: a.gameId,
    seasonId: a.seasonId,
    note: a.note,
    awardedBy: a.awardedBy,
  }));
}

// ---------------------------------------------------------------------------
// createTrophy
// ---------------------------------------------------------------------------
export async function createTrophy(
  clubId: string,
  data: {
    name: string;
    emoji: string;
    description?: string;
    isAutomatic?: boolean;
    triggerCondition?: Record<string, any>;
  },
  actorId: string
) {
  const trophy = await db.trophy.create({
    data: {
      clubId,
      name: data.name,
      emoji: data.emoji,
      description: data.description ?? null,
      isAutomatic: data.isAutomatic ?? false,
      triggerCondition: data.triggerCondition ?? undefined,
    },
  });

  await db.auditLog.create({
    data: {
      clubId,
      actorId,
      action: "CREATE",
      entityType: "Trophy",
      entityId: trophy.id,
      newValue: { name: trophy.name, emoji: trophy.emoji, isAutomatic: trophy.isAutomatic },
    },
  });

  return trophy;
}
