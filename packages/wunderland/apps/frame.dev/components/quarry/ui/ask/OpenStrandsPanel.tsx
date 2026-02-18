'use client'

/**
 * Open Strands Panel - VS Code Style Tabs
 * @module components/quarry/ui/ask/OpenStrandsPanel
 * 
 * @description
 * A VS Code-style tab bar for managing open strands in the Ask page.
 * Features:
 * - Horizontal scrollable tabs with close buttons
 * - Active tab highlighting
 * - Add button to open strand picker
 * - Persists open tabs to localStorage
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, FileText, ChevronLeft, ChevronRight, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface OpenStrand {
  id: string
  path: string
  title: string
  content?: string  // Cached content for RAG
}

export interface OpenStrandsPanelProps {
  strands: OpenStrand[]
  activeStrandId: string | null
  onStrandSelect: (id: string) => void
  onStrandClose: (id: string) => void
  onStrandAdd: () => void
  isDark?: boolean
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'ask-open-strands'

export function loadOpenStrands(): OpenStrand[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveOpenStrands(strands: OpenStrand[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(strands))
  } catch {
    // Ignore storage errors
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function OpenStrandsPanel({
  strands,
  activeStrandId,
  onStrandSelect,
  onStrandClose,
  onStrandAdd,
  isDark = true,
  className,
}: OpenStrandsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Check scroll state
  const checkScrollState = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1)
  }, [])

  useEffect(() => {
    checkScrollState()
    const el = scrollRef.current
    if (el) {
      el.addEventListener('scroll', checkScrollState)
      window.addEventListener('resize', checkScrollState)
      return () => {
        el.removeEventListener('scroll', checkScrollState)
        window.removeEventListener('resize', checkScrollState)
      }
    }
  }, [checkScrollState, strands])

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' })
    }
  }

  // Handle close with event stop
  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onStrandClose(id)
  }

  if (strands.length === 0) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 border-b',
        isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50',
        className
      )}>
        <Layers className={cn('w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
        <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-500')}>
          No strands open
        </span>
        <button
          onClick={onStrandAdd}
          className={cn(
            'ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
            isDark 
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' 
              : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
          )}
        >
          <Plus className="w-3 h-3" />
          Add strand
        </button>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center border-b relative',
      isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50',
      className
    )}>
      {/* Scroll left button */}
      {canScrollLeft && (
        <button
          onClick={scrollLeft}
          className={cn(
            'absolute left-0 z-10 p-1 rounded-r shadow-md',
            isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-white hover:bg-zinc-100 text-zinc-600'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Tabs container */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <AnimatePresence mode="popLayout">
          {strands.map((strand) => {
            const isActive = strand.id === activeStrandId
            return (
              <motion.button
                key={strand.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                onClick={() => onStrandSelect(strand.id)}
                className={cn(
                  'group flex items-center gap-1.5 px-2.5 py-1.5 min-w-0 max-w-[180px] border-r transition-colors',
                  isDark ? 'border-zinc-800' : 'border-zinc-200',
                  isActive
                    ? isDark
                      ? 'bg-zinc-800 text-white'
                      : 'bg-white text-zinc-900'
                    : isDark
                      ? 'hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200'
                      : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800'
                )}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-medium truncate">
                  {strand.title || strand.path.split('/').pop() || 'Untitled'}
                </span>
                <button
                  onClick={(e) => handleClose(e, strand.id)}
                  className={cn(
                    'p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
                    isDark 
                      ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200' 
                      : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'
                  )}
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.button>
            )
          })}
        </AnimatePresence>

        {/* Add button */}
        <button
          onClick={onStrandAdd}
          className={cn(
            'flex items-center justify-center p-1.5 shrink-0 transition-colors',
            isDark 
              ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300' 
              : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'
          )}
          title="Add strand to context"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Scroll right button */}
      {canScrollRight && (
        <button
          onClick={scrollRight}
          className={cn(
            'absolute right-0 z-10 p-1 rounded-l shadow-md',
            isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-white hover:bg-zinc-100 text-zinc-600'
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

