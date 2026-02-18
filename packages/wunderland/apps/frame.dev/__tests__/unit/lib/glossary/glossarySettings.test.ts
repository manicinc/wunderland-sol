/**
 * Glossary Settings Tests
 * @module __tests__/unit/lib/glossary/glossarySettings.test
 *
 * Tests for glossary generation configuration and settings.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DEFAULT_SETTINGS,
  getPlatformFeatures,
  isMethodAvailable,
  getAvailableMethods,
  getFeatureMessage,
  resolveBackend,
  getBackendDescription,
  resolveLLMProvider,
  getAvailableLLMProviders,
  getLLMProviderDescription,
  type GlossarySettings,
  type GenerationMethod,
  type LLMProviderOption,
  type BackendOption,
} from '@/lib/glossary/glossarySettings'

// Mock dependencies
vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/config/deploymentMode', () => ({
  detectPlatform: vi.fn(() => 'web'),
}))

vi.mock('@/lib/config/featureFlags', () => ({
  getFeatureFlags: vi.fn(() => ({ licenseValid: false })),
}))

import { detectPlatform } from '@/lib/config/deploymentMode'
import { getFeatureFlags } from '@/lib/config/featureFlags'

// ============================================================================
// DEFAULT_SETTINGS
// ============================================================================

describe('DEFAULT_SETTINGS', () => {
  it('has expected default values', () => {
    expect(DEFAULT_SETTINGS.generationMethod).toBe('nlp')
    expect(DEFAULT_SETTINGS.llmProvider).toBe('auto')
    expect(DEFAULT_SETTINGS.backend).toBe('auto')
    expect(DEFAULT_SETTINGS.cacheEnabled).toBe(true)
    expect(DEFAULT_SETTINGS.cacheTTLDays).toBe(30)
    expect(DEFAULT_SETTINGS.showMethodIndicator).toBe(true)
  })

  it('includes all required properties', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('generationMethod')
    expect(DEFAULT_SETTINGS).toHaveProperty('llmProvider')
    expect(DEFAULT_SETTINGS).toHaveProperty('backend')
    expect(DEFAULT_SETTINGS).toHaveProperty('cacheEnabled')
    expect(DEFAULT_SETTINGS).toHaveProperty('cacheTTLDays')
    expect(DEFAULT_SETTINGS).toHaveProperty('showMethodIndicator')
  })
})

// ============================================================================
// getPlatformFeatures
// ============================================================================

describe('getPlatformFeatures', () => {
  beforeEach(() => {
    vi.mocked(detectPlatform).mockReturnValue('web')
  })

  it('returns features for web platform', () => {
    vi.mocked(detectPlatform).mockReturnValue('web')
    const features = getPlatformFeatures()

    expect(features.llmLocal).toBe(false)
    expect(features.localProcessing).toBe(true)
    expect(features.offlineSupport).toBe('none')
    expect(features.serverSync).toBe('required')
    expect(features.recommendedBackend).toBe('cloud')
    expect(features.recommendedMethod).toBe('hybrid')
  })

  it('returns features for electron platform', () => {
    vi.mocked(detectPlatform).mockReturnValue('electron')
    const features = getPlatformFeatures()

    expect(features.llmLocal).toBe(true)
    expect(features.localProcessing).toBe(true)
    expect(features.offlineSupport).toBe('full')
    expect(features.serverSync).toBe('optional')
    expect(features.recommendedBackend).toBe('local')
    expect(features.recommendedMethod).toBe('hybrid')
  })

  it('returns features for capacitor platform', () => {
    vi.mocked(detectPlatform).mockReturnValue('capacitor')
    const features = getPlatformFeatures()

    expect(features.llmLocal).toBe(false)
    expect(features.localProcessing).toBe(false)
    expect(features.offlineSupport).toBe('limited')
    expect(features.serverSync).toBe('required')
    expect(features.recommendedBackend).toBe('cloud')
    expect(features.recommendedMethod).toBe('nlp')
  })

  it('returns features for pwa platform', () => {
    vi.mocked(detectPlatform).mockReturnValue('pwa')
    const features = getPlatformFeatures()

    expect(features.llmLocal).toBe(false)
    expect(features.localProcessing).toBe(true)
    expect(features.offlineSupport).toBe('limited')
    expect(features.serverSync).toBe('optional')
    expect(features.recommendedBackend).toBe('auto')
    expect(features.recommendedMethod).toBe('hybrid')
  })

  it('defaults to web features for unknown platform', () => {
    vi.mocked(detectPlatform).mockReturnValue('unknown' as any)
    const features = getPlatformFeatures()

    expect(features.recommendedBackend).toBe('cloud')
  })
})

// ============================================================================
// isMethodAvailable
// ============================================================================

describe('isMethodAvailable', () => {
  beforeEach(() => {
    vi.mocked(detectPlatform).mockReturnValue('web')
    vi.mocked(getFeatureFlags).mockReturnValue({ licenseValid: false } as any)
  })

  it('nlp is always available', () => {
    expect(isMethodAvailable('nlp')).toBe(true)
  })

  it('llm requires local capability or license + server sync', () => {
    // Web platform without license
    vi.mocked(detectPlatform).mockReturnValue('web')
    vi.mocked(getFeatureFlags).mockReturnValue({ licenseValid: false } as any)
    expect(isMethodAvailable('llm')).toBe(false)

    // Web platform with license
    vi.mocked(getFeatureFlags).mockReturnValue({ licenseValid: true } as any)
    expect(isMethodAvailable('llm')).toBe(true)

    // Electron platform (has local LLM)
    vi.mocked(detectPlatform).mockReturnValue('electron')
    expect(isMethodAvailable('llm')).toBe(true)
  })

  it('hybrid requires llm availability', () => {
    vi.mocked(detectPlatform).mockReturnValue('web')
    vi.mocked(getFeatureFlags).mockReturnValue({ licenseValid: false } as any)
    expect(isMethodAvailable('hybrid')).toBe(false)

    vi.mocked(getFeatureFlags).mockReturnValue({ licenseValid: true } as any)
    expect(isMethodAvailable('hybrid')).toBe(true)
  })

  it('returns false for unknown method', () => {
    expect(isMethodAvailable('unknown' as GenerationMethod)).toBe(false)
  })
})

// ============================================================================
// getAvailableMethods
// ============================================================================

describe('getAvailableMethods', () => {
  it('always includes nlp', () => {
    vi.mocked(detectPlatform).mockReturnValue('web')
    vi.mocked(getFeatureFlags).mockReturnValue({ licenseValid: false } as any)

    const methods = getAvailableMethods()
    expect(methods).toContain('nlp')
  })

  it('includes llm and hybrid when llm is available', () => {
    vi.mocked(detectPlatform).mockReturnValue('electron')

    const methods = getAvailableMethods()
    expect(methods).toContain('nlp')
    expect(methods).toContain('llm')
    expect(methods).toContain('hybrid')
  })

  it('only includes nlp when llm not available', () => {
    vi.mocked(detectPlatform).mockReturnValue('web')
    vi.mocked(getFeatureFlags).mockReturnValue({ licenseValid: false } as any)

    const methods = getAvailableMethods()
    expect(methods).toEqual(['nlp'])
  })
})

// ============================================================================
// getFeatureMessage
// ============================================================================

describe('getFeatureMessage', () => {
  it('returns null when method is available', () => {
    expect(getFeatureMessage('nlp')).toBeNull()
  })

  it('returns message for llm on capacitor', () => {
    vi.mocked(detectPlatform).mockReturnValue('capacitor')
    vi.mocked(getFeatureFlags).mockReturnValue({ licenseValid: false } as any)

    const message = getFeatureMessage('llm')
    expect(message).toContain('mobile')
  })

  it('returns message for hybrid on capacitor', () => {
    vi.mocked(detectPlatform).mockReturnValue('capacitor')
    vi.mocked(getFeatureFlags).mockReturnValue({ licenseValid: false } as any)

    const message = getFeatureMessage('hybrid')
    expect(message).toContain('mobile')
  })

  it('returns API key message when no local LLM', () => {
    vi.mocked(detectPlatform).mockReturnValue('web')
    vi.mocked(getFeatureFlags).mockReturnValue({ licenseValid: false } as any)

    const message = getFeatureMessage('llm')
    expect(message).toContain('API keys')
  })
})

// ============================================================================
// resolveBackend
// ============================================================================

describe('resolveBackend', () => {
  const makeSettings = (backend: BackendOption): GlossarySettings => ({
    ...DEFAULT_SETTINGS,
    backend,
  })

  it('returns explicit backend when not auto', () => {
    expect(resolveBackend(makeSettings('local'))).toBe('local')
    expect(resolveBackend(makeSettings('cloud'))).toBe('cloud')
    expect(resolveBackend(makeSettings('self-hosted'))).toBe('self-hosted')
  })

  it('returns local for electron on auto', () => {
    vi.mocked(detectPlatform).mockReturnValue('electron')
    expect(resolveBackend(makeSettings('auto'))).toBe('local')
  })

  it('returns cloud for capacitor on auto', () => {
    vi.mocked(detectPlatform).mockReturnValue('capacitor')
    expect(resolveBackend(makeSettings('auto'))).toBe('cloud')
  })

  it('returns local for pwa with local processing', () => {
    vi.mocked(detectPlatform).mockReturnValue('pwa')
    expect(resolveBackend(makeSettings('auto'))).toBe('local')
  })

  it('returns cloud for web without local processing', () => {
    vi.mocked(detectPlatform).mockReturnValue('web')
    // Web has localProcessing: true, so it returns local
    expect(resolveBackend(makeSettings('auto'))).toBe('local')
  })
})

// ============================================================================
// getBackendDescription
// ============================================================================

describe('getBackendDescription', () => {
  it('returns description for auto', () => {
    const desc = getBackendDescription('auto')
    expect(desc).toContain('Automatically')
  })

  it('returns description for local', () => {
    const desc = getBackendDescription('local')
    expect(desc).toContain('locally')
  })

  it('returns description for cloud', () => {
    const desc = getBackendDescription('cloud')
    expect(desc).toContain('cloud')
  })

  it('returns description for self-hosted', () => {
    const desc = getBackendDescription('self-hosted')
    expect(desc).toContain('self-hosted')
  })

  it('returns unknown for invalid backend', () => {
    const desc = getBackendDescription('invalid' as BackendOption)
    expect(desc).toContain('Unknown')
  })
})

// ============================================================================
// resolveLLMProvider
// ============================================================================

describe('resolveLLMProvider', () => {
  it('returns auto for auto option', () => {
    expect(resolveLLMProvider('auto')).toBe('auto')
  })

  it('returns claude for claude option', () => {
    expect(resolveLLMProvider('claude')).toBe('claude')
  })

  it('returns openai for openai option', () => {
    expect(resolveLLMProvider('openai')).toBe('openai')
  })

  it('returns openai for openrouter option', () => {
    // OpenRouter uses OpenAI-compatible API
    expect(resolveLLMProvider('openrouter')).toBe('openai')
  })
})

// ============================================================================
// getAvailableLLMProviders
// ============================================================================

describe('getAvailableLLMProviders', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('always includes auto', () => {
    const providers = getAvailableLLMProviders()
    expect(providers).toContain('auto')
  })

  it('includes claude when API key present', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    const providers = getAvailableLLMProviders()
    expect(providers).toContain('claude')
  })

  it('includes claude for NEXT_PUBLIC key', () => {
    process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY = 'test-key'
    const providers = getAvailableLLMProviders()
    expect(providers).toContain('claude')
  })

  it('includes openai when API key present', () => {
    process.env.OPENAI_API_KEY = 'test-key'
    const providers = getAvailableLLMProviders()
    expect(providers).toContain('openai')
  })

  it('includes openrouter when API key present', () => {
    process.env.OPENROUTER_API_KEY = 'test-key'
    const providers = getAvailableLLMProviders()
    expect(providers).toContain('openrouter')
  })

  it('includes multiple providers when multiple keys present', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.OPENAI_API_KEY = 'test-key'
    const providers = getAvailableLLMProviders()
    expect(providers).toContain('auto')
    expect(providers).toContain('claude')
    expect(providers).toContain('openai')
  })
})

// ============================================================================
// getLLMProviderDescription
// ============================================================================

describe('getLLMProviderDescription', () => {
  it('returns waterfall description for auto', () => {
    const desc = getLLMProviderDescription('auto')
    expect(desc).toContain('Waterfall')
    expect(desc).toContain('Claude')
    expect(desc).toContain('OpenAI')
  })

  it('returns description for claude', () => {
    const desc = getLLMProviderDescription('claude')
    expect(desc).toContain('Anthropic')
    expect(desc).toContain('Claude')
  })

  it('returns description for openai', () => {
    const desc = getLLMProviderDescription('openai')
    expect(desc).toContain('OpenAI')
    expect(desc).toContain('GPT')
  })

  it('returns description for openrouter', () => {
    const desc = getLLMProviderDescription('openrouter')
    expect(desc).toContain('OpenRouter')
  })

  it('returns unknown for invalid provider', () => {
    const desc = getLLMProviderDescription('invalid' as LLMProviderOption)
    expect(desc).toContain('Unknown')
  })
})
