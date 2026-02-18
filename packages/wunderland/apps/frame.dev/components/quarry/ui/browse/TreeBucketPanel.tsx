/**
 * TreeBucketPanel - Combined Tree/Bucket View Panel
 * @module components/quarry/ui/browse/TreeBucketPanel
 *
 * A wrapper that combines CodexTreeView and BucketView with a toggle
 * to switch between them. When navigating inside a weave or loom,
 * users can view child items as cards (bucket) or tree hierarchy.
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { CodexTreeView } from '@/components/quarry/tree'
import type { KnowledgeTreeNode } from '@/components/quarry/types'
import BucketView from './BucketView'
import ContentViewToggle, { useContentViewMode, type ContentViewMode } from './ContentViewToggle'
import type { LoomCardData } from './LoomCard'
import type { StrandCardData } from './StrandCard'

// ============================================================================
// TYPES
// ============================================================================

export interface TreeBucketPanelProps {
  /** Knowledge tree data */
  tree: KnowledgeTreeNode[]
  /** Whether tree is loading */
  loading?: boolean
  /** Currently selected/focused path */
  currentPath?: string
  /** Navigate handler */
  onNavigate?: (path: string) => void
  /** Open in external handler */
  onOpenExternal?: (path: string) => void
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Enable drag and drop in tree */
  enableDragDrop?: boolean
  /** Custom class name */
  className?: string
}

