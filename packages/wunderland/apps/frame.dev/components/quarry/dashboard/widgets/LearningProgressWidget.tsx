/**
 * Learning Progress Widget
 *
 * Compact learning stats: streak, mastery, accuracy.
 * @module components/quarry/dashboard/widgets/LearningProgressWidget
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Flame,
  Brain,
  TrendingUp,
  ArrowRight,
  Target,
} from 'lucide-react'
import type { WidgetProps } from '../types'

interface LearningStats {
  currentStreak: number
  longestStreak: number
  cardsReviewed: number
  cardsCorrect: number
  quizzesTaken: number
  averageScore: number
}

export function LearningProgressWidget({
  theme,
  size,
  onNavigate,
  compact = false,
}: WidgetProps) {
  const isDark = theme.includes('dark')
  const [stats, setStats] = useState<LearningStats | null>(null)

  // Load stats from localStorage
  useEffect(() => {
    try {
      const storedStats = localStorage.getItem('codex-learning-stats')
      if (storedStats) {
        setStats(JSON.parse(storedStats))
      } else {
        // Default stats for demo
        setStats({
          currentStreak: 5,
          longestStreak: 12,
          cardsReviewed: 87,
          cardsCorrect: 72,
          quizzesTaken: 4,
          averageScore: 83,
        })
      }
    } catch (e) {
      console.error('[LearningProgressWidget] Failed to load stats:', e)
    }
  }, [])

  if (!stats) {
    return (
      <div className={`text-center py-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Loading stats...</p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame className="w-4 h-4 text-amber-500" />
            <p className={`text-xl font-bold text-amber-500`}>
              {stats.currentStreak}
            </p>
          </div>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Streak</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Brain className="w-4 h-4 text-emerald-500" />
            <p className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
              {stats.cardsReviewed}
            </p>
          </div>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Cards</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Target className="w-4 h-4 text-blue-500" />
            <p className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
              {stats.averageScore}%
            </p>
          </div>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Avg</p>
        </div>
      </div>
    )
  }

  const accuracy = stats.cardsReviewed > 0
    ? Math.round((stats.cardsCorrect / stats.cardsReviewed) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Streak highlight */}
      <div className={`p-3 rounded-lg ${isDark ? 'bg-gradient-to-r from-amber-900/30 to-orange-900/30' : 'bg-gradient-to-r from-amber-50 to-orange-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <span className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
              {stats.currentStreak} Day Streak
            </span>
          </div>
          <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Best: {stats.longestStreak} days
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <motion.div
          className={`p-2.5 rounded-lg ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Brain className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Cards</span>
          </div>
          <p className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
            {stats.cardsReviewed}
          </p>
        </motion.div>

        <motion.div
          className={`p-2.5 rounded-lg ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Accuracy</span>
          </div>
          <p className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
            {accuracy}%
          </p>
        </motion.div>

        <motion.div
          className={`p-2.5 rounded-lg ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Target className={`w-4 h-4 text-purple-500`} />
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Quizzes</span>
          </div>
          <p className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
            {stats.quizzesTaken}
          </p>
        </motion.div>

        <motion.div
          className={`p-2.5 rounded-lg ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className={`w-4 h-4 text-yellow-500`} />
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Avg Score</span>
          </div>
          <p className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
            {stats.averageScore}%
          </p>
        </motion.div>
      </div>

      {/* View full dashboard link */}
      <button
        onClick={() => onNavigate('/codex?view=learning')}
        className={`
          w-full flex items-center justify-center gap-2 py-2 rounded-lg
          text-sm font-medium transition-colors
          ${isDark
            ? 'text-rose-400 hover:bg-rose-500/10'
            : 'text-rose-600 hover:bg-rose-50'
          }
        `}
      >
        Full Dashboard
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

export default LearningProgressWidget
