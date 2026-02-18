/**
 * Recent Sections Component
 * @module codex/ui/outline/RecentSections
 *
 * Quick-jump dropdown showing recently visited sections.
 * Features:
 * - Tracks navigation history
 * - Persists across sessions
 * - Keyboard accessible
 * - Shows document context
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Hash,
  X,
  Trash2,
  CornerDownLeft,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface RecentSection {
  /** Section slug */
  slug: string
  /** Section text/title */
  text: string
  /** Heading level */
  level: number
  /** Document path */
  documentPath: string
  /** Document title */
  documentTitle?: string
  /** Timestamp of visit */
  timestamp: number
}

export interface RecentSectionsProps {
  /** Current document path */
  documentPath: string
  /** Current document title */
  documentTitle?: string
  /** Theme */
  theme?: string
  /** Callback when section is selected */
  onNavigate?: (slug: string, documentPath?: string) => void
  /** Max recent items to store */
  maxItems?: number
  /** Whether to show cross-document history */
  crossDocument?: boolean
  /** Callback to register section visit (call this when user navigates) */
  onSectionVisit?: (section: Omit<RecentSection, 'timestamp'>) => void
}

export interface RecentSectionsResult {
  /** Recent sections */
  sections: RecentSection[]
  /** Add a section to history */
  addSection: (section: Omit<RecentSection, 'timestamp'>) => void
  /** Clear all history */
  clearHistory: () => void
  /** Remove specific section */
  removeSection: (slug: string, documentPath: string) => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'frame-recent-sections'
const MAX_STORED = 50

function loadRecentSections(): RecentSection[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {}
  
  return []
}

function saveRecentSections(sections: RecentSection[]): void {
  if (typeof window === 'undefined') return
  
  try {
    // Only keep most recent MAX_STORED
    const toStore = sections.slice(0, MAX_STORED)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
  } catch {}
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

export function useRecentSections(maxItems = 10): RecentSectionsResult {
  const [sections, setSections] = useState<RecentSection[]>([])
  
  // Load on mount
  useEffect(() => {
    setSections(loadRecentSections())
  }, [])
  
  // Add section
  const addSection = useCallback((section: Omit<RecentSection, 'timestamp'>) => {
    setSections(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(
        s => !(s.slug === section.slug && s.documentPath === section.documentPath)
      )
      
      const newSection: RecentSection = {
        ...section,
        timestamp: Date.now(),
      }
      
      const updated = [newSection, ...filtered].slice(0, maxItems)
      saveRecentSections(updated)
      return updated
    })
  }, [maxItems])
  
  // Clear history
  const clearHistory = useCallback(() => {
    setSections([])
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])
  
  // Remove specific section
  const removeSection = useCallback((slug: string, documentPath: string) => {
    setSections(prev => {
      const updated = prev.filter(
        s => !(s.slug === slug && s.documentPath === documentPath)
      )
      saveRecentSections(updated)
      return updated
    })
  }, [])
  
  return {
    sections,
    addSection,
    clearHistory,
    removeSection,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function RecentSections({
  documentPath,
  documentTitle,
  theme = 'light',
  onNavigate,
  maxItems = 5,
  crossDocument = false,
}: RecentSectionsProps) {
  const isDark = theme?.includes('dark')
  const [isOpen, setIsOpen] = useState(false)
  const { sections, removeSection, clearHistory } = useRecentSections(maxItems * 2)
  
  // Filter sections based on crossDocument setting
  const displayedSections = useMemo(() => {
    const filtered = crossDocument
      ? sections
      : sections.filter(s => s.documentPath === documentPath)
    return filtered.slice(0, maxItems)
  }, [sections, documentPath, crossDocument, maxItems])
  
  // Format relative time
  const formatTime = useCallback((timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }, [])
  
  const handleSelect = useCallback((section: RecentSection) => {
    onNavigate?.(section.slug, section.documentPath !== documentPath ? section.documentPath : undefined)
    setIsOpen(false)
  }, [onNavigate, documentPath])
  
  if (displayedSections.length === 0) {
    return null
  }

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors
          ${isOpen
            ? isDark
              ? 'bg-zinc-800 text-zinc-200'
              : 'bg-zinc-100 text-zinc-700'
            : isDark
              ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
          }
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Clock className="w-3.5 h-3.5" />
        <span>Recent</span>
        <span className={`
          px-1.5 py-0.5 rounded-full text-[10px]
          ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
        `}>
          {displayedSections.length}
        </span>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className={`
          absolute top-full left-0 mt-1 w-64 z-50
          rounded-lg border shadow-xl overflow-hidden
          animate-in fade-in slide-in-from-top-2 duration-150
          ${isDark
            ? 'bg-zinc-900 border-zinc-700'
            : 'bg-white border-zinc-200'
          }
        `}>
          {/* Header */}
          <div className={`
            flex items-center justify-between px-3 py-2 border-b
            ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
          `}>
            <span className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Recent Sections
            </span>
            <button
              onClick={clearHistory}
              className={`
                p-1 rounded transition-colors
                ${isDark ? 'text-zinc-500 hover:text-red-400 hover:bg-zinc-800' : 'text-zinc-400 hover:text-red-500 hover:bg-zinc-100'}
              `}
              title="Clear history"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          
          {/* List */}
          <ul className="max-h-48 overflow-y-auto" role="listbox">
            {displayedSections.map((section, index) => (
              <li key={`${section.documentPath}-${section.slug}-${index}`}>
                <button
                  onClick={() => handleSelect(section)}
                  className={`
                    w-full flex items-start gap-2 px-3 py-2 text-left transition-colors group
                    ${isDark
                      ? 'hover:bg-zinc-800'
                      : 'hover:bg-zinc-50'
                    }
                  `}
                  role="option"
                >
                  <Hash className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      {section.text}
                    </div>
                    <div className={`flex items-center gap-2 text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {crossDocument && section.documentPath !== documentPath && (
                        <span className="truncate max-w-[100px]">
                          {section.documentTitle || section.documentPath}
                        </span>
                      )}
                      <span>{formatTime(section.timestamp)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSection(section.slug, section.documentPath)
                    }}
                    className={`
                      p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
                      ${isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200'}
                    `}
                    title="Remove from history"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </button>
              </li>
            ))}
          </ul>
          
          {/* Footer hint */}
          <div className={`
            px-3 py-1.5 border-t text-[10px] flex items-center gap-2
            ${isDark ? 'border-zinc-700 text-zinc-500' : 'border-zinc-200 text-zinc-400'}
          `}>
            <CornerDownLeft className="w-3 h-3" />
            <span>Click to jump</span>
          </div>
        </div>
      )}
    </div>
  )
}

