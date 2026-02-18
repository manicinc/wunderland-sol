/**
 * Media Storage Hook - React interface to IndexedDB media storage
 * @module codex/hooks/useMediaStorage
 *
 * Provides reactive state for media assets with:
 * - Automatic loading of strand media on mount
 * - Online/offline sync status tracking
 * - Convenience methods for store/delete operations
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  storeMedia,
  getStrandMedia,
  deleteMedia,
  processSyncQueue,
  cleanupOrphanedMedia,
  getStorageStats,
  MediaStore,
  MediaAssetInput,
  SyncStatus,
} from '@/lib/storage/mediaStorage'

export type StoreSyncStatus = 'idle' | 'loading' | 'syncing' | 'error'

export interface UseMediaStorageOptions {
  /** Path to the current strand */
  strandPath: string
  /** Whether to auto-sync when online */
  autoSync?: boolean
  /** Callback when sync completes */
  onSyncComplete?: (result: { uploaded: number; deleted: number; failed: number }) => void
  /** Upload function for GitHub sync */
  uploadFn?: (blob: Blob, path: string) => Promise<boolean>
  /** Delete function for GitHub sync */
  deleteFn?: (path: string) => Promise<boolean>
}

export interface UseMediaStorageReturn {
  /** All media assets for this strand */
  assets: MediaStore[]
  /** Current sync status */
  syncStatus: StoreSyncStatus
  /** Number of items pending sync */
  pendingCount: number
  /** Total storage size in bytes */
  totalSize: number
  /** Whether currently online */
  isOnline: boolean
  /** Store a new media asset */
  storeAsset: (asset: MediaAssetInput) => Promise<MediaStore>
  /** Delete a media asset */
  deleteAsset: (id: string) => Promise<void>
  /** Force sync now */
  syncNow: () => Promise<void>
  /** Cleanup orphaned media */
  cleanup: (content: string) => Promise<number>
  /** Refresh assets from storage */
  refresh: () => Promise<void>
}

/**
 * Hook for managing media assets in IndexedDB with GitHub sync
 */
export function useMediaStorage({
  strandPath,
  autoSync = true,
  onSyncComplete,
  uploadFn,
  deleteFn,
}: UseMediaStorageOptions): UseMediaStorageReturn {
  const [assets, setAssets] = useState<MediaStore[]>([])
  const [syncStatus, setSyncStatus] = useState<StoreSyncStatus>('idle')
  const [pendingCount, setPendingCount] = useState(0)
  const [totalSize, setTotalSize] = useState(0)
  const [isOnline, setIsOnline] = useState(true)

  // Track if component is mounted
  const isMounted = useRef(true)

  // Default upload/delete functions (no-op if not provided)
  const uploadFnRef = useRef(uploadFn)
  const deleteFnRef = useRef(deleteFn)

  useEffect(() => {
    uploadFnRef.current = uploadFn
    deleteFnRef.current = deleteFn
  }, [uploadFn, deleteFn])

  // Load assets from storage
  const refresh = useCallback(async () => {
    if (!strandPath) return

    try {
      setSyncStatus('loading')
      const strandAssets = await getStrandMedia(strandPath)
      const stats = await getStorageStats()

      if (isMounted.current) {
        setAssets(strandAssets)
        setPendingCount(stats.pendingCount)
        setTotalSize(stats.totalSize)
        setSyncStatus('idle')
      }
    } catch (error) {
      console.error('[useMediaStorage] Failed to load assets:', error)
      if (isMounted.current) {
        setSyncStatus('error')
      }
    }
  }, [strandPath])

  // Store a new asset
  const storeAsset = useCallback(async (asset: MediaAssetInput): Promise<MediaStore> => {
    const stored = await storeMedia(asset, strandPath)

    // Update local state
    setAssets(prev => [...prev, stored])
    setPendingCount(prev => prev + 1)
    setTotalSize(prev => prev + stored.size)

    return stored
  }, [strandPath])

  // Delete an asset
  const deleteAsset = useCallback(async (id: string): Promise<void> => {
    const asset = assets.find(a => a.id === id)

    await deleteMedia(id)

    // Update local state
    setAssets(prev => prev.filter(a => a.id !== id))
    if (asset) {
      setTotalSize(prev => prev - asset.size)
    }
  }, [assets])

  // Sync pending items to GitHub
  const syncNow = useCallback(async (): Promise<void> => {
    if (!isOnline) {
      console.warn('[useMediaStorage] Cannot sync while offline')
      return
    }

    if (!uploadFnRef.current || !deleteFnRef.current) {
      console.warn('[useMediaStorage] Upload/delete functions not provided')
      return
    }

    try {
      setSyncStatus('syncing')

      const result = await processSyncQueue(
        uploadFnRef.current,
        deleteFnRef.current
      )

      if (isMounted.current) {
        await refresh()
        setSyncStatus('idle')
        onSyncComplete?.(result)
      }
    } catch (error) {
      console.error('[useMediaStorage] Sync failed:', error)
      if (isMounted.current) {
        setSyncStatus('error')
      }
    }
  }, [isOnline, refresh, onSyncComplete])

  // Cleanup orphaned media
  const cleanup = useCallback(async (content: string): Promise<number> => {
    const removed = await cleanupOrphanedMedia(strandPath, content)
    await refresh()
    return removed
  }, [strandPath, refresh])

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (autoSync && pendingCount > 0) {
        syncNow()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [autoSync, pendingCount, syncNow])

  // Load assets on mount and strand change
  useEffect(() => {
    isMounted.current = true
    refresh()

    return () => {
      isMounted.current = false
    }
  }, [refresh])

  // Auto-sync when online and have pending items
  useEffect(() => {
    if (autoSync && isOnline && pendingCount > 0 && syncStatus === 'idle') {
      const timer = setTimeout(() => {
        syncNow()
      }, 2000) // Debounce sync

      return () => clearTimeout(timer)
    }
  }, [autoSync, isOnline, pendingCount, syncStatus, syncNow])

  return {
    assets,
    syncStatus,
    pendingCount,
    totalSize,
    isOnline,
    storeAsset,
    deleteAsset,
    syncNow,
    cleanup,
    refresh,
  }
}

export default useMediaStorage
