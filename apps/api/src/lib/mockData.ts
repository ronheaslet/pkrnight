// Mock game state for frontend development when DB is unavailable.
// The /games/:gameId/state route returns this with header X-Mock-Data: true.

const now = new Date();
const levelStartedAt = new Date(now.getTime() - 8 * 60 * 1000); // 8 min ago

export const mockGameState = {
  game: {
    id: "mock-game-001",
    clubId: "mock-club-001",
    eventId: "mock-event-001",
    status: "ACTIVE" as const,
    currentLevel: 4,
    levelStartedAt: levelStartedAt.toISOString(),
    pausedAt: null,
    totalPausedMs: 0,
    playersRegistered: 9,
    playersRemaining: 7,
    prizePool: 450,
    totalRebuys: 3,
    totalAddOns: 0,
    buyInAmount: 50,
    rebuyAmount: 50,
    addOnAmount: 0,
    rebuyLimit: 1,
    bountyEnabled: false,
    bountyAmount: 0,
    startedAt: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
    completedAt: null,
  },
  currentLevel: {
    levelNumber: 4,
    smallBlind: 200,
    bigBlind: 400,
    ante: 50,
    durationMinutes: 20,
    isBreak: false,
    breakLabel: null,
  },
  nextLevel: {
    levelNumber: 5,
    smallBlind: 300,
    bigBlind: 600,
    ante: 75,
    durationMinutes: 20,
    isBreak: false,
    breakLabel: null,
  },
  timeRemainingMs: 12 * 60 * 1000, // 12 min remaining
  players: [
    {
      sessionId: "mock-session-001",
      personId: "mock-person-001",
      displayName: "Ron",
      avatarUrl: null,
      status: "ACTIVE",
      currentStack: 14500,
      startingStack: 10000,
      finishPosition: null,
      rebuys: 0,
      addOns: 0,
      bountiesWon: 0,
      payout: 0,
      pointsEarned: 0,
      totalPaid: 50,
      eliminatedAt: null,
      eliminatedBy: null,
    },
    {
      sessionId: "mock-session-002",
      personId: "mock-person-002",
      displayName: "Mike",
      avatarUrl: null,
      status: "ACTIVE",
      currentStack: 8200,
      startingStack: 10000,
      finishPosition: null,
      rebuys: 0,
      addOns: 0,
      bountiesWon: 0,
      payout: 0,
      pointsEarned: 0,
      totalPaid: 50,
      eliminatedAt: null,
      eliminatedBy: null,
    },
    {
      sessionId: "mock-session-003",
      personId: "mock-person-003",
      displayName: "Sarah",
      avatarUrl: null,
      status: "ACTIVE",
      currentStack: 21000,
      startingStack: 10000,
      finishPosition: null,
      rebuys: 1,
      addOns: 0,
      bountiesWon: 0,
      payout: 0,
      pointsEarned: 0,
      totalPaid: 100,
      eliminatedAt: null,
      eliminatedBy: null,
    },
    {
      sessionId: "mock-session-004",
      personId: "mock-person-004",
      displayName: "Dave",
      avatarUrl: null,
      status: "ACTIVE",
      currentStack: 6500,
      startingStack: 10000,
      finishPosition: null,
      rebuys: 0,
      addOns: 0,
      bountiesWon: 0,
      payout: 0,
      pointsEarned: 0,
      totalPaid: 50,
      eliminatedAt: null,
      eliminatedBy: null,
    },
    {
      sessionId: "mock-session-005",
      personId: "mock-person-005",
      displayName: "Jenny",
      avatarUrl: null,
      status: "ACTIVE",
      currentStack: 12800,
      startingStack: 10000,
      finishPosition: null,
      rebuys: 0,
      addOns: 0,
      bountiesWon: 0,
      payout: 0,
      pointsEarned: 0,
      totalPaid: 50,
      eliminatedAt: null,
      eliminatedBy: null,
    },
    {
      sessionId: "mock-session-006",
      personId: "mock-person-006",
      displayName: "Tom",
      avatarUrl: null,
      status: "ACTIVE",
      currentStack: 9500,
      startingStack: 10000,
      finishPosition: null,
      rebuys: 1,
      addOns: 0,
      bountiesWon: 0,
      payout: 0,
      pointsEarned: 0,
      totalPaid: 100,
      eliminatedAt: null,
      eliminatedBy: null,
    },
    {
      sessionId: "mock-session-007",
      personId: "mock-person-007",
      displayName: "Alex",
      avatarUrl: null,
      status: "ACTIVE",
      currentStack: 17500,
      startingStack: 10000,
      finishPosition: null,
      rebuys: 1,
      addOns: 0,
      bountiesWon: 0,
      payout: 0,
      pointsEarned: 0,
      totalPaid: 100,
      eliminatedAt: null,
      eliminatedBy: null,
    },
    {
      sessionId: "mock-session-008",
      personId: "mock-person-008",
      displayName: "Chris",
      avatarUrl: null,
      status: "ELIMINATED",
      currentStack: 0,
      startingStack: 10000,
      finishPosition: 9,
      rebuys: 0,
      addOns: 0,
      bountiesWon: 0,
      payout: 0,
      pointsEarned: 0,
      totalPaid: 50,
      eliminatedAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
      eliminatedBy: "mock-person-003",
    },
    {
      sessionId: "mock-session-009",
      personId: "mock-person-009",
      displayName: "Pat",
      avatarUrl: null,
      status: "ELIMINATED",
      currentStack: 0,
      startingStack: 10000,
      finishPosition: 8,
      rebuys: 0,
      addOns: 0,
      bountiesWon: 0,
      payout: 0,
      pointsEarned: 0,
      totalPaid: 50,
      eliminatedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      eliminatedBy: "mock-person-001",
    },
  ],
  playersRemaining: 7,
  chipSet: {
    id: "mock-chipset-001",
    name: "Standard Tournament",
    mode: "TOURNAMENT",
    denominations: [
      { id: "d1", colorName: "White", colorHex: "#FFFFFF", value: 25, sortOrder: 0 },
      { id: "d2", colorName: "Red", colorHex: "#EF4444", value: 50, sortOrder: 1 },
      { id: "d3", colorName: "Green", colorHex: "#22C55E", value: 100, sortOrder: 2 },
      { id: "d4", colorName: "Blue", colorHex: "#3B82F6", value: 500, sortOrder: 3 },
      { id: "d5", colorName: "Black", colorHex: "#1F2937", value: 1000, sortOrder: 4 },
    ],
  },
  blindStructure: {
    id: "mock-bs-001",
    name: "Standard 20-min",
    levels: [
      { levelNumber: 1, smallBlind: 25, bigBlind: 50, ante: 0, durationMinutes: 20, isBreak: false, breakLabel: null },
      { levelNumber: 2, smallBlind: 50, bigBlind: 100, ante: 0, durationMinutes: 20, isBreak: false, breakLabel: null },
      { levelNumber: 3, smallBlind: 100, bigBlind: 200, ante: 25, durationMinutes: 20, isBreak: false, breakLabel: null },
      { levelNumber: 4, smallBlind: 200, bigBlind: 400, ante: 50, durationMinutes: 20, isBreak: false, breakLabel: null },
      { levelNumber: 5, smallBlind: 300, bigBlind: 600, ante: 75, durationMinutes: 20, isBreak: false, breakLabel: null },
      { levelNumber: 6, smallBlind: 0, bigBlind: 0, ante: 0, durationMinutes: 10, isBreak: true, breakLabel: "10-Minute Break" },
      { levelNumber: 7, smallBlind: 500, bigBlind: 1000, ante: 100, durationMinutes: 20, isBreak: false, breakLabel: null },
      { levelNumber: 8, smallBlind: 750, bigBlind: 1500, ante: 150, durationMinutes: 20, isBreak: false, breakLabel: null },
      { levelNumber: 9, smallBlind: 1000, bigBlind: 2000, ante: 200, durationMinutes: 20, isBreak: false, breakLabel: null },
      { levelNumber: 10, smallBlind: 1500, bigBlind: 3000, ante: 300, durationMinutes: 15, isBreak: false, breakLabel: null },
    ],
  },
};

export function getMockGameState() {
  // Recalculate timeRemainingMs to keep it dynamic
  const levelStart = new Date(mockGameState.game.levelStartedAt!);
  const elapsed = Date.now() - levelStart.getTime();
  const levelDurationMs = mockGameState.currentLevel.durationMinutes * 60 * 1000;
  const timeRemainingMs = Math.max(0, levelDurationMs - elapsed);

  return {
    ...mockGameState,
    timeRemainingMs,
  };
}

// ============================================================
// PHASE 3 — Club & Member Mock Data
// ============================================================

export function getMockClub() {
  return {
    id: "mock-club-001",
    name: "Ron's Home Game",
    slug: "rons-home-game",
    clubType: "HOME_GAME",
    planTier: "FREE",
    brandingKey: "mock-branding-001",
    logoUrl: null,
    primaryColor: "#22c55e",
    accentColor: "#3b82f6",
    tagline: "Friday night poker with the crew",
    customDomain: null,
    timezone: "America/New_York",
    isActive: true,
    isPublic: false,
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2026-02-22T00:00:00.000Z",
    venueProfile: null,
    memberCount: 6,
  };
}

