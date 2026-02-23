import { db } from "../../../../packages/db/src/client";

// ---------------------------------------------------------------------------
// recordBuyIn
// ---------------------------------------------------------------------------
export async function recordBuyIn(
  gameId: string,
  personId: string,
  actorId: string,
  amount: number,
  method?: string
) {
  const game = await db.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("Game not found");
  if (game.status !== "ACTIVE" && game.status !== "PENDING") {
    throw new Error(`Cannot record buy-in for game in ${game.status} status`);
  }

  const session = await db.gameSession.findUnique({
    where: { gameId_personId: { gameId, personId } },
  });
  if (!session) throw new Error("Player session not found");

  const transaction = await db.transaction.create({
    data: {
      clubId: game.clubId,
      gameId,
      personId,
      actorId,
      type: "BUY_IN",
      category: "GAME",
      amount,
      method: method ?? null,
      description: `Buy-in for game`,
    },
  });

  await db.gameSession.update({
    where: { id: session.id },
    data: {
      buyInPaid: true,
      totalPaid: { increment: amount },
    },
  });

  await db.game.update({
    where: { id: gameId },
    data: { prizePool: { increment: amount } },
  });

  await db.treasuryBalance.upsert({
    where: { clubId: game.clubId },
    update: { currentBalance: { increment: amount } },
    create: { clubId: game.clubId, currentBalance: amount, minimumReserve: 0 },
  });

  await db.auditLog.create({
    data: {
      clubId: game.clubId,
      actorId,
      action: "CREATE",
      entityType: "Transaction",
      entityId: transaction.id,
      transactionId: transaction.id,
      newValue: { type: "BUY_IN", amount, personId, gameId },
    },
  });

  return transaction;
}

// ---------------------------------------------------------------------------
// recordRebuy
// ---------------------------------------------------------------------------
export async function recordRebuy(
  gameId: string,
  personId: string,
  actorId: string,
  amount: number,
  method?: string
) {
  const game = await db.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("Game not found");
  if (game.status !== "ACTIVE") {
    throw new Error(`Cannot record rebuy for game in ${game.status} status`);
  }

  const session = await db.gameSession.findUnique({
    where: { gameId_personId: { gameId, personId } },
  });
  if (!session) throw new Error("Player session not found");

  if (game.rebuyLimit !== null && session.rebuys >= game.rebuyLimit) {
    throw new Error("Rebuy limit reached for this player");
  }

  const transaction = await db.transaction.create({
    data: {
      clubId: game.clubId,
      gameId,
      personId,
      actorId,
      type: "REBUY",
      category: "GAME",
      amount,
      method: method ?? null,
      description: `Rebuy #${session.rebuys + 1}`,
    },
  });

  await db.gameSession.update({
    where: { id: session.id },
    data: {
      rebuys: { increment: 1 },
      totalPaid: { increment: amount },
    },
  });

  await db.game.update({
    where: { id: gameId },
    data: {
      prizePool: { increment: amount },
      totalRebuys: { increment: 1 },
    },
  });

  await db.treasuryBalance.upsert({
    where: { clubId: game.clubId },
    update: { currentBalance: { increment: amount } },
    create: { clubId: game.clubId, currentBalance: amount, minimumReserve: 0 },
  });

  await db.auditLog.create({
    data: {
      clubId: game.clubId,
      actorId,
      action: "CREATE",
      entityType: "Transaction",
      entityId: transaction.id,
      transactionId: transaction.id,
      newValue: { type: "REBUY", amount, personId, gameId },
    },
  });

  return transaction;
}

// ---------------------------------------------------------------------------
// recordAddOn
// ---------------------------------------------------------------------------
export async function recordAddOn(
  gameId: string,
  personId: string,
  actorId: string,
  amount: number,
  method?: string
) {
  const game = await db.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("Game not found");
  if (game.status !== "ACTIVE") {
    throw new Error(`Cannot record add-on for game in ${game.status} status`);
  }

  const session = await db.gameSession.findUnique({
    where: { gameId_personId: { gameId, personId } },
  });
  if (!session) throw new Error("Player session not found");

  const transaction = await db.transaction.create({
    data: {
      clubId: game.clubId,
      gameId,
      personId,
      actorId,
      type: "ADD_ON",
      category: "GAME",
      amount,
      method: method ?? null,
      description: `Add-on #${session.addOns + 1}`,
    },
  });

  await db.gameSession.update({
    where: { id: session.id },
    data: {
      addOns: { increment: 1 },
      totalPaid: { increment: amount },
    },
  });

  await db.game.update({
    where: { id: gameId },
    data: {
      prizePool: { increment: amount },
      totalAddOns: { increment: 1 },
    },
  });

  await db.treasuryBalance.upsert({
    where: { clubId: game.clubId },
    update: { currentBalance: { increment: amount } },
    create: { clubId: game.clubId, currentBalance: amount, minimumReserve: 0 },
  });

  await db.auditLog.create({
    data: {
      clubId: game.clubId,
      actorId,
      action: "CREATE",
      entityType: "Transaction",
      entityId: transaction.id,
      transactionId: transaction.id,
      newValue: { type: "ADD_ON", amount, personId, gameId },
    },
  });

  return transaction;
}

