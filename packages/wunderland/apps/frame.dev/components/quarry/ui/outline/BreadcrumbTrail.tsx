/**
 * Breadcrumb Trail Component
 * @module codex/ui/outline/BreadcrumbTrail
 *
 * Shows the current heading hierarchy as a breadcrumb trail.
 * e.g., "Chapter 2 > Section 2.1 > Subsection"
 */

'use client'

import React, { useMemo } from 'react'
import { ChevronRight, Home, FileText } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface BreadcrumbHeading {
  slug: string
  text: string
  level: number
}

export interface BreadcrumbTrailProps {
  /** All headings in document */
  headings: BreadcrumbHeading[]
  /** Currently active heading slug */
  activeSlug?: string
  /** Theme */
  theme?: string
  /** Callback when breadcrumb is clicked */
  onNavigate?: (slug: string) => void
  /** Document title (shown at start of trail) */
  documentTitle?: string
  /** Maximum breadcrumbs to show (truncates middle if exceeded) */
  maxItems?: number
  /** Whether to show home icon at start */
  showHome?: boolean
  /** Compact mode */
  compact?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function BreadcrumbTrail({
  headings,
  activeSlug,
  theme = 'light',
  onNavigate,
  documentTitle,
  maxItems = 4,
  showHome = true,
  compact = false,
}: BreadcrumbTrailProps) {
  const isDark = theme?.includes('dark')
  
  // Build breadcrumb path from root to active heading
  const breadcrumbs = useMemo(() => {
    if (!activeSlug) return []
    
    const activeIndex = headings.findIndex(h => h.slug === activeSlug)
    if (activeIndex === -1) return []
    
    const activeHeading = headings[activeIndex]
    const path: BreadcrumbHeading[] = []
    let currentLevel = activeHeading.level
    
    // Walk backwards to collect parents
    for (let i = activeIndex; i >= 0; i--) {
      const heading = headings[i]
      if (heading.level <= currentLevel) {
        path.unshift(heading)
        currentLevel = heading.level - 1
      }
      if (heading.level === 1) break
    }
    
    return path
  }, [headings, activeSlug])
  
  // Truncate if too many items
  const displayBreadcrumbs = useMemo(() => {
    if (breadcrumbs.length <= maxItems) return breadcrumbs
    
    // Keep first and last items, truncate middle
    const first = breadcrumbs.slice(0, 1)
    const last = breadcrumbs.slice(-maxItems + 2)
    
    return [...first, { slug: '__ellipsis__', text: '...', level: 0 }, ...last]
  }, [breadcrumbs, maxItems])
  
  if (breadcrumbs.length === 0 && !documentTitle) {
    return null
  }

  return (
    <nav
      className={`
        flex items-center gap-1 overflow-x-auto scrollbar-hide
        ${compact ? 'text-xs' : 'text-sm'}
        ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
      `}
      aria-label="Breadcrumb"
    >
      {/* Home/Document */}
      {showHome && (
        <>
          <button
            onClick={() => onNavigate?.(headings[0]?.slug || '')}
            className={`
              flex items-center gap-1 flex-shrink-0 transition-colors rounded px-1.5 py-0.5
              ${isDark
                ? 'hover:bg-zinc-800 hover:text-zinc-200'
                : 'hover:bg-zinc-100 hover:text-zinc-700'
              }
            `}
            title="Go to top"
          >
            {documentTitle ? (
              <>
                <FileText className="w-3.5 h-3.5" />
                <span className="max-w-[100px] truncate">{documentTitle}</span>
              </>
            ) : (
              <Home className="w-3.5 h-3.5" />
            )}
          </button>
          
          {displayBreadcrumbs.length > 0 && (
            <ChevronRight className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
          )}
        </>
      )}
      
      {/* Breadcrumb items */}
      {displayBreadcrumbs.map((crumb, index) => {
        const isLast = index === displayBreadcrumbs.length - 1
        const isEllipsis = crumb.slug === '__ellipsis__'
        
        return (
          <React.Fragment key={crumb.slug}>
            {isEllipsis ? (
              <span className={`px-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                •••
              </span>
            ) : (
              <button
                onClick={() => onNavigate?.(crumb.slug)}
                className={`
                  flex-shrink-0 transition-colors rounded px-1.5 py-0.5 max-w-[120px] truncate
                  ${isLast
                    ? isDark
                      ? 'text-amber-400 font-medium'
                      : 'text-amber-700 font-medium'
                    : isDark
                      ? 'hover:bg-zinc-800 hover:text-zinc-200'
                      : 'hover:bg-zinc-100 hover:text-zinc-700'
                  }
                `}
                aria-current={isLast ? 'page' : undefined}
              >
                {crumb.text}
              </button>
            )}
            
            {!isLast && !isEllipsis && (
              <ChevronRight className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

