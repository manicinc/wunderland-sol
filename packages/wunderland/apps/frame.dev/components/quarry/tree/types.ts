/**
 * Type definitions for Quarry Codex drag-and-drop tree
 * @module codex/tree/types
 */

import type { NodeLevel, NodeStyle, NodeVisualStyle, KnowledgeTreeNode } from '../types'

// Re-export NodeVisualStyle for convenience
export type { NodeVisualStyle }

export interface CodexTreeNode {
  /** Unique identifier (uses path as ID for simplicity) */
  id: string
  /** Display name */
  name: string
  /** Full path from repo root */
  path: string
  /** Node type */
  type: 'file' | 'dir'
  /** Child nodes */
  children?: CodexTreeNode[]
  /** Total strands in subtree */
  strandCount: number
  /** Loom count (for weaves) */
  loomCount?: number
  /** Codex hierarchy level */
  level: NodeLevel
  /** Custom styling from loom.yaml */
  style?: NodeStyle
  /** Visual styling for gallery view (cover photos, icons, etc.) */
  visualStyle?: NodeVisualStyle
  /** Description from loom.yaml or weave.yaml */
  description?: string
  /** Whether this node can be dragged */
  isDraggable?: boolean
  /** Whether items can be dropped here */
  isDroppable?: boolean
  /** Content type for strands */
  contentType?: string
  /** Tags */
  tags?: string[]
  /** Version */
  version?: string
  /** Last modified date (ISO string) */
  lastModified?: string
  /** Whether marked as favorite */
  isFavorite?: boolean
}

/**
 * Tree action types for undo/redo support
 */
export type TreeActionType = 'move' | 'rename' | 'delete' | 'create'

/**
 * Move operation for publish flow
 * Tracks source and destination paths for GitHub PR creation
 */
export interface MoveOperation {
  /** Operation type */
  type: 'move'
  /** Original file/folder path */
  sourcePath: string
  /** New destination path */
  destPath: string
  /** Node name */
  name: string
  /** Node type (file or dir) */
  nodeType: 'file' | 'dir'
  /** Timestamp of operation */
  timestamp: number
}

/**
 * Delete operation for publish flow
 * Tracks deleted paths for GitHub PR creation
 */
export interface DeleteOperation {
  /** Operation type */
  type: 'delete'
  /** Path being deleted */
  path: string
  /** Node name */
  name: string
  /** Node type (file or dir) */
  nodeType: 'file' | 'dir'
  /** Timestamp of operation */
  timestamp: number
}

/**
 * Union type for all tree operations
 */
export type TreeOperation = MoveOperation | DeleteOperation

/**
 * Record of a tree action for history
 */
export interface TreeAction {
  type: TreeActionType
  timestamp: number
  data: {
    nodeId: string
    oldParentId?: string | null
    newParentId?: string | null
    oldIndex?: number
    newIndex?: number
    oldName?: string
    newName?: string
    deletedNode?: CodexTreeNode
  }
}

/**
 * Transform KnowledgeTreeNode to CodexTreeNode for react-arborist
 */
export function transformToArboristData(nodes: KnowledgeTreeNode[]): CodexTreeNode[] {
  return nodes.map(node => ({
    id: node.path,
    name: node.name,
    path: node.path,
    type: node.type,
    children: node.children ? transformToArboristData(node.children) : undefined,
    strandCount: node.strandCount,
    level: node.level,
    style: node.style,
    description: node.description,
    // Configuration for drag-and-drop
    isDraggable: node.level !== 'fabric', // Can't drag the fabric itself
    isDroppable: node.type === 'dir', // Only directories can receive drops
  }))
}

/**
 * Flatten tree to array for searching
 */
export function flattenTree(nodes: CodexTreeNode[]): CodexTreeNode[] {
  const result: CodexTreeNode[] = []
  
  function traverse(node: CodexTreeNode) {
    result.push(node)
    if (node.children) {
      node.children.forEach(traverse)
    }
  }
  
  nodes.forEach(traverse)
  return result
}

/**
 * Find a node by ID in the tree
 */
export function findNodeById(nodes: CodexTreeNode[], id: string): CodexTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Get the parent node of a given node
 */
export function findParentNode(nodes: CodexTreeNode[], childId: string): CodexTreeNode | null {
  for (const node of nodes) {
    if (node.children?.some(child => child.id === childId)) {
      return node
    }
    if (node.children) {
      const found = findParentNode(node.children, childId)
      if (found) return found
    }
  }
  return null
}

/**
 * Deep clone tree data
 */
export function cloneTree(nodes: CodexTreeNode[]): CodexTreeNode[] {
  return JSON.parse(JSON.stringify(nodes))
}


