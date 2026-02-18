/**
 * Session Bibliography Generator
 * @module codex/ui/SessionBibliographyGenerator
 *
 * Generates formatted bibliographies from research session saved results.
 * Supports multiple citation styles and export formats.
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  BookOpen,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Download,
  FileText,
  Code2,
  FileCode,
  Check,
  RefreshCw,
  GraduationCap,
  Globe,
  Sparkles,
} from 'lucide-react'
import type { ResearchSession, WebSearchResult } from '@/lib/research/types'
import { getCitationStyles, type CitationStyle, formatCitation } from '@/lib/research/citationFormatter'
import {
  convertSessionToCitations,
  exportBibliography,
  type ConvertedCitation,
  type SessionCitationsResult,
} from '@/lib/research/sessionToCitations'
import { getResearchPreferences } from '@/lib/research/preferences'
import { isAcademicResult } from '@/lib/research/academicDetector'
import { Z_INDEX } from '../../constants'

// ============================================================================
// TYPES
// ============================================================================

interface SessionBibliographyGeneratorProps {
  /** Whether the panel/modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** The research session to generate bibliography from */
  session: ResearchSession | null
  /** Current theme */
  theme?: string
  /** Callback to insert bibliography into editor */
  onInsert?: (content: string) => void
}

type ExportFormat = 'text' | 'markdown' | 'html' | 'bibtex'

const EXPORT_FORMATS: Array<{ value: ExportFormat; label: string; icon: React.ReactNode }> = [
  { value: 'text', label: 'Plain Text', icon: <FileText className="w-4 h-4" /> },
  { value: 'markdown', label: 'Markdown', icon: <FileCode className="w-4 h-4" /> },
  { value: 'html', label: 'HTML', icon: <Code2 className="w-4 h-4" /> },
  { value: 'bibtex', label: 'BibTeX', icon: <BookOpen className="w-4 h-4" /> },
]

// ============================================================================
// COMPONENT
// ============================================================================