export function getMockMembers() {
  return [
    {
      id: "mock-membership-001",
      personId: "mock-person-001",
      displayName: "Ron",
      phone: "+14155551001",
      avatarUrl: null,
      systemRole: "OWNER",
      memberType: "PAID",
      status: "ACTIVE",
      joinedAt: "2025-01-15T00:00:00.000Z",
      specialRoles: [
        { id: "mock-role-td", name: "Tournament Director", emoji: "\u{1F3C6}" },
      ],
    },
    {
      id: "mock-membership-002",
      personId: "mock-person-002",
      displayName: "Mike",
      phone: "+14155551002",
      avatarUrl: null,
      systemRole: "ADMIN",
      memberType: "PAID",
      status: "ACTIVE",
      joinedAt: "2025-01-20T00:00:00.000Z",
      specialRoles: [
        { id: "mock-role-acct", name: "Accountant", emoji: "\u{1F4CA}" },
      ],
    },
    {
      id: "mock-membership-003",
      personId: "mock-person-003",
      displayName: "Sarah",
      phone: "+14155551003",
      avatarUrl: null,
      systemRole: "MEMBER",
      memberType: "PAID",
      status: "ACTIVE",
      joinedAt: "2025-02-01T00:00:00.000Z",
      specialRoles: [],
    },
    {
      id: "mock-membership-004",
      personId: "mock-person-004",
      displayName: "Dave",
      phone: "+14155551004",
      avatarUrl: null,
      systemRole: "MEMBER",
      memberType: "PAID",
      status: "ACTIVE",
      joinedAt: "2025-02-10T00:00:00.000Z",
      specialRoles: [
        { id: "mock-role-dealer", name: "Dealer", emoji: "\u{1F0CF}" },
      ],
    },
    {
      id: "mock-membership-005",
      personId: "mock-person-005",
      displayName: "Jenny",
      phone: "+14155551005",
      avatarUrl: null,
      systemRole: "MEMBER",
      memberType: "PAID",
      status: "ACTIVE",
      joinedAt: "2025-03-01T00:00:00.000Z",
      specialRoles: [],
    },
    {
      id: "mock-membership-006",
      personId: "mock-person-006",
      displayName: "Tom",
      phone: "+14155551006",
      avatarUrl: null,
      systemRole: "MEMBER",
      memberType: "GUEST",
      status: "ACTIVE",
      joinedAt: "2025-04-01T00:00:00.000Z",
      specialRoles: [],
    },
  ];
}

export function getMockFeatureFlags() {
  return [
    { featureKey: "clock_blind_timer", name: "Clock / Blind Timer", description: null, globalState: "GLOBALLY_ON", clubEnabled: true, isContextLocked: false, contextNote: null },
    { featureKey: "live_hud", name: "Live HUD", description: null, globalState: "GLOBALLY_ON", clubEnabled: true, isContextLocked: false, contextNote: null },
    { featureKey: "rsvp_system", name: "RSVP System", description: null, globalState: "GLOBALLY_ON", clubEnabled: true, isContextLocked: false, contextNote: null },
    { featureKey: "invites", name: "Invites", description: null, globalState: "GLOBALLY_ON", clubEnabled: true, isContextLocked: false, contextNote: null },
    { featureKey: "standings", name: "Standings", description: null, globalState: "GLOBALLY_ON", clubEnabled: true, isContextLocked: false, contextNote: null },
    { featureKey: "hand_rankings", name: "Hand Rankings", description: null, globalState: "CLUB_CONFIGURABLE", clubEnabled: true, isContextLocked: false, contextNote: null },
    { featureKey: "pot_odds_calculator", name: "Pot Odds Calculator", description: null, globalState: "CLUB_CONFIGURABLE", clubEnabled: true, isContextLocked: true, contextNote: "Auto-disabled during active live game" },
    { featureKey: "in_app_holdem", name: "In-App Hold'em", description: null, globalState: "CLUB_CONFIGURABLE", clubEnabled: false, isContextLocked: false, contextNote: null },
    { featureKey: "ai_poker_coach", name: "AI Poker Coach", description: null, globalState: "CLUB_CONFIGURABLE", clubEnabled: true, isContextLocked: false, contextNote: null },
    { featureKey: "chat", name: "Chat", description: null, globalState: "CLUB_CONFIGURABLE", clubEnabled: true, isContextLocked: false, contextNote: null },
    { featureKey: "trophies", name: "Trophies", description: null, globalState: "CLUB_CONFIGURABLE", clubEnabled: true, isContextLocked: false, contextNote: null },
    { featureKey: "dues_tracking", name: "Dues Tracking", description: null, globalState: "CLUB_CONFIGURABLE", clubEnabled: true, isContextLocked: false, contextNote: null },
    { featureKey: "playbook", name: "Playbook / How-To", description: null, globalState: "CLUB_CONFIGURABLE", clubEnabled: false, isContextLocked: false, contextNote: null },
    { featureKey: "guest_access", name: "Guest Access", description: null, globalState: "CLUB_CONFIGURABLE", clubEnabled: true, isContextLocked: false, contextNote: null },
    { featureKey: "bonus_chips", name: "Bonus Chips (Pub Poker)", description: null, globalState: "CLUB_CONFIGURABLE", clubEnabled: false, isContextLocked: false, contextNote: null },
    { featureKey: "public_discovery", name: "Public Discovery", description: null, globalState: "CLUB_CONFIGURABLE", clubEnabled: false, isContextLocked: false, contextNote: null },
    { featureKey: "chip_scanner", name: "Chip Scanner", description: null, globalState: "CLUB_CONFIGURABLE", clubEnabled: true, isContextLocked: false, contextNote: null },
  ];
}

export function getMockCustomRoles() {
  return [
    { id: "mock-role-acct", clubId: "mock-club-001", name: "Accountant", emoji: "\u{1F4CA}", description: "Finance management", isSystem: true, manageMoney: true, postTransactions: true, viewFinancials: true, exportReports: true, viewAuditLog: true },
    { id: "mock-role-sgt", clubId: "mock-club-001", name: "Sergeant at Arms", emoji: "\u{1F6E1}\uFE0F", description: "Game enforcement", isSystem: true, pauseTimer: true, startGame: true, eliminatePlayers: true, issuePenalties: true },
    { id: "mock-role-dealer", clubId: "mock-club-001", name: "Dealer", emoji: "\u{1F0CF}", description: "Deals cards, manages timer", isSystem: true, pauseTimer: true, levelOverride: true },
    { id: "mock-role-rebuy", clubId: "mock-club-001", name: "Rebuy Handler", emoji: "\u{1F504}", description: "Handles rebuys and add-ons", isSystem: true, manageRebuys: true },
    { id: "mock-role-td", clubId: "mock-club-001", name: "Tournament Director", emoji: "\u{1F3C6}", description: "Full tournament control", isSystem: true, startGame: true, pauseTimer: true, eliminatePlayers: true, issuePenalties: true, pauseAllTables: true, clubWideAnnounce: true },
    { id: "mock-role-food", clubId: "mock-club-001", name: "Food & Drinks Coordinator", emoji: "\u{1F355}", description: "Manages food and drink expenses", isSystem: true, postExpenseOnly: true },
    { id: "mock-role-social", clubId: "mock-club-001", name: "Social Media Manager", emoji: "\u{1F4F8}", description: "Posts to club feed", isSystem: true, postToFeed: true },
    { id: "mock-role-comm", clubId: "mock-club-001", name: "Commissioner", emoji: "\u{1F3AF}", description: "Honorary badge \u2014 no special permissions", isSystem: true },
  ];
}

export function getMockClubsForUser() {
  return [
    {
      club: getMockClub(),
      systemRole: "OWNER",
      memberCount: 6,
    },
  ];
}

// ============================================================
// PHASE 4 — Event, RSVP & Location Mock Data
// ============================================================

function getNextSaturday7pm(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (6 - day + 7) % 7 || 7; // next Saturday
  d.setDate(d.getDate() + diff);
  d.setHours(19, 0, 0, 0);
  return d.toISOString();
}

function getLastSaturday7pm(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day + 1) % 7 || 7; // last Saturday
  d.setDate(d.getDate() - diff);
  d.setHours(19, 0, 0, 0);
  return d.toISOString();
}

export function getMockSavedLocations() {
  return [
    {
      id: "mock-location-001",
      clubId: "mock-club-001",
      name: "Ron's Place",
      address: "123 Main St, Anytown, USA",
      lat: 40.7128,
      lng: -74.006,
      createdAt: "2025-01-15T00:00:00.000Z",
    },
  ];
}

