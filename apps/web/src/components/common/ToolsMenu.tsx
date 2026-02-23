import { useNavigate, useParams } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import { useFeatureFlags } from "../../hooks/useFeatureFlags";

interface ToolsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  clubIdOverride?: string;
}

export default function ToolsMenu({ isOpen, onClose, clubIdOverride }: ToolsMenuProps) {
  const params = useParams<{ clubId: string }>();
  const clubId = clubIdOverride ?? params.clubId;
  const navigate = useNavigate();
  const activeGameId = useGameStore((s) => s.activeGameId);
  const gameState = useGameStore((s) => s.gameState);
  const { isEnabled, isLoaded } = useFeatureFlags(clubId);

  if (!isOpen) return null;

  const isGameActive =
    !!activeGameId && gameState?.game.status === "ACTIVE";

  const tools = [
    {
      key: "hand_rankings",
      icon: "\uD83D\uDCCB",
      label: "Hand Rankings",
      route: `/clubs/${clubId}/hand-rankings`,
      locked: false,
    },
    {
      key: "pot_odds_calculator",
      icon: "\uD83E\uDDEE",
      label: "Pot Odds",
      route: `/clubs/${clubId}/pot-odds`,
      locked: isGameActive,
    },
    {
      key: "playbook",
      icon: "\uD83D\uDCD6",
      label: "Playbook",
      route: `/clubs/${clubId}/playbook`,
      locked: false,
    },
    {
      key: "in_app_holdem",
      icon: "🃏",
      label: "Hold'em",
      route: `/clubs/${clubId}/holdem`,
      locked: false,
    },
  ];

  const visibleTools = isLoaded
    ? tools.filter((t) => isEnabled(t.key) || t.locked)
    : tools;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Bottom sheet */}
      <div
        className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        <div className="px-4 pb-2">
          <h2 className="text-white text-lg font-bold">Tools</h2>
        </div>

        <div className="px-4 pb-6 space-y-2">
          {visibleTools.length === 0 ? (
            <p className="text-[#6b7280] text-sm text-center py-4">
              No tools available for this club
            </p>
          ) : (
            visibleTools.map((tool) => (
              <button
                key={tool.key}
                onClick={() => {
                  onClose();
                  navigate(tool.route);
                }}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-colors ${
                  tool.locked
                    ? "bg-[#252525] opacity-50"
                    : "bg-[#252525] hover:bg-white/10"
                }`}
              >
                <span className="text-2xl">{tool.icon}</span>
                <span className="text-white font-medium text-base flex-1 text-left">
                  {tool.label}
                </span>
                {tool.locked ? (
                  <span className="text-[#6b7280] text-lg">{"\uD83D\uDD12"}</span>
                ) : (
                  <svg
                    className="w-4 h-4 text-[#6b7280]"
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
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
