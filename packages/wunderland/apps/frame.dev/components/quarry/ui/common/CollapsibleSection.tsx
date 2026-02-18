/**
 * Collapsible Section Component
 * @module components/quarry/ui/common/CollapsibleSection
 * 
 * @description
 * An animated expandable/collapsible section with smooth transitions.
 * Supports custom headers, icons, and badge counts.
 * 
 * @example
 * ```tsx
 * <CollapsibleSection
 *   title="Card Details"
 *   icon={<Info className="w-4 h-4" />}
 *   badge={3}
 *   defaultOpen={false}
 * >
 *   <p>Detailed content here...</p>
 * </CollapsibleSection>
 * ```
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface CollapsibleSectionProps {
  /** Section title */
  title: string
  /** Optional icon before title */
  icon?: React.ReactNode
  /** Optional badge count */
  badge?: number
  /** Whether section is open by default */
  defaultOpen?: boolean
  /** Controlled open state */
  isOpen?: boolean
  /** Called when open state changes */
  onOpenChange?: (isOpen: boolean) => void
  /** Additional className for container */
  className?: string
  /** Additional className for header */
  headerClassName?: string
  /** Additional className for content */
  contentClassName?: string
  /** Children content */
  children: React.ReactNode
  /** Dark mode */
  isDark?: boolean
  /** Disable animation */
  noAnimation?: boolean
  /** Custom chevron icon */
  customChevron?: React.ReactNode
  /** Show border */
  bordered?: boolean
  /** Compact mode */
  compact?: boolean
  /** Disable the section (non-interactive) */
  disabled?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CollapsibleSection({
  title,
  icon,
  badge,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onOpenChange,
  className,
  headerClassName,
  contentClassName,
  children,
  isDark = false,
  noAnimation = false,
  customChevron,
  bordered = false,
  compact = false,
  disabled = false,
}: CollapsibleSectionProps) {
  // State
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = controlledIsOpen ?? internalOpen
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          setContentHeight(entry.contentRect.height)
        }
      })
      resizeObserver.observe(contentRef.current)
      return () => resizeObserver.disconnect()
    }
  }, [])

  // Toggle handler
  const handleToggle = useCallback(() => {
    if (disabled) return
    const newState = !isOpen
    setInternalOpen(newState)
    onOpenChange?.(newState)
  }, [isOpen, disabled, onOpenChange])

  // Keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }, [handleToggle])

  // Animation variants
  const contentVariants = {
    open: {
      height: 'auto',
      opacity: 1,
      transition: {
        height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
        opacity: { duration: 0.2, delay: 0.1 },
      },
    },
    closed: {
      height: 0,
      opacity: 0,
      transition: {
        height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
        opacity: { duration: 0.1 },
      },
    },
  }

  const chevronVariants = {
    open: { rotate: 90 },
    closed: { rotate: 0 },
  }

  // Render chevron
  const chevron = customChevron || (
    <motion.div
      variants={chevronVariants}
      initial={false}
      animate={isOpen ? 'open' : 'closed'}
      transition={{ duration: 0.2 }}
    >
      <ChevronRight className={cn(
        'transition-colors',
        compact ? 'w-3.5 h-3.5' : 'w-4 h-4',
        isDark ? 'text-zinc-400' : 'text-zinc-500'
      )} />
    </motion.div>
  )

  return (
    <div
      className={cn(
        'w-full',
        bordered && cn(
          'border rounded-lg overflow-hidden',
          isDark ? 'border-zinc-700' : 'border-zinc-200'
        ),
        className
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className={cn(
          'w-full flex items-center gap-2 text-left transition-colors',
          compact ? 'py-1.5 px-2' : 'py-2.5 px-3',
          bordered && (compact ? 'px-3' : 'px-4'),
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer',
          isDark
            ? 'hover:bg-zinc-800/50'
            : 'hover:bg-zinc-50',
          headerClassName
        )}
      >
        {/* Chevron */}
        {chevron}

        {/* Icon */}
        {icon && (
          <span className={cn(
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          )}>
            {icon}
          </span>
        )}

        {/* Title */}
        <span className={cn(
          'flex-1 font-medium',
          compact ? 'text-sm' : 'text-base',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          {title}
        </span>

        {/* Badge */}
        {typeof badge === 'number' && (
          <span className={cn(
            'px-2 py-0.5 text-xs font-medium rounded-full',
            isDark
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'bg-cyan-100 text-cyan-700'
          )}>
            {badge}
          </span>
        )}
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
            initial={noAnimation ? false : 'closed'}
            animate="open"
            exit="closed"
            variants={noAnimation ? {} : contentVariants}
            className="overflow-hidden"
          >
            <div
              ref={contentRef}
              className={cn(
                bordered && (compact ? 'px-3 pb-2' : 'px-4 pb-3'),
                !bordered && (compact ? 'pl-6 pr-2 pb-2' : 'pl-8 pr-3 pb-3'),
                contentClassName
              )}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// COMPOUND COMPONENTS
// ============================================================================

interface CollapsibleGroupProps {
  /** Allow multiple sections open at once */
  allowMultiple?: boolean
  /** Children should be CollapsibleSection components */
  children: React.ReactNode
  /** Additional className */
  className?: string
  /** Default open sections (by index) */
  defaultOpen?: number[]
}

export function CollapsibleGroup({
  allowMultiple = true,
  children,
  className,
  defaultOpen = [],
}: CollapsibleGroupProps) {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set(defaultOpen))

  const handleOpenChange = useCallback((index: number, isOpen: boolean) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (isOpen) {
        if (!allowMultiple) {
          next.clear()
        }
        next.add(index)
      } else {
        next.delete(index)
      }
      return next
    })
  }, [allowMultiple])

  // Clone children with controlled state
  const enhancedChildren = React.Children.map(children, (child, index) => {
    if (React.isValidElement(child) && child.type === CollapsibleSection) {
      return React.cloneElement(child as React.ReactElement<CollapsibleSectionProps>, {
        isOpen: openSections.has(index),
        onOpenChange: (isOpen: boolean) => handleOpenChange(index, isOpen),
      })
    }
    return child
  })

  return (
    <div className={cn('space-y-1', className)}>
      {enhancedChildren}
    </div>
  )
}

export default CollapsibleSection

