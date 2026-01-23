import { Hono } from 'hono'
import { query, withTransaction } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { ValidationError, NotFoundError, ForbiddenError } from '../lib/errors.js'

const structures = new Hono()

structures.use('*', authMiddleware)

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

// =====================
// BLIND STRUCTURES
// =====================

structures.get('/blinds/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueMember(user.id, leagueId)

  const { rows } = await query(
    `SELECT bs.*, (SELECT count(*) FROM blind_levels WHERE structure_id = bs.id) as level_count
     FROM blind_structures bs WHERE bs.league_id = $1 ORDER BY bs.is_default DESC, bs.name`,
    [leagueId]
  )
  return c.json({ success: true, data: { structures: rows } })
})

structures.get('/blinds/:id', async (c) => {
  const user = c.get('user')
  const structureId = c.req.param('id')

  const { rows: structRows } = await query('SELECT * FROM blind_structures WHERE id = $1', [structureId])
  if (structRows.length === 0) throw new NotFoundError('Blind structure')

  await requireLeagueMember(user.id, structRows[0].league_id)

  const { rows: levels } = await query(
    'SELECT * FROM blind_levels WHERE structure_id = $1 ORDER BY level_number',
    [structureId]
  )

  return c.json({ success: true, data: { structure: structRows[0], levels } })
})

structures.post('/blinds', async (c) => {
  const user = c.get('user')
  const { leagueId, name, levels } = await c.req.json()
  if (!leagueId || !name) throw new ValidationError('leagueId and name are required')
  await requireLeagueAdmin(user.id, leagueId)

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'INSERT INTO blind_structures (league_id, name) VALUES ($1, $2) RETURNING *',
      [leagueId, name]
    )
    const structure = rows[0]

    if (levels && levels.length > 0) {
      for (const level of levels) {
        await client.query(
          `INSERT INTO blind_levels (structure_id, level_number, small_blind, big_blind, ante, duration_minutes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [structure.id, level.levelNumber, level.smallBlind, level.bigBlind, level.ante || 0, level.durationMinutes]
        )
      }
    }

    return structure
  })

  return c.json({ success: true, data: { structure: result } }, 201)
})

structures.patch('/blinds/:id', async (c) => {
  const user = c.get('user')
  const structureId = c.req.param('id')

  const { rows: structRows } = await query('SELECT * FROM blind_structures WHERE id = $1', [structureId])
  if (structRows.length === 0) throw new NotFoundError('Blind structure')
  await requireLeagueAdmin(user.id, structRows[0].league_id)

  const { name, levels } = await c.req.json()

  await withTransaction(async (client) => {
    if (name !== undefined) {
      await client.query('UPDATE blind_structures SET name = $1 WHERE id = $2', [name, structureId])
    }
    if (levels !== undefined) {
      await client.query('DELETE FROM blind_levels WHERE structure_id = $1', [structureId])
      for (const level of levels) {
        await client.query(
          `INSERT INTO blind_levels (structure_id, level_number, small_blind, big_blind, ante, duration_minutes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [structureId, level.levelNumber, level.smallBlind, level.bigBlind, level.ante || 0, level.durationMinutes]
        )
      }
    }
  })

  return c.json({ success: true })
})

structures.delete('/blinds/:id', async (c) => {
  const user = c.get('user')
  const structureId = c.req.param('id')

  const { rows: structRows } = await query('SELECT * FROM blind_structures WHERE id = $1', [structureId])
  if (structRows.length === 0) throw new NotFoundError('Blind structure')
  await requireLeagueAdmin(user.id, structRows[0].league_id)

  // Prevent deletion if in use
  const { rows: inUse } = await query('SELECT id FROM events WHERE blind_structure_id = $1 LIMIT 1', [structureId])
  if (inUse.length > 0) throw new ValidationError('Cannot delete structure that is in use by events')

  await query('DELETE FROM blind_structures WHERE id = $1', [structureId])
  return c.json({ success: true })
})

structures.post('/blinds/:id/set-default', async (c) => {
  const user = c.get('user')
  const structureId = c.req.param('id')

  const { rows: structRows } = await query('SELECT * FROM blind_structures WHERE id = $1', [structureId])
  if (structRows.length === 0) throw new NotFoundError('Blind structure')
  await requireLeagueAdmin(user.id, structRows[0].league_id)

  await withTransaction(async (client) => {
    await client.query('UPDATE blind_structures SET is_default = false WHERE league_id = $1', [structRows[0].league_id])
    await client.query('UPDATE blind_structures SET is_default = true WHERE id = $1', [structureId])
  })

  return c.json({ success: true })
})

