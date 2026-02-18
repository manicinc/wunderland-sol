/**
 * Smart Auto-fill Hook for Strand Creation
 * @module codex/hooks/useSmartAutofill
 * 
 * @description
 * Provides intelligent suggestions for tags, topics, categories, and other
 * metadata when creating or editing strands. Uses statistical NLP analysis
 * with optional AI enhancement.
 * 
 * @features
 * - Tag suggestions from content analysis (TF-IDF, entity extraction)
 * - Context-aware suggestions from sibling strands in same loom
 * - Topic inference from folder hierarchy
 * - Difficulty estimation from content analysis
 * - Statistical-first approach with AI as optional enhancement
 * - Graceful fallbacks at every level
 * 
 * @example
 * ```tsx
 * const {
 *   suggestedTags,
 *   suggestedTopics,
 *   suggestedDifficulty,
 *   isLoading,
 *   refresh,
 * } = useSmartAutofill({
 *   content: markdownContent,
 *   currentPath: 'weaves/frame/looms/openstrand',
 *   existingTags: ['architecture'],
 *   enableAI: false,
 * })
 * ```
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  suggestTags,
  extractKeywords,
  extractTechEntities,
  classifyContentType,
  analyzeReadingLevel,
} from '@/lib/nlp'
import { API_ENDPOINTS, REPO_CONFIG } from '../constants'
import { llm, isLLMAvailable, z } from '@/lib/llm'
import { parseTags as parseTagsUtil } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Configuration for the auto-fill hook
 */
export interface SmartAutofillConfig {
  /** Markdown content to analyze */
  content: string
  /** Current file path (for context) */
  currentPath: string
  /** Existing tags to avoid suggesting duplicates */
  existingTags?: string[]
  /** Existing topics to avoid suggesting duplicates */
  existingTopics?: string[]
  /** Whether to enable AI-powered suggestions (optional enhancement) */
  enableAI?: boolean
  /** Maximum suggestions per category */
  maxSuggestions?: number
  /** Debounce delay in ms */
  debounceMs?: number
}

/**
 * Suggestion with confidence score and source
 */
export interface Suggestion {
  /** Suggested value */
  value: string
  /** Confidence score (0-1) */
  confidence: number
  /** Source of suggestion */
  source: 'content' | 'context' | 'hierarchy' | 'ai'
  /** Optional explanation */
  reason?: string
}

/**
 * Return value from the hook
 */
export interface SmartAutofillResult {
  /** Suggested tags with confidence scores */
  suggestedTags: Suggestion[]
  /** Suggested topics based on hierarchy */
  suggestedTopics: Suggestion[]
  /** Suggested subjects */
  suggestedSubjects: Suggestion[]
  /** Suggested difficulty level */
  suggestedDifficulty: {
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    confidence: number
    metrics: {
      avgSentenceLength: number
      avgWordLength: number
      technicalDensity: number
      codeBlockRatio: number
    }
  } | null
  /** Suggested content type */
  suggestedContentType: {
    type: string
    confidence: number
  } | null
  /** Auto-generated summary */
  suggestedSummary: string | null
  /** Related strands in same loom */
  siblingStrands: Array<{ path: string; title: string; tags: string[] }>
  /** Common tags from siblings */
  contextTags: Suggestion[]
  /** Whether suggestions are loading */
  isLoading: boolean
  /** Error if any */
  error: string | null
  /** Refresh suggestions manually */
  refresh: () => void
  /** AI status */
  aiStatus: 'disabled' | 'pending' | 'ready' | 'error'
}

/**
 * Codex index entry structure
 */
