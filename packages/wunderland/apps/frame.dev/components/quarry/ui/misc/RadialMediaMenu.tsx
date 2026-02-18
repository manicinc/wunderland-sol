/**
 * Radial Media Menu - Inline circular media picker
 * @module codex/ui/RadialMediaMenu
 *
 * Redesigned for:
 * - Cursor-anchored positioning (not center screen)
 * - Glass effect styling (no dark backdrop)
 * - Mobile-optimized touch targets
 * - Full feature implementation
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image, Mic, Camera, PenTool } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { ThemeName } from '@/types/theme'

// Dynamic imports to avoid TDZ issues with heavy components
const VoiceRecorder = dynamic(() => import('../media/VoiceRecorder'), { ssr: false })
const CameraCapture = dynamic(() => import('../media/CameraCapture'), { ssr: false })
const WhiteboardCanvas = dynamic(() => import('../canvas/WhiteboardCanvas'), { ssr: false })

/** Media asset for capture callback */
export interface MediaAsset {
  type: 'photo' | 'audio' | 'drawing' | 'upload'
  blob: Blob
  filename: string
  path: string
  /** Transcription for audio (from speech recognition) */
  transcript?: string
  /** Duration in seconds for audio/video */
  duration?: number
}

interface RadialMediaMenuProps {
  /** Whether menu is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Anchor position for menu placement */
  anchorPosition?: { x: number; y: number } | null
  /** Anchor mode determines fallback behavior */
  anchorMode?: 'cursor' | 'fab' | 'center'
  /** Insert markdown at cursor position */
  onInsertAtCursor?: (markdown: string) => void
  /** Legacy: Insert image callback */
  onInsertImage?: (url: string) => void
  /** Legacy: Insert audio callback */
  onInsertAudio?: (url: string) => void
  /** Legacy: Insert drawing callback */
  onInsertDrawing?: (url: string) => void
  /** Legacy: Insert code callback */
  onInsertCode?: (language: string) => void
  /** Media captured callback with blob */
  onMediaCaptured?: (asset: MediaAsset) => void
  /** Current strand path for asset organization */
  strandPath?: string
  /** Current theme */
  theme?: ThemeName
  /** Mobile mode - smaller radius, larger targets */
  isMobile?: boolean
}

interface MenuOption {
  id: string
  label: string
  icon: React.ElementType
  color: string
  hoverColor: string
  angle: number
  action: () => void
  hasSubmenu?: boolean
}

/**
 * Circular radial menu for media insertion
 *
 * @remarks
 * - Inline glass-effect positioning at cursor/anchor
 * - Animated radial layout with 4 rich media options
 * - Touch-friendly 56px mobile targets
 * - Image, Voice, Camera, Canvas insertion
 */
