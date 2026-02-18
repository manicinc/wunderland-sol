/**
 * Feature Gates
 *
 * Provides gating logic for premium features. Used to conditionally
 * render components and control access to paid functionality.
 *
 * Premium Features (require license):
 * - Quizzes
 * - Flashcards (FSRS spaced repetition)
 * - Q&A Generation
 * - Export/Import (ZIP archives)
 * - Advanced Themes
 *
 * Free Features (always available):
 * - Spiral Path Learning
 * - Semantic Search
 * - Bookmarks & History
 * - Knowledge Graph
 * - Reading Progress
 *
 * @module lib/config/featureGates
 */

import { getFeatureFlags, type FeatureFlags } from './featureFlags'

// ============================================================================
// FEATURE DEFINITIONS
// ============================================================================

/**
 * All gatable features
 */
export const Features = {
  // Premium features (gated)
  QUIZZES: 'quizzes',
  FLASHCARDS: 'flashcards',
  QNA: 'qna',
  EXPORT: 'export',
  ADVANCED_THEMES: 'advanced_themes',
  OFFLINE_MODE: 'offline_mode',
  DESKTOP_APP: 'desktop_app',
  MOBILE_APP: 'mobile_app',
  GAMIFICATION: 'gamification',
  AI_GENERATION: 'ai_generation',
  LEARNING_STUDIO: 'learning_studio',

  // FABRIC community features
  PLUGINS: 'plugins',

  // Free features (always enabled)
  SPIRAL_PATH: 'spiral_path',
  SEMANTIC_SEARCH: 'semantic_search',
  BOOKMARKS: 'bookmarks',
  KNOWLEDGE_GRAPH: 'knowledge_graph',
  READING_PROGRESS: 'reading_progress',
  GITHUB_INTEGRATION: 'github_integration',
} as const

export type Feature = (typeof Features)[keyof typeof Features]

/**
 * Features that require a premium license
 */
export const PREMIUM_FEATURES: Feature[] = [
  Features.QUIZZES,
  Features.FLASHCARDS,
  Features.QNA,
  Features.EXPORT,
  Features.ADVANCED_THEMES,
  Features.OFFLINE_MODE,
  Features.DESKTOP_APP,
  Features.MOBILE_APP,
  Features.GAMIFICATION,
  Features.AI_GENERATION,
  Features.LEARNING_STUDIO,
]

/**
 * Features that are always free (includes FABRIC community features)
 */
export const FREE_FEATURES: Feature[] = [
  Features.SPIRAL_PATH,
  Features.SEMANTIC_SEARCH,
  Features.BOOKMARKS,
  Features.KNOWLEDGE_GRAPH,
  Features.READING_PROGRESS,
  Features.GITHUB_INTEGRATION,
  Features.PLUGINS,
]

// ============================================================================
// DEVELOPMENT MODE DETECTION
// ============================================================================

/**
 * Check if we're in local development mode (localhost or Electron)
 * This allows all features to be enabled for development/testing
 */
function isLocalDevelopment(): boolean {
  if (typeof window === 'undefined') return false

  // Cast to avoid TypeScript narrowing issues
  const win = window as Window & typeof globalThis & { electronAPI?: unknown }

  // Check for Electron app
  if (win.electronAPI) {
    return true
  }

  // Check for localhost
  const hostname = win.location?.hostname || ''
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true
  }

  // Check for NODE_ENV (set during development builds)
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    return true
  }

  return false
}

// ============================================================================
// FEATURE CHECKING
// ============================================================================

/**
 * Map feature to flag name
 */
