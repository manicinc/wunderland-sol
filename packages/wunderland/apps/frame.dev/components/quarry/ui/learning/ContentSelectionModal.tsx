/**
 * Content Selection Modal Component
 * @module quarry/ui/learning/ContentSelectionModal
 *
 * Tabbed modal for selecting content sources for Learning Studio generation.
 * - "Current Strand" tab: Use the strand currently being viewed
 * - "Custom Selection" tab: Multi-select strands with filters
 */

'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FileText,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { HierarchicalStrandSelector } from './HierarchicalStrandSelector'
import { CacheControlPanel } from './CacheControlPanel'
import { useModalAccessibility } from '@/components/quarry/hooks'
import type { WeaveItem, StrandItem } from './HierarchicalStrandSelector'
import type { CacheStats } from './CacheControlPanel'
import type { GenerationType } from '@/lib/generation/contentSelectionCache'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type SelectionTab = 'current' | 'custom'

export interface CurrentStrandInfo {
  id: string
  path: string
  title: string
  content: string
  wordCount?: number
  tags?: string[]
}

export interface ContentSelection {
  mode: SelectionTab
  strandIds: string[]
  strandPaths: string[]
  cacheKey: string
}

export interface ContentSelectionModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Theme */
  isDark: boolean
  /** Generation type being configured */
  generationType: GenerationType
  /** Current strand context (if viewing a strand) */
  currentStrand?: CurrentStrandInfo
  /** Hierarchical strand data for custom selection */
  weaves: WeaveItem[]
  /** Cache stats for current selection */
  cacheStats?: CacheStats
  /** Current cache key */
  cacheKey?: string
  /** Clear cache handler */
  onClearCache?: () => void
  /** Confirm selection and start generation */
  onConfirm: (selection: ContentSelection) => void
  /** Whether generation is in progress */
  isLoading?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB INDICATOR
═══════════════════════════════════════════════════════════════════════════ */

