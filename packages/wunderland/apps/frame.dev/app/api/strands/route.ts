/**
 * Strands API
 * @module api/strands
 *
 * Developer-friendly REST API for strand data.
 *
 * GET /api/strands - List all strands with pagination and filtering
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 200)
 * - weave: Filter by weave slug
 * - loom: Filter by loom path
 * - tags: Comma-separated tags to filter by (OR match)
 * - search: Full-text search query
 * - status: Filter by status ('published' | 'draft' | 'archived')
 * - difficulty: Filter by difficulty level
 * - sortBy: Sort field ('title' | 'updated' | 'created' | 'wordCount')
 * - sortOrder: Sort direction ('asc' | 'desc')
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/codexDatabase'

export const runtime = 'nodejs'

// ============================================================================
// TYPES
// ============================================================================

interface StrandSummaryResponse {
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

interface StrandsAPIResponse {
    success: boolean
    strands: StrandSummaryResponse[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }
    filters: {
        weave?: string
        loom?: string
        tags?: string[]
        search?: string
        status?: string
        difficulty?: string
    }
    timestamp: string
}

// ============================================================================
// GET /api/strands
// ============================================================================

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)

        // Parse pagination params
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
        const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
        const offset = (page - 1) * limit

        // Parse filter params
        const weave = searchParams.get('weave') || undefined
        const loom = searchParams.get('loom') || undefined
        const tagsParam = searchParams.get('tags')
        const tags = tagsParam ? tagsParam.split(',').map(t => t.trim()).filter(Boolean) : undefined
        const search = searchParams.get('search') || undefined
        const status = searchParams.get('status') || undefined
        const difficulty = searchParams.get('difficulty') || undefined

        // Parse sort params
        const sortBy = searchParams.get('sortBy') || 'title'
        const sortOrder = searchParams.get('sortOrder') || 'asc'

        // Validate sort params
        const validSortBy = ['title', 'updated', 'created', 'wordCount'].includes(sortBy) ? sortBy : 'title'
        const validSortOrder = sortOrder === 'desc' ? 'DESC' : 'ASC'

        // Map sortBy to actual column names
        const sortColumnMap: Record<string, string> = {
            title: 's.title',
            updated: 's.updated_at',
            created: 's.created_at',
            wordCount: 's.word_count',
        }
        const sortColumn = sortColumnMap[validSortBy] || 's.title'

        // Get database
        const db = await getDatabase()
        if (!db) {
            return NextResponse.json(
                { error: 'Database not available', success: false },
                { status: 503 }
            )
        }

        // Build WHERE clause
        const conditions: string[] = []
        const params: (string | number)[] = []

        // Status filter (default to published + draft if not specified)
        if (status) {
            conditions.push('s.status = ?')
            params.push(status)
        } else {
            conditions.push("(s.status IN ('published', 'draft') OR s.status IS NULL)")
        }

        // Weave filter
        if (weave) {
            conditions.push('w.slug = ?')
            params.push(weave)
        }

        // Loom filter
        if (loom) {
            conditions.push('l.path = ?')
            params.push(loom)
        }

        // Tags filter (OR match - strand has any of the specified tags)
        if (tags && tags.length > 0) {
            const tagConditions = tags.map(() => 's.tags LIKE ?')
            conditions.push(`(${tagConditions.join(' OR ')})`)
            params.push(...tags.map(t => `%"${t}"%`))
        }

        // Difficulty filter
        if (difficulty) {
            conditions.push('s.difficulty = ?')
            params.push(difficulty)
        }

        // Full-text search
        if (search) {
            const searchTerm = `%${search}%`
            conditions.push('(s.title LIKE ? OR s.content LIKE ? OR s.summary LIKE ?)')
            params.push(searchTerm, searchTerm, searchTerm)
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

        // Count total matching strands
        const countSql = `
      SELECT COUNT(*) as total
      FROM strands s
      LEFT JOIN weaves w ON w.id = s.weave_id
      LEFT JOIN looms l ON l.id = s.loom_id
      ${whereClause}
    `
        const countResult = await db.all(countSql, params) as Array<{ total: number }>
        const total = countResult?.[0]?.total || 0
        const totalPages = Math.ceil(total / limit)

        // Fetch strands with pagination
        const selectSql = `
      SELECT 
        s.id,
        s.path,
        s.slug,
        s.title,
        w.slug as weave,
        l.path as loom,
        s.word_count,
        s.difficulty,
        s.status,
        s.tags,
        s.subjects,
        s.topics,
        s.summary,
        s.updated_at,
        s.created_at
      FROM strands s
      LEFT JOIN weaves w ON w.id = s.weave_id
      LEFT JOIN looms l ON l.id = s.loom_id
      ${whereClause}
      ORDER BY ${sortColumn} ${validSortOrder}
      LIMIT ? OFFSET ?
    `
        const selectParams = [...params, limit, offset]
        const rows = await db.all(selectSql, selectParams) as Array<{
            id: string
            path: string
            slug: string
            title: string
            weave: string | null
            loom: string | null
            word_count: number
            difficulty: string | null
            status: string | null
            tags: string | null
            subjects: string | null
            topics: string | null
            summary: string | null
            updated_at: string
            created_at: string
        }>

        // Transform rows to response format
        const strands: StrandSummaryResponse[] = (rows || []).map(row => ({
            id: row.id,
            path: row.path,
            slug: row.slug,
            title: row.title,
            weave: row.weave,
            loom: row.loom,
            wordCount: row.word_count || 0,
            difficulty: row.difficulty,
            status: row.status,
            tags: row.tags ? safeJsonParse(row.tags, []) : [],
            subjects: row.subjects ? safeJsonParse(row.subjects, []) : [],
            topics: row.topics ? safeJsonParse(row.topics, []) : [],
            summary: row.summary,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
        }))

        const response: StrandsAPIResponse = {
            success: true,
            strands,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
            filters: {
                ...(weave && { weave }),
                ...(loom && { loom }),
                ...(tags && { tags }),
                ...(search && { search }),
                ...(status && { status }),
                ...(difficulty && { difficulty }),
            },
            timestamp: new Date().toISOString(),
        }

        // Add caching headers
        const headers = new Headers()
        headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
        headers.set('X-Total-Count', String(total))

        return NextResponse.json(response, { headers })
    } catch (error) {
        console.error('[API] Get strands error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get strands', success: false },
            { status: 500 }
        )
    }
}

// ============================================================================
// HELPERS
// ============================================================================

function safeJsonParse<T>(json: string, fallback: T): T {
    try {
        return JSON.parse(json) as T
    } catch {
        return fallback
    }
}
