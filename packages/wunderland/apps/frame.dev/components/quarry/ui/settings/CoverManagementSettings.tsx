/**
 * Cover Management Settings Panel
 * @module quarry/ui/settings/CoverManagementSettings
 *
 * @description
 * UI component for managing weave and loom cover images.
 * Allows users to regenerate covers, reset to defaults, and configure cover preferences.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Image,
  Sparkles,
  RefreshCw,
  Trash2,
  Loader2,
  Check,
  AlertTriangle,
  Settings2,
  Palette,
  Folder,
  FolderTree,
  ChevronDown,
} from 'lucide-react'
import {
  getAllWeaves,
  getAllLooms,
  batchUpdateWeaveCovers,
  batchUpdateLoomCovers,
  type WeaveRecord,
  type LoomRecord,
} from '@/lib/codexDatabase'
import { useCoverMigration } from '@/lib/migration/useCoverMigration'
import { needsCover, resetMigrationState } from '@/lib/migration/coverMigration'
import { COVER_PATTERNS, type CoverPattern } from '@/lib/collections/coverGenerator'

// ============================================================================
// TYPES
// ============================================================================

interface CoverManagementSettingsProps {
  /** Compact mode for dropdown/popover */
  compact?: boolean
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Called after covers are updated */
  onCoversUpdated?: () => void
}

interface CoverStats {
  totalWeaves: number
  weavesWithCovers: number
  totalLooms: number
  loomsWithCovers: number
}

