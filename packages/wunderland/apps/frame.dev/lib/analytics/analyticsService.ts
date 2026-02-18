/**
 * Analytics Service
 * @module lib/analytics/analyticsService
 *
 * Data aggregation and query functions for the analytics dashboard.
 * Queries strands, tags, activity logs, and engagement data.
 *
 * Supports multiple content sources:
 * - SQLite database (strands/embeddings tables)
 * - Content store (filesystem/bundled sources)
 */

import { getDatabase } from '@/lib/codexDatabase'
import { getContentStore } from '@/lib/content/sqliteStore'
import type { StrandContent } from '@/lib/content/types'
import { REPO_CONFIG } from '@/components/quarry/constants'
import {
  TIME_RANGE_CONFIG,
  type TimeRange,
  type AnalyticsData,
  type GrowthMetrics,
  type TagMetrics,
  type TagCooccurrenceData,
  type ActivityMetrics,
  type EngagementMetrics,
  type TimeSeriesPoint,
} from './types'

// ============================================================================
// CONTENT STORE HELPERS
// ============================================================================

/**
 * Get all strands from the content store
 * This handles filesystem/bundled sources that don't write to the database
 */
async function getStrandsFromContentStore(): Promise<StrandContent[]> {
  try {
    const store = getContentStore()
    await store.initialize()
    const tree = await store.getKnowledgeTree()

    // Collect all strand paths from the tree
    const strandPaths: string[] = []
    const collectStrands = (nodes: typeof tree) => {
      for (const node of nodes) {
        if (node.type === 'strand') {
          strandPaths.push(node.path)
        } else if (node.children) {
          collectStrands(node.children)
        }
      }
    }
    collectStrands(tree)

    // Fetch all strands
    if (strandPaths.length === 0) return []
    return await store.getStrands(strandPaths)
  } catch (error) {
    console.warn('[Analytics] Failed to get strands from content store:', error)
    return []
  }
}

// ============================================================================
// GITHUB API FALLBACK (for static mode)
// ============================================================================

// Dynamic GitHub URLs based on REPO_CONFIG
function getGitHubTreeUrl(): string {
  return `https://api.github.com/repos/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/git/trees/${REPO_CONFIG.BRANCH}?recursive=1`
}

function getGitHubRawBase(): string {
  return `https://raw.githubusercontent.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/${REPO_CONFIG.BRANCH}`
}

// Cache for GitHub tree data
let githubTreeCache: { data: StrandContent[]; timestamp: number } | null = null
const GITHUB_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Check if we're running in static/GitHub Pages mode
 */
export function isStaticMode(): boolean {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname
  return (
    hostname === 'frame.dev' || // Production custom domain
    hostname.includes('github.io') ||
    hostname.includes('pages.dev') ||
    hostname.includes('netlify.app') ||
    hostname.includes('vercel.app') ||
    // Also check if API routes are unavailable (static export)
    process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'
  )
}

/**
 * Get strands from GitHub API as fallback for static mode
 * This provides basic analytics when database is empty
 */
