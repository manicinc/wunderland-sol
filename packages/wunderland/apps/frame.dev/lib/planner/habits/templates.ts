/**
 * Habit Templates
 *
 * Pre-built habit templates for common daily and weekly habits.
 * These help users quickly set up habits with sensible defaults.
 *
 * @module lib/planner/habits/templates
 */

import type { RecurrenceRule } from '../types'
import type { HabitFrequency } from './types'

// ============================================================================
// TYPES
// ============================================================================

export type HabitCategory =
  | 'health'
  | 'learning'
  | 'productivity'
  | 'mindfulness'
  | 'social'
  | 'creative'
  | 'finance'
  | 'ritual'
  | 'other'

export interface HabitTemplate {
  /** Unique template ID */
  id: string
  /** Habit title */
  title: string
  /** Category for grouping */
  category: HabitCategory
  /** Short description */
  description: string
  /** Frequency of the habit */
  frequency: HabitFrequency
  /** Recurrence rule for task creation */
  recurrenceRule: RecurrenceRule
  /** Suggested time of day */
  preferredTime?: string
  /** Target count per occurrence */
  targetCount: number
  /** Duration estimate in minutes */
  estimatedDuration?: number
  /** Motivational tip */
  tip?: string
  /** Icon name (Lucide) */
  icon: string
  /** Whether this is featured/popular */
  featured?: boolean
  /** Whether this template surfaces notes (rituals) */
  surfacesNotes?: boolean
  /** Ritual type for lifecycle integration */
  ritualType?: 'morning' | 'evening'
}

// ============================================================================
// DAILY HABITS
// ============================================================================

