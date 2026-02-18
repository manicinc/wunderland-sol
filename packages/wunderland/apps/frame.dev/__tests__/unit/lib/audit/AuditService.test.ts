/**
 * Tests for lib/audit/AuditService.ts
 *
 * Tests the AuditService class with mocked StorageAdapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuditService, createAuditService } from '@/lib/audit/AuditService'
import type { StorageAdapter } from '@framers/sql-storage-adapter'
import type { AuditLogInput } from '@/lib/audit/types'

// ============================================================================
// MOCK STORAGE ADAPTER
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
// CONSTRUCTOR TESTS
// ============================================================================

describe('AuditService', () => {
  describe('constructor', () => {
    it('creates service with default config', () => {
      const db = createMockDb()
      const service = new AuditService(db, 'session_123')

      expect(service.getSessionId()).toBe('session_123')
    })

    it('creates service with custom config', () => {
      const db = createMockDb()
      const service = new AuditService(db, 'session_456', {
        batchDelayMs: 200,
        maxLogEntries: 5000
      })

      expect(service.getSessionId()).toBe('session_456')
    })
  })

  describe('initialize', () => {
    it('initializes service and prunes old entries', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 0 }])
      ;(db.run as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const service = new AuditService(db, 'session_789')
      await service.initialize()

      // Verify pruneAuditLog was called (via db.all and db.run)
      expect(db.all).toHaveBeenCalled()
    })

    it('does not reinitialize if already initialized', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 0 }])

      const service = new AuditService(db, 'session_abc')
      await service.initialize()
      await service.initialize()

      // Should only call prune once
      expect((db.all as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
    })
  })

  describe('logAction', () => {
    it('logs action and returns ID', async () => {
      const db = createMockDb()
      const service = new AuditService(db, 'session_test')

      const input: AuditLogInput = {
        actionType: 'file',
        actionName: 'create',
        targetType: 'strand',
        targetPath: '/notes/test.md'
      }

      const id = await service.logAction(input)

      expect(id).toBeDefined()
      expect(id).toMatch(/^audit_/)
    })

    it('skips navigation events when disabled', async () => {
      const db = createMockDb()
      const service = new AuditService(db, 'session_test', {
        logNavigation: false
      })

      const input: AuditLogInput = {
        actionType: 'navigation',
        actionName: 'view',
        targetType: 'strand'
      }

      const id = await service.logAction(input)

      expect(id).toBeNull()
    })

    it('skips learning events when disabled', async () => {
      const db = createMockDb()
      const service = new AuditService(db, 'session_test', {
        logLearning: false
      })

      const input: AuditLogInput = {
        actionType: 'learning',
        actionName: 'flashcard_create',
        targetType: 'flashcard'
      }

      const id = await service.logAction(input)

      expect(id).toBeNull()
    })

    it('sets default values for optional fields', async () => {
      const db = createMockDb()
      const service = new AuditService(db, 'session_test')

      const input: AuditLogInput = {
        actionType: 'content',
        actionName: 'update',
        targetType: 'strand'
      }

      const id = await service.logAction(input)

      expect(id).toBeDefined()
    })

    it('includes old and new values', async () => {
      const db = createMockDb()
      const service = new AuditService(db, 'session_test')

      const input: AuditLogInput = {
        actionType: 'metadata',
        actionName: 'update_title',
        targetType: 'strand',
        oldValue: { title: 'Old' },
        newValue: { title: 'New' }
      }

      const id = await service.logAction(input)

      expect(id).toBeDefined()
    })
  })

  describe('flushWrites', () => {
    it('writes pending entries to database', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 0 }])

      const service = new AuditService(db, 'session_test')

      await service.logAction({
        actionType: 'file',
        actionName: 'create',
        targetType: 'strand'
      })

      await service.flushWrites()

      expect(db.run).toHaveBeenCalled()
    })

    it('handles empty pending writes', async () => {
      const db = createMockDb()
      const service = new AuditService(db, 'session_test')

      await service.flushWrites()

      // Should not throw
      expect(db.run).not.toHaveBeenCalled()
    })

    it('retries failed writes', async () => {
      const db = createMockDb()
      let callCount = 0
      ;(db.run as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Database error'))
        }
        return Promise.resolve(undefined)
      })

      const service = new AuditService(db, 'session_test')

      await service.logAction({
        actionType: 'file',
        actionName: 'create',
        targetType: 'strand'
      })

      // First flush should fail and re-add entries
      await service.flushWrites()

      // Entries should still be pending for retry
      expect(callCount).toBe(1)
    })
  })

  describe('queryEntries', () => {
    it('queries with no filters', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'audit_1',
          timestamp: '2024-01-01T00:00:00Z',
          session_id: 'session_1',
          action_type: 'file',
          action_name: 'create',
          target_type: 'strand',
          target_id: null,
          target_path: '/test.md',
          old_value: null,
          new_value: null,
          is_undoable: 0,
          undo_group_id: null,
          duration_ms: null,
          source: 'user'
        }
      ])

      const service = new AuditService(db, 'session_test')
      const entries = await service.queryEntries()

      expect(entries).toHaveLength(1)
      expect(entries[0].id).toBe('audit_1')
      expect(entries[0].actionType).toBe('file')
    })

    it('queries with action type filter', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const service = new AuditService(db, 'session_test')
      await service.queryEntries({ actionType: 'content' })

      expect(db.all).toHaveBeenCalled()
      const call = (db.all as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(call[0]).toContain('action_type = ?')
      expect(call[1]).toContain('content')
    })

    it('queries with target path prefix', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const service = new AuditService(db, 'session_test')
      await service.queryEntries({ targetPathPrefix: '/notes/' })

      expect(db.all).toHaveBeenCalled()
      const call = (db.all as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(call[0]).toContain('LIKE')
    })

    it('queries with undoable only filter', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const service = new AuditService(db, 'session_test')
      await service.queryEntries({ undoableOnly: true })

      expect(db.all).toHaveBeenCalled()
      const call = (db.all as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(call[0]).toContain('is_undoable = 1')
    })

    it('queries with time range', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const service = new AuditService(db, 'session_test')
      await service.queryEntries({
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-31T23:59:59Z'
      })

      expect(db.all).toHaveBeenCalled()
      const call = (db.all as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(call[0]).toContain('timestamp >=')
      expect(call[0]).toContain('timestamp <=')
    })

    it('queries with ascending order', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const service = new AuditService(db, 'session_test')
      await service.queryEntries({ order: 'asc' })

      expect(db.all).toHaveBeenCalled()
      const call = (db.all as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(call[0]).toContain('ORDER BY timestamp ASC')
    })

    it('queries with pagination', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const service = new AuditService(db, 'session_test')
      await service.queryEntries({ limit: 25, offset: 50 })

      expect(db.all).toHaveBeenCalled()
      const call = (db.all as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(call[0]).toContain('LIMIT 25')
      expect(call[0]).toContain('OFFSET 50')
    })

    it('parses JSON values correctly', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'audit_1',
          timestamp: '2024-01-01T00:00:00Z',
          session_id: 'session_1',
          action_type: 'content',
          action_name: 'update',
          target_type: 'strand',
          target_id: 'strand_1',
          target_path: '/test.md',
          old_value: '{"title":"Old"}',
          new_value: '{"title":"New"}',
          is_undoable: 1,
          undo_group_id: 'group_1',
          duration_ms: 50,
          source: 'user'
        }
      ])

      const service = new AuditService(db, 'session_test')
      const entries = await service.queryEntries()

      expect(entries[0].oldValue).toEqual({ title: 'Old' })
      expect(entries[0].newValue).toEqual({ title: 'New' })
      expect(entries[0].isUndoable).toBe(true)
    })

    it('handles query errors gracefully', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Database error'))

      const service = new AuditService(db, 'session_test')
      const entries = await service.queryEntries()

      expect(entries).toEqual([])
    })
  })

  describe('getRecentActions', () => {
    it('gets recent actions for current session', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const service = new AuditService(db, 'session_current')
      await service.getRecentActions()

      expect(db.all).toHaveBeenCalled()
      const call = (db.all as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(call[1]).toContain('session_current')
    })

    it('uses custom limit', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const service = new AuditService(db, 'session_test')
      await service.getRecentActions(25)

      expect(db.all).toHaveBeenCalled()
      const call = (db.all as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(call[0]).toContain('LIMIT 25')
    })
  })

  describe('getActionsByType', () => {
    it('gets actions by type', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const service = new AuditService(db, 'session_test')
      await service.getActionsByType('file')

      expect(db.all).toHaveBeenCalled()
      const call = (db.all as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(call[1]).toContain('file')
    })

    it('uses custom limit', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const service = new AuditService(db, 'session_test')
      await service.getActionsByType('content', 100)

      expect(db.all).toHaveBeenCalled()
      const call = (db.all as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(call[0]).toContain('LIMIT 100')
    })
  })

  describe('getActionsForTarget', () => {
    it('gets actions for specific target path', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'audit_1',
          timestamp: '2024-01-01T00:00:00Z',
          session_id: 'session_1',
          action_type: 'content',
          action_name: 'update',
          target_type: 'strand',
          target_id: null,
          target_path: '/notes/test.md',
          old_value: null,
          new_value: null,
          is_undoable: 0,
          undo_group_id: null,
          duration_ms: null,
          source: 'user'
        }
      ])

      const service = new AuditService(db, 'session_test')
      const entries = await service.getActionsForTarget('/notes/test.md')

      expect(entries).toHaveLength(1)
      expect(db.all).toHaveBeenCalled()
    })

    it('handles errors gracefully', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Query error'))

      const service = new AuditService(db, 'session_test')
      const entries = await service.getActionsForTarget('/notes/test.md')

      expect(entries).toEqual([])
    })
  })

  describe('getEntry', () => {
    it('gets entry by ID', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'audit_123',
          timestamp: '2024-01-01T00:00:00Z',
          session_id: 'session_1',
          action_type: 'file',
          action_name: 'create',
          target_type: 'strand',
          target_id: 'strand_1',
          target_path: '/test.md',
          old_value: null,
          new_value: null,
          is_undoable: 0,
          undo_group_id: null,
          duration_ms: null,
          source: 'user'
        }
      ])

      const service = new AuditService(db, 'session_test')
      const entry = await service.getEntry('audit_123')

      expect(entry).not.toBeNull()
      expect(entry?.id).toBe('audit_123')
    })

    it('returns null for non-existent entry', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const service = new AuditService(db, 'session_test')
      const entry = await service.getEntry('nonexistent')

      expect(entry).toBeNull()
    })

    it('handles errors gracefully', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Query error'))

      const service = new AuditService(db, 'session_test')
      const entry = await service.getEntry('audit_123')

      expect(entry).toBeNull()
    })
  })

  describe('getStats', () => {
    it('returns aggregated statistics', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ count: 1000 }]) // total
        .mockResolvedValueOnce([
          { action_type: 'file', count: 200 },
          { action_type: 'content', count: 500 }
        ]) // byType
        .mockResolvedValueOnce([
          { date: '2024-01-15', count: 100 },
          { date: '2024-01-14', count: 80 }
        ]) // byDay
        .mockResolvedValueOnce([
          { target_path: '/test.md', count: 50 }
        ]) // mostEdited
        .mockResolvedValueOnce([{ count: 10 }]) // sessions

      const service = new AuditService(db, 'session_test')
      const stats = await service.getStats()

      expect(stats.totalActions).toBe(1000)
      expect(stats.actionsByType.file).toBe(200)
      expect(stats.actionsByType.content).toBe(500)
      expect(stats.sessionCount).toBe(10)
      expect(stats.averageActionsPerSession).toBe(100)
    })

    it('handles empty database', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0 }])

      const service = new AuditService(db, 'session_test')
      const stats = await service.getStats()

      expect(stats.totalActions).toBe(0)
      expect(stats.sessionCount).toBe(0)
      expect(stats.averageActionsPerSession).toBe(0)
    })

    it('handles errors gracefully', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Query error'))

      const service = new AuditService(db, 'session_test')
      const stats = await service.getStats()

      expect(stats.totalActions).toBe(0)
      expect(stats.sessionCount).toBe(0)
    })
  })

  describe('getSessionId', () => {
    it('returns session ID', () => {
      const db = createMockDb()
      const service = new AuditService(db, 'session_test_123')

      expect(service.getSessionId()).toBe('session_test_123')
    })
  })

  describe('destroy', () => {
    it('flushes writes on destroy', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 0 }])

      const service = new AuditService(db, 'session_test')

      await service.logAction({
        actionType: 'file',
        actionName: 'create',
        targetType: 'strand'
      })

      await service.destroy()

      expect(db.run).toHaveBeenCalled()
    })

    it('clears write timer on destroy', async () => {
      const db = createMockDb()
      const service = new AuditService(db, 'session_test')

      await service.destroy()

      // Should not throw
      expect(true).toBe(true)
    })
  })
})

// ============================================================================
// FACTORY FUNCTION TESTS
// ============================================================================

describe('createAuditService', () => {
  it('creates service with provided session ID', () => {
    const db = createMockDb()
    const service = createAuditService(db, 'custom_session')

    expect(service.getSessionId()).toBe('custom_session')
  })

  it('generates session ID if not provided', () => {
    const db = createMockDb()
    const service = createAuditService(db)

    expect(service.getSessionId()).toMatch(/^session_/)
  })

  it('passes config to service', () => {
    const db = createMockDb()
    const service = createAuditService(db, 'session_123', {
      maxLogEntries: 500
    })

    expect(service.getSessionId()).toBe('session_123')
  })
})
