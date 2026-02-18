'use client'

/**
 * Markmap Viewer Component
 * @module codex/ui/MarkmapViewer
 *
 * Automatically generates interactive mind maps from markdown content
 * using the Markmap library. Features:
 * - Markdown headings → mind map nodes
 * - Interactive pan and zoom
 * - Collapsible nodes
 * - Theme-aware styling
 * - Export to SVG
 * - Fullscreen mode
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Download,
  RefreshCw,
  LayoutGrid,
  Minus,
  Plus,
  ChevronDown,
  ChevronRight,
  GitBranch,
} from 'lucide-react'
import type { ThemeName } from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface MarkmapViewerProps {
  /** Markdown content to visualize */
  markdown: string
  /** Current theme */
  theme?: ThemeName
  /** Height of the viewer */
  height?: string | number
  /** Show toolbar */
  showToolbar?: boolean
  /** Auto-fit on content change */
  autoFit?: boolean
  /** Custom class name */
  className?: string
  /** Compact mode for inline embedding */
  compact?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   THEME CONFIGURATION
═══════════════════════════════════════════════════════════════════════════ */

const THEME_COLORS: Record<string, {
  bg: string
  text: string
  node: string
  link: string
  accent: string
  toolbar: string
  border: string
}> = {
  'light': {
    bg: '#ffffff',
    text: '#18181b',
    node: '#f4f4f5',
    link: '#a1a1aa',
    accent: '#06b6d4',
    toolbar: '#f4f4f5',
    border: '#e4e4e7',
  },
  'dark': {
    bg: '#18181b',
    text: '#fafafa',
    node: '#27272a',
    link: '#52525b',
    accent: '#22d3ee',
    toolbar: '#27272a',
    border: '#3f3f46',
  },
  'sepia-light': {
    bg: '#fef3c7',
    text: '#78350f',
    node: '#fef9c3',
    link: '#fcd34d',
    accent: '#d97706',
    toolbar: '#fef9c3',
    border: '#fcd34d',
  },
  'sepia-dark': {
    bg: '#292524',
    text: '#fef3c7',
    node: '#44403c',
    link: '#57534e',
    accent: '#fbbf24',
    toolbar: '#44403c',
    border: '#57534e',
  },
  'terminal-light': {
    bg: '#f0fdf4',
    text: '#052e16',
    node: '#dcfce7',
    link: '#86efac',
    accent: '#22c55e',
    toolbar: '#dcfce7',
    border: '#86efac',
  },
  'terminal-dark': {
    bg: '#052e16',
    text: '#dcfce7',
    node: '#14532d',
    link: '#166534',
    accent: '#4ade80',
    toolbar: '#14532d',
    border: '#166534',
  },
  'oceanic-light': {
    bg: '#ecfeff',
    text: '#164e63',
    node: '#cffafe',
    link: '#67e8f9',
    accent: '#0ea5e9',
    toolbar: '#cffafe',
    border: '#67e8f9',
  },
  'oceanic-dark': {
    bg: '#0c4a6e',
    text: '#e0f2fe',
    node: '#0369a1',
    link: '#0284c7',
    accent: '#38bdf8',
    toolbar: '#0369a1',
    border: '#0284c7',
  },
}

// Node colors for different hierarchy levels
const NODE_LEVEL_COLORS = [
  '#8b5cf6', // Root - Purple
  '#06b6d4', // Level 1 - Cyan
  '#22c55e', // Level 2 - Green
  '#f59e0b', // Level 3 - Amber
  '#f43f5e', // Level 4 - Rose
  '#6366f1', // Level 5 - Indigo
]

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSFORMER INSTANCE (CACHED)
═══════════════════════════════════════════════════════════════════════════ */

let transformer: Transformer | null = null

