/**
 * Shared constants for PKR Night
 */

// Default timer duration in seconds (15 minutes)
export const DEFAULT_TIMER_SECONDS = 15 * 60

// Default buy-in amount
export const DEFAULT_BUY_IN = 20

// Default payout tiers (configurable per league)
export const DEFAULT_PAYOUT_TIERS = [
  { place: 1, percentage: 50 },
  { place: 2, percentage: 30 },
  { place: 3, percentage: 20 },
]

// Voice announcement phrases for timer
export const VOICE_PHRASES = {
  blindUp: (level, sb, bb, ante) =>
    `Blinds up! Level ${level}. Blinds are ${sb} and ${bb}${ante > 0 ? `. Ante is ${ante}` : ''}.`,
  fiveMinutes: 'Five minutes remaining in this level.',
  oneMinute: 'One minute remaining in this level.',
  thirtySeconds: 'Thirty seconds remaining.',
  gameStart: 'Game is starting. Good luck everyone!',
  gameEnd: 'Game over. Thank you for playing!',
}

// Timer sync interval in milliseconds
export const TIMER_SYNC_INTERVAL = 10000

// Fallback blind structure
export const FALLBACK_BLINDS = [
  { level: 1, sb: 25, bb: 50, ante: 0, duration: 15 },
  { level: 2, sb: 50, bb: 100, ante: 0, duration: 15 },
  { level: 3, sb: 75, bb: 150, ante: 0, duration: 15 },
  { level: 4, sb: 100, bb: 200, ante: 25, duration: 15 },
  { level: 5, sb: 150, bb: 300, ante: 25, duration: 15 },
  { level: 6, sb: 200, bb: 400, ante: 50, duration: 15 },
  { level: 7, sb: 300, bb: 600, ante: 75, duration: 15 },
  { level: 8, sb: 400, bb: 800, ante: 100, duration: 15 },
  { level: 9, sb: 500, bb: 1000, ante: 100, duration: 15 },
  { level: 10, sb: 600, bb: 1200, ante: 200, duration: 15 },
  { level: 11, sb: 800, bb: 1600, ante: 200, duration: 12 },
  { level: 12, sb: 1000, bb: 2000, ante: 300, duration: 12 },
  { level: 13, sb: 1500, bb: 3000, ante: 400, duration: 12 },
  { level: 14, sb: 2000, bb: 4000, ante: 500, duration: 12 },
  { level: 15, sb: 3000, bb: 6000, ante: 1000, duration: 10 },
]

// Avatar options for user profiles
export const AVATAR_OPTIONS = {
  'spade': { emoji: '♠️', bg: 'bg-gray-800' },
  'heart': { emoji: '♥️', bg: 'bg-red-900' },
  'diamond': { emoji: '♦️', bg: 'bg-blue-900' },
  'club': { emoji: '♣️', bg: 'bg-green-900' },
  'ace': { emoji: '🂡', bg: 'bg-purple-900' },
  'king': { emoji: '👑', bg: 'bg-gold/80' },
  'joker': { emoji: '🃏', bg: 'bg-pink-900' },
  'chip-red': { emoji: '🔴', bg: 'bg-chip-red' },
  'chip-blue': { emoji: '🔵', bg: 'bg-chip-blue' },
  'chip-green': { emoji: '🟢', bg: 'bg-green-600' },
  'dice': { emoji: '🎲', bg: 'bg-gray-700' },
  'money': { emoji: '💰', bg: 'bg-yellow-700' },
  'fire': { emoji: '🔥', bg: 'bg-orange-700' },
  'star': { emoji: '⭐', bg: 'bg-yellow-600' },
  'skull': { emoji: '💀', bg: 'bg-gray-900' },
  'rocket': { emoji: '🚀', bg: 'bg-indigo-700' },
}

// Trophy category metadata
export const TROPHY_CATEGORIES = {
  points: { emoji: '🏆', title: 'Points Champion', color: 'gold' },
  bounty: { emoji: '🎯', title: 'Bounty King', color: 'red' },
  earnings: { emoji: '💰', title: 'Money Leader', color: 'green' },
  survival: { emoji: '🛡️', title: 'Iron Man', color: 'purple' },
}
