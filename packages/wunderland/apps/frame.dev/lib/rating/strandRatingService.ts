/**
 * Strand Rating Service
 * @module lib/rating/strandRatingService
 *
 * LLM-based document rating service that evaluates strand quality
 * across multiple dimensions using a 10-point scale.
 */

import { z } from 'zod'
import { generateWithFallback, isLLMAvailable, type ProviderAlias } from '@/lib/llm'
import { saveLLMStrandRating, getLLMStrandRating, type LocalLLMStrandRating } from '@/lib/storage/localCodex'
import type { StrandMetadata } from '@/components/quarry/types'
import type { StrandLLMRating } from '@/types/openstrand'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES & SCHEMAS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Options for rating generation
 */
export interface RatingGenerationOptions {
  /** Force regeneration even if cached */
  forceRegenerate?: boolean
  /** Provider order for fallback */
  providerOrder?: ProviderAlias[]
  /** Timeout in milliseconds */
  timeout?: number
  /** Include comparison to other documents */
  compareToOthers?: boolean
  /** Maximum tokens for response */
  maxTokens?: number
}

/**
 * Input for rating generation
 */
export interface RatingInput {
  strandId: string
  strandPath: string
  strandTitle: string
  content: string
  metadata?: Partial<StrandMetadata>
  /** Other strands for comparison (optional) */
  comparisonStrands?: Array<{
    id: string
    title: string
    summary?: string
    tags?: string[]
  }>
}

/**
 * Rating generation result
 */
export interface RatingResult {
  rating: LocalLLMStrandRating
  fromCache: boolean
  provider?: ProviderAlias
  latency: number
}

/**
 * Progress callback for rating generation
 */
export type RatingProgressCallback = (stage: string, percent: number) => void

// Zod schema for LLM response
const LLMRatingResponseSchema = z.object({
  overallScore: z.number().min(1).max(10),
  qualityScore: z.number().min(1).max(10).optional(),
  completenessScore: z.number().min(1).max(10).optional(),
  accuracyScore: z.number().min(1).max(10).optional(),
  clarityScore: z.number().min(1).max(10).optional(),
  relevanceScore: z.number().min(1).max(10).optional(),
  depthScore: z.number().min(1).max(10).optional(),
  reasoning: z.string(),
  suggestions: z.array(z.string()).optional(),
  comparedTo: z.array(z.string()).optional(),
})

type LLMRatingResponse = z.infer<typeof LLMRatingResponseSchema>

/* ═══════════════════════════════════════════════════════════════════════════
   PROMPT TEMPLATES
═══════════════════════════════════════════════════════════════════════════ */

