/**
 * Inline Canvas - Compact embedded drawing canvas
 * @module codex/ui/InlineCanvas
 *
 * @description
 * A compact, inline Tldraw canvas that embeds within the editor.
 * Not a modal - fits directly in the content flow.
 * Exports SVG for live markdown preview.
 */

'use client'

import React, { useCallback, useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Download, Trash2, Maximize2, Minimize2,
  PenTool, Eraser, Square, Circle, Type, Move
} from 'lucide-react'
import {
  Tldraw,
  type Editor,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

interface InlineCanvasProps {
  /** Initial SVG content (for editing existing) */
  initialSvg?: string
  /** Callback when canvas content changes */
  onChange?: (svgContent: string, base64DataUri: string) => void
  /** Current theme */
  isDark?: boolean
  /** Compact mode - minimal UI */
  compact?: boolean
  /** Fixed height in pixels */
  height?: number
  /** Placeholder text when empty */
  placeholder?: string
}

/**
 * Convert SVG string to base64 data URI for markdown embedding
 */
function svgToDataUri(svgString: string): string {
  if (typeof window === 'undefined') return ''
  try {
    const encoded = btoa(unescape(encodeURIComponent(svgString)))
    return `data:image/svg+xml;base64,${encoded}`
  } catch {
    return ''
  }
}

/**
 * Inline Canvas Component
 * Embeds directly in content flow, not a modal
 */
export default function InlineCanvas({
  initialSvg,
  onChange,
  isDark = false,
  compact = false,
  height = 300,
  placeholder = 'Draw something...',
}: InlineCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [hasContent, setHasContent] = useState(!!initialSvg)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Export and notify parent of changes
  const exportAndNotify = useCallback(async () => {
    if (!editor) return

    try {
      const shapeIds = Array.from(editor.getCurrentPageShapeIds())

      if (shapeIds.length === 0) {
        setHasContent(false)
        onChange?.('', '')
        return
      }

      setHasContent(true)

      // Export as SVG
      const svg = await editor.getSvg(shapeIds, {
        padding: 16,
        background: false,
      })

      if (!svg) return

      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svg)
      const dataUri = svgToDataUri(svgString)

      onChange?.(svgString, dataUri)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }, [editor, onChange])

  // Debounced export on changes
  const handleChange = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      exportAndNotify()
    }, 500)
  }, [exportAndNotify])

  // Listen for editor changes
  useEffect(() => {
    if (!editor) return

    const unsubscribe = editor.store.listen(() => {
      handleChange()
    }, { scope: 'document' })

    return () => {
      unsubscribe()
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [editor, handleChange])

  // Clear canvas
  const handleClear = useCallback(() => {
    if (!editor) return
    const shapeIds = Array.from(editor.getCurrentPageShapeIds())
    if (shapeIds.length > 0) {
      editor.deleteShapes(shapeIds)
    }
    setHasContent(false)
    onChange?.('', '')
  }, [editor, onChange])

  // Manual export button
  const handleExport = useCallback(() => {
    exportAndNotify()
  }, [exportAndNotify])

  const effectiveHeight = expanded ? Math.min(600, window.innerHeight * 0.7) : height

  return (
    <div
      ref={containerRef}
      className={`
        relative rounded-lg border overflow-hidden transition-all
        ${isDark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-300 bg-white'}
        ${expanded ? 'shadow-xl' : 'shadow-sm'}
      `}
      style={{ height: effectiveHeight }}
    >
      {/* Toolbar */}
      <div className={`
        absolute top-2 right-2 z-20 flex items-center gap-1
        rounded-lg p-1
        ${isDark ? 'bg-zinc-800/90' : 'bg-white/90'}
        backdrop-blur-sm shadow-sm border
        ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
      `}>
        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`
            p-1.5 rounded transition-colors
            ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}
          `}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={!hasContent}
          className={`
            p-1.5 rounded transition-colors
            ${hasContent
              ? isDark ? 'hover:bg-zinc-700 text-emerald-400' : 'hover:bg-zinc-100 text-emerald-600'
              : 'opacity-40 cursor-not-allowed'
            }
            ${isDark ? 'text-zinc-400' : 'text-zinc-600'}
          `}
          title="Save to preview"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Clear */}
        <button
          onClick={handleClear}
          disabled={!hasContent}
          className={`
            p-1.5 rounded transition-colors
            ${hasContent
              ? isDark ? 'hover:bg-red-900/50 text-red-400' : 'hover:bg-red-50 text-red-500'
              : 'opacity-40 cursor-not-allowed'
            }
          `}
          title="Clear canvas"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Empty State Hint */}
      {!hasContent && !editor && (
        <div className={`
          absolute inset-0 flex items-center justify-center pointer-events-none z-10
          ${isDark ? 'text-zinc-600' : 'text-zinc-400'}
        `}>
          <div className="flex flex-col items-center gap-2">
            <PenTool className="w-8 h-8 opacity-50" />
            <span className="text-sm">{placeholder}</span>
          </div>
        </div>
      )}

      {/* Tldraw Canvas */}
      <div className="absolute inset-0">
        <Tldraw
          onMount={(e) => {
            setEditor(e)
            // Check if there's initial content
            const shapes = e.getCurrentPageShapeIds()
            setHasContent(shapes.size > 0)
          }}
          inferDarkMode={isDark}
          hideUi={compact}
        />
      </div>

      {/* Canvas badge */}
      <div className={`
        absolute bottom-2 left-2 z-20
        px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide
        ${isDark ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-700'}
      `}>
        <PenTool className="w-3 h-3 inline mr-1" />
        Canvas
      </div>
    </div>
  )
}
