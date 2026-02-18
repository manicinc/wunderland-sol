/**
 * Glossary Generation Hook
 *
 * Auto-generates vocabulary/glossary from markdown content with:
 * - Persistent caching via SQL storage
 * - Hybrid NLP + LLM generation
 * - Platform-aware feature gating
 * - Term extraction using Compromise.js NER
 * - Definition detection from patterns
 * - Acronym expansion
 * - Technical entity recognition
 *
 * @module hooks/useGlossary
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  extractTechEntities,
  extractKeywords,
  parseMarkdownBlocks,
  extractEntitiesAsync,
  STOP_WORDS,
} from '@/lib/nlp'
import {
  generateGlossary,
  invalidateCache,
  getCacheStats,
  loadGlossarySettings,
  type GlossarySettings,
  type CacheStats,
  type GenerationMethod,
} from '@/lib/glossary'
import type { GlossaryTerm as BaseGlossaryTerm, GlossaryCategory } from '@/lib/glossary/glossaryGeneration'

// ==================== Types ====================

// Extend base GlossaryTerm with optional hook-specific fields
export interface GlossaryTerm extends BaseGlossaryTerm {
  subcategory?: string
  sourceText?: string
  sourceLine?: number
}

export type { GlossaryCategory }

export interface GlossaryStats {
  total: number
  byCategory: Record<string, number>
  coverage: number // 0-1, how much of the content is covered
  cached?: boolean
  method?: GenerationMethod
  generationTimeMs?: number
}

export type GenerationStage =
  | 'idle'
  | 'cache_check'
  | 'extracting_tech'
  | 'extracting_acronyms'
  | 'extracting_entities'
  | 'extracting_keywords'
  | 'llm_generating'
  | 'merging'
  | 'saving_cache'
  | 'complete'

export interface GenerationProgress {
  stage: GenerationStage
  stageProgress: number // 0-1 progress within stage
  overallProgress: number // 0-1 overall progress
  itemsFound: number
}

export interface UseGlossaryOptions {
  /** Minimum confidence to include term */
  minConfidence?: number
  /** Maximum terms to extract */
  maxTerms?: number
  /** Categories to include */
  categories?: GlossaryTerm['category'][]
  /** Max content size before sampling (chars). Default 50000 */
  maxContentSize?: number
  /** Enable fast mode (skips expensive NER). Default for large docs */
  fastMode?: boolean
  /** Use new cached generation system (default: true) */
  useCachedGeneration?: boolean
}

export interface UseGlossaryReturn {
  terms: GlossaryTerm[]
  generating: boolean
  error: string | null
  stats: GlossaryStats | null
  settings: GlossarySettings | null
  cacheStats: CacheStats | null
  progress: GenerationProgress
  generate: (content: string, forceRegenerate?: boolean) => Promise<GlossaryTerm[]>
  getByCategory: (category: GlossaryTerm['category']) => GlossaryTerm[]
  search: (query: string) => GlossaryTerm[]
  clear: () => void
  clearCache: () => Promise<void>
  refreshSettings: () => Promise<void>
}

// ==================== Utilities ====================

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Yield to the main thread to prevent UI freezing
 * Uses requestIdleCallback when available, otherwise setTimeout
 * Now with longer timeout for heavy NLP operations
 */
function yieldToMain(priority: 'high' | 'normal' = 'normal'): Promise<void> {
  return new Promise(resolve => {
    // For heavy operations, use longer delay to give UI more breathing room
    const timeout = priority === 'high' ? 8 : 32
    
    if ('scheduler' in window && 'yield' in (window.scheduler as unknown as { yield?: () => Promise<void> })) {
      // Use scheduler.yield if available (Chrome 115+) - best for performance
      (window.scheduler as unknown as { yield: () => Promise<void> }).yield().then(resolve)
    } else if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve(), { timeout })
    } else {
      setTimeout(resolve, priority === 'high' ? 0 : 16)
    }
  })
}

/**
 * Sample content for large documents to prevent freezing
 * Takes beginning, middle samples, and end to capture key terms
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

/**
 * Common patterns that should NOT be extracted as terms
 */
const EXCLUDE_PATTERNS = [
  /^use when$/i,
  /^example$/i,
  /^note$/i,
  /^warning$/i,
  /^tip$/i,
  /^important$/i,
  /^see also$/i,
  /^related$/i,
  /^prerequisites?$/i,
  /^requirements?$/i,
  /^syntax$/i,
  /^parameters?$/i,
  /^returns?$/i,
  /^arguments?$/i,
  /^options?$/i,
  /^configuration$/i,
  /^usage$/i,
  /^installation$/i,
  /^getting started$/i,
  /^overview$/i,
  /^introduction$/i,
  /^summary$/i,
  /^conclusion$/i,
  /^references?$/i,
  /^table of contents$/i,
  /^toc$/i,
  /^the$/i,
  /^a$/i,
  /^an$/i,
  /^this$/i,
  /^that$/i,
  /^these$/i,
  /^those$/i,
  /^\d+$/,
]

