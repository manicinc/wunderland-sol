/**
 * Reflect Mode Types
 * @module lib/reflect/types
 *
 * Types for the Reflect mode personal journaling system.
 * Extends daily notes with rich metadata tracking.
 */

import type { MoodState, SleepHours } from '@/lib/codex/mood'
import type { SyncStatus } from '@/lib/publish/types'

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * A reflection entry (replaces/extends DailyNote concept)
 */
export interface Reflection {
  /** Date of the reflection (YYYY-MM-DD) */
  date: string
  /** Path to the strand file */
  strandPath: string
  /** Display title */
  title: string
  /** Rich metadata */
  metadata: ReflectionMetadata
  /** When the reflection was created */
  createdAt: string
  /** When the reflection was last updated */
  updatedAt: string
  /** Word count of the reflection */
  wordCount?: number
  /** The actual reflection content (markdown) */
  content?: string

  // Sync status fields for batch publishing
  /** Current sync status */
  syncStatus?: SyncStatus
  /** When the reflection was published to GitHub */
  publishedAt?: string
  /** Commit SHA of the published version */
  publishedCommit?: string
  /** Content hash of the published version */
  publishedContentHash?: string
  /** When sync was last attempted */
  lastSyncAttempt?: string
  /** Error message from last sync attempt */
  syncError?: string
  /** ID of the batch this reflection belongs to */
  batchId?: string
}

/**
 * Rich metadata for reflections
 */
export interface ReflectionMetadata {
  /** User's mood when writing */
  mood?: MoodState
  /** When mood was set */
  moodSetAt?: string
  /** Hours of sleep */
  sleepHours?: SleepHours
  /** When sleep was set */
  sleepSetAt?: string
  /** People mentioned in the reflection */
  people?: RelationshipTag[]
  /** Location where reflection was written */
  location?: LocationTag
  /** Weather conditions */
  weather?: WeatherCondition
  /** Tags/themes */
  tags?: string[]
  /** Energy level (1-5) */
  energyLevel?: number
  /** Gratitude items */
  gratitude?: string[]
  /** Intentions for the day */
  intentions?: string[]
  /** Evening reflection summary */
  reflection?: string
  /** Linked tasks/events */
  linkedItems?: LinkedItem[]
  /** AI-generated insights */
  insights?: ReflectionInsights
  /** User's self-rating for this reflection (1-5 stars) */
  userRating?: number
  /** When user rating was set */
  userRatingSetAt?: string
  /** Optional notes about the rating */
  userRatingNotes?: string
}

// ============================================================================
// RELATIONSHIP TRACKING
// ============================================================================

/**
 * A tagged person/relationship
 */
export interface RelationshipTag {
  /** Handle (e.g., @mom, @john) */
  handle: string
  /** Display name */
  name?: string
  /** Relationship category */
  category?: RelationshipCategory
  /** Notes about this person */
  notes?: string
}

/**
 * Categories for relationship tags
 */
export type RelationshipCategory =
  | 'family'
  | 'friend'
  | 'colleague'
  | 'mentor'
  | 'partner'
  | 'acquaintance'
  | 'other'

/**
 * Stored relationship for suggestions
 */
export interface StoredRelationship extends RelationshipTag {
  /** First mentioned date */
  firstMentioned: string
  /** Last mentioned date */
  lastMentioned: string
  /** Total mentions count */
  mentionCount: number
}

// ============================================================================
// LOCATION & WEATHER
// ============================================================================

/**
 * Location tag for reflections
 */
export interface LocationTag {
  /** Location name */
  name: string
  /** City */
  city?: string
  /** Country */
  country?: string
  /** Coordinates if available */
  coordinates?: {
    latitude: number
    longitude: number
  }
  /** Location type */
  type?: 'home' | 'work' | 'travel' | 'cafe' | 'nature' | 'other'
}

/**
 * Weather condition
 */
