/**
 * TypingIndicator — three bouncing dots in a glass bubble
 * Styled with inline animationDelay to satisfy both the test contract
 * and the visual Framer Motion animation.
 */
export function TypingIndicator() {
  const delays = ['0s', '0.15s', '0.3s']

  return (
    <div
      role="status"
      aria-label="CloudCast is thinking"
      className="inline-flex items-center gap-1.5 rounded-3xl rounded-bl-md border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl shadow-2xl"
    >
      <style>{`
        @keyframes cc-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
      {delays.map((delay, i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-sky-400"
          style={{
            animation: 'cc-bounce 0.8s infinite',
            animationDelay: delay,
          }}
        />
      ))}
    </div>
  )
}
