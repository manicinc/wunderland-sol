/**
 * Taxonomy Index
 * @module lib/taxonomy/taxonomyIndex
 *
 * Builds and queries an index of all taxonomy terms across the codex.
 * Used by hierarchy enforcer to check for duplicates and overlaps.
 */

import { getDatabase } from '@/lib/codexDatabase'
import {
  type TaxonomyLevel,
  type TaxonomyStats,
  type TaxonomyHierarchyConfig,
  normalizeTerm,
  DEFAULT_TAXONOMY_CONFIG,
} from './hierarchyConfig'
import { findSimilarTerms } from './hierarchyEnforcer'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Entry in the taxonomy index
 */
export interface TaxonomyIndexEntry {
  /** Normalized term */
  term: string
  /** Original (non-normalized) term */
  originalTerm: string
  /** Taxonomy level (subject, topic, tag) */
  level: TaxonomyLevel
  /** Number of documents using this term */
  documentCount: number
  /** Paths to documents using this term */
  strandPaths: string[]
}

/**
 * Complete taxonomy index
 */
export interface TaxonomyIndex {
  /** All subjects indexed by normalized term */
  subjects: Map<string, TaxonomyIndexEntry>
  /** All topics indexed by normalized term */
  topics: Map<string, TaxonomyIndexEntry>
  /** All tags indexed by normalized term */
  tags: Map<string, TaxonomyIndexEntry>
  /** When the index was built */
  builtAt: Date
}

// ============================================================================
// INDEX BUILDING
// ============================================================================

/**
 * Build taxonomy index from database
 */
export async function buildTaxonomyIndex(): Promise<TaxonomyIndex> {
  const db = await getDatabase()
  if (!db) {
    return createEmptyIndex()
  }

  try {
    // Query all strands with their taxonomy data
    const rows = await db.all(`
      SELECT
        path,
        json_extract(metadata, '$.taxonomy.subjects') as subjects,
        json_extract(metadata, '$.taxonomy.topics') as topics,
        json_extract(metadata, '$.tags') as tags
      FROM codex_strands
      WHERE metadata IS NOT NULL
    `)

    const index: TaxonomyIndex = {
      subjects: new Map(),
      topics: new Map(),
      tags: new Map(),
      builtAt: new Date(),
    }

    for (const row of rows as any[]) {
      const path = row.path

      // Process subjects
      if (row.subjects) {
        try {
          const subjects = JSON.parse(row.subjects) as string[]
          for (const subject of subjects) {
            addToIndex(index.subjects, subject, 'subject', path)
          }
        } catch (err) {
          console.warn(`[TaxonomyIndex] Failed to parse subjects for ${path}:`, err)
        }
      }

      // Process topics
      if (row.topics) {
        try {
          const topics = JSON.parse(row.topics) as string[]
          for (const topic of topics) {
            addToIndex(index.topics, topic, 'topic', path)
          }
        } catch (err) {
          console.warn(`[TaxonomyIndex] Failed to parse topics for ${path}:`, err)
        }
      }

      // Process tags
      if (row.tags) {
        try {
          const tags = JSON.parse(row.tags) as string[]
          for (const tag of tags) {
            addToIndex(index.tags, tag, 'tag', path)
          }
        } catch (err) {
          console.warn(`[TaxonomyIndex] Failed to parse tags for ${path}:`, err)
        }
      }
    }

    return index
  } catch (err) {
    console.error('[TaxonomyIndex] Failed to build index:', err)
    return createEmptyIndex()
  }
}

/**
 * Add a term to an index map
 */
function addToIndex(
  map: Map<string, TaxonomyIndexEntry>,
  term: string,
  level: TaxonomyLevel,
  strandPath: string
): void {
  const normalized = normalizeTerm(term)
  if (!normalized) return

  const existing = map.get(normalized)
  if (existing) {
    existing.documentCount++
    if (!existing.strandPaths.includes(strandPath)) {
      existing.strandPaths.push(strandPath)
    }
  } else {
    map.set(normalized, {
      term: normalized,
      originalTerm: term,
      level,
      documentCount: 1,
      strandPaths: [strandPath],
    })
  }
}

/**
 * Create an empty index
 */
function createEmptyIndex(): TaxonomyIndex {
  return {
    subjects: new Map(),
    topics: new Map(),
    tags: new Map(),
    builtAt: new Date(),
  }
}

