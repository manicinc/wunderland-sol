/**
 * Mood Tracking System for Codex
 * @module lib/quarry/mood
 * 
 * Tracks user mood to personalize prompts, greetings, and suggestions.
 * Stores mood history for analytics and pattern detection.
 */

export type MoodState =
  | 'focused'
  | 'creative'
  | 'curious'
  | 'relaxed'
  | 'energetic'
  | 'reflective'
  | 'anxious'
  | 'grateful'
  | 'tired'
  | 'peaceful'
  | 'excited'
  | 'neutral'

/**
 * Sleep hours ranges for daily check-in
 */
export type SleepHours = '<4' | '4-5' | '5-6' | '6-7' | '7-8' | '>8'

/**
 * Sleep hours configuration
 */
export interface SleepConfig {
  label: string
  emoji: string
  color: string
  darkColor: string
  quality: 'poor' | 'low' | 'moderate' | 'good' | 'excellent'
}

export const SLEEP_CONFIG: Record<SleepHours, SleepConfig> = {
  '<4': {
    label: 'Less than 4 hours',
    emoji: '😴',
    color: 'text-red-600 bg-red-50 border-red-200',
    darkColor: 'dark:text-red-400 dark:bg-red-900/30 dark:border-red-800',
    quality: 'poor',
  },
  '4-5': {
    label: '4-5 hours',
    emoji: '😪',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    darkColor: 'dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-800',
    quality: 'low',
  },
  '5-6': {
    label: '5-6 hours',
    emoji: '🙂',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    darkColor: 'dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800',
    quality: 'moderate',
  },
  '6-7': {
    label: '6-7 hours',
    emoji: '😊',
    color: 'text-lime-600 bg-lime-50 border-lime-200',
    darkColor: 'dark:text-lime-400 dark:bg-lime-900/30 dark:border-lime-800',
    quality: 'good',
  },
  '7-8': {
    label: '7-8 hours',
    emoji: '😄',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    darkColor: 'dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800',
    quality: 'excellent',
  },
  '>8': {
    label: 'More than 8 hours',
    emoji: '🌟',
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    darkColor: 'dark:text-teal-400 dark:bg-teal-900/30 dark:border-teal-800',
    quality: 'excellent',
  },
}

export interface MoodEntry {
  mood: MoodState
  timestamp: string
  note?: string
}

export interface MoodConfig {
  label: string
  emoji: string
  color: string
  darkColor: string
  description: string
  suggestedActivities: string[]
}

/**
 * Mood configuration with styling and metadata
 */
export const MOOD_CONFIG: Record<MoodState, MoodConfig> = {
  focused: {
    label: 'Focused',
    emoji: '🎯',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    darkColor: 'dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800',
    description: 'Ready to dive deep into complex topics',
    suggestedActivities: ['Research', 'Deep reading', 'Technical writing', 'Problem solving'],
  },
  creative: {
    label: 'Creative',
    emoji: '🎨',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    darkColor: 'dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-800',
    description: 'Feeling inspired and imaginative',
    suggestedActivities: ['Brainstorming', 'Writing stories', 'Exploring new ideas', 'Making connections'],
  },
  curious: {
    label: 'Curious',
    emoji: '🔍',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    darkColor: 'dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800',
    description: 'Want to explore and discover new things',
    suggestedActivities: ['Random exploration', 'Q&A sessions', 'Learning paths', 'Discovery mode'],
  },
  relaxed: {
    label: 'Relaxed',
    emoji: '🌿',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    darkColor: 'dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800',
    description: 'Taking it easy, light reading',
    suggestedActivities: ['Casual browsing', 'Light reading', 'Reviewing notes', 'Organizing'],
  },
  energetic: {
    label: 'Energetic',
    emoji: '⚡',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    darkColor: 'dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-800',
    description: 'Full of energy, ready to take on challenges',
    suggestedActivities: ['Speed reading', 'Creating content', 'Flashcard drills', 'Active learning'],
  },
  reflective: {
    label: 'Reflective',
    emoji: '🌙',
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    darkColor: 'dark:text-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-800',
    description: 'Thoughtful mood, pondering deeper meanings',
    suggestedActivities: ['Journaling', 'Philosophy', 'Personal notes', 'Meditation'],
  },
  anxious: {
    label: 'Anxious',
    emoji: '😰',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    darkColor: 'dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-800',
    description: 'Feeling worried or stressed',
    suggestedActivities: ['Breathing exercises', 'Gentle reading', 'Grounding prompts', 'Brain dump'],
  },
  grateful: {
    label: 'Grateful',
    emoji: '🙏',
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    darkColor: 'dark:text-rose-400 dark:bg-rose-900/30 dark:border-rose-800',
    description: 'Feeling thankful and appreciative',
    suggestedActivities: ['Gratitude journaling', 'Thank you notes', 'Appreciation lists', 'Reflection'],
  },
  tired: {
    label: 'Tired',
    emoji: '😴',
    color: 'text-slate-600 bg-slate-50 border-slate-200',
    darkColor: 'dark:text-slate-400 dark:bg-slate-900/30 dark:border-slate-800',
    description: 'Low energy, need rest',
    suggestedActivities: ['Quick capture', 'Light review', 'Voice notes', 'Simple tasks'],
  },
  peaceful: {
    label: 'Peaceful',
    emoji: '🧘',
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    darkColor: 'dark:text-teal-400 dark:bg-teal-900/30 dark:border-teal-800',
    description: 'Calm and centered',
    suggestedActivities: ['Mindful writing', 'Slow reading', 'Contemplation', 'Nature notes'],
  },
  excited: {
    label: 'Excited',
    emoji: '🎉',
    color: 'text-violet-600 bg-violet-50 border-violet-200',
    darkColor: 'dark:text-violet-400 dark:bg-violet-900/30 dark:border-violet-800',
    description: 'Thrilled and enthusiastic',
    suggestedActivities: ['Project planning', 'Idea capture', 'Creative writing', 'Goal setting'],
  },
  neutral: {
    label: 'Neutral',
    emoji: '😐',
    color: 'text-zinc-600 bg-zinc-50 border-zinc-200',
    darkColor: 'dark:text-zinc-400 dark:bg-zinc-900/30 dark:border-zinc-800',
    description: 'Just okay, nothing special',
    suggestedActivities: ['Free writing', 'Browsing', 'Light tasks', 'Catch up'],
  },
}

