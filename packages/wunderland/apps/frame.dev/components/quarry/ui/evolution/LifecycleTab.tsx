/**
 * Lifecycle Tab
 * 
 * Main tab component for lifecycle visualization within the Evolution page.
 * Shows decay chart, strand lists, resurface panel, and settings.
 * 
 * @module components/quarry/ui/evolution/LifecycleTab
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Activity,
  Clock,
  RefreshCw,
  Settings,
  TrendingDown,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLifecycleData } from '@/components/quarry/hooks/useLifecycleData'
import { LifecycleDecayChart } from './LifecycleDecayChart'
import { StrandLifecycleList } from './StrandLifecycleList'
import { ResurfacePanel } from './ResurfacePanel'
import { LIFECYCLE_STAGE_META } from '@/lib/analytics/lifecycleTypes'

// ============================================================================
// TYPES
// ============================================================================

interface LifecycleTabProps {
  isDark: boolean
}

// ============================================================================
// STAT CARD
// ============================================================================

function LifecycleStatCard({
  stage,
  count,
  percentage,
  isDark,
}: {
  stage: 'fresh' | 'active' | 'faded'
  count: number
  percentage: number
  isDark: boolean
}) {
  const meta = LIFECYCLE_STAGE_META[stage]
  const Icon = stage === 'fresh' ? Sparkles : stage === 'active' ? Activity : Clock

  return (
    <div className={cn(
      'p-4 rounded-xl border',
      isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', meta.bgColor)}>
          <Icon className={cn('w-4 h-4', meta.color)} />
        </div>
        <div className="flex-1">
          <div className={cn('text-2xl font-bold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
            {count}
          </div>
          <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            {meta.label} ({percentage}%)
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LifecycleTab({ isDark }: LifecycleTabProps) {
  const [showSettings, setShowSettings] = useState(false)
  
  const {
    freshStrands,
    activeStrands,
    fadedStrands,
    atRiskStrands,
    resurfaceSuggestions,
    stats,
    timeSeries,
    loading,
    error,
    refresh,
    recalculate,
    resurface,
  } = useLifecycleData()

  const [refreshing, setRefreshing] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  const handleRecalculate = async () => {
    setRecalculating(true)
    await recalculate()
    setRecalculating(false)
  }

  const handleResurface = async (strandPath: string) => {
    await resurface(strandPath)
  }

  // Loading state
  if (loading && !stats) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-16',
        isDark ? 'text-zinc-400' : 'text-zinc-500'
      )}>
        <RefreshCw className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">Loading lifecycle data...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        isDark ? 'text-zinc-400' : 'text-zinc-500'
      )}>
        <AlertTriangle className={cn('w-10 h-10 mb-3', isDark ? 'text-red-400' : 'text-red-500')} />
        <p className="text-sm font-medium mb-2">Failed to load lifecycle data</p>
        <p className="text-xs mb-4 max-w-md">{error}</p>
        <button
          onClick={handleRefresh}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium',
            isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'
          )}
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn(
            'text-lg font-semibold flex items-center gap-2',
            isDark ? 'text-zinc-100' : 'text-zinc-900'
          )}>
            <TrendingDown className="w-5 h-5 text-cyan-500" />
            Lifecycle Decay
          </h2>
          <p className={cn('text-sm mt-1', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            Track how your strands evolve: Fresh → Active → Faded
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              isDark
                ? 'hover:bg-zinc-700 text-zinc-400'
                : 'hover:bg-zinc-100 text-zinc-500'
            )}
            title="Recalculate all decay scores"
          >
            <RotateCcw className={cn('w-4 h-4', recalculating && 'animate-spin')} />
            Recalculate
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'
            )}
            title="Refresh data"
          >
            <RefreshCw className={cn(
              'w-5 h-5',
              refreshing && 'animate-spin',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <LifecycleStatCard
            stage="fresh"
            count={stats.byStage.fresh}
            percentage={stats.percentageByStage.fresh}
            isDark={isDark}
          />
          <LifecycleStatCard
            stage="active"
            count={stats.byStage.active}
            percentage={stats.percentageByStage.active}
            isDark={isDark}
          />
          <LifecycleStatCard
            stage="faded"
            count={stats.byStage.faded}
            percentage={stats.percentageByStage.faded}
            isDark={isDark}
          />
        </div>
      )}

      {/* Additional Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={cn(
            'p-3 rounded-lg text-center',
            isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
          )}>
            <div className={cn('text-xl font-bold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
              {stats.totalStrands}
            </div>
            <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              Total Tracked
            </div>
          </div>
          <div className={cn(
            'p-3 rounded-lg text-center',
            isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
          )}>
            <div className={cn('text-xl font-bold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
              {Math.round(stats.averageDecayScore)}%
            </div>
            <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              Avg Decay Score
            </div>
          </div>
          <div className={cn(
            'p-3 rounded-lg text-center',
            isDark ? 'bg-amber-500/10' : 'bg-amber-50'
          )}>
            <div className={cn('text-xl font-bold text-amber-500')}>
              {stats.atRiskCount}
            </div>
            <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              At Risk
            </div>
          </div>
          <div className={cn(
            'p-3 rounded-lg text-center',
            isDark ? 'bg-cyan-500/10' : 'bg-cyan-50'
          )}>
            <div className={cn('text-xl font-bold text-cyan-500')}>
              {stats.resurfaceSuggestionCount}
            </div>
            <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              To Resurface
            </div>
          </div>
        </div>
      )}

      {/* Decay Chart */}
      <div className={cn(
        'p-4 rounded-xl border',
        isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
      )}>
        <h3 className={cn(
          'text-sm font-semibold mb-4 flex items-center gap-2',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          <Activity className="w-4 h-4 text-emerald-500" />
          Stage Distribution Over Time
        </h3>
        <LifecycleDecayChart
          data={timeSeries}
          isDark={isDark}
          height={220}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Strand Lists */}
        <div className="lg:col-span-2">
          <StrandLifecycleList
            freshStrands={freshStrands}
            activeStrands={activeStrands}
            fadedStrands={fadedStrands}
            atRiskStrands={atRiskStrands}
            isDark={isDark}
            onResurface={handleResurface}
          />
        </div>

        {/* Resurface Panel */}
        <div>
          <ResurfacePanel
            suggestions={resurfaceSuggestions}
            isDark={isDark}
            onResurface={handleResurface}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

export default LifecycleTab

