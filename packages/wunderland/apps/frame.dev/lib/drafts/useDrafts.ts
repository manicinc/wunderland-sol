/**
 * useDrafts Hook - Draft management with StorageManager
 * @module lib/drafts/useDrafts
 *
 * Provides draft management using the unified storage layer.
 * Compatible with StrandEditor's existing draft API.
 *
 * @example
 * ```tsx
 * const { saveDraft, getDraft, deleteDraft, drafts } = useDrafts()
 *
 * // Save a draft
 * await saveDraft(path, content, originalContent, { title })
 *
 * // Check for existing draft
 * const status = await checkDraftStatus(path, currentContent)
 * if (status.hasChanges) { ... }
 * ```
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { getStorageManager, type StorageManager } from '@/lib/storage/StorageManager'
import type { StorableDraft } from '@/lib/storage/types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Draft entry (compatible with existing localStorage API)
 */
export interface DraftEntry {
    /** Strand path */
    path: string
    /** Draft content */
    content: string
    /** Hash of original content for conflict detection */
    originalHash: string
    /** When draft was last modified */
    modifiedAt: string
    /** When draft was first created */
    createdAt: string
    /** Draft status */
    status: 'saved' | 'conflict' | 'published'
    /** Draft title */
    title?: string
}

/**
 * Draft status check result
 */
export interface DraftStatusResult {
    /** Whether a draft exists */
    hasDraft: boolean
    /** Whether draft has unpublished changes */
    hasChanges: boolean
    /** Whether there's a conflict with original */
    isConflict: boolean
    /** The draft entry if exists */
    draft: DraftEntry | null
}

/**
 * useDrafts hook state
 */
export interface UseDraftsState {
    /** All drafts */
    drafts: DraftEntry[]
    /** Loading state */
    isLoading: boolean
    /** Error state */
    error: string | null
}

/**
 * useDrafts hook return type
 */
