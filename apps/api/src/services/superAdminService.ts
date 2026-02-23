import { db } from "../../../../packages/db/src/client";
import { invalidateFeatureCache } from "../middleware/featureFlags";

// ─── STEP 1: SYSTEM STATS ──────────────────────────────────────────────────

export async function getSystemStatus() {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalClubs,
    activeClubsThisWeek,
    totalPersons,
    newPersonsThisWeek,
    newPersonsThisMonth,
    newPersonsLastWeek,
    totalGamesAllTime,
    activeGamesRightNow,
  ] = await Promise.all([
    db.club.count(),
    db.club.count({
      where: {
        games: { some: { startedAt: { gte: oneWeekAgo } } },
      },
    }),
    db.person.count(),
    db.person.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    db.person.count({ where: { createdAt: { gte: oneMonthAgo } } }),
    db.person.count({
      where: {
        createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
      },
    }),
    db.game.count({ where: { status: "COMPLETED" } }),
    db.game.count({
      where: { status: { in: ["ACTIVE", "PAUSED"] } },
    }),
  ]);

  const weekOverWeekGrowth =
    newPersonsLastWeek > 0
      ? ((newPersonsThisWeek - newPersonsLastWeek) / newPersonsLastWeek) * 100
      : newPersonsThisWeek > 0
        ? 100
        : 0;

  return {
    totalClubs,
    activeClubsThisWeek,
    totalPersons,
    newPersonsThisWeek,
    newPersonsThisMonth,
    totalGamesAllTime,
    activeGamesRightNow,
    weekOverWeekGrowth: Math.round(weekOverWeekGrowth * 10) / 10,
  };
}

export async function getClubsOverview(
  options: { limit?: number; offset?: number; search?: string } = {}
) {
  const { limit = 20, offset = 0, search } = options;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  const [clubs, total] = await Promise.all([
    db.club.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
        games: {
          where: { status: "COMPLETED" },
          select: { id: true },
        },
        aiUsageLogs: {
          where: { createdAt: { gte: monthStart } },
          select: { costUsd: true },
        },
      },
    }),
    db.club.count({ where }),
  ]);

  // Get last active game per club
  const clubIds = clubs.map((c) => c.id);
  const lastGames = await db.game.findMany({
    where: { clubId: { in: clubIds }, startedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    distinct: ["clubId"],
    select: { clubId: true, startedAt: true },
  });
  const lastActiveMap = new Map(
    lastGames.map((g) => [g.clubId, g.startedAt])
  );

  const items = clubs.map((club) => ({
    id: club.id,
    name: club.name,
    slug: club.slug,
    clubType: club.clubType,
    planTier: club.planTier,
    isActive: club.isActive,
    memberCount: club.memberships.length,
    lastActiveAt: lastActiveMap.get(club.id) ?? null,
    thisMonthAiSpend: club.aiUsageLogs.reduce(
      (sum, log) => sum + log.costUsd,
      0
    ),
    gamesAllTime: club.games.length,
  }));

  return { items, total, limit, offset };
}