export interface WeatherCondition {
  /** Weather type */
  type: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'foggy' | 'windy' | 'clear'
  /** Temperature in Celsius */
  temperature?: number
  /** Weather description */
  description?: string
}

// ============================================================================
// LINKED ITEMS
// ============================================================================

/**
 * An item linked to the reflection
 */
export interface LinkedItem {
  /** Item type */
  type: 'task' | 'event' | 'goal' | 'strand'
  /** Item ID */
  id: string
  /** Display title */
  title: string
  /** Whether completed (for tasks) */
  completed?: boolean
}

// ============================================================================
// TIME OF DAY
// ============================================================================

/**
 * Reflection time context
 */
export type ReflectionTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

/**
 * Get the current time of day
 */
export function getReflectionTimeOfDay(): ReflectionTimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

// ============================================================================
// REFLECTION TEMPLATE
// ============================================================================

/**
 * Template for a new reflection
 */
export interface ReflectionTemplate {
  /** Title for the reflection */
  title: string
  /** Initial markdown content */
  content: string
  /** Frontmatter values */
  frontmatter: Record<string, unknown>
}

/**
 * Reflection template options
 */
export interface ReflectionTemplateOptions {
  /** Time of day for customized prompts */
  timeOfDay?: ReflectionTimeOfDay
  /** User's current mood */
  mood?: MoodState
  /** Include planner integration */
  includePlanner?: boolean
  /** Include gratitude section */
  includeGratitude?: boolean
}

// ============================================================================
// CALENDAR TYPES
// ============================================================================

/**
 * Calendar view mode
 */
export type CalendarViewMode = 'month' | 'week' | 'day'

/**
 * Calendar entry marker for showing which days have reflections
 */
export interface CalendarDayMarker {
  /** Date (YYYY-MM-DD) */
  date: string
  /** Whether a reflection exists for this day */
  hasReflection: boolean
  /** Mood if set */
  mood?: MoodState
  /** Word count if available */
  wordCount?: number
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Reflection streak data
 */
export interface ReflectionStreak {
  /** Current consecutive days */
  current: number
  /** Longest streak ever */
  longest: number
  /** Days reflected this week */
  thisWeek: number
  /** Days reflected this month */
  thisMonth: number
  /** Total reflections */
  total: number
}

/**
 * Mood trend data point
 */
export interface MoodTrendPoint {
  /** Date (YYYY-MM-DD) */
  date: string
  /** Mood if set */
  mood?: MoodState
  /** Mood as numeric value (for charts) */
  moodValue?: number
}

/**
 * Reflection analytics summary
 */
export interface ReflectionAnalytics {
  /** Streak information */
  streak: ReflectionStreak
  /** Average words per reflection */
  avgWordCount: number
  /** Most common mood */
  dominantMood?: MoodState
  /** Most mentioned people */
  topPeople: Array<{ handle: string; count: number }>
  /** Most common tags */
  topTags: Array<{ tag: string; count: number }>
  /** Preferred reflection time */
  preferredTime?: ReflectionTimeOfDay
}

// ============================================================================
// INSIGHT TYPES
// ============================================================================

/**
 * Insight generation tier
 * - llm: Cloud-based LLM (most comprehensive, requires API key)
 * - bert: Local BERT model (offline, semantic analysis)
 * - nlp: Static NLP (instant, always available)
 */
export type InsightTier = 'llm' | 'bert' | 'nlp'

/**
 * Sentiment classification
 */
export type SentimentType = 'positive' | 'neutral' | 'negative' | 'mixed'

/**
 * Insight generation status
 */
export type InsightStatus = 'pending' | 'generating' | 'complete' | 'failed'

/**
 * Detected entity in reflection content
 */
export interface DetectedEntity {
  type: 'person' | 'place' | 'event' | 'project' | 'emotion' | 'activity'
  name: string
  mentions: number
  context?: string
}

/**
 * Theme detected in reflection
 */
export interface DetectedTheme {
  name: string
  confidence: number // 0-1
  keywords: string[]
}

/**
 * Writing pattern analysis
 */
export interface WritingPatterns {
  avgSentenceLength: number
  emotionalTone: 'reflective' | 'analytical' | 'emotional' | 'neutral'
  timeOrientation: 'past' | 'present' | 'future' | 'mixed'
  questionCount: number
  exclamationCount: number
}

/**
 * Sentiment analysis result
 */
export interface SentimentResult {
  overall: SentimentType
  score: number // -1 to 1
  breakdown?: {
    positive: number
    negative: number
    neutral: number
  }
}

/**
 * Complete insights for a reflection
 */
export interface ReflectionInsights {
  // Core insights (available from all tiers)
  themes: DetectedTheme[]
  entities: DetectedEntity[]
  sentiment: SentimentResult
  keyPhrases: string[]
  suggestedTags: string[]

