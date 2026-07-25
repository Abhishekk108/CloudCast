export function LoadingSpinner({ size = 'sm' }) {
  const dim = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block ${dim} border-2 border-current border-t-transparent rounded-full animate-spin`}
    />
  )
}
