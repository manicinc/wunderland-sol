/**
 * Batch Publisher Types
 * @module lib/publish/types
 *
 * Type definitions for the batch publishing system.
 * Enables intelligent batching, queueing, and conflict resolution
 * when publishing reflections and other content to GitHub.
 */

// ============================================================================
// ENUMS & LITERALS
// ============================================================================

/**
 * Publish mode options
 * - manual: User triggers publish explicitly
 * - auto-batch: System batches and publishes on schedule
 * - direct-commit: Commit directly without PR (advanced)
 */
export type PublishMode = 'manual' | 'auto-batch' | 'direct-commit';

/**
 * Batch strategy options
 * - daily: Group changes by day
 * - weekly: Group changes by week
 * - monthly: Group changes by month
 * - all-pending: Include all pending changes
 * - manual: User-selected items only
 */
export type BatchStrategy = 'daily' | 'weekly' | 'monthly' | 'all-pending' | 'manual';

/**
 * Sync status for publishable content
 * - local: Only exists locally, never published
 * - pending: Queued for publishing
 * - syncing: Currently being published
 * - synced: Successfully published, in sync with remote
 * - modified: Local changes since last publish
 * - conflict: Conflict detected with remote
 * - failed: Publish failed
 */
export type SyncStatus = 'local' | 'pending' | 'syncing' | 'synced' | 'modified' | 'conflict' | 'failed';

/**
 * Content types that can be published
 */
export type PublishableContentType = 'reflection' | 'strand' | 'project';

/**
 * Conflict resolution strategies
 * - keep-local: Keep local changes, overwrite remote
 * - keep-remote: Discard local changes, use remote
 * - merge: Attempt automatic merge
 * - skip: Skip this item in the batch
 */
export type ConflictResolution = 'keep-local' | 'keep-remote' | 'merge' | 'skip';

/**
 * Batch status
 */
export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'conflict';

/**
 * PR state
 */
export type PRState = 'open' | 'merged' | 'closed';

/**
 * History action types
 */
export type PublishAction = 'created' | 'updated' | 'deleted' | 'conflict-resolved';

/**
 * Export format options
 */
export type ExportFormat = 'markdown' | 'json' | 'zip' | 'combined';

/**
 * Export grouping options
 */
export type ExportGrouping = 'type' | 'date' | 'flat';

// ============================================================================
// PREFERENCES
// ============================================================================

/**
 * GitHub repository target configuration
 */
export interface GitHubRepoTarget {
  owner: string;
  repo: string;
  branch: string;
}

/**
 * Publisher preferences (stored in localStorage via UserPreferences)
 */
export interface PublisherPreferences {
  // Mode settings
  publishMode: PublishMode;
  batchStrategy: BatchStrategy;
  autoMergePRs: boolean;

  // Schedule (for auto-batch mode)
  scheduleEnabled: boolean;
  scheduleTime: string;        // HH:mm format
  scheduleDays: number[];      // 0-6 for Sunday-Saturday

  // Content selection
  publishReflections: boolean;
  publishStrands: boolean;
  publishProjects: boolean;

  // GitHub target
  targetRepo: GitHubRepoTarget | null;

  // Path templates (support variables like {year}, {month}, {weave}, {slug})
  reflectionsPath: string;     // Default: 'reflections/{year}/{month}'
  strandsPath: string;         // Default: 'content/{weave}'
  projectsPath: string;        // Default: 'projects/{slug}'

  // Conflict handling
  defaultConflictResolution: ConflictResolution;

  // PR configuration
  prTitleTemplate: string;      // Default: '{date_range} - {summary}'
  prBodyTemplate: string;       // Markdown template for PR body
  includeDiffStats: boolean;    // Include file change stats in PR

  // Export options
  exportFormat: ExportFormat;
  exportIncludeFrontmatter: boolean;
}

// ============================================================================
// BATCH RECORDS
// ============================================================================

/**
 * Metadata stored with a batch
 */
export interface BatchMetadata {
  dateRange?: {
    start: string;  // YYYY-MM-DD
    end: string;    // YYYY-MM-DD
  };
  conflicts?: ConflictInfo[];
  warnings?: string[];
  itemsByType?: {
    reflections?: number;
    strands?: number;
    projects?: number;
  };
}

/**
 * A publish batch record
 */
export interface PublishBatch {
  id: string;
  status: BatchStatus;
  strategy: BatchStrategy;
  contentTypes: PublishableContentType[];

  // Progress tracking
  itemCount: number;
  itemsSynced: number;
  itemsFailed: number;

  // PR info
  prNumber?: number;
  prUrl?: string;
  prState?: PRState;

  // Git info
  commitSha?: string;
  branchName?: string;

  // Timestamps
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;

  // Error info
  error?: string;

  // Additional metadata
  metadata?: BatchMetadata;
}

/**
 * Stored batch record (for database)
 */
