/**
 * Accomplishment Tracking Types
 * @module lib/accomplishment/types
 *
 * Types for tracking completed tasks, habits, and subtasks as accomplishments.
 * Integrates with reflections, planner, and analytics pages.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Type of accomplishment item
 */
export type AccomplishmentType = 'task' | 'habit' | 'subtask'

/**
 * Time period for aggregation
 */
export type TimePeriod = 'day' | 'week' | 'month'

/**
 * A single accomplishment item (completed task, habit, or subtask)
 */
export interface AccomplishmentItem {
  /** Unique identifier */
  id: string
  /** Type of accomplishment */
  type: AccomplishmentType
  /** Title/name of the item */
  title: string
  /** ISO datetime when completed */
  completedAt: string
  /** YYYY-MM-DD date for grouping */
  completedDate: string
  /** Original task ID (for tasks and subtasks) */
  taskId?: string
  /** Parent task ID (for subtasks only) */
  parentTaskId?: string
  /** Parent task title (for subtasks only) */
  parentTaskTitle?: string
  /** Associated project */
  project?: string
  /** Associated tags */
  tags?: string[]
  /** Current habit streak (for habit completions) */
  habitStreak?: number
  /** Whether this is a habit completion */
  isHabitCompletion?: boolean
  /** Time of day completed (HH:MM) */
  completedTime?: string
}

// ============================================================================
// STATS TYPES
// ============================================================================

/**
 * Aggregated accomplishment statistics
 */
export interface AccomplishmentStats {
  /** Total items completed in period */
  totalCompleted: number
  /** Tasks completed */
  tasksCompleted: number
  /** Subtasks completed */
  subtasksCompleted: number
  /** Habit completions */
  habitCompletions: number
  /** Items completed today */
  completedToday: number
  /** Items completed this week */
  completedThisWeek: number
  /** Items completed this month */
  completedThisMonth: number
  /** Current streak of days with at least 1 completion */
  taskCompletionStreak: number
  /** Longest streak ever */
  longestTaskStreak: number
  /** Average completions per day */
  averagePerDay: number
  /** Day with most completions */
  peakDay: { date: string; count: number } | null
  /** Completions grouped by project */
  byProject: Array<{ project: string; count: number }>
  /** Completions grouped by tag */
  byTag: Array<{ tag: string; count: number }>
}

/**
 * Time series data point for charts
 */
export interface TimeSeriesPoint {
  date: string
  count: number
  tasks: number
  subtasks: number
  habits: number
}

// ============================================================================
// AGGREGATION TYPES
// ============================================================================

/**
 * Daily accomplishments with summary stats
 */
export interface DailyAccomplishments {
  /** Date in YYYY-MM-DD format */
  date: string
  /** All accomplishments for the day */
  items: AccomplishmentItem[]
  /** Daily summary stats */
  stats: {
    total: number
    tasks: number
    subtasks: number
    habits: number
  }
  /** Whether this has been synced to reflection */
  reflectionSynced: boolean
}

/**
 * Weekly accomplishments
 */
export interface WeeklyAccomplishments {
  /** ISO week year */
  year: number
  /** ISO week number (1-53) */
  week: number
  /** Start date of week (YYYY-MM-DD) */
  startDate: string
  /** End date of week (YYYY-MM-DD) */
  endDate: string
  /** Daily breakdown */
  days: DailyAccomplishments[]
  /** Week summary stats */
  stats: AccomplishmentStats
}

/**
 * Monthly accomplishments
 */
export interface MonthlyAccomplishments {
  /** Year */
  year: number
  /** Month (1-12) */
  month: number
  /** Daily breakdown */
  days: DailyAccomplishments[]
  /** Month summary stats */
  stats: AccomplishmentStats
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Configuration for syncing accomplishments to reflections
 */
export interface AccomplishmentSyncConfig {
  /** Whether sync is enabled */
  enabled: boolean
  /** Auto-sync on reflection creation */
  autoSync: boolean
  /** Include subtasks in sync */
  includeSubtasks: boolean
  /** Include habit completions in sync */
  includeHabits: boolean
  /** Group items by project in output */
  groupByProject: boolean
  /** Show timestamps in output */
  showTimestamps: boolean
  /** Markdown format for output */
  markdownFormat: 'bullets' | 'checklist' | 'numbered'
}

/**
 * Default sync configuration
 */
export const DEFAULT_SYNC_CONFIG: AccomplishmentSyncConfig = {
  enabled: true,
  autoSync: false,
  includeSubtasks: true,
  includeHabits: true,
  groupByProject: true,
  showTimestamps: false,
  markdownFormat: 'checklist',
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Event emitted when an item is completed
 */
export interface AccomplishmentCompletedEvent {
  item: AccomplishmentItem
  timestamp: string
}

/**
 * Callback for accomplishment subscription
 */
export type AccomplishmentCallback = (event: AccomplishmentCompletedEvent) => void

// ============================================================================
// STREAK TYPES
// ============================================================================

/**
 * Task completion streak info
 */
export interface TaskCompletionStreak {
  /** Current streak in days */
  current: number
  /** Longest streak ever */
  longest: number
  /** Days until streak breaks (0 if already completed today) */
  daysUntilBreak: number
  /** Last completion date */
  lastCompletionDate: string | null
  /** Dates in current streak */
  streakDates: string[]
}

// ============================================================================
// QUERY TYPES
// ============================================================================

/**
 * Options for querying accomplishments
 */
export interface AccomplishmentQueryOptions {
  /** Start date (inclusive, YYYY-MM-DD) */
  startDate?: string
  /** End date (inclusive, YYYY-MM-DD) */
  endDate?: string
  /** Filter by type */
  types?: AccomplishmentType[]
  /** Filter by project */
  project?: string
  /** Filter by tags (any match) */
  tags?: string[]
  /** Include only habit completions */
  habitsOnly?: boolean
  /** Limit results */
  limit?: number
  /** Offset for pagination */
  offset?: number
  /** Sort order */
  sortOrder?: 'asc' | 'desc'
}
