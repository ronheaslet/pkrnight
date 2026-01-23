import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { errorHandler } from './middleware/error.js'
import auth from './routes/auth.js'
import leagues from './routes/leagues.js'
import members from './routes/members.js'

const app = new Hono()

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
app.use('*', cors({ origin: corsOrigin }))

app.get('/api/health', (c) => {
  return c.json({ success: true, status: 'ok', timestamp: Date.now() })
})

app.route('/api/auth', auth)
app.route('/api/leagues', leagues)
app.route('/api/members', members)

app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404)
})

app.onError((err, c) => {
  return errorHandler(err, c)
})

const port = parseInt(process.env.PORT || '3000')
serve({ fetch: app.fetch, port }, () => {
  console.log(`PKR Night API running on port ${port}`)
})
