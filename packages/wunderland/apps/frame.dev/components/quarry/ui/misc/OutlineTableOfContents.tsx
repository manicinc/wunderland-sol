/**
 * OutlineTableOfContents - Interactive document structure navigation
 * @module codex/ui/OutlineTableOfContents
 * 
 * @remarks
 * Extracts and displays document headings as a navigable table of contents.
 * Features:
 * - Hierarchical heading structure (h1-h6)
 * - Active section highlighting
 * - Smooth scroll to section
 * - Collapsible nested sections
 * - Progress indicator
 * - Reading time estimate
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft,
  ChevronUp,
  FileText, 
  List, 
  Clock, 
  BookOpen,
  Hash,
  Layers,
  Eye,
  EyeOff,
  Folder,
  FolderOpen,
  ArrowLeft
} from 'lucide-react'

interface HeadingItem {
  id: string
  text: string
  level: number
  slug: string
  children: HeadingItem[]
}

interface OutlineTableOfContentsProps {
  /** Markdown content to parse */
  content: string
  /** Current file name */
  fileName?: string
  /** Current file path */
  filePath?: string
  /** File metadata (for title normalization) */
  metadata?: {
    title?: string
    summary?: string
  }
  /** Active heading slug (from scroll position) */
  activeSlug?: string
  /** Navigate to heading */
  onNavigate?: (slug: string) => void
  /** Navigate to parent folder */
  onNavigateToParent?: () => void
  /** Navigate back in history */
  onGoBack?: () => void
  /** Parent path for navigation */
  parentPath?: string
  /** Theme */
  theme?: string
  /** Compact mode */
  compact?: boolean
  /** Show reading time */
  showReadingTime?: boolean
  /** Show progress bar */
  showProgress?: boolean
}

/**
 * Calculate reading time from word count
 */
function calculateReadingTime(content: string): { minutes: number; words: number } {
  if (!content) return { minutes: 0, words: 0 }
  const text = content.replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[.*?\]\(.*?\)/g, (match) => match.split('](')[0].slice(1)) // Keep link text
    .replace(/[#*`_~]/g, '') // Remove markdown syntax
  
  const words = text.split(/\s+/).filter(word => word.length > 0).length
  const minutes = Math.max(1, Math.ceil(words / 200)) // 200 wpm average
  
  return { minutes, words }
}

/**
 * Generate slug from heading text
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Parse markdown content to extract headings
 */
function parseHeadings(content: string): HeadingItem[] {
  if (!content) return []
  const lines = content.split('\n')
  const headings: HeadingItem[] = []
  const slugCounts = new Map<string, number>()
  
  let inCodeBlock = false
  
  for (const line of lines) {
    // Track code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    
    if (inCodeBlock) continue
    
    // Match ATX headings (# Heading)
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/`(.*?)`/g, '$1') // Remove inline code
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
      
      let slug = generateSlug(text)
      
      // Handle duplicate slugs
      const count = slugCounts.get(slug) || 0
      if (count > 0) {
        slug = `${slug}-${count}`
      }
      slugCounts.set(generateSlug(text), count + 1)
      
      headings.push({
        id: `heading-${headings.length}`,
        text,
        level,
        slug,
        children: []
      })
    }
  }
  
  return headings
}

/**
 * Build hierarchical tree from flat headings list
 */
function buildHeadingTree(headings: HeadingItem[]): HeadingItem[] {
  const tree: HeadingItem[] = []
  const stack: { node: HeadingItem; level: number }[] = []
  
  for (const heading of headings) {
    const node = { ...heading, children: [] }
    
    // Pop items from stack that are same level or deeper
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop()
    }
    
    if (stack.length === 0) {
      tree.push(node)
    } else {
      stack[stack.length - 1].node.children.push(node)
    }
    
    stack.push({ node, level: heading.level })
  }
  
  return tree
}

/**
 * Check if any child heading matches the active slug
 */
function hasActiveChild(item: HeadingItem, activeSlug?: string): boolean {
  if (!activeSlug) return false
  if (item.slug === activeSlug) return true
  return item.children.some(child => hasActiveChild(child, activeSlug))
}

/**
 * Recursive heading item component
 */
