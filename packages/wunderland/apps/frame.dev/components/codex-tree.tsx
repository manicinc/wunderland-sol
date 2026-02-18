import React from 'react'
import { motion } from 'framer-motion'

/**
 * Hierarchical node representing a directory or file in the Codex repository.
 */
interface Node {
  /** Display name (filename or directory name) */
  name: string
  /** Full path from repository root */
  path: string
  /** Node type: directory or markdown file */
  type: 'dir' | 'file'
  /** Child nodes (only present for directories) */
  children?: Node[]
}

/**
 * Props for the CodexTree component.
 */
interface CodexTreeProps {
  /** Hierarchical tree structure of the Codex */
  tree: Node[]
  /** Callback invoked when a node is selected */
  onSelect: (path: string) => void
  /** Currently selected path (highlighted in the tree) */
  selectedPath?: string
}

/**
 * Recursively renders a tree node with appropriate indentation and styling.
 * 
 * Directories are displayed in uppercase and bold; files show their cleaned title.
 * Child nodes are rendered recursively with increased indentation to show hierarchy.
 * 
 * @param node - The node to render
 * @param depth - Current depth in the tree (0 = root level)
 * @param onSelect - Callback to invoke when node is clicked
 * @param selected - Currently selected path for highlighting
 * @returns JSX element representing the node and its children
 */
function renderNode(node: Node, depth = 0, onSelect: (p: string) => void, selected?: string) {
  const isDir = node.type === 'dir'
  const indent = depth * 14 + 4
  
  return (
    <div 
      key={node.path}
      className={`pl-[${indent}px] py-1`}
    >
      <button
        onClick={() => onSelect(node.path)}
        className={`text-left text-sm w-full truncate rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${
          selected === node.path 
            ? 'font-semibold text-purple-700 dark:text-purple-300' 
            : ''
        }`}
      >
        {isDir
          ? node.name.toUpperCase()
          : node.name.replace(/\.(md|mdx)$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        }
      </button>
      {isDir && node.children?.map(child => renderNode(child, depth + 1, onSelect, selected))}
    </div>
  )
}

/**
 * Interactive tree view of the Quarry Codex knowledge hierarchy.
 * 
 * Displays weaves, looms, and strands in a nested, book-like table of contents.
 * Directories (weaves/looms) appear as bold section headings; files (strands) are
 * indented beneath them. Clicking any node invokes the onSelect callback.
 * 
 * @component
 * @example
 * ```tsx
 * <CodexTree 
 *   tree={treeData} 
 *   onSelect={(path) => console.log('Selected:', path)}
 *   selectedPath="weaves/openstrand/architecture.md"
 * />
 * ```
 */
export default function CodexTree({ tree, onSelect, selectedPath }: CodexTreeProps) {
  return (
    <motion.div 
      className="overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {tree.map(n => renderNode(n, 0, onSelect, selectedPath))}
    </motion.div>
  )
}
