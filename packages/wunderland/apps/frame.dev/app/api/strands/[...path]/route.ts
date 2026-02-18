/**
 * Single Strand API
 * @module api/strands/[...path]
 *
 * GET /api/strands/{path} - Get a single strand by path
 *
 * Examples:
 * - GET /api/strands/wiki/getting-started
 * - GET /api/strands/wiki/react/hooks
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/codexDatabase'

export const runtime = 'nodejs'

// ============================================================================
// TYPES
// ============================================================================

interface StrandDetailResponse {
    id: string
    path: string
    slug: string
    title: string
    content: string
    weave: string | null
    loom: string | null
    wordCount: number
    difficulty: string | null
    status: string | null
    tags: string[]
    subjects: string[]
    topics: string[]
    prerequisites: string[]
    references: string[]
    summary: string | null
    frontmatter: Record<string, unknown>
    githubUrl: string | null
    updatedAt: string
    createdAt: string
}

// ============================================================================
// GET /api/strands/[...path]
// ============================================================================

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const strandPath = params.path?.join('/') || ''

        if (!strandPath) {
            return NextResponse.json(
                { error: 'Strand path is required', success: false },
                { status: 400 }
            )
        }

        const db = await getDatabase()
        if (!db) {
            return NextResponse.json(
                { error: 'Database not available', success: false },
                { status: 503 }
            )
        }

        // Query strand with weave/loom info
        const rows = await db.all(`
      SELECT 
        s.*,
        w.slug as weave_slug,
        l.path as loom_path
      FROM strands s
      LEFT JOIN weaves w ON w.id = s.weave_id
      LEFT JOIN looms l ON l.id = s.loom_id
      WHERE s.path = ?
    `, [strandPath]) as Array<{
            id: string
            path: string
            slug: string
            title: string
            content: string
            word_count: number
            difficulty: string | null
            status: string | null
            tags: string | null
            subjects: string | null
            topics: string | null
            prerequisites: string | null
            references: string | null
            summary: string | null
            frontmatter: string | null
            github_url: string | null
            updated_at: string
            created_at: string
            weave_slug: string | null
            loom_path: string | null
        }>

        if (!rows || rows.length === 0) {
            return NextResponse.json(
                { error: `Strand not found: ${strandPath}`, success: false },
                { status: 404 }
            )
        }

        const row = rows[0]

        const strand: StrandDetailResponse = {
            id: row.id,
            path: row.path,
            slug: row.slug,
            title: row.title,
            content: row.content,
            weave: row.weave_slug,
            loom: row.loom_path,
            wordCount: row.word_count || 0,
            difficulty: row.difficulty,
            status: row.status,
            tags: safeJsonParse(row.tags, []),
            subjects: safeJsonParse(row.subjects, []),
            topics: safeJsonParse(row.topics, []),
            prerequisites: safeJsonParse(row.prerequisites, []),
            references: safeJsonParse(row.references, []),
            summary: row.summary,
            frontmatter: safeJsonParse(row.frontmatter, {}),
            githubUrl: row.github_url,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
        }

        // Add caching headers
        const headers = new Headers()
        headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')

        return NextResponse.json({ success: true, strand, timestamp: new Date().toISOString() }, { headers })
    } catch (error) {
        console.error('[API] Get strand error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get strand', success: false },
            { status: 500 }
        )
    }
}

// ============================================================================
// HELPERS
// ============================================================================

function safeJsonParse<T>(json: string | null, fallback: T): T {
    if (!json) return fallback
    try {
        return JSON.parse(json) as T
    } catch {
        return fallback
    }
}
