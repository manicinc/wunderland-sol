/**
 * Popover Strand Selector - Tab-based strand selection for learning popovers
 * @module quarry/ui/common/PopoverStrandSelector
 * 
 * @remarks
 * Allows users to switch between:
 * - Current strand (whatever is open in the viewer)
 * - Select strand (choose any strand from the knowledge base)
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  FolderTree,
  ChevronDown,
  Search,
  X,
  Check,
  Info,
} from 'lucide-react'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'

export interface StrandInfo {
  slug: string
  title: string
  content?: string
  path?: string
}

export interface PopoverStrandSelectorProps {
  /** Current mode - 'current' uses the strand open in viewer, 'select' lets user pick */
  mode: 'current' | 'select'
  /** Called when mode changes */
  onModeChange: (mode: 'current' | 'select') => void
  /** The strand currently open in the viewer */
  currentStrand?: StrandInfo
  /** The strand selected by the user (in select mode) */
  selectedStrand?: StrandInfo
  /** Called when user selects a different strand */
  onSelectStrand: (strand: StrandInfo) => void
  /** Available strands to select from */
  availableStrands?: StrandInfo[]
  /** Loading state for strand list */
  loadingStrands?: boolean
  /** Theme */
  isDark: boolean
  /** Touch device */
  isTouch?: boolean
  /** Compact mode for smaller popovers */
  compact?: boolean
}

/**
 * Tooltip component for explaining options
 */
