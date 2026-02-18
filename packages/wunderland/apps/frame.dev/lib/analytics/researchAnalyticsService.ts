/**
 * Research Analytics Service
 * @module lib/analytics/researchAnalyticsService
 *
 * Provides analytics and metrics for research sessions.
 */

import type { ResearchSession, WebSearchResult, SearchProvider } from '@/lib/research/types'
import { getAllSessions } from '@/lib/research/sessions'
import { isAcademicResult } from '@/lib/research/academicDetector'

// ============================================================================
// TYPES
// ============================================================================

export interface ResearchAnalyticsData {
  /** Search metrics */
  searches: SearchMetrics
  /** Topic/query metrics */
  topics: TopicMetrics
  /** Source distribution metrics */
  sources: SourceMetrics
  /** Session metrics */
  sessions: SessionMetrics
}

export interface SearchMetrics {
  /** Total number of searches */
  totalSearches: number
  /** Searches in the current period */
  periodSearches: number
  /** Search trend data */
  searchesOverTime: Array<{ date: string; count: number; academic: number }>
  /** Average results saved per session */
  avgSavedPerSession: number
}

export interface TopicMetrics {
  /** Most common query words */
  topQueryTerms: Array<{ term: string; count: number }>
  /** Query length distribution */
  queryLengthDistribution: Array<{ length: string; count: number }>
  /** Recent unique topics */
  recentTopics: string[]
}

export interface SourceMetrics {
  /** Academic vs web distribution */
  sourceTypeDistribution: Array<{ type: string; count: number; percentage: number }>
  /** Top domains */
  topDomains: Array<{ domain: string; count: number }>
  /** Provider usage */
  providerUsage: Array<{ provider: string; count: number }>
}

export interface SessionMetrics {
  /** Total sessions */
  totalSessions: number
  /** Sessions in current period */
  periodSessions: number
  /** Average session duration (if tracked) */
  avgSessionDuration?: number
  /** Sessions with saved results */
  sessionsWithSavedResults: number
  /** Total saved results */
  totalSavedResults: number
}

// ============================================================================
// ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Get research analytics data
 */
export async function getResearchAnalytics(
  daysBack: number = 30
): Promise<ResearchAnalyticsData> {
  const allSessions = await getAllSessions()
  const cutoff = Date.now() - (daysBack * 24 * 60 * 60 * 1000)

  const periodSessions = allSessions.filter(s => s.createdAt >= cutoff)
  const allSavedResults = allSessions.flatMap(s => s.savedResults)
  const periodSavedResults = periodSessions.flatMap(s => s.savedResults)

  return {
    searches: calculateSearchMetrics(allSessions, periodSessions, daysBack),
    topics: calculateTopicMetrics(allSessions),
    sources: calculateSourceMetrics(allSavedResults),
    sessions: calculateSessionMetrics(allSessions, periodSessions),
  }
}

/**
 * Calculate search metrics
 */
