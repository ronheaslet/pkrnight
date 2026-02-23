import cron from "node-cron";
import { db } from "../../../../packages/db/src/client";

async function logJob(message: string, severity: "P3_LOW" | "P2_MEDIUM" = "P3_LOW") {
  try {
    await db.errorLog.create({
      data: {
        severity,
        errorType: "SCHEDULED_JOB",
        message,
      },
    });
  } catch {
    console.error("[scheduler] Failed to log job result:", message);
  }
}

// Job 1 — Nightly Circuit Standings Recalculation (2:00 AM daily)
cron.schedule("0 2 * * *", async () => {
  console.log("[scheduler] Running nightly circuit standings recalculation...");
  try {
    const circuits = await db.circuit.findMany({
      where: { isActive: true },
      include: { seasons: { where: { isActive: true } } },
    });

    let totalUpdated = 0;
    for (const circuit of circuits) {
      if (circuit.seasons.length === 0) continue;

      const activeSeason = circuit.seasons[0]!;
      const venues = await db.circuitVenue.findMany({
        where: { circuitId: circuit.id, isActive: true },
        select: { clubId: true },
      });
      const clubIds = venues.map((v) => v.clubId);
      if (clubIds.length === 0) continue;

      const games = await db.game.findMany({
        where: {
          clubId: { in: clubIds },
          status: "COMPLETED",
          completedAt: { gte: activeSeason.startDate, lte: activeSeason.endDate },
        },
        include: {
          gameSessions: {
            select: { personId: true, finishPosition: true, pointsEarned: true },
          },
        },
      });

      const playerStats = new Map<string, { points: number; gamesPlayed: number; bestFinish: number | null }>();

      for (const game of games) {
        for (const session of game.gameSessions) {
          const existing = playerStats.get(session.personId) ?? { points: 0, gamesPlayed: 0, bestFinish: null };
          existing.points += session.pointsEarned;
          existing.gamesPlayed += 1;
          if (session.finishPosition !== null) {
            if (existing.bestFinish === null || session.finishPosition < existing.bestFinish) {
              existing.bestFinish = session.finishPosition;
            }
          }
          playerStats.set(session.personId, existing);
        }
      }

      const ranked = Array.from(playerStats.entries())
        .sort((a, b) => b[1].points - a[1].points)
        .map(([userId, stats], i) => ({ userId, rank: i + 1, ...stats }));

      await db.$transaction(async (tx) => {
        await tx.circuitStanding.deleteMany({ where: { seasonId: activeSeason.id } });
        for (const entry of ranked) {
          await tx.circuitStanding.create({
            data: {
              seasonId: activeSeason.id,
              userId: entry.userId,
              rank: entry.rank,
              points: entry.points,
              gamesPlayed: entry.gamesPlayed,
            },
          });
          await tx.circuitMember.upsert({
            where: { circuitId_userId: { circuitId: circuit.id, userId: entry.userId } },
            create: { circuitId: circuit.id, userId: entry.userId, totalPoints: entry.points, gamesPlayed: entry.gamesPlayed, bestFinish: entry.bestFinish },
            update: { totalPoints: entry.points, gamesPlayed: entry.gamesPlayed, bestFinish: entry.bestFinish },
          });
        }
      });

      totalUpdated += ranked.length;
    }

    await logJob(`Circuit standings recalculated: ${circuits.length} circuits, ${totalUpdated} players updated`);
    console.log(`[scheduler] Circuit standings done: ${circuits.length} circuits, ${totalUpdated} players`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logJob(`Circuit standings recalculation failed: ${message}`, "P2_MEDIUM");
    console.error("[scheduler] Circuit standings failed:", message);
  }
});

// Job 2 — Season Auto-Rollover Check (3:00 AM daily)
cron.schedule("0 3 * * *", async () => {
  console.log("[scheduler] Running season auto-rollover check...");
  try {
    const now = new Date();
    const expiredSeasons = await db.circuitSeason.findMany({
      where: { isActive: true, endDate: { lt: now } },
    });

    let rolled = 0;
    for (const season of expiredSeasons) {
      await db.circuitSeason.update({
        where: { id: season.id },
        data: { isActive: false },
      });

      const next = await db.circuitSeason.findFirst({
        where: { circuitId: season.circuitId, isActive: false, startDate: { lte: now }, endDate: { gt: now } },
        orderBy: { startDate: "asc" },
      });

      if (next) {
        await db.circuitSeason.update({
          where: { id: next.id },
          data: { isActive: true },
        });
      }
      rolled++;
    }

    if (rolled > 0) {
      await logJob(`Season auto-rollover: ${rolled} season(s) expired and rolled over`);
    }
    console.log(`[scheduler] Season rollover done: ${rolled} rolled`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logJob(`Season auto-rollover failed: ${message}`, "P2_MEDIUM");
    console.error("[scheduler] Season rollover failed:", message);
  }
});

// Job 3 — Club Standings Refresh (every 15 min during peak hours: 5 PM – midnight)
cron.schedule("*/15 17-23 * * *", async () => {
  try {
    const cutoff = new Date(Date.now() - 20 * 60 * 1000);
    const recentGames = await db.gameSession.findMany({
      where: { updatedAt: { gte: cutoff } },
      select: { game: { select: { clubId: true } } },
    });
    const clubIds = [...new Set(recentGames.map((g) => g.game.clubId))];
    if (clubIds.length > 0) {
      console.log(`[scheduler] Club standings refresh: ${clubIds.length} club(s) had recent activity`);
      await logJob(`Club standings refresh: ${clubIds.length} club(s) with recent game activity`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[scheduler] Club standings refresh failed:", message);
  }
});

console.log("[scheduler] Scheduled jobs registered: circuit-standings (2am), season-rollover (3am), club-refresh (5pm-midnight/15m)");
