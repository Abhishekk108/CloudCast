/**
 * ErrorBanner — dark-themed error with retry/dismiss
 */
import { motion } from 'framer-motion'
import { AlertTriangle, X, RefreshCw } from 'lucide-react'

export function ErrorBanner({ error, onRetry, onDismiss }) {
  if (!error) return null

  const message =
    error.status === 429
      ? "You've sent too many messages. Please wait a moment and try again."
      : error.message ?? 'Something went wrong. Please try again.'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 backdrop-blur-xl"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
      <span className="flex-1">{message}</span>
      <div className="flex shrink-0 items-center gap-1">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="rounded-lg p-1 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}
