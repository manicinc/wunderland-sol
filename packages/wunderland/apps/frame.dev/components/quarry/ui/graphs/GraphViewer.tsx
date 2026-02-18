/**
 * Graph Viewer Component
 * @module components/quarry/ui/GraphViewer
 *
 * Embedded D3 force-directed graph visualization for strand relationships
 * Simplified inline version based on StrandMindMap
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode, GraphLink } from '@/hooks/useMindmapGeneration'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
═══════════════════════════════════════════════════════════════════════════ */

export interface GraphViewerProps {
  graphData: GraphData
  isDark?: boolean
  height?: number
  className?: string
}

interface D3GraphNode extends GraphNode {
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

interface D3GraphLink {
  source: D3GraphNode | string
  target: D3GraphNode | string
  type: 'hierarchy' | 'reference' | 'prerequisite' | 'tag'
  strength: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   VISUALIZATION CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const NODE_COLORS = {
  current: '#06b6d4',      // Cyan
  parent: '#8b5cf6',       // Purple
  child: '#22c55e',        // Green
  sibling: '#94a3b8',      // Slate
  prerequisite: '#f59e0b', // Amber
  reference: '#3b82f6',    // Blue
  'tag-related': '#ec4899', // Pink
}

const LINK_COLORS = {
  hierarchy: '#94a3b8',
  reference: '#3b82f6',
  prerequisite: '#f59e0b',
  tag: '#ec4899',
}

// Difficulty-based node sizing
const DIFFICULTY_SIZES = {
  beginner: 12,
  intermediate: 15,
  advanced: 18,
  expert: 21,
}

/**
 * Calculate node radius based on difficulty and type
 */
function getNodeRadius(node: D3GraphNode): number {
  // Current node is always larger
  if (node.type === 'current') return 20

  // Use difficulty if available
  if (node.difficulty) {
    const difficulty = node.difficulty.toLowerCase()
    if (difficulty in DIFFICULTY_SIZES) {
      return DIFFICULTY_SIZES[difficulty as keyof typeof DIFFICULTY_SIZES]
    }
  }

  // Default size
  return 15
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function GraphViewer({
  graphData,
  isDark = false,
  height = 600,
  className = '',
}: GraphViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    content: string
    visible: boolean
  }>({ x: 0, y: 0, content: '', visible: false })

  useEffect(() => {
    if (!svgRef.current || !graphData.nodes.length) return

    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth
    const containerHeight = height

    // Clear previous content
    svg.selectAll('*').remove()

    // Create main group with zoom behavior
    const g = svg.append('g')

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom as any)

    // Prepare data
    const nodes: D3GraphNode[] = graphData.nodes.map(n => ({ ...n }))
    const links: D3GraphLink[] = graphData.links.map(l => ({ ...l }))

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(100)
        .strength((d: any) => d.strength || 0.5)
      )
      .force('charge', d3.forceManyBody()
        .strength(-400)
        .distanceMax(500)
      )
      .force('center', d3.forceCenter(width / 2, containerHeight / 2))
      .force('collision', d3.forceCollide()
        .radius((d: any) => getNodeRadius(d) + 10)
      )

    // Create link lines
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: D3GraphLink) => {
        const color = LINK_COLORS[d.type as keyof typeof LINK_COLORS] || LINK_COLORS.hierarchy
        return isDark ? color : d3.color(color)?.darker(0.3)?.toString() || color
      })
      .attr('stroke-width', (d: D3GraphLink) => 2 * (d.strength || 0.5))
      .attr('stroke-opacity', isDark ? 0.5 : 0.4)
      .attr('stroke-dasharray', (d: D3GraphLink) => {
        return d.type === 'reference' ? '4,4' : '0'
      })

    // Create node groups
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<SVGGElement, D3GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any
      )

    // Add circles to nodes
    node.append('circle')
      .attr('r', (d: D3GraphNode) => getNodeRadius(d))
      .attr('fill', (d: D3GraphNode) => {
        const color = NODE_COLORS[d.type as keyof typeof NODE_COLORS] || NODE_COLORS.sibling
        return color
      })
      .attr('stroke', isDark ? '#18181b' : '#ffffff')
      .attr('stroke-width', (d: D3GraphNode) => d.type === 'current' ? 3 : 2)
      .style('cursor', 'pointer')

    // Add labels to nodes
    node.append('text')
      .text((d: D3GraphNode) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', (d: D3GraphNode) => getNodeRadius(d) + 10)
      .attr('font-size', (d: D3GraphNode) => d.type === 'current' ? '13px' : '11px')
      .attr('font-weight', (d: D3GraphNode) => d.type === 'current' ? '600' : '500')
      .attr('fill', isDark ? '#e4e4e7' : '#27272a')
      .attr('pointer-events', 'none')
      .style('user-select', 'none')

    // Add tooltips
    node.on('mouseenter', function(event, d: D3GraphNode) {
      const baseRadius = getNodeRadius(d)
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('r', baseRadius + 3)

      const tooltipContent = [
        `<strong>${d.name}</strong>`,
        `Type: ${d.type}`,
        d.difficulty ? `Difficulty: ${d.difficulty}` : null,
        d.subject ? `Subject: ${d.subject}` : null,
        `Path: ${d.path}`,
      ].filter(Boolean).join('<br/>')

      setTooltip({
        x: event.pageX,
        y: event.pageY,
        content: tooltipContent,
        visible: true,
      })
    })

    node.on('mouseleave', function(event, d: D3GraphNode) {
      const baseRadius = getNodeRadius(d)
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('r', baseRadius)

      setTooltip(prev => ({ ...prev, visible: false }))
    })

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    // Drag functions
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: any) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [graphData, isDark, height])

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        className={`rounded-xl ${isDark ? 'bg-zinc-900/50' : 'bg-white'}`}
        style={{ border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7' }}
      />

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className={`
            fixed z-50 px-3 py-2 text-xs rounded-lg shadow-lg pointer-events-none
            ${isDark
              ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
              : 'bg-white text-zinc-700 border border-zinc-300'
            }
          `}
          style={{
            left: tooltip.x + 10,
            top: tooltip.y + 10,
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}

      {/* Legend */}
      <div
        className={`
          absolute bottom-4 left-4 px-4 py-3 rounded-lg text-xs
          ${isDark
            ? 'bg-zinc-800/90 border border-zinc-700'
            : 'bg-white/90 border border-zinc-300'
          }
        `}
      >
        <p className={`font-semibold mb-2 ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
          Node Types
        </p>
        <div className="space-y-1.5">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div
        className={`
          absolute top-4 left-4 px-3 py-2 rounded-lg text-xs
          ${isDark
            ? 'bg-zinc-800/90 border border-zinc-700'
            : 'bg-white/90 border border-zinc-300'
          }
        `}
      >
        <p className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
          {graphData.nodes.length} strands • {graphData.links.length} relationships
        </p>
      </div>

      {/* Controls hint */}
      <div
        className={`
          absolute top-4 right-4 px-3 py-2 rounded-lg text-xs
          ${isDark
            ? 'bg-zinc-800/90 text-zinc-400 border border-zinc-700'
            : 'bg-white/90 text-zinc-600 border border-zinc-300'
          }
        `}
      >
        <p>🖱️ Drag nodes • 🔍 Scroll to zoom • ⌘ Drag to pan</p>
      </div>
    </div>
  )
}
