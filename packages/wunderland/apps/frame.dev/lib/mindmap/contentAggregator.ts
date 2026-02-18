/**
 * Content Aggregator for Mindmap Generation
 * @module lib/mindmap/contentAggregator
 *
 * Utilities for extracting and aggregating content from strands
 * Supports single-strand, multi-strand, content-based, and tag-based modes
 */

import type {
  HierarchyData,
  GraphData,
  GraphNode,
  GraphLink
} from '@/hooks/useMindmapGeneration'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
═══════════════════════════════════════════════════════════════════════════ */

export interface StrandContent {
  path: string
  title: string
  content: string
  metadata?: StrandMetadata
}

export interface StrandMetadata {
  title?: string
  subject?: string
  difficulty?: string
  tags?: string[]
  relationships?: {
    references?: string[]
    prerequisites?: string[]
    seeAlso?: string[]
  }
  [key: string]: unknown
}

export interface AggregatedContent {
  mergedContent: string
  strands: StrandContent[]
  totalHeadings: number
  relationships: Map<string, Set<string>>
}

/* ═══════════════════════════════════════════════════════════════════════════
   HEADING EXTRACTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Extract headings from markdown content
 * Returns array of { level, text, line } objects
 */
export function extractHeadings(content: string): Array<{
  level: number
  text: string
  line: number
}> {
  if (!content) return []
  const headings: Array<{ level: number; text: string; line: number }> = []
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      headings.push({ level, text, line: index + 1 })
    }
  })

  return headings
}

/**
 * Build hierarchy markdown from headings
 * Converts heading structure to markmap-compatible format
 */
export function buildHierarchyMarkdown(
  strands: StrandContent[],
  singleStrand = true
): string {
  if (singleStrand && strands.length === 1) {
    // Single strand: use content as-is
    return strands[0].content
  }

  // Multi-strand: create merged hierarchy
  let markdown = '# Knowledge Hierarchy\n\n'

  strands.forEach(strand => {
    const headings = extractHeadings(strand.content)

    if (headings.length === 0) {
      // No headings - create a section with the title
      markdown += `## ${strand.title}\n\n`
      markdown += `> ${strand.path}\n\n`
    } else {
      // Add strand as top-level section
      markdown += `## ${strand.title}\n\n`
      markdown += `> Source: ${strand.path}\n\n`

      // Add all headings with increased indentation
      headings.forEach(heading => {
        const adjustedLevel = heading.level + 2 // Shift down 2 levels
        const prefix = '#'.repeat(Math.min(adjustedLevel, 6))
        markdown += `${prefix} ${heading.text}\n\n`
      })
    }
  })

  return markdown
}

/* ═══════════════════════════════════════════════════════════════════════════
   RELATIONSHIP EXTRACTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Extract relationships from metadata
 */
export function extractRelationships(
  strands: StrandContent[]
): Map<string, Set<string>> {
  const relationships = new Map<string, Set<string>>()

  strands.forEach(strand => {
    const path = strand.path
    if (!relationships.has(path)) {
      relationships.set(path, new Set())
    }

    const relations = relationships.get(path)!

    // Add prerequisites from relationships.prerequisites
    if (strand.metadata?.relationships?.prerequisites) {
      strand.metadata.relationships.prerequisites.forEach(prereq => {
        relations.add(`prerequisite:${prereq}`)
      })
    }

    // Add references from relationships.references
    if (strand.metadata?.relationships?.references) {
      strand.metadata.relationships.references.forEach(ref => {
        relations.add(`reference:${ref}`)
      })
    }

    // Add seeAlso from relationships.seeAlso
    if (strand.metadata?.relationships?.seeAlso) {
      strand.metadata.relationships.seeAlso.forEach(related => {
        relations.add(`seeAlso:${related}`)
      })
    }
  })

  return relationships
}

/**
 * Extract internal links from markdown content
 */
export function extractInternalLinks(content: string): string[] {
  const links: string[] = []

  // Match markdown links: [text](path)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  let match

  while ((match = linkRegex.exec(content)) !== null) {
    const path = match[2]
    // Filter for internal links (not http/https)
    if (!path.startsWith('http://') && !path.startsWith('https://')) {
      links.push(path)
    }
  }

  return links
}

