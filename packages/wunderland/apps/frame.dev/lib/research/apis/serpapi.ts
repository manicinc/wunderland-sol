/**
 * SerpAPI - Google Search Results API
 * @module lib/research/apis/serpapi
 *
 * Google Search results via SerpAPI.
 * Requires API key from https://serpapi.com/
 *
 * Free tier: 100 searches/month
 */

import type { WebSearchResult, WebSearchResponse, KnowledgePanel, RelatedSearch, SearchOptions } from '../types'

const SERPAPI_BASE_URL = 'https://serpapi.com/search'

interface SerpAPIOrganicResult {
  position: number
  title: string
  link: string
  displayed_link?: string
  snippet?: string
  snippet_highlighted_words?: string[]
  date?: string
  domain?: string
  favicon?: string
  thumbnail?: string
}

interface SerpAPIKnowledgeGraph {
  title?: string
  type?: string
  description?: string
  source?: { name: string; link: string }
  thumbnail?: string
  kgmid?: string
}

interface SerpAPIRelatedQuestion {
  question: string
  snippet?: string
  link?: string
}

interface SerpAPIRelatedSearch {
  query: string
  link?: string
}

interface SerpAPIResponse {
  search_metadata: {
    id: string
    status: string
    created_at: string
    processed_at: string
    google_url: string
    total_time_taken: number
  }
  search_parameters: {
    engine: string
    q: string
    google_domain: string
    hl?: string
    gl?: string
  }
  organic_results?: SerpAPIOrganicResult[]
  knowledge_graph?: SerpAPIKnowledgeGraph
  related_questions?: SerpAPIRelatedQuestion[]
  related_searches?: SerpAPIRelatedSearch[]
  local_results?: Array<{
    title: string
    place_id: string
    address: string
  }>
  search_information?: {
    total_results?: number
    time_taken_displayed?: number
    query_displayed?: string
  }
}

/**
 * Search using SerpAPI (Google Search Results API)
 */
export async function searchSerpAPI(
  query: string,
  apiKey: string,
  options: SearchOptions & { signal?: AbortSignal } = {}
): Promise<WebSearchResponse> {
  const startTime = performance.now()

  try {
    const params = new URLSearchParams({
      q: query,
      api_key: apiKey,
      engine: 'google',
      num: String(options.maxResults || 10),
    })

    if (options.country) {
      params.set('gl', options.country.toLowerCase())
    }

    if (options.language) {
      params.set('hl', options.language.toLowerCase())
    }

    if (options.safeSearch === 'strict') {
      params.set('safe', 'active')
    } else if (options.safeSearch === 'off') {
      params.set('safe', 'off')
    }

    if (options.timeRange && options.timeRange !== 'all') {
      // SerpAPI uses tbs parameter for time filtering
      const tbs = {
        day: 'qdr:d',
        week: 'qdr:w',
        month: 'qdr:m',
        year: 'qdr:y',
      }[options.timeRange]
      if (tbs) {
        params.set('tbs', tbs)
      }
    }

    const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      signal: options.signal,
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid SerpAPI key')
      }
      if (response.status === 429) {
        throw new Error('SerpAPI rate limit exceeded')
      }
      throw new Error(`SerpAPI error: ${response.status}`)
    }

    const data: SerpAPIResponse = await response.json()
    const latency = Math.round(performance.now() - startTime)

    // Convert organic results
    const results: WebSearchResult[] = (data.organic_results || []).map((result, index) => {
      let domain = result.domain || ''
      try {
        domain = domain || new URL(result.link).hostname
      } catch {
        domain = result.displayed_link || ''
      }

      return {
        id: `serpapi-${index}`,
        title: result.title,
        url: result.link,
        snippet: result.snippet || '',
        domain,
        thumbnail: result.thumbnail,
        publishedDate: result.date,
        favicon: result.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        position: result.position || index + 1,
        source: 'serpapi' as const,
      }
    })

    // Build knowledge panel from knowledge_graph
    let knowledgePanel: KnowledgePanel | undefined
    if (data.knowledge_graph) {
      const kg = data.knowledge_graph
      knowledgePanel = {
        title: kg.title || query,
        description: kg.description || '',
        image: kg.thumbnail,
        url: kg.source?.link,
        facts: [], // SerpAPI provides structured facts we can extract if needed
      }
    }

    // Related searches (combine related_searches and related_questions)
    const relatedSearches: RelatedSearch[] = [
      ...(data.related_searches || []).map(r => ({
        query: r.query,
        url: r.link,
      })),
      ...(data.related_questions || []).map(q => ({
        query: q.question,
        url: q.link,
      })),
    ].slice(0, 10)

    return {
      query,
      results,
      knowledgePanel,
      relatedSearches,
      totalResults: data.search_information?.total_results,
      latency,
      source: 'serpapi',
      fromCache: false,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    throw new Error(`SerpAPI search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
