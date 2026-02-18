/**
 * Brave Search API
 * @module lib/research/apis/brave
 *
 * Privacy-focused search API with generous free tier.
 * Requires API key from https://api.search.brave.com/
 *
 * Free tier: 2,000 queries/month
 */

import type { WebSearchResult, WebSearchResponse, KnowledgePanel, RelatedSearch, SearchOptions } from '../types'

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search'

interface BraveWebResult {
  title: string
  url: string
  description: string
  page_age?: string
  thumbnail?: {
    src?: string
  }
  profile?: {
    name?: string
    img?: string
  }
}

interface BraveInfobox {
  title?: string
  description?: string
  thumbnail?: { src?: string }
  url?: string
  data?: Array<{ label: string; value: string }>
}

interface BraveResponse {
  query?: {
    original?: string
  }
  web?: {
    results?: BraveWebResult[]
  }
  infobox?: BraveInfobox
  related?: Array<{ query: string }>
}

/**
 * Search using Brave Search API
 */
export async function searchBrave(
  query: string,
  apiKey: string,
  options: SearchOptions & { signal?: AbortSignal } = {}
): Promise<WebSearchResponse> {
  const startTime = performance.now()

  try {
    const params = new URLSearchParams({
      q: query,
      count: String(options.maxResults || 10),
      safesearch: options.safeSearch === 'strict' ? 'strict' : options.safeSearch === 'off' ? 'off' : 'moderate',
    })

    if (options.country) {
      params.set('country', options.country)
    }

    if (options.timeRange && options.timeRange !== 'all') {
      // Brave uses pd, pw, pm, py for day/week/month/year
      const freshness = {
        day: 'pd',
        week: 'pw',
        month: 'pm',
        year: 'py',
      }[options.timeRange]
      if (freshness) {
        params.set('freshness', freshness)
      }
    }

    const response = await fetch(`${BRAVE_API_URL}?${params}`, {
      signal: options.signal,
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Brave API key')
      }
      if (response.status === 429) {
        throw new Error('Brave API rate limit exceeded')
      }
      throw new Error(`Brave API error: ${response.status}`)
    }

    const data: BraveResponse = await response.json()
    const latency = Math.round(performance.now() - startTime)

    const results: WebSearchResult[] = []

    // Convert web results
    if (data.web?.results) {
      data.web.results.forEach((result, index) => {
        const url = new URL(result.url)
        results.push({
          id: `brave-${index}`,
          title: result.title,
          url: result.url,
          snippet: result.description,
          domain: url.hostname,
          thumbnail: result.thumbnail?.src,
          publishedDate: result.page_age,
          favicon: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`,
          position: index + 1,
          source: 'brave',
        })
      })
    }

    // Build knowledge panel from infobox
    let knowledgePanel: KnowledgePanel | undefined
    if (data.infobox) {
      knowledgePanel = {
        title: data.infobox.title || query,
        description: data.infobox.description || '',
        image: data.infobox.thumbnail?.src,
        url: data.infobox.url,
        facts: data.infobox.data?.map(item => ({
          label: item.label,
          value: item.value,
        })),
      }
    }

    // Related searches
    const relatedSearches: RelatedSearch[] = (data.related || []).map(r => ({
      query: r.query,
    }))

    return {
      query,
      results,
      knowledgePanel,
      relatedSearches,
      latency,
      source: 'brave',
      fromCache: false,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    throw new Error(`Brave search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
