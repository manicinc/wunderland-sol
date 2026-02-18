/**
 * Concept Map Viewer Component
 * @module components/quarry/ui/ConceptMapViewer
 *
 * D3 force-directed graph visualization for extracted concepts
 * Color-coded nodes by concept type with interactive features
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { ConceptData, ConceptNode, ConceptEdge } from '@/hooks/useMindmapGeneration'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
═══════════════════════════════════════════════════════════════════════════ */

export interface ConceptMapViewerProps {
  conceptData: ConceptData
  isDark?: boolean
  height?: number
  className?: string
}

interface D3Node extends ConceptNode {
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

interface D3Edge {
  source: D3Node | string
  target: D3Node | string
  type: 'related' | 'acts-on' | 'has-attribute'
  strength: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   VISUALIZATION CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const NODE_RADIUS_BASE = 8
const NODE_RADIUS_SCALE = 2

const EDGE_COLORS = {
  related: '#94a3b8',      // Slate
  'acts-on': '#10b981',    // Green
  'has-attribute': '#f59e0b', // Amber
}

const EDGE_WIDTHS = {
  related: 1.5,
  'acts-on': 2,
  'has-attribute': 1.5,
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function ConceptMapViewer({
  conceptData,
  isDark = false,
  height = 600,
  className = '',
}: ConceptMapViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    content: string
    visible: boolean
  }>({ x: 0, y: 0, content: '', visible: false })

  useEffect(() => {
    if (!svgRef.current || !conceptData.nodes.length) return

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

    // Reset zoom button functionality
    const resetZoom = () => {
      svg.transition().duration(750).call(
        zoom.transform as any,
        d3.zoomIdentity
      )
    }

    // Prepare data
    const nodes: D3Node[] = conceptData.nodes.map(n => ({ ...n }))
    const edges: D3Edge[] = conceptData.edges.map(e => ({ ...e }))

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges)
        .id((d: any) => d.id)
        .distance(80)
        .strength((d: any) => d.strength || 0.5)
      )
      .force('charge', d3.forceManyBody()
        .strength(-300)
        .distanceMax(400)
      )
      .force('center', d3.forceCenter(width / 2, containerHeight / 2))
      .force('collision', d3.forceCollide()
        .radius((d: any) => NODE_RADIUS_BASE + (d.weight || 1) * NODE_RADIUS_SCALE + 5)
      )

    // Create edge lines
    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('class', 'concept-edge')
      .attr('stroke', (d: D3Edge) => {
        const color = EDGE_COLORS[d.type as keyof typeof EDGE_COLORS] || EDGE_COLORS.related
        return isDark ? color : d3.color(color)?.darker(0.3)?.toString() || color
      })
      .attr('stroke-width', (d: D3Edge) => {
        const baseWidth = EDGE_WIDTHS[d.type as keyof typeof EDGE_WIDTHS] || EDGE_WIDTHS.related
        return baseWidth * (d.strength || 0.5)
      })
      .attr('stroke-opacity', isDark ? 0.4 : 0.3)
      .attr('stroke-dasharray', (d: any) => {
        // Dashed line for 'related' edges
        return d.type === 'related' ? '4,4' : '0'
      })

    // Create node groups
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'concept-node')
      .call(d3.drag<SVGGElement, D3Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any
      )

    // Add circles to nodes
    node.append('circle')
      .attr('r', (d: any) => NODE_RADIUS_BASE + (d.weight || 1) * NODE_RADIUS_SCALE)
      .attr('fill', (d: any) => d.color)
      .attr('stroke', isDark ? '#18181b' : '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')

    // Add labels to nodes
    node.append('text')
      .text((d: any) => d.text)
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => NODE_RADIUS_BASE + (d.weight || 1) * NODE_RADIUS_SCALE + 14)
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', isDark ? '#e4e4e7' : '#27272a')
      .attr('pointer-events', 'none')
      .style('user-select', 'none')

    // Add tooltips
    node.on('mouseenter', function(event, d: any) {
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('r', (d: any) => NODE_RADIUS_BASE + (d.weight || 1) * NODE_RADIUS_SCALE + 3)
        .attr('stroke-width', 3)

      const tooltipContent = `
        <strong>${d.text}</strong><br/>
        Type: ${d.type}<br/>
        Weight: ${d.weight ?? 1}
      `

      setTooltip({
        x: event.pageX,
        y: event.pageY,
        content: tooltipContent,
        visible: true,
      })
    })

    node.on('mouseleave', function(event, d: any) {
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('r', (d: any) => NODE_RADIUS_BASE + (d.weight || 1) * NODE_RADIUS_SCALE)
        .attr('stroke-width', 2)

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
  }, [conceptData, isDark, height])

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        className={`rounded-xl ${
          isDark ? 'bg-zinc-900/50' : 'bg-white'
        }`}
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
          Concept Types
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>Entity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>Topic</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }} />
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>Action</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>Attribute</span>
          </div>
        </div>

        <div className={`mt-3 pt-3 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
          <p className={`font-semibold mb-2 ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
            Relationships
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 border-t-2 border-dashed" style={{ borderColor: '#94a3b8' }} />
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>Related</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5" style={{ backgroundColor: '#10b981', height: '2px' }} />
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>Acts On</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5" style={{ backgroundColor: '#f59e0b', height: '1.5px' }} />
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>Has Attribute</span>
            </div>
          </div>
        </div>
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
          {conceptData.nodes.length} concepts • {conceptData.edges.length} relationships
        </p>
      </div>
    </div>
  )
}
