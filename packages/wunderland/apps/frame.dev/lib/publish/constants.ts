/**
 * Batch Publisher Constants
 * @module lib/publish/constants
 *
 * Default values, path templates, and configuration constants
 * for the batch publishing system.
 */

import type {
  PublisherPreferences,
  BatchStrategy,
  PublishMode,
  ConflictResolution,
  ExportFormat,
  PublishPriority,
  SyncStatus,
} from './types';

// ============================================================================
// STORAGE KEYS
// ============================================================================

/**
 * localStorage key for publisher preferences
 */
export const PUBLISHER_PREFERENCES_KEY = 'quarry-publisher-preferences';

/**
 * localStorage key for pending publish queue (backup)
 */
export const PUBLISHER_QUEUE_KEY = 'quarry-publisher-queue';

/**
 * IndexedDB database name for publish data
 */
export const PUBLISH_DB_NAME = 'frame-publish';

/**
 * IndexedDB version
 */
export const PUBLISH_DB_VERSION = 1;

// ============================================================================
// PATH TEMPLATES
// ============================================================================

/**
 * Default path template for reflections
 * Variables: {year}, {month}, {day}, {date}
 */
export const DEFAULT_REFLECTIONS_PATH = 'reflections/{year}/{month}';

/**
 * Default path template for strands
 * Variables: {weave}, {loom}, {slug}, {title}
 */
export const DEFAULT_STRANDS_PATH = 'content/{weave}';

/**
 * Default path template for projects
 * Variables: {slug}, {title}, {type}
 */
export const DEFAULT_PROJECTS_PATH = 'projects/{slug}';

/**
 * Available path template variables
 */
export const PATH_TEMPLATE_VARIABLES = {
  reflections: ['year', 'month', 'day', 'date', 'weekday'],
  strands: ['weave', 'loom', 'slug', 'title', 'type'],
  projects: ['slug', 'title', 'type', 'status'],
} as const;

// ============================================================================
// PR TEMPLATES
// ============================================================================

/**
 * Default PR title template
 * Variables: {date_range}, {summary}, {strategy}, {count}, {date}
 */
export const DEFAULT_PR_TITLE_TEMPLATE = '{date_range} - {summary}';

/**
 * Default PR body template
 */
export const DEFAULT_PR_BODY_TEMPLATE = `## Summary

{summary_list}

## Changes

{file_list}

{diff_stats}

---
*Published via [frame.dev](https://frame.dev) batch publisher*`;

/**
 * PR title variables
 */
export const PR_TITLE_VARIABLES = [
  'date_range',   // "Dec 23-29, 2024"
  'summary',      // "5 reflections, 2 strands"
  'strategy',     // "weekly", "daily", etc.
  'count',        // Total item count
  'date',         // Current date
] as const;

/**
 * PR body variables
 */
export const PR_BODY_VARIABLES = [
  'summary_list', // Bullet list of changes
  'file_list',    // List of files changed
  'diff_stats',   // +X/-Y lines
  'date_range',
  'strategy',
  'count',
] as const;

// ============================================================================
// DEFAULT PREFERENCES
// ============================================================================

/**
 * Default publisher preferences
 */
export const DEFAULT_PUBLISHER_PREFERENCES: PublisherPreferences = {
  // Mode settings
  publishMode: 'manual',
  batchStrategy: 'weekly',
  autoMergePRs: false,

  // Schedule (for auto-batch mode)
  scheduleEnabled: false,
  scheduleTime: '09:00',
  scheduleDays: [1, 2, 3, 4, 5], // Monday-Friday

  // Content selection
  publishReflections: true,
  publishStrands: true,
  publishProjects: true,

  // GitHub target
  targetRepo: null,

  // Path templates
  reflectionsPath: DEFAULT_REFLECTIONS_PATH,
  strandsPath: DEFAULT_STRANDS_PATH,
  projectsPath: DEFAULT_PROJECTS_PATH,

  // Conflict handling
  defaultConflictResolution: 'keep-local',

  // PR configuration
  prTitleTemplate: DEFAULT_PR_TITLE_TEMPLATE,
  prBodyTemplate: DEFAULT_PR_BODY_TEMPLATE,
  includeDiffStats: true,

  // Export options
  exportFormat: 'markdown',
  exportIncludeFrontmatter: true,
};

// ============================================================================
// BATCH STRATEGIES
// ============================================================================

/**
 * Batch strategy labels
 */
export const BATCH_STRATEGY_LABELS: Record<BatchStrategy, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  'all-pending': 'All Pending',
  manual: 'Manual Selection',
};

/**
 * Batch strategy descriptions
 */
export const BATCH_STRATEGY_DESCRIPTIONS: Record<BatchStrategy, string> = {
  daily: 'Group changes by day',
  weekly: 'Group changes by week (recommended)',
  monthly: 'Group changes by month',
  'all-pending': 'Include all pending changes in one batch',
  manual: 'Manually select items to publish',
};

// ============================================================================
// PUBLISH MODES
// ============================================================================

/**
 * Publish mode labels
 */
export const PUBLISH_MODE_LABELS: Record<PublishMode, string> = {
  manual: 'Manual',
  'auto-batch': 'Auto-Batch',
  'direct-commit': 'Direct Commit',
};

/**
 * Publish mode descriptions
 */
export const PUBLISH_MODE_DESCRIPTIONS: Record<PublishMode, string> = {
  manual: 'Publish when you trigger it explicitly',
  'auto-batch': 'Automatically batch and publish on schedule',
  'direct-commit': 'Commit directly to branch without PR (advanced)',
};

// ============================================================================
// SYNC STATUS
// ============================================================================

