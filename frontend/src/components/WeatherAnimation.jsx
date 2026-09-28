/**
 * WeatherAnimation — floating animated cloud illustration for the welcome screen
 */
import { motion } from 'framer-motion'

export function WeatherAnimation() {
  return (
    <div className="relative mb-6 flex h-36 w-36 items-center justify-center" aria-hidden="true">
      {/* Outer glow ring */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full bg-sky-500/20 blur-2xl"
      />
      {/* Middle ring */}
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute inset-4 rounded-full bg-sky-400/20 blur-xl"
      />
      {/* Icon container */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-400/20 to-blue-600/20 backdrop-blur-xl border border-white/10 shadow-2xl"
      >
        <span className="text-5xl select-none">⛅</span>
      </motion.div>

      {/* Small floating stars / sparkles */}
      {[
        { top: '5%', left: '75%', delay: 0 },
        { top: '70%', left: '80%', delay: 1 },
        { top: '75%', left: '10%', delay: 2 },
        { top: '10%', left: '15%', delay: 0.5 },
      ].map((pos, i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: pos.delay, ease: 'easeInOut' }}
          className="absolute text-sm text-sky-300"
          style={{ top: pos.top, left: pos.left }}
        >
          ✦
        </motion.span>
      ))}
    </div>
  )
}
