import { Hono } from 'hono'
import { query } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { ValidationError, ForbiddenError, NotFoundError } from '../lib/errors.js'

const members = new Hono()

members.use('*', authMiddleware)

async function getMemberRole(userId, leagueId) {
  const { rows } = await query(
    `SELECT role, status FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [leagueId, userId]
  )
  if (rows.length === 0) return null
  return rows[0]
}

members.get('/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')

  const membership = await getMemberRole(user.id, leagueId)
  if (!membership) {
    throw new ForbiddenError('You are not a member of this league')
  }

  const { rows } = await query(
    `SELECT lm.*, p.display_name, p.full_name, p.avatar_url, u.email
     FROM league_members lm
     JOIN users u ON u.id = lm.user_id
     LEFT JOIN profiles p ON p.user_id = lm.user_id
     WHERE lm.league_id = $1 AND lm.status = 'active'
     ORDER BY
       CASE lm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
       p.display_name`,
    [leagueId]
  )

  // Fetch custom role assignments for all members
  const { rows: assignments } = await query(
    `SELECT mra.user_id, lr.id as role_id, lr.name, lr.emoji, lr.slug
     FROM member_role_assignments mra
     JOIN league_roles lr ON lr.id = mra.role_id
     WHERE mra.league_id = $1
     ORDER BY lr.display_order`,
    [leagueId]
  )

  // Group assignments by user_id
  const rolesByUser = {}
  for (const a of assignments) {
    if (!rolesByUser[a.user_id]) rolesByUser[a.user_id] = []
    rolesByUser[a.user_id].push({ id: a.role_id, name: a.name, emoji: a.emoji, slug: a.slug })
  }

  const membersWithRoles = rows.map(m => ({
    ...m,
    custom_roles: rolesByUser[m.user_id] || []
  }))

  return c.json({ success: true, data: { members: membersWithRoles } })
})

members.patch('/:memberId', async (c) => {
  const user = c.get('user')
  const memberId = c.req.param('memberId')

  const { rows: memberRows } = await query(
    'SELECT * FROM league_members WHERE id = $1',
    [memberId]
  )

  if (memberRows.length === 0) {
    throw new NotFoundError('Member')
  }

  const target = memberRows[0]
  const myRole = await getMemberRole(user.id, target.league_id)

  if (!myRole || (myRole.role !== 'owner' && myRole.role !== 'admin')) {
    throw new ForbiddenError('Admin access required')
  }

  if (target.role === 'owner' && myRole.role !== 'owner') {
    throw new ForbiddenError('Cannot modify the owner')
  }

  const { role, member_type, status, dues_paid } = await c.req.json()

  if (role === 'owner' && myRole.role !== 'owner') {
    throw new ForbiddenError('Only the owner can promote to owner')
  }

  const updates = []
  const values = []
  let idx = 1

  if (role !== undefined) {
    updates.push(`role = $${idx++}`)
    values.push(role)
  }
  if (member_type !== undefined) {
    updates.push(`member_type = $${idx++}`)
    values.push(member_type)
  }
  if (status !== undefined) {
    updates.push(`status = $${idx++}`)
    values.push(status)
  }
  if (dues_paid !== undefined) {
    updates.push(`dues_paid = $${idx++}`)
    values.push(dues_paid)
  }

  if (updates.length === 0) {
    throw new ValidationError('No fields to update')
  }

  values.push(memberId)
  const { rows } = await query(
    `UPDATE league_members SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )

  return c.json({ success: true, data: { member: rows[0] } })
})

members.delete('/:memberId', async (c) => {
  const user = c.get('user')
  const memberId = c.req.param('memberId')

  const { rows: memberRows } = await query(
    'SELECT * FROM league_members WHERE id = $1',
    [memberId]
  )

  if (memberRows.length === 0) {
    throw new NotFoundError('Member')
  }

  const target = memberRows[0]

  if (target.role === 'owner') {
    throw new ForbiddenError('Cannot remove the owner')
  }

  const myRole = await getMemberRole(user.id, target.league_id)
  if (!myRole || (myRole.role !== 'owner' && myRole.role !== 'admin')) {
    throw new ForbiddenError('Admin access required')
  }

  await query(
    `UPDATE league_members SET status = 'inactive' WHERE id = $1`,
    [memberId]
  )

  return c.json({ success: true })
})

members.post('/leave/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')

  const membership = await getMemberRole(user.id, leagueId)
  if (!membership) {
    throw new NotFoundError('Membership')
  }

  if (membership.role === 'owner') {
    throw new ForbiddenError('Owner cannot leave the league. Transfer ownership first.')
  }

  await query(
    `UPDATE league_members SET status = 'inactive' WHERE league_id = $1 AND user_id = $2`,
    [leagueId, user.id]
  )

  return c.json({ success: true })
})

export default members
