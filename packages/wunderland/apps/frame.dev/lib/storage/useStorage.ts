/**
 * useStorage Hook
 * @module lib/storage/useStorage
 *
 * React hook for accessing the StorageManager.
 * Provides reactive state and easy access to storage operations.
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { StorageManager, getStorageManager, type StorageManagerConfig } from './StorageManager'
import type {
    StorableStrand,
    StorableCollection,
    StorableDraft,
    StorableBookmark,
    StorablePreferences,
    StorageSyncResult,
    StorageEvent,
} from './types'

// ============================================================================
// TYPES
// ============================================================================

export interface UseStorageState {
    /** Whether storage is initialized */
    ready: boolean
    /** Whether device is online */
    isOnline: boolean
    /** Number of pending changes waiting to sync */
    pendingCount: number
    /** Whether a sync is in progress */
    isSyncing: boolean
    /** Last sync result */
    lastSyncResult: StorageSyncResult | null
    /** Last error, if any */
    error: string | null
}

export interface UseStorageResult extends UseStorageState {
    /** Storage manager instance */
    manager: StorageManager | null

    // ========================================================================
    // STRAND OPERATIONS
    // ========================================================================

    getStrand: (path: string) => Promise<StorableStrand | null>
    getAllStrands: () => Promise<StorableStrand[]>
    getStrandsByWeave: (weave: string) => Promise<StorableStrand[]>
    saveStrand: (strand: Parameters<StorageManager['saveStrand']>[0]) => Promise<StorableStrand>
    deleteStrand: (path: string) => Promise<void>

    // ========================================================================
    // COLLECTION OPERATIONS
    // ========================================================================

    getCollection: (id: string) => Promise<StorableCollection | null>
    getAllCollections: () => Promise<StorableCollection[]>
    saveCollection: (collection: Parameters<StorageManager['saveCollection']>[0]) => Promise<StorableCollection>
    deleteCollection: (id: string) => Promise<void>

    // ========================================================================
    // DRAFT OPERATIONS
    // ========================================================================

    getDraft: (id: string) => Promise<StorableDraft | null>
    getAllDrafts: () => Promise<StorableDraft[]>
    saveDraft: (draft: Parameters<StorageManager['saveDraft']>[0]) => Promise<StorableDraft>
    deleteDraft: (id: string) => Promise<void>
    publishDraft: (draftId: string) => Promise<StorableStrand>

    // ========================================================================
    // BOOKMARK OPERATIONS
    // ========================================================================

    getBookmark: (strandPath: string) => Promise<StorableBookmark | null>
    getAllBookmarks: () => Promise<StorableBookmark[]>
    saveBookmark: (bookmark: Parameters<StorageManager['saveBookmark']>[0]) => Promise<StorableBookmark>
    deleteBookmark: (strandPath: string) => Promise<void>

    // ========================================================================
    // PREFERENCES OPERATIONS
    // ========================================================================

    getPreferences: () => Promise<StorablePreferences | null>
    savePreferences: (prefs: Parameters<StorageManager['savePreferences']>[0]) => Promise<StorablePreferences>

    // ========================================================================
    // SYNC OPERATIONS
    // ========================================================================

