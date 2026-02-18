/**
 * Reader Mode Panel - Side-by-side summaries for strands
 * @module codex/ui/ReaderModePanel
 *
 * @description
 * Shows live extractive and abstractive summaries side-by-side with the content.
 * Supports both paragraph-by-paragraph and block-by-block summaries.
 * Summaries scroll in sync with the main content.
 *
 * @features
 * - Paragraph-level extractive summaries
 * - Block-level summaries (headings, code, lists)
 * - Real-time scroll sync
 * - Toggle between extractive/abstractive
 * - Illustrations display per block
 * - Mobile responsive
 *
 * @note Using class component wrapper to avoid React #311 hook errors in dynamic imports
 */

'use client'

// Build timestamp: 2025-12-16T02:00:00Z - typed require() v9
// Class component wrapper to avoid webpack optimizing hooks to framer-motion chunk
import React, { Component, useState as useStateType, useEffect as useEffectType, useMemo as useMemoType, useRef as useRefType, useCallback as useCallbackType } from 'react'

// Force runtime require to prevent webpack from optimizing hooks through framer-motion
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReactRuntime = typeof window !== 'undefined' ? require('react') : React
const useState = ReactRuntime.useState as typeof useStateType
const useEffect = ReactRuntime.useEffect as typeof useEffectType
const useMemo = ReactRuntime.useMemo as typeof useMemoType
const useRef = ReactRuntime.useRef as typeof useRefType
const useCallback = ReactRuntime.useCallback as typeof useCallbackType

// framer-motion removed to fix React #311 hydration errors - using CSS animations instead
import {
  BookOpen,
  FileText,
  Sparkles,
  Eye,
  EyeOff,
  Hash,
  Code,
  List,
  Quote,
  Table2,
  Image as ImageIcon,
  Layers,
  SplitSquareVertical,
  StickyNote,
  LayoutList,
  Settings2,
  GalleryHorizontal,
  GalleryVertical,
  ZoomIn,
  Grip,
  Wand2,
  Tag,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { generateBlockSummaries, type BlockSummaryResult } from '@/lib/nlp'
import type { StrandMetadata, StrandIllustration, BlockSummary } from '../../types'
// useDeviceInfo disabled - passed as props from parent to avoid React #311
// import { useDeviceInfo } from '../../hooks/useMediaQuery'
// Lightbox disabled - even minimal hooks cause React #311 due to webpack bundling
// import NativeDialogLightbox from './NativeDialogLightbox'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Device info passed from parent to avoid React #311 hook issues */
interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isSmallScreen: boolean
  isLargeScreen: boolean
  isLandscape: boolean
  isPortrait: boolean
  isTouch: boolean
}

/** Block tag data for inline display */
export interface BlockTagData {
  blockId: string
  tags: string[]
  suggestedTags?: Array<{ tag: string; confidence: number; source?: string }>
  worthinessScore?: number
}

export interface ReaderModePanelProps {
  /** Markdown content to analyze */
  content: string
  /** Strand metadata (may include pre-computed summaries from indexing) */
  metadata: StrandMetadata
  /** Reference to the content container for scroll observation */
  contentRef?: React.RefObject<HTMLElement>
  /** Callback when clicking a block to navigate */
  onBlockClick?: (blockId: string, startLine: number) => void
  /** Theme */
  theme?: string
  /** Panel size */
  panelSize?: 's' | 'm' | 'l'
  /** Active heading slug from scroll position (for sync with OutlineTableOfContents) */
  activeHeadingSlug?: string
  /** Device info from parent - passed as props to avoid React #311 */
  deviceInfo?: DeviceInfo
  /** Block-level tags for inline display */
  blockTags?: BlockTagData[]
  /** Accept a suggested tag on a block */
  onAcceptBlockTag?: (blockId: string, tag: string) => void
  /** Reject a suggested tag on a block */
  onRejectBlockTag?: (blockId: string, tag: string) => void
  /** Callback when a tag is clicked */
  onTagClick?: (tagName: string, blockId?: string) => void
}

type SummaryMode = 'extractive' | 'abstractive' | 'both' | 'summaries-only'
type ViewMode = 'paragraph' | 'block' | 'all'
type IllustrationLayout = 'side-by-side' | 'vertical' | 'floating' | 'thumbnail-strip' | 'hidden'

/* ═══════════════════════════════════════════════════════════════════════════
   HEADING SLUG HELPER
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate a URL-friendly slug from heading text
 * Must match the slug generation in useActiveHeading.ts for sync to work
 */
function generateHeadingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/* ═══════════════════════════════════════════════════════════════════════════
   ILLUSTRATION HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get smart sizing classes based on image aspect ratio
 */
