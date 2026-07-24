import { Router } from 'express'
import { chatRateLimiter } from '../middleware/rateLimiter.js'
import { validateBody } from '../middleware/validateRequest.js'
import { handleChat } from '../controllers/chat.controller.js'
import { chatRequestSchema } from '../schemas/chat.schema.js'

const router = Router()

// POST /api/chat
// Rate-limited → validated → handled
router.post('/', chatRateLimiter, validateBody(chatRequestSchema), handleChat)

export default router
