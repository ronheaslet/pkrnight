import { db } from "../../../../packages/db/src/client";

// ---------------------------------------------------------------------------
// createDuesForSeason
// ---------------------------------------------------------------------------
export async function createDuesForSeason(
  clubId: string,
  seasonId: string,
  amountDue: number,
  actorId: string
) {
  // Get all ACTIVE members in the club
  const memberships = await db.membership.findMany({
    where: { clubId, status: "ACTIVE" },
    select: { personId: true },
  });

  if (memberships.length === 0) {
    return { count: 0 };
  }

  const result = await db.duesRecord.createMany({
    data: memberships.map((m) => ({
      clubId,
      personId: m.personId,
      seasonId,
      amountDue,
    })),
    skipDuplicates: true,
  });

  await db.auditLog.create({
    data: {
      clubId,
      actorId,
      action: "CREATE",
      entityType: "DuesRecord",
      entityId: seasonId,
      newValue: { seasonId, amountDue, memberCount: result.count },
    },
  });

  return { count: result.count };
}

// ---------------------------------------------------------------------------
// recordDuesPayment
// ---------------------------------------------------------------------------
export async function recordDuesPayment(
  clubId: string,
  personId: string,
  seasonId: string,
  amount: number,
  method: string,
  collectedBy: string
) {
  const record = await db.duesRecord.findUnique({
    where: { clubId_personId_seasonId: { clubId, personId, seasonId } },
  });
  if (!record) throw new Error("Dues record not found for this member and season");

  const newAmountPaid = record.amountPaid + amount;
  const isPaid = newAmountPaid >= record.amountDue;

  const updated = await db.duesRecord.update({
    where: { id: record.id },
    data: {
      amountPaid: newAmountPaid,
      method,
      collectedBy,
      isPaid,
      paidAt: isPaid ? new Date() : record.paidAt,
    },
  });

  // Create transaction for the payment
  await db.transaction.create({
    data: {
      clubId,
      personId,
      seasonId,
      actorId: collectedBy,
      type: "DUES_PAYMENT",
      category: "DUES",
      amount,
      method,
      description: `Dues payment — season`,
    },
  });

  // Update treasury
  await db.treasuryBalance.upsert({
    where: { clubId },
    update: { currentBalance: { increment: amount } },
    create: { clubId, currentBalance: amount, minimumReserve: 0 },
  });

  await db.auditLog.create({
    data: {
      clubId,
      actorId: collectedBy,
      action: "UPDATE",
      entityType: "DuesRecord",
      entityId: record.id,
      previousValue: {
        amountPaid: record.amountPaid,
        isPaid: record.isPaid,
      },
      newValue: { amountPaid: newAmountPaid, isPaid, paymentAmount: amount },
    },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// getDuesStatus
// ---------------------------------------------------------------------------
export async function getDuesStatus(clubId: string, seasonId: string) {
  const records = await db.duesRecord.findMany({
    where: { clubId, seasonId },
    include: {
      // No person relation on DuesRecord, so we query separately
    },
    orderBy: { createdAt: "asc" },
  });

  // Fetch person names for all personIds
  const personIds = records.map((r) => r.personId);
  const persons = await db.person.findMany({
    where: { id: { in: personIds } },
    select: { id: true, displayName: true, avatarUrl: true },
  });
  const personMap = new Map(persons.map((p) => [p.id, p]));

  const enriched = records.map((r) => {
    const person = personMap.get(r.personId);
    return {
      id: r.id,
      personId: r.personId,
      displayName: person?.displayName ?? "Unknown",
      avatarUrl: person?.avatarUrl ?? null,
      amountDue: r.amountDue,
      amountPaid: r.amountPaid,
      remaining: Math.max(0, r.amountDue - r.amountPaid),
      isPaid: r.isPaid,
      paidAt: r.paidAt?.toISOString() ?? null,
      method: r.method,
    };
  });

  const totalExpected = records.reduce((s, r) => s + r.amountDue, 0);
  const totalCollected = records.reduce((s, r) => s + r.amountPaid, 0);
  const paidCount = records.filter((r) => r.isPaid).length;
  const outstandingCount = records.filter((r) => !r.isPaid).length;

  return {
    seasonId,
    records: enriched,
    summary: {
      totalExpected,
      totalCollected,
      outstanding: totalExpected - totalCollected,
      paidCount,
      outstandingCount,
      totalMembers: records.length,
    },
  };
}

// ---------------------------------------------------------------------------
// sendDuesReminders
// ---------------------------------------------------------------------------
export async function sendDuesReminders(clubId: string, seasonId: string) {
  const unpaid = await db.duesRecord.findMany({
    where: { clubId, seasonId, isPaid: false },
  });

  if (unpaid.length === 0) return { count: 0 };

  let count = 0;
  for (const record of unpaid) {
    const remaining = Math.max(0, record.amountDue - record.amountPaid);
    await db.notification.create({
      data: {
        clubId,
        personId: record.personId,
        type: "DUES_REMINDER",
        channel: "IN_APP",
        title: "Season Dues Reminder",
        body: `Season dues of $${record.amountDue} are due. You've paid $${record.amountPaid}. Balance: $${remaining}.`,
      },
    });
    count++;
  }

  return { count };
}
