import { db } from "../../../../packages/db/src/client";

// ────────────────────────────────────────────────────────────
// getInbox
// ────────────────────────────────────────────────────────────

export async function getInbox(
  personId: string,
  clubId?: string,
  options: {
    unreadOnly?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { unreadOnly, type, limit = 50, offset = 0 } = options;

  const where: Record<string, unknown> = { personId };

  if (clubId) {
    // Show notifications for this club + global (null clubId)
    where.OR = [{ clubId }, { clubId: null }];
  }

  if (unreadOnly) {
    where.isRead = false;
  }

  if (type) {
    where.type = type;
  }

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        data: true,
        isRead: true,
        createdAt: true,
        clubId: true,
      },
    }),
    db.notification.count({
      where: { personId, isRead: false, ...(clubId ? { OR: [{ clubId }, { clubId: null }] } : {}) },
    }),
  ]);

  return { notifications, unreadCount };
}

// ────────────────────────────────────────────────────────────
// markRead
// ────────────────────────────────────────────────────────────

export async function markRead(notificationId: string, personId: string) {
  const notification = await db.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.personId !== personId) {
    throw new Error("Notification not found");
  }

  return db.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}

// ────────────────────────────────────────────────────────────
// markAllRead
// ────────────────────────────────────────────────────────────

export async function markAllRead(personId: string, clubId?: string) {
  const where: Record<string, unknown> = { personId, isRead: false };

  if (clubId) {
    where.OR = [{ clubId }, { clubId: null }];
  }

  const result = await db.notification.updateMany({
    where,
    data: { isRead: true, readAt: new Date() },
  });

  return { updated: result.count };
}

// ────────────────────────────────────────────────────────────
// getUnreadCount
// ────────────────────────────────────────────────────────────

export async function getUnreadCount(personId: string, clubId?: string) {
  const where: Record<string, unknown> = { personId, isRead: false };

  if (clubId) {
    where.OR = [{ clubId }, { clubId: null }];
  }

  return db.notification.count({ where });
}

// ────────────────────────────────────────────────────────────
// deleteNotification
// ────────────────────────────────────────────────────────────

export async function deleteNotification(notificationId: string, personId: string) {
  const notification = await db.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.personId !== personId) {
    throw new Error("Notification not found");
  }

  await db.notification.delete({ where: { id: notificationId } });
  return { deleted: true };
}
