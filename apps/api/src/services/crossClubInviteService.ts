import { db } from "../../../../packages/db/src/client";
import { createNotification } from "./notificationService";

// ────────────────────────────────────────────────────────────
// canInvite
// ────────────────────────────────────────────────────────────

export async function canInvite(fromPersonId: string, toPersonId: string) {
  if (fromPersonId === toPersonId) {
    return { canInvite: false, reason: "Cannot invite yourself" };
  }

  // Check if a NetworkEdge exists between these two (one hop only)
  const edge = await db.networkEdge.findFirst({
    where: {
      OR: [
        { personAId: fromPersonId, personBId: toPersonId },
        { personAId: toPersonId, personBId: fromPersonId },
      ],
    },
  });

  if (!edge) {
    return {
      canInvite: false,
      reason: "You can only invite people you've played with before",
    };
  }

  return { canInvite: true };
}

// ────────────────────────────────────────────────────────────
// sendCrossClubInvite
// ────────────────────────────────────────────────────────────

export async function sendCrossClubInvite(
  fromPersonId: string,
  toPersonId: string,
  eventId: string,
  message?: string
) {
  // Verify one-hop network connection
  const check = await canInvite(fromPersonId, toPersonId);
  if (!check.canInvite) {
    throw Object.assign(new Error(check.reason!), { status: 403 });
  }

  // Verify event exists, is PUBLISHED, and is in the future
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      club: { select: { name: true } },
    },
  });

  if (!event) throw new Error("Event not found");
  if (event.status !== "PUBLISHED") throw new Error("Event is not published");
  if (event.startsAt <= new Date()) throw new Error("Event has already started");

  // Get from-person details
  const fromPerson = await db.person.findUnique({
    where: { id: fromPersonId },
    select: { displayName: true },
  });
  if (!fromPerson) throw new Error("Inviter not found");

  // Format date for body
  const dateStr = event.startsAt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const bodyParts = [
    `${event.title} on ${dateStr} at ${event.club.name}.`,
  ];
  if (message) bodyParts.push(message);

  const notification = await createNotification({
    clubId: event.clubId,
    personId: toPersonId,
    type: "INVITE",
    title: `${fromPerson.displayName} invited you to a game`,
    body: bodyParts.join(" "),
    data: { eventId, fromPersonId, clubId: event.clubId },
  });

  return notification;
}

// ────────────────────────────────────────────────────────────
// getIncomingCrossClubInvites
// ────────────────────────────────────────────────────────────

export async function getIncomingCrossClubInvites(personId: string) {
  // Cross-club invites are INVITE notifications where data contains fromPersonId
  const notifications = await db.notification.findMany({
    where: {
      personId,
      type: "INVITE",
    },
    orderBy: { createdAt: "desc" },
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
  });

  // Filter to only those with fromPersonId in data (cross-club invites)
  const crossClubInvites = notifications.filter((n) => {
    const data = n.data as Record<string, unknown> | null;
    return data && typeof data.fromPersonId === "string";
  });

  // Hydrate with event and person details
  const hydrated = await Promise.all(
    crossClubInvites.map(async (invite) => {
      const data = invite.data as Record<string, unknown>;
      const [event, fromPerson] = await Promise.all([
        data.eventId
          ? db.event.findUnique({
              where: { id: data.eventId as string },
              select: {
                id: true,
                title: true,
                startsAt: true,
                buyInAmount: true,
                club: { select: { name: true } },
              },
            })
          : null,
        data.fromPersonId
          ? db.person.findUnique({
              where: { id: data.fromPersonId as string },
              select: { id: true, displayName: true, avatarUrl: true },
            })
          : null,
      ]);

      return {
        ...invite,
        event,
        fromPerson,
      };
    })
  );

  return hydrated;
}
