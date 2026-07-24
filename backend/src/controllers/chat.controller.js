/**
 * Chat controller — stub for Phase 4.
 *
 * The real agent orchestration (agent.js) is wired in Task 4.1.
 * For now this just echoes a placeholder so the route is reachable and
 * validation / rate-limiting can be tested end-to-end.
 */

import { randomUUID } from 'crypto'

export const handleChat = (req, res) => {
  const { message, conversationId, history } = req.body

  res.json({
    reply: `[stub] Received: "${message}" — agent not yet connected.`,
    toolCalls: [],
    conversationId: conversationId ?? randomUUID(),
    history,
    usage: null,
  })
}
