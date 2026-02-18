/**
 * Traveler Configuration Tests
 * @module __tests__/unit/lib/config/travelerConfig.test
 *
 * Tests for traveler (user) configuration and personalization.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock localStorage module
vi.mock('@/lib/localStorage', () => ({
  getLocalStorage: vi.fn(),
  setLocalStorage: vi.fn(),
}))

import {
  DEFAULT_TRAVELER_CONFIG,
  PRESET_TRAVELERS,
  TRAVELER_ACCENT_COLORS,
  getTravelerConfig,
  setTravelerConfig,
  resetTravelerConfig,
  getTravelerGreeting,
  canEditTravelerConfig,
  type TravelerConfig,
} from '@/lib/config/travelerConfig'
import { getLocalStorage, setLocalStorage } from '@/lib/localStorage'

describe('Traveler Configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = { ...originalEnv }
    vi.mocked(getLocalStorage).mockReturnValue(null)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // ============================================================================
  // TravelerConfig type
  // ============================================================================

  describe('TravelerConfig type', () => {
    it('creates minimal config with name only', () => {
      const config: TravelerConfig = {
        name: 'TestUser',
      }
      expect(config.name).toBe('TestUser')
    })

    it('creates full config with all properties', () => {
      const config: TravelerConfig = {
        name: 'Scholar',
        title: 'Academic',
        avatarUrl: 'https://example.com/avatar.png',
        accentColor: '#6366f1',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-02T00:00:00Z',
      }
      expect(config.name).toBe('Scholar')
      expect(config.title).toBe('Academic')
      expect(config.avatarUrl).toBe('https://example.com/avatar.png')
      expect(config.accentColor).toBe('#6366f1')
      expect(config.createdAt).toBe('2025-01-01T00:00:00Z')
      expect(config.updatedAt).toBe('2025-01-02T00:00:00Z')
    })

    it('supports base64 avatar URL', () => {
      const config: TravelerConfig = {
        name: 'User',
        avatarUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      }
      expect(config.avatarUrl?.startsWith('data:image')).toBe(true)
    })
  })

  // ============================================================================
  // DEFAULT_TRAVELER_CONFIG
  // ============================================================================

  describe('DEFAULT_TRAVELER_CONFIG', () => {
    it('has name set to Traveler', () => {
      expect(DEFAULT_TRAVELER_CONFIG.name).toBe('Traveler')
    })

    it('has title set to Knowledge Seeker', () => {
      expect(DEFAULT_TRAVELER_CONFIG.title).toBe('Knowledge Seeker')
    })

    it('has violet accent color', () => {
      expect(DEFAULT_TRAVELER_CONFIG.accentColor).toBe('#8b5cf6')
    })

    it('does not have avatarUrl by default', () => {
      expect(DEFAULT_TRAVELER_CONFIG.avatarUrl).toBeUndefined()
    })

    it('does not have createdAt by default', () => {
      expect(DEFAULT_TRAVELER_CONFIG.createdAt).toBeUndefined()
    })

    it('does not have updatedAt by default', () => {
      expect(DEFAULT_TRAVELER_CONFIG.updatedAt).toBeUndefined()
    })
  })

  // ============================================================================
  // PRESET_TRAVELERS
  // ============================================================================

  describe('PRESET_TRAVELERS', () => {
    it('is an array', () => {
      expect(Array.isArray(PRESET_TRAVELERS)).toBe(true)
    })

    it('has 10 presets', () => {
      expect(PRESET_TRAVELERS).toHaveLength(10)
    })

    it('includes Traveler preset', () => {
      const traveler = PRESET_TRAVELERS.find((p) => p.name === 'Traveler')
      expect(traveler).toBeDefined()
      expect(traveler?.title).toBe('Knowledge Seeker')
      expect(traveler?.icon).toBe('🧭')
    })

    it('includes Scholar preset', () => {
      const scholar = PRESET_TRAVELERS.find((p) => p.name === 'Scholar')
      expect(scholar).toBeDefined()
      expect(scholar?.title).toBe('Academic')
      expect(scholar?.icon).toBe('📚')
    })

    it('includes Researcher preset', () => {
      const researcher = PRESET_TRAVELERS.find((p) => p.name === 'Researcher')
      expect(researcher).toBeDefined()
      expect(researcher?.title).toBe('Investigator')
      expect(researcher?.icon).toBe('🔬')
    })

    it('includes Creator preset', () => {
      const creator = PRESET_TRAVELERS.find((p) => p.name === 'Creator')
      expect(creator).toBeDefined()
      expect(creator?.title).toBe('Builder')
      expect(creator?.icon).toBe('🛠️')
    })

    it('includes Student preset', () => {
      const student = PRESET_TRAVELERS.find((p) => p.name === 'Student')
      expect(student).toBeDefined()
      expect(student?.title).toBe('Learner')
      expect(student?.icon).toBe('🎓')
    })

    it('includes Writer preset', () => {
      const writer = PRESET_TRAVELERS.find((p) => p.name === 'Writer')
      expect(writer).toBeDefined()
      expect(writer?.title).toBe('Wordsmith')
    })

    it('includes Thinker preset', () => {
      const thinker = PRESET_TRAVELERS.find((p) => p.name === 'Thinker')
      expect(thinker).toBeDefined()
      expect(thinker?.title).toBe('Philosopher')
    })

    it('includes Explorer preset', () => {
      const explorer = PRESET_TRAVELERS.find((p) => p.name === 'Explorer')
      expect(explorer).toBeDefined()
      expect(explorer?.title).toBe('Adventurer')
    })

    it('includes Curator preset', () => {
      const curator = PRESET_TRAVELERS.find((p) => p.name === 'Curator')
      expect(curator).toBeDefined()
      expect(curator?.title).toBe('Collector')
    })

    it('includes Mentor preset', () => {
      const mentor = PRESET_TRAVELERS.find((p) => p.name === 'Mentor')
      expect(mentor).toBeDefined()
      expect(mentor?.title).toBe('Guide')
    })

    it('all presets have required properties', () => {
      PRESET_TRAVELERS.forEach((preset) => {
        expect(preset.name).toBeDefined()
        expect(preset.title).toBeDefined()
        expect(preset.icon).toBeDefined()
        expect(preset.description).toBeDefined()
      })
    })

    it('all presets have non-empty descriptions', () => {
      PRESET_TRAVELERS.forEach((preset) => {
        expect(preset.description.length).toBeGreaterThan(0)
      })
    })
  })

  // ============================================================================
  // TRAVELER_ACCENT_COLORS
  // ============================================================================

  describe('TRAVELER_ACCENT_COLORS', () => {
    it('is an array', () => {
      expect(Array.isArray(TRAVELER_ACCENT_COLORS)).toBe(true)
    })

    it('has 10 colors', () => {
      expect(TRAVELER_ACCENT_COLORS).toHaveLength(10)
    })

    it('includes Violet', () => {
      const violet = TRAVELER_ACCENT_COLORS.find((c) => c.name === 'Violet')
      expect(violet).toBeDefined()
      expect(violet?.value).toBe('#8b5cf6')
      expect(violet?.class).toBe('bg-violet-500')
    })

    it('includes Indigo', () => {
      const indigo = TRAVELER_ACCENT_COLORS.find((c) => c.name === 'Indigo')
      expect(indigo).toBeDefined()
      expect(indigo?.value).toBe('#6366f1')
    })

    it('includes Blue', () => {
      const blue = TRAVELER_ACCENT_COLORS.find((c) => c.name === 'Blue')
      expect(blue).toBeDefined()
      expect(blue?.value).toBe('#3b82f6')
    })

    it('includes Cyan', () => {
      const cyan = TRAVELER_ACCENT_COLORS.find((c) => c.name === 'Cyan')
      expect(cyan).toBeDefined()
      expect(cyan?.value).toBe('#06b6d4')
    })

    it('includes Teal', () => {
      const teal = TRAVELER_ACCENT_COLORS.find((c) => c.name === 'Teal')
      expect(teal).toBeDefined()
      expect(teal?.value).toBe('#14b8a6')
    })

    it('includes Emerald', () => {
      const emerald = TRAVELER_ACCENT_COLORS.find((c) => c.name === 'Emerald')
      expect(emerald).toBeDefined()
      expect(emerald?.value).toBe('#10b981')
    })

    it('includes Amber', () => {
      const amber = TRAVELER_ACCENT_COLORS.find((c) => c.name === 'Amber')
      expect(amber).toBeDefined()
      expect(amber?.value).toBe('#f59e0b')
    })

    it('includes Rose', () => {
      const rose = TRAVELER_ACCENT_COLORS.find((c) => c.name === 'Rose')
      expect(rose).toBeDefined()
      expect(rose?.value).toBe('#f43f5e')
    })

    it('includes Purple', () => {
      const purple = TRAVELER_ACCENT_COLORS.find((c) => c.name === 'Purple')
      expect(purple).toBeDefined()
      expect(purple?.value).toBe('#a855f7')
    })

    it('includes Pink', () => {
      const pink = TRAVELER_ACCENT_COLORS.find((c) => c.name === 'Pink')
      expect(pink).toBeDefined()
      expect(pink?.value).toBe('#ec4899')
    })

    it('all colors have valid hex values', () => {
      TRAVELER_ACCENT_COLORS.forEach((color) => {
        expect(color.value).toMatch(/^#[0-9a-fA-F]{6}$/)
      })
    })

    it('all colors have Tailwind class', () => {
      TRAVELER_ACCENT_COLORS.forEach((color) => {
        expect(color.class).toMatch(/^bg-\w+-500$/)
      })
    })
  })

  // ============================================================================
  // getTravelerConfig
  // ============================================================================

  describe('getTravelerConfig', () => {
    it('returns stored config from localStorage', () => {
      const storedConfig: TravelerConfig = {
        name: 'CustomUser',
        title: 'Developer',
        accentColor: '#3b82f6',
      }
      vi.mocked(getLocalStorage).mockReturnValue(storedConfig)

      const config = getTravelerConfig()

      expect(config.name).toBe('CustomUser')
      expect(config.title).toBe('Developer')
      expect(config.accentColor).toBe('#3b82f6')
    })

    it('merges stored config with defaults', () => {
      const storedConfig: Partial<TravelerConfig> = {
        name: 'CustomUser',
      }
      vi.mocked(getLocalStorage).mockReturnValue(storedConfig)

      const config = getTravelerConfig()

      expect(config.name).toBe('CustomUser')
      expect(config.title).toBe('Knowledge Seeker') // from default
      expect(config.accentColor).toBe('#8b5cf6') // from default
    })

    it('uses environment variables when no localStorage', () => {
      vi.mocked(getLocalStorage).mockReturnValue(null)
      process.env.NEXT_PUBLIC_FABRIC_TRAVELER_NAME = 'EnvUser'
      process.env.NEXT_PUBLIC_FABRIC_TRAVELER_TITLE = 'EnvTitle'
      process.env.NEXT_PUBLIC_FABRIC_TRAVELER_ACCENT_COLOR = '#ff0000'

      const config = getTravelerConfig()

      expect(config.name).toBe('EnvUser')
      expect(config.title).toBe('EnvTitle')
      expect(config.accentColor).toBe('#ff0000')
    })

    it('uses partial environment variables', () => {
      vi.mocked(getLocalStorage).mockReturnValue(null)
      process.env.NEXT_PUBLIC_FABRIC_TRAVELER_NAME = 'EnvUser'
      delete process.env.NEXT_PUBLIC_FABRIC_TRAVELER_TITLE

      const config = getTravelerConfig()

      expect(config.name).toBe('EnvUser')
      expect(config.title).toBe('Knowledge Seeker') // default
    })

    it('returns defaults when no storage or env', () => {
      vi.mocked(getLocalStorage).mockReturnValue(null)
      delete process.env.NEXT_PUBLIC_FABRIC_TRAVELER_NAME
      delete process.env.NEXT_PUBLIC_FABRIC_TRAVELER_TITLE
      delete process.env.NEXT_PUBLIC_FABRIC_TRAVELER_ACCENT_COLOR

      const config = getTravelerConfig()

      expect(config.name).toBe('Traveler')
      expect(config.title).toBe('Knowledge Seeker')
      expect(config.accentColor).toBe('#8b5cf6')
    })
  })

  // ============================================================================
  // setTravelerConfig
  // ============================================================================

  describe('setTravelerConfig', () => {
    it('calls setLocalStorage with updated config', () => {
      vi.mocked(getLocalStorage).mockReturnValue(null)

      setTravelerConfig({ name: 'NewUser' })

      expect(setLocalStorage).toHaveBeenCalled()
      const savedConfig = vi.mocked(setLocalStorage).mock.calls[0][1] as TravelerConfig
      expect(savedConfig.name).toBe('NewUser')
    })

    it('preserves existing config values', () => {
      vi.mocked(getLocalStorage).mockReturnValue({
        name: 'ExistingUser',
        title: 'ExistingTitle',
        accentColor: '#123456',
      })

      setTravelerConfig({ title: 'NewTitle' })

      const savedConfig = vi.mocked(setLocalStorage).mock.calls[0][1] as TravelerConfig
      expect(savedConfig.name).toBe('ExistingUser')
      expect(savedConfig.title).toBe('NewTitle')
      expect(savedConfig.accentColor).toBe('#123456')
    })

    it('sets updatedAt timestamp', () => {
      vi.mocked(getLocalStorage).mockReturnValue(null)
      const before = new Date().toISOString()

      setTravelerConfig({ name: 'User' })

      const savedConfig = vi.mocked(setLocalStorage).mock.calls[0][1] as TravelerConfig
      expect(savedConfig.updatedAt).toBeDefined()
      const updatedAt = new Date(savedConfig.updatedAt!).getTime()
      expect(updatedAt).toBeGreaterThanOrEqual(new Date(before).getTime())
    })

    it('sets createdAt if not already set', () => {
      vi.mocked(getLocalStorage).mockReturnValue(null)

      setTravelerConfig({ name: 'NewUser' })

      const savedConfig = vi.mocked(setLocalStorage).mock.calls[0][1] as TravelerConfig
      expect(savedConfig.createdAt).toBeDefined()
    })

    it('preserves existing createdAt', () => {
      vi.mocked(getLocalStorage).mockReturnValue({
        name: 'User',
        createdAt: '2024-01-01T00:00:00Z',
      })

      setTravelerConfig({ title: 'NewTitle' })

      const savedConfig = vi.mocked(setLocalStorage).mock.calls[0][1] as TravelerConfig
      expect(savedConfig.createdAt).toBe('2024-01-01T00:00:00Z')
    })

    it('can update multiple fields at once', () => {
      vi.mocked(getLocalStorage).mockReturnValue(null)

      setTravelerConfig({
        name: 'MultiUser',
        title: 'MultiTitle',
        accentColor: '#ff00ff',
        avatarUrl: 'https://example.com/avatar.png',
      })

      const savedConfig = vi.mocked(setLocalStorage).mock.calls[0][1] as TravelerConfig
      expect(savedConfig.name).toBe('MultiUser')
      expect(savedConfig.title).toBe('MultiTitle')
      expect(savedConfig.accentColor).toBe('#ff00ff')
      expect(savedConfig.avatarUrl).toBe('https://example.com/avatar.png')
    })
  })

  // ============================================================================
  // resetTravelerConfig
  // ============================================================================

  describe('resetTravelerConfig', () => {
    it('removes config from localStorage', () => {
      const mockRemoveItem = vi.fn()
      Object.defineProperty(global, 'localStorage', {
        value: {
          removeItem: mockRemoveItem,
        },
        writable: true,
      })

      resetTravelerConfig()

      expect(mockRemoveItem).toHaveBeenCalledWith('fabric-traveler-config')
    })

    it('handles undefined localStorage gracefully', () => {
      const originalLocalStorage = global.localStorage
      // @ts-expect-error - intentionally setting to undefined
      global.localStorage = undefined

      expect(() => resetTravelerConfig()).not.toThrow()

      global.localStorage = originalLocalStorage
    })
  })

  // ============================================================================
  // getTravelerGreeting
  // ============================================================================

  describe('getTravelerGreeting', () => {
    it('returns morning greeting before noon', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T08:00:00'))

      const greeting = getTravelerGreeting('TestUser')

      expect(greeting).toBe('Good morning, TestUser')

      vi.useRealTimers()
    })

    it('returns afternoon greeting between noon and 5pm', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T14:00:00'))

      const greeting = getTravelerGreeting('TestUser')

      expect(greeting).toBe('Good afternoon, TestUser')

      vi.useRealTimers()
    })

    it('returns evening greeting after 5pm', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T19:00:00'))

      const greeting = getTravelerGreeting('TestUser')

      expect(greeting).toBe('Good evening, TestUser')

      vi.useRealTimers()
    })

    it('uses config name when no name provided', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T10:00:00'))
      vi.mocked(getLocalStorage).mockReturnValue({ name: 'ConfigUser' })

      const greeting = getTravelerGreeting()

      expect(greeting).toBe('Good morning, ConfigUser')

      vi.useRealTimers()
    })

    it('handles midnight correctly (morning)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T00:00:00'))

      const greeting = getTravelerGreeting('User')

      expect(greeting).toBe('Good morning, User')

      vi.useRealTimers()
    })

    it('handles noon boundary (afternoon)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T12:00:00'))

      const greeting = getTravelerGreeting('User')

      expect(greeting).toBe('Good afternoon, User')

      vi.useRealTimers()
    })

    it('handles 5pm boundary (evening)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T17:00:00'))

      const greeting = getTravelerGreeting('User')

      expect(greeting).toBe('Good evening, User')

      vi.useRealTimers()
    })

    it('handles 11:59pm (evening)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T23:59:00'))

      const greeting = getTravelerGreeting('User')

      expect(greeting).toBe('Good evening, User')

      vi.useRealTimers()
    })
  })

  // ============================================================================
  // canEditTravelerConfig
  // ============================================================================

  describe('canEditTravelerConfig', () => {
    describe('local backend', () => {
      it('allows editing regardless of PAT', () => {
        expect(canEditTravelerConfig('local', false)).toEqual({ canEdit: true })
        expect(canEditTravelerConfig('local', true)).toEqual({ canEdit: true })
      })
    })

    describe('github backend', () => {
      it('allows editing with PAT', () => {
        const result = canEditTravelerConfig('github', true)
        expect(result.canEdit).toBe(true)
        expect(result.reason).toBeUndefined()
      })

      it('denies editing without PAT', () => {
        const result = canEditTravelerConfig('github', false)
        expect(result.canEdit).toBe(false)
        expect(result.reason).toContain('Personal Access Token')
        expect(result.reason).toContain('PAT')
      })

      it('provides helpful reason message', () => {
        const result = canEditTravelerConfig('github', false)
        expect(result.reason).toContain('Settings')
        expect(result.reason).toContain('GitHub Integration')
      })
    })

    describe('hybrid backend', () => {
      it('allows editing regardless of PAT', () => {
        expect(canEditTravelerConfig('hybrid', false)).toEqual({ canEdit: true })
        expect(canEditTravelerConfig('hybrid', true)).toEqual({ canEdit: true })
      })
    })

    describe('unknown backend', () => {
      it('defaults to allowing editing', () => {
        // @ts-expect-error - testing unknown backend type
        const result = canEditTravelerConfig('unknown', false)
        expect(result.canEdit).toBe(true)
      })
    })
  })

  // ============================================================================
  // Integration scenarios
  // ============================================================================

  describe('integration scenarios', () => {
    it('complete personalization flow', () => {
      // Start with defaults
      vi.mocked(getLocalStorage).mockReturnValue(null)
      let config = getTravelerConfig()
      expect(config.name).toBe('Traveler')

      // User customizes their profile
      const customConfig: Partial<TravelerConfig> = {
        name: 'Alex',
        title: 'Researcher',
        accentColor: '#10b981',
      }
      setTravelerConfig(customConfig)

      // Verify setLocalStorage was called
      expect(setLocalStorage).toHaveBeenCalled()
    })

    it('uses preset traveler', () => {
      const scholarPreset = PRESET_TRAVELERS.find((p) => p.name === 'Scholar')!

      setTravelerConfig({
        name: scholarPreset.name,
        title: scholarPreset.title,
      })

      const savedConfig = vi.mocked(setLocalStorage).mock.calls[0][1] as TravelerConfig
      expect(savedConfig.name).toBe('Scholar')
      expect(savedConfig.title).toBe('Academic')
    })

    it('uses preset accent color', () => {
      const emeraldColor = TRAVELER_ACCENT_COLORS.find((c) => c.name === 'Emerald')!

      setTravelerConfig({
        accentColor: emeraldColor.value,
      })

      const savedConfig = vi.mocked(setLocalStorage).mock.calls[0][1] as TravelerConfig
      expect(savedConfig.accentColor).toBe('#10b981')
    })
  })
})
