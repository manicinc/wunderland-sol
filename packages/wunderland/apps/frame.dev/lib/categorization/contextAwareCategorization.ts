/**
 * Context-Aware Categorization Module
 * @module lib/categorization/contextAwareCategorization
 *
 * Enhanced categorization that considers:
 * - Document hierarchy (weaves, looms, strands)
 * - Relationships to existing documents
 * - Semantic analysis (NLP entities, concepts, content type)
 * - Sibling document patterns
 *
 * Inspired by Embark's "shared context across tools" approach.
 */

import type {
  CategorizationInput,
  CategorizationConfig,
  CategorySuggestion,
  CategoryResult,
  CategoryDefinition,
  ContextAwareCategorizationInput,
  EnhancedCategorySuggestion,
  ContextAwareCategoryResult,
  DocumentHierarchyContext,
  DocumentRelationships,
  SemanticAnalysis,
} from './types'

import {
  DEFAULT_CATEGORIES,
  DEFAULT_CONFIG,
  suggestCategory,
  parseFrontmatter,
  extractTitle,
} from './algorithm'

import {
  parseHierarchyFromPath,
  extractTechEntities,
  extractInternalLinks,
  extractExternalLinks,
  classifyContentType,
  analyzeReadingLevel,
  extractKeywords,
  suggestPrerequisites,
  inferTagsFromHierarchy,
} from '@/lib/nlp'

// ═══════════════════════════════════════════════════════════════════════════
// HIERARCHY ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse document hierarchy from path
 * Maps to OpenStrand structure for context-aware categorization
 */
export function parseDocumentHierarchy(filePath: string): DocumentHierarchyContext {
  const hierarchy = parseHierarchyFromPath(filePath)

  return {
    level: hierarchy.level,
    fabric: hierarchy.fabric,
    weave: hierarchy.weave,
    loom: hierarchy.loom,
    strand: hierarchy.strand,
    path: hierarchy.path,
    parentPath: hierarchy.parentPath,
  }
}

/**
 * Calculate hierarchy-based category score boost
 * Documents in the same weave/loom as the target category get a boost
 */
export function calculateHierarchyBoost(
  documentHierarchy: DocumentHierarchyContext,
  categoryPath: string,
  existingIndex: ContextAwareCategorizationInput['existingIndex'] = [],
): number {
  let boost = 0

  // Extract category hierarchy
  const categoryParts = categoryPath.split('/').filter(Boolean)
  const categoryWeave = categoryParts[0] === 'weaves' ? categoryParts[1] : undefined
  const categoryLoom = categoryParts.includes('looms')
    ? categoryParts[categoryParts.indexOf('looms') + 1]
    : undefined

  // Boost if document is already in the same weave
  if (documentHierarchy.weave && categoryWeave === documentHierarchy.weave) {
    boost += 0.15
  }

  // Boost if document is in the same loom
  if (documentHierarchy.loom && categoryLoom === documentHierarchy.loom) {
    boost += 0.2
  }

  // Check sibling pattern - if siblings are in this category, boost
  if (documentHierarchy.parentPath && existingIndex.length > 0) {
    const siblingsInCategory = existingIndex.filter((doc) => {
      const isSibling = doc.path.startsWith(documentHierarchy.parentPath!)
        && doc.path !== documentHierarchy.path
      const isInCategory = doc.metadata?.category === categoryPath
        || doc.path.startsWith(categoryPath)
      return isSibling && isInCategory
    })

    if (siblingsInCategory.length > 0) {
      // Up to 0.15 boost based on sibling presence
      boost += Math.min(0.15, siblingsInCategory.length * 0.05)
    }
  }

  return Math.min(boost, 0.35) // Cap at 0.35
}

// ═══════════════════════════════════════════════════════════════════════════
// RELATIONSHIP ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze document relationships for context-aware categorization
 */
