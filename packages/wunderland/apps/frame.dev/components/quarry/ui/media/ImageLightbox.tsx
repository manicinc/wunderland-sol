/**
 * Image Lightbox - Full-screen image viewer
 * @module codex/ui/ImageLightbox
 *
 * @remarks
 * Museum-quality image viewing with:
 * - Zoom and pan controls
 * - Keyboard navigation
 * - EXIF metadata display
 * - Pinch-to-zoom on mobile
 * - Smooth transitions
 * - Gallery mode for multiple images
 *
 * NOTE: framer-motion removed to fix React #311 hydration errors
 */

'use client'

// Force runtime require to prevent webpack from optimizing hooks through framer-motion
import React, { useState as useStateType, useEffect as useEffectType, useCallback as useCallbackType, useRef as useRefType } from 'react'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReactRuntime = typeof window !== 'undefined' ? require('react') : React
const useState = ReactRuntime.useState as typeof useStateType
const useEffect = ReactRuntime.useEffect as typeof useEffectType
const useCallback = ReactRuntime.useCallback as typeof useCallbackType
const useRef = ReactRuntime.useRef as typeof useRefType
import {
  X, ZoomIn, ZoomOut, RotateCw, Download, ChevronLeft,
  ChevronRight, Maximize2, Info, Calendar, Camera, MapPin,
  Aperture, Image as ImageIcon, Sparkles, Loader2
} from 'lucide-react'
import { analyzeImage, isVisionAvailable, type VisionAnalysisResult } from '@/lib/ai/vision'
import { Z_INDEX } from '../../constants'

interface ImageMetadata {
  filename: string
  url: string
  alt?: string
  width?: number
  height?: number
  size?: number
  exif?: {
    camera?: string
    lens?: string
    iso?: number
    aperture?: string
    shutterSpeed?: string
    focalLength?: string
    dateTaken?: string
    location?: { lat: number; lng: number; name?: string }
  }
}

interface ImageLightboxProps {
  /** Whether lightbox is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Images to display */
  images: ImageMetadata[]
  /** Initial image index */
  initialIndex?: number
  /** Theme */
  theme?: string
}

/**
 * Full-screen image lightbox with zoom and metadata
 */
