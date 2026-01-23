import { createServer } from 'http'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { WebSocketServer } from 'ws'
import { errorHandler } from './middleware/error.js'
import { handleConnection } from './services/websocket.js'
import { tickTimers } from './services/timer.js'
import auth from './routes/auth.js'
import leagues from './routes/leagues.js'
import members from './routes/members.js'
import events from './routes/events.js'
import games from './routes/games.js'

const app = new Hono()

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
app.use('*', cors({ origin: corsOrigin }))

app.get('/api/health', (c) => {
  return c.json({ success: true, status: 'ok', timestamp: Date.now() })
})

app.route('/api/auth', auth)
app.route('/api/leagues', leagues)
app.route('/api/members', members)
app.route('/api/events', events)
app.route('/api/games', games)

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
