/**
 * MobileNav — fixed bottom navigation bar for mobile
 */
import { motion } from 'framer-motion'
import { MessageSquare, Menu, Sun } from 'lucide-react'

export function MobileNav({ onOpenDrawer }) {
  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-white/10 bg-[#07111F]/90 px-6 pb-safe pt-3 pb-5 backdrop-blur-2xl"
      aria-label="Mobile navigation"
    >
      <button
        onClick={onOpenDrawer}
        className="flex flex-col items-center gap-1 text-white/50 transition-colors hover:text-white"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
        <span className="text-[10px]">Menu</span>
      </button>

      <button
        className="flex flex-col items-center gap-1 text-sky-400"
        aria-label="Chat"
        aria-current="page"
      >
        <div className="relative">
          <div className="absolute -inset-2 rounded-full bg-sky-500/20 blur-md" />
          <MessageSquare className="relative h-6 w-6" />
        </div>
        <span className="text-[10px]">Chat</span>
      </button>

      <button
        className="flex flex-col items-center gap-1 text-white/50 transition-colors hover:text-white"
        aria-label="Weather"
        disabled
      >
        <Sun className="h-6 w-6" />
        <span className="text-[10px]">Weather</span>
      </button>
    </motion.nav>
  )
}
