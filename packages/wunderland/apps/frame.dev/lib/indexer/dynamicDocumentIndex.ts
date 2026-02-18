/**
 * Dynamic Document Index Extension
 * @module lib/indexer/dynamicDocumentIndex
 *
 * @description
 * Extends the content indexer with Embark-style dynamic document features:
 * - Formula results indexing for search
 * - Mention relationship graph
 * - Entity co-occurrence tracking
 * - View data summaries
 */

import { saveToIndexedDB, getFromIndexedDB } from '@/lib/storage/localCodex'
import type { MentionableEntity } from '@/lib/mentions/types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Indexed formula result for search
 */
export interface IndexedFormulaResult {
  /** Formula expression */
  formula: string
  /** Computed result */
  result: unknown
  /** Result as string for search */
  resultText: string
  /** Field name if from supertag */
  fieldName?: string
  /** Block ID containing the formula */
  blockId?: string
  /** Document path */
  strandPath: string
  /** Last computed */
  computedAt: string
}

/**
 * Mention relationship edge
 */
export interface MentionRelationship {
  /** Source mention ID */
  sourceId: string
  /** Target mention ID */
  targetId: string
  /** Relationship type */
  type: 'co-occurrence' | 'reference' | 'hierarchy' | 'temporal'
  /** Weight/strength of relationship (0-1) */
  weight: number
  /** Document where relationship exists */
  strandPath: string
  /** Context (nearby text) */
  context?: string
}

/**
 * Entity co-occurrence record
 */
export interface EntityCoOccurrence {
  /** Entity A ID */
  entityA: string
  /** Entity B ID */
  entityB: string
  /** Number of co-occurrences */
  count: number
  /** Average distance in content (tokens) */
  avgDistance: number
  /** Documents where they co-occur */
  documents: string[]
}

/**
 * Dynamic document index entry
 */
export interface DynamicDocumentIndexEntry {
  /** Document path */
  strandPath: string
  /** All mention entities */
  mentions: MentionableEntity[]
  /** Formula results */
  formulas: IndexedFormulaResult[]
  /** Relationship edges */
  relationships: MentionRelationship[]
  /** View summaries */
  views: Array<{
    type: string
    itemCount: number
    dataTypes: string[]
  }>
  /** Last indexed */
  indexedAt: string
}

/**
 * Search result from dynamic content
 */
export interface DynamicSearchResult {
  /** Source type */
  type: 'formula' | 'mention' | 'relationship' | 'view'
  /** Document path */
  strandPath: string
  /** Matched content */
  match: string
  /** Relevance score (0-1) */
  score: number
  /** Additional context */
  context?: Record<string, unknown>
}

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE KEYS
═══════════════════════════════════════════════════════════════════════════ */

const FORMULA_INDEX_KEY = 'dynamic-formula-index'
const MENTION_GRAPH_KEY = 'dynamic-mention-graph'
const COOCCURRENCE_KEY = 'dynamic-cooccurrence'

/* ═══════════════════════════════════════════════════════════════════════════
   FORMULA INDEXING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Index a formula result for search
 */
export async function indexFormulaResult(
  formula: string,
  result: unknown,
  strandPath: string,
  options?: {
    fieldName?: string
    blockId?: string
  }
): Promise<void> {
  // Convert result to searchable string
  const resultText = formatResultForSearch(result)
  
  const entry: IndexedFormulaResult = {
    formula,
    result,
    resultText,
    fieldName: options?.fieldName,
    blockId: options?.blockId,
    strandPath,
    computedAt: new Date().toISOString(),
  }
  
  // Get existing index
  const existingIndex = await getFormulaIndex()
  
  // Find or update entry
  const key = `${strandPath}:${options?.blockId || ''}:${formula}`
  existingIndex.set(key, entry)
  
  // Save updated index
  await saveToIndexedDB(FORMULA_INDEX_KEY, Object.fromEntries(existingIndex))
}

/**
 * Get the formula index
 */
