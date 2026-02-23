import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  GameState,
  PlayerState,
  PlayerAction,
} from '../../lib/holdem/engine';
import {
  initializeHand,
  applyAction,
  getValidActions,
  getAIAction,
  evaluateHand,
} from '../../lib/holdem/engine';
import PlayingCard from './PlayingCard';

interface HoldemTableProps {
  mode: 'quick_sit' | 'club_table' | 'solo_ai';
  playerName: string;
  startingChips?: number;
  opponents?: { id: string; name: string }[];
  onExit: () => void;
}

const AI_NAMES = ['Lucky', 'Ace', 'Bluff King', 'Shark', 'Maverick', 'Wildcard', 'Dealer Dan', 'River Rat'];

// Seat positions around the oval (relative %)
// Index 0 = bottom center (human), rest clockwise
const SEAT_POSITIONS: Record<number, { top: string; left: string }[]> = {
  2: [
    { top: '78%', left: '50%' },
    { top: '5%', left: '50%' },
  ],
  3: [
    { top: '78%', left: '50%' },
    { top: '15%', left: '20%' },
    { top: '15%', left: '80%' },
  ],
  4: [
    { top: '78%', left: '50%' },
    { top: '40%', left: '5%' },
    { top: '5%', left: '50%' },
    { top: '40%', left: '95%' },
  ],
  5: [
    { top: '78%', left: '50%' },
    { top: '50%', left: '5%' },
    { top: '8%', left: '25%' },
    { top: '8%', left: '75%' },
    { top: '50%', left: '95%' },
  ],
  6: [
    { top: '78%', left: '50%' },
    { top: '55%', left: '5%' },
    { top: '12%', left: '15%' },
    { top: '5%', left: '50%' },
    { top: '12%', left: '85%' },
    { top: '55%', left: '95%' },
  ],
};

function buildInitialPlayers(
  playerName: string,
  startingChips: number,
  opponentCount: number,
  opponents?: { id: string; name: string }[]
): PlayerState[] {
  const players: PlayerState[] = [
    {
      id: 'human',
      name: playerName,
      chips: startingChips,
      holeCards: [],
      bet: 0,
      totalBetThisRound: 0,
      isAllIn: false,
      isFolded: false,
      isDealer: false,
      isAI: false,
    },
  ];

  const shuffledNames = [...AI_NAMES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < opponentCount; i++) {
    const opp = opponents?.[i];
    players.push({
      id: opp?.id || `ai-${i}`,
      name: opp?.name || shuffledNames[i % shuffledNames.length],
      chips: startingChips,
      holeCards: [],
      bet: 0,
      totalBetThisRound: 0,
      isAllIn: false,
      isFolded: false,
      isDealer: false,
      isAI: !opp,
    });
  }
  return players;
}

