interface HandRankingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HANDS = [
  {
    name: "Royal Flush",
    example: "A♠ K♠ Q♠ J♠ 10♠",
    description: "A, K, Q, J, 10 all of the same suit",
  },
  {
    name: "Straight Flush",
    example: "9♥ 8♥ 7♥ 6♥ 5♥",
    description: "Five sequential cards of the same suit",
  },
  {
    name: "Four of a Kind",
    example: "Q♣ Q♠ Q♥ Q♦ 7♠",
    description: "Four cards of the same rank",
  },
  {
    name: "Full House",
    example: "J♦ J♣ J♠ 8♥ 8♦",
    description: "Three of a kind plus a pair",
  },
  {
    name: "Flush",
    example: "A♦ J♦ 8♦ 6♦ 2♦",
    description: "Five cards of the same suit, not in sequence",
  },
  {
    name: "Straight",
    example: "10♣ 9♦ 8♠ 7♥ 6♣",
    description: "Five sequential cards of different suits",
  },
  {
    name: "Three of a Kind",
    example: "7♠ 7♥ 7♦ K♣ 3♠",
    description: "Three cards of the same rank",
  },
  {
    name: "Two Pair",
    example: "K♥ K♦ 5♣ 5♠ 9♥",
    description: "Two different pairs",
  },
  {
    name: "Pair",
    example: "A♣ A♠ J♦ 8♥ 4♣",
    description: "Two cards of the same rank",
  },
  {
    name: "High Card",
    example: "A♠ J♦ 8♣ 5♥ 2♦",
    description: "No matching cards; highest card plays",
  },
];

export default function HandRankingsModal({
  isOpen,
  onClose,
}: HandRankingsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Bottom sheet */}
      <div
        className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        <div className="px-4 pb-2">
          <h2 className="text-white text-lg font-bold">Hand Rankings</h2>
          <p className="text-[#9ca3af] text-xs">Best to worst, top to bottom</p>
        </div>

        <div className="px-4 pb-6 space-y-3">
          {HANDS.map((hand, i) => (
            <div
              key={hand.name}
              className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0"
            >
              <div className="text-[#6b7280] text-xs font-mono w-5 text-right shrink-0 pt-0.5">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="text-white text-base font-semibold">
                  {hand.name}
                </div>
                <div className="text-[#9ca3af] text-sm font-mono mt-0.5">
                  {hand.example}
                </div>
                <div className="text-[#6b7280] text-xs mt-0.5">
                  {hand.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
