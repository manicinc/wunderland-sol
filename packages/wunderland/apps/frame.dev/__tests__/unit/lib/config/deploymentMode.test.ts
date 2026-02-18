/**
 * Deployment Mode Tests
 * @module __tests__/unit/lib/config/deploymentMode.test
 *
 * Tests for deployment mode configuration constants and detection functions.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  COMMUNITY_DEFAULTS,
  PREMIUM_DEFAULTS,
  FABRIC_DEFAULTS,
  getDeploymentMode,
  getEdition,
  isPremiumBuild,
  getLicenseServerUrl,
  isBrowser,
  isElectron,
  isCapacitor,
  isPWA,
  detectPlatform,
  isOnline,
  isStaticExport,
} from '@/lib/config/deploymentMode'

// ============================================================================
// COMMUNITY_DEFAULTS
// ============================================================================

describe('COMMUNITY_DEFAULTS', () => {
  describe('mode identification', () => {
    it('has deploymentMode set to static', () => {
      expect(COMMUNITY_DEFAULTS.deploymentMode).toBe('static')
    })

    it('has edition set to community', () => {
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
  })

  describe('platform', () => {
    it('defaults to web platform', () => {
      expect(COMMUNITY_DEFAULTS.platform).toBe('web')
    })
  })

  describe('storage configuration', () => {
    it('uses IndexedDB as storage backend', () => {
      expect(COMMUNITY_DEFAULTS.storageBackend).toBe('indexeddb')
    })

    it('does not allow local SQLite', () => {
      expect(COMMUNITY_DEFAULTS.allowLocalSqlite).toBe(false)
    })
  })

  describe('content source', () => {
    it('uses GitHub as content source', () => {
      expect(COMMUNITY_DEFAULTS.contentSource).toBe('github')
    })

    it('requires PAT', () => {
      expect(COMMUNITY_DEFAULTS.requirePAT).toBe(true)
    })
  })

  describe('premium features disabled', () => {
    it('disables quizzes', () => {
      expect(COMMUNITY_DEFAULTS.enableQuizzes).toBe(false)
    })

    it('disables flashcards', () => {
      expect(COMMUNITY_DEFAULTS.enableFlashcards).toBe(false)
    })

    it('disables QnA', () => {
      expect(COMMUNITY_DEFAULTS.enableQnA).toBe(false)
    })

    it('disables export', () => {
      expect(COMMUNITY_DEFAULTS.enableExport).toBe(false)
    })

    it('disables advanced themes', () => {
      expect(COMMUNITY_DEFAULTS.enableAdvancedThemes).toBe(false)
    })

    it('disables gamification', () => {
      expect(COMMUNITY_DEFAULTS.enableGamification).toBe(false)
    })

    it('disables AI generation', () => {
      expect(COMMUNITY_DEFAULTS.enableAIGeneration).toBe(false)
    })

    it('disables learning studio', () => {
      expect(COMMUNITY_DEFAULTS.enableLearningStudio).toBe(false)
    })
  })

  describe('core features enabled', () => {
    it('enables plugins', () => {
      expect(COMMUNITY_DEFAULTS.enablePlugins).toBe(true)
    })

    it('enables spiral path', () => {
      expect(COMMUNITY_DEFAULTS.enableSpiralPath).toBe(true)
    })

    it('enables semantic search', () => {
      expect(COMMUNITY_DEFAULTS.enableSemanticSearch).toBe(true)
    })

    it('enables bookmarks', () => {
      expect(COMMUNITY_DEFAULTS.enableBookmarks).toBe(true)
    })

    it('enables knowledge graph', () => {
      expect(COMMUNITY_DEFAULTS.enableKnowledgeGraph).toBe(true)
    })

    it('enables reading progress', () => {
      expect(COMMUNITY_DEFAULTS.enableReadingProgress).toBe(true)
    })
  })

  describe('license status', () => {
    it('has invalid license', () => {
      expect(COMMUNITY_DEFAULTS.licenseValid).toBe(false)
    })

    it('has no license type', () => {
      expect(COMMUNITY_DEFAULTS.licenseType).toBe('none')
    })

    it('has no license expiry', () => {
      expect(COMMUNITY_DEFAULTS.licenseExpiry).toBeNull()
    })
  })
})

// ============================================================================
// PREMIUM_DEFAULTS
// ============================================================================

describe('PREMIUM_DEFAULTS', () => {
  describe('mode identification', () => {
    it('has deploymentMode set to offline', () => {
      expect(PREMIUM_DEFAULTS.deploymentMode).toBe('offline')
    })

    it('has edition set to premium', () => {
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
  })

  describe('storage configuration', () => {
    it('uses auto storage backend', () => {
      expect(PREMIUM_DEFAULTS.storageBackend).toBe('auto')
    })

    it('allows local SQLite', () => {
      expect(PREMIUM_DEFAULTS.allowLocalSqlite).toBe(true)
    })
  })

  describe('content source', () => {
    it('uses local content source', () => {
      expect(PREMIUM_DEFAULTS.contentSource).toBe('local')
    })

    it('does not require PAT', () => {
      expect(PREMIUM_DEFAULTS.requirePAT).toBe(false)
    })
  })

  describe('all premium features enabled', () => {
    it('enables quizzes', () => {
      expect(PREMIUM_DEFAULTS.enableQuizzes).toBe(true)
    })

    it('enables flashcards', () => {
      expect(PREMIUM_DEFAULTS.enableFlashcards).toBe(true)
    })

    it('enables QnA', () => {
      expect(PREMIUM_DEFAULTS.enableQnA).toBe(true)
    })

    it('enables export', () => {
      expect(PREMIUM_DEFAULTS.enableExport).toBe(true)
    })

    it('enables advanced themes', () => {
      expect(PREMIUM_DEFAULTS.enableAdvancedThemes).toBe(true)
    })

    it('enables gamification', () => {
      expect(PREMIUM_DEFAULTS.enableGamification).toBe(true)
    })

    it('enables AI generation', () => {
      expect(PREMIUM_DEFAULTS.enableAIGeneration).toBe(true)
    })

    it('enables learning studio', () => {
      expect(PREMIUM_DEFAULTS.enableLearningStudio).toBe(true)
    })
  })

  describe('license status', () => {
    it('has valid license', () => {
      expect(PREMIUM_DEFAULTS.licenseValid).toBe(true)
    })

    it('has premium license type', () => {
      expect(PREMIUM_DEFAULTS.licenseType).toBe('premium')
    })
  })
})

// ============================================================================
// FABRIC_DEFAULTS
// ============================================================================

describe('FABRIC_DEFAULTS', () => {
  it('is based on COMMUNITY_DEFAULTS', () => {
    expect(FABRIC_DEFAULTS.deploymentMode).toBe(COMMUNITY_DEFAULTS.deploymentMode)
    expect(FABRIC_DEFAULTS.storageBackend).toBe(COMMUNITY_DEFAULTS.storageBackend)
    expect(FABRIC_DEFAULTS.contentSource).toBe(COMMUNITY_DEFAULTS.contentSource)
  })

  it('has community edition', () => {
    expect(FABRIC_DEFAULTS.edition).toBe('community')
  })

  it('enables plugins', () => {
    expect(FABRIC_DEFAULTS.enablePlugins).toBe(true)
  })

  it('enables export (unlike base community)', () => {
    expect(FABRIC_DEFAULTS.enableExport).toBe(true)
    expect(COMMUNITY_DEFAULTS.enableExport).toBe(false) // Verify the difference
  })
})

// ============================================================================
// COMPARISON TESTS
// ============================================================================

describe('defaults comparison', () => {
  it('community and premium have opposite offline modes', () => {
    expect(COMMUNITY_DEFAULTS.isOfflineMode).not.toBe(PREMIUM_DEFAULTS.isOfflineMode)
  })

  it('community and premium have opposite static modes', () => {
    expect(COMMUNITY_DEFAULTS.isStaticMode).not.toBe(PREMIUM_DEFAULTS.isStaticMode)
  })

  it('community and premium have opposite paid version flags', () => {
    expect(COMMUNITY_DEFAULTS.isPaidVersion).not.toBe(PREMIUM_DEFAULTS.isPaidVersion)
  })

  it('all defaults share common core features', () => {
    const configs = [COMMUNITY_DEFAULTS, PREMIUM_DEFAULTS, FABRIC_DEFAULTS]

    for (const config of configs) {
      expect(config.enableSpiralPath).toBe(true)
      expect(config.enableSemanticSearch).toBe(true)
      expect(config.enableBookmarks).toBe(true)
      expect(config.enableKnowledgeGraph).toBe(true)
      expect(config.enableReadingProgress).toBe(true)
      expect(config.enablePlugins).toBe(true)
    }
  })

  it('community disables features that premium enables', () => {
    // Premium-only features should be disabled in community
    expect(COMMUNITY_DEFAULTS.enableQuizzes).toBe(false)
    expect(PREMIUM_DEFAULTS.enableQuizzes).toBe(true)

    expect(COMMUNITY_DEFAULTS.enableFlashcards).toBe(false)
    expect(PREMIUM_DEFAULTS.enableFlashcards).toBe(true)

    expect(COMMUNITY_DEFAULTS.enableAIGeneration).toBe(false)
    expect(PREMIUM_DEFAULTS.enableAIGeneration).toBe(true)
  })
})

// ============================================================================
// getDeploymentMode
// ============================================================================

describe('getDeploymentMode', () => {
  const originalEnv = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE

  afterEach(() => {
    process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = originalEnv
  })

  it('returns static by default', () => {
    delete process.env.NEXT_PUBLIC_DEPLOYMENT_MODE
    expect(getDeploymentMode()).toBe('static')
  })

  it('returns offline when env is set to offline', () => {
    process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = 'offline'
    expect(getDeploymentMode()).toBe('offline')
  })

  it('returns static for unrecognized values', () => {
    process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = 'unknown'
    expect(getDeploymentMode()).toBe('static')
  })

  it('returns static when env is explicitly static', () => {
    process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = 'static'
    expect(getDeploymentMode()).toBe('static')
  })
})

// ============================================================================
// getEdition
// ============================================================================

describe('getEdition', () => {
  const originalEnv = process.env.NEXT_PUBLIC_EDITION

  afterEach(() => {
    process.env.NEXT_PUBLIC_EDITION = originalEnv
  })

  it('returns premium by default', () => {
    delete process.env.NEXT_PUBLIC_EDITION
    expect(getEdition()).toBe('premium')
  })

  it('returns community when env is set to community', () => {
    process.env.NEXT_PUBLIC_EDITION = 'community'
    expect(getEdition()).toBe('community')
  })

  it('returns premium for unrecognized values', () => {
    process.env.NEXT_PUBLIC_EDITION = 'unknown'
    expect(getEdition()).toBe('premium')
  })

  it('returns premium when env is explicitly premium', () => {
    process.env.NEXT_PUBLIC_EDITION = 'premium'
    expect(getEdition()).toBe('premium')
  })
})

// ============================================================================
// isPremiumBuild
// ============================================================================

describe('isPremiumBuild', () => {
  const originalEnv = process.env.NEXT_PUBLIC_EDITION

  afterEach(() => {
    process.env.NEXT_PUBLIC_EDITION = originalEnv
  })

  it('returns true by default (premium is default)', () => {
    delete process.env.NEXT_PUBLIC_EDITION
    expect(isPremiumBuild()).toBe(true)
  })

  it('returns false for community edition', () => {
    process.env.NEXT_PUBLIC_EDITION = 'community'
    expect(isPremiumBuild()).toBe(false)
  })

  it('returns true for premium edition', () => {
    process.env.NEXT_PUBLIC_EDITION = 'premium'
    expect(isPremiumBuild()).toBe(true)
  })
})

// ============================================================================
// getLicenseServerUrl
// ============================================================================

describe('getLicenseServerUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_LICENSE_SERVER

  afterEach(() => {
    process.env.NEXT_PUBLIC_LICENSE_SERVER = originalEnv
  })

  it('returns default URL when not configured', () => {
    delete process.env.NEXT_PUBLIC_LICENSE_SERVER
    expect(getLicenseServerUrl()).toBe('https://license.frame.dev/api')
  })

  it('returns custom URL when configured', () => {
    process.env.NEXT_PUBLIC_LICENSE_SERVER = 'https://custom-license.example.com/api'
    expect(getLicenseServerUrl()).toBe('https://custom-license.example.com/api')
  })
})

// ============================================================================
// FeatureFlags Interface Tests
// ============================================================================

describe('FeatureFlags interface', () => {
  it('all defaults have required fields', () => {
    const configs = [COMMUNITY_DEFAULTS, PREMIUM_DEFAULTS, FABRIC_DEFAULTS]

    for (const config of configs) {
      // Mode identification
      expect(typeof config.deploymentMode).toBe('string')
      expect(typeof config.edition).toBe('string')
      expect(typeof config.isOfflineMode).toBe('boolean')
      expect(typeof config.isStaticMode).toBe('boolean')
      expect(typeof config.isPaidVersion).toBe('boolean')

      // Platform
      expect(typeof config.platform).toBe('string')

      // Storage
      expect(typeof config.storageBackend).toBe('string')
      expect(typeof config.allowLocalSqlite).toBe('boolean')

      // Content
      expect(typeof config.contentSource).toBe('string')
      expect(typeof config.requirePAT).toBe('boolean')

      // Features
      expect(typeof config.enableQuizzes).toBe('boolean')
      expect(typeof config.enableFlashcards).toBe('boolean')
      expect(typeof config.enableQnA).toBe('boolean')
      expect(typeof config.enableExport).toBe('boolean')
      expect(typeof config.enableAdvancedThemes).toBe('boolean')
      expect(typeof config.enableGamification).toBe('boolean')
      expect(typeof config.enableAIGeneration).toBe('boolean')
      expect(typeof config.enableLearningStudio).toBe('boolean')
      expect(typeof config.enablePlugins).toBe('boolean')
      expect(typeof config.enableSpiralPath).toBe('boolean')
      expect(typeof config.enableSemanticSearch).toBe('boolean')
      expect(typeof config.enableBookmarks).toBe('boolean')
      expect(typeof config.enableKnowledgeGraph).toBe('boolean')
      expect(typeof config.enableReadingProgress).toBe('boolean')

      // License
      expect(typeof config.licenseValid).toBe('boolean')
      expect(typeof config.licenseType).toBe('string')
    }
  })
})

// ============================================================================
// PLATFORM DETECTION - isBrowser
// ============================================================================

describe('isBrowser', () => {
  it('returns true in browser environment (window is defined)', () => {
    // In Vitest with jsdom, window is defined
    expect(isBrowser()).toBe(true)
  })

  it('returns boolean type', () => {
    expect(typeof isBrowser()).toBe('boolean')
  })
})

// ============================================================================
// PLATFORM DETECTION - isElectron
// ============================================================================

describe('isElectron', () => {
  let originalUserAgent: string

  beforeEach(() => {
    originalUserAgent = navigator.userAgent
  })

  afterEach(() => {
    // Reset userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    })
    // Remove electronAPI if added
    delete (window as unknown as { electronAPI?: unknown }).electronAPI
  })

  it('returns false when userAgent does not contain electron', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
      writable: true,
      configurable: true,
    })
    delete (window as unknown as { electronAPI?: unknown }).electronAPI
    expect(isElectron()).toBe(false)
  })

  it('returns true when userAgent contains electron (lowercase)', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh) Electron/28.0.0 Chrome/120.0.0.0',
      writable: true,
      configurable: true,
    })
    expect(isElectron()).toBe(true)
  })

  it('returns true when userAgent contains Electron (mixed case)', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Electron/28.0.0 Safari/537.36',
      writable: true,
      configurable: true,
    })
    expect(isElectron()).toBe(true)
  })

  it('returns true when electronAPI exists on window', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Chrome/120.0.0.0',
      writable: true,
      configurable: true,
    })
    ;(window as unknown as { electronAPI: object }).electronAPI = { invoke: vi.fn() }
    expect(isElectron()).toBe(true)
  })

  it('returns true when both userAgent and electronAPI indicate Electron', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Electron/28.0.0',
      writable: true,
      configurable: true,
    })
    ;(window as unknown as { electronAPI: object }).electronAPI = { invoke: vi.fn() }
    expect(isElectron()).toBe(true)
  })
})

// ============================================================================
// PLATFORM DETECTION - isCapacitor
// ============================================================================

describe('isCapacitor', () => {
  afterEach(() => {
    delete (window as unknown as { Capacitor?: unknown }).Capacitor
  })

  it('returns false when Capacitor is not defined', () => {
    delete (window as unknown as { Capacitor?: unknown }).Capacitor
    expect(isCapacitor()).toBe(false)
  })

  it('returns true when Capacitor is defined', () => {
    ;(window as unknown as { Capacitor: object }).Capacitor = { platform: 'ios' }
    expect(isCapacitor()).toBe(true)
  })

  it('returns true when Capacitor is defined with any truthy value', () => {
    ;(window as unknown as { Capacitor: object }).Capacitor = {}
    expect(isCapacitor()).toBe(true)
  })
})

// ============================================================================
// PLATFORM DETECTION - isPWA
// ============================================================================

describe('isPWA', () => {
  let originalMatchMedia: typeof window.matchMedia

  beforeEach(() => {
    originalMatchMedia = window.matchMedia
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    delete (navigator as unknown as { standalone?: boolean }).standalone
  })

  it('returns false when not in standalone mode', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    delete (navigator as unknown as { standalone?: boolean }).standalone
    expect(isPWA()).toBe(false)
  })

  it('returns true when display-mode is standalone', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    expect(isPWA()).toBe(true)
  })

  it('returns true when navigator.standalone is true (iOS Safari)', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    ;(navigator as unknown as { standalone: boolean }).standalone = true
    expect(isPWA()).toBe(true)
  })

  it('returns false when navigator.standalone is false', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    ;(navigator as unknown as { standalone: boolean }).standalone = false
    expect(isPWA()).toBe(false)
  })

  it('calls matchMedia with correct query', () => {
    const mockMatchMedia = vi.fn().mockReturnValue({ matches: false })
    window.matchMedia = mockMatchMedia
    isPWA()
    expect(mockMatchMedia).toHaveBeenCalledWith('(display-mode: standalone)')
  })
})

// ============================================================================
// PLATFORM DETECTION - detectPlatform
// ============================================================================

describe('detectPlatform', () => {
  let originalUserAgent: string
  let originalMatchMedia: typeof window.matchMedia

  beforeEach(() => {
    originalUserAgent = navigator.userAgent
    originalMatchMedia = window.matchMedia
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    })
    window.matchMedia = originalMatchMedia
    delete (window as unknown as { electronAPI?: unknown }).electronAPI
    delete (window as unknown as { Capacitor?: unknown }).Capacitor
    delete (navigator as unknown as { standalone?: boolean }).standalone
  })

  it('returns "web" when no special platform detected', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Chrome/120.0.0.0',
      writable: true,
      configurable: true,
    })
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    expect(detectPlatform()).toBe('web')
  })

  it('returns "electron" when running in Electron', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Electron/28.0.0',
      writable: true,
      configurable: true,
    })
    expect(detectPlatform()).toBe('electron')
  })

  it('returns "capacitor" when running in Capacitor', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Chrome/120.0.0.0',
      writable: true,
      configurable: true,
    })
    ;(window as unknown as { Capacitor: object }).Capacitor = { platform: 'ios' }
    expect(detectPlatform()).toBe('capacitor')
  })

  it('returns "pwa" when running as installed PWA', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Chrome/120.0.0.0',
      writable: true,
      configurable: true,
    })
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    expect(detectPlatform()).toBe('pwa')
  })

  it('prioritizes electron over capacitor', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Electron/28.0.0',
      writable: true,
      configurable: true,
    })
    ;(window as unknown as { Capacitor: object }).Capacitor = { platform: 'ios' }
    expect(detectPlatform()).toBe('electron')
  })

  it('prioritizes capacitor over pwa', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Chrome/120.0.0.0',
      writable: true,
      configurable: true,
    })
    ;(window as unknown as { Capacitor: object }).Capacitor = { platform: 'ios' }
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    expect(detectPlatform()).toBe('capacitor')
  })

  it('prioritizes electron over pwa', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Electron/28.0.0',
      writable: true,
      configurable: true,
    })
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    expect(detectPlatform()).toBe('electron')
  })
})

// ============================================================================
// PLATFORM DETECTION - isOnline
// ============================================================================

describe('isOnline', () => {
  let originalOnLine: boolean

  beforeEach(() => {
    originalOnLine = navigator.onLine
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true,
    })
  })

  it('returns true when navigator.onLine is true', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    })
    expect(isOnline()).toBe(true)
  })

  it('returns false when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    })
    expect(isOnline()).toBe(false)
  })
})

// ============================================================================
// PLATFORM DETECTION - isStaticExport
// ============================================================================

describe('isStaticExport', () => {
  let originalEnv: string | undefined
  let originalLocation: Location

  beforeEach(() => {
    originalEnv = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE
    originalLocation = window.location
    delete process.env.NEXT_PUBLIC_DEPLOYMENT_MODE
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = originalEnv
    } else {
      delete process.env.NEXT_PUBLIC_DEPLOYMENT_MODE
    }
    // Reset location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  it('returns true when NEXT_PUBLIC_DEPLOYMENT_MODE is static', () => {
    process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = 'static'
    expect(isStaticExport()).toBe(true)
  })

  it('returns false when NEXT_PUBLIC_DEPLOYMENT_MODE is offline', () => {
    process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = 'offline'
    expect(isStaticExport()).toBe(false)
  })

  describe('hostname detection', () => {
    const mockLocation = (hostname: string) => {
      Object.defineProperty(window, 'location', {
        value: { hostname },
        writable: true,
        configurable: true,
      })
    }

    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_DEPLOYMENT_MODE
    })

    it('returns true for GitHub Pages hostname', () => {
      mockLocation('myproject.github.io')
      expect(isStaticExport()).toBe(true)
    })

    it('returns true for Cloudflare Pages hostname', () => {
      mockLocation('myproject.pages.dev')
      expect(isStaticExport()).toBe(true)
    })

    it('returns true for Netlify hostname', () => {
      mockLocation('myproject.netlify.app')
      expect(isStaticExport()).toBe(true)
    })

    it('returns false for Vercel hostname (has API routes)', () => {
      mockLocation('myproject.vercel.app')
      expect(isStaticExport()).toBe(false)
    })

    it('returns false for custom domain', () => {
      mockLocation('frame.dev')
      expect(isStaticExport()).toBe(false)
    })

    it('returns false for localhost', () => {
      mockLocation('localhost')
      expect(isStaticExport()).toBe(false)
    })
  })

  it('env var takes precedence over hostname detection', () => {
    process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = 'static'
    // Even with a vercel hostname, env var wins
    expect(isStaticExport()).toBe(true)
  })
})

// ============================================================================
// PLATFORM TYPE VALIDATION
// ============================================================================

describe('PlatformType values', () => {
  let originalMatchMedia: typeof window.matchMedia
  let originalUserAgent: string

  beforeEach(() => {
    originalMatchMedia = window.matchMedia
    originalUserAgent = navigator.userAgent
    // Mock matchMedia for detectPlatform
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    // Set regular browser userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Chrome/120.0.0.0',
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    })
    delete (window as unknown as { electronAPI?: unknown }).electronAPI
    delete (window as unknown as { Capacitor?: unknown }).Capacitor
  })

  it('detectPlatform returns valid PlatformType', () => {
    const validPlatforms = ['web', 'electron', 'capacitor', 'pwa']
    expect(validPlatforms).toContain(detectPlatform())
  })

  it('all defaults use valid platform type', () => {
    const validPlatforms = ['web', 'electron', 'capacitor', 'pwa']
    expect(validPlatforms).toContain(COMMUNITY_DEFAULTS.platform)
    expect(validPlatforms).toContain(PREMIUM_DEFAULTS.platform)
    expect(validPlatforms).toContain(FABRIC_DEFAULTS.platform)
  })
})
