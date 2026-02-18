/**
 * SidebarGraphView - Contextual compact graph for sidebar
 * @module codex/ui/SidebarGraphView
 * 
 * Shows graph relative to current selection:
 * - If strand selected: shows siblings in same loom
 * - If loom selected: shows strands within
 * - If weave selected: shows looms within
 * - If nothing selected: shows all weaves
 */

'use client'

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ZoomIn,
  ZoomOut,
  Home,
  Layers,
  Box,
  FileText,
  Folder,
  ChevronRight,
  Maximize2,
  ExternalLink,
  Network
} from 'lucide-react'
import type { KnowledgeTreeNode } from '../../types'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import MiniMindmapPreview from '../misc/MiniMindmapPreview'

// ==================== Types ====================

interface GraphNode {
  id: string
  name: string
  path: string
  level: 'fabric' | 'weave' | 'loom' | 'collection' | 'strand' | 'folder'
  size: number
  strandCount: number
  description?: string
  emoji?: string
  isCurrent?: boolean
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
}

interface SidebarGraphViewProps {
  tree: KnowledgeTreeNode[]
  selectedPath?: string | null
  onNavigate: (path: string) => void
  theme?: string
  currentPath?: string
  currentContent?: string
}

// ==================== Constants ====================

const COLORS = {
  weave: { light: '#059669', dark: '#34d399' },
  loom: { light: '#d97706', dark: '#fbbf24' },
  strand: { light: '#7c3aed', dark: '#a78bfa' },
  folder: { light: '#64748b', dark: '#94a3b8' },
}

const NODE_SIZES: Record<string, number> = {
  fabric: 20,
  weave: 16,
  loom: 10,
  strand: 5,
  folder: 8,
}

const LEVEL_ICONS: Record<string, React.FC<{ className?: string }>> = {
  weave: Layers,
  loom: Box,
  strand: FileText,
  folder: Folder,
}

// ==================== Utilities ====================

function findNodeByPath(tree: KnowledgeTreeNode[], path: string): KnowledgeTreeNode | null {
  for (const node of tree) {
    if (node.path === path) return node
    if (node.children) {
      const found = findNodeByPath(node.children, path)
      if (found) return found
    }
  }
  return null
}

function getParentPath(path: string): string {
  const parts = path.split('/')
  parts.pop()
  return parts.join('/')
}

function getContextLabel(selectedPath: string | null | undefined, tree: KnowledgeTreeNode[]): string {
  if (!selectedPath) return 'All Weaves'
  const node = findNodeByPath(tree, selectedPath)
  if (!node) return 'Context'
  if (node.level === 'strand') return `📄 ${node.name}`
  if (node.level === 'loom') return `📦 ${node.name}`
  if (node.level === 'weave') return `🌐 ${node.name}`
  return node.name
}

// ==================== Main Component ====================

