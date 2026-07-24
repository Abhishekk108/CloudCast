import pino from 'pino'

// The logger is imported by env.js error handling before env.js has finished
// parsing, so we read process.env directly here rather than importing env.js
// (which would create a circular dependency at startup).
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
})
