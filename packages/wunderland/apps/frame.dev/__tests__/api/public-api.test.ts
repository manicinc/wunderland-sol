/**
 * Public API Endpoints Tests
 * @module __tests__/api/public-api.test
 *
 * Tests for the unauthenticated public API endpoints:
 * - GET /api/strands
 * - GET /api/strands/[...path]
 * - GET /api/weaves
 * - GET /api/looms
 * - GET /api/stats
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the database
vi.mock('@/lib/codexDatabase', () => ({
    getDatabase: vi.fn(),
}))

import { getDatabase } from '@/lib/codexDatabase'

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockRequest(url: string): NextRequest {
    return new NextRequest(`http://localhost:3000${url}`)
}

function createMockDb(results: Record<string, unknown[]>) {
    return {
        all: vi.fn((sql: string) => {
            // Return appropriate mock data based on SQL query
            if (sql.includes('SELECT COUNT(*)')) {
                return Promise.resolve([{ total: 10 }])
            }
            if (sql.includes('FROM strands')) {
                return Promise.resolve(results.strands || [])
            }
            if (sql.includes('FROM weaves')) {
                return Promise.resolve(results.weaves || [])
            }
            if (sql.includes('FROM looms')) {
                return Promise.resolve(results.looms || [])
            }
            if (sql.includes('FROM strand_blocks')) {
                return Promise.resolve([{ total: 100, tagged: 50, with_suggestions: 20 }])
            }
            return Promise.resolve([])
        }),
    }
}

// ============================================================================
// /api/strands TESTS
// ============================================================================

describe('GET /api/strands', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should return strands with pagination', async () => {
        const mockStrands = [
            {
                id: '1',
                path: 'wiki/test',
                slug: 'test',
                title: 'Test Strand',
                weave: 'wiki',
                loom: null,
                word_count: 100,
                difficulty: 'beginner',
                status: 'published',
                tags: '["react", "hooks"]',
                subjects: '["frontend"]',
                topics: '["react"]',
                summary: 'Test summary',
                updated_at: '2024-01-01T00:00:00Z',
                created_at: '2024-01-01T00:00:00Z',
            },
        ]

        const mockDb = createMockDb({ strands: mockStrands })
        vi.mocked(getDatabase).mockResolvedValue(mockDb as any)

        const { GET } = await import('@/app/api/strands/route')
        const request = createMockRequest('/api/strands')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.strands).toHaveLength(1)
        expect(data.strands[0].title).toBe('Test Strand')
        expect(data.strands[0].tags).toEqual(['react', 'hooks'])
        expect(data.pagination).toBeDefined()
        expect(data.pagination.page).toBe(1)
    })

    it('should filter by weave', async () => {
        const mockDb = createMockDb({ strands: [] })
        vi.mocked(getDatabase).mockResolvedValue(mockDb as any)

        const { GET } = await import('@/app/api/strands/route')
        const request = createMockRequest('/api/strands?weave=wiki')
        await GET(request)

        // Check that weave filter was applied
        expect(mockDb.all).toHaveBeenCalled()
        const sqlCall = mockDb.all.mock.calls.find((call) =>
            (call[0] as string).includes('w.slug = ?')
        )
        expect(sqlCall).toBeDefined()
    })

    it('should support search', async () => {
        const mockDb = createMockDb({ strands: [] })
        vi.mocked(getDatabase).mockResolvedValue(mockDb as any)

        const { GET } = await import('@/app/api/strands/route')
        const request = createMockRequest('/api/strands?search=react')
        await GET(request)

        expect(mockDb.all).toHaveBeenCalled()
        const sqlCall = mockDb.all.mock.calls.find((call) =>
            (call[0] as string).includes('LIKE')
        )
        expect(sqlCall).toBeDefined()
    })

    it('should return 503 when database is unavailable', async () => {
        vi.mocked(getDatabase).mockResolvedValue(null)

        const { GET } = await import('@/app/api/strands/route')
        const request = createMockRequest('/api/strands')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(503)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Database not available')
    })

    it('should include cache headers', async () => {
        const mockDb = createMockDb({ strands: [] })
        vi.mocked(getDatabase).mockResolvedValue(mockDb as any)

        const { GET } = await import('@/app/api/strands/route')
        const request = createMockRequest('/api/strands')
        const response = await GET(request)

        expect(response.headers.get('Cache-Control')).toContain('public')
        expect(response.headers.get('Cache-Control')).toContain('s-maxage')
    })
})

// ============================================================================
// /api/weaves TESTS
// ============================================================================

describe('GET /api/weaves', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should return all weaves with counts', async () => {
        const mockWeaves = [
            {
                id: '1',
                slug: 'wiki',
                name: 'Wiki',
                path: 'weaves/wiki',
                description: 'Wiki documentation',
                cover_image: null,
                emoji: '📚',
                accent_color: null,
                updated_at: '2024-01-01T00:00:00Z',
                created_at: '2024-01-01T00:00:00Z',
                strand_count: 42,
                loom_count: 5,
            },
        ]

        const mockDb = createMockDb({ weaves: mockWeaves })
        vi.mocked(getDatabase).mockResolvedValue(mockDb as any)

        const { GET } = await import('@/app/api/weaves/route')
        const request = createMockRequest('/api/weaves')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.weaves).toHaveLength(1)
        expect(data.weaves[0].slug).toBe('wiki')
        expect(data.weaves[0].strandCount).toBe(42)
        expect(data.weaves[0].loomCount).toBe(5)
    })
})

// ============================================================================
// /api/looms TESTS
// ============================================================================

describe('GET /api/looms', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should return all looms', async () => {
        const mockLooms = [
            {
                id: '1',
                slug: 'getting-started',
                name: 'Getting Started',
                path: 'weaves/wiki/looms/getting-started',
                description: 'Intro guides',
                depth: 1,
                cover_image: null,
                emoji: '🚀',
                updated_at: '2024-01-01T00:00:00Z',
                created_at: '2024-01-01T00:00:00Z',
                weave_slug: 'wiki',
                parent_loom_path: null,
                strand_count: 10,
            },
        ]

        const mockDb = createMockDb({ looms: mockLooms })
        vi.mocked(getDatabase).mockResolvedValue(mockDb as any)

        const { GET } = await import('@/app/api/looms/route')
        const request = createMockRequest('/api/looms')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.looms).toHaveLength(1)
        expect(data.looms[0].slug).toBe('getting-started')
        expect(data.looms[0].strandCount).toBe(10)
    })

    it('should filter by weave', async () => {
        const mockDb = createMockDb({ looms: [] })
        vi.mocked(getDatabase).mockResolvedValue(mockDb as any)

        const { GET } = await import('@/app/api/looms/route')
        const request = createMockRequest('/api/looms?weave=wiki')
        await GET(request)

        expect(mockDb.all).toHaveBeenCalled()
        const sqlCall = mockDb.all.mock.calls[0][0] as string
        expect(sqlCall).toContain('w.slug = ?')
    })
})

// ============================================================================
// /api/stats TESTS
// ============================================================================

describe('GET /api/stats', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should return codex statistics', async () => {
        const mockDb = {
            all: vi.fn((sql: string) => {
                if (sql.includes('FROM strands') && sql.includes('COUNT(*)')) {
                    return Promise.resolve([{
                        total: 127,
                        published: 100,
                        draft: 20,
                        archived: 7,
                        total_word_count: 50000,
                        avg_word_count: 400,
                        last_updated: '2024-01-01T00:00:00Z',
                    }])
                }
                if (sql.includes('FROM weaves')) {
                    return Promise.resolve([{ total: 5 }])
                }
                if (sql.includes('FROM looms')) {
                    return Promise.resolve([{ total: 15 }])
                }
                if (sql.includes('FROM strand_blocks')) {
                    return Promise.resolve([{ total: 1000, tagged: 500, with_suggestions: 200 }])
                }
                if (sql.includes('SELECT tags FROM strands')) {
                    return Promise.resolve([
                        { tags: '["react", "hooks"]' },
                        { tags: '["react", "typescript"]' },
                    ])
                }
                return Promise.resolve([])
            }),
        }
        vi.mocked(getDatabase).mockResolvedValue(mockDb as any)

        const { GET } = await import('@/app/api/stats/route')
        const request = createMockRequest('/api/stats')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.stats).toBeDefined()
        expect(data.stats.strands.total).toBe(127)
        expect(data.stats.weaves.total).toBe(5)
        expect(data.stats.looms.total).toBe(15)
        expect(data.stats.tags.topTags).toBeDefined()
    })
})
