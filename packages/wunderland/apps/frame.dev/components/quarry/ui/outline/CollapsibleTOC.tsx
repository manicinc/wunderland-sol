/**
 * Collapsible Table of Contents Component
 * @module codex/ui/outline/CollapsibleTOC
 *
 * Enhanced TOC with collapsible/expandable sections.
 * Features:
 * - Collapse/expand children under each heading
 * - Persist collapse state
 * - Visual indicators for collapsed sections
 * - Keyboard navigation support
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Hash,
  FileText,
  Minus,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface TOCHeading {
  id: string
  slug: string
  text: string
  level: number
}

export interface CollapsibleTOCProps {
  /** List of headings */
  headings: TOCHeading[]
  /** Currently active heading slug */
  activeSlug?: string
  /** Theme */
  theme?: string
  /** Callback when heading is clicked */
  onNavigate?: (slug: string) => void
  /** Document ID for persisting collapse state */
  documentId?: string
  /** Whether to start all collapsed */
  defaultCollapsed?: boolean
  /** Max heading level to show */
  maxLevel?: number
  /** Whether to show icons */
  showIcons?: boolean
  /** Compact mode */
  compact?: boolean
}

interface TOCNode extends TOCHeading {
  children: TOCNode[]
  isCollapsed: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function buildTree(headings: TOCHeading[]): TOCNode[] {
  const root: TOCNode[] = []
  const stack: TOCNode[] = []
  
  headings.forEach(heading => {
    const node: TOCNode = {
      ...heading,
      children: [],
      isCollapsed: false,
    }
    
    // Find parent (first heading with lower level)
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop()
    }
    
    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }
    
    stack.push(node)
  })
  
  return root
}

function getStorageKey(documentId: string): string {
  return `frame-toc-collapsed:${documentId.replace(/[^a-zA-Z0-9-_]/g, '_')}`
}

function loadCollapsedState(documentId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  
  try {
    const stored = localStorage.getItem(getStorageKey(documentId))
    if (stored) {
      return new Set(JSON.parse(stored))
    }
  } catch {}
  
  return new Set()
}

function saveCollapsedState(documentId: string, collapsed: Set<string>): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(getStorageKey(documentId), JSON.stringify([...collapsed]))
  } catch {}
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOC ITEM COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface TOCItemProps {
  node: TOCNode
  activeSlug?: string
  depth: number
  isDark: boolean
  compact: boolean
  showIcons: boolean
  maxLevel: number
  collapsedSlugs: Set<string>
  onToggleCollapse: (slug: string) => void
  onNavigate?: (slug: string) => void
}

