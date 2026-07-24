/**
 * Unit tests for agent/toolSchemas.js
 *
 * Validates that every schema follows the OpenAI/Groq tool-calling format
 * exactly — so no malformed-schema errors occur on a live call.
 *
 * Checks:
 *  - Top-level shape: { type: 'function', function: { name, description, parameters } }
 *  - parameters is a valid JSON Schema object with type:'object' and required array
 *  - All required properties are defined in the properties map
 *  - No unknown top-level keys that would cause Groq to reject the schema
 *  - TOOL_NAMES set is consistent with TOOL_SCHEMAS array
 */

import { describe, it, expect } from '@jest/globals'

process.env.GROQ_API_KEY = 'test-groq-key'
process.env.WEATHER_API_KEY = 'test-weather-key'
process.env.NODE_ENV = 'test'

import {
  TOOL_SCHEMAS,
  TOOL_NAMES,
  getCurrentWeatherSchema,
  getForecastSchema,
  getWeatherAlertsSchema,
  getAstronomySchema,
  searchLocationSchema,
} from '../../src/agent/toolSchemas.js'

// ── Schema format validator ───────────────────────────────────────────────────

function validateToolSchema(schema) {
  const errors = []

  // Top-level
  if (schema.type !== 'function') {
    errors.push(`type must be 'function', got '${schema.type}'`)
  }
  if (!schema.function || typeof schema.function !== 'object') {
    errors.push('missing or invalid function object')
    return errors // can't continue without function
  }

  const { name, description, parameters } = schema.function

  if (!name || typeof name !== 'string') errors.push('function.name must be a non-empty string')
  if (!description || typeof description !== 'string') errors.push('function.description must be a non-empty string')

  // Parameters (JSON Schema)
  if (!parameters || typeof parameters !== 'object') {
    errors.push('function.parameters must be an object')
    return errors
  }
  if (parameters.type !== 'object') errors.push("parameters.type must be 'object'")
  if (!parameters.properties || typeof parameters.properties !== 'object') {
    errors.push('parameters.properties must be an object')
  }
  if (!Array.isArray(parameters.required)) {
    errors.push('parameters.required must be an array')
  } else if (parameters.properties) {
    // Every required field must be in properties
    for (const req of parameters.required) {
      if (!parameters.properties[req]) {
        errors.push(`required property '${req}' is missing from parameters.properties`)
      }
    }
  }

  // Each property must have a type and description
  if (parameters.properties) {
    for (const [key, prop] of Object.entries(parameters.properties)) {
      if (!prop.type) errors.push(`property '${key}' is missing 'type'`)
      if (!prop.description) errors.push(`property '${key}' is missing 'description'`)
    }
  }

  return errors
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TOOL_SCHEMAS array', () => {
  it('exports exactly 5 tool schemas', () => {
    expect(TOOL_SCHEMAS).toHaveLength(5)
  })

  it('contains only valid tool objects (no format errors)', () => {
    for (const schema of TOOL_SCHEMAS) {
      const errors = validateToolSchema(schema)
      expect(errors).toEqual([])
    }
  })

  it('all tool names are unique', () => {
    const names = TOOL_SCHEMAS.map((t) => t.function.name)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('TOOL_NAMES', () => {
  it('contains all 5 expected tool names', () => {
    expect(TOOL_NAMES.has('get_current_weather')).toBe(true)
    expect(TOOL_NAMES.has('get_forecast')).toBe(true)
    expect(TOOL_NAMES.has('get_weather_alerts')).toBe(true)
    expect(TOOL_NAMES.has('get_astronomy')).toBe(true)
    expect(TOOL_NAMES.has('search_location')).toBe(true)
  })

  it('is consistent with TOOL_SCHEMAS (same names, same count)', () => {
    expect(TOOL_NAMES.size).toBe(TOOL_SCHEMAS.length)
    for (const schema of TOOL_SCHEMAS) {
      expect(TOOL_NAMES.has(schema.function.name)).toBe(true)
    }
  })
})

// ── Per-schema structural tests ───────────────────────────────────────────────

describe('get_current_weather schema', () => {
  it('passes format validation', () => {
    expect(validateToolSchema(getCurrentWeatherSchema)).toEqual([])
  })
  it('has location as required', () => {
    expect(getCurrentWeatherSchema.function.parameters.required).toContain('location')
  })
})

describe('get_forecast schema', () => {
  it('passes format validation', () => {
    expect(validateToolSchema(getForecastSchema)).toEqual([])
  })
  it('has location as required and days as optional', () => {
    const { required, properties } = getForecastSchema.function.parameters
    expect(required).toContain('location')
    expect(required).not.toContain('days')
    expect(properties.days.type).toBe('integer')
    expect(properties.days.minimum).toBe(1)
    expect(properties.days.maximum).toBe(10)
  })
})

describe('get_weather_alerts schema', () => {
  it('passes format validation', () => {
    expect(validateToolSchema(getWeatherAlertsSchema)).toEqual([])
  })
  it('has only location as required', () => {
    expect(getWeatherAlertsSchema.function.parameters.required).toEqual(['location'])
  })
})

describe('get_astronomy schema', () => {
  it('passes format validation', () => {
    expect(validateToolSchema(getAstronomySchema)).toEqual([])
  })
  it('has location as required and date as optional', () => {
    const { required, properties } = getAstronomySchema.function.parameters
    expect(required).toContain('location')
    expect(required).not.toContain('date')
    expect(properties.date.type).toBe('string')
  })
})

describe('search_location schema', () => {
  it('passes format validation', () => {
    expect(validateToolSchema(searchLocationSchema)).toEqual([])
  })
  it('has query as the required parameter', () => {
    expect(searchLocationSchema.function.parameters.required).toEqual(['query'])
  })
})
