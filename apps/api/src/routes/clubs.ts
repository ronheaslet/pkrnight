import { Hono } from "hono";
import { createAuthMiddleware, type JWTPayload } from "../lib/auth";
import { prisma } from "../../../../packages/db/src/client";
import {
  requireClubMember,
  requireRole,
  requirePermission,
} from "../middleware/permissions";
import {
  createClub,
  getClub,
  updateClub,
  getClubFeatureFlags,
  updateClubFeatureFlag,
} from "../services/clubService";
import {
  getMembers,
  addMember,
  removeMember,
  updateMemberRole,
  assignSpecialRole,
  removeSpecialRole,
  createCustomRole,
  transferOwnership,
  getCustomRoles,
} from "../services/memberService";
import {
  getMockClub,
  getMockMembers,
  getMockFeatureFlags,
  getMockCustomRoles,
  getMockSeasons,
} from "../lib/mockData";
import QRCode from "qrcode";

export const clubRoutes = new Hono();

// All club routes require auth
clubRoutes.use("*", createAuthMiddleware());

// POST /clubs — create a new club
clubRoutes.post("/", async (c) => {
  const user = c.get("user") as JWTPayload;
  const body = await c.req.json();

  const { name, slug, clubType, timezone } = body;
  if (!name || !slug || !clubType) {
    return c.json({ error: "name, slug, and clubType are required" }, 400);
  }

  try {
    const result = await createClub(
      { name, slug, clubType, timezone },
      user.userId
    );
    return c.json(result, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create club";
    // If it's a known validation error, return 400
    if (message.includes("Slug") || message.includes("slug")) {
      return c.json({ error: message }, 400);
    }
    // DB unavailable — return mock
    return c.json(
      {
        club: getMockClub(),
        membership: {
          id: "mock-membership-owner",
          clubId: getMockClub().id,
          personId: user.userId,
          systemRole: "OWNER",
          status: "ACTIVE",
        },
        _mock: true,
      },
      201
    );
  }
});

// GET /clubs/:clubId
clubRoutes.get("/:clubId", requireClubMember(), async (c) => {
  const clubId = c.req.param("clubId");

  try {
    const club = await getClub(clubId);
    return c.json(club);
  } catch {
    // Fallback to mock
    if (clubId === "mock-club-001") {
      return c.json(getMockClub(), 200);
    }
    return c.json({ error: "Club not found" }, 404);
  }
});

// PATCH /clubs/:clubId
clubRoutes.patch(
  "/:clubId",
  requireClubMember(),
  requireRole("OWNER"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const body = await c.req.json();

    try {
      const club = await updateClub(clubId, body, user.userId);
      return c.json(club);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update club";
      return c.json({ error: message }, 400);
    }
  }
);

// GET /clubs/:clubId/members
clubRoutes.get("/:clubId/members", requireClubMember(), async (c) => {
  const clubId = c.req.param("clubId");

  try {
    const members = await getMembers(clubId);
    return c.json(members);
  } catch {
    if (clubId === "mock-club-001") {
      return c.json(getMockMembers(), 200);
    }
    return c.json({ error: "Failed to load members" }, 500);
  }
});

// POST /clubs/:clubId/members
clubRoutes.post(
  "/:clubId/members",
  requireClubMember(),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const body = await c.req.json();

    // Permission check: manage_members OR OWNER/ADMIN
    const hasPermission =
      user.permissions.includes("manage_members") ||
      user.roles.includes("OWNER") ||
      user.roles.includes("ADMIN") ||
      user.isSuperAdmin;

    if (!hasPermission) {
      return c.json({ error: "forbidden" }, 403);
    }

    try {
      const membership = await addMember(clubId, body.personId, user.userId, {
        systemRole: body.systemRole,
        memberType: body.memberType,
      });
      return c.json(membership, 201);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to add member";
      return c.json({ error: message }, 400);
    }
  }
);

// DELETE /clubs/:clubId/members/:personId
clubRoutes.delete(
  "/:clubId/members/:personId",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const personId = c.req.param("personId");

    try {
      const membership = await removeMember(clubId, personId, user.userId);
      return c.json(membership);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to remove member";
      return c.json({ error: message }, 400);
    }
  }
);

