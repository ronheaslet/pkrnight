import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";
import PlayerStatsModal from "../components/game/PlayerStatsModal";

type StandingsType = "points" | "bounties" | "earnings" | "games";

interface StandingEntry {
  rank: number;
  personId: string;
  displayName: string;
  avatarUrl: string | null;
  // Points view
  totalPoints?: number;
  gamesPlayed?: number;
  avgPoints?: number;
  // Bounties view
  totalBounties?: number;
  // Earnings view
  totalEarnings?: number;
  totalPaid?: number;
  totalWon?: number;
  // Games view
  winCount?: number;
}

interface AllTimeStats {
  totalGames: number;
  totalPlayers: number;
  leaders: {
    points: { personId: string; displayName: string; total: number } | null;
    bounties: { personId: string; displayName: string; total: number } | null;
    earnings: { personId: string; displayName: string; total: number } | null;
    gamesPlayed: { personId: string; displayName: string; total: number } | null;
  };
  records: {
    biggestSinglePayout: {
      personId: string;
      displayName: string;
      amount: number;
      gameId: string;
    } | null;
    mostRebuysOneGame: {
      personId: string;
      displayName: string;
      count: number;
      gameId: string;
    } | null;
  };
}

interface Season {
  id: string;
  clubId: string;
  name: string;
  startDate: string;
  endDate: string;
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

function getRankColor(rank: number): string {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-gray-300";
  if (rank === 3) return "text-orange-400";
  return "text-[#6b7280]";
}

const viewTabs: { key: StandingsType; label: string }[] = [
  { key: "points", label: "Points" },
  { key: "bounties", label: "Bounties" },
  { key: "earnings", label: "Earnings" },
  { key: "games", label: "Games" },
];

export default function Standings() {
  const { clubId } = useParams<{ clubId: string }>();
  const currentUser = useGameStore((s) => s.currentUser);
  const effectiveClubId = clubId || currentUser?.clubId || "mock-club-001";

  const [searchParams, setSearchParams] = useSearchParams();
  const activeType = (searchParams.get("type") as StandingsType) || "points";
  const [selectedSeason, setSelectedSeason] = useState<string>("mock-season-001");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showAllTime, setShowAllTime] = useState(false);

  // Load seasons
  const seasonsQuery = useQuery<Season[]>({
    queryKey: ["seasons", effectiveClubId],
    queryFn: () =>
      api.get(`/clubs/${effectiveClubId}/seasons`).then((r) => r.data),
    staleTime: 60_000,
    // Fallback for mock
    placeholderData: [
      {
        id: "mock-season-001",
        clubId: "mock-club-001",
        name: "Spring 2026",
        startDate: "2026-01-01T00:00:00.000Z",
        endDate: "2026-06-30T00:00:00.000Z",
      },
      {
        id: "mock-season-002",
        clubId: "mock-club-001",
        name: "Fall 2025",
        startDate: "2025-07-01T00:00:00.000Z",
        endDate: "2025-12-31T00:00:00.000Z",
      },
    ],
  });

  // Load standings
  const standingsQuery = useQuery<{ type: StandingsType; seasonId: string; standings: StandingEntry[] }>({
    queryKey: ["standings", effectiveClubId, selectedSeason, activeType],
    queryFn: () =>
      api
        .get(
          `/results/${effectiveClubId}/standings/${selectedSeason}?type=${activeType}`
        )
        .then((r) => r.data),
    enabled: !!selectedSeason,
    staleTime: 30_000,
  });

  // Load all-time stats
  const allTimeQuery = useQuery<AllTimeStats>({
    queryKey: ["allTimeStats", effectiveClubId],
    queryFn: () =>
      api
        .get(`/results/${effectiveClubId}/standings/all-time`)
        .then((r) => r.data),
    staleTime: 60_000,
  });

  const standings = standingsQuery.data?.standings ?? [];
  const seasons = seasonsQuery.data ?? [];

  function setType(type: StandingsType) {
    setSearchParams({ type });
  }

  function getPrimaryValue(entry: StandingEntry): string {
    switch (activeType) {
      case "points":
        return `${entry.totalPoints ?? 0} pts`;
      case "bounties":
        return `${entry.totalBounties ?? 0}`;
      case "earnings":
        return `${(entry.totalEarnings ?? 0) >= 0 ? "+" : ""}$${entry.totalEarnings ?? 0}`;
      case "games":
        return `${entry.gamesPlayed ?? 0}`;
    }
  }

