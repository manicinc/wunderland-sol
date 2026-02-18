/**
 * Vault Provider
 * @module components/providers/VaultProvider
 *
 * App wrapper that manages vault state and shows setup wizard if needed.
 * Provides vault context to all child components.
 */

'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import type { VaultConfig, VaultStatus, VaultStatusResult } from '@/lib/vault'
import {
  checkVaultStatus,
  getStoredVaultHandle,
  requestVaultPermission,
  showVaultPicker,
  openVault,
} from '@/lib/vault'
import { isFirstLaunchCompleted } from '@/lib/codexDatabase'
import { VaultSetupWizard } from '@/components/onboarding/VaultSetupWizard'

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface VaultContextValue {
  /** Current vault status */
  status: VaultStatus
  /** Vault configuration (if loaded) */
  config: VaultConfig | null
  /** Vault directory handle (if accessible) */
  handle: FileSystemDirectoryHandle | null
  /** Vault display path */
  path: string | null
  /** Whether vault is ready for use */
  isReady: boolean
  /** Whether we're in IndexedDB-only mode (no vault) */
  isIndexedDbOnly: boolean
  /** Refresh vault status */
  refresh: () => Promise<void>
  /** Request vault permission (for reconnect scenarios) */
  requestPermission: () => Promise<boolean>
  /** Disconnect from vault */
  disconnect: () => Promise<void>
}

const VaultContext = createContext<VaultContextValue | null>(null)

// ============================================================================
// HOOK
// ============================================================================

export function useVault(): VaultContextValue {
  const context = useContext(VaultContext)
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider')
  }
  return context
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export interface VaultProviderProps {
  children: ReactNode
  /** Skip vault check and use IndexedDB-only mode */
  forceIndexedDbOnly?: boolean
  /** Theme for setup wizard */
  theme?: string
}

