/**
 * Mindmap Controls Component
 * @module components/quarry/ui/MindmapControls
 *
 * Toggle controls for mindmap generation
 * - Mindmap type selection (hierarchy/graph/concept)
 * - View mode toggle (single/multi)
 * - Generation mode toggle (content/tags)
 * - Export controls (SVG/PNG)
 */

'use client'

import { useState } from 'react'
import { GitBranch, Network, Sparkles, Download, FileJson } from 'lucide-react'
import type { MindmapType, ViewMode, GenerationMode } from '@/hooks/useMindmapGeneration'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
═══════════════════════════════════════════════════════════════════════════ */

export interface MindmapControlsProps {
  mindmapType: MindmapType
  viewMode: ViewMode
  generationMode: GenerationMode
  onMindmapTypeChange: (type: MindmapType) => void
  onViewModeChange: (mode: ViewMode) => void
  onGenerationModeChange: (mode: GenerationMode) => void
  onExportSVG?: () => void
  onExportPNG?: () => void
  onExportJSON?: () => void
  loading?: boolean
  isDark?: boolean
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function MindmapControls({
  mindmapType,
  viewMode,
  generationMode,
  onMindmapTypeChange,
  onViewModeChange,
  onGenerationModeChange,
  onExportSVG,
  onExportPNG,
  onExportJSON,
  loading = false,
  isDark = false,
  className = '',
}: MindmapControlsProps) {
  /* ────────────────────────────────────────────────────────────────────────
     STATE
  ──────────────────────────────────────────────────────────────────────── */

  const [showExportMenu, setShowExportMenu] = useState(false)

  /* ────────────────────────────────────────────────────────────────────────
     THEME COLORS
  ──────────────────────────────────────────────────────────────────────── */

  const bgColor = isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
  const activeBg = isDark ? 'bg-zinc-700' : 'bg-white'
  const activeText = isDark ? 'text-zinc-100' : 'text-zinc-900'
  const inactiveText = isDark ? 'text-zinc-400' : 'text-zinc-600'
  const hoverBg = isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-50'

  /* ────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────── */

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* First Row: Mindmap Type + Export */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mindmap Type Toggle (3-way) */}
        <div className={`flex gap-1 p-1 rounded-lg ${bgColor}`}>
          <button
            onClick={() => !loading && onMindmapTypeChange('hierarchy')}
            disabled={loading}
            className={`
              px-3 py-2.5 min-h-[44px] rounded-md transition-all flex items-center gap-1.5 text-sm font-medium touch-manipulation
              ${mindmapType === 'hierarchy'
                ? `${activeBg} ${activeText} shadow-sm`
                : `${inactiveText} ${hoverBg}`
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <GitBranch className="w-4 h-4" />
            <span>Hierarchy</span>
          </button>

          <button
            onClick={() => !loading && onMindmapTypeChange('graph')}
            disabled={loading}
            className={`
              px-3 py-2.5 min-h-[44px] rounded-md transition-all flex items-center gap-1.5 text-sm font-medium touch-manipulation
              ${mindmapType === 'graph'
                ? `${activeBg} ${activeText} shadow-sm`
                : `${inactiveText} ${hoverBg}`
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <Network className="w-4 h-4" />
            <span>Graph</span>
          </button>

          <button
            onClick={() => !loading && onMindmapTypeChange('concept')}
            disabled={loading}
            className={`
              px-3 py-2.5 min-h-[44px] rounded-md transition-all flex items-center gap-1.5 text-sm font-medium touch-manipulation
              ${mindmapType === 'concept'
                ? `${activeBg} ${activeText} shadow-sm`
                : `${inactiveText} ${hoverBg}`
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <Sparkles className="w-4 h-4" />
            <span>Concept</span>
          </button>
        </div>

        {/* Export Dropdown */}
        {(onExportSVG || onExportPNG || onExportJSON) && (
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={loading}
              className={`
                px-3 py-2.5 min-h-[44px] rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium touch-manipulation
                ${isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'}
                ${isDark ? 'text-zinc-200' : 'text-zinc-700'}
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>

            {/* Dropdown menu */}
            {showExportMenu && (
              <div className="absolute top-full mt-1 right-0 z-10">
                <div className={`
                  rounded-lg shadow-lg overflow-hidden min-w-[160px]
                  ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}
                `}>
                  {onExportSVG && (
                    <button
                      onClick={() => {
                        onExportSVG()
                        setShowExportMenu(false)
                      }}
                      disabled={loading}
                      className={`
                        w-full px-3 py-2.5 min-h-[44px] text-left text-sm transition-colors flex items-center gap-2 touch-manipulation
                        ${isDark ? 'text-zinc-200 hover:bg-zinc-700' : 'text-zinc-700 hover:bg-zinc-50'}
                        ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <Download className="w-4 h-4" />
                      Export as SVG
                    </button>
                  )}
                  {onExportPNG && (
                    <button
                      onClick={() => {
                        onExportPNG()
                        setShowExportMenu(false)
                      }}
                      disabled={loading}
                      className={`
                        w-full px-3 py-2.5 min-h-[44px] text-left text-sm transition-colors flex items-center gap-2 touch-manipulation
                        ${isDark ? 'text-zinc-200 hover:bg-zinc-700' : 'text-zinc-700 hover:bg-zinc-50'}
                        ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <Download className="w-4 h-4" />
                      Export as PNG
                    </button>
                  )}
                  {onExportJSON && (
                    <button
                      onClick={() => {
                        onExportJSON()
                        setShowExportMenu(false)
                      }}
                      disabled={loading}
                      className={`
                        w-full px-3 py-2.5 min-h-[44px] text-left text-sm transition-colors flex items-center gap-2 touch-manipulation
                        ${isDark ? 'text-zinc-200 hover:bg-zinc-700' : 'text-zinc-700 hover:bg-zinc-50'}
                        ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <FileJson className="w-4 h-4" />
                      Export as JSON
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Second Row: View Mode + Generation Mode */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* View Mode Toggle */}
        <div className={`flex gap-1 p-1 rounded-lg ${bgColor}`}>
          <button
            onClick={() => !loading && onViewModeChange('single')}
            disabled={loading}
            className={`
              px-3 py-2.5 min-h-[44px] rounded-md transition-all text-sm font-medium touch-manipulation
              ${viewMode === 'single'
                ? `${activeBg} ${activeText} shadow-sm`
                : `${inactiveText} ${hoverBg}`
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            Single
          </button>

          <button
            onClick={() => !loading && onViewModeChange('multi')}
            disabled={loading}
            className={`
              px-3 py-2.5 min-h-[44px] rounded-md transition-all text-sm font-medium touch-manipulation
              ${viewMode === 'multi'
                ? `${activeBg} ${activeText} shadow-sm`
                : `${inactiveText} ${hoverBg}`
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            Multi
          </button>
        </div>

        {/* Generation Mode Toggle */}
        <div className={`flex gap-1 p-1 rounded-lg ${bgColor}`}>
          <button
            onClick={() => !loading && onGenerationModeChange('content')}
            disabled={loading}
            className={`
              px-3 py-2.5 min-h-[44px] rounded-md transition-all text-sm font-medium touch-manipulation
              ${generationMode === 'content'
                ? `${activeBg} ${activeText} shadow-sm`
                : `${inactiveText} ${hoverBg}`
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            Content
          </button>

          <button
            onClick={() => !loading && onGenerationModeChange('tags')}
            disabled={loading}
            className={`
              px-3 py-2.5 min-h-[44px] rounded-md transition-all text-sm font-medium touch-manipulation
              ${generationMode === 'tags'
                ? `${activeBg} ${activeText} shadow-sm`
                : `${inactiveText} ${hoverBg}`
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            Tags
          </button>
        </div>
      </div>
    </div>
  )
}
