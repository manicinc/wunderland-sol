/**
 * Block Search API
 * @module api/blocks/search
 *
 * GET /api/blocks/search - Search blocks by tag or full-text
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  searchBlocksByTag,
  searchBlocksFullText,
  getAllBlockTags,
  getBlockTagCounts,
} from '@/lib/blockDatabase'
import type { MarkdownBlockType } from '@/lib/blockDatabase'

export const runtime = 'nodejs'

// ============================================================================
// GET /api/blocks/search
// ============================================================================

/**
 * GET /api/blocks/search
 *
 * Search blocks by tag or full-text content.
 *
 * Query params:
 * - tag: Search for blocks with this tag
 * - q: Full-text search query (alternative to tag)
 * - limit: Max results (default: 50)
 * - offset: Pagination offset (default: 0)
 * - weave: Filter by weave name
 * - loom: Filter by loom path
 * - blockTypes: Comma-separated block types (heading,paragraph,code,etc.)
 * - minWorthiness: Minimum worthiness score (0-1)
 * - listTags: If 'true', return all unique tags instead of searching
 * - tagCounts: If 'true', return tag counts instead of searching
 *
 * @example
 * ```typescript
 * // Search by tag
 * const res = await fetch('/api/blocks/search?tag=react&limit=20')
 *
 * // Full-text search
 * const res = await fetch('/api/blocks/search?q=useState&blockTypes=code,paragraph')
 *
 * // Get all unique tags
 * const res = await fetch('/api/blocks/search?listTags=true')
 *
 * // Get tag counts
 * const res = await fetch('/api/blocks/search?tagCounts=true')
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Special modes: list all tags or get tag counts
    const listTags = searchParams.get('listTags') === 'true'
    const tagCounts = searchParams.get('tagCounts') === 'true'

    if (listTags) {
      const tags = await getAllBlockTags()
      return NextResponse.json({
        success: true,
        tags,
        count: tags.length,
        timestamp: new Date().toISOString(),
      })
    }

    if (tagCounts) {
      const counts = await getBlockTagCounts()
      const sortedCounts = Array.from(counts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)

      return NextResponse.json({
        success: true,
        tagCounts: sortedCounts,
        totalTags: sortedCounts.length,
        timestamp: new Date().toISOString(),
      })
    }

    // Search mode
    const tag = searchParams.get('tag')
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const weave = searchParams.get('weave') || undefined
    const loom = searchParams.get('loom') || undefined
    const minWorthiness = searchParams.get('minWorthiness')
      ? parseFloat(searchParams.get('minWorthiness')!)
      : undefined
    const blockTypesParam = searchParams.get('blockTypes')
    const blockTypes = blockTypesParam
      ? (blockTypesParam.split(',') as MarkdownBlockType[])
      : undefined

    // Must provide either tag or query
    if (!tag && !query) {
      return NextResponse.json(
        { error: 'Either tag or q query parameter is required' },
        { status: 400 }
      )
    }

    const options = {
      limit,
      offset,
      weave,
      loom,
      blockTypes,
      minWorthiness,
    }

    const results = tag
      ? await searchBlocksByTag(tag, options)
      : await searchBlocksFullText(query!, options)

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      query: tag ? { tag } : { q: query },
      options: { limit, offset, weave, loom, blockTypes, minWorthiness },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API] Block search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search blocks' },
      { status: 500 }
    )
  }
}
