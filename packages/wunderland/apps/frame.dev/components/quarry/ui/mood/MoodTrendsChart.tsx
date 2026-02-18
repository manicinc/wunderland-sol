/**
 * MoodTrendsChart - Mood distribution visualization
 * @module components/quarry/ui/MoodTrendsChart
 *
 * A compact chart showing mood distribution over time.
 * Uses character faces as indicators for visual consistency.
 */

'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { MoodCharacter } from './MoodCharacters'
import type { MoodState } from '@/lib/codex/mood'
import type { Reflection } from '@/lib/reflect/types'
import { MOOD_DISPLAY_CONFIG, MOOD_VALUES } from '@/lib/reflect/types'

interface MoodTrendsChartProps {
  /** Array of reflections to analyze */
  reflections: Reflection[]
  /** Number of days to show (7, 14, or 30) */
  days?: 7 | 14 | 30
  /** Compact mode for smaller spaces */
  compact?: boolean
  /** Optional className */
  className?: string
}

interface MoodCount {
  mood: MoodState
  count: number
  percentage: number
  color: string
}

/**
 * MoodTrendsChart - Shows mood distribution with visual indicators
 */
export default function MoodTrendsChart({
  reflections,
  days = 7,
  compact = false,
  className = ''
}: MoodTrendsChartProps) {
  // Calculate date range
  const dateRange = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    return { start, end }
  }, [days])

  // Filter reflections within date range and count moods
  const { moodCounts, dominantMood, avgMoodValue, totalWithMood } = useMemo(() => {
    const counts: Record<MoodState, number> = {} as Record<MoodState, number>
    let moodValueSum = 0
    let moodCount = 0

    // Initialize counts
    MOOD_DISPLAY_CONFIG.forEach(m => {
      counts[m.id] = 0
    })

    // Count moods in date range
    reflections.forEach(r => {
      const date = new Date(r.date)
      if (date >= dateRange.start && date <= dateRange.end) {
        const mood = r.metadata?.mood
        if (mood && counts[mood] !== undefined) {
          counts[mood]++
          moodValueSum += MOOD_VALUES[mood] || 3
          moodCount++
        }
      }
    })

    // Calculate percentages and find dominant
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const moodCountsArray: MoodCount[] = MOOD_DISPLAY_CONFIG
      .map(m => ({
        mood: m.id,
        count: counts[m.id],
        percentage: total > 0 ? (counts[m.id] / total) * 100 : 0,
        color: m.color
      }))
      .filter(m => m.count > 0)
      .sort((a, b) => b.count - a.count)

    const dominant = moodCountsArray.length > 0 ? moodCountsArray[0].mood : undefined
    const avgValue = moodCount > 0 ? moodValueSum / moodCount : 0

    return {
      moodCounts: moodCountsArray,
      dominantMood: dominant,
      avgMoodValue: avgValue,
      totalWithMood: moodCount
    }
  }, [reflections, dateRange])

  // Get mood label for display
  const getMoodLabel = (mood: MoodState): string => {
    return MOOD_DISPLAY_CONFIG.find(m => m.id === mood)?.label || mood
  }

  if (totalWithMood === 0) {
    return (
      <div className={`p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 ${className}`}>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-4">
          No mood data for the last {days} days
        </div>
      </div>
    )
  }

  if (compact) {
    // Compact horizontal bar chart
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Mood Trends
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Last {days} days
          </span>
        </div>

        {/* Stacked bar */}
        <div className="h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
          {moodCounts.map((m, i) => (
            <motion.div
              key={m.mood}
              initial={{ width: 0 }}
              animate={{ width: `${m.percentage}%` }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ backgroundColor: m.color }}
              title={`${getMoodLabel(m.mood)}: ${m.count}`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2">
          {moodCounts.slice(0, 4).map(m => (
            <div key={m.mood} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {getMoodLabel(m.mood)} ({m.count})
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Full chart with character faces
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Mood Distribution
        </span>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          Last {days} days
        </span>
      </div>

      {/* Dominant mood highlight */}
      {dominantMood && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
          <MoodCharacter
            mood={dominantMood}
            size={36}
            animated={true}
            selected={false}
          />
          <div>
            <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Mostly {getMoodLabel(dominantMood)}
            </div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {Math.round((moodCounts.find(m => m.mood === dominantMood)?.percentage || 0))}% of entries
            </div>
          </div>
        </div>
      )}

      {/* Horizontal bar chart */}
      <div className="space-y-2">
        {moodCounts.map((m, i) => (
          <div key={m.mood} className="flex items-center gap-2">
            <MoodCharacter
              mood={m.mood}
              size={20}
              animated={false}
              selected={false}
            />
            <div className="flex-1">
              <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${m.percentage}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: m.color }}
                />
              </div>
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 w-6 text-right">
              {m.count}
            </span>
          </div>
        ))}
      </div>

      {/* Average mood indicator */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
          <span>Average mood score</span>
          <span className="font-medium">
            {avgMoodValue.toFixed(1)}/5
          </span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(avgMoodValue / 5) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * MoodTrendsSparkline - Minimal sparkline version
 */
export function MoodTrendsSparkline({
  reflections,
  days = 7,
  className = ''
}: Omit<MoodTrendsChartProps, 'compact'>) {
  // Get daily mood values
  const dailyMoods = useMemo(() => {
    const result: { date: string; value: number | null }[] = []
    const today = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const reflection = reflections.find(r => r.date === dateStr)
      const mood = reflection?.metadata?.mood
      const value = mood ? MOOD_VALUES[mood] : null

      result.push({ date: dateStr, value })
    }

    return result
  }, [reflections, days])

  const hasData = dailyMoods.some(d => d.value !== null)

  if (!hasData) {
    return null
  }

  // Generate SVG path
  const points = dailyMoods.map((d, i) => ({
    x: (i / (days - 1)) * 100,
    y: d.value !== null ? 100 - (d.value / 5) * 100 : null
  }))

  const pathData = points
    .filter(p => p.y !== null)
    .map((p, i, arr) => {
      if (i === 0) return `M ${p.x} ${p.y}`
      return `L ${p.x} ${p.y}`
    })
    .join(' ')

  return (
    <div className={`${className}`}>
      <svg
        viewBox="0 0 100 40"
        className="w-full h-6"
        preserveAspectRatio="none"
      >
        {/* Background grid lines */}
        {[1, 2, 3, 4].map(i => (
          <line
            key={i}
            x1="0"
            y1={(i / 5) * 40}
            x2="100"
            y2={(i / 5) * 40}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="0.5"
          />
        ))}

        {/* Line path */}
        <motion.path
          d={pathData}
          fill="none"
          stroke="url(#moodGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1 }}
        />

        {/* Dots for each point */}
        {points.map((p, i) => p.y !== null && (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2"
            fill="currentColor"
            className="text-cyan-500"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          />
        ))}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="moodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

/**
 * MoodCalendarMini - Mini calendar showing mood colors
 */
export function MoodCalendarMini({
  reflections,
  className = ''
}: {
  reflections: Reflection[]
  className?: string
}) {
  // Get last 7 days
  const lastWeek = useMemo(() => {
    const days: { date: string; mood?: MoodState; dayOfWeek: string }[] = []
    const today = new Date()
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const reflection = reflections.find(r => r.date === dateStr)

      days.push({
        date: dateStr,
        mood: reflection?.metadata?.mood,
        dayOfWeek: dayNames[date.getDay()]
      })
    }

    return days
  }, [reflections])

  return (
    <div className={`flex gap-1 ${className}`}>
      {lastWeek.map(day => {
        const config = day.mood ? MOOD_DISPLAY_CONFIG.find(m => m.id === day.mood) : null

        return (
          <div key={day.date} className="flex flex-col items-center gap-0.5">
            <span className="text-[8px] text-zinc-400 dark:text-zinc-500">
              {day.dayOfWeek}
            </span>
            {day.mood ? (
              <MoodCharacter
                mood={day.mood}
                size={18}
                animated={false}
                selected={false}
              />
            ) : (
              <div className="w-[18px] h-[18px] rounded-full bg-zinc-200 dark:bg-zinc-700" />
            )}
          </div>
        )
      })}
    </div>
  )
}
