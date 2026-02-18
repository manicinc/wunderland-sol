/**
 * Tests for useTreePersistence Hook
 * @module __tests__/unit/hooks/useTreePersistence.test
 *
 * Tests for the tree persistence hook including:
 * - Publishing target detection
 * - Adding and tracking move operations
 * - Save locally functionality
 * - Publish functionality
 * - State management
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Use vi.hoisted to ensure mocks are available
const {
  mockBatchUpdatePaths,
  mockInitialize,
  mockCheckVaultStatus,
  mockGetStoredVaultHandle,
  mockBatchMoveVaultItems,
} = vi.hoisted(() => ({
  mockBatchUpdatePaths: vi.fn(),
  mockInitialize: vi.fn(),
  mockCheckVaultStatus: vi.fn(),
  mockGetStoredVaultHandle: vi.fn(),
  mockBatchMoveVaultItems: vi.fn(),
}))

// Mock the content store
vi.mock('@/lib/content/sqliteStore', () => ({
  getContentStore: () => ({
    initialize: mockInitialize,
    batchUpdatePaths: mockBatchUpdatePaths,
  }),
}))

// Mock the vault module
vi.mock('@/lib/vault', () => ({
  checkVaultStatus: mockCheckVaultStatus,
  getStoredVaultHandle: mockGetStoredVaultHandle,
  batchMoveVaultItems: mockBatchMoveVaultItems,
}))

// Import after mocks are defined
import {
  useTreePersistence,
  formatPublishTarget,
  getPublishTargetIcon,
  type SaveStatus,
  type PublishTarget,
} from '@/lib/planner/hooks/useTreePersistence'
import type { MoveOperation } from '@/components/quarry/tree/types'

// Helper to create mock move operations
function createMoveOperation(overrides: Partial<MoveOperation> = {}): MoveOperation {
  return {
    type: 'move',
    sourcePath: 'weaves/test/old-file.md',
    destPath: 'weaves/test/new-file.md',
    name: 'file.md',
    nodeType: 'file',
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('useTreePersistence', () => {
  // Mock localStorage
  const localStorageMock = {
    store: {} as Record<string, string>,
    getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageMock.store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageMock.store[key]
    }),
    clear: vi.fn(() => {
      localStorageMock.store = {}
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.store = {}
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })

    // Default mock implementations
    mockInitialize.mockResolvedValue(undefined)
    mockBatchUpdatePaths.mockResolvedValue({ success: true, updatedCount: 1, errors: [] })
    mockCheckVaultStatus.mockResolvedValue({ status: 'needs-setup' })
    mockGetStoredVaultHandle.mockResolvedValue(null)
    mockBatchMoveVaultItems.mockResolvedValue({ success: true, movedCount: 1, errors: [] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('starts with idle state and empty pending moves', async () => {
      const { result } = renderHook(() => useTreePersistence())

      expect(result.current.state.pendingMoves).toEqual([])
      expect(result.current.state.isDirty).toBe(false)
      expect(result.current.state.saveStatus).toBe('idle')
      expect(result.current.hasPendingMoves).toBe(false)
      expect(result.current.pendingCount).toBe(0)
    })

    it('detects SQLite as default publish target when no PAT or vault', async () => {
      const { result } = renderHook(() => useTreePersistence())

      await waitFor(() => {
        expect(result.current.state.publishTarget).toBe('sqlite')
      })
    })

    it('detects GitHub as publish target when PAT is set', async () => {
      localStorageMock.store['openstrand_github_pat'] = 'test-token'

      const { result } = renderHook(() => useTreePersistence())

      await waitFor(() => {
        expect(result.current.state.publishTarget).toBe('github')
      })
    })

    it('detects vault as publish target when vault is ready', async () => {
      mockCheckVaultStatus.mockResolvedValue({ status: 'ready' })

      const { result } = renderHook(() => useTreePersistence())

      await waitFor(() => {
        expect(result.current.state.publishTarget).toBe('vault')
      })
    })
  })

  describe('addMoves', () => {
    it('adds move operations to pending list', async () => {
      const { result } = renderHook(() => useTreePersistence())

      const moveOp = createMoveOperation()

      act(() => {
        result.current.addMoves([moveOp])
      })

      expect(result.current.state.pendingMoves).toHaveLength(1)
      expect(result.current.state.pendingMoves[0]).toEqual(moveOp)
      expect(result.current.state.isDirty).toBe(true)
      expect(result.current.hasPendingMoves).toBe(true)
      expect(result.current.pendingCount).toBe(1)
    })

    it('accumulates multiple move operations', async () => {
      const { result } = renderHook(() => useTreePersistence())

      const moveOp1 = createMoveOperation({ sourcePath: 'path1.md' })
      const moveOp2 = createMoveOperation({ sourcePath: 'path2.md' })

      act(() => {
        result.current.addMoves([moveOp1])
      })

      act(() => {
        result.current.addMoves([moveOp2])
      })

      expect(result.current.state.pendingMoves).toHaveLength(2)
      expect(result.current.pendingCount).toBe(2)
    })

    it('can add multiple operations at once', async () => {
      const { result } = renderHook(() => useTreePersistence())

      const moveOps = [
        createMoveOperation({ sourcePath: 'path1.md' }),
        createMoveOperation({ sourcePath: 'path2.md' }),
        createMoveOperation({ sourcePath: 'path3.md' }),
      ]

      act(() => {
        result.current.addMoves(moveOps)
      })

      expect(result.current.state.pendingMoves).toHaveLength(3)
      expect(result.current.pendingCount).toBe(3)
    })
  })

  describe('saveLocally', () => {
    it('saves pending moves to SQLite', async () => {
      const { result } = renderHook(() => useTreePersistence())

      const moveOp = createMoveOperation()

      act(() => {
        result.current.addMoves([moveOp])
      })

      let success: boolean
      await act(async () => {
        success = await result.current.saveLocally()
      })

      expect(success!).toBe(true)
      expect(mockBatchUpdatePaths).toHaveBeenCalledWith([moveOp])
      expect(result.current.state.saveStatus).toBe('saved')
    })

    it('sets error status on save failure', async () => {
      mockBatchUpdatePaths.mockResolvedValue({
        success: false,
        updatedCount: 0,
        errors: ['Database error'],
      })

      const { result } = renderHook(() => useTreePersistence())

      const moveOp = createMoveOperation()

      act(() => {
        result.current.addMoves([moveOp])
      })

      let success: boolean
      await act(async () => {
        success = await result.current.saveLocally()
      })

      expect(success!).toBe(false)
      expect(result.current.state.saveStatus).toBe('error')
      expect(result.current.state.lastError).toBe('Database error')
    })

    it('returns true when no pending moves', async () => {
      const { result } = renderHook(() => useTreePersistence())

      let success: boolean
      await act(async () => {
        success = await result.current.saveLocally()
      })

      expect(success!).toBe(true)
      expect(mockBatchUpdatePaths).not.toHaveBeenCalled()
    })

    it('calls onSaveComplete callback on success', async () => {
      const onSaveComplete = vi.fn()
      const { result } = renderHook(() =>
        useTreePersistence({ onSaveComplete })
      )

      const moveOp = createMoveOperation()

      act(() => {
        result.current.addMoves([moveOp])
      })

      await act(async () => {
        await result.current.saveLocally()
      })

      expect(onSaveComplete).toHaveBeenCalledWith(true)
    })

    it('calls onSaveComplete callback on failure', async () => {
      mockBatchUpdatePaths.mockResolvedValue({
        success: false,
        updatedCount: 0,
        errors: ['Error'],
      })

      const onSaveComplete = vi.fn()
      const { result } = renderHook(() =>
        useTreePersistence({ onSaveComplete })
      )

      const moveOp = createMoveOperation()

      act(() => {
        result.current.addMoves([moveOp])
      })

      await act(async () => {
        await result.current.saveLocally()
      })

      expect(onSaveComplete).toHaveBeenCalledWith(false)
    })
  })

  describe('publish', () => {
    it('returns true for GitHub target (deferred to modal)', async () => {
      localStorageMock.store['openstrand_github_pat'] = 'test-token'

      const { result } = renderHook(() => useTreePersistence())

      await waitFor(() => {
        expect(result.current.state.publishTarget).toBe('github')
      })

      const moveOp = createMoveOperation()
      act(() => {
        result.current.addMoves([moveOp])
      })

      let success: boolean
      await act(async () => {
        success = await result.current.publish()
      })

      expect(success!).toBe(true)
      // GitHub publish is handled by modal, not vault operations
      expect(mockBatchMoveVaultItems).not.toHaveBeenCalled()
    })

    it('publishes to vault when vault is target', async () => {
      mockCheckVaultStatus.mockResolvedValue({ status: 'ready' })
      const mockHandle = { name: 'test-vault' }
      mockGetStoredVaultHandle.mockResolvedValue(mockHandle)

      const { result } = renderHook(() => useTreePersistence())

      await waitFor(() => {
        expect(result.current.state.publishTarget).toBe('vault')
      })

      const moveOp = createMoveOperation()
      act(() => {
        result.current.addMoves([moveOp])
      })

      await act(async () => {
        await result.current.publish()
      })

      expect(mockBatchMoveVaultItems).toHaveBeenCalledWith(mockHandle, [moveOp])
    })

    it('clears pending moves after successful vault publish', async () => {
      mockCheckVaultStatus.mockResolvedValue({ status: 'ready' })
      mockGetStoredVaultHandle.mockResolvedValue({ name: 'test-vault' })

      const { result } = renderHook(() => useTreePersistence())

      await waitFor(() => {
        expect(result.current.state.publishTarget).toBe('vault')
      })

      const moveOp = createMoveOperation()
      act(() => {
        result.current.addMoves([moveOp])
      })

      await act(async () => {
        await result.current.publish()
      })

      expect(result.current.state.pendingMoves).toHaveLength(0)
      expect(result.current.hasPendingMoves).toBe(false)
    })

    it('sets error on vault publish failure', async () => {
      mockCheckVaultStatus.mockResolvedValue({ status: 'ready' })
      mockGetStoredVaultHandle.mockResolvedValue({ name: 'test-vault' })
      mockBatchMoveVaultItems.mockResolvedValue({
        success: false,
        movedCount: 0,
        errors: ['Vault error'],
      })

      const { result } = renderHook(() => useTreePersistence())

      await waitFor(() => {
        expect(result.current.state.publishTarget).toBe('vault')
      })

      const moveOp = createMoveOperation()
      act(() => {
        result.current.addMoves([moveOp])
      })

      await act(async () => {
        await result.current.publish()
      })

      expect(result.current.state.saveStatus).toBe('error')
      expect(result.current.state.lastError).toBe('Vault error')
    })

    it('calls onPublishComplete callback', async () => {
      mockCheckVaultStatus.mockResolvedValue({ status: 'ready' })
      mockGetStoredVaultHandle.mockResolvedValue({ name: 'test-vault' })

      const onPublishComplete = vi.fn()
      const { result } = renderHook(() =>
        useTreePersistence({ onPublishComplete })
      )

      await waitFor(() => {
        expect(result.current.state.publishTarget).toBe('vault')
      })

      const moveOp = createMoveOperation()
      act(() => {
        result.current.addMoves([moveOp])
      })

      await act(async () => {
        await result.current.publish()
      })

      expect(onPublishComplete).toHaveBeenCalledWith(true, 'vault')
    })
  })

  describe('clearPending', () => {
    it('clears all pending moves', async () => {
      const { result } = renderHook(() => useTreePersistence())

      const moveOps = [
        createMoveOperation({ sourcePath: 'path1.md' }),
        createMoveOperation({ sourcePath: 'path2.md' }),
      ]

      act(() => {
        result.current.addMoves(moveOps)
      })

      expect(result.current.pendingCount).toBe(2)

      act(() => {
        result.current.clearPending()
      })

      expect(result.current.state.pendingMoves).toHaveLength(0)
      expect(result.current.state.isDirty).toBe(false)
      expect(result.current.hasPendingMoves).toBe(false)
      expect(result.current.pendingCount).toBe(0)
    })

    it('clears error state', async () => {
      mockBatchUpdatePaths.mockResolvedValue({
        success: false,
        updatedCount: 0,
        errors: ['Error'],
      })

      const { result } = renderHook(() => useTreePersistence())

      act(() => {
        result.current.addMoves([createMoveOperation()])
      })

      await act(async () => {
        await result.current.saveLocally()
      })

      expect(result.current.state.saveStatus).toBe('error')

      act(() => {
        result.current.clearPending()
      })

      expect(result.current.state.saveStatus).toBe('idle')
      expect(result.current.state.lastError).toBeNull()
    })
  })
})

describe('utility functions', () => {
  describe('formatPublishTarget', () => {
    it('formats github target', () => {
      expect(formatPublishTarget('github')).toBe('GitHub')
    })

    it('formats vault target', () => {
      expect(formatPublishTarget('vault')).toBe('Local Vault')
    })

    it('formats sqlite target', () => {
      expect(formatPublishTarget('sqlite')).toBe('Local Database')
    })
  })

  describe('getPublishTargetIcon', () => {
    it('returns github icon name', () => {
      expect(getPublishTargetIcon('github')).toBe('github')
    })

    it('returns folder icon name for vault', () => {
      expect(getPublishTargetIcon('vault')).toBe('folder')
    })

    it('returns database icon name for sqlite', () => {
      expect(getPublishTargetIcon('sqlite')).toBe('database')
    })
  })
})
