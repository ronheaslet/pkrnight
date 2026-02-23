import { createServer } from 'http'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { WebSocketServer } from 'ws'
import { errorHandler } from './middleware/error.js'
import { handleConnection } from './services/websocket.js'
import { tickTimers } from './services/timer.js'
import { query } from './db/client.js'
import auth from './routes/auth.js'
import leagues from './routes/leagues.js'
import members from './routes/members.js'
import events from './routes/events.js'
import games from './routes/games.js'
import structures from './routes/structures.js'
import roles from './routes/roles.js'
import rsvps from './routes/rsvps.js'
import trophies from './routes/trophies.js'
import notifications from './routes/notifications.js'
import chat from './routes/chat.js'
import dues from './routes/dues.js'
import pot from './routes/pot.js'
import seasons from './routes/seasons.js'
import locations from './routes/locations.js'

const app = new Hono()

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
app.use('*', cors({ origin: corsOrigin }))

app.get('/api/health', async (c) => {
  const checks = {
    api: 'ok',
    database: 'unknown'
  }

  try {
    await query('SELECT 1')
    checks.database = 'ok'
  } catch (e) {
    checks.database = 'error'
  }

  const healthy = checks.database === 'ok'

  return c.json({
    success: healthy,
    status: healthy ? 'healthy' : 'degraded',
    checks,
    timestamp: Date.now()
  }, healthy ? 200 : 503)
})

// Public standings (no auth required)
app.get('/api/public/standings/:leagueId', async (c) => {
  const leagueId = c.req.param('leagueId')
  const { rows: leagueRows } = await query(
    'SELECT name, settings FROM leagues WHERE id = $1',
    [leagueId]
  )
  if (leagueRows.length === 0) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'League not found' } }, 404)
  }
  const settings = leagueRows[0].settings ? (typeof leagueRows[0].settings === 'string' ? JSON.parse(leagueRows[0].settings) : leagueRows[0].settings) : {}
  if (!settings.public_standings) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Public standings not enabled' } }, 403)
  }
  const { rows } = await query(
    `SELECT lm.games_played, lm.total_wins, lm.total_points,
            lm.total_winnings, lm.total_bounties, p.display_name
     FROM league_members lm
     JOIN profiles p ON p.user_id = lm.user_id
     WHERE lm.league_id = $1 AND lm.status = 'active' AND lm.games_played > 0
     ORDER BY lm.total_points DESC, lm.total_wins DESC, lm.total_winnings DESC`,
    [leagueId]
  )
  return c.json({ success: true, data: { standings: rows, leagueName: leagueRows[0].name } })
})

app.route('/api/auth', auth)
app.route('/api/leagues', leagues)
app.route('/api/members', members)
app.route('/api/events', events)
app.route('/api/games', games)
app.route('/api/structures', structures)
app.route('/api/roles', roles)
app.route('/api/rsvps', rsvps)
app.route('/api/trophies', trophies)
app.route('/api/notifications', notifications)
app.route('/api/chat', chat)
app.route('/api/dues', dues)
app.route('/api/pot', pot)
app.route('/api/seasons', seasons)
app.route('/api/locations', locations)

app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404)
})

app.onError((err, c) => {
  return errorHandler(err, c)
})

const port = parseInt(process.env.PORT || '3000')

// Create HTTP server with Hono fetch handler
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const headers = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers[key] = Array.isArray(value) ? value.join(', ') : value
  }

  const body = req.method !== 'GET' && req.method !== 'HEAD'
    ? await new Promise((resolve) => {
        const chunks = []
        req.on('data', (chunk) => chunks.push(chunk))
        req.on('end', () => resolve(Buffer.concat(chunks)))
      })
    : undefined

  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    body
  })

  const response = await app.fetch(request)

  res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
  const responseBody = await response.arrayBuffer()
  res.end(Buffer.from(responseBody))
})

// WebSocket server on /ws path
const wss = new WebSocketServer({ server, path: '/ws' })
wss.on('connection', handleConnection)

// Timer loop - ticks every second
setInterval(() => {
  tickTimers().catch(err => console.error('Timer tick error:', err.message))
}, 1000)

server.listen(port, () => {
  console.log(`PKR Night API running on port ${port}`)
  console.log(`WebSocket server running on ws://localhost:${port}/ws`)
})
