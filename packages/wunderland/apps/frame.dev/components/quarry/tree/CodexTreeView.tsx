/**
 * Main tree component using react-arborist for drag-and-drop
 * Enhanced with beautiful hierarchy styling from the original Codex tree
 * @module codex/tree/CodexTreeView
 */

'use client'

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { Tree, TreeApi, NodeRendererProps, MoveHandler, RenameHandler, DeleteHandler, CreateHandler } from 'react-arborist'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, Search, Plus, GripVertical, MoreHorizontal,
  Layers, Box, FileText, Settings2, GitBranch, Tag, ExternalLink,
  Folder, FolderOpen, CheckSquare, Square, CheckCheck, Loader2,
  ChevronsUpDown, ChevronsDownUp
} from 'lucide-react'
import Image from 'next/image'
import type { KnowledgeTreeNode, NodeVisualStyle } from '../types'
import { CodexTreeNode, transformToArboristData, cloneTree, findNodeById, MoveOperation, DeleteOperation } from './types'
import NodeIcon from './NodeIcon'
import NodeActions from './NodeActions'
import NodeContextMenu from './NodeContextMenu'
import MobileNodeActions, { SwipeableRow } from './MobileNodeActions'
import { useResponsiveTree, useDeviceFeatures } from './hooks/useResponsiveTree'
import { formatNodeName } from '../utils'
import DynamicIcon, { isValidIconName } from '../ui/common/DynamicIcon'

/** Font scale settings for tree text sizes */
export interface TreeFontScale {
  /** Primary text size class (e.g., 'text-[11px]') */
  text: string
  /** Small text size class (e.g., 'text-[9px]') */
  textSm: string
  /** Extra small text size class (e.g., 'text-[8px]') */
  textXs: string
  /** Icon size class (e.g., 'w-3 h-3') */
  icon: string
  /** Small icon size class (e.g., 'w-2 h-2') */
  iconSm: string
}

/** Default font scale when none provided */
const DEFAULT_FONT_SCALE: TreeFontScale = {
  text: 'text-[11px]',
  textSm: 'text-[9px]',
  textXs: 'text-[8px]',
  icon: 'w-3 h-3',
  iconSm: 'w-2 h-2',
}

/** Options for opening a file */
interface OpenFileOptions {
  asPreview?: boolean
}

/** Double-click detection delay (ms) */
const DOUBLE_CLICK_DELAY = 300

interface CodexTreeViewProps {
  /** Knowledge tree data */
  data: KnowledgeTreeNode[]
  /** Currently selected node path */
  selectedPath?: string
  /** Node selection callback - VS Code style: single-click = preview, double-click = permanent */
  onSelect?: (path: string, options?: OpenFileOptions) => void
  /** Navigate to path (for double-click) */
  onNavigate?: (path: string) => void
  /** Open in external window */
  onOpenExternal?: (path: string) => void
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Container height (for virtualization) */
  height?: number
  /** Row height */
  rowHeight?: number
  /** Indentation per level */
  indent?: number
  /** Enable drag and drop */
  enableDragDrop?: boolean
  /** Callback when tree structure changes */
  onTreeChange?: (data: CodexTreeNode[]) => void
  /** Callback when files are moved (for publish flow) */
  onMoveComplete?: (operations: MoveOperation[]) => void
  /** Callback when files are deleted (for publish flow) */
  onDeleteComplete?: (operations: DeleteOperation[]) => void
  /** Search/filter term */
  searchTerm?: string
  /** Initially expanded paths */
  initialExpandedPaths?: Set<string>
  /** Callback when expansion changes */
  onExpandChange?: (paths: Set<string>) => void
  /** Loading state */
  loading?: boolean
  /** Compact mode */
  compact?: boolean
  /** Total strands count (for stats display) */
  totalStrands?: number
  /** Total weaves count (for stats display) */
  totalWeaves?: number
  /** Font scale settings for text sizes */
  fontScale?: TreeFontScale

  // Multi-selection support
  /** Whether selection mode is active */
  selectionMode?: boolean
  /** Set of selected paths */
  selectedPaths?: Set<string>
  /** Toggle selection for a path */
  onToggleSelection?: (path: string, level?: 'weave' | 'loom' | 'strand' | 'other') => void
  /** Check if a path is in the selection */
  isPathSelected?: (path: string) => boolean
  /** Check if a path or any of its ancestors is selected */
  isSelectedOrAncestorSelected?: (path: string, ancestorPaths: string[]) => boolean
  /** Select a path and all its children recursively */
  onSelectRecursive?: (path: string, allPaths: string[]) => Promise<void> | void
  /** Toggle recursive selection - if selected, deselect all; otherwise select all */
  onToggleRecursive?: (path: string, allPaths: string[]) => Promise<void> | void
}

// ==================== Color Palettes ====================

