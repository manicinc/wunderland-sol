/**
 * Blocks API
 * @module api/blocks
 *
 * GET /api/blocks - Get all blocks for a strand with stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStrandBlocks, getBlockStatistics } from '@/lib/blockDatabase'

export const runtime = 'nodejs'

// ============================================================================
// GET /api/blocks?strandPath=<path>
// ============================================================================

/**
 * GET /api/blocks
 *
 * Get all blocks for a strand with their tags and metadata.
 *
 * Query params:
 * - strandPath: Path to the strand (required)
 * - stats: If 'true', include global block statistics
 *
 * @example
 * ```typescript
 * const res = await fetch('/api/blocks?strandPath=weaves/wiki/strands/intro.md')
 * const { blocks, stats } = await res.json()
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const strandPath = searchParams.get('strandPath')
    const includeStats = searchParams.get('stats') === 'true'

    if (!strandPath) {
      return NextResponse.json(
        { error: 'strandPath query parameter is required' },
        { status: 400 }
      )
    }

    const blocks = await getStrandBlocks(strandPath)

    // Calculate strand-specific stats
    const strandStats = {
      total: blocks.length,
      tagged: blocks.filter((b) => b.tags?.length > 0).length,
      pending: blocks.filter((b) => b.suggestedTags?.length > 0).length,
      worthy: blocks.filter((b) => (b.worthinessScore ?? 0) >= 0.5).length,
    }

    // Optionally include global stats
    const globalStats = includeStats ? await getBlockStatistics() : undefined

    return NextResponse.json({
      success: true,
      blocks,
      stats: strandStats,
      globalStats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API] Get blocks error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get blocks' },
      { status: 500 }
    )
  }
}