/**
 * Check if a term should be excluded
 */
function shouldExcludeTerm(term: string): boolean {
  const cleaned = term.trim()
  if (cleaned.length < 2 || cleaned.length > 60) return true
  if (EXCLUDE_PATTERNS.some(p => p.test(cleaned))) return true
  if (STOP_WORDS?.has?.(cleaned.toLowerCase())) return true
  // Exclude pure numbers, symbols, or single characters
  if (/^[\d\W]+$/.test(cleaned)) return true
  return false
}

/**
 * Definition extraction patterns
 */
const DEFINITION_PATTERNS = [
  // "Term is ..." or "Term are ..."
  /^([A-Z][a-zA-Z\s]+?)\s+(?:is|are)\s+(?:a|an|the)?\s*(.{20,}?)\.(?:\s|$)/gm,
  // "**Term**: definition" or "**Term** - definition"
  /\*\*([^*]+)\*\*[:\s-]+(.{20,}?)(?:\.|$)/gm,
  // "Term: definition" (bold or heading followed by explanation)
  /^([A-Z][a-zA-Z\s]{2,30}?):\s+(.{20,}?)(?:\.|$)/gm,
  // "refers to X" or "means X"
  /([A-Z][a-zA-Z\s]+?)\s+(?:refers to|means|describes|represents)\s+(.{20,}?)\.(?:\s|$)/gm,
  // Heading followed by first sentence as definition
  /^#{1,3}\s+([^\n]+)\n+([A-Z][^.]{20,}?)\.(?:\s|$)/gm,
]

/**
 * Acronym patterns with optional expansion
 */
const ACRONYM_PATTERNS = [
  // "API (Application Programming Interface)"
  /\b([A-Z]{2,10})\s*\(([^)]+)\)/g,
  // "Application Programming Interface (API)"
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})\s*\(([A-Z]{2,10})\)/g,
  // Standalone acronyms
  /\b([A-Z]{2,10})\b/g,
]

/**
 * Extract terms with definitions from markdown content
 */
async function extractDefinitions(content: string): Promise<Map<string, { definition: string; line?: number }>> {
  const definitions = new Map<string, { definition: string; line?: number }>()

  // Parse blocks to get line numbers
  const blocks = parseMarkdownBlocks(content)

  // Only process paragraph and heading blocks (skip code, lists, etc.)
  const textBlocks = blocks.filter(b =>
    b.type === 'paragraph' || b.type === 'heading'
  )

  const textContent = textBlocks.map(b => b.content).join('\n\n')

  for (const pattern of DEFINITION_PATTERNS) {
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(textContent)) !== null) {
      const term = match[1]?.trim()
      const definition = match[2]?.trim()

      if (term && definition && !shouldExcludeTerm(term)) {
        // Find the line number
        const block = textBlocks.find(b =>
          b.content.includes(term) && b.content.includes(definition.slice(0, 30))
        )

        definitions.set(term.toLowerCase(), {
          definition: definition.replace(/\s+/g, ' ').slice(0, 200),
          line: block?.startLine,
        })
      }
    }
  }

  return definitions
}

/**
 * Extract acronyms with optional expansions
 * Optimized: removed O(n²) line lookups, limit matches
 */
function extractAcronyms(content: string, maxAcronyms = 30): Map<string, { expansion?: string; line?: number }> {
  const acronyms = new Map<string, { expansion?: string; line?: number }>()

  // Early exit if we have enough
  const hasEnough = () => acronyms.size >= maxAcronyms

  // First pattern: ACR (Expansion) - highest value, get line numbers
  const pattern1 = ACRONYM_PATTERNS[0]
  pattern1.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = pattern1.exec(content)) !== null) {
    if (hasEnough()) break
    const acronym = match[1]
    const expansion = match[2]
    if (acronym && expansion && !shouldExcludeTerm(acronym)) {
      // Calculate line number from match position (fast)
      const lineNum = content.slice(0, match.index).split('\n').length
      acronyms.set(acronym, { expansion, line: lineNum })
    }
  }

  // Second pattern: Expansion (ACR)
  const pattern2 = ACRONYM_PATTERNS[1]
  pattern2.lastIndex = 0
  while ((match = pattern2.exec(content)) !== null) {
    if (hasEnough()) break
    const expansion = match[1]
    const acronym = match[2]
    if (acronym && expansion && !shouldExcludeTerm(acronym)) {
      if (!acronyms.has(acronym)) {
        const lineNum = content.slice(0, match.index).split('\n').length
        acronyms.set(acronym, { expansion, line: lineNum })
      }
    }
  }

  // Skip standalone acronyms extraction - it's slow and low value
  // The tech entities extraction already catches most useful acronyms

  return acronyms
}

