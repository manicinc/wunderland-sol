/**
 * Audit Service
 *
 * Manages audit log entries with batched async writes for performance.
 * Uses @framers/sql-storage-adapter for IndexedDB persistence.
 *
 * @module lib/audit/AuditService
 */

import type { StorageAdapter } from '@framers/sql-storage-adapter'
import type {
  AuditLogEntry,
  AuditLogInput,
  AuditLogQueryOptions,
  AuditServiceConfig,
  AuditStats,
  AuditActionType
} from './types'
import { pruneAuditLog } from './auditDatabase'

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: Required<AuditServiceConfig> = {
  batchDelayMs: 100,
  maxLogEntries: 10000,
  retentionDays: 90,
  logNavigation: true,
  logLearning: true
}

// ============================================================================
// AUDIT SERVICE CLASS
// ============================================================================

/**
 * Service for managing audit log entries
 */
export class AuditService {
  private db: StorageAdapter
  private sessionId: string
  private config: Required<AuditServiceConfig>
  private pendingWrites: AuditLogEntry[] = []
  private writeTimer: NodeJS.Timeout | null = null
  private isInitialized = false

  constructor(
    db: StorageAdapter,
    sessionId: string,
    config?: AuditServiceConfig
  ) {
    this.db = db
    this.sessionId = sessionId
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize the service (prune old entries)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Prune old entries on startup
    await pruneAuditLog(this.db, this.config.retentionDays)
    this.isInitialized = true
  }

  /**
   * Generate a unique ID for an audit entry
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }

  /**
   * Log a new action
   */
  async logAction(input: AuditLogInput): Promise<string | null> {
    // Skip navigation events if disabled
    if (!this.config.logNavigation && input.actionType === 'navigation') {
      return null
    }

    // Skip learning events if disabled
    if (!this.config.logLearning && input.actionType === 'learning') {
      return null
    }

    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      actionType: input.actionType,
      actionName: input.actionName,
      targetType: input.targetType,
      targetId: input.targetId,
      targetPath: input.targetPath,
      oldValue: input.oldValue,
      newValue: input.newValue,
      isUndoable: input.isUndoable ?? false,
      undoGroupId: input.undoGroupId,
      durationMs: input.durationMs,
      source: input.source ?? 'user'
    }

    this.pendingWrites.push(entry)
    this.scheduleBatchWrite()

