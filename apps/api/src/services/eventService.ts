import { db } from "../../../../packages/db/src/client";
import {
  createNotification,
  createBulkNotifications,
} from "./notificationService";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface CreateEventInput {
  title: string;
  description?: string;
  startsAt: string; // ISO 8601
  endsAt?: string;
  savedLocationId?: string;
  locationName?: string;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
  buyInAmount?: number;
  rebuyAmount?: number;
  addOnAmount?: number;
  rebuyLimit?: number;
  addOnAllowed?: boolean;
  addOnCutoffLevel?: number;
  bountyEnabled?: boolean;
  bountyAmount?: number;
  guestEligible?: boolean;
  maxPlayers?: number;
  blindStructureId?: string;
  chipSetId?: string;
  reminder48h?: boolean;
  reminder24h?: boolean;
  reminder2h?: boolean;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  savedLocationId?: string;
  locationName?: string;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
  buyInAmount?: number;
  rebuyAmount?: number;
  addOnAmount?: number;
  rebuyLimit?: number;
  addOnAllowed?: boolean;
  addOnCutoffLevel?: number;
  bountyEnabled?: boolean;
  bountyAmount?: number;
  guestEligible?: boolean;
  maxPlayers?: number;
  blindStructureId?: string;
  chipSetId?: string;
  reminder48h?: boolean;
  reminder24h?: boolean;
  reminder2h?: boolean;
}

// ────────────────────────────────────────────────────────────
// createEvent
// ────────────────────────────────────────────────────────────

export async function createEvent(
  clubId: string,
  data: CreateEventInput,
  actorId: string
) {
  // Validate startsAt is in the future
  const startsAt = new Date(data.startsAt);
  if (startsAt <= new Date()) {
    throw new Error("Event start time must be in the future");
  }

  // Verify blind structure belongs to this club
  if (data.blindStructureId) {
    const bs = await db.blindStructure.findFirst({
      where: { id: data.blindStructureId, clubId },
    });
    if (!bs) throw new Error("Blind structure not found in this club");
  }

  // Verify chip set belongs to this club
  if (data.chipSetId) {
    const cs = await db.chipSet.findFirst({
      where: { id: data.chipSetId, clubId },
    });
    if (!cs) throw new Error("Chip set not found in this club");
  }

  // Verify saved location belongs to this club
  if (data.savedLocationId) {
    const loc = await db.savedLocation.findFirst({
      where: { id: data.savedLocationId, clubId },
    });
    if (!loc) throw new Error("Saved location not found in this club");
  }

  // Create event as DRAFT
  const event = await db.event.create({
    data: {
      clubId,
      createdBy: actorId,
      title: data.title,
      description: data.description,
      status: "DRAFT",
      startsAt,
      endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      savedLocationId: data.savedLocationId,
      locationName: data.locationName,
      locationAddress: data.locationAddress,
      locationLat: data.locationLat,
      locationLng: data.locationLng,
      buyInAmount: data.buyInAmount ?? 0,
      rebuyAmount: data.rebuyAmount ?? 0,
      addOnAmount: data.addOnAmount ?? 0,
      rebuyLimit: data.rebuyLimit,
      addOnAllowed: data.addOnAllowed ?? false,
      addOnCutoffLevel: data.addOnCutoffLevel,
      bountyEnabled: data.bountyEnabled ?? false,
      bountyAmount: data.bountyAmount ?? 0,
      guestEligible: data.guestEligible ?? false,
      maxPlayers: data.maxPlayers,
      blindStructureId: data.blindStructureId,
      chipSetId: data.chipSetId,
      reminder48h: data.reminder48h ?? true,
      reminder24h: data.reminder24h ?? true,
      reminder2h: data.reminder2h ?? true,
    },
  });

  // Auto-create RSVP records for all ACTIVE members
  const activeMembers = await db.membership.findMany({
    where: { clubId, status: "ACTIVE" },
    select: { id: true },
  });

  if (activeMembers.length > 0) {
    await db.rsvp.createMany({
      data: activeMembers.map((m) => ({
        eventId: event.id,
        membershipId: m.id,
        status: "PENDING" as const,
      })),
    });
  }

  const rsvpCount = activeMembers.length;

  return { ...event, rsvpCount };
}

// ────────────────────────────────────────────────────────────
// publishEvent
// ────────────────────────────────────────────────────────────