// PATCH /clubs/:clubId/members/:personId/role
clubRoutes.patch(
  "/:clubId/members/:personId/role",
  requireClubMember(),
  requireRole("OWNER"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const personId = c.req.param("personId");
    const { systemRole } = await c.req.json();

    try {
      const membership = await updateMemberRole(
        clubId,
        personId,
        systemRole,
        user.userId
      );
      return c.json(membership);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update role";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /clubs/:clubId/members/:personId/special-roles
clubRoutes.post(
  "/:clubId/members/:personId/special-roles",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const personId = c.req.param("personId");
    const { customRoleId } = await c.req.json();

    try {
      const membership = await assignSpecialRole(
        clubId,
        personId,
        customRoleId,
        user.userId
      );
      return c.json(membership);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to assign role";
      return c.json({ error: message }, 400);
    }
  }
);

// DELETE /clubs/:clubId/members/:personId/special-roles/:customRoleId
clubRoutes.delete(
  "/:clubId/members/:personId/special-roles/:customRoleId",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const personId = c.req.param("personId");
    const customRoleId = c.req.param("customRoleId");

    try {
      const membership = await removeSpecialRole(
        clubId,
        personId,
        customRoleId,
        user.userId
      );
      return c.json(membership);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to remove role";
      return c.json({ error: message }, 400);
    }
  }
);

// GET /clubs/:clubId/roles
clubRoutes.get("/:clubId/roles", requireClubMember(), async (c) => {
  const clubId = c.req.param("clubId");

  try {
    const roles = await getCustomRoles(clubId);
    return c.json(roles);
  } catch {
    if (clubId === "mock-club-001") {
      return c.json(getMockCustomRoles(), 200);
    }
    return c.json({ error: "Failed to load roles" }, 500);
  }
});

// POST /clubs/:clubId/roles
clubRoutes.post(
  "/:clubId/roles",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const body = await c.req.json();

    try {
      const role = await createCustomRole(clubId, body, user.userId);
      return c.json(role, 201);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create role";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /clubs/:clubId/transfer-ownership
clubRoutes.post(
  "/:clubId/transfer-ownership",
  requireClubMember(),
  requireRole("OWNER"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const { toPersonId } = await c.req.json();

    try {
      const result = await transferOwnership(clubId, toPersonId, user.userId);
      return c.json(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to transfer ownership";
      return c.json({ error: message }, 400);
    }
  }
);

// GET /clubs/:clubId/seasons
clubRoutes.get("/:clubId/seasons", requireClubMember(), async (c) => {
  const clubId = c.req.param("clubId");

  try {
    const { db } = await import("../../../../packages/db/src/client");
    const seasons = await db.season.findMany({
      where: { clubId },
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, startDate: true, endDate: true },
    });
    return c.json(seasons);
  } catch {
    if (clubId === "mock-club-001") {
      return c.json(getMockSeasons(), 200);
    }
    return c.json([], 200);
  }
});

// GET /clubs/:clubId/features
clubRoutes.get("/:clubId/features", requireClubMember(), async (c) => {
  const clubId = c.req.param("clubId");

  try {
    const flags = await getClubFeatureFlags(clubId);
    return c.json(flags);
  } catch {
    if (clubId === "mock-club-001") {
      return c.json(getMockFeatureFlags(), 200);
    }
    return c.json({ error: "Failed to load features" }, 500);
  }
});

// PATCH /clubs/:clubId/features/:featureKey
clubRoutes.patch(
  "/:clubId/features/:featureKey",
  requireClubMember(),
  requireRole("OWNER"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const featureKey = c.req.param("featureKey");
    const { isEnabled } = await c.req.json();

    try {
      const flag = await updateClubFeatureFlag(
        clubId,
        featureKey,
        isEnabled,
        user.userId
      );
      return c.json(flag);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update feature";
      return c.json({ error: message }, 400);
    }
  }
);

// ============================================================
// Phase 9 — QR Code Generation
// ============================================================

const BASE_URL = process.env.PUBLIC_URL || "https://pkrnight.com";

// POST /clubs/:clubId/generate-qr — admin auth, generates club QR
clubRoutes.post(
  "/:clubId/generate-qr",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const clubId = c.req.param("clubId");

    try {
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { slug: true, clubType: true },
      });

      if (!club) return c.json({ error: "Club not found" }, 404);
      if (club.clubType === "HOME_GAME") {
        return c.json({ error: "Home games do not support public QR codes" }, 400);
      }

      const url = `${BASE_URL}/c/${club.slug}?ref=club`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: { dark: "#D4AF37", light: "#0f0f0f" },
      });

      await prisma.club.update({
        where: { id: clubId },
        data: { qrCodeUrl: qrDataUrl },
      });

      return c.json({ qrCodeUrl: qrDataUrl, url });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate QR";
      return c.json({ error: message }, 500);
    }
  }
);

