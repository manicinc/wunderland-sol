/**
 * TextRank Extractive Summarization with BERT Enhancement
 * @module lib/nlp/textrank
 *
 * Implements TextRank algorithm (Mihalcea & Tarau, 2004) for extractive summarization.
 * Enhanced with optional BERT sentence embeddings via Transformers.js for improved
 * sentence similarity calculation.
 *
 * Features:
 * - Graph-based sentence ranking (PageRank-style)
 * - TF-IDF fallback when embeddings unavailable
 * - BERT embeddings via existing EmbeddingEngine (lazy loaded)
 * - Position bias for lead sentences
 * - Entity density boost for tech content
 * - Works entirely client-side (offline capable)
 *
 * @see https://web.eecs.umich.edu/~mihalcea/papers/mihalcea.emnlp04.pdf
 */

import type { ParsedBlock } from '@/lib/nlp'

// ============================================================================
// TYPES
// ============================================================================

export interface TextRankConfig {
  /** Number of PageRank iterations (default: 20) */
  iterations: number
  /** Damping factor for PageRank (default: 0.85) */
  dampingFactor: number
  /** Maximum summary length in characters (default: 200) */
  maxLength: number
  /** Minimum similarity threshold for graph edges (default: 0.1) */
  minSimilarity: number
  /** Position bias weight - boost for early sentences (default: 0.2) */
  positionBiasWeight: number
  /** Entity density weight - boost for tech-heavy sentences (default: 0.15) */
  entityDensityWeight: number
  /** Use BERT embeddings if available (default: true) */
  useBertEmbeddings: boolean
}

export interface SentenceScore {
  text: string
  index: number
  score: number
  position: number
  entityDensity: number
}

