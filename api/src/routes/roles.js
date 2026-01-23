import { Hono } from 'hono'
import { query } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'
import { ValidationError, ForbiddenError, NotFoundError, ConflictError } from '../lib/errors.js'

const roles = new Hono()

roles.use('*', authMiddleware)

// Available permissions that can be assigned to custom roles
export const AVAILABLE_PERMISSIONS = [
  { key: 'pause_timer', label: 'Pause/Resume Timer', description: 'Can pause and resume the game timer' },
  { key: 'eliminate_player', label: 'Eliminate Players', description: 'Can eliminate players from the game' },
  { key: 'register_player', label: 'Register Players', description: 'Can register players into a game' },
  { key: 'rebuy_player', label: 'Process Rebuys', description: 'Can process player rebuys' },
  { key: 'create_event', label: 'Create Events', description: 'Can create new events' },
  { key: 'manage_members', label: 'Manage Members', description: 'Can edit member details and roles' },
  { key: 'manage_structures', label: 'Manage Structures', description: 'Can edit blind/payout/points structures' },
  { key: 'start_game', label: 'Start Games', description: 'Can start game sessions' },
  { key: 'end_game', label: 'End Games', description: 'Can manually end game sessions' }
]

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

// Get available permissions list
roles.get('/permissions', (c) => {
  return c.json({ success: true, data: { permissions: AVAILABLE_PERMISSIONS } })
})

// List roles for a league
roles.get('/league/:leagueId', async (c) => {
  const user = c.get('user')
  const leagueId = c.req.param('leagueId')

  // Verify membership
  const { rows: membership } = await query(
    `SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [leagueId, user.id]
  )
  if (membership.length === 0) throw new ForbiddenError('Not a member of this league')

  const { rows } = await query(
    `SELECT lr.*,
       (SELECT COUNT(*) FROM member_role_assignments mra WHERE mra.role_id = lr.id)::int as member_count
     FROM league_roles lr
     WHERE lr.league_id = $1
     ORDER BY lr.display_order, lr.created_at`,
    [leagueId]
  )

  return c.json({ success: true, data: { roles: rows } })
})

// Get role details with assigned members
roles.get('/:roleId', async (c) => {
  const user = c.get('user')
  const roleId = c.req.param('roleId')

  const { rows: roleRows } = await query(
    'SELECT * FROM league_roles WHERE id = $1',
    [roleId]
  )
  if (roleRows.length === 0) throw new NotFoundError('Role')

  const role = roleRows[0]

  // Verify membership
  const { rows: membership } = await query(
    `SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [role.league_id, user.id]
  )
  if (membership.length === 0) throw new ForbiddenError('Not a member of this league')

  const { rows: members } = await query(
    `SELECT mra.*, p.display_name, p.avatar_url, u.email
     FROM member_role_assignments mra
     JOIN users u ON u.id = mra.user_id
     LEFT JOIN profiles p ON p.user_id = mra.user_id
     WHERE mra.role_id = $1`,
    [roleId]
  )

  return c.json({ success: true, data: { role, members } })
})

// Create role
roles.post('/', async (c) => {
  const user = c.get('user')
  const { leagueId, name, emoji, description, permissions } = await c.req.json()

  if (!leagueId || !name) throw new ValidationError('leagueId and name are required')

  await requireLeagueAdmin(user.id, leagueId)

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!slug) throw new ValidationError('Name must contain alphanumeric characters')

  // Check for duplicate slug
  const { rows: existing } = await query(
    'SELECT id FROM league_roles WHERE league_id = $1 AND slug = $2',
    [leagueId, slug]
  )
  if (existing.length > 0) throw new ConflictError('A role with this name already exists')

  // Get next display_order
  const { rows: orderRows } = await query(
    'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM league_roles WHERE league_id = $1',
    [leagueId]
  )

  const { rows } = await query(
    `INSERT INTO league_roles (league_id, name, slug, emoji, description, permissions, display_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [leagueId, name, slug, emoji || null, description || null, JSON.stringify(permissions || []), orderRows[0].next_order]
  )

  return c.json({ success: true, data: { role: rows[0] } }, 201)
})

// Update role
roles.patch('/:roleId', async (c) => {
  const user = c.get('user')
  const roleId = c.req.param('roleId')

  const { rows: roleRows } = await query('SELECT * FROM league_roles WHERE id = $1', [roleId])
  if (roleRows.length === 0) throw new NotFoundError('Role')

  const role = roleRows[0]
  if (role.is_system_role) throw new ForbiddenError('Cannot modify system roles')

  await requireLeagueAdmin(user.id, role.league_id)

  const { name, emoji, description, permissions, display_order } = await c.req.json()

  const updates = []
  const values = []
  let idx = 1

  if (name !== undefined) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    // Check slug conflict
    const { rows: existing } = await query(
      'SELECT id FROM league_roles WHERE league_id = $1 AND slug = $2 AND id != $3',
      [role.league_id, slug, roleId]
    )
    if (existing.length > 0) throw new ConflictError('A role with this name already exists')
    updates.push(`name = $${idx++}`)
    values.push(name)
    updates.push(`slug = $${idx++}`)
    values.push(slug)
  }
  if (emoji !== undefined) {
    updates.push(`emoji = $${idx++}`)
    values.push(emoji || null)
  }
  if (description !== undefined) {
    updates.push(`description = $${idx++}`)
    values.push(description || null)
  }
  if (permissions !== undefined) {
    updates.push(`permissions = $${idx++}`)
    values.push(JSON.stringify(permissions))
  }
  if (display_order !== undefined) {
    updates.push(`display_order = $${idx++}`)
    values.push(display_order)
  }

  if (updates.length === 0) throw new ValidationError('No fields to update')

  values.push(roleId)
  const { rows } = await query(
    `UPDATE league_roles SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )

  return c.json({ success: true, data: { role: rows[0] } })
})

