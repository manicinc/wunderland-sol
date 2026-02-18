/**
 * RAG-Powered Distractor Generation
 * @module lib/generation/ragDistractors
 * 
 * @description
 * Generates semantically plausible wrong answers (distractors) for
 * multiple choice quiz questions using Retrieval Augmented Generation.
 * 
 * Instead of generic "None of the above" options, this system:
 * 1. Searches for related terms from the knowledge base
 * 2. Filters for same category/type as the correct answer
 * 3. Returns plausible but incorrect alternatives
 * 
 * Falls back to NLP-based extraction when offline.
 */

import type { RAGContext } from './index'

// ============================================================================
// TYPES
// ============================================================================

export interface DistractorOptions {
  /** Correct answer to avoid */
  answer: string
  /** Context/content where the question comes from */
  content: string
  /** Number of distractors needed */
  count?: number
  /** Question type for better matching */
  questionType?: 'definition' | 'concept' | 'fact' | 'process'
  /** Optional pre-fetched RAG context */
  ragContext?: RAGContext
  /** Force offline mode */
  forceOffline?: boolean
}

export interface DistractorResult {
  distractors: string[]
  source: 'rag' | 'nlp' | 'fallback'
  confidence: number
}

// ============================================================================
// NLP UTILITIES
// ============================================================================

/**
 * Get semantic category of a term (noun, verb, concept, etc.)
 */
async function getSemanticCategory(term: string): Promise<string> {
  try {
    const nlp = (await import('compromise')).default
    const doc = nlp(term)
    
    if (doc.nouns().length > 0) return 'noun'
    if (doc.verbs().length > 0) return 'verb'
    if (doc.adjectives().length > 0) return 'adjective'
    return 'concept'
  } catch {
    // Default category
    return 'concept'
  }
}

/**
 * Extract candidate terms from content using NLP
 */
async function extractCandidateTerms(content: string): Promise<string[]> {
  const terms: string[] = []
  
  try {
    const nlp = (await import('compromise')).default
    const doc = nlp(content)
    
    // Get various term types
    const nouns = doc.nouns().toSingular().out('array') as string[]
    const topics = doc.topics().out('array') as string[]
    const people = doc.people().out('array') as string[]
    const places = doc.places().out('array') as string[]
    
    // Combine and filter
    const allTerms = [...new Set([...topics, ...nouns, ...people, ...places])]
      .filter(t => t.length >= 3 && t.length <= 50)
      .filter(t => !isGenericTerm(t))
    
    terms.push(...allTerms)
  } catch (err) {
    console.warn('[ragDistractors] NLP extraction failed:', err)
    // Fallback: extract capitalized terms
    const capitalizedWords = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []
    terms.push(...[...new Set(capitalizedWords)].slice(0, 20))
  }
  
  return terms
}

/**
 * Check if term is too generic to be a good distractor
 */
function isGenericTerm(term: string): boolean {
  const genericPatterns = [
    /^(the|a|an|this|that|these|those)$/i,
    /^(is|are|was|were|be|been|being)$/i,
    /^(example|note|warning|tip|important)$/i,
    /^(step|section|chapter|figure|table)\s*\d*$/i,
    /^(default|description|type|value|name|key)$/i,
    /^(all|none|some|any|every)$/i,
    /^(true|false|yes|no|maybe)$/i,
    /^(above|below|following|previous)$/i,
  ]
  
  return genericPatterns.some(p => p.test(term.trim()))
}

/**
 * Calculate semantic similarity between two terms (simple heuristic)
 */
function calculateSimilarity(term1: string, term2: string): number {
  const t1 = term1.toLowerCase().trim()
  const t2 = term2.toLowerCase().trim()
  
  // Exact match = not a valid distractor
  if (t1 === t2) return 1.0
  
  // One contains the other = too similar
  if (t1.includes(t2) || t2.includes(t1)) return 0.9
  
  // Length similarity (good distractors have similar length)
  const lengthRatio = Math.min(t1.length, t2.length) / Math.max(t1.length, t2.length)
  
  // Word overlap
  const words1 = new Set(t1.split(/\s+/))
  const words2 = new Set(t2.split(/\s+/))
  const intersection = [...words1].filter(w => words2.has(w)).length
  const union = new Set([...words1, ...words2]).size
  const jaccardSimilarity = intersection / union
  
  return (lengthRatio * 0.3 + jaccardSimilarity * 0.7)
}

