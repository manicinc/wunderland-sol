/**
 * Sync Types
 * @module lib/sync/types
 *
 * Types for offline sync queue and conflict resolution.
 */

/**
 * Types of operations that can be queued
 */
export type SyncOperationType =
  | 'create'
  | 'update'
  | 'delete'
  | 'ai-request'
  | 'transcription'
  | 'calendar-sync'
  | 'template-fetch'

/**
 * Priority levels for sync operations
 */
export type SyncPriority = 'low' | 'normal' | 'high' | 'critical'

/**
 * Status of a queued operation
 */
export type SyncOperationStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'conflict'

/**
 * A queued sync operation
 */
export interface SyncOperation {
  id: string
  type: SyncOperationType
  priority: SyncPriority
  status: SyncOperationStatus

  // Target resource
  resourceType: string // 'strand', 'task', 'event', 'template', etc.
  resourceId: string

  // Operation data
  payload: unknown

  // Metadata
  createdAt: string // ISO timestamp
  attemptCount: number
  lastAttemptAt?: string
  errorMessage?: string

  // For conflict resolution
  localVersion?: number
  serverVersion?: number
  conflictData?: ConflictData
}

/**
 * Conflict data for resolution
 */
export interface ConflictData {
  localState: unknown
  serverState: unknown
  conflictFields: string[]
  autoResolvable: boolean
}

/**
 * Conflict resolution strategies
 */
export type ConflictStrategy =
  | 'local-wins'      // Keep local changes
  | 'server-wins'     // Use server state
  | 'merge'           // Attempt automatic merge
  | 'manual'          // Require user intervention
  | 'newest-wins'     // Use most recent timestamp

/**
 * Resolution result
 */
export interface ResolutionResult {
  resolved: boolean
  strategy: ConflictStrategy
  mergedState?: unknown
  requiresManualReview: boolean
}

/**
 * Sync queue statistics
 */
export interface SyncQueueStats {
  pending: number
  inProgress: number
  failed: number
  conflicts: number
  total: number
  oldestPending?: string
}

/**
 * Online status
 */
export interface OnlineStatus {
  isOnline: boolean
  lastOnlineAt?: string
  lastOfflineAt?: string
  connectionType?: 'wifi' | 'cellular' | 'ethernet' | 'unknown'
}

/**
 * Sync event types for listeners
 */
export type SyncEventType =
  | 'operation-queued'
  | 'operation-started'
  | 'operation-completed'
  | 'operation-failed'
  | 'conflict-detected'
  | 'conflict-resolved'
  | 'online'
  | 'offline'
  | 'sync-started'
  | 'sync-completed'

/**
 * Sync event payload
 */
export interface SyncEvent {
  type: SyncEventType
  operation?: SyncOperation
  timestamp: string
  details?: unknown
}

/**
 * Sync event listener
 */
export type SyncEventListener = (event: SyncEvent) => void
