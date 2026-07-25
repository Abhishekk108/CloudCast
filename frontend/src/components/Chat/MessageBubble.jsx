/**
 * MessageBubble — renders a single chat message with visually distinct
 * styles for user vs assistant, and an error state for failed responses.
 */
export function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const isError = message.isError

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar — only for assistant */}
      {!isUser && (
        <div
          className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs text-white select-none"
          aria-hidden="true"
        >
          ☁
        </div>
      )}

      <div
        className={[
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-sm bg-blue-600 text-white'
            : isError
              ? 'rounded-bl-sm border border-red-200 bg-red-50 text-red-700'
              : 'rounded-bl-sm bg-white text-gray-800 shadow-sm ring-1 ring-gray-100',
        ].join(' ')}
      >
        {/* Preserve newlines */}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>

        {/* Compact token usage hint for assistant messages */}
        {!isUser && !isError && message.usage && (
          <p className="mt-1 text-[10px] text-gray-400">
            {message.usage.prompt_tokens + message.usage.completion_tokens} tokens
          </p>
        )}
      </div>
    </div>
  )
}
