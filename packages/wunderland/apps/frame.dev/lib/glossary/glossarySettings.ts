/**
 * Glossary Settings
 *
 * Configuration for glossary generation including:
 * - Generation method (NLP/LLM/Hybrid)
 * - LLM provider selection
 * - Caching preferences
 * - Platform-specific feature gating
 *
 * @module lib/glossary/glossarySettings
 */

import { getDatabase } from '../codexDatabase'
import { detectPlatform, type PlatformType } from '../config/deploymentMode'
import { getFeatureFlags } from '../config/featureFlags'
import type { LLMProvider } from '../llm/types'

// ============================================================================
// TYPES
// ============================================================================

export type GenerationMethod = 'nlp' | 'llm' | 'hybrid'
export type LLMProviderOption = 'auto' | 'claude' | 'openai' | 'openrouter'
export type BackendOption = 'auto' | 'local' | 'cloud' | 'self-hosted'

export interface GlossarySettings {
  /** Primary generation method */
  generationMethod: GenerationMethod
  /** Preferred LLM provider (auto uses waterfall) */
  llmProvider: LLMProviderOption
  /** Backend for processing */
  backend: BackendOption
  /** Enable caching */
  cacheEnabled: boolean
  /** Cache TTL in days */
  cacheTTLDays: number
  /** Show generation method indicator in UI */
  showMethodIndicator: boolean
}

export interface PlatformFeatures {
  /** Can run LLM locally */
  llmLocal: boolean
  /** Can use local processing */
  localProcessing: boolean
  /** Offline support level */
  offlineSupport: 'full' | 'limited' | 'none'
  /** Server sync requirement */
  serverSync: 'required' | 'optional' | 'none'
  /** Recommended backend */
  recommendedBackend: BackendOption
  /** Recommended generation method */
  recommendedMethod: GenerationMethod
}

// ============================================================================
// DEFAULTS
// ============================================================================

const SETTINGS_KEY = 'glossary_settings'

export const DEFAULT_SETTINGS: GlossarySettings = {
  generationMethod: 'nlp', // Default to NLP (fast, offline-capable)
  llmProvider: 'auto',
  backend: 'auto',
  cacheEnabled: true,
  cacheTTLDays: 30,
  showMethodIndicator: true,
}

// ============================================================================
// PLATFORM FEATURES
// ============================================================================

const PLATFORM_FEATURES: Record<PlatformType, PlatformFeatures> = {
  electron: {
    llmLocal: true,
    localProcessing: true,
    offlineSupport: 'full',
    serverSync: 'optional',
    recommendedBackend: 'local',
    recommendedMethod: 'hybrid',
  },
  capacitor: {
    llmLocal: false,
    localProcessing: false,
    offlineSupport: 'limited',
    serverSync: 'required',
    recommendedBackend: 'cloud',
    recommendedMethod: 'nlp', // LLM via cloud only
  },
  pwa: {
    llmLocal: false,
    localProcessing: true,
    offlineSupport: 'limited',
    serverSync: 'optional',
    recommendedBackend: 'auto',
    recommendedMethod: 'hybrid',
  },
  web: {
    llmLocal: false,
    localProcessing: true,
    offlineSupport: 'none',
    serverSync: 'required',
    recommendedBackend: 'cloud',
    recommendedMethod: 'hybrid',
  },
}

/**
 * Get platform-specific features
 */
export function getPlatformFeatures(): PlatformFeatures {
  const platform = detectPlatform()
  return PLATFORM_FEATURES[platform] || PLATFORM_FEATURES.web
}

/**
 * Check if a generation method is available on current platform
 */
export function isMethodAvailable(method: GenerationMethod): boolean {
  const features = getPlatformFeatures()
  const flags = getFeatureFlags()

  switch (method) {
    case 'nlp':
      // NLP is always available
      return true
    case 'llm':
      // LLM requires either local capability or online connection
      return features.llmLocal || (flags.licenseValid && features.serverSync !== 'none')
    case 'hybrid':
      // Hybrid requires LLM availability
      return isMethodAvailable('llm')
    default:
      return false
  }
}

/**
 * Get available generation methods for current platform
 */
export function getAvailableMethods(): GenerationMethod[] {
  const methods: GenerationMethod[] = ['nlp']
  if (isMethodAvailable('llm')) {
    methods.push('llm', 'hybrid')
  }
  return methods
}

/**
 * Get feature availability message for UI
 */
