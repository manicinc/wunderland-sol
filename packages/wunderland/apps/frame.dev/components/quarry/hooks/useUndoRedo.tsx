/**
 * React hook for undo/redo functionality
 *
 * Provides:
 * - Undo/redo stack management
 * - Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
 * - Integration with audit logging
 *
 * @module codex/hooks/useUndoRedo
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getDatabase } from '@/lib/codexDatabase'
import {
  createAuditService,
  createUndoRedoService,
  AuditService,
  UndoRedoService,
  type UndoStackInput,
  type UndoRedoResult,
  type UndoRedoServiceConfig,
  type UndoRedoHandler,
  type AuditActionType,
  type AuditActionName,
  type AuditTargetType
} from '@/lib/audit'

// ============================================================================
// SESSION ID MANAGEMENT
// ============================================================================

let globalSessionId: string | null = null

function getSessionId(): string {
  if (globalSessionId) return globalSessionId

  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('codex-session-id')
    if (stored) {
      globalSessionId = stored
      return stored
    }

    globalSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    sessionStorage.setItem('codex-session-id', globalSessionId)
  } else {
    globalSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }

  return globalSessionId
}

// ============================================================================
// HOOK OPTIONS
// ============================================================================

export interface UseUndoRedoOptions {
  /** Configuration overrides */
  config?: UndoRedoServiceConfig
  /** Handler for applying state changes */
  onApplyState?: UndoRedoHandler
  /** Enable keyboard shortcuts (default: true) */
  enableKeyboardShortcuts?: boolean
  /** Custom keyboard shortcut key (default: 'z') */
  undoKey?: string
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for undo/redo functionality
 */
export function useUndoRedo(options: UseUndoRedoOptions = {}) {
  const {
    config,
    onApplyState,
    enableKeyboardShortcuts = true,
    undoKey = 'z'
  } = options

  const [isReady, setIsReady] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [undoCount, setUndoCount] = useState(0)
  const [redoCount, setRedoCount] = useState(0)
  const [sessionId] = useState(() => getSessionId())

  const auditServiceRef = useRef<AuditService | null>(null)
  const undoRedoServiceRef = useRef<UndoRedoService | null>(null)
  const initPromiseRef = useRef<Promise<void> | null>(null)
  const handlerRef = useRef<UndoRedoHandler | undefined>(onApplyState)

  // Keep handler ref updated
  useEffect(() => {
    handlerRef.current = onApplyState
    if (undoRedoServiceRef.current && onApplyState) {
      undoRedoServiceRef.current.setHandler(onApplyState)
    }
  }, [onApplyState])

  // Update stack counts
  const updateCounts = useCallback(async () => {
    if (!undoRedoServiceRef.current) return

    const [canUndoNow, canRedoNow, undoCountNow, redoCountNow] = await Promise.all([
      undoRedoServiceRef.current.canUndo(),
      undoRedoServiceRef.current.canRedo(),
      undoRedoServiceRef.current.getUndoCount(),
      undoRedoServiceRef.current.getRedoCount()
    ])

    setCanUndo(canUndoNow)
    setCanRedo(canRedoNow)
    setUndoCount(undoCountNow)
    setRedoCount(redoCountNow)
  }, [])

  // Initialize services
  const initialize = useCallback(async () => {
    if (undoRedoServiceRef.current) return

    if (initPromiseRef.current) {
      await initPromiseRef.current
      return
    }

    initPromiseRef.current = (async () => {
      try {
        const db = await getDatabase()
        if (!db) {
          console.warn('[useUndoRedo] Database not available')
          return
        }

        // Create audit service
        auditServiceRef.current = createAuditService(db, sessionId)
        await auditServiceRef.current.initialize()

        // Create undo/redo service
        undoRedoServiceRef.current = createUndoRedoService(
          db,
          auditServiceRef.current,
          config
        )
        await undoRedoServiceRef.current.initialize()

        // Set handler if provided
        if (handlerRef.current) {
          undoRedoServiceRef.current.setHandler(handlerRef.current)
        }

        await updateCounts()
        setIsReady(true)
      } catch (error) {
        console.error('[useUndoRedo] Initialization failed:', error)
      }
    })()

    await initPromiseRef.current
  }, [sessionId, config, updateCounts])

  // Auto-initialize on mount
  useEffect(() => {
    initialize()

    return () => {
      auditServiceRef.current?.destroy()
    }
  }, [initialize])

  // Push an undoable action
  const pushUndoableAction = useCallback(async (
    input: UndoStackInput & {
      actionType: AuditActionType
      actionName: AuditActionName
    }
  ): Promise<string | null> => {
    if (!undoRedoServiceRef.current) {
      await initialize()
    }

    if (!undoRedoServiceRef.current) {
      console.warn('[useUndoRedo] Service not available')
      return null
    }

    const result = await undoRedoServiceRef.current.pushUndoableAction(input)
    await updateCounts()
    return result
  }, [initialize, updateCounts])

  // Perform undo
  const undo = useCallback(async (): Promise<UndoRedoResult> => {
    if (!undoRedoServiceRef.current) {
      return { success: false, error: 'Service not initialized' }
    }

    const result = await undoRedoServiceRef.current.undo()
    await updateCounts()
    return result
  }, [updateCounts])

  // Perform redo
  const redo = useCallback(async (): Promise<UndoRedoResult> => {
    if (!undoRedoServiceRef.current) {
      return { success: false, error: 'Service not initialized' }
    }

    const result = await undoRedoServiceRef.current.redo()
    await updateCounts()
    return result
  }, [updateCounts])

  // Clear stack
  const clearStack = useCallback(async (): Promise<void> => {
    if (undoRedoServiceRef.current) {
      await undoRedoServiceRef.current.clearStack()
      await updateCounts()
    }
  }, [updateCounts])

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts || !isReady) return

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd + Z (undo) or Ctrl/Cmd + Shift + Z (redo)
      const isUndoKey = e.key.toLowerCase() === undoKey.toLowerCase()
      const hasModifier = e.ctrlKey || e.metaKey

      if (!isUndoKey || !hasModifier) return

      // Ignore if in input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Only handle if we're in a CodeMirror or similar editor
        // that might want custom undo handling
        if (!target.closest('[data-codex-editor]')) {
          return
        }
      }

      e.preventDefault()

      if (e.shiftKey) {
        // Redo
        if (canRedo) {
          await redo()
        }
      } else {
        // Undo
        if (canUndo) {
          await undo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboardShortcuts, isReady, canUndo, canRedo, undo, redo, undoKey])

  return {
    isReady,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    undo,
    redo,
    pushUndoableAction,
    clearStack,
    sessionId,
    initialize
  }
}

