/**
 * ForecastCard — 7-day forecast list card with temperature bars
 */
import { motion } from 'framer-motion'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDayLabel(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return DAY_LABELS[d.getDay()] ?? dateStr
}

export function ForecastCard({ location, forecast }) {
  if (!forecast?.length) return null

  // Compute global min/max for the temp bar scale
  const allMaxes = forecast.map((d) => d.maxTempC ?? 0)
  const allMins = forecast.map((d) => d.minTempC ?? 0)
  const globalMax = Math.max(...allMaxes)
  const globalMin = Math.min(...allMins)
  const range = globalMax - globalMin || 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-2xl"
    >
      {/* Header */}
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-sm font-medium text-sky-400">
          {location?.name} — {forecast.length}-Day Forecast
        </p>
      </div>

      {/* Forecast rows */}
      <div className="divide-y divide-white/5 px-5">
        {forecast.map((day, i) => {
          const minOffset = ((day.minTempC - globalMin) / range) * 100
          const barWidth = ((day.maxTempC - day.minTempC) / range) * 100

          return (
            <motion.div
              key={day.date ?? i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 py-3"
            >
              {/* Day label */}
              <span className="w-16 shrink-0 text-sm font-medium text-white/70">
                {getDayLabel(day.date)}
              </span>

              {/* Weather icon */}
              {day.condition?.icon ? (
                <img
                  src={day.condition.icon}
                  alt={day.condition.text ?? ''}
                  className="h-8 w-8 shrink-0"
                />
              ) : (
                <span className="h-8 w-8 shrink-0 text-2xl text-center">🌤️</span>
              )}

              {/* Rain chance */}
              {day.chanceOfRainPct > 0 ? (
                <span className="w-10 shrink-0 text-right text-xs font-medium text-sky-400">
                  {day.chanceOfRainPct}%
                </span>
              ) : (
                <span className="w-10 shrink-0" />
              )}

              {/* Temperature bar */}
              <div className="relative flex-1">
                <div className="h-1.5 rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%`, marginLeft: `${minOffset}%` }}
                    transition={{ delay: 0.3 + i * 0.06, duration: 0.6, ease: 'easeOut' }}
                    className="absolute h-1.5 rounded-full bg-gradient-to-r from-sky-400 to-orange-400"
                  />
                </div>
              </div>

              {/* Min / Max */}
              <div className="flex shrink-0 items-center gap-1.5 text-sm">
                <span className="font-medium text-white/50">{day.minTempC}°</span>
                <span className="font-semibold text-white">{day.maxTempC}°</span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
