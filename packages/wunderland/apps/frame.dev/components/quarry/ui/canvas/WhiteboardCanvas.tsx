/**
 * Whiteboard Canvas - Art Deco infinite drawing board
 * @module codex/ui/WhiteboardCanvas
 *
 * @remarks
 * Tldraw wrapped in gold leaf and geometric patterns.
 * Exports directly to SVG for strand integration.
 *
 * Includes custom shapes:
 * - VoiceNoteShape: Audio player with waveform
 * - TranscriptShape: Text card linked to voice notes
 * - AttachmentShape: File/image embed
 */

'use client'

import React, { useCallback, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Download, Grid,
  PenTool, Maximize2
} from 'lucide-react'
import {
  Tldraw,
  DefaultColorThemePalette,
  type TLComponents,
  type Editor,
  type TLUiOverrides,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import type { ThemeName } from '@/types/theme'
import dynamic from 'next/dynamic'
import { CUSTOM_SHAPE_UTILS } from './shapes'
import { useCanvasShapes } from './useCanvasShapes'
import { usePreferences } from '@/components/quarry/hooks/usePreferences'
import { useHaptics } from '../../hooks/useHaptics'
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice'
import { isLikelyHandwriting } from '@/lib/ocr'
import { HandwritingUploadModal } from './HandwritingUploadModal'
import { useImageAnalysis } from './useImageAnalysis'

// Dynamic import for RadialMediaMenu to avoid SSR issues
const RadialMediaMenu = dynamic(() => import('../misc/RadialMediaMenu'), { ssr: false })

/**
 * Extended Color Palette for Infinite Canvas
 *
 * Overrides tldraw's 12 default colors with a comprehensive Art Deco-inspired palette.
 * Applied outside React lifecycle so it takes effect before component mount.
 *
 * Color slots (original → new):
 * - black → Deep Charcoal (rich black)
 * - grey → Cool Grey
 * - light-violet → Lavender (soft purple)
 * - violet → Royal Purple
 * - blue → Cobalt Blue
 * - light-blue → Sky Blue / Cyan
 * - yellow → Gold (Art Deco signature)
 * - orange → Bronze / Copper
 * - green → Emerald
 * - light-green → Sage / Mint
 * - light-red → Coral / Salmon
 * - red → Crimson
 */

// Light mode palette
DefaultColorThemePalette.lightMode.black.solid = '#1a1a2e'       // Deep Charcoal
DefaultColorThemePalette.lightMode.grey.solid = '#6b7280'        // Cool Grey
DefaultColorThemePalette.lightMode['light-violet'].solid = '#a78bfa' // Lavender
DefaultColorThemePalette.lightMode.violet.solid = '#7c3aed'      // Royal Purple
DefaultColorThemePalette.lightMode.blue.solid = '#2563eb'        // Cobalt Blue
DefaultColorThemePalette.lightMode['light-blue'].solid = '#06b6d4' // Cyan
DefaultColorThemePalette.lightMode.yellow.solid = '#d4a574'      // Gold/Amber (Art Deco)
DefaultColorThemePalette.lightMode.orange.solid = '#ea580c'      // Burnt Orange
DefaultColorThemePalette.lightMode.green.solid = '#059669'       // Emerald
DefaultColorThemePalette.lightMode['light-green'].solid = '#84cc16' // Lime
DefaultColorThemePalette.lightMode['light-red'].solid = '#f472b6' // Pink
DefaultColorThemePalette.lightMode.red.solid = '#dc2626'         // Crimson

// Dark mode palette (adjusted for visibility on dark backgrounds)
DefaultColorThemePalette.darkMode.black.solid = '#f5f5f5'        // Off-White (inverted for dark)
DefaultColorThemePalette.darkMode.grey.solid = '#9ca3af'         // Light Grey
DefaultColorThemePalette.darkMode['light-violet'].solid = '#c4b5fd' // Light Lavender
DefaultColorThemePalette.darkMode.violet.solid = '#a78bfa'       // Soft Purple
DefaultColorThemePalette.darkMode.blue.solid = '#60a5fa'         // Sky Blue
DefaultColorThemePalette.darkMode['light-blue'].solid = '#22d3ee' // Bright Cyan
DefaultColorThemePalette.darkMode.yellow.solid = '#fcd34d'       // Bright Gold
DefaultColorThemePalette.darkMode.orange.solid = '#fb923c'       // Soft Orange
DefaultColorThemePalette.darkMode.green.solid = '#34d399'        // Bright Emerald
DefaultColorThemePalette.darkMode['light-green'].solid = '#a3e635' // Bright Lime
DefaultColorThemePalette.darkMode['light-red'].solid = '#f9a8d4' // Light Pink
DefaultColorThemePalette.darkMode.red.solid = '#f87171'          // Coral Red

interface WhiteboardCanvasProps {
  /** Whether whiteboard is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Save drawing callback */
  onSave: (svgContent: string, pngBlob?: Blob) => void
  /** Current theme */
  theme?: ThemeName
}

// Art Deco color palette reference (for custom UI elements)
const ART_DECO_COLORS = [
  '#d4a574', // Gold/Amber
  '#1a1a2e', // Deep Charcoal
  '#7c3aed', // Royal Purple
  '#dc2626', // Crimson
  '#059669', // Emerald
  '#06b6d4', // Cyan
  '#ea580c', // Burnt Orange
  '#f472b6', // Pink
]

/**
 * Custom Art Deco themed Tldraw components
 */
const customComponents: TLComponents = {
  // Add custom UI components here
}

/**
 * Art Deco-styled whiteboard with Tldraw
 * 
 * @remarks
 * - Infinite canvas with pan and zoom
 * - Custom Art Deco tool palette
 * - Export to SVG/PNG
 * - Geometric guide overlays
 * - Golden ratio grid
 */
export default function WhiteboardCanvas({
  isOpen,
  onClose,
  onSave,
  theme = 'light',
}: WhiteboardCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [showGuides, setShowGuides] = useState(false)
  const [saving, setSaving] = useState(false)

  // Radial menu state
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)

  // Handwriting upload modal state
  const [handwritingModalOpen, setHandwritingModalOpen] = useState(false)
  const [handwritingUpload, setHandwritingUpload] = useState<{
    blob: Blob
    path: string
    filename: string
    dimensions?: { width: number; height: number }
    detectionConfidence: number
  } | null>(null)

  // User preferences for auto-transcribe
  const { preferences } = usePreferences()

  // Haptics and touch detection
  const { haptic } = useHaptics()
  const isTouch = useIsTouchDevice()

  // Long-press state for touch devices
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const LONG_PRESS_DURATION = 500 // ms
  const MOVEMENT_THRESHOLD = 10 // px

  // Custom shapes hook
  const {
    createVoiceNote,
    createTranscript,
    createAttachment,
    createVoiceNoteWithTranscript,
  } = useCanvasShapes({ editor })

  // Image analysis hook
  const { detectSource, shouldAnalyze, analyzeAndUpdateShape } = useImageAnalysis()

  /**
   * Export drawing as SVG
   */
  const exportSVG = useCallback(async () => {
    if (!editor) return

    setSaving(true)

    try {
      // Get all shape ids
      const shapeIds = Array.from(editor.getCurrentPageShapeIds())

      if (shapeIds.length === 0) {
        console.warn('No shapes to export')
        setSaving(false)
        return
      }

      // Export as SVG using Tldraw's export API
      const svg = await editor.getSvg(shapeIds)
      if (!svg) {
        console.error('Failed to generate SVG')
        setSaving(false)
        return
      }

      // Convert SVG to string
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svg)

      // Tldraw doesn't have getViewportScreenshot, just pass SVG
      onSave(svgString, undefined)

      // Brief success animation
      setTimeout(() => {
        setSaving(false)
        onClose()
      }, 500)
    } catch (error) {
      console.error('Export failed:', error)
      setSaving(false)
    }
  }, [editor, onSave, onClose])

  /**
   * Handle right-click to open radial menu
   */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setMenuPosition({ x: e.clientX, y: e.clientY })
    setMenuOpen(true)
  }, [])

  /**
   * Close the radial menu
   */
  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    setMenuPosition(null)
  }, [])

  /**
   * Cancel any pending long-press timer
   */
  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    touchStartPos.current = null
  }, [])

  /**
   * Handle touch start - start long-press timer
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle single touch
    if (e.touches.length !== 1) {
      cancelLongPress()
      return
    }

    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }

    // Start long-press timer
    longPressTimer.current = setTimeout(() => {
      if (touchStartPos.current) {
        haptic('longPress')
        setMenuPosition(touchStartPos.current)
        setMenuOpen(true)
        touchStartPos.current = null
      }
    }, LONG_PRESS_DURATION)
  }, [haptic, cancelLongPress])

  /**
   * Handle touch move - cancel if moved too far
   */
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current || !longPressTimer.current) return

    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x)
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y)

    // Cancel if moved beyond threshold
    if (deltaX > MOVEMENT_THRESHOLD || deltaY > MOVEMENT_THRESHOLD) {
      cancelLongPress()
    }
  }, [cancelLongPress])

  /**
   * Handle touch end - cancel timer
   */
  const handleTouchEnd = useCallback(() => {
    cancelLongPress()
  }, [cancelLongPress])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  /**
   * Handle voice recording completion - create VoiceNoteShape
   */
  const handleVoiceRecording = useCallback(async (blob: Blob, path: string, filename: string) => {
    if (!editor || !menuPosition) return

    // Calculate duration from blob
    const audioContext = new AudioContext()
    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const duration = audioBuffer.duration

    // Use preference for auto-transcribe (user can cancel if it starts)
    const autoTranscribe = preferences.autoTranscribeVoiceNotes

    await createVoiceNote({
      audioPath: path,
      audioBlob: blob,
      title: filename.replace(/\.[^.]+$/, ''),
      duration,
      autoTranscribe,
      position: menuPosition,
    })

    closeMenu()
  }, [editor, menuPosition, createVoiceNote, closeMenu, preferences.autoTranscribeVoiceNotes])

  /**
   * Handle photo/image capture - detect handwriting and create appropriate shape
   */
  const handlePhotoCapture = useCallback(async (blob: Blob, path: string, filename: string) => {
    if (!editor || !menuPosition) return

    // Create a URL for the blob to get dimensions
    const url = URL.createObjectURL(blob)
    const img = new window.Image()

    img.onload = async () => {
      const dimensions = { width: img.naturalWidth, height: img.naturalHeight }

      // Detect handwriting in the image
      const isHandwriting = await isLikelyHandwriting(blob)

      if (isHandwriting) {
        // Show handwriting upload modal
        setHandwritingUpload({
          blob,
          path,
          filename,
          dimensions,
          detectionConfidence: 0.8, // Simplified confidence for now
        })
        setHandwritingModalOpen(true)
      } else {
        // Detect image source type (camera, upload, screenshot)
        const sourceType = await detectSource(blob, filename)

        // Create regular attachment with source type
        const shapeId = createAttachment({
          filePath: path,
          fileName: filename,
          mimeType: blob.type,
          fileSize: blob.size,
          thumbnailPath: path,
          dimensions,
          position: menuPosition,
          sourceType,
          analysisStatus: 'idle',
        })

        // Check if should auto-analyze based on source and preferences
        if (shapeId && shouldAnalyze(sourceType)) {
          // Trigger analysis in background
          analyzeAndUpdateShape(shapeId, blob, filename).catch((error) => {
            console.error('[WhiteboardCanvas] Auto-analysis failed:', error)
          })
        }

        closeMenu()
      }

      URL.revokeObjectURL(url)
    }

    img.onerror = () => {
      // Still create attachment without dimensions (no detection on error)
      createAttachment({
        filePath: path,
        fileName: filename,
        mimeType: blob.type,
        fileSize: blob.size,
        position: menuPosition,
      })
      URL.revokeObjectURL(url)
      closeMenu()
    }

    img.src = url
  }, [editor, menuPosition, createAttachment, closeMenu, detectSource, shouldAnalyze, analyzeAndUpdateShape])

  /**
   * Handle file upload - create AttachmentShape
   */
  const handleFileUpload = useCallback((blob: Blob, path: string, filename: string) => {
    if (!editor || !menuPosition) return

    createAttachment({
      filePath: path,
      fileName: filename,
      mimeType: blob.type,
      fileSize: blob.size,
      position: menuPosition,
    })

    closeMenu()
  }, [editor, menuPosition, createAttachment, closeMenu])

  /**
   * Custom UI overrides for Art Deco styling
   */
  const uiOverrides: TLUiOverrides = {
    tools(editor, tools) {
      // Customize tool order
      return {
        ...tools,
      }
    },
    actions(editor, actions) {
      return {
        ...actions,
        'export-svg': {
          id: 'export-svg',
          label: 'Export Drawing',
          kbd: 'ctrl+s',
          onSelect: exportSVG,
        },
      }
    },
  }

  if (!isOpen) return null

  const isDark = theme.includes('dark')
  const isSepia = theme.includes('sepia')

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
        />

        {/* Canvas Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20 }}
          className="relative w-full h-full flex flex-col"
        >
          {/* Art Deco Header */}
          <header className={`
            relative px-6 py-4 flex items-center justify-between
            border-b-4 z-10
            ${isDark ? 'border-amber-800' : 'border-amber-400'}
            ${isSepia && isDark ? 'bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950' : ''}
            ${isSepia && !isDark ? 'bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50' : ''}
            ${!isSepia && isDark ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900' : ''}
            ${!isSepia && !isDark ? 'bg-gradient-to-r from-gray-50 via-white to-gray-50' : ''}
          `}>
            {/* Geometric Pattern Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <svg className="w-full h-full" viewBox="0 0 400 80" preserveAspectRatio="none">
                <defs>
                  <pattern id="deco-draw" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                    <polygon points="40,5 75,40 40,75 5,40" fill="none" stroke="currentColor" strokeWidth="1" />
                    <circle cx="40" cy="40" r="15" fill="none" stroke="currentColor" strokeWidth="1" />
                    <rect x="25" y="25" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect x="0" y="0" width="100%" height="100%" fill="url(#deco-draw)" />
                <line x1="0" y1="79" x2="100%" y2="79" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>

            {/* Title */}
            <div className="flex items-center gap-4 z-10">
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className={`
                  p-3 rounded-xl shadow-inner
                  ${isDark ? 'bg-amber-900/50' : 'bg-amber-100'}
                `}
              >
                <PenTool className="w-6 h-6 text-amber-700 dark:text-amber-300" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold tracking-wider">
                  INFINITE CANVAS
                </h2>
                <p className="text-sm opacity-70">
                  Draw your thoughts into existence
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 z-10">
              {/* Grid Toggle */}
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`
                  p-2.5 rounded-lg transition-all
                  ${showGrid
                    ? isDark ? 'bg-amber-800 text-amber-100' : 'bg-amber-600 text-white'
                    : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
                  }
                `}
                title="Toggle grid"
              >
                <Grid className="w-5 h-5" />
              </button>

              {/* Guides Toggle */}
              <button
                onClick={() => setShowGuides(!showGuides)}
                className={`
                  p-2.5 rounded-lg transition-all
                  ${showGuides
                    ? isDark ? 'bg-amber-800 text-amber-100' : 'bg-amber-600 text-white'
                    : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
                  }
                `}
                title="Toggle golden ratio guides"
              >
                <Maximize2 className="w-5 h-5" />
              </button>

              {/* Save */}
              <button
                onClick={exportSVG}
                disabled={saving || !editor}
                className={`
                  px-4 py-2.5 rounded-lg font-bold transition-all
                  flex items-center gap-2 min-w-[120px]
                  ${isDark
                    ? 'bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-amber-100'
                    : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-lg
                `}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </>
                )}
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className={`
                  p-2.5 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}
                `}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Tldraw Canvas */}
          <div
            className="relative flex-1 overflow-hidden"
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            style={{
              backgroundColor: isSepia
                ? isDark ? '#0E0704' : '#FCF9F2'
                : isDark ? '#0f0f0f' : '#ffffff',
            }}
          >
            {/* Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none z-10 opacity-10">
                <svg className="w-full h-full">
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
            )}

            {/* Golden Ratio Guides */}
            {showGuides && (
              <div className="absolute inset-0 pointer-events-none z-10 opacity-20">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line x1="38.2" y1="0" x2="38.2" y2="100" stroke="gold" strokeWidth="0.5" />
                  <line x1="61.8" y1="0" x2="61.8" y2="100" stroke="gold" strokeWidth="0.5" />
                  <line x1="0" y1="38.2" x2="100" y2="38.2" stroke="gold" strokeWidth="0.5" />
                  <line x1="0" y1="61.8" x2="100" y2="61.8" stroke="gold" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="30.9" fill="none" stroke="gold" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="19.1" fill="none" stroke="gold" strokeWidth="0.5" />
                </svg>
              </div>
            )}

            {/* Tldraw Component */}
            <Tldraw
              onMount={setEditor}
              shapeUtils={CUSTOM_SHAPE_UTILS}
              overrides={uiOverrides}
              components={customComponents}
              defaultName="Art Deco Drawing"
              inferDarkMode={isDark}
            />

            {/* Art Deco Corner Ornaments */}
            <div className="absolute top-4 left-4 w-16 h-16 pointer-events-none opacity-30">
              <svg viewBox="0 0 100 100">
                <path d="M0,50 Q0,0 50,0 L50,10 Q10,10 10,50 Z" fill="currentColor" />
                <circle cx="15" cy="15" r="3" fill="currentColor" />
              </svg>
            </div>
            <div className="absolute top-4 right-4 w-16 h-16 pointer-events-none opacity-30 rotate-90">
              <svg viewBox="0 0 100 100">
                <path d="M0,50 Q0,0 50,0 L50,10 Q10,10 10,50 Z" fill="currentColor" />
                <circle cx="15" cy="15" r="3" fill="currentColor" />
              </svg>
            </div>
            <div className="absolute bottom-4 left-4 w-16 h-16 pointer-events-none opacity-30 -rotate-90">
              <svg viewBox="0 0 100 100">
                <path d="M0,50 Q0,0 50,0 L50,10 Q10,10 10,50 Z" fill="currentColor" />
                <circle cx="15" cy="15" r="3" fill="currentColor" />
              </svg>
            </div>
            <div className="absolute bottom-4 right-4 w-16 h-16 pointer-events-none opacity-30 rotate-180">
              <svg viewBox="0 0 100 100">
                <path d="M0,50 Q0,0 50,0 L50,10 Q10,10 10,50 Z" fill="currentColor" />
                <circle cx="15" cy="15" r="3" fill="currentColor" />
              </svg>
            </div>

            {/* Radial Media Menu for Canvas */}
            <RadialMediaMenu
              isOpen={menuOpen}
              onClose={closeMenu}
              anchorPosition={menuPosition}
              anchorMode="cursor"
              theme={theme}
              isMobile={isTouch}
              onMediaCaptured={(asset) => {
                // Handle media capture by creating canvas shapes
                if (asset.type === 'audio') {
                  handleVoiceRecording(asset.blob, asset.path, asset.filename)
                } else if (asset.type === 'photo') {
                  handlePhotoCapture(asset.blob, asset.path, asset.filename)
                } else if (asset.type === 'upload' || asset.type === 'drawing') {
                  handleFileUpload(asset.blob, asset.path, asset.filename)
                }
              }}
            />

            {/* Handwriting Upload Modal */}
            {handwritingUpload && (
              <HandwritingUploadModal
                isOpen={handwritingModalOpen}
                onClose={() => {
                  setHandwritingModalOpen(false)
                  setHandwritingUpload(null)
                  closeMenu()
                }}
                imageBlob={handwritingUpload.blob}
                imagePath={handwritingUpload.path}
                filename={handwritingUpload.filename}
                dimensions={handwritingUpload.dimensions}
                position={menuPosition || { x: 0, y: 0 }}
                editor={editor}
                detectionConfidence={handwritingUpload.detectionConfidence}
                isDark={isDark}
              />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
