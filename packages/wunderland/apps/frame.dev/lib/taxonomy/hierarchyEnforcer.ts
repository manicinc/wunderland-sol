/**
 * Taxonomy Hierarchy Enforcer
 * @module lib/taxonomy/hierarchyEnforcer
 *
 * Core logic for enforcing taxonomy hierarchy:
 * - Subjects (broad) < Topics (mid-level) < Tags (specific)
 * - Cross-level deduplication (term can't exist in multiple levels)
 * - Enhanced similarity checking with multiple NLP techniques:
 *   - Levenshtein distance (typo detection)
 *   - Soundex/Metaphone (phonetic matching)
 *   - N-gram Jaccard (fuzzy matching)
 *   - Acronym expansion (AI ↔ artificial-intelligence)
 *   - Plural normalization (frameworks ↔ framework)
 *   - Compound decomposition (MachineLearning ↔ machine-learning)
 */

import {
  type TaxonomyLevel,
  type TaxonomyHierarchyConfig,
  type TaxonomyCheckResult,
  type TaxonomyChange,
  normalizeTerm,
  getLevelOrder,
  demoteLevel,
  DEFAULT_TAXONOMY_CONFIG,
} from './hierarchyConfig'

import {
  calculateSimilarityScore,
  findSimilarTermsWithScores,
  type SimilarityResult,
} from './similarityUtils'

// ============================================================================
// SIMILARITY UTILITIES
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 * Used to detect typos and variants (e.g., "react" vs "reactjs")
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Check if two terms are similar based on Levenshtein distance
 */
export function areSimilarByDistance(
  a: string,
  b: string,
  threshold: number
): boolean {
  const normA = normalizeTerm(a)
  const normB = normalizeTerm(b)
  return levenshteinDistance(normA, normB) <= threshold
}

/**
 * Check if one term is a substring of another (above minimum length)
 */
export function areSimilarBySubstring(
  a: string,
  b: string,
  minLength: number
): boolean {
  const normA = normalizeTerm(a)
  const normB = normalizeTerm(b)

  // Skip if either is too short
  if (normA.length < minLength || normB.length < minLength) {
    return false
  }

  // Check if one contains the other
  return normA.includes(normB) || normB.includes(normA)
}

/**
 * Check if two terms are similar using the enhanced NLP similarity pipeline
 *
 * The pipeline checks (in order of specificity):
 * 1. Exact match after normalization
 * 2. Acronym expansion (AI ↔ artificial-intelligence)
 * 3. Plural normalization (frameworks ↔ framework)
 * 4. Compound decomposition (MachineLearning ↔ machine-learning)
 * 5. Levenshtein distance (typo detection)
 * 6. Phonetic matching (colour ↔ color)
 * 7. N-gram Jaccard similarity
 * 8. Substring matching
 *
 * @returns true if similarity score >= threshold
 */
export function areSimilar(
  a: string,
  b: string,
  config: TaxonomyHierarchyConfig
): boolean {
  const result = calculateSimilarityScore(a, b, config)
  const threshold = config.similarityScoreThreshold ?? 0.7
  return result.score >= threshold
}

/**
 * Check if two terms are similar (legacy method - uses basic checks only)
 * Kept for backwards compatibility
 * @deprecated Use areSimilar() which uses the full NLP pipeline
 */
export function areSimilarBasic(
  a: string,
  b: string,
  config: TaxonomyHierarchyConfig
): boolean {
  // Exact match (after normalization)
  if (normalizeTerm(a) === normalizeTerm(b)) {
    return true
  }

  // Levenshtein distance check
  if (areSimilarByDistance(a, b, config.levenshteinThreshold)) {
    return true
  }

  // Substring check
  if (areSimilarBySubstring(a, b, config.substringMinLength)) {
    return true
  }

  return false
}

/**
 * Find similar terms in a list using the enhanced NLP pipeline
 * Returns terms sorted by similarity score (highest first)
 */
export function findSimilarTerms(
  term: string,
  existingTerms: string[],
  config: TaxonomyHierarchyConfig
): string[] {
  const matches = findSimilarTermsWithScores(term, existingTerms, config)
  return matches.map(m => m.term)
}

/**
 * Find similar terms with detailed scoring information
 * Useful for debugging and UI feedback
 */
export function findSimilarTermsDetailed(
  term: string,
  existingTerms: string[],
  config: TaxonomyHierarchyConfig
): Array<{ term: string; score: number; method: SimilarityResult['method'] }> {
  return findSimilarTermsWithScores(term, existingTerms, config)
}

// ============================================================================
// MAIN ENFORCEMENT LOGIC
// ============================================================================