export default function HoldemTable({
  mode,
  playerName,
  startingChips = 1000,
  opponents,
  onExit,
}: HoldemTableProps) {
  const opponentCount = mode === 'quick_sit' ? 5 : (opponents?.length || 3);

  const [players, setPlayers] = useState<PlayerState[]>(() =>
    buildInitialPlayers(playerName, startingChips, opponentCount, opponents)
  );
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [dealerIndex, setDealerIndex] = useState(0);
  const [handNumber, setHandNumber] = useState(0);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [aiThinking, setAiThinking] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [showBust, setShowBust] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start first hand on mount
  useEffect(() => {
    startNewHand(players, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNewHand(currentPlayers: PlayerState[], nextDealerIdx: number) {
    // Filter out bust players (except human)
    const activePlayers = currentPlayers.filter(
      p => p.chips > 0 || p.id === 'human'
    );

    if (activePlayers.length < 2) {
      // Not enough players, re-add busted AI with chips
      const resetPlayers = currentPlayers.map(p =>
        p.chips <= 0 && p.isAI ? { ...p, chips: startingChips } : p
      );
      const state = initializeHand(
        resetPlayers,
        nextDealerIdx % resetPlayers.length,
        { small: gameState?.smallBlind || 10, big: gameState?.bigBlind || 20 },
        handNumber + 1
      );
      setPlayers(resetPlayers);
      setGameState(state);
      setHandNumber(h => h + 1);
      setActionLog([]);
      return;
    }

    const dIdx = nextDealerIdx % activePlayers.length;
    const state = initializeHand(
      activePlayers,
      dIdx,
      { small: gameState?.smallBlind || 10, big: gameState?.bigBlind || 20 },
      handNumber + 1
    );
    setPlayers(activePlayers);
    setGameState(state);
    setDealerIndex(dIdx);
    setHandNumber(h => h + 1);
    setActionLog([]);
  }

  // AI turn handler
  useEffect(() => {
    if (!gameState || gameState.phase === 'showdown' || gameState.phase === 'waiting') return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isAI) return;

    // Clear human countdown
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    setAiThinking(currentPlayer.name);
    const delay = 800 + Math.random() * 700;

    aiTimeoutRef.current = setTimeout(() => {
      setAiThinking(null);
      const { action, amount } = getAIAction(gameState, currentPlayer.id);
      const newState = applyAction(gameState, currentPlayer.id, action, amount);
      if (newState.lastAction) {
        setActionLog(log => [...log.slice(-4), newState.lastAction!]);
      }
      setGameState(newState);
    }, delay);

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [gameState]);

  // Human turn countdown (30s auto-fold)
  useEffect(() => {
    if (!gameState || gameState.phase === 'showdown' || gameState.phase === 'waiting') return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isAI || currentPlayer.id !== 'human') return;

    setCountdown(30);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          // Auto-fold
          const newState = applyAction(gameState, 'human', 'fold');
          if (newState.lastAction) {
            setActionLog(log => [...log.slice(-4), newState.lastAction!]);
          }
          setGameState(newState);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [gameState?.currentPlayerIndex, gameState?.phase]);

  // Check for bust after showdown
  useEffect(() => {
    if (!gameState || gameState.phase !== 'showdown') return;
    if (gameState.winners) {
      const humanPlayer = gameState.players.find(p => p.id === 'human');
      const humanWon = gameState.winners.find(w => w.playerId === 'human');
      const humanChips = (humanPlayer?.chips || 0) + (humanWon?.amount || 0);
      if (humanChips <= 0) {
        setTimeout(() => setShowBust(true), 2000);
      }
    }
  }, [gameState?.phase, gameState?.winners]);

  const handleAction = useCallback(
    (action: PlayerAction, amount?: number) => {
      if (!gameState) return;
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setShowRaiseSlider(false);
      const newState = applyAction(gameState, 'human', action, amount);
      if (newState.lastAction) {
        setActionLog(log => [...log.slice(-4), newState.lastAction!]);
      }
      setGameState(newState);
    },
    [gameState]
  );

  const handleNextHand = useCallback(() => {
    if (!gameState) return;
    // Apply winnings to players
    const updatedPlayers = gameState.players.map(p => {
      const won = gameState.winners?.find(w => w.playerId === p.id);
      return { ...p, chips: p.chips + (won?.amount || 0) };
    });
    const nextDealer = (dealerIndex + 1) % updatedPlayers.length;
    setDealerIndex(nextDealer);
    startNewHand(updatedPlayers, nextDealer);
  }, [gameState, dealerIndex]);

  const handleRebuy = useCallback(() => {
    if (!gameState) return;
    const updatedPlayers = gameState.players.map(p =>
      p.id === 'human' ? { ...p, chips: startingChips } : p
    );
    setShowBust(false);
    const nextDealer = (dealerIndex + 1) % updatedPlayers.length;
    setDealerIndex(nextDealer);
    startNewHand(updatedPlayers, nextDealer);
  }, [gameState, dealerIndex, startingChips]);

  if (!gameState) return null;

  const humanPlayer = gameState.players.find(p => p.id === 'human');
  const isHumanTurn =
    gameState.phase !== 'showdown' &&
    gameState.phase !== 'waiting' &&
    gameState.players[gameState.currentPlayerIndex]?.id === 'human';
  const validActions = isHumanTurn ? getValidActions(gameState, 'human') : [];
  const toCall = humanPlayer ? gameState.currentBet - humanPlayer.totalBetThisRound : 0;
  const minRaise = gameState.currentBet + gameState.bigBlind;
  const positions = SEAT_POSITIONS[gameState.players.length] || SEAT_POSITIONS[6];

  // Winning hand card indices (for highlight)
  const winningCardSet = new Set<string>();
  if (gameState.phase === 'showdown' && gameState.winners) {
    for (const w of gameState.winners) {
      const p = gameState.players.find(x => x.id === w.playerId);
      if (p) {
        p.holeCards.forEach(c => winningCardSet.add(`${c.rank}-${c.suit}`));
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Exit button */}
      <div className="absolute top-3 left-3 z-20">
        <button onClick={onExit} className="text-white/60 text-sm px-3 py-1.5 bg-white/10 rounded-lg">
          ✕ Leave
        </button>
      </div>

      {/* Hand info */}
      <div className="absolute top-3 right-3 z-20 text-white/40 text-xs">
        Hand #{gameState.handNumber} &middot; Blinds {gameState.smallBlind}/{gameState.bigBlind}
      </div>

      {/* Table area */}
      <div className="flex-1 relative">
        {/* Felt oval */}
        <div
          className="absolute bg-[#35654d] border-4 border-[#2a5240] shadow-[inset_0_0_40px_rgba(0,0,0,0.3)]"
          style={{
            top: '15%',
            left: '10%',
            right: '10%',
            bottom: '25%',
            borderRadius: '50%',
          }}
        >
          {/* Pot */}
          <div className="absolute top-[30%] left-1/2 -translate-x-1/2 text-center">
            <div className="text-white/70 text-xs uppercase tracking-wider">Pot</div>
            <div className="text-yellow-400 font-bold text-lg">${gameState.pot}</div>
          </div>

          {/* Community cards */}
          <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => {
              const card = gameState.communityCards[i];
              return (
                <PlayingCard
                  key={i}
                  card={card || null}
                  faceDown={!card}
                  size="md"
                  highlight={
                    card
                      ? winningCardSet.has(`${card.rank}-${card.suit}`)
                      : false
                  }
                />
              );
            })}
          </div>

          {/* AI thinking */}
          {aiThinking && (
            <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 text-white/50 text-xs animate-pulse">
              {aiThinking} is thinking...
            </div>
          )}
        </div>

        {/* Player seats */}
        {gameState.players.map((player, i) => {
          const pos = positions[i] || positions[0];
          const isActive = gameState.currentPlayerIndex === i && gameState.phase !== 'showdown';
          const isHuman = player.id === 'human';
          const showCards = isHuman || gameState.phase === 'showdown';
          const winnerInfo = gameState.winners?.find(w => w.playerId === player.id);
          const handEval =
            gameState.phase === 'showdown' && !player.isFolded && player.holeCards.length === 2
              ? evaluateHand(player.holeCards, gameState.communityCards)
              : null;

          return (
            <div
              key={player.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
              style={{ top: pos.top, left: pos.left }}
            >
              {/* Bet display (above seat) */}
              {player.bet > 0 && (
                <div className="text-yellow-400/80 text-[10px] font-medium">
                  ${player.bet}
                </div>
              )}

              {/* Cards */}
              <div className="flex gap-0.5">
                {player.holeCards.length > 0 ? (
                  player.holeCards.map((card, ci) => (
                    <PlayingCard
                      key={ci}
                      card={card}
                      faceDown={!showCards || player.isFolded}
                      size="sm"
                      highlight={
                        showCards && !player.isFolded
                          ? winningCardSet.has(`${card.rank}-${card.suit}`)
                          : false
                      }
                    />
                  ))
                ) : (
                  <>
                    <PlayingCard card={null} faceDown size="sm" />
                    <PlayingCard card={null} faceDown size="sm" />
                  </>
                )}
              </div>

              {/* Name plate */}
              <div
                className={`px-2.5 py-1 rounded-lg text-center min-w-[72px] ${
                  player.isFolded
                    ? 'bg-white/5 opacity-40'
                    : isActive
                    ? 'bg-yellow-500/20 ring-1 ring-yellow-400/50'
                    : 'bg-black/60'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-white text-[11px] font-medium truncate max-w-[72px]">
                    {player.name}
                  </span>
                  {player.isDealer && (
                    <span className="bg-yellow-500 text-black text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                      D
                    </span>
                  )}
                </div>
                <div className="text-yellow-400 text-[10px] font-medium">
                  ${player.chips}
                  {player.isAllIn && <span className="text-red-400 ml-1">ALL IN</span>}
                </div>
                {player.lastAction && gameState.phase !== 'showdown' && (
                  <div className="text-white/40 text-[9px] capitalize">{player.lastAction.replace('_', ' ')}</div>
                )}
              </div>

              {/* Hand rank at showdown */}
              {handEval && !player.isFolded && (
                <div className={`text-[9px] px-2 py-0.5 rounded ${winnerInfo ? 'bg-yellow-500/20 text-yellow-300' : 'text-white/50'}`}>
                  {handEval.description}
                </div>
              )}

              {/* Winner badge */}
              {winnerInfo && (
                <div className="text-green-400 text-[10px] font-bold animate-pulse">
                  +${winnerInfo.amount}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action log */}
      <div className="absolute top-12 right-3 z-10 w-40">
        {actionLog.slice(-5).map((msg, i) => (
          <div key={i} className="text-white/40 text-[10px] leading-snug truncate">
            {msg}
          </div>
        ))}
      </div>

      {/* Bottom action area */}
      <div className="relative pb-6 px-4 pt-2">
        {/* Countdown bar */}
        {isHumanTurn && !showRaiseSlider && (
          <div className="h-1 bg-white/10 rounded-full mb-2 overflow-hidden">
            <div
              className="h-full bg-yellow-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 30) * 100}%` }}
            />
          </div>
        )}

        {/* Raise slider */}
        {showRaiseSlider && humanPlayer && (
          <div className="bg-[#1a1a1a] rounded-xl p-3 mb-2">
            <div className="text-yellow-400 text-xl font-bold text-center mb-2">
              ${raiseAmount}
            </div>
            <input
              type="range"
              min={minRaise}
              max={humanPlayer.totalBetThisRound + humanPlayer.chips}
              step={gameState.bigBlind}
              value={raiseAmount}
              onChange={e => setRaiseAmount(Number(e.target.value))}
              className="w-full accent-orange-500 mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowRaiseSlider(false)}
                className="flex-1 py-2.5 rounded-lg bg-white/10 text-white font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('raise', raiseAmount)}
                className="flex-1 py-2.5 rounded-lg bg-orange-600 text-white font-bold"
              >
                Raise ${raiseAmount}
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {isHumanTurn && !showRaiseSlider && (
          <div className="flex gap-2">
            {validActions.includes('fold') && (
              <button
                onClick={() => handleAction('fold')}
                className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-bold text-sm"
              >
                FOLD
              </button>
            )}
            {validActions.includes('check') && (
              <button
                onClick={() => handleAction('check')}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm"
              >
                CHECK
              </button>
            )}
            {validActions.includes('call') && (
              <button
                onClick={() => handleAction('call')}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-sm"
              >
                CALL ${toCall}
              </button>
            )}
            {validActions.includes('raise') && (
              <button
                onClick={() => {
                  setRaiseAmount(minRaise);
                  setShowRaiseSlider(true);
                }}
                className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold text-sm"
              >
                RAISE
              </button>
            )}
            {validActions.includes('all_in') && (
              <button
                onClick={() => handleAction('all_in')}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm"
              >
                ALL IN ${humanPlayer?.chips}
              </button>
            )}
          </div>
        )}

        {/* Next hand button (showdown) */}
        {gameState.phase === 'showdown' && !showBust && (
          <button
            onClick={handleNextHand}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-base"
          >
            Next Hand
          </button>
        )}
      </div>

      {/* Bust modal */}
      {showBust && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => {}}>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-xs w-full mx-4 text-center">
            <div className="text-3xl mb-3">💸</div>
            <h3 className="text-white text-lg font-bold mb-1">You're out of chips!</h3>
            <p className="text-white/50 text-sm mb-5">Better luck next hand?</p>
            <div className="space-y-2">
              <button
                onClick={handleRebuy}
                className="w-full py-3 rounded-xl bg-green-600 text-white font-bold"
              >
                Rebuy {startingChips} chips
              </button>
              <button
                onClick={onExit}
                className="w-full py-3 rounded-xl bg-white/10 text-white/60 font-medium"
              >
                Leave Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