interface CurrentContainer {
  type: 'weave' | 'loom' | null
  path: string
  name: string
  emoji?: string
  accentColor?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find a node and its type in the tree by path
 */
function findNodeByPath(
  nodes: KnowledgeTreeNode[],
  targetPath: string
): { node: KnowledgeTreeNode; type: 'weave' | 'loom' | 'strand' | null } | null {
  for (const node of nodes) {
    if (node.path === targetPath) {
      const type = node.level === 'weave' ? 'weave'
        : node.level === 'loom' ? 'loom'
        : node.type === 'file' ? 'strand'
        : null
      return { node, type }
    }
    if (node.children) {
      const result = findNodeByPath(node.children, targetPath)
      if (result) return result
    }
  }
  return null
}

/**
 * Extract looms from a weave node
 */
function extractLooms(weaveNode: KnowledgeTreeNode): LoomCardData[] {
  if (!weaveNode.children) return []

  return weaveNode.children
    .filter(child => child.level === 'loom' || (child.type === 'dir' && child.children?.some(c => c.type === 'file')))
    .map(loom => ({
      id: loom.path,
      name: loom.name,
      slug: loom.path.split('/').pop() || '',
      path: loom.path,
      description: loom.description,
      coverUrl: loom.visualStyle?.coverImage,
      emoji: loom.visualStyle?.emoji,
      accentColor: loom.visualStyle?.accentColor || weaveNode.visualStyle?.accentColor,
      parentWeave: weaveNode.path,
      parentWeaveName: weaveNode.name,
      parentWeaveEmoji: weaveNode.visualStyle?.emoji,
      strandCount: loom.children?.filter(c => c.type === 'file').length || 0,
      depth: 0,
      lastModified: undefined, // Would need to get from metadata
    }))
}

/**
 * Extract strands from a loom node
 */
function extractStrands(loomNode: KnowledgeTreeNode, parentAccentColor?: string): StrandCardData[] {
  if (!loomNode.children) return []

  return loomNode.children
    .filter(child => child.type === 'file')
    .map(strand => ({
      id: strand.path,
      name: strand.name,
      path: strand.path,
      description: strand.description,
      thumbnail: strand.visualStyle?.coverImage,
      wordCount: strand.wordCount,
      lastModified: undefined, // Would need to get from metadata
      accentColor: parentAccentColor || loomNode.visualStyle?.accentColor,
      tags: strand.tags,
    }))
}

/**
 * Determine current container context from path
 */
function getCurrentContainer(
  tree: KnowledgeTreeNode[],
  currentPath?: string
): CurrentContainer {
  if (!currentPath) {
    return { type: null, path: '', name: '', emoji: undefined, accentColor: undefined }
  }

  const result = findNodeByPath(tree, currentPath)
  if (!result) {
    return { type: null, path: '', name: '', emoji: undefined, accentColor: undefined }
  }

  const { node, type } = result

  if (type === 'weave') {
    return {
      type: 'weave',
      path: node.path,
      name: node.name,
      emoji: node.visualStyle?.emoji,
      accentColor: node.visualStyle?.accentColor,
    }
  }

  if (type === 'loom') {
    return {
      type: 'loom',
      path: node.path,
      name: node.name,
      emoji: node.visualStyle?.emoji,
      accentColor: node.visualStyle?.accentColor,
    }
  }

  // For strands or unknown, try to find parent loom or weave
  const pathParts = currentPath.split('/')
  for (let i = pathParts.length - 1; i >= 0; i--) {
    const parentPath = pathParts.slice(0, i + 1).join('/')
    const parentResult = findNodeByPath(tree, parentPath)
    if (parentResult) {
      if (parentResult.type === 'loom') {
        return {
          type: 'loom',
          path: parentResult.node.path,
          name: parentResult.node.name,
          emoji: parentResult.node.visualStyle?.emoji,
          accentColor: parentResult.node.visualStyle?.accentColor,
        }
      }
      if (parentResult.type === 'weave') {
        return {
          type: 'weave',
          path: parentResult.node.path,
          name: parentResult.node.name,
          emoji: parentResult.node.visualStyle?.emoji,
          accentColor: parentResult.node.visualStyle?.accentColor,
        }
      }
    }
  }

  return { type: null, path: '', name: '', emoji: undefined, accentColor: undefined }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TreeBucketPanel({
  tree,
  loading = false,
  currentPath,
  onNavigate,
  onOpenExternal,
  isDark = false,
  enableDragDrop = false,
  className = '',
}: TreeBucketPanelProps) {
  // View mode state
  const [viewMode, setViewMode] = useContentViewMode()

  // Determine current container context
  const currentContainer = useMemo(
    () => getCurrentContainer(tree, currentPath),
    [tree, currentPath]
  )

  // Check if we're inside a container where bucket view makes sense
  const insideContainer = currentContainer.type === 'weave' || currentContainer.type === 'loom'

  // Extract child items for bucket view
  const { looms, strands } = useMemo(() => {
    if (!insideContainer || !currentPath) {
      return { looms: [], strands: [] }
    }

    const result = findNodeByPath(tree, currentContainer.path)
    if (!result) {
      return { looms: [], strands: [] }
    }

    if (currentContainer.type === 'weave') {
      return {
        looms: extractLooms(result.node),
        strands: [],
      }
    }

    if (currentContainer.type === 'loom') {
      return {
        looms: [],
        strands: extractStrands(result.node, currentContainer.accentColor),
      }
    }

    return { looms: [], strands: [] }
  }, [tree, currentPath, currentContainer, insideContainer])

  // Handle loom click - navigate into it
  const handleLoomClick = useCallback((loom: LoomCardData) => {
    onNavigate?.(loom.path)
  }, [onNavigate])

  // Handle strand click - navigate to it
  const handleStrandClick = useCallback((strand: StrandCardData) => {
    const path = strand.path.replace(/\.md$/, '')
    onNavigate?.(path)
  }, [onNavigate])

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with toggle */}
      {insideContainer && (
        <div className={`
          flex items-center justify-between px-3 py-2 border-b
          ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}
        `}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">{currentContainer.emoji || (currentContainer.type === 'weave' ? '📚' : '📁')}</span>
            <span className={`text-xs font-medium truncate ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {currentContainer.name}
            </span>
          </div>
          <ContentViewToggle
            value={viewMode}
            onChange={setViewMode}
            insideContainer={insideContainer}
            containerType={currentContainer.type || 'weave'}
            isDark={isDark}
            compact
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'buckets' && insideContainer ? (
            <motion.div
              key="buckets"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <BucketView
                level={currentContainer.type || 'weave'}
                currentPath={currentContainer.path}
                currentName={currentContainer.name}
                currentEmoji={currentContainer.emoji}
                looms={looms}
                strands={strands}
                accentColor={currentContainer.accentColor}
                onLoomClick={handleLoomClick}
                onStrandClick={handleStrandClick}
                onNavigate={onNavigate}
                isDark={isDark}
              />
            </motion.div>
          ) : (
            <motion.div
              key="tree"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <CodexTreeView
                data={tree}
                selectedPath={currentPath}
                onNavigate={onNavigate}
                onOpenExternal={onOpenExternal}
                isDark={isDark}
                enableDragDrop={enableDragDrop}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Named export
export { TreeBucketPanel }
