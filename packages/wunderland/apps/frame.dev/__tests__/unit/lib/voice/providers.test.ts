/**
 * Voice Provider Tests
 * @module __tests__/unit/lib/voice/providers.test
 *
 * Tests for the unified TTS and STT provider system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getTTSProvider,
  getSTTProvider,
  getUnavailableReason,
  getProviderFeatures,
  getSavedTTSProvider,
  getSavedSTTProvider,
  saveTTSProvider,
  saveSTTProvider,
  PROVIDER_COST_INFO,
  PROVIDER_QUALITY_INFO,
  type VoiceProviderType,
} from '@/lib/voice/providers'

// ============================================================================
// PROVIDER REGISTRY TESTS
// ============================================================================

describe('Provider Registry', () => {
  describe('getTTSProvider', () => {
    it('returns browser provider', () => {
      const provider = getTTSProvider('browser')
      expect(provider).toBeDefined()
      expect(provider.name).toBe('browser')
    })

    it('returns elevenlabs provider', () => {
      const provider = getTTSProvider('elevenlabs')
      expect(provider).toBeDefined()
      expect(provider.name).toBe('elevenlabs')
    })

    it('returns openai provider', () => {
      const provider = getTTSProvider('openai')
      expect(provider).toBeDefined()
      expect(provider.name).toBe('openai')
    })

    it('all providers have required interface properties', () => {
      const types: VoiceProviderType[] = ['browser', 'elevenlabs', 'openai']
      
      for (const type of types) {
        const provider = getTTSProvider(type)
        expect(provider).toHaveProperty('name')
        expect(provider).toHaveProperty('displayName')
        expect(provider).toHaveProperty('description')
        expect(provider).toHaveProperty('isAvailable')
        expect(provider).toHaveProperty('getVoices')
        expect(provider).toHaveProperty('speak')
        expect(typeof provider.isAvailable).toBe('function')
        expect(typeof provider.getVoices).toBe('function')
        expect(typeof provider.speak).toBe('function')
      }
    })
  })

  describe('getSTTProvider', () => {
    it('returns browser provider', () => {
      const provider = getSTTProvider('browser')
      expect(provider).toBeDefined()
      expect(provider.name).toBe('browser')
    })

    it('returns elevenlabs provider', () => {
      const provider = getSTTProvider('elevenlabs')
      expect(provider).toBeDefined()
      expect(provider.name).toBe('elevenlabs')
    })

    it('returns openai provider', () => {
      const provider = getSTTProvider('openai')
      expect(provider).toBeDefined()
      expect(provider.name).toBe('openai')
    })

    it('all providers have required interface properties', () => {
      const types: VoiceProviderType[] = ['browser', 'elevenlabs', 'openai']
      
      for (const type of types) {
        const provider = getSTTProvider(type)
        expect(provider).toHaveProperty('name')
        expect(provider).toHaveProperty('displayName')
        expect(provider).toHaveProperty('description')
        expect(provider).toHaveProperty('isAvailable')
        expect(provider).toHaveProperty('transcribe')
        expect(typeof provider.isAvailable).toBe('function')
        expect(typeof provider.transcribe).toBe('function')
      }
    })
  })
})

// ============================================================================
// COST INFO TESTS
// ============================================================================

describe('PROVIDER_COST_INFO', () => {
  it('has entries for all provider types', () => {
    expect(PROVIDER_COST_INFO).toHaveProperty('browser')
    expect(PROVIDER_COST_INFO).toHaveProperty('elevenlabs')
    expect(PROVIDER_COST_INFO).toHaveProperty('openai')
  })

  it('browser provider has free cost info', () => {
    expect(PROVIDER_COST_INFO.browser.tts).toContain('Free')
    expect(PROVIDER_COST_INFO.browser.stt).toContain('Free')
  })

  it('elevenlabs has cost info with pricing', () => {
    expect(PROVIDER_COST_INFO.elevenlabs.tts).toMatch(/\$[\d.]+/)
    expect(PROVIDER_COST_INFO.elevenlabs.stt).toMatch(/\$[\d.]+/)
  })

  it('openai has cost info with pricing', () => {
    expect(PROVIDER_COST_INFO.openai.tts).toMatch(/\$[\d.]+/)
    expect(PROVIDER_COST_INFO.openai.stt).toMatch(/\$[\d.]+/)
  })
})

// ============================================================================
// QUALITY INFO TESTS
// ============================================================================

describe('PROVIDER_QUALITY_INFO', () => {
  it('has entries for all provider types', () => {
    expect(PROVIDER_QUALITY_INFO).toHaveProperty('browser')
    expect(PROVIDER_QUALITY_INFO).toHaveProperty('elevenlabs')
    expect(PROVIDER_QUALITY_INFO).toHaveProperty('openai')
  })

  it('quality ratings are between 1 and 5', () => {
    for (const [, info] of Object.entries(PROVIDER_QUALITY_INFO)) {
      expect(info.tts).toBeGreaterThanOrEqual(1)
      expect(info.tts).toBeLessThanOrEqual(5)
      expect(info.stt).toBeGreaterThanOrEqual(1)
      expect(info.stt).toBeLessThanOrEqual(5)
    }
  })

  it('browser has lower quality than premium providers', () => {
    expect(PROVIDER_QUALITY_INFO.browser.tts).toBeLessThan(PROVIDER_QUALITY_INFO.elevenlabs.tts)
    expect(PROVIDER_QUALITY_INFO.browser.tts).toBeLessThan(PROVIDER_QUALITY_INFO.openai.tts)
  })

  it('elevenlabs has highest TTS quality', () => {
    expect(PROVIDER_QUALITY_INFO.elevenlabs.tts).toBeGreaterThanOrEqual(PROVIDER_QUALITY_INFO.openai.tts)
  })

  it('openai has highest STT quality', () => {
    expect(PROVIDER_QUALITY_INFO.openai.stt).toBeGreaterThanOrEqual(PROVIDER_QUALITY_INFO.elevenlabs.stt)
  })
})

// ============================================================================
// SETTINGS STORAGE TESTS
// ============================================================================

describe('Provider Settings Storage', () => {
  let localStorageMock: Record<string, string>

  beforeEach(() => {
    localStorageMock = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value
      },
      removeItem: (key: string) => {
        delete localStorageMock[key]
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('TTS Provider Settings', () => {
    it('returns browser as default when nothing saved', () => {
      const result = getSavedTTSProvider()
      expect(result).toBe('browser')
    })

    it('returns saved provider', () => {
      localStorageMock['voice-tts-provider'] = 'elevenlabs'
      const result = getSavedTTSProvider()
      expect(result).toBe('elevenlabs')
    })

    it('saves provider preference', () => {
      saveTTSProvider('openai')
      expect(localStorageMock['voice-tts-provider']).toBe('openai')
    })

    it('returns browser for invalid saved value', () => {
      localStorageMock['voice-tts-provider'] = 'invalid-provider'
      const result = getSavedTTSProvider()
      expect(result).toBe('browser')
    })
  })

  describe('STT Provider Settings', () => {
    it('returns browser as default when nothing saved', () => {
      const result = getSavedSTTProvider()
      expect(result).toBe('browser')
    })

    it('returns saved provider', () => {
      localStorageMock['voice-stt-provider'] = 'openai'
      const result = getSavedSTTProvider()
      expect(result).toBe('openai')
    })

    it('saves provider preference', () => {
      saveSTTProvider('elevenlabs')
      expect(localStorageMock['voice-stt-provider']).toBe('elevenlabs')
    })

    it('returns browser for invalid saved value', () => {
      localStorageMock['voice-stt-provider'] = 'invalid-provider'
      const result = getSavedSTTProvider()
      expect(result).toBe('browser')
    })
  })
})

// ============================================================================
// VOICE PROVIDER TYPE VALIDATION
// ============================================================================

describe('VoiceProviderType', () => {
  it('has exactly 3 valid types', () => {
    const validTypes: VoiceProviderType[] = ['browser', 'elevenlabs', 'openai']
    expect(validTypes).toHaveLength(3)
  })

  it('all types are strings', () => {
    const types: VoiceProviderType[] = ['browser', 'elevenlabs', 'openai']
    for (const type of types) {
      expect(typeof type).toBe('string')
    }
  })
})

// ============================================================================
// PROVIDER DISPLAY NAMES
// ============================================================================

describe('Provider Display Names', () => {
  it('browser TTS has appropriate display name', () => {
    const provider = getTTSProvider('browser')
    expect(provider.displayName).toBeTruthy()
    expect(typeof provider.displayName).toBe('string')
  })

  it('elevenlabs TTS has appropriate display name', () => {
    const provider = getTTSProvider('elevenlabs')
    expect(provider.displayName).toContain('ElevenLabs')
  })

  it('openai TTS has appropriate display name', () => {
    const provider = getTTSProvider('openai')
    expect(provider.displayName).toContain('OpenAI')
  })
})

// ============================================================================
// PROVIDER DESCRIPTIONS
// ============================================================================

describe('Provider Descriptions', () => {
  it('all TTS providers have descriptions', () => {
    const types: VoiceProviderType[] = ['browser', 'elevenlabs', 'openai']
    
    for (const type of types) {
      const provider = getTTSProvider(type)
      expect(provider.description).toBeTruthy()
      expect(provider.description.length).toBeGreaterThan(10)
    }
  })

  it('all STT providers have descriptions', () => {
    const types: VoiceProviderType[] = ['browser', 'elevenlabs', 'openai']
    
    for (const type of types) {
      const provider = getSTTProvider(type)
      expect(provider.description).toBeTruthy()
      expect(provider.description.length).toBeGreaterThan(10)
    }
  })
})





