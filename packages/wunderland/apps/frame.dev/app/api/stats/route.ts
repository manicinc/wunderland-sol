/**
 * Codex Stats API
 * @module api/stats
 *
 * Developer-friendly REST API for codex statistics.
 *
 * GET /api/stats - Get overall codex statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/codexDatabase'

export const runtime = 'nodejs'

// ============================================================================
// TYPES
// ============================================================================

interface CodexStats {
    strands: {
        total: number
        published: number
        draft: number
        archived: number
        totalWordCount: number
        avgWordCount: number
    }
    weaves: {
        total: number
    }
    looms: {
        total: number
    }
    blocks: {
        total: number
        tagged: number
        withSuggestions: number
    }
    tags: {
        total: number
        topTags: Array<{ tag: string; count: number }>
    }
    lastUpdated: string | null
}

// ============================================================================
// GET /api/stats
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

        // Get strand stats
        const strandStats = await db.all(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'published' OR status IS NULL THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived,
        SUM(word_count) as total_word_count,
        AVG(word_count) as avg_word_count,
        MAX(updated_at) as last_updated
      FROM strands
    `) as Array<{
            total: number
            published: number
            draft: number
            archived: number
            total_word_count: number
            avg_word_count: number
            last_updated: string | null
        }>

        // Get weave count
        const weaveStats = await db.all(`SELECT COUNT(*) as total FROM weaves`) as Array<{ total: number }>

        // Get loom count
        const loomStats = await db.all(`SELECT COUNT(*) as total FROM looms`) as Array<{ total: number }>

        // Get block stats
        const blockStats = await db.all(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN tags IS NOT NULL AND tags != '[]' THEN 1 ELSE 0 END) as tagged,
        SUM(CASE WHEN suggested_tags IS NOT NULL AND suggested_tags != '[]' THEN 1 ELSE 0 END) as with_suggestions
      FROM strand_blocks
    `) as Array<{
            total: number
            tagged: number
            with_suggestions: number
        }>

        // Get top tags
        const tagRows = await db.all(`
      SELECT tags FROM strands WHERE tags IS NOT NULL AND tags != '[]'
    `) as Array<{ tags: string }>

        const tagCounts = new Map<string, number>()
        for (const row of tagRows || []) {
            try {
                const tags = JSON.parse(row.tags) as string[]
                for (const tag of tags) {
                    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
                }
            } catch {
                // Skip malformed JSON
            }
        }

        const topTags = Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([tag, count]) => ({ tag, count }))

        const strand = strandStats?.[0] || { total: 0, published: 0, draft: 0, archived: 0, total_word_count: 0, avg_word_count: 0, last_updated: null }
        const block = blockStats?.[0] || { total: 0, tagged: 0, with_suggestions: 0 }

        const stats: CodexStats = {
            strands: {
                total: strand.total || 0,
                published: strand.published || 0,
                draft: strand.draft || 0,
                archived: strand.archived || 0,
                totalWordCount: strand.total_word_count || 0,
                avgWordCount: Math.round(strand.avg_word_count || 0),
            },
            weaves: {
                total: weaveStats?.[0]?.total || 0,
            },
            looms: {
                total: loomStats?.[0]?.total || 0,
            },
            blocks: {
                total: block.total || 0,
                tagged: block.tagged || 0,
                withSuggestions: block.with_suggestions || 0,
            },
            tags: {
                total: tagCounts.size,
                topTags,
            },
            lastUpdated: strand.last_updated,
        }

        // Add caching headers
        const headers = new Headers()
        headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

        return NextResponse.json({
            success: true,
            stats,
            timestamp: new Date().toISOString(),
        }, { headers })
    } catch (error) {
        console.error('[API] Get stats error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get stats', success: false },
            { status: 500 }
        )
    }
}
