/**
 * React Hooks for Encryption
 *
 * Provides React hooks for using encrypted storage and monitoring
 * encryption status.
 *
 * @module lib/crypto/hooks
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { EncryptedStorage, type EncryptedStorageOptions } from './encryptedStorage'
import {
  getEncryptionStatus,
  loadEncryptionPreferences,
  saveEncryptionPreferences,
  type EncryptionStatus,
  type EncryptionPreferences,
} from './config'
import { getSyncManager, type SyncConfig } from './syncMode'

// ============================================================================
// useEncryptionStatus
// ============================================================================

/**
 * Hook to monitor encryption status
 *
 * @example
 * ```tsx
 * function StatusBadge() {
 *   const { status, loading } = useEncryptionStatus()
 *
 *   if (loading) return <Spinner />
 *   if (!status.active) return <WarningBadge />
 *
 *   return <EncryptedBadge mode={status.mode} />
 * }
 * ```
 */
export function useEncryptionStatus() {
  const [status, setStatus] = useState<EncryptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const newStatus = await getEncryptionStatus()
      setStatus(newStatus)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()

    // Refresh on visibility change (user returns to tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [refresh])

  return { status, loading, error, refresh }
}

// ============================================================================
// useEncryptionPreferences
// ============================================================================

/**
 * Hook to manage encryption preferences
 */
export function useEncryptionPreferences() {
  const [prefs, setPrefs] = useState<EncryptionPreferences>(() =>
    loadEncryptionPreferences()
  )

  const updatePrefs = useCallback((updates: Partial<EncryptionPreferences>) => {
    saveEncryptionPreferences(updates)
    setPrefs(prev => ({ ...prev, ...updates }))
  }, [])

  return { prefs, updatePrefs }
}

// ============================================================================
// useEncryptedStorage
// ============================================================================

/**
 * Hook for using encrypted storage with React state
 *
 * @example
 * ```tsx
 * function SecretNotes() {
 *   const { value, setValue, loading } = useEncryptedStorage<string[]>(
 *     'secret-notes',
 *     []
 *   )
 *
 *   const addNote = (note: string) => {
 *     setValue([...value, note])
 *   }
 *
 *   return (
 *     <div>
 *       {value.map(note => <Note key={note} text={note} />)}
 *     </div>
 *   )
 * }
 * ```
 */
export function useEncryptedStorage<T>(
  key: string,
  defaultValue: T,
  options?: EncryptedStorageOptions
) {
  const [value, setValueState] = useState<T>(defaultValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const storageRef = useRef<EncryptedStorage | null>(null)

  // Get or create storage instance
  const getStorage = useCallback(() => {
    if (!storageRef.current) {
      storageRef.current = new EncryptedStorage({
        namespace: 'frame-data',
        ...options,
      })
    }
    return storageRef.current
  }, [options])

  // Load initial value
  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const storage = getStorage()
        const stored = await storage.get<T>(key, defaultValue)
        if (mounted) {
          setValueState(stored)
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()
    return () => { mounted = false }
  }, [key, defaultValue, getStorage])

  // Set value (persists to storage)
  const setValue = useCallback(async (newValue: T | ((prev: T) => T)) => {
    try {
      const storage = getStorage()
      const resolvedValue = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(value)
        : newValue

      setValueState(resolvedValue)
      await storage.set(key, resolvedValue)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }, [key, value, getStorage])

  // Remove value
  const removeValue = useCallback(async () => {
    try {
      const storage = getStorage()
      await storage.remove(key)
      setValueState(defaultValue)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove')
    }
  }, [key, defaultValue, getStorage])

  return { value, setValue, removeValue, loading, error }
}

// ============================================================================
// useSyncMode
// ============================================================================

/**
 * Hook to manage sync mode
 */
export function useSyncMode() {
  const [config, setConfig] = useState<SyncConfig>(() =>
    getSyncManager().getConfig()
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize sync manager
  useEffect(() => {
    async function init() {
      const manager = getSyncManager()
      await manager.initialize()
      setConfig(manager.getConfig())
    }
    init()
  }, [])

  // Enable sync (starts setup)
  const enableSync = useCallback(async (serverUrl: string) => {
    setLoading(true)
    setError(null)
    try {
      const manager = getSyncManager()
      const result = await manager.enableSync(serverUrl)
      if (!result.success) {
        setError(result.error || 'Failed to enable sync')
      }
      setConfig(manager.getConfig())
      return result.success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable sync')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // Complete setup with passphrase
  const completeSetup = useCallback(async (passphrase: string) => {
    setLoading(true)
    setError(null)
    try {
      const manager = getSyncManager()
      const result = await manager.completeSetup(passphrase)
      if (!result.success) {
        setError(result.error || 'Setup failed')
      }
      setConfig(manager.getConfig())
      return result.success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // Disable sync
  const disableSync = useCallback(async () => {
    setLoading(true)
    try {
      const manager = getSyncManager()
      await manager.disableSync()
      setConfig(manager.getConfig())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable sync')
    } finally {
      setLoading(false)
    }
  }, [])

  // Manual sync
  const syncNow = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const manager = getSyncManager()
      const result = await manager.syncNow()
      if (!result.success) {
        setError(result.error || 'Sync failed')
      }
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
      return { success: false, synced: 0, error: 'Sync failed' }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    config,
    loading,
    error,
    enableSync,
    completeSetup,
    disableSync,
    syncNow,
    isEnabled: config.enabled && config.status === 'active',
    isSetupMode: config.status === 'setup',
  }
}

// ============================================================================
// useEncryptedValue (simpler single-value hook)
// ============================================================================

/**
 * Simple hook for a single encrypted value
 *
 * @example
 * ```tsx
 * function ApiKeyInput() {
 *   const [apiKey, setApiKey] = useEncryptedValue('api-key', '')
 *   return <input value={apiKey} onChange={e => setApiKey(e.target.value)} />
 * }
 * ```
 */
export function useEncryptedValue<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void, boolean] {
  const { value, setValue, loading } = useEncryptedStorage(key, defaultValue)

  const setValueSync = useCallback((newValue: T) => {
    setValue(newValue)
  }, [setValue])

  return [value, setValueSync, loading]
}
