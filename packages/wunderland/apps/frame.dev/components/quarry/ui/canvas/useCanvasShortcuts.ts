/**
 * Canvas Keyboard Shortcuts Hook
 * @module codex/ui/canvas/useCanvasShortcuts
 *
 * Provides keyboard shortcuts for the KnowledgeCanvas:
 * - V: Toggle view mode (list/canvas/split)
 * - G: Toggle snap-to-grid
 * - Cmd/Ctrl+0: Reset zoom
 * - Cmd/Ctrl++: Zoom in
 * - Cmd/Ctrl+-: Zoom out
 * - Delete/Backspace: Remove selected shapes
 * - Cmd/Ctrl+A: Select all
 * - Escape: Deselect all
 * - 1-5: Switch layout preset
 */

'use client'

import { useEffect, useCallback, useRef } from 'react'
import type { Editor } from '@tldraw/tldraw'
import type { LayoutPreset } from '../misc/KnowledgeCanvas'
import type { BrowseViewMode } from '../browse/BrowseViewToggle'

interface UseCanvasShortcutsOptions {
  editor: Editor | null
  enabled?: boolean
  /** Current layout preset */
  layout?: LayoutPreset
  /** Callback to change layout */
  onLayoutChange?: (layout: LayoutPreset) => void
  /** Current view mode */
  viewMode?: BrowseViewMode
  /** Callback to change view mode */
  onViewModeChange?: (mode: BrowseViewMode) => void
  /** Snap to grid state */
  snapToGrid?: boolean
  /** Callback to toggle snap to grid */
  onSnapToGridChange?: (enabled: boolean) => void
}

// Layout preset number keys
const LAYOUT_KEY_MAP: Record<string, LayoutPreset> = {
  '1': 'freeform',
  '2': 'grid',
  '3': 'force',
  '4': 'timeline',
  '5': 'cluster',
}

// View mode cycle order
const VIEW_MODE_CYCLE: BrowseViewMode[] = ['list', 'split', 'canvas']

/**
 * Hook for canvas keyboard shortcuts
 */
export function useCanvasShortcuts({
  editor,
  enabled = true,
  layout,
  onLayoutChange,
  viewMode,
  onViewModeChange,
  snapToGrid = false,
  onSnapToGridChange,
}: UseCanvasShortcutsOptions) {
  const isInputFocused = useRef(false)

  // Check if we're in an input field
  const checkInputFocus = useCallback(() => {
    const activeElement = document.activeElement
    if (!activeElement) return false

    const tagName = activeElement.tagName.toLowerCase()
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return true
    }

    if ((activeElement as HTMLElement).contentEditable === 'true') {
      return true
    }

    return false
  }, [])

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // Skip if in input field
      if (checkInputFocus()) return

      const isMod = e.metaKey || e.ctrlKey

      // V: Toggle view mode
      if (e.key === 'v' && !isMod && !e.shiftKey && viewMode && onViewModeChange) {
        e.preventDefault()
        const currentIndex = VIEW_MODE_CYCLE.indexOf(viewMode)
        const nextIndex = (currentIndex + 1) % VIEW_MODE_CYCLE.length
        onViewModeChange(VIEW_MODE_CYCLE[nextIndex])
        return
      }

      // G: Toggle snap to grid
      if (e.key === 'g' && !isMod && !e.shiftKey && onSnapToGridChange) {
        e.preventDefault()
        onSnapToGridChange(!snapToGrid)
        return
      }

      // Number keys 1-5: Switch layout preset
      if (LAYOUT_KEY_MAP[e.key] && !isMod && !e.shiftKey && onLayoutChange) {
        e.preventDefault()
        onLayoutChange(LAYOUT_KEY_MAP[e.key])
        return
      }

      // Editor-specific shortcuts (need editor)
      if (!editor) return

      // Cmd/Ctrl+0: Reset zoom
      if (e.key === '0' && isMod) {
        e.preventDefault()
        editor.resetZoom()
        return
      }

      // Cmd/Ctrl++: Zoom in
      if ((e.key === '=' || e.key === '+') && isMod) {
        e.preventDefault()
        editor.zoomIn()
        return
      }

      // Cmd/Ctrl+-: Zoom out
      if (e.key === '-' && isMod) {
        e.preventDefault()
        editor.zoomOut()
        return
      }

      // F: Fit to view
      if (e.key === 'f' && !isMod && !e.shiftKey) {
        e.preventDefault()
        editor.zoomToFit({ duration: 300 })
        return
      }

      // Delete/Backspace: Remove selected shapes
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isMod) {
        e.preventDefault()
        editor.deleteShapes(editor.getSelectedShapeIds())
        return
      }

      // Cmd/Ctrl+A: Select all
      if (e.key === 'a' && isMod) {
        e.preventDefault()
        editor.selectAll()
        return
      }

      // Escape: Deselect all
      if (e.key === 'Escape') {
        e.preventDefault()
        editor.selectNone()
        return
      }
    },
    [
      enabled,
      editor,
      checkInputFocus,
      layout,
      onLayoutChange,
      viewMode,
      onViewModeChange,
      snapToGrid,
      onSnapToGridChange,
    ]
  )

  // Set up event listener
  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])

  // Return shortcut info for help display
  return {
    shortcuts: [
      { key: 'V', description: 'Toggle view mode' },
      { key: 'G', description: 'Toggle snap-to-grid' },
      { key: '1-5', description: 'Switch layout preset' },
      { key: 'F', description: 'Fit to view' },
      { key: 'Cmd+0', description: 'Reset zoom' },
      { key: 'Cmd++', description: 'Zoom in' },
      { key: 'Cmd+-', description: 'Zoom out' },
      { key: 'Delete', description: 'Remove selected' },
      { key: 'Cmd+A', description: 'Select all' },
      { key: 'Esc', description: 'Deselect all' },
    ],
  }
}

export default useCanvasShortcuts