// =====================
// PAYOUT STRUCTURES
// =====================

structures.get('/payouts/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueMember(user.id, leagueId)

  const { rows } = await query(
    `SELECT ps.*, (SELECT count(*) FROM payout_tiers WHERE structure_id = ps.id) as tier_count
     FROM payout_structures ps WHERE ps.league_id = $1 ORDER BY ps.is_default DESC, ps.name`,
    [leagueId]
  )
  return c.json({ success: true, data: { structures: rows } })
})

structures.get('/payouts/:id', async (c) => {
  const user = c.get('user')
  const structureId = c.req.param('id')

  const { rows: structRows } = await query('SELECT * FROM payout_structures WHERE id = $1', [structureId])
  if (structRows.length === 0) throw new NotFoundError('Payout structure')
  await requireLeagueMember(user.id, structRows[0].league_id)

  const { rows: tiers } = await query(
    'SELECT * FROM payout_tiers WHERE structure_id = $1 ORDER BY min_players',
    [structureId]
  )

  return c.json({ success: true, data: { structure: structRows[0], tiers } })
})

structures.post('/payouts', async (c) => {
  const user = c.get('user')
  const { leagueId, name, tiers } = await c.req.json()
  if (!leagueId || !name) throw new ValidationError('leagueId and name are required')
  await requireLeagueAdmin(user.id, leagueId)

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'INSERT INTO payout_structures (league_id, name) VALUES ($1, $2) RETURNING *',
      [leagueId, name]
    )
    const structure = rows[0]

    if (tiers && tiers.length > 0) {
      for (const tier of tiers) {
        await client.query(
          `INSERT INTO payout_tiers (structure_id, min_players, max_players, first_place_pct, second_place_pct, third_place_pct, fourth_place_pct, fifth_place_pct)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [structure.id, tier.minPlayers, tier.maxPlayers, tier.firstPlacePct, tier.secondPlacePct || 0, tier.thirdPlacePct || 0, tier.fourthPlacePct || 0, tier.fifthPlacePct || 0]
        )
      }
    }

    return structure
  })

  return c.json({ success: true, data: { structure: result } }, 201)
})

structures.patch('/payouts/:id', async (c) => {
  const user = c.get('user')
  const structureId = c.req.param('id')

  const { rows: structRows } = await query('SELECT * FROM payout_structures WHERE id = $1', [structureId])
  if (structRows.length === 0) throw new NotFoundError('Payout structure')
  await requireLeagueAdmin(user.id, structRows[0].league_id)

  const { name, tiers } = await c.req.json()

  await withTransaction(async (client) => {
    if (name !== undefined) {
      await client.query('UPDATE payout_structures SET name = $1 WHERE id = $2', [name, structureId])
    }
    if (tiers !== undefined) {
      await client.query('DELETE FROM payout_tiers WHERE structure_id = $1', [structureId])
      for (const tier of tiers) {
        await client.query(
          `INSERT INTO payout_tiers (structure_id, min_players, max_players, first_place_pct, second_place_pct, third_place_pct, fourth_place_pct, fifth_place_pct)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [structureId, tier.minPlayers, tier.maxPlayers, tier.firstPlacePct, tier.secondPlacePct || 0, tier.thirdPlacePct || 0, tier.fourthPlacePct || 0, tier.fifthPlacePct || 0]
        )
      }
    }
  })

  return c.json({ success: true })
})

structures.delete('/payouts/:id', async (c) => {
  const user = c.get('user')
  const structureId = c.req.param('id')

  const { rows: structRows } = await query('SELECT * FROM payout_structures WHERE id = $1', [structureId])
  if (structRows.length === 0) throw new NotFoundError('Payout structure')
  await requireLeagueAdmin(user.id, structRows[0].league_id)

  const { rows: inUse } = await query('SELECT id FROM events WHERE payout_structure_id = $1 LIMIT 1', [structureId])
  if (inUse.length > 0) throw new ValidationError('Cannot delete structure that is in use by events')

  await query('DELETE FROM payout_structures WHERE id = $1', [structureId])
  return c.json({ success: true })
})

structures.post('/payouts/:id/set-default', async (c) => {
  const user = c.get('user')
  const structureId = c.req.param('id')

  const { rows: structRows } = await query('SELECT * FROM payout_structures WHERE id = $1', [structureId])
  if (structRows.length === 0) throw new NotFoundError('Payout structure')
  await requireLeagueAdmin(user.id, structRows[0].league_id)

  await withTransaction(async (client) => {
    await client.query('UPDATE payout_structures SET is_default = false WHERE league_id = $1', [structRows[0].league_id])
    await client.query('UPDATE payout_structures SET is_default = true WHERE id = $1', [structureId])
  })

  return c.json({ success: true })
})

