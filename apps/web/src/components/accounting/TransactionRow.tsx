import { useState } from "react";
import api from "../../lib/api";

interface TransactionRowProps {
  id: string;
  clubId: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  actorName?: string;
  isVoided?: boolean;
  canVoid?: boolean;
  onVoided?: () => void;
}

const typeBadgeColors: Record<string, string> = {
  BUY_IN: "bg-blue-500/20 text-blue-400",
  REBUY: "bg-yellow-500/20 text-yellow-400",
  ADD_ON: "bg-orange-500/20 text-orange-400",
  PAYOUT: "bg-green-500/20 text-green-400",
  EXPENSE: "bg-red-500/20 text-red-400",
  BOUNTY: "bg-purple-500/20 text-purple-400",
  DUES_PAYMENT: "bg-cyan-500/20 text-cyan-400",
  ADJUSTMENT: "bg-gray-500/20 text-gray-400",
};

export default function TransactionRow({
  id,
  clubId,
  date,
  type,
  description,
  amount,
  actorName,
  isVoided,
  canVoid,
  onVoided,
}: TransactionRowProps) {
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const badgeClass = typeBadgeColors[type] || "bg-gray-500/20 text-gray-400";
  const isPositive = ["BUY_IN", "REBUY", "ADD_ON", "BOUNTY", "DUES_PAYMENT"].includes(type);
  const d = new Date(date);
  const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  async function handleVoid() {
    if (!voidReason.trim()) return;
    setVoiding(true);
    try {
      await api.delete(`/accounting/${clubId}/transactions/${id}`, {
        data: { reason: voidReason },
      });
      setShowVoidModal(false);
      onVoided?.();
    } catch {
      // toast error would go here
    } finally {
      setVoiding(false);
    }
  }

  return (
    <>
      <div
        className={`flex items-center gap-3 py-2.5 px-3 rounded-lg ${
          isVoided ? "opacity-40 line-through" : ""
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
              {type.replace("_", " ")}
            </span>
            <span className="text-[#6b7280] text-[10px]">
              {dateStr} {timeStr}
            </span>
          </div>
          <p className="text-white text-sm truncate">{description}</p>
          {actorName && (
            <p className="text-[#6b7280] text-[10px]">by {actorName}</p>
          )}
        </div>
        <div className="text-right flex items-center gap-2">
          <span className={`text-sm font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? "+" : "-"}${Math.abs(amount)}
          </span>
          {canVoid && !isVoided && (
            <button
              onClick={() => setShowVoidModal(true)}
              className="text-[#6b7280] hover:text-red-400 text-xs transition-colors"
              title="Void transaction"
            >
              &#10005;
            </button>
          )}
        </div>
      </div>

      {/* Void Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 w-full max-w-sm">
            <h3 className="text-white font-bold mb-3">Void Transaction</h3>
            <p className="text-[#9ca3af] text-sm mb-4">
              This will void the {type.replace("_", " ").toLowerCase()} of ${amount}.
            </p>
            <input
              type="text"
              placeholder="Reason for voiding..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowVoidModal(false)}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] rounded-lg text-sm text-white hover:bg-[#333] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                disabled={voiding || !voidReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 rounded-lg text-sm text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {voiding ? "Voiding..." : "Void"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
