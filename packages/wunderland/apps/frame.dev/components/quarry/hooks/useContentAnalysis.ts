/**
 * useContentAnalysis - React hook for NLP-powered content analysis
 * @module codex/hooks/useContentAnalysis
 * 
 * Provides real-time content analysis including:
 * - Entity extraction
 * - Tag suggestions
 * - Content classification
 * - Reading level
 * - Content health score
 */

'use client'

import { useMemo, useCallback } from 'react'
import {
  extractTechEntities,
  extractKeywords,
  suggestTags,
  classifyContentType,
  analyzeReadingLevel,
  extractInternalLinks,
  extractExternalLinks,
  generateExtractiveSummary,
  calculateContentHealth,
} from '@/lib/nlp'
import type { StrandMetadata } from '../types'

interface ContentAnalysis {
  // Entities found in content
  entities: Record<string, string[]>
  
  // Top keywords with scores
  keywords: Array<{ word: string; score: number }>
  
  // Suggested tags based on content
  suggestedTags: string[]
  
  // Content type classification
  contentType: {
    primary: string
    confidence: number
    scores: Record<string, number>
  }
  
  // Reading difficulty
  readingLevel: {
    level: 'beginner' | 'intermediate' | 'advanced'
    metrics: {
      avgSentenceLength: number
      avgWordLength: number
      technicalDensity: number
      codeBlockRatio: number
    }
  }
  
  // Internal/external links
  internalLinks: string[]
  externalLinks: Array<{ url: string; domain: string }>
  
  // Auto-generated summary
  extractiveSummary: string
  
  // Content health score
  health: {
    score: number
    issues: string[]
    suggestions: string[]
  }
  
  // Stats
  wordCount: number
  headingCount: number
  codeBlockCount: number
  linkCount: number
}

interface UseContentAnalysisOptions {
  /** Existing metadata (for health checks) */
  metadata?: StrandMetadata
  /** Existing tags (for tag suggestion filtering) */
  existingTags?: string[]
  /** Enable/disable analysis (for performance) */
  enabled?: boolean
}

/**
 * Hook for analyzing content with NLP utilities
 */
export function useContentAnalysis(
  content: string | null | undefined,
  options: UseContentAnalysisOptions = {}
): ContentAnalysis | null {
  const { metadata = {}, existingTags = [], enabled = true } = options
  
  return useMemo(() => {
    if (!content || !enabled) return null
    
    // Basic stats
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length
    const headingCount = (content.match(/^#{1,6}\s+.+$/gm) || []).length
    const codeBlockCount = (content.match(/```/g) || []).length / 2
    
    // Extract entities
    const entities = extractTechEntities(content)
    
    // Extract keywords
    const keywords = extractKeywords(content, 15)
    
    // Suggest tags
    const allExistingTags = [
      ...(existingTags || []),
      ...((metadata.tags as string[]) || []),
      ...(metadata.taxonomy?.subjects || []),
      ...(metadata.taxonomy?.topics || []),
    ]
    const suggestedTags = suggestTags(content, allExistingTags)
    
    // Classify content type
    const contentType = classifyContentType(content)
    
    // Analyze reading level
    const readingLevel = analyzeReadingLevel(content)
    
    // Extract links
    const internalLinks = extractInternalLinks(content)
    const externalLinks = extractExternalLinks(content)
    
    // Generate summary
    const extractiveSummary = generateExtractiveSummary(content)
    
    // Calculate health
    const health = calculateContentHealth(content, metadata)
    
    return {
      entities,
      keywords,
      suggestedTags,
      contentType,
      readingLevel,
      internalLinks,
      externalLinks,
      extractiveSummary,
      health,
      wordCount,
      headingCount,
      codeBlockCount,
      linkCount: internalLinks.length + externalLinks.length,
    }
  }, [content, metadata, existingTags, enabled])
}

/**
 * Get a color for difficulty level
 */
export function getDifficultyColor(level: string): string {
  switch (level) {
    case 'beginner':
      return 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30'
    case 'intermediate':
      return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30'
    case 'advanced':
      return 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30'
    default:
      return 'text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800'
  }
}

/**
 * Get a color for content type
 */
export function getContentTypeColor(type: string): string {
  switch (type) {
    case 'tutorial':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
    case 'reference':
      return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30'
    case 'conceptual':
      return 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30'
    case 'troubleshooting':
      return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30'
    case 'architecture':
      return 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30'
    default:
      return 'text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800'
  }
}

/**
 * Get health score color
 */
export function getHealthColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

export default useContentAnalysis