function TOCItem({
  node,
  activeSlug,
  depth,
  isDark,
  compact,
  showIcons,
  maxLevel,
  collapsedSlugs,
  onToggleCollapse,
  onNavigate,
}: TOCItemProps) {
  const isActive = node.slug === activeSlug
  const hasChildren = node.children.length > 0
  const isCollapsed = collapsedSlugs.has(node.slug)
  
  // Don't render if beyond max level
  if (node.level > maxLevel) return null
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onNavigate?.(node.slug)
  }
  
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleCollapse(node.slug)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onNavigate?.(node.slug)
    }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && hasChildren) {
      e.preventDefault()
      onToggleCollapse(node.slug)
    }
  }
  
  return (
    <li className="list-none">
      <div
        className={`
          flex items-center gap-1 rounded-md cursor-pointer transition-all
          ${compact ? 'py-0.5 px-1' : 'py-1 px-2'}
          ${isActive
            ? isDark
              ? 'bg-amber-900/30 text-amber-300 font-medium'
              : 'bg-amber-100 text-amber-800 font-medium'
            : isDark
              ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }
        `}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="treeitem"
        tabIndex={0}
        aria-expanded={hasChildren ? !isCollapsed : undefined}
        aria-selected={isActive}
      >
        {/* Collapse toggle */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className={`
              flex-shrink-0 p-0.5 rounded transition-colors
              ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}
            `}
            aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0">
            {showIcons && <Minus className={`w-3 h-3 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />}
          </span>
        )}
        
        {/* Icon */}
        {showIcons && (
          <Hash className={`
            w-3 h-3 flex-shrink-0
            ${isActive
              ? isDark ? 'text-amber-400' : 'text-amber-600'
              : isDark ? 'text-zinc-500' : 'text-zinc-400'
            }
          `} />
        )}
        
        {/* Text */}
        <span className={`
          truncate flex-1
          ${compact ? 'text-xs' : 'text-sm'}
          ${node.level === 1 ? 'font-semibold' : node.level === 2 ? 'font-medium' : ''}
        `}>
          {node.text}
        </span>
        
        {/* Child count indicator when collapsed */}
        {hasChildren && isCollapsed && (
          <span className={`
            text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0
            ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'}
          `}>
            {node.children.length}
          </span>
        )}
      </div>
      
      {/* Children */}
      {hasChildren && !isCollapsed && (
        <ul className="list-none m-0 p-0" role="group">
          {node.children.map(child => (
            <TOCItem
              key={child.slug}
              node={child}
              activeSlug={activeSlug}
              depth={depth + 1}
              isDark={isDark}
              compact={compact}
              showIcons={showIcons}
              maxLevel={maxLevel}
              collapsedSlugs={collapsedSlugs}
              onToggleCollapse={onToggleCollapse}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function CollapsibleTOC({
  headings,
  activeSlug,
  theme = 'light',
  onNavigate,
  documentId = 'default',
  defaultCollapsed = false,
  maxLevel = 6,
  showIcons = true,
  compact = false,
}: CollapsibleTOCProps) {
  const isDark = theme?.includes('dark')
  
  // Build tree structure
  const tree = useMemo(() => buildTree(headings), [headings])
  
  // Collapse state
  const [collapsedSlugs, setCollapsedSlugs] = useState<Set<string>>(() => {
    if (defaultCollapsed) {
      // Start with all parent headings collapsed
      return new Set(headings.filter(h => 
        headings.some(other => other.level > h.level)
      ).map(h => h.slug))
    }
    return loadCollapsedState(documentId)
  })
  
  // Toggle collapse
  const handleToggleCollapse = useCallback((slug: string) => {
    setCollapsedSlugs(prev => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
      }
      saveCollapsedState(documentId, next)
      return next
    })
  }, [documentId])
  
  // Expand to show active heading
  useEffect(() => {
    if (!activeSlug) return
    
    // Find all parents of active heading and expand them
    const activeHeading = headings.find(h => h.slug === activeSlug)
    if (!activeHeading) return
    
    const parentsToExpand: string[] = []
    let currentLevel = activeHeading.level
    
    // Walk backwards to find parents
    const activeIndex = headings.findIndex(h => h.slug === activeSlug)
    for (let i = activeIndex - 1; i >= 0; i--) {
      const heading = headings[i]
      if (heading.level < currentLevel) {
        parentsToExpand.push(heading.slug)
        currentLevel = heading.level
      }
      if (heading.level === 1) break
    }
    
    if (parentsToExpand.length > 0) {
      setCollapsedSlugs(prev => {
        const next = new Set(prev)
        parentsToExpand.forEach(slug => next.delete(slug))
        return next
      })
    }
  }, [activeSlug, headings])
  
  // Expand/collapse all
  const handleExpandAll = useCallback(() => {
    setCollapsedSlugs(new Set())
    saveCollapsedState(documentId, new Set())
  }, [documentId])
  
  const handleCollapseAll = useCallback(() => {
    const allParents = new Set(
      headings.filter(h => headings.some(other => other.level > h.level)).map(h => h.slug)
    )
    setCollapsedSlugs(allParents)
    saveCollapsedState(documentId, allParents)
  }, [headings, documentId])
  
  if (headings.length === 0) {
    return (
      <div className={`
        flex items-center justify-center py-8 text-center
        ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
      `}>
        <div>
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No headings found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className={`
        flex items-center justify-between px-2 py-1.5 border-b
        ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
      `}>
        <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {headings.length} section{headings.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExpandAll}
            className={`
              px-2 py-0.5 text-[10px] rounded transition-colors
              ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
            `}
            title="Expand all sections"
          >
            Expand
          </button>
          <button
            onClick={handleCollapseAll}
            className={`
              px-2 py-0.5 text-[10px] rounded transition-colors
              ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
            `}
            title="Collapse all sections"
          >
            Collapse
          </button>
        </div>
      </div>
      
      {/* Tree */}
      <nav className="flex-1 overflow-y-auto py-2" aria-label="Table of contents">
        <ul className="list-none m-0 p-0" role="tree">
          {tree.map(node => (
            <TOCItem
              key={node.slug}
              node={node}
              activeSlug={activeSlug}
              depth={0}
              isDark={isDark}
              compact={compact}
              showIcons={showIcons}
              maxLevel={maxLevel}
              collapsedSlugs={collapsedSlugs}
              onToggleCollapse={handleToggleCollapse}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>
    </div>
  )
}

