/**
 * Looms API
 * @module api/looms
 *
 * Developer-friendly REST API for loom (subfolder) data.
 *
 * GET /api/looms - List all looms
 * GET /api/looms?weave=<slug> - Filter by weave
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/codexDatabase'

export const runtime = 'nodejs'

// ============================================================================
// TYPES
// ============================================================================

interface LoomSummary {
    id: string
    slug: string
    name: string
    path: string
    description: string | null
    weave: string
    parentLoom: string | null
    depth: number
    strandCount: number
    coverImage: string | null
    emoji: string | null
    updatedAt: string
    createdAt: string
}

interface LoomsAPIResponse {
    success: boolean
    looms: LoomSummary[]
    total: number
    filters: {
        weave?: string
    }
    timestamp: string
}

// ============================================================================
// GET /api/looms
// ============================================================================

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const weave = searchParams.get('weave') || undefined

        const db = await getDatabase()
        if (!db) {
            return NextResponse.json(
                { error: 'Database not available', success: false },
                { status: 503 }
            )
        }

        // Build query
        let sql = `
      SELECT 
        l.id,
        l.slug,
        l.name,
        l.path,
        l.description,
        l.depth,
        l.cover_image,
        l.emoji,
        l.updated_at,
        l.created_at,
        w.slug as weave_slug,
        pl.path as parent_loom_path,
        COUNT(DISTINCT s.id) as strand_count
      FROM looms l
      JOIN weaves w ON w.id = l.weave_id
      LEFT JOIN looms pl ON pl.id = l.parent_loom_id
      LEFT JOIN strands s ON s.loom_id = l.id AND (s.status IN ('published', 'draft') OR s.status IS NULL)
    `
        const params: string[] = []

        if (weave) {
            sql += ` WHERE w.slug = ?`
            params.push(weave)
        }

        sql += `
      GROUP BY l.id
      ORDER BY l.depth, l.sort_order, l.name
    `

        const rows = await db.all(sql, params) as Array<{
            id: string
            slug: string
            name: string
            path: string
            description: string | null
            depth: number
            cover_image: string | null
            emoji: string | null
            updated_at: string
            created_at: string
            weave_slug: string
            parent_loom_path: string | null
            strand_count: number
        }>

        const looms: LoomSummary[] = (rows || []).map(row => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            path: row.path,
            description: row.description,
            weave: row.weave_slug,
            parentLoom: row.parent_loom_path,
            depth: row.depth || 0,
            strandCount: row.strand_count || 0,
            coverImage: row.cover_image,
            emoji: row.emoji,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
        }))

        const response: LoomsAPIResponse = {
            success: true,
            looms,
            total: looms.length,
            filters: {
                ...(weave && { weave }),
            },
            timestamp: new Date().toISOString(),
        }

        // Add caching headers
        const headers = new Headers()
        headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')
        headers.set('X-Total-Count', String(looms.length))

        return NextResponse.json(response, { headers })
    } catch (error) {
        console.error('[API] Get looms error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get looms', success: false },
            { status: 500 }
        )
    }
}
