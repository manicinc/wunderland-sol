/**
 * Expandable Section Component
 * @module codex/ui/ExpandableSection
 * 
 * @remarks
 * Smooth collapsible sections with hover effects
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface ExpandableSectionProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
  className?: string
}

export default function ExpandableSection({
  title,
  icon,
  children,
  defaultExpanded = true,
  className = '',
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const hasUserInteracted = useRef(false)
  
  // Auto-expand when defaultExpanded becomes true (e.g., backlinks found)
  // but only if user hasn't manually collapsed it
  useEffect(() => {
    if (defaultExpanded && !hasUserInteracted.current) {
      setIsExpanded(true)
    }
  }, [defaultExpanded])
  
  const handleToggle = () => {
    hasUserInteracted.current = true
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={className}>
      <button
        onClick={handleToggle}
        className="
          w-full flex items-center justify-between 
          py-1.5 px-2 -mx-2
          hover:bg-zinc-100 dark:hover:bg-zinc-800/50
          transition-colors rounded
          group
        "
      >
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
            className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
          >
            <ChevronRight className="w-3 h-3" />
          </motion.div>
          {icon && (
            <span className="text-zinc-500 dark:text-zinc-400">
              {icon}
            </span>
          )}
          <h5 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            {title}
          </h5>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              height: { duration: 0.2, ease: 'easeInOut' },
              opacity: { duration: 0.15 }
            }}
            className="overflow-hidden"
          >
            <div className="pt-1.5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
