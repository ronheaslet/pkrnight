/**
 * Backfill slugs for pub_poker and circuit clubs that already have one
 * but may need a referralCode generated.
 * Also generates club-level referralCodes for clubs that don't have one.
 *
 * Run: cd packages/db && bun scripts/backfill-slugs.ts
 */
import { prisma } from "../src/client";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  // Find pub_poker and circuit clubs missing referral codes
  const clubs = await prisma.club.findMany({
    where: {
      clubType: { in: ["PUB_POKER", "CIRCUIT"] },
      referralCode: null,
    },
  });

  console.log(`Found ${clubs.length} clubs needing referralCode backfill`);

  for (const club of clubs) {
    let code = generateReferralCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.club.findUnique({
        where: { referralCode: code },
      });
      if (!existing) break;
      code = generateReferralCode();
      attempts++;
    }

    await prisma.club.update({
      where: { id: club.id },
      data: { referralCode: code },
    });

    console.log(`  ✓ ${club.name} → referralCode: ${code}`);
  }

  // Also backfill slugs for any clubs missing them (shouldn't happen, but safety net)
  const slugless = await prisma.club.findMany({
    where: { slug: "" },
  });

  for (const club of slugless) {
    let slug = generateSlug(club.name);
    let suffix = "";
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.club.findUnique({
        where: { slug: slug + suffix },
      });
      if (!existing) break;
      suffix = "-" + Math.random().toString(36).slice(2, 6);
      attempts++;
    }

    await prisma.club.update({
      where: { id: club.id },
      data: { slug: slug + suffix },
    });

    console.log(`  ✓ ${club.name} → slug: ${slug + suffix}`);
  }

  console.log("Backfill complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
