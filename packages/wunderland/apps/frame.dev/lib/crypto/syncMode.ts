/**
 * Sync Mode - Cloud Sync with Passphrase
 *
 * STUB: This module provides the structure for cloud sync encryption.
 * Currently disabled - local encryption works without this.
 *
 * When enabled:
 * 1. User sets a passphrase
 * 2. Passphrase derives master key via Argon2id
 * 3. Master key wraps device encryption key (DEK)
 * 4. Wrapped DEK syncs to server
 * 5. Other devices can unwrap with same passphrase
 *
 * @module lib/crypto/syncMode
 */

import type { EncryptedEnvelope } from './types'

// ============================================================================
// SYNC MODE TYPES
// ============================================================================

/**
 * Sync mode status
 */
export type SyncModeStatus = 'disabled' | 'setup' | 'active' | 'error'

/**
 * Sync configuration stored locally
 */
export interface SyncConfig {
  /** Whether sync is enabled */
  enabled: boolean
  /** Current sync status */
  status: SyncModeStatus
  /** When sync was enabled */
  enabledAt?: number
  /** Last successful sync timestamp */
  lastSyncAt?: number
  /** Server endpoint for sync */
  serverUrl?: string
  /** Account/user identifier (after passphrase setup) */
  accountId?: string
  /** Error message if status is 'error' */
  error?: string
}

/**
 * Wrapped key bundle for server storage
 */
export interface WrappedKeyBundle {
  /** Version of the key bundle format */
  version: 1
  /** Salt used for passphrase derivation (public) */
  salt: string
  /** Device encryption key wrapped by master key */
  wrappedDek: string
  /** DEK version for rotation tracking */
  dekVersion: number
  /** When this bundle was created */
  createdAt: number
  /** Device ID that created this bundle */
  createdByDeviceId: string
}

/**
 * Device registration for multi-device sync
 */
export interface SyncDevice {
  /** Unique device identifier */
  deviceId: string
  /** Human-readable device name */
  deviceName: string
  /** When device was registered */
  registeredAt: number
  /** Last activity timestamp */
  lastActiveAt: number
  /** Whether device is revoked */
  revoked: boolean
  /** Public key for device-to-device communication (future) */
  publicKey?: string
}

/**
 * Sync operation for queue
 */
export interface SyncOperation {
  /** Operation ID */
  id: string
  /** Operation type */
  type: 'create' | 'update' | 'delete'
  /** Resource type (task, note, etc) */
  resourceType: string
  /** Resource ID */
  resourceId: string
  /** Encrypted payload */
  payload: EncryptedEnvelope
  /** Operation timestamp */
  timestamp: number
  /** Number of retry attempts */
  retryCount: number
  /** Last error if any */
  lastError?: string
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: false,
  status: 'disabled',
}

// ============================================================================
// SYNC MODE MANAGER (STUB)
// ============================================================================

/**
 * Sync Mode Manager
 *
 * STUB: Currently just maintains state. Real sync logic will be added later.
 */
class SyncModeManager {
  private config: SyncConfig = DEFAULT_SYNC_CONFIG
  private initialized = false

  /**
   * Initialize sync mode (loads config from storage)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    // Load config from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('frame-sync-config')
        if (stored) {
          this.config = { ...DEFAULT_SYNC_CONFIG, ...JSON.parse(stored) }
        }
      } catch {
        // Ignore parse errors
      }
    }

    this.initialized = true
  }

  /**
   * Get current sync config
   */
  getConfig(): SyncConfig {
    return { ...this.config }
  }

  /**
   * Check if sync is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.config.status === 'active'
  }

  /**
   * Check if sync is in setup mode
   */
  isSetupMode(): boolean {
    return this.config.status === 'setup'
  }

  /**
   * Enable sync mode (starts setup flow)
   *
   * STUB: Real implementation will:
   * 1. Prompt for passphrase
   * 2. Derive master key
   * 3. Wrap DEK
   * 4. Register with server
   */
  async enableSync(_serverUrl: string): Promise<{ success: boolean; error?: string }> {
    // STUB: Just update config
    this.config = {
      ...this.config,
      enabled: false, // Still false until passphrase is set
      status: 'setup',
      serverUrl: _serverUrl,
    }
    this.saveConfig()

    return {
      success: true,
      // In real implementation, this would return setup instructions
    }
  }

  /**
   * Complete sync setup with passphrase
   *
   * STUB: Real implementation will:
   * 1. Derive master key from passphrase using Argon2id
   * 2. Wrap device encryption key
   * 3. Send wrapped key to server
   * 4. Activate sync
   */
  async completeSetup(_passphrase: string): Promise<{ success: boolean; error?: string }> {
    if (this.config.status !== 'setup') {
      return { success: false, error: 'Not in setup mode' }
    }

    // STUB: Would derive key and wrap DEK here
    // For now, just mark as not implemented
    return {
      success: false,
      error: 'Sync setup not yet implemented. Local encryption is active.',
    }
  }

  /**
   * Disable sync mode
   */
  async disableSync(): Promise<void> {
    this.config = {
      ...DEFAULT_SYNC_CONFIG,
    }
    this.saveConfig()
  }

  /**
   * Get registered devices
   *
   * STUB: Would fetch from server
   */
  async getDevices(): Promise<SyncDevice[]> {
    // STUB: Return empty for now
    return []
  }

  /**
   * Revoke a device
   *
   * STUB: Would call server API
   */
  async revokeDevice(_deviceId: string): Promise<boolean> {
    // STUB: Not implemented
    return false
  }

  /**
   * Sync now (manual trigger)
   *
   * STUB: Would sync pending operations
   */
  async syncNow(): Promise<{ success: boolean; synced: number; error?: string }> {
    if (!this.isEnabled()) {
      return { success: false, synced: 0, error: 'Sync not enabled' }
    }

    // STUB: Would process sync queue
    return { success: true, synced: 0 }
  }

  /**
   * Get pending sync operations count
   */
  async getPendingCount(): Promise<number> {
    // STUB: Would check sync queue
    return 0
  }

  /**
   * Save config to localStorage
   */
  private saveConfig(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('frame-sync-config', JSON.stringify(this.config))
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let syncManager: SyncModeManager | null = null

/**
 * Get the sync mode manager instance
 */
export function getSyncManager(): SyncModeManager {
  if (!syncManager) {
    syncManager = new SyncModeManager()
  }
  return syncManager
}

/**
 * Initialize sync mode
 */
export async function initializeSyncMode(): Promise<void> {
  const manager = getSyncManager()
  await manager.initialize()
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const isSyncEnabled = () => getSyncManager().isEnabled()
export const getSyncConfig = () => getSyncManager().getConfig()