export function analyzeDocumentRelationships(
  content: string,
  filePath: string,
  existingIndex: ContextAwareCategorizationInput['existingIndex'] = [],
): DocumentRelationships {
  const internalLinks = extractInternalLinks(content)
  const externalLinks = extractExternalLinks(content)
  const hierarchy = parseHierarchyFromPath(filePath)

  // Find siblings
  const siblings = existingIndex
    .filter((doc) => {
      if (!hierarchy.parentPath) return false
      return doc.path.startsWith(hierarchy.parentPath)
        && doc.path !== filePath
        && doc.path.endsWith('.md')
    })
    .map((doc) => doc.path)

  // Suggest prerequisites using NLP
  const prerequisites = suggestPrerequisites(content, hierarchy, existingIndex)

  // Extract mentioned entities (from internal links that might be entity references)
  const mentionedEntities: string[] = []
  for (const link of internalLinks) {
    // Links that look like entity references (not paths)
    if (!link.includes('/') && !link.includes('.md')) {
      mentionedEntities.push(link)
    }
  }

  return {
    internalLinks,
    externalDomains: externalLinks.map((l) => l.domain),
    mentionedEntities,
    suggestedPrerequisites: prerequisites
      .filter((p) => p.type === 'prerequisite')
      .slice(0, 5),
    siblings,
  }
}

/**
 * Calculate relationship-based category score boost
 * Documents linking to/from documents in a category get a boost
 */
