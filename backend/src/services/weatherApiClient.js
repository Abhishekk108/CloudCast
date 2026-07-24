/**
 * Thin wrapper around WeatherAPI.com REST endpoints.
 *
 * Centralises:
 *  - Base URL and API key injection
 *  - HTTP error → internal error code mapping
 *  - Timeout handling
 *
 * All methods return raw WeatherAPI JSON. Normalisation happens in
 * services/normalizers.js so this module stays easy to unit-test.
 *
 * Error codes surfaced via AppError:
 *   LOCATION_NOT_FOUND   — 400/1006 from WeatherAPI
 *   WEATHER_API_AUTH_ERROR — 401/403/2006/2007/2008
 *   WEATHER_API_TIMEOUT    — fetch AbortError / ECONNABORTED
 *   WEATHER_API_UNKNOWN    — everything else
 */

import { AppError } from '../middleware/errorHandler.js'
import { env } from '../config/env.js'
import { weatherCache } from '../utils/cache.js'

const BASE_URL = 'https://api.weatherapi.com/v1'

// Default request timeout: 8 seconds
const REQUEST_TIMEOUT_MS = Number(process.env.WEATHER_API_TIMEOUT_MS) || 8_000

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Map a WeatherAPI error response body or network error into an AppError.
 * @param {Response|null} response  The fetch Response, or null for network errors
 * @param {unknown}       rawError  The original caught error
 */
async function mapError(response, rawError) {
  // Network / timeout errors
  if (!response) {
    const isTimeout =
      rawError?.name === 'AbortError' ||
      rawError?.code === 'ECONNABORTED' ||
      rawError?.code === 'UND_ERR_CONNECT_TIMEOUT'
    if (isTimeout) {
      return new AppError('WEATHER_API_TIMEOUT', 'Weather API request timed out.', 504)
    }
    return new AppError(
      'WEATHER_API_UNKNOWN',
      `Weather API network error: ${rawError?.message ?? 'unknown'}`,
      502
    )
  }

  // Parse the JSON error body WeatherAPI sends back
  let body = {}
  try {
    body = await response.json()
  } catch {
    // ignore parse failure — fall through to status-based mapping
  }

  const code = body?.error?.code // WeatherAPI numeric error code
  const providerMsg = body?.error?.message ?? response.statusText

  if (response.status === 400 || code === 1006) {
    return new AppError('LOCATION_NOT_FOUND', `Location not found: ${providerMsg}`, 404)
  }
  if ([401, 403].includes(response.status) || [2006, 2007, 2008].includes(code)) {
    return new AppError('WEATHER_API_AUTH_ERROR', 'Weather API authentication failed.', 502)
  }

  return new AppError(
    'WEATHER_API_UNKNOWN',
    `Weather API error ${response.status}: ${providerMsg}`,
    502
  )
}

/**
 * Perform a fetch with a timeout, caching, and consistent error mapping.
 * @param {string} endpoint  Path after BASE_URL (e.g. '/current.json')
 * @param {Record<string, string>} params  Query string params (excluding key)
 */
async function request(endpoint, params) {
  // ── Cache key: stable regardless of param insertion order ────────────────
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  const cacheKey = `${endpoint}?${sortedParams}`

  const cached = weatherCache.get(cacheKey)
  if (cached !== undefined) return cached

  // ── Build URL (API key injected here, NOT in the cache key) ──────────────
  const url = new URL(`${BASE_URL}${endpoint}`)
  url.searchParams.set('key', env.WEATHER_API_KEY)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v))
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url.toString(), { signal: controller.signal })
    clearTimeout(timer)

    if (!response.ok) {
      throw await mapError(response, null)
    }

    const data = await response.json()
    weatherCache.set(cacheKey, data) // cache on successful response only
    return data
  } catch (err) {
    clearTimeout(timer)
    // Re-throw AppErrors we already created (e.g. from mapError above)
    if (err instanceof AppError) throw err
    // Map network / timeout / abort errors
    throw await mapError(null, err)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Current weather conditions for a location.
 * Wraps /current.json
 * @param {string} location  City name, lat/lon, or zip
 */
export async function getCurrent(location) {
  return request('/current.json', { q: location, aqi: 'no' })
}

/**
 * Weather forecast for 1–10 days.
 * Wraps /forecast.json
 * @param {string} location
 * @param {number} days  1–10
 */
export async function getForecast(location, days = 3) {
  return request('/forecast.json', { q: location, days: String(days), aqi: 'no', alerts: 'no' })
}

/**
 * Weather alerts for a location (uses forecast endpoint with alerts=yes).
 * Wraps /forecast.json?alerts=yes
 * @param {string} location
 */
export async function getAlerts(location) {
  return request('/forecast.json', { q: location, days: '1', aqi: 'no', alerts: 'yes' })
}

/**
 * Sunrise/sunset and moon phase data.
 * Wraps /astronomy.json
 * @param {string} location
 * @param {string} [date]  YYYY-MM-DD, defaults to today
 */
export async function getAstronomy(location, date) {
  const params = { q: location }
  if (date) params.dt = date
  return request('/astronomy.json', params)
}

/**
 * Location search / disambiguation.
 * Wraps /search.json
 * @param {string} query
 */
export async function searchLocation(query) {
  return request('/search.json', { q: query })
}
