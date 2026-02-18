/**
 * Stable Knowledge Graph - Static spiral layout
 * @module codex/ui/StableKnowledgeGraph
 * 
 * @remarks
 * Beautiful, calm spiral visualization with NO chaotic movement.
 * Fixed positions based on golden ratio and Fibonacci spiral.
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface GraphNode {
  id: string
  name: string
  path: string
  level: 'fabric' | 'weave' | 'loom' | 'collection' | 'strand' | 'folder'
  size: number
  connections: string[]
  /** Primary supertag applied to this node */
  primaryTag?: string
  /** Custom color from supertag */
  tagColor?: string
  /** All tags on this node */
  tags?: string[]
}

interface StableKnowledgeGraphProps {
  nodes: GraphNode[]
  currentFile?: { path: string } | null
  onNodeClick?: (path: string) => void
  showLabels?: boolean
  theme?: string
}

const PHI = 1.618033988749 // Golden ratio
const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

/**
 * Calculate stable spiral position using golden ratio
 */
function getSpiralPosition(index: number, total: number, radius: number): { x: number; y: number } {
  const angle = index * PHI * 2 * Math.PI
  const distance = (radius * Math.sqrt(index + 1)) / Math.sqrt(total)
  
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
  }
}

/**
 * Get node color by hierarchy level or supertag
 */
function getNodeColor(level: string, isTerminal: boolean, tagColor?: string): string {
  // If node has a supertag color, use it
  if (tagColor) {
    return tagColor
  }

  if (isTerminal) {
    switch (level) {
      case 'fabric': return 'var(--terminal-text-bright)'
      case 'weave': return 'var(--terminal-accent)'
      case 'loom': return 'var(--terminal-text)'
      case 'strand': return 'var(--terminal-text-dim)'
      default: return 'var(--terminal-text-dim)'
    }
  }

  switch (level) {
    case 'fabric': return '#0891b2' // cyan-600
    case 'weave': return '#06b6d4'  // cyan-500
    case 'loom': return '#22d3ee'   // cyan-400
    case 'strand': return '#67e8f9' // cyan-300
    default: return '#a5f3fc'       // cyan-200
  }
}

/**
 * Get node size by hierarchy level
 * Mobile-optimized with larger touch targets
 */
function getNodeSize(level: string, isMobile = false): number {
  const multiplier = isMobile ? 1.5 : 1
  switch (level) {
    case 'fabric': return 16 * multiplier
    case 'weave': return 12 * multiplier
    case 'loom': return 8 * multiplier
    case 'strand': return 5 * multiplier
    default: return 4 * multiplier
  }
}

/**
 * Stable knowledge graph with fixed spiral layout
 */
