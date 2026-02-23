import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import { mockCircuit } from "../../lib/pubPokerMocks";

interface StandingEntry {
  rank: number;
  personId: string;
  displayName: string;
  totalPoints: number;
  venueCount: number;
  gameCount: number;
}

interface Venue {
  clubId: string;
  venueName: string;
  address: string;
  operatingNights: string[];
}

interface CircuitData {
  id: string;
  name: string;
  description: string;
  playerCount: number;
  venueCount: number;
  venues: Venue[];
  standings: StandingEntry[];
}

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

export default function CircuitStandings() {
  const { circuitId } = useParams<{ circuitId: string }>();
  const navigate = useNavigate();
  const isMock = circuitId === "mock-circuit-001";

  const circuitQuery = useQuery<CircuitData>({
    queryKey: ["circuit", circuitId],
    queryFn: () => {
      if (isMock) return Promise.resolve(mockCircuit);
      return api.get(`/circuits/${circuitId}/standings`).then((r) => r.data);
    },
    enabled: !!circuitId,
  });

  if (circuitQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <div className="animate-pulse text-[#9ca3af]">Loading circuit...</div>
      </div>
    );
  }

  const circuit = circuitQuery.data;
  if (!circuit) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <p className="text-[#6b7280]">Circuit not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-xl font-bold">{circuit.name}</h1>
        {circuit.description && (
          <p className="text-[#9ca3af] text-sm mt-1">{circuit.description}</p>
        )}
        <p className="text-[#6b7280] text-xs mt-1">
          {circuit.venueCount} venues · {circuit.playerCount} players
        </p>
      </div>

      {/* Venue chips */}
      <div className="px-5 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {circuit.venues.map((v) => (
            <button
              key={v.clubId}
              onClick={() => navigate(`/clubs/${v.clubId}`)}
              className="flex-shrink-0 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full text-xs text-[#9ca3af] hover:text-white transition-colors"
            >
              {v.venueName}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="px-5 mb-6">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
          Leaderboard
        </h2>
        <div className="space-y-1">
          {circuit.standings.map((entry) => (
            <div
              key={entry.personId}
              className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]"
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
                {entry.rank}
              </span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: getAvatarColor(entry.displayName) }}
              >
                {entry.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate">
                  {entry.displayName}
                </span>
                <span className="text-[10px] text-[#6b7280]">
                  {entry.venueCount} venue{entry.venueCount !== 1 ? "s" : ""} ·{" "}
                  {entry.gameCount} game{entry.gameCount !== 1 ? "s" : ""}
                </span>
              </div>
              <span className="text-sm font-semibold text-[#9ca3af]">
                {entry.totalPoints} pts
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Venue cards */}
      <div className="px-5">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
          Venues
        </h2>
        <div className="space-y-3">
          {circuit.venues.map((venue) => (
            <div
              key={venue.clubId}
              className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]"
            >
              <h3 className="font-medium">{venue.venueName}</h3>
              <p className="text-xs text-[#6b7280] mt-1">{venue.address}</p>
              <div className="flex gap-1 mt-2">
                {venue.operatingNights.map((night) => (
                  <span
                    key={night}
                    className="px-2 py-0.5 bg-green-900/20 text-green-400 text-[10px] rounded-full"
                  >
                    {DAY_LABELS[night] ?? night}
                  </span>
                ))}
              </div>
              <button
                onClick={() => navigate(`/clubs/${venue.clubId}`)}
                className="mt-2 text-xs text-green-500 hover:text-green-400"
              >
                View Club
              </button>
            </div>
          ))}
        </div>
      </div>
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
