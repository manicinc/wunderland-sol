/**
 * useStrands Hook
 * @module lib/hooks/useStrands
 *
 * Fetches strands from the /api/strands endpoint with caching.
 * Used by Learning Studio for strand selection.
 *
 * Features:
 * - IndexedDB caching with 5-minute TTL
 * - Stale-while-revalidate pattern
 * - Pagination support
 * - Filter support (weave, tags, search)
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface StrandSummary {
    id: string
    path: string
    slug: string
    title: string
    weave: string | null
    loom: string | null
    wordCount: number
    difficulty: string | null
    status: string | null
    tags: string[]
    subjects: string[]
    topics: string[]
    summary: string | null
    updatedAt: string
    createdAt: string
}

export interface StrandsFilters {
    weave?: string
    loom?: string
    tags?: string[]
    search?: string
    status?: string
    difficulty?: string
}

export interface StrandsPagination {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export interface UseStrandsResult {
    strands: StrandSummary[]
    loading: boolean
    error: string | null
    pagination: StrandsPagination | null
    filters: StrandsFilters
    setFilters: (filters: StrandsFilters) => void
    setPage: (page: number) => void
    refetch: () => Promise<void>
    // Derived data for Learning Studio
    filterOptions: {
        weaves: string[]
        tags: string[]
        subjects: string[]
        topics: string[]
        difficulties: string[]
    }
}

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const CACHE_DB_NAME = 'quarry-strands-cache'
const CACHE_STORE_NAME = 'strands'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CachedStrandsData {
    key: string
    strands: StrandSummary[]
    pagination: StrandsPagination
    timestamp: number
}

// ============================================================================
// INDEXEDDB CACHE HELPERS
// ============================================================================

function openCacheDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB not available'))
            return
        }
        const request = indexedDB.open(CACHE_DB_NAME, 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
                db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' })
            }
        }
    })
}

async function getCachedStrands(cacheKey: string): Promise<CachedStrandsData | null> {
    try {
        const db = await openCacheDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(CACHE_STORE_NAME, 'readonly')
            const store = tx.objectStore(CACHE_STORE_NAME)
            const request = store.get(cacheKey)
            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                const data = request.result as CachedStrandsData | undefined
                if (data && Date.now() - data.timestamp < CACHE_TTL_MS) {
                    console.log('[useStrands] Cache hit for', cacheKey)
                    resolve(data)
                } else if (data) {
                    console.log('[useStrands] Cache stale for', cacheKey)
                    resolve(data) // Return stale data, will revalidate
                } else {
                    resolve(null)
                }
                db.close()
            }
        })
    } catch (err) {
        console.warn('[useStrands] Cache read failed:', err)
        return null
    }
}

async function setCachedStrands(
    cacheKey: string,
    strands: StrandSummary[],
    pagination: StrandsPagination
): Promise<void> {
    try {
        const db = await openCacheDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(CACHE_STORE_NAME, 'readwrite')
            const store = tx.objectStore(CACHE_STORE_NAME)
            const data: CachedStrandsData = {
                key: cacheKey,
                strands,
                pagination,
                timestamp: Date.now(),
            }
            const request = store.put(data)
            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                console.log('[useStrands] Cached strands for', cacheKey)
                resolve()
                db.close()
            }
        })
    } catch (err) {
        console.warn('[useStrands] Cache write failed:', err)
    }
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useStrands(
    initialFilters: StrandsFilters = {},
    initialLimit: number = 50
): UseStrandsResult {
    const [strands, setStrands] = useState<StrandSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pagination, setPagination] = useState<StrandsPagination | null>(null)
    const [filters, setFilters] = useState<StrandsFilters>(initialFilters)
    const [page, setPage] = useState(1)
    const isRevalidating = useRef(false)

    // Build cache key from filters and page
    const cacheKey = useMemo(() => {
        const parts = ['strands', `p${page}`, `l${initialLimit}`]
        if (filters.weave) parts.push(`w:${filters.weave}`)
        if (filters.search) parts.push(`s:${filters.search}`)
        if (filters.tags?.length) parts.push(`t:${filters.tags.join(',')}`)
        if (filters.status) parts.push(`st:${filters.status}`)
        if (filters.difficulty) parts.push(`d:${filters.difficulty}`)
        return parts.join('|')
    }, [page, initialLimit, filters])

    // Build URL params from filters
    const buildParams = useCallback(() => {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', String(initialLimit))
        if (filters.weave) params.set('weave', filters.weave)
        if (filters.loom) params.set('loom', filters.loom)
        if (filters.tags?.length) params.set('tags', filters.tags.join(','))
        if (filters.search) params.set('search', filters.search)
        if (filters.status) params.set('status', filters.status)
        if (filters.difficulty) params.set('difficulty', filters.difficulty)
        return params.toString()
    }, [page, initialLimit, filters])

    // Fetch strands from API
    const fetchStrands = useCallback(async (forceRefresh = false) => {
        setLoading(true)
        setError(null)

        try {
            // Step 1: Try cache first (instant load)
            if (!forceRefresh) {
                const cached = await getCachedStrands(cacheKey)
                if (cached) {
                    setStrands(cached.strands)
                    setPagination(cached.pagination)
                    setLoading(false)

                    // Check if stale and needs background revalidation
                    const isStale = Date.now() - cached.timestamp >= CACHE_TTL_MS
                    if (isStale && !isRevalidating.current) {
                        isRevalidating.current = true
                        console.log('[useStrands] Background revalidation started')

                        // Revalidate in background
                        fetch(`/api/strands?${buildParams()}`)
                            .then(res => res.json())
                            .then(data => {
                                if (data.success) {
                                    setStrands(data.strands)
                                    setPagination(data.pagination)
                                    setCachedStrands(cacheKey, data.strands, data.pagination)
                                    console.log('[useStrands] Background revalidation complete')
                                }
                            })
                            .catch(err => console.warn('[useStrands] Background revalidation failed:', err))
                            .finally(() => { isRevalidating.current = false })
                    }
                    return
                }
            }

            // Step 2: Fetch from API
            console.log('[useStrands] Fetching from API...')
            const res = await fetch(`/api/strands?${buildParams()}`)
            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch strands')
            }

            setStrands(data.strands)
            setPagination(data.pagination)

            // Save to cache
            await setCachedStrands(cacheKey, data.strands, data.pagination)
        } catch (err) {
            console.error('[useStrands] Fetch error:', err)
            setError(err instanceof Error ? err.message : 'Failed to load strands')
            setStrands([])
            setPagination(null)
        } finally {
            setLoading(false)
        }
    }, [cacheKey, buildParams])

    // Initial fetch and refetch on filter/page change
    useEffect(() => {
        fetchStrands()
    }, [fetchStrands])

    // Compute filter options from all strands (for Learning Studio)
    const filterOptions = useMemo(() => {
        const weaves = new Set<string>()
        const tags = new Set<string>()
        const subjects = new Set<string>()
        const topics = new Set<string>()
        const difficulties = new Set<string>()

        for (const strand of strands) {
            if (strand.weave) weaves.add(strand.weave)
            if (strand.difficulty) difficulties.add(strand.difficulty)
            strand.tags.forEach(t => tags.add(t))
            strand.subjects.forEach(s => subjects.add(s))
            strand.topics.forEach(t => topics.add(t))
        }

        return {
            weaves: Array.from(weaves).sort(),
            tags: Array.from(tags).sort(),
            subjects: Array.from(subjects).sort(),
            topics: Array.from(topics).sort(),
            difficulties: Array.from(difficulties).sort(),
        }
    }, [strands])

    // Force refresh
    const refetch = useCallback(() => fetchStrands(true), [fetchStrands])

    return {
        strands,
        loading,
        error,
        pagination,
        filters,
        setFilters,
        setPage,
        refetch,
        filterOptions,
    }
}

/**
 * Hook variant that fetches ALL strands (unpaginated)
 * Use sparingly - only for cases where you need the complete list
 */
export function useAllStrands(filters: StrandsFilters = {}): UseStrandsResult {
    return useStrands(filters, 1000) // High limit to get all
}