async function getStrandsFromGitHub(): Promise<StrandContent[]> {
  // Check cache first
  if (githubTreeCache && Date.now() - githubTreeCache.timestamp < GITHUB_CACHE_TTL) {
    console.log('[Analytics] Using cached GitHub tree data')
    return githubTreeCache.data
  }

  try {
    console.log('[Analytics] Fetching strands from GitHub API...')
    const response = await fetch(getGitHubTreeUrl())
    
    if (!response.ok) {
      console.warn('[Analytics] GitHub API returned:', response.status)
      return []
    }

    const data = await response.json()
    const tree = data.tree as Array<{ path: string; type: string; sha: string }>
    
    if (!tree || tree.length === 0) {
      return []
    }

    // Filter to markdown files in weaves directory
    const strandFiles = tree.filter(
      (item) =>
        item.type === 'blob' &&
        item.path.endsWith('.md') &&
        item.path.startsWith('weaves/')
    )

    console.log(`[Analytics] Found ${strandFiles.length} strand files in GitHub`)

    // Build minimal StrandContent objects from paths
    // We can't fetch full content for all files, so extract metadata from paths
    const strands: StrandContent[] = strandFiles.map((file) => {
      const parts = file.path.split('/')
      // Path format: weaves/{weave}/looms/{loom}/strands/{name}.md
      const weaveName = parts[1] || 'unknown'
      const fileName = parts[parts.length - 1].replace('.md', '')
      const title = fileName
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())

      // Extract loom name if present
      const loomIndex = parts.indexOf('looms')
      const loomName = loomIndex >= 0 && parts[loomIndex + 1] ? parts[loomIndex + 1] : null

      // Generate a pseudo-date based on sha for some variation
      // This gives consistent but distributed dates for demo purposes
      const hashNum = parseInt(file.sha.slice(0, 8), 16)
      const daysAgo = hashNum % 365
      const pseudoDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      return {
        id: file.sha,
        path: file.path.replace('weaves/', '').replace('.md', ''),
        slug: fileName, // URL-safe slug from filename
        title,
        content: '', // Not fetching content for analytics
        frontmatter: {},
        wordCount: 0,
        weave: weaveName,
        loom: loomName,
        tags: [], // Can't determine without fetching content
        createdAt: pseudoDate,
        updatedAt: pseudoDate,
        lastModified: pseudoDate, // Use same pseudo-date for lastModified
      } as StrandContent
    })

    // Cache the result
    githubTreeCache = { data: strands, timestamp: Date.now() }
    console.log(`[Analytics] Cached ${strands.length} strands from GitHub`)

    return strands
  } catch (error) {
    console.warn('[Analytics] Failed to fetch from GitHub API:', error)
    return []
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getDateRange(range: TimeRange): { since: string; until: string } {
  const now = new Date()
  const until = now.toISOString().split('T')[0]

  if (range === 'all') {
    return { since: '2020-01-01', until }
  }

  const days = TIME_RANGE_CONFIG[range].days
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  return { since, until }
}

function getPreviousPeriodRange(range: TimeRange): { since: string; until: string } {
  const now = new Date()

  if (range === 'all') {
    return { since: '2019-01-01', until: '2020-01-01' }
  }

  const days = TIME_RANGE_CONFIG[range].days
  const until = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const since = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  return { since, until }
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Try comma-separated fallback
    return value.split(',').map((s) => s.trim()).filter(Boolean)
  }
}

function fillDateGaps(
  points: TimeSeriesPoint[],
  since: string,
  until: string
): TimeSeriesPoint[] {
  const dateMap = new Map(points.map((p) => [p.date, p.count]))
  const filled: TimeSeriesPoint[] = []

  const start = new Date(since)
  const end = new Date(until)
  let cumulative = 0

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const count = dateMap.get(dateStr) || 0
    cumulative += count
    filled.push({ date: dateStr, count, cumulative })
  }

  return filled
}

// ============================================================================
// GROWTH METRICS
// ============================================================================