function featureToFlag(
  feature: Feature
): keyof FeatureFlags | null {
  const mapping: Partial<Record<Feature, keyof FeatureFlags>> = {
    [Features.QUIZZES]: 'enableQuizzes',
    [Features.FLASHCARDS]: 'enableFlashcards',
    [Features.QNA]: 'enableQnA',
    [Features.EXPORT]: 'enableExport',
    [Features.ADVANCED_THEMES]: 'enableAdvancedThemes',
    [Features.GAMIFICATION]: 'enableGamification',
    [Features.AI_GENERATION]: 'enableAIGeneration',
    [Features.LEARNING_STUDIO]: 'enableLearningStudio',
    [Features.PLUGINS]: 'enablePlugins',
    [Features.SPIRAL_PATH]: 'enableSpiralPath',
    [Features.SEMANTIC_SEARCH]: 'enableSemanticSearch',
    [Features.BOOKMARKS]: 'enableBookmarks',
    [Features.KNOWLEDGE_GRAPH]: 'enableKnowledgeGraph',
    [Features.READING_PROGRESS]: 'enableReadingProgress',
    [Features.OFFLINE_MODE]: 'isOfflineMode',
  }
  return mapping[feature] ?? null
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: Feature): boolean {
  // Local development mode enables all features (Electron or localhost)
  if (isLocalDevelopment()) {
    return true
  }

  // Free features are always enabled
  if (FREE_FEATURES.includes(feature)) {
    return true
  }

  const flags = getFeatureFlags()

  // Check if premium build or valid license
  const hasPremiumAccess = flags.isPaidVersion || flags.licenseValid

  // Platform-specific features
  if (feature === Features.DESKTOP_APP) {
    return hasPremiumAccess && flags.platform === 'electron'
  }
  if (feature === Features.MOBILE_APP) {
    return hasPremiumAccess && flags.platform === 'capacitor'
  }
  if (feature === Features.OFFLINE_MODE) {
    return hasPremiumAccess && flags.isOfflineMode
  }

  // Standard feature flag check
  const flagName = featureToFlag(feature)
  if (flagName && flagName in flags) {
    return flags[flagName] as boolean
  }

  // Default: premium features require premium access
  if (PREMIUM_FEATURES.includes(feature)) {
    return hasPremiumAccess
  }

  return false
}

/**
 * Check if user has premium access (paid or licensed)
 */
export function hasPremiumAccess(): boolean {
  // Local development mode grants premium access
  if (isLocalDevelopment()) {
    return true
  }

  const flags = getFeatureFlags()
  return flags.isPaidVersion || flags.licenseValid
}

/**
 * Check if user is in offline mode
 */
export function isOfflineMode(): boolean {
  const flags = getFeatureFlags()
  return flags.isOfflineMode
}

/**
 * Get list of enabled features
 */
export function getEnabledFeatures(): Feature[] {
  return [...PREMIUM_FEATURES, ...FREE_FEATURES].filter(isFeatureEnabled)
}

/**
 * Get list of disabled features (for upgrade prompts)
 */
export function getDisabledFeatures(): Feature[] {
  return PREMIUM_FEATURES.filter((f) => !isFeatureEnabled(f))
}

// ============================================================================
// REACT COMPONENTS
// ============================================================================

/**
 * Props for FeatureGate component
 */
export interface FeatureGateProps {
  /** Feature(s) required */
  feature: Feature | Feature[]
  /** Require all features (AND) or any feature (OR) */
  requireAll?: boolean
  /** Content to render if feature is enabled */
  children: React.ReactNode
  /** Fallback content if feature is disabled */
  fallback?: React.ReactNode
}

/**
 * Gate component for conditional rendering based on features
 *
 * Usage:
 * ```tsx
 * <FeatureGate feature={Features.QUIZZES} fallback={<UpgradePrompt />}>
 *   <QuizComponent />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  requireAll = true,
  children,
  fallback = null,
}: FeatureGateProps): React.ReactNode {
  const features = Array.isArray(feature) ? feature : [feature]

  const isEnabled = requireAll
    ? features.every(isFeatureEnabled)
    : features.some(isFeatureEnabled)

  return isEnabled ? children : fallback
}

/**
 * Props for PremiumGate component
 */
export interface PremiumGateProps {
  /** Content to render if premium */
  children: React.ReactNode
  /** Fallback content if not premium */
  fallback?: React.ReactNode
}

/**
 * Simple gate for premium-only content
 *
 * Usage:
 * ```tsx
 * <PremiumGate fallback={<UpgradeBanner />}>
 *   <PremiumFeature />
 * </PremiumGate>
 * ```
 */
