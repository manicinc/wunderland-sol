/**
 * ML Auto-Trigger Settings
 *
 * Configuration for automatic ML processing (block tagging, embeddings,
 * summarization) when strands are saved or published.
 *
 * @module lib/settings/mlAutoTriggerSettings
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Auto-tag preset determines how aggressively the system generates tags
 */
export type AutoTagPreset = 'nlp-only' | 'default' | 'conservative' | 'aggressive' | 'disabled'

/**
 * ML auto-trigger settings interface
 */
export interface MLAutoTriggerSettings {
  /** Master toggle - when false, no auto-processing occurs */
  enabled: boolean

  // What to trigger
  /** Run block-level tagging (NLP analysis) */
  autoTagBlocks: boolean
  /** Update embeddings for semantic search */
  autoUpdateEmbeddings: boolean
  /** Aggregate block tags to document level */
  autoRunTagBubbling: boolean
  /** Generate AI summaries (requires LLM, more expensive) */
  autoGenerateSummary: boolean

  // When to trigger
  /** Trigger on content save */
  triggerOnSave: boolean
  /** Trigger on strand publish */
  triggerOnPublish: boolean

  // Smart detection
  /** Only trigger if content actually changed (hash comparison) */
  requireContentChange: boolean
  /** Debounce rapid saves (milliseconds) */
  debounceMs: number

  /** Auto-tag preset (controls aggressiveness) */
  autoTagPreset: AutoTagPreset
}

// ============================================================================
// DEFAULTS
// ============================================================================

/**
 * Default ML auto-trigger settings
 * - Enabled by default (automatic processing)
 * - Fast NLP-only preset (no LLM API calls)
 * - Smart content change detection enabled
 * - Can be disabled via settings if user prefers manual control
 */
export const DEFAULT_ML_AUTO_TRIGGER_SETTINGS: MLAutoTriggerSettings = {
  // Master toggle - enabled by default for automatic processing
  enabled: true,

  // What to trigger (when enabled)
  autoTagBlocks: true,
  autoUpdateEmbeddings: true,
  autoRunTagBubbling: true,
  autoGenerateSummary: false, // Expensive - requires LLM

  // When to trigger
  triggerOnSave: true,
  triggerOnPublish: true,

  // Smart detection
  requireContentChange: true, // Skip if content hash unchanged
  debounceMs: 2000, // 2 seconds

  // Preset
  autoTagPreset: 'nlp-only', // Fast, no API calls
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'quarry-ml-auto-trigger-settings'

/**
 * Get ML auto-trigger settings from localStorage
 */
export function getMLAutoTriggerSettings(): MLAutoTriggerSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_ML_AUTO_TRIGGER_SETTINGS
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return DEFAULT_ML_AUTO_TRIGGER_SETTINGS
    }

    const parsed = JSON.parse(stored) as Partial<MLAutoTriggerSettings>
    // Merge with defaults to handle missing fields from older versions
    return {
      ...DEFAULT_ML_AUTO_TRIGGER_SETTINGS,
      ...parsed,
    }
  } catch {
    return DEFAULT_ML_AUTO_TRIGGER_SETTINGS
  }
}

/**
 * Save ML auto-trigger settings to localStorage
 */
export function setMLAutoTriggerSettings(settings: Partial<MLAutoTriggerSettings>): void {
  if (typeof window === 'undefined') return

  const current = getMLAutoTriggerSettings()
  const updated = {
    ...current,
    ...settings,
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  // Dispatch event for reactivity
  window.dispatchEvent(
    new CustomEvent('ml-auto-trigger-settings-changed', { detail: updated })
  )
}

/**
 * Reset ML auto-trigger settings to defaults
 */
export function resetMLAutoTriggerSettings(): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem(STORAGE_KEY)

  window.dispatchEvent(
    new CustomEvent('ml-auto-trigger-settings-changed', {
      detail: DEFAULT_ML_AUTO_TRIGGER_SETTINGS,
    })
  )
}

// ============================================================================
// HOOKS HELPER
// ============================================================================

/**
 * Subscribe to ML auto-trigger settings changes
 * @returns Unsubscribe function
 */
export function subscribeToMLAutoTriggerSettings(
  callback: (settings: MLAutoTriggerSettings) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handler = (event: CustomEvent<MLAutoTriggerSettings>) => {
    callback(event.detail)
  }

  window.addEventListener(
    'ml-auto-trigger-settings-changed',
    handler as EventListener
  )

  return () => {
    window.removeEventListener(
      'ml-auto-trigger-settings-changed',
      handler as EventListener
    )
  }
}

// ============================================================================
// PRESET DESCRIPTIONS
// ============================================================================

/**
 * Human-readable descriptions for auto-tag presets
 */
export const AUTO_TAG_PRESET_DESCRIPTIONS: Record<AutoTagPreset, string> = {
  'nlp-only': 'Fast NLP analysis only (no LLM API calls)',
  default: 'Balanced NLP with optional LLM enhancement',
  conservative: 'Fewer tags, higher confidence threshold',
  aggressive: 'More tags, lower confidence threshold (may include false positives)',
  disabled: 'No auto-tagging',
}

/**
 * Get confidence threshold for a preset
 */
export function getConfidenceThresholdForPreset(preset: AutoTagPreset): number {
  switch (preset) {
    case 'conservative':
      return 0.8
    case 'aggressive':
      return 0.4
    case 'nlp-only':
    case 'default':
      return 0.6
    case 'disabled':
      return 1.0 // Effectively never triggers
  }
}

/**
 * Check if LLM is used for a preset
 */
export function isLLMEnabledForPreset(preset: AutoTagPreset): boolean {
  switch (preset) {
    case 'nlp-only':
    case 'disabled':
      return false
    case 'default':
    case 'conservative':
    case 'aggressive':
      return true
  }
}
