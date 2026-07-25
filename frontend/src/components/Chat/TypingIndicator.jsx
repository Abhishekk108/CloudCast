/**
 * TypingIndicator — three animated dots shown while the agent is thinking.
 * Appears immediately after the user sends a message; disappears once
 * the first assistant content is rendered.
 */
export function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="CloudCast is thinking"
      className="flex items-end gap-1 px-4 py-3"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-blue-400"
          style={{
            animation: 'bounce 1.2s infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
