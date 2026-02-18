/**
 * Audit Database Schema
 *
 * Defines the SQL schema for audit logging and undo/redo functionality.
 * Integrated with the main codexDatabase.ts initialization.
 *
 * @module lib/audit/auditDatabase
 */

import type { StorageAdapter } from '@framers/sql-storage-adapter'

// ============================================================================
// SCHEMA INITIALIZATION
// ============================================================================

/**
 * Initialize audit-related database tables
 * Called as part of the main schema initialization in codexDatabase.ts
 */
export async function initAuditSchema(db: StorageAdapter): Promise<void> {
  // ========================================================================
  // AUDIT LOG TABLE (Append-only event stream)
  // ========================================================================
  await db.exec(`
    CREATE TABLE IF NOT EXISTS codex_audit_log (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      session_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_name TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      target_path TEXT,
      old_value TEXT,
      new_value TEXT,
      is_undoable INTEGER DEFAULT 0,
      undo_group_id TEXT,
      duration_ms INTEGER,
      source TEXT DEFAULT 'user'
    )
  `)

  // Indexes for common queries
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp
    ON codex_audit_log(timestamp DESC)
  `)
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_session
    ON codex_audit_log(session_id)
  `)
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_action_type
    ON codex_audit_log(action_type)
  `)
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_target_path
    ON codex_audit_log(target_path)
  `)
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_undoable
    ON codex_audit_log(is_undoable) WHERE is_undoable = 1
  `)

  // API audit index for faster queries
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_log_api
    ON codex_audit_log(action_type, target_id)
    WHERE action_type = 'api'
  `)

  // ========================================================================
  // UNDO STACK TABLE (Session-scoped, mutable)
  // ========================================================================
  await db.exec(`
    CREATE TABLE IF NOT EXISTS codex_undo_stack (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      stack_position INTEGER NOT NULL,
      audit_log_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      before_state TEXT NOT NULL,
      after_state TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `)

  // Indexes for undo/redo operations
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_undo_stack_session
    ON codex_undo_stack(session_id)
  `)
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_undo_stack_position
    ON codex_undo_stack(session_id, stack_position DESC)
  `)
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_undo_stack_active
    ON codex_undo_stack(session_id, is_active) WHERE is_active = 1
  `)

  // ========================================================================
  // UNDO METADATA TABLE (For complex multi-entity operations)
  // ========================================================================
  await db.exec(`
    CREATE TABLE IF NOT EXISTS codex_undo_metadata (
      id TEXT PRIMARY KEY,
      undo_stack_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL
    )
  `)

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_undo_metadata_stack
    ON codex_undo_metadata(undo_stack_id)
  `)

  console.log('[AuditDB] Audit schema initialized')
}

// ============================================================================
// CLEANUP UTILITIES
// ============================================================================

/**
 * Prune old audit log entries (retention policy)
 * @param db - Database adapter
 * @param retentionDays - Days to retain (default: 90)
 */
export async function pruneAuditLog(
  db: StorageAdapter,
  retentionDays: number = 90
): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  const cutoffISO = cutoffDate.toISOString()

  try {
    // Get count before delete
    const beforeCount = await db.all(
      'SELECT COUNT(*) as count FROM codex_audit_log WHERE timestamp < ?',
      [cutoffISO]
    ) as Array<{ count: number }>

    await db.run(
      'DELETE FROM codex_audit_log WHERE timestamp < ?',
      [cutoffISO]
    )

    const pruned = beforeCount?.[0]?.count || 0
    if (pruned > 0) {
      console.log(`[AuditDB] Pruned ${pruned} old audit entries`)
    }
    return pruned
  } catch (error) {
    console.error('[AuditDB] Failed to prune audit log:', error)
    return 0
  }
}

/**
 * Clear undo stack for a session
 * @param db - Database adapter
 * @param sessionId - Session to clear
 */
export async function clearUndoStack(
  db: StorageAdapter,
  sessionId: string
): Promise<boolean> {
  try {
    // First get stack IDs to clean up metadata
    const stackEntries = await db.all(
      'SELECT id FROM codex_undo_stack WHERE session_id = ?',
      [sessionId]
    ) as Array<{ id: string }>

    if (stackEntries && stackEntries.length > 0) {
      const ids = stackEntries.map(e => `'${e.id}'`).join(',')
      await db.run(`DELETE FROM codex_undo_metadata WHERE undo_stack_id IN (${ids})`)
    }

    await db.run(
      'DELETE FROM codex_undo_stack WHERE session_id = ?',
      [sessionId]
    )

    return true
  } catch (error) {
    console.error('[AuditDB] Failed to clear undo stack:', error)
    return false
  }
}

