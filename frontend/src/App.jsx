/**
 * CloudCast — Premium AI Weather Agent
 * Complete UI redesign with glassmorphism, animations, and responsive layout
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from './hooks/useChat.js'
import { Sidebar } from './components/Sidebar.jsx'
import { ChatArea } from './components/ChatArea.jsx'
import { InsightsPanel } from './components/InsightsPanel.jsx'
import { MobileNav } from './components/MobileNav.jsx'
import { AnimatedBackground } from './components/AnimatedBackground.jsx'

export default function App() {
  const { messages, isLoading, error, sendMessage, retryLast, clearChat } = useChat()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [insightsPanelOpen, setInsightsPanelOpen] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const handleSend = (text) => {
    sendMessage(text)
  }

  const handleNewChat = () => {
    clearChat()
    setMobileDrawerOpen(false)
  }

  // Extract the latest weather data for the insights panel
  const latestWeatherData = messages
    .slice()
    .reverse()
    .find((m) => m.role === 'assistant' && m.toolCalls?.length > 0)

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-gradient-to-br from-[#07111F] via-[#0a1628] to-[#101B31]">
      {/* Animated background blobs */}
      <AnimatedBackground />

      {/* Desktop: Sidebar */}
      <div className="hidden lg:block">
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <Sidebar
              onNewChat={handleNewChat}
              onClose={() => setSidebarOpen(false)}
              messages={messages}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Mobile: Drawer */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative"
            >
              <Sidebar
                onNewChat={handleNewChat}
                onClose={() => setMobileDrawerOpen(false)}
                messages={messages}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center: Chat Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          error={error}
          onSend={handleSend}
          onRetry={retryLast}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onToggleInsights={() => setInsightsPanelOpen(!insightsPanelOpen)}
          onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
          sidebarOpen={sidebarOpen}
          insightsPanelOpen={insightsPanelOpen}
        />
      </div>

      {/* Desktop Right: Insights Panel */}
      <div className="hidden xl:block">
        <AnimatePresence mode="wait">
          {insightsPanelOpen && latestWeatherData && (
            <InsightsPanel
              weatherData={latestWeatherData}
              onClose={() => setInsightsPanelOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Mobile: Bottom Navigation */}
      <div className="lg:hidden">
        <MobileNav onOpenDrawer={() => setMobileDrawerOpen(true)} />
      </div>
    </div>
  )
}
