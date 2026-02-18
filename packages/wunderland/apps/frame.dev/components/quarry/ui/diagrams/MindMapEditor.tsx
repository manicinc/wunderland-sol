'use client'

/**
 * Mind Map Editor Component
 * @module codex/ui/MindMapEditor
 *
 * An interactive mind mapping tool using React Flow for creating
 * visual node-based diagrams. Supports:
 * - Drag and drop node creation
 * - Custom node types (idea, topic, note, question)
 * - Edge connections with labels
 * - Pan and zoom controls
 * - Export to PNG/SVG
 * - Theme-aware styling
 * - Auto-layout with dagre
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type OnConnect,
  Handle,
  Position,
  Panel,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Download,
  Trash2,
  Lightbulb,
  FileText,
  MessageCircle,
  HelpCircle,
  Palette,
  Layout,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Save,
  Undo,
  Redo,
  Image as ImageIcon,
} from 'lucide-react'
import type { ThemeName } from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type MindMapNodeType = 'idea' | 'topic' | 'note' | 'question' | 'root'

export interface MindMapNodeData {
  label: string
  type: MindMapNodeType
  color?: string
  description?: string
  // Index signature required by React Flow's Node<T> constraint
  [key: string]: unknown
}

export interface MindMapEditorProps {
  /** Initial nodes for the mind map */
  initialNodes?: Node<MindMapNodeData>[]
  /** Initial edges for the mind map */
  initialEdges?: Edge[]
  /** Current theme */
  theme?: ThemeName
  /** Callback when map changes */
  onChange?: (nodes: Node<MindMapNodeData>[], edges: Edge[]) => void
  /** Callback when save is requested */
  onSave?: (data: { nodes: Node<MindMapNodeData>[]; edges: Edge[]; svg?: string }) => void
  /** Whether the editor is read-only */
  readOnly?: boolean
  /** Height of the editor */
  height?: string | number
  /** Show toolbar */
  showToolbar?: boolean
  /** Show minimap */
  showMinimap?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   THEME CONFIGURATION
═══════════════════════════════════════════════════════════════════════════ */

const THEME_COLORS: Record<string, {
  bg: string
  nodeBg: string
  nodeBorder: string
  text: string
  accent: string
  gridColor: string
  minimapMask: string
}> = {
  'light': {
    bg: '#ffffff',
    nodeBg: '#f4f4f5',
    nodeBorder: '#d4d4d8',
    text: '#18181b',
    accent: '#06b6d4',
    gridColor: '#e4e4e7',
    minimapMask: 'rgba(255, 255, 255, 0.8)',
  },
  'dark': {
    bg: '#18181b',
    nodeBg: '#27272a',
    nodeBorder: '#3f3f46',
    text: '#fafafa',
    accent: '#22d3ee',
    gridColor: '#27272a',
    minimapMask: 'rgba(24, 24, 27, 0.8)',
  },
  'sepia-light': {
    bg: '#fef3c7',
    nodeBg: '#fef9c3',
    nodeBorder: '#fcd34d',
    text: '#78350f',
    accent: '#d97706',
    gridColor: '#fde68a',
    minimapMask: 'rgba(254, 243, 199, 0.8)',
  },
  'sepia-dark': {
    bg: '#292524',
    nodeBg: '#44403c',
    nodeBorder: '#57534e',
    text: '#fef3c7',
    accent: '#fbbf24',
    gridColor: '#44403c',
    minimapMask: 'rgba(41, 37, 36, 0.8)',
  },
  'terminal-light': {
    bg: '#f0fdf4',
    nodeBg: '#dcfce7',
    nodeBorder: '#86efac',
    text: '#052e16',
    accent: '#22c55e',
    gridColor: '#bbf7d0',
    minimapMask: 'rgba(240, 253, 244, 0.8)',
  },
  'terminal-dark': {
    bg: '#052e16',
    nodeBg: '#14532d',
    nodeBorder: '#166534',
    text: '#dcfce7',
    accent: '#4ade80',
    gridColor: '#14532d',
    minimapMask: 'rgba(5, 46, 22, 0.8)',
  },
  'oceanic-light': {
    bg: '#ecfeff',
    nodeBg: '#cffafe',
    nodeBorder: '#67e8f9',
    text: '#164e63',
    accent: '#0ea5e9',
    gridColor: '#a5f3fc',
    minimapMask: 'rgba(236, 254, 255, 0.8)',
  },
  'oceanic-dark': {
    bg: '#0c4a6e',
    nodeBg: '#0369a1',
    nodeBorder: '#0284c7',
    text: '#e0f2fe',
    accent: '#38bdf8',
    gridColor: '#075985',
    minimapMask: 'rgba(12, 74, 110, 0.8)',
  },
}

