/**
 * AtlasCanvas - Main React Flow canvas for the Atlas view
 * @module quarry/atlas/AtlasCanvas
 */

'use client'

import React, { useCallback, useMemo, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Panel,
  Node,
  Edge,
  ConnectionMode,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  GitBranch,
  Calendar,
  Filter,
  X,
  Loader2,
} from 'lucide-react'
import { nodeTypes, StrandNodeData } from './nodes/nodeTypes'
import type { KnowledgeTreeNode } from '../types'

// ============================================================================
// TYPES
// ============================================================================

export type LayoutType = 'force' | 'grid' | 'cluster' | 'timeline'

interface AtlasCanvasProps {
  /** Knowledge tree data */
  tree: KnowledgeTreeNode[]
  /** Currently selected path */
  selectedPath?: string | null
  /** Navigate to a strand */
  onNavigate: (path: string) => void
  /** Current theme */
  theme?: string
  /** Loading state */
  loading?: boolean
}

// ============================================================================
// LAYOUT ALGORITHMS
// ============================================================================

function applyGridLayout(
  nodes: Node<StrandNodeData>[],
  columns = 5
): Node<StrandNodeData>[] {
  const nodeWidth = 200
  const nodeHeight = 100
  const gapX = 40
  const gapY = 40

  return nodes.map((node, i) => {
    const col = i % columns
    const row = Math.floor(i / columns)
    return {
      ...node,
      position: {
        x: col * (nodeWidth + gapX),
        y: row * (nodeHeight + gapY),
      },
    }
  })
}

function applyForceLayout(
  nodes: Node<StrandNodeData>[],
  edges: Edge[]
): Node<StrandNodeData>[] {
  // Simple force-directed approximation without full simulation
  // For full force layout, we'd integrate D3 force simulation
  const centerX = 400
  const centerY = 300
  const radius = Math.max(200, nodes.length * 15)

  return nodes.map((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI
    const r = radius * (0.5 + Math.random() * 0.5)
    return {
      ...node,
      position: {
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
      },
    }
  })
}

function applyClusterLayout(
  nodes: Node<StrandNodeData>[],
  edges: Edge[]
): Node<StrandNodeData>[] {
  // Group nodes by first tag
  const groups: Record<string, Node<StrandNodeData>[]> = {}
  const ungrouped: Node<StrandNodeData>[] = []

  nodes.forEach((node) => {
    const firstTag = node.data.tags?.[0] || node.data.subjects?.[0]
    if (firstTag) {
      if (!groups[firstTag]) groups[firstTag] = []
      groups[firstTag].push(node)
    } else {
      ungrouped.push(node)
    }
  })

  const result: Node<StrandNodeData>[] = []
  const groupKeys = Object.keys(groups)
  const groupRadius = Math.max(200, groupKeys.length * 80)

  groupKeys.forEach((key, groupIndex) => {
    const groupAngle = (groupIndex / groupKeys.length) * 2 * Math.PI
    const groupCenterX = 500 + Math.cos(groupAngle) * groupRadius
    const groupCenterY = 400 + Math.sin(groupAngle) * groupRadius

    groups[key].forEach((node, nodeIndex) => {
      const nodeAngle = (nodeIndex / groups[key].length) * 2 * Math.PI
      const nodeRadius = Math.max(60, groups[key].length * 20)
      result.push({
        ...node,
        position: {
          x: groupCenterX + Math.cos(nodeAngle) * nodeRadius,
          y: groupCenterY + Math.sin(nodeAngle) * nodeRadius,
        },
      })
    })
  })

  // Add ungrouped nodes in center
  ungrouped.forEach((node, i) => {
    result.push({
      ...node,
      position: {
        x: 500 + (i % 5) * 200 - 400,
        y: 400 + Math.floor(i / 5) * 100,
      },
    })
  })

  return result
}

// ============================================================================
// DATA CONVERSION
// ============================================================================

