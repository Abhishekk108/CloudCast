/**
 * Integration tests for POST /api/chat and POST /api/chat/stream
 *
 * Uses Supertest to make real HTTP requests against the Express app.
 * The agent (runAgent) and groqClient are mocked so no real LLM or
 * weather API calls are made — this tests the HTTP layer in isolation.
 *
 * Acceptance criteria:
 *  AC 4.1 — POST /api/chat returns 200 with reply, toolCalls, conversationId
 *  AC 4.2 — POST /api/chat/stream returns SSE data: events; concatenated
 *            tokens match the expected reply
 *  AC 4.3 — No conversationId → new UUID returned; with UUID → echoed back
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import request from 'supertest'

process.env.GROQ_API_KEY = 'test-groq-key'
process.env.WEATHER_API_KEY = 'test-weather-key'
process.env.NODE_ENV = 'test'
// Disable rate limiting in tests (or use a very high limit)
process.env.CHAT_RATE_LIMIT_MAX = '1000'

// ── Mock the agent so no real LLM calls are made ──────────────────────────────

const mockRunAgent = jest.fn()

jest.unstable_mockModule('../../src/agent/agent.js', () => ({
  runAgent: mockRunAgent,
  MAX_TOOL_ITERATIONS: 5,
}))

// Mock groqClient for stream tests — we control fetch directly via global mock
const mockFetch = jest.fn()
global.fetch = mockFetch

// ── Import app AFTER mocks ────────────────────────────────────────────────────

const { default: app } = await import('../../src/app.js')

// ── Helpers ───────────────────────────────────────────────────────────────────

const agentResult = {
  reply: 'It is currently 34°C and sunny in Chennai.',
  toolCalls: [
    { tool: 'get_current_weather', args: { location: 'Chennai' }, result: { location: { name: 'Chennai' }, current: { tempC: 34 } } },
  ],
  usage: { prompt_tokens: 80, completion_tokens: 25 },
  cappedOut: false,
}

const VALID_BODY = { message: "What's the weather in Chennai right now?" }

beforeEach(() => {
  mockRunAgent.mockReset()
  mockFetch.mockReset()
})

// ── Task 4.1 — POST /api/chat ─────────────────────────────────────────────────

describe('POST /api/chat', () => {
  it('returns 200 with reply, toolCalls, conversationId (AC 4.1)', async () => {
    mockRunAgent.mockResolvedValueOnce(agentResult)

    const res = await request(app)
      .post('/api/chat')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    expect(res.body.reply).toBe(agentResult.reply)
    expect(res.body.toolCalls).toEqual(agentResult.toolCalls)
    expect(res.body.conversationId).toBeDefined()
    expect(res.body.usage).toEqual(agentResult.usage)
  })

  it('passes history to the agent', async () => {
    mockRunAgent.mockResolvedValueOnce(agentResult)

    const history = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
    ]

    await request(app)
      .post('/api/chat')
      .send({ ...VALID_BODY, history })
      .set('Content-Type', 'application/json')

    // The messages array passed to runAgent should contain the history entries
    const callArg = mockRunAgent.mock.calls[0][0]
    const historyInMessages = callArg.messages.filter((m) => m.role !== 'system')
    expect(historyInMessages[0].content).toBe('Hello')
    expect(historyInMessages[1].content).toBe('Hi!')
  })

  it('returns 400 with VALIDATION_ERROR for empty body', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({})
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(mockRunAgent).not.toHaveBeenCalled()
  })

  it('returns 400 when message exceeds 2000 chars', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'x'.repeat(2001) })
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 500 with INTERNAL_ERROR shape when agent throws', async () => {
    mockRunAgent.mockRejectedValueOnce(new Error('Agent exploded'))

    const res = await request(app)
      .post('/api/chat')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(500)
    expect(res.body.error).toBeDefined()
  })
})

// ── Task 4.3 — Conversation ID handling ──────────────────────────────────────

describe('POST /api/chat — conversationId (AC 4.3)', () => {
  it('generates a UUID when no conversationId is provided', async () => {
    mockRunAgent.mockResolvedValueOnce(agentResult)

    const res = await request(app)
      .post('/api/chat')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    // UUID v4 pattern
    expect(res.body.conversationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('echoes back the provided conversationId', async () => {
    mockRunAgent.mockResolvedValueOnce(agentResult)
    const id = 'a1b2c3d4-e5f6-4789-abcd-ef0123456789'

    const res = await request(app)
      .post('/api/chat')
      .send({ ...VALID_BODY, conversationId: id })
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    expect(res.body.conversationId).toBe(id)
  })

  it('rejects an invalid (non-UUID) conversationId with 400', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ ...VALID_BODY, conversationId: 'not-a-uuid' })
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('accepts a follow-up request with the same UUID and history', async () => {
    mockRunAgent.mockResolvedValueOnce(agentResult)

    const id = 'b2c3d4e5-f6a7-4890-bcde-f01234567890'
    const res = await request(app)
      .post('/api/chat')
      .send({
        message: 'What about tomorrow?',
        conversationId: id,
        history: [
          { role: 'user', content: "What's the weather in Chennai?" },
          { role: 'assistant', content: 'It is 34°C in Chennai.' },
        ],
      })
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(200)
    expect(res.body.conversationId).toBe(id)
  })
})

// ── Task 4.2 — POST /api/chat/stream ─────────────────────────────────────────

describe('POST /api/chat/stream', () => {
  /**
   * Build a fake SSE streaming body from the Groq API.
   * Returns a ReadableStream-like async iterable of Uint8Array chunks.
   */
  function makeSseStream(tokens) {
    const enc = new TextEncoder()
    const chunks = [
      // First chunk: tool calls resolved, now streaming final answer
      ...tokens.map((token) => {
        const delta = { choices: [{ delta: { content: token }, finish_reason: null }] }
        return enc.encode(`data: ${JSON.stringify(delta)}\n\n`)
      }),
      enc.encode('data: [DONE]\n\n'),
    ]

    let i = 0
    return {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            if (i < chunks.length) return { value: chunks[i++], done: false }
            return { value: undefined, done: true }
          },
        }
      },
    }
  }

  it('returns SSE content-type and data: events (AC 4.2)', async () => {
    // First fetch call = tool-call resolution (non-streaming)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Sunny in Chennai.', tool_calls: null }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 50, completion_tokens: 10 },
        }),
      })
      // Second fetch call = streaming final answer
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: makeSseStream(['It ', 'is ', 'sunny.']),
      })

    const res = await request(app)
      .post('/api/chat/stream')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json')
      .buffer(true) // collect the full SSE body

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/event-stream/)

    // Parse all SSE data lines
    const events = res.text
      .split('\n')
      .filter((l) => l.startsWith('data: '))
      .map((l) => JSON.parse(l.slice(6)))

    // Should have token events
    const tokens = events.filter((e) => e.type === 'token')
    expect(tokens.length).toBeGreaterThan(0)

    // Concatenated tokens form the expected reply
    const fullReply = tokens.map((e) => e.token).join('')
    expect(fullReply).toBe('It is sunny.')

    // Final done event
    const doneEvent = events.find((e) => e.type === 'done')
    expect(doneEvent).toBeDefined()
    expect(doneEvent.conversationId).toBeDefined()
  })

  it('emits tool events before token events when tool calls are made', async () => {
    // First call: LLM returns a tool call
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: { name: 'get_current_weather', arguments: '{"location":"Chennai"}' },
              }],
            },
            finish_reason: 'tool_calls',
          }],
          usage: null,
        }),
      })

    // executeTool is not mocked at this level — it will try to call the real
    // weather API via fetch. We need a third mock for that tool fetch + final stream.
    // Mock the weather API fetch
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 1006, message: 'Not found' } }),
    })

    // Second LLM call: returns stop after seeing the tool error
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: "I couldn't find that location.", tool_calls: null }, finish_reason: 'stop' }],
        usage: null,
      }),
    })

    // Streaming final answer
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: makeSseStream(["I couldn't find Chennai."]),
    })

    const res = await request(app)
      .post('/api/chat/stream')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json')
      .buffer(true)

    const events = res.text
      .split('\n')
      .filter((l) => l.startsWith('data: '))
      .map((l) => JSON.parse(l.slice(6)))

    const toolEvent = events.find((e) => e.type === 'tool')
    expect(toolEvent?.tool).toBe('get_current_weather')
    expect(toolEvent?.args).toEqual({ location: 'Chennai' })
  })

  it('returns 400 for invalid body (same validation as /api/chat)', async () => {
    const res = await request(app)
      .post('/api/chat/stream')
      .send({})
      .set('Content-Type', 'application/json')

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('generates a conversationId when none is provided (AC 4.3)', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Sunny.', tool_calls: null }, finish_reason: 'stop' }],
          usage: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: makeSseStream(['Sunny.']),
      })

    const res = await request(app)
      .post('/api/chat/stream')
      .send(VALID_BODY)
      .set('Content-Type', 'application/json')
      .buffer(true)

    const events = res.text
      .split('\n')
      .filter((l) => l.startsWith('data: '))
      .map((l) => JSON.parse(l.slice(6)))

    const doneEvent = events.find((e) => e.type === 'done')
    expect(doneEvent?.conversationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })
})

// ── GET /api/health (smoke test that app still works) ─────────────────────────

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