function Tooltip({
  content,
  children,
  isDark,
}: {
  content: string
  children: React.ReactNode
  isDark: boolean
}) {
  const [show, setShow] = useState(false)

  return (
    <div 
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className={`
              absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50
              px-3 py-2 rounded-lg text-xs max-w-[200px] text-center
              whitespace-normal shadow-lg
              ${isDark 
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' 
                : 'bg-zinc-900 text-white'
              }
            `}
          >
            {content}
            <div 
              className={`
                absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rotate-45
                ${isDark ? 'bg-zinc-800 border-l border-t border-zinc-700' : 'bg-zinc-900'}
              `}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Strand dropdown selector
 */
function StrandDropdown({
  strands,
  selectedSlug,
  onSelect,
  loading,
  isDark,
  isTouch,
  onClose,
}: {
  strands: StrandInfo[]
  selectedSlug?: string
  onSelect: (strand: StrandInfo) => void
  loading?: boolean
  isDark: boolean
  isTouch?: boolean
  onClose: () => void
}) {
  const resolvePath = useQuarryPath()
  const [search, setSearch] = useState('')

  const filteredStrands = useMemo(() => {
    if (!search.trim()) return strands
    const query = search.toLowerCase()
    return strands.filter(s => 
      s.title.toLowerCase().includes(query) ||
      s.slug.toLowerCase().includes(query)
    )
  }, [strands, search])

  // Group by first folder
  const groupedStrands = useMemo(() => {
    const groups: Record<string, StrandInfo[]> = {}
    for (const strand of filteredStrands) {
      const parts = strand.slug.split('/')
      const group = parts.length > 1 ? parts[0] : 'Other'
      if (!groups[group]) groups[group] = []
      groups[group].push(strand)
    }
    return groups
  }, [filteredStrands])

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`
        absolute left-0 right-0 top-full mt-2 z-50
        rounded-xl shadow-2xl overflow-hidden
        max-h-[300px] flex flex-col
        ${isDark 
          ? 'bg-zinc-900 border border-zinc-700' 
          : 'bg-white border border-zinc-200'
        }
      `}
    >
      {/* Search */}
      <div className={`
        p-2 border-b shrink-0
        ${isDark ? 'border-zinc-800' : 'border-zinc-100'}
      `}>
        <div className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
        `}>
          <Search className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search strands..."
            className={`
              flex-1 bg-transparent text-sm outline-none
              ${isDark ? 'text-zinc-200 placeholder:text-zinc-500' : 'text-zinc-800 placeholder:text-zinc-400'}
            `}
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className={`p-0.5 rounded ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className={`py-8 text-center text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Loading strands...
          </div>
        ) : strands.length === 0 ? (
          <div className={`py-6 px-4 text-center ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            <FileText className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
            <p className="text-sm font-medium mb-1">No strands yet</p>
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Create your first strand to start studying
            </p>
            <a
              href={resolvePath('/quarry/new')}
              className={`
                inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs font-medium
                transition-colors
                ${isDark 
                  ? 'bg-violet-600 hover:bg-violet-500 text-white' 
                  : 'bg-violet-500 hover:bg-violet-600 text-white'
                }
              `}
            >
              Create Strand
            </a>
          </div>
        ) : filteredStrands.length === 0 ? (
          <div className={`py-8 text-center text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            No strands match &quot;{search}&quot;
          </div>
        ) : (
          Object.entries(groupedStrands).map(([group, groupStrands]) => (
            <div key={group} className="mb-2">
              <div className={`
                px-2 py-1 text-[10px] font-semibold uppercase tracking-wide
                ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
              `}>
                {group}
              </div>
              {groupStrands.map(strand => (
                <button
                  key={strand.slug}
                  onClick={() => {
                    onSelect(strand)
                    onClose()
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
                    transition-colors touch-manipulation
                    ${isTouch ? 'min-h-[44px]' : ''}
                    ${strand.slug === selectedSlug
                      ? isDark
                        ? 'bg-violet-900/30 text-violet-300'
                        : 'bg-violet-100 text-violet-700'
                      : isDark
                        ? 'hover:bg-zinc-800 text-zinc-300'
                        : 'hover:bg-zinc-100 text-zinc-700'
                    }
                  `}
                >
                  <FileText className="w-4 h-4 shrink-0 opacity-50" />
                  <span className="text-sm truncate flex-1">{strand.title}</span>
                  {strand.slug === selectedSlug && (
                    <Check className="w-4 h-4 shrink-0 text-violet-500" />
                  )}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}

export default function PopoverStrandSelector({
  mode,
  onModeChange,
  currentStrand,
  selectedStrand,
  onSelectStrand,
  availableStrands = [],
  loadingStrands = false,
  isDark,
  isTouch = false,
  compact = false,
}: PopoverStrandSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Close dropdown when mode changes to 'current'
  useEffect(() => {
    if (mode === 'current') {
      setDropdownOpen(false)
    }
  }, [mode])

  const activeStrand = mode === 'current' ? currentStrand : selectedStrand

  return (
    <div className="relative">
      {/* Tab buttons */}
      <div className={`
        flex items-center gap-1 p-1 rounded-xl
        ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}
      `}>
        {/* Current Strand Tab */}
        <Tooltip
          content="Uses the strand currently open in the viewer"
          isDark={isDark}
        >
          <button
            onClick={() => onModeChange('current')}
            disabled={!currentStrand}
            className={`
              flex items-center gap-1.5 px-3 rounded-lg font-medium transition-all
              touch-manipulation
              ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'}
              ${isTouch ? 'min-h-[40px]' : ''}
              ${mode === 'current'
                ? isDark
                  ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                  : 'bg-white text-zinc-900 shadow-sm'
                : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-700'
              }
              ${!currentStrand ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className={compact ? 'hidden sm:inline' : ''}>Current</span>
          </button>
        </Tooltip>

        {/* Select Strand Tab */}
        <Tooltip
          content="Choose any strand from your knowledge base"
          isDark={isDark}
        >
          <button
            onClick={() => {
              onModeChange('select')
              if (mode !== 'select') {
                setDropdownOpen(true)
              } else {
                setDropdownOpen(!dropdownOpen)
              }
            }}
            className={`
              flex items-center gap-1.5 px-3 rounded-lg font-medium transition-all
              touch-manipulation
              ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'}
              ${isTouch ? 'min-h-[40px]' : ''}
              ${mode === 'select'
                ? isDark
                  ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                  : 'bg-white text-zinc-900 shadow-sm'
                : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-700'
              }
            `}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span className={compact ? 'hidden sm:inline' : ''}>Select</span>
            <ChevronDown className={`
              w-3 h-3 transition-transform
              ${dropdownOpen && mode === 'select' ? 'rotate-180' : ''}
            `} />
          </button>
        </Tooltip>

        {/* Info tooltip */}
        <Tooltip
          content={mode === 'current' 
            ? 'Studying from the strand open in the viewer' 
            : 'Studying from a manually selected strand'
          }
          isDark={isDark}
        >
          <div className={`
            p-1.5 rounded-lg cursor-help
            ${isDark ? 'text-zinc-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-500'}
          `}>
            <Info className="w-3.5 h-3.5" />
          </div>
        </Tooltip>
      </div>

      {/* Current strand display */}
      {activeStrand && (
        <div className={`
          mt-2 px-3 py-2 rounded-lg text-sm truncate
          ${isDark ? 'bg-zinc-800/30 text-zinc-300' : 'bg-zinc-50 text-zinc-600'}
        `}>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {mode === 'current' ? 'Viewing: ' : 'Selected: '}
          </span>
          <span className="font-medium">{activeStrand.title}</span>
        </div>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {dropdownOpen && mode === 'select' && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setDropdownOpen(false)}
            />
            <StrandDropdown
              strands={availableStrands}
              selectedSlug={selectedStrand?.slug}
              onSelect={onSelectStrand}
              loading={loadingStrands}
              isDark={isDark}
              isTouch={isTouch}
              onClose={() => setDropdownOpen(false)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

