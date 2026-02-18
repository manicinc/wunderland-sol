/**
 * Glossary Generator
 *
 * Hybrid NLP + LLM glossary generation with:
 * - NLP-first extraction (fast, offline-capable)
 * - Optional LLM enhancement for richer definitions
 * - Automatic caching of results
 * - Provider waterfall (Claude → OpenAI → NLP fallback)
 *
 * @module lib/glossary/glossaryGenerator
 */

import {
  extractTechEntities,
  extractKeywords,
  extractEntitiesAsync,
  STOP_WORDS,
} from '../nlp'
import {
  calculateSimilarityScoreAsync,
  type SimilarityResult,
} from '../taxonomy/similarityUtils'
import { DEFAULT_TAXONOMY_CONFIG } from '../taxonomy/hierarchyConfig'
import { isClaudeAvailable, generateWithClaude } from '../llm/claude'
import { isOpenAILLMAvailable, generateWithOpenAI } from '../llm/openai'
import {
  getFromCache,
  saveToCache,
  hashContent,
  type GlossaryTerm,
  type CachedGlossary,
  type GenerationMethod,
} from './glossaryCache'
import {
  loadGlossarySettings,
  resolveLLMProvider,
  type GlossarySettings,
} from './glossarySettings'
import type { LLMProvider } from '../llm/types'

// ============================================================================
// TYPES
// ============================================================================

export interface GlossaryGenerationOptions {
  /** Override default settings */
  settings?: Partial<GlossarySettings>
  /** Force regeneration (bypass cache) */
  forceRegenerate?: boolean
  /** Maximum terms to generate */
  maxTerms?: number
  /** Callback for progress updates */
  onProgress?: (stage: string, progress: number) => void
  /** Use Web Worker for background processing (default: true in browser) */
  useWorker?: boolean
}

export interface GlossaryResult {
  terms: GlossaryTerm[]
  method: GenerationMethod
  cached: boolean
  generationTimeMs: number
  fromCache?: boolean
}

// ============================================================================
// ACRONYM DEFINITIONS DATABASE
// ============================================================================

const COMMON_ACRONYMS: Record<string, string> = {
  API: 'Application Programming Interface',
  REST: 'Representational State Transfer',
  CRUD: 'Create, Read, Update, Delete',
  JSON: 'JavaScript Object Notation',
  XML: 'Extensible Markup Language',
  HTML: 'HyperText Markup Language',
  CSS: 'Cascading Style Sheets',
  SQL: 'Structured Query Language',
  NoSQL: 'Not Only SQL',
  ORM: 'Object-Relational Mapping',
  SDK: 'Software Development Kit',
  CLI: 'Command Line Interface',
  GUI: 'Graphical User Interface',
  URL: 'Uniform Resource Locator',
  URI: 'Uniform Resource Identifier',
  HTTP: 'HyperText Transfer Protocol',
  HTTPS: 'HTTP Secure',
  TCP: 'Transmission Control Protocol',
  UDP: 'User Datagram Protocol',
  IP: 'Internet Protocol',
  DNS: 'Domain Name System',
  CDN: 'Content Delivery Network',
  SSL: 'Secure Sockets Layer',
  TLS: 'Transport Layer Security',
  JWT: 'JSON Web Token',
  OAuth: 'Open Authorization',
  CORS: 'Cross-Origin Resource Sharing',
  CSRF: 'Cross-Site Request Forgery',
  XSS: 'Cross-Site Scripting',
  DOM: 'Document Object Model',
  SPA: 'Single Page Application',
  SSR: 'Server-Side Rendering',
  SSG: 'Static Site Generation',
  PWA: 'Progressive Web App',
  SEO: 'Search Engine Optimization',
  MVP: 'Minimum Viable Product',
  CI: 'Continuous Integration',
  CD: 'Continuous Deployment/Delivery',
  TDD: 'Test-Driven Development',
  BDD: 'Behavior-Driven Development',
  DDD: 'Domain-Driven Design',
  SOLID: 'Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion',
  DRY: "Don't Repeat Yourself",
  KISS: 'Keep It Simple, Stupid',
  YAGNI: "You Aren't Gonna Need It",
  IDE: 'Integrated Development Environment',
  VCS: 'Version Control System',
  Git: 'Distributed Version Control System',
  NPM: 'Node Package Manager',
  AWS: 'Amazon Web Services',
  GCP: 'Google Cloud Platform',
  VM: 'Virtual Machine',
  K8s: 'Kubernetes',
  ML: 'Machine Learning',
  AI: 'Artificial Intelligence',
  NLP: 'Natural Language Processing',
  LLM: 'Large Language Model',
  RAG: 'Retrieval-Augmented Generation',
  GPU: 'Graphics Processing Unit',
  CPU: 'Central Processing Unit',
  RAM: 'Random Access Memory',
  SSD: 'Solid State Drive',
  IoT: 'Internet of Things',
  WASM: 'WebAssembly',
  JSX: 'JavaScript XML',
  TSX: 'TypeScript XML',
  ESM: 'ECMAScript Modules',
  CJS: 'CommonJS',
  IIFE: 'Immediately Invoked Function Expression',
  REPL: 'Read-Eval-Print Loop',
  EOF: 'End of File',
  MIME: 'Multipurpose Internet Mail Extensions',
  UUID: 'Universally Unique Identifier',
  GUID: 'Globally Unique Identifier',
  SHA: 'Secure Hash Algorithm',
  MD5: 'Message Digest Algorithm 5',
  AES: 'Advanced Encryption Standard',
  RSA: 'Rivest-Shamir-Adleman',
  HMAC: 'Hash-based Message Authentication Code',
  CQRS: 'Command Query Responsibility Segregation',
  MVC: 'Model-View-Controller',
  MVVM: 'Model-View-ViewModel',
}

