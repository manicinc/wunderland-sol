/**
 * Smart Auto-Tagging System for Quarry Codex
 * @module lib/nlp/autoTagging
 *
 * Provides intelligent auto-tagging at document and block levels with:
 * - Chain-of-thought LLM prompting for quality tag generation
 * - Statistical NLP heuristics for fast, offline tagging
 * - Preference for existing tags over creating new ones
 * - Configurable at document and block levels
 * - Block worthiness calculation (topic shift + entity density + semantic novelty)
 * - Tag bubbling from blocks to document level
 * - Multi-model LLM fallback chain
 *
 * Design Philosophy:
 * - Conservative tagging: better to miss a tag than hallucinate
 * - Existing tags first: reuse before creating
 * - New tags must be "worthy": categorize multiple items, not one-offs
 * - Chain-of-thought: explicit reasoning prevents hallucination
 * - Blocks earn tags: only worthy blocks get tagged
 */

import type {
  BlockSummary,
  AutoTagConfig,
  StrandMetadata,
  WorthinessResult as BlockWorthinessResult,
  WorthinessSignals
} from '@/components/quarry/types'
import {
  extractEntities,
  extractKeywords,
  extractTechEntities,
  extractNgrams,
  isCodeArtifact,
  type ParsedBlock
} from './index'
import {
  calculateBlockWorthiness,
  calculateAllBlockWorthiness,
  filterWorthyBlocks,
  DEFAULT_WORTHINESS_THRESHOLD
} from './blockWorthiness'
import {
  aggregateBlockTags,
  processTagBubbling,
  type BubbledTag
} from './tagBubbling'
import { mergeAutoTagConfig } from '../settings/autoTagSettings'
import {
  determineTaxonomyLevel,
  findSimilarTerms,
  type TaxonomyHierarchyConfig,
  DEFAULT_TAXONOMY_CONFIG,
  normalizeTerm as normalizeTaxonomyTerm,
} from '../taxonomy'
import type { ScoredTerm, VocabularyCategory } from '../indexer/vocabularyService'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TagSuggestion {
  tag: string
  confidence: number
  /** Tag source: inline (explicit #hashtag), nlp (vocabulary), llm (AI), existing (propagated) */
  source: 'inline' | 'llm' | 'nlp' | 'existing'
  reasoning?: string
}

export interface CategorySuggestion {
  /** Suggested path e.g., 'weaves/wiki/tutorials/react/' */
  path: string
  /** Confidence score 0-1 */
  confidence: number
  /** Explanation for the suggestion */
  reasoning: string
  /** Alternative paths if confidence is low */
  alternatives?: Array<{ path: string; confidence: number; reasoning: string }>
}

export interface CategorizationConfig {
  /** Enable categorization */
  enabled: boolean
  /** Confidence threshold for auto-move (default 0.8) */
  confidenceThreshold: number
  /** Auto-merge PRs above threshold */
  autoMergeEnabled: boolean
  /** Use LLM for ambiguous cases */
  useLLMFallback: boolean
  /** Path for inbox/uncategorized items */
  inboxPath: string
  /** Paths to exclude from category matching */
  excludedPaths: string[]
}

export interface AutoTagResult {
  documentTags: TagSuggestion[]
  blockTags: Map<string, TagSuggestion[]>
  reasoning: string
  /** Worthiness results for each block */
  worthinessResults: Map<string, BlockWorthinessResult>
  /** Tags bubbled up from blocks to document */
  bubbledTags: BubbledTag[]
  /** Method used for tagging (llm or nlp) */
  method: 'llm' | 'nlp' | 'hybrid'
  /** Statistics about the tagging process */
  stats: {
    totalBlocks: number
    worthyBlocks: number
    taggedBlocks: number
    totalBlockTags: number
    bubbledTagCount: number
  }
}