export interface StoredPublishBatch {
  id: string;
  status: string;
  strategy: string;
  content_types: string;         // JSON array
  item_count: number;
  items_synced: number;
  items_failed: number;
  pr_number: number | null;
  pr_url: string | null;
  pr_state: string | null;
  commit_sha: string | null;
  branch_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  error: string | null;
  metadata: string | null;       // JSON object
}

// ============================================================================
// CONFLICT HANDLING
// ============================================================================

/**
 * Information about a detected conflict
 */
export interface ConflictInfo {
  contentType: PublishableContentType;
  contentId: string;
  contentPath: string;

  // Hashes for comparison
  localHash: string;
  remoteHash: string;

  // Content for diff display
  localContent: string;
  remoteContent?: string;

  // Timestamps
  localUpdatedAt: string;
  remoteUpdatedAt?: string;

  // Resolution (set by user)
  resolution?: ConflictResolution;
}

/**
 * Result of conflict resolution
 */
export interface ConflictResolutionResult {
  contentId: string;
  resolution: ConflictResolution;
  resolvedContent?: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// HISTORY
// ============================================================================

/**
 * A publish history entry
 */
export interface PublishHistoryEntry {
  id: string;
  batchId?: string;
  contentType: PublishableContentType;
  contentId: string;
  contentPath: string;
  action: PublishAction;
  previousContentHash?: string;
  newContentHash?: string;
  commitSha?: string;
  createdAt: string;
}

/**
 * Stored history entry (for database)
 */
export interface StoredPublishHistory {
  id: string;
  batch_id: string | null;
  content_type: string;
  content_id: string;
  content_path: string;
  action: string;
  previous_content_hash: string | null;
  new_content_hash: string | null;
  commit_sha: string | null;
  created_at: string;
}

/**
 * Options for querying history
 */
export interface HistoryQueryOptions {
  contentType?: PublishableContentType;
  contentId?: string;
  batchId?: string;
  action?: PublishAction;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// QUEUE ITEMS
// ============================================================================

/**
 * Priority levels for queue items
 */
export type PublishPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * An item in the publish queue
 */
export interface PublishQueueItem {
  id: string;
  contentType: PublishableContentType;
  contentId: string;
  contentPath: string;
  content: string;
  metadata: Record<string, unknown>;
  priority: PublishPriority;
  status: SyncStatus;
  batchId?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// JOB PAYLOADS & RESULTS
// ============================================================================

/**
 * Payload for batch-publish job
 */
export interface BatchPublishJobPayload {
  batchId: string;
  strategy: BatchStrategy;
  contentTypes: PublishableContentType[];
  autoMerge: boolean;
  conflictResolutions?: Record<string, ConflictResolution>;
  directCommit?: boolean;
}

/**
 * Result of batch-publish job
 */
export interface BatchPublishJobResult {
  batchId: string;
  itemsPublished: number;
  itemsFailed: number;
  prUrl?: string;
  prMerged: boolean;
  commitSha?: string;
  conflicts: ConflictInfo[];
  requiresResolution?: boolean;
  duration: number;
  warnings: string[];
}

/**
 * Payload for sync-check job
 */
export interface SyncCheckJobPayload {
  contentTypes: PublishableContentType[];
  fullScan?: boolean;
}

/**
 * Result of sync-check job
 */
export interface SyncCheckJobResult {
  itemsChecked: number;
  itemsOutOfSync: number;
  conflicts: ConflictInfo[];
  duration: number;
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  includeFrontmatter: boolean;
  includeMetadata: boolean;
  groupBy: ExportGrouping;
  dateFormat: 'iso' | 'readable';
  filenamePattern: string;  // e.g., '{date}-{title}.md'
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  itemCount: number;
  content?: string;          // For clipboard/markdown
  blob?: Blob;               // For download
  filename?: string;
  error?: string;
}

/**
 * Manifest included in ZIP exports
 */
export interface ExportManifest {
  exportedAt: string;
  format: ExportFormat;
  items: Array<{
    type: PublishableContentType;
    id: string;
    path: string;
    title: string;
    updatedAt: string;
  }>;
  metadata: {
    reflectionCount: number;
    strandCount: number;
    projectCount: number;
    totalWordCount: number;
  };
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Options for creating a batch
 */
export interface CreateBatchOptions {
  strategy: BatchStrategy;
  contentTypes: PublishableContentType[];
  dateRange?: {
    start: string;
    end: string;
  };
  selectedItems?: Array<{
    type: PublishableContentType;
    id: string;
  }>;
}

/**
 * Options for processing a batch
 */
export interface ProcessBatchOptions {
  conflictResolutions?: Record<string, ConflictResolution>;
  onProgress?: (progress: number, message: string) => void;
  directCommit?: boolean;
}

/**
 * Status update during batch processing
 */
export interface BatchPublishStatus {
  phase: 'initializing' | 'detecting-conflicts' | 'preparing' | 'uploading' | 'creating-pr' | 'merging' | 'complete';
  progress: number;
  message: string;
  currentItem?: string;
  itemsProcessed?: number;
  totalItems?: number;
}

/**
 * File change for GitHub
 */
export interface FileChange {
  path: string;
  content: string;
  encoding: 'utf-8' | 'base64';
  action: 'create' | 'update' | 'delete';
}

/**
 * PR info returned after creation
 */
export interface PullRequestInfo {
  number: number;
  url: string;
  htmlUrl: string;
  state: PRState;
  title: string;
  body: string;
  headBranch: string;
  baseBranch: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Publish error codes
 */
export type PublishErrorCode =
  | 'NO_PAT'
  | 'PAT_EXPIRED'
  | 'PAT_INVALID'
  | 'NO_REPO_ACCESS'
  | 'REPO_NOT_FOUND'
  | 'BRANCH_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'CONTENT_TOO_LARGE'
  | 'INVALID_CONTENT'
  | 'NETWORK_ERROR'
  | 'PR_FAILED'
  | 'MERGE_FAILED'
  | 'COMMIT_FAILED'
  | 'UNKNOWN';

/**
 * Custom error class for publish errors
 */
export class PublishError extends Error {
  code: PublishErrorCode;
  retryable: boolean;
  contentId?: string;
  statusCode?: number;

