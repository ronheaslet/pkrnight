import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameState } from "../hooks/useGameState";
import { useGameStore } from "../store/gameStore";
import DealerDisplay from "../components/game/DealerDisplay";
import api from "../lib/api";

export default function DealerPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { gameState, isLoading } = useGameState(gameId!);
  const currentUser = useGameStore((s) => s.currentUser);

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Wake Lock not supported or permission denied
      }
    }
    requestWakeLock();
    return () => {
      wakeLock?.release();
    };
  }, []);

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

  if (isLoading || !gameState) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

  const canControl =
    currentUser?.isSuperAdmin ||
    currentUser?.permissions.includes("pause_timer") ||
    currentUser?.roles.includes("OWNER") ||
    currentUser?.roles.includes("ADMIN") ||
    false;

  return (
    <DealerDisplay
      gameState={gameState}
      onPause={canControl ? handlePause : undefined}
      onResume={canControl ? handleResume : undefined}
      onExit={() => navigate(`/game/${gameId}`)}
    />
  );
}
