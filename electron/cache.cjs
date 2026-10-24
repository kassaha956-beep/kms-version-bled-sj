/**
 * cache.cjs - Lightweight in-process TTL cache for Electron main process.
 * Avoids re-running heavy SQLite queries on every IPC call.
 *
 * Usage:
 *   const { appCache } = require('./cache.cjs');
 *   const cached = appCache.get('myKey');
 *   if (!cached) {
 *     const data = expensiveQuery();
 *     appCache.set('myKey', data, 60_000); // TTL in ms
 *   }
 */

class TtlCache {
  constructor() {
    /** @type {Map<string, { value: any; expiresAt: number }>} */
    this._store = new Map();
  }

  /**
   * Get a cached value, or undefined if missing / expired.
   * @param {string} key
   * @returns {any | undefined}
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Store a value with a TTL.
   * @param {string} key
   * @param {any} value
   * @param {number} ttlMs - milliseconds until expiry (default 30 s)
   */
  set(key, value, ttlMs = 30_000) {
    this._store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /**
   * Remove one specific key.
   * @param {string} key
   */
  del(key) {
    this._store.delete(key);
  }

  /**
   * Remove all keys whose name starts with the given prefix.
   * Useful to bust all product-related keys at once.
   * @param {string} prefix
   */
  delByPrefix(prefix) {
    for (const k of this._store.keys()) {
      if (k.startsWith(prefix)) this._store.delete(k);
    }
  }

  /**
   * Wipe the entire cache (e.g., after a full data restore).
   */
  flush() {
    this._store.clear();
    console.log('[Cache] Full cache flushed');
  }

  /** Number of live entries currently in cache. */
  get size() {
    const now = Date.now();
    let count = 0;
    for (const entry of this._store.values()) {
      if (now <= entry.expiresAt) count++;
    }
    return count;
  }
}

// Singleton shared across the whole main process
const appCache = new TtlCache();

// ─── TTL constants (in milliseconds) ──────────────────────────────────────────
const TTL = {
  PRODUCTS_ALL:   5 * 60_000,   //  5 min  – product catalogue (changes rarely)
  PRODUCTS_POS:   5 * 60_000,   //  5 min  – full product list for POS scanner
  CATEGORIES:    10 * 60_000,   // 10 min  – categories change very rarely
  CLIENTS_LIST:   2 * 60_000,   //  2 min  – client list used in POS dropdown
  FOURNISSEURS:   5 * 60_000,   //  5 min  – supplier list
  CLIENTS_STATS:  1 * 60_000,   //  1 min  – client dashboard stats
  DASHBOARD:      1 * 60_000,   //  1 min  – dashboard KPIs
  CAISSES:        2 * 60_000,   //  2 min  – caisse list
};

// ─── Cache key helpers ─────────────────────────────────────────────────────────
/** Build a deterministic cache key from any filters object. */
function cacheKey(prefix, filters = {}) {
  return prefix + ':' + JSON.stringify(filters);
}

module.exports = { appCache, TTL, cacheKey };
