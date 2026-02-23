import { Hono } from "hono";
import { createAuthMiddleware } from "../lib/auth";
import type { JWTPayload } from "../lib/auth";
import { requireRole, requireClubMember } from "../middleware/permissions";
import * as eventService from "../services/eventService";
import * as rsvpService from "../services/rsvpService";
import * as inviteService from "../services/inviteService";
import {
  getMockEvents,
  getMockRsvps,
  getMockUpcomingWithRsvp,
  getMockPayoutStructure,
  getMockSavedLocations,
  getMockGuestRsvpPage,
} from "../lib/mockData";

// ────────────────────────────────────────────────────────────
// Event routes (require auth)
// ────────────────────────────────────────────────────────────

export const eventRoutes = new Hono();
eventRoutes.use("*", createAuthMiddleware());

// POST /events — Create event
eventRoutes.post("/", async (c) => {
  const user = c.get("user") as JWTPayload;
  if (
    !user.roles.includes("OWNER") &&
    !user.roles.includes("ADMIN") &&
    !user.isSuperAdmin
  ) {
    return c.json({ error: "forbidden" }, 403);
  }

  const body = await c.req.json();
  if (!body.clubId) {
    return c.json({ error: "clubId is required" }, 400);
  }

  try {
    const event = await eventService.createEvent(body.clubId, body, user.userId);
    return c.json(event, 201);
  } catch (err: any) {
    if (err.message?.includes("not found")) {
      return c.json({ error: err.message }, 404);
    }
    // DB unavailable — return mock
    console.error("createEvent error:", err.message);
    const mock = getMockEvents()[1]; // return the DRAFT one
    c.header("X-Mock-Data", "true");
    return c.json(mock, 201);
  }
});

// GET /events/:eventId — Get event detail
eventRoutes.get("/:eventId", async (c) => {
  const { eventId } = c.req.param();

  try {
    const event = await eventService.getEvent(eventId);
    if (!event) return c.json({ error: "Event not found" }, 404);
    return c.json(event);
  } catch {
    // Mock fallback
    const mock = getMockEvents().find((e) => e.id === eventId) ?? getMockEvents()[0];
    c.header("X-Mock-Data", "true");
    return c.json(mock);
  }
});

// PATCH /events/:eventId — Update event
eventRoutes.patch("/:eventId", async (c) => {
  const user = c.get("user") as JWTPayload;
  if (
    !user.roles.includes("OWNER") &&
    !user.roles.includes("ADMIN") &&
    !user.isSuperAdmin
  ) {
    return c.json({ error: "forbidden" }, 403);
  }

  const { eventId } = c.req.param();
  const body = await c.req.json();

  try {
    const event = await eventService.updateEvent(eventId, body, user.userId);
    return c.json(event);
  } catch (err: any) {
    if (err.message?.includes("Cannot update")) {
      return c.json({ error: err.message }, 400);
    }
    console.error("updateEvent error:", err.message);
    c.header("X-Mock-Data", "true");
    return c.json(getMockEvents()[0]);
  }
});

// POST /events/:eventId/publish — Publish event
eventRoutes.post("/:eventId/publish", async (c) => {
  const user = c.get("user") as JWTPayload;
  if (
    !user.roles.includes("OWNER") &&
    !user.roles.includes("ADMIN") &&
    !user.isSuperAdmin
  ) {
    return c.json({ error: "forbidden" }, 403);
  }

  const { eventId } = c.req.param();

  try {
    const event = await eventService.publishEvent(eventId, user.userId);
    return c.json(event);
  } catch (err: any) {
    if (err.message?.includes("Only DRAFT")) {
      return c.json({ error: err.message }, 400);
    }
    console.error("publishEvent error:", err.message);
    c.header("X-Mock-Data", "true");
    return c.json({ ...getMockEvents()[0], status: "PUBLISHED" });
  }
});

// POST /events/:eventId/cancel — Cancel event
eventRoutes.post("/:eventId/cancel", async (c) => {
  const user = c.get("user") as JWTPayload;
  if (
    !user.roles.includes("OWNER") &&
    !user.roles.includes("ADMIN") &&
    !user.isSuperAdmin
  ) {
    return c.json({ error: "forbidden" }, 403);
  }

  const { eventId } = c.req.param();
  const body = await c.req.json().catch(() => ({}));

  try {
    const event = await eventService.cancelEvent(
      eventId,
      user.userId,
      body.reason
    );
    return c.json(event);
  } catch (err: any) {
    if (
      err.message?.includes("Cannot cancel") ||
      err.message?.includes("active game")
    ) {
      return c.json({ error: err.message }, 400);
    }
    console.error("cancelEvent error:", err.message);
    c.header("X-Mock-Data", "true");
    return c.json({ ...getMockEvents()[0], status: "CANCELLED" });
  }
});

