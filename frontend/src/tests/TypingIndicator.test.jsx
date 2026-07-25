/**
 * Task 6.2 — TypingIndicator tests
 *
 * AC: Indicator appears immediately after send and disappears once
 *     the first assistant content is rendered.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TypingIndicator } from '../components/Chat/TypingIndicator.jsx'

describe('TypingIndicator', () => {
  it('renders with the correct accessibility role and label', () => {
    render(<TypingIndicator />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByLabelText(/thinking/i)).toBeInTheDocument()
  })

  it('renders three animated dots', () => {
    const { container } = render(<TypingIndicator />)
    // Three span elements with rounded-full class (the dots)
    const dots = container.querySelectorAll('span.rounded-full')
    expect(dots).toHaveLength(3)
  })

  it('each dot has a different animation delay', () => {
    const { container } = render(<TypingIndicator />)
    const dots = [...container.querySelectorAll('span.rounded-full')]
    const delays = dots.map((d) => d.style.animationDelay)
    // All three delays should be distinct
    expect(new Set(delays).size).toBe(3)
  })
})
