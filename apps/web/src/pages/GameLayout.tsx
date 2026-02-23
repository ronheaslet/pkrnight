import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useGameState } from "../hooks/useGameState";
import { useGameStore } from "../store/gameStore";
import Clock from "../components/game/Clock";
import LiveHUD from "../components/game/LiveHUD";
import api from "../lib/api";

export default function GameLayout() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { gameState, isLoading, error } = useGameState(gameId!);
  const currentUser = useGameStore((s) => s.currentUser);
  const setGameState = useGameStore((s) => s.setGameState);

  // Sync game state to Zustand for child components
  useEffect(() => {
    if (gameState) {
      setGameState(gameState);
    }
  }, [gameState, setGameState]);

  const canControl =
    currentUser?.isSuperAdmin ||
    currentUser?.permissions.includes("pause_timer") ||
    currentUser?.roles.includes("OWNER") ||
    currentUser?.roles.includes("ADMIN") ||
    false;

  const handlePause = async () => {
    try {
      await api.post(`/games/${gameId}/pause`);
    } catch (e) {
      console.error("Failed to pause:", e);
    }
  };

  const handleResume = async () => {
    try {
      await api.post(`/games/${gameId}/resume`);
    } catch (e) {
      console.error("Failed to resume:", e);
    }
  };

  const handleAdvanceLevel = async () => {
    try {
      await api.post(`/games/${gameId}/advance-level`);
    } catch (e) {
      console.error("Failed to advance level:", e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white text-lg animate-pulse">Loading game...</div>
      </div>
    );
  }

  if (error || !gameState) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-red-400 text-lg">Game not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      {/* Demo mode banner */}
      {gameState.game.id.startsWith("mock") && (
        <div className="bg-yellow-500/20 text-yellow-400 text-center text-xs py-1">
          Demo Mode — Mock Data
        </div>
      )}

      {/* Completed game banner */}
      {gameState.game.status === "COMPLETED" && canControl && (
        <div
          onClick={() => navigate(`/game/${gameId}/close`)}
          className="mx-4 mt-2 px-4 py-3 bg-green-900/30 border border-green-600/40 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-green-900/50 transition-colors"
        >
          <span className="text-green-400 font-medium text-sm flex-1">
            Game complete. Ready to finalize results?
          </span>
          <span className="text-green-500 text-sm font-medium">
            Close Game →
          </span>
        </div>
      )}
      {gameState.game.status === "COMPLETED" && !canControl && (
        <div className="mx-4 mt-2 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
          <span className="text-[#9ca3af] text-sm">
            Game over! Results will be posted soon.
          </span>
        </div>
      )}

      {/* Clock — top half */}
      <Clock
        gameState={gameState}
        onPause={handlePause}
        onResume={handleResume}
        onAdvanceLevel={handleAdvanceLevel}
        canControl={canControl}
      />

      {/* Live HUD — bottom half, scrollable */}
      <LiveHUD gameState={gameState} />
    </div>
  );
}
