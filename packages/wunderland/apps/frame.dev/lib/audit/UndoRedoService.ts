/**
 * Undo/Redo Service
 *
 * Manages the undo/redo stack with session-scoped state tracking.
 * Works in conjunction with AuditService for complete action tracking.
 *
 * @module lib/audit/UndoRedoService
 */

import type { StorageAdapter } from '@framers/sql-storage-adapter'
import type {
  UndoStackEntry,
  UndoStackInput,
  UndoRedoResult,
  UndoRedoServiceConfig,
  UndoRedoHandler,
  AuditActionType,
  AuditActionName,
  AuditTargetType
} from './types'
import { AuditService } from './AuditService'
import { clearUndoStack } from './auditDatabase'

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: Required<UndoRedoServiceConfig> = {
  maxStackSize: 50,
  persistAcrossRefresh: false
}

// ============================================================================
// UNDO/REDO SERVICE CLASS
// ============================================================================

/**
 * Service for managing undo/redo operations
 */
export class UndoRedoService {
  private db: StorageAdapter
  private sessionId: string
  private auditService: AuditService
  private config: Required<UndoRedoServiceConfig>
  private handler: UndoRedoHandler | null = null
  private currentPosition: number = -1
  private isInitialized = false

  constructor(
    db: StorageAdapter,
    auditService: AuditService,
    config?: UndoRedoServiceConfig
  ) {
    this.db = db
    this.auditService = auditService
    this.sessionId = auditService.getSessionId()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // If not persisting across refresh, clear old stack
    if (!this.config.persistAcrossRefresh) {
      await clearUndoStack(this.db, this.sessionId)
      this.currentPosition = -1
    } else {
      // Load current position from stack
      const result = await this.db.all(
        `SELECT MAX(stack_position) as pos FROM codex_undo_stack
         WHERE session_id = ? AND is_active = 1`,
        [this.sessionId]
      ) as Array<{ pos: number | null }>

      this.currentPosition = result?.[0]?.pos ?? -1
    }

    this.isInitialized = true
  }

  /**
   * Set the handler for applying state changes
   */
  setHandler(handler: UndoRedoHandler): void {
    this.handler = handler
  }

  /**
   * Generate a unique ID for a stack entry
   */
  private generateId(): string {
    return `undo_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }

  /**
   * Push a new undoable action onto the stack
   */
  async pushUndoableAction(
    input: UndoStackInput & {
      actionType: AuditActionType
      actionName: AuditActionName
    }
  ): Promise<string | null> {
    // First log the action to the audit log
    const auditId = await this.auditService.logAction({
      actionType: input.actionType,
      actionName: input.actionName,
      targetType: input.targetType,
      targetId: input.targetId,
      oldValue: input.beforeState,
      newValue: input.afterState,
      isUndoable: true,
      source: 'user'
    })

    if (!auditId) {
      console.error('[UndoRedoService] Failed to log action to audit')
      return null
    }

    try {
      // Invalidate any entries after current position (they get "forked" away)
      await this.db.run(
        `UPDATE codex_undo_stack
         SET is_active = 0
         WHERE session_id = ? AND stack_position > ?`,
        [this.sessionId, this.currentPosition]
      )

      // Increment position
      this.currentPosition++

      // Create new stack entry
      const entryId = this.generateId()
      await this.db.run(
        `INSERT INTO codex_undo_stack (
          id, session_id, stack_position, audit_log_id,
          target_type, target_id, before_state, after_state,
          is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          entryId,
          this.sessionId,
          this.currentPosition,
          auditId,
          input.targetType,
          input.targetId,
          JSON.stringify(input.beforeState),
          JSON.stringify(input.afterState),
          new Date().toISOString()
        ]
      )

      // Enforce max stack size
      await this.enforceMaxStackSize()