function getTransformer(): Transformer {
  if (!transformer) {
    transformer = new Transformer()
  }
  return transformer
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function MarkmapViewer({
  markdown,
  theme = 'dark',
  height = 400,
  showToolbar = true,
  autoFit = true,
  className = '',
  compact = false,
}: MarkmapViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const markmapRef = useRef<Markmap | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [nodeCount, setNodeCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const colors = THEME_COLORS[theme] || THEME_COLORS.dark

  // Transform markdown to markmap data
  const markmapData = useMemo(() => {
    if (!markdown?.trim()) {
      return null
    }

    try {
      const transformer = getTransformer()
      const { root, features } = transformer.transform(markdown)

      // Count nodes
      function countNodes(node: any): number {
        if (!node) return 0
        return 1 + (node.children?.reduce((sum: number, child: any) => sum + countNodes(child), 0) || 0)
      }

      setNodeCount(countNodes(root))
      setError(null)

      return { root, features }
    } catch (err) {
      console.error('Markmap transform error:', err)
      setError('Failed to parse markdown structure')
      return null
    }
  }, [markdown])

  // Initialize or update markmap
  useEffect(() => {
    if (!svgRef.current || !markmapData) return

    const { root } = markmapData

    // Custom options with theme colors
    const options = {
      autoFit,
      duration: 300,
      color: (node: any) => {
        const depth = node.depth || 0
        return NODE_LEVEL_COLORS[depth % NODE_LEVEL_COLORS.length]
      },
      paddingX: 16,
      initialExpandLevel: 3,
    }

    // Destroy existing instance when theme changes to recreate with correct styling
    if (markmapRef.current) {
      markmapRef.current.destroy()
      markmapRef.current = null
    }

    // Create new markmap instance
    markmapRef.current = Markmap.create(svgRef.current, options, root)

    // Apply text colors directly after markmap renders (overrides inline styles)
    requestAnimationFrame(() => {
      if (svgRef.current) {
        const textElements = svgRef.current.querySelectorAll('text')
        textElements.forEach((text) => {
          text.style.fill = colors.text
        })
      }
    })

    // Update zoom state (state.scale may not be in types but exists at runtime)
    const currentZoom = (markmapRef.current.state as { scale?: number }).scale || 1
    setZoom(currentZoom)
  }, [markmapData, autoFit, colors.text])

  // Handle zoom
  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    if (!markmapRef.current) return

    const currentZoom = (markmapRef.current.state as { scale?: number }).scale || 1
    let newZoom: number

    switch (direction) {
      case 'in':
        newZoom = Math.min(currentZoom * 1.25, 4)
        break
      case 'out':
        newZoom = Math.max(currentZoom / 1.25, 0.1)
        break
      case 'reset':
        markmapRef.current.fit()
        setZoom(1)
        return
    }

    markmapRef.current.rescale(newZoom)
    setZoom(newZoom)
  }, [])

  // Handle fit to view
  const handleFit = useCallback(() => {
    if (!markmapRef.current) return
    markmapRef.current.fit()
    setZoom(1)
  }, [])

  // Export to SVG
  const handleExport = useCallback(() => {
    if (!svgRef.current) return

    const svgData = new XMLSerializer().serializeToString(svgRef.current)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mindmap-${Date.now()}.svg`
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen)
    // Re-fit after transition
    setTimeout(() => {
      if (markmapRef.current) {
        markmapRef.current.fit()
      }
    }, 300)
  }, [isFullscreen])

  // MutationObserver to re-apply text colors when markmap adds or modifies nodes
  useEffect(() => {
    if (!svgRef.current) return

    const applyTextColors = () => {
      if (svgRef.current) {
        // Apply to text elements
        const textElements = svgRef.current.querySelectorAll('text')
        textElements.forEach((text) => {
          text.style.fill = colors.text
          text.style.color = colors.text
        })
        // Apply to foreignObject elements (used by markmap for HTML content)
        const foreignObjects = svgRef.current.querySelectorAll('foreignObject')
        foreignObjects.forEach((fo) => {
          // Style the main div inside foreignObject
          const divs = fo.querySelectorAll('div')
          divs.forEach((div) => {
            ;(div as HTMLElement).style.color = colors.text
            ;(div as HTMLElement).style.backgroundColor = colors.node
            ;(div as HTMLElement).style.borderRadius = '4px'
            ;(div as HTMLElement).style.padding = '2px 6px'
          })
        })
        // Apply to rect elements (node backgrounds)
        const rects = svgRef.current.querySelectorAll('.markmap-node rect, rect')
        rects.forEach((rect) => {
          ;(rect as SVGRectElement).style.fill = colors.node
        })
      }
    }

    const observer = new MutationObserver((mutations) => {
      // Check if any relevant changes occurred (text added, attributes changed, rects added)
      const hasRelevantChange = mutations.some((mutation) => {
        if (mutation.type === 'attributes') return true
        return Array.from(mutation.addedNodes).some(
          (node) =>
            node.nodeName === 'text' ||
            node.nodeName === 'foreignObject' ||
            node.nodeName === 'rect' ||
            node.nodeName === 'g' ||
            (node as Element).querySelector?.('text, foreignObject, rect')
        )
      })
      if (hasRelevantChange) {
        // Small delay to let markmap finish its updates
        requestAnimationFrame(applyTextColors)
      }
    })

    observer.observe(svgRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'fill', 'color', 'background-color'],
    })

    // Apply colors immediately
    applyTextColors()

    return () => observer.disconnect()
  }, [colors.text, colors.node])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (markmapRef.current) {
        markmapRef.current.destroy()
        markmapRef.current = null
      }
    }
  }, [])

  // Error state
  if (error) {
    return (
      <div
        className={`flex items-center justify-center p-6 rounded-xl border ${className}`}
        style={{
          height,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          color: colors.text,
        }}
      >
        <div className="text-center">
          <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm opacity-70">{error}</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (!markmapData) {
    return (
      <div
        className={`flex items-center justify-center p-6 rounded-xl border ${className}`}
        style={{
          height,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          color: colors.text,
        }}
      >
        <div className="text-center">
          <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm opacity-70">Add headings to your markdown to see a mind map</p>
        </div>
      </div>
    )
  }

  // Determine if dark mode
  const isDark = theme === 'dark' || theme?.endsWith('-dark')

  const viewerContent = (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl border ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${className}`}
      style={{
        height: isFullscreen ? '100vh' : height,
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
    >
      {/* CSS to fix colors in dark mode - must override markmap inline styles */}
      <style>{`
        .markmap-viewer-${isDark ? 'dark' : 'light'} text {
          fill: ${colors.text} !important;
          color: ${colors.text} !important;
        }
        .markmap-viewer-${isDark ? 'dark' : 'light'} .markmap-node text {
          fill: ${colors.text} !important;
        }
        .markmap-viewer-${isDark ? 'dark' : 'light'} foreignObject {
          color: ${colors.text} !important;
        }
        .markmap-viewer-${isDark ? 'dark' : 'light'} foreignObject * {
          color: ${colors.text} !important;
          background-color: transparent !important;
        }
        .markmap-viewer-${isDark ? 'dark' : 'light'} foreignObject div {
          background-color: ${colors.node} !important;
          border-radius: 4px;
          padding: 2px 6px;
        }
        .markmap-viewer-${isDark ? 'dark' : 'light'} .markmap-node rect {
          fill: ${colors.node} !important;
        }
        .markmap-viewer-${isDark ? 'dark' : 'light'} .markmap-link {
          stroke: ${colors.link} !important;
        }
      `}</style>

      {/* SVG Container */}
      <svg
        ref={svgRef}
        className={`w-full h-full markmap-viewer-${isDark ? 'dark' : 'light'}`}
        style={{ display: 'block' }}
      />

      {/* Toolbar */}
      {showToolbar && (
        <div
          className={`absolute ${compact ? 'top-2 right-2' : 'top-4 right-4'} flex items-center gap-1 p-1 rounded-lg shadow-lg`}
          style={{ backgroundColor: colors.toolbar, borderColor: colors.border }}
        >
          <button
            onClick={() => handleZoom('out')}
            className="p-1.5 rounded hover:bg-black/10 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" style={{ color: colors.text }} />
          </button>

          <span
            className="px-2 text-xs font-medium min-w-[48px] text-center"
            style={{ color: colors.text }}
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => handleZoom('in')}
            className="p-1.5 rounded hover:bg-black/10 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" style={{ color: colors.text }} />
          </button>

          <div
            className="w-px h-5 mx-1"
            style={{ backgroundColor: colors.border }}
          />

          <button
            onClick={handleFit}
            className="p-1.5 rounded hover:bg-black/10 transition-colors"
            title="Fit to view"
          >
            <LayoutGrid className="w-4 h-4" style={{ color: colors.text }} />
          </button>

          <button
            onClick={handleExport}
            className="p-1.5 rounded hover:bg-black/10 transition-colors"
            title="Export SVG"
          >
            <Download className="w-4 h-4" style={{ color: colors.text }} />
          </button>

          {!compact && (
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded hover:bg-black/10 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <X className="w-4 h-4" style={{ color: colors.text }} />
              ) : (
                <Maximize2 className="w-4 h-4" style={{ color: colors.text }} />
              )}
            </button>
          )}
        </div>
      )}

      {/* Node count badge */}
      {!compact && (
        <div
          className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: colors.toolbar, color: colors.text }}
        >
          <GitBranch className="w-3 h-3 inline-block mr-1.5 opacity-60" />
          {nodeCount} nodes from markdown
        </div>
      )}

      {/* Fullscreen close button */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 left-4 p-2 rounded-lg shadow-lg hover:bg-black/10 transition-colors"
          style={{ backgroundColor: colors.toolbar }}
        >
          <X className="w-5 h-5" style={{ color: colors.text }} />
        </button>
      )}
    </div>
  )

  return viewerContent
}

