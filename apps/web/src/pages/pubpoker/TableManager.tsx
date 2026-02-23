import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useGameStore } from "../../store/gameStore";
import api from "../../lib/api";
import {
  isMockPubClub,
  mockTables,
  mockBalanceSuggestions,
  MOCK_PUB_GAME_ID,
} from "../../lib/pubPokerMocks";

interface Seat {
  seatNumber: number;
  personId: string | null;
  displayName: string | null;
}

interface Table {
  tableNumber: number;
  seats: Seat[];
}

interface BalanceSuggestion {
  id: string;
  playerName: string;
  fromTable: number;
  toTable: number;
  personId: string;
}

export default function TableManager() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const currentUser = useGameStore((s) => s.currentUser);
  const [gameId, setGameId] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [showBalance, setShowBalance] = useState(false);
  const [suggestions, setSuggestions] = useState<BalanceSuggestion[]>([]);
  const [selectedMoves, setSelectedMoves] = useState<Set<string>>(new Set());
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const isOwnerOrAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.roles.includes("OWNER") ||
    currentUser?.roles.includes("ADMIN");

  // Redirect non-admins
  useEffect(() => {
    if (currentUser && !isOwnerOrAdmin) {
      navigate(`/clubs/${clubId}`, { replace: true });
    }
  }, [currentUser, isOwnerOrAdmin, clubId, navigate]);

  // Find game + load tables
  useEffect(() => {
    if (!clubId) return;
    if (isMockPubClub(clubId)) {
      setGameId(MOCK_PUB_GAME_ID);
      setTables(mockTables);
      return;
    }
    api
      .get(`/clubs/${clubId}/events?upcoming=true`)
      .then((r) => {
        const events = r.data ?? [];
        if (events.length > 0 && events[0].gameId) {
          setGameId(events[0].gameId);
          loadTables(clubId, events[0].gameId);
        }
      })
      .catch(() => {});
  }, [clubId]);

  // Poll every 30s
  useEffect(() => {
    if (!clubId || !gameId || isMockPubClub(clubId)) return;
    const interval = setInterval(() => loadTables(clubId, gameId), 30_000);
    return () => clearInterval(interval);
  }, [clubId, gameId]);

  function loadTables(cId: string, gId: string) {
    api
      .get(`/pub/clubs/${cId}/games/${gId}/tables`)
      .then((r) => setTables(r.data ?? []))
      .catch(() => {});
  }

  function showToastMessage(message: string, type: "success" | "error") {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  const balanceMutation = useMutation({
    mutationFn: () => {
      if (isMockPubClub(clubId!)) {
        return Promise.resolve({ data: mockBalanceSuggestions } as any);
      }
      return api.post(`/pub/clubs/${clubId}/games/${gameId}/tables/balance`);
    },
    onSuccess: (res) => {
      const data = (res.data ?? []) as BalanceSuggestion[];
      setSuggestions(data);
      setSelectedMoves(new Set(data.map((s) => s.id)));
      setShowBalance(true);
    },
  });

  const applyMovesMutation = useMutation({
    mutationFn: (moveIds: string[]) => {
      if (isMockPubClub(clubId!)) {
        return Promise.resolve({ data: { applied: moveIds.length } } as any);
      }
      return api.post(
        `/pub/clubs/${clubId}/games/${gameId}/tables/approve-moves`,
        { moveIds }
      );
    },
    onSuccess: () => {
      showToastMessage("Moves applied successfully", "success");
      setShowBalance(false);
      if (clubId && gameId && !isMockPubClub(clubId)) {
        loadTables(clubId, gameId);
      }
    },
  });

  const finalTableMutation = useMutation({
    mutationFn: () => {
      if (isMockPubClub(clubId!)) {
        // Merge all players into table 1
        const allOccupied = tables.flatMap((t) =>
          t.seats.filter((s) => s.personId)
        );
        setTables([
          {
            tableNumber: 1,
            seats: Array.from({ length: 9 }, (_, i) => ({
              seatNumber: i + 1,
              personId: allOccupied[i]?.personId ?? null,
              displayName: allOccupied[i]?.displayName ?? null,
            })),
          },
        ]);
        return Promise.resolve({ data: { success: true } } as any);
      }
      return api.post(
        `/pub/clubs/${clubId}/games/${gameId}/tables/final-table`
      );
    },
    onSuccess: () => {
      showToastMessage("Final table created!", "success");
      setShowFinalConfirm(false);
      if (clubId && gameId && !isMockPubClub(clubId)) {
        loadTables(clubId, gameId);
      }
    },
  });

  const totalPlayers = tables.reduce(
    (sum, t) => sum + t.seats.filter((s) => s.personId).length,
    0
  );

  if (!gameId) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold mb-2">No active game</p>
          <p className="text-[#6b7280] text-sm">Start a game to manage tables.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Table Manager</h1>
        <button
          onClick={() => balanceMutation.mutate()}
          disabled={balanceMutation.isPending}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
        >
          {balanceMutation.isPending ? "Balancing..." : "Balance Tables"}
        </button>
      </div>

      {/* Table grid */}
      <div className="px-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tables.map((table) => {
          const occupied = table.seats.filter((s) => s.personId).length;
          return (
            <div
              key={table.tableNumber}
              className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Table {table.tableNumber}</h3>
                <span className="text-xs text-[#9ca3af]">
                  {occupied}/9
                </span>
              </div>

              {/* Oval seat layout */}
              <div className="relative w-full" style={{ paddingBottom: "60%" }}>
                <div className="absolute inset-0">
                  {/* Oval table background */}
                  <div className="absolute inset-4 bg-green-900/20 border border-green-800/30 rounded-full" />

                  {/* 9 seats around the oval */}
                  {table.seats.map((seat) => {
                    const angle =
                      ((seat.seatNumber - 1) / 9) * Math.PI * 2 - Math.PI / 2;
                    const left = 50 + 42 * Math.cos(angle);
                    const top = 50 + 42 * Math.sin(angle);
                    return (
                      <div
                        key={seat.seatNumber}
                        className="absolute flex flex-col items-center"
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        {seat.personId ? (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{
                              backgroundColor: getAvatarColor(
                                seat.displayName ?? ""
                              ),
                            }}
                          >
                            {(seat.displayName ?? "?").charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full border-2 border-dashed border-[#374151]" />
                        )}
                        <span className="text-[8px] text-[#6b7280] mt-0.5 max-w-12 truncate text-center">
                          {seat.displayName ?? ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Final table button */}
      {tables.length > 1 && totalPlayers <= 9 && (
        <div className="px-5 mt-4">
          <button
            onClick={() => setShowFinalConfirm(true)}
            className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-medium transition-colors"
          >
            Move to Final Table
          </button>
        </div>
      )}

      {/* Balance modal */}
      {showBalance && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
          onClick={() => setShowBalance(false)}
        >
          <div
            className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </div>
            <div className="px-6 pb-8">
              <h2 className="text-lg font-bold mb-4">Balance Suggestions</h2>
              {suggestions.length === 0 ? (
                <p className="text-[#6b7280] text-sm">
                  Tables are already balanced!
                </p>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 p-3 bg-[#0f0f0f] rounded-xl cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMoves.has(s.id)}
                        onChange={() => {
                          setSelectedMoves((prev) => {
                            const next = new Set(prev);
                            if (next.has(s.id)) next.delete(s.id);
                            else next.add(s.id);
                            return next;
                          });
                        }}
                        className="w-5 h-5 rounded bg-[#374151] accent-green-500"
                      />
                      <span className="text-sm">
                        Move <strong>{s.playerName}</strong> from Table{" "}
                        {s.fromTable} → Table {s.toTable}
                      </span>
                    </label>
                  ))}
                  <button
                    onClick={() =>
                      applyMovesMutation.mutate(Array.from(selectedMoves))
                    }
                    disabled={
                      selectedMoves.size === 0 || applyMovesMutation.isPending
                    }
                    className="w-full mt-3 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-40"
                  >
                    {applyMovesMutation.isPending
                      ? "Applying..."
                      : `Apply ${selectedMoves.size} Move${selectedMoves.size !== 1 ? "s" : ""}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Final table confirm modal */}
      {showFinalConfirm && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
          onClick={() => setShowFinalConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-[#1a1a1a] rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-3">Final Table</h2>
            <p className="text-sm text-[#9ca3af] mb-4">
              Move all {totalPlayers} remaining players to Table 1 and close all
              other tables?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinalConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm text-[#9ca3af] bg-[#0f0f0f] hover:bg-[#222] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => finalTableMutation.mutate()}
                disabled={finalTableMutation.isPending}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 transition-colors disabled:opacity-40"
              >
                {finalTableMutation.isPending ? "Moving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg z-50 text-sm font-medium ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

function getAvatarColor(name: string): string {
  const colors = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
