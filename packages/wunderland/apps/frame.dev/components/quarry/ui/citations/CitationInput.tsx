/**
 * Citation Input - Unified input for resolving citations
 * @module codex/ui/CitationInput
 *
 * Provides auto-detection of DOI/arXiv/URL/BibTeX input,
 * resolution via APIs, and formatted citation insertion.
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Loader2,
  AlertCircle,
  BookOpen,
  Hash,
  Link2,
  FileText,
  Sparkles,
  WifiOff,
  Clock,
} from 'lucide-react'
import type { Citation, CitationInputType } from '@/lib/citations/types'
import { resolveCitation, detectCitationType } from '@/lib/citations'
import CitationCard from './CitationCard'

interface CitationInputProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Callback when citation is resolved and user wants to insert */
  onInsert: (citation: Citation, format: 'inline' | 'card' | 'reference') => void
  /** Current theme */
  theme?: string
  /** Initial value (for smart paste) */
  initialValue?: string
}

const INPUT_TYPE_ICONS: Record<CitationInputType, React.ReactNode> = {
  doi: <Hash className="w-4 h-4 text-blue-500" />,
  arxiv: <Sparkles className="w-4 h-4 text-red-500" />,
  pmid: <BookOpen className="w-4 h-4 text-green-500" />,
  url: <Link2 className="w-4 h-4 text-purple-500" />,
  bibtex: <FileText className="w-4 h-4 text-amber-500" />,
  ris: <FileText className="w-4 h-4 text-amber-500" />,
  text: <Search className="w-4 h-4 text-gray-500" />,
}

const INPUT_TYPE_LABELS: Record<CitationInputType, string> = {
  doi: 'DOI detected',
  arxiv: 'arXiv ID detected',
  pmid: 'PubMed ID detected',
  url: 'URL detected',
  bibtex: 'BibTeX detected',
  ris: 'RIS format detected',
  text: 'Search query',
}