export function calculateRelationshipBoost(
  relationships: DocumentRelationships,
  categoryPath: string,
  existingIndex: ContextAwareCategorizationInput['existingIndex'] = [],
): { boost: number; relatedDocs: string[] } {
  let boost = 0
  const relatedDocs: string[] = []

  // Check if internal links point to documents in this category
  for (const link of relationships.internalLinks) {
    const linkedDoc = existingIndex.find(
      (doc) => doc.path.includes(link) || doc.path.endsWith(`${link}.md`),
    )
    if (linkedDoc) {
      const isInCategory = linkedDoc.metadata?.category === categoryPath
        || linkedDoc.path.startsWith(categoryPath)
      if (isInCategory) {
        boost += 0.1
        relatedDocs.push(linkedDoc.path)
      }
    }
  }

  // Check if prerequisites are in this category
  for (const prereq of relationships.suggestedPrerequisites) {
    if (prereq.path.startsWith(categoryPath)) {
      boost += prereq.confidence * 0.1
      if (!relatedDocs.includes(prereq.path)) {
        relatedDocs.push(prereq.path)
      }
    }
  }

  // Boost if siblings are in this category
  for (const sibling of relationships.siblings) {
    const siblingDoc = existingIndex.find((doc) => doc.path === sibling)
    if (siblingDoc) {
      const isInCategory = siblingDoc.metadata?.category === categoryPath
        || siblingDoc.path.startsWith(categoryPath)
      if (isInCategory) {
        boost += 0.05
      }
    }
  }

  return {
    boost: Math.min(boost, 0.3), // Cap at 0.3
    relatedDocs: [...new Set(relatedDocs)],
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Perform semantic analysis on document content
 */
export function analyzeDocumentSemantics(content: string): SemanticAnalysis {
  const techEntities = extractTechEntities(content)
  const { primary: contentType } = classifyContentType(content)
  const { level: difficulty } = analyzeReadingLevel(content)
  const keywords = extractKeywords(content, 15)

  // Combine tech entities into technologies and concepts
  const technologies = [
    ...(techEntities.languages || []),
    ...(techEntities.frameworks || []),
    ...(techEntities.databases || []),
    ...(techEntities.cloud || []),
    ...(techEntities.ai || []),
    ...(techEntities.protocols || []),
  ]

  const concepts = techEntities.concepts || []

  // Extract named entities (basic version - for full async version, use extractEntitiesAsync)
  const namedEntities = {
    people: [] as string[],
    organizations: [] as string[],
    locations: [] as string[],
  }

  // Simple regex-based extraction for sync context
  const knownOrgs = content.match(
    /\b(Google|Microsoft|Apple|Amazon|Meta|Facebook|OpenAI|Anthropic|GitHub|GitLab|Mozilla|Netflix|Uber|Stripe|Vercel|Netlify|Cloudflare)\b/gi,
  ) || []
  namedEntities.organizations = [...new Set(knownOrgs.map((o) => o.trim()))]

  return {
    technologies: [...new Set(technologies)],
    concepts: [...new Set(concepts)],
    contentType: contentType as SemanticAnalysis['contentType'],
    difficulty,
    keyPhrases: keywords.slice(0, 10).map((k) => k.word),
    namedEntities,
  }
}

/**
 * Calculate semantic-based category score boost
 * Documents with semantic overlap with category keywords get a boost
 */
export function calculateSemanticBoost(
  semantics: SemanticAnalysis,
  category: CategoryDefinition,
): { boost: number; factors: string[] } {
  let boost = 0
  const factors: string[] = []

  const categoryKeywordsLower = category.keywords.map((k) => k.toLowerCase())

  // Check technologies against category keywords
  for (const tech of semantics.technologies) {
    const techLower = tech.toLowerCase()
    if (categoryKeywordsLower.some((kw) => techLower.includes(kw) || kw.includes(techLower))) {
      boost += 0.1
      factors.push(`tech: ${tech}`)
    }
  }

  // Check concepts against category keywords
  for (const concept of semantics.concepts) {
    const conceptLower = concept.toLowerCase()
    if (categoryKeywordsLower.some((kw) => conceptLower.includes(kw) || kw.includes(conceptLower))) {
      boost += 0.08
      factors.push(`concept: ${concept}`)
    }
  }

  // Content type alignment (e.g., tutorial content → tutorials category)
  const contentTypeCategoryMap: Record<string, string[]> = {
    tutorial: ['tutorial', 'guide', 'how-to', 'learn'],
    reference: ['reference', 'api', 'documentation', 'spec'],
    conceptual: ['concept', 'theory', 'principle', 'fundamental'],
    troubleshooting: ['debug', 'fix', 'problem', 'error'],
    architecture: ['architecture', 'design', 'pattern', 'structure'],
  }

  const alignedKeywords = contentTypeCategoryMap[semantics.contentType] || []
  if (alignedKeywords.some((kw) => categoryKeywordsLower.includes(kw))) {
    boost += 0.15
    factors.push(`contentType: ${semantics.contentType}`)
  }

  // Key phrases match
  for (const phrase of semantics.keyPhrases.slice(0, 5)) {
    if (categoryKeywordsLower.some((kw) => phrase.includes(kw))) {
      boost += 0.05
      factors.push(`phrase: ${phrase}`)
    }
  }

  return {
    boost: Math.min(boost, 0.4), // Cap at 0.4
    factors: factors.slice(0, 5), // Limit factors
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CONTEXT-AWARE CATEGORIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Enhanced category suggestion with full context awareness
 * Combines hierarchy, relationships, and semantic analysis
 */
export function suggestCategoryWithContext(
  input: ContextAwareCategorizationInput,
): EnhancedCategorySuggestion {
  const { content, title, frontmatter, config, existingIndex = [] } = input

  // Parse hierarchy
  const hierarchy = input.hierarchy || parseDocumentHierarchy(input.path)

  // Analyze relationships
  const relationships = input.relationships
    || analyzeDocumentRelationships(content, input.path, existingIndex)

  // Analyze semantics
  const semantics = input.semantics || analyzeDocumentSemantics(content)

  // Get base suggestion from keyword-based algorithm
  const baseSuggestion = suggestCategory({
    path: input.path,
    title,
    content,
    frontmatter,
    config,
  })

  // Score each category with context awareness
  const categories = config.categories || DEFAULT_CATEGORIES
  const enhancedScores: Array<{
    path: string
    baseScore: number
    hierarchyBoost: number
    relationshipBoost: number
    semanticBoost: number
    totalScore: number
    semanticFactors: string[]
    relatedDocs: string[]
    description: string
  }> = []

  for (const category of categories) {
    // Skip excluded paths
    if (config.excluded_paths?.some((ep) => category.path.startsWith(ep))) {
      continue
    }

    // Get base score from base suggestion
    const baseScore = baseSuggestion.category === category.path
      ? baseSuggestion.confidence
      : baseSuggestion.alternatives.find((a) => a.category === category.path)?.confidence || 0

    // Calculate context boosts
    const hierarchyBoost = calculateHierarchyBoost(hierarchy, category.path, existingIndex)
    const { boost: relationshipBoost, relatedDocs } = calculateRelationshipBoost(
      relationships,
      category.path,
      existingIndex,
    )
    const { boost: semanticBoost, factors: semanticFactors } = calculateSemanticBoost(
      semantics,
      category,
    )

    const totalScore = Math.min(
      baseScore + hierarchyBoost + relationshipBoost + semanticBoost,
      1.0,
    )

    if (totalScore > 0.1) {
      enhancedScores.push({
        path: category.path,
        baseScore,
        hierarchyBoost,
        relationshipBoost,
        semanticBoost,
        totalScore,
        semanticFactors,
        relatedDocs,
        description: category.description,
      })
    }
  }

  // Sort by total score
  enhancedScores.sort((a, b) => b.totalScore - a.totalScore)

  // Build enhanced suggestion
  if (enhancedScores.length === 0) {
    // Fallback to base suggestion
    return {
      ...baseSuggestion,
      hierarchyBoost: 0,
      relationshipBoost: 0,
      semanticFactors: [],
      relatedInCategory: [],
      suggestedTags: inferTagsFromHierarchy(hierarchy, existingIndex),
    }
  }

  const best = enhancedScores[0]

  // Infer tags from hierarchy and add semantic tags
  const hierarchyTags = inferTagsFromHierarchy(hierarchy, existingIndex)
  const semanticTags = [
    ...semantics.technologies.slice(0, 3).map((t) => t.toLowerCase()),
    ...semantics.concepts.slice(0, 2).map((c) => c.toLowerCase()),
  ]
  const suggestedTags = [...new Set([...hierarchyTags, ...semanticTags])].slice(0, 10)

  return {
    category: best.path,
    confidence: best.totalScore,
    reasoning: buildEnhancedReasoning(best, semantics),
    alternatives: enhancedScores.slice(1, 4).map((s) => ({
      category: s.path,
      confidence: s.totalScore,
      reasoning: `${s.description}. Base: ${(s.baseScore * 100).toFixed(0)}%, boosts: h+${(s.hierarchyBoost * 100).toFixed(0)}%, r+${(s.relationshipBoost * 100).toFixed(0)}%, s+${(s.semanticBoost * 100).toFixed(0)}%`,
    })),
    hierarchyBoost: best.hierarchyBoost,
    relationshipBoost: best.relationshipBoost,
    semanticFactors: best.semanticFactors,
    relatedInCategory: best.relatedDocs,
    suggestedTags,
  }
}

/**
 * Build human-readable reasoning for enhanced suggestion
 */
function buildEnhancedReasoning(
  scoreInfo: {
    path: string
    baseScore: number
    hierarchyBoost: number
    relationshipBoost: number
    semanticBoost: number
    semanticFactors: string[]
    relatedDocs: string[]
    description: string
  },
  semantics: SemanticAnalysis,
): string {
  const parts: string[] = [scoreInfo.description]

  // Base confidence
  if (scoreInfo.baseScore > 0) {
    parts.push(`Base keyword match: ${(scoreInfo.baseScore * 100).toFixed(0)}%`)
  }

  // Hierarchy context
  if (scoreInfo.hierarchyBoost > 0) {
    parts.push(`Hierarchy context: +${(scoreInfo.hierarchyBoost * 100).toFixed(0)}%`)
  }

  // Relationship context
  if (scoreInfo.relationshipBoost > 0) {
    parts.push(
      `Related documents: +${(scoreInfo.relationshipBoost * 100).toFixed(0)}% (${scoreInfo.relatedDocs.length} linked)`,
    )
  }

  // Semantic factors
  if (scoreInfo.semanticFactors.length > 0) {
    parts.push(`Semantic: ${scoreInfo.semanticFactors.slice(0, 3).join(', ')}`)
  }

  // Content type
  parts.push(`Content type: ${semantics.contentType}, difficulty: ${semantics.difficulty}`)

  return parts.join('. ')
}

/**
 * Context-aware categorization for a single strand
 * Enhanced version of categorizeStrand with full context
 */
export async function categorizeStrandWithContext(
  input: ContextAwareCategorizationInput,
): Promise<ContextAwareCategoryResult> {
  const { path, content, config } = input

  // Parse frontmatter
  const { metadata, body } = parseFrontmatter(content)

  // Extract title
  const title = input.title || extractTitle(metadata, body)

  // Parse hierarchy
  const hierarchyContext = input.hierarchy || parseDocumentHierarchy(path)

  // Analyze relationships
  const discoveredRelationships = input.relationships
    || analyzeDocumentRelationships(content, path, input.existingIndex)

  // Analyze semantics
  const semanticAnalysis = input.semantics || analyzeDocumentSemantics(content)

  // Get enhanced category suggestion
  const enhancedSuggestion = suggestCategoryWithContext({
    path,
    title,
    content: body,
    frontmatter: metadata,
    config,
    hierarchy: hierarchyContext,
    relationships: discoveredRelationships,
    semantics: semanticAnalysis,
    existingIndex: input.existingIndex,
  })

  // Determine action based on confidence thresholds
  const { auto_apply_threshold = 0.95, pr_threshold = 0.80 } = config

  let action: 'auto-apply' | 'suggest' | 'needs-triage'
  if (enhancedSuggestion.confidence >= auto_apply_threshold) {
    action = 'auto-apply'
  } else if (enhancedSuggestion.confidence >= pr_threshold) {
    action = 'suggest'
  } else {
    action = 'needs-triage'
  }

  // Extract current category from path
  const currentPath = path.replace(/\/[^/]+\.md$/, '/') || 'weaves/inbox/'

  return {
    filePath: path,
    currentPath,
    suggestion: enhancedSuggestion,
    action,
    enhancedSuggestion,
    hierarchyContext,
    discoveredRelationships,
    semanticAnalysis,
  }
}

/**
 * Batch context-aware categorization
 * Processes multiple strands with shared context for better relationship detection
 */
export async function categorizeStrandsWithContext(
  inputs: ContextAwareCategorizationInput[],
  sharedIndex: ContextAwareCategorizationInput['existingIndex'] = [],
  onProgress?: (current: number, total: number) => void,
): Promise<ContextAwareCategoryResult[]> {
  const results: ContextAwareCategoryResult[] = []

  // Build combined index from existing + inputs being processed
  const combinedIndex = [
    ...sharedIndex,
    ...inputs.map((input) => {
      // Normalize tags to always be an array
      const rawTags = input.frontmatter?.tags
      const tags = rawTags === undefined ? undefined : Array.isArray(rawTags) ? rawTags : [rawTags]
      return {
        path: input.path,
        metadata: {
          title: input.title,
          tags,
        },
      }
    }),
  ]

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]

    // Use combined index for relationship detection
    const result = await categorizeStrandWithContext({
      ...input,
      existingIndex: combinedIndex,
    })

    results.push(result)

    // Update index with categorization result for subsequent documents
    const indexEntry = combinedIndex.find((e) => e.path === input.path)
    if (indexEntry) {
      indexEntry.metadata = {
        ...indexEntry.metadata,
        category: result.suggestion.category,
      }
    }

    if (onProgress) {
      onProgress(i + 1, inputs.length)
    }
  }

  return results
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const ContextAwareCategorization = {
  // Hierarchy
  parseDocumentHierarchy,
  calculateHierarchyBoost,

  // Relationships
  analyzeDocumentRelationships,
  calculateRelationshipBoost,

  // Semantics
  analyzeDocumentSemantics,
  calculateSemanticBoost,

  // Main functions
  suggestCategoryWithContext,
  categorizeStrandWithContext,
  categorizeStrandsWithContext,
}

export default ContextAwareCategorization


