import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
app.use('*', cors({ origin: corsOrigin }))

app.get('/api/health', (c) => {
  return c.json({ success: true, status: 'ok', timestamp: Date.now() })
})

const port = parseInt(process.env.PORT || '3000')
serve({ fetch: app.fetch, port }, () => {
  console.log(`PKR Night API running on port ${port}`)
})
