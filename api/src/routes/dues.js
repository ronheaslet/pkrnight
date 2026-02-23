import { Hono } from 'hono'
import { query } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { ValidationError, ForbiddenError } from '../lib/errors.js'

const dues = new Hono()

dues.use('*', authMiddleware)

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

// Get dues summary for a league/year
dues.get('/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueMember(user.id, leagueId)

  const year = parseInt(c.req.query('year') || new Date().getFullYear().toString())

  // Get league settings for annual dues amount
  const { rows: leagueRows } = await query(
    `SELECT settings FROM leagues WHERE id = $1`, [leagueId]
  )
  const settings = leagueRows[0]?.settings || {}
  const annualDues = parseFloat(settings.annual_dues || 0)

  // Get all active members with their payment status
  const { rows: members } = await query(
    `SELECT lm.user_id, lm.member_type, p.display_name, p.avatar_url,
            COALESCE(dp.total_paid, 0) as total_paid
     FROM league_members lm
     JOIN profiles p ON p.user_id = lm.user_id
     LEFT JOIN (
       SELECT user_id, SUM(amount) as total_paid
       FROM dues_payments
       WHERE league_id = $1 AND season_year = $2
       GROUP BY user_id
     ) dp ON dp.user_id = lm.user_id
     WHERE lm.league_id = $1 AND lm.status = 'active'
     ORDER BY p.display_name`,
    [leagueId, year]
  )

  // Get payment history
  const { rows: payments } = await query(
    `SELECT dp.*, p.display_name
     FROM dues_payments dp
     JOIN profiles p ON p.user_id = dp.user_id
     WHERE dp.league_id = $1 AND dp.season_year = $2
     ORDER BY dp.paid_at DESC`,
    [leagueId, year]
  )

  return c.json({
    success: true,
    data: { members, payments, annualDues, year }
  })
})

// Record a dues payment
dues.post('/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')
  await requireLeagueAdmin(user.id, leagueId)

  const { userId, amount, year, notes } = await c.req.json()
  if (!userId || !amount) {
    throw new ValidationError('userId and amount are required')
  }

  const seasonYear = year || new Date().getFullYear()

  const { rows } = await query(
    `INSERT INTO dues_payments (league_id, user_id, amount, season_year, recorded_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [leagueId, userId, amount, seasonYear, user.id, notes || null]
  )

  return c.json({ success: true, data: { payment: rows[0] } }, 201)
})

// Delete a payment
dues.delete('/:paymentId', async (c) => {
  const user = c.get('user')
  const paymentId = c.req.param('paymentId')

  const { rows: paymentRows } = await query(
    `SELECT * FROM dues_payments WHERE id = $1`, [paymentId]
  )
  if (paymentRows.length === 0) throw new ValidationError('Payment not found')

  await requireLeagueAdmin(user.id, paymentRows[0].league_id)

  await query(`DELETE FROM dues_payments WHERE id = $1`, [paymentId])
  return c.json({ success: true })
})

export default dues
