import { Hono } from "hono";
import { createAuthMiddleware, type JWTPayload } from "../lib/auth";
import {
  requireClubMember,
  requirePermission,
  requireRole,
} from "../middleware/permissions";
import {
  recordBuyIn,
  recordRebuy,
  recordAddOn,
  recordPayout,
  recordBounty,
  recordExpense,
  voidTransaction,
  getGameSettlement,
  lockGameFinancials,
} from "../services/accountingService";
import {
  createDuesForSeason,
  recordDuesPayment,
  getDuesStatus,
  sendDuesReminders,
} from "../services/duesService";
import {
  getTreasuryBalance,
  getTreasuryLedger,
  updateMinimumReserve,
  recordTreasuryAdjustment,
} from "../services/treasuryService";
import {
  getPlayerBalances,
  confirmSettlement,
} from "../services/playerBalanceService";
import {
  getGameNightReport,
  getSeasonSummary,
  getMemberFinancialSummary,
  getDuesReport,
} from "../services/reportsService";
import { getAuditLog } from "../services/auditService";
import {
  getMockGameSettlement,
  getMockTreasury,
  getMockDuesStatus,
  getMockPlayerBalances,
  getMockAuditLog,
  getMockGameNightReport,
  getMockSeasonSummary,
  getMockMemberFinancialSummary,
  getMockDuesReport,
} from "../lib/mockData";

export const accountingRoutes = new Hono();

// All accounting routes require auth + club membership
accountingRoutes.use("*", createAuthMiddleware());

// ============================================================
// SETTLEMENT ROUTES
// ============================================================

// GET /accounting/:clubId/games/:gameId/settlement
accountingRoutes.get(
  "/:clubId/games/:gameId/settlement",
  requireClubMember(),
  async (c) => {
    const gameId = c.req.param("gameId");

    try {
      const settlement = await getGameSettlement(gameId);
      return c.json(settlement);
    } catch {
      if (gameId === "mock-game-001") {
        return c.json(getMockGameSettlement(), 200);
      }
      return c.json({ error: "Failed to load settlement" }, 500);
    }
  }
);

