import { AppError } from '../lib/errors.js'

export function errorHandler(err, c) {
  if (err instanceof AppError) {
    const body = {
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    }
    if (err.details) {
      body.error.details = err.details
    }
    return c.json(body, err.statusCode)
  }

  console.error('Unhandled error:', err)

  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message

  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message
    }
  }, 500)
}