/**
 * Filter terms to find good distractors for a given answer
 */
function filterDistractorCandidates(
  answer: string,
  candidates: string[],
  count: number
): string[] {
  const normalized = answer.toLowerCase().trim()
  
  // Score candidates
  const scored = candidates
    .filter(c => {
      const n = c.toLowerCase().trim()
      // Not the same as answer
      if (n === normalized) return false
      // Not too similar
      if (calculateSimilarity(answer, c) > 0.6) return false
      // Similar length (good distractor)
      if (Math.abs(c.length - answer.length) > answer.length * 1.5) return false
      return true
    })
    .map(c => ({
      term: c,
      // Prefer similar length
      lengthScore: 1 - Math.abs(c.length - answer.length) / Math.max(c.length, answer.length, 1),
      // Slight randomization for variety
      random: Math.random() * 0.2,
    }))
    .map(item => ({
      term: item.term,
      score: item.lengthScore + item.random,
    }))
    .sort((a, b) => b.score - a.score)
  
  return scored.slice(0, count).map(s => s.term)
}

// ============================================================================
// RAG-POWERED GENERATION
// ============================================================================

/**
 * Fetch related terms from RAG system
 */
async function fetchRAGTerms(
  answer: string,
  content: string
): Promise<string[]> {
  const terms: string[] = []
  
  try {
    // Try semantic search using the unified search engine
    const { getSearchEngine } = await import('../search/engine')
    const engine = getSearchEngine()
    
    // Search for related content
    const query = `concepts related to: ${answer}`
    const results = await engine.search(query, { 
      limit: 5, 
      semantic: engine.canUseSemantic() 
    })
    
    // Extract terms from related content
    for (const result of results) {
      const resultContent = result.summary || result.title
      const extracted = await extractCandidateTerms(resultContent)
      terms.push(...extracted)
    }
    
    // Also get glossary terms if available
    try {
      const { getGlobalGlossaryDb } = await import('../glossary/glossaryCache')
      const glossaryTerms = await getGlobalGlossaryDb()
      if (glossaryTerms.length > 0) {
        terms.push(...glossaryTerms.map(t => t.term))
      }
    } catch {
      // Glossary not available
    }
    
  } catch (err) {
    console.warn('[ragDistractors] RAG search failed, using local terms:', err)
    // Fallback to extracting from provided content
    const extracted = await extractCandidateTerms(content)
    terms.push(...extracted)
  }
  
  return [...new Set(terms)]
}

/**
 * Generate distractors using pre-provided RAG context
 */
function generateFromRAGContext(
  answer: string,
  ragContext: RAGContext,
  count: number
): string[] {
  const candidates: string[] = []
  
  // Extract terms from related concepts
  if (ragContext.relatedConcepts) {
    candidates.push(...ragContext.relatedConcepts)
  }
  
  // Extract terms from related snippets
  for (const snippet of ragContext.relatedSnippets || []) {
    // Simple extraction from snippet content
    const words = snippet.content
      .split(/[.!?,;:\s]+/)
      .filter(w => w.length >= 3 && w.length <= 50)
      .filter(w => /^[A-Za-z]/.test(w))
    candidates.push(...words)
  }
  
  return filterDistractorCandidates(answer, [...new Set(candidates)], count)
}

// ============================================================================
// FALLBACK DISTRACTORS
// ============================================================================

/**
 * Smart fallback distractors based on answer type
 */
