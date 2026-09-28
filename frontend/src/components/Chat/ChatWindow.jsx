/**
 * ChatWindow — scrollable message list.
 *
 * - Auto-scrolls to the latest message on new content
 * - Shows TypingIndicator while isLoading
 * - Shows WeatherCard below assistant messages that contain tool results
 * - Empty state with a suggestion prompt
 */
import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble.jsx'
import { TypingIndicator } from './TypingIndicator.jsx'
import { WeatherCard } from '../WeatherCard/WeatherCard.jsx'

const SUGGESTIONS = [
  'What\'s the weather in Mumbai right now?',
  'Will it rain in Delhi tomorrow?',
  'Compare weather in Bangalore and Chennai this weekend',
  'What time does the sun set in Goa today?',
]

function EmptyState({ onSuggestion }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="text-5xl select-none">⛅</div>
      <div>
        <h2 className="text-lg font-semibold text-gray-700">Ask me about the weather</h2>
        <p className="mt-1 text-sm text-gray-400">
          Real-time conditions, forecasts, and alerts — anywhere in the world.
        </p>
      </div>
      <div className="grid w-full max-w-sm gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-left text-sm text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ChatWindow({ messages, isLoading, onSuggestion }) {
  const bottomRef = useRef(null)

  // Scroll to bottom whenever messages change or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-4"
      role="log"
      aria-label="Conversation"
      aria-live="polite"
    >
      {messages.length === 0 && !isLoading ? (
        <EmptyState onSuggestion={onSuggestion} />
      ) : (
        <div className="mx-auto w-full space-y-4">
          {messages.map((msg) => (
            <div key={msg.id}>
              <MessageBubble message={msg} />
              {/* Weather card below assistant messages with tool results */}
              {msg.role === 'assistant' && msg.toolCalls?.length > 0 && (
                <div className="ml-9 mt-2">
                  <WeatherCard toolCalls={msg.toolCalls} />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-end gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs text-white select-none">
                ☁
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-white shadow-sm ring-1 ring-gray-100">
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
