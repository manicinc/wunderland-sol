/**
 * Strand Tab Component
 * @module components/quarry/ui/tabs/StrandTab
 * 
 * Individual tab item for the strand tab bar.
 * Supports close button, dirty indicator, pin icon, and context menu.
 */

'use client'

import React, { useCallback, useState, type MouseEvent } from 'react'
import { motion } from 'framer-motion'
import { X, Pin, FileText, FolderOpen, Sparkles, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OpenTab } from './types'
import TabContextMenu from './TabContextMenu'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface StrandTabProps {
  tab: OpenTab
  isActive: boolean
  isDark?: boolean
  onActivate: () => void
  onClose: () => void
  onCloseOthers: () => void
  onCloseToRight: () => void
  onTogglePin: () => void
  onMiddleClick?: () => void
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function getTabIcon(path: string): React.ComponentType<{ className?: string }> {
  const ext = path.split('.').pop()?.toLowerCase()
  const filename = path.split('/').pop()?.toLowerCase() || ''
  
  // Folder strands
  if (path.endsWith('/') || filename === 'strand.yml') {
    return FolderOpen
  }
  
  // Special files
  if (filename.includes('flashcard') || filename.includes('quiz')) {
    return Sparkles
  }
  
  if (filename.includes('glossary') || filename.includes('reference')) {
    return BookOpen
  }
  
  // Default to file
  return FileText
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function StrandTab({
  tab,
  isActive,
  isDark = false,
  onActivate,
  onClose,
  onCloseOthers,
  onCloseToRight,
  onTogglePin,
  onMiddleClick,
  className,
}: StrandTabProps) {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  
  const Icon = getTabIcon(tab.path)
  
  // Handle tab click
  const handleClick = useCallback((e: MouseEvent) => {
    // Middle click to close
    if (e.button === 1) {
      e.preventDefault()
      onMiddleClick?.()
      return
    }
    
    // Left click to activate
    if (e.button === 0) {
      onActivate()
    }
  }, [onActivate, onMiddleClick])
  
  // Handle context menu
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }, [])
  
  // Handle close button click
  const handleCloseClick = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    onClose()
  }, [onClose])
  
  // Handle mouse down for middle click
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
      onMiddleClick?.()
    }
  }, [onMiddleClick])
  
  return (
    <>
      <motion.div
        layout
        layoutId={tab.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        className={cn(
          // Base styles
          'group relative flex items-center gap-2 px-3 py-1.5 min-w-0 max-w-[180px] cursor-pointer select-none',
          'border-r transition-colors duration-150',
          // Light theme
          !isDark && [
            'border-zinc-200 hover:bg-zinc-100',
            isActive && 'bg-white',
            !isActive && 'bg-zinc-50',
          ],
          // Dark theme
          isDark && [
            'border-zinc-700/50 hover:bg-zinc-800',
            isActive && 'bg-zinc-900',
            !isActive && 'bg-zinc-800/50',
          ],
          className
        )}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}
        role="tab"
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
      >
        {/* Active indicator */}
        {isActive && (
          <motion.div
            layoutId="active-tab-indicator"
            className={cn(
              'absolute bottom-0 left-0 right-0 h-0.5',
              isDark ? 'bg-cyan-400' : 'bg-cyan-600'
            )}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
        
        {/* Dirty indicator dot */}
        {tab.isDirty && (
          <span
            className={cn(
              'absolute top-1.5 left-1.5 w-2 h-2 rounded-full',
              isDark ? 'bg-amber-400' : 'bg-amber-500'
            )}
            title="Unsaved changes"
          />
        )}
        
        {/* Icon */}
        <Icon
          className={cn(
            'w-4 h-4 flex-shrink-0 transition-colors',
            isActive
              ? isDark ? 'text-cyan-400' : 'text-cyan-600'
              : isDark ? 'text-zinc-400' : 'text-zinc-500',
            tab.isDirty && 'ml-2'
          )}
        />
        
        {/* Title */}
        <span
          className={cn(
            'truncate text-sm font-medium transition-colors',
            isActive
              ? isDark ? 'text-zinc-100' : 'text-zinc-900'
              : isDark ? 'text-zinc-400' : 'text-zinc-600'
          )}
          title={tab.path}
        >
          {tab.title}
        </span>
        
        {/* Pin or Close button */}
        <div className="flex-shrink-0 ml-1 w-4 h-4">
          {tab.isPinned ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onTogglePin()
              }}
              className={cn(
                'w-4 h-4 flex items-center justify-center rounded',
                'transition-colors duration-150',
                isDark
                  ? 'text-cyan-400 hover:bg-zinc-700'
                  : 'text-cyan-600 hover:bg-zinc-200'
              )}
              title="Unpin tab"
              aria-label="Unpin tab"
            >
              <Pin className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={handleCloseClick}
              className={cn(
                'w-4 h-4 flex items-center justify-center rounded',
                'opacity-0 group-hover:opacity-100 focus:opacity-100',
                'transition-all duration-150',
                isDark
                  ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200'
              )}
              title="Close tab"
              aria-label="Close tab"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        
        {/* Preview indicator */}
        {tab.isPreview && (
          <div
            className={cn(
              'absolute top-0 right-0 w-1.5 h-1.5',
              isDark ? 'bg-purple-400' : 'bg-purple-500'
            )}
            title="Preview (will close when opening another)"
          />
        )}
      </motion.div>
      
      {/* Context Menu */}
      {showContextMenu && (
        <TabContextMenu
          tab={tab}
          position={contextMenuPosition}
          isDark={isDark}
          onClose={() => setShowContextMenu(false)}
          onCloseTab={onClose}
          onCloseOthers={onCloseOthers}
          onCloseToRight={onCloseToRight}
          onTogglePin={onTogglePin}
        />
      )}
    </>
  )
}




