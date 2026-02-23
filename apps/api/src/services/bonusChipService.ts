import { db } from "../../../../packages/db/src/client";
import { assertPubPoker } from "../lib/pubPokerGuard";

// ==========================================================================
// ⚠️  RON — TEMPORARY IN-MEMORY CONFIG
// This Map resets on every server restart. Bonus chip configs are NOT persisted.
// Needs a schema migration to add a config JSON column (e.g. on ClubFeatureFlag
// or a dedicated BonusChipConfig table) before going to production.
// ==========================================================================
const bonusChipConfigs = new Map<string, BonusChipConfig>();

export interface BonusChipConfig {
  amount: number; // chip points granted per bonus
  mode: "TRACKED" | "SELF_REPORT" | "OFF";
  maxPerNight: number; // max bonuses per player per game
  triggerFood: boolean;
  triggerDrinks: boolean;
}

const DEFAULT_CONFIG: BonusChipConfig = {
  amount: 500,
  mode: "OFF",
  maxPerNight: 3,
  triggerFood: true,
  triggerDrinks: true,
};

export async function getBonusChipConfig(clubId: string) {
  await assertPubPoker(clubId);
  return bonusChipConfigs.get(clubId) ?? { ...DEFAULT_CONFIG };
}

export async function setBonusChipConfig(
  clubId: string,
  config: BonusChipConfig,
  actorId: string
) {
  await assertPubPoker(clubId);

  // Verify actor is OWNER
  const membership = await db.membership.findUnique({
    where: { clubId_personId: { clubId, personId: actorId } },
  });
  if (!membership || membership.systemRole !== "OWNER") {
    throw new Error("Only the owner can configure bonus chips");
  }

  bonusChipConfigs.set(clubId, config);
  return config;
}

export async function grantBonusChips(
  clubId: string,
  gameId: string,
  personId: string,
  verifiedBy?: string | null
) {
  await assertPubPoker(clubId);

  const config = bonusChipConfigs.get(clubId) ?? { ...DEFAULT_CONFIG };

  if (config.mode === "OFF") {
    throw new Error("Bonus chips are currently disabled for this club");
  }

  if (config.mode === "TRACKED" && !verifiedBy) {
    throw new Error("TRACKED mode requires a verifiedBy staff member");
  }

  // Count existing bonuses for this player in this game
  const existingCount = await db.bonusChipTransaction.count({
    where: { clubId, gameId, personId },
  });

  if (existingCount >= config.maxPerNight) {
    throw new Error("Bonus chip limit reached for tonight");
  }

  const transaction = await db.bonusChipTransaction.create({
    data: {
      clubId,
      gameId,
      personId,
      amount: config.amount,
      mode: config.mode,
      verifiedBy: config.mode === "TRACKED" ? verifiedBy : null,
    },
  });

  return transaction;
}

export async function getBonusChipTotal(
  clubId: string,
  gameId: string,
  personId: string
) {
  await assertPubPoker(clubId);

  const config = bonusChipConfigs.get(clubId) ?? { ...DEFAULT_CONFIG };

  const count = await db.bonusChipTransaction.count({
    where: { clubId, gameId, personId },
  });

  return {
    personId,
    bonusCount: count,
    totalBonusChips: count * config.amount,
  };
}

export async function getBonusChipLeaderboard(clubId: string, gameId: string) {
  await assertPubPoker(clubId);

  const config = bonusChipConfigs.get(clubId) ?? { ...DEFAULT_CONFIG };

  // Get all bonus transactions for this game, grouped by person
  const transactions = await db.bonusChipTransaction.findMany({
    where: { clubId, gameId },
  });

  // Group by personId
  const byPerson = new Map<string, number>();
  for (const tx of transactions) {
    byPerson.set(tx.personId, (byPerson.get(tx.personId) ?? 0) + 1);
  }

  // Look up display names
  const personIds = Array.from(byPerson.keys());
  const persons = await db.person.findMany({
    where: { id: { in: personIds } },
    select: { id: true, displayName: true },
  });
  const nameMap = new Map(persons.map((p) => [p.id, p.displayName]));

  // Build leaderboard sorted by bonus count descending
  const leaderboard = Array.from(byPerson.entries())
    .map(([personId, bonusCount]) => ({
      personId,
      displayName: nameMap.get(personId) ?? "Unknown",
      bonusCount,
      totalBonusChips: bonusCount * config.amount,
    }))
    .sort((a, b) => b.bonusCount - a.bonusCount);

  return leaderboard;
}
