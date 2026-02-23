import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../../lib/api";
import { useGameStore } from "../../store/gameStore";

interface ScanResult {
  chipCounts: Record<string, number>;
  totalValue: number;
  confidenceLevel: string;
  confidenceNote: string | null;
}

export default function ChipScanner() {
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const gameState = useGameStore((s) => s.gameState);

  const sessionId = (location.state as any)?.sessionId ?? null;
  const chipSetId = gameState?.chipSet?.id ?? null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Request camera on mount
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        setCameraError(
          "Camera access required. Please allow camera in your browser settings."
        );
      }
    }

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const imageBase64 = dataUrl.split(",")[1];

    setScanning(true);
    setError(null);

    try {
      const res = await api.post("/scanner/scan", {
        imageBase64,
        chipSetId: chipSetId ?? "mock-chipset-001",
        gameId,
        gameSessionId: sessionId,
      });
      setResult(res.data);
    } catch (e: any) {
      setError(
        e.response?.data?.message ?? "Check your connection and try again"
      );
    } finally {
      setScanning(false);
    }
  };

  const handleSaveToStack = async () => {
    if (!result || !sessionId || !gameId) return;

    try {
      await api.patch(`/games/${gameId}/sessions/${sessionId}/stack`, {
        stackValue: result.totalValue,
      });
      navigate(`/game/${gameId}`);
    } catch (e) {
      console.error("Failed to save stack:", e);
    }
  };

  const handleRetake = () => {
    setResult(null);
    setError(null);
  };

  // Camera error state
  if (cameraError) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-center p-6">
        <div className="text-red-400 text-lg text-center">{cameraError}</div>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-6 py-3 bg-white/10 rounded-lg text-sm"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Result state
  if (result) {
    const denominations = gameState?.chipSet?.denominations ?? [];
    const chipMode = gameState?.chipSet?.mode ?? "TOURNAMENT";

    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
        {/* Total value */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-[#9ca3af] text-sm uppercase tracking-wider mb-2">
            Total Stack Value
          </div>
          <div className="text-5xl font-bold">
            {chipMode === "CASH"
              ? `$${result.totalValue.toLocaleString()}`
              : result.totalValue.toLocaleString()}
          </div>

          {/* Confidence */}
          <div className="mt-3 flex items-center gap-2">
            {result.confidenceLevel === "high" && (
              <span className="text-green-400 text-sm">High confidence</span>
            )}
            {result.confidenceLevel === "medium" && (
              <span className="text-yellow-400 text-sm">Medium confidence</span>
            )}
            {result.confidenceLevel === "low" && (
              <span className="text-red-400 text-sm">Low confidence</span>
            )}
          </div>
          {result.confidenceNote && (
            <p className="text-[#6b7280] text-xs mt-1 text-center">
              {result.confidenceNote}
            </p>
          )}

          {/* Breakdown by color */}
          <div className="mt-6 w-full max-w-sm space-y-2">
            {Object.entries(result.chipCounts).map(([color, count]) => {
              const denom = denominations.find(
                (d) => d.colorName.toLowerCase() === color.toLowerCase()
              );
              const value = (denom?.value ?? 0) * count;
              const colorHex = denom?.colorHex ?? "#9ca3af";

              return (
                <div
                  key={color}
                  className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full border border-white/20"
                      style={{ backgroundColor: colorHex }}
                    />
                    <span className="capitalize">{color}</span>
                    <span className="text-[#9ca3af]">x{count}</span>
                  </div>
                  <span className="font-semibold">
                    {chipMode === "CASH"
                      ? `$${value.toLocaleString()}`
                      : value.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 flex gap-3">
          <button
            onClick={handleRetake}
            className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
          >
            Retake
          </button>
          <button
            onClick={handleSaveToStack}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
          >
            Save to My Stack
          </button>
        </div>
      </div>
    );
  }

  // Camera view
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="relative flex-1">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Guide frame overlay */}
        <div className="absolute inset-8 border-2 border-white/40 rounded-xl pointer-events-none" />

        <div className="absolute bottom-20 left-0 right-0 text-center text-white/60 text-sm px-4">
          Align chip stacks within frame
        </div>
        <div className="absolute bottom-12 left-0 right-0 text-center text-white/40 text-xs px-4">
          Stack chips in columns of 10 for best accuracy
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-900/50 text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* Capture button */}
      <div className="p-4 flex justify-center bg-black">
        <button
          onClick={handleCapture}
          disabled={scanning}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-xl text-white font-medium text-lg transition-colors"
        >
          {scanning ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Counting chips...
            </span>
          ) : (
            "Scan Chips"
          )}
        </button>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 text-white/80 rounded-lg text-sm"
      >
        Back
      </button>
    </div>
  );
}
