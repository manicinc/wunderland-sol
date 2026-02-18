/**
 * useCollections Hook - Collection CRUD and management
 * @module lib/collections/useCollections
 *
 * Provides collection management with file-based persistence via API.
 * Collections are stored in public/data/collections.json via /api/collections.
 * Falls back to unified storage layer (sql-storage-adapter) when API unavailable.
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  CollectionMetadata,
  CollectionViewMode,
  CollectionConnection,
  CollectionStrandPosition,
} from '@/components/quarry/types'
import { getStorageManager, type StorageManager } from '@/lib/storage/StorageManager'
import { ensureFavoritesCollection, FAVORITES_COLLECTION_ID } from './index'

/** Collection state for the hook */
interface CollectionsState {
  collections: CollectionMetadata[]
  isLoading: boolean
  error: string | null
}

/** Cover pattern type */
export type CoverPatternType = 'geometric' | 'waves' | 'mesh' | 'circuits' | 'topography' | 'aurora' | 'crystalline' | 'constellation' | 'abstract' | 'hexagons'

/** Create collection input */
export interface CreateCollectionInput {
  title: string
  description?: string
  icon?: string
  color?: string
  strandPaths?: string[]
  viewMode?: CollectionViewMode
  /** Custom cover image URL */
  coverImage?: string
  /** Generated cover pattern type */
  coverPattern?: CoverPatternType
  /** Secondary color for cover gradient */
  coverSecondaryColor?: string
}

/** Update collection input */
export interface UpdateCollectionInput {
  title?: string
  description?: string
  icon?: string
  color?: string
  strandPaths?: string[]
  viewMode?: CollectionViewMode
  showDiscoveredConnections?: boolean
  pinned?: boolean
  sortOrder?: number
  /** Custom cover image URL */
  coverImage?: string
  /** Generated cover pattern type */
  coverPattern?: CoverPatternType
  /** Secondary color for cover gradient */
  coverSecondaryColor?: string
}

/** Return type for the hook */
export interface UseCollectionsReturn {
  // State
  collections: CollectionMetadata[]
  isLoading: boolean
  error: string | null

  // CRUD operations
  createCollection: (data: CreateCollectionInput) => Promise<CollectionMetadata>
  updateCollection: (id: string, data: UpdateCollectionInput) => Promise<void>
  deleteCollection: (id: string) => Promise<void>
  getCollection: (id: string) => CollectionMetadata | undefined

  // Strand operations
  addStrandToCollection: (collectionId: string, strandPath: string) => Promise<void>
  removeStrandFromCollection: (collectionId: string, strandPath: string) => Promise<void>
  moveStrand: (strandPath: string, fromCollectionId: string, toCollectionId: string) => Promise<void>

  // Bulk strand operations
  addStrandsToCollection: (collectionId: string, strandPaths: string[]) => Promise<void>
  removeStrandsFromCollection: (collectionId: string, strandPaths: string[]) => Promise<void>

  // Position operations
  updateStrandPosition: (collectionId: string, strandPath: string, position: CollectionStrandPosition) => Promise<void>
  updateStrandPositions: (collectionId: string, positions: Record<string, CollectionStrandPosition>) => Promise<void>

  // Connection operations
  addConnection: (collectionId: string, connection: Omit<CollectionConnection, 'discovered'>) => Promise<void>
  removeConnection: (collectionId: string, source: string, target: string) => Promise<void>

  // Pin operations
  togglePin: (id: string) => Promise<void>

  // Utility operations
  refreshCollections: () => Promise<void>
  duplicateCollection: (id: string, newTitle?: string) => Promise<CollectionMetadata>

  // Query helpers
  getCollectionsForStrand: (strandPath: string) => CollectionMetadata[]
  getPinnedCollections: () => CollectionMetadata[]
  getRecentCollections: (limit?: number) => CollectionMetadata[]

  // Favorites operations
  getFavoritesCollection: () => CollectionMetadata | undefined
  isFavorite: (strandPath: string) => boolean
  toggleFavorite: (strandPath: string) => Promise<void>
}

/** API base URL */
const API_URL = '/api/collections'

