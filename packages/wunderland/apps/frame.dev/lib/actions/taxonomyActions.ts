/**
 * Taxonomy Server Actions
 * @module lib/actions/taxonomyActions
 *
 * Server-side functions for taxonomy operations.
 * These can be called from client components using Next.js server actions.
 */

'use server'

import {
  type TaxonomyLevel,
  type TaxonomyHierarchyConfig,
  type TaxonomyCheckResult,
  type TaxonomyStats,
  type TaxonomyChange,
  DEFAULT_TAXONOMY_CONFIG,
  determineTaxonomyLevel,
  findSimilarTermsDetailed,
  suggestBestLevel,
} from '@/lib/taxonomy'

import {
  getTaxonomyIndex,
  invalidateTaxonomyIndex,
  getAllSubjects,
  getAllTopics,
  getAllTags,
  calculateTaxonomyStats,
  findTermLevel,
} from '@/lib/taxonomy/taxonomyIndex'

import { enqueueJob } from '@/lib/jobs/jobQueue'
import type { ReclassifyTaxonomyPayload, ReclassifyTaxonomyResult } from '@/lib/jobs/types'

// ============================================================================
// VALIDATION ACTIONS
// ============================================================================

/**
 * Validate a term against the taxonomy hierarchy
 * Returns whether the term can be added at the specified level
 */
export async function validateTerm(
  term: string,
  intendedLevel: TaxonomyLevel,
  config: Partial<TaxonomyHierarchyConfig> = {}
): Promise<TaxonomyCheckResult> {
  const mergedConfig = { ...DEFAULT_TAXONOMY_CONFIG, ...config }
  const index = await getTaxonomyIndex()

  return determineTaxonomyLevel(
    term,
    intendedLevel,
    getAllSubjects(index),
    getAllTopics(index),
    getAllTags(index),
    mergedConfig
  )
}

/**
 * Find similar terms across all levels
 * Returns detailed similarity scores and match methods
 */
export async function findDuplicates(
  term: string,
  config: Partial<TaxonomyHierarchyConfig> = {}
): Promise<{
  subjects: Array<{ term: string; score: number; method: string }>
  topics: Array<{ term: string; score: number; method: string }>
  tags: Array<{ term: string; score: number; method: string }>
}> {
  const mergedConfig = { ...DEFAULT_TAXONOMY_CONFIG, ...config }
  const index = await getTaxonomyIndex()

  return {
    subjects: findSimilarTermsDetailed(term, getAllSubjects(index), mergedConfig),
    topics: findSimilarTermsDetailed(term, getAllTopics(index), mergedConfig),
    tags: findSimilarTermsDetailed(term, getAllTags(index), mergedConfig),
  }
}

/**
 * Suggest the best level for a term based on its usage frequency
 */
export async function suggestTermLevel(
  term: string,
  documentCount: number,
  config: Partial<TaxonomyHierarchyConfig> = {}
): Promise<TaxonomyLevel> {
  const mergedConfig = { ...DEFAULT_TAXONOMY_CONFIG, ...config }
  const index = await getTaxonomyIndex()

  return suggestBestLevel(
    term,
    documentCount,
    getAllSubjects(index),
    getAllTopics(index),
    getAllTags(index),
    mergedConfig
  )
}

/**
 * Check if a term exists at any level and return its location
 */
export async function findTermLocation(
  term: string,
  config: Partial<TaxonomyHierarchyConfig> = {}
): Promise<{
  exists: boolean
  level?: TaxonomyLevel
  matchedTerm?: string
  documentCount?: number
}> {
  const mergedConfig = { ...DEFAULT_TAXONOMY_CONFIG, ...config }
  const index = await getTaxonomyIndex()
  const result = findTermLevel(index, term, mergedConfig)

  if (result) {
    return {
      exists: true,
      level: result.level,
      matchedTerm: result.entry.originalTerm,
      documentCount: result.entry.documentCount,
    }
  }

  return { exists: false }
}

// ============================================================================
// STATISTICS ACTIONS
// ============================================================================

/**
 * Get current taxonomy statistics
 */
export async function getTaxonomyStats(
  config: Partial<TaxonomyHierarchyConfig> = {}
): Promise<TaxonomyStats> {
  const mergedConfig = { ...DEFAULT_TAXONOMY_CONFIG, ...config }
  const index = await getTaxonomyIndex()
  return calculateTaxonomyStats(index, mergedConfig)
}

