/**
 * Spiral Knowledge Graph - Golden Ratio Visualization
 * @module codex/ui/SpiralKnowledgeGraph
 * 
 * @remarks
 * Visualizes the knowledge graph using:
 * - Golden spiral (φ = 1.618) for node positioning
 * - Concentric rings for knowledge depth
 * - Fibonacci sequence for radial distance
 * - Force-directed layout with gravity wells
 * - Interactive zoom, pan, and node selection
 */

'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ZoomIn, ZoomOut, Maximize2, RotateCcw, Filter,
  Eye, EyeOff, Sparkles, Target, Layers
} from 'lucide-react'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  title: string
  path: string
  type: 'strand' | 'loom' | 'weave'
  tags?: string[]
  ring: number  // Which knowledge ring (0 = center, higher = further out)
  weight: number  // Importance/centrality
  color: string
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
  type: 'reference' | 'parent' | 'tag' | 'semantic'
  weight: number
}

interface SpiralKnowledgeGraphProps {
  /** Whether graph is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** All files in the Codex */
  files: Array<{ path: string; name: string; type: string }>
  /** Current selected file */
  currentFile?: { path: string; name: string }
  /** Navigate to file */
  onNavigate: (path: string) => void
  /** Theme */
  theme?: string
}

// Golden ratio constant
const PHI = 1.618033988749895

// Fibonacci sequence for ring distances
const fibonacci = (n: number): number => {
  if (n <= 1) return n
  let a = 0, b = 1
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b]
  }
  return b
}

/**
 * Calculate golden spiral position
 */
const goldenSpiralPosition = (index: number, ring: number): { x: number; y: number } => {
  const angle = index * (2 * Math.PI / PHI)
  const radius = fibonacci(ring + 3) * 20 // Scale by Fibonacci

  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
  }
}

/**
 * Spiral knowledge graph with golden ratio aesthetics
 */
