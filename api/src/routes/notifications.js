import { Hono } from 'hono'
import { query } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { NotFoundError } from '../lib/errors.js'

const notifications = new Hono()

notifications.use('*', authMiddleware)

// Get notifications for current user
notifications.get('/', async (c) => {
  const user = c.get('user')
  const limit = parseInt(c.req.query('limit') || '50')
  const unreadOnly = c.req.query('unread') === 'true'

  let sql = `SELECT n.*, l.name as league_name
     FROM notifications n
     LEFT JOIN leagues l ON l.id = n.league_id
     WHERE n.user_id = $1`
  const params = [user.id]

  if (unreadOnly) {
    sql += ` AND n.read = false`
  }

  sql += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1}`
  params.push(limit)

  const { rows } = await query(sql, params)

  return c.json({ success: true, data: { notifications: rows } })
})

// Get unread count
notifications.get('/count', async (c) => {
  const user = c.get('user')
  const { rows } = await query(
    `SELECT count(*) as count FROM notifications WHERE user_id = $1 AND read = false`,
    [user.id]
  )
  return c.json({ success: true, data: { count: parseInt(rows[0].count) } })
})

// Mark notification as read
notifications.patch('/:id/read', async (c) => {
  const user = c.get('user')
  const notifId = c.req.param('id')

  const { rows } = await query(
    `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING id`,
    [notifId, user.id]
  )

  if (rows.length === 0) throw new NotFoundError('Notification')

  return c.json({ success: true })
})

// Mark all as read
notifications.post('/read-all', async (c) => {
  const user = c.get('user')
  await query(
    `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
    [user.id]
  )
  return c.json({ success: true })
})

export default notifications
