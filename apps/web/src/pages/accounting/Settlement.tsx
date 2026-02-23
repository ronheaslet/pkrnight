import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import MethodSelector from "../../components/accounting/MethodSelector";
import StatCard from "../../components/accounting/StatCard";

// ---------- Types ----------

interface Session {
  sessionId: string;
  personId: string;
  displayName: string;
  avatarUrl: string | null;
  buyInPaid: boolean;
  rebuys: number;
  addOns: number;
  totalPaid: number;
  payout: number;
  finishPosition: number | null;
  bountiesWon: number;
  bountiesLost: number;
  net: number;
}

interface Transaction {
  id: string;
  personId: string | null;
  amount: number;
  method: string;
  description: string;
  createdAt: string;
}

interface Settlement {
  gameId: string;
  status: string;
  financialLockedAt: string | null;
  sessions: Session[];
  transactionsByType: {
    buyIns: Transaction[];
    rebuys: Transaction[];
    addOns: Transaction[];
    payouts: Transaction[];
    bounties: Transaction[];
    expenses: Transaction[];
  };
  prizePool: number;
  totalRebuys: number;
  totalAddOns: number;
  moneyIn: number;
  variance: number;
  netPrizePool: number;
  totalExpenses: number;
  totalBounties: number;
  totalPayouts: number;
  isBalanced: boolean;
}

interface GameEvent {
  id: string;
  title: string;
  startsAt: string;
  buyInAmount: number;
  status: string;
  game?: { id: string; status: string } | null;
  rsvpCounts?: { going: number };
}

// ---------- Settlement Page ----------

export default function Settlement() {
  const { clubId } = useParams<{ clubId: string }>();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // Load recent games
  const eventsQuery = useQuery({
    queryKey: ["accountingEvents", clubId],
    queryFn: () => api.get(`/clubs/${clubId}/events/upcoming`).then((r) => r.data),
    enabled: !!clubId,
    staleTime: 30_000,
  });

  if (!selectedGameId) {
    return <GameSelector clubId={clubId!} events={eventsQuery.data} isLoading={eventsQuery.isLoading} onSelect={setSelectedGameId} />;
  }

  return <SettlementView clubId={clubId!} gameId={selectedGameId} onBack={() => setSelectedGameId(null)} />;
}

// ---------- Game Selector ----------

