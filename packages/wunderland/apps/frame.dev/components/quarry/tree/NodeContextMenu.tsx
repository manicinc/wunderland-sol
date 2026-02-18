/**
 * Right-click context menu for tree nodes
 * @module codex/tree/NodeContextMenu
 */

'use client'

import React from 'react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  FolderPlus,
  FileText,
  Link,
  Eye,
  Code,
  ChevronRight,
  Star,
  FolderHeart,
} from 'lucide-react'
import type { CodexTreeNode } from './types'
import { Z_INDEX } from '../constants'

/** Collection info for the "Add to Collection" menu */
interface CollectionInfo {
  id: string
  title: string
  icon?: string
  color?: string
}

interface NodeContextMenuProps {
  /** Tree node data */
  node: CodexTreeNode
  /** Whether the node can have children */
  canHaveChildren: boolean
  /** Children to wrap */
  children: React.ReactNode
  /** Callback for edit/rename action */
  onEdit?: () => void
  /** Callback for delete action */
  onDelete?: () => void
  /** Callback for create new strand */
  onCreateStrand?: () => void
  /** Callback for create new folder */
  onCreateFolder?: () => void
  /** Callback for open in new tab */
  onOpenExternal?: () => void
  /** Callback for preview */
  onPreview?: () => void
  /** Callback for edit source */
  onEditSource?: () => void
  /** Callback for copy slug */
  onCopySlug?: () => void
  /** Callback for copy path */
  onCopyPath?: () => void
  /** Callback for copy markdown link */
  onCopyMarkdownLink?: () => void
  /** Callback for duplicate */
  onDuplicate?: () => void
  /** Whether this node is favorited */
  isFavorite?: boolean
  /** Callback for toggle favorite */
  onToggleFavorite?: () => void
  /** Available collections (excluding Favorites) for "Add to Collection" */
  collections?: CollectionInfo[]
  /** Collections this strand is already in */
  strandCollectionIds?: string[]
  /** Callback for adding/removing from a collection */
  onToggleCollection?: (collectionId: string) => void
  /** Whether dark mode is enabled */
  isDark?: boolean
}

const menuItemClass = (isDark: boolean) => `
  flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none
  ${isDark
    ? 'hover:bg-zinc-800 focus:bg-zinc-800 text-zinc-300'
    : 'hover:bg-zinc-100 focus:bg-zinc-100 text-zinc-700'
  }
`

const dangerItemClass = (isDark: boolean) => `
  flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer outline-none
  text-red-600 dark:text-red-400
  ${isDark ? 'hover:bg-red-900/30 focus:bg-red-900/30' : 'hover:bg-red-50 focus:bg-red-50'}
`

const separatorClass = (isDark: boolean) => `h-px my-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`

const subContentClass = (isDark: boolean) => `
  min-w-[160px] rounded-lg shadow-xl border p-1
  ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
`

/**
 * Context menu for tree nodes
 * Shows when right-clicking on a node
 */
