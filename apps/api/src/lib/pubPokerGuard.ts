import { db } from "../../../../packages/db/src/client";

/**
 * Asserts that a club exists and is of type PUB_POKER.
 * Call at the top of every pub-poker-only service method.
 */
export async function assertPubPoker(clubId: string) {
  const club = await db.club.findUnique({
    where: { id: clubId },
    select: { clubType: true },
  });
  if (!club) throw new Error("Club not found");
  if (club.clubType !== "PUB_POKER") {
    throw new Error("This feature is only available for Pub Poker clubs");
  }
}