const WEAVE_PALETTES = [
  { gradient: 'from-purple-500 to-indigo-600', accent: 'purple', bg: 'bg-purple-50 dark:bg-purple-950/30', color: '#8b5cf6' },
  { gradient: 'from-emerald-500 to-teal-600', accent: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/30', color: '#10b981' },
  { gradient: 'from-amber-500 to-orange-600', accent: 'amber', bg: 'bg-amber-50 dark:bg-amber-950/30', color: '#f59e0b' },
  { gradient: 'from-cyan-500 to-blue-600', accent: 'cyan', bg: 'bg-cyan-50 dark:bg-cyan-950/30', color: '#06b6d4' },
  { gradient: 'from-rose-500 to-pink-600', accent: 'rose', bg: 'bg-rose-50 dark:bg-rose-950/30', color: '#f43f5e' },
]

function getWeavePalette(name: string, customStyle?: NodeVisualStyle) {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const basePalette = WEAVE_PALETTES[hash % WEAVE_PALETTES.length]

  if (customStyle?.accentColor) {
    return { ...basePalette, color: customStyle.accentColor, hasCustomStyle: true }
  }

  return { ...basePalette, hasCustomStyle: false }
}

function countLooms(node: CodexTreeNode): number {
  if (!node.children) return 0
  return node.children.filter(child => child.type === 'dir' && child.level === 'loom').length
}

/** Count all descendants (files and folders) recursively */
function countDescendants(node: CodexTreeNode): number {
  if (!node.children || node.children.length === 0) return 0
  let count = node.children.length
  for (const child of node.children) {
    count += countDescendants(child)
  }
  return count
}

/** Get all descendant paths (for recursive selection) */
function getAllDescendantPaths(node: CodexTreeNode): string[] {
  const paths: string[] = []
  if (node.children) {
    for (const child of node.children) {
      paths.push(child.path)
      paths.push(...getAllDescendantPaths(child))
    }
  }
  return paths
}

// ==================== Smart Selection Checkbox ====================
// Two modes: single select (click) or recursive select all children (shift+click or long press)

interface SmartSelectionCheckboxProps {
  isSelected: boolean
  hasChildren: boolean
  childCount?: number
  onSelectSingle: (e: React.MouseEvent) => void
  onSelectRecursive: (e: React.MouseEvent) => Promise<void> | void
  isDark: boolean
  isLoading?: boolean
  className?: string
}

function SmartSelectionCheckbox({
  isSelected,
  hasChildren,
  childCount = 0,
  onSelectSingle,
  onSelectRecursive,
  isDark,
  isLoading = false,
  className = '',
}: SmartSelectionCheckboxProps) {
  const [showRecursive, setShowRecursive] = useState(false)
  const [localLoading, setLocalLoading] = useState(false)
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null)
  const isProcessing = isLoading || localLoading

  // Handle click - single select, with shift = recursive
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (isProcessing) return

    // Shift+click or Alt+click = recursive select
    if ((e.shiftKey || e.altKey) && hasChildren) {
      handleRecursiveSelect(e)
    } else {
      onSelectSingle(e)
    }
  }, [isProcessing, hasChildren, onSelectSingle])

  // Handle recursive select with loading state
  const handleRecursiveSelect = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (isProcessing) return

    // For large selections, show loading state
    if (childCount > 50) {
      setLocalLoading(true)
      // Use requestAnimationFrame to allow UI to update before heavy operation
      await new Promise(resolve => requestAnimationFrame(resolve))
    }

    try {
      await onSelectRecursive(e)
    } finally {
      setLocalLoading(false)
    }
  }, [isProcessing, childCount, onSelectRecursive])

  // Long press detection for touch devices
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!hasChildren) return

    longPressTimeout.current = setTimeout(() => {
      setShowRecursive(true)
    }, 500)
  }, [hasChildren])

  const handlePointerUp = useCallback(() => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current)
      longPressTimeout.current = null
    }
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current)
      }
    }
  }, [])

  return (
    <motion.div
      className={`
        relative flex items-center gap-0.5 flex-shrink-0
        opacity-0 scale-90
        group-hover/weave:opacity-100 group-hover/weave:scale-100
        group-hover/loom:opacity-100 group-hover/loom:scale-100
        group-hover/strand:opacity-100 group-hover/strand:scale-100
        transition-all duration-200 ease-out
        ${isSelected ? 'opacity-100 scale-100' : ''}
        ${className}
      `}
      initial={false}
      animate={isSelected ? { opacity: 1, scale: 1 } : undefined}
      onMouseEnter={() => hasChildren && setShowRecursive(true)}
      onMouseLeave={() => setShowRecursive(false)}
    >
      {/* Main checkbox - single select */}
      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        disabled={isProcessing}
        className={`
          rounded p-0.5 transition-all duration-150 touch-manipulation
          ${isProcessing ? 'cursor-wait' : 'cursor-pointer'}
          ${isSelected
            ? 'text-blue-500'
            : isDark
              ? 'text-zinc-500 hover:text-zinc-300'
              : 'text-zinc-400 hover:text-zinc-600'
          }
          hover:bg-blue-500/10 active:scale-95
        `}
        title={
          hasChildren
            ? isSelected
              ? 'Deselect (Shift+click to include children)'
              : 'Select (Shift+click to include children)'
            : isSelected ? 'Deselect' : 'Select'
        }
      >
        {isProcessing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isSelected ? (
          <CheckSquare className="w-3 h-3" />
        ) : (
          <Square className="w-3 h-3" />
        )}
      </button>

      {/* Recursive select button - only shows for folders on hover */}
      <AnimatePresence>
        {hasChildren && showRecursive && !isProcessing && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, x: -4 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -4 }}
            transition={{ duration: 0.15 }}
            onClick={handleRecursiveSelect}
            className={`
              rounded p-0.5 transition-colors duration-150
              ${isDark
                ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/20'
                : 'text-purple-500 hover:text-purple-600 hover:bg-purple-500/10'
              }
              active:scale-95
            `}
            title={`Select all (${childCount} items)`}
          >
            <CheckCheck className="w-3 h-3" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Child count badge - shows on hover for folders */}
      <AnimatePresence>
        {hasChildren && showRecursive && childCount > 0 && !isProcessing && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`
              text-[9px] font-medium px-1 rounded-full
              ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-600'}
            `}
          >
            {childCount > 99 ? '99+' : childCount}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Legacy wrapper for backward compatibility
function SelectionCheckbox({
  isSelected,
  onToggle,
  isDark,
  className = '',
}: {
  isSelected: boolean
  onToggle: (e: React.MouseEvent) => void
  isDark: boolean
  className?: string
}) {
  return (
    <SmartSelectionCheckbox
      isSelected={isSelected}
      hasChildren={false}
      onSelectSingle={onToggle}
      onSelectRecursive={onToggle}
      isDark={isDark}
      className={className}
    />
  )
}

// ==================== Weave Node Renderer (Single Row) ====================

