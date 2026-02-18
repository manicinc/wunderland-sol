'use client'

/**
 * Overlapping Tasks Popup
 *
 * A floating card that appears when clicking on overlapping events/tasks,
 * showing a grouped list of all items in that time slot.
 *
 * @module components/quarry/ui/planner/OverlappingTasksPopup
 */

import { useCallback, useMemo } from 'react'
import { useModalAccessibility } from '@/components/quarry/hooks/useModalAccessibility'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Eye,
  CheckSquare,
  CalendarDays,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/components/quarry/hooks/useHaptics'
import type { TimelineItem } from '@/lib/planner/timelineUtils'
import {
  getCategoryIcon,
  formatTimeRange,
  formatDurationCompact,
  CATEGORY_ICONS,
} from '@/lib/planner/timelineUtils'
import * as Icons from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface OverlappingTasksPopupProps {
  /** Whether the popup is visible */
  isOpen: boolean
  /** Items to display in the popup */
  items: TimelineItem[]
  /** Position of the popup */
  position?: { x: number; y: number }
  /** Anchor point for positioning */
  anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  /** Called when an item is clicked */
  onItemClick?: (item: TimelineItem) => void
  /** Called when an item's completion is toggled */
  onItemToggle?: (itemId: string, completed: boolean) => void
  /** Called when close is clicked */
  onClose: () => void
  /** Theme */
  theme?: 'light' | 'dark'
  /** Additional class names */
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function getIconComponent(iconName: string): LucideIcon {
  // Try to get icon from lucide-react
  const IconComponent = (Icons as unknown as Record<string, LucideIcon>)[iconName]
  return IconComponent || CalendarDays
}

// ============================================================================
// POPUP ITEM
// ============================================================================

interface PopupItemProps {
  item: TimelineItem
  onClick?: () => void
  onToggle?: (completed: boolean) => void
  theme: 'light' | 'dark'
}

function PopupItem({ item, onClick, onToggle, theme }: PopupItemProps) {
  const isDark = theme === 'dark'
  const haptics = useHaptics()

  // Get icon
  const iconName = getCategoryIcon(item)
  const IconComponent = getIconComponent(iconName)

  // Handle checkbox toggle
  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      haptics.haptic('success')
      onToggle?.(!item.completed)
    },
    [item.completed, onToggle, haptics]
  )

  return (
    <motion.button
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl',
        'transition-colors text-left',
        isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50',
        item.completed && 'opacity-50'
      )}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
    >
      {/* Category Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${item.color}20` }}
      >
        <IconComponent size={16} style={{ color: item.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4
          className={cn(
            'text-sm font-medium truncate',
            item.completed && 'line-through',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}
        >
          {item.title}
        </h4>
        <div
          className={cn(
            'flex items-center gap-2 text-xs mt-0.5',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}
        >
          <span>{formatTimeRange(item.startTime, item.endTime)}</span>
          <span>({formatDurationCompact(item.duration)})</span>
        </div>
      </div>

      {/* Checkbox */}
      <motion.div
        className={cn(
          'w-5 h-5 rounded border-2 shrink-0',
          'flex items-center justify-center',
          'transition-colors cursor-pointer',
          item.completed
            ? 'border-emerald-500 bg-emerald-500'
            : isDark
              ? 'border-zinc-600 hover:border-zinc-500'
              : 'border-zinc-300 hover:border-zinc-400'
        )}
        onClick={handleToggle}
        whileTap={{ scale: 0.9 }}
        style={{
          borderColor: item.completed ? item.color : undefined,
          backgroundColor: item.completed ? item.color : undefined,
        }}
      >
        {item.completed && (
          <motion.svg
            width="10"
            height="8"
            viewBox="0 0 10 8"
            className="text-white"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.2 }}
          >
            <path
              d="M1 4L4 7L9 1"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </motion.div>
    </motion.button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OverlappingTasksPopup({
  isOpen,
  items,
  position,
  anchor = 'top-left',
  onItemClick,
  onItemToggle,
  onClose,
  theme = 'light',
  className,
}: OverlappingTasksPopupProps) {
  const isDark = theme === 'dark'
  const haptics = useHaptics()

  // Accessibility: escape to close, click outside to close
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnClickOutside: true,
    trapFocus: true,
    lockScroll: true,
    modalId: 'overlapping-tasks-popup',
  })

  // Sort items by start time
  const sortedItems = useMemo(() => {
    return [...items].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    )
  }, [items])

  // Calculate position styles
  const positionStyles = useMemo(() => {
    if (!position) return {}

    const styles: React.CSSProperties = {
      position: 'fixed' as const,
    }

    switch (anchor) {
      case 'top-left':
        styles.left = position.x
        styles.top = position.y
        break
      case 'top-right':
        styles.right = window.innerWidth - position.x
        styles.top = position.y
        break
      case 'bottom-left':
        styles.left = position.x
        styles.bottom = window.innerHeight - position.y
        break
      case 'bottom-right':
        styles.right = window.innerWidth - position.x
        styles.bottom = window.innerHeight - position.y
        break
      case 'center':
        styles.left = position.x
        styles.top = position.y
        styles.transform = 'translate(-50%, -50%)'
        break
    }

    return styles
  }, [position, anchor])

  // Handle close
  const handleClose = useCallback(() => {
    haptics.haptic('light')
    onClose()
  }, [onClose, haptics])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={backdropRef}
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          />

          {/* Popup */}
          <motion.div
            ref={contentRef}
            className={cn(
              'z-50 w-80 max-h-96 overflow-hidden',
              'rounded-2xl shadow-2xl',
              isDark ? 'bg-zinc-900' : 'bg-white',
              'border',
              isDark ? 'border-zinc-800' : 'border-zinc-200',
              className
            )}
            style={positionStyles}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', damping: 25 }}
            {...modalProps}
          >
            {/* Header */}
            <div
              className={cn(
                'flex items-center justify-between px-4 py-3 border-b',
                isDark ? 'border-zinc-800' : 'border-zinc-100'
              )}
            >
              <div className="flex items-center gap-2">
                <Eye
                  size={16}
                  className={isDark ? 'text-zinc-500' : 'text-zinc-400'}
                />
                <span
                  className={cn(
                    'text-sm font-medium',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}
                >
                  Overlapping tasks
                </span>
              </div>
              <motion.button
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center',
                  isDark
                    ? 'hover:bg-zinc-800 text-zinc-500'
                    : 'hover:bg-zinc-100 text-zinc-400'
                )}
                onClick={handleClose}
                whileTap={{ scale: 0.9 }}
              >
                <X size={14} />
              </motion.button>
            </div>

            {/* Items List */}
            <div className="overflow-y-auto max-h-72 p-2">
              {sortedItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PopupItem
                    item={item}
                    onClick={() => onItemClick?.(item)}
                    onToggle={(completed) => onItemToggle?.(item.id, completed)}
                    theme={theme}
                  />
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div
              className={cn(
                'px-4 py-2 border-t',
                isDark ? 'border-zinc-800' : 'border-zinc-100'
              )}
            >
              <p
                className={cn(
                  'text-xs text-center',
                  isDark ? 'text-zinc-600' : 'text-zinc-400'
                )}
              >
                {sortedItems.length} items in this time slot
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default OverlappingTasksPopup
