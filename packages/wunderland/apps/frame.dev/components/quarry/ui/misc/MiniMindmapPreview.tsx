/**
 * Mini Mindmap Preview Component
 * @module components/quarry/ui/MiniMindmapPreview
 *
 * Compact mindmap preview for sidebar display
 * Shows a mini visualization of the current strand's structure
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import { Network, ChevronDown, ChevronUp } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
═══════════════════════════════════════════════════════════════════════════ */

export interface MiniMindmapPreviewProps {
  content: string
  title?: string
  isDark?: boolean
  height?: number
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function MiniMindmapPreview({
  content,
  title = 'Structure Preview',
  isDark = false,
  height = 200,
  className = '',
}: MiniMindmapPreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasContent, setHasContent] = useState(false)

  useEffect(() => {
    if (!svgRef.current || !content) return

    try {
      // Extract headings from markdown
      const headings = content.match(/^#{1,6}\s+.+$/gm)
      if (!headings || headings.length === 0) {
        setHasContent(false)
        return
      }

      setHasContent(true)

      // Create simple markdown from headings
      const markdown = headings.slice(0, 15).join('\n\n') // Limit to first 15 headings

      // Transform markdown to markmap data
      const transformer = new Transformer()
      const { root } = transformer.transform(markdown)

      // Create markmap instance
      const mm = Markmap.create(svgRef.current, {
        duration: 0,
        zoom: false,
        pan: false,
        maxWidth: 150,
        paddingX: 8,
        nodeMinHeight: 12,
        color: () => (isDark ? '#06b6d4' : '#0891b2'),
      })

      // Render the markmap
      mm.setData(root)
      mm.fit()

      // Cleanup
      return () => {
        mm.destroy()
      }
    } catch (error) {
      console.error('Failed to render mini mindmap:', error)
      setHasContent(false)
    }
  }, [content, isDark])

  if (!hasContent) {
    return (
      <div
        className={`
          rounded-lg px-3 py-2 text-xs
          ${isDark
            ? 'bg-zinc-800/30 text-zinc-500 border border-zinc-700/50'
            : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
          }
          ${className}
        `}
      >
        <div className="flex items-center gap-2">
          <Network className="w-3 h-3 opacity-50" />
          <span>No structure found</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`
        rounded-lg overflow-hidden
        ${isDark
          ? 'bg-zinc-800/50 border border-zinc-700'
          : 'bg-white border border-zinc-200'
        }
        ${className}
      `}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors
          ${isDark
            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700'
          }
        `}
      >
        <div className="flex items-center gap-2">
          <Network className="w-3 h-3" />
          <span>{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-2">
          <svg
            ref={svgRef}
            width="100%"
            height={height}
            className={`rounded ${isDark ? 'bg-zinc-900/30' : 'bg-zinc-50'}`}
          />
          <p
            className={`
              text-[9px] text-center mt-1.5 opacity-60
              ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
            `}
          >
            Click &quot;Mindmap&quot; for full view
          </p>
        </div>
      )}
    </div>
  )
}