type OperationState = 'idle' | 'loading' | 'confirming' | 'processing' | 'complete' | 'error'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CoverManagementSettings({
  compact = false,
  isDark = false,
  onCoversUpdated,
}: CoverManagementSettingsProps) {
  const { migrateAll, isRunning, progress, error: migrationError, isWorkerReady } = useCoverMigration()
  
  const [stats, setStats] = useState<CoverStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [operationState, setOperationState] = useState<OperationState>('idle')
  const [operationType, setOperationType] = useState<'regenerate' | 'fill' | 'reset' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPatternPrefs, setShowPatternPrefs] = useState(false)
  const [preferredPatterns, setPreferredPatterns] = useState<CoverPattern[]>([])

  // Load stats
  const loadStats = useCallback(async () => {
    setIsLoading(true)
    try {
      const [weaves, looms] = await Promise.all([
        getAllWeaves(),
        getAllLooms(),
      ])

      setStats({
        totalWeaves: weaves.length,
        weavesWithCovers: weaves.filter(w => !needsCover(w)).length,
        totalLooms: looms.length,
        loomsWithCovers: looms.filter(l => !needsCover(l)).length,
      })
    } catch (err) {
      console.error('Failed to load cover stats:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Fill missing covers
  const handleFillMissing = useCallback(async () => {
    if (operationState === 'idle') {
      setOperationType('fill')
      setOperationState('confirming')
      return
    }

    if (operationType !== 'fill') return

    setOperationState('processing')
    setError(null)

    try {
      const [weaves, looms] = await Promise.all([
        getAllWeaves(),
        getAllLooms(),
      ])

      const weavesNeedingCovers = weaves.filter(w => needsCover(w))
      const loomsNeedingCovers = looms.filter(l => needsCover(l))

      if (weavesNeedingCovers.length === 0 && loomsNeedingCovers.length === 0) {
        setOperationState('complete')
        setTimeout(() => setOperationState('idle'), 2000)
        return
      }

      const results = await migrateAll(weavesNeedingCovers, loomsNeedingCovers)

      // Save to database
      const weaveUpdates = results
        .filter(r => r.success && r.type === 'weave')
        .map(r => ({
          id: r.id,
          coverImage: r.coverImage,
          coverPattern: r.coverPattern,
          coverColor: r.coverColor,
        }))

      const loomUpdates = results
        .filter(r => r.success && r.type === 'loom')
        .map(r => ({
          id: r.id,
          coverImage: r.coverImage,
          coverPattern: r.coverPattern,
          coverColor: r.coverColor,
        }))

      if (weaveUpdates.length > 0) {
        await batchUpdateWeaveCovers(weaveUpdates)
      }
      if (loomUpdates.length > 0) {
        await batchUpdateLoomCovers(loomUpdates)
      }

      await loadStats()
      onCoversUpdated?.()
      setOperationState('complete')
      setTimeout(() => setOperationState('idle'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fill missing covers')
      setOperationState('error')
    }
  }, [operationState, operationType, migrateAll, loadStats, onCoversUpdated])

  // Regenerate all covers
  const handleRegenerateAll = useCallback(async () => {
    if (operationState === 'idle') {
      setOperationType('regenerate')
      setOperationState('confirming')
      return
    }

    if (operationType !== 'regenerate') return

    setOperationState('processing')
    setError(null)

    try {
      const [weaves, looms] = await Promise.all([
        getAllWeaves(),
        getAllLooms(),
      ])

      const results = await migrateAll(weaves, looms, { forceRegenerate: true })

      // Save to database
      const weaveUpdates = results
        .filter(r => r.success && r.type === 'weave')
        .map(r => ({
          id: r.id,
          coverImage: r.coverImage,
          coverPattern: r.coverPattern,
          coverColor: r.coverColor,
        }))

      const loomUpdates = results
        .filter(r => r.success && r.type === 'loom')
        .map(r => ({
          id: r.id,
          coverImage: r.coverImage,
          coverPattern: r.coverPattern,
          coverColor: r.coverColor,
        }))

      if (weaveUpdates.length > 0) {
        await batchUpdateWeaveCovers(weaveUpdates)
      }
      if (loomUpdates.length > 0) {
        await batchUpdateLoomCovers(loomUpdates)
      }

      await loadStats()
      onCoversUpdated?.()
      setOperationState('complete')
      setTimeout(() => setOperationState('idle'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate covers')
      setOperationState('error')
    }
  }, [operationState, operationType, migrateAll, loadStats, onCoversUpdated])

  // Reset all covers
  const handleResetAll = useCallback(async () => {
    if (operationState === 'idle') {
      setOperationType('reset')
      setOperationState('confirming')
      return
    }

    if (operationType !== 'reset') return

    setOperationState('processing')
    setError(null)

    try {
      const [weaves, looms] = await Promise.all([
        getAllWeaves(),
        getAllLooms(),
      ])

      // Clear all covers
      const weaveUpdates = weaves.map(w => ({
        id: w.id,
        coverImage: undefined,
        coverPattern: undefined,
        coverColor: undefined,
      }))

      const loomUpdates = looms.map(l => ({
        id: l.id,
        coverImage: undefined,
        coverPattern: undefined,
        coverColor: undefined,
      }))

      if (weaveUpdates.length > 0) {
        await batchUpdateWeaveCovers(weaveUpdates as Array<{ id: string; coverImage?: string; coverPattern?: string; coverColor?: string }>)
      }
      if (loomUpdates.length > 0) {
        await batchUpdateLoomCovers(loomUpdates as Array<{ id: string; coverImage?: string; coverPattern?: string; coverColor?: string }>)
      }

      // Reset migration state so auto-migration can run again
      resetMigrationState()

      await loadStats()
      onCoversUpdated?.()
      setOperationState('complete')
      setTimeout(() => setOperationState('idle'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset covers')
      setOperationState('error')
    }
  }, [operationState, operationType, loadStats, onCoversUpdated])

  // Cancel confirmation
  const handleCancel = useCallback(() => {
    setOperationState('idle')
    setOperationType(null)
    setError(null)
  }, [])

  // Get confirmation message
  const getConfirmationMessage = () => {
    switch (operationType) {
      case 'fill':
        return `Generate covers for ${(stats?.totalWeaves || 0) - (stats?.weavesWithCovers || 0)} weaves and ${(stats?.totalLooms || 0) - (stats?.loomsWithCovers || 0)} looms without covers?`
      case 'regenerate':
        return `Regenerate all ${stats?.totalWeaves || 0} weave and ${stats?.totalLooms || 0} loom covers? This will replace existing covers.`
      case 'reset':
        return `Remove all covers from ${stats?.totalWeaves || 0} weaves and ${stats?.totalLooms || 0} looms? They will use default styling.`
      default:
        return ''
    }
  }

  return (
    <div className={`space-y-6 ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
          <Image className={`w-6 h-6 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
        </div>
        <div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Cover Management
          </h3>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Manage cover images for your weaves and looms
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className={`
        grid grid-cols-2 gap-4 p-4 rounded-xl
        ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}
      `}>
        <div className="flex items-center gap-3">
          <Folder className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <div>
            <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Weaves
            </div>
            {isLoading ? (
              <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            ) : (
              <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {stats?.weavesWithCovers}/{stats?.totalWeaves} with covers
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FolderTree className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <div>
            <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Looms
            </div>
            {isLoading ? (
              <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            ) : (
              <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {stats?.loomsWithCovers}/{stats?.totalLooms} with covers
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      {(isRunning || operationState === 'processing') && progress && (
        <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {progress.current && `Processing: ${progress.current}`}
            </span>
            <span className={`text-sm font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {progress.processed}/{progress.total}
            </span>
          </div>
          <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${(progress.processed / progress.total) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      <AnimatePresence>
        {operationState === 'confirming' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`
              p-4 rounded-xl border
              ${isDark
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-amber-50 border-amber-200'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <div className="flex-1">
                <p className={`text-sm ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                  {getConfirmationMessage()}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleCancel}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${isDark
                        ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                        : 'bg-white text-zinc-700 hover:bg-zinc-100'
                      }
                    `}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={
                      operationType === 'fill' ? handleFillMissing :
                      operationType === 'regenerate' ? handleRegenerateAll :
                      handleResetAll
                    }
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${operationType === 'reset'
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-cyan-500 text-white hover:bg-cyan-600'
                      }
                    `}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error display */}
      {(error || migrationError) && (
        <div className={`
          p-4 rounded-xl border
          ${isDark
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-red-50 border-red-200'
          }
        `}>
          <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
            {error || migrationError}
          </p>
        </div>
      )}

      {/* Success display */}
      {operationState === 'complete' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`
            p-4 rounded-xl border flex items-center gap-3
            ${isDark
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-emerald-50 border-emerald-200'
            }
          `}
        >
          <Check className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span className={`text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
            Operation completed successfully!
          </span>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        {/* Fill missing covers */}
        <button
          onClick={handleFillMissing}
          disabled={operationState !== 'idle' || isLoading}
          className={`
            w-full flex items-center gap-3 p-4 rounded-xl text-left
            transition-all duration-200 border
            ${isDark
              ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 disabled:bg-zinc-800/50'
              : 'bg-white border-zinc-200 hover:bg-zinc-50 disabled:bg-zinc-50'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <div className={`p-2 rounded-lg ${isDark ? 'bg-cyan-500/20' : 'bg-cyan-100'}`}>
            <Sparkles className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          </div>
          <div className="flex-1">
            <div className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Fill Missing Covers
            </div>
            <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Auto-generate covers for items without one
            </div>
          </div>
        </button>

        {/* Regenerate all */}
        <button
          onClick={handleRegenerateAll}
          disabled={operationState !== 'idle' || isLoading}
          className={`
            w-full flex items-center gap-3 p-4 rounded-xl text-left
            transition-all duration-200 border
            ${isDark
              ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 disabled:bg-zinc-800/50'
              : 'bg-white border-zinc-200 hover:bg-zinc-50 disabled:bg-zinc-50'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
            <RefreshCw className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          </div>
          <div className="flex-1">
            <div className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Regenerate All Covers
            </div>
            <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Replace all covers with fresh AI-generated ones
            </div>
          </div>
        </button>

        {/* Reset all */}
        <button
          onClick={handleResetAll}
          disabled={operationState !== 'idle' || isLoading}
          className={`
            w-full flex items-center gap-3 p-4 rounded-xl text-left
            transition-all duration-200 border
            ${isDark
              ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 disabled:bg-zinc-800/50'
              : 'bg-white border-zinc-200 hover:bg-zinc-50 disabled:bg-zinc-50'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <div className={`p-2 rounded-lg ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
            <Trash2 className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
          </div>
          <div className="flex-1">
            <div className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Reset All Covers
            </div>
            <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Remove all covers and revert to defaults
            </div>
          </div>
        </button>
      </div>

      {/* Pattern preferences (expandable) */}
      <div className={`
        rounded-xl border overflow-hidden
        ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
      `}>
        <button
          onClick={() => setShowPatternPrefs(!showPatternPrefs)}
          className={`
            w-full flex items-center justify-between p-4
            transition-colors
            ${isDark
              ? 'bg-zinc-800 hover:bg-zinc-700'
              : 'bg-zinc-50 hover:bg-zinc-100'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <Palette className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
            <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Pattern Preferences
            </span>
          </div>
          <ChevronDown
            className={`
              w-5 h-5 transition-transform
              ${showPatternPrefs ? 'rotate-180' : ''}
              ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
            `}
          />
        </button>

        <AnimatePresence>
          {showPatternPrefs && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className={`p-4 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                <p className={`text-sm mb-3 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Select preferred patterns for auto-generation:
                </p>
                <div className="flex flex-wrap gap-2">
                  {COVER_PATTERNS.map((pattern) => {
                    const isSelected = preferredPatterns.includes(pattern.id)
                    return (
                      <button
                        key={pattern.id}
                        onClick={() => {
                          setPreferredPatterns(prev =>
                            isSelected
                              ? prev.filter(p => p !== pattern.id)
                              : [...prev, pattern.id]
                          )
                        }}
                        className={`
                          px-3 py-1.5 rounded-lg text-sm transition-colors
                          ${isSelected
                            ? isDark
                              ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50'
                              : 'bg-cyan-100 text-cyan-700 ring-1 ring-cyan-300'
                            : isDark
                              ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                              : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
                          }
                        `}
                      >
                        {pattern.name}
                      </button>
                    )
                  })}
                </div>
                <p className={`text-xs mt-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Leave empty to use all patterns.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Worker status */}
      <div className={`
        flex items-center gap-2 text-xs
        ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
      `}>
        <div className={`
          w-2 h-2 rounded-full
          ${isWorkerReady ? 'bg-emerald-500' : 'bg-amber-500'}
        `} />
        <span>
          NLP Worker: {isWorkerReady ? 'Ready' : 'Loading...'}
        </span>
      </div>
    </div>
  )
}

export { CoverManagementSettings }

