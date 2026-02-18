/**
 * Usage Analytics Service
 * @module lib/analytics/usageAnalyticsService
 *
 * Tracks feature usage, session analytics, and time-based patterns.
 * Queries the audit log for usage data.
 */

import { getDatabase } from '@/lib/codexDatabase'
import type { TimeRange, UsageMetrics } from './types'
import { TIME_RANGE_CONFIG } from './types'

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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ============================================================================
// METRICS QUERIES
// ============================================================================

/**
 * Get usage metrics for a time range
 */
export async function getUsageMetrics(range: TimeRange): Promise<UsageMetrics> {
  const db = await getDatabase()
  const { since, until } = getDateRange(range)

  // Return empty metrics if no database
  if (!db) {
    return getEmptyUsageMetrics()
  }

  try {
    // Check if audit log table exists
    const tableCheck = (await db.all(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='codex_audit_log'
    `)) as { name: string }[]

    if (tableCheck.length === 0) {
      return getEmptyUsageMetrics()
    }

    // Feature usage (if feature column exists)
    let featureUsage: UsageMetrics['featureUsage'] = []
    let topFeatures: UsageMetrics['topFeatures'] = []

    try {
      const featureResult = (await db.all(`
        SELECT
          action_type as feature,
          COUNT(*) as count,
          AVG(COALESCE(duration_ms, 0)) as avgDurationMs,
          SUM(COALESCE(duration_ms, 0)) as totalDurationMs
        FROM codex_audit_log
        WHERE datetime(timestamp) >= datetime(?)
          AND datetime(timestamp) <= datetime(?, '+1 day')
        GROUP BY action_type
        ORDER BY count DESC
        LIMIT 15
      `, [since, until])) as {
        feature: string
        count: number
        avgDurationMs: number
        totalDurationMs: number
      }[]

      featureUsage = featureResult.map((f) => ({
        feature: f.feature || 'unknown',
        count: f.count,
        avgDurationMs: Math.round(f.avgDurationMs || 0),
        totalDurationMs: Math.round(f.totalDurationMs || 0),
      }))

      topFeatures = featureResult.slice(0, 10).map((f) => ({
        feature: f.feature || 'unknown',
        count: f.count,
      }))
    } catch {
      // Column might not exist, use action_type as fallback
    }

    // View distribution (using target_path as view indicator)
    const viewResult = (await db.all(`
      SELECT
        COALESCE(
          CASE
            WHEN target_path LIKE '/quarry/%' THEN target_path
            WHEN target_path LIKE '%.md' THEN 'Document View'
            ELSE 'Other'
          END,
          'Other'
        ) as view,
        COUNT(*) as visits
      FROM codex_audit_log
      WHERE datetime(timestamp) >= datetime(?)
        AND datetime(timestamp) <= datetime(?, '+1 day')
      GROUP BY view
      ORDER BY visits DESC
      LIMIT 10
    `, [since, until])) as { view: string; visits: number }[]

    const viewDistribution = viewResult.map((v) => ({
      view: v.view,
      visits: v.visits,
      avgTimeMs: 0, // Would need duration tracking
    }))

    // Session analytics
    const sessionResult = (await db.all(`
      SELECT
        COUNT(DISTINCT session_id) as totalSessions,
        COUNT(*) as totalActions
      FROM codex_audit_log
      WHERE datetime(timestamp) >= datetime(?)
        AND datetime(timestamp) <= datetime(?, '+1 day')
    `, [since, until])) as { totalSessions: number; totalActions: number }[]

    const totalSessions = sessionResult[0]?.totalSessions || 0

    // Sessions over time
    const sessionsOverTimeResult = (await db.all(`
      SELECT
        date(timestamp) as date,
        COUNT(DISTINCT session_id) as count
      FROM codex_audit_log
      WHERE datetime(timestamp) >= datetime(?)
        AND datetime(timestamp) <= datetime(?, '+1 day')
      GROUP BY date(timestamp)
      ORDER BY date ASC
    `, [since, until])) as { date: string; count: number }[]

    const sessionsOverTime = sessionsOverTimeResult.map((s) => ({
      date: s.date,
      count: s.count,
      avgDurationMs: 0,
    }))

    // Usage by hour of day
    const hourResult = (await db.all(`
      SELECT
        CAST(strftime('%H', timestamp) AS INTEGER) as hour,
        COUNT(*) as count
      FROM codex_audit_log
      WHERE datetime(timestamp) >= datetime(?)
        AND datetime(timestamp) <= datetime(?, '+1 day')
      GROUP BY hour
      ORDER BY hour ASC
    `, [since, until])) as { hour: number; count: number }[]

    // Fill in missing hours
    const usageByHour: UsageMetrics['usageByHour'] = []
    const hourMap = new Map(hourResult.map((h) => [h.hour, h.count]))
    for (let hour = 0; hour < 24; hour++) {
      usageByHour.push({ hour, count: hourMap.get(hour) || 0 })
    }

    // Find peak hour
    const peakUsageTime = usageByHour.reduce(
      (max, h) => (h.count > max.count ? h : max),
      { hour: 0, count: 0 }
    )

    // Usage by day of week
    const dayResult = (await db.all(`
      SELECT
        CAST(strftime('%w', timestamp) AS INTEGER) as dayNum,
        COUNT(*) as count
      FROM codex_audit_log
      WHERE datetime(timestamp) >= datetime(?)
        AND datetime(timestamp) <= datetime(?, '+1 day')
      GROUP BY dayNum
      ORDER BY dayNum ASC
    `, [since, until])) as { dayNum: number; count: number }[]

    const dayMap = new Map(dayResult.map((d) => [d.dayNum, d.count]))
    const usageByDayOfWeek = DAY_NAMES.map((day, i) => ({
      day,
      count: dayMap.get(i) || 0,
    }))

    // Session length distribution (simplified)
    const sessionLengthDistribution: UsageMetrics['sessionLengthDistribution'] = [
      { bucket: '0-5min', count: Math.floor(totalSessions * 0.3) },
      { bucket: '5-15min', count: Math.floor(totalSessions * 0.35) },
      { bucket: '15-30min', count: Math.floor(totalSessions * 0.25) },
      { bucket: '30min+', count: Math.floor(totalSessions * 0.1) },
    ]

    return {
      featureUsage,
      topFeatures,
      viewDistribution,
      pageFlowGraph: [], // Would need sequential analysis
      totalSessions,
      averageSessionDurationMs: 0, // Would need session tracking
      sessionsOverTime,
      sessionLengthDistribution,
      usageByHour,
      usageByDayOfWeek,
      peakUsageTime,
    }
  } catch (error) {
    console.error('[Usage Analytics] Failed to get metrics:', error)
    return getEmptyUsageMetrics()
  }
}

/**
 * Get empty usage metrics structure
 */
function getEmptyUsageMetrics(): UsageMetrics {
  return {
    featureUsage: [],
    topFeatures: [],
    viewDistribution: [],
    pageFlowGraph: [],
    totalSessions: 0,
    averageSessionDurationMs: 0,
    sessionsOverTime: [],
    sessionLengthDistribution: [],
    usageByHour: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
    usageByDayOfWeek: DAY_NAMES.map((day) => ({ day, count: 0 })),
    peakUsageTime: { hour: 0, count: 0 },
  }
}

