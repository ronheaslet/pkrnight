import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import StatCard from "../../components/accounting/StatCard";
import MethodSelector from "../../components/accounting/MethodSelector";
import { useGameStore } from "../../store/gameStore";

// ---------- Types ----------

interface TreasuryBalance {
  clubId: string;
  currentBalance: number;
  minimumReserve: number;
  isLow: boolean;
  updatedAt: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  method: string | null;
  actorName: string | null;
  runningBalance: number;
}

interface TreasuryData {
  balance: TreasuryBalance;
  ledger: {
    entries: LedgerEntry[];
    total: number;
    limit: number;
    offset: number;
  };
}

// ---------- Constants ----------

const moneyInTypes = ["BUY_IN", "REBUY", "ADD_ON", "DUES_PAYMENT"];

const typeBadgeColors: Record<string, string> = {
  BUY_IN: "bg-blue-500/20 text-blue-400",
  REBUY: "bg-yellow-500/20 text-yellow-400",
  ADD_ON: "bg-orange-500/20 text-orange-400",
  PAYOUT: "bg-green-500/20 text-green-400",
  EXPENSE: "bg-red-500/20 text-red-400",
  TREASURY_ADJUSTMENT: "bg-gray-500/20 text-gray-400",
  DUES_PAYMENT: "bg-cyan-500/20 text-cyan-400",
  BOUNTY_COLLECTED: "bg-purple-500/20 text-purple-400",
};

// ---------- Component ----------

