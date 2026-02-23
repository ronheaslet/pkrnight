import { db } from "../../../../packages/db/src/client";
import { assertPubPoker } from "../lib/pubPokerGuard";

interface VenueProfileInput {
  venueName: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  operatingNights?: string[];
  contactPhone?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
}

export async function createOrUpdateVenueProfile(
  clubId: string,
  data: VenueProfileInput,
  actorId: string
) {
  await assertPubPoker(clubId);

  // Verify actor is OWNER
  const membership = await db.membership.findUnique({
    where: { clubId_personId: { clubId, personId: actorId } },
  });
  if (!membership || membership.systemRole !== "OWNER") {
    throw new Error("Only the owner can manage the venue profile");
  }

  const venueProfile = await db.venueProfile.upsert({
    where: { clubId },
    update: {
      venueName: data.venueName,
      address: data.address,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      operatingNights: data.operatingNights ?? [],
      contactPhone: data.contactPhone ?? null,
      contactEmail: data.contactEmail ?? null,
      websiteUrl: data.websiteUrl ?? null,
    },
    create: {
      clubId,
      venueName: data.venueName,
      address: data.address,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      operatingNights: data.operatingNights ?? [],
      contactPhone: data.contactPhone ?? null,
      contactEmail: data.contactEmail ?? null,
      websiteUrl: data.websiteUrl ?? null,
    },
  });

  return venueProfile;
}

export async function getVenueProfile(clubId: string) {
  const profile = await db.venueProfile.findUnique({ where: { clubId } });
  return profile; // null if not set yet — not an error
}

export async function getPublicVenues() {
  const clubs = await db.club.findMany({
    where: {
      isPublic: true,
      clubType: "PUB_POKER",
      isActive: true,
    },
    include: {
      venueProfile: true,
    },
  });

  return clubs.map((club) => ({
    clubId: club.id,
    name: club.name,
    slug: club.slug,
    venueName: club.venueProfile?.venueName ?? null,
    address: club.venueProfile?.address ?? null,
    lat: club.venueProfile?.lat ?? null,
    lng: club.venueProfile?.lng ?? null,
    operatingNights: club.venueProfile?.operatingNights ?? [],
  }));
}
