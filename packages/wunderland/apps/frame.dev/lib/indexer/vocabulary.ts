/**
 * Vocabulary Module for Browser-Compatible Indexer
 *
 * Provides vocabulary loading, classification, and n-gram analysis.
 * Works in both browser and Node.js environments.
 *
 * Enhanced with dynamic NLP capabilities:
 * - WordNet synonyms/hypernyms (server-side)
 * - Semantic embeddings (browser + server)
 * - Taxonomy similarity (Soundex, Metaphone, Levenshtein)
 *
 * @module lib/indexer/vocabulary
 */

import { PorterStemmer, getStemmer } from './porter-stemmer'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Classification Hierarchy:
 * - subjects: Highest level (technology, science, philosophy, ai)
 * - topics: Second level (getting-started, architecture, troubleshooting)
 * - tags: Lowest level, lightweight (api, database, web, tutorial)
 * - skills: Extension of tags for prerequisites, visually distinct (react, python, docker)
 * - difficulty: Complexity level (beginner, intermediate, advanced)
 */
export interface VocabularyData {
  subjects: Record<string, string[]>
  topics: Record<string, string[]>
  tags: Record<string, string[]>
  difficulty: Record<string, string[]>
  skills: Record<string, string[]>
}

export interface ClassificationResult {
  subjects: string[]
  topics: string[]
  tags: string[]
  skills: string[]
  difficulty: string
  confidence: Record<string, number>
  keywords: string[]
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULT VOCABULARY
═══════════════════════════════════════════════════════════════════════════ */

const DEFAULT_VOCABULARY: VocabularyData = {
  subjects: {
    technology: [
      'api', 'code', 'software', 'programming', 'development', 'algorithm', 'database',
      'framework', 'library', 'module', 'function', 'class', 'object', 'interface',
      'protocol', 'server', 'client', 'backend', 'frontend', 'fullstack', 'devops',
      'cloud', 'docker', 'kubernetes', 'microservices', 'architecture', 'design-pattern',
    ],
    science: [
      'research', 'study', 'experiment', 'hypothesis', 'theory', 'data', 'analysis',
      'observation', 'conclusion', 'methodology', 'peer-review', 'publication',
    ],
    philosophy: [
      'ethics', 'morality', 'existence', 'consciousness', 'epistemology', 'ontology',
      'metaphysics', 'logic', 'reasoning', 'wisdom', 'truth', 'knowledge',
    ],
    ai: [
      'artificial-intelligence', 'machine-learning', 'neural-network', 'deep-learning',
      'model', 'training', 'inference', 'nlp', 'natural-language', 'transformer',
      'gpt', 'llm', 'embedding', 'vector', 'rag', 'prompt', 'fine-tuning',
    ],
    knowledge: [
      'information', 'data', 'wisdom', 'learning', 'documentation', 'wiki', 'guide',
      'tutorial', 'reference', 'manual', 'handbook', 'glossary', 'index',
    ],
  },
  topics: {
    'getting-started': [
      'tutorial', 'guide', 'introduction', 'beginner', 'quickstart', 'setup',
      'install', 'configure', 'first-steps', 'hello-world', 'basics',
    ],
    architecture: [
      'design', 'structure', 'pattern', 'system', 'component', 'module',
      'layer', 'service', 'microservice', 'monolith', 'distributed',
    ],
    troubleshooting: [
      'error', 'issue', 'problem', 'fix', 'debug', 'solution', 'workaround',
      'bug', 'crash', 'failure', 'exception', 'stack-trace',
    ],
    performance: [
      'optimization', 'speed', 'cache', 'memory', 'cpu', 'latency', 'throughput',
      'benchmark', 'profiling', 'bottleneck', 'scalability',
    ],
    security: [
      'authentication', 'authorization', 'encryption', 'ssl', 'tls', 'jwt',
      'oauth', 'cors', 'xss', 'csrf', 'injection', 'vulnerability',
    ],
  },
  tags: {
    general: [
      'api', 'web', 'mobile', 'desktop', 'cli', 'ui', 'ux', 'config', 'docs',
      'example', 'demo', 'snippet', 'template', 'boilerplate', 'starter',
    ],
    concepts: [
      'async', 'sync', 'concurrent', 'parallel', 'event', 'stream', 'queue',
      'pub-sub', 'webhook', 'callback', 'promise', 'observable', 'reactive',
    ],
    operations: [
      'crud', 'read', 'write', 'update', 'delete', 'query', 'mutation',
      'migration', 'deploy', 'build', 'test', 'lint', 'format',
    ],
    data: [
      'json', 'xml', 'yaml', 'csv', 'binary', 'base64', 'utf8', 'encoding',
      'parsing', 'serialization', 'validation', 'schema', 'type',
    ],
    infrastructure: [
      'server', 'client', 'network', 'dns', 'http', 'https', 'tcp', 'udp',
      'load-balancer', 'cdn', 'proxy', 'gateway', 'firewall',
    ],
  },
  difficulty: {
    beginner: [
      'basic', 'simple', 'intro', 'fundamental', 'easy', 'starter', 'first',
      'elementary', 'novice', 'getting-started', 'tutorial',
    ],
    intermediate: [
      'moderate', 'practical', 'hands-on', 'implement', 'build', 'develop',
      'create', 'extend', 'integrate', 'configure',
    ],
    advanced: [
      'complex', 'expert', 'optimization', 'performance', 'architecture',
      'scale', 'distributed', 'advanced', 'deep-dive', 'internals',
    ],
  },
  skills: {
    'programming-languages': [
      'javascript', 'typescript', 'python', 'rust', 'go', 'java', 'csharp',
      'cpp', 'c', 'ruby', 'php', 'swift', 'kotlin', 'scala',
    ],
    frameworks: [
      'react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'express',
      'fastapi', 'django', 'flask', 'spring', 'rails',
    ],
    databases: [
      'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite', 'dynamodb',
      'cassandra', 'elasticsearch', 'prisma', 'typeorm', 'sequelize',
    ],
    devops: [
      'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'terraform', 'ansible',
      'jenkins', 'github-actions', 'gitlab-ci', 'circleci',
    ],
    testing: [
      'jest', 'vitest', 'mocha', 'pytest', 'cypress', 'playwright',
      'testing-library', 'unit-test', 'integration-test', 'e2e',
    ],
  },
}

const DEFAULT_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
  'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just', 'don',
  'now', 'use', 'using', 'used', 'also', 'like', 'get', 'make', 'way',
])

