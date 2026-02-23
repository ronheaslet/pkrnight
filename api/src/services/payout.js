import { query } from '../db/client.js'

const DEFAULT_PAYOUTS = [
  { min: 2, max: 4, first: 100, second: 0, third: 0 },
  { min: 5, max: 7, first: 70, second: 30, third: 0 },
  { min: 8, max: 12, first: 50, second: 30, third: 20 },
  { min: 13, max: 999, first: 50, second: 25, third: 15, fourth: 10 }
]

export async function calculatePayouts(leagueId, playerCount, prizePool) {
  // Try to find league's payout structure
  const { rows: structures } = await query(
    `SELECT id FROM payout_structures WHERE league_id = $1 AND is_default = true LIMIT 1`,
    [leagueId]
  )

  if (structures.length > 0) {
    const { rows: tiers } = await query(
      `SELECT * FROM payout_tiers WHERE structure_id = $1 AND min_players <= $2 AND max_players >= $2 LIMIT 1`,
      [structures[0].id, playerCount]
    )

    if (tiers.length > 0) {
      const tier = tiers[0]
      const payouts = {}
      if (tier.first_place_pct > 0) payouts[1] = Math.round(prizePool * tier.first_place_pct / 100 * 100) / 100
      if (tier.second_place_pct > 0) payouts[2] = Math.round(prizePool * tier.second_place_pct / 100 * 100) / 100
      if (tier.third_place_pct > 0) payouts[3] = Math.round(prizePool * tier.third_place_pct / 100 * 100) / 100
      if (tier.fourth_place_pct > 0) payouts[4] = Math.round(prizePool * tier.fourth_place_pct / 100 * 100) / 100
      if (tier.fifth_place_pct > 0) payouts[5] = Math.round(prizePool * tier.fifth_place_pct / 100 * 100) / 100
      return payouts
    }
  }

  // Fallback to defaults
  const tier = DEFAULT_PAYOUTS.find(t => playerCount >= t.min && playerCount <= t.max) || DEFAULT_PAYOUTS[0]
  const payouts = {}
  if (tier.first > 0) payouts[1] = Math.round(prizePool * tier.first / 100 * 100) / 100
  if (tier.second > 0) payouts[2] = Math.round(prizePool * tier.second / 100 * 100) / 100
  if (tier.third > 0) payouts[3] = Math.round(prizePool * tier.third / 100 * 100) / 100
  if (tier.fourth > 0) payouts[4] = Math.round(prizePool * tier.fourth / 100 * 100) / 100
  return payouts
}
