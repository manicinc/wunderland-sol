/**
 * SearXNG Web Search API
 * @module lib/research/apis/searxng
 *
 * Uses public SearXNG instances for free web search.
 * SearXNG is a privacy-respecting metasearch engine.
 *
 * Unlike the DuckDuckGo Instant Answer API, this actually
 * returns web search results.
 */

import type { WebSearchResult, WebSearchResponse, SearchOptions } from '../types'

// Public SearXNG instances - rotated for reliability
const SEARXNG_INSTANCES = [
  'https://search.sapti.me',
  'https://searx.be',
  'https://search.ononoki.org',
  'https://searx.tiekoetter.com',
  'https://search.bus-hit.me',
]

// Cache the working instance
let workingInstance: string | null = null
let instanceLastChecked = 0
const INSTANCE_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

interface SearXNGResult {
  url: string
  title: string
  content?: string
  engine?: string
  parsed_url?: string[]
  template?: string
  engines?: string[]
  positions?: number[]
  publishedDate?: string
  thumbnail?: string
  img_src?: string
  score?: number
}

interface SearXNGResponse {
  query: string
  results: SearXNGResult[]
  suggestions?: string[]
  answers?: string[]
  infoboxes?: Array<{
    infobox: string
    id: string
    content?: string
    img_src?: string
    urls?: Array<{ title: string; url: string }>
  }>
  number_of_results?: number
}

/**
 * Find a working SearXNG instance
 */
async function findWorkingInstance(signal?: AbortSignal): Promise<string | null> {
  // Return cached instance if still valid
  if (workingInstance && Date.now() - instanceLastChecked < INSTANCE_CHECK_INTERVAL) {
    return workingInstance
  }

  // Try each instance
  for (const instance of SEARXNG_INSTANCES) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const response = await fetch(`${instance}/search?q=test&format=json`, {
        signal: signal ?? controller.signal,
        headers: { 'Accept': 'application/json' },
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        workingInstance = instance
        instanceLastChecked = Date.now()
        return instance
      }
    } catch {
      // Try next instance
      continue
    }
  }

  return null
}

/**
 * Search using SearXNG
 *
 * Returns actual web search results from multiple search engines.
 */
export async function searchSearXNG(
  query: string,
  options: SearchOptions = {}
): Promise<WebSearchResponse> {
  const startTime = performance.now()

  // Find a working instance
  const instance = await findWorkingInstance(options.signal)

  if (!instance) {
    // CORS is the most common reason instances fail in browser
    console.warn('[searxng] All instances blocked - likely CORS on static deployment')
    throw new Error('Web search unavailable on static sites. SearXNG instances block browser requests (CORS). Consider adding a Brave or Serper API key in settings for reliable search.')
  }

  try {
    // Build search URL
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      categories: 'general',
      language: 'en',
      time_range: options.timeRange === 'day' ? 'day' :
                  options.timeRange === 'week' ? 'week' :
                  options.timeRange === 'month' ? 'month' :
                  options.timeRange === 'year' ? 'year' : '',
      safesearch: '0',
    })

    // Remove empty params
    Array.from(params.entries()).forEach(([key, value]) => {
      if (!value) params.delete(key)
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(`${instance}/search?${params}`, {
      signal: options.signal ?? controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Quarry Research/1.0',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      // Mark instance as failed
      workingInstance = null
      throw new Error(`SearXNG error: ${response.status}`)
    }

    const data: SearXNGResponse = await response.json()
    const latency = Math.round(performance.now() - startTime)

    // Convert results
    const maxResults = options.maxResults || 10
    const results: WebSearchResult[] = data.results
      .slice(0, maxResults)
      .map((result, index) => {
        let domain = ''
        try {
          domain = new URL(result.url).hostname
        } catch {
          domain = result.url.split('/')[2] || ''
        }

        return {
          id: `searxng-${index}-${Date.now()}`,
          title: result.title || '',
          url: result.url,
          snippet: result.content || '',
          domain,
          position: index + 1,
          source: 'searxng' as const,
          publishedDate: result.publishedDate,
          thumbnail: result.thumbnail || result.img_src,
        }
      })
      .filter(r => r.title && r.url)

    return {
      query,
      results,
      relatedSearches: (data.suggestions || []).map(s => ({ query: s })),
      latency,
      source: 'searxng',
      fromCache: false,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }

    // Mark instance as failed so we try another next time
    workingInstance = null

    throw new Error(`SearXNG search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check if SearXNG is available
 */
export async function isSearXNGAvailable(): Promise<boolean> {
  try {
    const instance = await findWorkingInstance()
    return instance !== null
  } catch {
    return false
  }
}
