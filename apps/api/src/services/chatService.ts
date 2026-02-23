import { db } from "../../../../packages/db/src/client";
import { createBulkNotifications } from "./notificationService";

// ────────────────────────────────────────────────────────────
// getMessages
// ────────────────────────────────────────────────────────────

export async function getMessages(
  clubId: string,
  options: { limit?: number; before?: string; after?: string } = {}
) {
  const { limit = 50, before, after } = options;

  // Always fetch pinned messages separately so they come first
  const pinnedMessages = await db.chatMessage.findMany({
    where: { clubId, deletedAt: null, isPinned: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      body: true,
      personId: true,
      person: { select: { displayName: true, avatarUrl: true } },
      isAnnouncement: true,
      isPinned: true,
      editedAt: true,
      createdAt: true,
    },
  });

  // Build cursor filter for regular (non-pinned) messages
  const where: Record<string, unknown> = {
    clubId,
    deletedAt: null,
    isPinned: false,
  };

  if (before) {
    where.createdAt = { lt: new Date(before) };
  } else if (after) {
    where.createdAt = { gt: new Date(after) };
  }

  const regularMessages = await db.chatMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      body: true,
      personId: true,
      person: { select: { displayName: true, avatarUrl: true } },
      isAnnouncement: true,
      isPinned: true,
      editedAt: true,
      createdAt: true,
    },
  });

  // Pinned first, then regular messages
  return [...pinnedMessages, ...regularMessages];
}

// ────────────────────────────────────────────────────────────
// sendMessage
// ────────────────────────────────────────────────────────────

export async function sendMessage(clubId: string, personId: string, body: string) {
  // Verify person is ACTIVE member
  const membership = await db.membership.findUnique({
    where: { clubId_personId: { clubId, personId } },
    select: { status: true },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new Error("Must be an active club member to send messages");
  }

  // Validate body
  if (!body || body.trim().length === 0) {
    throw new Error("Message body cannot be empty");
  }
  if (body.length > 1000) {
    throw new Error("Message body cannot exceed 1000 characters");
  }

  const message = await db.chatMessage.create({
    data: { clubId, personId, body: body.trim() },
    select: {
      id: true,
      body: true,
      personId: true,
      person: { select: { displayName: true, avatarUrl: true } },
      isAnnouncement: true,
      isPinned: true,
      editedAt: true,
      createdAt: true,
    },
  });

  return message;
}

// ────────────────────────────────────────────────────────────
// pinMessage / unpinMessage
// ────────────────────────────────────────────────────────────

export async function pinMessage(messageId: string, clubId: string, actorId: string) {
  await verifyAdminRole(clubId, actorId);
  await verifyMessageInClub(messageId, clubId);

  return db.chatMessage.update({
    where: { id: messageId },
    data: { isPinned: true },
    select: {
      id: true,
      body: true,
      personId: true,
      person: { select: { displayName: true, avatarUrl: true } },
      isAnnouncement: true,
      isPinned: true,
      editedAt: true,
      createdAt: true,
    },
  });
}

export async function unpinMessage(messageId: string, clubId: string, actorId: string) {
  await verifyAdminRole(clubId, actorId);
  await verifyMessageInClub(messageId, clubId);

  return db.chatMessage.update({
    where: { id: messageId },
    data: { isPinned: false },
    select: {
      id: true,
      body: true,
      personId: true,
      person: { select: { displayName: true, avatarUrl: true } },
      isAnnouncement: true,
      isPinned: true,
      editedAt: true,
      createdAt: true,
    },
  });
}

// ────────────────────────────────────────────────────────────
// editMessage
// ────────────────────────────────────────────────────────────

export async function editMessage(messageId: string, personId: string, newBody: string) {
  const message = await db.chatMessage.findUnique({
    where: { id: messageId },
    select: { personId: true, createdAt: true, deletedAt: true },
  });

  if (!message || message.deletedAt) {
    throw new Error("Message not found");
  }

  if (message.personId !== personId) {
    throw new Error("Can only edit your own messages");
  }

  // Cannot edit messages older than 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  if (message.createdAt < fifteenMinutesAgo) {
    throw new Error("Cannot edit messages older than 15 minutes");
  }

  if (!newBody || newBody.trim().length === 0) {
    throw new Error("Message body cannot be empty");
  }
  if (newBody.length > 1000) {
    throw new Error("Message body cannot exceed 1000 characters");
  }

  return db.chatMessage.update({
    where: { id: messageId },
    data: { body: newBody.trim(), editedAt: new Date() },
    select: {
      id: true,
      body: true,
      personId: true,
      person: { select: { displayName: true, avatarUrl: true } },
      isAnnouncement: true,
      isPinned: true,
      editedAt: true,
      createdAt: true,
    },
  });
}

