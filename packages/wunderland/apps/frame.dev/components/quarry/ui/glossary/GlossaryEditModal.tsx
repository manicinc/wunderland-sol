/**
 * Glossary Term Edit Modal
 * Full-featured modal for creating and editing glossary terms
 * 
 * Features:
 * - Term name editor
 * - Definition editor
 * - Category selector
 * - Aliases field
 * - Link to source strand
 * 
 * @module codex/ui/glossary/GlossaryEditModal
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Save, Plus, Trash2, Book, AlertCircle,
  Code, Lightbulb, Hash, User, Tag, ExternalLink
} from 'lucide-react'
import { useModalAccessibility } from '../../hooks/useModalAccessibility'
import type { GlossaryTerm } from '../../hooks/useGlossary'

type GlossaryCategory = GlossaryTerm['category']

export interface GlossaryEditModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Term to edit (null for new term) */
  term?: GlossaryTerm | null
  /** Strand slug for new terms */
  strandSlug: string
  /** Theme */
  isDark?: boolean
  /** Save callback */
  onSave: (data: GlossaryFormData) => Promise<void>
  /** Delete callback (for existing terms) */
  onDelete?: () => Promise<void>
}

export interface GlossaryFormData {
  term: string
  definition: string
  category: GlossaryCategory
  aliases: string[]
  subcategory?: string
}

const CATEGORY_CONFIG: { value: GlossaryCategory; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'technology', label: 'Technology', icon: Code, description: 'Tech frameworks, languages, tools' },
  { value: 'concept', label: 'Concept', icon: Lightbulb, description: 'Ideas, patterns, methodologies' },
  { value: 'acronym', label: 'Acronym', icon: Hash, description: 'Abbreviations and acronyms' },
  { value: 'entity', label: 'Entity', icon: User, description: 'People, companies, organizations' },
  { value: 'keyword', label: 'Keyword', icon: Tag, description: 'Important terms and phrases' },
]

/**
 * Alias input component
 */
