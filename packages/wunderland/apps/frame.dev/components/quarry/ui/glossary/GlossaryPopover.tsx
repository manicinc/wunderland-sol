/**
 * Glossary Popover - Quick vocabulary access from any strand
 * @module codex/ui/GlossaryPopover
 *
 * @remarks
 * Provides quick access to auto-generated glossary terms:
 * - NLP-powered term extraction
 * - Definition detection
 * - Acronym expansion
 * - Category grouping
 * - Strand selection (current or any)
 * - Cache management (regenerate, clear)
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Book, BookOpen, Sparkles, RefreshCcw, Loader2 } from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import GlossaryPanel from './GlossaryPanel'
import { useModalAccessibility } from '../../hooks/useModalAccessibility'
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice'
import { useStrandContent } from '../../hooks/useStrandContent'
import PopoverStrandSelector from '../common/PopoverStrandSelector'
import CacheActionsBar from '../common/CacheActionsBar'
import { getCachedForStrand, clearCacheForStrand } from '@/lib/glossary/glossaryCache'
import { extractTerms, extractDefinitions, extractAcronyms } from '@/lib/glossary/glossaryGeneration'
import type { GlossaryTerm, GlossaryCategory } from '@/lib/glossary/glossaryGeneration'

interface GlossaryPopoverProps {
  /** Whether popover is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Current strand slug */
  strandSlug?: string
  /** Current strand content for generation */
  content?: string
  /** Theme */
  theme?: string
  /** Pre-loaded strands from parent (avoids re-fetching) */
  availableStrands?: Array<{ slug: string; title: string; path?: string }>
  /** Callback to fetch strand content by path */
  onFetchStrandContent?: (path: string) => Promise<string | null>
}

