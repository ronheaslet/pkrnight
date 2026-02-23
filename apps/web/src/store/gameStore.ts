import { create } from "zustand";

export interface BlindLevel {
  levelNumber: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
  isBreak: boolean;
  breakLabel: string | null;
}

export interface PlayerSession {
  sessionId: string;
  personId: string;
  displayName: string;
  avatarUrl: string | null;
  status: "ACTIVE" | "ELIMINATED" | "WINNER";
  currentStack: number | null;
  startingStack: number | null;
  finishPosition: number | null;
  rebuys: number;
  addOns: number;
  bountiesWon: number;
  payout: number;
  pointsEarned: number;
  totalPaid: number;
  eliminatedAt: string | null;
  eliminatedBy: string | null;
}

export interface ChipDenomination {
  id: string;
  colorName: string;
  colorHex: string;
  value: number;
  sortOrder: number;
}

export interface GameState {
  game: {
    id: string;
    clubId: string;
    eventId: string;
    status: "PENDING" | "ACTIVE" | "PAUSED" | "BREAK" | "COMPLETED" | "CANCELLED";
    currentLevel: number;
    levelStartedAt: string | null;
    pausedAt: string | null;
    totalPausedMs: number;
    playersRegistered: number;
    playersRemaining: number;
    prizePool: number;
    totalRebuys: number;
    totalAddOns: number;
    buyInAmount: number;
    rebuyAmount: number;
    addOnAmount: number;
    rebuyLimit: number | null;
    bountyEnabled: boolean;
    bountyAmount: number;
    startedAt: string | null;
    completedAt: string | null;
  };
  currentLevel: BlindLevel | null;
  nextLevel: BlindLevel | null;
  timeRemainingMs: number;
  players: PlayerSession[];
  playersRemaining: number;
  chipSet: {
    id: string;
    name: string;
    mode: string;
    denominations: ChipDenomination[];
  } | null;
  blindStructure: {
    id: string;
    name: string;
    levels: BlindLevel[];
  } | null;
}

export interface JWTPayload {
  userId: string;
  clubId: string | null;
  planTier: string;
  brandingKey: string | null;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  iat?: number;
  exp?: number;
}

export interface Club {
  id: string;
  name: string;
  slug: string;
  clubType: string;
  planTier: string;
  brandingKey?: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  tagline: string | null;
  timezone: string;
  isActive: boolean;
  isPublic: boolean;
  memberCount: number;
  venueProfile?: unknown;
}

interface GameStore {
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  currentUser: JWTPayload | null;
  setCurrentUser: (user: JWTPayload | null) => void;
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  currentClub: Club | null;
  setCurrentClub: (club: Club | null) => void;
  activeGameId: string | null;
  setActiveGameId: (id: string | null) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  setGameState: (state) => set({ gameState: state }),
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  authToken: localStorage.getItem("pkr_token"),
  setAuthToken: (token) => {
    if (token) {
      localStorage.setItem("pkr_token", token);
    } else {
      localStorage.removeItem("pkr_token");
    }
    set({ authToken: token });
  },
  currentClub: null,
  setCurrentClub: (club) => set({ currentClub: club }),
  activeGameId: null,
  setActiveGameId: (id) => set({ activeGameId: id }),
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
}));
