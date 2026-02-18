/**
 * Mood & Sleep Analytics Component
 * @module codex/ui/MoodSleepAnalytics
 *
 * Visual analytics for mood and sleep tracking data.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Moon,
  Sparkles,
  Calendar,
  BarChart3,
  Info,
} from 'lucide-react'
import { MOOD_CONFIG, SLEEP_CONFIG, type MoodState, type SleepHours } from '@/lib/codex/mood'
import {
  getMoodTrend,
  getSleepTrend,
  getMoodSleepCorrelation,
  getMoodSleepSummary,
  formatDayLabel,
  type MoodTrendPoint,
  type SleepTrendPoint,
} from '@/lib/analytics/moodSleepAnalytics'
import { cn } from '@/lib/utils'

export interface MoodSleepAnalyticsProps {
  /** Theme */
  theme?: 'light' | 'dark'
  /** Number of days to show */
  days?: number
  /** Compact mode */
  compact?: boolean
  /** Additional class names */
  className?: string
}

export function MoodSleepAnalytics({
  theme = 'dark',
  days = 7,
  compact = false,
  className,
}: MoodSleepAnalyticsProps) {
  const [moodTrend, setMoodTrend] = useState<MoodTrendPoint[]>([])
  const [sleepTrend, setSleepTrend] = useState<SleepTrendPoint[]>([])
  const [summary, setSummary] = useState<ReturnType<typeof getMoodSleepSummary> | null>(null)
  const [correlation, setCorrelation] = useState<ReturnType<typeof getMoodSleepCorrelation> | null>(null)

  const isDark = theme === 'dark'

  useEffect(() => {
    setMoodTrend(getMoodTrend(days))
    setSleepTrend(getSleepTrend(days))
    setSummary(getMoodSleepSummary(30))
    setCorrelation(getMoodSleepCorrelation(30))
  }, [days])

  if (!summary) return null

  // Compact mode - just key stats
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-4 p-3 rounded-lg',
          isDark ? 'bg-zinc-800/50' : 'bg-zinc-100',
          className
        )}
      >
        {summary.mostCommonMood && (
          <div className="flex items-center gap-2">
            <span className="text-lg">{MOOD_CONFIG[summary.mostCommonMood].emoji}</span>
            <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              Most common
            </span>
          </div>
        )}
        {summary.streak > 0 && (
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              {summary.streak} day streak
            </span>
          </div>
        )}
        {summary.avgSleepQuality > 0 && (
          <div className="flex items-center gap-1.5">
            <Moon className="w-4 h-4 text-blue-400" />
            <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              {summary.avgSleepQuality.toFixed(1)}/5 avg
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden',
        isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-4 py-3 border-b flex items-center gap-2',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}
      >
        <BarChart3 className="w-4 h-4 text-purple-400" />
        <span className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
          Wellness Insights
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
            label="Streak"
            value={`${summary.streak} days`}
            isDark={isDark}
          />
          <StatCard
            icon={<Calendar className="w-4 h-4 text-green-400" />}
            label="Check-ins"
            value={`${summary.completionRate}%`}
            isDark={isDark}
          />
          <StatCard
            icon={<Moon className="w-4 h-4 text-blue-400" />}
            label="Sleep Avg"
            value={summary.avgSleepQuality > 0 ? `${summary.avgSleepQuality.toFixed(1)}/5` : '-'}
            isDark={isDark}
          />
        </div>

        {/* Mood Trend Chart */}
        <div>
          <label
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium mb-2',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}
          >
            <Sparkles className="w-3 h-3" />
            7-Day Mood Trend
          </label>
          <div className="flex items-end gap-1 h-16">
            {moodTrend.map((point, i) => (
              <div
                key={point.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <motion.div
                  className={cn(
                    'w-full rounded-t transition-all',
                    point.mood
                      ? 'bg-gradient-to-t from-purple-500/50 to-purple-400/30'
                      : isDark
                        ? 'bg-zinc-800'
                        : 'bg-zinc-200'
                  )}
                  initial={{ height: 0 }}
                  animate={{ height: point.moodValue ? `${(point.moodValue / 6) * 100}%` : '10%' }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                />
                <span
                  className={cn(
                    'text-[9px]',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  {formatDayLabel(point.date).slice(0, 2)}
                </span>
              </div>
            ))}
          </div>
          {summary.mostCommonMood && (
            <div
              className={cn(
                'flex items-center gap-2 mt-2 text-xs',
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              )}
            >
              <span className="text-lg">{MOOD_CONFIG[summary.mostCommonMood].emoji}</span>
              <span>
                Most common: <strong>{MOOD_CONFIG[summary.mostCommonMood].label}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Sleep Trend Chart */}
        <div>
          <label
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium mb-2',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}
          >
            <Moon className="w-3 h-3" />
            7-Day Sleep Quality
          </label>
          <div className="flex items-end gap-1 h-16">
            {sleepTrend.map((point, i) => (
              <div
                key={point.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <motion.div
                  className={cn(
                    'w-full rounded-t transition-all',
                    point.sleepHours
                      ? 'bg-gradient-to-t from-blue-500/50 to-blue-400/30'
                      : isDark
                        ? 'bg-zinc-800'
                        : 'bg-zinc-200'
                  )}
                  initial={{ height: 0 }}
                  animate={{ height: point.qualityValue ? `${(point.qualityValue / 5) * 100}%` : '10%' }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                />
                <span
                  className={cn(
                    'text-[9px]',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  {formatDayLabel(point.date).slice(0, 2)}
                </span>
              </div>
            ))}
          </div>
          {summary.mostCommonSleep && (
            <div
              className={cn(
                'flex items-center gap-2 mt-2 text-xs',
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              )}
            >
              <span className="text-lg">{SLEEP_CONFIG[summary.mostCommonSleep].emoji}</span>
              <span>
                Most common: <strong>{SLEEP_CONFIG[summary.mostCommonSleep].label}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Correlation Insight */}
        {correlation && (
          <div
            className={cn(
              'p-3 rounded-lg flex items-start gap-2',
              isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
            )}
          >
            <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p
                className={cn(
                  'text-xs',
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                )}
              >
                {correlation.insight}
              </p>
              {correlation.bestMoodWithSleep && (
                <p
                  className={cn(
                    'text-xs',
                    isDark ? 'text-zinc-500' : 'text-zinc-500'
                  )}
                >
                  Best combo: {MOOD_CONFIG[correlation.bestMoodWithSleep.mood].emoji}{' '}
                  {MOOD_CONFIG[correlation.bestMoodWithSleep.mood].label} with{' '}
                  {SLEEP_CONFIG[correlation.bestMoodWithSleep.sleep].label} sleep
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  isDark,
}: {
  icon: React.ReactNode
  label: string
  value: string
  isDark: boolean
}) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg text-center',
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
      )}
    >
      <div className="flex justify-center mb-1">{icon}</div>
      <div
        className={cn(
          'text-sm font-semibold',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          'text-[10px]',
          isDark ? 'text-zinc-500' : 'text-zinc-500'
        )}
      >
        {label}
      </div>
    </div>
  )
}

export default MoodSleepAnalytics
