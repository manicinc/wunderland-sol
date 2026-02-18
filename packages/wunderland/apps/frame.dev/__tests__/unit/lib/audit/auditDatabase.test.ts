/**
 * Tests for lib/audit/auditDatabase.ts
 *
 * Tests database schema initialization and utility functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  initAuditSchema,
  pruneAuditLog,
  clearUndoStack,
  clearExpiredSessions,
  getAuditStats,
  getUndoStackInfo
} from '@/lib/audit/auditDatabase'
import type { StorageAdapter } from '@framers/sql-storage-adapter'

// ============================================================================
// MOCK HELPERS
// ============================================================================

function createMockDb() {
  return {
    exec: vi.fn().mockResolvedValue(undefined),
    run: vi.fn().mockResolvedValue(undefined),
    all: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null)
  } as unknown as StorageAdapter
}

// ============================================================================
// SCHEMA INITIALIZATION TESTS
// ============================================================================

describe('initAuditSchema', () => {
  it('creates audit_log table', async () => {
    const db = createMockDb()
    await initAuditSchema(db)

    const calls = (db.exec as ReturnType<typeof vi.fn>).mock.calls
    const createTableCall = calls.find(call =>
      call[0].includes('CREATE TABLE IF NOT EXISTS codex_audit_log')
    )

    expect(createTableCall).toBeDefined()
  })

  it('creates undo_stack table', async () => {
    const db = createMockDb()
    await initAuditSchema(db)

    const calls = (db.exec as ReturnType<typeof vi.fn>).mock.calls
    const createTableCall = calls.find(call =>
      call[0].includes('CREATE TABLE IF NOT EXISTS codex_undo_stack')
    )

    expect(createTableCall).toBeDefined()
  })

  it('creates undo_metadata table', async () => {
    const db = createMockDb()
    await initAuditSchema(db)

    const calls = (db.exec as ReturnType<typeof vi.fn>).mock.calls
    const createTableCall = calls.find(call =>
      call[0].includes('CREATE TABLE IF NOT EXISTS codex_undo_metadata')
    )

    expect(createTableCall).toBeDefined()
  })

  it('creates indexes for audit_log', async () => {
    const db = createMockDb()
    await initAuditSchema(db)

    const calls = (db.exec as ReturnType<typeof vi.fn>).mock.calls
    const indexCalls = calls.filter(call =>
      call[0].includes('CREATE INDEX IF NOT EXISTS')
    )

    expect(indexCalls.length).toBeGreaterThanOrEqual(5)

    // Check specific indexes
    const hasTimestampIndex = indexCalls.some(call =>
      call[0].includes('idx_audit_log_timestamp')
    )
    const hasSessionIndex = indexCalls.some(call =>
      call[0].includes('idx_audit_log_session')
    )
    const hasActionTypeIndex = indexCalls.some(call =>
      call[0].includes('idx_audit_log_action_type')
    )
    const hasTargetPathIndex = indexCalls.some(call =>
      call[0].includes('idx_audit_log_target_path')
    )
    const hasUndoableIndex = indexCalls.some(call =>
      call[0].includes('idx_audit_log_undoable')
    )

    expect(hasTimestampIndex).toBe(true)
    expect(hasSessionIndex).toBe(true)
    expect(hasActionTypeIndex).toBe(true)
    expect(hasTargetPathIndex).toBe(true)
    expect(hasUndoableIndex).toBe(true)
  })

  it('creates indexes for undo_stack', async () => {
    const db = createMockDb()
    await initAuditSchema(db)

    const calls = (db.exec as ReturnType<typeof vi.fn>).mock.calls
    const indexCalls = calls.filter(call =>
      call[0].includes('idx_undo_stack')
    )

    expect(indexCalls.length).toBeGreaterThanOrEqual(2)
  })
})

// ============================================================================
// PRUNE AUDIT LOG TESTS
// ============================================================================

describe('pruneAuditLog', () => {
  it('prunes entries older than retention days', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 100 }])

    const pruned = await pruneAuditLog(db, 90)

    expect(pruned).toBe(100)
    expect(db.run).toHaveBeenCalled()
    expect(db.all).toHaveBeenCalled()
  })

  it('uses default retention of 90 days', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 50 }])

    const pruned = await pruneAuditLog(db)

    expect(pruned).toBe(50)
  })

  it('returns 0 when no entries to prune', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 0 }])

    const pruned = await pruneAuditLog(db, 30)

    expect(pruned).toBe(0)
  })

  it('handles errors gracefully', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'))

    const pruned = await pruneAuditLog(db, 90)

    expect(pruned).toBe(0)
  })

  it('handles missing count result', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const pruned = await pruneAuditLog(db, 90)

    expect(pruned).toBe(0)
  })
})

// ============================================================================
// CLEAR UNDO STACK TESTS
// ============================================================================

describe('clearUndoStack', () => {
  it('clears undo stack for session', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'undo_1' },
      { id: 'undo_2' }
    ])

    const result = await clearUndoStack(db, 'session_123')

    expect(result).toBe(true)
    expect(db.run).toHaveBeenCalledTimes(2) // metadata + stack
  })

  it('handles empty stack', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const result = await clearUndoStack(db, 'session_empty')

    expect(result).toBe(true)
    expect(db.run).toHaveBeenCalledTimes(1) // only stack delete
  })

  it('handles errors gracefully', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'))

    const result = await clearUndoStack(db, 'session_error')

    expect(result).toBe(false)
  })

  it('deletes metadata first then stack entries', async () => {
    const db = createMockDb()
    const callOrder: string[] = []

    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'undo_1' }])
    ;(db.run as ReturnType<typeof vi.fn>).mockImplementation((sql) => {
      if (sql.includes('codex_undo_metadata')) {
        callOrder.push('metadata')
      } else if (sql.includes('codex_undo_stack')) {
        callOrder.push('stack')
      }
      return Promise.resolve(undefined)
    })

    await clearUndoStack(db, 'session_123')

    expect(callOrder).toEqual(['metadata', 'stack'])
  })
})

// ============================================================================
// CLEAR EXPIRED SESSIONS TESTS
// ============================================================================

describe('clearExpiredSessions', () => {
  it('clears sessions older than 24 hours', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { session_id: 'old_session_1' },
        { session_id: 'old_session_2' }
      ]) // find old sessions
      .mockResolvedValue([]) // for clearUndoStack calls

    const cleared = await clearExpiredSessions(db)

    expect(cleared).toBe(2)
  })

  it('returns 0 when no expired sessions', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const cleared = await clearExpiredSessions(db)

    expect(cleared).toBe(0)
  })

  it('handles errors gracefully', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'))

    const cleared = await clearExpiredSessions(db)

    expect(cleared).toBe(0)
  })

  it('handles null result', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const cleared = await clearExpiredSessions(db)

    expect(cleared).toBe(0)
  })
})

// ============================================================================
// GET AUDIT STATS TESTS
// ============================================================================

describe('getAuditStats', () => {
  it('returns complete statistics', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ count: 1000 }]) // total
      .mockResolvedValueOnce([{ count: 200 }]) // undoable
      .mockResolvedValueOnce([{ count: 10 }]) // sessions
      .mockResolvedValueOnce([{ ts: '2024-01-01T00:00:00Z' }]) // oldest
      .mockResolvedValueOnce([{ ts: '2024-01-15T00:00:00Z' }]) // newest
      .mockResolvedValueOnce([
        { action_type: 'file', count: 300 },
        { action_type: 'content', count: 500 }
      ]) // byType

    const stats = await getAuditStats(db)

    expect(stats.totalEntries).toBe(1000)
    expect(stats.undoableEntries).toBe(200)
    expect(stats.uniqueSessions).toBe(10)
    expect(stats.oldestEntry).toBe('2024-01-01T00:00:00Z')
    expect(stats.newestEntry).toBe('2024-01-15T00:00:00Z')
    expect(stats.entriesByType.file).toBe(300)
    expect(stats.entriesByType.content).toBe(500)
  })

  it('handles empty database', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ ts: null }])
      .mockResolvedValueOnce([{ ts: null }])
      .mockResolvedValueOnce([])

    const stats = await getAuditStats(db)

    expect(stats.totalEntries).toBe(0)
    expect(stats.undoableEntries).toBe(0)
    expect(stats.uniqueSessions).toBe(0)
    expect(stats.oldestEntry).toBeUndefined()
    expect(stats.newestEntry).toBeUndefined()
    expect(stats.entriesByType).toEqual({})
  })

  it('handles errors gracefully', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'))

    const stats = await getAuditStats(db)

    expect(stats.totalEntries).toBe(0)
    expect(stats.undoableEntries).toBe(0)
    expect(stats.entriesByType).toEqual({})
  })

  it('handles null results', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const stats = await getAuditStats(db)

    expect(stats.totalEntries).toBe(0)
  })
})

// ============================================================================
// GET UNDO STACK INFO TESTS
// ============================================================================

describe('getUndoStackInfo', () => {
  it('returns stack info for session', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ count: 10 }]) // total
      .mockResolvedValueOnce([{ count: 8 }]) // active
      .mockResolvedValueOnce([{ pos: 7 }]) // position

    const info = await getUndoStackInfo(db, 'session_123')

    expect(info.totalEntries).toBe(10)
    expect(info.activeEntries).toBe(8)
    expect(info.currentPosition).toBe(7)
  })

  it('handles empty stack', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ pos: null }])

    const info = await getUndoStackInfo(db, 'session_empty')

    expect(info.totalEntries).toBe(0)
    expect(info.activeEntries).toBe(0)
    expect(info.currentPosition).toBe(-1)
  })

  it('handles errors gracefully', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'))

    const info = await getUndoStackInfo(db, 'session_error')

    expect(info.totalEntries).toBe(0)
    expect(info.activeEntries).toBe(0)
    expect(info.currentPosition).toBe(-1)
  })

  it('handles null results', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const info = await getUndoStackInfo(db, 'session_null')

    expect(info.totalEntries).toBe(0)
    expect(info.activeEntries).toBe(0)
    expect(info.currentPosition).toBe(-1)
  })
})

// ============================================================================
// INTEGRATION-STYLE TESTS
// ============================================================================

describe('integration scenarios', () => {
  it('schema initialization followed by operations', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 0 }])

    await initAuditSchema(db)
    const pruned = await pruneAuditLog(db, 90)
    const stats = await getAuditStats(db)

    expect(db.exec).toHaveBeenCalled()
    expect(pruned).toBe(0)
    expect(stats.totalEntries).toBe(0)
  })

  it('clear stack then get info', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([]) // clearUndoStack: get stack entries
      .mockResolvedValueOnce([{ count: 0 }]) // getUndoStackInfo: total
      .mockResolvedValueOnce([{ count: 0 }]) // getUndoStackInfo: active
      .mockResolvedValueOnce([{ pos: null }]) // getUndoStackInfo: position

    await clearUndoStack(db, 'session_test')
    const info = await getUndoStackInfo(db, 'session_test')

    expect(info.totalEntries).toBe(0)
    expect(info.currentPosition).toBe(-1)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('edge cases', () => {
  it('handles very long session IDs', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const longSessionId = 'session_' + 'x'.repeat(1000)
    const result = await clearUndoStack(db, longSessionId)

    expect(result).toBe(true)
  })

  it('handles special characters in session ID', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const result = await clearUndoStack(db, "session_with'quotes")

    expect(result).toBe(true)
  })

  it('handles zero retention days', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 500 }])

    const pruned = await pruneAuditLog(db, 0)

    expect(pruned).toBe(500)
  })

  it('handles negative retention days', async () => {
    const db = createMockDb()
    ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 1000 }])

    const pruned = await pruneAuditLog(db, -1)

    expect(pruned).toBe(1000)
  })
})
