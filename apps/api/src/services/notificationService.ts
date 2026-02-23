import { db } from "../../../../packages/db/src/client";

// Twilio client — lazy-initialized when env vars are present
let twilioClient: any = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) return null;

  try {
    const twilio = require("twilio");
    twilioClient = twilio(accountSid, authToken);
    return twilioClient;
  } catch {
    console.warn("Twilio SDK not available");
    return null;
  }
}

export interface CreateNotificationInput {
  clubId?: string;
  personId: string;
  type:
    | "INVITE"
    | "REMINDER"
    | "RESULTS"
    | "TROPHY"
    | "ANNOUNCEMENT"
    | "CHIP_VALUE_CHANGE"
    | "RSVP_CONFIRMATION"
    | "DUES_REMINDER"
    | "TABLE_MOVE"
    | "GAME_START"
    | "SYSTEM";
  channel?: "IN_APP" | "SMS" | "BOTH";
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  const channel = input.channel ?? "IN_APP";

  const notification = await db.notification.create({
    data: {
      clubId: input.clubId ?? null,
      personId: input.personId,
      type: input.type,
      channel,
      title: input.title,
      body: input.body,
      data: (input.data ?? undefined) as any,
    },
  });

  // If SMS or BOTH and Twilio is configured, attempt SMS delivery
  if (channel === "SMS" || channel === "BOTH") {
    try {
      const person = await db.person.findUnique({
        where: { id: input.personId },
        select: { phone: true },
      });
      if (person?.phone) {
        const result = await sendSms(person.phone, input.body);
        if (result.success) {
          await db.notification.update({
            where: { id: notification.id },
            data: { smsSentAt: new Date(), smsStatus: "sent" },
          });
        }
      }
    } catch (err) {
      console.error("SMS delivery failed for notification", notification.id, err);
    }
  }

  return notification;
}

export async function sendSms(
  to: string,
  body: string
): Promise<{ success: boolean; sid?: string }> {
  const client = getTwilioClient();
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!client || !from) {
    console.log(`[DEV SMS] To: ${to} | Body: ${body}`);
    return { success: false };
  }

  try {
    const message = await client.messages.create({ to, from, body });
    console.log(`SMS sent: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (err: any) {
    console.error("Twilio SMS error:", err?.message);
    // Log to ErrorLog in production
    try {
      await db.errorLog.create({
        data: {
          errorType: "SMS_DELIVERY",
          severity: "P2_MEDIUM",
          message: err?.message ?? "SMS delivery failed",
          stackTrace: err?.stack,
        },
      });
    } catch {
      // ErrorLog insert failed — don't crash
    }
    return { success: false };
  }
}

export async function createBulkNotifications(
  personIds: string[],
  data: Omit<CreateNotificationInput, "personId">
) {
  if (personIds.length === 0) return 0;

  const channel = data.channel ?? "IN_APP";

  const result = await db.notification.createMany({
    data: personIds.map((personId) => ({
      clubId: data.clubId ?? null,
      personId,
      type: data.type,
      channel,
      title: data.title,
      body: data.body,
      data: (data.data ?? undefined) as any,
    })),
  });

  // Bulk does NOT send individual SMS — caller handles SMS separately
  return result.count;
}
