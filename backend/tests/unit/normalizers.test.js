/**
 * Unit tests for services/normalizers.js
 *
 * Given a raw WeatherAPI fixture, assert that the normalizer output matches
 * the expected compact snapshot exactly.
 */

import { describe, it, expect } from '@jest/globals'

process.env.GROQ_API_KEY = 'test-groq-key'
process.env.WEATHER_API_KEY = 'test-weather-key'
process.env.NODE_ENV = 'test'

import {
  normalizeCurrent,
  normalizeForecast,
  normalizeAlerts,
  normalizeAstronomy,
  normalizeSearch,
} from '../../src/services/normalizers.js'

import {
  rawCurrent,
  rawForecast,
  rawAlerts,
  rawAstronomy,
  rawSearch,
} from '../fixtures/weatherApi.fixtures.js'

// ── normalizeCurrent ──────────────────────────────────────────────────────────

describe('normalizeCurrent', () => {
  it('produces expected compact snapshot', () => {
    const result = normalizeCurrent(rawCurrent)

    expect(result).toEqual({
      location: {
        name: 'Pune',
        region: 'Maharashtra',
        country: 'India',
        lat: 18.52,
        lon: 73.86,
        localtime: '2024-07-15 14:30',
        tzId: 'Asia/Kolkata',
      },
      current: {
        tempC: 27.0,
        tempF: 80.6,
        feelsLikeC: 29.2,
        feelsLikeF: 84.6,
        humidity: 65,
        windKph: 14.4,
        windDir: 'W',
        pressureMb: 1008.0,
        visibilityKm: 10.0,
        uvIndex: 6.0,
        isDay: true,
        condition: {
          text: 'Partly cloudy',
          icon: 'https://cdn.weatherapi.com/weather/64x64/day/116.png',
        },
        lastUpdated: '2024-07-15 14:00',
      },
    })
  })

  it('converts protocol-relative icon URL to https', () => {
    const result = normalizeCurrent(rawCurrent)
    expect(result.current.condition.icon).toMatch(/^https:\/\//)
  })

  it('maps is_day=1 to isDay=true and is_day=0 to false', () => {
    const night = { ...rawCurrent, current: { ...rawCurrent.current, is_day: 0 } }
    expect(normalizeCurrent(night).current.isDay).toBe(false)
    expect(normalizeCurrent(rawCurrent).current.isDay).toBe(true)
  })
})

// ── normalizeForecast ─────────────────────────────────────────────────────────

describe('normalizeForecast', () => {
  it('produces expected compact snapshot (no hours)', () => {
    const result = normalizeForecast(rawForecast, false)

    expect(result.location.name).toBe('Pune')
    expect(result.forecast).toHaveLength(1)

    const day = result.forecast[0]
    expect(day).toEqual({
      date: '2024-07-15',
      maxTempC: 30.0,
      minTempC: 22.0,
      maxTempF: 86.0,
      minTempF: 71.6,
      avgHumidityPct: 68,
      chanceOfRainPct: 60,
      chanceOfSnowPct: 0,
      totalPrecipMm: 4.5,
      maxWindKph: 20.0,
      uvIndex: 5,
      condition: {
        text: 'Patchy rain possible',
        icon: 'https://cdn.weatherapi.com/weather/64x64/day/176.png',
      },
    })
  })

  it('includes hours when includeHours=true', () => {
    const result = normalizeForecast(rawForecast, true)
    const day = result.forecast[0]
    expect(day.hours).toHaveLength(1)
    expect(day.hours[0]).toMatchObject({
      time: '2024-07-15 18:00',
      tempC: 28.0,
      chanceOfRainPct: 55,
      windDir: 'SW',
    })
  })

  it('omits hours when includeHours=false', () => {
    const result = normalizeForecast(rawForecast, false)
    expect(result.forecast[0].hours).toBeUndefined()
  })
})

// ── normalizeAlerts ───────────────────────────────────────────────────────────

describe('normalizeAlerts', () => {
  it('produces expected compact snapshot', () => {
    const result = normalizeAlerts(rawAlerts)

    expect(result.hasAlerts).toBe(true)
    expect(result.alerts).toHaveLength(1)
    expect(result.alerts[0]).toEqual({
      headline: 'Flood Watch issued',
      severity: 'Moderate',
      urgency: 'Expected',
      areas: 'Pune district',
      event: 'Flood Watch',
      effective: '2024-07-15T12:00:00+05:30',
      expires: '2024-07-16T06:00:00+05:30',
      description: 'Flooding possible in low-lying areas.',
      instruction: 'Move valuables to higher ground.',
    })
  })

  it('returns hasAlerts=false when alert array is empty', () => {
    const noAlerts = { ...rawAlerts, alerts: { alert: [] } }
    const result = normalizeAlerts(noAlerts)
    expect(result.hasAlerts).toBe(false)
    expect(result.alerts).toHaveLength(0)
  })

  it('handles missing alerts field gracefully', () => {
    const noAlertsField = { location: rawAlerts.location }
    const result = normalizeAlerts(noAlertsField)
    expect(result.hasAlerts).toBe(false)
    expect(result.alerts).toEqual([])
  })
})

// ── normalizeAstronomy ────────────────────────────────────────────────────────

describe('normalizeAstronomy', () => {
  it('produces expected compact snapshot', () => {
    const result = normalizeAstronomy(rawAstronomy)

    expect(result.location.name).toBe('Pune')
    expect(result.astronomy).toEqual({
      sunrise: '06:05 AM',
      sunset: '07:22 PM',
      moonrise: '09:30 PM',
      moonset: '07:48 AM',
      moonPhase: 'Waning Gibbous',
      moonIlluminationPct: 78,
      isSunUp: true,
      isMoonUp: false,
    })
  })

  it('coerces moon_illumination string to number', () => {
    const result = normalizeAstronomy(rawAstronomy)
    expect(typeof result.astronomy.moonIlluminationPct).toBe('number')
  })
})

// ── normalizeSearch ───────────────────────────────────────────────────────────

describe('normalizeSearch', () => {
  it('produces expected compact snapshot', () => {
    const result = normalizeSearch(rawSearch)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      name: 'Springfield',
      region: 'Illinois',
      country: 'USA',
      lat: 39.8,
      lon: -89.65,
      url: 'springfield-illinois',
    })
  })

  it('returns empty array for empty input', () => {
    expect(normalizeSearch([])).toEqual([])
  })

  it('handles null/undefined input gracefully', () => {
    expect(normalizeSearch(null)).toEqual([])
    expect(normalizeSearch(undefined)).toEqual([])
  })
})
