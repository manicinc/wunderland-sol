/**
 * Serper.dev API (Google SERP)
 * @module lib/research/apis/serper
 *
 * Google Search results via Serper.dev API.
 * Requires API key from https://serper.dev/
 *
 * Free tier: 2,500 queries (one-time)
 */

import type { WebSearchResult, WebSearchResponse, KnowledgePanel, RelatedSearch, SearchOptions } from '../types'

const SERPER_API_URL = 'https://google.serper.dev/search'

interface SerperOrganicResult {
  title: string
  link: string
  snippet: string
  date?: string
  position: number
  sitelinks?: Array<{ title: string; link: string }>
}

interface SerperKnowledgeGraph {
  title?: string
  type?: string
  description?: string
  imageUrl?: string
  website?: string
  attributes?: Record<string, string>
}

interface SerperResponse {
  searchParameters?: {
    q?: string
  }
  organic?: SerperOrganicResult[]
  knowledgeGraph?: SerperKnowledgeGraph
  relatedSearches?: Array<{ query: string }>
  peopleAlsoAsk?: Array<{ question: string; snippet: string; link: string }>
}

/**
 * Search using Serper.dev API
 */
export async function searchSerper(
  query: string,
  apiKey: string,
  options: SearchOptions & { signal?: AbortSignal } = {}
): Promise<WebSearchResponse> {
  const startTime = performance.now()

  try {
    const body: Record<string, string | number | boolean> = {
      q: query,
      num: options.maxResults || 10,
    }

    if (options.country) {
      body.gl = options.country.toLowerCase()
    }

    if (options.language) {
      body.hl = options.language.toLowerCase()
    }

    if (options.timeRange && options.timeRange !== 'all') {
      // Serper uses tbs parameter
      const tbs = {
        day: 'qdr:d',
        week: 'qdr:w',
        month: 'qdr:m',
        year: 'qdr:y',
      }[options.timeRange]
      if (tbs) {
        body.tbs = tbs
      }
    }

    const response = await fetch(SERPER_API_URL, {
      method: 'POST',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid Serper API key')
      }
      if (response.status === 429) {
        throw new Error('Serper API rate limit exceeded')
      }
      throw new Error(`Serper API error: ${response.status}`)
    }

    const data: SerperResponse = await response.json()
    const latency = Math.round(performance.now() - startTime)

    const results: WebSearchResult[] = []

    // Convert organic results
    if (data.organic) {
      data.organic.forEach((result, index) => {
        const url = new URL(result.link)
        results.push({
          id: `serper-${index}`,
          title: result.title,
          url: result.link,
          snippet: result.snippet,
          domain: url.hostname,
          publishedDate: result.date,
          favicon: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`,
          position: result.position || index + 1,
          source: 'serper',
        })
      })
    }

    // Build knowledge panel
    let knowledgePanel: KnowledgePanel | undefined
    if (data.knowledgeGraph) {
      const kg = data.knowledgeGraph
      const facts: Array<{ label: string; value: string }> = []
      if (kg.attributes) {
        Object.entries(kg.attributes).forEach(([label, value]) => {
          facts.push({ label, value })
        })
      }

      knowledgePanel = {
        title: kg.title || query,
        description: kg.description || '',
        image: kg.imageUrl,
        url: kg.website,
        facts: facts.length > 0 ? facts : undefined,
      }
    }

    // Related searches
    const relatedSearches: RelatedSearch[] = (data.relatedSearches || []).map(r => ({
      query: r.query,
    }))

    // Add "People Also Ask" as related searches
    if (data.peopleAlsoAsk) {
      data.peopleAlsoAsk.forEach(paa => {
        relatedSearches.push({ query: paa.question })
      })
    }

    return {
      query,
      results,
      knowledgePanel,
      relatedSearches: relatedSearches.slice(0, 10),
      latency,
      source: 'serper',
      fromCache: false,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    throw new Error(`Serper search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
