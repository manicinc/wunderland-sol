/**
 * Daily Check-In System
 * @module lib/quarry/dailyCheckIn
 *
 * Combines mood and sleep tracking for daily wellness check-ins.
 * Data resets at midnight (date-based storage).
 */

import type { MoodState, SleepHours } from './mood'

/**
 * Daily check-in entry combining mood and sleep
 */
export interface DailyCheckIn {
  date: string // YYYY-MM-DD
  mood?: MoodState
  moodSetAt?: string // ISO timestamp
  sleepHours?: SleepHours
  sleepSetAt?: string // ISO timestamp
  note?: string
}

const DAILY_CHECKIN_STORAGE_KEY = 'codex-daily-checkins'

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get all stored check-ins
 */
function getAllCheckIns(): Record<string, DailyCheckIn> {
  if (typeof window === 'undefined') return {}

  try {
    const stored = localStorage.getItem(DAILY_CHECKIN_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Save all check-ins
 */
function saveAllCheckIns(checkIns: Record<string, DailyCheckIn>): void {
  if (typeof window === 'undefined') return

  // Clean up old entries (keep last 90 days)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 90)
  const cutoffStr = cutoffDate.toISOString().split('T')[0]

  const cleaned: Record<string, DailyCheckIn> = {}
  for (const [date, entry] of Object.entries(checkIns)) {
    if (date >= cutoffStr) {
      cleaned[date] = entry
    }
  }

  localStorage.setItem(DAILY_CHECKIN_STORAGE_KEY, JSON.stringify(cleaned))
}

/**
 * Get check-in for a specific date
 */
export function getDailyCheckIn(date?: string): DailyCheckIn | null {
  const targetDate = date || getTodayDate()
  const checkIns = getAllCheckIns()
  return checkIns[targetDate] || null
}

/**
 * Get today's check-in
 */
export function getTodayCheckIn(): DailyCheckIn | null {
  return getDailyCheckIn(getTodayDate())
}

/**
 * Set today's mood
 */
export function setDailyMood(mood: MoodState, note?: string): DailyCheckIn {
  const today = getTodayDate()
  const checkIns = getAllCheckIns()

  const existing = checkIns[today] || { date: today }
  const updated: DailyCheckIn = {
    ...existing,
    mood,
    moodSetAt: new Date().toISOString(),
    ...(note && { note }),
  }

  checkIns[today] = updated
  saveAllCheckIns(checkIns)

  return updated
}

/**
 * Set today's sleep hours
 */
export function setDailySleep(sleepHours: SleepHours): DailyCheckIn {
  const today = getTodayDate()
  const checkIns = getAllCheckIns()

  const existing = checkIns[today] || { date: today }
  const updated: DailyCheckIn = {
    ...existing,
    sleepHours,
    sleepSetAt: new Date().toISOString(),
  }

  checkIns[today] = updated
  saveAllCheckIns(checkIns)

  return updated
}

/**
 * Clear today's check-in
 */
export function clearTodayCheckIn(): void {
  const today = getTodayDate()
  const checkIns = getAllCheckIns()
  delete checkIns[today]
  saveAllCheckIns(checkIns)
}

/**
 * Get check-in history for the last N days
 */
export function getCheckInHistory(days: number = 30): DailyCheckIn[] {
  const checkIns = getAllCheckIns()
  const history: DailyCheckIn[] = []

  const today = new Date()
  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    if (checkIns[dateStr]) {
      history.push(checkIns[dateStr])
    }
  }

  return history
}

/**
 * Check if today's check-in is complete (both mood and sleep set)
 */
export function isTodayCheckInComplete(): boolean {
  const today = getTodayCheckIn()
  return !!(today?.mood && today?.sleepHours)
}

/**
 * Check if user has checked in today (at least mood set)
 */
export function hasCheckedInToday(): boolean {
  const today = getTodayCheckIn()
  return !!today?.mood
}

/**
 * Get streak of consecutive days with check-ins
 */
export function getCheckInStreak(): number {
  const checkIns = getAllCheckIns()
  let streak = 0

  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    if (checkIns[dateStr]?.mood) {
      streak++
    } else if (i > 0) {
      // Allow today to be missing (not yet checked in)
      break
    }
  }

  return streak
}

/**
 * Get average sleep quality over a period
 */
export function getAverageSleepQuality(days: number = 30): {
  average: number // 1-5 scale
  totalDays: number
  distribution: Record<SleepHours, number>
} {
  const history = getCheckInHistory(days)
  const sleepEntries = history.filter((c) => c.sleepHours)

  const distribution: Record<SleepHours, number> = {
    '<4': 0,
    '4-5': 0,
    '5-6': 0,
    '6-7': 0,
    '7-8': 0,
    '>8': 0,
  }

  const qualityMap: Record<SleepHours, number> = {
    '<4': 1,
    '4-5': 2,
    '5-6': 3,
    '6-7': 4,
    '7-8': 5,
    '>8': 5,
  }

  let totalQuality = 0
  for (const entry of sleepEntries) {
    if (entry.sleepHours) {
      distribution[entry.sleepHours]++
      totalQuality += qualityMap[entry.sleepHours]
    }
  }

  return {
    average: sleepEntries.length > 0 ? totalQuality / sleepEntries.length : 0,
    totalDays: sleepEntries.length,
    distribution,
  }
}

/**
 * Get mood distribution over a period
 */
export function getMoodDistribution(days: number = 30): {
  distribution: Record<MoodState, number>
  mostCommon: MoodState | null
  totalDays: number
} {
  const history = getCheckInHistory(days)
  const moodEntries = history.filter((c) => c.mood)

  const distribution: Record<MoodState, number> = {
    focused: 0,
    creative: 0,
    curious: 0,
    relaxed: 0,
    energetic: 0,
    reflective: 0,
    anxious: 0,
    grateful: 0,
    tired: 0,
    peaceful: 0,
    excited: 0,
    neutral: 0,
  }

  for (const entry of moodEntries) {
    if (entry.mood) {
      distribution[entry.mood]++
    }
  }

  let mostCommon: MoodState | null = null
  let maxCount = 0
  for (const [mood, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count
      mostCommon = mood as MoodState
    }
  }

  return {
    distribution,
    mostCommon,
    totalDays: moodEntries.length,
  }
}
