/**
 * Evolution Section Component
 * @module components/quarry/analytics/EvolutionSection
 *
 * @description
 * Full expandable section in Analytics showing a mini timeline
 * with collapsible timeframes and activity visualization.
 */

'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  TrendingUp,
  FileText,
  GitCommit,
  Tag,
  Award,
  Loader2,
  Info,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import { useEvolutionData, type ZoomLevel } from '@/components/quarry/hooks/useEvolutionData'
import { EvolutionTimeline } from '@/components/quarry/ui/evolution/EvolutionTimeline'
import { HeatmapCalendar } from './charts/HeatmapCalendar'

// ============================================================================
// TYPES
// ============================================================================

interface EvolutionSectionProps {
  /** Dark mode */
  isDark?: boolean
  /** Default expanded state */
  defaultExpanded?: boolean
}

// ============================================================================
// ZOOM LEVEL TOGGLE
// ============================================================================

interface ZoomToggleProps {
  value: ZoomLevel
  onChange: (level: ZoomLevel) => void
  isDark: boolean
}

function ZoomToggle({ value, onChange, isDark }: ZoomToggleProps) {
  const levels: { id: ZoomLevel; label: string }[] = [
    { id: 'quarter', label: 'Q' },
    { id: 'month', label: 'M' },
    { id: 'week', label: 'W' },
  ]

  return (
    <div className={cn(
      'inline-flex rounded-md p-0.5',
      isDark ? 'bg-zinc-800' : 'bg-zinc-100'
    )}>
      {levels.map((level) => (
        <button
          key={level.id}
          onClick={(e) => {
            e.stopPropagation()
            onChange(level.id)
          }}
          className={cn(
            'px-2 py-1 text-xs font-medium rounded transition-colors',
            value === level.id
              ? isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800 shadow-sm'
              : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
          )}
        >
          {level.label}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// STAT PILL
// ============================================================================

interface StatPillProps {
  icon: React.ElementType
  value: number | string
  isDark: boolean
  color?: string
}

function StatPill({ icon: Icon, value, isDark, color }: StatPillProps) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
      isDark ? 'bg-zinc-800' : 'bg-zinc-100'
    )}>
      <Icon className={cn('w-3 h-3', color || (isDark ? 'text-zinc-400' : 'text-zinc-500'))} />
      <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EvolutionSection({
  isDark = false,
  defaultExpanded = false,
}: EvolutionSectionProps) {
  const resolvePath = useQuarryPath()
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const { data, loading, error, zoomLevel, setZoomLevel } = useEvolutionData()

  // Calculate activity heatmap data
  const heatmapData = React.useMemo(() => {
    if (!data?.timeSeries) return []
    return data.timeSeries.map((point) => ({
      date: point.date,
      value: point.count,
    }))
  }, [data?.timeSeries])

  // Loading state inline
  if (loading) {
    return (
      <div className={cn(
        'rounded-xl border overflow-hidden',
        isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
      )}>
        <div className="flex items-center gap-3 px-4 py-3">
          <History className={cn('w-5 h-5', isDark ? 'text-emerald-400' : 'text-emerald-600')} />
          <span className={cn('font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
            Evolution Timeline
          </span>
          <Loader2 className={cn(
            'w-4 h-4 ml-auto animate-spin',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )} />
        </div>
      </div>
    )
  }

  // Error or no data - hide section
  if (error || !data || data.totalStrands === 0) {
    return null
  }

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden transition-all',
      isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
    )}>
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
          isDark ? 'hover:bg-zinc-700/30' : 'hover:bg-zinc-50'
        )}
      >
        <History className={cn('w-5 h-5', isDark ? 'text-emerald-400' : 'text-emerald-600')} />
        <span className={cn('font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
          Evolution Timeline
        </span>

        {/* Stats Pills */}
        <div className="hidden sm:flex items-center gap-2 ml-2">
          <StatPill
            icon={FileText}
            value={data.totalStrands}
            isDark={isDark}
            color={isDark ? 'text-emerald-400' : 'text-emerald-600'}
          />
          <StatPill
            icon={GitCommit}
            value={data.totalCommits}
            isDark={isDark}
            color={isDark ? 'text-violet-400' : 'text-violet-600'}
          />
          {data.growthRate > 0 && (
            <StatPill
              icon={TrendingUp}
              value={`+${data.growthRate.toFixed(1)}%`}
              isDark={isDark}
              color={isDark ? 'text-emerald-400' : 'text-emerald-600'}
            />
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isExpanded && (
            <ZoomToggle
              value={zoomLevel}
              onChange={setZoomLevel}
              isDark={isDark}
            />
          )}
          <motion.div
            initial={false}
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className={cn('w-5 h-5', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
          </motion.div>
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className={cn(
              'px-4 pb-4 pt-1 border-t',
              isDark ? 'border-zinc-700/50' : 'border-zinc-100'
            )}>
              {/* Activity Heatmap */}
              <div className={cn(
                'p-3 rounded-lg mb-4',
                isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <p className={cn(
                    'text-xs font-medium flex items-center gap-1.5',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}>
                    <BarChart3 className="w-3.5 h-3.5" />
                    Activity (Last 6 months)
                  </p>
                </div>
                <HeatmapCalendar
                  data={heatmapData}
                  weeks={26}
                  colorScheme="emerald"
                  isDark={isDark}
                  cellSize={8}
                  cellGap={2}
                />
              </div>

              {/* Mini Timeline */}
              <div className={cn(
                'rounded-lg border overflow-hidden',
                isDark ? 'border-zinc-700' : 'border-zinc-200'
              )}>
                <EvolutionTimeline
                  periods={data.periods.slice(0, 5)}
                  zoomLevel={zoomLevel}
                  isDark={isDark}
                  maxHeight={300}
                  showControls={false}
                  compact
                />
              </div>

              {/* Milestones */}
              {data.milestones.length > 0 && (
                <div className="mt-4">
                  <p className={cn(
                    'text-xs font-medium mb-2 flex items-center gap-1.5',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}>
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    Key Milestones
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.milestones.slice(0, 4).map((milestone) => (
                      <div
                        key={milestone.id}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
                          isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'
                        )}
                      >
                        <Award className="w-3 h-3" />
                        {milestone.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* View Full Timeline Link */}
              <Link
                href={resolvePath('/quarry/evolution')}
                className={cn(
                  'mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
                  isDark
                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                )}
              >
                <History className="w-4 h-4" />
                View Full Evolution Timeline
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default EvolutionSection

