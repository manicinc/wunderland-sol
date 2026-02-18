/**
 * Resurface Panel
 * 
 * Displays faded strands that are worth revisiting based on their
 * connections and past engagement. Includes suggestions and one-click resurface.
 * 
 * @module components/quarry/ui/evolution/ResurfacePanel
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  RotateCcw,
  Sparkles,
  Link2,
  Clock,
  ExternalLink,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ResurfaceSuggestion } from '@/lib/analytics/lifecycleTypes'

// ============================================================================
// TYPES
// ============================================================================

interface ResurfacePanelProps {
  suggestions: ResurfaceSuggestion[]
  isDark: boolean
  onResurface: (strandPath: string) => void
  loading?: boolean
}

// ============================================================================
// SUGGESTION CARD
// ============================================================================

function SuggestionCard({
  suggestion,
  isDark,
  onResurface,
  index,
}: {
  suggestion: ResurfaceSuggestion
  isDark: boolean
  onResurface: (strandPath: string) => void
  index: number
}) {
  const { strand, reason, relevanceScore } = suggestion

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'group p-4 rounded-xl border transition-all',
        isDark
          ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
          : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-sm'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/quarry/app?path=${encodeURIComponent(strand.strandPath)}`}
            className={cn(
              'font-medium hover:underline line-clamp-1',
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            )}
          >
            {strand.title}
          </Link>
          <div className={cn(
            'text-xs mt-1 flex items-center gap-2',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            <Clock className="w-3 h-3" />
            <span>
              Last accessed {strand.daysSinceAccess} day{strand.daysSinceAccess !== 1 ? 's' : ''} ago
            </span>
          </div>
        </div>

        {/* Relevance indicator */}
        <div className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          relevanceScore >= 70
            ? 'bg-emerald-500/10 text-emerald-500'
            : relevanceScore >= 40
              ? 'bg-amber-500/10 text-amber-500'
              : 'bg-zinc-500/10 text-zinc-500'
        )}>
          {Math.round(relevanceScore)}%
        </div>
      </div>

      {/* Reason */}
      <div className={cn(
        'flex items-start gap-2 p-2 rounded-lg text-xs mb-3',
        isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'
      )}>
        <Lightbulb className={cn(
          'w-3.5 h-3.5 flex-shrink-0 mt-0.5',
          isDark ? 'text-amber-400' : 'text-amber-500'
        )} />
        <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
          {reason}
        </span>
      </div>

      {/* Stats */}
      <div className={cn(
        'flex items-center gap-4 text-xs mb-3',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )}>
        <span className="flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          {strand.connectionCount} connection{strand.connectionCount !== 1 ? 's' : ''}
        </span>
        <span>
          {strand.viewCount} view{strand.viewCount !== 1 ? 's' : ''}
        </span>
        <span>
          {strand.editCount} edit{strand.editCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onResurface(strand.strandPath)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isDark
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          )}
        >
          <RotateCcw className="w-4 h-4" />
          Resurface
        </button>
        <Link
          href={`/quarry/app?path=${encodeURIComponent(strand.strandPath)}`}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isDark
              ? 'hover:bg-zinc-700 text-zinc-400'
              : 'hover:bg-zinc-100 text-zinc-500'
          )}
          title="Open strand"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ResurfacePanel({
  suggestions,
  isDark,
  onResurface,
  loading = false,
}: ResurfacePanelProps) {
  if (loading) {
    return (
      <div className={cn(
        'p-6 rounded-xl border animate-pulse',
        isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
      )}>
        <div className={cn(
          'h-5 w-32 rounded mb-4',
          isDark ? 'bg-zinc-700' : 'bg-zinc-200'
        )} />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn('h-24 rounded-lg', isDark ? 'bg-zinc-700' : 'bg-zinc-100')}
            />
          ))}
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className={cn(
        'p-6 rounded-xl border text-center',
        isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
      )}>
        <Sparkles className={cn(
          'w-10 h-10 mx-auto mb-3',
          isDark ? 'text-zinc-600' : 'text-zinc-300'
        )} />
        <p className={cn(
          'text-sm font-medium mb-1',
          isDark ? 'text-zinc-300' : 'text-zinc-600'
        )}>
          No resurface suggestions
        </p>
        <p className={cn(
          'text-xs',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}>
          All your strands are actively maintained!
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      'p-4 rounded-xl border',
      isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn(
          'text-sm font-semibold flex items-center gap-2',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          <RotateCcw className="w-4 h-4 text-cyan-500" />
          Worth Revisiting
        </h3>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full',
          isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
        )}>
          {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Description */}
      <p className={cn(
        'text-xs mb-4',
        isDark ? 'text-zinc-400' : 'text-zinc-500'
      )}>
        These faded strands have valuable connections. Resurfacing them brings them back to "Fresh" status.
      </p>

      {/* Suggestions */}
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard
            key={suggestion.strand.strandPath}
            suggestion={suggestion}
            isDark={isDark}
            onResurface={onResurface}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}

export default ResurfacePanel

