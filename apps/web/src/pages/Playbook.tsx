import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type Tab = "hands" | "concepts" | "etiquette" | "rulings";

const TABS: { key: Tab; label: string }[] = [
  { key: "hands", label: "Starting Hands" },
  { key: "concepts", label: "Concepts" },
  { key: "etiquette", label: "Etiquette" },
  { key: "rulings", label: "Rulings" },
];

// ── Tab 1: Starting Hands ──────────────────────────────────

interface HandGroup {
  position: string;
  premium: string[];
  strong: string[];
  speculative: string[];
  note?: string;
}

const STARTING_HANDS: HandGroup[] = [
  {
    position: "Early Position (UTG)",
    premium: ["AA", "KK", "QQ", "JJ", "TT", "AKs", "AKo"],
    strong: ["AQs"],
    speculative: [],
  },
  {
    position: "Middle Position",
    premium: ["AA", "KK", "QQ", "JJ", "TT", "AKs", "AKo"],
    strong: ["99", "88", "AQs", "AJs", "ATs", "AQo", "KQs"],
    speculative: [],
  },
  {
    position: "Late Position (BTN/CO)",
    premium: ["AA", "KK", "QQ", "JJ", "TT", "AKs", "AKo"],
    strong: ["99", "88", "77", "66", "AQs", "AJs", "ATs", "AQo", "KQs"],
    speculative: [
      "A9s",
      "A8s",
      "A7s",
      "A6s",
      "A5s",
      "A4s",
      "A3s",
      "A2s",
      "KJs",
      "KTs",
      "QJs",
      "JTs",
      "T9s",
      "98s",
    ],
  },
  {
    position: "Blinds (Defense)",
    premium: [],
    strong: [],
    speculative: [],
    note: "Defend with any hand you'd play from late position, plus suited connectors",
  },
];