export default function GlossaryPopover({
  isOpen,
  onClose,
  strandSlug,
  content,
  theme = 'light',
  availableStrands: propStrands,
  onFetchStrandContent,
}: GlossaryPopoverProps) {
  const [mounted, setMounted] = useState(false)
  const isDark = theme?.includes('dark')
  const { isMobile } = useBreakpoint()
  const isTouch = useIsTouchDevice()

  // Strand selection state
  const [strandMode, setStrandMode] = useState<'current' | 'select'>(strandSlug ? 'current' : 'select')
  const [selectedStrand, setSelectedStrand] = useState<{ slug: string; title: string; content?: string } | null>(null)
  
  // Use the active strand based on mode
  const activeStrandSlug = strandMode === 'current' ? strandSlug : selectedStrand?.slug
  const activeContent = strandMode === 'current' ? content : selectedStrand?.content

  // Glossary terms state
  const [terms, setTerms] = useState<GlossaryTerm[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [cacheLoaded, setCacheLoaded] = useState(false)

  // Strand content fetching for "Select" mode - use hook as fallback
  const { 
    strands: hookStrands, 
    loadingStrands: hookLoadingStrands,
    fetchStrandContent: hookFetchStrandContent,
    loadingContent: loadingStrandContent,
  } = useStrandContent({ autoLoadList: !propStrands || propStrands.length === 0 })

  // Use parent-provided strands if available
  const availableStrands = propStrands && propStrands.length > 0 ? propStrands : hookStrands
  const loadingStrands = propStrands && propStrands.length > 0 ? false : hookLoadingStrands

  // Handle strand selection
  const handleSelectStrand = useCallback(async (strand: { slug: string; title: string }) => {
    // Try parent callback first
    if (onFetchStrandContent) {
      const strandContent = await onFetchStrandContent(strand.slug)
      if (strandContent) {
        setSelectedStrand({
          slug: strand.slug,
          title: strand.title,
          content: strandContent,
        })
        setCacheLoaded(false)
        return
      }
    }
    // Fallback to hook
    const strandWithContent = await hookFetchStrandContent(strand.slug)
    if (strandWithContent) {
      setSelectedStrand({
        slug: strandWithContent.slug,
        title: strandWithContent.title,
        content: strandWithContent.content,
      })
      setCacheLoaded(false)
    }
  }, [onFetchStrandContent, hookFetchStrandContent])

  // Accessibility features
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnClickOutside: true,
    trapFocus: true,
    lockScroll: true,
    modalId: 'glossary-popover',
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Load cached terms or generate new ones when strand changes
  useEffect(() => {
    if (!isOpen || !activeStrandSlug || cacheLoaded) return

    const loadTerms = async () => {
      setLoading(true)
      try {
        // Check cache first
        const cached = await getCachedForStrand(activeStrandSlug)
        if (cached && cached.length > 0 && cached[0].terms.length > 0) {
          // Map cached terms to include required fields (id, category)
          // Cache uses 'type', but GlossaryTerm from glossaryGeneration uses 'category'
          const typeToCategory = (type: string): GlossaryCategory => {
            switch (type) {
              case 'definition': return 'concept'
              case 'acronym': return 'acronym'
              case 'entity': return 'entity'
              case 'keyword': return 'keyword'
              default: return 'concept'
            }
          }
          const termsWithIds: GlossaryTerm[] = cached[0].terms.map((t, i) => ({
            id: `cached-${i}-${t.term.toLowerCase().replace(/\s+/g, '-')}`,
            term: t.term,
            definition: t.definition,
            category: typeToCategory(t.type),
            type: t.type,
            confidence: t.confidence ?? 0.8,
            source: t.source,
          }))
          setTerms(termsWithIds)
          setCacheLoaded(true)
          setLoading(false)
          return
        }

        // Generate from content if no cache
        if (activeContent && activeContent.length > 50) {
          await generateTerms()
        }
      } catch (err) {
        console.error('[Glossary] Error loading terms:', err)
      } finally {
        setLoading(false)
      }
    }

    loadTerms()
  }, [isOpen, activeStrandSlug, activeContent, cacheLoaded])

  // Generate terms from content
  const generateTerms = useCallback(async () => {
    if (!activeContent || !activeStrandSlug) return

    setGenerating(true)
    try {
      const extractedTerms = extractTerms(activeContent)
      const definitions = extractDefinitions(activeContent)
      const acronyms = extractAcronyms(activeContent)

      // Combine all terms - map to GlossaryTerm interface
      const mappedDefinitions: GlossaryTerm[] = definitions.map((d, idx) => ({
        id: `def-${idx}-${d.term.toLowerCase().replace(/\s+/g, '-')}`,
        term: d.term,
        definition: d.definition,
        category: 'concept' as const,
        type: 'definition' as const,
        confidence: 0.8,
        source: 'nlp' as const,
      }))

      const mappedAcronyms: GlossaryTerm[] = acronyms.map((a, idx) => ({
        id: `acr-${idx}-${a.acronym.toLowerCase()}`,
        term: a.acronym,
        definition: a.expansion,
        category: 'acronym' as const,
        type: 'acronym' as const,
        confidence: a.confidence ?? 0.9,
        source: 'nlp' as const,
      }))

      const allTerms: GlossaryTerm[] = [
        ...extractedTerms,
        ...mappedDefinitions,
        ...mappedAcronyms,
      ]

      // Deduplicate by term
      const uniqueTerms = Array.from(
        new Map(allTerms.map(t => [t.term.toLowerCase(), t])).values()
      )

      setTerms(uniqueTerms)
      setCacheLoaded(true)
    } catch (err) {
      console.error('[Glossary] Error generating terms:', err)
    } finally {
      setGenerating(false)
    }
  }, [activeContent, activeStrandSlug])

  // Handle regenerate
  const handleRegenerate = useCallback(async () => {
    if (!activeStrandSlug) return
    setCacheLoaded(false)
    setTerms([])
    if (activeStrandSlug) {
      try {
        await clearCacheForStrand(activeStrandSlug)
      } catch {
        // Ignore cache clear errors
      }
    }
    await generateTerms()
  }, [activeStrandSlug, generateTerms])

  // Handle clear cache
  const handleClearCache = useCallback(async () => {
    if (!activeStrandSlug) return
    try {
      await clearCacheForStrand(activeStrandSlug)
      setTerms([])
      setCacheLoaded(false)
    } catch (err) {
      console.error('[Glossary] Error clearing cache:', err)
    }
  }, [activeStrandSlug])

  if (!mounted) return null

  const popoverContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={backdropRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          {/* Modal */}
          <motion.div
            ref={contentRef}
            {...modalProps}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`
              relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col
              ${isDark ? 'bg-zinc-900/95 border border-zinc-700/50' : 'bg-white/95 border border-zinc-200/50'}
            `}
          >
            {/* Header */}
            <div className={`
              px-6 py-4 border-b shrink-0
              ${isDark ? 'border-zinc-800 bg-gradient-to-r from-cyan-950/30 to-zinc-900' : 'border-zinc-200 bg-gradient-to-r from-cyan-50 to-white'}
            `}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    p-2.5 rounded-xl
                    ${isDark ? 'bg-cyan-900/50 ring-1 ring-cyan-700/50' : 'bg-cyan-100 ring-1 ring-cyan-200'}
                  `}>
                    <Book className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      Glossary
                    </h2>
                    <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      {terms.length > 0 
                        ? `${terms.length} terms` 
                        : activeStrandSlug 
                          ? 'Loading terms...' 
                          : 'Select a strand'
                      }
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className={`
                    p-2 rounded-lg transition-colors touch-manipulation
                    ${isTouch ? 'min-w-[44px] min-h-[44px]' : ''}
                    ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
                  `}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Strand Selector */}
              <div className="mt-3">
                <PopoverStrandSelector
                  mode={strandMode}
                  onModeChange={setStrandMode}
                  currentStrand={strandSlug ? { slug: strandSlug, title: strandSlug.split('/').pop()?.replace(/\.md$/, '') || strandSlug } : undefined}
                  selectedStrand={selectedStrand || undefined}
                  onSelectStrand={handleSelectStrand}
                  availableStrands={availableStrands}
                  loadingStrands={loadingStrands || loadingStrandContent}
                  isDark={isDark}
                  isTouch={isTouch}
                  compact
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading || generating ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  <p className={`mt-3 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {generating ? 'Extracting terms...' : 'Loading glossary...'}
                  </p>
                </div>
              ) : terms.length > 0 ? (
                <GlossaryPanel
                  content={activeContent || ''}
                  isDark={isDark}
                  preloadedTerms={terms}
                />
              ) : activeContent && activeContent.length > 50 ? (
                <div className={`text-center py-12 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                    <Sparkles className={`w-8 h-8 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
                  </div>
                  <p className={`text-base font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    No Terms Found
                  </p>
                  <p className="text-sm max-w-xs mx-auto mb-4">
                    Try regenerating or check that the content contains extractable terms
                  </p>
                  <button
                    onClick={handleRegenerate}
                    className={`
                      inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                      ${isDark 
                        ? 'bg-cyan-900/50 text-cyan-400 hover:bg-cyan-900/70' 
                        : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                      }
                    `}
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Generate Terms
                  </button>
                </div>
              ) : (
                <div className={`text-center py-12 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                    <BookOpen className={`w-8 h-8 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
                  </div>
                  <p className={`text-base font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    No Content Available
                  </p>
                  <p className="text-sm max-w-xs mx-auto">
                    Select a strand to generate glossary terms from its content
                  </p>
                </div>
              )}
            </div>

            {/* Footer with Cache Actions */}
            <div className={`
              shrink-0
              ${isDark ? 'bg-zinc-950/50' : 'bg-zinc-50/50'}
            `}>
              <CacheActionsBar
                onRegenerate={handleRegenerate}
                onClearCache={handleClearCache}
                regenerating={generating}
                hasData={terms.length > 0}
                itemCount={terms.length}
                itemLabel="terms"
                isDark={isDark}
                isTouch={isTouch}
                disabled={!activeStrandSlug}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(popoverContent, document.body)
}
