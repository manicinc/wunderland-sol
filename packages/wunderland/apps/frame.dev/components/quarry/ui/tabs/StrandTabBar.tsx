/**
 * Strand Tab Bar
 * @module components/quarry/ui/tabs/StrandTabBar
 * 
 * VS Code-inspired tab bar for managing multiple open strands.
 * Features horizontal scrolling, drag-and-drop reordering, and keyboard shortcuts.
 */

'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOpenTabsSafe } from '../../contexts/OpenTabsContext'
import StrandTab from './StrandTab'
import type { OpenTab } from './types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface StrandTabBarProps {
  isDark?: boolean
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   SORTABLE TAB WRAPPER
═══════════════════════════════════════════════════════════════════════════ */

interface SortableTabProps {
  tab: OpenTab
  isActive: boolean
  isDark: boolean
  onActivate: () => void
  onClose: () => void
  onCloseOthers: () => void
  onCloseToRight: () => void
  onTogglePin: () => void
  onMiddleClick: () => void
}

function SortableTab({
  tab,
  isActive,
  isDark,
  onActivate,
  onClose,
  onCloseOthers,
  onCloseToRight,
  onTogglePin,
  onMiddleClick,
}: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  }
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(isDragging && 'cursor-grabbing')}
    >
      <StrandTab
        tab={tab}
        isActive={isActive}
        isDark={isDark}
        onActivate={onActivate}
        onClose={onClose}
        onCloseOthers={onCloseOthers}
        onCloseToRight={onCloseToRight}
        onTogglePin={onTogglePin}
        onMiddleClick={onMiddleClick}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function StrandTabBar({
  isDark = false,
  className,
}: StrandTabBarProps) {
  const tabsContext = useOpenTabsSafe()
  
  // Extract values with safe defaults for when context is not available
  const tabs = tabsContext?.tabs ?? []
  const tabOrder = tabsContext?.tabOrder ?? []
  const activeTabId = tabsContext?.activeTabId ?? null
  const setActiveTab = tabsContext?.setActiveTab ?? (() => {})
  const closeTab = tabsContext?.closeTab ?? (() => {})
  const closeOtherTabs = tabsContext?.closeOtherTabs ?? (() => {})
  const closeTabsToRight = tabsContext?.closeTabsToRight ?? (() => {})
  const togglePin = tabsContext?.togglePin ?? (() => {})
  const reorderTabs = tabsContext?.reorderTabs ?? (() => {})
  const nextTab = tabsContext?.nextTab ?? (() => {})
  const prevTab = tabsContext?.prevTab ?? (() => {})
  const jumpToTab = tabsContext?.jumpToTab ?? (() => {})
  const closeAllTabs = tabsContext?.closeAllTabs ?? (() => {})
  const reopenLastClosed = tabsContext?.reopenLastClosed ?? (() => {})
  const openTab = tabsContext?.openTab ?? (() => {})

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  // Get ordered tabs based on tabOrder
  const orderedTabs = tabOrder
    .map(id => tabs.find(t => t.id === id))
    .filter((t): t is OpenTab => !!t)
  
  // Check scroll state
  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    )
  }, [])
  
  // Listen for scroll and resize
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    updateScrollButtons()
    
    container.addEventListener('scroll', updateScrollButtons)
    window.addEventListener('resize', updateScrollButtons)
    
    return () => {
      container.removeEventListener('scroll', updateScrollButtons)
      window.removeEventListener('resize', updateScrollButtons)
    }
  }, [updateScrollButtons])
  
  // Update scroll buttons when tabs change
  useEffect(() => {
    updateScrollButtons()
  }, [tabs, updateScrollButtons])
  
  // Scroll functions
  const scrollLeft = useCallback(() => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' })
    }
  }, [])
  
  const scrollRight = useCallback(() => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' })
    }
  }, [])
  
  // Scroll active tab into view
  useEffect(() => {
    if (!activeTabId) return
    
    const container = scrollContainerRef.current
    const activeElement = container?.querySelector(`[data-tab-id="${activeTabId}"]`)
    
    if (activeElement) {
      activeElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [activeTabId])
  
  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = tabOrder.indexOf(active.id as string)
      const newIndex = tabOrder.indexOf(over.id as string)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderTabs(oldIndex, newIndex)
      }
    }
  }, [tabOrder, reorderTabs])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      
      // Close tab: Ctrl/Cmd + W
      if (isMod && e.key === 'w' && !e.shiftKey) {
        e.preventDefault()
        if (activeTabId) {
          closeTab(activeTabId)
        }
      }
      
      // Reopen closed: Ctrl/Cmd + Shift + T
      if (isMod && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        reopenLastClosed()
      }
      
      // Next tab: Ctrl + Tab
      if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault()
        nextTab()
      }
      
      // Previous tab: Ctrl + Shift + Tab
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault()
        prevTab()
      }
      
      // Jump to tab: Ctrl/Cmd + 1-9
      if (isMod && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const index = parseInt(e.key, 10)
        jumpToTab(index)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTabId, closeTab, nextTab, prevTab, jumpToTab, reopenLastClosed])

  // Handle sidebar strand drag-and-drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Log all drag types for debugging
    const types = Array.from(e.dataTransfer.types)
    console.log('[StrandTabBar] dragOver - types:', types)

    // Only accept our custom strand drag type
    if (types.includes('application/x-quarry-strand')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setIsDragOver(true)
      console.log('[StrandTabBar] dragOver - accepted strand drop')
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only handle leave if actually leaving the container
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    // Log all available data types for debugging
    const types = Array.from(e.dataTransfer.types)
    console.log('[StrandTabBar] Drop - Available types:', types)

    const data = e.dataTransfer.getData('application/x-quarry-strand')
    console.log('[StrandTabBar] getData result:', data || '(empty)')

    if (!data) {
      console.warn('[StrandTabBar] No data received in drop! This may indicate a drag source issue.')
      return
    }

    try {
      const { path, title } = JSON.parse(data)
      console.log('[StrandTabBar] Drop received - opening tab:', { path, title })
      // Drop always opens as permanent tab (not preview)
      openTab(path, title, { asPreview: false })
    } catch (err) {
      console.error('[StrandTabBar] Failed to parse drop data:', err)
    }
  }, [openTab])

  // Empty state: still show drop zone for drag-and-drop
  if (tabs.length === 0) {
    return (
      <div
        data-testid="strand-tab-bar"
        className={cn(
          'relative flex items-center justify-center h-9 border-b transition-all duration-150',
          isDark
            ? 'bg-zinc-900/50 border-zinc-700/50'
            : 'bg-zinc-50/50 border-zinc-200',
          isDragOver && 'ring-2 ring-cyan-500 ring-inset',
          isDragOver && (isDark ? 'bg-cyan-500/10' : 'bg-cyan-500/5'),
          className
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className={cn(
          'text-xs',
          isDark ? 'text-zinc-500' : 'text-zinc-400',
          isDragOver && 'text-cyan-500'
        )}>
          {isDragOver ? 'Drop to open strand' : 'Drag strands here to open tabs'}
        </span>
      </div>
    )
  }

  return (
    <div
      data-testid="strand-tab-bar"
      className={cn(
        'relative flex items-center h-9 border-b transition-all duration-150',
        isDark
          ? 'bg-zinc-900/50 border-zinc-700/50'
          : 'bg-zinc-50/50 border-zinc-200',
        // Visual indicator when dragging strand over tab bar
        isDragOver && 'ring-2 ring-cyan-500 ring-inset',
        isDragOver && (isDark ? 'bg-cyan-500/10' : 'bg-cyan-500/5'),
        className
      )}
      role="tablist"
      aria-label="Open strands"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Left scroll button */}
      {canScrollLeft && (
        <button
          onClick={scrollLeft}
          className={cn(
            'absolute left-0 z-10 h-full px-1.5 flex items-center',
            'transition-colors duration-150',
            isDark
              ? 'bg-gradient-to-r from-zinc-900 to-transparent hover:text-zinc-100 text-zinc-400'
              : 'bg-gradient-to-r from-zinc-50 to-transparent hover:text-zinc-900 text-zinc-500'
          )}
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      
      {/* Tabs container */}
      <div
        ref={scrollContainerRef}
        className={cn(
          'flex overflow-x-auto scrollbar-hide',
          'scroll-smooth',
          canScrollLeft && 'pl-6',
          canScrollRight && 'pr-6'
        )}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedTabs.map(t => t.id)}
            strategy={horizontalListSortingStrategy}
          >
            <AnimatePresence mode="popLayout">
              {orderedTabs.map(tab => (
                <div key={tab.id} data-tab-id={tab.id}>
                  <SortableTab
                    tab={tab}
                    isActive={tab.id === activeTabId}
                    isDark={isDark}
                    onActivate={() => setActiveTab(tab.id)}
                    onClose={() => closeTab(tab.id)}
                    onCloseOthers={() => closeOtherTabs(tab.id)}
                    onCloseToRight={() => closeTabsToRight(tab.id)}
                    onTogglePin={() => togglePin(tab.id)}
                    onMiddleClick={() => closeTab(tab.id)}
                  />
                </div>
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>
      </div>
      
      {/* Right scroll button */}
      {canScrollRight && (
        <button
          onClick={scrollRight}
          className={cn(
            'absolute right-0 z-10 h-full px-1.5 flex items-center',
            'transition-colors duration-150',
            isDark
              ? 'bg-gradient-to-l from-zinc-900 to-transparent hover:text-zinc-100 text-zinc-400'
              : 'bg-gradient-to-l from-zinc-50 to-transparent hover:text-zinc-900 text-zinc-500'
          )}
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}




