/**
 * Browser Cache Storage Adapter
 * @module lib/storage/adapters/BrowserCacheAdapter
 *
 * Fallback storage adapter using browser localStorage/sessionStorage.
 * Used when sql-storage-adapter is unavailable (static export, offline).
 *
 * Limitations:
 * - ~5-10MB storage limit per origin
 * - Synchronous API (but wrapped in async for interface compat)
 * - No indexing or advanced queries
 * - Data is browser-specific, not synced
 */

import type {
    StorageAdapter,
    StorableStrand,
    StorableCollection,
    StorableDraft,
    StorableBookmark,
    StorablePreferences,
    StorableEntity,
    EntitySyncStatus,
} from '../types'

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_PREFIX = 'quarry-storage'
const STRANDS_KEY = `${STORAGE_PREFIX}-strands`
const COLLECTIONS_KEY = `${STORAGE_PREFIX}-collections`
const DRAFTS_KEY = `${STORAGE_PREFIX}-drafts`
const BOOKMARKS_KEY = `${STORAGE_PREFIX}-bookmarks`
const PREFERENCES_KEY = `${STORAGE_PREFIX}-preferences`

// ============================================================================
// BROWSER CACHE ADAPTER
// ============================================================================

export class BrowserCacheAdapter implements StorageAdapter {
    readonly name = 'BrowserCache'
    readonly canWrite = true

    private storage: Storage

    constructor(useSessionStorage = false) {
        // Default to localStorage, but allow sessionStorage for testing
        this.storage = typeof window !== 'undefined'
            ? (useSessionStorage ? sessionStorage : localStorage)
            : ({} as Storage) // SSR fallback
    }

    // ==========================================================================
    // LIFECYCLE
    // ==========================================================================

    async initialize(): Promise<void> {
        console.log('[BrowserCacheAdapter] Initialized')
    }

    async close(): Promise<void> {
        // No cleanup needed for localStorage
    }

    // ==========================================================================
    // PRIVATE HELPERS
    // ==========================================================================

    private getItem<T>(key: string): T[] {
        try {
            const data = this.storage.getItem(key)
            return data ? JSON.parse(data) : []
        } catch (error) {
            console.warn(`[BrowserCacheAdapter] Failed to read ${key}:`, error)
            return []
        }
    }