function buildRatingPrompt(input: RatingInput, options: RatingGenerationOptions): string {
  const { content, metadata, comparisonStrands } = input

  // Build metadata context
  let metadataContext = ''
  if (metadata) {
    const parts: string[] = []
    if (metadata.title) parts.push(`Title: ${metadata.title}`)
    if (metadata.description) parts.push(`Description: ${metadata.description}`)
    if (metadata.tags?.length) {
      const tagsStr = Array.isArray(metadata.tags) ? metadata.tags.join(', ') : metadata.tags
      parts.push(`Tags: ${tagsStr}`)
    }
    if (metadata.taxonomy?.subjects?.length) {
      parts.push(`Subjects: ${metadata.taxonomy.subjects.join(', ')}`)
    }
    if (metadata.taxonomy?.topics?.length) {
      parts.push(`Topics: ${metadata.taxonomy.topics.join(', ')}`)
    }
    if (parts.length) {
      metadataContext = `\n\nDocument Metadata:\n${parts.join('\n')}`
    }
  }

  // Build comparison context
  let comparisonContext = ''
  if (options.compareToOthers && comparisonStrands?.length) {
    const compList = comparisonStrands
      .map((s) => `- ${s.title}${s.summary ? `: ${s.summary}` : ''}`)
      .join('\n')
    comparisonContext = `\n\nRelated documents for comparison context:\n${compList}`
  }

  // Truncate content if too long (keep first 8000 chars)
  const truncatedContent = content.length > 8000 ? content.slice(0, 8000) + '\n\n[... content truncated ...]' : content

  return `You are an expert document quality analyst. Evaluate the following document and provide ratings on a 1-10 scale.

Rating Dimensions:
- Quality (1-10): Overall writing quality, structure, and professionalism
- Completeness (1-10): How thoroughly the topic is covered
- Accuracy (1-10): Factual correctness and reliability
- Clarity (1-10): How easy it is to understand
- Relevance (1-10): How relevant the content is to its stated purpose
- Depth (1-10): Level of detail and analytical depth

Overall Score: A weighted average considering all dimensions, with emphasis on quality and completeness.
${metadataContext}
${comparisonContext}

Document Content:
---
${truncatedContent}
---

Analyze this document and provide your assessment. Be fair but critical. Include:
1. An overall score (1-10)
2. Individual dimension scores where applicable
3. Brief reasoning for your assessment
4. 2-3 specific suggestions for improvement (if any)
${comparisonStrands?.length ? '5. How this document compares to similar documents in the collection' : ''}

Respond with a JSON object containing your analysis.`
}

const SYSTEM_PROMPT = `You are a document quality analyst specializing in educational and technical content evaluation.
Your ratings should be:
- Fair and objective
- Based on clear criteria
- Constructive in feedback
- Consistent across similar documents

Use the full 1-10 scale appropriately:
- 1-3: Poor quality, major issues
- 4-5: Below average, significant room for improvement
- 6-7: Average to good, meets basic standards
- 8-9: Very good to excellent, high quality
- 10: Exceptional, exemplary work

Be specific in your reasoning and suggestions.`

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate an LLM rating for a strand
 */
export async function generateStrandRating(
  input: RatingInput,
  options: RatingGenerationOptions = {},
  onProgress?: RatingProgressCallback
): Promise<RatingResult> {
  const startTime = Date.now()

  // Check cache first
  if (!options.forceRegenerate) {
    onProgress?.('Checking cache...', 10)
    const cached = await getLLMStrandRating(input.strandId)
    if (cached) {
      return {
        rating: cached,
        fromCache: true,
        latency: Date.now() - startTime,
      }
    }
  }

  // Check if LLM is available
  if (!isLLMAvailable()) {
    throw new Error('No LLM provider configured. Please add an API key in settings.')
  }

  onProgress?.('Analyzing document...', 30)

  // Build prompt
  const prompt = buildRatingPrompt(input, options)

  onProgress?.('Generating rating...', 50)

  // Call LLM with fallback
  const result = await generateWithFallback(prompt, LLMRatingResponseSchema, {
    system: SYSTEM_PROMPT,
    providerOrder: options.providerOrder || ['claude', 'openai', 'openrouter'],
    timeout: options.timeout || 60000,
    maxTokens: options.maxTokens || 1024,
    temperature: 0.3, // Lower temperature for more consistent ratings
  })

  onProgress?.('Saving rating...', 80)

  // Save to storage
  const savedRating = await saveLLMStrandRating({
    strandId: input.strandId,
    strandPath: input.strandPath,
    overallScore: result.data.overallScore,
    qualityScore: result.data.qualityScore,
    completenessScore: result.data.completenessScore,
    accuracyScore: result.data.accuracyScore,
    clarityScore: result.data.clarityScore,
    relevanceScore: result.data.relevanceScore,
    depthScore: result.data.depthScore,
    reasoning: result.data.reasoning,
    suggestions: result.data.suggestions,
    comparedTo: result.data.comparedTo,
    modelUsed: result.model,
  })

  onProgress?.('Complete', 100)

  return {
    rating: savedRating,
    fromCache: false,
    provider: result.providerAlias,
    latency: Date.now() - startTime,
  }
}

