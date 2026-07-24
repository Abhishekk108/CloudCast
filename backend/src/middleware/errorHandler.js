/**
 * Global Express error-handling middleware.
 *
 * Catches any error passed to next(err) or thrown in an async route handler
 * (when wrapped with asyncHandler) and returns a consistent JSON shape:
 *
 *   { error: { code: string, message: string } }
 *
 * Rules:
 *  - Stack traces and raw provider errors never reach the client in production.
 *  - Every error is logged with full detail server-side via pino.
 *  - Operational errors (AppError) use their own status/code.
 *  - Unrecognised errors default to 500 / INTERNAL_ERROR.
 */

import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

// ── AppError ──────────────────────────────────────────────────────────────────
// Throw this anywhere in the app to produce a clean, predictable error response.
//
// Example:
//   throw new AppError('LOCATION_NOT_FOUND', 'Could not resolve location "Pn".', 404)
//
export class AppError extends Error {
  /**
   * @param {string} code   Machine-readable error code (SCREAMING_SNAKE_CASE)
   * @param {string} message Human-readable message (safe to surface to client)
   * @param {number} [status=500] HTTP status code
   */
  constructor(code, message, status = 500) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    // Preserve stack in V8
    if (Error.captureStackTrace) Error.captureStackTrace(this, AppError)
  }
}

// ── asyncHandler ─────────────────────────────────────────────────────────────
// Wraps an async route handler so that rejected promises are forwarded to
// Express's error pipeline without boilerplate try/catch in every controller.
//
// Usage:
//   router.post('/chat', asyncHandler(async (req, res) => { ... }))
//
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// ── errorHandler middleware ───────────────────────────────────────────────────
// Must be registered AFTER all routes (4-argument signature signals to Express
// that this is an error handler).
//
export const errorHandler = (err, req, res, _next) => {
  // Determine HTTP status
  const status = err.status || err.statusCode || 500

  // Determine error code
  const code = err.code || (status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR')

  // Log full detail server-side (including stack in dev)
  const logPayload = { err, req: { method: req.method, url: req.url }, status, code }
  if (status >= 500) {
    logger.error(logPayload, 'Unhandled server error')
  } else {
    logger.warn(logPayload, 'Client error')
  }

  // Client-facing message — never leak internals in production
  const isProduction = env.NODE_ENV === 'production'
  const clientMessage =
    err instanceof AppError || !isProduction
      ? err.message
      : 'An unexpected error occurred. Please try again.'

  res.status(status).json({
    error: {
      code,
      message: clientMessage,
    },
  })
}
