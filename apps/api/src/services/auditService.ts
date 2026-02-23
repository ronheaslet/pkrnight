import { db } from "../../../../packages/db/src/client";

// ---------------------------------------------------------------------------
// getAuditLog
// ---------------------------------------------------------------------------
export async function getAuditLog(
  clubId: string,
  options: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const {
    entityType,
    entityId,
    actorId,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options;

  const where: any = { clubId };

  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (actorId) where.actorId = actorId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        actor: { select: { id: true, displayName: true } },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    entries: entries.map((e) => ({
      id: e.id,
      actorId: e.actorId,
      actorName: e.actor.displayName,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      transactionId: e.transactionId,
      previousValue: e.previousValue,
      newValue: e.newValue,
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
    limit,
    offset,
  };
}
