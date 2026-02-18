/**
 * Evolution Page Component
 * @module quarry/evolution/EvolutionPage
 *
 * @description
 * Full-page view showing the historical timeline of PKM growth.
 * Features collapsible timeframes, zoom levels, and milestone visualization.
 */

'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  History,
  Calendar,
  TrendingUp,
  GitCommit,
  Tag,
  Layers,
  FileText,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Award,
  BarChart3,
  ChevronRight,
  Loader2,
  Info,
  Clock,
} from 'lucide-react'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import AmbienceRightSidebar from '@/components/quarry/ui/sidebar/AmbienceRightSidebar'
import EvolutionLeftSidebar from '@/components/quarry/ui/sidebar/EvolutionLeftSidebar'
import { useEvolutionData, type ZoomLevel } from '@/components/quarry/hooks/useEvolutionData'
import { AreaChart } from '@/components/quarry/analytics/charts/AreaChart'
import { HeatmapCalendar } from '@/components/quarry/analytics/charts/HeatmapCalendar'
import { StatCard } from '@/components/quarry/analytics/StatCard'
import EvolutionTimeline from '@/components/quarry/ui/evolution/EvolutionTimeline'
import { LifecycleTab } from '@/components/quarry/ui/evolution/LifecycleTab'
import { JourneyTab } from '@/components/quarry/ui/evolution/journey/JourneyTab'
import { cn } from '@/lib/utils'
import { GitBranch } from 'lucide-react'

// ============================================================================
// TAB TYPES
// ============================================================================

type EvolutionTab = 'timeline' | 'lifecycle' | 'journey'

// ============================================================================
// ZOOM LEVEL SELECTOR
// ============================================================================

interface ZoomSelectorProps {
  value: ZoomLevel
  onChange: (level: ZoomLevel) => void
  isDark: boolean
}