export function getFeatureMessage(method: GenerationMethod): string | null {
  if (isMethodAvailable(method)) return null

  const platform = detectPlatform()
  const features = getPlatformFeatures()

  if (method === 'llm' || method === 'hybrid') {
    if (platform === 'capacitor') {
      return 'LLM generation requires server connection on mobile'
    }
    if (!features.llmLocal) {
      return 'LLM generation requires API keys or Premium license'
    }
  }

  return null
}

// ============================================================================
// SETTINGS STORAGE
// ============================================================================

/**
 * Load settings from database
 */
export async function loadGlossarySettings(): Promise<GlossarySettings> {
  const db = await getDatabase()
  if (!db) return DEFAULT_SETTINGS

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (await db.all(
      'SELECT value FROM settings WHERE key = ?',
      [SETTINGS_KEY]
    )) as any[] | null

    if (!rows || rows.length === 0) {
      return DEFAULT_SETTINGS
    }

    const stored = JSON.parse(rows[0].value)
    return { ...DEFAULT_SETTINGS, ...stored }
  } catch (error) {
    console.error('[GlossarySettings] Error loading settings:', error)
    return DEFAULT_SETTINGS
  }
}

/**
 * Save settings to database
 */
export async function saveGlossarySettings(
  settings: Partial<GlossarySettings>
): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    const current = await loadGlossarySettings()
    const updated = { ...current, ...settings }

    await db.run(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [SETTINGS_KEY, JSON.stringify(updated), new Date().toISOString()]
    )

    console.log('[GlossarySettings] Settings saved')
    return true
  } catch (error) {
    console.error('[GlossarySettings] Error saving settings:', error)
    return false
  }
}

/**
 * Reset settings to defaults
 */
export async function resetGlossarySettings(): Promise<boolean> {
  return saveGlossarySettings(DEFAULT_SETTINGS)
}

// ============================================================================
// BACKEND RESOLUTION
// ============================================================================

/**
 * Resolve the backend to use based on settings and platform
 */
export function resolveBackend(settings: GlossarySettings): 'local' | 'cloud' | 'self-hosted' {
  if (settings.backend !== 'auto') {
    return settings.backend as 'local' | 'cloud' | 'self-hosted'
  }

  const features = getPlatformFeatures()
  const platform = detectPlatform()

  // Desktop always uses local
  if (platform === 'electron') {
    return 'local'
  }

  // Mobile uses cloud
  if (platform === 'capacitor') {
    return 'cloud'
  }

  // PWA/Web: use local if offline, cloud if online
  if (features.localProcessing) {
    return 'local'
  }

  return 'cloud'
}

/**
 * Get backend description for UI
 */
export function getBackendDescription(backend: BackendOption): string {
  switch (backend) {
    case 'auto':
      return 'Automatically select based on platform'
    case 'local':
      return 'Process locally on your device'
    case 'cloud':
      return 'Use frame.dev cloud servers'
    case 'self-hosted':
      return 'Use your own self-hosted backend'
    default:
      return 'Unknown backend'
  }
}

// ============================================================================
// LLM PROVIDER RESOLUTION
// ============================================================================

/**
 * Map LLMProviderOption to internal LLMProvider type
 */
export function resolveLLMProvider(
  option: LLMProviderOption
): 'auto' | LLMProvider {
  if (option === 'openrouter') {
    // OpenRouter goes through OpenAI-compatible API
    return 'openai'
  }
  return option as 'auto' | LLMProvider
}

/**
 * Get available LLM providers based on configuration
 */
export function getAvailableLLMProviders(): LLMProviderOption[] {
  const providers: LLMProviderOption[] = ['auto']

  // Check for API keys in environment or storage
  // This will be expanded when we integrate with apiKeyStorage
  if (typeof process !== 'undefined') {
    if (process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY) {
      providers.push('claude')
    }
    if (process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      providers.push('openai')
    }
    if (process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) {
      providers.push('openrouter')
    }
  }

  return providers
}

/**
 * Get LLM provider description for UI
 */
export function getLLMProviderDescription(provider: LLMProviderOption): string {
  switch (provider) {
    case 'auto':
      return 'Waterfall: Claude → OpenAI → OpenRouter'
    case 'claude':
      return 'Anthropic Claude (recommended)'
    case 'openai':
      return 'OpenAI GPT models'
    case 'openrouter':
      return 'OpenRouter (multiple models)'
    default:
      return 'Unknown provider'
  }
}
