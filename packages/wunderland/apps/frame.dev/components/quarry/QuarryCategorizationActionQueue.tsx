/**
 * Categorization Action Queue Component
 * @module components/quarry/CategorizationActionQueue
 *
 * Widget showing pending sync actions (adapts to GitHub or local files)
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  syncCategorizationActions,
  getPendingActionsCount,
} from '@/lib/categorization/githubSync'
import {
  getSourceDisplayName,
  isSourceReachable,
  getCodexSource,
} from '@/lib/categorization/sourceAdapter'
import type { CategorizationAction } from '@/lib/categorization/types'
import { getLocalCodexDb } from '@/lib/storage/localCodex'

export function CategorizationActionQueue() {
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncResult, setLastSyncResult] = useState<{
    synced: number
    failed: number
  } | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [actions, setActions] = useState<CategorizationAction[]>([])
  const [sourceName, setSourceName] = useState<string>('Loading...')

  // Load pending count
  const loadPendingCount = async () => {
    const count = await getPendingActionsCount()
    setPendingCount(count)
  }

  // Load pending actions (when expanded)
  const loadActions = async () => {
    try {
      const db = await getLocalCodexDb()
      const rows = (await db.all(
        'SELECT * FROM categorization_actions WHERE status = ? ORDER BY created_at DESC LIMIT 20',
        ['pending']
      )) as CategorizationAction[]
      setActions(rows || [])
    } catch (error) {
      console.error('[ActionQueue] Failed to load actions:', error)
    }
  }

  // Load source name
  const loadSourceName = async () => {
    const name = await getSourceDisplayName()
    setSourceName(name)
  }

  // Check online status
  const checkOnlineStatus = async () => {
    const reachable = await isSourceReachable()
    setIsOnline(reachable)
  }

  // Sync actions
  const handleSync = async () => {
    if (syncing || pendingCount === 0) return

    try {
      setSyncing(true)
      setError(null)

      const result = await syncCategorizationActions()
      setLastSyncResult(result)

      if (result.failed > 0) {
        setError(`${result.failed} action(s) failed to sync`)
      }

      await loadPendingCount()
      if (isExpanded) {
        await loadActions()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync actions'
      setError(errorMessage)
      console.error('[ActionQueue] Sync error:', err)
    } finally {
      setSyncing(false)
    }
  }

  // Auto-sync on network reconnect
  useEffect(() => {
    const handleOnline = () => {
      checkOnlineStatus()
      if (pendingCount > 0) {
        handleSync()
      }
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [pendingCount])

  // Initial load and refresh interval
  useEffect(() => {
    loadPendingCount()
    checkOnlineStatus()
    loadSourceName()

    const interval = setInterval(() => {
      loadPendingCount()
      checkOnlineStatus()
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Load actions when expanded
  useEffect(() => {
    if (isExpanded) {
      loadActions()
    }
  }, [isExpanded])

  if (pendingCount === 0 && !lastSyncResult) {
    return null
  }

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <span className="text-sm font-medium">
          {pendingCount > 0 ? `${pendingCount} Pending Sync` : 'Sync Queue'}
        </span>
        {!isOnline && (
          <span className="w-2 h-2 rounded-full bg-amber-500" title="Offline" />
        )}
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Categorization Queue
                </h3>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {sourceName}
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Status: {isOnline ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Online</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">Offline</span>
                  )}
                </span>
                <button
                  onClick={handleSync}
                  disabled={syncing || pendingCount === 0 || !isOnline}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {syncing ? 'Syncing...' : `Sync Now (${pendingCount})`}
                </button>
              </div>

              {lastSyncResult && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Last sync: {lastSyncResult.synced} succeeded
                  {lastSyncResult.failed > 0 && `, ${lastSyncResult.failed} failed`}
                </div>
              )}

              {error && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>

            {/* Actions List */}
            <div className="max-h-96 overflow-y-auto">
              {actions.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No pending actions
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {actions.map(action => {
                    const filename = action.to_path.split('/').pop() || 'Untitled'
                    const actionTypeLabel = {
                      move: 'Auto-move',
                      create_pr: 'Create PR',
                      create_issue: 'Create Issue',
                    }[action.action_type]

                    return (
                      <div key={action.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                              {filename}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {action.from_path} → {action.to_path}
                            </div>
                          </div>
                          <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300">
                            {actionTypeLabel}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