/**
 * Determine the appropriate taxonomy level for a term
 *
 * Check Order (cascade from most general to most specific):
 * 1. Check against all subjects (if match, term is already classified)
 * 2. Check against all topics (if match and intended for tag, already classified)
 * 3. Check against all tags (dedup within same level)
 * 4. If no match, assign to intended level with count validation
 *
 * @param term - The term to classify
 * @param intendedLevel - Where the user/system wants to put it
 * @param existingSubjects - All subjects across the codex
 * @param existingTopics - All topics across the codex
 * @param existingTags - All tags across the codex
 * @param config - Hierarchy configuration
 * @returns Classification result with reasoning
 */
export function determineTaxonomyLevel(
  term: string,
  intendedLevel: TaxonomyLevel,
  existingSubjects: string[],
  existingTopics: string[],
  existingTags: string[],
  config: TaxonomyHierarchyConfig = DEFAULT_TAXONOMY_CONFIG
): TaxonomyCheckResult {
  const normalized = normalizeTerm(term)

  // ========== Step 1: Check against SUBJECTS (highest priority) ==========
  const matchingSubjects = findSimilarTerms(term, existingSubjects, config)
  if (matchingSubjects.length > 0) {
    const matched = matchingSubjects[0]
    if (intendedLevel === 'subject') {
      return {
        level: null,
        matchedTerm: matched,
        matchedLevel: 'subject',
        reasoning: `Duplicate: "${term}" already exists as subject "${matched}"`,
        severity: 'error',
      }
    } else {
      // Trying to add as topic/tag but it's already a subject
      return {
        level: null,
        matchedTerm: matched,
        matchedLevel: 'subject',
        reasoning: `"${term}" is already a subject ("${matched}"). Cannot also be a ${intendedLevel}.`,
        severity: 'error',
      }
    }
  }

  // ========== Step 2: Check against TOPICS ==========
  const matchingTopics = findSimilarTerms(term, existingTopics, config)
  if (matchingTopics.length > 0) {
    const matched = matchingTopics[0]
    if (intendedLevel === 'topic') {
      return {
        level: null,
        matchedTerm: matched,
        matchedLevel: 'topic',
        reasoning: `Duplicate: "${term}" already exists as topic "${matched}"`,
        severity: 'error',
      }
    } else if (intendedLevel === 'tag') {
      // Trying to add as tag but it's already a topic
      return {
        level: null,
        matchedTerm: matched,
        matchedLevel: 'topic',
        reasoning: `"${term}" is already a topic ("${matched}"). Cannot also be a tag.`,
        severity: 'error',
      }
    } else if (intendedLevel === 'subject') {
      // Trying to PROMOTE topic to subject - this might be allowed
      return {
        level: 'subject',
        matchedTerm: matched,
        matchedLevel: 'topic',
        reasoning: `"${term}" exists as topic "${matched}". Promoting to subject.`,
        severity: 'warning',
      }
    }
  }

  // ========== Step 3: Check against TAGS ==========
  const matchingTags = findSimilarTerms(term, existingTags, config)
  if (matchingTags.length > 0) {
    const matched = matchingTags[0]
    if (intendedLevel === 'tag') {
      return {
        level: null,
        matchedTerm: matched,
        matchedLevel: 'tag',
        reasoning: `Duplicate: "${term}" already exists as tag "${matched}"`,
        severity: 'error',
      }
    } else {
      // Trying to PROMOTE tag to topic/subject - this might be allowed
      return {
        level: intendedLevel,
        matchedTerm: matched,
        matchedLevel: 'tag',
        reasoning: `"${term}" exists as tag "${matched}". Promoting to ${intendedLevel}.`,
        severity: 'warning',
      }
    }
  }

  // ========== Step 4: No match found - check global limits ==========
  const currentCounts = {
    subject: existingSubjects.length,
    topic: existingTopics.length,
    tag: existingTags.length,
  }

  const globalLimits = {
    subject: config.maxTotalSubjects,
    topic: config.maxTotalTopics,
    tag: Infinity,
  }

  if (currentCounts[intendedLevel] >= globalLimits[intendedLevel]) {
    // Global limit exceeded - suggest demotion
    const demotedLevel = demoteLevel(intendedLevel)
    if (demotedLevel) {
      return {
        level: demotedLevel,
        reasoning: `Global limit for ${intendedLevel}s reached (${globalLimits[intendedLevel]}). Suggesting as ${demotedLevel} instead.`,
        severity: 'warning',
      }
    } else {
      // At tag level, no demotion possible
      return {
        level: 'tag',
        reasoning: `Adding as tag (global ${intendedLevel} limit reached)`,
        severity: 'warning',
      }
    }
  }

  // ========== Step 5: All checks passed - accept at intended level ==========
  return {
    level: intendedLevel,
    reasoning: `New ${intendedLevel}: "${term}" added successfully`,
    severity: 'info',
  }
}

/**
 * Check a document's taxonomy against hierarchy rules
 * Returns a list of recommended changes
 */
