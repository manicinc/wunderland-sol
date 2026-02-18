/**
 * Mood & Sleep Analytics
 * @module lib/analytics/moodSleepAnalytics
 *
 * Aggregation and analysis functions for mood and sleep data.
 */

import type { MoodState, SleepHours } from '@/lib/codex/mood'
import {
  getCheckInHistory,
  getMoodDistribution,
  getAverageSleepQuality,
  type DailyCheckIn,
} from '@/lib/codex/dailyCheckIn'

/**
 * Mood trend data point
 */
export interface MoodTrendPoint {
  date: string
  mood: MoodState | null
  moodValue: number // 1-6 for charting
}

/**
 * Sleep trend data point
 */
export interface SleepTrendPoint {
  date: string
  sleepHours: SleepHours | null
  qualityValue: number // 1-5 for charting
}

/**
 * Daily wellness score combining mood and sleep
 */
export interface WellnessScore {
  date: string
  score: number // 0-100
  mood: MoodState | null
  sleepHours: SleepHours | null
}

/**
 * Mood value mapping for trend charts
 * Scale: 1-6 where higher = more positive/energetic
 */
const MOOD_VALUES: Record<MoodState, number> = {
  focused: 5,
  creative: 6,
  curious: 5,
  relaxed: 4,
  energetic: 6,
  reflective: 4,
  anxious: 2,
  grateful: 6,
  tired: 2,
  peaceful: 5,
  excited: 6,
  neutral: 3,
}

/**
 * Sleep quality mapping
 */
const SLEEP_VALUES: Record<SleepHours, number> = {
  '<4': 1,
  '4-5': 2,
  '5-6': 3,
  '6-7': 4,
  '7-8': 5,
  '>8': 5,
}

/**
 * Get mood trend for the last N days
 */
export function getMoodTrend(days: number = 7): MoodTrendPoint[] {
  const history = getCheckInHistory(days)
  const trend: MoodTrendPoint[] = []

  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const entry = history.find((h) => h.date === dateStr)
    trend.push({
      date: dateStr,
      mood: entry?.mood || null,
      moodValue: entry?.mood ? MOOD_VALUES[entry.mood] : 0,
    })
  }

  return trend
}

/**
 * Get sleep trend for the last N days
 */
export function getSleepTrend(days: number = 7): SleepTrendPoint[] {
  const history = getCheckInHistory(days)
  const trend: SleepTrendPoint[] = []

  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const entry = history.find((h) => h.date === dateStr)
    trend.push({
      date: dateStr,
      sleepHours: entry?.sleepHours || null,
      qualityValue: entry?.sleepHours ? SLEEP_VALUES[entry.sleepHours] : 0,
    })
  }

  return trend
}

/**
 * Get wellness scores for the last N days
 */
export function getWellnessScores(days: number = 7): WellnessScore[] {
  const history = getCheckInHistory(days)
  const scores: WellnessScore[] = []

  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const entry = history.find((h) => h.date === dateStr)

    // Calculate score: 50% mood (1-6 scaled to 50), 50% sleep (1-5 scaled to 50)
    let score = 0
    if (entry?.mood) {
      score += (MOOD_VALUES[entry.mood] / 6) * 50
    }
    if (entry?.sleepHours) {
      score += (SLEEP_VALUES[entry.sleepHours] / 5) * 50
    }

    scores.push({
      date: dateStr,
      score: Math.round(score),
      mood: entry?.mood || null,
      sleepHours: entry?.sleepHours || null,
    })
  }

  return scores
}

/**
 * Get mood-sleep correlation insight
 */
