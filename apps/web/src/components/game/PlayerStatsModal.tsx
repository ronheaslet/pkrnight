import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";

interface PlayerStatsModalProps {
  personId: string;
  clubId: string;
  seasonId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PlayerStats {
  personId: string;
  ranks: {
    points: number | null;
    bounties: number | null;
    earnings: number | null;
    games: number | null;
  };
  stats: {
    gamesPlayed: number;
    wins: number;
    top3Finishes: number;
    totalPoints: number;
    totalBounties: number;
    netEarnings: number;
    bestFinish: number | null;
    currentStreak: number;
  };
  lastFiveGames: Array<{
    date: string;
    position: number | null;
    pointsEarned: number;
    payout: number;
    net: number;
  }>;
}

interface TrophyAward {
  id: string;
  trophyName: string;
  trophyEmoji: string;
  trophyDescription: string;
  awardedAt: string;
  gameId: string | null;
  seasonId: string | null;
  note: string | null;
  awardedBy: string;
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

export default function PlayerStatsModal({
  personId,
  clubId,
  seasonId,
  isOpen,
  onClose,
}: PlayerStatsModalProps) {
  const statsQuery = useQuery<PlayerStats>({
    queryKey: ["playerStats", clubId, seasonId, personId],
    queryFn: () =>
      api
        .get(`/results/${clubId}/standings/${seasonId}/player/${personId}`)
        .then((r) => r.data),
    enabled: isOpen && !!personId,
    staleTime: 30_000,
  });

  const trophiesQuery = useQuery<TrophyAward[]>({
    queryKey: ["playerTrophies", clubId, personId],
    queryFn: () =>
      api
        .get(`/results/${clubId}/trophies/person/${personId}`)
        .then((r) => r.data),
    enabled: isOpen && !!personId,
    staleTime: 30_000,
  });

  if (!isOpen) return null;

  const stats = statsQuery.data;
  const trophies = trophiesQuery.data ?? [];


  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-5 pb-8">
          {statsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#9ca3af] animate-pulse">Loading stats...</div>
            </div>
          ) : !stats ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-400">Failed to load stats</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(personId) }}
                >
                  {personId.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Player Stats
                  </h2>
                  {stats.ranks.points && (
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-green-600/20 text-green-400 border border-green-600/30">
                      #{stats.ranks.points} in Points
                    </span>
                  )}
                </div>
              </div>

              {/* Stats grid 2x3 */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <StatCell icon="\uD83C\uDFAE" label="Games Played" value={stats.stats.gamesPlayed} />
                <StatCell icon="\uD83C\uDFC6" label="Wins" value={stats.stats.wins} />
                <StatCell icon="\uD83E\uDD49" label="Top 3 Finishes" value={stats.stats.top3Finishes} />
                <StatCell icon="\u2B50" label="Total Points" value={stats.stats.totalPoints} />
                <StatCell icon="\uD83C\uDFAF" label="Bounties" value={stats.stats.totalBounties} />
                <StatCell
                  icon="\uD83D\uDCB0"
                  label="Net Earnings"
                  value={`${stats.stats.netEarnings >= 0 ? "+" : ""}$${stats.stats.netEarnings}`}
                  valueColor={stats.stats.netEarnings >= 0 ? "text-green-400" : "text-red-400"}
                />
              </div>

              {/* Streak */}
              {stats.stats.currentStreak > 1 && (
                <div className="mb-6 px-4 py-3 bg-orange-900/20 border border-orange-600/30 rounded-xl text-center">
                  <span className="text-orange-400 font-medium">
                    🔥 {stats.stats.currentStreak} game streak
                  </span>
                </div>
              )}

              {/* Last 5 games */}
              {stats.lastFiveGames.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
                    Last 5 Games
                  </h3>
                  <div className="bg-[#111] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#6b7280] text-xs border-b border-[#2a2a2a]">
                          <th className="text-left py-2 px-3">Date</th>
                          <th className="text-center py-2 px-2">Pos</th>
                          <th className="text-center py-2 px-2">Pts</th>
                          <th className="text-right py-2 px-3">Payout</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.lastFiveGames.map((g, i) => (
                          <tr
                            key={i}
                            className="border-b border-[#2a2a2a] last:border-0"
                          >
                            <td className="py-2 px-3 text-[#9ca3af]">
                              {new Date(g.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-2 px-2 text-center text-white font-medium">
                              {g.position ?? "-"}
                            </td>
                            <td className="py-2 px-2 text-center text-white">
                              {g.pointsEarned}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-medium ${g.net >= 0 ? "text-green-400" : "text-red-400"}`}
                            >
                              ${g.payout}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Trophies */}
              {trophiesQuery.isLoading ? (
                <div className="text-[#6b7280] text-sm text-center py-4 animate-pulse">
                  Loading trophies...
                </div>
              ) : trophies.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
                    Trophies
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trophies.slice(0, 6).map((t) => (
                      <div
                        key={t.id}
                        className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 flex items-center gap-2"
                        title={t.trophyName}
                      >
                        <span className="text-xl">{t.trophyEmoji}</span>
                        <span className="text-xs text-[#9ca3af]">
                          {t.trophyName}
                        </span>
                      </div>
                    ))}
                  </div>
                  {trophies.length > 6 && (
                    <p className="text-xs text-green-500 mt-2">
                      View all {trophies.length} trophies
                    </p>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
  valueColor = "text-white",
}: {
  icon: string;
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] text-[#6b7280] uppercase">{label}</span>
      </div>
      <div className={`text-lg font-bold ${valueColor}`}>{value}</div>
    </div>
  );
}