async function getFormulaIndex(): Promise<Map<string, IndexedFormulaResult>> {
  try {
    const data = await getFromIndexedDB(FORMULA_INDEX_KEY)
    if (data && typeof data === 'object') {
      return new Map(Object.entries(data as Record<string, IndexedFormulaResult>))
    }
  } catch (error) {
    console.warn('[DynamicDocumentIndex] Error loading formula index:', error)
  }
  return new Map()
}

/**
 * Search formula results
 */
export async function searchFormulas(query: string): Promise<DynamicSearchResult[]> {
  const index = await getFormulaIndex()
  const results: DynamicSearchResult[] = []
  const lowerQuery = query.toLowerCase()
  
  for (const [, entry] of index) {
    // Match against formula expression, result text, and field name
    const matchScore = calculateMatchScore(lowerQuery, [
      entry.formula,
      entry.resultText,
      entry.fieldName || '',
    ])
    
    if (matchScore > 0.3) {
      results.push({
        type: 'formula',
        strandPath: entry.strandPath,
        match: `${entry.fieldName || 'Formula'}: ${entry.resultText}`,
        score: matchScore,
        context: {
          formula: entry.formula,
          result: entry.result,
          blockId: entry.blockId,
        },
      })
    }
  }
  
  return results.sort((a, b) => b.score - a.score)
}

/* ═══════════════════════════════════════════════════════════════════════════
   MENTION RELATIONSHIP INDEXING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Index mention relationships for a document
 */
export async function indexMentionRelationships(
  mentions: MentionableEntity[],
  strandPath: string,
  content: string
): Promise<void> {
  const relationships: MentionRelationship[] = []
  
  // Extract relationships based on proximity in content
  for (let i = 0; i < mentions.length; i++) {
    for (let j = i + 1; j < mentions.length; j++) {
      const mentionA = mentions[i]
      const mentionB = mentions[j]
      
      // Calculate proximity-based relationship
      const posA = content.toLowerCase().indexOf(mentionA.label.toLowerCase())
      const posB = content.toLowerCase().indexOf(mentionB.label.toLowerCase())
      
      if (posA >= 0 && posB >= 0) {
        const distance = Math.abs(posA - posB)
        const maxDistance = 500 // Characters
        
        if (distance < maxDistance) {
          const weight = 1 - (distance / maxDistance)
          
          relationships.push({
            sourceId: mentionA.id,
            targetId: mentionB.id,
            type: determineRelationshipType(mentionA, mentionB),
            weight,
            strandPath,
            context: extractContext(content, Math.min(posA, posB), Math.max(posA, posB)),
          })
        }
      }
    }
  }
  
  // Get existing graph and merge
  const existingGraph = await getMentionGraph()
  
  // Add/update relationships for this document
  const docRelationships = existingGraph.get(strandPath) || []
  existingGraph.set(strandPath, relationships)
  
  // Save updated graph
  await saveToIndexedDB(MENTION_GRAPH_KEY, Object.fromEntries(existingGraph))
  
  // Update co-occurrence counts
  await updateCoOccurrences(mentions, strandPath)
}

/**
 * Get the mention relationship graph
 */
async function getMentionGraph(): Promise<Map<string, MentionRelationship[]>> {
  try {
    const data = await getFromIndexedDB(MENTION_GRAPH_KEY)
    if (data && typeof data === 'object') {
      return new Map(Object.entries(data as Record<string, MentionRelationship[]>))
    }
  } catch (error) {
    console.warn('[DynamicDocumentIndex] Error loading mention graph:', error)
  }
  return new Map()
}

/**
 * Get related mentions for an entity
 */
