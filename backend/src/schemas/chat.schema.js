/**
 * Zod schema for POST /api/chat request body.
 *
 * Matches the contract in context.md section 7.1.
 */

import { z } from 'zod'

/** A single message in the conversation history */
const historyMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().min(1),
})

export const chatRequestSchema = z.object({
  /** The user's new message */
  message: z
    .string({ required_error: 'message is required' })
    .min(1, 'message must not be empty')
    .max(2000, 'message must be 2000 characters or fewer'),

  /** Optional; generated server-side if absent */
  conversationId: z.string().uuid('conversationId must be a valid UUID').optional(),

  /** Prior turns to maintain context */
  history: z.array(historyMessageSchema).max(100, 'history may not exceed 100 messages').default([]),
})
