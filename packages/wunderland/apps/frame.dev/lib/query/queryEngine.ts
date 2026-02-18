/**
 * Query Engine
 * @module lib/query/queryEngine
 *
 * Executes queries against the SQLite database, returning formatted
 * results with facets and highlighting.
 *
 * Features:
 * - Query execution with parameterized SQL
 * - Result caching with TTL
 * - Facet computation for filtering UI
 * - Text highlighting for search matches
 * - Saved query management
 */

import { getDatabase } from '@/lib/codexDatabase'
import { parseQuery, extractTextTerms } from './queryLanguage'
import { queryToSQL } from './queryToSQL'
import { searchDynamicContent, type DynamicSearchResult } from '@/lib/indexer/dynamicDocumentIndex'
import type {
  RootQueryNode,
  QueryResult,
  SearchResult,
  StrandSearchResult,
  BlockSearchResult,
  QueryFacets,
  FacetCount,
  SavedQuery,
  QueryConfig,
} from './types'
import { DEFAULT_QUERY_CONFIG } from './types'

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry {
  result: QueryResult
  timestamp: number
}

const queryCache = new Map<string, CacheEntry>()

/**
 * Generate cache key for a query
 */
function getCacheKey(query: RootQueryNode): string {
  return JSON.stringify(query)
}

/**
 * Clear expired cache entries
 */
function clearExpiredCache(ttl: number): void {
  const now = Date.now()
  for (const [key, entry] of queryCache.entries()) {
    if (now - entry.timestamp > ttl) {
      queryCache.delete(key)
    }
  }
}

/**
 * Clear all cache entries
 */
export function clearQueryCache(): void {
  queryCache.clear()
}

// ============================================================================
// QUERY EXECUTION
// ============================================================================

/**
 * Execute a query and return results
 */
export async function executeQuery(
  query: string | RootQueryNode,
  config: Partial<QueryConfig> = {}
): Promise<QueryResult> {
  const cfg = { ...DEFAULT_QUERY_CONFIG, ...config }
  const startTime = performance.now()

  // Parse query if string
  const ast: RootQueryNode = typeof query === 'string'
    ? parseQuery(query)
    : query

  // Apply limits
  if (!ast.limit) {
    ast.limit = cfg.defaultLimit
  }
  ast.limit = Math.min(ast.limit, cfg.maxLimit)

  // Check cache
  if (cfg.enableCache) {
    clearExpiredCache(cfg.cacheTTL)
    const cacheKey = getCacheKey(ast)
    const cached = queryCache.get(cacheKey)
    if (cached) {
      return {
        ...cached.result,
        cached: true,
        executionTime: performance.now() - startTime,
      }
    }
  }

  // Generate SQL
  const generated = queryToSQL(ast)

  // Execute query
  const db = await getDatabase()
  if (!db) {
    throw new Error('Database not initialized')
  }
  const rows = await db.all(generated.sql, generated.params)

  // Get total count (reuse params but remove limit/offset)
  const countParams = generated.params.slice(0, -2) // Remove limit and offset
  const countResult = await db.get<{ total: number }>(generated.countSql!, countParams)
  const total = countResult?.total || 0

  // Extract text terms for highlighting
  const textTerms = extractTextTerms(ast)

  // Format results
  const results: SearchResult[] = generated.isBlockQuery
    ? rows.map((row: any) => formatBlockResult(row, textTerms, cfg))
    : rows.map((row: any) => formatStrandResult(row, textTerms, cfg))

  // Compute facets
  let facets: QueryFacets | undefined
  if (cfg.enableFacets) {
    facets = await computeFacets(generated.isBlockQuery, ast)
  }

  const executionTime = performance.now() - startTime

  const result: QueryResult = {
    results,
    total,
    executionTime,
    query: ast,
    facets,
  }

  // Cache result
  if (cfg.enableCache) {
    const cacheKey = getCacheKey(ast)
    queryCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    })
  }

  return result
}

/**
 * Execute a raw SQL query (for advanced use cases)
 */
export async function executeRawQuery(
  sql: string,
  params: unknown[] = []
): Promise<any[]> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not initialized')
  return db.all(sql, params)
}

// ============================================================================
// RESULT FORMATTING
// ============================================================================

/**
 * Format a strand database row as a search result
 */
