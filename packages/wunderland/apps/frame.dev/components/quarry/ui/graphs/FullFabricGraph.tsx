/**
 * FullFabricGraph - Standalone full-page knowledge graph
 * @module codex/ui/FullFabricGraph
 * 
 * Full-screen interactive graph for /quarry/graph route.
 * Starts from FABRIC level showing all knowledge.
 */

'use client'

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Home, ZoomIn, ZoomOut, Maximize2, Search, Filter, 
  Layers, Box, FileText, ChevronRight, ArrowLeft,
  X, Eye, EyeOff, Download, Settings, Network, Sparkles
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import { useGithubTree } from '../../hooks/useGithubTree'
import type { KnowledgeTreeNode, TagsIndex } from '../../types'

// ==================== Types ====================

interface GraphNode {
  id: string
  name: string
  path: string
  level: 'fabric' | 'weave' | 'loom' | 'strand' | 'folder' | 'collection'
  size: number
  strandCount: number
  description?: string
  emoji?: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  type: 'hierarchy' | 'tag'
}

type ViewLevel = 'fabric' | 'weave' | 'loom'

// ==================== Constants ====================

const COLORS = {
  fabric: { light: '#0891b2', dark: '#22d3ee' },
  weave: { light: '#059669', dark: '#34d399' },
  loom: { light: '#d97706', dark: '#fbbf24' },
  collection: { light: '#8b5cf6', dark: '#a78bfa' },
  strand: { light: '#7c3aed', dark: '#a78bfa' },
  folder: { light: '#64748b', dark: '#94a3b8' },
}

const NODE_SIZES = {
  fabric: 50,
  weave: 30,
  loom: 18,
  collection: 14,
  strand: 8,
  folder: 12,
}

// ==================== Utilities ====================

function buildGraphData(
  tree: KnowledgeTreeNode[],
  viewLevel: ViewLevel,
  focusPath?: string,
  showStrands: boolean = false
): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  
  const traverse = (node: KnowledgeTreeNode, parentId?: string) => {
    // Filter based on view level
    if (viewLevel === 'fabric' && node.level !== 'weave') {
      if (node.children) node.children.forEach(c => traverse(c))
      return
    }
    
    if (viewLevel === 'weave') {
      if (focusPath && !node.path.startsWith(focusPath) && node.path !== focusPath) return
      if (node.level === 'strand' && !showStrands) return
    }
    
    if (viewLevel === 'loom') {
      if (focusPath && !node.path.startsWith(focusPath) && node.path !== focusPath) return
    }
    
    const graphNode: GraphNode = {
      id: node.path,
      name: node.name,
      path: node.path,
      level: node.level,
      size: NODE_SIZES[node.level] || 10,
      strandCount: node.strandCount,
      description: node.description,
      emoji: node.style?.emoji,
    }
    
    nodes.push(graphNode)
    
    if (parentId && nodes.some(n => n.id === parentId)) {
      links.push({ source: parentId, target: node.path, type: 'hierarchy' })
    }
    
    if (node.children) {
      node.children.forEach(child => traverse(child, node.path))
    }
  }
  
  tree.forEach(node => traverse(node))
  return { nodes, links }
}

function getNodeColor(level: string, isDark: boolean, highlighted: boolean = false): string {
  if (highlighted) return isDark ? '#f472b6' : '#ec4899'
  const colors = COLORS[level as keyof typeof COLORS] || COLORS.folder
  return isDark ? colors.dark : colors.light
}

// ==================== Sub Components ====================

