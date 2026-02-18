/**
 * Smart Personalized Greetings System
 * @module lib/quarry/greetings
 *
 * Provides contextual, personalized greetings based on:
 * - User's display name (defaults to "Traveler")
 * - Time of day
 * - Visit status (first time, returning, streak)
 * - Mood state
 */

import { type MoodState } from './mood'

// Re-export MoodState for backwards compatibility
export type { MoodState }

export interface GreetingContext {
  /** User's display name */
  displayName?: string
  /** Current hour (0-23) */
  hour?: number
  /** User's mood state */
  mood?: MoodState
  /** Current streak (consecutive days) */
  streak?: number
  /** Total visit count */
  visitCount?: number
  /** Is this the user's first ever visit? */
  isFirstVisit?: boolean
  /** Is this the first visit today? */
  isFirstVisitToday?: boolean
  /** Days since first visit */
  daysSinceFirstVisit?: number
  /** Total strands in codex */
  totalStrands?: number
}

// ============================================================================
// GREETING POOLS - Personalized with {name} placeholder
// ============================================================================

/**
 * First-time visitor greetings
 */
const FIRST_VISIT_GREETINGS = [
  'Welcome, {name}',
  'Greetings, {name}',
  'Hello, {name}',
  'Welcome aboard, {name}',
  'Nice to meet you, {name}',
]

const FIRST_VISIT_SUBTITLES = [
  'Your journey begins here',
  'Let\'s build your knowledge garden',
  'The Codex awaits your first strand',
  'A new chapter starts today',
  'Ready to capture your thoughts?',
]

/**
 * Returning visitor greetings (welcome back style)
 */
const RETURNING_GREETINGS = [
  'Welcome back, {name}',
  'Good to see you, {name}',
  'Hello again, {name}',
  '{name}, you\'re back',
  'Back for more, {name}?',
]

/**
 * Time-segmented greeting pools with {name} placeholder
 */
const TIME_GREETINGS = {
  // 5am - 8am: Early morning
  earlyMorning: [
    'Rise and create, {name}',
    'Early bird, {name}',
    'Fresh start, {name}',
    'Morning clarity, {name}',
    'Dawn of ideas, {name}',
  ],

  // 8am - 12pm: Morning
  morning: [
    'Good morning, {name}',
    'Morning, {name}',
    'Ready to explore, {name}?',
    'Let\'s build, {name}',
    'Ideas brewing, {name}?',
  ],

  // 12pm - 2pm: Midday
  midday: [
    'Afternoon, {name}',
    'Midday momentum, {name}',
    'Perfect timing, {name}',
    'The codex awaits, {name}',
    'Knowledge beckons, {name}',
  ],

  // 2pm - 5pm: Afternoon
  afternoon: [
    'Good afternoon, {name}',
    'Afternoon, {name}',
    'Keep creating, {name}',
    'Great minds explore, {name}',
    'Discovery time, {name}',
  ],

  // 5pm - 9pm: Evening
  evening: [
    'Good evening, {name}',
    'Evening, {name}',
    'Wind down with words, {name}',
    'Evening reflection, {name}',
    'Twilight thoughts, {name}',
  ],

  // 9pm - 12am: Night
  night: [
    'Welcome, night owl {name}',
    'Late night, {name}',
    'Nocturnal mode, {name}',
    'Night thoughts, {name}',
    'Midnight inspiration, {name}',
  ],

  // 12am - 5am: Late night/early hours
  lateNight: [
    'Late night, {name}',
    'Burning midnight oil, {name}?',
    'Night owl mode, {name}',
    'The quiet hours, {name}',
    'Deep night, {name}',
  ],
} as const

/**
 * Streak celebration messages
 */
const STREAK_GREETINGS: Record<number, string[]> = {
  3: [
    '3-day streak, {name}!',
    'On a roll, {name}!',
    'Three days strong, {name}!',
  ],
  7: [
    'Week-long streak, {name}!',
    'A full week, {name}!',
    'Seven days dedicated, {name}!',
  ],
  14: [
    'Two weeks strong, {name}!',
    'Fortnight streak, {name}!',
    'True dedication, {name}!',
  ],
  30: [
    'Monthly master, {name}!',
    'Legendary streak, {name}!',
    '30 days, {name}!',
  ],
  100: [
    'Century club, {name}!',
    '100 days, {name}!',
    'Unstoppable, {name}!',
  ],
}

const STREAK_SUBTITLES: Record<number, string[]> = {
  3: ['Keep the momentum going', 'You\'re building a habit'],
  7: ['A week of dedication', 'Habits are forming'],
  14: ['True scholar vibes', 'Knowledge compounds'],
  30: ['You\'re in the zone', 'Mastery takes consistency'],
  100: ['You\'re a legend', 'This is what dedication looks like'],
}

/**
 * Mood-enhanced subtitles
 */
