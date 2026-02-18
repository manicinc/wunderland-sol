/**
 * Feature Flags System
 *
 * Provides a unified interface for determining which features are enabled
 * based on deployment mode, edition, license status, and runtime detection.
 *
 * Resolution priority:
 * 1. Build-time flags (environment variables)
 * 2. Runtime environment detection
 * 3. License status (for premium features)
 * 4. User settings (stored preferences)
 *
 * @module lib/config/featureFlags
 */

import {
  type FeatureFlags,
  type DeploymentMode,
  type Edition,
  type StorageBackendType,
  type ContentSourceType,
  type PlatformType,
  COMMUNITY_DEFAULTS,
  PREMIUM_DEFAULTS,
  FABRIC_DEFAULTS,
  getDeploymentMode,
  getEdition,
  detectPlatform,
  isBrowser,
  isElectron,
  isCapacitor,
} from './deploymentMode'

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureFlagOverrides {
  /** Override deployment mode */
  deploymentMode?: DeploymentMode
  /** Override edition */
  edition?: Edition
  /** Override storage backend */
  storageBackend?: StorageBackendType
  /** Override content source */
  contentSource?: ContentSourceType
  /** Force specific features on/off */
  features?: Partial<
    Pick<
      FeatureFlags,
      | 'enableQuizzes'
      | 'enableFlashcards'
      | 'enableQnA'
      | 'enableExport'
      | 'enableAdvancedThemes'
    >
  >
}

export interface LicenseStatus {
  isValid: boolean
  type: 'none' | 'premium' | 'trial'
  expiresAt: Date | null
}

// ============================================================================
// SINGLETON STATE
// ============================================================================

let cachedFlags: FeatureFlags | null = null
let licenseStatus: LicenseStatus = {
  isValid: false,
  type: 'none',
  expiresAt: null,
}

// ============================================================================
// CORE RESOLVER
// ============================================================================

/**
 * Resolve feature flags based on all inputs
 */
function resolveFlags(overrides?: FeatureFlagOverrides): FeatureFlags {
  // 1. Start with defaults based on edition
  const edition = overrides?.edition ?? getEdition()
  const baseFlags =
    edition === 'premium' ? { ...PREMIUM_DEFAULTS } : { ...COMMUNITY_DEFAULTS }

  // 2. Apply build-time configuration
  const deploymentMode = overrides?.deploymentMode ?? getDeploymentMode()
  baseFlags.deploymentMode = deploymentMode
  baseFlags.isOfflineMode = deploymentMode === 'offline'
  baseFlags.isStaticMode = deploymentMode === 'static'

  // 3. Detect platform
  baseFlags.platform = detectPlatform()

  // 4. Resolve storage backend
  baseFlags.storageBackend = resolveStorageBackend(
    overrides?.storageBackend ?? baseFlags.storageBackend,
    baseFlags.platform
  )

  // 5. Resolve content source
  baseFlags.contentSource = resolveContentSource(
    overrides?.contentSource ?? baseFlags.contentSource,
    deploymentMode
  )

  // 6. Apply license status (for community edition)
  if (edition === 'community') {
    // Check if license upgrades to premium features
    if (licenseStatus.isValid && licenseStatus.type !== 'none') {
      baseFlags.licenseValid = true
      baseFlags.licenseType = licenseStatus.type
      baseFlags.licenseExpiry = licenseStatus.expiresAt

      // Unlock premium features with valid license
      baseFlags.enableQuizzes = true
      baseFlags.enableFlashcards = true
      baseFlags.enableQnA = true
      baseFlags.enableExport = true
      baseFlags.enableAdvancedThemes = true
    }
  }

  // 7. Apply explicit feature overrides (highest priority)
  if (overrides?.features) {
    Object.assign(baseFlags, overrides.features)
  }

  return baseFlags
}

/**
 * Resolve the appropriate storage backend
 */
function resolveStorageBackend(
  requested: StorageBackendType,
  platform: PlatformType
): StorageBackendType {
  if (requested !== 'auto') return requested

  // Auto-select based on platform
  switch (platform) {
    case 'electron':
      return 'sqlite' // Native better-sqlite3
    case 'capacitor':
      return 'sqlite' // Capacitor SQLite plugin
    case 'pwa':
    case 'web':
    default:
      return 'indexeddb' // sql.js via IndexedDB
  }
}

