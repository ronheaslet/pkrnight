import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const HANDS = [
  {
    rank: 1,
    name: "Royal Flush",
    cards: [
      { label: "A", suit: "♠" },
      { label: "K", suit: "♠" },
      { label: "Q", suit: "♠" },
      { label: "J", suit: "♠" },
      { label: "10", suit: "♠" },
    ],
    description: "Best possible hand",
  },
  {
    rank: 2,
    name: "Straight Flush",
    cards: [
      { label: "9", suit: "♠" },
      { label: "8", suit: "♠" },
      { label: "7", suit: "♠" },
      { label: "6", suit: "♠" },
      { label: "5", suit: "♠" },
    ],
    description: "Five in sequence, same suit",
  },
  {
    rank: 3,
    name: "Four of a Kind",
    cards: [
      { label: "K", suit: "♠" },
      { label: "K", suit: "♥" },
      { label: "K", suit: "♦" },
      { label: "K", suit: "♣" },
      { label: "2", suit: "♠" },
    ],
    description: "Four same rank",
  },
  {
    rank: 4,
    name: "Full House",
    cards: [
      { label: "J", suit: "♠" },
      { label: "J", suit: "♥" },
      { label: "J", suit: "♦" },
      { label: "4", suit: "♠" },
      { label: "4", suit: "♥" },
    ],
    description: "Three of a kind + pair",
  },
  {
    rank: 5,
    name: "Flush",
    cards: [
      { label: "A", suit: "♠" },
      { label: "J", suit: "♠" },
      { label: "8", suit: "♠" },
      { label: "5", suit: "♠" },
      { label: "2", suit: "♠" },
    ],
    description: "Five same suit, any rank",
  },
  {
    rank: 6,
    name: "Straight",
    cards: [
      { label: "8", suit: "♠" },
      { label: "7", suit: "♥" },
      { label: "6", suit: "♦" },
      { label: "5", suit: "♣" },
      { label: "4", suit: "♠" },
    ],
    description: "Five in sequence, any suit",
  },
  {
    rank: 7,
    name: "Three of a Kind",
    cards: [
      { label: "Q", suit: "♠" },
      { label: "Q", suit: "♥" },
      { label: "Q", suit: "♦" },
      { label: "7", suit: "♠" },
      { label: "2", suit: "♥" },
    ],
    description: "Three same rank",
  },
  {
    rank: 8,
    name: "Two Pair",
    cards: [
      { label: "A", suit: "♠" },
      { label: "A", suit: "♥" },
      { label: "K", suit: "♦" },
      { label: "K", suit: "♣" },
      { label: "5", suit: "♠" },
    ],
    description: "Two different pairs",
  },
  {
    rank: 9,
    name: "Pair",
    cards: [
      { label: "10", suit: "♠" },
      { label: "10", suit: "♥" },
      { label: "A", suit: "♦" },
      { label: "K", suit: "♣" },
      { label: "2", suit: "♠" },
    ],
    description: "Two same rank",
  },
  {
    rank: 10,
    name: "High Card",
    cards: [
      { label: "A", suit: "♠" },
      { label: "J", suit: "♥" },
      { label: "8", suit: "♦" },
      { label: "5", suit: "♣" },
      { label: "2", suit: "♠" },
    ],
    description: "None of the above",
  },
];

const HAND_NAMES = HANDS.map((h) => h.name);

function suitColor(suit: string): string {
  return suit === "♥" || suit === "♦" ? "#ef4444" : "white";
}

export default function HandRankings() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [handA, setHandA] = useState(0);
  const [handB, setHandB] = useState(9);

  const compareResult =
    handA < handB ? "Hand A wins" : handA > handB ? "Hand B wins" : "Tie";
  const compareBg =
    handA < handB
      ? "bg-green-600"
      : handA > handB
        ? "bg-red-600"
        : "bg-yellow-600";

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate(`/clubs/${clubId}`)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <svg
            className="w-5 h-5 text-[#9ca3af]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Hand Rankings</h1>
      </div>

      <p className="px-5 text-[#9ca3af] text-xs mb-4">
        Best to worst, top to bottom
      </p>

      {/* Hand list */}
      <div className="px-5 space-y-2.5">
        {HANDS.map((hand) => (
          <div
            key={hand.rank}
            className="flex items-start gap-3 bg-[#1a1a1a] rounded-xl px-3 py-2.5"
          >
            <div className="text-[#6b7280] text-xs font-mono w-5 text-right shrink-0 pt-1">
              {hand.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-base font-semibold">
                {hand.name}
              </div>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {hand.cards.map((card, i) => (
                  <span
                    key={i}
                    className="text-sm font-mono"
                    style={{ color: suitColor(card.suit) }}
                  >
                    {card.label}
                    {card.suit}
                  </span>
                ))}
              </div>
              <div className="text-[#6b7280] text-xs mt-1">
                {hand.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* What Beats What */}
      <div className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
          What Beats What
        </h2>
        <div className="bg-[#1a1a1a] rounded-xl p-4">
          <div className="flex items-center gap-3">
            {/* Hand A */}
            <div className="flex-1">
              <label className="text-[#9ca3af] text-xs block mb-1">
                Hand A
              </label>
              <select
                value={handA}
                onChange={(e) => setHandA(Number(e.target.value))}
                className="w-full bg-[#252525] text-white rounded-lg px-3 py-2 text-sm border border-[#2a2a2a] outline-none focus:border-green-500"
              >
                {HAND_NAMES.map((name, i) => (
                  <option key={name} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* VS */}
            <div className="text-[#6b7280] text-xs font-bold pt-5">vs</div>

            {/* Hand B */}
            <div className="flex-1">
              <label className="text-[#9ca3af] text-xs block mb-1">
                Hand B
              </label>
              <select
                value={handB}
                onChange={(e) => setHandB(Number(e.target.value))}
                className="w-full bg-[#252525] text-white rounded-lg px-3 py-2 text-sm border border-[#2a2a2a] outline-none focus:border-green-500"
              >
                {HAND_NAMES.map((name, i) => (
                  <option key={name} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Result */}
          <div
            className={`mt-3 text-center py-2 rounded-lg text-sm font-semibold ${compareBg}`}
          >
            {compareResult}
          </div>
        </div>
      </div>
    </div>
  );
}