/**
 * In-memory cache for optimistic updates
 */
let collectionsCache: CollectionMetadata[] = []
let cacheInitialized = false

/**
 * Hook for managing collections
 */
export function useCollections(): UseCollectionsReturn {
  const [state, setState] = useState<CollectionsState>({
    collections: collectionsCache,
    isLoading: !cacheInitialized,
    error: null,
  })

  // Storage manager reference for fallback operations
  const storageRef = useRef<StorageManager | null>(null)

  // Initialize storage manager lazily
  const getStorage = useCallback(async (): Promise<StorageManager> => {
    if (!storageRef.current) {
      storageRef.current = getStorageManager()
      if (!storageRef.current.isInitialized()) {
        await storageRef.current.initialize()
      }
    }
    return storageRef.current
  }, [])

  /**
   * Load collections from API
   */
  const loadCollections = useCallback(async () => {
    if (cacheInitialized) {
      setState((prev) => ({ ...prev, collections: collectionsCache }))
      return
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch(API_URL)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json() as CollectionMetadata[]
      collectionsCache = data
      cacheInitialized = true

      setState({
        collections: data,
        isLoading: false,
        error: null,
      })

      // Ensure Favorites collection exists (creates if needed)
      ensureFavoritesCollection().then(() => {
        // Reload if favorites was just created
        fetch(API_URL).then(r => r.json()).then((refreshedData: CollectionMetadata[]) => {
          if (refreshedData.length !== data.length) {
            collectionsCache = refreshedData
            setState(prev => ({ ...prev, collections: refreshedData }))
          }
        }).catch(() => {
          // Ignore refresh errors
        })
      }).catch(() => {
        // Ignore ensure errors - app should work without favorites
      })
    } catch (err) {
      console.error('[Collections] API unavailable, using localStorage:', err)

      // Fallback to localStorage if API fails (e.g., static export)
      try {
        const stored = localStorage.getItem('quarry-collections')
        if (stored) {
          const parsed = JSON.parse(stored) as CollectionMetadata[]
          collectionsCache = parsed
          cacheInitialized = true
          setState({
            collections: parsed,
            isLoading: false,
            error: null,
          })
          return
        }
      } catch {
        // Ignore localStorage errors
      }

      // No API and no localStorage = valid empty state (first visit)
      collectionsCache = []
      cacheInitialized = true
      setState({
        collections: [],
        isLoading: false,
        error: null,
      })
    }
  }, [])

  /**
   * Sync to storage layer as fallback (for static builds)
   * Uses unified StorageManager with sql-storage-adapter
   */
  const syncToStorage = useCallback(async (collections: CollectionMetadata[]) => {
    try {
      const storage = await getStorage()
      // Save each collection to the storage layer
      for (const collection of collections) {
        await storage.saveCollection({
          id: collection.id,
          title: collection.title,
          description: collection.description,
          icon: collection.icon,
          color: collection.color,
          strandPaths: collection.strandPaths,
          viewMode: collection.viewMode,
          pinned: collection.pinned,
          sortOrder: collection.sortOrder,
        })
      }
    } catch (err) {
      console.warn('[Collections] Failed to sync to storage:', err)
      // Fallback to localStorage if storage layer fails
      try {
        localStorage.setItem('quarry-collections', JSON.stringify(collections))
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [getStorage])

  /**
   * Default color palette for new collections
   */
  const DEFAULT_COLORS = [
    '#8b5cf6', // Violet
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#f97316', // Orange
    '#14b8a6', // Teal
    '#ef4444', // Red
    '#84cc16', // Lime
    '#0ea5e9', // Sky
  ]

  /**
   * Create a new collection
   * Falls back to localStorage if API unavailable (static export mode)
   */
  const createCollection = useCallback(
    async (data: CreateCollectionInput): Promise<CollectionMetadata> => {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        // API available - use response
        if (response.ok) {
          const newCollection = await response.json() as CollectionMetadata
          collectionsCache = [...collectionsCache, newCollection]
          syncToStorage(collectionsCache)
          setState((prev) => ({ ...prev, collections: collectionsCache }))
          return newCollection
        }

        // API returned error but not 404/405 - throw
        if (response.status !== 404 && response.status !== 405) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create collection')
        }

        // Fall through to localStorage fallback
        throw new Error('API unavailable')
      } catch (err) {
        // Fallback to localStorage for static export mode
        console.warn('[Collections] API unavailable, using localStorage fallback')

        const now = new Date().toISOString()
        const newCollection: CollectionMetadata = {
          id: crypto.randomUUID(),
          title: data.title.trim(),
          description: data.description?.trim(),
          icon: data.icon,
          color: data.color || DEFAULT_COLORS[collectionsCache.length % DEFAULT_COLORS.length],
          strandPaths: data.strandPaths || [],
          viewMode: data.viewMode || 'cards',
          pinned: false,
          sortOrder: collectionsCache.length,
          createdAt: now,
          updatedAt: now,
        }

        collectionsCache = [...collectionsCache, newCollection]
        syncToStorage(collectionsCache)
        setState((prev) => ({ ...prev, collections: collectionsCache }))

        return newCollection
      }
    },
    [syncToStorage]
  )

  /**
   * Update an existing collection
   * Falls back to localStorage if API unavailable (static export mode)
   */
  const updateCollection = useCallback(
    async (id: string, data: UpdateCollectionInput): Promise<void> => {
      try {
        const response = await fetch(`${API_URL}?id=${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        // API available - use response
        if (response.ok) {
          const updated = await response.json() as CollectionMetadata
          collectionsCache = collectionsCache.map((c) => (c.id === id ? updated : c))
          syncToStorage(collectionsCache)
          setState((prev) => ({ ...prev, collections: collectionsCache }))
          return
        }

        // API returned error but not 404/405 - throw
        if (response.status !== 404 && response.status !== 405) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update collection')
        }

        // Fall through to localStorage fallback
        throw new Error('API unavailable')
      } catch (err) {
        // Fallback to localStorage for static export mode
        const existing = collectionsCache.find((c) => c.id === id)
        if (!existing) {
          throw new Error(`Collection ${id} not found`)
        }

        const updated: CollectionMetadata = {
          ...existing,
          ...(data.title !== undefined && { title: data.title.trim() }),
          ...(data.description !== undefined && { description: data.description?.trim() }),
          ...(data.icon !== undefined && { icon: data.icon }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.strandPaths !== undefined && { strandPaths: data.strandPaths }),
          ...(data.viewMode !== undefined && { viewMode: data.viewMode }),
          ...(data.pinned !== undefined && { pinned: data.pinned }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
          updatedAt: new Date().toISOString(),
        }

        collectionsCache = collectionsCache.map((c) => (c.id === id ? updated : c))
        syncToStorage(collectionsCache)
        setState((prev) => ({ ...prev, collections: collectionsCache }))
      }
    },
    [syncToStorage]
  )

  /**
   * Delete a collection
   * Falls back to localStorage if API unavailable (static export mode)
   */
  const deleteCollection = useCallback(
    async (id: string): Promise<void> => {
      try {
        const response = await fetch(`${API_URL}?id=${id}`, {
          method: 'DELETE',
        })

        // API available - use response
        if (response.ok) {
          collectionsCache = collectionsCache.filter((c) => c.id !== id)
          syncToStorage(collectionsCache)
          setState((prev) => ({ ...prev, collections: collectionsCache }))
          return
        }

        // API returned error but not 404/405 - throw
        if (response.status !== 404 && response.status !== 405) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to delete collection')
        }

        // Fall through to localStorage fallback
        throw new Error('API unavailable')
      } catch (err) {
        // Fallback to localStorage for static export mode
        collectionsCache = collectionsCache.filter((c) => c.id !== id)
        syncToStorage(collectionsCache)
        setState((prev) => ({ ...prev, collections: collectionsCache }))
      }
    },
    [syncToStorage]
  )

  /**
   * Get a collection by ID
   */
  const getCollection = useCallback(
    (id: string): CollectionMetadata | undefined => {
      return state.collections.find((c) => c.id === id)
    },
    [state.collections]
  )

  /**
   * Add a strand to a collection
   * Falls back to localStorage if API unavailable (static export mode)
   */
  const addStrandToCollection = useCallback(
    async (collectionId: string, strandPath: string): Promise<void> => {
      try {
        const response = await fetch(`${API_URL}?id=${collectionId}&action=add-strand`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ strandPath }),
        })

        // API available - use response
        if (response.ok) {
          const updated = await response.json() as CollectionMetadata
          collectionsCache = collectionsCache.map((c) => (c.id === collectionId ? updated : c))
          syncToStorage(collectionsCache)
          setState((prev) => ({ ...prev, collections: collectionsCache }))
          return
        }

        // API returned error but not 404/405 - throw
        if (response.status !== 404 && response.status !== 405) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to add strand')
        }

        // Fall through to localStorage fallback
        throw new Error('API unavailable')
      } catch (err) {
        // Fallback to localStorage for static export mode
        const collection = collectionsCache.find((c) => c.id === collectionId)
        if (!collection) {
          throw new Error(`Collection ${collectionId} not found`)
        }

        if (!collection.strandPaths.includes(strandPath)) {
          const updated: CollectionMetadata = {
            ...collection,
            strandPaths: [...collection.strandPaths, strandPath],
            updatedAt: new Date().toISOString(),
          }
          collectionsCache = collectionsCache.map((c) => (c.id === collectionId ? updated : c))
          syncToStorage(collectionsCache)
          setState((prev) => ({ ...prev, collections: collectionsCache }))
        }
      }
    },
    [syncToStorage]
  )

  /**
   * Remove a strand from a collection
   * Falls back to localStorage if API unavailable (static export mode)
   */
  const removeStrandFromCollection = useCallback(
    async (collectionId: string, strandPath: string): Promise<void> => {
      try {
        const response = await fetch(`${API_URL}?id=${collectionId}&action=remove-strand`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ strandPath }),
        })

        // API available - use response
        if (response.ok) {
          const updated = await response.json() as CollectionMetadata
          collectionsCache = collectionsCache.map((c) => (c.id === collectionId ? updated : c))
          syncToStorage(collectionsCache)
          setState((prev) => ({ ...prev, collections: collectionsCache }))
          return
        }

        // API returned error but not 404/405 - throw
        if (response.status !== 404 && response.status !== 405) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to remove strand')
        }

        // Fall through to localStorage fallback
        throw new Error('API unavailable')
      } catch (err) {
        // Fallback to localStorage for static export mode
        const collection = collectionsCache.find((c) => c.id === collectionId)
        if (!collection) {
          throw new Error(`Collection ${collectionId} not found`)
        }

        const updated: CollectionMetadata = {
          ...collection,
          strandPaths: collection.strandPaths.filter((p) => p !== strandPath),
          positions: collection.positions ?
            Object.fromEntries(Object.entries(collection.positions).filter(([k]) => k !== strandPath)) :
            undefined,
          updatedAt: new Date().toISOString(),
        }
        collectionsCache = collectionsCache.map((c) => (c.id === collectionId ? updated : c))
        syncToStorage(collectionsCache)
        setState((prev) => ({ ...prev, collections: collectionsCache }))
      }
    },
    [syncToStorage]
  )

  /**
   * Add multiple strands to a collection
   */
  const addStrandsToCollection = useCallback(
    async (collectionId: string, strandPaths: string[]): Promise<void> => {
      for (const strandPath of strandPaths) {
        await addStrandToCollection(collectionId, strandPath)
      }
    },
    [addStrandToCollection]
  )

  /**
   * Remove multiple strands from a collection
   */
  const removeStrandsFromCollection = useCallback(
    async (collectionId: string, strandPaths: string[]): Promise<void> => {
      for (const strandPath of strandPaths) {
        await removeStrandFromCollection(collectionId, strandPath)
      }
    },
    [removeStrandFromCollection]
  )

  /**
   * Move a strand from one collection to another
   */
  const moveStrand = useCallback(
    async (
      strandPath: string,
      fromCollectionId: string,
      toCollectionId: string
    ): Promise<void> => {
      await removeStrandFromCollection(fromCollectionId, strandPath)
      await addStrandToCollection(toCollectionId, strandPath)
    },
    [removeStrandFromCollection, addStrandToCollection]
  )

  /**
   * Update a strand's position in a collection
   */
  const updateStrandPosition = useCallback(
    async (
      collectionId: string,
      strandPath: string,
      position: CollectionStrandPosition
    ): Promise<void> => {
      try {
        const response = await fetch(`${API_URL}?id=${collectionId}&action=update-position`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ strandPath, position }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update position')
        }

        const updated = await response.json() as CollectionMetadata

        // Update cache
        collectionsCache = collectionsCache.map((c) => (c.id === collectionId ? updated : c))
        syncToStorage(collectionsCache)
        setState((prev) => ({ ...prev, collections: collectionsCache }))
      } catch (err) {
        console.error('[Collections] Failed to update position:', err)
        throw err
      }
    },
    [syncToStorage]
  )

  /**
   * Update multiple strand positions at once
   */
  const updateStrandPositions = useCallback(
    async (
      collectionId: string,
      positions: Record<string, CollectionStrandPosition>
    ): Promise<void> => {
      try {
        const response = await fetch(`${API_URL}?id=${collectionId}&action=update-positions`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ positions }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update positions')
        }

        const updated = await response.json() as CollectionMetadata

        // Update cache
        collectionsCache = collectionsCache.map((c) => (c.id === collectionId ? updated : c))
        syncToStorage(collectionsCache)
        setState((prev) => ({ ...prev, collections: collectionsCache }))
      } catch (err) {
        console.error('[Collections] Failed to update positions:', err)
        throw err
      }
    },
    [syncToStorage]
  )

  /**
   * Add a connection between strands in a collection
   */
  const addConnection = useCallback(
    async (
      collectionId: string,
      connection: Omit<CollectionConnection, 'discovered'>
    ): Promise<void> => {
      const collection = state.collections.find((c) => c.id === collectionId)
      if (!collection) return

      const newConnections = [
        ...(collection.connections || []),
        { ...connection, discovered: false },
      ]

      await updateCollection(collectionId, {
        ...collection,
        connections: newConnections,
      } as UpdateCollectionInput)
    },
    [state.collections, updateCollection]
  )

  /**
   * Remove a connection between strands
   */
  const removeConnection = useCallback(
    async (
      collectionId: string,
      source: string,
      target: string
    ): Promise<void> => {
      const collection = state.collections.find((c) => c.id === collectionId)
      if (!collection || !collection.connections) return

      const newConnections = collection.connections.filter(
        (conn) => !(conn.source === source && conn.target === target)
      )

      await updateCollection(collectionId, {
        ...collection,
        connections: newConnections,
      } as UpdateCollectionInput)
    },
    [state.collections, updateCollection]
  )

  /**
   * Toggle pin status
   * Falls back to localStorage if API unavailable (static export mode)
   */
  const togglePin = useCallback(
    async (id: string): Promise<void> => {
      try {
        const response = await fetch(`${API_URL}?id=${id}&action=toggle-pin`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        // API available - use response
        if (response.ok) {
          const updated = await response.json() as CollectionMetadata
          collectionsCache = collectionsCache.map((c) => (c.id === id ? updated : c))
          syncToStorage(collectionsCache)
          setState((prev) => ({ ...prev, collections: collectionsCache }))
          return
        }

        // API returned error but not 404/405 - throw
        if (response.status !== 404 && response.status !== 405) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to toggle pin')
        }

        // Fall through to localStorage fallback
        throw new Error('API unavailable')
      } catch (err) {
        // Fallback to localStorage for static export mode
        const collection = collectionsCache.find((c) => c.id === id)
        if (!collection) {
          throw new Error(`Collection ${id} not found`)
        }

        const updated: CollectionMetadata = {
          ...collection,
          pinned: !collection.pinned,
          updatedAt: new Date().toISOString(),
        }
        collectionsCache = collectionsCache.map((c) => (c.id === id ? updated : c))
        syncToStorage(collectionsCache)
        setState((prev) => ({ ...prev, collections: collectionsCache }))
      }
    },
    [syncToStorage]
  )

  /**
   * Refresh collections from storage
   */
  const refreshCollections = useCallback(async (): Promise<void> => {
    cacheInitialized = false
    await loadCollections()
  }, [loadCollections])

  /**
   * Duplicate a collection
   */
  const duplicateCollection = useCallback(
    async (id: string, newTitle?: string): Promise<CollectionMetadata> => {
      const original = state.collections.find((c) => c.id === id)
      if (!original) {
        throw new Error(`Collection ${id} not found`)
      }

      return createCollection({
        title: newTitle || `${original.title} (Copy)`,
        description: original.description,
        icon: original.icon,
        color: original.color,
        strandPaths: [...original.strandPaths],
        viewMode: original.viewMode,
      })
    },
    [state.collections, createCollection]
  )

  /**
   * Get all collections containing a specific strand
   */
  const getCollectionsForStrand = useCallback(
    (strandPath: string): CollectionMetadata[] => {
      return state.collections.filter((c) => c.strandPaths.includes(strandPath))
    },
    [state.collections]
  )

  /**
   * Get pinned collections
   */
  const getPinnedCollections = useCallback((): CollectionMetadata[] => {
    return state.collections.filter((c) => c.pinned)
  }, [state.collections])

  /**
   * Get recently updated collections
   */
  const getRecentCollections = useCallback(
    (limit = 5): CollectionMetadata[] => {
      return [...state.collections]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, limit)
    },
    [state.collections]
  )

  // ==========================================================================
  // Favorites Operations
  // ==========================================================================

  /**
   * Get the Favorites collection
   */
  const getFavoritesCollection = useCallback((): CollectionMetadata | undefined => {
    return state.collections.find((c) => c.id === FAVORITES_COLLECTION_ID)
  }, [state.collections])

  /**
   * Check if a strand is in the Favorites collection
   */
  const isFavorite = useCallback(
    (strandPath: string): boolean => {
      const favorites = state.collections.find((c) => c.id === FAVORITES_COLLECTION_ID)
      return favorites?.strandPaths.includes(strandPath) ?? false
    },
    [state.collections]
  )

  /**
   * Toggle a strand's favorite status
   */
  const toggleFavorite = useCallback(
    async (strandPath: string): Promise<void> => {
      const favorites = state.collections.find((c) => c.id === FAVORITES_COLLECTION_ID)
      if (!favorites) {
        // Favorites collection doesn't exist yet - try to ensure it
        await ensureFavoritesCollection()
        await refreshCollections()
        // Re-check after refresh
        const refreshedFavorites = collectionsCache.find((c) => c.id === FAVORITES_COLLECTION_ID)
        if (!refreshedFavorites) {
          console.warn('[Collections] Cannot toggle favorite - Favorites collection unavailable')
          return
        }
        // Add the strand
        await addStrandToCollection(FAVORITES_COLLECTION_ID, strandPath)
        return
      }

      if (favorites.strandPaths.includes(strandPath)) {
        // Remove from favorites
        await removeStrandFromCollection(FAVORITES_COLLECTION_ID, strandPath)
      } else {
        // Add to favorites
        await addStrandToCollection(FAVORITES_COLLECTION_ID, strandPath)
      }
    },
    [state.collections, addStrandToCollection, removeStrandFromCollection, refreshCollections]
  )

  // Load collections on mount
  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  return {
    // State
    collections: state.collections,
    isLoading: state.isLoading,
    error: state.error,

    // CRUD operations
    createCollection,
    updateCollection,
    deleteCollection,
    getCollection,

    // Strand operations
    addStrandToCollection,
    removeStrandFromCollection,
    moveStrand,
    addStrandsToCollection,
    removeStrandsFromCollection,

    // Position operations
    updateStrandPosition,
    updateStrandPositions,

    // Connection operations
    addConnection,
    removeConnection,

    // Pin operations
    togglePin,

    // Utility operations
    refreshCollections,
    duplicateCollection,

    // Query helpers
    getCollectionsForStrand,
    getPinnedCollections,
    getRecentCollections,

    // Favorites operations
    getFavoritesCollection,
    isFavorite,
    toggleFavorite,
  }
}

export default useCollections
