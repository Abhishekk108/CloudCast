/**
 * Unit tests for services/groqClient.js
 *
 * Core acceptance criteria:
 *  1. Retry occurs on a simulated 429 response.
 *  2. Client throws a normalized AppError after exhausting all retries.
 *
 * All tests mock global.fetch — no real network calls.
 * The `sleep` export from groqClient is re-exported and spied on so retries
 * complete instantly without real delays.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals'

process.env.GROQ_API_KEY = 'test-groq-key'
process.env.WEATHER_API_KEY = 'test-weather-key'
process.env.NODE_ENV = 'test'

// ── Mock fetch ────────────────────────────────────────────────────────────────
const mockFetch = jest.fn()
global.fetch = mockFetch

// ── Import client and stub out sleep ─────────────────────────────────────────
// `timing` is a mutable object exported from groqClient — we can replace
// timing.sleep without fake timers, which keeps AbortController working normally.
const { chatCompletion, timing } = await import('../../src/services/groqClient.js')
const originalSleep = timing.sleep
timing.sleep = jest.fn().mockResolvedValue(undefined) // instant, no real delay

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body,
  }
}

const successResponse = {
  id: 'chatcmpl-abc',
  object: 'chat.completion',
  choices: [
    {
      index: 0,
      message: { role: 'assistant', content: 'The weather in Pune is sunny and 27°C.' },
      finish_reason: 'stop',
    },
  ],
  usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
}

const toolCallResponse = {
  id: 'chatcmpl-xyz',
  object: 'chat.completion',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'get_current_weather', arguments: '{"location":"Pune"}' },
          },
        ],
      },
      finish_reason: 'tool_calls',
    },
  ],
  usage: { prompt_tokens: 80, completion_tokens: 15, total_tokens: 95 },
}

const baseMessages = [{ role: 'user', content: 'What is the weather in Pune?' }]

beforeEach(() => {
  mockFetch.mockReset()
})

// ── Happy-path tests ──────────────────────────────────────────────────────────

describe('chatCompletion — success cases', () => {
  it('returns the completion on a 200 response', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, successResponse))
    const result = await chatCompletion({ messages: baseMessages })
    expect(result).toEqual(successResponse)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('sends the correct request shape to the Groq endpoint', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, successResponse))
    await chatCompletion({
      messages: baseMessages,
      temperature: 0.2,
      max_tokens: 512,
    })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.headers.Authorization).toBe('Bearer test-groq-key')

    const body = JSON.parse(options.body)
    expect(body.messages).toEqual(baseMessages)
    expect(body.temperature).toBe(0.2)
    expect(body.max_tokens).toBe(512)
  })

  it('includes tools and tool_choice when provided', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, toolCallResponse))
    const tools = [{ type: 'function', function: { name: 'get_current_weather' } }]
    await chatCompletion({ messages: baseMessages, tools, tool_choice: 'auto' })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.tools).toEqual(tools)
    expect(body.tool_choice).toBe('auto')
  })

  it('omits tools field entirely when tools array is empty', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, successResponse))
    await chatCompletion({ messages: baseMessages, tools: [] })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.tools).toBeUndefined()
    expect(body.tool_choice).toBeUndefined()
  })

  it('returns a tool_calls response without modification', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, toolCallResponse))
    const result = await chatCompletion({ messages: baseMessages })
    expect(result.choices[0].finish_reason).toBe('tool_calls')
    expect(result.choices[0].message.tool_calls).toHaveLength(1)
  })
})

// ── Retry behaviour ───────────────────────────────────────────────────────────

describe('chatCompletion — retry on 429', () => {
  it('retries on 429 and succeeds on the next attempt', async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(429, { error: { message: 'rate limited' } }))
      .mockResolvedValueOnce(makeResponse(200, successResponse))

    const result = await chatCompletion({ messages: baseMessages })
    expect(result).toEqual(successResponse)
    // One failure + one success = 2 fetch calls
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('retries on 429 twice and succeeds on the third attempt', async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(429, { error: { message: 'rate limited' } }))
      .mockResolvedValueOnce(makeResponse(429, { error: { message: 'rate limited' } }))
      .mockResolvedValueOnce(makeResponse(200, successResponse))

    const result = await chatCompletion({ messages: baseMessages })
    expect(result).toEqual(successResponse)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('throws GROQ_RATE_LIMIT after exhausting all retries (3 attempts)', async () => {
    mockFetch.mockResolvedValue(makeResponse(429, { error: { message: 'rate limited' } }))

    await expect(chatCompletion({ messages: baseMessages })).rejects.toMatchObject({
      code: 'GROQ_RATE_LIMIT',
      status: 429,
    })
    // All MAX_RETRIES attempts consumed
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})

describe('chatCompletion — retry on 5xx', () => {
  it('retries on a 500 and succeeds on the second attempt', async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(500, { error: { message: 'internal error' } }))
      .mockResolvedValueOnce(makeResponse(200, successResponse))

    const result = await chatCompletion({ messages: baseMessages })
    expect(result).toEqual(successResponse)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('throws GROQ_UNKNOWN after exhausting retries on persistent 500', async () => {
    mockFetch.mockResolvedValue(makeResponse(500, { error: { message: 'server error' } }))

    await expect(chatCompletion({ messages: baseMessages })).rejects.toMatchObject({
      code: 'GROQ_UNKNOWN',
      status: 502,
    })
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})

// ── Error mapping ─────────────────────────────────────────────────────────────

describe('chatCompletion — error mapping (no retry)', () => {
  it('throws GROQ_AUTH_ERROR on 401 without retrying', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(401, { error: { message: 'invalid key' } }))
    await expect(chatCompletion({ messages: baseMessages })).rejects.toMatchObject({
      code: 'GROQ_AUTH_ERROR',
      status: 502,
    })
    // Auth errors are not retried
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('throws GROQ_AUTH_ERROR on 403 without retrying', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(403, { error: { message: 'forbidden' } }))
    await expect(chatCompletion({ messages: baseMessages })).rejects.toMatchObject({
      code: 'GROQ_AUTH_ERROR',
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('throws GROQ_TIMEOUT on AbortError after retries', async () => {
    const abortErr = new Error('The operation was aborted.')
    abortErr.name = 'AbortError'
    mockFetch.mockRejectedValue(abortErr)

    await expect(chatCompletion({ messages: baseMessages })).rejects.toMatchObject({
      code: 'GROQ_TIMEOUT',
      status: 504,
    })
    // Timeouts ARE retried
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('throws GROQ_UNKNOWN on generic network failure after retries', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'))

    await expect(chatCompletion({ messages: baseMessages })).rejects.toMatchObject({
      code: 'GROQ_UNKNOWN',
      status: 502,
    })
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})
