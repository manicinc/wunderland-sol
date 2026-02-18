/**
 * Interactive knowledge graph visualization
 * @module codex/ui/KnowledgeGraphView
 *
 * @remarks
 * - Beautiful stable spiral layout (no chaotic movement!)
 * - Golden ratio positioning
 * - Nodes: Weaves, Looms, Strands
 * - Interactive: Click to navigate, hover for info
 * - Color-coded by hierarchy level
 * - Smooth zoom and pan
 */

'use client'

import React, { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { KnowledgeTreeNode } from '../../types'
import StableKnowledgeGraph from './StableKnowledgeGraph'

interface GraphNode {
  id: string
  name: string
  path: string
  level: 'fabric' | 'weave' | 'loom' | 'collection' | 'strand' | 'folder' | 'collection'
  size: number
  connections: string[]
}

interface KnowledgeGraphViewProps {
  /** Knowledge tree nodes */
  tree: KnowledgeTreeNode[]
  /** Current selected file */
  selectedPath?: string | null
  /** Navigate to a node */
  onNavigate: (path: string) => void
  /** Close graph view */
  onClose: () => void
}

/**
 * Interactive stable knowledge graph
 *
 * @example
 * ```tsx
 * <KnowledgeGraphView
 *   tree={knowledgeTree}
 *   selectedPath={currentPath}
 *   onNavigate={(path) => openFile(path)}
 *   onClose={() => setGraphOpen(false)}
 * />
 * ```
 */
export default function KnowledgeGraphView({
  tree,
  selectedPath,
  onNavigate,
  onClose,
}: KnowledgeGraphViewProps) {
  const { theme } = useTheme()

  /**
   * Build flat graph nodes from tree
   */
  const graphNodes = useMemo(() => {
    const nodes: GraphNode[] = []

    const traverse = (node: KnowledgeTreeNode, parentPath?: string) => {
      const nodePath = node.path || node.name
      
      // Determine connections (parent-child relationships)
      const connections: string[] = []
      if (parentPath) {
        connections.push(parentPath)
      }
      
      nodes.push({
        id: nodePath,
        name: node.name,
        path: nodePath,
        level: node.level,
        size: node.strandCount || 1,
        connections,
      })

      // Traverse children
      if (node.children) {
        node.children.forEach(child => traverse(child, nodePath))
      }
    }

    tree.forEach(node => traverse(node))
    return nodes
  }, [tree])

  const handleNodeClick = useCallback((path: string) => {
    onNavigate(path)
    onClose()
  }, [onNavigate, onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Graph Container */}
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full h-full max-w-7xl max-h-[90vh] bg-white dark:bg-gray-950 border-2 border-gray-300 dark:border-gray-700 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-b-2 border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Knowledge Graph</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {graphNodes.length} nodes in spiral layout
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close graph view"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Graph */}
        <div className="absolute inset-0 pt-20">
          <StableKnowledgeGraph
            nodes={graphNodes}
            currentFile={selectedPath ? { path: selectedPath } : null}
            onNodeClick={handleNodeClick}
            showLabels={true}
            theme={theme || 'light'}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