/* ═══════════════════════════════════════════════════════════════════════════
   INLINE MARKMAP (COMPACT VERSION)
═══════════════════════════════════════════════════════════════════════════ */

interface InlineMarkmapProps {
  markdown: string
  theme?: ThemeName
}

/**
 * Compact markmap viewer for embedding in content
 */
export function InlineMarkmap({ markdown, theme = 'dark' }: InlineMarkmapProps) {
  return (
    <div className="my-4">
      <MarkmapViewer
        markdown={markdown}
        theme={theme}
        height={300}
        showToolbar={true}
        compact={true}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MARKMAP TOGGLE BUTTON
═══════════════════════════════════════════════════════════════════════════ */

interface MarkmapToggleProps {
  active: boolean
  onToggle: () => void
  theme?: ThemeName
}

/**
 * Toggle button for switching between markdown and mind map view
 */
export function MarkmapToggle({ active, onToggle, theme = 'dark' }: MarkmapToggleProps) {
  const colors = THEME_COLORS[theme] || THEME_COLORS.dark

  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
        transition-all duration-200
        ${active
          ? 'shadow-md'
          : 'hover:opacity-80'
        }
      `}
      style={{
        backgroundColor: active ? colors.accent : colors.toolbar,
        color: active ? 'white' : colors.text,
        borderColor: colors.border,
      }}
      title={active ? 'Show markdown' : 'Show as mind map'}
    >
      <GitBranch className="w-4 h-4" />
      {active ? 'Mind Map' : 'Mind Map'}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export { THEME_COLORS as MARKMAP_THEMES }
