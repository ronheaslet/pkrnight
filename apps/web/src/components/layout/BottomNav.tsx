import { useNavigate, useLocation } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import { useCircuits } from "../../hooks/useCircuits";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useGameStore((s) => s.currentUser);
  const currentClub = useGameStore((s) => s.currentClub);
  const activeGameId = useGameStore((s) => s.activeGameId);
  const unreadCount = useGameStore((s) => s.unreadCount);

  const clubId = currentUser?.clubId || currentClub?.id;
  const primaryColor = currentClub?.primaryColor || "#22c55e";
  const inactiveColor = "#6b7280";

  const { data: myCircuits } = useCircuits();
  const firstCircuit = myCircuits?.[0];

  const isOwnerOrAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.roles.includes("OWNER") ||
    currentUser?.roles.includes("ADMIN");

  const tabs = [
    {
      id: "calendar",
      label: "Calendar",
      icon: "\uD83D\uDCC5",
      path: `/clubs/${clubId}/calendar`,
    },
    {
      id: "standings",
      label: "Standings",
      icon: "\uD83C\uDFC6",
      path: `/clubs/${clubId}/standings`,
    },
    {
      id: "live",
      label: "Live",
      icon: "\uD83D\uDFE2",
      path: activeGameId ? `/game/${activeGameId}` : `/clubs/${clubId}`,
    },
    ...(firstCircuit
      ? [
          {
            id: "circuit",
            label: "Circuit",
            icon: "\uD83C\uDF10",
            path: `/circuits/${firstCircuit.id}`,
          },
        ]
      : [
          {
            id: "trophies",
            label: "Trophies",
            icon: "\uD83C\uDFC5",
            path: `/clubs/${clubId}/trophies`,
          },
        ]),
    {
      id: "chat",
      label: "Chat",
      icon: "\uD83D\uDCAC",
      path: `/clubs/${clubId}/chat`,
    },
    ...(isOwnerOrAdmin
      ? [
          {
            id: "admin",
            label: "Admin",
            icon: "\u2699\uFE0F",
            path: `/clubs/${clubId}/settings`,
          },
        ]
      : []),
  ];

  function isActive(tab: (typeof tabs)[0]): boolean {
    if (tab.id === "live") {
      return (
        location.pathname.startsWith("/game/") ||
        location.pathname === `/clubs/${clubId}`
      );
    }
    if (tab.id === "admin") {
      return (
        location.pathname.startsWith(`/clubs/${clubId}/settings`) ||
        location.pathname.startsWith(`/clubs/${clubId}/accounting`)
      );
    }
    if (tab.id === "circuit") {
      return location.pathname.startsWith("/circuits/");
    }
    return location.pathname.startsWith(tab.path);
  }

  if (!clubId) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#2a2a2a] z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around px-1 pt-1.5 pb-1">
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center flex-1 py-1 transition-colors"
            >
              <span className="relative text-xl leading-none mb-0.5">
                {tab.icon}
                {tab.id === "chat" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              <span
                className="text-[10px] leading-tight"
                style={{ color: active ? primaryColor : inactiveColor }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
