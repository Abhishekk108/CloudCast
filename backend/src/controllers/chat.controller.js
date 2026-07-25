/**
 * Chat controller — wires HTTP request/response to the agent loop.
 *
 * Handles two endpoints (both defined here, mounted separately in routes):
 *
 *   POST /api/chat        — full JSON response after agent completes
 *   POST /api/chat/stream — SSE stream of tokens after tool calls resolve
 *
 * Contract (context.md § 7.1):
 *   Request:  { message, conversationId?, history? }
 *   Response: { reply, toolCalls, conversationId, usage }
 */

import { randomUUID } from 'crypto'
import { runAgent } from '../agent/agent.js'
import { buildMessages } from '../agent/systemPrompt.js'
import { chatCompletion } from '../services/groqClient.js'
import { TOOL_SCHEMAS } from '../agent/toolSchemas.js'
import { executeTool } from '../tools/index.js'
import { logger } from '../utils/logger.js'

// ── Task 4.1 / 4.3 — Non-streaming handler ───────────────────────────────────

export const handleChat = async (req, res, next) => {
  const { message, conversationId, history } = req.body
  const convId = conversationId ?? randomUUID()

  const start = Date.now()

  try {
    const messages = buildMessages(history, message)
    const result = await runAgent({ messages })

    logger.info(
      {
        conversationId: convId,
        toolsCalled: result.toolCalls.map((t) => t.tool),
        cappedOut: result.cappedOut,
        latencyMs: Date.now() - start,
        usage: result.usage,
      },
      'Chat turn completed'
    )

    res.json({
      reply: result.reply,
      toolCalls: result.toolCalls,
      conversationId: convId,
      usage: result.usage,
    })
  } catch (err) {
    next(err)
  }
}

// ── Task 4.2 — SSE streaming handler ─────────────────────────────────────────
//
// Strategy:
//   1. Run the tool-calling loop exactly as the non-streaming handler does,
//      but stop before the final LLM text-generation call.
//   2. Stream the final answer token-by-token using Groq's streaming API.
//   3. Emit SSE events:
//        data: {"type":"tool","tool":"get_current_weather","args":{...}}
//        data: {"type":"token","token":"It "}
//        data: {"type":"token","token":"is "}
//        ...
//        data: {"type":"done","conversationId":"...","usage":{...}}
//      on error:
//        data: {"type":"error","code":"...","message":"..."}
//
// The client concatenates all token events to reconstruct the full reply,
// or just uses the last `done` event which isn't included here — the
// frontend useChat hook handles accumulation.

export const handleChatStream = async (req, res, next) => {
  const { message, conversationId, history } = req.body
  const convId = conversationId ?? randomUUID()

  // ── Set SSE headers ───────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  // Disable response buffering so each write flushes immediately
  res.flushHeaders()

  /** Send a single SSE data line */
  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  const start = Date.now()
  const toolCallTrace = []

  try {
    // ── Phase 1: resolve all tool calls (non-streaming, same as handleChat) ──
    const conversation = buildMessages(history, message)

    let keepLooping = true
    let iterationCount = 0
    const MAX = 5 // mirrors agent.js MAX_TOOL_ITERATIONS

    while (keepLooping && iterationCount < MAX) {
      iterationCount++

      const completion = await chatCompletion({
        messages: conversation,
        tools: TOOL_SCHEMAS,
        tool_choice: 'auto',
      })

      const choice = completion.choices?.[0]
      const assistantMsg = choice?.message
      const reason = choice?.finish_reason

      if (reason === 'stop' || !assistantMsg?.tool_calls?.length) {
        // No more tool calls — push the final assistant message and break out
        // so we can stream it below
        conversation.push(assistantMsg)
        keepLooping = false
        break
      }

      // Append assistant tool-call message, then execute tools
      conversation.push(assistantMsg)

      await Promise.all(
        assistantMsg.tool_calls.map(async (tc) => {
          const toolName = tc.function.name
          let args = {}
          try { args = JSON.parse(tc.function.arguments) } catch { /* ignore */ }

          // Emit tool event so the frontend can show a "thinking…" indicator
          send({ type: 'tool', tool: toolName, args })

          let result = null
          let errorMsg = null
          try {
            result = await executeTool(toolName, args)
          } catch (err) {
            errorMsg = err?.message ?? 'Tool failed'
          }

          toolCallTrace.push({ tool: toolName, args, result, ...(errorMsg && { error: errorMsg }) })
          conversation.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: errorMsg ? JSON.stringify({ error: errorMsg }) : JSON.stringify(result),
          })
        })
      )
    }

    // ── Phase 2: stream the final answer ─────────────────────────────────────
    // Remove the last assistant message that was appended (it may have content:null
    // from a tool-call turn). The streaming call re-generates it.
    // Actually the conversation already contains everything up to the last non-tool
    // response — just call with stream:true.

    const streamResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${req.app.locals.groqApiKey ?? process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
        messages: conversation,
        temperature: 0.4,
        max_tokens: 1024,
        stream: true,
      }),
    })

    if (!streamResponse.ok) {
      const errBody = await streamResponse.json().catch(() => ({}))
      send({ type: 'error', code: 'GROQ_STREAM_ERROR', message: errBody?.error?.message ?? 'Stream failed' })
      res.end()
      return
    }

    // Accumulate tokens so we can log total length
    let fullReply = ''
    const decoder = new TextDecoder()

    for await (const chunk of streamResponse.body) {
      const text = decoder.decode(chunk, { stream: true })
      const lines = text.split('\n').filter((l) => l.startsWith('data: '))

      for (const line of lines) {
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue

        let parsed
        try { parsed = JSON.parse(data) } catch { continue }

        const token = parsed?.choices?.[0]?.delta?.content
        if (token) {
          fullReply += token
          send({ type: 'token', token })
        }
      }
    }

    logger.info(
      {
        conversationId: convId,
        toolsCalled: toolCallTrace.map((t) => t.tool),
        latencyMs: Date.now() - start,
        replyLength: fullReply.length,
      },
      'Stream chat turn completed'
    )

    send({ type: 'done', conversationId: convId, toolCalls: toolCallTrace })
    res.end()
  } catch (err) {
    logger.error({ err, conversationId: convId }, 'Stream error')
    // Try to send an error event if headers haven't fully closed yet
    try {
      send({ type: 'error', code: err.code ?? 'INTERNAL_ERROR', message: err.message ?? 'Unexpected error' })
      res.end()
    } catch {
      next(err)
    }
  }
}
