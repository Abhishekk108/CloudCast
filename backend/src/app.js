import express from 'express'
import cors from 'cors'
import pinoHttp from 'pino-http'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import healthRouter from './routes/health.routes.js'
import chatRouter from './routes/chat.routes.js'

const app = express()

// ── Request logging ──────────────────────────────────────────────────────────
app.use(pinoHttp({ logger }))

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json())

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
)

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter)
app.use('/api/chat', chatRouter)

// ── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } })
})

// ── Global error handler ─────────────────────────────────────────────────────
// Must be last — Express identifies error handlers by their 4-argument signature.
app.use(errorHandler)

export default app
