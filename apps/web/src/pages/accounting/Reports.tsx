import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import StatCard from "../../components/accounting/StatCard";
import { exportToCSV } from "../../lib/exportCsv";

// ---------- Types ----------

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
}

interface GameEvent {
  id: string;
  title: string;
  startsAt: string;
  game: { id: string; status: string } | null;
}

interface Member {
  id: string;
  personId: string;
  displayName: string;
}

// Report shapes (match mock data from API)

interface GameNightReport {
  metadata: {
    gameId: string;
    eventTitle: string;
    date: string;
    playerCount: number;
    durationMinutes: number;
    status: string;
  };
  financialSummary: {
    prizePool: number;
    totalExpenses: number;
    netPrizePool: number;
    moneyIn: number;
    variance: number;
  };
  buyIns: { personId: string; displayName: string; amount: number }[];
  rebuys: { personId: string; displayName: string; amount: number }[];
  addOns: { personId: string; displayName: string; amount: number }[];
  payouts: { personId: string; displayName: string; finishPosition: number; amount: number }[];
  bountySummary: { totalBountyPool: number; totalBountiesPaid: number; bounties: unknown[] };
  varianceStatus: string;
  treasuryImpact: { currentBalance: number };
}

interface SeasonSummary {
  seasonId: string;
  totalGames: number;
  totalPlayers: number;
  totalBuyInsCollected: number;
  totalPrizesPaid: number;
  topEarners: { personId: string; displayName: string; net: number; totalPaid: number; totalWon: number; totalRebuys: number; totalBounties: number }[];
  mostRebuys: { personId: string; displayName: string; totalRebuys: number } | null;
  mostBounties: { personId: string; displayName: string; totalBounties: number } | null;
  avgPlayersPerGame: number;
  avgPrizePool: number;
}

interface MemberSummary {
  personId: string;
  totalGames: number;
  totalBuyIns: number;
  totalRebuys: number;
  totalAddOns: number;
  totalWinnings: number;
  netPosition: number;
  bestFinish: number;
  worstFinish: number;
  avgFinish: number;
  bountiesWon: number;
  bountiesLost: number;
}

interface DuesReport {
  seasonId: string;
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  members: {
    personId: string;
    displayName: string;
    amountDue: number;
    amountPaid: number;
    remaining: number;
    isPaid: boolean;
    daysOverdue: number;
  }[];
}

type ReportType = "game" | "season" | "member" | "dues" | null;

// ---------- Report Card Grid ----------

const reportCards = [
  { type: "game" as const, icon: "\uD83C\uDFAE", title: "Game Night Report", desc: "Full financials for a single game" },
  { type: "season" as const, icon: "\uD83D\uDCC5", title: "Season Summary", desc: "All games, running totals, top performers" },
  { type: "member" as const, icon: "\uD83D\uDC64", title: "Member Summary", desc: "Individual player financial history" },
  { type: "dues" as const, icon: "\uD83D\uDCB0", title: "Dues Report", desc: "Collection status for a season" },
];

// ---------- Component ----------