const NODE_TYPE_COLORS: Record<MindMapNodeType, string> = {
  root: '#8b5cf6',     // Purple
  idea: '#f59e0b',     // Amber
  topic: '#06b6d4',    // Cyan
  note: '#22c55e',     // Green
  question: '#f43f5e', // Rose
}

const NODE_TYPE_ICONS: Record<MindMapNodeType, React.ReactNode> = {
  root: <Layout className="w-4 h-4" />,
  idea: <Lightbulb className="w-4 h-4" />,
  topic: <FileText className="w-4 h-4" />,
  note: <MessageCircle className="w-4 h-4" />,
  question: <HelpCircle className="w-4 h-4" />,
}

/* ═══════════════════════════════════════════════════════════════════════════
   CUSTOM NODE COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface CustomNodeProps {
  data: MindMapNodeData
  selected?: boolean
}

function CustomNode({ data, selected }: CustomNodeProps) {
  const typeColor = NODE_TYPE_COLORS[data.type] || NODE_TYPE_COLORS.topic
  const icon = NODE_TYPE_ICONS[data.type]

  return (
    <div
      className={`
        relative px-4 py-3 min-w-[120px] max-w-[280px]
        rounded-xl shadow-lg transition-all duration-200
        ${selected ? 'ring-2 ring-offset-2' : ''}
      `}
      style={{
        backgroundColor: data.color || typeColor,
        borderColor: selected ? typeColor : 'transparent',
        boxShadow: selected
          ? `0 0 20px ${typeColor}40`
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-white !border-2 !border-current"
        style={{ borderColor: typeColor }}
      />

      {/* Node content */}
      <div className="flex items-start gap-2">
        <span className="text-white/90 flex-shrink-0 mt-0.5">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium text-sm break-words">
            {data.label}
          </div>
          {data.description && (
            <div className="text-white/70 text-xs mt-1 break-words">
              {data.description}
            </div>
          )}
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-white !border-2 !border-current"
        style={{ borderColor: typeColor }}
      />
    </div>
  )
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULT DATA
═══════════════════════════════════════════════════════════════════════════ */

const DEFAULT_NODES: Node<MindMapNodeData>[] = [
  {
    id: 'root',
    type: 'custom',
    position: { x: 250, y: 200 },
    data: { label: 'Main Idea', type: 'root' },
  },
]

const DEFAULT_EDGES: Edge[] = []

/* ═══════════════════════════════════════════════════════════════════════════
   MIND MAP EDITOR (INNER)
═══════════════════════════════════════════════════════════════════════════ */

