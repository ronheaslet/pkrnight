import { Hono } from "hono";
import { createAuthMiddleware } from "../lib/auth";
import type { JWTPayload } from "../lib/auth";
import { db } from "../../../../packages/db/src/client";

export const scannerRoutes = new Hono();
const auth = createAuthMiddleware();

// Mock scan result for when ANTHROPIC_API_KEY is missing
function getMockScanResult() {
  return {
    counts: { white: 8, red: 6, green: 4, black: 2 },
    totalValue: 14500,
    confidence: "high" as const,
    note: "Mock scan — ANTHROPIC_API_KEY not configured",
  };
}

// -------------------------------------------------------
// POST /scanner/scan
// -------------------------------------------------------
scannerRoutes.post("/scan", auth, async (c) => {
  const user = c.get("user") as JWTPayload;
  const body = await c.req.json();
  const { imageBase64, chipSetId, gameId, gameSessionId, savedToSession } = body;

  if (!imageBase64 || !chipSetId) {
    return c.json({ error: "imageBase64 and chipSetId are required" }, 400);
  }

  // Fetch chip set denominations
  let chipConfig: string;
  let denominations: Array<{
    id: string;
    colorName: string;
    colorHex: string;
    value: number;
  }>;

  try {
    const chipSet = await db.chipSet.findUnique({
      where: { id: chipSetId },
      include: {
        denominations: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!chipSet) {
      return c.json({ error: "Chip set not found" }, 404);
    }

    denominations = chipSet.denominations;
    chipConfig = denominations
      .map((d) => `${d.colorName.toLowerCase()}=$${d.value}`)
      .join(", ");
  } catch {
    // DB unavailable — use mock denominations
    denominations = [
      { id: "d1", colorName: "White", colorHex: "#FFFFFF", value: 25 },
      { id: "d2", colorName: "Red", colorHex: "#EF4444", value: 50 },
      { id: "d3", colorName: "Green", colorHex: "#22C55E", value: 100 },
      { id: "d4", colorName: "Blue", colorHex: "#3B82F6", value: 500 },
      { id: "d5", colorName: "Black", colorHex: "#1F2937", value: 1000 },
    ];
    chipConfig = "white=$25, red=$50, green=$100, blue=$500, black=$1000";
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // If no API key, return mock scan result
  if (!anthropicKey) {
    console.warn("ANTHROPIC_API_KEY not set — returning mock scan result");
    const mockResult = getMockScanResult();
    c.header("X-Mock-Data", "true");
    return c.json({
      id: "mock-scan-001",
      chipCounts: mockResult.counts,
      totalValue: mockResult.totalValue,
      confidenceLevel: mockResult.confidence,
      confidenceNote: mockResult.note,
      savedToSession: false,
    });
  }

  // Call Claude Vision API
  const startTime = Date.now();

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: anthropicKey });

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Club chip values: ${chipConfig}. Count all chips visible in this image.`,
            },
          ],
        },
      ],
      system:
        'You are a poker chip counter. Count visible chips by color and return ONLY valid JSON with no other text, no markdown, no explanation. Format: {"counts": {"white": N, "red": N, "green": N, "black": N}, "totalValue": N, "confidence": "high|medium|low", "note": "optional note if confidence is not high"}',
    });

    const latencyMs = Date.now() - startTime;
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return c.json(
        { error: "scan_failed", message: "No text response from Claude" },
        500
      );
    }

    let parsed: {
      counts: Record<string, number>;
      totalValue: number;
      confidence: string;
      note?: string;
    };

    try {
      parsed = JSON.parse(textContent.text);
    } catch {
      return c.json(
        {
          error: "scan_failed",
          message:
            "Could not read chips clearly. Please try again in better lighting.",
        },
        422
      );
    }

    // Recalculate totalValue from counts * denomination values
    let totalValue = 0;
    for (const [colorName, count] of Object.entries(parsed.counts)) {
      const denom = denominations.find(
        (d) => d.colorName.toLowerCase() === colorName.toLowerCase()
      );
      if (denom) {
        totalValue += count * denom.value;
      }
    }

    const tokensIn = response.usage.input_tokens;
    const tokensOut = response.usage.output_tokens;
    const costUsd = tokensIn * 0.000015 + tokensOut * 0.000075;

    // Persist ChipScan and AIUsageLog
    let chipScan;
    try {
      chipScan = await db.chipScan.create({
        data: {
          clubId: user.clubId ?? "unknown",
          personId: user.userId,
          gameId: gameId ?? null,
          gameSessionId: gameSessionId ?? null,
          chipSetId,
          chipCounts: parsed.counts,
          totalValue,
          confidenceLevel: parsed.confidence,
          confidenceNote: parsed.note ?? null,
          claudeTokensIn: tokensIn,
          claudeTokensOut: tokensOut,
          claudeModel: "claude-opus-4-6",
          claudeLatencyMs: latencyMs,
          savedToSession: savedToSession === true,
        },
      });

      await db.aIUsageLog.create({
        data: {
          clubId: user.clubId ?? null,
          personId: user.userId,
          feature: "chip_scanner",
          model: "claude-opus-4-6",
          tokensIn,
          tokensOut,
          costUsd,
          latencyMs,
        },
      });

      // Optionally save to session
      if (savedToSession && gameSessionId) {
        await db.gameSession.update({
          where: { id: gameSessionId },
          data: { currentStack: totalValue },
        });
      }
    } catch (dbErr) {
      console.warn("Could not persist scan to DB:", (dbErr as Error).message);
      // Still return the result — just without persistence
    }

    return c.json({
      id: chipScan?.id ?? "temp-scan",
      chipCounts: parsed.counts,
      totalValue,
      confidenceLevel: parsed.confidence,
      confidenceNote: parsed.note ?? null,
      savedToSession: savedToSession === true,
      claudeLatencyMs: latencyMs,
    });
  } catch (e) {
    console.error("Claude API error:", e);
    return c.json(
      {
        error: "scan_failed",
        message:
          "Could not read chips clearly. Please try again in better lighting.",
      },
      500
    );
  }
});
