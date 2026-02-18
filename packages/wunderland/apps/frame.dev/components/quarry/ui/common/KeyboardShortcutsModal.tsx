/**
 * Keyboard Shortcuts Modal
 * @module components/quarry/ui/common/KeyboardShortcutsModal
 * 
 * @description
 * Shows all available keyboard shortcuts for the editor.
 * Toggle with ? key or help button.
 * 
 * @example
 * ```tsx
 * <KeyboardShortcutsModal 
 *   isOpen={showShortcuts}
 *   onClose={() => setShowShortcuts(false)}
 *   context="editor"
 * />
 * ```
 */

'use client'

import React, { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModalAccessibility } from '@/components/quarry/hooks'

// ============================================================================
// TYPES
// ============================================================================

export interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
  context?: 'editor' | 'flashcards' | 'quiz' | 'general'
  isDark?: boolean
}

interface ShortcutGroup {
  title: string
  shortcuts: { keys: string[]; description: string }[]
}

// ============================================================================
// SHORTCUTS DATA
// ============================================================================

const editorShortcuts: ShortcutGroup[] = [
  {
    title: 'Text Formatting',
    shortcuts: [
      { keys: ['⌘', 'B'], description: 'Bold' },
      { keys: ['⌘', 'I'], description: 'Italic' },
      { keys: ['⌘', 'U'], description: 'Underline' },
      { keys: ['⌘', 'E'], description: 'Inline code' },
      { keys: ['⌘', 'Shift', 'X'], description: 'Strikethrough' },
    ],
  },
  {
    title: 'Headings',
    shortcuts: [
      { keys: ['⌘', 'Alt', '1'], description: 'Heading 1' },
      { keys: ['⌘', 'Alt', '2'], description: 'Heading 2' },
      { keys: ['⌘', 'Alt', '3'], description: 'Heading 3' },
    ],
  },
  {
    title: 'Lists & Blocks',
    shortcuts: [
      { keys: ['⌘', 'Shift', '7'], description: 'Ordered list' },
      { keys: ['⌘', 'Shift', '8'], description: 'Bullet list' },
      { keys: ['⌘', 'Shift', '9'], description: 'Task list' },
      { keys: ['⌘', 'Shift', 'B'], description: 'Blockquote' },
      { keys: ['```'], description: 'Code block' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['⌘', 'S'], description: 'Save' },
      { keys: ['⌘', 'Z'], description: 'Undo' },
      { keys: ['⌘', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['⌘', 'K'], description: 'Insert link' },
      { keys: ['Esc'], description: 'Save (without exit)' },
    ],
  },
  {
    title: 'AI & Research',
    shortcuts: [
      { keys: ['⌘', 'Shift', 'A'], description: 'AI actions menu' },
      { keys: ['⌘', 'Shift', 'R'], description: 'Research panel' },
      { keys: ['⌘', 'Shift', 'C'], description: 'Add citation' },
    ],
  },
]

const flashcardShortcuts: ShortcutGroup[] = [
  {
    title: 'Review',
    shortcuts: [
      { keys: ['Space'], description: 'Flip card' },
      { keys: ['1'], description: 'Again (forgot)' },
      { keys: ['2'], description: 'Hard' },
      { keys: ['3'], description: 'Good' },
      { keys: ['4'], description: 'Easy' },
      { keys: ['←', '→'], description: 'Navigate cards' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['E'], description: 'Edit card' },
      { keys: ['S'], description: 'Star/unstar card' },
      { keys: ['D'], description: 'Delete card' },
      { keys: ['Esc'], description: 'Exit review' },
    ],
  },
]

const quizShortcuts: ShortcutGroup[] = [
  {
    title: 'Answering',
    shortcuts: [
      { keys: ['1', '2', '3', '4'], description: 'Select answer option' },
      { keys: ['Enter'], description: 'Submit / Next question' },
      { keys: ['Space'], description: 'Skip question' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['←', '→'], description: 'Previous / Next question' },
      { keys: ['Esc'], description: 'Exit quiz' },
    ],
  },
]

const generalShortcuts: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['⌘', '/'], description: 'Toggle sidebar' },
      { keys: ['⌘', '\\'], description: 'Toggle right panel' },
    ],
  },
]

