/**
 * Ambience Settings Tests
 * @module __tests__/unit/lib/write/ambienceSettings.test
 *
 * Tests for ambient soundscape preferences and helpers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getAmbienceSettings,
  saveAmbienceSettings,
  resetAmbienceSettings,
  getSoundscapeForMood,
  getAmbiencePreset,
  DEFAULT_AMBIENCE_SETTINGS,
  AMBIENCE_PRESETS,
  MOOD_SOUNDSCAPE_MAP,
  type AmbienceSettings,
  type AmbiencePresetId,
  type AmbiencePreset,
} from '@/lib/write/ambienceSettings'
import type { MoodState } from '@/lib/codex/mood'

// Mock localStorage
let mockStorage: Record<string, string>

describe('Ambience Settings', () => {
  beforeEach(() => {
    vi.resetModules()
    mockStorage = {}

    const mockLocalStorage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value
      },
      removeItem: (key: string) => {
        delete mockStorage[key]
      },
      clear: () => {
        mockStorage = {}
      },
    }

    vi.stubGlobal('localStorage', mockLocalStorage)
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ============================================================================
  // DEFAULT_AMBIENCE_SETTINGS
  // ============================================================================

  describe('DEFAULT_AMBIENCE_SETTINGS', () => {
    it('has correct default values', () => {
      expect(DEFAULT_AMBIENCE_SETTINGS.enabled).toBe(false)
      expect(DEFAULT_AMBIENCE_SETTINGS.soundscape).toBe('rain')
      expect(DEFAULT_AMBIENCE_SETTINGS.volume).toBe(0.3)
      expect(DEFAULT_AMBIENCE_SETTINGS.autoFadeIn).toBe(true)
      expect(DEFAULT_AMBIENCE_SETTINGS.fadeInDuration).toBe(3)
      expect(DEFAULT_AMBIENCE_SETTINGS.moodSync).toBe(false)
      expect(DEFAULT_AMBIENCE_SETTINGS.rememberLastUsed).toBe(true)
      expect(DEFAULT_AMBIENCE_SETTINGS.fadeOnTimerComplete).toBe(true)
      expect(DEFAULT_AMBIENCE_SETTINGS.timerFadeDuration).toBe(3)
      expect(DEFAULT_AMBIENCE_SETTINGS.activePreset).toBeNull()
      expect(DEFAULT_AMBIENCE_SETTINGS.spatialPreset).toBe('stereo')
      expect(DEFAULT_AMBIENCE_SETTINGS.useStockSounds).toBe(true)
      expect(DEFAULT_AMBIENCE_SETTINGS.accentVolume).toBe(0.3)
    })
  })

  // ============================================================================
  // AMBIENCE_PRESETS
  // ============================================================================

  describe('AMBIENCE_PRESETS', () => {
    it('has 4 presets', () => {
      expect(AMBIENCE_PRESETS.length).toBe(4)
    })

    it('includes deep-focus preset', () => {
      const preset = AMBIENCE_PRESETS.find((p) => p.id === 'deep-focus')
      expect(preset).toBeDefined()
      expect(preset?.name).toBe('Deep Focus')
      expect(preset?.settings.soundscape).toBe('white-noise')
      expect(preset?.settings.volume).toBe(0.2)
    })

    it('includes casual-writing preset', () => {
      const preset = AMBIENCE_PRESETS.find((p) => p.id === 'casual-writing')
      expect(preset).toBeDefined()
      expect(preset?.name).toBe('Casual Writing')
      expect(preset?.settings.soundscape).toBe('cafe')
    })

    it('includes brainstorm preset', () => {
      const preset = AMBIENCE_PRESETS.find((p) => p.id === 'brainstorm')
      expect(preset).toBeDefined()
      expect(preset?.settings.soundscape).toBe('lofi')
    })

    it('includes relaxed preset', () => {
      const preset = AMBIENCE_PRESETS.find((p) => p.id === 'relaxed')
      expect(preset).toBeDefined()
      expect(preset?.settings.soundscape).toBe('ocean')
    })

    it('all presets have required properties', () => {
      AMBIENCE_PRESETS.forEach((preset) => {
        expect(preset.id).toBeDefined()
        expect(preset.name).toBeDefined()
        expect(preset.description).toBeDefined()
        expect(preset.icon).toBeDefined()
        expect(preset.settings).toBeDefined()
        expect(preset.settings.soundscape).toBeDefined()
        expect(typeof preset.settings.volume).toBe('number')
        expect(typeof preset.settings.autoFadeIn).toBe('boolean')
        expect(typeof preset.settings.fadeOnTimerComplete).toBe('boolean')
      })
    })
  })

  // ============================================================================
  // MOOD_SOUNDSCAPE_MAP
  // ============================================================================

  describe('MOOD_SOUNDSCAPE_MAP', () => {
    it('maps all mood states', () => {
      const moods: MoodState[] = [
        'focused',
        'creative',
        'curious',
        'relaxed',
        'energetic',
        'reflective',
        'anxious',
        'grateful',
        'tired',
        'peaceful',
        'excited',
        'neutral',
      ]

      moods.forEach((mood) => {
        expect(MOOD_SOUNDSCAPE_MAP[mood]).toBeDefined()
      })
    })

    it('returns lofi for focused mood', () => {
      expect(MOOD_SOUNDSCAPE_MAP.focused).toBe('lofi')
    })

    it('returns cafe for creative mood', () => {
      expect(MOOD_SOUNDSCAPE_MAP.creative).toBe('cafe')
    })

    it('returns ocean for relaxed mood', () => {
      expect(MOOD_SOUNDSCAPE_MAP.relaxed).toBe('ocean')
    })

    it('returns rain for reflective mood', () => {
      expect(MOOD_SOUNDSCAPE_MAP.reflective).toBe('rain')
    })

    it('returns forest for anxious mood', () => {
      expect(MOOD_SOUNDSCAPE_MAP.anxious).toBe('forest')
    })
  })

  // ============================================================================
  // getAmbiencePreset
  // ============================================================================

  describe('getAmbiencePreset', () => {
    it('returns preset for valid ID', () => {
      const preset = getAmbiencePreset('deep-focus')
      expect(preset).toBeDefined()
      expect(preset?.id).toBe('deep-focus')
    })

    it('returns undefined for invalid ID', () => {
      const preset = getAmbiencePreset('invalid' as AmbiencePresetId)
      expect(preset).toBeUndefined()
    })

    it('returns all presets by ID', () => {
      const ids: AmbiencePresetId[] = ['deep-focus', 'casual-writing', 'brainstorm', 'relaxed']

      ids.forEach((id) => {
        const preset = getAmbiencePreset(id)
        expect(preset).toBeDefined()
        expect(preset?.id).toBe(id)
      })
    })
  })

  // ============================================================================
  // getSoundscapeForMood
  // ============================================================================

  describe('getSoundscapeForMood', () => {
    it('returns correct soundscape for focused', () => {
      expect(getSoundscapeForMood('focused')).toBe('lofi')
    })

    it('returns correct soundscape for creative', () => {
      expect(getSoundscapeForMood('creative')).toBe('cafe')
    })

    it('returns correct soundscape for relaxed', () => {
      expect(getSoundscapeForMood('relaxed')).toBe('ocean')
    })

    it('returns correct soundscape for neutral', () => {
      expect(getSoundscapeForMood('neutral')).toBe('white-noise')
    })

    it('returns rain as fallback for unknown mood', () => {
      expect(getSoundscapeForMood('unknown' as MoodState)).toBe('rain')
    })
  })

  // ============================================================================
  // getAmbienceSettings
  // ============================================================================

  describe('getAmbienceSettings', () => {
    it('returns defaults when no stored settings', () => {
      const settings = getAmbienceSettings()
      expect(settings).toEqual(DEFAULT_AMBIENCE_SETTINGS)
    })

    it('returns stored settings', () => {
      mockStorage['codex-ambience-settings'] = JSON.stringify({
        enabled: true,
        volume: 0.5,
      })

      const settings = getAmbienceSettings()
      expect(settings.enabled).toBe(true)
      expect(settings.volume).toBe(0.5)
      // Other fields should have defaults
      expect(settings.soundscape).toBe('rain')
    })

    it('merges with defaults for partial storage', () => {
      mockStorage['codex-ambience-settings'] = JSON.stringify({
        soundscape: 'cafe',
        moodSync: true,
      })

      const settings = getAmbienceSettings()
      expect(settings.soundscape).toBe('cafe')
      expect(settings.moodSync).toBe(true)
      expect(settings.enabled).toBe(false) // Default
      expect(settings.volume).toBe(0.3) // Default
    })

    it('handles invalid JSON gracefully', () => {
      mockStorage['codex-ambience-settings'] = 'not-valid-json'

      const settings = getAmbienceSettings()
      expect(settings).toEqual(DEFAULT_AMBIENCE_SETTINGS)
    })

    it('returns defaults in SSR mode', async () => {
      vi.stubGlobal('window', undefined)
      vi.resetModules()

      const { getAmbienceSettings: getSettings } = await import('@/lib/write/ambienceSettings')
      const settings = getSettings()
      expect(settings).toEqual(DEFAULT_AMBIENCE_SETTINGS)
    })
  })

  // ============================================================================
  // saveAmbienceSettings
  // ============================================================================

  describe('saveAmbienceSettings', () => {
    it('saves settings to localStorage', () => {
      saveAmbienceSettings({ enabled: true })

      const stored = JSON.parse(mockStorage['codex-ambience-settings'])
      expect(stored.enabled).toBe(true)
    })

    it('merges with existing settings', () => {
      saveAmbienceSettings({ enabled: true })
      saveAmbienceSettings({ volume: 0.8 })

      const stored = JSON.parse(mockStorage['codex-ambience-settings'])
      expect(stored.enabled).toBe(true)
      expect(stored.volume).toBe(0.8)
    })

    it('can save all settings', () => {
      saveAmbienceSettings({
        enabled: true,
        soundscape: 'cafe',
        volume: 0.5,
        autoFadeIn: false,
        fadeInDuration: 5,
        moodSync: true,
        rememberLastUsed: false,
        fadeOnTimerComplete: false,
        timerFadeDuration: 2,
        activePreset: 'brainstorm',
        spatialPreset: 'surround',
        useStockSounds: false,
        accentVolume: 0.1,
      })

      const stored = JSON.parse(mockStorage['codex-ambience-settings'])
      expect(stored.soundscape).toBe('cafe')
      expect(stored.activePreset).toBe('brainstorm')
      expect(stored.spatialPreset).toBe('surround')
    })

    it('does not throw in SSR mode', async () => {
      vi.stubGlobal('window', undefined)
      vi.resetModules()

      const { saveAmbienceSettings: save } = await import('@/lib/write/ambienceSettings')
      expect(() => save({ enabled: true })).not.toThrow()
    })
  })

  // ============================================================================
  // resetAmbienceSettings
  // ============================================================================

  describe('resetAmbienceSettings', () => {
    it('removes stored settings', () => {
      mockStorage['codex-ambience-settings'] = JSON.stringify({ enabled: true })

      resetAmbienceSettings()

      expect(mockStorage['codex-ambience-settings']).toBeUndefined()
    })

    it('getAmbienceSettings returns defaults after reset', () => {
      saveAmbienceSettings({ enabled: true, soundscape: 'cafe' })
      resetAmbienceSettings()

      const settings = getAmbienceSettings()
      expect(settings).toEqual(DEFAULT_AMBIENCE_SETTINGS)
    })

    it('does not throw in SSR mode', async () => {
      vi.stubGlobal('window', undefined)
      vi.resetModules()

      const { resetAmbienceSettings: reset } = await import('@/lib/write/ambienceSettings')
      expect(() => reset()).not.toThrow()
    })
  })

  // ============================================================================
  // AmbienceSettings type
  // ============================================================================

  describe('AmbienceSettings type', () => {
    it('can create full settings object', () => {
      const settings: AmbienceSettings = {
        enabled: true,
        soundscape: 'ocean',
        volume: 0.5,
        autoFadeIn: true,
        fadeInDuration: 5,
        moodSync: true,
        rememberLastUsed: true,
        fadeOnTimerComplete: false,
        timerFadeDuration: 2,
        activePreset: 'relaxed',
        spatialPreset: 'stereo',
        useStockSounds: true,
        accentVolume: 0.4,
      }

      expect(settings.enabled).toBe(true)
      expect(settings.activePreset).toBe('relaxed')
    })
  })

  // ============================================================================
  // AmbiencePreset type
  // ============================================================================

  describe('AmbiencePreset type', () => {
    it('can create valid preset', () => {
      const preset: AmbiencePreset = {
        id: 'deep-focus',
        name: 'Test Preset',
        description: 'A test preset',
        icon: 'TestIcon',
        settings: {
          soundscape: 'lofi',
          volume: 0.5,
          autoFadeIn: true,
          fadeOnTimerComplete: false,
        },
      }

      expect(preset.id).toBe('deep-focus')
      expect(preset.settings.soundscape).toBe('lofi')
    })
  })
})
