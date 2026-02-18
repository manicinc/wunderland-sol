/**
 * Offline Indicator Component
 * @module codex/ui/OfflineIndicator
 *
 * Visual indicator for network status with sync queue info.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  Check,
  ChevronDown,
} from 'lucide-react'
import { useOnlineStatus, formatOfflineDuration } from '@/lib/hooks/useOnlineStatus'
import { getSyncQueue } from '@/lib/sync/syncQueue'
import {
  processPendingSync as processSyncQueue,
  retryFailedOperations,
  getSyncStatus,
  type SyncProgress,
} from '@/lib/sync/syncProcessor'
import type { SyncQueueStats } from '@/lib/sync/types'
import { cn } from '@/lib/utils'

export interface OfflineIndicatorProps {
  /** Theme */
  theme?: 'light' | 'dark'
  /** Show as compact badge */
  compact?: boolean
  /** Show sync queue stats */
  showSyncStats?: boolean
  /** Additional class names */
  className?: string
  /** Position for floating indicator */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export function OfflineIndicator({
  theme = 'dark',
  compact = false,
  showSyncStats = true,
  className,
  position,
}: OfflineIndicatorProps) {
  const { isOnline, isChecking, offlineDuration, checkConnection } = useOnlineStatus()
  const [syncStats, setSyncStats] = useState<SyncQueueStats | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const isDark = theme === 'dark'

  // Load sync queue stats
  useEffect(() => {
    if (!showSyncStats) return

    const loadStats = async () => {
      try {
        const queue = await getSyncQueue()
        const stats = await queue.getStats()
        setSyncStats(stats)
      } catch {
        // Queue not initialized
      }
    }

    loadStats()

    // Refresh stats periodically
    const interval = setInterval(loadStats, 5000)
    return () => clearInterval(interval)
  }, [showSyncStats])

  // Process pending operations when coming back online
  useEffect(() => {
    if (isOnline && syncStats?.pending && syncStats.pending > 0) {
      processPendingSync()
    }
  }, [isOnline, syncStats?.pending])

  const processPendingSync = async () => {
    if (isSyncing) return

    setIsSyncing(true)
    setSyncError(null)
    setSyncProgress(null)

    try {
      // Process all pending sync operations with progress tracking
      const result = await processSyncQueue((progress) => {
        setSyncProgress(progress)
      })

      // If there were errors, show a summary
      if (result.failed > 0) {
        setSyncError(`${result.failed} operation(s) failed to sync`)
        console.error('[OfflineIndicator] Sync errors:', result.errors)
      }

      // Refresh stats after sync
      const queue = await getSyncQueue()
      const stats = await queue.getStats()
      setSyncStats(stats)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed'
      setSyncError(message)
      console.error('[OfflineIndicator] Sync failed:', error)
    } finally {
      setIsSyncing(false)
      setSyncProgress(null)
    }
  }

  const handleRetryFailed = async () => {
    if (isSyncing) return

    setIsSyncing(true)
    setSyncError(null)

    try {
      const result = await retryFailedOperations((progress) => {
        setSyncProgress(progress)
      })

      if (result.failed > 0) {
        setSyncError(`${result.failed} operation(s) still failing`)
      }

      // Refresh stats
      const queue = await getSyncQueue()
      const stats = await queue.getStats()
      setSyncStats(stats)
    } catch (error) {
      console.error('[OfflineIndicator] Retry failed:', error)
    } finally {
      setIsSyncing(false)
      setSyncProgress(null)
    }
  }

  // Position styles for floating mode
  const positionStyles = position
    ? {
        'top-right': 'fixed top-4 right-4 z-50',
        'top-left': 'fixed top-4 left-4 z-50',
        'bottom-right': 'fixed bottom-4 right-4 z-50',
        'bottom-left': 'fixed bottom-4 left-4 z-50',
      }[position]
    : ''

  // Compact badge mode
  if (compact) {
    if (isOnline && (!syncStats || syncStats.pending === 0)) {
      // Don't show anything when online and synced
      return null
    }

    return (
      <motion.div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          isOnline
            ? isSyncing
              ? isDark
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-blue-50 text-blue-600'
              : isDark
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-amber-50 text-amber-600'
            : isDark
              ? 'bg-red-500/20 text-red-400'
              : 'bg-red-50 text-red-600',
          positionStyles,
          className
        )}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        {isOnline ? (
          isSyncing ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <Cloud className="w-3 h-3" />
              <span>{syncStats?.pending} pending</span>
            </>
          )
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
          </>
        )}
      </motion.div>
    )
  }

  // Full indicator mode
  return (
    <div className={cn(positionStyles, className)}>
      <motion.div
        className={cn(
          'rounded-xl border overflow-hidden',
          isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-zinc-200',
          'backdrop-blur-sm shadow-lg'
        )}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <button
          className={cn(
            'w-full px-4 py-3 flex items-center justify-between',
            'transition-colors',
            isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            {/* Status icon */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                isOnline
                  ? isSyncing
                    ? 'bg-blue-500/20'
                    : 'bg-green-500/20'
                  : 'bg-red-500/20'
              )}
            >
              {isOnline ? (
                isSyncing ? (
                  <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4 text-green-400" />
                )
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
            </div>

            {/* Status text */}
            <div>
              <div
                className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                )}
              >
                {isOnline
                  ? isSyncing
                    ? 'Syncing...'
                    : 'Online'
                  : 'Offline'}
              </div>
              {!isOnline && offlineDuration && (
                <div
                  className={cn(
                    'text-xs',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  {formatOfflineDuration(offlineDuration)} ago
                </div>
              )}
            </div>
          </div>

          {/* Expand/collapse */}
          {showSyncStats && syncStats && (
            <div className="flex items-center gap-2">
              {syncStats.pending > 0 && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs',
                    isDark
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-amber-50 text-amber-600'
                  )}
                >
                  {syncStats.pending} pending
                </span>
              )}
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </div>
          )}
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && showSyncStats && syncStats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className={cn(
                  'px-4 pb-4 space-y-3 border-t',
                  isDark ? 'border-zinc-800' : 'border-zinc-200'
                )}
              >
                {/* Sync progress bar */}
                {isSyncing && syncProgress && (
                  <div className="pt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                        Syncing {syncProgress.completed + syncProgress.failed}/{syncProgress.total}
                      </span>
                      {syncProgress.current && (
                        <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
                          {syncProgress.current.resourceType}
                        </span>
                      )}
                    </div>
                    <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-zinc-800' : 'bg-zinc-200')}>
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{
                          width: `${((syncProgress.completed + syncProgress.failed) / syncProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Sync error message */}
                {syncError && (
                  <div className={cn(
                    'pt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2',
                    isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                  )}>
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{syncError}</span>
                  </div>
                )}

                {/* Sync stats grid */}
                <div className="grid grid-cols-3 gap-3 pt-3">
                  <StatItem
                    icon={<Cloud className="w-3.5 h-3.5 text-blue-400" />}
                    label="Pending"
                    value={syncStats.pending}
                    isDark={isDark}
                  />
                  <StatItem
                    icon={<RefreshCw className="w-3.5 h-3.5 text-yellow-400" />}
                    label="In Progress"
                    value={syncStats.inProgress}
                    isDark={isDark}
                  />
                  <StatItem
                    icon={<AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                    label="Failed"
                    value={syncStats.failed}
                    isDark={isDark}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm',
                      'transition-colors',
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800',
                      isChecking && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => checkConnection()}
                    disabled={isChecking}
                  >
                    <RefreshCw
                      className={cn('w-4 h-4', isChecking && 'animate-spin')}
                    />
                    Check Connection
                  </button>

                  {isOnline && syncStats.pending > 0 && (
                    <button
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm',
                        'transition-colors',
                        isDark
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 text-white',
                        isSyncing && 'opacity-50 cursor-not-allowed'
                      )}
                      onClick={processPendingSync}
                      disabled={isSyncing}
                    >
                      <Cloud className={cn('w-4 h-4', isSyncing && 'animate-pulse')} />
                      Sync Now
                    </button>
                  )}
                </div>

                {/* Retry failed button */}
                {isOnline && syncStats.failed > 0 && (
                  <button
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm',
                      'transition-colors',
                      isDark
                        ? 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-400'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-600',
                      isSyncing && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={handleRetryFailed}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
                    Retry {syncStats.failed} Failed
                  </button>
                )}

                {/* Last sync info */}
                {syncStats.oldestPending && (
                  <div
                    className={cn(
                      'text-xs text-center',
                      isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )}
                  >
                    Oldest pending:{' '}
                    {new Date(syncStats.oldestPending).toLocaleString()}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function StatItem({
  icon,
  label,
  value,
  isDark,
}: {
  icon: React.ReactNode
  label: string
  value: number
  isDark: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 p-2 rounded-lg',
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
      )}
    >
      {icon}
      <span
        className={cn(
          'text-sm font-semibold',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          'text-[10px]',
          isDark ? 'text-zinc-500' : 'text-zinc-500'
        )}
      >
        {label}
      </span>
    </div>
  )
}

export default OfflineIndicator
