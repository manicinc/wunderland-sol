/**
 * Semantic Relationships for Concept Mapping
 * @module lib/mindmap/semanticRelationships
 *
 * Uses MiniLM embeddings to find semantic relationships between concepts
 * that don't co-occur in text (e.g., "authentication" ↔ "security")
 */

import type { ConceptNode, ConceptEdge } from '@/hooks/useMindmapGeneration'
import { getWordNetSimilarity } from '@/lib/nlp/wordnet'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SemanticEdge extends ConceptEdge {
  semanticScore: number
  method: 'embedding' | 'wordnet' | 'both'
}

export interface SemanticRelationshipOptions {
  /** Minimum similarity score to create an edge (0.0 to 1.0) */
  minSimilarity?: number
  /** Use WordNet for synonyms/hypernyms */
  useWordNet?: boolean
  /** Use embedding vectors for similarity */
  useEmbeddings?: boolean
  /** Weight for semantic edges (0.0 to 1.0) */
  edgeWeight?: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMBEDDING UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

// Dynamic import to avoid SSR issues with embedding engine
let embeddingEngine: any = null

async function getEmbeddingEngine() {
  if (embeddingEngine) return embeddingEngine

  try {
    const { HybridEmbeddingEngine } = await import('@/lib/search/embeddingEngine')
    embeddingEngine = new HybridEmbeddingEngine({
      modelDim: 384,
      maxSeqLength: 512,
      debugLevel: 'error', // Quiet for concept extraction
    })
    await embeddingEngine.initialize()
    return embeddingEngine
  } catch (error) {
    console.warn('[SemanticRelationships] Embedding engine unavailable:', error)
    return null
  }
}

/**
 * Embed a single term
 */
async function embedTerm(text: string): Promise<Float32Array | null> {
  const engine = await getEmbeddingEngine()
  if (!engine) return null

  try {
    return await engine.embedText(text)
  } catch {
    return null
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
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

/* ═══════════════════════════════════════════════════════════════════════════
   SEMANTIC EDGE BUILDING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Build semantic edges between concepts using embeddings and/or WordNet
 */
export async function buildSemanticEdges(
  nodes: ConceptNode[],
  existingEdges: ConceptEdge[],
  options: SemanticRelationshipOptions = {}
): Promise<SemanticEdge[]> {
  const {
    minSimilarity = 0.5,
    useWordNet = true,
    useEmbeddings = true,
    edgeWeight = 0.7,
  } = options

  // Create set of existing edges for deduplication
  const existingEdgeKeys = new Set(
    existingEdges.map(e => [e.source, e.target].sort().join('|'))
  )

  const semanticEdges: SemanticEdge[] = []

  // Embed all concepts if using embeddings
  let embeddings: Map<string, Float32Array> = new Map()
  if (useEmbeddings) {
    const engine = await getEmbeddingEngine()
    if (engine) {
      for (const node of nodes) {
        const embedding = await embedTerm(node.text)
        if (embedding) {
          embeddings.set(node.id, embedding)
        }
      }
    }
  }

  // Compare all pairs of nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i]
      const nodeB = nodes[j]

      // Skip if edge already exists from co-occurrence
      const edgeKey = [nodeA.id, nodeB.id].sort().join('|')
      if (existingEdgeKeys.has(edgeKey)) continue

      let bestScore = 0
      let method: 'embedding' | 'wordnet' | 'both' = 'embedding'

      // Check embedding similarity
      if (useEmbeddings && embeddings.has(nodeA.id) && embeddings.has(nodeB.id)) {
        const embeddingA = embeddings.get(nodeA.id)!
        const embeddingB = embeddings.get(nodeB.id)!
        const embeddingSimilarity = cosineSimilarity(embeddingA, embeddingB)

        if (embeddingSimilarity > bestScore) {
          bestScore = embeddingSimilarity
          method = 'embedding'
        }
      }

      // Check WordNet similarity
      if (useWordNet) {
        try {
          const wordNetResult = await getWordNetSimilarity(nodeA.text, nodeB.text)
          if (wordNetResult && wordNetResult.score > bestScore) {
            bestScore = wordNetResult.score
            method = bestScore > 0 && method === 'embedding' ? 'both' : 'wordnet'
          }
        } catch {
          // WordNet lookup failed, continue
        }
      }

      // Create edge if similarity is above threshold
      if (bestScore >= minSimilarity) {
        semanticEdges.push({
          source: nodeA.id,
          target: nodeB.id,
          type: 'related',
          strength: bestScore * edgeWeight,
          semanticScore: bestScore,
          method,
        })
      }
    }
  }

  return semanticEdges
}

/**
 * Find semantically related concepts for a given term
 * Useful for suggesting related tags or topics
 */
export async function findSemanticallySimilar(
  term: string,
  candidates: string[],
  options: { minScore?: number; maxResults?: number } = {}
): Promise<Array<{ term: string; score: number; method: string }>> {
  const { minScore = 0.4, maxResults = 5 } = options

  const results: Array<{ term: string; score: number; method: string }> = []

  // Get embedding for the input term
  const termEmbedding = await embedTerm(term)

  for (const candidate of candidates) {
    if (candidate.toLowerCase() === term.toLowerCase()) continue

    let bestScore = 0
    let method = 'none'

    // Check embedding similarity
    if (termEmbedding) {
      const candidateEmbedding = await embedTerm(candidate)
      if (candidateEmbedding) {
        const similarity = cosineSimilarity(termEmbedding, candidateEmbedding)
        if (similarity > bestScore) {
          bestScore = similarity
          method = 'embedding'
        }
      }
    }

    // Check WordNet similarity
    try {
      const wordNetResult = await getWordNetSimilarity(term, candidate)
      if (wordNetResult && wordNetResult.score > bestScore) {
        bestScore = wordNetResult.score
        method = `wordnet:${wordNetResult.relationship}`
      }
    } catch {
      // WordNet lookup failed
    }

    if (bestScore >= minScore) {
      results.push({ term: candidate, score: bestScore, method })
    }
  }

  // Sort by score and return top results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
}

/**
 * Cluster concepts by semantic similarity
 * Groups related concepts together for better visualization
 */
export async function clusterBySemantic(
  nodes: ConceptNode[],
  numClusters = 5
): Promise<Map<string, number>> {
  const clusterMap = new Map<string, number>()

  // Simple k-means-like clustering based on embeddings
  const embeddings = new Map<string, Float32Array>()

  for (const node of nodes) {
    const embedding = await embedTerm(node.text)
    if (embedding) {
      embeddings.set(node.id, embedding)
    }
  }

  if (embeddings.size === 0) {
    // No embeddings available, assign clusters based on type
    nodes.forEach((node, idx) => {
      const typeOrder = { entity: 0, topic: 1, action: 2, attribute: 3 }
      clusterMap.set(node.id, typeOrder[node.type as keyof typeof typeOrder] ?? idx % numClusters)
    })
    return clusterMap
  }

  // Initialize cluster centroids with first N nodes
  const nodeIds = Array.from(embeddings.keys())
  const centroids: Float32Array[] = nodeIds
    .slice(0, Math.min(numClusters, nodeIds.length))
    .map(id => embeddings.get(id)!)

  // Assign nodes to nearest centroid
  for (const [nodeId, embedding] of embeddings) {
    let bestCluster = 0
    let bestSimilarity = -1

    for (let c = 0; c < centroids.length; c++) {
      const similarity = cosineSimilarity(embedding, centroids[c])
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity
        bestCluster = c
      }
    }

    clusterMap.set(nodeId, bestCluster)
  }

  // Assign non-embedded nodes to cluster 0
  for (const node of nodes) {
    if (!clusterMap.has(node.id)) {
      clusterMap.set(node.id, 0)
    }
  }

  return clusterMap
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export default {
  buildSemanticEdges,
  findSemanticallySimilar,
  clusterBySemantic,
}