export function getMockEvents() {
  const upcomingDate = getNextSaturday7pm();
  const completedDate = getLastSaturday7pm();

  return [
    {
      id: "mock-event-001",
      clubId: "mock-club-001",
      seasonId: null,
      createdBy: "mock-person-001",
      title: "Saturday Night Poker",
      description: "Weekly poker night at Ron's place. Bring snacks!",
      status: "PUBLISHED",
      startsAt: upcomingDate,
      endsAt: null,
      savedLocationId: "mock-location-001",
      savedLocation: getMockSavedLocations()[0],
      locationName: null,
      locationAddress: null,
      locationLat: null,
      locationLng: null,
      buyInAmount: 50,
      rebuyAmount: 50,
      addOnAmount: 0,
      rebuyLimit: 1,
      addOnAllowed: false,
      addOnCutoffLevel: null,
      bountyEnabled: false,
      bountyAmount: 0,
      guestEligible: true,
      maxPlayers: 10,
      blindStructureId: "mock-bs-001",
      chipSetId: "mock-chipset-001",
      reminder48h: true,
      reminder24h: true,
      reminder2h: true,
      createdAt: "2026-02-20T12:00:00.000Z",
      updatedAt: "2026-02-20T12:00:00.000Z",
      game: null,
      rsvpCounts: { going: 6, notGoing: 1, maybe: 2, pending: 3 },
    },
    {
      id: "mock-event-002",
      clubId: "mock-club-001",
      seasonId: null,
      createdBy: "mock-person-001",
      title: "High Stakes Friday",
      description: "Higher buy-in for those who want more action.",
      status: "DRAFT",
      startsAt: new Date(
        new Date(upcomingDate).getTime() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      endsAt: null,
      savedLocationId: "mock-location-001",
      savedLocation: getMockSavedLocations()[0],
      locationName: null,
      locationAddress: null,
      locationLat: null,
      locationLng: null,
      buyInAmount: 100,
      rebuyAmount: 100,
      addOnAmount: 50,
      rebuyLimit: 2,
      addOnAllowed: true,
      addOnCutoffLevel: 6,
      bountyEnabled: true,
      bountyAmount: 10,
      guestEligible: false,
      maxPlayers: 9,
      blindStructureId: "mock-bs-001",
      chipSetId: "mock-chipset-001",
      reminder48h: true,
      reminder24h: true,
      reminder2h: true,
      createdAt: "2026-02-21T10:00:00.000Z",
      updatedAt: "2026-02-21T10:00:00.000Z",
      game: null,
      rsvpCounts: { going: 0, notGoing: 0, maybe: 0, pending: 6 },
    },
    {
      id: "mock-event-003",
      clubId: "mock-club-001",
      seasonId: null,
      createdBy: "mock-person-001",
      title: "Last Week's Game",
      description: "Great game last week!",
      status: "COMPLETED",
      startsAt: completedDate,
      endsAt: new Date(
        new Date(completedDate).getTime() + 5 * 60 * 60 * 1000
      ).toISOString(),
      savedLocationId: "mock-location-001",
      savedLocation: getMockSavedLocations()[0],
      locationName: null,
      locationAddress: null,
      locationLat: null,
      locationLng: null,
      buyInAmount: 50,
      rebuyAmount: 50,
      addOnAmount: 0,
      rebuyLimit: 1,
      addOnAllowed: false,
      addOnCutoffLevel: null,
      bountyEnabled: false,
      bountyAmount: 0,
      guestEligible: true,
      maxPlayers: 10,
      blindStructureId: "mock-bs-001",
      chipSetId: "mock-chipset-001",
      reminder48h: true,
      reminder24h: true,
      reminder2h: true,
      createdAt: "2026-02-13T12:00:00.000Z",
      updatedAt: completedDate,
      game: { id: "mock-game-001", status: "COMPLETED" },
      rsvpCounts: { going: 9, notGoing: 1, maybe: 0, pending: 0 },
    },
  ];
}

export function getMockRsvps(eventId: string) {
  const members = getMockMembers();
  if (eventId !== "mock-event-001") {
    return {
      going: [],
      notGoing: [],
      maybe: [],
      pending: members.map((m) => ({
        id: `rsvp-${m.id}`,
        eventId,
        membershipId: m.id,
        guestToken: null,
        guestName: null,
        guestPhone: null,
        status: "PENDING",
        respondedAt: null,
        membership: {
          person: { displayName: m.displayName, avatarUrl: m.avatarUrl },
        },
      })),
    };
  }

  return {
    going: [
      { id: "rsvp-001", eventId, membershipId: "mock-membership-001", guestToken: null, guestName: null, guestPhone: null, status: "GOING", respondedAt: "2026-02-20T14:00:00.000Z", membership: { person: { displayName: "Ron", avatarUrl: null } } },
      { id: "rsvp-002", eventId, membershipId: "mock-membership-002", guestToken: null, guestName: null, guestPhone: null, status: "GOING", respondedAt: "2026-02-20T15:00:00.000Z", membership: { person: { displayName: "Mike", avatarUrl: null } } },
      { id: "rsvp-003", eventId, membershipId: "mock-membership-003", guestToken: null, guestName: null, guestPhone: null, status: "GOING", respondedAt: "2026-02-20T16:00:00.000Z", membership: { person: { displayName: "Sarah", avatarUrl: null } } },
      { id: "rsvp-004", eventId, membershipId: "mock-membership-004", guestToken: null, guestName: null, guestPhone: null, status: "GOING", respondedAt: "2026-02-20T17:00:00.000Z", membership: { person: { displayName: "Dave", avatarUrl: null } } },
      { id: "rsvp-005", eventId, membershipId: "mock-membership-005", guestToken: null, guestName: null, guestPhone: null, status: "GOING", respondedAt: "2026-02-21T09:00:00.000Z", membership: { person: { displayName: "Jenny", avatarUrl: null } } },
      { id: "rsvp-006", eventId, membershipId: "mock-membership-006", guestToken: null, guestName: null, guestPhone: null, status: "GOING", respondedAt: "2026-02-21T10:00:00.000Z", membership: { person: { displayName: "Tom", avatarUrl: null } } },
    ],
    maybe: [
      { id: "rsvp-007", eventId, membershipId: null, guestToken: "guest-token-001", guestName: "Jake", guestPhone: "+14155559001", status: "MAYBE", respondedAt: "2026-02-21T11:00:00.000Z", membership: null },
      { id: "rsvp-008", eventId, membershipId: null, guestToken: "guest-token-002", guestName: "Lisa", guestPhone: "+14155559002", status: "MAYBE", respondedAt: "2026-02-21T12:00:00.000Z", membership: null },
    ],
    notGoing: [
      { id: "rsvp-009", eventId, membershipId: null, guestToken: "guest-token-003", guestName: "Brad", guestPhone: "+14155559003", status: "NOT_GOING", respondedAt: "2026-02-21T13:00:00.000Z", membership: null },
    ],
    pending: [
      { id: "rsvp-010", eventId, membershipId: null, guestToken: "guest-token-004", guestName: "New Guy", guestPhone: "+14155559004", status: "PENDING", respondedAt: null, membership: null },
      { id: "rsvp-011", eventId, membershipId: null, guestToken: "guest-token-005", guestName: "Amy", guestPhone: "+14155559005", status: "PENDING", respondedAt: null, membership: null },
      { id: "rsvp-012", eventId, membershipId: null, guestToken: "guest-token-006", guestName: "Carlos", guestPhone: "+14155559006", status: "PENDING", respondedAt: null, membership: null },
    ],
  };
}

export function getMockUpcomingWithRsvp() {
  const events = getMockEvents().filter(
    (e) => e.status === "PUBLISHED" && new Date(e.startsAt) > new Date()
  );
  return events.map((e) => ({
    ...e,
    myRsvpStatus: "GOING" as const,
  }));
}

export function getMockPayoutStructure(playerCount: number) {
  const prizePool = 450; // 9 * 50
  let tiers: number[];

  if (playerCount <= 1) return [];
  else if (playerCount <= 6) tiers = [100];
  else if (playerCount <= 9) tiers = [65, 35];
  else if (playerCount <= 14) tiers = [50, 30, 20];
  else if (playerCount <= 19) tiers = [45, 27, 18, 10];
  else tiers = [40, 25, 15, 11, 9];

  return tiers.map((pct, i) => ({
    position: i + 1,
    percentage: pct,
    amount: Math.round((prizePool * pct) / 100),
  }));
}

export function getMockGuestRsvpPage(guestToken: string) {
  const rsvps = getMockRsvps("mock-event-001");
  const allRsvps = [
    ...rsvps.going,
    ...rsvps.maybe,
    ...rsvps.notGoing,
    ...rsvps.pending,
  ];
  const rsvp = allRsvps.find((r) => r.guestToken === guestToken);

  if (!rsvp) return null;

  const event = getMockEvents()[0]!;
  return {
    event: {
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      buyInAmount: event.buyInAmount,
      locationAddress:
        event.savedLocation?.address ?? event.locationAddress ?? null,
      locationName:
        event.savedLocation?.name ?? event.locationName ?? null,
    },
    guestName: rsvp.guestName,
    rsvpStatus: rsvp.status,
  };
}

// ============================================================
// PHASE 6 — Accounting, Treasury, Dues, Balances, Audit Mock Data
// ============================================================

export function getMockGameSettlement() {
  const completedDate = getLastSaturday7pm();
  return {
    gameId: "mock-game-001",
    status: "COMPLETED",
    financialLockedAt: new Date(new Date(completedDate).getTime() + 6 * 60 * 60 * 1000).toISOString(),
    sessions: [
      { sessionId: "mock-session-001", personId: "mock-person-001", displayName: "Ron", avatarUrl: null, buyInPaid: true, rebuys: 0, addOns: 0, totalPaid: 50, payout: 280, finishPosition: 1, bountiesWon: 0, bountiesLost: 0, net: 230 },
      { sessionId: "mock-session-003", personId: "mock-person-003", displayName: "Sarah", avatarUrl: null, buyInPaid: true, rebuys: 1, addOns: 0, totalPaid: 100, payout: 168, finishPosition: 2, bountiesWon: 0, bountiesLost: 0, net: 68 },
      { sessionId: "mock-session-007", personId: "mock-person-007", displayName: "Alex", avatarUrl: null, buyInPaid: true, rebuys: 1, addOns: 0, totalPaid: 100, payout: 112, finishPosition: 3, bountiesWon: 0, bountiesLost: 0, net: 12 },
      { sessionId: "mock-session-005", personId: "mock-person-005", displayName: "Jenny", avatarUrl: null, buyInPaid: true, rebuys: 0, addOns: 0, totalPaid: 50, payout: 0, finishPosition: 4, bountiesWon: 0, bountiesLost: 0, net: -50 },
      { sessionId: "mock-session-002", personId: "mock-person-002", displayName: "Mike", avatarUrl: null, buyInPaid: true, rebuys: 0, addOns: 0, totalPaid: 50, payout: 0, finishPosition: 5, bountiesWon: 0, bountiesLost: 0, net: -50 },
      { sessionId: "mock-session-004", personId: "mock-person-004", displayName: "Dave", avatarUrl: null, buyInPaid: true, rebuys: 0, addOns: 0, totalPaid: 50, payout: 0, finishPosition: 6, bountiesWon: 0, bountiesLost: 0, net: -50 },
      { sessionId: "mock-session-006", personId: "mock-person-006", displayName: "Tom", avatarUrl: null, buyInPaid: true, rebuys: 1, addOns: 0, totalPaid: 100, payout: 0, finishPosition: 7, bountiesWon: 0, bountiesLost: 0, net: -100 },
      { sessionId: "mock-session-008", personId: "mock-person-008", displayName: "Chris", avatarUrl: null, buyInPaid: true, rebuys: 0, addOns: 0, totalPaid: 50, payout: 0, finishPosition: 9, bountiesWon: 0, bountiesLost: 0, net: -50 },
      { sessionId: "mock-session-009", personId: "mock-person-009", displayName: "Pat", avatarUrl: null, buyInPaid: true, rebuys: 0, addOns: 0, totalPaid: 50, payout: 0, finishPosition: 8, bountiesWon: 0, bountiesLost: 0, net: -50 },
    ],
    transactionsByType: {
      buyIns: [
        { id: "mock-tx-bi-001", personId: "mock-person-001", amount: 50, method: "cash", description: "Buy-in", createdAt: new Date(new Date(completedDate).getTime() + 0).toISOString() },
        { id: "mock-tx-bi-002", personId: "mock-person-002", amount: 50, method: "cash", description: "Buy-in", createdAt: new Date(new Date(completedDate).getTime() + 1000).toISOString() },
        { id: "mock-tx-bi-003", personId: "mock-person-003", amount: 50, method: "cash", description: "Buy-in", createdAt: new Date(new Date(completedDate).getTime() + 2000).toISOString() },
        { id: "mock-tx-bi-004", personId: "mock-person-004", amount: 50, method: "cash", description: "Buy-in", createdAt: new Date(new Date(completedDate).getTime() + 3000).toISOString() },
        { id: "mock-tx-bi-005", personId: "mock-person-005", amount: 50, method: "cash", description: "Buy-in", createdAt: new Date(new Date(completedDate).getTime() + 4000).toISOString() },
        { id: "mock-tx-bi-006", personId: "mock-person-006", amount: 50, method: "cash", description: "Buy-in", createdAt: new Date(new Date(completedDate).getTime() + 5000).toISOString() },
        { id: "mock-tx-bi-007", personId: "mock-person-007", amount: 50, method: "cash", description: "Buy-in", createdAt: new Date(new Date(completedDate).getTime() + 6000).toISOString() },
        { id: "mock-tx-bi-008", personId: "mock-person-008", amount: 50, method: "cash", description: "Buy-in", createdAt: new Date(new Date(completedDate).getTime() + 7000).toISOString() },
        { id: "mock-tx-bi-009", personId: "mock-person-009", amount: 50, method: "cash", description: "Buy-in", createdAt: new Date(new Date(completedDate).getTime() + 8000).toISOString() },
      ],
      rebuys: [
        { id: "mock-tx-rb-001", personId: "mock-person-003", amount: 50, method: "cash", description: "Rebuy #1", createdAt: new Date(new Date(completedDate).getTime() + 60 * 60 * 1000).toISOString() },
        { id: "mock-tx-rb-002", personId: "mock-person-006", amount: 50, method: "cash", description: "Rebuy #1", createdAt: new Date(new Date(completedDate).getTime() + 70 * 60 * 1000).toISOString() },
        { id: "mock-tx-rb-003", personId: "mock-person-007", amount: 50, method: "venmo", description: "Rebuy #1", createdAt: new Date(new Date(completedDate).getTime() + 80 * 60 * 1000).toISOString() },
      ],
      addOns: [],
      payouts: [
        { id: "mock-tx-po-001", personId: "mock-person-001", amount: 280, method: "cash", description: "1st place", createdAt: new Date(new Date(completedDate).getTime() + 5 * 60 * 60 * 1000).toISOString() },
        { id: "mock-tx-po-002", personId: "mock-person-003", amount: 168, method: "cash", description: "2nd place", createdAt: new Date(new Date(completedDate).getTime() + 5 * 60 * 60 * 1000 + 1000).toISOString() },
        { id: "mock-tx-po-003", personId: "mock-person-007", amount: 112, method: "cash", description: "3rd place", createdAt: new Date(new Date(completedDate).getTime() + 5 * 60 * 60 * 1000 + 2000).toISOString() },
      ],
      bounties: [],
      expenses: [
        { id: "mock-tx-ex-001", personId: null, amount: 40, method: "cash", description: "Pizza and drinks", createdAt: new Date(new Date(completedDate).getTime() + 2 * 60 * 60 * 1000).toISOString() },
      ],
    },
    prizePool: 600,
    totalRebuys: 3,
    totalAddOns: 0,
    moneyIn: 600,
    variance: 0,
    netPrizePool: 560,
    totalExpenses: 40,
    totalBounties: 0,
    totalPayouts: 560,
    isBalanced: true,
  };
}

export function getMockTreasury() {
  return {
    balance: {
      clubId: "mock-club-001",
      currentBalance: 1240,
      minimumReserve: 200,
      isLow: false,
      updatedAt: new Date().toISOString(),
    },
    ledger: {
      entries: [
        { id: "mock-ledger-001", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), type: "PAYOUT", category: "GAME", amount: 112, description: "3rd place payout", method: "cash", actorName: "Mike", runningBalance: 1240 },
        { id: "mock-ledger-002", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), type: "PAYOUT", category: "GAME", amount: 168, description: "2nd place payout", method: "cash", actorName: "Mike", runningBalance: 1352 },
        { id: "mock-ledger-003", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), type: "PAYOUT", category: "GAME", amount: 280, description: "1st place payout", method: "cash", actorName: "Mike", runningBalance: 1520 },
        { id: "mock-ledger-004", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), type: "EXPENSE", category: "EXPENSE_FOOD", amount: 40, description: "Pizza and drinks", method: "cash", actorName: "Dave", runningBalance: 1800 },
        { id: "mock-ledger-005", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), type: "REBUY", category: "GAME", amount: 50, description: "Rebuy #1 — Alex", method: "venmo", actorName: "Mike", runningBalance: 1840 },
        { id: "mock-ledger-006", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), type: "REBUY", category: "GAME", amount: 50, description: "Rebuy #1 — Tom", method: "cash", actorName: "Mike", runningBalance: 1790 },
        { id: "mock-ledger-007", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), type: "REBUY", category: "GAME", amount: 50, description: "Rebuy #1 — Sarah", method: "cash", actorName: "Mike", runningBalance: 1740 },
        { id: "mock-ledger-008", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), type: "BUY_IN", category: "GAME", amount: 450, description: "9 buy-ins @ $50", method: "cash", actorName: "Mike", runningBalance: 1690 },
      ],
      total: 8,
      limit: 50,
      offset: 0,
    },
  };
}

