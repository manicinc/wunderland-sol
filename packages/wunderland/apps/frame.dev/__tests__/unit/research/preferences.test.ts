/**
 * Tests for Research Preferences Storage
 * @module tests/unit/research/preferences
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock localStorage
const mockLocalStorage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage[key]
  }),
  clear: vi.fn(() => {
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key])
  }),
}

// Mock window
const dispatchEventMock = vi.fn()

vi.stubGlobal('window', {
  localStorage: localStorageMock,
  dispatchEvent: dispatchEventMock,
})

vi.stubGlobal('localStorage', localStorageMock)

import {
  getResearchPreferences,
  saveResearchPreferences,
  resetResearchPreferences,
  getDefaultResearchPreferences,
  getSearchProviderKey,
  saveSearchProviderKey,
  removeSearchProviderKey,
  getConfiguredSearchProviders,
  CACHE_DURATION_OPTIONS,
} from '@/lib/research/preferences'

describe('Research Preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getResearchPreferences', () => {
    it('should return default preferences when none stored', () => {
      const prefs = getResearchPreferences()

      expect(prefs.defaultCitationStyle).toBe('apa')
      expect(prefs.autoEnrichEnabled).toBe(true)
      expect(prefs.cacheDurationMs).toBe(5 * 60 * 1000)
      expect(prefs.providerPriority).toEqual(['brave', 'serper', 'duckduckgo'])
    })

    it('should return stored preferences', () => {
      const storedPrefs = {
        defaultCitationStyle: 'mla',
        autoEnrichEnabled: false,
        cacheDurationMs: 15 * 60 * 1000,
        providerPriority: ['serper', 'brave'],
        updatedAt: Date.now(),
      }
      mockLocalStorage['quarry-research-preferences'] = JSON.stringify(storedPrefs)

      const prefs = getResearchPreferences()

      expect(prefs.defaultCitationStyle).toBe('mla')
      expect(prefs.autoEnrichEnabled).toBe(false)
      expect(prefs.cacheDurationMs).toBe(15 * 60 * 1000)
    })

    it('should merge partial stored preferences with defaults', () => {
      const partialPrefs = {
        defaultCitationStyle: 'chicago',
        updatedAt: Date.now(),
      }
      mockLocalStorage['quarry-research-preferences'] = JSON.stringify(partialPrefs)

      const prefs = getResearchPreferences()

      expect(prefs.defaultCitationStyle).toBe('chicago')
      expect(prefs.autoEnrichEnabled).toBe(true) // default
      expect(prefs.cacheDurationMs).toBe(5 * 60 * 1000) // default
    })

    it('should handle invalid JSON gracefully', () => {
      mockLocalStorage['quarry-research-preferences'] = 'invalid-json'

      const prefs = getResearchPreferences()

      expect(prefs.defaultCitationStyle).toBe('apa')
    })
  })

  describe('saveResearchPreferences', () => {
    it('should save preferences to localStorage', () => {
      saveResearchPreferences({ defaultCitationStyle: 'harvard' })

      expect(localStorageMock.setItem).toHaveBeenCalled()
      const saved = JSON.parse(mockLocalStorage['quarry-research-preferences'])
      expect(saved.defaultCitationStyle).toBe('harvard')
    })

    it('should merge with existing preferences', () => {
      mockLocalStorage['quarry-research-preferences'] = JSON.stringify({
        defaultCitationStyle: 'apa',
        autoEnrichEnabled: true,
        updatedAt: 1000,
      })

      saveResearchPreferences({ autoEnrichEnabled: false })

      const saved = JSON.parse(mockLocalStorage['quarry-research-preferences'])
      expect(saved.defaultCitationStyle).toBe('apa')
      expect(saved.autoEnrichEnabled).toBe(false)
    })

    it('should dispatch research-preferences-changed event', () => {
      saveResearchPreferences({ cacheDurationMs: 60000 })

      expect(dispatchEventMock).toHaveBeenCalled()
      const event = dispatchEventMock.mock.calls[0][0]
      expect(event.type).toBe('research-preferences-changed')
    })

    it('should update the updatedAt timestamp', () => {
      const before = Date.now()
      saveResearchPreferences({ defaultCitationStyle: 'mla' })
      const after = Date.now()

      const saved = JSON.parse(mockLocalStorage['quarry-research-preferences'])
      expect(saved.updatedAt).toBeGreaterThanOrEqual(before)
      expect(saved.updatedAt).toBeLessThanOrEqual(after)
    })
  })

  describe('resetResearchPreferences', () => {
    it('should remove preferences from localStorage', () => {
      mockLocalStorage['quarry-research-preferences'] = JSON.stringify({ test: true })

      resetResearchPreferences()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('quarry-research-preferences')
    })

    it('should dispatch research-preferences-changed event with defaults', () => {
      resetResearchPreferences()

      expect(dispatchEventMock).toHaveBeenCalled()
      const event = dispatchEventMock.mock.calls[0][0]
      expect(event.type).toBe('research-preferences-changed')
    })
  })

  describe('getDefaultResearchPreferences', () => {
    it('should return default preferences object', () => {
      const defaults = getDefaultResearchPreferences()

      expect(defaults.defaultCitationStyle).toBe('apa')
      expect(defaults.autoEnrichEnabled).toBe(true)
      expect(defaults.cacheDurationMs).toBe(5 * 60 * 1000)
      expect(defaults.providerPriority).toEqual(['brave', 'serper', 'duckduckgo'])
    })

    it('should return a new object each time', () => {
      const defaults1 = getDefaultResearchPreferences()
      const defaults2 = getDefaultResearchPreferences()

      expect(defaults1).not.toBe(defaults2)
      expect(defaults1).toEqual(defaults2)
    })
  })

  describe('CACHE_DURATION_OPTIONS', () => {
    it('should have correct duration values', () => {
      expect(CACHE_DURATION_OPTIONS).toContainEqual({ label: '1 minute', value: 60000 })
      expect(CACHE_DURATION_OPTIONS).toContainEqual({ label: '5 minutes', value: 300000 })
      expect(CACHE_DURATION_OPTIONS).toContainEqual({ label: 'Never cache', value: 0 })
    })
  })
})

describe('Search Provider Key Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  describe('getSearchProviderKey', () => {
    it('should return null when no key stored', () => {
      const key = getSearchProviderKey('brave')

      expect(key).toBeNull()
    })

    it('should return stored key', () => {
      mockLocalStorage['quarry-search-brave-key'] = 'my-brave-api-key'

      const key = getSearchProviderKey('brave')

      expect(key).toBe('my-brave-api-key')
    })

    it('should use correct localStorage key pattern', () => {
      getSearchProviderKey('serper')

      expect(localStorageMock.getItem).toHaveBeenCalledWith('quarry-search-serper-key')
    })
  })

  describe('saveSearchProviderKey', () => {
    it('should save key to localStorage', () => {
      saveSearchProviderKey('brave', 'test-key-123')

      expect(localStorageMock.setItem).toHaveBeenCalledWith('quarry-search-brave-key', 'test-key-123')
    })

    it('should dispatch search-keys-changed event', () => {
      saveSearchProviderKey('serper', 'serper-key')

      expect(dispatchEventMock).toHaveBeenCalled()
      const event = dispatchEventMock.mock.calls[0][0]
      expect(event.type).toBe('search-keys-changed')
      expect(event.detail.provider).toBe('serper')
    })
  })

  describe('removeSearchProviderKey', () => {
    it('should remove key from localStorage', () => {
      mockLocalStorage['quarry-search-brave-key'] = 'some-key'

      removeSearchProviderKey('brave')

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('quarry-search-brave-key')
    })

    it('should dispatch search-keys-changed event', () => {
      removeSearchProviderKey('serper')

      expect(dispatchEventMock).toHaveBeenCalled()
      const event = dispatchEventMock.mock.calls[0][0]
      expect(event.type).toBe('search-keys-changed')
    })
  })

  describe('getConfiguredSearchProviders', () => {
    it('should always include duckduckgo and semanticscholar', () => {
      const configured = getConfiguredSearchProviders()

      expect(configured).toContain('duckduckgo')
      expect(configured).toContain('semanticscholar')
    })

    it('should include providers with configured keys', () => {
      mockLocalStorage['quarry-search-brave-key'] = 'brave-key'
      mockLocalStorage['quarry-search-serper-key'] = 'serper-key'

      const configured = getConfiguredSearchProviders()

      expect(configured).toContain('brave')
      expect(configured).toContain('serper')
    })

    it('should not include providers without keys', () => {
      const configured = getConfiguredSearchProviders()

      expect(configured).not.toContain('brave')
      expect(configured).not.toContain('serper')
    })
  })
})