function ZoomSelector({ value, onChange, isDark }: ZoomSelectorProps) {
  const levels: { id: ZoomLevel; label: string }[] = [
    { id: 'year', label: 'Year' },
    { id: 'quarter', label: 'Quarter' },
    { id: 'month', label: 'Month' },
    { id: 'week', label: 'Week' },
  ]

  return (
    <div className={cn(
      'inline-flex rounded-lg p-1',
      isDark ? 'bg-zinc-800' : 'bg-zinc-100'
    )}>
      {levels.map((level) => {
        const isSelected = value === level.id
        return (
          <button
            key={level.id}
            onClick={() => onChange(level.id)}
            className={cn(
              'relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150',
              isSelected
                ? isDark ? 'text-white' : 'text-zinc-900'
                : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="zoom-level-bg"
                className={cn(
                  'absolute inset-0 rounded-md',
                  isDark ? 'bg-zinc-700' : 'bg-white shadow-sm'
                )}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{level.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// MILESTONES CARD
// ============================================================================

interface MilestonesCardProps {
  milestones: NonNullable<ReturnType<typeof useEvolutionData>['data']>['milestones']
  isDark: boolean
}

function MilestonesCard({ milestones, isDark }: MilestonesCardProps) {
  if (milestones.length === 0) {
    return (
      <div className={cn(
        'p-6 rounded-xl border text-center',
        isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
      )}>
        <Award className={cn('w-10 h-10 mx-auto mb-3', isDark ? 'text-zinc-600' : 'text-zinc-400')} />
        <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          Milestones will appear as your knowledge base grows
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      'p-4 rounded-xl border',
      isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
    )}>
      <h3 className={cn(
        'text-sm font-semibold mb-4 flex items-center gap-2',
        isDark ? 'text-zinc-200' : 'text-zinc-800'
      )}>
        <Award className="w-4 h-4 text-amber-500" />
        Milestones
      </h3>
      <div className="space-y-3">
        {milestones.slice(0, 5).map((milestone) => (
          <div
            key={milestone.id}
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg',
              isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'
            )}
          >
            <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-medium truncate',
                isDark ? 'text-zinc-200' : 'text-zinc-800'
              )}>
                {milestone.title}
              </p>
              <p className={cn(
                'text-xs',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}>
                {new Date(milestone.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// ============================================================================
// TAB SELECTOR
// ============================================================================

interface TabSelectorProps {
  value: EvolutionTab
  onChange: (tab: EvolutionTab) => void
  isDark: boolean
}

function TabSelector({ value, onChange, isDark }: TabSelectorProps) {
  const tabs: { id: EvolutionTab; label: string; icon: React.ReactNode }[] = [
    { id: 'timeline', label: 'Timeline', icon: <Calendar className="w-4 h-4" /> },
    { id: 'lifecycle', label: 'Lifecycle', icon: <Clock className="w-4 h-4" /> },
    { id: 'journey', label: 'Journey', icon: <GitBranch className="w-4 h-4" /> },
  ]

  return (
    <div className={cn(
      'inline-flex rounded-lg p-1',
      isDark ? 'bg-zinc-800' : 'bg-zinc-100'
    )}>
      {tabs.map((tab) => {
        const isSelected = value === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150',
              isSelected
                ? isDark ? 'text-white' : 'text-zinc-900'
                : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="evolution-tab-bg"
                className={cn(
                  'absolute inset-0 rounded-md',
                  isDark ? 'bg-zinc-700' : 'bg-white shadow-sm'
                )}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EvolutionPage() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const resolvePath = useQuarryPath()
  const isDark = resolvedTheme === 'dark'

  const { data, loading, error, zoomLevel, setZoomLevel, refresh } = useEvolutionData()
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<EvolutionTab>('timeline')

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  // Calculate activity heatmap data
  const heatmapData = useMemo(() => {
    if (!data?.timeSeries) return []
    return data.timeSeries.map((point) => ({
      date: point.date,
      value: point.count,
    }))
  }, [data?.timeSeries])

  // Loading state
  if (loading) {
    return (
      <QuarryPageLayout
        title="Evolution"
        description="Historical timeline of your knowledge base"
        showRightPanel={true}
        rightPanelContent={<AmbienceRightSidebar />}
        rightPanelWidth={280}
        leftPanelContent={<EvolutionLeftSidebar isDark={isDark} />}
        forceSidebarSmall={true}
      >
        <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
          <Loader2 className={cn(
            'w-8 h-8 animate-spin',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )} />
          <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            Loading evolution data...
          </p>
        </div>
      </QuarryPageLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <QuarryPageLayout
        title="Evolution"
        description="Historical timeline of your knowledge base"
        showRightPanel={true}
        rightPanelContent={<AmbienceRightSidebar />}
        rightPanelWidth={280}
        leftPanelContent={<EvolutionLeftSidebar isDark={isDark} />}
        forceSidebarSmall={true}
      >
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Info className={cn('w-12 h-12', isDark ? 'text-red-400' : 'text-red-500')} />
          <p className={cn('text-lg font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
            Failed to load evolution data
          </p>
          <p className={cn('text-sm max-w-md text-center', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            {error}
          </p>
          <button
            onClick={handleRefresh}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isDark
                ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
            )}
          >
            Try Again
          </button>
        </div>
      </QuarryPageLayout>
    )
  }

  // Empty state
  if (!data || data.totalStrands === 0) {
    return (
      <QuarryPageLayout
        title="Evolution"
        description="Historical timeline of your knowledge base"
        showRightPanel={true}
        rightPanelContent={<AmbienceRightSidebar />}
        rightPanelWidth={280}
        leftPanelContent={<EvolutionLeftSidebar isDark={isDark} />}
        forceSidebarSmall={true}
      >
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
          <History className={cn('w-16 h-16', isDark ? 'text-zinc-600' : 'text-zinc-300')} />
          <p className={cn('text-xl font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
            No evolution data yet
          </p>
          <p className={cn('text-sm max-w-md', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            Start creating strands and your knowledge base evolution will appear here.
          </p>
          <Link
            href={resolvePath('/quarry/new')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              'bg-emerald-500 hover:bg-emerald-600 text-white'
            )}
          >
            Create Your First Strand
          </Link>
        </div>
      </QuarryPageLayout>
    )
  }

  return (
    <QuarryPageLayout
      title="Evolution"
      description="Historical timeline of your knowledge base"
      showRightPanel={true}
      rightPanelContent={<AmbienceRightSidebar />}
      rightPanelWidth={280}
      leftPanelContent={
        <EvolutionLeftSidebar
          isDark={isDark}
          stats={{
            totalStrands: data.totalStrands,
            totalCommits: data.totalCommits,
            totalTags: data.totalTags,
            growthRate: data.growthRate,
            milestonesCount: data.milestones.length,
          }}
        />
      }
      forceSidebarSmall={true}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className={cn(
              'text-2xl font-bold flex items-center gap-3',
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            )}>
              <History className="w-7 h-7 text-emerald-500" />
              Knowledge Evolution
            </h1>
            <p className={cn('text-sm mt-1', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              {data.firstContentDate && (
                <>
                  Growing since {new Date(data.firstContentDate).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'timeline' && (
              <ZoomSelector
                value={zoomLevel}
                onChange={setZoomLevel}
                isDark={isDark}
              />
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'
              )}
            >
              <RefreshCw className={cn(
                'w-5 h-5',
                refreshing && 'animate-spin',
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              )} />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mb-8">
          <TabSelector
            value={activeTab}
            onChange={setActiveTab}
            isDark={isDark}
          />
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                  label="Total Strands"
                  value={data.totalStrands}
                  icon="layers"
                  color="emerald"
                  isDark={isDark}
                />
                <StatCard
                  label="Total Commits"
                  value={data.totalCommits}
                  icon="gitCommit"
                  color="cyan"
                  isDark={isDark}
                />
                <StatCard
                  label="Unique Tags"
                  value={data.totalTags}
                  icon="tag"
                  color="violet"
                  isDark={isDark}
                />
                <StatCard
                  label="Growth Rate"
                  value={`${data.growthRate > 0 ? '+' : ''}${data.growthRate.toFixed(1)}%`}
                  icon="trendingUp"
                  color={data.growthRate >= 0 ? 'emerald' : 'amber'}
                  isDark={isDark}
                />
              </div>

              {/* Main Content */}
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Timeline Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Growth Chart */}
                  <div className={cn(
                    'p-4 rounded-xl border',
                    isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
                  )}>
                    <h3 className={cn(
                      'text-sm font-semibold mb-4 flex items-center gap-2',
                      isDark ? 'text-zinc-200' : 'text-zinc-800'
                    )}>
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      Growth Over Time
                    </h3>
                    <AreaChart
                      data={data.timeSeries}
                      height={200}
                      showCumulative
                      colorScheme="primary"
                      isDark={isDark}
                    />
                  </div>

                  {/* Evolution Timeline */}
                  <div className={cn(
                    'rounded-xl border overflow-hidden',
                    isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
                  )}>
                    <div className={cn(
                      'px-4 py-3 border-b',
                      isDark ? 'border-zinc-700' : 'border-zinc-200'
                    )}>
                      <h3 className={cn(
                        'text-sm font-semibold flex items-center gap-2',
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      )}>
                        <Calendar className="w-4 h-4 text-cyan-500" />
                        Timeline
                      </h3>
                    </div>
                    <EvolutionTimeline
                      periods={data.periods}
                      zoomLevel={zoomLevel}
                      isDark={isDark}
                    />
                  </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                  {/* Activity Heatmap */}
                  <div className={cn(
                    'p-4 rounded-xl border overflow-hidden',
                    isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
                  )}>
                    <h3 className={cn(
                      'text-sm font-semibold mb-4 flex items-center gap-2',
                      isDark ? 'text-zinc-200' : 'text-zinc-800'
                    )}>
                      <BarChart3 className="w-4 h-4 text-violet-500" />
                      Activity
                    </h3>
                    <div className="w-full overflow-x-auto">
                      <HeatmapCalendar
                        data={heatmapData}
                        weeks={20}
                        colorScheme="emerald"
                        isDark={isDark}
                        cellSize={9}
                        cellGap={2}
                        showDayLabels={false}
                      />
                    </div>
                  </div>

                  {/* Milestones */}
                  <MilestonesCard milestones={data.milestones} isDark={isDark} />

                  {/* Quick Links */}
                  <div className={cn(
                    'p-4 rounded-xl border',
                    isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
                  )}>
                    <h3 className={cn(
                      'text-sm font-semibold mb-3',
                      isDark ? 'text-zinc-200' : 'text-zinc-800'
                    )}>
                      Related
                    </h3>
                    <div className="space-y-2">
                      <Link
                        href={resolvePath('/quarry/analytics')}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg text-sm transition-colors',
                          isDark
                            ? 'hover:bg-zinc-700 text-zinc-300'
                            : 'hover:bg-zinc-100 text-zinc-600'
                        )}
                      >
                        <BarChart3 className="w-4 h-4" />
                        Full Analytics
                        <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                      </Link>
                      <Link
                        href={resolvePath('/quarry/graph')}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg text-sm transition-colors',
                          isDark
                            ? 'hover:bg-zinc-700 text-zinc-300'
                            : 'hover:bg-zinc-100 text-zinc-600'
                        )}
                      >
                        <Layers className="w-4 h-4" />
                        Knowledge Graph
                        <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {activeTab === 'lifecycle' && (
            <motion.div
              key="lifecycle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <LifecycleTab isDark={isDark} />
            </motion.div>
          )}
          
          {activeTab === 'journey' && (
            <motion.div
              key="journey"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <JourneyTab isDark={isDark} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </QuarryPageLayout>
  )
}

