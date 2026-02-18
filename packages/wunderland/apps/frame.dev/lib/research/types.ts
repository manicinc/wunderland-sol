/**
 * Research/SERP Types
 * @module lib/research/types
 *
 * Type definitions for web search and research functionality.
 */

// ============================================================================
// SEARCH RESULT TYPES
// ============================================================================

/**
 * A single web search result
 */
export interface WebSearchResult {
  /** Unique identifier */
  id: string
  /** Result title */
  title: string
  /** Result URL */
  url: string
  /** Result snippet/description */
  snippet: string
  /** Source domain */
  domain: string
  /** Optional thumbnail URL */
  thumbnail?: string
  /** Optional published date */
  publishedDate?: string
  /** Optional favicon URL */
  favicon?: string
  /** Result position in search results */
  position: number
  /** Source API that provided this result */
  source: SearchProvider
  /** Optional authors (for academic sources) */
  authors?: string[]
}

/**
 * Rich answer/knowledge panel from search
 */
export interface KnowledgePanel {
  /** Panel title */
  title: string
  /** Panel description/summary */
  description: string
  /** Optional image URL */
  image?: string
  /** Optional source URL */
  url?: string
  /** Key facts */
  facts?: Array<{ label: string; value: string }>
}

/**
 * Related search suggestions
 */
export interface RelatedSearch {
  query: string
  url?: string
}

/**
 * Complete search response
 */
export interface WebSearchResponse {
  /** Search query */
  query: string
  /** Search results */
  results: WebSearchResult[]
  /** Optional knowledge panel */
  knowledgePanel?: KnowledgePanel
  /** Related searches */
  relatedSearches: RelatedSearch[]
  /** Total estimated results */
  totalResults?: number
  /** Search latency in ms */
  latency: number
  /** Source API used */
  source: SearchProvider
  /** Whether results are from cache */
  fromCache: boolean
  /** Error message if search partially failed */
  error?: string
}

// ============================================================================
// PROVIDER TYPES
// ============================================================================

/**
 * Available search providers
 *
 * Free providers (no API key required):
 * - duckduckgo: DuckDuckGo Instant Answers API (limited, no web results)
 * - searxng: Self-hosted SearXNG instances
 *
 * BYOK providers (require API key):
 * - brave: Brave Search API (generous free tier)
 * - serper: Serper.dev Google SERP API
 * - serpapi: SerpAPI Google Search Results API
 * - searchapi: SearchAPI.io
 * - google-cse: Google Custom Search Engine
 */
export type SearchProvider =
  | 'duckduckgo'
  | 'searxng'
  | 'brave'
  | 'serper'
  | 'serpapi'
  | 'searchapi'
  | 'google-cse'
  | 'semanticscholar'
  | 'none' // Used when all providers fail

/**
 * Provider configuration
 */
export interface SearchProviderConfig {
  /** Provider identifier */
  id: SearchProvider
  /** Display name */
  name: string
  /** Whether API key is required */
  requiresKey: boolean
  /** Base URL (can be overridden) */
  baseUrl: string
  /** Description */
  description: string
  /** Rate limit info */
  rateLimit?: string
  /** Free tier info */
  freeTier?: string
}

/**
 * Search options
 */
export interface SearchOptions {
  /** Maximum results to return */
  maxResults?: number
  /** Safe search setting */
  safeSearch?: 'off' | 'moderate' | 'strict'
  /** Country code for localization */
  country?: string
  /** Language code */
  language?: string
  /** Time range filter */
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all'
  /** Preferred provider (uses fallback chain if unavailable) */
  preferredProvider?: SearchProvider
  /** Skip cache */
  skipCache?: boolean
  /** Custom SearXNG instance URL */
  searxngUrl?: string
  /** AbortSignal for cancellation */
  signal?: AbortSignal
}

// ============================================================================
// RESEARCH SESSION TYPES
// ============================================================================

/**
 * A research session tracks multiple searches on a topic
 */
