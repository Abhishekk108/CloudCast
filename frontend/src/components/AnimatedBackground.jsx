/**
 * AnimatedBackground — floating blurred blobs + gradient mesh
 */
import { motion } from 'framer-motion'

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Blob 1 — sky blue */}
      <motion.div
        animate={{ x: [0, 60, -20, 0], y: [0, -40, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-sky-500/10 blur-[120px]"
      />
      {/* Blob 2 — indigo */}
      <motion.div
        animate={{ x: [0, -50, 30, 0], y: [0, 60, -20, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute top-1/3 -right-32 h-[500px] w-[500px] rounded-full bg-indigo-500/8 blur-[140px]"
      />
      {/* Blob 3 — purple */}
      <motion.div
        animate={{ x: [0, 40, -60, 0], y: [0, -30, 50, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
        className="absolute -bottom-48 left-1/3 h-[600px] w-[600px] rounded-full bg-purple-500/6 blur-[160px]"
      />
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  )
}