export default function StableKnowledgeGraph({
  nodes,
  currentFile,
  onNodeClick,
  showLabels = true,
  theme = 'light',
}: StableKnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const lastPinchDistance = useRef<number | null>(null)
  
  const isTerminal = theme.includes('terminal')
  const isDark = theme.includes('dark')
  
  // Pinch-to-zoom support for mobile
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDistance.current = Math.sqrt(dx * dx + dy * dy)
      }
    }
    
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDistance.current) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const scale = distance / lastPinchDistance.current
        
        setZoom(prev => Math.max(0.1, Math.min(prev * scale, 5)))
        lastPinchDistance.current = distance
      }
    }
    
    const handleTouchEnd = () => {
      lastPinchDistance.current = null
    }
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) * 0.4

    // Clear previous render
    svg.selectAll('*').remove()

    // Create container group for zoom/pan
    const container = svg.append('g')
      .attr('class', 'graph-container')

    // Apply zoom transform
    container.attr('transform', `translate(${centerX + pan.x}, ${centerY + pan.y}) scale(${zoom})`)

    // Add glow filter for terminal theme
    if (isTerminal) {
      const defs = svg.append('defs')
      const filter = defs.append('filter')
        .attr('id', 'glow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%')
      
      filter.append('feGaussianBlur')
        .attr('stdDeviation', '3')
        .attr('result', 'coloredBlur')
      
      const feMerge = filter.append('feMerge')
      feMerge.append('feMergeNode').attr('in', 'coloredBlur')
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic')
    }

    // Calculate stable positions
    const isMobile = window.innerWidth < 768
    const positionedNodes = nodes.map((node, i) => ({
      ...node,
      ...getSpiralPosition(i, nodes.length, maxRadius),
      color: getNodeColor(node.level, isTerminal, node.tagColor),
      radius: getNodeSize(node.level, isMobile),
    }))

    // Draw connections first (under nodes)
    const lines = container.append('g').attr('class', 'links')
    
    positionedNodes.forEach((source) => {
      source.connections.forEach((targetId) => {
        const target = positionedNodes.find((n) => n.id === targetId)
        if (target) {
          lines.append('line')
            .attr('x1', source.x)
            .attr('y1', source.y)
            .attr('x2', target.x)
            .attr('y2', target.y)
            .attr('stroke', isTerminal ? 'var(--terminal-border)' : '#cbd5e1')
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.3)
            .attr('stroke-dasharray', '2,2')
        }
      })
    })

    // Draw golden ratio rings
    const rings = container.append('g').attr('class', 'rings')
    FIBONACCI.slice(0, 5).forEach((fib, i) => {
      const r = (maxRadius * fib) / FIBONACCI[4]
      rings.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', isTerminal ? 'var(--terminal-border)' : '#e2e8f0')
        .attr('stroke-width', 0.5)
        .attr('stroke-opacity', 0.2)
        .attr('stroke-dasharray', '4,4')
    })

    // Draw nodes
    const nodeGroup = container.append('g').attr('class', 'nodes')
    
    const nodeCircles = nodeGroup.selectAll('circle')
      .data(positionedNodes)
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.path === currentFile?.path ? (isTerminal ? '#fff' : '#000') : 'none')
      .attr('stroke-width', d => d.path === currentFile?.path ? 2 : 0)
      .attr('cursor', 'pointer')
      .attr('opacity', 0.85)
      .on('click', (_event, d) => {
        if (onNodeClick) onNodeClick(d.path)
      })
      .on('mouseenter', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('r', (d: any) => d.radius * 1.3)
      })
      .on('mouseleave', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.85)
          .attr('r', (d: any) => d.radius)
      })

    if (isTerminal) {
      nodeCircles.attr('filter', 'url(#glow)')
    }

    // Node labels
    if (showLabels) {
      const labels = nodeGroup.selectAll('text')
        .data(positionedNodes.filter(d => d.level !== 'strand')) // Only label weaves/looms
        .enter()
        .append('text')
        .attr('x', d => d.x)
        .attr('y', d => d.y + d.radius + 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', isTerminal ? 'var(--terminal-text)' : (isDark ? '#e2e8f0' : '#334155'))
        .attr('opacity', 0.8)
        .style('pointer-events', 'none')
        .text(d => d.name.length > 15 ? d.name.slice(0, 15) + '...' : d.name)
      
      if (isTerminal) {
        labels.each(function() {
          d3.select(this).style('text-shadow', '0 0 5px var(--glow-color)')
        })
      }
    }

  }, [nodes, currentFile, onNodeClick, showLabels, theme, zoom, pan, isTerminal, isDark])

  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 3))
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.3))
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white dark:bg-gray-950">
      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ 
          background: isTerminal ? '#000' : (isDark ? '#0f172a' : '#f8fafc'),
          cursor: 'grab',
        }}
        onWheel={(e) => {
          e.preventDefault()
          const delta = e.deltaY > 0 ? 0.9 : 1.1
          setZoom(z => Math.max(0.3, Math.min(3, z * delta)))
        }}
        onMouseDown={(e) => {
          const startX = e.clientX - pan.x
          const startY = e.clientY - pan.y
          
          const handleMove = (moveEvent: MouseEvent) => {
            setPan({
              x: moveEvent.clientX - startX,
              y: moveEvent.clientY - startY,
            })
          }
          
          const handleUp = () => {
            document.removeEventListener('mousemove', handleMove)
            document.removeEventListener('mouseup', handleUp)
          }
          
          document.addEventListener('mousemove', handleMove)
          document.addEventListener('mouseup', handleUp)
        }}
      />

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Reset view"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 p-3">
        <h3 className="text-xs font-bold mb-2 text-gray-900 dark:text-gray-100">Knowledge Hierarchy</h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-cyan-600" />
            <span className="text-gray-700 dark:text-gray-300">Fabric (Root)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-500" />
            <span className="text-gray-700 dark:text-gray-300">Weave</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-cyan-400" />
            <span className="text-gray-700 dark:text-gray-300">Loom</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-300" />
            <span className="text-gray-700 dark:text-gray-300">Strand</span>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-500 dark:text-gray-400">
          <p>Scroll to zoom • Drag to pan</p>
          <p className="mt-1">Click node to navigate</p>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 left-4 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Nodes:</span>
            <span className="ml-2 font-bold text-gray-900 dark:text-gray-100">{nodes.length}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Zoom:</span>
            <span className="ml-2 font-bold text-gray-900 dark:text-gray-100">{Math.round(zoom * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

