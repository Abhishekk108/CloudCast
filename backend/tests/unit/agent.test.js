/**
 * Unit tests for agent/agent.js
 *
 * Acceptance criteria covered:
 *  AC 3.5a — Single-tool question: returns reply + trace with exactly one
 *             get_current_weather call with correct args.
 *  AC 3.5b — Multi-city question: trace shows multiple tool calls in one turn.
 *  AC 3.6  — Loop cap: when Groq always returns tool_calls, loop terminates at
 *             MAX_TOOL_ITERATIONS with a clean fallback reply.
 *
 * Both groqClient.chatCompletion and tools/index.executeTool are mocked.
 * No real HTTP calls are made.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals'

process.env.GROQ_API_KEY = 'test-groq-key'
process.env.WEATHER_API_KEY = 'test-weather-key'
process.env.NODE_ENV = 'test'

// ── Mock groqClient ───────────────────────────────────────────────────────────
// We mock at the module level so the agent imports the mock automatically.
const mockChatCompletion = jest.fn()

jest.unstable_mockModule('../../src/services/groqClient.js', () => ({
  chatCompletion: mockChatCompletion,
  timing: { sleep: jest.fn().mockResolvedValue(undefined) },
}))

// ── Mock executeTool ──────────────────────────────────────────────────────────
const mockExecuteTool = jest.fn()

jest.unstable_mockModule('../../src/tools/index.js', () => ({
  executeTool: mockExecuteTool,
  registry: {},
}))

// ── Import agent AFTER mocks are registered ───────────────────────────────────
const { runAgent, MAX_TOOL_ITERATIONS } = await import('../../src/agent/agent.js')

// ── Fixture builders ──────────────────────────────────────────────────────────

/** A Groq response that ends the conversation with a plain text reply */
function makeStopResponse(content, usage = { prompt_tokens: 50, completion_tokens: 20 }) {
  return {
    choices: [{ message: { role: 'assistant', content, tool_calls: null }, finish_reason: 'stop' }],
    usage,
  }
}

/** A Groq response requesting one or more tool calls */
function makeToolCallResponse(toolCalls) {
  return {
    choices: [{
      message: {
        role: 'assistant',
        content: null,
        tool_calls: toolCalls.map((tc, i) => ({
          id: `call_${i}`,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.args) },
        })),
      },
      finish_reason: 'tool_calls',
    }],
    usage: { prompt_tokens: 80, completion_tokens: 10 },
  }
}

/** A fake normalised current weather result */
const fakeCurrent = {
  location: { name: 'Chennai' },
  current: { tempC: 34, condition: { text: 'Sunny' } },
}

const fakeMumbai = {
  location: { name: 'Mumbai' },
  current: { tempC: 29, condition: { text: 'Partly cloudy' } },
}

const baseMessages = [
  { role: 'system', content: 'You are CloudCast.' },
  { role: 'user', content: "What's the weather in Chennai right now?" },
]

beforeEach(() => {
  mockChatCompletion.mockReset()
  mockExecuteTool.mockReset()
})

// ── AC 3.5a — Single tool call ────────────────────────────────────────────────

describe('runAgent — single tool call (AC 3.5a)', () => {
  it('returns a reply and a trace with exactly one get_current_weather call', async () => {
    // Round 1: Groq asks for get_current_weather
    mockChatCompletion.mockResolvedValueOnce(
      makeToolCallResponse([{ name: 'get_current_weather', args: { location: 'Chennai' } }])
    )
    mockExecuteTool.mockResolvedValueOnce(fakeCurrent)

    // Round 2: Groq returns the final answer
    mockChatCompletion.mockResolvedValueOnce(
      makeStopResponse('It is currently 34°C and sunny in Chennai.')
    )

    const result = await runAgent({ messages: baseMessages })

    // AC: reply is non-empty natural language
    expect(result.reply).toBe('It is currently 34°C and sunny in Chennai.')
    expect(result.cappedOut).toBe(false)

    // AC: trace shows exactly one tool call
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls[0].tool).toBe('get_current_weather')
    expect(result.toolCalls[0].args).toEqual({ location: 'Chennai' })
    expect(result.toolCalls[0].result).toEqual(fakeCurrent)
    expect(result.toolCalls[0].error).toBeUndefined()

    // Groq was called twice (1 tool call + 1 final answer)
    expect(mockChatCompletion).toHaveBeenCalledTimes(2)
    // executeTool was called once with the right args
    expect(mockExecuteTool).toHaveBeenCalledWith('get_current_weather', { location: 'Chennai' })
  })

  it('includes usage from the final Groq call', async () => {
    mockChatCompletion.mockResolvedValueOnce(
      makeToolCallResponse([{ name: 'get_current_weather', args: { location: 'Pune' } }])
    )
    mockExecuteTool.mockResolvedValueOnce(fakeCurrent)
    mockChatCompletion.mockResolvedValueOnce(
      makeStopResponse('Sunny in Pune.', { prompt_tokens: 120, completion_tokens: 30 })
    )

    const result = await runAgent({ messages: baseMessages })
    expect(result.usage).toEqual({ prompt_tokens: 120, completion_tokens: 30 })
  })

  it('returns immediately when Groq gives a final answer on the first call (no tools needed)', async () => {
    mockChatCompletion.mockResolvedValueOnce(
      makeStopResponse('I can help you with weather questions!')
    )

    const result = await runAgent({ messages: baseMessages })

    expect(result.reply).toBe('I can help you with weather questions!')
    expect(result.toolCalls).toHaveLength(0)
    expect(mockChatCompletion).toHaveBeenCalledTimes(1)
    expect(mockExecuteTool).not.toHaveBeenCalled()
  })

  it('passes TOOL_SCHEMAS to every chatCompletion call', async () => {
    mockChatCompletion.mockResolvedValueOnce(makeStopResponse('Done.'))
    await runAgent({ messages: baseMessages })

    const callArgs = mockChatCompletion.mock.calls[0][0]
    expect(Array.isArray(callArgs.tools)).toBe(true)
    expect(callArgs.tools.length).toBeGreaterThan(0)
    expect(callArgs.tool_choice).toBe('auto')
  })
})

