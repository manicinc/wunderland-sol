# Research & Web Search Guide

> Technical documentation for the Quarry Codex research module.

## Overview

The research module (`lib/research/`) provides web search capabilities with multiple provider support, academic paper detection, research session management, and Semantic Scholar integration for paper recommendations.

## Architecture

```
lib/research/
├── index.ts          # Module exports
├── types.ts          # Type definitions
├── search.ts         # Unified search with provider fallback
├── academicDetector.ts # Academic paper URL detection
├── sessions.ts       # IndexedDB session persistence
├── useResearchSessions.ts # React hook for sessions
├── semanticScholar.ts # Semantic Scholar API client
├── preferences.ts    # User preferences storage
├── useResearchPreferences.ts # React hook for preferences
├── citationFormatter.ts # Citation style formatting
└── apis/
    ├── duckduckgo.ts # DuckDuckGo provider (instant answers only)
    ├── brave.ts      # Brave Search provider (BYOK)
    ├── serper.ts     # Serper.dev provider (BYOK)
    └── searxng.ts    # SearXNG metasearch (free, no API key)
```

## Search Providers

### Available Providers

| Provider | API Key | Rate Limit | Free Tier | Notes |
|----------|---------|------------|-----------|-------|
| **SearXNG** | No | Instance-dependent | Always free | Primary free provider - actual web results |
| **Semantic Scholar** | No | 100 req/5min | Always free | Academic papers, auto-used for arxiv queries |
| DuckDuckGo | No | Respectful usage | Free | Instant answers only, limited web results |
| Brave Search | Yes (BYOK) | 1 req/sec | 2,000 queries/month | High-quality results with summaries |
| Serper.dev | Yes (BYOK) | 50 req/sec | 2,500 queries | Google SERP results |
| SearchAPI | Yes (BYOK) | Plan-based | 100 queries/month | Multi-engine |
| Google CSE | Yes (BYOK) | 100 req/day | 100 queries/day | Official Google |

> **Note:** SearXNG and Semantic Scholar work out-of-the-box without any API keys. For enhanced web search results, consider adding a Brave or Serper API key.

### SearXNG (Recommended Free Provider)

SearXNG is a privacy-focused metasearch engine that aggregates results from multiple sources. The integration uses public instances with automatic rotation for reliability.

**Public Instances Used:**
- search.sapti.me
- searx.be
- search.ononoki.org
- searx.tiekoetter.com
- search.bus-hit.me

```typescript
import { searchSearXNG, isSearXNGAvailable } from '@/lib/research'

// Check if SearXNG is available
const available = await isSearXNGAvailable()

// Direct SearXNG search
const results = await searchSearXNG('machine learning', { maxResults: 10 })
```

### Provider Configuration

API keys are stored in localStorage with keys following the pattern:
```
quarry-search-{provider}-key
```

#### Setting a Provider Key

```typescript
import { saveSearchProviderKey } from '@/lib/research'

await saveSearchProviderKey('brave', 'your-api-key')
await saveSearchProviderKey('serper', 'your-api-key')
```

#### Checking Configured Providers

```typescript
import { getConfiguredSearchProviders } from '@/lib/research'

const providers = await getConfiguredSearchProviders()
// Returns: ['duckduckgo', 'brave'] (always includes duckduckgo)
```

#### Removing a Provider Key

```typescript
import { removeSearchProviderKey } from '@/lib/research'

await removeSearchProviderKey('brave')
```

### Provider Fallback Chain

When performing a search, providers are tried in this order:
1. **Academic sources** (Semantic Scholar) - if query contains `site:arxiv.org` etc.
2. User's preferred provider (if specified in options)
3. Brave Search (if API key configured)
4. Serper.dev (if API key configured)
5. **SearXNG** (free, returns actual web results)
6. DuckDuckGo (instant answers only - limited fallback)

If a provider fails or returns no results, the next provider is tried automatically. All providers have a **15-second timeout** to prevent hanging.

### Error Handling