// ============================================================================
// NLP GENERATION
// ============================================================================

/** Max content size before sampling (50KB) */
const MAX_CONTENT_SIZE = 50000

/** Yield to main thread to prevent UI freezing */
function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve(), { timeout: 16 })
    } else {
      setTimeout(resolve, 0)
    }
  })
}

/** Similarity threshold for considering terms as duplicates */
const DEDUP_SIMILARITY_THRESHOLD = 0.75

/**
 * Check if a term is semantically similar to any existing term
 * Uses WordNet + multiple similarity methods for smart deduplication
 *
 * @returns The similar term if found, null otherwise
 */
async function findSimilarExisting(
  newTerm: string,
  existingTerms: string[],
  useWordNet = true
): Promise<{ similarTo: string; score: number; method: SimilarityResult['method'] } | null> {
  const newTermLower = newTerm.toLowerCase()

  for (const existing of existingTerms) {
    // Skip exact matches (already handled by seenTerms Set)
    if (existing.toLowerCase() === newTermLower) continue

    try {
      const result = await calculateSimilarityScoreAsync(newTerm, existing, {
        ...DEFAULT_TAXONOMY_CONFIG,
        enableWordNet: useWordNet,
        enableAcronymExpansion: true,
        enablePluralNormalization: true,
        enableCompoundDecomposition: true,
        enablePhoneticMatching: true,
        enableNgramMatching: true,
        similarityScoreThreshold: DEDUP_SIMILARITY_THRESHOLD,
      })

      if (result.score >= DEDUP_SIMILARITY_THRESHOLD) {
        return {
          similarTo: existing,
          score: result.score,
          method: result.method,
        }
      }
    } catch {
      // Similarity check failed, continue
    }
  }

  return null
}

/**
 * Batch check for semantic duplicates
 * More efficient than checking one by one for large sets
 */
async function deduplicateTermsBatch(
  terms: GlossaryTerm[],
  useWordNet = true
): Promise<GlossaryTerm[]> {
  const deduped: GlossaryTerm[] = []
  const seenTexts: string[] = []

  for (const term of terms) {
    const termLower = term.term.toLowerCase()

    // Skip if exact match already exists
    if (seenTexts.some(t => t.toLowerCase() === termLower)) continue

    // Check for semantic similarity
    const similar = await findSimilarExisting(term.term, seenTexts, useWordNet)

    if (similar) {
      // Found a semantically similar term - skip this one
      // (keep the earlier one which typically has higher confidence)
      continue
    }

    deduped.push(term)
    seenTexts.push(term.term)
  }

  return deduped
}

