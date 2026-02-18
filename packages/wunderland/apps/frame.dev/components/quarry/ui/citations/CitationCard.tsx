/**
 * Citation Card - Display academic citations
 * @module codex/ui/CitationCard
 *
 * Rich display for academic citations with copy-as-style functionality.
 * Supports APA, MLA, Chicago, and BibTeX formats.
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy,
  Check,
  ExternalLink,
  FileText,
  BookOpen,
  Quote,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  Building2,
  Hash,
  Download,
  Sparkles,
} from 'lucide-react'
import type { Citation, CitationStyle } from '@/lib/citations/types'
import { formatCitation, toBibTeX } from '@/lib/citations/parser'

interface CitationCardProps {
  /** The citation to display */
  citation: Citation
  /** Whether to show abstract */
  showAbstract?: boolean
  /** Whether to show copy buttons */
  showCopyButtons?: boolean
  /** Current theme */
  theme?: string
  /** Compact mode */
  compact?: boolean
  /** On citation click callback */
  onClick?: (citation: Citation) => void
  /** On add to bibliography callback */
  onAddToBibliography?: (citation: Citation) => void
}

const STYLE_LABELS: Record<CitationStyle, string> = {
  apa: 'APA',
  mla: 'MLA',
  chicago: 'Chicago',
  harvard: 'Harvard',
  ieee: 'IEEE',
  vancouver: 'Vancouver',
  bibtex: 'BibTeX',
}

/**
 * Format author names for display
 */
function formatAuthors(citation: Citation, maxAuthors = 3): string {
  const { authors } = citation

  if (authors.length === 0) return 'Unknown Author'

  const formatAuthor = (a: { given?: string; family: string }) =>
    a.given ? `${a.given} ${a.family}` : a.family

  if (authors.length === 1) {
    return formatAuthor(authors[0])
  }

  if (authors.length === 2) {
    return `${formatAuthor(authors[0])} & ${formatAuthor(authors[1])}`
  }

  if (authors.length <= maxAuthors) {
    const allButLast = authors.slice(0, -1).map(formatAuthor).join(', ')
    const last = formatAuthor(authors[authors.length - 1])
    return `${allButLast}, & ${last}`
  }

  return `${formatAuthor(authors[0])} et al.`
}

/**
 * Get citation type icon
 */
function getTypeIcon(type: Citation['type']) {
  switch (type) {
    case 'book':
    case 'chapter':
      return BookOpen
    case 'preprint':
      return Sparkles
    default:
      return FileText
  }
}