The search system gracefully handles failures:
- Each provider is wrapped in a timeout (15 seconds)
- Failed providers are logged and skipped
- Empty responses include an `error` field with details
- The UI shows helpful tips when all providers fail

```typescript
const response = await webSearch('query')

if (response.error) {
  // Partial failure - check response.error for details
  console.warn(response.error)
}

if (response.results.length === 0 && response.source === 'none') {
  // All providers failed
}
```

## Unified Search API

### Basic Search

```typescript
import { webSearch } from '@/lib/research'

const response = await webSearch('machine learning papers')
console.log(response.results) // WebSearchResult[]
console.log(response.source)  // Provider that returned results
console.log(response.fromCache) // Whether cached
```

### Search Options

```typescript
interface SearchOptions {
  maxResults?: number           // Default: 10
  safeSearch?: 'off' | 'moderate' | 'strict'
  country?: string             // Country code (e.g., 'US')
  language?: string            // Language code (e.g., 'en')
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all'
  preferredProvider?: SearchProvider
  skipCache?: boolean          // Bypass 5-minute cache
  signal?: AbortSignal         // For cancellation
}
```

### Quick and Deep Search

```typescript
import { quickSearch, deepSearch } from '@/lib/research'

// Quick search returns 5 results (for autocomplete)
const quick = await quickSearch('react hooks')

// Deep search returns 20 results
const deep = await deepSearch('react hooks')
```

### Direct Provider Access

```typescript
import {
  searchDuckDuckGo,
  searchBrave,
  searchSerper,
  searchSearXNG
} from '@/lib/research'

// Use specific providers directly
const searxng = await searchSearXNG('query', { maxResults: 10 }) // Free, no key needed
const ddg = await searchDuckDuckGo('query') // Instant answers only
const brave = await searchBrave('query', 'api-key', { maxResults: 10 })
const serper = await searchSerper('query', 'api-key', { maxResults: 10 })
```

### Search Response Format

```typescript
interface WebSearchResponse {
  query: string
  results: WebSearchResult[]
  knowledgePanel?: KnowledgePanel
  relatedSearches: RelatedSearch[]
  totalResults?: number
  latency: number              // Response time in ms
  source: SearchProvider       // 'searxng', 'brave', 'serper', 'duckduckgo', 'none'
  fromCache: boolean
  error?: string               // Error message if search partially failed
}

interface WebSearchResult {
  id: string
  title: string
  url: string
  snippet: string
  domain: string
  thumbnail?: string
  publishedDate?: string
  favicon?: string
  position: number
  source: SearchProvider
}
```

### Caching

Search results are cached in-memory for 5 minutes. Cache key is based on:
- Query string
- maxResults option
- timeRange option
- preferredProvider option

To bypass cache:
```typescript
const response = await webSearch('query', { skipCache: true })
```

## Academic Paper Detection

The academic detector identifies papers from search results and extracts citation identifiers.

### Supported Academic Domains

- arxiv.org
- doi.org
- pubmed.ncbi.nlm.nih.gov
- semanticscholar.org
- jstor.org
- springer.com
- nature.com
- science.org
- sciencedirect.com
- wiley.com
- ieee.org
- acm.org
- plos.org
- biorxiv.org
- medrxiv.org
- openreview.net
- neurips.cc
- proceedings.mlr.press

### Detection API

```typescript
import {
  isAcademicUrl,
  isAcademicResult,
  extractCitationId,
  getCitationInput,
  enrichWithAcademicInfo,
} from '@/lib/research'

// Check if URL is academic
isAcademicUrl('https://arxiv.org/abs/2301.00001') // true

// Check if search result is academic
isAcademicResult(result) // boolean

// Extract citation identifier
extractCitationId('https://arxiv.org/abs/2301.00001')
// { type: 'arxiv', id: '2301.00001' }

extractCitationId('https://doi.org/10.1234/example')
// { type: 'doi', id: '10.1234/example' }

extractCitationId('https://pubmed.ncbi.nlm.nih.gov/12345678')
// { type: 'pmid', id: '12345678' }

// Get citation-ready input for CitationInput component
getCitationInput(result) // '2301.00001' or '10.1234/example'

// Enrich results with academic metadata
const enriched = enrichWithAcademicInfo(results)
// Each result now has: isAcademic, citationId properties
```

