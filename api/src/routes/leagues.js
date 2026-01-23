import { Hono } from 'hono'
import { query, withTransaction } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { ValidationError, NotFoundError, ForbiddenError } from '../lib/errors.js'

const leagues = new Hono()

leagues.use('*', authMiddleware)

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function requireMember(userId, leagueId) {
  const { rows } = await query(
    `SELECT role, status FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [leagueId, userId]
  )
  if (rows.length === 0) {
    throw new ForbiddenError('You are not a member of this league')
  }
  return rows[0]
}

async function requireAdmin(userId, leagueId) {
  const member = await requireMember(userId, leagueId)
  if (member.role !== 'owner' && member.role !== 'admin') {
    throw new ForbiddenError('Admin access required')
  }
  return member
}

async function requireOwner(userId, leagueId) {
  const member = await requireMember(userId, leagueId)
  if (member.role !== 'owner') {
    throw new ForbiddenError('Owner access required')
  }
  return member
}

leagues.get('/', async (c) => {
  const user = c.get('user')
  const { rows } = await query(
    `SELECT l.*, lm.role, lm.member_type, lm.status as member_status,
            (SELECT count(*) FROM league_members WHERE league_id = l.id AND status = 'active') as member_count
     FROM leagues l
     JOIN league_members lm ON lm.league_id = l.id AND lm.user_id = $1
     WHERE lm.status = 'active'
     ORDER BY l.name`,
    [user.id]
  )
  return c.json({ success: true, data: { leagues: rows } })
})

leagues.get('/:id', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('id')

  await requireMember(user.id, leagueId)

  const { rows } = await query(
    `SELECT l.*,
            (SELECT count(*) FROM league_members WHERE league_id = l.id AND status = 'active') as member_count
     FROM leagues l WHERE l.id = $1`,
    [leagueId]
  )

  if (rows.length === 0) {
    throw new NotFoundError('League')
  }

  return c.json({ success: true, data: { league: rows[0] } })
})

leagues.post('/', async (c) => {
  const user = c.get('user')
  const { name, description } = await c.req.json()

  if (!name || name.trim().length === 0) {
    throw new ValidationError('League name is required')
  }

  const slug = slugify(name)

  const result = await withTransaction(async (client) => {
    const leagueResult = await client.query(
      `INSERT INTO leagues (name, slug, description, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), slug + '-' + Date.now().toString(36), description || null, user.id]
    )
    const league = leagueResult.rows[0]

    await client.query(
      `INSERT INTO league_members (league_id, user_id, role, member_type, status)
       VALUES ($1, $2, 'owner', 'paid', 'active')`,
      [league.id, user.id]
    )

    return league
  })

  return c.json({ success: true, data: { league: result } }, 201)
})

leagues.post('/join', async (c) => {
  const user = c.get('user')
  const { inviteCode } = await c.req.json()

  if (!inviteCode) {
    throw new ValidationError('Invite code is required')
  }

  const { rows: leagueRows } = await query(
    'SELECT id, name FROM leagues WHERE invite_code = $1',
    [inviteCode]
  )

  if (leagueRows.length === 0) {
    throw new NotFoundError('League')
  }

  const league = leagueRows[0]

  const { rows: existing } = await query(
    'SELECT id, status FROM league_members WHERE league_id = $1 AND user_id = $2',
    [league.id, user.id]
  )

  if (existing.length > 0) {
    if (existing[0].status === 'active') {
      return c.json({ success: true, data: { league, message: 'Already a member' } })
    }
    await query(
      `UPDATE league_members SET status = 'active' WHERE id = $1`,
      [existing[0].id]
    )
  } else {
    await query(
      `INSERT INTO league_members (league_id, user_id, role, member_type, status)
       VALUES ($1, $2, 'member', 'guest', 'active')`,
      [league.id, user.id]
    )
  }

  return c.json({ success: true, data: { league } })
})

leagues.patch('/:id', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('id')
  await requireAdmin(user.id, leagueId)

  const { name, description, settings } = await c.req.json()

  const updates = []
  const values = []
  let idx = 1

  if (name !== undefined) {
    updates.push(`name = $${idx++}`)
    values.push(name.trim())
  }
  if (description !== undefined) {
    updates.push(`description = $${idx++}`)
    values.push(description)
  }
  if (settings !== undefined) {
    updates.push(`settings = $${idx++}`)
    values.push(JSON.stringify(settings))
  }

  if (updates.length === 0) {
    throw new ValidationError('No fields to update')
  }

  values.push(leagueId)
  const { rows } = await query(
    `UPDATE leagues SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )

  return c.json({ success: true, data: { league: rows[0] } })
})

leagues.post('/:id/regenerate-invite', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('id')
  await requireOwner(user.id, leagueId)

  const { rows } = await query(
    `UPDATE leagues SET invite_code = encode(gen_random_bytes(6), 'hex') WHERE id = $1 RETURNING invite_code`,
    [leagueId]
  )

  return c.json({ success: true, data: { inviteCode: rows[0].invite_code } })
})

export default leagues
