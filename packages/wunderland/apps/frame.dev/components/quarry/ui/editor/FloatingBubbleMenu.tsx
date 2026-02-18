/**
 * FloatingBubbleMenu - Medium-style floating toolbar
 * @module components/quarry/ui/editor/FloatingBubbleMenu
 *
 * A clean, minimal floating toolbar that appears on text selection.
 * Inspired by Medium's editor experience.
 */

'use client'

import React, { useState, useCallback } from 'react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link2,
  Highlighter,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Sparkles,
  ChevronDown,
  X,
  Languages,
  Hash,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'
import { type SelectionAction, SELECTION_ACTIONS } from '@/lib/ai/selectionActions'

// ============================================================================
// TYPES
// ============================================================================

export interface FloatingBubbleMenuProps {
  editor: Editor | null
  theme?: ThemeName
  onAIAction?: (action: SelectionAction, options?: { language?: string }) => void
  enableAI?: boolean
  /** Callback when Tag button is clicked (shows inline tag editor) */
  onTagAction?: (selectedText: string, position: { x: number; y: number }) => void
}

interface ToolButtonProps {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  onClick: () => void
  isDark: boolean
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function ToolButton({ icon, label, isActive, onClick, isDark }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        // Larger touch targets: p-2.5 on mobile, p-1.5 on desktop
        'p-2 sm:p-1.5 rounded transition-all duration-150',
        'hover:scale-105 active:scale-95',
        // Touch-friendly
        'touch-manipulation',
        isActive
          ? isDark
            ? 'bg-amber-500/20 text-amber-400'
            : 'bg-amber-100 text-amber-700'
          : isDark
            ? 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
            : 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
      )}
    >
      {icon}
    </button>
  )
}

function Divider({ isDark }: { isDark: boolean }) {
  return (
    <div className={cn('w-px h-5 mx-1', isDark ? 'bg-zinc-700' : 'bg-zinc-300')} />
  )
}

// ============================================================================
// AI ACTIONS DROPDOWN
// ============================================================================

interface AIActionsDropdownProps {
  onAction: (action: SelectionAction, options?: { language?: string }) => void
  isDark: boolean
  onClose: () => void
}