export async function publishEvent(eventId: string, actorId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      rsvps: { include: { membership: { select: { personId: true } } } },
    },
  });

  if (!event) throw new Error("Event not found");
  if (event.status !== "DRAFT") throw new Error("Only DRAFT events can be published");

  const updated = await db.event.update({
    where: { id: eventId },
    data: { status: "PUBLISHED" },
  });

  // Send INVITE notifications to all members with existing RSVPs
  for (const rsvp of event.rsvps) {
    if (rsvp.membership?.personId) {
      await createNotification({
        clubId: event.clubId,
        personId: rsvp.membership.personId,
        type: "INVITE",
        channel: "BOTH",
        title: `You're invited: ${event.title}`,
        body: `${event.title} on ${formatDate(event.startsAt)}. Buy-in: $${event.buyInAmount}. RSVP now!`,
        data: { eventId: event.id },
      });
    }
  }

  return updated;
}

// ────────────────────────────────────────────────────────────
// updateEvent
// ────────────────────────────────────────────────────────────

export async function updateEvent(
  eventId: string,
  data: UpdateEventInput,
  actorId: string
) {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Event not found");

  if (event.status === "COMPLETED" || event.status === "CANCELLED") {
    throw new Error("Cannot update a COMPLETED or CANCELLED event");
  }

  const startsAtChanged = data.startsAt && data.startsAt !== event.startsAt.toISOString();
  const locationChanged =
    (data.locationAddress && data.locationAddress !== event.locationAddress) ||
    (data.savedLocationId && data.savedLocationId !== event.savedLocationId);

  const updated = await db.event.update({
    where: { id: eventId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.startsAt !== undefined && { startsAt: new Date(data.startsAt) }),
      ...(data.endsAt !== undefined && { endsAt: new Date(data.endsAt) }),
      ...(data.savedLocationId !== undefined && {
        savedLocationId: data.savedLocationId,
      }),
      ...(data.locationName !== undefined && { locationName: data.locationName }),
      ...(data.locationAddress !== undefined && {
        locationAddress: data.locationAddress,
      }),
      ...(data.locationLat !== undefined && { locationLat: data.locationLat }),
      ...(data.locationLng !== undefined && { locationLng: data.locationLng }),
      ...(data.buyInAmount !== undefined && { buyInAmount: data.buyInAmount }),
      ...(data.rebuyAmount !== undefined && { rebuyAmount: data.rebuyAmount }),
      ...(data.addOnAmount !== undefined && { addOnAmount: data.addOnAmount }),
      ...(data.rebuyLimit !== undefined && { rebuyLimit: data.rebuyLimit }),
      ...(data.addOnAllowed !== undefined && { addOnAllowed: data.addOnAllowed }),
      ...(data.addOnCutoffLevel !== undefined && {
        addOnCutoffLevel: data.addOnCutoffLevel,
      }),
      ...(data.bountyEnabled !== undefined && {
        bountyEnabled: data.bountyEnabled,
      }),
      ...(data.bountyAmount !== undefined && { bountyAmount: data.bountyAmount }),
      ...(data.guestEligible !== undefined && {
        guestEligible: data.guestEligible,
      }),
      ...(data.maxPlayers !== undefined && { maxPlayers: data.maxPlayers }),
      ...(data.blindStructureId !== undefined && {
        blindStructureId: data.blindStructureId,
      }),
      ...(data.chipSetId !== undefined && { chipSetId: data.chipSetId }),
      ...(data.reminder48h !== undefined && { reminder48h: data.reminder48h }),
      ...(data.reminder24h !== undefined && { reminder24h: data.reminder24h }),
      ...(data.reminder2h !== undefined && { reminder2h: data.reminder2h }),
    },
  });

  // If event is PUBLISHED and time/location changed, notify GOING members
  if (event.status === "PUBLISHED" && (startsAtChanged || locationChanged)) {
    const goingRsvps = await db.rsvp.findMany({
      where: { eventId, status: "GOING" },
      include: { membership: { select: { personId: true } } },
    });

    const personIds = goingRsvps
      .filter((r) => r.membership?.personId)
      .map((r) => r.membership!.personId);

    if (personIds.length > 0) {
      const changeDetail = startsAtChanged
        ? `Game time updated to ${formatDate(new Date(data.startsAt!))}`
        : "Location has been updated";

      await createBulkNotifications(personIds, {
        clubId: event.clubId,
        type: "ANNOUNCEMENT",
        channel: "BOTH",
        title: `Update: ${event.title}`,
        body: `${changeDetail}. Check the event for details.`,
        data: { eventId },
      });
    }
  }

  return updated;
}

// ────────────────────────────────────────────────────────────
// cancelEvent
// ────────────────────────────────────────────────────────────

