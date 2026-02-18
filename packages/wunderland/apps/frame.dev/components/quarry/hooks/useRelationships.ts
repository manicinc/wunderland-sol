/**
 * Knowledge Relationship Hook
 * 
 * Provides functionality for managing and visualizing strand relationships:
 * - Relationship resolution and graph building
 * - Path finding between strands
 * - Clustering and community detection
 * - Graph data preparation for D3 visualization
 * 
 * @module hooks/useRelationships
 */

'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import type {
  RelationshipType,
  RelationshipRef,
  EnhancedRelationships,
  GraphNode,
  GraphEdge,
  KnowledgeGraph,
  RelationshipVisuals
} from '@/types/openstrand'
import { RELATIONSHIP_VISUALS } from '@/types/openstrand'

/**
 * Strand data with relationships
 */
export interface StrandWithRelationships {
  slug: string
  title: string
  path: string
  level: 'fabric' | 'weave' | 'loom' | 'strand'
  relationships?: EnhancedRelationships
  metadata?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    tags?: string[]
    subjects?: string[]
    topics?: string[]
  }
}

/**
 * Graph layout options
 */
export interface GraphLayoutOptions {
  /** Force simulation strength */
  forceStrength?: number
  /** Link distance */
  linkDistance?: number
  /** Charge strength (negative = repel) */
  chargeStrength?: number
  /** Center force strength */
  centerStrength?: number
  /** Collision radius */
  collisionRadius?: number
}

/**
 * Hook options
 */
interface UseRelationshipsOptions {
  strands?: StrandWithRelationships[]
  layoutOptions?: GraphLayoutOptions
}

/**
 * Build an adjacency map from strands
 */
function buildAdjacencyMap(
  strands: StrandWithRelationships[]
): Map<string, { outgoing: RelationshipRef[]; incoming: RelationshipRef[] }> {
  const adjacencyMap = new Map<string, { outgoing: RelationshipRef[]; incoming: RelationshipRef[] }>()

  // Initialize all strands
  for (const strand of strands) {
    if (!adjacencyMap.has(strand.slug)) {
      adjacencyMap.set(strand.slug, { outgoing: [], incoming: [] })
    }
  }

  // Build relationships
  for (const strand of strands) {
    if (!strand.relationships) continue

    const types: RelationshipType[] = [
      'follows', 'requires', 'extends', 'contradicts', 'examples',
      'summarizes', 'implements', 'questions', 'references', 'related'
    ]

    for (const type of types) {
      const refs = strand.relationships[type]
      if (!refs) continue

      for (const ref of refs) {
        // Add outgoing relationship
        const entry = adjacencyMap.get(strand.slug)
        if (entry) {
          entry.outgoing.push({ ...ref, type })
        }

        // Add incoming relationship to target
        const targetEntry = adjacencyMap.get(ref.targetSlug)
        if (targetEntry) {
          const incomingRef: RelationshipRef = {
            targetSlug: strand.slug,
            type: ref.bidirectional && ref.reverseType ? ref.reverseType : type,
            strength: ref.strength,
            bidirectional: ref.bidirectional
          }
          targetEntry.incoming.push(incomingRef)
        }
      }
    }
  }

  return adjacencyMap
}

/**
 * Build graph data structure for visualization
 */
function buildGraphData(
  strands: StrandWithRelationships[],
  adjacencyMap: Map<string, { outgoing: RelationshipRef[]; incoming: RelationshipRef[] }>
): KnowledgeGraph {
  // Create nodes
  const nodes: GraphNode[] = strands.map(strand => {
    const connections = adjacencyMap.get(strand.slug)
    const totalConnections = connections 
      ? connections.outgoing.length + connections.incoming.length 
      : 0

    return {
      id: strand.slug,
      slug: strand.slug,
      title: strand.title,
      level: strand.level,
      size: Math.max(10, Math.min(50, 10 + totalConnections * 3)),
      color: getLevelColor(strand.level),
      state: 'default',
      metadata: {
        difficulty: strand.metadata?.difficulty,
        tags: strand.metadata?.tags
      }
    }
  })

  // Create edges
  const edges: GraphEdge[] = []
  const edgeSet = new Set<string>() // Prevent duplicates

  for (const strand of strands) {
    const connections = adjacencyMap.get(strand.slug)
    if (!connections) continue

    for (const ref of connections.outgoing) {
      const edgeId = `${strand.slug}-${ref.targetSlug}-${ref.type}`
      const reverseEdgeId = `${ref.targetSlug}-${strand.slug}-${ref.type}`

      // Skip if already added (for bidirectional)
      if (edgeSet.has(edgeId) || edgeSet.has(reverseEdgeId)) continue
      edgeSet.add(edgeId)

      edges.push({
        id: edgeId,
        source: strand.slug,
        target: ref.targetSlug,
        type: ref.type,
        strength: ref.strength ?? 0.5,
        visuals: RELATIONSHIP_VISUALS[ref.type],
        state: 'default'
      })
    }
  }

  return { nodes, edges }
}

