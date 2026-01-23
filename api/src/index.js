import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors({ origin: 'http://localhost:5173' }))

app.get('/api/health', (c) => {
  return c.json({ success: true, status: 'ok', timestamp: Date.now() })
})

serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log('PKR Night API running on port 3000')
})
