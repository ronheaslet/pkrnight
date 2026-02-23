import { checkEnv } from "./lib/envCheck";
checkEnv();

import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
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

// Static file serving — Vite build output
app.use("/assets/*", serveStatic({ root: "./public" }));
app.use("/icons/*", serveStatic({ root: "./public" }));
app.get("/manifest.json", serveStatic({ root: "./public" }));
app.get("/vite.svg", serveStatic({ root: "./public" }));

// SPA middleware — intercept browser navigation and serve the React app
// This runs BEFORE API routes so socialRoutes' wildcard auth doesn't catch HTML requests
app.use("*", async (c, next) => {
  // Only intercept GET requests from browsers (Accept: text/html, no Authorization header)
  if (
    c.req.method === "GET" &&
    !c.req.header("Authorization") &&
    (c.req.header("Accept") || "").includes("text/html") &&
    c.req.path !== "/health"
  ) {
    try {
      const file = Bun.file("./public/index.html");
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    } catch {
      // fallthrough to API routes
    }
  }
  return next();
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

// SPA fallback — serve index.html for browser navigation that doesn't match API routes
app.notFound(async (c) => {
  // Serve SPA for HTML requests (browser navigation / page refresh)
  const accept = c.req.header("Accept") || "";
  if (c.req.method === "GET" && accept.includes("text/html")) {
    try {
      const file = Bun.file("./public/index.html");
      return new Response(file, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch {
      // fallthrough to 404
    }
  }
  return c.json({ error: "Not found" }, 404);
});

// Global error capture — must be LAST
app.onError(errorCaptureHandler);

// Start server
const port = Number(process.env.PORT) || 3001;

console.log(`PKR Night API running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