export function getMockDuesStatus() {
  return {
    seasonId: "mock-season-001",
    records: [
      { id: "mock-dues-001", personId: "mock-person-001", displayName: "Ron", avatarUrl: null, amountDue: 100, amountPaid: 100, remaining: 0, isPaid: true, paidAt: "2026-01-15T00:00:00.000Z", method: "cash" },
      { id: "mock-dues-002", personId: "mock-person-002", displayName: "Mike", avatarUrl: null, amountDue: 100, amountPaid: 100, remaining: 0, isPaid: true, paidAt: "2026-01-16T00:00:00.000Z", method: "venmo" },
      { id: "mock-dues-003", personId: "mock-person-003", displayName: "Sarah", avatarUrl: null, amountDue: 100, amountPaid: 100, remaining: 0, isPaid: true, paidAt: "2026-01-20T00:00:00.000Z", method: "cash" },
      { id: "mock-dues-004", personId: "mock-person-004", displayName: "Dave", avatarUrl: null, amountDue: 100, amountPaid: 100, remaining: 0, isPaid: true, paidAt: "2026-02-01T00:00:00.000Z", method: "cash" },
      { id: "mock-dues-005", personId: "mock-person-005", displayName: "Jenny", avatarUrl: null, amountDue: 100, amountPaid: 50, remaining: 50, isPaid: false, paidAt: null, method: null },
      { id: "mock-dues-006", personId: "mock-person-006", displayName: "Tom", avatarUrl: null, amountDue: 100, amountPaid: 0, remaining: 100, isPaid: false, paidAt: null, method: null },
    ],
    summary: {
      totalExpected: 600,
      totalCollected: 450,
      outstanding: 150,
      paidCount: 4,
      outstandingCount: 2,
      totalMembers: 6,
    },
  };
}

export function getMockPlayerBalances() {
  return [
    { id: "mock-bal-001", personId: "mock-person-001", displayName: "Ron", avatarUrl: null, balance: 230, lastSettledAt: null, debtAgeDays: 7 },
    { id: "mock-bal-003", personId: "mock-person-003", displayName: "Sarah", avatarUrl: null, balance: 68, lastSettledAt: null, debtAgeDays: 7 },
    { id: "mock-bal-006", personId: "mock-person-006", displayName: "Tom", avatarUrl: null, balance: -100, lastSettledAt: null, debtAgeDays: 14 },
  ];
}

