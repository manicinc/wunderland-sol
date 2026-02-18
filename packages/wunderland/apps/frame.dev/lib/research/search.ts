/**
 * Unified Web Search
 * @module lib/research/search
 *
 * Unified search interface with provider fallback chain.
 * Uses free providers by default, with BYOK for premium.
 */

import type { WebSearchResponse, SearchOptions, SearchProvider } from './types'
import { searchDuckDuckGo } from './apis/duckduckgo'
import { searchBrave } from './apis/brave'
import { searchSerper } from './apis/serper'
import { searchSerpAPI } from './apis/serpapi'
import { searchSearXNG } from './apis/searxng'
import { searchPapers, s2PaperToSearchResult } from './semanticScholar'
// Note: getAPIKey could be used for future provider integrations
// import { getAPIKey, type APIProvider } from '@/lib/config/apiKeyStorage'

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry {
  response: WebSearchResponse
  timestamp: number
}

const searchCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCacheKey(query: string, options: SearchOptions): string {
  return `${query}|${options.maxResults || 10}|${options.timeRange || 'all'}|${options.preferredProvider || 'auto'}`
}

function getFromCache(key: string): WebSearchResponse | null {
  const entry = searchCache.get(key)
  if (!entry) return null

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    searchCache.delete(key)
    return null
  }

  return { ...entry.response, fromCache: true }
}

function setCache(key: string, response: WebSearchResponse): void {
  // Limit cache size
  if (searchCache.size > 50) {
    const oldestKey = searchCache.keys().next().value
    if (oldestKey) searchCache.delete(oldestKey)
  }
  searchCache.set(key, { response, timestamp: Date.now() })
}

// ============================================================================
// PROVIDER KEY MAPPING
// ============================================================================

// Note: Future expansion - map search providers to API key storage
// const PROVIDER_TO_API_KEY: Partial<Record<SearchProvider, APIProvider>> = {}

/**
 * Get API key for a search provider
 */
async function getSearchProviderKey(provider: SearchProvider): Promise<string | null> {
  // For now, check localStorage directly for search-specific keys
  if (typeof window === 'undefined') return null

  try {
    const key = localStorage.getItem(`quarry-search-${provider}-key`)
    return key
  } catch {
    return null
  }
}

/**
 * Save API key for a search provider
 */
export async function saveSearchProviderKey(provider: SearchProvider, key: string): Promise<void> {
  if (typeof window === 'undefined') return
  localStorage.setItem(`quarry-search-${provider}-key`, key)
  window.dispatchEvent(new CustomEvent('search-keys-changed', { detail: { provider } }))
}

/**
 * Remove API key for a search provider
 */
export async function removeSearchProviderKey(provider: SearchProvider): Promise<void> {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`quarry-search-${provider}-key`)
  window.dispatchEvent(new CustomEvent('search-keys-changed', { detail: { provider } }))
}

/**
 * Check which search providers are configured
 */
export async function getConfiguredSearchProviders(): Promise<SearchProvider[]> {
  const configured: SearchProvider[] = ['searxng'] // Free web search via SearXNG

  if (await getSearchProviderKey('brave')) configured.push('brave')
  if (await getSearchProviderKey('serper')) configured.push('serper')
  if (await getSearchProviderKey('serpapi')) configured.push('serpapi')

  // DuckDuckGo is available but only for instant answers, not web results
  configured.push('duckduckgo')

  return configured
}

// ============================================================================
// ACADEMIC SEARCH DETECTION
// ============================================================================

/**
 * Detect if query is targeting academic sources
 * Returns the cleaned query and the academic source type
 */