    return entry.id
  }

  /**
   * Schedule a batched write to the database
   */
  private scheduleBatchWrite(): void {
    if (this.writeTimer) return

    this.writeTimer = setTimeout(async () => {
      await this.flushWrites()
      this.writeTimer = null
    }, this.config.batchDelayMs)
  }

  /**
   * Flush all pending writes to the database
   */
  async flushWrites(): Promise<void> {
    if (this.pendingWrites.length === 0) return

    const entries = [...this.pendingWrites]
    this.pendingWrites = []

    try {
      for (const entry of entries) {
        await this.db.run(
          `INSERT INTO codex_audit_log (
            id, timestamp, session_id, action_type, action_name,
            target_type, target_id, target_path, old_value, new_value,
            is_undoable, undo_group_id, duration_ms, source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            entry.id,
            entry.timestamp,
            entry.sessionId,
            entry.actionType,
            entry.actionName,
            entry.targetType,
            entry.targetId || null,
            entry.targetPath || null,
            entry.oldValue ? JSON.stringify(entry.oldValue) : null,
            entry.newValue ? JSON.stringify(entry.newValue) : null,
            entry.isUndoable ? 1 : 0,
            entry.undoGroupId || null,
            entry.durationMs || null,
            entry.source
          ]
        )
      }

      // Enforce max entries limit
      await this.enforceMaxEntries()
    } catch (error) {
      console.error('[AuditService] Failed to write entries:', error)
      // Re-add failed entries for retry
      this.pendingWrites.unshift(...entries)
    }
  }

  /**
   * Enforce maximum log entries limit
   */
  private async enforceMaxEntries(): Promise<void> {
    try {
      const countResult = await this.db.all(
        'SELECT COUNT(*) as count FROM codex_audit_log'
      ) as Array<{ count: number }>

      const count = countResult?.[0]?.count || 0

      if (count > this.config.maxLogEntries) {
        const excess = count - this.config.maxLogEntries
        await this.db.run(
          `DELETE FROM codex_audit_log WHERE id IN (
            SELECT id FROM codex_audit_log
            ORDER BY timestamp ASC
            LIMIT ?
          )`,
          [excess]
        )
      }
    } catch (error) {
      console.error('[AuditService] Failed to enforce max entries:', error)
    }
  }

  /**
   * Query audit log entries
   */
  async queryEntries(options: AuditLogQueryOptions = {}): Promise<AuditLogEntry[]> {
    await this.flushWrites() // Ensure pending writes are committed

    const conditions: string[] = []
    const params: unknown[] = []

    if (options.actionType) {
      conditions.push('action_type = ?')
      params.push(options.actionType)
    }

    if (options.actionName) {
      conditions.push('action_name = ?')
      params.push(options.actionName)
    }

    if (options.targetType) {
      conditions.push('target_type = ?')
      params.push(options.targetType)
    }

    if (options.targetPathPrefix) {
      conditions.push('target_path LIKE ?')
      params.push(`${options.targetPathPrefix}%`)
    }

    if (options.sessionId) {
      conditions.push('session_id = ?')
      params.push(options.sessionId)
    }

    if (options.source) {
      conditions.push('source = ?')
      params.push(options.source)
    }

    if (options.undoableOnly) {
      conditions.push('is_undoable = 1')
    }

    if (options.startTime) {
      conditions.push('timestamp >= ?')
      params.push(options.startTime)
    }

    if (options.endTime) {
      conditions.push('timestamp <= ?')
      params.push(options.endTime)
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : ''

    const orderBy = `ORDER BY timestamp ${options.order === 'asc' ? 'ASC' : 'DESC'}`
    const limit = options.limit ? `LIMIT ${options.limit}` : 'LIMIT 100'
    const offset = options.offset ? `OFFSET ${options.offset}` : ''

    try {
      const rows = await this.db.all(
        `SELECT * FROM codex_audit_log ${whereClause} ${orderBy} ${limit} ${offset}`,
        params
      ) as Array<{
        id: string
        timestamp: string
        session_id: string
        action_type: string
        action_name: string
        target_type: string
        target_id: string | null
        target_path: string | null
        old_value: string | null
        new_value: string | null
        is_undoable: number
        undo_group_id: string | null
        duration_ms: number | null
        source: string
      }>

      return (rows || []).map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        sessionId: row.session_id,
        actionType: row.action_type as AuditLogEntry['actionType'],
        actionName: row.action_name as AuditLogEntry['actionName'],
        targetType: row.target_type as AuditLogEntry['targetType'],
        targetId: row.target_id || undefined,
        targetPath: row.target_path || undefined,
        oldValue: row.old_value ? JSON.parse(row.old_value) : undefined,
        newValue: row.new_value ? JSON.parse(row.new_value) : undefined,
        isUndoable: row.is_undoable === 1,
        undoGroupId: row.undo_group_id || undefined,
        durationMs: row.duration_ms || undefined,
        source: row.source as AuditLogEntry['source']
      }))
    } catch (error) {
      console.error('[AuditService] Query failed:', error)
      return []
    }
  }

  /**
   * Get recent actions for the current session
   */
  async getRecentActions(limit: number = 50): Promise<AuditLogEntry[]> {
    return this.queryEntries({
      sessionId: this.sessionId,
      limit,
      order: 'desc'
    })
  }

  /**
   * Get actions by type
   */
  async getActionsByType(
    actionType: AuditActionType,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    return this.queryEntries({
      actionType,
      limit,
      order: 'desc'
    })
  }

  /**
   * Get actions for a specific target path
   */
  async getActionsForTarget(
    targetPath: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    await this.flushWrites()

    try {
      const rows = await this.db.all(
        `SELECT * FROM codex_audit_log
         WHERE target_path = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
        [targetPath, limit]
      ) as Array<{
        id: string
        timestamp: string
        session_id: string
        action_type: string
        action_name: string
        target_type: string
        target_id: string | null
        target_path: string | null
        old_value: string | null
        new_value: string | null
        is_undoable: number
        undo_group_id: string | null
        duration_ms: number | null
        source: string
      }>

      return (rows || []).map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        sessionId: row.session_id,
        actionType: row.action_type as AuditLogEntry['actionType'],
        actionName: row.action_name as AuditLogEntry['actionName'],
        targetType: row.target_type as AuditLogEntry['targetType'],
        targetId: row.target_id || undefined,
        targetPath: row.target_path || undefined,
        oldValue: row.old_value ? JSON.parse(row.old_value) : undefined,
        newValue: row.new_value ? JSON.parse(row.new_value) : undefined,
        isUndoable: row.is_undoable === 1,
        undoGroupId: row.undo_group_id || undefined,
        durationMs: row.duration_ms || undefined,
        source: row.source as AuditLogEntry['source']
      }))
    } catch (error) {
      console.error('[AuditService] Failed to get actions for target:', error)
      return []
    }
  }

  /**
   * Get entry by ID
   */
  async getEntry(id: string): Promise<AuditLogEntry | null> {
    await this.flushWrites()

    try {
      const rows = await this.db.all(
        'SELECT * FROM codex_audit_log WHERE id = ?',
        [id]
      ) as Array<{
        id: string
        timestamp: string
        session_id: string
        action_type: string
        action_name: string
        target_type: string
        target_id: string | null
        target_path: string | null
        old_value: string | null
        new_value: string | null
        is_undoable: number
        undo_group_id: string | null
        duration_ms: number | null
        source: string
      }>

      if (!rows || rows.length === 0) return null

      const row = rows[0]
      return {
        id: row.id,
        timestamp: row.timestamp,
        sessionId: row.session_id,
        actionType: row.action_type as AuditLogEntry['actionType'],
        actionName: row.action_name as AuditLogEntry['actionName'],
        targetType: row.target_type as AuditLogEntry['targetType'],
        targetId: row.target_id || undefined,
        targetPath: row.target_path || undefined,
        oldValue: row.old_value ? JSON.parse(row.old_value) : undefined,
        newValue: row.new_value ? JSON.parse(row.new_value) : undefined,
        isUndoable: row.is_undoable === 1,
        undoGroupId: row.undo_group_id || undefined,
        durationMs: row.duration_ms || undefined,
        source: row.source as AuditLogEntry['source']
      }
    } catch (error) {
      console.error('[AuditService] Failed to get entry:', error)
      return null
    }
  }

  /**
   * Get aggregated statistics
   */
  async getStats(): Promise<AuditStats> {
    await this.flushWrites()

    try {
      const [total, byType, byDay, mostEdited, sessions] = await Promise.all([
        this.db.all('SELECT COUNT(*) as count FROM codex_audit_log') as Promise<Array<{ count: number }>>,
        this.db.all(`
          SELECT action_type, COUNT(*) as count
          FROM codex_audit_log
          GROUP BY action_type
        `) as Promise<Array<{ action_type: string; count: number }>>,
        this.db.all(`
          SELECT date(timestamp) as date, COUNT(*) as count
          FROM codex_audit_log
          GROUP BY date(timestamp)
          ORDER BY date DESC
          LIMIT 30
        `) as Promise<Array<{ date: string; count: number }>>,
        this.db.all(`
          SELECT target_path, COUNT(*) as count
          FROM codex_audit_log
          WHERE target_path IS NOT NULL AND action_type IN ('content', 'metadata', 'file')
          GROUP BY target_path
          ORDER BY count DESC
          LIMIT 10
        `) as Promise<Array<{ target_path: string; count: number }>>,
        this.db.all('SELECT COUNT(DISTINCT session_id) as count FROM codex_audit_log') as Promise<Array<{ count: number }>>
      ])

      const actionsByType: Record<AuditActionType, number> = {
        file: 0,
        content: 0,
        metadata: 0,
        tree: 0,
        learning: 0,
        navigation: 0,
        settings: 0,
        bookmark: 0,
        api: 0
      }

      for (const row of byType || []) {
        if (row.action_type in actionsByType) {
          actionsByType[row.action_type as AuditActionType] = row.count
        }
      }

      const totalActions = total?.[0]?.count || 0
      const sessionCount = sessions?.[0]?.count || 0

      return {
        totalActions,
        actionsByType,
        actionsByDay: (byDay || []).map(row => ({
          date: row.date,
          count: row.count
        })),
        mostEditedFiles: (mostEdited || []).map(row => ({
          path: row.target_path,
          count: row.count
        })),
        sessionCount,
        averageActionsPerSession: sessionCount > 0
          ? Math.round(totalActions / sessionCount)
          : 0
      }
    } catch (error) {
      console.error('[AuditService] Failed to get stats:', error)
      return {
        totalActions: 0,
        actionsByType: {
          file: 0,
          content: 0,
          metadata: 0,
          tree: 0,
          learning: 0,
          navigation: 0,
          settings: 0,
          bookmark: 0,
          api: 0
        },
        actionsByDay: [],
        mostEditedFiles: [],
        sessionCount: 0,
        averageActionsPerSession: 0
      }
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId
  }

  /**
   * Cleanup on service destruction
   */
  async destroy(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer)
      this.writeTimer = null
    }
    await this.flushWrites()
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new AuditService instance
 */
export function createAuditService(
  db: StorageAdapter,
  sessionId?: string,
  config?: AuditServiceConfig
): AuditService {
  const sid = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  return new AuditService(db, sid, config)
}
