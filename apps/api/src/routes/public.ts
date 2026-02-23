import { Hono } from "hono";
import { prisma } from "../../../../packages/db/src/client";
import { getPublicCircuits, getPublicCircuitBySlug } from "../services/circuitService";

export const publicRoutes = new Hono();

// GET /public/club/:slug — no auth required
publicRoutes.get("/club/:slug", async (c) => {
  const slug = c.req.param("slug");

  const club = await prisma.club.findUnique({
    where: { slug },
    include: {
      venueProfile: true,
      _count: {
        select: {
          memberships: { where: { status: "ACTIVE" } },
        },
      },
    },
  });

  if (!club) {
    return c.json({ error: "Club not found" }, 404);
  }

  // Block home games from public access
  if (club.clubType === "HOME_GAME") {
    return c.json({ error: "This club is not publicly accessible" }, 403);
  }

  if (!club.isPublic) {
    return c.json({ error: "This club is not publicly listed" }, 403);
  }

  // Log page view (non-blocking — don't await)
  prisma.pageViewLog.create({ data: { clubSlug: slug } }).catch(() => {});

  // Fetch next 3 upcoming published events
  const upcomingEvents = await prisma.event.findMany({
    where: {
      clubId: club.id,
      status: "PUBLISHED",
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: 3,
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      buyInAmount: true,
      maxPlayers: true,
      locationName: true,
      _count: {
        select: {
          rsvps: { where: { status: "GOING" } },
        },
      },
    },
  });

  return c.json({
    id: club.id,
    name: club.name,
    slug: club.slug,
    clubType: club.clubType,
    tagline: club.tagline,
    publicBio: club.publicBio,
    venueAddress: club.venueAddress,
    venueCity: club.venueCity,
    socialLink: club.socialLink,
    logoUrl: club.logoUrl,
    primaryColor: club.primaryColor,
    memberCount: club._count.memberships,
    venueProfile: club.venueProfile
      ? {
          venueName: club.venueProfile.venueName,
          address: club.venueProfile.address,
          operatingNights: club.venueProfile.operatingNights,
        }
      : null,
    upcomingEvents: upcomingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      buyInAmount: e.buyInAmount,
      maxPlayers: e.maxPlayers,
      locationName: e.locationName,
      rsvpCount: e._count.rsvps,
    })),
  });
});

// GET /public/club/:slug/events — no auth, upcoming events
publicRoutes.get("/club/:slug/events", async (c) => {
  const slug = c.req.param("slug");

  const club = await prisma.club.findUnique({
    where: { slug },
    select: { id: true, clubType: true, isPublic: true },
  });

  if (!club || club.clubType === "HOME_GAME" || !club.isPublic) {
    return c.json({ error: "Not found" }, 404);
  }

  const events = await prisma.event.findMany({
    where: {
      clubId: club.id,
      status: "PUBLISHED",
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: 10,
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      buyInAmount: true,
      maxPlayers: true,
      locationName: true,
      locationAddress: true,
      _count: {
        select: {
          rsvps: { where: { status: "GOING" } },
        },
      },
    },
  });

  return c.json(
    events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      buyInAmount: e.buyInAmount,
      maxPlayers: e.maxPlayers,
      locationName: e.locationName,
      locationAddress: e.locationAddress,
      rsvpCount: e._count.rsvps,
    }))
  );
});

// GET /public/circuits — list all public circuits
publicRoutes.get("/circuits", async (c) => {
  try {
    const circuits = await getPublicCircuits();
    return c.json(circuits);
  } catch {
    return c.json([], 200);
  }
});

// GET /public/circuits/:slug — public circuit page data
publicRoutes.get("/circuits/:slug", async (c) => {
  const slug = c.req.param("slug");

  try {
    const circuit = await getPublicCircuitBySlug(slug);
    if (!circuit) {
      return c.json({ error: "Circuit not found" }, 404);
    }
    return c.json(circuit);
  } catch {
    return c.json({ error: "Circuit not found" }, 404);
  }
});
