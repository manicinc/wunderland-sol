/**
 * Browser Vocabulary Engine
 * @module lib/indexer/engines/browserEngine
 *
 * Browser-side vocabulary engine using:
 * - Pre-computed vocabulary embeddings (from build time)
 * - Embedding similarity via HybridEmbeddingEngine
 * - Taxonomy utilities (Soundex, Metaphone, Levenshtein, etc.)
 * - Compromise.js NER
 *
 * NOTE: WordNet is NOT available in browser. We use pre-computed synonyms
 * from the vocabulary-embeddings.json file instead.
 */

import type { ClassificationResult, VocabularyData } from '../vocabulary'
import type {
  VocabularyCategory,
  ScoredTerm,
  ExpandedVocabulary,
  RelatedTerms,
} from '../vocabulary-embeddings'
import type { VocabularyEngine, VocabularyEngineStats, VocabularyServiceConfig } from '../vocabularyService'
import {
  loadVocabularyEmbeddings,
  findSimilarEmbeddings,
  findEmbeddingByTerm,
  findEmbeddingsBySynonym,
  cosineSimilarity,
  type VocabularyEmbeddingsData,
  type VocabularyEmbedding,
} from '../vocabulary-embeddings'

// Import taxonomy utilities (browser-compatible)
import {
  soundex,
  metaphone,
  expandAcronym,
  areSimilarEnhanced,
  calculateSimilarityScore,
  normalizeTerm,
  levenshteinDistance,
} from '../../taxonomy'

// Import NLP functions (browser-compatible via Compromise.js)
import { extractEntities, extractKeywords } from '../../nlp'

// Import embedding engine
import { HybridEmbeddingEngine } from '../../search/embeddingEngine'

/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULT VOCABULARY (Fallback when embeddings unavailable)
═══════════════════════════════════════════════════════════════════════════ */