  // Deep insights (LLM/BERT only)
  summary?: string
  moodAlignment?: {
    matches: boolean
    explanation?: string
  }
  writingPatterns?: WritingPatterns
  actionItems?: string[]
  gratitudeItems?: string[]

  // Metadata
  tier: InsightTier
  status: InsightStatus
  generatedAt: string
  generationTimeMs: number
  error?: string
}

/**
 * Insight generation options
 */
export interface InsightGenerationOptions {
  /** Force regeneration even if insights exist */
  force?: boolean
  /** Preferred tier (will fall back if unavailable) */
  preferredTier?: InsightTier
  /** Skip LLM even if configured */
  skipLLM?: boolean
  /** Skip BERT even if available */
  skipBERT?: boolean
  /** Include writing pattern analysis */
  includePatterns?: boolean
  /** Include action item extraction */
  includeActionItems?: boolean
  /** Timeout for generation (ms) */
  timeout?: number
}

/**
 * User preferences for insight generation
 */
export interface InsightSettings {
  enabled: boolean
  autoGenerate: boolean // Generate on save vs on-demand
  preferredTier: InsightTier | 'auto'
  skipLLMForPrivacy: boolean // Never send to cloud
  includeActionItems: boolean
  includeGratitude: boolean
  includeWritingPatterns: boolean
  maxCostPerMonth?: number // LLM cost limit
}

/**
 * Cross-reflection trend analysis
 */
export interface ReflectionTrends {
  period: 'week' | 'month' | 'year'
  startDate: string
  endDate: string

  // Aggregated insights
  topThemes: Array<{ theme: string; count: number; trend: 'up' | 'down' | 'stable' }>
  topEntities: Array<{ entity: string; type: string; count: number }>
  sentimentTrend: Array<{ date: string; score: number }>
  writingVolume: Array<{ date: string; wordCount: number }>
  moodCorrelation?: {
    moodToSentiment: number // Correlation coefficient
    insight?: string
  }

