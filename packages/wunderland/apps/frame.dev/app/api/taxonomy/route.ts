/**
 * Taxonomy API
 * @module api/taxonomy
 *
 * GET /api/taxonomy - Get taxonomy statistics and term counts
 * POST /api/taxonomy - Validate terms or start reclassification
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getTaxonomyStats,
  getTermCounts,
  getTopTerms,
  validateTerm,
  findDuplicates,
  startReclassification,
  refreshTaxonomyIndex,
  validateTermsBatch,
} from '@/lib/actions/taxonomyActions'
import type { TaxonomyLevel, TaxonomyHierarchyConfig } from '@/lib/taxonomy'

export const runtime = 'nodejs'

// ============================================================================
// GET /api/taxonomy
// ============================================================================

/**
 * GET /api/taxonomy
 *
 * Get taxonomy statistics, term counts, and top terms
 *
 * Query params:
 * - topN: number of top terms to return per level (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const topN = parseInt(searchParams.get('topN') || '20', 10)

    const [stats, counts, topTerms] = await Promise.all([
      getTaxonomyStats(),
      getTermCounts(),
      getTopTerms(topN),
    ])

    return NextResponse.json({
      success: true,
      stats,
      counts,
      topTerms,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API] Get taxonomy stats error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get taxonomy stats' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/taxonomy
// ============================================================================

interface ValidateRequest {
  action: 'validate'
  term: string
  level: TaxonomyLevel
  config?: Partial<TaxonomyHierarchyConfig>
}

interface FindDuplicatesRequest {
  action: 'find-duplicates'
  term: string
  config?: Partial<TaxonomyHierarchyConfig>
}

interface ValidateBatchRequest {
  action: 'validate-batch'
  terms: Array<{ term: string; level: TaxonomyLevel }>
  config?: Partial<TaxonomyHierarchyConfig>
}

interface ReclassifyRequest {
  action: 'reclassify'
  scope?: 'all' | 'weave' | 'loom' | 'strand'
  scopePath?: string
  config?: Partial<TaxonomyHierarchyConfig>
  dryRun?: boolean
  autoApply?: boolean
}

interface RefreshIndexRequest {
  action: 'refresh-index'
}

type PostRequest =
  | ValidateRequest
  | FindDuplicatesRequest
  | ValidateBatchRequest
  | ReclassifyRequest
  | RefreshIndexRequest

/**
 * POST /api/taxonomy
 *
 * Perform taxonomy operations:
 * - validate: Check if a term can be added at a level
 * - find-duplicates: Find similar terms across all levels
 * - validate-batch: Validate multiple terms at once
 * - reclassify: Start a reclassification job
 * - refresh-index: Force rebuild taxonomy index
 *
 * @example
 * ```typescript
 * // Validate a term
 * await fetch('/api/taxonomy', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     action: 'validate',
 *     term: 'machine learning',
 *     level: 'topic'
 *   })
 * })
 *
 * // Start reclassification (dry run)
 * await fetch('/api/taxonomy', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     action: 'reclassify',
 *     scope: 'all',
 *     dryRun: true
 *   })
 * })
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const body: PostRequest = await request.json()

    switch (body.action) {
      case 'validate': {
        const result = await validateTerm(body.term, body.level, body.config)
        return NextResponse.json({
          success: true,
          result,
        })
      }

      case 'find-duplicates': {
        const duplicates = await findDuplicates(body.term, body.config)
        const hasDuplicates =
          duplicates.subjects.length > 0 ||
          duplicates.topics.length > 0 ||
          duplicates.tags.length > 0

        return NextResponse.json({
          success: true,
          hasDuplicates,
          duplicates,
        })
      }

      case 'validate-batch': {
        if (!body.terms || body.terms.length === 0) {
          return NextResponse.json(
            { error: 'terms array is required and must not be empty' },
            { status: 400 }
          )
        }
        const results = await validateTermsBatch(body.terms, body.config)
        return NextResponse.json({
          success: true,
          results,
          summary: {
            total: results.length,
            accepted: results.filter(r => r.result.level !== null).length,
            rejected: results.filter(r => r.result.level === null).length,
          },
        })
      }

      case 'reclassify': {
        const result = await startReclassification({
          scope: body.scope,
          scopePath: body.scopePath,
          config: body.config,
          dryRun: body.dryRun,
          autoApply: body.autoApply,
        })

        if (!result.success) {
          return NextResponse.json(
            { error: result.error },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          jobId: result.jobId,
          message: result.jobId
            ? 'Reclassification job started'
            : 'A similar job is already running',
          links: result.jobId
            ? {
                status: `/api/jobs/${result.jobId}`,
              }
            : undefined,
        })
      }

      case 'refresh-index': {
        const result = await refreshTaxonomyIndex()
        if (!result.success) {
          return NextResponse.json(
            { error: result.error },
            { status: 500 }
          )
        }
        return NextResponse.json({
          success: true,
          message: 'Taxonomy index refreshed',
          counts: result.counts,
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${(body as any).action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[API] Taxonomy operation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform taxonomy operation' },
      { status: 500 }
    )
  }
}