/**
 * Get color for node level
 */
function getLevelColor(level: 'fabric' | 'weave' | 'loom' | 'strand'): string {
  const colors = {
    fabric: '#8B5CF6',  // Purple
    weave: '#00C896',   // Green
    loom: '#3B82F6',    // Blue
    strand: '#F59E0B'   // Amber
  }
  return colors[level]
}

/**
 * Find shortest path between two nodes using BFS
 */
function findShortestPath(
  fromSlug: string,
  toSlug: string,
  adjacencyMap: Map<string, { outgoing: RelationshipRef[]; incoming: RelationshipRef[] }>
): string[] | null {
  if (fromSlug === toSlug) return [fromSlug]

  const visited = new Set<string>()
  const queue: { slug: string; path: string[] }[] = [{ slug: fromSlug, path: [fromSlug] }]

  while (queue.length > 0) {
    const { slug, path } = queue.shift()!
    
    if (visited.has(slug)) continue
    visited.add(slug)

    const connections = adjacencyMap.get(slug)
    if (!connections) continue

    // Check all connected nodes
    const neighbors = [
      ...connections.outgoing.map(r => r.targetSlug),
      ...connections.incoming.map(r => r.targetSlug)
    ]

    for (const neighbor of neighbors) {
      if (neighbor === toSlug) {
        return [...path, neighbor]
      }
      if (!visited.has(neighbor)) {
        queue.push({ slug: neighbor, path: [...path, neighbor] })
      }
    }
  }

  return null
}

/**
 * Find all paths between two nodes (up to a maximum depth)
 */
function findAllPaths(
  fromSlug: string,
  toSlug: string,
  adjacencyMap: Map<string, { outgoing: RelationshipRef[]; incoming: RelationshipRef[] }>,
  maxDepth: number = 5
): string[][] {
  const paths: string[][] = []

  function dfs(current: string, path: string[], depth: number) {
    if (depth > maxDepth) return
    if (current === toSlug) {
      paths.push([...path])
      return
    }

    const connections = adjacencyMap.get(current)
    if (!connections) return

    const neighbors = [
      ...connections.outgoing.map(r => r.targetSlug),
      ...connections.incoming.map(r => r.targetSlug)
    ]

    for (const neighbor of neighbors) {
      if (!path.includes(neighbor)) {
        path.push(neighbor)
        dfs(neighbor, path, depth + 1)
        path.pop()
      }
    }
  }

  dfs(fromSlug, [fromSlug], 0)
  return paths
}

/**
 * Community detection using Louvain algorithm (graphology)
 * Falls back to label propagation if graphology fails to load
 */
