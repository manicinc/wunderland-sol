/**
 * Component Tests for useCanvasShortcuts Hook
 * @module __tests__/components/hooks/useCanvasShortcuts.test
 *
 * Tests for the canvas keyboard shortcuts hook including:
 * - View mode toggle (V key)
 * - Snap-to-grid toggle (G key)
 * - Layout preset switching (1-5 keys)
 * - Zoom controls (Cmd+0, Cmd++, Cmd+-)
 * - Selection shortcuts (Cmd+A, Escape, Delete)
 * - Input field detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvasShortcuts } from '@/components/quarry/ui/canvas/useCanvasShortcuts'
import type { Editor } from '@tldraw/tldraw'

// Mock tldraw Editor
function createMockEditor(): Partial<Editor> {
  return {
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    resetZoom: vi.fn(),
    zoomToFit: vi.fn(),
    deleteShapes: vi.fn(),
    selectAll: vi.fn(),
    selectNone: vi.fn(),
    getSelectedShapeIds: vi.fn().mockReturnValue(['shape-1', 'shape-2']),
  }
}

describe('useCanvasShortcuts', () => {
  let mockEditor: Partial<Editor>

  beforeEach(() => {
    mockEditor = createMockEditor()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should return shortcuts array', () => {
      const { result } = renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
        })
      )

      expect(result.current.shortcuts).toBeDefined()
      expect(Array.isArray(result.current.shortcuts)).toBe(true)
      expect(result.current.shortcuts.length).toBeGreaterThan(0)
    })

    it('should include expected shortcuts in the list', () => {
      const { result } = renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
        })
      )

      const shortcutKeys = result.current.shortcuts.map((s) => s.key)

      expect(shortcutKeys).toContain('V')
      expect(shortcutKeys).toContain('G')
      expect(shortcutKeys).toContain('1-5')
      expect(shortcutKeys).toContain('F')
      expect(shortcutKeys).toContain('Cmd+0')
      expect(shortcutKeys).toContain('Delete')
      expect(shortcutKeys).toContain('Esc')
    })
  })

  describe('view mode toggle (V key)', () => {
    it('should cycle through view modes on V press', () => {
      const onViewModeChange = vi.fn()
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
          viewMode: 'list',
          onViewModeChange,
        })
      )

      // Simulate V key press
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'v', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(onViewModeChange).toHaveBeenCalledWith('split')
    })

    it('should cycle from split to canvas', () => {
      const onViewModeChange = vi.fn()
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
          viewMode: 'split',
          onViewModeChange,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'v', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(onViewModeChange).toHaveBeenCalledWith('canvas')
    })

    it('should cycle from canvas back to list', () => {
      const onViewModeChange = vi.fn()
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
          viewMode: 'canvas',
          onViewModeChange,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'v', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(onViewModeChange).toHaveBeenCalledWith('list')
    })

    it('should not trigger on Cmd+V (paste)', () => {
      const onViewModeChange = vi.fn()
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
          viewMode: 'list',
          onViewModeChange,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'v',
          metaKey: true,
          bubbles: true,
        })
        window.dispatchEvent(event)
      })

      expect(onViewModeChange).not.toHaveBeenCalled()
    })
  })

  describe('snap-to-grid toggle (G key)', () => {
    it('should toggle snap-to-grid on G press', () => {
      const onSnapToGridChange = vi.fn()
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
          snapToGrid: false,
          onSnapToGridChange,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'g', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(onSnapToGridChange).toHaveBeenCalledWith(true)
    })

    it('should toggle off when already enabled', () => {
      const onSnapToGridChange = vi.fn()
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
          snapToGrid: true,
          onSnapToGridChange,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'g', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(onSnapToGridChange).toHaveBeenCalledWith(false)
    })
  })

  describe('layout preset switching (1-5 keys)', () => {
    it('should switch to freeform on 1 key', () => {
      const onLayoutChange = vi.fn()
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
          layout: 'grid',
          onLayoutChange,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '1', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(onLayoutChange).toHaveBeenCalledWith('freeform')
    })

    it('should switch to grid on 2 key', () => {
      const onLayoutChange = vi.fn()
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
          layout: 'freeform',
          onLayoutChange,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '2', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(onLayoutChange).toHaveBeenCalledWith('grid')
    })

    it('should switch to force on 3 key', () => {
      const onLayoutChange = vi.fn()
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
          layout: 'freeform',
          onLayoutChange,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '3', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(onLayoutChange).toHaveBeenCalledWith('force')
    })

    it('should switch to timeline on 4 key', () => {
      const onLayoutChange = vi.fn()
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
          layout: 'freeform',
          onLayoutChange,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '4', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(onLayoutChange).toHaveBeenCalledWith('timeline')
    })

    it('should switch to cluster on 5 key', () => {
      const onLayoutChange = vi.fn()
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
          layout: 'freeform',
          onLayoutChange,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '5', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(onLayoutChange).toHaveBeenCalledWith('cluster')
    })
  })

  describe('zoom controls', () => {
    it('should reset zoom on Cmd+0', () => {
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: '0',
          metaKey: true,
          bubbles: true,
        })
        window.dispatchEvent(event)
      })

      expect(mockEditor.resetZoom).toHaveBeenCalled()
    })

    it('should zoom in on Cmd+=', () => {
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: '=',
          metaKey: true,
          bubbles: true,
        })
        window.dispatchEvent(event)
      })

      expect(mockEditor.zoomIn).toHaveBeenCalled()
    })

    it('should zoom out on Cmd+-', () => {
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: '-',
          metaKey: true,
          bubbles: true,
        })
        window.dispatchEvent(event)
      })

      expect(mockEditor.zoomOut).toHaveBeenCalled()
    })

    it('should fit to view on F key', () => {
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'f', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(mockEditor.zoomToFit).toHaveBeenCalledWith({ duration: 300 })
    })
  })

  describe('selection shortcuts', () => {
    it('should select all on Cmd+A', () => {
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'a',
          metaKey: true,
          bubbles: true,
        })
        window.dispatchEvent(event)
      })

      expect(mockEditor.selectAll).toHaveBeenCalled()
    })

    it('should deselect all on Escape', () => {
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(mockEditor.selectNone).toHaveBeenCalled()
    })

    it('should delete selected shapes on Delete', () => {
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(mockEditor.getSelectedShapeIds).toHaveBeenCalled()
      expect(mockEditor.deleteShapes).toHaveBeenCalledWith(['shape-1', 'shape-2'])
    })

    it('should delete selected shapes on Backspace', () => {
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(mockEditor.deleteShapes).toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('should not respond to shortcuts when disabled', () => {
      const onViewModeChange = vi.fn()
      renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: false,
          viewMode: 'list',
          onViewModeChange,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'v', bubbles: true })
        window.dispatchEvent(event)
      })

      expect(onViewModeChange).not.toHaveBeenCalled()
    })

    it('should not respond when no editor is provided', () => {
      renderHook(() =>
        useCanvasShortcuts({
          editor: null,
          enabled: true,
        })
      )

      // Should not throw errors
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'f', bubbles: true })
        window.dispatchEvent(event)
      })
    })
  })

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = renderHook(() =>
        useCanvasShortcuts({
          editor: mockEditor as Editor,
          enabled: true,
        })
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })
})
