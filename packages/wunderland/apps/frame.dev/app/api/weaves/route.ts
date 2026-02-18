/**
 * Weaves API
 * @module api/weaves
 *
 * Developer-friendly REST API for weave (top-level folder) data.
 *
 * GET /api/weaves - List all weaves with strand counts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/codexDatabase'

export const runtime = 'nodejs'

// ============================================================================
// TYPES
// ============================================================================

interface WeaveSummary {
    id: string
    slug: string
    name: string
    path: string
    description: string | null
    strandCount: number
    loomCount: number
    coverImage: string | null
    emoji: string | null
    accentColor: string | null
    updatedAt: string
    createdAt: string
}

interface WeavesAPIResponse {
    success: boolean
    weaves: WeaveSummary[]
    total: number
    timestamp: string
}

// ============================================================================
// GET /api/weaves
// ============================================================================

export async function GET(request: NextRequest) {
    try {
        const db = await getDatabase()
        if (!db) {
            return NextResponse.json(
                { error: 'Database not available', success: false },
                { status: 503 }
            )
        }

        // Get all weaves with strand and loom counts
        const rows = await db.all(`
      SELECT 
        w.id,
        w.slug,
        w.name,
        w.path,
        w.description,
        w.cover_image,
        w.emoji,
        w.accent_color,
        w.updated_at,
        w.created_at,
        COUNT(DISTINCT s.id) as strand_count,
        COUNT(DISTINCT l.id) as loom_count
      FROM weaves w
      LEFT JOIN strands s ON s.weave_id = w.id AND (s.status IN ('published', 'draft') OR s.status IS NULL)
      LEFT JOIN looms l ON l.weave_id = w.id
      GROUP BY w.id
      ORDER BY w.sort_order, w.name
    `) as Array<{
            id: string
            slug: string
            name: string
            path: string
            description: string | null
            cover_image: string | null
            emoji: string | null
            accent_color: string | null
            updated_at: string
            created_at: string
            strand_count: number
            loom_count: number
        }>

        const weaves: WeaveSummary[] = (rows || []).map(row => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            path: row.path,
            description: row.description,
            strandCount: row.strand_count || 0,
            loomCount: row.loom_count || 0,
            coverImage: row.cover_image,
            emoji: row.emoji,
            accentColor: row.accent_color,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
        }))

        const response: WeavesAPIResponse = {
            success: true,
            weaves,
            total: weaves.length,
            timestamp: new Date().toISOString(),
        }

        // Add caching headers
        const headers = new Headers()
        headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')
        headers.set('X-Total-Count', String(weaves.length))

        return NextResponse.json(response, { headers })
    } catch (error) {
        console.error('[API] Get weaves error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get weaves', success: false },
            { status: 500 }
        )
    }
}
