import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageBubble } from '../components/Chat/MessageBubble.jsx'

const userMsg = { id: '1', role: 'user', content: 'Hello there' }
const assistantMsg = { id: '2', role: 'assistant', content: 'Hi! Ask me about weather.' }
const errorMsg = { id: '3', role: 'assistant', content: 'Something went wrong.', isError: true }

describe('MessageBubble', () => {
  it('renders user message content', () => {
    render(<MessageBubble message={userMsg} />)
    expect(screen.getByText('Hello there')).toBeInTheDocument()
  })

  it('renders assistant message content', () => {
    render(<MessageBubble message={assistantMsg} />)
    expect(screen.getByText('Hi! Ask me about weather.')).toBeInTheDocument()
  })

  it('user bubble is right-aligned (justify-end)', () => {
    const { container } = render(<MessageBubble message={userMsg} />)
    expect(container.firstChild).toHaveClass('justify-end')
  })

  it('assistant bubble is left-aligned (justify-start)', () => {
    const { container } = render(<MessageBubble message={assistantMsg} />)
    expect(container.firstChild).toHaveClass('justify-start')
  })

  it('error message uses red styling', () => {
    const { container } = render(<MessageBubble message={errorMsg} />)
    const bubble = container.querySelector('.bg-red-50')
    expect(bubble).toBeInTheDocument()
  })

  it('non-error assistant message does not use red styling', () => {
    const { container } = render(<MessageBubble message={assistantMsg} />)
    expect(container.querySelector('.bg-red-50')).toBeNull()
  })

  it('shows token usage when usage data is present', () => {
    const msg = { ...assistantMsg, usage: { prompt_tokens: 50, completion_tokens: 20 } }
    render(<MessageBubble message={msg} />)
    expect(screen.getByText(/70 tokens/i)).toBeInTheDocument()
  })

  it('does not show token usage when absent', () => {
    render(<MessageBubble message={assistantMsg} />)
    expect(screen.queryByText(/tokens/i)).toBeNull()
  })
})
