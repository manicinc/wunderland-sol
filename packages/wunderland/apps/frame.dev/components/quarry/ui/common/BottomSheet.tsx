/**
 * Bottom Sheet Component
 * @module components/quarry/ui/common/BottomSheet
 * 
 * @description
 * Mobile-first bottom sheet component for better UX on small screens.
 * Features:
 * - Drag to dismiss with velocity detection
 * - Snap points (collapsed, half, full)
 * - Safe area inset support for notched devices
 * - Backdrop with blur effect
 * - Accessibility compliant
 * 
 * @example
 * ```tsx
 * <BottomSheet isOpen={isOpen} onClose={handleClose} title="Options">
 *   <BottomSheetContent />
 * </BottomSheet>
 * ```
 */

'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion'
import { X, GripHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModalAccessibility } from '../../hooks/useModalAccessibility'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { Z_INDEX } from '../../constants'

// ============================================================================
// TYPES
// ============================================================================

export type SnapPoint = 'collapsed' | 'half' | 'full'

export interface BottomSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Sheet title */
  title?: string
  /** Sheet subtitle */
  subtitle?: string
  /** Sheet content */
  children: React.ReactNode
  /** Initial snap point */
  initialSnap?: SnapPoint
  /** Available snap points */
  snapPoints?: SnapPoint[]
  /** Show drag handle */
  showHandle?: boolean
  /** Show close button */
  showCloseButton?: boolean
  /** Enable backdrop click to close */
  closeOnBackdropClick?: boolean
  /** Enable swipe down to close */
  closeOnSwipeDown?: boolean
  /** Dark mode */
  isDark?: boolean
  /** Additional class name */
  className?: string
  /** Header action button */
  headerAction?: React.ReactNode
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SNAP_HEIGHTS: Record<SnapPoint, string> = {
  collapsed: '25vh',
  half: '50vh',
  full: '92vh',
}

const SNAP_VALUES: Record<SnapPoint, number> = {
  collapsed: 0.25,
  half: 0.5,
  full: 0.92,
}

const VELOCITY_THRESHOLD = 500

// ============================================================================
// COMPONENT
// ============================================================================

