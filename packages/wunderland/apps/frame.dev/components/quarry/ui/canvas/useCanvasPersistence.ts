/**
 * Canvas Persistence Hook
 * @module codex/ui/canvas/useCanvasPersistence
 *
 * Persists canvas state to localStorage:
 * - Viewport (position, zoom)
 * - User-positioned strands
 * - Custom groupings
 * - Active layout preset
 */

'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { Editor, TLStoreSnapshot, TLRecord } from '@tldraw/tldraw'
import type { LayoutPreset } from '../misc/KnowledgeCanvas'

interface CanvasPersistedState {
  /** Canvas ID this state belongs to */
  canvasId: string
  /** Layout preset */
  layout: LayoutPreset
  /** Viewport camera position and zoom */
  camera: {
    x: number
    y: number
    z: number
  }
  /** Timestamp of last save */
  savedAt: string
  /** Version for migrations */
  version: number
}

interface UseCanvasPersistenceOptions {
  /** Unique canvas ID for storage key */
  canvasId: string
  /** tldraw Editor instance */
  editor: Editor | null
  /** Current layout preset */
  layout: LayoutPreset
  /** Auto-save interval in ms (default: 2000) */
  autoSaveInterval?: number
  /** Enable auto-save (default: true) */
  autoSave?: boolean
}

const STORAGE_PREFIX = 'quarry-canvas-'
const CURRENT_VERSION = 1

/**
 * Get storage key for canvas
 */
function getStorageKey(canvasId: string): string {
  return `${STORAGE_PREFIX}${canvasId}`
}

/**
 * Hook for persisting canvas state
 */
export function useCanvasPersistence({
  canvasId,
  editor,
  layout,
  autoSaveInterval = 2000,
  autoSave = true,
}: UseCanvasPersistenceOptions) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef<string>('')

  /**
   * Save canvas state to localStorage
   */
  const saveState = useCallback(() => {
    if (!editor || !canvasId) return

    try {
      const camera = editor.getCamera()

      const state: CanvasPersistedState = {
        canvasId,
        layout,
        camera: {
          x: camera.x,
          y: camera.y,
          z: camera.z,
        },
        savedAt: new Date().toISOString(),
        version: CURRENT_VERSION,
      }

      const stateJson = JSON.stringify(state)

      // Skip if nothing changed
      if (stateJson === lastSaveRef.current) return

      localStorage.setItem(getStorageKey(canvasId), stateJson)
      lastSaveRef.current = stateJson
    } catch (error) {
      console.warn('Failed to save canvas state:', error)
    }
  }, [editor, canvasId, layout])

  /**
   * Load canvas state from localStorage
   */
  const loadState = useCallback((): CanvasPersistedState | null => {
    if (!canvasId) return null

    try {
      const stored = localStorage.getItem(getStorageKey(canvasId))
      if (!stored) return null

      const state = JSON.parse(stored) as CanvasPersistedState

      // Validate version
      if (state.version !== CURRENT_VERSION) {
        // Could add migration logic here
        console.log('Canvas state version mismatch, skipping restore')
        return null
      }

      // Validate canvas ID
      if (state.canvasId !== canvasId) {
        return null
      }

      return state
    } catch (error) {
      console.warn('Failed to load canvas state:', error)
      return null
    }
  }, [canvasId])

  /**
   * Restore camera position from saved state
   */
  const restoreCamera = useCallback(() => {
    if (!editor) return false

    const state = loadState()
    if (!state?.camera) return false

    try {
      editor.setCamera({
        x: state.camera.x,
        y: state.camera.y,
        z: state.camera.z,
      })
      return true
    } catch (error) {
      console.warn('Failed to restore camera:', error)
      return false
    }
  }, [editor, loadState])

  /**
   * Clear saved state for this canvas
   */
  const clearState = useCallback(() => {
    if (!canvasId) return

    try {
      localStorage.removeItem(getStorageKey(canvasId))
      lastSaveRef.current = ''
    } catch (error) {
      console.warn('Failed to clear canvas state:', error)
    }
  }, [canvasId])

  /**
   * Schedule debounced save
   */
  const scheduleSave = useCallback(() => {
    if (!autoSave) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveState()
    }, autoSaveInterval)
  }, [autoSave, autoSaveInterval, saveState])

  // Listen to editor changes for auto-save
  useEffect(() => {
    if (!editor || !autoSave) return

    const unsubscribe = editor.store.listen(
      () => {
        scheduleSave()
      },
      { scope: 'document', source: 'user' }
    )

    return () => {
      unsubscribe()
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [editor, autoSave, scheduleSave])

  // Restore on mount
  useEffect(() => {
    if (!editor) return

    // Small delay to let tldraw initialize
    const timer = setTimeout(() => {
      restoreCamera()
    }, 100)

    return () => clearTimeout(timer)
  }, [editor, restoreCamera])

  // Save layout changes
  useEffect(() => {
    if (editor && layout) {
      scheduleSave()
    }
  }, [editor, layout, scheduleSave])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      // Final save on unmount
      saveState()
    }
  }, [saveState])

  return {
    saveState,
    loadState,
    restoreCamera,
    clearState,
    getPersistedLayout: () => loadState()?.layout,
  }
}

export default useCanvasPersistence