export default function CitationCard({
  citation,
  showAbstract = true,
  showCopyButtons = true,
  theme = 'light',
  compact = false,
  onClick,
  onAddToBibliography,
}: CitationCardProps) {
  const [expanded, setExpanded] = useState(!compact)
  const [copiedStyle, setCopiedStyle] = useState<CitationStyle | null>(null)
  const [showAllStyles, setShowAllStyles] = useState(false)

  const isDark = theme.includes('dark')
  const TypeIcon = getTypeIcon(citation.type)

  /**
   * Copy formatted citation to clipboard
   */
  const handleCopy = useCallback(async (style: CitationStyle) => {
    try {
      const formatted = formatCitation(citation, style)
      await navigator.clipboard.writeText(formatted.text)
      setCopiedStyle(style)
      setTimeout(() => setCopiedStyle(null), 2000)
    } catch (error) {
      console.error('Failed to copy citation:', error)
    }
  }, [citation])

  /**
   * Download as BibTeX
   */
  const handleDownloadBibTeX = useCallback(() => {
    const bibtex = toBibTeX(citation)
    const blob = new Blob([bibtex], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${citation.id.replace(/[^a-z0-9]/gi, '_')}.bib`
    a.click()
    URL.revokeObjectURL(url)
  }, [citation])

  // Primary styles to show
  const primaryStyles: CitationStyle[] = ['apa', 'mla', 'chicago']
  const secondaryStyles: CitationStyle[] = ['harvard', 'ieee', 'vancouver', 'bibtex']

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-xl overflow-hidden border transition-shadow
        ${isDark
          ? 'bg-gray-800/50 border-gray-700 hover:shadow-lg hover:shadow-gray-900/20'
          : 'bg-white border-gray-200 hover:shadow-lg hover:shadow-gray-200/50'
        }
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={() => onClick?.(citation)}
    >
      {/* Header */}
      <div className={`p-3 ${compact ? 'pb-2' : ''}`}>
        {/* Type badge and year */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
              ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}
            `}>
              <TypeIcon className="w-3 h-3" />
              {citation.type === 'article-journal' ? 'Article' :
               citation.type === 'paper-conference' ? 'Conference' :
               citation.type.charAt(0).toUpperCase() + citation.type.slice(1)}
            </span>
            {citation.isOpenAccess && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                Open Access
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="w-3 h-3" />
            {citation.year}
          </div>
        </div>

        {/* Title */}
        <h3 className={`
          font-semibold leading-tight mb-1.5
          ${compact ? 'text-sm line-clamp-2' : 'text-base'}
          ${isDark ? 'text-white' : 'text-gray-900'}
        `}>
          {citation.title}
        </h3>

        {/* Authors */}
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 mb-2">
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span className="line-clamp-1">{formatAuthors(citation)}</span>
        </div>

        {/* Venue */}
        {citation.venue && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="line-clamp-1 italic">{citation.venue}</span>
            {citation.volume && <span>Vol. {citation.volume}</span>}
            {citation.issue && <span>({citation.issue})</span>}
          </div>
        )}

        {/* Citation count badge */}
        {citation.citationCount !== undefined && citation.citationCount > 0 && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            <Quote className="w-3 h-3 text-purple-500" />
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              {citation.citationCount.toLocaleString()} citations
            </span>
          </div>
        )}
      </div>

      {/* Expandable content */}
      {!compact && (
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={`px-3 pb-3 pt-0 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                {/* Abstract */}
                {showAbstract && citation.abstract && (
                  <div className="mt-3">
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {citation.abstract.length > 300
                        ? `${citation.abstract.slice(0, 300)}...`
                        : citation.abstract}
                    </p>
                  </div>
                )}

                {/* Identifiers */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {citation.doi && (
                    <a
                      href={`https://doi.org/${citation.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`
                        inline-flex items-center gap-1 px-2 py-1 rounded text-xs
                        ${isDark
                          ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }
                      `}
                    >
                      <Hash className="w-3 h-3" />
                      DOI
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {citation.arxivId && (
                    <a
                      href={`https://arxiv.org/abs/${citation.arxivId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`
                        inline-flex items-center gap-1 px-2 py-1 rounded text-xs
                        ${isDark
                          ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }
                      `}
                    >
                      arXiv
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {citation.pdfUrl && (
                    <a
                      href={citation.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`
                        inline-flex items-center gap-1 px-2 py-1 rounded text-xs
                        ${isDark
                          ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }
                      `}
                    >
                      <FileText className="w-3 h-3" />
                      PDF
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Copy buttons */}
                {showCopyButtons && (
                  <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">
                      Copy as
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {primaryStyles.map((style) => (
                        <button
                          key={style}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopy(style)
                          }}
                          className={`
                            inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all
                            ${copiedStyle === style
                              ? 'bg-emerald-500 text-white'
                              : isDark
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }
                          `}
                        >
                          {copiedStyle === style ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          {STYLE_LABELS[style]}
                        </button>
                      ))}

                      {/* More styles toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowAllStyles(!showAllStyles)
                        }}
                        className={`
                          inline-flex items-center gap-1 px-2 py-1 rounded text-xs
                          ${isDark
                            ? 'text-gray-400 hover:bg-gray-700'
                            : 'text-gray-500 hover:bg-gray-100'
                          }
                        `}
                      >
                        {showAllStyles ? 'Less' : 'More'}
                        {showAllStyles ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Secondary styles */}
                    <AnimatePresence>
                      {showAllStyles && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="flex flex-wrap gap-1.5 mt-2 overflow-hidden"
                        >
                          {secondaryStyles.map((style) => (
                            <button
                              key={style}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopy(style)
                              }}
                              className={`
                                inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all
                                ${copiedStyle === style
                                  ? 'bg-emerald-500 text-white'
                                  : isDark
                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }
                              `}
                            >
                              {copiedStyle === style ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              {STYLE_LABELS[style]}
                            </button>
                          ))}

                          {/* Download BibTeX */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadBibTeX()
                            }}
                            className={`
                              inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium
                              ${isDark
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }
                            `}
                          >
                            <Download className="w-3 h-3" />
                            .bib
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Add to bibliography button */}
                {onAddToBibliography && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddToBibliography(citation)
                    }}
                    className={`
                      w-full mt-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isDark
                        ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'
                        : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                      }
                    `}
                  >
                    Add to Bibliography
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Expand/collapse for non-compact mode */}
      {!compact && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
          className={`
            w-full py-1.5 flex items-center justify-center gap-1 text-xs transition-colors
            ${isDark
              ? 'text-gray-400 hover:bg-gray-700/50'
              : 'text-gray-500 hover:bg-gray-50'
            }
          `}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              More
            </>
          )}
        </button>
      )}
    </motion.div>
  )
}

/**
 * Compact citation badge for inline use
 */
export function CitationBadge({
  citation,
  style = 'apa',
  onClick,
  theme = 'light',
}: {
  citation: Citation
  style?: CitationStyle
  onClick?: () => void
  theme?: string
}) {
  const isDark = theme.includes('dark')
  const formatted = formatCitation(citation, style)

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs
        transition-colors
        ${isDark
          ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
      `}
      title={formatted.text}
    >
      <Quote className="w-3 h-3 text-purple-500" />
      {formatted.inText}
    </button>
  )
}
