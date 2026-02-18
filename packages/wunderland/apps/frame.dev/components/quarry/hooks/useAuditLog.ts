/**
 * React hook for audit logging
 *
 * Provides easy access to:
 * - Logging user actions
 * - Querying audit history
 * - Session tracking
 *
 * @module codex/hooks/useAuditLog
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getDatabase } from '@/lib/codexDatabase'
import {
  createAuditService,
  AuditService,
  type AuditLogInput,
  type AuditLogEntry,
  type AuditServiceConfig,
  type AuditActionType,
  type AuditStats
} from '@/lib/audit'

// ============================================================================
// SESSION ID MANAGEMENT
// ============================================================================

let globalSessionId: string | null = null

/**
 * Get or create a session ID that persists for the browser session
 */
function getSessionId(): string {
  if (globalSessionId) return globalSessionId

  // Check sessionStorage first
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('codex-session-id')
    if (stored) {
      globalSessionId = stored
      return stored
    }

    // Generate new session ID
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

export interface UseAuditLogOptions {
  /** Configuration overrides */
  config?: AuditServiceConfig
  /** Whether to initialize immediately (default: true) */
  autoInit?: boolean
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for audit logging functionality
 */
export function useAuditLog(options: UseAuditLogOptions = {}) {
  const { config, autoInit = true } = options

  const [isReady, setIsReady] = useState(false)
  const [sessionId] = useState(() => getSessionId())
  const serviceRef = useRef<AuditService | null>(null)
  const initPromiseRef = useRef<Promise<void> | null>(null)

  // Initialize the audit service
  const initialize = useCallback(async () => {
    if (serviceRef.current) return

    // Prevent multiple concurrent initializations
    if (initPromiseRef.current) {
      await initPromiseRef.current
      return
    }

    initPromiseRef.current = (async () => {
      try {
        const db = await getDatabase()
        if (!db) {
          console.warn('[useAuditLog] Database not available')
          return
        }

        serviceRef.current = createAuditService(db, sessionId, config)
        await serviceRef.current.initialize()
        setIsReady(true)
      } catch (error) {
        console.error('[useAuditLog] Initialization failed:', error)
      }
    })()

    await initPromiseRef.current
  }, [sessionId, config])

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInit) {
      initialize()
    }

    return () => {
      // Cleanup on unmount
      serviceRef.current?.destroy()
    }
  }, [autoInit, initialize])

  // Log an action
  const logAction = useCallback(async (input: AuditLogInput): Promise<string | null> => {
    if (!serviceRef.current) {
      await initialize()
    }

    if (!serviceRef.current) {
      console.warn('[useAuditLog] Service not available')
      return null
    }

    return serviceRef.current.logAction(input)
  }, [initialize])

  // Get recent actions
  const getRecentActions = useCallback(async (limit: number = 50): Promise<AuditLogEntry[]> => {
    if (!serviceRef.current) return []
    return serviceRef.current.getRecentActions(limit)
  }, [])

  // Get actions by type
  const getActionsByType = useCallback(async (
    actionType: AuditActionType,
    limit: number = 50
  ): Promise<AuditLogEntry[]> => {
    if (!serviceRef.current) return []
    return serviceRef.current.getActionsByType(actionType, limit)
  }, [])

  // Get actions for a target
  const getActionsForTarget = useCallback(async (
    targetPath: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> => {
    if (!serviceRef.current) return []
    return serviceRef.current.getActionsForTarget(targetPath, limit)
  }, [])

  // Get statistics
  const getStats = useCallback(async (): Promise<AuditStats | null> => {
    if (!serviceRef.current) return null
    return serviceRef.current.getStats()
  }, [])

  // Flush pending writes
  const flush = useCallback(async (): Promise<void> => {
    if (serviceRef.current) {
      await serviceRef.current.flushWrites()
    }
  }, [])

  return {
    sessionId,
    isReady,
    logAction,
    getRecentActions,
    getActionsByType,
    getActionsForTarget,
    getStats,
    flush,
    initialize
  }
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for logging navigation events
 */
export function useNavigationLogger() {
  const { logAction, isReady } = useAuditLog()

  const logPageView = useCallback(async (path: string, title?: string) => {
    if (!isReady) return null

    return logAction({
      actionType: 'navigation',
      actionName: 'view',
      targetType: 'strand',
      targetPath: path,
      newValue: { title, viewedAt: new Date().toISOString() }
    })
  }, [logAction, isReady])

  const logSearch = useCallback(async (query: string, resultCount: number) => {
    if (!isReady) return null

    return logAction({
      actionType: 'navigation',
      actionName: 'search',
      targetType: 'search_query',
      newValue: { query, resultCount }
    })
  }, [logAction, isReady])

  const logJumpToHeading = useCallback(async (path: string, headingId: string, headingText: string) => {
    if (!isReady) return null

    return logAction({
      actionType: 'navigation',
      actionName: 'jump_to_heading',
      targetType: 'strand',
      targetPath: path,
      targetId: headingId,
      newValue: { headingText }
    })
  }, [logAction, isReady])

  return {
    logPageView,
    logSearch,
    logJumpToHeading,
    isReady
  }
}

/**
 * Hook for logging content edit events
 */
export function useContentLogger() {
  const { logAction, isReady } = useAuditLog()

  const logContentUpdate = useCallback(async (
    path: string,
    oldContent: string,
    newContent: string,
    isUndoable: boolean = true
  ) => {
    if (!isReady) return null

    return logAction({
      actionType: 'content',
      actionName: 'update',
      targetType: 'strand',
      targetPath: path,
      oldValue: { content: oldContent },
      newValue: { content: newContent },
      isUndoable
    })
  }, [logAction, isReady])

  const logPublish = useCallback(async (path: string, content: string) => {
    if (!isReady) return null

    return logAction({
      actionType: 'content',
      actionName: 'publish',
      targetType: 'strand',
      targetPath: path,
      newValue: { content, publishedAt: new Date().toISOString() }
    })
  }, [logAction, isReady])

  return {
    logContentUpdate,
    logPublish,
    isReady
  }
}

/**
 * Hook for logging file/tree operations
 */
export function useFileLogger() {
  const { logAction, isReady } = useAuditLog()

  const logCreate = useCallback(async (path: string, title: string) => {
    if (!isReady) return null

    return logAction({
      actionType: 'file',
      actionName: 'create',
      targetType: 'strand',
      targetPath: path,
      newValue: { title, createdAt: new Date().toISOString() },
      isUndoable: true
    })
  }, [logAction, isReady])

  const logDelete = useCallback(async (path: string, content?: string) => {
    if (!isReady) return null

    return logAction({
      actionType: 'file',
      actionName: 'delete',
      targetType: 'strand',
      targetPath: path,
      oldValue: content ? { content } : undefined,
      isUndoable: true
    })
  }, [logAction, isReady])

  const logRename = useCallback(async (oldPath: string, newPath: string) => {
    if (!isReady) return null

    return logAction({
      actionType: 'file',
      actionName: 'rename',
      targetType: 'strand',
      targetPath: newPath,
      oldValue: { path: oldPath },
      newValue: { path: newPath },
      isUndoable: true
    })
  }, [logAction, isReady])

  const logMove = useCallback(async (oldPath: string, newPath: string) => {
    if (!isReady) return null

    return logAction({
      actionType: 'tree',
      actionName: 'move',
      targetType: 'strand',
      targetPath: newPath,
      oldValue: { path: oldPath },
      newValue: { path: newPath },
      isUndoable: true
    })
  }, [logAction, isReady])

  return {
    logCreate,
    logDelete,
    logRename,
    logMove,
    isReady
  }
}