// ---------------------------------------------------------------------------
// recordPayout
// ---------------------------------------------------------------------------
export async function recordPayout(
  gameId: string,
  personId: string,
  actorId: string,
  amount: number,
  method?: string
) {
  const game = await db.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("Game not found");
  if (game.status !== "COMPLETED" && game.status !== "ACTIVE") {
    throw new Error(`Cannot record payout for game in ${game.status} status`);
  }

  const session = await db.gameSession.findUnique({
    where: { gameId_personId: { gameId, personId } },
  });
  if (!session) throw new Error("Player session not found");

  const transaction = await db.transaction.create({
    data: {
      clubId: game.clubId,
      gameId,
      personId,
      actorId,
      type: "PAYOUT",
      category: "GAME",
      amount,
      method: method ?? null,
      description: `Payout — position ${session.finishPosition ?? "TBD"}`,
    },
  });

  await db.gameSession.update({
    where: { id: session.id },
    data: { payout: { increment: amount } },
  });

  await db.treasuryBalance.upsert({
    where: { clubId: game.clubId },
    update: { currentBalance: { decrement: amount } },
    create: {
      clubId: game.clubId,
      currentBalance: -amount,
      minimumReserve: 0,
    },
  });

  await db.auditLog.create({
    data: {
      clubId: game.clubId,
      actorId,
      action: "CREATE",
      entityType: "Transaction",
      entityId: transaction.id,
      transactionId: transaction.id,
      newValue: { type: "PAYOUT", amount, personId, gameId },
    },
  });

  return transaction;
}

// ---------------------------------------------------------------------------
// recordBounty
// ---------------------------------------------------------------------------
export async function recordBounty(
  gameId: string,
  winnerId: string,
  loserId: string,
  actorId: string,
  amount: number
) {
  const game = await db.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("Game not found");

  const transaction = await db.transaction.create({
    data: {
      clubId: game.clubId,
      gameId,
      personId: winnerId,
      actorId,
      type: "BOUNTY_COLLECTED",
      category: "GAME",
      amount,
      bountyFromPersonId: loserId,
      description: `Bounty collected from eliminated player`,
    },
  });

  // Update winner's bountiesWon
  const winnerSession = await db.gameSession.findUnique({
    where: { gameId_personId: { gameId, personId: winnerId } },
  });
  if (winnerSession) {
    await db.gameSession.update({
      where: { id: winnerSession.id },
      data: { bountiesWon: { increment: 1 } },
    });
  }

  // Update loser's bountiesLost
  const loserSession = await db.gameSession.findUnique({
    where: { gameId_personId: { gameId, personId: loserId } },
  });
  if (loserSession) {
    await db.gameSession.update({
      where: { id: loserSession.id },
      data: { bountiesLost: { increment: 1 } },
    });
  }

  await db.auditLog.create({
    data: {
      clubId: game.clubId,
      actorId,
      action: "CREATE",
      entityType: "Transaction",
      entityId: transaction.id,
      transactionId: transaction.id,
      newValue: {
        type: "BOUNTY_COLLECTED",
        amount,
        winnerId,
        loserId,
        gameId,
      },
    },
  });

  return transaction;
}

// ---------------------------------------------------------------------------
// recordExpense
// ---------------------------------------------------------------------------
const VALID_EXPENSE_CATEGORIES = [
  "EXPENSE_FOOD",
  "EXPENSE_DRINKS",
  "EXPENSE_VENUE",
  "EXPENSE_DEALER_TIP",
  "EXPENSE_OTHER",
] as const;

export async function recordExpense(
  clubId: string,
  gameId: string | null,
  actorId: string,
  amount: number,
  category: string,
  description: string,
  method?: string
) {
  if (
    !VALID_EXPENSE_CATEGORIES.includes(
      category as (typeof VALID_EXPENSE_CATEGORIES)[number]
    )
  ) {
    throw new Error(
      `Invalid expense category: ${category}. Must be one of: ${VALID_EXPENSE_CATEGORIES.join(", ")}`
    );
  }

  const transaction = await db.transaction.create({
    data: {
      clubId,
      gameId,
      actorId,
      type: "EXPENSE",
      category: category as any,
      amount,
      method: method ?? null,
      description,
    },
  });

  await db.treasuryBalance.upsert({
    where: { clubId },
    update: { currentBalance: { decrement: amount } },
    create: { clubId, currentBalance: -amount, minimumReserve: 0 },
  });

  await db.auditLog.create({
    data: {
      clubId,
      actorId,
      action: "CREATE",
      entityType: "Transaction",
      entityId: transaction.id,
      transactionId: transaction.id,
      newValue: { type: "EXPENSE", amount, category, description, gameId },
    },
  });

  return transaction;
}

