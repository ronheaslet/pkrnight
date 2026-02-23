import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useGameStore } from "../../store/gameStore";
import api from "../../lib/api";
import { isMockPubClub, mockPubClub } from "../../lib/pubPokerMocks";

export default function BonusChipBanner() {
  const currentClub = useGameStore((s) => s.currentClub);
  const currentUser = useGameStore((s) => s.currentUser);
  const [claimedCount, setClaimedCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Get bonus config from club or mock
  const isMock = isMockPubClub(currentClub?.id ?? "");
  const bonusConfig = isMock
    ? mockPubClub.bonusChipConfig
    : (currentClub?.venueProfile as { bonusChipConfig?: { mode: string; chipAmount: number; maxPerNight: number } })
        ?.bonusChipConfig;

  if (!bonusConfig || bonusConfig.mode === "OFF") return null;

  const atMax = claimedCount >= bonusConfig.maxPerNight;

  const claimMutation = useMutation({
    mutationFn: () => {
      if (isMock) {
        return Promise.resolve({ data: { success: true } } as any);
      }
      return api.post(`/pub/clubs/${currentClub!.id}/bonus`, {
        personId: currentUser?.userId,
      });
    },
    onSuccess: () => {
      setClaimedCount((c) => c + 1);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    },
  });

  function handleTap() {
    if (atMax) return;
    if (bonusConfig!.mode === "SELF_REPORT") {
      claimMutation.mutate();
    }
  }

  return (
    <div
      onClick={handleTap}
      className={`mx-4 mb-3 px-4 py-2.5 rounded-xl border transition-colors ${
        atMax
          ? "bg-[#1a1a1a] border-[#2a2a2a] opacity-50 cursor-default"
          : bonusConfig.mode === "SELF_REPORT"
            ? "bg-amber-900/20 border-amber-600/30 cursor-pointer hover:bg-amber-900/30"
            : "bg-amber-900/20 border-amber-600/30 cursor-default"
      }`}
    >
      {showSuccess ? (
        <p className="text-green-400 text-sm font-medium text-center">
          +{bonusConfig.chipAmount} chips claimed!
        </p>
      ) : atMax ? (
        <p className="text-[#6b7280] text-sm text-center">
          Max bonuses reached for tonight
        </p>
      ) : bonusConfig.mode === "TRACKED" ? (
        <div>
          <p className="text-amber-400 text-sm">
            Buy food or drinks? Ask your host to scan your receipt
          </p>
          <p className="text-[#6b7280] text-[10px] mt-0.5">
            Claimed tonight: {claimedCount}/{bonusConfig.maxPerNight}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-amber-400 text-sm">
            Buy food or drinks? Tap to claim +{bonusConfig.chipAmount} chips
          </p>
          <p className="text-[#6b7280] text-[10px] mt-0.5">
            Claimed tonight: {claimedCount}/{bonusConfig.maxPerNight}
          </p>
        </div>
      )}
    </div>
  );
}