// PATCH /events/:eventId/rsvp — Update current user's RSVP
eventRoutes.patch("/:eventId/rsvp", async (c) => {
  const user = c.get("user") as JWTPayload;
  const { eventId } = c.req.param();
  const body = await c.req.json();

  if (!body.status) {
    return c.json({ error: "status is required" }, 400);
  }

  try {
    const rsvp = await rsvpService.updateRsvp(eventId, user.userId, body.status);
    return c.json(rsvp);
  } catch (err: any) {
    console.error("updateRsvp error:", err.message);
    c.header("X-Mock-Data", "true");
    return c.json({
      id: "mock-rsvp-updated",
      eventId,
      status: body.status,
      respondedAt: new Date().toISOString(),
    });
  }
});

// GET /events/:eventId/rsvps — Get RSVPs for event
eventRoutes.get("/:eventId/rsvps", async (c) => {
  const { eventId } = c.req.param();

  try {
    const grouped = await rsvpService.getRsvpsForEvent(eventId);
    return c.json(grouped);
  } catch {
    c.header("X-Mock-Data", "true");
    return c.json(getMockRsvps(eventId));
  }
});

// POST /events/:eventId/invite-members — Send member invites
eventRoutes.post("/:eventId/invite-members", async (c) => {
  const user = c.get("user") as JWTPayload;
  if (
    !user.roles.includes("OWNER") &&
    !user.roles.includes("ADMIN") &&
    !user.isSuperAdmin
  ) {
    return c.json({ error: "forbidden" }, 403);
  }

  const { eventId } = c.req.param();

  try {
    const result = await inviteService.sendMemberInvites(eventId, user.userId);
    return c.json(result);
  } catch (err: any) {
    console.error("sendMemberInvites error:", err.message);
    c.header("X-Mock-Data", "true");
    return c.json({ sent: 6, failed: 0 });
  }
});

// POST /events/:eventId/invite-guest — Send guest invite
eventRoutes.post("/:eventId/invite-guest", async (c) => {
  const user = c.get("user") as JWTPayload;
  if (
    !user.roles.includes("OWNER") &&
    !user.roles.includes("ADMIN") &&
    !user.isSuperAdmin
  ) {
    return c.json({ error: "forbidden" }, 403);
  }

  const { eventId } = c.req.param();
  const body = await c.req.json();

  if (!body.phone || !body.name) {
    return c.json({ error: "phone and name are required" }, 400);
  }

  try {
    const result = await inviteService.sendGuestInvite(
      eventId,
      body.phone,
      body.name,
      user.userId
    );
    return c.json(result);
  } catch (err: any) {
    console.error("sendGuestInvite error:", err.message);
    c.header("X-Mock-Data", "true");
    const mockToken = "mock-guest-" + Date.now();
    return c.json({
      guestToken: mockToken,
      inviteUrl: `pkrnight.com/rsvp/guest/${mockToken}`,
    });
  }
});

// GET /events/:eventId/ics — Download .ics calendar file
eventRoutes.get("/:eventId/ics", async (c) => {
  const { eventId } = c.req.param();

  try {
    const icsContent = await inviteService.generateIcsFile(eventId);
    c.header("Content-Type", "text/calendar; charset=utf-8");
    c.header(
      "Content-Disposition",
      `attachment; filename="event-${eventId}.ics"`
    );
    return c.body(icsContent);
  } catch {
    // Generate mock ICS
    const event = getMockEvents()[0]!;
    const dtStart = new Date(event.startsAt)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
    const dtEnd = new Date(
      new Date(event.startsAt).getTime() + 4 * 60 * 60 * 1000
    )
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//PKR Night//Events//EN",
      "BEGIN:VEVENT",
      `UID:${eventId}@pkrnight.com`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${event.title}`,
      `LOCATION:${event.savedLocation?.address ?? ""}`,
      `DESCRIPTION:Buy-in: $${event.buyInAmount}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    c.header("X-Mock-Data", "true");
    c.header("Content-Type", "text/calendar; charset=utf-8");
    c.header(
      "Content-Disposition",
      `attachment; filename="event-${eventId}.ics"`
    );
    return c.body(ics);
  }
});

// GET /events/:eventId/payout-structure — Payout breakdown
eventRoutes.get("/:eventId/payout-structure", async (c) => {
  const { eventId } = c.req.param();
  const playerCount = parseInt(c.req.query("playerCount") ?? "9", 10);

  try {
    const event = await eventService.getEvent(eventId);
    const prizePool = event?.buyInAmount
      ? event.buyInAmount * playerCount
      : 50 * playerCount;
    const payout = eventService.getPayoutStructure(prizePool, playerCount);
    return c.json({ prizePool, playerCount, payout });
  } catch {
    const prizePool = 50 * playerCount;
    const payout = getMockPayoutStructure(playerCount);
    c.header("X-Mock-Data", "true");
    return c.json({ prizePool, playerCount, payout });
  }
});

// ────────────────────────────────────────────────────────────
// Club-scoped event routes (require auth + club membership)
// ────────────────────────────────────────────────────────────

export const clubEventRoutes = new Hono();
clubEventRoutes.use("*", createAuthMiddleware());

