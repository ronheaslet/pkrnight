import type { Context, Next } from "hono";

interface RateLimitConfig {
  window: number;
  max: number;
}

const limits: Record<string, RateLimitConfig> = {
  auth: { window: 60_000, max: 10 },
  api: { window: 60_000, max: 200 },
  public: { window: 60_000, max: 60 },
  aiScanner: { window: 60_000, max: 5 },
};

// In-memory store: key -> { count, resetAt }
const store = new Map<string, { count: number; resetAt: number }>();

// Clean expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

function checkLimit(key: string, config: RateLimitConfig): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.window });
    return { allowed: true, retryAfter: 0 };
  }

  entry.count++;
  if (entry.count > config.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true, retryAfter: 0 };
}

export function rateLimitAuth() {
  return async (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for") || "unknown";
    const { allowed, retryAfter } = checkLimit(`auth:${ip}`, limits.auth!);
    if (!allowed) {
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Too many requests" }, 429);
    }
    await next();
  };
}

export function rateLimitPublic() {
  return async (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for") || "unknown";
    const { allowed, retryAfter } = checkLimit(`public:${ip}`, limits.public!);
    if (!allowed) {
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Too many requests" }, 429);
    }
    await next();
  };
}

export function rateLimitApi() {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as { userId: string } | undefined;
    const key = user ? `api:${user.userId}` : `api:${c.req.header("x-forwarded-for") || "unknown"}`;
    const { allowed, retryAfter } = checkLimit(key, limits.api!);
    if (!allowed) {
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Too many requests" }, 429);
    }
    await next();
  };
}

export function rateLimitAiScanner() {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as { userId: string } | undefined;
    const key = user ? `scanner:${user.userId}` : `scanner:${c.req.header("x-forwarded-for") || "unknown"}`;
    const { allowed, retryAfter } = checkLimit(key, limits.aiScanner!);
    if (!allowed) {
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Too many requests" }, 429);
    }
    await next();
  };
}
