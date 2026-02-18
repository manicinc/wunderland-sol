/**
 * Cache Management Settings Panel
 * @module quarry/ui/settings/CacheManagement
 *
 * @description
 * UI component for managing and clearing all Quarry caches.
 * Provides detailed cache statistics and a "nuclear reset" option.
 *
 * Features:
 * - View cache sizes per type (IndexedDB, localStorage, etc.)
 * - Clear individual cache types
 * - "Nuclear Reset" - clear all caches at once
 * - Option to preserve user data (ratings, bookmarks)
 * - Progress indicator during clearing
 * - Auto-trigger reindex after clear
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database,
  HardDrive,
  Trash2,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Shield,
  Loader2,
  ServerCrash,
  Zap,
} from 'lucide-react'
import {
  fullCacheReset,
  getFullCacheStats,
  resetAllCachesAndReindex,
  type CacheResetResult,
  type FullCacheResetOptions,
} from '@/lib/utils/cacheReset'

interface CacheManagementProps {
  /** Compact mode for dropdown/popover */
  compact?: boolean
  /** Called after cache is cleared */
  onCacheCleared?: (result: CacheResetResult) => void
}

interface CacheStats {
  indexedDB: Array<{ name: string; exists: boolean }>
  localStorage: { count: number; quarryPrefixed: number }
  sessionStorage: { count: number; quarryPrefixed: number }
  serviceWorker: { cacheCount: number; cacheNames: string[] }
}

type ClearingState = 'idle' | 'confirming' | 'clearing' | 'complete' | 'error'

