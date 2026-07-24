import { Router } from 'express'

const router = Router()

// GET /api/health
router.get('/', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

export default router
