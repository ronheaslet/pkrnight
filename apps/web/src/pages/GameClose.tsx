import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";

type Step = "prerequisites" | "preview" | "confirm";

interface GameResults {
  metadata: {
    gameId: string;
    eventId: string | null;
    eventTitle: string;
    date: string;
    durationMinutes: number | null;
    playerCount: number;
    prizePool: number;
    status: string;
  };
  standings: Array<{
    position: number | null;
    personId: string;
    displayName: string;
    avatarUrl: string | null;
    pointsEarned: number;
    payout: number;
    totalPaid: number;
    net: number;
    rebuys: number;
    bountiesWon: number;
    bountiesLost: number;
  }>;
  topStats: {
    winner: { personId: string; displayName: string } | null;
    biggestEarner: { personId: string; displayName: string; net: number } | null;
    mostBounties: { personId: string; displayName: string; count: number } | null;
  };
}

interface FinalizeResponse {
  results: GameResults;
  notifications: unknown[];
}

export default function GameClose() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const currentUser = useGameStore((s) => s.currentUser);
  const gameState = useGameStore((s) => s.gameState);
  const [step, setStep] = useState<Step>("prerequisites");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState<FinalizeResponse | null>(null);

  const clubId = currentUser?.clubId || gameState?.game.clubId || "mock-club-001";

  const isOwnerOrAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.roles.includes("OWNER") ||
    currentUser?.roles.includes("ADMIN");

  // Load game state for prerequisite checks
  const gameQuery = useQuery({
    queryKey: ["gameState", gameId],
    queryFn: () => api.get(`/games/${gameId}/state`).then((r) => r.data),
    enabled: !!gameId,
    staleTime: 5_000,
    refetchInterval: 5_000,
  });

  // Load results for preview
  const resultsQuery = useQuery<GameResults>({
    queryKey: ["gameResults", gameId],
    queryFn: () =>
      api.get(`/results/${clubId}/games/${gameId}/results`).then((r) => r.data),
    enabled: step === "preview" && !!gameId,
    staleTime: 10_000,
  });

  // End game mutation
  const endGameMutation = useMutation({
    mutationFn: () => api.post(`/games/${gameId}/end`),
    onSuccess: () => {
      setShowEndConfirm(false);
      gameQuery.refetch();
    },
  });

  // Finalize mutation
  const finalizeMutation = useMutation({
    mutationFn: () =>
      api.post(`/results/${clubId}/games/${gameId}/finalize`).then((r) => r.data),
    onSuccess: (data: FinalizeResponse) => {
      setShowFinalizeConfirm(false);
      setFinalizeResult(data);
      setStep("confirm");
    },
  });

  // Permission check
  if (!isOwnerOrAdmin) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center px-6">
          <span className="text-4xl mb-4 block">🚫</span>
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-[#9ca3af] text-sm">
            Only owners and admins can close games.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (gameQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white animate-pulse">Loading game...</div>
      </div>
    );
  }

  const game = gameQuery.data?.game ?? gameState?.game;
  const isCompleted = game?.status === "COMPLETED";
  const isFinancialLocked = !!game?.financialLockedAt;

  // For mock data, treat as completed + locked
  const isMock = gameId?.startsWith("mock");
  const gameCompleted = isMock || isCompleted;
  const financialsLocked = isMock || isFinancialLocked;

  // ---- SUCCESS SCREEN ----
  if (step === "confirm" && finalizeResult) {
    const awardedTrophies = (finalizeResult as unknown as { trophiesAwarded?: Array<{ emoji: string; name: string; recipientName: string }> }).trophiesAwarded ?? [];

    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center px-6">
        <span className="text-6xl mb-4">🏆</span>
        <h1 className="text-2xl font-bold mb-2">Results Finalized!</h1>
        <p className="text-[#9ca3af] text-sm text-center mb-6">
          Standings locked, trophies awarded, and results sent to all members.
        </p>

        {awardedTrophies.length > 0 && (
          <div className="w-full max-w-sm mb-6">
            <h3 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3 text-center">
              Trophies Awarded
            </h3>
            <div className="space-y-2">
              {awardedTrophies.map((t, i) => (
                <div
                  key={i}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-[#9ca3af]">{t.recipientName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={() =>
              navigate(`/results/games/${gameId}`)
            }
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-medium text-sm transition-colors"
          >
            View Full Results
          </button>
          <button
            onClick={() => navigate(`/clubs/${clubId}`)}
            className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222] rounded-xl font-medium text-sm transition-colors"
          >
            Back to Club
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-[#9ca3af] text-sm mb-3 flex items-center gap-1 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">Close Game</h1>
        <p className="text-[#9ca3af] text-sm mt-1">
          Finalize results and award trophies
        </p>
      </div>

      {/* Step indicator */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2">
          {(["prerequisites", "preview"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === s
                    ? "bg-green-600 text-white"
                    : i < (step === "preview" ? 1 : 0)
                      ? "bg-green-600/30 text-green-400"
                      : "bg-[#2a2a2a] text-[#6b7280]"
                }`}
              >
                {i + 1}
              </div>
              {i < 1 && (
                <div className="w-12 h-0.5 bg-[#2a2a2a]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Prerequisites */}
      {step === "prerequisites" && (
        <div className="px-5 space-y-4">
          <h2 className="text-lg font-semibold mb-2">Verify Prerequisites</h2>

          {/* Game completed check */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {gameCompleted ? "✅" : "❌"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">Game marked as completed</p>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  {gameCompleted
                    ? "Game has ended"
                    : "Game is still in progress"}
                </p>
              </div>
              {!gameCompleted && (
                <button
                  onClick={() => setShowEndConfirm(true)}
                  className="px-3 py-1.5 bg-red-900/30 border border-red-600/40 text-red-400 rounded-lg text-xs font-medium"
                >
                  End Game
                </button>
              )}
            </div>
          </div>

          {/* Financials locked check */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {financialsLocked ? "✅" : "❌"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">Financials locked</p>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  {financialsLocked
                    ? "Settlement is finalized"
                    : "Settlement needs to be completed"}
                </p>
              </div>
              {!financialsLocked && (
                <button
                  onClick={() =>
                    navigate(`/clubs/${clubId}/accounting/settlement`)
                  }
                  className="px-3 py-1.5 bg-[#2a2a2a] text-white rounded-lg text-xs font-medium"
                >
                  Go to Settlement
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setStep("preview")}
            disabled={!gameCompleted || !financialsLocked}
            className="w-full mt-4 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-[#2a2a2a] disabled:text-[#6b7280] rounded-xl font-medium text-sm transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {/* STEP 2: Preview */}
      {step === "preview" && (
        <div className="px-5 space-y-4">
          <button
            onClick={() => setStep("prerequisites")}
            className="text-[#9ca3af] text-xs hover:text-white transition-colors"
          >
            ← Back to checklist
          </button>
          <h2 className="text-lg font-semibold">Preview Results</h2>

          {resultsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#9ca3af] animate-pulse">
                Loading results preview...
              </div>
            </div>
          ) : resultsQuery.data ? (
            <>
              {/* Standings list */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                {resultsQuery.data.standings.map((p) => (
                  <div
                    key={p.personId}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a] last:border-0"
                  >
                    <span className="text-sm font-bold text-[#6b7280] w-5 text-center">
                      {p.position}
                    </span>
                    {p.position === 1 && (
                      <span className="text-lg">🏆</span>
                    )}
                    <span className="text-sm font-medium flex-1">
                      {p.displayName}
                    </span>
                    <span className="text-xs text-[#9ca3af]">
                      {p.pointsEarned} pts
                    </span>
                    {p.payout > 0 && (
                      <span className="text-xs text-green-400 font-medium">
                        ${p.payout}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Highlights */}
              <div className="space-y-2">
                {resultsQuery.data.topStats.biggestEarner && (
                  <div className="bg-green-900/20 border border-green-600/30 rounded-xl px-4 py-3 flex items-center gap-2">
                    <span>💰</span>
                    <span className="text-sm text-green-400">
                      Biggest Earner:{" "}
                      {resultsQuery.data.topStats.biggestEarner.displayName} (+$
                      {resultsQuery.data.topStats.biggestEarner.net})
                    </span>
                  </div>
                )}
                {resultsQuery.data.topStats.mostBounties && (
                  <div className="bg-purple-900/20 border border-purple-600/30 rounded-xl px-4 py-3 flex items-center gap-2">
                    <span>🎯</span>
                    <span className="text-sm text-purple-400">
                      Most Bounties:{" "}
                      {resultsQuery.data.topStats.mostBounties.displayName} (
                      {resultsQuery.data.topStats.mostBounties.count})
                    </span>
                  </div>
                )}
              </div>

              {/* Auto trophy preview */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[#9ca3af] mb-3">
                  Estimated Auto-Trophies
                </h3>
                <div className="space-y-2">
                  {resultsQuery.data.topStats.winner && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>🏆</span>
                      <span className="text-[#9ca3af]">Champion →</span>
                      <span className="text-white font-medium">
                        {resultsQuery.data.topStats.winner.displayName}
                      </span>
                    </div>
                  )}
                  {resultsQuery.data.topStats.mostBounties && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>🎯</span>
                      <span className="text-[#9ca3af]">Bounty Hunter →</span>
                      <span className="text-white font-medium">
                        {resultsQuery.data.topStats.mostBounties.displayName}
                      </span>
                    </div>
                  )}
                  {/* Final two preview */}
                  {resultsQuery.data.standings.length >= 2 && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <span>🤝</span>
                        <span className="text-[#9ca3af]">Final Two →</span>
                        <span className="text-white font-medium">
                          {resultsQuery.data.standings[0].displayName},{" "}
                          {resultsQuery.data.standings[1].displayName}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowFinalizeConfirm(true)}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-medium text-sm transition-colors"
              >
                Finalize & Send Results
              </button>
            </>
          ) : (
            <div className="text-red-400 text-center py-8">
              Failed to load results preview
            </div>
          )}
        </div>
      )}

      {/* End Game Confirmation Modal */}
      {showEndConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          onClick={() => setShowEndConfirm(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">End Game?</h3>
            <p className="text-[#9ca3af] text-sm mb-6">
              This will end the game and declare the last player the winner.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-[#2a2a2a] rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => endGameMutation.mutate()}
                disabled={endGameMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {endGameMutation.isPending ? "Ending..." : "End Game"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Confirmation Modal */}
      {showFinalizeConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          onClick={() => setShowFinalizeConfirm(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">
              Finalize Results?
            </h3>
            <p className="text-[#9ca3af] text-sm mb-4">This will:</p>
            <ul className="text-[#9ca3af] text-sm space-y-1 mb-6 list-disc list-inside">
              <li>Lock final standings</li>
              <li>Award automatic trophies</li>
              <li>Send results to all club members</li>
              <li className="text-red-400">This cannot be undone</li>
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinalizeConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-[#2a2a2a] rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => finalizeMutation.mutate()}
                disabled={finalizeMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {finalizeMutation.isPending ? "Finalizing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
