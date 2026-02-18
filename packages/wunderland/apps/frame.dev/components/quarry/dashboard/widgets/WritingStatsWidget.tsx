/**
 * Writing Stats Widget
 *
 * Shows writing statistics: words, strands, streaks.
 * @module components/quarry/dashboard/widgets/WritingStatsWidget
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  PenLine,
  FileText,
  Flame,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import { getRecentlyRead, getDatabaseStats, type ReadingProgressRecord } from '@/lib/codexDatabase'
import type { WidgetProps } from '../types'

interface DailyStats {
  date: string
  words: number
  strands: number
}

interface WritingStats {
  totalWords: number
  totalStrands: number
  currentStreak: number
  longestStreak: number
  last7Days: DailyStats[]
}

export function WritingStatsWidget({
  theme,
  size,
  onNavigate,
  compact = false,
}: WidgetProps) {
  const isDark = theme.includes('dark')
  const [stats, setStats] = useState<WritingStats>({
    totalWords: 0,
    totalStrands: 0,
    currentStreak: 0,
    longestStreak: 0,
    last7Days: [],
  })

  // Load stats from database
  useEffect(() => {
    async function loadStats() {
      try {
        const [recentlyRead, dbStats] = await Promise.all([
          getRecentlyRead(100), // Get more for streak calculation
          getDatabaseStats(),
        ])

        const dailyActivity = new Map<string, DailyStats>()

        // Track daily activity from reading history
        recentlyRead.forEach((record) => {
          const date = record.lastReadAt.split('T')[0]
          const existing = dailyActivity.get(date) || { date, words: 0, strands: 0 }
          existing.strands++
          existing.words += 150 // Estimate words per strand
          dailyActivity.set(date, existing)
        })

        // Calculate streak
        const today = new Date()
        let currentStreak = 0
        let longestStreak = 0
        let tempStreak = 0

        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(today)
          checkDate.setDate(checkDate.getDate() - i)
          const dateStr = checkDate.toISOString().split('T')[0]

          if (dailyActivity.has(dateStr)) {
            tempStreak++
            if (i === 0 || (currentStreak > 0 && i < 7)) {
              currentStreak = tempStreak
            }
          } else {
            if (tempStreak > longestStreak) {
              longestStreak = tempStreak
            }
            tempStreak = 0
            if (i === 0) currentStreak = 0
          }
        }
        if (tempStreak > longestStreak) longestStreak = tempStreak

        // Get last 7 days for chart
        const last7Days: DailyStats[] = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today)
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          last7Days.push(dailyActivity.get(dateStr) || { date: dateStr, words: 0, strands: 0 })
        }

        setStats({
          totalWords: dbStats.embeddings * 150, // Rough estimate
          totalStrands: dbStats.embeddings,
          currentStreak,
          longestStreak,
          last7Days,
        })
      } catch (e) {
        console.error('[WritingStatsWidget] Failed to load stats:', e)
      }
    }

    loadStats()
  }, [])

  // Max for chart scaling
  const maxWords = Math.max(...stats.last7Days.map((d) => d.words), 1)

  if (compact) {
    return (
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className={`text-2xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
            {stats.totalWords.toLocaleString()}
          </p>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Words</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
            {stats.totalStrands}
          </p>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Strands</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold text-amber-500`}>
            {stats.currentStreak}
          </p>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Streak</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          className={`p-3 rounded-lg ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <PenLine className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Total Words
            </span>
          </div>
          <p className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
            {stats.totalWords.toLocaleString()}
          </p>
        </motion.div>

        <motion.div
          className={`p-3 rounded-lg ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Strands
            </span>
          </div>
          <p className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
            {stats.totalStrands}
          </p>
        </motion.div>

        <motion.div
          className={`p-3 rounded-lg ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Flame className={`w-4 h-4 text-amber-500`} />
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Current Streak
            </span>
          </div>
          <p className={`text-xl font-bold text-amber-500`}>
            {stats.currentStreak} days
          </p>
        </motion.div>

        <motion.div
          className={`p-3 rounded-lg ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Best Streak
            </span>
          </div>
          <p className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
            {stats.longestStreak} days
          </p>
        </motion.div>
      </div>

      {/* 7-day activity chart */}
      <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-700/30' : 'bg-zinc-50'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
          <span className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
            Last 7 Days
          </span>
        </div>
        <div className="flex items-end gap-1 h-16">
          {stats.last7Days.map((day, index) => {
            const height = (day.words / maxWords) * 100
            const dayLabel = new Date(day.date).toLocaleDateString('en', { weekday: 'short' }).charAt(0)
            const isToday = day.date === new Date().toISOString().split('T')[0]

            return (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <motion.div
                  className={`
                    w-full rounded-t-sm
                    ${isToday
                      ? 'bg-rose-500'
                      : day.words > 0
                        ? isDark ? 'bg-zinc-500' : 'bg-zinc-300'
                        : isDark ? 'bg-zinc-700' : 'bg-zinc-200'
                    }
                  `}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 4)}%` }}
                  transition={{ delay: index * 0.05, type: 'spring', stiffness: 100 }}
                />
                <span className={`text-[10px] mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {dayLabel}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default WritingStatsWidget
