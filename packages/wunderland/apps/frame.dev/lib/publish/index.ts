/**
 * Batch Publisher Module
 * @module lib/publish
 *
 * Intelligent batch publishing system for reflections, strands, and projects.
 * Supports GitHub sync with conflict resolution, PR creation, and local export.
 */

// Types
export type {
  // Core types
  PublishMode,
  BatchStrategy,
  SyncStatus,
  PublishableContentType,
  ConflictResolution,
  BatchStatus,
  PRState,
  PublishAction,
  ExportFormat,
  ExportGrouping,
  PublishPriority,
  PublishErrorCode,

  // Preferences
  GitHubRepoTarget,
  PublisherPreferences,

  // Batch records
  BatchMetadata,
  PublishBatch,
  StoredPublishBatch,

  // Conflict handling
  ConflictInfo,
  ConflictResolutionResult,

  // History
  PublishHistoryEntry,
  StoredPublishHistory,
  HistoryQueryOptions,

  // Queue items
  PublishQueueItem,

  // Job payloads
  BatchPublishJobPayload,
  BatchPublishJobResult,
  SyncCheckJobPayload,
  SyncCheckJobResult,

  // Export
  ExportOptions,
  ExportResult,
  ExportManifest,

  // Service interfaces
  CreateBatchOptions,
  ProcessBatchOptions,
  BatchPublishStatus,
  FileChange,
  PullRequestInfo,

  // Hook return types
  UsePublisherReturn,
  UsePublishQueueReturn,
  UsePublishHistoryReturn,
  UseExportReturn,

  // Sync updates
  ReflectionSyncUpdate,
  StrandSyncUpdate,
  PublishableItem,
} from './types'

export { PublishError } from './types'

// Constants
export {
  // Storage keys
  PUBLISHER_PREFERENCES_KEY,
  PUBLISHER_QUEUE_KEY,
  PUBLISH_DB_NAME,
  PUBLISH_DB_VERSION,

  // Path templates
  DEFAULT_REFLECTIONS_PATH,
  DEFAULT_STRANDS_PATH,
  DEFAULT_PROJECTS_PATH,
  PATH_TEMPLATE_VARIABLES,

  // PR templates
  DEFAULT_PR_TITLE_TEMPLATE,
  DEFAULT_PR_BODY_TEMPLATE,
  PR_TITLE_VARIABLES,
  PR_BODY_VARIABLES,

  // Preferences
  DEFAULT_PUBLISHER_PREFERENCES,

  // Labels & descriptions
  BATCH_STRATEGY_LABELS,
  BATCH_STRATEGY_DESCRIPTIONS,
  PUBLISH_MODE_LABELS,
  PUBLISH_MODE_DESCRIPTIONS,
  SYNC_STATUS_LABELS,
  SYNC_STATUS_COLORS,
  CONFLICT_RESOLUTION_LABELS,
  CONFLICT_RESOLUTION_DESCRIPTIONS,
  PRIORITY_LABELS,
  PRIORITY_WEIGHTS,
  EXPORT_FORMAT_LABELS,
  EXPORT_FORMAT_DESCRIPTIONS,
  EXPORT_MIME_TYPES,

  // Limits
  MAX_BATCH_SIZE,
  MAX_FILE_SIZE,
  MAX_BATCH_TOTAL_SIZE,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_BASE,
  RATE_LIMIT_BUFFER,
  BATCH_TIMEOUT,
  PR_POLL_INTERVAL,
  PR_POLL_TIMEOUT,

  // Schedule
  DAY_LABELS,
  DAY_LABELS_SHORT,
  MIN_SCHEDULE_INTERVAL,
  BRANCH_PREFIX,

  // Functions
  generateBranchName,
  hashContent,
  formatDateRange,
  formatContentSummary,
  generateBatchId,
  generateHistoryId,
} from './constants'

// Publish Store
export {
  // Batch operations
  createBatch,
  getBatch,
  updateBatch,
  deleteBatch,
  getRecentBatches,
  getBatchesByStatus,
  getActiveBatch,
  cancelPendingBatches,

  // History operations
  recordHistory,
  getHistory,
  getContentHistory,
  getBatchHistory,
  getLastPublishAction,
  getHistoryCount,

  // Sync status
  getPendingCounts,
  getTotalPendingCount,
  updateStrandSyncStatus,
  getPendingStrands,
  bulkUpdateSyncStatus,

  // Statistics
  getBatchStats,

  // Cleanup
  cleanupOldBatches,
  cleanupOldHistory,
} from './publishStore'

// Content Formatter
export {
  // Path formatting
  applyPathTemplate,
  getReflectionPath,
  getStrandPath,
  getProjectPath,
  slugify,

  // Frontmatter
  generateFrontmatter,
  parseFrontmatter,

  // Content formatting
  formatReflection,
  formatStrand,

  // File changes
  createFileChange,
  createReflectionFileChanges,
  createStrandFileChanges,

  // Publishable items
  reflectionToPublishableItem,
  strandToPublishableItem,

  // Export formatting
  formatCombinedMarkdown,
  formatJsonExport,
} from './contentFormatter'

// PR Formatter
export {
  formatPRTitle,
  formatPRBody,
  formatPR,
  formatCommitMessage,
  validateTitleTemplate,
  validateBodyTemplate,
  getAvailableVariables,
  type PRTemplateContext,
  type FormattedPR,
} from './prFormatter'

// Conflict Resolver
export {
  checkConflict,
  checkConflicts,
  resolveConflict,
  resolveConflicts,
  canAutoResolve,
  tryAutoResolve,
  getManualConflicts,
  getAutoResolvableConflicts,
  generateDiffDisplay,
  getConflictSummary,
  type RemoteFileInfo,
  type ConflictCheckResult,
} from './conflictResolver'

// Batch Publisher
export {
  BatchPublisher,
  getBatchPublisher,
  initializeBatchPublisher,
  type BatchPublisherOptions,
} from './batchPublisher'

// Exporter
export {
  copyToClipboard,
  downloadAsFile,
  downloadAsZip,
  previewExport,
  exportItems,
  getExportStats,
  formatSize,
} from './exporter'

// Hooks
export {
  usePublisher,
  usePublishHistory,
  usePendingCounts,
} from './hooks/usePublisher'
