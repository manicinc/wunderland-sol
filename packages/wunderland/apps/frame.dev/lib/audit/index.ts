/**
 * Audit Logging & Undo/Redo System
 *
 * Public exports for the comprehensive audit logging and undo/redo system.
 *
 * @example
 * ```typescript
 * import { createAuditService, createUndoRedoService } from '@/lib/audit'
 *
 * const auditService = createAuditService(db, sessionId)
 * const undoRedoService = createUndoRedoService(db, auditService)
 *
 * // Log an action
 * await auditService.logAction({
 *   actionType: 'content',
 *   actionName: 'update',
 *   targetType: 'strand',
 *   targetPath: '/weaves/knowledge/intro.md',
 *   oldValue: { content: 'old' },
 *   newValue: { content: 'new' },
 *   isUndoable: true,
 * })
 *
 * // Push undoable action
 * await undoRedoService.pushUndoableAction({
 *   actionType: 'content',
 *   actionName: 'update',
 *   targetType: 'strand',
 *   targetId: 'intro.md',
 *   beforeState: { content: 'old' },
 *   afterState: { content: 'new' },
 * })
 *
 * // Undo
 * if (await undoRedoService.canUndo()) {
 *   await undoRedoService.undo()
 * }
 * ```
 *
 * @module lib/audit
 */

// Types
export type {
  AuditActionType,
  AuditActionName,
  AuditTargetType,
  AuditSource,
  AuditLogEntry,
  AuditLogInput,
  UndoStackEntry,
  UndoStackInput,
  UndoMetadata,
  AuditServiceConfig,
  UndoRedoServiceConfig,
  UndoRedoResult,
  UndoRedoHandler,
  UseAuditLogOptions,
  UseAuditLogReturn,
  UseUndoRedoOptions,
  UseUndoRedoReturn,
  AuditLogQueryOptions,
  AuditStats
} from './types'

// Services
export { AuditService, createAuditService } from './AuditService'
export { UndoRedoService, createUndoRedoService } from './UndoRedoService'

// Database utilities
export {
  initAuditSchema,
  pruneAuditLog,
  clearUndoStack,
  clearExpiredSessions,
  getAuditStats,
  getUndoStackInfo
} from './auditDatabase'