// ============================================================================
// CONTEXT PROVIDER
// ============================================================================

import { createContext, useContext, type ReactNode } from 'react'

interface UndoRedoContextValue {
  isReady: boolean
  canUndo: boolean
  canRedo: boolean
  undoCount: number
  redoCount: number
  undo: () => Promise<UndoRedoResult>
  redo: () => Promise<UndoRedoResult>
  pushUndoableAction: (input: UndoStackInput & {
    actionType: AuditActionType
    actionName: AuditActionName
  }) => Promise<string | null>
  clearStack: () => Promise<void>
  sessionId: string
}

const UndoRedoContext = createContext<UndoRedoContextValue | null>(null)

export interface UndoRedoProviderProps {
  children: ReactNode
  onApplyState?: UndoRedoHandler
  config?: UndoRedoServiceConfig
  enableKeyboardShortcuts?: boolean
}

/**
 * Provider component for undo/redo functionality
 */
export function UndoRedoProvider({
  children,
  onApplyState,
  config,
  enableKeyboardShortcuts = true
}: UndoRedoProviderProps) {
  const value = useUndoRedo({
    onApplyState,
    config,
    enableKeyboardShortcuts
  })

  return (
    <UndoRedoContext.Provider value={value}>
      {children}
    </UndoRedoContext.Provider>
  )
}

/**
 * Hook to access undo/redo context
 */
export function useUndoRedoContext(): UndoRedoContextValue {
  const context = useContext(UndoRedoContext)
  if (!context) {
    throw new Error('useUndoRedoContext must be used within an UndoRedoProvider')
  }
  return context
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Hook for creating undoable content edits
 */
export function useUndoableContent(path: string) {
  const { pushUndoableAction, isReady } = useUndoRedo()

  const trackContentChange = useCallback(async (
    oldContent: string,
    newContent: string
  ): Promise<string | null> => {
    if (!isReady) return null

    return pushUndoableAction({
      actionType: 'content',
      actionName: 'update',
      targetType: 'strand',
      targetId: path,
      beforeState: { content: oldContent, path },
      afterState: { content: newContent, path }
    })
  }, [pushUndoableAction, isReady, path])

  return {
    trackContentChange,
    isReady
  }
}

/**
 * Hook for creating undoable file operations
 */
export function useUndoableFileOps() {
  const { pushUndoableAction, isReady } = useUndoRedo()

  const trackCreate = useCallback(async (
    path: string,
    content: string,
    title: string
  ): Promise<string | null> => {
    if (!isReady) return null

    return pushUndoableAction({
      actionType: 'file',
      actionName: 'create',
      targetType: 'strand',
      targetId: path,
      beforeState: { exists: false },
      afterState: { exists: true, path, content, title }
    })
  }, [pushUndoableAction, isReady])

  const trackDelete = useCallback(async (
    path: string,
    content: string,
    title: string
  ): Promise<string | null> => {
    if (!isReady) return null

    return pushUndoableAction({
      actionType: 'file',
      actionName: 'delete',
      targetType: 'strand',
      targetId: path,
      beforeState: { exists: true, path, content, title },
      afterState: { exists: false }
    })
  }, [pushUndoableAction, isReady])

  const trackMove = useCallback(async (
    oldPath: string,
    newPath: string,
    content: string
  ): Promise<string | null> => {
    if (!isReady) return null

    return pushUndoableAction({
      actionType: 'tree',
      actionName: 'move',
      targetType: 'strand',
      targetId: newPath,
      beforeState: { path: oldPath, content },
      afterState: { path: newPath, content }
    })
  }, [pushUndoableAction, isReady])

  const trackRename = useCallback(async (
    oldPath: string,
    newPath: string,
    oldTitle: string,
    newTitle: string
  ): Promise<string | null> => {
    if (!isReady) return null

    return pushUndoableAction({
      actionType: 'file',
      actionName: 'rename',
      targetType: 'strand',
      targetId: newPath,
      beforeState: { path: oldPath, title: oldTitle },
      afterState: { path: newPath, title: newTitle }
    })
  }, [pushUndoableAction, isReady])

  return {
    trackCreate,
    trackDelete,
    trackMove,
    trackRename,
    isReady
  }
}
