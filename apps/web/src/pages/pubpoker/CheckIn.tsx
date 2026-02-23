import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useGameStore } from "../../store/gameStore";
import api from "../../lib/api";
import jsQR from "jsqr";
import {
  isMockPubClub,
  mockCheckinSearchResults,
  mockCheckinResult,
  MOCK_PUB_GAME_ID,
} from "../../lib/pubPokerMocks";

type Tab = "qr" | "search" | "walkin";

interface SearchResult {
  personId: string;
  displayName: string;
  role: string;
  isCheckedIn: boolean;
}

interface CheckinResponse {
  success: boolean;
  playerName: string;
  tableNumber: number;
  seatNumber: number;
}

export default function CheckIn() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const currentUser = useGameStore((s) => s.currentUser);
  const [tab, setTab] = useState<Tab>("search");
  const [gameId, setGameId] = useState<string | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [showCheckedInList, setShowCheckedInList] = useState(false);
  const [checkedInPlayers, setCheckedInPlayers] = useState<string[]>([]);

  const isOwnerOrAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.roles.includes("OWNER") ||
    currentUser?.roles.includes("ADMIN");

  // Find tonight's game
  useEffect(() => {
    if (!clubId) return;
    if (isMockPubClub(clubId)) {
      setGameId(MOCK_PUB_GAME_ID);
      setCheckedInCount(7);
      return;
    }
    api
      .get(`/clubs/${clubId}/events?upcoming=true`)
      .then((r) => {
        const events = r.data ?? [];
        if (events.length > 0 && events[0].gameId) {
          setGameId(events[0].gameId);
        }
      })
      .catch(() => {});
  }, [clubId]);

  // Redirect non-admins
  useEffect(() => {
    if (currentUser && !isOwnerOrAdmin) {
      navigate(`/clubs/${clubId}`, { replace: true });
    }
  }, [currentUser, isOwnerOrAdmin, clubId, navigate]);

  if (!gameId) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold mb-2">No active game tonight</p>
          <p className="text-[#6b7280] text-sm">
            Create an event to start checking in players.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col pb-20">
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-bold">Check In Players</h1>
      </div>

      {/* Tab buttons */}
      <div className="px-5 pb-4 flex gap-2">
        {(
          [
            { id: "qr" as Tab, label: "QR Scan", icon: "\uD83D\uDCF7" },
            { id: "search" as Tab, label: "Name Search", icon: "\uD83D\uDD0D" },
            { id: "walkin" as Tab, label: "Walk-In", icon: "\uD83D\uDEB6" },
          ] as const
        ).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
              tab === id
                ? "bg-green-600 text-white"
                : "bg-[#1a1a1a] text-[#9ca3af] border border-[#2a2a2a]"
            }`}
          >
            <span className="mr-1">{icon}</span> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 px-5">
        {tab === "qr" && (
          <QrScanTab
            clubId={clubId!}
            gameId={gameId}
            onCheckin={(name) => {
              setCheckedInCount((c) => c + 1);
              setCheckedInPlayers((p) => [...p, name]);
            }}
          />
        )}
        {tab === "search" && (
          <NameSearchTab
            clubId={clubId!}
            gameId={gameId}
            onCheckin={(name) => {
              setCheckedInCount((c) => c + 1);
              setCheckedInPlayers((p) => [...p, name]);
            }}
          />
        )}
        {tab === "walkin" && (
          <WalkInTab
            clubId={clubId!}
            gameId={gameId}
            onCheckin={(name) => {
              setCheckedInCount((c) => c + 1);
              setCheckedInPlayers((p) => [...p, name]);
            }}
          />
        )}
      </div>

      {/* Bottom strip */}
      <div
        className="fixed bottom-16 left-0 right-0 bg-[#1a1a1a] border-t border-[#2a2a2a] px-5 py-3 cursor-pointer"
        onClick={() => setShowCheckedInList(!showCheckedInList)}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {checkedInCount} players checked in tonight
          </span>
          <svg
            className={`w-4 h-4 text-[#9ca3af] transition-transform ${
              showCheckedInList ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </div>
        {showCheckedInList && checkedInPlayers.length > 0 && (
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {checkedInPlayers.map((name, i) => (
              <div
                key={i}
                className="text-sm text-[#9ca3af] py-1 border-b border-[#2a2a2a] last:border-0"
              >
                {name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- QR Scan Tab ----

function QrScanTab({
  clubId,
  gameId,
  onCheckin,
}: {
  clubId: string;
  gameId: string;
  onCheckin: (name: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const checkinMutation = useMutation({
    mutationFn: (personId: string) => {
      if (isMockPubClub(clubId)) {
        return Promise.resolve({
          data: { ...mockCheckinResult, playerName: "Scanned Player" },
        } as any);
      }
      return api.post(`/pub/clubs/${clubId}/games/${gameId}/checkin/qr`, {
        personId,
      });
    },
    onSuccess: (res) => {
      const data = res.data as CheckinResponse;
      setScanResult({
        type: "success",
        message: `${data.playerName} checked in → Table ${data.tableNumber}, Seat ${data.seatNumber}`,
      });
      onCheckin(data.playerName);
      setTimeout(() => {
        setScanResult(null);
        scanningRef.current = true;
      }, 2000);
    },
    onError: () => {
      setScanResult({ type: "error", message: "Player not found" });
      setTimeout(() => {
        setScanResult(null);
        scanningRef.current = true;
      }, 2000);
    },
  });

  const scanFrame = useCallback(() => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !scanningRef.current
    )
      return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code?.data) {
      scanningRef.current = false;
      // Extract personId from QR URL
      const match = code.data.match(
        /(?:checkin|join)\/([a-zA-Z0-9_-]+)/
      );
      const personId = match ? match[1] : code.data;
      checkinMutation.mutate(personId);
    }
  }, [checkinMutation]);

  useEffect(() => {
    let animFrame: number;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        function loop() {
          scanFrame();
          animFrame = requestAnimationFrame(loop);
        }
        loop();
      } catch {
        setCameraError("Camera access required for QR scanning.");
      }
    }
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [scanFrame]);

  if (cameraError) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl p-6 text-center">
        <p className="text-[#6b7280] text-sm">{cameraError}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full rounded-xl bg-black"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Scan result overlay */}
      {scanResult && (
        <div
          className={`absolute inset-0 rounded-xl flex items-center justify-center ${
            scanResult.type === "success"
              ? "bg-green-600/80"
              : "bg-red-600/80"
          }`}
        >
          <p className="text-white text-lg font-bold text-center px-4">
            {scanResult.message}
          </p>
        </div>
      )}
    </div>
  );
}

// ---- Name Search Tab ----

function NameSearchTab({
  clubId,
  gameId,
  onCheckin,
}: {
  clubId: string;
  gameId: string;
  onCheckin: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [checkedRow, setCheckedRow] = useState<string | null>(null);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      if (isMockPubClub(clubId)) {
        const filtered = mockCheckinSearchResults.filter((r) =>
          r.displayName.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered.length > 0 ? filtered : mockCheckinSearchResults);
        return;
      }
      try {
        const res = await api.get(
          `/pub/clubs/${clubId}/games/${gameId}/checkin/search?name=${encodeURIComponent(query)}`
        );
        setResults(res.data ?? []);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, clubId, gameId]);

  const checkinMutation = useMutation({
    mutationFn: (personId: string) => {
      if (isMockPubClub(clubId)) {
        return Promise.resolve({ data: mockCheckinResult } as any);
      }
      return api.post(`/pub/clubs/${clubId}/games/${gameId}/checkin/member`, {
        personId,
      });
    },
    onSuccess: (res, personId) => {
      const data = res.data as CheckinResponse;
      setCheckedRow(personId);
      setCheckinMessage(
        `Checked in → Table ${data.tableNumber}, Seat ${data.seatNumber}`
      );
      onCheckin(data.playerName);
      setTimeout(() => {
        setCheckedRow(null);
        setCheckinMessage(null);
      }, 2000);
    },
  });

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search player name..."
        autoFocus
        className="w-full px-4 py-3 bg-[#1a1a1a] rounded-xl text-base border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#4b5563]"
      />

      <div className="mt-3 space-y-1">
        {results.map((r) => (
          <div
            key={r.personId}
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
              checkedRow === r.personId
                ? "bg-green-900/30 border border-green-600/40"
                : "bg-[#1a1a1a] border border-[#2a2a2a]"
            }`}
            style={{ minHeight: 56 }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-base font-medium block truncate">
                {r.displayName}
              </span>
              <span
                className={`text-[10px] uppercase ${
                  r.role === "ADMIN" || r.role === "OWNER"
                    ? "text-green-500"
                    : "text-[#6b7280]"
                }`}
              >
                {r.role}
              </span>
            </div>
            {checkedRow === r.personId ? (
              <span className="text-green-400 text-xs font-medium ml-2">
                {checkinMessage}
              </span>
            ) : r.isCheckedIn ? (
              <span className="text-[#6b7280] text-xs ml-2">
                Already in
              </span>
            ) : (
              <button
                onClick={() => checkinMutation.mutate(r.personId)}
                disabled={checkinMutation.isPending}
                className="ml-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-40"
              >
                Check In
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Walk-In Tab ----

function WalkInTab({
  clubId,
  gameId,
  onCheckin,
}: {
  clubId: string;
  gameId: string;
  onCheckin: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const walkinMutation = useMutation({
    mutationFn: (tempName: string) => {
      if (isMockPubClub(clubId)) {
        return Promise.resolve({
          data: { ...mockCheckinResult, playerName: tempName },
        } as any);
      }
      return api.post(`/pub/clubs/${clubId}/games/${gameId}/checkin/walkin`, {
        tempName,
      });
    },
    onSuccess: (res) => {
      const data = res.data as CheckinResponse;
      setSuccessMessage(
        `Walk-in added → Table ${data.tableNumber}, Seat ${data.seatNumber}. They can claim their account after the game.`
      );
      onCheckin(data.playerName);
      setName("");
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  return (
    <div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Player Name"
        className="w-full px-4 py-3 bg-[#1a1a1a] rounded-xl text-base border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#4b5563]"
      />
      <button
        onClick={() => name.trim() && walkinMutation.mutate(name.trim())}
        disabled={!name.trim() || walkinMutation.isPending}
        className="w-full mt-3 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-40"
      >
        {walkinMutation.isPending ? "Adding..." : "Add Walk-In"}
      </button>

      {successMessage && (
        <div className="mt-3 p-3 bg-green-900/30 border border-green-600/40 rounded-xl">
          <p className="text-green-400 text-sm">{successMessage}</p>
        </div>
      )}
    </div>
  );
}
