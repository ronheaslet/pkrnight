import { prisma } from "../../../../packages/db/src/client";
import { invalidateFeatureCache } from "../middleware/featureFlags";
import { seedDefaultTrophies } from "./trophyService";

interface CreateClubInput {
  name: string;
  slug: string;
  clubType: "HOME_GAME" | "PUB_POKER" | "CIRCUIT";
  timezone?: string;
}

interface UpdateClubInput {
  name?: string;
  tagline?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  timezone?: string;
  isPublic?: boolean;
  publicBio?: string;
  venueAddress?: string;
  venueCity?: string;
  socialLink?: string;
}

function generateClubReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

// Default system roles seeded when a club is created
const DEFAULT_SYSTEM_ROLES = [
  {
    name: "Accountant",
    emoji: "\u{1F4CA}",
    description: "Finance management",
    manageMoney: true,
    postTransactions: true,
    viewFinancials: true,
    exportReports: true,
    viewAuditLog: true,
  },
  {
    name: "Sergeant at Arms",
    emoji: "\u{1F6E1}\uFE0F",
    description: "Game enforcement",
    pauseTimer: true,
    startGame: true,
    eliminatePlayers: true,
    issuePenalties: true,
  },
  {
    name: "Dealer",
    emoji: "\u{1F0CF}",
    description: "Deals cards, manages timer",
    pauseTimer: true,
    levelOverride: true,
  },
  {
    name: "Rebuy Handler",
    emoji: "\u{1F504}",
    description: "Handles rebuys and add-ons",
    manageRebuys: true,
  },
  {
    name: "Tournament Director",
    emoji: "\u{1F3C6}",
    description: "Full tournament control",
    startGame: true,
    pauseTimer: true,
    eliminatePlayers: true,
    issuePenalties: true,
    pauseAllTables: true,
    clubWideAnnounce: true,
  },
  {
    name: "Food & Drinks Coordinator",
    emoji: "\u{1F355}",
    description: "Manages food and drink expenses",
    postExpenseOnly: true,
  },
  {
    name: "Social Media Manager",
    emoji: "\u{1F4F8}",
    description: "Posts to club feed",
    postToFeed: true,
  },
  {
    name: "Commissioner",
    emoji: "\u{1F3AF}",
    description: "Honorary badge — no special permissions",
  },
];

export async function createClub(data: CreateClubInput, ownerId: string) {
  // Validate slug
  const slug = data.slug.toLowerCase();
  if (!SLUG_REGEX.test(slug)) {
    throw new Error(
      "Slug must be lowercase alphanumeric + hyphens, 3-30 chars"
    );
  }

  // Check slug uniqueness
  const existing = await prisma.club.findUnique({ where: { slug } });
  if (existing) {
    throw new Error("Slug already taken");
  }

  // Generate referral code for pub_poker and circuit clubs
  let clubRefCode: string | null = null;
  if (data.clubType === "PUB_POKER" || data.clubType === "CIRCUIT") {
    clubRefCode = generateClubReferralCode();
    let refAttempts = 0;
    while (refAttempts < 10) {
      const existingRef = await prisma.club.findUnique({
        where: { referralCode: clubRefCode },
      });
      if (!existingRef) break;
      clubRefCode = generateClubReferralCode();
      refAttempts++;
    }
  }

  // Create club + owner membership + treasury + default roles in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const club = await tx.club.create({
      data: {
        name: data.name,
        slug,
        clubType: data.clubType,
        timezone: data.timezone || "America/New_York",
        referralCode: clubRefCode,
      },
    });

    const membership = await tx.membership.create({
      data: {
        clubId: club.id,
        personId: ownerId,
        systemRole: "OWNER",
        status: "ACTIVE",
      },
    });

    await tx.treasuryBalance.create({
      data: {
        clubId: club.id,
        currentBalance: 0,
        minimumReserve: 0,
      },
    });

    // Seed default system custom roles
    for (const role of DEFAULT_SYSTEM_ROLES) {
      const { name, emoji, description, ...permissions } = role;
      await tx.customRole.create({
        data: {
          clubId: club.id,
          name,
          emoji,
          description: description || null,
          isSystem: true,
          ...permissions,
        },
      });
    }

    // Seed default trophies
    await seedDefaultTrophies(club.id, tx);

    return { club, membership };
  });

  return result;
}

export async function getClub(clubId: string) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      venueProfile: true,
      featureFlags: true,
      _count: {
        select: {
          memberships: {
            where: { status: "ACTIVE" },
          },
        },
      },
    },
  });

  if (!club) throw new Error("Club not found");

  return {
    ...club,
    memberCount: club._count.memberships,
  };
}

export async function updateClub(
  clubId: string,
  data: UpdateClubInput,
  actorId: string
) {
  // Verify actor is owner
  const membership = await prisma.membership.findUnique({
    where: { clubId_personId: { clubId, personId: actorId } },
  });

  if (!membership || membership.systemRole !== "OWNER") {
    throw new Error("Only the owner can update club settings");
  }

  const club = await prisma.club.update({
    where: { id: clubId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.tagline !== undefined && { tagline: data.tagline }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      ...(data.primaryColor !== undefined && {
        primaryColor: data.primaryColor,
      }),
      ...(data.accentColor !== undefined && {
        accentColor: data.accentColor,
      }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
      ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
      ...(data.publicBio !== undefined && { publicBio: data.publicBio }),
      ...(data.venueAddress !== undefined && { venueAddress: data.venueAddress }),
      ...(data.venueCity !== undefined && { venueCity: data.venueCity }),
      ...(data.socialLink !== undefined && { socialLink: data.socialLink }),
    },
  });

  await prisma.auditLog.create({
    data: {
      clubId,
      actorId,
      action: "UPDATE",
      entityType: "Club",
      entityId: clubId,
      newValue: data as any,
    },
  });

  return club;
}

export async function updateClubFeatureFlag(
  clubId: string,
  featureKey: string,
  isEnabled: boolean,
  actorId: string
) {
  // Verify feature exists and is CLUB_CONFIGURABLE
  const globalFlag = await prisma.globalFeatureFlag.findUnique({
    where: { featureKey },
  });

  if (!globalFlag) throw new Error("Feature not found");
  if (globalFlag.state !== "CLUB_CONFIGURABLE") {
    throw new Error("Feature is not club-configurable");
  }

  const flag = await prisma.clubFeatureFlag.upsert({
    where: { clubId_featureKey: { clubId, featureKey } },
    update: { isEnabled },
    create: { clubId, featureKey, isEnabled },
  });

  // Invalidate cache
  invalidateFeatureCache(clubId, featureKey);

  return flag;
}

export async function getClubFeatureFlags(clubId: string) {
  const [globalFlags, clubFlags] = await Promise.all([
    prisma.globalFeatureFlag.findMany(),
    prisma.clubFeatureFlag.findMany({ where: { clubId } }),
  ]);

  const clubFlagMap = new Map(
    clubFlags.map((f) => [f.featureKey, f.isEnabled])
  );

  return globalFlags.map((gf) => ({
    featureKey: gf.featureKey,
    name: gf.name,
    description: gf.description,
    globalState: gf.state,
    clubEnabled:
      gf.state === "GLOBALLY_ON"
        ? true
        : gf.state === "GLOBALLY_OFF"
          ? false
          : clubFlagMap.get(gf.featureKey) ?? true,
    isContextLocked: gf.isContextLocked,
    contextNote: gf.contextNote,
  }));
}
