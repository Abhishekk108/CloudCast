/**
 * Thin wrapper around Groq's OpenAI-compatible chat completions endpoint.
 *
 * Responsibilities:
 *  - Inject API key and sensible defaults (model, temperature, max_tokens)
 *  - Support tool-calling fields (tools, tool_choice)
 *  - Retry with exponential backoff on 429 (rate limit) and transient 5xx errors
 *  - Map provider errors to internal AppError codes
 *
 * Error codes:
 *   GROQ_AUTH_ERROR       — 401/403
 *   GROQ_RATE_LIMIT       — 429 exhausted after all retries
 *   GROQ_TIMEOUT          — AbortError / network timeout
 *   GROQ_UNKNOWN          — everything else
 */

import { AppError } from '../middleware/errorHandler.js'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// ── Retry config ──────────────────────────────────────────────────────────────
// Retried on: 429 (rate limit) and 5xx (transient server errors).
// Not retried on: 400 (bad request), 401/403 (auth), 4xx (client errors).

const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 500   // 500 ms → 1 s → 2 s
const REQUEST_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS) || 30_000

// ── Helpers ───────────────────────────────────────────────────────────────────

// Exported so tests can swap it out to avoid real delays.
// Using a mutable object lets callers replace the function after import.
export const timing = {
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}

/**
 * Compute backoff duration with full jitter to spread retries across clients.
 * @param {number} attempt  0-indexed attempt number
 */
function backoffMs(attempt) {
  const ceiling = BASE_BACKOFF_MS * 2 ** attempt
  return Math.random() * ceiling
}

/**
 * Whether an HTTP status code is worth retrying.
 * @param {number} status
 */
function isRetryable(status) {
  return status === 429 || status >= 500
}

/**
 * Map a Groq HTTP response or network error into an AppError.
 * @param {Response|null} response
 * @param {unknown}       rawError
 */
async function mapError(response, rawError) {
  if (!response) {
    const isTimeout =
      rawError?.name === 'AbortError' ||
      rawError?.code === 'ECONNABORTED' ||
      rawError?.code === 'UND_ERR_CONNECT_TIMEOUT'
    if (isTimeout) {
      return new AppError('GROQ_TIMEOUT', 'Groq API request timed out.', 504)
    }
    return new AppError(
      'GROQ_UNKNOWN',
      `Groq network error: ${rawError?.message ?? 'unknown'}`,
      502
    )
  }

  let body = {}
  try {
    body = await response.json()
  } catch {
    // ignore — fall through
  }

  const providerMsg = body?.error?.message ?? response.statusText

  if ([401, 403].includes(response.status)) {
    return new AppError('GROQ_AUTH_ERROR', 'Groq API authentication failed.', 502)
  }
  if (response.status === 429) {
    return new AppError('GROQ_RATE_LIMIT', 'Groq rate limit exceeded. Please try again shortly.', 429)
  }

  return new AppError(
    'GROQ_UNKNOWN',
    `Groq API error ${response.status}: ${providerMsg}`,
    502
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call Groq chat completions with retry on transient errors.
 *
 * @param {object}   options
 * @param {object[]} options.messages       OpenAI-format messages array
 * @param {object[]} [options.tools]        Tool definitions (JSON schema)
 * @param {string|object} [options.tool_choice]  'auto' | 'none' | { type, function }
 * @param {string}   [options.model]        Groq model ID (default from env or fallback)
 * @param {number}   [options.temperature]  0–2, default 0.4
 * @param {number}   [options.max_tokens]   Default 1024
 * @returns {Promise<object>}  Raw Groq chat completion response object
 */
export async function chatCompletion({
  messages,
  tools,
  tool_choice,
  model,
  temperature = 0.4,
  max_tokens = 1024,
}) {
  const body = {
    model: model ?? process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    messages,
    temperature,
    max_tokens,
    ...(tools?.length && { tools, tool_choice: tool_choice ?? 'auto' }),
  }

  let lastError = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (!response.ok) {
        const appErr = await mapError(response, null)

        // Auth errors (401/403) are never retried — fail fast
        if ([401, 403].includes(response.status)) throw appErr

        if (isRetryable(response.status) && attempt < MAX_RETRIES - 1) {
          const delay = backoffMs(attempt)
          logger.warn(
            { attempt, status: response.status, delayMs: Math.round(delay) },
            'Groq request failed — retrying'
          )
          lastError = appErr
          await timing.sleep(delay)
          continue
        }

        throw appErr
      }

      return await response.json()
    } catch (err) {
      clearTimeout(timer)

      // Re-throw AppErrors that aren't retryable (auth, bad request, etc.)
      if (err instanceof AppError) {
        const nonRetryableCodes = ['GROQ_AUTH_ERROR']
        if (nonRetryableCodes.includes(err.code) || attempt >= MAX_RETRIES - 1) throw err
        lastError = err
        const delay = backoffMs(attempt)
        logger.warn(
          { attempt, code: err.code, delayMs: Math.round(delay) },
          'Groq request failed — retrying'
        )
        await timing.sleep(delay)
        continue
      }

      // Network / timeout errors — always retry if attempts remain
      const appErr = await mapError(null, err)
      if (attempt < MAX_RETRIES - 1) {
        const delay = backoffMs(attempt)
        logger.warn(
          { attempt, message: err.message, delayMs: Math.round(delay) },
          'Groq network error — retrying'
        )
        lastError = appErr
        await timing.sleep(delay)
        continue
      }

      throw appErr
    }
  }

  // All retries exhausted
  throw lastError ?? new AppError('GROQ_UNKNOWN', 'Groq request failed after all retries.', 502)
}