const MOOD_STORAGE_KEY = 'codex-mood-history'
const CURRENT_MOOD_KEY = 'codex-current-mood'

/**
 * Get current mood from storage
 * Mood persists for the entire day (resets at midnight)
 */
export function getCurrentMood(): MoodState | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(CURRENT_MOOD_KEY)
  if (!stored) return null

  try {
    const entry: MoodEntry = JSON.parse(stored)
    // Check if mood was set today (same calendar day)
    const setDate = new Date(entry.timestamp)
    const today = new Date()

    // Compare year, month, and day
    const isSameDay =
      setDate.getFullYear() === today.getFullYear() &&
      setDate.getMonth() === today.getMonth() &&
      setDate.getDate() === today.getDate()

    if (!isSameDay) {
      return null // Mood expired (was set on a different day)
    }
    return entry.mood
  } catch {
    return null
  }
}

/**
 * Set current mood
 */
export function setCurrentMood(mood: MoodState, note?: string): void {
  if (typeof window === 'undefined') return
  
  const entry: MoodEntry = {
    mood,
    timestamp: new Date().toISOString(),
    note,
  }
  
  localStorage.setItem(CURRENT_MOOD_KEY, JSON.stringify(entry))
  
  // Also add to history
  addMoodToHistory(entry)
}

/**
 * Clear current mood
 */
export function clearCurrentMood(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CURRENT_MOOD_KEY)
}

/**
 * Get mood history
 */
export function getMoodHistory(): MoodEntry[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(MOOD_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Add mood entry to history
 */
function addMoodToHistory(entry: MoodEntry): void {
  const history = getMoodHistory()
  history.push(entry)
  
  // Keep only last 100 entries
  const trimmed = history.slice(-100)
  localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(trimmed))
}

/**
 * Get mood analytics
 */
export function getMoodAnalytics(): {
  mostCommon: MoodState | null
  recentTrend: 'stable' | 'improving' | 'varying'
  totalEntries: number
  distribution: Record<MoodState, number>
} {
  const history = getMoodHistory()
  
  if (history.length === 0) {
    return {
      mostCommon: null,
      recentTrend: 'stable',
      totalEntries: 0,
      distribution: {
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
      },
    }
  }

  // Calculate distribution
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
  
  for (const entry of history) {
    distribution[entry.mood]++
  }
  
  // Find most common
  let mostCommon: MoodState | null = null
  let maxCount = 0
  for (const [mood, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count
      mostCommon = mood as MoodState
    }
  }
  
  // Analyze trend (last 5 entries)
  const recent = history.slice(-5)
  const uniqueRecentMoods = new Set(recent.map(e => e.mood))
  const recentTrend = uniqueRecentMoods.size <= 2 ? 'stable' : 'varying'
  
  return {
    mostCommon,
    recentTrend,
    totalEntries: history.length,
    distribution,
  }
}

