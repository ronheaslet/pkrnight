import jwt from "jsonwebtoken";
import type { Context, Next } from "hono";

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

// Hono context variables type — used by all route handlers
export type AppVariables = {
  user: JWTPayload;
};

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
};

const getExpiresIn = (): number => {
  const val = process.env.JWT_EXPIRES_IN || "7d";
  const match = val.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 7 * 24 * 60 * 60;
  const num = parseInt(match[1]!, 10);
  const unit = match[2]!;
  switch (unit) {
    case "s": return num;
    case "m": return num * 60;
    case "h": return num * 60 * 60;
    case "d": return num * 24 * 60 * 60;
    default: return 7 * 24 * 60 * 60;
  }
};

export function generateToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, getSecret(), { expiresIn: 15 * 60 }); // 15 minutes
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: "refresh" }, getSecret(), { expiresIn: 30 * 24 * 60 * 60 }); // 30 days
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, getSecret()) as { userId: string; type?: string };
    if (payload.type !== "refresh") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

export function createAuthMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid Authorization header" }, 401);
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    if (!payload) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    c.set("user", payload);
    await next();
  };
}