export const DAILY_HABITS: HabitTemplate[] = [
  // Health
  {
    id: 'morning-water',
    title: 'Drink a glass of water',
    category: 'health',
    description: 'Start your day hydrated',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '07:00',
    targetCount: 1,
    estimatedDuration: 2,
    tip: 'Keep water by your bedside to drink immediately after waking',
    icon: 'Droplets',
    featured: true,
  },
  {
    id: 'exercise-30min',
    title: 'Exercise for 30 minutes',
    category: 'health',
    description: 'Move your body daily',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '07:30',
    targetCount: 1,
    estimatedDuration: 30,
    tip: 'Any movement counts - walking, stretching, or a full workout',
    icon: 'Dumbbell',
    featured: true,
  },
  {
    id: 'walk-10k-steps',
    title: 'Walk 10,000 steps',
    category: 'health',
    description: 'Stay active throughout the day',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    targetCount: 1,
    tip: 'Take walking meetings or use stairs instead of elevators',
    icon: 'Footprints',
  },
  {
    id: 'healthy-breakfast',
    title: 'Eat a healthy breakfast',
    category: 'health',
    description: 'Fuel your morning right',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '08:00',
    targetCount: 1,
    estimatedDuration: 20,
    icon: 'Apple',
  },
  {
    id: 'sleep-8h',
    title: 'Sleep 8 hours',
    category: 'health',
    description: 'Prioritize rest and recovery',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '22:00',
    targetCount: 1,
    tip: 'Set a consistent bedtime alarm',
    icon: 'Moon',
  },
  {
    id: 'no-phone-morning',
    title: 'No phone for first hour',
    category: 'health',
    description: 'Start your day without screens',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '07:00',
    targetCount: 1,
    estimatedDuration: 60,
    tip: 'Charge your phone outside the bedroom',
    icon: 'SmartphoneOff',
  },

  // Learning
  {
    id: 'read-30min',
    title: 'Read for 30 minutes',
    category: 'learning',
    description: 'Expand your knowledge daily',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '21:00',
    targetCount: 1,
    estimatedDuration: 30,
    tip: 'Replace scrolling time with reading time',
    icon: 'Book',
    featured: true,
  },
  {
    id: 'learn-language',
    title: 'Practice a language',
    category: 'learning',
    description: 'Learn something new every day',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    targetCount: 1,
    estimatedDuration: 15,
    tip: 'Use apps like Duolingo during commute time',
    icon: 'Languages',
  },
  {
    id: 'learn-skill',
    title: 'Practice a skill',
    category: 'learning',
    description: 'Deliberate practice builds mastery',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    targetCount: 1,
    estimatedDuration: 30,
    icon: 'GraduationCap',
  },

  // Productivity
  {
    id: 'plan-day',
    title: 'Plan your day',
    category: 'productivity',
    description: 'Set intentions each morning',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '08:00',
    targetCount: 1,
    estimatedDuration: 10,
    tip: 'Identify your top 3 priorities for the day',
    icon: 'ListChecks',
    featured: true,
  },
  {
    id: 'inbox-zero',
    title: 'Process inbox to zero',
    category: 'productivity',
    description: 'Stay on top of communications',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '17:00',
    targetCount: 1,
    estimatedDuration: 30,
    tip: 'Batch email processing to specific times',
    icon: 'Inbox',
  },
  {
    id: 'deep-work',
    title: 'Deep work session',
    category: 'productivity',
    description: 'Focused work without distractions',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '09:00',
    targetCount: 1,
    estimatedDuration: 90,
    tip: 'Block distractions and set a timer',
    icon: 'Focus',
  },
  {
    id: 'review-day',
    title: 'Evening review',
    category: 'productivity',
    description: 'Reflect on what you accomplished',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '21:00',
    targetCount: 1,
    estimatedDuration: 10,
    tip: 'Note wins, lessons, and tomorrow\'s focus',
    icon: 'ClipboardCheck',
  },

  // Mindfulness
  {
    id: 'meditate-10min',
    title: 'Meditate for 10 minutes',
    category: 'mindfulness',
    description: 'Center yourself with mindfulness',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '07:00',
    targetCount: 1,
    estimatedDuration: 10,
    tip: 'Start with guided meditations if you\'re new',
    icon: 'Brain',
    featured: true,
  },
  {
    id: 'gratitude-journal',
    title: 'Write 3 gratitudes',
    category: 'mindfulness',
    description: 'Cultivate appreciation',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '21:30',
    targetCount: 3,
    estimatedDuration: 5,
    tip: 'Be specific about what you\'re grateful for',
    icon: 'Heart',
    featured: true,
  },
  {
    id: 'breathe-5min',
    title: 'Breathing exercises',
    category: 'mindfulness',
    description: 'Calm your nervous system',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    targetCount: 1,
    estimatedDuration: 5,
    tip: 'Try box breathing: 4 seconds in, hold, out, hold',
    icon: 'Wind',
  },
  {
    id: 'journal',
    title: 'Journal for 10 minutes',
    category: 'mindfulness',
    description: 'Process thoughts through writing',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '21:00',
    targetCount: 1,
    estimatedDuration: 10,
    tip: 'Free write without judgment',
    icon: 'PenLine',
  },

  // Social
  {
    id: 'connect-friend',
    title: 'Reach out to a friend',
    category: 'social',
    description: 'Maintain important relationships',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    targetCount: 1,
    estimatedDuration: 10,
    tip: 'A quick text counts - it\'s the thought that matters',
    icon: 'MessageCircle',
  },
  {
    id: 'compliment',
    title: 'Give a genuine compliment',
    category: 'social',
    description: 'Spread positivity',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    targetCount: 1,
    tip: 'Be specific and authentic',
    icon: 'Sparkles',
  },

  // Creative
  {
    id: 'write-500words',
    title: 'Write 500 words',
    category: 'creative',
    description: 'Build a writing habit',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    targetCount: 1,
    estimatedDuration: 30,
    tip: 'Don\'t edit while writing - just get words down',
    icon: 'FileText',
  },
  {
    id: 'sketch',
    title: 'Sketch or draw',
    category: 'creative',
    description: 'Express yourself visually',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    targetCount: 1,
    estimatedDuration: 15,
    tip: 'Quantity over quality - fill pages!',
    icon: 'Pencil',
  },

  // Finance
  {
    id: 'track-spending',
    title: 'Log daily expenses',
    category: 'finance',
    description: 'Know where your money goes',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '20:00',
    targetCount: 1,
    estimatedDuration: 5,
    tip: 'Do it right after each purchase or in the evening',
    icon: 'Receipt',
  },
  {
    id: 'no-impulse-buy',
    title: 'No impulse purchases',
    category: 'finance',
    description: 'Wait 24 hours before buying',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    targetCount: 1,
    tip: 'Add items to a wishlist instead of cart',
    icon: 'ShoppingCart',
  },
]