// ---------------------------------------------------------------------------
// voidTransaction
// ---------------------------------------------------------------------------
export async function voidTransaction(
  transactionId: string,
  actorId: string,
  reason: string
) {
  const transaction = await db.transaction.findUnique({
    where: { id: transactionId },
  });
  if (!transaction) throw new Error("Transaction not found");
  if (transaction.isVoided) throw new Error("Transaction is already voided");

  // Void the transaction
  const voided = await db.transaction.update({
    where: { id: transactionId },
    data: {
      isVoided: true,
      voidedBy: actorId,
      voidedAt: new Date(),
      voidReason: reason,
    },
  });

  // Reverse the treasury balance effect
  const { type, amount, clubId } = transaction;
  if (type === "BUY_IN" || type === "REBUY" || type === "ADD_ON") {
    // These added money to treasury — reverse by subtracting
    await db.treasuryBalance.update({
      where: { clubId },
      data: { currentBalance: { decrement: amount } },
    });
  } else if (type === "PAYOUT" || type === "EXPENSE") {
    // These subtracted money from treasury — reverse by adding
    await db.treasuryBalance.update({
      where: { clubId },
      data: { currentBalance: { increment: amount } },
    });
  }

  await db.auditLog.create({
    data: {
      clubId,
      actorId,
      action: "VOID",
      entityType: "Transaction",
      entityId: transactionId,
      transactionId,
      previousValue: { type, amount, isVoided: false },
      newValue: { isVoided: true, voidReason: reason },
    },
  });

  return voided;
}

// ---------------------------------------------------------------------------
// getGameSettlement
// ---------------------------------------------------------------------------
export async function getGameSettlement(gameId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      gameSessions: {
        include: {
          person: { select: { id: true, displayName: true, avatarUrl: true } },
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

  const transactions = game.transactions;

  const buyIns = transactions.filter((t) => t.type === "BUY_IN");
  const rebuys = transactions.filter((t) => t.type === "REBUY");
  const addOns = transactions.filter((t) => t.type === "ADD_ON");
  const payouts = transactions.filter((t) => t.type === "PAYOUT");
  const bounties = transactions.filter((t) => t.type === "BOUNTY_COLLECTED");
  const expenses = transactions.filter((t) => t.type === "EXPENSE");

  const totalBuyIns = buyIns.reduce((s, t) => s + t.amount, 0);
  const totalRebuys = rebuys.reduce((s, t) => s + t.amount, 0);
  const totalAddOns = addOns.reduce((s, t) => s + t.amount, 0);
  const totalPayouts = payouts.reduce((s, t) => s + t.amount, 0);
  const totalBounties = bounties.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);

  const moneyIn = totalBuyIns + totalRebuys + totalAddOns;
  const variance = moneyIn - game.prizePool;
  const netPrizePool = game.prizePool - totalExpenses;

  const isBalanced = variance === 0 && totalPayouts === netPrizePool;

  const sessions = game.gameSessions.map((s) => ({
    sessionId: s.id,
    personId: s.personId,
    displayName: s.person.displayName,
    avatarUrl: s.person.avatarUrl,
    buyInPaid: s.buyInPaid,
    rebuys: s.rebuys,
    addOns: s.addOns,
    totalPaid: s.totalPaid,
    payout: s.payout,
    finishPosition: s.finishPosition,
    bountiesWon: s.bountiesWon,
    bountiesLost: s.bountiesLost,
    net: s.payout - s.totalPaid,
  }));

  return {
    gameId: game.id,
    status: game.status,
    financialLockedAt: game.financialLockedAt?.toISOString() ?? null,
    sessions,
    transactionsByType: {
      buyIns: buyIns.map(txSummary),
      rebuys: rebuys.map(txSummary),
      addOns: addOns.map(txSummary),
      payouts: payouts.map(txSummary),
      bounties: bounties.map(txSummary),
      expenses: expenses.map(txSummary),
    },
    prizePool: game.prizePool,
    totalRebuys: game.totalRebuys,
    totalAddOns: game.totalAddOns,
    moneyIn,
    variance,
    netPrizePool,
    totalExpenses,
    totalBounties,
    totalPayouts,
    isBalanced,
  };
}

function txSummary(t: {
  id: string;
  personId: string | null;
  amount: number;
  method: string | null;
  createdAt: Date;
  description: string | null;
}) {
  return {
    id: t.id,
    personId: t.personId,
    amount: t.amount,
    method: t.method,
    description: t.description,
    createdAt: t.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// lockGameFinancials
// ---------------------------------------------------------------------------
export async function lockGameFinancials(gameId: string, actorId: string) {
  const settlement = await getGameSettlement(gameId);
  if (!settlement.isBalanced) {
    throw new Error(
      "Cannot lock financials — settlement is not balanced. " +
        `Variance: ${settlement.variance}, ` +
        `Total payouts: ${settlement.totalPayouts}, ` +
        `Net prize pool: ${settlement.netPrizePool}`
    );
  }

  const game = await db.game.update({
    where: { id: gameId },
    data: { financialLockedAt: new Date() },
  });

  await db.auditLog.create({
    data: {
      clubId: game.clubId,
      actorId,
      action: "APPROVE",
      entityType: "Game",
      entityId: gameId,
      newValue: { financialLockedAt: game.financialLockedAt },
    },
  });

  return game;
}
