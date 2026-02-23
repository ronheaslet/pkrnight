import type { Context, Next } from "hono";
import type { JWTPayload } from "../lib/auth";

// Permission field names on the CustomRole model
const PERMISSION_FIELDS = [
  "pauseTimer",
  "startGame",
  "manageRebuys",
  "eliminatePlayers",
  "manageMoney",
  "postTransactions",
  "viewFinancials",
  "exportReports",
  "viewAuditLog",
  "issuePenalties",
  "makeAnnouncements",
  "awardTrophies",
  "postToFeed",
  "postExpenseOnly",
  "pauseAllTables",
  "clubWideAnnounce",
  "levelOverride",
] as const;

type PermissionField = (typeof PERMISSION_FIELDS)[number];

// Map camelCase permission fields to snake_case permission strings used in JWT
const PERMISSION_MAP: Record<PermissionField, string> = {
  pauseTimer: "pause_timer",
  startGame: "start_game",
  manageRebuys: "manage_rebuys",
  eliminatePlayers: "eliminate_players",
  manageMoney: "manage_money",
  postTransactions: "post_transactions",
  viewFinancials: "view_financials",
  exportReports: "export_reports",
  viewAuditLog: "view_audit_log",
  issuePenalties: "issue_penalties",
  makeAnnouncements: "make_announcements",
  awardTrophies: "award_trophies",
  postToFeed: "post_to_feed",
  postExpenseOnly: "post_expense_only",
  pauseAllTables: "pause_all_tables",
  clubWideAnnounce: "club_wide_announce",
  levelOverride: "level_override",
};

/**
 * Hono middleware factory. Checks that the JWT payload has at least one of
 * the provided permission strings OR has systemRole OWNER or ADMIN.
 */
export function requirePermission(...permissions: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as JWTPayload | undefined;
    if (!user) {
      return c.json({ error: "unauthorized" }, 401);
    }

    // OWNER and ADMIN bypass permission checks
    if (
      user.roles.includes("OWNER") ||
      user.roles.includes("ADMIN") ||
      user.isSuperAdmin
    ) {
      await next();
      return;
    }

    const hasPermission = permissions.some((p) =>
      user.permissions.includes(p)
    );
    if (!hasPermission) {
      return c.json({ error: "forbidden", required: permissions }, 403);
    }

    await next();
  };
}

/**
 * Hono middleware factory. Checks JWT payload roles[] contains at least
 * one of the provided roles.
 */
export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as JWTPayload | undefined;
    if (!user) {
      return c.json({ error: "unauthorized" }, 401);
    }

    if (user.isSuperAdmin) {
      await next();
      return;
    }

    const hasRole = roles.some((r) => user.roles.includes(r));
    if (!hasRole) {
      return c.json({ error: "forbidden", required: roles }, 403);
    }

    await next();
  };
}

/**
 * Hono middleware. Checks isSuperAdmin === true in JWT payload AND
 * verifies the userId matches SUPER_ADMIN_PERSON_ID from env.
 */
export function requireSuperAdmin() {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as JWTPayload | undefined;
    if (!user) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const superAdminId = process.env.SUPER_ADMIN_PERSON_ID;
    if (!user.isSuperAdmin || user.userId !== superAdminId) {
      return c.json({ error: "forbidden" }, 403);
    }

    await next();
  };
}

/**
 * Hono middleware. Verifies the JWT clubId matches the :clubId param in
 * the route. Prevents cross-club data access.
 */
export function requireClubMember() {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as JWTPayload | undefined;
    if (!user) {
      return c.json({ error: "unauthorized" }, 401);
    }

    // Super admins can access any club
    if (user.isSuperAdmin) {
      await next();
      return;
    }

    const clubId = c.req.param("clubId");
    if (!clubId || user.clubId !== clubId) {
      return c.json({ error: "wrong_club" }, 403);
    }

    await next();
  };
}

/**
 * Pure function (not middleware). Takes a membership record with loaded
 * special roles and returns a flat string[] of all permissions.
 */
export function buildPermissions(
  membership: {
    specialRoles: Array<{
      customRole: Record<string, unknown>;
    }>;
  }
): string[] {
  const permissions = new Set<string>();

  for (const sr of membership.specialRoles) {
    const role = sr.customRole;
    for (const field of PERMISSION_FIELDS) {
      if (role[field] === true) {
        permissions.add(PERMISSION_MAP[field]);
      }
    }
  }

  return Array.from(permissions);
}
