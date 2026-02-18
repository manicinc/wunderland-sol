/**
 * InlineWYSIWYGEditor - Medium-style inline WYSIWYG editor
 * @module codex/ui/InlineWYSIWYGEditor
 *
 * Main component that orchestrates block-level editing:
 * 1. Parse markdown into blocks
 * 2. Render each block with EditableBlock
 * 3. Track which block (if any) is being edited
 * 4. On block edit complete, reconstruct full markdown
 * 5. Auto-save draft to localStorage
 */

'use client'

import React, { useMemo, useCallback, useEffect, useState } from 'react'
import { EditableBlock, type BlockType } from '../blocks/EditableBlock'
import { useInlineEditor } from '../../hooks/useInlineEditor'
import { parseMarkdownBlocks, blocksToMarkdown } from '../../utils/markdownConversion'
import { useBlockTags } from '@/lib/hooks/useBlockTags'
import { Save, RotateCcw, AlertCircle, Check } from 'lucide-react'
import type { TagIndexEntry } from '../../types'
import {
  BlockInsertHandle,
  BlockCommandPalette,
  BlockDragHandle,
  BlockDropZone,
  TableInsertModal,
  ImageInsertModal,
  AIGenerateModal,
} from '../blockCommands'
import type { BlockCommand } from '../blockCommands/types'
import { generateWhatGotDoneMarkdown } from '@/lib/accomplishment'
import { MentionAutocomplete } from '../mentions'
import type { MentionableEntity } from '@/lib/mentions/types'

export interface InlineWYSIWYGEditorProps {
  /** Full markdown content */
  content: string
  /** File path for draft storage */
  filePath: string
  /** Callback when content changes */
  onContentChange: (markdown: string) => void
  /** Callback to publish/save content - can be sync or async */
  onPublish?: (content: string) => void | Promise<void>
  /** Whether editing is enabled */
  editable: boolean
  /** Theme name */
  theme: string
  /** Original content for conflict detection */
  originalContent: string
  /** Strand path for block tagging operations */
  strandPath?: string
  /** Available tags from index for autocomplete */
  tagsIndex?: TagIndexEntry[]
}

/**
 * Inline WYSIWYG editor with block-level editing
 */