export default function Treasury() {
  const { clubId } = useParams<{ clubId: string }>();
  const queryClient = useQueryClient();
  const currentUser = useGameStore((s) => s.currentUser);

  const isOwner = currentUser?.isSuperAdmin || currentUser?.roles.includes("OWNER");
  const isOwnerOrAccountant =
    isOwner ||
    currentUser?.roles.includes("ADMIN") ||
    currentUser?.permissions.includes("manage_money");

  // Filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ startDate: "", endDate: "" });

  // Reserve editing
  const [editingReserve, setEditingReserve] = useState(false);
  const [reserveInput, setReserveInput] = useState("");

  // Manual adjustment
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDescription, setAdjDescription] = useState("");
  const [adjMethod, setAdjMethod] = useState("cash");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [offset, setOffset] = useState(0);
  const [allEntries, setAllEntries] = useState<LedgerEntry[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Fetch treasury data
  const treasuryQuery = useQuery({
    queryKey: ["treasury", clubId, appliedFilters.startDate, appliedFilters.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "25");
      params.set("offset", "0");
      if (appliedFilters.startDate) params.set("startDate", appliedFilters.startDate);
      if (appliedFilters.endDate) params.set("endDate", appliedFilters.endDate);

      const res = await api.get(`/accounting/${clubId}/treasury?${params.toString()}`);
      const data = res.data as TreasuryData;
      setAllEntries(data.ledger.entries);
      setOffset(data.ledger.entries.length);
      setHasMore(data.ledger.entries.length < data.ledger.total);
      return data;
    },
    enabled: !!clubId,
    staleTime: 30_000,
  });

  const balance = treasuryQuery.data?.balance;
  const currentBalance = balance?.currentBalance ?? 0;
  const minimumReserve = balance?.minimumReserve ?? 0;
  const available = currentBalance - minimumReserve;
  const isBelowReserve = currentBalance < minimumReserve;

  // ---------- Handlers ----------

  function handleApplyFilters() {
    setAppliedFilters({ startDate, endDate });
    setOffset(0);
    setAllEntries([]);
  }

  async function handleLoadMore() {
    const params = new URLSearchParams();
    params.set("limit", "25");
    params.set("offset", String(offset));
    if (appliedFilters.startDate) params.set("startDate", appliedFilters.startDate);
    if (appliedFilters.endDate) params.set("endDate", appliedFilters.endDate);

    try {
      const res = await api.get(`/accounting/${clubId}/treasury?${params.toString()}`);
      const data = res.data as TreasuryData;
      setAllEntries((prev) => [...prev, ...data.ledger.entries]);
      setOffset((prev) => prev + data.ledger.entries.length);
      setHasMore(offset + data.ledger.entries.length < data.ledger.total);
    } catch {
      // silent
    }
  }

  async function handleSaveReserve() {
    const val = parseFloat(reserveInput);
    if (isNaN(val) || val < 0) return;
    try {
      await api.patch(`/accounting/${clubId}/treasury/reserve`, { minimumReserve: val });
      setEditingReserve(false);
      queryClient.invalidateQueries({ queryKey: ["treasury", clubId] });
    } catch {
      // silent
    }
  }

  async function handleSubmitAdjustment() {
    const amt = parseFloat(adjAmount);
    if (isNaN(amt) || !adjDescription.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/accounting/${clubId}/treasury/adjustment`, {
        amount: amt,
        description: adjDescription.trim(),
        method: adjMethod,
      });
      setShowConfirmModal(false);
      setShowAdjustment(false);
      setAdjAmount("");
      setAdjDescription("");
      setAdjMethod("cash");
      queryClient.invalidateQueries({ queryKey: ["treasury", clubId] });
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Loading / Error ----------

  if (treasuryQuery.isLoading) {
    return (
      <div className="px-5 py-8">
        <div className="animate-pulse space-y-4">
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 h-24 bg-[#1a1a1a] rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-[#1a1a1a] rounded-xl" />
        </div>
      </div>
    );
  }

  if (treasuryQuery.isError) {
    return (
      <div className="px-5 py-8 text-center text-[#9ca3af]">
        Failed to load treasury data. Please try again.
      </div>
    );
  }

  const adjAmtNum = parseFloat(adjAmount);

  return (
    <div className="px-5 space-y-4">
      {/* Balance overview */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        <div className="flex-1 min-w-[140px]">
          <StatCard
            label="Current Balance"
            value={`$${currentBalance.toLocaleString()}`}
            deltaColor={isBelowReserve ? "red" : "green"}
          />
        </div>

        {/* Reserve card with edit */}
        <div className="relative flex-1 min-w-[140px]">
          {editingReserve ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <p className="text-[#6b7280] text-xs uppercase tracking-wide mb-1">Minimum Reserve</p>
              <div className="flex items-center gap-2">
                <span className="text-white text-lg">$</span>
                <input
                  type="number"
                  value={reserveInput}
                  onChange={(e) => setReserveInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveReserve(); }}
                  onBlur={handleSaveReserve}
                  autoFocus
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2 py-1 text-white text-lg font-bold"
                  min={0}
                />
              </div>
            </div>
          ) : (
            <div className="relative">
              <StatCard label="Minimum Reserve" value={`$${minimumReserve.toLocaleString()}`} />
              {isOwner && (
                <button
                  onClick={() => { setReserveInput(String(minimumReserve)); setEditingReserve(true); }}
                  className="absolute top-3 right-3 text-[#6b7280] hover:text-white transition-colors"
                  title="Edit reserve"
                >
                  &#9998;
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-[140px]">
          <StatCard
            label="Available"
            value={`$${available.toLocaleString()}`}
            deltaColor={available >= 0 ? "green" : "red"}
          />
        </div>
      </div>

      {/* Low balance alert */}
      {isBelowReserve && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-yellow-400 text-sm">
          &#9888; Balance is below your minimum reserve of ${minimumReserve.toLocaleString()}
        </div>
      )}

      {/* Manual Adjustment (OWNER/Accountant) */}
      {isOwnerOrAccountant && (
        <div>
          {!showAdjustment ? (
            <button
              onClick={() => setShowAdjustment(true)}
              className="text-sm text-green-400 hover:text-green-300 transition-colors font-medium"
            >
              &#xFF0B; Manual Adjustment
            </button>
          ) : (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Manual Adjustment</h3>
                <button
                  onClick={() => setShowAdjustment(false)}
                  className="text-[#6b7280] hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-[#6b7280] text-xs block mb-1">Amount (positive = adding, negative = removing)</label>
                <input
                  type="number"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  placeholder="e.g. 50 or -25"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="text-[#6b7280] text-xs block mb-1">Description (required)</label>
                <input
                  type="text"
                  value={adjDescription}
                  onChange={(e) => setAdjDescription(e.target.value)}
                  placeholder="Reason for adjustment"
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="text-[#6b7280] text-xs block mb-1">Method</label>
                <MethodSelector value={adjMethod} onChange={setAdjMethod} />
              </div>

              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!adjAmount || isNaN(adjAmtNum) || !adjDescription.trim()}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Adjustment
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-[#6b7280] text-xs block mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <div>
          <label className="text-[#6b7280] text-xs block mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <button
          onClick={handleApplyFilters}
          className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg text-sm hover:bg-[#333] transition-colors"
        >
          Apply
        </button>
      </div>

      {/* Transaction Ledger */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-[#2a2a2a] text-[#6b7280] text-xs uppercase tracking-wide">
          <span>Date</span>
          <span>Description</span>
          <span>Type</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Balance</span>
          <span className="text-right">By</span>
        </div>

        {/* Rows */}
        {allEntries.length === 0 ? (
          <div className="px-4 py-8 text-center text-[#6b7280] text-sm">
            No transactions found.
          </div>
        ) : (
          allEntries.map((entry) => {
            const d = new Date(entry.date);
            const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            const isPositive = moneyInTypes.includes(entry.type) ||
              (entry.type === "TREASURY_ADJUSTMENT" && entry.amount > 0);
            const badgeClass = typeBadgeColors[entry.type] || "bg-gray-500/20 text-gray-400";

            return (
              <div
                key={entry.id}
                className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-[#2a2a2a]/50 items-center text-sm"
              >
                <span className="text-[#6b7280] text-xs whitespace-nowrap">
                  {dateStr}
                  <br />
                  <span className="text-[10px]">{timeStr}</span>
                </span>
                <span className="text-white truncate">{entry.description}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${badgeClass}`}>
                  {entry.type.replace(/_/g, " ")}
                </span>
                <span className={`text-right font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                  {isPositive ? "+" : "-"}${Math.abs(entry.amount).toLocaleString()}
                </span>
                <span className="text-right text-[#9ca3af]">
                  ${entry.runningBalance.toLocaleString()}
                </span>
                <span className="text-right text-[#6b7280] text-xs truncate max-w-[60px]">
                  {entry.actorName ?? "—"}
                </span>
              </div>
            );
          })
        )}

        {/* Load More */}
        {hasMore && allEntries.length > 0 && (
          <div className="px-4 py-3 text-center">
            <button
              onClick={handleLoadMore}
              className="text-sm text-green-400 hover:text-green-300 transition-colors font-medium"
            >
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 w-full max-w-sm">
            <h3 className="text-white font-bold mb-3">Confirm Adjustment</h3>
            <p className="text-[#9ca3af] text-sm mb-4">
              You are {adjAmtNum >= 0 ? "adding" : "removing"}{" "}
              <span className="text-white font-semibold">${Math.abs(adjAmtNum).toLocaleString()}</span>{" "}
              {adjAmtNum >= 0 ? "to" : "from"} the treasury.
              <br />
              <span className="text-[#6b7280]">Reason: {adjDescription}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] rounded-lg text-sm text-white hover:bg-[#333] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAdjustment}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-green-600 rounded-lg text-sm text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
