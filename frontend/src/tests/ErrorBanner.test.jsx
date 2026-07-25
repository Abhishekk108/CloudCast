/**
 * Task 6.1 — ErrorBanner tests
 *
 * AC: Simulating a failed fetch shows the banner; clicking Retry
 *     resends the same message and clears the banner on success.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBanner } from '../components/common/ErrorBanner.jsx'

function makeError(message = 'Network error', status = 500) {
  const e = new Error(message)
  e.status = status
  return e
}

describe('ErrorBanner', () => {
  it('renders nothing when error is null', () => {
    const { container } = render(<ErrorBanner error={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('displays the error message', () => {
    render(<ErrorBanner error={makeError('Weather API is down')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Weather API is down')
  })

  it('shows a friendly message for 429 rate-limit errors', () => {
    render(<ErrorBanner error={makeError('Too many requests', 429)} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/too many messages/i)
  })

  it('renders Retry button when onRetry is provided', () => {
    render(<ErrorBanner error={makeError()} onRetry={vi.fn()} />)
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('calls onRetry when Retry is clicked', () => {
    const onRetry = vi.fn()
    render(<ErrorBanner error={makeError()} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does not render Retry button when onRetry is not provided', () => {
    render(<ErrorBanner error={makeError()} />)
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull()
  })

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn()
    render(<ErrorBanner error={makeError()} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('has role="alert" for screen reader announcement', () => {
    render(<ErrorBanner error={makeError('Something failed')} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