// POST /accounting/:clubId/games/:gameId/buy-in
accountingRoutes.post(
  "/:clubId/games/:gameId/buy-in",
  requireClubMember(),
  requirePermission("manage_money"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const gameId = c.req.param("gameId");
    const { personId, amount, method } = await c.req.json();

    if (!personId || !amount) {
      return c.json({ error: "personId and amount are required" }, 400);
    }

    try {
      const tx = await recordBuyIn(gameId, personId, user.userId, amount, method);
      return c.json(tx, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record buy-in";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /accounting/:clubId/games/:gameId/rebuy
accountingRoutes.post(
  "/:clubId/games/:gameId/rebuy",
  requireClubMember(),
  requirePermission("manage_money"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const gameId = c.req.param("gameId");
    const { personId, amount, method } = await c.req.json();

    if (!personId || !amount) {
      return c.json({ error: "personId and amount are required" }, 400);
    }

    try {
      const tx = await recordRebuy(gameId, personId, user.userId, amount, method);
      return c.json(tx, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record rebuy";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /accounting/:clubId/games/:gameId/add-on
accountingRoutes.post(
  "/:clubId/games/:gameId/add-on",
  requireClubMember(),
  requirePermission("manage_money"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const gameId = c.req.param("gameId");
    const { personId, amount, method } = await c.req.json();

    if (!personId || !amount) {
      return c.json({ error: "personId and amount are required" }, 400);
    }

    try {
      const tx = await recordAddOn(gameId, personId, user.userId, amount, method);
      return c.json(tx, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record add-on";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /accounting/:clubId/games/:gameId/payout
accountingRoutes.post(
  "/:clubId/games/:gameId/payout",
  requireClubMember(),
  requirePermission("manage_money"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const gameId = c.req.param("gameId");
    const { personId, amount, method } = await c.req.json();

    if (!personId || !amount) {
      return c.json({ error: "personId and amount are required" }, 400);
    }

    try {
      const tx = await recordPayout(gameId, personId, user.userId, amount, method);
      return c.json(tx, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record payout";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /accounting/:clubId/games/:gameId/bounty
accountingRoutes.post(
  "/:clubId/games/:gameId/bounty",
  requireClubMember(),
  requirePermission("manage_money"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const gameId = c.req.param("gameId");
    const { winnerId, loserId, amount } = await c.req.json();

    if (!winnerId || !loserId || !amount) {
      return c.json(
        { error: "winnerId, loserId, and amount are required" },
        400
      );
    }

    try {
      const tx = await recordBounty(gameId, winnerId, loserId, user.userId, amount);
      return c.json(tx, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record bounty";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /accounting/:clubId/games/:gameId/expense
accountingRoutes.post(
  "/:clubId/games/:gameId/expense",
  requireClubMember(),
  requirePermission("manage_money", "post_expense_only"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const gameId = c.req.param("gameId");
    const { amount, category, description, method } = await c.req.json();

    if (!amount || !category || !description) {
      return c.json(
        { error: "amount, category, and description are required" },
        400
      );
    }

    try {
      const tx = await recordExpense(
        clubId,
        gameId,
        user.userId,
        amount,
        category,
        description,
        method
      );
      return c.json(tx, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record expense";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /accounting/:clubId/games/:gameId/lock
accountingRoutes.post(
  "/:clubId/games/:gameId/lock",
  requireClubMember(),
  requirePermission("manage_money"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const gameId = c.req.param("gameId");

    try {
      const game = await lockGameFinancials(gameId, user.userId);
      return c.json(game);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to lock financials";
      return c.json({ error: message }, 400);
    }
  }
);

// DELETE /accounting/:clubId/transactions/:transactionId
accountingRoutes.delete(
  "/:clubId/transactions/:transactionId",
  requireClubMember(),
  requirePermission("manage_money"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const transactionId = c.req.param("transactionId");
    const { reason } = await c.req.json();

    if (!reason) {
      return c.json({ error: "reason is required to void a transaction" }, 400);
    }

    try {
      const voided = await voidTransaction(transactionId, user.userId, reason);
      return c.json(voided);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to void transaction";
      return c.json({ error: message }, 400);
    }
  }
);

// ============================================================
// DUES ROUTES
// ============================================================

// GET /accounting/:clubId/dues/:seasonId
accountingRoutes.get(
  "/:clubId/dues/:seasonId",
  requireClubMember(),
  requirePermission("view_financials"),
  async (c) => {
    const clubId = c.req.param("clubId");
    const seasonId = c.req.param("seasonId");

    try {
      const status = await getDuesStatus(clubId, seasonId);
      return c.json(status);
    } catch {
      if (clubId === "mock-club-001") {
        return c.json(getMockDuesStatus(), 200);
      }
      return c.json({ error: "Failed to load dues status" }, 500);
    }
  }
);

// POST /accounting/:clubId/dues/:seasonId/create-all
accountingRoutes.post(
  "/:clubId/dues/:seasonId/create-all",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const seasonId = c.req.param("seasonId");
    const { amountDue } = await c.req.json();

    if (!amountDue || amountDue <= 0) {
      return c.json({ error: "amountDue must be a positive number" }, 400);
    }

    try {
      const result = await createDuesForSeason(
        clubId,
        seasonId,
        amountDue,
        user.userId
      );
      return c.json(result, 201);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create dues";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /accounting/:clubId/dues/:seasonId/payment
accountingRoutes.post(
  "/:clubId/dues/:seasonId/payment",
  requireClubMember(),
  requirePermission("manage_money"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const seasonId = c.req.param("seasonId");
    const { personId, amount, method } = await c.req.json();

    if (!personId || !amount || !method) {
      return c.json(
        { error: "personId, amount, and method are required" },
        400
      );
    }

    try {
      const result = await recordDuesPayment(
        clubId,
        personId,
        seasonId,
        amount,
        method,
        user.userId
      );
      return c.json(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to record dues payment";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /accounting/:clubId/dues/:seasonId/remind
accountingRoutes.post(
  "/:clubId/dues/:seasonId/remind",
  requireClubMember(),
  requireRole("OWNER", "ADMIN"),
  async (c) => {
    const clubId = c.req.param("clubId");
    const seasonId = c.req.param("seasonId");

    try {
      const result = await sendDuesReminders(clubId, seasonId);
      return c.json(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to send reminders";
      return c.json({ error: message }, 400);
    }
  }
);

// ============================================================
// TREASURY ROUTES
// ============================================================

// GET /accounting/:clubId/treasury
accountingRoutes.get(
  "/:clubId/treasury",
  requireClubMember(),
  requirePermission("view_financials"),
  async (c) => {
    const clubId = c.req.param("clubId");
    const limit = Number(c.req.query("limit")) || 50;
    const offset = Number(c.req.query("offset")) || 0;
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    try {
      const [balance, ledger] = await Promise.all([
        getTreasuryBalance(clubId),
        getTreasuryLedger(clubId, { limit, offset, startDate, endDate }),
      ]);
      return c.json({ balance, ledger });
    } catch {
      if (clubId === "mock-club-001") {
        return c.json(getMockTreasury(), 200);
      }
      return c.json({ error: "Failed to load treasury" }, 500);
    }
  }
);

// PATCH /accounting/:clubId/treasury/reserve
accountingRoutes.patch(
  "/:clubId/treasury/reserve",
  requireClubMember(),
  requireRole("OWNER"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const { minimumReserve } = await c.req.json();

    if (minimumReserve === undefined || minimumReserve < 0) {
      return c.json(
        { error: "minimumReserve must be a non-negative number" },
        400
      );
    }

    try {
      const result = await updateMinimumReserve(
        clubId,
        minimumReserve,
        user.userId
      );
      return c.json(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update reserve";
      return c.json({ error: message }, 400);
    }
  }
);

// POST /accounting/:clubId/treasury/adjustment
accountingRoutes.post(
  "/:clubId/treasury/adjustment",
  requireClubMember(),
  requirePermission("manage_money"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const { amount, description } = await c.req.json();

    if (amount === undefined || !description) {
      return c.json({ error: "amount and description are required" }, 400);
    }

    try {
      const result = await recordTreasuryAdjustment(
        clubId,
        user.userId,
        amount,
        description
      );
      return c.json(result, 201);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to record adjustment";
      return c.json({ error: message }, 400);
    }
  }
);

// ============================================================
// PLAYER BALANCE ROUTES
// ============================================================

// GET /accounting/:clubId/balances
accountingRoutes.get(
  "/:clubId/balances",
  requireClubMember(),
  requirePermission("view_financials"),
  async (c) => {
    const clubId = c.req.param("clubId");

    try {
      const balances = await getPlayerBalances(clubId);
      return c.json(balances);
    } catch {
      if (clubId === "mock-club-001") {
        return c.json(getMockPlayerBalances(), 200);
      }
      return c.json({ error: "Failed to load balances" }, 500);
    }
  }
);

// POST /accounting/:clubId/balances/:personId/settle
accountingRoutes.post(
  "/:clubId/balances/:personId/settle",
  requireClubMember(),
  requirePermission("manage_money"),
  async (c) => {
    const user = c.get("user") as JWTPayload;
    const clubId = c.req.param("clubId");
    const personId = c.req.param("personId");
    const { amount } = await c.req.json();

    if (amount === undefined) {
      return c.json({ error: "amount is required" }, 400);
    }

    try {
      const result = await confirmSettlement(
        clubId,
        personId,
        user.userId,
        amount
      );
      return c.json(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to settle balance";
      return c.json({ error: message }, 400);
    }
  }
);

// ============================================================
// REPORTS ROUTES
// ============================================================

// GET /accounting/:clubId/reports/game/:gameId
accountingRoutes.get(
  "/:clubId/reports/game/:gameId",
  requireClubMember(),
  requirePermission("export_reports"),
  async (c) => {
    const clubId = c.req.param("clubId");
    const gameId = c.req.param("gameId");

    try {
      const report = await getGameNightReport(gameId);
      return c.json(report);
    } catch {
      if (gameId === "mock-game-001") {
        return c.json(getMockGameNightReport(), 200);
      }
      return c.json({ error: "Failed to load game report" }, 500);
    }
  }
);

// GET /accounting/:clubId/reports/season/:seasonId
accountingRoutes.get(
  "/:clubId/reports/season/:seasonId",
  requireClubMember(),
  requirePermission("export_reports"),
  async (c) => {
    const clubId = c.req.param("clubId");
    const seasonId = c.req.param("seasonId");

    try {
      const report = await getSeasonSummary(clubId, seasonId);
      return c.json(report);
    } catch {
      if (clubId === "mock-club-001") {
        return c.json(getMockSeasonSummary(), 200);
      }
      return c.json({ error: "Failed to load season summary" }, 500);
    }
  }
);

// GET /accounting/:clubId/reports/member/:personId
accountingRoutes.get(
  "/:clubId/reports/member/:personId",
  requireClubMember(),
  requirePermission("export_reports"),
  async (c) => {
    const clubId = c.req.param("clubId");
    const personId = c.req.param("personId");

    try {
      const report = await getMemberFinancialSummary(clubId, personId);
      return c.json(report);
    } catch {
      if (clubId === "mock-club-001") {
        return c.json(getMockMemberFinancialSummary(), 200);
      }
      return c.json({ error: "Failed to load member summary" }, 500);
    }
  }
);

// GET /accounting/:clubId/reports/dues/:seasonId
accountingRoutes.get(
  "/:clubId/reports/dues/:seasonId",
  requireClubMember(),
  requirePermission("export_reports"),
  async (c) => {
    const clubId = c.req.param("clubId");
    const seasonId = c.req.param("seasonId");

    try {
      const report = await getDuesReport(clubId, seasonId);
      return c.json(report);
    } catch {
      if (clubId === "mock-club-001") {
        return c.json(getMockDuesReport(), 200);
      }
      return c.json({ error: "Failed to load dues report" }, 500);
    }
  }
);

// ============================================================
// AUDIT LOG ROUTE
// ============================================================

// GET /accounting/:clubId/audit
accountingRoutes.get(
  "/:clubId/audit",
  requireClubMember(),
  requirePermission("view_audit_log"),
  async (c) => {
    const clubId = c.req.param("clubId");
    const entityType = c.req.query("entityType");
    const entityId = c.req.query("entityId");
    const actorId = c.req.query("actorId");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const limit = Number(c.req.query("limit")) || 50;
    const offset = Number(c.req.query("offset")) || 0;

    try {
      const log = await getAuditLog(clubId, {
        entityType,
        entityId,
        actorId,
        startDate,
        endDate,
        limit,
        offset,
      });
      return c.json(log);
    } catch {
      if (clubId === "mock-club-001") {
        return c.json(getMockAuditLog(), 200);
      }
      return c.json({ error: "Failed to load audit log" }, 500);
    }
  }
);
