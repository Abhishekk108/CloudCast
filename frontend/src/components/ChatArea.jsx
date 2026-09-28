/**
 * ChatArea — center column with nav, messages, and input
 */

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { ChatMessage } from './ChatMessage.jsx'
import { ChatInput } from './ChatInput.jsx'
import { WelcomeScreen } from './WelcomeScreen.jsx'
import { TypingIndicator } from './Chat/TypingIndicator.jsx'
import { ErrorBanner } from './common/ErrorBanner.jsx'

export function ChatArea({
  messages,
  isLoading,
  error,
  onSend,
  onRetry,
  onToggleSidebar,
  onToggleInsights,
  onOpenMobileDrawer,
  sidebarOpen,
  insightsPanelOpen,
}) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const showWelcome = messages.length === 0 && !isLoading

  return (
    <div className="flex h-full flex-col">
      {/* Top Nav */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl lg:px-6"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileDrawer}
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={onToggleSidebar}
            className="hidden rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:block"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-white">Weather Assistant</h2>
            <p className="text-xs text-white/50">Powered by AI</p>
          </div>
        </div>

        <button
          onClick={onToggleInsights}
          className="hidden rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white xl:block"
          aria-label="Toggle insights panel"
        >
          {insightsPanelOpen ? (
            <PanelRightClose className="h-5 w-5" />
          ) : (
            <PanelRightOpen className="h-5 w-5" />
          )}
        </button>
      </motion.nav>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 lg:px-6"
        role="log"
        aria-label="Conversation"
        aria-live="polite"
      >
        {showWelcome ? (
          <WelcomeScreen onSuggestion={onSend} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.map((msg, index) => (
                <ChatMessage key={msg.id} message={msg} index={index} />
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex items-start gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      className="text-lg"
                    >
                      ☁️
                    </motion.div>
                  </div>
                  <div className="flex-1">
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 bg-white/5 px-4 py-4 backdrop-blur-xl lg:px-6">
        {error && !isLoading && (
          <div className="mb-3">
            <ErrorBanner error={error} onRetry={onRetry} />
          </div>
        )}
        <ChatInput onSend={onSend} isLoading={isLoading} />
      </div>
    </div>
  )
}
