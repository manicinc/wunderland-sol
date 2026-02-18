/**
 * Taxonomy Reclassification Job Processor
 * @module lib/jobs/processors/reclassifyTaxonomy
 *
 * Processes taxonomy reclassification jobs:
 * - Validates all strands against taxonomy hierarchy rules
 * - Detects duplicates across levels (subjects/topics/tags)
 * - Enforces per-document and global limits
 * - Optionally applies changes automatically
 *
 * Uses enhanced NLP similarity detection:
 * - Levenshtein distance for typo detection
 * - Soundex/Metaphone for phonetic matching
 * - N-gram Jaccard for fuzzy matching
 * - Acronym expansion (AI ↔ artificial-intelligence)
 * - Plural normalization (frameworks ↔ framework)
 * - Compound decomposition (MachineLearning ↔ machine-learning)
 */

import type { Job, JobResult, ReclassifyTaxonomyPayload, ReclassifyTaxonomyResult } from '../types'
import type { TaxonomyChange } from '@/lib/taxonomy/hierarchyConfig'
import type { JobProcessor } from '../jobQueue'
import { getLocalCodexDb } from '@/lib/storage/localCodex'
import {
  getTaxonomyIndex,
  invalidateTaxonomyIndex,
  getAllSubjects,
  getAllTopics,
  getAllTags,
} from '@/lib/taxonomy/taxonomyIndex'
import { validateDocumentTaxonomy, findSimilarTermsDetailed } from '@/lib/taxonomy/hierarchyEnforcer'
import { DEFAULT_TAXONOMY_CONFIG } from '@/lib/taxonomy/hierarchyConfig'

/**
 * Reclassify taxonomy processor
 *
 * Workflow:
 * 1. Build/refresh taxonomy index
 * 2. Fetch strands based on scope (all/weave/loom/strand)
 * 3. Validate each strand's taxonomy against hierarchy rules
 * 4. Generate change recommendations with confidence scores
 * 5. Optionally apply changes if autoApply is true
 * 6. Return summary statistics with change details
 */
export const reclassifyTaxonomyProcessor: JobProcessor = async (
  job: Job,
  onProgress: (progress: number, message: string) => void
): Promise<JobResult> => {
  const payload = job.payload as ReclassifyTaxonomyPayload
  const {
    scope,
    scopePath,
    config = DEFAULT_TAXONOMY_CONFIG,
    dryRun = true,
    autoApply = false,
  } = payload

  onProgress(0, 'Initializing taxonomy reclassification...')

  // Force refresh taxonomy index to get current state
  onProgress(5, 'Building taxonomy index...')
  invalidateTaxonomyIndex()
  const index = await getTaxonomyIndex(true)

  const globalSubjects = getAllSubjects(index)
  const globalTopics = getAllTopics(index)
  const globalTags = getAllTags(index)

  onProgress(10, `Found ${globalSubjects.length} subjects, ${globalTopics.length} topics, ${globalTags.length} tags`)

  // Fetch strands based on scope
  onProgress(15, 'Fetching strands...')
  const db = await getLocalCodexDb()
  const strands = await fetchStrandsForScope(db, scope, scopePath)

  if (strands.length === 0) {
    return {
      strandsProcessed: 0,
      subjectsRemoved: 0,
      subjectsDemoted: 0,
      topicsRemoved: 0,
      topicsDemoted: 0,
      tagsRemoved: 0,
      changes: [],
      dryRun,
    } as ReclassifyTaxonomyResult
  }

  onProgress(20, `Processing ${strands.length} strands...`)

  // Process each strand
  const allChanges: TaxonomyChange[] = []
  let processedCount = 0

  for (const strand of strands) {
    try {
      const metadata = strand.metadata ? JSON.parse(strand.metadata) : {}
      const subjects = metadata.taxonomy?.subjects || []
      const topics = metadata.taxonomy?.topics || []
      const tags = metadata.tags || []

      // Validate this strand's taxonomy
      const strandChanges = validateDocumentTaxonomy(
        strand.path,
        subjects,
        topics,
        tags,
        globalSubjects,
        globalTopics,
        globalTags,
        config
      )

      allChanges.push(...strandChanges)
    } catch (error) {
      console.warn(`[ReclassifyTaxonomy] Failed to process strand ${strand.path}:`, error)
    }

    processedCount++
    // Map 20-85% progress
    const progress = 20 + Math.round((processedCount / strands.length) * 65)
    if (processedCount % 10 === 0 || processedCount === strands.length) {
      onProgress(progress, `Processed ${processedCount}/${strands.length} strands...`)
    }
  }

  onProgress(85, `Found ${allChanges.length} recommended changes`)

  // Apply changes if not dry run and autoApply is true
  let appliedCount = 0
  if (!dryRun && autoApply && allChanges.length > 0) {
    onProgress(88, 'Applying changes...')

    for (const change of allChanges) {
      try {
        await applyTaxonomyChange(db, change)
        appliedCount++
      } catch (error) {
        console.warn(`[ReclassifyTaxonomy] Failed to apply change for ${change.strandPath}:`, error)
      }
    }

    // Invalidate index after changes
    invalidateTaxonomyIndex()

    onProgress(95, `Applied ${appliedCount}/${allChanges.length} changes`)
  }

  onProgress(100, 'Reclassification complete')

  // Calculate summary statistics
  const result: ReclassifyTaxonomyResult = {
    strandsProcessed: strands.length,
    subjectsRemoved: countChanges(allChanges, 'subjects', 'remove'),
    subjectsDemoted: countChanges(allChanges, 'subjects', 'demote'),
    topicsRemoved: countChanges(allChanges, 'topics', 'remove'),
    topicsDemoted: countChanges(allChanges, 'topics', 'demote'),
    tagsRemoved: countChanges(allChanges, 'tags', 'remove'),
    changes: allChanges,
    dryRun,
  }

  return result
}