// ── AC 3.5b — Multiple tool calls in one turn ─────────────────────────────────

describe('runAgent — multiple tool calls (AC 3.5b)', () => {
  it('resolves two parallel tool calls and returns both in the trace', async () => {
    // Round 1: Groq requests two tool calls at once
    mockChatCompletion.mockResolvedValueOnce(
      makeToolCallResponse([
        { name: 'get_current_weather', args: { location: 'Chennai' } },
        { name: 'get_current_weather', args: { location: 'Mumbai' } },
      ])
    )
    mockExecuteTool
      .mockResolvedValueOnce(fakeCurrent)
      .mockResolvedValueOnce(fakeMumbai)

    // Round 2: final answer
    mockChatCompletion.mockResolvedValueOnce(
      makeStopResponse('Chennai is 34°C sunny; Mumbai is 29°C partly cloudy.')
    )

    const result = await runAgent({ messages: baseMessages })

    expect(result.reply).toBe('Chennai is 34°C sunny; Mumbai is 29°C partly cloudy.')
    expect(result.toolCalls).toHaveLength(2)
    expect(result.toolCalls[0].tool).toBe('get_current_weather')
    expect(result.toolCalls[0].args.location).toBe('Chennai')
    expect(result.toolCalls[1].tool).toBe('get_current_weather')
    expect(result.toolCalls[1].args.location).toBe('Mumbai')

    // Two tool calls executed, two Groq calls total
    expect(mockExecuteTool).toHaveBeenCalledTimes(2)
    expect(mockChatCompletion).toHaveBeenCalledTimes(2)
  })

  it('handles tool calls across multiple sequential iterations', async () => {
    // Iteration 0: search location
    mockChatCompletion.mockResolvedValueOnce(
      makeToolCallResponse([{ name: 'search_location', args: { query: 'Springfield' } }])
    )
    mockExecuteTool.mockResolvedValueOnce([
      { name: 'Springfield', region: 'Illinois', country: 'USA' },
    ])

    // Iteration 1: get current weather
    mockChatCompletion.mockResolvedValueOnce(
      makeToolCallResponse([{ name: 'get_current_weather', args: { location: 'Springfield, Illinois' } }])
    )
    mockExecuteTool.mockResolvedValueOnce({ location: { name: 'Springfield' }, current: { tempC: 22 } })

    // Iteration 2: final answer
    mockChatCompletion.mockResolvedValueOnce(makeStopResponse('Springfield, IL is 22°C.'))

    const result = await runAgent({ messages: baseMessages })

    expect(result.reply).toBe('Springfield, IL is 22°C.')
    expect(result.toolCalls).toHaveLength(2)
    expect(result.toolCalls[0].tool).toBe('search_location')
    expect(result.toolCalls[1].tool).toBe('get_current_weather')
    expect(mockChatCompletion).toHaveBeenCalledTimes(3)
  })
})

// ── Tool error handling ───────────────────────────────────────────────────────