export interface UseDraftsReturn extends UseDraftsState {
    /** Save or update a draft */
    saveDraft: (
        path: string,
        content: string,
        originalContent: string,
        options?: { title?: string; targetWeave?: string; targetLoom?: string }
    ) => Promise<DraftEntry>
    /** Get a draft by path */
    getDraft: (path: string) => Promise<DraftEntry | null>
    /** Check draft status */
    checkDraftStatus: (path: string, currentContent: string) => Promise<DraftStatusResult>
    /** Delete a draft */
    deleteDraft: (path: string) => Promise<void>
    /** Get all drafts */
    getAllDrafts: () => Promise<DraftEntry[]>
    /** Refresh drafts from storage */
    refreshDrafts: () => Promise<void>
    /** Get count of unpublished drafts */
    getUnpublishedCount: () => number
    /** Publish a draft (converts to strand) */
    publishDraft: (path: string) => Promise<void>
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Simple hash function for content comparison
 */
function hashContent(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
}

/**
 * Convert StorableDraft to DraftEntry
 */
function toEntry(draft: StorableDraft): DraftEntry {
    return {
        path: draft.strandPath || draft.id,
        content: draft.content,
        originalHash: draft.contentHash || '',
        modifiedAt: draft.updatedAt,
        createdAt: draft.createdAt,
        status: draft.syncStatus === 'conflict' ? 'conflict' : 'saved',
        title: draft.title,
    }
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing drafts with StorageManager
 */
export function useDrafts(): UseDraftsReturn {
    const [state, setState] = useState<UseDraftsState>({
        drafts: [],
        isLoading: true,
        error: null,
    })

    // Storage manager reference
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

    // Load all drafts
    const loadDrafts = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }))
            const storage = await getStorage()
            const allDrafts = await storage.getAllDrafts()
            const entries = allDrafts.map(toEntry)

            // Sort by most recent
            entries.sort((a, b) =>
                new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
            )

            setState({
                drafts: entries,
                isLoading: false,
                error: null,
            })
        } catch (err) {
            console.error('[useDrafts] Failed to load drafts:', err)
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err.message : 'Failed to load drafts',
            }))
        }
    }, [getStorage])

    // Save a draft
    const saveDraft = useCallback(async (
        path: string,
        content: string,
        originalContent: string,
        options?: { title?: string; targetWeave?: string; targetLoom?: string }
    ): Promise<DraftEntry> => {
        try {
            const storage = await getStorage()
            const originalHash = hashContent(originalContent)

            // Check for existing draft
            const existing = await storage.getDraft(path)

            // Determine if there's a conflict
            const isConflict = existing && existing.contentHash !== originalHash &&
                existing.content !== content

            // Save to storage
            const saved = await storage.saveDraft({
                id: path,
                strandPath: path,
                title: options?.title || path.split('/').pop()?.replace(/\.md$/, '') || 'Untitled',
                content,
                frontmatter: {},
                isNew: !existing,
                targetWeave: options?.targetWeave,
                targetLoom: options?.targetLoom,
                contentHash: originalHash,
            })

            const entry = toEntry(saved)
            if (isConflict) {
                entry.status = 'conflict'
            }

            // Update local state
            setState(prev => {
                const existing = prev.drafts.findIndex(d => d.path === path)
                const newDrafts = [...prev.drafts]
                if (existing >= 0) {
                    newDrafts[existing] = entry
                } else {
                    newDrafts.unshift(entry)
                }
                return { ...prev, drafts: newDrafts }
            })

            return entry
        } catch (err) {
            console.error('[useDrafts] Failed to save draft:', err)
            throw err
        }
    }, [getStorage])

    // Get a draft by path
    const getDraft = useCallback(async (path: string): Promise<DraftEntry | null> => {
        try {
            const storage = await getStorage()
            const draft = await storage.getDraft(path)
            return draft ? toEntry(draft) : null
        } catch (err) {
            console.error('[useDrafts] Failed to get draft:', err)
            return null
        }
    }, [getStorage])

    // Check draft status
    const checkDraftStatus = useCallback(async (
        path: string,
        currentContent: string
    ): Promise<DraftStatusResult> => {
        try {
            const draft = await getDraft(path)

            if (!draft) {
                return { hasDraft: false, hasChanges: false, isConflict: false, draft: null }
            }

            const currentHash = hashContent(currentContent)
            const hasChanges = draft.content !== currentContent
            const isConflict = draft.originalHash !== currentHash && hasChanges

            return {
                hasDraft: true,
                hasChanges,
                isConflict,
                draft,
            }
        } catch (err) {
            console.error('[useDrafts] Failed to check draft status:', err)
            return { hasDraft: false, hasChanges: false, isConflict: false, draft: null }
        }
    }, [getDraft])

    // Delete a draft
    const deleteDraft = useCallback(async (path: string): Promise<void> => {
        try {
            const storage = await getStorage()
            await storage.deleteDraft(path)

            // Update local state
            setState(prev => ({
                ...prev,
                drafts: prev.drafts.filter(d => d.path !== path),
            }))
        } catch (err) {
            console.error('[useDrafts] Failed to delete draft:', err)
            throw err
        }
    }, [getStorage])

    // Get all drafts
    const getAllDrafts = useCallback(async (): Promise<DraftEntry[]> => {
        try {
            const storage = await getStorage()
            const allDrafts = await storage.getAllDrafts()
            const entries = allDrafts.map(toEntry)
            entries.sort((a, b) =>
                new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
            )
            return entries
        } catch (err) {
            console.error('[useDrafts] Failed to get all drafts:', err)
            return []
        }
    }, [getStorage])

    // Refresh drafts
    const refreshDrafts = useCallback(async () => {
        await loadDrafts()
    }, [loadDrafts])

    // Get unpublished count
    const getUnpublishedCount = useCallback(() => {
        return state.drafts.filter(d => d.status !== 'published').length
    }, [state.drafts])

    // Publish a draft (converts to strand)
    const publishDraft = useCallback(async (path: string): Promise<void> => {
        try {
            const storage = await getStorage()
            await storage.publishDraft(path)

            // Remove from local state
            setState(prev => ({
                ...prev,
                drafts: prev.drafts.filter(d => d.path !== path),
            }))
        } catch (err) {
            console.error('[useDrafts] Failed to publish draft:', err)
            throw err
        }
    }, [getStorage])

    // Load drafts on mount
    useEffect(() => {
        loadDrafts()
    }, [loadDrafts])

    return {
        // State
        drafts: state.drafts,
        isLoading: state.isLoading,
        error: state.error,

        // Actions
        saveDraft,
        getDraft,
        checkDraftStatus,
        deleteDraft,
        getAllDrafts,
        refreshDrafts,
        getUnpublishedCount,
        publishDraft,
    }
}

export default useDrafts
