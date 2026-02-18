/**
 * Audit Logging & Undo/Redo Type Definitions
 *
 * Provides TypeScript interfaces for the comprehensive audit logging
 * and undo/redo system built on @framers/sql-storage-adapter.
 *
 * @module lib/audit/types
 */

// ============================================================================
// ACTION TYPE ENUMS
// ============================================================================

/**
 * Categories of auditable actions
 */
export type AuditActionType =
  | 'file'        // File operations (create, delete, rename, move)
  | 'content'     // Content editing (body text, markdown)
  | 'metadata'    // Metadata changes (title, tags, frontmatter)
  | 'tree'        // Tree operations (drag-drop reorganization)
  | 'learning'    // Learning features (flashcards, quizzes)
  | 'navigation'  // Navigation events (view, search, jump)
  | 'settings'    // User settings/preferences
  | 'bookmark'    // Bookmark operations
  | 'api'         // API token and access events

/**
 * Specific action names within each type
 */
export type AuditActionName =
  // File actions
  | 'create'
  | 'delete'
  | 'rename'
  | 'move'
  | 'duplicate'
  // Content actions
  | 'update'
  | 'publish'
  | 'revert'
  | 'restore_draft'
  // Metadata actions
  | 'update_title'
  | 'update_tags'
  | 'update_frontmatter'
  // Navigation actions
  | 'view'
  | 'search'
  | 'jump_to_heading'
  | 'jump_to_source'
  // Learning actions
  | 'flashcard_create'
  | 'flashcard_update'
  | 'flashcard_delete'
  | 'flashcard_review'
  | 'quiz_attempt'
  | 'quiz_complete'
  // Bookmark actions
  | 'bookmark_add'
  | 'bookmark_remove'
  // Settings actions
  | 'setting_update'
  // API actions
  | 'token_create'
  | 'token_validate'
  | 'token_revoke'
  | 'token_delete'
  | 'auth_fail'
  | 'rate_limit'

/**
 * Types of entities that can be targeted by actions
 */
export type AuditTargetType =
  | 'strand'
  | 'weave'
  | 'loom'
  | 'fabric'
  | 'flashcard'
  | 'flashcard_deck'
  | 'quiz'
  | 'quiz_question'
  | 'glossary_term'
  | 'bookmark'
  | 'draft'
  | 'setting'
  | 'search_query'
  | 'api_token'

/**
 * Source of the action
 */
export type AuditSource =
  | 'user'          // Direct user interaction
  | 'autosave'      // Auto-save system
  | 'sync'          // GitHub sync
  | 'import'        // Data import
  | 'undo'          // Undo operation
  | 'redo'          // Redo operation
  | 'system'        // System-generated
  | 'api'           // API request

// ============================================================================
// AUDIT LOG RECORD
// ============================================================================

/**
 * A single entry in the audit log (append-only)
 */
export interface AuditLogEntry {
  /** Unique identifier */
  id: string
  /** ISO timestamp of when the action occurred */
  timestamp: string
  /** Browser session identifier */
  sessionId: string
  /** Category of action */
  actionType: AuditActionType
  /** Specific action name */
  actionName: AuditActionName
  /** Type of entity being acted upon */
  targetType: AuditTargetType
  /** ID of the target entity (if applicable) */
  targetId?: string
  /** Path of the target (for file-based entities) */
  targetPath?: string
  /** State before the action (JSON) */
  oldValue?: Record<string, unknown>
  /** State after the action (JSON) */
  newValue?: Record<string, unknown>
  /** Whether this action can be undone */
  isUndoable: boolean
  /** Group ID for batched undo operations */
  undoGroupId?: string
  /** Duration of the action in milliseconds */
  durationMs?: number
  /** Source of the action */
  source: AuditSource
}

/**
 * Input for creating a new audit log entry
 */
export interface AuditLogInput {
  actionType: AuditActionType
  actionName: AuditActionName
  targetType: AuditTargetType
  targetId?: string
  targetPath?: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  isUndoable?: boolean
  undoGroupId?: string
  durationMs?: number
  source?: AuditSource
}

// ============================================================================
// UNDO/REDO STACK
// ============================================================================

/**
 * A single entry in the undo stack
 */
export interface UndoStackEntry {
  /** Unique identifier */
  id: string
  /** Session this entry belongs to */
  sessionId: string
  /** Position in the stack (0 = oldest) */
  stackPosition: number
  /** Reference to the audit log entry */
  auditLogId: string
  /** Type of entity */
  targetType: AuditTargetType
  /** ID of the target entity */
  targetId: string
  /** State before the action (for undo) */
  beforeState: Record<string, unknown>
  /** State after the action (for redo) */
  afterState: Record<string, unknown>
  /** Whether this entry is active (not undone) */
  isActive: boolean
}