const MOOD_SUBTITLES: Record<MoodState, string[]> = {
  focused: ['Deep work mode', 'Stay sharp', 'Locked in'],
  creative: ['Let imagination flow', 'Create freely', 'Art awaits'],
  curious: ['Question everything', 'Explore freely', 'Wonder awaits'],
  relaxed: ['Take your time', 'No rush', 'Peaceful exploration'],
  energetic: ['Let\'s go!', 'Full speed ahead', 'Energy flows'],
  reflective: ['Look within', 'Wisdom awaits', 'Contemplate'],
  anxious: ['One breath at a time', 'You\'ve got this', 'Take it easy'],
  grateful: ['Count your blessings', 'Appreciate today', 'Thankfulness shines'],
  tired: ['Rest when needed', 'Gentle progress', 'Small steps count'],
  peaceful: ['Inner calm', 'Serenity flows', 'Tranquil moments'],
  excited: ['Adventure awaits', 'Let\'s dive in', 'The best is coming'],
  neutral: ['', '', ''],
}

/**
 * Generic fallback subtitles
 */
const GENERIC_SUBTITLES = [
  'Your knowledge garden awaits',
  'Let\'s explore together',
  'What will you discover today?',
  'Ready to create?',
  'The Codex is yours',
]

// ============================================================================
// HELPERS
// ============================================================================

function getTimeSegment(hour: number): keyof typeof TIME_GREETINGS {
  if (hour >= 0 && hour < 5) return 'lateNight'
  if (hour >= 5 && hour < 8) return 'earlyMorning'
  if (hour >= 8 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 14) return 'midday'
  if (hour >= 14 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function interpolateName(template: string, name: string): string {
  return template.replace(/\{name\}/g, name)
}

function getTimeEmoji(hour: number): string {
  if (hour >= 0 && hour < 5) return '🌙'
  if (hour >= 5 && hour < 8) return '🌅'
  if (hour >= 8 && hour < 12) return '☀️'
  if (hour >= 12 && hour < 17) return '🌤️'
  if (hour >= 17 && hour < 21) return '🌆'
  return '🌃'
}

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Generate a smart, contextual, personalized greeting
 */
export function getSmartGreeting(context: GreetingContext = {}): string {
  const name = context.displayName || 'Traveler'
  const hour = context.hour ?? new Date().getHours()

  // First ever visit - special welcome
  if (context.isFirstVisit) {
    const template = randomFrom(FIRST_VISIT_GREETINGS)
    return interpolateName(template, name)
  }

  // Check for streak milestones (prioritize celebration)
  if (context.streak) {
    const thresholds = Object.keys(STREAK_GREETINGS).map(Number).sort((a, b) => b - a)
    for (const threshold of thresholds) {
      if (context.streak >= threshold) {
        const template = randomFrom(STREAK_GREETINGS[threshold])
        return interpolateName(template, name)
      }
    }
  }

  // Returning visitor (first visit today after being away)
  if (context.isFirstVisitToday && (context.visitCount ?? 0) > 1) {
    const template = randomFrom(RETURNING_GREETINGS)
    return interpolateName(template, name)
  }

  // Default: time-based greeting
  const segment = getTimeSegment(hour)
  const template = randomFrom(TIME_GREETINGS[segment])
  return interpolateName(template, name)
}

/**
 * Get greeting with subtitle and emoji
 */
export function getGreetingWithContext(context: GreetingContext = {}): {
  greeting: string
  subtitle?: string
  emoji?: string
} {
  const name = context.displayName || 'Traveler'
  const hour = context.hour ?? new Date().getHours()
  const greeting = getSmartGreeting(context)
  const emoji = getTimeEmoji(hour)

  let subtitle: string | undefined

  // First visit subtitle
  if (context.isFirstVisit) {
    subtitle = randomFrom(FIRST_VISIT_SUBTITLES)
    return { greeting, subtitle, emoji }
  }

  // Streak subtitle
  if (context.streak) {
    const thresholds = Object.keys(STREAK_SUBTITLES).map(Number).sort((a, b) => b - a)
    for (const threshold of thresholds) {
      if (context.streak >= threshold) {
        subtitle = randomFrom(STREAK_SUBTITLES[threshold])
        return { greeting, subtitle, emoji }
      }
    }
  }

  // Mood subtitle
  if (context.mood) {
    const moodOptions = MOOD_SUBTITLES[context.mood].filter(m => m)
    if (moodOptions.length) {
      subtitle = randomFrom(moodOptions)
      return { greeting, subtitle, emoji }
    }
  }

  // Generic subtitle
  subtitle = randomFrom(GENERIC_SUBTITLES)

  return { greeting, subtitle, emoji }
}

/**
 * Simple greeting (backward compatible)
 */
export function getGreeting(): string {
  return getSmartGreeting()
}

export default getSmartGreeting
