/**
 * BrowseViewToggle - View mode switcher for browse page
 * @module codex/ui/BrowseViewToggle
 *
 * Toggle between list, canvas, collections, and split views for strands.
 */

'use client'

import React from 'react'
import { LayoutGrid, Layers, Columns, FolderOpen } from 'lucide-react'

export type BrowseViewMode = 'list' | 'canvas' | 'collections' | 'split'

interface BrowseViewToggleProps {
  value: BrowseViewMode
  onChange: (mode: BrowseViewMode) => void
  isDark?: boolean
  className?: string
}

const VIEW_MODES: Array<{ mode: BrowseViewMode; icon: typeof LayoutGrid; label: string; description?: string }> = [
  { mode: 'list', icon: LayoutGrid, label: 'List', description: 'Browse strands in a list' },
  { mode: 'canvas', icon: Layers, label: 'Canvas', description: 'Visual canvas with strand cards' },
  { mode: 'collections', icon: FolderOpen, label: 'Collections', description: 'Browse by collection groups' },
  { mode: 'split', icon: Columns, label: 'Split', description: 'List and preview side by side' },
]

export function BrowseViewToggle({
  value,
  onChange,
  isDark = false,
  className = '',
}: BrowseViewToggleProps) {
  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-lg ${className}`}
      style={{
        backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
      }}
    >
      {VIEW_MODES.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
            transition-all duration-200
            ${value === mode
              ? isDark
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-gray-900 shadow-sm'
              : isDark
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }
          `}
          title={`${label} view`}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}

export default BrowseViewToggle