export default function SessionBibliographyGenerator({
  isOpen,
  onClose,
  session,
  theme = 'light',
  onInsert,
}: SessionBibliographyGeneratorProps) {
  const isDark = theme?.includes('dark')
  const prefs = getResearchPreferences()
  const citationStyles = getCitationStyles()

  // State
  const [citationStyle, setCitationStyle] = useState<CitationStyle>(prefs.defaultCitationStyle)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('text')
  const [autoEnrich, setAutoEnrich] = useState(prefs.autoEnrichEnabled)
  const [numbered, setNumbered] = useState(true)

  // Processing state
  const [status, setStatus] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle')
  const [result, setResult] = useState<SessionCitationsResult | null>(null)
  const [preview, setPreview] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [copied, setCopied] = useState(false)

  // Reset when session changes
  useEffect(() => {
    if (session) {
      setStatus('idle')
      setResult(null)
      setPreview('')
      setErrorMessage('')
    }
  }, [session])

  // Generate bibliography
  const handleGenerate = useCallback(async () => {
    if (!session || session.savedResults.length === 0) return

    setStatus('generating')
    setErrorMessage('')

    try {
      const citationResult = await convertSessionToCitations(session, {
        style: citationStyle,
        autoEnrich,
      })

      setResult(citationResult)

      // Generate preview
      const previewContent = exportBibliography(
        citationResult.citations,
        citationStyle,
        exportFormat
      )
      setPreview(previewContent)
      setStatus('ready')

    } catch (error) {
      console.error('Failed to generate bibliography:', error)
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate bibliography')
    }
  }, [session, citationStyle, autoEnrich, exportFormat])

  // Regenerate preview when format changes
  useEffect(() => {
    if (result && status === 'ready') {
      const newPreview = exportBibliography(result.citations, citationStyle, exportFormat)
      setPreview(newPreview)
    }
  }, [exportFormat, citationStyle, result, status])

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!preview) return

    try {
      await navigator.clipboard.writeText(preview)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [preview])

  // Download as file
  const handleDownload = useCallback(() => {
    if (!preview) return

    const extension = exportFormat === 'bibtex' ? 'bib' : exportFormat === 'markdown' ? 'md' : exportFormat
    const mimeType = exportFormat === 'html' ? 'text/html' : 'text/plain'
    const filename = `bibliography-${session?.id || 'research'}.${extension}`

    const blob = new Blob([preview], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [preview, exportFormat, session])

  // Insert into editor
  const handleInsert = useCallback(() => {
    if (!preview || !onInsert) return
    onInsert(preview)
    onClose()
  }, [preview, onInsert, onClose])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && status !== 'generating') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, status, onClose])

  if (!isOpen || !session) return null

  const savedCount = session.savedResults.length
  const academicCount = session.savedResults.filter(r => isAcademicResult(r)).length

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: Z_INDEX.MODAL }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={status !== 'generating' ? onClose : undefined}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`
            relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden
            ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white'}
          `}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
                  <BookOpen className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Generate Bibliography
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {savedCount} source{savedCount !== 1 ? 's' : ''} • {academicCount} academic
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={status === 'generating'}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                } disabled:opacity-50`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Session Info */}
            <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Research Session
                </span>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Query: "{session.query}"
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className={`flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <Globe className="w-3 h-3" />
                  {savedCount - academicCount} web
                </span>
                <span className={`flex items-center gap-1 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                  <GraduationCap className="w-3 h-3" />
                  {academicCount} academic
                </span>
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              {/* Citation Style */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Citation Style
                </label>
                <select
                  value={citationStyle}
                  onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
                  className={`
                    w-full px-3 py-2 rounded-lg text-sm outline-none transition-all
                    ${isDark
                      ? 'bg-gray-800 border border-gray-700 text-white focus:border-emerald-600'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 focus:border-emerald-500'
                    }
                  `}
                >
                  {citationStyles.map(style => (
                    <option key={style.id} value={style.id}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Export Format */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Export Format
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                  className={`
                    w-full px-3 py-2 rounded-lg text-sm outline-none transition-all
                    ${isDark
                      ? 'bg-gray-800 border border-gray-700 text-white focus:border-emerald-600'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 focus:border-emerald-500'
                    }
                  `}
                >
                  {EXPORT_FORMATS.map(format => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Options Toggles */}
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
              }`}>
                <input
                  type="checkbox"
                  checked={autoEnrich}
                  onChange={(e) => setAutoEnrich(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <div>
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Auto-enrich academic sources
                  </span>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Fetch additional metadata from Semantic Scholar
                  </p>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
              }`}>
                <input
                  type="checkbox"
                  checked={numbered}
                  onChange={(e) => setNumbered(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <div>
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Number citations
                  </span>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Add reference numbers [1], [2], etc.
                  </p>
                </div>
              </label>
            </div>

            {/* Generate Button */}
            {status === 'idle' && (
              <button
                onClick={handleGenerate}
                disabled={savedCount === 0}
                className={`
                  w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-colors
                  ${savedCount === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }
                `}
              >
                <BookOpen className="w-4 h-4" />
                Generate Bibliography
              </button>
            )}

            {/* Loading */}
            {status === 'generating' && (
              <div className="text-center py-8">
                <Loader2 className={`w-10 h-10 mx-auto animate-spin ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <p className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Generating bibliography...
                  {autoEnrich && ' Enriching academic sources...'}
                </p>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                      Generation Failed
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                      {errorMessage}
                    </p>
                    <button
                      onClick={handleGenerate}
                      className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            {status === 'ready' && result && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {result.citations.length} citation{result.citations.length !== 1 ? 's' : ''} generated
                    </span>
                  </div>
                  {result.enrichedCount > 0 && (
                    <span className={`text-xs ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                      {result.enrichedCount} enriched
                    </span>
                  )}
                </div>

                <div className={`
                  p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-60 overflow-y-auto
                  ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700'}
                `}>
                  <pre className="whitespace-pre-wrap">{preview}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {status === 'ready' && (
            <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className={`
                      flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                      ${isDark
                        ? 'text-gray-300 hover:bg-gray-800'
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className={`
                      flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                      ${isDark
                        ? 'text-gray-300 hover:bg-gray-800'
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setStatus('idle')
                      setResult(null)
                      setPreview('')
                    }}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-lg transition-colors
                      ${isDark
                        ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    Regenerate
                  </button>
                  {onInsert && (
                    <button
                      onClick={handleInsert}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Insert into Document
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
