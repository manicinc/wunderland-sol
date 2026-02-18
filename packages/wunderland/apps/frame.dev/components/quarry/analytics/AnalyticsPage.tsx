/**
 * Analytics Page Component
 * @module components/quarry/analytics/AnalyticsPage
 *
 * Main analytics dashboard showing content growth, tag evolution, and activity metrics.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import {
  TrendingUp,
  Tag,
  Activity,
  Loader2,
  RefreshCw,
  FileText,
  Clock,
  BarChart3,
  Hash,
  BookOpen,
  Zap,
  Search,
  CheckCircle2,
  GitBranch,
  Timer,
  GraduationCap,
  Grid3X3,
  Info,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAnalyticsData, formatDuration, isStaticMode } from '@/lib/analytics'
import type { TimeRange, AnalyticsData } from '@/lib/analytics/types'
import { getWordCountHistory, getWordCountStats } from '@/lib/write/projectStore'
import { StatCard } from './StatCard'
import { TimeRangeSelector } from './TimeRangeSelector'
import { AreaChart } from './charts/AreaChart'
import { BarChart } from './charts/BarChart'
import { ResearchSection } from './ResearchSection'
import { AccomplishmentAnalytics } from './AccomplishmentAnalytics'
import { GitHistorySection } from './GitHistorySection'
import { UsageSection } from './UsageSection'
import { LearningAnalyticsSection } from './LearningAnalyticsSection'
import { EvolutionSummaryCard } from './EvolutionSummaryCard'
import { EvolutionSection } from './EvolutionSection'

// ============================================================================
// COMPONENT
// ============================================================================

export function AnalyticsPage() {
  const { resolvedTheme } = useTheme()
  const resolvePath = useQuarryPath()
  const isDark = resolvedTheme === 'dark'

  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [hasSynced, setHasSynced] = useState(false)
  const [staticMode, setStaticMode] = useState(false)

  // Sync git history to populate analytics data
  const syncGitHistory = async () => {
    // Check if we're in static mode (GitHub Pages, etc.)
    if (isStaticMode()) {
      console.log('[Analytics] Static mode detected, skipping API sync')
      setStaticMode(true)
      setHasSynced(true)
      return
    }

    setSyncing(true)
    setSyncError(null)
    try {
      const response = await fetch('/api/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      })
      
      // Check if we got an HTML error page (405/404 in static mode)
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('text/html')) {
        console.log('[Analytics] API not available (static export), using fallback data')
        setStaticMode(true)
        setHasSynced(true)
        return
      }

      const result = await response.json()
      if (!result.success && result.errors?.length > 0) {
        // Only show error if it's not just a cooldown skip
        if (!result.errors.some((e: string) => e.includes('cooldown'))) {
          console.warn('[Analytics] Git sync had errors:', result.errors)
        }
      }
      setHasSynced(true)
    } catch (error) {
      console.error('[Analytics] Git sync failed:', error)
      // If sync fails, we might be in static mode
      setStaticMode(true)
      setSyncError(error instanceof Error ? error.message : 'Sync failed')
      setHasSynced(true) // Continue anyway to show whatever data exists
    } finally {
      setSyncing(false)
    }
  }

  // Load data
  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)

    try {
      const analyticsData = await getAnalyticsData(timeRange)
      setData(analyticsData)
    } catch (error) {
      console.error('[Analytics] Failed to load data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Sync git history once on mount
  useEffect(() => {
    syncGitHistory()
  }, [])

  // Load data when sync completes or time range changes
  useEffect(() => {
    if (hasSynced) {
      loadData()
    }
  }, [timeRange, hasSynced])

  // Loading state (including syncing)
  if (loading || syncing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        {syncing && (
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            <GitBranch className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />
            Syncing git history...
          </p>
        )}
      </div>
    )
  }

  // Check if data is null (must show empty state)
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className={`w-12 h-12 mb-4 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
        <p className={`text-lg font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
          No analytics data yet
        </p>
        <p className={`text-sm max-w-md mb-6 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Analytics will populate as you create strands, add tags, and interact with content.
        </p>
        <div className="flex gap-3">
          <a
            href={resolvePath('/quarry/new')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${isDark
                ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                : 'bg-cyan-500 hover:bg-cyan-600 text-white'
              }
            `}
          >
            Create First Strand
          </a>
          <a
            href="/quarry"
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${isDark
                ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
              }
            `}
          >
            Browse Content
          </a>
        </div>
      </div>
    )
  }

  // Check if data is effectively empty (all zeros) - only show empty state in non-static mode
  const isDataEmpty = (
    data.growth.totalStrands === 0 &&
    data.tags.totalUniqueTags === 0 &&
    data.activity.totalActions === 0 &&
    data.engagement.totalReadTime === 0
  )

  if (isDataEmpty && !staticMode) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className={`w-12 h-12 mb-4 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
        <p className={`text-lg font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
          No analytics data yet
        </p>
        <p className={`text-sm max-w-md mb-6 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Analytics will populate as you create strands, add tags, and interact with content.
        </p>
        <div className="flex gap-3">
          <a
            href={resolvePath('/quarry/new')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${isDark
                ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                : 'bg-cyan-500 hover:bg-cyan-600 text-white'
              }
            `}
          >
            Create First Strand
          </a>
          <a
            href="/quarry"
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${isDark
                ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
              }
            `}
          >
            Browse Content
          </a>
        </div>
      </div>
    )
  }

  // Static mode info banner component
  const StaticModeBanner = staticMode ? (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex items-start gap-3 p-4 rounded-lg mb-6
        ${isDark
          ? 'bg-blue-900/20 border border-blue-800/30'
          : 'bg-blue-50 border border-blue-100'
        }
      `}
      role="status"
      aria-label="Static mode information"
    >
      <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
      <div>
        <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
          Demo Mode - Limited Analytics
        </p>
        <p className={`text-xs mt-1 ${isDark ? 'text-blue-400/80' : 'text-blue-600/80'}`}>
          You&apos;re viewing analytics from the public repository. Connect a local vault or 
          run Quarry locally for full analytics including activity tracking, engagement 
          metrics, and git history integration.
        </p>
      </div>
    </motion.div>
  ) : null

  return (
    <div className="space-y-6">
      {/* Static Mode Banner */}
      {StaticModeBanner}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Analytics
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Track your content growth and engagement over time
          </p>
        </div>

        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} isDark={isDark} />
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className={`
              p-2 rounded-lg transition-colors
              ${isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
              }
              disabled:opacity-50
            `}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Strands"
          value={data.growth.totalStrands}
          icon="file-text"
          color="emerald"
          isDark={isDark}
        />
        <StatCard
          label="This Period"
          value={data.growth.strandsThisPeriod}
          icon="trending-up"
          color="cyan"
          change={
            data.growth.growthRate !== 0
              ? { value: data.growth.growthRate, isPositive: data.growth.growthRate > 0 }
              : undefined
          }
          isDark={isDark}
        />
        <StatCard
          label="Unique Tags"
          value={data.tags.totalUniqueTags}
          icon="tag"
          color="violet"
          isDark={isDark}
        />
        <StatCard
          label="Read Time"
          value={formatDuration(data.engagement.totalReadTime)}
          icon="clock"
          color="amber"
          subtitle={`${data.engagement.completedStrands} completed`}
          isDark={isDark}
        />
      </div>

      {/* Evolution Summary Card */}
      <EvolutionSummaryCard isDark={isDark} />

      {/* Tabs - Mobile Scrollable */}
      <Tabs defaultValue="growth" className="space-y-6">
        {/* Scrollable tabs container for mobile */}
        <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide pb-1 sm:mx-0 sm:px-0">
          <TabsList
            className={`
              inline-flex p-1 rounded-lg min-w-max
              ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
            `}
            aria-label="Analytics sections"
          >
            <TabsTrigger
              value="growth"
              className={`
                flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium
                data-[state=active]:shadow-sm transition-all whitespace-nowrap
                ${isDark
                  ? 'data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400'
                  : 'data-[state=active]:bg-white data-[state=active]:text-zinc-900 text-zinc-500'
                }
              `}
            >
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              <span className="hidden xs:inline">Growth</span>
              <span className="xs:hidden">📈</span>
            </TabsTrigger>
            <TabsTrigger
              value="tags"
              className={`
                flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium
                data-[state=active]:shadow-sm transition-all whitespace-nowrap
                ${isDark
                  ? 'data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400'
                  : 'data-[state=active]:bg-white data-[state=active]:text-zinc-900 text-zinc-500'
                }
              `}
            >
              <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Tags & Topics</span>
              <span className="sm:hidden">Tags</span>
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className={`
                flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium
                data-[state=active]:shadow-sm transition-all whitespace-nowrap
                ${isDark
                  ? 'data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400'
                  : 'data-[state=active]:bg-white data-[state=active]:text-zinc-900 text-zinc-500'
                }
              `}
            >
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="research"
              className={`
                flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium
                data-[state=active]:shadow-sm transition-all whitespace-nowrap
                ${isDark
                  ? 'data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400'
                  : 'data-[state=active]:bg-white data-[state=active]:text-zinc-900 text-zinc-500'
                }
              `}
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              Research
            </TabsTrigger>
            <TabsTrigger
              value="accomplishments"
              className={`
                flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium
                data-[state=active]:shadow-sm transition-all whitespace-nowrap
                ${isDark
                  ? 'data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400'
                  : 'data-[state=active]:bg-white data-[state=active]:text-zinc-900 text-zinc-500'
                }
              `}
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              <span className="hidden md:inline">Accomplishments</span>
              <span className="md:hidden">Accom.</span>
            </TabsTrigger>
            <TabsTrigger
              value="git"
              className={`
                flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium
                data-[state=active]:shadow-sm transition-all whitespace-nowrap
                ${isDark
                  ? 'data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400'
                  : 'data-[state=active]:bg-white data-[state=active]:text-zinc-900 text-zinc-500'
                }
              `}
            >
              <GitBranch className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              Git
            </TabsTrigger>
            <TabsTrigger
              value="usage"
              className={`
                flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium
                data-[state=active]:shadow-sm transition-all whitespace-nowrap
                ${isDark
                  ? 'data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400'
                  : 'data-[state=active]:bg-white data-[state=active]:text-zinc-900 text-zinc-500'
                }
              `}
            >
              <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              Usage
            </TabsTrigger>
            <TabsTrigger
              value="learning"
              className={`
                flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium
                data-[state=active]:shadow-sm transition-all whitespace-nowrap
                ${isDark
                  ? 'data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400'
                  : 'data-[state=active]:bg-white data-[state=active]:text-zinc-900 text-zinc-500'
                }
              `}
            >
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              Learn
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Growth Tab */}
        <TabsContent value="growth" className="space-y-6">
          <GrowthSection data={data} isDark={isDark} />
          <EvolutionSection isDark={isDark} />
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags" className="space-y-6">
          <TagsSection data={data} isDark={isDark} />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <ActivitySection data={data} isDark={isDark} />
        </TabsContent>

        {/* Research Tab */}
        <TabsContent value="research" className="space-y-6">
          <ResearchSection isDark={isDark} />
        </TabsContent>

        {/* Accomplishments Tab */}
        <TabsContent value="accomplishments" className="space-y-6">
          <AccomplishmentAnalytics isDark={isDark} />
        </TabsContent>

        {/* Git History Tab */}
        <TabsContent value="git" className="space-y-6">
          <GitHistorySection isDark={isDark} timeRange={timeRange} />
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <UsageSection isDark={isDark} timeRange={timeRange} />
        </TabsContent>

        {/* Learning Tab */}
        <TabsContent value="learning" className="space-y-6">
          <LearningAnalyticsSection theme={isDark ? 'dark' : 'light'} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// GROWTH SECTION