    private setItem<T>(key: string, items: T[]): void {
        try {
            this.storage.setItem(key, JSON.stringify(items))
        } catch (error) {
            console.error(`[BrowserCacheAdapter] Failed to write ${key}:`, error)
            // localStorage might be full - try to handle gracefully
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                console.error('[BrowserCacheAdapter] Storage quota exceeded!')
            }
        }
    }

    // ==========================================================================
    // STRAND OPERATIONS
    // ==========================================================================

    async getStrand(path: string): Promise<StorableStrand | null> {
        const strands = this.getItem<StorableStrand>(STRANDS_KEY)
        return strands.find(s => s.path === path) || null
    }

    async getAllStrands(): Promise<StorableStrand[]> {
        return this.getItem<StorableStrand>(STRANDS_KEY)
    }

    async getStrandsByWeave(weave: string): Promise<StorableStrand[]> {
        const strands = this.getItem<StorableStrand>(STRANDS_KEY)
        return strands.filter(s => s.weave === weave)
    }

    async getStrandsByLoom(loom: string): Promise<StorableStrand[]> {
        const strands = this.getItem<StorableStrand>(STRANDS_KEY)
        return strands.filter(s => s.loom === loom)
    }

    async saveStrand(strand: StorableStrand): Promise<void> {
        const strands = this.getItem<StorableStrand>(STRANDS_KEY)
        const idx = strands.findIndex(s => s.path === strand.path)
        if (idx >= 0) {
            strands[idx] = strand
        } else {
            strands.push(strand)
        }
        this.setItem(STRANDS_KEY, strands)
    }

    async deleteStrand(path: string): Promise<void> {
        const strands = this.getItem<StorableStrand>(STRANDS_KEY)
        this.setItem(STRANDS_KEY, strands.filter(s => s.path !== path))
    }

    // ==========================================================================
    // COLLECTION OPERATIONS
    // ==========================================================================

    async getCollection(id: string): Promise<StorableCollection | null> {
        const collections = this.getItem<StorableCollection>(COLLECTIONS_KEY)
        return collections.find(c => c.id === id) || null
    }

    async getAllCollections(): Promise<StorableCollection[]> {
        return this.getItem<StorableCollection>(COLLECTIONS_KEY)
    }

    async saveCollection(collection: StorableCollection): Promise<void> {
        const collections = this.getItem<StorableCollection>(COLLECTIONS_KEY)
        const idx = collections.findIndex(c => c.id === collection.id)
        if (idx >= 0) {
            collections[idx] = collection
        } else {
            collections.push(collection)
        }
        this.setItem(COLLECTIONS_KEY, collections)
    }

    async deleteCollection(id: string): Promise<void> {
        const collections = this.getItem<StorableCollection>(COLLECTIONS_KEY)
        this.setItem(COLLECTIONS_KEY, collections.filter(c => c.id !== id))
    }

    // ==========================================================================
    // DRAFT OPERATIONS
    // ==========================================================================

    async getDraft(id: string): Promise<StorableDraft | null> {
        const drafts = this.getItem<StorableDraft>(DRAFTS_KEY)
        return drafts.find(d => d.id === id) || null
    }

    async getAllDrafts(): Promise<StorableDraft[]> {
        return this.getItem<StorableDraft>(DRAFTS_KEY)
    }

    async saveDraft(draft: StorableDraft): Promise<void> {
        const drafts = this.getItem<StorableDraft>(DRAFTS_KEY)
        const idx = drafts.findIndex(d => d.id === draft.id)
        if (idx >= 0) {
            drafts[idx] = draft
        } else {
            drafts.push(draft)
        }
        this.setItem(DRAFTS_KEY, drafts)
    }

    async deleteDraft(id: string): Promise<void> {
        const drafts = this.getItem<StorableDraft>(DRAFTS_KEY)
        this.setItem(DRAFTS_KEY, drafts.filter(d => d.id !== id))
    }

    // ==========================================================================
    // BOOKMARK OPERATIONS
    // ==========================================================================

    async getBookmark(strandPath: string): Promise<StorableBookmark | null> {
        const bookmarks = this.getItem<StorableBookmark>(BOOKMARKS_KEY)
        return bookmarks.find(b => b.strandPath === strandPath) || null
    }

    async getAllBookmarks(): Promise<StorableBookmark[]> {
        return this.getItem<StorableBookmark>(BOOKMARKS_KEY)
    }

    async saveBookmark(bookmark: StorableBookmark): Promise<void> {
        const bookmarks = this.getItem<StorableBookmark>(BOOKMARKS_KEY)
        const idx = bookmarks.findIndex(b => b.strandPath === bookmark.strandPath)
        if (idx >= 0) {
            bookmarks[idx] = bookmark
        } else {
            bookmarks.push(bookmark)
        }
        this.setItem(BOOKMARKS_KEY, bookmarks)
    }

    async deleteBookmark(strandPath: string): Promise<void> {
        const bookmarks = this.getItem<StorableBookmark>(BOOKMARKS_KEY)
        this.setItem(BOOKMARKS_KEY, bookmarks.filter(b => b.strandPath !== strandPath))
    }

    // ==========================================================================
    // PREFERENCES OPERATIONS
    // ==========================================================================

    async getPreferences(): Promise<StorablePreferences | null> {
        try {
            const data = this.storage.getItem(PREFERENCES_KEY)
            return data ? JSON.parse(data) : null
        } catch {
            return null
        }
    }

    async savePreferences(prefs: StorablePreferences): Promise<void> {
        try {
            this.storage.setItem(PREFERENCES_KEY, JSON.stringify(prefs))
        } catch (error) {
            console.error('[BrowserCacheAdapter] Failed to save preferences:', error)
        }
    }

    // ==========================================================================
    // BULK OPERATIONS
    // ==========================================================================

    async getPendingEntities(): Promise<StorableEntity[]> {
        const pending: StorableEntity[] = []

        // Check all entity types for pending sync status
        const strands = this.getItem<StorableStrand>(STRANDS_KEY)
        pending.push(...strands.filter(s => s.syncStatus === 'pending'))

        const collections = this.getItem<StorableCollection>(COLLECTIONS_KEY)
        pending.push(...collections.filter(c => c.syncStatus === 'pending'))

        const drafts = this.getItem<StorableDraft>(DRAFTS_KEY)
        pending.push(...drafts.filter(d => d.syncStatus === 'pending'))

        const bookmarks = this.getItem<StorableBookmark>(BOOKMARKS_KEY)
        pending.push(...bookmarks.filter(b => b.syncStatus === 'pending'))

        return pending
    }

    async updateSyncStatus(ids: string[], status: EntitySyncStatus): Promise<void> {
        const idSet = new Set(ids)

        // Update strands
        const strands = this.getItem<StorableStrand>(STRANDS_KEY)
        let strandsUpdated = false
        for (const strand of strands) {
            if (idSet.has(strand.id)) {
                strand.syncStatus = status
                strandsUpdated = true
            }
        }
        if (strandsUpdated) this.setItem(STRANDS_KEY, strands)

        // Update collections
        const collections = this.getItem<StorableCollection>(COLLECTIONS_KEY)
        let collectionsUpdated = false
        for (const collection of collections) {
            if (idSet.has(collection.id)) {
                collection.syncStatus = status
                collectionsUpdated = true
            }
        }
        if (collectionsUpdated) this.setItem(COLLECTIONS_KEY, collections)

        // Update drafts
        const drafts = this.getItem<StorableDraft>(DRAFTS_KEY)
        let draftsUpdated = false
        for (const draft of drafts) {
            if (idSet.has(draft.id)) {
                draft.syncStatus = status
                draftsUpdated = true
            }
        }
        if (draftsUpdated) this.setItem(DRAFTS_KEY, drafts)

        // Update bookmarks
        const bookmarks = this.getItem<StorableBookmark>(BOOKMARKS_KEY)
        let bookmarksUpdated = false
        for (const bookmark of bookmarks) {
            if (idSet.has(bookmark.id)) {
                bookmark.syncStatus = status
                bookmarksUpdated = true
            }
        }
        if (bookmarksUpdated) this.setItem(BOOKMARKS_KEY, bookmarks)
    }

    async clearAll(): Promise<void> {
        this.storage.removeItem(STRANDS_KEY)
        this.storage.removeItem(COLLECTIONS_KEY)
        this.storage.removeItem(DRAFTS_KEY)
        this.storage.removeItem(BOOKMARKS_KEY)
        this.storage.removeItem(PREFERENCES_KEY)
        console.log('[BrowserCacheAdapter] All data cleared')
    }
}