/**
 * Sample content for large documents
 * Takes beginning, middle, and end to capture key terms
 */
function sampleContent(content: string, maxSize: number): string {
  if (content.length <= maxSize) return content

  const chunkSize = Math.floor(maxSize / 3)
  const start = content.slice(0, chunkSize)
  const middleStart = Math.floor((content.length - chunkSize) / 2)
  const middle = content.slice(middleStart, middleStart + chunkSize)
  const end = content.slice(-chunkSize)

  return `${start}\n\n${middle}\n\n${end}`
}

export interface NLPGenerationOptions {
  /** Maximum terms to generate */
  maxTerms?: number
  /** Skip expensive Compromise.js NER (auto for large docs) */
  fastMode?: boolean
  /** Max content size before sampling */
  maxContentSize?: number
  /** Enable semantic deduplication using WordNet (default: true) */
  semanticDedup?: boolean
}

/**
 * Generate glossary terms using NLP only (fast, offline)
 * Optimized with content sampling, fast mode, and yields
 */
export async function generateWithNLP(
  content: string,
  optionsOrMaxTerms: number | NLPGenerationOptions = 50
): Promise<GlossaryTerm[]> {
  // Support legacy signature
  const options: NLPGenerationOptions = typeof optionsOrMaxTerms === 'number'
    ? { maxTerms: optionsOrMaxTerms }
    : optionsOrMaxTerms

  const {
    maxTerms = 50,
    maxContentSize = MAX_CONTENT_SIZE,
    fastMode: forceFastMode,
    semanticDedup = true,
  } = options

  const terms: GlossaryTerm[] = []
  const seenTerms = new Set<string>()

  // Determine if we should use fast mode (skip expensive NER)
  const isLargeDoc = content.length > maxContentSize
  const useFastMode = forceFastMode ?? isLargeDoc

  // Sample content for very large documents
  const processedContent = isLargeDoc
    ? sampleContent(content, maxContentSize)
    : content

  // Early termination helper
  const hasEnoughTerms = () => terms.length >= maxTerms * 1.5

  await yieldToMain()

  // 1. Extract tech entities FIRST (fast, high-value)
  const techEntities = extractTechEntities(processedContent)

  for (const [category, entities] of Object.entries(techEntities)) {
    if (hasEnoughTerms()) break
    for (const entity of entities) {
      if (hasEnoughTerms()) break
      const termLower = entity.toLowerCase()
      if (seenTerms.has(termLower)) continue
      seenTerms.add(termLower)

      terms.push({
        term: entity,
        definition: getCategoryDefinition(entity, category),
        type: 'entity',
        confidence: 0.85,
        source: 'nlp',
      })
    }
  }

  await yieldToMain()

  // 2. Extract acronyms and provide definitions (fast)
  if (!hasEnoughTerms()) {
    const acronymPattern = /\b([A-Z]{2,10})\b/g
    const acronymMatches = processedContent.matchAll(acronymPattern)
    let acronymCount = 0

    for (const match of acronymMatches) {
      if (hasEnoughTerms() || acronymCount >= 30) break
      const acronym = match[1]
      if (seenTerms.has(acronym.toLowerCase())) continue
      if (STOP_WORDS.has(acronym.toLowerCase())) continue

      const definition = COMMON_ACRONYMS[acronym]
      if (definition) {
        seenTerms.add(acronym.toLowerCase())
        acronymCount++
        terms.push({
          term: acronym,
          definition,
          type: 'acronym',
          confidence: 0.95,
          source: 'nlp',
        })
      }
    }
  }

  await yieldToMain()

  // 3. Extract named entities using Compromise.js (SLOW - skip in fast mode)
  if (!useFastMode && !hasEnoughTerms()) {
    const entities = await extractEntitiesAsync(processedContent)
    await yieldToMain()

    // Add people (limit to 5)
    for (const person of entities.people.slice(0, 5)) {
      if (hasEnoughTerms()) break
      const termLower = person.toLowerCase()
      if (seenTerms.has(termLower)) continue
      seenTerms.add(termLower)

      terms.push({
        term: person,
        definition: 'Person mentioned in the content',
        type: 'entity',
        confidence: 0.7,
        source: 'nlp',
      })
    }

    // Add organizations (limit to 5)
    for (const org of entities.organizations.slice(0, 5)) {
      if (hasEnoughTerms()) break
      const termLower = org.toLowerCase()
      if (seenTerms.has(termLower)) continue
      seenTerms.add(termLower)

      terms.push({
        term: org,
        definition: 'Organization mentioned in the content',
        type: 'entity',
        confidence: 0.7,
        source: 'nlp',
      })
    }
  }

  await yieldToMain()

  // 4. Extract keywords as potential glossary terms (fill remaining slots)
  if (!hasEnoughTerms()) {
    const keywords = extractKeywords(processedContent, 15)

    for (const { word, score } of keywords) {
      if (hasEnoughTerms()) break
      if (score < 2) continue
      const termLower = word.toLowerCase()
      if (seenTerms.has(termLower)) continue
      seenTerms.add(termLower)

      terms.push({
        term: word,
        definition: `Key concept: "${word}" appears frequently in this content`,
        type: 'keyword',
        confidence: Math.min(score / 10, 0.8),
        source: 'nlp',
      })
    }
  }

  // Sort by confidence
  const sortedTerms = terms.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))

  // Apply semantic deduplication if enabled
  // This catches synonyms like "auth" vs "authentication", "JS" vs "JavaScript"
  if (semanticDedup) {
    await yieldToMain()
    const dedupedTerms = await deduplicateTermsBatch(sortedTerms, true)
    return dedupedTerms.slice(0, maxTerms)
  }

  return sortedTerms.slice(0, maxTerms)
}