/**
 * Build graph data from strands and relationships
 */
export function buildGraphData(
  strands: StrandContent[],
  currentStrandPath?: string
): GraphData {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  const nodeMap = new Map<string, GraphNode>()

  // Build nodes
  strands.forEach(strand => {
    const isCurrent = currentStrandPath === strand.path

    const node: GraphNode = {
      id: strand.path,
      name: strand.title || strand.path.split('/').pop() || strand.path,
      type: isCurrent ? 'current' : 'sibling',
      path: strand.path,
      weight: 1,
      difficulty: strand.metadata?.difficulty,
      subject: strand.metadata?.subject,
    }

    nodes.push(node)
    nodeMap.set(strand.path, node)
  })

  // Build links from metadata relationships
  strands.forEach(strand => {
    const sourceNode = nodeMap.get(strand.path)
    if (!sourceNode) return

    // Prerequisites from relationships.prerequisites
    if (strand.metadata?.relationships?.prerequisites) {
      strand.metadata.relationships.prerequisites.forEach(prereqPath => {
        const targetNode = nodeMap.get(prereqPath)
        if (targetNode) {
          links.push({
            source: prereqPath,
            target: strand.path,
            strength: 0.9, // High strength for prerequisites
            type: 'prerequisite',
          })
        }
      })
    }

    // References from relationships.references
    if (strand.metadata?.relationships?.references) {
      strand.metadata.relationships.references.forEach(refPath => {
        const targetNode = nodeMap.get(refPath)
        if (targetNode) {
          links.push({
            source: strand.path,
            target: refPath,
            strength: 0.7, // Medium-high strength for explicit references
            type: 'reference',
          })
        }
      })
    }

    // See also from relationships.seeAlso
    if (strand.metadata?.relationships?.seeAlso) {
      strand.metadata.relationships.seeAlso.forEach(relatedPath => {
        const targetNode = nodeMap.get(relatedPath)
        if (targetNode) {
          // Only add if not already linked
          const existingLink = links.find(
            l => (l.source === strand.path && l.target === relatedPath) ||
                 (l.source === relatedPath && l.target === strand.path)
          )
          if (!existingLink) {
            links.push({
              source: strand.path,
              target: relatedPath,
              strength: 0.5, // Medium strength for see-also
              type: 'reference',
            })
          }
        }
      })
    }

    // Internal links from content (lower priority)
    const internalLinks = extractInternalLinks(strand.content)
    internalLinks.forEach(linkPath => {
      const targetNode = nodeMap.get(linkPath)
      if (targetNode && linkPath !== strand.path) {
        // Only add if not already linked
        const existingLink = links.find(
          l => (l.source === strand.path && l.target === linkPath) ||
               (l.source === linkPath && l.target === strand.path)
        )
        if (!existingLink) {
          links.push({
            source: strand.path,
            target: linkPath,
            strength: 0.3, // Lower strength for implicit links
            type: 'reference',
          })
        }
      }
    })
  })

  // Update node types based on relationships to current strand
  if (currentStrandPath && nodeMap.has(currentStrandPath)) {
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source
      const targetId = typeof link.target === 'string' ? link.target : link.target

      if (sourceId === currentStrandPath) {
        const targetNode = nodeMap.get(targetId)
        if (targetNode && targetNode.type === 'sibling') {
          if (link.type === 'prerequisite') {
            targetNode.type = 'child'
          } else {
            targetNode.type = 'reference'
          }
        }
      } else if (targetId === currentStrandPath) {
        const sourceNode = nodeMap.get(sourceId)
        if (sourceNode && sourceNode.type === 'sibling') {
          if (link.type === 'prerequisite') {
            sourceNode.type = 'prerequisite'
          } else {
            sourceNode.type = 'parent'
          }
        }
      }
    })
  }

  return { nodes, links }
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAG-BASED DISCOVERY
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Calculate tag overlap between two strand tag sets
 */
export function calculateTagOverlap(tags1: string[], tags2: string[]): number {
  if (!tags1.length || !tags2.length) return 0

  const set1 = new Set(tags1)
  const set2 = new Set(tags2)

  let overlap = 0
  set1.forEach(tag => {
    if (set2.has(tag)) overlap++
  })

  // Jaccard similarity: intersection / union
  const union = new Set([...set1, ...set2])
  return overlap / union.size
}