async function getGrowthMetrics(range: TimeRange): Promise<GrowthMetrics> {
  const db = await getDatabase()
  const { since, until } = getDateRange(range)
  const prevRange = getPreviousPeriodRange(range)

  // First, try to get strands from the content store (handles filesystem/bundled sources)
  const contentStoreStrands = await getStrandsFromContentStore()

  // If we have strands from content store, use those for analytics
  if (contentStoreStrands.length > 0) {
    return getGrowthMetricsFromStrands(contentStoreStrands, since, until, prevRange)
  }

  // Try GitHub API fallback for static mode
  if (isStaticMode() || !db) {
    const githubStrands = await getStrandsFromGitHub()
    if (githubStrands.length > 0) {
      console.log('[Analytics] Using GitHub API data for metrics')
      return getGrowthMetricsFromStrands(githubStrands, since, until, prevRange)
    }
  }

  // Fall back to database queries
  if (!db) {
    return {
      strandsOverTime: [],
      totalStrands: 0,
      strandsThisPeriod: 0,
      strandsPreviousPeriod: 0,
      growthRate: 0,
      byWeave: [],
      byStatus: [],
    }
  }

  try {
    // Check if strands table has data, otherwise use embeddings
    const strandCountCheck = (await db.all(`SELECT COUNT(*) as count FROM strands`)) as { count: number }[]
    const hasStrands = (strandCountCheck[0]?.count || 0) > 0

    // Use strands table if populated, otherwise fall back to embeddings table
    const contentTable = hasStrands ? 'strands' : 'embeddings'
    const dateField = hasStrands ? 'created_at' : 'created_at'

    // Get content over time
    const strandsOverTimeRaw = (await db.all(`
      SELECT date(${dateField}) as date, COUNT(DISTINCT ${hasStrands ? 'id' : 'path'}) as count
      FROM ${contentTable}
      WHERE date(${dateField}) >= ? AND date(${dateField}) <= ?
      GROUP BY date(${dateField})
      ORDER BY date ASC
    `, [since, until])) as { date: string; count: number }[]

    const strandsOverTime = fillDateGaps(strandsOverTimeRaw, since, until)

    // Total content count
    const totalResult = (await db.all(`
      SELECT COUNT(DISTINCT ${hasStrands ? 'id' : 'path'}) as count FROM ${contentTable}
    `)) as { count: number }[]
    const totalStrands = totalResult[0]?.count || 0

    // Content this period
    const thisPeriodResult = (await db.all(`
      SELECT COUNT(DISTINCT ${hasStrands ? 'id' : 'path'}) as count FROM ${contentTable}
      WHERE date(${dateField}) >= ? AND date(${dateField}) <= ?
    `, [since, until])) as { count: number }[]
    const strandsThisPeriod = thisPeriodResult[0]?.count || 0

    // Content previous period
    const prevPeriodResult = (await db.all(`
      SELECT COUNT(DISTINCT ${hasStrands ? 'id' : 'path'}) as count FROM ${contentTable}
      WHERE date(${dateField}) >= ? AND date(${dateField}) <= ?
    `, [prevRange.since, prevRange.until])) as { count: number }[]
    const strandsPreviousPeriod = prevPeriodResult[0]?.count || 0

    // Growth rate
    const growthRate = strandsPreviousPeriod > 0
      ? ((strandsThisPeriod - strandsPreviousPeriod) / strandsPreviousPeriod) * 100
      : strandsThisPeriod > 0 ? 100 : 0

    // By weave - use embeddings.weave if strands table is empty
    let byWeaveResult: { name: string; count: number }[] = []
    if (hasStrands) {
      byWeaveResult = (await db.all(`
        SELECT w.name, COUNT(s.id) as count
        FROM strands s
        JOIN weaves w ON s.weave_id = w.id
        GROUP BY w.id, w.name
        ORDER BY count DESC
        LIMIT 10
      `)) as { name: string; count: number }[]
    } else {
      // Use embeddings.weave field
      byWeaveResult = (await db.all(`
        SELECT weave as name, COUNT(DISTINCT path) as count
        FROM embeddings
        WHERE weave IS NOT NULL AND weave != ''
        GROUP BY weave
        ORDER BY count DESC
        LIMIT 10
      `)) as { name: string; count: number }[]
    }

    // By status - only available in strands table
    let byStatusResult: { status: string; count: number }[] = []
    if (hasStrands) {
      byStatusResult = (await db.all(`
        SELECT status, COUNT(*) as count
        FROM strands
        GROUP BY status
        ORDER BY count DESC
      `)) as { status: string; count: number }[]
    } else {
      // Embeddings don't have status, use content_type as fallback category
      byStatusResult = (await db.all(`
        SELECT content_type as status, COUNT(DISTINCT path) as count
        FROM embeddings
        WHERE content_type IS NOT NULL
        GROUP BY content_type
        ORDER BY count DESC
      `)) as { status: string; count: number }[]
    }

    return {
      strandsOverTime,
      totalStrands,
      strandsThisPeriod,
      strandsPreviousPeriod,
      growthRate: Math.round(growthRate * 10) / 10,
      byWeave: byWeaveResult,
      byStatus: byStatusResult,
    }
  } catch (error) {
    console.error('[Analytics] Failed to get growth metrics:', error)
    return {
      strandsOverTime: [],
      totalStrands: 0,
      strandsThisPeriod: 0,
      strandsPreviousPeriod: 0,
      growthRate: 0,
      byWeave: [],
      byStatus: [],
    }
  }
}

/**
 * Calculate growth metrics from in-memory strand data
 */
