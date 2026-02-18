/**
 * FabricGraphView - Advanced multi-level knowledge graph visualization
 * @module codex/ui/FabricGraphView
 * 
 * @remarks
 * Sophisticated graph visualization supporting OpenStrand hierarchy:
 * - FABRIC view: Overview of all weaves in the knowledge base
 * - WEAVE view: Detailed view of looms within a weave
 * - LOOM view: Strand-level detail within a loom
 * 
 * Features:
 * - Force-directed layout with hierarchy-aware clustering
 * - Click to drill down through hierarchy levels
 * - Filter by tags, categories, and relationships
 * - Animated transitions between views
 * - Mini-map for large graphs
 * - Search within graph
 * - Export graph data
 */

'use client'

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { motion, AnimatePresence } from 'framer-motion'
import { Z_INDEX } from '../../constants'
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Home,
  Search,
  Filter,
  Tag,
  Layers,
  Box,
  FileText,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Download,
  Settings,
  Eye,
  EyeOff,
  Sparkles,
  Network,
  Route,
} from 'lucide-react'
import Link from 'next/link'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import type { KnowledgeTreeNode, TagsIndex } from '../../types'

// ==================== Types ====================

interface GraphNode {
  id: string
  name: string
  path: string
  level: 'fabric' | 'weave' | 'loom' | 'collection' | 'strand' | 'folder'
  size: number
  strandCount: number
  tags?: string[]
  subjects?: string[]
  topics?: string[]
  description?: string
  style?: {
    backgroundColor?: string
    accentColor?: string
    emoji?: string
    icon?: string
  }
  // D3 simulation properties
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
  vx?: number
  vy?: number
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  type: 'parent-child' | 'tag-relation' | 'cross-reference'
  strength: number
}

type ViewLevel = 'fabric' | 'weave' | 'loom'

interface FabricGraphViewProps {
  /** Knowledge tree data */
  tree: KnowledgeTreeNode[]
  /** Tags index for filtering */
  tagsIndex?: TagsIndex
  /** Currently selected path */
  selectedPath?: string | null
  /** Navigate to a node */
  onNavigate: (path: string) => void
  /** Close graph view */
  onClose: () => void
  /** Theme */
  theme?: string
}

// ==================== Constants ====================

const COLORS = {
  fabric: { light: '#0891b2', dark: '#22d3ee' },     // cyan
  weave: { light: '#059669', dark: '#34d399' },      // emerald
  loom: { light: '#d97706', dark: '#fbbf24' },       // amber
  collection: { light: '#8b5cf6', dark: '#a78bfa' }, // violet
  strand: { light: '#7c3aed', dark: '#a78bfa' },     // purple
  folder: { light: '#64748b', dark: '#94a3b8' },     // slate
  link: { light: '#cbd5e1', dark: '#475569' },
  highlight: { light: '#ec4899', dark: '#f472b6' },  // pink
}

const NODE_SIZES = {
  fabric: 40,
  weave: 28,
  loom: 18,
  collection: 16,
  strand: 10,
  folder: 14,
}

const LEVEL_LABELS = {
  fabric: 'Fabric',
  weave: 'Weave',
  loom: 'Loom',
  collection: 'Collection',
  strand: 'Strand',
  folder: 'Folder',
}

// ==================== Utilities ====================

/**
 * Build graph nodes and links from tree
 */
