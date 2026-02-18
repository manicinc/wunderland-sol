/**
 * Strand Mind Map - Dynamic D3 visualization of knowledge relationships
 * @module codex/ui/StrandMindMap
 * 
 * @remarks
 * Automatically generates and visualizes a mind map based on:
 * - Current strand position in the knowledge hierarchy
 * - Parent/child relationships (loom/weave structure)
 * - Explicit relationships from frontmatter
 * - Tag-based connections
 * - Sibling strands for context
 * 
 * Features:
 * - Force-directed layout with intelligent clustering
 * - Zoom and pan with smooth animations
 * - Click-to-navigate functionality
 * - Responsive design for sidebar or modal display
 * - Theme-aware styling (light/dark/sepia)
 */

'use client'

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as d3 from 'd3'
import {
  X, ZoomIn, ZoomOut, Maximize2, RotateCcw, Filter, Eye, EyeOff,
  FileText, FolderOpen, Layers, Target, ChevronRight, Network
} from 'lucide-react'
import type { StrandMetadata, GitHubFile, KnowledgeTreeNode } from '../../types'

interface MindMapNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  path: string
  type: 'current' | 'parent' | 'child' | 'sibling' | 'prerequisite' | 'reference' | 'tag-related'
  level: 'fabric' | 'weave' | 'loom' | 'strand'
  weight: number
  color: string
}

interface MindMapLink extends d3.SimulationLinkDatum<MindMapNode> {
  source: string | MindMapNode
  target: string | MindMapNode
  type: 'hierarchy' | 'prerequisite' | 'reference' | 'tag'
  strength: number
}

interface StrandMindMapProps {
  /** Whether the mind map is visible */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Current strand's metadata */
  metadata?: StrandMetadata
  /** Current strand path */
  currentPath: string
  /** All files in the codex */
  files: GitHubFile[]
  /** Knowledge tree for hierarchy info */
  knowledgeTree?: KnowledgeTreeNode[]
  /** Navigate to a path */
  onNavigate?: (path: string) => void
  /** Current theme */
  theme?: string
  /** Display mode: sidebar (compact) or modal (full) */
  displayMode?: 'sidebar' | 'modal'
}

/**
 * Get node color based on type and theme
 */
function getNodeColor(type: MindMapNode['type'], isDark: boolean): string {
  const colors = {
    current: isDark ? '#10b981' : '#059669',    // Emerald
    parent: isDark ? '#f59e0b' : '#d97706',     // Amber
    child: isDark ? '#3b82f6' : '#2563eb',      // Blue
    sibling: isDark ? '#8b5cf6' : '#7c3aed',    // Violet
    prerequisite: isDark ? '#ef4444' : '#dc2626', // Red
    reference: isDark ? '#06b6d4' : '#0891b2',  // Cyan
    'tag-related': isDark ? '#ec4899' : '#db2777', // Pink
  }
  return colors[type]
}

/**
 * Get level-based node size
 */
function getNodeSize(level: MindMapNode['level'], isCurrent: boolean): number {
  if (isCurrent) return 20
  const sizes = { fabric: 16, weave: 14, loom: 12, strand: 10 }
  return sizes[level] || 10
}

/**
 * Main Mind Map Component
 */