export interface TextRankResult {
  summary: string
  sentences: SentenceScore[]
  method: 'bert' | 'tfidf'
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_TEXTRANK_CONFIG: TextRankConfig = {
  iterations: 20,
  dampingFactor: 0.85,
  maxLength: 200,
  minSimilarity: 0.1,
  positionBiasWeight: 0.2,
  entityDensityWeight: 0.15,
  useBertEmbeddings: true,
}

// ============================================================================
// SENTENCE TOKENIZATION
// ============================================================================

/**
 * Split text into sentences with robust boundary detection
 * Handles abbreviations, URLs, code snippets, etc.
 */
export function tokenizeSentences(text: string): string[] {
  if (!text?.trim()) return []

  // Common abbreviations that shouldn't split sentences
  const abbreviations = [
    'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'vs', 'etc', 'i\\.e', 'e\\.g',
    'Inc', 'Ltd', 'Corp', 'Co', 'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug',
    'Sep', 'Oct', 'Nov', 'Dec', 'Fig', 'fig', 'Eq', 'eq', 'No', 'no', 'Vol'
  ]

  // Protect abbreviations with placeholder
  let processed = text
  abbreviations.forEach((abbr, i) => {
    const regex = new RegExp(`\\b${abbr}\\.`, 'g')
    processed = processed.replace(regex, `<<ABBR${i}>>`)
  })

  // Protect URLs
  processed = processed.replace(/https?:\/\/[^\s]+/g, match => `<<URL${match}URL>>`)

  // Protect decimal numbers
  processed = processed.replace(/(\d+)\.(\d+)/g, '$1<<DOT>>$2')

  // Split on sentence boundaries
  const sentences = processed
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  // Restore protected patterns
  return sentences.map(sentence => {
    let restored = sentence
    abbreviations.forEach((abbr, i) => {
      restored = restored.replace(new RegExp(`<<ABBR${i}>>`, 'g'), `${abbr.replace('\\', '')}.`)
    })
    restored = restored.replace(/<<URL(.+?)URL>>/g, '$1')
    restored = restored.replace(/<<DOT>>/g, '.')
    return restored.trim()
  }).filter(s => s.length >= 10) // Filter very short fragments
}

/**
 * Check if a sentence is valid for summarization
 */
export function isValidSentence(sentence: string, minWords = 3): boolean {
  if (!sentence?.trim()) return false

  const words = sentence.split(/\s+/).filter(w => w.length > 0)
  if (words.length < minWords) return false

  // Skip pure code/URLs
  if (sentence.match(/^(https?:\/\/|```|import |export |const |let |var |function )/)) {
    return false
  }

  // Skip if mostly special characters
  const alphaRatio = (sentence.match(/[a-zA-Z]/g) || []).length / sentence.length
  if (alphaRatio < 0.5) return false

  return true
}

// ============================================================================
// TF-IDF SIMILARITY (Fallback)
// ============================================================================

/**
 * Calculate TF-IDF vectors for sentences
 */
function calculateTfIdf(sentences: string[]): Map<string, number[]> {
  const wordCounts: Map<string, number>[] = []
  const docFreq: Map<string, number> = new Map()
  const vocabulary = new Set<string>()

  // Count words in each sentence and document frequencies
  sentences.forEach(sentence => {
    const words = sentence.toLowerCase().split(/\W+/).filter(w => w.length > 2)
    const counts: Map<string, number> = new Map()
    const seen = new Set<string>()

    words.forEach(word => {
      vocabulary.add(word)
      counts.set(word, (counts.get(word) || 0) + 1)
      if (!seen.has(word)) {
        seen.add(word)
        docFreq.set(word, (docFreq.get(word) || 0) + 1)
      }
    })

    wordCounts.push(counts)
  })

  // Calculate TF-IDF vectors
  const vocabList = Array.from(vocabulary)
  const tfidfVectors: Map<string, number[]> = new Map()

  sentences.forEach((sentence, idx) => {
    const counts = wordCounts[idx]
    const vector = vocabList.map(word => {
      const tf = counts.get(word) || 0
      const df = docFreq.get(word) || 1
      const idf = Math.log(sentences.length / df)
      return tf * idf
    })
    tfidfVectors.set(sentence, vector)
  })

  return tfidfVectors
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

// ============================================================================
// GRAPH-BASED RANKING
// ============================================================================

/**
 * Build similarity graph from sentences
 * Edges weighted by cosine similarity of embeddings or TF-IDF vectors
 */
export async function buildSimilarityGraph(
  sentences: string[],
  config: TextRankConfig,
  embeddingFn?: (text: string) => Promise<Float32Array | null>
): Promise<Map<number, Map<number, number>>> {
  const graph: Map<number, Map<number, number>> = new Map()
  let embeddings: (Float32Array | null)[] = []
  let useBert = false

  // Try to get BERT embeddings
  if (config.useBertEmbeddings && embeddingFn) {
    try {
      embeddings = await Promise.all(sentences.map(s => embeddingFn(s)))
      useBert = embeddings.every(e => e !== null)
    } catch {
      useBert = false
    }
  }

  // Fallback to TF-IDF
  let tfidfVectors: Map<string, number[]> | null = null
  if (!useBert) {
    tfidfVectors = calculateTfIdf(sentences)
  }

  // Build edges
  for (let i = 0; i < sentences.length; i++) {
    graph.set(i, new Map())

    for (let j = 0; j < sentences.length; j++) {
      if (i === j) continue

      let similarity: number
      if (useBert && embeddings[i] && embeddings[j]) {
        similarity = cosineSimilarity(embeddings[i]!, embeddings[j]!)
      } else if (tfidfVectors) {
        const vecA = tfidfVectors.get(sentences[i]) || []
        const vecB = tfidfVectors.get(sentences[j]) || []
        similarity = cosineSimilarity(vecA, vecB)
      } else {
        similarity = 0
      }

      if (similarity >= config.minSimilarity) {
        graph.get(i)!.set(j, similarity)
      }
    }
  }

  return graph
}

/**
 * Calculate TextRank scores using PageRank-style iteration
 */
export function calculateTextRankScores(
  graph: Map<number, Map<number, number>>,
  config: TextRankConfig
): number[] {
  const n = graph.size
  if (n === 0) return []

  // Initialize scores uniformly
  let scores = new Array(n).fill(1 / n)
  const d = config.dampingFactor

  // Iterate until convergence or max iterations
  for (let iter = 0; iter < config.iterations; iter++) {
    const newScores = new Array(n).fill((1 - d) / n)

    for (let i = 0; i < n; i++) {
      const edges = graph.get(i) || new Map()

      for (const [j, weight] of edges) {
        // Calculate outgoing weight sum for j
        const outEdges = graph.get(j) || new Map()
        let outWeightSum = 0
        for (const w of outEdges.values()) {
          outWeightSum += w
        }

        if (outWeightSum > 0) {
          newScores[i] += d * (weight / outWeightSum) * scores[j]
        }
      }
    }

    scores = newScores
  }

  return scores
}

// ============================================================================
// BOOST FACTORS
// ============================================================================

// Tech entities for entity density calculation
const TECH_ENTITIES = new Set([
  // Languages
  'javascript', 'typescript', 'python', 'java', 'rust', 'go', 'ruby', 'swift', 'kotlin',
  // Frameworks
  'react', 'vue', 'angular', 'next', 'node', 'express', 'django', 'flask', 'spring',
  // Tools
  'git', 'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'terraform', 'webpack', 'vite',
  // Concepts
  'api', 'database', 'server', 'client', 'frontend', 'backend', 'microservice', 'algorithm',
  'component', 'function', 'class', 'interface', 'module', 'package', 'library', 'framework'
])

/**
 * Calculate entity density for a sentence
 */
function calculateEntityDensity(sentence: string): number {
  const words = sentence.toLowerCase().split(/\W+/)
  const entityCount = words.filter(w => TECH_ENTITIES.has(w)).length
  return entityCount / Math.max(words.length, 1)
}

/**
 * Apply position and entity density boosts to base scores
 */
export function applyBoosts(
  sentences: string[],
  baseScores: number[],
  config: TextRankConfig
): SentenceScore[] {
  return sentences.map((text, index) => {
    const position = 1 - (index / sentences.length)
    const entityDensity = calculateEntityDensity(text)

    // Combine base score with boosts
    const boostedScore =
      baseScores[index] * (1 - config.positionBiasWeight - config.entityDensityWeight) +
      position * config.positionBiasWeight +
      entityDensity * config.entityDensityWeight

    return {
      text,
      index,
      score: boostedScore,
      position,
      entityDensity,
    }
  })
}

// ============================================================================
// MAIN SUMMARIZATION FUNCTION
// ============================================================================

/**
 * Generate extractive summary using TextRank algorithm
 *
 * @param text - Input text to summarize
 * @param config - TextRank configuration
 * @param embeddingFn - Optional BERT embedding function from EmbeddingEngine
 * @returns Summary result with sentences and method used
 */
export async function extractSummary(
  text: string,
  config: Partial<TextRankConfig> = {},
  embeddingFn?: (text: string) => Promise<Float32Array | null>
): Promise<TextRankResult> {
  const cfg = { ...DEFAULT_TEXTRANK_CONFIG, ...config }

  // Tokenize and validate sentences
  const allSentences = tokenizeSentences(text)
  const validSentences = allSentences.filter(s => isValidSentence(s))

  if (validSentences.length === 0) {
    return { summary: '', sentences: [], method: 'tfidf' }
  }

  if (validSentences.length === 1) {
    return {
      summary: validSentences[0].slice(0, cfg.maxLength),
      sentences: [{
        text: validSentences[0],
        index: 0,
        score: 1,
        position: 1,
        entityDensity: calculateEntityDensity(validSentences[0]),
      }],
      method: 'tfidf',
    }
  }

  // Build similarity graph
  const graph = await buildSimilarityGraph(validSentences, cfg, embeddingFn)

  // Calculate base TextRank scores
  const baseScores = calculateTextRankScores(graph, cfg)

  // Apply boosts
  const scoredSentences = applyBoosts(validSentences, baseScores, cfg)

  // Sort by score (descending)
  const rankedSentences = [...scoredSentences].sort((a, b) => b.score - a.score)

  // Select top sentences up to maxLength
  let summary = ''
  const selectedIndices: Set<number> = new Set()

  for (const sentence of rankedSentences) {
    if (summary.length + sentence.text.length + 2 > cfg.maxLength) {
      if (selectedIndices.size === 0) {
        // At least include truncated first sentence
        summary = sentence.text.slice(0, cfg.maxLength - 3) + '...'
        selectedIndices.add(sentence.index)
      }
      break
    }
    summary += (summary ? ' ' : '') + sentence.text
    selectedIndices.add(sentence.index)
  }

  // Reorder selected sentences by original position for coherence
  const orderedSummary = [...selectedIndices]
    .sort((a, b) => a - b)
    .map(idx => scoredSentences.find(s => s.index === idx)!.text)
    .join(' ')

  const method = cfg.useBertEmbeddings && embeddingFn ? 'bert' : 'tfidf'

  return {
    summary: orderedSummary,
    sentences: scoredSentences,
    method,
  }
}

// ============================================================================
// BLOCK-AWARE SUMMARIZATION
// ============================================================================

/**
 * Generate summary for a specific block type
 * Returns null for block types that shouldn't be summarized by default
 */
export async function summarizeBlock(
  block: ParsedBlock,
  config: Partial<TextRankConfig> = {},
  embeddingFn?: (text: string) => Promise<Float32Array | null>
): Promise<string | null> {
  const { type, content } = block
  const cfg = { ...DEFAULT_TEXTRANK_CONFIG, ...config, maxLength: 150 }

  switch (type) {
    case 'heading':
      // Headings are already concise - return as-is but mark as optional display
      return content.replace(/^#+\s*/, '').trim()

    case 'code':
      // Don't summarize code blocks by default
      // When enabled, extract first comment or docstring
      const docMatch = content.match(/^(?:\/\*\*?[\s\S]*?\*\/|\/\/.*|#.*|"""[\s\S]*?"""|'''[\s\S]*?''')/m)
      if (docMatch) {
        return docMatch[0].replace(/^[/#*\s]+|[*/#\s]+$/g, '').slice(0, cfg.maxLength)
      }
      return null

    case 'list':
      // Extract key points from list items
      const items = content
        .split('\n')
        .map(line => line.replace(/^[\s]*[-*+\d.]+\s*/, '').trim())
        .filter(item => item.length > 0)

      if (items.length === 0) return null

      // Use TextRank on list items
      const listResult = await extractSummary(items.join('. '), cfg, embeddingFn)
      return listResult.summary || items.slice(0, 3).join('; ')

    case 'paragraph':
    case 'blockquote':
      // Full TextRank summarization
      const result = await extractSummary(content, cfg, embeddingFn)
      return result.summary || content.slice(0, cfg.maxLength) + '...'

    case 'table':
      // Return table header row as summary
      const headerRow = content.split('\n')[0] || ''
      const cells = headerRow.split('|').filter(c => c.trim()).map(c => c.trim())
      return cells.length > 0 ? `Table: ${cells.join(', ').slice(0, cfg.maxLength)}` : null

    default:
      return null
  }
}

// ============================================================================
// LAZY EMBEDDING ENGINE LOADER
// ============================================================================

let embeddingEnginePromise: Promise<any> | null = null

/**
 * Lazily load and initialize the embedding engine
 * Only loads BERT model when first needed
 */
export async function getEmbeddingEngine(): Promise<{ embedText: (text: string) => Promise<Float32Array | null> } | null> {
  if (typeof window === 'undefined') {
    // SSR - no embeddings
    return null
  }

  if (!embeddingEnginePromise) {
    embeddingEnginePromise = (async () => {
      try {
        const { HybridEmbeddingEngine } = await import('@/lib/search/embeddingEngine')
        const engine = new HybridEmbeddingEngine({
          modelDim: 384,
          maxSeqLength: 512,
          debugLevel: 'warn',
        })
        await engine.initialize()

        if (engine.getStatus().type === 'none') {
          return null
        }

        return engine
      } catch (err) {
        console.warn('[TextRank] Failed to load embedding engine, using TF-IDF fallback:', err)
        return null
      }
    })()
  }

  return embeddingEnginePromise
}

/**
 * Get embedding function that uses lazy-loaded engine
 */
export async function getEmbeddingFn(): Promise<((text: string) => Promise<Float32Array | null>) | undefined> {
  const engine = await getEmbeddingEngine()
  if (!engine) return undefined
  return (text: string) => engine.embedText(text)
}
