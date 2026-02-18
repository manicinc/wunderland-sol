/**
 * Analytics Types
 * @module lib/analytics/types
 *
 * TypeScript interfaces for the analytics system.
 */

// ============================================================================
// TIME RANGE
// ============================================================================

export type TimeRange = 'week' | 'month' | 'quarter' | 'year' | 'all'

export interface TimeRangeConfig {
  label: string
  days: number
  format: string // date-fns format string
}

export const TIME_RANGE_CONFIG: Record<TimeRange, TimeRangeConfig> = {
  week: { label: 'This Week', days: 7, format: 'EEE' },
  month: { label: 'This Month', days: 30, format: 'MMM d' },
  quarter: { label: 'This Quarter', days: 90, format: 'MMM d' },
  year: { label: 'This Year', days: 365, format: 'MMM' },
  all: { label: 'All Time', days: -1, format: 'MMM yyyy' },
}

// ============================================================================
// TIME SERIES DATA
// ============================================================================

export interface TimeSeriesPoint {
  date: string // ISO date string (YYYY-MM-DD)
  count: number
  cumulative?: number
}

export interface TimeSeriesData {
  points: TimeSeriesPoint[]
  total: number
  average: number
  max: { date: string; count: number }
  min: { date: string; count: number }
}

// ============================================================================
// GROWTH METRICS
// ============================================================================

export interface GrowthMetrics {
  /** Strands created over time */
  strandsOverTime: TimeSeriesPoint[]
  /** Total number of strands */
  totalStrands: number
  /** Strands created in current period */
  strandsThisPeriod: number
  /** Previous period strand count for comparison */
  strandsPreviousPeriod: number
  /** Growth rate as percentage */
  growthRate: number
  /** Breakdown by weave */
  byWeave: { name: string; count: number; color?: string }[]
  /** Breakdown by status */
  byStatus: { status: string; count: number }[]
}

// ============================================================================
// TAG METRICS
// ============================================================================

export interface TagMetrics {
  /** Tag counts over time (for stacked area chart) */
  tagEvolution: {
    date: string
    tags: Record<string, number> // tag name -> cumulative count
  }[]
  /** Top tags by usage count */
  topTags: { name: string; count: number }[]
  /** Top subjects by usage count */
  topSubjects: { name: string; count: number }[]
  /** Top topics by usage count */
  topTopics: { name: string; count: number }[]
  /** Total unique tags */
  totalUniqueTags: number
  /** Total unique subjects */
  totalUniqueSubjects: number
  /** Total unique topics */
  totalUniqueTopics: number
  /** Tags added in current period */
  newTagsThisPeriod: string[]
  /** Tag co-occurrence matrix (how often tags appear together) */
  tagCooccurrence?: TagCooccurrenceData
}

/** Tag co-occurrence matrix entry */
export interface TagCooccurrenceEntry {
  /** First tag */
  tagA: string
  /** Second tag */
  tagB: string
  /** Number of strands where both tags appear */
  count: number
  /** Co-occurrence strength (normalized 0-1) */
  strength: number
}

/** Tag co-occurrence data for visualization */
export interface TagCooccurrenceData {
  /** Top tag pairs that appear together */
  topPairs: TagCooccurrenceEntry[]
  /** Tags used in the matrix (for headers) */
  tags: string[]
  /** Full matrix data (tags x tags) */
  matrix: number[][]
}

// ============================================================================
// ACTIVITY METRICS
// ============================================================================

export interface ActivityMetrics {
  /** Activity counts by day */
  activityByDay: TimeSeriesPoint[]
  /** Breakdown by action type */
  byActionType: { type: string; count: number; color: string }[]
  /** Peak activity day */
  peakDay: { date: string; count: number }
  /** Average daily activity */
  averageDaily: number
  /** Total actions in period */
  totalActions: number
  /** Session count */
  sessionCount: number
}

// ============================================================================
// ENGAGEMENT METRICS
// ============================================================================

export interface EngagementMetrics {
  /** Total reading time in seconds */
  totalReadTime: number
  /** Number of completed strands */
  completedStrands: number
  /** Total strands with any progress */
  strandsWithProgress: number
  /** Average read percentage */
  averageReadPercentage: number
  /** Reading activity over time */
  readingByDay: TimeSeriesPoint[]
}

// ============================================================================
// COMBINED ANALYTICS DATA
// ============================================================================

export interface AnalyticsData {
  growth: GrowthMetrics
  tags: TagMetrics
  activity: ActivityMetrics
  engagement: EngagementMetrics
  /** When the data was generated */
  generatedAt: string
  /** Time range used */
  timeRange: TimeRange
}

