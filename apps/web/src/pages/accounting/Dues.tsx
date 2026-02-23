import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import StatCard from "../../components/accounting/StatCard";
import MethodSelector from "../../components/accounting/MethodSelector";
import { useGameStore } from "../../store/gameStore";

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
}

interface DuesRecord {
  id: string;
  personId: string;
  displayName: string;
  avatarUrl: string | null;
  amountDue: number;
  amountPaid: number;
  remaining: number;
  isPaid: boolean;
  paidAt: string | null;
  method: string | null;
}

interface DuesStatus {
  seasonId: string;
  records: DuesRecord[];
  summary: {
    totalExpected: number;
    totalCollected: number;
    outstanding: number;
    paidCount: number;
    outstandingCount: number;
    totalMembers: number;
  };
}

export default function Dues() {
  const { clubId } = useParams<{ clubId: string }>();
  const queryClient = useQueryClient();
  const currentUser = useGameStore((s) => s.currentUser);

  const isOwnerOrAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.roles.includes("OWNER") ||
    currentUser?.roles.includes("ADMIN");

  const isOwner = currentUser?.isSuperAdmin || currentUser?.roles.includes("OWNER");

  // Load seasons
  const seasonsQuery = useQuery({
    queryKey: ["seasons", clubId],
    queryFn: () => api.get(`/clubs/${clubId}/seasons`).then((r) => r.data as Season[]),
    enabled: !!clubId,
    staleTime: 60_000,
  });

  const seasons: Season[] = seasonsQuery.data ?? [];
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");

  // Auto-select first season
  const effectiveSeasonId = selectedSeasonId || seasons[0]?.id || "";

  // Load dues for selected season
  const duesQuery = useQuery({
    queryKey: ["dues", clubId, effectiveSeasonId],
    queryFn: () =>
      api.get(`/accounting/${clubId}/dues/${effectiveSeasonId}`).then((r) => r.data as DuesStatus),
    enabled: !!clubId && !!effectiveSeasonId,
    staleTime: 15_000,
  });

  const dues = duesQuery.data;

  const refreshDues = () => queryClient.invalidateQueries({ queryKey: ["dues", clubId, effectiveSeasonId] });

  if (seasons.length === 0 && !seasonsQuery.isLoading) {
    return (
      <div className="px-5">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
          <p className="text-[#6b7280] text-sm">
            No seasons found. Create a season in Club Settings first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 space-y-4">
      {/* Season selector */}
      <div>
        <label className="text-[#6b7280] text-xs uppercase tracking-wide block mb-1.5">Season</label>
        <select
          value={effectiveSeasonId}
          onChange={(e) => setSelectedSeasonId(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm"
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Summary bar */}
      {dues?.summary && (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          <StatCard label="Total Expected" value={`$${dues.summary.totalExpected}`} />
          <StatCard label="Collected" value={`$${dues.summary.totalCollected}`} />
          <StatCard
            label="Outstanding"
            value={`$${dues.summary.outstanding}`}
            alert={dues.summary.outstanding > 0}
          />
          <StatCard label="Paid" value={`${dues.summary.paidCount}/${dues.summary.totalMembers}`} />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {isOwnerOrAdmin && (
          <SendRemindersButton clubId={clubId!} seasonId={effectiveSeasonId} />
        )}
        {isOwner && dues && dues.records.length === 0 && (
          <CreateDuesButton clubId={clubId!} seasonId={effectiveSeasonId} onCreated={refreshDues} />
        )}
      </div>

      {/* Dues table */}
      {duesQuery.isLoading ? (
        <div className="text-center py-8 animate-pulse text-[#6b7280]">Loading dues...</div>
      ) : dues ? (
        <DuesTable clubId={clubId!} seasonId={effectiveSeasonId} dues={dues} onRefresh={refreshDues} />
      ) : null}
    </div>
  );
}

// ---------- Dues Table ----------

function DuesTable({
  clubId,
  seasonId,
  dues,
  onRefresh,
}: {
  clubId: string;
  seasonId: string;
  dues: DuesStatus;
  onRefresh: () => void;
}) {
  const [payingFor, setPayingFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [loading, setLoading] = useState(false);

  async function handleRecordPayment(personId: string) {
    if (!payAmount) return;
    setLoading(true);
    try {
      await api.post(`/accounting/${clubId}/dues/${seasonId}/payment`, {
        personId,
        amount: Number(payAmount),
        method: payMethod,
      });
      setPayingFor(null);
      setPayAmount("");
      onRefresh();
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-4 py-2 text-[10px] text-[#6b7280] uppercase tracking-wide border-b border-[#2a2a2a]">
        <span>Member</span>
        <span className="text-right w-14">Due</span>
        <span className="text-right w-14">Paid</span>
        <span className="text-right w-16">Balance</span>
        <span className="text-center w-20">Status</span>
      </div>

      {/* Rows */}
      {dues.records.map((r) => {
        const statusBadge = r.isPaid
          ? { label: "\u2705 Paid", class: "bg-green-500/20 text-green-400" }
          : r.amountPaid > 0
            ? { label: `\u26A1 $${r.remaining} left`, class: "bg-yellow-500/20 text-yellow-400" }
            : { label: "\u274C Unpaid", class: "bg-red-500/20 text-red-400" };

        return (
          <div key={r.id}>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-4 py-2.5 items-center text-sm border-b border-[#2a2a2a]/50">
              <span className="text-white truncate">{r.displayName}</span>
              <span className="text-[#9ca3af] text-right w-14">${r.amountDue}</span>
              <span className="text-[#9ca3af] text-right w-14">${r.amountPaid}</span>
              <span className={`text-right w-16 font-medium ${r.remaining > 0 ? "text-red-400" : "text-green-400"}`}>
                ${r.remaining}
              </span>
              <div className="flex items-center gap-1.5 w-20 justify-end">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge.class}`}>
                  {statusBadge.label}
                </span>
              </div>
            </div>

            {/* Action row */}
            {!r.isPaid && (
              <div className="px-4 py-1.5 border-b border-[#2a2a2a]/50 bg-[#151515]">
                {payingFor === r.personId ? (
                  <div className="space-y-2 py-1">
                    <input
                      type="number"
                      placeholder={`Amount (max $${r.remaining})`}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <MethodSelector value={payMethod} onChange={setPayMethod} />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPayingFor(null)}
                        className="flex-1 px-3 py-1.5 bg-[#2a2a2a] rounded-lg text-xs text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRecordPayment(r.personId)}
                        disabled={loading || !payAmount}
                        className="flex-1 px-3 py-1.5 bg-green-600 rounded-lg text-xs text-white disabled:opacity-50"
                      >
                        {loading ? "..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setPayingFor(r.personId);
                      setPayAmount(String(r.remaining));
                    }}
                    className="text-xs text-green-400 hover:text-green-300 py-0.5"
                  >
                    Record Payment
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {dues.records.length === 0 && (
        <div className="px-4 py-6 text-center text-[#6b7280] text-sm">
          No dues records for this season.
        </div>
      )}
    </div>
  );
}

// ---------- Send Reminders Button ----------

function SendRemindersButton({ clubId, seasonId }: { clubId: string; seasonId: string }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      await api.post(`/accounting/${clubId}/dues/${seasonId}/remind`);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleSend}
      disabled={loading || !seasonId}
      className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white hover:bg-[#222] transition-colors disabled:opacity-50"
    >
      {sent ? "\u2705 Reminders sent!" : loading ? "Sending..." : "Send Reminders"}
    </button>
  );
}

// ---------- Create Dues Button ----------

function CreateDuesButton({
  clubId,
  seasonId,
  onCreated,
}: {
  clubId: string;
  seasonId: string;
  onCreated: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("100");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      await api.post(`/accounting/${clubId}/dues/${seasonId}/create-all`, {
        amountDue: Number(amount),
      });
      setShowModal(false);
      onCreated();
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-green-600 rounded-lg text-sm text-white hover:bg-green-700 transition-colors"
      >
        Create Dues for Season
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 w-full max-w-sm">
            <h3 className="text-white font-bold mb-3">Create Dues</h3>
            <p className="text-[#9ca3af] text-sm mb-4">
              This will create dues records for all active members.
            </p>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount per member"
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] rounded-lg text-sm text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !amount}
                className="flex-1 px-4 py-2 bg-green-600 rounded-lg text-sm text-white disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
