/**
 * TemplateContentEditor Component
 * @module codex/ui/TemplateContentEditor
 *
 * @description
 * WYSIWYG editor for template content with placeholder insertion.
 * Wraps TiptapEditor with template-specific features:
 * - Placeholder toolbar for inserting {fieldName} tokens
 * - Syntax highlighting for placeholders
 * - Disabled citation/research features
 */

'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Plus,
  Braces,
  ChevronDown,
} from 'lucide-react'
import { PlaceholderMark } from '../tiptap/PlaceholderMark'
import type { TemplateField } from '@/components/quarry/templates/types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface TemplateContentEditorProps {
  /** Current content (markdown or HTML) */
  content: string
  /** Content change callback */
  onChange: (content: string) => void
  /** Available template fields for placeholder insertion */
  fields: TemplateField[]
  /** Placeholder text when empty */
  placeholder?: string
  /** Dark mode */
  isDark?: boolean
  /** Minimum height */
  minHeight?: string
  /** Disabled state */
  disabled?: boolean
  /** Editor ref for external control */
  editorRef?: React.MutableRefObject<Editor | null>
}

/* ═══════════════════════════════════════════════════════════════════════════
   MENU BUTTON COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface MenuButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
  isDark: boolean
}

const MenuButton = ({ onClick, isActive, disabled, children, title, isDark }: MenuButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      p-1.5 rounded-md transition-all duration-150
      ${isActive
        ? isDark
          ? 'bg-cyan-600/30 text-cyan-400'
          : 'bg-cyan-100 text-cyan-700'
        : isDark
          ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
      }
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    {children}
  </button>
)

const MenuDivider = ({ isDark }: { isDark: boolean }) => (
  <div className={`w-px h-4 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
)

/* ═══════════════════════════════════════════════════════════════════════════
   PLACEHOLDER DROPDOWN
═══════════════════════════════════════════════════════════════════════════ */

interface PlaceholderDropdownProps {
  fields: TemplateField[]
  onInsert: (fieldName: string) => void
  isDark: boolean
}

function PlaceholderDropdown({ fields, onInsert, isDark }: PlaceholderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  if (fields.length === 0) return null

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors
          ${isDark
            ? 'text-cyan-400 hover:bg-cyan-900/30'
            : 'text-cyan-600 hover:bg-cyan-50'
          }
        `}
        title="Insert placeholder"
      >
        <Braces className="w-4 h-4" />
        <span>Insert Field</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className={`
              absolute top-full left-0 mt-1 z-50 min-w-48 py-1 rounded-lg shadow-lg border
              ${isDark
                ? 'bg-zinc-800 border-zinc-700'
                : 'bg-white border-zinc-200'
              }
            `}
          >
            {fields.map((field) => (
              <button
                key={field.name}
                type="button"
                onClick={() => {
                  onInsert(field.name)
                  setIsOpen(false)
                }}
                className={`
                  w-full text-left px-3 py-2 text-sm transition-colors
                  ${isDark
                    ? 'hover:bg-zinc-700 text-zinc-200'
                    : 'hover:bg-zinc-50 text-zinc-700'
                  }
                `}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{field.label}</span>
                  <code className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                    {`{${field.name}}`}
                  </code>
                </div>
                {field.description && (
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {field.description}
                  </p>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function TemplateContentEditor({
  content,
  onChange,
  fields,
  placeholder = 'Write your template content here...',
  isDark = false,
  minHeight = '200px',
  disabled = false,
  editorRef,
}: TemplateContentEditorProps) {
  const internalEditorRef = useRef<Editor | null>(null)

  // Create editor with simplified extensions for template editing
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Typography,
      PlaceholderMark,
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Store editor reference
  React.useEffect(() => {
    if (editor) {
      internalEditorRef.current = editor
      if (editorRef) {
        editorRef.current = editor
      }
    }
  }, [editor, editorRef])

  // Insert placeholder at cursor position
  const insertPlaceholder = useCallback((fieldName: string) => {
    if (!editor) return

    const placeholderText = `{${fieldName}}`
    editor
      .chain()
      .focus()
      .insertContent(placeholderText)
      .run()
  }, [editor])

  if (!editor) {
    return (
      <div
        className={`animate-pulse rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}
        style={{ minHeight }}
      />
    )
  }

  return (
    <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-white'}`}>
      {/* Toolbar */}
      <div className={`flex items-center flex-wrap gap-1 px-2 py-1.5 border-b ${isDark ? 'border-zinc-700 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50'}`}>
        {/* Undo/Redo */}
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (⌘Z)"
          isDark={isDark}
        >
          <Undo className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (⌘⇧Z)"
          isDark={isDark}
        >
          <Redo className="w-4 h-4" />
        </MenuButton>

        <MenuDivider isDark={isDark} />

        {/* Text formatting */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (⌘B)"
          isDark={isDark}
        >
          <Bold className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (⌘I)"
          isDark={isDark}
        >
          <Italic className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline Code (⌘E)"
          isDark={isDark}
        >
          <Code className="w-4 h-4" />
        </MenuButton>

        <MenuDivider isDark={isDark} />

        {/* Headings */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
          isDark={isDark}
        >
          <Heading1 className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
          isDark={isDark}
        >
          <Heading2 className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
          isDark={isDark}
        >
          <Heading3 className="w-4 h-4" />
        </MenuButton>

        <MenuDivider isDark={isDark} />

        {/* Lists */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
          isDark={isDark}
        >
          <List className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
          isDark={isDark}
        >
          <ListOrdered className="w-4 h-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
          isDark={isDark}
        >
          <Quote className="w-4 h-4" />
        </MenuButton>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Placeholder insertion dropdown */}
        <PlaceholderDropdown
          fields={fields}
          onInsert={insertPlaceholder}
          isDark={isDark}
        />
      </div>

      {/* Editor Content */}
      <div
        className={`prose max-w-none ${isDark ? 'prose-invert' : ''}`}
        style={{ minHeight }}
      >
        <EditorContent
          editor={editor}
          className={`
            px-4 py-3 min-h-full outline-none
            [&_.ProseMirror]:outline-none
            [&_.ProseMirror]:min-h-[inherit]
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-zinc-400
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none
          `}
        />
      </div>
    </div>
  )
}

export { TemplateContentEditor }
