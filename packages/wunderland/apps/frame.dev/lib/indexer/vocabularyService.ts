/**
 * VocabularyService - Unified Vocabulary Classification Service
 * @module lib/indexer/vocabularyService
 *
 * Provides a unified API for vocabulary classification that works in both
 * browser (Codex) and server environments. Automatically selects the best
 * available engine based on the runtime environment.
 *
 * Browser Engine: Embeddings + Taxonomy similarity + Compromise.js NER
 * Server Engine: WordNet + Embeddings + Taxonomy similarity + Full NLP
 */

import type { ClassificationResult, VocabularyData } from './vocabulary'
import type {
  VocabularyCategory,
  ScoredTerm,
  ExpandedVocabulary,
  RelatedTerms,
  VocabularyEmbeddingsData,
} from './vocabulary-embeddings'

// Re-export types for consumers
export type { ClassificationResult, VocabularyData }
export type { VocabularyCategory, ScoredTerm, ExpandedVocabulary, RelatedTerms, VocabularyEmbeddingsData }

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface VocabularyEngine {
  /** Engine identifier */
  readonly name: string

  /** Initialize the engine (load resources, etc.) */
  initialize(): Promise<void>

  /** Check if engine is ready */
  isReady(): boolean

  /** Expand a term with synonyms, hypernyms, related terms */
  expandTerm(term: string): Promise<string[]>

  /** Find similar vocabulary terms for input text */
  findSimilarTerms(
    text: string,
    category?: VocabularyCategory
  ): Promise<ScoredTerm[]>

  /** Classify text into subjects, topics, skills, difficulty */
  classifyText(text: string): Promise<ClassificationResult>

  /** Get expanded vocabulary for multiple terms */
  expandVocabulary(terms: string[]): Promise<ExpandedVocabulary[]>

  /** Find related terms (synonyms, broader, narrower) */
  findRelatedTerms(term: string): Promise<RelatedTerms>

  /** Get engine statistics */
  getStats(): VocabularyEngineStats
}

export interface VocabularyEngineStats {
  name: string
  initialized: boolean
  capabilities: {
    wordnet: boolean
    embeddings: boolean
    taxonomy: boolean
    ner: boolean
  }
  vocabularyTerms: number
  cacheHits?: number
  cacheMisses?: number
}

export interface VocabularyServiceConfig {
  /** Use pre-computed embeddings (default: true) */
  useEmbeddings?: boolean
  /** Minimum similarity score for matches (default: 0.3) */
  minSimilarityScore?: number
  /** Maximum results per query (default: 10) */
  maxResults?: number
  /** Enable caching (default: true) */
  enableCache?: boolean
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number
}

