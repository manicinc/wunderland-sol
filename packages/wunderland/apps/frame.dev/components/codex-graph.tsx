'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, Maximize2, Move, GitBranch, Eye, Layers, Loader2 } from 'lucide-react'
import * as d3 from 'd3'
import { useGithubTree } from '@/components/quarry/hooks/useGithubTree'
import type { KnowledgeTreeNode } from '@/components/quarry/types'

interface GraphNode {
  id: string
  name: string
  type: 'weave' | 'loom' | 'strand'
  group: number
  metadata?: {
    description?: string
    url?: string
  }
}

interface GraphLink {
  source: string
  target: string
  type: 'contains' | 'references' | 'related'
  strength: number
}

interface CodexGraphProps {
  data?: {
    nodes: GraphNode[]
    links: GraphLink[]
  }
  onNodeClick?: (node: GraphNode) => void
  height?: number
}

// Convert knowledge tree to graph data
function treeToGraph(tree: KnowledgeTreeNode[]): { nodes: GraphNode[], links: GraphLink[] } {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  const seen = new Set<string>()

  function processNode(node: KnowledgeTreeNode, parentId?: string) {
    if (seen.has(node.path)) return
    seen.add(node.path)

    const nodeType = node.level === 'weave' ? 'weave'
      : node.level === 'loom' ? 'loom'
      : 'strand'

    // Only include weaves, looms, and strands (skip regular folders)
    if (nodeType === 'strand' && node.type === 'dir') return

    const graphNode: GraphNode = {
      id: node.path,
      name: node.name,
      type: nodeType,
      group: nodeType === 'weave' ? 0 : nodeType === 'loom' ? 1 : 2,
      metadata: {
        description: node.description,
        url: `/quarry/${node.path.replace(/\.md$/, '')}`,
      }
    }
    nodes.push(graphNode)

    if (parentId && seen.has(parentId)) {
      links.push({
        source: parentId,
        target: node.path,
        type: 'contains',
        strength: nodeType === 'strand' ? 0.6 : 0.9
      })
    }

    if (node.children) {
      for (const child of node.children) {
        processNode(child, node.path)
      }
    }
  }

  for (const rootNode of tree) {
    processNode(rootNode)
  }

  // Limit nodes for performance (max 100 nodes)
  if (nodes.length > 100) {
    const weaves = nodes.filter(n => n.type === 'weave')
    const looms = nodes.filter(n => n.type === 'loom').slice(0, 30)
    const strands = nodes.filter(n => n.type === 'strand').slice(0, 60)
    const limitedNodes = [...weaves, ...looms, ...strands]
    const limitedIds = new Set(limitedNodes.map(n => n.id))
    return {
      nodes: limitedNodes,
      links: links.filter(l => limitedIds.has(l.source as string) && limitedIds.has(l.target as string))
    }
  }

  return { nodes, links }
}