/**
 * Input for creating a new undo stack entry
 * Note: auditLogId is generated internally by UndoRedoService
 */
export interface UndoStackInput {
  targetType: AuditTargetType
  targetId: string
  beforeState: Record<string, unknown>
  afterState: Record<string, unknown>
}

/**
 * Metadata attached to an undo stack entry
 */
export interface UndoMetadata {
  id: string
  undoStackId: string
  key: string
  value: string
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Configuration for the audit service
 */
export interface AuditServiceConfig {
  /** Batch write delay in milliseconds (default: 100) */
  batchDelayMs?: number
  /** Maximum entries to keep in audit log (default: 10000) */
  maxLogEntries?: number
  /** Days to retain audit entries (default: 90) */
  retentionDays?: number
  /** Whether to log navigation events (default: true) */
  logNavigation?: boolean
  /** Whether to log learning events (default: true) */
  logLearning?: boolean
}

/**
 * Configuration for the undo/redo service
 */
export interface UndoRedoServiceConfig {
  /** Maximum undo stack size (default: 50) */
  maxStackSize?: number
  /** Whether to persist across page refreshes (default: false) */
  persistAcrossRefresh?: boolean
}

/**
 * Undo/redo operation result
 */
export interface UndoRedoResult {
  success: boolean
  entry?: UndoStackEntry
  error?: string
  /** Applied state (either beforeState for undo or afterState for redo) */
  appliedState?: Record<string, unknown>
}

/**
 * Handler function for applying undo/redo state
 */
export type UndoRedoHandler = (
  targetType: AuditTargetType,
  targetId: string,
  state: Record<string, unknown>,
  isUndo: boolean
) => Promise<boolean>

// ============================================================================
// HOOK INTERFACES
// ============================================================================

/**
 * Props for useAuditLog hook
 */
export interface UseAuditLogOptions {
  /** Configuration overrides */
  config?: AuditServiceConfig
}

/**
 * Return type for useAuditLog hook
 */
export interface UseAuditLogReturn {
  /** Current session ID */
  sessionId: string
  /** Log a new action */
  logAction: (input: AuditLogInput) => Promise<string | null>
  /** Get recent actions */
  getRecentActions: (limit?: number) => Promise<AuditLogEntry[]>
  /** Get actions by type */
  getActionsByType: (actionType: AuditActionType, limit?: number) => Promise<AuditLogEntry[]>
  /** Get actions for a specific target */
  getActionsForTarget: (targetPath: string, limit?: number) => Promise<AuditLogEntry[]>
  /** Check if logging is ready */
  isReady: boolean
}

/**
 * Props for useUndoRedo hook
 */
export interface UseUndoRedoOptions {
  /** Configuration overrides */
  config?: UndoRedoServiceConfig
  /** Handler for applying state changes */
  onApplyState?: UndoRedoHandler
}

/**
 * Return type for useUndoRedo hook
 */
export interface UseUndoRedoReturn {
  /** Whether undo is available */
  canUndo: boolean
  /** Whether redo is available */
  canRedo: boolean
  /** Number of undoable actions */
  undoCount: number
  /** Number of redoable actions */
  redoCount: number
  /** Perform undo */
  undo: () => Promise<UndoRedoResult>
  /** Perform redo */
  redo: () => Promise<UndoRedoResult>
  /** Push a new undoable action */
  pushUndoableAction: (input: UndoStackInput & {
    actionType: AuditActionType
    actionName: AuditActionName
  }) => Promise<string | null>
  /** Clear the undo/redo stack */
  clearStack: () => Promise<void>
  /** Check if system is ready */
  isReady: boolean
}

// ============================================================================
// QUERY INTERFACES
// ============================================================================

/**
 * Options for querying audit log
 */
export interface AuditLogQueryOptions {
  /** Filter by action type */
  actionType?: AuditActionType
  /** Filter by action name */
  actionName?: AuditActionName
  /** Filter by target type */
  targetType?: AuditTargetType
  /** Filter by target path (prefix match) */
  targetPathPrefix?: string
  /** Filter by session ID */
  sessionId?: string
  /** Filter by source */
  source?: AuditSource
  /** Only undoable actions */
  undoableOnly?: boolean
  /** Start timestamp (ISO) */
  startTime?: string
  /** End timestamp (ISO) */
  endTime?: string
  /** Maximum results */
  limit?: number
  /** Offset for pagination */
  offset?: number
  /** Order by timestamp (default: 'desc') */
  order?: 'asc' | 'desc'
}

/**
 * Aggregated audit statistics
 */
export interface AuditStats {
  totalActions: number
  actionsByType: Record<AuditActionType, number>
  actionsByDay: Array<{ date: string; count: number }>
  mostEditedFiles: Array<{ path: string; count: number }>
  sessionCount: number
  averageActionsPerSession: number
}
