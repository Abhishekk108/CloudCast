/**
 * InsightsPanel — sticky right column showing today's highlights
 */
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

function InsightCard({ icon, label, value, sub, color = 'sky' }) {
  const colorMap = {
    sky: 'from-sky-500/20 to-sky-500/5 border-sky-500/20',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/20',
    teal: 'from-teal-500/20 to-teal-500/5 border-teal-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
    green: 'from-green-500/20 to-green-500/5 border-green-500/20',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20',
    indigo: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/20',
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl border bg-gradient-to-br p-4 ${colorMap[color] ?? colorMap.sky}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/50">{sub}</p>}
    </motion.div>
  )
}

function SunriseSunsetCard({ sunrise, sunset }) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-white/50">
        Daylight
      </p>
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-lg">🌅</p>
          <p className="text-sm font-semibold text-white">{sunrise ?? '—'}</p>
          <p className="text-xs text-white/40">Sunrise</p>
        </div>
        {/* Arc bar */}
        <div className="flex-1 px-3">
          <div className="relative h-0.5 rounded-full bg-white/10">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400 to-amber-300 opacity-70" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-lg">🌇</p>
          <p className="text-sm font-semibold text-white">{sunset ?? '—'}</p>
          <p className="text-xs text-white/40">Sunset</p>
        </div>
      </div>
    </div>
  )
}

export function InsightsPanel({ weatherData, onClose }) {
  const current = weatherData?.toolCalls?.find(
    (tc) => tc.tool === 'get_current_weather'
  )?.result?.current

  const astronomy = weatherData?.toolCalls?.find(
    (tc) => tc.tool === 'get_astronomy'
  )?.result?.astronomy

  return (
    <motion.aside
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="relative z-20 flex h-full w-[320px] flex-col border-l border-white/10 bg-white/5 backdrop-blur-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Today's Highlights</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close insights panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {current ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.06 } },
              hidden: {},
            }}
            className="space-y-3"
          >
            {/* 2-col grid for metrics */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              >
                <InsightCard icon="💧" label="Humidity" value={`${current.humidity}%`} color="sky" />
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              >
                <InsightCard
                  icon="☀️"
                  label="UV Index"
                  value={current.uvIndex ?? '—'}
                  sub={
                    current.uvIndex >= 8
                      ? 'Very High'
                      : current.uvIndex >= 6
                        ? 'High'
                        : current.uvIndex >= 3
                          ? 'Moderate'
                          : 'Low'
                  }
                  color="orange"
                />
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              >
                <InsightCard
                  icon="🌬️"
                  label="Wind"
                  value={`${current.windKph} km/h`}
                  sub={current.windDir}
                  color="teal"
                />
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              >
                <InsightCard
                  icon="🌡️"
                  label="Feels Like"
                  value={`${current.feelsLikeC}°C`}
                  color="blue"
                />
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              >
                <InsightCard
                  icon="🔵"
                  label="Pressure"
                  value={current.pressureMb ? `${current.pressureMb} mb` : '—'}
                  color="indigo"
                />
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              >
                <InsightCard
                  icon="👁️"
                  label="Visibility"
                  value={current.visibilityKm ? `${current.visibilityKm} km` : '—'}
                  color="purple"
                />
              </motion.div>
            </div>

            {/* Sunrise / Sunset */}
            {astronomy && (
              <motion.div
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              >
                <SunriseSunsetCard
                  sunrise={astronomy.sunrise}
                  sunset={astronomy.sunset}
                />
              </motion.div>
            )}

            {/* Moon phase */}
            {astronomy && (
              <motion.div
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              >
                <InsightCard
                  icon="🌙"
                  label="Moon Phase"
                  value={astronomy.moonPhase ?? '—'}
                  sub={`${astronomy.moonIlluminationPct ?? 0}% illuminated`}
                  color="indigo"
                />
              </motion.div>
            )}
          </motion.div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="text-5xl"
            >
              🌤️
            </motion.div>
            <p className="text-sm text-white/40">
              Ask about current weather to see detailed insights here.
            </p>
          </div>
        )}
      </div>
    </motion.aside>
  )
}