  constructor(
    message: string,
    code: PublishErrorCode,
    options?: {
      retryable?: boolean;
      contentId?: string;
      statusCode?: number;
    }
  ) {
    super(message);
    this.name = 'PublishError';
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.contentId = options?.contentId;
    this.statusCode = options?.statusCode;
  }
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type for usePublisher hook
 */
export interface UsePublisherReturn {
  // State
  settings: PublisherPreferences;
  pendingCount: number;
  isPublishing: boolean;
  currentBatch: PublishBatch | null;
  conflicts: ConflictInfo[];
  error: PublishError | null;

  // Settings actions
  updateSettings: (updates: Partial<PublisherPreferences>) => Promise<void>;

  // Publishing actions
  publishNow: (options?: { strategy?: BatchStrategy }) => Promise<PublishBatch | null>;
  queueItem: (type: PublishableContentType, id: string) => Promise<void>;
  dequeueItem: (type: PublishableContentType, id: string) => Promise<void>;
  resolveConflicts: (resolutions: Record<string, ConflictResolution>) => Promise<void>;
  cancelPublish: () => Promise<void>;

  // Queries
  refreshPendingCount: () => Promise<void>;
}

/**
 * Return type for usePublishQueue hook
 */
export interface UsePublishQueueReturn {
  items: PublishQueueItem[];
  grouped: Record<PublishableContentType, PublishQueueItem[]>;
  loading: boolean;
  error: Error | null;

  // Actions
  addToQueue: (type: PublishableContentType, id: string, priority?: PublishPriority) => Promise<void>;
  removeFromQueue: (type: PublishableContentType, id: string) => Promise<void>;
  updatePriority: (type: PublishableContentType, id: string, priority: PublishPriority) => Promise<void>;
  clearQueue: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Return type for usePublishHistory hook
 */
export interface UsePublishHistoryReturn {
  entries: PublishHistoryEntry[];
  batches: PublishBatch[];
  loading: boolean;
  error: Error | null;

  // Queries
  getEntryById: (id: string) => PublishHistoryEntry | undefined;
  getBatchById: (id: string) => PublishBatch | undefined;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

/**
 * Return type for useExport hook
 */
export interface UseExportReturn {
  isExporting: boolean;
  progress: number;
  error: Error | null;

  // Actions
  exportToClipboard: (items: PublishQueueItem[], options?: Partial<ExportOptions>) => Promise<void>;
  exportToFile: (items: PublishQueueItem[], options?: Partial<ExportOptions>) => Promise<void>;
  exportToZip: (items: PublishQueueItem[], options?: Partial<ExportOptions>) => Promise<void>;
  previewExport: (items: PublishQueueItem[], options?: Partial<ExportOptions>) => Promise<string>;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Sync status update for reflection
 */
export interface ReflectionSyncUpdate {
  dateKey: string;
  status: SyncStatus;
  publishedAt?: string;
  publishedCommit?: string;
  publishedContentHash?: string;
  lastSyncAttempt?: string;
  syncError?: string;
  batchId?: string;
}

/**
 * Sync status update for strand
 */
export interface StrandSyncUpdate {
  strandId: string;
  status: SyncStatus;
  publishedAt?: string;
  publishedCommit?: string;
  publishedContentHash?: string;
  lastSyncAttempt?: string;
  syncError?: string;
  batchId?: string;
}

/**
 * Publishable item (generic wrapper)
 */
export interface PublishableItem {
  type: PublishableContentType;
  id: string;
  path: string;
  title: string;
  content: string;
  contentHash: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  metadata?: Record<string, unknown>;
}