function MindMapEditorInner({
  initialNodes = DEFAULT_NODES,
  initialEdges = DEFAULT_EDGES,
  theme = 'dark',
  onChange,
  onSave,
  readOnly = false,
  height = 500,
  showToolbar = true,
  showMinimap = true,
}: MindMapEditorProps) {
  const reactFlowInstance = useReactFlow()
  const containerRef = useRef<HTMLDivElement>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MindMapNodeData>>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNodeType, setSelectedNodeType] = useState<MindMapNodeType>('topic')
  const [isAddingNode, setIsAddingNode] = useState(false)
  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [history, setHistory] = useState<{ nodes: Node<MindMapNodeData>[]; edges: Edge[] }[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const colors = THEME_COLORS[theme] || THEME_COLORS.dark

  // Track history for undo/redo
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1)
        newHistory.push({ nodes: [...nodes], edges: [...edges] })
        return newHistory.slice(-50) // Keep last 50 states
      })
      setHistoryIndex(prev => Math.min(prev + 1, 49))
    }
  }, []) // Only on mount

  // Notify parent of changes
  useEffect(() => {
    onChange?.(nodes, edges)
  }, [nodes, edges, onChange])

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: colors.accent, strokeWidth: 2 },
          },
          eds
        )
      )
    },
    [readOnly, setEdges, colors.accent]
  )

  const handleAddNode = useCallback(() => {
    if (!newNodeLabel.trim() || readOnly) return

    const viewport = reactFlowInstance.getViewport()
    const center = reactFlowInstance.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    })

    const newNode: Node<MindMapNodeData> = {
      id: `node-${Date.now()}`,
      type: 'custom',
      position: {
        x: center.x + Math.random() * 100 - 50,
        y: center.y + Math.random() * 100 - 50,
      },
      data: {
        label: newNodeLabel.trim(),
        type: selectedNodeType,
      },
    }

    setNodes((nds) => [...nds, newNode])
    setNewNodeLabel('')
    setIsAddingNode(false)
  }, [newNodeLabel, selectedNodeType, reactFlowInstance, setNodes, readOnly])

  const handleDeleteSelected = useCallback(() => {
    if (readOnly) return
    const selectedNodes = nodes.filter((n) => n.selected)
    const selectedEdges = edges.filter((e) => e.selected)

    if (selectedNodes.length === 0 && selectedEdges.length === 0) return

    setNodes((nds) => nds.filter((n) => !n.selected))
    setEdges((eds) => {
      const selectedNodeIds = selectedNodes.map((n) => n.id)
      return eds.filter(
        (e) =>
          !e.selected &&
          !selectedNodeIds.includes(e.source) &&
          !selectedNodeIds.includes(e.target)
      )
    })
  }, [nodes, edges, setNodes, setEdges, readOnly])

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setNodes(prevState.nodes)
      setEdges(prevState.edges)
      setHistoryIndex(historyIndex - 1)
    }
  }, [history, historyIndex, setNodes, setEdges])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setNodes(nextState.nodes)
      setEdges(nextState.edges)
      setHistoryIndex(historyIndex + 1)
    }
  }, [history, historyIndex, setNodes, setEdges])

  const handleExport = useCallback(async (format: 'svg' | 'png') => {
    if (!containerRef.current) return

    try {
      const flowElement = containerRef.current.querySelector('.react-flow')
      if (!flowElement) return

      if (format === 'svg') {
        // Export as SVG
        const svgElement = flowElement.querySelector('svg.react-flow__viewport')
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement)
          const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `mindmap-${Date.now()}.svg`
          link.click()
          URL.revokeObjectURL(url)
        }
      } else {
        // Export as PNG using canvas
        const { toPng } = await import('html-to-image')
        const dataUrl = await toPng(flowElement as HTMLElement, {
          backgroundColor: colors.bg,
          quality: 1,
        })
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `mindmap-${Date.now()}.png`
        link.click()
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }, [colors.bg])

  const handleSave = useCallback(() => {
    onSave?.({ nodes, edges })
  }, [nodes, edges, onSave])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (readOnly) return

      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName !== 'INPUT') {
          handleDeleteSelected()
        }
      }

      // Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }

      // Redo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      }

      // Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    },
    [handleDeleteSelected, handleUndo, handleRedo, handleSave, readOnly]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden border ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
      style={{
        height: isFullscreen ? '100vh' : height,
        backgroundColor: colors.bg,
        borderColor: colors.nodeBorder,
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: colors.accent, strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
        style={{ background: colors.bg }}
      >
        <Background color={colors.gridColor} gap={16} />
        <Controls
          position="bottom-right"
          style={{
            backgroundColor: colors.nodeBg,
            borderColor: colors.nodeBorder,
            borderRadius: '8px',
          }}
        />

        {showMinimap && (
          <MiniMap
            position="bottom-left"
            style={{
              backgroundColor: colors.nodeBg,
              borderRadius: '8px',
              border: `1px solid ${colors.nodeBorder}`,
            }}
            maskColor={colors.minimapMask}
            nodeColor={(n) => NODE_TYPE_COLORS[(n.data as MindMapNodeData)?.type] || colors.accent}
          />
        )}

        {/* Toolbar Panel */}
        {showToolbar && (
          <Panel position="top-left" className="flex flex-col gap-2">
            <div
              className="flex items-center gap-1 p-1.5 rounded-lg shadow-lg"
              style={{ backgroundColor: colors.nodeBg, borderColor: colors.nodeBorder }}
            >
              {!readOnly && (
                <>
                  {/* Node type selector */}
                  {(['root', 'idea', 'topic', 'note', 'question'] as MindMapNodeType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedNodeType(type)}
                      className={`p-2 rounded-md transition-colors ${
                        selectedNodeType === type ? 'ring-2 ring-offset-1' : 'hover:bg-black/10'
                      }`}
                      style={{
                        backgroundColor: selectedNodeType === type ? NODE_TYPE_COLORS[type] : 'transparent',
                        color: selectedNodeType === type ? 'white' : colors.text,
                        // Use CSS custom property for Tailwind ring color
                        '--tw-ring-color': NODE_TYPE_COLORS[type],
                      } as React.CSSProperties}
                      title={`${type.charAt(0).toUpperCase() + type.slice(1)} node`}
                    >
                      {NODE_TYPE_ICONS[type]}
                    </button>
                  ))}

                  <div className="w-px h-6 mx-1" style={{ backgroundColor: colors.nodeBorder }} />

                  {/* Add node */}
                  <button
                    onClick={() => setIsAddingNode(true)}
                    className="p-2 rounded-md hover:bg-black/10 transition-colors"
                    style={{ color: colors.text }}
                    title="Add node"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* Delete selected */}
                  <button
                    onClick={handleDeleteSelected}
                    className="p-2 rounded-md hover:bg-red-500/20 hover:text-red-500 transition-colors"
                    style={{ color: colors.text }}
                    title="Delete selected (Del)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="w-px h-6 mx-1" style={{ backgroundColor: colors.nodeBorder }} />

                  {/* Undo/Redo */}
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-2 rounded-md hover:bg-black/10 transition-colors disabled:opacity-40"
                    style={{ color: colors.text }}
                    title="Undo (Cmd+Z)"
                  >
                    <Undo className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 rounded-md hover:bg-black/10 transition-colors disabled:opacity-40"
                    style={{ color: colors.text }}
                    title="Redo (Cmd+Shift+Z)"
                  >
                    <Redo className="w-4 h-4" />
                  </button>
                </>
              )}

              <div className="w-px h-6 mx-1" style={{ backgroundColor: colors.nodeBorder }} />

              {/* Export options */}
              <button
                onClick={() => handleExport('svg')}
                className="p-2 rounded-md hover:bg-black/10 transition-colors"
                style={{ color: colors.text }}
                title="Export SVG"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleExport('png')}
                className="p-2 rounded-md hover:bg-black/10 transition-colors"
                style={{ color: colors.text }}
                title="Export PNG"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {onSave && (
                <button
                  onClick={handleSave}
                  className="p-2 rounded-md hover:bg-black/10 transition-colors"
                  style={{ color: colors.accent }}
                  title="Save (Cmd+S)"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}

              {/* Fullscreen toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-md hover:bg-black/10 transition-colors"
                style={{ color: colors.text }}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </Panel>
        )}

        {/* Node count */}
        <Panel position="top-right">
          <div
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ backgroundColor: colors.nodeBg, color: colors.text }}
          >
            {nodes.length} nodes · {edges.length} connections
          </div>
        </Panel>
      </ReactFlow>

      {/* Add Node Modal */}
      <AnimatePresence>
        {isAddingNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setIsAddingNode(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="p-6 rounded-xl shadow-2xl w-80"
              style={{ backgroundColor: colors.nodeBg }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
                Add New Node
              </h3>

              <div className="flex gap-2 mb-4">
                {(['root', 'idea', 'topic', 'note', 'question'] as MindMapNodeType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedNodeType(type)}
                    className={`p-2 rounded-lg transition-colors flex-1 ${
                      selectedNodeType === type ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: NODE_TYPE_COLORS[type],
                      '--tw-ring-color': 'white',
                    } as React.CSSProperties}
                    title={type}
                  >
                    <span className="text-white flex justify-center">
                      {NODE_TYPE_ICONS[type]}
                    </span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={newNodeLabel}
                onChange={(e) => setNewNodeLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
                placeholder="Enter node label..."
                className="w-full px-4 py-2 rounded-lg mb-4 outline-none focus:ring-2"
                style={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  borderColor: colors.nodeBorder,
                  '--tw-ring-color': colors.accent,
                } as React.CSSProperties}
                autoFocus
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setIsAddingNode(false)}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNode}
                  className="flex-1 px-4 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: colors.accent }}
                >
                  Add Node
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MIND MAP EDITOR (EXPORTED WITH PROVIDER)
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Interactive mind map editor with React Flow
 *
 * @example
 * ```tsx
 * <MindMapEditor
 *   theme="oceanic-dark"
 *   onSave={(data) => console.log('Saved:', data)}
 * />
 * ```
 */
export default function MindMapEditor(props: MindMapEditorProps) {
  return (
    <ReactFlowProvider>
      <MindMapEditorInner {...props} />
    </ReactFlowProvider>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   INLINE MIND MAP (FOR MARKDOWN EMBEDDING)
═══════════════════════════════════════════════════════════════════════════ */

interface InlineMindMapProps {
  /** JSON string of nodes */
  nodes?: string
  /** JSON string of edges */
  edges?: string
  /** Theme */
  theme?: ThemeName
}

/**
 * Compact mind map viewer for embedding in markdown
 */
export function InlineMindMap({ nodes, edges, theme = 'dark' }: InlineMindMapProps) {
  const parsedNodes = useMemo(() => {
    try {
      return nodes ? JSON.parse(nodes) : DEFAULT_NODES
    } catch {
      return DEFAULT_NODES
    }
  }, [nodes])

  const parsedEdges = useMemo(() => {
    try {
      return edges ? JSON.parse(edges) : DEFAULT_EDGES
    } catch {
      return DEFAULT_EDGES
    }
  }, [edges])

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
      <MindMapEditor
        initialNodes={parsedNodes}
        initialEdges={parsedEdges}
        theme={theme}
        height={400}
        readOnly
        showToolbar={false}
        showMinimap={false}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export { NODE_TYPE_COLORS, NODE_TYPE_ICONS }