function getGrowthMetricsFromStrands(
  strands: StrandContent[],
  since: string,
  until: string,
  prevRange: { since: string; until: string }
): GrowthMetrics {
  const now = new Date().toISOString().split('T')[0]

  // Since filesystem strands don't have creation dates, we'll treat them as created today
  // This provides a baseline count that shows the user has content
  const totalStrands = strands.length

  // Group by date - use lastModified if available, otherwise today
  const strandsByDate = new Map<string, number>()
  for (const strand of strands) {
    const date = strand.lastModified?.split('T')[0] || now
    strandsByDate.set(date, (strandsByDate.get(date) || 0) + 1)
  }

  // Create time series
  const strandsOverTimeRaw: TimeSeriesPoint[] = []
  for (const [date, count] of strandsByDate) {
    if (date >= since && date <= until) {
      strandsOverTimeRaw.push({ date, count })
    }
  }
  strandsOverTimeRaw.sort((a, b) => a.date.localeCompare(b.date))
  const strandsOverTime = fillDateGaps(strandsOverTimeRaw, since, until)

  // Count strands in period
  let strandsThisPeriod = 0
  let strandsPreviousPeriod = 0
  for (const strand of strands) {
    const date = strand.lastModified?.split('T')[0] || now
    if (date >= since && date <= until) strandsThisPeriod++
    if (date >= prevRange.since && date < prevRange.until) strandsPreviousPeriod++
  }

  // If no dates available, count all as "this period" for display purposes
  if (strandsThisPeriod === 0 && strands.length > 0) {
    strandsThisPeriod = strands.length
  }

  // Growth rate
  const growthRate = strandsPreviousPeriod > 0
    ? ((strandsThisPeriod - strandsPreviousPeriod) / strandsPreviousPeriod) * 100
    : strandsThisPeriod > 0 ? 100 : 0

  // Group by weave
  const byWeaveMap = new Map<string, number>()
  for (const strand of strands) {
    const weave = strand.weave || 'Unknown'
    byWeaveMap.set(weave, (byWeaveMap.get(weave) || 0) + 1)
  }
  const byWeave = Array.from(byWeaveMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Group by status - check frontmatter for status
  const byStatusMap = new Map<string, number>()
  for (const strand of strands) {
    const status = (strand.frontmatter?.publishing?.status as string) || 'published'
    byStatusMap.set(status, (byStatusMap.get(status) || 0) + 1)
  }
  const byStatus = Array.from(byStatusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  return {
    strandsOverTime,
    totalStrands,
    strandsThisPeriod,
    strandsPreviousPeriod,
    growthRate: Math.round(growthRate * 10) / 10,
    byWeave,
    byStatus,
  }
}

// ============================================================================
// TAG METRICS
// ============================================================================

async function getTagMetrics(range: TimeRange): Promise<TagMetrics> {
  const db = await getDatabase()
  const { since, until } = getDateRange(range)

  // First, try to get strands from the content store (handles filesystem/bundled sources)
  const contentStoreStrands = await getStrandsFromContentStore()

  // If we have strands from content store, use those for analytics
  if (contentStoreStrands.length > 0) {
    return getTagMetricsFromStrands(contentStoreStrands, since, until)
  }

  // Try GitHub API fallback for static mode
  if (isStaticMode() || !db) {
    const githubStrands = await getStrandsFromGitHub()
    if (githubStrands.length > 0) {
      return getTagMetricsFromStrands(githubStrands, since, until)
    }
  }

  if (!db) {
    return {
      tagEvolution: [],
      topTags: [],
      topSubjects: [],
      topTopics: [],
      totalUniqueTags: 0,
      totalUniqueSubjects: 0,
      totalUniqueTopics: 0,
      newTagsThisPeriod: [],
    }
  }

  try {
    // Check if strands table has data, otherwise use embeddings
    const strandCountCheck = (await db.all(`SELECT COUNT(*) as count FROM strands`)) as { count: number }[]
    const hasStrands = (strandCountCheck[0]?.count || 0) > 0

    // Aggregate tags, subjects, topics
    const tagCounts = new Map<string, number>()
    const subjectCounts = new Map<string, number>()
    const topicCounts = new Map<string, number>()
    const allTags = new Set<string>()
    const allSubjects = new Set<string>()
    const allTopics = new Set<string>()

    // Tag evolution by date
    const dateTagCounts = new Map<string, Map<string, number>>()

    if (hasStrands) {
      // Get all strands with their tags/subjects/topics and dates
      const strands = (await db.all(`
        SELECT date(created_at) as date, tags, subjects, topics
        FROM strands
        WHERE date(created_at) >= ? AND date(created_at) <= ?
        ORDER BY created_at ASC
      `, [since, until])) as { date: string; tags: string; subjects: string; topics: string }[]

      for (const strand of strands) {
        const tags = parseJsonArray(strand.tags)
        const subjects = parseJsonArray(strand.subjects)
        const topics = parseJsonArray(strand.topics)

        // Count each
        for (const tag of tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
          allTags.add(tag)
        }
        for (const subject of subjects) {
          subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1)
          allSubjects.add(subject)
        }
        for (const topic of topics) {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
          allTopics.add(topic)
        }

        // Track tag evolution
        if (!dateTagCounts.has(strand.date)) {
          dateTagCounts.set(strand.date, new Map())
        }
        const dateTags = dateTagCounts.get(strand.date)!
        for (const tag of tags) {
          dateTags.set(tag, (dateTags.get(tag) || 0) + 1)
        }
      }
    } else {
      // Use embeddings table - only has tags field, no subjects/topics
      const embeddings = (await db.all(`
        SELECT date(created_at) as date, tags, weave, loom
        FROM embeddings
        WHERE date(created_at) >= ? AND date(created_at) <= ?
        ORDER BY created_at ASC
      `, [since, until])) as { date: string; tags: string; weave: string; loom: string }[]

      for (const embedding of embeddings) {
        const tags = parseJsonArray(embedding.tags)

        // Count tags
        for (const tag of tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
          allTags.add(tag)
        }

        // Use weave as a subject-like category
        if (embedding.weave) {
          subjectCounts.set(embedding.weave, (subjectCounts.get(embedding.weave) || 0) + 1)
          allSubjects.add(embedding.weave)
        }

        // Use loom as a topic-like category
        if (embedding.loom) {
          topicCounts.set(embedding.loom, (topicCounts.get(embedding.loom) || 0) + 1)
          allTopics.add(embedding.loom)
        }

        // Track tag evolution
        if (!dateTagCounts.has(embedding.date)) {
          dateTagCounts.set(embedding.date, new Map())
        }
        const dateTags = dateTagCounts.get(embedding.date)!
        for (const tag of tags) {
          dateTags.set(tag, (dateTags.get(tag) || 0) + 1)
        }
      }
    }

    // Build tag evolution with cumulative counts
    const tagEvolution: TagMetrics['tagEvolution'] = []
    const cumulativeTags = new Map<string, number>()
    const sortedDates = Array.from(dateTagCounts.keys()).sort()

    for (const date of sortedDates) {
      const dayTags = dateTagCounts.get(date)!
      for (const [tag, count] of dayTags) {
        cumulativeTags.set(tag, (cumulativeTags.get(tag) || 0) + count)
      }
      tagEvolution.push({
        date,
        tags: Object.fromEntries(cumulativeTags),
      })
    }

    // Top tags, subjects, topics
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }))

    const topSubjects = Array.from(subjectCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    const topTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    // New tags this period (tags that first appeared in this period)
    const newTagsThisPeriod = topTags.slice(0, 5).map((t) => t.name)

    return {
      tagEvolution,
      topTags,
      topSubjects,
      topTopics,
      totalUniqueTags: allTags.size,
      totalUniqueSubjects: allSubjects.size,
      totalUniqueTopics: allTopics.size,
      newTagsThisPeriod,
    }
  } catch (error) {
    console.error('[Analytics] Failed to get tag metrics:', error)
    return {
      tagEvolution: [],
      topTags: [],
      topSubjects: [],
      topTopics: [],
      totalUniqueTags: 0,
      totalUniqueSubjects: 0,
      totalUniqueTopics: 0,
      newTagsThisPeriod: [],
    }
  }
}