const DEFAULT_VOCABULARY: VocabularyData = {
  subjects: {
    technology: [
      'api', 'code', 'software', 'programming', 'development', 'algorithm', 'database',
      'framework', 'library', 'module', 'function', 'class', 'object', 'interface',
    ],
    science: ['research', 'study', 'experiment', 'hypothesis', 'theory', 'data', 'analysis'],
    philosophy: ['ethics', 'morality', 'existence', 'consciousness', 'epistemology'],
    ai: ['artificial-intelligence', 'machine-learning', 'neural-network', 'deep-learning', 'llm', 'gpt'],
    knowledge: ['information', 'documentation', 'wiki', 'guide', 'tutorial', 'reference'],
  },
  topics: {
    'getting-started': ['tutorial', 'guide', 'introduction', 'beginner', 'quickstart', 'setup'],
    architecture: ['design', 'structure', 'pattern', 'system', 'component', 'module'],
    troubleshooting: ['error', 'issue', 'problem', 'fix', 'debug', 'solution'],
    performance: ['optimization', 'speed', 'cache', 'memory', 'latency', 'throughput'],
    security: ['authentication', 'authorization', 'encryption', 'ssl', 'jwt', 'oauth'],
  },
  tags: {
    general: ['api', 'web', 'mobile', 'desktop', 'cli', 'ui', 'ux', 'config', 'docs'],
    concepts: ['async', 'sync', 'concurrent', 'parallel', 'event', 'stream', 'queue'],
    operations: ['crud', 'read', 'write', 'update', 'delete', 'query', 'mutation'],
    data: ['json', 'xml', 'yaml', 'csv', 'binary', 'base64', 'parsing', 'validation'],
    infrastructure: ['server', 'client', 'network', 'dns', 'http', 'https', 'proxy'],
  },
  difficulty: {
    beginner: ['basic', 'simple', 'intro', 'fundamental', 'easy', 'starter'],
    intermediate: ['moderate', 'practical', 'hands-on', 'implement', 'build'],
    advanced: ['complex', 'expert', 'optimization', 'performance', 'architecture'],
  },
  skills: {
    'programming-languages': ['javascript', 'typescript', 'python', 'rust', 'go', 'java'],
    frameworks: ['react', 'vue', 'angular', 'nextjs', 'express', 'fastapi'],
    databases: ['sql', 'postgresql', 'mongodb', 'redis', 'sqlite'],
    devops: ['docker', 'kubernetes', 'aws', 'gcp', 'terraform'],
    testing: ['jest', 'vitest', 'pytest', 'cypress', 'playwright'],
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   BROWSER VOCABULARY ENGINE
═══════════════════════════════════════════════════════════════════════════ */

export class BrowserVocabularyEngine implements VocabularyEngine {
  readonly name = 'browser'

  private config: VocabularyServiceConfig
  private vocabulary: VocabularyData = DEFAULT_VOCABULARY
  private embeddingsData: VocabularyEmbeddingsData | null = null
  private embeddingEngine: HybridEmbeddingEngine | null = null
  private initialized = false

  // Lookup maps for fast access
  private termToEmbedding = new Map<string, VocabularyEmbedding>()
  private soundexIndex = new Map<string, string[]>()
  private metaphoneIndex = new Map<string, string[]>()

  constructor(config: VocabularyServiceConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    // 1. Load pre-computed embeddings
    if (this.config.useEmbeddings !== false) {
      this.embeddingsData = await loadVocabularyEmbeddings()
      if (this.embeddingsData) {
        this.buildLookupIndices()
      }
    }

    // 2. Initialize embedding engine for runtime similarity
    try {
      this.embeddingEngine = new HybridEmbeddingEngine({
        debugLevel: 'warn',
      })
      await this.embeddingEngine.initialize()
      console.info('[BrowserVocabularyEngine] Embedding engine:', this.embeddingEngine.getStatusDescription())
    } catch (err) {
      console.warn('[BrowserVocabularyEngine] Embedding engine unavailable, using fallback')
    }

    this.initialized = true
    console.info('[BrowserVocabularyEngine] Initialized with embeddings + taxonomy')
  }

  /**
   * Build lookup indices for fast phonetic matching
   */
  private buildLookupIndices(): void {
    if (!this.embeddingsData) return

    for (const embedding of this.embeddingsData.embeddings) {
      // Term → Embedding map
      this.termToEmbedding.set(embedding.term, embedding)

      // Soundex index
      const sx = soundex(embedding.term)
      if (!this.soundexIndex.has(sx)) {
        this.soundexIndex.set(sx, [])
      }
      this.soundexIndex.get(sx)!.push(embedding.term)

      // Metaphone index
      const mp = metaphone(embedding.term)
      if (!this.metaphoneIndex.has(mp)) {
        this.metaphoneIndex.set(mp, [])
      }
      this.metaphoneIndex.get(mp)!.push(embedding.term)
    }

    console.info(`[BrowserVocabularyEngine] Built indices: ${this.termToEmbedding.size} terms`)
  }

  isReady(): boolean {
    return this.initialized
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TERM EXPANSION (without WordNet)
  ═══════════════════════════════════════════════════════════════════════ */

  async expandTerm(term: string): Promise<string[]> {
    const normalized = normalizeTerm(term)
    const expanded = new Set<string>([term, normalized])

    // 1. Acronym expansion
    const acronymExpanded = expandAcronym(normalized)
    if (acronymExpanded) {
      acronymExpanded.forEach((a) => expanded.add(a))
    }

    // 2. Pre-computed synonyms (from embeddings data)
    if (this.embeddingsData) {
      const embedding = findEmbeddingByTerm(this.embeddingsData, normalized)
      if (embedding?.synonyms) {
        embedding.synonyms.forEach((s) => expanded.add(s))
      }
      if (embedding?.hypernyms) {
        embedding.hypernyms.slice(0, 3).forEach((h) => expanded.add(h))
      }
    }

    // 3. Phonetic matches (Soundex)
    const soundexMatches = this.findBySoundex(normalized)
    soundexMatches.slice(0, 3).forEach((m) => expanded.add(m))

    // 4. Phonetic matches (Metaphone)
    const metaphoneMatches = this.findByMetaphone(normalized)
    metaphoneMatches.slice(0, 3).forEach((m) => expanded.add(m))

    // 5. Levenshtein near-matches
    const levenshteinMatches = this.findByLevenshtein(normalized, 2)
    levenshteinMatches.slice(0, 3).forEach((m) => expanded.add(m))

    return Array.from(expanded)
  }

  /**
   * Find terms with matching Soundex code
   */
  private findBySoundex(term: string): string[] {
    const sx = soundex(term)
    return this.soundexIndex.get(sx)?.filter((t) => t !== term) ?? []
  }

  /**
   * Find terms with matching Metaphone code
   */
  private findByMetaphone(term: string): string[] {
    const mp = metaphone(term)
    return this.metaphoneIndex.get(mp)?.filter((t) => t !== term) ?? []
  }

  /**
   * Find terms within Levenshtein distance
   */
  private findByLevenshtein(term: string, maxDistance: number): string[] {
    const matches: string[] = []
    for (const vocabTerm of this.termToEmbedding.keys()) {
      if (vocabTerm !== term && levenshteinDistance(term, vocabTerm) <= maxDistance) {
        matches.push(vocabTerm)
      }
    }
    return matches
  }

  /* ═══════════════════════════════════════════════════════════════════════
     SIMILARITY SEARCH (Embedding-based)
  ═══════════════════════════════════════════════════════════════════════ */

  async findSimilarTerms(
    text: string,
    category?: VocabularyCategory
  ): Promise<ScoredTerm[]> {
    const results: ScoredTerm[] = []
    const minScore = this.config.minSimilarityScore ?? 0.3
    const maxResults = this.config.maxResults ?? 10

    // 1. If embeddings available, use semantic similarity
    if (this.embeddingsData && this.embeddingEngine?.isReady()) {
      try {
        const textEmbedding = await this.embeddingEngine.embedText(text)
        if (textEmbedding) {
          const similar = findSimilarEmbeddings(
            this.embeddingsData,
            Array.from(textEmbedding),
            { category, limit: maxResults, minScore }
          )
          results.push(...similar)
        }
      } catch (err) {
        console.warn('[BrowserVocabularyEngine] Embedding similarity failed:', err)
      }
    }

    // 2. Fallback/augment with keyword matching
    const keywords = extractKeywords(text)
    for (const keywordObj of keywords) {
      const keyword = keywordObj.word
      // Taxonomy similarity against all terms
      const vocabTerms = this.getVocabularyTermsForCategory(category)
      for (const vocabTerm of vocabTerms) {
        // Skip if already found via embeddings
        if (results.find((r) => r.term === vocabTerm.term)) continue

        const result = calculateSimilarityScore(keyword, vocabTerm.term)
        if (result.score >= minScore) {
          results.push({
            term: vocabTerm.term,
            category: vocabTerm.category,
            subcategory: vocabTerm.subcategory,
            score: result.score,
            matchType: 'fuzzy',
          })
        }
      }
    }

    // Sort and deduplicate
    return results
      .sort((a, b) => b.score - a.score)
      .filter((r, i, arr) => arr.findIndex((x) => x.term === r.term) === i)
      .slice(0, maxResults)
  }

  /**
   * Get vocabulary terms for a category
   */
  private getVocabularyTermsForCategory(
    category?: VocabularyCategory
  ): Array<{ term: string; category: VocabularyCategory; subcategory: string }> {
    // Prefer embeddings data if available
    if (this.embeddingsData) {
      if (category) {
        return this.embeddingsData.embeddings
          .filter((e) => e.category === category)
          .map((e) => ({ term: e.term, category: e.category, subcategory: e.subcategory }))
      }
      return this.embeddingsData.embeddings.map((e) => ({
        term: e.term,
        category: e.category,
        subcategory: e.subcategory,
      }))
    }

    // Fallback to default vocabulary
    const terms: Array<{ term: string; category: VocabularyCategory; subcategory: string }> = []
    const addTerms = (vocab: Record<string, string[]>, cat: VocabularyCategory) => {
      if (category && category !== cat) return
      for (const [subcategory, termList] of Object.entries(vocab)) {
        for (const term of termList) {
          terms.push({ term, category: cat, subcategory })
        }
      }
    }

    addTerms(this.vocabulary.subjects, 'subject')
    addTerms(this.vocabulary.topics, 'topic')
    addTerms(this.vocabulary.tags, 'tag')
    addTerms(this.vocabulary.skills, 'skill')
    addTerms(this.vocabulary.difficulty, 'difficulty')

    return terms
  }

  /* ═══════════════════════════════════════════════════════════════════════
     CLASSIFICATION
  ═══════════════════════════════════════════════════════════════════════ */

  async classifyText(text: string): Promise<ClassificationResult> {
    const result: ClassificationResult = {
      subjects: [],
      topics: [],
      tags: [],
      skills: [],
      difficulty: 'intermediate',
      confidence: {},
      keywords: extractKeywords(text).map(k => k.word),
    }

    // 1. Extract entities using Compromise.js NLP
    const entities = extractEntities(text)
    const allTerms = [
      ...entities.languages,
      ...entities.frameworks,
      ...entities.databases,
      ...entities.cloud,
      ...entities.ai,
      ...entities.other,
      ...result.keywords,
    ]

    // 2. Use embedding similarity if available
    if (this.embeddingsData && this.embeddingEngine?.isReady()) {
      try {
        const textEmbedding = await this.embeddingEngine.embedText(text)
        if (textEmbedding) {
          // Find similar subjects
          const similarSubjects = findSimilarEmbeddings(
            this.embeddingsData,
            Array.from(textEmbedding),
            { category: 'subject', limit: 5, minScore: 0.4 }
          )
          for (const match of similarSubjects) {
            if (!result.subjects.includes(match.subcategory)) {
              result.subjects.push(match.subcategory)
              result.confidence[match.subcategory] = match.score
            }
          }

          // Find similar topics
          const similarTopics = findSimilarEmbeddings(
            this.embeddingsData,
            Array.from(textEmbedding),
            { category: 'topic', limit: 5, minScore: 0.4 }
          )
          for (const match of similarTopics) {
            if (!result.topics.includes(match.subcategory)) {
              result.topics.push(match.subcategory)
              result.confidence[match.subcategory] = match.score
            }
          }

          // Find similar tags (lightweight, lowest level)
          const similarTags = findSimilarEmbeddings(
            this.embeddingsData,
            Array.from(textEmbedding),
            { category: 'tag', limit: 15, minScore: 0.4 }
          )
          for (const match of similarTags) {
            const tag = match.term.replace(/\s+/g, '-')
            if (!result.tags.includes(tag)) {
              result.tags.push(tag)
              result.confidence[`tag:${tag}`] = match.score
            }
          }

          // Find similar skills
          const similarSkills = findSimilarEmbeddings(
            this.embeddingsData,
            Array.from(textEmbedding),
            { category: 'skill', limit: 10, minScore: 0.5 }
          )
          for (const match of similarSkills) {
            const skill = match.term.replace(/\s+/g, '-')
            if (!result.skills.includes(skill)) {
              result.skills.push(skill)
              result.confidence[`skill:${skill}`] = match.score
            }
          }
        }
      } catch (err) {
        console.warn('[BrowserVocabularyEngine] Embedding classification failed, using fallback')
      }
    }

    // 3. Augment with taxonomy matching
    for (const [subject, terms] of Object.entries(this.vocabulary.subjects)) {
      let score = 0
      for (const vocabTerm of terms) {
        for (const inputTerm of allTerms) {
          if (inputTerm.toLowerCase() === vocabTerm.toLowerCase()) {
            score += 2
          } else if (areSimilarEnhanced(inputTerm, vocabTerm)) {
            score += 0.5
          }
        }
      }
      if (score > 0 && !result.subjects.includes(subject)) {
        result.subjects.push(subject)
        result.confidence[subject] = Math.max(result.confidence[subject] ?? 0, Math.min(score / 10, 1))
      }
    }

    // 4. Match topics via taxonomy
    for (const [topic, terms] of Object.entries(this.vocabulary.topics)) {
      let score = 0
      for (const vocabTerm of terms) {
        for (const inputTerm of allTerms) {
          if (inputTerm.toLowerCase() === vocabTerm.toLowerCase()) {
            score += 2
          } else if (areSimilarEnhanced(inputTerm, vocabTerm)) {
            score += 0.5
          }
        }
      }
      if (score > 0 && !result.topics.includes(topic)) {
        result.topics.push(topic)
        result.confidence[topic] = Math.max(result.confidence[topic] ?? 0, Math.min(score / 6, 1))
      }
    }

    // 4.5. Match tags via taxonomy (lightweight, lowest level)
    for (const [, terms] of Object.entries(this.vocabulary.tags)) {
      for (const vocabTerm of terms) {
        for (const inputTerm of allTerms) {
          if (
            inputTerm.toLowerCase() === vocabTerm.toLowerCase() ||
            areSimilarEnhanced(inputTerm, vocabTerm)
          ) {
            const tag = vocabTerm.replace(/\s+/g, '-')
            if (!result.tags.includes(tag)) {
              result.tags.push(tag)
              result.confidence[`tag:${tag}`] = Math.max(
                result.confidence[`tag:${tag}`] ?? 0,
                0.6
              )
            }
          }
        }
      }
    }

    // Limit tags
    result.tags = result.tags.slice(0, 15)

    // 5. Match skills via taxonomy
    for (const [, terms] of Object.entries(this.vocabulary.skills)) {
      for (const vocabTerm of terms) {
        for (const inputTerm of allTerms) {
          if (
            inputTerm.toLowerCase() === vocabTerm.toLowerCase() ||
            areSimilarEnhanced(inputTerm, vocabTerm)
          ) {
            const skill = vocabTerm.replace(/\s+/g, '-')
            if (!result.skills.includes(skill)) {
              result.skills.push(skill)
              result.confidence[`skill:${skill}`] = Math.max(
                result.confidence[`skill:${skill}`] ?? 0,
                0.7
              )
            }
          }
        }
      }
    }

    // Limit skills
    result.skills = result.skills.slice(0, 10)

    // 6. Determine difficulty
    let maxScore = 0
    for (const [level, terms] of Object.entries(this.vocabulary.difficulty)) {
      const matches = terms.filter((t) =>
        allTerms.some(
          (input) => input.toLowerCase() === t.toLowerCase() || areSimilarEnhanced(input, t)
        )
      ).length
      if (matches > maxScore) {
        maxScore = matches
        result.difficulty = level
      }
    }

    return result
  }

  /* ═══════════════════════════════════════════════════════════════════════
     VOCABULARY EXPANSION
  ═══════════════════════════════════════════════════════════════════════ */

  async expandVocabulary(terms: string[]): Promise<ExpandedVocabulary[]> {
    return Promise.all(
      terms.map(async (term) => {
        const expanded = await this.expandTerm(term)
        const embedding = this.embeddingsData
          ? findEmbeddingByTerm(this.embeddingsData, term)
          : undefined

        return {
          original: term,
          synonyms: embedding?.synonyms ?? [],
          hypernyms: embedding?.hypernyms ?? [],
          related: expanded.filter((e) => e !== term),
        }
      })
    )
  }

  async findRelatedTerms(term: string): Promise<RelatedTerms> {
    const expanded = await this.expandTerm(term)
    const embedding = this.embeddingsData
      ? findEmbeddingByTerm(this.embeddingsData, term)
      : undefined

    const synonyms: ScoredTerm[] = (embedding?.synonyms ?? []).map((s) => ({
      term: s,
      category: 'subject' as VocabularyCategory,
      subcategory: '',
      score: 0.9,
      matchType: 'synonym' as const,
    }))

    const broader: ScoredTerm[] = (embedding?.hypernyms ?? []).map((h) => ({
      term: h,
      category: 'subject' as VocabularyCategory,
      subcategory: '',
      score: 0.8,
      matchType: 'embedding' as const,
    }))

    const related: ScoredTerm[] = expanded
      .filter((e) => e !== term && !synonyms.find((s) => s.term === e))
      .map((r) => ({
        term: r,
        category: 'subject' as VocabularyCategory,
        subcategory: '',
        score: 0.6,
        matchType: 'fuzzy' as const,
      }))

    return {
      term,
      synonyms,
      broader,
      narrower: [],
      related,
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     STATISTICS
  ═══════════════════════════════════════════════════════════════════════ */

  getStats(): VocabularyEngineStats {
    const totalTerms = this.embeddingsData?.stats.totalTerms ?? 0

    return {
      name: this.name,
      initialized: this.initialized,
      capabilities: {
        wordnet: false, // Not available in browser
        embeddings: this.embeddingEngine?.isReady() ?? false,
        taxonomy: true,
        ner: true,
      },
      vocabularyTerms: totalTerms,
      cacheHits: 0,
      cacheMisses: 0,
    }
  }
}

export default BrowserVocabularyEngine