export function getMockAuditLog() {
  const base = Date.now() - 2 * 24 * 60 * 60 * 1000;
  return {
    entries: [
      { id: "mock-audit-001", actorId: "mock-person-002", actorName: "Mike", action: "CREATE", entityType: "Transaction", entityId: "mock-tx-bi-001", transactionId: "mock-tx-bi-001", previousValue: null, newValue: { type: "BUY_IN", amount: 50, personId: "mock-person-001" }, note: null, createdAt: new Date(base).toISOString() },
      { id: "mock-audit-002", actorId: "mock-person-002", actorName: "Mike", action: "CREATE", entityType: "Transaction", entityId: "mock-tx-bi-002", transactionId: "mock-tx-bi-002", previousValue: null, newValue: { type: "BUY_IN", amount: 50, personId: "mock-person-002" }, note: null, createdAt: new Date(base + 1000).toISOString() },
      { id: "mock-audit-003", actorId: "mock-person-002", actorName: "Mike", action: "CREATE", entityType: "Transaction", entityId: "mock-tx-rb-001", transactionId: "mock-tx-rb-001", previousValue: null, newValue: { type: "REBUY", amount: 50, personId: "mock-person-003" }, note: null, createdAt: new Date(base + 60 * 60 * 1000).toISOString() },
      { id: "mock-audit-004", actorId: "mock-person-002", actorName: "Mike", action: "CREATE", entityType: "Transaction", entityId: "mock-tx-ex-001", transactionId: "mock-tx-ex-001", previousValue: null, newValue: { type: "EXPENSE", amount: 40, category: "EXPENSE_FOOD" }, note: null, createdAt: new Date(base + 2 * 60 * 60 * 1000).toISOString() },
      { id: "mock-audit-005", actorId: "mock-person-002", actorName: "Mike", action: "CREATE", entityType: "Transaction", entityId: "mock-tx-po-001", transactionId: "mock-tx-po-001", previousValue: null, newValue: { type: "PAYOUT", amount: 280, personId: "mock-person-001" }, note: null, createdAt: new Date(base + 5 * 60 * 60 * 1000).toISOString() },
      { id: "mock-audit-006", actorId: "mock-person-002", actorName: "Mike", action: "CREATE", entityType: "Transaction", entityId: "mock-tx-po-002", transactionId: "mock-tx-po-002", previousValue: null, newValue: { type: "PAYOUT", amount: 168, personId: "mock-person-003" }, note: null, createdAt: new Date(base + 5 * 60 * 60 * 1000 + 1000).toISOString() },
      { id: "mock-audit-007", actorId: "mock-person-002", actorName: "Mike", action: "CREATE", entityType: "Transaction", entityId: "mock-tx-po-003", transactionId: "mock-tx-po-003", previousValue: null, newValue: { type: "PAYOUT", amount: 112, personId: "mock-person-007" }, note: null, createdAt: new Date(base + 5 * 60 * 60 * 1000 + 2000).toISOString() },
      { id: "mock-audit-008", actorId: "mock-person-001", actorName: "Ron", action: "VOID", entityType: "Transaction", entityId: "mock-tx-void-001", transactionId: "mock-tx-void-001", previousValue: { type: "BUY_IN", amount: 50, isVoided: false }, newValue: { isVoided: true, voidReason: "Duplicate entry" }, note: null, createdAt: new Date(base + 5.5 * 60 * 60 * 1000).toISOString() },
      { id: "mock-audit-009", actorId: "mock-person-002", actorName: "Mike", action: "APPROVE", entityType: "Game", entityId: "mock-game-001", transactionId: null, previousValue: null, newValue: { financialLockedAt: new Date(base + 6 * 60 * 60 * 1000).toISOString() }, note: null, createdAt: new Date(base + 6 * 60 * 60 * 1000).toISOString() },
      { id: "mock-audit-010", actorId: "mock-person-002", actorName: "Mike", action: "UPDATE", entityType: "DuesRecord", entityId: "mock-dues-001", transactionId: null, previousValue: { amountPaid: 0, isPaid: false }, newValue: { amountPaid: 100, isPaid: true }, note: null, createdAt: new Date(base + 7 * 60 * 60 * 1000).toISOString() },
    ],
    total: 10,
    limit: 50,
    offset: 0,
  };
}

export function getMockGameNightReport() {
  const completedDate = getLastSaturday7pm();
  return {
    metadata: {
      gameId: "mock-game-001",
      eventTitle: "Last Week's Game",
      date: completedDate,
      playerCount: 9,
      durationMinutes: 300,
      status: "COMPLETED",
    },
    financialSummary: {
      prizePool: 600,
      totalExpenses: 40,
      netPrizePool: 560,
      moneyIn: 600,
      variance: 0,
    },
    buyIns: [
      { personId: "mock-person-001", displayName: "Ron", amount: 50 },
      { personId: "mock-person-002", displayName: "Mike", amount: 50 },
      { personId: "mock-person-003", displayName: "Sarah", amount: 50 },
      { personId: "mock-person-004", displayName: "Dave", amount: 50 },
      { personId: "mock-person-005", displayName: "Jenny", amount: 50 },
      { personId: "mock-person-006", displayName: "Tom", amount: 50 },
      { personId: "mock-person-007", displayName: "Alex", amount: 50 },
      { personId: "mock-person-008", displayName: "Chris", amount: 50 },
      { personId: "mock-person-009", displayName: "Pat", amount: 50 },
    ],
    rebuys: [
      { personId: "mock-person-003", displayName: "Sarah", amount: 50 },
      { personId: "mock-person-006", displayName: "Tom", amount: 50 },
      { personId: "mock-person-007", displayName: "Alex", amount: 50 },
    ],
    addOns: [],
    payouts: [
      { personId: "mock-person-001", displayName: "Ron", finishPosition: 1, amount: 280 },
      { personId: "mock-person-003", displayName: "Sarah", finishPosition: 2, amount: 168 },
      { personId: "mock-person-007", displayName: "Alex", finishPosition: 3, amount: 112 },
    ],
    bountySummary: {
      totalBountyPool: 0,
      totalBountiesPaid: 0,
      bounties: [],
    },
    varianceStatus: "BALANCED",
    treasuryImpact: {
      currentBalance: 1240,
    },
  };
}

export function getMockSeasons() {
  return [
    {
      id: "mock-season-001",
      clubId: "mock-club-001",
      name: "Spring 2026",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-06-30T00:00:00.000Z",
    },
    {
      id: "mock-season-002",
      clubId: "mock-club-001",
      name: "Fall 2025",
      startDate: "2025-07-01T00:00:00.000Z",
      endDate: "2025-12-31T00:00:00.000Z",
    },
  ];
}

export function getMockSeasonSummary() {
  return {
    seasonId: "mock-season-001",
    totalGames: 8,
    totalPlayers: 12,
    totalBuyInsCollected: 4800,
    totalPrizesPaid: 4480,
    topEarners: [
      { personId: "mock-person-001", displayName: "Ron", net: 620, totalPaid: 400, totalWon: 1020, totalRebuys: 0, totalBounties: 0 },
      { personId: "mock-person-003", displayName: "Sarah", net: 340, totalPaid: 600, totalWon: 940, totalRebuys: 4, totalBounties: 0 },
      { personId: "mock-person-007", displayName: "Alex", net: 180, totalPaid: 500, totalWon: 680, totalRebuys: 3, totalBounties: 0 },
      { personId: "mock-person-005", displayName: "Jenny", net: 60, totalPaid: 400, totalWon: 460, totalRebuys: 0, totalBounties: 0 },
      { personId: "mock-person-002", displayName: "Mike", net: -80, totalPaid: 400, totalWon: 320, totalRebuys: 0, totalBounties: 0 },
    ],
    mostRebuys: { personId: "mock-person-003", displayName: "Sarah", totalRebuys: 4, net: 340, totalPaid: 600, totalWon: 940, totalBounties: 0 },
    mostBounties: null,
    avgPlayersPerGame: 9,
    avgPrizePool: 600,
  };
}

export function getMockMemberFinancialSummary() {
  return {
    personId: "mock-person-001",
    totalGames: 8,
    totalBuyIns: 400,
    totalRebuys: 0,
    totalAddOns: 0,
    totalWinnings: 1020,
    netPosition: 620,
    bestFinish: 1,
    worstFinish: 6,
    avgFinish: 2.8,
    bountiesWon: 0,
    bountiesLost: 0,
  };
}