function WeaveNode({
  node,
  style,
  dragHandle,
  tree,
  isDark,
  enableDragDrop,
  onNavigate,
  onOpenExternal,
  isMobile,
  selectionMode,
  isPathSelected,
  onToggleSelection,
  onSelectRecursive,
  onToggleRecursive,
  fontScale = DEFAULT_FONT_SCALE,
}: NodeRendererProps<CodexTreeNode> & {
  isDark: boolean
  enableDragDrop: boolean
  onNavigate?: (path: string) => void
  onOpenExternal?: (path: string) => void
  isMobile?: boolean
  selectionMode?: boolean
  isPathSelected?: (path: string) => boolean
  onToggleSelection?: (path: string, level?: 'weave' | 'loom' | 'strand' | 'other') => void
  onSelectRecursive?: (path: string, allPaths: string[]) => Promise<void> | void
  onToggleRecursive?: (path: string, allPaths: string[]) => Promise<void> | void
  fontScale?: TreeFontScale
}) {
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)

  const isSelected = node.isSelected
  const isEditing = node.isEditing
  const customStyle = node.data.style
  const palette = getWeavePalette(node.data.name, customStyle)
  const loomCount = countLooms(node.data)
  const displayName = formatNodeName(node.data.name)
  const isInSelection = selectionMode && isPathSelected?.(node.data.path)

  // Count descendants for recursive selection
  const descendantCount = useMemo(() => countDescendants(node.data), [node.data])
  const hasChildren = !!(node.data.children && node.data.children.length > 0)

  // Handle recursive toggle selection (select or deselect all children)
  const handleToggleRecursive = useCallback(async () => {
    const handler = onToggleRecursive || onSelectRecursive
    if (!handler) return
    const allPaths = [node.data.path, ...getAllDescendantPaths(node.data)]
    await handler(node.data.path, allPaths)
  }, [node.data, onSelectRecursive, onToggleRecursive])

  return (
    <div ref={dragHandle} style={style} className="group/weave flex items-center">
      {/* Smart Selection Checkbox - clicking on weave selects ALL children (strands) recursively */}
      {selectionMode && onToggleSelection && (
        <SmartSelectionCheckbox
          isSelected={!!isInSelection}
          hasChildren={hasChildren}
          childCount={descendantCount}
          onSelectSingle={handleToggleRecursive} // Default click = recursive toggle all strands
          onSelectRecursive={handleToggleRecursive}
          isDark={isDark}
          className="ml-0.5"
        />
      )}

      <button
        onClick={(e) => {
          // Cmd/Ctrl+click opens in new browser tab
          if (e.metaKey || e.ctrlKey) {
            onOpenExternal?.(node.data.path)
            return
          }
          node.toggle() // Always toggle/navigate, checkbox handles selection
        }}
        onDoubleClick={(e) => {
          // Double-click opens in new browser tab
          e.preventDefault()
          e.stopPropagation()
          onOpenExternal?.(node.data.path)
        }}
        className={`
          flex-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-left min-w-0
          transition-colors duration-100 touch-manipulation
          ${isSelected
            ? 'bg-purple-100 dark:bg-purple-900/40 ring-1 ring-inset ring-purple-400 dark:ring-purple-500'
            : 'hover:bg-purple-50/60 dark:hover:bg-purple-900/20 active:bg-purple-100 dark:active:bg-purple-900/40'
          }
          ${node.isDragging ? 'opacity-50' : ''}
          ${node.willReceiveDrop ? 'ring-2 ring-purple-500' : ''}
        `}
      >
        {/* Drag Handle */}
        {enableDragDrop && !isMobile && (
          <GripVertical className="w-2 h-2 flex-shrink-0 cursor-grab text-transparent group-hover/weave:text-purple-400 transition-colors" />
        )}

        {/* Icon - more compact */}
        {customStyle?.emoji ? (
          <span className="text-xs flex-shrink-0">{customStyle.emoji}</span>
        ) : customStyle?.icon && isValidIconName(customStyle.icon) ? (
          <div className={`p-px rounded bg-gradient-to-br ${palette.gradient} flex-shrink-0`}>
            <DynamicIcon name={customStyle.icon} className="w-2.5 h-2.5 text-white" />
          </div>
        ) : (
          <div className={`p-px rounded bg-gradient-to-br ${palette.gradient} flex-shrink-0`}>
            <Layers className="w-2.5 h-2.5 text-white" />
          </div>
        )}

        {/* Name - give more space */}
        {isEditing ? (
          <input
            autoFocus
            type="text"
            defaultValue={node.data.name}
            className={`flex-1 px-2 py-0.5 rounded text-xs border outline-none min-w-0 ${isDark ? 'bg-zinc-900 border-purple-500 text-white' : 'bg-white border-purple-500 text-zinc-900'}`}
            onBlur={(e) => node.submit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') node.submit(e.currentTarget.value)
              if (e.key === 'Escape') node.reset()
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 ${fontScale.text} font-bold truncate capitalize text-zinc-900 dark:text-zinc-100 min-w-0`}>
            {displayName}
          </span>
        )}

        {/* Stats - compact */}
        <span className={`flex items-center gap-0.5 ${fontScale.textXs} text-zinc-500 dark:text-zinc-400 flex-shrink-0`}>
          <Box className={fontScale.iconSm + ' text-amber-500'} />
          {loomCount}
        </span>
        <span className={`flex items-center gap-0.5 ${fontScale.textXs} text-zinc-500 dark:text-zinc-400 flex-shrink-0`}>
          <FileText className={fontScale.iconSm + ' text-emerald-500'} />
          {node.data.strandCount}
        </span>

        {/* Hover Actions */}
        {!isEditing && !isMobile && (
          <div className="opacity-0 group-hover/weave:opacity-100 transition-opacity flex-shrink-0">
            <NodeActions
              node={node.data}
              canHaveChildren={true}
              onEdit={() => node.edit()}
              onDelete={() => tree.delete(node.id)}
              onCreate={() => tree.create({ parentId: node.id })}
              onOpenExternal={() => onOpenExternal?.(node.data.path)}
              onCopySlug={() => navigator.clipboard.writeText(node.data.path.replace(/\//g, '-'))}
              onCopyPath={() => navigator.clipboard.writeText(node.data.path)}
              isDark={isDark}
            />
          </div>
        )}

        {/* Expand Arrow */}
        <ChevronRight className={`w-3 h-3 text-purple-500 transition-transform flex-shrink-0 ${node.isOpen ? 'rotate-90' : ''}`} />

        {isMobile && (
          <button onClick={(e) => { e.stopPropagation(); setMobileActionsOpen(true) }} className="p-1 flex-shrink-0">
            <MoreHorizontal className="w-4 h-4 text-zinc-400" />
          </button>
        )}
      </button>

      {isMobile && (
        <MobileNodeActions
          node={node.data}
          canHaveChildren={true}
          isOpen={mobileActionsOpen}
          onClose={() => setMobileActionsOpen(false)}
          onEdit={() => { setMobileActionsOpen(false); node.edit() }}
          onDelete={() => { setMobileActionsOpen(false); tree.delete(node.id) }}
          onCreateStrand={() => { setMobileActionsOpen(false); tree.create({ parentId: node.id }) }}
          onOpenExternal={() => { setMobileActionsOpen(false); onOpenExternal?.(node.data.path) }}
          onCopySlug={() => navigator.clipboard.writeText(node.data.path.replace(/\//g, '-'))}
          onCopyPath={() => navigator.clipboard.writeText(node.data.path)}
          isDark={isDark}
        />
      )}
    </div>
  )
}

// ==================== Loom Node Renderer ====================

function LoomNode({
  node,
  style,
  dragHandle,
  tree,
  isDark,
  enableDragDrop,
  onNavigate,
  onOpenExternal,
  isMobile,
  selectionMode,
  isPathSelected,
  onToggleSelection,
  onSelectRecursive,
  onToggleRecursive,
  fontScale = DEFAULT_FONT_SCALE,
}: NodeRendererProps<CodexTreeNode> & {
  isDark: boolean
  enableDragDrop: boolean
  onNavigate?: (path: string) => void
  onOpenExternal?: (path: string) => void
  isMobile?: boolean
  selectionMode?: boolean
  isPathSelected?: (path: string) => boolean
  onToggleSelection?: (path: string, level?: 'weave' | 'loom' | 'strand' | 'other') => void
  onSelectRecursive?: (path: string, allPaths: string[]) => Promise<void> | void
  onToggleRecursive?: (path: string, allPaths: string[]) => Promise<void> | void
  fontScale?: TreeFontScale
}) {
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)

  const isSelected = node.isSelected
  const isEditing = node.isEditing
  const customStyle = node.data.style
  const displayName = formatNodeName(node.data.name)
  const isInSelection = selectionMode && isPathSelected?.(node.data.path)

  // Count descendants for recursive selection
  const descendantCount = useMemo(() => countDescendants(node.data), [node.data])
  const hasChildren = !!(node.data.children && node.data.children.length > 0)

  // Handle recursive toggle selection (select or deselect all children)
  const handleToggleRecursive = useCallback(async () => {
    const handler = onToggleRecursive || onSelectRecursive
    if (!handler) return
    const allPaths = [node.data.path, ...getAllDescendantPaths(node.data)]
    await handler(node.data.path, allPaths)
  }, [node.data, onSelectRecursive, onToggleRecursive])

  return (
    <div
      ref={dragHandle}
      style={style}
      className="group/loom flex items-center"
    >
      {/* Smart Selection Checkbox - visible on hover, with recursive option */}
      {selectionMode && onToggleSelection && (
        <SmartSelectionCheckbox
          isSelected={!!isInSelection}
          hasChildren={hasChildren}
          childCount={descendantCount}
          onSelectSingle={handleToggleRecursive} // Default click = recursive toggle all strands
          onSelectRecursive={handleToggleRecursive}
          isDark={isDark}
          className="ml-0.5"
        />
      )}

      <button
        onClick={(e) => {
          // Cmd/Ctrl+click opens in new browser tab
          if (e.metaKey || e.ctrlKey) {
            onOpenExternal?.(node.data.path)
            return
          }
          // Always navigate - checkbox handles selection separately
          node.toggle()
          onNavigate?.(node.data.path)
        }}
        onDoubleClick={(e) => {
          // Double-click opens in new browser tab
          e.preventDefault()
          e.stopPropagation()
          onOpenExternal?.(node.data.path)
        }}
        className={`
          flex-1 flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-left min-w-0
          transition-colors duration-100 touch-manipulation
          ${isSelected
            ? 'bg-amber-100 dark:bg-amber-900/40 ring-1 ring-inset ring-amber-400 dark:ring-amber-500'
            : 'hover:bg-amber-50/60 dark:hover:bg-amber-900/20 active:bg-amber-100 dark:active:bg-amber-900/40'
          }
          ${node.isDragging ? 'opacity-50' : ''}
          ${node.willReceiveDrop ? 'ring-2 ring-amber-500' : ''}
        `}
        style={customStyle?.backgroundColor ? { backgroundColor: customStyle.backgroundColor } : undefined}
      >
        {/* Drag Handle - CSS hover */}
        {enableDragDrop && !isMobile && (
          <GripVertical className="w-2 h-2 flex-shrink-0 cursor-grab text-transparent group-hover/loom:text-amber-400 transition-colors" />
        )}

        {/* Icon */}
        {customStyle?.emoji ? (
          <span className="text-[10px] flex-shrink-0">{customStyle.emoji}</span>
        ) : customStyle?.icon && isValidIconName(customStyle.icon) ? (
          <DynamicIcon name={customStyle.icon} className="w-3 h-3 flex-shrink-0" style={{ color: customStyle?.accentColor || 'rgb(217 119 6)' }} />
        ) : (
          <Box className="w-3 h-3 flex-shrink-0 text-amber-600" />
        )}

        {/* Name - give more space */}
        {isEditing ? (
          <input
            autoFocus
            type="text"
            defaultValue={node.data.name}
            className={`flex-1 px-2 py-0.5 rounded text-xs border outline-none min-w-0 ${isDark ? 'bg-zinc-900 border-amber-500 text-white' : 'bg-white border-amber-500 text-zinc-900'}`}
            onBlur={(e) => node.submit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') node.submit(e.currentTarget.value)
              if (e.key === 'Escape') node.reset()
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 ${fontScale.text} font-semibold truncate capitalize min-w-0 ${customStyle?.darkText ? 'text-zinc-900' : 'text-zinc-800 dark:text-zinc-100'}`} style={customStyle?.textColor ? { color: customStyle.textColor } : undefined}>
            {displayName}
          </span>
        )}

        {/* Strand count */}
        <span className={`${fontScale.textXs} font-bold px-1 py-0.5 rounded flex-shrink-0 ${customStyle?.accentColor ? 'text-white' : 'bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200'}`} style={customStyle?.accentColor ? { backgroundColor: customStyle.accentColor } : undefined}>
          {node.data.strandCount}
        </span>

        {/* Hover Actions - CSS visibility */}
        {!isEditing && !isMobile && (
          <div className="opacity-0 group-hover/loom:opacity-100 transition-opacity flex-shrink-0">
            <NodeActions
              node={node.data}
              canHaveChildren={true}
              onEdit={() => node.edit()}
              onDelete={() => tree.delete(node.id)}
              onCreate={() => tree.create({ parentId: node.id })}
              onOpenExternal={() => onOpenExternal?.(node.data.path)}
              onCopySlug={() => navigator.clipboard.writeText(node.data.path.replace(/\//g, '-'))}
              onCopyPath={() => navigator.clipboard.writeText(node.data.path)}
              isDark={isDark}
            />
          </div>
        )}

        {/* Expand Arrow - CSS transition */}
        <ChevronRight className={`w-2.5 h-2.5 text-amber-500 transition-transform flex-shrink-0 ${node.isOpen ? 'rotate-90' : ''}`} />

        {/* Mobile More Button */}
        {isMobile && (
          <button
            onClick={(e) => { e.stopPropagation(); setMobileActionsOpen(true) }}
            className="p-1 rounded flex-shrink-0"
          >
            <MoreHorizontal className="w-4 h-4 text-zinc-400" />
          </button>
        )}
      </button>

      {/* Mobile Actions Sheet */}
      {isMobile && (
        <MobileNodeActions
          node={node.data}
          canHaveChildren={true}
          isOpen={mobileActionsOpen}
          onClose={() => setMobileActionsOpen(false)}
          onEdit={() => { setMobileActionsOpen(false); node.edit() }}
          onDelete={() => { setMobileActionsOpen(false); tree.delete(node.id) }}
          onCreateStrand={() => { setMobileActionsOpen(false); tree.create({ parentId: node.id }) }}
          onOpenExternal={() => { setMobileActionsOpen(false); onOpenExternal?.(node.data.path) }}
          onCopySlug={() => navigator.clipboard.writeText(node.data.path.replace(/\//g, '-'))}
          onCopyPath={() => navigator.clipboard.writeText(node.data.path)}
          isDark={isDark}
        />
      )}
    </div>
  )
}

// ==================== Strand Node Renderer ====================

// Track last click for double-click detection (shared across StrandNode instances)
const strandLastClickRef = { current: { path: '', time: 0 } }

function StrandNode({
  node,
  style,
  dragHandle,
  tree,
  isDark,
  enableDragDrop,
  onNavigate,
  onOpenExternal,
  onOpenFile,
  isMobile,
  selectionMode,
  isPathSelected,
  onToggleSelection,
  onSelectRecursive,
  onToggleRecursive,
  fontScale = DEFAULT_FONT_SCALE,
}: NodeRendererProps<CodexTreeNode> & {
  isDark: boolean
  enableDragDrop: boolean
  onNavigate?: (path: string) => void
  onOpenExternal?: (path: string) => void
  /** VS Code-style file open: single-click = preview, double-click = permanent */
  onOpenFile?: (path: string, options?: OpenFileOptions) => void
  isMobile?: boolean
  selectionMode?: boolean
  isPathSelected?: (path: string) => boolean
  onToggleSelection?: (path: string, level?: 'weave' | 'loom' | 'strand' | 'other') => void
  onSelectRecursive?: (path: string, allPaths: string[]) => Promise<void> | void
  onToggleRecursive?: (path: string, allPaths: string[]) => Promise<void> | void
  fontScale?: TreeFontScale
}) {
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)

  const isSelected = node.isSelected
  const isEditing = node.isEditing
  const isDir = node.isInternal
  const displayName = formatNodeName(node.data.name)
  const isInSelection = selectionMode && isPathSelected?.(node.data.path)

  // Count descendants for recursive selection (only for directories)
  const descendantCount = useMemo(() => isDir ? countDescendants(node.data) : 0, [node.data, isDir])
  const hasChildren = isDir && !!(node.data.children && node.data.children.length > 0)

  // Handle recursive toggle selection (select or deselect all children)
  const handleToggleRecursive = useCallback(async () => {
    const handler = onToggleRecursive || onSelectRecursive
    if (!handler || !isDir) return
    const allPaths = [node.data.path, ...getAllDescendantPaths(node.data)]
    await handler(node.data.path, allPaths)
  }, [node.data, onSelectRecursive, onToggleRecursive, isDir])

  // VS Code-style click handler: detect double-click for permanent tab
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()

    // Cmd/Ctrl+click opens in new browser tab
    if ((e.metaKey || e.ctrlKey) && !isDir) {
      onOpenExternal?.(node.data.path)
      return
    }

    if (isDir) {
      node.toggle()
      onNavigate?.(node.data.path)
    } else {
      // VS Code-style double-click detection
      const now = Date.now()
      const lastClick = strandLastClickRef.current
      const isDoubleClick = lastClick.path === node.data.path &&
        (now - lastClick.time) < DOUBLE_CLICK_DELAY

      // Update last click reference
      strandLastClickRef.current = { path: node.data.path, time: now }

      if (isDoubleClick) {
        // Double-click: Open as permanent tab
        console.log('[StrandNode] DOUBLE-CLICK: Opening as permanent tab:', node.data.path)
        onOpenFile?.(node.data.path, { asPreview: false })
      } else {
        // Single-click: Open as preview tab
        console.log('[StrandNode] Single-click: Opening as preview:', node.data.path)
        onOpenFile?.(node.data.path, { asPreview: true })
      }

      // Also select in tree for visual feedback
      tree.select(node.id)
    }
  }, [node, isDir, onOpenExternal, onNavigate, onOpenFile, tree])

  return (
    <div
      ref={dragHandle}
      style={style}
      className="group/strand flex items-center"
    >
      {/* Smart Selection Checkbox - visible on hover, with recursive option for dirs */}
      {selectionMode && onToggleSelection && (
        <SmartSelectionCheckbox
          isSelected={!!isInSelection}
          hasChildren={hasChildren}
          childCount={descendantCount}
          onSelectSingle={() => onToggleSelection(node.data.path, isDir ? 'other' : 'strand')}
          onSelectRecursive={handleToggleRecursive}
          isDark={isDark}
          className="ml-0.5"
        />
      )}

      <button
        onClick={handleClick}
        onDoubleClick={(e) => {
          // Prevent default double-click behavior (text selection)
          e.preventDefault()
          e.stopPropagation()
        }}
        className={`
          flex-1 flex items-center gap-0.5 rounded-sm px-1 py-0.5 text-left min-w-0
          transition-colors duration-100 touch-manipulation
          ${isSelected
            ? 'bg-emerald-100 dark:bg-emerald-900/40 ring-1 ring-inset ring-emerald-400 dark:ring-emerald-500'
            : isDir
              ? 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 active:bg-zinc-200 dark:active:bg-zinc-700'
              : 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/15 active:bg-emerald-100 dark:active:bg-emerald-900/30'
          }
          ${node.isDragging ? 'opacity-50' : ''}
          ${node.willReceiveDrop ? 'ring-2 ring-emerald-500' : ''}
        `}
      >
        {/* Drag Handle - CSS hover */}
        {enableDragDrop && !isMobile && (
          <GripVertical className="w-2 h-2 flex-shrink-0 cursor-grab text-transparent group-hover/strand:text-zinc-400 transition-colors" />
        )}

        {/* Expand Arrow (for directories) - CSS transition */}
        {isDir ? (
          <ChevronRight className={`w-2 h-2 text-zinc-500 transition-transform flex-shrink-0 ${node.isOpen ? 'rotate-90' : ''}`} />
        ) : (
          <div className="w-1" />
        )}

        {/* Icon */}
        <NodeIcon
          level={node.data.level}
          type={node.data.type}
          isOpen={node.isOpen}
          contentType={node.data.contentType}
          className="w-3 h-3 flex-shrink-0"
        />

        {/* Name - More space for file names */}
        {isEditing ? (
          <input
            autoFocus
            type="text"
            defaultValue={node.data.name}
            className={`flex-1 px-1.5 py-0.5 rounded text-xs border outline-none min-w-0 ${isDark ? 'bg-zinc-900 border-emerald-500 text-white' : 'bg-white border-emerald-500 text-zinc-900'}`}
            onBlur={(e) => node.submit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') node.submit(e.currentTarget.value)
              if (e.key === 'Escape') node.reset()
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 ${fontScale.text} font-medium truncate capitalize leading-tight min-w-0 ${isSelected
            ? 'text-emerald-800 dark:text-emerald-200 font-semibold'
            : isDir
              ? 'text-zinc-800 dark:text-zinc-100'
              : 'text-zinc-700 dark:text-zinc-200'
            }`}>
            {displayName}
          </span>
        )}

        {/* Strand count badge (for directories) */}
        {isDir && node.data.strandCount > 0 && !isEditing && (
          <span className={`${fontScale.textXs} font-semibold px-0.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex-shrink-0`}>
            {node.data.strandCount}
          </span>
        )}

        {/* Hover Actions - CSS visibility */}
        {!isEditing && !isMobile && (
          <div className="opacity-0 group-hover/strand:opacity-100 transition-opacity flex-shrink-0">
            <NodeActions
              node={node.data}
              canHaveChildren={isDir}
              onEdit={() => node.edit()}
              onDelete={() => tree.delete(node.id)}
              onCreate={isDir ? () => tree.create({ parentId: node.id }) : undefined}
              onOpenExternal={() => onOpenExternal?.(node.data.path)}
              onCopySlug={() => navigator.clipboard.writeText(node.data.path.replace(/\.md$/, '').replace(/\//g, '-'))}
              onCopyPath={() => navigator.clipboard.writeText(node.data.path)}
              isDark={isDark}
            />
          </div>
        )}

        {/* Mobile More Button */}
        {isMobile && (
          <button
            onClick={(e) => { e.stopPropagation(); setMobileActionsOpen(true) }}
            className="p-1 rounded flex-shrink-0"
          >
            <MoreHorizontal className="w-4 h-4 text-zinc-400" />
          </button>
        )}
      </button>

      {/* Mobile Actions Sheet */}
      {isMobile && (
        <MobileNodeActions
          node={node.data}
          canHaveChildren={isDir}
          isOpen={mobileActionsOpen}
          onClose={() => setMobileActionsOpen(false)}
          onEdit={() => { setMobileActionsOpen(false); node.edit() }}
          onDelete={() => { setMobileActionsOpen(false); tree.delete(node.id) }}
          onCreateStrand={isDir ? () => { setMobileActionsOpen(false); tree.create({ parentId: node.id }) } : undefined}
          onOpenExternal={() => { setMobileActionsOpen(false); onOpenExternal?.(node.data.path) }}
          onCopySlug={() => navigator.clipboard.writeText(node.data.path.replace(/\.md$/, '').replace(/\//g, '-'))}
          onCopyPath={() => navigator.clipboard.writeText(node.data.path)}
          isDark={isDark}
        />
      )}
    </div>
  )
}

// ==================== Generic Folder Node Renderer ====================

function FolderNode({
  node,
  style,
  dragHandle,
  tree,
  isDark,
  enableDragDrop,
  onNavigate,
  onOpenExternal,
  isMobile,
  fontScale = DEFAULT_FONT_SCALE,
}: NodeRendererProps<CodexTreeNode> & {
  isDark: boolean
  enableDragDrop: boolean
  onNavigate?: (path: string) => void
  onOpenExternal?: (path: string) => void
  isMobile?: boolean
  fontScale?: TreeFontScale
}) {
  const isSelected = node.isSelected
  const isEditing = node.isEditing
  const displayName = formatNodeName(node.data.name)

  return (
    <div
      ref={dragHandle}
      style={style}
      className="group/folder"
    >
      <button
        onClick={() => node.toggle()}
        className={`
          w-full flex items-center gap-1.5 rounded px-2 py-0.5 text-left touch-manipulation
          ${isSelected
            ? 'bg-zinc-200 dark:bg-zinc-700'
            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }
          ${node.isDragging ? 'opacity-50' : ''}
        `}
      >
        {enableDragDrop && !isMobile && (
          <GripVertical className="w-2.5 h-2.5 flex-shrink-0 cursor-grab text-transparent group-hover/folder:text-zinc-400 transition-colors" />
        )}

        <ChevronRight className={`w-2.5 h-2.5 text-zinc-500 transition-transform flex-shrink-0 ${node.isOpen ? 'rotate-90' : ''}`} />

        {node.isOpen ? (
          <FolderOpen className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        ) : (
          <Folder className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        )}

        {isEditing ? (
          <input
            autoFocus
            type="text"
            defaultValue={node.data.name}
            className={`flex-1 px-2 py-0.5 rounded text-xs border outline-none ${isDark ? 'bg-zinc-900 border-zinc-500 text-white' : 'bg-white border-zinc-500 text-zinc-900'}`}
            onBlur={(e) => node.submit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') node.submit(e.currentTarget.value)
              if (e.key === 'Escape') node.reset()
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 ${fontScale.text} font-medium text-zinc-600 dark:text-zinc-300 truncate`}>
            {displayName}
          </span>
        )}

        {node.data.strandCount > 0 && (
          <span className={`${fontScale.textSm} font-semibold px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500`}>
            {node.data.strandCount}
          </span>
        )}
      </button>
    </div>
  )
}

// ==================== Main Tree Node Router ====================

function TreeNode(props: NodeRendererProps<CodexTreeNode> & {
  isDark: boolean
  enableDragDrop: boolean
  onNavigate?: (path: string) => void
  onOpenExternal?: (path: string) => void
  onOpenFile?: (path: string, options?: OpenFileOptions) => void
  isMobile?: boolean
  rowHeight?: number
  showSwipeActions?: boolean
  selectionMode?: boolean
  isPathSelected?: (path: string) => boolean
  isSelectedOrAncestorSelected?: (path: string, ancestorPaths: string[]) => boolean
  onToggleSelection?: (path: string, level?: 'weave' | 'loom' | 'strand' | 'other') => void
  onSelectRecursive?: (path: string, allPaths: string[]) => Promise<void> | void
  onToggleRecursive?: (path: string, allPaths: string[]) => Promise<void> | void
  fontScale?: TreeFontScale
}) {
  const { node } = props
  const level = node.data.level

  // Route to appropriate renderer based on hierarchy level
  switch (level) {
    case 'weave':
      return <WeaveNode {...props} />
    case 'loom':
      return <LoomNode {...props} />
    case 'strand':
      return <StrandNode {...props} />
    case 'fabric':
    case 'folder':
    default:
      if (node.isInternal) {
        return <FolderNode {...props} />
      }
      return <StrandNode {...props} />
  }
}

// ==================== Main Tree View Component ====================

export default function CodexTreeView({
  data,
  selectedPath,
  onSelect,
  onNavigate,
  onOpenExternal,
  isDark = false,
  height,
  rowHeight: propRowHeight,
  indent: propIndent,
  enableDragDrop: propEnableDragDrop,
  onTreeChange,
  onMoveComplete,
  onDeleteComplete,
  searchTerm = '',
  initialExpandedPaths,
  onExpandChange,
  loading = false,
  compact = false,
  totalStrands = 0,
  totalWeaves = 0,
  fontScale: propFontScale,
  // Multi-selection props
  selectionMode = false,
  selectedPaths,
  onToggleSelection,
  isPathSelected,
  isSelectedOrAncestorSelected,
  onSelectRecursive,
  onToggleRecursive,
}: CodexTreeViewProps) {
  const treeRef = useRef<TreeApi<CodexTreeNode>>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [measuredHeight, setMeasuredHeight] = useState(600)
  const [visibleRowCount, setVisibleRowCount] = useState(0)

  // Expand/collapse all state
  const [isExpanding, setIsExpanding] = useState(false)
  const [expandProgress, setExpandProgress] = useState(0)
  const [isAllExpanded, setIsAllExpanded] = useState(false)
  const expandCancelRef = useRef(false)

  // Get responsive configuration
  const responsive = useResponsiveTree()
  const { isMobile, isTablet, isTouchDevice } = useDeviceFeatures()
  const { config } = responsive

  // Use responsive values or props
  const effectiveRowHeight = propRowHeight ?? (compact ? 36 : config.rowHeight)
  const effectiveIndent = propIndent ?? config.indent
  const effectiveEnableDragDrop = propEnableDragDrop ?? config.enableDragDrop
  const showSwipeActions = config.showSwipeActions
  const effectiveFontScale = propFontScale ?? DEFAULT_FONT_SCALE

  // Calculate container height - prefer measured height from container ref
  // But cap at actual content height to avoid extra scrollable space
  const containerHeight = useMemo(() => {
    const maxHeight = typeof height === 'number'
      ? height
      : measuredHeight > 100
        ? measuredHeight
        : responsive.viewport.height - 200

    // If we have a visible row count from the tree, use that for precise height
    if (visibleRowCount > 0) {
      const contentHeight = visibleRowCount * effectiveRowHeight + 16 // +16 for padding
      return Math.min(maxHeight, contentHeight)
    }

    return maxHeight
  }, [height, measuredHeight, responsive.viewport.height, visibleRowCount, effectiveRowHeight])

  // Transform data for arborist
  const treeData = useMemo(() => {
    return transformToArboristData(data)
  }, [data])

  // Local state for controlled tree
  const [localData, setLocalData] = useState<CodexTreeNode[]>(treeData)

  // Update local data when source data changes
  React.useEffect(() => {
    setLocalData(treeData)
  }, [treeData])

  // Handle node selection - ONLY for strands (files), NOT for looms/weaves/folders
  const handleSelect = useCallback((nodes: { id: string; data: CodexTreeNode }[]) => {
    const selected = nodes[0]
    console.log('[CodexTreeView] handleSelect called:', {
      nodesCount: nodes.length,
      selectedPath: selected?.data?.path,
      selectedName: selected?.data?.name,
      selectedId: selected?.id,
      selectedLevel: selected?.data?.level,
      selectedType: selected?.data?.type,
      hasOnSelect: !!onSelect
    })

    // Only call onSelect for strands (files) - NOT for looms, weaves, or folders
    // Looms/weaves/folders are handled by onNavigate, not onSelect
    if (selected && onSelect) {
      const isDirectory = selected.data.type === 'dir' ||
        selected.data.level === 'loom' ||
        selected.data.level === 'weave' ||
        selected.data.level === 'fabric' ||
        selected.data.level === 'folder'

      if (isDirectory) {
        console.log('[CodexTreeView] Skipping onSelect for directory node:', selected.data.path)
        return
      }

      console.log('[CodexTreeView] Calling onSelect with path:', selected.data.path)
      onSelect(selected.data.path)
    }
  }, [onSelect])

  // Handle move (drag-and-drop)
  const handleMove: MoveHandler<CodexTreeNode> = useCallback(
    ({ dragIds, parentId, index }) => {
      const newData = cloneTree(localData)
      const draggedNodes: CodexTreeNode[] = []

      // Capture original paths before removing from tree
      const originalPaths: Record<string, { path: string; type: 'file' | 'dir' }> = {}
      dragIds.forEach(id => {
        const node = findNodeById(localData, id)
        if (node) {
          originalPaths[id] = { path: node.path, type: node.type }
        }
      })

      const removeFromTree = (nodes: CodexTreeNode[]): CodexTreeNode[] => {
        return nodes.filter(node => {
          if (dragIds.includes(node.id)) {
            draggedNodes.push(node)
            return false
          }
          if (node.children) {
            node.children = removeFromTree(node.children)
          }
          return true
        })
      }

      const withoutDragged = removeFromTree(newData)

      // Get parent path for calculating new paths
      let parentPath = ''
      if (parentId !== null) {
        const parentNode = findNodeById(withoutDragged, parentId)
        if (parentNode) {
          parentPath = parentNode.path
        }
      }

      // Update paths for dragged nodes
      const updatePaths = (nodes: CodexTreeNode[], basePath: string): CodexTreeNode[] => {
        return nodes.map(node => {
          const newPath = basePath ? `${basePath}/${node.name}` : node.name
          const updatedNode = { ...node, path: newPath, id: newPath }
          if (updatedNode.children) {
            updatedNode.children = updatePaths(updatedNode.children, newPath)
          }
          return updatedNode
        })
      }

      const updatedDraggedNodes = updatePaths(draggedNodes, parentPath)

      if (parentId === null) {
        withoutDragged.splice(index, 0, ...updatedDraggedNodes)
        setLocalData(withoutDragged)
      } else {
        const insertIntoParent = (nodes: CodexTreeNode[]): CodexTreeNode[] => {
          return nodes.map(node => {
            if (node.id === parentId) {
              const children = node.children || []
              children.splice(index, 0, ...updatedDraggedNodes)
              return { ...node, children }
            }
            if (node.children) {
              return { ...node, children: insertIntoParent(node.children) }
            }
            return node
          })
        }
        setLocalData(insertIntoParent(withoutDragged))
      }

      // Create move operations for publish flow
      const moveOperations: MoveOperation[] = updatedDraggedNodes.map(node => {
        const original = originalPaths[dragIds.find(id =>
          findNodeById([node], id) || node.name === localData.find(n => n.id === id)?.name
        ) || node.id] || { path: node.id, type: node.type }

        return {
          type: 'move' as const,
          sourcePath: original.path,
          destPath: node.path,
          name: node.name,
          nodeType: node.type,
          timestamp: Date.now(),
        }
      }).filter(op => op.sourcePath !== op.destPath) // Only include actual moves

      if (onTreeChange) {
        onTreeChange(localData)
      }

      // Trigger publish flow if there are actual moves
      if (onMoveComplete && moveOperations.length > 0) {
        onMoveComplete(moveOperations)
      }
    },
    [localData, onTreeChange, onMoveComplete]
  )

  // Handle rename
  const handleRename: RenameHandler<CodexTreeNode> = useCallback(
    ({ id, name }) => {
      const updateName = (nodes: CodexTreeNode[]): CodexTreeNode[] => {
        return nodes.map(node => {
          if (node.id === id) return { ...node, name }
          if (node.children) return { ...node, children: updateName(node.children) }
          return node
        })
      }

      const newData = updateName(cloneTree(localData))
      setLocalData(newData)
      if (onTreeChange) onTreeChange(newData)
    },
    [localData, onTreeChange]
  )

  // Handle delete
  const handleDelete: DeleteHandler<CodexTreeNode> = useCallback(
    ({ ids }) => {
      // Collect info about nodes being deleted BEFORE removing them
      const deletedNodes: DeleteOperation[] = []
      const collectDeleted = (nodes: CodexTreeNode[]) => {
        for (const node of nodes) {
          if (ids.includes(node.id)) {
            deletedNodes.push({
              type: 'delete',
              path: node.path,
              name: node.name,
              nodeType: node.type,
              timestamp: Date.now(),
            })
          }
          if (node.children) {
            collectDeleted(node.children)
          }
        }
      }
      collectDeleted(localData)

      const removeNodes = (nodes: CodexTreeNode[]): CodexTreeNode[] => {
        return nodes
          .filter(node => !ids.includes(node.id))
          .map(node => {
            if (node.children) return { ...node, children: removeNodes(node.children) }
            return node
          })
      }

      const newData = removeNodes(cloneTree(localData))
      setLocalData(newData)
      if (onTreeChange) onTreeChange(newData)

      // Notify parent about deletions for persistence/publish flow
      if (onDeleteComplete && deletedNodes.length > 0) {
        onDeleteComplete(deletedNodes)
      }
    },
    [localData, onTreeChange, onDeleteComplete]
  )

  // Handle create
  const handleCreate: CreateHandler<CodexTreeNode> = useCallback(
    ({ parentId, index, type }) => {
      const newNode: CodexTreeNode = {
        id: `new-${Date.now()}`,
        name: 'New Item',
        path: parentId ? `${parentId}/new-item` : 'new-item',
        type: type === 'internal' ? 'dir' : 'file',
        strandCount: 0,
        level: 'strand',
        children: type === 'internal' ? [] : undefined,
      }

      if (parentId === null) {
        const newData = cloneTree(localData)
        newData.splice(index, 0, newNode)
        setLocalData(newData)
      } else {
        const insertIntoParent = (nodes: CodexTreeNode[]): CodexTreeNode[] => {
          return nodes.map(node => {
            if (node.id === parentId) {
              const children = node.children || []
              children.splice(index, 0, newNode)
              return { ...node, children }
            }
            if (node.children) return { ...node, children: insertIntoParent(node.children) }
            return node
          })
        }
        setLocalData(insertIntoParent(cloneTree(localData)))
      }

      if (onTreeChange) onTreeChange(localData)
      return newNode
    },
    [localData, onTreeChange]
  )

  // Search match function
  const searchMatch = useCallback(
    (node: { data: CodexTreeNode }, term: string) => {
      const lowerTerm = term.toLowerCase()
      return (
        node.data.name.toLowerCase().includes(lowerTerm) ||
        node.data.path.toLowerCase().includes(lowerTerm) ||
        node.data.tags?.some(t => t.toLowerCase().includes(lowerTerm)) ||
        false
      )
    },
    []
  )

  // Count all expandable nodes
  const countExpandableNodes = useCallback((nodes: CodexTreeNode[]): number => {
    let count = 0
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        count++
        count += countExpandableNodes(node.children)
      }
    }
    return count
  }, [])

  // Expand all with async batching for performance
  const handleExpandAll = useCallback(async () => {
    if (!treeRef.current || isExpanding) return

    setIsExpanding(true)
    setExpandProgress(0)
    expandCancelRef.current = false

    const tree = treeRef.current
    const totalNodes = countExpandableNodes(localData)

    if (totalNodes === 0) {
      setIsExpanding(false)
      setIsAllExpanded(true)
      return
    }

    // For small trees, expand immediately
    if (totalNodes < 50) {
      tree.openAll()
      setExpandProgress(100)
      setIsAllExpanded(true)
      setIsExpanding(false)
      return
    }

    // For larger trees, batch expand with progress
    let processed = 0
    const batchSize = 20

    // Get all node IDs that can be expanded
    const getAllNodeIds = (nodes: CodexTreeNode[], acc: string[] = []): string[] => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          acc.push(node.id)
          getAllNodeIds(node.children, acc)
        }
      }
      return acc
    }

    const nodeIds = getAllNodeIds(localData)

    // Process in batches using requestIdleCallback or setTimeout
    const processBatch = (startIndex: number) => {
      if (expandCancelRef.current) {
        setIsExpanding(false)
        return
      }

      const endIndex = Math.min(startIndex + batchSize, nodeIds.length)

      for (let i = startIndex; i < endIndex; i++) {
        const nodeId = nodeIds[i]
        tree.open(nodeId)
      }

      processed = endIndex
      setExpandProgress(Math.round((processed / nodeIds.length) * 100))

      if (endIndex < nodeIds.length) {
        // Continue with next batch, yield to main thread
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => processBatch(endIndex), { timeout: 100 })
        } else {
          setTimeout(() => processBatch(endIndex), 16)
        }
      } else {
        // Done
        setIsAllExpanded(true)
        setIsExpanding(false)
      }
    }

    // Start processing
    processBatch(0)
  }, [localData, isExpanding, countExpandableNodes])

  // Collapse all with cleanup
  const handleCollapseAll = useCallback(() => {
    if (!treeRef.current) return

    expandCancelRef.current = true // Cancel any ongoing expand
    setIsExpanding(false)
    setExpandProgress(0)

    treeRef.current.closeAll()
    setIsAllExpanded(false)

    // Clear any cached open states
    if (onExpandChange) {
      onExpandChange(new Set())
    }
  }, [onExpandChange])

  // Cancel expanding if component unmounts or data changes significantly
  useEffect(() => {
    return () => {
      expandCancelRef.current = true
    }
  }, [])

  // Measure container height dynamically using ResizeObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateHeight = () => {
      const rect = container.getBoundingClientRect()
      if (rect.height > 0) {
        setMeasuredHeight(rect.height)
      }
    }

    // Initial measurement
    updateHeight()

    // Create ResizeObserver for dynamic updates
    const resizeObserver = new ResizeObserver(() => {
      updateHeight()
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Track visible row count from tree for content-aware height
  useEffect(() => {
    const updateRowCount = () => {
      if (treeRef.current) {
        const count = treeRef.current.visibleNodes?.length || 0
        if (count !== visibleRowCount) {
          setVisibleRowCount(count)
        }
      }
    }

    // Update after render and periodically to catch expand/collapse
    updateRowCount()
    const interval = setInterval(updateRowCount, 200)

    return () => clearInterval(interval)
  }, [localData, visibleRowCount])

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <div className="animate-pulse text-sm">Loading tree...</div>
      </div>
    )
  }

  if (localData.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <Search className="w-8 h-8 opacity-50" />
        <p className="text-sm">No items found</p>
      </div>
    )
  }

  // Calculate row height based on node level (weaves need more space)
  const getRowHeight = (node: CodexTreeNode) => {
    if (node.level === 'weave') return compact ? 72 : 80
    if (node.level === 'loom') return compact ? 36 : 40
    return compact ? 28 : 32
  }

  return (
    <div className="h-full flex flex-col space-y-1 sm:space-y-2">
      {/* Stats Header with Expand/Collapse All */}
      {(totalStrands > 0 || totalWeaves > 0) && (
        <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/40 px-1.5 py-1 sm:px-3 sm:py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-3">
              <GitBranch className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-500" />
              <span className="text-[9px] sm:text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {totalStrands.toLocaleString()} strands
              </span>
              <span className="text-[9px] sm:text-xs text-zinc-400">·</span>
              <span className="text-[9px] sm:text-xs text-zinc-500 dark:text-zinc-400">{totalWeaves} weaves</span>
            </div>

            {/* Expand/Collapse All Button */}
            <motion.button
              onClick={isAllExpanded ? handleCollapseAll : handleExpandAll}
              disabled={isExpanding}
              className={`
                relative flex items-center gap-0.5 sm:gap-1.5 px-1 py-0.5 sm:px-2 sm:py-1 rounded-md
                text-[8px] sm:text-[10px] font-medium transition-all
                ${isExpanding
                  ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 cursor-wait'
                  : isAllExpanded
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }
              `}
              whileHover={!isExpanding ? { scale: 1.02 } : undefined}
              whileTap={!isExpanding ? { scale: 0.98 } : undefined}
              title={isAllExpanded ? 'Collapse all folders' : 'Expand all folders'}
            >
              {isExpanding ? (
                <>
                  <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" />
                  <span className="hidden sm:inline">{expandProgress}%</span>
                </>
              ) : isAllExpanded ? (
                <>
                  <ChevronsDownUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Collapse</span>
                </>
              ) : (
                <>
                  <ChevronsUpDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">Expand</span>
                </>
              )}

              {/* Progress bar overlay when expanding */}
              {isExpanding && (
                <motion.div
                  className="absolute inset-0 bg-cyan-500/20 dark:bg-cyan-400/20 rounded-md origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: expandProgress / 100 }}
                  transition={{ duration: 0.1 }}
                />
              )}
            </motion.button>
          </div>
        </div>
      )}

      {/* Tree - with custom scrollbar styling via tree-scroll class */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-auto tree-scroll">
        <Tree<CodexTreeNode>
          ref={treeRef}
          data={localData}

          // Sizing - use measured container height directly (container already excludes stats header)
          width="100%"
          height={containerHeight}
          rowHeight={effectiveRowHeight}
          indent={effectiveIndent}
          overscanCount={isMobile ? 3 : 5}

          // Search
          searchTerm={searchTerm}
          searchMatch={searchMatch}

          // Selection
          selection={selectedPath}
          onSelect={handleSelect}
          disableMultiSelection={isMobile}

          // Drag and Drop
          onMove={effectiveEnableDragDrop && !isTouchDevice ? handleMove : undefined}
          disableDrag={(data) => data.level === 'fabric' || !data.isDraggable || isTouchDevice}
          disableDrop={({ parentNode }) => !parentNode.data.isDroppable || isTouchDevice}

          // CRUD
          onCreate={handleCreate}
          onRename={handleRename}
          onDelete={handleDelete}

          // Rendering
          openByDefault={false}
          childrenAccessor="children"
          idAccessor="id"
        >
          {(props) => (
            <TreeNode
              {...props}
              isDark={isDark}
              enableDragDrop={effectiveEnableDragDrop && !isTouchDevice}
              onNavigate={onNavigate}
              onOpenExternal={onOpenExternal}
              onOpenFile={onSelect}
              isMobile={isMobile}
              rowHeight={effectiveRowHeight}
              showSwipeActions={showSwipeActions}
              selectionMode={selectionMode}
              isPathSelected={isPathSelected}
              onToggleSelection={onToggleSelection}
              onSelectRecursive={onSelectRecursive}
              onToggleRecursive={onToggleRecursive}
              fontScale={effectiveFontScale}
            />
          )}
        </Tree>
      </div>
    </div>
  )
}
