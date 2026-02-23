import { db } from "../../../../packages/db/src/client";
import { getResultsSummaryText } from "./resultsService";
import { createBulkNotifications } from "./notificationService";

// ---------------------------------------------------------------------------
// sendPostGameResults — notify all club members with game results
// ---------------------------------------------------------------------------
export async function sendPostGameResults(gameId: string) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    select: { clubId: true, status: true },
  });

  if (!game) throw new Error("Game not found");
  if (game.status !== "COMPLETED")
    throw new Error("Game must be completed to send results");

  const summaryText = await getResultsSummaryText(gameId);

  // Get ALL active club members (including those who didn't play)
  const members = await db.membership.findMany({
    where: { clubId: game.clubId, status: "ACTIVE" },
    select: { personId: true },
  });

  const personIds = members.map((m) => m.personId);
  if (personIds.length === 0) return { notificationsSent: 0, gameId };

  const count = await createBulkNotifications(personIds, {
    clubId: game.clubId,
    type: "RESULTS",
    channel: "BOTH",
    title: "Game Results",
    body: summaryText,
    data: { gameId },
  });

  return { notificationsSent: count, gameId };
}