/**
 * Get a category-based definition for tech entities
 */
function getCategoryDefinition(entity: string, category: string): string {
  const categoryLabels: Record<string, string> = {
    languages: 'programming language',
    frameworks: 'framework or library',
    databases: 'database or data store',
    cloud: 'cloud platform or infrastructure',
    ai: 'AI/ML technology',
    protocols: 'protocol or standard',
    concepts: 'software engineering concept',
  }

  const label = categoryLabels[category] || 'technology'
  return `${entity} is a ${label}`
}

// ============================================================================
// LLM GENERATION
// ============================================================================

const GLOSSARY_SYSTEM_PROMPT = `You are a technical documentation expert. Generate a glossary of terms from the provided content.

For each term, provide:
1. The term itself
2. A concise, clear definition (1-2 sentences)
3. The type: "definition" (concept), "acronym", "entity" (person/org), or "keyword"

Focus on:
- Technical terms and concepts
- Acronyms and abbreviations
- Important named entities
- Key concepts central to the content

Return JSON array: [{"term": "...", "definition": "...", "type": "..."}]`

/**
 * Generate glossary terms using LLM
 */
export async function generateWithLLM(
  content: string,
  provider: 'auto' | LLMProvider = 'auto',
  maxTerms: number = 30
): Promise<GlossaryTerm[]> {
  const userPrompt = `Generate a glossary of up to ${maxTerms} key terms from this content:

${content.slice(0, 8000)}

Return as JSON array.`

  let terms: GlossaryTerm[] = []

  try {
    let response: string | null = null

    if (provider === 'auto') {
      // Waterfall: Claude → OpenAI
      if (isClaudeAvailable()) {
        try {
          response = await generateWithClaude(GLOSSARY_SYSTEM_PROMPT, userPrompt)
        } catch (e) {
          console.warn('[GlossaryGenerator] Claude failed, trying OpenAI:', e)
        }
      }

      if (!response && isOpenAILLMAvailable()) {
        try {
          response = await generateWithOpenAI(GLOSSARY_SYSTEM_PROMPT, userPrompt)
        } catch (e) {
          console.warn('[GlossaryGenerator] OpenAI failed:', e)
        }
      }
    } else if (provider === 'claude' && isClaudeAvailable()) {
      response = await generateWithClaude(GLOSSARY_SYSTEM_PROMPT, userPrompt)
    } else if (provider === 'openai' && isOpenAILLMAvailable()) {
      response = await generateWithOpenAI(GLOSSARY_SYSTEM_PROMPT, userPrompt)
    }

    if (response) {
      // Parse JSON response
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        terms = parsed.map((t: { term: string; definition: string; type?: string }) => ({
          term: t.term,
          definition: t.definition,
          type: t.type || 'definition',
          confidence: 0.9,
          source: 'llm' as const,
        }))
      }
    }
  } catch (error) {
    console.error('[GlossaryGenerator] LLM generation failed:', error)
  }

  return terms.slice(0, maxTerms)
}

