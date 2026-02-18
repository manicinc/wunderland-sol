/**
 * Auto-Tagging Settings and Configuration
 * @module lib/settings/autoTagSettings
 *
 * Provides default configurations and utilities for the auto-tagging system.
 * These settings can be overridden at:
 * 1. Application level (global settings)
 * 2. Document level (frontmatter autoTagConfig)
 * 3. Block level (per-block override)
 */

import type {
  AutoTagConfig,
  WorthinessWeights,
  LLMProvider
} from '@/components/quarry/types'

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default worthiness weights for block tagging
 * Weights should sum to 1.0 for normalized scoring
 */
export const DEFAULT_WORTHINESS_WEIGHTS: Required<WorthinessWeights> = {
  topicShift: 0.4,       // 40% weight: how different from doc theme
  entityDensity: 0.3,    // 30% weight: concentration of tech entities
  semanticNovelty: 0.3,  // 30% weight: uniqueness vs surrounding blocks
}

/**
 * Default auto-tag configuration for the entire system
 */
export const DEFAULT_AUTO_TAG_CONFIG: Required<AutoTagConfig> = {
  // Document-level settings
  documentAutoTag: true,
  blockAutoTag: true,
  useLLM: true,
  preferExistingTags: true,
  maxNewTagsPerDocument: 10,
  confidenceThreshold: 0.6,

  // Block-level settings
  maxNewTagsPerBlock: 3,
  llmProviderOrder: ['claude', 'openai', 'openrouter'] as LLMProvider[],
  blockWorthinessThreshold: 0.5,

  // Tag bubbling settings
  enableTagBubbling: true,
  tagBubblingThreshold: 3,

  // Worthiness calculation weights
  worthinessWeights: DEFAULT_WORTHINESS_WEIGHTS,
}

/**
 * Conservative auto-tag configuration (fewer tags, higher thresholds)
 */
export const CONSERVATIVE_AUTO_TAG_CONFIG: Required<AutoTagConfig> = {
  ...DEFAULT_AUTO_TAG_CONFIG,
  confidenceThreshold: 0.75,
  blockWorthinessThreshold: 0.65,
  maxNewTagsPerBlock: 2,
  maxNewTagsPerDocument: 7,
  tagBubblingThreshold: 4,
}

/**
 * Aggressive auto-tag configuration (more tags, lower thresholds)
 */
export const AGGRESSIVE_AUTO_TAG_CONFIG: Required<AutoTagConfig> = {
  ...DEFAULT_AUTO_TAG_CONFIG,
  confidenceThreshold: 0.45,
  blockWorthinessThreshold: 0.35,
  maxNewTagsPerBlock: 5,
  maxNewTagsPerDocument: 15,
  tagBubblingThreshold: 2,
}

/**
 * NLP-only configuration (no LLM, faster but less accurate)
 */
