/**
 * Source Mode Badge
 *
 * Displays the current content source mode (GitHub, Local, Filesystem, Bundled)
 * with a path tooltip and optional quick-switch functionality.
 *
 * @module codex/ui/SourceModeBadge
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cloud,
  HardDrive,
  FolderOpen,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'
import type { ContentSource } from '@/lib/content/types'

// ============================================================================
// TYPES
// ============================================================================

interface SourceModeBadgeProps {
  /** Current content source info */
  source: ContentSource | null
  /** Display path for filesystem/bundled modes */
  displayPath?: string
  /** Callback when user wants to switch modes */
  onSwitchMode?: () => void
  /** Whether compact mode is enabled */
  compact?: boolean
  /** Theme */
  theme?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SOURCE_CONFIG = {
  github: {
    icon: Cloud,
    label: 'GitHub',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    description: 'Content from GitHub repository',
  },
  hybrid: {
    icon: RefreshCw,
    label: 'Hybrid',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    description: 'GitHub with local cache',
  },
  sqlite: {
    icon: HardDrive,
    label: 'Local',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    description: 'Local SQLite database',
  },
  filesystem: {
    icon: FolderOpen,
    label: 'Local Folder',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    description: 'Reading from local filesystem',
  },
  bundled: {
    icon: Sparkles,
    label: 'Examples',
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    borderColor: 'border-pink-200 dark:border-pink-800',
    description: 'Bundled example content',
  },
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SourceModeBadge({
  source,
  displayPath,
  onSwitchMode,
  compact = false,
  theme,
}: SourceModeBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [pathCopied, setPathCopied] = useState(false)

  // Get source type or default to github
  const sourceType = source?.type || 'github'
  const config = SOURCE_CONFIG[sourceType] || SOURCE_CONFIG.github
  const Icon = config.icon

  const handleCopyPath = async () => {
    if (!displayPath) return
    try {
      await navigator.clipboard.writeText(displayPath)
      setPathCopied(true)
      setTimeout(() => setPathCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy path:', err)
    }
  }

  return (
    <div className="relative">
      {/* Badge Button */}
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          inline-flex items-center gap-1.5 rounded-lg border transition-all
          ${config.bgColor} ${config.borderColor}
          ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'}
          hover:shadow-sm
        `}
        title={config.description}
      >
        <Icon className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${config.color}`} />
        <span className={`font-semibold ${config.color}`}>
          {config.label}
        </span>
        {source?.strandCount !== undefined && source.strandCount > 0 && (
          <span className={`${compact ? 'text-[8px]' : 'text-[9px]'} font-mono opacity-70`}>
            ({source.strandCount})
          </span>
        )}
        {onSwitchMode && (
          <ChevronDown className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} opacity-50`} />
        )}
      </button>

      {/* Tooltip/Dropdown */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 w-64 p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 z-50"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            {/* Source Info */}
            <div className="flex items-start gap-2 mb-3">
              <div className={`p-2 rounded-lg ${config.bgColor}`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                  {config.label} Mode
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {config.description}
                </p>
              </div>
            </div>

            {/* Path Display (for filesystem/bundled) */}
            {displayPath && (sourceType === 'filesystem' || sourceType === 'bundled') && (
              <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">
                      Content Path
                    </p>
                    <p className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300 truncate" title={displayPath}>
                      {displayPath}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyPath}
                    className={`
                      p-1.5 rounded transition-colors flex-shrink-0
                      ${pathCopied
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                      }
                    `}
                    title={pathCopied ? 'Copied!' : 'Copy path'}
                  >
                    {pathCopied ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}


            {/* Stats */}
            {source && (
              <div className="flex items-center gap-4 text-[9px] text-zinc-500 dark:text-zinc-400">
                {source.strandCount !== undefined && (
                  <span>{source.strandCount} strands</span>
                )}
                {source.lastSync && (
                  <span>Synced: {new Date(source.lastSync).toLocaleDateString()}</span>
                )}
              </div>
            )}

            {/* Switch Mode Button */}
            {onSwitchMode && (
              <button
                onClick={() => {
                  onSwitchMode()
                  setShowTooltip(false)
                }}
                className="w-full mt-3 px-3 py-2 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-3 h-3" />
                Change Content Source
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

