import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger.js';

const app = express();

// ── Request logging ──────────────────────────────────────────────────────────
app.use(pinoHttp({ logger }));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());

// ── CORS ─────────────────────────────────────────────────────────────────────
// In production lock this down to the deployed frontend origin via CORS_ORIGIN env var
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

// ── Routes ───────────────────────────────────────────────────────────────────
// Health check (Phase 0, Task 0.5)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Placeholder — real routes wired in Phase 1+
// import chatRoutes from './routes/chat.routes.js';
// app.use('/api/chat', chatRoutes);

// ── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
});

// ── Global error handler (expanded in Task 1.2) ───────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error({ err }, 'Unhandled error');
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message;
  res.status(status).json({ error: { code: err.code || 'INTERNAL_ERROR', message } });
});

export default app;
