import { db } from "../../../../packages/db/src/client";
import { createNotification } from "./notificationService";
import crypto from "crypto";

// ────────────────────────────────────────────────────────────
// updateRsvp
// ────────────────────────────────────────────────────────────

export async function updateRsvp(
  eventId: string,
  personId: string,
  status: "GOING" | "NOT_GOING" | "MAYBE" | "PENDING"
) {
  // Find membership for this person in the event's club
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { clubId: true },
  });
  if (!event) throw new Error("Event not found");

  const membership = await db.membership.findFirst({
    where: { clubId: event.clubId, personId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!membership) throw new Error("Not a member of this club");

  const rsvp = await db.rsvp.findFirst({
    where: { eventId, membershipId: membership.id },
  });
  if (!rsvp) throw new Error("RSVP not found");

  const updated = await db.rsvp.update({
    where: { id: rsvp.id },
    data: {
      status,
      respondedAt: new Date(),
    },
  });

  return {
    ...updated,
    calendarHint: status === "GOING" ? "ics_available" : undefined,
  };
}

// ────────────────────────────────────────────────────────────
// getRsvpsForEvent
// ────────────────────────────────────────────────────────────

export async function getRsvpsForEvent(eventId: string) {
  const rsvps = await db.rsvp.findMany({
    where: { eventId },
    include: {
      membership: {
        include: {
          person: {
            select: { displayName: true, avatarUrl: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const grouped = {
    going: [] as typeof rsvps,
    notGoing: [] as typeof rsvps,
    maybe: [] as typeof rsvps,
    pending: [] as typeof rsvps,
  };

  for (const rsvp of rsvps) {
    switch (rsvp.status) {
      case "GOING":
        grouped.going.push(rsvp);
        break;
      case "NOT_GOING":
        grouped.notGoing.push(rsvp);
        break;
      case "MAYBE":
        grouped.maybe.push(rsvp);
        break;
      case "PENDING":
        grouped.pending.push(rsvp);
        break;
    }
  }

  return grouped;
}

// ────────────────────────────────────────────────────────────
// createGuestRsvp
// ────────────────────────────────────────────────────────────

export async function createGuestRsvp(
  eventId: string,
  data: { guestName: string; guestPhone?: string }
) {
  const guestToken = crypto.randomBytes(16).toString("hex");

  const rsvp = await db.rsvp.create({
    data: {
      eventId,
      guestToken,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      status: "PENDING",
    },
  });

  return { ...rsvp, guestToken };
}

// ────────────────────────────────────────────────────────────
// updateGuestRsvp
// ────────────────────────────────────────────────────────────

export async function updateGuestRsvp(
  guestToken: string,
  status: "GOING" | "NOT_GOING" | "MAYBE" | "PENDING"
) {
  const rsvp = await db.rsvp.findUnique({
    where: { guestToken },
  });
  if (!rsvp) throw new Error("Guest RSVP not found");

  return db.rsvp.update({
    where: { id: rsvp.id },
    data: { status, respondedAt: new Date() },
  });
}

// ────────────────────────────────────────────────────────────
// sendReminders
// ────────────────────────────────────────────────────────────

// TODO Phase 4+: Schedule via cron at event creation

export async function sendReminders(
  eventId: string,
  reminderType: "48h" | "24h" | "2h"
) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      rsvps: {
        where: { status: { in: ["GOING", "PENDING"] } },
        include: { membership: { select: { personId: true } } },
      },
    },
  });

  if (!event) throw new Error("Event not found");

  // Check if this reminder type is enabled
  if (reminderType === "48h" && !event.reminder48h) return { sent: 0 };
  if (reminderType === "24h" && !event.reminder24h) return { sent: 0 };
  if (reminderType === "2h" && !event.reminder2h) return { sent: 0 };

  const time = event.startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  let body: string;
  switch (reminderType) {
    case "48h":
      body = `Reminder: ${event.title} is in 2 days. Are you going?`;
      break;
    case "24h":
      body = `Reminder: ${event.title} is tomorrow at ${time}. RSVP if you haven't.`;
      break;
    case "2h":
      body = `Game night tonight! ${event.title} starts at ${time}. See you there.`;
      break;
  }

  let sent = 0;
  for (const rsvp of event.rsvps) {
    if (rsvp.membership?.personId) {
      await createNotification({
        clubId: event.clubId,
        personId: rsvp.membership.personId,
        type: "REMINDER",
        channel: "BOTH",
        title: `Reminder: ${event.title}`,
        body,
        data: { eventId, reminderType },
      });
      sent++;
    }
  }

  return { sent };
}
