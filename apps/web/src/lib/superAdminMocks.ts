// Super admin mock data — mirrors apps/api/src/lib/mockData.ts super admin functions

export function getMockSystemStatus() {
  return {
    totalClubs: 47,
    activeClubsThisWeek: 19,
    totalPersons: 1284,
    newPersonsThisWeek: 23,
    newPersonsThisMonth: 87,
    totalGamesAllTime: 412,
    activeGamesRightNow: 3,
    weekOverWeekGrowth: 8.3,
  };
}

export function getMockClubsOverview() {
  return {
    items: [
      {
        id: "mock-club-001",
        name: "Ron's Home Game",
        slug: "rons-home-game",
        clubType: "HOME_GAME",
        planTier: "PRO",
        isActive: true,
        memberCount: 12,
        lastActiveAt: "2026-02-21T23:00:00.000Z",
        thisMonthAiSpend: 8.45,
        gamesAllTime: 64,
      },
      {
        id: "mock-club-pub-001",
        name: "The Rusty Anchor Poker",
        slug: "rusty-anchor",
        clubType: "PUB_POKER",
        planTier: "ENTERPRISE",
        isActive: true,
        memberCount: 87,
        lastActiveAt: "2026-02-22T01:30:00.000Z",
        thisMonthAiSpend: 12.3,
        gamesAllTime: 156,
      },
      {
        id: "mock-club-003",
        name: "Downtown Degens",
        slug: "downtown-degens",
        clubType: "HOME_GAME",
        planTier: "STARTER",
        isActive: true,
        memberCount: 8,
        lastActiveAt: "2026-02-15T22:00:00.000Z",
        thisMonthAiSpend: 1.2,
        gamesAllTime: 31,
      },
      {
        id: "mock-club-pub-002",
        name: "Bayside Bar & Cards",
        slug: "bayside-cards",
        clubType: "PUB_POKER",
        planTier: "PRO",
        isActive: true,
        memberCount: 45,
        lastActiveAt: "2026-02-20T23:00:00.000Z",
        thisMonthAiSpend: 5.8,
        gamesAllTime: 89,
      },
      {
        id: "mock-club-004",
        name: "Dead Club Walking",
        slug: "dead-club",
        clubType: "HOME_GAME",
        planTier: "FREE",
        isActive: false,
        memberCount: 3,
        lastActiveAt: "2025-11-01T22:00:00.000Z",
        thisMonthAiSpend: 0,
        gamesAllTime: 7,
      },
    ],
    total: 47,
    limit: 20,
    offset: 0,
  };
}