/**
 * Sync status labels
 */
export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  local: 'Local Only',
  pending: 'Pending',
  syncing: 'Syncing',
  synced: 'Synced',
  modified: 'Modified',
  conflict: 'Conflict',
  failed: 'Failed',
};

/**
 * Sync status colors (Tailwind classes)
 */
export const SYNC_STATUS_COLORS: Record<SyncStatus, { bg: string; text: string; dot: string }> = {
  local: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    dot: 'bg-gray-400',
  },
  pending: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  syncing: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  synced: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  modified: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
  conflict: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
  },
  failed: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-600',
  },
};

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

/**
 * Conflict resolution labels
 */
export const CONFLICT_RESOLUTION_LABELS: Record<ConflictResolution, string> = {
  'keep-local': 'Keep Local',
  'keep-remote': 'Keep Remote',
  merge: 'Merge',
  skip: 'Skip',
};

/**
 * Conflict resolution descriptions
 */
export const CONFLICT_RESOLUTION_DESCRIPTIONS: Record<ConflictResolution, string> = {
  'keep-local': 'Overwrite remote with your local changes',
  'keep-remote': 'Discard local changes and use remote version',
  merge: 'Attempt to automatically merge both versions',
  skip: 'Skip this item and keep it pending',
};

// ============================================================================
// PRIORITY
// ============================================================================

/**
 * Priority labels
 */
export const PRIORITY_LABELS: Record<PublishPriority, string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

/**
 * Priority weights for sorting (higher = processed first)
 */
export const PRIORITY_WEIGHTS: Record<PublishPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Export format labels
 */
export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  markdown: 'Markdown',
  json: 'JSON',
  zip: 'ZIP Archive',
  combined: 'Combined Markdown',
};

/**
 * Export format descriptions
 */
export const EXPORT_FORMAT_DESCRIPTIONS: Record<ExportFormat, string> = {
  markdown: 'Individual markdown files',
  json: 'Structured JSON with metadata',
  zip: 'ZIP file with folder structure',
  combined: 'All content in a single markdown file',
};

/**
 * Export format MIME types
 */
export const EXPORT_MIME_TYPES: Record<ExportFormat, string> = {
  markdown: 'text/markdown',
  json: 'application/json',
  zip: 'application/zip',
  combined: 'text/markdown',
};

/**
 * Default export filename pattern
 */
export const DEFAULT_EXPORT_FILENAME_PATTERN = '{date}-{title}';

// ============================================================================
// LIMITS & THRESHOLDS
// ============================================================================

/**
 * Maximum items per batch
 */
export const MAX_BATCH_SIZE = 100;

/**
 * Maximum file size for single file (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Maximum total batch size (50MB)
 */
export const MAX_BATCH_TOTAL_SIZE = 50 * 1024 * 1024;

/**
 * Maximum retry attempts for failed items
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Retry delay base (ms) - uses exponential backoff
 */
export const RETRY_DELAY_BASE = 1000;

/**
 * GitHub API rate limit buffer (keep some requests in reserve)
 */
export const RATE_LIMIT_BUFFER = 100;

/**
 * Batch processing timeout (10 minutes)
 */
export const BATCH_TIMEOUT = 10 * 60 * 1000;

/**
 * PR polling interval (5 seconds)
 */
export const PR_POLL_INTERVAL = 5000;

/**
 * PR polling timeout (5 minutes)
 */
export const PR_POLL_TIMEOUT = 5 * 60 * 1000;

// ============================================================================
// SCHEDULE
// ============================================================================

/**
 * Day of week labels
 */
export const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/**
 * Short day labels
 */
export const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Minimum schedule interval for periodic sync (24 hours)
 */
export const MIN_SCHEDULE_INTERVAL = 24 * 60 * 60 * 1000;

// ============================================================================
// BRANCH NAMING
// ============================================================================

/**
 * Branch name prefix for publish batches
 */
export const BRANCH_PREFIX = 'publish';

/**
 * Generate branch name for a batch
 */
export function generateBranchName(strategy: BatchStrategy, date?: Date): string {
  const d = date || new Date();
  const timestamp = d.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).slice(2, 6);
  return `${BRANCH_PREFIX}/${strategy}-${timestamp}-${random}`;
}

// ============================================================================
// CONTENT HASH
// ============================================================================

/**
 * Generate a simple hash of content for change detection
 * Uses DJB2 algorithm
 */
export function hashContent(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = (hash * 33) ^ content.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format date range for PR title
 */
export function formatDateRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleString('en-US', { month: 'short' });
  const endMonth = end.toLocaleString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    if (startDay === endDay) {
      return `${startMonth} ${startDay}, ${year}`;
    }
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Format content summary for PR title
 */
export function formatContentSummary(
  counts: { reflections?: number; strands?: number; projects?: number }
): string {
  const parts: string[] = [];

  if (counts.reflections && counts.reflections > 0) {
    parts.push(`${counts.reflections} reflection${counts.reflections === 1 ? '' : 's'}`);
  }
  if (counts.strands && counts.strands > 0) {
    parts.push(`${counts.strands} strand${counts.strands === 1 ? '' : 's'}`);
  }
  if (counts.projects && counts.projects > 0) {
    parts.push(`${counts.projects} project${counts.projects === 1 ? '' : 's'}`);
  }

  if (parts.length === 0) {
    return 'No changes';
  }

  return parts.join(', ');
}

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generate unique batch ID
 */
export function generateBatchId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 9);
  return `batch-${timestamp}-${random}`;
}

/**
 * Generate unique history entry ID
 */
export function generateHistoryId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 9);
  return `hist-${timestamp}-${random}`;
}