// ============================================================================
// INDEX QUERIES
// ============================================================================

/**
 * Get all subjects as a string array
 */
export function getAllSubjects(index: TaxonomyIndex): string[] {
  return Array.from(index.subjects.keys())
}

/**
 * Get all topics as a string array
 */
export function getAllTopics(index: TaxonomyIndex): string[] {
  return Array.from(index.topics.keys())
}

/**
 * Get all tags as a string array
 */
export function getAllTags(index: TaxonomyIndex): string[] {
  return Array.from(index.tags.keys())
}

/**
 * Find which level a term exists at (if any)
 */
export function findTermLevel(
  index: TaxonomyIndex,
  term: string,
  config: TaxonomyHierarchyConfig = DEFAULT_TAXONOMY_CONFIG
): { level: TaxonomyLevel; entry: TaxonomyIndexEntry } | null {
  const normalized = normalizeTerm(term)

  // Check subjects first
  const subjectEntry = index.subjects.get(normalized)
  if (subjectEntry) {
    return { level: 'subject', entry: subjectEntry }
  }

  // Check for similar subjects
  const similarSubjects = findSimilarTerms(term, getAllSubjects(index), config)
  if (similarSubjects.length > 0) {
    const entry = index.subjects.get(similarSubjects[0])
    if (entry) return { level: 'subject', entry }
  }

  // Check topics
  const topicEntry = index.topics.get(normalized)
  if (topicEntry) {
    return { level: 'topic', entry: topicEntry }
  }

  // Check for similar topics
  const similarTopics = findSimilarTerms(term, getAllTopics(index), config)
  if (similarTopics.length > 0) {
    const entry = index.topics.get(similarTopics[0])
    if (entry) return { level: 'topic', entry }
  }

  // Check tags
  const tagEntry = index.tags.get(normalized)
  if (tagEntry) {
    return { level: 'tag', entry: tagEntry }
  }

  // Check for similar tags
  const similarTags = findSimilarTerms(term, getAllTags(index), config)
  if (similarTags.length > 0) {
    const entry = index.tags.get(similarTags[0])
    if (entry) return { level: 'tag', entry }
  }

  return null
}

/**
 * Get terms by frequency (sorted by document count descending)
 */
export function getTermsByFrequency(
  index: TaxonomyIndex,
  level: TaxonomyLevel,
  limit: number = 50
): TaxonomyIndexEntry[] {
  const map = level === 'subject' ? index.subjects :
              level === 'topic' ? index.topics :
              index.tags

  return Array.from(map.values())
    .sort((a, b) => b.documentCount - a.documentCount)
    .slice(0, limit)
}

/**
 * Find overlapping terms (terms that appear in multiple levels)
 */
export function findOverlappingTerms(
  index: TaxonomyIndex,
  config: TaxonomyHierarchyConfig = DEFAULT_TAXONOMY_CONFIG
): Array<{
  term: string
  levels: TaxonomyLevel[]
  entries: TaxonomyIndexEntry[]
}> {
  const overlaps: Array<{
    term: string
    levels: TaxonomyLevel[]
    entries: TaxonomyIndexEntry[]
  }> = []

  // Check all subjects against topics and tags
  for (const [term, subjectEntry] of index.subjects) {
    const matchingTopics = findSimilarTerms(term, getAllTopics(index), config)
    const matchingTags = findSimilarTerms(term, getAllTags(index), config)

    if (matchingTopics.length > 0 || matchingTags.length > 0) {
      const levels: TaxonomyLevel[] = ['subject']
      const entries: TaxonomyIndexEntry[] = [subjectEntry]

      for (const t of matchingTopics) {
        const entry = index.topics.get(t)
        if (entry) {
          levels.push('topic')
          entries.push(entry)
        }
      }

      for (const t of matchingTags) {
        const entry = index.tags.get(t)
        if (entry) {
          levels.push('tag')
          entries.push(entry)
        }
      }

      overlaps.push({ term, levels, entries })
    }
  }

  // Check topics against tags (subjects already checked above)
  for (const [term, topicEntry] of index.topics) {
    // Skip if already found as subject overlap
    if (overlaps.some(o => o.levels.includes('topic') && findSimilarTerms(o.term, [term], config).length > 0)) {
      continue
    }

    const matchingTags = findSimilarTerms(term, getAllTags(index), config)
    if (matchingTags.length > 0) {
      const levels: TaxonomyLevel[] = ['topic']
      const entries: TaxonomyIndexEntry[] = [topicEntry]

      for (const t of matchingTags) {
        const entry = index.tags.get(t)
        if (entry) {
          levels.push('tag')
          entries.push(entry)
        }
      }

      overlaps.push({ term, levels, entries })
    }
  }

  return overlaps
}