export default function NodeContextMenu({
  node,
  canHaveChildren,
  children,
  onEdit,
  onDelete,
  onCreateStrand,
  onCreateFolder,
  onOpenExternal,
  onPreview,
  onEditSource,
  onCopySlug,
  onCopyPath,
  onCopyMarkdownLink,
  onDuplicate,
  isFavorite = false,
  onToggleFavorite,
  collections = [],
  strandCollectionIds = [],
  onToggleCollection,
  isDark = false,
}: NodeContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className={`
            min-w-[200px] rounded-lg shadow-xl border p-1
            ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
          `}
          style={{ zIndex: Z_INDEX.DROPDOWN }}
        >
          {/* View Actions */}
          {node.type === 'file' && onOpenExternal && (
            <ContextMenu.Item className={menuItemClass(isDark)} onClick={onOpenExternal}>
              <ExternalLink className="w-4 h-4" />
              Open in new tab
            </ContextMenu.Item>
          )}

          {onPreview && (
            <ContextMenu.Item className={menuItemClass(isDark)} onClick={onPreview}>
              <Eye className="w-4 h-4" />
              Preview
            </ContextMenu.Item>
          )}

          {/* Favorites action - for strands only */}
          {node.type === 'file' && onToggleFavorite && (
            <ContextMenu.Item className={menuItemClass(isDark)} onClick={onToggleFavorite}>
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </ContextMenu.Item>
          )}

          {/* Add to Collection submenu - for strands only */}
          {node.type === 'file' && collections.length > 0 && onToggleCollection && (
            <ContextMenu.Sub>
              <ContextMenu.SubTrigger className={menuItemClass(isDark)}>
                <FolderHeart className="w-4 h-4" />
                Add to Collection...
                <ChevronRight className="w-4 h-4 ml-auto text-zinc-400" />
              </ContextMenu.SubTrigger>

              <ContextMenu.Portal>
                <ContextMenu.SubContent
                  className={subContentClass(isDark)}
                  sideOffset={2}
                  style={{ zIndex: Z_INDEX.DROPDOWN + 1, maxHeight: '300px', overflowY: 'auto' }}
                >
                  {collections.map((collection) => {
                    const isInCollection = strandCollectionIds.includes(collection.id)
                    return (
                      <ContextMenu.Item
                        key={collection.id}
                        className={menuItemClass(isDark)}
                        onClick={() => onToggleCollection(collection.id)}
                      >
                        <span className="w-4 h-4 flex items-center justify-center text-sm">
                          {collection.icon || '📁'}
                        </span>
                        <span className="flex-1 truncate">{collection.title}</span>
                        {isInCollection && (
                          <span className="text-emerald-500 text-xs">✓</span>
                        )}
                      </ContextMenu.Item>
                    )
                  })}
                </ContextMenu.SubContent>
              </ContextMenu.Portal>
            </ContextMenu.Sub>
          )}

          <ContextMenu.Separator className={separatorClass(isDark)} />

          {/* Create Actions */}
          {canHaveChildren && (onCreateStrand || onCreateFolder) && (
            <>
              <ContextMenu.Sub>
                <ContextMenu.SubTrigger className={menuItemClass(isDark)}>
                  <Plus className="w-4 h-4" />
                  New...
                  <ChevronRight className="w-4 h-4 ml-auto text-zinc-400" />
                </ContextMenu.SubTrigger>

                <ContextMenu.Portal>
                  <ContextMenu.SubContent className={subContentClass(isDark)} sideOffset={2} style={{ zIndex: Z_INDEX.DROPDOWN + 1 }}>
                    {onCreateStrand && (
                      <ContextMenu.Item className={menuItemClass(isDark)} onClick={onCreateStrand}>
                        <FileText className="w-4 h-4" />
                        New Strand
                      </ContextMenu.Item>
                    )}

                    {onCreateFolder && (
                      <ContextMenu.Item className={menuItemClass(isDark)} onClick={onCreateFolder}>
                        <FolderPlus className="w-4 h-4" />
                        New Folder
                      </ContextMenu.Item>
                    )}
                  </ContextMenu.SubContent>
                </ContextMenu.Portal>
              </ContextMenu.Sub>

              <ContextMenu.Separator className={separatorClass(isDark)} />
            </>
          )}

          {/* Edit Actions */}
          {onEdit && (
            <ContextMenu.Item className={menuItemClass(isDark)} onClick={onEdit}>
              <Pencil className="w-4 h-4" />
              Rename
              <span className="ml-auto text-xs text-zinc-400">F2</span>
            </ContextMenu.Item>
          )}

          {onDuplicate && (
            <ContextMenu.Item className={menuItemClass(isDark)} onClick={onDuplicate}>
              <Copy className="w-4 h-4" />
              Duplicate
            </ContextMenu.Item>
          )}

          <ContextMenu.Separator className={separatorClass(isDark)} />

          {/* Copy Actions */}
          {(onCopySlug || onCopyPath || onCopyMarkdownLink) && (
            <>
              <ContextMenu.Sub>
                <ContextMenu.SubTrigger className={menuItemClass(isDark)}>
                  <Link className="w-4 h-4" />
                  Copy...
                  <ChevronRight className="w-4 h-4 ml-auto text-zinc-400" />
                </ContextMenu.SubTrigger>

                <ContextMenu.Portal>
                  <ContextMenu.SubContent className={subContentClass(isDark)} sideOffset={2} style={{ zIndex: Z_INDEX.DROPDOWN + 1 }}>
                    {onCopySlug && (
                      <ContextMenu.Item className={menuItemClass(isDark)} onClick={onCopySlug}>
                        Copy slug
                      </ContextMenu.Item>
                    )}

                    {onCopyPath && (
                      <ContextMenu.Item className={menuItemClass(isDark)} onClick={onCopyPath}>
                        Copy path
                      </ContextMenu.Item>
                    )}

                    {onCopyMarkdownLink && (
                      <ContextMenu.Item className={menuItemClass(isDark)} onClick={onCopyMarkdownLink}>
                        Copy markdown link
                      </ContextMenu.Item>
                    )}
                  </ContextMenu.SubContent>
                </ContextMenu.Portal>
              </ContextMenu.Sub>
            </>
          )}

          {node.type === 'file' && onEditSource && (
            <ContextMenu.Item className={menuItemClass(isDark)} onClick={onEditSource}>
              <Code className="w-4 h-4" />
              Edit source
            </ContextMenu.Item>
          )}

          {/* Destructive */}
          {onDelete && (
            <>
              <ContextMenu.Separator className={separatorClass(isDark)} />
              <ContextMenu.Item className={dangerItemClass(isDark)} onClick={onDelete}>
                <Trash2 className="w-4 h-4" />
                Delete
                <span className="ml-auto text-xs text-zinc-400">⌫</span>
              </ContextMenu.Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}


