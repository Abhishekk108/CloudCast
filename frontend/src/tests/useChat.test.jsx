/**
 * Task 6.1 AC — useChat retry test.
 * Also covers general hook behaviour.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChat } from '../hooks/useChat.js'

// Mock the api module
vi.mock('../services/api.js', () => ({
  postChat: vi.fn(),
}))

import { postChat } from '../services/api.js'

const mockReply = {
  reply: 'It is 34°C in Chennai.',
  toolCalls: [{ tool: 'get_current_weather', args: { location: 'Chennai' }, result: {} }],
  conversationId: 'abc-123',
  usage: { prompt_tokens: 50, completion_tokens: 20 },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useChat — sendMessage', () => {
  it('adds a user message immediately (optimistic)', async () => {
    postChat.mockResolvedValue(mockReply)
    const { result } = renderHook(() => useChat())

    act(() => { result.current.sendMessage('Hello') })

    // User message appears before the API resolves
    expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'Hello' })
  })

  it('adds an assistant message after API resolves', async () => {
    postChat.mockResolvedValue(mockReply)
    const { result } = renderHook(() => useChat())

    await act(async () => { await result.current.sendMessage('Weather in Chennai?') })

    const messages = result.current.messages
    expect(messages).toHaveLength(2)
    expect(messages[1]).toMatchObject({ role: 'assistant', content: 'It is 34°C in Chennai.' })
  })

  it('sets isLoading to true during the request and false after', async () => {
    let resolve
    postChat.mockReturnValue(new Promise((r) => { resolve = r }))
    const { result } = renderHook(() => useChat())

    act(() => { result.current.sendMessage('Hi') })
    expect(result.current.isLoading).toBe(true)

    await act(async () => { resolve(mockReply) })
    expect(result.current.isLoading).toBe(false)
  })

  it('persists conversationId across turns', async () => {
    postChat.mockResolvedValue(mockReply)
    const { result } = renderHook(() => useChat())

    await act(async () => { await result.current.sendMessage('First') })
    expect(result.current.conversationId).toBe('abc-123')

    await act(async () => { await result.current.sendMessage('Second') })
    // Second call should include the persisted ID
    expect(postChat.mock.calls[1][0].conversationId).toBe('abc-123')
  })

  it('sets error and adds error bubble on API failure', async () => {
    const err = new Error('Network error')
    postChat.mockRejectedValue(err)
    const { result } = renderHook(() => useChat())

    await act(async () => { await result.current.sendMessage('Hello') })

    expect(result.current.error).toBe(err)
    const msgs = result.current.messages
    expect(msgs[msgs.length - 1]).toMatchObject({ role: 'assistant', isError: true })
  })
})

describe('useChat — retryLast (AC 6.1)', () => {
  it('removes the error bubble and re-sends the last message', async () => {
    // First call fails
    postChat.mockRejectedValueOnce(new Error('Timeout'))
    // Retry succeeds
    postChat.mockResolvedValueOnce(mockReply)

    const { result } = renderHook(() => useChat())

    await act(async () => { await result.current.sendMessage('Weather in Pune?') })
    expect(result.current.error).toBeTruthy()

    await act(async () => { await result.current.retryLast() })

    await waitFor(() => expect(result.current.error).toBeNull())
    // Should have user + assistant (no lingering error bubble)
    expect(result.current.messages.every((m) => !m.isError)).toBe(true)
    expect(postChat).toHaveBeenCalledTimes(2)
    // Both calls use the same message text
    expect(postChat.mock.calls[1][0].message).toBe('Weather in Pune?')
  })
})

describe('useChat — clearChat', () => {
  it('resets messages, error, and conversationId', async () => {
    postChat.mockResolvedValue(mockReply)
    const { result } = renderHook(() => useChat())

    await act(async () => { await result.current.sendMessage('Hello') })
    expect(result.current.messages).toHaveLength(2)

    act(() => { result.current.clearChat() })

    expect(result.current.messages).toHaveLength(0)
    expect(result.current.conversationId).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