export function getMockDuesReport() {
  return {
    seasonId: "mock-season-001",
    totalExpected: 600,
    totalCollected: 450,
    totalOutstanding: 150,
    members: [
      { personId: "mock-person-001", displayName: "Ron", amountDue: 100, amountPaid: 100, remaining: 0, isPaid: true, daysOverdue: 0 },
      { personId: "mock-person-002", displayName: "Mike", amountDue: 100, amountPaid: 100, remaining: 0, isPaid: true, daysOverdue: 0 },
      { personId: "mock-person-003", displayName: "Sarah", amountDue: 100, amountPaid: 100, remaining: 0, isPaid: true, daysOverdue: 0 },
      { personId: "mock-person-004", displayName: "Dave", amountDue: 100, amountPaid: 100, remaining: 0, isPaid: true, daysOverdue: 0 },
      { personId: "mock-person-005", displayName: "Jenny", amountDue: 100, amountPaid: 50, remaining: 50, isPaid: false, daysOverdue: 22 },
      { personId: "mock-person-006", displayName: "Tom", amountDue: 100, amountPaid: 0, remaining: 100, isPaid: false, daysOverdue: 38 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Phase 7 — Results, Standings, Trophies
// ---------------------------------------------------------------------------

export function getMockGameResults() {
  return {
    metadata: {
      gameId: "mock-game-001",
      eventId: "mock-event-001",
      eventTitle: "Saturday Night Poker",
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 300,
      playerCount: 9,
      prizePool: 600,
      status: "COMPLETED",
    },
    standings: [
      { position: 1, personId: "mock-person-001", displayName: "Ron", avatarUrl: null, pointsEarned: 60, payout: 280, totalPaid: 50, net: 230, rebuys: 0, bountiesWon: 0, bountiesLost: 0 },
      { position: 2, personId: "mock-person-003", displayName: "Sarah", avatarUrl: null, pointsEarned: 40, payout: 168, totalPaid: 100, net: 68, rebuys: 1, bountiesWon: 0, bountiesLost: 0 },
      { position: 3, personId: "mock-person-002", displayName: "Mike", avatarUrl: null, pointsEarned: 30, payout: 112, totalPaid: 100, net: 12, rebuys: 1, bountiesWon: 0, bountiesLost: 0 },
      { position: 4, personId: "mock-person-004", displayName: "Dave", avatarUrl: null, pointsEarned: 20, payout: 40, totalPaid: 50, net: -10, rebuys: 0, bountiesWon: 0, bountiesLost: 0 },
      { position: 5, personId: "mock-person-005", displayName: "Jenny", avatarUrl: null, pointsEarned: 15, payout: 0, totalPaid: 50, net: -50, rebuys: 0, bountiesWon: 0, bountiesLost: 0 },
      { position: 6, personId: "mock-person-006", displayName: "Tom", avatarUrl: null, pointsEarned: 12, payout: 0, totalPaid: 50, net: -50, rebuys: 0, bountiesWon: 0, bountiesLost: 0 },
      { position: 7, personId: "mock-person-007", displayName: "Alex", avatarUrl: null, pointsEarned: 12, payout: 0, totalPaid: 50, net: -50, rebuys: 0, bountiesWon: 0, bountiesLost: 0 },
      { position: 8, personId: "mock-person-008", displayName: "Chris", avatarUrl: null, pointsEarned: 12, payout: 0, totalPaid: 50, net: -50, rebuys: 0, bountiesWon: 0, bountiesLost: 0 },
      { position: 9, personId: "mock-person-009", displayName: "Pat", avatarUrl: null, pointsEarned: 12, payout: 0, totalPaid: 50, net: -50, rebuys: 0, bountiesWon: 0, bountiesLost: 0 },
    ],
    topStats: {
      winner: { personId: "mock-person-001", displayName: "Ron" },
      biggestEarner: { personId: "mock-person-001", displayName: "Ron", net: 230 },
      mostBounties: null,
    },
  };
}

export function getMockStandings() {
  return [
    { rank: 1, personId: "mock-person-001", displayName: "Ron", avatarUrl: null, totalPoints: 480, gamesPlayed: 8, avgPoints: 60 },
    { rank: 2, personId: "mock-person-003", displayName: "Sarah", avatarUrl: null, totalPoints: 420, gamesPlayed: 8, avgPoints: 52.5 },
    { rank: 3, personId: "mock-person-002", displayName: "Mike", avatarUrl: null, totalPoints: 380, gamesPlayed: 7, avgPoints: 54.3 },
    { rank: 4, personId: "mock-person-004", displayName: "Dave", avatarUrl: null, totalPoints: 320, gamesPlayed: 8, avgPoints: 40 },
    { rank: 5, personId: "mock-person-005", displayName: "Jenny", avatarUrl: null, totalPoints: 280, gamesPlayed: 6, avgPoints: 46.7 },
    { rank: 6, personId: "mock-person-006", displayName: "Tom", avatarUrl: null, totalPoints: 240, gamesPlayed: 7, avgPoints: 34.3 },
  ];
}

export function getMockAllTimeStats() {
  return {
    totalGames: 24,
    totalPlayers: 12,
    leaders: {
      points: { personId: "mock-person-001", displayName: "Ron", total: 1440 },
      bounties: { personId: "mock-person-003", displayName: "Sarah", total: 18 },
      earnings: { personId: "mock-person-001", displayName: "Ron", total: 1850 },
      gamesPlayed: { personId: "mock-person-001", displayName: "Ron", total: 24 },
    },
    records: {
      biggestSinglePayout: { personId: "mock-person-002", displayName: "Mike", amount: 520, gameId: "mock-game-012" },
      mostRebuysOneGame: { personId: "mock-person-006", displayName: "Tom", count: 4, gameId: "mock-game-008" },
    },
  };
}

export function getMockPlayerSeasonStats() {
  return {
    personId: "mock-person-001",
    ranks: { points: 1, bounties: 3, earnings: 1, games: 1 },
    stats: {
      gamesPlayed: 8,
      wins: 2,
      top3Finishes: 5,
      totalPoints: 480,
      totalBounties: 4,
      netEarnings: 620,
      bestFinish: 1,
      currentStreak: 3,
    },
    lastFiveGames: [
      { date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), position: 1, pointsEarned: 60, payout: 280, net: 230 },
      { date: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(), position: 3, pointsEarned: 30, payout: 112, net: 62 },
      { date: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString(), position: 2, pointsEarned: 40, payout: 168, net: 118 },
      { date: new Date(now.getTime() - 23 * 24 * 60 * 60 * 1000).toISOString(), position: 5, pointsEarned: 15, payout: 0, net: -50 },
      { date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), position: 1, pointsEarned: 60, payout: 280, net: 230 },
    ],
  };
}

export function getMockTrophies() {
  return [
    { id: "mock-trophy-001", clubId: "mock-club-001", name: "Champion", emoji: "🏆", description: "Win a game", isAutomatic: true, totalAwards: 8 },
    { id: "mock-trophy-002", clubId: "mock-club-001", name: "Bounty Hunter", emoji: "🎯", description: "Most bounties in a game", isAutomatic: true, totalAwards: 5 },
    { id: "mock-trophy-003", clubId: "mock-club-001", name: "Comeback Kid", emoji: "🔄", description: "Awarded for an impressive comeback", isAutomatic: false, totalAwards: 2 },
    { id: "mock-trophy-004", clubId: "mock-club-001", name: "Chip Leader", emoji: "💰", description: "Dominated the chip count", isAutomatic: false, totalAwards: 3 },
    { id: "mock-trophy-005", clubId: "mock-club-001", name: "Final Two", emoji: "🤝", description: "Made it to the final two", isAutomatic: true, totalAwards: 16 },
    { id: "mock-trophy-006", clubId: "mock-club-001", name: "Bubble Boy", emoji: "😤", description: "Just missed the money", isAutomatic: false, totalAwards: 4 },
    { id: "mock-trophy-007", clubId: "mock-club-001", name: "All In", emoji: "🎲", description: "Bold play deserves recognition", isAutomatic: false, totalAwards: 1 },
    { id: "mock-trophy-008", clubId: "mock-club-001", name: "Hat Trick", emoji: "🎩", description: "Win 3 games in a season", isAutomatic: true, totalAwards: 1 },
  ];
}

export function getMockTrophyAwards() {
  return [
    { id: "mock-award-001", trophyName: "Champion", trophyEmoji: "🏆", trophyDescription: "Win a game", personId: "mock-person-001", awardedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), gameId: "mock-game-001", seasonId: "mock-season-001", note: null, awardedBy: "system" },
    { id: "mock-award-002", trophyName: "Bounty Hunter", trophyEmoji: "🎯", trophyDescription: "Most bounties in a game", personId: "mock-person-003", awardedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(), gameId: "mock-game-002", seasonId: "mock-season-001", note: null, awardedBy: "system" },
    { id: "mock-award-003", trophyName: "Hat Trick", trophyEmoji: "🎩", trophyDescription: "Win 3 games in a season", personId: "mock-person-001", awardedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), gameId: "mock-game-001", seasonId: "mock-season-001", note: "Third win this season!", awardedBy: "system" },
  ];
}

// ============================================================
// Phase 8 — Social & Communication Mock Data
// ============================================================

export function getMockInbox(unreadOnly?: boolean) {
  const allNotifications = [
    { id: "mock-notif-001", type: "INVITE", title: "You're invited: Saturday Night Poker", body: "Saturday Night Poker on Sat, Mar 1 at 7:00 PM. Buy-in: $50. RSVP now!", data: { eventId: "mock-event-001" }, isRead: false, createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), clubId: "mock-club-001" },
    { id: "mock-notif-002", type: "INVITE", title: "Mike invited you to a game", body: "High Stakes Friday on Fri, Mar 7 at Mike's Club. Come play!", data: { eventId: "mock-event-ext-001", fromPersonId: "mock-person-002", clubId: "mock-club-ext-001" }, isRead: false, createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), clubId: "mock-club-ext-001" },
    { id: "mock-notif-003", type: "RESULTS", title: "Game Results: Last Week's Game", body: "You finished 1st and won $280! Check full results.", data: { gameId: "mock-game-001" }, isRead: false, createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), clubId: "mock-club-001" },
    { id: "mock-notif-004", type: "TROPHY", title: "🏆 New Trophy: Champion", body: "You earned the Champion trophy for winning last week's game!", data: { trophyId: "mock-trophy-001", gameId: "mock-game-001" }, isRead: true, createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), clubId: "mock-club-001" },
    { id: "mock-notif-005", type: "ANNOUNCEMENT", title: "📢 Ron's Home Game", body: "New house rule: no string bets! Ask if unclear.", data: null, isRead: true, createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), clubId: "mock-club-001" },
    { id: "mock-notif-006", type: "ANNOUNCEMENT", title: "📢 Announcement", body: "Snacks are on Dave this week — thanks Dave!", data: { chatMessageId: "mock-chat-010" }, isRead: true, createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), clubId: "mock-club-001" },
    { id: "mock-notif-007", type: "REMINDER", title: "Game Tomorrow!", body: "Saturday Night Poker starts tomorrow at 7:00 PM. Don't forget!", data: { eventId: "mock-event-001" }, isRead: true, createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), clubId: "mock-club-001" },
    { id: "mock-notif-008", type: "CHIP_VALUE_CHANGE", title: "Chip Value Updated", body: "Green chips changed from 100 to 150. Effective next game.", data: { chipDenominationId: "d3", previousValue: 100, newValue: 150 }, isRead: true, createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), clubId: "mock-club-001" },
  ];

  const notifications = unreadOnly
    ? allNotifications.filter((n) => !n.isRead)
    : allNotifications;
  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  return { notifications, unreadCount };
}

