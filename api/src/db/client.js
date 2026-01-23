import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

pool.on('connect', () => {
  console.log('Connected to PostgreSQL')
})

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message)
})

export async function query(text, params) {
  const start = Date.now()
  const result = await pool.query(text, params)
  const duration = Date.now() - start
  if (duration > 100) {
    console.log('Slow query:', { text, duration: `${duration}ms`, rows: result.rowCount })
  }
  return result
}

export async function getClient() {
  return pool.connect()
}

export async function withTransaction(callback) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
