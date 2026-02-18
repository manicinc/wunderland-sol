'use client'

/**
 * Learning Progress Dashboard
 * @module codex/ui/LearningProgressDashboard
 *
 * Displays comprehensive learning analytics:
 * - Flashcard review stats
 * - Quiz performance
 * - Streak tracking
 * - Topic mastery visualization
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Flame,
  BookOpen,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Brain,
  CheckCircle2,
  XCircle,
  BarChart3,
  Trophy,
} from 'lucide-react'

export interface LearningStats {
  currentStreak: number
  longestStreak: number
  cardsReviewed: number
  cardsCorrect: number
  quizzesTaken: number
  averageScore: number
  studyTime: number // in minutes
  lastStudied?: string
  topicMastery: Array<{
    topic: string
    mastery: number // 0-100
    cardsReviewed: number
  }>
  weeklyActivity: Array<{
    day: string
    cards: number
  }>
}

interface LearningProgressDashboardProps {
  theme?: string
  onClose?: () => void
}

function formatStudyTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export default function LearningProgressDashboard({ 
  theme = 'light',
  onClose,
}: LearningProgressDashboardProps) {
  const [stats, setStats] = useState<LearningStats | null>(null)
  const [loading, setLoading] = useState(true)
  
  const isDark = theme?.includes('dark')

  // Load stats from localStorage
  useEffect(() => {
    const loadStats = () => {
      try {
        const storedStats = localStorage.getItem('codex-learning-stats')
        if (storedStats) {
          setStats(JSON.parse(storedStats))
        } else {
          // Initialize with default stats
          const defaultStats: LearningStats = {
            currentStreak: 0,
            longestStreak: 0,
            cardsReviewed: 0,
            cardsCorrect: 0,
            quizzesTaken: 0,
            averageScore: 0,
            studyTime: 0,
            topicMastery: [],
            weeklyActivity: [
              { day: 'Mon', cards: 0 },
              { day: 'Tue', cards: 0 },
              { day: 'Wed', cards: 0 },
              { day: 'Thu', cards: 0 },
              { day: 'Fri', cards: 0 },
              { day: 'Sat', cards: 0 },
              { day: 'Sun', cards: 0 },
            ],
          }
          setStats(defaultStats)
          localStorage.setItem('codex-learning-stats', JSON.stringify(defaultStats))
        }
      } catch (err) {
        console.error('Failed to load learning stats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  if (loading || !stats) {
    return (
      <div className={`p-8 rounded-2xl ${isDark ? 'bg-zinc-800' : 'bg-white'}`}>
        <div className="animate-pulse space-y-4">
          <div className={`h-8 rounded ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
          <div className={`h-32 rounded ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
        </div>
      </div>
    )
  }

  const accuracy = stats.cardsReviewed > 0 
    ? Math.round((stats.cardsCorrect / stats.cardsReviewed) * 100) 
    : 0

  const maxWeeklyCards = Math.max(...stats.weeklyActivity.map(d => d.cards), 1)

  return (
    <div className={`p-6 rounded-2xl ${isDark ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900'} shadow-xl`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-500" />
          Learning Progress
        </h2>
        {onClose && (
          <button 
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}`}
          >
            ×
          </button>
        )}
      </div>

      {/* Streak Highlight */}
      <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-gradient-to-r from-amber-900/30 to-orange-900/30' : 'bg-gradient-to-r from-amber-50 to-orange-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Flame className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Current Streak</p>
              <p className="text-2xl font-bold text-amber-500">{stats.currentStreak} days</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-500">Best Streak</p>
            <p className="text-2xl font-bold">{stats.longestStreak} days</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          label="Current Streak"
          value={`${stats.currentStreak} days`}
          subValue={`Best: ${stats.longestStreak}`}
          isDark={isDark}
        />
        <StatCard
          icon={<BookOpen className="w-5 h-5 text-blue-500" />}
          label="Cards Reviewed"
          value={stats.cardsReviewed.toLocaleString()}
          subValue={`${accuracy}% accuracy`}
          isDark={isDark}
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-purple-500" />}
          label="Quizzes Taken"
          value={stats.quizzesTaken.toString()}
          subValue={`Avg: ${stats.averageScore}%`}
          isDark={isDark}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-teal-500" />}
          label="Study Time"
          value={formatStudyTime(stats.studyTime)}
          subValue={stats.lastStudied ? `Last: ${stats.lastStudied}` : 'Start studying!'}
          isDark={isDark}
        />
      </div>

      {/* Weekly Activity */}
      <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-500" />
          This Week
        </h3>
        <div className="flex items-end justify-between gap-2 h-24">
          {stats.weeklyActivity.map((day, idx) => (
            <div key={day.day} className="flex-1 flex flex-col items-center">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(day.cards / maxWeeklyCards) * 100}%` }}
                transition={{ delay: idx * 0.1 }}
                className={`w-full rounded-t-sm ${
                  day.cards > 0 ? 'bg-emerald-500' : isDark ? 'bg-zinc-600' : 'bg-zinc-200'
                }`}
                style={{ minHeight: day.cards > 0 ? 8 : 4 }}
              />
              <span className="text-xs text-zinc-500 mt-1">{day.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Topic Mastery */}
      {stats.topicMastery.length > 0 && (
        <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" />
            Topic Mastery
          </h3>
          <div className="space-y-3">
            {stats.topicMastery.slice(0, 5).map((topic) => (
              <div key={topic.topic}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{topic.topic}</span>
                  <span className="text-zinc-500">{topic.mastery}%</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-600' : 'bg-zinc-200'}`}>
                  <div
                    className={`h-full rounded-full transition-all ${
                      topic.mastery >= 80 ? 'bg-emerald-500' :
                      topic.mastery >= 50 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${topic.mastery}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.cardsReviewed === 0 && (
        <div className="text-center py-8">
          <Trophy className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
          <p className={`text-lg font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            Start Your Learning Journey
          </p>
          <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
            Review flashcards and take quizzes to track your progress
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ 
  icon, 
  label, 
  value, 
  subValue,
  isDark 
}: { 
  icon: React.ReactNode
  label: string
  value: string
  subValue: string
  isDark: boolean 
}) {
  return (
    <div className={`p-3 rounded-xl ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-zinc-500">{subValue}</p>
    </div>
  )
}

/**
 * Utility to update learning stats
 */
export function updateLearningStats(update: Partial<LearningStats>) {
  try {
    const stored = localStorage.getItem('codex-learning-stats')
    const stats = stored ? JSON.parse(stored) : {}
    const merged = { ...stats, ...update }
    localStorage.setItem('codex-learning-stats', JSON.stringify(merged))
    return merged
  } catch (err) {
    console.error('Failed to update learning stats:', err)
    return null
  }
}

/**
 * Record card review
 */
export function recordCardReview(correct: boolean, topic?: string) {
  try {
    const stored = localStorage.getItem('codex-learning-stats')
    const stats: LearningStats = stored ? JSON.parse(stored) : {
      currentStreak: 0,
      longestStreak: 0,
      cardsReviewed: 0,
      cardsCorrect: 0,
      quizzesTaken: 0,
      averageScore: 0,
      studyTime: 0,
      topicMastery: [],
      weeklyActivity: [],
    }
    
    stats.cardsReviewed++
    if (correct) stats.cardsCorrect++
    
    // Update weekly activity
    const dayName = new Date().toLocaleDateString('en', { weekday: 'short' })
    const dayIndex = stats.weeklyActivity.findIndex(d => d.day === dayName)
    if (dayIndex !== -1) {
      stats.weeklyActivity[dayIndex].cards++
    }
    
    // Update topic mastery
    if (topic) {
      const topicIndex = stats.topicMastery.findIndex(t => t.topic === topic)
      if (topicIndex !== -1) {
        const t = stats.topicMastery[topicIndex]
        t.cardsReviewed++
        // Simple mastery calculation
        t.mastery = Math.min(100, t.mastery + (correct ? 5 : -2))
      } else {
        stats.topicMastery.push({
          topic,
          mastery: correct ? 20 : 10,
          cardsReviewed: 1,
        })
      }
    }
    
    localStorage.setItem('codex-learning-stats', JSON.stringify(stats))
    return stats
  } catch (err) {
    console.error('Failed to record card review:', err)
    return null
  }
}

/**
 * Get current learning stats
 */
export function getLearningStats(): LearningStats | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem('codex-learning-stats')
    if (stored) {
      return JSON.parse(stored) as LearningStats
    }
    
    // Return default stats
    return {
      currentStreak: 0,
      longestStreak: 0,
      cardsReviewed: 0,
      cardsCorrect: 0,
      quizzesTaken: 0,
      averageScore: 0,
      studyTime: 0,
      topicMastery: [],
      weeklyActivity: [],
    }
  } catch (err) {
    console.error('Failed to get learning stats:', err)
    return null
  }
}