    sync: () => Promise<StorageSyncResult>
    getPendingCount: () => Promise<number>
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * React hook for unified storage access
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { ready, getAllCollections, saveCollection } = useStorage()
 *   const [collections, setCollections] = useState<StorableCollection[]>([])
 * 
 *   useEffect(() => {
 *     if (ready) {
 *       getAllCollections().then(setCollections)
 *     }
 *   }, [ready, getAllCollections])
 * 
 *   const handleCreate = async () => {
 *     const newCollection = await saveCollection({
 *       title: 'My Collection',
 *       strandPaths: [],
 *     })
 *     setCollections(prev => [...prev, newCollection])
 *   }
 * 
 *   return <div>...</div>
 * }
 * ```
 */
export function useStorage(config?: StorageManagerConfig): UseStorageResult {
    const [state, setState] = useState<UseStorageState>({
        ready: false,
        isOnline: true,
        pendingCount: 0,
        isSyncing: false,
        lastSyncResult: null,
        error: null,
    })

    const [manager, setManager] = useState<StorageManager | null>(null)

    // Initialize storage manager
    useEffect(() => {
        let mounted = true
        let unsubscribe: (() => void) | null = null

        async function init() {
            try {
                const mgr = getStorageManager(config)

                if (!mgr.isInitialized()) {
                    await mgr.initialize()
                }

                if (!mounted) return

                setManager(mgr)

                // Subscribe to events
                unsubscribe = mgr.on((event: StorageEvent) => {
                    if (!mounted) return

                    switch (event.type) {
                        case 'online':
                            setState(prev => ({ ...prev, isOnline: true }))
                            break
                        case 'offline':
                            setState(prev => ({ ...prev, isOnline: false }))
                            break
                        case 'sync-started':
                            setState(prev => ({ ...prev, isSyncing: true }))
                            break
                        case 'sync-completed':
                            setState(prev => ({
                                ...prev,
                                isSyncing: false,
                                lastSyncResult: event.data as StorageSyncResult,
                                pendingCount: 0,
                            }))
                            break
                        case 'sync-failed':
                            setState(prev => ({
                                ...prev,
                                isSyncing: false,
                                lastSyncResult: event.data as StorageSyncResult,
                                error: (event.data as StorageSyncResult)?.errors?.[0] || 'Sync failed',
                            }))
                            break
                        case 'entity-saved':
                        case 'entity-deleted':
                            // Refresh pending count
                            mgr.getPendingCount().then(count => {
                                if (mounted) {
                                    setState(prev => ({ ...prev, pendingCount: count }))
                                }
                            })
                            break
                    }
                })

                // Get initial pending count
                const pendingCount = await mgr.getPendingCount()

                if (mounted) {
                    setState(prev => ({
                        ...prev,
                        ready: true,
                        isOnline: mgr.isOnlineStatus(),
                        pendingCount,
                        error: null,
                    }))
                }
            } catch (error) {
                console.error('[useStorage] Initialization failed:', error)
                if (mounted) {
                    setState(prev => ({
                        ...prev,
                        ready: false,
                        error: error instanceof Error ? error.message : 'Failed to initialize storage',
                    }))
                }
            }
        }

        init()

        return () => {
            mounted = false
            if (unsubscribe) {
                unsubscribe()
            }
        }
    }, [config])

    // ========================================================================
    // MEMOIZED OPERATIONS
    // ========================================================================

    // Strand operations
    const getStrand = useCallback(
        (path: string) => manager?.getStrand(path) ?? Promise.resolve(null),
        [manager]
    )

    const getAllStrands = useCallback(
        () => manager?.getAllStrands() ?? Promise.resolve([]),
        [manager]
    )

    const getStrandsByWeave = useCallback(
        (weave: string) => manager?.getStrandsByWeave(weave) ?? Promise.resolve([]),
        [manager]
    )

    const saveStrand = useCallback(
        async (strand: Parameters<StorageManager['saveStrand']>[0]) => {
            if (!manager) throw new Error('Storage not initialized')
            return manager.saveStrand(strand)
        },
        [manager]
    )

    const deleteStrand = useCallback(
        async (path: string) => {
            if (!manager) throw new Error('Storage not initialized')
            return manager.deleteStrand(path)
        },
        [manager]
    )

    // Collection operations
    const getCollection = useCallback(
        (id: string) => manager?.getCollection(id) ?? Promise.resolve(null),
        [manager]
    )

    const getAllCollections = useCallback(
        () => manager?.getAllCollections() ?? Promise.resolve([]),
        [manager]
    )

    const saveCollection = useCallback(
        async (collection: Parameters<StorageManager['saveCollection']>[0]) => {
            if (!manager) throw new Error('Storage not initialized')
            return manager.saveCollection(collection)
        },
        [manager]
    )

    const deleteCollection = useCallback(
        async (id: string) => {
            if (!manager) throw new Error('Storage not initialized')
            return manager.deleteCollection(id)
        },
        [manager]
    )

    // Draft operations
    const getDraft = useCallback(
        (id: string) => manager?.getDraft(id) ?? Promise.resolve(null),
        [manager]
    )

    const getAllDrafts = useCallback(
        () => manager?.getAllDrafts() ?? Promise.resolve([]),
        [manager]
    )

    const saveDraft = useCallback(
        async (draft: Parameters<StorageManager['saveDraft']>[0]) => {
            if (!manager) throw new Error('Storage not initialized')
            return manager.saveDraft(draft)
        },
        [manager]
    )

    const deleteDraft = useCallback(
        async (id: string) => {
            if (!manager) throw new Error('Storage not initialized')
            return manager.deleteDraft(id)
        },
        [manager]
    )

    const publishDraft = useCallback(
        async (draftId: string) => {
            if (!manager) throw new Error('Storage not initialized')
            return manager.publishDraft(draftId)
        },
        [manager]
    )

    // Bookmark operations
    const getBookmark = useCallback(
        (strandPath: string) => manager?.getBookmark(strandPath) ?? Promise.resolve(null),
        [manager]
    )

    const getAllBookmarks = useCallback(
        () => manager?.getAllBookmarks() ?? Promise.resolve([]),
        [manager]
    )

    const saveBookmark = useCallback(
        async (bookmark: Parameters<StorageManager['saveBookmark']>[0]) => {
            if (!manager) throw new Error('Storage not initialized')
            return manager.saveBookmark(bookmark)
        },
        [manager]
    )

    const deleteBookmark = useCallback(
        async (strandPath: string) => {
            if (!manager) throw new Error('Storage not initialized')
            return manager.deleteBookmark(strandPath)
        },
        [manager]
    )

    // Preferences operations
    const getPreferences = useCallback(
        () => manager?.getPreferences() ?? Promise.resolve(null),
        [manager]
    )

    const savePreferences = useCallback(
        async (prefs: Parameters<StorageManager['savePreferences']>[0]) => {
            if (!manager) throw new Error('Storage not initialized')
            return manager.savePreferences(prefs)
        },
        [manager]
    )

    // Sync operations
    const sync = useCallback(
        async () => {
            if (!manager) throw new Error('Storage not initialized')
            return manager.sync()
        },
        [manager]
    )

    const getPendingCount = useCallback(
        () => manager?.getPendingCount() ?? Promise.resolve(0),
        [manager]
    )

    // ========================================================================
    // RETURN VALUE
    // ========================================================================

    return useMemo(
        () => ({
            ...state,
            manager,

            // Strands
            getStrand,
            getAllStrands,
            getStrandsByWeave,
            saveStrand,
            deleteStrand,

            // Collections
            getCollection,
            getAllCollections,
            saveCollection,
            deleteCollection,

            // Drafts
            getDraft,
            getAllDrafts,
            saveDraft,
            deleteDraft,
            publishDraft,

            // Bookmarks
            getBookmark,
            getAllBookmarks,
            saveBookmark,
            deleteBookmark,

            // Preferences
            getPreferences,
            savePreferences,

            // Sync
            sync,
            getPendingCount,
        }),
        [
            state,
            manager,
            getStrand,
            getAllStrands,
            getStrandsByWeave,
            saveStrand,
            deleteStrand,
            getCollection,
            getAllCollections,
            saveCollection,
            deleteCollection,
            getDraft,
            getAllDrafts,
            saveDraft,
            deleteDraft,
            publishDraft,
            getBookmark,
            getAllBookmarks,
            saveBookmark,
            deleteBookmark,
            getPreferences,
            savePreferences,
            sync,
            getPendingCount,
        ]
    )
}

// ============================================================================
// COLLECTION-SPECIFIC HOOK
// ============================================================================

/**
 * Convenience hook for collection operations
 */
export function useCollectionsStorage() {
    const {
        ready,
        isOnline,
        error,
        getCollection,
        getAllCollections,
        saveCollection,
        deleteCollection,
    } = useStorage()

    const [collections, setCollections] = useState<StorableCollection[]>([])
    const [loading, setLoading] = useState(true)

    // Load collections on mount
    useEffect(() => {
        if (!ready) return

        setLoading(true)
        getAllCollections()
            .then(setCollections)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [ready, getAllCollections])

    const createCollection = useCallback(
        async (data: { title: string; strandPaths: string[]; description?: string; icon?: string; color?: string; viewMode?: 'cards' | 'list' | 'grid'; pinned?: boolean; sortOrder?: number }) => {
            const collection = await saveCollection(data as Parameters<StorageManager['saveCollection']>[0])
            setCollections(prev => [...prev, collection])
            return collection
        },
        [saveCollection]
    )

    const updateCollection = useCallback(
        async (id: string, data: Partial<StorableCollection>) => {
            const existing = collections.find(c => c.id === id)
            if (!existing) throw new Error(`Collection ${id} not found`)

            const updated = await saveCollection({ ...existing, ...data })
            setCollections(prev => prev.map(c => (c.id === id ? updated : c)))
            return updated
        },
        [collections, saveCollection]
    )

    const removeCollection = useCallback(
        async (id: string) => {
            await deleteCollection(id)
            setCollections(prev => prev.filter(c => c.id !== id))
        },
        [deleteCollection]
    )

    return {
        ready,
        isOnline,
        error,
        loading,
        collections,
        getCollection,
        createCollection,
        updateCollection,
        removeCollection,
        reload: async () => {
            setLoading(true)
            const data = await getAllCollections()
            setCollections(data)
            setLoading(false)
        },
    }
}
