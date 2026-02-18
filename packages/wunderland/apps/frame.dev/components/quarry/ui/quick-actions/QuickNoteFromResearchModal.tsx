/**
 * Quick Note from Research Modal
 * @module codex/ui/QuickNoteFromResearchModal
 *
 * Creates a new note/strand from a research result with:
 * - Pre-filled title from the result
 * - Frontmatter with source URL backlink
 * - Auto-generated citation block
 * - Loom/weave selector
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Link2,
  Folder,
  BookOpen,
  Quote,
  Tag,
  GraduationCap,
  Globe,
  Hash,
} from 'lucide-react'
import type { WebSearchResult } from '@/lib/research/types'
import { formatCitation, type CitationStyle, getCitationStyles } from '@/lib/research/citationFormatter'
import { resultToCitationSource } from '@/lib/research/sessionToCitations'
import { linkResultToStrand } from '@/lib/research/researchLinks'
import { getResearchPreferences } from '@/lib/research/preferences'
import { isAcademicResult } from '@/lib/research/academicDetector'
import { Z_INDEX } from '../../constants'

// ============================================================================
// TYPES
// ============================================================================

interface QuickNoteFromResearchModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** The research result to create a note from */
  result: WebSearchResult | null
  /** Research session ID for linking */
  sessionId: string
  /** Current theme */
  theme?: string
  /** Callback when note is created */
  onCreate?: (note: CreatedNote) => void
  /** Available looms for selection */
  looms?: Array<{ id: string; name: string; path: string }>
}

interface CreatedNote {
  title: string
  path: string
  content: string
  loomId: string
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
    .replace(/-$/, '')
}

/**
 * Generate frontmatter for the note
 */
function generateFrontmatter(
  title: string,
  result: WebSearchResult,
  tags: string[],
  citationStyle: CitationStyle
): string {
  const source = resultToCitationSource(result)
  const citation = formatCitation(source, citationStyle)
  const now = new Date().toISOString()
  const isAcademic = isAcademicResult(result)

  const lines = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `created: ${now}`,
    `source_url: ${result.url}`,
    `source_title: "${result.title.replace(/"/g, '\\"')}"`,
    `source_domain: ${result.domain}`,
  ]

  if (result.publishedDate) {
    lines.push(`source_date: ${result.publishedDate}`)
  }

  if (result.authors && result.authors.length > 0) {
    lines.push(`authors: [${result.authors.map(a => `"${a}"`).join(', ')}]`)
  }

  if (isAcademic) {
    lines.push(`type: research-note`)
    lines.push(`academic: true`)
  } else {
    lines.push(`type: research-note`)
  }

  if (tags.length > 0) {
    lines.push(`tags: [${tags.map(t => `"${t}"`).join(', ')}]`)
  }

  lines.push('---')
  lines.push('')

  return lines.join('\n')
}

/**
 * Generate the note content
 */
