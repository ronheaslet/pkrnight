import { Hono } from "hono";
import { createAuthMiddleware, type JWTPayload } from "../lib/auth";
import {
  requireClubMember,
  requireRole,
  requirePermission,
} from "../middleware/permissions";
import {
  getInbox,
  markRead,
  markAllRead,
  getUnreadCount,
  deleteNotification,
} from "../services/inboxService";
import { sendBroadcast, sendGameNightAlert } from "../services/broadcastService";
import {
  getMessages,
  sendMessage,
  pinMessage,
  unpinMessage,
  editMessage,
  deleteMessage,
  makeAnnouncement,
} from "../services/chatService";
import {
  getNetworkForPerson,
  getNetworkStats,
  getSharedHistory,
} from "../services/networkService";
import {
  sendCrossClubInvite,
  getIncomingCrossClubInvites,
} from "../services/crossClubInviteService";
import {
  getMockInbox,
  getMockUnreadCount,
  getMockChatMessages,
  getMockNetwork,
  getMockNetworkStats,
  getMockCrossClubInvites,
} from "../lib/mockData";

export const socialRoutes = new Hono();

// All social routes require auth
socialRoutes.use("*", createAuthMiddleware());

// ============================================================
// INBOX ROUTES
// ============================================================

// GET /inbox
socialRoutes.get("/inbox", async (c) => {
  const user = c.get("user") as JWTPayload;
  const clubId = c.req.query("clubId") || undefined;
  const unreadOnly = c.req.query("unreadOnly") === "true";
  const type = c.req.query("type") || undefined;
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  try {
    const result = await getInbox(user.userId, clubId, {
      unreadOnly,
      type,
      limit,
      offset,
    });
    return c.json(result);
  } catch {
    return c.json(getMockInbox(unreadOnly), 200);
  }
});

// GET /inbox/count
socialRoutes.get("/inbox/count", async (c) => {
  const user = c.get("user") as JWTPayload;
  const clubId = c.req.query("clubId") || undefined;

  try {
    const count = await getUnreadCount(user.userId, clubId);
    return c.json({ unreadCount: count });
  } catch {
    return c.json({ unreadCount: getMockUnreadCount() }, 200);
  }
});

// PATCH /inbox/:notificationId/read
socialRoutes.patch("/inbox/:notificationId/read", async (c) => {
  const user = c.get("user") as JWTPayload;
  const notificationId = c.req.param("notificationId");

  try {
    const notification = await markRead(notificationId, user.userId);
    return c.json(notification);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to mark as read";
    return c.json({ error: message }, 400);
  }
});

// POST /inbox/read-all
socialRoutes.post("/inbox/read-all", async (c) => {
  const user = c.get("user") as JWTPayload;
  const body = await c.req.json().catch(() => ({}));
  const clubId = (body as Record<string, unknown>).clubId as string | undefined;

  try {
    const result = await markAllRead(user.userId, clubId);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to mark all as read";
    return c.json({ error: message }, 400);
  }
});

// DELETE /inbox/:notificationId
socialRoutes.delete("/inbox/:notificationId", async (c) => {
  const user = c.get("user") as JWTPayload;
  const notificationId = c.req.param("notificationId");

  try {
    const result = await deleteNotification(notificationId, user.userId);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete notification";
    return c.json({ error: message }, 400);
  }
});

// ============================================================
// BROADCAST ROUTES
// ============================================================

// POST /clubs/:clubId/broadcast
socialRoutes.post(
  "/clubs/:clubId/broadcast",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const body = await c.req.json();
    const { message, smsAlso } = body as { message: string; smsAlso?: boolean };

    if (!message || message.trim().length === 0) {
      return c.json({ error: "Message is required" }, 400);
    }

    try {
      const result = await sendBroadcast(clubId, user.userId, message, { smsAlso });
      return c.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send broadcast";
      return c.json({ error: msg }, 400);
    }
  }
);

// POST /clubs/:clubId/broadcast/game-night
socialRoutes.post(
  "/clubs/:clubId/broadcast/game-night",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const body = await c.req.json();
    const { message } = body as { message: string };

    if (!message || message.trim().length === 0) {
      return c.json({ error: "Message is required" }, 400);
    }

    try {
      const result = await sendGameNightAlert(clubId, user.userId, message);
      return c.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send alert";
      return c.json({ error: msg }, 400);
    }
  }
);

// ============================================================
// CHAT ROUTES
// ============================================================

// GET /clubs/:clubId/chat
socialRoutes.get("/clubs/:clubId/chat", requireClubMember(), async (c) => {
  const clubId = c.req.param("clubId");
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const before = c.req.query("before") || undefined;
  const after = c.req.query("after") || undefined;

  try {
    const messages = await getMessages(clubId, { limit, before, after });
    return c.json(messages);
  } catch {
    if (clubId === "mock-club-001") {
      return c.json(getMockChatMessages(), 200);
    }
    return c.json([], 200);
  }
});

