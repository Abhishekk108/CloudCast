/**
 * Unit tests for agent/systemPrompt.js
 *
 * Verifies that the prompt contains all the rules the agent needs to behave
 * correctly — especially rule #1 (never state a weather fact without a tool call).
 *
 * These tests act as a regression guard: if someone accidentally softens or
 * removes a critical rule, the tests fail immediately.
 */

import { describe, it, expect } from '@jest/globals'

process.env.GROQ_API_KEY = 'test-groq-key'
process.env.WEATHER_API_KEY = 'test-weather-key'
process.env.NODE_ENV = 'test'

import { SYSTEM_PROMPT, buildMessages } from '../../src/agent/systemPrompt.js'

// ── Prompt content ────────────────────────────────────────────────────────────

describe('SYSTEM_PROMPT content', () => {
  it('is a non-empty string', () => {
    expect(typeof SYSTEM_PROMPT).toBe('string')
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(200)
  })

  it('contains the no-hallucination rule (never state facts without a tool call)', () => {
    // The critical rule — must be present and unambiguous
    const lower = SYSTEM_PROMPT.toLowerCase()
    const hasNeverRule =
      lower.includes('never state a weather fact') ||
      lower.includes('never state weather') ||
      lower.includes('must call') ||
      lower.includes('you must call the appropriate tool')
    expect(hasNeverRule).toBe(true)
  })

  it('instructs the agent to call a tool before answering', () => {
    const lower = SYSTEM_PROMPT.toLowerCase()
    const mentionsToolFirst =
      lower.includes('tool first') ||
      lower.includes('call a tool first') ||
      lower.includes('first action is a tool call')
    expect(mentionsToolFirst).toBe(true)
  })

  it('specifies metric as default units', () => {
    const lower = SYSTEM_PROMPT.toLowerCase()
    expect(lower).toMatch(/metric|celsius/)
  })

  it('instructs the agent to ask for clarification on ambiguous locations', () => {
    const lower = SYSTEM_PROMPT.toLowerCase()
    const mentionsAmbiguous =
      lower.includes('ambiguous') ||
      lower.includes('disambiguate') ||
      lower.includes('clarif')
    expect(mentionsAmbiguous).toBe(true)
  })

  it('references search_location for disambiguation', () => {
    expect(SYSTEM_PROMPT).toContain('search_location')
  })

  it('lists all five available tools', () => {
    expect(SYSTEM_PROMPT).toContain('get_current_weather')
    expect(SYSTEM_PROMPT).toContain('get_forecast')
    expect(SYSTEM_PROMPT).toContain('get_weather_alerts')
    expect(SYSTEM_PROMPT).toContain('get_astronomy')
    expect(SYSTEM_PROMPT).toContain('search_location')
  })

  it('includes practical advice guidance (umbrella / UV etc.)', () => {
    const lower = SYSTEM_PROMPT.toLowerCase()
    const hasPracticalAdvice =
      lower.includes('umbrella') ||
      lower.includes('practical advice') ||
      lower.includes('uv')
    expect(hasPracticalAdvice).toBe(true)
  })

  it('instructs graceful error handling (no raw error codes to user)', () => {
    const lower = SYSTEM_PROMPT.toLowerCase()
    const mentionsErrors =
      lower.includes('error') &&
      (lower.includes('plain language') ||
        lower.includes('gracefully') ||
        lower.includes('raw error'))
    expect(mentionsErrors).toBe(true)
  })
})

// ── buildMessages() ───────────────────────────────────────────────────────────

describe('buildMessages()', () => {
  it('returns an array starting with the system message', () => {
    const messages = buildMessages([], 'What is the weather in Pune?')
    expect(messages[0]).toEqual({ role: 'system', content: SYSTEM_PROMPT })
  })

  it('places the new user message last', () => {
    const messages = buildMessages([], 'Will it rain tomorrow?')
    const last = messages[messages.length - 1]
    expect(last).toEqual({ role: 'user', content: 'Will it rain tomorrow?' })
  })

  it('inserts history between system message and new user message', () => {
    const history = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello! Ask me about weather.' },
    ]
    const messages = buildMessages(history, 'Weather in Mumbai?')

    expect(messages).toHaveLength(4) // system + 2 history + new user
    expect(messages[0].role).toBe('system')
    expect(messages[1]).toEqual(history[0])
    expect(messages[2]).toEqual(history[1])
    expect(messages[3]).toEqual({ role: 'user', content: 'Weather in Mumbai?' })
  })

  it('handles empty history correctly', () => {
    const messages = buildMessages([], 'Hello')
    expect(messages).toHaveLength(2) // system + user
    expect(messages[0].role).toBe('system')
    expect(messages[1].role).toBe('user')
  })

  it('does not mutate the original history array', () => {
    const history = [{ role: 'user', content: 'Hello' }]
    const original = [...history]
    buildMessages(history, 'Follow-up')
    expect(history).toEqual(original)
  })
})
