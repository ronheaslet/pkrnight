import { Hono } from 'hono'
import { query } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { ValidationError, NotFoundError, ForbiddenError } from '../lib/errors.js'

const events = new Hono()

events.use('*', authMiddleware)

async function requireLeagueMember(userId, leagueId) {
  const { rows } = await query(
    `SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [leagueId, userId]
  )
  if (rows.length === 0) throw new ForbiddenError('Not a member of this league')
  return rows[0]
}

events.get('/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueMember(user.id, leagueId)

  const { rows } = await query(
    `SELECT e.*, gs.id as session_id, gs.status as game_status
     FROM events e
     LEFT JOIN game_sessions gs ON gs.event_id = e.id
     WHERE e.league_id = $1
     ORDER BY e.scheduled_at DESC`,
    [leagueId]
  )

  return c.json({ success: true, data: { events: rows } })
})

events.get('/:id', async (c) => {
  const user = c.get('user')
  const eventId = c.req.param('id')

  const { rows } = await query(
    `SELECT e.*, gs.id as session_id, gs.status as game_status,
            bs.name as blind_structure_name,
            ps.name as payout_structure_name,
            pts.name as points_structure_name
     FROM events e
     LEFT JOIN game_sessions gs ON gs.event_id = e.id
     LEFT JOIN blind_structures bs ON bs.id = e.blind_structure_id
     LEFT JOIN payout_structures ps ON ps.id = e.payout_structure_id
     LEFT JOIN points_structures pts ON pts.id = e.points_structure_id
     WHERE e.id = $1`,
    [eventId]
  )
  if (rows.length === 0) throw new NotFoundError('Event')

  await requireLeagueMember(user.id, rows[0].league_id)
  return c.json({ success: true, data: { event: rows[0] } })
})

events.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const { leagueId, title, description, scheduledAt, location, locationId, buyInAmount, maxRebuys, rebuyAmount, rebuyCutoffLevel, blindStructureId, payoutStructureId, pointsStructureId } = body

  if (!leagueId || !title || !scheduledAt) {
    throw new ValidationError('leagueId, title, and scheduledAt are required')
  }

  const membership = await requireLeagueMember(user.id, leagueId)
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw new ForbiddenError('Admin access required to create events')
  }

  const { rows } = await query(
    `INSERT INTO events (league_id, title, description, scheduled_at, location, location_id, location_name, buy_in_amount, max_rebuys, rebuy_amount, rebuy_cutoff_level, blind_structure_id, payout_structure_id, points_structure_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
    [leagueId, title, description || null, scheduledAt, location || null, locationId || null, location || null, buyInAmount || 0, maxRebuys || 0, rebuyAmount || 0, parseInt(rebuyCutoffLevel) || 0, blindStructureId || null, payoutStructureId || null, pointsStructureId || null, user.id]
  )

  return c.json({ success: true, data: { event: rows[0] } }, 201)
})

events.patch('/:id', async (c) => {
  const user = c.get('user')
  const eventId = c.req.param('id')

  const { rows: eventRows } = await query('SELECT * FROM events WHERE id = $1', [eventId])
  if (eventRows.length === 0) throw new NotFoundError('Event')

  const membership = await requireLeagueMember(user.id, eventRows[0].league_id)
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw new ForbiddenError('Admin access required')
  }

  const body = await c.req.json()
  const allowedFields = ['title', 'description', 'scheduled_at', 'location', 'buy_in_amount', 'max_rebuys', 'rebuy_amount', 'rebuy_cutoff_level', 'status']
  const updates = []
  const values = []
  let idx = 1

  for (const field of allowedFields) {
    const camelKey = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    if (body[camelKey] !== undefined || body[field] !== undefined) {
      updates.push(`${field} = $${idx++}`)
      values.push(body[camelKey] !== undefined ? body[camelKey] : body[field])
    }
  }

  if (updates.length === 0) throw new ValidationError('No fields to update')

  values.push(eventId)
  const { rows } = await query(
    `UPDATE events SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )

  return c.json({ success: true, data: { event: rows[0] } })
})

// Delete event
events.delete('/:id', async (c) => {
  const user = c.get('user')
  const eventId = c.req.param('id')

  const { rows: eventRows } = await query('SELECT * FROM events WHERE id = $1', [eventId])
  if (eventRows.length === 0) throw new NotFoundError('Event')

  const membership = await requireLeagueMember(user.id, eventRows[0].league_id)
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw new ForbiddenError('Admin access required')
  }

  // Don't allow deleting events with completed games
  const { rows: games } = await query(
    `SELECT id FROM game_sessions WHERE event_id = $1 AND status = 'completed'`,
    [eventId]
  )
  if (games.length > 0) {
    throw new ForbiddenError('Cannot delete event with completed games')
  }

  // Clean up related records
  await query(`DELETE FROM game_participants WHERE session_id IN (SELECT id FROM game_sessions WHERE event_id = $1)`, [eventId])
  await query(`DELETE FROM game_events WHERE session_id IN (SELECT id FROM game_sessions WHERE event_id = $1)`, [eventId])
  await query(`DELETE FROM game_sessions WHERE event_id = $1`, [eventId])
  await query(`DELETE FROM event_rsvps WHERE event_id = $1`, [eventId])
  await query(`DELETE FROM events WHERE id = $1`, [eventId])

  return c.json({ success: true })
})

export default events
