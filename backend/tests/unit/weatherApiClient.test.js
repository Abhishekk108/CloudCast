/**
 * Unit tests for services/weatherApiClient.js
 *
 * All HTTP is mocked via jest.unstable_mockModule — no real network calls are made.
 * Each test covers: one success case + all mapped error codes per method.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals'

// ── Stub env before the module under test loads ───────────────────────────────
process.env.GROQ_API_KEY = 'test-groq-key'
process.env.WEATHER_API_KEY = 'test-weather-key'
process.env.NODE_ENV = 'test'

// ── Mock global fetch ─────────────────────────────────────────────────────────
const mockFetch = jest.fn()
global.fetch = mockFetch

// Helper — build a Response-like object
function makeResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body,
  }
}

// Import the module AFTER mocks are in place (ESM static imports run first, so
// we use dynamic import inside beforeEach/it where needed, but since we patch
// global.fetch it works with a top-level import too).
const {
  getCurrent,
  getForecast,
  getAlerts,
  getAstronomy,
  searchLocation,
} = await import('../../src/services/weatherApiClient.js')

// Import cache so we can clear it between tests — prevents stale cached
// responses from a success test leaking into error-case tests.
const { weatherCache } = await import('../../src/utils/cache.js')

import {
  rawCurrent,
  rawForecast,
  rawAlerts,
  rawAstronomy,
  rawSearch,
  errorLocationNotFound,
  errorAuthFailed,
} from '../fixtures/weatherApi.fixtures.js'

// ── Shared error scenarios ────────────────────────────────────────────────────

const errorCases = [
  {
    label: 'LOCATION_NOT_FOUND on 400 body',
    response: makeResponse(400, errorLocationNotFound),
    expectedCode: 'LOCATION_NOT_FOUND',
    expectedStatus: 404,
  },
  {
    label: 'LOCATION_NOT_FOUND on code 1006',
    response: makeResponse(400, { error: { code: 1006, message: 'No match.' } }),
    expectedCode: 'LOCATION_NOT_FOUND',
    expectedStatus: 404,
  },
  {
    label: 'WEATHER_API_AUTH_ERROR on 401',
    response: makeResponse(401, { error: { code: 2006, message: 'Invalid key.' } }),
    expectedCode: 'WEATHER_API_AUTH_ERROR',
    expectedStatus: 502,
  },
  {
    label: 'WEATHER_API_AUTH_ERROR on 403',
    response: makeResponse(403, errorAuthFailed),
    expectedCode: 'WEATHER_API_AUTH_ERROR',
    expectedStatus: 502,
  },
  {
    label: 'WEATHER_API_UNKNOWN on 500',
    response: makeResponse(500, { error: { code: 9999, message: 'Internal error.' } }),
    expectedCode: 'WEATHER_API_UNKNOWN',
    expectedStatus: 502,
  },
]

function makeTimeoutError() {
  const err = new Error('The operation was aborted.')
  err.name = 'AbortError'
  return err
}

// ── Helper that runs all error cases for a given client function ──────────────

async function runErrorCases(fn, args) {
  for (const { label, response, expectedCode, expectedStatus } of errorCases) {
    mockFetch.mockResolvedValueOnce(response)
    await expect(fn(...args)).rejects.toMatchObject({
      code: expectedCode,
      status: expectedStatus,
    })
    // annotate which case failed if the assertion fires
    void label
  }

  // Timeout case
  mockFetch.mockRejectedValueOnce(makeTimeoutError())
  await expect(fn(...args)).rejects.toMatchObject({
    code: 'WEATHER_API_TIMEOUT',
    status: 504,
  })

  // Generic network error
  const netErr = new Error('Network failure')
  mockFetch.mockRejectedValueOnce(netErr)
  await expect(fn(...args)).rejects.toMatchObject({
    code: 'WEATHER_API_UNKNOWN',
    status: 502,
  })
}

beforeEach(() => {
  mockFetch.mockReset()
  weatherCache.clear() // prevent cached success responses bleeding into error-case tests
})

// ── getCurrent ────────────────────────────────────────────────────────────────

describe('getCurrent', () => {
  it('returns raw JSON on success', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, rawCurrent))
    const result = await getCurrent('Pune')
    expect(result).toEqual(rawCurrent)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toContain('/current.json')
    expect(mockFetch.mock.calls[0][0]).toContain('q=Pune')
  })

  it('maps all error codes correctly', async () => {
    await runErrorCases(getCurrent, ['Pune'])
  })
})

// ── getForecast ───────────────────────────────────────────────────────────────

describe('getForecast', () => {
  it('returns raw JSON on success', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, rawForecast))
    const result = await getForecast('Pune', 3)
    expect(result).toEqual(rawForecast)
    expect(mockFetch.mock.calls[0][0]).toContain('/forecast.json')
    expect(mockFetch.mock.calls[0][0]).toContain('days=3')
  })

  it('maps all error codes correctly', async () => {
    await runErrorCases(getForecast, ['Pune', 3])
  })
})

// ── getAlerts ─────────────────────────────────────────────────────────────────

describe('getAlerts', () => {
  it('returns raw JSON on success', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, rawAlerts))
    const result = await getAlerts('Pune')
    expect(result).toEqual(rawAlerts)
    expect(mockFetch.mock.calls[0][0]).toContain('alerts=yes')
  })

  it('maps all error codes correctly', async () => {
    await runErrorCases(getAlerts, ['Pune'])
  })
})

// ── getAstronomy ──────────────────────────────────────────────────────────────

describe('getAstronomy', () => {
  it('returns raw JSON on success (no date)', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, rawAstronomy))
    const result = await getAstronomy('Pune')
    expect(result).toEqual(rawAstronomy)
    expect(mockFetch.mock.calls[0][0]).toContain('/astronomy.json')
  })

  it('includes dt param when date provided', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, rawAstronomy))
    await getAstronomy('Pune', '2024-07-15')
    expect(mockFetch.mock.calls[0][0]).toContain('dt=2024-07-15')
  })

  it('maps all error codes correctly', async () => {
    await runErrorCases(getAstronomy, ['Pune'])
  })
})

// ── searchLocation ────────────────────────────────────────────────────────────

describe('searchLocation', () => {
  it('returns raw array on success', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, rawSearch))
    const result = await searchLocation('Springfield')
    expect(result).toEqual(rawSearch)
    expect(mockFetch.mock.calls[0][0]).toContain('/search.json')
    expect(mockFetch.mock.calls[0][0]).toContain('q=Springfield')
  })

  it('maps all error codes correctly', async () => {
    await runErrorCases(searchLocation, ['Springfield'])
  })
})
