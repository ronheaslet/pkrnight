import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";

type NotificationType =
  | "INVITE"
  | "RESULTS"
  | "TROPHY"
  | "ANNOUNCEMENT"
  | "REMINDER"
  | "CHIP_VALUE_CHANGE"
  | "RSVP_CONFIRMATION"
  | "DUES_REMINDER"
  | "GAME_START"
  | "SYSTEM";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, string>;
}

const TYPE_ICONS: Record<NotificationType, string> = {
  INVITE: "\uD83D\uDCC5",
  RESULTS: "\uD83C\uDFC6",
  TROPHY: "\uD83E\uDD47",
  ANNOUNCEMENT: "\uD83D\uDCE2",
  REMINDER: "\u23F0",
  CHIP_VALUE_CHANGE: "\uD83C\uDFB0",
  RSVP_CONFIRMATION: "\u2705",
  DUES_REMINDER: "\uD83D\uDCB0",
  GAME_START: "\uD83D\uDFE2",
  SYSTEM: "\u2699\uFE0F",
};

const FILTER_TABS: { label: string; value: NotificationType | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Invites", value: "INVITE" },
  { label: "Results", value: "RESULTS" },
  { label: "Trophies", value: "TROPHY" },
  { label: "Announcements", value: "ANNOUNCEMENT" },
  { label: "Reminders", value: "REMINDER" },
];

