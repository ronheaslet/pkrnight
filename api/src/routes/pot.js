import { Hono } from 'hono'
import { query } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { ValidationError, ForbiddenError } from '../lib/errors.js'

const pot = new Hono()

pot.use('*', authMiddleware)

async function requireLeagueAdmin(userId, leagueId) {
  const { rows } = await query(
    `SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [leagueId, userId]
  )
  if (rows.length === 0) throw new ForbiddenError('Not a member of this league')
  if (rows[0].role !== 'owner' && rows[0].role !== 'admin') {
    throw new ForbiddenError('Admin access required')
  }
  return rows[0]
}

async function requireLeagueMember(userId, leagueId) {
  const { rows } = await query(
    `SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [leagueId, userId]
  )
  if (rows.length === 0) throw new ForbiddenError('Not a member of this league')
  return rows[0]
}

// Get pot balance and transactions
pot.get('/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueMember(user.id, leagueId)

  const { rows: balanceRows } = await query(
    `SELECT COALESCE(SUM(amount), 0) as balance FROM pot_transactions WHERE league_id = $1`,
    [leagueId]
  )

  const { rows: transactions } = await query(
    `SELECT pt.*, p.display_name as recorded_by_name
     FROM pot_transactions pt
     LEFT JOIN profiles p ON p.user_id = pt.recorded_by
     WHERE pt.league_id = $1
     ORDER BY pt.created_at DESC
     LIMIT 50`,
    [leagueId]
  )

  return c.json({
    success: true,
    data: {
      balance: parseFloat(balanceRows[0].balance),
      transactions
    }
  })
})

// Add a transaction (deposit or expense)
pot.post('/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueAdmin(user.id, leagueId)

  const { type, amount, description } = await c.req.json()
  if (!type || !amount || !description) {
    throw new ValidationError('type, amount, and description are required')
  }
  if (!['deposit', 'expense', 'adjustment'].includes(type)) {
    throw new ValidationError('type must be deposit, expense, or adjustment')
  }

  // Store amount as negative for expenses
  const storedAmount = type === 'expense' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount))

  const { rows } = await query(
    `INSERT INTO pot_transactions (league_id, type, amount, description, recorded_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [leagueId, type, storedAmount, description, user.id]
  )

  return c.json({ success: true, data: { transaction: rows[0] } }, 201)
})

// Delete a transaction
pot.delete('/:transactionId', async (c) => {
  const user = c.get('user')
  const transactionId = c.req.param('transactionId')

  const { rows: txRows } = await query(
    `SELECT * FROM pot_transactions WHERE id = $1`, [transactionId]
  )
  if (txRows.length === 0) throw new ValidationError('Transaction not found')

  await requireLeagueAdmin(user.id, txRows[0].league_id)

  await query(`DELETE FROM pot_transactions WHERE id = $1`, [transactionId])
  return c.json({ success: true })
})

export default pot