function getShortcutsForContext(context: string): ShortcutGroup[] {
  switch (context) {
    case 'editor':
      return [...generalShortcuts, ...editorShortcuts]
    case 'flashcards':
      return [...generalShortcuts, ...flashcardShortcuts]
    case 'quiz':
      return [...generalShortcuts, ...quizShortcuts]
    default:
      return generalShortcuts
  }
}

// ============================================================================
// KEY BADGE COMPONENT
// ============================================================================

function KeyBadge({ children, isDark }: { children: string; isDark: boolean }) {
  // Special handling for modifier keys
  const isModifier = ['⌘', 'Alt', 'Shift', 'Ctrl'].includes(children)
  
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-mono font-medium',
        'border shadow-sm min-w-[1.5rem]',
        isModifier ? 'px-2' : '',
        isDark
          ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
          : 'bg-zinc-100 border-zinc-300 text-zinc-700'
      )}
    >
      {children}
    </span>
  )
}

// ============================================================================
// HOOK FOR GLOBAL ? KEY
// ============================================================================

export function useKeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = React.useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for ? key (Shift + /)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Don't trigger if in an input/textarea
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return
        }
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  context = 'editor',
  isDark = false,
}: KeyboardShortcutsModalProps) {
  // Accessibility hook
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    modalId: 'keyboard-shortcuts-modal',
    trapFocus: true,
    lockScroll: true,
  })

  const shortcuts = getShortcutsForContext(context)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={backdropRef as React.RefObject<HTMLDivElement>}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            ref={contentRef as React.RefObject<HTMLDivElement>}
            {...modalProps}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-full max-w-2xl max-h-[80vh] overflow-hidden',
              'rounded-2xl border shadow-2xl',
              isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
            )}
          >
            {/* Header */}
            <div className={cn(
              'flex items-center justify-between p-4 border-b',
              isDark ? 'border-zinc-700' : 'border-zinc-200'
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                )}>
                  <Keyboard className={cn('w-5 h-5', isDark ? 'text-zinc-300' : 'text-zinc-600')} />
                </div>
                <div>
                  <h2 
                    id="keyboard-shortcuts-modal-title"
                    className={cn(
                      'text-lg font-semibold',
                      isDark ? 'text-zinc-100' : 'text-zinc-900'
                    )}
                  >
                    Keyboard Shortcuts
                  </h2>
                  <p className={cn(
                    'text-sm',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}>
                    Press <KeyBadge isDark={isDark}>?</KeyBadge> to toggle this panel
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark 
                    ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' 
                    : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800'
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shortcuts.map((group, groupIndex) => (
                  <div key={groupIndex} className="space-y-2">
                    <h3 className={cn(
                      'text-xs font-semibold uppercase tracking-wide',
                      isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )}>
                      {group.title}
                    </h3>
                    <div className="space-y-1.5">
                      {group.shortcuts.map((shortcut, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex items-center justify-between py-1.5 px-2 rounded-lg',
                            isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
                          )}
                        >
                          <span className={cn(
                            'text-sm',
                            isDark ? 'text-zinc-300' : 'text-zinc-700'
                          )}>
                            {shortcut.description}
                          </span>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, j) => (
                              <React.Fragment key={j}>
                                <KeyBadge isDark={isDark}>{key}</KeyBadge>
                                {j < shortcut.keys.length - 1 && (
                                  <span className={cn(
                                    'text-xs',
                                    isDark ? 'text-zinc-600' : 'text-zinc-400'
                                  )}>
                                    +
                                  </span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className={cn(
              'p-3 border-t text-center',
              isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'
            )}>
              <p className={cn(
                'text-xs',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}>
                On Windows/Linux, use Ctrl instead of ⌘
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default KeyboardShortcutsModal

