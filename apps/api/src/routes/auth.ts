import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../../../../packages/db/src/client";
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  createAuthMiddleware,
  type JWTPayload,
} from "../lib/auth";
import { buildPermissions } from "../middleware/permissions";
import { getMockClubsForUser } from "../lib/mockData";

// In-memory OTP store (Redis in production)
const otpStore = new Map<string, { otp: string; expiresAt: Date }>();

// E.164 phone validation
const e164Regex = /^\+[1-9]\d{1,14}$/;

const sendOtpSchema = z.object({
  phone: z
    .string()
    .regex(
      e164Regex,
      "Phone must be in E.164 format (e.g., +14155551234)"
    ),
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(e164Regex, "Phone must be in E.164 format"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateReferralCode(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Build a full JWT payload for a person within a specific club context.
 */
async function buildJWTForClub(
  personId: string,
  clubId: string,
  isSuperAdmin: boolean
): Promise<Omit<JWTPayload, "iat" | "exp">> {
  const membership = await prisma.membership.findUnique({
    where: { clubId_personId: { clubId, personId } },
    include: {
      specialRoles: {
        include: { customRole: true },
      },
      club: {
        select: { planTier: true, brandingKey: true },
      },
    },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new Error("Not an active member of this club");
  }

  const permissions = buildPermissions(membership);

  return {
    userId: personId,
    clubId,
    planTier: membership.club.planTier,
    brandingKey: membership.club.brandingKey,
    roles: [membership.systemRole],
    permissions,
    isSuperAdmin,
  };
}

export const authRoutes = new Hono();

// POST /auth/otp/send
authRoutes.post("/otp/send", async (c) => {
  const body = await c.req.json();
  const parsed = sendOtpSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]!.message }, 400);
  }

  const { phone } = parsed.data;
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  otpStore.set(phone, { otp, expiresAt });

  // Send via Twilio
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && fromNumber) {
      const twilio = await import("twilio");
      const client = twilio.default(accountSid, authToken);
      await client.messages.create({
        body: `Your PKR Night code is: ${otp}. Expires in 10 minutes.`,
        from: fromNumber,
        to: phone,
      });
    } else {
      console.warn("Twilio credentials not set — OTP not sent via SMS");
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
    }
  } catch (err) {
    console.error("Failed to send SMS:", err);
  }

  return c.json({ success: true });
});

// POST /auth/check-phone — check if phone is registered (for join flow)
authRoutes.post("/check-phone", async (c) => {
  const body = await c.req.json();
  const parsed = sendOtpSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]!.message }, 400);
  }
  const person = await prisma.person.findUnique({
    where: { phone: parsed.data.phone },
  });
  return c.json({ exists: !!person });
});

