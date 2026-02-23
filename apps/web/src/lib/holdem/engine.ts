// ─── Types ────────────────────────────────────────────────────────────────────

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'|'A';
export type Card = { rank: Rank; suit: Suit };
export type HandRank =
  | 'royal_flush'
  | 'straight_flush'
  | 'four_of_a_kind'
  | 'full_house'
  | 'flush'
  | 'straight'
  | 'three_of_a_kind'
  | 'two_pair'
  | 'pair'
  | 'high_card';

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all_in';

export type PlayerState = {
  id: string;
  name: string;
  chips: number;
  holeCards: Card[];
  bet: number;
  totalBetThisRound: number;
  isAllIn: boolean;
  isFolded: boolean;
  isDealer: boolean;
  isAI: boolean;
  lastAction?: PlayerAction;
};

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type GameState = {
  players: PlayerState[];
  communityCards: Card[];
  deck: Card[];
  phase: GamePhase;
  pot: number;
  sidePots: { amount: number; eligiblePlayerIds: string[] }[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  currentBet: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  lastAction?: string;
  winners?: { playerId: string; amount: number; handRank: HandRank }[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

const HAND_RANK_VALUE: Record<HandRank, number> = {
  high_card: 1,
  pair: 2,
  two_pair: 3,
  three_of_a_kind: 4,
  straight: 5,
  flush: 6,
  full_house: 7,
  four_of_a_kind: 8,
  straight_flush: 9,
  royal_flush: 10,
};

// ─── Deck ─────────────────────────────────────────────────────────────────────

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ─── Hand Evaluation ──────────────────────────────────────────────────────────

function getCombinations(cards: Card[], k: number): Card[][] {
  const result: Card[][] = [];
  function backtrack(start: number, current: Card[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < cards.length; i++) {
      current.push(cards[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  backtrack(0, []);
  return result;
}

function evaluate5(cards: Card[]): { rank: HandRank; score: number; description: string } {
  const values = cards.map(c => RANK_VALUE[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check straight (including A-2-3-4-5 wheel)
  let isStraight = false;
  let straightHigh = 0;
  const uniqueVals = [...new Set(values)].sort((a, b) => b - a);
  if (uniqueVals.length === 5) {
    if (uniqueVals[0] - uniqueVals[4] === 4) {
      isStraight = true;
      straightHigh = uniqueVals[0];
    }
    // Wheel: A-2-3-4-5
    if (uniqueVals[0] === 14 && uniqueVals[1] === 5 && uniqueVals[2] === 4 && uniqueVals[3] === 3 && uniqueVals[4] === 2) {
      isStraight = true;
      straightHigh = 5; // 5-high straight
    }
  }

  // Count ranks
  const counts: Record<number, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }
  const groups = Object.entries(counts)
    .map(([val, cnt]) => ({ val: Number(val), cnt }))
    .sort((a, b) => b.cnt - a.cnt || b.val - a.val);

  // Determine hand rank and build score
  // Score format: handRankValue * 10^10 + kicker encoding
  // Each kicker gets 2 hex digits (base-15 values shifted)

  const rankName = (v: number): string => {
    const names: Record<number, string> = {
      2:'2s', 3:'3s', 4:'4s', 5:'5s', 6:'6s', 7:'7s', 8:'8s',
      9:'9s', 10:'10s', 11:'Jacks', 12:'Queens', 13:'Kings', 14:'Aces'
    };
    return names[v] || String(v);
  };

  const rankSingular = (v: number): string => {
    const names: Record<number, string> = {
      2:'2', 3:'3', 4:'4', 5:'5', 6:'6', 7:'7', 8:'8',
      9:'9', 10:'10', 11:'Jack', 12:'Queen', 13:'King', 14:'Ace'
    };
    return names[v] || String(v);
  };

  function encodeScore(handRank: number, kickers: number[]): number {
    // handRank * 15^5 + k0*15^4 + k1*15^3 + k2*15^2 + k3*15 + k4
    let score = handRank * Math.pow(15, 5);
    for (let i = 0; i < kickers.length && i < 5; i++) {
      score += kickers[i] * Math.pow(15, 4 - i);
    }
    return score;
  }

  // Royal flush
  if (isFlush && isStraight && straightHigh === 14) {
    return {
      rank: 'royal_flush',
      score: encodeScore(HAND_RANK_VALUE.royal_flush, [14]),
      description: 'Royal Flush',
    };
  }

  // Straight flush
  if (isFlush && isStraight) {
    return {
      rank: 'straight_flush',
      score: encodeScore(HAND_RANK_VALUE.straight_flush, [straightHigh]),
      description: `Straight Flush — ${rankSingular(straightHigh)} high`,
    };
  }

  // Four of a kind
  if (groups[0].cnt === 4) {
    const quadVal = groups[0].val;
    const kicker = groups[1].val;
    return {
      rank: 'four_of_a_kind',
      score: encodeScore(HAND_RANK_VALUE.four_of_a_kind, [quadVal, kicker]),
      description: `Four of a Kind — ${rankName(quadVal)}`,
    };
  }

  // Full house
  if (groups[0].cnt === 3 && groups[1].cnt === 2) {
    return {
      rank: 'full_house',
      score: encodeScore(HAND_RANK_VALUE.full_house, [groups[0].val, groups[1].val]),
      description: `Full House — ${rankName(groups[0].val)} over ${rankName(groups[1].val)}`,
    };
  }

  // Flush
  if (isFlush) {
    return {
      rank: 'flush',
      score: encodeScore(HAND_RANK_VALUE.flush, values),
      description: `Flush — ${rankSingular(values[0])} high`,
    };
  }

  // Straight
  if (isStraight) {
    return {
      rank: 'straight',
      score: encodeScore(HAND_RANK_VALUE.straight, [straightHigh]),
      description: `Straight — ${rankSingular(straightHigh)} high`,
    };
  }

  // Three of a kind
  if (groups[0].cnt === 3) {
    const kickers = groups.filter(g => g.cnt === 1).map(g => g.val);
    return {
      rank: 'three_of_a_kind',
      score: encodeScore(HAND_RANK_VALUE.three_of_a_kind, [groups[0].val, ...kickers]),
      description: `Three of a Kind — ${rankName(groups[0].val)}`,
    };
  }

  // Two pair
  if (groups[0].cnt === 2 && groups[1].cnt === 2) {
    const highPair = Math.max(groups[0].val, groups[1].val);
    const lowPair = Math.min(groups[0].val, groups[1].val);
    const kicker = groups[2].val;
    return {
      rank: 'two_pair',
      score: encodeScore(HAND_RANK_VALUE.two_pair, [highPair, lowPair, kicker]),
      description: `Two Pair — ${rankName(highPair)} and ${rankName(lowPair)}`,
    };
  }

  // Pair
  if (groups[0].cnt === 2) {
    const kickers = groups.filter(g => g.cnt === 1).map(g => g.val);
    return {
      rank: 'pair',
      score: encodeScore(HAND_RANK_VALUE.pair, [groups[0].val, ...kickers]),
      description: `Pair of ${rankName(groups[0].val)}`,
    };
  }

  // High card
  return {
    rank: 'high_card',
    score: encodeScore(HAND_RANK_VALUE.high_card, values),
    description: `High Card — ${rankSingular(values[0])}`,
  };
}

export function evaluateHand(
  holeCards: Card[],
  communityCards: Card[]
): { rank: HandRank; score: number; description: string } {
  const allCards = [...holeCards, ...communityCards];

  // If fewer than 5 cards available, pad evaluation
  if (allCards.length < 5) {
    return evaluate5([...allCards, ...Array(5 - allCards.length).fill({ rank: '2', suit: 'spades' })]);
  }

  const combos = getCombinations(allCards, 5);
  let best = evaluate5(combos[0]);
  for (let i = 1; i < combos.length; i++) {
    const result = evaluate5(combos[i]);
    if (result.score > best.score) {
      best = result;
    }
  }
  return best;
}

// ─── Winners & Side Pots ──────────────────────────────────────────────────────

function buildSidePots(players: PlayerState[]): { amount: number; eligiblePlayerIds: string[] }[] {
  // Gather all-in amounts from players who are still in (not folded)
  const activePlayers = players.filter(p => !p.isFolded);
  const allInAmounts = activePlayers
    .filter(p => p.isAllIn)
    .map(p => p.totalBetThisRound)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);

  if (allInAmounts.length === 0) {
    // No all-ins — single pot
    const totalPot = players.reduce((sum, p) => sum + p.totalBetThisRound, 0);
    if (totalPot === 0) return [];
    return [{
      amount: totalPot,
      eligiblePlayerIds: activePlayers.map(p => p.id),
    }];
  }

  const pots: { amount: number; eligiblePlayerIds: string[] }[] = [];
  let prevCap = 0;

  for (const cap of allInAmounts) {
    const layerSize = cap - prevCap;
    if (layerSize <= 0) continue;

    const eligible = activePlayers.filter(p => p.totalBetThisRound >= cap);
    const potAmount = players.reduce((sum, p) => {
      const contribution = Math.min(p.totalBetThisRound, cap) - Math.min(p.totalBetThisRound, prevCap);
      return sum + Math.max(0, contribution);
    }, 0);

    if (potAmount > 0) {
      pots.push({ amount: potAmount, eligiblePlayerIds: eligible.map(p => p.id) });
    }
    prevCap = cap;
  }

  // Remaining pot above highest all-in
  const maxAllIn = allInAmounts[allInAmounts.length - 1];
  const remainingEligible = activePlayers.filter(p => p.totalBetThisRound > maxAllIn);
  if (remainingEligible.length > 0) {
    const remainingAmount = players.reduce((sum, p) => {
      return sum + Math.max(0, p.totalBetThisRound - maxAllIn);
    }, 0);
    if (remainingAmount > 0) {
      pots.push({ amount: remainingAmount, eligiblePlayerIds: remainingEligible.map(p => p.id) });
    }
  }

  return pots;
}

export function determineWinners(
  gameState: GameState
): { playerId: string; amount: number; handRank: HandRank }[] {
  const { players, communityCards } = gameState;
  const activePlayers = players.filter(p => !p.isFolded);

  // If only one player left (everyone else folded), they win the full pot
  if (activePlayers.length === 1) {
    const totalPot = players.reduce((sum, p) => sum + p.totalBetThisRound, 0);
    return [{
      playerId: activePlayers[0].id,
      amount: totalPot,
      handRank: 'high_card',
    }];
  }

  // Evaluate each active player's hand
  const evaluations = activePlayers.map(p => ({
    player: p,
    eval: evaluateHand(p.holeCards, communityCards),
  }));

  // Build side pots
  const sidePots = buildSidePots(players);
  const winners: { playerId: string; amount: number; handRank: HandRank }[] = [];

  for (const pot of sidePots) {
    // Find eligible players for this pot
    const eligible = evaluations.filter(e => pot.eligiblePlayerIds.includes(e.player.id));
    if (eligible.length === 0) continue;

    // Find best score
    const bestScore = Math.max(...eligible.map(e => e.eval.score));
    const potWinners = eligible.filter(e => e.eval.score === bestScore);

    // Split pot among winners
    const share = Math.floor(pot.amount / potWinners.length);
    const remainder = pot.amount - share * potWinners.length;

    potWinners.forEach((w, i) => {
      const existing = winners.find(x => x.playerId === w.player.id);
      const bonus = i === 0 ? remainder : 0; // first winner gets odd chip
      if (existing) {
        existing.amount += share + bonus;
      } else {
        winners.push({
          playerId: w.player.id,
          amount: share + bonus,
          handRank: w.eval.rank,
        });
      }
    });
  }

  return winners;
}

// ─── Valid Actions ─────────────────────────────────────────────────────────────

export function getValidActions(
  gameState: GameState,
  playerId: string
): PlayerAction[] {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player || player.isFolded || player.isAllIn) return [];

  const actions: PlayerAction[] = [];

  // Can always fold
  actions.push('fold');

  // Can check if no bet to call
  if (gameState.currentBet === player.totalBetThisRound) {
    actions.push('check');
  }

  // Can call if there's a bet to match and player has chips
  const toCall = gameState.currentBet - player.totalBetThisRound;
  if (toCall > 0 && player.chips > 0) {
    // If call amount >= chips, they can only all-in (not call)
    if (player.chips > toCall) {
      actions.push('call');
    }
  }

  // Can raise if has enough chips (min raise = currentBet * 2 from their perspective)
  const minRaise = gameState.currentBet + gameState.bigBlind;
  const chipsNeeded = minRaise - player.totalBetThisRound;
  if (player.chips > chipsNeeded) {
    actions.push('raise');
  }

  // Can all-in if has chips
  if (player.chips > 0) {
    actions.push('all_in');
  }

  return actions;
}

// ─── Apply Action ─────────────────────────────────────────────────────────────

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function getNextActivePlayerIndex(players: PlayerState[], fromIndex: number): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (fromIndex + i) % n;
    if (!players[idx].isFolded && !players[idx].isAllIn) {
      return idx;
    }
  }
  return -1; // No active players
}

function isRoundComplete(state: GameState): boolean {
  const activePlayers = state.players.filter(p => !p.isFolded && !p.isAllIn);

  // If no active (non-all-in, non-folded) players, round is done
  if (activePlayers.length === 0) return true;

  // If only one non-folded player total (including all-in), hand is over
  const nonFolded = state.players.filter(p => !p.isFolded);
  if (nonFolded.length <= 1) return true;

  // All active players must have matched the current bet and had a chance to act
  return activePlayers.every(p =>
    p.totalBetThisRound === state.currentBet && p.lastAction !== undefined
  );
}

function advancePhase(state: GameState): GameState {
  const nonFolded = state.players.filter(p => !p.isFolded);

  // If only 1 player left, go straight to showdown
  if (nonFolded.length <= 1) {
    state.phase = 'showdown';
    state.winners = determineWinners(state);
    return state;
  }

  // If all remaining players are all-in (or only one isn't), deal remaining boards
  const canAct = nonFolded.filter(p => !p.isAllIn);
  const allCommitted = canAct.length <= 1;

  switch (state.phase) {
    case 'preflop':
      state.phase = 'flop';
      state.communityCards.push(state.deck.pop()!, state.deck.pop()!, state.deck.pop()!);
      break;
    case 'flop':
      state.phase = 'turn';
      state.communityCards.push(state.deck.pop()!);
      break;
    case 'turn':
      state.phase = 'river';
      state.communityCards.push(state.deck.pop()!);
      break;
    case 'river':
      state.phase = 'showdown';
      state.winners = determineWinners(state);
      return state;
  }

  // Reset bets for new street
  for (const p of state.players) {
    p.bet = 0;
    p.lastAction = undefined;
  }
  state.currentBet = 0;

  // If all committed (everyone all-in), keep advancing through remaining streets
  if (allCommitted && state.phase !== 'showdown') {
    return advancePhase(state);
  }

  // Set action to first active player after dealer
  const firstToAct = getNextActivePlayerIndex(state.players, state.dealerIndex);
  if (firstToAct === -1) {
    // Everyone is all-in, advance to showdown
    return advancePhase(state);
  }
  state.currentPlayerIndex = firstToAct;

  return state;
}

export function applyAction(
  gameState: GameState,
  playerId: string,
  action: string,
  amount?: number
): GameState {
  const state = deepClone(gameState);
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex];

  switch (action) {
    case 'fold':
      player.isFolded = true;
      player.lastAction = 'fold';
      state.lastAction = `${player.name} folded`;
      break;

    case 'check':
      player.lastAction = 'check';
      state.lastAction = `${player.name} checked`;
      break;

    case 'call': {
      const toCall = Math.min(state.currentBet - player.totalBetThisRound, player.chips);
      player.chips -= toCall;
      player.bet += toCall;
      player.totalBetThisRound += toCall;
      state.pot += toCall;
      player.lastAction = 'call';
      state.lastAction = `${player.name} called $${toCall}`;
      if (player.chips === 0) player.isAllIn = true;
      break;
    }

    case 'raise': {
      const raiseAmount = amount || state.currentBet * 2;
      const totalNeeded = raiseAmount - player.totalBetThisRound;
      const actualAmount = Math.min(totalNeeded, player.chips);
      player.chips -= actualAmount;
      player.bet += actualAmount;
      player.totalBetThisRound += actualAmount;
      state.pot += actualAmount;
      state.currentBet = player.totalBetThisRound;
      player.lastAction = 'raise';
      state.lastAction = `${player.name} raised to $${state.currentBet}`;
      if (player.chips === 0) player.isAllIn = true;
      // Reset other active players' lastAction so they get a chance to act again
      for (const p of state.players) {
        if (p.id !== playerId && !p.isFolded && !p.isAllIn) {
          p.lastAction = undefined;
        }
      }
      break;
    }

    case 'all_in': {
      const allInAmount = player.chips;
      player.totalBetThisRound += allInAmount;
      player.bet += allInAmount;
      state.pot += allInAmount;
      player.chips = 0;
      player.isAllIn = true;
      player.lastAction = 'all_in';

      if (player.totalBetThisRound > state.currentBet) {
        state.currentBet = player.totalBetThisRound;
        state.lastAction = `${player.name} went all-in for $${allInAmount}`;
        // Reset other active players' lastAction for re-action
        for (const p of state.players) {
          if (p.id !== playerId && !p.isFolded && !p.isAllIn) {
            p.lastAction = undefined;
          }
        }
      } else {
        state.lastAction = `${player.name} went all-in for $${allInAmount}`;
      }
      break;
    }
  }

  // Check if round is complete
  if (isRoundComplete(state)) {
    // Update side pots before advancing
    state.sidePots = buildSidePots(state.players);
    return advancePhase(state);
  }

  // Move to next active player
  const nextIdx = getNextActivePlayerIndex(state.players, playerIndex);
  if (nextIdx === -1) {
    state.sidePots = buildSidePots(state.players);
    return advancePhase(state);
  }
  state.currentPlayerIndex = nextIdx;

  return state;
}

// ─── AI Logic ─────────────────────────────────────────────────────────────────

function getHandStrengthPreflop(holeCards: Card[]): 'strong' | 'medium' | 'weak' {
  const v1 = RANK_VALUE[holeCards[0].rank];
  const v2 = RANK_VALUE[holeCards[1].rank];
  const isPair = v1 === v2;
  const isSuited = holeCards[0].suit === holeCards[1].suit;
  const high = Math.max(v1, v2);
  const low = Math.min(v1, v2);

  // Strong: pair 9+, AK, AQ, AJs, KQs
  if (isPair && high >= 9) return 'strong';
  if (high === 14 && low >= 12) return 'strong'; // AK, AQ
  if (high === 14 && low === 11 && isSuited) return 'strong'; // AJs
  if (high === 13 && low === 12 && isSuited) return 'strong'; // KQs

  // Medium: pair 5-8, any A, KQ, KJ, QJ suited, connected suited 8+
  if (isPair && high >= 5) return 'medium';
  if (high === 14) return 'medium'; // any Ax
  if (high === 13 && low >= 11) return 'medium'; // KQ, KJ
  if (isSuited && high === 12 && low === 11) return 'medium'; // QJs
  if (isSuited && high - low === 1 && low >= 8) return 'medium'; // connected suited 8+

  // Weak: everything else
  return 'weak';
}

function getPostflopStrength(
  holeCards: Card[],
  communityCards: Card[]
): 'very_strong' | 'strong' | 'medium' | 'weak' {
  const eval_ = evaluateHand(holeCards, communityCards);
  const rankVal = HAND_RANK_VALUE[eval_.rank];

  if (rankVal >= HAND_RANK_VALUE.three_of_a_kind) return 'very_strong';
  if (rankVal >= HAND_RANK_VALUE.two_pair) return 'strong';

  // Check for top pair
  if (eval_.rank === 'pair') {
    const communityValues = communityCards.map(c => RANK_VALUE[c.rank]);
    const holeValues = holeCards.map(c => RANK_VALUE[c.rank]);
    const topCommunity = Math.max(...communityValues);
    if (holeValues.some(v => v === topCommunity || v >= 11)) return 'medium';
  }

  return 'weak';
}

export function getAIAction(
  gameState: GameState,
  playerId: string
): { action: string; amount?: number } {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return { action: 'fold' };

  const validActions = getValidActions(gameState, playerId);
  if (validActions.length === 0) return { action: 'check' };

  const rand = Math.random();
  const toCall = gameState.currentBet - player.totalBetThisRound;
  const isShortStacked = player.chips < gameState.bigBlind * 10;

  // Preflop logic
  if (gameState.phase === 'preflop') {
    const strength = getHandStrengthPreflop(player.holeCards);

    if (strength === 'strong') {
      if (validActions.includes('raise')) {
        const raiseAmount = gameState.currentBet + gameState.bigBlind * (rand < 0.5 ? 3 : 4);
        return { action: 'raise', amount: Math.min(raiseAmount, player.totalBetThisRound + player.chips) };
      }
      if (validActions.includes('call')) return { action: 'call' };
      return { action: 'check' };
    }

    if (strength === 'medium') {
      // Call if cheap, fold to big raises
      if (toCall > gameState.bigBlind * 6) {
        return rand < 0.3 ? { action: 'call' } : { action: 'fold' };
      }
      if (validActions.includes('call')) return { action: 'call' };
      if (validActions.includes('check')) return { action: 'check' };
      // Occasionally raise with medium hands
      if (validActions.includes('raise') && rand < 0.2) {
        return { action: 'raise', amount: gameState.currentBet + gameState.bigBlind * 2 };
      }
      return { action: validActions.includes('check') ? 'check' : 'fold' };
    }

    // Weak hands
    if (toCall === 0 && validActions.includes('check')) return { action: 'check' };
    if (rand < 0.15 && validActions.includes('call') && toCall <= gameState.bigBlind * 2) {
      return { action: 'call' }; // Limp occasionally
    }
    return { action: 'fold' };
  }

  // Post-flop logic
  const postStrength = getPostflopStrength(player.holeCards, gameState.communityCards);

  if (postStrength === 'very_strong') {
    // Bet/raise with very strong hands
    if (isShortStacked && validActions.includes('all_in')) {
      return { action: 'all_in' };
    }
    if (validActions.includes('raise')) {
      const raiseAmount = gameState.currentBet + Math.floor(gameState.pot * (0.5 + rand * 0.5));
      return { action: 'raise', amount: Math.min(raiseAmount, player.totalBetThisRound + player.chips) };
    }
    if (validActions.includes('call')) return { action: 'call' };
    return { action: 'check' };
  }

  if (postStrength === 'strong') {
    if (validActions.includes('raise') && rand < 0.4) {
      const raiseAmount = gameState.currentBet + Math.floor(gameState.pot * 0.5);
      return { action: 'raise', amount: Math.min(raiseAmount, player.totalBetThisRound + player.chips) };
    }
    if (validActions.includes('call')) return { action: 'call' };
    if (validActions.includes('check')) return { action: 'check' };
    return { action: 'fold' };
  }

  if (postStrength === 'medium') {
    if (toCall === 0 && validActions.includes('check')) {
      // Bet sometimes with medium hands
      if (validActions.includes('raise') && rand < 0.3) {
        const raiseAmount = gameState.currentBet + Math.floor(gameState.pot * 0.4);
        return { action: 'raise', amount: Math.min(raiseAmount, player.totalBetThisRound + player.chips) };
      }
      return { action: 'check' };
    }
    if (toCall <= gameState.pot * 0.3 && validActions.includes('call')) return { action: 'call' };
    return rand < 0.2 ? { action: 'call' } : { action: 'fold' };
  }

  // Weak hand post-flop
  if (toCall === 0 && validActions.includes('check')) {
    // River bluff 10% of the time
    if (gameState.phase === 'river' && rand < 0.1 && validActions.includes('raise')) {
      const bluffAmount = gameState.currentBet + Math.floor(gameState.pot * 0.5);
      return { action: 'raise', amount: Math.min(bluffAmount, player.totalBetThisRound + player.chips) };
    }
    return { action: 'check' };
  }

  // Fold to bets with weak hands (occasionally call small bets)
  if (toCall <= gameState.bigBlind * 2 && rand < 0.15 && validActions.includes('call')) {
    return { action: 'call' };
  }
  return { action: 'fold' };
}

// ─── Initialize Hand ──────────────────────────────────────────────────────────

export function initializeHand(
  players: PlayerState[],
  dealerIndex: number,
  blinds: { small: number; big: number },
  handNumber: number = 1
): GameState {
  const deck = createDeck();
  const n = players.length;

  // Reset player state for new hand
  const newPlayers: PlayerState[] = players.map((p, i) => ({
    ...p,
    holeCards: [],
    bet: 0,
    totalBetThisRound: 0,
    isAllIn: false,
    isFolded: false,
    isDealer: i === dealerIndex,
    lastAction: undefined,
  }));

  // Deal 2 cards to each player
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < n; i++) {
      const idx = (dealerIndex + 1 + i) % n;
      newPlayers[idx].holeCards.push(deck.pop()!);
    }
  }

  // Post blinds
  const sbIndex = n === 2 ? dealerIndex : (dealerIndex + 1) % n;
  const bbIndex = n === 2 ? (dealerIndex + 1) % n : (dealerIndex + 2) % n;

  const sbPlayer = newPlayers[sbIndex];
  const sbAmount = Math.min(blinds.small, sbPlayer.chips);
  sbPlayer.chips -= sbAmount;
  sbPlayer.bet = sbAmount;
  sbPlayer.totalBetThisRound = sbAmount;
  if (sbPlayer.chips === 0) sbPlayer.isAllIn = true;

  const bbPlayer = newPlayers[bbIndex];
  const bbAmount = Math.min(blinds.big, bbPlayer.chips);
  bbPlayer.chips -= bbAmount;
  bbPlayer.bet = bbAmount;
  bbPlayer.totalBetThisRound = bbAmount;
  if (bbPlayer.chips === 0) bbPlayer.isAllIn = true;

  // First to act preflop is UTG (after BB)
  const utgIndex = (bbIndex + 1) % n;
  // Find first active player from UTG
  let firstToAct = utgIndex;
  for (let i = 0; i < n; i++) {
    const idx = (utgIndex + i) % n;
    if (!newPlayers[idx].isFolded && !newPlayers[idx].isAllIn) {
      firstToAct = idx;
      break;
    }
  }

  return {
    players: newPlayers,
    communityCards: [],
    deck,
    phase: 'preflop',
    pot: sbAmount + bbAmount,
    sidePots: [],
    currentPlayerIndex: firstToAct,
    dealerIndex,
    smallBlindIndex: sbIndex,
    bigBlindIndex: bbIndex,
    currentBet: blinds.big,
    smallBlind: blinds.small,
    bigBlind: blinds.big,
    handNumber,
    lastAction: undefined,
    winners: undefined,
  };
}
