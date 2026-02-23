import { db } from "../../../../packages/db/src/client";
import { createNotification, sendSms } from "./notificationService";
import { createGuestRsvp } from "./rsvpService";

// ────────────────────────────────────────────────────────────
// sendMemberInvites
// ────────────────────────────────────────────────────────────

export async function sendMemberInvites(eventId: string, actorId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      clubId: true,
      title: true,
      startsAt: true,
      buyInAmount: true,
    },
  });
  if (!event) throw new Error("Event not found");

  const activeMembers = await db.membership.findMany({
    where: { clubId: event.clubId, status: "ACTIVE" },
    include: { person: { select: { phone: true } } },
  });

  let sent = 0;
  let failed = 0;

  for (const member of activeMembers) {
    // Ensure RSVP exists (create if not — idempotent)
    const existingRsvp = await db.rsvp.findFirst({
      where: { eventId, membershipId: member.id },
    });

    if (!existingRsvp) {
      await db.rsvp.create({
        data: {
          eventId,
          membershipId: member.id,
          status: "PENDING",
        },
      });
    }

    // Create notification
    try {
      await createNotification({
        clubId: event.clubId,
        personId: member.personId,
        type: "INVITE",
        channel: "BOTH",
        title: `You're invited: ${event.title}`,
        body: buildMemberInviteBody(event, member.id),
        data: { eventId },
      });

      // Send SMS if Twilio is configured and member has a phone
      if (member.person.phone) {
        await sendSms(
          member.person.phone,
          buildMemberSmsBody(event, member.id, eventId)
        );
      }

      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

// ────────────────────────────────────────────────────────────
// sendGuestInvite
// ────────────────────────────────────────────────────────────

export async function sendGuestInvite(
  eventId: string,
  phone: string,
  name: string,
  actorId: string
) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      clubId: true,
      title: true,
      startsAt: true,
      buyInAmount: true,
    },
  });
  if (!event) throw new Error("Event not found");

  // Create guest RSVP
  const guestRsvp = await createGuestRsvp(eventId, {
    guestName: name,
    guestPhone: phone,
  });

  const inviteUrl = `pkrnight.com/rsvp/guest/${guestRsvp.guestToken}`;

  // Send SMS
  const date = event.startsAt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const smsBody = `Hi ${name}! You're invited to ${event.title} on ${date}. Buy-in: $${event.buyInAmount}. RSVP here: ${inviteUrl}`;

  await sendSms(phone, smsBody);

  return { guestToken: guestRsvp.guestToken, inviteUrl };
}

// ────────────────────────────────────────────────────────────
// generateIcsFile
// ────────────────────────────────────────────────────────────

export async function generateIcsFile(eventId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      savedLocation: true,
      club: { select: { name: true } },
    },
  });
  if (!event) throw new Error("Event not found");

  const dtStart = formatIcsDate(event.startsAt);
  // If no endsAt, default to startsAt + 4 hours
  const endsAt = event.endsAt ?? new Date(event.startsAt.getTime() + 4 * 60 * 60 * 1000);
  const dtEnd = formatIcsDate(endsAt);

  const location =
    event.locationAddress || event.savedLocation?.address || "";

  const description = [
    event.buyInAmount > 0 ? `Buy-in: $${event.buyInAmount}` : null,
    event.club?.name ? `Club: ${event.club.name}` : null,
    `Details: pkrnight.com/events/${event.id}`,
  ]
    .filter(Boolean)
    .join("\\n");

  const uid = `${event.id}@pkrnight.com`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PKR Night//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    location ? `LOCATION:${escapeIcsText(location)}` : "",
    `DESCRIPTION:${description}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return ics;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcsText(text: string): string {
  return text.replace(/[,;\\]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

function buildMemberInviteBody(
  event: { title: string; startsAt: Date; buyInAmount: number },
  membershipId: string
): string {
  const date = event.startsAt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = event.startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${event.title} on ${date} at ${time}. Buy-in: $${event.buyInAmount}. RSVP now!`;
}

function buildMemberSmsBody(
  event: { title: string; startsAt: Date; buyInAmount: number },
  membershipId: string,
  eventId: string
): string {
  const date = event.startsAt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = event.startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `You're invited to ${event.title} on ${date} at ${time}. Buy-in: $${event.buyInAmount}. RSVP: pkrnight.com/rsvp/${membershipId}/${eventId}`;
}