export interface ResearchSession {
  /** Session ID */
  id: string
  /** Session topic/title */
  topic: string
  /** All queries made */
  queries: string[]
  /** Saved/bookmarked results */
  savedResults: WebSearchResult[]
  /** Notes */
  notes: string
  /** Created timestamp */
  createdAt: number
  /** Last updated timestamp */
  updatedAt: number
  /** User-defined tags for categorization */
  tags?: string[]
  /** IDs of linked/related sessions */
  linkedSessions?: string[]
  /** Parent session ID (for branched sessions) */
  parentSessionId?: string
  /** Primary query for this session (first or most representative) */
  query: string
}

/**
 * Session link relationship type
 */
export type SessionLinkType = 'related' | 'continuation' | 'subtopic' | 'merged'

/**
 * A link between two research sessions
 */
export interface SessionLink {
  /** Link ID */
  id: string
  /** Source session ID */
  sourceSessionId: string
  /** Target session ID */
  targetSessionId: string
  /** Type of relationship */
  linkType: SessionLinkType
  /** Optional description of the relationship */
  description?: string
  /** Created timestamp */
  createdAt: number
}

// ============================================================================
// PROVIDER INFO
// ============================================================================

/**
 * Available search providers with their configurations
 */
export const SEARCH_PROVIDERS: Record<SearchProvider, SearchProviderConfig> = {
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    requiresKey: false,
    baseUrl: 'https://api.duckduckgo.com',
    description: 'Instant Answers API (limited web results)',
    rateLimit: 'Respectful usage',
    freeTier: 'Free, no signup',
  },
  searxng: {
    id: 'searxng',
    name: 'SearXNG',
    requiresKey: false,
    baseUrl: 'https://searx.be', // Public instance fallback
    description: 'Meta-search engine (self-hosted or public)',
    rateLimit: 'Varies by instance',
    freeTier: 'Free, self-hostable',
  },
  brave: {
    id: 'brave',
    name: 'Brave Search',
    requiresKey: true,
    baseUrl: 'https://api.search.brave.com/res/v1',
    description: 'Privacy-focused search with AI summaries',
    rateLimit: '1 req/sec',
    freeTier: '2,000 queries/month free',
  },
  serper: {
    id: 'serper',
    name: 'Serper.dev',
    requiresKey: true,
    baseUrl: 'https://google.serper.dev',
    description: 'Google SERP API',
    rateLimit: '50 req/sec',
    freeTier: '2,500 queries free',
  },
  serpapi: {
    id: 'serpapi',
    name: 'SerpAPI',
    requiresKey: true,
    baseUrl: 'https://serpapi.com/search',
    description: 'Google Search Results API with rich data',
    rateLimit: '100 req/month free',
    freeTier: '100 searches/month free',
  },
  searchapi: {
    id: 'searchapi',
    name: 'SearchAPI',
    requiresKey: true,
    baseUrl: 'https://www.searchapi.io/api/v1',
    description: 'Multi-engine search API',
    rateLimit: 'Based on plan',
    freeTier: '100 queries/month free',
  },
  'google-cse': {
    id: 'google-cse',
    name: 'Google Custom Search',
    requiresKey: true,
    baseUrl: 'https://www.googleapis.com/customsearch/v1',
    description: 'Official Google Custom Search',
    rateLimit: '100 req/day free',
    freeTier: '100 queries/day free',
  },
  semanticscholar: {
    id: 'semanticscholar',
    name: 'Semantic Scholar',
    requiresKey: false,
    baseUrl: 'https://api.semanticscholar.org/graph/v1',
    description: 'Academic paper search and citations',
    rateLimit: '100 req/5min',
    freeTier: 'Free, no signup required',
  },
  none: {
    id: 'none',
    name: 'None',
    requiresKey: false,
    baseUrl: '',
    description: 'No search provider available',
    rateLimit: 'N/A',
    freeTier: 'N/A',
  },
}
