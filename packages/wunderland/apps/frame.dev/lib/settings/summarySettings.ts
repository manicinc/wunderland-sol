/**
 * Summarization Settings and Configuration
 * @module lib/settings/summarySettings
 *
 * Provides default configurations and utilities for extractive and abstractive
 * summarization. These settings can be overridden at:
 * 1. Application level (global settings via localStorage)
 * 2. Document level (frontmatter summarization config)
 * 3. Block level (per-block override)
 */

import type { LLMProvider } from '@/components/quarry/types'

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Configuration for which block types to show in summaries */
export interface BlockVisibilityConfig {
  showParagraphs: boolean
  showLists: boolean
  showHeadings: boolean
  showCode: boolean
  showBlockquotes: boolean
  showTables: boolean
}

/** Extractive summarization configuration */
export interface SummarizationConfig {
  algorithm: 'textrank' | 'lead' | 'lead-first' | 'tfidf'
  maxLength: number
  maxLengthPerBlock: number
  textRankIterations: number
  dampingFactor: number
  positionBiasWeight: number
  entityDensityWeight: number
  useBertEmbeddings: boolean
  minSimilarity: number
}

/** Abstractive summarization style */
export type AbstractiveSummaryStyle = 'concise' | 'detailed' | 'bullet' | 'academic'

/** Abstractive summarization settings (distinct from AbstractiveSummaryConfig in types.ts) */
export interface AbstractiveSummarySettings {
  enabled: boolean
  defaultProvider: 'auto' | LLMProvider
  providerOrder: LLMProvider[]
  style: AbstractiveSummaryStyle
  maxCostPerDocument: number
  showCostWarning: boolean
  autoGenerateOnImport: boolean
}

