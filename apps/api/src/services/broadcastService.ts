import { db } from "../../../../packages/db/src/client";
import { createBulkNotifications, sendSms } from "./notificationService";

// ────────────────────────────────────────────────────────────
// sendBroadcast
// ────────────────────────────────────────────────────────────

export async function sendBroadcast(
  clubId: string,
  actorId: string,
  message: string,
  options: { smsAlso?: boolean } = {}
) {
  // Verify actor is OWNER or ADMIN
  const membership = await db.membership.findUnique({
    where: { clubId_personId: { clubId, personId: actorId } },
    select: { systemRole: true },
  });

  if (!membership || !["OWNER", "ADMIN"].includes(membership.systemRole)) {
    throw new Error("Only OWNER or ADMIN can send broadcasts");
  }

  // Get club name for title
  const club = await db.club.findUnique({
    where: { id: clubId },
    select: { name: true },
  });
  if (!club) throw new Error("Club not found");

  // Get all ACTIVE members
  const activeMembers = await db.membership.findMany({
    where: { clubId, status: "ACTIVE" },
    select: {
      personId: true,
      person: { select: { phone: true } },
    },
  });

  const personIds = activeMembers.map((m) => m.personId);

  // Create notifications for all members
  const sent = await createBulkNotifications(personIds, {
    clubId,
    type: "ANNOUNCEMENT",
    title: `📢 ${club.name}`,
    body: message,
  });

  // Send SMS if requested
  let smsSent = 0;
  if (options.smsAlso) {
    for (const member of activeMembers) {
      if (member.person.phone) {
        try {
          const result = await sendSms(member.person.phone, `📢 ${club.name}: ${message}`);
          if (result.success) smsSent++;
        } catch {
          // SMS failure is non-fatal
        }
      }
    }
  }

  // Audit log
  await db.auditLog.create({
    data: {
      clubId,
      actorId,
      action: "CREATE",
      entityType: "Broadcast",
      entityId: clubId,
      newValue: { message, recipientCount: sent },
    },
  });

  return { sent, smsSent };
}

// ────────────────────────────────────────────────────────────
// sendGameNightAlert
// ────────────────────────────────────────────────────────────

export async function sendGameNightAlert(
  clubId: string,
  actorId: string,
  message: string
) {
  return sendBroadcast(clubId, actorId, `🃏 Tonight: ${message}`, {
    smsAlso: true,
  });
}
