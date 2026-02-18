/**
 * Tree Status Bar Component
 * @module codex/ui/TreeStatusBar
 *
 * Shows status of pending tree changes with save/publish buttons.
 * Displayed above the tree view when there are pending changes.
 */

'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Save,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  Github,
  Folder,
  Database,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SaveStatus, PublishTarget } from '@/lib/planner/hooks/useTreePersistence'

// ============================================================================
// TYPES
// ============================================================================

interface TreeStatusBarProps {
  /** Number of pending changes */
  pendingCount: number
  /** Current save status */
  saveStatus: SaveStatus
  /** Detected publish target */
  publishTarget: PublishTarget
  /** Last error message */
  lastError?: string | null
  /** Handler for save button */
  onSave: () => void
  /** Handler for publish button */
  onPublish: () => void
  /** Optional class name */
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function getPublishTargetIcon(target: PublishTarget) {
  switch (target) {
    case 'github':
      return Github
    case 'vault':
      return Folder
    case 'sqlite':
      return Database
  }
}

function getPublishTargetLabel(target: PublishTarget): string {
  switch (target) {
    case 'github':
      return 'GitHub'
    case 'vault':
      return 'Vault'
    case 'sqlite':
      return 'Local'
  }
}

function getStatusIcon(status: SaveStatus) {
  switch (status) {
    case 'saving':
      return Loader2
    case 'saved':
      return Check
    case 'error':
      return AlertCircle
    default:
      return Save
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Tree Status Bar
 *
 * Displays the current state of pending tree changes and provides
 * save/publish actions.
 *
 * @example
 * ```tsx
 * <TreeStatusBar
 *   pendingCount={3}
 *   saveStatus="idle"
 *   publishTarget="vault"
 *   onSave={handleSave}
 *   onPublish={handlePublish}
 * />
 * ```
 */
export default function TreeStatusBar({
  pendingCount,
  saveStatus,
  publishTarget,
  lastError,
  onSave,
  onPublish,
  className = '',
}: TreeStatusBarProps) {
  const StatusIcon = getStatusIcon(saveStatus)
  const PublishIcon = getPublishTargetIcon(publishTarget)

  const statusLabel = useMemo(() => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...'
      case 'saved':
        return 'Saved'
      case 'error':
        return 'Error'
      default:
        return `Draft (${pendingCount} change${pendingCount !== 1 ? 's' : ''})`
    }
  }, [saveStatus, pendingCount])

  const isWorking = saveStatus === 'saving'
  const hasError = saveStatus === 'error'
  const isSaved = saveStatus === 'saved'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-2 mb-2',
          'rounded-lg border',
          // Background based on status
          hasError
            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
            : isSaved
              ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
          className
        )}
      >
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={isWorking ? { rotate: 360 } : {}}
            transition={isWorking ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
          >
            <StatusIcon
              className={cn(
                'w-4 h-4',
                hasError
                  ? 'text-red-600 dark:text-red-400'
                  : isSaved
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-amber-600 dark:text-amber-400'
              )}
            />
          </motion.div>

          <span
            className={cn(
              'text-sm font-medium',
              hasError
                ? 'text-red-700 dark:text-red-300'
                : isSaved
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-amber-700 dark:text-amber-300'
            )}
          >
            {statusLabel}
          </span>

          {/* Error message */}
          {hasError && lastError && (
            <span className="text-xs text-red-600 dark:text-red-400 ml-1 truncate max-w-[200px]">
              {lastError}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {/* Retry button (shown on error) */}
          {hasError && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onSave}
              disabled={isWorking}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
                'hover:bg-red-200 dark:hover:bg-red-900/70',
                'focus:outline-none focus:ring-2 focus:ring-red-500/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors duration-150'
              )}
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </motion.button>
          )}

          {/* Save button */}
          {!hasError && !isSaved && (
            <button
              onClick={onSave}
              disabled={isWorking || pendingCount === 0}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
                'hover:bg-amber-200 dark:hover:bg-amber-900/70',
                'focus:outline-none focus:ring-2 focus:ring-amber-500/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors duration-150'
              )}
            >
              <Save className="w-3 h-3" />
              Save
            </button>
          )}

          {/* Publish button */}
          <button
            onClick={onPublish}
            disabled={isWorking || pendingCount === 0}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
              'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
              'hover:bg-blue-200 dark:hover:bg-blue-900/70',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-150'
            )}
            title={`Publish to ${getPublishTargetLabel(publishTarget)}`}
          >
            <PublishIcon className="w-3 h-3" />
            Publish
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

interface TreeStatusBadgeProps {
  /** Number of pending changes */
  pendingCount: number
  /** Current save status */
  saveStatus: SaveStatus
  /** Click handler */
  onClick?: () => void
  /** Optional class name */
  className?: string
}

/**
 * Compact badge variant for sidebar collapsed state
 */
export function TreeStatusBadge({
  pendingCount,
  saveStatus,
  onClick,
  className = '',
}: TreeStatusBadgeProps) {
  if (pendingCount === 0 && saveStatus === 'idle') {
    return null
  }

  const isWorking = saveStatus === 'saving'
  const hasError = saveStatus === 'error'
  const isSaved = saveStatus === 'saved'

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold',
        hasError
          ? 'bg-red-500 text-white'
          : isSaved
            ? 'bg-green-500 text-white'
            : 'bg-amber-500 text-white',
        'hover:opacity-80 transition-opacity',
        className
      )}
      title={
        hasError
          ? 'Error saving changes'
          : isSaved
            ? 'Changes saved'
            : `${pendingCount} pending change${pendingCount !== 1 ? 's' : ''}`
      }
    >
      {isWorking ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : hasError ? (
        '!'
      ) : isSaved ? (
        <Check className="w-3 h-3" />
      ) : (
        pendingCount
      )}
    </motion.button>
  )
}
