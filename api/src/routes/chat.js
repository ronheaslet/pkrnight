import { Hono } from 'hono'
import { query } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { ValidationError, ForbiddenError } from '../lib/errors.js'
import { broadcastToLeague } from '../services/websocket.js'

const chat = new Hono()

chat.use('*', authMiddleware)

async function requireLeagueMember(userId, leagueId) {
  const { rows } = await query(
    `SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [leagueId, userId]
  )
  if (rows.length === 0) throw new ForbiddenError('Not a member of this league')
  return rows[0]
}

// Get chat messages for a league
chat.get('/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueMember(user.id, leagueId)

  const limit = parseInt(c.req.query('limit') || '50')
  const before = c.req.query('before') // cursor for pagination

  let sql = `SELECT cm.*, p.display_name, p.avatar_url
     FROM chat_messages cm
     JOIN profiles p ON p.user_id = cm.user_id
     WHERE cm.league_id = $1`
  const params = [leagueId]

  if (before) {
    sql += ` AND cm.created_at < $${params.length + 1}`
    params.push(before)
  }

  sql += ` ORDER BY cm.created_at DESC LIMIT $${params.length + 1}`
  params.push(limit)

  const { rows } = await query(sql, params)

  return c.json({ success: true, data: { messages: rows.reverse() } })
})

// Send a chat message
chat.post('/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueMember(user.id, leagueId)

  const { message } = await c.req.json()
  if (!message || message.trim().length === 0) {
    throw new ValidationError('Message cannot be empty')
  }
  if (message.length > 1000) {
    throw new ValidationError('Message too long (max 1000 characters)')
  }

  const { rows } = await query(
    `INSERT INTO chat_messages (league_id, user_id, message)
     VALUES ($1, $2, $3) RETURNING *`,
    [leagueId, user.id, message.trim()]
  )

  const msg = rows[0]

  // Get display name for broadcast
  const { rows: profileRows } = await query(
    `SELECT display_name, avatar_url FROM profiles WHERE user_id = $1`,
    [user.id]
  )

  const fullMessage = {
    ...msg,
    display_name: profileRows[0]?.display_name || 'Unknown',
    avatar_url: profileRows[0]?.avatar_url
  }

  // Broadcast to league WebSocket connections
  broadcastToLeague(leagueId, {
    type: 'CHAT_MESSAGE',
    message: fullMessage
  })

  return c.json({ success: true, data: { message: fullMessage } }, 201)
})

export default chat
