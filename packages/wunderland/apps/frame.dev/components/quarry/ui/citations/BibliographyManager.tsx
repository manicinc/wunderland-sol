/**
 * Bibliography Manager - Per-loom bibliography management
 * @module codex/ui/BibliographyManager
 *
 * Manages bibliography strands with import/export capabilities.
 * Stores citations in `_bibliography.md` per loom.
 */

'use client'

import React, { useState, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  X,
  Upload,
  Download,
  Trash2,
  Plus,
  Search,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  FolderOpen,
} from 'lucide-react'
import type { Citation, CitationStyle } from '@/lib/citations/types'
import {
  formatBibliography,
  toBibTeXFile,
  parseBibTeX,
  parseRIS,
} from '@/lib/citations'
import CitationCard from './CitationCard'

interface BibliographyManagerProps {
  /** Whether the panel is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Current bibliography citations */
  citations: Citation[]
  /** Callback when citations change */
  onCitationsChange: (citations: Citation[]) => void
  /** Current loom path for display */
  loomPath?: string
  /** Current theme */
  theme?: string
  /** Open paper search callback */
  onOpenPaperSearch?: () => void
}

const EXPORT_FORMATS: { value: CitationStyle; label: string; ext: string }[] = [
  { value: 'apa', label: 'APA 7th', ext: 'txt' },
  { value: 'mla', label: 'MLA 9th', ext: 'txt' },
  { value: 'chicago', label: 'Chicago', ext: 'txt' },
  { value: 'bibtex', label: 'BibTeX', ext: 'bib' },
]

