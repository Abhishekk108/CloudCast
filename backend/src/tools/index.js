/**
 * Tool registry — maps every tool name to its { schema, execute } pair.
 *
 * This is the single place the agent loop looks up tools. Adding a new tool
 * means adding it here (and in toolSchemas.js) — nothing else needs to change.
 *
 * Each execute(args) function:
 *  1. Validates args with Zod (throws AppError on bad input — never reaches API)
 *  2. Calls the relevant weatherApiClient method
 *  3. Returns a compact, normalised object (saves tokens; auditable)
 *
 * The agent calls tools like:
 *   const result = await registry['get_forecast'].execute({ location: 'Pune', days: 3 })
 */

import { z } from 'zod'
import { AppError } from '../middleware/errorHandler.js'
import {
  getCurrent,
  getForecast,
  getAlerts,
  getAstronomy,
  searchLocation,
} from '../services/weatherApiClient.js'
import {
  normalizeCurrent,
  normalizeForecast,
  normalizeAlerts,
  normalizeAstronomy,
  normalizeSearch,
} from '../services/normalizers.js'
import {
  getCurrentWeatherSchema,
  getForecastSchema,
  getWeatherAlertsSchema,
  getAstronomySchema,
  searchLocationSchema,
} from '../agent/toolSchemas.js'

// ── Arg validation schemas (Zod) ──────────────────────────────────────────────
// These mirror the JSON schemas in toolSchemas.js but use Zod for runtime
// validation so we get a clean error before hitting the network.

const locationArg = z
  .string({ required_error: 'location is required' })
  .min(1, 'location must not be empty')

const currentWeatherArgs = z.object({ location: locationArg })

const forecastArgs = z.object({
  location: locationArg,
  days: z.coerce.number().int().min(1).max(10).default(3),
})

const alertsArgs = z.object({ location: locationArg })

const astronomyArgs = z.object({
  location: locationArg,
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
})

const searchArgs = z.object({
  query: z
    .string({ required_error: 'query is required' })
    .min(1, 'query must not be empty'),
})

// ── Shared arg validator ──────────────────────────────────────────────────────

function parseArgs(schema, args, toolName) {
  const result = schema.safeParse(args)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || 'args'}: ${i.message}`)
      .join('; ')
    throw new AppError(
      'TOOL_INVALID_ARGS',
      `Invalid arguments for ${toolName}: ${issues}`,
      400
    )
  }
  return result.data
}

// ── Tool implementations ──────────────────────────────────────────────────────

const getCurrentWeather = {
  schema: getCurrentWeatherSchema,
  async execute(args) {
    const { location } = parseArgs(currentWeatherArgs, args, 'get_current_weather')
    const raw = await getCurrent(location)
    return normalizeCurrent(raw)
  },
}

const getForecastTool = {
  schema: getForecastSchema,
  async execute(args) {
    const { location, days } = parseArgs(forecastArgs, args, 'get_forecast')
    const raw = await getForecast(location, days)
    return normalizeForecast(raw)
  },
}

const getWeatherAlerts = {
  schema: getWeatherAlertsSchema,
  async execute(args) {
    const { location } = parseArgs(alertsArgs, args, 'get_weather_alerts')
    const raw = await getAlerts(location)
    return normalizeAlerts(raw)
  },
}

const getAstronomyTool = {
  schema: getAstronomySchema,
  async execute(args) {
    const { location, date } = parseArgs(astronomyArgs, args, 'get_astronomy')
    const raw = await getAstronomy(location, date)
    return normalizeAstronomy(raw)
  },
}

const searchLocationTool = {
  schema: searchLocationSchema,
  async execute(args) {
    const { query } = parseArgs(searchArgs, args, 'search_location')
    const raw = await searchLocation(query)
    return normalizeSearch(raw)
  },
}

// ── Registry ──────────────────────────────────────────────────────────────────
// Key = tool name as the LLM will call it (must match schema function.name).

export const registry = {
  get_current_weather: getCurrentWeather,
  get_forecast: getForecastTool,
  get_weather_alerts: getWeatherAlerts,
  get_astronomy: getAstronomyTool,
  search_location: searchLocationTool,
}

/**
 * Execute a tool by name with raw JSON args (as returned by the LLM).
 * Throws AppError if the tool name is unknown or args are invalid.
 *
 * @param {string} name   Tool name, e.g. 'get_forecast'
 * @param {object} args   Parsed JSON args object from the LLM tool_call
 * @returns {Promise<object>} Normalised result ready to send back to the LLM
 */
export async function executeTool(name, args) {
  const tool = registry[name]
  if (!tool) {
    throw new AppError('UNKNOWN_TOOL', `Unknown tool: "${name}"`, 400)
  }
  return tool.execute(args)
}