      return entryId
    } catch (error) {
      console.error('[UndoRedoService] Failed to push undoable action:', error)
      return null
    }
  }

  /**
   * Enforce maximum stack size by removing oldest entries
   */
  private async enforceMaxStackSize(): Promise<void> {
    try {
      const countResult = await this.db.all(
        `SELECT COUNT(*) as count FROM codex_undo_stack
         WHERE session_id = ? AND is_active = 1`,
        [this.sessionId]
      ) as Array<{ count: number }>

      const count = countResult?.[0]?.count || 0

      if (count > this.config.maxStackSize) {
        const excess = count - this.config.maxStackSize

        // Get IDs of oldest entries to remove
        const toRemove = await this.db.all(
          `SELECT id FROM codex_undo_stack
           WHERE session_id = ? AND is_active = 1
           ORDER BY stack_position ASC
           LIMIT ?`,
          [this.sessionId, excess]
        ) as Array<{ id: string }>

        if (toRemove && toRemove.length > 0) {
          const ids = toRemove.map(r => `'${r.id}'`).join(',')

          // Delete metadata first
          await this.db.run(
            `DELETE FROM codex_undo_metadata WHERE undo_stack_id IN (${ids})`
          )

          // Delete stack entries
          await this.db.run(
            `DELETE FROM codex_undo_stack WHERE id IN (${ids})`
          )

          // Adjust current position
          this.currentPosition -= excess
        }
      }
    } catch (error) {
      console.error('[UndoRedoService] Failed to enforce max stack size:', error)
    }
  }

  /**
   * Check if undo is available
   */
  async canUndo(): Promise<boolean> {
    if (this.currentPosition < 0) return false

    const result = await this.db.all(
      `SELECT COUNT(*) as count FROM codex_undo_stack
       WHERE session_id = ? AND stack_position <= ? AND is_active = 1`,
      [this.sessionId, this.currentPosition]
    ) as Array<{ count: number }>

    return (result?.[0]?.count || 0) > 0
  }

  /**
   * Check if redo is available
   */
  async canRedo(): Promise<boolean> {
    const result = await this.db.all(
      `SELECT COUNT(*) as count FROM codex_undo_stack
       WHERE session_id = ? AND stack_position > ? AND is_active = 0`,
      [this.sessionId, this.currentPosition]
    ) as Array<{ count: number }>

    return (result?.[0]?.count || 0) > 0
  }

  /**
   * Get the number of undoable actions
   */
  async getUndoCount(): Promise<number> {
    if (this.currentPosition < 0) return 0

    const result = await this.db.all(
      `SELECT COUNT(*) as count FROM codex_undo_stack
       WHERE session_id = ? AND stack_position <= ? AND is_active = 1`,
      [this.sessionId, this.currentPosition]
    ) as Array<{ count: number }>

    return result?.[0]?.count || 0
  }

  /**
   * Get the number of redoable actions
   */
  async getRedoCount(): Promise<number> {
    const result = await this.db.all(
      `SELECT COUNT(*) as count FROM codex_undo_stack
       WHERE session_id = ? AND stack_position > ? AND is_active = 0`,
      [this.sessionId, this.currentPosition]
    ) as Array<{ count: number }>

    return result?.[0]?.count || 0
  }

  /**
   * Perform undo operation
   */
  async undo(): Promise<UndoRedoResult> {
    if (!(await this.canUndo())) {
      return { success: false, error: 'Nothing to undo' }
    }

    try {
      // Get the entry at current position
      const entries = await this.db.all(
        `SELECT * FROM codex_undo_stack
         WHERE session_id = ? AND stack_position = ? AND is_active = 1`,
        [this.sessionId, this.currentPosition]
      ) as Array<{
        id: string
        session_id: string
        stack_position: number
        audit_log_id: string
        target_type: string
        target_id: string
        before_state: string
        after_state: string
        is_active: number
        created_at: string
      }>

      if (!entries || entries.length === 0) {
        return { success: false, error: 'Undo entry not found' }
      }

      const row = entries[0]
      const entry: UndoStackEntry = {
        id: row.id,
        sessionId: row.session_id,
        stackPosition: row.stack_position,
        auditLogId: row.audit_log_id,
        targetType: row.target_type as AuditTargetType,
        targetId: row.target_id,
        beforeState: JSON.parse(row.before_state),
        afterState: JSON.parse(row.after_state),
        isActive: row.is_active === 1
      }

      // Apply the before state
      if (this.handler) {
        const success = await this.handler(
          entry.targetType,
          entry.targetId,
          entry.beforeState,
          true // isUndo
        )

        if (!success) {
          return { success: false, error: 'Handler failed to apply state', entry }
        }
      }

      // Mark entry as inactive (undone)
      await this.db.run(
        `UPDATE codex_undo_stack SET is_active = 0 WHERE id = ?`,
        [entry.id]
      )

      // Log the undo action
      await this.auditService.logAction({
        actionType: 'content',
        actionName: 'revert',
        targetType: entry.targetType,
        targetId: entry.targetId,
        oldValue: entry.afterState,
        newValue: entry.beforeState,
        isUndoable: false,
        source: 'undo'
      })

      // Decrement position
      this.currentPosition--

      return {
        success: true,
        entry,
        appliedState: entry.beforeState
      }
    } catch (error) {
      console.error('[UndoRedoService] Undo failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Perform redo operation
   */
  async redo(): Promise<UndoRedoResult> {
    if (!(await this.canRedo())) {
      return { success: false, error: 'Nothing to redo' }
    }

    try {
      // Get the next entry (first inactive entry after current position)
      const entries = await this.db.all(
        `SELECT * FROM codex_undo_stack
         WHERE session_id = ? AND stack_position > ? AND is_active = 0
         ORDER BY stack_position ASC
         LIMIT 1`,
        [this.sessionId, this.currentPosition]
      ) as Array<{
        id: string
        session_id: string
        stack_position: number
        audit_log_id: string
        target_type: string
        target_id: string
        before_state: string
        after_state: string
        is_active: number
        created_at: string
      }>

      if (!entries || entries.length === 0) {
        return { success: false, error: 'Redo entry not found' }
      }

      const row = entries[0]
      const entry: UndoStackEntry = {
        id: row.id,
        sessionId: row.session_id,
        stackPosition: row.stack_position,
        auditLogId: row.audit_log_id,
        targetType: row.target_type as AuditTargetType,
        targetId: row.target_id,
        beforeState: JSON.parse(row.before_state),
        afterState: JSON.parse(row.after_state),
        isActive: row.is_active === 1
      }

      // Apply the after state
      if (this.handler) {
        const success = await this.handler(
          entry.targetType,
          entry.targetId,
          entry.afterState,
          false // isUndo
        )

        if (!success) {
          return { success: false, error: 'Handler failed to apply state', entry }
        }
      }

      // Mark entry as active (redone)
      await this.db.run(
        `UPDATE codex_undo_stack SET is_active = 1 WHERE id = ?`,
        [entry.id]
      )

      // Log the redo action
      await this.auditService.logAction({
        actionType: 'content',
        actionName: 'restore_draft',
        targetType: entry.targetType,
        targetId: entry.targetId,
        oldValue: entry.beforeState,
        newValue: entry.afterState,
        isUndoable: false,
        source: 'redo'
      })

      // Update position to this entry
      this.currentPosition = entry.stackPosition

      return {
        success: true,
        entry,
        appliedState: entry.afterState
      }
    } catch (error) {
      console.error('[UndoRedoService] Redo failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get the current undo stack
   */
  async getStack(): Promise<UndoStackEntry[]> {
    try {
      const rows = await this.db.all(
        `SELECT * FROM codex_undo_stack
         WHERE session_id = ?
         ORDER BY stack_position DESC`,
        [this.sessionId]
      ) as Array<{
        id: string
        session_id: string
        stack_position: number
        audit_log_id: string
        target_type: string
        target_id: string
        before_state: string
        after_state: string
        is_active: number
        created_at: string
      }>

      return (rows || []).map(row => ({
        id: row.id,
        sessionId: row.session_id,
        stackPosition: row.stack_position,
        auditLogId: row.audit_log_id,
        targetType: row.target_type as AuditTargetType,
        targetId: row.target_id,
        beforeState: JSON.parse(row.before_state),
        afterState: JSON.parse(row.after_state),
        isActive: row.is_active === 1
      }))
    } catch (error) {
      console.error('[UndoRedoService] Failed to get stack:', error)
      return []
    }
  }

  /**
   * Clear the undo/redo stack
   */
  async clearStack(): Promise<void> {
    await clearUndoStack(this.db, this.sessionId)
    this.currentPosition = -1
  }

  /**
   * Get current stack position
   */
  getCurrentPosition(): number {
    return this.currentPosition
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new UndoRedoService instance
 */
export function createUndoRedoService(
  db: StorageAdapter,
  auditService: AuditService,
  config?: UndoRedoServiceConfig
): UndoRedoService {
  return new UndoRedoService(db, auditService, config)
}
