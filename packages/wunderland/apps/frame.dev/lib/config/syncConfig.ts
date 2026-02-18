/**
 * Sync Server Configuration
 *
 * Stores sync server settings with localStorage encryption.
 * Follows the same pattern as apiKeyStorage.ts for consistency.
 *
 * @module lib/config/syncConfig
 */

import { encryptData, decryptData } from './apiKeyStorage'

// ============================================================================
// TYPES
// ============================================================================

export interface SyncServerConfig {
  /** Whether to use a custom sync server */
  useCustomServer: boolean
  /** Custom sync server URL (e.g., https://sync.example.com) */
  customServerUrl?: string
  /** When the config was saved */
  savedAt: number
  /** Connection status from last test */
  lastTestResult?: {
    success: boolean
    message: string
    testedAt: number
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'quarry-sync-config'
const ELECTRON_SYNC_CONFIG_KEY = 'syncConfig'

/** Default sync server URL from environment */
const DEFAULT_SYNC_URL = process.env.NEXT_PUBLIC_SYNC_ENDPOINT || 'wss://sync.quarry.space/api/v1/sync'

// ============================================================================
// ELECTRON DETECTION
// ============================================================================

interface ElectronSettingsAPI {
  get: (key: string) => Promise<unknown>
  set: (key: string, value: unknown) => Promise<boolean>
  delete: (key: string) => Promise<boolean>
}

interface ElectronAPI {
  settings?: ElectronSettingsAPI
}

function getElectronAPI(): ElectronAPI | null {
  if (typeof window === 'undefined') return null
  if (!('electronAPI' in window)) return null
  return (window as unknown as { electronAPI: ElectronAPI }).electronAPI
}

function isElectron(): boolean {
  const api = getElectronAPI()
  return api !== null && api.settings !== undefined
}

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

/**
 * Get sync configuration from storage
 */
export async function getSyncConfig(): Promise<SyncServerConfig> {
  if (typeof window === 'undefined') {
    return getDefaultConfig()
  }

  try {
    if (isElectron()) {
      const api = getElectronAPI()!
      const config = await api.settings!.get(ELECTRON_SYNC_CONFIG_KEY)
      return (config as SyncServerConfig) || getDefaultConfig()
    } else {
      const encrypted = localStorage.getItem(STORAGE_KEY)
      if (!encrypted) return getDefaultConfig()

      const decrypted = await decryptData(encrypted)
      if (!decrypted) return getDefaultConfig()

      return JSON.parse(decrypted) as SyncServerConfig
    }
  } catch {
    return getDefaultConfig()
  }
}

/**
 * Save sync configuration to storage
 */
export async function setSyncConfig(config: Partial<SyncServerConfig>): Promise<void> {
  if (typeof window === 'undefined') return

  const current = await getSyncConfig()
  const updated: SyncServerConfig = {
    ...current,
    ...config,
    savedAt: Date.now(),
  }

  if (isElectron()) {
    const api = getElectronAPI()!
    await api.settings!.set(ELECTRON_SYNC_CONFIG_KEY, updated)
  } else {
    const encrypted = await encryptData(JSON.stringify(updated))
    localStorage.setItem(STORAGE_KEY, encrypted)
  }

  // Dispatch event for reactivity
  window.dispatchEvent(new CustomEvent('sync-config-changed', { detail: updated }))
}

/**
 * Clear sync configuration
 */
export async function clearSyncConfig(): Promise<void> {
  if (typeof window === 'undefined') return

  if (isElectron()) {
    const api = getElectronAPI()!
    await api.settings!.delete(ELECTRON_SYNC_CONFIG_KEY)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }

  window.dispatchEvent(new CustomEvent('sync-config-changed', { detail: getDefaultConfig() }))
}

/**
 * Get the effective sync URL to use
 * Returns custom URL if configured, otherwise the default
 */
export async function getEffectiveSyncUrl(): Promise<string> {
  const config = await getSyncConfig()

  if (config.useCustomServer && config.customServerUrl) {
    return config.customServerUrl
  }

  return DEFAULT_SYNC_URL
}

/**
 * Get the effective HTTP API URL (converts WebSocket URL to HTTP)
 */
export async function getEffectiveApiUrl(): Promise<string> {
  const wsUrl = await getEffectiveSyncUrl()

  // Convert wss:// to https:// and ws:// to http://
  let httpUrl = wsUrl
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://')

  // Remove /sync path suffix if present (for REST API)
  if (httpUrl.endsWith('/sync')) {
    httpUrl = httpUrl.slice(0, -5)
  }

  return httpUrl
}

/**
 * Test connection to a sync server
 */
export async function testSyncServerConnection(url: string): Promise<{
  success: boolean
  message: string
  version?: string
}> {
  try {
    // Convert WebSocket URL to HTTP for health check
    const httpUrl = url
      .replace(/^wss:\/\//, 'https://')
      .replace(/^ws:\/\//, 'http://')
      .replace(/\/api\/v1\/sync$/, '')

    const healthUrl = `${httpUrl}/health`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const response = await fetch(healthUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return {
        success: false,
        message: `Server returned ${response.status}: ${response.statusText}`,
      }
    }

    const data = await response.json()

    return {
      success: true,
      message: 'Connected successfully',
      version: data.version,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, message: 'Connection timed out' }
      }
      return { success: false, message: error.message }
    }
    return { success: false, message: 'Unknown error' }
  }
}

/**
 * Validate sync server URL format
 */
export function validateSyncUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'URL is required' }
  }

  try {
    const parsed = new URL(url)

    // Must be wss:// or ws:// for WebSocket, or https:// or http://
    if (!['wss:', 'ws:', 'https:', 'http:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use wss://, ws://, https://, or http:// protocol' }
    }

    // Warn about non-secure protocols
    if (parsed.protocol === 'ws:' || parsed.protocol === 'http:') {
      return {
        valid: true,
        error: 'Warning: Using unencrypted connection. HTTPS/WSS is recommended.',
      }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Get default configuration
 */
function getDefaultConfig(): SyncServerConfig {
  return {
    useCustomServer: false,
    savedAt: 0,
  }
}

/**
 * Check if using custom sync server
 */
export async function isUsingCustomServer(): Promise<boolean> {
  const config = await getSyncConfig()
  return config.useCustomServer && !!config.customServerUrl
}

/**
 * Get the default sync URL
 */
export function getDefaultSyncUrl(): string {
  return DEFAULT_SYNC_URL
}