// POST /auth/register — register a new account with referral attribution
authRoutes.post("/register", async (c) => {
  const body = await c.req.json();
  const { phone, displayName, ref, clubSlug } = body;

  if (!phone || !displayName) {
    return c.json({ error: "phone and displayName are required" }, 400);
  }

  // Check if person already exists
  const existing = await prisma.person.findUnique({ where: { phone } });
  if (existing) {
    return c.json({ error: "Phone already registered" }, 409);
  }

  // Create person
  const person = await prisma.person.create({
    data: {
      phone,
      displayName,
      isVerified: true,
    },
  });

  // Generate unique referral code for this person
  let newRefCode = generateReferralCode();
  let codeAttempts = 0;
  while (codeAttempts < 10) {
    const existingCode = await prisma.referralCode.findUnique({
      where: { code: newRefCode },
    });
    if (!existingCode) break;
    newRefCode = generateReferralCode();
    codeAttempts++;
  }

  await prisma.referralCode.create({
    data: { personId: person.id, code: newRefCode },
  });

  // Create ReferralEvent for attribution
  try {
    if (ref && ref !== "club") {
      // Member referral — look up by referral code
      const referrerCode = await prisma.referralCode.findUnique({
        where: { code: ref },
      });
      if (referrerCode) {
        // Find club from slug if available
        let clubId: string | null = null;
        if (clubSlug) {
          const club = await prisma.club.findUnique({
            where: { slug: clubSlug },
            select: { id: true },
          });
          clubId = club?.id ?? null;
        }

        await prisma.referralEvent.create({
          data: {
            referralCodeId: referrerCode.id,
            referredPersonId: person.id,
            clubId,
            source: "QR_SCAN",
            accountCreatedAt: new Date(),
          },
        });

        // Increment referrer's count
        await prisma.referralCode.update({
          where: { id: referrerCode.id },
          data: { totalReferrals: { increment: 1 } },
        });
      }
    } else if (ref === "club" && clubSlug) {
      // Club QR scan
      const club = await prisma.club.findUnique({
        where: { slug: clubSlug },
        select: { id: true },
      });
      if (club) {
        await prisma.referralEvent.create({
          data: {
            referredPersonId: person.id,
            clubId: club.id,
            source: "QR_SCAN",
            accountCreatedAt: new Date(),
          },
        });
      }
    } else {
      // Direct / organic
      await prisma.referralEvent.create({
        data: {
          referredPersonId: person.id,
          source: "ORGANIC",
          accountCreatedAt: new Date(),
        },
      });
    }
  } catch (refErr) {
    // Don't fail registration if referral tracking fails
    console.error("Referral tracking error:", refErr);
  }

  // Build token
  const tokenPayload = {
    userId: person.id,
    clubId: null as string | null,
    planTier: "FREE",
    brandingKey: null as string | null,
    roles: [] as string[],
    permissions: [] as string[],
    isSuperAdmin: false,
  };

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(person.id);

  return c.json({
    token,
    refreshToken,
    person: {
      id: person.id,
      displayName: person.displayName,
      isVerified: person.isVerified,
      isSuperAdmin: person.isSuperAdmin,
    },
  }, 201);
});

// POST /auth/otp/verify
authRoutes.post("/otp/verify", async (c) => {
  const body = await c.req.json();
  const parsed = verifyOtpSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]!.message }, 400);
  }

  const { phone, otp } = parsed.data;
  const stored = otpStore.get(phone);

  if (!stored) {
    return c.json({ error: "No OTP found for this phone number" }, 400);
  }

  if (new Date() > stored.expiresAt) {
    otpStore.delete(phone);
    return c.json({ error: "OTP has expired" }, 400);
  }

  if (stored.otp !== otp) {
    return c.json({ error: "Invalid OTP" }, 400);
  }

  // One-time use — delete after verification
  otpStore.delete(phone);

  // Find or create Person
  let person = await prisma.person.findUnique({ where: { phone } });

  if (!person) {
    person = await prisma.person.create({
      data: {
        phone,
        displayName: "New Player",
        isVerified: true,
      },
    });

    // Generate unique referral code
    let referralCode = generateReferralCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.referralCode.findUnique({
        where: { code: referralCode },
      });
      if (!existing) break;
      referralCode = generateReferralCode();
      attempts++;
    }

    await prisma.referralCode.create({
      data: {
        personId: person.id,
        code: referralCode,
      },
    });
  } else {
    // Update last active
    await prisma.person.update({
      where: { id: person.id },
      data: { lastActiveAt: new Date(), isVerified: true },
    });
  }

  // Load active memberships to build enriched JWT
  const memberships = await prisma.membership.findMany({
    where: { personId: person.id, status: "ACTIVE" },
    include: {
      specialRoles: { include: { customRole: true } },
      club: { select: { id: true, planTier: true, brandingKey: true } },
    },
  });

  let tokenPayload: Omit<JWTPayload, "iat" | "exp">;

  if (memberships.length === 1) {
    // Single club — set full context
    const m = memberships[0]!;
    const permissions = buildPermissions(m);
    tokenPayload = {
      userId: person.id,
      clubId: m.club.id,
      planTier: m.club.planTier,
      brandingKey: m.club.brandingKey,
      roles: [m.systemRole],
      permissions,
      isSuperAdmin: person.isSuperAdmin,
    };
  } else {
    // No clubs or multiple clubs — clubId null, they'll pick later
    tokenPayload = {
      userId: person.id,
      clubId: null,
      planTier: "FREE",
      brandingKey: null,
      roles: [],
      permissions: [],
      isSuperAdmin: person.isSuperAdmin,
    };
  }

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(person.id);

  return c.json({
    token,
    refreshToken,
    person: {
      id: person.id,
      displayName: person.displayName,
      isVerified: person.isVerified,
      isSuperAdmin: person.isSuperAdmin,
    },
  });
});

