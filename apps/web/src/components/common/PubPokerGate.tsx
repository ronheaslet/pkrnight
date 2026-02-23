import { useGameStore } from "../../store/gameStore";

interface PubPokerGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PubPokerGate({ children, fallback }: PubPokerGateProps) {
  const currentClub = useGameStore((s) => s.currentClub);

  if (currentClub?.clubType === "PUB_POKER") {
    return <>{children}</>;
  }

  return fallback ? (
    <>{fallback}</>
  ) : (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-[#6b7280] text-sm">
          This feature is only available for Pub Poker clubs.
        </p>
      </div>
    </div>
  );
}