/**
 * Fetch strands based on scope
 */
async function fetchStrandsForScope(
  db: any,
  scope: 'all' | 'weave' | 'loom' | 'strand',
  scopePath?: string
): Promise<Array<{ path: string; metadata: string }>> {
  let query = 'SELECT path, metadata FROM codex_strands WHERE metadata IS NOT NULL'
  const params: any[] = []

  switch (scope) {
    case 'all':
      // No additional filter
      break
    case 'weave':
      if (scopePath) {
        query += ' AND path LIKE ?'
        params.push(`${scopePath}/%`)
      }
      break
    case 'loom':
      if (scopePath) {
        query += ' AND path LIKE ?'
        params.push(`${scopePath}/%`)
      }
      break
    case 'strand':
      if (scopePath) {
        query += ' AND path = ?'
        params.push(scopePath)
      }
      break
  }

  query += ' ORDER BY path'

  try {
    return await db.all(query, params)
  } catch (error) {
    console.error('[ReclassifyTaxonomy] Failed to fetch strands:', error)
    return []
  }
}

/**
 * Apply a single taxonomy change to the database
 */
async function applyTaxonomyChange(db: any, change: TaxonomyChange): Promise<void> {
  // Fetch current metadata
  const row = await db.get(
    'SELECT metadata FROM codex_strands WHERE path = ?',
    [change.strandPath]
  )

  if (!row) {
    throw new Error(`Strand not found: ${change.strandPath}`)
  }

  const metadata = JSON.parse(row.metadata || '{}')

  // Initialize taxonomy structure if needed
  if (!metadata.taxonomy) {
    metadata.taxonomy = {}
  }

  switch (change.action) {
    case 'remove': {
      // Remove term from specified field
      if (change.field === 'subjects' && Array.isArray(metadata.taxonomy.subjects)) {
        metadata.taxonomy.subjects = metadata.taxonomy.subjects.filter(
          (t: string) => t.toLowerCase() !== change.term.toLowerCase()
        )
      } else if (change.field === 'topics' && Array.isArray(metadata.taxonomy.topics)) {
        metadata.taxonomy.topics = metadata.taxonomy.topics.filter(
          (t: string) => t.toLowerCase() !== change.term.toLowerCase()
        )
      } else if (change.field === 'tags' && Array.isArray(metadata.tags)) {
        metadata.tags = metadata.tags.filter(
          (t: string) => t.toLowerCase() !== change.term.toLowerCase()
        )
      }
      break
    }

    case 'demote': {
      // Remove from current level
      if (change.field === 'subjects' && Array.isArray(metadata.taxonomy.subjects)) {
        metadata.taxonomy.subjects = metadata.taxonomy.subjects.filter(
          (t: string) => t.toLowerCase() !== change.term.toLowerCase()
        )
        // Add to new level
        if (change.newLevel === 'topic') {
          if (!metadata.taxonomy.topics) metadata.taxonomy.topics = []
          if (!metadata.taxonomy.topics.some((t: string) => t.toLowerCase() === change.term.toLowerCase())) {
            metadata.taxonomy.topics.push(change.term)
          }
        } else if (change.newLevel === 'tag') {
          if (!metadata.tags) metadata.tags = []
          if (!metadata.tags.some((t: string) => t.toLowerCase() === change.term.toLowerCase())) {
            metadata.tags.push(change.term)
          }
        }
      } else if (change.field === 'topics' && Array.isArray(metadata.taxonomy.topics)) {
        metadata.taxonomy.topics = metadata.taxonomy.topics.filter(
          (t: string) => t.toLowerCase() !== change.term.toLowerCase()
        )
        // Add to tags
        if (change.newLevel === 'tag') {
          if (!metadata.tags) metadata.tags = []
          if (!metadata.tags.some((t: string) => t.toLowerCase() === change.term.toLowerCase())) {
            metadata.tags.push(change.term)
          }
        }
      }
      break
    }

    case 'promote': {
      // Remove from current level and add to higher level
      if (change.field === 'tags' && Array.isArray(metadata.tags)) {
        metadata.tags = metadata.tags.filter(
          (t: string) => t.toLowerCase() !== change.term.toLowerCase()
        )
        if (change.newLevel === 'topic') {
          if (!metadata.taxonomy.topics) metadata.taxonomy.topics = []
          metadata.taxonomy.topics.push(change.term)
        } else if (change.newLevel === 'subject') {
          if (!metadata.taxonomy.subjects) metadata.taxonomy.subjects = []
          metadata.taxonomy.subjects.push(change.term)
        }
      } else if (change.field === 'topics' && Array.isArray(metadata.taxonomy.topics)) {
        metadata.taxonomy.topics = metadata.taxonomy.topics.filter(
          (t: string) => t.toLowerCase() !== change.term.toLowerCase()
        )
        if (change.newLevel === 'subject') {
          if (!metadata.taxonomy.subjects) metadata.taxonomy.subjects = []
          metadata.taxonomy.subjects.push(change.term)
        }
      }
      break
    }

    case 'keep':
      // No action needed
      break
  }

  // Save updated metadata
  await db.run(
    'UPDATE codex_strands SET metadata = ?, updated_at = ? WHERE path = ?',
    [JSON.stringify(metadata), new Date().toISOString(), change.strandPath]
  )
}

/**
 * Count changes of a specific type
 */
function countChanges(
  changes: TaxonomyChange[],
  field: 'subjects' | 'topics' | 'tags',
  action: 'remove' | 'demote' | 'promote' | 'keep'
): number {
  return changes.filter(c => c.field === field && c.action === action).length
}

export default reclassifyTaxonomyProcessor
