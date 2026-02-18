/**
 * Focus Mode Overlay Component
 * @module codex/ui/outline/FocusMode
 *
 * Creates a distraction-free reading experience by:
 * - Dimming non-active sections
 * - Highlighting the current paragraph/block
 * - Smooth transitions between focus areas
 * - Keyboard navigation support
 */

'use client'

import React, { useEffect, useCallback, useState, useRef } from 'react'
import { Focus, X, ChevronUp, ChevronDown, Minimize2, Maximize2 } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface FocusModeProps {
  /** Whether focus mode is active */
  isActive: boolean
  /** Current focused block ID */
  focusedBlockId?: string
  /** All available block IDs for navigation */
  blockIds: string[]
  /** Content container ref */
  contentRef?: React.RefObject<HTMLElement>
  /** Theme */
  theme?: string
  /** Callback to toggle focus mode */
  onToggle: () => void
  /** Callback when focused block changes */
  onBlockChange?: (blockId: string) => void
  /** Callback to scroll to block */
  onScrollToBlock?: (blockId: string) => void
  /** Intensity of dim effect (0-1) */
  dimIntensity?: number
  /** Typewriter mode - keep focus point at vertical center */
  typewriterMode?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════════════ */

const focusModeStyles = `
  /* Focus mode global styles - injected when active */
  .focus-mode-active [data-block-id]:not(.focus-mode-focused) {
    opacity: var(--focus-dim-intensity, 0.3) !important;
    filter: blur(0.5px);
    transition: opacity 0.3s ease, filter 0.3s ease;
  }
  
  .focus-mode-active [data-block-id].focus-mode-focused {
    opacity: 1 !important;
    filter: none;
    transition: opacity 0.3s ease, filter 0.3s ease;
    position: relative;
    z-index: 10;
  }
  
  .focus-mode-active [data-block-id].focus-mode-adjacent {
    opacity: calc(var(--focus-dim-intensity, 0.3) + 0.3) !important;
    filter: none;
    transition: opacity 0.3s ease, filter 0.3s ease;
  }
  
  /* Spotlight effect around focused block */
  .focus-mode-active [data-block-id].focus-mode-focused::before {
    content: '';
    position: absolute;
    inset: -8px -16px;
    border-radius: 8px;
    background: var(--focus-spotlight-color, rgba(251, 191, 36, 0.05));
    border-left: 2px solid var(--focus-accent-color, rgba(251, 191, 36, 0.5));
    z-index: -1;
    animation: focus-spotlight-fade-in 0.3s ease forwards;
  }
  
  @keyframes focus-spotlight-fade-in {
    from {
      opacity: 0;
      transform: scaleY(0.95);
    }
    to {
      opacity: 1;
      transform: scaleY(1);
    }
  }
  
  /* Typewriter mode - centered scroll */
  .focus-mode-typewriter {
    scroll-padding-top: 40vh;
    scroll-padding-bottom: 40vh;
  }
`

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function FocusMode({
  isActive,
  focusedBlockId,
  blockIds,
  contentRef,
  theme = 'light',
  onToggle,
  onBlockChange,
  onScrollToBlock,
  dimIntensity = 0.25,
  typewriterMode = false,
}: FocusModeProps) {
  const isDark = theme?.includes('dark')
  const [isMinimized, setIsMinimized] = useState(false)
  const styleRef = useRef<HTMLStyleElement | null>(null)
  
  // Current focus index
  const currentIndex = focusedBlockId ? blockIds.indexOf(focusedBlockId) : -1
  
  // Inject/remove focus mode styles
  useEffect(() => {
    if (isActive) {
      const style = document.createElement('style')
      style.id = 'focus-mode-styles'
      style.textContent = focusModeStyles
      document.head.appendChild(style)
      styleRef.current = style
      
      // Set CSS variables
      document.documentElement.style.setProperty('--focus-dim-intensity', String(dimIntensity))
      document.documentElement.style.setProperty(
        '--focus-spotlight-color',
        isDark ? 'rgba(251, 191, 36, 0.08)' : 'rgba(251, 191, 36, 0.1)'
      )
      document.documentElement.style.setProperty(
        '--focus-accent-color',
        isDark ? 'rgba(251, 191, 36, 0.6)' : 'rgba(251, 191, 36, 0.7)'
      )
      
      // Add class to content container
      if (contentRef?.current) {
        contentRef.current.classList.add('focus-mode-active')
        if (typewriterMode) {
          contentRef.current.classList.add('focus-mode-typewriter')
        }
      }
      
      return () => {
        style.remove()
        document.documentElement.style.removeProperty('--focus-dim-intensity')
        document.documentElement.style.removeProperty('--focus-spotlight-color')
        document.documentElement.style.removeProperty('--focus-accent-color')
        
        if (contentRef?.current) {
          contentRef.current.classList.remove('focus-mode-active', 'focus-mode-typewriter')
        }
      }
    }
  }, [isActive, dimIntensity, isDark, typewriterMode, contentRef])
  
  // Apply focus classes to blocks
  useEffect(() => {
    if (!isActive || !contentRef?.current || !focusedBlockId) return
    
    const container = contentRef.current
    const blocks = container.querySelectorAll('[data-block-id]')
    
    blocks.forEach((block) => {
      const blockId = block.getAttribute('data-block-id')
      const blockIndex = blockIds.indexOf(blockId || '')
      
      block.classList.remove('focus-mode-focused', 'focus-mode-adjacent')
      
      if (blockId === focusedBlockId) {
        block.classList.add('focus-mode-focused')
      } else if (
        blockIndex !== -1 &&
        currentIndex !== -1 &&
        Math.abs(blockIndex - currentIndex) === 1
      ) {
        block.classList.add('focus-mode-adjacent')
      }
    })
    
    return () => {
      blocks.forEach((block) => {
        block.classList.remove('focus-mode-focused', 'focus-mode-adjacent')
      })
    }
  }, [isActive, focusedBlockId, blockIds, currentIndex, contentRef])
  
  // Navigate to previous block
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevBlockId = blockIds[currentIndex - 1]
      onBlockChange?.(prevBlockId)
      onScrollToBlock?.(prevBlockId)
    }
  }, [currentIndex, blockIds, onBlockChange, onScrollToBlock])
  
  // Navigate to next block
  const handleNext = useCallback(() => {
    if (currentIndex < blockIds.length - 1) {
      const nextBlockId = blockIds[currentIndex + 1]
      onBlockChange?.(nextBlockId)
      onScrollToBlock?.(nextBlockId)
    }
  }, [currentIndex, blockIds, onBlockChange, onScrollToBlock])
  
  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is in an editable context
      const target = e.target as HTMLElement
      const isEditing = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') !== null ||
        target.closest('.ProseMirror') !== null
      
      // Alt+Arrow for navigation (safe for editors)
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          handleNext()
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          handlePrevious()
          return
        }
      }
      
      // Escape to exit (only when not editing)
      if (e.key === 'Escape' && !isEditing) {
        e.preventDefault()
        onToggle()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, handleNext, handlePrevious, onToggle])
  
  if (!isActive) return null

  return (
    <div
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-2
        ${isMinimized ? 'px-2 py-1' : 'px-4 py-2'}
        rounded-full shadow-2xl border backdrop-blur-xl
        animate-in slide-in-from-bottom-4 duration-300
        ${isDark
          ? 'bg-zinc-900/90 border-zinc-700 text-zinc-100'
          : 'bg-white/90 border-zinc-200 text-zinc-900'
        }
      `}
      role="toolbar"
      aria-label="Focus Mode Controls"
    >
      {/* Focus icon */}
      <div className={`
        flex items-center justify-center w-8 h-8 rounded-full
        ${isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'}
      `}>
        <Focus className="w-4 h-4" />
      </div>
      
      {!isMinimized && (
        <>
          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {currentIndex + 1} / {blockIds.length}
            </span>
            
            {/* Progress bar */}
            <div className={`
              w-24 h-1.5 rounded-full overflow-hidden
              ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
            `}>
              <div
                className={`h-full transition-all duration-300 ${isDark ? 'bg-amber-500' : 'bg-amber-500'}`}
                style={{ width: `${((currentIndex + 1) / blockIds.length) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Navigation */}
          <div className={`flex items-center gap-1 pl-2 border-l ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <button
              onClick={handlePrevious}
              disabled={currentIndex <= 0}
              className={`
                p-1.5 rounded-full transition-colors
                ${currentIndex <= 0
                  ? 'opacity-50 cursor-not-allowed'
                  : isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'
                }
              `}
              title="Previous block (Alt+↑)"
              aria-label="Previous block"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleNext}
              disabled={currentIndex >= blockIds.length - 1}
              className={`
                p-1.5 rounded-full transition-colors
                ${currentIndex >= blockIds.length - 1
                  ? 'opacity-50 cursor-not-allowed'
                  : isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'
                }
              `}
              title="Next block (Alt+↓)"
              aria-label="Next block"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          
          {/* Keyboard hint */}
          <div className={`
            flex items-center gap-1 text-[10px] pl-2 border-l
            ${isDark ? 'border-zinc-700 text-zinc-500' : 'border-zinc-200 text-zinc-400'}
          `}>
            <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>Alt</kbd>
            <span>+</span>
            <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>↑↓</kbd>
            <span>nav</span>
          </div>
        </>
      )}
      
      {/* Minimize/Maximize */}
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className={`
          p-1.5 rounded-full transition-colors
          ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
        `}
        title={isMinimized ? 'Expand controls' : 'Minimize controls'}
      >
        {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
      </button>
      
      {/* Close */}
      <button
        onClick={onToggle}
        className={`
          p-1.5 rounded-full transition-colors
          ${isDark ? 'hover:bg-red-900/50 text-zinc-400 hover:text-red-400' : 'hover:bg-red-50 text-zinc-500 hover:text-red-500'}
        `}
        title="Exit focus mode (Esc)"
        aria-label="Exit focus mode"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

