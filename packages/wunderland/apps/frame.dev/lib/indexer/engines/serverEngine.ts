/**
 * Server Vocabulary Engine
 * @module lib/indexer/engines/serverEngine
 *
 * Server-side vocabulary engine with full NLP capabilities:
 * - WordNet synonyms, hypernyms, hyponyms
 * - Embedding similarity (when available)
 * - Taxonomy utilities (Soundex, Metaphone, Levenshtein, etc.)
 * - Compromise.js NER
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
  cosineSimilarity,
  type VocabularyEmbeddingsData,
} from '../vocabulary-embeddings'

// Import WordNet functions
import {
  getSynonyms,
  getHypernyms,
  getHyponyms,
  getWordNetSimilarity,
} from '../../nlp/wordnet'

// Import taxonomy utilities
import {
  soundex,
  metaphone,
  expandAcronym,
  areSimilarEnhanced,
  calculateSimilarityScore,
  normalizeTerm,
} from '../../taxonomy'

// Import NLP functions
import { extractTechEntities, extractKeywords } from '../../nlp'

/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULT VOCABULARY (Fallback)
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

/* ═══════════════════════════════════════════════════════════════════════════
   SERVER VOCABULARY ENGINE
═══════════════════════════════════════════════════════════════════════════ */

export class ServerVocabularyEngine implements VocabularyEngine {
  readonly name = 'server'

  private config: VocabularyServiceConfig
  private vocabulary: VocabularyData = DEFAULT_VOCABULARY
  private embeddingsData: VocabularyEmbeddingsData | null = null
  private initialized = false

  // Caches
  private expansionCache = new Map<string, string[]>()
  private wordnetCache = new Map<string, { synonyms: string[]; hypernyms: string[] }>()

  constructor(config: VocabularyServiceConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    // Try to load pre-computed embeddings
    if (this.config.useEmbeddings !== false) {
      this.embeddingsData = await loadVocabularyEmbeddings()
    }

    this.initialized = true
    console.info('[ServerVocabularyEngine] Initialized with WordNet + embeddings support')
  }