function detectAcademicQuery(query: string): { isAcademic: boolean; cleanQuery: string; source?: string } {
  // const lowerQuery = query.toLowerCase() // Could be used for keyword detection

  // Check for site: filters targeting academic sources
  const academicSitePatterns = [
    { pattern: /site:arxiv\.org\s*/gi, source: 'arxiv' },
    { pattern: /site:scholar\.google\.com\s*/gi, source: 'scholar' },
    { pattern: /site:semanticscholar\.org\s*/gi, source: 'semanticscholar' },
    { pattern: /site:pubmed\.ncbi\.nlm\.nih\.gov\s*/gi, source: 'pubmed' },
    { pattern: /site:biorxiv\.org\s*/gi, source: 'biorxiv' },
    { pattern: /site:medrxiv\.org\s*/gi, source: 'medrxiv' },
  ]

  for (const { pattern, source } of academicSitePatterns) {
    if (pattern.test(query)) {
      // Reset lastIndex since we're using 'g' flag
      pattern.lastIndex = 0
      const cleanQuery = query.replace(pattern, '').trim()
      return { isAcademic: true, cleanQuery, source }
    }
  }

  return { isAcademic: false, cleanQuery: query }
}

/**
 * Search academic papers using Semantic Scholar
 */
async function searchAcademic(
  query: string,
  options: SearchOptions = {}
): Promise<WebSearchResponse> {
  const startTime = performance.now()
  const maxResults = options.maxResults || 10

  try {
    const papers = await searchPapers(query, {
      limit: maxResults,
      signal: options.signal
    })

    const results = papers.map((paper, index) => s2PaperToSearchResult(paper, index + 1))
    const latency = Math.round(performance.now() - startTime)

    return {
      query,
      results,
      relatedSearches: [],
      latency,
      source: 'semanticscholar',
      fromCache: false,
    }
  } catch (error) {
    throw new Error(`Academic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// ============================================================================
// UNIFIED SEARCH
// ============================================================================

/**
 * Create a timeout wrapper for search operations
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(errorMessage))
    }, timeoutMs)

    promise
      .then(result => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch(error => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

/**
 * Perform web search with automatic provider fallback
 *
 * Priority:
 * 1. Academic sources (Semantic Scholar) if site:arxiv.org etc detected
 * 2. User's preferred provider (if configured)
 * 3. Brave (if API key set)
 * 4. Serper (if API key set)
 * 5. SerpAPI (if API key set)
 * 6. SearXNG (free web search via public instances)
 * 7. DuckDuckGo (instant answers only - limited usefulness)
 */
export async function webSearch(
  query: string,
  options: SearchOptions = {}
): Promise<WebSearchResponse> {
  const SEARCH_TIMEOUT = 15000 // 15 second timeout

  // Check for academic site filters first
  const { isAcademic, cleanQuery } = detectAcademicQuery(query)

  if (isAcademic && cleanQuery) {
    const cacheKey = getCacheKey(query, options)

    // Check cache
    if (!options.skipCache) {
      const cached = getFromCache(cacheKey)
      if (cached) return cached
    }

    try {
      const response = await withTimeout(
        searchAcademic(cleanQuery, options),
        SEARCH_TIMEOUT,
        'Academic search timed out'
      )
      setCache(cacheKey, response)
      return response
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.warn(`[webSearch] Academic search failed:`, errorMsg)

      // Check if it's a CORS error (common on static deployments)
      const isCorsError = errorMsg.includes('CORS') || errorMsg.includes('blocked')

      // Return a helpful message instead of falling back silently
      return {
        query,
        results: [],
        relatedSearches: [],
        latency: 0,
        source: 'semanticscholar',
        fromCache: false,
        error: isCorsError
          ? 'Academic paper search requires a server deployment. On static sites (GitHub Pages), direct arXiv/paper search is blocked by browser security (CORS). Try searching without "site:arxiv.org" to use general web search.'
          : `Academic search failed: ${errorMsg}`,
      }
    }
  }

  const cacheKey = getCacheKey(query, options)

  // Check cache first
  if (!options.skipCache) {
    const cached = getFromCache(cacheKey)
    if (cached) return cached
  }

  const errors: string[] = []

  // Build provider priority list
  const providerOrder: SearchProvider[] = []

  if (options.preferredProvider) {
    providerOrder.push(options.preferredProvider)
  }

  // Add configured BYOK providers
  const braveKey = await getSearchProviderKey('brave')
  const serperKey = await getSearchProviderKey('serper')
  const serpApiKey = await getSearchProviderKey('serpapi')

  if (braveKey && !providerOrder.includes('brave')) {
    providerOrder.push('brave')
  }
  if (serperKey && !providerOrder.includes('serper')) {
    providerOrder.push('serper')
  }
  if (serpApiKey && !providerOrder.includes('serpapi')) {
    providerOrder.push('serpapi')
  }

  // Add free providers as fallback
  // SearXNG provides actual web results, DuckDuckGo only provides instant answers
  if (!providerOrder.includes('searxng')) {
    providerOrder.push('searxng')
  }
  if (!providerOrder.includes('duckduckgo')) {
    providerOrder.push('duckduckgo')
  }

  // Try providers in order
  for (const provider of providerOrder) {
    try {
      let response: WebSearchResponse

      switch (provider) {
        case 'brave': {
          const key = await getSearchProviderKey('brave')
          if (!key) {
            errors.push('Brave: No API key configured')
            continue
          }
          response = await withTimeout(
            searchBrave(query, key, options),
            SEARCH_TIMEOUT,
            'Brave search timed out'
          )
          break
        }

        case 'serper': {
          const key = await getSearchProviderKey('serper')
          if (!key) {
            errors.push('Serper: No API key configured')
            continue
          }
          response = await withTimeout(
            searchSerper(query, key, options),
            SEARCH_TIMEOUT,
            'Serper search timed out'
          )
          break
        }

        case 'serpapi': {
          const key = await getSearchProviderKey('serpapi')
          if (!key) {
            errors.push('SerpAPI: No API key configured')
            continue
          }
          response = await withTimeout(
            searchSerpAPI(query, key, options),
            SEARCH_TIMEOUT,
            'SerpAPI search timed out'
          )
          break
        }

        case 'searxng':
          response = await withTimeout(
            searchSearXNG(query, options),
            SEARCH_TIMEOUT,
            'SearXNG search timed out'
          )
          break

        case 'duckduckgo':
          response = await withTimeout(
            searchDuckDuckGo(query, { signal: options.signal }),
            SEARCH_TIMEOUT,
            'DuckDuckGo search timed out'
          )
          break

        default:
          continue
      }

      // Only cache if we got actual results (or knowledge panel for DDG)
      if (response.results.length > 0 || response.knowledgePanel) {
        setCache(cacheKey, response)
        return response
      } else {
        // No results from this provider, try next
        errors.push(`${provider}: No results found`)
        continue
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`${provider}: ${message}`)
      console.warn(`[webSearch] ${provider} failed:`, message)
    }
  }

  // All providers failed or returned no results
  // Return empty response instead of throwing, so UI can show "no results"
  console.warn(`[webSearch] All providers failed or returned no results:\n${errors.join('\n')}`)
  return {
    query,
    results: [],
    relatedSearches: [],
    latency: 0,
    source: 'none',
    fromCache: false,
    error: errors.length > 0 ? `Search providers unavailable: ${errors[0]}` : undefined,
  }
}

/**
 * Quick search - returns minimal results for autocomplete/suggestions
 */
export async function quickSearch(
  query: string,
  options: Omit<SearchOptions, 'maxResults'> = {}
): Promise<WebSearchResponse> {
  return webSearch(query, { ...options, maxResults: 5 })
}

/**
 * Deep search - returns comprehensive results
 */
export async function deepSearch(
  query: string,
  options: Omit<SearchOptions, 'maxResults'> = {}
): Promise<WebSearchResponse> {
  return webSearch(query, { ...options, maxResults: 20 })
}

// ============================================================================
// EXPORTS
// ============================================================================

export { searchDuckDuckGo } from './apis/duckduckgo'
export { searchBrave } from './apis/brave'
export { searchSerper } from './apis/serper'
export { searchSerpAPI } from './apis/serpapi'
export { searchSearXNG, isSearXNGAvailable } from './apis/searxng'
export * from './types'