function GraphBreadcrumb({ 
  path, 
  viewLevel, 
  onNavigate,
  isDark 
}: { 
  path: string[]
  viewLevel: ViewLevel
  onNavigate: (level: ViewLevel, focusPath?: string) => void
  isDark: boolean 
}) {
  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={() => onNavigate('fabric')}
        className={`px-2 py-1 rounded transition-colors ${
          viewLevel === 'fabric' 
            ? 'bg-cyan-500/20 text-cyan-400' 
            : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
        }`}
      >
        Fabric
      </button>
      {path.map((segment, i) => (
        <React.Fragment key={i}>
          <ChevronRight className="w-4 h-4 text-zinc-500" />
          <span className={`px-2 py-1 rounded ${
            i === path.length - 1 
              ? 'bg-cyan-500/20 text-cyan-400' 
              : isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}>
            {segment}
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

function NodeTooltip({ node, position, isDark }: { 
  node: GraphNode
  position: { x: number; y: number }
  isDark: boolean 
}) {
  const levelColors = {
    weave: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
    loom: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
    strand: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400',
    folder: 'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-400',
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`
        fixed z-50 px-3 py-2 rounded-xl shadow-xl pointer-events-none max-w-[280px]
        ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}
      `}
      style={{ left: position.x + 15, top: position.y - 10 }}
    >
      <div className="flex items-center gap-2 mb-1">
        {node.emoji && <span className="text-lg">{node.emoji}</span>}
        <span className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          {node.name}
        </span>
      </div>
      
      <div className="flex items-center gap-2 text-xs mb-1">
        <span className={`px-1.5 py-0.5 rounded uppercase font-medium ${levelColors[node.level as keyof typeof levelColors] || levelColors.folder}`}>
          {node.level}
        </span>
        {node.strandCount > 0 && (
          <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
            {node.strandCount} strand{node.strandCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      
      {node.description && (
        <p className={`text-xs line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {node.description}
        </p>
      )}
      
      <p className={`text-[10px] mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {node.level === 'strand' ? 'Click to open' : 'Click to explore'}
      </p>
    </motion.div>
  )
}

function GraphLegend({ isDark }: { isDark: boolean }) {
  const items = [
    { level: 'weave', label: 'Weave', color: isDark ? COLORS.weave.dark : COLORS.weave.light, size: 12 },
    { level: 'loom', label: 'Loom', color: isDark ? COLORS.loom.dark : COLORS.loom.light, size: 9 },
    { level: 'strand', label: 'Strand', color: isDark ? COLORS.strand.dark : COLORS.strand.light, size: 6 },
  ]
  
  return (
    <div className={`
      absolute bottom-4 left-4 z-10 px-4 py-3 rounded-xl shadow-lg
      ${isDark ? 'bg-zinc-900/90 border border-zinc-800' : 'bg-white/90 border border-zinc-200'}
    `}>
      <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Legend</p>
      <div className="flex flex-col gap-2">
        {items.map(item => (
          <div key={item.level} className="flex items-center gap-2">
            <div 
              className="rounded-full" 
              style={{ 
                width: item.size, 
                height: item.size, 
                backgroundColor: item.color 
              }} 
            />
            <span className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================== Main Component ====================

export default function FullFabricGraph() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const resolvePath = useQuarryPath()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Fetch knowledge tree
  const { tree, loading, error, totalStrands, totalWeaves } = useGithubTree()
  
  // State
  const [viewLevel, setViewLevel] = useState<ViewLevel>('fabric')
  const [focusPath, setFocusPath] = useState<string | undefined>()
  const [breadcrumbPath, setBreadcrumbPath] = useState<string[]>([])
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [showStrands, setShowStrands] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  
  const isDark = resolvedTheme === 'dark'
  
  // Build graph data
  const { nodes, links } = useMemo(() => {
    if (!tree.length) return { nodes: [], links: [] }
    return buildGraphData(tree, viewLevel, focusPath, showStrands)
  }, [tree, viewLevel, focusPath, showStrands])
  
  // Search highlighting
  const highlightedNodes = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>()
    const q = searchQuery.toLowerCase()
    return new Set(nodes.filter(n => n.name.toLowerCase().includes(q)).map(n => n.id))
  }, [nodes, searchQuery])
  
  // D3 Simulation
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return
    
    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight
    const centerX = width / 2
    const centerY = height / 2
    
    svg.selectAll('*').remove()
    
    const container = svg.append('g')
      .attr('transform', `translate(${centerX + pan.x}, ${centerY + pan.y}) scale(${zoom})`)
    
    // Glow filter
    const defs = svg.append('defs')
    const glow = defs.append('filter').attr('id', 'glow')
    glow.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur')
    const merge = glow.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')
    
    // Simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(d => {
          const source = d.source as GraphNode
          return source.level === 'weave' ? 120 : source.level === 'loom' ? 80 : 50
        })
        .strength(0.6)
      )
      .force('charge', d3.forceManyBody().strength(d => -(d as GraphNode).size * 8))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => d.size + 8))
    
    // Links
    const linkGroup = container.append('g').attr('class', 'links')
    const linkElements = linkGroup.selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', isDark ? '#3f3f46' : '#d4d4d8')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4)
    
    // Nodes
    const nodeGroup = container.append('g').attr('class', 'nodes')
    const nodeElements = nodeGroup.selectAll('g')
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
    nodeElements.append('circle')
      .attr('r', d => d.size || 5)
      .attr('fill', d => getNodeColor(d.level, isDark, highlightedNodes.has(d.id)))
      .attr('stroke', d => highlightedNodes.has(d.id) ? (isDark ? '#fff' : '#000') : 'transparent')
      .attr('stroke-width', 2)
      .attr('filter', d => highlightedNodes.has(d.id) ? 'url(#glow)' : 'none')
      .on('click', (event, d) => {
        event.stopPropagation()
        
        if (d.level === 'weave' && viewLevel === 'fabric') {
          setViewLevel('weave')
          setFocusPath(d.path)
          setBreadcrumbPath([d.name])
        } else if (d.level === 'loom' && viewLevel === 'weave') {
          setViewLevel('loom')
          setFocusPath(d.path)
          setBreadcrumbPath(prev => [...prev, d.name])
        } else if (d.level === 'strand') {
          // Use clean SEO-friendly URLs with trailing slash for static export
          const cleanPath = d.path.replace(/\.md$/, '')
          // Handle root-level README specially - navigate to quarry root
          if (cleanPath.toLowerCase() === 'readme' || cleanPath.toLowerCase() === 'index') {
            window.location.href = '/quarry/'
          } else {
            window.location.href = `/quarry/${cleanPath}/`
          }
        } else if (d.level === 'loom' && viewLevel === 'loom') {
          // Use clean URL for directory with trailing slash
          window.location.href = `/quarry/${d.path}/`
        }
      })
      .on('mouseenter', function(event, d) {
        d3.select(this).transition().duration(150).attr('r', d.size * 1.2)
        setHoveredNode(d)
        setTooltipPosition({ x: event.clientX, y: event.clientY })
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).transition().duration(150).attr('r', d.size)
        setHoveredNode(null)
      })
      .on('mousemove', (event) => {
        setTooltipPosition({ x: event.clientX, y: event.clientY })
      })
    
    // Node emojis
    nodeElements.filter(d => !!d.emoji)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', d => d.size * 0.8)
      .attr('pointer-events', 'none')
      .text(d => d.emoji || '')
    
    // Labels
    if (showLabels) {
      nodeElements.filter(d => d.level !== 'strand')
        .append('text')
        .attr('y', d => d.size + 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', isDark ? '#e2e8f0' : '#71717a')
        .attr('pointer-events', 'none')
        .text(d => d.name.length > 15 ? d.name.slice(0, 15) + '…' : d.name)
    }
    
    // Tick
    simulation.on('tick', () => {
      linkElements
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0)
      
      nodeElements.attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`)
    })
    
    return () => { simulation.stop() }
  }, [nodes, links, zoom, pan, isDark, highlightedNodes, showLabels, router, viewLevel])
  
  // Navigation handlers
  const handleNavigateLevel = useCallback((level: ViewLevel, path?: string) => {
    setViewLevel(level)
    setFocusPath(path)
    if (level === 'fabric') {
      setBreadcrumbPath([])
    }
  }, [])
  
  const handleGoBack = useCallback(() => {
    if (viewLevel === 'loom') {
      setViewLevel('weave')
      const newPath = breadcrumbPath.slice(0, -1)
      setBreadcrumbPath(newPath)
      // Set focus to parent weave
      if (focusPath) {
        const parts = focusPath.split('/')
        parts.pop()
        setFocusPath(parts.join('/'))
      }
    } else if (viewLevel === 'weave') {
      setViewLevel('fabric')
      setFocusPath(undefined)
      setBreadcrumbPath([])
    }
  }, [viewLevel, breadcrumbPath, focusPath])
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 animate-pulse" />
          <p className="text-zinc-400">Loading knowledge graph...</p>
          <p className="text-zinc-600 text-sm mt-1">Fetching {totalWeaves} weaves, {totalStrands} strands</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center text-red-400">
          <p>Failed to load knowledge graph</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div ref={containerRef} className={`min-h-screen ${isDark ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
      {/* Header */}
      <header className={`
        fixed top-0 left-0 right-0 z-40 px-4 py-3
        ${isDark ? 'bg-zinc-950/80' : 'bg-white/80'} backdrop-blur-xl
        border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
      `}>
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/quarry" 
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'}`}
              title="Back to Codex"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            
            <Link 
              href={resolvePath('/quarry/learn')} 
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${isDark 
                  ? 'hover:bg-emerald-900/40 text-emerald-400 hover:text-emerald-300' 
                  : 'hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700'
                }
              `}
              title="Learning Studio"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Learn</span>
            </Link>
            
            {viewLevel !== 'fabric' && (
              <button
                onClick={handleGoBack}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-200 text-zinc-700'}`}
                title="Go up"
              >
                <Home className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex items-center gap-2">
              <Network className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <h1 className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                Fabric Graph
              </h1>
            </div>
            
            <GraphBreadcrumb 
              path={breadcrumbPath} 
              viewLevel={viewLevel} 
              onNavigate={handleNavigateLevel}
              isDark={isDark} 
            />
          </div>
          
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className={`
              flex items-center gap-2 px-3 py-2 rounded-lg
              ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-200/50'}
            `}>
              <Search className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes..."
                className={`
                  bg-transparent text-sm outline-none w-40
                  ${isDark ? 'text-zinc-200 placeholder:text-zinc-500' : 'text-zinc-800 placeholder:text-zinc-400'}
                `}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Toggle strands */}
            <button
              onClick={() => setShowStrands(!showStrands)}
              className={`
                p-2 rounded-lg transition-colors text-xs flex items-center gap-1
                ${showStrands 
                  ? isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600'
                  : isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'
                }
              `}
              title="Toggle strands"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Strands</span>
            </button>
            
            {/* Labels */}
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'}`}
              title={showLabels ? 'Hide labels' : 'Show labels'}
            >
              {showLabels ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>
      
      {/* Graph SVG */}
      <svg
        ref={svgRef}
        className="w-full h-screen pt-16"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at center, #18181b 0%, #09090b 100%)'
            : 'radial-gradient(ellipse at center, #fafafa 0%, #e4e4e7 100%)',
          cursor: 'grab',
        }}
        onWheel={(e) => {
          const delta = e.deltaY > 0 ? 0.9 : 1.1
          setZoom(z => Math.max(0.2, Math.min(4, z * delta)))
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
      
      {/* Legend */}
      <GraphLegend isDark={isDark} />
      
      {/* Zoom controls */}
      <div className="fixed bottom-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setZoom(z => Math.min(z * 1.2, 4))}
          className={`p-2 rounded-lg shadow-lg ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-white hover:bg-zinc-100 text-zinc-700'}`}
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(z / 1.2, 0.2))}
          className={`p-2 rounded-lg shadow-lg ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-white hover:bg-zinc-100 text-zinc-700'}`}
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
          className={`p-2 rounded-lg shadow-lg ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-white hover:bg-zinc-100 text-zinc-700'}`}
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>
      
      {/* Stats */}
      <div className={`
        fixed top-20 right-4 z-10 px-4 py-2 rounded-lg shadow-lg text-sm
        ${isDark ? 'bg-zinc-900/90 border border-zinc-800' : 'bg-white/90 border border-zinc-200'}
      `}>
        <div className="flex items-center gap-4">
          <div>
            <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Nodes:</span>
            <span className={`ml-1 font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{nodes.length}</span>
          </div>
          <div>
            <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Links:</span>
            <span className={`ml-1 font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{links.length}</span>
          </div>
          <div>
            <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Zoom:</span>
            <span className={`ml-1 font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{Math.round(zoom * 100)}%</span>
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      <AnimatePresence>
        {hoveredNode && (
          <NodeTooltip node={hoveredNode} position={tooltipPosition} isDark={isDark} />
        )}
      </AnimatePresence>
    </div>
  )
}

