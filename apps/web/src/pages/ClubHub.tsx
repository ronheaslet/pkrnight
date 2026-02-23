import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useClub } from "../hooks/useClub";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";
import ToolsMenu from "../components/common/ToolsMenu";
import PlayerStatsModal from "../components/game/PlayerStatsModal";
import PubPokerGate from "../components/common/PubPokerGate";

interface UpcomingEvent {
  id: string;
  title: string;
  startsAt: string;
  buyInAmount: number;
  myRsvpStatus?: string | null;
}

export default function ClubHub() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const currentUser = useGameStore((s) => s.currentUser);
  const { club, isLoading, activeGameId } = useClub(clubId);
  const [showTools, setShowTools] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMode, setBroadcastMode] = useState<"select" | "broadcast" | "game-night">("select");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSms, setBroadcastSms] = useState(false);
  const [gameNightMessage, setGameNightMessage] = useState("Game is on tonight! ");
  const [showGameNightConfirm, setShowGameNightConfirm] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load standings preview (top 3)
  const standingsQuery = useQuery<{ standings: Array<{ rank: number; personId: string; displayName: string; totalPoints: number }> }>({
    queryKey: ["standings", clubId, "mock-season-001", "points"],
    queryFn: () =>
      api.get(`/results/${clubId}/standings/mock-season-001?type=points`).then((r) => r.data),
    enabled: !!clubId,
    staleTime: 60_000,
  });

  const topStandings = (standingsQuery.data?.standings ?? []).slice(0, 3);

  const isOwnerOrAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.roles.includes("OWNER") ||
    currentUser?.roles.includes("ADMIN");

  // Load members for preview
  const membersQuery = useQuery({
    queryKey: ["members", clubId],
    queryFn: () => api.get(`/clubs/${clubId}/members`).then((r) => r.data),
    enabled: !!clubId,
    staleTime: 60_000,
  });

  const members = membersQuery.data ?? [];
  const memberCount = club?.memberCount ?? members.length ?? 0;

  // Broadcast mutations
  const broadcastMutation = useMutation({
    mutationFn: (data: { message: string; sendSms: boolean }) =>
      api.post(`/clubs/${clubId}/broadcast`, data),
    onSuccess: (res) => {
      const count = res.data?.recipientCount ?? memberCount;
      setToast({ type: "success", message: `Message sent to ${count} members` });
      closeBroadcast();
    },
    onError: () => {
      setToast({ type: "error", message: "Failed to send message" });
    },
  });

  const gameNightMutation = useMutation({
    mutationFn: (data: { message: string }) =>
      api.post(`/clubs/${clubId}/broadcast/game-night`, data),
    onSuccess: (res) => {
      const count = res.data?.recipientCount ?? memberCount;
      setToast({ type: "success", message: `Message sent to ${count} members` });
      closeBroadcast();
    },
    onError: () => {
      setToast({ type: "error", message: "Failed to send game night alert" });
    },
  });

  const closeBroadcast = () => {
    setShowBroadcast(false);
    setBroadcastMode("select");
    setBroadcastMessage("");
    setBroadcastSms(false);
    setGameNightMessage("Game is on tonight! ");
    setShowGameNightConfirm(false);
  };

  // Auto-clear toast
  if (toast) {
    setTimeout(() => setToast(null), 3000);
  }

  // Load upcoming events
  const eventsQuery = useQuery({
    queryKey: ["upcomingEvents", clubId],
    queryFn: () =>
      api.get(`/clubs/${clubId}/events/upcoming`).then((r) => r.data),
    enabled: !!clubId,
    staleTime: 30_000,
  });

  const upcomingEvents: UpcomingEvent[] = eventsQuery.data ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <div className="animate-pulse text-[#9ca3af]">Loading club...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{club?.name ?? "Club"}</h1>
          {club?.tagline && (
            <p className="text-[#9ca3af] text-sm mt-1">{club.tagline}</p>
          )}
          <p className="text-[#6b7280] text-xs mt-1">
            {club?.memberCount ?? 0} members
          </p>
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={() => navigate(`/clubs/${clubId}/settings`)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Club settings"
          >
            <svg
              className="w-6 h-6 text-[#9ca3af]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Live Game Banner */}
      {activeGameId && (
        <div
          onClick={() => navigate(`/game/${activeGameId}`)}
          className="mx-5 mb-4 px-4 py-3 bg-green-900/30 border border-green-600/40 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-green-900/50 transition-colors"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="text-green-400 font-medium">Game in Progress</span>
          <svg
            className="w-4 h-4 text-green-500 ml-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      )}

      {/* Upcoming Events Strip */}
      <div className="px-5 mb-6">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
          Upcoming Events
        </h2>
        {upcomingEvents.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl p-6 text-center">
            <p className="text-[#6b7280] text-sm">No upcoming events</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
            {upcomingEvents.map((ev) => {
              const d = new Date(ev.startsAt);
              const label = d.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const time = d.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });
              const badgeColors: Record<string, string> = {
                GOING: "bg-green-500",
                MAYBE: "bg-yellow-500",
                NOT_GOING: "bg-red-500",
              };
              const badgeColor =
                badgeColors[ev.myRsvpStatus ?? ""] ?? "bg-[#6b7280]";
              return (
                <button
                  key={ev.id}
                  onClick={() => navigate(`/events/${ev.id}`)}
                  className="flex-shrink-0 w-52 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-left hover:bg-[#222] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-sm truncate flex-1 mr-2">
                      {ev.title}
                    </h3>
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${badgeColor}`}
                    />
                  </div>
                  <p className="text-xs text-[#9ca3af] mt-1">
                    {label} · {time}
                  </p>
                  <p className="text-xs text-[#6b7280] mt-0.5">
                    ${ev.buyInAmount} buy-in
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Standings Preview */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">
            Standings
          </h2>
          <button
            onClick={() => navigate(`/clubs/${clubId}/standings`)}
            className="text-xs text-green-500 hover:text-green-400"
          >
            View Full Standings
          </button>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-3">
          {topStandings.length > 0
            ? topStandings.map((entry) => (
                <button
                  key={entry.personId}
                  onClick={() => setSelectedPlayer(entry.personId)}
                  className="flex items-center gap-3 w-full text-left hover:bg-white/5 rounded-lg transition-colors -mx-1 px-1"
                >
                  <span
                    className={`text-lg font-bold w-6 text-center ${
                      entry.rank === 1
                        ? "text-yellow-400"
                        : entry.rank === 2
                          ? "text-gray-300"
                          : "text-orange-400"
                    }`}
                  >
                    {entry.rank}
                  </span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      backgroundColor: getAvatarColor(entry.displayName),
                    }}
                  >
                    {entry.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm flex-1 truncate">
                    {entry.displayName}
                  </span>
                  <span className="text-sm text-[#9ca3af]">
                    {entry.totalPoints} pts
                  </span>
                </button>
              ))
            : [1, 2, 3].map((rank) => (
                <div key={rank} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-[#6b7280] w-6 text-center">
                    {rank}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#374151] flex items-center justify-center text-sm font-medium">
                    ?
                  </div>
                  <span className="text-[#6b7280] text-sm flex-1">
                    No data yet
                  </span>
                  <span className="text-[#4b5563] text-sm">-- pts</span>
                </div>
              ))}
        </div>
      </div>

      {/* Tools */}
      <div className="px-5 mb-6">
        <button
          onClick={() => setShowTools(true)}
          className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center gap-3 hover:bg-[#222] transition-colors"
        >
          <svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <span className="text-white font-medium text-sm">Tools</span>
          <svg className="w-4 h-4 text-[#6b7280] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Tools Menu */}
      <ToolsMenu isOpen={showTools} onClose={() => setShowTools(false)} />

      {/* Admin: Accounting Link */}
      {isOwnerOrAdmin && (
        <div className="px-5 mb-6">
          <button
            onClick={() => navigate(`/clubs/${clubId}/accounting`)}
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center gap-3 hover:bg-[#222] transition-colors"
          >
            <svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-white font-medium text-sm">Accounting</span>
            <svg className="w-4 h-4 text-[#6b7280] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Admin: Pub Poker Quick Actions */}
      {isOwnerOrAdmin && (
        <PubPokerGate fallback={null}>
          <div className="px-5 mb-6 flex gap-3">
            <button
              onClick={() => navigate(`/clubs/${clubId}/checkin`)}
              className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center gap-2 hover:bg-[#222] transition-colors"
            >
              <span className="text-lg">{"✓"}</span>
              <span className="text-white font-medium text-sm">Check In Players</span>
            </button>
            <button
              onClick={() => navigate(`/clubs/${clubId}/tables`)}
              className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center gap-2 hover:bg-[#222] transition-colors"
            >
              <span className="text-lg">{"🪑"}</span>
              <span className="text-white font-medium text-sm">Table Manager</span>
            </button>
          </div>
        </PubPokerGate>
      )}

      {/* Admin: Send Message */}
      {isOwnerOrAdmin && (
        <div className="px-5 mb-6">
          <button
            onClick={() => setShowBroadcast(true)}
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center gap-3 hover:bg-[#222] transition-colors"
          >
            <svg className="w-5 h-5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <span className="text-white font-medium text-sm">Send Message</span>
            <svg className="w-4 h-4 text-[#6b7280] ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Members Section */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">
            Members
          </h2>
          <button
            onClick={() => navigate(`/clubs/${clubId}/members`)}
            className="text-xs text-green-500 hover:text-green-400"
          >
            View All Members
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(members.length > 0 ? members.slice(0, 6) : placeholderMembers).map(
            (member: MemberPreview, i: number) => (
              <div
                key={member.personId ?? i}
                className="bg-[#1a1a1a] rounded-xl p-3 text-center"
              >
                <div
                  className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: getAvatarColor(member.displayName),
                  }}
                >
                  {member.displayName.charAt(0).toUpperCase()}
                </div>
                <p className="text-xs font-medium truncate">
                  {member.displayName}
                </p>
                {member.systemRole !== "MEMBER" && (
                  <span className="text-[10px] text-green-500">
                    {member.systemRole}
                  </span>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Chat Preview */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">
            Chat
          </h2>
          <button
            onClick={() => navigate(`/clubs/${clubId}/chat`)}
            className="text-xs text-green-500 hover:text-green-400"
          >
            Open Chat
          </button>
        </div>
        <button
          onClick={() => navigate(`/clubs/${clubId}/chat`)}
          className="w-full bg-[#1a1a1a] rounded-xl p-4 text-left hover:bg-[#222] transition-colors"
        >
          <p className="text-sm text-[#9ca3af]">Jump into the conversation</p>
          <p className="text-xs text-[#6b7280] mt-1">Tap to open club chat</p>
        </button>
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={closeBroadcast}>
          <div className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </div>
            <div className="px-6 pb-8">
              <h2 className="text-lg font-bold mb-4">Send Message to Members</h2>

              {broadcastMode === "select" && (
                <div className="space-y-3">
                  <button
                    onClick={() => setBroadcastMode("broadcast")}
                    className="w-full p-4 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-left hover:bg-[#222] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{"\uD83D\uDCE2"}</span>
                      <div>
                        <p className="font-medium text-sm">Broadcast</p>
                        <p className="text-xs text-[#6b7280] mt-0.5">In-app notification to all members</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setBroadcastMode("game-night")}
                    className="w-full p-4 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-left hover:bg-[#222] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{"\uD83C\uDCCF"}</span>
                      <div>
                        <p className="font-medium text-sm">Game Night Alert</p>
                        <p className="text-xs text-[#6b7280] mt-0.5">Urgent SMS to all members now</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {broadcastMode === "broadcast" && (
                <div className="space-y-4">
                  <button onClick={() => setBroadcastMode("select")} className="text-xs text-[#9ca3af] hover:text-white">
                    {"\u2190"} Back
                  </button>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Write your message..."
                    rows={4}
                    className="w-full px-4 py-3 bg-[#0f0f0f] rounded-xl text-sm border border-[#374151] focus:border-green-500 focus:outline-none resize-none placeholder-[#6b7280]"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#9ca3af]">Also send SMS</span>
                    <button
                      onClick={() => setBroadcastSms(!broadcastSms)}
                      className={`w-12 h-6 rounded-full transition-colors flex items-center ${
                        broadcastSms ? "bg-green-500" : "bg-[#374151]"
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        broadcastSms ? "translate-x-6" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>
                  <button
                    onClick={() => broadcastMutation.mutate({ message: broadcastMessage, sendSms: broadcastSms })}
                    disabled={!broadcastMessage.trim() || broadcastMutation.isPending}
                    className="w-full py-3 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-40"
                  >
                    {broadcastMutation.isPending ? "Sending..." : "Send"}
                  </button>
                </div>
              )}

              {broadcastMode === "game-night" && !showGameNightConfirm && (
                <div className="space-y-4">
                  <button onClick={() => setBroadcastMode("select")} className="text-xs text-[#9ca3af] hover:text-white">
                    {"\u2190"} Back
                  </button>
                  <textarea
                    value={gameNightMessage}
                    onChange={(e) => setGameNightMessage(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-[#0f0f0f] rounded-xl text-sm border border-[#374151] focus:border-red-500 focus:outline-none resize-none"
                  />
                  <p className="text-xs text-[#6b7280]">This will send an SMS immediately to all members.</p>
                  <button
                    onClick={() => setShowGameNightConfirm(true)}
                    disabled={!gameNightMessage.trim()}
                    className="w-full py-3 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40"
                  >
                    Send SMS Now
                  </button>
                </div>
              )}

              {broadcastMode === "game-night" && showGameNightConfirm && (
                <div className="space-y-4">
                  <div className="p-4 bg-red-900/20 border border-red-600/40 rounded-xl">
                    <p className="text-sm text-red-400 font-medium">
                      This will send an SMS to all {memberCount} members immediately.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowGameNightConfirm(false)}
                      className="flex-1 py-3 rounded-xl text-sm text-[#9ca3af] bg-[#0f0f0f] hover:bg-[#222] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => gameNightMutation.mutate({ message: gameNightMessage })}
                      disabled={gameNightMutation.isPending}
                      className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40"
                    >
                      {gameNightMutation.isPending ? "Sending..." : "Confirm Send"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg z-50 text-sm font-medium ${
          toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Player Stats Modal */}
      <PlayerStatsModal
        personId={selectedPlayer ?? ""}
        clubId={clubId || "mock-club-001"}
        seasonId="mock-season-001"
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}

// Helpers

interface MemberPreview {
  personId?: string;
  displayName: string;
  systemRole: string;
}

const placeholderMembers: MemberPreview[] = [
  { displayName: "Loading...", systemRole: "MEMBER" },
  { displayName: "Loading...", systemRole: "MEMBER" },
  { displayName: "Loading...", systemRole: "MEMBER" },
];

function getAvatarColor(name: string): string {
  const colors = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
