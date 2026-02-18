/**
 * Glossary Panel Component
 * Displays auto-generated vocabulary from strand content
 *
 * @module codex/ui/GlossaryPanel
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Book, Search, Filter, ChevronDown, ChevronRight,
  Code, Lightbulb, Hash, User, Building2, Tag,
  Sparkles, RefreshCw, ExternalLink, Copy, Check,
  Settings, Database, Zap, Cloud, HardDrive, Info,
  Trash2, Pencil, RotateCcw, ArrowRight,
} from 'lucide-react'
import { useGlossary, type GlossaryTerm } from '../../hooks/useGlossary'
import { useGlossaryEdits, generateTermHash } from '../../hooks/useGlossaryEdits'
import { InlineEditableText } from '../inline-editor/InlineEditableText'
import { ConfirmableAction } from '../common/ConfirmableAction'
import {
  getPlatformFeatures,
  getFeatureMessage,
  isMethodAvailable,
  type GenerationMethod,
} from '@/lib/glossary'
import { GenerationProgress, calculateOverallProgress, type GenerationStage } from '../status/GenerationProgress'
import { VirtualList } from '../common/VirtualList'

interface GlossaryPanelProps {
  /** Strand content to generate glossary from */
  content?: string
  /** Theme */
  isDark?: boolean
  /** Callback when clicking a term to jump to source */
  onJumpToSource?: (text: string) => void
  /** Compact mode for embedding in other components */
  compact?: boolean
  /** Strand slug for edit persistence */
  strandSlug?: string
  /** Enable editing features */
  editable?: boolean
  /** Pre-loaded/cached terms to display instead of generating */
  preloadedTerms?: GlossaryTerm[]
}

/**
 * Category icons and colors
 */
/**
 * Hypernym breadcrumb component
 * Shows semantic hierarchy from WordNet (e.g., "React · framework · software")
 */