function TabIndicator({ isDark }: { isDark: boolean }) {
  return (
    <motion.div
      layoutId="content-selection-tab-indicator"
      className={`
        absolute inset-0 rounded-xl
        ${isDark
          ? 'bg-gradient-to-r from-emerald-900/60 to-cyan-900/40 border border-emerald-700/50'
          : 'bg-gradient-to-r from-emerald-100 to-cyan-100 border border-emerald-300/50'
        }
      `}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   GENERATION TYPE LABELS
═══════════════════════════════════════════════════════════════════════════ */

const GENERATION_TYPE_LABELS: Record<GenerationType, string> = {
  flashcards: 'Flashcards',
  glossary: 'Glossary',
  quiz: 'Quiz',
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function ContentSelectionModal({
  isOpen,
  onClose,
  isDark,
  generationType,
  currentStrand,
  weaves,
  cacheStats,
  cacheKey,
  onClearCache,
  onConfirm,
  isLoading = false,
}: ContentSelectionModalProps) {
  // Accessibility hook
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    modalId: `content-selection-modal-${generationType}`,
    trapFocus: true,
    lockScroll: true,
  })

  // State
  const [activeTab, setActiveTab] = useState<SelectionTab>(
    currentStrand ? 'current' : 'custom'
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Memoized strand lookup
  const strandLookup = useMemo(() => {
    const lookup = new Map<string, { id: string; path: string; title: string }>()

    function processLoom(loom: { strands: StrandItem[]; looms?: any[] }) {
      for (const strand of loom.strands) {
        lookup.set(strand.id, { id: strand.id, path: strand.path, title: strand.title })
      }
      loom.looms?.forEach(processLoom)
    }

    for (const weave of weaves) {
      for (const strand of weave.strands) {
        lookup.set(strand.id, { id: strand.id, path: strand.path, title: strand.title })
      }
      weave.looms.forEach(processLoom)
    }

    return lookup
  }, [weaves])

  // Toggle selection
  const handleToggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Select all
  const handleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      for (const id of ids) {
        next.add(id)
      }
      return next
    })
  }, [])

  // Deselect all
  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Get selection info
  const getSelectionInfo = useCallback((): ContentSelection | null => {
    if (activeTab === 'current' && currentStrand) {
      return {
        mode: 'current',
        strandIds: [currentStrand.id],
        strandPaths: [currentStrand.path],
        cacheKey: cacheKey || '',
      }
    }

    if (activeTab === 'custom' && selectedIds.size > 0) {
      const strandIds = Array.from(selectedIds)
      const strandPaths = strandIds
        .map(id => strandLookup.get(id)?.path)
        .filter(Boolean) as string[]

      return {
        mode: 'custom',
        strandIds,
        strandPaths,
        cacheKey: cacheKey || '',
      }
    }

    return null
  }, [activeTab, currentStrand, selectedIds, strandLookup, cacheKey])

  // Handle confirm
  const handleConfirm = useCallback(() => {
    const selection = getSelectionInfo()
    if (selection) {
      onConfirm(selection)
    }
  }, [getSelectionInfo, onConfirm])

  // Check if can confirm
  const canConfirm = activeTab === 'current'
    ? !!currentStrand
    : selectedIds.size > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={backdropRef as React.RefObject<HTMLDivElement>}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
            className={`
              fixed inset-0 z-50
              ${isDark ? 'bg-black/70' : 'bg-black/50'}
            `}
          />

          {/* Modal */}
          <motion.div
            ref={contentRef as React.RefObject<HTMLDivElement>}
            {...modalProps}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`
              fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
              w-[calc(100%-2rem)] max-w-lg max-h-[85vh] overflow-hidden
              rounded-2xl shadow-2xl
              ${isDark
                ? 'bg-zinc-900 border border-zinc-700/50'
                : 'bg-white border border-zinc-200'
              }
            `}
          >
            {/* Header */}
            <div
              className={`
                flex items-center justify-between px-5 py-4
                border-b
                ${isDark ? 'border-zinc-700/50' : 'border-zinc-200'}
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                    p-2 rounded-xl
                    ${isDark
                      ? 'bg-gradient-to-br from-purple-900/50 to-cyan-900/50'
                      : 'bg-gradient-to-br from-purple-100 to-cyan-100'
                    }
                  `}
                >
                  <Sparkles
                    className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
                  />
                </div>
                <div>
                  <h2
                    id={`content-selection-modal-${generationType}-title`}
                    className={`text-lg font-semibold ${
                      isDark ? 'text-zinc-100' : 'text-zinc-900'
                    }`}
                  >
                    Generate {GENERATION_TYPE_LABELS[generationType]}
                  </h2>
                  <p
                    className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
                  >
                    Select content source for generation
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className={`
                  p-2 rounded-lg transition-colors
                  ${isDark
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                  }
                `}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-5 pt-4">
              <div
                className={`
                  inline-flex p-1 rounded-xl
                  ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}
                `}
              >
                {/* Current Strand Tab */}
                <button
                  onClick={() => currentStrand && setActiveTab('current')}
                  disabled={!currentStrand}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                    transition-colors
                    ${!currentStrand
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                    }
                    ${activeTab === 'current'
                      ? isDark ? 'text-white' : 'text-zinc-900'
                      : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                    }
                  `}
                >
                  {activeTab === 'current' && <TabIndicator isDark={isDark} />}
                  <FileText className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Current Strand</span>
                </button>

                {/* Custom Selection Tab */}
                <button
                  onClick={() => setActiveTab('custom')}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                    transition-colors
                    ${activeTab === 'custom'
                      ? isDark ? 'text-white' : 'text-zinc-900'
                      : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                    }
                  `}
                >
                  {activeTab === 'custom' && <TabIndicator isDark={isDark} />}
                  <Layers className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Custom Selection</span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-5">
              <AnimatePresence mode="wait">
                {activeTab === 'current' ? (
                  <motion.div
                    key="current"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    {currentStrand ? (
                      <>
                        {/* Strand preview */}
                        <div
                          className={`
                            p-4 rounded-xl
                            ${isDark
                              ? 'bg-zinc-800/50 border border-zinc-700'
                              : 'bg-zinc-50 border border-zinc-200'
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <FileText
                              className={`w-5 h-5 mt-0.5 ${
                                isDark ? 'text-zinc-500' : 'text-zinc-400'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <h3
                                className={`font-medium truncate ${
                                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                                }`}
                              >
                                {currentStrand.title}
                              </h3>
                              <p
                                className={`text-xs mt-1 truncate ${
                                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                                }`}
                              >
                                {currentStrand.path}
                              </p>
                              {currentStrand.wordCount && (
                                <p
                                  className={`text-xs mt-2 ${
                                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                                  }`}
                                >
                                  {currentStrand.wordCount.toLocaleString()} words
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Tags */}
                          {currentStrand.tags && currentStrand.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {currentStrand.tags.slice(0, 5).map(tag => (
                                <span
                                  key={tag}
                                  className={`
                                    px-2 py-0.5 rounded text-xs
                                    ${isDark
                                      ? 'bg-zinc-700/50 text-zinc-400'
                                      : 'bg-zinc-200/50 text-zinc-500'
                                    }
                                  `}
                                >
                                  #{tag}
                                </span>
                              ))}
                              {currentStrand.tags.length > 5 && (
                                <span
                                  className={`text-xs ${
                                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                                  }`}
                                >
                                  +{currentStrand.tags.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Cache controls */}
                        {cacheStats && onClearCache && (
                          <CacheControlPanel
                            isDark={isDark}
                            cacheKey={cacheKey || null}
                            cacheStats={cacheStats}
                            onClearCache={onClearCache}
                            onRegenerate={handleConfirm}
                            isLoading={isLoading}
                          />
                        )}
                      </>
                    ) : (
                      <div
                        className={`
                          p-8 text-center rounded-xl
                          ${isDark ? 'bg-zinc-800/30' : 'bg-zinc-100/50'}
                        `}
                      >
                        <FileText
                          className={`w-8 h-8 mx-auto mb-3 ${
                            isDark ? 'text-zinc-600' : 'text-zinc-400'
                          }`}
                        />
                        <p
                          className={`text-sm ${
                            isDark ? 'text-zinc-400' : 'text-zinc-500'
                          }`}
                        >
                          Open a strand to use this option
                        </p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="custom"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* Strand selector */}
                    <div
                      className={`
                        rounded-xl p-3
                        ${isDark
                          ? 'bg-zinc-800/30 border border-zinc-700/50'
                          : 'bg-zinc-50 border border-zinc-200'
                        }
                      `}
                    >
                      <HierarchicalStrandSelector
                        weaves={weaves}
                        selectedIds={selectedIds}
                        onToggle={handleToggle}
                        onSelectAll={handleSelectAll}
                        onDeselectAll={handleDeselectAll}
                        isDark={isDark}
                        maxHeight={250}
                      />
                    </div>

                    {/* Cache controls (compact mode) */}
                    {cacheStats && onClearCache && selectedIds.size > 0 && (
                      <CacheControlPanel
                        isDark={isDark}
                        cacheKey={cacheKey || null}
                        cacheStats={cacheStats}
                        onClearCache={onClearCache}
                        onRegenerate={handleConfirm}
                        isLoading={isLoading}
                        compact
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div
              className={`
                flex items-center justify-between px-5 py-4
                border-t
                ${isDark ? 'border-zinc-700/50' : 'border-zinc-200'}
              `}
            >
              <button
                onClick={onClose}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isDark
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }
                `}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirm}
                disabled={!canConfirm || isLoading}
                className={`
                  flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium
                  transition-all
                  ${canConfirm && !isLoading
                    ? isDark
                      ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white'
                      : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white'
                    : isDark
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                    Generating...
                  </>
                ) : (
                  <>
                    Generate
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ContentSelectionModal
