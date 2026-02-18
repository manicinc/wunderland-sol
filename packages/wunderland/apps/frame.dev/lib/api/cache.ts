/**
 * API Response Caching
 * 
 * Two-tier caching system:
 * 1. HTTP caching via ETag headers (browser/CDN)
 * 2. In-memory LRU cache for database queries
 * 
 * @module lib/api/cache
 */

import { LRUCache } from 'lru-cache'
import { createHash } from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export interface CacheOptions {
  /** Time to live in milliseconds (default: 5 minutes) */
  ttl?: number
  /** Maximum items in cache (default: 500) */
  maxItems?: number
}

export interface CacheStats {
  hits: number
  misses: number
  size: number
  maxSize: number
  hitRate: string
}

export interface CacheEntry<T = unknown> {
  data: T
  cachedAt: number
  ttl: number
}

// ============================================================================
// LRU CACHE INSTANCE
// ============================================================================

// Default cache configuration
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
const DEFAULT_MAX_ITEMS = 500

// Main cache instance
const cache = new LRUCache<string, CacheEntry>({
  max: DEFAULT_MAX_ITEMS,
  ttl: DEFAULT_TTL,
  allowStale: false,
  updateAgeOnGet: true,
  updateAgeOnHas: false,
})

// Cache statistics
let cacheHits = 0
let cacheMisses = 0

// ============================================================================
// CACHE KEY GENERATION
// ============================================================================

/**
 * Generate a cache key from request parameters
 */
export function generateCacheKey(
  prefix: string,
  params: Record<string, unknown> = {}
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      const value = params[key]
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value
      }
      return acc
    }, {} as Record<string, unknown>)

  const paramsStr = JSON.stringify(sortedParams)
  const hash = createHash('sha256').update(paramsStr).digest('hex').slice(0, 16)
  
  return `${prefix}:${hash}`
}

/**
 * Generate a cache key for a specific entity
 */
export function entityCacheKey(type: string, id: string): string {
  return `${type}:${id}`
}

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Get item from cache
 */
export function getFromCache<T>(key: string): T | undefined {
  const entry = cache.get(key)
  
  if (entry) {
    cacheHits++
    return entry.data as T
  }
  
  cacheMisses++
  return undefined
}

/**
 * Set item in cache
 */
export function setInCache<T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL
): void {
  const entry: CacheEntry<T> = {
    data,
    cachedAt: Date.now(),
    ttl,
  }
  
  cache.set(key, entry, { ttl })
}

/**
 * Check if key exists in cache
 */
export function hasInCache(key: string): boolean {
  return cache.has(key)
}

/**
 * Delete item from cache
 */
export function deleteFromCache(key: string): boolean {
  return cache.delete(key)
}

/**
 * Delete all items matching a prefix
 */
export function invalidateByPrefix(prefix: string): number {
  let count = 0
  
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
      count++
    }
  }
  
  return count
}

/**
 * Clear entire cache
 */
export function clearCache(): void {
  cache.clear()
  cacheHits = 0
  cacheMisses = 0
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  const total = cacheHits + cacheMisses
  const hitRate = total > 0 ? ((cacheHits / total) * 100).toFixed(2) : '0.00'
  
  return {
    hits: cacheHits,
    misses: cacheMisses,
    size: cache.size,
    maxSize: DEFAULT_MAX_ITEMS,
    hitRate: `${hitRate}%`,
  }
}

// ============================================================================
// CACHE WRAPPER UTILITIES
// ============================================================================

/**
 * Wrapper to cache async function results
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  // Check cache first
  const cached = getFromCache<T>(key)
  if (cached !== undefined) {
    return cached
  }
  
  // Execute function and cache result
  const result = await fn()
  setInCache(key, result, ttl)
  
  return result
}

/**
 * Decorator-style cache wrapper for route handlers
 */
export function cached<T>(
  keyGenerator: (...args: unknown[]) => string,
  ttl: number = DEFAULT_TTL
) {
  return function (fn: (...args: unknown[]) => Promise<T>) {
    return async function (...args: unknown[]): Promise<T> {
      const key = keyGenerator(...args)
      return withCache(key, () => fn(...args), ttl)
    }
  }
}

// ============================================================================
// CACHE TTL PRESETS
// ============================================================================

export const CacheTTL = {
  /** Very short cache for frequently changing data (30 seconds) */
  SHORT: 30 * 1000,
  /** Default cache duration (5 minutes) */
  MEDIUM: 5 * 60 * 1000,
  /** Longer cache for stable data (30 minutes) */
  LONG: 30 * 60 * 1000,
  /** Extended cache for rarely changing data (2 hours) */
  EXTENDED: 2 * 60 * 60 * 1000,
  /** Cache until invalidated (24 hours max) */
  PERSISTENT: 24 * 60 * 60 * 1000,
} as const

// ============================================================================
// CACHE PREFIXES
// ============================================================================

export const CachePrefix = {
  WEAVES: 'weaves',
  LOOMS: 'looms', 
  STRANDS: 'strands',
  SEARCH: 'search',
  PROFILE: 'profile',
  STATS: 'stats',
  SYSTEM: 'system',
} as const

// ============================================================================
// HTTP CACHE HELPERS
// ============================================================================

/**
 * Generate Cache-Control header value
 */
export function getCacheControlHeader(
  maxAge: number,
  options: {
    public?: boolean
    private?: boolean
    noStore?: boolean
    mustRevalidate?: boolean
    staleWhileRevalidate?: number
  } = {}
): string {
  const directives: string[] = []
  
  if (options.noStore) {
    return 'no-store, no-cache, must-revalidate'
  }
  
  if (options.public) {
    directives.push('public')
  } else if (options.private) {
    directives.push('private')
  }
  
  directives.push(`max-age=${Math.floor(maxAge / 1000)}`)
  
  if (options.mustRevalidate) {
    directives.push('must-revalidate')
  }
  
  if (options.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${Math.floor(options.staleWhileRevalidate / 1000)}`)
  }
  
  return directives.join(', ')
}

/**
 * HTTP cache presets for different content types
 */
export const HttpCachePresets = {
  /** No caching for dynamic/sensitive data */
  NO_CACHE: getCacheControlHeader(0, { noStore: true }),
  
  /** Short cache for search results (1 minute) */
  SEARCH: getCacheControlHeader(60 * 1000, { 
    private: true, 
    mustRevalidate: true 
  }),
  
  /** Medium cache for content lists (5 minutes) */
  LIST: getCacheControlHeader(5 * 60 * 1000, { 
    private: true, 
    staleWhileRevalidate: 60 * 1000 
  }),
  
  /** Long cache for individual content items (30 minutes) */
  CONTENT: getCacheControlHeader(30 * 60 * 1000, { 
    private: true, 
    staleWhileRevalidate: 5 * 60 * 1000 
  }),
  
  /** Extended cache for static system info (1 hour) */
  STATIC: getCacheControlHeader(60 * 60 * 1000, { 
    public: true, 
    staleWhileRevalidate: 10 * 60 * 1000 
  }),
} as const