export function getMoodSleepCorrelation(days: number = 30): {
  correlation: 'positive' | 'negative' | 'neutral'
  insight: string
  bestMoodWithSleep: { mood: MoodState; sleep: SleepHours } | null
} {
  const history = getCheckInHistory(days)
  const completeEntries = history.filter((h) => h.mood && h.sleepHours)

  if (completeEntries.length < 5) {
    return {
      correlation: 'neutral',
      insight: 'Not enough data yet. Keep checking in!',
      bestMoodWithSleep: null,
    }
  }

  // Group moods by sleep quality
  const moodsBySleep: Record<SleepHours, MoodState[]> = {
    '<4': [],
    '4-5': [],
    '5-6': [],
    '6-7': [],
    '7-8': [],
    '>8': [],
  }

  for (const entry of completeEntries) {
    if (entry.mood && entry.sleepHours) {
      moodsBySleep[entry.sleepHours].push(entry.mood)
    }
  }

  // Calculate average mood value per sleep category
  const avgMoodPerSleep: Record<SleepHours, number> = {} as Record<SleepHours, number>
  for (const [sleep, moods] of Object.entries(moodsBySleep)) {
    if (moods.length > 0) {
      const total = moods.reduce((sum, m) => sum + MOOD_VALUES[m], 0)
      avgMoodPerSleep[sleep as SleepHours] = total / moods.length
    }
  }

  // Find best combination
  let bestMood: MoodState | null = null
  let bestSleep: SleepHours | null = null
  let highestAvg = 0

  for (const [sleep, avg] of Object.entries(avgMoodPerSleep)) {
    if (avg > highestAvg) {
      highestAvg = avg
      bestSleep = sleep as SleepHours
      // Get most common mood with this sleep
      const moods = moodsBySleep[sleep as SleepHours]
      const moodCounts: Record<string, number> = {}
      for (const m of moods) {
        moodCounts[m] = (moodCounts[m] || 0) + 1
      }
      bestMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as MoodState
    }
  }

  // Determine correlation
  const sleepOrder: SleepHours[] = ['<4', '4-5', '5-6', '6-7', '7-8', '>8']
  const values = sleepOrder
    .map((s) => avgMoodPerSleep[s])
    .filter((v) => v !== undefined)

  let increasing = 0
  let decreasing = 0
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) increasing++
    if (values[i] < values[i - 1]) decreasing++
  }

  let correlation: 'positive' | 'negative' | 'neutral' = 'neutral'
  let insight = 'Your mood and sleep patterns vary independently.'

  if (increasing > decreasing + 1) {
    correlation = 'positive'
    insight = 'Better sleep tends to improve your mood!'
  } else if (decreasing > increasing + 1) {
    correlation = 'negative'
    insight = 'Interestingly, you seem more energized with less sleep.'
  }

  return {
    correlation,
    insight,
    bestMoodWithSleep: bestMood && bestSleep ? { mood: bestMood, sleep: bestSleep } : null,
  }
}

/**
 * Get summary statistics
 */
export function getMoodSleepSummary(days: number = 30): {
  totalCheckIns: number
  completionRate: number // percentage
  avgSleepQuality: number
  mostCommonMood: MoodState | null
  mostCommonSleep: SleepHours | null
  streak: number
} {
  const history = getCheckInHistory(days)
  const moodData = getMoodDistribution(days)
  const sleepData = getAverageSleepQuality(days)

  // Find most common sleep
  let mostCommonSleep: SleepHours | null = null
  let maxSleepCount = 0
  for (const [sleep, count] of Object.entries(sleepData.distribution)) {
    if (count > maxSleepCount) {
      maxSleepCount = count
      mostCommonSleep = sleep as SleepHours
    }
  }

  // Calculate streak
  let streak = 0
  const today = new Date()
  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const entry = history.find((h) => h.date === dateStr)

    if (entry?.mood) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  const completeCheckIns = history.filter((h) => h.mood && h.sleepHours).length

  return {
    totalCheckIns: history.length,
    completionRate: days > 0 ? Math.round((completeCheckIns / days) * 100) : 0,
    avgSleepQuality: sleepData.average,
    mostCommonMood: moodData.mostCommon,
    mostCommonSleep,
    streak,
  }
}

/**
 * Get formatted label for day of week
 */
export function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (dateStr === today.toISOString().split('T')[0]) return 'Today'
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'

  return date.toLocaleDateString('en-US', { weekday: 'short' })
}
