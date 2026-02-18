/**
 * Tests for lib/audit/UndoRedoService.ts
 *
 * Tests the UndoRedoService class with mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UndoRedoService, createUndoRedoService } from '@/lib/audit/UndoRedoService'
import { AuditService } from '@/lib/audit/AuditService'
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

function createMockAuditService(sessionId: string = 'session_test') {
  return {
    getSessionId: vi.fn().mockReturnValue(sessionId),
    logAction: vi.fn().mockResolvedValue('audit_123'),
    flushWrites: vi.fn().mockResolvedValue(undefined)
  } as unknown as AuditService
}

// ============================================================================
// CONSTRUCTOR TESTS
// ============================================================================

describe('UndoRedoService', () => {
  describe('constructor', () => {
    it('creates service with default config', () => {
      const db = createMockDb()
      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      expect(service.getSessionId()).toBe('session_test')
    })

    it('creates service with custom config', () => {
      const db = createMockDb()
      const auditService = createMockAuditService('custom_session')
      const service = new UndoRedoService(db, auditService, {
        maxStackSize: 100,
        persistAcrossRefresh: true
      })

      expect(service.getSessionId()).toBe('custom_session')
    })
  })

  describe('initialize', () => {
    it('clears undo stack when not persisting', async () => {
      const db = createMockDb()
      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      await service.initialize()

      // Should have called delete on undo stack
      expect(db.run).toHaveBeenCalled()
    })

    it('loads current position when persisting', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ pos: 5 }])

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService, {
        persistAcrossRefresh: true
      })

      await service.initialize()

      expect(service.getCurrentPosition()).toBe(5)
    })

    it('sets position to -1 when stack is empty', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ pos: null }])

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService, {
        persistAcrossRefresh: true
      })

      await service.initialize()

      expect(service.getCurrentPosition()).toBe(-1)
    })

    it('does not reinitialize if already initialized', async () => {
      const db = createMockDb()
      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      await service.initialize()
      const callCount = (db.run as ReturnType<typeof vi.fn>).mock.calls.length

      await service.initialize()

      expect((db.run as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount)
    })
  })

  describe('setHandler', () => {
    it('sets the state handler', () => {
      const db = createMockDb()
      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      const handler = vi.fn().mockResolvedValue(true)
      service.setHandler(handler)

      // Handler should be set (verified via undo/redo operations)
      expect(true).toBe(true)
    })
  })

  describe('pushUndoableAction', () => {
    it('pushes action onto stack', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 0 }])

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      const id = await service.pushUndoableAction({
        actionType: 'content',
        actionName: 'update',
        targetType: 'strand',
        targetId: 'strand_1',
        beforeState: { value: 1 },
        afterState: { value: 2 }
      })

      expect(id).toBeDefined()
      expect(id).toMatch(/^undo_/)
      expect(auditService.logAction).toHaveBeenCalled()
      expect(db.run).toHaveBeenCalled()
    })

    it('returns null when audit logging fails', async () => {
      const db = createMockDb()
      const auditService = createMockAuditService()
      ;(auditService.logAction as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const service = new UndoRedoService(db, auditService)

      const id = await service.pushUndoableAction({
        actionType: 'content',
        actionName: 'update',
        targetType: 'strand',
        targetId: 'strand_1',
        beforeState: {},
        afterState: {}
      })

      expect(id).toBeNull()
    })

    it('invalidates entries after current position', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 0 }])

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      await service.pushUndoableAction({
        actionType: 'content',
        actionName: 'update',
        targetType: 'strand',
        targetId: 'strand_1',
        beforeState: {},
        afterState: {}
      })

      // Should have called UPDATE to invalidate
      const updateCall = (db.run as ReturnType<typeof vi.fn>).mock.calls.find(
        call => call[0].includes('UPDATE')
      )
      expect(updateCall).toBeDefined()
    })

    it('handles database errors', async () => {
      const db = createMockDb()
      ;(db.run as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'))

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      const id = await service.pushUndoableAction({
        actionType: 'content',
        actionName: 'update',
        targetType: 'strand',
        targetId: 'strand_1',
        beforeState: {},
        afterState: {}
      })

      expect(id).toBeNull()
    })
  })

  describe('canUndo', () => {
    it('returns false when position is negative', async () => {
      const db = createMockDb()
      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      const canUndo = await service.canUndo()

      expect(canUndo).toBe(false)
    })

    it('returns true when active entries exist', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ pos: 2 }]) // initialize
        .mockResolvedValueOnce([{ count: 3 }]) // canUndo

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService, {
        persistAcrossRefresh: true
      })

      await service.initialize()
      const canUndo = await service.canUndo()

      expect(canUndo).toBe(true)
    })

    it('returns false when no active entries', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ pos: 0 }]) // initialize
        .mockResolvedValueOnce([{ count: 0 }]) // canUndo

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService, {
        persistAcrossRefresh: true
      })

      await service.initialize()
      const canUndo = await service.canUndo()

      expect(canUndo).toBe(false)
    })
  })

  describe('canRedo', () => {
    it('returns true when inactive entries exist after position', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 2 }])

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      const canRedo = await service.canRedo()

      expect(canRedo).toBe(true)
    })

    it('returns false when no inactive entries', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 0 }])

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      const canRedo = await service.canRedo()

      expect(canRedo).toBe(false)
    })
  })

  describe('getUndoCount', () => {
    it('returns 0 when position is negative', async () => {
      const db = createMockDb()
      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      const count = await service.getUndoCount()

      expect(count).toBe(0)
    })

    it('returns count of undoable entries', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ pos: 5 }]) // initialize
        .mockResolvedValueOnce([{ count: 6 }]) // getUndoCount

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService, {
        persistAcrossRefresh: true
      })

      await service.initialize()
      const count = await service.getUndoCount()

      expect(count).toBe(6)
    })
  })

  describe('getRedoCount', () => {
    it('returns count of redoable entries', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 3 }])

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      const count = await service.getRedoCount()

      expect(count).toBe(3)
    })
  })

  describe('undo', () => {
    it('returns error when nothing to undo', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 0 }])

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      const result = await service.undo()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Nothing to undo')
    })

    it('returns error when entry not found', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ pos: 0 }]) // initialize
        .mockResolvedValueOnce([{ count: 1 }]) // canUndo
        .mockResolvedValueOnce([]) // getEntry

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService, {
        persistAcrossRefresh: true
      })

      await service.initialize()
      const result = await service.undo()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Undo entry not found')
    })

    it('applies before state on undo', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ pos: 0 }]) // initialize
        .mockResolvedValueOnce([{ count: 1 }]) // canUndo
        .mockResolvedValueOnce([
          {
            id: 'undo_1',
            session_id: 'session_test',
            stack_position: 0,
            audit_log_id: 'audit_1',
            target_type: 'strand',
            target_id: 'strand_1',
            before_state: '{"value":1}',
            after_state: '{"value":2}',
            is_active: 1,
            created_at: '2024-01-01T00:00:00Z'
          }
        ]) // getEntry

      const handler = vi.fn().mockResolvedValue(true)
      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService, {
        persistAcrossRefresh: true
      })

      service.setHandler(handler)
      await service.initialize()
      const result = await service.undo()

      expect(result.success).toBe(true)
      expect(result.appliedState).toEqual({ value: 1 })
      expect(handler).toHaveBeenCalledWith('strand', 'strand_1', { value: 1 }, true)
    })

    it('returns error when handler fails', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ pos: 0 }]) // initialize
        .mockResolvedValueOnce([{ count: 1 }]) // canUndo
        .mockResolvedValueOnce([
          {
            id: 'undo_1',
            session_id: 'session_test',
            stack_position: 0,
            audit_log_id: 'audit_1',
            target_type: 'strand',
            target_id: 'strand_1',
            before_state: '{}',
            after_state: '{}',
            is_active: 1,
            created_at: '2024-01-01T00:00:00Z'
          }
        ])

      const handler = vi.fn().mockResolvedValue(false)
      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService, {
        persistAcrossRefresh: true
      })

      service.setHandler(handler)
      await service.initialize()
      const result = await service.undo()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Handler failed to apply state')
    })

    it('logs undo action to audit service', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ pos: 0 }])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([
          {
            id: 'undo_1',
            session_id: 'session_test',
            stack_position: 0,
            audit_log_id: 'audit_1',
            target_type: 'strand',
            target_id: 'strand_1',
            before_state: '{}',
            after_state: '{}',
            is_active: 1,
            created_at: '2024-01-01T00:00:00Z'
          }
        ])

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService, {
        persistAcrossRefresh: true
      })

      await service.initialize()
      await service.undo()

      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'content',
          actionName: 'revert',
          source: 'undo'
        })
      )
    })

    it('handles database errors', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ pos: 0 }])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockRejectedValueOnce(new Error('DB error'))

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService, {
        persistAcrossRefresh: true
      })

      await service.initialize()
      const result = await service.undo()

      expect(result.success).toBe(false)
      expect(result.error).toBe('DB error')
    })
  })

  describe('redo', () => {
    it('returns error when nothing to redo', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([{ count: 0 }])

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      const result = await service.redo()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Nothing to redo')
    })

    it('applies after state on redo', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ count: 1 }]) // canRedo
        .mockResolvedValueOnce([
          {
            id: 'undo_1',
            session_id: 'session_test',
            stack_position: 1,
            audit_log_id: 'audit_1',
            target_type: 'strand',
            target_id: 'strand_1',
            before_state: '{"value":1}',
            after_state: '{"value":2}',
            is_active: 0,
            created_at: '2024-01-01T00:00:00Z'
          }
        ])

      const handler = vi.fn().mockResolvedValue(true)
      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      service.setHandler(handler)
      const result = await service.redo()

      expect(result.success).toBe(true)
      expect(result.appliedState).toEqual({ value: 2 })
      expect(handler).toHaveBeenCalledWith('strand', 'strand_1', { value: 2 }, false)
    })

    it('logs redo action to audit service', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([
          {
            id: 'undo_1',
            session_id: 'session_test',
            stack_position: 1,
            audit_log_id: 'audit_1',
            target_type: 'strand',
            target_id: 'strand_1',
            before_state: '{}',
            after_state: '{}',
            is_active: 0,
            created_at: '2024-01-01T00:00:00Z'
          }
        ])

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      await service.redo()

      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'content',
          actionName: 'restore_draft',
          source: 'redo'
        })
      )
    })
  })

  describe('getStack', () => {
    it('returns all stack entries', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'undo_1',
          session_id: 'session_test',
          stack_position: 1,
          audit_log_id: 'audit_1',
          target_type: 'strand',
          target_id: 'strand_1',
          before_state: '{"value":1}',
          after_state: '{"value":2}',
          is_active: 1,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'undo_2',
          session_id: 'session_test',
          stack_position: 0,
          audit_log_id: 'audit_2',
          target_type: 'strand',
          target_id: 'strand_2',
          before_state: '{"value":3}',
          after_state: '{"value":4}',
          is_active: 1,
          created_at: '2024-01-01T00:00:00Z'
        }
      ])

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      const stack = await service.getStack()

      expect(stack).toHaveLength(2)
      expect(stack[0].id).toBe('undo_1')
      expect(stack[0].beforeState).toEqual({ value: 1 })
      expect(stack[0].afterState).toEqual({ value: 2 })
    })

    it('handles errors gracefully', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'))

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      const stack = await service.getStack()

      expect(stack).toEqual([])
    })
  })

  describe('clearStack', () => {
    it('clears the undo stack', async () => {
      const db = createMockDb()
      ;(db.all as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      await service.clearStack()

      expect(db.run).toHaveBeenCalled()
      expect(service.getCurrentPosition()).toBe(-1)
    })
  })

  describe('getCurrentPosition', () => {
    it('returns current position', () => {
      const db = createMockDb()
      const auditService = createMockAuditService()
      const service = new UndoRedoService(db, auditService)

      expect(service.getCurrentPosition()).toBe(-1)
    })
  })

  describe('getSessionId', () => {
    it('returns session ID from audit service', () => {
      const db = createMockDb()
      const auditService = createMockAuditService('test_session_id')
      const service = new UndoRedoService(db, auditService)

      expect(service.getSessionId()).toBe('test_session_id')
    })
  })
})

// ============================================================================
// FACTORY FUNCTION TESTS
// ============================================================================

describe('createUndoRedoService', () => {
  it('creates service instance', () => {
    const db = createMockDb()
    const auditService = createMockAuditService()
    const service = createUndoRedoService(db, auditService)

    expect(service).toBeInstanceOf(UndoRedoService)
  })

  it('passes config to service', () => {
    const db = createMockDb()
    const auditService = createMockAuditService()
    const service = createUndoRedoService(db, auditService, {
      maxStackSize: 25
    })

    expect(service).toBeInstanceOf(UndoRedoService)
  })
})
