/**
 * Learning Analytics Section
 * @module components/quarry/analytics/LearningAnalyticsSection
 *
 * Comprehensive learning analytics dashboard showing:
 * - Quiz performance over time
 * - Flashcard retention curves
 * - Topic mastery heatmap
 * - Weak areas identification
 * - Daily/weekly learning activity
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  Flame,
  Clock,
  BookOpen,
  ListChecks,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Calendar,
  CalendarClock,
  Zap,
  Award,
  RefreshCw,
  Info,
} from 'lucide-react'
// StatCard imported locally below for learning-specific props
import { AreaChart } from './charts/AreaChart'
import { BarChart } from './charts/BarChart'
import { flashcardStorage } from '@/lib/storage'
import type { Flashcard } from '@/types/openstrand'

// ============================================================================
// TYPES
// ============================================================================

export interface QuizAttempt {
  id: string
  date: string
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpent: number // seconds
  strandId?: string
  strandTitle?: string
  questionTypes: {
    multipleChoice: { correct: number; total: number }
    trueFalse: { correct: number; total: number }
    fillBlank: { correct: number; total: number }
  }
}

export interface FlashcardSession {
  id: string
  date: string
  cardsReviewed: number
  cardsCorrect: number
  newCards: number
  dueCards: number
  timeSpent: number // seconds
  ratings: {
    again: number
    hard: number
    good: number
    easy: number
  }
}

export interface TopicPerformance {
  topic: string
  strandId?: string
  quizAccuracy: number
  flashcardRetention: number
  totalQuestions: number
  totalCards: number
  lastStudied?: string
  mastery: number // 0-100
  trend: 'improving' | 'stable' | 'declining'
}

export interface LearningAnalyticsData {
  // Summary stats
  totalQuizzesTaken: number
  totalFlashcardSessions: number
  totalStudyTime: number // minutes
  currentStreak: number
  longestStreak: number
  averageQuizScore: number
  averageRetention: number
  
  // Time series data
  quizHistory: QuizAttempt[]
  flashcardHistory: FlashcardSession[]
  
  // Topic breakdown
  topicPerformance: TopicPerformance[]
  
  // Weekly activity (last 4 weeks)
  weeklyActivity: Array<{
    week: string
    quizzes: number
    flashcards: number
    studyMinutes: number
  }>
  
  // Daily heatmap (last 30 days)
  dailyActivity: Array<{
    date: string
    intensity: number // 0-4 (like GitHub contributions)
    quizzes: number
    flashcards: number
  }>
}

interface LearningAnalyticsSectionProps {
  theme?: string
  timeRange?: 'week' | 'month' | 'quarter' | 'year'
}

// ============================================================================
// DATA LOADING
// ============================================================================

const STORAGE_KEY = 'quarry-learning-analytics'

function getDefaultAnalytics(): LearningAnalyticsData {
  return {
    totalQuizzesTaken: 0,
    totalFlashcardSessions: 0,
    totalStudyTime: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageQuizScore: 0,
    averageRetention: 0,
    quizHistory: [],
    flashcardHistory: [],
    topicPerformance: [],
    weeklyActivity: [],
    dailyActivity: [],
  }
}

async function loadLearningAnalytics(): Promise<LearningAnalyticsData> {
  try {
    // Try to load from localStorage first
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
    
    // Also check the legacy learning stats
    const legacyStats = localStorage.getItem('codex-learning-stats')
    if (legacyStats) {
      const legacy = JSON.parse(legacyStats)
      
      // Convert legacy format to new format
      const data = getDefaultAnalytics()
      data.currentStreak = legacy.currentStreak || 0
      data.longestStreak = legacy.longestStreak || 0
      data.totalStudyTime = legacy.studyTime || 0
      data.averageQuizScore = legacy.averageScore || 0
      data.totalQuizzesTaken = legacy.quizzesTaken || 0
      data.averageRetention = legacy.cardsReviewed > 0 
        ? Math.round((legacy.cardsCorrect / legacy.cardsReviewed) * 100)
        : 0
      
      // Convert topic mastery
      if (legacy.topicMastery) {
        data.topicPerformance = legacy.topicMastery.map((t: any) => ({
          topic: t.topic,
          quizAccuracy: t.mastery,
          flashcardRetention: t.mastery,
          totalQuestions: 0,
          totalCards: t.cardsReviewed || 0,
          mastery: t.mastery,
          trend: 'stable' as const,
        }))
      }
      
      // Convert weekly activity
      if (legacy.weeklyActivity) {
        data.weeklyActivity = [{
          week: 'This Week',
          quizzes: 0,
          flashcards: legacy.weeklyActivity.reduce((sum: number, d: any) => sum + d.cards, 0),
          studyMinutes: 0,
        }]
      }
      
      return data
    }
    
    return getDefaultAnalytics()
  } catch (err) {
    console.error('[LearningAnalytics] Failed to load:', err)
    return getDefaultAnalytics()
  }
}

function saveLearningAnalytics(data: LearningAnalyticsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('[LearningAnalytics] Failed to save:', err)
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function getIntensityLevel(count: number): number {
  if (count === 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  if (count <= 10) return 3
  return 4
}

function getTrendIcon(trend: 'improving' | 'stable' | 'declining') {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="w-4 h-4 text-emerald-500" />
    case 'declining':
      return <TrendingDown className="w-4 h-4 text-red-500" />
    default:
      return <span className="w-4 h-4 text-zinc-400">—</span>
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Local StatCard for learning analytics (accepts ReactNode icons)
function LearningStatCard({
  icon,
  label,
  value,
  subtext,
  isDark,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtext?: string
  isDark: boolean
}) {
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
      <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
        {value}
      </div>
      {subtext && (
        <div className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {subtext}
        </div>
      )}
    </div>
  )
}


function WeakTopicsCard({ 
  topics, 
  isDark 
}: { 
  topics: TopicPerformance[]
  isDark: boolean 
}) {
  const weakTopics = useMemo(() => 
    topics
      .filter(t => t.mastery < 60 || t.trend === 'declining')
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 5),
    [topics]
  )

  if (weakTopics.length === 0) {
    return (
      <div className={`p-4 rounded-xl ${isDark ? 'bg-emerald-900/20 border border-emerald-800/50' : 'bg-emerald-50 border border-emerald-200'}`}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          <div>
            <p className={`font-medium ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
              All topics on track!
            </p>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              No weak areas detected
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-xl ${isDark ? 'bg-amber-900/20 border border-amber-800/50' : 'bg-amber-50 border border-amber-200'}`}>
      <h4 className={`font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
        <AlertTriangle className="w-4 h-4" />
        Areas Needing Attention
      </h4>
      <div className="space-y-2">
        {weakTopics.map((topic) => (
          <div 
            key={topic.topic}
            className={`flex items-center justify-between p-2 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-white/50'}`}
          >
            <div className="flex items-center gap-2">
              {getTrendIcon(topic.trend)}
              <span className={`text-sm ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                {topic.topic}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${
                topic.mastery < 30 ? 'text-red-500' : 
                topic.mastery < 50 ? 'text-amber-500' : 
                'text-zinc-400'
              }`}>
                {topic.mastery}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityHeatmap({ 
  activity, 
  isDark 
}: { 
  activity: LearningAnalyticsData['dailyActivity']
  isDark: boolean 
}) {
  // Generate last 28 days if no data
  const days = useMemo(() => {
    if (activity.length > 0) return activity.slice(-28)
    
    const result = []
    for (let i = 27; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      result.push({
        date: date.toISOString().split('T')[0],
        intensity: 0,
        quizzes: 0,
        flashcards: 0,
      })
    }
    return result
  }, [activity])

  const intensityColors = isDark
    ? ['bg-zinc-800', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400']
    : ['bg-zinc-100', 'bg-emerald-100', 'bg-emerald-300', 'bg-emerald-500', 'bg-emerald-600']

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Study Activity
        </h4>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <span>Less</span>
          {intensityColors.map((color, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
          ))}
          <span>More</span>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => (
          <motion.div
            key={day.date}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.01 }}
            className={`w-full aspect-square rounded-sm ${intensityColors[day.intensity]} cursor-pointer`}
            title={`${day.date}: ${day.quizzes + day.flashcards} activities`}
          />
        ))}
      </div>
      
      <div className="flex justify-between text-xs text-zinc-500">
        <span>4 weeks ago</span>
        <span>Today</span>
      </div>
    </div>
  )
}

// ============================================================================
// FSRS FORECAST CHART
// ============================================================================

interface FSRSForecastData {
  date: string
  dueCards: number
  newCards: number
  overdue: number
}

/**
 * Load all flashcards to calculate FSRS forecast
 */
