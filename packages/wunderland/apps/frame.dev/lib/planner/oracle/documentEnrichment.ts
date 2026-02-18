/**
 * Document Enrichment Module for Oracle AI Assistant
 *
 * Extends Oracle with Embark-style document enrichment commands:
 * - Entity extraction and mention creation
 * - Tag suggestion and auto-tagging
 * - Category suggestions
 * - Formula evaluation
 * - Related document discovery
 * - View suggestions (map, calendar, table)
 *
 * @module lib/planner/oracle/documentEnrichment
 */

import type { OracleAction, OracleActionResult, OracleActionType } from './actions'

// ═══════════════════════════════════════════════════════════════════════════
// ENRICHMENT ACTION TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extended action types for document enrichment
 */
export type EnrichmentActionType =
  | 'enrich_document'       // Full document enrichment
  | 'extract_mentions'      // Extract @mentions from content
  | 'suggest_tags'          // Suggest tags for document
  | 'suggest_category'      // Suggest category for document
  | 'find_related'          // Find related documents
  | 'evaluate_formula'      // Evaluate a formula expression
  | 'suggest_views'         // Suggest appropriate views
  | 'create_mention'        // Create a new mention entity
  | 'resolve_mention'       // Resolve an existing mention
  | 'analyze_document'      // Deep document analysis

/**
 * All Oracle action types including enrichment
 */
export type ExtendedOracleActionType = OracleActionType | EnrichmentActionType

/**
 * Enrichment-specific action parameters
 */
export interface EnrichmentActionParams {
  // Document context
  strandPath?: string
  strandContent?: string
  strandTitle?: string
  blockId?: string
  blockContent?: string

  // Mention parameters
  mentionText?: string
  mentionType?: 'place' | 'date' | 'person' | 'strand' | 'event' | 'project'

  // Formula parameters
  formulaExpression?: string

  // Search parameters
  searchQuery?: string
  searchLimit?: number

  // View parameters
  viewType?: 'map' | 'calendar' | 'table' | 'list' | 'chart'

  // Analysis options
  includeSemantics?: boolean
  includeRelationships?: boolean
  includeFormulas?: boolean
}

/**
 * Enrichment action result with typed data
 */
export interface EnrichmentActionResult extends OracleActionResult {
  data?: EnrichmentResultData
}

/**
 * Typed enrichment result data
 */
export type EnrichmentResultData =
  | ExtractedMentionsData
  | SuggestedTagsData
  | SuggestedCategoryData
  | RelatedDocumentsData
  | FormulaResultData
  | SuggestedViewsData
  | DocumentAnalysisData

export interface ExtractedMentionsData {
  type: 'mentions'
  mentions: Array<{
    text: string
    entityType: string
    resolved: boolean
    properties?: Record<string, unknown>
  }>
  count: number
}

export interface SuggestedTagsData {
  type: 'tags'
  suggested: string[]
  fromContent: string[]
  fromHierarchy: string[]
  fromEntities: string[]
}

export interface SuggestedCategoryData {
  type: 'category'
  primary: {
    path: string
    confidence: number
    reasoning: string
  }
  alternatives: Array<{
    path: string
    confidence: number
    reasoning: string
  }>
  suggestedTags: string[]
}

export interface RelatedDocumentsData {
  type: 'related'
  documents: Array<{
    path: string
    title: string
    relevance: number
    relationship: 'prerequisite' | 'reference' | 'sibling' | 'child' | 'seeAlso'
    reason: string
  }>
}

export interface FormulaResultData {
  type: 'formula'
  expression: string
  result: unknown
  resultType: 'number' | 'string' | 'date' | 'object' | 'array' | 'error'
  computedAt: string
}

export interface SuggestedViewsData {
  type: 'views'
  suggestions: Array<{
    viewType: 'map' | 'calendar' | 'table' | 'list' | 'chart'
    confidence: number
    reason: string
    dataPoints: number
    sampleData?: unknown[]
  }>
}

export interface DocumentAnalysisData {
  type: 'analysis'
  entities: Record<string, string[]>
  contentType: string
  difficulty: string
  keyPhrases: string[]
  internalLinks: string[]
  externalDomains: string[]
  healthScore: number
  suggestions: string[]
}

