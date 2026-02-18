/**
 * WriterWidgetToolbar - Compact Toolbar for Writer Widget
 * @module components/quarry/ui/writer/WriterWidgetToolbar
 *
 * A compact, floating toolbar for the writer widget in dashboard mode.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Link2,
  CheckSquare,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface ToolbarAction {
  id: string
  icon: React.ElementType
  label: string
  shortcut?: string
  isActive?: boolean
  onClick: () => void
}

export interface WriterWidgetToolbarProps {
  /** Available actions */
  actions: ToolbarAction[]
  /** Current theme */
  isDark?: boolean
  /** Whether toolbar is floating */
  floating?: boolean
  /** Position for floating toolbar */
  position?: { x: number; y: number }
  /** Custom class name */
  className?: string
}

// ============================================================================
// DEFAULT ACTIONS
// ============================================================================

export function createDefaultActions(editor: {
  toggleBold: () => void
  toggleItalic: () => void
  toggleUnderline: () => void
  toggleBulletList: () => void
  toggleOrderedList: () => void
  toggleBlockquote: () => void
  toggleCode: () => void
  toggleHeading: (level: number) => void
  insertImage: () => void
  insertLink: () => void
  toggleTaskList: () => void
  isActive: (type: string) => boolean
}): ToolbarAction[] {
  return [
    {
      id: 'bold',
      icon: Bold,
      label: 'Bold',
      shortcut: '⌘B',
      isActive: editor.isActive('bold'),
      onClick: editor.toggleBold,
    },
    {
      id: 'italic',
      icon: Italic,
      label: 'Italic',
      shortcut: '⌘I',
      isActive: editor.isActive('italic'),
      onClick: editor.toggleItalic,
    },
    {
      id: 'underline',
      icon: Underline,
      label: 'Underline',
      shortcut: '⌘U',
      isActive: editor.isActive('underline'),
      onClick: editor.toggleUnderline,
    },
    {
      id: 'divider-1',
      icon: () => null,
      label: '',
      onClick: () => {},
    },
    {
      id: 'heading1',
      icon: Heading1,
      label: 'Heading 1',
      isActive: editor.isActive('heading'),
      onClick: () => editor.toggleHeading(1),
    },
    {
      id: 'heading2',
      icon: Heading2,
      label: 'Heading 2',
      onClick: () => editor.toggleHeading(2),
    },
    {
      id: 'heading3',
      icon: Heading3,
      label: 'Heading 3',
      onClick: () => editor.toggleHeading(3),
    },
    {
      id: 'divider-2',
      icon: () => null,
      label: '',
      onClick: () => {},
    },
    {
      id: 'bulletList',
      icon: List,
      label: 'Bullet List',
      isActive: editor.isActive('bulletList'),
      onClick: editor.toggleBulletList,
    },
    {
      id: 'orderedList',
      icon: ListOrdered,
      label: 'Ordered List',
      isActive: editor.isActive('orderedList'),
      onClick: editor.toggleOrderedList,
    },
    {
      id: 'taskList',
      icon: CheckSquare,
      label: 'Task List',
      isActive: editor.isActive('taskList'),
      onClick: editor.toggleTaskList,
    },
    {
      id: 'divider-3',
      icon: () => null,
      label: '',
      onClick: () => {},
    },
    {
      id: 'blockquote',
      icon: Quote,
      label: 'Quote',
      isActive: editor.isActive('blockquote'),
      onClick: editor.toggleBlockquote,
    },
    {
      id: 'code',
      icon: Code2,
      label: 'Code',
      shortcut: '⌘E',
      isActive: editor.isActive('code'),
      onClick: editor.toggleCode,
    },
    {
      id: 'divider-4',
      icon: () => null,
      label: '',
      onClick: () => {},
    },
    {
      id: 'link',
      icon: Link2,
      label: 'Insert Link',
      shortcut: '⌘K',
      onClick: editor.insertLink,
    },
    {
      id: 'image',
      icon: Image,
      label: 'Insert Image',
      onClick: editor.insertImage,
    },
  ]
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface ToolbarButtonProps {
  action: ToolbarAction
  isDark: boolean
}

function ToolbarButton({ action, isDark }: ToolbarButtonProps) {
  if (action.id.startsWith('divider')) {
    return (
      <div className={`w-px h-4 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
    )
  }

  const Icon = action.icon

  return (
    <button
      onClick={action.onClick}
      title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
      className={`
        p-1.5 rounded-md transition-all duration-150
        ${action.isActive
          ? isDark
            ? 'bg-cyan-500/20 text-cyan-400'
            : 'bg-cyan-100 text-cyan-700'
          : isDark
            ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
            : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
        }
      `}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WriterWidgetToolbar({
  actions,
  isDark = false,
  floating = false,
  position,
  className = '',
}: WriterWidgetToolbarProps) {
  if (floating && position) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
        }}
        className={`
          flex items-center gap-0.5 p-1.5 rounded-lg shadow-xl
          ${isDark
            ? 'bg-zinc-800 border border-zinc-700'
            : 'bg-white border border-zinc-200'
          }
          ${className}
        `}
      >
        {actions.map((action) => (
          <ToolbarButton key={action.id} action={action} isDark={isDark} />
        ))}
      </motion.div>
    )
  }

  return (
    <div
      className={`
        flex items-center gap-0.5 p-1 rounded-lg
        ${isDark
          ? 'bg-zinc-800/50 border border-zinc-700/50'
          : 'bg-zinc-50 border border-zinc-200'
        }
        ${className}
      `}
    >
      {actions.map((action) => (
        <ToolbarButton key={action.id} action={action} isDark={isDark} />
      ))}
    </div>
  )
}

export { WriterWidgetToolbar }

