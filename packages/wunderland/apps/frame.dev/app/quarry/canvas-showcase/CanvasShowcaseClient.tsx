/**
 * Canvas Showcase Client Component
 * @module quarry/canvas-showcase/CanvasShowcaseClient
 *
 * Interactive infinite canvas demonstration with pre-populated demo content.
 * Features:
 * - Pre-loaded demo shapes (sticky notes, frames, link previews, strands)
 * - Save/load canvas state to localStorage
 * - Export canvas to JSON file
 * - Reset to demo content
 */

'use client'

import React, { useCallback, useEffect, useState, useRef } from 'react'
import {
  Tldraw,
  Editor,
  createTLStore,
  defaultShapeUtils,
  TLRecord,
  type TLUiOverrides,
  type TLComponents,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import {
  Download,
  Upload,
  RotateCcw,
  Save,
  Moon,
  Sun,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Info,
} from 'lucide-react'
import { SHOWCASE_SHAPE_UTILS } from '@/components/quarry/ui/canvas/shapes'
import { ALL_DEMO_SHAPES, DEMO_CANVAS_SETTINGS, createCanvasExportData } from './demoContent'

// Storage key for canvas state
const STORAGE_KEY = 'quarry-canvas-showcase-state'

interface CanvasShowcaseClientProps {
  isDark?: boolean
}

export function CanvasShowcaseClient({ isDark: initialDark = false }: CanvasShowcaseClientProps) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [isDark, setIsDark] = useState(initialDark)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showInfo, setShowInfo] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Create store with custom shape utils
  const store = React.useMemo(() => {
    return createTLStore({
      shapeUtils: [...defaultShapeUtils, ...SHOWCASE_SHAPE_UTILS],
    })
  }, [])

  // Load saved state or initialize with demo content
  useEffect(() => {
    if (!editor) return

    // Try to load from localStorage first
    const savedState = localStorage.getItem(STORAGE_KEY)
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        // Restore shapes from saved state
        if (parsed.shapes && Array.isArray(parsed.shapes)) {
          editor.createShapes(parsed.shapes)
          return
        }
      } catch (e) {
        console.warn('Failed to restore canvas state:', e)
      }
    }

    // Initialize with demo content
    initializeDemoContent()
  }, [editor])

  // Initialize demo content
  const initializeDemoContent = useCallback(() => {
    if (!editor) return

    // Clear existing shapes
    const allShapes = editor.getCurrentPageShapes()
    if (allShapes.length > 0) {
      editor.deleteShapes(allShapes.map((s) => s.id))
    }

    // Create demo shapes
    editor.createShapes(ALL_DEMO_SHAPES as any)

    // Set initial camera position
    setTimeout(() => {
      editor.zoomToFit({ duration: 300 })
    }, 100)
  }, [editor])

  // Save state to localStorage
  const saveToLocalStorage = useCallback(() => {
    if (!editor) return

    const shapes = editor.getCurrentPageShapes()
    const state = {
      shapes: shapes.map((s) => ({
        id: s.id,
        type: s.type,
        x: s.x,
        y: s.y,
        props: s.props,
      })),
      savedAt: new Date().toISOString(),
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))

    // Show toast
    showToast('Canvas saved!')
  }, [editor])

  // Export canvas to JSON file
  const exportToJson = useCallback(() => {
    if (!editor) return

    const shapes = editor.getCurrentPageShapes()
    const exportData = {
      ...createCanvasExportData(),
      shapes: shapes.map((s) => ({
        id: s.id,
        type: s.type,
        x: s.x,
        y: s.y,
        props: s.props,
      })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `canvas-showcase-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    showToast('Canvas exported!')
  }, [editor])

  // Import canvas from JSON file
  const importFromJson = useCallback(() => {
    if (!editor) return

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)

        if (data.shapes && Array.isArray(data.shapes)) {
          // Clear existing shapes
          const allShapes = editor.getCurrentPageShapes()
          if (allShapes.length > 0) {
            editor.deleteShapes(allShapes.map((s) => s.id))
          }

          // Create imported shapes
          editor.createShapes(data.shapes as any)
          editor.zoomToFit({ duration: 300 })
          showToast('Canvas imported!')
        }
      } catch (err) {
        console.error('Failed to import canvas:', err)
        showToast('Failed to import canvas')
      }
    }
    input.click()
  }, [editor])

  // Reset to demo content
  const resetToDemo = useCallback(() => {
    if (!editor) return
    localStorage.removeItem(STORAGE_KEY)
    initializeDemoContent()
    showToast('Reset to demo content')
  }, [editor, initializeDemoContent])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Show toast notification
  const showToast = (message: string) => {
    const toast = document.createElement('div')
    toast.className =
      'fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in'
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transition = 'opacity 0.3s'
      setTimeout(() => toast.remove(), 300)
    }, 2000)
  }

  // UI overrides to customize toolbar
  const uiOverrides: TLUiOverrides = {
    tools(editor, tools) {
      return tools
    },
  }

  // Custom components
  const components: TLComponents = {
    // Keep defaults
  }

  // Handle editor mount
  const handleMount = useCallback((ed: Editor) => {
    setEditor(ed)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      style={{ minHeight: '100vh' }}
    >
      {/* Top toolbar */}
      <div
        className={`absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-4 ${
          isFullscreen ? 'px-4' : ''
        }`}
      >
        {/* Left side - Title & Info */}
        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm ${
              isDark ? 'bg-gray-800/90' : 'bg-white/90'
            }`}
          >
            <h1
              className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              ✨ Canvas Showcase
            </h1>
          </div>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-lg shadow-lg transition-all ${
              isDark
                ? 'bg-gray-800/90 text-gray-300 hover:text-white'
                : 'bg-white/90 text-gray-600 hover:text-gray-900'
            }`}
            title={showInfo ? 'Hide info' : 'Show info'}
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {/* Right side - Actions */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm ${
            isDark ? 'bg-gray-800/90' : 'bg-white/90'
          }`}
        >
          {/* Zoom controls */}
          <button
            onClick={() => editor?.zoomIn()}
            className={`p-2 rounded transition-colors ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            title="Zoom in"
          >
            <ZoomIn className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <button
            onClick={() => editor?.zoomOut()}
            className={`p-2 rounded transition-colors ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            title="Zoom out"
          >
            <ZoomOut className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>

          <div className={`w-px h-6 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* Save/Load actions */}
          <button
            onClick={saveToLocalStorage}
            className={`p-2 rounded transition-colors ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            title="Save to browser"
          >
            <Save className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <button
            onClick={exportToJson}
            className={`p-2 rounded transition-colors ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            title="Export to JSON"
          >
            <Download className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <button
            onClick={importFromJson}
            className={`p-2 rounded transition-colors ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            title="Import from JSON"
          >
            <Upload className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>

          <div className={`w-px h-6 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* Reset */}
          <button
            onClick={resetToDemo}
            className={`p-2 rounded transition-colors ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            title="Reset to demo"
          >
            <RotateCcw className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>

          <div className={`w-px h-6 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* Theme toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded transition-colors ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-yellow-400" />
            ) : (
              <Moon className="w-4 h-4 text-gray-600" />
            )}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded transition-colors ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            title="Toggle fullscreen"
          >
            <Maximize2 className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
        </div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div
          className={`absolute bottom-4 left-4 z-10 max-w-sm p-4 rounded-xl shadow-lg backdrop-blur-sm ${
            isDark ? 'bg-gray-800/95 text-gray-200' : 'bg-white/95 text-gray-700'
          }`}
        >
          <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
            <span className="text-lg">🎨</span> Shape Types Demo
          </h2>
          <div className="text-xs space-y-1.5">
            <p>
              <span className="font-semibold text-yellow-500">● Sticky Notes</span> - Quick
              capture Post-it style notes
            </p>
            <p>
              <span className="font-semibold text-blue-500">● Frames</span> - Container regions
              for organization
            </p>
            <p>
              <span className="font-semibold text-purple-500">● Link Previews</span> - Rich URL
              embeds
            </p>
            <p>
              <span className="font-semibold text-emerald-500">● Strands</span> - Knowledge unit
              cards
            </p>
            <p>
              <span className="font-semibold text-violet-500">● Collections</span> - Grouped
              strand containers
            </p>
          </div>
          <p className={`text-xs mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Pan: drag background • Zoom: scroll/pinch • Select: click shapes
          </p>
        </div>
      )}

      {/* Canvas */}
      <div className="absolute inset-0">
        <Tldraw
          store={store}
          shapeUtils={SHOWCASE_SHAPE_UTILS}
          onMount={handleMount}
          overrides={uiOverrides}
          components={components}
          inferDarkMode={isDark}
          className={isDark ? 'tldraw-dark' : ''}
        />
      </div>
    </div>
  )
}

export default CanvasShowcaseClient

