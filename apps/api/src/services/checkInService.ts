import { db } from "../../../../packages/db/src/client";
import { assertPubPoker } from "../lib/pubPokerGuard";
import { assignSeat } from "./tableService";

export async function checkInByQr(
  clubId: string,
  gameId: string,
  personId: string,
  actorId: string
) {
  await assertPubPoker(clubId);

  // Idempotent: if GameSession already exists, return it
  const existing = await db.gameSession.findUnique({
    where: { gameId_personId: { gameId, personId } },
    include: { person: { select: { displayName: true, avatarUrl: true } } },
  });
  if (existing) return existing;

  // Create GameSession
  const session = await db.gameSession.create({
    data: {
      gameId,
      personId,
      clubId,
      status: "ACTIVE",
    },
    include: { person: { select: { displayName: true, avatarUrl: true } } },
  });

  // Auto-assign table and seat
  const seat = await assignSeat(gameId, personId);
  const updated = await db.gameSession.update({
    where: { id: session.id },
    data: { tableNumber: seat.tableNumber, seatNumber: seat.seatNumber },
    include: { person: { select: { displayName: true, avatarUrl: true } } },
  });

  // Bump playersRegistered on the game
  await db.game.update({
    where: { id: gameId },
    data: { playersRegistered: { increment: 1 }, playersRemaining: { increment: 1 } },
  });

  return updated;
}

export async function checkInByName(
  clubId: string,
  gameId: string,
  name: string,
  actorId: string
) {
  await assertPubPoker(clubId);

  // Search ACTIVE members whose displayName contains the search string (case insensitive)
  const members = await db.membership.findMany({
    where: {
      clubId,
      status: "ACTIVE",
      person: {
        displayName: { contains: name, mode: "insensitive" },
      },
    },
    include: {
      person: { select: { id: true, displayName: true, avatarUrl: true } },
    },
    take: 20,
  });

  return members.map((m) => ({
    personId: m.person.id,
    displayName: m.person.displayName,
    avatarUrl: m.person.avatarUrl,
    membershipId: m.id,
  }));
}

export async function checkInSelectedMember(
  clubId: string,
  gameId: string,
  personId: string,
  actorId: string
) {
  // Delegates to checkInByQr — same logic
  return checkInByQr(clubId, gameId, personId, actorId);
}

export async function createWalkIn(
  clubId: string,
  gameId: string,
  tempName: string,
  actorId: string
) {
  await assertPubPoker(clubId);

  // Create a temporary placeholder Person record for the walk-in
  const placeholderPerson = await db.person.create({
    data: {
      displayName: tempName,
      phone: null,
      isVerified: false,
    },
  });

  // Create WalkInEntry
  const walkInEntry = await db.walkInEntry.create({
    data: {
      clubId,
      gameId,
      tempName,
    },
  });

  // Create GameSession linked to the placeholder person
  const session = await db.gameSession.create({
    data: {
      gameId,
      personId: placeholderPerson.id,
      clubId,
      status: "ACTIVE",
      isWalkIn: true,
      walkInId: walkInEntry.id,
    },
  });

  // Auto-assign seat
  const seat = await assignSeat(gameId, placeholderPerson.id);
  const updated = await db.gameSession.update({
    where: { id: session.id },
    data: { tableNumber: seat.tableNumber, seatNumber: seat.seatNumber },
  });

  // Bump player counts
  await db.game.update({
    where: { id: gameId },
    data: { playersRegistered: { increment: 1 }, playersRemaining: { increment: 1 } },
  });

  return { walkInEntry, session: updated, claimToken: walkInEntry.claimToken };
}

export async function claimWalkIn(claimToken: string, phone: string) {
  const walkIn = await db.walkInEntry.findUnique({
    where: { claimToken },
  });
  if (!walkIn) throw new Error("Walk-in entry not found");
  if (walkIn.isClaimed) throw new Error("This walk-in has already been claimed");

  // Find or create the real Person by phone
  let person = await db.person.findUnique({ where: { phone } });
  if (!person) {
    person = await db.person.create({
      data: {
        phone,
        displayName: walkIn.tempName,
        isVerified: true,
      },
    });
  }

  // Find the GameSession that was using the placeholder person
  const session = await db.gameSession.findFirst({
    where: { walkInId: walkIn.id },
  });

  if (session) {
    // Update the GameSession to point to the real person
    await db.gameSession.update({
      where: { id: session.id },
      data: { personId: person.id },
    });
  }

  // Mark WalkInEntry as claimed
  const updatedWalkIn = await db.walkInEntry.update({
    where: { id: walkIn.id },
    data: {
      isClaimed: true,
      claimedById: person.id,
      claimedAt: new Date(),
    },
  });

  // Auto-generate ReferralCode for new person if they don't have one
  const existingCode = await db.referralCode.findUnique({
    where: { personId: person.id },
  });
  if (!existingCode) {
    const code = `PKR-${person.id.slice(-6).toUpperCase()}`;
    await db.referralCode.create({
      data: {
        personId: person.id,
        code,
      },
    });
  }

  return {
    person,
    walkInEntry: updatedWalkIn,
    message: "Welcome to PKR Night!",
  };
}

export async function getCheckedInPlayers(clubId: string, gameId: string) {
  await assertPubPoker(clubId);

  const sessions = await db.gameSession.findMany({
    where: { gameId, clubId },
    include: {
      person: { select: { id: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return sessions.map((s) => ({
    sessionId: s.id,
    personId: s.personId,
    displayName: s.person.displayName,
    avatarUrl: s.person.avatarUrl,
    status: s.status,
    isWalkIn: s.isWalkIn,
    walkInId: s.walkInId,
    tableNumber: s.tableNumber,
    seatNumber: s.seatNumber,
    checkInTime: s.createdAt,
  }));
}