  function getSecondaryValue(entry: StandingEntry): string {
    switch (activeType) {
      case "points":
        return `${entry.gamesPlayed ?? 0} games · ${entry.avgPoints ?? 0} avg`;
      case "bounties":
        return `${entry.gamesPlayed ?? 0} games`;
      case "earnings":
        return `Invested $${entry.totalPaid ?? 0} · Won $${entry.totalWon ?? 0}`;
      case "games":
        return `${entry.winCount ?? 0} wins`;
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Standings</h1>
      </div>

      {/* Season selector */}
      <div className="px-5 mb-4">
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white appearance-none"
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* View switcher */}
      <div className="px-5 mb-4">
        <div className="flex bg-[#1a1a1a] rounded-xl p-1 border border-[#2a2a2a]">
          {viewTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setType(tab.key)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeType === tab.key
                  ? "bg-green-600 text-white"
                  : "text-[#9ca3af] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="px-5 mb-6">
        {standingsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[#9ca3af] animate-pulse">Loading standings...</div>
          </div>
        ) : standings.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl p-8 text-center">
            <span className="text-3xl block mb-2">📊</span>
            <p className="text-[#6b7280] text-sm">No standings data yet</p>
            <p className="text-[#4b5563] text-xs mt-1">
              Play some games to see the leaderboard
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {standings.map((entry) => (
              <button
                key={entry.personId}
                onClick={() => setSelectedPlayer(entry.personId)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-3 hover:bg-[#222] transition-colors text-left"
              >
                {/* Rank */}
                <span
                  className={`text-lg font-bold w-7 text-center flex-shrink-0 ${getRankColor(entry.rank)}`}
                >
                  {entry.rank}
                </span>

                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    backgroundColor: getAvatarColor(entry.displayName),
                  }}
                >
                  {entry.displayName.charAt(0).toUpperCase()}
                </div>

                {/* Name + secondary */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {entry.displayName}
                  </p>
                  <p className="text-[10px] text-[#6b7280] mt-0.5">
                    {getSecondaryValue(entry)}
                  </p>
                </div>

                {/* Primary stat */}
                <span
                  className={`text-sm font-bold flex-shrink-0 ${
                    activeType === "earnings"
                      ? (entry.totalEarnings ?? 0) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                      : "text-white"
                  }`}
                >
                  {getPrimaryValue(entry)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* All-Time Records */}
      <div className="px-5 mb-6">
        <button
          onClick={() => setShowAllTime(!showAllTime)}
          className="w-full flex items-center justify-between mb-3"
        >
          <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">
            🏅 All-Time Club Records
          </h2>
          <svg
            className={`w-4 h-4 text-[#6b7280] transition-transform ${showAllTime ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showAllTime && (
          <>
            {allTimeQuery.isLoading ? (
              <div className="text-[#9ca3af] text-sm text-center py-4 animate-pulse">
                Loading records...
              </div>
            ) : allTimeQuery.data ? (
              <div className="grid grid-cols-2 gap-3">
                <RecordCard
                  label="Points Leader"
                  value={allTimeQuery.data.leaders.points?.displayName ?? "N/A"}
                  stat={
                    allTimeQuery.data.leaders.points
                      ? `${allTimeQuery.data.leaders.points.total} pts`
                      : ""
                  }
                />
                <RecordCard
                  label="Bounties Leader"
                  value={allTimeQuery.data.leaders.bounties?.displayName ?? "N/A"}
                  stat={
                    allTimeQuery.data.leaders.bounties
                      ? `${allTimeQuery.data.leaders.bounties.total} bounties`
                      : ""
                  }
                />
                <RecordCard
                  label="Earnings Leader"
                  value={allTimeQuery.data.leaders.earnings?.displayName ?? "N/A"}
                  stat={
                    allTimeQuery.data.leaders.earnings
                      ? `$${allTimeQuery.data.leaders.earnings.total}`
                      : ""
                  }
                />
                <RecordCard
                  label="Most Games"
                  value={allTimeQuery.data.leaders.gamesPlayed?.displayName ?? "N/A"}
                  stat={
                    allTimeQuery.data.leaders.gamesPlayed
                      ? `${allTimeQuery.data.leaders.gamesPlayed.total} games`
                      : ""
                  }
                />
                <RecordCard
                  label="Biggest Payout"
                  value={
                    allTimeQuery.data.records.biggestSinglePayout?.displayName ??
                    "N/A"
                  }
                  stat={
                    allTimeQuery.data.records.biggestSinglePayout
                      ? `$${allTimeQuery.data.records.biggestSinglePayout.amount}`
                      : ""
                  }
                />
                <RecordCard
                  label="Most Rebuys"
                  value={
                    allTimeQuery.data.records.mostRebuysOneGame?.displayName ??
                    "N/A"
                  }
                  stat={
                    allTimeQuery.data.records.mostRebuysOneGame
                      ? `${allTimeQuery.data.records.mostRebuysOneGame.count} rebuys`
                      : ""
                  }
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Player Stats Modal */}
      <PlayerStatsModal
        personId={selectedPlayer ?? ""}
        clubId={effectiveClubId}
        seasonId={selectedSeason}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}

function RecordCard({
  label,
  value,
  stat,
}: {
  label: string;
  value: string;
  stat: string;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
      <p className="text-[10px] text-[#6b7280] uppercase mb-1">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
      {stat && <p className="text-xs text-[#9ca3af] mt-0.5">{stat}</p>}
    </div>
  );
}
