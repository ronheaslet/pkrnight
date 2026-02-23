import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import HoldemTable from '../components/holdem/HoldemTable';

interface LocationState {
  mode: 'quick_sit' | 'club_table' | 'solo_ai';
  blinds: { small: number; big: number };
  startingChips: number;
  opponents?: { id: string; name: string }[];
  opponentCount?: number;
}

export default function HoldemGame() {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useGameStore(s => s.currentUser);

  const state = (location.state as LocationState) || {
    mode: 'quick_sit' as const,
    blinds: { small: 10, big: 20 },
    startingChips: 1000,
  };

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const playerName = currentUser
    ? `Player`
    : 'You';

  // For solo_ai mode, generate the right number of AI opponents
  const opponents =
    state.mode === 'solo_ai'
      ? Array.from({ length: state.opponentCount || 3 }, (_, i) => ({
          id: `ai-${i}`,
          name: '',
        }))
      : state.opponents;

  function handleExit() {
    setShowExitConfirm(true);
  }

  function confirmExit() {
    navigate(`/clubs/${clubId}/holdem`);
  }

  return (
    <>
      <HoldemTable
        mode={state.mode}
        playerName={playerName}
        startingChips={state.startingChips}
        opponents={opponents}
        onExit={handleExit}
      />

      {/* Exit confirmation modal */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center"
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            className="bg-[#1a1a1a] rounded-2xl p-6 max-w-xs w-full mx-4 text-center"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white text-lg font-bold mb-2">Leave the table?</h3>
            <p className="text-white/50 text-sm mb-5">
              Your chips stay in this session.
            </p>
            <div className="space-y-2">
              <button
                onClick={confirmExit}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-bold"
              >
                Leave Table
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-3 rounded-xl bg-white/10 text-white/60 font-medium"
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
