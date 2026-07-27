/**
 * Tool schema definitions for the CloudCast agent.
 *
 * Each object follows the OpenAI/Groq function-calling format:
 *   { type: 'function', function: { name, description, parameters } }
 *
 * The LLM reads these descriptions and parameter descriptions to decide which
 * tool to call and with what arguments — so descriptions are written for the
 * model, not just for humans. Be specific about units, formats, and edge cases.
 *
 * Keep in sync with tools/index.js where execute() implementations live.
 */

// ── Individual schemas ────────────────────────────────────────────────────────

export const getCurrentWeatherSchema = {
  type: 'function',
  function: {
    name: 'get_current_weather',
    description:
      'Returns the current (real-time) weather conditions for a location, including ' +
      'temperature (Celsius and Fahrenheit), feels-like temperature, humidity, wind speed ' +
      'and direction, UV index, visibility, and a short condition description. ' +
      'Use this when the user asks about weather right now or "today".',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description:
            'The location to get weather for. Accepts city name (e.g. "Pune"), ' +
            '"City, Country" (e.g. "Paris, France"), US ZIP code, or "lat,lon" coordinates. ' +
            'If the user gives an ambiguous name, call search_location first to disambiguate.',
        },
      },
      required: ['location'],
      additionalProperties: false,
    },
  },
}

export const getForecastSchema = {
  type: 'function',
  function: {
    name: 'get_forecast',
    description:
      'Returns a day-by-day weather forecast for up to 10 days. Each day includes ' +
      'high/low temperatures, average humidity, chance of rain (%), chance of snow (%), ' +
      'total precipitation (mm), max wind speed (kph), UV index, and condition. ' +
      'Use this for questions about upcoming weather, specific dates, or multi-day comparisons.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The location to forecast. Same format as get_current_weather.',
        },
        days: {
          type: 'integer',
          description:
            'Number of forecast days to return, between 1 and 10. ' +
            'WeatherAPI counts today as day 1 (forecastday[0]), so to get tomorrow ' +
            'use days=2. Use 2 for "tomorrow", 3 for "next couple of days", ' +
            '7 for "this week". Default: 3.',
          minimum: 1,
          maximum: 10,
          default: 3,
        },
      },
      required: ['location'],
      additionalProperties: false,
    },
  },
}

export const getWeatherAlertsSchema = {
  type: 'function',
  function: {
    name: 'get_weather_alerts',
    description:
      'Returns any active official weather alerts or warnings for a location ' +
      '(e.g. flood watches, thunderstorm warnings, cyclone alerts). ' +
      'Each alert includes headline, severity, urgency, affected areas, event type, ' +
      'effective and expiry times, description, and safety instructions. ' +
      'Returns an empty alerts list if no alerts are active. ' +
      'Use this when the user asks about warnings, safety, or severe weather.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The location to check for alerts. Same format as get_current_weather.',
        },
      },
      required: ['location'],
      additionalProperties: false,
    },
  },
}

export const getAstronomySchema = {
  type: 'function',
  function: {
    name: 'get_astronomy',
    description:
      'Returns astronomical data for a location and date: sunrise and sunset times, ' +
      'moonrise and moonset times, moon phase name (e.g. "Waxing Gibbous"), and moon ' +
      'illumination percentage. ' +
      'Use this when the user asks about sunrise/sunset, moonrise/moonset, or moon phases.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The location. Same format as get_current_weather.',
        },
        date: {
          type: 'string',
          description:
            'Date in YYYY-MM-DD format (e.g. "2024-07-20"). ' +
            'Omit or leave blank for today\'s astronomical data.',
        },
      },
      required: ['location'],
      additionalProperties: false,
    },
  },
}

export const searchLocationSchema = {
  type: 'function',
  function: {
    name: 'search_location',
    description:
      'Searches for matching locations by name and returns a list of candidates, ' +
      'each with name, region, country, and coordinates. ' +
      'Use this BEFORE other weather tools when a user provides an ambiguous location ' +
      '(e.g. "Springfield" matches multiple cities). Present the options to the user ' +
      'and ask them to clarify before proceeding.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'The location search query, e.g. "Springfield" or "San Jose". ' +
            'Can be partial names, city names, or region names.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
}

// ── Exported array ────────────────────────────────────────────────────────────
// This is what gets passed to Groq on every chat request.
// Order matters slightly — put the most commonly used tools first.

export const TOOL_SCHEMAS = [
  getCurrentWeatherSchema,
  getForecastSchema,
  getWeatherAlertsSchema,
  getAstronomySchema,
  searchLocationSchema,
]

// ── Name set for fast lookup ──────────────────────────────────────────────────
export const TOOL_NAMES = new Set(TOOL_SCHEMAS.map((t) => t.function.name))