// PATCH /clubs/:clubId/public-profile — update public profile fields
clubRoutes.patch(
  "/:clubId/public-profile",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const body = await c.req.json();

    try {
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { clubType: true },
      });
      if (!club) return c.json({ error: "Club not found" }, 404);
      if (club.clubType === "HOME_GAME") {
        return c.json({ error: "Home games do not have public profiles" }, 400);
      }

      const updated = await prisma.club.update({
        where: { id: clubId },
        data: {
          ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
          ...(body.publicBio !== undefined && { publicBio: body.publicBio }),
          ...(body.venueAddress !== undefined && { venueAddress: body.venueAddress }),
          ...(body.venueCity !== undefined && { venueCity: body.venueCity }),
          ...(body.socialLink !== undefined && { socialLink: body.socialLink }),
        },
      });

      await prisma.auditLog.create({
        data: {
          clubId,
          actorId: user.userId,
          action: "UPDATE",
          entityType: "Club",
          entityId: clubId,
          newValue: body as any,
          note: "Updated public profile",
        },
      });

      return c.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /clubs/:clubId/join — join a club (authenticated)
clubRoutes.post("/:clubId/join", async (c) => {
  const user = c.get("user") as JWTPayload;
  const clubId = c.req.param("clubId");

  try {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, clubType: true, isPublic: true, name: true },
    });

    if (!club) return c.json({ error: "Club not found" }, 404);
    if (club.clubType === "HOME_GAME" && !club.isPublic) {
      return c.json({ error: "This club is invite-only" }, 403);
    }

    // Check for existing membership
    const existing = await prisma.membership.findUnique({
      where: { clubId_personId: { clubId, personId: user.userId } },
    });

    if (existing) {
      if (existing.status === "ACTIVE") {
        return c.json({ message: "Already a member", membershipId: existing.id });
      }
      // Reactivate suspended/banned membership
      const reactivated = await prisma.membership.update({
        where: { id: existing.id },
        data: { status: "ACTIVE" },
      });
      return c.json({ message: "Membership reactivated", membershipId: reactivated.id });
    }

    const membership = await prisma.membership.create({
      data: {
        clubId,
        personId: user.userId,
        systemRole: "MEMBER",
        status: "ACTIVE",
        memberType: "PAID",
      },
    });

    return c.json({ message: "Joined successfully", membershipId: membership.id }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to join club";
    return c.json({ error: message }, 500);
  }
});

// GET /clubs/:clubId/qr — get existing QR code for the club
clubRoutes.get(
  "/:clubId/qr",
  requireClubMember(),
  async (c) => {
    const clubId = c.req.param("clubId");

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { qrCodeUrl: true, slug: true },
    });

    if (!club) return c.json({ error: "Club not found" }, 404);

    return c.json({
      qrCodeUrl: club.qrCodeUrl,
      url: club.slug ? `${BASE_URL}/c/${club.slug}?ref=club` : null,
    });
  }
);

// GET /users/me/referral-qr — generate personal referral QR on demand
clubRoutes.get("/users/me/referral-qr", async (c) => {
  const user = c.get("user") as JWTPayload;

  try {
    const referralCode = await prisma.referralCode.findUnique({
      where: { personId: user.userId },
    });

    if (!referralCode) {
      return c.json({ error: "No referral code found" }, 404);
    }

    const url = `${BASE_URL}/join?ref=${referralCode.code}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: { dark: "#D4AF37", light: "#0f0f0f" },
    });

    return c.json({ qrCodeUrl: qrDataUrl, url, code: referralCode.code });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate QR";
    return c.json({ error: message }, 500);
  }
});

// GET /users/me/referral-code — get referral code and URL
clubRoutes.get("/users/me/referral-code", async (c) => {
  const user = c.get("user") as JWTPayload;

  const referralCode = await prisma.referralCode.findUnique({
    where: { personId: user.userId },
  });

  if (!referralCode) {
    return c.json({ error: "No referral code found" }, 404);
  }

  return c.json({
    code: referralCode.code,
    url: `${BASE_URL}/join?ref=${referralCode.code}`,
    totalReferrals: referralCode.totalReferrals,
  });
});
