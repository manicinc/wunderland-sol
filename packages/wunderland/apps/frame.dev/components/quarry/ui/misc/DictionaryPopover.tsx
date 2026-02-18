/**
 * Dictionary Popover
 * @module codex/ui/DictionaryPopover
 *
 * Premium dictionary/thesaurus popover with tabbed interface.
 * Shows definitions, synonyms, and related terms.
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Book,
  X,
  Copy,
  Check,
  Volume2,
  Highlighter,
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Search,
} from 'lucide-react'
import { useDictionary, type DictionaryData, type Definition } from '../../hooks/useDictionary'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface DictionaryPopoverProps {
  /** Word to look up */
  word: string
  /** Position to display popover */
  position: { x: number; y: number }
  /** Close handler */
  onClose: () => void
  /** Current theme */
  theme?: string
  /** Optional callback when user clicks to highlight */
  onHighlight?: (word: string, color: string) => void
  /** Optional callback when user clicks a synonym to look it up */
  onLookupWord?: (word: string) => void
  /** Optional callback to open research page with word pre-filled */
  onResearch?: (word: string) => void
}

type TabId = 'definition' | 'synonyms' | 'related'

// ═══════════════════════════════════════════════════════════════════════════
// PART OF SPEECH COLORS
// ═══════════════════════════════════════════════════════════════════════════