function AIActionsDropdown({ onAction, isDark, onClose }: AIActionsDropdownProps) {
  const [showLanguages, setShowLanguages] = useState(false)

  const primaryActions: { action: SelectionAction; label: string; icon: React.ReactNode }[] = [
    { action: 'improve', label: 'Improve', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { action: 'shorten', label: 'Make shorter', icon: null },
    { action: 'lengthen', label: 'Make longer', icon: null },
    { action: 'grammar', label: 'Fix grammar', icon: null },
    { action: 'tone_professional', label: 'Professional tone', icon: null },
    { action: 'tone_casual', label: 'Casual tone', icon: null },
    { action: 'summarize', label: 'Summarize', icon: null },
  ]

  const languages = [
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ko', name: 'Korean' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'it', name: 'Italian' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: -5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -5, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'absolute top-full left-0 mt-2 py-1.5 rounded-lg shadow-xl border z-50 min-w-[160px]',
        isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
      )}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className={cn(
          'absolute -top-2 -right-2 p-1 rounded-full shadow-md',
          isDark ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'bg-white text-zinc-500 hover:text-zinc-700'
        )}
      >
        <X className="w-3 h-3" />
      </button>

      {/* Primary actions */}
      {primaryActions.map(({ action, label, icon }) => (
        <button
          key={action}
          onClick={() => {
            onAction(action)
            onClose()
          }}
          className={cn(
            // Larger touch targets on mobile
            'w-full flex items-center gap-2 px-3 py-2.5 sm:py-1.5 text-sm text-left transition-colors',
            'touch-manipulation',
            isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
          )}
        >
          {icon && <span className="w-4 flex items-center justify-center">{icon}</span>}
          {!icon && <span className="w-4" />}
          {label}
        </button>
      ))}

      <div className={cn('my-1.5 h-px', isDark ? 'bg-zinc-700' : 'bg-zinc-200')} />

      {/* Translate dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowLanguages(!showLanguages)}
          className={cn(
            // Larger touch targets on mobile
            'w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:py-1.5 text-sm text-left transition-colors',
            'touch-manipulation',
            isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
          )}
        >
          <span className="flex items-center gap-2">
            <Languages className="w-4 h-4" />
            Translate
          </span>
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showLanguages && 'rotate-180')} />
        </button>

        <AnimatePresence>
          {showLanguages && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className={cn('py-1 ml-4 border-l', isDark ? 'border-zinc-700' : 'border-zinc-200')}>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onAction('translate', { language: lang.code })
                      onClose()
                    }}
                    className={cn(
                      // Larger touch targets on mobile
                      'w-full px-3 py-2 sm:py-1 text-xs text-left transition-colors',
                      'touch-manipulation',
                      isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
                    )}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FloatingBubbleMenu({
  editor,
  theme = 'dark',
  onAIAction,
  enableAI = true,
  onTagAction,
}: FloatingBubbleMenuProps) {
  const [showAIDropdown, setShowAIDropdown] = useState(false)
  const isDark = isDarkTheme(theme)

  const handleLinkClick = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Enter URL:', previousUrl || '')

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  if (!editor) return null

  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: 'top',
        offset: { mainAxis: 8 },
      }}
      className="z-50"
    >
      <motion.div
        initial={{ opacity: 0, y: 5, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'flex items-center gap-0.5 px-2 py-1.5 rounded-lg shadow-xl border',
          isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
        )}
      >
        {/* Text formatting */}
        <ToolButton
          icon={<Bold className="w-4 h-4" />}
          label="Bold (Cmd+B)"
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          isDark={isDark}
        />
        <ToolButton
          icon={<Italic className="w-4 h-4" />}
          label="Italic (Cmd+I)"
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isDark={isDark}
        />
        <ToolButton
          icon={<Underline className="w-4 h-4" />}
          label="Underline (Cmd+U)"
          isActive={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isDark={isDark}
        />
        <ToolButton
          icon={<Strikethrough className="w-4 h-4" />}
          label="Strikethrough"
          isActive={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isDark={isDark}
        />

        <Divider isDark={isDark} />

        {/* Code and highlight */}
        <ToolButton
          icon={<Code className="w-4 h-4" />}
          label="Inline code"
          isActive={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          isDark={isDark}
        />
        <ToolButton
          icon={<Highlighter className="w-4 h-4" />}
          label="Highlight"
          isActive={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isDark={isDark}
        />
        {onTagAction && (
          <ToolButton
            icon={<Hash className="w-4 h-4" />}
            label="Add Block Tag (#)"
            onClick={() => {
              const selection = editor.state.selection
              const selectedText = editor.state.doc.textBetween(selection.from, selection.to)
              if (selectedText) {
                // Get cursor position for popover
                const coords = editor.view.coordsAtPos(selection.from)
                onTagAction(selectedText, { x: coords.left, y: coords.bottom })
              }
            }}
            isDark={isDark}
          />
        )}

        <Divider isDark={isDark} />

        {/* Link */}
        <ToolButton
          icon={<Link2 className="w-4 h-4" />}
          label="Add link"
          isActive={editor.isActive('link')}
          onClick={handleLinkClick}
          isDark={isDark}
        />

        <Divider isDark={isDark} />

        {/* Headings */}
        <ToolButton
          icon={<Heading1 className="w-4 h-4" />}
          label="Heading 1"
          isActive={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isDark={isDark}
        />
        <ToolButton
          icon={<Heading2 className="w-4 h-4" />}
          label="Heading 2"
          isActive={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isDark={isDark}
        />
        <ToolButton
          icon={<Quote className="w-4 h-4" />}
          label="Quote"
          isActive={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isDark={isDark}
        />

        {/* AI Actions */}
        {enableAI && onAIAction && (
          <>
            <Divider isDark={isDark} />
            <div className="relative">
              <button
                onClick={() => setShowAIDropdown(!showAIDropdown)}
                className={cn(
                  // Larger touch targets on mobile
                  'flex items-center gap-1 px-2.5 py-2 sm:px-2 sm:py-1 rounded transition-all duration-150',
                  'hover:scale-105 active:scale-95',
                  'touch-manipulation',
                  showAIDropdown
                    ? isDark
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-purple-100 text-purple-700'
                    : isDark
                      ? 'text-purple-400 hover:bg-zinc-700'
                      : 'text-purple-600 hover:bg-zinc-200'
                )}
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-medium">AI</span>
                <ChevronDown className={cn('w-3 h-3 transition-transform', showAIDropdown && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {showAIDropdown && (
                  <AIActionsDropdown
                    onAction={onAIAction}
                    isDark={isDark}
                    onClose={() => setShowAIDropdown(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>
    </BubbleMenu>
  )
}

export default FloatingBubbleMenu
