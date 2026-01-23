import { Hono } from 'hono'
import { query } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { ValidationError, ForbiddenError, NotFoundError } from '../lib/errors.js'

const locations = new Hono()

locations.use('*', authMiddleware)

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

// Get all locations for a league
locations.get('/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueMember(user.id, leagueId)

  const { rows } = await query(
    `SELECT l.*, p.display_name as created_by_name
     FROM locations l
     LEFT JOIN profiles p ON p.user_id = l.created_by
     WHERE l.league_id = $1
     ORDER BY l.name`,
    [leagueId]
  )

  return c.json({ success: true, data: { locations: rows } })
})

// Create a location
locations.post('/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueMember(user.id, leagueId)

  const { name, address, notes } = await c.req.json()
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Location name is required')
  }

  const { rows } = await query(
    `INSERT INTO locations (league_id, name, address, notes, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [leagueId, name.trim(), address || null, notes || null, user.id]
  )

  return c.json({ success: true, data: { location: rows[0] } }, 201)
})

// Update a location
locations.patch('/:id', async (c) => {
  const user = c.get('user')
  const locationId = c.req.param('id')

  const { rows: locRows } = await query(`SELECT * FROM locations WHERE id = $1`, [locationId])
  if (locRows.length === 0) throw new NotFoundError('Location')

  await requireLeagueAdmin(user.id, locRows[0].league_id)

  const { name, address, notes } = await c.req.json()
  const updates = []
  const values = []
  let idx = 1

  if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name.trim()) }
  if (address !== undefined) { updates.push(`address = $${idx++}`); values.push(address) }
  if (notes !== undefined) { updates.push(`notes = $${idx++}`); values.push(notes) }

  if (updates.length === 0) throw new ValidationError('No fields to update')

  values.push(locationId)
  const { rows } = await query(
    `UPDATE locations SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )

  return c.json({ success: true, data: { location: rows[0] } })
})

// Delete a location
locations.delete('/:id', async (c) => {
  const user = c.get('user')
  const locationId = c.req.param('id')

  const { rows: locRows } = await query(`SELECT * FROM locations WHERE id = $1`, [locationId])
  if (locRows.length === 0) throw new NotFoundError('Location')

  await requireLeagueAdmin(user.id, locRows[0].league_id)

  await query(`DELETE FROM locations WHERE id = $1`, [locationId])
  return c.json({ success: true })
})

export default locations
