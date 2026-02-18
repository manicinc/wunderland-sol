import type { CodexSearchDoc, CodexSearchResult } from './types'

type EncoderPipeline = any

let encoderPromise: Promise<EncoderPipeline> | null = null
let encoderFailed = false

const loadEncoder = async (): Promise<EncoderPipeline | null> => {
  // Only load transformers on the client side - skip entirely during SSR/build
  if (typeof window === 'undefined') {
    return null
  }
  
  // If we already know it failed, don't retry (prevents infinite loops)
  if (encoderFailed) {
    return null
  }
  
  if (!encoderPromise) {
    encoderPromise = (async () => {
      try {
        // Use Function constructor to completely hide the import from webpack static analysis
        // This prevents webpack from trying to bundle @huggingface/transformers
        const dynamicImport = new Function('specifier', 'return import(specifier)')
        const transformers = await dynamicImport('@huggingface/transformers')
        const pipeline = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
        return pipeline
      } catch (err) {
        console.warn('[SemanticReranker] Failed to load encoder, disabling semantic reranking:', err)
        encoderFailed = true
        encoderPromise = null // Clear so we don't keep a rejected promise
        return null
      }
    })()
  }
  return encoderPromise
}

const cosineSimilarity = (query: Float32Array, embeddings: Float32Array, offset: number, size: number) => {
  let sum = 0
  for (let i = 0; i < size; i += 1) {
    sum += query[i] * embeddings[offset + i]
  }
  return sum
}

const MAX_FALLBACK_DOCS = 500

export interface SemanticOptions {
  limit?: number
  /** If true, evaluate all docs when BM25 produces no hits */
  fallbackToAllDocs?: boolean
}

export class SemanticReranker {
  private readonly docs: CodexSearchDoc[]
  private readonly embeddings: Float32Array | null
  private readonly embeddingSize: number

  constructor(docs: CodexSearchDoc[], embeddings: Float32Array | null, embeddingSize: number) {
    this.docs = docs
    this.embeddings = embeddings
    this.embeddingSize = embeddingSize
  }

  get isAvailable(): boolean {
    return Boolean(this.embeddings && this.embeddingSize > 0)
  }

  async rerank(
    query: string,
    baseResults: CodexSearchResult[],
    options: SemanticOptions = {},
  ): Promise<CodexSearchResult[]> {
    if (!this.isAvailable || !this.embeddings) {
      return baseResults
    }

    // Try to load encoder - if it fails, fall back to BM25 results
    const encoder = await loadEncoder()
    if (!encoder) {
      console.warn('[SemanticReranker] Encoder unavailable, using BM25 results only')
      return baseResults
    }
    
    let encoding
    try {
      encoding = await encoder(query, { pooling: 'mean', normalize: true })
    } catch (err) {
      console.warn('[SemanticReranker] Encoding failed, using BM25 results:', err)
      return baseResults
    }
    
    const queryVector = encoding.data
    const limit = options.limit ?? 20

    const candidateDocIds =
      baseResults.length > 0
        ? baseResults.map((result) => result.docId)
        : options.fallbackToAllDocs
          ? this.docs.slice(0, MAX_FALLBACK_DOCS).map((_, index) => index)
          : []

    if (candidateDocIds.length === 0) {
      return baseResults
    }

    const bm25Max = baseResults.reduce((max, result) => Math.max(max, result.bm25Score), 0) || 1
    const combined = candidateDocIds.map((docId) => {
      const offset = docId * this.embeddingSize
      const semanticScore = cosineSimilarity(queryVector, this.embeddings!, offset, this.embeddingSize)
      const baseResult = baseResults.find((result) => result.docId === docId)
      const normalizedBm25 = baseResult ? baseResult.bm25Score / bm25Max : 0
      const combinedScore = semanticScore * 0.7 + normalizedBm25 * 0.3
      const doc = this.docs[docId]
      return {
        docId,
        path: doc.path,
        title: doc.title,
        summary: doc.summary,
        weave: doc.weave,
        loom: doc.loom,
        tags: doc.tags,
        skills: doc.skills,
        subjects: doc.subjects,
        topics: doc.topics,
        bm25Score: baseResult?.bm25Score ?? 0,
        semanticScore,
        combinedScore,
      }
    })

    return combined
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, limit)
  }
}


