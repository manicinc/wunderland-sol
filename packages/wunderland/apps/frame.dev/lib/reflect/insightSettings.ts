/**
 * Insight Settings
 * @module lib/reflect/insightSettings
 *
 * User preferences for insight generation.
 * Controls tier selection, privacy, and auto-generation behavior.
 */

import type { InsightSettings, InsightTier } from './types'

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'codex-insight-settings'

/**
 * Default insight settings
 */
export const DEFAULT_INSIGHT_SETTINGS: InsightSettings = {
  enabled: true,
  autoGenerate: false, // On-demand by default
  preferredTier: 'auto', // Use best available
  skipLLMForPrivacy: false,
  includeActionItems: true,
  includeGratitude: true,
  includeWritingPatterns: true,
  maxCostPerMonth: undefined, // No limit
}

// ============================================================================
// SETTINGS CRUD
// ============================================================================

/**
 * Get current insight settings
 */
export function getInsightSettings(): InsightSettings {
  if (typeof window === 'undefined') return DEFAULT_INSIGHT_SETTINGS

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_INSIGHT_SETTINGS
    return { ...DEFAULT_INSIGHT_SETTINGS, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_INSIGHT_SETTINGS
  }
}

/**
 * Save insight settings
 */
export function saveInsightSettings(settings: Partial<InsightSettings>): void {
  if (typeof window === 'undefined') return

  const current = getInsightSettings()
  const updated = { ...current, ...settings }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('[InsightSettings] Failed to save:', error)
  }
}

/**
 * Reset to default settings
 */
export function resetInsightSettings(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('[InsightSettings] Failed to reset:', error)
  }
}

// ============================================================================
// TIER HELPERS
// ============================================================================

/**
 * Tier display configuration
 */
export interface TierDisplayConfig {
  id: InsightTier | 'auto'
  label: string
  description: string
  icon: 'cloud' | 'cpu' | 'zap' | 'sparkles'
  color: string
  requiresAPI: boolean
  isLocal: boolean
}

/**
 * Display config for each tier
 */
export const TIER_DISPLAY_CONFIG: TierDisplayConfig[] = [
  {
    id: 'auto',
    label: 'Auto',
    description: 'Use best available (LLM → BERT → NLP)',
    icon: 'sparkles',
    color: 'purple',
    requiresAPI: false,
    isLocal: false,
  },
  {
    id: 'llm',
    label: 'AI Cloud',
    description: 'Rich insights via Claude/GPT',
    icon: 'cloud',
    color: 'violet',
    requiresAPI: true,
    isLocal: false,
  },
  {
    id: 'bert',
    label: 'Local AI',
    description: 'Offline semantic analysis',
    icon: 'cpu',
    color: 'cyan',
    requiresAPI: false,
    isLocal: true,
  },
  {
    id: 'nlp',
    label: 'Fast',
    description: 'Instant keyword extraction',
    icon: 'zap',
    color: 'amber',
    requiresAPI: false,
    isLocal: true,
  },
]

/**
 * Get display config for a tier
 */
export function getTierConfig(tier: InsightTier | 'auto'): TierDisplayConfig {
  return TIER_DISPLAY_CONFIG.find(t => t.id === tier) || TIER_DISPLAY_CONFIG[0]
}

/**
 * Check if a tier requires an API key
 */
export function tierRequiresAPI(tier: InsightTier | 'auto'): boolean {
  if (tier === 'auto') return false
  return tier === 'llm'
}

/**
 * Check if a tier runs locally
 */
export function tierIsLocal(tier: InsightTier | 'auto'): boolean {
  if (tier === 'auto') return false
  return tier === 'bert' || tier === 'nlp'
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getInsightSettings,
  saveInsightSettings,
  resetInsightSettings,
  getTierConfig,
  tierRequiresAPI,
  tierIsLocal,
  TIER_DISPLAY_CONFIG,
  DEFAULT_INSIGHT_SETTINGS,
}
