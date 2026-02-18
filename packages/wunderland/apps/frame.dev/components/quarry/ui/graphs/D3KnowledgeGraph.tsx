/**
 * D3 Knowledge Graph Visualization
 * 
 * Interactive force-directed graph for visualizing knowledge relationships:
 * - Force simulation with physics
 * - Node clustering by level
 * - Edge styling by relationship type
 * - Zoom/pan controls
 * - Node selection and path highlighting
 * - Performance optimizations for large graphs
 * 
 * @module components/quarry/ui/D3KnowledgeGraph
 */

'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Filter,
  Search,
  X,
  Info,
  Eye,
  EyeOff,
  Layers
} from 'lucide-react'
import type { 
  GraphNode, 
  GraphEdge, 
  KnowledgeGraph,
  RelationshipType
} from '@/types/openstrand'
import { RELATIONSHIP_VISUALS } from '@/types/openstrand'

// ============================================================================
// TYPES
// ============================================================================

interface D3KnowledgeGraphProps {
  /** Graph data */
  data: KnowledgeGraph
  /** Width of the container */
  width?: number
  /** Height of the container */
  height?: number
  /** Callback when a node is clicked */
  onNodeClick?: (node: GraphNode) => void
  /** Callback when a node is hovered */
  onNodeHover?: (node: GraphNode | null) => void
  /** Callback when an edge is clicked */
  onEdgeClick?: (edge: GraphEdge) => void
  /** Currently selected node ID */
  selectedNodeId?: string | null
  /** Highlighted path (node IDs) */
  highlightedPath?: string[]
  /** Filter settings */
  filters?: {
    levels?: ('fabric' | 'weave' | 'loom' | 'strand')[]
    relationshipTypes?: RelationshipType[]
    minStrength?: number
  }
  /** Custom class name */
  className?: string
}