function calculateSearchMetrics(
  allSessions: ResearchSession[],
  periodSessions: ResearchSession[],
  daysBack: number
): SearchMetrics {
  // Build searches over time
  const dateMap = new Map<string, { count: number; academic: number }>()

  // Initialize with zeros for the period
  const now = new Date()
  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const key = date.toISOString().split('T')[0]
    dateMap.set(key, { count: 0, academic: 0 })
  }

  // Fill in actual data
  allSessions.forEach(session => {
    const date = new Date(session.createdAt).toISOString().split('T')[0]
    const existing = dateMap.get(date)
    if (existing) {
      existing.count++
      const academicCount = session.savedResults.filter(r => isAcademicResult(r)).length
      existing.academic += academicCount
    }
  })

  const searchesOverTime = Array.from(dateMap.entries())
    .map(([date, data]) => ({ date, count: data.count, academic: data.academic }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Calculate average saved per session
  const sessionsWithResults = allSessions.filter(s => s.savedResults.length > 0)
  const avgSavedPerSession = sessionsWithResults.length > 0
    ? sessionsWithResults.reduce((sum, s) => sum + s.savedResults.length, 0) / sessionsWithResults.length
    : 0

  return {
    totalSearches: allSessions.length,
    periodSearches: periodSessions.length,
    searchesOverTime,
    avgSavedPerSession: Math.round(avgSavedPerSession * 10) / 10,
  }
}

/**
 * Calculate topic metrics
 */
function calculateTopicMetrics(sessions: ResearchSession[]): TopicMetrics {
  // Extract and count query terms
  const termCounts = new Map<string, number>()
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how'])

  const queryLengths = new Map<string, number>()

  sessions.forEach(session => {
    // Count query length
    const wordCount = session.query.split(/\s+/).length
    const lengthBucket =
      wordCount <= 2 ? '1-2 words' :
      wordCount <= 4 ? '3-4 words' :
      wordCount <= 6 ? '5-6 words' : '7+ words'
    queryLengths.set(lengthBucket, (queryLengths.get(lengthBucket) || 0) + 1)

    // Extract terms
    const terms = session.query.toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(term => term.length > 2 && !stopWords.has(term))

    terms.forEach(term => {
      termCounts.set(term, (termCounts.get(term) || 0) + 1)
    })
  })

  // Get top terms
  const topQueryTerms = Array.from(termCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([term, count]) => ({ term, count }))

  // Query length distribution
  const queryLengthDistribution = ['1-2 words', '3-4 words', '5-6 words', '7+ words']
    .map(length => ({ length, count: queryLengths.get(length) || 0 }))

  // Recent unique topics (last 10 unique queries)
  const recentTopics = [...new Set(
    sessions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20)
      .map(s => s.query)
  )].slice(0, 10)

  return {
    topQueryTerms,
    queryLengthDistribution,
    recentTopics,
  }
}

/**
 * Calculate source metrics
 */
function calculateSourceMetrics(results: WebSearchResult[]): SourceMetrics {
  // Source type distribution
  const academicCount = results.filter(r => isAcademicResult(r)).length
  const webCount = results.length - academicCount
  const total = results.length || 1 // Avoid division by zero

  const sourceTypeDistribution = [
    {
      type: 'Academic',
      count: academicCount,
      percentage: Math.round((academicCount / total) * 100),
    },
    {
      type: 'Web',
      count: webCount,
      percentage: Math.round((webCount / total) * 100),
    },
  ]

  // Top domains
  const domainCounts = new Map<string, number>()
  results.forEach(r => {
    const domain = r.domain || new URL(r.url).hostname
    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
  })

  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, count]) => ({ domain, count }))

  // Provider usage (would need to track this in sessions)
  // For now, return empty as we'd need to add provider tracking
  const providerUsage: Array<{ provider: string; count: number }> = []

  return {
    sourceTypeDistribution,
    topDomains,
    providerUsage,
  }
}

/**
 * Calculate session metrics
 */
function calculateSessionMetrics(
  allSessions: ResearchSession[],
  periodSessions: ResearchSession[]
): SessionMetrics {
  const sessionsWithSaved = allSessions.filter(s => s.savedResults.length > 0)
  const totalSavedResults = allSessions.reduce((sum, s) => sum + s.savedResults.length, 0)

  return {
    totalSessions: allSessions.length,
    periodSessions: periodSessions.length,
    sessionsWithSavedResults: sessionsWithSaved.length,
    totalSavedResults,
  }
}

// ============================================================================
// KNOWLEDGE GAPS ANALYSIS
// ============================================================================

export interface KnowledgeGap {
  topic: string
  reason: 'no_saves' | 'low_engagement' | 'incomplete_session' | 'abandoned'
  severity: 'high' | 'medium' | 'low'
  lastSearched?: number
  searchCount: number
  saveCount: number
  suggestion: string
}

export interface KnowledgeGapsData {
  gaps: KnowledgeGap[]
  summary: {
    totalGaps: number
    highPriority: number
    topicsWithNoSaves: number
    abandonedSessions: number
  }
}

/**
 * Analyze research sessions to identify knowledge gaps
 * Knowledge gaps are topics that have been searched but not thoroughly explored
 */
