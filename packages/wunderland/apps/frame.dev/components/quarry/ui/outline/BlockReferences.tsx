/**
 * Block References Component
 * @module codex/ui/outline/BlockReferences
 *
 * Block-level reference system with:
 * - Copyable block links
 * - Incoming reference tracking
 * - Embed preview
 * - Reference types (link, embed, mention)
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  Link,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Hash,
  ArrowUpRight,
  Bookmark,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type ReferenceType = 'link' | 'embed' | 'mention'

export interface BlockReference {
  /** Unique reference ID */
  id: string
  /** Source document path */
  sourceDocumentPath: string
  /** Source document title */
  sourceDocumentTitle: string
  /** Source block ID in the document */
  sourceBlockId?: string
  /** Type of reference */
  type: ReferenceType
  /** Context text around the reference */
  context: string
  /** The exact text of the reference */
  referenceText: string
  /** Timestamp of when reference was created */
  createdAt?: Date
}

export interface Block {
  /** Block ID */
  id: string
  /** Block content (first line or summary) */
  content: string
  /** Block type */
  type: 'paragraph' | 'heading' | 'code' | 'list' | 'quote' | 'other'
  /** Heading level (if type is heading) */
  level?: number
}

export interface BlockReferencesProps {
  /** Current document path */
  documentPath: string
  /** Current document blocks */
  blocks: Block[]
  /** Incoming references to this document's blocks */
  incomingReferences?: BlockReference[]
  /** Active/selected block ID */
  activeBlockId?: string
  /** Theme */
  theme?: string
  /** Callback when block is clicked */
  onBlockClick?: (blockId: string) => void
  /** Callback when navigating to source document */
  onNavigateToSource?: (path: string, blockId?: string) => void
  /** Base URL for block links */
  baseUrl?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

function generateBlockLink(documentPath: string, blockId: string, baseUrl = ''): string {
  const path = documentPath.replace(/^\/+|\/+$/g, '')
  return `${baseUrl}/${path}#${blockId}`
}

function getBlockIcon(type: Block['type'], level?: number) {
  switch (type) {
    case 'heading':
      return Hash
    case 'code':
      return FileText
    case 'quote':
      return Bookmark
    default:
      return FileText
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

interface BlockItemProps {
  block: Block
  isActive: boolean
  documentPath: string
  incomingRefs: BlockReference[]
  isDark: boolean
  baseUrl: string
  onBlockClick?: (blockId: string) => void
  onNavigateToSource?: (path: string, blockId?: string) => void
}

function BlockItem({
  block,
  isActive,
  documentPath,
  incomingRefs,
  isDark,
  baseUrl,
  onBlockClick,
  onNavigateToSource,
}: BlockItemProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  
  const blockLink = generateBlockLink(documentPath, block.id, baseUrl)
  const Icon = getBlockIcon(block.type, block.level)
  const hasRefs = incomingRefs.length > 0
  
  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(blockLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy block link:', err)
    }
  }, [blockLink])
  
  const handleClick = useCallback(() => {
    onBlockClick?.(block.id)
  }, [block.id, onBlockClick])
  
  return (
    <div className="group">
      {/* Block row */}
      <div
        className={`
          flex items-start gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors
          ${isActive
            ? isDark
              ? 'bg-amber-900/30 border-l-2 border-amber-500'
              : 'bg-amber-50 border-l-2 border-amber-500'
            : isDark
              ? 'hover:bg-zinc-800'
              : 'hover:bg-zinc-50'
          }
        `}
        onClick={handleClick}
      >
        {/* Expand/collapse for refs */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
          className={`
            flex-shrink-0 w-4 h-4 flex items-center justify-center rounded transition-colors
            ${hasRefs
              ? isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'
              : 'invisible'
            }
          `}
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        
        {/* Block icon */}
        <Icon className={`
          w-3.5 h-3.5 mt-0.5 flex-shrink-0
          ${isActive
            ? isDark ? 'text-amber-400' : 'text-amber-600'
            : isDark ? 'text-zinc-500' : 'text-zinc-400'
          }
        `} />
        
        {/* Block content preview */}
        <div className="flex-1 min-w-0">
          <p className={`
            text-sm truncate
            ${isActive
              ? isDark ? 'text-amber-200' : 'text-amber-800'
              : isDark ? 'text-zinc-300' : 'text-zinc-700'
            }
          `}>
            {block.content}
          </p>
          
          {hasRefs && (
            <span className={`
              text-[10px]
              ${isDark ? 'text-violet-400' : 'text-violet-600'}
            `}>
              {incomingRefs.length} incoming ref{incomingRefs.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className={`
              p-1 rounded transition-colors
              ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}
            `}
            title="Copy block link"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>
      
      {/* Expanded references */}
      {expanded && hasRefs && (
        <div className="ml-8 mt-1 space-y-1">
          {incomingRefs.map(ref => (
            <div
              key={ref.id}
              className={`
                flex items-start gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors
                ${isDark ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-zinc-100'}
              `}
              onClick={() => onNavigateToSource?.(ref.sourceDocumentPath, ref.sourceBlockId)}
            >
              <ArrowUpRight className={`w-3 h-3 flex-shrink-0 mt-0.5 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  {ref.sourceDocumentTitle}
                </p>
                <p className={`truncate ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  "{ref.context}"
                </p>
              </div>
              <span className={`
                text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0
                ${ref.type === 'embed'
                  ? isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                  : ref.type === 'mention'
                    ? isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-700'
                    : isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
                }
              `}>
                {ref.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function BlockReferences({
  documentPath,
  blocks,
  incomingReferences = [],
  activeBlockId,
  theme = 'light',
  onBlockClick,
  onNavigateToSource,
  baseUrl = '',
}: BlockReferencesProps) {
  const isDark = theme?.includes('dark')
  const [showOnlyWithRefs, setShowOnlyWithRefs] = useState(false)
  
  // Group references by target block
  const referencesByBlock = useMemo(() => {
    const map = new Map<string, BlockReference[]>()
    incomingReferences.forEach(ref => {
      // Extract target block ID from reference
      const targetBlockId = ref.referenceText.match(/#([a-zA-Z0-9-_]+)/)?.[1]
      if (targetBlockId) {
        if (!map.has(targetBlockId)) {
          map.set(targetBlockId, [])
        }
        map.get(targetBlockId)!.push(ref)
      }
    })
    return map
  }, [incomingReferences])
  
  // Filter blocks
  const displayedBlocks = useMemo(() => {
    if (!showOnlyWithRefs) return blocks
    return blocks.filter(block => referencesByBlock.has(block.id))
  }, [blocks, showOnlyWithRefs, referencesByBlock])
  
  // Stats
  const totalRefs = incomingReferences.length
  const blocksWithRefs = referencesByBlock.size

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`
        flex items-center justify-between px-3 py-2 border-b
        ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
      `}>
        <div className="flex items-center gap-2">
          <Link className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            Block References
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Stats badge */}
          <span className={`
            text-[10px] px-1.5 py-0.5 rounded-full
            ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}
          `}>
            {totalRefs} ref{totalRefs !== 1 ? 's' : ''} · {blocksWithRefs} block{blocksWithRefs !== 1 ? 's' : ''}
          </span>
          
          {/* Filter toggle */}
          <button
            onClick={() => setShowOnlyWithRefs(!showOnlyWithRefs)}
            className={`
              p-1 rounded transition-colors
              ${showOnlyWithRefs
                ? isDark ? 'bg-violet-900/50 text-violet-400' : 'bg-violet-100 text-violet-600'
                : isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              }
            `}
            title={showOnlyWithRefs ? 'Show all blocks' : 'Show only referenced blocks'}
          >
            {showOnlyWithRefs ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      
      {/* Block list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {displayedBlocks.length === 0 ? (
          <div className={`
            flex flex-col items-center justify-center py-8 text-center
            ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
          `}>
            <Link className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">
              {showOnlyWithRefs ? 'No referenced blocks' : 'No blocks in document'}
            </p>
          </div>
        ) : (
          displayedBlocks.map(block => (
            <BlockItem
              key={block.id}
              block={block}
              isActive={block.id === activeBlockId}
              documentPath={documentPath}
              incomingRefs={referencesByBlock.get(block.id) || []}
              isDark={isDark}
              baseUrl={baseUrl}
              onBlockClick={onBlockClick}
              onNavigateToSource={onNavigateToSource}
            />
          ))
        )}
      </div>
    </div>
  )
}

