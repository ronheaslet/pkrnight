const attempts = new Map()

export const rateLimit = (maxAttempts, windowMs) => {
  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for') || 'unknown'
    const key = `${ip}:${c.req.path}`
    const now = Date.now()

    const record = attempts.get(key) || { count: 0, resetAt: now + windowMs }

    if (now > record.resetAt) {
      record.count = 0
      record.resetAt = now + windowMs
    }

    record.count++
    attempts.set(key, record)

    if (record.count > maxAttempts) {
      return c.json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests' }
      }, 429)
    }

    await next()
  }
}