function detectCommunities(
  adjacencyMap: Map<string, { outgoing: RelationshipRef[]; incoming: RelationshipRef[] }>
): Map<string, number> {
  const labels = new Map<string, number>()
  const slugs = Array.from(adjacencyMap.keys())

  // Try to use Louvain algorithm via graphology
  try {
    // Dynamic import to avoid SSR issues
    const Graph = require('graphology')
    const louvain = require('graphology-communities-louvain')

    // Build graphology graph from adjacency map
    const graph = new Graph.UndirectedGraph()

    // Add nodes
    for (const slug of slugs) {
      graph.addNode(slug)
    }

    // Add edges with weights based on relationship strength
    const edgeSet = new Set<string>()
    for (const [slug, connections] of adjacencyMap) {
      for (const ref of connections.outgoing) {
        const edgeKey = [slug, ref.targetSlug].sort().join('|')
        if (!edgeSet.has(edgeKey) && graph.hasNode(ref.targetSlug)) {
          edgeSet.add(edgeKey)
          graph.addEdge(slug, ref.targetSlug, { weight: ref.strength ?? 0.5 })
        }
      }
    }

    // Run Louvain algorithm
    const communities = louvain(graph, { resolution: 1.0 })

    // Convert to our format
    for (const [node, community] of Object.entries(communities)) {
      labels.set(node, community as number)
    }

    return labels
  } catch (error) {
    // Fallback to simple label propagation if graphology not available
    console.warn('[useRelationships] Louvain unavailable, using label propagation:', error)
  }

  // Fallback: Label propagation algorithm
  slugs.forEach((slug, i) => labels.set(slug, i))

  let changed = true
  let iterations = 0
  const maxIterations = 10

  while (changed && iterations < maxIterations) {
    changed = false
    iterations++

    for (const slug of slugs) {
      const connections = adjacencyMap.get(slug)
      if (!connections) continue

      const labelCounts = new Map<number, number>()
      const neighbors = [
        ...connections.outgoing.map(r => r.targetSlug),
        ...connections.incoming.map(r => r.targetSlug)
      ]

      for (const neighbor of neighbors) {
        const neighborLabel = labels.get(neighbor)
        if (neighborLabel !== undefined) {
          labelCounts.set(neighborLabel, (labelCounts.get(neighborLabel) || 0) + 1)
        }
      }

      let maxCount = 0
      let maxLabel = labels.get(slug)!
      for (const [label, count] of labelCounts) {
        if (count > maxCount) {
          maxCount = count
          maxLabel = label
        }
      }

      if (maxLabel !== labels.get(slug)) {
        labels.set(slug, maxLabel)
        changed = true
      }
    }
  }

  return labels
}

/**
 * Main relationships hook
 */
