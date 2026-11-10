// ---------------------------------------------------------------------------
// queryCache.js — client-side caching for API queries to reduce server load
// and achieve instant responses for repeated visits.
// ---------------------------------------------------------------------------

const CACHE_PREFIX = 'gun_api_cache_'
const memoryCache = new Map()

/**
 * Retrieve cached query data if still valid (not expired).
 * @param {string} key
 * @returns {any|null}
 */
export const getQueryCache = (key) => {
  const cacheKey = `${CACHE_PREFIX}${key}`
  const now = Date.now()

  // 1. Try memory cache first
  if (memoryCache.has(cacheKey)) {
    const entry = memoryCache.get(cacheKey)
    if (entry.expiresAt > now) {
      return entry.data
    }
    memoryCache.delete(cacheKey)
  }

  // 2. Try sessionStorage fallback
  try {
    const raw = sessionStorage.getItem(cacheKey)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (entry.expiresAt > now) {
      memoryCache.set(cacheKey, entry)
      return entry.data
    }
    sessionStorage.removeItem(cacheKey)
  } catch {
    return null
  }

  return null
}

/**
 * Store data in query cache with a time-to-live in seconds.
 * @param {string} key
 * @param {any} data
 * @param {number} ttlSeconds - defaults to 300s (5 minutes)
 */
export const setQueryCache = (key, data, ttlSeconds = 300) => {
  const cacheKey = `${CACHE_PREFIX}${key}`
  const expiresAt = Date.now() + ttlSeconds * 1000
  const entry = { data, expiresAt }

  memoryCache.set(cacheKey, entry)
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(entry))
  } catch {
    /* quota exceeded — ignore */
  }
}

/**
 * Invalidate all cached queries or matching prefix.
 * @param {string} [prefix]
 */
export const invalidateQueryCache = (prefix = '') => {
  const targetPrefix = `${CACHE_PREFIX}${prefix}`

  // Clear memory cache entries
  for (const k of memoryCache.keys()) {
    if (k.startsWith(targetPrefix)) {
      memoryCache.delete(k)
    }
  }

  // Clear storage entries
  try {
    const keysToRemove = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith(targetPrefix)) {
        keysToRemove.push(k)
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