interface CodexIndexEntry {
  path: string
  metadata?: {
    title?: string
    tags?: string | string[]
    taxonomy?: {
      subjects?: string[]
      topics?: string[]
    }
    difficulty?: string
    summary?: string
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Parse tags from various formats (uses centralized utility with min length filter)
 */
function parseTags(tags: unknown): string[] {
  return parseTagsUtil(tags)
}

/**
 * Infer topics from folder hierarchy
 * e.g., "weaves/frame/looms/openstrand/strands/architecture.md" 
 *       → ["frame", "openstrand", "architecture"]
 */
function inferTopicsFromPath(path: string): Suggestion[] {
  const parts = path
    .replace(/^weaves\//, '')
    .replace(/\.md$/, '')
    .split('/')
    .filter(p => p && !['looms', 'strands'].includes(p))
  
  return parts.map((part, index) => ({
    value: part.replace(/-/g, ' '),
    confidence: 0.9 - (index * 0.1), // Higher confidence for parent folders
    source: 'hierarchy' as const,
    reason: `Inferred from folder: ${part}`,
  }))
}

/**
 * Infer subjects from weave (top-level folder)
 */
function inferSubjectsFromPath(path: string): Suggestion[] {
  const weaveName = path.split('/')[1] // weaves/[weaveName]/...
  if (!weaveName) return []
  
  // Map known weave names to subjects
  const weaveSubjectMap: Record<string, string[]> = {
    frame: ['software', 'development', 'technology'],
    wiki: ['documentation', 'knowledge-management'],
    technology: ['software', 'technology', 'engineering'],
    science: ['science', 'research'],
    community: ['community', 'contributions'],
  }
  
  const subjects = weaveSubjectMap[weaveName.toLowerCase()] || [weaveName]
  return subjects.map((subject, index) => ({
    value: subject,
    confidence: 0.8 - (index * 0.1),
    source: 'hierarchy' as const,
    reason: `Inferred from weave: ${weaveName}`,
  }))
}

/**
 * Calculate tag frequency from sibling strands
 */
function calculateContextTags(
  siblings: Array<{ tags: string[] }>,
  existingTags: string[]
): Suggestion[] {
  const tagFrequency = new Map<string, number>()
  const existingSet = new Set(existingTags.map(t => t.toLowerCase()))
  
  for (const sibling of siblings) {
    for (const tag of sibling.tags) {
      const normalized = tag.toLowerCase()
      if (!existingSet.has(normalized)) {
        tagFrequency.set(normalized, (tagFrequency.get(normalized) || 0) + 1)
      }
    }
  }
  
  // Sort by frequency and convert to suggestions
  return Array.from(tagFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag, count]) => ({
      value: tag,
      confidence: Math.min(0.9, count / siblings.length),
      source: 'context' as const,
      reason: `Used in ${count} sibling strand${count > 1 ? 's' : ''}`,
    }))
}

/**
 * Merge suggestions from multiple sources, deduplicating and sorting by confidence
 */
function mergeSuggestions(
  ...sources: Suggestion[][]
): Suggestion[] {
  const merged = new Map<string, Suggestion>()
  
  for (const source of sources) {
    for (const suggestion of source) {
      const key = suggestion.value.toLowerCase()
      const existing = merged.get(key)
      
      if (!existing || suggestion.confidence > existing.confidence) {
        merged.set(key, suggestion)
      }
    }
  }
  
  return Array.from(merged.values())
    .sort((a, b) => b.confidence - a.confidence)
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN HOOK
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Smart Auto-fill Hook
 * 
 * Provides intelligent metadata suggestions for strand creation/editing.
 * Uses statistical NLP analysis with optional AI enhancement.
 */
export function useSmartAutofill({
  content,
  currentPath,
  existingTags = [],
  existingTopics = [],
  enableAI = false,
  maxSuggestions = 10,
  debounceMs = 300,
}: SmartAutofillConfig): SmartAutofillResult {
  // State
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codexIndex, setCodexIndex] = useState<CodexIndexEntry[]>([])
  const [indexLoaded, setIndexLoaded] = useState(false)
  const [aiStatus, setAiStatus] = useState<'disabled' | 'pending' | 'ready' | 'error'>(
    enableAI ? 'pending' : 'disabled'
  )
  const [aiSuggestions, setAiSuggestions] = useState<Suggestion[]>([])
  const aiRequestRef = useRef<AbortController | null>(null)
  
  // ─────────────────────────────────────────────────────────────────────────
  // Fetch codex index for context-aware suggestions
  // ─────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    const fetchIndex = async () => {
      try {
        const indexUrl = API_ENDPOINTS.raw('codex-index.json')
        const response = await fetch(indexUrl)
        if (response.ok) {
          const data = await response.json() as CodexIndexEntry[]
          setCodexIndex(data)
        }
      } catch (err) {
        console.warn('Failed to fetch codex index for auto-fill:', err)
      } finally {
        setIndexLoaded(true)
      }
    }
    
