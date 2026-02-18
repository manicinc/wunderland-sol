'use client'

/**
 * SlashCommandMenu - Notion-style slash command palette
 *
 * Floating dropdown that appears when typing "/" in the editor.
 * Shows categorized commands with icons, keyboard navigation,
 * and filtering by query.
 *
 * @module components/quarry/ui/tiptap/menus/SlashCommandMenu
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Editor } from '@tiptap/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
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
  Video,
  Music,
  Globe,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  FileText,
  Sparkles,
  GitBranch,
  Calculator,
  Pi,
  Info,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface SlashCommand {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  category: 'basic' | 'lists' | 'media' | 'advanced'
  keywords: string[]
  action: (editor: Editor) => void
}

interface SlashCommandMenuProps {
  editor: Editor
  isOpen: boolean
  coords: { x: number; y: number }
  query: string
  onClose: () => void
  onSelect: (command: SlashCommand) => void
  isDark?: boolean
}

// ============================================================================
// COMMANDS
// ============================================================================

const createCommands = (editor: Editor): SlashCommand[] => [
  // Basic blocks
  {
    id: 'paragraph',
    label: 'Text',
    description: 'Just start writing with plain text',
    icon: <Type className="w-4 h-4" />,
    category: 'basic',
    keywords: ['text', 'paragraph', 'plain'],
    action: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    id: 'heading1',
    label: 'Heading 1',
    description: 'Big section heading',
    icon: <Heading1 className="w-4 h-4" />,
    category: 'basic',
    keywords: ['heading', 'h1', 'title', 'big'],
    action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="w-4 h-4" />,
    category: 'basic',
    keywords: ['heading', 'h2', 'subtitle'],
    action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="w-4 h-4" />,
    category: 'basic',
    keywords: ['heading', 'h3', 'subheading'],
    action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },

  // Lists
  {
    id: 'bulletList',
    label: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: <List className="w-4 h-4" />,
    category: 'lists',
    keywords: ['bullet', 'list', 'unordered', 'ul'],
    action: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'numberedList',
    label: 'Numbered List',
    description: 'Create a numbered list',
    icon: <ListOrdered className="w-4 h-4" />,
    category: 'lists',
    keywords: ['number', 'list', 'ordered', 'ol'],
    action: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'taskList',
    label: 'To-do List',
    description: 'Track tasks with checkboxes',
    icon: <CheckSquare className="w-4 h-4" />,
    category: 'lists',
    keywords: ['todo', 'task', 'checkbox', 'check'],
    action: (e) => e.chain().focus().toggleTaskList().run(),
  },

  // Media & Advanced
  {
    id: 'quote',
    label: 'Quote',
    description: 'Capture a quote',
    icon: <Quote className="w-4 h-4" />,
    category: 'advanced',
    keywords: ['quote', 'blockquote', 'citation'],
    action: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'codeBlock',
    label: 'Code Block',
    description: 'Capture a code snippet',
    icon: <Code2 className="w-4 h-4" />,
    category: 'advanced',
    keywords: ['code', 'snippet', 'pre', 'programming'],
    action: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Visually divide blocks',
    icon: <Minus className="w-4 h-4" />,
    category: 'advanced',
    keywords: ['divider', 'hr', 'horizontal', 'line', 'separator'],
    action: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'table',
    label: 'Table',
    description: 'Add a table with rows and columns',
    icon: <Table2 className="w-4 h-4" />,
    category: 'media',
    keywords: ['table', 'grid', 'spreadsheet', 'data'],
    action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'image',
    label: 'Image',
    description: 'Upload or embed an image',
    icon: <ImageIcon className="w-4 h-4" />,
    category: 'media',
    keywords: ['image', 'picture', 'photo', 'img'],
    action: (e) => {
      const url = window.prompt('Enter image URL:')
      if (url) {
        e.chain().focus().setImage({ src: url }).run()
      }
    },
  },
  {
    id: 'video',
    label: 'Video',
    description: 'Embed YouTube, Vimeo, or video file',
    icon: <Video className="w-4 h-4" />,
    category: 'media',
    keywords: ['video', 'youtube', 'vimeo', 'movie', 'embed'],
    action: (e) => {
      const url = window.prompt('Enter video URL (YouTube, Vimeo, or direct):')
      if (url) {
        (e.commands as any).insertVideo?.(url)
      }
    },
  },
  {
    id: 'audio',
    label: 'Audio',
    description: 'Embed audio file or streaming',
    icon: <Music className="w-4 h-4" />,
    category: 'media',
    keywords: ['audio', 'music', 'sound', 'mp3', 'podcast', 'soundcloud', 'spotify'],
    action: (e) => {
      const url = window.prompt('Enter audio URL:')
      if (url) {
        (e.commands as any).insertAudio?.(url)
      }
    },
  },
  {
    id: 'embed',
    label: 'Embed',
    description: 'Embed Twitter, CodePen, Figma, etc.',
    icon: <Globe className="w-4 h-4" />,
    category: 'media',
    keywords: ['embed', 'twitter', 'codepen', 'figma', 'iframe', 'codesandbox', 'loom'],
    action: (e) => {
      const url = window.prompt('Enter embed URL (Twitter, CodePen, Figma, etc.):')
      if (url) {
        (e.commands as any).insertEmbed?.(url)
      }
    },
  },

  // Enhanced blocks
  {
    id: 'mermaid',
    label: 'Mermaid Diagram',
    description: 'Add flowcharts, mindmaps, sequence diagrams',
    icon: <GitBranch className="w-4 h-4" />,
    category: 'advanced',
    keywords: ['mermaid', 'diagram', 'flowchart', 'mindmap', 'sequence', 'chart', 'graph'],
    action: (e) => (e.commands as any).insertMermaid?.(),
  },
  {
    id: 'math',
    label: 'Math Block',
    description: 'Add LaTeX math equations',
    icon: <Pi className="w-4 h-4" />,
    category: 'advanced',
    keywords: ['math', 'latex', 'equation', 'formula', 'katex'],
    action: (e) => (e.commands as any).insertLatexBlock?.(),
  },
  {
    id: 'formula',
    label: 'Formula',
    description: 'Add Embark-style computed formula',
    icon: <Calculator className="w-4 h-4" />,
    category: 'advanced',
    keywords: ['formula', 'calculate', 'compute', 'embark', 'function'],
    action: (e) => (e.commands as any).insertFormula?.(),
  },
  {
    id: 'callout-info',
    label: 'Info Callout',
    description: 'Highlight important information',
    icon: <Info className="w-4 h-4" />,
    category: 'advanced',
    keywords: ['callout', 'info', 'note', 'admonition', 'box'],
    action: (e) => (e.commands as any).insertCallout?.('info', 'Information'),
  },
  {
    id: 'callout-tip',
    label: 'Tip Callout',
    description: 'Share helpful tips',
    icon: <Lightbulb className="w-4 h-4" />,
    category: 'advanced',
    keywords: ['callout', 'tip', 'hint', 'advice'],
    action: (e) => (e.commands as any).insertCallout?.('tip', 'Tip'),
  },
  {
    id: 'callout-warning',
    label: 'Warning Callout',
    description: 'Warn about potential issues',
    icon: <AlertTriangle className="w-4 h-4" />,
    category: 'advanced',
    keywords: ['callout', 'warning', 'caution', 'alert'],
    action: (e) => (e.commands as any).insertCallout?.('warning', 'Warning'),
  },
  {
    id: 'toggle',
    label: 'Toggle',
    description: 'Collapsible content section',
    icon: <ChevronDown className="w-4 h-4" />,
    category: 'advanced',
    keywords: ['toggle', 'collapse', 'expand', 'accordion', 'details', 'summary'],
    action: (e) => (e.commands as any).insertToggle?.('Click to expand'),
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  basic: 'Basic blocks',
  lists: 'Lists',
  media: 'Media',
  advanced: 'Advanced',
}

const CATEGORY_ORDER = ['basic', 'lists', 'media', 'advanced']

// ============================================================================
// COMPONENT
// ============================================================================

export function SlashCommandMenu({
  editor,
  isOpen,
  coords,
  query,
  onClose,
  onSelect,
  isDark,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Get all commands
  const allCommands = useMemo(() => createCommands(editor), [editor])

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query) return allCommands

    const lowerQuery = query.toLowerCase()
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.description.toLowerCase().includes(lowerQuery) ||
        cmd.keywords.some((k) => k.includes(lowerQuery))
    )
  }, [allCommands, query])

  // Group by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, SlashCommand[]> = {}
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
    const result: SlashCommand[] = []
    for (const category of CATEGORY_ORDER) {
      if (groupedCommands[category]) {
        result.push(...groupedCommands[category])
      }
    }
    return result
  }, [groupedCommands])

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

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
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
          onSelect(flatCommands[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, flatCommands, selectedIndex, onSelect, onClose])

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen || flatCommands.length === 0) {
    return null
  }

  // Calculate position (ensure menu stays in viewport)
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(coords.x, window.innerWidth - 320),
    top: Math.min(coords.y, window.innerHeight - 400),
    zIndex: 50,
  }

  let flatIndex = 0

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={menuStyle}
        className={cn(
          'w-72 max-h-80 overflow-y-auto rounded-xl shadow-xl border',
          isDark
            ? 'bg-zinc-800 border-zinc-700'
            : 'bg-white border-zinc-200'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'px-3 py-2 text-xs font-medium border-b',
            isDark
              ? 'text-zinc-400 border-zinc-700'
              : 'text-zinc-500 border-zinc-100'
          )}
        >
          {query ? `Results for "${query}"` : 'Type to filter...'}
        </div>

        {/* Commands grouped by category */}
        <div className="py-1">
          {CATEGORY_ORDER.map((category) => {
            const commands = groupedCommands[category]
            if (!commands || commands.length === 0) return null

            return (
              <div key={category}>
                {/* Category label */}
                <div
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider',
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
                      onClick={() => onSelect(cmd)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                        isSelected
                          ? isDark
                            ? 'bg-zinc-700'
                            : 'bg-zinc-100'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                          isDark
                            ? 'bg-zinc-700 text-zinc-300'
                            : 'bg-zinc-100 text-zinc-600'
                        )}
                      >
                        {cmd.icon}
                      </div>

                      {/* Label & Description */}
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            'text-sm font-medium truncate',
                            isDark ? 'text-zinc-100' : 'text-zinc-900'
                          )}
                        >
                          {cmd.label}
                        </div>
                        <div
                          className={cn(
                            'text-xs truncate',
                            isDark ? 'text-zinc-400' : 'text-zinc-500'
                          )}
                        >
                          {cmd.description}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* No results */}
        {flatCommands.length === 0 && query && (
          <div
            className={cn(
              'px-3 py-8 text-center text-sm',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}
          >
            No commands found for "{query}"
          </div>
        )}

        {/* Footer hint */}
        <div
          className={cn(
            'px-3 py-2 text-xs border-t flex items-center justify-between',
            isDark
              ? 'text-zinc-500 border-zinc-700'
              : 'text-zinc-400 border-zinc-100'
          )}
        >
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default SlashCommandMenu