// POST /clubs/:clubId/chat
socialRoutes.post("/clubs/:clubId/chat", requireClubMember(), async (c) => {
  const user = c.get("user") as JWTPayload;
  const clubId = c.req.param("clubId");
  const { body } = (await c.req.json()) as { body: string };

  try {
    const message = await sendMessage(clubId, user.userId, body);
    return c.json(message, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send message";
    return c.json({ error: msg }, 400);
  }
});

// PATCH /clubs/:clubId/chat/:messageId/pin
socialRoutes.patch(
  "/clubs/:clubId/chat/:messageId/pin",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const messageId = c.req.param("messageId");

    try {
      const message = await pinMessage(messageId, clubId, user.userId);
      return c.json(message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to pin message";
      return c.json({ error: msg }, 400);
    }
  }
);

// DELETE /clubs/:clubId/chat/:messageId/pin
socialRoutes.delete(
  "/clubs/:clubId/chat/:messageId/pin",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const messageId = c.req.param("messageId");

    try {
      const message = await unpinMessage(messageId, clubId, user.userId);
      return c.json(message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unpin message";
      return c.json({ error: msg }, 400);
    }
  }
);

// PATCH /clubs/:clubId/chat/:messageId
socialRoutes.patch("/clubs/:clubId/chat/:messageId", requireClubMember(), async (c) => {
  const user = c.get("user") as JWTPayload;
  const messageId = c.req.param("messageId");
  const { body } = (await c.req.json()) as { body: string };

  try {
    const message = await editMessage(messageId, user.userId, body);
    return c.json(message);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to edit message";
    return c.json({ error: msg }, 400);
  }
});

// DELETE /clubs/:clubId/chat/:messageId
socialRoutes.delete(
  "/clubs/:clubId/chat/:messageId",
  requireClubMember(),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const messageId = c.req.param("messageId");

    try {
      const result = await deleteMessage(messageId, user.userId, clubId);
      return c.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete message";
      return c.json({ error: msg }, 400);
    }
  }
);

// POST /clubs/:clubId/chat/:messageId/announce
socialRoutes.post(
  "/clubs/:clubId/chat/:messageId/announce",
  requireClubMember(),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const messageId = c.req.param("messageId");

    try {
      const message = await makeAnnouncement(messageId, clubId, user.userId);
      return c.json(message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to make announcement";
      const status = (err as { status?: number }).status === 403 ? 403 : 400;
      return c.json({ error: msg }, status);
    }
  }
);

// ============================================================
// NETWORK ROUTES
// ============================================================

// GET /network
socialRoutes.get("/network", async (c) => {
  const user = c.get("user") as JWTPayload;
  const depthParam = c.req.query("depth");
  const depth = depthParam === "2" ? 2 : 1;

  try {
    const network = await getNetworkForPerson(user.userId, { depth });
    return c.json(network);
  } catch {
    return c.json(getMockNetwork(depth as 1 | 2), 200);
  }
});

// GET /network/stats
socialRoutes.get("/network/stats", async (c) => {
  const user = c.get("user") as JWTPayload;

  try {
    const stats = await getNetworkStats(user.userId);
    return c.json(stats);
  } catch {
    return c.json(getMockNetworkStats(), 200);
  }
});

// GET /network/:personId/shared
socialRoutes.get("/network/:personId/shared", async (c) => {
  const user = c.get("user") as JWTPayload;
  const personId = c.req.param("personId");

  try {
    const shared = await getSharedHistory(user.userId, personId);
    return c.json(shared);
  } catch {
    return c.json(
      { gamesShared: 0, firstPlayedAt: null, lastPlayedAt: null, recentGames: [] },
      200
    );
  }
});

// ============================================================
// CROSS-CLUB INVITE ROUTES
// ============================================================

// POST /invites/cross-club
socialRoutes.post("/invites/cross-club", async (c) => {
  const user = c.get("user") as JWTPayload;
  const body = await c.req.json();
  const { toPersonId, eventId, message } = body as {
    toPersonId: string;
    eventId: string;
    message?: string;
  };

  if (!toPersonId || !eventId) {
    return c.json({ error: "toPersonId and eventId are required" }, 400);
  }

  try {
    const notification = await sendCrossClubInvite(
      user.userId,
      toPersonId,
      eventId,
      message
    );
    return c.json(notification, 201);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 400;
    const msg = err instanceof Error ? err.message : "Failed to send invite";
    return c.json({ error: msg }, status as 403 | 400);
  }
});

// GET /invites/incoming
socialRoutes.get("/invites/incoming", async (c) => {
  const user = c.get("user") as JWTPayload;

  try {
    const invites = await getIncomingCrossClubInvites(user.userId);
    return c.json(invites);
  } catch {
    return c.json(getMockCrossClubInvites(), 200);
  }
});
