/**
 * Outline Keyboard Navigation Hook
 * @module hooks/useOutlineKeyboardNav
 *
 * Provides keyboard navigation for outline/reader components:
 * - Alt+↓/↑ for heading navigation (safe - doesn't conflict with typing)
 * - Alt+1-6 to jump to heading levels
 * - Alt+Home to go to top, Alt+End to go to bottom
 * - Ctrl+Shift+F to toggle focus mode
 * - Ctrl+Shift+M to toggle minimap
 * - Ctrl+Shift+B to toggle backlinks
 * - Escape to close overlays (only when not in editor)
 *
 * All shortcuts require modifier keys to avoid conflicts with WYSIWYG editing.
 */

'use client'

import { useEffect, useCallback } from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface HeadingItem {
  id: string
  slug: string
  text: string
  level: number
}

export interface OutlineKeyboardNavOptions {
  /** List of headings for navigation */
  headings: HeadingItem[]
  /** Currently active heading slug */
  activeHeadingSlug?: string
  /** Whether keyboard nav is enabled */
  enabled?: boolean
  /** Callback when heading changes via keyboard */
  onNavigateToHeading?: (slug: string) => void
  /** Callback to scroll to top */
  onScrollToTop?: () => void
  /** Callback to scroll to bottom */
  onScrollToBottom?: () => void
  /** Callback to toggle focus mode */
  onToggleFocusMode?: () => void
  /** Callback to toggle minimap */
  onToggleMinimap?: () => void
  /** Callback to toggle backlinks panel */
  onToggleBacklinks?: () => void
  /** Callback to focus search input */
  onFocusSearch?: () => void
  /** Callback for escape key */
  onEscape?: () => void
  /** Current outline sub-tab */
  currentTab?: 'outline' | 'minimap' | 'backlinks'
  /** Callback to change outline tab */
  onTabChange?: (tab: 'outline' | 'minimap' | 'backlinks') => void
}

export interface OutlineKeyboardNavResult {
  /** Current active heading index */
  activeIndex: number
  /** Navigate to next heading */
  goToNext: () => void
  /** Navigate to previous heading */
  goToPrevious: () => void
  /** Navigate to specific heading level */
  goToLevel: (level: number) => void
  /** Navigate to first heading */
  goToFirst: () => void
  /** Navigate to last heading */
  goToLast: () => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

export function useOutlineKeyboardNav({
  headings,
  activeHeadingSlug,
  enabled = true,
  onNavigateToHeading,
  onScrollToTop,
  onScrollToBottom,
  onToggleFocusMode,
  onToggleMinimap,
  onToggleBacklinks,
  onFocusSearch,
  onEscape,
  currentTab,
  onTabChange,
}: OutlineKeyboardNavOptions): OutlineKeyboardNavResult {
  // Calculate current index - guard against undefined headings
  const activeIndex = headings?.findIndex(h => h.slug === activeHeadingSlug) ?? -1
  
  // Navigate to next heading
  const goToNext = useCallback(() => {
    if (headings && activeIndex < headings.length - 1) {
      const nextHeading = headings[activeIndex + 1]
      onNavigateToHeading?.(nextHeading.slug)
    }
  }, [activeIndex, headings, onNavigateToHeading])
  
  // Navigate to previous heading
  const goToPrevious = useCallback(() => {
    if (activeIndex > 0 && headings) {
      const prevHeading = headings[activeIndex - 1]
      onNavigateToHeading?.(prevHeading.slug)
    } else if (activeIndex === -1 && headings?.length > 0) {
      // If no active heading, go to first
      onNavigateToHeading?.(headings[0].slug)
    }
  }, [activeIndex, headings, onNavigateToHeading])
  
  // Navigate to specific heading level (first occurrence)
  const goToLevel = useCallback((level: number) => {
    const levelHeading = headings?.find(h => h.level === level)
    if (levelHeading) {
      onNavigateToHeading?.(levelHeading.slug)
    }
  }, [headings, onNavigateToHeading])
  
  // Navigate to first heading
  const goToFirst = useCallback(() => {
    if (headings?.length > 0) {
      onNavigateToHeading?.(headings[0].slug)
    }
    onScrollToTop?.()
  }, [headings, onNavigateToHeading, onScrollToTop])
  
  // Navigate to last heading
  const goToLast = useCallback(() => {
    if (headings?.length > 0) {
      onNavigateToHeading?.(headings[headings.length - 1].slug)
    }
    onScrollToBottom?.()
  }, [headings, onNavigateToHeading, onScrollToBottom])
  
  // Main keyboard handler - ALL shortcuts require modifier keys to avoid
  // conflicts with WYSIWYG editors and text input
  useEffect(() => {
    if (!enabled) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is in an editable context
      const target = e.target as HTMLElement
      const isEditing = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') !== null ||
        target.closest('.ProseMirror') !== null || // TipTap/ProseMirror editors
        target.closest('.CodeMirror') !== null ||  // CodeMirror editors
        target.closest('.monaco-editor') !== null  // Monaco editors
      
      // === NAVIGATION WITH ALT KEY ===
      // Alt+Arrow keys for heading navigation (safe - doesn't conflict with typing)
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            goToNext()
            return
            
          case 'ArrowUp':
            e.preventDefault()
            goToPrevious()
            return
            
          case 'Home':
            e.preventDefault()
            goToFirst()
            return
            
          case 'End':
            e.preventDefault()
            goToLast()
            return
            
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
            e.preventDefault()
            goToLevel(parseInt(e.key, 10))
            return
        }
      }
      
      // === MODE TOGGLES WITH CTRL+SHIFT ===
      // Ctrl+Shift+F/M/B/O for mode toggles (standard modifier combo, won't conflict)
      if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
        switch (e.key.toUpperCase()) {
          case 'F':
            e.preventDefault()
            onToggleFocusMode?.()
            return
            
          case 'M':
            e.preventDefault()
            if (onToggleMinimap) {
              onToggleMinimap()
            } else if (onTabChange) {
              onTabChange(currentTab === 'minimap' ? 'outline' : 'minimap')
            }
            return
            
          case 'B':
            e.preventDefault()
            if (onToggleBacklinks) {
              onToggleBacklinks()
            } else if (onTabChange) {
              onTabChange(currentTab === 'backlinks' ? 'outline' : 'backlinks')
            }
            return
            
          case 'O':
            if (onTabChange) {
              e.preventDefault()
              onTabChange('outline')
            }
            return
        }
      }
      
      // === ESCAPE - only when not actively editing ===
      if (e.key === 'Escape' && !isEditing) {
        onEscape?.()
        return
      }
      
      // === SEARCH WITH CTRL+SHIFT+/ ===
      if (e.key === '/' && e.ctrlKey && e.shiftKey) {
        e.preventDefault()
        onFocusSearch?.()
        return
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    enabled,
    goToNext,
    goToPrevious,
    goToFirst,
    goToLast,
    goToLevel,
    onFocusSearch,
    onToggleFocusMode,
    onToggleMinimap,
    onToggleBacklinks,
    onEscape,
    currentTab,
    onTabChange,
  ])
  
  return {
    activeIndex,
    goToNext,
    goToPrevious,
    goToLevel,
    goToFirst,
    goToLast,
  }
}

export default useOutlineKeyboardNav

