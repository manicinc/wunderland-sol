/**
 * Component Tests for useCanvasPersistence Hook
 * @module __tests__/components/hooks/useCanvasPersistence.test
 *
 * Tests for the canvas persistence hook including:
 * - State saving to localStorage
 * - State loading from localStorage
 * - Camera restoration
 * - Auto-save functionality
 * - State clearing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCanvasPersistence } from '@/components/quarry/ui/canvas/useCanvasPersistence'
import type { Editor } from '@tldraw/tldraw'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
    _getStore: () => store,
    _reset: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock tldraw Editor
function createMockEditor(): Partial<Editor> {
  const mockUnsubscribe = vi.fn()
  return {
    getCamera: vi.fn().mockReturnValue({ x: 100, y: 200, z: 1.5 }),
    setCamera: vi.fn(),
    store: {
      listen: vi.fn().mockReturnValue(mockUnsubscribe),
    },
  }
}

describe('useCanvasPersistence', () => {
  let mockEditor: ReturnType<typeof createMockEditor>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    localStorageMock._reset()
    mockEditor = createMockEditor()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('saveState', () => {
    it('should save canvas state to localStorage', () => {
      const { result } = renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: mockEditor as unknown as Editor,
          layout: 'grid',
          autoSave: false,
        })
      )

      act(() => {
        result.current.saveState()
      })

      expect(localStorageMock.setItem).toHaveBeenCalled()

      const savedState = JSON.parse(
        localStorageMock._getStore()['quarry-canvas-test-canvas']
      )

      expect(savedState.canvasId).toBe('test-canvas')
      expect(savedState.layout).toBe('grid')
      expect(savedState.camera).toEqual({ x: 100, y: 200, z: 1.5 })
      expect(savedState.version).toBe(1)
      expect(savedState.savedAt).toBeDefined()
    })

    it('should not save if editor is null', () => {
      const { result } = renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: null,
          layout: 'grid',
          autoSave: false,
        })
      )

      act(() => {
        result.current.saveState()
      })

      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    it('should not save if nothing changed', () => {
      const { result } = renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: mockEditor as unknown as Editor,
          layout: 'grid',
          autoSave: false,
        })
      )

      // First save
      act(() => {
        result.current.saveState()
      })

      const firstCallCount = localStorageMock.setItem.mock.calls.length

      // Second save with same data
      act(() => {
        result.current.saveState()
      })

      // Should not have called setItem again
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(firstCallCount)
    })
  })

  describe('loadState', () => {
    it('should load saved state from localStorage', () => {
      const savedState = {
        canvasId: 'test-canvas',
        layout: 'force',
        camera: { x: 50, y: 75, z: 2.0 },
        savedAt: new Date().toISOString(),
        version: 1,
      }

      localStorageMock._reset()
      localStorageMock.setItem('quarry-canvas-test-canvas', JSON.stringify(savedState))
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'quarry-canvas-test-canvas') {
          return JSON.stringify(savedState)
        }
        return null
      })

      const { result } = renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: mockEditor as unknown as Editor,
          layout: 'grid',
          autoSave: false,
        })
      )

      const loaded = result.current.loadState()

      expect(loaded).not.toBeNull()
      expect(loaded?.canvasId).toBe('test-canvas')
      expect(loaded?.layout).toBe('force')
      expect(loaded?.camera).toEqual({ x: 50, y: 75, z: 2.0 })
    })

    it('should return null if no saved state exists', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const { result } = renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: mockEditor as unknown as Editor,
          layout: 'grid',
          autoSave: false,
        })
      )

      const loaded = result.current.loadState()
      expect(loaded).toBeNull()
    })

    it('should return null if canvasId does not match', () => {
      const savedState = {
        canvasId: 'different-canvas',
        layout: 'force',
        camera: { x: 50, y: 75, z: 2.0 },
        savedAt: new Date().toISOString(),
        version: 1,
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState))

      const { result } = renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: mockEditor as unknown as Editor,
          layout: 'grid',
          autoSave: false,
        })
      )

      const loaded = result.current.loadState()
      expect(loaded).toBeNull()
    })

    it('should return null if version does not match', () => {
      const savedState = {
        canvasId: 'test-canvas',
        layout: 'force',
        camera: { x: 50, y: 75, z: 2.0 },
        savedAt: new Date().toISOString(),
        version: 999, // Different version
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState))

      const { result } = renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: mockEditor as unknown as Editor,
          layout: 'grid',
          autoSave: false,
        })
      )

      const loaded = result.current.loadState()
      expect(loaded).toBeNull()
    })
  })

  describe('restoreCamera', () => {
    it('should restore camera position from saved state', () => {
      const savedState = {
        canvasId: 'test-canvas',
        layout: 'force',
        camera: { x: 50, y: 75, z: 2.0 },
        savedAt: new Date().toISOString(),
        version: 1,
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState))

      const { result } = renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: mockEditor as unknown as Editor,
          layout: 'grid',
          autoSave: false,
        })
      )

      const restored = result.current.restoreCamera()

      expect(restored).toBe(true)
      expect(mockEditor.setCamera).toHaveBeenCalledWith({
        x: 50,
        y: 75,
        z: 2.0,
      })
    })

    it('should return false if no state to restore', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const { result } = renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: mockEditor as unknown as Editor,
          layout: 'grid',
          autoSave: false,
        })
      )

      const restored = result.current.restoreCamera()
      expect(restored).toBe(false)
    })

    it('should return false if editor is null', () => {
      const { result } = renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: null,
          layout: 'grid',
          autoSave: false,
        })
      )

      const restored = result.current.restoreCamera()
      expect(restored).toBe(false)
    })
  })

  describe('clearState', () => {
    it('should remove saved state from localStorage', () => {
      localStorageMock.setItem('quarry-canvas-test-canvas', '{}')

      const { result } = renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: mockEditor as unknown as Editor,
          layout: 'grid',
          autoSave: false,
        })
      )

      act(() => {
        result.current.clearState()
      })

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('quarry-canvas-test-canvas')
    })
  })

  describe('getPersistedLayout', () => {
    it('should return persisted layout from saved state', () => {
      const savedState = {
        canvasId: 'test-canvas',
        layout: 'timeline',
        camera: { x: 50, y: 75, z: 2.0 },
        savedAt: new Date().toISOString(),
        version: 1,
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState))

      const { result } = renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: mockEditor as unknown as Editor,
          layout: 'grid',
          autoSave: false,
        })
      )

      const layout = result.current.getPersistedLayout()
      expect(layout).toBe('timeline')
    })

    it('should return undefined if no saved state', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const { result } = renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: mockEditor as unknown as Editor,
          layout: 'grid',
          autoSave: false,
        })
      )

      const layout = result.current.getPersistedLayout()
      expect(layout).toBeUndefined()
    })
  })

  describe('auto-save', () => {
    it('should set up store listener when autoSave is enabled', () => {
      renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: mockEditor as unknown as Editor,
          layout: 'grid',
          autoSave: true,
        })
      )

      expect(mockEditor.store?.listen).toHaveBeenCalledWith(
        expect.any(Function),
        { scope: 'document', source: 'user' }
      )
    })

    it('should not set up store listener when autoSave is disabled', () => {
      renderHook(() =>
        useCanvasPersistence({
          canvasId: 'test-canvas',
          editor: mockEditor as unknown as Editor,
          layout: 'grid',
          autoSave: false,
        })
      )

      expect(mockEditor.store?.listen).not.toHaveBeenCalled()
    })
  })
})