// ============================================================================
// CHART COLORS
// ============================================================================

export const CHART_COLORS = {
  light: {
    primary: '#10B981', // emerald-500
    secondary: '#06B6D4', // cyan-500
    tertiary: '#8B5CF6', // violet-500
    quaternary: '#F59E0B', // amber-500
    quinary: '#EC4899', // pink-500
    senary: '#3B82F6', // blue-500
    grid: '#E5E7EB', // gray-200
    text: '#374151', // gray-700
    textMuted: '#9CA3AF', // gray-400
    background: '#FFFFFF',
  },
  dark: {
    primary: '#34D399', // emerald-400
    secondary: '#22D3EE', // cyan-400
    tertiary: '#A78BFA', // violet-400
    quaternary: '#FBBF24', // amber-400
    quinary: '#F472B6', // pink-400
    senary: '#60A5FA', // blue-400
    grid: '#3F3F46', // zinc-700
    text: '#E4E4E7', // zinc-200
    textMuted: '#71717A', // zinc-500
    background: '#18181B', // zinc-900
  },
}

/** Color palette for stacked charts (8 colors) */
export const STACKED_COLORS = [
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#8B5CF6', // violet
  '#F59E0B', // amber
  '#EC4899', // pink
  '#3B82F6', // blue
  '#EF4444', // red
  '#84CC16', // lime
]

// ============================================================================
// STAT CARD TYPES
// ============================================================================

export interface StatCardData {
  label: string
  value: number | string
  icon: string // lucide icon name
  color: 'emerald' | 'cyan' | 'violet' | 'amber' | 'pink' | 'blue'
  change?: {
    value: number
    isPositive: boolean
  }
  subtitle?: string
}

// ============================================================================
// GIT COMMIT METRICS
// ============================================================================

export interface GitCommit {
  /** Commit SHA */
  sha: string
  /** Commit message */
  message: string
  /** Author name */
  authorName: string
  /** Author email */
  authorEmail?: string
  /** Commit date (ISO string) */
  committedAt: string
  /** Affected strand path (if applicable) */
  strandPath?: string
  /** Lines added */
  additions?: number
  /** Lines deleted */
  deletions?: number
}

export interface GitCommitMetrics {
  /** Commits over time */
  commitsOverTime: TimeSeriesPoint[]
  /** Total commits in period */
  totalCommits: number
  /** Commits in current period */
  commitsThisPeriod: number
  /** Top contributors by commit count */
  topContributors: { author: string; count: number; avatar?: string }[]
  /** Commits grouped by strand/file */
  byStrand: { path: string; commits: number }[]
  /** Recent commits for display */
  recentCommits: GitCommit[]
  /** Total lines added */
  totalAdditions: number
  /** Total lines deleted */
  totalDeletions: number
}

// ============================================================================
// USAGE METRICS
// ============================================================================

export interface UsageMetrics {
  /** Feature usage counts and durations */
  featureUsage: {
    feature: string
    count: number
    avgDurationMs: number
    totalDurationMs: number
  }[]
  /** Top features by usage count */
  topFeatures: { feature: string; count: number }[]
  /** View/page visit distribution */
  viewDistribution: {
    view: string
    visits: number
    avgTimeMs: number
  }[]
  /** Navigation flow between pages */
  pageFlowGraph: { from: string; to: string; count: number }[]
  /** Session statistics */
  totalSessions: number
  averageSessionDurationMs: number
  sessionsOverTime: {
    date: string
    count: number
    avgDurationMs: number
  }[]
  /** Session length distribution buckets */
  sessionLengthDistribution: {
    bucket: string // "0-5min", "5-15min", "15-30min", "30min+"
    count: number
  }[]
  /** Activity by hour of day (0-23) */
  usageByHour: { hour: number; count: number }[]
  /** Activity by day of week */
  usageByDayOfWeek: { day: string; count: number }[]
  /** Peak usage time */
  peakUsageTime: { hour: number; count: number }
}

// ============================================================================
// ANALYTICS EVENT TYPES
// ============================================================================

export type AnalyticsEventType =
  | 'strand-created'
  | 'strand-updated'
  | 'strand-deleted'
  | 'tag-added'
  | 'tag-removed'
  | 'reading-progress'
  | 'activity-logged'
  | 'commit-recorded'
  | 'session-started'
  | 'session-ended'

export interface AnalyticsEvent {
  type: AnalyticsEventType
  payload: Record<string, unknown>
  timestamp: string
}
