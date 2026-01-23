import { Hono } from 'hono'
import { query, withTransaction } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { ValidationError, NotFoundError, ForbiddenError } from '../lib/errors.js'

const trophies = new Hono()

trophies.use('*', authMiddleware)

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

// Get trophies for a league
trophies.get('/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueMember(user.id, leagueId)

  const { rows } = await query(
    `SELECT t.*, p.display_name, p.avatar_url
     FROM trophies t
     JOIN profiles p ON p.user_id = t.user_id
     WHERE t.league_id = $1
     ORDER BY t.season_year DESC, t.trophy_type`,
    [leagueId]
  )

  return c.json({ success: true, data: { trophies: rows } })
})

// Get trophies for a specific user in a league
trophies.get('/league/:leagueId/user/:userId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  const userId = c.req.param('userId')
  await requireLeagueMember(user.id, leagueId)

  const { rows } = await query(
    `SELECT * FROM trophies WHERE league_id = $1 AND user_id = $2 ORDER BY season_year DESC, trophy_type`,
    [leagueId, userId]
  )

  return c.json({ success: true, data: { trophies: rows } })
})

// Calculate and award trophies for a season year
trophies.post('/league/:leagueId/calculate', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueAdmin(user.id, leagueId)

  const { year } = await c.req.json()
  const seasonYear = year || new Date().getFullYear()

  // Get all members with games played
  const { rows: members } = await query(
    `SELECT lm.user_id, lm.total_points, lm.total_wins, lm.total_winnings, lm.total_bounties, lm.games_played
     FROM league_members lm
     WHERE lm.league_id = $1 AND lm.status = 'active' AND lm.games_played > 0
     ORDER BY lm.total_points DESC`,
    [leagueId]
  )

  if (members.length === 0) {
    throw new ValidationError('No players with games played')
  }

  const awards = []

  // Points Champion - highest total points
  const pointsChamp = members[0]
  awards.push({ userId: pointsChamp.user_id, type: 'points_champion', value: pointsChamp.total_points })

  // Bounty King - most bounties
  const bountyKing = [...members].sort((a, b) => (b.total_bounties || 0) - (a.total_bounties || 0))[0]
  if (bountyKing.total_bounties > 0) {
    awards.push({ userId: bountyKing.user_id, type: 'bounty_king', value: bountyKing.total_bounties })
  }

  // Money Maker - highest earnings
  const moneyMaker = [...members].sort((a, b) => parseFloat(b.total_winnings || 0) - parseFloat(a.total_winnings || 0))[0]
  if (parseFloat(moneyMaker.total_winnings) > 0) {
    awards.push({ userId: moneyMaker.user_id, type: 'money_maker', value: parseFloat(moneyMaker.total_winnings) })
  }

  // Most Wins
  const mostWins = [...members].sort((a, b) => (b.total_wins || 0) - (a.total_wins || 0))[0]
  if (mostWins.total_wins > 0) {
    awards.push({ userId: mostWins.user_id, type: 'most_wins', value: mostWins.total_wins })
  }

  // Iron Player - most games played
  const ironPlayer = [...members].sort((a, b) => b.games_played - a.games_played)[0]
  awards.push({ userId: ironPlayer.user_id, type: 'iron_player', value: ironPlayer.games_played })

  await withTransaction(async (client) => {
    // Remove existing trophies for this league+year
    await client.query(
      `DELETE FROM trophies WHERE league_id = $1 AND season_year = $2`,
      [leagueId, seasonYear]
    )

    for (const award of awards) {
      await client.query(
        `INSERT INTO trophies (league_id, user_id, trophy_type, season_year, stat_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [leagueId, award.userId, award.type, seasonYear, award.value]
      )
    }
  })

  return c.json({ success: true, data: { awards, seasonYear } })
})

export default trophies
