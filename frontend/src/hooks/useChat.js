/**
 * useChat — manages conversation state and API interaction.
 *
 * State:
 *   messages       — ordered array of { id, role, content, toolCalls?, isError? }
 *   isLoading      — true while waiting for a response
 *   error          — last error object (or null)
 *   conversationId — persisted UUID across turns
 *
 * Methods:
 *   sendMessage(text)  — append user message, call API, append assistant reply
 *   retryLast()        — re-send the last user message after an error
 *   clearChat()        — reset to empty state
 */

import { useState, useCallback, useRef } from 'react'
import { postChat } from '../services/api.js'

let idSeq = 0
const uid = () => `msg_${++idSeq}`

export function useChat() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [conversationId, setConversationId] = useState(null)

  // Keep a ref to the last user message text so retryLast can re-send it
  const lastUserMessageRef = useRef(null)

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      lastUserMessageRef.current = trimmed
      setError(null)

      // Append user message immediately (optimistic)
      const userMsg = { id: uid(), role: 'user', content: trimmed }
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      // Build history from current messages (exclude the one we just added)
      // history = all prior user + assistant turns in API format
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }))

      try {
        const data = await postChat({
          message: trimmed,
          conversationId: conversationId ?? undefined,
          history,
        })

        if (!conversationId) setConversationId(data.conversationId)

        const assistantMsg = {
          id: uid(),
          role: 'assistant',
          content: data.reply,
          toolCalls: data.toolCalls ?? [],
          usage: data.usage,
        }

        setMessages((prev) => [...prev, assistantMsg])
      } catch (err) {
        setError(err)
        // Add an error bubble so the user can see what went wrong
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: err.message ?? 'Something went wrong. Please try again.',
            isError: true,
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading, conversationId]
  )

  const retryLast = useCallback(() => {
    if (!lastUserMessageRef.current) return
    // Remove the last error assistant message before retrying
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      return last?.isError ? prev.slice(0, -1) : prev
    })
    sendMessage(lastUserMessageRef.current)
  }, [sendMessage])

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
    setConversationId(null)
    lastUserMessageRef.current = null
  }, [])

  return { messages, isLoading, error, conversationId, sendMessage, retryLast, clearChat }
}
