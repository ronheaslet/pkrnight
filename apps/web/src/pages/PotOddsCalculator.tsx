import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGameStore } from "../store/gameStore";

export default function PotOddsCalculator() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const activeGameId = useGameStore((s) => s.activeGameId);
  const gameState = useGameStore((s) => s.gameState);

  const isLocked =
    !!activeGameId &&
    gameState?.game.status === "ACTIVE";

  const [potSize, setPotSize] = useState("");
  const [callAmount, setCallAmount] = useState("");
  const [outs, setOuts] = useState(0);
  const [street, setStreet] = useState<"flop_turn" | "turn_river" | "flop_river">("flop_turn");

  // Pot odds calculation
  const pot = parseFloat(potSize) || 0;
  const call = parseFloat(callAmount) || 0;
  const hasPotOdds = pot > 0 && call > 0;
  const potOddsPercent = hasPotOdds ? (call / (pot + call)) * 100 : 0;

  // Outs calculation
  const hasOuts = outs > 0;
  const outsPercent =
    street === "flop_turn"
      ? outs * 2
      : street === "turn_river"
        ? outs * 2
        : outs * 4;

  // Decision helper
  const showDecision = hasPotOdds && hasOuts;
  const diff = outsPercent - potOddsPercent;

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
        {/* Header */}
        <div className="px-5 pt-6 pb-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/clubs/${clubId}`)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Pot Odds Calculator</h1>
        </div>

        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center">
            <div className="text-4xl mb-4 opacity-50">🔒</div>
            <p className="text-[#6b7280] text-lg">
              Pot Odds Calculator is disabled during live games
            </p>
            <p className="text-[#4b5563] text-sm mt-2">
              Use your read, not a calculator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate(`/clubs/${clubId}`)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Pot Odds Calculator</h1>
      </div>

      {/* Section 1 — Pot Odds */}
      <div className="px-5 mb-5">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
          Pot Odds
        </h2>
        <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-3">
          <div>
            <label className="text-[#9ca3af] text-xs block mb-1">
              Pot Size ($)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={potSize}
              onChange={(e) => setPotSize(e.target.value)}
              placeholder="0"
              className="w-full bg-[#252525] text-white rounded-lg px-3 py-2.5 text-lg border border-[#2a2a2a] outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="text-[#9ca3af] text-xs block mb-1">
              Call Amount ($)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={callAmount}
              onChange={(e) => setCallAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-[#252525] text-white rounded-lg px-3 py-2.5 text-lg border border-[#2a2a2a] outline-none focus:border-green-500"
            />
          </div>

          {hasPotOdds && (
            <div className="pt-2 space-y-1">
              <p className="text-sm text-[#d1d5db]">
                You must call <span className="text-white font-semibold">${call}</span> into a{" "}
                <span className="text-white font-semibold">${pot}</span> pot
              </p>
              <p className="text-green-400 text-lg font-semibold">
                You need {potOddsPercent.toFixed(1)}% equity to break even
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section 2 — Outs Calculator */}
      <div className="px-5 mb-5">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
          Outs Calculator
        </h2>
        <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-4">
          {/* Outs stepper */}
          <div>
            <label className="text-[#9ca3af] text-xs block mb-2">
              Number of Outs
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setOuts(Math.max(0, outs - 1))}
                className="w-14 h-14 rounded-xl bg-[#252525] border border-[#2a2a2a] text-2xl font-bold text-white active:bg-white/20 transition-colors"
              >
                −
              </button>
              <div className="text-4xl font-bold text-white w-16 text-center">
                {outs}
              </div>
              <button
                onClick={() => setOuts(Math.min(20, outs + 1))}
                className="w-14 h-14 rounded-xl bg-[#252525] border border-[#2a2a2a] text-2xl font-bold text-white active:bg-white/20 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Street toggle */}
          <div>
            <label className="text-[#9ca3af] text-xs block mb-2">Street</label>
            <div className="flex gap-1 bg-[#252525] rounded-lg p-1">
              {(
                [
                  { key: "flop_turn", label: "Flop → Turn" },
                  { key: "turn_river", label: "Turn → River" },
                  { key: "flop_river", label: "Flop → River" },
                ] as const
              ).map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStreet(s.key)}
                  className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                    street === s.key
                      ? "bg-green-600 text-white"
                      : "text-[#9ca3af] hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {hasOuts && (
            <div className="pt-1 space-y-1">
              <p className="text-green-400 text-lg font-semibold">
                ~{outsPercent}% chance of hitting
              </p>
              <p className="text-[#6b7280] text-xs">
                (Rule of 2 & 4 — approximate)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section 3 — Decision Helper */}
      {showDecision && (
        <div className="px-5 mb-5">
          <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
            Decision
          </h2>
          {diff > 3 ? (
            <div className="bg-green-900/30 border border-green-600/40 rounded-xl px-4 py-3">
              <p className="text-green-400 font-semibold">
                ✅ Call has positive expected value
              </p>
              <p className="text-green-400/70 text-xs mt-1">
                {outsPercent}% equity vs {potOddsPercent.toFixed(1)}% needed
              </p>
            </div>
          ) : diff < -3 ? (
            <div className="bg-red-900/30 border border-red-600/40 rounded-xl px-4 py-3">
              <p className="text-red-400 font-semibold">
                ❌ Fold has positive expected value
              </p>
              <p className="text-red-400/70 text-xs mt-1">
                {outsPercent}% equity vs {potOddsPercent.toFixed(1)}% needed
              </p>
            </div>
          ) : (
            <div className="bg-yellow-900/30 border border-yellow-600/40 rounded-xl px-4 py-3">
              <p className="text-yellow-400 font-semibold">
                ⚠️ Close decision — consider implied odds
              </p>
              <p className="text-yellow-400/70 text-xs mt-1">
                {outsPercent}% equity vs {potOddsPercent.toFixed(1)}% needed
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