/* ═══════════════════════════════════════════════════════════════════════════
   VOCABULARY CLASS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Browser-compatible vocabulary loader and classifier
 *
 * Enhanced to use VocabularyService for dynamic NLP capabilities
 * while maintaining full backward compatibility with existing API.
 */
export class Vocabulary {
  private stemmer: PorterStemmer
  private vocabulary: VocabularyData
  private stopWords: Set<string>
  private stemmedIndex: Map<string, Set<string>> = new Map()

  // N-gram weights
  private ngramWeights = {
    trigram: 3.0,
    bigram: 2.0,
    unigram: 1.0,
  }

  // Lazy-loaded VocabularyService for enhanced NLP
  private _vocabularyService: any = null
  private _serviceInitPromise: Promise<void> | null = null

  // Cache for async classification results
  private _classifyCache: Map<string, { result: ClassificationResult; timestamp: number }> = new Map()
  private _cacheTTL = 60000 // 1 minute cache

  constructor(vocabulary?: VocabularyData, stopWords?: Set<string>) {
    this.stemmer = getStemmer()
    this.vocabulary = vocabulary || DEFAULT_VOCABULARY
    this.stopWords = stopWords || DEFAULT_STOP_WORDS
    this.buildStemmedIndex()
  }

  /**
   * Lazy-load VocabularyService for enhanced NLP capabilities
   */
  private async getVocabularyService() {
    if (this._vocabularyService) {
      return this._vocabularyService
    }

    if (!this._serviceInitPromise) {
      this._serviceInitPromise = (async () => {
        try {
          const { getVocabularyService: getService } = await import('./vocabularyService')
          this._vocabularyService = getService()
          await this._vocabularyService.initialize()
        } catch (err) {
          console.warn('[Vocabulary] VocabularyService not available, using basic mode:', err)
          this._vocabularyService = null
        }
      })()
    }

    await this._serviceInitPromise
    return this._vocabularyService
  }

