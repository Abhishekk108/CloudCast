/**
 * Unit tests for utils/cache.js
 *
 * Key acceptance criterion: two identical calls within the TTL window result
 * in only one outbound HTTP call (verified via mock fetch call count).
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'

process.env.GROQ_API_KEY = 'test-groq-key'
process.env.WEATHER_API_KEY = 'test-weather-key'
process.env.NODE_ENV = 'test'

// ── TtlCache unit tests ───────────────────────────────────────────────────────

import { TtlCache } from '../../src/utils/cache.js'

describe('TtlCache', () => {
  let cache

  beforeEach(() => {
    cache = new TtlCache({ ttlMs: 200, sweepMs: 10_000 })
  })

  afterEach(() => {
    cache.destroy()
  })

  it('returns undefined for a key that has never been set', () => {
    expect(cache.get('missing')).toBeUndefined()
  })

  it('returns a stored value before expiry', () => {
    cache.set('key', { temp: 27 })
    expect(cache.get('key')).toEqual({ temp: 27 })
  })

  it('returns undefined after the entry has expired', async () => {
    cache.set('key', 'value', 50) // 50 ms TTL
    await new Promise((r) => setTimeout(r, 80))
    expect(cache.get('key')).toBeUndefined()
  })

  it('del() removes a specific entry', () => {
    cache.set('a', 1)
    cache.set('b', 2)
    cache.del('a')
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
  })

  it('clear() removes all entries', () => {
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
  })

  it('size reflects only live entries', async () => {
    cache.set('live', 'x', 500)
    cache.set('expired', 'y', 10)
    await new Promise((r) => setTimeout(r, 30))
    expect(cache.size).toBe(1)
  })

  it('custom per-entry TTL overrides instance TTL', async () => {
    cache.set('short', 'x', 30)   // expires in 30 ms
    cache.set('long', 'y', 500)   // expires in 500 ms
    await new Promise((r) => setTimeout(r, 60))
    expect(cache.get('short')).toBeUndefined()
    expect(cache.get('long')).toBe('y')
  })
})

// ── Caching integrated into weatherApiClient ─────────────────────────────────
// The core acceptance criterion: two identical calls → one fetch.

describe('weatherApiClient caching', () => {
  const mockFetch = jest.fn()

  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
  })

  it('serves the second identical call from cache (only 1 fetch)', async () => {
    const mockPayload = { location: { name: 'Pune' }, current: { temp_c: 27 } }
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockPayload,
    })

    // Dynamic import so the module picks up our global.fetch mock.
    // We also need a fresh cache state — clear the singleton.
    const { weatherCache } = await import('../../src/utils/cache.js')
    weatherCache.clear()

    const { getCurrent } = await import('../../src/services/weatherApiClient.js')

    const first = await getCurrent('Pune')
    const second = await getCurrent('Pune')

    // Both calls return the same data
    expect(first).toEqual(mockPayload)
    expect(second).toEqual(mockPayload)

    // But fetch was only called once
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('makes a new fetch for a different location', async () => {
    const makeMock = (city) => ({ location: { name: city }, current: { temp_c: 20 } })
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeMock('Pune') })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => makeMock('Mumbai') })

    const { weatherCache } = await import('../../src/utils/cache.js')
    weatherCache.clear()

    const { getCurrent } = await import('../../src/services/weatherApiClient.js')

    await getCurrent('Pune')
    await getCurrent('Mumbai')

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('does not cache on error responses', async () => {
    // First call fails — should NOT be cached
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 1006, message: 'Not found.' } }),
    })

    const { weatherCache } = await import('../../src/utils/cache.js')
    weatherCache.clear()

    const { getCurrent } = await import('../../src/services/weatherApiClient.js')

    await expect(getCurrent('BadCity')).rejects.toMatchObject({ code: 'LOCATION_NOT_FOUND' })

    // Second call to the same location (after fixing the mock) should hit network again
    // because the error was not cached.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ location: { name: 'BadCity' }, current: { temp_c: 30 } }),
    })
    const result = await getCurrent('BadCity')
    expect(result.location.name).toBe('BadCity')

    // fetch called twice — error was not cached
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