export const NLP_ONLY_AUTO_TAG_CONFIG: Required<AutoTagConfig> = {
  ...DEFAULT_AUTO_TAG_CONFIG,
  useLLM: false,
  confidenceThreshold: 0.55, // Slightly lower since NLP is less accurate
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Merge user config with defaults, filling in missing values
 */
export function mergeAutoTagConfig(
  userConfig?: Partial<AutoTagConfig>
): Required<AutoTagConfig> {
  if (!userConfig) {
    return { ...DEFAULT_AUTO_TAG_CONFIG }
  }

  return {
    ...DEFAULT_AUTO_TAG_CONFIG,
    ...userConfig,
    worthinessWeights: {
      ...DEFAULT_WORTHINESS_WEIGHTS,
      ...userConfig.worthinessWeights,
    },
    llmProviderOrder: userConfig.llmProviderOrder || DEFAULT_AUTO_TAG_CONFIG.llmProviderOrder,
  }
}

/**
 * Validate auto-tag configuration values
 */
export function validateAutoTagConfig(config: Partial<AutoTagConfig>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate thresholds are in range
  if (config.confidenceThreshold !== undefined) {
    if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
      errors.push('confidenceThreshold must be between 0 and 1')
    }
  }

  if (config.blockWorthinessThreshold !== undefined) {
    if (config.blockWorthinessThreshold < 0 || config.blockWorthinessThreshold > 1) {
      errors.push('blockWorthinessThreshold must be between 0 and 1')
    }
  }

  // Validate max values are positive
  if (config.maxNewTagsPerBlock !== undefined && config.maxNewTagsPerBlock < 0) {
    errors.push('maxNewTagsPerBlock must be non-negative')
  }

  if (config.maxNewTagsPerDocument !== undefined && config.maxNewTagsPerDocument < 0) {
    errors.push('maxNewTagsPerDocument must be non-negative')
  }

  if (config.tagBubblingThreshold !== undefined && config.tagBubblingThreshold < 1) {
    errors.push('tagBubblingThreshold must be at least 1')
  }

  // Validate worthiness weights sum to ~1.0
  if (config.worthinessWeights) {
    const weights = config.worthinessWeights
    const sum = (weights.topicShift || 0) + (weights.entityDensity || 0) + (weights.semanticNovelty || 0)
    if (sum > 0 && Math.abs(sum - 1) > 0.01) {
      errors.push(`worthinessWeights should sum to 1.0, got ${sum.toFixed(2)}`)
    }
  }

  // Validate provider order
  if (config.llmProviderOrder) {
    const validProviders: LLMProvider[] = ['claude', 'openai', 'openrouter']
    for (const provider of config.llmProviderOrder) {
      if (!validProviders.includes(provider)) {
        errors.push(`Invalid LLM provider: ${provider}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get a description of the current configuration for logging/display
 */
export function describeAutoTagConfig(config: AutoTagConfig): string {
  const lines: string[] = []

  lines.push(`Auto-tagging: ${config.documentAutoTag ? 'enabled' : 'disabled'}`)

  if (config.documentAutoTag) {
    lines.push(`  - Block tagging: ${config.blockAutoTag ? 'enabled' : 'disabled'}`)
    lines.push(`  - Use LLM: ${config.useLLM ? 'yes' : 'no (NLP only)'}`)
    lines.push(`  - Prefer existing tags: ${config.preferExistingTags ? 'yes' : 'no'}`)
    lines.push(`  - Confidence threshold: ${config.confidenceThreshold}`)
    lines.push(`  - Max tags per document: ${config.maxNewTagsPerDocument}`)

    if (config.blockAutoTag) {
      lines.push(`  - Block worthiness threshold: ${config.blockWorthinessThreshold}`)
      lines.push(`  - Max tags per block: ${config.maxNewTagsPerBlock}`)
      lines.push(`  - Tag bubbling: ${config.enableTagBubbling ? `enabled (threshold: ${config.tagBubblingThreshold})` : 'disabled'}`)
    }

    if (config.useLLM && config.llmProviderOrder) {
      lines.push(`  - LLM provider order: ${config.llmProviderOrder.join(' → ')}`)
    }
  }

  return lines.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESET CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export type AutoTagPreset = 'default' | 'conservative' | 'aggressive' | 'nlp-only' | 'disabled'

const PRESET_CONFIGS: Record<AutoTagPreset, Required<AutoTagConfig>> = {
  default: DEFAULT_AUTO_TAG_CONFIG,
  conservative: CONSERVATIVE_AUTO_TAG_CONFIG,
  aggressive: AGGRESSIVE_AUTO_TAG_CONFIG,
  'nlp-only': NLP_ONLY_AUTO_TAG_CONFIG,
  disabled: {
    ...DEFAULT_AUTO_TAG_CONFIG,
    documentAutoTag: false,
    blockAutoTag: false,
  },
}

/**
 * Get configuration for a named preset
 */
export function getPresetConfig(preset: AutoTagPreset): Required<AutoTagConfig> {
  return { ...PRESET_CONFIGS[preset] }
}

/**
 * Get all available preset names
 */
export function getAvailablePresets(): AutoTagPreset[] {
  return Object.keys(PRESET_CONFIGS) as AutoTagPreset[]
}

/**
 * Get description for a preset
 */
export function getPresetDescription(preset: AutoTagPreset): string {
  const descriptions: Record<AutoTagPreset, string> = {
    default: 'Balanced tagging with LLM enhancement',
    conservative: 'Fewer, higher-confidence tags only',
    aggressive: 'More tags with lower thresholds',
    'nlp-only': 'Fast tagging without LLM (offline)',
    disabled: 'All auto-tagging disabled',
  }
  return descriptions[preset]
}