/**
 * Calculate taxonomy statistics
 */
export async function calculateTaxonomyStats(
  index: TaxonomyIndex,
  config: TaxonomyHierarchyConfig = DEFAULT_TAXONOMY_CONFIG
): Promise<TaxonomyStats> {
  const db = await getDatabase()

  // Count documents
  let totalDocs = 0
  let docsOverSubjectLimit = 0
  let docsOverTopicLimit = 0
  let totalSubjectsInDocs = 0
  let totalTopicsInDocs = 0
  let totalTagsInDocs = 0

  if (db) {
    try {
      const rows = await db.all(`
        SELECT
          json_array_length(json_extract(metadata, '$.taxonomy.subjects')) as subjectCount,
          json_array_length(json_extract(metadata, '$.taxonomy.topics')) as topicCount,
          json_array_length(json_extract(metadata, '$.tags')) as tagCount
        FROM codex_strands
        WHERE metadata IS NOT NULL
      `)

      for (const row of rows as any[]) {
        totalDocs++
        const subjects = row.subjectCount || 0
        const topics = row.topicCount || 0
        const tags = row.tagCount || 0

        totalSubjectsInDocs += subjects
        totalTopicsInDocs += topics
        totalTagsInDocs += tags

        if (subjects > config.maxSubjectsPerDoc) {
          docsOverSubjectLimit++
        }
        if (topics > config.maxTopicsPerDoc) {
          docsOverTopicLimit++
        }
      }
    } catch (err) {
      console.warn('[TaxonomyIndex] Failed to calculate taxonomy stats:', err)
    }
  }

  const overlappingTerms = findOverlappingTerms(index, config)

  return {
    totalSubjects: index.subjects.size,
    totalTopics: index.topics.size,
    totalTags: index.tags.size,
    avgSubjectsPerDoc: totalDocs > 0 ? totalSubjectsInDocs / totalDocs : 0,
    avgTopicsPerDoc: totalDocs > 0 ? totalTopicsInDocs / totalDocs : 0,
    avgTagsPerDoc: totalDocs > 0 ? totalTagsInDocs / totalDocs : 0,
    docsOverSubjectLimit,
    docsOverTopicLimit,
    overlappingTerms: overlappingTerms.map(o => o.term),
  }
}

// ============================================================================
// INDEX MANAGEMENT
// ============================================================================

let cachedIndex: TaxonomyIndex | null = null
let cacheTime: Date | null = null
const CACHE_TTL_MS = 60000 // 1 minute

/**
 * Get the taxonomy index (cached)
 */
export async function getTaxonomyIndex(forceRefresh: boolean = false): Promise<TaxonomyIndex> {
  const now = new Date()

  if (
    !forceRefresh &&
    cachedIndex &&
    cacheTime &&
    now.getTime() - cacheTime.getTime() < CACHE_TTL_MS
  ) {
    return cachedIndex
  }

  cachedIndex = await buildTaxonomyIndex()
  cacheTime = now
  return cachedIndex
}

/**
 * Invalidate the cached index
 */
export function invalidateTaxonomyIndex(): void {
  cachedIndex = null
  cacheTime = null
}

/**
 * Update the index with new terms (without full rebuild)
 */
export function updateIndexWithTerms(
  index: TaxonomyIndex,
  strandPath: string,
  subjects: string[],
  topics: string[],
  tags: string[]
): TaxonomyIndex {
  for (const subject of subjects) {
    addToIndex(index.subjects, subject, 'subject', strandPath)
  }
  for (const topic of topics) {
    addToIndex(index.topics, topic, 'topic', strandPath)
  }
  for (const tag of tags) {
    addToIndex(index.tags, tag, 'tag', strandPath)
  }
  return index
}

export default getTaxonomyIndex