/**
 * Get term counts by level
 */
export async function getTermCounts(): Promise<{
  subjects: number
  topics: number
  tags: number
}> {
  const index = await getTaxonomyIndex()
  return {
    subjects: getAllSubjects(index).length,
    topics: getAllTopics(index).length,
    tags: getAllTags(index).length,
  }
}

/**
 * Get the most frequently used terms at each level
 */
export async function getTopTerms(limit: number = 20): Promise<{
  subjects: Array<{ term: string; count: number }>
  topics: Array<{ term: string; count: number }>
  tags: Array<{ term: string; count: number }>
}> {
  const index = await getTaxonomyIndex()

  const getSortedTerms = (entries: Map<string, { documentCount: number; originalTerm: string }>) => {
    return Array.from(entries.values())
      .sort((a, b) => b.documentCount - a.documentCount)
      .slice(0, limit)
      .map(e => ({ term: e.originalTerm, count: e.documentCount }))
  }

  return {
    subjects: getSortedTerms(index.subjects as any),
    topics: getSortedTerms(index.topics as any),
    tags: getSortedTerms(index.tags as any),
  }
}

// ============================================================================
// RECLASSIFICATION ACTIONS
// ============================================================================

/**
 * Start a taxonomy reclassification job
 * Returns the job ID for tracking progress
 */
export async function startReclassification(
  options: {
    scope?: 'all' | 'weave' | 'loom' | 'strand'
    scopePath?: string
    config?: Partial<TaxonomyHierarchyConfig>
    dryRun?: boolean
    autoApply?: boolean
  } = {}
): Promise<{ success: boolean; jobId?: string | null; error?: string }> {
  const {
    scope = 'all',
    scopePath,
    config = {},
    dryRun = true,
    autoApply = false,
  } = options

  const payload: ReclassifyTaxonomyPayload = {
    scope,
    scopePath,
    config: { ...DEFAULT_TAXONOMY_CONFIG, ...config },
    dryRun,
    autoApply,
  }

  try {
    const jobId = await enqueueJob('reclassify-taxonomy', payload)
    return { success: true, jobId }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Refresh the taxonomy index (force rebuild)
 */
export async function refreshTaxonomyIndex(): Promise<{
  success: boolean
  counts?: { subjects: number; topics: number; tags: number }
  error?: string
}> {
  try {
    invalidateTaxonomyIndex()
    const index = await getTaxonomyIndex(true)

    return {
      success: true,
      counts: {
        subjects: getAllSubjects(index).length,
        topics: getAllTopics(index).length,
        tags: getAllTags(index).length,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

// ============================================================================
// BATCH VALIDATION
// ============================================================================

/**
 * Validate multiple terms at once
 * Useful for import validation or bulk editing
 */
export async function validateTermsBatch(
  terms: Array<{ term: string; level: TaxonomyLevel }>,
  config: Partial<TaxonomyHierarchyConfig> = {}
): Promise<Array<{
  term: string
  intendedLevel: TaxonomyLevel
  result: TaxonomyCheckResult
}>> {
  const mergedConfig = { ...DEFAULT_TAXONOMY_CONFIG, ...config }
  const index = await getTaxonomyIndex()

  const subjects = getAllSubjects(index)
  const topics = getAllTopics(index)
  const tags = getAllTags(index)

  return terms.map(({ term, level }) => ({
    term,
    intendedLevel: level,
    result: determineTaxonomyLevel(term, level, subjects, topics, tags, mergedConfig),
  }))
}

/**
 * Check for duplicates across a list of terms (for import preview)
 */
export async function checkImportDuplicates(
  terms: string[],
  config: Partial<TaxonomyHierarchyConfig> = {}
): Promise<Array<{
  term: string
  hasDuplicate: boolean
  duplicateAt?: TaxonomyLevel
  matchedTerm?: string
  score?: number
}>> {
  const mergedConfig = { ...DEFAULT_TAXONOMY_CONFIG, ...config }
  const index = await getTaxonomyIndex()

  return terms.map(term => {
    const result = findTermLevel(index, term, mergedConfig)
    if (result) {
      return {
        term,
        hasDuplicate: true,
        duplicateAt: result.level,
        matchedTerm: result.entry.originalTerm,
      }
    }
    return { term, hasDuplicate: false }
  })
}
