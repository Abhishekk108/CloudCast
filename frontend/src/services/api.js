/**
 * Fetch wrapper for backend API calls.
 * All /api/* requests proxy to the backend via Vite (dev) or env var (prod).
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * POST /api/chat — full JSON response
 * @param {{ message: string, conversationId?: string, history?: object[] }} payload
 * @returns {Promise<{ reply: string, toolCalls: object[], conversationId: string, usage: object }>}
 */
export async function postChat(payload) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  if (!res.ok) {
    const err = new Error(data?.error?.message ?? 'Request failed')
    err.code = data?.error?.code ?? 'UNKNOWN_ERROR'
    err.status = res.status
    throw err
  }

  return data
}
