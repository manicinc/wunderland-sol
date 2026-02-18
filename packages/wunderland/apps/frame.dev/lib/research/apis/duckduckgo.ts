/**
 * DuckDuckGo Instant Answer API
 * @module lib/research/apis/duckduckgo
 *
 * Free API for instant answers and definitions.
 * Note: Does not provide traditional web search results.
 *
 * API Docs: https://api.duckduckgo.com/api
 */

import type { WebSearchResult, WebSearchResponse, KnowledgePanel, RelatedSearch } from '../types'

const DDG_API_URL = 'https://api.duckduckgo.com'

interface DDGResponse {
  Abstract?: string
  AbstractText?: string
  AbstractSource?: string
  AbstractURL?: string
  Image?: string
  Heading?: string
  Answer?: string
  AnswerType?: string
  Definition?: string
  DefinitionSource?: string
  DefinitionURL?: string
  RelatedTopics?: Array<{
    FirstURL?: string
    Text?: string
    Icon?: { URL?: string }
    Topics?: Array<{
      FirstURL?: string
      Text?: string
      Icon?: { URL?: string }
    }>
  }>
  Results?: Array<{
    FirstURL: string
    Text: string
    Icon?: { URL?: string }
  }>
  Infobox?: {
    content?: Array<{
      data_type: string
      label: string
      value: string
    }>
  }
}

/**
 * Search DuckDuckGo Instant Answer API
 *
 * Note: This API returns instant answers, not traditional search results.
 * For web results, use other providers.
 */
export async function searchDuckDuckGo(
  query: string,
  options: { signal?: AbortSignal } = {}
): Promise<WebSearchResponse> {
  const startTime = performance.now()

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      no_redirect: '1',
      no_html: '1',
      skip_disambig: '1',
    })

    const response = await fetch(`${DDG_API_URL}/?${params}`, {
      signal: options.signal,
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status}`)
    }

    const data: DDGResponse = await response.json()
    const latency = Math.round(performance.now() - startTime)

    const results: WebSearchResult[] = []
    const relatedSearches: RelatedSearch[] = []

    // Build knowledge panel from abstract
    let knowledgePanel: KnowledgePanel | undefined
    if (data.Abstract || data.Answer || data.Definition) {
      knowledgePanel = {
        title: data.Heading || query,
        description: data.AbstractText || data.Answer || data.Definition || '',
        image: data.Image ? (data.Image.startsWith('http') ? data.Image : `https://duckduckgo.com${data.Image}`) : undefined,
        url: data.AbstractURL || data.DefinitionURL,
        facts: data.Infobox?.content?.map(item => ({
          label: item.label,
          value: item.value,
        })),
      }
    }

    // Convert direct results
    if (data.Results) {
      data.Results.forEach((result, index) => {
        if (result.FirstURL && result.Text) {
          const url = new URL(result.FirstURL)
          results.push({
            id: `ddg-${index}`,
            title: result.Text.split(' - ')[0] || result.Text,
            url: result.FirstURL,
            snippet: result.Text,
            domain: url.hostname,
            position: index + 1,
            source: 'duckduckgo',
            favicon: result.Icon?.URL,
          })
        }
      })
    }

    // Convert related topics to results and related searches
    if (data.RelatedTopics) {
      data.RelatedTopics.forEach((topic, index) => {
        if (topic.FirstURL && topic.Text) {
          const url = new URL(topic.FirstURL)
          results.push({
            id: `ddg-related-${index}`,
            title: topic.Text.split(' - ')[0] || topic.Text,
            url: topic.FirstURL,
            snippet: topic.Text,
            domain: url.hostname,
            position: results.length + 1,
            source: 'duckduckgo',
            favicon: topic.Icon?.URL,
          })
        }

        // Nested topics become related searches
        if (topic.Topics) {
          topic.Topics.forEach(subtopic => {
            if (subtopic.Text) {
              relatedSearches.push({
                query: subtopic.Text.split(' - ')[0] || subtopic.Text,
                url: subtopic.FirstURL,
              })
            }
          })
        }
      })
    }

    return {
      query,
      results: results.slice(0, 10),
      knowledgePanel,
      relatedSearches: relatedSearches.slice(0, 8),
      latency,
      source: 'duckduckgo',
      fromCache: false,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    throw new Error(`DuckDuckGo search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
