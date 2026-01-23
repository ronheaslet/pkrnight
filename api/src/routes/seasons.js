import { Hono } from 'hono'
import { query, withTransaction } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { ValidationError, ForbiddenError } from '../lib/errors.js'

const seasons = new Hono()

seasons.use('*', authMiddleware)

async function requireLeagueAdmin(userId, leagueId) {
  const { rows } = await query(
    `SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [leagueId, userId]
  )
  if (rows.length === 0) throw new ForbiddenError('Not a member of this league')
  if (rows[0].role !== 'owner' && rows[0].role !== 'admin') {
    throw new ForbiddenError('Admin access required')
  }
  return rows[0]
}

async function requireLeagueMember(userId, leagueId) {
  const { rows } = await query(
    `SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [leagueId, userId]
  )
  if (rows.length === 0) throw new ForbiddenError('Not a member of this league')
  return rows[0]
}

// Get all seasons for a league
seasons.get('/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueMember(user.id, leagueId)

  const { rows } = await query(
    `SELECT * FROM seasons WHERE league_id = $1 ORDER BY year DESC`,
    [leagueId]
  )

  return c.json({ success: true, data: { seasons: rows } })
})

// Get current active season
seasons.get('/league/:leagueId/current', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueMember(user.id, leagueId)

  const { rows } = await query(
    `SELECT * FROM seasons WHERE league_id = $1 AND status = 'active' ORDER BY year DESC LIMIT 1`,
    [leagueId]
  )

  return c.json({ success: true, data: { season: rows[0] || null } })
})

// Create a new season
seasons.post('/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueAdmin(user.id, leagueId)

  const { year, name } = await c.req.json()
  const seasonYear = year || new Date().getFullYear()

  // Check if season already exists
  const { rows: existing } = await query(
    `SELECT id FROM seasons WHERE league_id = $1 AND year = $2`,
    [leagueId, seasonYear]
  )
  if (existing.length > 0) {
    throw new ValidationError(`Season ${seasonYear} already exists`)
  }

  const { rows } = await query(
    `INSERT INTO seasons (league_id, year, name, status)
     VALUES ($1, $2, $3, 'active') RETURNING *`,
    [leagueId, seasonYear, name || `${seasonYear} Season`]
  )

  return c.json({ success: true, data: { season: rows[0] } }, 201)
})

// Close a season (calculates trophies)
seasons.post('/:seasonId/close', async (c) => {
  const user = c.get('user')
  const seasonId = c.req.param('seasonId')

  const { rows: seasonRows } = await query(`SELECT * FROM seasons WHERE id = $1`, [seasonId])
  if (seasonRows.length === 0) throw new ValidationError('Season not found')

  const season = seasonRows[0]
  await requireLeagueAdmin(user.id, season.league_id)

  if (season.status === 'closed') {
    throw new ValidationError('Season is already closed')
  }

  await withTransaction(async (client) => {
    // Close the season
    await client.query(
      `UPDATE seasons SET status = 'closed', closed_at = NOW() WHERE id = $1`,
      [seasonId]
    )

    // Calculate and award trophies
    const { rows: members } = await client.query(
      `SELECT lm.user_id, lm.total_points, lm.total_wins, lm.total_winnings, lm.total_bounties, lm.games_played
       FROM league_members lm
       WHERE lm.league_id = $1 AND lm.status = 'active' AND lm.games_played > 0
       ORDER BY lm.total_points DESC`,
      [season.league_id]
    )

    if (members.length > 0) {
      // Remove existing trophies for this season
      await client.query(
        `DELETE FROM trophies WHERE league_id = $1 AND season_year = $2`,
        [season.league_id, season.year]
      )

      const awards = []

      // Points Champion
      awards.push({ userId: members[0].user_id, type: 'points_champion', value: members[0].total_points })

      // Bounty King
      const bountyKing = [...members].sort((a, b) => (b.total_bounties || 0) - (a.total_bounties || 0))[0]
      if (bountyKing.total_bounties > 0) {
        awards.push({ userId: bountyKing.user_id, type: 'bounty_king', value: bountyKing.total_bounties })
      }

      // Money Maker
      const moneyMaker = [...members].sort((a, b) => parseFloat(b.total_winnings || 0) - parseFloat(a.total_winnings || 0))[0]
      if (parseFloat(moneyMaker.total_winnings) > 0) {
        awards.push({ userId: moneyMaker.user_id, type: 'money_maker', value: parseFloat(moneyMaker.total_winnings) })
      }

      // Most Wins
      const mostWins = [...members].sort((a, b) => (b.total_wins || 0) - (a.total_wins || 0))[0]
      if (mostWins.total_wins > 0) {
        awards.push({ userId: mostWins.user_id, type: 'most_wins', value: mostWins.total_wins })
      }

      // Iron Player
      const ironPlayer = [...members].sort((a, b) => b.games_played - a.games_played)[0]
      awards.push({ userId: ironPlayer.user_id, type: 'iron_player', value: ironPlayer.games_played })

      for (const award of awards) {
        await client.query(
          `INSERT INTO trophies (league_id, user_id, trophy_type, season_year, stat_value)
           VALUES ($1, $2, $3, $4, $5)`,
          [season.league_id, award.userId, award.type, season.year, award.value]
        )
      }

      // Create notifications for trophy winners
      for (const award of awards) {
        await client.query(
          `INSERT INTO notifications (user_id, league_id, type, title, body, data)
           VALUES ($1, $2, 'trophy_awarded', $3, $4, $5)`,
          [
            award.userId,
            season.league_id,
            `You won a trophy!`,
            `${season.year} Season: ${award.type.replace(/_/g, ' ')}`,
            JSON.stringify({ trophy_type: award.type, season_year: season.year, stat_value: award.value })
          ]
        )
      }
    }

    // Reset member stats for new season
    await client.query(
      `UPDATE league_members SET games_played = 0, total_wins = 0, total_points = 0,
       total_winnings = 0, total_bounties = 0 WHERE league_id = $1`,
      [season.league_id]
    )
  })

  return c.json({ success: true, data: { message: 'Season closed and trophies awarded' } })
})

export default seasons