/**
 * Generate hybrid glossary (NLP base + LLM enhancement)
 * Optimized: uses fast NLP mode, parallel LLM call
 */
export async function generateHybrid(
  content: string,
  provider: 'auto' | LLMProvider = 'auto',
  maxTerms: number = 50,
  onProgress?: (stage: string, progress: number) => void
): Promise<GlossaryTerm[]> {
  onProgress?.('Extracting terms with NLP...', 0.2)

  // Use fast mode for NLP - skip expensive Compromise.js NER
  // LLM will handle entity extraction better anyway
  const nlpPromise = generateWithNLP(content, {
    maxTerms,
    fastMode: true, // Skip slow NER, let LLM do it
  })

  // Start LLM call in parallel (don't wait for NLP)
  onProgress?.('Enhancing with LLM...', 0.3)
  const llmPromise = generateWithLLM(content, provider, 20).catch(error => {
    console.warn('[GlossaryGenerator] LLM enhancement failed, using NLP only:', error)
    return [] as GlossaryTerm[]
  })

  // Wait for both
  const [nlpTerms, llmTerms] = await Promise.all([nlpPromise, llmPromise])

  await yieldToMain()
  onProgress?.('Merging results...', 0.8)

  // Merge: LLM definitions take precedence for matching terms
  const merged = new Map<string, GlossaryTerm>()

  // Add NLP terms first
  for (const term of nlpTerms) {
    merged.set(term.term.toLowerCase(), term)
  }

  // LLM terms override NLP terms with same name (better definitions)
  for (const term of llmTerms) {
    const existing = merged.get(term.term.toLowerCase())
    if (existing) {
      // Keep LLM definition if it's more detailed
      if (term.definition.length > existing.definition.length) {
        merged.set(term.term.toLowerCase(), {
          ...term,
          confidence: 0.95,
          source: 'hybrid',
        })
      }
    } else {
      merged.set(term.term.toLowerCase(), {
        ...term,
        source: 'hybrid',
      })
    }
  }

  onProgress?.('Deduplicating semantically similar terms...', 0.9)

  // Apply semantic deduplication to catch synonyms across NLP + LLM results
  const sortedTerms = Array.from(merged.values())
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))

  const dedupedTerms = await deduplicateTermsBatch(sortedTerms, true)

  onProgress?.('Complete', 1.0)

  return dedupedTerms.slice(0, maxTerms)
}

// ============================================================================
// WORKER-BASED GENERATION
// ============================================================================