export default function StrandMindMap({
  isOpen,
  onClose,
  metadata,
  currentPath,
  files,
  knowledgeTree,
  onNavigate,
  theme = 'light',
  displayMode = 'modal',
}: StrandMindMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simulationRef = useRef<d3.Simulation<MindMapNode, MindMapLink> | null>(null)
  
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 })
  const [hoveredNode, setHoveredNode] = useState<MindMapNode | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set(['all']))
  
  const isDark = theme.includes('dark')

  // Build nodes and links from current strand context
  const { nodes, links } = useMemo(() => {
    const nodes: MindMapNode[] = []
    const links: MindMapLink[] = []
    const seenIds = new Set<string>()
    
    const addNode = (node: Omit<MindMapNode, 'x' | 'y' | 'vx' | 'vy'>) => {
      if (!seenIds.has(node.id)) {
        seenIds.add(node.id)
        nodes.push({
          ...node,
          color: getNodeColor(node.type, isDark),
        })
        return true
      }
      return false
    }
    
    // 1. Current strand (center)
    const currentName = metadata?.title || currentPath.split('/').pop()?.replace('.md', '') || 'Current'
    const currentId = currentPath
    addNode({
      id: currentId,
      name: currentName,
      path: currentPath,
      type: 'current',
      level: 'strand',
      weight: 1,
      color: getNodeColor('current', isDark),
    })
    
    // 2. Parse path for parent hierarchy
    const pathParts = currentPath.split('/').filter(Boolean)
    let parentPath = ''
    pathParts.slice(0, -1).forEach((part, i) => {
      parentPath += (i === 0 ? '' : '/') + part
      const level = i === 0 ? 'weave' : i === 1 ? 'loom' : 'strand'
      const nodeId = parentPath
      
      if (addNode({
        id: nodeId,
        name: part.replace(/-/g, ' '),
        path: parentPath,
        type: 'parent',
        level: level as MindMapNode['level'],
        weight: 0.8,
        color: getNodeColor('parent', isDark),
      })) {
        // Link to parent
        if (nodes.length > 1) {
          const prevNodeId = nodes[nodes.length - 2].id
          links.push({
            source: nodeId,
            target: prevNodeId,
            type: 'hierarchy',
            strength: 0.8,
          })
        }
      }
    })
    
    // Link current to immediate parent
    if (pathParts.length > 1) {
      const parentId = pathParts.slice(0, -1).join('/')
      links.push({
        source: currentId,
        target: parentId,
        type: 'hierarchy',
        strength: 0.9,
      })
    }
    
    // 3. Siblings (other strands in same folder)
    const currentDir = pathParts.slice(0, -1).join('/')
    const siblings = files.filter(f => {
      const fDir = f.path.split('/').slice(0, -1).join('/')
      return fDir === currentDir && 
             f.path !== currentPath && 
             f.name?.endsWith('.md')
    }).slice(0, 6) // Limit to 6 siblings
    
    siblings.forEach(sibling => {
      if (addNode({
        id: sibling.path,
        name: sibling.name?.replace('.md', '').replace(/-/g, ' ') || 'Sibling',
        path: sibling.path,
        type: 'sibling',
        level: 'strand',
        weight: 0.5,
        color: getNodeColor('sibling', isDark),
      })) {
        links.push({
          source: sibling.path,
          target: currentDir || currentId,
          type: 'hierarchy',
          strength: 0.4,
        })
      }
    })
    
    // 4. Prerequisites from metadata
    const prerequisites = metadata?.relationships?.prerequisites || []
    prerequisites.slice(0, 5).forEach((prereq: string) => {
      const prereqPath = files.find(f => 
        f.path.includes(prereq) || 
        f.name?.includes(prereq)
      )?.path || prereq
      
      if (addNode({
        id: `prereq-${prereq}`,
        name: prereq.replace(/-/g, ' '),
        path: prereqPath,
        type: 'prerequisite',
        level: 'strand',
        weight: 0.7,
        color: getNodeColor('prerequisite', isDark),
      })) {
        links.push({
          source: `prereq-${prereq}`,
          target: currentId,
          type: 'prerequisite',
          strength: 0.7,
        })
      }
    })
    
    // 5. References from metadata
    const references = metadata?.relationships?.references || metadata?.relationships?.seeAlso || []
    references.slice(0, 5).forEach((ref: string) => {
      const refPath = files.find(f => 
        f.path.includes(ref) || 
        f.name?.includes(ref)
      )?.path || ref
      
      if (addNode({
        id: `ref-${ref}`,
        name: ref.replace(/-/g, ' '),
        path: refPath,
        type: 'reference',
        level: 'strand',
        weight: 0.6,
        color: getNodeColor('reference', isDark),
      })) {
        links.push({
          source: currentId,
          target: `ref-${ref}`,
          type: 'reference',
          strength: 0.5,
        })
      }
    })
    
    // 6. Children (if current is a directory)
    const children = files.filter(f => {
      return f.path.startsWith(currentPath.replace('.md', '') + '/') &&
             f.path.split('/').length === currentPath.split('/').length + 1
    }).slice(0, 5)
    
    children.forEach(child => {
      if (addNode({
        id: child.path,
        name: child.name?.replace('.md', '').replace(/-/g, ' ') || 'Child',
        path: child.path,
        type: 'child',
        level: 'strand',
        weight: 0.6,
        color: getNodeColor('child', isDark),
      })) {
        links.push({
          source: currentId,
          target: child.path,
          type: 'hierarchy',
          strength: 0.6,
        })
      }
    })
    
    return { nodes, links }
  }, [currentPath, metadata, files, isDark])

  // D3 force simulation
  useEffect(() => {
    if (!svgRef.current || !isOpen || nodes.length === 0) return
    
    const svg = d3.select(svgRef.current)
    const { width, height } = dimensions
    
    // Clear previous
    svg.selectAll('*').remove()
    
    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform)
      })
    
    svg.call(zoom)
    
    const container = svg.append('g')
    
    // Force simulation
    const simulation = d3.forceSimulation<MindMapNode>(nodes)
      .force('link', d3.forceLink<MindMapNode, MindMapLink>(links)
        .id(d => d.id)
        .distance(d => 80 + (1 - d.strength) * 40)
        .strength(d => d.strength))
      .force('charge', d3.forceManyBody<MindMapNode>()
        .strength(d => d.type === 'current' ? -200 : -100))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<MindMapNode>()
        .radius(d => getNodeSize(d.level, d.type === 'current') + 10))
    
    simulationRef.current = simulation
    
    // Draw links
    const link = container.append('g')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => {
        if (d.type === 'prerequisite') return isDark ? '#ef4444' : '#dc2626'
        if (d.type === 'reference') return isDark ? '#06b6d4' : '#0891b2'
        return isDark ? '#52525b' : '#a1a1aa'
      })
      .attr('stroke-width', d => d.strength * 2)
      .attr('stroke-dasharray', d => d.type === 'prerequisite' ? '4,2' : 'none')
    
    // Draw nodes
    const node = container.append('g')
      .selectAll<SVGGElement, MindMapNode>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, MindMapNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        }) as any)
      .on('click', (event, d) => {
        event.stopPropagation()
        if (d.path && onNavigate) {
          onNavigate(d.path)
          onClose()
        }
      })
      .on('mouseenter', (event, d) => setHoveredNode(d))
      .on('mouseleave', () => setHoveredNode(null))
    
    // Node circles
    node.append('circle')
      .attr('r', d => getNodeSize(d.level, d.type === 'current'))
      .attr('fill', d => d.color)
      .attr('stroke', d => d.type === 'current' ? '#fff' : 'none')
      .attr('stroke-width', d => d.type === 'current' ? 3 : 0)
      .style('filter', d => d.type === 'current' ? `drop-shadow(0 0 8px ${d.color})` : 'none')
    
    // Node labels
    if (showLabels) {
      node.append('text')
        .text(d => d.name.length > 15 ? d.name.slice(0, 12) + '...' : d.name)
        .attr('dy', d => getNodeSize(d.level, d.type === 'current') + 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', isDark ? '#e2e8f0' : '#52525b')
        .style('pointer-events', 'none')
    }
    
    // Tick function
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as MindMapNode).x!)
        .attr('y1', d => (d.source as MindMapNode).y!)
        .attr('x2', d => (d.target as MindMapNode).x!)
        .attr('y2', d => (d.target as MindMapNode).y!)
      
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })
    
    // Initial zoom fit
    const initialScale = Math.min(width / 600, height / 400, 1)
    svg.call(zoom.transform, d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(initialScale)
      .translate(-width / 2, -height / 2))
    
    return () => {
      simulation.stop()
    }
  }, [nodes, links, dimensions, isOpen, isDark, showLabels, onNavigate, onClose])

  // Update dimensions on resize
  useEffect(() => {
    if (!containerRef.current || !isOpen) return
    
    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [isOpen])

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Reset zoom function
  const resetZoom = useCallback(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    const zoom = d3.zoom<SVGSVGElement, unknown>()
    svg.transition().duration(500).call(
      zoom.transform,
      d3.zoomIdentity.translate(dimensions.width / 2, dimensions.height / 2)
        .scale(1)
        .translate(-dimensions.width / 2, -dimensions.height / 2)
    )
  }, [dimensions])

  if (!isOpen) return null

  const isModal = displayMode === 'modal'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for modal */}
          {isModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[299]"
              onClick={onClose}
            />
          )}
          
          <motion.div
            initial={{ opacity: 0, scale: isModal ? 0.95 : 1, y: isModal ? 20 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: isModal ? 0.95 : 1, y: isModal ? 20 : 0 }}
            className={`
              ${isModal 
                ? 'fixed z-[300] inset-4 md:inset-8 lg:inset-16 rounded-2xl shadow-2xl' 
                : 'w-full h-full'
              }
              ${isDark ? 'bg-zinc-900' : 'bg-white'}
              flex flex-col overflow-hidden
              ${isModal ? 'border border-zinc-200 dark:border-zinc-700' : ''}
            `}
          >
            {/* Header */}
            <div className={`
              px-4 py-3 border-b flex items-center justify-between shrink-0
              ${isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-white/80'}
              backdrop-blur-sm
            `}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}>
                  <Network className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <h2 className={`font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    Knowledge Mind Map
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {nodes.length} nodes • {links.length} connections
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLabels(!showLabels)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                  }`}
                  title={showLabels ? 'Hide labels' : 'Show labels'}
                >
                  {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={resetZoom}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                  }`}
                  title="Reset view"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                {isModal && (
                  <button
                    onClick={onClose}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            
            {/* SVG Container */}
            <div ref={containerRef} className="flex-1 relative overflow-hidden">
              <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                className="w-full h-full"
                style={{ cursor: 'grab' }}
              />
              
              {/* Hovered node tooltip */}
              <AnimatePresence>
                {hoveredNode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`
                      absolute bottom-4 left-1/2 -translate-x-1/2
                      px-4 py-3 rounded-xl shadow-xl
                      ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: hoveredNode.color }}
                      />
                      <div>
                        <p className={`font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                          {hoveredNode.name}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {hoveredNode.type.replace('-', ' ')} • {hoveredNode.level}
                        </p>
                      </div>
                      {hoveredNode.path && (
                        <ChevronRight className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Legend */}
            <div className={`
              px-4 py-2 border-t flex flex-wrap justify-center gap-4 shrink-0
              ${isDark ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-zinc-50/50'}
            `}>
              {[
                { type: 'current', label: 'Current' },
                { type: 'parent', label: 'Parent' },
                { type: 'sibling', label: 'Sibling' },
                { type: 'prerequisite', label: 'Prerequisite' },
                { type: 'reference', label: 'Reference' },
              ].map(({ type, label }) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div 
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: getNodeColor(type as MindMapNode['type'], isDark) }}
                  />
                  <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