const POS_COLORS: Record<string, { bg: string; text: string }> = {
  noun: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  verb: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300' },
  adjective: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
  adverb: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300' },
  acronym: { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-700 dark:text-cyan-300' },
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function DictionaryPopover({
  word,
  position,
  onClose,
  theme = 'light',
  onHighlight,
  onLookupWord,
  onResearch,
}: DictionaryPopoverProps) {
  const { data, isLoading, error, lookup } = useDictionary()
  const [activeTab, setActiveTab] = useState<TabId>('definition')
  const [copied, setCopied] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const isDark = theme.includes('dark')

  // Mount check for portal
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Look up word on mount
  useEffect(() => {
    if (word) {
      lookup(word)
    }
  }, [word, lookup])

  // Handle escape key and click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // Calculate position (keep in viewport)
  const calculatePosition = useCallback(() => {
    if (!popoverRef.current) return { left: position.x, top: position.y }

    const rect = popoverRef.current.getBoundingClientRect()
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const padding = 16

    let left = position.x - rect.width / 2
    let top = position.y - rect.height - 12 // Above the word

    // Keep in viewport bounds
    left = Math.max(padding, Math.min(left, viewport.width - rect.width - padding))

    // If not enough space above, show below
    if (top < padding) {
      top = position.y + 24
    }

    // If still out of bounds, clamp to viewport
    top = Math.max(padding, Math.min(top, viewport.height - rect.height - padding))

    return { left, top }
  }, [position])

  // Copy word to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(word)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [word])

  // Text-to-speech
  const handleSpeak = useCallback(() => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word)
      utterance.lang = 'en-US'
      speechSynthesis.speak(utterance)
    }
  }, [word])

  // Handle synonym click
  const handleSynonymClick = useCallback((synonym: string) => {
    if (onLookupWord) {
      onLookupWord(synonym)
    } else {
      lookup(synonym)
    }
  }, [onLookupWord, lookup])

  if (!isMounted) return null

  const pos = calculatePosition()

  const content = (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        className={`
          fixed z-[200] w-[360px] max-h-[420px] overflow-hidden
          rounded-xl shadow-2xl border backdrop-blur-xl
          flex flex-col
          ${isDark
            ? 'bg-zinc-900/95 border-zinc-700/80'
            : 'bg-white/95 border-zinc-200/80'
          }
        `}
        style={{ left: pos.left, top: pos.top }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`
          flex items-center justify-between px-4 py-3 border-b
          ${isDark ? 'border-zinc-700/50' : 'border-zinc-200/50'}
        `}>
          <div className="flex items-center gap-2.5">
            <div className={`
              p-1.5 rounded-lg
              ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}
            `}>
              <Book className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {word}
              </h3>
              {data?.phonetic && (
                <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {data.phonetic}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Speak button */}
            <button
              onClick={handleSpeak}
              className={`
                p-1.5 rounded-lg transition-colors
                ${isDark
                  ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                  : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                }
              `}
              title="Pronounce"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className={`
                p-1.5 rounded-lg transition-colors
                ${isDark
                  ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                  : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                }
              `}
              title="Copy word"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className={`
                p-1.5 rounded-lg transition-colors
                ${isDark
                  ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                  : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                }
              `}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`
          flex border-b px-2
          ${isDark ? 'border-zinc-700/50' : 'border-zinc-200/50'}
        `}>
          {(['definition', 'synonyms', 'related'] as TabId[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-3 py-2 text-xs font-medium capitalize transition-colors relative
                ${activeTab === tab
                  ? isDark ? 'text-amber-400' : 'text-amber-600'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'
                }
              `}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="tab-indicator"
                  className={`
                    absolute bottom-0 left-0 right-0 h-0.5 rounded-full
                    ${isDark ? 'bg-amber-400' : 'bg-amber-500'}
                  `}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className={`w-8 h-8 mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
              <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {error}
              </p>
            </div>
          ) : data ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'definition' && (
                  <DefinitionTab data={data} isDark={isDark} />
                )}
                {activeTab === 'synonyms' && (
                  <SynonymsTab
                    data={data}
                    isDark={isDark}
                    onSynonymClick={handleSynonymClick}
                  />
                )}
                {activeTab === 'related' && (
                  <RelatedTab
                    data={data}
                    isDark={isDark}
                    onTermClick={handleSynonymClick}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>

        {/* Footer Actions */}
        {data && (onHighlight || onResearch) && (
          <div className={`
            flex items-center gap-2 px-4 py-3 border-t
            ${isDark ? 'border-zinc-700/50 bg-zinc-800/50' : 'border-zinc-200/50 bg-zinc-50/50'}
          `}>
            {onHighlight && (
              <button
                onClick={() => onHighlight(word, 'yellow')}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  transition-colors
                  ${isDark
                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  }
                `}
              >
                <Highlighter className="w-3.5 h-3.5" />
                Highlight
              </button>
            )}
            {onResearch && (
              <button
                onClick={() => {
                  onResearch(word)
                  onClose()
                }}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  transition-colors
                  ${isDark
                    ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                    : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                  }
                `}
              >
                <Search className="w-3.5 h-3.5" />
                Research
              </button>
            )}
          </div>
        )}

        {/* Arrow pointing to word */}
        <div
          className={`
            absolute left-1/2 -translate-x-1/2 -bottom-2
            w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px]
            border-l-transparent border-r-transparent
            ${isDark ? 'border-t-zinc-900' : 'border-t-white'}
          `}
        />
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function DefinitionTab({ data, isDark }: { data: DictionaryData; isDark: boolean }) {
  // Group definitions by part of speech
  const groupedDefs = data.definitions.reduce((acc, def) => {
    const pos = def.partOfSpeech || 'other'
    if (!acc[pos]) acc[pos] = []
    acc[pos].push(def)
    return acc
  }, {} as Record<string, Definition[]>)

  return (
    <div className="space-y-4">
      {/* Acronym badge */}
      {data.isAcronym && data.acronymExpansion && (
        <div className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          ${isDark ? 'bg-cyan-900/30' : 'bg-cyan-50'}
        `}>
          <Sparkles className="w-4 h-4 text-cyan-500" />
          <span className={`text-sm font-medium ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
            {data.acronymExpansion}
          </span>
        </div>
      )}

      {Object.entries(groupedDefs).map(([pos, defs]) => {
        const colors = POS_COLORS[pos] || POS_COLORS.noun
        return (
          <div key={pos} className="space-y-2">
            {/* Part of speech badge */}
            <span className={`
              inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide
              ${colors.bg} ${colors.text}
            `}>
              {pos}
            </span>

            {/* Definitions */}
            <ol className="space-y-2 pl-4">
              {defs.map((def, i) => (
                <li key={i} className="relative">
                  <span className={`
                    absolute -left-4 w-4 text-[10px] font-medium
                    ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
                  `}>
                    {i + 1}.
                  </span>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                    {def.text}
                  </p>
                  {def.example && (
                    <p className={`
                      mt-1 text-xs italic pl-3 border-l-2
                      ${isDark
                        ? 'text-zinc-400 border-zinc-600'
                        : 'text-zinc-500 border-zinc-300'
                      }
                    `}>
                      "{def.example}"
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )
      })}

      {/* Examples section */}
      {data.examples.length > 0 && !data.definitions.some(d => d.example) && (
        <div className="pt-2">
          <h4 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Examples
          </h4>
          <ul className="space-y-1.5">
            {data.examples.slice(0, 3).map((ex, i) => (
              <li
                key={i}
                className={`
                  text-xs italic pl-3 border-l-2
                  ${isDark
                    ? 'text-zinc-400 border-zinc-600'
                    : 'text-zinc-500 border-zinc-300'
                  }
                `}
              >
                "{ex}"
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SynonymsTab({
  data,
  isDark,
  onSynonymClick,
}: {
  data: DictionaryData
  isDark: boolean
  onSynonymClick: (word: string) => void
}) {
  const hasSynonyms = data.synonyms.length > 0
  const hasAntonyms = data.antonyms.length > 0

  if (!hasSynonyms && !hasAntonyms) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          No synonyms or antonyms found
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Synonyms */}
      {hasSynonyms && (
        <div>
          <h4 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Synonyms
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {data.synonyms.map((syn) => (
              <button
                key={syn}
                onClick={() => onSynonymClick(syn)}
                className={`
                  px-2.5 py-1 rounded-full text-xs font-medium
                  transition-colors cursor-pointer
                  ${isDark
                    ? 'bg-zinc-700/60 text-zinc-300 hover:bg-zinc-600'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }
                `}
              >
                {syn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Antonyms */}
      {hasAntonyms && (
        <div>
          <h4 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Antonyms
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {data.antonyms.map((ant) => (
              <button
                key={ant}
                onClick={() => onSynonymClick(ant)}
                className={`
                  px-2.5 py-1 rounded-full text-xs font-medium
                  transition-colors cursor-pointer
                  ${isDark
                    ? 'bg-red-900/30 text-red-300 hover:bg-red-900/50'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }
                `}
              >
                {ant}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RelatedTab({
  data,
  isDark,
  onTermClick,
}: {
  data: DictionaryData
  isDark: boolean
  onTermClick: (word: string) => void
}) {
  const hasHypernyms = data.hypernyms.length > 0
  const hasHyponyms = data.hyponyms.length > 0

  if (!hasHypernyms && !hasHyponyms) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          No related terms found
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Hypernyms (broader terms) */}
      {hasHypernyms && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowUpRight className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Broader Terms
            </h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.hypernyms.map((term) => (
              <button
                key={term}
                onClick={() => onTermClick(term)}
                className={`
                  group flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                  transition-colors cursor-pointer
                  ${isDark
                    ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }
                `}
              >
                {term}
                <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hyponyms (narrower terms) */}
      {hasHyponyms && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowDownRight className={`w-3.5 h-3.5 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
            <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Narrower Terms
            </h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.hyponyms.map((term) => (
              <button
                key={term}
                onClick={() => onTermClick(term)}
                className={`
                  group flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                  transition-colors cursor-pointer
                  ${isDark
                    ? 'bg-green-900/30 text-green-300 hover:bg-green-900/50'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }
                `}
              >
                {term}
                <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
