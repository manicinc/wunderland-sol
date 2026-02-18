/**
 * Vault Settings Component
 * @module components/quarry/ui/settings/VaultSettings
 *
 * Settings panel for managing the vault folder location.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  FolderOpen,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  HardDrive,
  Database,
  Loader2,
} from 'lucide-react'
import {
  checkVaultStatus,
  showVaultPicker,
  openVault,
  isFileSystemAccessSupported,
  requestVaultPermission,
  getStoredVaultHandle,
  type VaultStatus,
  type VaultConfig,
} from '@/lib/vault'
import { getVaultPath, getVaultName, setVaultPath, setVaultName } from '@/lib/codexDatabase'
import { cn } from '@/lib/utils'
import { isPublicAccess, getDisabledTooltip } from '@/lib/config/publicAccess'

// ============================================================================
// TYPES
// ============================================================================

interface VaultStats {
  weaveCount: number
  loomCount: number
  strandCount: number
  totalSize: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function VaultSettings() {
  const [status, setStatus] = useState<VaultStatus>('needs-setup')
  const [config, setConfig] = useState<VaultConfig | null>(null)
  const [path, setPath] = useState<string | null>(null)
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isChanging, setIsChanging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<VaultStats | null>(null)
  const publicMode = isPublicAccess()

  const isSupported = isFileSystemAccessSupported()

  // Load current vault status
  const loadVaultStatus = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get stored path for display
      const storedPath = await getVaultPath()
      const storedName = await getVaultName()
      setPath(storedPath)

      // Check actual vault status
      const result = await checkVaultStatus()
      setStatus(result.status)
      setConfig(result.config ?? null)
      setHandle(result.handle ?? null)

      if (result.status === 'ready' && result.handle) {
        // Load vault stats
        await loadVaultStats(result.handle)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vault status')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load vault statistics
  const loadVaultStats = async (vaultHandle: FileSystemDirectoryHandle) => {
    try {
      let weaveCount = 0
      let loomCount = 0
      let strandCount = 0

      // Count weaves, looms, and strands
      const countFiles = async (dir: FileSystemDirectoryHandle, depth = 0) => {
        // @ts-expect-error - FileSystemDirectoryHandle.values() exists but TS DOM types are incomplete
        for await (const entry of dir.values() as AsyncIterable<FileSystemHandle>) {
          if (entry.kind === 'directory') {
            if (entry.name === '.quarry') continue

            if (depth === 1) {
              // weaves/[weave]
              weaveCount++
            } else if (depth >= 3 && entry.name === 'looms') {
              // Looms directory
            } else if (depth >= 4) {
              loomCount++
            }

            const subDir = await dir.getDirectoryHandle(entry.name)
            await countFiles(subDir, depth + 1)
          } else if (entry.kind === 'file' && entry.name.endsWith('.md')) {
            strandCount++
          }
        }
      }

      try {
        const weavesDir = await vaultHandle.getDirectoryHandle('weaves')
        await countFiles(weavesDir, 0)
      } catch {
        // No weaves directory yet
      }

      setStats({
        weaveCount,
        loomCount,
        strandCount,
        totalSize: 'Calculating...',
      })
    } catch {
      // Stats loading failed, that's okay
    }
  }

  useEffect(() => {
    loadVaultStatus()
  }, [loadVaultStatus])

  // Handle change location
  const handleChangeLocation = async () => {
    setIsChanging(true)
    setError(null)

    try {
      const newHandle = await showVaultPicker()
      if (newHandle) {
        // Try to open as existing vault or create new
        try {
          const vaultConfig = await openVault(newHandle)
          setConfig(vaultConfig)
          setHandle(newHandle)
          setPath(newHandle.name)
          setStatus('ready')

          // Update stored settings
          await setVaultPath(newHandle.name)
          await setVaultName(vaultConfig.name)

          // Load stats
          await loadVaultStats(newHandle)
        } catch {
          setError('Selected folder is not a valid vault. Create a new vault from the setup wizard.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change location')
    } finally {
      setIsChanging(false)
    }
  }

  // Handle reconnect (re-request permission)
  const handleReconnect = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const storedHandle = await getStoredVaultHandle()
      if (storedHandle) {
        const granted = await requestVaultPermission(storedHandle)
        if (granted) {
          setHandle(storedHandle)
          setStatus('ready')
          try {
            const vaultConfig = await openVault(storedHandle)
            setConfig(vaultConfig)
            await loadVaultStats(storedHandle)
          } catch {
            // Config load failed but we have access
          }
        } else {
          setError('Permission denied. Please grant access to your vault folder.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reconnect')
    } finally {
      setIsLoading(false)
    }
  }

  // Render status badge
  const renderStatusBadge = () => {
    switch (status) {
      case 'ready':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        )
      case 'permission-needed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            Permission Required
          </span>
        )
      case 'missing':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            Not Found
          </span>
        )
      case 'unsupported':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium">
            Browser Only
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-sm font-medium">
            Not Configured
          </span>
        )
    }
  }

  if (!isSupported) {
    return (
      <div className="bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <HardDrive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white">Vault Location</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Browser-only mode</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">
                Local Vault Not Available
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Your browser doesn&apos;t support local file storage. Content is stored in browser storage only.
                Use Chrome, Edge, or Opera for persistent local storage.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-xl',
              status === 'ready'
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-zinc-100 dark:bg-zinc-700'
            )}>
              <HardDrive className={cn(
                'w-5 h-5',
                status === 'ready'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-500'
              )} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Vault Location
                {renderStatusBadge()}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Where your markdown files are stored
              </p>
            </div>
          </div>
          <button
            onClick={loadVaultStatus}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={cn('w-4 h-4 text-zinc-500', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Current path */}
            {path && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                <FolderOpen className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                    {path}
                  </p>
                  {config && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {config.name} &bull; Created {new Date(config.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {status === 'ready' && (
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                )}
              </div>
            )}

            {/* Vault stats */}
            {status === 'ready' && stats && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.weaveCount}</p>
                  <p className="text-xs text-zinc-500">Weaves</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.loomCount}</p>
                  <p className="text-xs text-zinc-500">Looms</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.strandCount}</p>
                  <p className="text-xs text-zinc-500">Strands</p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {status === 'permission-needed' && (
                <button
                  onClick={handleReconnect}
                  disabled={isLoading || publicMode}
                  title={publicMode ? getDisabledTooltip('Vault access') : undefined}
                  className={`flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${publicMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  Grant Permission
                </button>
              )}

              <button
                onClick={handleChangeLocation}
                disabled={isChanging || isLoading || publicMode}
                title={publicMode ? getDisabledTooltip('Vault location') : undefined}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                  publicMode
                    ? 'opacity-60 cursor-not-allowed bg-zinc-100 dark:bg-zinc-700 text-zinc-500'
                    : status === 'ready'
                      ? 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                )}
              >
                {isChanging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Selecting...
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-4 h-4" />
                    {status === 'ready' ? 'Change Location' : 'Choose Folder'}
                  </>
                )}
              </button>
            </div>

            {/* Info */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-700/50">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Your vault folder stores all markdown files locally. This data persists even if you uninstall the app.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default VaultSettings
