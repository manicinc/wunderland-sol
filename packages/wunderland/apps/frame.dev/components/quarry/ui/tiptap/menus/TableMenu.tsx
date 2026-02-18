'use client'

/**
 * TableMenu Component
 *
 * Floating menu for table manipulation in TiptapEditor.
 * Shows when cursor is inside a table cell.
 *
 * @module components/quarry/ui/tiptap/menus/TableMenu
 */

import React, { useCallback } from 'react'
import { Editor } from '@tiptap/react'
import {
  Plus,
  Minus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Merge,
  SplitSquareHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TableMenuProps {
  editor: Editor
  isDark?: boolean
  className?: string
}

interface MenuButtonProps {
  onClick: () => void
  disabled?: boolean
  title: string
  isDark?: boolean
  danger?: boolean
  children: React.ReactNode
}

const MenuButton = ({ onClick, disabled, title, isDark, danger, children }: MenuButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      'p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
      danger
        ? 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400'
        : isDark
        ? 'hover:bg-zinc-700 text-zinc-300'
        : 'hover:bg-zinc-100 text-zinc-600'
    )}
  >
    {children}
  </button>
)

const MenuDivider = ({ isDark }: { isDark?: boolean }) => (
  <div className={cn('w-px h-6 mx-1', isDark ? 'bg-zinc-700' : 'bg-zinc-200')} />
)

export function TableMenu({ editor, isDark, className }: TableMenuProps) {
  // Check if cursor is in a table
  const isInTable = editor.isActive('table')

  // Row operations
  const addRowBefore = useCallback(() => {
    editor.chain().focus().addRowBefore().run()
  }, [editor])

  const addRowAfter = useCallback(() => {
    editor.chain().focus().addRowAfter().run()
  }, [editor])

  const deleteRow = useCallback(() => {
    editor.chain().focus().deleteRow().run()
  }, [editor])

  // Column operations
  const addColumnBefore = useCallback(() => {
    editor.chain().focus().addColumnBefore().run()
  }, [editor])

  const addColumnAfter = useCallback(() => {
    editor.chain().focus().addColumnAfter().run()
  }, [editor])

  const deleteColumn = useCallback(() => {
    editor.chain().focus().deleteColumn().run()
  }, [editor])

  // Cell operations
  const mergeCells = useCallback(() => {
    editor.chain().focus().mergeCells().run()
  }, [editor])

  const splitCell = useCallback(() => {
    editor.chain().focus().splitCell().run()
  }, [editor])

  // Table operations
  const deleteTable = useCallback(() => {
    editor.chain().focus().deleteTable().run()
  }, [editor])

  const toggleHeaderRow = useCallback(() => {
    editor.chain().focus().toggleHeaderRow().run()
  }, [editor])

  if (!isInTable) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 px-2 py-1 rounded-lg border shadow-lg',
        isDark
          ? 'bg-zinc-800 border-zinc-700'
          : 'bg-white border-zinc-200',
        className
      )}
    >
      {/* Row operations */}
      <MenuButton onClick={addRowBefore} title="Add row above" isDark={isDark}>
        <div className="flex items-center">
          <ArrowUp className="w-3.5 h-3.5" />
          <Plus className="w-3 h-3 -ml-1" />
        </div>
      </MenuButton>
      <MenuButton onClick={addRowAfter} title="Add row below" isDark={isDark}>
        <div className="flex items-center">
          <ArrowDown className="w-3.5 h-3.5" />
          <Plus className="w-3 h-3 -ml-1" />
        </div>
      </MenuButton>
      <MenuButton onClick={deleteRow} title="Delete row" isDark={isDark} danger>
        <div className="flex items-center">
          <Minus className="w-3.5 h-3.5" />
        </div>
      </MenuButton>

      <MenuDivider isDark={isDark} />

      {/* Column operations */}
      <MenuButton onClick={addColumnBefore} title="Add column left" isDark={isDark}>
        <div className="flex items-center">
          <ArrowLeft className="w-3.5 h-3.5" />
          <Plus className="w-3 h-3 -ml-1" />
        </div>
      </MenuButton>
      <MenuButton onClick={addColumnAfter} title="Add column right" isDark={isDark}>
        <div className="flex items-center">
          <ArrowRight className="w-3.5 h-3.5" />
          <Plus className="w-3 h-3 -ml-1" />
        </div>
      </MenuButton>
      <MenuButton onClick={deleteColumn} title="Delete column" isDark={isDark} danger>
        <div className="flex items-center">
          <Minus className="w-3.5 h-3.5" />
        </div>
      </MenuButton>

      <MenuDivider isDark={isDark} />

      {/* Cell operations */}
      <MenuButton
        onClick={mergeCells}
        title="Merge cells"
        isDark={isDark}
        disabled={!editor.can().mergeCells()}
      >
        <Merge className="w-3.5 h-3.5" />
      </MenuButton>
      <MenuButton
        onClick={splitCell}
        title="Split cell"
        isDark={isDark}
        disabled={!editor.can().splitCell()}
      >
        <SplitSquareHorizontal className="w-3.5 h-3.5" />
      </MenuButton>

      <MenuDivider isDark={isDark} />

      {/* Table operations */}
      <MenuButton onClick={deleteTable} title="Delete table" isDark={isDark} danger>
        <Trash2 className="w-3.5 h-3.5" />
      </MenuButton>
    </div>
  )
}

export default TableMenu
