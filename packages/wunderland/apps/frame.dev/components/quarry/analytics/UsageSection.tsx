/**
 * Usage Section Component
 * @module components/quarry/analytics/UsageSection
 *
 * Displays usage analytics including features, sessions, and time patterns.
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Clock,
  BarChart3,
  Calendar,
  Activity,
  Loader2,
  Eye,
  Timer,
  Zap,
  CalendarDays,
} from 'lucide-react'
import { getUsageMetrics } from '@/lib/analytics/usageAnalyticsService'
import type { TimeRange, UsageMetrics } from '@/lib/analytics/types'
import { BarChart } from './charts/BarChart'
import { AreaChart } from './charts/AreaChart'
import { HeatmapCalendar, type HeatmapDataPoint } from './charts/HeatmapCalendar'

// ============================================================================
// TYPES
// ============================================================================

interface UsageSectionProps {
  isDark: boolean
  timeRange: TimeRange
}

// ============================================================================
// COMPONENT
// ============================================================================

export function UsageSection({ isDark, timeRange }: UsageSectionProps) {
  const [data, setData] = useState<UsageMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const metrics = await getUsageMetrics(timeRange)
        setData(metrics)
      } catch (error) {
        console.error('[UsageSection] Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [timeRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
      </div>
    )
  }

  if (!data || data.totalSessions === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className={`w-10 h-10 mb-3 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          No usage data available yet.
          <br />
          Usage patterns will appear as you use the app.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Sessions"
          value={data.totalSessions}
          icon={<Activity className="w-4 h-4" />}
          isDark={isDark}
        />
        <StatCard
          label="Avg Duration"
          value={formatDuration(data.averageSessionDurationMs)}
          icon={<Timer className="w-4 h-4" />}
          isDark={isDark}
        />
        <StatCard
          label="Peak Hour"
          value={`${data.peakUsageTime.hour}:00`}
          icon={<Clock className="w-4 h-4" />}
          isDark={isDark}
        />
        <StatCard
          label="Top Feature"
          value={data.topFeatures[0]?.feature || 'N/A'}
          icon={<Zap className="w-4 h-4" />}
          isDark={isDark}
        />
      </div>

      {/* Sessions Over Time */}
      <div
        className={`
          rounded-xl border p-6
          ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        `}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Sessions Over Time
        </h3>
        <AreaChart
          data={data.sessionsOverTime.map((s) => ({ date: s.date, count: s.count }))}
          colorScheme="tertiary"
          isDark={isDark}
          height={250}
        />
      </div>

      {/* Session Activity Heatmap */}
      <SessionActivityHeatmap data={data} isDark={isDark} />

      {/* Features and Views */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Features */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Feature Usage
            </h3>
          </div>
          {data.topFeatures.length > 0 ? (
            <BarChart
              data={data.topFeatures.map((f) => ({
                label: formatFeatureName(f.feature),
                value: f.count,
              }))}
              horizontal
              colorScheme="mixed"
              isDark={isDark}
            />
          ) : (
            <EmptyState message="No feature data" isDark={isDark} />
          )}
        </div>

        {/* View Distribution */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <Eye className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Page Views
            </h3>
          </div>
          {data.viewDistribution.length > 0 ? (
            <BarChart
              data={data.viewDistribution.map((v) => ({
                label: formatViewName(v.view),
                value: v.visits,
              }))}
              horizontal
              colorScheme="secondary"
              isDark={isDark}
            />
          ) : (
            <EmptyState message="No view data" isDark={isDark} />
          )}
        </div>
      </div>

      {/* Time Patterns */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Usage by Hour */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Activity by Hour
            </h3>
          </div>
          <HourlyHeatmap data={data.usageByHour} isDark={isDark} />
        </div>

        {/* Usage by Day */}
        <div
          className={`
            rounded-xl border p-6
            ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
          `}
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Activity by Day
            </h3>
          </div>
          <BarChart
            data={data.usageByDayOfWeek.map((d) => ({
              label: d.day.slice(0, 3),
              value: d.count,
            }))}
            colorScheme="primary"
            isDark={isDark}
          />
        </div>
      </div>

      {/* Session Length Distribution */}
      <div
        className={`
          rounded-xl border p-6
          ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        `}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Session Length Distribution
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {data.sessionLengthDistribution.map((bucket) => (
            <div
              key={bucket.bucket}
              className={`
                text-center p-4 rounded-lg
                ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}
              `}
            >
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {bucket.count}
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {bucket.bucket}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  isDark: boolean
}

function StatCard({ label, value, icon, isDark }: StatCardProps) {
  return (
    <div
      className={`
        rounded-xl border p-4
        ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
      `}
    >
      <div className={`flex items-center gap-2 mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
        {value}
      </p>
    </div>
  )
}

interface HourlyHeatmapProps {
  data: { hour: number; count: number }[]
  isDark: boolean
}

function HourlyHeatmap({ data, isDark }: HourlyHeatmapProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="grid grid-cols-12 gap-1">
      {data.map((item) => {
        const intensity = item.count / maxCount
        const bgColor = isDark
          ? `rgba(139, 92, 246, ${0.1 + intensity * 0.7})`
          : `rgba(139, 92, 246, ${0.1 + intensity * 0.6})`

        return (
          <div
            key={item.hour}
            className="aspect-square rounded-sm flex items-center justify-center group relative"
            style={{ backgroundColor: bgColor }}
            title={`${item.hour}:00 - ${item.count} actions`}
          >
            <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {item.hour}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function EmptyState({ message, isDark }: { message: string; isDark: boolean }) {
  return (
    <div className="flex items-center justify-center py-8">
      <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{message}</p>
    </div>
  )
}

/**
 * Session Activity Heatmap - GitHub-style calendar visualization
 */
function SessionActivityHeatmap({ data, isDark }: { data: UsageMetrics; isDark: boolean }) {
  // Transform sessionsOverTime data into HeatmapDataPoint format
  const heatmapData = useMemo((): HeatmapDataPoint[] => {
    if (!data.sessionsOverTime || data.sessionsOverTime.length === 0) {
      return []
    }

    return data.sessionsOverTime.map(session => ({
      date: session.date,
      value: session.count,
      label: `${session.count} session${session.count !== 1 ? 's' : ''}`,
    }))
  }, [data.sessionsOverTime])

  if (heatmapData.length === 0) {
    return null
  }

  return (
    <div
      className={`
        rounded-xl border p-6
        ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
      `}
    >
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Session Activity Calendar
        </h3>
      </div>
      <HeatmapCalendar
        data={heatmapData}
        weeks={26}
        colorScheme="emerald"
        isDark={isDark}
        showDayLabels
        showMonthLabels
        tooltipFormatter={(point) => `${point.date}: ${point.label || `${point.value} sessions`}`}
      />
    </div>
  )
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`
  const hours = Math.floor(ms / 3600000)
  const mins = Math.round((ms % 3600000) / 60000)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function formatFeatureName(feature: string): string {
  return feature
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatViewName(view: string): string {
  if (view.startsWith('/')) {
    const parts = view.split('/')
    return parts[parts.length - 1] || parts[parts.length - 2] || view
  }
  return view
}

export default UsageSection
