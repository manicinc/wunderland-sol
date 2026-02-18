/**
 * Hover action buttons for tree nodes
 * @module codex/tree/NodeActions
 */

'use client'

import React from 'react'
import { Plus, Pencil, Trash2, MoreHorizontal, Copy, FolderPlus, ExternalLink } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { motion } from 'framer-motion'
import type { CodexTreeNode } from './types'
import { Z_INDEX } from '../constants'

interface NodeActionsProps {
  /** Tree node data */
  node: CodexTreeNode
  /** Whether the node can have children */
  canHaveChildren: boolean
  /** Callback for edit/rename action */
  onEdit?: () => void
  /** Callback for delete action */
  onDelete?: () => void
  /** Callback for create child action */
  onCreate?: () => void
  /** Callback for open in new tab */
  onOpenExternal?: () => void
  /** Callback for copy slug */
  onCopySlug?: () => void
  /** Callback for copy path */
  onCopyPath?: () => void
  /** Whether dark mode is enabled */
  isDark?: boolean
}

/**
 * Action button with tooltip
 */
function ActionButton({
  icon,
  tooltip,
  onClick,
  className = '',
  danger = false,
}: {
  icon: React.ReactNode
  tooltip: string
  onClick: () => void
  className?: string
  danger?: boolean
}) {
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            className={`
              p-1 rounded transition-colors
              ${danger
                ? 'text-zinc-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }
              ${className}
            `}
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
          >
            {icon}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="px-2 py-1 text-xs bg-zinc-900 text-white rounded shadow-lg"
            sideOffset={5}
            style={{ zIndex: Z_INDEX.TOOLTIP }}
          >
            {tooltip}
            <Tooltip.Arrow className="fill-zinc-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

/**
 * Hover action buttons component
 * Shows quick actions when hovering over a tree node
 */
export default function NodeActions({
  node,
  canHaveChildren,
  onEdit,
  onDelete,
  onCreate,
  onOpenExternal,
  onCopySlug,
  onCopyPath,
  isDark = false,
}: NodeActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Create Child (only for containers) */}
      {canHaveChildren && onCreate && (
        <ActionButton
          icon={<Plus className="w-3.5 h-3.5" />}
          tooltip="Add item"
          onClick={onCreate}
        />
      )}

      {/* Edit / Rename */}
      {onEdit && (
        <ActionButton
          icon={<Pencil className="w-3.5 h-3.5" />}
          tooltip="Rename (F2)"
          onClick={onEdit}
        />
      )}

      {/* More Actions Dropdown */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={`
              min-w-[160px] rounded-lg shadow-xl border p-1
              ${isDark
                ? 'bg-zinc-900 border-zinc-700'
                : 'bg-white border-zinc-200'
              }
            `}
            sideOffset={5}
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: Z_INDEX.DROPDOWN }}
          >
            {/* Open in new tab */}
            {node.type === 'file' && onOpenExternal && (
              <DropdownMenu.Item
                className={`
                  flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none
                  ${isDark
                    ? 'hover:bg-zinc-800 text-zinc-300'
                    : 'hover:bg-zinc-100 text-zinc-700'
                  }
                `}
                onClick={onOpenExternal}
              >
                <ExternalLink className="w-4 h-4" />
                Open in new tab
              </DropdownMenu.Item>
            )}

            {/* Copy slug */}
            {onCopySlug && (
              <DropdownMenu.Item
                className={`
                  flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none
                  ${isDark
                    ? 'hover:bg-zinc-800 text-zinc-300'
                    : 'hover:bg-zinc-100 text-zinc-700'
                  }
                `}
                onClick={onCopySlug}
              >
                <Copy className="w-4 h-4" />
                Copy slug
              </DropdownMenu.Item>
            )}

            {/* Copy path */}
            {onCopyPath && (
              <DropdownMenu.Item
                className={`
                  flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none
                  ${isDark
                    ? 'hover:bg-zinc-800 text-zinc-300'
                    : 'hover:bg-zinc-100 text-zinc-700'
                  }
                `}
                onClick={onCopyPath}
              >
                <Copy className="w-4 h-4" />
                Copy path
              </DropdownMenu.Item>
            )}

            {/* New folder (only for containers) */}
            {canHaveChildren && onCreate && (
              <DropdownMenu.Item
                className={`
                  flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none
                  ${isDark
                    ? 'hover:bg-zinc-800 text-zinc-300'
                    : 'hover:bg-zinc-100 text-zinc-700'
                  }
                `}
                onClick={onCreate}
              >
                <FolderPlus className="w-4 h-4" />
                New folder
              </DropdownMenu.Item>
            )}

            {/* Separator before delete */}
            {onDelete && (
              <>
                <DropdownMenu.Separator className={`h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
                
                <DropdownMenu.Item
                  className={`
                    flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none
                    text-red-600 dark:text-red-400
                    ${isDark ? 'hover:bg-red-900/30' : 'hover:bg-red-50'}
                  `}
                  onClick={onDelete}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </motion.div>
  )
}