export default function Reports() {
  const { clubId } = useParams<{ clubId: string }>();

  const [activeReport, setActiveReport] = useState<ReportType>(null);

  // Config state
  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedDuesSeasonId, setSelectedDuesSeasonId] = useState("");

  // Report data
  const [gameReport, setGameReport] = useState<GameNightReport | null>(null);
  const [seasonReport, setSeasonReport] = useState<SeasonSummary | null>(null);
  const [memberReport, setMemberReport] = useState<MemberSummary | null>(null);
  const [duesReport, setDuesReport] = useState<DuesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMemberName, setSelectedMemberName] = useState("");

  // Fetch seasons
  const seasonsQuery = useQuery({
    queryKey: ["seasons", clubId],
    queryFn: () => api.get(`/clubs/${clubId}/seasons`).then((r) => r.data as Season[]),
    enabled: !!clubId,
    staleTime: 60_000,
  });

  // Fetch recent games (events with completed games)
  const eventsQuery = useQuery({
    queryKey: ["events", clubId],
    queryFn: () => api.get(`/clubs/${clubId}/events/upcoming`).then((r) => r.data as GameEvent[]),
    enabled: !!clubId,
    staleTime: 60_000,
  });

  // Fetch members for member report
  const membersQuery = useQuery({
    queryKey: ["members", clubId],
    queryFn: () => api.get(`/clubs/${clubId}/members`).then((r) => r.data as Member[]),
    enabled: !!clubId,
    staleTime: 60_000,
  });

  const seasons = seasonsQuery.data ?? [];
  const events = (eventsQuery.data ?? []).filter((e) => e.game);
  const members = membersQuery.data ?? [];

  // ---------- Generate handlers ----------

  async function generateGameReport() {
    if (!selectedGameId) return;
    setLoading(true);
    try {
      const res = await api.get(`/accounting/${clubId}/reports/game/${selectedGameId}`);
      setGameReport(res.data as GameNightReport);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function generateSeasonReport() {
    if (!selectedSeasonId) return;
    setLoading(true);
    try {
      const res = await api.get(`/accounting/${clubId}/reports/season/${selectedSeasonId}`);
      setSeasonReport(res.data as SeasonSummary);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function generateMemberReport() {
    if (!selectedMemberId) return;
    setLoading(true);
    try {
      const res = await api.get(`/accounting/${clubId}/reports/member/${selectedMemberId}`);
      setMemberReport(res.data as MemberSummary);
      const m = members.find((m) => m.personId === selectedMemberId);
      setSelectedMemberName(m?.displayName ?? "Player");
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function generateDuesReport() {
    if (!selectedDuesSeasonId) return;
    setLoading(true);
    try {
      const res = await api.get(`/accounting/${clubId}/reports/dues/${selectedDuesSeasonId}`);
      setDuesReport(res.data as DuesReport);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  // ---------- CSV Export handlers ----------

  function exportGameCSV() {
    if (!gameReport) return;
    const headers = ["Player", "Buy-In", "Rebuys", "Add-Ons", "Total Paid"];
    const rows = gameReport.buyIns.map((b) => {
      const rebuys = gameReport.rebuys.filter((r) => r.personId === b.personId);
      const addOns = gameReport.addOns.filter((a) => a.personId === b.personId);
      const rebuyTotal = rebuys.reduce((s, r) => s + r.amount, 0);
      const addOnTotal = addOns.reduce((s, a) => s + a.amount, 0);
      return [b.displayName, String(b.amount), String(rebuyTotal), String(addOnTotal), String(b.amount + rebuyTotal + addOnTotal)];
    });
    exportToCSV(`game-report-${gameReport.metadata.gameId}.csv`, headers, rows);
  }

  function exportSeasonCSV() {
    if (!seasonReport) return;
    const headers = ["Rank", "Player", "Net Position", "Total Paid", "Total Won", "Rebuys", "Bounties"];
    const rows = seasonReport.topEarners.map((e, i) => [
      String(i + 1), e.displayName, String(e.net), String(e.totalPaid), String(e.totalWon), String(e.totalRebuys), String(e.totalBounties),
    ]);
    exportToCSV(`season-summary-${seasonReport.seasonId}.csv`, headers, rows);
  }

  function exportMemberCSV() {
    if (!memberReport) return;
    const headers = ["Stat", "Value"];
    const rows = [
      ["Games Played", String(memberReport.totalGames)],
      ["Total Invested", String(memberReport.totalBuyIns + memberReport.totalRebuys + memberReport.totalAddOns)],
      ["Total Winnings", String(memberReport.totalWinnings)],
      ["Net Position", String(memberReport.netPosition)],
      ["Best Finish", String(memberReport.bestFinish)],
      ["Worst Finish", String(memberReport.worstFinish)],
      ["Avg Finish", String(memberReport.avgFinish)],
    ];
    exportToCSV(`member-summary-${memberReport.personId}.csv`, headers, rows);
  }

  function exportDuesCSV() {
    if (!duesReport) return;
    const headers = ["Player", "Amount Due", "Amount Paid", "Remaining", "Status", "Days Overdue"];
    const rows = duesReport.members.map((m) => [
      m.displayName, String(m.amountDue), String(m.amountPaid), String(m.remaining), m.isPaid ? "Paid" : "Unpaid", String(m.daysOverdue),
    ]);
    exportToCSV(`dues-report-${duesReport.seasonId}.csv`, headers, rows);
  }

  // ---------- Render ----------

  return (
    <div className="px-5 space-y-4">
      {/* Report selector grid */}
      <div className="grid grid-cols-2 gap-3">
        {reportCards.map((card) => (
          <button
            key={card.type}
            onClick={() => setActiveReport(activeReport === card.type ? null : card.type)}
            className={`text-left p-4 rounded-xl border transition-colors ${
              activeReport === card.type
                ? "bg-green-600/10 border-green-600/50"
                : "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]"
            }`}
          >
            <span className="text-2xl">{card.icon}</span>
            <h3 className="text-white font-semibold text-sm mt-2">{card.title}</h3>
            <p className="text-[#6b7280] text-xs mt-0.5">{card.desc}</p>
            <span className="text-green-400 text-xs mt-2 inline-block">Generate &#8594;</span>
          </button>
        ))}
      </div>

      {/* Report configuration panels */}
      {activeReport === "game" && (
        <div className="space-y-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm">Game Night Report</h3>
            <div>
              <label className="text-[#6b7280] text-xs block mb-1">Select Game</label>
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">Choose a game...</option>
                {events.map((ev) => (
                  <option key={ev.game!.id} value={ev.game!.id}>
                    {ev.title} — {new Date(ev.startsAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={generateGameReport}
              disabled={!selectedGameId || loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>

          {/* Game Night Report Output */}
          {gameReport && (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <h3 className="text-white font-bold text-lg">{gameReport.metadata.eventTitle}</h3>
                <div className="flex gap-4 mt-2 text-[#6b7280] text-xs">
                  <span>{new Date(gameReport.metadata.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
                  <span>{Math.round(gameReport.metadata.durationMinutes / 60)}h {gameReport.metadata.durationMinutes % 60}m</span>
                  <span>{gameReport.metadata.playerCount} players</span>
                </div>
              </div>

              {/* Financial summary */}
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                <StatCard label="Prize Pool" value={`$${gameReport.financialSummary.prizePool.toLocaleString()}`} />
                <StatCard label="Expenses" value={`$${gameReport.financialSummary.totalExpenses.toLocaleString()}`} />
                <StatCard label="Net Pool" value={`$${gameReport.financialSummary.netPrizePool.toLocaleString()}`} />
              </div>

              {/* Buy-in breakdown */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#2a2a2a]">
                  <h4 className="text-white font-semibold text-sm">Buy-In Breakdown</h4>
                </div>
                <div className="divide-y divide-[#2a2a2a]/50">
                  {gameReport.buyIns.map((b) => {
                    const rebuys = gameReport.rebuys.filter((r) => r.personId === b.personId);
                    const addOns = gameReport.addOns.filter((a) => a.personId === b.personId);
                    const rebuyTotal = rebuys.reduce((s, r) => s + r.amount, 0);
                    const addOnTotal = addOns.reduce((s, a) => s + a.amount, 0);
                    return (
                      <div key={b.personId} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 items-center text-sm">
                        <span className="text-white">{b.displayName}</span>
                        <span className="text-[#9ca3af] text-xs">${b.amount}</span>
                        <span className="text-[#9ca3af] text-xs">{rebuys.length > 0 ? `+${rebuys.length} rebuy` : "—"}</span>
                        <span className="text-[#9ca3af] text-xs">{addOns.length > 0 ? `+${addOns.length} add-on` : "—"}</span>
                        <span className="text-white font-semibold text-right">${b.amount + rebuyTotal + addOnTotal}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payouts */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#2a2a2a]">
                  <h4 className="text-white font-semibold text-sm">Payouts</h4>
                </div>
                <div className="divide-y divide-[#2a2a2a]/50">
                  {gameReport.payouts.map((p) => (
                    <div key={p.personId} className="grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-2 items-center text-sm">
                      <span className="text-[#6b7280]">#{p.finishPosition}</span>
                      <span className="text-white">{p.displayName}</span>
                      <span className="text-green-400 font-semibold">${p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bounty summary */}
              {gameReport.bountySummary.totalBountyPool > 0 && (
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                  <h4 className="text-white font-semibold text-sm mb-2">Bounty Summary</h4>
                  <p className="text-[#9ca3af] text-sm">
                    Total Pool: ${gameReport.bountySummary.totalBountyPool} | Paid: ${gameReport.bountySummary.totalBountiesPaid}
                  </p>
                </div>
              )}

              {/* Variance badge */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                  gameReport.varianceStatus === "BALANCED"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {gameReport.varianceStatus === "BALANCED" ? "Balanced" : "Variance Detected"}
                </span>
              </div>

              {/* Treasury impact */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <h4 className="text-white font-semibold text-sm mb-1">Treasury Impact</h4>
                <p className="text-[#9ca3af] text-sm">
                  Current Balance: <span className="text-white font-semibold">${gameReport.treasuryImpact.currentBalance.toLocaleString()}</span>
                </p>
              </div>

              {/* Export */}
              <button
                onClick={exportGameCSV}
                className="w-full px-4 py-2 bg-[#2a2a2a] text-white rounded-lg text-sm hover:bg-[#333] transition-colors"
              >
                Export CSV
              </button>
            </div>
          )}
        </div>
      )}

      {activeReport === "season" && (
        <div className="space-y-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm">Season Summary</h3>
            <div>
              <label className="text-[#6b7280] text-xs block mb-1">Select Season</label>
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">Choose a season...</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={generateSeasonReport}
              disabled={!selectedSeasonId || loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>

          {/* Season Summary Output */}
          {seasonReport && (
            <div className="space-y-4">
              {/* Key stats */}
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                <StatCard label="Total Games" value={String(seasonReport.totalGames)} />
                <StatCard label="Total Players" value={String(seasonReport.totalPlayers)} />
                <StatCard label="Collected" value={`$${seasonReport.totalBuyInsCollected.toLocaleString()}`} />
                <StatCard label="Paid Out" value={`$${seasonReport.totalPrizesPaid.toLocaleString()}`} />
              </div>

              {/* Top 5 earners */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#2a2a2a]">
                  <h4 className="text-white font-semibold text-sm">Top 5 Earners</h4>
                </div>
                <div className="divide-y divide-[#2a2a2a]/50">
                  {seasonReport.topEarners.map((e, i) => (
                    <div key={e.personId} className="grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-2.5 items-center text-sm">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? "bg-yellow-500/20 text-yellow-400" :
                        i === 1 ? "bg-gray-400/20 text-gray-300" :
                        i === 2 ? "bg-orange-500/20 text-orange-400" :
                        "bg-[#2a2a2a] text-[#6b7280]"
                      }`}>
                        {i + 1}
                      </span>
                      <span className="text-white">{e.displayName}</span>
                      <span className={`font-semibold ${e.net >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {e.net >= 0 ? "+" : ""}${e.net.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fun stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
                  <p className="text-[#6b7280] text-xs">Most Rebuys</p>
                  <p className="text-white text-sm font-semibold mt-1">
                    {seasonReport.mostRebuys ? `${seasonReport.mostRebuys.displayName} (${seasonReport.mostRebuys.totalRebuys})` : "—"}
                  </p>
                </div>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
                  <p className="text-[#6b7280] text-xs">Most Bounties</p>
                  <p className="text-white text-sm font-semibold mt-1">
                    {seasonReport.mostBounties ? `${seasonReport.mostBounties.displayName} (${seasonReport.mostBounties.totalBounties})` : "—"}
                  </p>
                </div>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
                  <p className="text-[#6b7280] text-xs">Avg Players/Game</p>
                  <p className="text-white text-sm font-semibold mt-1">{seasonReport.avgPlayersPerGame}</p>
                </div>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
                  <p className="text-[#6b7280] text-xs">Avg Prize Pool</p>
                  <p className="text-white text-sm font-semibold mt-1">${seasonReport.avgPrizePool.toLocaleString()}</p>
                </div>
              </div>

              <button
                onClick={exportSeasonCSV}
                className="w-full px-4 py-2 bg-[#2a2a2a] text-white rounded-lg text-sm hover:bg-[#333] transition-colors"
              >
                Export CSV
              </button>
            </div>
          )}
        </div>
      )}

      {activeReport === "member" && (
        <div className="space-y-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm">Member Summary</h3>
            <div>
              <label className="text-[#6b7280] text-xs block mb-1">Select Member</label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">Choose a member...</option>
                {members.map((m) => (
                  <option key={m.personId} value={m.personId}>{m.displayName}</option>
                ))}
              </select>
            </div>
            <button
              onClick={generateMemberReport}
              disabled={!selectedMemberId || loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>

          {/* Member Summary Output */}
          {memberReport && (
            <div className="space-y-4">
              {/* Player header */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <h3 className="text-white font-bold text-lg">{selectedMemberName}</h3>
              </div>

              {/* Career stats */}
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                <StatCard label="Games Played" value={String(memberReport.totalGames)} />
                <StatCard label="Total Invested" value={`$${(memberReport.totalBuyIns + memberReport.totalRebuys + memberReport.totalAddOns).toLocaleString()}`} />
                <StatCard label="Total Winnings" value={`$${memberReport.totalWinnings.toLocaleString()}`} />
              </div>

              {/* Net position — large */}
              <div className={`rounded-xl p-6 text-center border ${
                memberReport.netPosition >= 0 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"
              }`}>
                <p className="text-[#6b7280] text-xs uppercase tracking-wide mb-1">Net Position</p>
                <p className={`text-3xl font-bold ${memberReport.netPosition >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {memberReport.netPosition >= 0 ? "+" : ""}${memberReport.netPosition.toLocaleString()}
                </p>
              </div>

              {/* Records */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 text-center">
                  <p className="text-[#6b7280] text-xs">Best Finish</p>
                  <p className="text-white text-lg font-bold mt-1">#{memberReport.bestFinish}</p>
                </div>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 text-center">
                  <p className="text-[#6b7280] text-xs">Worst Finish</p>
                  <p className="text-white text-lg font-bold mt-1">#{memberReport.worstFinish}</p>
                </div>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 text-center">
                  <p className="text-[#6b7280] text-xs">Avg Finish</p>
                  <p className="text-white text-lg font-bold mt-1">#{memberReport.avgFinish.toFixed(1)}</p>
                </div>
              </div>

              <button
                onClick={exportMemberCSV}
                className="w-full px-4 py-2 bg-[#2a2a2a] text-white rounded-lg text-sm hover:bg-[#333] transition-colors"
              >
                Export CSV
              </button>
            </div>
          )}
        </div>
      )}

      {activeReport === "dues" && (
        <div className="space-y-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm">Dues Report</h3>
            <div>
              <label className="text-[#6b7280] text-xs block mb-1">Select Season</label>
              <select
                value={selectedDuesSeasonId}
                onChange={(e) => setSelectedDuesSeasonId(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">Choose a season...</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={generateDuesReport}
              disabled={!selectedDuesSeasonId || loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>

          {/* Dues Report Output */}
          {duesReport && (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                <StatCard label="Total Expected" value={`$${duesReport.totalExpected.toLocaleString()}`} />
                <StatCard label="Collected" value={`$${duesReport.totalCollected.toLocaleString()}`} />
                <StatCard
                  label="Outstanding"
                  value={`$${duesReport.totalOutstanding.toLocaleString()}`}
                  alert={duesReport.totalOutstanding > 0}
                />
              </div>

              {/* Members table */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-[#2a2a2a] text-[#6b7280] text-xs uppercase tracking-wide">
                  <span>Player</span>
                  <span className="text-right">Due</span>
                  <span className="text-right">Paid</span>
                  <span className="text-right">Remaining</span>
                  <span>Status</span>
                  <span className="text-right">Overdue</span>
                </div>
                <div className="divide-y divide-[#2a2a2a]/50">
                  {duesReport.members.map((m) => (
                    <div key={m.personId} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-4 py-2 items-center text-sm">
                      <span className="text-white">{m.displayName}</span>
                      <span className="text-[#9ca3af] text-right">${m.amountDue}</span>
                      <span className="text-[#9ca3af] text-right">${m.amountPaid}</span>
                      <span className={`text-right ${m.remaining > 0 ? "text-red-400" : "text-green-400"}`}>${m.remaining}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.isPaid ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {m.isPaid ? "Paid" : "Unpaid"}
                      </span>
                      <span className={`text-xs text-right ${m.daysOverdue > 30 ? "text-red-400" : "text-[#6b7280]"}`}>
                        {m.daysOverdue > 0 ? `${m.daysOverdue}d` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={exportDuesCSV}
                className="w-full px-4 py-2 bg-[#2a2a2a] text-white rounded-lg text-sm hover:bg-[#333] transition-colors"
              >
                Export CSV
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