export function PremiumGate({
  children,
  fallback = null,
}: PremiumGateProps): React.ReactNode {
  return hasPremiumAccess() ? children : fallback
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to check if a feature is enabled
 *
 * Usage:
 * ```tsx
 * const canExport = useFeature(Features.EXPORT)
 * ```
 */
export function useFeature(feature: Feature): boolean {
  // In a full implementation, this would use React state
  // and listen for license/flag changes
  return isFeatureEnabled(feature)
}

/**
 * Hook to check multiple features
 *
 * Usage:
 * ```tsx
 * const { quizzes, flashcards } = useFeatures([Features.QUIZZES, Features.FLASHCARDS])
 * ```
 */
export function useFeatures(
  features: Feature[]
): Record<Feature, boolean> {
  const result: Partial<Record<Feature, boolean>> = {}
  for (const feature of features) {
    result[feature] = isFeatureEnabled(feature)
  }
  return result as Record<Feature, boolean>
}

/**
 * Hook for premium access status
 *
 * Usage:
 * ```tsx
 * const { isPremium, disabledFeatures } = usePremiumStatus()
 * ```
 */
export function usePremiumStatus() {
  const flags = getFeatureFlags()
  return {
    isPremium: hasPremiumAccess(),
    isLicensed: flags.licenseValid,
    licenseType: flags.licenseType,
    licenseExpiry: flags.licenseExpiry,
    disabledFeatures: getDisabledFeatures(),
  }
}

// ============================================================================
// UPGRADE PROMPTS
// ============================================================================

/**
 * Feature upgrade information for prompts
 */
export interface FeatureInfo {
  name: string
  description: string
  icon: string
}

/**
 * Get information about a feature for upgrade prompts
 */
export function getFeatureInfo(feature: Feature): FeatureInfo {
  const info: Record<Feature, FeatureInfo> = {
    [Features.QUIZZES]: {
      name: 'Quizzes',
      description: 'Generate quizzes from your knowledge base',
      icon: 'help-circle',
    },
    [Features.FLASHCARDS]: {
      name: 'Flashcards',
      description: 'FSRS spaced repetition for optimal learning',
      icon: 'layers',
    },
    [Features.QNA]: {
      name: 'Q&A Generation',
      description: 'AI-generated questions and answers',
      icon: 'message-circle',
    },
    [Features.EXPORT]: {
      name: 'Export/Import',
      description: 'Backup and transfer your entire library',
      icon: 'download',
    },
    [Features.ADVANCED_THEMES]: {
      name: 'Advanced Themes',
      description: 'Premium visual themes and customization',
      icon: 'palette',
    },
    [Features.OFFLINE_MODE]: {
      name: 'Offline Mode',
      description: 'Access your knowledge without internet',
      icon: 'wifi-off',
    },
    [Features.DESKTOP_APP]: {
      name: 'Desktop App',
      description: 'Native app for Windows, Mac, and Linux',
      icon: 'monitor',
    },
    [Features.MOBILE_APP]: {
      name: 'Mobile App',
      description: 'Native app for iOS and Android',
      icon: 'smartphone',
    },
    [Features.SPIRAL_PATH]: {
      name: 'Spiral Path',
      description: 'Guided learning journeys',
      icon: 'target',
    },
    [Features.SEMANTIC_SEARCH]: {
      name: 'Semantic Search',
      description: 'AI-powered content discovery',
      icon: 'search',
    },
    [Features.BOOKMARKS]: {
      name: 'Bookmarks',
      description: 'Save and organize favorites',
      icon: 'bookmark',
    },
    [Features.KNOWLEDGE_GRAPH]: {
      name: 'Knowledge Graph',
      description: 'Visual connections between concepts',
      icon: 'git-branch',
    },
    [Features.READING_PROGRESS]: {
      name: 'Reading Progress',
      description: 'Track your learning journey',
      icon: 'book-open',
    },
    [Features.GITHUB_INTEGRATION]: {
      name: 'GitHub Integration',
      description: 'Sync with GitHub repositories',
      icon: 'github',
    },
    [Features.GAMIFICATION]: {
      name: 'Gamification',
      description: 'XP, achievements, and learning rewards',
      icon: 'trophy',
    },
    [Features.AI_GENERATION]: {
      name: 'AI Generation',
      description: 'AI-powered content generation',
      icon: 'sparkles',
    },
    [Features.LEARNING_STUDIO]: {
      name: 'Learning Studio',
      description: 'Comprehensive learning interface',
      icon: 'graduation-cap',
    },
    [Features.PLUGINS]: {
      name: 'Plugins',
      description: 'Extend FABRIC with community plugins',
      icon: 'puzzle',
    },
  }

  return info[feature]
}

/**
 * Get all premium feature info for upgrade page
 */
export function getPremiumFeatureList(): FeatureInfo[] {
  return PREMIUM_FEATURES.map(getFeatureInfo)
}