function generateSmartFallbacks(answer: string, count: number): string[] {
  const fallbacks: string[] = []
  const normalized = answer.toLowerCase().trim()
  
  // Detect answer type and generate contextual fallbacks
  if (/^\d+$/.test(normalized)) {
    // Numeric answer - generate other numbers
    const num = parseInt(normalized, 10)
    fallbacks.push(
      String(Math.max(0, num - 1)),
      String(num + 1),
      String(num * 2),
      String(Math.floor(num / 2)),
    )
  } else if (/^(true|false|yes|no)$/i.test(normalized)) {
    // Boolean - just return the opposite
    fallbacks.push(normalized === 'true' ? 'false' : 'true')
    fallbacks.push('It depends on the context')
    fallbacks.push('Cannot be determined')
  } else if (normalized.split(' ').length === 1) {
    // Single word answer - use modified versions
    fallbacks.push(
      `Pre-${answer.toLowerCase()}`,
      `Post-${answer.toLowerCase()}`,
      `${answer.charAt(0).toUpperCase() + answer.slice(1)} variant`,
    )
  }
  
  // Always add some universal fallbacks
  const universalFallbacks = [
    'Not applicable in this context',
    'This concept is unrelated',
    'A different approach is needed',
    'This requires further investigation',
    'The relationship is indirect',
  ]
  
  // Fill with universal fallbacks, avoiding duplicates
  for (const fb of universalFallbacks) {
    if (fallbacks.length >= count) break
    if (!fallbacks.includes(fb) && fb.toLowerCase() !== normalized) {
      fallbacks.push(fb)
    }
  }
  
  return fallbacks.slice(0, count)
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Generate RAG-powered distractors for multiple choice questions
 * 
 * @example
 * ```typescript
 * const result = await generateRAGDistractors({
 *   answer: 'React Hooks',
 *   content: 'React Hooks are functions that let you...',
 *   count: 3,
 * })
 * 
 * console.log(result.distractors) // ['Redux', 'Angular Services', 'Vue Composition API']
 * ```
 */
export async function generateRAGDistractors(
  options: DistractorOptions
): Promise<DistractorResult> {
  const { answer, content, count = 3, ragContext, forceOffline = false } = options
  
  let distractors: string[] = []
  let source: DistractorResult['source'] = 'fallback'
  let confidence = 0.5
  
  try {
    // Strategy 1: Use pre-provided RAG context
    if (ragContext && ragContext.relatedConcepts?.length > 0) {
      distractors = generateFromRAGContext(answer, ragContext, count)
      if (distractors.length >= count) {
        return { distractors, source: 'rag', confidence: 0.85 }
      }
    }
    
    // Strategy 2: Fetch from RAG system (if online)
    if (!forceOffline && distractors.length < count) {
      const ragTerms = await fetchRAGTerms(answer, content)
      const ragDistractors = filterDistractorCandidates(answer, ragTerms, count - distractors.length)
      distractors.push(...ragDistractors)
      
      if (distractors.length >= count) {
        return { distractors: distractors.slice(0, count), source: 'rag', confidence: 0.8 }
      }
      source = distractors.length > 0 ? 'rag' : 'nlp'
    }
    
    // Strategy 3: NLP extraction from local content
    if (distractors.length < count) {
      const nlpTerms = await extractCandidateTerms(content)
      const nlpDistractors = filterDistractorCandidates(
        answer, 
        nlpTerms.filter(t => !distractors.includes(t)), 
        count - distractors.length
      )
      distractors.push(...nlpDistractors)
      
      if (source === 'fallback' && nlpDistractors.length > 0) {
        source = 'nlp'
        confidence = 0.7
      }
    }
    
    // Strategy 4: Smart fallbacks
    if (distractors.length < count) {
      const fallbacks = generateSmartFallbacks(answer, count - distractors.length)
        .filter(f => !distractors.includes(f))
      distractors.push(...fallbacks)
      
      if (source === 'fallback') {
        confidence = 0.5
      }
    }
    
  } catch (err) {
    console.error('[ragDistractors] Generation failed:', err)
    distractors = generateSmartFallbacks(answer, count)
    source = 'fallback'
    confidence = 0.4
  }
  
  return {
    distractors: distractors.slice(0, count),
    source,
    confidence,
  }
}

/**
 * Simple synchronous distractor generation (for offline/quick use)
 * Uses NLP only, no RAG
 */
export function generateDistractorsSync(
  answer: string,
  terms: string[],
  count: number = 3
): string[] {
  const distractors = filterDistractorCandidates(answer, terms, count)
  
  // Fill with smart fallbacks if needed
  if (distractors.length < count) {
    const fallbacks = generateSmartFallbacks(answer, count - distractors.length)
      .filter(f => !distractors.includes(f))
    distractors.push(...fallbacks)
  }
  
  return distractors.slice(0, count)
}

/**
 * Batch generate distractors for multiple questions
 */
export async function generateDistractorsBatch(
  questions: Array<{ answer: string; content: string }>,
  ragContext?: RAGContext
): Promise<Map<string, DistractorResult>> {
  const results = new Map<string, DistractorResult>()
  
  // Parallel generation with concurrency limit
  const batchSize = 5
  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(q => generateRAGDistractors({
        answer: q.answer,
        content: q.content,
        count: 3,
        ragContext,
      }))
    )
    
    batch.forEach((q, idx) => {
      results.set(q.answer, batchResults[idx])
    })
  }
  
  return results
}