// ============================================================================
// WEEKLY HABITS
// ============================================================================

export const WEEKLY_HABITS: HabitTemplate[] = [
  // Health
  {
    id: 'meal-prep',
    title: 'Meal prep for the week',
    category: 'health',
    description: 'Prepare healthy meals in advance',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [0] }, // Sunday
    preferredTime: '10:00',
    targetCount: 1,
    estimatedDuration: 120,
    tip: 'Prep ingredients on Sunday for easy weeknight cooking',
    icon: 'ChefHat',
    featured: true,
  },
  {
    id: 'long-workout',
    title: 'Long workout or sports',
    category: 'health',
    description: 'Extended physical activity',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [6] }, // Saturday
    targetCount: 1,
    estimatedDuration: 60,
    icon: 'Activity',
  },
  {
    id: 'nature-time',
    title: 'Spend time in nature',
    category: 'health',
    description: 'Get outdoors for mental health',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1 },
    targetCount: 1,
    estimatedDuration: 60,
    tip: 'Even a 20-minute walk in a park counts',
    icon: 'TreePine',
  },

  // Learning
  {
    id: 'online-course',
    title: 'Complete a course lesson',
    category: 'learning',
    description: 'Structured learning progress',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1 },
    targetCount: 1,
    estimatedDuration: 60,
    tip: 'Block time on your calendar for learning',
    icon: 'MonitorPlay',
  },
  {
    id: 'book-summary',
    title: 'Review and summarize reading',
    category: 'learning',
    description: 'Consolidate what you learned',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [0] }, // Sunday
    targetCount: 1,
    estimatedDuration: 30,
    tip: 'Write key insights in your own words',
    icon: 'FileSpreadsheet',
  },

  // Productivity
  {
    id: 'weekly-review',
    title: 'Weekly review',
    category: 'productivity',
    description: 'Review progress and plan ahead',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [0] }, // Sunday
    preferredTime: '18:00',
    targetCount: 1,
    estimatedDuration: 45,
    tip: 'Review goals, clear inboxes, plan next week',
    icon: 'CalendarCheck',
    featured: true,
  },
  {
    id: 'digital-cleanup',
    title: 'Digital declutter',
    category: 'productivity',
    description: 'Organize files and clear downloads',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [5] }, // Friday
    targetCount: 1,
    estimatedDuration: 20,
    tip: 'Delete, organize, or archive - don\'t just move',
    icon: 'FolderSync',
  },
  {
    id: 'backup-data',
    title: 'Backup important data',
    category: 'productivity',
    description: 'Protect your important files',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [0] }, // Sunday
    targetCount: 1,
    estimatedDuration: 15,
    icon: 'HardDrive',
  },

  // Social
  {
    id: 'call-family',
    title: 'Call family member',
    category: 'social',
    description: 'Stay connected with family',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1 },
    targetCount: 1,
    estimatedDuration: 30,
    tip: 'Schedule a regular time that works for everyone',
    icon: 'Phone',
    featured: true,
  },
  {
    id: 'social-event',
    title: 'Attend a social event',
    category: 'social',
    description: 'Meet people and build connections',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1 },
    targetCount: 1,
    tip: 'Say yes to invitations or organize your own',
    icon: 'Users',
  },
  {
    id: 'date-night',
    title: 'Date night',
    category: 'social',
    description: 'Quality time with partner',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [5] }, // Friday
    targetCount: 1,
    estimatedDuration: 120,
    tip: 'Put it on the calendar - treat it as sacred',
    icon: 'Heart',
  },

  // Finance
  {
    id: 'review-budget',
    title: 'Review weekly spending',
    category: 'finance',
    description: 'Check budget vs actual',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [0] }, // Sunday
    targetCount: 1,
    estimatedDuration: 15,
    tip: 'Look for patterns and areas to improve',
    icon: 'PieChart',
    featured: true,
  },
  {
    id: 'invest',
    title: 'Review investments',
    category: 'finance',
    description: 'Check portfolio and automate contributions',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1 },
    targetCount: 1,
    estimatedDuration: 15,
    icon: 'TrendingUp',
  },

  // Creative
  {
    id: 'creative-project',
    title: 'Work on creative project',
    category: 'creative',
    description: 'Dedicated time for creativity',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1 },
    targetCount: 1,
    estimatedDuration: 120,
    tip: 'Block distraction-free time for deep creative work',
    icon: 'Palette',
  },
  {
    id: 'learn-instrument',
    title: 'Practice an instrument',
    category: 'creative',
    description: 'Develop musical skills',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1 },
    targetCount: 1,
    estimatedDuration: 30,
    tip: 'Consistency beats intensity - short sessions add up',
    icon: 'Music',
  },

  // Mindfulness
  {
    id: 'digital-detox',
    title: 'Digital detox day',
    category: 'mindfulness',
    description: 'Unplug for mental clarity',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [6] }, // Saturday
    targetCount: 1,
    tip: 'Even a half-day without screens helps',
    icon: 'Unplug',
  },
  {
    id: 'long-meditation',
    title: 'Extended meditation',
    category: 'mindfulness',
    description: 'Deeper meditation practice',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1 },
    targetCount: 1,
    estimatedDuration: 30,
    tip: 'Try a guided meditation retreat or longer session',
    icon: 'Flower2',
  },

  // Other
  {
    id: 'clean-space',
    title: 'Deep clean living space',
    category: 'other',
    description: 'Maintain a tidy environment',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [6] }, // Saturday
    targetCount: 1,
    estimatedDuration: 60,
    tip: 'A clean space leads to a clear mind',
    icon: 'Sparkles',
  },
  {
    id: 'plan-week',
    title: 'Plan the upcoming week',
    category: 'productivity',
    description: 'Set goals and schedule priorities',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [0] }, // Sunday
    preferredTime: '19:00',
    targetCount: 1,
    estimatedDuration: 30,
    tip: 'Review calendar, set 3 weekly priorities',
    icon: 'Calendar',
  },
]

