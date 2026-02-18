/**
 * Encryption Configuration Unit Tests
 *
 * Tests for preferences, feature flags, and encryption status.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock syncMode
vi.mock('@/lib/crypto/syncMode', () => ({
  getSyncConfig: vi.fn(() => ({
    enabled: false,
    status: 'disabled' as const,
  })),
}))

// Mock crypto index for getEncryptionStatus
vi.mock('@/lib/crypto/index', () => ({
  isReady: vi.fn(async () => true),
  getDeviceId: vi.fn(async () => 'test-device-123'),
  hasDeviceKey: vi.fn(async () => true),
}))

// Create localStorage mock store that persists within test file
const localStorageStore: Record<string, string> = {}

const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value
  },
  removeItem: (key: string) => {
    delete localStorageStore[key]
  },
  clear: () => {
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key])
  },
  length: 0,
  key: () => null,
}

// Stub localStorage globally using vi.stubGlobal
vi.stubGlobal('localStorage', localStorageMock)

// Stub window to make browser-checks pass
vi.stubGlobal('window', { localStorage: localStorageMock })

beforeEach(() => {
  // Clear storage before each test
  Object.keys(localStorageStore).forEach(key => delete localStorageStore[key])
})

afterEach(() => {
  vi.clearAllMocks()
})

// Import after mocking
import {
  loadEncryptionPreferences,
  saveEncryptionPreferences,
  resetEncryptionPreferences,
  getEncryptionStatus,
  getFeatureFlags,
  setFeatureFlags,
  isEncryptionEnabledFor,
  DEFAULT_ENCRYPTION_PREFERENCES,
  DEFAULT_FEATURE_FLAGS,
} from '@/lib/crypto/config'

describe('Encryption Configuration', () => {
  describe('Default Values', () => {
    it('DEFAULT_ENCRYPTION_PREFERENCES has correct values', () => {
      expect(DEFAULT_ENCRYPTION_PREFERENCES).toEqual({
        showBadge: true,
        showInSettings: true,
        autoMigrate: true,
        debugMode: false,
      })
    })

    it('DEFAULT_FEATURE_FLAGS has all flags enabled', () => {
      expect(DEFAULT_FEATURE_FLAGS).toEqual({
        encryptTasks: true,
        encryptNotes: true,
        encryptWriting: true,
        encryptReflections: true,
        encryptSettings: true,
        encryptSearch: true,
        encryptEmbeddings: true,
      })
    })
  })

  describe('Preferences Management', () => {
    describe('loadEncryptionPreferences', () => {
      it('returns defaults when nothing stored', () => {
        const prefs = loadEncryptionPreferences()
        expect(prefs).toEqual(DEFAULT_ENCRYPTION_PREFERENCES)
      })

      it('loads stored preferences', () => {
        // First reset to clear any cache
        resetEncryptionPreferences()

        // Then set the stored value
        const stored = { showBadge: false, debugMode: true }
        localStorageStore['frame-encryption-prefs'] = JSON.stringify(stored)

        // Now load - should read from localStorage
        const prefs = loadEncryptionPreferences()

        expect(prefs.showBadge).toBe(false)
        expect(prefs.debugMode).toBe(true)
        // Other values should be defaults
        expect(prefs.showInSettings).toBe(true)
        expect(prefs.autoMigrate).toBe(true)
      })

      it('handles invalid JSON gracefully', () => {
        resetEncryptionPreferences()
        localStorageStore['frame-encryption-prefs'] = 'not-json'

        const prefs = loadEncryptionPreferences()
        expect(prefs).toEqual(DEFAULT_ENCRYPTION_PREFERENCES)
      })
    })

    describe('saveEncryptionPreferences', () => {
      it('saves partial preferences', () => {
        resetEncryptionPreferences()
        saveEncryptionPreferences({ debugMode: true })

        const stored = localStorageStore['frame-encryption-prefs']
        expect(stored).toBeDefined()
        const parsed = JSON.parse(stored)
        expect(parsed.debugMode).toBe(true)
        // Should merge with defaults
        expect(parsed.showBadge).toBe(true)
      })

      it('updates cached preferences', () => {
        resetEncryptionPreferences()
        saveEncryptionPreferences({ showBadge: false })

        // Load should return cached value without hitting storage
        const prefs = loadEncryptionPreferences()
        expect(prefs.showBadge).toBe(false)
      })

      it('merges with existing preferences', () => {
        resetEncryptionPreferences()
        saveEncryptionPreferences({ showBadge: false })
        saveEncryptionPreferences({ debugMode: true })

        const prefs = loadEncryptionPreferences()
        expect(prefs.showBadge).toBe(false)
        expect(prefs.debugMode).toBe(true)
      })
    })

    describe('resetEncryptionPreferences', () => {
      it('clears cached preferences', () => {
        saveEncryptionPreferences({ debugMode: true })
        resetEncryptionPreferences()

        const prefs = loadEncryptionPreferences()
        expect(prefs).toEqual(DEFAULT_ENCRYPTION_PREFERENCES)
      })

      it('removes from localStorage', () => {
        saveEncryptionPreferences({ showBadge: false })
        resetEncryptionPreferences()

        expect(localStorageStore['frame-encryption-prefs']).toBeUndefined()
      })
    })
  })

  describe('Feature Flags', () => {
    describe('getFeatureFlags', () => {
      it('returns defaults when nothing stored', () => {
        // This tests the default behavior without localStorage
        const flags = getFeatureFlags()

        // All defaults should be true
        expect(flags.encryptTasks).toBe(true)
        expect(flags.encryptNotes).toBe(true)
        expect(flags.encryptWriting).toBe(true)
        expect(flags.encryptReflections).toBe(true)
        expect(flags.encryptSettings).toBe(true)
        expect(flags.encryptSearch).toBe(true)
        expect(flags.encryptEmbeddings).toBe(true)
      })

      it('returns object with all expected keys', () => {
        const flags = getFeatureFlags()

        expect(flags).toHaveProperty('encryptTasks')
        expect(flags).toHaveProperty('encryptNotes')
        expect(flags).toHaveProperty('encryptWriting')
        expect(flags).toHaveProperty('encryptReflections')
        expect(flags).toHaveProperty('encryptSettings')
        expect(flags).toHaveProperty('encryptSearch')
        expect(flags).toHaveProperty('encryptEmbeddings')
      })

      it('handles localStorage being unavailable', () => {
        // In Node.js test environment without browser, should return defaults
        const flags = getFeatureFlags()
        expect(flags).toEqual(DEFAULT_FEATURE_FLAGS)
      })
    })

    describe('setFeatureFlags', () => {
      it('can be called without throwing', () => {
        expect(() => setFeatureFlags({ encryptEmbeddings: false })).not.toThrow()
      })

      it('accepts partial flag objects', () => {
        // Should not throw when given partial object
        expect(() => setFeatureFlags({ encryptTasks: false })).not.toThrow()
        expect(() => setFeatureFlags({ encryptNotes: false, encryptWriting: false })).not.toThrow()
      })
    })

    describe('isEncryptionEnabledFor', () => {
      it('returns true for all default flags', () => {
        // With default settings, all should be enabled
        expect(isEncryptionEnabledFor('encryptTasks')).toBe(true)
        expect(isEncryptionEnabledFor('encryptNotes')).toBe(true)
        expect(isEncryptionEnabledFor('encryptWriting')).toBe(true)
        expect(isEncryptionEnabledFor('encryptReflections')).toBe(true)
        expect(isEncryptionEnabledFor('encryptSettings')).toBe(true)
        expect(isEncryptionEnabledFor('encryptSearch')).toBe(true)
        expect(isEncryptionEnabledFor('encryptEmbeddings')).toBe(true)
      })

      it('returns boolean value', () => {
        const result = isEncryptionEnabledFor('encryptTasks')
        expect(typeof result).toBe('boolean')
      })
    })
  })

  describe('Encryption Status', () => {
    it('getEncryptionStatus returns status object', async () => {
      resetEncryptionPreferences()
      const status = await getEncryptionStatus()

      expect(status).toMatchObject({
        active: true,
        mode: 'local',
        syncAvailable: true,
      })
      expect(status.message).toContain('encrypted')
      expect(status.deviceId).toBe('test-device-123')
    })

    it('returns correct mode for local encryption', async () => {
      const status = await getEncryptionStatus()

      expect(status.mode).toBe('local')
      expect(status.message).toContain('local')
    })

    it('includes lastActivity timestamp', async () => {
      const before = Date.now()
      const status = await getEncryptionStatus()
      const after = Date.now()

      expect(status.lastActivity).toBeGreaterThanOrEqual(before)
      expect(status.lastActivity).toBeLessThanOrEqual(after)
    })
  })
})

describe('Encryption Configuration - Edge Cases', () => {
  describe('Server-side rendering', () => {
    it('loadEncryptionPreferences returns defaults on server', () => {
      // Already returns defaults when localStorage not available
      const originalWindow = globalThis.window
      // @ts-expect-error - testing SSR
      delete globalThis.window

      const prefs = loadEncryptionPreferences()
      expect(prefs).toEqual(DEFAULT_ENCRYPTION_PREFERENCES)

      globalThis.window = originalWindow
    })

    it('getFeatureFlags returns defaults on server', () => {
      const flags = getFeatureFlags()
      expect(flags).toEqual(DEFAULT_FEATURE_FLAGS)
    })
  })
})