export async function getClubDetail(clubId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [club, members, seasons, recentGames, financials, featureFlags, aiUsage, errorCount] =
    await Promise.all([
      db.club.findUniqueOrThrow({
        where: { id: clubId },
      }),
      db.membership.findMany({
        where: { clubId },
        include: {
          person: {
            select: { id: true, displayName: true, phone: true, avatarUrl: true },
          },
        },
        orderBy: { joinedAt: "desc" },
      }),
      db.season.findMany({
        where: { clubId },
        orderBy: { startDate: "desc" },
      }),
      db.game.findMany({
        where: { clubId, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 5,
        include: {
          gameSessions: {
            where: { finishPosition: { not: null } },
            orderBy: { finishPosition: "asc" },
            take: 3,
            include: {
              person: { select: { id: true, displayName: true } },
            },
          },
        },
      }),
      db.transaction.aggregate({
        where: { clubId, type: "BUY_IN" },
        _sum: { amount: true },
      }),
      db.clubFeatureFlag.findMany({
        where: { clubId },
      }),
      db.aIUsageLog.findMany({
        where: { clubId, createdAt: { gte: thirtyDaysAgo } },
        select: { feature: true, costUsd: true, tokensIn: true, tokensOut: true },
      }),
      db.errorLog.count({
        where: { clubId, createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

  return {
    club,
    members: members.map((m) => ({
      id: m.id,
      personId: m.personId,
      displayName: m.person.displayName,
      avatarUrl: m.person.avatarUrl,
      systemRole: m.systemRole,
      memberType: m.memberType,
      status: m.status,
      joinedAt: m.joinedAt,
    })),
    seasons,
    recentGames: recentGames.map((g) => ({
      id: g.id,
      startedAt: g.startedAt,
      completedAt: g.completedAt,
      playersRegistered: g.playersRegistered,
      prizePool: g.prizePool,
      topFinishers: g.gameSessions.map((s) => ({
        position: s.finishPosition,
        displayName: s.person.displayName,
        payout: s.payout,
      })),
    })),
    totalBuyInsCollected: financials._sum.amount ?? 0,
    featureFlags,
    aiUsageLast30d: {
      totalCost: aiUsage.reduce((sum, l) => sum + l.costUsd, 0),
      totalTokensIn: aiUsage.reduce((sum, l) => sum + l.tokensIn, 0),
      totalTokensOut: aiUsage.reduce((sum, l) => sum + l.tokensOut, 0),
      byFeature: Object.entries(
        aiUsage.reduce(
          (acc, l) => {
            acc[l.feature] = (acc[l.feature] ?? 0) + l.costUsd;
            return acc;
          },
          {} as Record<string, number>
        )
      )
        .map(([feature, costUsd]) => ({ feature, costUsd }))
        .sort((a, b) => b.costUsd - a.costUsd),
    },
    errorCountLast7d: errorCount,
  };
}

export async function getErrorFeed(
  options: {
    severity?: string;
    resolved?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { severity, resolved, limit = 50, offset = 0 } = options;

  const where: any = {};
  if (severity) where.severity = severity;
  if (resolved === "true") where.resolvedAt = { not: null };
  if (resolved === "false") where.resolvedAt = null;

  const [entries, total] = await Promise.all([
    db.errorLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        club: { select: { id: true, name: true } },
      },
    }),
    db.errorLog.count({ where }),
  ]);

  return {
    entries: entries.map((e) => ({
      id: e.id,
      severity: e.severity,
      errorType: e.errorType,
      message: e.message,
      route: e.route,
      clubId: e.clubId,
      clubName: e.club?.name ?? null,
      createdAt: e.createdAt,
      resolvedAt: e.resolvedAt,
    })),
    total,
    limit,
    offset,
  };
}

export async function resolveError(errorLogId: string, actorId: string) {
  const updated = await db.errorLog.update({
    where: { id: errorLogId },
    data: { resolvedAt: new Date() },
    include: {
      club: { select: { id: true, name: true } },
    },
  });
  return updated;
}

export async function getAiUsageSummary(
  options: { period?: "day" | "week" | "month" } = {}
) {
  const { period = "month" } = options;

  const now = new Date();
  let since: Date;
  let daysInPeriod: number;

  switch (period) {
    case "day":
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      daysInPeriod = 1;
      break;
    case "week":
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      daysInPeriod = 7;
      break;
    case "month":
    default:
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      daysInPeriod = 30;
      break;
  }

  const logs = await db.aIUsageLog.findMany({
    where: { createdAt: { gte: since } },
    include: {
      club: { select: { id: true, name: true } },
    },
  });

  const totalTokensIn = logs.reduce((sum, l) => sum + l.tokensIn, 0);
  const totalTokensOut = logs.reduce((sum, l) => sum + l.tokensOut, 0);
  const totalCostUsd = logs.reduce((sum, l) => sum + l.costUsd, 0);

  // Breakdown by feature
  const featureMap = new Map<string, { tokens: number; costUsd: number }>();
  for (const log of logs) {
    const existing = featureMap.get(log.feature) ?? { tokens: 0, costUsd: 0 };
    existing.tokens += log.tokensIn + log.tokensOut;
    existing.costUsd += log.costUsd;
    featureMap.set(log.feature, existing);
  }
  const byFeature = Array.from(featureMap.entries())
    .map(([feature, data]) => ({ feature, ...data }))
    .sort((a, b) => b.costUsd - a.costUsd);

  // Breakdown by club — top 10
  const clubMap = new Map<string, { clubId: string; clubName: string; costUsd: number }>();
  for (const log of logs) {
    if (!log.clubId) continue;
    const key = log.clubId;
    const existing = clubMap.get(key) ?? {
      clubId: log.clubId,
      clubName: log.club?.name ?? "Unknown",
      costUsd: 0,
    };
    existing.costUsd += log.costUsd;
    clubMap.set(key, existing);
  }
  const byClub = Array.from(clubMap.values())
    .sort((a, b) => b.costUsd - a.costUsd)
    .slice(0, 10);

  const dailyBurnRate = totalCostUsd / daysInPeriod;
  const projectedMonthly = dailyBurnRate * 30;

  return {
    period,
    totalTokensIn,
    totalTokensOut,
    totalCostUsd: Math.round(totalCostUsd * 100) / 100,
    byFeature,
    byClub,
    dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
    projectedMonthly: Math.round(projectedMonthly * 100) / 100,
    budgetAlert: projectedMonthly > 500,
  };
}

export async function getGrowthStats() {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    newThisWeek,
    newLastWeek,
    newThisMonth,
    newLastMonth,
    topReferrers,
    referralEvents,
    clubsThisMonth,
    personsThisMonth,
    totalPageViews,
  ] = await Promise.all([
    db.person.count(),
    db.person.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    db.person.count({
      where: { createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo } },
    }),
    db.person.count({ where: { createdAt: { gte: oneMonthAgo } } }),
    db.person.count({
      where: { createdAt: { gte: twoMonthsAgo, lt: oneMonthAgo } },
    }),
    db.referralCode.findMany({
      where: { totalReferrals: { gt: 0 } },
      orderBy: { totalReferrals: "desc" },
      take: 10,
      include: {
        person: { select: { id: true, displayName: true } },
      },
    }),
    db.referralEvent.findMany({
      select: {
        source: true,
        locationState: true,
        linkTappedAt: true,
        rsvpAt: true,
        accountCreatedAt: true,
        firstGameAt: true,
        active30dAt: true,
      },
    }),
    db.club.count({ where: { createdAt: { gte: monthStart } } }),
    db.person.count({ where: { createdAt: { gte: monthStart } } }),
    db.pageViewLog.count(),
  ]);

  const weeklyGrowthRate =
    newLastWeek > 0
      ? ((newThisWeek - newLastWeek) / newLastWeek) * 100
      : newThisWeek > 0
        ? 100
        : 0;

  const monthlyGrowthRate =
    newLastMonth > 0
      ? ((newThisMonth - newLastMonth) / newLastMonth) * 100
      : newThisMonth > 0
        ? 100
        : 0;

  // Referral source breakdown
  const referralSourceBreakdown: Record<string, number> = {};
  for (const e of referralEvents) {
    referralSourceBreakdown[e.source] =
      (referralSourceBreakdown[e.source] ?? 0) + 1;
  }

  // Geographic spread — top 10 states
  const stateMap = new Map<string, number>();
  for (const e of referralEvents) {
    if (e.locationState) {
      stateMap.set(e.locationState, (stateMap.get(e.locationState) ?? 0) + 1);
    }
  }
  const geographicSpread = Array.from(stateMap.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Conversion funnel
  const conversionFunnel = {
    totalPageViews,
    linkTaps: referralEvents.length,
    rsvps: referralEvents.filter((e) => e.rsvpAt).length,
    accountsCreated: referralEvents.filter((e) => e.accountCreatedAt).length,
    firstGames: referralEvents.filter((e) => e.firstGameAt).length,
    active30d: referralEvents.filter((e) => e.active30dAt).length,
    conversionRate: totalPageViews > 0
      ? Math.round((totalUsers / totalPageViews) * 100 * 10) / 10
      : 0,
  };

  const clubFormationRate =
    personsThisMonth > 0
      ? Math.round((clubsThisMonth / personsThisMonth) * 100 * 10) / 10
      : 0;

  return {
    totalUsers,
    weeklyGrowthRate: Math.round(weeklyGrowthRate * 10) / 10,
    monthlyGrowthRate: Math.round(monthlyGrowthRate * 10) / 10,
    topReferrers: topReferrers.map((r) => ({
      displayName: r.person.displayName,
      totalReferrals: r.totalReferrals,
      code: r.code,
    })),
    referralSourceBreakdown,
    geographicSpread,
    conversionFunnel,
    clubFormationRate,
    cohortRetention: {
      day30: null,
      day60: null,
      day90: null,
      note: "Requires cohort analysis - implement when data matures",
    },
  };
}

// ─── STEP 2: FEATURE FLAG ADMIN ─────────────────────────────────────────────

export async function getAllFeatureFlags() {
  const [flags, overrideCounts] = await Promise.all([
    db.globalFeatureFlag.findMany({
      orderBy: { featureKey: "asc" },
    }),
    db.clubFeatureFlag.groupBy({
      by: ["featureKey"],
      _count: { id: true },
    }),
  ]);

  const overrideMap = new Map(
    overrideCounts.map((o) => [o.featureKey, o._count.id])
  );

  return flags.map((f) => ({
    ...f,
    clubOverrideCount: overrideMap.get(f.featureKey) ?? 0,
  }));
}

export async function updateGlobalFeatureFlag(
  featureKey: string,
  state: "GLOBALLY_ON" | "CLUB_CONFIGURABLE" | "GLOBALLY_OFF",
  updatedBy: string
) {
  const updated = await db.globalFeatureFlag.update({
    where: { featureKey },
    data: { state, updatedBy },
  });

  // If kill switch: log it as P1_HIGH
  if (state === "GLOBALLY_OFF") {
    await db.errorLog.create({
      data: {
        severity: "P1_HIGH",
        errorType: "FEATURE_KILLED",
        message: `Feature [${featureKey}] globally disabled by super admin`,
        route: "super_admin",
      },
    });
  }

  // Invalidate cache for ALL clubs — get all club-level overrides plus wildcard
  const clubOverrides = await db.clubFeatureFlag.findMany({
    where: { featureKey },
    select: { clubId: true },
  });
  for (const override of clubOverrides) {
    invalidateFeatureCache(override.clubId, featureKey);
  }
  // Also invalidate any cached entries from clubs without overrides
  // by clearing with a wildcard-like approach: clear the cache for all known clubs
  const allClubs = await db.club.findMany({ select: { id: true } });
  for (const club of allClubs) {
    invalidateFeatureCache(club.id, featureKey);
  }

  return updated;
}

// ─── STEP 3: CLUB MANAGEMENT ────────────────────────────────────────────────

export async function approvePlanChange(
  clubId: string,
  newPlanTier: "FREE" | "STARTER" | "PRO" | "ENTERPRISE",
  actorId: string
) {
  const previousClub = await db.club.findUniqueOrThrow({
    where: { id: clubId },
    select: { planTier: true, planExpiresAt: true },
  });

  const planExpiresAt =
    newPlanTier === "FREE"
      ? null
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const updated = await db.club.update({
    where: { id: clubId },
    data: { planTier: newPlanTier, planExpiresAt },
  });

  await db.auditLog.create({
    data: {
      clubId,
      actorId,
      action: "UPDATE",
      entityType: "Club",
      entityId: clubId,
      previousValue: {
        planTier: previousClub.planTier,
        planExpiresAt: previousClub.planExpiresAt,
      },
      newValue: { planTier: newPlanTier, planExpiresAt },
      note: `Plan changed to ${newPlanTier} by super admin`,
    },
  });

  return updated;
}

export async function deactivateClub(
  clubId: string,
  reason: string,
  actorId: string
) {
  const updated = await db.club.update({
    where: { id: clubId },
    data: { isActive: false },
  });

  await db.auditLog.create({
    data: {
      clubId,
      actorId,
      action: "UPDATE",
      entityType: "Club",
      entityId: clubId,
      previousValue: { isActive: true },
      newValue: { isActive: false },
      note: `Club deactivated by super admin: ${reason}`,
    },
  });

  return updated;
}

export async function reactivateClub(clubId: string, actorId: string) {
  const updated = await db.club.update({
    where: { id: clubId },
    data: { isActive: true },
  });

  await db.auditLog.create({
    data: {
      clubId,
      actorId,
      action: "UPDATE",
      entityType: "Club",
      entityId: clubId,
      previousValue: { isActive: false },
      newValue: { isActive: true },
      note: "Club reactivated by super admin",
    },
  });

  return updated;
}
