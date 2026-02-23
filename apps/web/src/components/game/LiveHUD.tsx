import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GameState } from "../../store/gameStore";
import { useGameStore } from "../../store/gameStore";
import api from "../../lib/api";
import HandRankingsModal from "./HandRankingsModal";
import ToolsMenu from "../common/ToolsMenu";
import PubPokerGate from "../common/PubPokerGate";
import BonusChipBanner from "../pubpoker/BonusChipBanner";

interface LiveHUDProps {
  gameState: GameState;
}

export default function LiveHUD({ gameState }: LiveHUDProps) {
  const navigate = useNavigate();
  const currentUser = useGameStore((s) => s.currentUser);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showHandRankings, setShowHandRankings] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [editingStack, setEditingStack] = useState(false);
  const [stackInput, setStackInput] = useState("");

  const mySession = gameState.players.find(
    (p) => p.personId === currentUser?.userId
  );
  const level = gameState.currentLevel;
  const bigBlind = level?.bigBlind ?? 1;
  const activePlayers = gameState.players.filter((p) => p.status === "ACTIVE");

  const handleStackSave = async () => {
    if (!mySession) return;
    const value = parseInt(stackInput, 10);
    if (isNaN(value) || value < 0) return;

    try {
      await api.patch(
        `/games/${gameState.game.id}/sessions/${mySession.sessionId}/stack`,
        { stackValue: value }
      );
    } catch (e) {
      console.error("Failed to update stack:", e);
    }
    setEditingStack(false);
  };

  return (
    <div className="w-full bg-[#0f0f0f] text-white flex-1 overflow-y-auto">
      {/* My Stack */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="text-sm text-[#9ca3af] uppercase tracking-wider mb-1">
          My Stack
        </div>
        {editingStack ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={stackInput}
              onChange={(e) => setStackInput(e.target.value)}
              onBlur={handleStackSave}
              onKeyDown={(e) => e.key === "Enter" && handleStackSave()}
              className="bg-white/10 text-white text-3xl font-bold w-40 px-3 py-1 rounded outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
          </div>
        ) : (
          <div
            className="text-4xl font-bold cursor-pointer hover:text-green-400 transition-colors"
            onClick={() => {
              setStackInput(String(mySession?.currentStack ?? ""));
              setEditingStack(true);
            }}
          >
            {mySession?.currentStack != null
              ? mySession.currentStack.toLocaleString()
              : "--"}
          </div>
        )}

        {mySession?.currentStack != null && (
          <div className="text-[#9ca3af] text-sm mt-1">
            {Math.floor(mySession.currentStack / bigBlind)} BB deep
          </div>
        )}

        <button
          onClick={() =>
            navigate(`/game/${gameState.game.id}/scan`, {
              state: { sessionId: mySession?.sessionId },
            })
          }
          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Scan Stack
        </button>
      </div>

      {/* Game Info Strip */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="text-sm">
          <span className="text-[#9ca3af]">Level {gameState.game.currentLevel}</span>
          {level && !level.isBreak && (
            <span className="ml-2 text-white">
              {level.smallBlind}/{level.bigBlind}
              {level.ante > 0 && (
                <span className="text-[#9ca3af] ml-1">ante {level.ante}</span>
              )}
            </span>
          )}
        </div>
        <div className="text-2xl font-mono font-bold text-green-400">
          {formatTimeCompact(gameState.timeRemainingMs)}
        </div>
      </div>

      {/* Players Remaining */}
      <div
        className="px-4 py-3 border-b border-white/10 cursor-pointer"
        onClick={() => setShowPlayers(!showPlayers)}
      >
        <div className="flex items-center justify-between">
          <span className="text-base">
            {gameState.playersRemaining} players remaining
          </span>
          <svg
            className={`w-4 h-4 text-[#9ca3af] transition-transform ${
              showPlayers ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {showPlayers && (
          <div className="mt-2 space-y-1">
            {activePlayers.map((p) => (
              <div
                key={p.sessionId}
                className="flex justify-between text-sm text-[#d1d5db] py-1"
              >
                <span>{p.displayName}</span>
                <span className="text-[#9ca3af]">
                  {p.currentStack != null
                    ? p.currentStack.toLocaleString()
                    : "--"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Session Stats */}
      {mySession && (
        <div className="px-4 py-3 border-b border-white/10">
          <div className="text-sm text-[#9ca3af] uppercase tracking-wider mb-2">
            My Session
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <div className="text-white font-semibold">{mySession.rebuys}</div>
              <div className="text-[#9ca3af]">Rebuys</div>
            </div>
            <div>
              <div className="text-white font-semibold">{mySession.addOns}</div>
              <div className="text-[#9ca3af]">Add-ons</div>
            </div>
            <div>
              <div className="text-white font-semibold">
                ${mySession.totalPaid.toLocaleString()}
              </div>
              <div className="text-[#9ca3af]">Total In</div>
            </div>
          </div>
        </div>
      )}

      {/* Bonus Chip Banner — PUB_POKER only */}
      <PubPokerGate fallback={null}>
        <BonusChipBanner />
      </PubPokerGate>

      {/* Quick Actions */}
      <div className="px-4 py-4 flex gap-2">
        <button
          onClick={() => setShowHandRankings(true)}
          className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-center text-sm font-medium transition-colors"
        >
          Hand Rankings
        </button>
        <button
          onClick={() => setShowTools(true)}
          className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-center text-sm font-medium transition-colors"
        >
          Tools
        </button>
      </div>

      {/* Hand Rankings Modal */}
      <HandRankingsModal
        isOpen={showHandRankings}
        onClose={() => setShowHandRankings(false)}
      />

      {/* Tools Menu */}
      <ToolsMenu
        isOpen={showTools}
        onClose={() => setShowTools(false)}
        clubIdOverride={gameState.game.clubId}
      />
    </div>
  );
}

function formatTimeCompact(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
