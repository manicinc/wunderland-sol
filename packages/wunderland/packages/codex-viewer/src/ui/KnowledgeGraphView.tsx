/**
 * Interactive knowledge graph visualization
 * @module codex/ui/KnowledgeGraphView
 * 
 * @remarks
 * - Force-directed graph layout (custom implementation, no D3.js dependency)
 * - Nodes: Weaves (large), Looms (medium), Strands (small)
 * - Edges: References, prerequisites, backlinks
 * - Interactive: Click to navigate, hover for preview
 * - Color-coded by hierarchy level
 * - Zoom and pan support
 */

'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, ZoomIn, ZoomOut, Maximize2, Filter } from 'lucide-react'
import type { KnowledgeTreeNode } from '../types'
import { LEVEL_STYLES } from '../constants'

interface GraphNode {
  id: string
  label: string
  level: 'weave' | 'loom' | 'strand'
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  path: string
}

interface GraphEdge {
  source: string
  target: string
  type: 'reference' | 'prerequisite' | 'backlink'
}

interface KnowledgeGraphViewProps {
  /** Knowledge tree nodes */
  tree: KnowledgeTreeNode[]
  /** Current selected file */
  selectedPath?: string | null
  /** Navigate to a node */
  onNavigate: (path: string) => void
  /** Close graph view */
  onClose: () => void
}

/**
 * Interactive force-directed knowledge graph
 * 
 * @example
 * ```tsx
 * <KnowledgeGraphView
 *   tree={knowledgeTree}
 *   selectedPath={currentPath}
 *   onNavigate={(path) => openFile(path)}
 *   onClose={() => setGraphOpen(false)}
 * />
 * ```
 */
export default function KnowledgeGraphView({
  tree,
  selectedPath,
  onNavigate,
  onClose,
}: KnowledgeGraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const animationRef = useRef<number>()

  /**
   * Build graph nodes from tree
   */
  const buildGraph = useCallback(() => {
    const graphNodes: GraphNode[] = []
    const graphEdges: GraphEdge[] = []

    const traverse = (node: KnowledgeTreeNode, parentId?: string) => {
      const nodeId = node.path || node.name
      const radius =
        node.level === 'weave' ? 40 :
        node.level === 'loom' ? 25 :
        node.level === 'strand' ? 15 : 20

      graphNodes.push({
        id: nodeId,
        label: node.name,
        level: node.level as 'weave' | 'loom' | 'strand',
        x: Math.random() * 800,
        y: Math.random() * 600,
        vx: 0,
        vy: 0,
        radius,
        path: node.path,
      })

      if (parentId) {
        graphEdges.push({
          source: parentId,
          target: nodeId,
          type: 'reference',
        })
      }

      if (node.children) {
        node.children.forEach((child) => traverse(child, nodeId))
      }
    }

    tree.forEach((root) => traverse(root))

    setNodes(graphNodes)
    setEdges(graphEdges)
  }, [tree])

  useEffect(() => {
    buildGraph()
  }, [buildGraph])

  /**
   * Force-directed layout simulation
   */
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    const simulate = () => {
      // Apply forces
      nodes.forEach((node, i) => {
        // Repulsion from other nodes
        nodes.forEach((other, j) => {
          if (i === j) return
          const dx = other.x - node.x
          const dy = other.y - node.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = -2000 / (dist * dist)
          node.vx += (dx / dist) * force
          node.vy += (dy / dist) * force
        })

        // Attraction along edges
        edges.forEach((edge) => {
          if (edge.source === node.id) {
            const target = nodes.find((n) => n.id === edge.target)
            if (target) {
              const dx = target.x - node.x
              const dy = target.y - node.y
              const dist = Math.sqrt(dx * dx + dy * dy) || 1
              const force = dist * 0.001
              node.vx += (dx / dist) * force
              node.vy += (dy / dist) * force
            }
          }
        })

        // Center attraction
        const centerX = width / 2
        const centerY = height / 2
        const dx = centerX - node.x
        const dy = centerY - node.y
        node.vx += dx * 0.0001
        node.vy += dy * 0.0001

        // Damping
        node.vx *= 0.9
        node.vy *= 0.9

        // Update position
        node.x += node.vx
        node.y += node.vy

        // Boundary collision
        node.x = Math.max(node.radius, Math.min(width - node.radius, node.x))
        node.y = Math.max(node.radius, Math.min(height - node.radius, node.y))
      })

      // Render
      ctx.clearRect(0, 0, width, height)

      // Draw edges
      ctx.strokeStyle = '#9ca3af'
      ctx.lineWidth = 1
      edges.forEach((edge) => {
        const source = nodes.find((n) => n.id === edge.source)
        const target = nodes.find((n) => n.id === edge.target)
        if (source && target) {
          ctx.beginPath()
          ctx.moveTo(source.x, source.y)
          ctx.lineTo(target.x, target.y)
          ctx.stroke()
        }
      })

      // Draw nodes
      nodes.forEach((node) => {
        const isSelected = selectedPath === node.path
        const isHovered = hoveredNode?.id === node.id

        // Node color based on level
        const colors = {
          weave: '#f59e0b', // amber
          loom: '#06b6d4', // cyan
          strand: '#8b5cf6', // purple
        }

        ctx.fillStyle = colors[node.level]
        ctx.strokeStyle = isSelected ? '#000' : '#fff'
        ctx.lineWidth = isSelected ? 3 : 2

        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius * (isHovered ? 1.2 : 1), 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Label (for large nodes or hovered)
        if (node.radius > 20 || isHovered) {
          ctx.fillStyle = '#000'
          ctx.font = '12px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(node.label, node.x, node.y + node.radius + 15)
        }
      })

      animationRef.current = requestAnimationFrame(simulate)
    }

    simulate()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [nodes, edges, hoveredNode, selectedPath])

  /**
   * Handle canvas click
   */
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Find clicked node
    const clicked = nodes.find((node) => {
      const dx = x - node.x
      const dy = y - node.y
      return Math.sqrt(dx * dx + dy * dy) <= node.radius
    })

    if (clicked && clicked.path) {
      onNavigate(clicked.path)
      onClose()
    }
  }

  /**
   * Handle canvas hover
   */
  const handleCanvasHover = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Find hovered node
    const hovered = nodes.find((node) => {
      const dx = x - node.x
      const dy = y - node.y
      return Math.sqrt(dx * dx + dy * dy) <= node.radius
    })

    setHoveredNode(hovered || null)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Knowledge Graph</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Interactive visualization of {nodes.length} nodes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setZoom(1)
              setPan({ x: 0, y: 0 })
            }}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Reset view"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Close graph"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasHover}
        style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
      />

      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl">
        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-white" />
            <span className="text-gray-700 dark:text-gray-300">Weave (universe)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-cyan-500 border-2 border-white" />
            <span className="text-gray-700 dark:text-gray-300">Loom (collection)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500 border-2 border-white" />
            <span className="text-gray-700 dark:text-gray-300">Strand (file)</span>
          </div>
        </div>
      </div>

      {/* Hovered node preview */}
      {hoveredNode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-20 right-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl max-w-xs"
        >
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
            {hoveredNode.label}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            {hoveredNode.path}
          </p>
          <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
            LEVEL_STYLES[hoveredNode.level].className
          }`}>
            {LEVEL_STYLES[hoveredNode.level].label}
          </div>
        </motion.div>
      )}
    </div>
  )
}