/** Check if running inside a Web Worker */
function isInWorker(): boolean {
  return typeof self !== 'undefined' &&
    typeof (self as unknown as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !== 'undefined'
}

/** Check if Web Workers are available */
function canUseWorker(): boolean {
  return typeof Worker !== 'undefined' && !isInWorker()
}

/**
 * Generate glossary using Web Worker (non-blocking)
 * Falls back to main thread if workers not available
 */
export async function generateGlossaryWithWorker(
  content: string,
  options: GlossaryGenerationOptions = {}
): Promise<GlossaryResult> {
  const startTime = Date.now()
  const settings = { ...(await loadGlossarySettings()), ...options.settings }
  const maxTerms = options.maxTerms || 50

  // Check cache first (fast, on main thread)
  const contentHash = `${settings.generationMethod}_${hashContent(content)}`
  if (settings.cacheEnabled && !options.forceRegenerate) {
    options.onProgress?.('Checking cache...', 0.05)
    const cached = await getFromCache(contentHash)
    if (cached) {
      return {
        terms: cached.terms,
        method: cached.generationMethod,
        cached: true,
        fromCache: true,
        generationTimeMs: Date.now() - startTime,
      }
    }
  }

  // Import worker types dynamically to avoid bundling issues
  const { generateGlossaryWithWorker: workerGenerate } = await import('./processors/glossaryWorkerClient')

  options.onProgress?.('Starting background generation...', 0.1)

  const result = await workerGenerate(content, {
    method: settings.generationMethod,
    maxTerms,
    forceRegenerate: options.forceRegenerate,
    fastMode: content.length > 10000,
    onProgress: (progress, message) => {
      options.onProgress?.(message, progress / 100)
    },
  })

  return {
    terms: result.terms,
    method: result.method,
    cached: result.cached,
    generationTimeMs: result.generationTimeMs,
  }
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate glossary with caching support
 * This is the main entry point for glossary generation
 *
 * By default, uses Web Worker for non-blocking generation in browser.
 * Set `useWorker: false` to force main thread execution.
 */
export async function generateGlossary(
  content: string,
  options: GlossaryGenerationOptions = {}
): Promise<GlossaryResult> {
  // Use Web Worker by default in browser (non-blocking)
  const useWorker = options.useWorker ?? canUseWorker()

  if (useWorker && canUseWorker()) {
    try {
      return await generateGlossaryWithWorker(content, options)
    } catch (error) {
      console.warn('[GlossaryGenerator] Worker failed, falling back to main thread:', error)
      // Fall through to main thread generation
    }
  }

  // Main thread generation (blocking, but works everywhere)
  return generateGlossaryDirect(content, options)
}

/**
 * Generate glossary directly on main thread
 * Use this when you need synchronous-ish behavior or workers aren't available
 */
export async function generateGlossaryDirect(
  content: string,
  options: GlossaryGenerationOptions = {}
): Promise<GlossaryResult> {
  const startTime = Date.now()
  const settings = { ...(await loadGlossarySettings()), ...options.settings }
  const maxTerms = options.maxTerms || 50

  // Generate content hash for caching
  const contentHash = `${settings.generationMethod}_${hashContent(content)}`

  // Check cache first (unless force regenerate)
  if (settings.cacheEnabled && !options.forceRegenerate) {
    options.onProgress?.('Checking cache...', 0.1)
    const cached = await getFromCache(contentHash)

    if (cached) {
      return {
        terms: cached.terms,
        method: cached.generationMethod,
        cached: true,
        fromCache: true,
        generationTimeMs: Date.now() - startTime,
      }
    }
  }

  // Generate based on method
  let terms: GlossaryTerm[] = []
  const method = settings.generationMethod

  // NLP options with automatic fast mode for large docs
  const nlpOptions: NLPGenerationOptions = { maxTerms }

  switch (method) {
    case 'nlp':
      options.onProgress?.('Generating with NLP...', 0.3)
      terms = await generateWithNLP(content, nlpOptions)
      break

    case 'llm':
      options.onProgress?.('Generating with LLM...', 0.3)
      terms = await generateWithLLM(
        content,
        resolveLLMProvider(settings.llmProvider),
        maxTerms
      )
      // Fall back to NLP if LLM fails
      if (terms.length === 0) {
        options.onProgress?.('LLM failed, falling back to NLP...', 0.6)
        terms = await generateWithNLP(content, nlpOptions)
      }
      break

    case 'hybrid':
      terms = await generateHybrid(
        content,
        resolveLLMProvider(settings.llmProvider),
        maxTerms,
        options.onProgress
      )
      break

    default:
      terms = await generateWithNLP(content, nlpOptions)
  }

  // Save to cache
  if (settings.cacheEnabled && terms.length > 0) {
    options.onProgress?.('Saving to cache...', 0.95)
    const cachedGlossary: CachedGlossary = {
      terms,
      generationMethod: method,
      createdAt: new Date().toISOString(),
      version: 1,
    }
    await saveToCache(contentHash, cachedGlossary, settings.cacheTTLDays)
  }

  options.onProgress?.('Complete', 1.0)

  return {
    terms,
    method,
    cached: false,
    generationTimeMs: Date.now() - startTime,
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get a single term definition
 */
export function getTermDefinition(term: string): string | null {
  // Check common acronyms first
  const acronymDef = COMMON_ACRONYMS[term.toUpperCase()]
  if (acronymDef) return acronymDef

  // Check lowercase version
  const lowerDef = COMMON_ACRONYMS[term]
  if (lowerDef) return lowerDef

  return null
}

/**
 * Check if a term is a known acronym
 */
export function isKnownAcronym(term: string): boolean {
  return term.toUpperCase() in COMMON_ACRONYMS
}