// Mock data
const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "INVITE", title: "Game Night This Friday", body: "You've been invited to Friday Night Poker at Ron's place. $50 buy-in, 8 PM start. RSVP now to secure your seat.", isRead: false, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), data: { eventId: "evt-001" } },
  { id: "n2", type: "RESULTS", title: "Tournament Results Posted", body: "The results from last Saturday's tournament are in. You finished 3rd out of 12 players and earned 85 points!", isRead: false, createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), data: { gameId: "game-001" } },
  { id: "n3", type: "ANNOUNCEMENT", title: "New Club Rules Update", body: "Starting next month, we're implementing a new late registration policy. Players can join up to 30 minutes after the first hand is dealt.", isRead: false, createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
  { id: "n4", type: "TROPHY", title: "Achievement Unlocked!", body: "Congratulations! You've earned the 'Iron Man' trophy for playing in 10 consecutive events.", isRead: true, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), data: { clubId: "mock-club-001" } },
  { id: "n5", type: "REMINDER", title: "Game Tomorrow", body: "Don't forget — you RSVP'd to tomorrow's tournament. Doors open at 7 PM.", isRead: true, createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString() },
  { id: "n6", type: "DUES_REMINDER", title: "Monthly Dues Due", body: "Your February club dues of $25 are due by the 28th. Please submit payment to avoid suspension.", isRead: true, createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
  { id: "n7", type: "GAME_START", title: "Game Starting Now!", body: "The Friday Night Poker tournament is starting. Head to the table!", isRead: true, createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), data: { gameId: "game-002" } },
  { id: "n8", type: "RSVP_CONFIRMATION", title: "RSVP Confirmed", body: "You're confirmed for Saturday's Deep Stack event. See you there!", isRead: true, createdAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString() },
];

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Inbox() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useGameStore((s) => s.currentUser);
  const currentClub = useGameStore((s) => s.currentClub);
  const setUnreadCount = useGameStore((s) => s.setUnreadCount);

  const clubId = currentUser?.clubId || currentClub?.id;
  const primaryColor = currentClub?.primaryColor || "#22c55e";

  const [activeFilter, setActiveFilter] = useState<NotificationType | "ALL">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  // Fetch notifications from API (falls back to mock)
  useQuery({
    queryKey: ["inbox", clubId],
    queryFn: () => api.get(`/inbox?clubId=${clubId}`).then((r) => r.data),
    enabled: !!clubId,
    staleTime: 30_000,
    onSuccess: (data: Notification[]) => {
      if (data && data.length > 0) setLocalNotifications(data);
    },
    onError: () => {
      // keep mock data on error
    },
  } as any);

  const unreadCount = localNotifications.filter((n) => !n.isRead).length;

  // Mark single notification as read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/inbox/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox"] }),
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => api.post("/inbox/read-all", { clubId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox"] }),
  });

  // Delete notification
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/inbox/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox"] }),
  });

  const handleMarkAllRead = () => {
    setLocalNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    markAllReadMutation.mutate();
  };

  const handleTapNotification = useCallback(
    (notification: Notification) => {
      if (expandedId === notification.id) {
        setExpandedId(null);
        return;
      }

      // Mark as read
      if (!notification.isRead) {
        setLocalNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(Math.max(0, unreadCount - 1));
        markReadMutation.mutate(notification.id);
      }

      setExpandedId(notification.id);
    },
    [expandedId, unreadCount, markReadMutation, setUnreadCount]
  );

  const handleNavigate = (notification: Notification) => {
    const data = notification.data || {};
    switch (notification.type) {
      case "INVITE":
        if (data.eventId) navigate(`/events/${data.eventId}`);
        break;
      case "RESULTS":
        if (data.gameId) navigate(`/results/games/${data.gameId}`);
        break;
      case "TROPHY":
        navigate(`/clubs/${data.clubId || clubId}/trophies`);
        break;
      case "CHIP_VALUE_CHANGE":
      case "GAME_START":
        if (data.gameId) navigate(`/game/${data.gameId}`);
        break;
    }
  };

  const handleDelete = (id: string) => {
    const notification = localNotifications.find((n) => n.id === id);
    if (notification && !notification.isRead) {
      setUnreadCount(Math.max(0, unreadCount - 1));
    }
    setLocalNotifications((prev) => prev.filter((n) => n.id !== id));
    setSwipingId(null);
    setSwipeOffset(0);
    deleteMutation.mutate(id);
  };

  // Touch handlers for swipe to delete
  const handleTouchStart = (id: string, x: number) => {
    setSwipingId(id);
    setTouchStartX(x);
    setSwipeOffset(0);
  };

  const handleTouchMove = (x: number) => {
    if (!swipingId) return;
    const diff = touchStartX - x;
    setSwipeOffset(Math.max(0, Math.min(diff, 100)));
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 60 && swipingId) {
      setSwipeOffset(100);
    } else {
      setSwipeOffset(0);
      setSwipingId(null);
    }
  };

  const filtered =
    activeFilter === "ALL"
      ? localNotifications
      : localNotifications.filter((n) => n.type === activeFilter);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Inbox</h1>
          {unreadCount > 0 && (
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: primaryColor }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === tab.value
                  ? "text-white"
                  : "bg-[#1a1a1a] text-[#9ca3af] hover:bg-[#222]"
              }`}
              style={
                activeFilter === tab.value
                  ? { backgroundColor: primaryColor }
                  : undefined
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24">
          <span className="text-5xl mb-4">{"\uD83D\uDCED"}</span>
          <p className="text-white font-medium">All caught up!</p>
          <p className="text-[#6b7280] text-sm mt-1">
            Notifications will appear here
          </p>
        </div>
      ) : (
        <div className="px-5 space-y-2">
          {filtered.map((notification) => {
            const isExpanded = expandedId === notification.id;
            const isSwiping = swipingId === notification.id;
            const offset = isSwiping ? swipeOffset : 0;
            const hasAction = ["INVITE", "RESULTS", "TROPHY", "CHIP_VALUE_CHANGE", "GAME_START"].includes(notification.type);

            return (
              <div key={notification.id} className="relative overflow-hidden rounded-xl">
                {/* Delete button behind */}
                <div className="absolute inset-y-0 right-0 w-24 bg-red-600 flex items-center justify-center rounded-r-xl">
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="text-white text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>

                {/* Notification card */}
                <div
                  className={`relative rounded-xl p-4 transition-transform ${
                    notification.isRead ? "bg-[#1a1a1a]" : "bg-[#1a2a1a]"
                  }`}
                  style={{
                    borderLeft: notification.isRead
                      ? "3px solid transparent"
                      : `3px solid ${primaryColor}`,
                    transform: `translateX(-${offset}px)`,
                  }}
                  onClick={() => handleTapNotification(notification)}
                  onTouchStart={(e) =>
                    handleTouchStart(notification.id, e.touches[0].clientX)
                  }
                  onTouchMove={(e) => handleTouchMove(e.touches[0].clientX)}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="flex gap-3">
                    {/* Type icon */}
                    <span className="text-xl flex-shrink-0 mt-0.5">
                      {TYPE_ICONS[notification.type]}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`text-sm leading-tight ${
                            notification.isRead ? "font-normal" : "font-bold"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <span className="text-[10px] text-[#6b7280] whitespace-nowrap flex-shrink-0">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>

                      <p
                        className={`text-xs text-[#9ca3af] mt-1 ${
                          isExpanded ? "" : "line-clamp-2"
                        }`}
                      >
                        {notification.body}
                      </p>

                      {/* Expanded actions */}
                      {isExpanded && hasAction && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate(notification);
                          }}
                          className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                          style={{ backgroundColor: primaryColor }}
                        >
                          View Details
                        </button>
                      )}
                    </div>

                    {/* Collapse button when expanded */}
                    {isExpanded && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(null);
                        }}
                        className="text-[#6b7280] hover:text-white flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
