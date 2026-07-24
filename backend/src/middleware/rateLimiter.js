/**
 * Rate limiting middleware.
 *
 * Applied per-IP to the /api/chat endpoint to prevent runaway LLM/weather API
 * costs and protect against abuse.
 *
 * Limits are intentionally conservative for a personal/demo deployment. Adjust
 * CHAT_RATE_LIMIT_MAX and CHAT_RATE_LIMIT_WINDOW_MS via env vars in production.
 */

import rateLimit from 'express-rate-limit'

/** Number of requests allowed per IP per window (default: 20 / minute) */
const CHAT_RATE_LIMIT_MAX = Number(process.env.CHAT_RATE_LIMIT_MAX) || 20

/** Window duration in milliseconds (default: 60 000 ms = 1 minute) */
const CHAT_RATE_LIMIT_WINDOW_MS = Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS) || 60_000

export const chatRateLimiter = rateLimit({
  windowMs: CHAT_RATE_LIMIT_WINDOW_MS,
  max: CHAT_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8', // Include RateLimit-* response headers (RFC standard)
  legacyHeaders: false,

  // Return JSON consistent with the app's error shape
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. You may send up to ${CHAT_RATE_LIMIT_MAX} messages per minute. Please wait and try again.`,
      },
    })
  },
})