## Research Sessions

Research sessions persist searches and saved results in IndexedDB for cross-session continuity.

### Session Data Model

```typescript
interface ResearchSession {
  id: string              // Unique ID (session_timestamp_random)
  topic: string           // Session topic/title
  queries: string[]       // All queries made in session
  savedResults: WebSearchResult[]  // Bookmarked results
  notes: string           // Free-form notes
  createdAt: number       // Unix timestamp
  updatedAt: number       // Unix timestamp
}
```

### Session Management API

```typescript
import {
  createSession,
  getSession,
  getAllSessions,
  getRecentSessions,
  updateSession,
  deleteSession,
  searchSessions,
  addQueryToSession,
  addResultToSession,
  removeResultFromSession,
  updateSessionNotes,
  clearAllSessions,
} from '@/lib/research/sessions'

// Create a new session
const session = await createSession('Machine Learning Research')

// Get all sessions (sorted by updatedAt, newest first)
const sessions = await getAllSessions()

// Get recent sessions with limit
const recent = await getRecentSessions(10)

// Update session
await updateSession(session.id, { topic: 'Deep Learning Research' })

// Add a query to session history
await addQueryToSession(session.id, 'neural networks')

// Save a result to session
await addResultToSession(session.id, searchResult)

// Remove a saved result
await removeResultFromSession(session.id, resultId)

// Update notes
await updateSessionNotes(session.id, 'Important findings...')

// Search sessions by topic or query
const matching = await searchSessions('learning')

// Delete a session
await deleteSession(session.id)
```

### React Hook

```typescript
import { useResearchSessions } from '@/lib/research'

function MyComponent() {
  const {
    sessions,           // All sessions
    activeSession,      // Currently active session
    loading,            // Loading state
    error,              // Error state
    create,             // Create new session
    activate,           // Set active session
    update,             // Update session
    remove,             // Delete session
    addQuery,           // Add query to active session
    saveResult,         // Save result to active session
    unsaveResult,       // Remove result from active session
  } = useResearchSessions()

  const handleSearch = async (query: string) => {
    await addQuery(query)
    // ... perform search
  }

  const handleSave = async (result: WebSearchResult) => {
    await saveResult(result)
  }
}
```

## Semantic Scholar Integration

The Semantic Scholar client provides paper lookup, search, recommendations, and citation graph traversal.

### Rate Limits

- 100 requests per 5 minutes (free API)
- Rate limit errors return null, not exceptions

### Paper Lookup

```typescript
import {
  getPaperByDOI,
  getPaperByArXiv,
  getPaperById,
  searchPapers,
} from '@/lib/research'

// Lookup by identifier
const paper1 = await getPaperByDOI('10.1234/example')
const paper2 = await getPaperByArXiv('2301.00001')
const paper3 = await getPaperById('abc123def456...')

// Search papers
const papers = await searchPapers('transformer attention', { limit: 10 })
```

### Paper Recommendations

```typescript
import { getRecommendations, getCitations, getReferences } from '@/lib/research'

// Get recommendations based on saved papers
const recommendations = await getRecommendations(
  ['paperId1', 'paperId2'],
  { limit: 10 }
)

// Get papers that cite this paper
const citations = await getCitations('paperId', { limit: 10 })

// Get papers referenced by this paper
const references = await getReferences('paperId', { limit: 10 })
```

### S2 Paper Type

```typescript
interface S2Paper {
  paperId: string
  title: string
  abstract: string | null
  year: number | null
  authors: S2Author[]
  venue: string | null
  url: string
  citationCount: number
  influentialCitationCount: number
  isOpenAccess: boolean
  openAccessPdf?: { url: string } | null
  fieldsOfStudy: string[] | null
  externalIds: {
    DOI?: string
    ArXiv?: string
    PubMed?: string
    DBLP?: string
    MAG?: string
    CorpusId?: number
  } | null
}
```

