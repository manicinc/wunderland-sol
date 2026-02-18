/**
 * Reflect Mode
 * @module lib/reflect
 *
 * Personal journaling and reflection system.
 * Replaces and extends the daily notes functionality.
 */

// Types
export type {
  Reflection,
  ReflectionMetadata,
  ReflectionTemplate,
  ReflectionTemplateOptions,
  ReflectionTimeOfDay,
  ReflectionStreak,
  ReflectionAnalytics,
  CalendarViewMode,
  CalendarDayMarker,
  MoodTrendPoint,
  RelationshipTag,
  RelationshipCategory,
  StoredRelationship,
  LocationTag,
  WeatherCondition,
  LinkedItem,
  MigrationStatus,
  // Insight types
  InsightTier,
  SentimentType,
  InsightStatus,
  DetectedEntity,
  DetectedTheme,
  WritingPatterns,
  SentimentResult,
  ReflectionInsights,
  InsightGenerationOptions,
  InsightSettings,
  ReflectionTrends,
} from './types'

export {
  getReflectionTimeOfDay,
  REFLECTIONS_STORAGE_KEY,
  RELATIONSHIPS_STORAGE_KEY,
  REFLECTIONS_WEAVE,
  LEGACY_DAILY_NOTES_WEAVE,
  LEGACY_DAILY_NOTES_LOOM,
  MOOD_VALUES,
  MOOD_EMOJIS,
  WEATHER_EMOJIS,
} from './types'

// Store
export {
  // Date utilities
  formatDateKey,
  formatDateDisplay,
  formatDateTitle,
  parseDateKey,
  getTodayKey,
  getRelativeDateKey,

  // Path utilities
  getReflectionPath,
  getTodayReflectionPath,
  isReflectionPath,
  getDateFromPath,

  // Templates
  getReflectionTemplate,

  // Database
  initReflectionsSchema,
  getReflection,
  reflectionExists,
  saveReflection,
  updateReflectionMetadata,
  setReflectionMood,
  setReflectionSleep,
  getOrCreateReflection,

  // Queries
  getRecentReflections,
  getReflectionsInRange,
  getCalendarMarkers,

  // Analytics
  getReflectionStreak,
  getMoodTrend,

  // Relationships
  getStoredRelationships,
  trackRelationshipMention,
  getRelationshipSuggestions,
} from './reflectionStore'

// Insights
export {
  generateInsights,
  analyzeReflectionTrends,
  generateNLPInsights,
  analyzeSentimentLexicon,
  checkBERTAvailability,
} from './reflectionInsights'

// Insight Settings
export {
  getInsightSettings,
  saveInsightSettings,
  resetInsightSettings,
  getTierConfig,
  tierRequiresAPI,
  tierIsLocal,
  TIER_DISPLAY_CONFIG,
  DEFAULT_INSIGHT_SETTINGS,
} from './insightSettings'