export function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  initialSnap = 'half',
  snapPoints = ['collapsed', 'half', 'full'],
  showHandle = true,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnSwipeDown = true,
  isDark = false,
  className,
  headerAction,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false)
  const [currentSnap, setCurrentSnap] = useState<SnapPoint>(initialSnap)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()
  const { prefersReducedMotion } = useReducedMotion()

  // Accessibility
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnClickOutside: closeOnBackdropClick,
    trapFocus: true,
    lockScroll: true,
    modalId: 'bottom-sheet',
  })

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Reset snap on open
  useEffect(() => {
    if (isOpen) {
      setCurrentSnap(initialSnap)
    }
  }, [isOpen, initialSnap])

  // Handle drag end
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const velocity = info.velocity.y
    const offset = info.offset.y

    // Fast downward swipe - close
    if (velocity > VELOCITY_THRESHOLD && closeOnSwipeDown) {
      onClose()
      return
    }

    // Fast upward swipe - go to full
    if (velocity < -VELOCITY_THRESHOLD && snapPoints.includes('full')) {
      setCurrentSnap('full')
      return
    }

    // Calculate which snap point we're closest to
    const viewportHeight = window.innerHeight
    const currentHeight = containerRef.current?.offsetHeight || 0
    const draggedHeight = currentHeight - offset
    const draggedRatio = draggedHeight / viewportHeight

    // Find closest snap point
    let closestSnap: SnapPoint = currentSnap
    let closestDiff = Infinity

    for (const snap of snapPoints) {
      const diff = Math.abs(SNAP_VALUES[snap] - draggedRatio)
      if (diff < closestDiff) {
        closestDiff = diff
        closestSnap = snap
      }
    }

    // If dragged below collapsed threshold, close
    if (draggedRatio < SNAP_VALUES.collapsed / 2 && closeOnSwipeDown) {
      onClose()
    } else {
      setCurrentSnap(closestSnap)
    }
  }, [currentSnap, snapPoints, closeOnSwipeDown, onClose])

  // Get current height
  const currentHeight = SNAP_HEIGHTS[currentSnap]

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={backdropRef as React.RefObject<HTMLDivElement>}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
            onClick={handleBackdropClick}
            className={cn(
              'fixed inset-0 bg-black/40 backdrop-blur-sm',
              'touch-none'
            )}
            style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={contentRef as React.RefObject<HTMLDivElement>}
            initial={{ y: '100%' }}
            animate={{ y: 0, height: currentHeight }}
            exit={{ y: '100%' }}
            transition={prefersReducedMotion 
              ? { duration: 0 } 
              : { type: 'spring', damping: 30, stiffness: 300 }
            }
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed bottom-0 left-0 right-0',
              'rounded-t-3xl shadow-2xl',
              'flex flex-col overflow-hidden',
              isDark 
                ? 'bg-gray-900 border-t border-gray-800' 
                : 'bg-white border-t border-gray-200',
              className
            )}
            style={{ 
              zIndex: Z_INDEX.MODAL,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            {...modalProps}
          >
            {/* Handle */}
            {showHandle && (
              <div 
                className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div 
                  className={cn(
                    'w-12 h-1.5 rounded-full',
                    isDark ? 'bg-gray-700' : 'bg-gray-300'
                  )}
                  aria-hidden="true"
                />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton || headerAction) && (
              <div className={cn(
                'flex items-center justify-between px-4 pb-3',
                !showHandle && 'pt-4'
              )}>
                <div className="flex-1 min-w-0">
                  {title && (
                    <h2 className={cn(
                      'text-lg font-semibold truncate',
                      isDark ? 'text-white' : 'text-gray-900'
                    )}>
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className={cn(
                      'text-sm truncate mt-0.5',
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    )}>
                      {subtitle}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {headerAction}
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className={cn(
                        'p-2 rounded-full transition-colors',
                        'touch-manipulation',
                        isDark 
                          ? 'hover:bg-gray-800 text-gray-400' 
                          : 'hover:bg-gray-100 text-gray-500'
                      )}
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            <div 
              ref={containerRef}
              className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4"
            >
              {children}
            </div>

            {/* Snap point indicators */}
            {snapPoints.length > 1 && (
              <div 
                className={cn(
                  'absolute left-1/2 -translate-x-1/2 top-10',
                  'flex gap-1.5'
                )}
                aria-hidden="true"
              >
                {snapPoints.map((snap) => (
                  <button
                    key={snap}
                    onClick={() => setCurrentSnap(snap)}
                    className={cn(
                      'w-2 h-2 rounded-full transition-colors',
                      currentSnap === snap
                        ? (isDark ? 'bg-blue-500' : 'bg-blue-600')
                        : (isDark ? 'bg-gray-700' : 'bg-gray-300')
                    )}
                    aria-label={`Snap to ${snap}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

export interface BottomSheetButtonProps {
  onClick: () => void
  icon?: React.ReactNode
  label: string
  description?: string
  variant?: 'default' | 'primary' | 'danger'
  isDark?: boolean
  disabled?: boolean
}

export function BottomSheetButton({
  onClick,
  icon,
  label,
  description,
  variant = 'default',
  isDark = false,
  disabled = false,
}: BottomSheetButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-xl transition-colors',
        'touch-manipulation',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'default' && (isDark 
          ? 'hover:bg-gray-800 active:bg-gray-700' 
          : 'hover:bg-gray-100 active:bg-gray-200'),
        variant === 'primary' && (isDark
          ? 'bg-blue-600 hover:bg-blue-500 text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white'),
        variant === 'danger' && (isDark
          ? 'hover:bg-red-900/30 text-red-400'
          : 'hover:bg-red-50 text-red-600')
      )}
    >
      {icon && (
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          variant === 'default' && (isDark ? 'bg-gray-800' : 'bg-gray-100'),
          variant === 'primary' && 'bg-white/20',
          variant === 'danger' && (isDark ? 'bg-red-900/30' : 'bg-red-100')
        )}>
          {icon}
        </div>
      )}
      <div className="flex-1 text-left">
        <div className={cn(
          'font-medium',
          variant === 'default' && (isDark ? 'text-white' : 'text-gray-900'),
          variant === 'primary' && 'text-white',
          variant === 'danger' && (isDark ? 'text-red-400' : 'text-red-600')
        )}>
          {label}
        </div>
        {description && (
          <div className={cn(
            'text-sm mt-0.5',
            isDark ? 'text-gray-400' : 'text-gray-500'
          )}>
            {description}
          </div>
        )}
      </div>
    </button>
  )
}

export interface BottomSheetDividerProps {
  label?: string
  isDark?: boolean
}

export function BottomSheetDivider({ label, isDark = false }: BottomSheetDividerProps) {
  if (label) {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className={cn(
          'flex-1 h-px',
          isDark ? 'bg-gray-800' : 'bg-gray-200'
        )} />
        <span className={cn(
          'text-xs font-medium uppercase tracking-wider',
          isDark ? 'text-gray-500' : 'text-gray-400'
        )}>
          {label}
        </span>
        <div className={cn(
          'flex-1 h-px',
          isDark ? 'bg-gray-800' : 'bg-gray-200'
        )} />
      </div>
    )
  }

  return (
    <div className={cn(
      'h-px my-2',
      isDark ? 'bg-gray-800' : 'bg-gray-200'
    )} />
  )
}

export default BottomSheet