// GET /clubs/:clubId/events — List club events
clubEventRoutes.get("/:clubId/events", requireClubMember(), async (c) => {
  const clubId = c.req.param("clubId");
  const status = c.req.query("status");
  const upcoming = c.req.query("upcoming") !== "false";
  const limit = parseInt(c.req.query("limit") ?? "20", 10);
  const offset = parseInt(c.req.query("offset") ?? "0", 10);

  try {
    const events = await eventService.getClubEvents(clubId, {
      status,
      upcoming,
      limit,
      offset,
    });
    return c.json(events);
  } catch {
    const mock = getMockEvents().filter((e) => e.clubId === clubId);
    c.header("X-Mock-Data", "true");
    return c.json(mock);
  }
});

// GET /clubs/:clubId/events/upcoming — Upcoming events with user's RSVP
clubEventRoutes.get(
  "/:clubId/events/upcoming",
  requireClubMember(),
  async (c) => {
    const clubId = c.req.param("clubId");
    const user = c.get("user") as JWTPayload;

    try {
      const events = await eventService.getUpcomingWithRsvp(
        clubId,
        user.userId
      );
      return c.json(events);
    } catch {
      c.header("X-Mock-Data", "true");
      return c.json(getMockUpcomingWithRsvp());
    }
  }
);

// POST /clubs/:clubId/locations — Create saved location
clubEventRoutes.post(
  "/:clubId/locations",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const clubId = c.req.param("clubId");
    const user = c.get("user") as JWTPayload;
    const body = await c.req.json();

    if (!body.name || !body.address) {
      return c.json({ error: "name and address are required" }, 400);
    }

    try {
      const location = await eventService.createSavedLocation(
        clubId,
        body,
        user.userId
      );
      return c.json(location, 201);
    } catch (err: any) {
      console.error("createSavedLocation error:", err.message);
      c.header("X-Mock-Data", "true");
      return c.json(
        {
          id: "mock-location-new",
          clubId,
          name: body.name,
          address: body.address,
          lat: body.lat ?? null,
          lng: body.lng ?? null,
          createdAt: new Date().toISOString(),
        },
        201
      );
    }
  }
);

// GET /clubs/:clubId/locations — List saved locations
clubEventRoutes.get(
  "/:clubId/locations",
  requireClubMember(),
  async (c) => {
    const { clubId } = c.req.param();

    try {
      const locations = await (
        await import("../../../../packages/db/src/client")
      ).db.savedLocation.findMany({ where: { clubId } });
      return c.json(locations);
    } catch {
      c.header("X-Mock-Data", "true");
      return c.json(getMockSavedLocations());
    }
  }
);

// ────────────────────────────────────────────────────────────
// Public guest RSVP routes (NO auth required)
// ────────────────────────────────────────────────────────────

export const guestRsvpRoutes = new Hono();

// GET /rsvp/guest/:guestToken — Guest RSVP page data
guestRsvpRoutes.get("/guest/:guestToken", async (c) => {
  const { guestToken } = c.req.param();

  try {
    const rsvp = await (
      await import("../../../../packages/db/src/client")
    ).db.rsvp.findUnique({
      where: { guestToken },
      include: {
        event: {
          select: {
            title: true,
            startsAt: true,
            endsAt: true,
            buyInAmount: true,
            locationAddress: true,
            locationName: true,
            savedLocation: {
              select: { name: true, address: true },
            },
          },
        },
      },
    });

    if (!rsvp) return c.json({ error: "Invalid guest token" }, 404);

    return c.json({
      event: {
        title: rsvp.event.title,
        startsAt: rsvp.event.startsAt,
        endsAt: rsvp.event.endsAt,
        buyInAmount: rsvp.event.buyInAmount,
        locationAddress:
          rsvp.event.savedLocation?.address ?? rsvp.event.locationAddress,
        locationName:
          rsvp.event.savedLocation?.name ?? rsvp.event.locationName,
      },
      guestName: rsvp.guestName,
      rsvpStatus: rsvp.status,
    });
  } catch {
    const mock = getMockGuestRsvpPage(guestToken);
    if (!mock) return c.json({ error: "Invalid guest token" }, 404);
    c.header("X-Mock-Data", "true");
    return c.json(mock);
  }
});

// PATCH /rsvp/guest/:guestToken — Update guest RSVP
guestRsvpRoutes.patch("/guest/:guestToken", async (c) => {
  const { guestToken } = c.req.param();
  const body = await c.req.json();

  if (!body.status) {
    return c.json({ error: "status is required" }, 400);
  }

  try {
    const rsvp = await rsvpService.updateGuestRsvp(guestToken, body.status);
    return c.json(rsvp);
  } catch (err: any) {
    if (err.message?.includes("not found")) {
      return c.json({ error: "Invalid guest token" }, 404);
    }
    console.error("updateGuestRsvp error:", err.message);
    c.header("X-Mock-Data", "true");
    return c.json({
      guestToken,
      status: body.status,
      respondedAt: new Date().toISOString(),
    });
  }
});
