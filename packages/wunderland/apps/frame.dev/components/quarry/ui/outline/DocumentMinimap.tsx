/**
 * Document Minimap Component
 * @module codex/ui/outline/DocumentMinimap
 *
 * VS Code-style minimap showing a scaled-down document preview with:
 * - Viewport position indicator
 * - Click-to-jump navigation
 * - Heading density visualization
 * - Smooth scroll sync
 */

'use client'

import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { Map, Eye, ChevronUp, ChevronDown } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface MinimapHeading {
  id: string
  slug: string
  text: string
  level: number
  /** Position as fraction of document (0-1) */
  position: number
}

export interface DocumentMinimapProps {
  /** Parsed headings from the document */
  headings: MinimapHeading[]
  /** Current scroll position as fraction (0-1) */
  scrollProgress: number
  /** Current viewport height as fraction of document (0-1) */
  viewportFraction: number
  /** Currently active heading slug */
  activeHeadingSlug?: string | null
  /** Callback when user clicks to navigate */
  onNavigate: (slug: string, position: number) => void
  /** Theme */
  theme?: string
  /** Document content for density visualization */
  content?: string
  /** Panel width */
  width?: number
  /** Max height of minimap */
  maxHeight?: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Calculate heading density map for visualization
 */
function calculateDensityMap(
  headings: MinimapHeading[],
  segments: number = 20
): number[] {
  const density = new Array(segments).fill(0)
  
  for (const heading of headings) {
    const segmentIndex = Math.floor(heading.position * (segments - 1))
    // Weight by heading level (h1 = 3, h2 = 2, h3+ = 1)
    const weight = Math.max(1, 4 - heading.level)
    density[segmentIndex] += weight
  }
  
  // Normalize to 0-1 range
  const max = Math.max(...density, 1)
  return density.map(d => d / max)
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function DocumentMinimap({
  headings,
  scrollProgress,
  viewportFraction,
  activeHeadingSlug,
  onNavigate,
  theme = 'light',
  content,
  width = 120,
  maxHeight = 300,
}: DocumentMinimapProps) {
  const isDark = theme?.includes('dark')
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [hoverPosition, setHoverPosition] = useState<number | null>(null)
  
  // Calculate density map for visual representation
  const densityMap = useMemo(() => calculateDensityMap(headings), [headings])
  
  // Calculate viewport indicator position and size
  const viewportTop = scrollProgress * (1 - viewportFraction)
  const viewportHeight = Math.max(viewportFraction, 0.05) // Minimum 5% visible
  
  // Handle click to navigate
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const clickPosition = clickY / rect.height
    
    // Find nearest heading
    let nearestHeading = headings[0]
    let nearestDistance = Infinity
    
    for (const heading of headings) {
      const distance = Math.abs(heading.position - clickPosition)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestHeading = heading
      }
    }
    
    if (nearestHeading) {
      onNavigate(nearestHeading.slug, nearestHeading.position)
    }
  }, [headings, onNavigate])
  
  // Handle mouse move for hover preview
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const mouseY = e.clientY - rect.top
    const position = mouseY / rect.height
    setHoverPosition(position)
  }, [])
  
  // Find heading at hover position
  const hoverHeading = useMemo(() => {
    if (hoverPosition === null) return null
    
    let nearestHeading = null
    let nearestDistance = 0.1 // Only show if within 10%
    
    for (const heading of headings) {
      const distance = Math.abs(heading.position - hoverPosition)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestHeading = heading
      }
    }
    
    return nearestHeading
  }, [headings, hoverPosition])
  
  if (headings.length === 0) {
    return (
      <div className={`
        flex flex-col items-center justify-center p-4 text-center
        ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
      `}>
        <Map className="w-6 h-6 mb-2 opacity-50" />
        <span className="text-xs">No headings to display</span>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2 px-2">
        <Map className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        <span className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
          Document Map
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}>
          {headings.length}
        </span>
      </div>
      
      {/* Minimap container */}
      <div
        ref={containerRef}
        className={`
          relative cursor-pointer rounded-lg overflow-hidden transition-all
          ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-50'}
          ${isHovering ? 'ring-2 ring-cyan-400/30' : ''}
        `}
        style={{ width, height: Math.min(maxHeight, headings.length * 20 + 40) }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => { setIsHovering(false); setHoverPosition(null) }}
        onMouseMove={handleMouseMove}
      >
        {/* Density bars (background visualization) */}
        <div className="absolute inset-0 flex flex-col">
          {densityMap.map((density, i) => (
            <div
              key={i}
              className="flex-1"
              style={{
                background: isDark
                  ? `rgba(6, 182, 212, ${density * 0.15})`
                  : `rgba(6, 182, 212, ${density * 0.1})`,
              }}
            />
          ))}
        </div>
        
        {/* Heading markers */}
        {headings.map((heading) => {
          const isActive = heading.slug === activeHeadingSlug
          const levelWidth = Math.max(12, 60 - (heading.level - 1) * 15)
          
          return (
            <div
              key={heading.id}
              className={`
                absolute left-2 h-[3px] rounded-full transition-all duration-200
                ${isActive
                  ? isDark
                    ? 'bg-cyan-400'
                    : 'bg-cyan-500'
                  : isDark
                    ? 'bg-zinc-600 hover:bg-zinc-500'
                    : 'bg-zinc-300 hover:bg-zinc-400'
                }
              `}
              style={{
                top: `${heading.position * 100}%`,
                width: levelWidth,
                opacity: isActive ? 1 : 0.7 + (4 - heading.level) * 0.1,
              }}
              title={heading.text}
            />
          )
        })}
        
        {/* Viewport indicator */}
        <div
          className={`
            absolute right-0 w-2 rounded-l transition-all duration-150
            ${isDark ? 'bg-amber-500/60' : 'bg-amber-400/70'}
          `}
          style={{
            top: `${viewportTop * 100}%`,
            height: `${viewportHeight * 100}%`,
            minHeight: 8,
          }}
        />
        
        {/* Full viewport overlay */}
        <div
          className={`
            absolute left-0 right-2 pointer-events-none transition-all duration-150
            ${isDark ? 'bg-zinc-100/5 border-zinc-600/30' : 'bg-zinc-900/5 border-zinc-400/30'}
            border-y
          `}
          style={{
            top: `${viewportTop * 100}%`,
            height: `${viewportHeight * 100}%`,
            minHeight: 8,
          }}
        />
        
        {/* Hover indicator line */}
        {isHovering && hoverPosition !== null && (
          <div
            className={`
              absolute left-0 right-0 h-[2px] pointer-events-none
              ${isDark ? 'bg-cyan-400/50' : 'bg-cyan-500/50'}
            `}
            style={{ top: `${hoverPosition * 100}%` }}
          />
        )}
        
        {/* Hover tooltip */}
        {isHovering && hoverHeading && (
          <div
            className={`
              absolute left-full ml-2 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap z-10
              ${isDark ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'bg-white text-zinc-700 border border-zinc-200 shadow-sm'}
            `}
            style={{ top: `${hoverHeading.position * 100}%`, transform: 'translateY(-50%)' }}
          >
            {hoverHeading.text.slice(0, 40)}{hoverHeading.text.length > 40 ? '...' : ''}
          </div>
        )}
      </div>
      
      {/* Quick navigation buttons */}
      <div className="flex items-center justify-between px-2">
        <button
          onClick={() => headings[0] && onNavigate(headings[0].slug, 0)}
          className={`
            p-1 rounded transition-colors
            ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
          `}
          title="Jump to top"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        
        <div className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {Math.round(scrollProgress * 100)}%
        </div>
        
        <button
          onClick={() => {
            const last = headings[headings.length - 1]
            if (last) onNavigate(last.slug, 1)
          }}
          className={`
            p-1 rounded transition-colors
            ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
          `}
          title="Jump to bottom"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {/* Active heading indicator */}
      {activeHeadingSlug && (
        <div className={`
          flex items-center gap-1.5 px-2 py-1 mx-2 rounded text-[10px]
          ${isDark ? 'bg-cyan-900/30 text-cyan-300' : 'bg-cyan-50 text-cyan-700'}
        `}>
          <Eye className="w-3 h-3" />
          <span className="truncate">
            {headings.find(h => h.slug === activeHeadingSlug)?.text || 'Current'}
          </span>
        </div>
      )}
    </div>
  )
}

