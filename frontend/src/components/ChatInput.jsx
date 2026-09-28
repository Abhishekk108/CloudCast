/**
 * ChatInput — floating premium input with gradient send button
 */

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Paperclip, Mic } from 'lucide-react'

export function ChatInput({ onSend, isLoading }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
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
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-xl transition-all focus-within:border-sky-500/50 focus-within:ring-2 focus-within:ring-sky-500/20">
        {/* Attach Button (UI only) */}
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Attach file"
          disabled
        >
          <Paperclip className="h-5 w-5" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? 'AI is thinking...' : 'Ask anything about weather...'}
          disabled={isLoading}
          rows={1}
          aria-label="Message"
          className="flex-1 resize-none bg-transparent text-[15px] text-white placeholder-white/30 focus:outline-none disabled:opacity-50"
          style={{ maxHeight: '120px' }}
        />

        {/* Voice Button (UI only) */}
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Voice input"
          disabled
        >
          <Mic className="h-5 w-5" />
        </button>

        {/* Send Button */}
        <motion.button
          onClick={handleSubmit}
          disabled={!canSend}
          whileHover={canSend ? { scale: 1.05 } : {}}
          whileTap={canSend ? { scale: 0.95 } : {}}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-lg transition-all ${
            canSend
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </motion.button>
      </div>
    </div>
  )
}