export default function CodexGraph({ data, onNodeClick, height = 600 }: CodexGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'force' | 'tree' | 'radial'>('force')
  const [showLabels, setShowLabels] = useState(true)
  const [zoom, setZoom] = useState(1)

  // Load tree data from GitHub
  const { tree, loading: treeLoading, totalWeaves, totalLooms, totalStrands } = useGithubTree()

  // Convert tree to graph data
  const treeGraphData = useMemo(() => {
    if (tree.length === 0) return null
    return treeToGraph(tree)
  }, [tree])

  const graphData = data || treeGraphData || { nodes: [], links: [] }
  const isLoading = treeLoading && !data && graphData.nodes.length === 0

  useEffect(() => {
    if (!svgRef.current) return

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)

    // Create zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        setZoom(event.transform.k)
      })

    svg.call(zoomBehavior as any)

    // Container for zoom
    const g = svg.append('g')

    // Define gradients
    const defs = svg.append('defs')
    
    // Weave gradient
    const weaveGradient = defs.append('radialGradient')
      .attr('id', 'weave-gradient')
    weaveGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#8B5CF6')
      .attr('stop-opacity', 0.8)
    weaveGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#7C3AED')
      .attr('stop-opacity', 0.6)

    // Loom gradient
    const loomGradient = defs.append('radialGradient')
      .attr('id', 'loom-gradient')
    loomGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3B82F6')
      .attr('stop-opacity', 0.8)
    loomGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#2563EB')
      .attr('stop-opacity', 0.6)

    // Strand gradient
    const strandGradient = defs.append('radialGradient')
      .attr('id', 'strand-gradient')
    strandGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#10B981')
      .attr('stop-opacity', 0.8)
    strandGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#059669')
      .attr('stop-opacity', 0.6)

    // Create force simulation
    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force('link', d3.forceLink(graphData.links)
        .id((d: any) => d.id)
        .distance((d: any) => viewMode === 'tree' ? 100 : 60 / d.strength))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => {
        return d.type === 'weave' ? 40 : d.type === 'loom' ? 30 : 20
      }))

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(graphData.links)
      .enter().append('line')
      .attr('stroke', (d: any) => {
        switch (d.type) {
          case 'contains': return '#6B7280'
          case 'references': return '#F59E0B'
          case 'related': return '#10B981'
          default: return '#9CA3AF'
        }
      })
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.sqrt(d.strength * 4))
      .attr('stroke-dasharray', (d: any) => d.type === 'references' ? '5,5' : null)

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(graphData.nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)

    // Node circles
    node.append('circle')
      .attr('r', (d: any) => {
        switch (d.type) {
          case 'weave': return 30
          case 'loom': return 22
          case 'strand': return 16
          default: return 20
        }
      })
      .attr('fill', (d: any) => {
        switch (d.type) {
          case 'weave': return 'url(#weave-gradient)'
          case 'loom': return 'url(#loom-gradient)'
          case 'strand': return 'url(#strand-gradient)'
          default: return '#6B7280'
        }
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('click', (event, d: any) => {
        setSelectedNode(d.id)
        if (onNodeClick) onNodeClick(d)
        if (d.metadata?.url) {
          const url: string = d.metadata.url
          if (url.startsWith('http')) {
            window.open(url, '_blank', 'noopener,noreferrer')
          } else {
            window.location.href = url
          }
        }
      })

    // Node labels
    if (showLabels) {
      node.append('text')
        .text((d: any) => d.name)
        .attr('text-anchor', 'middle')
        .attr('dy', (d: any) => {
          switch (d.type) {
            case 'weave': return 45
            case 'loom': return 35
            case 'strand': return 28
            default: return 30
          }
        })
        .attr('font-size', (d: any) => d.type === 'weave' ? '14px' : '12px')
        .attr('font-weight', (d: any) => d.type === 'weave' ? 'bold' : 'normal')
        .attr('fill', '#374151')
        .attr('class', 'select-none')
    }

    // Node icons
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('font-size', '16px')
      .attr('fill', '#fff')
      .text((d: any) => {
        switch (d.type) {
          case 'weave': return '🌐'
          case 'loom': return '🧵'
          case 'strand': return '📄'
          default: return '•'
        }
      })

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: any, d: any) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [graphData, viewMode, showLabels, height, onNodeClick])

  // Show loading state
  if (isLoading) {
    return (
      <div className="relative w-full bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden" style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading knowledge graph...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show empty state
  if (graphData.nodes.length === 0) {
    return (
      <div className="relative w-full bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden" style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">No knowledge data available</p>
            <p className="text-sm text-gray-400 mt-2">Try refreshing the page</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-1 flex items-center gap-1">
          <button
            onClick={() => setViewMode('force')}
            className={`p-2 rounded ${viewMode === 'force' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="Force-directed layout"
          >
            <GitBranch className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`p-2 rounded ${viewMode === 'tree' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="Tree layout"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`p-2 rounded ${showLabels ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="Toggle labels"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-1 text-sm">
          <span className="text-gray-500">Zoom:</span>
          <span className="ml-2 font-medium">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3">
        <div className="text-xs font-medium text-gray-500 mb-2">Knowledge Types ({graphData.nodes.length} nodes)</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
            <span className="text-xs">Weave ({graphData.nodes.filter(n => n.type === 'weave').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span className="text-xs">Loom ({graphData.nodes.filter(n => n.type === 'loom').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-xs">Strand ({graphData.nodes.filter(n => n.type === 'strand').length})</span>
          </div>
        </div>
      </div>

      {/* SVG Graph */}
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        className="w-full cursor-move"
        style={{ background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.05) 0%, transparent 50%)' }}
      />

      {/* Selected node info */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-xs"
        >
          {(() => {
            const node = graphData.nodes.find(n => n.id === selectedNode)
            if (!node) return null
            return (
              <>
                <h3 className="font-semibold mb-1">{node.name}</h3>
                {node.metadata?.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {node.metadata.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Click a node to open its documentation or Codex view.
                </p>
              </>
            )
          })()}
        </motion.div>
      )}
    </div>
  )
}
