/**
 * App — root component.
 *
 * Layout:
 *   ┌──────────────────────────────┐
 *   │  Header (fixed)              │
 *   ├──────────────────────────────┤
 *   │  ChatWindow (scrollable)     │
 *   ├──────────────────────────────┤
 *   │  ErrorBanner (conditional)   │
 *   │  ChatInput (fixed bottom)    │
 *   └──────────────────────────────┘
 *
 * Responsive: full-screen on mobile, max-w-3xl centred on desktop.
 */

import { useState } from 'react'
import { useChat } from './hooks/useChat.js'
import { ChatWindow } from './components/Chat/ChatWindow.jsx'
import { ChatInput } from './components/Chat/ChatInput.jsx'
import { ErrorBanner } from './components/common/ErrorBanner.jsx'

function Header() {
  return (
    <header className="flex items-center gap-2 border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-sm">
      <span className="text-2xl select-none" aria-hidden="true">
        ⛅
      </span>
      <div>
        <h1 className="text-base font-bold leading-tight text-gray-800">CloudCast</h1>
        <p className="text-[11px] text-gray-400">AI weather agent</p>
      </div>
    </header>
  )
}

export default function App() {
  const { messages, isLoading, error, sendMessage, retryLast, clearChat } = useChat()
  const [errorDismissed, setErrorDismissed] = useState(false)

  // Show banner only when there's a new error (dismiss resets on next error)
  const showBanner = error && !errorDismissed

  const handleSend = (text) => {
    setErrorDismissed(false)
    sendMessage(text)
  }

  const handleRetry = () => {
    setErrorDismissed(false)
    retryLast()
  }

  const handleDismissError = () => setErrorDismissed(true)

  // When user picks a suggestion from the empty-state panel
  const handleSuggestion = (text) => handleSend(text)

  return (
    // Outer shell: full viewport height, centred max-width column
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <Header />

        {/* Scrollable message area */}
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSuggestion={handleSuggestion}
        />

        {/* Error banner + input anchored at the bottom */}
        <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-3">
          {showBanner && (
            <div className="mb-2">
              <ErrorBanner
                error={error}
                onRetry={handleRetry}
                onDismiss={handleDismissError}
              />
            </div>
          )}

          <ChatInput onSend={handleSend} isLoading={isLoading} />

          {/* Subtle clear button */}
          {messages.length > 0 && !isLoading && (
            <p className="mt-1.5 text-center text-[10px] text-gray-400">
              <button
                onClick={clearChat}
                className="underline hover:text-gray-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 rounded"
              >
                Clear conversation
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