export interface TagContext {
  /** All existing tags in the codex */
  existingTags: string[]
  /** Tags used in related/prerequisite documents */
  relatedTags: string[]
  /** Tags from parent loom/weave */
  hierarchyTags: string[]
  /** Document metadata */
  metadata: StrandMetadata
  /** Auto-tag configuration */
  config: AutoTagConfig
  /** All subjects in the codex (for hierarchy enforcement) */
  existingSubjects?: string[]
  /** All topics in the codex (for hierarchy enforcement) */
  existingTopics?: string[]
  /** Taxonomy hierarchy configuration */
  taxonomyConfig?: TaxonomyHierarchyConfig
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_AUTO_TAG_CONFIG: AutoTagConfig = {
  documentAutoTag: true,
  blockAutoTag: true,
  useLLM: false, // Default to NLP-only (faster, offline)
  preferExistingTags: true,
  maxNewTagsPerBlock: 3,
  maxNewTagsPerDocument: 10,
  confidenceThreshold: 0.6,
}

export const DEFAULT_CATEGORIZATION_CONFIG: CategorizationConfig = {
  enabled: true,
  confidenceThreshold: 0.8,
  autoMergeEnabled: true,
  useLLMFallback: true,
  inboxPath: 'weaves/inbox/',
  excludedPaths: ['weaves/inbox/', 'weaves/.templates/'],
}

// ═══════════════════════════════════════════════════════════════════════════
// LLM PROMPTS WITH CHAIN-OF-THOUGHT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * System prompt for document-level auto-tagging
 * Uses chain-of-thought to prevent hallucination
 */
export const DOCUMENT_TAGGING_SYSTEM_PROMPT = `You are a precise knowledge taxonomy expert. Your task is to suggest relevant tags for a document.

## CRITICAL RULES

1. **PREFER EXISTING TAGS**: You will be given a list of existing tags. Use these whenever they fit. Only suggest new tags if absolutely necessary.

2. **NO HALLUCINATION**: If unsure, suggest fewer tags. An absent tag is better than a wrong tag.

3. **NEW TAGS MUST BE WORTHY**: A new tag should:
   - Be likely to apply to OTHER documents too (not just this one)
   - Categorize a clear concept, technology, or topic
   - NOT be overly specific or niche
   - NOT duplicate existing tags with different wording

4. **CHAIN-OF-THOUGHT REASONING**: For each tag, you MUST explain WHY it applies.

## OUTPUT FORMAT

Respond ONLY with valid JSON:
{
  "reasoning": "Brief analysis of the document's main themes...",
  "tags": [
    {
      "tag": "tag-name",
      "confidence": 0.95,
      "source": "existing",
      "reasoning": "Why this tag applies..."
    }
  ]
}

confidence: 0.0-1.0 where:
- 0.9+ = Definitely applies, core topic
- 0.7-0.9 = Strongly related
- 0.5-0.7 = Tangentially related
- <0.5 = Don't include

source: "existing" if from provided list, "new" if you're suggesting a new tag`

/**
 * System prompt for block-level auto-tagging
 * More conservative than document-level
 */
export const BLOCK_TAGGING_SYSTEM_PROMPT = `You are a precise content analyst. Your task is to suggest tags for a specific BLOCK (paragraph, heading, code snippet) within a larger document.

## CRITICAL RULES

1. **EXTREMELY CONSERVATIVE**: Block tags should be MORE specific than document tags. Only tag if the block has a clear, distinct focus.

2. **INHERIT DOCUMENT TAGS**: The document already has tags. Block tags should ADD specificity, not repeat document tags.

3. **PREFER EXISTING**: Use existing tags from the provided list whenever possible.

4. **EMPTY IS OK**: If the block doesn't warrant specific tags beyond the document tags, return empty array.

5. **CODE BLOCKS**: For code, tag the language/framework only if it's different from the document's main focus.

## OUTPUT FORMAT

{
  "reasoning": "Analysis of this specific block...",
  "warrantsNewIllustration": true/false,
  "illustrationReasoning": "Why this block does/doesn't need its own illustration...",
  "tags": [
    {
      "tag": "specific-tag",
      "confidence": 0.85,
      "source": "existing",
      "reasoning": "Why this tag applies to THIS block specifically..."
    }
  ]
}

For warrantsNewIllustration:
- true: Block introduces a NEW concept, diagram-worthy process, or visual topic
- false: Block continues previous topic, is transitional, or is purely textual/abstract`

/**
 * User prompt template for document tagging
 */
export function buildDocumentTagPrompt(
  content: string,
  title: string,
  existingTags: string[],
  relatedTags: string[],
  maxTags: number
): string {
  return `## EXISTING TAGS IN CODEX
${existingTags.length > 0 ? existingTags.map(t => `- ${t}`).join('\n') : '(none yet)'}

## TAGS FROM RELATED DOCUMENTS
${relatedTags.length > 0 ? relatedTags.map(t => `- ${t}`).join('\n') : '(none)'}

## DOCUMENT TITLE
${title || '(untitled)'}

## DOCUMENT CONTENT
${content.slice(0, 8000)}${content.length > 8000 ? '\n...(truncated)' : ''}

## TASK
Suggest up to ${maxTags} tags for this document. Remember:
1. Use existing tags when they fit
2. New tags must be worthy of reuse
3. Explain your reasoning for each tag
4. If fewer than ${maxTags} tags apply, that's fine`
}

/**
 * User prompt template for block tagging
 */
export function buildBlockTagPrompt(
  blockContent: string,
  blockType: string,
  documentTags: string[],
  existingTags: string[],
  previousBlockSummary: string | null,
  maxTags: number
): string {
  return `## DOCUMENT-LEVEL TAGS (already applied)
${documentTags.map(t => `- ${t}`).join('\n')}

## ALL EXISTING TAGS
${existingTags.slice(0, 100).map(t => `- ${t}`).join('\n')}

## PREVIOUS BLOCK CONTEXT
${previousBlockSummary || '(first block)'}

## CURRENT BLOCK
Type: ${blockType}
Content:
${blockContent}

## TASK
1. Should this block have additional tags beyond the document tags? If so, which?
2. Does this block warrant a NEW illustration? (introduces visual concept, diagram-worthy process)
3. Maximum ${maxTags} additional tags. Empty array is valid if no specific tags needed.`
}

// ═══════════════════════════════════════════════════════════════════════════
// VOCABULARY SERVICE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

// Lazy-loaded VocabularyService singleton
let _vocabularyService: any = null
let _serviceInitPromise: Promise<void> | null = null

/**
 * Get VocabularyService for enhanced NLP
 */
async function getVocabularyServiceForTagging() {
  if (_vocabularyService) {
    return _vocabularyService
  }

  if (!_serviceInitPromise) {
    _serviceInitPromise = (async () => {
      try {
        const { getVocabularyService } = await import('../indexer/vocabularyService')
        _vocabularyService = getVocabularyService()
        await _vocabularyService.initialize()
      } catch (err) {
        console.warn('[autoTagging] VocabularyService not available:', err)
        _vocabularyService = null
      }
    })()
  }

  await _serviceInitPromise
  return _vocabularyService
}

// ═══════════════════════════════════════════════════════════════════════════
// NLP-BASED TAGGING (Statistical, Offline)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate tag suggestions using enhanced NLP (async)
 *
 * Uses VocabularyService for:
 * - Semantic embedding similarity
 * - WordNet synonyms (server-side)
 * - Taxonomy phonetic matching
 *
 * Falls back to basic suggestTagsNLP if service unavailable.
 */
export async function suggestTagsNLPAsync(
  content: string,
  context: TagContext
): Promise<TagSuggestion[]> {
  const service = await getVocabularyServiceForTagging()

  if (!service) {
    // Fallback to basic NLP
    return suggestTagsNLP(content, context)
  }

  const config = { ...DEFAULT_AUTO_TAG_CONFIG, ...context.config }
  const existingSet = new Set(context.existingTags.map(t => t.toLowerCase()))
  const suggestions: TagSuggestion[] = []

  try {
    // 1. Use VocabularyService for classification
    const classification = await service.classify(content)

    // 2. Add classified subjects as tags
    for (const subject of classification.subjects) {
      const tag = normalizeTag(subject)
      const confidence = classification.confidence[subject] || 0.7
      suggestions.push({
        tag,
        confidence,
        source: existingSet.has(tag) ? 'existing' : 'nlp',
        reasoning: `Classified subject: ${subject}`
      })
    }

    // 3. Add classified topics as tags
    for (const topic of classification.topics) {
      const tag = normalizeTag(topic)
      const confidence = classification.confidence[topic] || 0.6
      suggestions.push({
        tag,
        confidence,
        source: existingSet.has(tag) ? 'existing' : 'nlp',
        reasoning: `Classified topic: ${topic}`
      })
    }

    // 4. Add classified skills as tags
    for (const skill of classification.skills.slice(0, 5)) {
      const tag = normalizeTag(skill)
      suggestions.push({
        tag,
        confidence: 0.8,
        source: existingSet.has(tag) ? 'existing' : 'nlp',
        reasoning: `Classified skill: ${skill}`
      })
    }

    // 5. Find semantically similar existing tags
    for (const keyword of classification.keywords.slice(0, 5)) {
      const similar = await service.findSimilarTerms(keyword, undefined, 3)
      for (const match of similar) {
        if (match.score > 0.7 && existingSet.has(match.term.toLowerCase())) {
          suggestions.push({
            tag: match.term,
            confidence: match.score,
            source: 'existing',
            reasoning: `Semantically similar to "${keyword}"`
          })
        }
      }
    }

    // 6. Deduplicate and sort
    const seen = new Set<string>()
    const deduped = suggestions.filter(s => {
      if (seen.has(s.tag)) return false
      seen.add(s.tag)
      return true
    })

    // Prioritize existing tags
    if (config.preferExistingTags) {
      deduped.sort((a, b) => {
        if (a.source === 'existing' && b.source !== 'existing') return -1
        if (b.source === 'existing' && a.source !== 'existing') return 1
        return b.confidence - a.confidence
      })
    } else {
      deduped.sort((a, b) => b.confidence - a.confidence)
    }

    const threshold = config.confidenceThreshold || 0.6
    const maxTags = config.maxNewTagsPerDocument || 10

    return deduped
      .filter(s => s.confidence >= threshold)
      .slice(0, maxTags)

  } catch (err) {
    console.warn('[autoTagging] Enhanced NLP failed, using basic:', err)
    return suggestTagsNLP(content, context)
  }
}

/**
 * Generate tag suggestions using statistical NLP (no LLM)
 * Fast, deterministic, works offline
 */
export function suggestTagsNLP(
  content: string,
  context: TagContext
): TagSuggestion[] {
  const suggestions: TagSuggestion[] = []
  const config = { ...DEFAULT_AUTO_TAG_CONFIG, ...context.config }
  const existingSet = new Set(context.existingTags.map(t => t.toLowerCase()))
  
  // 1. Extract entities and keywords
  const entities = extractEntities(content)
  const techEntities = extractTechEntities(content)
  const keywords = extractKeywords(content, 20)
  const bigrams = extractNgrams(content, 2).slice(0, 15)
  
  // 2. Score potential tags
  const candidates: Map<string, { score: number; source: 'existing' | 'nlp'; reason: string }> = new Map()
  
  // 2a. Technologies (high confidence)
  for (const tech of entities.technologies) {
    const tag = normalizeTag(tech)
    const isExisting = existingSet.has(tag)
    candidates.set(tag, {
      score: isExisting ? 0.95 : 0.85,
      source: isExisting ? 'existing' : 'nlp',
      reason: `Technology mentioned: ${tech}`
    })
  }
  
  // 2b. Concepts (medium-high confidence)
  for (const concept of entities.concepts) {
    const tag = normalizeTag(concept)
    const isExisting = existingSet.has(tag)
    candidates.set(tag, {
      score: isExisting ? 0.9 : 0.75,
      source: isExisting ? 'existing' : 'nlp',
      reason: `Concept identified: ${concept}`
    })
  }
  
  // 2c. Keywords that match existing tags (very high confidence)
  for (const kw of keywords) {
    const tag = normalizeTag(kw.word)
    if (existingSet.has(tag)) {
      const existing = candidates.get(tag)
      if (!existing || existing.score < 0.9) {
        candidates.set(tag, {
          score: 0.9 + (kw.score / 100), // Boost by keyword score
          source: 'existing',
          reason: `Keyword matches existing tag (score: ${kw.score.toFixed(2)})`
        })
      }
    }
  }
  
  // 2d. Bigrams that match existing tags
  for (const bigram of bigrams) {
    const tag = normalizeTag(bigram)
    if (existingSet.has(tag)) {
      candidates.set(tag, {
        score: 0.85,
        source: 'existing',
        reason: `Phrase matches existing tag: "${bigram}"`
      })
    }
  }
  
  // 2e. Hierarchy tags (from parent loom/weave)
  for (const htag of context.hierarchyTags) {
    const tag = normalizeTag(htag)
    if (!candidates.has(tag)) {
      candidates.set(tag, {
        score: 0.7,
        source: 'existing',
        reason: 'Inherited from parent hierarchy'
      })
    }
  }
  
  // 2f. Related document tags (if content mentions them)
  const contentLower = content.toLowerCase()
  for (const rtag of context.relatedTags) {
    const tag = normalizeTag(rtag)
    if (contentLower.includes(tag.replace(/-/g, ' ')) || contentLower.includes(tag)) {
      if (!candidates.has(tag)) {
        candidates.set(tag, {
          score: 0.65,
          source: 'existing',
          reason: 'Related document tag found in content'
        })
      }
    }
  }
  
  // 3. Hierarchy enforcement - filter out tags that conflict with subjects/topics
  const taxonomyConfig = context.taxonomyConfig || DEFAULT_TAXONOMY_CONFIG
  const existingSubjects = context.existingSubjects || []
  const existingTopics = context.existingTopics || []

  // Remove candidates that already exist as subjects or topics
  for (const [tag] of candidates) {
    const result = determineTaxonomyLevel(
      tag,
      'tag',
      existingSubjects,
      existingTopics,
      context.existingTags,
      taxonomyConfig
    )

    // If the term already exists at a higher level, remove it from candidates
    if (result.level === null) {
      candidates.delete(tag)
    }
  }

  // 4. Filter code artifacts and sort
  const threshold = config.confidenceThreshold || 0.6
  const maxTags = config.maxNewTagsPerDocument || 10

  // Remove code artifacts (single letters, keywords, etc)
  for (const [tag] of candidates) {
    if (isCodeArtifact(tag) || tag.length < 2) {
      candidates.delete(tag)
    }
  }

  // Prioritize existing tags if configured
  let sorted = Array.from(candidates.entries())
    .map(([tag, data]) => ({ tag, ...data }))
    .filter(t => t.score >= threshold)

  if (config.preferExistingTags) {
    sorted.sort((a, b) => {
      // Existing tags first, then by score
      if (a.source === 'existing' && b.source !== 'existing') return -1
      if (b.source === 'existing' && a.source !== 'existing') return 1
      return b.score - a.score
    })
  } else {
    sorted.sort((a, b) => b.score - a.score)
  }
  
  // 5. Convert to suggestions
  for (const item of sorted.slice(0, maxTags)) {
    suggestions.push({
      tag: item.tag,
      confidence: item.score,
      source: item.source === 'existing' ? 'existing' : 'nlp',
      reasoning: item.reason
    })
  }
  
  return suggestions
}

/**
 * Generate block-level tag suggestions using NLP
 */
export function suggestBlockTagsNLP(
  block: { content: string; type: string; headingText?: string },
  documentTags: string[],
  context: TagContext
): { tags: TagSuggestion[]; warrantsNewIllustration: boolean; illustrationReasoning: string } {
  const config = { ...DEFAULT_AUTO_TAG_CONFIG, ...context.config }
  
  // If block auto-tag is disabled, return empty
  if (!config.blockAutoTag) {
    return {
      tags: [],
      warrantsNewIllustration: false,
      illustrationReasoning: 'Block auto-tagging disabled'
    }
  }
  
  const docTagSet = new Set(documentTags.map(t => t.toLowerCase()))
  const existingSet = new Set(context.existingTags.map(t => t.toLowerCase()))
  
  // Extract entities from block
  const entities = extractEntities(block.content)
  const keywords = extractKeywords(block.content, 10)
  
  const suggestions: TagSuggestion[] = []
  
  // Only suggest tags that are NOT already in document tags
  for (const tech of entities.technologies) {
    const tag = normalizeTag(tech)
    if (!docTagSet.has(tag)) {
      suggestions.push({
        tag,
        confidence: existingSet.has(tag) ? 0.85 : 0.7,
        source: existingSet.has(tag) ? 'existing' : 'nlp',
        reasoning: `Block-specific technology: ${tech}`
      })
    }
  }
  
  for (const concept of entities.concepts) {
    const tag = normalizeTag(concept)
    if (!docTagSet.has(tag)) {
      suggestions.push({
        tag,
        confidence: existingSet.has(tag) ? 0.8 : 0.65,
        source: existingSet.has(tag) ? 'existing' : 'nlp',
        reasoning: `Block-specific concept: ${concept}`
      })
    }
  }
  
  // Limit to maxNewTagsPerBlock
  const maxTags = config.maxNewTagsPerBlock || 3
  const threshold = config.confidenceThreshold || 0.6
  
  const filtered = suggestions
    .filter(s => s.confidence >= threshold)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxTags)
  