function formatStrandResult(
  row: any,
  textTerms: string[],
  config: QueryConfig
): StrandSearchResult {
  const result: StrandSearchResult = {
    type: 'strand',
    id: row.id,
    path: row.path,
    title: row.title || '',
    summary: row.summary,
    content: row.content || '',
    weave: row.weave,
    loom: row.loom,
    tags: parseJSONArray(row.tags),
    subjects: parseJSONArray(row.subjects),
    topics: parseJSONArray(row.topics),
    difficulty: row.difficulty,
    wordCount: row.word_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    score: calculateRelevanceScore(row, textTerms),
  }

  if (config.enableHighlights && textTerms.length > 0) {
    result.highlights = {
      title: highlightMatches(row.title, textTerms, config.highlightMaxLength),
      content: highlightMatches(row.content, textTerms, config.highlightMaxLength),
      summary: highlightMatches(row.summary, textTerms, config.highlightMaxLength),
    }
  }

  return result
}

/**
 * Format a block database row as a search result
 */
function formatBlockResult(
  row: any,
  textTerms: string[],
  config: QueryConfig
): BlockSearchResult {
  const result: BlockSearchResult = {
    type: 'block',
    id: row.id,
    blockId: row.block_id,
    strandPath: row.strand_path,
    strandTitle: row.strand_title || '',
    blockType: row.block_type || 'paragraph',
    content: row.content || '',
    summary: row.summary,
    headingLevel: row.heading_level,
    tags: parseJSONArray(row.tags),
    worthinessScore: row.worthiness_score,
    startLine: row.start_line,
    endLine: row.end_line,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    score: calculateRelevanceScore(row, textTerms),
  }

  if (config.enableHighlights && textTerms.length > 0) {
    result.highlights = {
      content: highlightMatches(row.content, textTerms, config.highlightMaxLength),
    }
  }

  return result
}

/**
 * Parse a JSON array string or return empty array
 */
function parseJSONArray(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Calculate a simple relevance score based on text matches
 */
function calculateRelevanceScore(row: any, textTerms: string[]): number {
  if (textTerms.length === 0) return 1

  const title = (row.title || '').toLowerCase()
  const content = (row.content || row.raw_content || '').toLowerCase()
  const summary = (row.summary || row.extractive_summary || '').toLowerCase()

  let score = 0
  let maxScore = textTerms.length * 3 // Title: 2 pts, Content: 0.5 pts, Summary: 0.5 pts

  for (const term of textTerms) {
    const lowerTerm = term.toLowerCase()

    // Title match (highest weight)
    if (title.includes(lowerTerm)) {
      score += 2
      // Boost for exact title match
      if (title === lowerTerm) score += 1
    }

    // Summary match (medium weight)
    if (summary.includes(lowerTerm)) {
      score += 0.5
    }

    // Content match (lower weight)
    if (content.includes(lowerTerm)) {
      score += 0.5
    }
  }

  return Math.min(score / maxScore, 1)
}

/**
 * Generate highlighted snippets for text matches
 */
function highlightMatches(
  text: string | null,
  terms: string[],
  maxLength: number
): string[] | undefined {
  if (!text || terms.length === 0) return undefined

  const highlights: string[] = []
  const lowerText = text.toLowerCase()

  for (const term of terms) {
    const lowerTerm = term.toLowerCase()
    let startIndex = 0

    while (startIndex < text.length) {
      const matchIndex = lowerText.indexOf(lowerTerm, startIndex)
      if (matchIndex === -1) break

      // Extract context around match
      const contextStart = Math.max(0, matchIndex - 50)
      const contextEnd = Math.min(text.length, matchIndex + term.length + 50)
      let snippet = text.slice(contextStart, contextEnd)

      // Add ellipsis if truncated
      if (contextStart > 0) snippet = '...' + snippet
      if (contextEnd < text.length) snippet = snippet + '...'

      // Add highlight markers
      const highlightStart = matchIndex - contextStart + (contextStart > 0 ? 3 : 0)
      const highlightEnd = highlightStart + term.length
      snippet =
        snippet.slice(0, highlightStart) +
        '<mark>' +
        snippet.slice(highlightStart, highlightEnd) +
        '</mark>' +
        snippet.slice(highlightEnd)

      highlights.push(snippet.slice(0, maxLength))
      startIndex = matchIndex + term.length
    }
  }

  return highlights.length > 0 ? highlights.slice(0, 3) : undefined
}

// ============================================================================
// FACETS
// ============================================================================

/**
 * Compute facets for query results
 */
async function computeFacets(
  isBlockQuery: boolean,
  _query: RootQueryNode
): Promise<QueryFacets> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not initialized')

  // Run facet queries in parallel
  const [weaves, looms, tags, subjects, topics, blockTypes, supertags, difficulties] =
    await Promise.all([
      getFacetCounts(db, 'weaves', 'slug'),
      getFacetCounts(db, 'looms', 'slug'),
      getTagFacetCounts(db, isBlockQuery),
      getJSONFieldFacetCounts(db, 'subjects', isBlockQuery),
      getJSONFieldFacetCounts(db, 'topics', isBlockQuery),
      isBlockQuery ? getBlockTypeFacetCounts(db) : Promise.resolve([]),
      getSupertagFacetCounts(db),
      getDifficultyFacetCounts(db),
    ])

  return {
    weaves,
    looms,
    tags,
    subjects,
    topics,
    blockTypes,
    supertags,
    difficulties,
  }
}

