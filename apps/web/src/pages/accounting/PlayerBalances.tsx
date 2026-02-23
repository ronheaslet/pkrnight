import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import StatCard from "../../components/accounting/StatCard";
import MethodSelector from "../../components/accounting/MethodSelector";
import { useGameStore } from "../../store/gameStore";

// ---------- Types ----------

interface PlayerBalance {
  id: string;
  personId: string;
  displayName: string;
  avatarUrl: string | null;
  balance: number;
  lastSettledAt: string | null;
  debtAgeDays: number;
}

// ---------- Component ----------

export default function PlayerBalances() {
  const { clubId } = useParams<{ clubId: string }>();
  const queryClient = useQueryClient();
  const currentUser = useGameStore((s) => s.currentUser);

  const isOwnerOrAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.roles.includes("OWNER") ||
    currentUser?.roles.includes("ADMIN") ||
    currentUser?.permissions.includes("manage_money");

  // Settlement modal state
  const [settleTarget, setSettleTarget] = useState<PlayerBalance | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleMethod, setSettleMethod] = useState("cash");
  const [settling, setSettling] = useState(false);

  // Fetch balances
  const balancesQuery = useQuery({
    queryKey: ["playerBalances", clubId],
    queryFn: () => api.get(`/accounting/${clubId}/balances`).then((r) => r.data as PlayerBalance[]),
    enabled: !!clubId,
    staleTime: 30_000,
  });

  const balances = balancesQuery.data ?? [];
  const positiveBalances = balances.filter((b) => b.balance > 0);
  const negativeBalances = balances.filter((b) => b.balance < 0);

  const positiveTotal = positiveBalances.reduce((s, b) => s + b.balance, 0);
  const negativeTotal = negativeBalances.reduce((s, b) => s + Math.abs(b.balance), 0);

  // Sort by largest absolute value first
  const sorted = [...balances].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  // ---------- Handlers ----------

  function openSettle(player: PlayerBalance) {
    setSettleTarget(player);
    setSettleAmount(String(Math.abs(player.balance)));
    setSettleMethod("cash");
  }

  async function handleSettle() {
    if (!settleTarget || !settleAmount) return;
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) return;

    setSettling(true);
    try {
      await api.post(`/accounting/${clubId}/balances/${settleTarget.personId}/settle`, {
        amount: amt,
        method: settleMethod,
      });
      setSettleTarget(null);
      queryClient.invalidateQueries({ queryKey: ["playerBalances", clubId] });
    } catch {
      // silent
    } finally {
      setSettling(false);
    }
  }

  function getDaysColor(days: number) {
    if (days <= 30) return "text-[#6b7280]";
    if (days <= 60) return "text-yellow-400";
    return "text-red-400";
  }

  // ---------- Loading / Error ----------

  if (balancesQuery.isLoading) {
    return (
      <div className="px-5 py-8">
        <div className="animate-pulse space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 h-24 bg-[#1a1a1a] rounded-xl" />
            <div className="flex-1 h-24 bg-[#1a1a1a] rounded-xl" />
          </div>
          <div className="h-64 bg-[#1a1a1a] rounded-xl" />
        </div>
      </div>
    );
  }

  if (balancesQuery.isError) {
    return (
      <div className="px-5 py-8 text-center text-[#9ca3af]">
        Failed to load player balances. Please try again.
      </div>
    );
  }

  return (
    <div className="px-5 space-y-4">
      {/* Summary header */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        <div className="flex-1 min-w-[140px]">
          <StatCard
            label="Club Owes Players"
            value={`${positiveBalances.length} · $${positiveTotal.toLocaleString()}`}
            deltaColor="green"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <StatCard
            label="Players Owe Club"
            value={`${negativeBalances.length} · $${negativeTotal.toLocaleString()}`}
            deltaColor="red"
          />
        </div>
      </div>

      {/* Balance table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-[#2a2a2a] text-[#6b7280] text-xs uppercase tracking-wide">
          <span>Player</span>
          <span className="text-right">Balance</span>
          <span className="text-right">Last Settled</span>
          <span className="text-right">Days</span>
          <span className="text-right">Actions</span>
        </div>

        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-[#6b7280] text-sm">
            All balances are settled.
          </div>
        ) : (
          sorted.map((player) => {
            const isPositive = player.balance > 0;
            const isZero = player.balance === 0;
            const lastSettled = player.lastSettledAt
              ? new Date(player.lastSettledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "Never";

            return (
              <div
                key={player.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-3 border-b border-[#2a2a2a]/50 items-center"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xs text-white font-medium shrink-0">
                    {player.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-sm truncate">{player.displayName}</span>
                </div>

                <span className={`text-sm font-semibold text-right ${
                  isZero ? "text-[#6b7280]" : isPositive ? "text-green-400" : "text-red-400"
                }`}>
                  {isZero ? "Settled" : isPositive ? `+ $${player.balance.toLocaleString()}` : `- $${Math.abs(player.balance).toLocaleString()}`}
                </span>

                <span className="text-[#6b7280] text-xs text-right">{lastSettled}</span>

                <span className={`text-xs text-right ${getDaysColor(player.debtAgeDays)}`}>
                  {player.debtAgeDays}d
                </span>

                <div className="text-right">
                  {isOwnerOrAdmin && !isZero && (
                    <button
                      onClick={() => openSettle(player)}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Settle
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Settlement Modal */}
      {settleTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 w-full max-w-sm">
            <h3 className="text-white font-bold mb-3">Settle — {settleTarget.displayName}</h3>

            <div className={`text-center py-3 mb-4 rounded-lg ${
              settleTarget.balance > 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            }`}>
              <p className="text-xs text-[#6b7280] mb-1">
                {settleTarget.balance > 0 ? "Club owes player" : "Player owes club"}
              </p>
              <p className="text-2xl font-bold">${Math.abs(settleTarget.balance).toLocaleString()}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[#6b7280] text-xs block mb-1">Settlement Amount</label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
                  min={0}
                />
              </div>

              <div>
                <label className="text-[#6b7280] text-xs block mb-1">Method</label>
                <MethodSelector value={settleMethod} onChange={setSettleMethod} />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setSettleTarget(null)}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] rounded-lg text-sm text-white hover:bg-[#333] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSettle}
                disabled={settling || !settleAmount || parseFloat(settleAmount) <= 0}
                className="flex-1 px-4 py-2 bg-green-600 rounded-lg text-sm text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {settling ? "Settling..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
