/**
 * Block Tags Sidebar Panel
 * @module codex/ui/BlockTagsSidebarPanel
 *
 * Side panel showing block-level tags for the current strand.
 * Displays accepted tags, suggested tags with accept/reject actions,
 * worthiness scores, and metadata.
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Tag,
  Sparkles,
  Check,
  XCircle,
  ChevronDown,
  ChevronRight,
  Info,
  Filter,
  Hash,
  FileText,
  Code,
  List,
  Quote,
  Clock,
  ExternalLink,
  Loader2,
  Save,
  CloudUpload,
  Star,
} from 'lucide-react'
import type { StrandBlock, MarkdownBlockType, SuggestedTag } from '@/lib/blockDatabase'
import type { InlineTag } from '@/lib/markdown/inlineTagExtractor'
import { ReflectionRating } from '@/components/quarry/ui/reflect/ReflectionRating'

// ============================================================================
// TYPES
// ============================================================================

interface BlockTagsSidebarPanelProps {
  /** Whether panel is open */
  isOpen: boolean
  /** Close panel callback */
  onClose: () => void
  /** Blocks with tags for the current strand */
  blocks: StrandBlock[]
  /** Inline tags extracted client-side from markdown (immediate, no network) */
  inlineTags?: InlineTag[]
  /** Accept a suggested tag */
  onAcceptTag: (blockId: string, tag: string) => Promise<void>
  /** Reject a suggested tag */
  onRejectTag: (blockId: string, tag: string) => Promise<void>
  /** Navigate to a block in the document */
  onNavigateToBlock?: (blockId: string) => void
  /** Filter blocks by tag */
  onFilterByTag?: (tag: string) => void
  /** Loading state */
  isLoading?: boolean
  /** Current strand path */
  strandPath?: string
  /** Trigger block tagging for this strand */
  onRunTagging?: () => Promise<void>
  /** Whether block tagging job is currently running */
  isTaggingRunning?: boolean
  /** Save draft callback (local save) */
  onSaveDraft?: () => Promise<void>
  /** Publish callback (sync to GitHub) */
  onPublish?: () => Promise<void>
  /** Whether there are unsaved tag changes */
  hasUnsavedChanges?: boolean
  /** Whether save/publish is in progress */
  isSaving?: boolean
  /** Strand ID for ratings */
  strandId?: string
  /** Strand content for AI rating generation */
  strandContent?: string
  /** Strand title for AI rating */
  strandTitle?: string
}

// ============================================================================
// HELPERS
// ============================================================================

const BLOCK_TYPE_ICONS: Record<MarkdownBlockType, React.ElementType> = {
  heading: Hash,
  paragraph: FileText,
  code: Code,
  list: List,
  blockquote: Quote,
  table: FileText,
  html: Code,
}

