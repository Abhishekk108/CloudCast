/**
 * PromptChip — suggestion pill on the welcome screen
 */
import { motion } from 'framer-motion'

export function PromptChip({ icon, text, onClick, delay = 0 }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + delay }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/70 backdrop-blur-xl transition-colors hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-white"
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{text}</span>
    </motion.button>
  )
}