/**
 * Get facet counts from a simple table
 */
async function getFacetCounts(
  db: any,
  table: string,
  column: string
): Promise<FacetCount[]> {
  const sql = `
    SELECT ${column} as value, COUNT(*) as count
    FROM ${table}
    WHERE ${column} IS NOT NULL
    GROUP BY ${column}
    ORDER BY count DESC
    LIMIT 50
  `
  const rows = await db.all(sql)
  return rows.map((row: any) => ({
    value: row.value,
    count: row.count,
    label: row.value,
  }))
}

/**
 * Get tag facet counts
 */
async function getTagFacetCounts(
  db: any,
  isBlockQuery: boolean
): Promise<FacetCount[]> {
  const table = isBlockQuery ? 'strand_blocks' : 'strands'
  const sql = `
    SELECT tags FROM ${table}
    WHERE tags IS NOT NULL AND tags != '[]'
  `
  const rows = await db.all(sql)

  // Aggregate tags
  const tagCounts = new Map<string, number>()
  for (const row of rows) {
    const tags = parseJSONArray(row.tags)
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }

  // Sort by count and convert to FacetCount array
  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([value, count]) => ({ value, count, label: value }))
}

/**
 * Get facet counts from a JSON array field
 */
async function getJSONFieldFacetCounts(
  db: any,
  field: string,
  isBlockQuery: boolean
): Promise<FacetCount[]> {
  const table = isBlockQuery ? 'strands' : 'strands'
  const sql = `
    SELECT ${field} FROM ${table}
    WHERE ${field} IS NOT NULL AND ${field} != '[]'
  `
  const rows = await db.all(sql)

  // Aggregate values
  const counts = new Map<string, number>()
  for (const row of rows) {
    const values = parseJSONArray(row[field])
    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([value, count]) => ({ value, count, label: value }))
}

/**
 * Get block type facet counts
 */
async function getBlockTypeFacetCounts(db: any): Promise<FacetCount[]> {
  const sql = `
    SELECT block_type as value, COUNT(*) as count
    FROM strand_blocks
    WHERE block_type IS NOT NULL
    GROUP BY block_type
    ORDER BY count DESC
  `
  const rows = await db.all(sql)
  return rows.map((row: any) => ({
    value: row.value,
    count: row.count,
    label: formatBlockTypeLabel(row.value),
  }))
}

/**
 * Get supertag facet counts
 */
async function getSupertagFacetCounts(db: any): Promise<FacetCount[]> {
  const sql = `
    SELECT ss.tag_name as value, ss.icon, ss.color, COUNT(DISTINCT sfv.block_id) as count
    FROM supertag_schemas ss
    LEFT JOIN supertag_field_values sfv ON sfv.supertag_id = ss.id
    GROUP BY ss.id
    HAVING count > 0
    ORDER BY count DESC
    LIMIT 50
  `
  const rows = await db.all(sql)
  return rows.map((row: any) => ({
    value: row.value,
    count: row.count,
    label: row.value,
    color: row.color,
  }))
}

/**
 * Get difficulty facet counts
 */
async function getDifficultyFacetCounts(db: any): Promise<FacetCount[]> {
  const sql = `
    SELECT difficulty as value, COUNT(*) as count
    FROM strands
    WHERE difficulty IS NOT NULL
    GROUP BY difficulty
    ORDER BY
      CASE difficulty
        WHEN 'beginner' THEN 1
        WHEN 'intermediate' THEN 2
        WHEN 'advanced' THEN 3
        WHEN 'expert' THEN 4
        ELSE 5
      END
  `
  const rows = await db.all(sql)
  return rows.map((row: any) => ({
    value: row.value,
    count: row.count,
    label: capitalizeFirst(row.value),
  }))
}