/**
 * Calculate tag metrics from in-memory strand data
 */
function getTagMetricsFromStrands(
  strands: StrandContent[],
  since: string,
  until: string
): TagMetrics {
  const now = new Date().toISOString().split('T')[0]

  // Aggregate tags, subjects, topics
  const tagCounts = new Map<string, number>()
  const subjectCounts = new Map<string, number>()
  const topicCounts = new Map<string, number>()
  const allTags = new Set<string>()
  const allSubjects = new Set<string>()
  const allTopics = new Set<string>()

  // Tag evolution by date
  const dateTagCounts = new Map<string, Map<string, number>>()

  for (const strand of strands) {
    const date = strand.lastModified?.split('T')[0] || now
    const fm = strand.frontmatter || {}

    // Extract tags from frontmatter
    const tags = Array.isArray(fm.tags) ? fm.tags as string[] : []
    const subjects = fm.taxonomy?.subjects || (fm.taxonomy?.subject ? [fm.taxonomy.subject] : [])
    const topics = fm.taxonomy?.topics || (fm.taxonomy?.topic ? [fm.taxonomy.topic] : [])

    // Count each
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      allTags.add(tag)
    }
    for (const subject of subjects as string[]) {
      subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1)
      allSubjects.add(subject)
    }
    for (const topic of topics as string[]) {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
      allTopics.add(topic)
    }

    // Use weave as subject if no subjects defined
    if (subjects.length === 0 && strand.weave) {
      subjectCounts.set(strand.weave, (subjectCounts.get(strand.weave) || 0) + 1)
      allSubjects.add(strand.weave)
    }

    // Use loom as topic if no topics defined
    if (topics.length === 0 && strand.loom) {
      topicCounts.set(strand.loom, (topicCounts.get(strand.loom) || 0) + 1)
      allTopics.add(strand.loom)
    }

    // Track tag evolution
    if (date >= since && date <= until) {
      if (!dateTagCounts.has(date)) {
        dateTagCounts.set(date, new Map())
      }
      const dateTags = dateTagCounts.get(date)!
      for (const tag of tags) {
        dateTags.set(tag, (dateTags.get(tag) || 0) + 1)
      }
    }
  }

  // Build tag evolution with cumulative counts
  const tagEvolution: TagMetrics['tagEvolution'] = []
  const cumulativeTags = new Map<string, number>()
  const sortedDates = Array.from(dateTagCounts.keys()).sort()

  for (const date of sortedDates) {
    const dayTags = dateTagCounts.get(date)!
    for (const [tag, count] of dayTags) {
      cumulativeTags.set(tag, (cumulativeTags.get(tag) || 0) + count)
    }
    tagEvolution.push({
      date,
      tags: Object.fromEntries(cumulativeTags),
    })
  }

  // Top tags, subjects, topics
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }))

  const topSubjects = Array.from(subjectCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  const topTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  // New tags this period
  const newTagsThisPeriod = topTags.slice(0, 5).map((t) => t.name)

  // Calculate tag co-occurrence (which tags appear together)
  const tagCooccurrence = calculateTagCooccurrence(strands)

  return {
    tagEvolution,
    topTags,
    topSubjects,
    topTopics,
    totalUniqueTags: allTags.size,
    totalUniqueSubjects: allSubjects.size,
    totalUniqueTopics: allTopics.size,
    newTagsThisPeriod,
    tagCooccurrence,
  }
}

