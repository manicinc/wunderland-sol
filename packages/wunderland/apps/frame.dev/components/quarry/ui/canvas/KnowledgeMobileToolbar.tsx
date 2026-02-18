/**
 * Knowledge Mobile Toolbar - Bottom toolbar for KnowledgeCanvas on mobile
 * @module codex/ui/canvas/KnowledgeMobileToolbar
 *
 * Apple Freeform-inspired mobile toolbar for knowledge canvas.
 * Different from MobileCanvasToolbar (which has drawing tools).
 *
 * Features:
 * - Bottom-positioned for thumb reach
 * - Layout preset picker
 * - Zoom controls
 * - Fit to view
 * - Safe area inset support
 */

'use client'

import React, { useCallback, useState } from 'react'
import { useEditor, track } from '@tldraw/tldraw'
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
  ChevronUp,
} from 'lucide-react'
import type { LayoutPreset } from '../misc/KnowledgeCanvas'

interface KnowledgeMobileToolbarProps {
  currentLayout: LayoutPreset
  onLayoutChange: (layout: LayoutPreset) => void
  isDark?: boolean
  visible?: boolean
}

// Layout preset info
const LAYOUT_PRESETS: Record<LayoutPreset, { icon: typeof LayoutGrid; label: string }> = {
  force: { icon: Network, label: 'Force' },
  grid: { icon: LayoutGrid, label: 'Grid' },
  timeline: { icon: Calendar, label: 'Timeline' },
  cluster: { icon: Layers, label: 'Cluster' },
  freeform: { icon: Move, label: 'Free' },
}

/**
 * Mobile-optimized toolbar for KnowledgeCanvas
 */
export const KnowledgeMobileToolbar = track(function KnowledgeMobileToolbar({
  currentLayout,
  onLayoutChange,
  isDark = false,
  visible = true,
}: KnowledgeMobileToolbarProps) {
  const editor = useEditor()
  const [showLayoutPicker, setShowLayoutPicker] = useState(false)

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    editor.zoomIn()
  }, [editor])

  const handleZoomOut = useCallback(() => {
    editor.zoomOut()
  }, [editor])

  const handleFitToView = useCallback(() => {
    editor.zoomToFit({ duration: 300 })
  }, [editor])

  const CurrentLayoutIcon = LAYOUT_PRESETS[currentLayout].icon

  // Theme classes
  const bgClasses = isDark
    ? 'bg-zinc-900/95 border-zinc-700/50'
    : 'bg-white/95 border-zinc-200/50'

  const buttonClasses = isDark
    ? 'text-zinc-400 hover:bg-zinc-800 active:bg-zinc-700'
    : 'text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200'

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Layout picker overlay */}
          <AnimatePresence>
            {showLayoutPicker && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40"
                onClick={() => setShowLayoutPicker(false)}
              >
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  className={`
                    absolute bottom-24 left-1/2 -translate-x-1/2 p-3 rounded-2xl
                    border backdrop-blur-xl shadow-2xl
                    ${bgClasses}
                  `}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className={`text-xs font-medium mb-2 text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Layout Preset
                  </p>
                  <div className="flex items-center gap-1">
                    {(Object.entries(LAYOUT_PRESETS) as [LayoutPreset, typeof LAYOUT_PRESETS['force']][]).map(
                      ([key, { icon: Icon, label }]) => (
                        <button
                          key={key}
                          onClick={() => {
                            onLayoutChange(key)
                            setShowLayoutPicker(false)
                          }}
                          className={`
                            flex flex-col items-center gap-1 p-3 rounded-xl min-w-[56px]
                            transition-all duration-200
                            ${currentLayout === key
                              ? 'bg-emerald-500 text-white'
                              : buttonClasses
                            }
                          `}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-[10px] font-medium">{label}</span>
                        </button>
                      )
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main toolbar */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-50 pb-safe"
          >
            <div
              className={`
                mx-4 mb-4 p-2 rounded-2xl
                border backdrop-blur-xl shadow-2xl
                ${bgClasses}
              `}
            >
              <div className="flex items-center justify-center gap-2">
                {/* Zoom out */}
                <button
                  onClick={handleZoomOut}
                  className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    transition-colors
                    ${buttonClasses}
                  `}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>

                {/* Fit to view */}
                <button
                  onClick={handleFitToView}
                  className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    transition-colors
                    ${buttonClasses}
                  `}
                  aria-label="Fit to view"
                >
                  <Home className="w-5 h-5" />
                </button>

                {/* Zoom in */}
                <button
                  onClick={handleZoomIn}
                  className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    transition-colors
                    ${buttonClasses}
                  `}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>

                {/* Separator */}
                <div
                  className={`w-px h-8 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`}
                />

                {/* Layout picker toggle */}
                <button
                  onClick={() => setShowLayoutPicker(!showLayoutPicker)}
                  className={`
                    flex items-center gap-2 px-4 h-12 rounded-xl
                    transition-all
                    ${showLayoutPicker
                      ? 'bg-emerald-500 text-white'
                      : buttonClasses
                    }
                  `}
                  aria-label="Change layout"
                >
                  <CurrentLayoutIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">{LAYOUT_PRESETS[currentLayout].label}</span>
                  <ChevronUp
                    className={`w-4 h-4 transition-transform ${showLayoutPicker ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})

export default KnowledgeMobileToolbar