export default function RadialMediaMenu({
  isOpen,
  onClose,
  anchorPosition,
  anchorMode = 'center',
  onInsertAtCursor,
  onInsertImage,
  onInsertAudio,
  onInsertDrawing,
  onInsertCode,
  onMediaCaptured,
  strandPath = '',
  theme = 'light',
  isMobile = false,
}: RadialMediaMenuProps) {
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [whiteboardOpen, setWhiteboardOpen] = useState(false)
  const [highlightedOption, setHighlightedOption] = useState<string | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0) // For keyboard navigation

  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  // Radii for desktop and mobile
  const radius = isMobile ? 70 : 90
  const buttonSize = isMobile ? 56 : 52
  const centerSize = isMobile ? 52 : 48

  // Helper to insert content
  const insert = useCallback((markdown: string) => {
    if (onInsertAtCursor) {
      onInsertAtCursor(markdown)
    }
    onClose()
  }, [onInsertAtCursor, onClose])

  // Handle file picker for images
  const handleImagePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `upload-${timestamp}.${ext}`
    const path = `assets/images/${filename}`

    // Insert markdown
    if (onInsertAtCursor) {
      onInsertAtCursor(`![${file.name}](./${path})`)
    } else if (onInsertImage) {
      onInsertImage(`./${path}`)
    }

    // Track blob for upload
    if (onMediaCaptured) {
      onMediaCaptured({
        type: 'upload',
        blob: file,
        filename,
        path,
      })
    }

    onClose()
  }, [onInsertAtCursor, onInsertImage, onMediaCaptured, onClose])

  // Menu options - streamlined to only rich media (4 options at 90° apart)
  const options: MenuOption[] = [
    {
      id: 'image',
      label: 'Image',
      icon: Image,
      color: isDark ? 'from-emerald-600 to-cyan-600' : 'from-emerald-500 to-cyan-500',
      hoverColor: isDark ? 'from-emerald-500 to-cyan-500' : 'from-emerald-400 to-cyan-400',
      angle: 0,
      action: handleImagePicker,
    },
    {
      id: 'voice',
      label: 'Voice',
      icon: Mic,
      color: isDark ? 'from-red-600 to-pink-600' : 'from-red-500 to-pink-500',
      hoverColor: isDark ? 'from-red-500 to-pink-500' : 'from-red-400 to-pink-400',
      angle: 90,
      action: () => setVoiceRecorderOpen(true),
    },
    {
      id: 'camera',
      label: 'Camera',
      icon: Camera,
      color: isDark ? 'from-blue-600 to-indigo-600' : 'from-blue-500 to-indigo-500',
      hoverColor: isDark ? 'from-blue-500 to-indigo-500' : 'from-blue-400 to-indigo-400',
      angle: 180,
      action: () => setCameraOpen(true),
    },
    {
      id: 'canvas',
      label: 'Canvas',
      icon: PenTool,
      color: isDark ? 'from-purple-600 to-pink-600' : 'from-purple-500 to-pink-500',
      hoverColor: isDark ? 'from-purple-500 to-pink-500' : 'from-purple-400 to-pink-400',
      angle: 270,
      action: () => setWhiteboardOpen(true),
    },
  ]

  // Calculate menu position with viewport bounds
  const getMenuPosition = useCallback(() => {
    if (!anchorPosition) {
      return { x: '50%', y: '50%', transform: 'translate(-50%, -50%)' }
    }

    const padding = 20
    const menuSize = (radius + buttonSize) * 2

    // Clamp to viewport
    const x = Math.max(
      padding + menuSize / 2,
      Math.min(window.innerWidth - padding - menuSize / 2, anchorPosition.x)
    )
    const y = Math.max(
      padding + menuSize / 2,
      Math.min(window.innerHeight - padding - menuSize / 2, anchorPosition.y)
    )

    return { x: `${x}px`, y: `${y}px`, transform: 'translate(-50%, -50%)' }
  }, [anchorPosition, radius, buttonSize])

  const menuPosition = getMenuPosition()

  // Reset state when menu closes
  useEffect(() => {
    if (!isOpen) {
      setHighlightedOption(null)
    }
  }, [isOpen])

  // Keyboard navigation for accessibility
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex(prev => (prev + 1) % options.length)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex(prev => (prev - 1 + options.length) % options.length)
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          options[focusedIndex]?.action()
          break
        case 'Tab':
          // Trap focus within menu
          e.preventDefault()
          setFocusedIndex(prev => (e.shiftKey ? (prev - 1 + options.length) % options.length : (prev + 1) % options.length))
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, focusedIndex, options])

  // Focus the current button when focusedIndex changes
  useEffect(() => {
    if (isOpen && buttonRefs.current[focusedIndex]) {
      buttonRefs.current[focusedIndex]?.focus()
    }
  }, [focusedIndex, isOpen])

  // Reset focus when menu opens
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0)
    }
  }, [isOpen])

  // Handle touch gestures for mobile
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !menuRef.current) return

    const touch = e.touches[0]
    const rect = menuRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const angle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX)
    const degrees = ((angle * 180) / Math.PI + 360) % 360

    // Find closest option
    const closest = options.reduce((prev, curr) => {
      const prevDiff = Math.abs(((prev.angle - degrees + 180 + 360) % 360) - 180)
      const currDiff = Math.abs(((curr.angle - degrees + 180 + 360) % 360) - 180)
      return currDiff < prevDiff ? curr : prev
    })

    setHighlightedOption(closest.id)
  }, [isMobile, options])

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !highlightedOption) return

    const option = options.find(o => o.id === highlightedOption)
    if (option) {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10)
      }
      option.action()
    }
    setHighlightedOption(null)
  }, [isMobile, highlightedOption, options])

  // Glass effect classes
  const glassClasses = isDark
    ? 'bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50'
    : 'bg-white/90 backdrop-blur-xl border border-zinc-200/50'

  const terminalClasses = isTerminal
    ? isDark
      ? 'bg-black/95 border-green-500/30'
      : 'bg-zinc-900/95 border-amber-500/30'
    : ''

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Invisible click-outside layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[199]"
              onClick={onClose}
            />

            {/* Menu container */}
            <motion.div
              ref={menuRef}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed z-[200] pointer-events-auto"
              style={{
                left: menuPosition.x,
                top: menuPosition.y,
                transform: menuPosition.transform,
              }}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              role="menu"
              aria-label="Media insertion menu"
            >
              {/* Center Close Button */}
              <motion.button
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ type: 'spring', damping: 15, delay: 0.05 }}
                onClick={onClose}
                aria-label="Close media menu"
                className={`
                  absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                  rounded-full shadow-2xl
                  flex items-center justify-center touch-manipulation
                  ${glassClasses} ${terminalClasses}
                  ring-1 ring-black/5
                  hover:scale-105 active:scale-95
                  transition-transform duration-150
                `}
                style={{ width: centerSize, height: centerSize }}
              >
                <X
                  className={`w-5 h-5 ${
                    isTerminal
                      ? isDark ? 'text-green-400' : 'text-amber-500'
                      : isDark ? 'text-zinc-300' : 'text-zinc-600'
                  }`}
                />
              </motion.button>

              {/* Radial Options */}
              {options.map((option, index) => {
                const angleRad = (option.angle * Math.PI) / 180
                const x = Math.cos(angleRad) * radius
                const y = Math.sin(angleRad) * radius
                const isHighlighted = highlightedOption === option.id
                const isFocused = focusedIndex === index

                return (
                  <motion.button
                    key={option.id}
                    ref={(el) => { buttonRefs.current[index] = el }}
                    initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                    animate={{
                      scale: isHighlighted || isFocused ? 1.15 : 1,
                      x,
                      y,
                      opacity: 1,
                    }}
                    exit={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      damping: 14,
                      stiffness: 200,
                      delay: index * 0.025,
                    }}
                    onClick={option.action}
                    role="menuitem"
                    aria-label={`Insert ${option.label}`}
                    tabIndex={isFocused ? 0 : -1}
                    className={`
                      absolute left-1/2 top-1/2
                      rounded-2xl shadow-lg touch-manipulation
                      flex flex-col items-center justify-center gap-0.5
                      bg-gradient-to-br ${isHighlighted || isFocused ? option.hoverColor : option.color}
                      hover:shadow-xl active:scale-95
                      transition-all duration-150
                      text-white
                      focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent
                      ${option.hasSubmenu ? 'ring-2 ring-white/20' : ''}
                    `}
                    style={{
                      width: buttonSize,
                      height: buttonSize,
                      marginLeft: -buttonSize / 2,
                      marginTop: -buttonSize / 2,
                    }}
                    title={option.label}
                  >
                    <option.icon className={isMobile ? 'w-6 h-6' : 'w-5 h-5'} aria-hidden="true" />
                    <span className="text-[10px] font-medium opacity-90">{option.label}</span>
                  </motion.button>
                )
              })}

              {/* Subtle decorative ring */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              >
                <div
                  className={`
                    rounded-full border
                    ${isDark ? 'border-zinc-700/30' : 'border-zinc-300/30'}
                  `}
                  style={{
                    width: radius * 2 + 20,
                    height: radius * 2 + 20,
                  }}
                />
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hidden file input for image picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
        aria-label="Select image file"
      />

      {/* Voice Recorder Modal */}
      <VoiceRecorder
        isOpen={voiceRecorderOpen}
        onClose={() => setVoiceRecorderOpen(false)}
        onRecordingComplete={(blob, transcript, duration) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const filename = `voice-${timestamp}.webm`
          const path = `assets/audio/${filename}`

          if (onInsertAtCursor) {
            onInsertAtCursor(`\n<audio controls src="./${path}"></audio>\n`)
          } else if (onInsertAudio) {
            onInsertAudio(`./${path}`)
          }

          if (onMediaCaptured) {
            onMediaCaptured({ type: 'audio', blob, filename, path, transcript, duration })
          }

          onClose()
        }}
        theme={theme}
      />

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCaptureComplete={(blob) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const filename = `photo-${timestamp}.jpg`
          const path = `assets/photos/${filename}`

          if (onInsertAtCursor) {
            onInsertAtCursor(`\n![Photo](./${path})\n`)
          } else if (onInsertImage) {
            onInsertImage(`./${path}`)
          }

          if (onMediaCaptured) {
            onMediaCaptured({ type: 'photo', blob, filename, path })
          }

          onClose()
        }}
        theme={theme}
      />

      {/* Whiteboard Canvas Modal */}
      <WhiteboardCanvas
        isOpen={whiteboardOpen}
        onClose={() => setWhiteboardOpen(false)}
        onSave={(svgContent, pngBlob) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const filename = `drawing-${timestamp}.svg`
          const path = `assets/drawings/${filename}`

          if (onInsertAtCursor) {
            onInsertAtCursor(`\n![Drawing](./${path})\n`)
          } else if (onInsertDrawing) {
            onInsertDrawing(`./${path}`)
          }

          if (onMediaCaptured) {
            const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' })
            onMediaCaptured({ type: 'drawing', blob: svgBlob, filename, path })
          }

          onClose()
        }}
        theme={theme}
      />
    </>
  )
}
