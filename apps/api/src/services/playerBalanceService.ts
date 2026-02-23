import { db } from "../../../../packages/db/src/client";

// ---------------------------------------------------------------------------
// getPlayerBalances
// ---------------------------------------------------------------------------
export async function getPlayerBalances(clubId: string) {
  const balances = await db.playerBalance.findMany({
    where: { clubId },
  });

  // Fetch person details
  const personIds = balances.map((b) => b.personId);
  const persons = await db.person.findMany({
    where: { id: { in: personIds } },
    select: { id: true, displayName: true, avatarUrl: true, createdAt: true },
  });
  const personMap = new Map(persons.map((p) => [p.id, p]));

  const now = new Date();
  const enriched = balances
    .map((b) => {
      const person = personMap.get(b.personId);
      const lastSettled = b.lastSettledAt ?? person?.createdAt ?? b.updatedAt;
      const debtAgeDays = Math.floor(
        (now.getTime() - lastSettled.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: b.id,
        personId: b.personId,
        displayName: person?.displayName ?? "Unknown",
        avatarUrl: person?.avatarUrl ?? null,
        balance: b.balance,
        lastSettledAt: b.lastSettledAt?.toISOString() ?? null,
        debtAgeDays,
        absBalance: Math.abs(b.balance),
      };
    })
    .sort((a, b) => b.absBalance - a.absBalance)
    .map(({ absBalance, ...rest }) => rest);

  return enriched;
}

// ---------------------------------------------------------------------------
// requestSettlement
// ---------------------------------------------------------------------------
export async function requestSettlement(clubId: string, personId: string) {
  // Get player's balance and name
  const [balance, person] = await Promise.all([
    db.playerBalance.findUnique({
      where: { clubId_personId: { clubId, personId } },
    }),
    db.person.findUnique({
      where: { id: personId },
      select: { displayName: true },
    }),
  ]);

  const balanceAmount = balance?.balance ?? 0;
  const playerName = person?.displayName ?? "Unknown";

  // Find club members with Accountant role
  const accountants = await db.membership.findMany({
    where: {
      clubId,
      status: "ACTIVE",
      specialRoles: {
        some: {
          customRole: { manageMoney: true },
        },
      },
    },
    select: { personId: true },
  });

  // Also notify OWNER
  const owners = await db.membership.findMany({
    where: { clubId, status: "ACTIVE", systemRole: "OWNER" },
    select: { personId: true },
  });

  const recipientIds = [
    ...new Set([
      ...accountants.map((a) => a.personId),
      ...owners.map((o) => o.personId),
    ]),
  ];

  const notifications = [];
  for (const recipientId of recipientIds) {
    const notification = await db.notification.create({
      data: {
        clubId,
        personId: recipientId,
        type: "SYSTEM",
        channel: "IN_APP",
        title: "Settlement Request",
        body: `${playerName} has requested settlement of their $${Math.abs(balanceAmount).toFixed(2)} balance.`,
        data: { requestingPersonId: personId, balance: balanceAmount },
      },
    });
    notifications.push(notification);
  }

  return { count: notifications.length, notifications };
}

// ---------------------------------------------------------------------------
// confirmSettlement
// ---------------------------------------------------------------------------
export async function confirmSettlement(
  clubId: string,
  personId: string,
  actorId: string,
  amount: number
) {
  const balance = await db.playerBalance.findUnique({
    where: { clubId_personId: { clubId, personId } },
  });

  if (!balance) throw new Error("Player balance not found");

  const transaction = await db.transaction.create({
    data: {
      clubId,
      personId,
      actorId,
      type: "PLAYER_BALANCE_ADJUSTMENT",
      category: "PLAYER_BALANCE",
      amount,
      description: `Settlement — balance adjusted by $${amount}`,
    },
  });

  // If amount equals the full balance, zero it out; otherwise partial settlement
  const newBalance = amount === balance.balance ? 0 : balance.balance - amount;

  const updated = await db.playerBalance.update({
    where: { id: balance.id },
    data: {
      balance: newBalance,
      lastSettledAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      clubId,
      actorId,
      action: "UPDATE",
      entityType: "PlayerBalance",
      entityId: balance.id,
      transactionId: transaction.id,
      previousValue: {
        balance: balance.balance,
        lastSettledAt: balance.lastSettledAt,
      },
      newValue: { balance: newBalance, lastSettledAt: updated.lastSettledAt },
    },
  });

  return {
    id: updated.id,
    personId: updated.personId,
    balance: updated.balance,
    lastSettledAt: updated.lastSettledAt?.toISOString() ?? null,
  };
}