export async function getRelatedMentions(
  entityId: string,
  limit = 10
): Promise<Array<{ entityId: string; weight: number; documents: string[] }>> {
  const graph = await getMentionGraph()
  const related = new Map<string, { weight: number; documents: Set<string> }>()
  
  for (const [strandPath, relationships] of graph) {
    for (const rel of relationships) {
      if (rel.sourceId === entityId) {
        const existing = related.get(rel.targetId) || { weight: 0, documents: new Set() }
        existing.weight += rel.weight
        existing.documents.add(strandPath)
        related.set(rel.targetId, existing)
      } else if (rel.targetId === entityId) {
        const existing = related.get(rel.sourceId) || { weight: 0, documents: new Set() }
        existing.weight += rel.weight
        existing.documents.add(strandPath)
        related.set(rel.sourceId, existing)
      }
    }
  }
  
  return Array.from(related.entries())
    .map(([entityId, data]) => ({
      entityId,
      weight: data.weight,
      documents: Array.from(data.documents),
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
}

/**
 * Search mention relationships
 */
export async function searchMentionRelationships(
  query: string
): Promise<DynamicSearchResult[]> {
  const graph = await getMentionGraph()
  const results: DynamicSearchResult[] = []
  const lowerQuery = query.toLowerCase()
  
  for (const [strandPath, relationships] of graph) {
    for (const rel of relationships) {
      if (rel.context && rel.context.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'relationship',
          strandPath,
          match: rel.context,
          score: rel.weight,
          context: {
            sourceId: rel.sourceId,
            targetId: rel.targetId,
            type: rel.type,
          },
        })
      }
    }
  }
  
  return results.sort((a, b) => b.score - a.score)
}

/* ═══════════════════════════════════════════════════════════════════════════
   CO-OCCURRENCE TRACKING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Update entity co-occurrence counts
 */
async function updateCoOccurrences(
  mentions: MentionableEntity[],
  strandPath: string
): Promise<void> {
  const cooccurrences = await getCoOccurrences()
  
  for (let i = 0; i < mentions.length; i++) {
    for (let j = i + 1; j < mentions.length; j++) {
      const key = [mentions[i].id, mentions[j].id].sort().join(':')
      
      const existing = cooccurrences.get(key) || {
        entityA: mentions[i].id,
        entityB: mentions[j].id,
        count: 0,
        avgDistance: 0,
        documents: [],
      }
      
      existing.count++
      if (!existing.documents.includes(strandPath)) {
        existing.documents.push(strandPath)
      }
      
      cooccurrences.set(key, existing)
    }
  }
  
  await saveToIndexedDB(COOCCURRENCE_KEY, Object.fromEntries(cooccurrences))
}

/**
 * Get co-occurrence data
 */
async function getCoOccurrences(): Promise<Map<string, EntityCoOccurrence>> {
  try {
    const data = await getFromIndexedDB(COOCCURRENCE_KEY)
    if (data && typeof data === 'object') {
      return new Map(Object.entries(data as Record<string, EntityCoOccurrence>))
    }
  } catch (error) {
    console.warn('[DynamicDocumentIndex] Error loading co-occurrences:', error)
  }
  return new Map()
}

/**
 * Get frequently co-occurring entities for an entity
 */
export async function getCoOccurringEntities(
  entityId: string,
  minCount = 2
): Promise<EntityCoOccurrence[]> {
  const cooccurrences = await getCoOccurrences()
  const results: EntityCoOccurrence[] = []
  
  for (const [, cooc] of cooccurrences) {
    if ((cooc.entityA === entityId || cooc.entityB === entityId) && cooc.count >= minCount) {
      results.push(cooc)
    }
  }
  
  return results.sort((a, b) => b.count - a.count)
}

/* ═══════════════════════════════════════════════════════════════════════════
   UNIFIED SEARCH
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Search across all dynamic document indices
 */
export async function searchDynamicContent(
  query: string,
  options?: {
    types?: Array<'formula' | 'mention' | 'relationship'>
    limit?: number
  }
): Promise<DynamicSearchResult[]> {
  const types = options?.types || ['formula', 'mention', 'relationship']
  const limit = options?.limit || 20
  
  const allResults: DynamicSearchResult[] = []
  
  if (types.includes('formula')) {
    const formulaResults = await searchFormulas(query)
    allResults.push(...formulaResults)
  }
  
  if (types.includes('relationship')) {
    const relationshipResults = await searchMentionRelationships(query)
    allResults.push(...relationshipResults)
  }
  
  // Sort by score and limit
  return allResults
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Format a result value for search indexing
 */
function formatResultForSearch(result: unknown): string {
  if (result === null || result === undefined) return ''
  
  if (typeof result === 'number') {
    return result.toLocaleString()
  }
  
  if (typeof result === 'string') {
    return result
  }
  
  if (Array.isArray(result)) {
    return result.map(formatResultForSearch).join(', ')
  }
  
  if (typeof result === 'object') {
    return JSON.stringify(result)
  }
  
  return String(result)
}

/**
 * Calculate match score between query and targets
 */
function calculateMatchScore(query: string, targets: string[]): number {
  let maxScore = 0
  
  for (const target of targets) {
    if (!target) continue
    const lowerTarget = target.toLowerCase()
    
    // Exact match
    if (lowerTarget === query) {
      return 1.0
    }
    
    // Contains match
    if (lowerTarget.includes(query)) {
      const score = 0.7 + (query.length / lowerTarget.length) * 0.3
      maxScore = Math.max(maxScore, score)
    }
    
    // Word-level match
    const queryWords = query.split(/\s+/)
    const targetWords = lowerTarget.split(/\s+/)
    
    const matchedWords = queryWords.filter(qw => 
      targetWords.some(tw => tw.includes(qw))
    )
    
    if (matchedWords.length > 0) {
      const score = 0.3 + (matchedWords.length / queryWords.length) * 0.4
      maxScore = Math.max(maxScore, score)
    }
  }
  
  return maxScore
}

/**
 * Determine relationship type between two mentions
 */
function determineRelationshipType(
  mentionA: MentionableEntity,
  mentionB: MentionableEntity
): MentionRelationship['type'] {
  // Temporal relationship (date + event/date)
  if (
    (mentionA.type === 'date' || mentionA.type === 'event') &&
    (mentionB.type === 'date' || mentionB.type === 'event')
  ) {
    return 'temporal'
  }
  
  // Hierarchy (same type entities)
  if (mentionA.type === mentionB.type) {
    return 'hierarchy'
  }
  
  // Reference (different types)
  if (mentionA.type !== mentionB.type) {
    return 'reference'
  }
  
  return 'co-occurrence'
}

/**
 * Extract context around positions
 */
function extractContext(content: string, start: number, end: number): string {
  const contextStart = Math.max(0, start - 50)
  const contextEnd = Math.min(content.length, end + 50)
  
  let context = content.slice(contextStart, contextEnd)
  
  // Clean up
  context = context.replace(/\n/g, ' ').trim()
  
  if (contextStart > 0) context = '...' + context
  if (contextEnd < content.length) context = context + '...'
  
  return context
}

/* ═══════════════════════════════════════════════════════════════════════════
   INDEX MANAGEMENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Reindex a document's dynamic content
 */
export async function reindexDynamicDocument(
  strandPath: string,
  mentions: MentionableEntity[],
  formulas: Array<{ formula: string; result: unknown; fieldName?: string; blockId?: string }>,
  content: string
): Promise<void> {
  // Index all formulas
  for (const f of formulas) {
    await indexFormulaResult(f.formula, f.result, strandPath, {
      fieldName: f.fieldName,
      blockId: f.blockId,
    })
  }
  
  // Index mention relationships
  await indexMentionRelationships(mentions, strandPath, content)
}

/**
 * Clear dynamic indices for a document
 */
export async function clearDynamicIndex(strandPath: string): Promise<void> {
  // Clear formulas for this document
  const formulaIndex = await getFormulaIndex()
  for (const [key] of formulaIndex) {
    if (key.startsWith(strandPath + ':')) {
      formulaIndex.delete(key)
    }
  }
  await saveToIndexedDB(FORMULA_INDEX_KEY, Object.fromEntries(formulaIndex))
  
  // Clear mention graph for this document
  const graph = await getMentionGraph()
  graph.delete(strandPath)
  await saveToIndexedDB(MENTION_GRAPH_KEY, Object.fromEntries(graph))
}

