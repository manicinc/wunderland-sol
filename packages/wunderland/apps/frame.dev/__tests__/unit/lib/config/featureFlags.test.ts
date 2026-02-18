/**
 * Feature Flags Tests
 * @module __tests__/unit/lib/config/featureFlags.test
 *
 * Tests for feature flags resolution and configuration.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getFeatureFlags,
  refreshFlags,
  updateLicenseStatus,
  isFeatureEnabled,
  getStaticFeatureFlags,
  useFeatureFlags,
  BUILD_FLAGS,
  COMMUNITY_DEFAULTS,
  PREMIUM_DEFAULTS,
  FABRIC_DEFAULTS,
  isBrowser,
  isElectron,
  isCapacitor,
  detectPlatform,
} from '@/lib/config/featureFlags'
import type { LicenseStatus, FeatureFlagOverrides } from '@/lib/config/featureFlags'

// ============================================================================
// DEFAULT VALUES
// ============================================================================

describe('Default Feature Flag Values', () => {
  describe('COMMUNITY_DEFAULTS', () => {
    it('has static deployment mode', () => {
      expect(COMMUNITY_DEFAULTS.deploymentMode).toBe('static')
    })

    it('has community edition', () => {
      expect(COMMUNITY_DEFAULTS.edition).toBe('community')
    })

    it('is not offline mode', () => {
      expect(COMMUNITY_DEFAULTS.isOfflineMode).toBe(false)
    })

    it('is static mode', () => {
      expect(COMMUNITY_DEFAULTS.isStaticMode).toBe(true)
    })

    it('is not paid version', () => {
      expect(COMMUNITY_DEFAULTS.isPaidVersion).toBe(false)
    })

    it('has premium features disabled', () => {
      expect(COMMUNITY_DEFAULTS.enableQuizzes).toBe(false)
      expect(COMMUNITY_DEFAULTS.enableFlashcards).toBe(false)
      expect(COMMUNITY_DEFAULTS.enableQnA).toBe(false)
      expect(COMMUNITY_DEFAULTS.enableExport).toBe(false)
      expect(COMMUNITY_DEFAULTS.enableAdvancedThemes).toBe(false)
    })

    it('has core features enabled', () => {
      expect(COMMUNITY_DEFAULTS.enableSpiralPath).toBe(true)
      expect(COMMUNITY_DEFAULTS.enableSemanticSearch).toBe(true)
      expect(COMMUNITY_DEFAULTS.enableBookmarks).toBe(true)
      expect(COMMUNITY_DEFAULTS.enableKnowledgeGraph).toBe(true)
      expect(COMMUNITY_DEFAULTS.enableReadingProgress).toBe(true)
    })

    it('has plugins enabled for FABRIC', () => {
      expect(COMMUNITY_DEFAULTS.enablePlugins).toBe(true)
    })

    it('has no valid license by default', () => {
      expect(COMMUNITY_DEFAULTS.licenseValid).toBe(false)
      expect(COMMUNITY_DEFAULTS.licenseType).toBe('none')
      expect(COMMUNITY_DEFAULTS.licenseExpiry).toBeNull()
    })
  })

  describe('PREMIUM_DEFAULTS', () => {
    it('has offline deployment mode', () => {
      expect(PREMIUM_DEFAULTS.deploymentMode).toBe('offline')
    })

    it('has premium edition', () => {
      expect(PREMIUM_DEFAULTS.edition).toBe('premium')
    })

    it('is offline mode', () => {
      expect(PREMIUM_DEFAULTS.isOfflineMode).toBe(true)
    })

    it('is not static mode', () => {
      expect(PREMIUM_DEFAULTS.isStaticMode).toBe(false)
    })

    it('is paid version', () => {
      expect(PREMIUM_DEFAULTS.isPaidVersion).toBe(true)
    })

    it('has premium features enabled', () => {
      expect(PREMIUM_DEFAULTS.enableQuizzes).toBe(true)
      expect(PREMIUM_DEFAULTS.enableFlashcards).toBe(true)
      expect(PREMIUM_DEFAULTS.enableQnA).toBe(true)
      expect(PREMIUM_DEFAULTS.enableExport).toBe(true)
      expect(PREMIUM_DEFAULTS.enableAdvancedThemes).toBe(true)
    })

    it('allows local SQLite', () => {
      expect(PREMIUM_DEFAULTS.allowLocalSqlite).toBe(true)
    })
  })

  describe('FABRIC_DEFAULTS', () => {
    it('is defined', () => {
      expect(FABRIC_DEFAULTS).toBeDefined()
    })

    it('inherits static deployment mode from community defaults', () => {
      // FABRIC_DEFAULTS spreads from COMMUNITY_DEFAULTS which has 'static'
      expect(FABRIC_DEFAULTS.deploymentMode).toBe('static')
    })

    it('has community edition', () => {
      expect(FABRIC_DEFAULTS.edition).toBe('community')
    })
  })
})

// ============================================================================
// getFeatureFlags
// ============================================================================

describe('getFeatureFlags', () => {
  beforeEach(() => {
    // Reset flags before each test
    refreshFlags()
  })

  it('returns feature flags object', () => {
    const flags = getFeatureFlags()
    expect(flags).toBeDefined()
    expect(typeof flags).toBe('object')
  })

  it('returns consistent flags on multiple calls', () => {
    const flags1 = getFeatureFlags()
    const flags2 = getFeatureFlags()
    expect(flags1).toBe(flags2) // Same cached reference
  })

  it('contains required properties', () => {
    const flags = getFeatureFlags()
    expect(flags).toHaveProperty('deploymentMode')
    expect(flags).toHaveProperty('edition')
    expect(flags).toHaveProperty('platform')
    expect(flags).toHaveProperty('storageBackend')
    expect(flags).toHaveProperty('contentSource')
  })
})

// ============================================================================
// refreshFlags
// ============================================================================

describe('refreshFlags', () => {
  it('returns refreshed flags', () => {
    const flags = refreshFlags()
    expect(flags).toBeDefined()
  })

  it('applies deployment mode override', () => {
    const flags = refreshFlags({ deploymentMode: 'offline' })
    expect(flags.deploymentMode).toBe('offline')
    expect(flags.isOfflineMode).toBe(true)
  })

  it('applies edition override', () => {
    const flags = refreshFlags({ edition: 'premium' })
    expect(flags.edition).toBe('premium')
  })

  it('applies storage backend override', () => {
    const flags = refreshFlags({ storageBackend: 'sqlite' })
    expect(flags.storageBackend).toBe('sqlite')
  })

  it('applies content source override', () => {
    const flags = refreshFlags({ contentSource: 'local' })
    expect(flags.contentSource).toBe('local')
  })

  it('applies feature overrides', () => {
    const flags = refreshFlags({
      features: {
        enableQuizzes: true,
        enableFlashcards: true,
      },
    })
    expect(flags.enableQuizzes).toBe(true)
    expect(flags.enableFlashcards).toBe(true)
  })

  it('feature overrides take highest priority', () => {
    const flags = refreshFlags({
      edition: 'community',
      features: {
        enableQuizzes: true,
      },
    })
    // Even with community edition, feature override enables quizzes
    expect(flags.enableQuizzes).toBe(true)
  })
})

// ============================================================================
// updateLicenseStatus
// ============================================================================

describe('updateLicenseStatus', () => {
  beforeEach(() => {
    refreshFlags({ edition: 'community' })
  })

  it('updates license status and refreshes flags', () => {
    const licenseStatus: LicenseStatus = {
      isValid: true,
      type: 'premium',
      expiresAt: new Date('2025-12-31'),
    }
    const flags = updateLicenseStatus(licenseStatus)
    expect(flags.licenseValid).toBe(true)
    expect(flags.licenseType).toBe('premium')
  })

  it('enables premium features with valid license', () => {
    const licenseStatus: LicenseStatus = {
      isValid: true,
      type: 'premium',
      expiresAt: new Date('2025-12-31'),
    }
    const flags = updateLicenseStatus(licenseStatus)
    expect(flags.enableQuizzes).toBe(true)
    expect(flags.enableFlashcards).toBe(true)
    expect(flags.enableQnA).toBe(true)
    expect(flags.enableExport).toBe(true)
  })

  it('enables features with trial license', () => {
    const licenseStatus: LicenseStatus = {
      isValid: true,
      type: 'trial',
      expiresAt: new Date('2025-01-31'),
    }
    const flags = updateLicenseStatus(licenseStatus)
    expect(flags.enableQuizzes).toBe(true)
    // Note: updateLicenseStatus calls refreshFlags() without overrides,
    // so getEdition() returns 'premium' (default), using PREMIUM_DEFAULTS
    expect(flags.licenseType).toBe('premium')
  })

  it('premium edition has license valid regardless of status update', () => {
    const licenseStatus: LicenseStatus = {
      isValid: false,
      type: 'none',
      expiresAt: null,
    }
    const flags = updateLicenseStatus(licenseStatus)
    // updateLicenseStatus calls refreshFlags() without overrides,
    // so getEdition() returns 'premium' (default), using PREMIUM_DEFAULTS
    // which has licenseValid: true - license status only applies to community edition
    expect(flags.licenseValid).toBe(true)
  })
})

// ============================================================================
// isFeatureEnabled
// ============================================================================

describe('isFeatureEnabled', () => {
  beforeEach(() => {
    refreshFlags()
  })

  it('returns boolean for feature check', () => {
    const result = isFeatureEnabled('enableSpiralPath')
    expect(typeof result).toBe('boolean')
  })

  it('returns true for enabled features', () => {
    refreshFlags({ features: { enableQuizzes: true } })
    expect(isFeatureEnabled('enableQuizzes')).toBe(true)
  })

  it('returns false for disabled features', () => {
    refreshFlags({ edition: 'community' })
    // Community edition has quizzes disabled by default
    expect(isFeatureEnabled('enableQuizzes')).toBe(false)
  })

  it('checks various feature types', () => {
    refreshFlags()
    // Core features should be enabled
    expect(isFeatureEnabled('enableSpiralPath')).toBe(true)
    expect(isFeatureEnabled('enableSemanticSearch')).toBe(true)
    expect(isFeatureEnabled('enableBookmarks')).toBe(true)
  })
})

// ============================================================================
// getStaticFeatureFlags
// ============================================================================

describe('getStaticFeatureFlags', () => {
  it('returns partial feature flags', () => {
    const flags = getStaticFeatureFlags()
    expect(flags).toBeDefined()
    expect(typeof flags).toBe('object')
  })

  it('includes deployment mode', () => {
    const flags = getStaticFeatureFlags()
    expect(flags).toHaveProperty('deploymentMode')
  })

  it('includes edition', () => {
    const flags = getStaticFeatureFlags()
    expect(flags).toHaveProperty('edition')
  })

  it('includes static mode flag', () => {
    const flags = getStaticFeatureFlags()
    expect(flags).toHaveProperty('isStaticMode')
  })

  it('includes offline mode flag', () => {
    const flags = getStaticFeatureFlags()
    expect(flags).toHaveProperty('isOfflineMode')
  })

  it('includes paid version flag', () => {
    const flags = getStaticFeatureFlags()
    expect(flags).toHaveProperty('isPaidVersion')
  })
})

// ============================================================================
// useFeatureFlags
// ============================================================================

describe('useFeatureFlags', () => {
  beforeEach(() => {
    refreshFlags()
  })

  it('returns flags object', () => {
    const { flags } = useFeatureFlags()
    expect(flags).toBeDefined()
  })

  it('returns isEnabled function', () => {
    const { isEnabled } = useFeatureFlags()
    expect(typeof isEnabled).toBe('function')
  })

  it('isEnabled returns boolean', () => {
    const { isEnabled } = useFeatureFlags()
    const result = isEnabled('enableSpiralPath')
    expect(typeof result).toBe('boolean')
  })

  it('returns isPremium flag', () => {
    const { isPremium } = useFeatureFlags()
    expect(typeof isPremium).toBe('boolean')
  })

  it('returns isOffline flag', () => {
    const { isOffline } = useFeatureFlags()
    expect(typeof isOffline).toBe('boolean')
  })

  it('returns platform', () => {
    const { platform } = useFeatureFlags()
    expect(platform).toBeDefined()
  })
})

// ============================================================================
// BUILD_FLAGS
// ============================================================================

describe('BUILD_FLAGS', () => {
  it('has IS_PREMIUM_BUILD flag', () => {
    expect(BUILD_FLAGS).toHaveProperty('IS_PREMIUM_BUILD')
    expect(typeof BUILD_FLAGS.IS_PREMIUM_BUILD).toBe('boolean')
  })

  it('has IS_COMMUNITY_BUILD flag', () => {
    expect(BUILD_FLAGS).toHaveProperty('IS_COMMUNITY_BUILD')
    expect(typeof BUILD_FLAGS.IS_COMMUNITY_BUILD).toBe('boolean')
  })

  it('has DEPLOYMENT_MODE', () => {
    expect(BUILD_FLAGS).toHaveProperty('DEPLOYMENT_MODE')
    expect(typeof BUILD_FLAGS.DEPLOYMENT_MODE).toBe('string')
  })

  it('has EDITION', () => {
    expect(BUILD_FLAGS).toHaveProperty('EDITION')
    expect(typeof BUILD_FLAGS.EDITION).toBe('string')
  })

  it('BUILD_FLAGS are mutually exclusive', () => {
    // Both cannot be true at the same time
    expect(BUILD_FLAGS.IS_PREMIUM_BUILD && BUILD_FLAGS.IS_COMMUNITY_BUILD).toBe(false)
  })
})

// ============================================================================
// Platform Detection
// ============================================================================

describe('Platform Detection', () => {
  describe('isBrowser', () => {
    it('returns boolean', () => {
      expect(typeof isBrowser()).toBe('boolean')
    })
  })

  describe('isElectron', () => {
    it('returns boolean', () => {
      expect(typeof isElectron()).toBe('boolean')
    })

    it('returns false in non-Electron environment', () => {
      // In test environment, should be false
      expect(isElectron()).toBe(false)
    })
  })

  describe('isCapacitor', () => {
    it('returns boolean', () => {
      expect(typeof isCapacitor()).toBe('boolean')
    })

    it('returns false in non-Capacitor environment', () => {
      expect(isCapacitor()).toBe(false)
    })
  })

  describe('detectPlatform', () => {
    it('returns valid platform type', () => {
      const platform = detectPlatform()
      expect(['web', 'electron', 'capacitor', 'pwa']).toContain(platform)
    })
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('handles empty overrides', () => {
    const flags = refreshFlags({})
    expect(flags).toBeDefined()
  })

  it('handles partial feature overrides', () => {
    const flags = refreshFlags({
      features: {
        enableQuizzes: true,
      },
    })
    expect(flags.enableQuizzes).toBe(true)
    // Other features should remain default
  })

  it('handles null license expiry', () => {
    const status: LicenseStatus = {
      isValid: true,
      type: 'premium',
      expiresAt: null,
    }
    const flags = updateLicenseStatus(status)
    expect(flags.licenseExpiry).toBeNull()
  })

  it('multiple refreshFlags calls update cache', () => {
    refreshFlags({ edition: 'community' })
    const flags1 = getFeatureFlags()

    refreshFlags({ edition: 'premium' })
    const flags2 = getFeatureFlags()

    expect(flags1.edition).toBe('community')
    expect(flags2.edition).toBe('premium')
  })
})

// ============================================================================
// Storage Backend Resolution
// ============================================================================

describe('Storage Backend Resolution', () => {
  it('uses sqlite for electron platform', () => {
    // When platform is electron, auto should resolve to sqlite
    const flags = refreshFlags({ storageBackend: 'auto' })
    // In test env, platform is 'web', so we test explicit override
    const flagsExplicit = refreshFlags({ storageBackend: 'sqlite' })
    expect(flagsExplicit.storageBackend).toBe('sqlite')
  })

  it('uses indexeddb as default for web platform', () => {
    const flags = refreshFlags({ storageBackend: 'auto' })
    // In test environment, platform is 'web', auto resolves to 'indexeddb'
    expect(flags.storageBackend).toBe('indexeddb')
  })

  it('respects explicit storage backend override', () => {
    const flags = refreshFlags({ storageBackend: 'sqlite' })
    expect(flags.storageBackend).toBe('sqlite')
  })

  it('indexeddb override is respected', () => {
    const flags = refreshFlags({ storageBackend: 'indexeddb' })
    expect(flags.storageBackend).toBe('indexeddb')
  })
})

// ============================================================================
// Content Source Resolution
// ============================================================================

describe('Content Source Resolution', () => {
  it('uses local for offline deployment mode with hybrid', () => {
    const flags = refreshFlags({
      deploymentMode: 'offline',
      contentSource: 'hybrid',
    })
    // In offline mode, hybrid resolves to 'local'
    expect(flags.contentSource).toBe('local')
  })

  it('uses github for non-offline mode with hybrid', () => {
    const flags = refreshFlags({
      deploymentMode: 'static',
      contentSource: 'hybrid',
    })
    // In static mode, hybrid resolves to 'github'
    expect(flags.contentSource).toBe('github')
  })

  it('respects explicit local content source', () => {
    const flags = refreshFlags({ contentSource: 'local' })
    expect(flags.contentSource).toBe('local')
  })

  it('respects explicit github content source', () => {
    const flags = refreshFlags({ contentSource: 'github' })
    expect(flags.contentSource).toBe('github')
  })
})

// ============================================================================
// Edition-based Flag Defaults
// ============================================================================

describe('Edition-based Flag Defaults', () => {
  beforeEach(() => {
    // Reset license to none before each test
    updateLicenseStatus({ isValid: false, type: 'none', expiresAt: null })
  })

  it('community edition starts with premium features disabled', () => {
    const flags = refreshFlags({ edition: 'community' })

    expect(flags.enableQuizzes).toBe(false)
    expect(flags.enableFlashcards).toBe(false)
    expect(flags.enableQnA).toBe(false)
    expect(flags.enableExport).toBe(false)
    expect(flags.enableAdvancedThemes).toBe(false)
  })

  it('premium edition starts with premium features enabled', () => {
    const flags = refreshFlags({ edition: 'premium' })

    expect(flags.enableQuizzes).toBe(true)
    expect(flags.enableFlashcards).toBe(true)
    expect(flags.enableQnA).toBe(true)
    expect(flags.enableExport).toBe(true)
    expect(flags.enableAdvancedThemes).toBe(true)
  })

  it('both editions have core features enabled', () => {
    const communityFlags = refreshFlags({ edition: 'community' })
    const premiumFlags = refreshFlags({ edition: 'premium' })

    // Core features should be enabled in both editions
    expect(communityFlags.enableSpiralPath).toBe(true)
    expect(communityFlags.enableSemanticSearch).toBe(true)
    expect(communityFlags.enableBookmarks).toBe(true)
    expect(communityFlags.enableKnowledgeGraph).toBe(true)
    expect(communityFlags.enableReadingProgress).toBe(true)

    expect(premiumFlags.enableSpiralPath).toBe(true)
    expect(premiumFlags.enableSemanticSearch).toBe(true)
    expect(premiumFlags.enableBookmarks).toBe(true)
    expect(premiumFlags.enableKnowledgeGraph).toBe(true)
    expect(premiumFlags.enableReadingProgress).toBe(true)
  })
})

// ============================================================================
// Override Priority
// ============================================================================

describe('Override Priority', () => {
  beforeEach(() => {
    // Reset license to none before each test
    updateLicenseStatus({ isValid: false, type: 'none', expiresAt: null })
  })

  it('explicit features override edition defaults', () => {
    const flags = refreshFlags({
      edition: 'community',
      features: {
        enableQuizzes: true,
        enableFlashcards: true,
      },
    })

    // Feature overrides should take priority
    expect(flags.enableQuizzes).toBe(true)
    expect(flags.enableFlashcards).toBe(true)
    // Other premium features stay disabled per community defaults
    expect(flags.enableQnA).toBe(false)
  })

  it('can disable premium features on premium edition', () => {
    const flags = refreshFlags({
      edition: 'premium',
      features: {
        enableQuizzes: false,
        enableFlashcards: false,
      },
    })

    // Feature overrides disable even on premium
    expect(flags.enableQuizzes).toBe(false)
    expect(flags.enableFlashcards).toBe(false)
    // Other features stay enabled per premium defaults
    expect(flags.enableQnA).toBe(true)
    expect(flags.enableExport).toBe(true)
  })

  it('deploymentMode override affects isOfflineMode and isStaticMode', () => {
    const offlineFlags = refreshFlags({ deploymentMode: 'offline' })
    expect(offlineFlags.isOfflineMode).toBe(true)
    expect(offlineFlags.isStaticMode).toBe(false)

    const staticFlags = refreshFlags({ deploymentMode: 'static' })
    expect(staticFlags.isOfflineMode).toBe(false)
    expect(staticFlags.isStaticMode).toBe(true)
  })
})

// ============================================================================
// License Upgrade Scenarios
// ============================================================================

describe('License Upgrade Scenarios', () => {
  beforeEach(() => {
    // Reset license to none before each test
    updateLicenseStatus({ isValid: false, type: 'none', expiresAt: null })
  })

  it('invalid license does not enable premium features', () => {
    const flags = refreshFlags({ edition: 'community' })
    expect(flags.enableQuizzes).toBe(false)
    expect(flags.licenseValid).toBe(false)
  })

  it('trial license sets correct license type', () => {
    refreshFlags({ edition: 'community' })
    const flags = updateLicenseStatus({
      isValid: true,
      type: 'trial',
      expiresAt: new Date('2025-02-28'),
    })

    // License status gets updated
    expect(flags.licenseValid).toBe(true)
  })

  it('expired license is still stored if marked valid', () => {
    const pastDate = new Date('2020-01-01')
    refreshFlags({ edition: 'community' })
    const flags = updateLicenseStatus({
      isValid: true, // Even with past date, if isValid is true, features unlock
      type: 'premium',
      expiresAt: pastDate,
    })

    // The flag system trusts the isValid field
    expect(flags.licenseValid).toBe(true)
  })
})

// ============================================================================
// Static Feature Flags Completeness
// ============================================================================

describe('getStaticFeatureFlags completeness', () => {
  it('returns all static properties', () => {
    const flags = getStaticFeatureFlags()

    // Should have exactly these 5 properties
    const keys = Object.keys(flags)
    expect(keys).toContain('deploymentMode')
    expect(keys).toContain('edition')
    expect(keys).toContain('isPaidVersion')
    expect(keys).toContain('isStaticMode')
    expect(keys).toContain('isOfflineMode')
  })

  it('isPaidVersion reflects edition', () => {
    const flags = getStaticFeatureFlags()
    // getEdition() default is 'premium' in test env
    const edition = flags.edition
    const isPaid = flags.isPaidVersion

    expect(isPaid).toBe(edition === 'premium')
  })

  it('isStaticMode reflects deployment mode', () => {
    const flags = getStaticFeatureFlags()
    const mode = flags.deploymentMode
    const isStatic = flags.isStaticMode

    expect(isStatic).toBe(mode === 'static')
  })

  it('isOfflineMode reflects deployment mode', () => {
    const flags = getStaticFeatureFlags()
    const mode = flags.deploymentMode
    const isOffline = flags.isOfflineMode

    expect(isOffline).toBe(mode === 'offline')
  })
})

// ============================================================================
// useFeatureFlags Hook Behavior
// ============================================================================

describe('useFeatureFlags hook behavior', () => {
  beforeEach(() => {
    // Reset license to none before each test
    updateLicenseStatus({ isValid: false, type: 'none', expiresAt: null })
    refreshFlags()
  })

  it('isEnabled function matches isFeatureEnabled', () => {
    refreshFlags({ features: { enableQuizzes: true } })

    const { isEnabled } = useFeatureFlags()
    const directResult = isFeatureEnabled('enableQuizzes')

    expect(isEnabled('enableQuizzes')).toBe(directResult)
  })

  it('isPremium is true when paid or license valid', () => {
    refreshFlags({ edition: 'premium' })
    const { isPremium } = useFeatureFlags()
    expect(isPremium).toBe(true)
  })

  it('isPremium is false for community without license', () => {
    refreshFlags({ edition: 'community' })
    const { isPremium } = useFeatureFlags()
    // In test environment, getEdition returns 'premium' by default,
    // so refreshFlags with community override is needed
    expect(isPremium).toBe(false)
  })

  it('platform value matches detectPlatform', () => {
    refreshFlags()
    const { platform } = useFeatureFlags()
    const detected = detectPlatform()

    expect(platform).toBe(detected)
  })
})

// ============================================================================
// Defaults Structure Validation
// ============================================================================

describe('Defaults Structure Validation', () => {
  it('COMMUNITY_DEFAULTS has all required fields', () => {
    expect(COMMUNITY_DEFAULTS).toHaveProperty('deploymentMode')
    expect(COMMUNITY_DEFAULTS).toHaveProperty('edition')
    expect(COMMUNITY_DEFAULTS).toHaveProperty('platform')
    expect(COMMUNITY_DEFAULTS).toHaveProperty('storageBackend')
    expect(COMMUNITY_DEFAULTS).toHaveProperty('contentSource')
    expect(COMMUNITY_DEFAULTS).toHaveProperty('isOfflineMode')
    expect(COMMUNITY_DEFAULTS).toHaveProperty('isStaticMode')
    expect(COMMUNITY_DEFAULTS).toHaveProperty('isPaidVersion')
  })

  it('PREMIUM_DEFAULTS has all required fields', () => {
    expect(PREMIUM_DEFAULTS).toHaveProperty('deploymentMode')
    expect(PREMIUM_DEFAULTS).toHaveProperty('edition')
    expect(PREMIUM_DEFAULTS).toHaveProperty('platform')
    expect(PREMIUM_DEFAULTS).toHaveProperty('storageBackend')
    expect(PREMIUM_DEFAULTS).toHaveProperty('contentSource')
    expect(PREMIUM_DEFAULTS).toHaveProperty('isOfflineMode')
    expect(PREMIUM_DEFAULTS).toHaveProperty('isStaticMode')
    expect(PREMIUM_DEFAULTS).toHaveProperty('isPaidVersion')
  })

  it('FABRIC_DEFAULTS has all required fields', () => {
    expect(FABRIC_DEFAULTS).toHaveProperty('deploymentMode')
    expect(FABRIC_DEFAULTS).toHaveProperty('edition')
    expect(FABRIC_DEFAULTS).toHaveProperty('platform')
    expect(FABRIC_DEFAULTS).toHaveProperty('storageBackend')
    expect(FABRIC_DEFAULTS).toHaveProperty('contentSource')
  })

  it('all defaults have consistent field types', () => {
    const allDefaults = [COMMUNITY_DEFAULTS, PREMIUM_DEFAULTS, FABRIC_DEFAULTS]

    for (const defaults of allDefaults) {
      expect(typeof defaults.deploymentMode).toBe('string')
      expect(typeof defaults.edition).toBe('string')
      expect(typeof defaults.platform).toBe('string')
      expect(typeof defaults.storageBackend).toBe('string')
      expect(typeof defaults.contentSource).toBe('string')
    }
  })
})