export default function SidebarGraphView({
  tree,
  selectedPath,
  onNavigate,
  theme = 'light',
  currentPath,
  currentContent,
}: SidebarGraphViewProps) {
  const resolvePath = useQuarryPath()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  
  const isDark = theme?.includes('dark')
  
  // Determine context based on selection
  const contextInfo = useMemo(() => {
    if (!selectedPath) {
      return { mode: 'weaves' as const, focusPath: null, label: 'All Weaves' }
    }
    
    const node = findNodeByPath(tree, selectedPath)
    if (!node) {
      return { mode: 'weaves' as const, focusPath: null, label: 'All Weaves' }
    }
    
    // If strand selected, show siblings (same loom)
    if (node.level === 'strand') {
      const loomPath = getParentPath(selectedPath)
      const loom = findNodeByPath(tree, loomPath)
      return { 
        mode: 'siblings' as const, 
        focusPath: loomPath, 
        label: loom?.name || 'Siblings',
        currentNode: node
      }
    }
    
    // If loom selected, show its strands
    if (node.level === 'loom') {
      return { 
        mode: 'loom-contents' as const, 
        focusPath: selectedPath, 
        label: node.name,
        currentNode: node
      }
    }
    
    // If weave selected, show its looms
    if (node.level === 'weave') {
      return { 
        mode: 'weave-contents' as const, 
        focusPath: selectedPath, 
        label: node.name,
        currentNode: node
      }
    }
    
    return { mode: 'weaves' as const, focusPath: null, label: 'All Weaves' }
  }, [selectedPath, tree])
  
  // Build contextual graph data
  const { nodes, links } = useMemo(() => {
    const nodeList: GraphNode[] = []
    const linkList: GraphLink[] = []
    
    const traverse = (node: KnowledgeTreeNode, parentId?: string) => {
      let shouldInclude = false
      
      if (contextInfo.mode === 'weaves') {
        shouldInclude = node.level === 'weave'
      } else if (contextInfo.mode === 'siblings') {
        // Show all strands in the same loom
        shouldInclude = node.path.startsWith(contextInfo.focusPath!) && 
                       (node.level === 'strand' || node.path === contextInfo.focusPath)
      } else if (contextInfo.mode === 'loom-contents') {
        shouldInclude = node.path === contextInfo.focusPath || 
                       (node.path.startsWith(contextInfo.focusPath! + '/') && node.level === 'strand')
      } else if (contextInfo.mode === 'weave-contents') {
        shouldInclude = node.path === contextInfo.focusPath || 
                       (node.path.startsWith(contextInfo.focusPath! + '/') && 
                        (node.level === 'loom' || node.level === 'strand'))
      }
      
      if (shouldInclude) {
        const graphNode: GraphNode = {
          id: node.path,
          name: node.name,
          path: node.path,
          level: node.level,
          size: NODE_SIZES[node.level] || 6,
          strandCount: node.strandCount,
          description: node.description,
          emoji: node.style?.emoji,
          isCurrent: node.path === selectedPath,
        }
        
        nodeList.push(graphNode)
        
        if (parentId && nodeList.some(n => n.id === parentId)) {
          linkList.push({ source: parentId, target: node.path })
        }
      }
      
      if (node.children) {
        node.children.forEach(child => traverse(child, node.path))
      }
    }
    
    tree.forEach(node => traverse(node))
    
    return { nodes: nodeList, links: linkList }
  }, [tree, contextInfo, selectedPath])
  
  // D3 simulation
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return
    
    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth || 280
    const height = svgRef.current.clientHeight || 300
    
    svg.selectAll('*').remove()
    
    // Container group for zoom/pan
    const g = svg.append('g')
      .attr('transform', `translate(${width/2}, ${height/2}) scale(${zoom})`)
    
    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(40)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-80))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => (d.size || 5) + 4))
    
    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', isDark ? '#3f3f46' : '#d4d4d8')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.5)
    
    // Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
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
        })
      )
    
    // Node circles
    node.append('circle')
      .attr('r', d => d.size || 5)
      .attr('fill', d => {
        if (d.isCurrent) return isDark ? '#22d3ee' : '#0891b2' // Highlight current
        const colors = COLORS[d.level as keyof typeof COLORS] || COLORS.folder
        return isDark ? colors.dark : colors.light
      })
      .attr('stroke', d => d.isCurrent ? (isDark ? '#fff' : '#000') : 'transparent')
      .attr('stroke-width', d => d.isCurrent ? 3 : 2)
      .on('click', (event, d) => {
        event.stopPropagation()
        onNavigate(d.path)
      })
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', (d.size || 5) * 1.3)
        
        const rect = svgRef.current?.getBoundingClientRect()
        if (rect) {
          setTooltipPos({ 
            x: event.clientX - rect.left, 
            y: event.clientY - rect.top 
          })
        }
        setHoveredNode(d)
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', d.size || 5)
        setHoveredNode(null)
      })
    
    // Node labels for weaves/looms
    node.filter(d => d.level === 'weave' || d.level === 'loom')
      .append('text')
      .attr('y', d => d.size + 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('fill', isDark ? '#e2e8f0' : '#71717a')
      .attr('pointer-events', 'none')
      .text(d => d.emoji ? `${d.emoji} ${d.name.slice(0, 8)}` : d.name.slice(0, 10))
    
    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0)
      
      node.attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`)
    })
    
    return () => {
      simulation.stop()
    }
  }, [nodes, links, zoom, isDark, selectedPath, onNavigate, contextInfo.mode])
  
  return (
    <div ref={containerRef} className="h-full flex flex-col">
      {/* Compact header - shows context */}
      <div className={`
        flex items-center justify-between px-2 py-1.5 border-b
        ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}
      `}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className={`text-[10px] font-semibold truncate ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
            {contextInfo.label}
          </span>
          {contextInfo.mode !== 'weaves' && (
            <span className={`text-[9px] px-1 py-0.5 rounded ${
              isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
            }`}>
              {nodes.length}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setZoom(z => Math.min(z * 1.2, 3))}
            className={`p-1 rounded ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'}`}
            title="Zoom in"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z / 1.2, 0.3))}
            className={`p-1 rounded ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'}`}
            title="Zoom out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      {/* Graph container */}
      <div className="relative flex-1 min-h-[200px]">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{
            background: isDark
              ? 'radial-gradient(circle at center, #18181b 0%, #09090b 100%)'
              : 'radial-gradient(circle at center, #fafafa 0%, #f4f4f5 100%)',
          }}
        />
        
        {/* Tooltip */}
        <AnimatePresence>
          {hoveredNode && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`
                absolute z-20 px-2 py-1.5 rounded-lg shadow-lg pointer-events-none
                max-w-[180px] text-[10px]
                ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}
              `}
              style={{
                left: Math.min(tooltipPos.x + 10, 180),
                top: tooltipPos.y - 60,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {hoveredNode.emoji && <span>{hoveredNode.emoji}</span>}
                <span className={`font-semibold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {hoveredNode.name}
                </span>
              </div>
              <div className={`flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                <span className={`
                  px-1 py-0.5 rounded text-[8px] uppercase font-medium
                  ${hoveredNode.level === 'weave' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : ''}
                  ${hoveredNode.level === 'loom' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' : ''}
                  ${hoveredNode.level === 'strand' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400' : ''}
                `}>
                  {hoveredNode.level}
                </span>
                {hoveredNode.strandCount > 0 && (
                  <span>{hoveredNode.strandCount} strands</span>
                )}
              </div>
              {hoveredNode.description && (
                <p className={`mt-1 line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {hoveredNode.description}
                </p>
              )}
              <p className={`mt-1 text-[8px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Click to open
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Graph Stats Panel */}
      <div className={`
        px-2 py-1.5 border-t space-y-1.5
        ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}
      `}>
        {/* Stats row */}
        <div className="flex items-center justify-between text-[9px]">
          <div className={`flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            <span className="font-mono">{nodes.length} nodes</span>
            <span className="opacity-50">·</span>
            <span className="font-mono">{links.length} links</span>
          </div>
          <div className={`text-[8px] ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
            {contextInfo.mode === 'weaves' && '🌐 Top Level'}
            {contextInfo.mode === 'siblings' && '📄 Siblings'}
            {contextInfo.mode === 'loom-contents' && '📦 Loom View'}
            {contextInfo.mode === 'weave-contents' && '🌐 Weave View'}
          </div>
        </div>
        
        {/* Legend with counts */}
        <div className={`flex items-center justify-between text-[8px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
              <span>Weave</span>
              <span className="font-mono opacity-60">({nodes.filter(n => n.level === 'weave').length})</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" />
              <span>Loom</span>
              <span className="font-mono opacity-60">({nodes.filter(n => n.level === 'loom').length})</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-sm" />
              <span>Strand</span>
              <span className="font-mono opacity-60">({nodes.filter(n => n.level === 'strand').length})</span>
            </div>
          </div>
        </div>
        
        {/* Current node relations */}
        {contextInfo.currentNode && (
          <div className={`
            p-1.5 rounded border text-[8px]
            ${isDark ? 'border-cyan-800/50 bg-cyan-900/20' : 'border-cyan-200 bg-cyan-50'}
          `}>
            <div className={`flex items-center gap-1 mb-1 font-semibold ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
              <span className={`
                px-1 py-0.5 rounded text-[7px] uppercase
                ${contextInfo.currentNode.level === 'strand' ? 'bg-purple-500/20 text-purple-400' : ''}
                ${contextInfo.currentNode.level === 'loom' ? 'bg-amber-500/20 text-amber-400' : ''}
                ${contextInfo.currentNode.level === 'weave' ? 'bg-emerald-500/20 text-emerald-400' : ''}
              `}>
                {contextInfo.currentNode.level}
              </span>
              <span className="truncate">{contextInfo.currentNode.name}</span>
            </div>
            <div className={`space-y-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {contextInfo.currentNode.description && (
                <p className="line-clamp-2">{contextInfo.currentNode.description}</p>
              )}
              <div className="flex items-center gap-2">
                {contextInfo.currentNode.strandCount > 0 && (
                  <span>📄 {contextInfo.currentNode.strandCount} strands</span>
                )}
                {contextInfo.currentNode.children && contextInfo.currentNode.children.length > 0 && (
                  <span>🔗 {contextInfo.currentNode.children.length} children</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mini mindmap preview */}
      {currentContent && contextInfo.currentNode?.level === 'strand' && (
        <div className="px-2 pb-2">
          <MiniMindmapPreview
            content={currentContent}
            title="Structure"
            isDark={isDark}
            height={180}
          />
        </div>
      )}

      {/* Footer with navigation links */}
      <div className={`
        flex flex-col gap-1.5 px-2 py-2 border-t text-[9px]
        ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-zinc-50/30'}
      `}>
        <span className={`text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Drag to reposition • Click to navigate
        </span>

        <div className="flex items-center gap-1.5">
          {/* Mindmap Link */}
          {currentPath && (
            <Link
              href={`/quarry/learn?tab=mindmaps&strand=${encodeURIComponent(currentPath)}`}
              className={`
                flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded font-semibold transition-colors
                ${isDark
                  ? 'bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 border border-purple-700'
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300'
                }
              `}
              title="Open in mindmap viewer"
            >
              <Network className="w-3 h-3" />
              <span>Mindmap</span>
            </Link>
          )}

          {/* Full Graph Link */}
          <Link
            href={resolvePath('/quarry/graph')}
            className={`
              flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded font-semibold transition-colors
              ${isDark
                ? 'bg-cyan-900/50 hover:bg-cyan-800/50 text-cyan-300 border border-cyan-700'
                : 'bg-cyan-100 hover:bg-cyan-200 text-cyan-700 border border-cyan-300'
              }
            `}
            title="Open full fabric graph"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Full Graph</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