export function getMockUnreadCount() {
  return 3;
}

export function getMockChatMessages() {
  return [
    // Pinned messages first
    { id: "mock-chat-001", body: "House rules: No string bets, 30-second shot clock on river decisions. Pin for reference.", personId: "mock-person-001", person: { displayName: "Ron", avatarUrl: null }, isAnnouncement: false, isPinned: true, editedAt: null, createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() },
    { id: "mock-chat-002", body: "Next game: Saturday 7pm at Ron's. $50 buy-in, 1 rebuy allowed.", personId: "mock-person-002", person: { displayName: "Mike", avatarUrl: null }, isAnnouncement: true, isPinned: true, editedAt: null, createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    // Regular messages (newest first)
    { id: "mock-chat-003", body: "GG everyone. Ron ran hot tonight 🔥", personId: "mock-person-003", person: { displayName: "Sarah", avatarUrl: null }, isAnnouncement: false, isPinned: false, editedAt: null, createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString() },
    { id: "mock-chat-004", body: "That river card was brutal 😂", personId: "mock-person-004", person: { displayName: "Dave", avatarUrl: null }, isAnnouncement: false, isPinned: false, editedAt: null, createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() },
    { id: "mock-chat-005", body: "I need a rematch ASAP", personId: "mock-person-006", person: { displayName: "Tom", avatarUrl: null }, isAnnouncement: false, isPinned: false, editedAt: null, createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString() },
    { id: "mock-chat-006", body: "Bringing pizza next week, any requests?", personId: "mock-person-004", person: { displayName: "Dave", avatarUrl: null }, isAnnouncement: false, isPinned: false, editedAt: null, createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString() },
    { id: "mock-chat-007", body: "Pepperoni and a veggie please 🍕", personId: "mock-person-005", person: { displayName: "Jenny", avatarUrl: null }, isAnnouncement: false, isPinned: false, editedAt: null, createdAt: new Date(now.getTime() - 4.5 * 60 * 60 * 1000).toISOString() },
    { id: "mock-chat-008", body: "Who's bringing drinks?", personId: "mock-person-007", person: { displayName: "Alex", avatarUrl: null }, isAnnouncement: false, isPinned: false, editedAt: null, createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString() },
    { id: "mock-chat-009", body: "I'll grab a case of beer 🍺", personId: "mock-person-006", person: { displayName: "Tom", avatarUrl: null }, isAnnouncement: false, isPinned: false, editedAt: null, createdAt: new Date(now.getTime() - 5.5 * 60 * 60 * 1000).toISOString() },
    { id: "mock-chat-010", body: "Snacks are on Dave this week — thanks Dave!", personId: "mock-person-001", person: { displayName: "Ron", avatarUrl: null }, isAnnouncement: true, isPinned: false, editedAt: null, createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString() },
    { id: "mock-chat-011", body: "Great game last week everyone", personId: "mock-person-002", person: { displayName: "Mike", avatarUrl: null }, isAnnouncement: false, isPinned: false, editedAt: new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString(), createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() },
    { id: "mock-chat-012", body: "See you all Saturday!", personId: "mock-person-003", person: { displayName: "Sarah", avatarUrl: null }, isAnnouncement: false, isPinned: false, editedAt: null, createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString() },
  ];
}

export function getMockNetwork(depth: 1 | 2 = 1) {
  const depth1 = [
    { personId: "mock-person-002", displayName: "Mike", avatarUrl: null, gamesShared: 22, lastPlayedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), depth: 1 },
    { personId: "mock-person-003", displayName: "Sarah", avatarUrl: null, gamesShared: 18, lastPlayedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), depth: 1 },
    { personId: "mock-person-004", displayName: "Dave", avatarUrl: null, gamesShared: 16, lastPlayedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), depth: 1 },
    { personId: "mock-person-005", displayName: "Jenny", avatarUrl: null, gamesShared: 12, lastPlayedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(), depth: 1 },
    { personId: "mock-person-006", displayName: "Tom", avatarUrl: null, gamesShared: 10, lastPlayedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), depth: 1 },
    { personId: "mock-person-007", displayName: "Alex", avatarUrl: null, gamesShared: 8, lastPlayedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), depth: 1 },
    { personId: "mock-person-008", displayName: "Chris", avatarUrl: null, gamesShared: 5, lastPlayedAt: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000).toISOString(), depth: 1 },
    { personId: "mock-person-009", displayName: "Pat", avatarUrl: null, gamesShared: 3, lastPlayedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), depth: 1 },
  ];

  if (depth === 1) return depth1;

  const depth2 = [
    { personId: "mock-person-ext-001", displayName: "Tyler", avatarUrl: null, gamesShared: 6, lastPlayedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), depth: 2 },
    { personId: "mock-person-ext-002", displayName: "Megan", avatarUrl: null, gamesShared: 4, lastPlayedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(), depth: 2 },
    { personId: "mock-person-ext-003", displayName: "Jordan", avatarUrl: null, gamesShared: 2, lastPlayedAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(), depth: 2 },
  ];

  return [...depth1, ...depth2];
}

