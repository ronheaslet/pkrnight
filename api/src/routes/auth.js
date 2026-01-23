import { Hono } from 'hono'
import { query } from '../db/client.js'
import { withTransaction } from '../db/client.js'
import { hashPassword, verifyPassword } from '../services/password.js'
import { generateToken } from '../middleware/auth.js'
import { authMiddleware } from '../middleware/auth.js'
import { ValidationError, ConflictError, UnauthorizedError } from '../lib/errors.js'
import { rateLimit } from '../middleware/rateLimit.js'

const auth = new Hono()

auth.post('/register', rateLimit(3, 60000), async (c) => {
  const { email, password, displayName, fullName } = await c.req.json()

  if (!email || !email.includes('@')) {
    throw new ValidationError('Invalid email format')
  }
  if (!password || password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters')
  }
  if (!displayName) {
    throw new ValidationError('Display name is required')
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
  if (existing.rows.length > 0) {
    throw new ConflictError('Email already registered')
  }

  const hashedPassword = await hashPassword(password)

  const result = await withTransaction(async (client) => {
    const userResult = await client.query(
      'INSERT INTO users (email, hashed_password, email_verified) VALUES ($1, $2, false) RETURNING id, email',
      [email.toLowerCase(), hashedPassword]
    )
    const user = userResult.rows[0]

    await client.query(
      'INSERT INTO profiles (user_id, display_name, full_name) VALUES ($1, $2, $3)',
      [user.id, displayName, fullName || null]
    )

    return user
  })

  const token = generateToken(result.id)

  return c.json({
    success: true,
    data: {
      user: { id: result.id, email: result.email, displayName },
      token
    }
  }, 201)
})

auth.post('/login', rateLimit(5, 60000), async (c) => {
  const { email, password } = await c.req.json()

  if (!email || !password) {
    throw new ValidationError('Email and password are required')
  }

  const { rows } = await query(
    `SELECT u.id, u.email, u.hashed_password, p.display_name, p.full_name, p.avatar_url, p.is_super_admin
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.email = $1`,
    [email.toLowerCase()]
  )

  if (rows.length === 0) {
    throw new UnauthorizedError('Invalid email or password')
  }

  const user = rows[0]
  const valid = await verifyPassword(password, user.hashed_password)
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password')
  }

  const token = generateToken(user.id)

  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        isSuperAdmin: user.is_super_admin
      },
      token
    }
  })
})

auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user')
  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        isSuperAdmin: user.is_super_admin
      }
    }
  })
})

auth.patch('/profile', authMiddleware, async (c) => {
  const user = c.get('user')
  const { displayName, fullName } = await c.req.json()

  if (!displayName || !displayName.trim()) {
    throw new ValidationError('Display name is required')
  }

  await query(
    'UPDATE profiles SET display_name = $1, full_name = $2 WHERE user_id = $3',
    [displayName.trim(), fullName || null, user.id]
  )

  return c.json({ success: true, data: { displayName: displayName.trim(), fullName: fullName || null } })
})

auth.post('/logout', authMiddleware, async (c) => {
  return c.json({ success: true })
})

export default auth