function HandBadge({
  hand,
  tier,
}: {
  hand: string;
  tier: "premium" | "strong" | "speculative";
}) {
  const colors = {
    premium: "bg-green-600/30 text-green-400 border-green-600/40",
    strong: "bg-yellow-600/30 text-yellow-400 border-yellow-600/40",
    speculative: "bg-[#252525] text-[#9ca3af] border-[#2a2a2a]",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-mono border ${colors[tier]}`}
    >
      {hand}
    </span>
  );
}

function StartingHandsTab() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap mb-2">
        <span className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-600/50" /> Premium
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
          <span className="w-2.5 h-2.5 rounded-sm bg-yellow-600/50" /> Strong
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#252525]" /> Speculative
        </span>
      </div>

      {STARTING_HANDS.map((group) => (
        <div
          key={group.position}
          className="bg-[#1a1a1a] rounded-xl p-4"
        >
          <h3 className="text-white font-semibold text-sm mb-2">
            {group.position}
          </h3>
          {group.note ? (
            <p className="text-[#9ca3af] text-sm">{group.note}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {group.premium.map((h) => (
                <HandBadge key={h} hand={h} tier="premium" />
              ))}
              {group.strong.map((h) => (
                <HandBadge key={h} hand={h} tier="strong" />
              ))}
              {group.speculative.map((h) => (
                <HandBadge key={h} hand={h} tier="speculative" />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Tab 2: Concepts ────────────────────────────────────────

const CONCEPTS = [
  {
    title: "Position",
    body: "Acting last is a major advantage. You see what opponents do before deciding. Play tighter early, wider late.",
  },
  {
    title: "Pot Odds",
    body: 'If you must call $20 into an $80 pot, you need to win 20% of the time to break even. Count your outs \u00D7 2 (turn) or \u00D7 4 (flop to river) for rough equity.',
  },
  {
    title: "Stack-to-Blind Ratio",
    body: "< 10 BB: Push or fold only. 10-20 BB: Shove or fold, rarely call. 20-40 BB: Normal short-stack play. 40+ BB: Full range of options.",
  },
  {
    title: "ICM (Tournament Pressure)",
    body: "Near the money, surviving > chips. A chip lead near the bubble is worth more than its face value. Fold more marginal spots.",
  },
  {
    title: "Continuation Betting",
    body: "If you raised pre-flop, a c-bet of 33-50% pot on the flop takes it down often enough to be profitable, even when you miss.",
  },
];

function ConceptsTab() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {CONCEPTS.map((concept, i) => (
        <div key={concept.title} className="bg-[#1a1a1a] rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-white font-semibold text-sm">
              {concept.title}
            </span>
            <svg
              className={`w-4 h-4 text-[#9ca3af] transition-transform ${
                openIndex === i ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {openIndex === i && (
            <div className="px-4 pb-3">
              <p className="text-[#9ca3af] text-sm leading-relaxed">
                {concept.body}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Tab 3: Etiquette ───────────────────────────────────────

const ETIQUETTE = [
  {
    title: "Act in turn",
    body: "Don't fold, call, or raise before it's your turn.",
  },
  {
    title: "Protect your hand",
    body: "Keep cards on the table, use a card protector.",
  },
  {
    title: "One player per hand",
    body: "Don't show cards or discuss your hand while in a pot.",
  },
  {
    title: "Verbal declarations are binding",
    body: 'If you say "raise," you must raise.',
  },
  {
    title: "Show one, show all",
    body: "If you show a folded hand to one player, show the table.",
  },
  {
    title: "No slow rolls",
    body: "If you have the winning hand, show it promptly.",
  },
  {
    title: "Keep chips visible",
    body: "Stack chips neatly so opponents can estimate your stack.",
  },
  {
    title: "Silence during all-ins",
    body: "No commentary when players are all-in and hands are live.",
  },
  {
    title: "Respect the dealer",
    body: "Mistakes happen. Address issues calmly with the floor.",
  },
  {
    title: "No phones during hands",
    body: "Put it down when the action is on you.",
  },
];

function EtiquetteTab() {
  return (
    <div className="space-y-2">
      {ETIQUETTE.map((rule, i) => (
        <div key={rule.title} className="bg-[#1a1a1a] rounded-xl px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="text-[#6b7280] text-xs font-mono w-5 text-right shrink-0 pt-0.5">
              {i + 1}
            </span>
            <div>
              <span className="text-white font-semibold text-sm">
                {rule.title}
              </span>
              <span className="text-[#9ca3af] text-sm"> — {rule.body}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab 4: Common Rulings ──────────────────────────────────

const RULINGS = [
  {
    title: "String bet",
    body: 'You must declare "raise" before putting in chips, or put in the full amount in one motion. Adding chips after the fact = call only.',
  },
  {
    title: "Exposed card on the deal",
    body: "A card flashed during the deal is shown to all players, then the deal continues normally.",
  },
  {
    title: "Rabbit hunting",
    body: "Seeing the cards that would have come is not allowed by default. House rule determines this — check your club rules.",
  },
  {
    title: 'Verbal all-in',
    body: '"I\'m all-in" is binding even before chips are moved.',
  },
  {
    title: "Chips not in play",
    body: "You cannot go back to your pocket mid-hand. Only chips on the table are in play.",
  },
  {
    title: "Dead button rule",
    body: "If a player leaves, the button position still advances normally. Blinds may be owed.",
  },
];

function RulingsTab() {
  return (
    <div className="space-y-2">
      {RULINGS.map((rule, i) => (
        <div key={rule.title} className="bg-[#1a1a1a] rounded-xl px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="text-[#6b7280] text-xs font-mono w-5 text-right shrink-0 pt-0.5">
              {i + 1}
            </span>
            <div>
              <span className="text-white font-semibold text-sm">
                {rule.title}
              </span>
              <span className="text-[#9ca3af] text-sm"> — {rule.body}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

export default function Playbook() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("hands");

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
        <h1 className="text-xl font-bold">The Playbook</h1>
      </div>

      {/* Tab bar */}
      <div className="px-5 mb-4">
        <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap px-2 ${
                activeTab === tab.key
                  ? "bg-green-600 text-white"
                  : "text-[#9ca3af] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-5">
        {activeTab === "hands" && (
          <>
            <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">
              Starting Hand Guide by Position
            </h2>
            <StartingHandsTab />
          </>
        )}
        {activeTab === "concepts" && <ConceptsTab />}
        {activeTab === "etiquette" && <EtiquetteTab />}
        {activeTab === "rulings" && <RulingsTab />}
      </div>
    </div>
  );
}
