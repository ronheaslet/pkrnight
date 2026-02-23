// Mock data for Pub Poker features (Phase 10B)

export const MOCK_PUB_CLUB_ID = "mock-club-pub-001";
export const MOCK_PUB_GAME_ID = "mock-pub-game-001";

export const mockPubClub = {
  id: MOCK_PUB_CLUB_ID,
  name: "Rusty Anchor Poker",
  slug: "rusty-anchor-poker",
  clubType: "PUB_POKER",
  planTier: "PRO",
  logoUrl: null,
  primaryColor: "#22c55e",
  accentColor: "#f59e0b",
  tagline: "Tuesday Night Poker at the Rusty Anchor",
  timezone: "America/Chicago",
  isActive: true,
  isPublic: true,
  memberCount: 42,
  venueProfile: {
    venueName: "The Rusty Anchor",
    address: "1234 Harbor St, Galveston, TX 77550",
    operatingNights: ["TUESDAY", "FRIDAY"],
    contactPhone: "(409) 555-0187",
    contactEmail: "poker@rustyanchor.com",
    websiteUrl: "https://rustyanchor.com",
  },
  bonusChipConfig: {
    mode: "SELF_REPORT" as const,
    chipAmount: 500,
    maxPerNight: 3,
    triggers: ["FOOD", "DRINK"],
  },
};

export const mockPubGame = {
  id: MOCK_PUB_GAME_ID,
  clubId: MOCK_PUB_CLUB_ID,
  eventId: "mock-pub-event-001",
  status: "ACTIVE" as const,
  title: "Tuesday Night Poker",
  startsAt: new Date().toISOString(),
};

export const mockCheckinSearchResults = [
  {
    personId: "person-pub-001",
    displayName: "Jake Martinez",
    role: "MEMBER",
    isCheckedIn: false,
  },
  {
    personId: "person-pub-002",
    displayName: "Sarah Chen",
    role: "ADMIN",
    isCheckedIn: false,
  },
  {
    personId: "person-pub-003",
    displayName: "Mike Johnson",
    role: "MEMBER",
    isCheckedIn: true,
  },
];

export const mockCheckinResult = {
  success: true,
  playerName: "Jake Martinez",
  tableNumber: 2,
  seatNumber: 5,
};

export const mockTables = [
  {
    tableNumber: 1,
    seats: [
      { seatNumber: 1, personId: "p1", displayName: "Jake Martinez" },
      { seatNumber: 2, personId: "p2", displayName: "Sarah Chen" },
      { seatNumber: 3, personId: null, displayName: null },
      { seatNumber: 4, personId: "p4", displayName: "Mike Johnson" },
      { seatNumber: 5, personId: "p5", displayName: "Alex Rivera" },
      { seatNumber: 6, personId: null, displayName: null },
      { seatNumber: 7, personId: "p7", displayName: "Chris Lee" },
      { seatNumber: 8, personId: null, displayName: null },
      { seatNumber: 9, personId: null, displayName: null },
    ],
  },
  {
    tableNumber: 2,
    seats: [
      { seatNumber: 1, personId: "p8", displayName: "Jordan Kim" },
      { seatNumber: 2, personId: "p9", displayName: "Taylor Smith" },
      { seatNumber: 3, personId: "p10", displayName: "Morgan Davis" },
      { seatNumber: 4, personId: null, displayName: null },
      { seatNumber: 5, personId: "p12", displayName: "Casey Brown" },
      { seatNumber: 6, personId: null, displayName: null },
      { seatNumber: 7, personId: null, displayName: null },
      { seatNumber: 8, personId: null, displayName: null },
      { seatNumber: 9, personId: null, displayName: null },
    ],
  },
];

export const mockBalanceSuggestions = [
  {
    id: "move-1",
    playerName: "Casey Brown",
    fromTable: 2,
    toTable: 1,
    personId: "p12",
  },
  {
    id: "move-2",
    playerName: "Morgan Davis",
    fromTable: 2,
    toTable: 1,
    personId: "p10",
  },
];

export const mockWalkInClaim = {
  venueName: "The Rusty Anchor",
  clubId: MOCK_PUB_CLUB_ID,
  tempName: "Guest Player",
  finishPosition: 5,
  pointsEarned: 12,
  gameName: "Tuesday Night Poker",
};

export const mockCircuit = {
  id: "mock-circuit-001",
  name: "Gulf Coast Poker Circuit",
  description: "The premier pub poker circuit across the Texas Gulf Coast",
  playerCount: 187,
  venueCount: 3,
  venues: [
    {
      clubId: MOCK_PUB_CLUB_ID,
      venueName: "The Rusty Anchor",
      address: "1234 Harbor St, Galveston, TX 77550",
      operatingNights: ["TUESDAY", "FRIDAY"],
    },
    {
      clubId: "mock-club-pub-002",
      venueName: "Bayou Brew House",
      address: "567 Main St, League City, TX 77573",
      operatingNights: ["WEDNESDAY"],
    },
    {
      clubId: "mock-club-pub-003",
      venueName: "The Captain's Table",
      address: "890 Seawall Blvd, Galveston, TX 77551",
      operatingNights: ["THURSDAY", "SATURDAY"],
    },
  ],
  standings: [
    { rank: 1, personId: "cs-1", displayName: "Jake Martinez", totalPoints: 342, venueCount: 3, gameCount: 18 },
    { rank: 2, personId: "cs-2", displayName: "Sarah Chen", totalPoints: 298, venueCount: 2, gameCount: 15 },
    { rank: 3, personId: "cs-3", displayName: "Mike Johnson", totalPoints: 276, venueCount: 3, gameCount: 14 },
    { rank: 4, personId: "cs-4", displayName: "Alex Rivera", totalPoints: 245, venueCount: 2, gameCount: 12 },
    { rank: 5, personId: "cs-5", displayName: "Jordan Kim", totalPoints: 221, venueCount: 1, gameCount: 11 },
  ],
};

export const mockVenues = [
  {
    clubId: MOCK_PUB_CLUB_ID,
    clubName: "Rusty Anchor Poker",
    venueName: "The Rusty Anchor",
    address: "1234 Harbor St, Galveston, TX 77550",
    operatingNights: ["TUESDAY", "FRIDAY"],
  },
  {
    clubId: "mock-club-pub-002",
    clubName: "Bayou Brew Poker",
    venueName: "Bayou Brew House",
    address: "567 Main St, League City, TX 77573",
    operatingNights: ["WEDNESDAY"],
  },
  {
    clubId: "mock-club-pub-003",
    clubName: "Captain's Poker League",
    venueName: "The Captain's Table",
    address: "890 Seawall Blvd, Galveston, TX 77551",
    operatingNights: ["THURSDAY", "SATURDAY"],
  },
];

// Helper to check if a request is for the mock pub club
export function isMockPubClub(clubId: string | undefined): boolean {
  return clubId === MOCK_PUB_CLUB_ID;
}
