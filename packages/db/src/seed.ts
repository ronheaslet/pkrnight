import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const featureFlags = [
  {
    featureKey: "clock_blind_timer",
    name: "Clock / Blind Timer",
    state: "GLOBALLY_ON" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "live_hud",
    name: "Live HUD",
    state: "GLOBALLY_ON" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "rsvp_system",
    name: "RSVP System",
    state: "GLOBALLY_ON" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "invites",
    name: "Invites",
    state: "GLOBALLY_ON" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "standings",
    name: "Standings",
    state: "GLOBALLY_ON" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "hand_rankings",
    name: "Hand Rankings",
    state: "CLUB_CONFIGURABLE" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "pot_odds_calculator",
    name: "Pot Odds Calculator",
    state: "CLUB_CONFIGURABLE" as const,
    isContextLocked: true,
    contextNote: "Auto-disabled during active live game",
  },
  {
    featureKey: "in_app_holdem",
    name: "In-App Hold'em",
    state: "CLUB_CONFIGURABLE" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "ai_poker_coach",
    name: "AI Poker Coach",
    state: "CLUB_CONFIGURABLE" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "chat",
    name: "Chat",
    state: "CLUB_CONFIGURABLE" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "trophies",
    name: "Trophies",
    state: "CLUB_CONFIGURABLE" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "dues_tracking",
    name: "Dues Tracking",
    state: "CLUB_CONFIGURABLE" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "playbook",
    name: "Playbook / How-To",
    state: "CLUB_CONFIGURABLE" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "guest_access",
    name: "Guest Access",
    state: "CLUB_CONFIGURABLE" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "bonus_chips",
    name: "Bonus Chips (Pub Poker)",
    state: "CLUB_CONFIGURABLE" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "public_discovery",
    name: "Public Discovery",
    state: "CLUB_CONFIGURABLE" as const,
    isContextLocked: false,
    contextNote: null,
  },
  {
    featureKey: "chip_scanner",
    name: "Chip Scanner",
    state: "CLUB_CONFIGURABLE" as const,
    isContextLocked: false,
    contextNote: null,
  },
];

async function main() {
  console.log("Seeding GlobalFeatureFlags...");

  for (const flag of featureFlags) {
    await prisma.globalFeatureFlag.upsert({
      where: { featureKey: flag.featureKey },
      update: {
        name: flag.name,
        state: flag.state,
        isContextLocked: flag.isContextLocked,
        contextNote: flag.contextNote,
      },
      create: {
        featureKey: flag.featureKey,
        name: flag.name,
        state: flag.state,
        isContextLocked: flag.isContextLocked,
        contextNote: flag.contextNote,
      },
    });
    console.log(`  ✓ ${flag.featureKey}`);
  }

  console.log(`\nSeeded ${featureFlags.length} feature flags.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
