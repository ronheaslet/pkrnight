import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";
import PlayerStatsModal from "../components/game/PlayerStatsModal";

interface GameResultsData {
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

interface TrophyAward {
  id: string;
  trophyName: string;
  trophyEmoji: string;
  trophyDescription: string;
  personId: string;
  awardedAt: string;
  gameId: string | null;
}

function getAvatarColor(name: string): string {
  const colors = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "N/A";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getResultsSummaryText(data: GameResultsData): string {
  const lines = [
    `🏆 ${data.metadata.eventTitle} Results`,
    `📅 ${new Date(data.metadata.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`,
    `👥 ${data.metadata.playerCount} players · 💰 $${data.metadata.prizePool} prize pool`,
    `⏱ ${formatDuration(data.metadata.durationMinutes)}`,
    "",
    "Final Standings:",
    ...data.standings.map(
      (p) =>
        `${p.position}. ${p.displayName} — ${p.pointsEarned} pts${p.payout > 0 ? ` · $${p.payout}` : ""}`
    ),
  ];
  return lines.join("\n");
}

export default function GameResults() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const currentUser = useGameStore((s) => s.currentUser);
  const clubId = currentUser?.clubId || "mock-club-001";
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState("");

  const resultsQuery = useQuery<GameResultsData>({
    queryKey: ["gameResults", gameId],
    queryFn: () =>
      api.get(`/results/${clubId}/games/${gameId}/results`).then((r) => r.data),
    enabled: !!gameId,
    staleTime: 60_000,
  });

  // Load trophies awarded for this game (filter from club trophies awarded)
  const trophyAwardsQuery = useQuery<TrophyAward[]>({
    queryKey: ["gameTrophyAwards", clubId, gameId],
    queryFn: async () => {
      // Use current user's trophies as a proxy — in prod this would filter by gameId
      const res = await api.get(`/results/${clubId}/trophies/person/${currentUser?.userId || "mock-person-001"}`);
      return (res.data as TrophyAward[]).filter((a) => a.gameId === gameId);
    },
    enabled: !!gameId,
    staleTime: 60_000,
  });

  const handleShare = async () => {
    if (!resultsQuery.data) return;
    const text = getResultsSummaryText(resultsQuery.data);

    if (navigator.share) {
      try {
        await navigator.share({ title: "Poker Results", text });
        return;
      } catch {
        // fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setShareMsg("Copied!");
      setTimeout(() => setShareMsg(""), 2000);
    } catch {
      setShareMsg("Failed to copy");
      setTimeout(() => setShareMsg(""), 2000);
    }
  };

  if (resultsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white animate-pulse">Loading results...</div>
      </div>
    );
  }

  if (resultsQuery.error || !resultsQuery.data) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-red-400">Results not found</div>
      </div>
    );
  }

  const data = resultsQuery.data;
  const top3 = data.standings.filter((s) => s.position && s.position <= 3);
  const trophies = trophyAwardsQuery.data ?? [];

  // Reorder for podium: 2nd, 1st, 3rd
  const podiumOrder = [
    top3.find((p) => p.position === 2),
    top3.find((p) => p.position === 1),
    top3.find((p) => p.position === 3),
  ].filter(Boolean) as typeof top3;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 flex items-start justify-between">
        <div className="flex-1">
          <button
            onClick={() => navigate(-1)}
            className="text-[#9ca3af] text-sm mb-2 flex items-center gap-1 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold">{data.metadata.eventTitle}</h1>
          <p className="text-[#9ca3af] text-sm mt-1">
            {new Date(data.metadata.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <div className="flex gap-3 mt-2 text-xs text-[#6b7280]">
            <span>⏱ {formatDuration(data.metadata.durationMinutes)}</span>
            <span>👥 {data.metadata.playerCount} players</span>
            <span>💰 ${data.metadata.prizePool}</span>
          </div>
        </div>
        <button
          onClick={handleShare}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors relative"
          title="Share Results"
        >
          <svg
            className="w-5 h-5 text-[#9ca3af]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          {shareMsg && (
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-green-400 whitespace-nowrap">
              {shareMsg}
            </span>
          )}
        </button>
      </div>

      {/* Podium */}
      <div className="px-5 py-6">
        <div className="flex items-end justify-center gap-3">
          {podiumOrder.map((p) => {
            const height =
              p.position === 1 ? "h-28" : p.position === 2 ? "h-20" : "h-16";
            const medalColors: Record<number, string> = {
              1: "text-yellow-400",
              2: "text-gray-300",
              3: "text-orange-400",
            };

            return (
              <div
                key={p.personId}
                className="flex flex-col items-center flex-1 max-w-[120px]"
              >
                {p.position === 1 && (
                  <span className="text-2xl mb-1">🏆</span>
                )}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-2"
                  style={{
                    backgroundColor: getAvatarColor(p.displayName),
                  }}
                >
                  {p.displayName.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-medium text-center truncate w-full">
                  {p.displayName}
                </p>
                <p className="text-xs text-green-400 font-medium">
                  ${p.payout}
                </p>
                <div
                  className={`${height} w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-t-lg mt-2 flex items-center justify-center`}
                >
                  <span
                    className={`text-2xl font-bold ${medalColors[p.position!] ?? "text-white"}`}
                  >
                    {p.position}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Highlights strip */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          {data.topStats.winner && (
            <div className="flex-shrink-0 bg-yellow-900/20 border border-yellow-600/30 rounded-xl px-3 py-2 flex items-center gap-2">
              <span>🏆</span>
              <span className="text-xs text-yellow-400">
                Winner: {data.topStats.winner.displayName}
              </span>
            </div>
          )}
          {data.topStats.biggestEarner && (
            <div className="flex-shrink-0 bg-green-900/20 border border-green-600/30 rounded-xl px-3 py-2 flex items-center gap-2">
              <span>💰</span>
              <span className="text-xs text-green-400">
                Biggest Earner: {data.topStats.biggestEarner.displayName} (+$
                {data.topStats.biggestEarner.net})
              </span>
            </div>
          )}
          {data.topStats.mostBounties && (
            <div className="flex-shrink-0 bg-purple-900/20 border border-purple-600/30 rounded-xl px-3 py-2 flex items-center gap-2">
              <span>🎯</span>
              <span className="text-xs text-purple-400">
                Bounty King: {data.topStats.mostBounties.displayName} (
                {data.topStats.mostBounties.count})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Full standings table */}
      <div className="px-5 mb-6">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
          Full Standings
        </h2>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#6b7280] text-xs border-b border-[#2a2a2a]">
                <th className="text-left py-2 px-3">#</th>
                <th className="text-left py-2 px-2">Player</th>
                <th className="text-center py-2 px-1">Pts</th>
                <th className="text-center py-2 px-1">Bty</th>
                <th className="text-right py-2 px-1">Payout</th>
                <th className="text-right py-2 px-2">Net</th>
                <th className="text-center py-2 px-2">RB</th>
              </tr>
            </thead>
            <tbody>
              {data.standings.map((p) => (
                <tr
                  key={p.personId}
                  className="border-b border-[#2a2a2a] last:border-0 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setSelectedPlayer(p.personId)}
                >
                  <td className="py-2.5 px-3 font-bold text-[#6b7280]">
                    {p.position}
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{
                          backgroundColor: getAvatarColor(p.displayName),
                        }}
                      >
                        {p.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium truncate max-w-[80px]">
                        {p.displayName}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-1 text-center">{p.pointsEarned}</td>
                  <td className="py-2.5 px-1 text-center text-[#9ca3af]">
                    {p.bountiesWon || "-"}
                  </td>
                  <td className="py-2.5 px-1 text-right">
                    {p.payout > 0 ? `$${p.payout}` : "-"}
                  </td>
                  <td
                    className={`py-2.5 px-2 text-right font-medium ${p.net >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {p.net >= 0 ? "+" : ""}${p.net}
                  </td>
                  <td className="py-2.5 px-2 text-center text-[#9ca3af]">
                    {p.rebuys || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trophies awarded */}
      {trophies.length > 0 && (
        <div className="px-5 mb-6">
          <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
            Trophies Awarded
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
            {trophies.map((t) => (
              <div
                key={t.id}
                className="flex-shrink-0 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 min-w-[120px] text-center"
              >
                <span className="text-3xl block mb-1">{t.trophyEmoji}</span>
                <p className="text-xs font-medium">{t.trophyName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player Stats Modal */}
      <PlayerStatsModal
        personId={selectedPlayer ?? ""}
        clubId={clubId}
        seasonId="mock-season-001"
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}
