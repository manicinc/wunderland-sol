/**
 * Learning Stats & Streaks Hook
 * @module components/quarry/hooks/useLearningGamification
 * 
 * @description
 * Tracks learning statistics and streaks:
 * - Daily study streaks
 * - Cards reviewed, quizzes taken, terms learned
 * - Study session history
 * - Personal records
 * 
 * Data is persisted in localStorage for offline support.
 * 
 * @example
 * ```tsx
 * const { 
 *   streak, stats, 
 *   recordStudySession, incrementStat 
 * } = useLearningGamification()
 * 
 * // After completing a flashcard review
 * incrementStat('cards')
 * recordStudySession()
 * ```
 */

import { useState, useCallback, useEffect, useMemo } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface StudySession {
  date: string
  cardsReviewed: number
  quizzesTaken: number
  termsLearned: number
  duration: number // minutes
  accuracy?: number
}

export interface LearningStats {
  // Streaks
  currentStreak: number
  longestStreak: number
  lastStudyDate: string | null
  
  // Totals
  totalCardsReviewed: number
  totalQuizzesTaken: number
  totalTermsLearned: number
  totalStudyDays: number
  totalStudyTime: number // minutes
  
  // Accuracy
  averageAccuracy: number
  bestAccuracy: number
  accuracyHistory: number[]
  
  // Sessions
  recentSessions: StudySession[]
}

export interface UseLearningGamificationReturn {
  // Stats
  stats: LearningStats
  streak: number
  longestStreak: number
  
  // Actions
  recordStudySession: (session?: Partial<StudySession>) => void
  incrementStat: (stat: 'cards' | 'quizzes' | 'terms', count?: number) => void
  recordAccuracy: (accuracy: number) => void
  addStudyTime: (minutes: number) => void
  resetStats: () => void
  
  // Computed
  isStudiedToday: boolean
  daysSinceLastStudy: number | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'quarry-learning-stats'
const MAX_RECENT_SESSIONS = 30
const MAX_ACCURACY_HISTORY = 100

const DEFAULT_STATS: LearningStats = {
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: null,
  totalCardsReviewed: 0,
  totalQuizzesTaken: 0,
  totalTermsLearned: 0,
  totalStudyDays: 0,
  totalStudyTime: 0,
  averageAccuracy: 0,
  bestAccuracy: 0,
  accuracyHistory: [],
  recentSessions: [],
}

// ============================================================================
// HELPERS
// ============================================================================

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

function isConsecutiveDay(lastDate: Date, currentDate: Date): boolean {
  const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate())
  const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
  const diff = currentDay.getTime() - lastDay.getTime()
  const dayInMs = 24 * 60 * 60 * 1000
  return diff === dayInMs
}

function daysBetween(date1: Date, date2: Date): number {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate())
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate())
  const diff = Math.abs(d2.getTime() - d1.getTime())
  return Math.floor(diff / (24 * 60 * 60 * 1000))
}

function loadStats(): LearningStats {
  if (typeof window === 'undefined') return DEFAULT_STATS
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_STATS, ...parsed }
    }
  } catch (err) {
    console.warn('[LearningStats] Failed to load stats:', err)
  }
  return DEFAULT_STATS
}

function saveStats(stats: LearningStats): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch (err) {
    console.warn('[LearningStats] Failed to save stats:', err)
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useLearningGamification(): UseLearningGamificationReturn {
  const [stats, setStats] = useState<LearningStats>(DEFAULT_STATS)
  const [initialized, setInitialized] = useState(false)

  // Load stats on mount
  useEffect(() => {
    const loaded = loadStats()
    setStats(loaded)
    setInitialized(true)
  }, [])

  // Save stats on change
  useEffect(() => {
    if (initialized) {
      saveStats(stats)
    }
  }, [stats, initialized])

  // Check if studied today
  const isStudiedToday = useMemo(() => {
    if (!stats.lastStudyDate) return false
    return isSameDay(new Date(stats.lastStudyDate), new Date())
  }, [stats.lastStudyDate])

  // Days since last study
  const daysSinceLastStudy = useMemo(() => {
    if (!stats.lastStudyDate) return null
    return daysBetween(new Date(stats.lastStudyDate), new Date())
  }, [stats.lastStudyDate])

  // Record study session (updates streak)
  const recordStudySession = useCallback((session?: Partial<StudySession>) => {
    const now = new Date()
    const lastDate = stats.lastStudyDate ? new Date(stats.lastStudyDate) : null

    setStats(prev => {
      let newStreak = prev.currentStreak
      let newStudyDays = prev.totalStudyDays

      if (!lastDate) {
        // First ever study
        newStreak = 1
        newStudyDays = 1
      } else if (isSameDay(lastDate, now)) {
        // Already studied today - don't change streak
      } else if (isConsecutiveDay(lastDate, now)) {
        // Consecutive day - increment streak
        newStreak = prev.currentStreak + 1
        newStudyDays = prev.totalStudyDays + 1
      } else {
        // Streak broken - reset to 1
        newStreak = 1
        newStudyDays = prev.totalStudyDays + 1
      }

      // Create session record
      const newSession: StudySession = {
        date: now.toISOString(),
        cardsReviewed: session?.cardsReviewed || 0,
        quizzesTaken: session?.quizzesTaken || 0,
        termsLearned: session?.termsLearned || 0,
        duration: session?.duration || 0,
        accuracy: session?.accuracy,
      }

      // Only add session if it has meaningful data
      const hasData = newSession.cardsReviewed > 0 || 
                      newSession.quizzesTaken > 0 || 
                      newSession.termsLearned > 0

      return {
        ...prev,
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        lastStudyDate: now.toISOString(),
        totalStudyDays: newStudyDays,
        recentSessions: hasData 
          ? [newSession, ...prev.recentSessions].slice(0, MAX_RECENT_SESSIONS)
          : prev.recentSessions,
      }
    })
  }, [stats.lastStudyDate])

  // Increment a stat counter
  const incrementStat = useCallback((stat: 'cards' | 'quizzes' | 'terms', count = 1) => {
    setStats(prev => {
      const key = stat === 'cards' ? 'totalCardsReviewed' 
        : stat === 'quizzes' ? 'totalQuizzesTaken' 
        : 'totalTermsLearned'
      return {
        ...prev,
        [key]: prev[key] + count,
      }
    })
  }, [])

  // Record accuracy score
  const recordAccuracy = useCallback((accuracy: number) => {
    setStats(prev => {
      const newHistory = [...prev.accuracyHistory, accuracy].slice(-MAX_ACCURACY_HISTORY)
      const newAverage = newHistory.reduce((a, b) => a + b, 0) / newHistory.length
      const newBest = Math.max(prev.bestAccuracy, accuracy)

      return {
        ...prev,
        averageAccuracy: Math.round(newAverage * 100) / 100,
        bestAccuracy: newBest,
        accuracyHistory: newHistory,
      }
    })
  }, [])

  // Add study time
  const addStudyTime = useCallback((minutes: number) => {
    setStats(prev => ({
      ...prev,
      totalStudyTime: prev.totalStudyTime + minutes,
    }))
  }, [])

  // Reset all stats
  const resetStats = useCallback(() => {
    setStats(DEFAULT_STATS)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    stats,
    streak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    recordStudySession,
    incrementStat,
    recordAccuracy,
    addStudyTime,
    resetStats,
    isStudiedToday,
    daysSinceLastStudy,
  }
}

export default useLearningGamification
