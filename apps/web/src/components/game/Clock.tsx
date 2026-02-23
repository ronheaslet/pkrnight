import { useState, useEffect, useRef, useCallback } from "react";
import type { GameState } from "../../store/gameStore";
import { playLevelEndAlert, playBreakAlert, announceLevel } from "../../lib/audio";

interface ClockProps {
  gameState: GameState;
  onPause?: () => void;
  onResume?: () => void;
  onAdvanceLevel?: () => void;
  canControl?: boolean;
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
  if (pct > 0.25) return "#22c55e"; // green
  if (pct > 0.1) return "#eab308"; // yellow
  return "#ef4444"; // red
}

export default function Clock({
  gameState,
  onPause,
  onResume,
  onAdvanceLevel,
  canControl = false,
}: ClockProps) {
  const [timeRemainingMs, setTimeRemainingMs] = useState(gameState.timeRemainingMs);
  const [isLandscape, setIsLandscape] = useState(
    window.innerWidth > window.innerHeight
  );
  const levelEndFiredRef = useRef(false);
  const prevLevelRef = useRef(gameState.game.currentLevel);
  const gracePeriodRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const level = gameState.currentLevel;
  const nextLevel = gameState.nextLevel;
  const status = gameState.game.status;
  const levelDurationMs = (level?.durationMinutes ?? 0) * 60 * 1000;

  // Recalculate time from server timestamps each tick
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

  // Detect level change → announce
  useEffect(() => {
    if (gameState.game.currentLevel !== prevLevelRef.current) {
      prevLevelRef.current = gameState.game.currentLevel;
      levelEndFiredRef.current = false;

      if (level && !level.isBreak) {
        announceLevel(level.levelNumber, level.smallBlind, level.bigBlind, level.ante);
      }
      if (level?.isBreak) {
        playBreakAlert();
      }
    }
  }, [gameState.game.currentLevel, level]);

  // Timer hits 0 → alert + auto-advance after 3s
  useEffect(() => {
    if (timeRemainingMs <= 0 && !levelEndFiredRef.current && status === "ACTIVE") {
      levelEndFiredRef.current = true;
      playLevelEndAlert();

      if (onAdvanceLevel) {
        gracePeriodRef.current = setTimeout(() => {
          onAdvanceLevel();
        }, 3000);
      }
    }

    return () => {
      if (gracePeriodRef.current) clearTimeout(gracePeriodRef.current);
    };
  }, [timeRemainingMs, status, onAdvanceLevel]);

  // Wake lock
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    async function requestWakeLock() {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch {
        // Not supported or denied
      }
    }

    requestWakeLock();
    return () => {
      wakeLock?.release();
    };
  }, []);

  // Orientation detection
  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const timerColor = getTimerColor(timeRemainingMs, levelDurationMs);
  const isPulsing = timeRemainingMs > 0 && timeRemainingMs / levelDurationMs < 0.1;
  const isPaused = status === "PAUSED";

  return (
    <div
      className={`w-full bg-[#0f0f0f] flex flex-col items-center justify-center px-4 py-6 ${
        isLandscape ? "flex-row gap-8" : ""
      }`}
    >
      {/* Timer section */}
      <div className={`flex flex-col items-center ${isLandscape ? "flex-1" : ""}`}>
        {/* Giant countdown */}
        <div
          className={`font-mono font-bold leading-none select-none ${
            isPulsing ? "animate-pulse" : ""
          }`}
          style={{
            fontSize: isLandscape ? "96px" : "72px",
            color: timerColor,
          }}
        >
          {formatTime(timeRemainingMs)}
        </div>

        {/* Status badge for paused/break */}
        {(isPaused || status === "BREAK") && (
          <div className="mt-2 px-4 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-semibold uppercase tracking-wider">
            {isPaused ? "Paused" : "Break"}
          </div>
        )}
      </div>

      {/* Blind info section */}
      <div className={`flex flex-col items-center ${isLandscape ? "flex-1" : "mt-4"}`}>
        {/* Level number */}
        <div className="text-[#9ca3af] text-2xl font-semibold">
          LEVEL {gameState.game.currentLevel}
        </div>

        {/* Blinds */}
        {level && !level.isBreak && (
          <>
            <div className="text-white text-[28px] font-bold mt-1">
              BLINDS {level.smallBlind.toLocaleString()} / {level.bigBlind.toLocaleString()}
            </div>
            {level.ante > 0 && (
              <div className="text-[#9ca3af] text-xl mt-0.5">
                ANTE {level.ante.toLocaleString()}
              </div>
            )}
          </>
        )}

        {level?.isBreak && level.breakLabel && (
          <div className="text-yellow-400 text-2xl font-semibold mt-1">
            {level.breakLabel}
          </div>
        )}

        {/* Next level */}
        {nextLevel && (
          <div className="text-[#6b7280] text-lg mt-2">
            {nextLevel.isBreak
              ? `NEXT: BREAK (${nextLevel.breakLabel ?? "Break"})`
              : `NEXT: ${nextLevel.smallBlind.toLocaleString()} / ${nextLevel.bigBlind.toLocaleString()}`}
          </div>
        )}
      </div>

      {/* Bottom bar: players remaining + prize pool */}
      <div className="w-full flex justify-between items-center mt-6 px-2 text-[#9ca3af] text-base">
        <span>{gameState.playersRemaining} players remaining</span>
        <span>Prize Pool: ${gameState.game.prizePool.toLocaleString()}</span>
      </div>

      {/* Pause/Resume button */}
      {canControl && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={isPaused ? onResume : onPause}
            className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              // Play icon
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              // Pause icon
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
