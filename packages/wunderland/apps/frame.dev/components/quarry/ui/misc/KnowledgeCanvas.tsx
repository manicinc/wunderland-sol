/**
 * KnowledgeCanvas - Infinite canvas for knowledge visualization
 * @module codex/ui/KnowledgeCanvas
 *
 * Separate tldraw canvas for high-level drag-and-drop knowledge organization.
 * Different from WhiteboardCanvas which is for drawing/media capture.
 *
 * Features:
 * - Strand, Loom, Weave, Connection shapes only
 * - Layout presets (force-directed, grid, timeline, cluster, freeform)
 * - Drag-drop strands from sidebar
 * - Auto-organize by tags/topics
 * - No drawing tools - purely for knowledge visualization
 */

'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Tldraw,
  Editor,
  TLStoreWithStatus,
  createTLStore,
  defaultShapeUtils,
  TLUiOverrides,
  TLUiComponents,
  useEditor,
  track,
  createShapeId,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid,
  Network,
  Calendar,
  Layers,
  Move,
  ZoomIn,
  ZoomOut,
  Home,
  Maximize2,
  Plus,
  Sparkles,
} from 'lucide-react'

// Import hooks
import { useCanvasDrop, StrandDropData, CANVAS_DROP_MIME, decodeStrandDragData } from '../canvas/useCanvasDrop'
import { useDeviceCapabilities } from '../../hooks/useDeviceCapabilities'
import { KnowledgeMobileToolbar } from '../canvas/KnowledgeMobileToolbar'

// Import custom knowledge shapes
import { StrandShapeUtil } from '../canvas/shapes/StrandShape'
import { LoomShapeUtil } from '../canvas/shapes/LoomShape'
import { WeaveShapeUtil } from '../canvas/shapes/WeaveShape'
import { CollectionShapeUtil } from '../canvas/shapes/CollectionShape'
import { ConnectionShapeUtil } from '../canvas/shapes/ConnectionShape'

// Layout preset types
export type LayoutPreset = 'force' | 'grid' | 'timeline' | 'cluster' | 'freeform'

interface KnowledgeCanvasProps {
  /** Initial strands to display */
  strands?: Array<{
    id: string
    path: string
    title: string
    summary?: string
    tags?: string[]
    weaveSlug?: string
    loomSlug?: string
    thumbnailPath?: string
    createdAt?: string
  }>
  /** Callback when strand is clicked */
  onStrandClick?: (path: string) => void
  /** Callback when canvas state changes */
  onCanvasChange?: (state: any) => void
  /** Current layout preset */
  layout?: LayoutPreset
  /** Callback when layout changes */
  onLayoutChange?: (layout: LayoutPreset) => void
  /** Callback when strand is dropped onto canvas */
  onStrandDrop?: (data: StrandDropData, position: { x: number; y: number }) => void
  /** Theme */
  isDark?: boolean
  /** Canvas ID for persistence */
  canvasId?: string
  /** Class name */
  className?: string
}

// Custom shape utils for knowledge canvas (no drawing shapes)
const knowledgeShapeUtils = [
  StrandShapeUtil,
  LoomShapeUtil,
  WeaveShapeUtil,
  CollectionShapeUtil,
  ConnectionShapeUtil,
]

// Layout preset info
const LAYOUT_PRESETS: Record<LayoutPreset, { icon: typeof LayoutGrid; label: string; description: string }> = {
  force: { icon: Network, label: 'Force', description: 'Physics-based layout showing connections' },
  grid: { icon: LayoutGrid, label: 'Grid', description: 'Organized grid layout' },
  timeline: { icon: Calendar, label: 'Timeline', description: 'Chronological arrangement' },
  cluster: { icon: Layers, label: 'Cluster', description: 'Group by tags/topics' },
  freeform: { icon: Move, label: 'Free', description: 'Manual positioning' },
}

/**
 * Layout toolbar component
 */