/**
 * Batch generate ratings for multiple strands
 */
export async function generateStrandRatingsBatch(
  inputs: RatingInput[],
  options: RatingGenerationOptions = {},
  onProgress?: (completed: number, total: number, current?: string) => void
): Promise<Map<string, RatingResult>> {
  const results = new Map<string, RatingResult>()

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    onProgress?.(i, inputs.length, input.strandTitle)

    try {
      const result = await generateStrandRating(input, options)
      results.set(input.strandId, result)
    } catch (error) {
      console.error(`Failed to rate strand ${input.strandId}:`, error)
      // Continue with other strands
    }
  }

  onProgress?.(inputs.length, inputs.length)
  return results
}

/**
 * Check if a strand needs rating (no existing rating or outdated)
 */
export async function strandNeedsRating(
  strandId: string,
  maxAge?: number // Max age in milliseconds before re-rating
): Promise<boolean> {
  const existing = await getLLMStrandRating(strandId)

  if (!existing) return true

  if (maxAge) {
    const age = Date.now() - new Date(existing.updatedAt).getTime()
    return age > maxAge
  }

  return false
}

/**
 * Get rating summary text
 */
export function getRatingSummary(rating: LocalLLMStrandRating): string {
  const score = rating.overallScore

  if (score >= 9) return 'Exceptional'
  if (score >= 8) return 'Excellent'
  if (score >= 7) return 'Very Good'
  if (score >= 6) return 'Good'
  if (score >= 5) return 'Average'
  if (score >= 4) return 'Below Average'
  if (score >= 3) return 'Poor'
  return 'Very Poor'
}

/**
 * Get rating color class based on score
 */
export function getRatingColor(score: number): string {
  if (score >= 8) return 'text-emerald-500'
  if (score >= 6) return 'text-amber-500'
  if (score >= 4) return 'text-orange-500'
  return 'text-red-500'
}

/**
 * Get rating background color class based on score
 */
export function getRatingBgColor(score: number): string {
  if (score >= 8) return 'bg-emerald-500/20'
  if (score >= 6) return 'bg-amber-500/20'
  if (score >= 4) return 'bg-orange-500/20'
  return 'bg-red-500/20'
}

/* ═══════════════════════════════════════════════════════════════════════════
   DIMENSION HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get all dimension scores from an LLM rating
 */
export function getDimensionScores(
  rating: LocalLLMStrandRating
): Array<{ dimension: string; score: number; label: string }> {
  const dimensions: Array<{ key: keyof LocalLLMStrandRating; dimension: string; label: string }> = [
    { key: 'qualityScore', dimension: 'quality', label: 'Quality' },
    { key: 'completenessScore', dimension: 'completeness', label: 'Completeness' },
    { key: 'accuracyScore', dimension: 'accuracy', label: 'Accuracy' },
    { key: 'clarityScore', dimension: 'clarity', label: 'Clarity' },
    { key: 'relevanceScore', dimension: 'relevance', label: 'Relevance' },
    { key: 'depthScore', dimension: 'depth', label: 'Depth' },
  ]

  return dimensions
    .filter((d) => rating[d.key] !== undefined && rating[d.key] !== null)
    .map((d) => ({
      dimension: d.dimension,
      score: rating[d.key] as number,
      label: d.label,
    }))
}

/**
 * Calculate average dimension score
 */
export function getAverageDimensionScore(rating: LocalLLMStrandRating): number | null {
  const scores = getDimensionScores(rating)
  if (scores.length === 0) return null
  return scores.reduce((sum, s) => sum + s.score, 0) / scores.length
}

export default {
  generateStrandRating,
  generateStrandRatingsBatch,
  strandNeedsRating,
  getRatingSummary,
  getRatingColor,
  getRatingBgColor,
  getDimensionScores,
  getAverageDimensionScore,
}