function HypernymBreadcrumb({
  term,
  isDark,
}: {
  term: string
  isDark: boolean
}) {
  const [hypernyms, setHypernyms] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchHypernyms = async () => {
      setLoading(true)
      try {
        // Dynamic import to avoid SSR issues
        const { getHypernymChain } = await import('@/lib/nlp/wordnet')
        const chain = await getHypernymChain(term)
        if (mounted && chain.length > 0) {
          setHypernyms(chain.slice(0, 3)) // Show max 3 hypernyms
        }
      } catch (error) {
        // WordNet not available or term not found - silently fail
      } finally {
        if (mounted) setLoading(false)
      }
    }

    // Only fetch for terms that might have WordNet entries (single words, no special chars)
    if (term && /^[a-zA-Z]+$/.test(term.replace(/[-_\s]/g, ''))) {
      fetchHypernyms()
    }

    return () => { mounted = false }
  }, [term])

  if (loading || hypernyms.length === 0) return null

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      <span className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
        {term}
      </span>
      {hypernyms.map((hypernym, i) => (
        <React.Fragment key={i}>
          <ArrowRight className={`w-3 h-3 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
            {hypernym}
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

const CATEGORY_CONFIG: Record<GlossaryTerm['category'], {
  icon: React.ElementType
  label: string
  color: { light: string; dark: string }
}> = {
  technology: {
    icon: Code,
    label: 'Technology',
    color: { light: 'bg-blue-100 text-blue-700 border-blue-200', dark: 'bg-blue-900/40 text-blue-300 border-blue-800' },
  },
  concept: {
    icon: Lightbulb,
    label: 'Concepts',
    color: { light: 'bg-purple-100 text-purple-700 border-purple-200', dark: 'bg-purple-900/40 text-purple-300 border-purple-800' },
  },
  acronym: {
    icon: Hash,
    label: 'Acronyms',
    color: { light: 'bg-amber-100 text-amber-700 border-amber-200', dark: 'bg-amber-900/40 text-amber-300 border-amber-800' },
  },
  entity: {
    icon: User,
    label: 'Entities',
    color: { light: 'bg-emerald-100 text-emerald-700 border-emerald-200', dark: 'bg-emerald-900/40 text-emerald-300 border-emerald-800' },
  },
  keyword: {
    icon: Tag,
    label: 'Keywords',
    color: { light: 'bg-zinc-100 text-zinc-700 border-zinc-200', dark: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  },
}

/**
 * Single glossary term card
 */
function TermCard({
  term,
  isDark,
  onJumpToSource,
  expanded,
  onToggle,
  onUpdateTerm,
  onUpdateDefinition,
  onDelete,
  onRestore,
  isEdited,
  isDeleted,
}: {
  term: GlossaryTerm
  isDark: boolean
  onJumpToSource?: (text: string) => void
  expanded: boolean
  onToggle: () => void
  onUpdateTerm?: (newTerm: string) => Promise<void>
  onUpdateDefinition?: (newDefinition: string) => Promise<void>
  onDelete?: () => Promise<void>
  onRestore?: () => Promise<void>
  isEdited?: boolean
  isDeleted?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [isEditingTerm, setIsEditingTerm] = useState(false)
  const [isEditingDefinition, setIsEditingDefinition] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const config = CATEGORY_CONFIG[term.category]
  const Icon = config.icon

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = term.definition
      ? `${term.term}: ${term.definition}`
      : term.term
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJump = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (term.sourceText && onJumpToSource) {
      onJumpToSource(term.sourceText)
    }
  }

  const handleCardClick = () => {
    // Don't toggle if editing or confirming delete
    if (!isEditingTerm && !isEditingDefinition && !showDeleteConfirm) {
      onToggle()
    }
  }

  const handleQuickEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Expand and focus the term input
    if (!expanded) {
      onToggle()
    }
    // Small delay to let expansion happen, then focus
    setTimeout(() => setIsEditingTerm(true), 100)
  }

  const handleQuickDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      await onDelete()
    }
    setShowDeleteConfirm(false)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(false)
  }

  // Deleted state - show restore option
  if (isDeleted && onRestore) {
    return (
      <div
        className={`
          rounded-xl border overflow-hidden transition-all opacity-50
          ${isDark
            ? 'bg-zinc-800/30 border-zinc-700/50'
            : 'bg-zinc-50 border-zinc-200/50'
          }
        `}
      >
        <div className="p-3 flex items-center gap-3">
          <div className={`p-1.5 rounded-lg border ${isDark ? config.color.dark : config.color.light} opacity-50`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className={`font-semibold truncate line-through ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {term.term}
            </span>
          </div>
          <button
            onClick={onRestore}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
              isDark ? 'hover:bg-zinc-700 text-cyan-400' : 'hover:bg-zinc-100 text-cyan-600'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            Restore
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`
        group/term rounded-xl border overflow-hidden cursor-pointer transition-all
        ${isDark
          ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
          : 'bg-white border-zinc-200 hover:border-zinc-300'
        }
        ${isEdited ? (isDark ? 'ring-1 ring-cyan-500/30' : 'ring-1 ring-cyan-500/20') : ''}
      `}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="p-3 flex items-center gap-3">
        {/* Category badge */}
        <div className={`
          p-1.5 rounded-lg border
          ${isDark ? config.color.dark : config.color.light}
        `}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Term */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-semibold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {term.term}
            </span>
            {term.subcategory && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                {term.subcategory}
              </span>
            )}
            {isEdited && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-cyan-900/50 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                Edited
              </span>
            )}
          </div>
          {!expanded && term.definition && (
            <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {term.definition}
            </p>
          )}
        </div>

        {/* Quick Actions - appear on hover (before confidence) */}
        {!expanded && (onUpdateTerm || onDelete) && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover/term:opacity-100 transition-opacity">
            {showDeleteConfirm ? (
              <>
                <button
                  onClick={handleConfirmDelete}
                  className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isDark
                      ? 'bg-red-900/50 text-red-400 hover:bg-red-900/70'
                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
                  title="Confirm delete"
                >
                  Delete
                </button>
                <button
                  onClick={handleCancelDelete}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    isDark
                      ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                  }`}
                  title="Cancel"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {onUpdateTerm && (
                  <button
                    onClick={handleQuickEdit}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDark
                        ? 'text-zinc-400 hover:text-cyan-400 hover:bg-zinc-700'
                        : 'text-zinc-400 hover:text-cyan-600 hover:bg-zinc-100'
                    }`}
                    title="Edit term"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleQuickDelete}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDark
                        ? 'text-zinc-400 hover:text-red-400 hover:bg-zinc-700'
                        : 'text-zinc-400 hover:text-red-500 hover:bg-zinc-100'
                    }`}
                    title="Delete term"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Confidence indicator */}
        <div className={`text-[10px] font-medium ${
          term.confidence >= 0.8
            ? 'text-emerald-500'
            : term.confidence >= 0.6
            ? 'text-amber-500'
            : 'text-zinc-400'
        }`}>
          {Math.round(term.confidence * 100)}%
        </div>

        {/* Expand chevron - CSS transform instead of motion */}
        <ChevronRight
          className={`w-4 h-4 transition-transform duration-200 ${isDark ? 'text-zinc-500' : 'text-zinc-400'} ${expanded ? 'rotate-90' : ''}`}
        />
      </div>

      {/* Expanded content - simplified, no heavy animations */}
      {expanded && (
        <div className={`border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
          <div className="p-3 space-y-3">
            {/* Editable Term */}
            {onUpdateTerm ? (
              <div className="space-y-1">
                <label className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Term
                </label>
                <InlineEditableText
                  value={term.term}
                  onSave={onUpdateTerm}
                  isDark={isDark}
                  placeholder="Enter term..."
                  displayClassName={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}
                  onEditStart={() => setIsEditingTerm(true)}
                  onEditEnd={() => setIsEditingTerm(false)}
                />
              </div>
            ) : null}

            {/* Editable Definition */}
            {onUpdateDefinition ? (
              <div className="space-y-1">
                <label className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Definition
                </label>
                <InlineEditableText
                  value={term.definition || ''}
                  onSave={onUpdateDefinition}
                  isDark={isDark}
                  placeholder="Enter definition..."
                  multiline
                  displayClassName={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}
                  onEditStart={() => setIsEditingDefinition(true)}
                  onEditEnd={() => setIsEditingDefinition(false)}
                />
              </div>
            ) : term.definition ? (
              <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                {term.definition}
              </p>
            ) : null}

            {/* Hypernym breadcrumb - semantic hierarchy */}
            <div className="space-y-1">
              <span className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Semantic Hierarchy
              </span>
              <HypernymBreadcrumb term={term.term} isDark={isDark} />
            </div>

            {/* Aliases */}
            {term.aliases && term.aliases.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Also known as:
                </span>
                {term.aliases.map((alias, i) => (
                  <span key={i} className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}>
                    {alias}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1 border-t border-dashed ${isDark ? 'border-zinc-700' : 'border-zinc-200'}">
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                  isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                }`}
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              {term.sourceText && onJumpToSource && (
                <button
                  onClick={handleJump}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                    isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                  }`}
                >
                  <ExternalLink className="w-3 h-3" />
                  Jump to source
                </button>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Delete button */}
              {onDelete && (
                <ConfirmableAction
                  onConfirm={onDelete}
                  icon={Trash2}
                  variant="danger"
                  isDark={isDark}
                  size="sm"
                  iconOnly
                  title="Delete term"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Main Glossary Panel Component
 */
/**
 * Method indicator badge
 */
function MethodBadge({ method, isDark }: { method?: GenerationMethod; isDark: boolean }) {
  if (!method) return null

  const config = {
    nlp: { icon: Zap, label: 'NLP', color: 'text-blue-500' },
    llm: { icon: Sparkles, label: 'LLM', color: 'text-purple-500' },
    hybrid: { icon: Sparkles, label: 'Hybrid', color: 'text-emerald-500' },
  }[method]

  const Icon = config.icon

  return (
    <div
      className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-700' : 'bg-zinc-100'}`}
      title={`Generated using ${method.toUpperCase()} method`}
    >
      <Icon className={`w-3 h-3 ${config.color}`} />
      <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>{config.label}</span>
    </div>
  )
}

/**
 * Platform feature tooltip
 */
function PlatformTooltip({ isDark }: { isDark: boolean }) {
  const [show, setShow] = useState(false)
  const features = getPlatformFeatures()

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-700 text-zinc-500' : 'hover:bg-zinc-200 text-zinc-400'}`}
        title="Platform features"
      >
        <Info className="w-4 h-4" />
      </button>
      {show && (
        <div className={`absolute right-0 top-full mt-1 p-3 rounded-xl shadow-lg z-50 w-56 text-xs space-y-2 ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}`}>
          <div className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Platform Features</div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Local Processing</span>
              <span className={features.localProcessing ? 'text-emerald-500' : 'text-zinc-400'}>
                {features.localProcessing ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Offline Support</span>
              <span className={features.offlineSupport === 'full' ? 'text-emerald-500' : features.offlineSupport === 'limited' ? 'text-amber-500' : 'text-zinc-400'}>
                {features.offlineSupport}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>LLM Local</span>
              <span className={features.llmLocal ? 'text-emerald-500' : 'text-zinc-400'}>
                {features.llmLocal ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Recommended</span>
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
                {features.recommendedMethod.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GlossaryPanel({
  content,
  isDark = false,
  onJumpToSource,
  compact = false,
  strandSlug,
  editable = true,
  preloadedTerms,
}: GlossaryPanelProps) {
  const {
    terms: generatedTerms,
    generating,
    error,
    stats,
    settings,
    cacheStats,
    progress,
    generate,
    search: searchTerms,
    getByCategory,
    clear,
    clearCache,
  } = useGlossary({ minConfidence: 0.5, maxTerms: 50 })

  // Glossary edits for persistence
  const {
    edits,
    updateTerm,
    deleteTerm,
    deleteTermWithCreate,
    restoreTerm,
    mergeWithGenerated,
    hasEdit,
    isDeleted,
  } = useGlossaryEdits({ strandSlug, autoLoad: true })

  // Use preloaded terms if available, otherwise use generated terms
  const terms = preloadedTerms && preloadedTerms.length > 0 ? preloadedTerms : generatedTerms

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<GlossaryTerm['category'] | 'all'>('all')
  const [expandedTermId, setExpandedTermId] = useState<string | null>(null)
  const [showCacheInfo, setShowCacheInfo] = useState(false)

  // Create edit handlers for a term
  const createEditHandlers = useCallback((term: GlossaryTerm) => {
    const contentHash = generateTermHash(term.term)

    const onUpdateTerm = async (newTerm: string) => {
      await updateTerm(contentHash, {
        originalTerm: term.term,
        strandSlug,
        editedTerm: newTerm,
      })
    }

    const onUpdateDefinition = async (newDefinition: string) => {
      await updateTerm(contentHash, {
        originalTerm: term.term,
        strandSlug,
        editedDefinition: newDefinition,
      })
    }

    const onDelete = async () => {
      // Use deleteTermWithCreate to avoid stale closure issues
      // This creates the edit record and marks it deleted in one operation
      await deleteTermWithCreate(contentHash, term.term, strandSlug)
    }

    const onRestore = async () => {
      await restoreTerm(contentHash)
    }

    return {
      onUpdateTerm,
      onUpdateDefinition,
      onDelete,
      onRestore,
      isEdited: hasEdit(contentHash),
      isDeleted: isDeleted(contentHash),
    }
  }, [updateTerm, deleteTermWithCreate, restoreTerm, hasEdit, isDeleted, strandSlug])

  // Generate glossary when content changes
  useEffect(() => {
    if (content && content.length > 100 && terms.length === 0 && !generating) {
      generate(content)
    }
  }, [content, terms.length, generating, generate])

  // Filtered terms based on search and category, with edits applied
  const filteredTerms = useMemo(() => {
    // First apply edits to terms
    let result = mergeWithGenerated(terms)

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(t => t.category === selectedCategory)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.term.toLowerCase().includes(query) ||
        (t.definition && t.definition.toLowerCase().includes(query))
      )
    }

    return result
  }, [terms, selectedCategory, searchQuery, mergeWithGenerated])

  // Group by category for display
  const groupedTerms = useMemo(() => {
    if (selectedCategory !== 'all') return null

    const groups: Partial<Record<GlossaryTerm['category'], GlossaryTerm[]>> = {}
    for (const term of filteredTerms) {
      if (!groups[term.category]) groups[term.category] = []
      groups[term.category]!.push(term)
    }
    return groups
  }, [filteredTerms, selectedCategory])

  const handleRegenerate = (forceRegenerate = false) => {
    if (content) {
      clear()
      generate(content, forceRegenerate)
    }
  }

  const handleClearCache = async () => {
    await clearCache()
    setShowCacheInfo(false)
  }

  // Loading state - show progress indicator AND partial results (incremental generation)
  if (generating && terms.length === 0) {
    // No terms yet, show only progress
    const method = settings?.generationMethod || 'nlp'
    return (
      <GenerationProgress
        stage={progress.stage as GenerationStage}
        progress={progress.stageProgress}
        overallProgress={progress.overallProgress}
        itemsFound={progress.itemsFound}
        isDark={isDark}
        method={method}
        compact={compact}
      />
    )
  }

  // Error state
  if (error && !generating) {
    return (
      <div className={`p-6 rounded-xl text-center ${isDark ? 'bg-red-900/20 border border-red-900/50' : 'bg-red-50 border border-red-200'}`}>
        <Book className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
        <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>
          {error}
        </p>
        <button
          onClick={() => handleRegenerate(false)}
          className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 mx-auto ${isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'}`}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    )
  }

  // Empty state
  if (terms.length === 0 && !generating) {
    return (
      <div className={`p-8 rounded-2xl text-center space-y-4 ${isDark ? 'bg-zinc-800/30 border border-zinc-700/50' : 'bg-zinc-50 border border-zinc-200'}`}>
        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${isDark ? 'bg-emerald-900/40' : 'bg-emerald-100'}`}>
          <Book className={`w-8 h-8 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
        </div>
        <div>
          <p className={`text-base font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {content && content.length > 100 ? 'Ready to Generate Glossary' : 'No Content Available'}
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {content && content.length > 100
              ? 'Extract vocabulary and definitions from this strand'
              : 'Select a strand with content to generate a glossary'}
          </p>
        </div>
        {content && content.length > 100 && (
          <button
            onClick={() => generate(content)}
            className="px-8 py-3 rounded-xl text-base font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 mx-auto"
          >
            <Sparkles className="w-5 h-5" />
            Generate Glossary
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress indicator during incremental generation */}
      {generating && terms.length > 0 && (
        <GenerationProgress
          stage={progress.stage as GenerationStage}
          progress={progress.stageProgress}
          overallProgress={progress.overallProgress}
          itemsFound={progress.itemsFound}
          isDark={isDark}
          method={settings?.generationMethod || 'nlp'}
          compact={true}
        />
      )}

      {/* Header with stats */}
      {stats && !compact && !generating && (
        <div className={`p-3 rounded-xl space-y-2 ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Book className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {stats.total} terms
                </span>
              </div>
              <MethodBadge method={stats.method} isDark={isDark} />
              {stats.cached && (
                <div
                  className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-700' : 'bg-zinc-100'}`}
                  title="Loaded from cache"
                >
                  <Database className="w-3 h-3 text-cyan-500" />
                  <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Cached</span>
                </div>
              )}
              {stats.generationTimeMs !== undefined && (
                <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {stats.generationTimeMs}ms
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <PlatformTooltip isDark={isDark} />
              <div className="relative">
                <button
                  onClick={() => setShowCacheInfo(!showCacheInfo)}
                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-700 text-zinc-500' : 'hover:bg-zinc-200 text-zinc-400'}`}
                  title="Cache info"
                >
                  <Database className="w-4 h-4" />
                </button>
                {showCacheInfo && cacheStats && (
                  <div className={`absolute right-0 top-full mt-1 p-3 rounded-xl shadow-lg z-50 w-48 text-xs space-y-2 ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}`}>
                    <div className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Cache Stats</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Entries</span>
                        <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>{cacheStats.totalEntries}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Hit Rate</span>
                        <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>{Math.round(cacheStats.hitRate * 100)}%</span>
                      </div>
                    </div>
                    <button
                      onClick={handleClearCache}
                      className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${isDark ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'}`}
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear Cache
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRegenerate(false)}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}`}
                title="Regenerate (use cache)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleRegenerate(true)}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}`}
                title="Force regenerate (bypass cache)"
              >
                <Zap className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and filter */}
      <div className="flex gap-2">
        {/* Search */}
        <div className={`flex-1 flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'}`}>
          <Search className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search terms..."
            className={`flex-1 text-sm bg-transparent outline-none ${isDark ? 'text-zinc-200 placeholder:text-zinc-500' : 'text-zinc-800 placeholder:text-zinc-400'}`}
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as GlossaryTerm['category'] | 'all')}
            className={`
              appearance-none px-3 py-2.5 pr-8 min-h-[44px] rounded-xl border text-sm cursor-pointer touch-manipulation
              ${isDark
                ? 'bg-zinc-800/50 border-zinc-700 text-zinc-200'
                : 'bg-white border-zinc-200 text-zinc-800'
              }
            `}
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        </div>
      </div>

      {/* Terms list */}
      <div className="space-y-2">
        {selectedCategory === 'all' && groupedTerms ? (
          // Grouped view
          Object.entries(groupedTerms).map(([category, categoryTerms]) => {
            const config = CATEGORY_CONFIG[category as GlossaryTerm['category']]
            const Icon = config.icon

            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2 py-1">
                  <Icon className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {config.label}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}`}>
                    {categoryTerms.length}
                  </span>
                </div>
                <div className="space-y-1.5 pl-6">
                  {categoryTerms.map((term) => {
                    const editHandlers = editable ? createEditHandlers(term) : {}
                    return (
                      <TermCard
                        key={term.id}
                        term={term}
                        isDark={isDark}
                        onJumpToSource={onJumpToSource}
                        expanded={expandedTermId === term.id}
                        onToggle={() => setExpandedTermId(expandedTermId === term.id ? null : term.id)}
                        {...(editable ? editHandlers : {})}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })
        ) : (
          // Flat list with virtual scrolling for large lists
          <VirtualList
            items={filteredTerms}
            getKey={(term) => term.id}
            estimatedItemHeight={72}
            overscan={3}
            gap={6}
            maxHeight={compact ? 300 : 500}
            renderItem={(term) => {
              const editHandlers = editable ? createEditHandlers(term) : {}
              return (
                <TermCard
                  term={term}
                  isDark={isDark}
                  onJumpToSource={onJumpToSource}
                  expanded={expandedTermId === term.id}
                  onToggle={() => setExpandedTermId(expandedTermId === term.id ? null : term.id)}
                  {...(editable ? editHandlers : {})}
                />
              )
            }}
          />
        )}

        {filteredTerms.length === 0 && searchQuery && (
          <div className={`p-4 text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            No terms found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  )
}