  /**
   * Build stemmed index for faster lookups
   */
  private buildStemmedIndex(): void {
    const addToIndex = (term: string) => {
      const normalized = this.normalize(term)
      const stemmed = this.stem(normalized)
      if (!this.stemmedIndex.has(stemmed)) {
        this.stemmedIndex.set(stemmed, new Set())
      }
      this.stemmedIndex.get(stemmed)!.add(normalized)
    }

    for (const category of Object.values(this.vocabulary) as Record<string, string[]>[]) {
      for (const terms of Object.values(category)) {
        terms.forEach(addToIndex)
      }
    }
  }

  /**
   * Normalize a term
   */
  normalize(term: string): string {
    return term
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  /**
   * Stem a term
   */
  stem(term: string): string {
    const normalized = this.normalize(term)
    if (!normalized) return ''

    if (normalized.includes('-')) {
      return normalized
        .split('-')
        .map((p) => this.stemmer.stem(p))
        .join('-')
    }

    return this.stemmer.stem(normalized)
  }

  /**
   * Check if a word is a stop word
   */
  isStopWord(word: string): boolean {
    return this.stopWords.has(word.toLowerCase())
  }

  /**
   * Tokenize text into words
   */
  tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !this.isStopWord(word))
  }

  /**
   * Extract n-grams from text
   */
  extractNgrams(text: string): { trigrams: string[]; bigrams: string[]; unigrams: string[] } {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1)

    const trigrams: string[] = []
    const bigrams: string[] = []
    const unigrams: string[] = []

    // Trigrams
    for (let i = 0; i <= words.length - 3; i++) {
      const trigram = words.slice(i, i + 3).join(' ')
      const hyphenated = words.slice(i, i + 3).join('-')
      trigrams.push(trigram, hyphenated)
    }

    // Bigrams
    for (let i = 0; i <= words.length - 2; i++) {
      const bigram = words.slice(i, i + 2).join(' ')
      const hyphenated = words.slice(i, i + 2).join('-')
      bigrams.push(bigram, hyphenated)
    }

    // Unigrams
    for (const word of words) {
      if (!this.isStopWord(word)) {
        unigrams.push(word)
        const stemmed = this.stem(word)
        if (stemmed !== word) {
          unigrams.push(stemmed)
        }
      }
    }

    return { trigrams, bigrams, unigrams }
  }

  /**
   * Extract keywords using TF scoring
   */
  extractKeywords(text: string, limit = 15): string[] {
    const tokens = this.tokenize(text)
    const freq = new Map<string, number>()

    for (const token of tokens) {
      const stemmed = this.stem(token)
      freq.set(stemmed, (freq.get(stemmed) || 0) + 1)
    }

    // Score by frequency * word length
    const scored = [...freq.entries()]
      .map(([word, count]) => ({
        word,
        original: this.stemmedIndex.get(word)?.values().next().value || word,
        score: count * Math.log(word.length + 1),
      }))
      .sort((a, b) => b.score - a.score)

    return scored.slice(0, limit).map((s) => s.original)
  }

  /**
   * Classify text against vocabularies (synchronous, basic mode)
   *
   * Uses n-gram matching against hardcoded vocabulary.
   * For enhanced NLP with synonyms/embeddings, use classifyAsync().
   */
  classify(text: string): ClassificationResult {
    // Check cache first
    const cacheKey = this.hashText(text)
    const cached = this._classifyCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this._cacheTTL) {
      return cached.result
    }

    const result: ClassificationResult = {
      subjects: [],
      topics: [],
      tags: [],
      skills: [],
      difficulty: 'intermediate',
      confidence: {},
      keywords: this.extractKeywords(text),
    }

    const { trigrams, bigrams, unigrams } = this.extractNgrams(text)
    const trigramSet = new Set(trigrams)
    const bigramSet = new Set(bigrams)
    const unigramSet = new Set(unigrams)

    // Match subjects
    for (const [subject, terms] of Object.entries(this.vocabulary.subjects)) {
      let score = 0
      for (const term of terms) {
        const termNormalized = term.toLowerCase()
        if (trigramSet.has(termNormalized.replace(/-/g, ' '))) {
          score += this.ngramWeights.trigram
        } else if (bigramSet.has(termNormalized.replace(/-/g, ' '))) {
          score += this.ngramWeights.bigram
        } else if (unigramSet.has(termNormalized) || unigramSet.has(this.stem(termNormalized))) {
          score += this.ngramWeights.unigram
        }
      }

      if (score > 0) {
        result.subjects.push(subject)
        result.confidence[subject] = Math.min(score / 10, 1)
      }
    }

    // Match topics
    for (const [topic, terms] of Object.entries(this.vocabulary.topics)) {
      let score = 0
      for (const term of terms) {
        const termNormalized = term.toLowerCase()
        if (trigramSet.has(termNormalized.replace(/-/g, ' '))) {
          score += this.ngramWeights.trigram
        } else if (bigramSet.has(termNormalized.replace(/-/g, ' '))) {
          score += this.ngramWeights.bigram
        } else if (unigramSet.has(termNormalized) || unigramSet.has(this.stem(termNormalized))) {
          score += this.ngramWeights.unigram
        }
      }

      if (score > 0) {
        result.topics.push(topic)
        result.confidence[topic] = Math.min(score / 6, 1)
      }
    }

    // Match tags (lightweight, lowest level)
    for (const [, terms] of Object.entries(this.vocabulary.tags)) {
      for (const term of terms) {
        const termNormalized = term.toLowerCase()
        if (
          unigramSet.has(termNormalized) ||
          unigramSet.has(this.stem(termNormalized)) ||
          bigramSet.has(termNormalized.replace(/-/g, ' '))
        ) {
          const tag = termNormalized.replace(/\s+/g, '-')
          if (!result.tags.includes(tag)) {
            result.tags.push(tag)
            result.confidence[`tag:${tag}`] = 0.6
          }
        }
      }
    }

    // Limit tags to top 15
    if (result.tags.length > 15) {
      result.tags = result.tags.slice(0, 15)
    }

    // Match skills
    for (const [, terms] of Object.entries(this.vocabulary.skills)) {
      for (const term of terms) {
        const termNormalized = term.toLowerCase()
        if (
          unigramSet.has(termNormalized) ||
          unigramSet.has(this.stem(termNormalized)) ||
          bigramSet.has(termNormalized.replace(/-/g, ' '))
        ) {
          const skill = termNormalized.replace(/\s+/g, '-')
          if (!result.skills.includes(skill)) {
            result.skills.push(skill)
            result.confidence[`skill:${skill}`] = 0.7
          }
        }
      }
    }

    // Limit skills to top 10
    if (result.skills.length > 10) {
      result.skills = result.skills.slice(0, 10)
    }

    // Determine difficulty
    let maxScore = 0
    for (const [level, terms] of Object.entries(this.vocabulary.difficulty)) {
      const matches = terms.filter(
        (t) => unigramSet.has(t) || unigramSet.has(this.stem(t))
      ).length
      if (matches > maxScore) {
        maxScore = matches
        result.difficulty = level
      }
    }

    // Cache the result
    this._classifyCache.set(cacheKey, { result, timestamp: Date.now() })

    return result
  }

  /**
   * Classify text using enhanced NLP (async)
   *
   * Uses VocabularyService for:
   * - WordNet synonyms/hypernyms (server-side)
   * - Semantic embedding similarity (browser + server)
   * - Taxonomy phonetic matching (Soundex, Metaphone)
   * - Acronym expansion
   *
   * Falls back to basic classify() if VocabularyService unavailable.
   */
  async classifyAsync(text: string): Promise<ClassificationResult> {
    try {
      const service = await this.getVocabularyService()

      if (service) {
        // Use VocabularyService for enhanced classification
        const serviceResult = await service.classify(text)

        // Convert ServiceClassificationResult to local ClassificationResult
        return {
          subjects: serviceResult.subjects,
          topics: serviceResult.topics,
          tags: serviceResult.tags ?? [],
          skills: serviceResult.skills,
          difficulty: serviceResult.difficulty,
          confidence: serviceResult.confidence,
          keywords: serviceResult.keywords,
        }
      }
    } catch (err) {
      console.warn('[Vocabulary] classifyAsync failed, using basic mode:', err)
    }

    // Fallback to synchronous basic classification
    return this.classify(text)
  }

  /**
   * Expand a term using NLP (async)
   *
   * Returns synonyms, hypernyms, and semantically similar terms.
   * Uses VocabularyService for dynamic expansion.
   */
  async expandTerm(term: string): Promise<string[]> {
    try {
      const service = await this.getVocabularyService()

      if (service) {
        return await service.expandTerm(term)
      }
    } catch (err) {
      console.warn('[Vocabulary] expandTerm failed:', err)
    }

    // Fallback: just return the term itself
    return [term]
  }

  /**
   * Find semantically similar terms (async)
   *
   * Uses embedding similarity to find related vocabulary terms.
   */
  async findSimilarTerms(
    text: string,
    category?: 'subject' | 'topic' | 'skill' | 'difficulty',
    topK = 5
  ): Promise<Array<{ term: string; score: number }>> {
    try {
      const service = await this.getVocabularyService()

      if (service) {
        return await service.findSimilarTerms(text, category, topK)
      }
    } catch (err) {
      console.warn('[Vocabulary] findSimilarTerms failed:', err)
    }

    // Fallback: return empty array
    return []
  }

  /**
   * Simple hash for cache key generation
   */
  private hashText(text: string): string {
    let hash = 0
    const str = text.slice(0, 500) // Only hash first 500 chars
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(36)
  }

  /**
   * Get vocabulary statistics
   */
  getStats(): {
    subjects: number
    topics: number
    tags: number
    skills: number
    difficulty: number
    stemmedIndex: number
  } {
    return {
      subjects: Object.keys(this.vocabulary.subjects).length,
      topics: Object.keys(this.vocabulary.topics).length,
      tags: Object.keys(this.vocabulary.tags).length,
      skills: Object.keys(this.vocabulary.skills).length,
      difficulty: Object.keys(this.vocabulary.difficulty).length,
      stemmedIndex: this.stemmedIndex.size,
    }
  }

  /**
   * Merge custom vocabulary with defaults
   */
  static merge(custom: Partial<VocabularyData>): VocabularyData {
    const merged = { ...DEFAULT_VOCABULARY }
    for (const [category, data] of Object.entries(custom)) {
      if (category in merged) {
        merged[category as keyof VocabularyData] = {
          ...merged[category as keyof VocabularyData],
          ...data,
        }
      }
    }
    return merged
  }
}

// Singleton instance
let vocabularyInstance: Vocabulary | null = null

/**
 * Get shared vocabulary instance
 */
export function getVocabulary(): Vocabulary {
  if (!vocabularyInstance) {
    vocabularyInstance = new Vocabulary()
  }
  return vocabularyInstance
}

export default Vocabulary
