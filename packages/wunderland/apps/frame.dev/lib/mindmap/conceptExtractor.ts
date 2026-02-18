/**
 * Concept Extractor for Mindmap Generation
 * @module lib/mindmap/conceptExtractor
 *
 * Offline NLP concept extraction using compromise.js
 * Extracts entities, topics, actions, and relationships from text
 */

import nlp from 'compromise'
import type { ConceptData, ConceptNode, ConceptEdge } from '@/hooks/useMindmapGeneration'
import { buildSemanticEdges, type SemanticRelationshipOptions } from './semanticRelationships'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
═══════════════════════════════════════════════════════════════════════════ */

interface ConceptCandidate {
  text: string
  type: 'entity' | 'topic' | 'action' | 'attribute'
  frequency: number
  sentences: number[] // Sentence indices where this concept appears
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONCEPT COLORS
═══════════════════════════════════════════════════════════════════════════ */

const CONCEPT_COLORS = {
  entity: '#3b82f6',    // Blue
  topic: '#8b5cf6',     // Purple
  action: '#22c55e',    // Green
  attribute: '#f59e0b', // Amber
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEXT PREPROCESSING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Clean and preprocess markdown content
 * Removes code blocks, URLs, and markdown syntax
 */
export function preprocessText(content: string): string {
  let text = content

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '')
  text = text.replace(/`[^`]+`/g, '')

  // Remove URLs
  text = text.replace(/https?:\/\/[^\s]+/g, '')

  // Remove markdown links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // Remove markdown formatting
  text = text.replace(/[*_~]/g, '')
  text = text.replace(/^#+\s+/gm, '')
  text = text.replace(/^[->]\s+/gm, '')

  // Remove multiple spaces and newlines
  text = text.replace(/\n+/g, ' ')
  text = text.replace(/\s+/g, ' ')

  return text.trim()
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONCEPT EXTRACTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Extract entity concepts (nouns, named entities)
 */
function extractEntities(doc: any): ConceptCandidate[] {
  const entities: Map<string, ConceptCandidate> = new Map()

  // Extract nouns
  const nouns = doc.nouns().out('array') as string[]
  nouns.forEach((noun: string) => {
    if (noun.length < 3 || noun.length > 40) return

    const normalized = noun.toLowerCase().trim()
    if (!entities.has(normalized)) {
      entities.set(normalized, {
        text: noun,
        type: 'entity',
        frequency: 0,
        sentences: [],
      })
    }
    entities.get(normalized)!.frequency++
  })

  // Extract named entities (people, places, organizations)
  const people = doc.people().out('array') as string[]
  const places = doc.places().out('array') as string[]
  const organizations = doc.organizations().out('array') as string[]

  ;[...people, ...places, ...organizations].forEach(entity => {
    if (entity.length < 2) return

    const normalized = entity.toLowerCase().trim()
    if (!entities.has(normalized)) {
      entities.set(normalized, {
        text: entity,
        type: 'entity',
        frequency: 0,
        sentences: [],
      })
    }
    entities.get(normalized)!.frequency += 2 // Weight named entities higher
  })

  return Array.from(entities.values())
}

/**
 * Extract action concepts (verbs, verb phrases)
 */
function extractActions(doc: any): ConceptCandidate[] {
  const actions: Map<string, ConceptCandidate> = new Map()

  // Extract verbs
  const verbs = doc.verbs().out('array') as string[]
  verbs.forEach((verb: string) => {
    if (verb.length < 3 || verb.length > 30) return

    // Filter out common auxiliary verbs
    const auxiliaries = ['is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had']
    if (auxiliaries.includes(verb.toLowerCase())) return

    const normalized = verb.toLowerCase().trim()
    if (!actions.has(normalized)) {
      actions.set(normalized, {
        text: verb,
        type: 'action',
        frequency: 0,
        sentences: [],
      })
    }
    actions.get(normalized)!.frequency++
  })

  return Array.from(actions.values())
}

/**
 * Extract topic concepts (significant terms, phrases)
 */
function extractTopics(doc: any): ConceptCandidate[] {
  const topics: Map<string, ConceptCandidate> = new Map()

  // Extract topics using compromise's topic detection
  const topicTerms = doc.topics().out('array') as string[]
  topicTerms.forEach((topic: string) => {
    if (topic.length < 3 || topic.length > 40) return

    const normalized = topic.toLowerCase().trim()
    if (!topics.has(normalized)) {
      topics.set(normalized, {
        text: topic,
        type: 'topic',
        frequency: 0,
        sentences: [],
      })
    }
    topics.get(normalized)!.frequency++
  })

  // Extract noun phrases as potential topics
  const nounPhrases = doc.match('#Adjective? #Noun+').out('array') as string[]
  nounPhrases.forEach((phrase: string) => {
    if (phrase.length < 5 || phrase.length > 50) return
    if (phrase.split(' ').length < 2) return // Only multi-word phrases

    const normalized = phrase.toLowerCase().trim()
    if (!topics.has(normalized)) {
      topics.set(normalized, {
        text: phrase,
        type: 'topic',
        frequency: 0,
        sentences: [],
      })
    }
    topics.get(normalized)!.frequency++
  })

  return Array.from(topics.values())
}

/**
 * Extract attribute concepts (adjectives, qualities)
 */
function extractAttributes(doc: any): ConceptCandidate[] {
  const attributes: Map<string, ConceptCandidate> = new Map()

  // Extract adjectives
  const adjectives = doc.adjectives().out('array') as string[]
  adjectives.forEach((adj: string) => {
    if (adj.length < 3 || adj.length > 20) return

    const normalized = adj.toLowerCase().trim()
    if (!attributes.has(normalized)) {
      attributes.set(normalized, {
        text: adj,
        type: 'attribute',
        frequency: 0,
        sentences: [],
      })
    }
    attributes.get(normalized)!.frequency++
  })

  return Array.from(attributes.values())
}

/* ═══════════════════════════════════════════════════════════════════════════
   RELATIONSHIP BUILDING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Build relationships between concepts based on co-occurrence
 */
function buildRelationships(
  concepts: ConceptCandidate[],
  sentences: string[]
): ConceptEdge[] {
  const edges: ConceptEdge[] = []
  const edgeSet = new Set<string>()

  // Create concept lookup by text
  const conceptMap = new Map<string, ConceptCandidate>()
  concepts.forEach(concept => {
    conceptMap.set(concept.text.toLowerCase(), concept)
  })

  // Analyze each sentence for co-occurring concepts
  sentences.forEach(sentence => {
    const sentenceLower = sentence.toLowerCase()
    const foundConcepts: ConceptCandidate[] = []

    // Find all concepts in this sentence
    concepts.forEach(concept => {
      if (sentenceLower.includes(concept.text.toLowerCase())) {
        foundConcepts.push(concept)
      }
    })

    // Create edges between co-occurring concepts
    for (let i = 0; i < foundConcepts.length; i++) {
      for (let j = i + 1; j < foundConcepts.length; j++) {
        const source = foundConcepts[i]
        const target = foundConcepts[j]

        // Create unique edge key (alphabetical order for consistency)
        const edgeKey = [source.text, target.text].sort().join('|')

        if (!edgeSet.has(edgeKey)) {
          // Determine edge type based on concept types
          let edgeType: 'related' | 'acts-on' | 'has-attribute' = 'related'

          if (source.type === 'action' && target.type === 'entity') {
            edgeType = 'acts-on'
          } else if (source.type === 'entity' && target.type === 'action') {
            edgeType = 'acts-on'
          } else if (
            (source.type === 'entity' || source.type === 'topic') &&
            target.type === 'attribute'
          ) {
            edgeType = 'has-attribute'
          } else if (
            source.type === 'attribute' &&
            (target.type === 'entity' || target.type === 'topic')
          ) {
            edgeType = 'has-attribute'
          }

          edges.push({
            source: source.text,
            target: target.text,
            type: edgeType,
            strength: 0.5 + (Math.min(source.frequency, target.frequency) / 10),
          })

          edgeSet.add(edgeKey)
        }
      }
    }
  })

  return edges
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONCEPT FILTERING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Filter and rank concepts by relevance
 */
function filterConcepts(
  candidates: ConceptCandidate[],
  minFrequency = 1,
  maxConcepts = 50
): ConceptCandidate[] {
  return candidates
    .filter(c => c.frequency >= minFrequency)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, maxConcepts)
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXTRACTION FUNCTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Extract concepts and relationships from text content
 */
export function extractConcepts(
  content: string,
  options: {
    minFrequency?: number
    maxConcepts?: number
  } = {}
): ConceptData {
  const { minFrequency = 2, maxConcepts = 50 } = options

  // Preprocess text
  const cleanText = preprocessText(content)

  if (!cleanText || cleanText.length < 50) {
    return { nodes: [], edges: [] }
  }

  // Parse with compromise.js
  const doc = nlp(cleanText)

  // Split into sentences for relationship analysis
  const sentences = doc.sentences().out('array') as string[]

  // Extract different types of concepts
  const entities = extractEntities(doc)
  const actions = extractActions(doc)
  const topics = extractTopics(doc)
  const attributes = extractAttributes(doc)

  // Combine all candidates
  const allCandidates = [...entities, ...actions, ...topics, ...attributes]

  // Filter and rank
  const topConcepts = filterConcepts(allCandidates, minFrequency, maxConcepts)

  // Build concept nodes
  const nodes: ConceptNode[] = topConcepts.map((concept, index) => ({
    id: `concept-${index}`,
    text: concept.text,
    type: concept.type,
    weight: concept.frequency,
    color: CONCEPT_COLORS[concept.type],
  }))

  // Build relationships
  const edges = buildRelationships(topConcepts, sentences)

  // Map concept text to node IDs
  const textToId = new Map<string, string>()
  nodes.forEach(node => {
    textToId.set(node.text.toLowerCase(), node.id)
  })

  // Update edge IDs
  const updatedEdges: ConceptEdge[] = edges
    .map(edge => {
      const sourceId = textToId.get(edge.source.toLowerCase())
      const targetId = textToId.get(edge.target.toLowerCase())

      if (sourceId && targetId) {
        return {
          ...edge,
          source: sourceId,
          target: targetId,
        }
      }
      return null
    })
    .filter(edge => edge !== null) as ConceptEdge[]

  return {
    nodes,
    edges: updatedEdges,
  }
}

/**
 * Extract concepts with semantic relationship enhancement
 * Async version that uses embeddings and/or WordNet for additional edges
 */
export async function extractConceptsWithSemantics(
  content: string,
  options: {
    minFrequency?: number
    maxConcepts?: number
    semantic?: SemanticRelationshipOptions
  } = {}
): Promise<ConceptData> {
  const { semantic, ...baseOptions } = options

  // First extract using standard co-occurrence method
  const baseData = extractConcepts(content, baseOptions)

  if (baseData.nodes.length === 0) {
    return baseData
  }

  // If no semantic options or both disabled, return base data
  if (!semantic || (!semantic.useWordNet && !semantic.useEmbeddings)) {
    return baseData
  }

  // Build semantic edges
  const semanticEdges = await buildSemanticEdges(
    baseData.nodes,
    baseData.edges,
    semantic
  )

  // Merge semantic edges with co-occurrence edges
  // Mark semantic edges with a flag for UI differentiation
  const allEdges = [
    ...baseData.edges,
    ...semanticEdges.map(edge => ({
      ...edge,
      // Remove semanticScore and method from final edge (internal only)
      source: edge.source,
      target: edge.target,
      type: edge.type,
      strength: edge.strength,
    })),
  ]

  return {
    nodes: baseData.nodes,
    edges: allEdges,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MULTI-STRAND CONCEPT MERGING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Merge concepts from multiple strands
 */
export function mergeConceptData(conceptDataList: ConceptData[]): ConceptData {
  const nodeMap = new Map<string, ConceptNode>()
  const edgeMap = new Map<string, ConceptEdge>()

  // Merge nodes
  conceptDataList.forEach(data => {
    data.nodes.forEach(node => {
      const key = node.text.toLowerCase()
      if (nodeMap.has(key)) {
        // Merge weights
        const existing = nodeMap.get(key)!
        existing.weight += node.weight
      } else {
        nodeMap.set(key, { ...node })
      }
    })
  })

  // Re-assign sequential IDs
  const nodes = Array.from(nodeMap.values()).map((node, index) => ({
    ...node,
    id: `concept-${index}`,
  }))

  // Create text-to-ID mapping
  const textToId = new Map<string, string>()
  nodes.forEach(node => {
    textToId.set(node.text.toLowerCase(), node.id)
  })

  // Merge edges
  conceptDataList.forEach(data => {
    data.edges.forEach(edge => {
      const sourceText = data.nodes.find(n => n.id === edge.source)?.text.toLowerCase()
      const targetText = data.nodes.find(n => n.id === edge.target)?.text.toLowerCase()

      if (sourceText && targetText) {
        const sourceId = textToId.get(sourceText)
        const targetId = textToId.get(targetText)

        if (sourceId && targetId) {
          const edgeKey = [sourceId, targetId].sort().join('|')

          if (edgeMap.has(edgeKey)) {
            // Increase strength for repeated edges
            const existing = edgeMap.get(edgeKey)!
            existing.strength = Math.min(1, existing.strength + 0.1)
          } else {
            edgeMap.set(edgeKey, {
              source: sourceId,
              target: targetId,
              type: edge.type,
              strength: edge.strength,
            })
          }
        }
      }
    })
  })

  return {
    nodes,
    edges: Array.from(edgeMap.values()),
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export default {
  extractConcepts,
  extractConceptsWithSemantics,
  mergeConceptData,
  preprocessText,
}