### Conversion Helpers

```typescript
import {
  s2PaperToSearchResult,
  extractS2PaperId,
  resolveToPaperId,
} from '@/lib/research'

// Convert S2 paper to WebSearchResult format
const result = s2PaperToSearchResult(paper, 0)

// Extract paper ID from S2 URL
const paperId = extractS2PaperId(
  'https://www.semanticscholar.org/paper/Title/abc123...'
)

// Resolve any identifier to S2 paper ID
const paperId = await resolveToPaperId({ type: 'doi', id: '10.1234/example' })
const paperId = await resolveToPaperId({ type: 'arxiv', id: '2301.00001' })
const paperId = await resolveToPaperId({ type: 'pmid', id: '12345678' })
```

## UI Components

### Text Context Menu (Double-Click)

Double-clicking on any word in the editor shows a context menu with:

| Action | Description | Query Format |
|--------|-------------|--------------|
| **Research** | Web search for selected text | `{text}` |
| **Define** | Look up definition | `define: {text}` |
| **Thesaurus** | Find synonyms | `synonyms for: {text}` |
| **Highlight** | Save as highlight with color | (saves to highlights) |

The menu appears above the selected text and provides quick access to research without keyboard shortcuts.

### InlineFloatingToolbar

When selecting text in block-level editors, a floating toolbar appears with formatting options plus:

- **Globe icon** - Research selected text (same as `Cmd+Shift+R`)
- **Tag icon** - Add block tag (same as `Cmd+T`)

The research button extracts the selected text and opens the ResearchPanel with it pre-filled.

### ResearchPanel

The main research interface, accessible via `Cmd+Shift+R` in the editor.

Features:
- Search input with provider selection
- Results display with academic paper badges
- Save results to active session
- Quick citation import for academic papers
- Session switching
- Provider status indicators in header (colored badges)

### ResearchWidget (Dashboard)

A dashboard widget for quick research access:

```typescript
// Available in dashboard widget registry
import { ResearchWidget } from '@/components/quarry/dashboard/widgets'
```

Features:
- Search input with Enter-to-search
- Recent sessions list (last 3)
- Query count per session
- Quick link to full research page
- Compact mode for smaller layouts

Widget configuration:
- ID: `'research'`
- Default size: 4×3 grid units
- Minimum size: 3×2 grid units

### Research Page

Located at `/quarry/research`, provides:
- Session creation and management
- Recent sessions list
- Quick access to Search, Browse, and Learn
- Pro tips for power users

## Settings

### Research Settings UI

Access via **Settings > Research** to configure search providers and preferences.

#### Search Provider API Keys