    fetchIndex()
  }, [])
  
  // ─────────────────────────────────────────────────────────────────────────
  // Compute sibling strands (same loom)
  // ─────────────────────────────────────────────────────────────────────────
  
  const siblingStrands = useMemo(() => {
    if (!indexLoaded || codexIndex.length === 0) return []
    
    // Extract parent path (loom directory)
    const pathParts = currentPath.split('/')
    const parentPath = pathParts.slice(0, -1).join('/')
    
    return codexIndex
      .filter(entry => {
        if (!entry.path || entry.path === currentPath) return false
        return entry.path.startsWith(parentPath) && entry.path !== currentPath
      })
      .map(entry => ({
        path: entry.path,
        title: entry.metadata?.title || entry.path.split('/').pop()?.replace('.md', '') || '',
        tags: parseTags(entry.metadata?.tags),
      }))
      .slice(0, 20)
  }, [codexIndex, currentPath, indexLoaded])
  
  // ─────────────────────────────────────────────────────────────────────────
  // Compute context tags from siblings
  // ─────────────────────────────────────────────────────────────────────────
  
  const contextTags = useMemo(() => {
    return calculateContextTags(siblingStrands, existingTags)
  }, [siblingStrands, existingTags])
  
  // ─────────────────────────────────────────────────────────────────────────
  // Compute content-based suggestions
  // ─────────────────────────────────────────────────────────────────────────
  
  const contentSuggestions = useMemo(() => {
    if (!content || content.length < 50) {
      return {
        tags: [] as Suggestion[],
        difficulty: null,
        contentType: null,
        summary: null,
      }
    }
    
    // Extract keywords and entities
    const keywords = extractKeywords(content, 20)
    const entities = extractTechEntities(content)
    const nlpTags = suggestTags(content, existingTags)
    
    // Convert to suggestions
    const keywordSuggestions: Suggestion[] = keywords
      .filter(k => !existingTags.includes(k.word.toLowerCase()))
      .map(k => ({
        value: k.word,
        confidence: Math.min(0.8, k.score / 10),
        source: 'content' as const,
        reason: `High-frequency keyword (score: ${k.score.toFixed(1)})`,
      }))
    
    // Add entity suggestions
    const entitySuggestions: Suggestion[] = []
    for (const [category, items] of Object.entries(entities)) {
      for (const item of items) {
        const normalized = item.toLowerCase()
        if (!existingTags.includes(normalized)) {
          entitySuggestions.push({
            value: normalized,
            confidence: 0.85,
            source: 'content',
            reason: `Detected ${category}: ${item}`,
          })
        }
      }
    }
    
    // Add NLP suggestions
    const nlpSuggestions: Suggestion[] = nlpTags.map(tag => ({
      value: tag,
      confidence: 0.7,
      source: 'content' as const,
      reason: 'Suggested by NLP analysis',
    }))
    
    // Analyze difficulty
    const readingLevel = analyzeReadingLevel(content)
    const difficulty = {
      level: readingLevel.level,
      confidence: 0.75,
      metrics: readingLevel.metrics,
    }
    
    // Classify content type
    const contentClass = classifyContentType(content)
    const contentType = {
      type: contentClass.primary,
      confidence: contentClass.confidence,
    }
    
    // Generate summary (first 2-3 sentences)
    const strippedContent = content.replace(/^---[\s\S]*?---\s*/, '').replace(/```[\s\S]*?```/g, '')
    const sentences = strippedContent.split(/[.!?]+/).filter(s => s.trim().length > 20)
    const summary = sentences.slice(0, 2).join('. ').trim() + (sentences.length > 0 ? '.' : '')
    
    return {
      tags: mergeSuggestions(entitySuggestions, keywordSuggestions, nlpSuggestions),
      difficulty,
      contentType,
      summary: summary.length > 30 ? summary.slice(0, 200) : null,
    }
  }, [content, existingTags])
  
  // ─────────────────────────────────────────────────────────────────────────
  // Compute hierarchy-based suggestions
  // ─────────────────────────────────────────────────────────────────────────
  
  const hierarchySuggestions = useMemo(() => {
    return {
      topics: inferTopicsFromPath(currentPath)
        .filter(t => !existingTopics.includes(t.value.toLowerCase())),
      subjects: inferSubjectsFromPath(currentPath),
    }
  }, [currentPath, existingTopics])
  
  // ─────────────────────────────────────────────────────────────────────────
  // Merge all tag suggestions (including AI if enabled)
  // ─────────────────────────────────────────────────────────────────────────
  
  const suggestedTags = useMemo(() => {
    return mergeSuggestions(
      contentSuggestions.tags,
      contextTags,
      enableAI ? aiSuggestions : [],
    ).slice(0, maxSuggestions)
  }, [contentSuggestions.tags, contextTags, aiSuggestions, enableAI, maxSuggestions])
  
  // ─────────────────────────────────────────────────────────────────────────
  // Refresh function
  // ─────────────────────────────────────────────────────────────────────────
  
  const refresh = useCallback(() => {
    // Force re-computation by triggering state update
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 100)
  }, [])
  
  // ─────────────────────────────────────────────────────────────────────────
  // AI Enhancement (uses LLM for intelligent suggestions)
  // ─────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (!enableAI) {
      setAiStatus('disabled')
      setAiSuggestions([])
      return
    }
    
    // Check if LLM is available
    if (!isLLMAvailable()) {
      setAiStatus('disabled')
      return
    }
    
    // Debounce AI requests
    const timeoutId = setTimeout(async () => {
      // Cancel previous request
      if (aiRequestRef.current) {
        aiRequestRef.current.abort()
      }
      
      // Skip if content is too short
      if (content.length < 100) {
        setAiStatus('ready')
        return
      }
      
      setAiStatus('pending')
      aiRequestRef.current = new AbortController()
      
      try {
        // Define the schema for AI suggestions
        const suggestionSchema = z.object({
          tags: z.array(z.object({
            value: z.string(),
            confidence: z.number().min(0).max(1),
            reason: z.string().optional(),
          })).max(10),
          topics: z.array(z.object({
            value: z.string(),
            confidence: z.number().min(0).max(1),
            reason: z.string().optional(),
          })).max(5),
          summary: z.string().max(200).optional(),
          difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
        })
        
        const result = await llm.generate({
          prompt: `Analyze this content and suggest metadata:

Content:
${content.slice(0, 2000)}

Current path: ${currentPath}
Existing tags: ${existingTags.join(', ') || 'none'}
Existing topics: ${existingTopics.join(', ') || 'none'}

Suggest:
1. Relevant tags (technical terms, concepts, technologies) - avoid duplicating existing tags
2. Topics based on subject matter (should align with folder hierarchy)
3. A concise summary (1-2 sentences)
4. Difficulty level based on technical complexity`,
          schema: suggestionSchema,
          system: 'You are a technical documentation expert. Analyze content and suggest accurate, specific metadata. Focus on technical accuracy over creativity.',
          temperature: 0.3,
          maxTokens: 500,
          signal: aiRequestRef.current.signal,
        })
        
        // Convert AI suggestions to our format
        const newAiSuggestions: Suggestion[] = result.data.tags.map((t: { value: string; confidence: number; reason?: string }) => ({
          value: t.value.toLowerCase(),
          confidence: t.confidence,
          source: 'ai' as const,
          reason: t.reason || 'AI suggestion',
        }))
        
        setAiSuggestions(newAiSuggestions)
        setAiStatus('ready')
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') return
        
        console.warn('[useSmartAutofill] AI enhancement failed:', err)
        setAiStatus('error')
        setAiSuggestions([])
      }
    }, debounceMs)
    
    return () => {
      clearTimeout(timeoutId)
      if (aiRequestRef.current) {
        aiRequestRef.current.abort()
      }
    }
  }, [enableAI, content, currentPath, existingTags, existingTopics, debounceMs])
  
  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────
  
  return {
    suggestedTags,
    suggestedTopics: hierarchySuggestions.topics.slice(0, maxSuggestions),
    suggestedSubjects: hierarchySuggestions.subjects.slice(0, maxSuggestions),
    suggestedDifficulty: contentSuggestions.difficulty,
    suggestedContentType: contentSuggestions.contentType,
    suggestedSummary: contentSuggestions.summary,
    siblingStrands,
    contextTags,
    isLoading,
    error,
    refresh,
    aiStatus,
  }
}

export default useSmartAutofill