// Delete role
roles.delete('/:roleId', async (c) => {
  const user = c.get('user')
  const roleId = c.req.param('roleId')

  const { rows: roleRows } = await query('SELECT * FROM league_roles WHERE id = $1', [roleId])
  if (roleRows.length === 0) throw new NotFoundError('Role')

  const role = roleRows[0]
  if (role.is_system_role) throw new ForbiddenError('Cannot delete system roles')

  await requireLeagueAdmin(user.id, role.league_id)

  // Cascade will handle member_role_assignments
  await query('DELETE FROM league_roles WHERE id = $1', [roleId])

  return c.json({ success: true })
})

// Assign member to role
roles.post('/:roleId/assign', async (c) => {
  const user = c.get('user')
  const roleId = c.req.param('roleId')
  const { userId: targetUserId } = await c.req.json()

  if (!targetUserId) throw new ValidationError('userId is required')

  const { rows: roleRows } = await query('SELECT * FROM league_roles WHERE id = $1', [roleId])
  if (roleRows.length === 0) throw new NotFoundError('Role')

  const role = roleRows[0]
  await requireLeagueAdmin(user.id, role.league_id)

  // Verify target is active league member
  const { rows: membership } = await query(
    `SELECT id FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [role.league_id, targetUserId]
  )
  if (membership.length === 0) throw new ValidationError('User is not an active member of this league')

  const { rows } = await query(
    `INSERT INTO member_role_assignments (league_id, user_id, role_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (league_id, user_id, role_id) DO NOTHING
     RETURNING *`,
    [role.league_id, targetUserId, roleId]
  )

  if (rows.length === 0) {
    return c.json({ success: true, data: { message: 'Already assigned' } })
  }

  return c.json({ success: true, data: { assignment: rows[0] } }, 201)
})

// Unassign member from role
roles.delete('/:roleId/unassign/:userId', async (c) => {
  const user = c.get('user')
  const roleId = c.req.param('roleId')
  const targetUserId = c.req.param('userId')

  const { rows: roleRows } = await query('SELECT * FROM league_roles WHERE id = $1', [roleId])
  if (roleRows.length === 0) throw new NotFoundError('Role')

  await requireLeagueAdmin(user.id, roleRows[0].league_id)

  await query(
    'DELETE FROM member_role_assignments WHERE role_id = $1 AND user_id = $2',
    [roleId, targetUserId]
  )

  return c.json({ success: true })
})

// Check if a user has a specific permission (via custom roles) in a league
export async function hasPermission(userId, leagueId, permission) {
  // Owners and admins always have all permissions
  const { rows: membership } = await query(
    `SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [leagueId, userId]
  )
  if (membership.length === 0) return false
  if (membership[0].role === 'owner' || membership[0].role === 'admin') return true

  // Check custom role permissions
  const { rows } = await query(
    `SELECT lr.permissions
     FROM member_role_assignments mra
     JOIN league_roles lr ON lr.id = mra.role_id
     WHERE mra.league_id = $1 AND mra.user_id = $2`,
    [leagueId, userId]
  )

  for (const row of rows) {
    const perms = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || [])
    if (perms.includes(permission)) return true
  }

  return false
}

// Get all permissions for a user in a league
export async function getUserPermissions(userId, leagueId) {
  const { rows: membership } = await query(
    `SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2 AND status = 'active'`,
    [leagueId, userId]
  )
  if (membership.length === 0) return []
  if (membership[0].role === 'owner' || membership[0].role === 'admin') {
    return AVAILABLE_PERMISSIONS.map(p => p.key)
  }

  const { rows } = await query(
    `SELECT lr.permissions
     FROM member_role_assignments mra
     JOIN league_roles lr ON lr.id = mra.role_id
     WHERE mra.league_id = $1 AND mra.user_id = $2`,
    [leagueId, userId]
  )

  const perms = new Set()
  for (const row of rows) {
    const rolePerms = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || [])
    rolePerms.forEach(p => perms.add(p))
  }

  return [...perms]
}

export default roles