export default function ImageLightbox({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  theme = 'light',
}: ImageLightboxProps) {
  const [mounted, setMounted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [showInfo, setShowInfo] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [aiAnalysis, setAiAnalysis] = useState<VisionAnalysisResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const imageRef = useRef<HTMLDivElement>(null)
  const hideControlsTimeout = useRef<NodeJS.Timeout>()

  // Ensure mounted before rendering
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')
  const safeImages = images ?? []
  const imagesLength = safeImages.length
  const currentImage = safeImages[currentIndex]
  const hasMultiple = imagesLength > 1
  const visionAvailable = isVisionAvailable()
  
  /**
   * Analyze current image with AI
   */
  const handleAnalyzeImage = useCallback(async () => {
    if (!currentImage || aiLoading || !visionAvailable) return
    
    setAiLoading(true)
    setShowAiPanel(true)
    
    try {
      const result = await analyzeImage(currentImage.url)
      setAiAnalysis(result)
    } catch (error) {
      console.error('Failed to analyze image:', error)
    } finally {
      setAiLoading(false)
    }
  }, [currentImage, aiLoading, visionAvailable])
  
  // Reset AI analysis when image changes
  useEffect(() => {
    setAiAnalysis(null)
    setShowAiPanel(false)
  }, [currentIndex])

  /**
   * Navigate to previous image
   */
  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => prev === 0 ? imagesLength - 1 : prev - 1)
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [imagesLength])

  /**
   * Navigate to next image
   */
  const handleNext = useCallback(() => {
    setCurrentIndex(prev => prev === imagesLength - 1 ? 0 : prev + 1)
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [imagesLength])

  /**
   * Zoom in
   */
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.5, 5))
  }, [])

  /**
   * Zoom out
   */
  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.5, 0.5))
  }, [])

  /**
   * Reset zoom and position
   */
  const handleReset = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  /**
   * Download current image
   */
  const handleDownload = useCallback(() => {
    const link = document.createElement('a')
    link.href = currentImage.url
    link.download = currentImage.filename
    link.click()
  }, [currentImage])

  /**
   * Keyboard navigation
   */
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (hasMultiple) handlePrevious()
          break
        case 'ArrowRight':
          if (hasMultiple) handleNext()
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
        case '_':
          handleZoomOut()
          break
        case '0':
          handleReset()
          break
        case 'i':
          setShowInfo(prev => !prev)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, hasMultiple, handlePrevious, handleNext, handleZoomIn, handleZoomOut, handleReset, onClose])

  /**
   * Auto-hide controls after inactivity
   */
  const resetHideControlsTimer = useCallback(() => {
    setShowControls(true)
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current)
    }
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }, [])

  useEffect(() => {
    if (isOpen) {
      resetHideControlsTimer()
    }
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current)
      }
    }
  }, [isOpen, resetHideControlsTimer])

  /**
   * Handle drag to pan (native implementation)
   */
  const dragStart = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return
    isDragging.current = true
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }, [scale, position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scale <= 1) return
    isDragging.current = true
    const touch = e.touches[0]
    dragStart.current = { x: touch.clientX - position.x, y: touch.clientY - position.y }
  }, [scale, position])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return
    const touch = e.touches[0]
    setPosition({
      x: touch.clientX - dragStart.current.x,
      y: touch.clientY - dragStart.current.y,
    })
  }, [])

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false
  }, [])

  // Don't render until mounted or if not open
  if (!mounted || !isOpen || !currentImage) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center animate-in fade-in duration-200"
      style={{ zIndex: Z_INDEX.LIGHTBOX }}
      onMouseMove={resetHideControlsTimer}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Main Image */}
      <div
        ref={imageRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`
          relative max-w-[90vw] max-h-[90vh] transition-transform duration-200
          ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
          animate-in fade-in zoom-in-95 duration-300
        `}
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          transformOrigin: 'center',
        }}
      >
        <img
          src={currentImage.url}
          alt={currentImage.alt || currentImage.filename}
          className="w-full h-full object-contain select-none"
          draggable={false}
        />
      </div>

      {/* Top Controls */}
      {showControls && (
        <div
          className={`
            absolute top-0 left-0 right-0 px-6 py-4
            bg-gradient-to-b from-black/80 to-transparent
            flex items-center justify-between
            animate-in fade-in slide-in-from-top-2 duration-200
            ${isTerminal ? 'terminal-header' : ''}
          `}
        >
          {/* Image Info */}
          <div className="flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-white" />
            <div className="text-white">
              <h3 className="font-semibold text-sm">
                {currentImage.alt || currentImage.filename}
              </h3>
              {hasMultiple && (
                <p className="text-xs opacity-70">
                  {currentIndex + 1} / {images.length}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* AI Analyze Button */}
            {visionAvailable && (
              <button
                onClick={handleAnalyzeImage}
                disabled={aiLoading}
                className={`
                  p-2 rounded-lg transition-colors flex items-center gap-1.5
                  ${showAiPanel ? 'bg-cyan-500/30' : 'hover:bg-white/10'}
                  ${aiLoading ? 'opacity-70 cursor-wait' : ''}
                `}
                title="Analyze with AI"
              >
                {aiLoading ? (
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                )}
                <span className="text-xs text-white/90 hidden sm:inline">Analyze</span>
              </button>
            )}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`
                p-2 rounded-lg transition-colors
                ${showInfo ? 'bg-white/20' : 'hover:bg-white/10'}
              `}
              title="Toggle info (i)"
            >
              <Info className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}
      
      {/* AI Analysis Panel */}
      {showAiPanel && (
        <div
          className={`
            absolute right-0 top-16 bottom-24 w-80 m-4
            bg-black/90 backdrop-blur-lg rounded-xl border border-white/10
            flex flex-col overflow-hidden
            animate-in slide-in-from-right-4 fade-in duration-300
          `}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-white">AI Analysis</span>
            </div>
            <button
              onClick={() => setShowAiPanel(false)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
          
          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-sm text-white/70">Analyzing image...</p>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-4">
                {/* Image Type */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/50">Type</span>
                  <p className="text-sm text-white capitalize">{aiAnalysis.imageType}</p>
                </div>
                
                {/* Description */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/50">Description</span>
                  <p className="text-sm text-white/90 leading-relaxed">{aiAnalysis.description}</p>
                </div>
                
                {/* Elements */}
                {aiAnalysis.elements && aiAnalysis.elements.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-white/50">Key Elements</span>
                    <ul className="mt-1 space-y-1">
                      {aiAnalysis.elements.map((el, i) => (
                        <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                          <span className="text-cyan-400 mt-1">•</span>
                          {el}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Structure (for diagrams) */}
                {aiAnalysis.structure && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-white/50">Structure</span>
                    <p className="text-sm text-white/80">{aiAnalysis.structure.type}</p>
                    {aiAnalysis.structure.nodes && (
                      <p className="text-xs text-white/60 mt-1">
                        {aiAnalysis.structure.nodes.length} nodes identified
                      </p>
                    )}
                  </div>
                )}
                
                {/* Confidence & Latency */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40">
                  <span>Confidence: {Math.round(aiAnalysis.confidence * 100)}%</span>
                  <span>{aiAnalysis.latency}ms</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                <Sparkles className="w-6 h-6 text-white/30" />
                <p className="text-sm text-white/50">Click Analyze to get AI insights about this image</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Arrows */}
      {hasMultiple && showControls && (
        <>
          <button
            onClick={handlePrevious}
            className={`
              absolute left-4 top-1/2 -translate-y-1/2
              p-4 rounded-full bg-black/50 hover:bg-black/70
              backdrop-blur-sm transition-all duration-200
              animate-in fade-in slide-in-from-left-2
              ${isTerminal ? 'border-2 border-cyan-500' : ''}
            `}
            title="Previous (←)"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>

          <button
            onClick={handleNext}
            className={`
              absolute right-4 top-1/2 -translate-y-1/2
              p-4 rounded-full bg-black/50 hover:bg-black/70
              backdrop-blur-sm transition-all duration-200
              animate-in fade-in slide-in-from-right-2
              ${isTerminal ? 'border-2 border-cyan-500' : ''}
            `}
            title="Next (→)"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        </>
      )}

      {/* Bottom Zoom Controls */}
      {showControls && (
        <div
          className={`
            absolute bottom-6 left-1/2 -translate-x-1/2
            px-4 py-3 rounded-full bg-black/80 backdrop-blur-sm
            flex items-center gap-2
            animate-in fade-in slide-in-from-bottom-2 duration-200
            ${isTerminal ? 'border-2 border-cyan-500' : ''}
          `}
        >
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Zoom out (-)"
          >
            <ZoomOut className="w-4 h-4 text-white" />
          </button>

          <div className="px-3 text-white text-sm font-mono min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </div>

          <button
            onClick={handleZoomIn}
            disabled={scale >= 5}
            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Zoom in (+)"
          >
            <ZoomIn className="w-4 h-4 text-white" />
          </button>

          <div className="w-px h-6 bg-white/20 mx-1" />

          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Reset (0)"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* EXIF Info Panel */}
      {showInfo && currentImage.exif && (
        <div
          className={`
            absolute right-6 top-20 bottom-6
            w-80 rounded-xl overflow-hidden
            bg-black/90 backdrop-blur-md
            animate-in fade-in slide-in-from-right-4 duration-200
            ${isTerminal ? 'border-2 border-cyan-500' : ''}
          `}
        >
          {/* EXIF Header */}
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Image Information
            </h3>
          </div>

          {/* EXIF Data */}
          <div className="p-4 space-y-4 overflow-y-auto h-full">
            {/* Camera */}
            {currentImage.exif.camera && (
              <div>
                <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
                  <Camera className="w-3 h-3" />
                  <span>Camera</span>
                </div>
                <p className="text-white text-sm">{currentImage.exif.camera}</p>
              </div>
            )}

            {/* Lens */}
            {currentImage.exif.lens && (
              <div>
                <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
                  <Aperture className="w-3 h-3" />
                  <span>Lens</span>
                </div>
                <p className="text-white text-sm">{currentImage.exif.lens}</p>
              </div>
            )}

            {/* Settings */}
            <div className="grid grid-cols-2 gap-3">
              {currentImage.exif.iso && (
                <div>
                  <div className="text-xs text-white/50 mb-1">ISO</div>
                  <p className="text-white text-sm font-mono">{currentImage.exif.iso}</p>
                </div>
              )}
              {currentImage.exif.aperture && (
                <div>
                  <div className="text-xs text-white/50 mb-1">Aperture</div>
                  <p className="text-white text-sm font-mono">f/{currentImage.exif.aperture}</p>
                </div>
              )}
              {currentImage.exif.shutterSpeed && (
                <div>
                  <div className="text-xs text-white/50 mb-1">Shutter</div>
                  <p className="text-white text-sm font-mono">{currentImage.exif.shutterSpeed}</p>
                </div>
              )}
              {currentImage.exif.focalLength && (
                <div>
                  <div className="text-xs text-white/50 mb-1">Focal</div>
                  <p className="text-white text-sm font-mono">{currentImage.exif.focalLength}</p>
                </div>
              )}
            </div>

            {/* Date */}
            {currentImage.exif.dateTaken && (
              <div>
                <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
                  <Calendar className="w-3 h-3" />
                  <span>Date Taken</span>
                </div>
                <p className="text-white text-sm">
                  {new Date(currentImage.exif.dateTaken).toLocaleString()}
                </p>
              </div>
            )}

            {/* Location */}
            {currentImage.exif.location && (
              <div>
                <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
                  <MapPin className="w-3 h-3" />
                  <span>Location</span>
                </div>
                <p className="text-white text-sm">
                  {currentImage.exif.location.name ||
                    `${currentImage.exif.location.lat.toFixed(4)}, ${currentImage.exif.location.lng.toFixed(4)}`}
                </p>
              </div>
            )}

            {/* File Info */}
            <div className="pt-4 border-t border-white/10">
              <div className="text-xs text-white/50 mb-2">File Details</div>
              <div className="space-y-1 text-sm text-white/70">
                <p>Name: {currentImage.filename}</p>
                {currentImage.width && currentImage.height && (
                  <p>
                    Size: {currentImage.width} × {currentImage.height}px
                  </p>
                )}
                {currentImage.size && <p>File: {(currentImage.size / 1024).toFixed(1)} KB</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thumbnail Strip (for galleries) */}
      {hasMultiple && showControls && (
        <div
          className={`
            absolute bottom-20 left-1/2 -translate-x-1/2
            flex items-center gap-2 px-4 py-3 rounded-full
            bg-black/80 backdrop-blur-sm
            max-w-[80vw] overflow-x-auto
            animate-in fade-in slide-in-from-bottom-4 duration-300
            ${isTerminal ? 'border-2 border-cyan-500' : ''}
          `}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx)
                setScale(1)
                setPosition({ x: 0, y: 0 })
              }}
              className={`
                relative w-16 h-16 rounded-lg overflow-hidden
                transition-all shrink-0
                ${idx === currentIndex ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'}
              `}
            >
              <img
                src={img.url}
                alt={img.alt || `Image ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Keyboard Hints */}
      {showControls && (
        <div
          className={`
            absolute top-20 left-6 px-4 py-3 rounded-lg
            bg-black/60 backdrop-blur-sm text-xs text-white/70
            space-y-1
            animate-in fade-in duration-300
            ${isTerminal ? 'border border-cyan-500/50 font-mono' : ''}
          `}
        >
          <div>
            <kbd className="px-1 py-0.5 bg-white/10 rounded">Esc</kbd> Close
          </div>
          <div>
            <kbd className="px-1 py-0.5 bg-white/10 rounded">←</kbd>{' '}
            <kbd className="px-1 py-0.5 bg-white/10 rounded">→</kbd> Navigate
          </div>
          <div>
            <kbd className="px-1 py-0.5 bg-white/10 rounded">+</kbd>{' '}
            <kbd className="px-1 py-0.5 bg-white/10 rounded">-</kbd> Zoom
          </div>
          <div>
            <kbd className="px-1 py-0.5 bg-white/10 rounded">0</kbd> Reset
          </div>
          <div>
            <kbd className="px-1 py-0.5 bg-white/10 rounded">i</kbd> Info
          </div>
        </div>
      )}
    </div>
  )
}
