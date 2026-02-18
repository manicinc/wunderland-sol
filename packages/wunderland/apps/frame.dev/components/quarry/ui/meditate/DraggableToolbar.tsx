'use client'

/**
 * DraggableToolbar - Wrapper for making toolbars draggable
 * @module components/quarry/ui/meditate/DraggableToolbar
 *
 * Features:
 * - Drag to reposition
 * - Snap to screen edges
 * - Position persistence in localStorage
 * - Compact mode when docked to edge
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, useDragControls, PanInfo } from 'framer-motion'
import { GripHorizontal, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export type ToolbarPosition = 'bottom-center' | 'top-center' | 'left' | 'right' | 'custom'

export interface ToolbarPositionState {
  position: ToolbarPosition
  customX?: number
  customY?: number
}

export interface DraggableToolbarProps {
  /** Unique ID for position persistence */
  id: string
  /** Children to render inside the toolbar */
  children: React.ReactNode
  /** Default position */
  defaultPosition?: ToolbarPosition
  /** Enable snapping to screen edges */
  snapToEdges?: boolean
  /** Snap threshold in pixels */
  snapThreshold?: number
  /** Whether toolbar is currently hidden */
  isHidden?: boolean
  /** Dark mode */
  isDark?: boolean
  /** Additional class name */
  className?: string
  /** Callback when position changes */
  onPositionChange?: (position: ToolbarPositionState) => void
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY_PREFIX = 'toolbar-position-'

function loadPosition(id: string): ToolbarPositionState | null {
  if (typeof localStorage === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + id)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore
  }
  return null
}

function savePosition(id: string, position: ToolbarPositionState): void {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + id, JSON.stringify(position))
  } catch {
    // Ignore
  }
}

// ============================================================================
// POSITION HELPERS
// ============================================================================

function getPositionStyles(position: ToolbarPosition, customX?: number, customY?: number) {
  switch (position) {
    case 'bottom-center':
      return {
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
      }
    case 'top-center':
      return {
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
      }
    case 'left':
      return {
        left: 24,
        top: '50%',
        transform: 'translateY(-50%)',
      }
    case 'right':
      return {
        right: 24,
        top: '50%',
        transform: 'translateY(-50%)',
      }
    case 'custom':
      return {
        left: customX ?? 100,
        top: customY ?? 100,
      }
    default:
      return {
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
      }
  }
}

function isVerticalPosition(position: ToolbarPosition): boolean {
  return position === 'left' || position === 'right'
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DraggableToolbar({
  id,
  children,
  defaultPosition = 'bottom-center',
  snapToEdges = true,
  snapThreshold = 50,
  isHidden = false,
  isDark = true,
  className,
  onPositionChange,
}: DraggableToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()

  // Load saved position or use default
  const [positionState, setPositionState] = useState<ToolbarPositionState>(() => {
    const saved = loadPosition(id)
    return saved ?? { position: defaultPosition }
  })

  const [isDragging, setIsDragging] = useState(false)
  const [showDragHandle, setShowDragHandle] = useState(false)

  // Calculate snap position based on drag end coordinates
  const calculateSnapPosition = useCallback((x: number, y: number): ToolbarPositionState => {
    if (typeof window === 'undefined') return { position: 'custom', customX: x, customY: y }

    const vw = window.innerWidth
    const vh = window.innerHeight

    // Check if near edges
    const nearLeft = x < snapThreshold
    const nearRight = x > vw - snapThreshold
    const nearTop = y < snapThreshold
    const nearBottom = y > vh - snapThreshold
    const nearCenterX = Math.abs(x - vw / 2) < snapThreshold * 2
    const nearCenterY = Math.abs(y - vh / 2) < snapThreshold * 2

    if (nearBottom && nearCenterX) return { position: 'bottom-center' }
    if (nearTop && nearCenterX) return { position: 'top-center' }
    if (nearLeft && nearCenterY) return { position: 'left' }
    if (nearRight && nearCenterY) return { position: 'right' }

    return { position: 'custom', customX: x, customY: y }
  }, [snapThreshold])

  // Handle drag end
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)

    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const newPosition = snapToEdges
      ? calculateSnapPosition(centerX, centerY)
      : { position: 'custom' as const, customX: rect.left, customY: rect.top }

    setPositionState(newPosition)
    savePosition(id, newPosition)
    onPositionChange?.(newPosition)
  }, [id, snapToEdges, calculateSnapPosition, onPositionChange])

  // Don't render if hidden
  if (isHidden) return null

  const posStyles = getPositionStyles(
    positionState.position,
    positionState.customX,
    positionState.customY
  )

  const isVertical = isVerticalPosition(positionState.position)

  return (
    <motion.div
      ref={containerRef}
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setShowDragHandle(true)}
      onMouseLeave={() => !isDragging && setShowDragHandle(false)}
      className={cn(
        'fixed z-[200] select-none',
        isDragging && 'cursor-grabbing',
        !isDragging && 'cursor-default',
        className
      )}
      style={{
        ...posStyles,
        // Reset transform during drag to allow free movement
        ...(isDragging ? { transform: 'none', left: undefined, right: undefined, top: undefined, bottom: undefined } : {}),
      }}
      initial={false}
      animate={{
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging
          ? isDark
            ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 2px rgba(139,92,246,0.3)'
            : '0 8px 32px rgba(0,0,0,0.2), 0 0 0 2px rgba(99,102,241,0.3)'
          : 'none',
      }}
      transition={{ duration: 0.15 }}
    >
      {/* Drag handle indicator */}
      <motion.div
        className={cn(
          'absolute flex items-center justify-center transition-opacity duration-200',
          isVertical
            ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-full pb-1'
            : 'left-1/2 -translate-x-1/2 -translate-y-full pb-1',
          showDragHandle || isDragging ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div
          className={cn(
            'px-2 py-1 rounded-t-lg cursor-grab active:cursor-grabbing',
            isDark ? 'bg-zinc-800/80 text-zinc-400' : 'bg-zinc-200/80 text-zinc-600'
          )}
          onPointerDown={(e) => {
            e.preventDefault()
            dragControls.start(e)
          }}
        >
          {isVertical ? (
            <GripVertical className="w-4 h-4" />
          ) : (
            <GripHorizontal className="w-4 h-4" />
          )}
        </div>
      </motion.div>

      {/* Actual toolbar content */}
      {children}
    </motion.div>
  )
}

// ============================================================================
// HOOK - For components that want to control position externally
// ============================================================================

export function useToolbarPosition(id: string, defaultPosition: ToolbarPosition = 'bottom-center') {
  const [positionState, setPositionState] = useState<ToolbarPositionState>(() => {
    const saved = loadPosition(id)
    return saved ?? { position: defaultPosition }
  })

  const updatePosition = useCallback((newPosition: ToolbarPositionState) => {
    setPositionState(newPosition)
    savePosition(id, newPosition)
  }, [id])

  const resetPosition = useCallback(() => {
    const defaultState = { position: defaultPosition }
    setPositionState(defaultState)
    savePosition(id, defaultState)
  }, [id, defaultPosition])

  return { positionState, updatePosition, resetPosition }
}
