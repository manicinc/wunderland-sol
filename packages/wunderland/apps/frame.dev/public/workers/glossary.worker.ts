/**
 * Glossary Web Worker
 * @module public/workers/glossary.worker
 *
 * Background worker for NLP-heavy glossary generation.
 * Prevents UI freezing by running processing off the main thread.
 */

import type {
  GlossaryWorkerMessage,
  GlossaryWorkerResponse,
  GlossaryTask,
  GlossaryProgress,
  GlossaryWorkerResult,
  GlossaryStage,
} from '@/lib/glossary/workerTypes'
import type { GlossaryTerm, GenerationMethod } from '@/lib/glossary/glossaryCache'
import {
  extractTechEntities,
  extractKeywords,
  extractEntitiesAsync,
  STOP_WORDS,
} from '@/lib/nlp'
import {
  calculateSimilarityScoreAsync,
} from '@/lib/taxonomy/similarityUtils'
import { DEFAULT_TAXONOMY_CONFIG } from '@/lib/taxonomy/hierarchyConfig'

// ============================================================================
// WORKER STATE
// ============================================================================

let currentTaskId: string | null = null
let cancelled = false

// ============================================================================
// ACRONYM DATABASE
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
// MESSAGE HANDLER
// ============================================================================

self.addEventListener('message', async (event: MessageEvent<GlossaryWorkerMessage>) => {
  const message = event.data

  switch (message.type) {
    case 'generate':
      await handleGenerateTask(message.task)
      break

    case 'cancel':
      handleCancellation(message.taskId)
      break

    default:
      console.warn('[GlossaryWorker] Unknown message type:', message)
  }
})

// ============================================================================
// TASK HANDLERS
// ============================================================================

async function handleGenerateTask(task: GlossaryTask): Promise<void> {
  currentTaskId = task.id
  cancelled = false
  const startTime = Date.now()

  const terms: GlossaryTerm[] = []
  const seenTerms = new Set<string>()

  try {
    // Determine processing mode
    const isLargeDoc = task.content.length > 50000
    const useFastMode = task.fastMode ?? isLargeDoc
    const maxTerms = task.maxTerms || 50

    // Sample content for very large documents
    const processedContent = isLargeDoc
      ? sampleContent(task.content, 50000)
      : task.content

    const hasEnoughTerms = () => terms.length >= maxTerms * 1.5

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 1: Extract tech entities (fast)
    // ─────────────────────────────────────────────────────────────────────────
    if (cancelled) return postCancelled(task.id)
    postProgress({
      taskId: task.id,
      progress: 10,
      stage: 'extracting_tech',
      message: 'Extracting technology terms...',
      termsFound: terms.length,
    })

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

    // Yield periodically to allow message processing
    await yieldToWorker()

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 2: Extract acronyms (fast)
    // ─────────────────────────────────────────────────────────────────────────
    if (cancelled) return postCancelled(task.id)
    postProgress({
      taskId: task.id,
      progress: 25,
      stage: 'extracting_acronyms',
      message: 'Extracting acronyms...',
      termsFound: terms.length,
    })

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

    await yieldToWorker()

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 3: Extract named entities (SLOW - skip in fast mode)
    // ─────────────────────────────────────────────────────────────────────────
    if (!useFastMode && !hasEnoughTerms()) {
      if (cancelled) return postCancelled(task.id)
      postProgress({
        taskId: task.id,
        progress: 40,
        stage: 'extracting_entities',
        message: 'Extracting named entities (this may take a moment)...',
        termsFound: terms.length,
      })

      try {
        const entities = await extractEntitiesAsync(processedContent)
        await yieldToWorker()

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
      } catch (error) {
        console.warn('[GlossaryWorker] NER extraction failed:', error)
      }
    }

    await yieldToWorker()

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 4: Extract keywords (medium)
    // ─────────────────────────────────────────────────────────────────────────
    if (cancelled) return postCancelled(task.id)
    postProgress({
      taskId: task.id,
      progress: 60,
      stage: 'extracting_keywords',
      message: 'Extracting keywords...',
      termsFound: terms.length,
    })

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

    await yieldToWorker()

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 5: Semantic deduplication (can be slow)
    // ─────────────────────────────────────────────────────────────────────────
    if (cancelled) return postCancelled(task.id)

    let finalTerms = terms.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))

    if (task.semanticDedup !== false) {
      postProgress({
        taskId: task.id,
        progress: 80,
        stage: 'deduplicating',
        message: 'Removing similar terms...',
        termsFound: terms.length,
      })

      finalTerms = await deduplicateTermsBatch(finalTerms)
    }

    // Limit to maxTerms
    finalTerms = finalTerms.slice(0, maxTerms)

    // ─────────────────────────────────────────────────────────────────────────
    // Complete
    // ─────────────────────────────────────────────────────────────────────────
    if (cancelled) return postCancelled(task.id)

    const result: GlossaryWorkerResult = {
      taskId: task.id,
      terms: finalTerms,
      method: task.method,
      generationTimeMs: Date.now() - startTime,
    }

    postComplete(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    postError(task.id, `Glossary generation failed: ${errorMessage}`)
  } finally {
    currentTaskId = null
  }
}