export default function CacheManagement({
  compact = false,
  onCacheCleared,
}: CacheManagementProps) {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [clearingState, setClearingState] = useState<ClearingState>('idle')
  const [preserveUserData, setPreserveUserData] = useState(true)
  const [lastResult, setLastResult] = useState<CacheResetResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load cache statistics
  const loadStats = useCallback(async () => {
    setIsLoading(true)
    try {
      const cacheStats = await getFullCacheStats()
      setStats(cacheStats)
    } catch (err) {
      console.error('Failed to load cache stats:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Handle nuclear reset
  const handleNuclearReset = async () => {
    if (clearingState !== 'confirming') {
      setClearingState('confirming')
      return
    }

    setClearingState('clearing')
    setError(null)

    try {
      const options: FullCacheResetOptions = {
        preserveUserData,
        triggerReindex: true,
      }

      const result = await fullCacheReset(options)
      setLastResult(result)

      if (result.failed.length > 0) {
        setClearingState('error')
        setError(`${result.failed.length} cache(s) failed to clear`)
      } else {
        setClearingState('complete')
        onCacheCleared?.(result)
      }

      // Reload stats after clearing
      await loadStats()
    } catch (err) {
      setClearingState('error')
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Handle quick reset (existing simpler reset)
  const handleQuickReset = async () => {
    setClearingState('clearing')
    setError(null)

    try {
      await resetAllCachesAndReindex(false) // Don't auto-reload
      setClearingState('complete')
      await loadStats()
    } catch (err) {
      setClearingState('error')
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const cancelConfirmation = () => {
    setClearingState('idle')
    setError(null)
  }

  // Calculate totals
  const totalIndexedDBCaches = stats?.indexedDB.filter(db => db.exists).length ?? 0
  const totalLocalStorageItems = stats?.localStorage.quarryPrefixed ?? 0
  const totalSessionStorageItems = stats?.sessionStorage.quarryPrefixed ?? 0
  const totalServiceWorkerCaches = stats?.serviceWorker.cacheCount ?? 0
  const totalCaches = totalIndexedDBCaches + totalLocalStorageItems + totalSessionStorageItems + totalServiceWorkerCaches

  // Compact mode - just a button with count
  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 dark:hover:bg-ink-700 transition-colors text-sm"
        >
          <Database className="w-4 h-4 text-ink-400" />
          <span className="text-ink-700 dark:text-ink-300">
            {totalCaches} cached items
          </span>
          <ChevronDown className={`w-4 h-4 text-ink-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-72 p-3 rounded-xl bg-paper-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-700 shadow-xl z-50"
            >
              <div className="space-y-3">
                <div className="text-xs text-ink-500 dark:text-ink-400 mb-2">
                  Cache Statistics
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <StatItem label="IndexedDB" value={totalIndexedDBCaches} />
                  <StatItem label="localStorage" value={totalLocalStorageItems} />
                  <StatItem label="sessionStorage" value={totalSessionStorageItems} />
                  <StatItem label="Service Worker" value={totalServiceWorkerCaches} />
                </div>

                <hr className="border-ink-200 dark:border-ink-700" />

                {/* Quick actions */}
                <button
                  onClick={handleQuickReset}
                  disabled={clearingState === 'clearing'}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                >
                  {clearingState === 'clearing' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>Quick Reset</span>
                </button>

                <button
                  onClick={() => handleNuclearReset()}
                  disabled={clearingState === 'clearing'}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Nuclear Reset</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Full panel mode
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
            <Database className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink-900 dark:text-paper-50">
              Cache Management
            </h3>
            <p className="text-sm text-ink-500 dark:text-ink-400">
              Manage and clear cached data
            </p>
          </div>
        </div>
        <button
          onClick={loadStats}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
          title="Refresh stats"
        >
          <RefreshCw className={`w-4 h-4 text-ink-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Cache Overview */}
      <div className="p-4 rounded-xl bg-ink-100/50 dark:bg-ink-800/50 border border-ink-200 dark:border-ink-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-ink-500 dark:text-ink-400">
            Total Cached Items
          </span>
          <span className="text-lg font-bold text-ink-900 dark:text-paper-50">
            {isLoading ? '...' : totalCaches}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CacheTypeCard
            icon={<HardDrive className="w-4 h-4" />}
            label="IndexedDB"
            count={totalIndexedDBCaches}
            isLoading={isLoading}
            color="text-blue-500"
          />
          <CacheTypeCard
            icon={<Database className="w-4 h-4" />}
            label="localStorage"
            count={totalLocalStorageItems}
            isLoading={isLoading}
            color="text-emerald-500"
          />
          <CacheTypeCard
            icon={<ServerCrash className="w-4 h-4" />}
            label="sessionStorage"
            count={totalSessionStorageItems}
            isLoading={isLoading}
            color="text-amber-500"
          />
          <CacheTypeCard
            icon={<Zap className="w-4 h-4" />}
            label="Service Worker"
            count={totalServiceWorkerCaches}
            isLoading={isLoading}
            color="text-purple-500"
          />
        </div>
      </div>

      {/* Detailed Cache List */}
      <div className="space-y-3">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm font-medium text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
        >
          {showDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Cache Details
        </button>

        <AnimatePresence>
          {showDetails && stats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-2">
                {/* IndexedDB Databases */}
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wide">
                    IndexedDB Databases
                  </h5>
                  <div className="space-y-1">
                    {stats.indexedDB.map(({ name, exists }) => (
                      <div
                        key={name}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-ink-100/50 dark:bg-ink-800/50"
                      >
                        <span className="text-sm text-ink-700 dark:text-ink-300 font-mono">
                          {name}
                        </span>
                        {exists ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-ink-200 dark:bg-ink-700 text-ink-500 dark:text-ink-400">
                            Empty
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service Worker Caches */}
                {stats.serviceWorker.cacheNames.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wide">
                      Service Worker Caches
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {stats.serviceWorker.cacheNames.map(name => (
                        <span
                          key={name}
                          className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-mono"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-ink-700 dark:text-ink-300">
          Cache Actions
        </h4>

        {/* Preserve User Data Toggle */}
        <label className="flex items-center gap-3 p-3 rounded-xl bg-ink-100/50 dark:bg-ink-800/50 cursor-pointer hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-frame-500" />
              <span className="text-sm font-medium text-ink-900 dark:text-paper-50">
                Preserve User Data
              </span>
            </div>
            <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
              Keep bookmarks, ratings, and preferences when clearing
            </p>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={preserveUserData}
              onChange={(e) => setPreserveUserData(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-ink-300 dark:bg-ink-600 rounded-full peer peer-checked:bg-frame-500 transition-colors" />
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
          </div>
        </label>

        {/* Quick Reset Button */}
        <button
          onClick={handleQuickReset}
          disabled={clearingState === 'clearing'}
          className="w-full p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all flex items-center justify-center gap-3"
        >
          {clearingState === 'clearing' ? (
            <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin" />
          ) : (
            <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          )}
          <div className="text-left">
            <div className="font-medium text-amber-700 dark:text-amber-300">
              Quick Reset
            </div>
            <div className="text-xs text-amber-600/70 dark:text-amber-400/70">
              Clear main caches (Codex, Summarization, IndexedDB)
            </div>
          </div>
        </button>

        {/* Nuclear Reset Button */}
        <AnimatePresence mode="wait">
          {clearingState === 'confirming' ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-900/20"
            >
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-red-700 dark:text-red-300">
                    Confirm Nuclear Reset
                  </div>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                    This will delete ALL cached data across {totalCaches} items.
                    {preserveUserData
                      ? ' Your bookmarks and ratings will be preserved.'
                      : ' All data including bookmarks will be lost.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={cancelConfirmation}
                  className="flex-1 px-4 py-2 rounded-lg bg-ink-200 dark:bg-ink-700 text-ink-700 dark:text-ink-200 hover:bg-ink-300 dark:hover:bg-ink-600 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleNuclearReset}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Yes, Clear All
                </button>
              </div>
            </motion.div>
          ) : clearingState === 'clearing' ? (
            <motion.div
              key="clearing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 rounded-xl border border-ink-200 dark:border-ink-700 bg-ink-100/50 dark:bg-ink-800/50"
            >
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 text-ink-500 animate-spin" />
                <span className="text-ink-700 dark:text-ink-300">
                  Clearing all caches...
                </span>
              </div>
            </motion.div>
          ) : clearingState === 'complete' ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
            >
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-500" />
                <div className="flex-1">
                  <div className="font-medium text-emerald-700 dark:text-emerald-300">
                    Cache Cleared Successfully
                  </div>
                  {lastResult && (
                    <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                      Cleared {lastResult.cleared.length} items
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setClearingState('idle')}
                  className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded"
                >
                  <X className="w-4 h-4 text-emerald-500" />
                </button>
              </div>
            </motion.div>
          ) : clearingState === 'error' ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div className="flex-1">
                  <div className="font-medium text-red-700 dark:text-red-300">
                    Error Clearing Cache
                  </div>
                  {error && (
                    <div className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                      {error}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setClearingState('idle')}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="nuclear"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={handleNuclearReset}
              className="w-full p-4 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center gap-3"
            >
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div className="text-left">
                <div className="font-medium text-red-700 dark:text-red-300">
                  Nuclear Reset
                </div>
                <div className="text-xs text-red-600/70 dark:text-red-400/70">
                  Clear ALL caches completely and rebuild index
                </div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
          When to Reset Caches
        </h4>
        <ul className="text-xs text-blue-600/80 dark:text-blue-400/80 space-y-1.5">
          <li>• <strong>After app updates</strong> — New versions may change weave/loom structure</li>
          <li>• <strong>Seeing old weaves</strong> — If weaves/looms don't match expected structure</li>
          <li>• <strong>Stale search results</strong> — When search returns outdated content</li>
          <li>• <strong>Performance issues</strong> — Corrupted cache can slow things down</li>
          <li>• <strong>Storage cleanup</strong> — Free up browser storage space</li>
        </ul>
        <p className="text-xs text-blue-500/70 dark:text-blue-400/60 mt-3 italic">
          Tip: Quick Reset clears content caches. Nuclear Reset rebuilds everything from scratch.
        </p>
      </div>
    </div>
  )
}

function CacheTypeCard({
  icon,
  label,
  count,
  isLoading,
  color,
}: {
  icon: React.ReactNode
  label: string
  count: number
  isLoading: boolean
  color: string
}) {
  return (
    <div className="p-3 rounded-lg bg-paper-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-700">
      <div className="flex items-center gap-2 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-xs text-ink-500 dark:text-ink-400">{label}</span>
      </div>
      <div className="text-lg font-semibold text-ink-900 dark:text-paper-50">
        {isLoading ? '...' : count}
      </div>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2 py-1 rounded bg-ink-100/50 dark:bg-ink-800/50">
      <div className="text-ink-400 text-xs">{label}</div>
      <div className="text-ink-700 dark:text-ink-200 font-medium">{value}</div>
    </div>
  )
}