export function useRelationships(options: UseRelationshipsOptions = {}) {
  const { strands = [], layoutOptions = {} } = options

  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [highlightedPath, setHighlightedPath] = useState<string[]>([])
  const [filters, setFilters] = useState<{
    relationshipTypes: RelationshipType[]
    levels: ('fabric' | 'weave' | 'loom' | 'strand')[]
    minStrength: number
  }>({
    relationshipTypes: [],
    levels: [],
    minStrength: 0
  })

  // Build adjacency map
  const adjacencyMap = useMemo(() => {
    return buildAdjacencyMap(strands)
  }, [strands])

  // Build graph data
  const graphData = useMemo(() => {
    return buildGraphData(strands, adjacencyMap)
  }, [strands, adjacencyMap])

  // Apply filters to graph
  const filteredGraph = useMemo(() => {
    let { nodes, edges } = graphData

    // Filter by level
    if (filters.levels.length > 0) {
      nodes = nodes.filter(n => filters.levels.includes(n.level))
      const nodeIds = new Set(nodes.map(n => n.id))
      edges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    }

    // Filter by relationship type
    if (filters.relationshipTypes.length > 0) {
      edges = edges.filter(e => filters.relationshipTypes.includes(e.type))
    }

    // Filter by minimum strength
    if (filters.minStrength > 0) {
      edges = edges.filter(e => e.strength >= filters.minStrength)
    }

    // Update node states based on selection
    if (selectedNode) {
      const connectedNodes = new Set<string>()
      connectedNodes.add(selectedNode)
      
      for (const edge of edges) {
        if (edge.source === selectedNode || edge.target === selectedNode) {
          connectedNodes.add(edge.source)
          connectedNodes.add(edge.target)
        }
      }

      nodes = nodes.map(n => ({
        ...n,
        state: n.id === selectedNode 
          ? 'selected' 
          : connectedNodes.has(n.id) 
            ? 'highlighted' 
            : 'dimmed'
      } as GraphNode))

      edges = edges.map(e => ({
        ...e,
        state: e.source === selectedNode || e.target === selectedNode
          ? 'highlighted'
          : 'dimmed'
      } as GraphEdge))
    }

    // Apply path highlighting
    if (highlightedPath.length > 1) {
      const pathSet = new Set(highlightedPath)
      const pathEdges = new Set<string>()
      
      for (let i = 0; i < highlightedPath.length - 1; i++) {
        pathEdges.add(`${highlightedPath[i]}-${highlightedPath[i + 1]}`)
        pathEdges.add(`${highlightedPath[i + 1]}-${highlightedPath[i]}`)
      }

      nodes = nodes.map(n => ({
        ...n,
        state: pathSet.has(n.id) ? 'highlighted' : 'dimmed'
      } as GraphNode))

      edges = edges.map(e => ({
        ...e,
        state: pathEdges.has(`${e.source}-${e.target}`) ? 'highlighted' : 'dimmed'
      } as GraphEdge))
    }

    return { nodes, edges } as KnowledgeGraph
  }, [graphData, filters, selectedNode, highlightedPath])

  // Detect communities
  const communities = useMemo(() => {
    const labels = detectCommunities(adjacencyMap)
    const communityMap = new Map<number, string[]>()
    
    for (const [slug, label] of labels) {
      if (!communityMap.has(label)) {
        communityMap.set(label, [])
      }
      communityMap.get(label)!.push(slug)
    }

    return Array.from(communityMap.entries()).map(([id, nodeIds]) => ({
      id: `community-${id}`,
      nodeIds,
      label: `Community ${id + 1}`,
      color: `hsl(${(id * 137.5) % 360}, 70%, 50%)`
    }))
  }, [adjacencyMap])

  /**
   * Get relationships for a specific strand
   */
  const getRelationships = useCallback((slug: string) => {
    return adjacencyMap.get(slug)
  }, [adjacencyMap])

  /**
   * Find shortest path between two strands
   */
  const findPath = useCallback((fromSlug: string, toSlug: string) => {
    return findShortestPath(fromSlug, toSlug, adjacencyMap)
  }, [adjacencyMap])

  /**
   * Find all paths between two strands
   */
  const findPaths = useCallback((fromSlug: string, toSlug: string, maxDepth?: number) => {
    return findAllPaths(fromSlug, toSlug, adjacencyMap, maxDepth)
  }, [adjacencyMap])

  /**
   * Highlight a path in the graph
   */
  const highlightPath = useCallback((path: string[] | null) => {
    setHighlightedPath(path || [])
    setSelectedNode(null)
  }, [])

  /**
   * Select a node
   */
  const selectNode = useCallback((slug: string | null) => {
    setSelectedNode(slug)
    setHighlightedPath([])
  }, [])

  /**
   * Update filters
   */
  const updateFilters = useCallback((
    newFilters: Partial<typeof filters>
  ) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  /**
   * Get connected strands for a given strand
   */
  const getConnectedStrands = useCallback((slug: string): {
    outgoing: { slug: string; type: RelationshipType; strength: number }[]
    incoming: { slug: string; type: RelationshipType; strength: number }[]
  } => {
    const connections = adjacencyMap.get(slug)
    if (!connections) return { outgoing: [], incoming: [] }

    return {
      outgoing: connections.outgoing.map(r => ({
        slug: r.targetSlug,
        type: r.type,
        strength: r.strength ?? 0.5
      })),
      incoming: connections.incoming.map(r => ({
        slug: r.targetSlug,
        type: r.type,
        strength: r.strength ?? 0.5
      }))
    }
  }, [adjacencyMap])

  /**
   * Get relationship visuals
   */
  const getRelationshipVisuals = useCallback((type: RelationshipType): RelationshipVisuals => {
    return RELATIONSHIP_VISUALS[type]
  }, [])

  /**
   * Calculate graph statistics
   */
  const graphStats = useMemo(() => {
    const nodeCount = graphData.nodes.length
    const edgeCount = graphData.edges.length
    const avgConnections = nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0
    
    // Count by level
    const byLevel = graphData.nodes.reduce((acc, n) => {
      acc[n.level] = (acc[n.level] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Count by relationship type
    const byType = graphData.edges.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      nodeCount,
      edgeCount,
      avgConnections: Math.round(avgConnections * 10) / 10,
      communityCount: communities.length,
      byLevel,
      byType
    }
  }, [graphData, communities])

  return {
    // Graph data
    graphData: filteredGraph,
    communities,
    graphStats,

    // Selection state
    selectedNode,
    highlightedPath,
    filters,

    // Actions
    selectNode,
    highlightPath,
    updateFilters,

    // Queries
    getRelationships,
    getConnectedStrands,
    findPath,
    findPaths,
    getRelationshipVisuals,

    // Layout options
    layoutOptions: {
      forceStrength: layoutOptions.forceStrength ?? -100,
      linkDistance: layoutOptions.linkDistance ?? 100,
      chargeStrength: layoutOptions.chargeStrength ?? -300,
      centerStrength: layoutOptions.centerStrength ?? 0.05,
      collisionRadius: layoutOptions.collisionRadius ?? 30
    }
  }
}

