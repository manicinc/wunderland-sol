/**
 * Storage Manager
 * @module lib/storage/StorageManager
 *
 * High-level orchestrator for all storage operations.
 * Manages multiple storage adapters with fallback and sync capabilities.
 *
 * Features:
 * - Primary adapter with fallback chain
 * - Automatic adapter selection based on environment
 * - Sync queue for offline-first operations
 * - Event system for UI updates
 * - Content hashing for conflict detection
 */

import { LocalStorageAdapter } from './adapters/LocalStorageAdapter'
import { BrowserCacheAdapter } from './adapters/BrowserCacheAdapter'
import { GitHubStorageAdapter } from './adapters/GitHubStorageAdapter'
import type {
    StorageAdapter,
    StorableStrand,
    StorableCollection,
    StorableDraft,
    StorableBookmark,
    StorablePreferences,
    StorableBlockTagsCache,
    StorableEntity,
    EntitySyncStatus,
    StorageSyncResult,
    PendingChange,
    StorageEvent,
    StorageEventListener,
    StorageEventType,
    LocalStorageConfig,
    GitHubRepoConfig,
} from './types'

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Storage configuration
 */
export interface StorageManagerConfig {
    /** Local storage configuration */
    local?: LocalStorageConfig
    /** GitHub configuration (optional) */
    github?: GitHubRepoConfig
    /** Whether to auto-sync on changes */
    autoSync?: boolean
    /** Sync interval in ms (default: 30000) */
    syncInterval?: number
    /** Conflict resolution strategy */
    conflictStrategy?: 'local-wins' | 'remote-wins' | 'manual'
}

// ============================================================================
// STORAGE MANAGER
// ============================================================================

export class StorageManager {
    private local: LocalStorageAdapter
    private cache: BrowserCacheAdapter
    private github: StorageAdapter | null = null

    private config: StorageManagerConfig
    private initialized = false
    private pendingChanges: Map<string, PendingChange> = new Map()
    private listeners: Set<StorageEventListener> = new Set()
    private syncTimer: ReturnType<typeof setInterval> | null = null
    private isOnline = true

    constructor(config: StorageManagerConfig = {}) {
        this.config = {
            autoSync: config.autoSync ?? false,
            syncInterval: config.syncInterval ?? 30000,
            conflictStrategy: config.conflictStrategy ?? 'local-wins',
            ...config,
        }

        this.local = new LocalStorageAdapter(config.local)
        this.cache = new BrowserCacheAdapter()
    }

    // ==========================================================================
    // LIFECYCLE
    // ==========================================================================

