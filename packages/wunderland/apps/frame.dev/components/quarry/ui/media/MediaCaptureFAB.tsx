/**
 * Media Capture Floating Action Button
 * @module codex/ui/MediaCaptureFAB
 *
 * @remarks
 * Floating button that opens the RadialMediaMenu for quick media capture.
 * Now supports cursor position awareness for inline menu placement.
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { ThemeName } from '@/types/theme'
import type { MediaAsset } from '../misc/RadialMediaMenu'

// Dynamic import to avoid TDZ issues
const RadialMediaMenu = dynamic(() => import('../misc/RadialMediaMenu'), { ssr: false })

interface MediaCaptureFABProps {
  /** Current theme */
  theme?: ThemeName
  /** Cursor position from editor (for menu anchoring) */
  cursorPosition?: { x: number; y: number } | null
  /** Prefer cursor position over FAB position */
  preferCursorAnchor?: boolean
  /** Insert markdown at cursor position */
  onInsertAtCursor?: (markdown: string) => void
  /** Legacy: Callback when image is inserted */
  onInsertImage?: (url: string) => void
  /** Legacy: Callback when audio is inserted */
  onInsertAudio?: (url: string) => void
  /** Legacy: Callback when drawing is inserted */
  onInsertDrawing?: (url: string) => void
  /** Legacy: Callback when code block is inserted */
  onInsertCode?: (language: string) => void
  /** Callback when media is captured (for storage) */
  onMediaCaptured?: (asset: MediaAsset) => void
  /** Current strand path */
  strandPath?: string
  /** Custom position (default: bottom-right) */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /** Whether to show the FAB */
  visible?: boolean
  /** Mobile mode */
  isMobile?: boolean
}

/**
 * Floating action button for media capture
 * Opens the radial media menu with options for voice, camera, draw, etc.
 */
export default function MediaCaptureFAB({
  theme = 'light',
  cursorPosition,
  preferCursorAnchor = true,
  onInsertAtCursor,
  onInsertImage,
  onInsertAudio,
  onInsertDrawing,
  onInsertCode,
  onMediaCaptured,
  strandPath = '',
  position = 'bottom-right',
  visible = true,
  isMobile = false,
}: MediaCaptureFABProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [fabPosition, setFabPosition] = useState<{ x: number; y: number } | null>(null)

  const fabRef = useRef<HTMLButtonElement>(null)

  const isDark = theme?.includes('dark')
  const isTerminal = theme?.includes('terminal')

  // Get FAB element position for menu anchoring
  const updateFabPosition = useCallback(() => {
    if (fabRef.current) {
      const rect = fabRef.current.getBoundingClientRect()
      setFabPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      })
    }
  }, [])

  // Update FAB position on mount and resize
  useEffect(() => {
    updateFabPosition()
    window.addEventListener('resize', updateFabPosition)
    return () => window.removeEventListener('resize', updateFabPosition)
  }, [updateFabPosition])

  // Determine anchor position for menu
  const getAnchorPosition = useCallback(() => {
    if (preferCursorAnchor && cursorPosition) {
      return cursorPosition
    }
    return fabPosition
  }, [preferCursorAnchor, cursorPosition, fabPosition])

  // Determine anchor mode
  const getAnchorMode = useCallback((): 'cursor' | 'fab' | 'center' => {
    if (preferCursorAnchor && cursorPosition) {
      return 'cursor'
    }
    if (fabPosition) {
      return 'fab'
    }
    return 'center'
  }, [preferCursorAnchor, cursorPosition, fabPosition])

  if (!visible) return null

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-20 right-6',
    'bottom-left': 'bottom-20 left-6',
    'top-right': 'top-20 right-6',
    'top-left': 'top-20 left-6',
  }

  // Tooltip position based on FAB position
  const tooltipClasses = {
    'bottom-right': 'bottom-[112px] right-6',
    'bottom-left': 'bottom-[112px] left-6',
    'top-right': 'top-[88px] right-6',
    'top-left': 'top-[88px] left-6',
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        ref={fabRef}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          updateFabPosition()
          setIsMenuOpen(true)
        }}
        className={`
          fixed ${positionClasses[position]} z-50
          w-12 h-12 rounded-full
          flex items-center justify-center
          shadow-lg hover:shadow-xl
          transition-all duration-300
          backdrop-blur-sm
          ${isTerminal
            ? isDark
              ? 'bg-green-600/60 hover:bg-green-500/70 text-black'
              : 'bg-amber-500/60 hover:bg-amber-400/70 text-black'
            : isDark
            ? 'bg-gradient-to-br from-cyan-600/60 to-emerald-600/60 hover:from-cyan-500/70 hover:to-emerald-500/70 text-white'
            : 'bg-gradient-to-br from-cyan-500/60 to-emerald-500/60 hover:from-cyan-400/70 hover:to-emerald-400/70 text-white'
          }
        `}
        title="Add media (voice, photo, drawing...)"
        aria-label="Open media capture menu"
      >
        {/* Animated Icon */}
        <motion.div
          animate={{ rotate: isHovered || isMenuOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
        </motion.div>

        {/* Decorative Ring - pulsing animation */}
        <motion.div
          className={`
            absolute inset-0 rounded-full border-2
            ${isTerminal
              ? isDark ? 'border-green-400/40' : 'border-amber-400/40'
              : 'border-white/20'
            }
          `}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.button>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {isHovered && !isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`
              fixed ${tooltipClasses[position]}
              z-50 px-3 py-1.5 rounded-lg text-xs font-medium
              whitespace-nowrap shadow-lg pointer-events-none
              ${isDark
                ? 'bg-zinc-800 text-zinc-200'
                : 'bg-zinc-900 text-white'
              }
            `}
          >
            {cursorPosition ? 'Insert at cursor' : 'Add media'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Radial Media Menu */}
      <RadialMediaMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        anchorPosition={getAnchorPosition()}
        anchorMode={getAnchorMode()}
        onInsertAtCursor={onInsertAtCursor}
        onInsertImage={onInsertImage}
        onInsertAudio={onInsertAudio}
        onInsertDrawing={onInsertDrawing}
        onInsertCode={onInsertCode}
        onMediaCaptured={onMediaCaptured}
        strandPath={strandPath}
        theme={theme}
        isMobile={isMobile}
      />
    </>
  )
}