Configure BYOK (Bring Your Own Key) providers with helpful documentation:
- **Brave Search** - [Get API key](https://brave.com/search/api/) - 2,000 free queries/month
- **Serper.dev** - [Get API key](https://serper.dev/) - 2,500 free queries

Each provider card shows:
- Provider description and free tier info
- Info tooltip with detailed explanation
- "Get your free API key" link when editing
- Configuration status badge

#### Free Providers Section

Displays providers that work automatically without API keys:
- **SearXNG** - Metasearch via public instances (primary free provider)
- **Semantic Scholar** - Academic paper search

#### Other Settings

| Setting | Description |
|---------|-------------|
| Default Citation Style | APA, MLA, Chicago, etc. |
| Auto-Enrich Academic Papers | Fetch metadata from Semantic Scholar |
| Search Cache Duration | How long to cache results |

#### Privacy Notice

- API keys are stored only in browser localStorage
- Search requests go directly to providers (never via our servers)

Provider status is shown in the ResearchPanel header with colored badges indicating which providers are configured.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+R` | Open Research Panel |
| `Cmd+Shift+C` | Add Citation |

## Testing

Run tests with:
```bash
pnpm test:unit
```

Test files:
- `__tests__/unit/research/academicDetector.test.ts` - URL detection, citation ID extraction
- `__tests__/unit/research/search.test.ts` - Provider fallback, caching, key management
- `__tests__/unit/research/searxng.test.ts` - SearXNG provider, instance rotation
- `__tests__/unit/research/semanticScholar.test.ts` - API client, recommendations
- `__tests__/unit/research/sessions.test.ts` - CRUD, queries, results, search
- `__tests__/unit/research/textContextMenu.test.ts` - Query building, position calculation
- `__tests__/unit/research/InlineFloatingToolbar.test.tsx` - Research button, editor events
- `__tests__/unit/research/ResearchWidget.test.tsx` - Widget rendering, navigation

## IndexedDB Schema

Database: `quarry-research`
Version: 1

### Sessions Store

Object store: `sessions`
- keyPath: `id`
- Indexes:
  - `updatedAt` (for sorting)
  - `topic` (for searching)

## Error Handling

All API functions handle errors gracefully:
- Search providers return empty results on error
- Semantic Scholar functions return null on error
- AbortError is re-thrown for proper cancellation handling
- Rate limits are logged but don't throw exceptions

## Events

### search-keys-changed

Dispatched when search provider keys are added or removed:
```typescript
window.addEventListener('search-keys-changed', (e) => {
  console.log('Provider changed:', e.detail.provider)
})
```

## Migration Notes

### From previous versions

The research module is new and has no migration requirements. IndexedDB schema will auto-upgrade on first access.

---

## Research Preferences

User preferences for research behavior are stored in localStorage.

### Preferences Storage

**File:** `lib/research/preferences.ts`
**Storage key:** `quarry-research-preferences`

### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `defaultCitationStyle` | CitationStyle | `'apa'` | Default style for citations |
| `autoEnrichEnabled` | boolean | `true` | Auto-enrich academic sources |
| `cacheDurationMs` | number | 300000 (5 min) | Search result cache duration |
| `providerPriority` | SearchProvider[] | `['brave', 'serper', 'duckduckgo']` | Provider fallback order |

### Preferences API

```typescript
import {
  getResearchPreferences,
  saveResearchPreferences,
  resetResearchPreferences,
} from '@/lib/research/preferences'

// Get current preferences
const prefs = getResearchPreferences()

// Update preferences
saveResearchPreferences({
  ...prefs,
  defaultCitationStyle: 'mla',
  autoEnrichEnabled: false,
})

// Reset to defaults
resetResearchPreferences()
```

### React Hook

```typescript
import { useResearchPreferences } from '@/lib/research/useResearchPreferences'

function MyComponent() {
  const { preferences, updatePreferences, resetPreferences } = useResearchPreferences()

  return (
    <select
      value={preferences.defaultCitationStyle}
      onChange={(e) => updatePreferences({ defaultCitationStyle: e.target.value })}
    >
      <option value="apa">APA</option>
      <option value="mla">MLA</option>
      <option value="chicago">Chicago</option>
    </select>
  )
}
```

### Events

```typescript
// Listen for preference changes
window.addEventListener('research-preferences-changed', (e) => {
  console.log('Preferences updated')
})
```

---

## Session Linking & Tags

Sessions can be organized with tags and linked to related sessions.

### Extended Session Schema (v2)

```typescript
interface ResearchSession {
  // ... existing fields
  tags?: string[]           // User-defined tags
  linkedSessions?: string[] // IDs of linked sessions
  parentSessionId?: string  // Parent session (for branched)
  query: string            // Primary query
}
```

### Session Linking API

```typescript
import {
  linkSessions,
  unlinkSessions,
  getSessionLinks,
  mergeSessions,
} from '@/lib/research/sessionLinking'

// Link two sessions
await linkSessions(sourceId, targetId, 'related')
// linkType: 'related' | 'continuation' | 'subtopic' | 'merged'

// Get all links for a session
const links = await getSessionLinks(sessionId)

// Unlink sessions
await unlinkSessions(sourceId, targetId)

// Merge multiple sessions into one
const merged = await mergeSessions(['id1', 'id2', 'id3'], {
  newTopic: 'Combined Research',
  keepOriginals: false,
})
```

### Tag Management

```typescript
import {
  addTagToSession,
  removeTagFromSession,
  getAllTags,
  getSessionsByTag,
} from '@/lib/research/sessionLinking'

// Add/remove tags
await addTagToSession(sessionId, 'machine-learning')
await removeTagFromSession(sessionId, 'outdated')

// Get all unique tags with counts
const tags = await getAllTags()
// [{ tag: 'ai', count: 5 }, { tag: 'research', count: 3 }]

// Find sessions by tag
const sessions = await getSessionsByTag('machine-learning')
```

### Related Session Suggestions

```typescript
import { suggestRelatedSessions } from '@/lib/research/sessionLinking'

// Get AI-suggested related sessions
const suggestions = await suggestRelatedSessions(sessionId)
// Returns: [{ session, score, reasons: ['Shared tags: ai', 'Similar queries'] }]
```

### IndexedDB Schema (v2)

```
Database: quarry-research
Version: 2

Sessions Store:
  - Indexes: updatedAt, topic, tags (multiEntry), parentSessionId

Session Links Store:
  - Indexes: sourceSessionId, targetSessionId, createdAt
```

---

## AI Summarization

Generate AI-powered summaries from research sources with streaming support.

### Summarization Service

**File:** `lib/summarization/summarizer.ts`

```typescript
import { summarize, summarizeComplete } from '@/lib/summarization'

// Streaming summarization
for await (const progress of summarize({
  sources: [
    { url: 'https://example.com', title: 'Source 1', content: 'Article text...' },
  ],
  type: 'digest',
  length: 'standard',
})) {
  console.log(progress.status)  // 'initializing' | 'summarizing' | 'complete' | 'error'
  console.log(progress.content) // Growing summary text
  console.log(progress.progress) // 0-100
}

// Non-streaming (returns complete result)
const result = await summarizeComplete({
  sources: [...],
  type: 'key-points',
  length: 'brief',
})
```

### Summary Types

| Type | Description |
|------|-------------|
| `digest` | High-level synthesis of key information |
| `abstract` | Academic-style abstract |
| `key-points` | Bullet point extraction |
| `comparison` | Compare and contrast multiple sources |
| `executive` | Executive summary for decision makers |

### Summary Lengths

| Length | Target Words | Max Tokens |
|--------|--------------|------------|
| `brief` | 100-150 | 256 |
| `standard` | 250-350 | 512 |
| `detailed` | 500-700 | 1024 |

### Convenience Functions

```typescript
import {
  digestSources,
  extractKeyPoints,
  compareSources,
  generateAbstract,
  generateExecutiveSummary,
} from '@/lib/summarization'

// Quick digest
for await (const p of digestSources(sources)) { ... }

// Compare multiple sources
for await (const p of compareSources(sources)) { ... }
```

### Caching

Summaries are cached in IndexedDB with a 24-hour TTL.

```typescript
import {
  getCachedSummary,
  clearSummarizationCache,
  getCacheStats,
} from '@/lib/summarization/cache'

// Check cache
const cached = await getCachedSummary(cacheKey)

// Clear all cached summaries
await clearSummarizationCache()

// Get cache statistics
const stats = await getCacheStats()
// { count: 10, oldestEntry: timestamp, newestEntry: timestamp }
```

---

## Bibliography Generation

Convert research sessions to formatted bibliographies in multiple styles.

### Session to Citations

```typescript
import {
  convertSessionToCitations,
  formatBibliography,
  exportBibliography,
} from '@/lib/research/sessionToCitations'

// Convert session results to citations
const result = await convertSessionToCitations(session, {
  style: 'apa',
  autoEnrich: true, // Enrich academic sources via Semantic Scholar
})

console.log(result.citations)      // ConvertedCitation[]
console.log(result.enrichedCount)  // Number enriched with metadata
console.log(result.style)          // 'apa'
```

### Citation Styles

| Style | Format Example |
|-------|---------------|
| `apa` | Author, A. (Year). Title. Publisher. URL |
| `mla` | Author. "Title." Publisher, Year. |
| `chicago` | Author. "Title." Publisher. Accessed Date. URL |
| `harvard` | Author (Year) Title. Publisher. |
| `ieee` | [#] A. Author, "Title," Publisher, Year. |
| `vancouver` | Author. Title. Publisher; Year. |
| `ama` | Author. Title. Publisher. Year;Volume:Pages. |
| `asa` | Author. Year. "Title." Publisher. |
| `bibtex` | @misc{key, title={...}, url={...}} |

### Export Formats

```typescript
// Export as different formats
const text = exportBibliography(citations, 'apa', 'text')
const markdown = exportBibliography(citations, 'apa', 'markdown')
const html = exportBibliography(citations, 'apa', 'html')
const bibtex = exportBibliography(citations, 'apa', 'bibtex')
```

### In-Text Citations

```typescript
import { generateInTextCitation } from '@/lib/research/sessionToCitations'

const citation = generateInTextCitation(source, 'apa')
// "(Smith, 2024)"

const mlaCitation = generateInTextCitation(source, 'mla')
// "(Smith)"
```

---

## Draft Assistant

AI-powered outline and draft generation from research sessions.

### Generate Outline

```typescript
import {
  generateOutlineFromSession,
  generateOutline,
} from '@/lib/research/draftAssistant'

// Streaming outline generation
for await (const progress of generateOutlineFromSession(session, {
  outlineType: 'structured',
  depth: 'medium',
  includeCitations: true,
  focus: 'practical applications',
})) {
  console.log(progress.type)    // 'generating' | 'streaming' | 'complete' | 'error'
  console.log(progress.content) // Growing outline text
}

// Non-streaming version
const result = await generateOutline(session, {
  outlineType: 'bullet',
  depth: 'shallow',
})
console.log(result.outline)
console.log(result.provider) // 'claude' or 'openai'
```

### Outline Types

| Type | Description |
|------|-------------|
| `bullet` | Bullet-point hierarchical outline |
| `numbered` | Multi-level numbered outline (1., 1.1., 1.1.1.) |
| `structured` | Academic outline with Intro/Body/Conclusion |
| `mindmap` | Text-based mind map with tree structure |

### Outline Depths

| Depth | Description |
|-------|-------------|
| `shallow` | 3-5 main points, minimal sub-points |
| `medium` | 5-8 main points with relevant sub-points |
| `deep` | Comprehensive coverage with detailed sub-points |

---

## Research Analytics

Analytics dashboard for research activity and topic insights.

### Analytics Service

```typescript
import {
  getResearchAnalytics,
  generateTopicCloud,
} from '@/lib/analytics/researchAnalyticsService'

// Get comprehensive analytics
const analytics = await getResearchAnalytics(30) // Last 30 days

console.log(analytics.sessions.totalSessions)
console.log(analytics.sessions.periodSessions)
console.log(analytics.sessions.totalSavedResults)
console.log(analytics.searches.searchesOverTime)
console.log(analytics.sources.sourceTypeDistribution)
console.log(analytics.topics.topQueryTerms)
```

### Analytics Data Structure

```typescript
interface ResearchAnalyticsData {
  sessions: {
    totalSessions: number
    periodSessions: number
    totalSavedResults: number
    sessionsWithSavedResults: number
  }
  searches: {
    totalSearches: number
    avgSavedPerSession: number
    searchesOverTime: { date: string; count: number }[]
  }
  sources: {
    sourceTypeDistribution: { type: string; count: number; percentage: number }[]
    topDomains: { domain: string; count: number }[]
  }
  topics: {
    topQueryTerms: { term: string; count: number }[]
    queryLengthDistribution: { length: string; count: number }[]
  }
}
```

### Topic Cloud Generation

```typescript
// Generate word cloud data
const topics = await generateTopicCloud(50) // Top 50 terms
// [{ text: 'learning', value: 15 }, { text: 'neural', value: 8 }, ...]
```

---

## PDF Viewer

Store, view, and annotate PDFs with cross-linking to research.

### PDF Storage

**File:** `lib/pdf/pdfStorage.ts`
**Database:** `quarry-pdf-storage`

```typescript
import {
  storePDF,
  getPDFDocument,
  getPDFBlob,
  getAllPDFDocuments,
  deletePDFDocument,
} from '@/lib/pdf/pdfStorage'

// Store a PDF
const doc = await storePDF(file, {
  title: 'Research Paper',
  author: 'John Doe',
  researchSessionId: session.id,
})

// Get PDF metadata
const metadata = await getPDFDocument(doc.id)

// Get PDF blob for viewing
const blob = await getPDFBlob(doc.id)

// List all PDFs (sorted by last opened)
const allDocs = await getAllPDFDocuments()

// Delete PDF and all annotations
await deletePDFDocument(doc.id)
```

### Annotations

```typescript
import {
  addAnnotation,
  getDocumentAnnotations,
  getPageAnnotations,
  updateAnnotation,
  deleteAnnotation,
  getStrandLinkedAnnotations,
} from '@/lib/pdf/pdfStorage'

// Add annotation
const anno = await addAnnotation({
  documentId: doc.id,
  pageNumber: 5,
  type: 'highlight',
  position: { x: 0.1, y: 0.2, width: 0.5, height: 0.02 },
  content: 'Important finding',
  color: '#ffff00',
  linkedStrandPath: '/looms/research/strands/notes',
})

// Get all annotations for a document
const annotations = await getDocumentAnnotations(doc.id)

// Get annotations for specific page
const pageAnnotations = await getPageAnnotations(doc.id, 5)

// Find annotations linked to a strand
const linked = await getStrandLinkedAnnotations('/looms/research/strands/notes')
```

### Annotation Types

| Type | Description |
|------|-------------|
| `highlight` | Highlighted text region |
| `note` | Sticky note with text |
| `underline` | Underlined text |
| `strikethrough` | Strikethrough text |
| `freeform` | Freeform drawing |

### Bookmarks

```typescript
import {
  addBookmark,
  getDocumentBookmarks,
  deleteBookmark,
} from '@/lib/pdf/pdfStorage'

// Add bookmark
const bookmark = await addBookmark(doc.id, 10, 'Chapter 2')

// Get bookmarks (sorted by page)
const bookmarks = await getDocumentBookmarks(doc.id)

// Delete bookmark
await deleteBookmark(bookmark.id)
```

### Reading Progress

```typescript
import {
  saveReadingProgress,
  getReadingProgress,
} from '@/lib/pdf/pdfStorage'

// Save progress
await saveReadingProgress({
  documentId: doc.id,
  lastPage: 15,
  scrollPosition: 0.3,
  zoom: 1.5,
  totalReadingTime: 1200000, // ms
  lastReadAt: Date.now(),
})

// Get progress
const progress = await getReadingProgress(doc.id)
```

### Events

```typescript
import { onPDFStorageChange } from '@/lib/pdf/pdfStorage'

const unsubscribe = onPDFStorageChange((event) => {
  console.log(event.type) // 'stored' | 'updated' | 'deleted' | 'annotation-added' | etc.
  console.log(event.data)
})

// Later: unsubscribe()
```

---

## Testing

### Test Files

Unit tests for research features:

```
__tests__/unit/research/
├── academicDetector.test.ts
├── draftAssistant.test.ts
├── preferences.test.ts
├── semanticScholar.test.ts
├── sessionLinking.test.ts
├── sessionToCitations.test.ts
├── sessions.test.ts
└── textContextMenu.test.ts

__tests__/unit/summarization/
└── cache.test.ts

__tests__/unit/pdf/
└── pdfStorage.test.ts

__tests__/unit/analytics/
└── researchAnalyticsService.test.ts
```

Run tests:

```bash
pnpm test:unit
pnpm vitest run __tests__/unit/research/
```