/**
 * Find strands related by tag overlap
 * Returns strand paths sorted by relevance score
 */
export function findRelatedByTags(
  currentTags: string[],
  allStrands: StrandContent[],
  threshold = 0.1,
  limit = 20
): StrandContent[] {
  const scored = allStrands
    .map(strand => {
      const tags = strand.metadata?.tags || []
      const score = calculateTagOverlap(currentTags, tags)
      return { strand, score }
    })
    .filter(item => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored.map(item => item.strand)
}

/**
 * Build tag relationship graph
 * Shows strands connected by shared tags
 */
export function buildTagGraph(
  strands: StrandContent[],
  currentStrandPath?: string
): GraphData {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  const nodeMap = new Map<string, GraphNode>()

  // Build nodes
  strands.forEach(strand => {
    const isCurrent = currentStrandPath === strand.path

    const node: GraphNode = {
      id: strand.path,
      name: strand.title || strand.path.split('/').pop() || strand.path,
      type: isCurrent ? 'current' : 'tag-related',
      path: strand.path,
      weight: (strand.metadata?.tags || []).length,
      difficulty: strand.metadata?.difficulty,
      subject: strand.metadata?.subject,
    }

    nodes.push(node)
    nodeMap.set(strand.path, node)
  })

  // Build links based on tag overlap
  for (let i = 0; i < strands.length; i++) {
    for (let j = i + 1; j < strands.length; j++) {
      const strand1 = strands[i]
      const strand2 = strands[j]

      const tags1 = strand1.metadata?.tags || []
      const tags2 = strand2.metadata?.tags || []

      const overlap = calculateTagOverlap(tags1, tags2)

      if (overlap > 0.1) {
        links.push({
          source: strand1.path,
          target: strand2.path,
          strength: overlap,
          type: 'tag',
        })
      }
    }
  }

  return { nodes, links }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTENT AGGREGATION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Merge content from multiple strands
 */
export function mergeStrandContent(strands: StrandContent[]): string {
  if (strands.length === 0) return ''
  if (strands.length === 1) return strands[0].content

  let merged = '# Combined Content\n\n'

  strands.forEach((strand, index) => {
    if (index > 0) {
      merged += '\n---\n\n'
    }

    merged += `## ${strand.title}\n\n`
    merged += `> Source: ${strand.path}\n\n`
    merged += strand.content + '\n\n'
  })

  return merged
}

/**
 * Aggregate content from multiple strands
 * Returns merged content with metadata
 */
export function aggregateContent(strands: StrandContent[]): AggregatedContent {
  const mergedContent = mergeStrandContent(strands)
  const relationships = extractRelationships(strands)

  let totalHeadings = 0
  strands.forEach(strand => {
    totalHeadings += extractHeadings(strand.content).length
  })

  return {
    mergedContent,
    strands,
    totalHeadings,
    relationships,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN GENERATION FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate hierarchy data from strands
 */
export function generateHierarchyData(
  strands: StrandContent[],
  options: {
    singleStrand?: boolean
  } = {}
): HierarchyData {
  const { singleStrand = true } = options

  const markdown = buildHierarchyMarkdown(strands, singleStrand)
  const headingCount = extractHeadings(markdown).length

  return {
    markdown,
    headingCount,
  }
}

/**
 * Generate graph data from strands
 */
export function generateGraphData(
  strands: StrandContent[],
  options: {
    currentStrandPath?: string
    useTagRelationships?: boolean
  } = {}
): GraphData {
  const { currentStrandPath, useTagRelationships = false } = options

  if (useTagRelationships) {
    return buildTagGraph(strands, currentStrandPath)
  } else {
    return buildGraphData(strands, currentStrandPath)
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export default {
  // Heading extraction
  extractHeadings,
  buildHierarchyMarkdown,

  // Relationship extraction
  extractRelationships,
  extractInternalLinks,
  buildGraphData,

  // Tag-based discovery
  calculateTagOverlap,
  findRelatedByTags,
  buildTagGraph,

  // Content aggregation
  mergeStrandContent,
  aggregateContent,

  // Main generation functions
  generateHierarchyData,
  generateGraphData,
}
