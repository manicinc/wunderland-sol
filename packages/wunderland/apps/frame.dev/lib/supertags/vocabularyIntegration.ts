/**
 * Vocabulary ↔ Supertag Integration
 * @module lib/supertags/vocabularyIntegration
 *
 * Connects the dynamic vocabulary classification system to supertag suggestions
 * and auto-population of vocabulary-based supertag fields.
 *
 * Features:
 * - Suggest supertags based on content vocabulary classification
 * - Auto-populate vocabulary-based fields when applying supertags
 * - Map vocabulary categories (subjects, topics, skills) to supertag recommendations
 */

import { getVocabularyService, type ClassificationResult } from '@/lib/indexer/vocabularyService'
import type { SupertagSchema, SupertagFieldDefinition, BuiltInSupertag } from './types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SupertagSuggestion {
  /** Supertag name (e.g., 'project', 'article') */
  tagName: string
  /** Confidence score (0-1) */
  confidence: number
  /** Explanation for the suggestion */
  reason: string
  /** Which vocabulary categories contributed */
  sources: Array<{
    category: 'subject' | 'topic' | 'tag' | 'skill' | 'difficulty'
    term: string
    score: number
  }>
}

export interface VocabularyEnrichment {
  /** Field name from supertag schema */
  fieldName: string
  /** Suggested value */
  value: unknown
  /** Source of the suggestion */
  source: 'classification' | 'inference'
  /** Confidence in the suggestion (0-1) */
  confidence: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   VOCABULARY → SUPERTAG MAPPINGS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Mapping from vocabulary classification terms to suggested supertags
 *
 * Format: { vocabularyTerm: [supertagName, ...] }
 * The first supertag in the array has highest affinity
 */
export const VOCABULARY_SUPERTAG_MAPPINGS: Record<string, BuiltInSupertag[]> = {
  // Subjects (highest level classification)
  technology: ['project', 'article'],
  science: ['article', 'book', 'idea'],
  philosophy: ['idea', 'book', 'question'],
  ai: ['project', 'idea', 'article'],
  knowledge: ['book', 'article'],

  // Topics (second level)
  'getting-started': ['task'],
  architecture: ['project', 'decision'],
  troubleshooting: ['task', 'question'],
  performance: ['project', 'task'],
  security: ['decision', 'project'],

  // Difficulty
  beginner: ['habit'],
  intermediate: ['task', 'article'],
  advanced: ['project', 'article'],

  // General tags
  tutorial: ['article'],
  guide: ['article'],
  meeting: ['meeting'],
  person: ['person'],
  event: ['event'],
  book: ['book'],
  article: ['article'],
  task: ['task'],
  idea: ['idea'],
  question: ['question'],
  decision: ['decision'],
  project: ['project'],
  habit: ['habit'],
}

/**
 * Inverse mapping: supertag → relevant vocabulary categories
 * Used for understanding which content fits a supertag
 */
export const SUPERTAG_VOCABULARY_AFFINITY: Record<BuiltInSupertag, {
  subjects: string[]
  topics: string[]
  difficulty: string[]
}> = {
  person: { subjects: [], topics: [], difficulty: [] },
  meeting: { subjects: ['knowledge'], topics: ['architecture', 'planning'], difficulty: [] },
  task: { subjects: ['technology'], topics: ['troubleshooting', 'getting-started'], difficulty: ['intermediate'] },
  habit: { subjects: [], topics: [], difficulty: ['beginner'] },
  book: { subjects: ['knowledge', 'science', 'philosophy'], topics: [], difficulty: ['advanced', 'intermediate'] },
  article: { subjects: ['technology', 'science', 'ai', 'knowledge'], topics: ['getting-started', 'architecture'], difficulty: [] },
  project: { subjects: ['technology', 'ai'], topics: ['architecture', 'performance', 'security'], difficulty: ['advanced', 'intermediate'] },
  idea: { subjects: ['ai', 'philosophy', 'science'], topics: [], difficulty: [] },
  question: { subjects: ['philosophy', 'science'], topics: ['troubleshooting', 'getting-started'], difficulty: ['beginner', 'intermediate'] },
  decision: { subjects: ['technology'], topics: ['architecture', 'security'], difficulty: ['advanced'] },
  event: { subjects: [], topics: [], difficulty: [] },
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUPERTAG SUGGESTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Suggest supertags based on vocabulary classification of content
 *
 * @param content - Text content to analyze
 * @returns Array of supertag suggestions sorted by confidence
 */
export async function suggestSupertags(content: string): Promise<SupertagSuggestion[]> {
  const service = getVocabularyService()
  await service.initialize()

  const classification = await service.classify(content)
  return suggestSupertagsFromClassification(classification)
}

/**
 * Suggest supertags from a pre-computed classification result
 *
 * @param classification - Vocabulary classification result
 * @returns Array of supertag suggestions sorted by confidence
 */
export function suggestSupertagsFromClassification(
  classification: ClassificationResult
): SupertagSuggestion[] {
  const suggestions = new Map<string, {
    confidence: number
    sources: SupertagSuggestion['sources']
  }>()

  // Process subjects (highest weight: 1.0)
  for (const subject of classification.subjects) {
    const term = typeof subject === 'string' ? subject : subject
    const score = 1.0
    const tags = VOCABULARY_SUPERTAG_MAPPINGS[term.toLowerCase()] || []

    for (const tag of tags) {
      const existing = suggestions.get(tag) || { confidence: 0, sources: [] }
      existing.confidence = Math.max(existing.confidence, score * 0.95)
      existing.sources.push({ category: 'subject', term, score })
      suggestions.set(tag, existing)
    }
  }

  // Process topics (weight: 0.9)
  for (const topic of classification.topics) {
    const term = typeof topic === 'string' ? topic : topic
    const score = 0.9
    const tags = VOCABULARY_SUPERTAG_MAPPINGS[term.toLowerCase()] || []

    for (const tag of tags) {
      const existing = suggestions.get(tag) || { confidence: 0, sources: [] }
      existing.confidence = Math.max(existing.confidence, score * 0.9)
      existing.sources.push({ category: 'topic', term, score })
      suggestions.set(tag, existing)
    }
  }

  // Process skills (weight: 0.7)
  for (const skill of classification.skills) {
    const term = typeof skill === 'string' ? skill : skill
    const score = 0.7
    const tags = VOCABULARY_SUPERTAG_MAPPINGS[term.toLowerCase()] || []

    for (const tag of tags) {
      const existing = suggestions.get(tag) || { confidence: 0, sources: [] }
      existing.confidence = Math.max(existing.confidence, score * 0.8)
      existing.sources.push({ category: 'skill', term, score })
      suggestions.set(tag, existing)
    }
  }

  // Process difficulty (weight: 0.6)
  if (classification.difficulty) {
    const term = classification.difficulty
    const score = 0.6
    const tags = VOCABULARY_SUPERTAG_MAPPINGS[term.toLowerCase()] || []

    for (const tag of tags) {
      const existing = suggestions.get(tag) || { confidence: 0, sources: [] }
      existing.confidence = Math.max(existing.confidence, score * 0.7)
      existing.sources.push({ category: 'difficulty', term, score })
      suggestions.set(tag, existing)
    }
  }

  // Process lightweight tags (weight: 0.5)
  for (const keyword of classification.keywords || []) {
    const term = typeof keyword === 'string' ? keyword : keyword
    const score = 0.5
    const tags = VOCABULARY_SUPERTAG_MAPPINGS[term.toLowerCase()] || []

    for (const tag of tags) {
      const existing = suggestions.get(tag) || { confidence: 0, sources: [] }
      existing.confidence = Math.max(existing.confidence, score * 0.6)
      existing.sources.push({ category: 'tag', term, score })
      suggestions.set(tag, existing)
    }
  }

  // Build and sort results
  const results: SupertagSuggestion[] = Array.from(suggestions.entries())
    .map(([tagName, data]) => ({
      tagName,
      confidence: data.confidence,
      reason: buildReason(data.sources),
      sources: data.sources,
    }))
    .filter(s => s.confidence >= 0.3) // Minimum threshold
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5) // Top 5 suggestions

  return results
}

/**
 * Build a human-readable reason from sources
 */
function buildReason(sources: SupertagSuggestion['sources']): string {
  const grouped = new Map<string, string[]>()

  for (const source of sources) {
    const existing = grouped.get(source.category) || []
    existing.push(source.term)
    grouped.set(source.category, existing)
  }

  const parts: string[] = []
  for (const [category, terms] of grouped) {
    parts.push(`${category}: ${terms.join(', ')}`)
  }

  return parts.join('; ')
}

/* ═══════════════════════════════════════════════════════════════════════════
   FIELD ENRICHMENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Auto-populate vocabulary-based fields when applying a supertag
 *
 * Maps vocabulary classification results to appropriate supertag fields:
 * - 'subject' or 'category' fields → classification.subjects
 * - 'difficulty' or 'level' fields → classification.difficulty
 * - 'topics' fields → classification.topics
 * - 'tags' or 'keywords' fields → classification.keywords
 * - 'skills' or 'technologies' or 'prerequisites' fields → classification.skills
 *
 * @param blockContent - Content of the block
 * @param schema - Supertag schema to enrich for
 * @returns Map of field names to suggested values
 */
export async function enrichSupertagWithVocabulary(
  blockContent: string,
  schema: SupertagSchema
): Promise<VocabularyEnrichment[]> {
  const service = getVocabularyService()
  await service.initialize()

  const classification = await service.classify(blockContent)
  return enrichFromClassification(classification, schema)
}

/**
 * Enrich fields from a pre-computed classification
 */
export function enrichFromClassification(
  classification: ClassificationResult,
  schema: SupertagSchema
): VocabularyEnrichment[] {
  const enrichments: VocabularyEnrichment[] = []

  for (const field of schema.fields) {
    const enrichment = enrichField(field, classification)
    if (enrichment) {
      enrichments.push(enrichment)
    }
  }

  return enrichments
}

/**
 * Try to enrich a single field from classification
 */
function enrichField(
  field: SupertagFieldDefinition,
  classification: ClassificationResult
): VocabularyEnrichment | null {
  const fieldNameLower = field.name.toLowerCase()

  // Subject/category fields
  if (['subject', 'category', 'area', 'domain'].includes(fieldNameLower)) {
    if (classification.subjects.length > 0) {
      const value = classification.subjects[0]
      return {
        fieldName: field.name,
        value: typeof value === 'string' ? value : value,
        source: 'classification',
        confidence: 0.8,
      }
    }
  }

  // Difficulty/level fields
  if (['difficulty', 'level', 'complexity'].includes(fieldNameLower)) {
    if (classification.difficulty) {
      return {
        fieldName: field.name,
        value: classification.difficulty,
        source: 'classification',
        confidence: 0.85,
      }
    }
  }

  // Topics fields
  if (['topics', 'topic', 'themes', 'theme'].includes(fieldNameLower)) {
    if (classification.topics.length > 0) {
      const value = field.type === 'multiselect' || field.type === 'tags'
        ? classification.topics.map(t => typeof t === 'string' ? t : t)
        : (typeof classification.topics[0] === 'string' ? classification.topics[0] : classification.topics[0])
      return {
        fieldName: field.name,
        value,
        source: 'classification',
        confidence: 0.75,
      }
    }
  }

  // Tags/keywords fields
  if (['tags', 'keywords', 'labels'].includes(fieldNameLower)) {
    if (classification.keywords.length > 0) {
      return {
        fieldName: field.name,
        value: classification.keywords.map(k => typeof k === 'string' ? k : k),
        source: 'classification',
        confidence: 0.7,
      }
    }
  }

  // Skills/technologies/prerequisites fields
  if (['skills', 'technologies', 'tech', 'prerequisites', 'requirements'].includes(fieldNameLower)) {
    if (classification.skills.length > 0) {
      const value = field.type === 'multiselect' || field.type === 'tags'
        ? classification.skills.map(s => typeof s === 'string' ? s : s)
        : (typeof classification.skills[0] === 'string' ? classification.skills[0] : classification.skills[0])
      return {
        fieldName: field.name,
        value,
        source: 'classification',
        confidence: 0.75,
      }
    }
  }

  return null
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTENT AFFINITY
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Calculate how well content fits a specific supertag
 *
 * Returns a score (0-1) indicating how appropriate the supertag is
 * for the given content based on vocabulary classification.
 *
 * @param content - Text content to analyze
 * @param supertagName - Name of the supertag to check affinity for
 * @returns Affinity score (0-1)
 */
export async function calculateSupertagAffinity(
  content: string,
  supertagName: string
): Promise<number> {
  const service = getVocabularyService()
  await service.initialize()

  const classification = await service.classify(content)
  return calculateAffinityFromClassification(classification, supertagName as BuiltInSupertag)
}

/**
 * Calculate affinity from a pre-computed classification
 */
export function calculateAffinityFromClassification(
  classification: ClassificationResult,
  supertagName: BuiltInSupertag
): number {
  const affinity = SUPERTAG_VOCABULARY_AFFINITY[supertagName]
  if (!affinity) return 0

  let score = 0
  let matches = 0

  // Check subject matches
  for (const subject of classification.subjects) {
    const term = typeof subject === 'string' ? subject : subject
    if (affinity.subjects.includes(term.toLowerCase())) {
      score += 1.0
      matches++
    }
  }

  // Check topic matches
  for (const topic of classification.topics) {
    const term = typeof topic === 'string' ? topic : topic
    if (affinity.topics.includes(term.toLowerCase())) {
      score += 0.8
      matches++
    }
  }

  // Check difficulty match
  if (classification.difficulty && affinity.difficulty.includes(classification.difficulty.toLowerCase())) {
    score += 0.6
    matches++
  }

  if (matches === 0) return 0

  // Normalize: average score capped at 1.0
  return Math.min(1.0, score / Math.max(matches, 1))
}

/**
 * Get all supertags sorted by affinity for content
 *
 * @param content - Text content to analyze
 * @returns Array of supertag names with their affinity scores
 */
export async function getSupertagsByAffinity(
  content: string
): Promise<Array<{ tagName: BuiltInSupertag; affinity: number }>> {
  const service = getVocabularyService()
  await service.initialize()

  const classification = await service.classify(content)

  const affinities = Object.keys(SUPERTAG_VOCABULARY_AFFINITY).map(tagName => ({
    tagName: tagName as BuiltInSupertag,
    affinity: calculateAffinityFromClassification(classification, tagName as BuiltInSupertag),
  }))

  return affinities
    .filter(a => a.affinity > 0)
    .sort((a, b) => b.affinity - a.affinity)
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
   Note: All functions are exported inline with their definitions above.
   This section is kept for documentation purposes.
   Exported functions:
   - suggestSupertags
   - suggestSupertagsFromClassification
   - enrichSupertagWithVocabulary
   - enrichFromClassification
   - calculateSupertagAffinity
   - calculateAffinityFromClassification
   - getSupertagsByAffinity
═══════════════════════════════════════════════════════════════════════════ */
