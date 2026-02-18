/**
 * useStrands Hook Tests
 * @module __tests__/unit/hooks/useStrands.test
 *
 * Tests for the useStrands hook that fetches from /api/strands
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStrands, useAllStrands } from '@/lib/hooks/useStrands'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock IndexedDB
const mockIndexedDB = {
    open: vi.fn(),
}

Object.defineProperty(global, 'indexedDB', {
    value: mockIndexedDB,
    writable: true,
})

// ============================================================================
// TEST DATA
// ============================================================================

const mockStrandsResponse = {
    success: true,
    strands: [
        {
            id: '1',
            path: 'wiki/test',
            slug: 'test',
            title: 'Test Strand',
            weave: 'wiki',
            loom: null,
            wordCount: 100,
            difficulty: 'beginner',
            status: 'published',
            tags: ['react', 'hooks'],
            subjects: ['frontend'],
            topics: ['react'],
            summary: 'Test summary',
            updatedAt: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
        },
        {
            id: '2',
            path: 'wiki/test2',
            slug: 'test2',
            title: 'Test Strand 2',
            weave: 'wiki',
            loom: null,
            wordCount: 200,
            difficulty: 'intermediate',
            status: 'published',
            tags: ['typescript'],
            subjects: ['frontend'],
            topics: ['typescript'],
            summary: 'Test summary 2',
            updatedAt: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
        },
    ],
    pagination: {
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
    },
    filters: {},
    timestamp: '2024-01-01T00:00:00Z',
}

// ============================================================================
// TESTS
// ============================================================================

describe('useStrands', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockStrandsResponse),
        })

        // Mock IndexedDB to fail (so it falls back to network)
        mockIndexedDB.open.mockImplementation(() => {
            throw new Error('IndexedDB not available')
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('should fetch strands on mount', async () => {
        const { result } = renderHook(() => useStrands())

        // Initially loading
        expect(result.current.loading).toBe(true)
        expect(result.current.strands).toEqual([])

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.strands).toHaveLength(2)
        expect(result.current.strands[0].title).toBe('Test Strand')
    })

    it('should parse filter options from strands', async () => {
        const { result } = renderHook(() => useStrands())

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.filterOptions.weaves).toContain('wiki')
        expect(result.current.filterOptions.tags).toContain('react')
        expect(result.current.filterOptions.tags).toContain('typescript')
        expect(result.current.filterOptions.difficulties).toContain('beginner')
        expect(result.current.filterOptions.difficulties).toContain('intermediate')
    })

    it('should include filters in API request', async () => {
        renderHook(() => useStrands({ weave: 'wiki', search: 'react' }))

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalled()
        })

        const fetchUrl = mockFetch.mock.calls[0][0] as string
        expect(fetchUrl).toContain('weave=wiki')
        expect(fetchUrl).toContain('search=react')
    })

    it('should handle API errors', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ error: 'Server error', success: false }),
        })

        const { result } = renderHook(() => useStrands())

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.error).toBeTruthy()
        expect(result.current.strands).toHaveLength(0)
    })

    it('should return pagination info', async () => {
        const { result } = renderHook(() => useStrands())

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.pagination).toBeDefined()
        expect(result.current.pagination?.page).toBe(1)
        expect(result.current.pagination?.total).toBe(2)
        expect(result.current.pagination?.hasNext).toBe(false)
    })

    it('should provide refetch function', async () => {
        const { result } = renderHook(() => useStrands())

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.refetch).toBeDefined()
        expect(typeof result.current.refetch).toBe('function')
    })
})

describe('useAllStrands', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockStrandsResponse),
        })

        mockIndexedDB.open.mockImplementation(() => {
            throw new Error('IndexedDB not available')
        })
    })

    it('should request high limit for all strands', async () => {
        renderHook(() => useAllStrands())

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalled()
        })

        const fetchUrl = mockFetch.mock.calls[0][0] as string
        expect(fetchUrl).toContain('limit=1000')
    })

    it('should accept filter options', async () => {
        renderHook(() => useAllStrands({ weave: 'docs' }))

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalled()
        })

        const fetchUrl = mockFetch.mock.calls[0][0] as string
        expect(fetchUrl).toContain('weave=docs')
    })
})
