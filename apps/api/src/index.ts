import { checkEnv } from "./lib/envCheck";
checkEnv();

import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { gameRoutes, chipRoutes } from "./routes/games";
import { scannerRoutes } from "./routes/scanner";
import { clubRoutes } from "./routes/clubs";
import { eventRoutes, clubEventRoutes, guestRsvpRoutes } from "./routes/events";
import { accountingRoutes } from "./routes/accounting";
import { resultsRoutes } from "./routes/results";
import { socialRoutes } from "./routes/social";
import { pubPokerRoutes, circuitRoutes } from "./routes/pubPoker";
import { superAdminRoutes } from "./routes/superAdmin";
import { publicRoutes } from "./routes/public";
import { errorCaptureHandler } from "./middleware/errorCapture";
import { rateLimitAuth, rateLimitPublic, rateLimitAiScanner } from "./middleware/rateLimit";
import "./jobs/scheduler"; // side-effect import — starts scheduled jobs on server boot

const startTime = Date.now();
const app = new Hono();

// Middleware
app.use("*", cors());

// Request logging with duration
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  console.log(`${c.req.method} ${c.req.path} - ${duration}ms`);
});

// Health check (before auth middleware, always public)
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    version: "1.0.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// Apply rate limits
app.use("/auth/*", rateLimitAuth());
app.use("/public/*", rateLimitPublic());
app.use("/scanner/*", rateLimitAiScanner());

// Routes
app.route("/auth", authRoutes);
app.route("/games", gameRoutes);
app.route("/chips", chipRoutes);
app.route("/scanner", scannerRoutes);
app.route("/clubs", clubRoutes);
app.route("/events", eventRoutes);
app.route("/clubs", clubEventRoutes);
app.route("/rsvp", guestRsvpRoutes);
app.route("/accounting", accountingRoutes);
app.route("/results", resultsRoutes);
app.route("/", socialRoutes);
app.route("/pub", pubPokerRoutes);
app.route("/circuits", circuitRoutes);
app.route("/super", superAdminRoutes);
app.route("/public", publicRoutes);

// Global error capture — must be LAST
app.onError(errorCaptureHandler);

// Start server
const port = Number(process.env.PORT) || 3001;

console.log(`PKR Night API running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