function handleCancellation(taskId: string): void {
  if (currentTaskId === taskId) {
    cancelled = true
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function yieldToWorker(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

function sampleContent(content: string, maxSize: number): string {
  if (content.length <= maxSize) return content

  const chunkSize = Math.floor(maxSize / 3)
  const start = content.slice(0, chunkSize)
  const middleStart = Math.floor((content.length - chunkSize) / 2)
  const middle = content.slice(middleStart, middleStart + chunkSize)
  const end = content.slice(-chunkSize)

  return `${start}\n\n${middle}\n\n${end}`
}

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

const DEDUP_SIMILARITY_THRESHOLD = 0.75

async function deduplicateTermsBatch(terms: GlossaryTerm[]): Promise<GlossaryTerm[]> {
  const deduped: GlossaryTerm[] = []
  const seenTexts: string[] = []

  for (let i = 0; i < terms.length; i++) {
    const term = terms[i]
    const termLower = term.term.toLowerCase()

    // Skip if exact match already exists
    if (seenTexts.some(t => t.toLowerCase() === termLower)) continue

    // Check for semantic similarity
    let isDuplicate = false
    for (const existing of seenTexts) {
      try {
        const result = await calculateSimilarityScoreAsync(term.term, existing, {
          ...DEFAULT_TAXONOMY_CONFIG,
          enableWordNet: true,
          enableAcronymExpansion: true,
          enablePluralNormalization: true,
          similarityScoreThreshold: DEDUP_SIMILARITY_THRESHOLD,
        })

        if (result.score >= DEDUP_SIMILARITY_THRESHOLD) {
          isDuplicate = true
          break
        }
      } catch {
        // Similarity check failed, keep the term
      }
    }

    if (!isDuplicate) {
      deduped.push(term)
      seenTexts.push(term.term)
    }

    // Yield every 5 terms to stay responsive
    if (i % 5 === 0) await yieldToWorker()
  }

  return deduped
}

// ============================================================================
// MESSAGE SENDERS
// ============================================================================

function postProgress(data: GlossaryProgress): void {
  const message: GlossaryWorkerResponse = { type: 'progress', data }
  self.postMessage(message)
}

function postComplete(data: GlossaryWorkerResult): void {
  const message: GlossaryWorkerResponse = { type: 'complete', data }
  self.postMessage(message)
}

function postError(taskId: string, error: string): void {
  const message: GlossaryWorkerResponse = { type: 'error', taskId, error }
  self.postMessage(message)
}

function postCancelled(taskId: string): void {
  postError(taskId, 'Task cancelled by user')
}

// ============================================================================
// WORKER INITIALIZATION
// ============================================================================

console.log('[GlossaryWorker] Initialized and ready')
