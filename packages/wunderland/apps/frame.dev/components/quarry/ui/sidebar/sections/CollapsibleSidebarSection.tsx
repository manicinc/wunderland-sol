/**
 * Collapsible Sidebar Section
 * 
 * Reusable collapsible section wrapper for sidebar widgets.
 * Used across Dashboard, Write, Reflect, and Planner sidebars.
 * @module components/quarry/ui/sidebar/sections/CollapsibleSidebarSection
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CollapsibleSidebarSectionProps {
  /** Section title */
  title: string
  /** Section icon */
  icon: LucideIcon
  /** Whether section is expanded by default */
  defaultExpanded?: boolean
  /** Whether section is currently expanded (controlled) */
  isExpanded?: boolean
  /** Callback when expanded state changes */
  onToggle?: (expanded: boolean) => void
  /** Whether in dark mode */
  isDark: boolean
  /** Optional badge content */
  badge?: React.ReactNode
  /** Section content */
  children: React.ReactNode
  /** Additional className */
  className?: string
  /** Whether to hide the border */
  noBorder?: boolean
}

export function CollapsibleSidebarSection({
  title,
  icon: Icon,
  defaultExpanded = true,
  isExpanded: controlledExpanded,
  onToggle,
  isDark,
  badge,
  children,
  className,
  noBorder = false,
}: CollapsibleSidebarSectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  
  // Support both controlled and uncontrolled modes
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded
  
  const handleToggle = () => {
    const newValue = !isExpanded
    if (onToggle) {
      onToggle(newValue)
    } else {
      setInternalExpanded(newValue)
    }
  }

  return (
    <div className={cn(
      !noBorder && 'border-b',
      isDark ? 'border-zinc-800' : 'border-zinc-200',
      className
    )}>
      {/* Section Header - Always visible */}
      <button
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2',
          'text-left transition-colors',
          isDark 
            ? 'hover:bg-zinc-800/50 text-zinc-300' 
            : 'hover:bg-zinc-100 text-zinc-700'
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn(
            'w-4 h-4',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )} />
          <span className="text-sm font-medium">{title}</span>
          {badge}
        </div>
        <ChevronDown 
          className={cn(
            'w-4 h-4 transition-transform duration-200',
            isDark ? 'text-zinc-500' : 'text-zinc-400',
            isExpanded ? 'rotate-180' : ''
          )} 
        />
      </button>

      {/* Section Content - Collapsible */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CollapsibleSidebarSection

