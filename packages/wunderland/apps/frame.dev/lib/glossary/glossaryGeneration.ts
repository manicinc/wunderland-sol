/**
 * Glossary Generation Utilities
 * @module lib/glossary/glossaryGeneration
 * 
 * @description
 * NLP-powered term extraction utilities for glossary generation:
 * - Term extraction from markdown content
 * - Definition parsing from various patterns
 * - Acronym detection and expansion
 * - Category inference
 * 
 * This module provides the core extraction logic used by the glossary generator.
 */

import { extractTechEntities, extractKeywords, STOP_WORDS } from '../nlp'

// ============================================================================
// TYPES
// ============================================================================

/** Valid glossary term categories */
export type GlossaryCategory = 'technology' | 'concept' | 'acronym' | 'entity' | 'keyword'

export interface GlossaryTerm {
  id: string
  term: string
  definition?: string
  category: GlossaryCategory
  type?: 'definition' | 'acronym' | 'entity' | 'keyword'
  aliases?: string[]
  sourceStrand?: string
  confidence: number
  source?: 'nlp' | 'llm' | 'hybrid' | 'manual'
  createdAt?: string
}

export interface ExtractedDefinition {
  term: string
  definition: string
}

export interface ExtractedAcronym {
  acronym: string
  expansion: string
  confidence: number
}

// ============================================================================
// ACRONYM DATABASE
// ============================================================================

