import jwt from 'jsonwebtoken'
import { query } from '../db/client.js'
import { UnauthorizedError } from '../lib/errors.js'

const SECRET = process.env.BETTER_AUTH_SECRET || 'dev-secret'

export function generateToken(userId) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

export async function authMiddleware(c, next) {
  const header = c.req.header('Authorization')
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header')
  }

  const token = header.slice(7)
  const decoded = verifyToken(token)
  if (!decoded) {
    throw new UnauthorizedError('Invalid or expired token')
  }

  const { rows } = await query(
    `SELECT u.id, u.email, p.display_name, p.full_name, p.avatar_url, p.is_super_admin
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [decoded.sub]
  )

  if (rows.length === 0) {
    throw new UnauthorizedError('User not found')
  }

  c.set('user', rows[0])
  await next()
}

export async function optionalAuth(c, next) {
  const header = c.req.header('Authorization')
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7)
    const decoded = verifyToken(token)
    if (decoded) {
      const { rows } = await query(
        `SELECT u.id, u.email, p.display_name, p.full_name, p.avatar_url, p.is_super_admin
         FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.id = $1`,
        [decoded.sub]
      )
      if (rows.length > 0) {
        c.set('user', rows[0])
      }
    }
  }
  await next()
}