/** Combined summary settings */
export interface SummarySettings {
  extractive: SummarizationConfig
  abstractive: AbstractiveSummarySettings
  visibility: BlockVisibilityConfig
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default block visibility settings
 * Based on user preference: text + lists shown by default
 */
export const DEFAULT_BLOCK_VISIBILITY: BlockVisibilityConfig = {
  showParagraphs: true,    // ON - primary content
  showLists: true,         // ON - user preference
  showHeadings: false,     // OFF - can be enabled if selected
  showCode: false,         // OFF - summaries don't work well for code
  showBlockquotes: true,   // ON - often contains key quotes
  showTables: false,       // OFF - structural data
}

/**
 * Default extractive summarization configuration
 * Uses TextRank with BERT embeddings
 */
export const DEFAULT_SUMMARIZATION_CONFIG: SummarizationConfig = {
  algorithm: 'textrank',
  maxLength: 200,
  maxLengthPerBlock: 150,
  textRankIterations: 20,
  dampingFactor: 0.85,
  positionBiasWeight: 0.2,
  entityDensityWeight: 0.15,
  useBertEmbeddings: true,
  minSimilarity: 0.1,
}

/**
 * Default abstractive summarization settings
 */
export const DEFAULT_ABSTRACTIVE_CONFIG: AbstractiveSummarySettings = {
  enabled: true,
  defaultProvider: 'auto',
  providerOrder: ['claude', 'openai', 'openrouter'] as LLMProvider[],
  style: 'concise',
  maxCostPerDocument: 0.10,  // $0.10 before warning
  showCostWarning: true,
  autoGenerateOnImport: false,
}

/**
 * Combined default settings
 */
export const DEFAULT_SUMMARY_SETTINGS: SummarySettings = {
  extractive: DEFAULT_SUMMARIZATION_CONFIG,
  abstractive: DEFAULT_ABSTRACTIVE_CONFIG,
  visibility: DEFAULT_BLOCK_VISIBILITY,
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESET CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fast configuration - lead sentences only, no BERT
 */
export const FAST_SUMMARIZATION_CONFIG: SummarizationConfig = {
  ...DEFAULT_SUMMARIZATION_CONFIG,
  algorithm: 'lead-first',
  useBertEmbeddings: false,
}

/**
 * Quality configuration - more iterations, BERT required
 */
export const QUALITY_SUMMARIZATION_CONFIG: SummarizationConfig = {
  ...DEFAULT_SUMMARIZATION_CONFIG,
  algorithm: 'textrank',
  textRankIterations: 30,
  useBertEmbeddings: true,
  dampingFactor: 0.9,
}

/**
 * Technical content visibility - includes code and tables
 */
export const TECHNICAL_BLOCK_VISIBILITY: BlockVisibilityConfig = {
  ...DEFAULT_BLOCK_VISIBILITY,
  showCode: true,
  showTables: true,
  showHeadings: true,
}

/**
 * Minimal visibility - paragraphs only
 */
export const MINIMAL_BLOCK_VISIBILITY: BlockVisibilityConfig = {
  showParagraphs: true,
  showLists: false,
  showHeadings: false,
  showCode: false,
  showBlockquotes: false,
  showTables: false,
}

/**
 * All blocks visible
 */
export const ALL_BLOCKS_VISIBILITY: BlockVisibilityConfig = {
  showParagraphs: true,
  showLists: true,
  showHeadings: true,
  showCode: true,
  showBlockquotes: true,
  showTables: true,
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Merge user summarization config with defaults
 */
export function mergeSummarizationConfig(
  userConfig?: Partial<SummarizationConfig>
): SummarizationConfig {
  if (!userConfig) {
    return { ...DEFAULT_SUMMARIZATION_CONFIG }
  }
  return {
    ...DEFAULT_SUMMARIZATION_CONFIG,
    ...userConfig,
  }
}

/**
 * Merge user visibility config with defaults
 */
export function mergeVisibilityConfig(
  userConfig?: Partial<BlockVisibilityConfig>
): BlockVisibilityConfig {
  if (!userConfig) {
    return { ...DEFAULT_BLOCK_VISIBILITY }
  }
  return {
    ...DEFAULT_BLOCK_VISIBILITY,
    ...userConfig,
  }
}

/**
 * Merge user abstractive settings with defaults
 */
export function mergeAbstractiveConfig(
  userConfig?: Partial<AbstractiveSummarySettings>
): AbstractiveSummarySettings {
  if (!userConfig) {
    return { ...DEFAULT_ABSTRACTIVE_CONFIG }
  }
  return {
    ...DEFAULT_ABSTRACTIVE_CONFIG,
    ...userConfig,
    providerOrder: userConfig.providerOrder || DEFAULT_ABSTRACTIVE_CONFIG.providerOrder,
  }
}

/**
 * Merge complete summary settings
 */
export function mergeSummarySettings(
  userSettings?: Partial<SummarySettings>
): SummarySettings {
  if (!userSettings) {
    return { ...DEFAULT_SUMMARY_SETTINGS }
  }
  return {
    extractive: mergeSummarizationConfig(userSettings.extractive),
    abstractive: mergeAbstractiveConfig(userSettings.abstractive),
    visibility: mergeVisibilityConfig(userSettings.visibility),
  }
}

/**
 * Check if a block type should be shown based on visibility config
 */
export function shouldShowBlockType(
  blockType: string,
  config: BlockVisibilityConfig
): boolean {
  switch (blockType) {
    case 'paragraph':
      return config.showParagraphs
    case 'heading':
      return config.showHeadings
    case 'code':
      return config.showCode
    case 'list':
      return config.showLists
    case 'blockquote':
      return config.showBlockquotes
    case 'table':
      return config.showTables
    default:
      return config.showParagraphs // Default to paragraph behavior
  }
}

/**
 * Validate summarization configuration
 */
export function validateSummarizationConfig(config: Partial<SummarizationConfig>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (config.maxLength !== undefined && config.maxLength < 10) {
    errors.push('maxLength must be at least 10 characters')
  }

  if (config.dampingFactor !== undefined) {
    if (config.dampingFactor < 0 || config.dampingFactor > 1) {
      errors.push('dampingFactor must be between 0 and 1')
    }
  }

  if (config.positionBiasWeight !== undefined) {
    if (config.positionBiasWeight < 0 || config.positionBiasWeight > 1) {
      errors.push('positionBiasWeight must be between 0 and 1')
    }
  }

  if (config.entityDensityWeight !== undefined) {
    if (config.entityDensityWeight < 0 || config.entityDensityWeight > 1) {
      errors.push('entityDensityWeight must be between 0 and 1')
    }
  }

  // Check weights don't exceed 1
  const posWeight = config.positionBiasWeight ?? DEFAULT_SUMMARIZATION_CONFIG.positionBiasWeight
  const entWeight = config.entityDensityWeight ?? DEFAULT_SUMMARIZATION_CONFIG.entityDensityWeight
  if (posWeight + entWeight > 1) {
    errors.push('positionBiasWeight + entityDensityWeight must not exceed 1')
  }

  if (config.textRankIterations !== undefined && config.textRankIterations < 1) {
    errors.push('textRankIterations must be at least 1')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESET SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export type SummarizationPreset = 'default' | 'fast' | 'quality' | 'offline'
export type VisibilityPreset = 'default' | 'minimal' | 'technical' | 'all'

const SUMMARIZATION_PRESETS: Record<SummarizationPreset, SummarizationConfig> = {
  default: DEFAULT_SUMMARIZATION_CONFIG,
  fast: FAST_SUMMARIZATION_CONFIG,
  quality: QUALITY_SUMMARIZATION_CONFIG,
  offline: {
    ...DEFAULT_SUMMARIZATION_CONFIG,
    useBertEmbeddings: true, // BERT still works offline
  },
}

const VISIBILITY_PRESETS: Record<VisibilityPreset, BlockVisibilityConfig> = {
  default: DEFAULT_BLOCK_VISIBILITY,
  minimal: MINIMAL_BLOCK_VISIBILITY,
  technical: TECHNICAL_BLOCK_VISIBILITY,
  all: ALL_BLOCKS_VISIBILITY,
}

/**
 * Get summarization preset
 */
export function getSummarizationPreset(preset: SummarizationPreset): SummarizationConfig {
  return { ...SUMMARIZATION_PRESETS[preset] }
}

/**
 * Get visibility preset
 */
export function getVisibilityPreset(preset: VisibilityPreset): BlockVisibilityConfig {
  return { ...VISIBILITY_PRESETS[preset] }
}

/**
 * Get preset descriptions
 */
export function getSummarizationPresetDescription(preset: SummarizationPreset): string {
  const descriptions: Record<SummarizationPreset, string> = {
    default: 'TextRank with BERT embeddings (recommended)',
    fast: 'Lead sentences only - fast but less accurate',
    quality: 'Higher iterations and stricter similarity',
    offline: 'Optimized for offline use with local BERT',
  }
  return descriptions[preset]
}

export function getVisibilityPresetDescription(preset: VisibilityPreset): string {
  const descriptions: Record<VisibilityPreset, string> = {
    default: 'Text paragraphs and lists',
    minimal: 'Paragraphs only',
    technical: 'Includes code, tables, and headings',
    all: 'Show all block types',
  }
  return descriptions[preset]
}

/**
 * Get all available presets
 */
export function getAvailableSummarizationPresets(): SummarizationPreset[] {
  return Object.keys(SUMMARIZATION_PRESETS) as SummarizationPreset[]
}

export function getAvailableVisibilityPresets(): VisibilityPreset[] {
  return Object.keys(VISIBILITY_PRESETS) as VisibilityPreset[]
}