function GameSelector({
  clubId,
  events,
  isLoading,
  onSelect,
}: {
  clubId: string;
  events: GameEvent[] | undefined;
  isLoading: boolean;
  onSelect: (gameId: string) => void;
}) {
  // Also try to get completed events and active games
  const allEventsQuery = useQuery({
    queryKey: ["allClubEvents", clubId],
    queryFn: async () => {
      try {
        const res = await api.get(`/clubs/${clubId}/events/upcoming`);
        return res.data as GameEvent[];
      } catch {
        return [];
      }
    },
    enabled: !!clubId,
    staleTime: 30_000,
  });

  // Combine and deduplicate — show games that have a game record
  const allEvents: GameEvent[] = [...(events ?? []), ...(allEventsQuery.data ?? [])];
  const uniqueMap = new Map<string, GameEvent>();
  allEvents.forEach((e) => uniqueMap.set(e.id, e));
  const gameEvents = Array.from(uniqueMap.values());

  // For mock data: always show mock-game-001
  const hasMockGame = gameEvents.some((e) => e.game?.id === "mock-game-001");

  return (
    <div className="px-5">
      <h2 className="text-lg font-bold text-white mb-4">Tonight's Settlement</h2>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-[#6b7280]">Loading games...</div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mock game card for demo */}
          {!hasMockGame && (
            <button
              onClick={() => onSelect("mock-game-001")}
              className="w-full text-left bg-[#1a1a1a] border-2 border-green-600/40 rounded-xl p-4 hover:bg-[#222] transition-colors relative"
            >
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <span className="text-green-400 text-[10px] font-medium">COMPLETED</span>
              </div>
              <h3 className="text-white font-medium">Last Week's Game</h3>
              <p className="text-[#6b7280] text-xs mt-1">9 players &middot; $600 prize pool</p>
              <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
                Balanced
              </span>
            </button>
          )}

          {gameEvents
            .filter((e) => e.game)
            .map((ev) => {
              const isActive = ev.game?.status === "ACTIVE" || ev.game?.status === "PAUSED";
              const isCompleted = ev.game?.status === "COMPLETED";
              const d = new Date(ev.startsAt);
              const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

              return (
                <button
                  key={ev.id}
                  onClick={() => onSelect(ev.game!.id)}
                  className={`w-full text-left bg-[#1a1a1a] border rounded-xl p-4 hover:bg-[#222] transition-colors ${
                    isActive ? "border-2 border-green-600/40" : "border-[#2a2a2a]"
                  }`}
                >
                  {isActive && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                      </span>
                      <span className="text-green-400 text-[10px] font-medium">Live Game</span>
                    </div>
                  )}
                  <h3 className="text-white font-medium">{ev.title}</h3>
                  <p className="text-[#6b7280] text-xs mt-1">
                    {dateStr} &middot; {ev.rsvpCounts?.going ?? 0} players &middot; ${ev.buyInAmount} buy-in
                  </p>
                  <span
                    className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isCompleted
                        ? "bg-green-500/20 text-green-400"
                        : isActive
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {isCompleted ? "Completed" : isActive ? "In Progress" : ev.game?.status}
                  </span>
                </button>
              );
            })}

          {gameEvents.filter((e) => e.game).length === 0 && !hasMockGame && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 text-center">
              <p className="text-[#6b7280] text-sm">No games found. Start a game from an event first.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Settlement View ----------

function SettlementView({
  clubId,
  gameId,
  onBack,
}: {
  clubId: string;
  gameId: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: settlement, isLoading } = useQuery({
    queryKey: ["settlement", clubId, gameId],
    queryFn: () =>
      api.get(`/accounting/${clubId}/games/${gameId}/settlement`).then((r) => r.data as Settlement),
    staleTime: 10_000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["settlement", clubId, gameId] });

  if (isLoading || !settlement) {
    return (
      <div className="px-5">
        <button onClick={onBack} className="text-[#9ca3af] text-sm mb-4 flex items-center gap-1 hover:text-white">
          <span>&larr;</span> Back to games
        </button>
        <div className="text-center py-12 animate-pulse text-[#6b7280]">Loading settlement...</div>
      </div>
    );
  }

  return (
    <div className="px-5 space-y-4">
      <button onClick={onBack} className="text-[#9ca3af] text-sm flex items-center gap-1 hover:text-white transition-colors">
        <span>&larr;</span> Back to games
      </button>

      {/* Card 1: Buy-In Tracker */}
      <BuyInTracker clubId={clubId} gameId={gameId} settlement={settlement} onRefresh={refresh} />

      {/* Card 2: Variance Line */}
      <VarianceLine settlement={settlement} />

      {/* Card 3: Bounty Tracker (only if bounties exist) */}
      {settlement.totalBounties > 0 || settlement.transactionsByType.bounties.length > 0 ? (
        <BountyTracker clubId={clubId} gameId={gameId} settlement={settlement} onRefresh={refresh} />
      ) : null}

      {/* Card 4: Expenses */}
      <ExpenseCard clubId={clubId} gameId={gameId} settlement={settlement} onRefresh={refresh} />

      {/* Card 5: Payout Calculator + Tracker */}
      <PayoutCard clubId={clubId} gameId={gameId} settlement={settlement} onRefresh={refresh} />

      {/* Card 6: Settlement Lock */}
      <SettlementLock clubId={clubId} gameId={gameId} settlement={settlement} onRefresh={refresh} />
    </div>
  );
}

// ---------- Card 1: Buy-In Tracker ----------

function BuyInTracker({
  clubId,
  gameId,
  settlement,
  onRefresh,
}: {
  clubId: string;
  gameId: string;
  settlement: Settlement;
  onRefresh: () => void;
}) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(false);

  async function handleAction(action: string, personId: string) {
    setLoading(true);
    try {
      await api.post(`/accounting/${clubId}/games/${gameId}/${action}`, {
        personId,
        amount: action === "buy-in" ? 50 : 50, // use game config
        method,
      });
      onRefresh();
    } catch {
      // error handling
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a2a]">
        <h3 className="text-white font-semibold text-sm">Buy-In Tracker</h3>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-4 py-2 text-[10px] text-[#6b7280] uppercase tracking-wide border-b border-[#2a2a2a]">
        <span>Player</span>
        <span className="text-right w-14">Buy-In</span>
        <span className="text-right w-12">Rebuys</span>
        <span className="text-right w-12">Add-On</span>
        <span className="text-right w-16">Total</span>
        <span className="text-center w-8">Paid</span>
      </div>

      {/* Rows */}
      {settlement.sessions.map((s) => (
        <div key={s.sessionId}>
          <button
            onClick={() => setExpandedRow(expandedRow === s.sessionId ? null : s.sessionId)}
            className="w-full grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-4 py-2.5 items-center hover:bg-[#222] transition-colors text-sm"
          >
            <span className="text-white text-left truncate">{s.displayName}</span>
            <span className="text-[#9ca3af] text-right w-14">${s.totalPaid - s.rebuys * 50 - s.addOns * 50}</span>
            <span className="text-[#9ca3af] text-right w-12">{s.rebuys > 0 ? `x${s.rebuys}` : "-"}</span>
            <span className="text-[#9ca3af] text-right w-12">{s.addOns > 0 ? "Yes" : "-"}</span>
            <span className="text-white font-medium text-right w-16">${s.totalPaid}</span>
            <span className="text-center w-8">
              {s.buyInPaid ? (
                <span className="text-green-400">&#10003;</span>
              ) : (
                <span className="text-red-400">&#10005;</span>
              )}
            </span>
          </button>

          {/* Expanded actions */}
          {expandedRow === s.sessionId && (
            <div className="px-4 pb-3 pt-1 bg-[#151515] border-t border-[#2a2a2a]">
              <div className="mb-2">
                <MethodSelector value={method} onChange={setMethod} />
              </div>
              <div className="flex gap-2">
                {!s.buyInPaid && (
                  <button
                    onClick={() => handleAction("buy-in", s.personId)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    Mark Paid
                  </button>
                )}
                <button
                  onClick={() => handleAction("rebuy", s.personId)}
                  disabled={loading}
                  className="px-3 py-1.5 bg-yellow-600 text-white text-xs rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                >
                  Add Rebuy
                </button>
                <button
                  onClick={() => handleAction("add-on", s.personId)}
                  disabled={loading}
                  className="px-3 py-1.5 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  Add Add-On
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- Card 2: Variance Line ----------

function VarianceLine({ settlement }: { settlement: Settlement }) {
  const isBalanced = settlement.variance === 0;

  return (
    <div
      className={`rounded-xl p-5 border-2 ${
        isBalanced ? "bg-green-900/20 border-green-600/40" : "bg-red-900/20 border-red-600/40"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-3 flex-wrap flex-1">
          <StatCard label="Total Collected" value={`$${settlement.moneyIn}`} />
          <StatCard label="Expected" value={`$${settlement.moneyIn}`} />
          <StatCard label="Variance" value={`$${settlement.variance}`} />
        </div>
      </div>
      <div
        className={`text-center py-2 rounded-lg text-sm font-semibold ${
          isBalanced ? "bg-green-600/30 text-green-300" : "bg-red-600/30 text-red-300"
        }`}
      >
        {isBalanced
          ? "\u2705 Balanced"
          : `\u26A0\uFE0F $${Math.abs(settlement.variance)} unaccounted \u2014 check buy-ins`}
      </div>
    </div>
  );
}

// ---------- Card 3: Bounty Tracker ----------

function BountyTracker({
  clubId,
  gameId,
  settlement,
  onRefresh,
}: {
  clubId: string;
  gameId: string;
  settlement: Settlement;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [winnerId, setWinnerId] = useState("");
  const [loserId, setLoserId] = useState("");
  const [bountyAmount, setBountyAmount] = useState("10");
  const [loading, setLoading] = useState(false);

  async function handleRecordBounty() {
    if (!winnerId || !loserId) return;
    setLoading(true);
    try {
      await api.post(`/accounting/${clubId}/games/${gameId}/bounty`, {
        winnerId,
        loserId,
        amount: Number(bountyAmount),
      });
      setShowForm(false);
      setWinnerId("");
      setLoserId("");
      onRefresh();
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Bounty Tracker</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-green-400 hover:text-green-300"
        >
          + Record Bounty
        </button>
      </div>

      {settlement.transactionsByType.bounties.length > 0 ? (
        <div className="divide-y divide-[#2a2a2a]">
          {settlement.transactionsByType.bounties.map((b) => (
            <div key={b.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="text-white">{b.description}</span>
              <span className="text-purple-400 font-medium">${b.amount}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-4 text-center text-[#6b7280] text-sm">No bounties recorded</div>
      )}

      <div className="px-4 py-2.5 border-t border-[#2a2a2a] flex justify-between text-xs text-[#6b7280]">
        <span>Total bounties: ${settlement.totalBounties}</span>
      </div>

      {showForm && (
        <div className="px-4 py-3 border-t border-[#2a2a2a] bg-[#151515] space-y-3">
          <select
            value={winnerId}
            onChange={(e) => setWinnerId(e.target.value)}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="">Select winner...</option>
            {settlement.sessions.map((s) => (
              <option key={s.personId} value={s.personId}>{s.displayName}</option>
            ))}
          </select>
          <select
            value={loserId}
            onChange={(e) => setLoserId(e.target.value)}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="">Whose bounty...</option>
            {settlement.sessions.map((s) => (
              <option key={s.personId} value={s.personId}>{s.displayName}</option>
            ))}
          </select>
          <input
            type="number"
            value={bountyAmount}
            onChange={(e) => setBountyAmount(e.target.value)}
            placeholder="Amount"
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
          />
          <button
            onClick={handleRecordBounty}
            disabled={loading || !winnerId || !loserId}
            className="w-full py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Recording..." : "Record Bounty"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Card 4: Expenses ----------

function ExpenseCard({
  clubId,
  gameId,
  settlement,
  onRefresh,
}: {
  clubId: string;
  gameId: string;
  settlement: Settlement;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("EXPENSE_FOOD");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(false);

  const categoryOptions = [
    { value: "EXPENSE_FOOD", label: "Food & Drinks", icon: "\uD83C\uDF55" },
    { value: "EXPENSE_VENUE", label: "Venue", icon: "\uD83C\uDFE0" },
    { value: "EXPENSE_EQUIPMENT", label: "Equipment", icon: "\uD83C\uDCCF" },
    { value: "EXPENSE_OTHER", label: "Other", icon: "\uD83D\uDCE6" },
  ];

  async function handleAddExpense() {
    if (!description || !amount) return;
    setLoading(true);
    try {
      await api.post(`/accounting/${clubId}/games/${gameId}/expense`, {
        category,
        description,
        amount: Number(amount),
        method,
      });
      setShowForm(false);
      setDescription("");
      setAmount("");
      onRefresh();
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Expenses</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-green-400 hover:text-green-300"
        >
          + Add Expense
        </button>
      </div>

      {settlement.transactionsByType.expenses.length > 0 ? (
        <div className="divide-y divide-[#2a2a2a]">
          {settlement.transactionsByType.expenses.map((exp) => {
            const catOption = categoryOptions.find((c) => exp.description.toLowerCase().includes("pizza") || exp.description.toLowerCase().includes("food") ? c.value === "EXPENSE_FOOD" : false) || categoryOptions[3];
            return (
              <div key={exp.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <span className="text-lg">{catOption.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate">{exp.description}</p>
                  <p className="text-[#6b7280] text-[10px]">{exp.method}</p>
                </div>
                <span className="text-red-400 font-medium">-${exp.amount}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-4 text-center text-[#6b7280] text-sm">No expenses recorded</div>
      )}

      <div className="px-4 py-2.5 border-t border-[#2a2a2a] text-xs text-[#6b7280]">
        Total expenses: ${settlement.totalExpenses}
      </div>

      {showForm && (
        <div className="px-4 py-3 border-t border-[#2a2a2a] bg-[#151515] space-y-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
          >
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
          />
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
          />
          <MethodSelector value={method} onChange={setMethod} />
          <button
            onClick={handleAddExpense}
            disabled={loading || !description || !amount}
            className="w-full py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Expense"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Card 5: Payout Calculator + Tracker ----------

function PayoutCard({
  clubId,
  gameId,
  settlement,
  onRefresh,
}: {
  clubId: string;
  gameId: string;
  settlement: Settlement;
  onRefresh: () => void;
}) {
  const playerCount = settlement.sessions.length;
  const netPrize = settlement.netPrizePool;

  // Compute payout structure
  function getPayoutStructure(count: number): { position: number; percentage: number; amount: number }[] {
    let tiers: number[];
    if (count <= 1) return [];
    else if (count <= 6) tiers = [100];
    else if (count <= 9) tiers = [65, 35];
    else if (count <= 14) tiers = [50, 30, 20];
    else if (count <= 19) tiers = [45, 27, 18, 10];
    else tiers = [40, 25, 15, 11, 9];

    return tiers.map((pct, i) => ({
      position: i + 1,
      percentage: pct,
      amount: Math.round((netPrize * pct) / 100),
    }));
  }

  const payoutStructure = getPayoutStructure(playerCount);
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [payoutMethods, setPayoutMethods] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  // Match sessions to finish positions
  const sessionsByPosition = settlement.sessions
    .filter((s) => s.finishPosition !== null)
    .sort((a, b) => (a.finishPosition ?? 99) - (b.finishPosition ?? 99));

  const allPayoutsPaid = payoutStructure.every((ps) => {
    const paidPayout = settlement.transactionsByType.payouts.find(
      (p) => {
        const session = sessionsByPosition.find((s) => s.finishPosition === ps.position);
        return session && p.personId === session.personId;
      }
    );
    return !!paidPayout;
  });

  async function handleMarkPaid(personId: string, positionAmount: number) {
    setLoading(personId);
    try {
      await api.post(`/accounting/${clubId}/games/${gameId}/payout`, {
        personId,
        amount: positionAmount,
        method: payoutMethods[personId] || "cash",
      });
      onRefresh();
    } catch {
      // error
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a2a]">
        <h3 className="text-white font-semibold text-sm">Payout Calculator & Tracker</h3>
      </div>

      {/* Calculator */}
      <div className="px-4 py-3 border-b border-[#2a2a2a]">
        <div className="flex justify-between text-xs text-[#6b7280] mb-2">
          <span>{playerCount} players</span>
          <span>Net prize pool: ${netPrize}</span>
        </div>
        <div className="space-y-1.5">
          {payoutStructure.map((ps) => {
            const overrideVal = overrides[ps.position];
            return (
              <div key={ps.position} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-[#6b7280]">#{ps.position}</span>
                <span className="text-[#6b7280] w-10">{ps.percentage}%</span>
                <input
                  type="number"
                  value={overrideVal ?? ps.amount}
                  onChange={(e) => setOverrides({ ...overrides, [ps.position]: e.target.value })}
                  className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-white text-sm text-right"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Tracker */}
      <div className="divide-y divide-[#2a2a2a]">
        {payoutStructure.map((ps) => {
          const session = sessionsByPosition.find((s) => s.finishPosition === ps.position);
          const isPaid = settlement.transactionsByType.payouts.some(
            (p) => session && p.personId === session.personId
          );
          const overrideVal = overrides[ps.position];
          const payoutAmount = overrideVal !== undefined ? Number(overrideVal) : ps.amount;

          return (
            <div key={ps.position} className="px-4 py-2.5 flex items-center gap-3 text-sm">
              <span className="text-[#6b7280] w-8">#{ps.position}</span>
              <span className="text-white flex-1 truncate">
                {session?.displayName ?? "TBD"}
              </span>
              <span className="text-green-400 font-medium w-16 text-right">${payoutAmount}</span>
              {isPaid ? (
                <span className="text-green-400 w-16 text-center text-xs">&#10003; Paid</span>
              ) : session ? (
                <div className="flex items-center gap-1">
                  <select
                    value={payoutMethods[session.personId] || "cash"}
                    onChange={(e) => setPayoutMethods({ ...payoutMethods, [session.personId]: e.target.value })}
                    className="bg-[#0f0f0f] border border-[#2a2a2a] rounded text-[10px] text-white px-1 py-0.5"
                  >
                    <option value="cash">Cash</option>
                    <option value="venmo">Venmo</option>
                    <option value="zelle">Zelle</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    onClick={() => handleMarkPaid(session.personId, payoutAmount)}
                    disabled={loading === session.personId}
                    className="px-2 py-1 bg-green-600 text-white text-[10px] rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading === session.personId ? "..." : "Pay"}
                  </button>
                </div>
              ) : (
                <span className="text-[#6b7280] text-xs w-16 text-center">--</span>
              )}
            </div>
          );
        })}
      </div>

      {allPayoutsPaid && payoutStructure.length > 0 && (
        <div className="px-4 py-3 bg-green-900/20 border-t border-green-600/30 text-center text-green-400 text-sm font-medium">
          &#10003; All payouts confirmed
        </div>
      )}
    </div>
  );
}

// ---------- Card 6: Settlement Lock ----------

function SettlementLock({
  clubId,
  gameId,
  settlement,
  onRefresh,
}: {
  clubId: string;
  gameId: string;
  settlement: Settlement;
  onRefresh: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const isLocked = !!settlement.financialLockedAt;

  async function handleLock() {
    setLoading(true);
    try {
      await api.post(`/accounting/${clubId}/games/${gameId}/lock`);
      setShowConfirm(false);
      onRefresh();
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
      <h3 className="text-white font-semibold text-sm mb-3">Settlement Lock</h3>

      {isLocked ? (
        <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 text-center">
          <p className="text-green-400 font-medium text-sm">&#128274; Settlement Locked</p>
          <p className="text-[#6b7280] text-xs mt-1">
            Locked at {new Date(settlement.financialLockedAt!).toLocaleString()}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2.5 h-2.5 rounded-full ${settlement.isBalanced ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-[#9ca3af] text-sm">
              {settlement.isBalanced ? "Balanced and ready to lock" : "Unbalanced \u2014 resolve variance first"}
            </span>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={!settlement.isBalanced}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
              settlement.isBalanced
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-[#2a2a2a] text-[#6b7280] cursor-not-allowed"
            }`}
            title={!settlement.isBalanced ? "Resolve variance before locking" : undefined}
          >
            &#128274; Lock Settlement
          </button>
        </>
      )}

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 w-full max-w-sm">
            <h3 className="text-white font-bold mb-3">Lock Settlement?</h3>
            <p className="text-[#9ca3af] text-sm mb-4">
              This will lock the financials for this game. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] rounded-lg text-sm text-white hover:bg-[#333] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLock}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 rounded-lg text-sm text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Locking..." : "Confirm Lock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