// ============================================================================

function GrowthSection({ data, isDark }: { data: AnalyticsData; isDark: boolean }) {
  return (
    <>
      {/* Writing Velocity Card */}
      <WritingVelocityCard isDark={isDark} />

      {/* Content Growth Chart */}
      <div
        className={`
          rounded-xl border p-6
          ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        `}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Content Growth
        </h3>
        <AreaChart
          data={data.growth.strandsOverTime}
          showCumulative
          colorScheme="primary"
          isDark={isDark}
          height={280}
        />
      </div>

      {/* Breakdown Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* By Weave */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            By Category
          </h3>
          {data.growth.byWeave.length > 0 ? (
            <BarChart
              data={data.growth.byWeave.map((w) => ({ label: w.name, value: w.count }))}
              horizontal
              colorScheme="mixed"
              isDark={isDark}
            />
          ) : (
            <EmptyState message="No category data" isDark={isDark} />
          )}
        </div>

        {/* By Status */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            By Status
          </h3>
          {data.growth.byStatus.length > 0 ? (
            <BarChart
              data={data.growth.byStatus.map((s) => ({
                label: s.status.charAt(0).toUpperCase() + s.status.slice(1),
                value: s.count,
              }))}
              horizontal
              colorScheme="secondary"
              isDark={isDark}
            />
          ) : (
            <EmptyState message="No status data" isDark={isDark} />
          )}
        </div>
      </div>
    </>
  )
}

// ============================================================================
// WRITING VELOCITY CARD
// ============================================================================

function WritingVelocityCard({ isDark }: { isDark: boolean }) {
  const [stats, setStats] = useState<{
    wordsToday: number
    wordsThisWeek: number
    wordsThisMonth: number
    currentStreak: number
    longestStreak: number
    averageDaily: number
    history: Array<{ date: string; count: number }>
  } | null>(null)

  useEffect(() => {
    try {
      const wordStats = getWordCountStats()
      const history = getWordCountHistory(14).reverse()

      setStats({
        wordsToday: wordStats.wordsToday,
        wordsThisWeek: wordStats.wordsThisWeek,
        wordsThisMonth: wordStats.wordsThisMonth,
        currentStreak: wordStats.currentStreak,
        longestStreak: wordStats.longestStreak,
        averageDaily: wordStats.avgWordsPerDay,
        history: history.map(h => ({
          date: h.date,
          count: h.wordsWritten,
        })),
      })
    } catch (err) {
      console.error('[WritingVelocity] Failed to load stats:', err)
    }
  }, [])

  if (!stats) {
    return (
      <div
        className={`
          rounded-xl border p-6 animate-pulse
          ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        `}
      >
        <div className={`h-6 w-40 rounded ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
        <div className={`h-32 mt-4 rounded ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
      </div>
    )
  }

  const hasWritingData = stats.wordsThisMonth > 0 || stats.history.some(h => h.count > 0)

  if (!hasWritingData) {
    return (
      <div
        className={`
          rounded-xl border p-6
          ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        `}
      >
        <div className="flex items-center gap-2 mb-4">
          <FileText className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Writing Velocity
          </h3>
        </div>
        <EmptyState
          message="Start writing to track your velocity"
          isDark={isDark}
        />
      </div>
    )
  }

  return (
    <div
      className={`
        rounded-xl border p-6
        ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Writing Velocity
          </h3>
        </div>
        {stats.currentStreak > 0 && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? 'bg-amber-900/30' : 'bg-amber-100'}`}>
            <span className="text-amber-500">🔥</span>
            <span className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              {stats.currentStreak} day streak
            </span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}>
          <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Today
          </p>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {stats.wordsToday.toLocaleString()}
          </p>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>words</p>
        </div>
        <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}>
          <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            This Week
          </p>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {stats.wordsThisWeek.toLocaleString()}
          </p>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>words</p>
        </div>
        <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}>
          <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            This Month
          </p>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {stats.wordsThisMonth.toLocaleString()}
          </p>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>words</p>
        </div>
        <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}>
          <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Daily Avg
          </p>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {Math.round(stats.averageDaily).toLocaleString()}
          </p>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>words/day</p>
        </div>
      </div>

      {/* Writing History Chart */}
      {stats.history.length > 0 && (
        <div>
          <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            Last 14 Days
          </h4>
          <BarChart
            data={stats.history.map(h => ({
              label: new Date(h.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric' }),
              value: h.count,
            }))}
            height={120}
            colorScheme="primary"
            isDark={isDark}
          />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// TAGS SECTION
// ============================================================================

function TagsSection({ data, isDark }: { data: AnalyticsData; isDark: boolean }) {
  return (
    <>
      {/* Top Tags/Subjects/Topics */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Top Tags */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <Hash className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Top Tags
            </h3>
          </div>
          {data.tags.topTags.length > 0 ? (
            <div className="space-y-2">
              {data.tags.topTags.slice(0, 8).map((tag, i) => (
                <div
                  key={tag.name}
                  className="flex items-center justify-between"
                >
                  <span
                    className={`text-sm ${
                      isDark ? 'text-zinc-300' : 'text-zinc-600'
                    }`}
                  >
                    #{tag.name}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    {tag.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No tags yet" isDark={isDark} />
          )}
        </div>

        {/* Top Subjects */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Top Subjects
            </h3>
          </div>
          {data.tags.topSubjects.length > 0 ? (
            <div className="space-y-2">
              {data.tags.topSubjects.slice(0, 8).map((subject) => (
                <div
                  key={subject.name}
                  className="flex items-center justify-between"
                >
                  <span
                    className={`text-sm ${
                      isDark ? 'text-zinc-300' : 'text-zinc-600'
                    }`}
                  >
                    {subject.name}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    {subject.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No subjects yet" isDark={isDark} />
          )}
        </div>

        {/* Top Topics */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Top Topics
            </h3>
          </div>
          {data.tags.topTopics.length > 0 ? (
            <div className="space-y-2">
              {data.tags.topTopics.slice(0, 8).map((topic) => (
                <div
                  key={topic.name}
                  className="flex items-center justify-between"
                >
                  <span
                    className={`text-sm ${
                      isDark ? 'text-zinc-300' : 'text-zinc-600'
                    }`}
                  >
                    {topic.name}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    {topic.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No topics yet" isDark={isDark} />
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className={`
            rounded-xl border p-4 text-center
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {data.tags.totalUniqueTags}
          </p>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Unique Tags</p>
        </div>
        <div
          className={`
            rounded-xl border p-4 text-center
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {data.tags.totalUniqueSubjects}
          </p>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Unique Subjects</p>
        </div>
        <div
          className={`
            rounded-xl border p-4 text-center
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {data.tags.totalUniqueTopics}
          </p>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Unique Topics</p>
        </div>
      </div>

      {/* Tag Co-occurrence Matrix */}
      <TagCooccurrenceMatrix data={data} isDark={isDark} />
    </>
  )
}

// ============================================================================
// TAG CO-OCCURRENCE MATRIX
// ============================================================================

function TagCooccurrenceMatrix({ data, isDark }: { data: AnalyticsData; isDark: boolean }) {
  const cooccurrence = data.tags.tagCooccurrence

  if (!cooccurrence || cooccurrence.tags.length === 0) {
    return (
      <div
        className={`
          rounded-xl border p-6
          ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        `}
      >
        <div className="flex items-center gap-2 mb-4">
          <Grid3X3 className={`w-5 h-5 ${isDark ? 'text-pink-400' : 'text-pink-600'}`} />
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Tag Co-occurrence
          </h3>
        </div>
        <EmptyState message="Add more tags to see co-occurrence patterns" isDark={isDark} />
      </div>
    )
  }

  const { tags, matrix, topPairs } = cooccurrence
  const maxValue = Math.max(...matrix.flat())

  // Get intensity class based on value
  const getIntensityClass = (value: number, isDiagonal: boolean) => {
    if (value === 0) return isDark ? 'bg-zinc-800' : 'bg-zinc-100'
    if (isDiagonal) return isDark ? 'bg-zinc-700' : 'bg-zinc-200' // Diagonal is self-count
    const intensity = value / maxValue
    if (intensity < 0.2) return isDark ? 'bg-pink-900/30' : 'bg-pink-50'
    if (intensity < 0.4) return isDark ? 'bg-pink-800/50' : 'bg-pink-100'
    if (intensity < 0.6) return isDark ? 'bg-pink-700/70' : 'bg-pink-200'
    if (intensity < 0.8) return isDark ? 'bg-pink-600' : 'bg-pink-300'
    return isDark ? 'bg-pink-500' : 'bg-pink-400'
  }

  return (
    <div
      className={`
        rounded-xl border p-6
        ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Grid3X3 className={`w-5 h-5 ${isDark ? 'text-pink-400' : 'text-pink-600'}`} />
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Tag Co-occurrence Matrix
          </h3>
        </div>
        <div
          className="flex items-center gap-1"
          title="Shows how often tags appear together in the same strand"
        >
          <Info className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Matrix Visualization */}
        <div className="overflow-x-auto">
          <div className="min-w-fit">
            {/* Column Headers */}
            <div className="flex ml-20">
              {tags.map((tag) => (
                <div
                  key={`header-${tag}`}
                  className={`w-10 h-20 flex items-end justify-center pb-1`}
                  style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                >
                  <span className={`text-xs truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    #{tag}
                  </span>
                </div>
              ))}
            </div>

            {/* Matrix Rows */}
            {matrix.map((row, i) => (
              <div key={`row-${i}`} className="flex items-center">
                {/* Row Header */}
                <div className="w-20 pr-2 text-right">
                  <span className={`text-xs truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    #{tags[i]}
                  </span>
                </div>
                {/* Cells */}
                {row.map((value, j) => (
                  <motion.div
                    key={`cell-${i}-${j}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (i * tags.length + j) * 0.02 }}
                    className={`
                      w-10 h-10 flex items-center justify-center text-xs font-medium
                      border transition-all cursor-pointer
                      ${getIntensityClass(value, i === j)}
                      ${isDark ? 'border-zinc-700/50' : 'border-zinc-200/50'}
                      ${value > 0 ? (isDark ? 'text-white' : 'text-zinc-800') : (isDark ? 'text-zinc-600' : 'text-zinc-400')}
                      hover:ring-2 hover:ring-pink-500/50
                    `}
                    title={i === j 
                      ? `#${tags[i]}: ${value} strands` 
                      : `#${tags[i]} + #${tags[j]}: ${value} strands together`
                    }
                  >
                    {value > 0 ? value : ''}
                  </motion.div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs">
            <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Less</span>
            <div className="flex gap-1">
              {['bg-zinc-100 dark:bg-zinc-800', 'bg-pink-100 dark:bg-pink-900/30', 'bg-pink-200 dark:bg-pink-700/70', 'bg-pink-300 dark:bg-pink-600', 'bg-pink-400 dark:bg-pink-500'].map((cls, i) => (
                <div key={i} className={`w-4 h-4 rounded-sm ${cls.split(' ')[isDark ? 1 : 0]?.replace('dark:', '') || cls.split(' ')[0]}`} />
              ))}
            </div>
            <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>More</span>
          </div>
        </div>

        {/* Top Pairs List */}
        <div>
          <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            Frequently Paired Tags
          </h4>
          {topPairs.length > 0 ? (
            <div className="space-y-2">
              {topPairs.slice(0, 8).map((pair, i) => (
                <motion.div
                  key={`${pair.tagA}-${pair.tagB}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`
                    flex items-center justify-between p-2 rounded-lg
                    ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isDark ? 'text-pink-400' : 'text-pink-600'}`}>
                      #{pair.tagA}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>+</span>
                    <span className={`text-sm ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                      #{pair.tagB}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      {pair.count}×
                    </span>
                    {/* Strength indicator */}
                    <div
                      className={`w-12 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`}
                    >
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-cyan-500"
                        style={{ width: `${pair.strength * 100}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              No tag pairs found
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// ACTIVITY SECTION
// ============================================================================

function ActivitySection({ data, isDark }: { data: AnalyticsData; isDark: boolean }) {
  return (
    <>
      {/* Activity Chart */}
      <div
        className={`
          rounded-xl border p-6
          ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        `}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Daily Activity
        </h3>
        <AreaChart
          data={data.activity.activityByDay}
          colorScheme="secondary"
          isDark={isDark}
          height={250}
        />
      </div>

      {/* Activity Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Action Types */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            By Action Type
          </h3>
          {data.activity.byActionType.length > 0 ? (
            <BarChart
              data={data.activity.byActionType.map((a) => ({
                label: a.type.charAt(0).toUpperCase() + a.type.slice(1),
                value: a.count,
                color: a.color,
              }))}
              horizontal
              isDark={isDark}
            />
          ) : (
            <EmptyState message="No activity data" isDark={isDark} />
          )}
        </div>

        {/* Activity Summary */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>Total Actions</span>
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {data.activity.totalActions.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>Average Daily</span>
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {data.activity.averageDaily.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>Peak Day</span>
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {data.activity.peakDay.date
                  ? `${new Date(data.activity.peakDay.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })} (${data.activity.peakDay.count})`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>Sessions</span>
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {data.activity.sessionCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reading Stats */}
      <div
        className={`
          rounded-xl border p-6
          ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        `}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Reading Engagement
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {formatDuration(data.engagement.totalReadTime)}
            </p>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Total Time</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {data.engagement.completedStrands}
            </p>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Completed</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {data.engagement.strandsWithProgress}
            </p>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>In Progress</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {data.engagement.averageReadPercentage.toFixed(0)}%
            </p>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Avg Progress</p>
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ message, isDark }: { message: string; isDark: boolean }) {
  return (
    <div className="flex items-center justify-center py-8">
      <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{message}</p>
    </div>
  )
}

export default AnalyticsPage