// ============================================================================
// WEEKDAY HABITS
// ============================================================================

export const WEEKDAY_HABITS: HabitTemplate[] = [
  {
    id: 'morning-routine',
    title: 'Complete morning routine',
    category: 'productivity',
    description: 'Start workdays strong',
    frequency: 'weekdays',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [1, 2, 3, 4, 5] },
    preferredTime: '06:30',
    targetCount: 1,
    estimatedDuration: 60,
    tip: 'Consistent mornings lead to productive days',
    icon: 'Sunrise',
    featured: true,
  },
  {
    id: 'standup-prep',
    title: 'Prepare for standup',
    category: 'productivity',
    description: 'Review yesterday and plan today',
    frequency: 'weekdays',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [1, 2, 3, 4, 5] },
    preferredTime: '08:45',
    targetCount: 1,
    estimatedDuration: 5,
    icon: 'ListTodo',
  },
  {
    id: 'pomodoro-3',
    title: 'Complete 3 Pomodoros',
    category: 'productivity',
    description: 'Focused work blocks',
    frequency: 'weekdays',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [1, 2, 3, 4, 5] },
    targetCount: 3,
    estimatedDuration: 90,
    tip: '25 min work + 5 min break = 1 Pomodoro',
    icon: 'Timer',
  },
  {
    id: 'lunch-break',
    title: 'Take a proper lunch break',
    category: 'health',
    description: 'Step away from work to recharge',
    frequency: 'weekdays',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [1, 2, 3, 4, 5] },
    preferredTime: '12:00',
    targetCount: 1,
    estimatedDuration: 30,
    tip: 'Eat away from your desk',
    icon: 'Utensils',
  },
  {
    id: 'end-of-day-shutdown',
    title: 'End of day shutdown',
    category: 'productivity',
    description: 'Close loops and plan tomorrow',
    frequency: 'weekdays',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [1, 2, 3, 4, 5] },
    preferredTime: '17:30',
    targetCount: 1,
    estimatedDuration: 15,
    tip: 'Clear desk, close tabs, write tomorrow\'s top 3',
    icon: 'LogOut',
  },
]

// ============================================================================
// RITUAL HABITS (Lifecycle Integration)
// ============================================================================