/**
 * Calculate tag co-occurrence matrix
 * Shows which tags frequently appear together in the same strands
 */
function calculateTagCooccurrence(strands: StrandContent[]): TagCooccurrenceData {
  // Count how often each pair of tags appears together
  const pairCounts = new Map<string, number>()
  const tagCounts = new Map<string, number>()
  const allTags = new Set<string>()

  for (const strand of strands) {
    const fm = strand.frontmatter || {}
    const tags = Array.isArray(fm.tags) ? (fm.tags as string[]) : []

    // Count individual tag occurrences
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      allTags.add(tag)
    }

    // Count pair occurrences (combinations of 2)
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        // Sort to ensure consistent key (tagA always < tagB alphabetically)
        const [tagA, tagB] = [tags[i], tags[j]].sort()
        const key = `${tagA}|||${tagB}`
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1)
      }
    }
  }

  // Get top N tags for the matrix (limit to prevent huge matrices)
  const topTagsForMatrix = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag)

  // Build the co-occurrence matrix
  const matrix: number[][] = []
  for (let i = 0; i < topTagsForMatrix.length; i++) {
    const row: number[] = []
    for (let j = 0; j < topTagsForMatrix.length; j++) {
      if (i === j) {
        // Diagonal: count of this tag
        row.push(tagCounts.get(topTagsForMatrix[i]) || 0)
      } else {
        // Off-diagonal: co-occurrence count
        const [tagA, tagB] = [topTagsForMatrix[i], topTagsForMatrix[j]].sort()
        const key = `${tagA}|||${tagB}`
        row.push(pairCounts.get(key) || 0)
      }
    }
    matrix.push(row)
  }

  // Build top pairs list
  const topPairs = Array.from(pairCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => {
      const [tagA, tagB] = key.split('|||')
      const tagACount = tagCounts.get(tagA) || 1
      const tagBCount = tagCounts.get(tagB) || 1
      // Jaccard similarity: count / (A + B - count)
      const strength = count / (tagACount + tagBCount - count)
      return { tagA, tagB, count, strength }
    })

  return {
    topPairs,
    tags: topTagsForMatrix,
    matrix,
  }
}

// ============================================================================
// ACTIVITY METRICS
// ============================================================================