// ────────────────────────────────────────────────────────────
// deleteMessage
// ────────────────────────────────────────────────────────────

export async function deleteMessage(messageId: string, actorId: string, clubId: string) {
  const message = await db.chatMessage.findUnique({
    where: { id: messageId },
    select: { personId: true, clubId: true, deletedAt: true },
  });

  if (!message || message.deletedAt || message.clubId !== clubId) {
    throw new Error("Message not found");
  }

  // Person can delete own messages; OWNER/ADMIN can delete any
  if (message.personId !== actorId) {
    await verifyAdminRole(clubId, actorId);
  }

  await db.chatMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  });

  return { deleted: true };
}

// ────────────────────────────────────────────────────────────
// makeAnnouncement
// ────────────────────────────────────────────────────────────

export async function makeAnnouncement(messageId: string, clubId: string, actorId: string) {
  // Verify OWNER/ADMIN or makeAnnouncements permission
  const membership = await db.membership.findUnique({
    where: { clubId_personId: { clubId, personId: actorId } },
    include: {
      specialRoles: {
        include: { customRole: { select: { makeAnnouncements: true } } },
      },
    },
  });

  if (!membership) throw new Error("Not a member of this club");

  const isAdminOrOwner = ["OWNER", "ADMIN"].includes(membership.systemRole);
  const hasPermission = membership.specialRoles.some(
    (sr) => sr.customRole.makeAnnouncements
  );

  if (!isAdminOrOwner && !hasPermission) {
    throw new Error("Only OWNER, ADMIN, or members with makeAnnouncements permission can promote messages");
  }

  await verifyMessageInClub(messageId, clubId);

  const updated = await db.chatMessage.update({
    where: { id: messageId },
    data: { isAnnouncement: true },
    select: {
      id: true,
      body: true,
      personId: true,
      person: { select: { displayName: true, avatarUrl: true } },
      isAnnouncement: true,
      isPinned: true,
      editedAt: true,
      createdAt: true,
    },
  });

  // Create notification for all members
  const activeMembers = await db.membership.findMany({
    where: { clubId, status: "ACTIVE" },
    select: { personId: true },
  });

  const truncatedBody =
    updated.body.length > 100 ? updated.body.slice(0, 100) + "…" : updated.body;

  await createBulkNotifications(
    activeMembers.map((m) => m.personId),
    {
      clubId,
      type: "ANNOUNCEMENT",
      title: "📢 Announcement",
      body: truncatedBody,
      data: { chatMessageId: messageId },
    }
  );

  return updated;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

async function verifyAdminRole(clubId: string, personId: string) {
  const membership = await db.membership.findUnique({
    where: { clubId_personId: { clubId, personId } },
    select: { systemRole: true },
  });

  if (!membership || !["OWNER", "ADMIN"].includes(membership.systemRole)) {
    throw new Error("Only OWNER or ADMIN can perform this action");
  }
}

async function verifyMessageInClub(messageId: string, clubId: string) {
  const message = await db.chatMessage.findUnique({
    where: { id: messageId },
    select: { clubId: true, deletedAt: true },
  });

  if (!message || message.deletedAt || message.clubId !== clubId) {
    throw new Error("Message not found in this club");
  }
}