  generatedAt: string
}

// ============================================================================
// TIME HIERARCHY TYPES
// ============================================================================

/**
 * Summary for a year of reflections
 */
export interface YearSummary {
  /** The year */
  year: number
  /** Total reflections this year */
  count: number
  /** Total words written */
  totalWords: number
  /** Most common mood */
  dominantMood?: MoodState
  /** Average mood value (1-5) */
  avgMoodValue?: number
}

/**
 * Summary for a month of reflections
 */
export interface MonthSummary {
  /** Year */
  year: number
  /** Month (1-12) */
  month: number
  /** Month name (e.g., "January") */
  monthName: string
  /** Total reflections this month */
  count: number
  /** Total words written */
  totalWords: number
  /** Most common mood */
  dominantMood?: MoodState
  /** Average mood value (1-5) */
  avgMoodValue?: number
}

/**
 * Summary for a week of reflections
 */
export interface WeekSummary {
  /** Year */
  year: number
  /** Month (1-12) */
  month: number
  /** ISO week number (1-53) */
  weekNumber: number
  /** Start date of the week (YYYY-MM-DD) */
  startDate: string
  /** End date of the week (YYYY-MM-DD) */
  endDate: string
  /** Total reflections this week */
  count: number
  /** The reflections in this week */
  reflections: Reflection[]
  /** Most common mood */
  dominantMood?: MoodState
}

// ============================================================================
// MIGRATION TYPES
// ============================================================================

/**
 * Migration status from old daily notes
 */
export interface MigrationStatus {
  /** Whether migration is complete */
  completed: boolean
  /** Number of notes migrated */
  migratedCount: number
  /** Errors during migration */
  errors: string[]
  /** Migration timestamp */
  migratedAt?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Storage key for reflections
 */
export const REFLECTIONS_STORAGE_KEY = 'codex-reflections'

/**
 * Storage key for relationships
 */
export const RELATIONSHIPS_STORAGE_KEY = 'codex-relationships'

/**
 * Default reflection weave path
 */
export const REFLECTIONS_WEAVE = 'reflections'

/**
 * Legacy daily notes weave path (for migration)
 */
export const LEGACY_DAILY_NOTES_WEAVE = 'journal'
export const LEGACY_DAILY_NOTES_LOOM = 'daily'

/**
 * Mood to numeric value mapping (for charts)
 * Scale: 1-5 where higher = more positive/energetic
 */
export const MOOD_VALUES: Record<MoodState, number> = {
  focused: 4,
  creative: 5,
  curious: 4,
  relaxed: 3,
  energetic: 5,
  reflective: 3,
  anxious: 2,
  grateful: 5,
  tired: 2,
  peaceful: 4,
  excited: 5,
  neutral: 3,
}

/**
 * Mood emoji mapping (fallback for simple displays)
 */
export const MOOD_EMOJIS: Record<MoodState, string> = {
  focused: '🎯',
  creative: '🎨',
  curious: '🔍',
  relaxed: '😌',
  energetic: '⚡',
  reflective: '💭',
  anxious: '😰',
  grateful: '🙏',
  tired: '😴',
  peaceful: '🧘',
  excited: '🎉',
  neutral: '😐',
}

/**
 * Enhanced mood configuration for the mood selector
 */
export interface MoodDisplayConfig {
  id: MoodState
  label: string
  color: string
  description: string
}

/**
 * Mood display configurations for the enhanced mood selector
 */
export const MOOD_DISPLAY_CONFIG: MoodDisplayConfig[] = [
  { id: 'focused', label: 'Focused', color: '#06b6d4', description: 'In the zone' },
  { id: 'creative', label: 'Creative', color: '#ec4899', description: 'Feeling inspired' },
  { id: 'curious', label: 'Curious', color: '#f59e0b', description: 'Want to explore' },
  { id: 'relaxed', label: 'Relaxed', color: '#22c55e', description: 'Taking it easy' },
  { id: 'energetic', label: 'Energetic', color: '#eab308', description: 'Full of energy' },
  { id: 'reflective', label: 'Reflective', color: '#a855f7', description: 'Deep in thought' },
  { id: 'anxious', label: 'Anxious', color: '#f97316', description: 'Feeling worried' },
  { id: 'grateful', label: 'Grateful', color: '#f43f5e', description: 'Thankful' },
  { id: 'tired', label: 'Tired', color: '#64748b', description: 'Low energy' },
  { id: 'peaceful', label: 'Peaceful', color: '#14b8a6', description: 'Calm & centered' },
  { id: 'excited', label: 'Excited', color: '#8b5cf6', description: 'Can\'t wait!' },
  { id: 'neutral', label: 'Neutral', color: '#71717a', description: 'Just okay' },
]

/**
 * Weather emoji mapping
 */
export const WEATHER_EMOJIS: Record<WeatherCondition['type'], string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  snowy: '❄️',
  stormy: '⛈️',
  foggy: '🌫️',
  windy: '💨',
  clear: '🌙',
}
