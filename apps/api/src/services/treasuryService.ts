import { db } from "../../../../packages/db/src/client";

// ---------------------------------------------------------------------------
// getTreasuryBalance
// ---------------------------------------------------------------------------
export async function getTreasuryBalance(clubId: string) {
  const treasury = await db.treasuryBalance.findUnique({
    where: { clubId },
  });

  if (!treasury) {
    return {
      clubId,
      currentBalance: 0,
      minimumReserve: 0,
      isLow: false,
      updatedAt: null,
    };
  }

  return {
    clubId: treasury.clubId,
    currentBalance: treasury.currentBalance,
    minimumReserve: treasury.minimumReserve,
    isLow: treasury.currentBalance < treasury.minimumReserve,
    updatedAt: treasury.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// getTreasuryLedger
// ---------------------------------------------------------------------------
export async function getTreasuryLedger(
  clubId: string,
  options: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  } = {}
) {
  const { limit = 50, offset = 0, startDate, endDate } = options;

  const where: any = {
    clubId,
    isVoided: false,
    type: { not: "PLAYER_BALANCE_ADJUSTMENT" },
  };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.transaction.count({ where }),
  ]);

  // Fetch actor names
  const actorIds = [...new Set(transactions.map((t) => t.actorId))];
  const actors = await db.person.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, displayName: true },
  });
  const actorMap = new Map(actors.map((a) => [a.id, a.displayName]));

  // Calculate running balance: get all transactions from oldest to current for running balance
  // For efficiency, only compute running balances for the visible page
  const allPriorCount = await db.transaction.count({
    where: {
      clubId,
      isVoided: false,
      type: { not: "PLAYER_BALANCE_ADJUSTMENT" },
      createdAt: {
        lt: transactions.length > 0 ? transactions[transactions.length - 1]!.createdAt : new Date(),
      },
    },
  });

  // Get the treasury's current balance and work backwards
  const treasury = await db.treasuryBalance.findUnique({
    where: { clubId },
  });
  const currentBalance = treasury?.currentBalance ?? 0;

  // For running balance, we sum all transactions after the visible page
  // to determine the balance at the top of this page
  const laterTransactions = await db.transaction.findMany({
    where: {
      clubId,
      isVoided: false,
      type: { not: "PLAYER_BALANCE_ADJUSTMENT" },
      createdAt: {
        gt: transactions.length > 0 ? transactions[0]!.createdAt : new Date(),
      },
    },
    select: { type: true, amount: true },
  });

  let runningBalance = currentBalance;
  for (const t of laterTransactions) {
    if (isCreditType(t.type)) {
      runningBalance -= t.amount;
    } else {
      runningBalance += t.amount;
    }
  }

  const entries = transactions.map((t) => {
    const entry = {
      id: t.id,
      date: t.createdAt.toISOString(),
      type: t.type,
      category: t.category,
      amount: t.amount,
      description: t.description,
      method: t.method,
      actorName: actorMap.get(t.actorId) ?? "Unknown",
      runningBalance,
    };

    // Move backwards through time
    if (isCreditType(t.type)) {
      runningBalance -= t.amount;
    } else {
      runningBalance += t.amount;
    }

    return entry;
  });

  return {
    entries,
    total,
    limit,
    offset,
  };
}

function isCreditType(type: string): boolean {
  return ["BUY_IN", "REBUY", "ADD_ON", "DUES_PAYMENT", "TREASURY_ADJUSTMENT"].includes(type)
    ? type !== "TREASURY_ADJUSTMENT" || false
    : false;
  // Simplified: types that add money to treasury
}

// Better approach — clear mapping
function treasuryEffect(type: string, amount: number): number {
  switch (type) {
    case "BUY_IN":
    case "REBUY":
    case "ADD_ON":
    case "DUES_PAYMENT":
      return amount; // credits
    case "PAYOUT":
    case "EXPENSE":
      return -amount; // debits
    case "TREASURY_ADJUSTMENT":
      return amount; // can be positive or negative
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// updateMinimumReserve
// ---------------------------------------------------------------------------
export async function updateMinimumReserve(
  clubId: string,
  amount: number,
  actorId: string
) {
  const treasury = await db.treasuryBalance.upsert({
    where: { clubId },
    update: { minimumReserve: amount },
    create: { clubId, currentBalance: 0, minimumReserve: amount },
  });

  await db.auditLog.create({
    data: {
      clubId,
      actorId,
      action: "UPDATE",
      entityType: "TreasuryBalance",
      entityId: treasury.id,
      newValue: { minimumReserve: amount },
    },
  });

  return {
    clubId: treasury.clubId,
    currentBalance: treasury.currentBalance,
    minimumReserve: treasury.minimumReserve,
    isLow: treasury.currentBalance < treasury.minimumReserve,
    updatedAt: treasury.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// recordTreasuryAdjustment
// ---------------------------------------------------------------------------
export async function recordTreasuryAdjustment(
  clubId: string,
  actorId: string,
  amount: number,
  description: string
) {
  if (!description || description.trim().length === 0) {
    throw new Error("Description is required for treasury adjustments");
  }

  const transaction = await db.transaction.create({
    data: {
      clubId,
      actorId,
      type: "TREASURY_ADJUSTMENT",
      category: "TREASURY",
      amount,
      description,
    },
  });

  // Amount can be positive (add funds) or negative (withdraw)
  await db.treasuryBalance.upsert({
    where: { clubId },
    update: { currentBalance: { increment: amount } },
    create: { clubId, currentBalance: amount, minimumReserve: 0 },
  });

  await db.auditLog.create({
    data: {
      clubId,
      actorId,
      action: "CREATE",
      entityType: "Transaction",
      entityId: transaction.id,
      transactionId: transaction.id,
      note: description,
      newValue: { type: "TREASURY_ADJUSTMENT", amount, description },
    },
  });

  return transaction;
}