export async function analyzeKnowledgeGaps(
  daysBack: number = 90
): Promise<KnowledgeGapsData> {
  const allSessions = await getAllSessions()
  const cutoff = Date.now() - (daysBack * 24 * 60 * 60 * 1000)
  const recentSessions = allSessions.filter(s => s.createdAt >= cutoff)

  // Group sessions by normalized query (similar topics)
  const topicGroups = new Map<string, {
    queries: string[]
    sessions: typeof recentSessions
    totalSaves: number
    latestSearch: number
  }>()

  recentSessions.forEach(session => {
    // Normalize query to group similar searches
    const normalizedTopic = normalizeQuery(session.query)
    
    const existing = topicGroups.get(normalizedTopic)
    if (existing) {
      existing.queries.push(session.query)
      existing.sessions.push(session)
      existing.totalSaves += session.savedResults.length
      existing.latestSearch = Math.max(existing.latestSearch, session.createdAt)
    } else {
      topicGroups.set(normalizedTopic, {
        queries: [session.query],
        sessions: [session],
        totalSaves: session.savedResults.length,
        latestSearch: session.createdAt,
      })
    }
  })

  const gaps: KnowledgeGap[] = []

  topicGroups.forEach((data, topic) => {
    const searchCount = data.sessions.length
    const saveCount = data.totalSaves

    // Determine if this is a knowledge gap and why
    let gap: KnowledgeGap | null = null

    // Multiple searches but no saves = strong indicator of unresolved topic
    if (searchCount >= 2 && saveCount === 0) {
      gap = {
        topic: data.queries[0], // Use the first query as the topic name
        reason: 'no_saves',
        severity: searchCount >= 3 ? 'high' : 'medium',
        lastSearched: data.latestSearch,
        searchCount,
        saveCount,
        suggestion: `You've searched this ${searchCount} times without saving results. Try different search terms or explore academic sources.`,
      }
    }
    // Many searches but very few saves = low engagement
    else if (searchCount >= 3 && saveCount < searchCount * 0.2) {
      gap = {
        topic: data.queries[0],
        reason: 'low_engagement',
        severity: 'medium',
        lastSearched: data.latestSearch,
        searchCount,
        saveCount,
        suggestion: `Low save rate suggests difficulty finding relevant sources. Try narrowing your query or using specific terminology.`,
      }
    }
    // Single search with no saves (potential abandoned session)
    else if (searchCount === 1 && saveCount === 0) {
      const daysSinceSearch = (Date.now() - data.latestSearch) / (24 * 60 * 60 * 1000)
      if (daysSinceSearch > 3) {
        gap = {
          topic: data.queries[0],
          reason: 'abandoned',
          severity: 'low',
          lastSearched: data.latestSearch,
          searchCount,
          saveCount,
          suggestion: `This topic was searched but never revisited. Consider resuming your research or marking it as complete.`,
        }
      }
    }

    if (gap) {
      gaps.push(gap)
    }
  })

  // Sort gaps by severity and recency
  gaps.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity]
    }
    return (b.lastSearched || 0) - (a.lastSearched || 0)
  })

  return {
    gaps: gaps.slice(0, 15), // Return top 15 gaps
    summary: {
      totalGaps: gaps.length,
      highPriority: gaps.filter(g => g.severity === 'high').length,
      topicsWithNoSaves: gaps.filter(g => g.reason === 'no_saves').length,
      abandonedSessions: gaps.filter(g => g.reason === 'abandoned').length,
    },
  }
}

/**
 * Normalize a query for grouping similar searches
 */
function normalizeQuery(query: string): string {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'is', 'are', 'was', 'were', 'what', 'how', 'why', 'when', 'where',
  ])

  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .sort()
    .slice(0, 4) // Take first 4 significant words
    .join(' ')
}

/**
 * Generate a topic cloud word list
 */
export async function generateTopicCloud(
  maxWords: number = 50
): Promise<Array<{ text: string; value: number }>> {
  const sessions = await getAllSessions()

  const termCounts = new Map<string, number>()
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'site'])

  sessions.forEach(session => {
    // Extract from query
    const queryTerms = session.query.toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(term => term.length > 2 && !stopWords.has(term))

    queryTerms.forEach(term => {
      termCounts.set(term, (termCounts.get(term) || 0) + 2) // Weight queries higher
    })

    // Extract from result titles
    session.savedResults.forEach(result => {
      const titleTerms = result.title.toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(term => term.length > 3 && !stopWords.has(term))

      titleTerms.forEach(term => {
        termCounts.set(term, (termCounts.get(term) || 0) + 1)
      })
    })
  })

  return Array.from(termCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxWords)
    .map(([text, value]) => ({ text, value }))
}