// =====================
// POINTS STRUCTURES
// =====================

structures.get('/points/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueMember(user.id, leagueId)

  const { rows } = await query(
    'SELECT * FROM points_structures WHERE league_id = $1 ORDER BY is_default DESC, name',
    [leagueId]
  )
  return c.json({ success: true, data: { structures: rows } })
})

structures.get('/points/:id', async (c) => {
  const user = c.get('user')
  const structureId = c.req.param('id')

  const { rows } = await query('SELECT * FROM points_structures WHERE id = $1', [structureId])
  if (rows.length === 0) throw new NotFoundError('Points structure')
  await requireLeagueMember(user.id, rows[0].league_id)

  return c.json({ success: true, data: { structure: rows[0] } })
})

structures.post('/points', async (c) => {
  const user = c.get('user')
  const { leagueId, name, participationPoints, bountyPoints, positionPoints } = await c.req.json()
  if (!leagueId || !name) throw new ValidationError('leagueId and name are required')
  await requireLeagueAdmin(user.id, leagueId)

  const { rows } = await query(
    `INSERT INTO points_structures (league_id, name, participation_points, bounty_points, position_points)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [leagueId, name, participationPoints ?? 1, bountyPoints ?? 1, positionPoints ? JSON.stringify(positionPoints) : undefined]
  )

  return c.json({ success: true, data: { structure: rows[0] } }, 201)
})

structures.patch('/points/:id', async (c) => {
  const user = c.get('user')
  const structureId = c.req.param('id')

  const { rows: structRows } = await query('SELECT * FROM points_structures WHERE id = $1', [structureId])
  if (structRows.length === 0) throw new NotFoundError('Points structure')
  await requireLeagueAdmin(user.id, structRows[0].league_id)

  const { name, participationPoints, bountyPoints, positionPoints } = await c.req.json()

  const updates = []
  const values = []
  let idx = 1

  if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name) }
  if (participationPoints !== undefined) { updates.push(`participation_points = $${idx++}`); values.push(participationPoints) }
  if (bountyPoints !== undefined) { updates.push(`bounty_points = $${idx++}`); values.push(bountyPoints) }
  if (positionPoints !== undefined) { updates.push(`position_points = $${idx++}`); values.push(JSON.stringify(positionPoints)) }

  if (updates.length === 0) throw new ValidationError('No fields to update')

  values.push(structureId)
  await query(`UPDATE points_structures SET ${updates.join(', ')} WHERE id = $${idx}`, values)

  return c.json({ success: true })
})

structures.delete('/points/:id', async (c) => {
  const user = c.get('user')
  const structureId = c.req.param('id')

  const { rows: structRows } = await query('SELECT * FROM points_structures WHERE id = $1', [structureId])
  if (structRows.length === 0) throw new NotFoundError('Points structure')
  await requireLeagueAdmin(user.id, structRows[0].league_id)

  const { rows: inUse } = await query('SELECT id FROM events WHERE points_structure_id = $1 LIMIT 1', [structureId])
  if (inUse.length > 0) throw new ValidationError('Cannot delete structure that is in use by events')

  await query('DELETE FROM points_structures WHERE id = $1', [structureId])
  return c.json({ success: true })
})

structures.post('/points/:id/set-default', async (c) => {
  const user = c.get('user')
  const structureId = c.req.param('id')

  const { rows: structRows } = await query('SELECT * FROM points_structures WHERE id = $1', [structureId])
  if (structRows.length === 0) throw new NotFoundError('Points structure')
  await requireLeagueAdmin(user.id, structRows[0].league_id)

  await withTransaction(async (client) => {
    await client.query('UPDATE points_structures SET is_default = false WHERE league_id = $1', [structRows[0].league_id])
    await client.query('UPDATE points_structures SET is_default = true WHERE id = $1', [structureId])
  })

  return c.json({ success: true })
})

// =====================
// STANDINGS
// =====================

structures.get('/standings/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueMember(user.id, leagueId)

  const { rows } = await query(
    `SELECT lm.user_id, lm.games_played, lm.total_wins, lm.total_points,
            lm.total_winnings, lm.total_bounties, p.display_name, p.avatar_url
     FROM league_members lm
     JOIN profiles p ON p.user_id = lm.user_id
     WHERE lm.league_id = $1 AND lm.status = 'active' AND lm.games_played > 0
     ORDER BY lm.total_points DESC, lm.total_wins DESC, lm.total_winnings DESC`,
    [leagueId]
  )

  return c.json({ success: true, data: { standings: rows } })
})

export default structures