async function loadFlashcardsForForecast(): Promise<Flashcard[]> {
  try {
    if (typeof window === 'undefined') return []
    const FLASHCARDS_KEY = 'openstrand_flashcard_data'
    const allCards = await flashcardStorage.get<Record<string, Flashcard[]>>(FLASHCARDS_KEY, {})
    return Object.values(allCards).flat()
  } catch (err) {
    console.error('[FSRS Forecast] Failed to load cards:', err)
    return []
  }
}

/**
 * Calculate predicted review load for the next N days
 */
function calculateForecast(cards: Flashcard[], daysAhead: number = 14): FSRSForecastData[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const forecast: FSRSForecastData[] = []
  
  for (let i = 0; i < daysAhead; i++) {
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + i)
    const dateStr = targetDate.toISOString().split('T')[0]
    
    let dueCards = 0
    let newCards = 0
    let overdue = 0
    
    for (const card of cards) {
      if (!card.fsrs?.nextReview) {
        // New cards (no review scheduled yet)
        if (i === 0) newCards++
        continue
      }
      
      const nextReview = new Date(card.fsrs.nextReview)
      nextReview.setHours(0, 0, 0, 0)
      
      if (i === 0) {
        // Today: check for overdue
        if (nextReview < today) {
          overdue++
        } else if (nextReview.getTime() === today.getTime()) {
          dueCards++
        }
      } else {
        // Future days
        if (nextReview.getTime() === targetDate.getTime()) {
          dueCards++
        }
      }
    }
    
    forecast.push({
      date: dateStr,
      dueCards,
      newCards: i === 0 ? newCards : 0,
      overdue: i === 0 ? overdue : 0,
    })
  }
  
  return forecast
}

