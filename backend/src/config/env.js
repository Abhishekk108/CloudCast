/**
 * Centralized, validated environment configuration.
 *
 * Loaded once at startup. If any required variable is missing or invalid the
 * process exits immediately with a clear message rather than failing silently
 * at the point of first use.
 *
 * Import this module instead of reading process.env directly anywhere else in
 * the codebase — that keeps all env concerns in one place.
 */

import { z } from 'zod'

const envSchema = z.object({
  // ── Server ─────────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  // ── External API keys (required — no defaults) ────────────────────────────
  GROQ_API_KEY: z
    .string({ required_error: 'GROQ_API_KEY is required' })
    .min(1, 'GROQ_API_KEY must not be empty'),
  WEATHER_API_KEY: z
    .string({ required_error: 'WEATHER_API_KEY is required' })
    .min(1, 'WEATHER_API_KEY must not be empty'),

  // ── Optional / derived ────────────────────────────────────────────────────
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
    .default('info'),

  // Cache TTL in seconds for weather API responses
  WEATHER_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
})

// Parse and validate — throws a ZodError on failure which we catch below.
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // Format each failing field into a readable line
  const issues = parsed.error.issues
    .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')

  // Use console.error here intentionally — the pino logger depends on env.js
  // so it isn't available yet when this runs.
  // eslint-disable-next-line no-console
  console.error(
    '\n[CloudCast] ✗ Server startup failed — invalid environment configuration:\n' +
      issues +
      '\n\nCopy .env.example → .env and fill in the missing values.\n'
  )
  process.exit(1)
}

export const env = parsed.data
