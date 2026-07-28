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
import { env } from '../config/env.js'

// ── Friendly degradation messages (Task 6.3) ─────────────────────────────────
// When an external provider is down, return a chat-style reply rather than
// surfacing a raw 500 to the client. Each message is warm and actionable.

const DEGRADATION_REPLIES = {
  GROQ_TIMEOUT:
    "I'm having trouble connecting to my AI service right now. Please wait a moment and try again.",
  GROQ_RATE_LIMIT:
    "I'm handling a lot of requests right now and hit a rate limit. Please try again in a few seconds.",
  GROQ_AUTH_ERROR:
    "There's a configuration issue on my end — I can't reach the AI service right now. Please try again later.",
  GROQ_UNKNOWN:
    "My AI service returned an unexpected error. Please try again in a moment.",
  WEATHER_API_TIMEOUT:
    "I couldn't fetch live weather data right now — the weather service is taking too long to respond. Please try again shortly.",
  WEATHER_API_AUTH_ERROR:
    "There's a configuration issue with the weather data service. Please try again later.",
  WEATHER_API_UNKNOWN:
    "I couldn't fetch live weather data right now — the weather service returned an unexpected error. Please try again shortly.",
}

/**
 * Map a caught AppError to a user-friendly degradation reply if it's a
 * known provider outage code. Returns null for unknown/client errors.
 * @param {import('../middleware/errorHandler.js').AppError} err
 */
function getDegradationReply(err) {
  return DEGRADATION_REPLIES[err?.code] ?? null
}

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
    // Task 6.3 — provider outages return a friendly chat reply, not a 500
    const degradationReply = getDegradationReply(err)
    if (degradationReply) {
      logger.warn(
        { err, conversationId: convId, code: err.code, latencyMs: Date.now() - start },
        'Provider outage — returning graceful degradation reply'
      )
      return res.json({
        reply: degradationReply,
        toolCalls: [],
        conversationId: convId,
        usage: null,
        degraded: true,
      })
    }
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
    // Track the final assistant message content if Groq already produced it
    // without needing a streaming re-call (i.e. it came back as stop in Phase 1).
    let phaseOneReply = null

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
        // Groq returned a final text answer — capture it.
        // Do NOT push this back into conversation — Phase 2 will stream
        // a fresh generation from the same conversation state (without the
        // already-generated assistant message), so the conversation must end
        // with the last tool result message (role: 'tool') or user message.
        phaseOneReply = assistantMsg?.content ?? null
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

          logger.info({ tool: toolName, args }, 'Stream tool call executing')

          // Emit tool event so the frontend can show a "thinking…" indicator
          send({ type: 'tool', tool: toolName, args })

          let result = null
          let errorMsg = null
          try {
            result = await executeTool(toolName, args)
            logger.info({ tool: toolName, result }, 'Stream tool call result')
          } catch (err) {
            errorMsg = err?.message ?? 'Tool failed'
            logger.warn({ tool: toolName, args, error: errorMsg }, 'Stream tool call failed')
          }

          toolCallTrace.push({ tool: toolName, args, result: result ?? null, ...(errorMsg && { error: errorMsg }) })
          conversation.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: errorMsg ? JSON.stringify({ error: errorMsg }) : JSON.stringify(result),
          })
        })
      )
    }

    // ── Phase 2: stream the final answer ─────────────────────────────────────
    // The conversation now ends with the last `tool` role message (or the
    // original user message if no tools were called). We call Groq with
    // stream:true so it generates the final answer token-by-token.
    //
    // IMPORTANT: Never push a non-streaming assistant message into the
    // conversation before the streaming call — that produces an invalid
    // message sequence (ending with role:assistant) that Groq rejects with
    // a 400. The streaming call generates the assistant turn fresh.

    // If Phase 1 already produced a text reply without any tool calls
    // (i.e. it came back as stop on the very first iteration), we already
    // have the content — stream it locally as synthetic token events to
    // avoid a redundant round-trip that would fail anyway.
    if (phaseOneReply !== null && toolCallTrace.length === 0) {
      // No tools were called: emit the reply as tokens word-by-word
      const words = phaseOneReply.match(/\S+\s*/g) ?? [phaseOneReply]
      for (const word of words) {
        send({ type: 'token', token: word })
      }
      logger.info(
        {
          conversationId: convId,
          toolsCalled: [],
          latencyMs: Date.now() - start,
          replyLength: phaseOneReply.length,
        },
        'Stream chat turn completed'
      )
      send({ type: 'done', conversationId: convId, toolCalls: toolCallTrace })
      res.end()
      return
    }

    // Tool calls were made — conversation ends with role:tool messages.
    // Make a fresh streaming call so Groq generates the final answer.
    const streamResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b',
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
    // Task 6.3 — provider outages emit a friendly error event, not a crash
    const degradationReply = getDegradationReply(err)
    try {
      send({
        type: 'error',
        code: err.code ?? 'INTERNAL_ERROR',
        message: degradationReply ?? err.message ?? 'Unexpected error',
        degraded: !!degradationReply,
      })
      res.end()
    } catch {
      next(err)
    }
  }
}