export const COMMON_ACRONYMS: Record<string, string> = {
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
  FSRS: 'Free Spaced Repetition Scheduler',
  GUID: 'Globally Unique Identifier',
  UUID: 'Universally Unique Identifier',
  MVC: 'Model-View-Controller',
  MVVM: 'Model-View-ViewModel',
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for a glossary term
 */
export function generateTermId(): string {
  return 'term-' + Math.random().toString(36).substr(2, 9)
}

/**
 * Normalize a term for comparison
 */
export function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Infer category from term and definition content
 */
export function inferCategory(term: string, definition: string): GlossaryCategory {
  const termLower = term.toLowerCase()
  const defLower = definition.toLowerCase()

  // Technology patterns (programming, APIs, frameworks)
  if (/hook|function|method|api|framework|library|package|module/i.test(termLower) || 
      /call|invoke|execute|return|import|export/i.test(defLower)) {
    return 'technology'
  }

  // Entity patterns (UI, components, systems)
  if (/component|element|ui|interface|system|service|class/i.test(termLower) || 
      /render|display|show|view|instance/i.test(defLower)) {
    return 'entity'
  }

  // Keyword patterns (data, state)
  if (/state|data|store|value|variable|config|setting/i.test(termLower) || 
      /contain|hold|manage|track/i.test(defLower)) {
    return 'keyword'
  }

  // Concept patterns
  if (/concept|principle|pattern|architecture|paradigm|methodology/i.test(termLower)) {
    return 'concept'
  }

  // Default to concept
  return 'concept'
}

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extract definitions from text using various patterns
 * 
 * Supports:
 * - **Term**: Definition format
 * - Term is/are definition format
 * - List item definitions
 */
export function extractDefinitions(text: string): ExtractedDefinition[] {
  const definitions: ExtractedDefinition[] = []

  // Pattern 1: **Term**: Definition or **Term** - Definition
  const boldColonPattern = /\*\*([^*]+)\*\*[:\s-]+([^*\n]+[.!?]?)/g
  let match
  while ((match = boldColonPattern.exec(text)) !== null) {
    if (match[1].length >= 2 && match[2].length >= 10) {
      definitions.push({ 
        term: match[1].trim(), 
        definition: match[2].trim() 
      })
    }
  }

  // Pattern 2: Term is/are definition (must start with capital)
  const isArePattern = /([A-Z][a-zA-Z\s]+)\s+(?:is|are)\s+([a-z][^.!?]+[.!?])/g
  while ((match = isArePattern.exec(text)) !== null) {
    if (match[1].length >= 2 && match[2].length >= 10) {
      definitions.push({ 
        term: match[1].trim(), 
        definition: match[2].trim() 
      })
    }
  }

  // Pattern 3: Definition list items
  const listPattern = /^[-*]\s+\*\*([^*]+)\*\*[:\s]+(.+)$/gm
  while ((match = listPattern.exec(text)) !== null) {
    if (match[1].length >= 2 && match[2].length >= 10) {
      definitions.push({ 
        term: match[1].trim(), 
        definition: match[2].trim() 
      })
    }
  }

  return definitions
}

/**
 * Extract acronyms from text and provide definitions
 */
export function extractAcronyms(text: string): ExtractedAcronym[] {
  const acronyms: ExtractedAcronym[] = []
  const seen = new Set<string>()

  // Pattern: 2-10 uppercase letters
  const acronymPattern = /\b([A-Z]{2,10})\b/g
  let match

  while ((match = acronymPattern.exec(text)) !== null) {
    const acronym = match[1]
    
    if (seen.has(acronym)) continue
    if (STOP_WORDS.has(acronym.toLowerCase())) continue

    const expansion = COMMON_ACRONYMS[acronym]
    if (expansion) {
      seen.add(acronym)
      acronyms.push({
        acronym,
        expansion,
        confidence: 0.95,
      })
    }
  }

  return acronyms
}

/**
 * Extract key terms from content using NLP
 * 
 * Combines tech entity extraction, keyword extraction, and acronym detection
 */
export function extractTerms(
  content: string, 
  options: { maxTerms?: number; includeKeywords?: boolean } = {}
): GlossaryTerm[] {
  const { maxTerms = 50, includeKeywords = true } = options
  const terms: GlossaryTerm[] = []
  const seenTerms = new Set<string>()

  // 1. Extract definitions from text patterns
  const definitions = extractDefinitions(content)
  for (const def of definitions) {
    const termLower = def.term.toLowerCase()
    if (seenTerms.has(termLower)) continue
    seenTerms.add(termLower)

    terms.push({
      id: generateTermId(),
      term: def.term,
      definition: def.definition,
      type: 'definition',
      category: inferCategory(def.term, def.definition),
      confidence: 0.9,
      source: 'nlp',
    })

    if (terms.length >= maxTerms) break
  }

  // 2. Extract tech entities
  if (terms.length < maxTerms) {
    const techEntities = extractTechEntities(content)
    for (const [category, entities] of Object.entries(techEntities)) {
      for (const entity of entities) {
        const termLower = entity.toLowerCase()
        if (seenTerms.has(termLower)) continue
        seenTerms.add(termLower)

        terms.push({
          id: generateTermId(),
          term: entity,
          definition: getCategoryDefinition(entity, category),
          type: 'entity',
          category: 'technology',
          confidence: 0.85,
          source: 'nlp',
        })

        if (terms.length >= maxTerms) break
      }
      if (terms.length >= maxTerms) break
    }
  }

  // 3. Extract acronyms
  if (terms.length < maxTerms) {
    const acronyms = extractAcronyms(content)
    for (const acr of acronyms) {
      const termLower = acr.acronym.toLowerCase()
      if (seenTerms.has(termLower)) continue
      seenTerms.add(termLower)

      terms.push({
        id: generateTermId(),
        term: acr.acronym,
        definition: acr.expansion,
        type: 'acronym',
        category: 'acronym',
        confidence: acr.confidence,
        source: 'nlp',
      })

      if (terms.length >= maxTerms) break
    }
  }

  // 4. Extract keywords (optional)
  if (includeKeywords && terms.length < maxTerms) {
    const keywords = extractKeywords(content, 10)
    for (const { word, score } of keywords) {
      if (score < 2) continue
      const termLower = word.toLowerCase()
      if (seenTerms.has(termLower)) continue
      seenTerms.add(termLower)

      terms.push({
        id: generateTermId(),
        term: word,
        definition: `Key concept: "${word}" appears frequently in this content`,
        type: 'keyword',
        category: 'concept',
        confidence: Math.min(score / 10, 0.8),
        source: 'nlp',
      })

      if (terms.length >= maxTerms) break
    }
  }

  // Sort by confidence
  return terms.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
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

/**
 * Deduplicate terms, keeping higher confidence ones
 */
export function deduplicateTerms(terms: GlossaryTerm[]): GlossaryTerm[] {
  const seen = new Map<string, GlossaryTerm>()

  for (const term of terms) {
    const normalized = normalizeTerm(term.term)

    if (!seen.has(normalized)) {
      seen.set(normalized, term)
    } else {
      // Keep the one with higher confidence or longer definition
      const existing = seen.get(normalized)!
      if (
        (term.confidence || 0) > (existing.confidence || 0) ||
        ((term.confidence || 0) === (existing.confidence || 0) &&
         (term.definition?.length || 0) > (existing.definition?.length || 0))
      ) {
        // Merge aliases
        const mergedAliases = [
          ...new Set([
            ...(existing.aliases || []), 
            ...(term.aliases || []), 
            existing.term
          ])
        ]
        seen.set(normalized, {
          ...term,
          aliases: mergedAliases,
        })
      } else {
        // Add this term as an alias
        existing.aliases = [
          ...new Set([...(existing.aliases || []), term.term])
        ]
      }
    }
  }

  return Array.from(seen.values())
}

/**
 * Create a glossary term with defaults
 */
export function createGlossaryTerm(
  term: string,
  definition: string,
  options: {
    sourceStrand?: string
    confidence?: number
    type?: GlossaryTerm['type']
    category?: GlossaryCategory
  } = {}
): GlossaryTerm {
  return {
    id: generateTermId(),
    term,
    definition,
    type: options.type || 'definition',
    category: options.category || inferCategory(term, definition),
    aliases: [],
    sourceStrand: options.sourceStrand,
    confidence: options.confidence || 0.7,
    source: 'nlp',
    createdAt: new Date().toISOString(),
  }
}