export const RITUAL_HABITS: HabitTemplate[] = [
  {
    id: 'ritual-morning-setup',
    title: 'Morning Setup',
    category: 'ritual',
    description: 'Review intentions and surface relevant notes for the day',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '08:00',
    targetCount: 1,
    estimatedDuration: 10,
    tip: 'Start your day by reviewing fading notes and setting intentions',
    icon: 'Sunrise',
    featured: true,
    surfacesNotes: true,
    ritualType: 'morning',
  },
  {
    id: 'ritual-evening-reflection',
    title: 'Evening Reflection',
    category: 'ritual',
    description: 'Review what you worked on and capture insights',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '20:00',
    targetCount: 1,
    estimatedDuration: 10,
    tip: 'End your day by marking notes as reviewed and forming connections',
    icon: 'Sunset',
    featured: true,
    surfacesNotes: true,
    ritualType: 'evening',
  },
  {
    id: 'ritual-weekly-review',
    title: 'Weekly Knowledge Review',
    category: 'ritual',
    description: 'Review faded strands and connections from the week',
    frequency: 'weekly',
    recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [0] }, // Sunday
    preferredTime: '10:00',
    targetCount: 1,
    estimatedDuration: 20,
    tip: 'Resurface important notes before they fade completely',
    icon: 'Calendar',
    surfacesNotes: true,
  },
  {
    id: 'ritual-focus-session',
    title: 'Deep Focus Session',
    category: 'ritual',
    description: 'Dedicated time for deep work with related notes',
    frequency: 'daily',
    recurrenceRule: { frequency: 'daily', interval: 1 },
    preferredTime: '09:00',
    targetCount: 1,
    estimatedDuration: 90,
    tip: 'Surface notes related to your current project',
    icon: 'Target',
    surfacesNotes: true,
  },
]

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get all templates
 */
export function getAllTemplates(): HabitTemplate[] {
  return [...DAILY_HABITS, ...WEEKLY_HABITS, ...WEEKDAY_HABITS, ...RITUAL_HABITS]
}

/**
 * Get featured templates
 */
export function getFeaturedTemplates(): HabitTemplate[] {
  return getAllTemplates().filter((t) => t.featured)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: HabitCategory): HabitTemplate[] {
  return getAllTemplates().filter((t) => t.category === category)
}

/**
 * Get templates by frequency
 */
export function getTemplatesByFrequency(frequency: HabitFrequency): HabitTemplate[] {
  return getAllTemplates().filter((t) => t.frequency === frequency)
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): HabitTemplate | undefined {
  return getAllTemplates().find((t) => t.id === id)
}

/**
 * Get category display info
 */
export function getCategoryInfo(category: HabitCategory): { label: string; color: string; icon: string } {
  const info: Record<HabitCategory, { label: string; color: string; icon: string }> = {
    health: { label: 'Health', color: '#10b981', icon: 'Heart' },
    learning: { label: 'Learning', color: '#3b82f6', icon: 'BookOpen' },
    productivity: { label: 'Productivity', color: '#f59e0b', icon: 'Zap' },
    mindfulness: { label: 'Mindfulness', color: '#8b5cf6', icon: 'Brain' },
    social: { label: 'Social', color: '#ec4899', icon: 'Users' },
    creative: { label: 'Creative', color: '#06b6d4', icon: 'Palette' },
    finance: { label: 'Finance', color: '#84cc16', icon: 'Wallet' },
    ritual: { label: 'Rituals', color: '#14b8a6', icon: 'Sparkles' },
    other: { label: 'Other', color: '#71717a', icon: 'MoreHorizontal' },
  }
  return info[category]
}

/**
 * Get ritual templates that surface notes
 */
export function getRitualTemplates(): HabitTemplate[] {
  return getAllTemplates().filter((t) => t.surfacesNotes === true)
}

/**
 * Check if a template is a ritual that surfaces notes
 */
export function isRitualTemplate(template: HabitTemplate): boolean {
  return template.surfacesNotes === true
}

/**
 * Search templates
 */
export function searchTemplates(query: string): HabitTemplate[] {
  const lower = query.toLowerCase()
  return getAllTemplates().filter(
    (t) =>
      t.title.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.category.toLowerCase().includes(lower)
  )
}
