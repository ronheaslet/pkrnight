import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type BlindOption = { small: number; big: number; label: string };
const BLIND_OPTIONS: BlindOption[] = [
  { small: 5, big: 10, label: '5/10' },
  { small: 10, big: 20, label: '10/20' },
  { small: 25, big: 50, label: '25/50' },
];

export default function HoldemLobby() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();

  const [soloOpponents, setSoloOpponents] = useState(3);
  const [soloBlinds, setSoloBlinds] = useState<BlindOption>(BLIND_OPTIONS[1]);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  function startQuickSit() {
    navigate(`/clubs/${clubId}/holdem/game`, {
      state: {
        mode: 'quick_sit',
        blinds: { small: 10, big: 20 },
        startingChips: 1000,
      },
    });
  }

  function startClubTable() {
    // In a real implementation, we'd fetch eliminated players.
    // For now, fill with AI since there's no live game API call here.
    navigate(`/clubs/${clubId}/holdem/game`, {
      state: {
        mode: 'club_table',
        blinds: { small: 10, big: 20 },
        startingChips: 1000,
        opponents: [],
      },
    });
  }

  function startSoloAI() {
    navigate(`/clubs/${clubId}/holdem/game`, {
      state: {
        mode: 'solo_ai',
        blinds: soloBlinds,
        startingChips: 1000,
        opponentCount: soloOpponents,
      },
    });
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      <div className="px-5 pt-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-center mb-6">
          🃏 PKR Night Hold'em
        </h1>

        {/* Mode cards */}
        <div className="space-y-4">
          {/* Quick Sit */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">⚡</span>
              <h2 className="text-lg font-bold">Quick Sit</h2>
            </div>
            <p className="text-white/50 text-sm mb-4">
              Jump into a random table. 6 players, 1000 chip buy-in.
            </p>
            <button
              onClick={startQuickSit}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm"
            >
              Start
            </button>
          </div>

          {/* Club Table */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🏠</span>
              <h2 className="text-lg font-bold">Club Table</h2>
            </div>
            <p className="text-white/50 text-sm mb-2">
              Play against your club members who are currently eliminated.
            </p>
            <p className="text-white/30 text-xs mb-4">
              AI opponents will fill any empty seats
            </p>
            <button
              onClick={startClubTable}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm"
            >
              Start
            </button>
          </div>

          {/* Solo vs AI */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🤖</span>
              <h2 className="text-lg font-bold">Solo vs AI</h2>
            </div>
            <p className="text-white/50 text-sm mb-4">
              Practice against 1–5 AI opponents. You choose the table size.
            </p>

            {/* Opponent count */}
            <div className="mb-3">
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
                Opponents
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSoloOpponents(Math.max(1, soloOpponents - 1))}
                  className="w-10 h-10 rounded-lg bg-white/10 text-white text-xl font-bold flex items-center justify-center"
                  disabled={soloOpponents <= 1}
                >
                  −
                </button>
                <span className="text-2xl font-bold min-w-[40px] text-center">
                  {soloOpponents}
                </span>
                <button
                  onClick={() => setSoloOpponents(Math.min(5, soloOpponents + 1))}
                  className="w-10 h-10 rounded-lg bg-white/10 text-white text-xl font-bold flex items-center justify-center"
                  disabled={soloOpponents >= 5}
                >
                  +
                </button>
              </div>
            </div>

            {/* Blinds selector */}
            <div className="mb-4">
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-1.5">
                Blinds
              </label>
              <div className="flex gap-2">
                {BLIND_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => setSoloBlinds(opt)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      soloBlinds.label === opt.label
                        ? 'bg-green-600 text-white'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startSoloAI}
              className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm"
            >
              Start
            </button>
          </div>
        </div>

        {/* How to play */}
        <div className="mt-6">
          <button
            onClick={() => setShowHowToPlay(!showHowToPlay)}
            className="text-white/40 text-sm flex items-center gap-1"
          >
            <span>{showHowToPlay ? '▾' : '▸'}</span>
            How to play
          </button>
          {showHowToPlay && (
            <div className="mt-2 text-white/30 text-xs space-y-1 pl-4">
              <p>Texas Hold'em: make the best 5-card hand from your 2 hole cards and 5 community cards.</p>
              <p>Bet, raise, or fold each round. Last player standing or best hand at showdown wins.</p>
              <button
                onClick={() => navigate(`/clubs/${clubId}/hand-rankings`)}
                className="text-green-500 underline mt-1 block"
              >
                View hand rankings →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
