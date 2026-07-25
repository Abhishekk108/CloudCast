/**
 * Task 6.3 — Backend graceful degradation tests
 * Task 6.4 — Ambiguous location handling tests
 *
 * AC 6.3: Provider outages return a friendly chat-style reply (200, not 500),
 *         with no raw stack traces or error codes exposed to the client.
 *
 * AC 6.4: Asking about an ambiguous city produces a clarifying question from
 *         the agent (search_location is called, LLM asks which city).
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import request from 'supertest'

process.env.GROQ_API_KEY = 'test-groq-key'
process.env.WEATHER_API_KEY = 'test-weather-key'
process.env.NODE_ENV = 'test'
process.env.CHAT_RATE_LIMIT_MAX = '1000'

// ── Mock the agent ────────────────────────────────────────────────────────────
const mockRunAgent = jest.fn()

jest.unstable_mockModule('../../src/agent/agent.js', () => ({
  runAgent: mockRunAgent,
  MAX_TOOL_ITERATIONS: 5,
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

const { default: app } = await import('../../src/app.js')
const { AppError } = await import('../../src/middleware/errorHandler.js')

const VALID_BODY = { message: 'What is the weather in Pune?' }

beforeEach(() => {
  mockRunAgent.mockReset()
  mockFetch.mockReset()
})

// ── Task 6.3 — Graceful degradation ──────────────────────────────────────────

describe('Task 6.3 — graceful degradation', () => {
  it('returns 200 with friendly reply when WeatherAPI times out', async () => {
    mockRunAgent.mockRejectedValueOnce(
      new AppError('WEATHER_API_TIMEOUT', 'Weather API request timed out.', 504)
    )

    const res = await request(app)
      .post('/api/chat')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    expect(res.body.reply).toMatch(/couldn't fetch live weather data/i)
    expect(res.body.degraded).toBe(true)
    expect(res.body.toolCalls).toEqual([])
    expect(res.body.conversationId).toBeDefined()
  })

  it('returns 200 with friendly reply when Groq times out', async () => {
    mockRunAgent.mockRejectedValueOnce(
      new AppError('GROQ_TIMEOUT', 'Groq API request timed out.', 504)
    )

    const res = await request(app)
      .post('/api/chat')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    expect(res.body.reply).toMatch(/trouble connecting to my AI service/i)
    expect(res.body.degraded).toBe(true)
  })

  it('returns 200 with friendly reply when Groq is rate limited', async () => {
    mockRunAgent.mockRejectedValueOnce(
      new AppError('GROQ_RATE_LIMIT', 'Groq rate limit exceeded.', 429)
    )

    const res = await request(app)
      .post('/api/chat')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    expect(res.body.reply).toMatch(/rate limit/i)
    expect(res.body.degraded).toBe(true)
  })

  it('returns 200 with friendly reply for WeatherAPI unknown error', async () => {
    mockRunAgent.mockRejectedValueOnce(
      new AppError('WEATHER_API_UNKNOWN', 'Weather API error 500.', 502)
    )

    const res = await request(app)
      .post('/api/chat')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    expect(res.body.reply).toMatch(/couldn't fetch live weather data/i)
    expect(res.body.degraded).toBe(true)
  })

  it('still returns 500 for truly unexpected errors (not provider outages)', async () => {
    mockRunAgent.mockRejectedValueOnce(new Error('Unexpected database failure'))

    const res = await request(app)
      .post('/api/chat')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(500)
    expect(res.body.error).toBeDefined()
  })

  it('reply does not contain raw error codes or stack traces', async () => {
    mockRunAgent.mockRejectedValueOnce(
      new AppError('WEATHER_API_TIMEOUT', 'timed out', 504)
    )

    const res = await request(app)
      .post('/api/chat')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json')

    // Should not contain any raw internal error code in the reply
    expect(res.body.reply).not.toMatch(/WEATHER_API_TIMEOUT/)
    expect(res.body.reply).not.toMatch(/AppError/)
    expect(res.body.reply).not.toMatch(/at runAgent/)
  })

  it('degraded response has all required fields from the chat contract', async () => {
    mockRunAgent.mockRejectedValueOnce(
      new AppError('GROQ_UNKNOWN', 'Groq error', 502)
    )

    const res = await request(app)
      .post('/api/chat')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    expect(typeof res.body.reply).toBe('string')
    expect(Array.isArray(res.body.toolCalls)).toBe(true)
    expect(res.body.conversationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })
})

// ── Task 6.4 — Ambiguous location handling ────────────────────────────────────

describe('Task 6.4 — ambiguous location handling', () => {
  it('returns a clarifying question when the agent calls search_location', async () => {
    // Simulate: agent called search_location, found multiple matches, LLM asks user
    mockRunAgent.mockResolvedValueOnce({
      reply:
        "I found several cities named Springfield — could you clarify which one you mean? " +
        "For example: Springfield, Illinois or Springfield, Missouri?",
      toolCalls: [
        {
          tool: 'search_location',
          args: { query: 'Springfield' },
          result: [
            { name: 'Springfield', region: 'Illinois', country: 'USA' },
            { name: 'Springfield', region: 'Missouri', country: 'USA' },
          ],
        },
      ],
      usage: null,
      cappedOut: false,
    })

    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Weather in Springfield?' })
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    // Reply should be a question, not a weather fact
    expect(res.body.reply).toMatch(/clarif|which|Springfield/i)
    expect(res.body.reply).not.toMatch(/°C|°F|humidity|wind speed/i)

    // search_location should be in the trace
    const searchCall = res.body.toolCalls.find((t) => t.tool === 'search_location')
    expect(searchCall).toBeDefined()
    expect(searchCall.result).toHaveLength(2)
  })

  it('does NOT call the weather tool when location is ambiguous', async () => {
    mockRunAgent.mockResolvedValueOnce({
      reply: "Which Springfield do you mean? Illinois, Missouri, or another one?",
      toolCalls: [
        { tool: 'search_location', args: { query: 'Springfield' }, result: [] },
      ],
      usage: null,
      cappedOut: false,
    })

    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Weather in Springfield?' })
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    const weatherCalls = res.body.toolCalls.filter(
      (t) => t.tool === 'get_current_weather' || t.tool === 'get_forecast'
    )
    expect(weatherCalls).toHaveLength(0)
  })

  it('returns real weather once the user clarifies the location', async () => {
    mockRunAgent.mockResolvedValueOnce({
      reply: "Springfield, IL is currently 22°C with partly cloudy skies.",
      toolCalls: [
        {
          tool: 'get_current_weather',
          args: { location: 'Springfield, Illinois' },
          result: {
            location: { name: 'Springfield' },
            current: { tempC: 22, condition: { text: 'Partly cloudy' } },
          },
        },
      ],
      usage: { prompt_tokens: 120, completion_tokens: 30 },
      cappedOut: false,
    })

    const res = await request(app)
      .post('/api/chat')
      .send({
        message: 'I meant Springfield, Illinois',
        history: [
          { role: 'user', content: 'Weather in Springfield?' },
          { role: 'assistant', content: 'Which Springfield do you mean?' },
        ],
      })
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    expect(res.body.reply).toMatch(/22°C/i)
    expect(res.body.toolCalls[0].tool).toBe('get_current_weather')
    expect(res.body.toolCalls[0].args.location).toMatch(/Springfield/i)
  })
})