export default function BibliographyManager({
  isOpen,
  onClose,
  citations,
  onCitationsChange,
  loomPath,
  theme = 'light',
  onOpenPaperSearch,
}: BibliographyManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [exportFormat, setExportFormat] = useState<CitationStyle>('apa')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const isDark = theme.includes('dark')

  /**
   * Filter citations by search query
   */
  const filteredCitations = useMemo(() => {
    if (!searchQuery.trim()) return citations

    const query = searchQuery.toLowerCase()
    return citations.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.authors.some(
          (a) =>
            a.family?.toLowerCase().includes(query) ||
            a.given?.toLowerCase().includes(query)
        ) ||
        c.venue?.toLowerCase().includes(query) ||
        c.doi?.toLowerCase().includes(query)
    )
  }, [citations, searchQuery])

  /**
   * Handle file import
   */
  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setImporting(true)
      setImportError(null)

      try {
        const content = await file.text()
        let imported: Citation[] = []

        if (file.name.endsWith('.bib') || file.name.endsWith('.bibtex')) {
          imported = parseBibTeX(content)
        } else if (file.name.endsWith('.ris')) {
          imported = parseRIS(content)
        } else {
          // Try BibTeX first, then RIS
          imported = parseBibTeX(content)
          if (imported.length === 0) {
            imported = parseRIS(content)
          }
        }

        if (imported.length === 0) {
          setImportError('No citations found in file. Ensure valid BibTeX or RIS format.')
        } else {
          // Merge with existing, avoiding duplicates by DOI or title
          const existingIds = new Set(citations.map((c) => c.doi || c.title))
          const newCitations = imported.filter(
            (c) => !existingIds.has(c.doi || c.title)
          )
          onCitationsChange([...citations, ...newCitations])
        }
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to import file')
      } finally {
        setImporting(false)
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [citations, onCitationsChange]
  )

  /**
   * Export bibliography
   */
  const handleExport = useCallback(
    (format: CitationStyle) => {
      if (citations.length === 0) return

      let content: string
      let filename: string
      let mimeType: string

      if (format === 'bibtex') {
        content = toBibTeXFile(citations)
        filename = `bibliography.bib`
        mimeType = 'text/plain'
      } else {
        content = formatBibliography(citations, format)
        filename = `bibliography-${format}.txt`
        mimeType = 'text/plain'
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setShowExportMenu(false)
    },
    [citations]
  )

  /**
   * Copy bibliography to clipboard
   */
  const handleCopyAll = useCallback(async () => {
    if (citations.length === 0) return

    try {
      const content = formatBibliography(citations, exportFormat)
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [citations, exportFormat])

  /**
   * Remove a citation
   */
  const handleRemove = useCallback(
    (citationId: string) => {
      onCitationsChange(citations.filter((c) => c.id !== citationId))
    },
    [citations, onCitationsChange]
  )

  /**
   * Clear all citations
   */
  const handleClearAll = useCallback(() => {
    if (confirm('Remove all citations from bibliography?')) {
      onCitationsChange([])
    }
  }, [onCitationsChange])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={`
        fixed right-0 top-16 bottom-0 z-40 w-full max-w-md
        flex flex-col shadow-2xl border-l
        ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
      `}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".bib,.bibtex,.ris,.txt"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Header */}
      <div
        className={`
        flex items-center justify-between px-4 py-3 border-b
        ${isDark ? 'border-gray-700' : 'border-gray-200'}
      `}
      >
        <div className="flex items-center gap-2">
          <BookOpen className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
          <div>
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Bibliography
            </h2>
            {loomPath && (
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {loomPath}
              </p>
            )}
          </div>
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

      {/* Toolbar */}
      <div
        className={`
        flex items-center gap-2 px-4 py-2 border-b
        ${isDark ? 'border-gray-800' : 'border-gray-100'}
      `}
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter citations..."
            className={`
              w-full pl-8 pr-3 py-1.5 rounded-lg border text-sm
              ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              }
            `}
          />
        </div>

        {/* Actions */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className={`
            p-2 rounded-lg transition-colors
            ${
              isDark
                ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }
          `}
          title="Import BibTeX/RIS"
        >
          {importing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </button>

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={citations.length === 0}
            className={`
              p-2 rounded-lg transition-colors
              ${
                isDark
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }
              disabled:opacity-40
            `}
            title="Export bibliography"
          >
            <Download className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showExportMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`
                  absolute right-0 mt-1 py-1 w-36 rounded-lg shadow-xl border z-10
                  ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                `}
              >
                {EXPORT_FORMATS.map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => handleExport(fmt.value)}
                    className={`
                      w-full px-3 py-1.5 text-left text-sm flex items-center justify-between
                      ${
                        isDark
                          ? 'hover:bg-gray-700 text-gray-300'
                          : 'hover:bg-gray-50 text-gray-700'
                      }
                    `}
                  >
                    {fmt.label}
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      .{fmt.ext}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleCopyAll}
          disabled={citations.length === 0}
          className={`
            p-2 rounded-lg transition-colors
            ${
              copied
                ? 'bg-emerald-500 text-white'
                : isDark
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }
            disabled:opacity-40
          `}
          title="Copy all (current format)"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>

        {citations.length > 0 && (
          <button
            onClick={handleClearAll}
            className={`
              p-2 rounded-lg transition-colors
              ${
                isDark
                  ? 'hover:bg-red-900/30 text-gray-400 hover:text-red-400'
                  : 'hover:bg-red-50 text-gray-500 hover:text-red-600'
              }
            `}
            title="Clear all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Import Error */}
      {importError && (
        <div
          className={`
          mx-4 mt-4 p-3 rounded-xl flex items-start gap-2
          ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}
        `}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Import failed</p>
            <p className="opacity-80">{importError}</p>
          </div>
          <button
            onClick={() => setImportError(null)}
            className="ml-auto p-1 hover:bg-red-500/20 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div
        className={`
        px-4 py-2 flex items-center justify-between text-xs
        ${isDark ? 'text-gray-500' : 'text-gray-400'}
      `}
      >
        <span>
          {filteredCitations.length === citations.length
            ? `${citations.length} reference${citations.length !== 1 ? 's' : ''}`
            : `${filteredCitations.length} of ${citations.length} references`}
        </span>
        <div className="flex items-center gap-2">
          <span>Format:</span>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as CitationStyle)}
            className={`
              px-2 py-0.5 rounded border text-xs
              ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-gray-300'
                  : 'bg-white border-gray-200 text-gray-600'
              }
            `}
          >
            {EXPORT_FORMATS.map((fmt) => (
              <option key={fmt.value} value={fmt.value}>
                {fmt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Citations List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-3">
          {filteredCitations.map((citation) => (
            <div key={citation.id} className="relative group">
              <CitationCard
                citation={citation}
                theme={theme}
                showCopyButtons={true}
                compact={true}
              />
              {/* Remove button overlay */}
              <button
                onClick={() => handleRemove(citation.id)}
                className={`
                  absolute -top-1 -right-1 p-1.5 rounded-full opacity-0 group-hover:opacity-100
                  transition-opacity shadow-lg
                  ${
                    isDark
                      ? 'bg-red-900 text-red-400 hover:bg-red-800'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }
                `}
                title="Remove from bibliography"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {citations.length === 0 && (
          <div
            className={`
            text-center py-12
            ${isDark ? 'text-gray-500' : 'text-gray-400'}
          `}
          >
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No references yet</p>
            <p className="text-sm mt-1 mb-4">Add citations to build your bibliography</p>
            <div className="flex flex-col gap-2 items-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium
                  ${
                    isDark
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Import BibTeX/RIS
              </button>
              {onOpenPaperSearch && (
                <button
                  onClick={onOpenPaperSearch}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium
                    ${
                      isDark
                        ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'
                        : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                    }
                  `}
                >
                  <Search className="w-4 h-4 inline mr-2" />
                  Search Papers
                </button>
              )}
            </div>
          </div>
        )}

        {/* No results */}
        {citations.length > 0 && filteredCitations.length === 0 && (
          <div
            className={`
            text-center py-12
            ${isDark ? 'text-gray-500' : 'text-gray-400'}
          `}
          >
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No matching references</p>
            <p className="text-sm mt-1">Try different search terms</p>
          </div>
        )}
      </div>

      {/* Add button */}
      {onOpenPaperSearch && (
        <div
          className={`
          p-4 border-t
          ${isDark ? 'border-gray-700' : 'border-gray-200'}
        `}
        >
          <button
            onClick={onOpenPaperSearch}
            className={`
              w-full py-2.5 rounded-xl font-medium transition-all
              flex items-center justify-center gap-2
              bg-purple-600 text-white hover:bg-purple-700 active:scale-[0.98]
            `}
          >
            <Plus className="w-4 h-4" />
            Add Citation
          </button>
        </div>
      )}
    </motion.div>
  )
}

/**
 * Parse bibliography from markdown strand
 */
export function parseBibliographyFromMarkdown(markdown: string): Citation[] {
  // Look for BibTeX blocks in markdown
  const bibtexMatch = markdown.match(/```bibtex\n([\s\S]*?)\n```/g)
  if (bibtexMatch) {
    const bibtex = bibtexMatch.map((m) => m.replace(/```bibtex\n?|```/g, '')).join('\n')
    return parseBibTeX(bibtex)
  }

  // Look for RIS blocks
  const risMatch = markdown.match(/```ris\n([\s\S]*?)\n```/g)
  if (risMatch) {
    const ris = risMatch.map((m) => m.replace(/```ris\n?|```/g, '')).join('\n')
    return parseRIS(ris)
  }

  return []
}

/**
 * Generate markdown for bibliography strand
 */
export function generateBibliographyMarkdown(
  citations: Citation[],
  format: CitationStyle = 'apa'
): string {
  if (citations.length === 0) {
    return `---
title: Bibliography
type: bibliography
created: ${new Date().toISOString()}
---

# Bibliography

*No references yet. Add citations from the editor to build your bibliography.*
`
  }

  const formatted = formatBibliography(citations, format)
  const bibtex = toBibTeXFile(citations)

  return `---
title: Bibliography
type: bibliography
created: ${new Date().toISOString()}
format: ${format}
count: ${citations.length}
---

# Bibliography

${formatted}

---

## BibTeX Export

\`\`\`bibtex
${bibtex}
\`\`\`
`
}