export default function CitationInput({
  isOpen,
  onClose,
  onInsert,
  theme = 'light',
  initialValue = '',
}: CitationInputProps) {
  const [input, setInput] = useState(initialValue)
  const [inputType, setInputType] = useState<CitationInputType>('text')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resolvedCitation, setResolvedCitation] = useState<Citation | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [latency, setLatency] = useState<number | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isDark = theme.includes('dark')

  /**
   * Detect and resolve citation
   */
  const handleDetectAndResolve = useCallback(async (value: string) => {
    if (!value.trim()) return

    setLoading(true)
    setError(null)
    setResolvedCitation(null)

    try {
      const result = await resolveCitation(value.trim())

      if (result.success && result.citation) {
        setResolvedCitation(result.citation)
        setFromCache(result.fromCache ?? false)
        setLatency(result.latency ?? null)
      } else {
        setError(result.error || 'Could not resolve citation')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      if (initialValue) {
        setInput(initialValue)
        handleDetectAndResolve(initialValue)
      }
    }
  }, [isOpen, initialValue, handleDetectAndResolve])

  // Detect input type as user types
  useEffect(() => {
    if (input.trim()) {
      const detected = detectCitationType(input)
      setInputType(detected)
    } else {
      setInputType('text')
    }
  }, [input])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    handleDetectAndResolve(input)
  }, [input, handleDetectAndResolve])

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleDetectAndResolve(input)
    }
  }, [input, handleDetectAndResolve, onClose])

  /**
   * Insert citation in specified format
   */
  const handleInsert = useCallback((format: 'inline' | 'card' | 'reference') => {
    if (resolvedCitation) {
      onInsert(resolvedCitation, format)
      onClose()
      // Reset state
      setInput('')
      setResolvedCitation(null)
      setError(null)
    }
  }, [resolvedCitation, onInsert, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`
              fixed z-50 top-1/4 left-1/2 -translate-x-1/2
              w-full max-w-xl
              rounded-2xl shadow-2xl overflow-hidden
              ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}
            `}
          >
            {/* Header */}
            <div className={`
              flex items-center justify-between px-4 py-3 border-b
              ${isDark ? 'border-gray-700' : 'border-gray-200'}
            `}>
              <div className="flex items-center gap-2">
                <BookOpen className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Add Citation
                </h2>
              </div>
              <button
                onClick={onClose}
                className={`
                  p-1.5 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}
                `}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-4">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Paste DOI, arXiv ID, URL, or BibTeX..."
                  rows={3}
                  className={`
                    w-full px-4 py-3 rounded-xl border resize-none
                    transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/30
                    ${isDark
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500'
                    }
                  `}
                />

                {/* Input type indicator */}
                {input.trim() && (
                  <div className={`
                    absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs
                    ${isDark ? 'bg-gray-700/80' : 'bg-white shadow-sm border border-gray-200'}
                  `}>
                    {INPUT_TYPE_ICONS[inputType]}
                    <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                      {INPUT_TYPE_LABELS[inputType]}
                    </span>
                  </div>
                )}
              </div>

              {/* Resolve button */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className={`
                  w-full mt-3 py-2.5 rounded-xl font-medium transition-all
                  flex items-center justify-center gap-2
                  ${loading
                    ? 'bg-purple-600/50 text-white cursor-wait'
                    : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-[0.98]'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resolving...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Resolve Citation
                  </>
                )}
              </button>

              {/* Quick tips */}
              <div className={`mt-3 flex flex-wrap gap-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" /> 10.1234/example
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> arxiv:2301.00001
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> https://doi.org/...
                </span>
              </div>
            </form>

            {/* Error */}
            {error && (
              <div className={`
                mx-4 mb-4 p-3 rounded-xl flex items-start gap-2
                ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}
              `}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Resolution failed</p>
                  <p className="opacity-80">{error}</p>
                </div>
              </div>
            )}

            {/* Resolved Citation */}
            {resolvedCitation && (
              <div className="px-4 pb-4">
                {/* Cache/latency indicator */}
                <div className={`flex items-center gap-3 mb-3 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {fromCache ? (
                    <span className="flex items-center gap-1">
                      <WifiOff className="w-3 h-3" />
                      From cache
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <Sparkles className="w-3 h-3" />
                      Freshly resolved
                    </span>
                  )}
                  {latency !== null && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {latency}ms
                    </span>
                  )}
                </div>

                {/* Citation card */}
                <CitationCard
                  citation={resolvedCitation}
                  theme={theme}
                  showCopyButtons={true}
                  compact={false}
                />

                {/* Insert options */}
                <div className={`
                  mt-4 pt-4 border-t flex flex-wrap gap-2
                  ${isDark ? 'border-gray-700' : 'border-gray-200'}
                `}>
                  <p className={`w-full text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Insert as:
                  </p>
                  <button
                    onClick={() => handleInsert('inline')}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isDark
                        ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    Inline [@citation]
                  </button>
                  <button
                    onClick={() => handleInsert('card')}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isDark
                        ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'
                        : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                      }
                    `}
                  >
                    Citation Card
                  </button>
                  <button
                    onClick={() => handleInsert('reference')}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isDark
                        ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }
                    `}
                  >
                    Add to Bibliography
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * Smart paste detection popup
 * Shows when user pastes a DOI/arXiv/URL
 */
export function CitationPastePopup({
  input,
  position,
  onResolve,
  onDismiss,
  theme = 'light',
}: {
  input: string
  position: { x: number; y: number }
  onResolve: () => void
  onDismiss: () => void
  theme?: string
}) {
  const isDark = theme.includes('dark')
  const inputType = detectCitationType(input)

  // Only show for identifiable citation types
  if (inputType === 'text') return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className={`
        fixed z-50 flex items-center gap-2 px-3 py-2 rounded-xl shadow-xl border
        ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
      `}
      style={{
        left: Math.max(10, Math.min(position.x - 100, window.innerWidth - 220)),
        top: position.y + 20,
      }}
    >
      {INPUT_TYPE_ICONS[inputType]}
      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
        {INPUT_TYPE_LABELS[inputType]}
      </span>
      <button
        onClick={onResolve}
        className={`
          px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
          ${isDark
            ? 'bg-purple-900/50 text-purple-400 hover:bg-purple-900/70'
            : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
          }
        `}
      >
        Resolve
      </button>
      <button
        onClick={onDismiss}
        className={`
          p-1 rounded-lg transition-colors
          ${isDark ? 'text-gray-500 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}
        `}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
}