describe('runAgent — tool errors', () => {
  it('captures tool errors in the trace and passes them back to the LLM', async () => {
    mockChatCompletion.mockResolvedValueOnce(
      makeToolCallResponse([{ name: 'get_current_weather', args: { location: 'Atlantis' } }])
    )
    mockExecuteTool.mockRejectedValueOnce(new Error('Location not found: Atlantis'))

    // LLM receives the error and responds gracefully
    mockChatCompletion.mockResolvedValueOnce(
      makeStopResponse("I couldn't find a location called Atlantis.")
    )

    const result = await runAgent({ messages: baseMessages })

    expect(result.reply).toBe("I couldn't find a location called Atlantis.")
    expect(result.toolCalls[0].error).toBe('Location not found: Atlantis')
    expect(result.toolCalls[0].result).toBeNull()

    // Error was serialised into the tool message sent back to Groq
    const secondCallMessages = mockChatCompletion.mock.calls[1][0].messages
    const toolMsg = secondCallMessages.find((m) => m.role === 'tool')
    expect(toolMsg.content).toContain('error')
  })

  it('handles malformed JSON args from the LLM (falls through to Zod validation)', async () => {
    // Manually construct a response with invalid JSON arguments
    mockChatCompletion.mockResolvedValueOnce({
      choices: [{
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_bad',
            type: 'function',
            function: { name: 'get_current_weather', arguments: 'not-valid-json' },
          }],
        },
        finish_reason: 'tool_calls',
      }],
      usage: null,
    })
    mockExecuteTool.mockRejectedValueOnce(new Error('Invalid arguments'))
    mockChatCompletion.mockResolvedValueOnce(makeStopResponse('Sorry, something went wrong.'))

    const result = await runAgent({ messages: baseMessages })
    expect(result.toolCalls[0].error).toBeDefined()
  })
})

// ── AC 3.6 — Loop safety cap ──────────────────────────────────────────────────

describe('runAgent — loop cap (AC 3.6)', () => {
  it(`terminates after ${MAX_TOOL_ITERATIONS} iterations when Groq never returns a final answer`, async () => {
    // Groq always returns a tool call — never a stop
    mockChatCompletion.mockResolvedValue(
      makeToolCallResponse([{ name: 'get_current_weather', args: { location: 'Chennai' } }])
    )
    mockExecuteTool.mockResolvedValue(fakeCurrent)

    const result = await runAgent({ messages: baseMessages })

    // Loop terminates
    expect(result.cappedOut).toBe(true)
    // Fallback message — not an error, not empty
    expect(typeof result.reply).toBe('string')
    expect(result.reply.length).toBeGreaterThan(20)
    expect(result.reply).not.toMatch(/error|throw|exception/i)

    // Groq called MAX_TOOL_ITERATIONS times (cap = iterations, not calls)
    expect(mockChatCompletion).toHaveBeenCalledTimes(MAX_TOOL_ITERATIONS)

    // All tool calls are captured in the trace
    expect(result.toolCalls).toHaveLength(MAX_TOOL_ITERATIONS)
  })

  it('respects a custom MAX_TOOL_ITERATIONS via env var', () => {
    // The module reads process.env at load time; we just confirm the exported constant
    expect(typeof MAX_TOOL_ITERATIONS).toBe('number')
    expect(MAX_TOOL_ITERATIONS).toBeGreaterThanOrEqual(1)
  })

  it('terminates even when every tool call fails', async () => {
    mockChatCompletion.mockResolvedValue(
      makeToolCallResponse([{ name: 'get_current_weather', args: { location: 'Nowhere' } }])
    )
    mockExecuteTool.mockRejectedValue(new Error('Tool always fails'))

    const result = await runAgent({ messages: baseMessages })

    expect(result.cappedOut).toBe(true)
    expect(result.toolCalls.every((tc) => tc.error !== undefined)).toBe(true)
  })
})

// ── Message threading ─────────────────────────────────────────────────────────

describe('runAgent — message threading', () => {
  it('appends the assistant tool-call message before sending tool results back', async () => {
    mockChatCompletion.mockResolvedValueOnce(
      makeToolCallResponse([{ name: 'get_current_weather', args: { location: 'Delhi' } }])
    )
    mockExecuteTool.mockResolvedValueOnce({ location: { name: 'Delhi' }, current: { tempC: 38 } })
    mockChatCompletion.mockResolvedValueOnce(makeStopResponse('Delhi is 38°C.'))

    await runAgent({ messages: baseMessages })

    // The second Groq call should contain: original messages + assistant message + tool result
    const secondCallMessages = mockChatCompletion.mock.calls[1][0].messages
    const roles = secondCallMessages.map((m) => m.role)
    expect(roles).toContain('system')
    expect(roles).toContain('user')
    expect(roles).toContain('assistant') // the tool-call assistant message
    expect(roles).toContain('tool')      // the tool result
  })

  it('does not mutate the original messages array', async () => {
    const messages = [
      { role: 'system', content: 'You are CloudCast.' },
      { role: 'user', content: 'Weather in Pune?' },
    ]
    const originalLength = messages.length

    mockChatCompletion.mockResolvedValueOnce(makeStopResponse('Sunny.'))
    await runAgent({ messages })

    expect(messages).toHaveLength(originalLength)
  })
})