export function validateDocumentTaxonomy(
  strandPath: string,
  subjects: string[],
  topics: string[],
  tags: string[],
  globalSubjects: string[],
  globalTopics: string[],
  globalTags: string[],
  config: TaxonomyHierarchyConfig = DEFAULT_TAXONOMY_CONFIG
): TaxonomyChange[] {
  const changes: TaxonomyChange[] = []

  // ========== Check per-document limits ==========

  // Check subjects limit
  if (subjects.length > config.maxSubjectsPerDoc) {
    const excess = subjects.slice(config.maxSubjectsPerDoc)
    for (const term of excess) {
      changes.push({
        strandPath,
        field: 'subjects',
        action: 'demote',
        term,
        reason: `Document has ${subjects.length} subjects (limit: ${config.maxSubjectsPerDoc})`,
        newLevel: 'topic',
        confidence: 0.8,
      })
    }
  }

  // Check topics limit
  if (topics.length > config.maxTopicsPerDoc) {
    const excess = topics.slice(config.maxTopicsPerDoc)
    for (const term of excess) {
      changes.push({
        strandPath,
        field: 'topics',
        action: 'demote',
        term,
        reason: `Document has ${topics.length} topics (limit: ${config.maxTopicsPerDoc})`,
        newLevel: 'tag',
        confidence: 0.8,
      })
    }
  }

  // ========== Check cross-level duplicates ==========

  // Check if any subjects also exist as topics or tags
  for (const subject of subjects) {
    const topicMatch = findSimilarTerms(subject, globalTopics, config)
    if (topicMatch.length > 0) {
      changes.push({
        strandPath,
        field: 'topics',
        action: 'remove',
        term: topicMatch[0],
        reason: `"${topicMatch[0]}" duplicates subject "${subject}"`,
        confidence: 0.9,
      })
    }

    const tagMatch = findSimilarTerms(subject, globalTags, config)
    if (tagMatch.length > 0) {
      changes.push({
        strandPath,
        field: 'tags',
        action: 'remove',
        term: tagMatch[0],
        reason: `"${tagMatch[0]}" duplicates subject "${subject}"`,
        confidence: 0.9,
      })
    }
  }

  // Check if any topics also exist as tags
  for (const topic of topics) {
    const tagMatch = findSimilarTerms(topic, globalTags, config)
    if (tagMatch.length > 0) {
      changes.push({
        strandPath,
        field: 'tags',
        action: 'remove',
        term: tagMatch[0],
        reason: `"${tagMatch[0]}" duplicates topic "${topic}"`,
        confidence: 0.9,
      })
    }
  }

  return changes
}

/**
 * Suggest the best level for a new term based on frequency and existing taxonomy
 */
export function suggestBestLevel(
  term: string,
  documentCount: number,
  existingSubjects: string[],
  existingTopics: string[],
  existingTags: string[],
  config: TaxonomyHierarchyConfig = DEFAULT_TAXONOMY_CONFIG
): TaxonomyLevel {
  // Check if term already exists at some level
  const subjectMatch = findSimilarTerms(term, existingSubjects, config)
  if (subjectMatch.length > 0) return 'subject'

  const topicMatch = findSimilarTerms(term, existingTopics, config)
  if (topicMatch.length > 0) return 'topic'

  const tagMatch = findSimilarTerms(term, existingTags, config)
  if (tagMatch.length > 0) return 'tag'

  // Suggest based on document frequency
  if (documentCount >= config.promotionThreshold) {
    // Very common - could be a subject
    if (existingSubjects.length < config.maxTotalSubjects) {
      return 'subject'
    }
    return 'topic'
  } else if (documentCount >= config.demotionThreshold) {
    // Moderately common - topic
    return 'topic'
  } else {
    // Rare - tag
    return 'tag'
  }
}

/**
 * Batch validate multiple terms and return classification for each
 */
export function classifyTerms(
  terms: string[],
  intendedLevel: TaxonomyLevel,
  existingSubjects: string[],
  existingTopics: string[],
  existingTags: string[],
  config: TaxonomyHierarchyConfig = DEFAULT_TAXONOMY_CONFIG
): Map<string, TaxonomyCheckResult> {
  const results = new Map<string, TaxonomyCheckResult>()

  // Track what we're adding to avoid self-duplicates
  const addedSubjects = [...existingSubjects]
  const addedTopics = [...existingTopics]
  const addedTags = [...existingTags]

  for (const term of terms) {
    const result = determineTaxonomyLevel(
      term,
      intendedLevel,
      addedSubjects,
      addedTopics,
      addedTags,
      config
    )

    results.set(term, result)

    // Track accepted terms to avoid duplicates within the batch
    if (result.level) {
      switch (result.level) {
        case 'subject':
          addedSubjects.push(term)
          break
        case 'topic':
          addedTopics.push(term)
          break
        case 'tag':
          addedTags.push(term)
          break
      }
    }
  }

  return results
}

export default determineTaxonomyLevel