export function VaultProvider({
  children,
  forceIndexedDbOnly = false,
  theme = 'light',
}: VaultProviderProps) {
  const [status, setStatus] = useState<VaultStatus>('needs-setup')
  const [config, setConfig] = useState<VaultConfig | null>(null)
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [path, setPath] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [showReconnect, setShowReconnect] = useState(false)
  const [isIndexedDbOnly, setIsIndexedDbOnly] = useState(forceIndexedDbOnly)

  // Check vault status on mount
  const checkStatus = useCallback(async () => {
    if (forceIndexedDbOnly) {
      setIsLoading(false)
      setIsIndexedDbOnly(true)
      setStatus('ready') // Treat as ready for IndexedDB-only mode
      return
    }

    setIsLoading(true)

    try {
      // Check if we're in Electron with auto-initialized vault
      if (typeof window !== 'undefined' && (window as any).electronAPI?.vault) {
        try {
          const electronVaultStatus = await (window as any).electronAPI.vault.getStatus()
          if (electronVaultStatus.electronVaultInitialized && electronVaultStatus.vaultPath) {
            console.log('[VaultProvider] Electron vault already initialized:', electronVaultStatus.vaultPath)
            setPath(electronVaultStatus.vaultPath)
            setStatus('ready')
            setIsLoading(false)
            return
          }
        } catch (e) {
          console.log('[VaultProvider] Not in Electron or vault not ready:', e)
        }
      }

      // First check if first launch was completed
      const firstLaunchDone = await isFirstLaunchCompleted()

      if (!firstLaunchDone) {
        // Show setup wizard
        setShowWizard(true)
        setIsLoading(false)
        return
      }

      // Check vault status
      const result = await checkVaultStatus()

      setStatus(result.status)
      setConfig(result.config ?? null)
      setHandle(result.handle ?? null)
      setPath(result.path ?? null)

      if (result.status === 'permission-needed') {
        setShowReconnect(true)
      } else if (result.status === 'missing') {
        // Vault was configured but can't be accessed
        setShowReconnect(true)
      } else if (result.status === 'unsupported') {
        // Browser doesn't support File System Access API
        // Fall back to IndexedDB-only mode
        setIsIndexedDbOnly(true)
      }
    } catch (error) {
      console.error('[VaultProvider] Failed to check vault status:', error)
      setStatus('missing')
    } finally {
      setIsLoading(false)
    }
  }, [forceIndexedDbOnly])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  // Request permission for existing vault
  const handleRequestPermission = useCallback(async (): Promise<boolean> => {
    const storedHandle = await getStoredVaultHandle()
    if (!storedHandle) return false

    const granted = await requestVaultPermission(storedHandle)
    if (granted) {
      setHandle(storedHandle)
      setStatus('ready')
      setShowReconnect(false)

      // Load config
      try {
        const vaultConfig = await openVault(storedHandle)
        setConfig(vaultConfig)
        setPath(storedHandle.name)
      } catch {
        // Config load failed, but we have access
      }
    }
    return granted
  }, [])

  // Handle setup wizard completion
  const handleSetupComplete = useCallback((newHandle: FileSystemDirectoryHandle) => {
    setHandle(newHandle)
    setPath(newHandle.name)
    setStatus('ready')
    setShowWizard(false)
  }, [])

  // Handle skip (IndexedDB-only mode)
  const handleSkip = useCallback(() => {
    setIsIndexedDbOnly(true)
    setStatus('ready')
    setShowWizard(false)
  }, [])

  // Handle reconnect (re-select folder)
  const handleReconnect = useCallback(async () => {
    try {
      const newHandle = await showVaultPicker()
      if (newHandle) {
        const vaultConfig = await openVault(newHandle)
        setHandle(newHandle)
        setConfig(vaultConfig)
        setPath(newHandle.name)
        setStatus('ready')
        setShowReconnect(false)
      }
    } catch (error) {
      console.error('[VaultProvider] Reconnect failed:', error)
    }
  }, [])

  // Disconnect from vault
  const handleDisconnect = useCallback(async () => {
    const { clearVaultHandle } = await import('@/lib/vault')
    await clearVaultHandle()
    setHandle(null)
    setConfig(null)
    setPath(null)
    setStatus('needs-setup')
  }, [])

  // Context value
  const contextValue: VaultContextValue = {
    status,
    config,
    handle,
    path,
    isReady: status === 'ready' || isIndexedDbOnly,
    isIndexedDbOnly,
    refresh: checkStatus,
    requestPermission: handleRequestPermission,
    disconnect: handleDisconnect,
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show setup wizard for first launch
  if (showWizard) {
    return (
      <VaultSetupWizard
        onComplete={handleSetupComplete}
        onSkip={handleSkip}
        theme={theme}
      />
    )
  }

  // Show reconnect dialog if vault is missing/needs permission
  if (showReconnect) {
    return (
      <ReconnectDialog
        status={status}
        onReconnect={handleReconnect}
        onRequestPermission={handleRequestPermission}
        onSkip={handleSkip}
        theme={theme}
      />
    )
  }

  // Render children with vault context
  return (
    <VaultContext.Provider value={contextValue}>
      {children}
    </VaultContext.Provider>
  )
}

// ============================================================================
// RECONNECT DIALOG
// ============================================================================

function ReconnectDialog({
  status,
  onReconnect,
  onRequestPermission,
  onSkip,
  theme = 'light',
}: {
  status: VaultStatus
  onReconnect: () => void
  onRequestPermission: () => Promise<boolean>
  onSkip: () => void
  theme?: string
}) {
  const isDark = theme.includes('dark')
  const [isRequesting, setIsRequesting] = useState(false)

  const handleRequestPermission = async () => {
    setIsRequesting(true)
    await onRequestPermission()
    setIsRequesting(false)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md mx-4 p-6 rounded-2xl shadow-2xl ${
        isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}>
        <div className="text-center mb-6">
          <div className={`inline-flex p-4 rounded-full mb-4 ${
            isDark ? 'bg-amber-500/20' : 'bg-amber-100'
          }`}>
            <svg
              className={`w-12 h-12 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {status === 'permission-needed' ? 'Permission Required' : 'Vault Not Found'}
          </h2>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {status === 'permission-needed'
              ? 'Please grant permission to access your vault folder.'
              : 'Your vault folder couldn\'t be accessed. It may have been moved or deleted.'}
          </p>
        </div>

        <div className="space-y-3">
          {status === 'permission-needed' && (
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isRequesting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Requesting...
                </>
              ) : (
                'Grant Permission'
              )}
            </button>
          )}

          <button
            onClick={onReconnect}
            className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              status === 'permission-needed'
                ? isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            Locate Vault Folder
          </button>

          <button
            onClick={onSkip}
            className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Continue Without Vault
          </button>
        </div>
      </div>
    </div>
  )
}

export default VaultProvider
