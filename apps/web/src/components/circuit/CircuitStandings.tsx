import { useGameStore } from "../../store/gameStore";

interface StandingEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  gamesPlayed: number;
}

interface CircuitStandingsProps {
  standings: StandingEntry[];
  loading?: boolean;
  limit?: number;
  updatedAt?: string | null;
}

export default function CircuitStandings({
  standings,
  loading,
  limit,
  updatedAt,
}: CircuitStandingsProps) {
  const currentUser = useGameStore((s) => s.currentUser);
  const display = limit ? standings.slice(0, limit) : standings;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] animate-pulse"
          >
            <div className="w-7 h-5 bg-[#2a2a2a] rounded" />
            <div className="w-8 h-8 bg-[#2a2a2a] rounded-full" />
            <div className="flex-1">
              <div className="w-24 h-4 bg-[#2a2a2a] rounded" />
            </div>
            <div className="w-12 h-4 bg-[#2a2a2a] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (display.length === 0) {
    return (
      <div className="text-center py-8 text-[#6b7280] text-sm">
        No standings yet. Play some games to see the leaderboard!
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-1">
        {display.map((entry) => {
          const isCurrentUser = currentUser?.userId === entry.userId;
          return (
            <div
              key={entry.userId}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                isCurrentUser
                  ? "bg-[#D4AF37]/10 border-[#D4AF37]/30"
                  : "bg-[#1a1a1a] border-[#2a2a2a]"
              }`}
            >
              <span
                className={`text-lg font-bold w-7 text-center ${
                  entry.rank === 1
                    ? "text-yellow-400"
                    : entry.rank === 2
                      ? "text-gray-300"
                      : entry.rank === 3
                        ? "text-orange-400"
                        : "text-[#6b7280]"
                }`}
              >
                {entry.rank <= 3
                  ? ["", "\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"][entry.rank]
                  : entry.rank}
              </span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: getAvatarColor(entry.displayName) }}
              >
                {entry.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-medium block truncate ${
                    isCurrentUser ? "text-[#D4AF37]" : ""
                  }`}
                >
                  {entry.displayName}
                  {isCurrentUser && " (You)"}
                </span>
                <span className="text-[10px] text-[#6b7280]">
                  {entry.gamesPlayed} game{entry.gamesPlayed !== 1 ? "s" : ""}
                </span>
              </div>
              <span className="text-sm font-semibold text-[#D4AF37]">
                {entry.points} pts
              </span>
            </div>
          );
        })}
      </div>
      {updatedAt && (
        <p className="text-[10px] text-[#4b5563] text-center mt-3">
          Last updated: {new Date(updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
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
