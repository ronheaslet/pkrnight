import { query } from '../db/client.js'

const DEFAULT_POSITION_POINTS = [
  { position: 1, points: 10 },
  { position: 2, points: 7 },
  { position: 3, points: 5 },
  { position: 4, points: 3 },
  { position: 5, points: 2 }
]

export async function calculatePoints(leagueId, participants) {
  // Fetch league's points structure
  const { rows: structures } = await query(
    `SELECT * FROM points_structures WHERE league_id = $1 AND is_default = true LIMIT 1`,
    [leagueId]
  )

  let participationPoints = 1
  let bountyPoints = 1
  let positionPoints = DEFAULT_POSITION_POINTS

  if (structures.length > 0) {
    const structure = structures[0]
    participationPoints = structure.participation_points || 1
    bountyPoints = structure.bounty_points || 1
    if (structure.position_points) {
      positionPoints = structure.position_points
    }
  }

  const results = {}

  for (const p of participants) {
    let total = participationPoints

    // Position points
    if (p.finish_position) {
      const posEntry = positionPoints.find(pp => pp.position === p.finish_position)
      if (posEntry) {
        total += posEntry.points
      }
    }

    // Bounty points
    if (p.bounty_count > 0) {
      total += p.bounty_count * bountyPoints
    }

    results[p.id] = total
  }

  return results
}