function AliasInput({
  aliases,
  onChange,
  isDark,
}: {
  aliases: string[]
  onChange: (aliases: string[]) => void
  isDark: boolean
}) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    const trimmed = input.trim()
    if (trimmed && !aliases.includes(trimmed)) {
      onChange([...aliases, trimmed])
      setInput('')
    }
  }

  const handleRemove = (alias: string) => {
    onChange(aliases.filter(a => a !== alias))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      {aliases.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {aliases.map(alias => (
            <span
              key={alias}
              className={`
                flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                ${isDark
                  ? 'bg-zinc-700 text-zinc-300'
                  : 'bg-zinc-100 text-zinc-700'
                }
              `}
            >
              {alias}
              <button
                type="button"
                onClick={() => handleRemove(alias)}
                className={`hover:text-red-500 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add alias (e.g., JS for JavaScript)..."
          className={`
            flex-1 px-3 py-2 rounded-lg border text-sm
            ${isDark
              ? 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
              : 'bg-white border-zinc-200 text-zinc-800 placeholder:text-zinc-400'
            }
            focus:outline-none focus:ring-2 focus:ring-emerald-500/30
          `}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!input.trim()}
          className={`
            px-3 py-2 rounded-lg transition-colors
            ${isDark
              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-50'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 disabled:opacity-50'
            }
          `}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Main GlossaryEditModal component
 */
export default function GlossaryEditModal({
  isOpen,
  onClose,
  term,
  strandSlug,
  isDark = false,
  onSave,
  onDelete,
}: GlossaryEditModalProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [termName, setTermName] = useState('')
  const [definition, setDefinition] = useState('')
  const [category, setCategory] = useState<GlossaryCategory>('keyword')
  const [aliases, setAliases] = useState<string[]>([])
  const [subcategory, setSubcategory] = useState('')

  // Initialize form when term changes
  useEffect(() => {
    if (term) {
      setTermName(term.term)
      setDefinition(term.definition || '')
      setCategory(term.category)
      setAliases(term.aliases || [])
      setSubcategory(term.subcategory || '')
    } else {
      // Reset for new term
      setTermName('')
      setDefinition('')
      setCategory('keyword')
      setAliases([])
      setSubcategory('')
    }
    setError(null)
  }, [term, isOpen])

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Accessibility features
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnClickOutside: true,
    trapFocus: true,
    lockScroll: true,
    modalId: 'glossary-edit-modal',
  })

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!termName.trim()) {
      setError('Term name is required')
      return
    }
    if (!definition.trim()) {
      setError('Definition is required')
      return
    }
    if (termName.trim().length < 2) {
      setError('Term must be at least 2 characters')
      return
    }

    setSaving(true)
    try {
      await onSave({
        term: termName.trim(),
        definition: definition.trim(),
        category,
        aliases: aliases.filter(a => a.trim()),
        subcategory: subcategory.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save term')
    } finally {
      setSaving(false)
    }
  }, [termName, definition, category, aliases, subcategory, onSave, onClose])

  const handleDelete = useCallback(async () => {
    if (!onDelete) return
    setSaving(true)
    try {
      await onDelete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete term')
    } finally {
      setSaving(false)
    }
  }, [onDelete, onClose])

  const isEditing = !!term
  const selectedCategoryConfig = CATEGORY_CONFIG.find(c => c.value === category)
  const CategoryIcon = selectedCategoryConfig?.icon || Tag

  if (!isOpen || !isMounted) return null

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={backdropRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400]"
            onClick={handleBackdropClick}
          />

          {/* Modal */}
          <motion.div
            ref={contentRef}
            {...modalProps}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
            className={`
              fixed z-[401] flex flex-col
              left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              w-[min(95vw,560px)] max-h-[90vh]
              overflow-hidden rounded-2xl shadow-2xl
              ${isDark
                ? 'bg-zinc-900 border border-zinc-700'
                : 'bg-white border border-zinc-200'
              }
            `}
          >
            {/* Header */}
            <div className={`
              px-5 py-4 border-b flex items-center justify-between shrink-0
              ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
            `}>
              <div className="flex items-center gap-3">
                <div className={`
                  p-2 rounded-xl
                  ${isDark
                    ? 'bg-gradient-to-br from-emerald-900/60 to-teal-900/40'
                    : 'bg-gradient-to-br from-emerald-100 to-teal-100'
                  }
                `}>
                  <Book className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {isEditing ? 'Edit Term' : 'New Term'}
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {strandSlug}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                disabled={saving}
                className={`
                  p-2 rounded-xl transition-colors
                  ${isDark
                    ? 'hover:bg-zinc-800 text-zinc-400'
                    : 'hover:bg-zinc-100 text-zinc-500'
                  }
                `}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Term Preview Card */}
              <div className={`
                p-4 rounded-xl border-2
                ${isDark
                  ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700'
                  : 'bg-gradient-to-br from-zinc-50 to-white border-zinc-200'
                }
              `}>
                <div className="flex items-start gap-3">
                  <div className={`
                    p-2 rounded-lg shrink-0
                    ${isDark ? 'bg-zinc-700/50' : 'bg-white'}
                  `}>
                    <CategoryIcon className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                      {termName || 'Term Name'}
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {definition || 'Definition will appear here...'}
                    </p>
                    {aliases.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          Also known as:
                        </span>
                        {aliases.slice(0, 3).map(alias => (
                          <span
                            key={alias}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}
                          >
                            {alias}
                          </span>
                        ))}
                        {aliases.length > 3 && (
                          <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            +{aliases.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Term Name */}
              <div className="space-y-2">
                <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Term Name
                </label>
                <input
                  type="text"
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  placeholder="e.g., React, API, useState"
                  className={`
                    w-full px-4 py-3 rounded-xl border text-sm
                    ${isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400'
                    }
                    focus:outline-none focus:ring-2 focus:ring-emerald-500/30
                  `}
                />
              </div>

              {/* Definition */}
              <div className="space-y-2">
                <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Definition
                </label>
                <textarea
                  value={definition}
                  onChange={(e) => setDefinition(e.target.value)}
                  placeholder="A clear and concise definition of the term..."
                  rows={4}
                  className={`
                    w-full px-4 py-3 rounded-xl border text-sm resize-none
                    ${isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400'
                    }
                    focus:outline-none focus:ring-2 focus:ring-emerald-500/30
                  `}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORY_CONFIG.map(cat => {
                    const Icon = cat.icon
                    const isSelected = category === cat.value
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`
                          flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all
                          ${isSelected
                            ? isDark
                              ? 'bg-emerald-900/30 border-emerald-600 text-emerald-400'
                              : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : isDark
                              ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium truncate">{cat.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Subcategory */}
              <div className="space-y-2">
                <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Subcategory (optional)
                </label>
                <input
                  type="text"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="e.g., Hook, Pattern, Framework"
                  className={`
                    w-full px-4 py-3 rounded-xl border text-sm
                    ${isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400'
                    }
                    focus:outline-none focus:ring-2 focus:ring-emerald-500/30
                  `}
                />
              </div>

              {/* Aliases */}
              <div className="space-y-2">
                <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Aliases (optional)
                </label>
                <AliasInput aliases={aliases} onChange={setAliases} isDark={isDark} />
              </div>

              {/* Source strand link (for existing terms) */}
              {term?.sourceText && (
                <div className={`
                  flex items-center gap-2 p-3 rounded-xl text-xs
                  ${isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-zinc-50 text-zinc-500'}
                `}>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Found in: {strandSlug}</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className={`
                  flex items-center gap-2 p-3 rounded-xl text-sm
                  ${isDark
                    ? 'bg-red-900/30 text-red-400 border border-red-800/50'
                    : 'bg-red-50 text-red-600 border border-red-200'
                  }
                `}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </form>

            {/* Footer */}
            <div className={`
              px-5 py-4 border-t flex items-center justify-between shrink-0
              ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
            `}>
              {/* Delete button (only for existing terms) */}
              {isEditing && onDelete ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors
                    ${isDark
                      ? 'text-red-400 hover:bg-red-900/30'
                      : 'text-red-600 hover:bg-red-50'
                    }
                    disabled:opacity-50
                  `}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium transition-colors
                    ${isDark
                      ? 'text-zinc-400 hover:bg-zinc-800'
                      : 'text-zinc-600 hover:bg-zinc-100'
                    }
                    disabled:opacity-50
                  `}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={saving || !termName.trim() || !definition.trim()}
                  className={`
                    flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold
                    bg-gradient-to-r from-emerald-600 to-teal-600 text-white
                    shadow-lg shadow-emerald-500/20
                    hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                    transition-all disabled:opacity-50 disabled:hover:scale-100
                  `}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {isEditing ? 'Save Changes' : 'Create Term'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}

