'use client'

/**
 * Selection Stats Bar - Shows selected strand count and quick actions
 * @module codex/ui/SelectionStatsBar
 *
 * Displays aggregated selection count from sidebar tree + applied filters.
 * Shows in LearningStudio header when selection/filters are active.
 */

import React from 'react'
import { motion } from 'framer-motion'
import {
  Layers,
  Filter,
  X,
  Eye,
  FileText,
  Sparkles,
} from 'lucide-react'

interface SelectionStatsBarProps {
  /** Selection statistics */
  stats: {
    strands: number
    looms: number
    weaves: number
    total: number
  }
  /** Number of active filters */
  filterCount: number
  /** Total words in selection */
  totalWords?: number
  /** Callback to clear selection */
  onClear: () => void
  /** Callback to view selection details */
  onViewDetails?: () => void
  /** Theme */
  theme?: string
  /** Compact mode */
  compact?: boolean
}

export default function SelectionStatsBar({
  stats,
  filterCount,
  totalWords = 0,
  onClear,
  onViewDetails,
  theme = 'light',
  compact = false,
}: SelectionStatsBarProps) {
  const isDark = theme?.includes('dark')
  const hasSelection = stats.strands > 0 || filterCount > 0

  if (!hasSelection) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        flex items-center gap-3 rounded-xl overflow-hidden
        ${compact ? 'px-3 py-2' : 'px-4 py-3'}
        ${isDark
          ? 'bg-gradient-to-r from-emerald-900/30 to-cyan-900/20 border border-emerald-700/30'
          : 'bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-200/50'
        }
      `}
    >
      {/* Icon */}
      <div className={`
        p-1.5 rounded-lg
        ${isDark ? 'bg-emerald-800/50' : 'bg-emerald-100'}
      `}>
        <Sparkles className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
      </div>

      {/* Stats */}
      <div className="flex-1 flex items-center gap-3 min-w-0">
        {/* Strand count */}
        {stats.strands > 0 && (
          <div className="flex items-center gap-1.5">
            <FileText className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <span className={`text-sm font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
              {stats.strands} strand{stats.strands !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Filter count */}
        {filterCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Filter className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <span className={`text-sm font-medium ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
              {filterCount} filter{filterCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Word count */}
        {totalWords > 0 && !compact && (
          <div className={`
            hidden sm:flex items-center gap-1
            text-xs
            ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
          `}>
            <span>~{Math.round(totalWords / 1000)}k words</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className={`
              p-1.5 rounded-lg transition-colors
              ${isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
              }
            `}
            title="View selection details"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onClear}
          className={`
            p-1.5 rounded-lg transition-colors
            ${isDark
              ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-900/20'
              : 'text-zinc-500 hover:text-rose-600 hover:bg-rose-50'
            }
          `}
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}
