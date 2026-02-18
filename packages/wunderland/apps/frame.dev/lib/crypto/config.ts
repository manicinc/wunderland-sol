/**
 * Encryption Configuration
 *
 * Manages encryption settings and preferences.
 * Local encryption is ALWAYS enabled - this config is for sync mode.
 *
 * @module lib/crypto/config
 */

import { getSyncConfig, type SyncConfig } from './syncMode'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Encryption mode
 */
export type EncryptionMode = 'local' | 'sync'

/**
 * Encryption status for UI display
 */
export interface EncryptionStatus {
  /** Whether encryption is active */
  active: boolean
  /** Current mode */
  mode: EncryptionMode
  /** Human-readable status message */
  message: string
  /** Whether sync is available */
  syncAvailable: boolean
  /** Sync configuration (if enabled) */
  syncConfig?: SyncConfig
  /** Device ID */
  deviceId?: string
  /** Last encryption timestamp */
  lastActivity?: number
}

/**
 * User-configurable encryption preferences
 */
export interface EncryptionPreferences {
  /** Whether to show encryption badge in UI */
  showBadge: boolean
  /** Whether to show encryption status in settings */
  showInSettings: boolean
  /** Auto-migrate unencrypted data on startup */
  autoMigrate: boolean
  /** Log encryption operations (debug) */
  debugMode: boolean
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_ENCRYPTION_PREFERENCES: EncryptionPreferences = {
  showBadge: true,
  showInSettings: true,
  autoMigrate: true,
  debugMode: false,
}

const PREFS_STORAGE_KEY = 'frame-encryption-prefs'

// ============================================================================
// PREFERENCES MANAGEMENT
// ============================================================================

let cachedPreferences: EncryptionPreferences | null = null

/**
 * Load encryption preferences from storage
 */
export function loadEncryptionPreferences(): EncryptionPreferences {
  if (cachedPreferences) return cachedPreferences

  if (typeof window === 'undefined') {
    return DEFAULT_ENCRYPTION_PREFERENCES
  }

  try {
    const stored = localStorage.getItem(PREFS_STORAGE_KEY)
    if (stored) {
      const prefs: EncryptionPreferences = { ...DEFAULT_ENCRYPTION_PREFERENCES, ...JSON.parse(stored) }
      cachedPreferences = prefs
      return prefs
    }
  } catch {
    // Ignore parse errors
  }

  return DEFAULT_ENCRYPTION_PREFERENCES
}

/**
 * Save encryption preferences
 */
export function saveEncryptionPreferences(prefs: Partial<EncryptionPreferences>): void {
  const current = loadEncryptionPreferences()
  const updated = { ...current, ...prefs }
  cachedPreferences = updated

  if (typeof window !== 'undefined') {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated))
  }
}

/**
 * Reset preferences to defaults
 */
export function resetEncryptionPreferences(): void {
  cachedPreferences = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PREFS_STORAGE_KEY)
  }
}

// ============================================================================
// STATUS
// ============================================================================

/**
 * Get current encryption status for UI
 */
export async function getEncryptionStatus(): Promise<EncryptionStatus> {
  // Import dynamically to avoid circular deps
  const { isReady, getDeviceId, hasDeviceKey } = await import('./index')

  const ready = await isReady()
  const hasKey = await hasDeviceKey()
  const syncConfig = getSyncConfig()

  let deviceId: string | undefined
  try {
    if (ready) {
      deviceId = await getDeviceId()
    }
  } catch {
    // Ignore
  }

  const mode: EncryptionMode = syncConfig.enabled ? 'sync' : 'local'

  let message: string
  if (!ready) {
    message = 'Encryption unavailable (browser not supported)'
  } else if (!hasKey) {
    message = 'Encryption initializing...'
  } else if (syncConfig.enabled) {
    message = syncConfig.status === 'active'
      ? 'End-to-end encrypted, syncing enabled'
      : 'Setting up sync...'
  } else {
    message = 'End-to-end encrypted (local only)'
  }

  return {
    active: ready && hasKey,
    mode,
    message,
    syncAvailable: true, // Stub is available
    syncConfig: syncConfig.enabled ? syncConfig : undefined,
    deviceId,
    lastActivity: Date.now(),
  }
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Feature flags for gradual rollout
 */
export interface EncryptionFeatureFlags {
  /** Enable encryption for tasks */
  encryptTasks: boolean
  /** Enable encryption for notes */
  encryptNotes: boolean
  /** Enable encryption for writing projects */
  encryptWriting: boolean
  /** Enable encryption for reflections */
  encryptReflections: boolean
  /** Enable encryption for settings/preferences */
  encryptSettings: boolean
  /** Enable encryption for search index */
  encryptSearch: boolean
  /** Enable encryption for embeddings */
  encryptEmbeddings: boolean
  /** Enable cloud sync features (requires backend) */
  enableCloudSync: boolean
  /** Enable key export/import UI */
  enableKeyExport: boolean
  /** Enable recovery key UI */
  enableRecoveryKey: boolean
}

/**
 * Default feature flags - all enabled for local encryption
 * Cloud sync disabled until backend is ready
 */
export const DEFAULT_FEATURE_FLAGS: EncryptionFeatureFlags = {
  encryptTasks: true,
  encryptNotes: true,
  encryptWriting: true,
  encryptReflections: true,
  encryptSettings: true,
  encryptSearch: true,
  encryptEmbeddings: true,
  // Cloud sync features - disabled until backend is ready
  // Set these to true to enable when Quarry Sync backend launches
  enableCloudSync: false,
  enableKeyExport: false,
  enableRecoveryKey: false,
}

const FLAGS_STORAGE_KEY = 'frame-encryption-flags'

/**
 * Get encryption feature flags
 */
export function getFeatureFlags(): EncryptionFeatureFlags {
  if (typeof window === 'undefined') {
    return DEFAULT_FEATURE_FLAGS
  }

  try {
    const stored = localStorage.getItem(FLAGS_STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore
  }

  return DEFAULT_FEATURE_FLAGS
}

/**
 * Update feature flags
 */
export function setFeatureFlags(flags: Partial<EncryptionFeatureFlags>): void {
  const current = getFeatureFlags()
  const updated = { ...current, ...flags }

  if (typeof window !== 'undefined') {
    localStorage.setItem(FLAGS_STORAGE_KEY, JSON.stringify(updated))
  }
}

/**
 * Check if encryption is enabled for a specific data type
 */
export function isEncryptionEnabledFor(
  dataType: keyof EncryptionFeatureFlags
): boolean {
  const flags = getFeatureFlags()
  return flags[dataType] ?? true
}
