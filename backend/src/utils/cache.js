/**
 * Simple in-memory TTL cache.
 *
 * Keys are arbitrary strings. Values are stored with an expiry timestamp;
 * stale entries are evicted lazily on read and periodically via a background
 * sweep so the Map doesn't grow unbounded in long-running processes.
 *
 * This is intentionally minimal — no persistence, no LRU eviction. A Redis
 * client can be dropped in here later by swapping the implementation behind
 * the same get/set/del interface.
 *
 * Usage:
 *   import { weatherCache } from './cache.js'
 *   const cached = weatherCache.get('current:Pune')
 *   if (!cached) {
 *     const data = await fetchFromApi()
 *     weatherCache.set('current:Pune', data)
 *   }
 */

export class TtlCache {
  /**
   * @param {object} options
   * @param {number} options.ttlMs      Default TTL in milliseconds
   * @param {number} [options.sweepMs]  How often to run the eviction sweep (default: ttlMs)
   */
  constructor({ ttlMs, sweepMs }) {
    this._ttlMs = ttlMs
    this._store = new Map() // key → { value, expiresAt }

    // Periodic sweep — prevents unbounded Map growth under high key churn.
    // unref() so the timer doesn't keep the Node process alive.
    this._sweepTimer = setInterval(() => this._sweep(), sweepMs ?? ttlMs)
    this._sweepTimer.unref()
  }

  /**
   * Retrieve a cached value, or undefined if missing / expired.
   * @param {string} key
   * @returns {unknown|undefined}
   */
  get(key) {
    const entry = this._store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key)
      return undefined
    }
    return entry.value
  }

  /**
   * Store a value with the default TTL (or a custom one).
   * @param {string}  key
   * @param {unknown} value
   * @param {number}  [ttlMs]  Override the instance-level TTL for this entry
   */
  set(key, value, ttlMs) {
    this._store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this._ttlMs),
    })
  }

  /**
   * Remove a single entry.
   * @param {string} key
   */
  del(key) {
    this._store.delete(key)
  }

  /** Remove all entries. Useful in tests. */
  clear() {
    this._store.clear()
  }

  /** Number of live (non-expired) entries. */
  get size() {
    this._sweep()
    return this._store.size
  }

  /** Stop the background sweep timer. Call in tests to avoid open handles. */
  destroy() {
    clearInterval(this._sweepTimer)
  }

  /** Evict all expired entries. */
  _sweep() {
    const now = Date.now()
    for (const [key, entry] of this._store) {
      if (now > entry.expiresAt) this._store.delete(key)
    }
  }
}

// ── Singleton used by the weather client ─────────────────────────────────────
// TTL is driven by env; default 600 s (10 min). We read process.env directly
// here because this module may be imported before env.js has validated (e.g.
// during test setup). The weather client will always have env available by the
// time it calls set/get.

const DEFAULT_TTL_MS = (Number(process.env.WEATHER_CACHE_TTL_SECONDS) || 600) * 1000

export const weatherCache = new TtlCache({
  ttlMs: DEFAULT_TTL_MS,
  sweepMs: DEFAULT_TTL_MS * 2,
})