function generateNoteContent(
  title: string,
  result: WebSearchResult,
  tags: string[],
  citationStyle: CitationStyle,
  includeSnippet: boolean
): string {
  const frontmatter = generateFrontmatter(title, result, tags, citationStyle)
  const source = resultToCitationSource(result)
  const citation = formatCitation(source, citationStyle)
  const isAcademic = isAcademicResult(result)

  const lines: string[] = [frontmatter]

  // Title heading
  lines.push(`# ${title}`)
  lines.push('')

  // Source badge and link
  if (isAcademic) {
    lines.push(`> 📚 **Academic Source**: [${result.title}](${result.url})`)
  } else {
    lines.push(`> 🔗 **Source**: [${result.title}](${result.url})`)
  }
  lines.push('')

  // Snippet quote if included
  if (includeSnippet && result.snippet) {
    lines.push('## Summary')
    lines.push('')
    lines.push(`> ${result.snippet}`)
    lines.push('')
  }

  // Notes section
  lines.push('## Notes')
  lines.push('')
  lines.push('<!-- Add your notes here -->')
  lines.push('')
  lines.push('')

  // Key Points section
  lines.push('## Key Points')
  lines.push('')
  lines.push('- ')
  lines.push('')
  lines.push('')

  // Citation block
  lines.push('---')
  lines.push('')
  lines.push('## Citation')
  lines.push('')
  lines.push('```')
  lines.push(citation)
  lines.push('```')
  lines.push('')

  return lines.join('\n')
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function QuickNoteFromResearchModal({
  isOpen,
  onClose,
  result,
  sessionId,
  theme = 'light',
  onCreate,
  looms = [],
}: QuickNoteFromResearchModalProps) {
  const isDark = theme?.includes('dark')
  const prefs = getResearchPreferences()
  const citationStyles = getCitationStyles()

  // Form state
  const [title, setTitle] = useState('')
  const [selectedLoom, setSelectedLoom] = useState(looms[0]?.id || '')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [citationStyle, setCitationStyle] = useState<CitationStyle>(prefs.defaultCitationStyle)
  const [includeSnippet, setIncludeSnippet] = useState(true)
  const [createLink, setCreateLink] = useState(true)

  // UI state
  const [status, setStatus] = useState<'form' | 'creating' | 'success' | 'error'>('form')
  const [errorMessage, setErrorMessage] = useState('')

  // Reset form when result changes
  useEffect(() => {
    if (result) {
      setTitle(result.title)
      setTags([])
      setTagInput('')
      setStatus('form')
      setErrorMessage('')
    }
  }, [result])

  // Handle tag input
  const handleAddTag = useCallback((tag: string) => {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setTagInput('')
  }, [tags])

  const handleRemoveTag = useCallback((tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }, [tags])

  const handleTagKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }, [tagInput, tags, handleAddTag])

  // Create the note
  const handleCreate = useCallback(async () => {
    if (!result || !title.trim()) return

    setStatus('creating')
    setErrorMessage('')

    try {
      const slug = generateSlug(title)
      const content = generateNoteContent(title, result, tags, citationStyle, includeSnippet)
      const path = selectedLoom ? `${selectedLoom}/${slug}.md` : `notes/${slug}.md`

      // Create the link if enabled
      if (createLink) {
        try {
          await linkResultToStrand(result, sessionId, path, selectedLoom || 'default', {
            linkType: 'note',
            context: `Created from research: ${result.title}`,
          })
        } catch (linkError) {
          console.warn('Failed to create research link:', linkError)
          // Continue anyway - note creation is more important
        }
      }

      const note: CreatedNote = {
        title,
        path,
        content,
        loomId: selectedLoom || 'default',
      }

      setStatus('success')
      onCreate?.(note)

      // Auto-close after success
      setTimeout(() => {
        onClose()
      }, 1500)

    } catch (error) {
      console.error('Failed to create note:', error)
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create note')
    }
  }, [result, title, tags, citationStyle, includeSnippet, selectedLoom, createLink, sessionId, onCreate, onClose])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && status !== 'creating') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, status, onClose])

  if (!isOpen || !result) return null

  const isAcademic = isAcademicResult(result)

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
          onClick={status !== 'creating' ? onClose : undefined}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`
            relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden
            ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white'}
          `}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-cyan-900/30' : 'bg-cyan-100'}`}>
                  <FileText className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Create Note from Research
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isAcademic ? 'Academic paper' : 'Web source'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={status === 'creating'}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                } disabled:opacity-50`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {status === 'success' ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Note Created!
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Your research note has been created successfully.
                </p>
              </div>
            ) : status === 'error' ? (
              <div className="text-center py-8">
                <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Creation Failed
                </h3>
                <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                  {errorMessage}
                </p>
                <button
                  onClick={() => setStatus('form')}
                  className="mt-4 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                {/* Source Preview */}
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-2">
                    {isAcademic ? (
                      <GraduationCap className={`w-4 h-4 mt-0.5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                    ) : (
                      <Globe className={`w-4 h-4 mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {result.title}
                      </p>
                      <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {result.domain}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Note Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter note title..."
                    className={`
                      w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all
                      ${isDark
                        ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:border-cyan-600'
                        : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-cyan-500'
                      }
                    `}
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Tags
                  </label>
                  <div className={`
                    flex flex-wrap gap-1.5 p-2 rounded-xl min-h-[40px]
                    ${isDark
                      ? 'bg-gray-800 border border-gray-700'
                      : 'bg-gray-50 border border-gray-200'
                    }
                  `}>
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className={`
                          flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                          ${isDark
                            ? 'bg-cyan-900/50 text-cyan-300'
                            : 'bg-cyan-100 text-cyan-700'
                          }
                        `}
                      >
                        <Hash className="w-3 h-3" />
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-0.5 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      onBlur={() => tagInput && handleAddTag(tagInput)}
                      placeholder={tags.length === 0 ? "Add tags..." : ""}
                      className={`
                        flex-1 min-w-[80px] text-xs outline-none bg-transparent
                        ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}
                      `}
                    />
                  </div>
                </div>

                {/* Citation Style */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Citation Style
                  </label>
                  <select
                    value={citationStyle}
                    onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
                    className={`
                      w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all
                      ${isDark
                        ? 'bg-gray-800 border border-gray-700 text-white focus:border-cyan-600'
                        : 'bg-gray-50 border border-gray-200 text-gray-900 focus:border-cyan-500'
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

                {/* Options */}
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                    isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={includeSnippet}
                      onChange={(e) => setIncludeSnippet(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                    />
                    <div>
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Include snippet as summary
                      </span>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Add the search result snippet as a blockquote
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                    isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={createLink}
                      onChange={(e) => setCreateLink(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                    />
                    <div>
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Link to research session
                      </span>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Create a bidirectional link for easy navigation
                      </p>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {(status === 'form' || status === 'creating') && (
            <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'} flex justify-end gap-3`}>
              <button
                onClick={onClose}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg transition-colors
                  ${isDark
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!title.trim() || status === 'creating'}
                className={`
                  flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors
                  bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {status === 'creating' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Create Note
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
