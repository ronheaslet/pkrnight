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

  const { rows } = await query('SELECT * FROM events WHERE id = $1', [eventId])
  if (rows.length === 0) throw new NotFoundError('Event')

  await requireLeagueMember(user.id, rows[0].league_id)
  return c.json({ success: true, data: { event: rows[0] } })
})

events.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const { leagueId, title, description, scheduledAt, location, buyInAmount, maxRebuys, rebuyAmount, blindStructureId, payoutStructureId, pointsStructureId } = body

  if (!leagueId || !title || !scheduledAt) {
    throw new ValidationError('leagueId, title, and scheduledAt are required')
  }

  const membership = await requireLeagueMember(user.id, leagueId)
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    throw new ForbiddenError('Admin access required to create events')
  }

  const { rows } = await query(
    `INSERT INTO events (league_id, title, description, scheduled_at, location, buy_in_amount, max_rebuys, rebuy_amount, blind_structure_id, payout_structure_id, points_structure_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [leagueId, title, description || null, scheduledAt, location || null, buyInAmount || 0, maxRebuys || 0, rebuyAmount || 0, blindStructureId || null, payoutStructureId || null, pointsStructureId || null, user.id]
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
  const allowedFields = ['title', 'description', 'scheduled_at', 'location', 'buy_in_amount', 'max_rebuys', 'rebuy_amount', 'status']
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

export default events
