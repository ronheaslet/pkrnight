import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";

interface NetworkStats {
  directConnections: number;
  totalReach: number;
  mostPlayedWith: { name: string; gameCount: number } | null;
  clubsRepresented: number;
}

interface Connection {
  personId: string;
  displayName: string;
  gamesPlayed: number;
  lastPlayedAt: string;
  firstPlayedAt: string;
  depth: number;
}

interface Invite {
  id: string;
  fromName: string;
  eventTitle: string;
}

// Mock data
const MOCK_STATS: NetworkStats = {
  directConnections: 8,
  totalReach: 23,
  mostPlayedWith: { name: "Mike T.", gameCount: 14 },
  clubsRepresented: 3,
};

const MOCK_CONNECTIONS_DEPTH1: Connection[] = [
  { personId: "p1", displayName: "Mike T.", gamesPlayed: 14, lastPlayedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), firstPlayedAt: "2024-06-15T00:00:00Z", depth: 1 },
  { personId: "p2", displayName: "Sarah K.", gamesPlayed: 11, lastPlayedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), firstPlayedAt: "2024-07-01T00:00:00Z", depth: 1 },
  { personId: "p3", displayName: "Dave R.", gamesPlayed: 9, lastPlayedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), firstPlayedAt: "2024-08-10T00:00:00Z", depth: 1 },
  { personId: "p4", displayName: "Lisa M.", gamesPlayed: 7, lastPlayedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), firstPlayedAt: "2024-09-05T00:00:00Z", depth: 1 },
  { personId: "p5", displayName: "Tom B.", gamesPlayed: 6, lastPlayedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), firstPlayedAt: "2024-09-20T00:00:00Z", depth: 1 },
  { personId: "p6", displayName: "Jenny W.", gamesPlayed: 5, lastPlayedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), firstPlayedAt: "2024-10-01T00:00:00Z", depth: 1 },
  { personId: "p7", displayName: "Chris P.", gamesPlayed: 3, lastPlayedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), firstPlayedAt: "2024-11-15T00:00:00Z", depth: 1 },
  { personId: "p8", displayName: "Alex N.", gamesPlayed: 2, lastPlayedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), firstPlayedAt: "2025-01-01T00:00:00Z", depth: 1 },
];

const MOCK_CONNECTIONS_DEPTH2: Connection[] = [
  ...MOCK_CONNECTIONS_DEPTH1,
  { personId: "p9", displayName: "Kevin L.", gamesPlayed: 0, lastPlayedAt: "", firstPlayedAt: "", depth: 2 },
  { personId: "p10", displayName: "Rachel G.", gamesPlayed: 0, lastPlayedAt: "", firstPlayedAt: "", depth: 2 },
  { personId: "p11", displayName: "Brandon S.", gamesPlayed: 0, lastPlayedAt: "", firstPlayedAt: "", depth: 2 },
  { personId: "p12", displayName: "Amanda C.", gamesPlayed: 0, lastPlayedAt: "", firstPlayedAt: "", depth: 2 },
  { personId: "p13", displayName: "Nick F.", gamesPlayed: 0, lastPlayedAt: "", firstPlayedAt: "", depth: 2 },
];

const MOCK_INVITES: Invite[] = [];

