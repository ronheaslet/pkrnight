import { createClient } from 'redis'

const client = createClient({ url: process.env.REDIS_URL })

client.on('connect', () => {
  console.log('Connected to Redis')
})

client.on('error', (err) => {
  console.error('Redis error:', err.message)
})

await client.connect()

export default client
