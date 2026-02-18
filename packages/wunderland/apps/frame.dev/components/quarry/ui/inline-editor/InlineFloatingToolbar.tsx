/**
 * Inline Floating Toolbar - Medium-style formatting toolbar
 * @module codex/ui/InlineFloatingToolbar
 *
 * Appears when text is selected in the inline WYSIWYG editor.
 * Provides quick access to formatting options.
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Editor } from '@tiptap/react'
import {
  Bold, Italic, Strikethrough, Code, Highlighter,
  Heading1, Heading2, Heading3, Tag, Globe, ImagePlus,
  Sparkles,
} from 'lucide-react'
import type { SelectionAction } from '@/lib/ai/selectionActions'

interface InlineFloatingToolbarProps {
  editor: Editor
  isDark: boolean
  /** Optional callback to open the tag popover for the current block */
  onAddTag?: () => void
  /** Optional callback to research selected text */
  onResearch?: (text: string) => void
  /** Optional callback to generate image from selected text */
  onGenerateImage?: (prompt: string) => void
  /** Whether image generation button should be shown */
  showImageGen?: boolean
  /** Optional callback for AI actions on selected text */
  onAIAction?: (action: SelectionAction, text: string, options?: { language?: string }) => Promise<void>
  /** Whether to show AI actions button */
  showAIActions?: boolean
  /** Whether AI actions are enabled (has API key) */
  aiActionsEnabled?: boolean
  /** Callback to open AI menu */
  onOpenAIMenu?: (text: string) => void
}

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
  isDark: boolean
}

const ToolbarButton = ({ onClick, isActive, disabled, children, title, isDark }: ToolbarButtonProps) => {
  const className = [
    'p-1.5 rounded transition-all duration-150',
    isActive
      ? 'bg-cyan-500 text-white'
      : isDark
        ? 'text-zinc-200 hover:text-white hover:bg-zinc-600'
        : 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200',
    disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
  ].join(' ')

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      disabled={disabled}
      title={title}
      className={className}
    >
      {children}
    </button>
  )
}

const ToolbarDivider = ({ isDark }: { isDark: boolean }) => (
  <div className={`w-px h-5 mx-0.5 ${isDark ? 'bg-zinc-600' : 'bg-zinc-300'}`} />
)

/**
 * Floating toolbar that appears on text selection
 * Custom implementation that tracks selection position
 */
export function InlineFloatingToolbar({
  editor,
  isDark,
  onAddTag,
  onResearch,
  onGenerateImage,
  showImageGen = false,
  onAIAction,
  showAIActions = false,
  aiActionsEnabled = true,
  onOpenAIMenu,
}: InlineFloatingToolbarProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Update toolbar position based on selection
  useEffect(() => {
    if (!editor) return

    const updatePosition = () => {
      const { selection } = editor.state
      const { from, to } = selection

      // Only show when there's a selection (not just cursor)
      if (from === to) {
        setIsVisible(false)
        return
      }

      // Get the selection coordinates
      const view = editor.view
      const start = view.coordsAtPos(from)
      const end = view.coordsAtPos(to)

      // Calculate center position above selection
      const left = (start.left + end.left) / 2
      const top = start.top - 10 // Above the selection

      setPosition({ top, left })
      setIsVisible(true)
    }

    // Listen to selection changes
    editor.on('selectionUpdate', updatePosition)
    editor.on('focus', updatePosition)
    editor.on('blur', () => setIsVisible(false))

    return () => {
      editor.off('selectionUpdate', updatePosition)
      editor.off('focus', updatePosition)
      editor.off('blur', () => setIsVisible(false))
    }
  }, [editor])

  if (!editor || !isVisible || !position) return null

  const containerClassName = [
    'fixed z-50 flex items-center gap-0.5 px-1.5 py-1 rounded-lg shadow-xl border',
    isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200',
    'animate-in fade-in-0 zoom-in-95 duration-150',
  ].join(' ')

  return (
    <div
      ref={toolbarRef}
      className={containerClassName}
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%)',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
        isDark={isDark}
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
        isDark={isDark}
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
        isDark={isDark}
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider isDark={isDark} />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Cmd+B)"
        isDark={isDark}
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Cmd+I)"
        isDark={isDark}
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
        isDark={isDark}
      >
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider isDark={isDark} />

      {/* Code & Highlight */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Inline Code (Cmd+E)"
        isDark={isDark}
      >
        <Code className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive('highlight')}
        title="Highlight"
        isDark={isDark}
      >
        <Highlighter className="w-4 h-4" />
      </ToolbarButton>

      {/* AI Actions */}
      {showAIActions && onOpenAIMenu && (
        <>
          <ToolbarDivider isDark={isDark} />
          <ToolbarButton
            onClick={() => {
              const { from, to } = editor.state.selection
              const selectedText = editor.state.doc.textBetween(from, to, ' ')
              if (selectedText) onOpenAIMenu(selectedText)
            }}
            disabled={!aiActionsEnabled}
            title={aiActionsEnabled ? "AI Actions (Cmd+Shift+A)" : "Configure API key in Settings"}
            isDark={isDark}
          >
            <Sparkles className="w-4 h-4" />
          </ToolbarButton>
        </>
      )}

      {/* Research & Tagging */}
      {(onResearch || onAddTag) && (
        <>
          <ToolbarDivider isDark={isDark} />
          {onResearch && (
            <ToolbarButton
              onClick={() => {
                const { from, to } = editor.state.selection
                const selectedText = editor.state.doc.textBetween(from, to, ' ')
                if (selectedText) onResearch(selectedText)
              }}
              title="Research (Cmd+Shift+R)"
              isDark={isDark}
            >
              <Globe className="w-4 h-4" />
            </ToolbarButton>
          )}
          {onAddTag && (
            <ToolbarButton
              onClick={onAddTag}
              title="Add Tag (Cmd+T)"
              isDark={isDark}
            >
              <Tag className="w-4 h-4" />
            </ToolbarButton>
          )}
        </>
      )}

      {/* AI Image Generation */}
      {showImageGen && onGenerateImage && (
        <>
          <ToolbarDivider isDark={isDark} />
          <ToolbarButton
            onClick={() => {
              const { from, to } = editor.state.selection
              const selectedText = editor.state.doc.textBetween(from, to, ' ')
              onGenerateImage(selectedText || '')
            }}
            title="Generate Image (Cmd+Shift+I)"
            isDark={isDark}
          >
            <ImagePlus className="w-4 h-4" />
          </ToolbarButton>
        </>
      )}
    </div>
  )
}

export default InlineFloatingToolbar
