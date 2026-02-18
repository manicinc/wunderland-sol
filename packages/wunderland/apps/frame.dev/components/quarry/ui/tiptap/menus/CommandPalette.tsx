'use client'

/**
 * CommandPalette - VS Code/Notion style Cmd+K command palette
 *
 * Full-screen modal palette for quick actions, commands,
 * and document navigation. Triggered by Cmd+K / Ctrl+K.
 *
 * @module components/quarry/ui/tiptap/menus/CommandPalette
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Editor } from '@tiptap/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Command,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code2,
  Minus,
  Image as ImageIcon,
  Table2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Focus,
  Moon,
  Sun,
  Keyboard,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface PaletteCommand {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  category: 'insert' | 'format' | 'edit' | 'view' | 'navigate'
  keywords: string[]
  shortcut?: string
  action: (editor: Editor, context?: CommandPaletteContext) => void
}

interface CommandPaletteContext {
  toggleFocusMode?: () => void
  toggleTheme?: () => void
}

interface CommandPaletteProps {
  editor: Editor
  isOpen: boolean
  onClose: () => void
  isDark?: boolean
  context?: CommandPaletteContext
}

// ============================================================================
// COMMANDS
// ============================================================================

const createCommands = (): PaletteCommand[] => [
  // Insert commands
  {
    id: 'insert-paragraph',
    label: 'Insert Paragraph',
    description: 'Add plain text block',
    icon: <Type className="w-4 h-4" />,
    category: 'insert',
    keywords: ['text', 'paragraph', 'plain'],
    action: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    id: 'insert-h1',
    label: 'Insert Heading 1',
    description: 'Add large heading',
    icon: <Heading1 className="w-4 h-4" />,
    category: 'insert',
    keywords: ['heading', 'h1', 'title'],
    shortcut: '⌘⌥1',
    action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'insert-h2',
    label: 'Insert Heading 2',
    description: 'Add medium heading',
    icon: <Heading2 className="w-4 h-4" />,
    category: 'insert',
    keywords: ['heading', 'h2', 'subtitle'],
    shortcut: '⌘⌥2',
    action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'insert-h3',
    label: 'Insert Heading 3',
    description: 'Add small heading',
    icon: <Heading3 className="w-4 h-4" />,
    category: 'insert',
    keywords: ['heading', 'h3'],
    shortcut: '⌘⌥3',
    action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'insert-bullet-list',
    label: 'Insert Bullet List',
    icon: <List className="w-4 h-4" />,
    category: 'insert',
    keywords: ['bullet', 'list', 'ul'],
    action: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'insert-numbered-list',
    label: 'Insert Numbered List',
    icon: <ListOrdered className="w-4 h-4" />,
    category: 'insert',
    keywords: ['number', 'list', 'ol'],
    action: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'insert-todo-list',
    label: 'Insert To-do List',
    icon: <CheckSquare className="w-4 h-4" />,
    category: 'insert',
    keywords: ['todo', 'task', 'checkbox'],
    action: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'insert-quote',
    label: 'Insert Quote',
    icon: <Quote className="w-4 h-4" />,
    category: 'insert',
    keywords: ['quote', 'blockquote'],
    action: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'insert-code',
    label: 'Insert Code Block',
    icon: <Code2 className="w-4 h-4" />,
    category: 'insert',
    keywords: ['code', 'snippet', 'programming'],
    action: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'insert-divider',
    label: 'Insert Divider',
    icon: <Minus className="w-4 h-4" />,
    category: 'insert',
    keywords: ['divider', 'hr', 'line'],
    action: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'insert-table',
    label: 'Insert Table',
    description: '3x3 table with header',
    icon: <Table2 className="w-4 h-4" />,
    category: 'insert',
    keywords: ['table', 'grid'],
    action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'insert-image',
    label: 'Insert Image',
    icon: <ImageIcon className="w-4 h-4" />,
    category: 'insert',
    keywords: ['image', 'picture', 'photo'],
    action: (e) => {
      const url = window.prompt('Enter image URL:')
      if (url) e.chain().focus().setImage({ src: url }).run()
    },
  },

  // Format commands
  {
    id: 'format-bold',
    label: 'Bold',
    icon: <Bold className="w-4 h-4" />,
    category: 'format',
    keywords: ['bold', 'strong'],
    shortcut: '⌘B',
    action: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    id: 'format-italic',
    label: 'Italic',
    icon: <Italic className="w-4 h-4" />,
    category: 'format',
    keywords: ['italic', 'emphasis'],
    shortcut: '⌘I',
    action: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    id: 'format-underline',
    label: 'Underline',
    icon: <Underline className="w-4 h-4" />,
    category: 'format',
    keywords: ['underline'],
    shortcut: '⌘U',
    action: (e) => e.chain().focus().toggleUnderline().run(),
  },
  {
    id: 'format-strike',
    label: 'Strikethrough',
    icon: <Strikethrough className="w-4 h-4" />,
    category: 'format',
    keywords: ['strike', 'strikethrough'],
    shortcut: '⌘⇧S',
    action: (e) => e.chain().focus().toggleStrike().run(),
  },
  {
    id: 'format-code',
    label: 'Inline Code',
    icon: <Code2 className="w-4 h-4" />,
    category: 'format',
    keywords: ['code', 'inline'],
    shortcut: '⌘E',
    action: (e) => e.chain().focus().toggleCode().run(),
  },
  {
    id: 'format-link',
    label: 'Add Link',
    icon: <Link2 className="w-4 h-4" />,
    category: 'format',
    keywords: ['link', 'url', 'href'],
    shortcut: '⌘K',
    action: (e) => {
      const url = window.prompt('Enter URL:')
      if (url) e.chain().focus().setLink({ href: url }).run()
    },
  },
  {
    id: 'format-align-left',
    label: 'Align Left',
    icon: <AlignLeft className="w-4 h-4" />,
    category: 'format',
    keywords: ['align', 'left'],
    action: (e) => e.chain().focus().setTextAlign('left').run(),
  },
  {
    id: 'format-align-center',
    label: 'Align Center',
    icon: <AlignCenter className="w-4 h-4" />,
    category: 'format',
    keywords: ['align', 'center'],
    action: (e) => e.chain().focus().setTextAlign('center').run(),
  },
  {
    id: 'format-align-right',
    label: 'Align Right',
    icon: <AlignRight className="w-4 h-4" />,
    category: 'format',
    keywords: ['align', 'right'],
    action: (e) => e.chain().focus().setTextAlign('right').run(),
  },

  // Edit commands
  {
    id: 'edit-undo',
    label: 'Undo',
    icon: <Undo className="w-4 h-4" />,
    category: 'edit',
    keywords: ['undo', 'back'],
    shortcut: '⌘Z',
    action: (e) => e.chain().focus().undo().run(),
  },
  {
    id: 'edit-redo',
    label: 'Redo',
    icon: <Redo className="w-4 h-4" />,
    category: 'edit',
    keywords: ['redo', 'forward'],
    shortcut: '⌘⇧Z',
    action: (e) => e.chain().focus().redo().run(),
  },

  // View commands
  {
    id: 'view-focus-mode',
    label: 'Toggle Focus Mode',
    description: 'Dim surrounding text',
    icon: <Focus className="w-4 h-4" />,
    category: 'view',
    keywords: ['focus', 'zen', 'distraction'],
    action: (e, ctx) => {
      if (ctx?.toggleFocusMode) {
        ctx.toggleFocusMode()
      } else {
        // Try to toggle via editor command if available
        e.commands.toggleFocusLine?.()
      }
    },
  },
  {
    id: 'view-keyboard-shortcuts',
    label: 'Keyboard Shortcuts',
    description: 'View all shortcuts',
    icon: <Keyboard className="w-4 h-4" />,
    category: 'view',
    keywords: ['keyboard', 'shortcuts', 'help'],
    action: () => {
      // This will be handled externally
    },
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  insert: 'Insert',
  format: 'Format',
  edit: 'Edit',
  view: 'View',
  navigate: 'Navigate',
}

const CATEGORY_ORDER = ['insert', 'format', 'edit', 'view', 'navigate']

// ============================================================================
// COMPONENT
// ============================================================================

export function CommandPalette({
  editor,
  isOpen,
  onClose,
  isDark,
  context,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Get all commands
  const allCommands = useMemo(() => createCommands(), [])

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query) return allCommands

    const lowerQuery = query.toLowerCase()
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery) ||
        cmd.keywords.some((k) => k.includes(lowerQuery))
    )
  }, [allCommands, query])

  // Group by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, PaletteCommand[]> = {}
    for (const cmd of filteredCommands) {
      if (!groups[cmd.category]) {
        groups[cmd.category] = []
      }
      groups[cmd.category].push(cmd)
    }
    return groups
  }, [filteredCommands])

  // Flat list for keyboard navigation
  const flatCommands = useMemo(() => {
    const result: PaletteCommand[] = []
    for (const category of CATEGORY_ORDER) {
      if (groupedCommands[category]) {
        result.push(...groupedCommands[category])
      }
    }
    return result
  }, [groupedCommands])

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [selectedIndex])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < flatCommands.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flatCommands.length - 1
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (flatCommands[selectedIndex]) {
          flatCommands[selectedIndex].action(editor, context)
          onClose()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [flatCommands, selectedIndex, editor, context, onClose]
  )

  // Handle command selection
  const handleSelect = useCallback(
    (cmd: PaletteCommand) => {
      cmd.action(editor, context)
      onClose()
    },
    [editor, context, onClose]
  )

  if (!isOpen) return null

  let flatIndex = 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div
          className={cn(
            'absolute inset-0',
            isDark ? 'bg-black/60' : 'bg-black/40'
          )}
        />

        {/* Palette */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative w-full max-w-xl mx-4 rounded-xl shadow-2xl border overflow-hidden',
            isDark
              ? 'bg-zinc-900 border-zinc-700'
              : 'bg-white border-zinc-200'
          )}
        >
          {/* Search input */}
          <div
            className={cn(
              'flex items-center gap-3 px-4 py-3 border-b',
              isDark ? 'border-zinc-700' : 'border-zinc-200'
            )}
          >
            <Search
              className={cn(
                'w-5 h-5 flex-shrink-0',
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              )}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className={cn(
                'flex-1 bg-transparent outline-none text-base',
                isDark
                  ? 'text-zinc-100 placeholder-zinc-500'
                  : 'text-zinc-900 placeholder-zinc-400'
              )}
            />
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                isDark
                  ? 'bg-zinc-800 text-zinc-400'
                  : 'bg-zinc-100 text-zinc-500'
              )}
            >
              <Command className="w-3 h-3" />K
            </div>
          </div>

          {/* Commands list */}
          <div className="max-h-80 overflow-y-auto py-2">
            {flatCommands.length === 0 ? (
              <div
                className={cn(
                  'px-4 py-8 text-center text-sm',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              >
                No commands found for "{query}"
              </div>
            ) : (
              CATEGORY_ORDER.map((category) => {
                const commands = groupedCommands[category]
                if (!commands || commands.length === 0) return null

                return (
                  <div key={category}>
                    {/* Category label */}
                    <div
                      className={cn(
                        'px-4 py-1.5 text-xs font-semibold uppercase tracking-wider',
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}
                    >
                      {CATEGORY_LABELS[category]}
                    </div>

                    {/* Commands in category */}
                    {commands.map((cmd) => {
                      const index = flatIndex++
                      const isSelected = index === selectedIndex

                      return (
                        <button
                          key={cmd.id}
                          ref={(el) => { itemRefs.current[index] = el }}
                          onClick={() => handleSelect(cmd)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            isSelected
                              ? isDark
                                ? 'bg-zinc-800'
                                : 'bg-zinc-100'
                              : ''
                          )}
                        >
                          {/* Icon */}
                          <div
                            className={cn(
                              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                              isSelected
                                ? 'bg-violet-500 text-white'
                                : isDark
                                ? 'bg-zinc-800 text-zinc-400'
                                : 'bg-zinc-100 text-zinc-600'
                            )}
                          >
                            {cmd.icon}
                          </div>

                          {/* Label & Description */}
                          <div className="flex-1 min-w-0">
                            <div
                              className={cn(
                                'text-sm font-medium',
                                isDark ? 'text-zinc-100' : 'text-zinc-900'
                              )}
                            >
                              {cmd.label}
                            </div>
                            {cmd.description && (
                              <div
                                className={cn(
                                  'text-xs truncate',
                                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                                )}
                              >
                                {cmd.description}
                              </div>
                            )}
                          </div>

                          {/* Shortcut */}
                          {cmd.shortcut && (
                            <div
                              className={cn(
                                'flex-shrink-0 px-2 py-1 rounded text-xs font-mono',
                                isDark
                                  ? 'bg-zinc-800 text-zinc-400'
                                  : 'bg-zinc-100 text-zinc-500'
                              )}
                            >
                              {cmd.shortcut}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div
            className={cn(
              'flex items-center justify-between px-4 py-2 border-t text-xs',
              isDark
                ? 'border-zinc-700 text-zinc-500'
                : 'border-zinc-200 text-zinc-400'
            )}
          >
            <div className="flex items-center gap-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
            <span>{flatCommands.length} commands</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CommandPalette
