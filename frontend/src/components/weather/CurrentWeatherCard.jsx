/**
 * CurrentWeatherCard — premium glass card for current weather
 */
import { motion } from 'framer-motion'
import { Droplets, Wind, Eye, Thermometer } from 'lucide-react'

function MetricTile({ icon, label, value }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-white/5 p-3">
      <div className="flex items-center gap-1.5 text-white/50">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-base font-semibold text-white">{value}</span>
    </div>
  )
}

export function CurrentWeatherCard({ location, current }) {
  if (!current) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-2xl"
    >
      {/* Hero section */}
      <div className="relative p-5">
        {/* Subtle gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/10 to-transparent" />

        <div className="relative flex items-start justify-between gap-4">
          {/* Left: temp + condition */}
          <div>
            <p className="mb-1 text-sm font-medium text-sky-400">
              {location?.name}
              {location?.country ? `, ${location.country}` : ''}
            </p>
            <div className="flex items-start gap-2">
              <span className="text-6xl font-thin text-white tracking-tight leading-none">
                {current.tempC}
              </span>
              <span className="mt-1 text-2xl font-light text-white/60">°C</span>
            </div>
            <p className="mt-1 text-sm text-white/60">{current.condition?.text}</p>
            <p className="mt-0.5 text-xs text-white/40">
              Feels like {current.feelsLikeC}°C
            </p>
          </div>

          {/* Right: weather icon */}
          {current.condition?.icon && (
            <motion.img
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              src={current.condition.icon}
              alt={current.condition.text ?? 'weather'}
              className="h-20 w-20 shrink-0 drop-shadow-2xl"
            />
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-white/10" />

      {/* Metrics grid — 2×2 */}
      <div className="grid grid-cols-2 gap-2 p-4">
        <MetricTile
          icon={<Droplets className="h-3.5 w-3.5" />}
          label="Humidity"
          value={`${current.humidity}%`}
        />
        <MetricTile
          icon={<Wind className="h-3.5 w-3.5" />}
          label="Wind"
          value={`${current.windKph} km/h ${current.windDir ?? ''}`}
        />
        <MetricTile
          icon={<span className="text-xs">☀️</span>}
          label="UV Index"
          value={current.uvIndex ?? '—'}
        />
        <MetricTile
          icon={<span className="text-xs">🌧️</span>}
          label="Rain"
          value={current.chanceOfRainPct != null ? `${current.chanceOfRainPct}%` : '—'}
        />
      </div>
    </motion.div>
  )
}