// ==================== Main Hook ====================

// Category priority order for sorting (entities first, then acronyms, tech, keywords)
const CATEGORY_PRIORITY: Record<GlossaryTerm['category'], number> = {
  entity: 0,
  acronym: 1,
  technology: 2,
  concept: 3,
  keyword: 4,
}

export function useGlossary(options: UseGlossaryOptions = {}): UseGlossaryReturn {
  const {
    minConfidence = 0.5,
    maxTerms = 30, // Reduced from 50 to improve performance
    categories = ['entity', 'acronym', 'technology', 'concept', 'keyword'],
    maxContentSize = 25000, // Reduced from 50KB to 25KB before sampling
    fastMode: forceFastMode,
    useCachedGeneration = true,
  } = options

  const [terms, setTerms] = useState<GlossaryTerm[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<GlossaryStats | null>(null)
  const [settings, setSettings] = useState<GlossarySettings | null>(null)
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: 'idle',
    stageProgress: 0,
    overallProgress: 0,
    itemsFound: 0,
  })

  // Load settings on mount
  useEffect(() => {
    loadGlossarySettings().then(setSettings)
    getCacheStats().then(setCacheStats)
  }, [])

  /**
   * Refresh settings from storage
   */
  const refreshSettings = useCallback(async () => {
    const newSettings = await loadGlossarySettings()
    setSettings(newSettings)
    const newCacheStats = await getCacheStats()
    setCacheStats(newCacheStats)
  }, [])

  /**
   * Clear cache
   */
  const clearCache = useCallback(async () => {
    await invalidateCache()
    const newCacheStats = await getCacheStats()
    setCacheStats(newCacheStats)
  }, [])

  /**
   * Generate glossary from content
   * Uses cached generation system when enabled, with fallback to legacy NLP
   */
  const generate = useCallback(async (content: string, forceRegenerate = false): Promise<GlossaryTerm[]> => {
    if (!content || content.length < 50) {
      setError('Content too short for glossary generation')
      return []
    }

    setGenerating(true)
    setError(null)
    setProgress({ stage: 'cache_check', stageProgress: 0, overallProgress: 0, itemsFound: 0 })

    // Map stage string to GenerationStage
    const mapStage = (stageStr: string): GenerationStage => {
      if (stageStr.includes('cache')) return 'cache_check'
      if (stageStr.includes('NLP')) return 'extracting_tech'
      if (stageStr.includes('LLM') || stageStr.includes('AI')) return 'llm_generating'
      if (stageStr.includes('Merg')) return 'merging'
      if (stageStr.includes('Sav')) return 'saving_cache'
      if (stageStr.includes('Complete')) return 'complete'
      return 'extracting_tech'
    }

    try {
      // Use new cached generation system when enabled
      if (useCachedGeneration) {
        let itemsFound = 0
        const result = await generateGlossary(content, {
          forceRegenerate,
          maxTerms,
          onProgress: (stageStr, progressValue) => {
            const stage = mapStage(stageStr)
            setProgress({
              stage,
              stageProgress: progressValue,
              overallProgress: progressValue,
              itemsFound,
            })
          },
        })
        itemsFound = result.terms.length

        // Convert from new format to hook format
        const convertedTerms: GlossaryTerm[] = result.terms.map(t => ({
          id: generateId(),
          term: t.term,
          definition: t.definition,
          category: t.type === 'definition' ? 'concept' :
                    t.type === 'acronym' ? 'acronym' :
                    t.type === 'entity' ? 'entity' :
                    t.type === 'keyword' ? 'keyword' : 'technology',
          confidence: t.confidence || 0.7,
        }))

        // Filter and sort
        const filteredTerms = convertedTerms
          .filter(t => t.confidence >= minConfidence)
          .filter(t => categories.includes(t.category))
          .sort((a, b) => {
            const categoryDiff = CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category]
            if (categoryDiff !== 0) return categoryDiff
            return b.confidence - a.confidence
          })
          .slice(0, maxTerms)

        // Calculate stats
        const statsByCategory: Record<string, number> = {}
        for (const term of filteredTerms) {
          statsByCategory[term.category] = (statsByCategory[term.category] || 0) + 1
        }

        setTerms(filteredTerms)
        setStats({
          total: filteredTerms.length,
          byCategory: statsByCategory,
          coverage: 0, // Skip expensive coverage calculation
          cached: result.cached,
          method: result.method,
          generationTimeMs: result.generationTimeMs,
        })
        setProgress({ stage: 'complete', stageProgress: 1, overallProgress: 1, itemsFound: filteredTerms.length })
        setGenerating(false)

        // Refresh cache stats
        getCacheStats().then(setCacheStats)

        return filteredTerms
      }

      // Legacy NLP-only generation (fallback)
      const allTerms: GlossaryTerm[] = []
      const seenTerms = new Set<string>()

      // Progress helper for legacy path - also updates partial terms for incremental display
      const updateProgress = (stage: GenerationStage, stageProgress: number, overallProgress: number) => {
        setProgress({ stage, stageProgress, overallProgress, itemsFound: allTerms.length })
        // Incremental update: show terms found so far during generation
        if (allTerms.length > 0) {
          const partialTerms = allTerms
            .filter(t => t.confidence >= minConfidence)
            .filter(t => categories.includes(t.category))
            .sort((a, b) => {
              const categoryDiff = CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category]
              if (categoryDiff !== 0) return categoryDiff
              return b.confidence - a.confidence
            })
            .slice(0, maxTerms)
          setTerms(partialTerms)
        }
      }

      // Determine if we should use fast mode (skip expensive NER)
      // Use fast mode more aggressively - content over 10KB triggers fast mode
      const isLargeDoc = content.length > maxContentSize
      const isMediumDoc = content.length > 10000 // 10KB threshold for fast mode
      const useFastMode = forceFastMode ?? isLargeDoc ?? isMediumDoc

      // Sample content for very large documents
      const processedContent = isLargeDoc
        ? sampleContent(content, maxContentSize)
        : content

      // Early termination helper
      const hasEnoughTerms = () => allTerms.length >= maxTerms * 1.5

      // Yield to main thread before starting heavy work
      await yieldToMain()
      updateProgress('extracting_tech', 0, 0.1)

      // 1. Extract tech entities FIRST (fast, high-value)
      const techEntities = extractTechEntities(processedContent)
      for (const [subcategory, entities] of Object.entries(techEntities)) {
        if (hasEnoughTerms()) break
        for (const entity of entities) {
          const key = entity.toLowerCase()
          if (seenTerms.has(key)) continue
          seenTerms.add(key)

          allTerms.push({
            id: generateId(),
            term: entity,
            category: 'technology',
            subcategory,
            confidence: 0.75,
          })
        }
      }
      updateProgress('extracting_tech', 1, 0.2)

      await yieldToMain()
      updateProgress('extracting_acronyms', 0, 0.25)

      // 2. Extract acronyms (fast)
      if (!hasEnoughTerms()) {
        const acronyms = extractAcronyms(processedContent)
        for (const [acronym, { expansion, line }] of acronyms) {
          if (hasEnoughTerms()) break
          if (seenTerms.has(acronym.toLowerCase())) continue
          seenTerms.add(acronym.toLowerCase())

          allTerms.push({
            id: generateId(),
            term: acronym,
            definition: expansion,
            category: 'acronym',
            confidence: expansion ? 0.9 : 0.6,
            sourceLine: line,
          })
        }
      }
      updateProgress('extracting_acronyms', 1, 0.35)

      await yieldToMain()
      updateProgress('extracting_entities', 0, 0.4)

      // 3. Extract named entities (SLOW - skip in fast mode)
      if (!useFastMode && !hasEnoughTerms()) {
        const entities = await extractEntitiesAsync(processedContent)
        await yieldToMain('high') // High priority yield after heavy NLP
        updateProgress('extracting_entities', 0.5, 0.5)

        // People - with periodic yields
        let entityCount = 0
        for (const person of entities.people || []) {
          if (hasEnoughTerms()) break
          const key = person.toLowerCase()
          if (seenTerms.has(key) || shouldExcludeTerm(person)) continue
          seenTerms.add(key)

          allTerms.push({
            id: generateId(),
            term: person,
            category: 'entity',
            subcategory: 'person',
            confidence: 0.7,
          })
          
          // Yield every 10 entities to keep UI responsive
          if (++entityCount % 10 === 0) await yieldToMain('high')
        }

        // Organizations - with periodic yields
        for (const org of entities.organizations || []) {
          if (hasEnoughTerms()) break
          const key = org.toLowerCase()
          if (seenTerms.has(key) || shouldExcludeTerm(org)) continue
          seenTerms.add(key)

          allTerms.push({
            id: generateId(),
            term: org,
            category: 'entity',
            subcategory: 'organization',
            confidence: 0.7,
          })
          
          // Yield every 10 entities
          if (++entityCount % 10 === 0) await yieldToMain('high')
        }
      }
      updateProgress('extracting_entities', 1, 0.6)

      await yieldToMain()

      // 4. Extract definitions (moderately slow)
      if (!hasEnoughTerms()) {
        const definitions = await extractDefinitions(processedContent)
        for (const [term, { definition, line }] of definitions) {
          if (hasEnoughTerms()) break
          if (seenTerms.has(term.toLowerCase())) continue
          seenTerms.add(term.toLowerCase())

          allTerms.push({
            id: generateId(),
            term: term.charAt(0).toUpperCase() + term.slice(1),
            definition,
            category: 'concept',
            confidence: 0.85,
            sourceLine: line,
            sourceText: definition,
          })
        }
      }

      await yieldToMain()
      updateProgress('extracting_keywords', 0, 0.7)

      // 5. Extract high-value keywords (fill remaining slots)
      if (!hasEnoughTerms()) {
        const keywords = extractKeywords(processedContent, 20)
        for (const { word, score } of keywords) {
          if (hasEnoughTerms()) break
          const key = word.toLowerCase()
          if (seenTerms.has(key) || shouldExcludeTerm(word)) continue
          if (score < 3) continue // Only high-scoring keywords
          seenTerms.add(key)

          allTerms.push({
            id: generateId(),
            term: word,
            category: 'keyword',
            confidence: Math.min(score / 10, 0.8),
          })
        }
      }
      updateProgress('extracting_keywords', 1, 0.85)

      await yieldToMain()
      updateProgress('merging', 0, 0.9)

      // Filter, sort by category priority then confidence, limit count
      const filteredTerms = allTerms
        .filter(t => t.confidence >= minConfidence)
        .filter(t => categories.includes(t.category))
        .sort((a, b) => {
          // Primary: category priority (entity, acronym, technology, concept, keyword)
          const categoryDiff = CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category]
          if (categoryDiff !== 0) return categoryDiff
          // Secondary: confidence
          return b.confidence - a.confidence
        })
        .slice(0, maxTerms)

      // Calculate stats (lightweight)
      const statsByCategory: Record<string, number> = {}
      for (const term of filteredTerms) {
        statsByCategory[term.category] = (statsByCategory[term.category] || 0) + 1
      }

      // Skip expensive coverage calculation for large docs
      let coverage = 0
      if (!isLargeDoc) {
        const uniqueTermWords = new Set(
          filteredTerms.flatMap(t => t.term.toLowerCase().split(/\s+/))
        )
        const contentWords = content.toLowerCase().split(/\s+/)
        coverage = contentWords.filter(w => uniqueTermWords.has(w)).length / contentWords.length
      }

      setTerms(filteredTerms)
      setStats({
        total: filteredTerms.length,
        byCategory: statsByCategory,
        coverage: Math.round(coverage * 100) / 100,
      })
      setProgress({ stage: 'complete', stageProgress: 1, overallProgress: 1, itemsFound: filteredTerms.length })
      setGenerating(false)

      return filteredTerms
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate glossary'
      setError(message)
      setProgress({ stage: 'idle', stageProgress: 0, overallProgress: 0, itemsFound: 0 })
      setGenerating(false)
      return []
    }
  }, [minConfidence, maxTerms, categories, maxContentSize, forceFastMode, useCachedGeneration])

  /**
   * Get terms by category
   */
  const getByCategory = useCallback((category: GlossaryTerm['category']): GlossaryTerm[] => {
    return terms.filter(t => t.category === category)
  }, [terms])

  /**
   * Search terms
   */
  const search = useCallback((query: string): GlossaryTerm[] => {
    const lowerQuery = query.toLowerCase()
    return terms.filter(t =>
      t.term.toLowerCase().includes(lowerQuery) ||
      t.definition?.toLowerCase().includes(lowerQuery) ||
      t.aliases?.some(a => a.toLowerCase().includes(lowerQuery))
    )
  }, [terms])

  /**
   * Clear glossary
   */
  const clear = useCallback(() => {
    setTerms([])
    setStats(null)
    setError(null)
    setProgress({ stage: 'idle', stageProgress: 0, overallProgress: 0, itemsFound: 0 })
  }, [])

  return {
    terms,
    generating,
    error,
    stats,
    settings,
    cacheStats,
    progress,
    generate,
    getByCategory,
    search,
    clear,
    clearCache,
    refreshSettings,
  }
}

export default useGlossary
