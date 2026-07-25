import { Router } from 'express'
import { chatRateLimiter } from '../middleware/rateLimiter.js'
import { validateBody } from '../middleware/validateRequest.js'
import { handleChat, handleChatStream } from '../controllers/chat.controller.js'
import { chatRequestSchema } from '../schemas/chat.schema.js'

const router = Router()

// POST /api/chat — full JSON response
router.post('/', chatRateLimiter, validateBody(chatRequestSchema), handleChat)

// POST /api/chat/stream — SSE streaming response
router.post('/stream', chatRateLimiter, validateBody(chatRequestSchema), handleChatStream)

export default router