  isReady(): boolean {
    return this.initialized
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TERM EXPANSION (with WordNet)
  ═══════════════════════════════════════════════════════════════════════ */

  async expandTerm(term: string): Promise<string[]> {
    const normalized = normalizeTerm(term)

    // Check cache
    const cached = this.expansionCache.get(normalized)
    if (cached) return cached

    const expanded = new Set<string>([term, normalized])

    // 1. Acronym expansion
    const acronymExpanded = expandAcronym(normalized)
    if (acronymExpanded) {
      acronymExpanded.forEach((a) => expanded.add(a))
    }

    // 2. WordNet synonyms (server-only)
    try {
      const synonyms = await getSynonyms(normalized)
      synonyms.forEach((s) => expanded.add(s))
    } catch (err) {
      // WordNet may not be available
    }

    // 3. WordNet hypernyms (broader terms)
    try {
      const hypernyms = await getHypernyms(normalized, 2)
      hypernyms.slice(0, 3).forEach((h) => expanded.add(h))
    } catch (err) {
      // WordNet may not be available
    }

    // 4. Phonetic variations (Soundex/Metaphone matches from vocabulary)
    const phonetic = this.findPhoneticMatches(normalized)
    phonetic.forEach((p) => expanded.add(p))

    const result = Array.from(expanded)
    this.expansionCache.set(normalized, result)
    return result
  }

  /**
   * Find vocabulary terms that sound similar
   */
  private findPhoneticMatches(term: string): string[] {
    const matches: string[] = []
    const termSoundex = soundex(term)
    const termMetaphone = metaphone(term)

    for (const [, terms] of Object.entries(this.vocabulary.subjects)) {
      for (const vocabTerm of terms) {
        if (soundex(vocabTerm) === termSoundex || metaphone(vocabTerm) === termMetaphone) {
          matches.push(vocabTerm)
        }
      }
    }

    return matches.slice(0, 5)
  }

  /* ═══════════════════════════════════════════════════════════════════════
     SIMILARITY SEARCH
  ═══════════════════════════════════════════════════════════════════════ */

  async findSimilarTerms(
    text: string,
    category?: VocabularyCategory
  ): Promise<ScoredTerm[]> {
    const results: ScoredTerm[] = []
    const minScore = this.config.minSimilarityScore ?? 0.3

    // Extract keywords from text
    const keywords = extractKeywords(text)

    for (const keywordObj of keywords) {
      const keyword = keywordObj.word
      // 1. Check WordNet similarity against vocabulary terms
      const vocabTerms = this.getVocabularyTermsForCategory(category)

      for (const vocabTerm of vocabTerms) {
        const similarity = await getWordNetSimilarity(keyword, vocabTerm.term)
        if (similarity && similarity.score >= minScore) {
          results.push({
            term: vocabTerm.term,
            category: vocabTerm.category,
            subcategory: vocabTerm.subcategory,
            score: similarity.score,
            matchType: similarity.relationship === 'synonym' ? 'synonym' : 'embedding',
          })
        }
      }

      // 2. Taxonomy similarity (fuzzy matching)
      for (const vocabTerm of vocabTerms) {
        const result = calculateSimilarityScore(keyword, vocabTerm.term)
        if (result.score >= minScore && !results.find((r) => r.term === vocabTerm.term)) {
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

    // Sort by score and deduplicate
    return results
      .sort((a, b) => b.score - a.score)
      .filter((r, i, arr) => arr.findIndex((x) => x.term === r.term) === i)
      .slice(0, this.config.maxResults ?? 10)
  }

  /**
   * Get all vocabulary terms, optionally filtered by category
   */
  private getVocabularyTermsForCategory(
    category?: VocabularyCategory
  ): Array<{ term: string; category: VocabularyCategory; subcategory: string }> {
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

    // 1. Extract entities using NLP
    const entities = extractTechEntities(text)
    const allTerms = [
      ...(entities.languages || []),
      ...(entities.frameworks || []),
      ...(entities.databases || []),
      ...(entities.cloud || []),
      ...(entities.ai || []),
      ...(entities.other || []),
      ...result.keywords,
    ]

    // 2. Match subjects with WordNet expansion
    for (const [subject, terms] of Object.entries(this.vocabulary.subjects)) {
      let score = 0
      for (const vocabTerm of terms) {
        for (const inputTerm of allTerms) {
          // Direct match
          if (inputTerm.toLowerCase() === vocabTerm.toLowerCase()) {
            score += 2
            continue
          }
          // WordNet similarity
          const similarity = await getWordNetSimilarity(inputTerm, vocabTerm)
          if (similarity && similarity.score > 0.7) {
            score += similarity.score
          }
          // Fuzzy match
          if (areSimilarEnhanced(inputTerm, vocabTerm)) {
            score += 0.5
          }
        }
      }
      if (score > 0) {
        result.subjects.push(subject)
        result.confidence[subject] = Math.min(score / 10, 1)
      }
    }

    // 3. Match topics
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
      if (score > 0) {
        result.topics.push(topic)
        result.confidence[topic] = Math.min(score / 6, 1)
      }
    }

    // 4. Match tags (lightweight, lowest level)
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
              result.confidence[`tag:${tag}`] = 0.6
            }
          }
        }
      }
    }

    // Limit tags
    result.tags = result.tags.slice(0, 15)

    // 5. Match skills (more direct matching, prerequisites)
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
              result.confidence[`skill:${skill}`] = 0.7
            }
          }
        }
      }
    }

    // Limit skills
    result.skills = result.skills.slice(0, 10)

    // 5. Determine difficulty
    let maxScore = 0
    for (const [level, terms] of Object.entries(this.vocabulary.difficulty)) {
      const matches = terms.filter((t) =>
        allTerms.some((input) => input.toLowerCase() === t.toLowerCase() || areSimilarEnhanced(input, t))
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
        const synonyms = await getSynonyms(term)
        const hypernyms = await getHypernyms(term, 2)
        const hyponyms = await getHyponyms(term, 1)

        return {
          original: term,
          synonyms,
          hypernyms,
          related: hyponyms,
        }
      })
    )
  }

  async findRelatedTerms(term: string): Promise<RelatedTerms> {
    const synonyms = await getSynonyms(term)
    const hypernyms = await getHypernyms(term, 2)
    const hyponyms = await getHyponyms(term, 1)

    return {
      term,
      synonyms: synonyms.map((s) => ({
        term: s,
        category: 'subject' as VocabularyCategory,
        subcategory: '',
        score: 0.9,
        matchType: 'synonym' as const,
      })),
      broader: hypernyms.map((h) => ({
        term: h,
        category: 'subject' as VocabularyCategory,
        subcategory: '',
        score: 0.8,
        matchType: 'embedding' as const,
      })),
      narrower: hyponyms.map((h) => ({
        term: h,
        category: 'subject' as VocabularyCategory,
        subcategory: '',
        score: 0.7,
        matchType: 'embedding' as const,
      })),
      related: [],
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     STATISTICS
  ═══════════════════════════════════════════════════════════════════════ */

  getStats(): VocabularyEngineStats {
    let totalTerms = 0
    for (const cat of Object.values(this.vocabulary)) {
      for (const terms of Object.values(cat as Record<string, string[]>)) {
        totalTerms += terms.length
      }
    }

    return {
      name: this.name,
      initialized: this.initialized,
      capabilities: {
        wordnet: true,
        embeddings: this.embeddingsData !== null,
        taxonomy: true,
        ner: true,
      },
      vocabularyTerms: totalTerms,
      cacheHits: 0,
      cacheMisses: 0,
    }
  }
}

export default ServerVocabularyEngine