function HeadingNode({
  item,
  activeSlug,
  onNavigate,
  depth = 0,
  expandedSlugs,
  onToggleExpand,
  theme,
  compact,
  onAutoExpand,
}: {
  item: HeadingItem
  activeSlug?: string
  onNavigate?: (slug: string) => void
  depth?: number
  expandedSlugs: Set<string>
  onToggleExpand: (slug: string) => void
  theme?: string
  compact?: boolean
  onAutoExpand?: (slug: string) => void
}) {
  const isDark = theme?.includes('dark')
  const hasChildren = item.children.length > 0
  const isExpanded = expandedSlugs.has(item.slug)
  const isActive = activeSlug === item.slug
  const containsActive = hasActiveChild(item, activeSlug) && !isActive
  
  // Level-based styling
  const levelStyles = {
    1: {
      font: 'font-bold',
      size: compact ? 'text-[11px]' : 'text-sm',
      color: isDark ? 'text-cyan-300' : 'text-cyan-700',
      activeColor: isDark ? 'bg-cyan-900/40 border-cyan-500' : 'bg-cyan-100 border-cyan-500',
      icon: '◈',
    },
    2: {
      font: 'font-semibold',
      size: compact ? 'text-[10px]' : 'text-[13px]',
      color: isDark ? 'text-emerald-300' : 'text-emerald-700',
      activeColor: isDark ? 'bg-emerald-900/40 border-emerald-500' : 'bg-emerald-100 border-emerald-500',
      icon: '◇',
    },
    3: {
      font: 'font-medium',
      size: compact ? 'text-[10px]' : 'text-xs',
      color: isDark ? 'text-amber-300' : 'text-amber-700',
      activeColor: isDark ? 'bg-amber-900/40 border-amber-500' : 'bg-amber-100 border-amber-500',
      icon: '○',
    },
    4: {
      font: 'font-medium',
      size: compact ? 'text-[9px]' : 'text-xs',
      color: isDark ? 'text-purple-300' : 'text-purple-600',
      activeColor: isDark ? 'bg-purple-900/40 border-purple-500' : 'bg-purple-100 border-purple-500',
      icon: '·',
    },
    5: {
      font: 'font-normal',
      size: compact ? 'text-[9px]' : 'text-[11px]',
      color: isDark ? 'text-zinc-400' : 'text-zinc-600',
      activeColor: isDark ? 'bg-zinc-800 border-zinc-500' : 'bg-zinc-200 border-zinc-500',
      icon: '·',
    },
    6: {
      font: 'font-normal',
      size: compact ? 'text-[8px]' : 'text-[10px]',
      color: isDark ? 'text-zinc-500' : 'text-zinc-500',
      activeColor: isDark ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-200 border-zinc-600',
      icon: '·',
    },
  }
  
  const style = levelStyles[item.level as keyof typeof levelStyles] || levelStyles[6]
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: depth * 0.02 }}
    >
      <div 
        className="relative group"
        style={{ paddingLeft: `${depth * (compact ? 8 : 12)}px` }}
      >
        {/* Connection line */}
        {depth > 0 && (
          <div 
            className={`absolute left-0 top-0 bottom-0 w-px ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`}
            style={{ left: `${(depth - 1) * (compact ? 8 : 12) + 4}px` }}
          />
        )}
        
        <button
          data-heading-slug={item.slug}
          onClick={() => {
            onNavigate?.(item.slug)
            if (hasChildren) onToggleExpand(item.slug)
          }}
          className={`
            w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-all duration-200
            ${isActive
              ? `${style.activeColor} border-l-3 shadow-sm ring-1 ring-inset ${isDark ? 'ring-white/10' : 'ring-black/5'} scale-[1.02]`
              : containsActive
                ? `border-l-2 ${isDark ? 'border-cyan-700 bg-cyan-900/10' : 'border-cyan-400 bg-cyan-50/50'}`
                : `hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border-l-2 border-transparent hover:scale-[1.01]`
            }
          `}
        >
          {/* Expand/collapse for items with children */}
          {hasChildren ? (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex-shrink-0"
            >
              <ChevronRight className={`w-3 h-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            </motion.div>
          ) : (
            <span className={`w-3 text-center ${style.color} opacity-60 flex-shrink-0`}>
              {style.icon}
            </span>
          )}
          
          {/* Heading text */}
          <span className={`${style.size} ${style.font} ${style.color} truncate flex-1`}>
            {item.text}
          </span>
          
          {/* Level indicator */}
          <span className={`
            text-[8px] font-mono opacity-0 group-hover:opacity-60 transition-opacity
            ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
          `}>
            H{item.level}
          </span>
        </button>
      </div>
      
      {/* Children */}
      <AnimatePresence>
        {hasChildren && (isExpanded || containsActive) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="overflow-hidden"
          >
            {item.children.map((child) => (
              <HeadingNode
                key={child.id}
                item={child}
                activeSlug={activeSlug}
                onNavigate={onNavigate}
                depth={depth + 1}
                expandedSlugs={expandedSlugs}
                onToggleExpand={onToggleExpand}
                theme={theme}
                compact={compact}
                onAutoExpand={onAutoExpand}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Interactive document outline / table of contents
 */
export default function OutlineTableOfContents({
  content,
  fileName,
  filePath,
  metadata,
  activeSlug,
  onNavigate,
  onNavigateToParent,
  onGoBack,
  parentPath,
  theme = 'light',
  compact = false,
  showReadingTime = true,
  showProgress = true,
}: OutlineTableOfContentsProps) {
  const isDark = theme?.includes('dark')
  
  // Use metadata title if available, otherwise normalize file name
  const displayTitle = useMemo(() => {
    if (metadata?.title) return metadata.title
    if (!fileName) return 'Document Outline'
    
    // Normalize: remove extension, convert hyphens/underscores to spaces, title case
    return fileName
      .replace(/\.(md|mdx)$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
  }, [metadata?.title, fileName])
  
  // Get parent folder name from path
  const parentFolderName = useMemo(() => {
    if (!filePath) return null
    const parts = filePath.split('/')
    if (parts.length < 2) return null
    return parts[parts.length - 2]
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
  }, [filePath])
  
  // Parse headings from content
  const headings = useMemo(() => parseHeadings(content), [content])
  const headingTree = useMemo(() => buildHeadingTree(headings), [headings])
  const { minutes, words } = useMemo(() => calculateReadingTime(content), [content])
  
  // Track expanded sections - default all expanded
  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(() => {
    const set = new Set<string>()
    headings.forEach(h => set.add(h.slug))
    return set
  })
  
  // Find path to active heading (for auto-expanding parents)
  const findPathToSlug = useCallback((tree: HeadingItem[], targetSlug: string): string[] => {
    for (const item of tree) {
      if (item.slug === targetSlug) {
        return [item.slug]
      }
      const childPath = findPathToSlug(item.children, targetSlug)
      if (childPath.length > 0) {
        return [item.slug, ...childPath]
      }
    }
    return []
  }, [])
  
  // Auto-expand parents when activeSlug changes
  useEffect(() => {
    if (!activeSlug) return
    
    const path = findPathToSlug(headingTree, activeSlug)
    if (path.length > 1) {
      // Expand all parents (all except the last which is the active item)
      setExpandedSlugs(prev => {
        const next = new Set(prev)
        path.slice(0, -1).forEach(slug => next.add(slug))
        return next
      })
    }
  }, [activeSlug, headingTree, findPathToSlug])
  
  // Toggle expand/collapse
  const toggleExpand = useCallback((slug: string) => {
    setExpandedSlugs(prev => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
      }
      return next
    })
  }, [])
  
  // Expand all / collapse all
  const [allExpanded, setAllExpanded] = useState(true)
  
  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setExpandedSlugs(new Set())
    } else {
      const set = new Set<string>()
      headings.forEach(h => set.add(h.slug))
      setExpandedSlugs(set)
    }
    setAllExpanded(!allExpanded)
  }, [allExpanded, headings])
  
  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Scroll active heading into view when it changes
  useEffect(() => {
    if (!activeSlug || !scrollContainerRef.current) return

    // Small delay to allow DOM to update after expand animations
    const timer = setTimeout(() => {
      const activeElement = scrollContainerRef.current?.querySelector(
        `[data-heading-slug="${activeSlug}"]`
      )
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [activeSlug])

  // Progress tracking
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const contentEl = document.querySelector('.codex-content-scroll')
      if (!contentEl) return
      
      const { scrollTop, scrollHeight, clientHeight } = contentEl
      const progress = scrollHeight > clientHeight 
        ? (scrollTop / (scrollHeight - clientHeight)) * 100 
        : 0
      setScrollProgress(progress)
    }
    
    const contentEl = document.querySelector('.codex-content-scroll')
    contentEl?.addEventListener('scroll', handleScroll)
    
    return () => contentEl?.removeEventListener('scroll', handleScroll)
  }, [])
  
  // No content state
  if (!content || headings.length === 0) {
    return (
      <div className={`
        flex flex-col items-center justify-center py-12 px-4 text-center
        ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
      `}>
        <FileText className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No document structure</p>
        <p className="text-xs mt-1 opacity-70">
          {content ? 'Add headings to your document' : 'Select a file to view outline'}
        </p>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Navigation Bar */}
      {(onGoBack || onNavigateToParent) && (
        <div className={`
          px-2 py-1.5 border-b flex items-center gap-1 flex-shrink-0
          ${isDark ? 'border-zinc-800 bg-zinc-900/70' : 'border-zinc-200 bg-zinc-100/70'}
        `}>
          {/* Back button */}
          {onGoBack && (
            <button
              onClick={onGoBack}
              className={`
                p-1.5 rounded-lg transition-all flex items-center gap-1
                ${isDark 
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400' 
                  : 'hover:bg-zinc-200 text-zinc-500 hover:text-cyan-600'}
              `}
              title="Go back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">Back</span>
            </button>
          )}
          
          {/* Up to parent folder */}
          {onNavigateToParent && parentFolderName && (
            <button
              onClick={onNavigateToParent}
              className={`
                p-1.5 rounded-lg transition-all flex items-center gap-1 flex-1 min-w-0
                ${isDark 
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400' 
                  : 'hover:bg-zinc-200 text-zinc-500 hover:text-emerald-600'}
              `}
              title={`Up to ${parentFolderName}`}
            >
              <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" />
              <FolderOpen className="w-3 h-3 flex-shrink-0" />
              <span className="text-[10px] font-medium truncate">{parentFolderName}</span>
            </button>
          )}
        </div>
      )}
      
      {/* Header */}
      <div className={`
        px-3 py-2 border-b flex-shrink-0
        ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50/50'}
      `}>
        {/* Document info */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <span className={`text-xs font-semibold truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`} title={displayTitle}>
              {displayTitle}
            </span>
          </div>
          
          {/* Toggle all */}
          <button
            onClick={toggleAll}
            className={`
              p-1 rounded transition-colors
              ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}
            `}
            title={allExpanded ? 'Collapse all' : 'Expand all'}
          >
            {allExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        
        {/* Stats row */}
        <div className="flex items-center gap-3 text-[10px]">
          {showReadingTime && (
            <>
              <div className={`flex items-center gap-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                <Clock className="w-3 h-3" />
                <span>{minutes} min read</span>
              </div>
              <div className={`flex items-center gap-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                <Hash className="w-3 h-3" />
                <span>{words.toLocaleString()} words</span>
              </div>
            </>
          )}
          <div className={`flex items-center gap-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            <Layers className="w-3 h-3" />
            <span>{headings.length} sections</span>
          </div>
        </div>
        
        {/* Progress bar */}
        {showProgress && (
          <div className={`
            mt-2 h-1 rounded-full overflow-hidden
            ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}
          `}>
            <motion.div
              className={`h-full ${isDark ? 'bg-cyan-500' : 'bg-cyan-600'}`}
              initial={{ width: 0 }}
              animate={{ width: `${scrollProgress}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
        )}
      </div>
      
      {/* Headings tree */}
      <div
        ref={scrollContainerRef}
        className={`
          flex-1 overflow-y-auto p-2 space-y-0.5
          ${isDark ? 'scrollbar-dark' : 'scrollbar-light'}
        `}
      >
        {headingTree.map((item) => (
          <HeadingNode
            key={item.id}
            item={item}
            activeSlug={activeSlug}
            onNavigate={onNavigate}
            expandedSlugs={expandedSlugs}
            onToggleExpand={toggleExpand}
            theme={theme}
            compact={compact}
            onAutoExpand={(slug) => setExpandedSlugs(prev => new Set([...prev, slug]))}
          />
        ))}
      </div>
      
      {/* Footer */}
      <div className={`
        px-3 py-2 border-t flex-shrink-0
        ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-zinc-50/30'}
      `}>
        <div className={`flex items-center justify-between text-[9px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          <span>Click heading to scroll</span>
          <span>{Math.round(scrollProgress)}% read</span>
        </div>
      </div>
    </div>
  )
}