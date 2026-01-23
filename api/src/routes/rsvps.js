import { Hono } from 'hono'
import { query } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { ValidationError, NotFoundError, ForbiddenError } from '../lib/errors.js'

const rsvps = new Hono()

rsvps.use('*', authMiddleware)

// Get RSVPs for an event
rsvps.get('/event/:eventId', async (c) => {
  const user = c.get('user')
  const eventId = c.req.param('eventId')

  // Verify event exists and user is a league member
  const { rows: eventRows } = await query('SELECT league_id FROM events WHERE id = $1', [eventId])
  if (eventRows.length === 0) throw new NotFoundError('Event')

  const { rows: membership } = await query(
    `SELECT id FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [eventRows[0].league_id, user.id]
  )
  if (membership.length === 0) throw new ForbiddenError('Not a member of this league')

  const { rows } = await query(
    `SELECT r.*, p.display_name, p.avatar_url
     FROM event_rsvps r
     JOIN profiles p ON p.user_id = r.user_id
     WHERE r.event_id = $1
     ORDER BY r.status, p.display_name`,
    [eventId]
  )

  return c.json({ success: true, data: { rsvps: rows } })
})

// Set/update RSVP
rsvps.post('/event/:eventId', async (c) => {
  const user = c.get('user')
  const eventId = c.req.param('eventId')
  const { status } = await c.req.json()

  if (!status || !['going', 'maybe', 'not_going'].includes(status)) {
    throw new ValidationError('Status must be going, maybe, or not_going')
  }

  // Verify event exists and user is a league member
  const { rows: eventRows } = await query('SELECT league_id FROM events WHERE id = $1', [eventId])
  if (eventRows.length === 0) throw new NotFoundError('Event')

  const { rows: membership } = await query(
    `SELECT id FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [eventRows[0].league_id, user.id]
  )
  if (membership.length === 0) throw new ForbiddenError('Not a member of this league')

  const { rows } = await query(
    `INSERT INTO event_rsvps (event_id, user_id, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id, user_id) DO UPDATE SET status = $3, updated_at = NOW()
     RETURNING *`,
    [eventId, user.id, status]
  )

  return c.json({ success: true, data: { rsvp: rows[0] } })
})

// Delete RSVP
rsvps.delete('/event/:eventId', async (c) => {
  const user = c.get('user')
  const eventId = c.req.param('eventId')

  await query(
    `DELETE FROM event_rsvps WHERE event_id = $1 AND user_id = $2`,
    [eventId, user.id]
  )

  return c.json({ success: true })
})

export default rsvps