export async function cancelEvent(
  eventId: string,
  actorId: string,
  reason?: string
) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { game: { select: { id: true, status: true } } },
  });

  if (!event) throw new Error("Event not found");
  if (event.status === "COMPLETED") throw new Error("Cannot cancel a COMPLETED event");
  if (event.game && event.game.status !== "COMPLETED") {
    throw new Error("Cannot cancel an event with an active game");
  }

  const updated = await db.event.update({
    where: { id: eventId },
    data: { status: "CANCELLED" },
  });

  // Notify all members
  const members = await db.membership.findMany({
    where: { clubId: event.clubId, status: "ACTIVE" },
    select: { personId: true },
  });

  const personIds = members.map((m) => m.personId);
  const bodyText = reason
    ? `Tonight's game has been cancelled. ${reason}`
    : "Tonight's game has been cancelled.";

  if (personIds.length > 0) {
    await createBulkNotifications(personIds, {
      clubId: event.clubId,
      type: "ANNOUNCEMENT",
      channel: "BOTH",
      title: `Cancelled: ${event.title}`,
      body: bodyText,
      data: { eventId },
    });
  }

  return updated;
}

// ────────────────────────────────────────────────────────────
// getEvent
// ────────────────────────────────────────────────────────────

export async function getEvent(eventId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      savedLocation: true,
      blindStructure: {
        include: { levels: { orderBy: { levelNumber: "asc" } } },
      },
      rsvps: {
        include: {
          membership: {
            include: { person: { select: { displayName: true } } },
          },
        },
      },
      game: { select: { id: true, status: true } },
    },
  });

  return event;
}

// ────────────────────────────────────────────────────────────
// getClubEvents
// ────────────────────────────────────────────────────────────

export async function getClubEvents(
  clubId: string,
  options: {
    status?: string;
    upcoming?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, upcoming = true, limit = 20, offset = 0 } = options;

  const where: any = { clubId };

  if (status) {
    where.status = status;
  } else if (upcoming) {
    where.startsAt = { gt: new Date() };
    where.status = "PUBLISHED";
  }

  const events = await db.event.findMany({
    where,
    orderBy: { startsAt: "asc" },
    skip: offset,
    take: limit,
    include: {
      savedLocation: true,
      _count: { select: { rsvps: true } },
      rsvps: {
        select: { status: true },
      },
    },
  });

  // Aggregate RSVP counts per event
  return events.map((event) => {
    const rsvpCounts = {
      going: 0,
      notGoing: 0,
      maybe: 0,
      pending: 0,
    };
    for (const rsvp of event.rsvps) {
      if (rsvp.status === "GOING") rsvpCounts.going++;
      else if (rsvp.status === "NOT_GOING") rsvpCounts.notGoing++;
      else if (rsvp.status === "MAYBE") rsvpCounts.maybe++;
      else if (rsvp.status === "PENDING") rsvpCounts.pending++;
    }

    const { rsvps, ...rest } = event;
    return { ...rest, rsvpCounts };
  });
}

// ────────────────────────────────────────────────────────────
// getUpcomingWithRsvp
// ────────────────────────────────────────────────────────────

export async function getUpcomingWithRsvp(clubId: string, personId: string) {
  // Find this person's membership
  const membership = await db.membership.findFirst({
    where: { clubId, personId, status: "ACTIVE" },
    select: { id: true },
  });

  const events = await db.event.findMany({
    where: {
      clubId,
      status: "PUBLISHED",
      startsAt: { gt: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: 5,
    include: {
      savedLocation: true,
      rsvps: membership
        ? {
            where: { membershipId: membership.id },
            select: { status: true },
          }
        : { where: { id: "none" }, select: { status: true } },
    },
  });

  return events.map((event) => ({
    ...event,
    myRsvpStatus: event.rsvps[0]?.status ?? null,
    rsvps: undefined, // strip raw rsvps from response
  }));
}

// ────────────────────────────────────────────────────────────
// createSavedLocation
// ────────────────────────────────────────────────────────────

export async function createSavedLocation(
  clubId: string,
  data: { name: string; address: string; lat?: number; lng?: number },
  actorId: string
) {
  return db.savedLocation.create({
    data: {
      clubId,
      name: data.name,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
    },
  });
}

// ────────────────────────────────────────────────────────────
// getPayoutStructure
// ────────────────────────────────────────────────────────────

export function getPayoutStructure(
  prizePool: number,
  playerCount: number
): Array<{ position: number; percentage: number; amount: number }> {
  let tiers: number[];

  if (playerCount <= 1) {
    return [];
  } else if (playerCount <= 6) {
    tiers = [100];
  } else if (playerCount <= 9) {
    tiers = [65, 35];
  } else if (playerCount <= 14) {
    tiers = [50, 30, 20];
  } else if (playerCount <= 19) {
    tiers = [45, 27, 18, 10];
  } else {
    tiers = [40, 25, 15, 11, 9];
  }

  return tiers.map((pct, i) => ({
    position: i + 1,
    percentage: pct,
    amount: Math.round((prizePool * pct) / 100),
  }));
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
