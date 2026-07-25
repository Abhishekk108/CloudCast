/**
 * ChatInput — message composer.
 *
 * - Enter sends; Shift+Enter inserts a newline
 * - Disabled (and visually muted) while a request is in-flight
 * - Auto-resizes textarea up to a max height
 */
import { useState, useRef, useEffect } from 'react'
import { LoadingSpinner } from '../common/LoadingSpinner.jsx'

export function ChatInput({ onSend, isLoading }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize the textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSend = value.trim().length > 0 && !isLoading

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isLoading ? 'Waiting for response…' : 'Ask about the weather anywhere…'}
        disabled={isLoading}
        rows={1}
        aria-label="Message"
        className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:opacity-50"
        style={{ maxHeight: '160px' }}
      />

      <button
        onClick={handleSubmit}
        disabled={!canSend}
        aria-label="Send message"
        className={[
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors',
          canSend
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed',
        ].join(' ')}
      >
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M3.105 2.288a.75.75 0 00-.826.95l1.414 4.926A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.897 28.897 0 0015.293-7.155.75.75 0 000-1.114A28.897 28.897 0 003.105 2.288z" />
          </svg>
        )}
      </button>
    </div>
  )
}
