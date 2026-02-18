/**
 * Focus Analytics Service
 * @module lib/focus/focusAnalytics
 *
 * Tracks and persists focus session data:
 * - Session duration and mode
 * - Words written and WPM
 * - Distraction counts
 * - Daily/weekly aggregates
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FocusSession {
  id: string
  startedAt: string // ISO string
  endedAt?: string
  duration: number // seconds
  mode: 'focus' | 'writing' | 'reading'
  writingMode?: 'wysiwyg' | 'typewriter'
  wordsWritten: number
  wordsPerMinute: number
  distractionCount: number
  soundscape?: string
  isDeepFocus: boolean
  pagesVisited?: string[]
}

export interface DailyStats {
  date: string // YYYY-MM-DD
  totalFocusTime: number // seconds
  totalWritingTime: number
  wordsWritten: number
  sessionsCompleted: number
  longestSession: number
  averageWpm: number
  totalDistractions: number
  peakHour?: number
  modeBreakdown: {
    focus: number
    writing: number
    reading: number
  }
}

export interface WeeklyStats {
  weekStart: string // YYYY-MM-DD (Monday)
  dailyStats: DailyStats[]
  totalFocusTime: number
  totalWordsWritten: number
  averageSessionLength: number
  consistencyScore: number // 0-100, based on days active
  bestDay: string
}

export interface FocusGoals {
  dailyFocusMinutes: number
  dailyWordCount: number
  weeklySessionTarget: number
}

// ============================================================================
// STORAGE
// ============================================================================

const SESSIONS_KEY = 'focus-sessions'
const DAILY_STATS_KEY = 'focus-daily-stats'
const GOALS_KEY = 'focus-goals'

function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export function saveFocusSession(session: FocusSession): void {
  const storage = getStorage()
  if (!storage) return

  try {
    const sessions = getAllSessions()
    sessions.push(session)
    // Keep last 500 sessions (about 6 months of daily use)
    const trimmed = sessions.slice(-500)
    storage.setItem(SESSIONS_KEY, JSON.stringify(trimmed))

    // Update daily stats
    updateDailyStats(session)
  } catch (error) {
    console.error('[focusAnalytics] Failed to save session:', error)
  }
}

export function getAllSessions(): FocusSession[] {
  const storage = getStorage()
  if (!storage) return []

  try {
    const data = storage.getItem(SESSIONS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function getSessionsForDate(date: Date): FocusSession[] {
  const dateStr = formatDate(date)
  return getAllSessions().filter((s) => s.startedAt.startsWith(dateStr))
}

export function getSessionsForDateRange(start: Date, end: Date): FocusSession[] {
  const startTime = start.getTime()
  const endTime = end.getTime()

  return getAllSessions().filter((s) => {
    const sessionTime = new Date(s.startedAt).getTime()
    return sessionTime >= startTime && sessionTime <= endTime
  })
}

// ============================================================================
// DAILY STATS
// ============================================================================

function updateDailyStats(session: FocusSession): void {
  const storage = getStorage()
  if (!storage) return

  const dateStr = session.startedAt.split('T')[0]
  const stats = getDailyStats(dateStr) || createEmptyDailyStats(dateStr)

  // Update stats
  stats.totalFocusTime += session.duration
  stats.wordsWritten += session.wordsWritten
  stats.sessionsCompleted += 1
  stats.totalDistractions += session.distractionCount
  stats.longestSession = Math.max(stats.longestSession, session.duration)

  // Mode breakdown
  if (session.mode === 'writing') {
    stats.totalWritingTime += session.duration
    stats.modeBreakdown.writing += session.duration
  } else if (session.mode === 'reading') {
    stats.modeBreakdown.reading += session.duration
  } else {
    stats.modeBreakdown.focus += session.duration
  }

  // Calculate average WPM
  if (stats.totalWritingTime > 0) {
    stats.averageWpm = Math.round(stats.wordsWritten / (stats.totalWritingTime / 60))
  }

  // Determine peak hour
  const hour = new Date(session.startedAt).getHours()
  stats.peakHour = hour // Simplified: last session's hour (could be enhanced to track most productive hour)

  // Save
  saveDailyStats(stats)
}

function saveDailyStats(stats: DailyStats): void {
  const storage = getStorage()
  if (!storage) return

  try {
    const allStats = getAllDailyStats()
    const index = allStats.findIndex((s) => s.date === stats.date)
    if (index >= 0) {
      allStats[index] = stats
    } else {
      allStats.push(stats)
    }
    // Keep last 365 days
    const sorted = allStats.sort((a, b) => a.date.localeCompare(b.date)).slice(-365)
    storage.setItem(DAILY_STATS_KEY, JSON.stringify(sorted))
  } catch (error) {
    console.error('[focusAnalytics] Failed to save daily stats:', error)
  }
}

export function getDailyStats(date: string): DailyStats | null {
  const allStats = getAllDailyStats()
  return allStats.find((s) => s.date === date) || null
}

export function getAllDailyStats(): DailyStats[] {
  const storage = getStorage()
  if (!storage) return []

  try {
    const data = storage.getItem(DAILY_STATS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function getTodayStats(): DailyStats {
  const today = formatDate(new Date())
  return getDailyStats(today) || createEmptyDailyStats(today)
}

function createEmptyDailyStats(date: string): DailyStats {
  return {
    date,
    totalFocusTime: 0,
    totalWritingTime: 0,
    wordsWritten: 0,
    sessionsCompleted: 0,
    longestSession: 0,
    averageWpm: 0,
    totalDistractions: 0,
    modeBreakdown: {
      focus: 0,
      writing: 0,
      reading: 0,
    },
  }
}

// ============================================================================
// WEEKLY STATS
// ============================================================================

export function getWeeklyStats(weekStart?: Date): WeeklyStats {
  const start = weekStart || getMonday(new Date())
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  const dailyStats: DailyStats[] = []
  const current = new Date(start)

  while (current <= end) {
    const dateStr = formatDate(current)
    dailyStats.push(getDailyStats(dateStr) || createEmptyDailyStats(dateStr))
    current.setDate(current.getDate() + 1)
  }

  const totalFocusTime = dailyStats.reduce((sum, d) => sum + d.totalFocusTime, 0)
  const totalWordsWritten = dailyStats.reduce((sum, d) => sum + d.wordsWritten, 0)
  const sessionsCompleted = dailyStats.reduce((sum, d) => sum + d.sessionsCompleted, 0)
  const daysActive = dailyStats.filter((d) => d.sessionsCompleted > 0).length

  // Find best day
  const bestDayStats = dailyStats.reduce((best, current) =>
    current.totalFocusTime > best.totalFocusTime ? current : best
  )

  return {
    weekStart: formatDate(start),
    dailyStats,
    totalFocusTime,
    totalWordsWritten,
    averageSessionLength: sessionsCompleted > 0 ? Math.round(totalFocusTime / sessionsCompleted) : 0,
    consistencyScore: Math.round((daysActive / 7) * 100),
    bestDay: bestDayStats.date,
  }
}

// ============================================================================
// GOALS
// ============================================================================

export function getGoals(): FocusGoals {
  const storage = getStorage()
  if (!storage) {
    return { dailyFocusMinutes: 60, dailyWordCount: 500, weeklySessionTarget: 14 }
  }

  try {
    const data = storage.getItem(GOALS_KEY)
    return data
      ? JSON.parse(data)
      : { dailyFocusMinutes: 60, dailyWordCount: 500, weeklySessionTarget: 14 }
  } catch {
    return { dailyFocusMinutes: 60, dailyWordCount: 500, weeklySessionTarget: 14 }
  }
}

export function saveGoals(goals: FocusGoals): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(GOALS_KEY, JSON.stringify(goals))
  } catch (error) {
    console.error('[focusAnalytics] Failed to save goals:', error)
  }
}

// ============================================================================
// PROGRESS CALCULATIONS
// ============================================================================

export interface FocusProgress {
  focusTimeProgress: number // 0-100
  wordCountProgress: number // 0-100
  weeklySessionProgress: number // 0-100
  currentStreak: number // consecutive days with sessions
  isOnTrack: boolean
}

export function getProgress(): FocusProgress {
  const goals = getGoals()
  const today = getTodayStats()
  const weekly = getWeeklyStats()

  // Calculate streak
  const streak = calculateStreak()

  // Focus time progress
  const focusMinutes = Math.round(today.totalFocusTime / 60)
  const focusTimeProgress = Math.min(100, Math.round((focusMinutes / goals.dailyFocusMinutes) * 100))

  // Word count progress
  const wordCountProgress = Math.min(100, Math.round((today.wordsWritten / goals.dailyWordCount) * 100))

  // Weekly session progress
  const totalSessions = weekly.dailyStats.reduce((sum, d) => sum + d.sessionsCompleted, 0)
  const weeklySessionProgress = Math.min(
    100,
    Math.round((totalSessions / goals.weeklySessionTarget) * 100)
  )

  // Is on track? (at least 50% of all goals)
  const isOnTrack = (focusTimeProgress + wordCountProgress + weeklySessionProgress) / 3 >= 50

  return {
    focusTimeProgress,
    wordCountProgress,
    weeklySessionProgress,
    currentStreak: streak,
    isOnTrack,
  }
}

function calculateStreak(): number {
  const allStats = getAllDailyStats().sort((a, b) => b.date.localeCompare(a.date))
  if (allStats.length === 0) return 0

  let streak = 0
  const today = formatDate(new Date())
  let expectedDate = today

  for (const stats of allStats) {
    if (stats.date !== expectedDate) {
      // Check if we skipped yesterday (still valid streak if today has no session yet)
      if (streak === 0 && stats.date === getYesterday(today)) {
        expectedDate = stats.date
      } else {
        break
      }
    }

    if (stats.sessionsCompleted > 0) {
      streak++
      expectedDate = getYesterday(expectedDate)
    } else if (streak > 0) {
      break
    }
  }

  return streak
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getYesterday(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00') // Noon to avoid timezone issues
  date.setDate(date.getDate() - 1)
  return formatDate(date)
}

// ============================================================================
// REAL-TIME SESSION TRACKING HOOK
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'

export interface UseSessionTrackerOptions {
  mode: 'focus' | 'writing' | 'reading'
  writingMode?: 'wysiwyg' | 'typewriter'
  isDeepFocus?: boolean
  soundscape?: string
  autoStart?: boolean
  onSessionEnd?: (session: FocusSession) => void
}

export interface UseSessionTrackerReturn {
  isActive: boolean
  duration: number // seconds
  wordsWritten: number
  distractionCount: number
  wpm: number
  start: () => void
  pause: () => void
  resume: () => void
  end: () => FocusSession | null
  updateWordCount: (count: number) => void
}

export function useSessionTracker(options: UseSessionTrackerOptions): UseSessionTrackerReturn {
  const {
    mode,
    writingMode,
    isDeepFocus = false,
    soundscape,
    autoStart = false,
    onSessionEnd,
  } = options

  const [isActive, setIsActive] = useState(autoStart)
  const [duration, setDuration] = useState(0)
  const [wordsWritten, setWordsWritten] = useState(0)
  const [distractionCount, setDistractionCount] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(autoStart ? new Date() : null)

  const sessionIdRef = useRef(crypto.randomUUID())
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const wasVisibleRef = useRef(true)
  const initialWordsRef = useRef(0)

  // Duration timer
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isActive])

  // Track page visibility for distractions
  useEffect(() => {
    if (!isActive) return

    const handleVisibility = () => {
      if (document.hidden && wasVisibleRef.current) {
        setDistractionCount((c) => c + 1)
      }
      wasVisibleRef.current = !document.hidden
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isActive])

  // Calculate WPM
  const wpm =
    duration > 60 && mode === 'writing'
      ? Math.round((wordsWritten - initialWordsRef.current) / (duration / 60))
      : 0

  const start = useCallback(() => {
    setIsActive(true)
    setStartTime(new Date())
    setDuration(0)
    setDistractionCount(0)
    sessionIdRef.current = crypto.randomUUID()
    initialWordsRef.current = wordsWritten
  }, [wordsWritten])

  const pause = useCallback(() => {
    setIsActive(false)
  }, [])

  const resume = useCallback(() => {
    setIsActive(true)
  }, [])

  const end = useCallback((): FocusSession | null => {
    if (!startTime) return null

    setIsActive(false)

    const session: FocusSession = {
      id: sessionIdRef.current,
      startedAt: startTime.toISOString(),
      endedAt: new Date().toISOString(),
      duration,
      mode,
      writingMode,
      wordsWritten: wordsWritten - initialWordsRef.current,
      wordsPerMinute: wpm,
      distractionCount,
      soundscape,
      isDeepFocus,
    }

    // Save session
    saveFocusSession(session)

    // Callback
    onSessionEnd?.(session)

    // Reset
    setStartTime(null)
    setDuration(0)
    setDistractionCount(0)
    initialWordsRef.current = 0

    return session
  }, [startTime, duration, mode, writingMode, wordsWritten, wpm, distractionCount, soundscape, isDeepFocus, onSessionEnd])

  const updateWordCount = useCallback((count: number) => {
    setWordsWritten(count)
  }, [])

  return {
    isActive,
    duration,
    wordsWritten,
    distractionCount,
    wpm,
    start,
    pause,
    resume,
    end,
    updateWordCount,
  }
}