/**
 * Resolve content source based on deployment mode
 */
function resolveContentSource(
  requested: ContentSourceType,
  deploymentMode: DeploymentMode
): ContentSourceType {
  if (requested !== 'hybrid') return requested

  // Hybrid mode: prefer local but sync with GitHub
  return deploymentMode === 'offline' ? 'local' : 'github'
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get current feature flags
 *
 * Uses cached value for performance. Call refreshFlags() to update.
 */
export function getFeatureFlags(): FeatureFlags {
  if (!cachedFlags) {
    cachedFlags = resolveFlags()
  }
  return cachedFlags
}

/**
 * Refresh feature flags (e.g., after license validation)
 */
export function refreshFlags(overrides?: FeatureFlagOverrides): FeatureFlags {
  cachedFlags = resolveFlags(overrides)
  return cachedFlags
}

/**
 * Update license status and refresh flags
 */
export function updateLicenseStatus(status: LicenseStatus): FeatureFlags {
  licenseStatus = status
  return refreshFlags()
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(
  feature: keyof Pick<
    FeatureFlags,
    | 'enableQuizzes'
    | 'enableFlashcards'
    | 'enableQnA'
    | 'enableExport'
    | 'enableAdvancedThemes'
    | 'enableSpiralPath'
    | 'enableSemanticSearch'
    | 'enableBookmarks'
    | 'enableKnowledgeGraph'
    | 'enableReadingProgress'
  >
): boolean {
  const flags = getFeatureFlags()
  return flags[feature]
}

/**
 * Get feature flags as environment-safe object (for SSR)
 */
export function getStaticFeatureFlags(): Partial<FeatureFlags> {
  return {
    deploymentMode: getDeploymentMode(),
    edition: getEdition(),
    isPaidVersion: getEdition() === 'premium',
    isStaticMode: getDeploymentMode() === 'static',
    isOfflineMode: getDeploymentMode() === 'offline',
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * React hook for feature flags
 *
 * Usage:
 * ```tsx
 * const { flags, isEnabled } = useFeatureFlags()
 * if (isEnabled('enableQuizzes')) {
 *   return <QuizComponent />
 * }
 * ```
 */
export function useFeatureFlags() {
  // In a real React context, this would use useState/useEffect
  // For now, return the synchronous version
  const flags = getFeatureFlags()

  return {
    flags,
    isEnabled: (feature: Parameters<typeof isFeatureEnabled>[0]) =>
      isFeatureEnabled(feature),
    isPremium: flags.isPaidVersion || flags.licenseValid,
    isOffline: flags.isOfflineMode,
    platform: flags.platform,
  }
}

// ============================================================================
// BUILD-TIME CONSTANTS
// ============================================================================

/**
 * Build-time feature constants for tree-shaking
 *
 * These are replaced at build time by webpack DefinePlugin
 */
export const BUILD_FLAGS = {
  /** True if this is a premium/offline build */
  IS_PREMIUM_BUILD:
    process.env.NEXT_PUBLIC_EDITION === 'premium' ||
    process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'offline',

  /** True if this is a community/static build */
  IS_COMMUNITY_BUILD:
    process.env.NEXT_PUBLIC_EDITION !== 'premium' &&
    process.env.NEXT_PUBLIC_DEPLOYMENT_MODE !== 'offline',

  /** Deployment mode string */
  DEPLOYMENT_MODE: process.env.NEXT_PUBLIC_DEPLOYMENT_MODE || 'static',

  /** Edition string - defaults to premium for full codebase */
  EDITION: process.env.NEXT_PUBLIC_EDITION || 'premium',
} as const

// ============================================================================
// RE-EXPORTS
// ============================================================================

export type {
  FeatureFlags,
  DeploymentMode,
  Edition,
  StorageBackendType,
  ContentSourceType,
  PlatformType,
}

export {
  COMMUNITY_DEFAULTS,
  PREMIUM_DEFAULTS,
  FABRIC_DEFAULTS,
  isBrowser,
  isElectron,
  isCapacitor,
  detectPlatform,
}
