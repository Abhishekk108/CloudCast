/**
 * CloudCast agent orchestration loop.
 *
 * This is the core of the system. It implements the loop described in
 * context.md section 2.1:
 *
 *   1. Send messages + tool schemas to Groq
 *   2. If finish_reason === 'tool_calls' → execute each tool in parallel
 *   3. Append tool results as `tool` role messages
 *   4. Re-call Groq with the updated messages
 *   5. Repeat until finish_reason === 'stop' OR max iterations reached
 *   6. Return the final text reply + a full toolCalls trace
 *
 * The loop cap (MAX_TOOL_ITERATIONS) prevents runaway cycles caused by a
 * misbehaving model that never returns a final answer.
 *
 * Nothing in this file knows about HTTP — it takes plain messages in and
 * returns a plain result object. The chat controller owns request/response.
 */

import { chatCompletion } from '../services/groqClient.js'
import { executeTool } from '../tools/index.js'
import { TOOL_SCHEMAS } from './toolSchemas.js'
import { logger } from '../utils/logger.js'

// Maximum number of LLM → tool → LLM round-trips per user turn.
// 5 is generous — most questions need 1–2 tool calls.
export const MAX_TOOL_ITERATIONS = Number(process.env.AGENT_MAX_ITERATIONS) || 5

// Fallback message when the loop cap is hit (never exposes internals).
const FALLBACK_REPLY =
  "I'm having trouble reasoning through that right now — I hit my tool-call limit. " +
  'Please try rephrasing your question or ask about one city at a time.'

// ── Types (JSDoc) ─────────────────────────────────────────────────────────────

/**
 * @typedef {object} ToolCallRecord
 * @property {string} tool      Tool name
 * @property {object} args      Arguments the LLM passed
 * @property {object} result    Normalised result from execute()
 * @property {string} [error]   Error message if the tool call failed
 */

/**
 * @typedef {object} AgentResult
 * @property {string}           reply        Final natural-language answer
 * @property {ToolCallRecord[]} toolCalls    Ordered trace of every tool call made
 * @property {object|null}      usage        Token usage from the final LLM call
 * @property {boolean}          cappedOut    True if the loop hit MAX_TOOL_ITERATIONS
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the assistant message object from a Groq completion response.
 * @param {object} completion  Raw Groq response
 */
function extractMessage(completion) {
  return completion?.choices?.[0]?.message ?? null
}

/**
 * Extract finish_reason from a Groq completion response.
 * @param {object} completion
 */
function finishReason(completion) {
  return completion?.choices?.[0]?.finish_reason ?? null
}

/**
 * Execute all tool_calls from an assistant message in parallel.
 * Returns an array of { toolMessage, record } pairs.
 *
 * Tool errors are caught and surfaced as error records rather than thrown —
 * the agent loop can then pass the error back to the LLM to handle gracefully.
 *
 * @param {object[]} toolCalls  From message.tool_calls
 * @returns {Promise<Array<{ toolMessage: object, record: ToolCallRecord }>>}
 */
async function runToolCalls(toolCalls) {
  return Promise.all(
    toolCalls.map(async (tc) => {
      const name = tc.function.name
      let args = {}
      try {
        args = JSON.parse(tc.function.arguments)
      } catch {
        // malformed JSON from the LLM — treat as empty args, let Zod catch it
      }

      let result = null
      let errorMsg = null

      try {
        result = await executeTool(name, args)
        logger.debug({ tool: name, args }, 'Tool call succeeded')
      } catch (err) {
        errorMsg = err?.message ?? 'Tool execution failed'
        logger.warn({ tool: name, args, error: errorMsg }, 'Tool call failed')
      }

      // The `tool` role message Groq expects back
      const toolMessage = {
        role: 'tool',
        tool_call_id: tc.id,
        content: errorMsg
          ? JSON.stringify({ error: errorMsg })
          : JSON.stringify(result),
      }

      /** @type {ToolCallRecord} */
      const record = {
        tool: name,
        args,
        result: result ?? null,
        ...(errorMsg && { error: errorMsg }),
      }

      return { toolMessage, record }
    })
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run the agent loop for a single user turn.
 *
 * @param {object}   options
 * @param {object[]} options.messages      Full messages array (system + history + user)
 *                                         — use buildMessages() from systemPrompt.js
 * @param {string}   [options.model]       Override the Groq model
 * @param {number}   [options.temperature] Override temperature (default 0.4)
 * @param {number}   [options.maxTokens]   Override max_tokens (default 1024)
 * @returns {Promise<AgentResult>}
 */
export async function runAgent({ messages, model, temperature, maxTokens }) {
  // Working copy of the conversation — we append tool results to this each round
  const conversation = [...messages]

  /** @type {ToolCallRecord[]} */
  const toolCallTrace = []

  let lastUsage = null
  let iteration = 0

  for (; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    logger.debug({ iteration, messageCount: conversation.length }, 'Agent loop iteration')

    // ── Call Groq ────────────────────────────────────────────────────────────
    const completion = await chatCompletion({
      messages: conversation,
      tools: TOOL_SCHEMAS,
      tool_choice: 'auto',
      ...(model && { model }),
      ...(temperature !== undefined && { temperature }),
      ...(maxTokens !== undefined && { max_tokens: maxTokens }),
    })

    const message = extractMessage(completion)
    const reason = finishReason(completion)
    lastUsage = completion?.usage ?? null

    // ── Final text answer ────────────────────────────────────────────────────
    if (reason === 'stop' || !message?.tool_calls?.length) {
      return {
        reply: message?.content ?? '',
        toolCalls: toolCallTrace,
        usage: lastUsage,
        cappedOut: false,
      }
    }

    // ── Tool calls requested ─────────────────────────────────────────────────
    // Append the assistant's tool-call message to the conversation first
    conversation.push(message)

    const callResults = await runToolCalls(message.tool_calls)

    // Append tool result messages and build the trace
    for (const { toolMessage, record } of callResults) {
      conversation.push(toolMessage)
      toolCallTrace.push(record)
    }

    logger.info(
      { iteration, toolsCalled: callResults.map((c) => c.record.tool) },
      'Tool calls resolved — continuing loop'
    )
  }

  // ── Loop cap hit ─────────────────────────────────────────────────────────
  logger.warn(
    { maxIterations: MAX_TOOL_ITERATIONS, toolsCalled: toolCallTrace.map((t) => t.tool) },
    'Agent loop hit max iterations — returning fallback'
  )

  return {
    reply: FALLBACK_REPLY,
    toolCalls: toolCallTrace,
    usage: lastUsage,
    cappedOut: true,
  }
}