async function getActivityMetrics(range: TimeRange): Promise<ActivityMetrics> {
  const db = await getDatabase()
  const { since, until } = getDateRange(range)

  // First, try to get strands from the content store for basic activity metrics
  const contentStoreStrands = await getStrandsFromContentStore()

  if (!db) {
    // No database - use content store data if available
    if (contentStoreStrands.length > 0) {
      return getActivityMetricsFromStrands(contentStoreStrands, since, until)
    }
    // Try GitHub API fallback for static mode
    if (isStaticMode()) {
      const githubStrands = await getStrandsFromGitHub()
      if (githubStrands.length > 0) {
        return getActivityMetricsFromStrands(githubStrands, since, until)
      }
    }
    return {
      activityByDay: [],
      byActionType: [],
      peakDay: { date: '', count: 0 },
      averageDaily: 0,
      totalActions: 0,
      sessionCount: 0,
    }
  }

  try {
    // Check if audit log table exists
    const tableCheck = (await db.all(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='codex_audit_log'
    `)) as { name: string }[]

    if (tableCheck.length === 0) {
      // No audit log - try content store first, then database fallback
      if (contentStoreStrands.length > 0) {
        return getActivityMetricsFromStrands(contentStoreStrands, since, until)
      }

      // Check if strands table has data, otherwise use embeddings
      const strandCountCheck = (await db.all(`SELECT COUNT(*) as count FROM strands`)) as { count: number }[]
      const hasStrands = (strandCountCheck[0]?.count || 0) > 0

      let contentActivity: { date: string; count: number }[]

      if (hasStrands) {
        // Fallback to strand-based activity if no audit log
        contentActivity = (await db.all(`
          SELECT date(updated_at) as date, COUNT(*) as count
          FROM strands
          WHERE date(updated_at) >= ? AND date(updated_at) <= ?
          GROUP BY date(updated_at)
          ORDER BY date ASC
        `, [since, until])) as { date: string; count: number }[]
      } else {
        // Use embeddings table as last fallback
        contentActivity = (await db.all(`
          SELECT date(created_at) as date, COUNT(DISTINCT path) as count
          FROM embeddings
          WHERE date(created_at) >= ? AND date(created_at) <= ?
          GROUP BY date(created_at)
          ORDER BY date ASC
        `, [since, until])) as { date: string; count: number }[]
      }

      const activityByDay = fillDateGaps(contentActivity, since, until)
      const totalActions = activityByDay.reduce((sum, d) => sum + d.count, 0)
      const peakDay = activityByDay.reduce((max, d) => d.count > max.count ? d : max, { date: '', count: 0 })
      const daysWithActivity = activityByDay.filter((d) => d.count > 0).length
      const averageDaily = daysWithActivity > 0 ? totalActions / daysWithActivity : 0

      return {
        activityByDay,
        byActionType: [{ type: 'content', count: totalActions, color: '#10B981' }],
        peakDay,
        averageDaily: Math.round(averageDaily * 10) / 10,
        totalActions,
        sessionCount: daysWithActivity,
      }
    }

    // Activity by day from audit log
    const activityByDayRaw = (await db.all(`
      SELECT date(timestamp) as date, COUNT(*) as count
      FROM codex_audit_log
      WHERE date(timestamp) >= ? AND date(timestamp) <= ?
      GROUP BY date(timestamp)
      ORDER BY date ASC
    `, [since, until])) as { date: string; count: number }[]

    const activityByDay = fillDateGaps(activityByDayRaw, since, until)

    // By action type
    const byActionTypeRaw = (await db.all(`
      SELECT action_type as type, COUNT(*) as count
      FROM codex_audit_log
      WHERE date(timestamp) >= ? AND date(timestamp) <= ?
      GROUP BY action_type
      ORDER BY count DESC
    `, [since, until])) as { type: string; count: number }[]

    const actionTypeColors: Record<string, string> = {
      file: '#3B82F6',
      content: '#10B981',
      metadata: '#8B5CF6',
      tree: '#F59E0B',
      learning: '#EC4899',
      navigation: '#06B6D4',
      settings: '#71717A',
      bookmark: '#EAB308',
    }

    const byActionType = byActionTypeRaw.map((a) => ({
      ...a,
      color: actionTypeColors[a.type] || '#71717A',
    }))

    // Peak day
    const peakDay = activityByDay.reduce(
      (max, d) => (d.count > max.count ? d : max),
      { date: '', count: 0 }
    )

    // Total actions
    const totalActions = activityByDay.reduce((sum, d) => sum + d.count, 0)

    // Average daily
    const daysWithActivity = activityByDay.filter((d) => d.count > 0).length
    const averageDaily = daysWithActivity > 0 ? totalActions / daysWithActivity : 0

    // Session count
    const sessionResult = (await db.all(`
      SELECT COUNT(DISTINCT session_id) as count
      FROM codex_audit_log
      WHERE date(timestamp) >= ? AND date(timestamp) <= ?
    `, [since, until])) as { count: number }[]
    const sessionCount = sessionResult[0]?.count || 0

    return {
      activityByDay,
      byActionType,
      peakDay,
      averageDaily: Math.round(averageDaily * 10) / 10,
      totalActions,
      sessionCount,
    }
  } catch (error) {
    console.error('[Analytics] Failed to get activity metrics:', error)
    return {
      activityByDay: [],
      byActionType: [],
      peakDay: { date: '', count: 0 },
      averageDaily: 0,
      totalActions: 0,
      sessionCount: 0,
    }
  }
}

/**
 * Calculate activity metrics from in-memory strand data
 */
function getActivityMetricsFromStrands(
  strands: StrandContent[],
  since: string,
  until: string
): ActivityMetrics {
  const now = new Date().toISOString().split('T')[0]

  // Group strands by date
  const activityByDateMap = new Map<string, number>()
  for (const strand of strands) {
    const date = strand.lastModified?.split('T')[0] || now
    if (date >= since && date <= until) {
      activityByDateMap.set(date, (activityByDateMap.get(date) || 0) + 1)
    }
  }

  // If no dates in range, put all activity on today
  if (activityByDateMap.size === 0 && strands.length > 0) {
    activityByDateMap.set(now, strands.length)
  }

  // Convert to array
  const activityByDayRaw: TimeSeriesPoint[] = Array.from(activityByDateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const activityByDay = fillDateGaps(activityByDayRaw, since, until)
  const totalActions = strands.length
  const peakDay = activityByDay.reduce((max, d) => d.count > max.count ? d : max, { date: '', count: 0 })
  const daysWithActivity = activityByDay.filter((d) => d.count > 0).length
  const averageDaily = daysWithActivity > 0 ? totalActions / daysWithActivity : 0

  return {
    activityByDay,
    byActionType: [{ type: 'content', count: totalActions, color: '#10B981' }],
    peakDay,
    averageDaily: Math.round(averageDaily * 10) / 10,
    totalActions,
    sessionCount: daysWithActivity,
  }
}

// ============================================================================
// ENGAGEMENT METRICS
// ============================================================================

async function getEngagementMetrics(range: TimeRange): Promise<EngagementMetrics> {
  const db = await getDatabase()
  if (!db) {
    return {
      totalReadTime: 0,
      completedStrands: 0,
      strandsWithProgress: 0,
      averageReadPercentage: 0,
      readingByDay: [],
    }
  }

  const { since, until } = getDateRange(range)

  try {
    // Total read time and progress
    const progressResult = (await db.all(`
      SELECT
        SUM(total_read_time) as totalTime,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completedCount,
        COUNT(*) as totalCount,
        AVG(read_percentage) as avgPercentage
      FROM reading_progress
      WHERE date(last_read_at) >= ? AND date(last_read_at) <= ?
    `, [since, until])) as {
      totalTime: number
      completedCount: number
      totalCount: number
      avgPercentage: number
    }[]

    const stats = progressResult[0] || {
      totalTime: 0,
      completedCount: 0,
      totalCount: 0,
      avgPercentage: 0,
    }

    // Reading by day
    const readingByDayRaw = (await db.all(`
      SELECT date(last_read_at) as date, COUNT(*) as count
      FROM reading_progress
      WHERE date(last_read_at) >= ? AND date(last_read_at) <= ?
      GROUP BY date(last_read_at)
      ORDER BY date ASC
    `, [since, until])) as { date: string; count: number }[]

    const readingByDay = fillDateGaps(readingByDayRaw, since, until)

    return {
      totalReadTime: stats.totalTime || 0,
      completedStrands: stats.completedCount || 0,
      strandsWithProgress: stats.totalCount || 0,
      averageReadPercentage: Math.round((stats.avgPercentage || 0) * 100) / 100,
      readingByDay,
    }
  } catch (error) {
    console.error('[Analytics] Failed to get engagement metrics:', error)
    return {
      totalReadTime: 0,
      completedStrands: 0,
      strandsWithProgress: 0,
      averageReadPercentage: 0,
      readingByDay: [],
    }
  }
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Get all analytics data for a given time range
 */
export async function getAnalyticsData(range: TimeRange): Promise<AnalyticsData> {
  const [growth, tags, activity, engagement] = await Promise.all([
    getGrowthMetrics(range),
    getTagMetrics(range),
    getActivityMetrics(range),
    getEngagementMetrics(range),
  ])

  return {
    growth,
    tags,
    activity,
    engagement,
    generatedAt: new Date().toISOString(),
    timeRange: range,
  }
}

/**
 * Format seconds into human-readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

/**
 * Format a date for display
 */
export function formatDate(dateStr: string, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const date = new Date(dateStr)
  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    case 'long':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    default:
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
}