function treeToNodesAndEdges(
  tree: KnowledgeTreeNode[],
  onNavigate: (path: string) => void,
  parentId?: string
): { nodes: Node<StrandNodeData>[]; edges: Edge[] } {
  const nodes: Node<StrandNodeData>[] = []
  const edges: Edge[] = []

  function processNode(node: KnowledgeTreeNode, depth = 0, parent?: string) {
    const nodeId = node.path

    // Create node
    nodes.push({
      id: nodeId,
      type: 'strand',
      position: { x: 0, y: 0 }, // Will be set by layout
      data: {
        id: nodeId,
        label: node.name,
        path: node.path,
        description: node.description,
        tags: node.tags,
        subjects: node.subjects,
        topics: node.topics,
        strandType: node.type === 'directory'
          ? depth === 0 ? 'weave' : depth === 1 ? 'loom' : 'folder'
          : 'file',
        emoji: node.style?.emoji,
        onClick: onNavigate,
      },
    })

    // Create edge to parent
    if (parent) {
      edges.push({
        id: `${parent}-${nodeId}`,
        source: parent,
        target: nodeId,
        type: 'smoothstep',
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
        },
        style: { stroke: '#94a3b8', strokeWidth: 1 },
      })
    }

    // Process children
    if (node.children) {
      node.children.forEach((child) => {
        processNode(child, depth + 1, nodeId)
      })
    }
  }

  tree.forEach((node) => processNode(node))

  return { nodes, edges }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AtlasCanvas({
  tree,
  selectedPath,
  onNavigate,
  theme = 'light',
  loading = false,
}: AtlasCanvasProps) {
  const isDark = theme.includes('dark')
  const [layout, setLayout] = useState<LayoutType>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showMiniMap, setShowMiniMap] = useState(true)

  // Convert tree to nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = treeToNodesAndEdges(tree, onNavigate)
    return { initialNodes: nodes, initialEdges: edges }
  }, [tree, onNavigate])

  // Apply layout
  const layoutNodes = useMemo(() => {
    if (initialNodes.length === 0) return initialNodes

    switch (layout) {
      case 'grid':
        return applyGridLayout(initialNodes)
      case 'force':
        return applyForceLayout(initialNodes, initialEdges)
      case 'cluster':
        return applyClusterLayout(initialNodes, initialEdges)
      case 'timeline':
        // For timeline, we'd sort by date and arrange horizontally
        return applyGridLayout(initialNodes, 10)
      default:
        return applyGridLayout(initialNodes)
    }
  }, [initialNodes, initialEdges, layout])

  // Filter nodes by search
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return layoutNodes
    const q = searchQuery.toLowerCase()
    return layoutNodes.filter(
      (n) =>
        n.data.label.toLowerCase().includes(q) ||
        n.data.description?.toLowerCase().includes(q) ||
        n.data.tags?.some((t) => t.toLowerCase().includes(q)) ||
        n.data.subjects?.some((s) => s.toLowerCase().includes(q))
    )
  }, [layoutNodes, searchQuery])

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id))
    return initialEdges.filter(
      (e) => nodeIds.has(e.source as string) && nodeIds.has(e.target as string)
    )
  }, [filteredNodes, initialEdges])

  const [nodes, setNodes, onNodesChange] = useNodesState(filteredNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredEdges)

  // Update nodes when layout or filter changes
  useEffect(() => {
    setNodes(filteredNodes)
    setEdges(filteredEdges)
  }, [filteredNodes, filteredEdges, setNodes, setEdges])

  // Highlight selected node
  useEffect(() => {
    if (selectedPath) {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === selectedPath,
        }))
      )
    }
  }, [selectedPath, setNodes])

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        proOptions={{ hideAttribution: true }}
        className={isDark ? 'bg-zinc-900' : 'bg-zinc-50'}
      >
        {/* Background */}
        <Background
          color={isDark ? '#3f3f46' : '#d4d4d8'}
          gap={20}
          size={1}
        />

        {/* Controls */}
        <Controls
          showZoom={false}
          showFitView={false}
          showInteractive={false}
          className="!bg-transparent !border-0 !shadow-none"
        />

        {/* Mini Map */}
        {showMiniMap && (
          <MiniMap
            nodeColor={(n) => {
              if (n.selected) return '#06b6d4'
              return isDark ? '#52525b' : '#a1a1aa'
            }}
            maskColor={isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}
            className="!bg-zinc-100 dark:!bg-zinc-800 !rounded-lg !border !border-zinc-200 dark:!border-zinc-700"
          />
        )}

        {/* Top Panel - Layout Controls */}
        <Panel position="top-left">
          <div
            className={`
              flex items-center gap-1 p-1 rounded-lg shadow-lg border
              ${isDark
                ? 'bg-zinc-800 border-zinc-700'
                : 'bg-white border-zinc-200'
              }
            `}
          >
            <button
              onClick={() => setLayout('grid')}
              className={`
                p-2 rounded-md transition-colors
                ${layout === 'grid'
                  ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600'
                  : isDark
                    ? 'text-zinc-400 hover:bg-zinc-700'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }
              `}
              title="Grid Layout"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('force')}
              className={`
                p-2 rounded-md transition-colors
                ${layout === 'force'
                  ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600'
                  : isDark
                    ? 'text-zinc-400 hover:bg-zinc-700'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }
              `}
              title="Force Layout"
            >
              <GitBranch className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('cluster')}
              className={`
                p-2 rounded-md transition-colors
                ${layout === 'cluster'
                  ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600'
                  : isDark
                    ? 'text-zinc-400 hover:bg-zinc-700'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }
              `}
              title="Cluster by Tags"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('timeline')}
              className={`
                p-2 rounded-md transition-colors
                ${layout === 'timeline'
                  ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600'
                  : isDark
                    ? 'text-zinc-400 hover:bg-zinc-700'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }
              `}
              title="Timeline Layout"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </Panel>

        {/* Top Right - Search & View Controls */}
        <Panel position="top-right">
          <div className="flex items-center gap-2">
            {/* Search */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 200, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <input
                    type="text"
                    placeholder="Search strands..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className={`
                      w-full px-3 py-2 rounded-lg border text-sm
                      ${isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                        : 'bg-white border-zinc-200 text-zinc-900'
                      }
                      focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                    `}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div
              className={`
                flex items-center gap-1 p-1 rounded-lg shadow-lg border
                ${isDark
                  ? 'bg-zinc-800 border-zinc-700'
                  : 'bg-white border-zinc-200'
                }
              `}
            >
              <button
                onClick={() => {
                  setShowSearch(!showSearch)
                  if (showSearch) setSearchQuery('')
                }}
                className={`
                  p-2 rounded-md transition-colors
                  ${showSearch
                    ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600'
                    : isDark
                      ? 'text-zinc-400 hover:bg-zinc-700'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  }
                `}
                title="Search"
              >
                {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setShowMiniMap(!showMiniMap)}
                className={`
                  p-2 rounded-md transition-colors
                  ${showMiniMap
                    ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600'
                    : isDark
                      ? 'text-zinc-400 hover:bg-zinc-700'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  }
                `}
                title="Toggle Mini Map"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Panel>

        {/* Bottom Panel - Stats */}
        <Panel position="bottom-left">
          <div
            className={`
              px-3 py-2 rounded-lg shadow-lg border text-xs
              ${isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                : 'bg-white border-zinc-200 text-zinc-600'
              }
            `}
          >
            {nodes.length} strands
            {searchQuery && ` (filtered from ${layoutNodes.length})`}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