const DEFAULT_CONFIG: Required<VocabularyServiceConfig> = {
  useEmbeddings: true,
  minSimilarityScore: 0.3,
  maxResults: 10,
  enableCache: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENVIRONMENT DETECTION
═══════════════════════════════════════════════════════════════════════════ */

const isBrowser = typeof window !== 'undefined'

/* ═══════════════════════════════════════════════════════════════════════════
   VOCABULARY SERVICE
═══════════════════════════════════════════════════════════════════════════ */

/**
 * VocabularyService - Main entry point for vocabulary operations
 *
 * Automatically selects browser or server engine based on runtime environment.
 * Provides a unified async API for all vocabulary operations.
 */
export class VocabularyService {
  private engine: VocabularyEngine | null = null
  private config: Required<VocabularyServiceConfig>
  private initPromise: Promise<void> | null = null
  private initialized = false

  // Classification cache
  private classificationCache = new Map<string, { result: ClassificationResult; timestamp: number }>()
  private expansionCache = new Map<string, { result: string[]; timestamp: number }>()

  constructor(config: VocabularyServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize the service (loads appropriate engine)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this.doInitialize()
    await this.initPromise
  }

  private async doInitialize(): Promise<void> {
    try {
      if (isBrowser) {
        // Dynamically import browser engine
        const { BrowserVocabularyEngine } = await import('./engines/browserEngine')
        this.engine = new BrowserVocabularyEngine(this.config)
      } else {
        // Dynamically import server engine
        const { ServerVocabularyEngine } = await import('./engines/serverEngine')
        this.engine = new ServerVocabularyEngine(this.config)
      }

      await this.engine.initialize()
      this.initialized = true
      console.info(`[VocabularyService] Initialized with ${this.engine.name} engine`)
    } catch (error) {
      console.error('[VocabularyService] Failed to initialize:', error)
      throw error
    }
  }

  /**
   * Ensure the service is initialized
   */
  private async ensureInitialized(): Promise<VocabularyEngine> {
    if (!this.initialized || !this.engine) {
      await this.initialize()
    }
    if (!this.engine) {
      throw new Error('VocabularyService failed to initialize')
    }
    return this.engine
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.initialized && this.engine?.isReady() === true
  }

  /**
   * Get the engine name
   */
  getEngineName(): string {
    return this.engine?.name ?? 'not initialized'
  }

  /* ═══════════════════════════════════════════════════════════════════════
     CLASSIFICATION
  ═══════════════════════════════════════════════════════════════════════ */

  /**
   * Classify text into subjects, topics, skills, and difficulty
   * Uses caching for performance
   */
  async classify(text: string): Promise<ClassificationResult> {
    const engine = await this.ensureInitialized()

    // Check cache
    if (this.config.enableCache) {
      const cacheKey = this.getCacheKey(text)
      const cached = this.classificationCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        return cached.result
      }
    }

    // Classify
    const result = await engine.classifyText(text)

    // Cache result
    if (this.config.enableCache) {
      const cacheKey = this.getCacheKey(text)
      this.classificationCache.set(cacheKey, { result, timestamp: Date.now() })
      this.pruneCache()
    }

    return result
  }

  /**
   * Synchronous classification (uses cache or returns default)
   * For backward compatibility with existing Vocabulary.classify()
   */
  classifySync(text: string): ClassificationResult {
    const cacheKey = this.getCacheKey(text)
    const cached = this.classificationCache.get(cacheKey)

    if (cached) {
      return cached.result
    }

    // Return default and trigger async classification
    this.classify(text).catch(console.error)

    return {
      subjects: [],
      topics: [],
      tags: [],
      skills: [],
      difficulty: 'intermediate',
      confidence: {},
      keywords: [],
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TERM EXPANSION
  ═══════════════════════════════════════════════════════════════════════ */

  /**
   * Expand a term with synonyms, hypernyms, and related terms
   */
  async expandTerm(term: string): Promise<string[]> {
    const engine = await this.ensureInitialized()

    // Check cache
    if (this.config.enableCache) {
      const cacheKey = `expand:${term.toLowerCase()}`
      const cached = this.expansionCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        return cached.result
      }
    }

    const result = await engine.expandTerm(term)

    // Cache result
    if (this.config.enableCache) {
      const cacheKey = `expand:${term.toLowerCase()}`
      this.expansionCache.set(cacheKey, { result, timestamp: Date.now() })
    }

    return result
  }

  /**
   * Expand multiple terms
   */
  async expandVocabulary(terms: string[]): Promise<ExpandedVocabulary[]> {
    const engine = await this.ensureInitialized()
    return engine.expandVocabulary(terms)
  }

  /* ═══════════════════════════════════════════════════════════════════════
     SIMILARITY SEARCH
  ═══════════════════════════════════════════════════════════════════════ */

  /**
   * Find similar vocabulary terms for input text
   */
  async findSimilarTerms(
    text: string,
    category?: VocabularyCategory
  ): Promise<ScoredTerm[]> {
    const engine = await this.ensureInitialized()
    return engine.findSimilarTerms(text, category)
  }

  /**
   * Find related terms (synonyms, broader, narrower)
   */
  async findRelatedTerms(term: string): Promise<RelatedTerms> {
    const engine = await this.ensureInitialized()
    return engine.findRelatedTerms(term)
  }

  /* ═══════════════════════════════════════════════════════════════════════
     STATISTICS & MANAGEMENT
  ═══════════════════════════════════════════════════════════════════════ */

  /**
   * Get service statistics
   */
  getStats(): VocabularyEngineStats & { cacheSize: number } {
    const engineStats = this.engine?.getStats() ?? {
      name: 'not initialized',
      initialized: false,
      capabilities: {
        wordnet: false,
        embeddings: false,
        taxonomy: false,
        ner: false,
      },
      vocabularyTerms: 0,
    }

    return {
      ...engineStats,
      cacheSize: this.classificationCache.size + this.expansionCache.size,
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.classificationCache.clear()
    this.expansionCache.clear()
  }

  /**
   * Prune old cache entries
   */
  private pruneCache(): void {
    const now = Date.now()
    const maxSize = 1000

    // Prune classification cache
    if (this.classificationCache.size > maxSize) {
      const entries = Array.from(this.classificationCache.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(0, maxSize / 2)
      this.classificationCache.clear()
      entries.forEach(([k, v]) => this.classificationCache.set(k, v))
    }

    // Prune expansion cache
    if (this.expansionCache.size > maxSize) {
      const entries = Array.from(this.expansionCache.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(0, maxSize / 2)
      this.expansionCache.clear()
      entries.forEach(([k, v]) => this.expansionCache.set(k, v))
    }

    // Remove expired entries
    for (const [key, value] of this.classificationCache.entries()) {
      if (now - value.timestamp > this.config.cacheTTL) {
        this.classificationCache.delete(key)
      }
    }
    for (const [key, value] of this.expansionCache.entries()) {
      if (now - value.timestamp > this.config.cacheTTL) {
        this.expansionCache.delete(key)
      }
    }
  }

  /**
   * Generate cache key for text
   */
  private getCacheKey(text: string): string {
    // Simple hash for cache key
    const normalized = text.toLowerCase().trim().substring(0, 500)
    let hash = 0
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return `classify:${hash}`
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SINGLETON INSTANCE
═══════════════════════════════════════════════════════════════════════════ */

let serviceInstance: VocabularyService | null = null

/**
 * Get the shared VocabularyService instance
 */
export function getVocabularyService(config?: VocabularyServiceConfig): VocabularyService {
  if (!serviceInstance) {
    serviceInstance = new VocabularyService(config)
  }
  return serviceInstance
}

/**
 * Reset the service instance (for testing)
 */
export function resetVocabularyService(): void {
  serviceInstance?.clearCache()
  serviceInstance = null
}

export default VocabularyService