// POST /auth/switch-club — switch club context, get new JWT
authRoutes.post("/switch-club", createAuthMiddleware(), async (c) => {
  const user = c.get("user") as JWTPayload;
  const { clubId } = await c.req.json();

  if (!clubId) {
    return c.json({ error: "clubId is required" }, 400);
  }

  try {
    const payload = await buildJWTForClub(
      user.userId,
      clubId,
      user.isSuperAdmin
    );
    const token = generateToken(payload);
    return c.json({ token });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to switch club";
    return c.json({ error: message }, 403);
  }
});

// GET /auth/me/clubs — list all clubs the user is a member of
authRoutes.get("/me/clubs", createAuthMiddleware(), async (c) => {
  const user = c.get("user") as JWTPayload;

  try {
    const memberships = await prisma.membership.findMany({
      where: { personId: user.userId, status: "ACTIVE" },
      include: {
        club: {
          include: {
            _count: {
              select: { memberships: { where: { status: "ACTIVE" } } },
            },
          },
        },
      },
    });

    const clubs = memberships.map((m) => ({
      club: {
        id: m.club.id,
        name: m.club.name,
        slug: m.club.slug,
        clubType: m.club.clubType,
        planTier: m.club.planTier,
        primaryColor: m.club.primaryColor,
        logoUrl: m.club.logoUrl,
        tagline: m.club.tagline,
      },
      systemRole: m.systemRole,
      memberCount: m.club._count.memberships,
    }));

    return c.json(clubs);
  } catch {
    // DB unavailable — return mock
    return c.json(getMockClubsForUser(), 200);
  }
});

// POST /auth/refresh — refresh access token using refresh token
authRoutes.post("/refresh", async (c) => {
  const body = await c.req.json();
  const { refreshToken } = body;

  if (!refreshToken) {
    return c.json({ error: "refreshToken is required" }, 400);
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return c.json({ error: "Invalid or expired refresh token" }, 401);
  }

  const person = await prisma.person.findUnique({
    where: { id: payload.userId },
  });
  if (!person) {
    return c.json({ error: "User not found" }, 404);
  }

  // Load active memberships to rebuild JWT
  const memberships = await prisma.membership.findMany({
    where: { personId: person.id, status: "ACTIVE" },
    include: {
      specialRoles: { include: { customRole: true } },
      club: { select: { id: true, planTier: true, brandingKey: true } },
    },
  });

  let tokenPayload: Omit<JWTPayload, "iat" | "exp">;

  if (memberships.length === 1) {
    const m = memberships[0]!;
    const permissions = buildPermissions(m);
    tokenPayload = {
      userId: person.id,
      clubId: m.club.id,
      planTier: m.club.planTier,
      brandingKey: m.club.brandingKey,
      roles: [m.systemRole],
      permissions,
      isSuperAdmin: person.isSuperAdmin,
    };
  } else {
    tokenPayload = {
      userId: person.id,
      clubId: null,
      planTier: "FREE",
      brandingKey: null,
      roles: [],
      permissions: [],
      isSuperAdmin: person.isSuperAdmin,
    };
  }

  const accessToken = generateToken(tokenPayload);
  return c.json({ accessToken, expiresIn: 900 }); // 900 seconds = 15 min
});

// POST /auth/apple (stub)
authRoutes.post("/apple", async (c) => {
  return c.json({ message: "Apple Sign-In coming in Phase 2" }, 501);
});