function getIllustrationSizeClasses(illustration: StrandIllustration, layout: IllustrationLayout) {
  // Default to square if no dimensions provided
  const width = illustration.width ? parseInt(illustration.width) : 1024
  const height = 1024 // Assume square for AI-generated images
  const aspectRatio = width / height

  const isPortrait = aspectRatio < 0.9
  const isWide = aspectRatio > 1.3

  if (layout === 'side-by-side') {
    return {
      container: 'w-1/3 flex-shrink-0',
      aspect: isPortrait ? 'aspect-[3/4]' : isWide ? 'aspect-[4/3]' : 'aspect-square',
    }
  }

  if (layout === 'floating') {
    return {
      container: 'w-14 h-14',
      aspect: '',
    }
  }

  // Vertical layout - full width with smart aspect
  return {
    container: isPortrait ? 'w-2/3 mx-auto' : 'w-full',
    aspect: isPortrait ? 'aspect-[3/4]' : isWide ? 'aspect-[16/9]' : 'aspect-video',
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   BLOCK TYPE ICONS
═══════════════════════════════════════════════════════════════════════════ */

const BLOCK_ICONS: Record<string, React.ElementType> = {
  paragraph: FileText,
  heading: Hash,
  code: Code,
  list: List,
  blockquote: Quote,
  table: Table2,
}

const BLOCK_COLORS: Record<string, string> = {
  paragraph: 'text-zinc-500',
  heading: 'text-violet-500',
  code: 'text-emerald-500',
  list: 'text-amber-500',
  blockquote: 'text-cyan-500',
  table: 'text-blue-500',
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Expandable block tags section with accepted and suggested tags
 */
function BlockTagsSection({
  blockId,
  blockTagData,
  textSizeClasses,
  theme = 'light',
  onAcceptTag,
  onRejectTag,
  onTagClick,
}: {
  blockId: string
  blockTagData?: BlockTagData
  textSizeClasses: { base: string; sm: string; xs: string }
  theme?: string
  onAcceptTag?: (blockId: string, tag: string) => void
  onRejectTag?: (blockId: string, tag: string) => void
  onTagClick?: (tagName: string, blockId?: string) => void
}) {
  // Track expanded state locally (not using hooks due to React #311)
  const [isExpanded, setIsExpanded] = useState(false)
  
  const isDark = theme?.includes('dark')
  const hasTags = blockTagData && blockTagData.tags && blockTagData.tags.length > 0
  const hasSuggestions = blockTagData && blockTagData.suggestedTags && blockTagData.suggestedTags.length > 0
  const hasWorthiness = blockTagData && typeof blockTagData.worthinessScore === 'number'
  
  // If no tag data at all, don't render anything
  if (!blockTagData || (!hasTags && !hasSuggestions)) {
    return null
  }
  
  return (
    <div 
      className="mt-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with tag count and expand toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-between gap-2 
          ${textSizeClasses.xs} font-medium
          ${isDark ? 'text-teal-400' : 'text-teal-600'}
          hover:opacity-80 transition-opacity
        `}
      >
        <div className="flex items-center gap-1.5">
          <Tag className="w-3 h-3" />
          <span>
            Block Tags
            {hasTags && ` (${blockTagData.tags.length})`}
            {hasSuggestions && (
              <span className={isDark ? 'text-amber-400' : 'text-amber-600'}>
                {' '}+ {blockTagData.suggestedTags!.length} pending
              </span>
            )}
          </span>
        </div>
        {(hasSuggestions || hasWorthiness) && (
          isExpanded 
            ? <ChevronUp className="w-3 h-3" /> 
            : <ChevronDown className="w-3 h-3" />
        )}
      </button>
      
      {/* Accepted tags - always visible */}
      {hasTags && (
        <div 
          className="flex flex-wrap gap-1 mt-1.5"
          role="list"
          aria-label="Accepted block tags"
        >
          {blockTagData.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag, blockId)}
              role="listitem"
              className={`
                inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full
                ${textSizeClasses.xs} font-medium
                bg-teal-100/70 dark:bg-teal-900/40 
                text-teal-700 dark:text-teal-300
                border border-teal-200/50 dark:border-teal-700/50
                transition-colors hover:bg-teal-200/70 dark:hover:bg-teal-800/50
              `}
              title={`Block tag: ${tag}`}
              aria-label={`Block tag: ${tag}`}
            >
              <Tag className="w-2.5 h-2.5" aria-hidden="true" />
              {tag}
            </button>
          ))}
        </div>
      )}
      
      {/* Expanded section - suggestions and worthiness */}
      {isExpanded && (hasSuggestions || hasWorthiness) && (
        <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Worthiness score */}
          {hasWorthiness && (
            <div className={`flex items-center gap-2 ${textSizeClasses.xs}`}>
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Worthiness:</span>
              <div className="flex-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className={`h-full rounded-full transition-all ${
                    blockTagData.worthinessScore! >= 0.7 ? 'bg-emerald-500' :
                    blockTagData.worthinessScore! >= 0.5 ? 'bg-amber-500' :
                    'bg-zinc-400'
                  }`}
                  style={{ width: `${blockTagData.worthinessScore! * 100}%` }}
                />
              </div>
              <span className={`font-medium ${
                blockTagData.worthinessScore! >= 0.7 ? 'text-emerald-600 dark:text-emerald-400' :
                blockTagData.worthinessScore! >= 0.5 ? 'text-amber-600 dark:text-amber-400' :
                'text-zinc-500'
              }`}>
                {Math.round(blockTagData.worthinessScore! * 100)}%
              </span>
            </div>
          )}
          
          {/* Suggested tags */}
          {hasSuggestions && (
            <div>
              <p className={`${textSizeClasses.xs} text-amber-600 dark:text-amber-400 font-medium mb-1`}>
                Suggestions:
              </p>
              <div className="flex flex-wrap gap-1">
                {blockTagData.suggestedTags!.map((st) => (
                  <span
                    key={st.tag}
                    className={`
                      inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full
                      ${textSizeClasses.xs} font-medium
                      bg-amber-100/70 dark:bg-amber-900/30 
                      text-amber-700 dark:text-amber-300
                      border border-amber-200/50 dark:border-amber-700/50
                    `}
                  >
                    <span className="opacity-60 mr-0.5">{Math.round(st.confidence * 100)}%</span>
                    <button
                      onClick={() => onTagClick?.(st.tag, blockId)}
                      className="hover:underline"
                    >
                      {st.tag}
                    </button>
                    {onAcceptTag && (
                      <button
                        onClick={() => onAcceptTag(blockId, st.tag)}
                        className="ml-0.5 p-0.5 rounded hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-600 dark:text-emerald-400 transition-colors"
                        title="Accept"
                      >
                        <Check className="w-2.5 h-2.5" />
                      </button>
                    )}
                    {onRejectTag && (
                      <button
                        onClick={() => onRejectTag(blockId, st.tag)}
                        className="p-0.5 rounded hover:bg-red-200 dark:hover:bg-red-900 text-red-600 dark:text-red-400 transition-colors"
                        title="Reject"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Single block summary item with notes support and inline tags
 */
function BlockSummaryItem({
  summary,
  illustration,
  abstractive,
  isActive,
  onClick,
  panelSize,
  showAbstractive,
  notes,
  onAddNote,
  illustrationLayout = 'vertical',
  summaryOnlyMode = false,
  onImageClick,
  theme = 'light',
  blockTagData,
  onAcceptTag,
  onRejectTag,
  onTagClick,
}: {
  summary: BlockSummaryResult
  illustration?: StrandIllustration
  abstractive?: string
  isActive: boolean
  onClick: () => void
  panelSize: 's' | 'm' | 'l'
  showAbstractive: boolean
  notes?: string[]
  onAddNote?: (blockId: string, note: string) => void
  illustrationLayout?: IllustrationLayout
  summaryOnlyMode?: boolean
  onImageClick?: (illustration: StrandIllustration) => void
  theme?: string
  /** Full block tag data including suggestions */
  blockTagData?: BlockTagData
  /** Accept a suggested tag */
  onAcceptTag?: (blockId: string, tag: string) => void
  /** Reject a suggested tag */
  onRejectTag?: (blockId: string, tag: string) => void
  /** Callback when a tag is clicked */
  onTagClick?: (tagName: string, blockId?: string) => void
}) {
  // State disabled to fix React #311 - webpack bundles hooks through framer-motion
  const showNoteInput = false
  const noteText = ''
  const isHoveringImage = false
  const setShowNoteInput = (_: boolean) => {}
  const setNoteText = (_: string) => {}
  const setIsHoveringImage = (_: boolean) => {}

  // Smart sizing for illustrations
  const sizeClasses = illustration ? getIllustrationSizeClasses(illustration, illustrationLayout) : null

  // Theme-aware frame classes
  const isSepia = theme?.includes('sepia')
  const isTerminal = theme?.includes('terminal')
  const frameClasses = isSepia
    ? 'border-2 border-amber-300/50 shadow-[inset_0_0_10px_rgba(0,0,0,0.1),2px_2px_4px_rgba(0,0,0,0.2)] p-0.5 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-950/30'
    : isTerminal
      ? 'border border-current shadow-[0_0_8px_currentColor] saturate-[0.8] contrast-[1.1]'
      : 'border border-zinc-200 dark:border-zinc-700 shadow-sm'
  
  const Icon = BLOCK_ICONS[summary.blockType] || FileText
  const colorClass = BLOCK_COLORS[summary.blockType] || 'text-zinc-500'
  
  const textSizeClasses = {
    base: panelSize === 'l' ? 'text-[12px]' : panelSize === 'm' ? 'text-[11px]' : 'text-[10px]',
    sm: panelSize === 'l' ? 'text-[11px]' : panelSize === 'm' ? 'text-[10px]' : 'text-[9px]',
    xs: panelSize === 'l' ? 'text-[10px]' : panelSize === 'm' ? 'text-[9px]' : 'text-[8px]',
  }

  // handleAddNote disabled - state removed to fix React #311
  const handleAddNote = () => {}

  return (
    <div
      className={`
        group relative p-2 rounded-lg border transition-all duration-200 cursor-pointer
        animate-in fade-in slide-in-from-right-2
        ${isActive
          ? 'border-cyan-400 dark:border-cyan-600 bg-cyan-50/50 dark:bg-cyan-950/30 shadow-md ring-2 ring-cyan-400/30 dark:ring-cyan-500/20'
          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
        }
      `}
      onClick={onClick}
    >
      {/* Active indicator dot */}
      {isActive && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
      )}
      
      {/* Minimal separator with metadata */}
      <div className="flex items-center gap-2 mb-1 -mx-2 px-2 py-0.5 border-b border-zinc-200/60 dark:border-zinc-700/60">
        <Icon className={`w-2.5 h-2.5 ${colorClass} opacity-60`} />
        <div className="h-px flex-1 bg-gradient-to-r from-zinc-300/40 via-zinc-300/20 to-transparent dark:from-zinc-600/40 dark:via-zinc-600/20 dark:to-transparent" />
        <span className={`${textSizeClasses.xs} text-zinc-400 dark:text-zinc-500 font-mono`}>
          L{summary.startLine}{summary.endLine !== summary.startLine && `-${summary.endLine}`}
        </span>
      </div>
      
      {/* Extractive summary */}
      <p className={`${textSizeClasses.base} text-zinc-700 dark:text-zinc-300 leading-relaxed`}>
        {summary.extractive}
      </p>
      
      {/* Block-level tags - expandable section */}
      <BlockTagsSection
        blockId={summary.blockId}
        blockTagData={blockTagData}
        textSizeClasses={textSizeClasses}
        theme={theme}
        onAcceptTag={onAcceptTag}
        onRejectTag={onRejectTag}
        onTagClick={onTagClick}
      />
      
      {/* Abstractive summary (if available and enabled) */}
      {showAbstractive && abstractive && (
        <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className={`${textSizeClasses.xs} text-amber-600 dark:text-amber-400 font-medium`}>
              AI Summary
            </span>
          </div>
          <p className={`${textSizeClasses.sm} text-zinc-600 dark:text-zinc-400 italic`}>
            {abstractive}
          </p>
        </div>
      )}
      
      {/* User notes */}
      {notes && notes.length > 0 && (
        <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/50">
          <div className="flex items-center gap-1 mb-1">
            <StickyNote className="w-3 h-3 text-amber-500" />
            <span className={`${textSizeClasses.xs} text-amber-600 dark:text-amber-400 font-medium`}>
              Notes ({notes.length})
            </span>
          </div>
          <div className="space-y-1">
            {notes.map((note, i) => (
              <p key={i} className={`${textSizeClasses.sm} text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded`}>
                {note}
              </p>
            ))}
          </div>
        </div>
      )}
      
      {/* Note input */}
      {showNoteInput && (
        <div
          className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 animate-in fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note..."
            className={`w-full ${textSizeClasses.sm} p-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400`}
            rows={2}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={() => {
                setShowNoteInput(false)
                setNoteText('')
              }}
              className={`${textSizeClasses.xs} px-2 py-1 rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700`}
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              disabled={!noteText.trim()}
              className={`${textSizeClasses.xs} px-2 py-1 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Save
            </button>
          </div>
        </div>
      )}
      
      {/* Illustration preview - with layout options */}
      {illustration && illustrationLayout !== 'hidden' && illustrationLayout !== 'thumbnail-strip' && !summaryOnlyMode && (
        <div className={`
          mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700
          ${illustrationLayout === 'side-by-side' ? 'flex gap-2 items-start' : ''}
          ${illustrationLayout === 'floating' ? 'relative' : ''}
        `}>
          {/* Vertical layout header */}
          {illustrationLayout === 'vertical' && (
            <div className="flex items-center gap-1 mb-1">
              <ImageIcon className="w-3 h-3 text-rose-500" />
              <span className={`${textSizeClasses.xs} text-rose-600 dark:text-rose-400 font-medium`}>
                Illustration
              </span>
              {illustration.aiGenerated && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-[8px] font-bold text-white shadow-sm flex items-center gap-0.5">
                  <Wand2 className="w-2 h-2" />
                  AI
                </span>
              )}
            </div>
          )}

          {/* Floating layout - thumbnail that expands on hover */}
          {illustrationLayout === 'floating' ? (
            <div
              className="absolute -right-1 top-0 z-10"
              onMouseEnter={() => setIsHoveringImage(true)}
              onMouseLeave={() => setIsHoveringImage(false)}
            >
              <div
                className={`
                  rounded-lg overflow-hidden cursor-zoom-in transition-all duration-200
                  ${frameClasses}
                  ${isHoveringImage ? 'ring-2 ring-cyan-400 shadow-lg w-40 h-40' : 'w-14 h-14'}
                `}
                onClick={(e) => {
                  e.stopPropagation()
                  onImageClick?.(illustration)
                }}
              >
                <img
                  src={illustration.src}
                  alt={illustration.alt || 'Block illustration'}
                  className="w-full h-full object-cover"
                />
                {/* AI badge overlay */}
                {illustration.aiGenerated && (
                  <div className="absolute top-0.5 right-0.5 px-1 py-0.5 rounded-full bg-gradient-to-r from-violet-500/90 to-pink-500/90 text-[6px] font-bold text-white">
                    AI
                  </div>
                )}
                {/* Zoom indicator on hover */}
                {isHoveringImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <ZoomIn className="w-6 h-6 text-white drop-shadow-lg" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Standard layouts (vertical, side-by-side) */
            <div
              className={`
                relative rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-zoom-in
                ${frameClasses}
                ${sizeClasses?.container || 'w-full'}
                ${sizeClasses?.aspect || 'aspect-video'}
                group
              `}
              onClick={(e) => {
                e.stopPropagation()
                onImageClick?.(illustration)
              }}
            >
              <img
                src={illustration.src}
                alt={illustration.alt || 'Block illustration'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* AI-generated badge */}
              {illustration.aiGenerated && illustrationLayout !== 'vertical' && (
                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500/90 to-pink-500/90 text-[8px] font-bold text-white shadow-sm flex items-center gap-0.5">
                  <Wand2 className="w-2 h-2" />
                  AI
                </div>
              )}
              {/* Zoom indicator on hover */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transition-opacity" />
              </div>
            </div>
          )}

          {/* Caption for side-by-side */}
          {illustrationLayout === 'side-by-side' && illustration.caption && (
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-1">
                <ImageIcon className="w-3 h-3 text-rose-500" />
                <span className={`${textSizeClasses.xs} text-rose-600 dark:text-rose-400 font-medium`}>
                  Illustration
                </span>
                {illustration.aiGenerated && (
                  <span className="ml-1 px-1 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-[7px] font-bold text-white">
                    AI
                  </span>
                )}
              </div>
              <p className={`${textSizeClasses.xs} text-zinc-600 dark:text-zinc-400 ${isSepia ? 'font-serif italic' : ''}`}>
                {illustration.caption}
              </p>
            </div>
          )}

          {/* Caption for vertical */}
          {illustrationLayout === 'vertical' && illustration.caption && (
            <div className={`mt-1 ${textSizeClasses.xs} text-zinc-500 dark:text-zinc-400 ${isSepia ? 'font-serif italic text-center' : 'italic'} ${isTerminal ? 'font-mono uppercase tracking-wider text-[9px]' : ''}`}>
              {illustration.caption}
            </div>
          )}
        </div>
      )}
      
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-cyan-500 rounded-full -ml-0.5" />
      )}
    </div>
  )
}

