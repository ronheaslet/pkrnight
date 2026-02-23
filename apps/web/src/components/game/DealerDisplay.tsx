import { useState, useEffect, useCallback, useRef } from "react";
import type { GameState } from "../../store/gameStore";

interface DealerDisplayProps {
  gameState: GameState;
  onPause?: () => void;
  onResume?: () => void;
  onExit: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getTimerColor(remaining: number, total: number): string {
  if (total === 0) return "#22c55e";
  const pct = remaining / total;
  if (pct > 0.25) return "#22c55e";
  if (pct > 0.1) return "#eab308";
  return "#ef4444";
}

export default function DealerDisplay({
  gameState,
  onPause,
  onResume,
  onExit,
}: DealerDisplayProps) {
  const [timeRemainingMs, setTimeRemainingMs] = useState(gameState.timeRemainingMs);
  const containerRef = useRef<HTMLDivElement>(null);

  const level = gameState.currentLevel;
  const status = gameState.game.status;
  const isPaused = status === "PAUSED";
  const levelDurationMs = (level?.durationMinutes ?? 0) * 60 * 1000;

  const calculateTimeRemaining = useCallback(() => {
    if (!level || !gameState.game.levelStartedAt) return 0;

    const levelStartedAt = new Date(gameState.game.levelStartedAt).getTime();
    const levelMs = level.durationMinutes * 60 * 1000;

    if (status === "PAUSED" && gameState.game.pausedAt) {
      const pausedAt = new Date(gameState.game.pausedAt).getTime();
      const elapsed = pausedAt - levelStartedAt - gameState.game.totalPausedMs;
      return Math.max(0, levelMs - elapsed);
    }

    if (status === "ACTIVE" || status === "BREAK") {
      const elapsed = Date.now() - levelStartedAt - gameState.game.totalPausedMs;
      return Math.max(0, levelMs - elapsed);
    }

    return gameState.timeRemainingMs;
  }, [gameState, level, status]);

  // Timer tick
  useEffect(() => {
    if (status !== "ACTIVE" && status !== "BREAK") {
      setTimeRemainingMs(calculateTimeRemaining());
      return;
    }

    const interval = setInterval(() => {
      setTimeRemainingMs(calculateTimeRemaining());
    }, 100);

    return () => clearInterval(interval);
  }, [calculateTimeRemaining, status]);

  // Request fullscreen on mount
  useEffect(() => {
    try {
      document.documentElement.requestFullscreen?.();
    } catch {
      // Fullscreen not supported
    }

    // Try to lock landscape
    try {
      (screen.orientation as any).lock?.("landscape");
    } catch {
      // Orientation lock not supported
    }

    return () => {
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
        }
      } catch {
        // Ignore
      }
    };
  }, []);

  // Wake lock
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    async function requestWakeLock() {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch {
        // Not supported
      }
    }
    requestWakeLock();
    return () => { wakeLock?.release(); };
  }, []);

  const timerColor = getTimerColor(timeRemainingMs, levelDurationMs);

  // Tap clock area to toggle pause/resume
  const handleClockTap = () => {
    if (isPaused && onResume) onResume();
    else if (!isPaused && onPause) onPause();
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black flex flex-col cursor-pointer select-none"
      style={{ touchAction: "none" }}
    >
      {/* Exit button — low opacity, top-right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
        className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center text-white/30 hover:text-white/80 text-2xl transition-colors"
        aria-label="Exit dealer display"
      >
        ✕
      </button>

      {/* Clock area — 60% of screen */}
      <div
        className="flex-[6] flex flex-col items-center justify-center"
        onClick={handleClockTap}
      >
        {/* Giant timer */}
        <div
          className="font-mono font-bold leading-none"
          style={{
            fontSize: "min(20vw, 160px)",
            color: timerColor,
          }}
        >
          {formatTime(timeRemainingMs)}
        </div>

        {/* Level + Blinds */}
        <div className="text-[#9ca3af] text-3xl font-semibold mt-4">
          LEVEL {gameState.game.currentLevel}
        </div>

        {level && !level.isBreak && (
          <div className="text-white text-4xl font-bold mt-2">
            {level.smallBlind.toLocaleString()} / {level.bigBlind.toLocaleString()}
            {level.ante > 0 && (
              <span className="text-[#9ca3af] text-2xl ml-3">
                ANTE {level.ante.toLocaleString()}
              </span>
            )}
          </div>
        )}

        {level?.isBreak && (
          <div className="text-yellow-400 text-4xl font-bold mt-2">
            {level.breakLabel ?? "BREAK"}
          </div>
        )}

        {isPaused && (
          <div className="mt-4 px-6 py-2 rounded-full bg-yellow-500/20 text-yellow-400 text-xl font-semibold uppercase tracking-widest">
            PAUSED
          </div>
        )}
      </div>

      {/* Bottom strip — 40% */}
      <div className="flex-[4] flex items-center justify-between px-8 border-t border-white/10">
        <div className="text-white text-3xl font-bold">
          {gameState.playersRemaining}
          <span className="text-[#9ca3af] text-xl ml-2">players</span>
        </div>

        <div className="text-white text-3xl font-bold">
          ${gameState.game.prizePool.toLocaleString()}
          <span className="text-[#9ca3af] text-xl ml-2">prize pool</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isPaused && onResume) onResume();
            else if (onPause) onPause();
          }}
          className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label={isPaused ? "Resume" : "Pause"}
        >
          {isPaused ? (
            <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
