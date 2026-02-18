/**
 * Strand Lifecycle List
 * 
 * Displays strands grouped by lifecycle stage with collapsible sections
 * and quick actions (mark reviewed, resurface).
 * 
 * @module components/quarry/ui/evolution/StrandLifecycleList
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Activity,
  Clock,
  Eye,
  Edit3,
  Link2,
  RotateCcw,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StrandLifecycleWithMeta, LifecycleStage } from '@/lib/analytics/lifecycleTypes'
import { LIFECYCLE_STAGE_META } from '@/lib/analytics/lifecycleTypes'

// ============================================================================
// TYPES
// ============================================================================

interface StrandLifecycleListProps {
  freshStrands: StrandLifecycleWithMeta[]
  activeStrands: StrandLifecycleWithMeta[]
  fadedStrands: StrandLifecycleWithMeta[]
  atRiskStrands: StrandLifecycleWithMeta[]
  isDark: boolean
  onResurface?: (strandPath: string) => void
  compact?: boolean
}

interface StageGroupProps {
  stage: LifecycleStage
  strands: StrandLifecycleWithMeta[]
  isDark: boolean
  onResurface?: (strandPath: string) => void
  defaultOpen?: boolean
  showAtRisk?: boolean
}

// ============================================================================
// STRAND ITEM
// ============================================================================

function StrandItem({
  strand,
  isDark,
  onResurface,
  showAtRisk,
}: {
  strand: StrandLifecycleWithMeta
  isDark: boolean
  onResurface?: (strandPath: string) => void
  showAtRisk?: boolean
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 p-3 rounded-lg transition-colors',
        isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-50'
      )}
    >
      {/* Decay indicator */}
      <div className="flex-shrink-0">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: strand.decayScore >= 70
              ? 'rgb(16, 185, 129)'  // emerald
              : strand.decayScore >= 40
                ? 'rgb(245, 158, 11)' // amber
                : 'rgb(113, 113, 122)', // zinc
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/quarry/app?path=${encodeURIComponent(strand.strandPath)}`}
            className={cn(
              'text-sm font-medium truncate hover:underline',
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            )}
          >
            {strand.title}
          </Link>
          {strand.atRisk && showAtRisk && (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          )}
        </div>
        <div className={cn(
          'flex items-center gap-3 text-xs mt-0.5',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {strand.viewCount}
          </span>
          <span className="flex items-center gap-1">
            <Edit3 className="w-3 h-3" />
            {strand.editCount}
          </span>
          <span className="flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            {strand.connectionCount}
          </span>
          <span>
            {strand.daysSinceAccess === 0
              ? 'Today'
              : strand.daysSinceAccess === 1
                ? 'Yesterday'
                : `${strand.daysSinceAccess}d ago`}
          </span>
        </div>
      </div>

      {/* Decay score */}
      <div className={cn(
        'text-xs font-medium px-2 py-1 rounded',
        strand.decayScore >= 70
          ? 'bg-emerald-500/10 text-emerald-500'
          : strand.decayScore >= 40
            ? 'bg-amber-500/10 text-amber-500'
            : 'bg-zinc-500/10 text-zinc-500'
      )}>
        {Math.round(strand.decayScore)}%
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {strand.stage === 'faded' && onResurface && (
          <button
            onClick={() => onResurface(strand.strandPath)}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              isDark ? 'hover:bg-zinc-600 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
            )}
            title="Resurface"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
        <Link
          href={`/quarry/app?path=${encodeURIComponent(strand.strandPath)}`}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            isDark ? 'hover:bg-zinc-600 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
          )}
          title="Open"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// STAGE GROUP
// ============================================================================

function StageGroup({
  stage,
  strands,
  isDark,
  onResurface,
  defaultOpen = false,
  showAtRisk = false,
}: StageGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const meta = LIFECYCLE_STAGE_META[stage]
  
  const IconComponent = stage === 'fresh' ? Sparkles : stage === 'active' ? Activity : Clock

  if (strands.length === 0) return null

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden',
      isDark ? 'border-zinc-700' : 'border-zinc-200'
    )}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-3 p-4 transition-colors text-left',
          isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
        )}
      >
        <div className={cn('p-2 rounded-lg', meta.bgColor)}>
          <IconComponent className={cn('w-4 h-4', meta.color)} />
        </div>
        <div className="flex-1">
          <div className={cn('font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
            {meta.label}
          </div>
          <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            {strands.length} strand{strands.length !== 1 ? 's' : ''} • {meta.description}
          </div>
        </div>
        {isOpen ? (
          <ChevronDown className={cn('w-5 h-5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
        ) : (
          <ChevronRight className={cn('w-5 h-5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={cn(
              'px-2 pb-2 divide-y',
              isDark ? 'divide-zinc-700/50' : 'divide-zinc-100'
            )}>
              {strands.slice(0, 20).map((strand) => (
                <StrandItem
                  key={strand.strandPath}
                  strand={strand}
                  isDark={isDark}
                  onResurface={onResurface}
                  showAtRisk={showAtRisk}
                />
              ))}
              {strands.length > 20 && (
                <div className={cn(
                  'py-3 text-center text-sm',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  + {strands.length - 20} more
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StrandLifecycleList({
  freshStrands,
  activeStrands,
  fadedStrands,
  atRiskStrands,
  isDark,
  onResurface,
  compact = false,
}: StrandLifecycleListProps) {
  return (
    <div className="space-y-4">
      {/* At Risk Alert */}
      {atRiskStrands.length > 0 && (
        <div className={cn(
          'p-4 rounded-lg border flex items-start gap-3',
          isDark
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-amber-50 border-amber-200'
        )}>
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className={cn('font-medium', isDark ? 'text-amber-400' : 'text-amber-700')}>
              {atRiskStrands.length} strand{atRiskStrands.length !== 1 ? 's' : ''} at risk
            </div>
            <p className={cn('text-sm mt-1', isDark ? 'text-amber-400/70' : 'text-amber-600')}>
              These strands are about to fade. Consider reviewing them to keep them active.
            </p>
          </div>
        </div>
      )}

      {/* Stage Groups */}
      <StageGroup
        stage="fresh"
        strands={freshStrands}
        isDark={isDark}
        onResurface={onResurface}
        defaultOpen={!compact}
      />
      <StageGroup
        stage="active"
        strands={activeStrands}
        isDark={isDark}
        onResurface={onResurface}
        defaultOpen={!compact}
        showAtRisk
      />
      <StageGroup
        stage="faded"
        strands={fadedStrands}
        isDark={isDark}
        onResurface={onResurface}
        defaultOpen={false}
      />

      {/* Empty state */}
      {freshStrands.length === 0 && activeStrands.length === 0 && fadedStrands.length === 0 && (
        <div className={cn(
          'py-12 text-center rounded-lg border',
          isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
        )}>
          <Clock className={cn('w-12 h-12 mx-auto mb-3', isDark ? 'text-zinc-600' : 'text-zinc-300')} />
          <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            No lifecycle data yet. Start viewing and editing strands to build history.
          </p>
        </div>
      )}
    </div>
  )
}

export default StrandLifecycleList