  // Determine if block warrants new illustration
  const { warrants, reasoning } = determineIllustrationWorthiness(block, documentTags)
  
  return {
    tags: filtered,
    warrantsNewIllustration: warrants,
    illustrationReasoning: reasoning
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ILLUSTRATION WORTHINESS DETERMINATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine if a block warrants a new illustration
 * Uses heuristics to avoid unnecessary image generation
 */
export function determineIllustrationWorthiness(
  block: { content: string; type: string; headingText?: string },
  documentTags: string[]
): { warrants: boolean; reasoning: string } {
  const content = block.content.toLowerCase()
  const wordCount = block.content.split(/\s+/).length
  
  // 1. Block type heuristics
  if (block.type === 'code') {
    // Code blocks rarely need illustrations unless they're architecture/flow
    if (content.includes('class') && content.includes('diagram')) {
      return { warrants: true, reasoning: 'Code appears to describe a diagram or architecture' }
    }
    return { warrants: false, reasoning: 'Code block - typically doesn\'t need illustration' }
  }
  
  if (block.type === 'table') {
    // Tables are already visual
    return { warrants: false, reasoning: 'Table block - already visual representation' }
  }
  
  if (block.type === 'blockquote') {
    // Quotes rarely need illustrations
    return { warrants: false, reasoning: 'Blockquote - decorative, not conceptual' }
  }
  
  // 2. Content heuristics for paragraphs/headings
  
  // Check for visual/diagram indicators
  const visualIndicators = [
    'diagram', 'architecture', 'flow', 'process', 'workflow',
    'structure', 'hierarchy', 'tree', 'graph', 'network',
    'pipeline', 'stages', 'phases', 'components', 'layers',
    'relationship', 'connection', 'interaction', 'overview',
    'visualization', 'illustration', 'figure', 'chart'
  ]
  
  for (const indicator of visualIndicators) {
    if (content.includes(indicator)) {
      return { 
        warrants: true, 
        reasoning: `Contains visual concept indicator: "${indicator}"` 
      }
    }
  }
  
  // Check for conceptual introductions (new section)
  if (block.type === 'heading' && block.headingText) {
    const headingLower = block.headingText.toLowerCase()
    const conceptualHeadings = [
      'introduction', 'overview', 'architecture', 'design',
      'how it works', 'getting started', 'concepts', 'fundamentals'
    ]
    for (const ch of conceptualHeadings) {
      if (headingLower.includes(ch)) {
        return {
          warrants: true,
          reasoning: `Section heading suggests conceptual content: "${block.headingText}"`
        }
      }
    }
  }
  
  // Check for step-by-step or process descriptions
  const processIndicators = [
    'first,', 'second,', 'then,', 'next,', 'finally,',
    'step 1', 'step 2', 'phase 1', 'stage 1',
    'begins with', 'starts by', 'followed by'
  ]
  
  for (const pi of processIndicators) {
    if (content.includes(pi)) {
      return {
        warrants: true,
        reasoning: 'Contains process/step-by-step description'
      }
    }
  }
  
  // 3. Short blocks rarely need illustrations
  if (wordCount < 30) {
    return { warrants: false, reasoning: 'Block too short for illustration' }
  }
  
  // 4. Default: don't illustrate
  return { 
    warrants: false, 
    reasoning: 'Block is primarily textual without clear visual concepts' 
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalize a tag to kebab-case
 */
function normalizeTag(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Check if a potential new tag is "worthy" of creation
 * A worthy tag should be likely to apply to multiple documents
 */
export function isTagWorthy(
  tag: string,
  existingTags: string[],
  documentCount: number = 100
): { worthy: boolean; reason: string } {
  const normalized = normalizeTag(tag)

  // Too short - must be at least 2 characters
  if (normalized.length < 2) {
    return { worthy: false, reason: 'Tag too short (min 2 chars)' }
  }

  // Filter out code artifacts (variables, keywords, etc)
  if (isCodeArtifact(normalized)) {
    return { worthy: false, reason: 'Looks like code artifact (variable/keyword)' }
  }

  // Too long
  if (normalized.length > 50) {
    return { worthy: false, reason: 'Tag too long' }
  }

  // Too many words (probably a phrase, not a tag)
  if (normalized.split('-').length > 4) {
    return { worthy: false, reason: 'Tag has too many words - use a more concise term' }
  }

  // Check for similar existing tags
  for (const existing of existingTags) {
    const existingNorm = normalizeTag(existing)

    // Exact match
    if (existingNorm === normalized) {
      return { worthy: false, reason: `Duplicate of existing tag: ${existing}` }
    }

    // Substring match (e.g., "react" vs "react-hooks")
    if (existingNorm.includes(normalized) || normalized.includes(existingNorm)) {
      // Allow if significantly different
      if (Math.abs(existingNorm.length - normalized.length) < 3) {
        return { worthy: false, reason: `Too similar to existing tag: ${existing}` }
      }
    }

    // Levenshtein distance check for typos/variants
    if (levenshteinDistance(existingNorm, normalized) <= 2) {
      return { worthy: false, reason: `Possible variant of existing tag: ${existing}` }
    }
  }

  // Common unworthy patterns
  const unworthyPatterns = [
    /^the-/, /^a-/, /^an-/,           // Articles
    /^my-/, /^your-/, /^our-/,        // Possessives
    /^this-/, /^that-/,               // Demonstratives
    /-thing$/, /-stuff$/,             // Vague
    /^todo-?/, /^fixme-?/, /^note-?/, // Dev notes
  ]

  for (const pattern of unworthyPatterns) {
    if (pattern.test(normalized)) {
      return { worthy: false, reason: 'Tag matches unworthy pattern' }
    }
  }

  return { worthy: true, reason: 'Tag appears worthy of creation' }
}

/**
 * Simple Levenshtein distance for typo detection
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  
  const matrix: number[][] = []
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[b.length][a.length]
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Auto-tag a document and its blocks
 * Main entry point for the auto-tagging system
 *
 * Enhanced with:
 * - Block worthiness calculation (topic shift + entity density + semantic novelty)
 * - Tag bubbling from blocks to document level
 * - LLM-first with multi-model fallback
 */
export async function autoTagDocument(
  content: string,
  blocks: Array<{ content: string; type: string; id: string; headingText?: string }>,
  context: TagContext,
  options?: {
    llmCallback?: (prompt: string, systemPrompt: string) => Promise<string>
    embeddingCallback?: (text: string) => Promise<number[]>
  }
): Promise<AutoTagResult> {
  const config = mergeAutoTagConfig(context.config)
  const llmCallback = options?.llmCallback
  const embeddingCallback = options?.embeddingCallback

  // Initialize stats
  const stats = {
    totalBlocks: blocks.length,
    worthyBlocks: 0,
    taggedBlocks: 0,
    totalBlockTags: 0,
    bubbledTagCount: 0
  }

  // If document auto-tag is disabled, return empty
  if (!config.documentAutoTag) {
    return {
      documentTags: [],
      blockTags: new Map(),
      reasoning: 'Document auto-tagging disabled',
      worthinessResults: new Map(),
      bubbledTags: [],
      method: 'nlp',
      stats
    }
  }

  let documentTags: TagSuggestion[]
  let reasoning: string
  let method: 'llm' | 'nlp' | 'hybrid' = 'nlp'

  // Use LLM if configured and callback provided
  if (config.useLLM && llmCallback) {
    try {
      const prompt = buildDocumentTagPrompt(
        content,
        context.metadata.title || '',
        context.existingTags,
        context.relatedTags,
        config.maxNewTagsPerDocument || 10
      )

      const response = await llmCallback(prompt, DOCUMENT_TAGGING_SYSTEM_PROMPT)
      const parsed = JSON.parse(response)

      documentTags = parsed.tags.map((t: any) => ({
        tag: normalizeTag(t.tag),
        confidence: t.confidence,
        source: t.source === 'existing' ? 'existing' : 'llm',
        reasoning: t.reasoning
      }))
      reasoning = parsed.reasoning
      method = 'llm'
    } catch (error) {
      // Fallback to NLP on LLM failure
      console.warn('[AutoTag] LLM failed, falling back to NLP:', error)
      documentTags = suggestTagsNLP(content, context)
      reasoning = 'LLM failed, used NLP fallback'
      method = 'hybrid'
    }
  } else {
    // NLP-only mode
    documentTags = suggestTagsNLP(content, context)
    reasoning = 'NLP-based tagging (no LLM)'
    method = 'nlp'
  }

  // Block-level tagging with worthiness calculation
  const blockTags = new Map<string, TagSuggestion[]>()
  const worthinessResults = new Map<string, BlockWorthinessResult>()

  if (config.blockAutoTag && blocks.length > 0) {
    const docTagStrings = documentTags.map(t => t.tag)

    // Convert blocks to ParsedBlock format for worthiness calculation
    const parsedBlocks: ParsedBlock[] = blocks.map((b, idx) => ({
      id: b.id,
      type: b.type as any,
      content: b.content,
      startLine: idx * 10, // Approximate
      endLine: (idx + 1) * 10,
      headingLevel: b.type === 'heading' ? 2 : undefined,
    }))

    // Calculate worthiness for all blocks
    const allWorthiness = await calculateAllBlockWorthiness(
      parsedBlocks,
      content,
      docTagStrings,
      config,
      embeddingCallback
    )

    // Copy to our results map and count worthy blocks
    for (const [blockId, result] of allWorthiness) {
      worthinessResults.set(blockId, result)
      if (result.worthy) {
        stats.worthyBlocks++
      }
    }

    // Only tag worthy blocks
    const worthyBlocks = filterWorthyBlocks(parsedBlocks, allWorthiness)

    for (const block of worthyBlocks) {
      const originalBlock = blocks.find(b => b.id === block.id)
      if (!originalBlock) continue

      const blockResult = suggestBlockTagsNLP(originalBlock, docTagStrings, context)
      if (blockResult.tags.length > 0) {
        blockTags.set(block.id, blockResult.tags)
        stats.taggedBlocks++
        stats.totalBlockTags += blockResult.tags.length
      }
    }
  }

  // Tag bubbling: aggregate common block tags to document level
  let bubbledTags: BubbledTag[] = []

  if (config.enableTagBubbling && blockTags.size > 0) {
    // Create BlockSummary-like objects for bubbling
    const blockSummaries: BlockSummary[] = []
    for (const [blockId, tags] of blockTags) {
      blockSummaries.push({
        blockId,
        blockType: 'paragraph',
        startLine: 0,
        endLine: 0,
        extractive: '',
        tags: tags.map(t => t.tag),
        suggestedTags: tags.map(t => ({
          tag: t.tag,
          confidence: t.confidence,
          source: t.source,
          reasoning: t.reasoning
        }))
      })
    }

    const bubblingResult = processTagBubbling(
      blockSummaries,
      documentTags.map(t => t.tag),
      config
    )

    bubbledTags = bubblingResult.bubbledTags
    stats.bubbledTagCount = bubbledTags.length

    // Add bubbled tags to document tags
    if (bubblingResult.applied) {
      for (const bubbled of bubbledTags) {
        documentTags.push({
          tag: bubbled.tag,
          confidence: bubbled.confidence,
          source: 'nlp', // Bubbled tags come from NLP analysis
          reasoning: `Bubbled from ${bubbled.blockCount} blocks`
        })
      }
      reasoning += ` | Bubbled ${bubbledTags.length} tag(s) from blocks`
    }
  }

  return {
    documentTags,
    blockTags,
    reasoning,
    worthinessResults,
    bubbledTags,
    method,
    stats
  }
}

/**
 * Get illustration suggestion for reader mode
 * Determines which illustration to show for current block
 */
export function getBlockIllustration(
  currentBlock: BlockSummary,
  previousBlocks: BlockSummary[],
  defaultPlaceholder?: string
): { src: string | null; isPlaceholder: boolean; blockId: string | null } {
  // Check if current block has its own illustration
  if (currentBlock.illustrations && currentBlock.illustrations.length > 0) {
    const activeIllustration = currentBlock.illustrations.find(i => i.showForBlock !== false)
    if (activeIllustration) {
      return {
        src: activeIllustration.src,
        isPlaceholder: false,
        blockId: currentBlock.blockId
      }
    }
  }

  // If current block doesn't warrant new illustration, find previous one
  if (!currentBlock.warrantsNewIllustration) {
    // Walk backwards through previous blocks
    for (let i = previousBlocks.length - 1; i >= 0; i--) {
      const prevBlock = previousBlocks[i]
      if (prevBlock.illustrations && prevBlock.illustrations.length > 0) {
        const illustration = prevBlock.illustrations.find(i => i.showForBlock !== false)
        if (illustration) {
          return {
            src: illustration.src,
            isPlaceholder: false,
            blockId: prevBlock.blockId
          }
        }
      }
    }
  }

  // No illustration found - return placeholder or null
  return {
    src: defaultPlaceholder || null,
    isPlaceholder: true,
    blockId: null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY SUGGESTION (Auto-Categorization)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Known weave/loom categories with keywords for matching
 */
const KNOWN_CATEGORIES: Array<{
  path: string
  keywords: string[]
  description: string
}> = [
  {
    path: 'weaves/wiki/tutorials/',
    keywords: ['tutorial', 'guide', 'how-to', 'learn', 'step-by-step', 'getting started', 'introduction'],
    description: 'Tutorials and learning guides'
  },
  {
    path: 'weaves/wiki/reference/',
    keywords: ['api', 'reference', 'documentation', 'spec', 'specification', 'interface', 'method'],
    description: 'API and technical reference'
  },
  {
    path: 'weaves/wiki/concepts/',
    keywords: ['concept', 'theory', 'principle', 'fundamental', 'architecture', 'design', 'pattern'],
    description: 'Conceptual explanations and theory'
  },
  {
    path: 'weaves/wiki/best-practices/',
    keywords: ['best practice', 'recommendation', 'tip', 'guideline', 'convention', 'standard'],
    description: 'Best practices and recommendations'
  },
  {
    path: 'weaves/notes/',
    keywords: ['note', 'memo', 'thought', 'idea', 'draft', 'scratch'],
    description: 'Personal notes and ideas'
  },
  {
    path: 'weaves/projects/',
    keywords: ['project', 'implementation', 'build', 'create', 'develop', 'app', 'application'],
    description: 'Project documentation'
  },
  {
    path: 'weaves/research/',
    keywords: ['research', 'study', 'analysis', 'investigation', 'exploration', 'experiment'],
    description: 'Research and analysis'
  },
]

/**
 * Suggest a category (path) for a strand based on content analysis
 * Uses NLP to match content against known categories
 */
export async function suggestCategory(
  content: string,
  metadata: StrandMetadata,
  existingPaths: string[],
  config: Partial<CategorizationConfig> = {}
): Promise<CategorySuggestion> {
  const fullConfig = { ...DEFAULT_CATEGORIZATION_CONFIG, ...config }
  const contentLower = content.toLowerCase()
  const titleLower = (metadata.title || '').toLowerCase()

  // 1. Extract entities and keywords for matching
  const entities = extractEntities(content)
  const keywords = extractKeywords(content, 30)
  const keywordSet = new Set(keywords.map(k => k.word.toLowerCase()))

  // 2. Score each known category
  const scores: Array<{ path: string; score: number; matches: string[]; description: string }> = []

  for (const category of KNOWN_CATEGORIES) {
    // Skip excluded paths
    if (fullConfig.excludedPaths.some(ep => category.path.startsWith(ep))) {
      continue
    }

    let score = 0
    const matches: string[] = []

    // Check keyword matches
    for (const kw of category.keywords) {
      if (contentLower.includes(kw)) {
        score += 0.15
        matches.push(`content contains "${kw}"`)
      }
      if (titleLower.includes(kw)) {
        score += 0.25 // Title matches are weighted higher
        matches.push(`title contains "${kw}"`)
      }
    }

    // Check if extracted keywords overlap with category keywords
    for (const catKw of category.keywords) {
      if (keywordSet.has(catKw)) {
        score += 0.1
        matches.push(`keyword match: "${catKw}"`)
      }
    }

    // Check taxonomy topics from metadata
    if (metadata.taxonomy?.topics) {
      for (const topic of metadata.taxonomy.topics) {
        const topicLower = topic.toLowerCase()
        if (category.keywords.some(kw => topicLower.includes(kw) || kw.includes(topicLower))) {
          score += 0.2
          matches.push(`taxonomy topic: "${topic}"`)
        }
      }
    }

    // Check tags from metadata
    if (metadata.tags) {
      for (const tag of metadata.tags) {
        const tagLower = tag.toLowerCase()
        if (category.keywords.some(kw => tagLower.includes(kw) || kw.includes(tagLower))) {
          score += 0.15
          matches.push(`tag match: "${tag}"`)
        }
      }
    }

    if (score > 0) {
      scores.push({
        path: category.path,
        score: Math.min(score, 1), // Cap at 1.0
        matches,
        description: category.description
      })
    }
  }

  // 3. Also check existing paths for matches
  for (const existingPath of existingPaths) {
    // Skip inbox and excluded paths
    if (fullConfig.excludedPaths.some(ep => existingPath.startsWith(ep))) {
      continue
    }

    // Extract path segments for matching
    const segments = existingPath.split('/').filter(s => s && s !== 'weaves')
    let score = 0
    const matches: string[] = []

    for (const segment of segments) {
      const segmentLower = segment.toLowerCase().replace(/-/g, ' ')

      // Check if content mentions the path segment
      if (contentLower.includes(segmentLower)) {
        score += 0.2
        matches.push(`content references path: "${segment}"`)
      }

      // Check if any entity matches the segment
      for (const tech of entities.technologies) {
        if (tech.toLowerCase() === segmentLower || segmentLower.includes(tech.toLowerCase())) {
          score += 0.3
          matches.push(`technology matches path: "${tech}" -> "${segment}"`)
        }
      }
    }

    if (score > 0 && !scores.some(s => s.path === existingPath)) {
      scores.push({
        path: existingPath.endsWith('/') ? existingPath : existingPath + '/',
        score: Math.min(score, 1),
        matches,
        description: `Existing category: ${existingPath}`
      })
    }
  }

  // 4. Sort by score and prepare result
  scores.sort((a, b) => b.score - a.score)

  if (scores.length === 0) {
    // No matches - suggest staying in inbox
    return {
      path: fullConfig.inboxPath,
      confidence: 0.3,
      reasoning: 'No category matches found. Content does not clearly fit known categories.',
      alternatives: []
    }
  }

  const best = scores[0]
  const alternatives = scores.slice(1, 4).map(s => ({
    path: s.path,
    confidence: s.score,
    reasoning: s.matches.join('; ')
  }))

  return {
    path: best.path,
    confidence: best.score,
    reasoning: `${best.description}. Matches: ${best.matches.slice(0, 3).join('; ')}`,
    alternatives
  }
}

/**
 * LLM prompt for category suggestion (used when NLP confidence is low)
 */
export const CATEGORY_SUGGESTION_SYSTEM_PROMPT = `You are a knowledge organization expert. Your task is to suggest the best category/path for a document.

## AVAILABLE CATEGORIES
You will be given a list of existing paths. Choose the most appropriate one, or suggest a new sub-path if needed.

## OUTPUT FORMAT
Respond with JSON only:
{
  "path": "weaves/wiki/tutorials/",
  "confidence": 0.85,
  "reasoning": "Brief explanation...",
  "alternatives": [
    { "path": "weaves/wiki/concepts/", "confidence": 0.6, "reasoning": "..." }
  ]
}

## RULES
1. Prefer existing paths over creating new ones
2. Be specific but not overly narrow
3. Consider the document's primary purpose
4. Confidence should reflect how clearly the content fits`

/**
 * Build prompt for LLM category suggestion
 */
export function buildCategorySuggestionPrompt(
  content: string,
  metadata: StrandMetadata,
  existingPaths: string[]
): string {
  return `## EXISTING PATHS
${existingPaths.slice(0, 50).map(p => `- ${p}`).join('\n')}

## DOCUMENT TITLE
${metadata.title || '(untitled)'}

## DOCUMENT TAGS
${Array.isArray(metadata.tags) ? metadata.tags.join(', ') : metadata.tags || '(none)'}

## DOCUMENT CONTENT (first 4000 chars)
${content.slice(0, 4000)}

## TASK
Suggest the best category path for this document. Consider its topic, purpose, and how it relates to the existing structure.`
}

// ═══════════════════════════════════════════════════════════════════════════
// ILLUSTRATION WORTHINESS ANALYSIS (LLM-ENHANCED)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Worthiness result with LLM enhancement
 */
export interface WorthinessResult {
  warrants: boolean
  confidence: number  // 0-1
  reasoning: string
  visualIndicators: string[]
  recommendedAction: 'generate' | 'skip' | 'review'
  method: 'llm' | 'nlp'
  suggestedType?: 'scene' | 'character' | 'diagram' | 'process' | 'setting'
}

/**
 * Analyze content worthiness with optional LLM enhancement
 */
export async function analyzeContentWorthiness(
  content: string,
  contentType: 'chunk' | 'block',
  options?: {
    useLLM?: boolean
    confidenceThreshold?: number
    checkIllustrationPoints?: number[]
    llmProvider?: 'auto' | 'claude' | 'openai' | 'nlp'
  }
): Promise<WorthinessResult> {
  const { useLLM = true, confidenceThreshold = 0.6, llmProvider = 'auto' } = options || {}

  // Skip LLM entirely if provider is 'nlp'
  if (llmProvider === 'nlp') {
    // Fall through to NLP heuristics below
  } else if (useLLM) {
    // Try LLM if available and requested
    try {
      const { llm, z, isLLMAvailable } = await import('../llm')

      if (isLLMAvailable()) {
        const schema = z.object({
          warrants: z.boolean(),
          confidence: z.number().min(0).max(1),
          reasoning: z.string(),
          visualConcepts: z.array(z.string()),
          suggestedType: z.enum(['scene', 'character', 'diagram', 'process', 'setting']).optional(),
        })

        // Map llmProvider to actual provider name with model
        const providerConfig = llmProvider === 'claude'
          ? { provider: 'anthropic' as const, model: 'claude-3-5-sonnet-20241022' }
          : llmProvider === 'openai'
          ? { provider: 'openai' as const, model: 'gpt-4o-mini' }
          : undefined // 'auto' - let llm choose

        const result = await llm.generate({
          prompt: `Evaluate if this content would benefit from an illustration.

Consider:
- Does it describe visual concepts, scenes, characters, or settings?
- Does it explain a process, workflow, or architecture that could be visualized?
- Would a diagram, chart, or illustration help understanding?
- Is it primarily abstract/textual discussion that doesn't need visuals?

Content:
${content.slice(0, 2000)}

Respond with your evaluation.`,
          schema,
          maxTokens: 512,
          ...(providerConfig && { model: providerConfig }),
        })

        const recommendedAction = result.data.confidence >= confidenceThreshold
          ? (result.data.warrants ? 'generate' : 'skip')
          : 'review'

        return {
          warrants: result.data.warrants,
          confidence: result.data.confidence,
          reasoning: result.data.reasoning,
          visualIndicators: result.data.visualConcepts,
          recommendedAction,
          method: 'llm',
          suggestedType: result.data.suggestedType,
        }
      }
    } catch (error) {
      console.warn('[autoTagging] LLM worthiness check failed, using NLP:', error)
    }
  }

  // Fall back to NLP heuristics
  const nlpResult = determineIllustrationWorthiness(
    { content, type: contentType === 'chunk' ? 'paragraph' : 'heading' },
    []
  )

  const wordCount = content.split(/\s+/).length
  const confidence = wordCount < 30 ? 0.3 : (nlpResult.warrants ? 0.7 : 0.5)

  // Determine visual indicators from NLP
  const visualIndicators: string[] = []
  const lower = content.toLowerCase()

  const indicators = [
    'diagram', 'architecture', 'flow', 'process', 'workflow',
    'structure', 'hierarchy', 'scene', 'character', 'setting',
  ]

  for (const indicator of indicators) {
    if (lower.includes(indicator)) {
      visualIndicators.push(indicator)
    }
  }

  return {
    warrants: nlpResult.warrants,
    confidence,
    reasoning: nlpResult.reasoning,
    visualIndicators,
    recommendedAction: confidence >= confidenceThreshold
      ? (nlpResult.warrants ? 'generate' : 'skip')
      : 'review',
    method: 'nlp',
  }
}

/**
 * Analyze multiple chunks for worthiness
 */
export async function analyzeMultipleChunks(
  chunks: Array<{ id: string; content: string; illustrationPoints?: number[] }>,
  options?: {
    granularity?: 'chunk' | 'block'
    confidenceThreshold?: number
    useLLM?: boolean
    llmProvider?: 'auto' | 'claude' | 'openai' | 'nlp'
  }
): Promise<Map<string, WorthinessResult>> {
  const {
    granularity = 'chunk',
    confidenceThreshold = 0.6,
    useLLM = true,
    llmProvider = 'auto'
  } = options || {}

  const results = new Map<string, WorthinessResult>()

  // Process chunks sequentially to avoid rate limits
  for (const chunk of chunks) {
    const result = await analyzeContentWorthiness(
      chunk.content,
      granularity,
      { useLLM, confidenceThreshold, llmProvider }
    )

    results.set(chunk.id, result)
  }

  return results
}






