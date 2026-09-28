/**
 * Sidebar — collapsible navigation with logo, new chat, conversations, cities
 */

import { motion } from 'framer-motion'
import { Plus, X, Cloud, CloudRain, Settings, MapPin } from 'lucide-react'

const SAVED_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Chennai']

export function Sidebar({ onNewChat, onClose, messages }) {
  // Extract conversation summaries (first user message from each "session")
  const conversations = messages
    .filter((m) => m.role === 'user')
    .slice(-5)
    .reverse()
    .map((m, i) => ({
      id: m.id,
      preview: m.content.slice(0, 50) + (m.content.length > 50 ? '…' : ''),
      time: 'Today',
    }))

  return (
    <motion.aside
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="relative z-30 flex h-full w-[280px] flex-col border-r border-white/10 bg-white/5 backdrop-blur-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600"
          >
            <Cloud className="h-5 w-5 text-white" />
          </motion.div>
          <div>
            <h1 className="text-sm font-bold text-white">CloudCast</h1>
            <p className="text-[10px] text-white/50">AI Weather Agent</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {/* Recent Conversations */}
        {conversations.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Recent
            </h2>
            <div className="space-y-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
                >
                  <CloudRain className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  <span className="flex-1 truncate text-xs">{conv.preview}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Saved Cities */}
        <div className="mb-6">
          <h2 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Saved Cities
          </h2>
          <div className="space-y-1">
            {SAVED_CITIES.map((city) => (
              <button
                key={city}
                className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <span className="flex-1 truncate text-xs">{city}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 p-3">
        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white">
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </motion.aside>
  )
}
