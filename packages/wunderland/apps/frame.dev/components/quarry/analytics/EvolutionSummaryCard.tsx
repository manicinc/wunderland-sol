/**
 * Evolution Summary Card Component
 * @module components/quarry/analytics/EvolutionSummaryCard
 *
 * @description
 * Summary widget for the Analytics page showing key evolution stats
 * with a link to the full Evolution Timeline view.
 */

'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  History,
  TrendingUp,
  FileText,
  GitCommit,
  Tag,
  ChevronRight,
  Sparkles,
  Calendar,
  Award,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import { useEvolutionData } from '@/components/quarry/hooks/useEvolutionData'

// ============================================================================
// TYPES
// ============================================================================

interface EvolutionSummaryCardProps {
  /** Dark mode */
  isDark?: boolean
  /** Additional className */
  className?: string
  /** Show compact version (fewer stats) */
  compact?: boolean
}

// ============================================================================
// MINI STAT
// ============================================================================

interface MiniStatProps {
  icon: React.ElementType
  value: number | string
  label: string
  color: string
  isDark: boolean
}

function MiniStat({ icon: Icon, value, label, color, isDark }: MiniStatProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'p-1.5 rounded-md',
        isDark ? 'bg-zinc-700/50' : 'bg-zinc-100'
      )}>
        <Icon className={cn('w-3.5 h-3.5', color)} />
      </div>
      <div>
        <p className={cn(
          'text-sm font-semibold leading-tight',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className={cn(
          'text-xs leading-tight',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}>
          {label}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EvolutionSummaryCard({
  isDark = false,
  className,
  compact = false,
}: EvolutionSummaryCardProps) {
  const resolvePath = useQuarryPath()
  const { data, loading, error } = useEvolutionData()

  // Loading state
  if (loading) {
    return (
      <div className={cn(
        'rounded-xl border p-4',
        isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200',
        className
      )}>
        <div className="flex items-center justify-center py-8 gap-2">
          <Loader2 className={cn(
            'w-5 h-5 animate-spin',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )} />
          <span className={cn(
            'text-sm',
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          )}>
            Loading evolution data...
          </span>
        </div>
      </div>
    )
  }

  // Error or no data state
  if (error || !data) {
    return null // Silently hide if no data
  }

  // Calculate milestone count
  const milestoneCount = data.milestones.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-xl border overflow-hidden',
        isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200',
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        'px-4 py-3 border-b flex items-center justify-between',
        isDark ? 'border-zinc-700 bg-zinc-800/30' : 'border-zinc-100 bg-zinc-50/50'
      )}>
        <div className="flex items-center gap-2">
          <History className={cn(
            'w-4 h-4',
            isDark ? 'text-emerald-400' : 'text-emerald-600'
          )} />
          <h3 className={cn(
            'text-sm font-semibold',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}>
            Knowledge Evolution
          </h3>
        </div>
        <Link
          href={resolvePath('/quarry/evolution')}
          className={cn(
            'flex items-center gap-1 text-xs font-medium transition-colors',
            isDark
              ? 'text-emerald-400 hover:text-emerald-300'
              : 'text-emerald-600 hover:text-emerald-700'
          )}
        >
          View full timeline
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Timeline Preview */}
        {data.firstContentDate && (
          <div className={cn(
            'flex items-center gap-2 mb-4 pb-3 border-b',
            isDark ? 'border-zinc-700/50' : 'border-zinc-100'
          )}>
            <Calendar className={cn(
              'w-4 h-4',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )} />
            <span className={cn(
              'text-xs',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}>
              Growing since {new Date(data.firstContentDate).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
            {data.growthRate > 0 && (
              <span className={cn(
                'ml-auto text-xs font-medium flex items-center gap-1',
                isDark ? 'text-emerald-400' : 'text-emerald-600'
              )}>
                <TrendingUp className="w-3 h-3" />
                +{data.growthRate.toFixed(1)}%
              </span>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className={cn(
          'grid gap-4',
          compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
        )}>
          <MiniStat
            icon={FileText}
            value={data.totalStrands}
            label="Strands"
            color={isDark ? 'text-emerald-400' : 'text-emerald-600'}
            isDark={isDark}
          />
          <MiniStat
            icon={GitCommit}
            value={data.totalCommits}
            label="Commits"
            color={isDark ? 'text-violet-400' : 'text-violet-600'}
            isDark={isDark}
          />
          {!compact && (
            <>
              <MiniStat
                icon={Tag}
                value={data.totalTags}
                label="Tags"
                color={isDark ? 'text-amber-400' : 'text-amber-600'}
                isDark={isDark}
              />
              <MiniStat
                icon={Award}
                value={milestoneCount}
                label="Milestones"
                color={isDark ? 'text-rose-400' : 'text-rose-600'}
                isDark={isDark}
              />
            </>
          )}
        </div>

        {/* Recent Milestones Preview */}
        {!compact && data.milestones.length > 0 && (
          <div className={cn(
            'mt-4 pt-3 border-t',
            isDark ? 'border-zinc-700/50' : 'border-zinc-100'
          )}>
            <p className={cn(
              'text-xs font-medium mb-2 flex items-center gap-1.5',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}>
              <Sparkles className="w-3 h-3" />
              Recent Milestones
            </p>
            <div className="space-y-1.5">
              {data.milestones.slice(0, 2).map((milestone) => (
                <div
                  key={milestone.id}
                  className={cn(
                    'flex items-center gap-2 text-xs',
                    isDark ? 'text-zinc-300' : 'text-zinc-600'
                  )}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  <span className="truncate flex-1">{milestone.title}</span>
                  <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
                    {new Date(milestone.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default EvolutionSummaryCard