const LayoutToolbar = track(function LayoutToolbar({
  currentLayout,
  onLayoutChange,
  isDark,
  showConnections,
  onToggleConnections,
}: {
  currentLayout: LayoutPreset
  onLayoutChange: (layout: LayoutPreset) => void
  isDark: boolean
  showConnections: boolean
  onToggleConnections: () => void
}) {
  const editor = useEditor()

  const handleZoomIn = () => editor.zoomIn()
  const handleZoomOut = () => editor.zoomOut()
  const handleZoomToFit = () => editor.zoomToFit()
  const handleResetZoom = () => editor.resetZoom()

  return (
    <div
      className="absolute top-4 left-4 flex items-center gap-2 p-2 rounded-xl backdrop-blur-sm z-50"
      style={{
        backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      }}
    >
      {/* Layout presets */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-300 dark:border-gray-600">
        {(Object.entries(LAYOUT_PRESETS) as [LayoutPreset, typeof LAYOUT_PRESETS['force']][]).map(
          ([key, { icon: Icon, label, description }]) => (
            <button
              key={key}
              onClick={() => onLayoutChange(key)}
              className={`
                flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium
                transition-all duration-200
                ${currentLayout === key
                  ? 'bg-emerald-500 text-white'
                  : isDark
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }
              `}
              title={description}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        )}
      </div>

      {/* Connection toggle */}
      <div className="flex items-center pr-2 border-r border-gray-300 dark:border-gray-600">
        <button
          onClick={onToggleConnections}
          className={`
            flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium
            transition-all duration-200
            ${showConnections
              ? 'bg-indigo-500 text-white'
              : isDark
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-600 hover:bg-gray-100'
            }
          `}
          title={showConnections ? 'Hide connections' : 'Show connections'}
        >
          <Network className="w-4 h-4" />
          <span className="hidden sm:inline">Connections</span>
        </button>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleZoomOut}
          className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          title="Zoom out"
        >
          <ZoomOut className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>
        <button
          onClick={handleResetZoom}
          className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          title="Reset zoom"
        >
          <Home className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>
        <button
          onClick={handleZoomIn}
          className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          title="Zoom in"
        >
          <ZoomIn className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>
        <button
          onClick={handleZoomToFit}
          className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          title="Fit to view"
        >
          <Maximize2 className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>
      </div>
    </div>
  )
})

/**
 * KnowledgeCanvas - Main component
 */
export function KnowledgeCanvas({
  strands = [],
  onStrandClick,
  onCanvasChange,
  layout = 'freeform',
  onLayoutChange,
  onStrandDrop,
  isDark = false,
  canvasId = 'knowledge-canvas',
  className = '',
}: KnowledgeCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [currentLayout, setCurrentLayout] = useState<LayoutPreset>(layout)
  const [showConnections, setShowConnections] = useState(true)

  // Device capabilities for responsive design
  const { viewport, capabilities, shouldEnable } = useDeviceCapabilities()
  const isMobile = viewport.isMobile || viewport.isTablet
  const isTouch = capabilities.isTouchDevice
  const prefersReducedMotion = capabilities.prefersReducedMotion

  // Drop handling
  const { dropZoneRef, dropState, dropHandlers } = useCanvasDrop(editor, onStrandDrop)

  // Create store with custom shape utils
  const store = useMemo(() => {
    return createTLStore({
      shapeUtils: [...defaultShapeUtils, ...knowledgeShapeUtils],
    })
  }, [])

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout: LayoutPreset) => {
    setCurrentLayout(newLayout)
    onLayoutChange?.(newLayout)

    if (editor) {
      // Apply layout algorithm
      applyLayout(editor, newLayout)
    }
  }, [editor, onLayoutChange])

  // Apply layout algorithm to shapes
  const applyLayout = useCallback((ed: Editor, layoutType: LayoutPreset) => {
    const shapes = ed.getCurrentPageShapes().filter(s => s.type === 'strand')
    if (shapes.length === 0) return

    const pageCenter = ed.getViewportPageCenter()
    const padding = 40
    const cardWidth = 280
    const cardHeight = 160

    switch (layoutType) {
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(shapes.length))
        shapes.forEach((shape, i) => {
          const row = Math.floor(i / cols)
          const col = i % cols
          ed.updateShapes([{
            id: shape.id,
            type: shape.type,
            x: pageCenter.x - (cols * (cardWidth + padding)) / 2 + col * (cardWidth + padding),
            y: pageCenter.y - (Math.ceil(shapes.length / cols) * (cardHeight + padding)) / 2 + row * (cardHeight + padding),
          }])
        })
        break
      }
      case 'timeline': {
        // Sort by createdAt and arrange horizontally
        const sorted = [...shapes].sort((a, b) => {
          const aDate = (a.props as any).createdAt || ''
          const bDate = (b.props as any).createdAt || ''
          return aDate.localeCompare(bDate)
        })
        sorted.forEach((shape, i) => {
          ed.updateShapes([{
            id: shape.id,
            type: shape.type,
            x: pageCenter.x - (sorted.length * (cardWidth + padding)) / 2 + i * (cardWidth + padding),
            y: pageCenter.y - cardHeight / 2,
          }])
        })
        break
      }
      case 'cluster': {
        // Group by weaveSlug
        const groups = new Map<string, typeof shapes>()
        shapes.forEach(shape => {
          const weave = (shape.props as any).weaveSlug || 'ungrouped'
          if (!groups.has(weave)) groups.set(weave, [])
          groups.get(weave)!.push(shape)
        })

        let groupIndex = 0
        const groupCount = groups.size
        groups.forEach((groupShapes, weave) => {
          const angle = (groupIndex / groupCount) * Math.PI * 2
          const radius = 300
          const groupCenterX = pageCenter.x + Math.cos(angle) * radius
          const groupCenterY = pageCenter.y + Math.sin(angle) * radius

          groupShapes.forEach((shape, i) => {
            const innerAngle = (i / groupShapes.length) * Math.PI * 2
            const innerRadius = 100 + groupShapes.length * 20
            ed.updateShapes([{
              id: shape.id,
              type: shape.type,
              x: groupCenterX + Math.cos(innerAngle) * innerRadius - cardWidth / 2,
              y: groupCenterY + Math.sin(innerAngle) * innerRadius - cardHeight / 2,
            }])
          })
          groupIndex++
        })
        break
      }
      case 'force': {
        // Simple force-directed simulation
        const iterations = 50
        const positions = shapes.map(s => ({ x: s.x, y: s.y, vx: 0, vy: 0 }))

        for (let iter = 0; iter < iterations; iter++) {
          // Repulsion between all pairs
          for (let i = 0; i < shapes.length; i++) {
            for (let j = i + 1; j < shapes.length; j++) {
              const dx = positions[j].x - positions[i].x
              const dy = positions[j].y - positions[i].y
              const dist = Math.sqrt(dx * dx + dy * dy) || 1
              const force = 10000 / (dist * dist)
              const fx = (dx / dist) * force
              const fy = (dy / dist) * force
              positions[i].vx -= fx
              positions[i].vy -= fy
              positions[j].vx += fx
              positions[j].vy += fy
            }
          }

          // Center gravity
          positions.forEach(p => {
            p.vx += (pageCenter.x - p.x) * 0.01
            p.vy += (pageCenter.y - p.y) * 0.01
          })

          // Apply velocity with damping
          positions.forEach(p => {
            p.x += p.vx * 0.1
            p.y += p.vy * 0.1
            p.vx *= 0.9
            p.vy *= 0.9
          })
        }

        shapes.forEach((shape, i) => {
          ed.updateShapes([{
            id: shape.id,
            type: shape.type,
            x: positions[i].x - cardWidth / 2,
            y: positions[i].y - cardHeight / 2,
          }])
        })
        break
      }
      case 'freeform':
      default:
        // No layout changes
        break
    }

    ed.zoomToFit({ duration: 300 })
  }, [])

  // Handle editor mount
  const handleMount = useCallback((ed: Editor) => {
    setEditor(ed)

    // Listen for strand navigation events
    const handleNavigate = (e: CustomEvent<{ path: string }>) => {
      onStrandClick?.(e.detail.path)
    }
    window.addEventListener('canvas-strand-navigate', handleNavigate as EventListener)

    // Add initial strands as shapes
    if (strands.length > 0) {
      const shapeUpdates = strands.map((strand, i) => ({
        id: createShapeId(),
        type: 'strand' as const,
        x: 100 + (i % 4) * 320,
        y: 100 + Math.floor(i / 4) * 200,
        props: {
          strandId: strand.id,
          strandPath: strand.path,
          title: strand.title,
          summary: strand.summary,
          tags: strand.tags || [],
          weaveSlug: strand.weaveSlug,
          loomSlug: strand.loomSlug,
          thumbnailPath: strand.thumbnailPath,
          createdAt: strand.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          collapsed: false,
          highlighted: false,
        },
      }))
      ed.createShapes(shapeUpdates)

      // Apply initial layout
      setTimeout(() => applyLayout(ed, currentLayout), 100)
    }

    return () => {
      window.removeEventListener('canvas-strand-navigate', handleNavigate as EventListener)
    }
  }, [strands, currentLayout, applyLayout, onStrandClick])

  // UI overrides to hide drawing tools
  const uiOverrides: TLUiOverrides = useMemo(() => ({
    tools: (editor, tools) => {
      // Only keep select and hand tools
      return {
        select: tools.select,
        hand: tools.hand,
      }
    },
  }), [])

  // Hide most UI components
  const components: TLUiComponents = useMemo(() => ({
    Toolbar: null,
    MainMenu: null,
    PageMenu: null,
    NavigationPanel: null,
    StylePanel: null,
    ActionsMenu: null,
    HelpMenu: null,
    DebugPanel: null,
    DebugMenu: null,
  }), [])

  // Gradient styles for visual flair
  const gradientOverlay = isDark
    ? 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950'
    : 'bg-gradient-to-br from-zinc-50 via-white to-zinc-100'

  return (
    <div
      ref={dropZoneRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      {...dropHandlers}
      role="application"
      aria-label="Knowledge visualization canvas"
      aria-describedby="canvas-description"
    >
      {/* Screen reader description */}
      <span id="canvas-description" className="sr-only">
        Interactive canvas for visualizing knowledge strands. Use keyboard to navigate, drag items to add them.
      </span>

      {/* Subtle gradient background */}
      <div
        className={`absolute inset-0 ${gradientOverlay} opacity-50 pointer-events-none`}
        aria-hidden="true"
      />

      <Tldraw
        store={store}
        shapeUtils={knowledgeShapeUtils}
        onMount={handleMount}
        overrides={uiOverrides}
        components={components}
        inferDarkMode={false}
        className={isDark ? 'tldraw-dark' : ''}
      >
        {/* Desktop toolbar - hide on mobile */}
        {!isMobile && (
          <LayoutToolbar
            currentLayout={currentLayout}
            onLayoutChange={handleLayoutChange}
            isDark={isDark}
            showConnections={showConnections}
            onToggleConnections={() => setShowConnections(!showConnections)}
          />
        )}

        {/* Mobile toolbar */}
        {isMobile && (
          <KnowledgeMobileToolbar
            currentLayout={currentLayout}
            onLayoutChange={handleLayoutChange}
            isDark={isDark}
            visible={true}
          />
        )}
      </Tldraw>

      {/* Drop zone visual feedback - with animation */}
      <AnimatePresence>
        {dropState.isOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className={`
              absolute inset-0 pointer-events-none z-50
              ${dropState.isValid
                ? 'bg-emerald-500/20 border-4 border-dashed border-emerald-500'
                : 'bg-red-500/10 border-4 border-dashed border-red-400'
              }
            `}
            aria-live="polite"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
                className={`
                  flex items-center gap-3 px-6 py-4 rounded-2xl backdrop-blur-md shadow-2xl
                  ${dropState.isValid
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                  }
                `}
              >
                {dropState.isValid ? (
                  <Sparkles className="w-6 h-6 animate-pulse" />
                ) : (
                  <Plus className="w-6 h-6" />
                )}
                <span className="text-lg font-semibold">
                  {dropState.isValid ? 'Drop to add to canvas' : 'Invalid drop target'}
                </span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state - with gradient and animation */}
      <AnimatePresence>
        {strands.length === 0 && !dropState.isOver && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div
              className={`
                text-center p-10 rounded-3xl backdrop-blur-md
                border border-opacity-20
                ${isDark
                  ? 'bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 border-zinc-600'
                  : 'bg-gradient-to-br from-white/95 to-zinc-50/90 border-zinc-200 shadow-xl'
                }
              `}
            >
              {/* Animated icon */}
              <motion.div
                animate={prefersReducedMotion ? {} : {
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Layers
                  className="w-20 h-20 mx-auto mb-6"
                  style={{
                    color: isDark ? '#10b981' : '#059669',
                    filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.3))',
                  }}
                />
              </motion.div>

              <h3
                className="text-xl font-bold mb-3"
                style={{ color: isDark ? '#f3f4f6' : '#111827' }}
              >
                Start visualizing your knowledge
              </h3>

              <p
                className="text-base mb-4 max-w-xs mx-auto"
                style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
              >
                {isTouch
                  ? 'Drag strands from the list to build your visualization'
                  : 'Drag and drop strands from the sidebar to add them here'
                }
              </p>

              {/* Keyboard hint for desktop */}
              {!isTouch && (
                <p
                  className="text-sm opacity-60"
                  style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
                >
                  Tip: Use scroll to zoom, Space+drag to pan
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Touch hint overlay - show briefly on mobile */}
      {isTouch && editor && (
        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none opacity-0 animate-fade-in-out"
          aria-hidden="true"
        >
          <div
            className={`
              px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md
              ${isDark ? 'bg-zinc-800/90 text-zinc-300' : 'bg-white/90 text-zinc-600'}
            `}
          >
            Pinch to zoom, drag to pan
          </div>
        </div>
      )}
    </div>
  )
}

export default KnowledgeCanvas
