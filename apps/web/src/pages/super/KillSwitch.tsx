import { useState } from "react";
import { deactivateClub } from "../../lib/superAdminApi";

export default function KillSwitch() {
  const [clubId, setClubId] = useState("");
  const [reason, setReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [status, setStatus] = useState<"idle" | "firing" | "done">("idle");

  const canFire = confirmText === "KILL" && clubId.trim().length > 0;

  const handleFire = async () => {
    if (!canFire) return;
    setStatus("firing");
    await deactivateClub(clubId, reason || "Kill switch activated by super admin");
    setStatus("done");
    setShowConfirm(false);
    setConfirmText("");
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-red-400 mb-2">Kill Switch</h1>
      <p className="text-sm text-[#6b7280] mb-6">
        Immediately deactivate a club. This is a destructive action.
      </p>

      <div className="max-w-lg space-y-4">
        <div>
          <label className="text-xs text-[#9ca3af] block mb-1">Club ID</label>
          <input
            type="text"
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            placeholder="e.g. mock-club-001"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-red-500/50"
          />
        </div>

        <div>
          <label className="text-xs text-[#9ca3af] block mb-1">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this club being killed?"
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-red-500/50 resize-none"
          />
        </div>

        {status === "done" ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-center">
            <p className="text-red-400 font-medium">Club deactivated.</p>
            <button
              onClick={() => {
                setStatus("idle");
                setClubId("");
                setReason("");
              }}
              className="text-xs text-[#6b7280] mt-2 hover:text-white transition-colors"
            >
              Reset
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!clubId.trim()}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 disabled:cursor-not-allowed text-white rounded font-medium text-sm transition-colors"
          >
            Deactivate Club
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-red-500/30 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-red-400 mb-2">Confirm Kill Switch</h2>
            <p className="text-sm text-[#9ca3af] mb-1">
              You are about to deactivate club:
            </p>
            <p className="text-sm text-white font-mono bg-white/5 rounded px-2 py-1 mb-4">
              {clubId}
            </p>
            {reason && (
              <p className="text-xs text-[#6b7280] mb-4">
                Reason: {reason}
              </p>
            )}
            <p className="text-sm text-red-400 mb-2">
              This will immediately prevent all members from accessing the club.
            </p>
            <div className="mb-4">
              <label className="text-xs text-[#9ca3af] block mb-1">
                Type <span className="font-mono text-red-400">KILL</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full bg-white/5 border border-red-500/30 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmText("");
                }}
                className="flex-1 px-4 py-2 border border-white/10 rounded text-sm text-[#9ca3af] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFire}
                disabled={!canFire || status === "firing"}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
              >
                {status === "firing" ? "Firing..." : "Confirm Deactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