/**
 * Clear all expired sessions (sessions older than 24 hours)
 * @param db - Database adapter
 */
export async function clearExpiredSessions(db: StorageAdapter): Promise<number> {
  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - 24)
  const cutoffISO = cutoff.toISOString()

  try {
    // Find old sessions
    const oldSessions = await db.all(
      `SELECT DISTINCT session_id FROM codex_undo_stack
       WHERE created_at < ?`,
      [cutoffISO]
    ) as Array<{ session_id: string }>

    let cleared = 0
    for (const { session_id } of oldSessions || []) {
      await clearUndoStack(db, session_id)
      cleared++
    }

    if (cleared > 0) {
      console.log(`[AuditDB] Cleared ${cleared} expired sessions`)
    }
    return cleared
  } catch (error) {
    console.error('[AuditDB] Failed to clear expired sessions:', error)
    return 0
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get audit log statistics
 * @param db - Database adapter
 */
export async function getAuditStats(db: StorageAdapter): Promise<{
  totalEntries: number
  undoableEntries: number
  entriesByType: Record<string, number>
  uniqueSessions: number
  oldestEntry?: string
  newestEntry?: string
}> {
  try {
    const [total, undoable, sessions, oldest, newest, byType] = await Promise.all([
      db.all('SELECT COUNT(*) as count FROM codex_audit_log') as Promise<Array<{ count: number }>>,
      db.all('SELECT COUNT(*) as count FROM codex_audit_log WHERE is_undoable = 1') as Promise<Array<{ count: number }>>,
      db.all('SELECT COUNT(DISTINCT session_id) as count FROM codex_audit_log') as Promise<Array<{ count: number }>>,
      db.all('SELECT MIN(timestamp) as ts FROM codex_audit_log') as Promise<Array<{ ts: string | null }>>,
      db.all('SELECT MAX(timestamp) as ts FROM codex_audit_log') as Promise<Array<{ ts: string | null }>>,
      db.all('SELECT action_type, COUNT(*) as count FROM codex_audit_log GROUP BY action_type') as Promise<Array<{ action_type: string; count: number }>>
    ])

    const entriesByType: Record<string, number> = {}
    for (const row of byType || []) {
      entriesByType[row.action_type] = row.count
    }

    return {
      totalEntries: total?.[0]?.count || 0,
      undoableEntries: undoable?.[0]?.count || 0,
      entriesByType,
      uniqueSessions: sessions?.[0]?.count || 0,
      oldestEntry: oldest?.[0]?.ts || undefined,
      newestEntry: newest?.[0]?.ts || undefined
    }
  } catch (error) {
    console.error('[AuditDB] Failed to get stats:', error)
    return {
      totalEntries: 0,
      undoableEntries: 0,
      entriesByType: {},
      uniqueSessions: 0
    }
  }
}

/**
 * Get undo stack info for a session
 * @param db - Database adapter
 * @param sessionId - Session ID
 */
export async function getUndoStackInfo(
  db: StorageAdapter,
  sessionId: string
): Promise<{
  totalEntries: number
  activeEntries: number
  currentPosition: number
}> {
  try {
    const [total, active, position] = await Promise.all([
      db.all(
        'SELECT COUNT(*) as count FROM codex_undo_stack WHERE session_id = ?',
        [sessionId]
      ) as Promise<Array<{ count: number }>>,
      db.all(
        'SELECT COUNT(*) as count FROM codex_undo_stack WHERE session_id = ? AND is_active = 1',
        [sessionId]
      ) as Promise<Array<{ count: number }>>,
      db.all(
        'SELECT MAX(stack_position) as pos FROM codex_undo_stack WHERE session_id = ? AND is_active = 1',
        [sessionId]
      ) as Promise<Array<{ pos: number | null }>>
    ])

    return {
      totalEntries: total?.[0]?.count || 0,
      activeEntries: active?.[0]?.count || 0,
      currentPosition: position?.[0]?.pos ?? -1
    }
  } catch (error) {
    console.error('[AuditDB] Failed to get undo stack info:', error)
    return {
      totalEntries: 0,
      activeEntries: 0,
      currentPosition: -1
    }
  }
}
