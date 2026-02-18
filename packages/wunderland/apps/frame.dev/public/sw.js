/**
 * Quarry Codex Service Worker
 * 
 * Provides offline functionality and caching for:
 * - Static assets (JS, CSS, fonts, images)
 * - Viewed strands (markdown content)
 * - Search index and embeddings
 * - Media files
 * 
 * Strategy:
 * - Network-first for API calls (GitHub, semantic search)
 * - Cache-first for static assets
 * - Stale-while-revalidate for markdown content
 */

const CACHE_VERSION = 'v1.1.0' // Bumped to clear stale caches
const CACHE_NAME = `quarry-codex-${CACHE_VERSION}`
const CACHE_SUPPORTED = typeof caches !== 'undefined'

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/quarry',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/frame-logo-no-subtitle.svg',
]

// Paths that should NEVER be cached (dynamic chunks change on each build)
const NO_CACHE_PATTERNS = [
  '/_next/static/chunks/',
  '/_next/static/css/',
  '/page-',
  '.js?',
]

// Cache storage limits
const MAX_CACHE_SIZE = 100 // Maximum number of cached items per cache
const MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

/**
 * Check if a URL should be excluded from caching
 */
function shouldSkipCache(url) {
  const pathname = new URL(url).pathname
  return NO_CACHE_PATTERNS.some(pattern => pathname.includes(pattern) || url.includes(pattern))
}

async function safeOpenCache(name) {
  if (!CACHE_SUPPORTED) return null
  try {
    return await caches.open(name)
  } catch (error) {
    console.warn('[SW] Unable to access CacheStorage, disabling offline caching.', error)
    return null
  }
}

async function safeMatch(request) {
  if (!CACHE_SUPPORTED) return null
  try {
    return await caches.match(request)
  } catch (error) {
    console.warn('[SW] Unable to read from CacheStorage.', error)
    return null
  }
}

async function safeKeys() {
  if (!CACHE_SUPPORTED) return []
  try {
    return await caches.keys()
  } catch (error) {
    console.warn('[SW] Unable to enumerate CacheStorage.', error)
    return []
  }
}

async function safeDelete(name) {
  if (!CACHE_SUPPORTED) return false
  try {
    return await caches.delete(name)
  } catch (error) {
    console.warn('[SW] Failed to delete cache', error)
    return false
  }
}

/**
 * Install event - precache essential assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    (async () => {
      const cache = await safeOpenCache(CACHE_NAME)
      if (!cache) return
      try {
        console.log('[SW] Precaching assets')
        await cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' })))
      } catch (error) {
        console.warn('[SW] Failed to precache assets', error)
      }
      console.log('[SW] Service worker installed')
      await self.skipWaiting()
    })()
  )
})

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    (async () => {
      const cacheNames = await safeKeys()
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return safeDelete(cacheName)
          }
          return Promise.resolve()
        })
      )
      console.log('[SW] Service worker activated')
      return self.clients.claim()
    })()
  )
})

/**
 * Fetch event - intelligent caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith('http')) {
    return
  }
  
  // Skip GitHub API requests in offline mode (will fail gracefully)
  if (url.hostname === 'api.github.com' || url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          if (response.ok && (url.pathname.endsWith('.md') || url.pathname.endsWith('.json'))) {
            const responseClone = response.clone()
            const cache = await safeOpenCache(CACHE_NAME)
            if (cache) {
              cache.put(request, responseClone)
              trimCache(CACHE_NAME, MAX_CACHE_SIZE)
            }
          }
          return response
        } catch {
          const cachedResponse = await safeMatch(request)
          if (cachedResponse) {
            console.log('[SW] Serving from cache (offline):', url.pathname)
            return cachedResponse
          }
          const offlinePage = await safeMatch('/offline.html')
          return (
            offlinePage ||
            new Response('Offline - content not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' }),
            })
          )
        }
      })()
    )
    return
  }
  
  // Skip caching for Next.js chunks - these change on every build
  if (shouldSkipCache(request.url)) {
    event.respondWith(fetch(request))
    return
  }
  
  // For local assets, use cache-first strategy
  event.respondWith(
    (async () => {
      const cachedResponse = await safeMatch(request)
      if (cachedResponse) {
        const cachedDate = new Date(cachedResponse.headers.get('date') || 0)
        const age = Date.now() - cachedDate.getTime()
        if (age < MAX_AGE) {
          return cachedResponse
        }
      }

      try {
        const response = await fetch(request)
        if (response && response.status === 200) {
          const responseClone = response.clone()
          const cache = await safeOpenCache(CACHE_NAME)
          if (cache) {
            cache.put(request, responseClone)
            trimCache(CACHE_NAME, MAX_CACHE_SIZE)
          }
        }
        return response
      } catch {
        return (
          cachedResponse ||
          new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
          })
        )
      }
    })()
  )
})

/**
 * Trim cache to maximum size
 */
async function trimCache(cacheName, maxItems) {
  const cache = await safeOpenCache(cacheName)
  if (!cache) return
  const keys = await cache.keys()
  
  if (keys.length > maxItems) {
    // Remove oldest entries
    const toDelete = keys.slice(0, keys.length - maxItems)
    await Promise.all(toDelete.map(key => cache.delete(key)))
    console.log('[SW] Trimmed cache, removed', toDelete.length, 'items')
  }
}

/**
 * Message handling for cache control
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || []
    event.waitUntil(
      (async () => {
        const cache = await safeOpenCache(CACHE_NAME)
        if (!cache) return
        await Promise.all(
          urls.map(async (url) => {
            try {
              await cache.add(url)
            } catch (err) {
              console.warn('[SW] Failed to cache:', url, err)
            }
          })
        )
      })()
    )
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      (async () => {
        try {
          const deleted = await safeDelete(CACHE_NAME)
          if (deleted) {
            console.log('[SW] Cache cleared')
          }
        } catch (error) {
          console.warn('[SW] Failed to delete cache', error)
        }
        await safeOpenCache(CACHE_NAME)
      })()
    )
  }
})

console.log('[SW] Service worker script loaded')

