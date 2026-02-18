/**
 * Vocabulary Embeddings Module
 * @module lib/indexer/vocabulary-embeddings
 *
 * Types and loader for pre-computed vocabulary embeddings.
 * Embeddings are generated at build time using the MiniLM-L6-v2 model (384 dim).
 * This enables semantic similarity matching in the browser without WordNet.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Classification Hierarchy:
 * - subject: Highest level (technology, science, philosophy, ai)
 * - topic: Second level (getting-started, architecture, troubleshooting)
 * - tag: Lowest level, lightweight (api, database, web, tutorial)
 * - skill: Extension of tags for prerequisites, visually distinct (react, python, docker)
 * - difficulty: Complexity level (beginner, intermediate, advanced)
 */
export type VocabularyCategory = 'subject' | 'topic' | 'tag' | 'skill' | 'difficulty'

export interface VocabularyEmbedding {
  /** The vocabulary term */
  term: string
  /** High-level category */
  category: VocabularyCategory
  /** Subcategory within the vocabulary (e.g., 'technology', 'getting-started') */
  subcategory: string
  /** 384-dimensional embedding vector */
  embedding: number[]
  /** Pre-expanded synonyms from WordNet (generated at build time) */
  synonyms?: string[]
  /** Pre-expanded hypernyms from WordNet (broader terms) */
  hypernyms?: string[]
  /** Whether this is a prerequisite skill (for skills category) */
  isPrerequisite?: boolean
}

export interface VocabularyEmbeddingsData {
  /** Version for cache invalidation */
  version: string
  /** Generation timestamp */
  generatedAt: string
  /** Model used for embeddings */
  model: string
  /** Embedding dimensions */
  dimensions: number
  /** All vocabulary embeddings */
  embeddings: VocabularyEmbedding[]
  /** Statistics about the vocabulary */
  stats: {
    totalTerms: number
    subjects: number
    topics: number
    tags: number
    skills: number
    difficulty: number
    synonymExpansions: number
  }
}

export interface ScoredTerm {
  term: string
  category: VocabularyCategory
  subcategory: string
  score: number
  matchType: 'embedding' | 'exact' | 'synonym' | 'fuzzy' | 'phonetic'
}

export interface ExpandedVocabulary {
  original: string
  synonyms: string[]
  hypernyms: string[]
  related: string[]
}

export interface RelatedTerms {
  term: string
  synonyms: ScoredTerm[]
  broader: ScoredTerm[]
  narrower: ScoredTerm[]
  related: ScoredTerm[]
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADER
═══════════════════════════════════════════════════════════════════════════ */

let cachedEmbeddings: VocabularyEmbeddingsData | null = null
let loadingPromise: Promise<VocabularyEmbeddingsData | null> | null = null

/**
 * Load pre-computed vocabulary embeddings
 * Lazy loads and caches the embeddings from JSON
 */
export async function loadVocabularyEmbeddings(): Promise<VocabularyEmbeddingsData | null> {
  // Return cached if available
  if (cachedEmbeddings) {
    return cachedEmbeddings
  }

  // Wait for existing load if in progress
  if (loadingPromise) {
    return loadingPromise
  }

  // Start loading
  loadingPromise = (async () => {
    try {
      // Try loading from public data directory
      const response = await fetch('/data/vocabulary-embeddings.json')
      if (!response.ok) {
        console.warn('[VocabEmbeddings] Failed to load embeddings:', response.statusText)
        return null
      }

      const data: VocabularyEmbeddingsData = await response.json()
      cachedEmbeddings = data
      console.info(
        `[VocabEmbeddings] Loaded ${data.stats.totalTerms} terms with ${data.dimensions}D embeddings`
      )
      return data
    } catch (error) {
      console.warn('[VocabEmbeddings] Error loading embeddings:', error)
      return null
    } finally {
      loadingPromise = null
    }
  })()

  return loadingPromise
}

/**
 * Get embeddings for a specific category
 */
export function getEmbeddingsByCategory(
  data: VocabularyEmbeddingsData,
  category: VocabularyCategory
): VocabularyEmbedding[] {
  return data.embeddings.filter((e) => e.category === category)
}

/**
 * Get embeddings for a specific subcategory
 */
export function getEmbeddingsBySubcategory(
  data: VocabularyEmbeddingsData,
  category: VocabularyCategory,
  subcategory: string
): VocabularyEmbedding[] {
  return data.embeddings.filter((e) => e.category === category && e.subcategory === subcategory)
}

/**
 * Find embedding by term (exact match)
 */
export function findEmbeddingByTerm(
  data: VocabularyEmbeddingsData,
  term: string
): VocabularyEmbedding | undefined {
  const normalized = term.toLowerCase().trim()
  return data.embeddings.find((e) => e.term === normalized)
}

/**
 * Find embeddings that have a specific synonym
 */
export function findEmbeddingsBySynonym(
  data: VocabularyEmbeddingsData,
  synonym: string
): VocabularyEmbedding[] {
  const normalized = synonym.toLowerCase().trim()
  return data.embeddings.filter((e) => e.synonyms?.includes(normalized))
}

/**
 * Clear cached embeddings (for testing)
 */
export function clearEmbeddingsCache(): void {
  cachedEmbeddings = null
  loadingPromise = null
}

/**
 * Check if embeddings are loaded
 */
export function areEmbeddingsLoaded(): boolean {
  return cachedEmbeddings !== null
}

/**
 * Get embedding statistics
 */
export function getEmbeddingStats(): VocabularyEmbeddingsData['stats'] | null {
  return cachedEmbeddings?.stats ?? null
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIMILARITY UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`)
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}

/**
 * Find most similar vocabulary embeddings to a given vector
 */
export function findSimilarEmbeddings(
  data: VocabularyEmbeddingsData,
  queryEmbedding: number[],
  options: {
    category?: VocabularyCategory
    subcategory?: string
    limit?: number
    minScore?: number
  } = {}
): ScoredTerm[] {
  const { category, subcategory, limit = 10, minScore = 0.3 } = options

  // Filter embeddings by category/subcategory if specified
  let candidates = data.embeddings
  if (category) {
    candidates = candidates.filter((e) => e.category === category)
  }
  if (subcategory) {
    candidates = candidates.filter((e) => e.subcategory === subcategory)
  }

  // Calculate similarities
  const scored: ScoredTerm[] = candidates
    .map((e) => ({
      term: e.term,
      category: e.category,
      subcategory: e.subcategory,
      score: cosineSimilarity(queryEmbedding, e.embedding),
      matchType: 'embedding' as const,
    }))
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit)
}

/**
 * Find vocabulary terms similar to a text query
 * Requires the embedding engine to be available
 */
export async function findSimilarTermsByText(
  data: VocabularyEmbeddingsData,
  text: string,
  embedText: (text: string) => Promise<Float32Array | null>,
  options: {
    category?: VocabularyCategory
    limit?: number
    minScore?: number
  } = {}
): Promise<ScoredTerm[]> {
  const embedding = await embedText(text)
  if (!embedding) {
    console.warn('[VocabEmbeddings] Could not generate embedding for text')
    return []
  }

  return findSimilarEmbeddings(data, Array.from(embedding), options)
}

export default {
  loadVocabularyEmbeddings,
  getEmbeddingsByCategory,
  getEmbeddingsBySubcategory,
  findEmbeddingByTerm,
  findEmbeddingsBySynonym,
  clearEmbeddingsCache,
  areEmbeddingsLoaded,
  getEmbeddingStats,
  cosineSimilarity,
  findSimilarEmbeddings,
  findSimilarTermsByText,
}