    async initialize(): Promise<void> {
        if (this.initialized) return

        try {
            // Try local first (uses sql-storage-adapter)
            await this.local.initialize()
            console.log('[StorageManager] Local adapter initialized')
        } catch (error) {
            console.warn('[StorageManager] Local adapter failed, falling back to cache:', error)
            // Cache adapter doesn't need initialization but we call it for consistency
            await this.cache.initialize()
        }

        // Set up online/offline listeners
        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.handleOnline)
            window.addEventListener('offline', this.handleOffline)
            this.isOnline = navigator.onLine
        }

        // Initialize GitHub adapter if configured
        if (this.config.github) {
            try {
                this.github = new GitHubStorageAdapter(this.config.github)
                await this.github.initialize()
                console.log('[StorageManager] GitHub adapter initialized')
            } catch (error) {
                console.warn('[StorageManager] GitHub adapter failed to initialize:', error)
                this.github = null
            }
        }

        // Start sync timer if auto-sync enabled
        if (this.config.autoSync && this.config.syncInterval) {
            this.syncTimer = setInterval(() => this.sync(), this.config.syncInterval)
        }

        this.initialized = true
        this.emit('initialized')
    }

    async close(): Promise<void> {
        if (this.syncTimer) {
            clearInterval(this.syncTimer)
            this.syncTimer = null
        }

        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleOnline)
            window.removeEventListener('offline', this.handleOffline)
        }

        await this.local.close()
        this.initialized = false
    }

    private handleOnline = () => {
        this.isOnline = true
        this.emit('online')
        // Trigger sync when coming back online
        if (this.config.autoSync) {
            this.sync()
        }
    }

    private handleOffline = () => {
        this.isOnline = false
        this.emit('offline')
    }

    // ==========================================================================
    // GITHUB CONFIGURATION
    // ==========================================================================

    /**
     * Configure GitHub adapter at runtime
     * Used when user adds their PAT after app is loaded
     */
    async configureGitHub(config: GitHubRepoConfig): Promise<boolean> {
        try {
            // Close existing GitHub adapter if any
            if (this.github) {
                await this.github.close()
            }

            // Create and initialize new adapter
            this.github = new GitHubStorageAdapter(config)
            await this.github.initialize()

            // Update config
            this.config.github = config

            // Save config to preferences
            await this.savePreferences({
                custom: {
                    githubConfig: {
                        owner: config.owner,
                        repo: config.repo,
                        branch: config.branch,
                        basePath: config.basePath,
                        // PAT is stored securely, not in preferences
                    }
                }
            })

            console.log('[StorageManager] GitHub adapter configured:', config.owner + '/' + config.repo)
            this.emit('github-configured', { owner: config.owner, repo: config.repo })

            return true
        } catch (error) {
            console.error('[StorageManager] Failed to configure GitHub:', error)
            this.github = null
            return false
        }
    }

    /**
     * Disconnect GitHub adapter
     */
    async disconnectGitHub(): Promise<void> {
        if (this.github) {
            await this.github.close()
            this.github = null
            this.config.github = undefined

            console.log('[StorageManager] GitHub adapter disconnected')
            this.emit('github-disconnected')
        }
    }

    /**
     * Check if GitHub is configured and available
     */
    hasGitHub(): boolean {
        return this.github !== null
    }

    /**
     * Check if GitHub can write (has PAT)
     */
    canWriteToGitHub(): boolean {
        return this.github instanceof GitHubStorageAdapter && this.github.canWrite
    }

    /**
     * Get current GitHub config (without PAT for security)
     */
    getGitHubConfig(): Omit<GitHubRepoConfig, 'pat'> | null {
        if (!this.config.github) return null
        const { pat, ...rest } = this.config.github
        return rest
    }

    // ==========================================================================
    // EVENT SYSTEM
    // ==========================================================================

    on(listener: StorageEventListener): () => void {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    private emit(type: StorageEventType, data?: unknown): void {
        const event: StorageEvent = {
            type,
            timestamp: new Date().toISOString(),
            data,
        }
        for (const listener of Array.from(this.listeners)) {
            try {
                listener(event)
            } catch (error) {
                console.error('[StorageManager] Event listener error:', error)
            }
        }
    }

    // ==========================================================================
    // ADAPTER SELECTION
    // ==========================================================================

    private getAdapter(): StorageAdapter {
        // Always try local first (it has fallback to browser cache internally)
        return this.local
    }

    private getFallbackAdapter(): StorageAdapter {
        return this.cache
    }

    // ==========================================================================
    // STRAND OPERATIONS
    // ==========================================================================

    async getStrand(path: string): Promise<StorableStrand | null> {
        try {
            const strand = await this.getAdapter().getStrand(path)
            if (strand) return strand
        } catch (error) {
            console.warn('[StorageManager] Primary adapter failed for getStrand:', error)
        }

        // Fallback to cache
        return this.getFallbackAdapter().getStrand(path)
    }

    async getAllStrands(): Promise<StorableStrand[]> {
        try {
            return await this.getAdapter().getAllStrands()
        } catch (error) {
            console.warn('[StorageManager] Primary adapter failed for getAllStrands:', error)
            return this.getFallbackAdapter().getAllStrands()
        }
    }

    async getStrandsByWeave(weave: string): Promise<StorableStrand[]> {
        try {
            return await this.getAdapter().getStrandsByWeave(weave)
        } catch (error) {
            console.warn('[StorageManager] Primary adapter failed for getStrandsByWeave:', error)
            return this.getFallbackAdapter().getStrandsByWeave(weave)
        }
    }

    async saveStrand(strand: Pick<StorableStrand, 'path' | 'slug' | 'title' | 'content' | 'frontmatter' | 'weave'> & Partial<Pick<StorableStrand, 'id' | 'loom' | 'wordCount' | 'summary' | 'githubUrl' | 'githubSha' | 'version' | 'contentHash' | 'createdAt'>>): Promise<StorableStrand> {
        const now = new Date().toISOString()
        const fullStrand: StorableStrand = {
            type: 'strand',
            id: strand.id || crypto.randomUUID(),
            path: strand.path,
            slug: strand.slug,
            title: strand.title,
            content: strand.content,
            frontmatter: strand.frontmatter,
            weave: strand.weave,
            loom: strand.loom,
            wordCount: strand.wordCount,
            summary: strand.summary,
            githubUrl: strand.githubUrl,
            githubSha: strand.githubSha,
            syncStatus: 'pending',
            contentHash: this.hash(strand.content),
            version: (strand.version ?? 0) + 1,
            createdAt: strand.createdAt ?? now,
            updatedAt: now,
        }

        await this.getAdapter().saveStrand(fullStrand)

        // Also save to cache for redundancy
        try {
            await this.cache.saveStrand(fullStrand)
        } catch {
            // Cache failure is not critical
        }

        // Invalidate block tags cache for this strand (content changed)
        this.invalidateBlockTagsCache(fullStrand.path).catch(() => {
            // Cache invalidation failure is not critical
        })

        this.queueChange('strand', fullStrand.id, fullStrand.createdAt === now ? 'create' : 'update')
        this.emit('entity-saved', { type: 'strand', id: fullStrand.id })

        return fullStrand
    }

    async deleteStrand(path: string): Promise<void> {
        const strand = await this.getStrand(path)

        await this.getAdapter().deleteStrand(path)
        try {
            await this.cache.deleteStrand(path)
        } catch {
            // Cache failure is not critical
        }

        // Invalidate block tags cache for this strand
        this.invalidateBlockTagsCache(path).catch(() => {
            // Cache invalidation failure is not critical
        })

        if (strand) {
            this.queueChange('strand', strand.id, 'delete')
            this.emit('entity-deleted', { type: 'strand', id: strand.id })
        }
    }

    // ==========================================================================
    // COLLECTION OPERATIONS
    // ==========================================================================

    async getCollection(id: string): Promise<StorableCollection | null> {
        try {
            const collection = await this.getAdapter().getCollection(id)
            if (collection) return collection
        } catch (error) {
            console.warn('[StorageManager] Primary adapter failed for getCollection:', error)
        }

        return this.getFallbackAdapter().getCollection(id)
    }

    async getAllCollections(): Promise<StorableCollection[]> {
        try {
            return await this.getAdapter().getAllCollections()
        } catch (error) {
            console.warn('[StorageManager] Primary adapter failed for getAllCollections:', error)
            return this.getFallbackAdapter().getAllCollections()
        }
    }

    async saveCollection(collection: Pick<StorableCollection, 'title' | 'strandPaths'> & Partial<Pick<StorableCollection, 'id' | 'description' | 'icon' | 'color' | 'viewMode' | 'pinned' | 'sortOrder' | 'positions' | 'version' | 'contentHash' | 'createdAt'>>): Promise<StorableCollection> {
        const now = new Date().toISOString()
        const isNew = !collection.id || !(await this.getCollection(collection.id))

        const fullCollection: StorableCollection = {
            type: 'collection',
            id: collection.id || crypto.randomUUID(),
            title: collection.title,
            description: collection.description,
            icon: collection.icon,
            color: collection.color,
            strandPaths: collection.strandPaths,
            viewMode: collection.viewMode,
            pinned: collection.pinned,
            sortOrder: collection.sortOrder,
            positions: collection.positions,
            syncStatus: 'pending',
            contentHash: this.hash(JSON.stringify(collection.strandPaths)),
            version: (collection.version ?? 0) + 1,
            createdAt: collection.createdAt ?? now,
            updatedAt: now,
        }

        await this.getAdapter().saveCollection(fullCollection)

        try {
            await this.cache.saveCollection(fullCollection)
        } catch {
            // Cache failure is not critical
        }

        this.queueChange('collection', fullCollection.id, isNew ? 'create' : 'update')
        this.emit('entity-saved', { type: 'collection', id: fullCollection.id })

        return fullCollection
    }

    async deleteCollection(id: string): Promise<void> {
        await this.getAdapter().deleteCollection(id)
        try {
            await this.cache.deleteCollection(id)
        } catch {
            // Cache failure is not critical
        }

        this.queueChange('collection', id, 'delete')
        this.emit('entity-deleted', { type: 'collection', id })
    }

    // ==========================================================================
    // DRAFT OPERATIONS
    // ==========================================================================

    async getDraft(id: string): Promise<StorableDraft | null> {
        try {
            const draft = await this.getAdapter().getDraft(id)
            if (draft) return draft
        } catch (error) {
            console.warn('[StorageManager] Primary adapter failed for getDraft:', error)
        }

        return this.getFallbackAdapter().getDraft(id)
    }

    async getAllDrafts(): Promise<StorableDraft[]> {
        try {
            return await this.getAdapter().getAllDrafts()
        } catch (error) {
            console.warn('[StorageManager] Primary adapter failed for getAllDrafts:', error)
            return this.getFallbackAdapter().getAllDrafts()
        }
    }

    async saveDraft(draft: Pick<StorableDraft, 'title' | 'content' | 'frontmatter' | 'isNew'> & Partial<Pick<StorableDraft, 'id' | 'strandPath' | 'targetWeave' | 'targetLoom' | 'parentVersion' | 'lastAutoSave' | 'version' | 'contentHash' | 'createdAt'>>): Promise<StorableDraft> {
        const now = new Date().toISOString()

        const fullDraft: StorableDraft = {
            type: 'draft',
            id: draft.id || crypto.randomUUID(),
            strandPath: draft.strandPath,
            title: draft.title,
            content: draft.content,
            frontmatter: draft.frontmatter,
            isNew: draft.isNew,
            targetWeave: draft.targetWeave,
            targetLoom: draft.targetLoom,
            parentVersion: draft.parentVersion,
            lastAutoSave: now,
            syncStatus: 'local-only', // Drafts are always local-only until published
            contentHash: this.hash(draft.content),
            version: (draft.version ?? 0) + 1,
            createdAt: draft.createdAt ?? now,
            updatedAt: now,
        }

        await this.getAdapter().saveDraft(fullDraft)

        try {
            await this.cache.saveDraft(fullDraft)
        } catch {
            // Cache failure is not critical
        }

        this.emit('entity-saved', { type: 'draft', id: fullDraft.id })

        return fullDraft
    }

    async deleteDraft(id: string): Promise<void> {
        await this.getAdapter().deleteDraft(id)
        try {
            await this.cache.deleteDraft(id)
        } catch {
            // Cache failure is not critical
        }

        this.emit('entity-deleted', { type: 'draft', id })
    }

    /**
     * Publish a draft as a strand
     */
    async publishDraft(draftId: string): Promise<StorableStrand> {
        const draft = await this.getDraft(draftId)
        if (!draft) {
            throw new Error(`Draft ${draftId} not found`)
        }

        // Convert draft to strand
        const strandPath = draft.strandPath || this.generatePath(draft)
        const strand = await this.saveStrand({
            path: strandPath,
            slug: this.generateSlug(draft.title),
            title: draft.title,
            content: draft.content,
            frontmatter: draft.frontmatter,
            weave: draft.targetWeave || this.extractWeaveFromPath(strandPath),
            loom: draft.targetLoom,
            wordCount: this.countWords(draft.content),
        })

        // Delete the draft
        await this.deleteDraft(draftId)

        return strand
    }

    // ==========================================================================
    // BOOKMARK OPERATIONS
    // ==========================================================================

    async getBookmark(strandPath: string): Promise<StorableBookmark | null> {
        try {
            return await this.getAdapter().getBookmark(strandPath)
        } catch (error) {
            console.warn('[StorageManager] Primary adapter failed for getBookmark:', error)
            return this.getFallbackAdapter().getBookmark(strandPath)
        }
    }

    async getAllBookmarks(): Promise<StorableBookmark[]> {
        try {
            return await this.getAdapter().getAllBookmarks()
        } catch (error) {
            console.warn('[StorageManager] Primary adapter failed for getAllBookmarks:', error)
            return this.getFallbackAdapter().getAllBookmarks()
        }
    }

    async saveBookmark(bookmark: Pick<StorableBookmark, 'strandPath'> & Partial<Pick<StorableBookmark, 'id' | 'note' | 'tags' | 'scrollPosition' | 'version' | 'contentHash' | 'createdAt'>>): Promise<StorableBookmark> {
        const now = new Date().toISOString()

        const fullBookmark: StorableBookmark = {
            type: 'bookmark',
            id: bookmark.id || crypto.randomUUID(),
            strandPath: bookmark.strandPath,
            note: bookmark.note,
            tags: bookmark.tags,
            scrollPosition: bookmark.scrollPosition,
            syncStatus: 'pending',
            contentHash: this.hash(bookmark.strandPath + (bookmark.note || '')),
            version: (bookmark.version ?? 0) + 1,
            createdAt: bookmark.createdAt ?? now,
            updatedAt: now,
        }

        await this.getAdapter().saveBookmark(fullBookmark)

        try {
            await this.cache.saveBookmark(fullBookmark)
        } catch {
            // Cache failure is not critical
        }

        this.queueChange('bookmark', fullBookmark.id, 'update')
        this.emit('entity-saved', { type: 'bookmark', id: fullBookmark.id })

        return fullBookmark
    }

    async deleteBookmark(strandPath: string): Promise<void> {
        const bookmark = await this.getBookmark(strandPath)

        await this.getAdapter().deleteBookmark(strandPath)
        try {
            await this.cache.deleteBookmark(strandPath)
        } catch {
            // Cache failure is not critical
        }

        if (bookmark) {
            this.queueChange('bookmark', bookmark.id, 'delete')
            this.emit('entity-deleted', { type: 'bookmark', id: bookmark.id })
        }
    }

    // ==========================================================================
    // PREFERENCES OPERATIONS
    // ==========================================================================

    async getPreferences(): Promise<StorablePreferences | null> {
        try {
            return await this.getAdapter().getPreferences()
        } catch (error) {
            console.warn('[StorageManager] Primary adapter failed for getPreferences:', error)
            return this.getFallbackAdapter().getPreferences()
        }
    }

    async savePreferences(prefs: Partial<Omit<StorablePreferences, 'type' | 'id' | 'syncStatus' | 'createdAt' | 'updatedAt'>>): Promise<StorablePreferences> {
        const now = new Date().toISOString()
        const existing = await this.getPreferences()

        const fullPrefs: StorablePreferences = {
            type: 'preferences',
            id: 'user-preferences',
            theme: prefs.theme ?? existing?.theme,
            sidebarCollapsed: prefs.sidebarCollapsed ?? existing?.sidebarCollapsed,
            rightPanelCollapsed: prefs.rightPanelCollapsed ?? existing?.rightPanelCollapsed,
            fontSize: prefs.fontSize ?? existing?.fontSize,
            lastStrandPath: prefs.lastStrandPath ?? existing?.lastStrandPath,
            recentStrands: prefs.recentStrands ?? existing?.recentStrands,
            custom: { ...existing?.custom, ...prefs.custom },
            syncStatus: 'pending',
            contentHash: this.hash(JSON.stringify(prefs)),
            version: (existing?.version ?? 0) + 1,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        }

        await this.getAdapter().savePreferences(fullPrefs)

        try {
            await this.cache.savePreferences(fullPrefs)
        } catch {
            // Cache failure is not critical
        }

        this.queueChange('preferences', fullPrefs.id, 'update')
        this.emit('entity-saved', { type: 'preferences', id: fullPrefs.id })

        return fullPrefs
    }

    // ==========================================================================
    // BLOCK TAGS CACHE OPERATIONS
    // ==========================================================================

    /**
     * Get cached block tags for a strand
     * Returns null if cache is expired or doesn't exist
     */
    async getBlockTagsCache(strandPath: string): Promise<StorableBlockTagsCache | null> {
        try {
            return await this.local.getBlockTagsCache(strandPath)
        } catch (error) {
            console.warn('[StorageManager] Failed to get block tags cache:', error)
            return null
        }
    }

    /**
     * Save block tags cache for a strand
     */
    async saveBlockTagsCache(strandPath: string, blocks: StorableBlockTagsCache['blocks'], contentHash: string, ttlHours: number = 24): Promise<StorableBlockTagsCache> {
        const now = new Date()
        const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000)

        const cache: StorableBlockTagsCache = {
            type: 'block-tags-cache',
            id: `btc-${strandPath.replace(/\//g, '-')}`,
            strandPath,
            blocks,
            strandContentHash: contentHash,
            expiresAt: expiresAt.toISOString(),
            syncStatus: 'local-only',
            contentHash: this.hash(JSON.stringify(blocks)),
            version: 1,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        }

        await this.local.saveBlockTagsCache(cache)
        console.log(`[StorageManager] Cached ${blocks.length} block tags for ${strandPath}`)

        return cache
    }

    /**
     * Invalidate block tags cache for a strand
     * Call this after publishing/editing a strand
     */
    async invalidateBlockTagsCache(strandPath: string): Promise<void> {
        try {
            await this.local.deleteBlockTagsCache(strandPath)
            console.log(`[StorageManager] Invalidated block tags cache for ${strandPath}`)
        } catch (error) {
            console.warn('[StorageManager] Failed to invalidate block tags cache:', error)
        }
    }

    /**
     * Clear all expired block tags caches
     */
    async clearExpiredBlockTagsCaches(): Promise<number> {
        try {
            const count = await this.local.clearExpiredBlockTagsCache()
            if (count > 0) {
                console.log(`[StorageManager] Cleared ${count} expired block tags caches`)
            }
            return count
        } catch (error) {
            console.warn('[StorageManager] Failed to clear expired block tags caches:', error)
            return 0
        }
    }

    // ==========================================================================
    // SYNC OPERATIONS
    // ==========================================================================

    private queueChange(
        entityType: PendingChange['entityType'],
        entityId: string,
        action: PendingChange['action']
    ): void {
        const key = `${entityType}:${entityId}`
        this.pendingChanges.set(key, {
            entityType,
            entityId,
            action,
            timestamp: new Date().toISOString(),
            retryCount: 0,
        })
    }

    async getPendingCount(): Promise<number> {
        return this.pendingChanges.size
    }

    async sync(): Promise<StorageSyncResult> {
        const start = Date.now()
        const result: StorageSyncResult = {
            success: true,
            pushed: 0,
            pulled: 0,
            conflicts: 0,
            errors: [],
            duration: 0,
        }

        if (!this.isOnline) {
            result.success = false
            result.errors.push('Offline')
            result.duration = Date.now() - start
            return result
        }

        if (!this.github) {
            // No remote configured, just clear pending queue
            result.success = true
            result.duration = Date.now() - start
            return result
        }

        this.emit('sync-started')

        try {
            // TODO: Implement full sync with GitHub adapter
            // For now, just mark all pending as synced
            const pendingEntities = await this.getAdapter().getPendingEntities()
            const ids = pendingEntities.map(e => e.id)

            if (ids.length > 0) {
                await this.getAdapter().updateSyncStatus(ids, 'synced')
                result.pushed = ids.length
            }

            this.pendingChanges.clear()
            this.emit('sync-completed', result)
        } catch (error) {
            result.success = false
            result.errors.push(error instanceof Error ? error.message : 'Unknown error')
            this.emit('sync-failed', result)
        }

        result.duration = Date.now() - start
        return result
    }

    // ==========================================================================
    // UTILITY METHODS
    // ==========================================================================

    private hash(content: string): string {
        // Simple hash for content comparison
        // In production, use crypto.subtle.digest for SHA-256
        let hash = 0
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16)
    }

    private generatePath(draft: StorableDraft): string {
        const weave = draft.targetWeave || 'notes'
        const loom = draft.targetLoom
        const slug = this.generateSlug(draft.title)

        if (loom) {
            return `${weave}/${loom}/${slug}`
        }
        return `${weave}/${slug}`
    }

    private generateSlug(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 60)
    }

    private extractWeaveFromPath(path: string): string {
        const parts = path.split('/')
        return parts[0] || 'notes'
    }

    private countWords(content: string): number {
        return content
            .replace(/[#*`_\[\]()>-]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0)
            .length
    }

    // ==========================================================================
    // STATUS
    // ==========================================================================

    isInitialized(): boolean {
        return this.initialized
    }

    isOnlineStatus(): boolean {
        return this.isOnline
    }

    getConfig(): StorageManagerConfig {
        return { ...this.config }
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let _instance: StorageManager | null = null

/**
 * Get or create the storage manager singleton
 */
export function getStorageManager(config?: StorageManagerConfig): StorageManager {
    if (!_instance) {
        _instance = new StorageManager(config)
    }
    return _instance
}

/**
 * Reset the storage manager singleton (for testing)
 */
export function resetStorageManager(): void {
    if (_instance) {
        _instance.close()
        _instance = null
    }
}