export function getMockNetworkStats() {
  return {
    directConnections: 8,
    totalReach: 22,
    mostPlayedWith: [
      { personId: "mock-person-002", displayName: "Mike", gamesShared: 22 },
      { personId: "mock-person-003", displayName: "Sarah", gamesShared: 18 },
      { personId: "mock-person-004", displayName: "Dave", gamesShared: 16 },
      { personId: "mock-person-005", displayName: "Jenny", gamesShared: 12 },
      { personId: "mock-person-006", displayName: "Tom", gamesShared: 10 },
    ],
    recentlyPlayed: [
      { personId: "mock-person-002", displayName: "Mike", lastPlayedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { personId: "mock-person-003", displayName: "Sarah", lastPlayedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { personId: "mock-person-004", displayName: "Dave", lastPlayedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    ],
    clubsRepresented: 3,
  };
}

export function getMockCrossClubInvites() {
  return [
    {
      id: "mock-notif-002",
      type: "INVITE",
      title: "Mike invited you to a game",
      body: "High Stakes Friday on Fri, Mar 7 at Mike's Poker Club. Come play!",
      data: { eventId: "mock-event-ext-001", fromPersonId: "mock-person-002", clubId: "mock-club-ext-001" },
      isRead: false,
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      clubId: "mock-club-ext-001",
      event: {
        id: "mock-event-ext-001",
        title: "High Stakes Friday",
        startsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        buyInAmount: 100,
        club: { name: "Mike's Poker Club" },
      },
      fromPerson: {
        id: "mock-person-002",
        displayName: "Mike",
        avatarUrl: null,
      },
    },
  ];
}

// ============================================================
// Phase 10 — Pub Poker Mock Data
// ============================================================

export function getMockVenueProfile() {
  return {
    id: "mock-venue-001",
    clubId: "mock-club-pub-001",
    venueName: "The Rusty Anchor",
    address: "456 Harbor Blvd, Gulf Shores, AL 36542",
    lat: 30.246,
    lng: -87.7008,
    operatingNights: ["tuesday", "friday"],
    contactPhone: "+12515551234",
    contactEmail: "poker@rustyanchor.com",
    websiteUrl: "https://rustyanchor.com",
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-02-22T00:00:00.000Z",
  };
}

export function getMockCheckInList() {
  return [
    { sessionId: "mock-pub-session-001", personId: "mock-person-001", displayName: "Ron", avatarUrl: null, status: "ACTIVE", isWalkIn: false, walkInId: null, tableNumber: 1, seatNumber: 1, checkInTime: "2026-02-22T19:00:00.000Z" },
    { sessionId: "mock-pub-session-002", personId: "mock-person-002", displayName: "Mike", avatarUrl: null, status: "ACTIVE", isWalkIn: false, walkInId: null, tableNumber: 1, seatNumber: 2, checkInTime: "2026-02-22T19:01:00.000Z" },
    { sessionId: "mock-pub-session-003", personId: "mock-person-003", displayName: "Sarah", avatarUrl: null, status: "ACTIVE", isWalkIn: false, walkInId: null, tableNumber: 1, seatNumber: 3, checkInTime: "2026-02-22T19:02:00.000Z" },
    { sessionId: "mock-pub-session-004", personId: "mock-person-004", displayName: "Dave", avatarUrl: null, status: "ACTIVE", isWalkIn: false, walkInId: null, tableNumber: 1, seatNumber: 4, checkInTime: "2026-02-22T19:03:00.000Z" },
    { sessionId: "mock-pub-session-005", personId: "mock-person-005", displayName: "Jenny", avatarUrl: null, status: "ACTIVE", isWalkIn: false, walkInId: null, tableNumber: 1, seatNumber: 5, checkInTime: "2026-02-22T19:04:00.000Z" },
    { sessionId: "mock-pub-session-006", personId: "mock-person-006", displayName: "Tom", avatarUrl: null, status: "ACTIVE", isWalkIn: false, walkInId: null, tableNumber: 2, seatNumber: 1, checkInTime: "2026-02-22T19:05:00.000Z" },
    { sessionId: "mock-pub-session-007", personId: "mock-person-walkin-001", displayName: "New Guy Steve", avatarUrl: null, status: "ACTIVE", isWalkIn: true, walkInId: "mock-walkin-001", tableNumber: 2, seatNumber: 2, checkInTime: "2026-02-22T19:10:00.000Z" },
    { sessionId: "mock-pub-session-008", personId: "mock-person-walkin-002", displayName: "Walk-in Lisa", avatarUrl: null, status: "ACTIVE", isWalkIn: true, walkInId: "mock-walkin-002", tableNumber: 2, seatNumber: 3, checkInTime: "2026-02-22T19:12:00.000Z" },
    { sessionId: "mock-pub-session-009", personId: "mock-person-007", displayName: "Alex", avatarUrl: null, status: "ACTIVE", isWalkIn: false, walkInId: null, tableNumber: 2, seatNumber: 4, checkInTime: "2026-02-22T19:06:00.000Z" },
  ];
}

export function getMockTableAssignments() {
  return [
    {
      tableNumber: 1,
      maxSeats: 9,
      isActive: true,
      players: [
        { personId: "mock-person-001", displayName: "Ron", avatarUrl: null, seatNumber: 1, currentStack: null, status: "ACTIVE" },
        { personId: "mock-person-002", displayName: "Mike", avatarUrl: null, seatNumber: 2, currentStack: null, status: "ACTIVE" },
        { personId: "mock-person-003", displayName: "Sarah", avatarUrl: null, seatNumber: 3, currentStack: null, status: "ACTIVE" },
        { personId: "mock-person-004", displayName: "Dave", avatarUrl: null, seatNumber: 4, currentStack: null, status: "ACTIVE" },
        { personId: "mock-person-005", displayName: "Jenny", avatarUrl: null, seatNumber: 5, currentStack: null, status: "ACTIVE" },
      ],
      seats: [
        { personId: "mock-person-001", displayName: "Ron", avatarUrl: null, seatNumber: 1, currentStack: null, status: "ACTIVE" },
        { personId: "mock-person-002", displayName: "Mike", avatarUrl: null, seatNumber: 2, currentStack: null, status: "ACTIVE" },
        { personId: "mock-person-003", displayName: "Sarah", avatarUrl: null, seatNumber: 3, currentStack: null, status: "ACTIVE" },
        { personId: "mock-person-004", displayName: "Dave", avatarUrl: null, seatNumber: 4, currentStack: null, status: "ACTIVE" },
        { personId: "mock-person-005", displayName: "Jenny", avatarUrl: null, seatNumber: 5, currentStack: null, status: "ACTIVE" },
        null, null, null, null,
      ],
    },
    {
      tableNumber: 2,
      maxSeats: 9,
      isActive: true,
      players: [
        { personId: "mock-person-006", displayName: "Tom", avatarUrl: null, seatNumber: 1, currentStack: null, status: "ACTIVE" },
        { personId: "mock-person-walkin-001", displayName: "New Guy Steve", avatarUrl: null, seatNumber: 2, currentStack: null, status: "ACTIVE" },
        { personId: "mock-person-walkin-002", displayName: "Walk-in Lisa", avatarUrl: null, seatNumber: 3, currentStack: null, status: "ACTIVE" },
        { personId: "mock-person-007", displayName: "Alex", avatarUrl: null, seatNumber: 4, currentStack: null, status: "ACTIVE" },
      ],
      seats: [
        { personId: "mock-person-006", displayName: "Tom", avatarUrl: null, seatNumber: 1, currentStack: null, status: "ACTIVE" },
        { personId: "mock-person-walkin-001", displayName: "New Guy Steve", avatarUrl: null, seatNumber: 2, currentStack: null, status: "ACTIVE" },
        { personId: "mock-person-walkin-002", displayName: "Walk-in Lisa", avatarUrl: null, seatNumber: 3, currentStack: null, status: "ACTIVE" },
        { personId: "mock-person-007", displayName: "Alex", avatarUrl: null, seatNumber: 4, currentStack: null, status: "ACTIVE" },
        null, null, null, null, null,
      ],
    },
  ];
}

export function getMockBalanceSuggestion() {
  return {
    suggestions: [
      {
        fromTable: 1,
        fromSeat: 5,
        personId: "mock-person-005",
        displayName: "Jenny",
        toTable: 2,
        toSeat: 5,
      },
    ],
    isBalanced: false,
  };
}

export function getMockBonusChipLeaderboard() {
  return [
    { personId: "mock-person-003", displayName: "Sarah", bonusCount: 3, totalBonusChips: 1500 },
    { personId: "mock-person-001", displayName: "Ron", bonusCount: 2, totalBonusChips: 1000 },
    { personId: "mock-person-006", displayName: "Tom", bonusCount: 2, totalBonusChips: 1000 },
    { personId: "mock-person-004", displayName: "Dave", bonusCount: 1, totalBonusChips: 500 },
  ];
}

export function getMockCircuit() {
  return {
    id: "mock-circuit-001",
    name: "Gulf Coast Poker Circuit",
    adminPersonId: "mock-person-001",
    description: "The premier pub poker circuit along the Gulf Coast",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-02-22T00:00:00.000Z",
    clubs: [
      { clubId: "mock-club-pub-001", name: "The Rusty Anchor Poker", slug: "rusty-anchor", venueProfile: getMockVenueProfile(), joinedAt: "2026-01-05T00:00:00.000Z" },
      { clubId: "mock-club-pub-002", name: "Bayside Bar & Cards", slug: "bayside-cards", venueProfile: { id: "mock-venue-002", clubId: "mock-club-pub-002", venueName: "Bayside Bar", address: "789 Beach Rd, Orange Beach, AL 36561", lat: 30.2944, lng: -87.5731, operatingNights: ["wednesday", "saturday"], contactPhone: null, contactEmail: null, websiteUrl: null }, joinedAt: "2026-01-10T00:00:00.000Z" },
      { clubId: "mock-club-pub-003", name: "Dock Street Poker", slug: "dock-street", venueProfile: { id: "mock-venue-003", clubId: "mock-club-pub-003", venueName: "Dock Street Pub", address: "321 Dock St, Pensacola, FL 32502", lat: 30.4093, lng: -87.2145, operatingNights: ["thursday"], contactPhone: null, contactEmail: null, websiteUrl: null }, joinedAt: "2026-01-15T00:00:00.000Z" },
    ],
    topStandings: [
      { rank: 1, personId: "mock-person-001", displayName: "Ron", totalPoints: 920, venuesPlayed: 3, gamesPlayed: 12 },
      { rank: 2, personId: "mock-person-003", displayName: "Sarah", totalPoints: 780, venuesPlayed: 2, gamesPlayed: 10 },
      { rank: 3, personId: "mock-person-002", displayName: "Mike", totalPoints: 650, venuesPlayed: 3, gamesPlayed: 9 },
      { rank: 4, personId: "mock-person-005", displayName: "Jenny", totalPoints: 540, venuesPlayed: 2, gamesPlayed: 8 },
      { rank: 5, personId: "mock-person-004", displayName: "Dave", totalPoints: 480, venuesPlayed: 1, gamesPlayed: 7 },
    ],
  };
}

export function getMockCircuitStandings() {
  return getMockCircuit().topStandings;
}

// ============================================================
// PHASE 11 — Super Admin Mock Data
// ============================================================

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
        thisMonthAiSpend: 12.30,
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
        thisMonthAiSpend: 1.20,
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
        thisMonthAiSpend: 5.80,
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
        message: "JWT verification failed — invalid signature on /auth/otp/verify",
        route: "/auth/otp/verify",
        clubId: null,
        clubName: null,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedAt: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "mock-err-002",
        severity: "P0_CRITICAL",
        errorType: "DatabaseError",
        message: "Connection pool exhausted — Neon Postgres timeout after 30s",
        route: "/games/mock-game-001/state",
        clubId: "mock-club-001",
        clubName: "Ron's Home Game",
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(),
      },
      {
        id: "mock-err-003",
        severity: "P1_HIGH",
        errorType: "ChipScanError",
        message: "Anthropic API returned 429 rate limit on chip scan",
        route: "/scanner/scan",
        clubId: "mock-club-pub-001",
        clubName: "The Rusty Anchor Poker",
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedAt: null,
      },
      {
        id: "mock-err-004",
        severity: "P1_HIGH",
        errorType: "TransactionError",
        message: "Duplicate buy-in detected for person mock-person-003 in game mock-game-042",
        route: "/games/mock-game-042/buy-in",
        clubId: "mock-club-003",
        clubName: "Downtown Degens",
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedAt: null,
      },
      {
        id: "mock-err-005",
        severity: "P1_HIGH",
        errorType: "NotificationError",
        message: "Twilio SMS delivery failed — invalid phone number format",
        route: "/events/mock-event-005/remind",
        clubId: "mock-club-pub-002",
        clubName: "Bayside Bar & Cards",
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedAt: null,
      },
      {
        id: "mock-err-006",
        severity: "P2_MEDIUM",
        errorType: "ValidationError",
        message: "Invalid blind structure level ordering — level 3 has lower blinds than level 2",
        route: "/clubs/mock-club-001/blind-structures",
        clubId: "mock-club-001",
        clubName: "Ron's Home Game",
        createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedAt: null,
      },
      {
        id: "mock-err-007",
        severity: "P2_MEDIUM",
        errorType: "TypeError",
        message: "Cannot read properties of undefined (reading 'displayName')",
        route: "/results/mock-game-038",
        clubId: "mock-club-003",
        clubName: "Downtown Degens",
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
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
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
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
    totalCostUsd: 34.20,
    byFeature: [
      { feature: "chip_scanner", tokens: 980_000, costUsd: 22.10 },
      { feature: "ai_poker_coach", tokens: 420_000, costUsd: 8.50 },
      { feature: "game_recap", tokens: 180_000, costUsd: 2.80 },
      { feature: "hand_analysis", tokens: 40_000, costUsd: 0.80 },
    ],
    byClub: [
      { clubId: "mock-club-pub-001", clubName: "The Rusty Anchor Poker", costUsd: 12.30 },
      { clubId: "mock-club-001", clubName: "Ron's Home Game", costUsd: 8.45 },
      { clubId: "mock-club-pub-002", clubName: "Bayside Bar & Cards", costUsd: 5.80 },
    ],
    dailyBurnRate: 1.14,
    projectedMonthly: 34.20,
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
