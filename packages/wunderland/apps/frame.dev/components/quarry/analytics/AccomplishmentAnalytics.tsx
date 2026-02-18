'use client'

/**
 * AccomplishmentAnalytics Component
 *
 * Analytics tab section for accomplishments showing:
 * - Completion trends over time
 * - Task/subtask/habit breakdown
 * - Project distribution
 * - Streak statistics
 * - Peak productivity times
 *
 * @module components/quarry/analytics/AccomplishmentAnalytics
 */

import { useMemo } from 'react'
import {
  CheckCircle2,
  Repeat,
  Circle,
  Flame,
  Trophy,
  TrendingUp,
  Calendar,
  BarChart3,
  Loader2,
  Target,
  Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  useAccomplishmentStats,
  useCompletionTrend,
  useTaskCompletionStreak,
} from '@/lib/hooks/useAccomplishmentStats'
import type { TimePeriod, TimeSeriesPoint } from '@/lib/accomplishment'
import { AreaChart } from './charts/AreaChart'

// ============================================================================
// TYPES
// ============================================================================

interface AccomplishmentAnalyticsProps {
  period?: TimePeriod
  isDark?: boolean
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  isDark,
}: {
  label: string
  value: string | number
  subtitle?: string
  icon: typeof CheckCircle2
  color: 'emerald' | 'purple' | 'cyan' | 'amber' | 'blue'
  isDark: boolean
}) {
  const colorClasses = {
    emerald: isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-600',
    purple: isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600',
    cyan: isDark ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-100 text-cyan-600',
    amber: isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600',
    blue: isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-xl',
        isDark ? 'bg-zinc-800/50' : 'bg-white border border-zinc-200'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className={cn('text-2xl font-bold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
            {value}
          </p>
          <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>{label}</p>
          {subtitle && (
            <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function TrendChart({
  data,
  isDark,
}: {
  data: TimeSeriesPoint[]
  isDark: boolean
}) {
  // Transform for chart - AreaChart expects { date, count }
  const chartData = useMemo(() => {
    return (data ?? []).map((point) => ({
      date: point.date,
      count: point.count,
    }))
  }, [data])

  if (chartData.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-48', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
        <p className="text-sm">No trend data available</p>
      </div>
    )
  }

  return (
    <div className="h-64">
      <AreaChart
        data={chartData}
        isDark={isDark}
        colorScheme="primary"
      />
    </div>
  )
}

function TypeBreakdownChart({
  tasks,
  subtasks,
  habits,
  isDark,
}: {
  tasks: number
  subtasks: number
  habits: number
  isDark: boolean
}) {
  const data = [
    { label: 'Tasks', value: tasks, color: 'emerald' },
    { label: 'Subtasks', value: subtasks, color: 'cyan' },
    { label: 'Habits', value: habits, color: 'purple' },
  ].filter((d) => d.value > 0)

  const total = tasks + subtasks + habits

  if (total === 0) {
    return (
      <div className={cn('flex items-center justify-center h-24', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
        <p className="text-sm">No completions yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{item.label}</span>
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
              {item.value} ({Math.round((item.value / total) * 100)}%)
            </span>
          </div>
          <div className={cn('h-2 rounded-full overflow-hidden', isDark ? 'bg-zinc-700' : 'bg-zinc-200')}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / total) * 100}%` }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={cn('h-full rounded-full', {
                'bg-emerald-500': item.color === 'emerald',
                'bg-cyan-500': item.color === 'cyan',
                'bg-purple-500': item.color === 'purple',
              })}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function ProjectDistribution({
  projects,
  isDark,
}: {
  projects: Array<{ project: string; count: number }>
  isDark: boolean
}) {
  const safeProjects = projects ?? []

  if (safeProjects.length === 0) {
    return (
      <div className={cn('text-center py-4', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
        <p className="text-sm">No project data</p>
      </div>
    )
  }

  const maxCount = Math.max(...safeProjects.map((p) => p.count))

  return (
    <div className="space-y-2">
      {safeProjects.slice(0, 5).map((item) => (
        <div key={item.project} className="flex items-center gap-3">
          <div className="w-24 truncate text-sm">
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{item.project}</span>
          </div>
          <div className={cn('flex-1 h-6 rounded overflow-hidden', isDark ? 'bg-zinc-700' : 'bg-zinc-200')}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.count / maxCount) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-end pr-2"
            >
              <span className="text-xs text-white font-medium">{item.count}</span>
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StreakCard({
  current,
  longest,
  isActiveToday,
  isDark,
}: {
  current: number
  longest: number
  isActiveToday: boolean
  isDark: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'relative overflow-hidden rounded-xl p-5',
        isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-100 border border-amber-200'
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Flame className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className={cn('text-4xl font-bold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
              {current}
            </span>
            <span className={cn('text-lg', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              day streak
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className={cn('text-sm flex items-center gap-1', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              <Trophy className="w-4 h-4 text-amber-500" />
              Best: {longest} days
            </span>
            {isActiveToday && (
              <span className="text-sm text-emerald-500 flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Active today
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AccomplishmentAnalytics({
  period = 'month',
  isDark = false,
}: AccomplishmentAnalyticsProps) {
  const { stats, loading: statsLoading } = useAccomplishmentStats({ period })
  const { trend, loading: trendLoading, averagePerDay, bestDay } = useCompletionTrend({ days: 30 })
  const { streak, isActiveToday } = useTaskCompletionStreak()

  const loading = statsLoading || trendLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={cn('w-8 h-8 animate-spin', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Streak Banner */}
      {streak && streak.current > 0 && (
        <StreakCard
          current={streak.current}
          longest={streak.longest}
          isActiveToday={isActiveToday}
          isDark={isDark}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Completed"
          value={stats?.totalCompleted || 0}
          icon={CheckCircle2}
          color="emerald"
          isDark={isDark}
        />
        <StatCard
          label="This Week"
          value={stats?.completedThisWeek || 0}
          icon={Calendar}
          color="cyan"
          isDark={isDark}
        />
        <StatCard
          label="Daily Average"
          value={averagePerDay.toFixed(1)}
          icon={TrendingUp}
          color="blue"
          isDark={isDark}
        />
        <StatCard
          label="Best Day"
          value={bestDay?.count || 0}
          subtitle={bestDay?.date ? new Date(bestDay.date).toLocaleDateString() : undefined}
          icon={Target}
          color="amber"
          isDark={isDark}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className={cn('rounded-xl p-5', isDark ? 'bg-zinc-800/50' : 'bg-white border border-zinc-200')}>
          <h3 className={cn('text-lg font-semibold mb-4', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
            Completion Trend (30 days)
          </h3>
          <TrendChart data={trend} isDark={isDark} />
        </div>

        {/* Type Breakdown */}
        <div className={cn('rounded-xl p-5', isDark ? 'bg-zinc-800/50' : 'bg-white border border-zinc-200')}>
          <h3 className={cn('text-lg font-semibold mb-4', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
            Completion Types
          </h3>
          <TypeBreakdownChart
            tasks={stats?.tasksCompleted || 0}
            subtasks={stats?.subtasksCompleted || 0}
            habits={stats?.habitCompletions || 0}
            isDark={isDark}
          />

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Tasks</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Circle className="w-4 h-4 text-cyan-500" />
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Subtasks</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Repeat className="w-4 h-4 text-purple-500" />
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Habits</span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Distribution */}
      {stats && stats.byProject && stats.byProject.length > 0 && (
        <div className={cn('rounded-xl p-5', isDark ? 'bg-zinc-800/50' : 'bg-white border border-zinc-200')}>
          <h3 className={cn('text-lg font-semibold mb-4', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
            By Project
          </h3>
          <ProjectDistribution projects={stats.byProject} isDark={isDark} />
        </div>
      )}

      {/* Empty State */}
      {stats?.totalCompleted === 0 && (
        <div className={cn('text-center py-12 rounded-xl', isDark ? 'bg-zinc-800/30' : 'bg-zinc-50')}>
          <BarChart3 className={cn('w-12 h-12 mx-auto mb-4', isDark ? 'text-zinc-600' : 'text-zinc-300')} />
          <p className={cn('text-lg font-medium mb-2', isDark ? 'text-zinc-300' : 'text-zinc-600')}>
            No accomplishments yet
          </p>
          <p className={cn('text-sm max-w-md mx-auto', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            Complete tasks, subtasks, and habits to see your productivity analytics here.
          </p>
        </div>
      )}
    </div>
  )
}
