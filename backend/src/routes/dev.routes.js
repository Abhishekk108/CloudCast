/**
 * Dev-only routes — registered only when NODE_ENV !== 'production'.
 *
 * GET /api/dev/weather?location=<city>
 *   Returns normalized current weather + 3-day forecast for quick end-to-end
 *   sanity checks without needing the full agent loop.
 *
 * GET /api/dev/weather/raw?location=<city>
 *   Returns the raw (un-normalized) WeatherAPI current response — useful for
 *   verifying the API key works and inspecting the full payload shape.
 *
 * GET /api/dev/cache
 *   Returns the current cache size (entry count) so you can verify caching works.
 *
 * These routes are NEVER registered in production. Remove this file (or leave it —
 * it's unreachable) once Phase 2 is verified.
 */

import { Router } from 'express'
import { z } from 'zod'
import { getCurrent, getForecast } from '../services/weatherApiClient.js'
import { normalizeCurrent, normalizeForecast } from '../services/normalizers.js'
import { weatherCache } from '../utils/cache.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { validateQuery } from '../middleware/validateRequest.js'

const router = Router()

const locationQuerySchema = z.object({
  location: z
    .string({ required_error: 'location query param is required' })
    .min(1, 'location must not be empty'),
})

// GET /api/dev/weather?location=Pune
router.get(
  '/weather',
  validateQuery(locationQuerySchema),
  asyncHandler(async (req, res) => {
    const { location } = req.query

    // Run both calls concurrently — each may be served from cache
    const [rawCurrent, rawForecast] = await Promise.all([
      getCurrent(location),
      getForecast(location, 3),
    ])

    res.json({
      location: normalizeCurrent(rawCurrent).location,
      current: normalizeCurrent(rawCurrent).current,
      forecast: normalizeForecast(rawForecast).forecast,
      _meta: { cached: weatherCache.size > 0, cacheEntries: weatherCache.size },
    })
  })
)

// GET /api/dev/weather/raw?location=Pune  — raw payload for inspection
router.get(
  '/weather/raw',
  validateQuery(locationQuerySchema),
  asyncHandler(async (req, res) => {
    const raw = await getCurrent(req.query.location)
    res.json(raw)
  })
)

// GET /api/dev/cache  — cache diagnostics
router.get('/cache', (_req, res) => {
  res.json({ cacheEntries: weatherCache.size })
})

export default router