export function getMockErrorFeed() {
  const now = new Date();
  return {
    entries: [
      {
        id: "mock-err-001",
        severity: "P0_CRITICAL",
        errorType: "AuthenticationError",
        message:
          "JWT verification failed — invalid signature on /auth/otp/verify",
        route: "/auth/otp/verify",
        clubId: null,
        clubName: null,
        createdAt: new Date(
          now.getTime() - 2 * 24 * 60 * 60 * 1000
        ).toISOString(),
        resolvedAt: new Date(
          now.getTime() - 1.5 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
      {
        id: "mock-err-002",
        severity: "P0_CRITICAL",
        errorType: "DatabaseError",
        message:
          "Connection pool exhausted — Neon Postgres timeout after 30s",
        route: "/games/mock-game-001/state",
        clubId: "mock-club-001",
        clubName: "Ron's Home Game",
        createdAt: new Date(
          now.getTime() - 5 * 24 * 60 * 60 * 1000
        ).toISOString(),
        resolvedAt: new Date(
          now.getTime() - 5 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000
        ).toISOString(),
      },
      {
        id: "mock-err-003",
        severity: "P1_HIGH",
        errorType: "ChipScanError",
        message: "Anthropic API returned 429 rate limit on chip scan",
        route: "/scanner/scan",
        clubId: "mock-club-pub-001",
        clubName: "The Rusty Anchor Poker",
        createdAt: new Date(
          now.getTime() - 1 * 24 * 60 * 60 * 1000
        ).toISOString(),
        resolvedAt: null,
      },
      {
        id: "mock-err-004",
        severity: "P1_HIGH",
        errorType: "TransactionError",
        message:
          "Duplicate buy-in detected for person mock-person-003 in game mock-game-042",
        route: "/games/mock-game-042/buy-in",
        clubId: "mock-club-003",
        clubName: "Downtown Degens",
        createdAt: new Date(
          now.getTime() - 3 * 24 * 60 * 60 * 1000
        ).toISOString(),
        resolvedAt: null,
      },
      {
        id: "mock-err-005",
        severity: "P1_HIGH",
        errorType: "NotificationError",
        message:
          "Twilio SMS delivery failed — invalid phone number format",
        route: "/events/mock-event-005/remind",
        clubId: "mock-club-pub-002",
        clubName: "Bayside Bar & Cards",
        createdAt: new Date(
          now.getTime() - 4 * 24 * 60 * 60 * 1000
        ).toISOString(),
        resolvedAt: null,
      },
      {
        id: "mock-err-006",
        severity: "P2_MEDIUM",
        errorType: "ValidationError",
        message:
          "Invalid blind structure level ordering — level 3 has lower blinds than level 2",
        route: "/clubs/mock-club-001/blind-structures",
        clubId: "mock-club-001",
        clubName: "Ron's Home Game",
        createdAt: new Date(
          now.getTime() - 6 * 24 * 60 * 60 * 1000
        ).toISOString(),
        resolvedAt: null,
      },
      {
        id: "mock-err-007",
        severity: "P2_MEDIUM",
        errorType: "TypeError",
        message:
          "Cannot read properties of undefined (reading 'displayName')",
        route: "/results/mock-game-038",
        clubId: "mock-club-003",
        clubName: "Downtown Degens",
        createdAt: new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        resolvedAt: null,
      },
      {
        id: "mock-err-008",
        severity: "P2_MEDIUM",
        errorType: "TimeoutError",
        message: "Request timeout after 10s on standings calculation",
        route: "/clubs/mock-club-pub-001/standings",
        clubId: "mock-club-pub-001",
        clubName: "The Rusty Anchor Poker",
        createdAt: new Date(
          now.getTime() - 8 * 24 * 60 * 60 * 1000
        ).toISOString(),
        resolvedAt: null,
      },
    ],
    total: 8,
    limit: 50,
    offset: 0,
  };
}

export function getMockAiUsageSummary() {
  return {
    period: "month" as const,
    totalTokensIn: 1_240_000,
    totalTokensOut: 380_000,
    totalCostUsd: 34.2,
    byFeature: [
      { feature: "chip_scanner", tokens: 980_000, costUsd: 22.1 },
      { feature: "ai_poker_coach", tokens: 420_000, costUsd: 8.5 },
      { feature: "game_recap", tokens: 180_000, costUsd: 2.8 },
      { feature: "hand_analysis", tokens: 40_000, costUsd: 0.8 },
    ],
    byClub: [
      {
        clubId: "mock-club-pub-001",
        clubName: "The Rusty Anchor Poker",
        costUsd: 12.3,
      },
      {
        clubId: "mock-club-001",
        clubName: "Ron's Home Game",
        costUsd: 8.45,
      },
      {
        clubId: "mock-club-pub-002",
        clubName: "Bayside Bar & Cards",
        costUsd: 5.8,
      },
    ],
    dailyBurnRate: 1.14,
    projectedMonthly: 34.2,
    budgetAlert: false,
  };
}

export function getMockGrowthStats() {
  return {
    totalUsers: 1284,
    weeklyGrowthRate: 8.3,
    monthlyGrowthRate: 14.2,
    topReferrers: [
      { displayName: "Ron", totalReferrals: 47, code: "RON2026" },
      { displayName: "Sarah", totalReferrals: 31, code: "SARAH_PKR" },
      { displayName: "Mike", totalReferrals: 24, code: "MIKEPOKER" },
      { displayName: "Dave", totalReferrals: 18, code: "DAVE_DEALS" },
      { displayName: "Jenny", totalReferrals: 12, code: "JEN_CARDS" },
    ],
    referralSourceBreakdown: {
      LINK: 482,
      QR_SCAN: 318,
      EVENT_INVITE: 264,
      ORGANIC: 220,
    },
    geographicSpread: [
      { state: "AL", count: 312 },
      { state: "FL", count: 198 },
      { state: "TX", count: 156 },
      { state: "GA", count: 89 },
      { state: "MS", count: 72 },
      { state: "LA", count: 64 },
      { state: "TN", count: 51 },
      { state: "SC", count: 38 },
      { state: "CA", count: 29 },
      { state: "NY", count: 22 },
    ],
    conversionFunnel: {
      linkTaps: 3420,
      rsvps: 1890,
      accountsCreated: 1284,
      firstGames: 876,
      active30d: 542,
    },
    clubFormationRate: 3.7,
    cohortRetention: {
      day30: null,
      day60: null,
      day90: null,
      note: "Requires cohort analysis - implement when data matures",
    },
  };
}

export function getMockSuperAdminFeatureFlags() {
  return [
    { featureKey: "clock_blind_timer", name: "Clock / Blind Timer", description: null, state: "GLOBALLY_ON", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 0 },
    { featureKey: "live_hud", name: "Live HUD", description: null, state: "GLOBALLY_ON", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 0 },
    { featureKey: "rsvp_system", name: "RSVP System", description: null, state: "GLOBALLY_ON", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 0 },
    { featureKey: "invites", name: "Invites", description: null, state: "GLOBALLY_ON", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 0 },
    { featureKey: "standings", name: "Standings", description: null, state: "GLOBALLY_ON", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 0 },
    { featureKey: "hand_rankings", name: "Hand Rankings", description: null, state: "CLUB_CONFIGURABLE", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 3 },
    { featureKey: "pot_odds_calculator", name: "Pot Odds Calculator", description: null, state: "CLUB_CONFIGURABLE", isContextLocked: true, contextNote: "Auto-disabled during active live game", updatedBy: null, clubOverrideCount: 7 },
    { featureKey: "in_app_holdem", name: "In-App Hold'em", description: null, state: "CLUB_CONFIGURABLE", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 12 },
    { featureKey: "ai_poker_coach", name: "AI Poker Coach", description: null, state: "CLUB_CONFIGURABLE", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 5 },
    { featureKey: "chat", name: "Chat", description: null, state: "CLUB_CONFIGURABLE", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 2 },
    { featureKey: "trophies", name: "Trophies", description: null, state: "CLUB_CONFIGURABLE", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 4 },
    { featureKey: "dues_tracking", name: "Dues Tracking", description: null, state: "CLUB_CONFIGURABLE", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 8 },
    { featureKey: "playbook", name: "Playbook / How-To", description: null, state: "CLUB_CONFIGURABLE", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 1 },
    { featureKey: "guest_access", name: "Guest Access", description: null, state: "CLUB_CONFIGURABLE", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 6 },
    { featureKey: "bonus_chips", name: "Bonus Chips (Pub Poker)", description: null, state: "CLUB_CONFIGURABLE", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 3 },
    { featureKey: "public_discovery", name: "Public Discovery", description: null, state: "CLUB_CONFIGURABLE", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 9 },
    { featureKey: "chip_scanner", name: "Chip Scanner", description: null, state: "CLUB_CONFIGURABLE", isContextLocked: false, contextNote: null, updatedBy: null, clubOverrideCount: 11 },
  ];
}