/**
 * FSRS Forecast Chart - Shows predicted review workload
 */
function FSRSForecastChart({
  isDark,
}: {
  isDark: boolean
}) {
  const [forecast, setForecast] = useState<FSRSForecastData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCards, setTotalCards] = useState(0)

  useEffect(() => {
    const loadForecast = async () => {
      setLoading(true)
      try {
        const cards = await loadFlashcardsForForecast()
        setTotalCards(cards.length)
        const forecastData = calculateForecast(cards, 14)
        setForecast(forecastData)
      } catch (err) {
        console.error('[FSRS Forecast] Error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadForecast()
  }, [])

  const todayStats = forecast[0]
  const totalDueThisWeek = forecast.slice(0, 7).reduce((sum, d) => sum + d.dueCards, 0)
  const peakDay = forecast.reduce((max, d) => d.dueCards > max.dueCards ? d : max, { date: '', dueCards: 0, newCards: 0, overdue: 0 })

  if (loading) {
    return (
      <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="w-4 h-4 text-cyan-500 animate-pulse" />
          <span className={`text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Loading review forecast...
          </span>
        </div>
        <div className="h-32 bg-zinc-200/50 dark:bg-zinc-700/50 rounded animate-pulse" />
      </div>
    )
  }

  if (totalCards === 0) {
    return (
      <div className={`p-6 text-center rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
        <CalendarClock className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Create flashcards to see your review forecast
        </p>
      </div>
    )
  }

  const chartData = forecast.map((d, i) => ({
    label: i === 0 ? 'Today' : 
           i === 1 ? 'Tomorrow' :
           new Date(d.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric' }),
    value: d.dueCards + d.overdue + d.newCards,
  }))

  return (
    <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className={`text-sm font-medium flex items-center gap-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          <CalendarClock className="w-4 h-4 text-cyan-500" />
          Review Forecast
        </h4>
        <div className="flex items-center gap-1" title="Predicted cards due for review based on FSRS scheduling">
          <Info className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        </div>
      </div>

      {/* Today's Summary */}
      {todayStats && (todayStats.dueCards > 0 || todayStats.overdue > 0 || todayStats.newCards > 0) && (
        <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-zinc-700/50' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium uppercase ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Today
            </span>
            <div className="flex items-center gap-3 text-xs">
              {todayStats.overdue > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {todayStats.overdue} overdue
                </span>
              )}
              {todayStats.dueCards > 0 && (
                <span className={`flex items-center gap-1 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  {todayStats.dueCards} due
                </span>
              )}
              {todayStats.newCards > 0 && (
                <span className={`flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {todayStats.newCards} new
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Forecast Chart */}
      <BarChart
        data={chartData}
        height={120}
        colorScheme="secondary"
        isDark={isDark}
      />

      {/* Week Summary */}
      <div className={`mt-4 pt-3 border-t ${isDark ? 'border-zinc-700/50' : 'border-zinc-200'}`}>
        <div className="flex items-center justify-between text-xs">
          <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
            Next 7 days: <span className="font-medium">{totalDueThisWeek} cards</span>
          </span>
          {peakDay.dueCards > 0 && (
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
              Peak: {new Date(peakDay.date).toLocaleDateString('en', { weekday: 'short' })} ({peakDay.dueCards})
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function QuizPerformanceChart({
  history,
  isDark,
}: {
  history: QuizAttempt[]
  isDark: boolean
}) {
  const chartData = useMemo(() =>
    history.slice(-10).map(attempt => ({
      date: new Date(attempt.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      count: attempt.score,
    })),
    [history]
  )

  if (chartData.length === 0) {
    return (
      <div className={`p-8 text-center rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
        <ListChecks className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Take quizzes to see your performance trend
        </p>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
      <h4 className={`text-sm font-medium mb-4 flex items-center gap-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
        <ListChecks className="w-4 h-4 text-purple-500" />
        Quiz Performance Trend
      </h4>
      <AreaChart
        data={chartData}
        height={150}
        colorScheme="tertiary"
        isDark={isDark}
      />
    </div>
  )
}

function TopicMasteryGrid({
  topics,
  isDark,
}: {
  topics: TopicPerformance[]
  isDark: boolean
}) {
  const sortedTopics = useMemo(() => 
    [...topics].sort((a, b) => b.mastery - a.mastery).slice(0, 8),
    [topics]
  )

  if (sortedTopics.length === 0) {
    return (
      <div className={`p-8 text-center rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
        <Brain className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Study topics to track your mastery
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sortedTopics.map((topic) => (
        <div key={topic.topic}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {getTrendIcon(topic.trend)}
              <span className={`text-sm ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                {topic.topic}
              </span>
            </div>
            <span className={`text-sm font-medium ${
              topic.mastery >= 80 ? 'text-emerald-500' :
              topic.mastery >= 50 ? 'text-amber-500' :
              'text-red-500'
            }`}>
              {topic.mastery}%
            </span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${topic.mastery}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                topic.mastery >= 80 ? 'bg-emerald-500' :
                topic.mastery >= 50 ? 'bg-amber-500' :
                'bg-red-500'
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LearningAnalyticsSection({ 
  theme = 'light',
}: LearningAnalyticsSectionProps) {
  const isDark = theme.includes('dark')
  const [data, setData] = useState<LearningAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    
    try {
      const analytics = await loadLearningAnalytics()
      setData(analytics)
    } catch (err) {
      console.error('[LearningAnalytics] Failed to load:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className={`p-8 text-center rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
        <Brain className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
        <p className={`text-lg font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          No learning data yet
        </p>
        <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
          Start studying with flashcards and quizzes to see your analytics
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          <GraduationCap className="w-6 h-6 text-emerald-500" />
          Learning Analytics
        </h2>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className={`p-2 rounded-lg transition-colors ${
            isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''} ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <LearningStatCard icon={<Flame className="w-5 h-5 text-amber-500" />}
          label="Current Streak"
          value={`${data.currentStreak} days`}
          subtext={`Best: ${data.longestStreak} days`}
          isDark={isDark}
        />
        <LearningStatCard icon={<ListChecks className="w-5 h-5 text-purple-500" />}
          label="Quiz Average"
          value={`${data.averageQuizScore}%`}
          subtext={`${data.totalQuizzesTaken} quizzes taken`}
          isDark={isDark}
        />
        <LearningStatCard icon={<GraduationCap className="w-5 h-5 text-emerald-500" />}
          label="Card Retention"
          value={`${data.averageRetention}%`}
          subtext={`${data.totalFlashcardSessions} sessions`}
          isDark={isDark}
        />
        <LearningStatCard icon={<Clock className="w-5 h-5 text-blue-500" />}
          label="Study Time"
          value={formatTime(data.totalStudyTime)}
          subtext="Total time learning"
          isDark={isDark}
        />
      </div>

      {/* FSRS Forecast - Full Width */}
      <FSRSForecastChart isDark={isDark} />

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Quiz Performance Trend */}
          <QuizPerformanceChart history={data.quizHistory} isDark={isDark} />
          
          {/* Topic Mastery */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
            <h4 className={`text-sm font-medium mb-4 flex items-center gap-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              <Brain className="w-4 h-4 text-purple-500" />
              Topic Mastery
            </h4>
            <TopicMasteryGrid topics={data.topicPerformance} isDark={isDark} />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Activity Heatmap */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
            <ActivityHeatmap activity={data.dailyActivity} isDark={isDark} />
          </div>
          
          {/* Weak Topics */}
          <WeakTopicsCard topics={data.topicPerformance} isDark={isDark} />
          
          {/* Weekly Summary */}
          {data.weeklyActivity.length > 0 && (
            <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
              <h4 className={`text-sm font-medium mb-4 flex items-center gap-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                <Calendar className="w-4 h-4 text-blue-500" />
                Weekly Activity
              </h4>
              <BarChart
                data={data.weeklyActivity.map(w => ({
                  label: w.week,
                  value: w.quizzes + w.flashcards,
                }))}
                height={120}
                colorScheme="primary"
                isDark={isDark}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export { loadLearningAnalytics, saveLearningAnalytics, getDefaultAnalytics }

/**
 * Record a quiz attempt for analytics
 */
export function recordQuizAttempt(attempt: Omit<QuizAttempt, 'id'>): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const data: LearningAnalyticsData = stored 
      ? JSON.parse(stored) 
      : getDefaultAnalytics()
    
    const newAttempt: QuizAttempt = {
      ...attempt,
      id: `quiz-${Date.now()}`,
    }
    
    data.quizHistory.push(newAttempt)
    data.totalQuizzesTaken++
    
    // Recalculate average
    const totalScore = data.quizHistory.reduce((sum, q) => sum + q.score, 0)
    data.averageQuizScore = Math.round(totalScore / data.quizHistory.length)
    
    // Update study time
    data.totalStudyTime += Math.round(attempt.timeSpent / 60)
    
    // Update daily activity
    const today = new Date().toISOString().split('T')[0]
    const dayIndex = data.dailyActivity.findIndex(d => d.date === today)
    if (dayIndex !== -1) {
      data.dailyActivity[dayIndex].quizzes++
      data.dailyActivity[dayIndex].intensity = getIntensityLevel(
        data.dailyActivity[dayIndex].quizzes + data.dailyActivity[dayIndex].flashcards
      )
    } else {
      data.dailyActivity.push({
        date: today,
        intensity: 1,
        quizzes: 1,
        flashcards: 0,
      })
    }
    
    saveLearningAnalytics(data)
  } catch (err) {
    console.error('[LearningAnalytics] Failed to record quiz:', err)
  }
}

/**
 * Record a flashcard session for analytics
 */
export function recordFlashcardSession(session: Omit<FlashcardSession, 'id'>): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const data: LearningAnalyticsData = stored 
      ? JSON.parse(stored) 
      : getDefaultAnalytics()
    
    const newSession: FlashcardSession = {
      ...session,
      id: `fc-${Date.now()}`,
    }
    
    data.flashcardHistory.push(newSession)
    data.totalFlashcardSessions++
    
    // Recalculate retention
    const totalReviewed = data.flashcardHistory.reduce((sum, s) => sum + s.cardsReviewed, 0)
    const totalCorrect = data.flashcardHistory.reduce((sum, s) => sum + s.cardsCorrect, 0)
    data.averageRetention = totalReviewed > 0 
      ? Math.round((totalCorrect / totalReviewed) * 100) 
      : 0
    
    // Update study time
    data.totalStudyTime += Math.round(session.timeSpent / 60)
    
    // Update daily activity
    const today = new Date().toISOString().split('T')[0]
    const dayIndex = data.dailyActivity.findIndex(d => d.date === today)
    if (dayIndex !== -1) {
      data.dailyActivity[dayIndex].flashcards++
      data.dailyActivity[dayIndex].intensity = getIntensityLevel(
        data.dailyActivity[dayIndex].quizzes + data.dailyActivity[dayIndex].flashcards
      )
    } else {
      data.dailyActivity.push({
        date: today,
        intensity: 1,
        quizzes: 0,
        flashcards: 1,
      })
    }
    
    saveLearningAnalytics(data)
  } catch (err) {
    console.error('[LearningAnalytics] Failed to record session:', err)
  }
}

/**
 * Update topic performance
 */
export function updateTopicPerformance(
  topic: string,
  correct: boolean,
  type: 'quiz' | 'flashcard',
  strandId?: string
): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const data: LearningAnalyticsData = stored 
      ? JSON.parse(stored) 
      : getDefaultAnalytics()
    
    const topicIndex = data.topicPerformance.findIndex(t => t.topic === topic)
    
    if (topicIndex !== -1) {
      const t = data.topicPerformance[topicIndex]
      
      if (type === 'quiz') {
        t.totalQuestions++
        // Simple moving average for accuracy
        const weight = 0.1
        t.quizAccuracy = Math.round(
          t.quizAccuracy * (1 - weight) + (correct ? 100 : 0) * weight
        )
      } else {
        t.totalCards++
        const weight = 0.1
        t.flashcardRetention = Math.round(
          t.flashcardRetention * (1 - weight) + (correct ? 100 : 0) * weight
        )
      }
      
      // Update mastery (average of quiz and flashcard performance)
      t.mastery = Math.round((t.quizAccuracy + t.flashcardRetention) / 2)
      t.lastStudied = new Date().toISOString()
      
      // Determine trend (simplified)
      if (correct && t.mastery < 80) {
        t.trend = 'improving'
      } else if (!correct && t.mastery > 40) {
        t.trend = 'declining'
      }
      
    } else {
      // New topic
      data.topicPerformance.push({
        topic,
        strandId,
        quizAccuracy: correct ? 100 : 0,
        flashcardRetention: correct ? 100 : 0,
        totalQuestions: type === 'quiz' ? 1 : 0,
        totalCards: type === 'flashcard' ? 1 : 0,
        lastStudied: new Date().toISOString(),
        mastery: correct ? 50 : 20,
        trend: 'stable',
      })
    }
    
    saveLearningAnalytics(data)
  } catch (err) {
    console.error('[LearningAnalytics] Failed to update topic:', err)
  }
}