function getAvatarColor(name: string): string {
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return "Never";
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffDays = Math.floor((now - date) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Network() {
  const navigate = useNavigate();
  const currentUser = useGameStore((s) => s.currentUser);
  const currentClub = useGameStore((s) => s.currentClub);
  const primaryColor = currentClub?.primaryColor || "#22c55e";
  const clubId = currentUser?.clubId || currentClub?.id;

  const [depth, setDepth] = useState<1 | 2>(1);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

  // Fetch stats (falls back to mock)
  const statsQuery = useQuery<NetworkStats>({
    queryKey: ["network-stats"],
    queryFn: () => api.get("/network/stats").then((r) => r.data),
    staleTime: 60_000,
    placeholderData: MOCK_STATS,
  });

  const stats = statsQuery.data || MOCK_STATS;

  // Fetch connections (falls back to mock)
  const connectionsQuery = useQuery<Connection[]>({
    queryKey: ["network-connections", depth],
    queryFn: () => api.get(`/network?depth=${depth}`).then((r) => r.data),
    staleTime: 60_000,
    placeholderData: depth === 1 ? MOCK_CONNECTIONS_DEPTH1 : MOCK_CONNECTIONS_DEPTH2,
  });

  const connections = connectionsQuery.data || (depth === 1 ? MOCK_CONNECTIONS_DEPTH1 : MOCK_CONNECTIONS_DEPTH2);

  // Fetch incoming invites
  const invitesQuery = useQuery<Invite[]>({
    queryKey: ["incoming-invites"],
    queryFn: () => api.get("/invites/incoming").then((r) => r.data),
    staleTime: 60_000,
    placeholderData: MOCK_INVITES,
  });

  const invites = invitesQuery.data || MOCK_INVITES;

  const statCards = [
    { icon: "\uD83E\uDD1D", label: "Direct Connections", value: stats.directConnections },
    { icon: "\uD83C\uDF10", label: "Total Reach", value: stats.totalReach },
    { icon: "\uD83C\uDFAE", label: "Most Played With", value: stats.mostPlayedWith ? `${stats.mostPlayedWith.name} (${stats.mostPlayedWith.gameCount})` : "—" },
    { icon: "\uD83C\uDFE0", label: "Clubs Represented", value: stats.clubsRepresented },
  ];

  if (connections.length === 0 && depth === 1) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-2xl font-bold">My Poker Network</h1>
        </div>
        <div className="flex flex-col items-center justify-center pt-24">
          <span className="text-5xl mb-4">{"\uD83C\uDCCF"}</span>
          <p className="text-white font-medium">Your network is empty</p>
          <p className="text-[#6b7280] text-sm mt-1 text-center px-8">
            Play in a game to start building connections.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold">My Poker Network</h1>
      </div>

      {/* Incoming Invites Banner */}
      {invites.length > 0 && (
        <div className="px-5 mb-4">
          <button
            onClick={() => navigate("/inbox")}
            className="w-full px-4 py-3 bg-yellow-900/30 border border-yellow-600/40 rounded-xl flex items-center gap-3 hover:bg-yellow-900/50 transition-colors"
          >
            <span className="text-yellow-400 text-sm font-medium">
              You have {invites.length} game invitation{invites.length !== 1 ? "s" : ""} from your network
            </span>
            <svg className="w-4 h-4 text-yellow-500 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="px-5 mb-6">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-5 px-5">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="flex-shrink-0 w-40 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4"
            >
              <span className="text-2xl">{card.icon}</span>
              <p className="text-lg font-bold mt-2">{card.value}</p>
              <p className="text-[10px] text-[#6b7280] uppercase tracking-wide mt-0.5">
                {card.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Depth Toggle */}
      <div className="px-5 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setDepth(1)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
              depth === 1 ? "text-white" : "bg-[#1a1a1a] text-[#9ca3af] hover:bg-[#222]"
            }`}
            style={depth === 1 ? { backgroundColor: primaryColor } : undefined}
          >
            Direct
          </button>
          <button
            onClick={() => setDepth(2)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
              depth === 2 ? "text-white" : "bg-[#1a1a1a] text-[#9ca3af] hover:bg-[#222]"
            }`}
            style={depth === 2 ? { backgroundColor: primaryColor } : undefined}
          >
            Extended Network
          </button>
        </div>
      </div>

      {/* Connection List */}
      <div className="px-5 space-y-2">
        {connections.map((conn) => (
          <button
            key={conn.personId}
            onClick={() => setSelectedConnection(conn)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-3 text-left hover:bg-[#222] transition-colors"
            style={conn.depth === 2 ? { opacity: 0.7 } : undefined}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: getAvatarColor(conn.displayName) }}
            >
              {conn.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{conn.displayName}</p>
                {conn.depth === 2 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#374151] rounded text-[#9ca3af]">
                    2nd
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6b7280] mt-0.5">
                {conn.gamesPlayed > 0
                  ? `${conn.gamesPlayed} games together`
                  : "Connected through network"}
              </p>
            </div>
            {conn.lastPlayedAt && (
              <span className="text-[10px] text-[#6b7280] flex-shrink-0">
                {formatRelativeDate(conn.lastPlayedAt)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Connection Detail Bottom Sheet */}
      {selectedConnection && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
          onClick={() => setSelectedConnection(null)}
        >
          <div
            className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </div>

            <div className="px-6 pb-8">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{ backgroundColor: getAvatarColor(selectedConnection.displayName) }}
                >
                  {selectedConnection.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedConnection.displayName}</h3>
                  <p className="text-xs text-[#9ca3af]">
                    {selectedConnection.gamesPlayed > 0
                      ? `${selectedConnection.gamesPlayed} games together · first played ${new Date(selectedConnection.firstPlayedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                      : "You haven't played together yet"}
                  </p>
                </div>
              </div>

              {/* Action */}
              {selectedConnection.depth === 1 ? (
                <button
                  onClick={() => {
                    setSelectedConnection(null);
                    navigate(`/clubs/${clubId}/calendar`);
                  }}
                  className="w-full py-3 rounded-xl text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: primaryColor }}
                >
                  Invite to a Game
                </button>
              ) : (
                <p className="text-center text-sm text-[#6b7280] py-3">
                  You haven't played together yet
                </p>
              )}

              {/* Close */}
              <button
                onClick={() => setSelectedConnection(null)}
                className="w-full py-3 mt-2 rounded-xl text-sm text-[#9ca3af] hover:bg-white/5 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
