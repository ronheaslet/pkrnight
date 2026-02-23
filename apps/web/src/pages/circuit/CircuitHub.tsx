import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "../../lib/api";
import { useGameStore } from "../../store/gameStore";
import CircuitStandings from "../../components/circuit/CircuitStandings";

interface CircuitData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  city: string | null;
  state: string | null;
  isActive: boolean;
  ownerId: string;
  memberCount: number;
  activeSeason: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  venues: Array<{
    id: string;
    clubId: string;
    club: {
      id: string;
      name: string;
      slug: string;
      venueCity: string | null;
      logoUrl: string | null;
      primaryColor: string | null;
      venueProfile: { venueName: string; address: string } | null;
      _count: { games: number };
    };
  }>;
  seasons: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>;
}

interface StandingsResult {
  standings: Array<{
    rank: number;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    points: number;
    gamesPlayed: number;
  }>;
  season: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  } | null;
}

export default function CircuitHub() {
  const { circuitId } = useParams<{ circuitId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useGameStore((s) => s.currentUser);
  const [recalculating, setRecalculating] = useState(false);

  const circuitQuery = useQuery<CircuitData>({
    queryKey: ["circuit", circuitId],
    queryFn: () => api.get(`/circuits/${circuitId}`).then((r) => r.data),
    enabled: !!circuitId,
  });

  const standingsQuery = useQuery<StandingsResult>({
    queryKey: ["circuitStandings", circuitId],
    queryFn: () => api.get(`/circuits/${circuitId}/standings`).then((r) => r.data),
    enabled: !!circuitId,
  });

  const joinMutation = useMutation({
    mutationFn: () => api.post(`/circuits/${circuitId}/members`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuit", circuitId] });
    },
  });

  const recalcMutation = useMutation({
    mutationFn: () => api.post(`/circuits/${circuitId}/recalculate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuitStandings", circuitId] });
      setRecalculating(false);
    },
    onError: () => setRecalculating(false),
  });

  if (circuitQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <div className="animate-pulse text-[#9ca3af]">Loading circuit...</div>
      </div>
    );
  }

  if (circuitQuery.error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center p-6">
        <p className="text-red-400 mb-4">Failed to load circuit.</p>
        <button
          onClick={() => circuitQuery.refetch()}
          className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#c9a432] text-[#0f0f0f] rounded-lg text-sm font-medium transition-colors"
        >
          Retry
        </button>
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

  const isOwner = currentUser?.userId === circuit.ownerId || currentUser?.isSuperAdmin;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-start gap-4">
          {circuit.logoUrl ? (
            <img
              src={circuit.logoUrl}
              alt={circuit.name}
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center text-2xl flex-shrink-0">
              {"\u26A1"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1
              className="text-xl font-bold truncate"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {circuit.name}
            </h1>
            {(circuit.city || circuit.state) && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-[#D4AF37]/10 text-[#D4AF37] text-xs rounded-full">
                {[circuit.city, circuit.state].filter(Boolean).join(", ")}
              </span>
            )}
            <p className="text-[#6b7280] text-xs mt-1">
              {circuit.venues.length} venue{circuit.venues.length !== 1 ? "s" : ""} &middot;{" "}
              {circuit.memberCount} player{circuit.memberCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {circuit.description && (
          <p className="text-[#9ca3af] text-sm mt-3">{circuit.description}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
            className="flex-1 py-2.5 bg-[#D4AF37] hover:bg-[#c9a432] text-[#0f0f0f] rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
          >
            {joinMutation.isPending ? "Joining..." : "I Play Here"}
          </button>
          {isOwner && (
            <button
              onClick={() => navigate(`/circuits/${circuitId}/manage`)}
              className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-sm text-[#9ca3af] hover:text-white transition-colors"
            >
              Manage
            </button>
          )}
        </div>
      </div>

      {/* Active Season */}
      {circuit.activeSeason && (
        <div className="px-5 py-3">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-[#6b7280] uppercase tracking-wide">Active Season</span>
                <h3 className="text-sm font-semibold mt-0.5">{circuit.activeSeason.name}</h3>
              </div>
              <span className="text-[10px] text-[#6b7280]">
                {new Date(circuit.activeSeason.startDate).toLocaleDateString()} &ndash;{" "}
                {new Date(circuit.activeSeason.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Stats & Recalculate */}
      {isOwner && (
        <div className="px-5 pb-3">
          <button
            onClick={() => {
              setRecalculating(true);
              recalcMutation.mutate();
            }}
            disabled={recalculating}
            className="w-full py-2.5 bg-[#1a1a1a] border border-[#D4AF37]/30 rounded-xl text-sm text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors disabled:opacity-50"
          >
            {recalculating ? "Recalculating..." : "Recalculate Standings"}
          </button>
        </div>
      )}

      {/* Standings */}
      <div className="px-5 mb-6">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
          Leaderboard
        </h2>
        <CircuitStandings
          standings={standingsQuery.data?.standings ?? []}
          loading={standingsQuery.isLoading}
        />
      </div>

      {/* Venues */}
      <div className="px-5">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
          Venues
        </h2>
        <div className="space-y-3">
          {circuit.venues.map((v) => (
            <button
              key={v.clubId}
              onClick={() => navigate(`/clubs/${v.club.id}`)}
              className="w-full bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] text-left hover:border-[#3a3a3a] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: v.club.primaryColor || "#374151" }}
                >
                  {v.club.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{v.club.name}</h3>
                  {v.club.venueCity && (
                    <p className="text-[10px] text-[#6b7280]">{v.club.venueCity}</p>
                  )}
                  <p className="text-[10px] text-[#4b5563]">
                    {v.club._count.games} game{v.club._count.games !== 1 ? "s" : ""} completed
                  </p>
                </div>
                <svg
                  className="w-4 h-4 text-[#4b5563] flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