// GET /auth/google — redirect to Google OAuth consent screen
authRoutes.get("/google", async (c) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return c.json({ error: "Google OAuth not configured" }, 503);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /auth/google/callback — handle Google OAuth callback
authRoutes.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const error = c.req.query("error");

  // Determine frontend origin for redirects
  // In production the SPA is served from the same origin as the API.
  // For local dev, set FRONTEND_URL=http://localhost:5173 so the redirect
  // goes to the Vite dev server instead of the API port.
  const requestOrigin = `${new URL(c.req.url).protocol}//${new URL(c.req.url).host}`;
  const frontendUrl = process.env.FRONTEND_URL || requestOrigin;

  if (error || !code) {
    return c.redirect(`${frontendUrl}/login?error=google_denied`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return c.redirect(`${frontendUrl}/login?error=google_config`);
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Google token exchange failed:", await tokenRes.text());
      return c.redirect(`${frontendUrl}/login?error=google_token`);
    }

    const tokenData = (await tokenRes.json()) as { id_token?: string };

    if (!tokenData.id_token) {
      return c.redirect(`${frontendUrl}/login?error=google_token`);
    }

    // Verify the ID token
    const { OAuth2Client } = await import("google-auth-library");
    const oauth2Client = new OAuth2Client(clientId);
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokenData.id_token,
      audience: clientId,
    });

    const googlePayload = ticket.getPayload();
    if (!googlePayload || !googlePayload.email) {
      return c.redirect(`${frontendUrl}/login?error=google_profile`);
    }

    const { sub: googleId, email, name, picture } = googlePayload;

    // Look up person by googleId first, then by email
    let person = await prisma.person.findUnique({
      where: { googleId: googleId },
    });

    if (!person) {
      // Try matching by email (link Google to existing phone-auth account)
      person = await prisma.person.findFirst({
        where: { email: email },
      });

      if (person) {
        // Link Google ID to existing account
        await prisma.person.update({
          where: { id: person.id },
          data: {
            googleId,
            avatarUrl: person.avatarUrl || picture || null,
            lastActiveAt: new Date(),
          },
        });
      }
    }

    if (!person) {
      // Create new account
      person = await prisma.person.create({
        data: {
          googleId,
          email,
          displayName: name || "Player",
          avatarUrl: picture || null,
          isVerified: true,
        },
      });

      // Generate unique referral code
      let referralCode = generateReferralCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await prisma.referralCode.findUnique({
          where: { code: referralCode },
        });
        if (!existing) break;
        referralCode = generateReferralCode();
        attempts++;
      }

      await prisma.referralCode.create({
        data: { personId: person.id, code: referralCode },
      });

      // Track organic referral
      try {
        await prisma.referralEvent.create({
          data: {
            referredPersonId: person.id,
            source: "ORGANIC",
            accountCreatedAt: new Date(),
          },
        });
      } catch (refErr) {
        console.error("Referral tracking error:", refErr);
      }
    } else {
      // Update last active
      await prisma.person.update({
        where: { id: person.id },
        data: { lastActiveAt: new Date() },
      });
    }

    // Build JWT — same logic as phone auth
    const memberships = await prisma.membership.findMany({
      where: { personId: person.id, status: "ACTIVE" },
      include: {
        specialRoles: { include: { customRole: true } },
        club: { select: { id: true, planTier: true, brandingKey: true } },
      },
    });

    let tokenPayload: Omit<JWTPayload, "iat" | "exp">;

    if (memberships.length === 1) {
      const m = memberships[0]!;
      const permissions = buildPermissions(m);
      tokenPayload = {
        userId: person.id,
        clubId: m.club.id,
        planTier: m.club.planTier,
        brandingKey: m.club.brandingKey,
        roles: [m.systemRole],
        permissions,
        isSuperAdmin: person.isSuperAdmin,
      };
    } else {
      tokenPayload = {
        userId: person.id,
        clubId: null,
        planTier: "FREE",
        brandingKey: null,
        roles: [],
        permissions: [],
        isSuperAdmin: person.isSuperAdmin,
      };
    }

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(person.id);

    // Redirect to frontend with tokens
    const params = new URLSearchParams({
      token,
      refreshToken,
      userId: person.id,
      displayName: person.displayName,
      isSuperAdmin: String(person.isSuperAdmin),
    });

    return c.redirect(`${frontendUrl}/auth/callback?${params}`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    return c.redirect(`${frontendUrl}/login?error=google_failed`);
  }
});