interface SimulationNode extends GraphNode {
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

interface SimulationEdge extends Omit<GraphEdge, 'source' | 'target'> {
  source: SimulationNode | string
  target: SimulationNode | string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LEVEL_COLORS = {
  fabric: '#8B5CF6',  // Purple
  weave: '#00C896',   // Green
  loom: '#3B82F6',    // Blue
  strand: '#F59E0B'   // Amber
}

const LEVEL_SIZES = {
  fabric: 30,
  weave: 24,
  loom: 18,
  strand: 12
}

const DEFAULT_LINK_DISTANCE = 100
const DEFAULT_CHARGE_STRENGTH = -300
const DEFAULT_CENTER_STRENGTH = 0.05
const DEFAULT_COLLISION_RADIUS = 30

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getNodeColor(level: GraphNode['level']): string {
  return LEVEL_COLORS[level] || '#6B7280'
}

function getNodeSize(level: GraphNode['level'], connectionCount: number): number {
  const baseSize = LEVEL_SIZES[level] || 12
  // Slightly increase size based on connections
  return baseSize + Math.min(connectionCount * 0.5, 10)
}

function getEdgeStyle(type: RelationshipType): {
  stroke: string
  strokeDasharray: string
  strokeWidth: number
} {
  const visuals = RELATIONSHIP_VISUALS[type]
  const dasharray = visuals.lineStyle === 'solid' ? 'none' 
    : visuals.lineStyle === 'dashed' ? '8,4' 
    : '2,2'
  
  return {
    stroke: visuals.color,
    strokeDasharray: dasharray,
    strokeWidth: 2
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function D3KnowledgeGraph({
  data,
  width: containerWidth,
  height: containerHeight,
  onNodeClick,
  onNodeHover,
  onEdgeClick,
  selectedNodeId,
  highlightedPath = [],
  filters = {},
  className = ''
}: D3KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationEdge> | null>(null)

  // State
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Filtered data
  const filteredData = useMemo(() => {
    let nodes = [...data.nodes]
    let edges = [...data.edges]

    // Filter by level
    if (filters.levels && filters.levels.length > 0) {
      nodes = nodes.filter(n => filters.levels!.includes(n.level))
      const nodeIds = new Set(nodes.map(n => n.id))
      edges = edges.filter(e => nodeIds.has(e.source as string) && nodeIds.has(e.target as string))
    }

    // Filter by relationship type
    if (filters.relationshipTypes && filters.relationshipTypes.length > 0) {
      edges = edges.filter(e => filters.relationshipTypes!.includes(e.type))
    }

    // Filter by minimum strength
    if (filters.minStrength && filters.minStrength > 0) {
      edges = edges.filter(e => e.strength >= filters.minStrength!)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      nodes = nodes.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.slug.toLowerCase().includes(query)
      )
      const nodeIds = new Set(nodes.map(n => n.id))
      edges = edges.filter(e => nodeIds.has(e.source as string) && nodeIds.has(e.target as string))
    }

    return { nodes, edges } as KnowledgeGraph
  }, [data, filters, searchQuery])

  // Helper to extract ID from D3-mutated source/target (can be string or node object)
  const getNodeId = (ref: string | { id: string } | unknown): string => {
    if (typeof ref === 'string') return ref
    if (ref && typeof ref === 'object' && 'id' in ref) return (ref as { id: string }).id
    return String(ref)
  }

  // Connection counts for sizing
  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const edge of filteredData.edges) {
      const sourceId = getNodeId(edge.source)
      const targetId = getNodeId(edge.target)
      counts[sourceId] = (counts[sourceId] || 0) + 1
      counts[targetId] = (counts[targetId] || 0) + 1
    }
    return counts
  }, [filteredData.edges])

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: containerWidth || rect.width || 800,
          height: containerHeight || rect.height || 600
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [containerWidth, containerHeight])

  // Initialize and update simulation
  useEffect(() => {
    if (!svgRef.current || filteredData.nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    const { width, height } = dimensions

    // Clear previous content
    svg.selectAll('*').remove()

    // Create container groups
    const g = svg.append('g').attr('class', 'graph-container')
    const linksGroup = g.append('g').attr('class', 'links')
    const nodesGroup = g.append('g').attr('class', 'nodes')
    const labelsGroup = g.append('g').attr('class', 'labels')

    // Create simulation
    const simulation = d3.forceSimulation<SimulationNode>(filteredData.nodes as SimulationNode[])
      .force('link', d3.forceLink<SimulationNode, SimulationEdge>(filteredData.edges as SimulationEdge[])
        .id(d => d.id)
        .distance(DEFAULT_LINK_DISTANCE)
        .strength(d => d.strength || 0.5)
      )
      .force('charge', d3.forceManyBody().strength(DEFAULT_CHARGE_STRENGTH))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(DEFAULT_CENTER_STRENGTH))
      .force('collision', d3.forceCollide().radius(DEFAULT_COLLISION_RADIUS))

    simulationRef.current = simulation

    // Create links
    const links = linksGroup.selectAll('line')
      .data(filteredData.edges)
      .join('line')
      .attr('class', 'link')
      .each(function(d) {
        const style = getEdgeStyle(d.type)
        d3.select(this)
          .attr('stroke', style.stroke)
          .attr('stroke-width', style.strokeWidth)
          .attr('stroke-dasharray', style.strokeDasharray)
          .attr('stroke-opacity', 0.6)
          .attr('cursor', 'pointer')
      })
      .on('click', (event, d) => {
        event.stopPropagation()
        onEdgeClick?.(d)
      })
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .attr('stroke-opacity', 1)
          .attr('stroke-width', 3)
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', 2)
      })

    // Create nodes
    const nodes = nodesGroup.selectAll('circle')
      .data(filteredData.nodes as SimulationNode[])
      .join('circle')
      .attr('class', 'node')
      .attr('r', d => getNodeSize(d.level, connectionCounts[d.id] || 0))
      .attr('fill', d => getNodeColor(d.level))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call(d3.drag<SVGCircleElement, SimulationNode>()
        .on('start', (event: d3.D3DragEvent<SVGCircleElement, SimulationNode, SimulationNode>, d: SimulationNode) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event: d3.D3DragEvent<SVGCircleElement, SimulationNode, SimulationNode>, d: SimulationNode) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event: d3.D3DragEvent<SVGCircleElement, SimulationNode, SimulationNode>, d: SimulationNode) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        }) as any
      )
      .on('click', (event, d) => {
        event.stopPropagation()
        onNodeClick?.(d)
      })
      .on('mouseenter', (event, d) => {
        setHoveredNode(d)
        onNodeHover?.(d)
        
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('r', getNodeSize(d.level, connectionCounts[d.id] || 0) * 1.3)
          .attr('stroke-width', 3)
      })
      .on('mouseleave', (event, d) => {
        setHoveredNode(null)
        onNodeHover?.(null)
        
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('r', getNodeSize(d.level, connectionCounts[d.id] || 0))
          .attr('stroke-width', 2)
      })

    // Detect dark mode from document class
    const isDark = document.documentElement.classList.contains('dark')

    // Create labels
    const labels = labelsGroup.selectAll('text')
      .data(filteredData.nodes as SimulationNode[])
      .join('text')
      .attr('class', 'label')
      .attr('text-anchor', 'middle')
      .attr('dy', d => getNodeSize(d.level, connectionCounts[d.id] || 0) + 12)
      .attr('font-size', 10)
      .attr('fill', isDark ? '#e2e8f0' : '#4B5563')
      .attr('pointer-events', 'none')
      .text(d => d.title.length > 20 ? d.title.slice(0, 20) + '...' : d.title)

    // Update positions on tick
    simulation.on('tick', () => {
      links
        .attr('x1', d => (d.source as unknown as SimulationNode).x || 0)
        .attr('y1', d => (d.source as unknown as SimulationNode).y || 0)
        .attr('x2', d => (d.target as unknown as SimulationNode).x || 0)
        .attr('y2', d => (d.target as unknown as SimulationNode).y || 0)

      nodes
        .attr('cx', d => d.x || 0)
        .attr('cy', d => d.y || 0)

      labels
        .attr('x', d => d.x || 0)
        .attr('y', d => d.y || 0)
    })

    // Setup zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        setTransform(event.transform)
        
        // Adjust label visibility based on zoom
        const scale = event.transform.k
        labels.attr('opacity', scale > 0.5 ? 1 : 0)
      })

    svg.call(zoom)

    // Apply initial transform
    svg.call(zoom.transform, transform)

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [filteredData, dimensions, connectionCounts, onNodeClick, onNodeHover, onEdgeClick])

  // Update highlighting
  useEffect(() => {
    if (!svgRef.current) return
    
    const svg = d3.select(svgRef.current)
    const highlightSet = new Set(highlightedPath)
    const pathEdges = new Set<string>()
    
    // Build edge set for path
    for (let i = 0; i < highlightedPath.length - 1; i++) {
      pathEdges.add(`${highlightedPath[i]}-${highlightedPath[i + 1]}`)
      pathEdges.add(`${highlightedPath[i + 1]}-${highlightedPath[i]}`)
    }

    // Update nodes
    svg.selectAll<SVGCircleElement, SimulationNode>('.node')
      .attr('opacity', (d) => {
        if (highlightedPath.length === 0 && !selectedNodeId) return 1
        if (selectedNodeId === d.id) return 1
        if (highlightSet.has(d.id)) return 1
        return 0.2
      })

    // Update links
    svg.selectAll<SVGLineElement, SimulationEdge>('.link')
      .attr('opacity', (d) => {
        if (highlightedPath.length === 0 && !selectedNodeId) return 0.6
        const sourceId = getNodeId(d.source)
        const targetId = getNodeId(d.target)
        if (pathEdges.has(`${sourceId}-${targetId}`)) return 1
        if (selectedNodeId && (sourceId === selectedNodeId || targetId === selectedNodeId)) return 0.8
        return 0.1
      })

    // Update labels
    svg.selectAll<SVGTextElement, SimulationNode>('.label')
      .attr('opacity', (d) => {
        if (transform.k < 0.5) return 0
        if (highlightedPath.length === 0 && !selectedNodeId) return 1
        if (selectedNodeId === d.id) return 1
        if (highlightSet.has(d.id)) return 1
        return 0.2
      })
  }, [selectedNodeId, highlightedPath, transform.k])

  // Zoom controls
  const handleZoom = useCallback((factor: number) => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    const zoom = d3.zoom<SVGSVGElement, unknown>()
    svg.transition().duration(300).call(zoom.scaleBy, factor)
  }, [])

  const handleResetView = useCallback(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    const zoom = d3.zoom<SVGSVGElement, unknown>()
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity)
  }, [])

  const handleFitToScreen = useCallback(() => {
    if (!svgRef.current || !simulationRef.current) return
    
    const nodes = filteredData.nodes as SimulationNode[]
    if (nodes.length === 0) return

    // Calculate bounds
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    
    for (const node of nodes) {
      if (node.x !== undefined && node.y !== undefined) {
        minX = Math.min(minX, node.x)
        maxX = Math.max(maxX, node.x)
        minY = Math.min(minY, node.y)
        maxY = Math.max(maxY, node.y)
      }
    }

    const padding = 50
    const graphWidth = maxX - minX + padding * 2
    const graphHeight = maxY - minY + padding * 2
    
    const scale = Math.min(
      dimensions.width / graphWidth,
      dimensions.height / graphHeight,
      2
    ) * 0.9

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    const svg = d3.select(svgRef.current)
    const zoom = d3.zoom<SVGSVGElement, unknown>()
    
    svg.transition()
      .duration(500)
      .call(zoom.transform, d3.zoomIdentity
        .translate(dimensions.width / 2, dimensions.height / 2)
        .scale(scale)
        .translate(-centerX, -centerY)
      )
  }, [filteredData.nodes, dimensions])

  return (
    <div 
      ref={containerRef} 
      className={`relative bg-paper-50 dark:bg-ink-900 rounded-xl overflow-hidden ${className}`}
      style={{ width: containerWidth || '100%', height: containerHeight || 600 }}
    >
      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />

      {/* Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-4 left-4 flex flex-col gap-2"
          >
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-2 w-48 bg-white dark:bg-ink-800 rounded-lg border border-paper-300 dark:border-ink-600 text-sm focus:outline-none focus:ring-2 focus:ring-frame-green"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Zoom controls */}
            <div className="flex gap-1 bg-white dark:bg-ink-800 rounded-lg shadow-md p-1">
              <button
                onClick={() => handleZoom(1.5)}
                className="p-2 text-ink-600 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-ink-700 rounded-md"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom(0.67)}
                className="p-2 text-ink-600 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-ink-700 rounded-md"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleFitToScreen}
                className="p-2 text-ink-600 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-ink-700 rounded-md"
                title="Fit to screen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetView}
                className="p-2 text-ink-600 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-ink-700 rounded-md"
                title="Reset view"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Legend toggle */}
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-ink-800 rounded-lg shadow-md text-sm text-ink-600 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-ink-700"
            >
              <Layers className="w-4 h-4" />
              Legend
              {showLegend ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle controls button */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="absolute top-4 right-4 p-2 bg-white dark:bg-ink-800 rounded-lg shadow-md text-ink-600 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-ink-700"
      >
        {showControls ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>

      {/* Legend */}
      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 bg-white dark:bg-ink-800 rounded-lg shadow-md p-4 max-w-xs"
          >
            <h4 className="font-semibold text-ink-800 dark:text-paper-100 mb-3 text-sm">
              Legend
            </h4>
            
            {/* Node types */}
            <div className="mb-4">
              <div className="text-xs text-ink-500 dark:text-paper-400 mb-2">Node Types</div>
              <div className="grid grid-cols-2 gap-2">
                {(['fabric', 'weave', 'loom', 'strand'] as const).map((level) => (
                  <div key={level} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: LEVEL_COLORS[level] }}
                    />
                    <span className="text-xs text-ink-600 dark:text-paper-300 capitalize">
                      {level}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Relationship types */}
            <div>
              <div className="text-xs text-ink-500 dark:text-paper-400 mb-2">Relationships</div>
              <div className="space-y-1">
                {(['follows', 'requires', 'extends', 'related'] as RelationshipType[]).map((type) => {
                  const style = getEdgeStyle(type)
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <svg width="20" height="10">
                        <line
                          x1="0" y1="5" x2="20" y2="5"
                          stroke={style.stroke}
                          strokeWidth={2}
                          strokeDasharray={style.strokeDasharray}
                        />
                      </svg>
                      <span className="text-xs text-ink-600 dark:text-paper-300 capitalize">
                        {type}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Node tooltip */}
      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-4 right-16 bg-white dark:bg-ink-800 rounded-lg shadow-lg p-4 max-w-xs pointer-events-none"
          >
            <div className="flex items-start gap-3">
              <div 
                className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: getNodeColor(hoveredNode.level) }}
              />
              <div>
                <h4 className="font-semibold text-ink-800 dark:text-paper-100">
                  {hoveredNode.title}
                </h4>
                <div className="text-xs text-ink-500 dark:text-paper-400 mt-1 space-y-1">
                  <div>Type: <span className="capitalize">{hoveredNode.level}</span></div>
                  <div>Connections: {connectionCounts[hoveredNode.id] || 0}</div>
                  {hoveredNode.metadata?.difficulty && (
                    <div>Difficulty: <span className="capitalize">{hoveredNode.metadata.difficulty}</span></div>
                  )}
                  {hoveredNode.metadata?.tags && hoveredNode.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {hoveredNode.metadata.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-paper-200 dark:bg-ink-600 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="absolute bottom-4 right-4 text-xs text-ink-400 dark:text-paper-500">
        {filteredData.nodes.length} nodes • {filteredData.edges.length} edges
        {transform.k !== 1 && ` • ${Math.round(transform.k * 100)}%`}
      </div>

      {/* Empty state */}
      {filteredData.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Info className="w-12 h-12 text-ink-300 dark:text-ink-600 mx-auto mb-3" />
            <p className="text-ink-500 dark:text-paper-400">
              {searchQuery ? 'No nodes match your search' : 'No data to display'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default D3KnowledgeGraph


