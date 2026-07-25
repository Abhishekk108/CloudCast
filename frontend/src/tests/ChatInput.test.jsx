import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from '../components/Chat/ChatInput.jsx'

describe('ChatInput', () => {
  it('renders the textarea and send button', () => {
    render(<ChatInput onSend={vi.fn()} isLoading={false} />)
    expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('calls onSend with text when Enter is pressed', async () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} isLoading={false} />)
    const textarea = screen.getByRole('textbox')
    await userEvent.type(textarea, 'Weather in Pune{Enter}')
    expect(onSend).toHaveBeenCalledWith('Weather in Pune')
  })

  it('clears the input after sending', async () => {
    render(<ChatInput onSend={vi.fn()} isLoading={false} />)
    const textarea = screen.getByRole('textbox')
    await userEvent.type(textarea, 'Test message{Enter}')
    expect(textarea).toHaveValue('')
  })

  it('does not send on Shift+Enter — inserts newline instead', async () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} isLoading={false} />)
    const textarea = screen.getByRole('textbox')
    await userEvent.type(textarea, 'Hello{Shift>}{Enter}{/Shift}World')
    expect(onSend).not.toHaveBeenCalled()
    expect(textarea.value).toContain('Hello')
    expect(textarea.value).toContain('World')
  })

  it('sends when send button is clicked', async () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} isLoading={false} />)
    await userEvent.type(screen.getByRole('textbox'), 'Click send')
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSend).toHaveBeenCalledWith('Click send')
  })

  it('disables textarea and button while isLoading', () => {
    render(<ChatInput onSend={vi.fn()} isLoading={true} />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('does not call onSend when input is empty', async () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} isLoading={false} />)
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSend).not.toHaveBeenCalled()
  })

  it('does not call onSend when input is only whitespace', async () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} isLoading={false} />)
    await userEvent.type(screen.getByRole('textbox'), '   {Enter}')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('shows loading placeholder text while isLoading', () => {
    render(<ChatInput onSend={vi.fn()} isLoading={true} />)
    expect(screen.getByPlaceholderText(/waiting/i)).toBeInTheDocument()
  })
})