/**
 * Format block type for display
 */
function formatBlockTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    paragraph: 'Paragraph',
    heading: 'Heading',
    code: 'Code Block',
    list: 'List',
    blockquote: 'Blockquote',
    table: 'Table',
    image: 'Image',
    hr: 'Horizontal Rule',
  }
  return labels[type] || capitalizeFirst(type)
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ============================================================================
// SAVED QUERIES
// ============================================================================

/**
 * Save a query
 */
export async function saveQuery(
  name: string,
  query: RootQueryNode,
  options: {
    description?: string
    isPinned?: boolean
    folder?: string
  } = {}
): Promise<SavedQuery> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not initialized')
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.run(
    `INSERT INTO saved_queries (id, name, description, query_json, is_pinned, folder, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name,
      options.description || null,
      JSON.stringify(query),
      options.isPinned ? 1 : 0,
      options.folder || null,
      now,
      now,
    ]
  )

  return {
    id,
    name,
    description: options.description,
    queryJson: JSON.stringify(query),
    isPinned: options.isPinned || false,
    folder: options.folder,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Update a saved query
 */
export async function updateSavedQuery(
  id: string,
  updates: Partial<{
    name: string
    description: string
    query: RootQueryNode
    isPinned: boolean
    folder: string
  }>
): Promise<void> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not initialized')
  const now = new Date().toISOString()

  const sets: string[] = []
  const params: unknown[] = []

  if (updates.name !== undefined) {
    sets.push('name = ?')
    params.push(updates.name)
  }
  if (updates.description !== undefined) {
    sets.push('description = ?')
    params.push(updates.description)
  }
  if (updates.query !== undefined) {
    sets.push('query_json = ?')
    params.push(JSON.stringify(updates.query))
  }
  if (updates.isPinned !== undefined) {
    sets.push('is_pinned = ?')
    params.push(updates.isPinned ? 1 : 0)
  }
  if (updates.folder !== undefined) {
    sets.push('folder = ?')
    params.push(updates.folder)
  }

  sets.push('updated_at = ?')
  params.push(now)
  params.push(id)

  await db.run(
    `UPDATE saved_queries SET ${sets.join(', ')} WHERE id = ?`,
    params
  )
}

/**
 * Delete a saved query
 */
export async function deleteSavedQuery(id: string): Promise<void> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not initialized')
  await db.run('DELETE FROM saved_queries WHERE id = ?', [id])
}

/**
 * Get all saved queries
 */
export async function getSavedQueries(options: {
  folder?: string
  pinnedOnly?: boolean
} = {}): Promise<SavedQuery[]> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not initialized')

  let sql = 'SELECT * FROM saved_queries WHERE 1=1'
  const params: unknown[] = []

  if (options.folder) {
    sql += ' AND folder = ?'
    params.push(options.folder)
  }
  if (options.pinnedOnly) {
    sql += ' AND is_pinned = 1'
  }

  sql += ' ORDER BY is_pinned DESC, updated_at DESC'

  const rows = await db.all(sql, params)
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    queryJson: row.query_json,
    isPinned: row.is_pinned === 1,
    folder: row.folder,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

/**
 * Get a single saved query
 */
interface SavedQueryRow {
  id: string
  name: string
  description: string | null
  query_json: string
  is_pinned: number
  folder: string | null
  created_at: string
  updated_at: string
}

export async function getSavedQuery(id: string): Promise<SavedQuery | null> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not initialized')
  const row = await db.get<SavedQueryRow>('SELECT * FROM saved_queries WHERE id = ?', [id])
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    queryJson: row.query_json,
    isPinned: row.is_pinned === 1,
    folder: row.folder ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Execute a saved query by ID
 */
export async function executeSavedQuery(
  id: string,
  config: Partial<QueryConfig> = {}
): Promise<QueryResult | null> {
  const savedQuery = await getSavedQuery(id)
  if (!savedQuery) return null

  const query = JSON.parse(savedQuery.queryJson) as RootQueryNode
  return executeQuery(query, config)
}

// ============================================================================
// QUICK SEARCH
// ============================================================================

/**
 * Quick search for autocomplete/suggestions
 * Now includes dynamic document features (formulas, mentions) for Embark-style search
 */
export async function quickSearch(
  term: string,
  options: {
    limit?: number
    types?: Array<'strand' | 'block' | 'tag' | 'supertag' | 'formula' | 'mention'>
  } = {}
): Promise<{
  strands: Array<{ path: string; title: string }>
  blocks: Array<{ id: string; path: string; content: string }>
  tags: string[]
  supertags: string[]
  formulas: Array<{ path: string; formula: string; result: string; score: number }>
  mentions: Array<{ path: string; match: string; type: string; score: number }>
}> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not initialized')
  const limit = options.limit || 5
  const types = options.types || ['strand', 'block', 'tag', 'supertag', 'formula', 'mention']
  const searchTerm = `%${term}%`

  const results = {
    strands: [] as Array<{ path: string; title: string }>,
    blocks: [] as Array<{ id: string; path: string; content: string }>,
    tags: [] as string[],
    supertags: [] as string[],
    formulas: [] as Array<{ path: string; formula: string; result: string; score: number }>,
    mentions: [] as Array<{ path: string; match: string; type: string; score: number }>,
  }

  // Parallel queries
  const queries: Promise<void>[] = []

  if (types.includes('strand')) {
    queries.push(
      db.all(
        `SELECT path, title FROM strands
         WHERE title LIKE ? OR path LIKE ?
         ORDER BY updated_at DESC
         LIMIT ?`,
        [searchTerm, searchTerm, limit]
      ).then((rows: any[]) => {
        results.strands = rows.map(r => ({ path: r.path, title: r.title }))
      })
    )
  }

  if (types.includes('block')) {
    queries.push(
      db.all(
        `SELECT id, strand_path, raw_content FROM strand_blocks
         WHERE raw_content LIKE ?
         ORDER BY updated_at DESC
         LIMIT ?`,
        [searchTerm, limit]
      ).then((rows: any[]) => {
        results.blocks = rows.map(r => ({
          id: r.id,
          path: r.strand_path,
          content: r.raw_content.slice(0, 100),
        }))
      })
    )
  }

  if (types.includes('tag')) {
    queries.push(
      (async () => {
        const rows = await db.all<{ tags: string }>(
          `SELECT DISTINCT tags FROM strands WHERE tags LIKE ?`,
          [searchTerm]
        )
        const allTags = new Set<string>()
        for (const row of rows) {
          const tags = parseJSONArray(row.tags)
          for (const tag of tags) {
            if (tag.toLowerCase().includes(term.toLowerCase())) {
              allTags.add(tag)
            }
          }
        }
        results.tags = Array.from(allTags).slice(0, limit)
      })()
    )
  }

  if (types.includes('supertag')) {
    queries.push(
      db.all(
        `SELECT tag_name FROM supertag_schemas WHERE tag_name LIKE ? LIMIT ?`,
        [searchTerm, limit]
      ).then((rows: any[]) => {
        results.supertags = rows.map(r => r.tag_name)
      })
    )
  }

  // Search dynamic content (formulas and mentions) - Embark-style features
  const includeDynamic = types.includes('formula') || types.includes('mention')
  if (includeDynamic) {
    queries.push(
      (async () => {
        try {
          const dynamicTypes: Array<'formula' | 'mention' | 'relationship'> = []
          if (types.includes('formula')) dynamicTypes.push('formula')
          if (types.includes('mention')) dynamicTypes.push('relationship')

          const dynamicResults = await searchDynamicContent(term, {
            types: dynamicTypes,
            limit,
          })

          for (const result of dynamicResults) {
            if (result.type === 'formula') {
              results.formulas.push({
                path: result.strandPath,
                formula: (result.context as any)?.formula || '',
                result: result.match,
                score: result.score,
              })
            } else if (result.type === 'relationship' || result.type === 'mention') {
              results.mentions.push({
                path: result.strandPath,
                match: result.match,
                type: (result.context as any)?.type || 'unknown',
                score: result.score,
              })
            }
          }
        } catch (error) {
          // Dynamic search is optional - don't fail the main search
          console.warn('[QueryEngine] Dynamic content search failed:', error)
        }
      })()
    )
  }

  await Promise.all(queries)
  return results
}

// ============================================================================
// RECENT & POPULAR
// ============================================================================

/**
 * Get recent search queries (from saved queries)
 */
export async function getRecentQueries(limit: number = 10): Promise<SavedQuery[]> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not initialized')
  const rows = await db.all(
    `SELECT * FROM saved_queries ORDER BY updated_at DESC LIMIT ?`,
    [limit]
  )

  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    queryJson: row.query_json,
    isPinned: row.is_pinned === 1,
    folder: row.folder,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

/**
 * Get pinned queries
 */
export async function getPinnedQueries(): Promise<SavedQuery[]> {
  return getSavedQueries({ pinnedOnly: true })
}
