import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";

type RsvpStatus = "GOING" | "MAYBE" | "NOT_GOING";

interface RsvpEntry {
  id: string;
  status: string;
  guestName: string | null;
  membership: { person: { displayName: string } } | null;
}

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useGameStore((s) => s.currentUser);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [payoutPlayerCount, setPayoutPlayerCount] = useState(9);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const isOwnerOrAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.roles.includes("OWNER") ||
    currentUser?.roles.includes("ADMIN");

  // Load event
  const eventQuery = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => api.get(`/events/${eventId}`).then((r) => r.data),
    enabled: !!eventId,
  });

  // Load RSVPs
  const rsvpsQuery = useQuery({
    queryKey: ["rsvps", eventId],
    queryFn: () => api.get(`/events/${eventId}/rsvps`).then((r) => r.data),
    enabled: !!eventId,
  });

  // Load payout structure
  const payoutQuery = useQuery({
    queryKey: ["payout", eventId, payoutPlayerCount],
    queryFn: () =>
      api
        .get(`/events/${eventId}/payout-structure?playerCount=${payoutPlayerCount}`)
        .then((r) => r.data),
    enabled: !!eventId && isOwnerOrAdmin,
  });

  // RSVP mutation
  const rsvpMutation = useMutation({
    mutationFn: (status: RsvpStatus) =>
      api.patch(`/events/${eventId}/rsvp`, { status }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rsvps", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: () =>
      api.post(`/events/${eventId}/publish`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: () =>
      api.post(`/events/${eventId}/cancel`, {}).then((r) => r.data),
    onSuccess: () => {
      setShowCancelModal(false);
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
  });

  // Guest invite mutation
  const inviteMutation = useMutation({
    mutationFn: () =>
      api
        .post(`/events/${eventId}/invite-guest`, {
          name: inviteName,
          phone: invitePhone,
        })
        .then((r) => r.data),
    onSuccess: () => {
      setInviteName("");
      setInvitePhone("");
      setShowInviteModal(false);
      queryClient.invalidateQueries({ queryKey: ["rsvps", eventId] });
    },
  });

  const event = eventQuery.data;
  const rsvps = rsvpsQuery.data;

  if (eventQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <div className="animate-pulse text-[#9ca3af]">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <p className="text-[#6b7280]">Event not found</p>
      </div>
    );
  }

  const startsAt = new Date(event.startsAt);
  const dateStr = startsAt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const locationStr =
    event.savedLocation?.name ??
    event.locationName ??
    "No location set";

  const goingCount = rsvps?.going?.length ?? event.rsvpCounts?.going ?? 0;
  const maybeCount = rsvps?.maybe?.length ?? event.rsvpCounts?.maybe ?? 0;
  const notGoingCount =
    rsvps?.notGoing?.length ?? event.rsvpCounts?.notGoing ?? 0;

  // Detect user's current RSVP (best effort from rsvps list)
  let myRsvpStatus: string | null = null;
  if (rsvps && currentUser) {
    const allRsvps = [
      ...(rsvps.going ?? []),
      ...(rsvps.maybe ?? []),
      ...(rsvps.notGoing ?? []),
      ...(rsvps.pending ?? []),
    ];
    const mine = allRsvps.find(
      (r: any) =>
        r.membership?.person?.displayName && r.membershipId
    );
    if (mine) myRsvpStatus = mine.status;
  }

  const statusColors: Record<string, string> = {
    DRAFT: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
    PUBLISHED: "bg-green-600/20 text-green-400 border-green-600/30",
    CANCELLED: "bg-red-600/20 text-red-400 border-red-600/30",
    COMPLETED: "bg-[#374151]/50 text-[#9ca3af] border-[#4b5563]/30",
  };

  function getName(r: RsvpEntry) {
    return r.membership?.person?.displayName ?? r.guestName ?? "Unknown";
  }

  function downloadIcs() {
    window.open(
      `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/events/${eventId}/ics`,
      "_blank"
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-[#9ca3af] hover:text-white"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{event.title}</h1>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                statusColors[event.status] ?? "bg-[#374151]/50 text-[#9ca3af]"
              }`}
            >
              {event.status}
            </span>
          </div>
          <p className="text-[#9ca3af] text-sm mt-0.5">
            {dateStr} at {timeStr} · {locationStr}
          </p>
        </div>
      </div>

      {/* Game Config Summary */}
      <div className="px-5 mt-3">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-1">
            ${event.buyInAmount} buy-in
          </span>
          {event.rebuyAmount > 0 && (
            <span className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-1">
              ${event.rebuyAmount} rebuy
              {event.rebuyLimit ? ` (max ${event.rebuyLimit})` : ""}
            </span>
          )}
          {event.addOnAllowed && (
            <span className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-1">
              ${event.addOnAmount} add-on
            </span>
          )}
          {event.bountyEnabled && (
            <span className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-1">
              ${event.bountyAmount} bounty
            </span>
          )}
          <span className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-1">
            Max {event.maxPlayers} players
          </span>
        </div>
      </div>

      {event.description && (
        <p className="px-5 mt-3 text-sm text-[#9ca3af]">{event.description}</p>
      )}

      {/* RSVP Section */}
      <div className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
          Your RSVP
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { status: "GOING" as RsvpStatus, label: "Going", icon: "✅" },
              { status: "MAYBE" as RsvpStatus, label: "Maybe", icon: "❓" },
              {
                status: "NOT_GOING" as RsvpStatus,
                label: "Not Going",
                icon: "❌",
              },
            ] as const
          ).map(({ status, label, icon }) => {
            const isActive = myRsvpStatus === status;
            return (
              <button
                key={status}
                onClick={() => rsvpMutation.mutate(status)}
                disabled={rsvpMutation.isPending}
                className={`py-4 rounded-xl text-center transition-all ${
                  isActive
                    ? status === "GOING"
                      ? "bg-green-600/30 border-2 border-green-500"
                      : status === "MAYBE"
                        ? "bg-yellow-600/30 border-2 border-yellow-500"
                        : "bg-red-600/30 border-2 border-red-500"
                    : "bg-[#1a1a1a] border-2 border-transparent hover:border-[#374151]"
                }`}
              >
                <span className="text-2xl block">{icon}</span>
                <span className="text-xs mt-1 block">{label}</span>
              </button>
            );
          })}
        </div>

        {/* RSVP Counts */}
        <div className="mt-3 flex items-center gap-3 text-sm">
          <button
            onClick={() =>
              setExpandedGroup(expandedGroup === "going" ? null : "going")
            }
            className="text-green-400 hover:underline"
          >
            {goingCount} Going
          </button>
          <span className="text-[#4b5563]">·</span>
          <button
            onClick={() =>
              setExpandedGroup(expandedGroup === "maybe" ? null : "maybe")
            }
            className="text-yellow-400 hover:underline"
          >
            {maybeCount} Maybe
          </button>
          <span className="text-[#4b5563]">·</span>
          <button
            onClick={() =>
              setExpandedGroup(
                expandedGroup === "notGoing" ? null : "notGoing"
              )
            }
            className="text-red-400 hover:underline"
          >
            {notGoingCount} Not Going
          </button>
        </div>

        {/* Expanded names list */}
        {expandedGroup && rsvps && (
          <div className="mt-2 bg-[#1a1a1a] rounded-xl p-3">
            <p className="text-xs text-[#6b7280] mb-2 uppercase">
              {expandedGroup === "going"
                ? "Going"
                : expandedGroup === "maybe"
                  ? "Maybe"
                  : "Not Going"}
            </p>
            {(rsvps[expandedGroup] ?? []).length === 0 ? (
              <p className="text-xs text-[#4b5563]">No one yet</p>
            ) : (
              <div className="space-y-1">
                {(rsvps[expandedGroup] ?? []).map((r: RsvpEntry) => (
                  <p key={r.id} className="text-sm">
                    {getName(r)}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add to Calendar */}
      {myRsvpStatus === "GOING" && (
        <div className="px-5 mt-4">
          <button
            onClick={downloadIcs}
            className="w-full py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-sm font-medium hover:bg-[#222] transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Add to Calendar
          </button>
        </div>
      )}

      {/* Admin Section */}
      {isOwnerOrAdmin && (
        <div className="px-5 mt-6">
          <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
            Admin Actions
          </h2>
          <div className="space-y-2">
            {event.status === "DRAFT" && (
              <button
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className="w-full py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {publishMutation.isPending ? "Publishing..." : "Publish Event"}
              </button>
            )}

            <button
              onClick={() =>
                navigate(`/events/${eventId}/edit`)
              }
              className="w-full py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white font-medium hover:bg-[#222] transition-colors"
            >
              Edit Event
            </button>

            <button
              onClick={() => setShowInviteModal(true)}
              className="w-full py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white font-medium hover:bg-[#222] transition-colors"
            >
              Invite Guests
            </button>

            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full py-3 rounded-xl bg-red-900/30 border border-red-600/40 text-red-400 font-medium hover:bg-red-900/50 transition-colors"
            >
              Cancel Event
            </button>
          </div>

          {/* Payout Calculator */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[#9ca3af] mb-3">
              Payout Calculator
            </h3>
            <div className="flex items-center gap-3 mb-3">
              <label className="text-sm text-[#6b7280]">Players:</label>
              <input
                type="number"
                value={payoutPlayerCount}
                onChange={(e) =>
                  setPayoutPlayerCount(
                    Math.max(2, Number(e.target.value))
                  )
                }
                min={2}
                max={100}
                className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
              />
              {payoutQuery.data && (
                <span className="text-sm text-green-400">
                  Prize Pool: ${payoutQuery.data.prizePool}
                </span>
              )}
            </div>

            {payoutQuery.data?.payout && (
              <div className="bg-[#1a1a1a] rounded-xl overflow-hidden">
                <div className="grid grid-cols-3 px-4 py-2 bg-[#222] text-xs text-[#6b7280] font-medium">
                  <span>Position</span>
                  <span className="text-center">Percentage</span>
                  <span className="text-right">Amount</span>
                </div>
                {payoutQuery.data.payout.map((p: any) => (
                  <div
                    key={p.position}
                    className={`grid grid-cols-3 px-4 py-2.5 border-t border-[#2a2a2a] ${
                      p.position === 1
                        ? "bg-yellow-600/10 text-yellow-300"
                        : ""
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {p.position === 1
                        ? "1st"
                        : p.position === 2
                          ? "2nd"
                          : p.position === 3
                            ? "3rd"
                            : `${p.position}th`}
                    </span>
                    <span className="text-sm text-center">{p.percentage}%</span>
                    <span className="text-sm text-right font-medium">
                      ${p.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">Cancel Event?</h3>
            <p className="text-sm text-[#9ca3af] mb-6">
              This will notify all RSVPs that the event has been cancelled. This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 rounded-xl bg-[#2a2a2a] text-white font-medium"
              >
                Keep Event
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium disabled:opacity-50"
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Guest Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Invite Guest</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-[#9ca3af] block mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Guest name"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-[#4b5563] focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-sm text-[#9ca3af] block mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-[#4b5563] focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 py-3 rounded-xl bg-[#2a2a2a] text-white font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => inviteMutation.mutate()}
                disabled={
                  inviteMutation.isPending || !inviteName || !invitePhone
                }
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium disabled:opacity-50"
              >
                {inviteMutation.isPending ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
