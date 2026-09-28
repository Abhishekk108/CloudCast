/**
 * ChatMessage — premium message bubble with glassmorphism
 */

import { motion } from 'framer-motion'
import { Copy, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { CurrentWeatherCard } from './weather/CurrentWeatherCard.jsx'
import { ForecastCard } from './weather/ForecastCard.jsx'

function extractWeatherData(toolCalls) {
  for (const tc of toolCalls ?? []) {
    if (!tc.result) continue
    if (tc.tool === 'get_current_weather' && tc.result.current) {
      return { type: 'current', ...tc.result }
    }
    if (tc.tool === 'get_forecast' && tc.result.forecast?.length) {
      return { type: 'forecast', ...tc.result }
    }
  }
  return null
}

export function ChatMessage({ message, index }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isError = message.isError
  const weatherData = !isUser ? extractWeatherData(message.toolCalls) : null

  const handleCopy = () => {
    navigator.clipboard?.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}
    >
      <div className={`flex max-w-[85%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isUser && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg">
            <span className="text-lg">☁️</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {/* Message Bubble */}
          <div
            className={`relative rounded-3xl px-5 py-3 text-[15px] leading-relaxed shadow-2xl ${
              isUser
                ? 'rounded-br-md bg-gradient-to-br from-sky-500 to-blue-600 text-white'
                : isError
                  ? 'rounded-bl-md border border-red-500/30 bg-red-500/10 text-red-300 backdrop-blur-xl'
                  : 'rounded-bl-md border border-white/10 bg-white/5 text-white/90 backdrop-blur-xl'
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="prose prose-invert prose-sm max-w-none"
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                  em: ({ children }) => <em className="text-sky-300">{children}</em>,
                  code: ({ children }) => (
                    <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm font-mono text-sky-300">
                      {children}
                    </code>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}

            {/* Copy button (assistant only) */}
            {!isUser && !isError && (
              <button
                onClick={handleCopy}
                className="absolute -right-10 top-3 rounded-lg p-1.5 text-white/40 opacity-0 transition-all hover:bg-white/10 hover:text-white group-hover:opacity-100"
                aria-label="Copy message"
              >
                {copied ? (
                  <CheckCheck className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          {/* Weather Cards */}
          {weatherData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {weatherData.type === 'current' ? (
                <CurrentWeatherCard location={weatherData.location} current={weatherData.current} />
              ) : (
                <ForecastCard location={weatherData.location} forecast={weatherData.forecast} />
              )}
            </motion.div>
          )}

          {/* Timestamp & Metadata */}
          <div className={`flex items-center gap-2 px-2 text-[11px] text-white/40 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span>Just now</span>
            {!isUser && message.usage && (
              <>
                <span>•</span>
                <span>{message.usage.prompt_tokens + message.usage.completion_tokens} tokens</span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