/**
 * Scroll progress indicator
 */
function ScrollProgressBar({ progress }: { progress: number }) {
  return (
    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-zinc-200 dark:bg-zinc-800">
      <div
        className="w-full bg-cyan-500 transition-all duration-300"
        style={{ height: `${progress}%` }}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT (Hook-based content)
═══════════════════════════════════════════════════════════════════════════ */

function ReaderModePanelContent({
  content,
  metadata,
  contentRef,
  onBlockClick,
  theme = 'light',
  panelSize = 'm',
  activeHeadingSlug,
  deviceInfo,
  blockTags,
  onAcceptBlockTag,
  onRejectBlockTag,
  onTagClick,
}: ReaderModePanelProps) {
  // Mounted state to prevent hydration mismatches
  const [mounted, setMounted] = useState(false)
  const [summaryMode, setSummaryMode] = useState<SummaryMode>('extractive')
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [illustrationLayout, setIllustrationLayout] = useState<IllustrationLayout>('vertical')
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  // Content filters
  const [showTitles, setShowTitles] = useState(true)
  const [showImages, setShowImages] = useState(true)
  const [showSummaries, setShowSummaries] = useState(true)
  const [showNonBlockText, setShowNonBlockText] = useState(true)
  const [showBlockTagsInReader, setShowBlockTagsInReader] = useState(false) // Hidden by default
  const [visibleBlocksState, setVisibleBlocksState] = useState<Set<string>>(new Set())
  const [showControlsExpanded, setShowControlsExpanded] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<StrandIllustration | null>(null)
  const [showMobileGallery, setShowMobileGallery] = useState(false)
  const [mobileGalleryIndex, setMobileGalleryIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Ensure component is mounted before accessing browser APIs
  useEffect(() => {
    setMounted(true)
  }, [])

  // Device detection passed from parent props (avoids React #311 from calling hooks here)
  const isMobile = deviceInfo?.isMobile ?? false
  const isTablet = deviceInfo?.isTablet ?? false
  const isLandscape = deviceInfo?.isLandscape ?? false
  const isTouch = deviceInfo?.isTouch ?? false

  // Effective layout - auto-switch on mobile
  const effectiveLayout = useMemo(() => {
    if (illustrationLayout === 'hidden') return 'hidden'

    // Mobile: use thumbnail-strip or simplified layouts
    if (isMobile) {
      // In landscape, show floating thumbnails to save vertical space
      if (isLandscape) return 'floating'
      // In portrait, show thumbnail strip for easy navigation
      return 'thumbnail-strip'
    }

    // Tablet: prefer side-by-side for better use of screen
    if (isTablet) {
      return illustrationLayout === 'vertical' ? 'side-by-side' : illustrationLayout
    }

    return illustrationLayout
  }, [illustrationLayout, isMobile, isTablet, isLandscape])

  // Collect all illustrations for thumbnail strip mode
  const allIllustrations = useMemo(() => {
    const illustrations: Array<{ illustration: StrandIllustration; blockId: string }> = []
    metadata.illustrations?.forEach(ill => {
      if (ill.blockId) {
        illustrations.push({ illustration: ill, blockId: ill.blockId })
      }
    })
    return illustrations
  }, [metadata.illustrations])

  // Generate block summaries from content - prefer pre-computed from indexing
  const blockSummaries = useMemo(() => {
    if (!content) return []
    
    // Use pre-computed summaries from YAML frontmatter / codex-index.json if available
    // These are generated during indexing for optimal performance
    if (metadata.blockSummaries && metadata.blockSummaries.length > 0) {
      return metadata.blockSummaries.map((bs: BlockSummary) => ({
        blockId: bs.blockId,
        blockType: bs.blockType,
        startLine: bs.startLine || 0,
        endLine: bs.endLine || 0,
        extractive: bs.extractive || '',
        abstractive: bs.abstractive,
      }))
    }
    
    // Fallback: generate on-the-fly (client-side) if not pre-computed
    // Include headings for scroll sync with activeHeadingSlug
    return generateBlockSummaries(content, 150, { includeHeadings: true })
  }, [content, metadata.blockSummaries])
  
  // Sync with external activeHeadingSlug when provided
  // This keeps ReaderModePanel in sync with OutlineTableOfContents
  useEffect(() => {
    if (activeHeadingSlug && blockSummaries.length > 0) {
      // Find the heading block that matches this slug
      // The slug is generated from heading text, so we need to compare slugs not blockIds
      const matchingBlock = blockSummaries.find((bs: BlockSummaryResult) => {
        if (bs.blockType !== 'heading') return false
        // Generate slug from the heading's extractive text and compare
        const blockSlug = generateHeadingSlug(bs.extractive)
        return blockSlug === activeHeadingSlug || blockSlug.includes(activeHeadingSlug) || activeHeadingSlug.includes(blockSlug)
      })
      if (matchingBlock) {
        setActiveBlockId(matchingBlock.blockId)
      }
    }
  }, [activeHeadingSlug, blockSummaries])
  
  // IntersectionObserver to track which blocks are visible in the content area
  // NOTE: We use a ref to avoid calling setActiveBlockId inside setVisibleBlocksState
  // which would cause React #311 (too many re-renders)
  const pendingActiveBlockRef = useRef<string | null>(null)

  // Map DOM block indices to our blockSummaries by matching positions
  // Since DOM block IDs and NLP block IDs may not match, we track by DOM order
  const domBlockToSummaryMap = useRef<Map<string, string>>(new Map())

  // Create a map of blockId -> document order index for sorting
  const blockOrderMap = useMemo(() => {
    const map = new Map<string, number>()
    blockSummaries.forEach((bs: BlockSummaryResult, index: number) => {
      map.set(bs.blockId, index)
    })
    return map
  }, [blockSummaries])

  useEffect(() => {
    if (!contentRef?.current) return

    const contentElement = contentRef.current

    // Build mapping from DOM blocks to summaries by matching order
    // Both systems generate blocks in document order, so index should match
    const buildBlockMapping = () => {
      const domBlocks = contentElement.querySelectorAll('[data-block-id]')
      domBlockToSummaryMap.current.clear()

      domBlocks.forEach((el, index) => {
        const domBlockId = el.getAttribute('data-block-id')
        if (domBlockId && index < blockSummaries.length) {
          // Map DOM block ID to summary block ID at same index
          domBlockToSummaryMap.current.set(domBlockId, blockSummaries[index].blockId)
        }
      })
    }

    // Helper to observe all current blocks
    const observeAllBlocks = () => {
      if (!observerRef.current) return
      buildBlockMapping()
      const blockElements = contentElement.querySelectorAll('[data-block-id]')
      blockElements.forEach(el => observerRef.current?.observe(el))
    }

    // Create observer to watch content blocks
    // Uses the content element as root to track scroll within the content area
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Track which summary blocks just became visible/hidden
        const newlyVisible: string[] = []
        const newlyHidden: string[] = []

        entries.forEach(entry => {
          const domBlockId = entry.target.getAttribute('data-block-id')
          if (!domBlockId) return

          // Map DOM block ID to summary block ID
          const summaryBlockId = domBlockToSummaryMap.current.get(domBlockId) || domBlockId

          if (entry.isIntersecting) {
            newlyVisible.push(summaryBlockId)
          } else {
            newlyHidden.push(summaryBlockId)
          }
        })

        // Update visible blocks state
        setVisibleBlocksState(prevVisibleBlocks => {
          const newVisibleBlocks = new Set(prevVisibleBlocks)

          newlyVisible.forEach(id => newVisibleBlocks.add(id))
          newlyHidden.forEach(id => newVisibleBlocks.delete(id))

          // Sort visible blocks by document order and pick the topmost one
          // This ensures correct sync when scrolling both up and down
          if (newVisibleBlocks.size > 0) {
            const sortedBlocks = Array.from(newVisibleBlocks).sort((a, b) => {
              const orderA = blockOrderMap.get(a) ?? Infinity
              const orderB = blockOrderMap.get(b) ?? Infinity
              return orderA - orderB
            })
            pendingActiveBlockRef.current = sortedBlocks[0]
          }

          return newVisibleBlocks
        })

        // Update active block OUTSIDE of the setState updater
        // Use requestAnimationFrame to ensure state has settled
        requestAnimationFrame(() => {
          if (pendingActiveBlockRef.current) {
            setActiveBlockId(pendingActiveBlockRef.current)
          }
        })
      },
      {
        root: contentElement,
        // Top 5% ignored, bottom 75% ignored = detect blocks in top ~25% of viewport
        // This makes the "active" block the one near the top of what you're reading
        rootMargin: '-5% 0px -75% 0px',
        threshold: [0, 0.1, 0.25, 0.5], // Multiple thresholds for smoother detection
      }
    )

    // Initial observation of all blocks
    observeAllBlocks()

    // Also watch for DOM changes (dynamically rendered blocks)
    const mutationObserver = new MutationObserver((mutations) => {
      let hasNewBlocks = false
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLElement) {
              if (node.hasAttribute('data-block-id') || node.querySelector('[data-block-id]')) {
                hasNewBlocks = true
                break
              }
            }
          }
        }
        if (hasNewBlocks) break
      }
      if (hasNewBlocks) {
        // Re-observe all blocks when new ones are added
        observeAllBlocks()
      }
    })

    mutationObserver.observe(contentElement, { childList: true, subtree: true })

    return () => {
      observerRef.current?.disconnect()
      mutationObserver.disconnect()
    }
  }, [contentRef, content, blockOrderMap, blockSummaries])
  
  // Track scroll progress for the progress bar
  useEffect(() => {
    if (!contentRef?.current) return
    
    const contentElement = contentRef.current
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = contentElement
      const progress = scrollHeight > clientHeight 
        ? (scrollTop / (scrollHeight - clientHeight)) * 100 
        : 0
      setScrollProgress(Math.min(100, Math.max(0, progress)))
    }
    
    contentElement.addEventListener('scroll', handleScroll, { passive: true })
    return () => contentElement.removeEventListener('scroll', handleScroll)
  }, [contentRef])

  // Filter summaries based on view mode and filter toggles
  const filteredSummaries = useMemo(() => {
    let filtered = blockSummaries

    // Filter by content type toggles
    if (!showTitles) {
      filtered = filtered.filter((s) => s.blockType !== 'heading')
    }
    if (!showNonBlockText) {
      filtered = filtered.filter((s) => s.blockType === 'heading' || s.blockType === 'paragraph')
    }

    // Always exclude headings from summaries streamlining (unless showTitles is explicitly enabled)
    if (!showTitles) {
      filtered = filtered.filter((s) => s.blockType !== 'heading')
    }

    // Apply view mode filter
    switch (viewMode) {
      case 'paragraph':
        return filtered.filter((s) => s.blockType === 'paragraph')
      case 'block':
        return filtered.filter((s) => s.blockType !== 'paragraph')
      default:
        return filtered
    }
  }, [blockSummaries, viewMode, showTitles, showNonBlockText])

  // Get illustrations mapped by block ID
  const illustrationMap = useMemo(() => {
    const map = new Map<string, StrandIllustration>()
    if (metadata.illustrations) {
      for (const ill of metadata.illustrations) {
        if (ill.blockId) {
          map.set(ill.blockId, ill)
        }
      }
    }
    return map
  }, [metadata.illustrations])

  // Get abstractive summaries mapped by block ID
  const abstractiveMap = useMemo(() => {
    const map = new Map<string, string>()
    if (metadata.blockSummaries) {
      for (const bs of metadata.blockSummaries) {
        if (bs.abstractive) {
          map.set(bs.blockId, bs.abstractive)
        }
      }
    }
    return map
  }, [metadata.blockSummaries])

  // Get block tags mapped by block ID (full data including suggestions)
  const blockTagsMap = useMemo(() => {
    const map = new Map<string, BlockTagData>()
    if (blockTags) {
      for (const bt of blockTags) {
        // Include blocks with tags OR suggestions
        if ((bt.tags && bt.tags.length > 0) || (bt.suggestedTags && bt.suggestedTags.length > 0)) {
          map.set(bt.blockId, bt)
        }
      }
    }
    return map
  }, [blockTags])

  // Auto-scroll summary panel to show active block
  useEffect(() => {
    if (!activeBlockId || !containerRef.current) return
    
    const activeElement = containerRef.current.querySelector(`[data-block-id="${activeBlockId}"]`)
    if (activeElement) {
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeBlockId])

  const handleBlockClick = useCallback((blockId: string, startLine: number) => {
    setActiveBlockId(blockId)
    onBlockClick?.(blockId, startLine)
  }, [onBlockClick])

  const textSizeClasses = {
    base: panelSize === 'l' ? 'text-[12px]' : panelSize === 'm' ? 'text-[11px]' : 'text-[10px]',
    sm: panelSize === 'l' ? 'text-[11px]' : panelSize === 'm' ? 'text-[10px]' : 'text-[9px]',
    xs: panelSize === 'l' ? 'text-[10px]' : panelSize === 'm' ? 'text-[9px]' : 'text-[8px]',
  }

  // Don't render until mounted to prevent hydration mismatches
  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-8 text-paper-500 dark:text-ink-400">
        <div className="animate-pulse">Loading reader mode...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with controls */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-1.5">
          <SplitSquareVertical className="w-3 h-3 text-cyan-500/70" />
          <span className={`${textSizeClasses.sm} font-medium text-zinc-600 dark:text-zinc-300`}>
            Reader
          </span>
          <span className={`${textSizeClasses.xs} px-1 py-0.5 rounded bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500`}>
            {filteredSummaries.length}
          </span>
        </div>

        {/* Settings toggle */}
        <button
          onClick={() => setShowControlsExpanded(!showControlsExpanded)}
          className={`
            p-1 rounded transition-colors
            ${showControlsExpanded
              ? 'bg-cyan-100/50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400'
              : 'text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'
            }
          `}
          title="Display options"
        >
          <Settings2 className="w-3 h-3" />
        </button>
      </div>

      {/* View mode selector */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <span className={`${textSizeClasses.xs} text-zinc-400 dark:text-zinc-500 mr-1`}>View:</span>
        {[
          { mode: 'all' as ViewMode, label: 'All', icon: Layers },
          { mode: 'paragraph' as ViewMode, label: 'Text', icon: FileText },
          { mode: 'block' as ViewMode, label: 'Blocks', icon: Code },
        ].map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`
              flex items-center gap-0.5 px-1.5 py-0.5 rounded ${textSizeClasses.xs} font-medium transition-colors
              ${viewMode === mode
                ? 'bg-cyan-100/50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'
              }
            `}
          >
            <Icon className="w-2.5 h-2.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Summary mode toggle */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <span className={`${textSizeClasses.xs} text-zinc-400 dark:text-zinc-500 mr-1`}>Show:</span>
        {[
          { mode: 'extractive' as SummaryMode, label: 'Key Points', icon: FileText, color: 'cyan' },
          { mode: 'abstractive' as SummaryMode, label: 'AI', icon: Sparkles, color: 'amber' },
          { mode: 'both' as SummaryMode, label: 'Both', icon: Eye, color: 'purple' },
          { mode: 'summaries-only' as SummaryMode, label: 'Summary', icon: LayoutList, color: 'emerald' },
        ].map(({ mode, label, icon: Icon, color }) => (
          <button
            key={mode}
            onClick={() => setSummaryMode(mode)}
            className={`
              flex items-center gap-0.5 px-1.5 py-0.5 rounded ${textSizeClasses.xs} font-medium transition-colors
              ${summaryMode === mode
                ? `bg-${color}-100/50 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300`
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'
              }
            `}
            title={mode === 'summaries-only' ? 'Show only summaries without illustrations' : undefined}
          >
            <Icon className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      
      {/* Expanded controls - illustration layout */}
      {showControlsExpanded && (
        <div
          className="overflow-hidden border-b border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="px-3 py-2 space-y-2 bg-zinc-50 dark:bg-zinc-900/50">
            {/* Illustration Layout */}
            <div className="flex items-center gap-2">
              <span className={`${textSizeClasses.xs} text-zinc-500 dark:text-zinc-400`}>
                <ImageIcon className="w-3 h-3 inline mr-1" />
                Illustrations:
              </span>
              <div className="flex gap-1">
                {[
                  { layout: 'vertical' as IllustrationLayout, label: 'Below', icon: GalleryVertical },
                  { layout: 'side-by-side' as IllustrationLayout, label: 'Side', icon: GalleryHorizontal },
                  { layout: 'hidden' as IllustrationLayout, label: 'Hide', icon: EyeOff },
                ].map(({ layout, label, icon: Icon }) => (
                  <button
                    key={layout}
                    onClick={() => setIllustrationLayout(layout)}
                    className={`
                      flex items-center gap-1 px-2 py-1 rounded ${textSizeClasses.xs} font-medium transition-colors
                      ${illustrationLayout === layout
                        ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }
                    `}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Filters */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-1 mb-1.5">
                <Eye className="w-3 h-3 text-zinc-500" />
                <span className={`${textSizeClasses.xs} text-zinc-500 dark:text-zinc-400 font-medium`}>
                  Show/Hide:
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: 'Titles', value: showTitles, setter: setShowTitles },
                  { label: 'Images', value: showImages, setter: setShowImages },
                  { label: 'Summaries', value: showSummaries, setter: setShowSummaries },
                  { label: 'Text Blocks', value: showNonBlockText, setter: setShowNonBlockText },
                  { label: 'Block Tags', value: showBlockTagsInReader, setter: setShowBlockTagsInReader },
                ].map(({ label, value, setter }) => (
                  <button
                    key={label}
                    onClick={() => setter(!value)}
                    className={`
                      flex items-center gap-1 px-2 py-1 rounded ${textSizeClasses.xs} font-medium transition-colors
                      ${value
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                      }
                    `}
                  >
                    {value ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Info about display modes */}
            <p className={`${textSizeClasses.xs} text-zinc-400 dark:text-zinc-500`}>
              💡 Key Points extracts important sentences. AI shows generated summaries. Summary shows compact overview.
            </p>
          </div>
        </div>
      )}

      {/* Thumbnail Strip (when layout is thumbnail-strip) */}
      {effectiveLayout === 'thumbnail-strip' && allIllustrations.length > 0 && (
        <div className={`
          px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50
          ${isMobile ? 'sticky top-0 z-10' : ''}
        `}>
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <div className="flex items-center gap-1">
              <Grip className="w-3 h-3 text-rose-500" />
              <span className={`${textSizeClasses.xs} text-rose-600 dark:text-rose-400 font-medium`}>
                Illustrations ({allIllustrations.length})
              </span>
            </div>
            {/* Mobile: Open full gallery button */}
            {isMobile && allIllustrations.length > 1 && (
              <button
                onClick={() => setShowMobileGallery(true)}
                className="text-[10px] px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-medium"
              >
                View All
              </button>
            )}
          </div>
          <div className={`
            flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin
            ${isMobile ? 'snap-x snap-mandatory scroll-smooth touch-pan-x' : ''}
          `}>
            {allIllustrations.map(({ illustration, blockId }, idx) => (
              <button
                key={illustration.id}
                onClick={() => {
                  if (isMobile && isTouch) {
                    // On mobile touch: open swipeable gallery at this index
                    setMobileGalleryIndex(idx)
                    setShowMobileGallery(true)
                  } else {
                    // Desktop: scroll to block
                    const element = document.querySelector(`[data-block-id="${blockId}"]`)
                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    setActiveBlockId(blockId)
                  }
                }}
                className={`
                  flex-shrink-0 rounded-lg overflow-hidden
                  ring-2 transition-all duration-200 relative group
                  ${isMobile ? 'w-16 h-16 min-w-[64px] snap-start' : 'w-12 h-12'}
                  ${activeBlockId === blockId
                    ? 'ring-cyan-400 shadow-lg scale-105'
                    : 'ring-transparent hover:ring-zinc-300 dark:hover:ring-zinc-600'
                  }
                `}
                title={illustration.caption || `Illustration ${idx + 1}`}
              >
                <img
                  src={illustration.src}
                  alt={illustration.alt || `Illustration ${idx + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                {/* AI badge */}
                {illustration.aiGenerated && (
                  <div className={`
                    absolute top-0 right-0 rounded-bl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center
                    ${isMobile ? 'w-4 h-4' : 'w-3 h-3'}
                  `}>
                    <span className={`font-bold text-white ${isMobile ? 'text-[6px]' : 'text-[5px]'}`}>AI</span>
                  </div>
                )}
                {/* Expand icon - visible on desktop hover, always visible on mobile */}
                <div className={`
                  absolute inset-0 flex items-center justify-center transition-colors
                  ${isMobile ? 'bg-black/20' : 'bg-black/0 group-hover:bg-black/30'}
                `}>
                  <ZoomIn className={`
                    text-white transition-opacity drop-shadow-lg
                    ${isMobile ? 'w-5 h-5 opacity-80' : 'w-4 h-4 opacity-0 group-hover:opacity-100'}
                  `} />
                </div>
              </button>
            ))}
          </div>
          {/* Swipe hint for mobile */}
          {isMobile && allIllustrations.length > 3 && (
            <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1 text-center">
              ← Swipe to see more →
            </p>
          )}
        </div>
      )}

      {/* Mobile Swipeable Gallery Overlay - TEMPORARILY DISABLED */}
      {/* {showMobileGallery && allIllustrations.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <SwipeableGallery ... />
        </div>
      )} */}

      {/* Scrollable content */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-y-auto px-3 py-2 space-y-2"
      >
        <ScrollProgressBar progress={scrollProgress} />

        {filteredSummaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <BookOpen className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
            <p className={`${textSizeClasses.base} text-zinc-500 dark:text-zinc-400`}>
              No content to summarize
            </p>
            <p className={`${textSizeClasses.xs} text-zinc-400 dark:text-zinc-500 mt-1`}>
              Select a strand to view summaries
            </p>
          </div>
        ) : (
          <>
            {filteredSummaries.map((summary) => (
              <div key={summary.blockId} data-block-id={summary.blockId}>
                <BlockSummaryItem
                  summary={summary as BlockSummaryResult}
                  illustration={showImages ? illustrationMap.get(summary.blockId) : undefined}
                  abstractive={
                    showSummaries && (summaryMode === 'abstractive' || summaryMode === 'both' || summaryMode === 'summaries-only')
                      ? abstractiveMap.get(summary.blockId)
                      : undefined
                  }
                  isActive={activeBlockId === summary.blockId}
                  onClick={() => handleBlockClick(summary.blockId, summary.startLine)}
                  panelSize={panelSize}
                  showAbstractive={showSummaries && (summaryMode === 'abstractive' || summaryMode === 'both' || summaryMode === 'summaries-only')}
                  illustrationLayout={effectiveLayout}
                  summaryOnlyMode={summaryMode === 'summaries-only'}
                  onImageClick={(ill) => setLightboxImage(ill)}
                  theme={theme}
                  blockTagData={showBlockTagsInReader ? blockTagsMap.get(summary.blockId) : undefined}
                  onAcceptTag={onAcceptBlockTag}
                  onRejectTag={onRejectBlockTag}
                  onTagClick={onTagClick}
                />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer with stats */}
      <div className="px-2 py-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
        <div className={`flex items-center justify-between ${textSizeClasses.xs} text-zinc-400 dark:text-zinc-500`}>
          <span>
            {blockSummaries.filter((s) => s.blockType === 'paragraph').length}p •
            {blockSummaries.filter((s) => s.blockType !== 'paragraph').length}b
            {allIllustrations.length > 0 && ` • ${allIllustrations.length}i`}
          </span>
          <span className="font-mono">
            {Math.round(scrollProgress)}%
          </span>
        </div>
      </div>

      {/* Lightbox disabled - hooks cause React #311 due to webpack bundling */}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CLASS WRAPPER (Avoids React #311 hook errors in dynamic imports)

   When this component is dynamically imported with ssr: false, React's context
   might not be fully established when hooks are called. Using a class component
   as the entry point ensures the component tree is properly mounted before
   any hooks are invoked.
═══════════════════════════════════════════════════════════════════════════ */

interface ReaderModeWrapperState {
  mounted: boolean
}

export default class ReaderModePanel extends Component<ReaderModePanelProps, ReaderModeWrapperState> {
  state: ReaderModeWrapperState = {
    mounted: false,
  }

  constructor(props: ReaderModePanelProps) {
    super(props)
    console.log('[ReaderModePanel] constructor called')
  }

  componentDidMount() {
    console.log('[ReaderModePanel] componentDidMount - setting mounted=true')
    // Set mounted after the component tree is established
    this.setState({ mounted: true })
  }

  render() {
    console.log('[ReaderModePanel] render - mounted:', this.state.mounted)

    // Don't render hook-based content until mounted
    if (!this.state.mounted) {
      return (
        <div className="flex items-center justify-center p-8 text-zinc-500">
          <div className="animate-pulse">Initializing reader mode...</div>
        </div>
      )
    }

    // Render the hook-based content now that React context is established
    console.log('[ReaderModePanel] About to render ReaderModePanelContent')
    try {
      const result = <ReaderModePanelContent {...this.props} />
      console.log('[ReaderModePanel] ReaderModePanelContent created successfully')
      return result
    } catch (e) {
      console.error('[ReaderModePanel] Error creating ReaderModePanelContent:', e)
      throw e
    }
  }
}
