/**
 * Unit tests for tools/index.js (tool registry + executeTool)
 *
 * Acceptance criterion:
 *   tools.get_forecast.execute({ location: 'Pune', days: 3 })
 *   returns correctly shaped, normalised data.
 *
 * All WeatherAPI HTTP calls are mocked — no real network calls.
 * Each test verifies: correct client method called, normalised output shape.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals'

process.env.GROQ_API_KEY = 'test-groq-key'
process.env.WEATHER_API_KEY = 'test-weather-key'
process.env.NODE_ENV = 'test'

const mockFetch = jest.fn()
global.fetch = mockFetch

// ── Fixtures ──────────────────────────────────────────────────────────────────

import {
  rawCurrent,
  rawForecast,
  rawAlerts,
  rawAstronomy,
  rawSearch,
} from '../fixtures/weatherApi.fixtures.js'

// ── Module under test ─────────────────────────────────────────────────────────

const { registry, executeTool } = await import('../../src/tools/index.js')
const { weatherCache }           = await import('../../src/utils/cache.js')

function makeResponse(body) {
  return { ok: true, status: 200, statusText: 'OK', json: async () => body }
}

beforeEach(() => {
  mockFetch.mockReset()
  weatherCache.clear()
})

// ── Registry shape ────────────────────────────────────────────────────────────

describe('registry structure', () => {
  it('exports all five tools', () => {
    expect(Object.keys(registry)).toEqual([
      'get_current_weather',
      'get_forecast',
      'get_weather_alerts',
      'get_astronomy',
      'search_location',
    ])
  })

  it('each entry has schema and execute', () => {
    for (const [name, tool] of Object.entries(registry)) {
      expect({ name, hasSchema: tool.schema !== undefined }).toMatchObject({ hasSchema: true })
      expect({ name, executeType: typeof tool.execute }).toMatchObject({ executeType: 'function' })
    }
  })

  it('each schema name matches its registry key', () => {
    for (const [key, tool] of Object.entries(registry)) {
      expect(tool.schema.function.name).toBe(key)
    }
  })
})

// ── get_current_weather ───────────────────────────────────────────────────────

describe('get_current_weather.execute', () => {
  it('returns normalised current weather (core AC)', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(rawCurrent))
    const result = await registry.get_current_weather.execute({ location: 'Pune' })

    expect(result).toMatchObject({
      location: { name: 'Pune' },
      current: {
        tempC: expect.any(Number),
        tempF: expect.any(Number),
        humidity: expect.any(Number),
        condition: { text: expect.any(String) },
      },
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toContain('/current.json')
  })

  it('throws TOOL_INVALID_ARGS when location is missing', async () => {
    await expect(registry.get_current_weather.execute({})).rejects.toMatchObject({
      code: 'TOOL_INVALID_ARGS',
      status: 400,
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('throws TOOL_INVALID_ARGS when location is empty string', async () => {
    await expect(registry.get_current_weather.execute({ location: '' })).rejects.toMatchObject({
      code: 'TOOL_INVALID_ARGS',
    })
  })
})

// ── get_forecast (primary acceptance criterion) ───────────────────────────────

describe('get_forecast.execute', () => {
  it('returns correctly shaped normalised data for Pune, 3 days (AC)', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(rawForecast))
    const result = await registry.get_forecast.execute({ location: 'Pune', days: 3 })

    // Shape check — matches normalizeForecast output
    expect(result).toMatchObject({
      location: { name: 'Pune' },
      forecast: expect.arrayContaining([
        expect.objectContaining({
          date: expect.any(String),
          maxTempC: expect.any(Number),
          minTempC: expect.any(Number),
          chanceOfRainPct: expect.any(Number),
          condition: { text: expect.any(String), icon: expect.any(String) },
        }),
      ]),
    })

    // Confirms days param is forwarded
    expect(mockFetch.mock.calls[0][0]).toContain('days=3')
  })

  it('defaults to 3 days when days is omitted', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(rawForecast))
    await registry.get_forecast.execute({ location: 'Pune' })
    expect(mockFetch.mock.calls[0][0]).toContain('days=3')
  })

  it('coerces string days to integer', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(rawForecast))
    await registry.get_forecast.execute({ location: 'Pune', days: '7' })
    expect(mockFetch.mock.calls[0][0]).toContain('days=7')
  })

  it('throws TOOL_INVALID_ARGS when days exceeds 10', async () => {
    await expect(registry.get_forecast.execute({ location: 'Pune', days: 11 }))
      .rejects.toMatchObject({ code: 'TOOL_INVALID_ARGS' })
  })

  it('throws TOOL_INVALID_ARGS when location is missing', async () => {
    await expect(registry.get_forecast.execute({ days: 3 }))
      .rejects.toMatchObject({ code: 'TOOL_INVALID_ARGS' })
  })
})

// ── get_weather_alerts ────────────────────────────────────────────────────────

describe('get_weather_alerts.execute', () => {
  it('returns normalised alerts', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(rawAlerts))
    const result = await registry.get_weather_alerts.execute({ location: 'Pune' })

    expect(result).toMatchObject({
      location: { name: 'Pune' },
      hasAlerts: expect.any(Boolean),
      alerts: expect.any(Array),
    })
    expect(mockFetch.mock.calls[0][0]).toContain('alerts=yes')
  })

  it('throws TOOL_INVALID_ARGS on missing location', async () => {
    await expect(registry.get_weather_alerts.execute({}))
      .rejects.toMatchObject({ code: 'TOOL_INVALID_ARGS' })
  })
})

// ── get_astronomy ─────────────────────────────────────────────────────────────

describe('get_astronomy.execute', () => {
  it('returns normalised astronomy data without date', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(rawAstronomy))
    const result = await registry.get_astronomy.execute({ location: 'Pune' })

    expect(result).toMatchObject({
      location: { name: 'Pune' },
      astronomy: {
        sunrise: expect.any(String),
        sunset: expect.any(String),
        moonPhase: expect.any(String),
      },
    })
  })

  it('forwards date param when provided', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(rawAstronomy))
    await registry.get_astronomy.execute({ location: 'Pune', date: '2024-07-20' })
    expect(mockFetch.mock.calls[0][0]).toContain('dt=2024-07-20')
  })

  it('throws TOOL_INVALID_ARGS on malformed date', async () => {
    await expect(registry.get_astronomy.execute({ location: 'Pune', date: '20-07-2024' }))
      .rejects.toMatchObject({ code: 'TOOL_INVALID_ARGS' })
  })
})

// ── search_location ───────────────────────────────────────────────────────────

describe('search_location.execute', () => {
  it('returns normalised array of location matches', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(rawSearch))
    const result = await registry.search_location.execute({ query: 'Springfield' })

    expect(Array.isArray(result)).toBe(true)
    expect(result[0]).toMatchObject({
      name: 'Springfield',
      region: expect.any(String),
      country: expect.any(String),
    })
  })

  it('throws TOOL_INVALID_ARGS on missing query', async () => {
    await expect(registry.search_location.execute({}))
      .rejects.toMatchObject({ code: 'TOOL_INVALID_ARGS' })
  })
})

// ── executeTool() dispatcher ──────────────────────────────────────────────────

describe('executeTool()', () => {
  it('dispatches to the correct tool and returns normalised data', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(rawForecast))
    const result = await executeTool('get_forecast', { location: 'Pune', days: 3 })
    expect(result.location.name).toBe('Pune')
    expect(result.forecast).toHaveLength(1)
  })

  it('throws UNKNOWN_TOOL for an unrecognised tool name', async () => {
    await expect(executeTool('get_air_quality', { location: 'Pune' }))
      .rejects.toMatchObject({ code: 'UNKNOWN_TOOL', status: 400 })
  })

  it('surfaces TOOL_INVALID_ARGS from the underlying tool', async () => {
    await expect(executeTool('get_forecast', {}))
      .rejects.toMatchObject({ code: 'TOOL_INVALID_ARGS' })
  })
})
