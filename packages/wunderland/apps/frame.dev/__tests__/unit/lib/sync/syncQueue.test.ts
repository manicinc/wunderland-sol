/**
 * Sync Queue Tests
 * @module __tests__/unit/lib/sync/syncQueue.test
 *
 * Tests for IndexedDB-based offline sync queue.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SyncQueue, getSyncQueue } from '@/lib/sync/syncQueue'
import type { SyncOperation, SyncEvent } from '@/lib/sync/types'

describe('syncQueue module', () => {
  let mockStore: any
  let mockTransaction: any
  let mockDB: any
  let mockIndexedDB: any

  beforeEach(() => {
    // Reset module state
    vi.resetModules()

    // Mock IDB store
    mockStore = {
      add: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
      put: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
      get: vi.fn().mockReturnValue({ onsuccess: null, onerror: null, result: null }),
      getAll: vi.fn().mockReturnValue({ onsuccess: null, onerror: null, result: [] }),
      delete: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
      index: vi.fn().mockReturnValue({
        getAll: vi.fn().mockReturnValue({ onsuccess: null, onerror: null, result: [] }),
      }),
      createIndex: vi.fn(),
    }

    mockTransaction = {
      objectStore: vi.fn().mockReturnValue(mockStore),
      oncomplete: null,
      onerror: null,
    }

    mockDB = {
      transaction: vi.fn().mockReturnValue(mockTransaction),
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(false),
      },
      createObjectStore: vi.fn().mockReturnValue(mockStore),
      close: vi.fn(),
    }

    mockIndexedDB = {
      open: vi.fn().mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null as any,
          onupgradeneeded: null as any,
          result: mockDB,
          error: null,
        }
        setTimeout(() => {
          if (request.onupgradeneeded) {
            request.onupgradeneeded({ target: request })
          }
          if (request.onsuccess) {
            request.onsuccess()
          }
        }, 0)
        return request
      }),
    }

    vi.stubGlobal('indexedDB', mockIndexedDB)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  // ============================================================================
  // SyncQueue class
  // ============================================================================

  describe('SyncQueue class', () => {
    it('can be instantiated', () => {
      const queue = new SyncQueue()
      expect(queue).toBeDefined()
    })

    it('initializes database', async () => {
      const queue = new SyncQueue()
      await queue.init()
      expect(mockIndexedDB.open).toHaveBeenCalledWith('frame-sync-queue', 1)
    })

    it('handles missing indexedDB gracefully', async () => {
      vi.stubGlobal('indexedDB', undefined)
      vi.resetModules()

      const { SyncQueue } = await import('@/lib/sync/syncQueue')
      const queue = new SyncQueue()

      // Should not throw
      await queue.init()
    })

    it('reuses init promise on multiple calls', async () => {
      const queue = new SyncQueue()

      const promise1 = queue.init()
      const promise2 = queue.init()

      await promise1
      await promise2

      expect(mockIndexedDB.open).toHaveBeenCalledTimes(1)
    })

    it('creates object store on upgrade', async () => {
      mockDB.objectStoreNames.contains.mockReturnValue(false)

      const queue = new SyncQueue()
      await queue.init()

      expect(mockDB.createObjectStore).toHaveBeenCalledWith('operations', { keyPath: 'id' })
    })

    it('skips creating store if already exists', async () => {
      mockDB.objectStoreNames.contains.mockReturnValue(true)

      const queue = new SyncQueue()
      await queue.init()

      expect(mockDB.createObjectStore).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // enqueue
  // ============================================================================

  describe('enqueue', () => {
    it('adds operation to the queue', async () => {
      const queue = new SyncQueue()
      await queue.init()

      // Setup mock to trigger success
      mockStore.add.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      const operation = await queue.enqueue(
        'create',
        'strand',
        'strand-123',
        { title: 'Test' },
        'normal'
      )

      expect(operation.id).toBeDefined()
      expect(operation.type).toBe('create')
      expect(operation.resourceType).toBe('strand')
      expect(operation.resourceId).toBe('strand-123')
      expect(operation.priority).toBe('normal')
      expect(operation.status).toBe('pending')
      expect(operation.attemptCount).toBe(0)
    })

    it('throws when database not available', async () => {
      vi.stubGlobal('indexedDB', undefined)
      vi.resetModules()

      const { SyncQueue } = await import('@/lib/sync/syncQueue')
      const queue = new SyncQueue()
      await queue.init()

      await expect(
        queue.enqueue('create', 'strand', 'id', {})
      ).rejects.toThrow('Database not available')
    })

    it('emits operation-queued event', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const listener = vi.fn()
      queue.addEventListener(listener)

      mockStore.add.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      await queue.enqueue('create', 'strand', 'id', {})

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'operation-queued',
        })
      )
    })

    it('uses default priority of normal', async () => {
      const queue = new SyncQueue()
      await queue.init()

      mockStore.add.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      const operation = await queue.enqueue('create', 'strand', 'id', {})
      expect(operation.priority).toBe('normal')
    })

    it('generates unique operation IDs', async () => {
      const queue = new SyncQueue()
      await queue.init()

      mockStore.add.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      const op1 = await queue.enqueue('create', 'strand', 'id1', {})
      const op2 = await queue.enqueue('create', 'strand', 'id2', {})

      expect(op1.id).not.toBe(op2.id)
      expect(op1.id).toMatch(/^sync-\d+-[a-z0-9]+$/)
    })
  })

  // ============================================================================
  // getPendingOperations
  // ============================================================================

  describe('getPendingOperations', () => {
    it('returns empty array when no database', async () => {
      vi.stubGlobal('indexedDB', undefined)
      vi.resetModules()

      const { SyncQueue } = await import('@/lib/sync/syncQueue')
      const queue = new SyncQueue()
      await queue.init()

      const pending = await queue.getPendingOperations()
      expect(pending).toEqual([])
    })

    it('returns operations sorted by priority and age', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const mockOperations: SyncOperation[] = [
        { id: '1', type: 'update', priority: 'low', status: 'pending', resourceType: 'strand', resourceId: 'a', payload: {}, createdAt: '2025-01-01T10:00:00Z', attemptCount: 0 },
        { id: '2', type: 'update', priority: 'high', status: 'pending', resourceType: 'strand', resourceId: 'b', payload: {}, createdAt: '2025-01-01T10:00:00Z', attemptCount: 0 },
        { id: '3', type: 'update', priority: 'high', status: 'pending', resourceType: 'strand', resourceId: 'c', payload: {}, createdAt: '2025-01-01T09:00:00Z', attemptCount: 0 },
      ]

      const indexMock = {
        getAll: vi.fn().mockImplementation(() => {
          const request = {
            onsuccess: null as any,
            onerror: null,
            result: mockOperations,
          }
          setTimeout(() => request.onsuccess?.(), 0)
          return request
        }),
      }
      mockStore.index.mockReturnValue(indexMock)

      const pending = await queue.getPendingOperations()

      // High priority should come first, then older within same priority
      expect(pending[0].id).toBe('3') // high priority, oldest
      expect(pending[1].id).toBe('2') // high priority, newer
      expect(pending[2].id).toBe('1') // low priority
    })
  })

  // ============================================================================
  // getOperationsByStatus
  // ============================================================================

  describe('getOperationsByStatus', () => {
    it('returns empty array when no database', async () => {
      vi.stubGlobal('indexedDB', undefined)
      vi.resetModules()

      const { SyncQueue } = await import('@/lib/sync/syncQueue')
      const queue = new SyncQueue()
      await queue.init()

      const ops = await queue.getOperationsByStatus('failed')
      expect(ops).toEqual([])
    })

    it('queries by status index', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const mockOps: SyncOperation[] = [
        { id: '1', type: 'update', priority: 'normal', status: 'failed', resourceType: 'strand', resourceId: 'a', payload: {}, createdAt: '2025-01-01', attemptCount: 3 },
      ]

      const indexMock = {
        getAll: vi.fn().mockImplementation(() => {
          const request = {
            onsuccess: null as any,
            onerror: null,
            result: mockOps,
          }
          setTimeout(() => request.onsuccess?.(), 0)
          return request
        }),
      }
      mockStore.index.mockReturnValue(indexMock)

      const ops = await queue.getOperationsByStatus('failed')

      expect(mockStore.index).toHaveBeenCalledWith('status')
      expect(indexMock.getAll).toHaveBeenCalledWith('failed')
      expect(ops).toHaveLength(1)
    })
  })

  // ============================================================================
  // getOperationsForResource
  // ============================================================================

  describe('getOperationsForResource', () => {
    it('returns empty array when no database', async () => {
      vi.stubGlobal('indexedDB', undefined)
      vi.resetModules()

      const { SyncQueue } = await import('@/lib/sync/syncQueue')
      const queue = new SyncQueue()
      await queue.init()

      const ops = await queue.getOperationsForResource('resource-123')
      expect(ops).toEqual([])
    })

    it('queries by resourceId index', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const indexMock = {
        getAll: vi.fn().mockImplementation(() => {
          const request = {
            onsuccess: null as any,
            onerror: null,
            result: [],
          }
          setTimeout(() => request.onsuccess?.(), 0)
          return request
        }),
      }
      mockStore.index.mockReturnValue(indexMock)

      await queue.getOperationsForResource('resource-123')

      expect(mockStore.index).toHaveBeenCalledWith('resourceId')
      expect(indexMock.getAll).toHaveBeenCalledWith('resource-123')
    })
  })

  // ============================================================================
  // getOperation
  // ============================================================================

  describe('getOperation', () => {
    it('returns null when no database', async () => {
      vi.stubGlobal('indexedDB', undefined)
      vi.resetModules()

      const { SyncQueue } = await import('@/lib/sync/syncQueue')
      const queue = new SyncQueue()
      await queue.init()

      const op = await queue.getOperation('op-123')
      expect(op).toBeNull()
    })

    it('returns operation by ID', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const mockOp: SyncOperation = {
        id: 'op-123',
        type: 'update',
        priority: 'normal',
        status: 'pending',
        resourceType: 'strand',
        resourceId: 'a',
        payload: {},
        createdAt: '2025-01-01',
        attemptCount: 0,
      }

      mockStore.get.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null,
          result: mockOp,
        }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      const op = await queue.getOperation('op-123')
      expect(op).toEqual(mockOp)
    })

    it('returns null when operation not found', async () => {
      const queue = new SyncQueue()
      await queue.init()

      mockStore.get.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null,
          result: undefined,
        }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      const op = await queue.getOperation('non-existent')
      expect(op).toBeNull()
    })
  })

  // ============================================================================
  // updateOperation
  // ============================================================================

  describe('updateOperation', () => {
    it('does nothing when no database', async () => {
      vi.stubGlobal('indexedDB', undefined)
      vi.resetModules()

      const { SyncQueue } = await import('@/lib/sync/syncQueue')
      const queue = new SyncQueue()
      await queue.init()

      // Should not throw
      await queue.updateOperation({ id: 'test' } as SyncOperation)
    })

    it('updates operation in store', async () => {
      const queue = new SyncQueue()
      await queue.init()

      mockStore.put.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      const op: SyncOperation = {
        id: 'op-123',
        type: 'update',
        priority: 'high',
        status: 'in-progress',
        resourceType: 'strand',
        resourceId: 'a',
        payload: {},
        createdAt: '2025-01-01',
        attemptCount: 1,
      }

      await queue.updateOperation(op)
      expect(mockStore.put).toHaveBeenCalledWith(op)
    })
  })

  // ============================================================================
  // markInProgress
  // ============================================================================

  describe('markInProgress', () => {
    it('updates operation status to in-progress', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const mockOp: SyncOperation = {
        id: 'op-123',
        type: 'update',
        priority: 'normal',
        status: 'pending',
        resourceType: 'strand',
        resourceId: 'a',
        payload: {},
        createdAt: '2025-01-01',
        attemptCount: 0,
      }

      mockStore.get.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null,
          result: { ...mockOp },
        }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      mockStore.put.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      const listener = vi.fn()
      queue.addEventListener(listener)

      await queue.markInProgress('op-123')

      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in-progress',
          attemptCount: 1,
          lastAttemptAt: expect.any(String),
        })
      )
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'operation-started' })
      )
    })

    it('does nothing for non-existent operation', async () => {
      const queue = new SyncQueue()
      await queue.init()

      mockStore.get.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null,
          result: null,
        }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      // Should not throw
      await queue.markInProgress('non-existent')
      expect(mockStore.put).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // markCompleted
  // ============================================================================

  describe('markCompleted', () => {
    it('removes operation and emits event', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const mockOp: SyncOperation = {
        id: 'op-123',
        type: 'update',
        priority: 'normal',
        status: 'in-progress',
        resourceType: 'strand',
        resourceId: 'a',
        payload: {},
        createdAt: '2025-01-01',
        attemptCount: 1,
      }

      mockStore.get.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null,
          result: mockOp,
        }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      mockStore.delete.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      const listener = vi.fn()
      queue.addEventListener(listener)

      await queue.markCompleted('op-123')

      expect(mockStore.delete).toHaveBeenCalledWith('op-123')
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'operation-completed' })
      )
    })
  })

  // ============================================================================
  // markFailed
  // ============================================================================

  describe('markFailed', () => {
    it('sets status to pending for retry', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const mockOp: SyncOperation = {
        id: 'op-123',
        type: 'update',
        priority: 'normal',
        status: 'in-progress',
        resourceType: 'strand',
        resourceId: 'a',
        payload: {},
        createdAt: '2025-01-01',
        attemptCount: 1,
      }

      mockStore.get.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null,
          result: { ...mockOp },
        }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      mockStore.put.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      await queue.markFailed('op-123', 'Network error')

      // Under MAX_RETRY_ATTEMPTS (3), should go back to pending
      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          errorMessage: 'Network error',
        })
      )
    })

    it('sets status to failed after max retries', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const mockOp: SyncOperation = {
        id: 'op-123',
        type: 'update',
        priority: 'normal',
        status: 'in-progress',
        resourceType: 'strand',
        resourceId: 'a',
        payload: {},
        createdAt: '2025-01-01',
        attemptCount: 3, // At max
      }

      mockStore.get.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null,
          result: { ...mockOp },
        }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      mockStore.put.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      await queue.markFailed('op-123', 'Max retries exceeded')

      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
        })
      )
    })

    it('emits operation-failed event', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const mockOp: SyncOperation = {
        id: 'op-123',
        type: 'update',
        priority: 'normal',
        status: 'in-progress',
        resourceType: 'strand',
        resourceId: 'a',
        payload: {},
        createdAt: '2025-01-01',
        attemptCount: 1,
      }

      mockStore.get.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null,
          result: { ...mockOp },
        }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      mockStore.put.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      const listener = vi.fn()
      queue.addEventListener(listener)

      await queue.markFailed('op-123', 'Error')

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'operation-failed',
          details: { errorMessage: 'Error' },
        })
      )
    })
  })

  // ============================================================================
  // markConflict
  // ============================================================================

  describe('markConflict', () => {
    it('sets conflict status and data', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const mockOp: SyncOperation = {
        id: 'op-123',
        type: 'update',
        priority: 'normal',
        status: 'in-progress',
        resourceType: 'strand',
        resourceId: 'a',
        payload: {},
        createdAt: '2025-01-01',
        attemptCount: 1,
      }

      mockStore.get.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null,
          result: { ...mockOp },
        }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      mockStore.put.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      const listener = vi.fn()
      queue.addEventListener(listener)

      await queue.markConflict(
        'op-123',
        { title: 'Local' },
        { title: 'Server' },
        ['title']
      )

      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'conflict',
          conflictData: {
            localState: { title: 'Local' },
            serverState: { title: 'Server' },
            conflictFields: ['title'],
            autoResolvable: false,
          },
        })
      )
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'conflict-detected' })
      )
    })

    it('marks as autoResolvable when no conflict fields', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const mockOp: SyncOperation = {
        id: 'op-123',
        type: 'update',
        priority: 'normal',
        status: 'in-progress',
        resourceType: 'strand',
        resourceId: 'a',
        payload: {},
        createdAt: '2025-01-01',
        attemptCount: 1,
      }

      mockStore.get.mockImplementation(() => {
        const request = {
          onsuccess: null as any,
          onerror: null,
          result: { ...mockOp },
        }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      mockStore.put.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      await queue.markConflict('op-123', {}, {}, [])

      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          conflictData: expect.objectContaining({
            autoResolvable: true,
          }),
        })
      )
    })
  })

  // ============================================================================
  // removeOperation
  // ============================================================================

  describe('removeOperation', () => {
    it('does nothing when no database', async () => {
      vi.stubGlobal('indexedDB', undefined)
      vi.resetModules()

      const { SyncQueue } = await import('@/lib/sync/syncQueue')
      const queue = new SyncQueue()
      await queue.init()

      // Should not throw
      await queue.removeOperation('op-123')
    })

    it('deletes operation from store', async () => {
      const queue = new SyncQueue()
      await queue.init()

      mockStore.delete.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      await queue.removeOperation('op-123')
      expect(mockStore.delete).toHaveBeenCalledWith('op-123')
    })
  })

  // ============================================================================
  // getStats
  // ============================================================================

  describe('getStats', () => {
    it('returns zeros when no database', async () => {
      vi.stubGlobal('indexedDB', undefined)
      vi.resetModules()

      const { SyncQueue } = await import('@/lib/sync/syncQueue')
      const queue = new SyncQueue()
      await queue.init()

      const stats = await queue.getStats()
      expect(stats).toEqual({
        pending: 0,
        inProgress: 0,
        failed: 0,
        conflicts: 0,
        total: 0,
      })
    })

    it('returns aggregated stats', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const indexMock = {
        getAll: vi.fn().mockImplementation((status) => {
          const counts: Record<string, SyncOperation[]> = {
            pending: [
              { id: '1', createdAt: '2025-01-01T09:00:00Z' } as SyncOperation,
              { id: '2', createdAt: '2025-01-01T10:00:00Z' } as SyncOperation,
            ],
            'in-progress': [{ id: '3' } as SyncOperation],
            failed: [],
            conflict: [{ id: '4' } as SyncOperation],
          }
          const request = {
            onsuccess: null as any,
            onerror: null,
            result: counts[status] || [],
          }
          setTimeout(() => request.onsuccess?.(), 0)
          return request
        }),
      }
      mockStore.index.mockReturnValue(indexMock)

      const stats = await queue.getStats()

      expect(stats.pending).toBe(2)
      expect(stats.inProgress).toBe(1)
      expect(stats.failed).toBe(0)
      expect(stats.conflicts).toBe(1)
      expect(stats.total).toBe(4)
      expect(stats.oldestPending).toBe('2025-01-01T09:00:00Z')
    })
  })

  // ============================================================================
  // clearCompleted / clearFailed / retryFailed
  // ============================================================================

  describe('clearCompleted', () => {
    it('removes all completed operations', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const indexMock = {
        getAll: vi.fn().mockImplementation(() => {
          const request = {
            onsuccess: null as any,
            onerror: null,
            result: [
              { id: '1' } as SyncOperation,
              { id: '2' } as SyncOperation,
            ],
          }
          setTimeout(() => request.onsuccess?.(), 0)
          return request
        }),
      }
      mockStore.index.mockReturnValue(indexMock)
      mockStore.delete.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      const count = await queue.clearCompleted()

      expect(count).toBe(2)
      expect(mockStore.delete).toHaveBeenCalledTimes(2)
    })
  })

  describe('clearFailed', () => {
    it('removes all failed operations', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const indexMock = {
        getAll: vi.fn().mockImplementation(() => {
          const request = {
            onsuccess: null as any,
            onerror: null,
            result: [{ id: '1' } as SyncOperation],
          }
          setTimeout(() => request.onsuccess?.(), 0)
          return request
        }),
      }
      mockStore.index.mockReturnValue(indexMock)
      mockStore.delete.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      const count = await queue.clearFailed()

      expect(count).toBe(1)
    })
  })

  describe('retryFailed', () => {
    it('resets failed operations to pending', async () => {
      const queue = new SyncQueue()
      await queue.init()

      const failedOps: SyncOperation[] = [
        { id: '1', status: 'failed', attemptCount: 3, errorMessage: 'Error' } as SyncOperation,
      ]

      const indexMock = {
        getAll: vi.fn().mockImplementation(() => {
          const request = {
            onsuccess: null as any,
            onerror: null,
            result: failedOps.map(op => ({ ...op })),
          }
          setTimeout(() => request.onsuccess?.(), 0)
          return request
        }),
      }
      mockStore.index.mockReturnValue(indexMock)
      mockStore.put.mockImplementation(() => {
        const request = { onsuccess: null as any, onerror: null }
        setTimeout(() => request.onsuccess?.(), 0)
        return request
      })

      const count = await queue.retryFailed()

      expect(count).toBe(1)
      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          attemptCount: 0,
          errorMessage: undefined,
        })
      )
    })
  })

  // ============================================================================
  // addEventListener
  // ============================================================================

  describe('addEventListener', () => {
    it('returns unsubscribe function', async () => {
      const queue = new SyncQueue()
      const listener = vi.fn()

      const unsubscribe = queue.addEventListener(listener)
      expect(typeof unsubscribe).toBe('function')

      unsubscribe()
      // Listener should be removed (we can't easily verify this without triggering an event)
    })
  })

  // ============================================================================
  // close
  // ============================================================================

  describe('close', () => {
    it('closes database connection', async () => {
      const queue = new SyncQueue()
      await queue.init()

      queue.close()

      expect(mockDB.close).toHaveBeenCalled()
    })

    it('handles already closed database', async () => {
      vi.stubGlobal('indexedDB', undefined)
      vi.resetModules()

      const { SyncQueue } = await import('@/lib/sync/syncQueue')
      const queue = new SyncQueue()
      await queue.init()

      // Should not throw
      queue.close()
    })
  })

  // ============================================================================
  // getSyncQueue singleton
  // ============================================================================

  describe('getSyncQueue', () => {
    it('returns singleton instance', async () => {
      vi.resetModules()
      const { getSyncQueue } = await import('@/lib/sync/syncQueue')

      const queue1 = await getSyncQueue()
      const queue2 = await getSyncQueue()

      expect(queue1).toBe(queue2)
    })

    it('initializes queue on first call', async () => {
      vi.resetModules()
      const { getSyncQueue } = await import('@/lib/sync/syncQueue')

      const queue = await getSyncQueue()
      expect(queue).toBeDefined()
      expect(mockIndexedDB.open).toHaveBeenCalled()
    })
  })
})