export default function SpiralKnowledgeGraph({
  isOpen,
  onClose,
  files,
  currentFile,
  onNavigate,
  theme = 'light',
}: SpiralKnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [links, setLinks] = useState<GraphLink[]>([])
  const [showRings, setShowRings] = useState(true)
  const [showSpiral, setShowSpiral] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [filter, setFilter] = useState<'all' | 'strands' | 'looms'>('all')
  const [zoom, setZoom] = useState(1)

  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')
  const isSepia = theme.includes('sepia')

  /**
   * Build graph from files
   */
  useEffect(() => {
    if (!isOpen || !files || files.length === 0) return

    // Build nodes
    const nodeMap = new Map<string, GraphNode>()
    const linksList: GraphLink[] = []

    files.forEach((file, index) => {
      if (file.type !== 'file') return

      // Determine node type
      const pathParts = file.path.split('/')
      const isWeave = pathParts.length === 2 && pathParts[0] === 'weaves'
      const isLoom = pathParts.length > 2 && pathParts[0] === 'weaves'
      const type = isWeave ? 'weave' : isLoom ? 'loom' : 'strand'

      // Calculate knowledge ring (depth in hierarchy)
      const ring = Math.min(pathParts.length - 1, 7)

      // Determine color by type
      const color = type === 'weave'
        ? '#F59E0B' // amber
        : type === 'loom'
          ? '#06B6D4' // cyan
          : '#8B5CF6' // violet

      const node: GraphNode = {
        id: file.path,
        title: file.name,
        path: file.path,
        type,
        ring,
        weight: 1,
        color,
      }

      nodeMap.set(file.path, node)

      // Create parent-child links
      if (pathParts.length > 1) {
        const parentPath = pathParts.slice(0, -1).join('/')
        if (nodeMap.has(parentPath)) {
          linksList.push({
            source: parentPath,
            target: file.path,
            type: 'parent',
            weight: 2,
          })
        }
      }
    })

    setNodes(Array.from(nodeMap.values()))
    setLinks(linksList)
  }, [files, isOpen])

  /**
   * Initialize D3 force simulation
   */
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const width = 1200
    const height = 800

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height])
      .attr('width', '100%')
      .attr('height', '100%')

    const g = svg.append('g')

    // Add zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        setZoom(event.transform.k)
      })

    svg.call(zoomBehavior)

    // Draw concentric knowledge rings
    if (showRings) {
      const ringsGroup = g.append('g').attr('class', 'knowledge-rings')

      for (let i = 1; i <= 7; i++) {
        const radius = fibonacci(i + 3) * 20

        ringsGroup.append('circle')
          .attr('cx', width / 2)
          .attr('cy', height / 2)
          .attr('r', radius)
          .attr('fill', 'none')
          .attr('stroke', isTerminal ? '#ffb00020' : isDark ? '#ffffff15' : '#00000015')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', i % 2 === 0 ? '5,5' : '2,2')
      }
    }

    // Draw golden spiral
    if (showSpiral) {
      const spiralGroup = g.append('g').attr('class', 'golden-spiral')

      const spiralPath = d3.path()
      for (let t = 0; t < 4 * Math.PI; t += 0.1) {
        const r = fibonacci(5) * Math.exp(t / (2 * Math.PI))
        const x = width / 2 + r * Math.cos(t)
        const y = height / 2 + r * Math.sin(t)

        if (t === 0) spiralPath.moveTo(x, y)
        else spiralPath.lineTo(x, y)
      }

      spiralGroup.append('path')
        .attr('d', spiralPath.toString())
        .attr('fill', 'none')
        .attr('stroke', isTerminal ? '#ffd70030' : '#FFD70030')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '10,5')
    }

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', isTerminal ? '#ffb00040' : isDark ? '#ffffff20' : '#00000020')
      .attr('stroke-width', d => d.weight || 1)
      .attr('stroke-opacity', 0.6)

    // Create nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active && simulationRef.current) {
            simulationRef.current.alphaTarget(0.3).restart()
          }
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active && simulationRef.current) {
            simulationRef.current.alphaTarget(0)
          }
          d.fx = null
          d.fy = null
        }) as any
      )

    // Node circles with glow
    node.append('circle')
      .attr('r', d => d.type === 'weave' ? 12 : d.type === 'loom' ? 8 : 5)
      .attr('fill', d => d.path === currentFile?.path ? '#EC4899' : d.color)
      .attr('stroke', d => d.path === currentFile?.path ? '#FFF' : '#000')
      .attr('stroke-width', d => d.path === currentFile?.path ? 3 : 1)
      .attr('filter', isTerminal ? 'url(#glow)' : null)

    // Node labels
    if (showLabels) {
      const labels = node.append('text')
        .text(d => d.title.replace(/\.md$/, ''))
        .attr('x', 15)
        .attr('y', 4)
        .attr('font-size', d => d.type === 'weave' ? 12 : 10)
        .attr('fill', isTerminal ? '#ffb000' : isDark ? '#fff' : '#000')
        .attr('opacity', 0.8)
        .style('pointer-events', 'none')

      // Apply text-shadow only for terminal theme
      if (isTerminal) {
        labels.style('text-shadow', '0 0 5px #ffb00080')
      }
    }

    // Add glow filter for terminal theme
    if (isTerminal) {
      const defs = svg.append('defs')
      const filter = defs.append('filter')
        .attr('id', 'glow')

      filter.append('feGaussianBlur')
        .attr('stdDeviation', 3)
        .attr('result', 'coloredBlur')

      const feMerge = filter.append('feMerge')
      feMerge.append('feMergeNode')
        .attr('in', 'coloredBlur')
      feMerge.append('feMergeNode')
        .attr('in', 'SourceGraphic')
    }

    // Click handler
    node.on('click', (event, d) => {
      event.stopPropagation()
      onNavigate(d.path)
    })

    // Tooltip
    node.append('title')
      .text(d => `${d.title}\n${d.path}\nRing ${d.ring}`)

    // Force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(100)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(20))
      // Radial force to create ring structure
      .force('radial', d3.forceRadial<GraphNode>(
        d => fibonacci(d.ring + 3) * 20,
        width / 2,
        height / 2
      ).strength(0.3))

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0)

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`)
    })

    simulationRef.current = simulation

    return () => {
      simulation.stop()
    }
  }, [nodes, links, currentFile, showRings, showSpiral, showLabels, isDark, isTerminal, onNavigate])

  /**
   * Reset zoom and center
   */
  const handleReset = () => {
    if (!svgRef.current) return
    d3.select(svgRef.current)
      .transition()
      .duration(750)
      .call(
        d3.zoom<SVGSVGElement, unknown>().transform as any,
        d3.zoomIdentity
      )
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Graph Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20 }}
          className="relative w-full h-full flex flex-col"
        >
          {/* Header */}
          <header className={`
            relative px-6 py-4 flex items-center justify-between
            border-b-2 z-10
            ${isDark ? 'border-cyan-800' : 'border-cyan-400'}
            ${isSepia && isDark ? 'bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950' : ''}
            ${isSepia && !isDark ? 'bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50' : ''}
            ${!isSepia && isDark ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900' : ''}
            ${!isSepia && !isDark ? 'bg-gradient-to-r from-gray-50 via-white to-gray-50' : ''}
            ${isTerminal ? 'terminal-header bg-black' : ''}
          `}>
            {/* Title */}
            <div className="flex items-center gap-4">
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 60,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className={`
                  p-3 rounded-xl
                  ${isDark ? 'bg-cyan-900/50' : 'bg-cyan-100'}
                  ${isTerminal ? 'bg-black border-2 border-cyan-500' : ''}
                `}
              >
                <Sparkles className={`
                  w-6 h-6 
                  ${isTerminal ? 'text-cyan-500' : 'text-cyan-700 dark:text-cyan-300'}
                `} />
              </motion.div>
              <div>
                <h2 className={`
                  text-2xl font-bold tracking-wider
                  ${isTerminal ? 'terminal-text text-cyan-500' : ''}
                `}>
                  KNOWLEDGE SPIRAL
                </h2>
                <p className="text-sm opacity-70">
                  Golden ratio visualization • {nodes.length} nodes
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Show Rings */}
              <button
                onClick={() => setShowRings(!showRings)}
                className={`
                  p-2.5 rounded-lg transition-all
                  ${showRings
                    ? isDark ? 'bg-cyan-800 text-cyan-100' : 'bg-cyan-600 text-white'
                    : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
                  }
                `}
                title="Toggle knowledge rings"
              >
                <Layers className="w-5 h-5" />
              </button>

              {/* Show Spiral */}
              <button
                onClick={() => setShowSpiral(!showSpiral)}
                className={`
                  p-2.5 rounded-lg transition-all
                  ${showSpiral
                    ? isDark ? 'bg-cyan-800 text-cyan-100' : 'bg-cyan-600 text-white'
                    : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
                  }
                `}
                title="Toggle golden spiral"
              >
                <Target className="w-5 h-5" />
              </button>

              {/* Show Labels */}
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`
                  p-2.5 rounded-lg transition-all
                  ${showLabels
                    ? isDark ? 'bg-cyan-800 text-cyan-100' : 'bg-cyan-600 text-white'
                    : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
                  }
                `}
                title="Toggle labels"
              >
                {showLabels ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>

              {/* Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className={`
                  px-3 py-2 rounded-lg border-2 transition-colors
                  ${isDark
                    ? 'bg-gray-800 border-gray-700 text-gray-300'
                    : 'bg-white border-gray-300 text-gray-700'
                  }
                `}
              >
                <option value="all">All Nodes</option>
                <option value="strands">Strands Only</option>
                <option value="looms">Looms Only</option>
              </select>

              {/* Reset View */}
              <button
                onClick={handleReset}
                className={`
                  p-2.5 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}
                `}
                title="Reset view"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className={`
                  p-2.5 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}
                `}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* SVG Canvas */}
          <div
            className="relative flex-1 overflow-hidden"
            style={{
              backgroundColor: isTerminal
                ? '#000'
                : isSepia
                  ? isDark ? '#0E0704' : '#FCF9F2'
                  : isDark ? '#0f0f0f' : '#ffffff',
            }}
          >
            <svg ref={svgRef} className="w-full h-full" />

            {/* Zoom indicator */}
            <div className={`
              absolute bottom-4 right-4 px-3 py-2 rounded-lg
              ${isDark ? 'bg-gray-900/90' : 'bg-white/90'}
              backdrop-blur-sm border
              ${isDark ? 'border-gray-700' : 'border-gray-300'}
              text-sm font-mono
            `}>
              {Math.round(zoom * 100)}%
            </div>

            {/* Legend */}
            <div className={`
              absolute top-4 left-4 px-4 py-3 rounded-lg space-y-2
              ${isDark ? 'bg-gray-900/90' : 'bg-white/90'}
              backdrop-blur-sm border
              ${isDark ? 'border-gray-700' : 'border-gray-300'}
              text-xs
            `}>
              <div className="font-semibold mb-2">Node Types</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Weaves</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span>Looms</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-500" />
                <span>Strands</span>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-300 dark:border-gray-700">
                <div className="w-3 h-3 rounded-full bg-pink-500 border-2 border-white" />
                <span>Current</span>
              </div>
            </div>

            {/* Stats */}
            <div className={`
              absolute bottom-4 left-4 px-4 py-3 rounded-lg
              ${isDark ? 'bg-gray-900/90' : 'bg-white/90'}
              backdrop-blur-sm border
              ${isDark ? 'border-gray-700' : 'border-gray-300'}
              text-xs space-y-1
            `}>
              <div>Nodes: <span className="font-bold">{nodes.length}</span></div>
              <div>Links: <span className="font-bold">{links.length}</span></div>
              <div>Max Ring: <span className="font-bold">{Math.max(...nodes.map(n => n.ring), 0)}</span></div>
              <div>φ = <span className="font-mono">{PHI.toFixed(6)}</span></div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
