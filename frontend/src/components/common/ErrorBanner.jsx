/**
 * ErrorBanner — shown when a network failure or API error occurs.
 * Includes a Retry button that calls onRetry() to re-send the last message.
 */
export function ErrorBanner({ error, onRetry, onDismiss }) {
  if (!error) return null

  const message =
    error.status === 429
      ? 'You\'ve sent too many messages. Please wait a moment and try again.'
      : error.message ?? 'Something went wrong. Please try again.'

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {/* Warning icon */}
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>

      <span className="flex-1">{message}</span>

      <div className="flex shrink-0 gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded px-2 py-0.5 text-xs font-medium text-red-700 underline hover:text-red-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="rounded p-0.5 text-red-400 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