export function InlineWYSIWYGEditor({
  content,
  filePath,
  onContentChange,
  onPublish,
  editable,
  theme,
  originalContent,
  strandPath,
  tagsIndex,
}: InlineWYSIWYGEditorProps) {
  const isDark = theme.includes('dark')
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Block command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [commandPalettePosition, setCommandPalettePosition] = useState({ x: 0, y: 0 })
  const [commandQuery, setCommandQuery] = useState('')
  const [insertAtIndex, setInsertAtIndex] = useState<number>(0)

  // Modal state for advanced block types
  const [activeModal, setActiveModal] = useState<'table' | 'image' | 'ai' | null>(null)

  // @mention autocomplete state
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ x: 0, y: 0 })
  const [mentionTargetBlockId, setMentionTargetBlockId] = useState<string | null>(null)

  // Drag-and-drop state for block reordering
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [hoveredBlockIndex, setHoveredBlockIndex] = useState<number | null>(null)

  // Block tagging operations - only active when strandPath provided
  const {
    getBlockById,
    addTag,
    removeTag,
  } = useBlockTags(strandPath ?? null, { autoFetch: !!strandPath })

  // Initialize inline editor hook
  const {
    state,
    startEditing,
    stopEditing,
    updateBlockContent,
    setContent,
    insertBlockAt,
    moveBlock,
    loadDraft,
    hasDraft,
    clearDraft,
    resetContent,
    markSaved,
  } = useInlineEditor({
    filePath,
    initialContent: content,
    onContentChange,
  })

  // Parse content into blocks
  const blocks = useMemo(() => {
    return parseMarkdownBlocks(state.content)
  }, [state.content])

  // Check for draft on mount
  useEffect(() => {
    if (hasDraft()) {
      const draft = loadDraft()
      if (draft && draft !== content) {
        // Show draft recovery option
        setContent(draft)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut: Cmd+/ to open block menu
  useEffect(() => {
    if (!editable) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+/ or Ctrl+/ to open block menu
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()

        // If already open, close it
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false)
          return
        }

        // Calculate position - center of viewport or near current block
        let position = { x: window.innerWidth / 2 - 144, y: 200 }

        // If a block is being edited, position near it
        if (state.activeBlockId) {
          const blockEl = document.querySelector(`[data-block-id="${state.activeBlockId}"]`)
          if (blockEl) {
            const rect = blockEl.getBoundingClientRect()
            position = { x: rect.left, y: rect.bottom + 8 }
          }
        } else if (hoveredBlockIndex !== null) {
          // Position near hovered block
          const blockIndex = hoveredBlockIndex
          const allBlocks = document.querySelectorAll('[data-block-id]')
          if (allBlocks[blockIndex]) {
            const rect = allBlocks[blockIndex].getBoundingClientRect()
            position = { x: rect.left, y: rect.bottom + 8 }
          }
          setInsertAtIndex(hoveredBlockIndex + 1)
        } else {
          // Default to end of document
          setInsertAtIndex(blocks.length)
        }

        // Ensure palette stays within viewport
        position.x = Math.max(16, Math.min(position.x, window.innerWidth - 304))
        position.y = Math.max(16, Math.min(position.y, window.innerHeight - 400))

        setCommandPalettePosition(position)
        setCommandQuery('')
        setCommandPaletteOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editable, commandPaletteOpen, state.activeBlockId, hoveredBlockIndex, blocks.length])

  // Handle block edit start
  const handleStartEdit = useCallback((blockId: string) => {
    if (!editable) return
    startEditing(blockId)
  }, [editable, startEditing])

  // Handle block edit end
  const handleEndEdit = useCallback((blockId: string, newContent: string) => {
    updateBlockContent(blockId, newContent)
    stopEditing()
  }, [updateBlockContent, stopEditing])

  // Handle publish
  const handlePublish = useCallback(async () => {
    if (!onPublish || isPublishing) return

    setIsPublishing(true)
    setPublishStatus('idle')

    try {
      await onPublish(state.content)
      markSaved()
      setPublishStatus('success')
      setTimeout(() => setPublishStatus('idle'), 2000)
    } catch (error) {
      console.error('[InlineWYSIWYGEditor] Publish failed:', error)
      setPublishStatus('error')
    } finally {
      setIsPublishing(false)
    }
  }, [onPublish, isPublishing, state.content, markSaved])

  // Handle reset
  const handleReset = useCallback(() => {
    if (window.confirm('Discard all changes and reset to original content?')) {
      resetContent()
      setContent(originalContent)
    }
  }, [resetContent, setContent, originalContent])

  // Handle opening the block command palette
  const handleOpenBlockMenu = useCallback((index: number, position: { x: number; y: number }) => {
    setInsertAtIndex(index)
    setCommandPalettePosition(position)
    setCommandQuery('')
    setCommandPaletteOpen(true)
  }, [])

  // Handle closing the block command palette
  const handleCloseBlockMenu = useCallback(() => {
    setCommandPaletteOpen(false)
    setCommandQuery('')
  }, [])

  // Handle selecting a block command
  const handleSelectBlockCommand = useCallback(async (command: BlockCommand) => {
    // Check if command requires a modal
    if (command.requiresInput) {
      handleCloseBlockMenu()
      // Open appropriate modal based on command id
      if (command.id === 'table') {
        setActiveModal('table')
      } else if (command.id === 'image') {
        setActiveModal('image')
      } else if (command.id === 'ai-generate') {
        setActiveModal('ai')
      } else if (command.id === 'accomplishments') {
        // Fetch and insert today's accomplishments
        const today = new Date().toISOString().split('T')[0]
        try {
          const markdown = await generateWhatGotDoneMarkdown(today, {
            groupByProject: true,
            includeSubtasks: true,
            includeHabits: true,
            markdownFormat: 'checklist',
          })
          if (markdown) {
            insertBlockAt(insertAtIndex, `## What Got Done\n\n${markdown}\n`)
          } else {
            insertBlockAt(insertAtIndex, `## What Got Done\n\n_No tasks completed today yet._\n`)
          }
        } catch (error) {
          console.error('[InlineWYSIWYGEditor] Failed to fetch accomplishments:', error)
          insertBlockAt(insertAtIndex, `## What Got Done\n\n_Could not load accomplishments._\n`)
        }
      } else if (command.id === 'cross-link') {
        // Insert wiki-link syntax with placeholder
        // TODO: Open a note picker modal for proper selection
        const noteName = window.prompt('Enter note name to link:')
        if (noteName) {
          insertBlockAt(insertAtIndex, `[[${noteName}]]`)
        }
      }
      return
    }

    // Get the markdown for this command
    const markdown = typeof command.markdown === 'function'
      ? command.markdown()
      : command.markdown

    if (markdown) {
      insertBlockAt(insertAtIndex, markdown)
    }

    handleCloseBlockMenu()
  }, [insertAtIndex, insertBlockAt, handleCloseBlockMenu])

  // Handle inserting content from modals
  const handleModalInsert = useCallback((markdown: string) => {
    insertBlockAt(insertAtIndex, markdown)
    setActiveModal(null)
  }, [insertAtIndex, insertBlockAt])

  // @mention handlers
  const handleMentionOpen = useCallback((blockId: string, query: string, position: { x: number; y: number }) => {
    setMentionTargetBlockId(blockId)
    setMentionQuery(query)
    setMentionPosition(position)
    setMentionOpen(true)
  }, [])

  const handleMentionDismiss = useCallback(() => {
    setMentionOpen(false)
    setMentionQuery('')
    setMentionTargetBlockId(null)
  }, [])

  const handleMentionSelect = useCallback((entity: MentionableEntity) => {
    // Insert the mention as a wiki-style link with the entity ID
    // Format: [[@entity-id|Entity Label]]
    if (mentionTargetBlockId) {
      const block = blocks.find(b => b.id === mentionTargetBlockId)
      if (block) {
        // Replace the @query in the block content with the mention syntax
        const mentionSyntax = `[[@${entity.id}|${entity.label}]]`
        const newContent = block.content.replace(
          new RegExp(`@${mentionQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`),
          mentionSyntax
        )
        updateBlockContent(mentionTargetBlockId, newContent)
      }
    }
    handleMentionDismiss()
  }, [mentionTargetBlockId, mentionQuery, blocks, updateBlockContent, handleMentionDismiss])

  // Drag-and-drop handlers for block reordering
  const handleDragStart = useCallback((blockIndex: number) => {
    setDraggingIndex(blockIndex)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null)
    setDropTargetIndex(null)
  }, [])

  const handleDragEnter = useCallback((blockIndex: number) => {
    if (draggingIndex !== null && draggingIndex !== blockIndex) {
      setDropTargetIndex(blockIndex)
    }
  }, [draggingIndex])

  const handleDrop = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex !== toIndex) {
      moveBlock(fromIndex, toIndex)
    }
    setDraggingIndex(null)
    setDropTargetIndex(null)
  }, [moveBlock])

  // Determine block type from content
  const getBlockType = (blockContent: string): BlockType => {
    if (blockContent.startsWith('#')) return 'heading'
    if (blockContent.startsWith('```')) return 'code'
    if (blockContent.startsWith('>')) return 'blockquote'
    if (blockContent.startsWith('-') || blockContent.startsWith('*') || blockContent.startsWith('+')) return 'list'
    if (/^\d+\./.test(blockContent)) return 'list'
    if (blockContent === '---' || blockContent === '***') return 'hr'
    return 'paragraph'
  }

  return (
    <div className={`inline-wysiwyg-editor relative ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      {/* Floating action bar */}
      {editable && (
        <div className={[
          'sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2 mb-4 rounded-lg border',
          isDark ? 'bg-zinc-800/95 border-zinc-700' : 'bg-white/95 border-zinc-200',
          'backdrop-blur-sm shadow-sm',
        ].join(' ')}>
          {/* Status */}
          <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {state.hasChanges ? (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Unsaved changes</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span>All changes saved</span>
              </>
            )}
            {state.lastSaved && (
              <span className="text-xs opacity-60">
                Last saved: {state.lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Reset button */}
            <button
              onClick={handleReset}
              disabled={!state.hasChanges}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                state.hasChanges
                  ? isDark
                    ? 'text-zinc-300 hover:bg-zinc-700'
                    : 'text-zinc-600 hover:bg-zinc-100'
                  : 'opacity-50 cursor-not-allowed',
              ].join(' ')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>

            {/* Publish button */}
            {onPublish && (
              <button
                onClick={handlePublish}
                disabled={isPublishing || !state.hasChanges}
                className={[
                  'flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                  publishStatus === 'success'
                    ? 'bg-green-500 text-white'
                    : publishStatus === 'error'
                      ? 'bg-red-500 text-white'
                      : state.hasChanges
                        ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                        : 'bg-zinc-300 text-zinc-500 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-400',
                ].join(' ')}
              >
                {isPublishing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : publishStatus === 'success' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Published!
                  </>
                ) : publishStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    Failed
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Publish
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Draft recovery banner */}
      {hasDraft() && state.content !== originalContent && (
        <div className={[
          'flex items-center justify-between gap-3 px-4 py-2 mb-4 rounded-lg border',
          isDark ? 'bg-amber-900/30 border-amber-700/50' : 'bg-amber-50 border-amber-200',
        ].join(' ')}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className={`text-sm ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
              You have unsaved changes from a previous session
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                clearDraft()
                setContent(originalContent)
              }}
              className={[
                'px-2 py-1 text-xs rounded',
                isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900',
              ].join(' ')}
            >
              Discard
            </button>
            <button
              onClick={() => clearDraft()}
              className="px-2 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-600"
            >
              Keep Draft
            </button>
          </div>
        </div>
      )}

      {/* Content blocks */}
      <div className="space-y-4">
        {blocks.map((block, index) => {
          // Get block data for tags (if strandPath provided)
          const blockData = strandPath ? getBlockById(block.id) : undefined
          const isHovered = hoveredBlockIndex === index
          const isDraggingThis = draggingIndex === index
          const isDropTargetHere = dropTargetIndex === index

          return (
            <React.Fragment key={block.id}>
              {/* Insert handle before each block */}
              {editable && (
                <BlockInsertHandle
                  blockIndex={index}
                  onOpenMenu={handleOpenBlockMenu}
                  isDark={isDark}
                />
              )}
              {/* Block wrapper with drag handle */}
              <div
                className="relative group/block"
                onMouseEnter={() => editable && setHoveredBlockIndex(index)}
                onMouseLeave={() => setHoveredBlockIndex(null)}
              >
                {/* Drag handle - shown on hover */}
                {editable && (
                  <BlockDragHandle
                    blockIndex={index}
                    isVisible={isHovered && !state.activeBlockId}
                    isDragging={isDraggingThis}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isDark={isDark}
                  />
                )}

                {/* Drop zone - visible when dragging */}
                {editable && draggingIndex !== null && (
                  <BlockDropZone
                    blockIndex={index}
                    isDragging={draggingIndex !== null}
                    isDropTarget={isDropTargetHere}
                    onDrop={handleDrop}
                    onDragEnter={handleDragEnter}
                    isDark={isDark}
                  />
                )}

                <EditableBlock
                  blockId={block.id}
                  strandPath={strandPath}
                  content={block.content}
                  type={getBlockType(block.content)}
                  isEditing={state.activeBlockId === block.id}
                  onStartEdit={handleStartEdit}
                  onEndEdit={handleEndEdit}
                  editable={editable}
                  theme={theme}
                  block={blockData}
                  currentTags={blockData?.tags}
                  availableTags={tagsIndex ?? []}
                  onTagAdd={strandPath ? (tag) => addTag(block.id, tag) : undefined}
                  onTagRemove={strandPath ? (tag) => removeTag(block.id, tag) : undefined}
                  onMentionTrigger={handleMentionOpen}
                />
              </div>
            </React.Fragment>
          )
        })}
        {/* Insert handle at end of document */}
        {editable && blocks.length > 0 && (
          <BlockInsertHandle
            blockIndex={blocks.length}
            onOpenMenu={handleOpenBlockMenu}
            isDark={isDark}
          />
        )}
      </div>

      {/* Empty state */}
      {blocks.length === 0 && (
        <div
          onClick={() => {
            if (editable) {
              setContent('Start writing...')
              handleStartEdit('block-0')
            }
          }}
          className={[
            'py-12 text-center rounded-lg border-2 border-dashed cursor-pointer transition-colors',
            isDark
              ? 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
              : 'border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-500',
          ].join(' ')}
        >
          <p className="text-lg">Click to start writing...</p>
          <p className="text-sm mt-1 opacity-60">Your content will appear here</p>
        </div>
      )}

      {/* Keyboard shortcuts help */}
      {editable && state.activeBlockId && (
        <div className={[
          'fixed bottom-4 right-4 px-3 py-2 rounded-lg shadow-lg border text-xs',
          isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500',
        ].join(' ')}>
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">Esc</kbd>
              {' '}to save & exit
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">Cmd</kbd>
              +
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">B</kbd>
              {' '}bold
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">Cmd</kbd>
              +
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">I</kbd>
              {' '}italic
            </span>
          </div>
        </div>
      )}

      {/* Block Command Palette */}
      <BlockCommandPalette
        isOpen={commandPaletteOpen}
        position={commandPalettePosition}
        query={commandQuery}
        onQueryChange={setCommandQuery}
        onSelect={handleSelectBlockCommand}
        onClose={handleCloseBlockMenu}
        isDark={isDark}
        mode="insert"
      />

      {/* Advanced block modals */}
      <TableInsertModal
        isOpen={activeModal === 'table'}
        onClose={() => setActiveModal(null)}
        onInsert={handleModalInsert}
        isDark={isDark}
      />

      <ImageInsertModal
        isOpen={activeModal === 'image'}
        onClose={() => setActiveModal(null)}
        onInsert={handleModalInsert}
        isDark={isDark}
      />

      <AIGenerateModal
        isOpen={activeModal === 'ai'}
        onClose={() => setActiveModal(null)}
        onInsert={handleModalInsert}
        isDark={isDark}
      />

      {/* @Mention Autocomplete */}
      <MentionAutocomplete
        query={mentionQuery}
        position={mentionPosition}
        isOpen={mentionOpen}
        onSelect={handleMentionSelect}
        onDismiss={handleMentionDismiss}
        strandPath={strandPath}
        maxSuggestions={8}
      />
    </div>
  )
}

export default InlineWYSIWYGEditor