function buildGraphData(
  tree: KnowledgeTreeNode[],
  viewLevel: ViewLevel,
  focusPath?: string
): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  const nodeMap = new Map<string, GraphNode>()
  
  const traverse = (node: KnowledgeTreeNode, parentPath?: string) => {
    // Filter based on view level and focus
    if (viewLevel === 'fabric') {
      // Only show weaves at fabric level
      if (node.level !== 'weave' && node.level !== 'fabric') return
    } else if (viewLevel === 'weave') {
      // Show looms within a specific weave
      if (focusPath && !node.path.startsWith(focusPath)) return
      if (node.level === 'strand') return // Don't show strands at weave level
    } else if (viewLevel === 'loom') {
      // Show strands within a specific loom
      if (focusPath && !node.path.startsWith(focusPath)) return
    }
    
    const graphNode: GraphNode = {
      id: node.path,
      name: node.name,
      path: node.path,
      level: node.level,
      size: NODE_SIZES[node.level] || NODE_SIZES.folder,
      strandCount: node.strandCount || 0,
      description: node.description,
      style: node.style,
    }
    
    nodes.push(graphNode)
    nodeMap.set(node.path, graphNode)
    
    // Create parent-child link
    if (parentPath && nodeMap.has(parentPath)) {
      links.push({
        source: parentPath,
        target: node.path,
        type: 'parent-child',
        strength: 0.7,
      })
    }
    
    // Traverse children
    if (node.children) {
      node.children.forEach(child => traverse(child, node.path))
    }
  }
  
  tree.forEach(node => traverse(node))
  
  return { nodes, links }
}

/**
 * Get node color based on level and theme
 */
function getNodeColor(level: string, isDark: boolean, isHighlighted: boolean): string {
  if (isHighlighted) {
    return isDark ? COLORS.highlight.dark : COLORS.highlight.light
  }
  
  const colorKey = level as keyof typeof COLORS
  const color = COLORS[colorKey] || COLORS.folder
  return isDark ? color.dark : color.light
}

// ==================== Mini Components ====================

/**
 * Breadcrumb navigation for graph hierarchy
 */
function GraphBreadcrumb({
  path,
  viewLevel,
  onNavigateUp,
  onGoHome,
  isDark
}: {
  path: string[]
  viewLevel: ViewLevel
  onNavigateUp: () => void
  onGoHome: () => void
  isDark: boolean
}) {
  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={onGoHome}
        className={`
          p-1.5 rounded-lg transition-colors
          ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'}
        `}
        title="Return to fabric view"
      >
        <Home className="w-4 h-4" />
      </button>
      
      {path.length > 0 && (
        <>
          <ChevronRight className={`w-4 h-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
          {path.map((segment, i) => (
            <React.Fragment key={i}>
              <button
                onClick={() => i < path.length - 1 ? onNavigateUp() : null}
                className={`
                  px-2 py-1 rounded text-xs font-medium transition-colors capitalize
                  ${i === path.length - 1
                    ? isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-800'
                    : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-800'
                  }
                `}
              >
                {segment}
              </button>
              {i < path.length - 1 && (
                <ChevronRight className={`w-3 h-3 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
              )}
            </React.Fragment>
          ))}
        </>
      )}
      
      <span className={`
        ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
        ${viewLevel === 'fabric' 
          ? isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
          : viewLevel === 'weave'
            ? isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
            : isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'
        }
      `}>
        {LEVEL_LABELS[viewLevel]} View
      </span>
    </div>
  )
}

/**
 * Filter panel for graph nodes
 */
function GraphFilterPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  tagsIndex,
  isDark
}: {
  isOpen: boolean
  onClose: () => void
  filters: {
    showWeaves: boolean
    showLooms: boolean
    showStrands: boolean
    selectedTags: string[]
    selectedSubjects: string[]
    minStrandCount: number
  }
  onFiltersChange: (filters: any) => void
  tagsIndex?: TagsIndex
  isDark: boolean
}) {
  if (!isOpen) return null
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        absolute left-4 top-24 z-20 w-64 rounded-xl shadow-2xl overflow-hidden
        ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}
      `}
    >
      <div className={`
        px-4 py-3 flex items-center justify-between border-b
        ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
      `}>
        <div className="flex items-center gap-2">
          <Filter className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <span className={`font-semibold text-sm ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            Filters
          </span>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Level toggles */}
        <div className="space-y-2">
          <label className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Show Levels
          </label>
          
          {[
            { key: 'showWeaves', label: 'Weaves', icon: Layers, color: 'emerald' },
            { key: 'showLooms', label: 'Looms', icon: Box, color: 'amber' },
            { key: 'showStrands', label: 'Strands', icon: FileText, color: 'purple' },
          ].map(({ key, label, icon: Icon, color }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters[key as keyof typeof filters] as boolean}
                onChange={() => onFiltersChange({ 
                  ...filters, 
                  [key]: !filters[key as keyof typeof filters] 
                })}
                className={`w-4 h-4 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}
              />
              <Icon className={`w-4 h-4 text-${color}-500`} />
              <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {label}
              </span>
            </label>
          ))}
        </div>
        
        {/* Min strand count */}
        <div className="space-y-2">
          <label className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Minimum Strands: {filters.minStrandCount}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.minStrandCount}
            onChange={(e) => onFiltersChange({ 
              ...filters, 
              minStrandCount: parseInt(e.target.value) 
            })}
            className="w-full"
          />
        </div>
        
        {/* Tags filter */}
        {tagsIndex && tagsIndex.tags.length > 0 && (
          <div className="space-y-2">
            <label className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Filter by Tags
            </label>
            <div className="flex flex-wrap gap-1">
              {tagsIndex.tags.slice(0, 10).map(tag => (
                <button
                  key={tag.name}
                  onClick={() => {
                    const selected = filters.selectedTags.includes(tag.name)
                      ? filters.selectedTags.filter(t => t !== tag.name)
                      : [...filters.selectedTags, tag.name]
                    onFiltersChange({ ...filters, selectedTags: selected })
                  }}
                  className={`
                    px-2 py-1 rounded-full text-[10px] font-medium transition-colors
                    ${filters.selectedTags.includes(tag.name)
                      ? isDark ? 'bg-cyan-600 text-white' : 'bg-cyan-500 text-white'
                      : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }
                  `}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Legend panel
 */
function GraphLegend({ isDark }: { isDark: boolean }) {
  const levels = [
    { level: 'fabric', label: 'Fabric (Root)', color: COLORS.fabric },
    { level: 'weave', label: 'Weave (Universe)', color: COLORS.weave },
    { level: 'loom', label: 'Loom (Collection)', color: COLORS.loom },
    { level: 'strand', label: 'Strand (Document)', color: COLORS.strand },
  ]
  
  return (
    <div className={`
      absolute bottom-4 left-4 z-10 p-3 rounded-xl
      ${isDark ? 'bg-zinc-900/95 border border-zinc-800' : 'bg-white/95 border border-zinc-200'}
      shadow-lg backdrop-blur-sm
    `}>
      <h4 className={`text-xs font-bold mb-2 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
        Knowledge Hierarchy
      </h4>
      <div className="space-y-1.5">
        {levels.map(({ level, label, color }) => (
          <div key={level} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: isDark ? color.dark : color.light }}
            />
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className={`
        mt-2 pt-2 border-t text-[10px]
        ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'}
      `}>
        <p>Click node to drill down</p>
        <p>Double-click to navigate</p>
      </div>
    </div>
  )
}

/**
 * Node tooltip
 */
function NodeTooltip({
  node,
  position,
  isDark
}: {
  node: GraphNode | null
  position: { x: number; y: number }
  isDark: boolean
}) {
  if (!node) return null
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`
        fixed z-50 px-3 py-2 rounded-lg shadow-xl max-w-xs pointer-events-none
        ${isDark ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-zinc-200'}
      `}
      style={{
        left: position.x + 15,
        top: position.y - 10,
      }}
    >
      <div className="flex items-start gap-2">
        {node.style?.emoji && (
          <span className="text-lg">{node.style.emoji}</span>
        )}
        <div>
          <h4 className={`font-bold text-sm capitalize ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {node.name}
          </h4>
          <div className={`flex items-center gap-2 text-[10px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            <span className={`
              px-1.5 py-0.5 rounded-full font-medium uppercase
              ${node.level === 'weave' 
                ? isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                : node.level === 'loom'
                  ? isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'
                  : isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
              }
            `}>
              {node.level}
            </span>
            <span>{node.strandCount} strands</span>
          </div>
          {node.description && (
            <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {node.description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ==================== Main Component ====================

/**
 * Advanced multi-level fabric graph visualization
 */
export default function FabricGraphView({
  tree,
  tagsIndex,
  selectedPath,
  onNavigate,
  onClose,
  theme = 'light',
}: FabricGraphViewProps) {
  const resolvePath = useQuarryPath()
  const isDark = theme?.includes('dark')
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // View state
  const [viewLevel, setViewLevel] = useState<ViewLevel>('fabric')
  const [focusPath, setFocusPath] = useState<string | undefined>()
  const [breadcrumbPath, setBreadcrumbPath] = useState<string[]>([])
  
  // Interaction state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  
  // UI state
  const [showFilters, setShowFilters] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [filters, setFilters] = useState({
    showWeaves: true,
    showLooms: true,
    showStrands: true,
    selectedTags: [] as string[],
    selectedSubjects: [] as string[],
    minStrandCount: 0,
  })
  
  // Build graph data based on view level
  const { nodes, links } = useMemo(() => {
    const data = buildGraphData(tree, viewLevel, focusPath)
    
    // Apply filters
    let filteredNodes = data.nodes
    
    if (!filters.showWeaves) {
      filteredNodes = filteredNodes.filter(n => n.level !== 'weave')
    }
    if (!filters.showLooms) {
      filteredNodes = filteredNodes.filter(n => n.level !== 'loom')
    }
    if (!filters.showStrands) {
      filteredNodes = filteredNodes.filter(n => n.level !== 'strand')
    }
    
    if (filters.minStrandCount > 0) {
      filteredNodes = filteredNodes.filter(n => n.strandCount >= filters.minStrandCount)
    }
    
    // Filter links to only include those with both endpoints
    const nodeIds = new Set(filteredNodes.map(n => n.id))
    const filteredLinks = data.links.filter(
      l => nodeIds.has(l.source as string) && nodeIds.has(l.target as string)
    )
    
    return { nodes: filteredNodes, links: filteredLinks }
  }, [tree, viewLevel, focusPath, filters])
  
  // Search highlighting
  const highlightedNodes = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>()
    
    const query = searchQuery.toLowerCase()
    return new Set(
      nodes
        .filter(n => n.name.toLowerCase().includes(query))
        .map(n => n.id)
    )
  }, [nodes, searchQuery])
  
  // D3 force simulation
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return
    
    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight
    const centerX = width / 2
    const centerY = height / 2
    
    // Clear previous render
    svg.selectAll('*').remove()
    
    // Create container for zoom/pan
    const container = svg.append('g')
      .attr('class', 'graph-container')
      .attr('transform', `translate(${centerX + pan.x}, ${centerY + pan.y}) scale(${zoom})`)
    
    // Add definitions (gradients, glows)
    const defs = svg.append('defs')
    
    // Glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'node-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')
    
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur')
    
    const feMerge = glowFilter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')
    
    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(d => {
          // Shorter links for parent-child
          if (d.type === 'parent-child') return 80
          return 150
        })
        .strength(d => d.strength)
      )
      .force('charge', d3.forceManyBody()
        .strength(d => {
          // Stronger repulsion for larger nodes
          const node = d as GraphNode
          return -Math.max(100, node.size * 10)
        })
      )
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide<GraphNode>()
        .radius(d => d.size + 10)
      )
    
    // Draw links
    const linkGroup = container.append('g').attr('class', 'links')
    
    const linkElements = linkGroup.selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', isDark ? COLORS.link.dark : COLORS.link.light)
      .attr('stroke-width', d => d.type === 'parent-child' ? 2 : 1)
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', d => d.type === 'parent-child' ? 'none' : '4,4')
    
    // Draw nodes
    const nodeGroup = container.append('g').attr('class', 'nodes')
    
    const nodeElements = nodeGroup.selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
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
      .attr('fill', d => {
        if (d.style?.backgroundColor) return d.style.backgroundColor
        return getNodeColor(d.level, isDark, highlightedNodes.has(d.id))
      })
      .attr('stroke', d => {
        if (d.path === selectedPath) return isDark ? '#fff' : '#000'
        if (highlightedNodes.has(d.id)) return isDark ? COLORS.highlight.dark : COLORS.highlight.light
        return 'none'
      })
      .attr('stroke-width', d => d.path === selectedPath || highlightedNodes.has(d.id) ? 3 : 0)
      .attr('filter', d => highlightedNodes.has(d.id) ? 'url(#node-glow)' : 'none')
      .on('click', (event, d) => {
        event.stopPropagation()
        
        // Drill down on click
        if (d.level === 'weave' && viewLevel === 'fabric') {
          setViewLevel('weave')
          setFocusPath(d.path)
          setBreadcrumbPath([d.name])
        } else if (d.level === 'loom' && viewLevel === 'weave') {
          setViewLevel('loom')
          setFocusPath(d.path)
          setBreadcrumbPath(prev => [...prev, d.name])
        }
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation()
        onNavigate(d.path)
        onClose()
      })
      .on('mouseenter', function(event, d) {
        const parent = this.parentNode as Element | null
        if (parent) {
          d3.select(parent)
            .select('circle')
            .transition()
            .duration(200)
            .attr('r', d.size * 1.2)
        }
        
        setHoveredNode(d)
        setTooltipPosition({ x: event.clientX, y: event.clientY })
      })
      .on('mouseleave', function(event, d) {
        const parent = this.parentNode as Element | null
        if (parent) {
          d3.select(parent)
            .select('circle')
            .transition()
            .duration(200)
            .attr('r', d.size)
        }
        
        setHoveredNode(null)
      })
      .on('mousemove', (event) => {
        setTooltipPosition({ x: event.clientX, y: event.clientY })
      })
    
    // Node emoji/icon
    nodeElements.each(function(d) {
      if (d.style?.emoji) {
        d3.select(this)
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', d.size * 0.8)
          .attr('pointer-events', 'none')
          .text(d.style.emoji)
      }
    })
    
    // Node labels (if enabled and not strands)
    if (showLabels) {
      nodeElements
        .filter(d => d.level !== 'strand')
        .append('text')
        .attr('y', d => d.size + 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', isDark ? '#e2e8f0' : '#334155')
        .attr('pointer-events', 'none')
        .text(d => d.name.length > 12 ? d.name.slice(0, 12) + '...' : d.name)
        .style('text-transform', 'capitalize')
    }
    
    // Strand count badge
    nodeElements
      .filter(d => d.strandCount > 0 && d.level !== 'strand')
      .append('g')
      .attr('transform', d => `translate(${d.size * 0.7}, ${-d.size * 0.7})`)
      .call(g => {
        g.append('circle')
          .attr('r', 8)
          .attr('fill', isDark ? '#18181b' : '#fff')
          .attr('stroke', isDark ? '#3f3f46' : '#e4e4e7')
          .attr('stroke-width', 1)
        
        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', '8px')
          .attr('font-weight', 'bold')
          .attr('fill', isDark ? '#e2e8f0' : '#71717a')
          .attr('pointer-events', 'none')
          .text(d => d.strandCount > 99 ? '99+' : d.strandCount)
      })
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
      linkElements
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0)
      
      nodeElements.attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`)
    })
    
    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [nodes, links, zoom, pan, isDark, showLabels, selectedPath, highlightedNodes, onNavigate, onClose, viewLevel])
  
  // Navigation handlers
  const handleGoHome = useCallback(() => {
    setViewLevel('fabric')
    setFocusPath(undefined)
    setBreadcrumbPath([])
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])
  
  const handleNavigateUp = useCallback(() => {
    if (viewLevel === 'loom') {
      setViewLevel('weave')
      const newPath = focusPath?.split('/').slice(0, 2).join('/')
      setFocusPath(newPath)
      setBreadcrumbPath(prev => prev.slice(0, -1))
    } else if (viewLevel === 'weave') {
      handleGoHome()
    }
  }, [viewLevel, focusPath, handleGoHome])
  
  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 4))
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.2))
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex"
      style={{ zIndex: Z_INDEX.MODAL }}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${isDark ? 'bg-black/90' : 'bg-black/80'} backdrop-blur-md`}
        onClick={onClose}
      />
      
      {/* Main container */}
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        ref={containerRef}
        className={`
          relative w-full h-full m-2 sm:m-4 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl
          ${isDark ? 'bg-zinc-950 border border-zinc-800' : 'bg-white border border-zinc-200'}
        `}
      >
        {/* Header - responsive */}
        <div className={`
          absolute top-0 left-0 right-0 z-10 px-3 sm:px-6 py-3 sm:py-4 
          flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4
          ${isDark 
            ? 'bg-gradient-to-b from-zinc-900/98 via-zinc-900/90 to-transparent' 
            : 'bg-gradient-to-b from-white/98 via-white/90 to-transparent'
          }
        `}>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            {viewLevel !== 'fabric' && (
              <button
                onClick={handleNavigateUp}
                className={`
                  p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center
                  ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}
                `}
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className={`
                  w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center
                  ${isDark 
                    ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30' 
                    : 'bg-gradient-to-br from-cyan-100 to-purple-100 border border-cyan-200'
                  }
                `}>
                  <Network className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                </div>
                <div>
                  <h2 className={`text-base sm:text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    Fabric Graph
                  </h2>
                  <div className="hidden sm:block">
                    <GraphBreadcrumb
                      path={breadcrumbPath}
                      viewLevel={viewLevel}
                      onNavigateUp={handleNavigateUp}
                      onGoHome={handleGoHome}
                      isDark={isDark}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mobile close button */}
            <button
              onClick={onClose}
              className={`
                sm:hidden p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center
                ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}
              `}
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Right controls - responsive */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {/* Search - expandable on mobile */}
            <div className={`
              flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg flex-1 sm:flex-initial min-w-0
              ${isDark ? 'bg-zinc-800/70' : 'bg-zinc-100'}
            `}>
              <Search className={`w-4 h-4 shrink-0 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className={`
                  bg-transparent text-sm outline-none w-full sm:w-32
                  ${isDark ? 'text-zinc-200 placeholder:text-zinc-500' : 'text-zinc-800 placeholder:text-zinc-400'}
                `}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                p-2 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0
                ${showFilters
                  ? isDark ? 'bg-cyan-900/50 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
                  : isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
                }
              `}
              title="Toggle filters"
            >
              <Filter className="w-5 h-5" />
            </button>
            
            {/* Labels toggle */}
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`
                p-2 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0
                ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}
              `}
              title={showLabels ? 'Hide labels' : 'Show labels'}
            >
              {showLabels ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            
            {/* Spiral Path link */}
            <Link
              href={resolvePath('/quarry/spiral-path')}
              className={`
                p-2 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0
                text-emerald-500 hover:text-emerald-400
                ${isDark ? 'hover:bg-emerald-900/30' : 'hover:bg-emerald-100'}
              `}
              title="Open Spiral Path - Learning journey planner with prerequisites and mastery tracking"
            >
              <Route className="w-5 h-5" />
            </Link>
            
            {/* Home button */}
            <button
              onClick={handleGoHome}
              className={`
                p-2 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0
                ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}
              `}
              title="Reset to fabric view"
            >
              <Home className="w-5 h-5" />
            </button>
            
            {/* Close - desktop only */}
            <button
              onClick={onClose}
              className={`
                hidden sm:flex p-2 rounded-lg transition-colors min-h-[40px] min-w-[40px] items-center justify-center shrink-0
                ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}
              `}
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <GraphFilterPanel
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
              filters={filters}
              onFiltersChange={setFilters}
              tagsIndex={tagsIndex}
              isDark={isDark}
            />
          )}
        </AnimatePresence>
        
        {/* SVG Graph */}
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse at center, #18181b 0%, #09090b 100%)'
              : 'radial-gradient(ellipse at center, #fafafa 0%, #e4e4e7 100%)',
            cursor: 'grab',
          }}
          onWheel={(e) => {
            e.preventDefault()
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
        
        {/* Legend - responsive positioning */}
        <div className="hidden sm:block">
          <GraphLegend isDark={isDark} />
        </div>
        
        {/* Zoom controls - responsive */}
        <div className="absolute bottom-16 sm:bottom-4 right-2 sm:right-4 z-10 flex flex-col gap-1.5 sm:gap-2">
          <button
            onClick={handleZoomIn}
            className={`
              p-2.5 sm:p-2 rounded-xl sm:rounded-lg transition-all shadow-lg active:scale-95
              min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center
              ${isDark 
                ? 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border border-zinc-700' 
                : 'bg-white/90 hover:bg-zinc-50 text-zinc-700 border border-zinc-200'
              }
            `}
            title="Zoom in (+)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className={`
              p-2.5 sm:p-2 rounded-xl sm:rounded-lg transition-all shadow-lg active:scale-95
              min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center
              ${isDark 
                ? 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border border-zinc-700' 
                : 'bg-white/90 hover:bg-zinc-50 text-zinc-700 border border-zinc-200'
              }
            `}
            title="Zoom out (-)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={handleReset}
            className={`
              p-2.5 sm:p-2 rounded-xl sm:rounded-lg transition-all shadow-lg active:scale-95
              min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center
              ${isDark 
                ? 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border border-zinc-700' 
                : 'bg-white/90 hover:bg-zinc-50 text-zinc-700 border border-zinc-200'
              }
            `}
            title="Reset view (0)"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
        
        {/* Stats panel - sleek design */}
        <div className={`
          absolute top-[120px] sm:top-20 right-2 sm:right-4 z-10 
          px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-xl backdrop-blur-sm
          ${isDark 
            ? 'bg-zinc-900/80 border border-zinc-700/50' 
            : 'bg-white/80 border border-zinc-200/50'
          }
        `}>
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-cyan-400' : 'bg-cyan-500'}`} />
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Nodes</span>
              <span className={`font-bold tabular-nums ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                {nodes.length}
              </span>
            </div>
            <div className={`w-px h-4 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-purple-400' : 'bg-purple-500'}`} />
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Links</span>
              <span className={`font-bold tabular-nums ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                {links.length}
              </span>
            </div>
            <div className={`hidden sm:block w-px h-4 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
            <div className="hidden sm:flex items-center gap-1.5">
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Zoom</span>
              <span className={`font-bold tabular-nums ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Mobile bottom bar with quick actions */}
        <div className={`
          sm:hidden absolute bottom-0 left-0 right-0 z-10
          px-3 py-3 flex items-center justify-between
          ${isDark 
            ? 'bg-gradient-to-t from-zinc-900 via-zinc-900/95 to-transparent' 
            : 'bg-gradient-to-t from-white via-white/95 to-transparent'
          }
        `}>
          {/* Breadcrumb on mobile */}
          <div className="flex-1 min-w-0">
            <GraphBreadcrumb
              path={breadcrumbPath}
              viewLevel={viewLevel}
              onNavigateUp={handleNavigateUp}
              onGoHome={handleGoHome}
              isDark={isDark}
            />
          </div>
          
          {/* Zoom indicator */}
          <div className={`
            px-2 py-1 rounded-lg text-xs font-medium tabular-nums
            ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}
          `}>
            {Math.round(zoom * 100)}%
          </div>
        </div>
        
        {/* Tooltip */}
        <AnimatePresence>
          {hoveredNode && (
            <NodeTooltip
              node={hoveredNode}
              position={tooltipPosition}
              isDark={isDark}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