// ═══════════════════════════════════════════════════════════════════════════
// ENRICHMENT ACTION EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Execute a document enrichment action
 */
export async function executeEnrichmentAction(
  action: OracleAction & { type: EnrichmentActionType },
): Promise<EnrichmentActionResult> {
  const params = action.params as EnrichmentActionParams

  try {
    switch (action.type) {
      case 'enrich_document':
        return await enrichDocument(params)
      case 'extract_mentions':
        return await extractMentions(params)
      case 'suggest_tags':
        return await suggestTagsAction(params)
      case 'suggest_category':
        return await suggestCategoryAction(params)
      case 'find_related':
        return await findRelatedDocuments(params)
      case 'evaluate_formula':
        return await evaluateFormulaAction(params)
      case 'suggest_views':
        return await suggestViewsAction(params)
      case 'create_mention':
        return await createMentionAction(params)
      case 'resolve_mention':
        return await resolveMentionAction(params)
      case 'analyze_document':
        return await analyzeDocumentAction(params)
      default:
        return {
          success: false,
          message: `Unknown enrichment action: ${action.type}`,
          error: 'UNKNOWN_ACTION',
        }
    }
  } catch (error) {
    return {
      success: false,
      message: `Enrichment action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: 'EXECUTION_ERROR',
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Full document enrichment - combines multiple analysis steps
 */
async function enrichDocument(params: EnrichmentActionParams): Promise<EnrichmentActionResult> {
  const { strandContent, strandPath, strandTitle } = params

  if (!strandContent) {
    return {
      success: false,
      message: 'Document content is required for enrichment',
      error: 'MISSING_CONTENT',
    }
  }

  // Lazy import to avoid circular dependencies
  const { extractEntitiesAsync, suggestTags, classifyContentType, analyzeReadingLevel, calculateContentHealth } = await import('@/lib/nlp')
  const { suggestCategoryWithContext, parseDocumentHierarchy, analyzeDocumentRelationships, analyzeDocumentSemantics } = await import('@/lib/categorization/contextAwareCategorization')
  const { DEFAULT_CONFIG } = await import('@/lib/categorization/algorithm')

  // Extract entities
  const entities = await extractEntitiesAsync(strandContent)

  // Suggest tags
  const suggestedTags = suggestTags(strandContent)

  // Classify content
  const { primary: contentType } = classifyContentType(strandContent)
  const { level: difficulty } = analyzeReadingLevel(strandContent)

  // Calculate health
  const health = calculateContentHealth(strandContent, { title: strandTitle })

  // Suggest category if path provided
  let categorySuggestion = null
  if (strandPath) {
    const hierarchy = parseDocumentHierarchy(strandPath)
    const relationships = analyzeDocumentRelationships(strandContent, strandPath, [])
    const semantics = analyzeDocumentSemantics(strandContent)

    categorySuggestion = suggestCategoryWithContext({
      path: strandPath,
      title: strandTitle || 'Untitled',
      content: strandContent,
      config: DEFAULT_CONFIG,
      hierarchy,
      relationships,
      semantics,
      existingIndex: [],
    })
  }

  // Build enrichment summary
  const enrichments: string[] = []

  if (entities.technologies.length > 0) {
    enrichments.push(`${entities.technologies.length} technologies detected`)
  }
  if (entities.concepts.length > 0) {
    enrichments.push(`${entities.concepts.length} concepts identified`)
  }
  if (suggestedTags.length > 0) {
    enrichments.push(`${suggestedTags.length} tags suggested`)
  }
  if (categorySuggestion) {
    enrichments.push(`Category: ${categorySuggestion.category} (${(categorySuggestion.confidence * 100).toFixed(0)}% confidence)`)
  }

  return {
    success: true,
    message: `Document enriched: ${enrichments.join(', ')}`,
    data: {
      type: 'analysis',
      entities: {
        technologies: entities.technologies,
        concepts: entities.concepts,
        people: entities.people,
        organizations: entities.organizations,
        locations: entities.locations,
      },
      contentType,
      difficulty,
      keyPhrases: suggestedTags.slice(0, 10),
      internalLinks: [],
      externalDomains: [],
      healthScore: health.score,
      suggestions: [
        ...health.issues,
        ...health.suggestions,
        ...(categorySuggestion ? [`Move to: ${categorySuggestion.category}`] : []),
      ],
    } as DocumentAnalysisData,
  }
}

/**
 * Extract mentions from content
 */
async function extractMentions(params: EnrichmentActionParams): Promise<EnrichmentActionResult> {
  const { strandContent, blockContent } = params
  const content = blockContent || strandContent

  if (!content) {
    return {
      success: false,
      message: 'Content is required for mention extraction',
      error: 'MISSING_CONTENT',
    }
  }

  const { extractEntitiesAsync } = await import('@/lib/nlp')

  const entities = await extractEntitiesAsync(content)

  // Convert entities to mention format
  const mentions: ExtractedMentionsData['mentions'] = []

  // People as @person mentions
  for (const person of entities.people) {
    mentions.push({
      text: `@${person}`,
      entityType: 'person',
      resolved: false,
      properties: { name: person },
    })
  }

  // Organizations as @org mentions
  for (const org of entities.organizations) {
    mentions.push({
      text: `@${org}`,
      entityType: 'organization',
      resolved: false,
      properties: { name: org },
    })
  }

  // Locations as @place mentions
  for (const location of entities.locations) {
    mentions.push({
      text: `@${location}`,
      entityType: 'place',
      resolved: false,
      properties: { name: location },
    })
  }

  // Dates as @date mentions
  for (const date of entities.dates) {
    mentions.push({
      text: `@${date}`,
      entityType: 'date',
      resolved: false,
      properties: { dateText: date },
    })
  }

  return {
    success: true,
    message: `Extracted ${mentions.length} potential mention${mentions.length === 1 ? '' : 's'}`,
    data: {
      type: 'mentions',
      mentions,
      count: mentions.length,
    } as ExtractedMentionsData,
  }
}

/**
 * Suggest tags for document
 */
async function suggestTagsAction(params: EnrichmentActionParams): Promise<EnrichmentActionResult> {
  const { strandContent, strandPath } = params

  if (!strandContent) {
    return {
      success: false,
      message: 'Content is required for tag suggestion',
      error: 'MISSING_CONTENT',
    }
  }

  const { suggestTags, extractTechEntities, parseHierarchyFromPath, inferTagsFromHierarchy } = await import('@/lib/nlp')

  // Get content-based tags
  const contentTags = suggestTags(strandContent)

  // Get entity-based tags
  const entities = extractTechEntities(strandContent)
  const entityTags = [
    ...(entities.languages || []),
    ...(entities.frameworks || []),
    ...(entities.databases || []),
    ...(entities.concepts || []),
  ].map(t => t.toLowerCase()).slice(0, 5)

  // Get hierarchy-based tags if path provided
  let hierarchyTags: string[] = []
  if (strandPath) {
    const hierarchy = parseHierarchyFromPath(strandPath)
    hierarchyTags = inferTagsFromHierarchy(hierarchy, [])
  }

  // Combine and deduplicate
  const allSuggested = [...new Set([...contentTags, ...entityTags, ...hierarchyTags])].slice(0, 15)

  return {
    success: true,
    message: `Suggested ${allSuggested.length} tag${allSuggested.length === 1 ? '' : 's'}`,
    data: {
      type: 'tags',
      suggested: allSuggested,
      fromContent: contentTags,
      fromHierarchy: hierarchyTags,
      fromEntities: entityTags,
    } as SuggestedTagsData,
  }
}

/**
 * Suggest category for document
 */
async function suggestCategoryAction(params: EnrichmentActionParams): Promise<EnrichmentActionResult> {
  const { strandContent, strandPath, strandTitle } = params

  if (!strandContent || !strandPath) {
    return {
      success: false,
      message: 'Content and path are required for category suggestion',
      error: 'MISSING_PARAMS',
    }
  }

  const { suggestCategoryWithContext, parseDocumentHierarchy, analyzeDocumentRelationships, analyzeDocumentSemantics } = await import('@/lib/categorization/contextAwareCategorization')
  const { DEFAULT_CONFIG } = await import('@/lib/categorization/algorithm')

  const hierarchy = parseDocumentHierarchy(strandPath)
  const relationships = analyzeDocumentRelationships(strandContent, strandPath, [])
  const semantics = analyzeDocumentSemantics(strandContent)

  const suggestion = suggestCategoryWithContext({
    path: strandPath,
    title: strandTitle || 'Untitled',
    content: strandContent,
    config: DEFAULT_CONFIG,
    hierarchy,
    relationships,
    semantics,
    existingIndex: [],
  })

  return {
    success: true,
    message: `Suggested category: ${suggestion.category} (${(suggestion.confidence * 100).toFixed(0)}% confidence)`,
    data: {
      type: 'category',
      primary: {
        path: suggestion.category,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
      },
      alternatives: suggestion.alternatives.map(alt => ({
        path: alt.category,
        confidence: alt.confidence,
        reasoning: alt.reasoning,
      })),
      suggestedTags: suggestion.suggestedTags || [],
    } as SuggestedCategoryData,
  }
}

/**
 * Find related documents
 */
async function findRelatedDocuments(params: EnrichmentActionParams): Promise<EnrichmentActionResult> {
  const { strandContent, strandPath, searchLimit = 10 } = params

  if (!strandContent) {
    return {
      success: false,
      message: 'Content is required to find related documents',
      error: 'MISSING_CONTENT',
    }
  }

  const { extractInternalLinks, extractTechEntities, suggestPrerequisites, parseHierarchyFromPath } = await import('@/lib/nlp')

  // Extract internal links (these are explicit relationships)
  const internalLinks = extractInternalLinks(strandContent)

  // Get tech entities for semantic matching
  const entities = extractTechEntities(strandContent)

  // Get prerequisite suggestions if path provided
  let prerequisites: RelatedDocumentsData['documents'] = []
  if (strandPath) {
    const hierarchy = parseHierarchyFromPath(strandPath)
    const prereqs = suggestPrerequisites(strandContent, hierarchy, [])

    prerequisites = prereqs.slice(0, 5).map(p => ({
      path: p.path,
      title: p.path.split('/').pop()?.replace('.md', '') || p.path,
      relevance: p.confidence,
      relationship: p.type as 'prerequisite' | 'reference',
      reason: p.reason,
    }))
  }

  // Build related documents list
  const related: RelatedDocumentsData['documents'] = [
    // Internal links as explicit references
    ...internalLinks.slice(0, 5).map(link => ({
      path: link,
      title: link.split('/').pop()?.replace('.md', '') || link,
      relevance: 0.9,
      relationship: 'reference' as const,
      reason: 'Explicitly linked in content',
    })),
    // Prerequisites
    ...prerequisites,
  ]

  // Deduplicate by path
  const uniqueRelated = related.reduce((acc, doc) => {
    if (!acc.some(d => d.path === doc.path)) {
      acc.push(doc)
    }
    return acc
  }, [] as typeof related)

  return {
    success: true,
    message: `Found ${uniqueRelated.length} related document${uniqueRelated.length === 1 ? '' : 's'}`,
    data: {
      type: 'related',
      documents: uniqueRelated.slice(0, searchLimit),
    } as RelatedDocumentsData,
  }
}

/**
 * Evaluate a formula expression
 */
async function evaluateFormulaAction(params: EnrichmentActionParams): Promise<EnrichmentActionResult> {
  const { formulaExpression, strandPath, blockId } = params

  if (!formulaExpression) {
    return {
      success: false,
      message: 'Formula expression is required',
      error: 'MISSING_FORMULA',
    }
  }

  const { evaluateFormula, createFormulaContext } = await import('@/lib/formulas')

  // Create context for formula evaluation
  const context = createFormulaContext({
    currentBlockId: blockId || 'temp-block',
    currentStrandPath: strandPath || 'temp/path',
  })

  // Evaluate the formula
  const formulaResult = await evaluateFormula(formulaExpression, context)

  // Map FormulaResult valueType to our resultType
  let resultType: FormulaResultData['resultType'] = 'string'
  if (!formulaResult.success) {
    resultType = 'error'
  } else {
    switch (formulaResult.valueType) {
      case 'number': resultType = 'number'; break
      case 'date': resultType = 'date'; break
      case 'array': resultType = 'array'; break
      case 'object': resultType = 'object'; break
      default: resultType = 'string'
    }
  }

  return {
    success: formulaResult.success,
    message: !formulaResult.success
      ? `Formula error: ${formulaResult.error || 'Unknown error'}`
      : `Formula evaluated: ${formulaResult.displayValue.slice(0, 100)}`,
    data: {
      type: 'formula',
      expression: formulaExpression,
      result: formulaResult.value,
      resultType,
      computedAt: new Date().toISOString(),
    } as FormulaResultData,
  }
}

/**
 * Suggest appropriate views for document content
 */
async function suggestViewsAction(params: EnrichmentActionParams): Promise<EnrichmentActionResult> {
  const { strandContent, strandPath } = params

  if (!strandContent) {
    return {
      success: false,
      message: 'Content is required for view suggestions',
      error: 'MISSING_CONTENT',
    }
  }

  const { extractEntitiesAsync, classifyContentType } = await import('@/lib/nlp')
  const { extractPlaceData, extractEventData, extractListData } = await import('@/lib/views/embeddableViews')

  const entities = await extractEntitiesAsync(strandContent)
  const suggestions: SuggestedViewsData['suggestions'] = []

  // Check for map-worthy content (places, locations)
  if (entities.locations.length > 0) {
    suggestions.push({
      viewType: 'map',
      confidence: Math.min(0.5 + entities.locations.length * 0.1, 0.95),
      reason: `${entities.locations.length} location${entities.locations.length === 1 ? '' : 's'} mentioned`,
      dataPoints: entities.locations.length,
      sampleData: entities.locations.slice(0, 3),
    })
  }

  // Check for calendar-worthy content (dates, events)
  if (entities.dates.length > 0) {
    suggestions.push({
      viewType: 'calendar',
      confidence: Math.min(0.5 + entities.dates.length * 0.1, 0.95),
      reason: `${entities.dates.length} date${entities.dates.length === 1 ? '' : 's'} mentioned`,
      dataPoints: entities.dates.length,
      sampleData: entities.dates.slice(0, 3),
    })
  }

  // Check for table-worthy content (structured data, lists)
  const listPatterns = (strandContent.match(/^[\s]*[-*+]\s+.+$/gm) || []).length
  const tablePatterns = (strandContent.match(/\|.*\|/g) || []).length

  if (listPatterns >= 3 || tablePatterns >= 2) {
    suggestions.push({
      viewType: 'table',
      confidence: Math.min(0.4 + (listPatterns + tablePatterns) * 0.05, 0.9),
      reason: `${listPatterns} list items, ${tablePatterns} table rows detected`,
      dataPoints: listPatterns + tablePatterns,
    })
  }

  // Check for list view (general content with some structure)
  if (entities.technologies.length >= 3 || entities.concepts.length >= 3) {
    suggestions.push({
      viewType: 'list',
      confidence: 0.6,
      reason: 'Multiple entities suitable for list display',
      dataPoints: entities.technologies.length + entities.concepts.length,
    })
  }

  // Check for chart-worthy content (numerical values)
  if (entities.values.length >= 3) {
    suggestions.push({
      viewType: 'chart',
      confidence: Math.min(0.4 + entities.values.length * 0.1, 0.85),
      reason: `${entities.values.length} numerical value${entities.values.length === 1 ? '' : 's'} detected`,
      dataPoints: entities.values.length,
      sampleData: entities.values.slice(0, 5),
    })
  }

  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence)

  return {
    success: true,
    message: suggestions.length > 0
      ? `Suggested ${suggestions.length} view type${suggestions.length === 1 ? '' : 's'}: ${suggestions.map(s => s.viewType).join(', ')}`
      : 'No specific views recommended for this content',
    data: {
      type: 'views',
      suggestions,
    } as SuggestedViewsData,
  }
}

/**
 * Create a new mention entity
 */
async function createMentionAction(params: EnrichmentActionParams): Promise<EnrichmentActionResult> {
  const { mentionText, mentionType, strandPath } = params

  if (!mentionText || !mentionType) {
    return {
      success: false,
      message: 'Mention text and type are required',
      error: 'MISSING_PARAMS',
    }
  }

  // For now, just return the structured mention data
  // In a full implementation, this would save to the database
  const mention = {
    text: `@${mentionText}`,
    entityType: mentionType,
    resolved: true,
    properties: {
      label: mentionText,
      type: mentionType,
      sourceStrandPath: strandPath,
      createdAt: new Date().toISOString(),
    },
  }

  return {
    success: true,
    message: `Created ${mentionType} mention: @${mentionText}`,
    data: {
      type: 'mentions',
      mentions: [mention],
      count: 1,
    } as ExtractedMentionsData,
  }
}

/**
 * Resolve an existing mention to its entity
 */
async function resolveMentionAction(params: EnrichmentActionParams): Promise<EnrichmentActionResult> {
  const { mentionText, strandPath } = params

  if (!mentionText) {
    return {
      success: false,
      message: 'Mention text is required',
      error: 'MISSING_PARAMS',
    }
  }

  const { resolveMention } = await import('@/lib/mentions/mentionResolver')

  const cleanText = mentionText.replace(/^@/, '')
  const resolved = await resolveMention(cleanText)

  if (!resolved) {
    return {
      success: false,
      message: `Could not resolve mention: @${cleanText}`,
      error: 'RESOLUTION_FAILED',
    }
  }

  return {
    success: true,
    message: `Resolved @${cleanText} as ${resolved.entity.type}`,
    data: {
      type: 'mentions',
      mentions: [{
        text: `@${cleanText}`,
        entityType: resolved.entity.type,
        resolved: resolved.entity.type !== 'unknown',
        properties: resolved.entity.properties,
      }],
      count: 1,
    } as ExtractedMentionsData,
  }
}

/**
 * Deep document analysis
 */
async function analyzeDocumentAction(params: EnrichmentActionParams): Promise<EnrichmentActionResult> {
  const { strandContent, strandPath, strandTitle } = params

  if (!strandContent) {
    return {
      success: false,
      message: 'Content is required for document analysis',
      error: 'MISSING_CONTENT',
    }
  }

  const {
    extractEntitiesAsync,
    extractInternalLinks,
    extractExternalLinks,
    classifyContentType,
    analyzeReadingLevel,
    extractKeywords,
    calculateContentHealth,
  } = await import('@/lib/nlp')

  // Full entity extraction
  const entities = await extractEntitiesAsync(strandContent)

  // Link extraction
  const internalLinks = extractInternalLinks(strandContent)
  const externalLinks = extractExternalLinks(strandContent)

  // Content classification
  const { primary: contentType } = classifyContentType(strandContent)
  const { level: difficulty } = analyzeReadingLevel(strandContent)

  // Keywords
  const keywords = extractKeywords(strandContent, 15)

  // Health score
  const health = calculateContentHealth(strandContent, { title: strandTitle })

  return {
    success: true,
    message: `Analyzed document: ${contentType} content, ${difficulty} difficulty, health score ${health.score}%`,
    data: {
      type: 'analysis',
      entities: {
        technologies: entities.technologies,
        concepts: entities.concepts,
        people: entities.people,
        organizations: entities.organizations,
        locations: entities.locations,
        dates: entities.dates,
        values: entities.values,
        acronyms: entities.acronyms,
      },
      contentType,
      difficulty,
      keyPhrases: keywords.map(k => k.word),
      internalLinks,
      externalDomains: externalLinks.map(l => l.domain),
      healthScore: health.score,
      suggestions: [...health.issues, ...health.suggestions],
    } as DocumentAnalysisData,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NLP INTENT PATTERNS FOR DOCUMENT ENRICHMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Patterns for detecting document enrichment intents in natural language
 */
export const ENRICHMENT_INTENT_PATTERNS = {
  enrich: [
    /enrich\s+(?:this\s+)?(?:document|strand|page|note)/i,
    /analyze\s+(?:this\s+)?(?:document|strand|page|note)/i,
    /improve\s+(?:this\s+)?(?:document|strand|page|note)/i,
    /enhance\s+(?:this\s+)?(?:document|strand|page|note)/i,
  ],
  extractMentions: [
    /(?:extract|find|get)\s+(?:all\s+)?mentions?/i,
    /what\s+(?:entities|people|places|dates)\s+are\s+mentioned/i,
    /show\s+me\s+(?:the\s+)?mentions?/i,
  ],
  suggestTags: [
    /(?:suggest|recommend)\s+tags?/i,
    /what\s+tags?\s+should\s+(?:I|this)\s+(?:use|have)/i,
    /auto[- ]?tag/i,
    /tag\s+suggestions?/i,
  ],
  suggestCategory: [
    /(?:suggest|recommend)\s+(?:a\s+)?category/i,
    /where\s+should\s+(?:I\s+put|this\s+go)/i,
    /categorize\s+this/i,
    /what\s+category/i,
  ],
  findRelated: [
    /find\s+related\s+(?:documents?|strands?|pages?)/i,
    /what(?:'s|\s+is)\s+related/i,
    /similar\s+(?:documents?|strands?|pages?)/i,
    /see\s+also/i,
  ],
  evaluateFormula: [
    /evaluate\s+(?:the\s+)?formula/i,
    /calculate\s+/i,
    /run\s+(?:the\s+)?formula/i,
    /compute\s+/i,
  ],
  suggestViews: [
    /(?:suggest|recommend)\s+(?:a\s+)?view/i,
    /how\s+should\s+I\s+(?:visualize|display)/i,
    /what\s+view\s+(?:should\s+I\s+use|works\s+best)/i,
    /show\s+as\s+(?:map|calendar|table|chart)/i,
  ],
}

/**
 * Detect enrichment intent from natural language input
 */
export function detectEnrichmentIntent(input: string): EnrichmentActionType | null {
  const inputLower = input.toLowerCase()

  for (const [intent, patterns] of Object.entries(ENRICHMENT_INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        // Map intent to action type
        switch (intent) {
          case 'enrich': return 'enrich_document'
          case 'extractMentions': return 'extract_mentions'
          case 'suggestTags': return 'suggest_tags'
          case 'suggestCategory': return 'suggest_category'
          case 'findRelated': return 'find_related'
          case 'evaluateFormula': return 'evaluate_formula'
          case 'suggestViews': return 'suggest_views'
        }
      }
    }
  }

  return null
}

/**
 * Build enrichment action from detected intent
 */
export function buildEnrichmentAction(
  intent: EnrichmentActionType,
  params: EnrichmentActionParams,
): OracleAction & { type: EnrichmentActionType } {
  const descriptions: Record<EnrichmentActionType, string> = {
    enrich_document: 'Analyze and enrich the document with tags, categories, and suggestions',
    extract_mentions: 'Extract @mentions from the content',
    suggest_tags: 'Suggest tags based on content analysis',
    suggest_category: 'Suggest the best category for this document',
    find_related: 'Find related documents based on content and links',
    evaluate_formula: `Evaluate formula: ${params.formulaExpression || 'unknown'}`,
    suggest_views: 'Suggest appropriate visualization views',
    create_mention: `Create mention: @${params.mentionText}`,
    resolve_mention: `Resolve mention: @${params.mentionText}`,
    analyze_document: 'Perform deep document analysis',
  }

  return {
    type: intent,
    params: params as Record<string, unknown>,
    confirmation: descriptions[intent],
    requiresConfirmation: ['create_mention'].includes(intent), // Only some need confirmation
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const DocumentEnrichment = {
  executeEnrichmentAction,
  detectEnrichmentIntent,
  buildEnrichmentAction,
  ENRICHMENT_INTENT_PATTERNS,
}

export default DocumentEnrichment