const BLOCK_TYPE_LABELS: Record<MarkdownBlockType, string> = {
  heading: 'Heading',
  paragraph: 'Paragraph',
  code: 'Code',
  list: 'List',
  blockquote: 'Quote',
  table: 'Table',
  html: 'HTML',
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getWorthinessColor(score: number): string {
  if (score >= 0.7) return 'text-emerald-500'
  if (score >= 0.5) return 'text-amber-500'
  return 'text-zinc-400'
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-emerald-500/20 text-emerald-400'
  if (confidence >= 0.6) return 'bg-amber-500/20 text-amber-400'
  return 'bg-zinc-500/20 text-zinc-400'
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface BlockItemProps {
  block: StrandBlock
  isExpanded: boolean
  onToggle: () => void
  onAcceptTag: (tag: string) => void
  onRejectTag: (tag: string) => void
  onNavigate?: () => void
}

function BlockItem({
  block,
  isExpanded,
  onToggle,
  onAcceptTag,
  onRejectTag,
  onNavigate,
}: BlockItemProps) {
  const Icon = BLOCK_TYPE_ICONS[block.blockType] || FileText
  const hasAcceptedTags = (block.tags?.length ?? 0) > 0
  const hasSuggestedTags = (block.suggestedTags?.length ?? 0) > 0
  const hasTags = hasAcceptedTags || hasSuggestedTags

  return (
    <div className="border-b border-zinc-800 last:border-b-0">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 transition-colors text-left"
      >
        <span className="text-zinc-500">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
        <Icon className="w-4 h-4 text-zinc-400" />
        <span className="flex-1 text-sm text-zinc-200 truncate">
          {block.blockType === 'heading'
            ? block.extractiveSummary?.slice(0, 50) || `H${block.headingLevel}`
            : block.extractiveSummary?.slice(0, 40) || `Line ${block.startLine}`}
        </span>
        {hasTags && (
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3 text-zinc-500" />
            <span className="text-xs text-zinc-500">
              {(block.tags?.length ?? 0) + (block.suggestedTags?.length ?? 0)}
            </span>
          </span>
        )}
        <span
          className={`text-xs font-mono ${getWorthinessColor(block.worthinessScore)}`}
          title={`Worthiness: ${(block.worthinessScore * 100).toFixed(0)}%`}
        >
          {(block.worthinessScore * 100).toFixed(0)}%
        </span>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Preview */}
              {block.extractiveSummary && (
                <div className="text-xs text-zinc-400 italic line-clamp-2 pl-6">
                  "{block.extractiveSummary}"
                </div>
              )}

              {/* Accepted Tags */}
              {hasAcceptedTags && (
                <div className="pl-6">
                  <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Accepted Tags
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(block.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Tags */}
              {hasSuggestedTags && (
                <div className="pl-6">
                  <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Suggested Tags
                  </div>
                  <div className="space-y-1">
                    {(block.suggestedTags ?? []).map((suggestion) => (
                      <SuggestedTagItem
                        key={suggestion.tag}
                        suggestion={suggestion}
                        onAccept={() => onAcceptTag(suggestion.tag)}
                        onReject={() => onRejectTag(suggestion.tag)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pl-6 space-y-1">
                <div className="text-xs text-zinc-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Metadata
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-zinc-400">
                    <span className="text-zinc-500">Type:</span>
                    {BLOCK_TYPE_LABELS[block.blockType]}
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400">
                    <span className="text-zinc-500">Lines:</span>
                    {block.startLine}-{block.endLine}
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {formatTimestamp(block.updatedAt)}
                  </div>
                  {block.sourceFile && (
                    <div
                      className="flex items-center gap-1 text-zinc-400 truncate"
                      title={block.sourceFile}
                    >
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                      {block.sourceFile.split('/').pop()}
                    </div>
                  )}
                </div>

                {/* Worthiness Signals */}
                <div className="pt-1">
                  <div className="text-xs text-zinc-500 mb-1">Worthiness Signals</div>
                  <div className="flex gap-2 text-xs">
                    <span
                      className="text-zinc-400"
                      title="Topic shift from document theme"
                    >
                      Topic: {(block.worthinessSignals.topicShift * 100).toFixed(0)}%
                    </span>
                    <span
                      className="text-zinc-400"
                      title="Entity density (tech concepts per word)"
                    >
                      Entities: {(block.worthinessSignals.entityDensity * 100).toFixed(0)}%
                    </span>
                    <span
                      className="text-zinc-400"
                      title="Semantic novelty compared to surrounding blocks"
                    >
                      Novelty: {(block.worthinessSignals.semanticNovelty * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {onNavigate && (
                <button
                  onClick={onNavigate}
                  className="ml-6 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Jump to block
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface SuggestedTagItemProps {
  suggestion: SuggestedTag
  onAccept: () => void
  onReject: () => void
}

function SuggestedTagItem({ suggestion, onAccept, onReject }: SuggestedTagItemProps) {
  const [showReasoning, setShowReasoning] = useState(false)

  return (
    <div className="flex items-center gap-1">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${getConfidenceColor(suggestion.confidence)}`}
      >
        {suggestion.tag}
        <span className="ml-1 opacity-70">
          {(suggestion.confidence * 100).toFixed(0)}%
        </span>
      </span>
      <span className="text-xs text-zinc-500 uppercase">{suggestion.source}</span>
      <button
        onClick={onAccept}
        className="p-0.5 hover:bg-emerald-500/20 rounded transition-colors"
        title="Accept tag"
      >
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      </button>
      <button
        onClick={onReject}
        className="p-0.5 hover:bg-red-500/20 rounded transition-colors"
        title="Reject tag"
      >
        <XCircle className="w-3.5 h-3.5 text-red-400" />
      </button>
      {suggestion.reasoning && (
        <button
          onClick={() => setShowReasoning(!showReasoning)}
          className="p-0.5 hover:bg-zinc-700 rounded transition-colors"
          title="Show reasoning"
        >
          <Info className="w-3.5 h-3.5 text-zinc-500" />
        </button>
      )}
      {showReasoning && suggestion.reasoning && (
        <div className="absolute mt-6 p-2 bg-zinc-800 rounded shadow-lg text-xs text-zinc-300 max-w-xs z-10">
          {suggestion.reasoning}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BlockTagsSidebarPanel({
  isOpen,
  onClose,
  blocks,
  inlineTags = [],
  onAcceptTag,
  onRejectTag,
  onNavigateToBlock,
  onFilterByTag,
  isLoading = false,
  strandPath,
  onRunTagging,
  isTaggingRunning = false,
  onSaveDraft,
  onPublish,
  hasUnsavedChanges = false,
  isSaving = false,
  strandId,
  strandContent,
  strandTitle,
}: BlockTagsSidebarPanelProps) {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<MarkdownBlockType | 'all'>('all')
  const [showOnlyWithTags, setShowOnlyWithTags] = useState(false)

  // Filter blocks
  const filteredBlocks = useMemo(() => {
    let result = blocks ?? []

    if (filterType !== 'all') {
      result = result.filter((b) => b.blockType === filterType)
    }

    if (showOnlyWithTags) {
      result = result.filter(
        (b) => (b.tags?.length ?? 0) > 0 || (b.suggestedTags?.length ?? 0) > 0
      )
    }

    return result
  }, [blocks, filterType, showOnlyWithTags])

  // Statistics
  const stats = useMemo(() => {
    const safeBlocks = blocks ?? []
    const totalBlocks = safeBlocks.length
    const taggedBlocks = safeBlocks.filter((b) => (b.tags?.length ?? 0) > 0).length
    const pendingSuggestions = safeBlocks.reduce(
      (sum, b) => sum + (b.suggestedTags?.length ?? 0),
      0
    )
    const worthyBlocks = safeBlocks.filter((b) => b.worthinessScore >= 0.5).length

    return { totalBlocks, taggedBlocks, pendingSuggestions, worthyBlocks }
  }, [blocks])

  const toggleBlock = useCallback((blockId: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev)
      if (next.has(blockId)) {
        next.delete(blockId)
      } else {
        next.add(blockId)
      }
      return next
    })
  }, [])

  const handleAcceptTag = useCallback(
    async (blockId: string, tag: string) => {
      await onAcceptTag(blockId, tag)
    },
    [onAcceptTag]
  )

  const handleRejectTag = useCallback(
    async (blockId: string, tag: string) => {
      await onRejectTag(blockId, tag)
    },
    [onRejectTag]
  )

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed right-0 top-16 bottom-0 w-80 bg-zinc-900 border-l border-zinc-800 shadow-xl z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-400" />
              <h2 className="font-semibold text-zinc-100">Block Tags</h2>
              {/* Source legend tooltip */}
              <div className="relative group">
                <Info className="w-4 h-4 text-zinc-500 hover:text-zinc-300 cursor-help" />
                <div className="absolute left-0 top-6 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <p className="text-xs font-medium text-zinc-300 mb-2">Tag Sources</p>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">inline</span>
                      <span className="text-zinc-400">Explicit #hashtag (100%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">llm</span>
                      <span className="text-zinc-400">AI-suggested with reasoning</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">nlp</span>
                      <span className="text-zinc-400">Vocabulary/TF-IDF extraction</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">existing</span>
                      <span className="text-zinc-400">Propagated from document</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onRunTagging && (
                <button
                  onClick={onRunTagging}
                  disabled={isTaggingRunning}
                  className={`
                    p-1.5 rounded transition-colors
                    ${isTaggingRunning
                      ? 'bg-cyan-900/50 cursor-not-allowed'
                      : 'hover:bg-cyan-900/50 hover:text-cyan-400'
                    }
                  `}
                  title={isTaggingRunning ? 'Tagging in progress...' : 'Run Block Tagging'}
                >
                  {isTaggingRunning ? (
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 hover:bg-zinc-800 rounded transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Save/Publish Bar - appears when there are unsaved changes */}
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30">
              <span className="text-xs text-amber-400 flex-1">Unsaved changes</span>
              {onSaveDraft && (
                <button
                  onClick={onSaveDraft}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  Save Draft
                </button>
              )}
              {onPublish && (
                <button
                  onClick={onPublish}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CloudUpload className="w-3 h-3" />
                  )}
                  Publish
                </button>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-800">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-lg font-semibold text-zinc-200">
                  {stats.totalBlocks}
                </div>
                <div className="text-xs text-zinc-500">Blocks</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-emerald-400">
                  {stats.taggedBlocks}
                </div>
                <div className="text-xs text-zinc-500">Tagged</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-amber-400">
                  {stats.pendingSuggestions}
                </div>
                <div className="text-xs text-zinc-500">Pending</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-400">
                  {stats.worthyBlocks}
                </div>
                <div className="text-xs text-zinc-500">Worthy</div>
              </div>
            </div>
          </div>

          {/* Strand Rating */}
          {strandId && strandPath && (
            <div className="px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-zinc-300">Strand Rating</span>
              </div>
              <ReflectionRating
                strandId={strandId}
                strandPath={strandPath}
                strandContent={strandContent}
                strandTitle={strandTitle}
                isDark={true}
                compact={true}
                showAIRating={true}
              />
            </div>
          )}

          {/* Filters */}
          <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as MarkdownBlockType | 'all')
              }
              className="flex-1 text-sm bg-zinc-800 text-zinc-200 rounded px-2 py-1 border border-zinc-700"
            >
              <option value="all">All Types</option>
              <option value="heading">Headings</option>
              <option value="paragraph">Paragraphs</option>
              <option value="code">Code</option>
              <option value="list">Lists</option>
              <option value="blockquote">Quotes</option>
            </select>
            <label className="flex items-center gap-1 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={showOnlyWithTags}
                onChange={(e) => setShowOnlyWithTags(e.target.checked)}
                className="rounded bg-zinc-800 border-zinc-600"
              />
              Has tags
            </label>
          </div>

          {/* Inline Tags Section (always visible if we have inline tags) */}
          {inlineTags.length > 0 && (
            <div className="px-4 py-3 border-b border-zinc-800 bg-blue-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">
                  Inline Tags ({inlineTags.length})
                </span>
                <span className="text-[10px] text-zinc-500">extracted from content</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {inlineTags.map((tag) => (
                  <span
                    key={tag.tag}
                    className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  >
                    #{tag.tag}
                    {tag.lineNumber && (
                      <span className="ml-1 text-blue-500/60 text-[10px]">L{tag.lineNumber}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Block List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
              </div>
            ) : filteredBlocks.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm">
                {blocks.length === 0 && inlineTags.length === 0
                  ? 'No blocks or inline tags found for this strand.'
                  : blocks.length === 0
                    ? 'No pre-computed blocks available. Inline tags shown above.'
                    : 'No blocks match the current filters.'}
              </div>
            ) : (
              filteredBlocks.map((block) => (
                <BlockItem
                  key={block.id}
                  block={block}
                  isExpanded={expandedBlocks.has(block.id)}
                  onToggle={() => toggleBlock(block.id)}
                  onAcceptTag={(tag) => handleAcceptTag(block.blockId, tag)}
                  onRejectTag={(tag) => handleRejectTag(block.blockId, tag)}
                  onNavigate={
                    onNavigateToBlock
                      ? () => onNavigateToBlock(block.blockId)
                      : undefined
                  }
                />
              ))
            )}
          </div>

          {/* Footer */}
          {strandPath && (
            <div className="px-4 py-2 border-t border-zinc-800 text-xs text-zinc-500 truncate">
              {strandPath}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
