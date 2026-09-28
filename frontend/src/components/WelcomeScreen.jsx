/**
 * WelcomeScreen — animated hero with suggestions
 */

import { motion } from 'framer-motion'
import { PromptChip } from './PromptChip.jsx'
import { WeatherAnimation } from './WeatherAnimation.jsx'

const SUGGESTIONS = [
  { icon: '🌧️', text: 'Will it rain tomorrow?' },
  { icon: '📅', text: '7-day forecast' },
  { icon: '🌬️', text: 'AQI in Pune' },
  { icon: '🌅', text: 'Sunrise & Sunset' },
  { icon: '☀️', text: 'Weekend weather' },
  { icon: '🌙', text: 'Moon phase tonight' },
]

export function WelcomeScreen({ onSuggestion }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-full flex-col items-center justify-center px-4 py-12 text-center"
    >
      {/* Animated Weather Illustration */}
      <WeatherAnimation />

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 max-w-2xl"
      >
        <h1 className="mb-3 text-3xl font-bold text-white lg:text-4xl">
          Your Intelligent Weather Assistant
        </h1>
        <p className="text-base text-white/60 lg:text-lg">
          Ask about forecasts, rainfall, air quality, astronomy, UV, humidity, and weather alerts.
        </p>
      </motion.div>

      {/* Suggestion Chips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid w-full max-w-2xl gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {SUGGESTIONS.map((suggestion, i) => (
          <PromptChip
            key={i}
            icon={suggestion.icon}
            text={suggestion.text}
            onClick={() => onSuggestion(suggestion.text)}
            delay={i * 0.05}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}
