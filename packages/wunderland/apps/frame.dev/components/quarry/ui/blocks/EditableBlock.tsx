/**
 * EditableBlock - Click-to-edit block wrapper
 * @module codex/ui/EditableBlock
 *
 * Wraps individual content blocks (paragraph, heading, list, etc.)
 * - View mode: Renders as normal HTML
 * - Edit mode: Replaces with inline Tiptap editor on click
 */

'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { InlineFloatingToolbar } from '../inline-editor/InlineFloatingToolbar'
import { BlockTagsGutterIndicator } from './BlockTagsDisplay'
import QuickTagPopover from '../quick-actions/QuickTagPopover'
import { markdownToHtml, htmlToMarkdown } from '../../utils/markdownConversion'
import { SlashCommandExtension, deleteSlashQuery } from '../tiptap'
import { AISuggestionExtension } from '../tiptap/AISuggestionExtension'
import { BlockCommandPalette } from '../blockCommands'
import type { BlockCommand } from '../blockCommands/types'
import type { StrandBlock } from '@/lib/blockDatabase'
import type { TagIndexEntry } from '../../types'
import { useEditorAI } from '@/lib/ai/useEditorAI'
import ImageGenerationModal from '../media/ImageGenerationModal'
import { useWikilinkAutocomplete } from '@/hooks/useWikilinkAutocomplete'
import LinkAutocomplete, { type StrandSuggestion, type LinkAutocompleteRef } from '../links/LinkAutocomplete'
import { searchStrands } from '@/lib/storage/localCodex'

// Lazy-init lowlight to prevent blocking main thread on module load
// Lowlight with 'common' languages is ~100KB+ of JS to parse
let lowlightInstance: ReturnType<typeof createLowlight> | null = null
const getLowlight = () => {
  if (!lowlightInstance) {
    lowlightInstance = createLowlight(common)
  }
  return lowlightInstance
}

export type BlockType = 'heading' | 'paragraph' | 'code' | 'list' | 'blockquote' | 'hr'

export interface EditableBlockProps {
  /** Unique block identifier */
  blockId: string
  /** Strand path for tag operations */
  strandPath?: string
  /** Markdown content for this block */
  content: string
  /** Block type for appropriate rendering */
  type: BlockType
  /** Whether this block is currently being edited */
  isEditing: boolean
  /** Called when user clicks to start editing */
  onStartEdit: (blockId: string) => void
  /** Called when editing ends with new content */
  onEndEdit: (blockId: string, newContent: string) => void
  /** Whether editing is enabled */
  editable: boolean
  /** Theme name */
  theme: string
  /** Optional block data with tags for gutter indicator */
  block?: StrandBlock
  /** Called when the gutter indicator is clicked */
  onTagClick?: () => void
  /** Called to research selected text */
  onResearch?: (text: string) => void
  /** Current block tags for tagging popover */
  currentTags?: string[]
  /** Available tags from index for autocomplete */
  availableTags?: TagIndexEntry[]
  /** Handler to add a tag to this block */
  onTagAdd?: (tag: string) => Promise<void>
  /** Handler to remove a tag from this block */
  onTagRemove?: (tag: string) => Promise<void>
  /** Handler for @mention trigger - called when user types @ */
  onMentionTrigger?: (blockId: string, query: string, position: { x: number; y: number }) => void
}

/**
 * Editable block with click-to-edit functionality
 */
export function EditableBlock({
  blockId,
  strandPath,
  content,
  type,
  isEditing,
  onStartEdit,
  onEndEdit,
  editable,
  theme,
  block,
  onTagClick,
  onResearch,
  currentTags,
  availableTags,
  onTagAdd,
  onTagRemove,
  onMentionTrigger,
}: EditableBlockProps) {
  const isDark = theme.includes('dark')
  const blockRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef(content)

  // AI features - writing suggestions and image generation
  const {
    writingEnabled,
    writingStatus,
    writingSettings,
    getSuggestion,
    imageEnabled,
    imageSettings,
  } = useEditorAI()

  // Tag popover state
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)
  const [tagPopoverPosition, setTagPopoverPosition] = useState<{ top: number; left: number } | null>(null)

  // Slash command state
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 })
  const [slashQuery, setSlashQuery] = useState('')

  // Image generation modal state
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [imageModalPrompt, setImageModalPrompt] = useState('')

  // @mention state
  const [mentionActive, setMentionActive] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const mentionStartPosRef = useRef<number | null>(null)
  
  // Wikilink [[...]] autocomplete ref
  const wikilinkAutocompleteRef = useRef<LinkAutocompleteRef>(null)

  // Keep content ref updated
  useEffect(() => {
    contentRef.current = content
  }, [content])

  // Slash command handlers - need stable references
  const handleSlashActivate = useCallback((coords: { x: number; y: number }) => {
    setSlashMenuPosition(coords)
    setSlashQuery('')
    setSlashMenuOpen(true)
  }, [])

  const handleSlashDeactivate = useCallback(() => {
    setSlashMenuOpen(false)
    setSlashQuery('')
  }, [])

  const handleSlashQueryChange = useCallback((query: string) => {
    setSlashQuery(query)
  }, [])

  // Initialize Tiptap editor for edit mode
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4] },
      }),
      CodeBlockLowlight.configure({
        lowlight: getLowlight(),
        defaultLanguage: 'typescript',
      }),
      Placeholder.configure({
        placeholder: 'Start typing... (type "/" for commands)',
      }),
      Highlight.configure({
        multicolor: true,
      }),
      SlashCommandExtension.configure({
        onActivate: handleSlashActivate,
        onDeactivate: handleSlashDeactivate,
        onQueryChange: handleSlashQueryChange,
        onSelect: () => {}, // Handled by palette Enter key
      }),
      // AI Writing Suggestions - ghost text autocomplete
      AISuggestionExtension.configure({
        enabled: writingEnabled,
        triggerDelay: writingSettings.triggerDelay,
        autoTrigger: writingSettings.autoTrigger,
        suggestionLength: writingSettings.suggestionLength,
        getSuggestion,
      }),
      // Note: Link and Underline removed to avoid duplicate extension warnings
      // Use the full TiptapEditor for comprehensive editing features
    ],
    content: isEditing ? markdownToHtml(content) : '',
    editorProps: {
      attributes: {
        class: [
          'prose prose-sm sm:prose-base dark:prose-invert max-w-none',
          'focus:outline-none min-h-[1.5em] p-2 rounded-md',
          isDark ? 'bg-zinc-800/50' : 'bg-zinc-50',
        ].join(' '),
      },
    },
    onUpdate: ({ editor }) => {
      contentRef.current = htmlToMarkdown(editor.getHTML())
      
      // Check for @mention trigger
      if (onMentionTrigger) {
        const { from } = editor.state.selection
        const textBefore = editor.state.doc.textBetween(Math.max(0, from - 50), from, '\n')
        
        // Look for @ followed by word characters at the end
        const mentionMatch = textBefore.match(/@(\w*)$/)
        
        if (mentionMatch) {
          const query = mentionMatch[1] || ''
          
          // Get cursor position for dropdown placement
          const coords = editor.view.coordsAtPos(from)
          
          if (!mentionActive || query !== mentionQuery) {
            setMentionActive(true)
            setMentionQuery(query)
            mentionStartPosRef.current = from - query.length - 1 // Position of @
            onMentionTrigger(blockId, query, { x: coords.left, y: coords.bottom + 8 })
          }
        } else if (mentionActive) {
          // No longer in mention context
          setMentionActive(false)
          setMentionQuery('')
          mentionStartPosRef.current = null
        }
      }
    },
    editable: isEditing,
  }, [isEditing])

  // Wikilink [[...]] autocomplete
  const wikilinkAutocomplete = useWikilinkAutocomplete({
    editor,
    enabled: isEditing,
  })

  // Search function for wikilink autocomplete
  const searchStrandsForAutocomplete = useCallback(async (query: string): Promise<StrandSuggestion[]> => {
    try {
      const results = await searchStrands(query, 10)
      return results.map(r => ({
        path: r.path,
        title: r.title,
        icon: 'file' as const,
      }))
    } catch (error) {
      console.error('[EditableBlock] Strand search error:', error)
      return []
    }
  }, [])

  // Handle wikilink selection
  const handleWikilinkSelect = useCallback((suggestion: StrandSuggestion) => {
    if (suggestion.isCreateNew) {
      // For "create new", just insert the link - the strand will be created when saved
      wikilinkAutocomplete.insertLink(suggestion.path)
    } else {
      wikilinkAutocomplete.insertLink(suggestion.path, suggestion.title)
    }
  }, [wikilinkAutocomplete])

  // Check for wikilinks on editor update
  useEffect(() => {
    if (!editor || !isEditing) return

    // Create handler for editor updates
    const handleUpdate = () => {
      wikilinkAutocomplete.checkForWikilink()
    }

    // Listen to editor transactions
    editor.on('update', handleUpdate)
    editor.on('selectionUpdate', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
      editor.off('selectionUpdate', handleUpdate)
    }
  }, [editor, isEditing, wikilinkAutocomplete])

  // Set content when entering edit mode
  useEffect(() => {
    if (isEditing && editor) {
      const html = markdownToHtml(content)
      editor.commands.setContent(html)
      // Delay focus to ensure editor view is mounted
      requestAnimationFrame(() => {
        if (editor.view) {
          editor.commands.focus('end')
        }
      })
    }
  }, [isEditing, editor, content])

  // Handle click outside to end editing
  useEffect(() => {
    if (!isEditing) return

    const handleClickOutside = (e: MouseEvent) => {
      if (blockRef.current && !blockRef.current.contains(e.target as Node)) {
        onEndEdit(blockId, contentRef.current)
      }
    }

    // Delay to avoid immediate trigger
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEditing, blockId, onEndEdit])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isEditing) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to save and exit
      if (e.key === 'Escape') {
        e.preventDefault()
        onEndEdit(blockId, contentRef.current)
      }
      // Cmd+Enter to save and exit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        onEndEdit(blockId, contentRef.current)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, blockId, onEndEdit])

  // Handle block click to start editing
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!editable || isEditing) return
    e.preventDefault()
    e.stopPropagation()
    onStartEdit(blockId)
  }, [editable, isEditing, onStartEdit, blockId])

  // Handle tag button click from toolbar - opens QuickTagPopover
  const handleAddTag = useCallback(() => {
    if (!editor) return

    // Get selection position for popover placement
    const { from, to } = editor.state.selection
    const view = editor.view
    const start = view.coordsAtPos(from)
    const end = view.coordsAtPos(to)

    // Position below the selection, centered
    const left = (start.left + end.left) / 2
    const top = end.bottom + 8

    setTagPopoverPosition({ top, left })
    setTagPopoverOpen(true)
  }, [editor])

  // Handle image generation from selected text
  const handleGenerateImage = useCallback((prompt: string) => {
    setImageModalPrompt(prompt)
    setImageModalOpen(true)
  }, [])

  // Handle inserting generated image into document
  const handleInsertImage = useCallback((imageUrl: string, prompt: string) => {
    if (!editor) return

    // Insert image markdown below current block
    const imageMarkdown = `\n\n![${prompt}](${imageUrl})\n\n`
    const html = markdownToHtml(imageMarkdown)
    editor.commands.insertContent(html)
  }, [editor])

  // Handle slash command selection
  const handleSlashSelect = useCallback((command: BlockCommand) => {
    if (!editor) return

    // Get the slash extension storage
    const slashExt = editor.extensionManager.extensions.find(
      (ext) => ext.name === 'slashCommand'
    )
    const storage = slashExt?.storage as { isActive: boolean; query: string; startPos: number } | undefined

    // Delete the "/" and query using helper
    if (storage) {
      deleteSlashQuery(editor as any, storage, '/', handleSlashDeactivate)
    }

    // Handle special AI commands that need modals/panels
    if (command.id === 'generate-image') {
      setImageModalOpen(true)
      setImageModalPrompt('')
      setSlashMenuOpen(false)
      setSlashQuery('')
      return
    }

    if (command.id === 'research-panel' && onResearch) {
      // Open research with empty query to start fresh search
      onResearch('')
      setSlashMenuOpen(false)
      setSlashQuery('')
      return
    }

    // Get the markdown for this command
    const markdown = typeof command.markdown === 'function'
      ? command.markdown()
      : command.markdown

    if (markdown) {
      // Convert markdown to HTML and insert
      const html = markdownToHtml(markdown)
      editor.commands.insertContent(html)
    }

    setSlashMenuOpen(false)
    setSlashQuery('')
  }, [editor, handleSlashDeactivate, onResearch])

  // Handle closing the slash menu
  const handleSlashClose = useCallback(() => {
    // Just close the UI - the extension will detect the escape key
    // or user clicking outside and update its own state
    setSlashMenuOpen(false)
    setSlashQuery('')
  }, [])

  // Check if block has tags or suggestions
  const hasTags = block && ((block.tags?.length ?? 0) > 0 || (block.suggestedTags?.length ?? 0) > 0)

  // Render view mode (normal HTML)
  if (!isEditing) {
    const viewClassName = [
      'group relative transition-all duration-150',
      editable ? 'cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 rounded-md -mx-2 px-2' : '',
    ].filter(Boolean).join(' ')

    const hintClassName = [
      'text-xs px-2 py-0.5 rounded-full',
      isDark ? 'bg-zinc-700/80 text-zinc-300' : 'bg-zinc-200/80 text-zinc-600',
    ].join(' ')

    return (
      <div className="flex items-start gap-1">
        {/* Gutter indicator for blocks with tags */}
        <div className="w-6 flex-shrink-0 pt-1">
          {hasTags && block && (
            <BlockTagsGutterIndicator
              block={block}
              onClick={onTagClick}
            />
          )}
        </div>

        {/* Main block content */}
        <div
          ref={blockRef}
          data-block-id={blockId}
          onClick={handleClick}
          onMouseDown={(e) => {
            // Prevent text selection when clicking to edit
            if (editable && !isEditing) {
              e.preventDefault()
            }
          }}
          className={`flex-1 ${viewClassName}`}
          role={editable ? 'button' : undefined}
          tabIndex={editable ? 0 : undefined}
        >
          {/* Clickable overlay when editable - captures clicks before text selection */}
          {editable && (
            <div
              className="absolute inset-0 z-10 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                if (!isEditing) {
                  onStartEdit(blockId)
                }
              }}
            />
          )}
          {/* Edit hint overlay */}
          {editable && (
            <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className={hintClassName}>
                Click to edit
              </span>
            </div>
          )}
          {/* Render content as HTML */}
          <div
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
          />
        </div>
      </div>
    )
  }

  // Render edit mode (Tiptap editor)
  const editClassName = [
    'relative ring-2 rounded-md -mx-2 px-2',
    isDark ? 'ring-cyan-500/50' : 'ring-cyan-400/50',
  ].join(' ')

  const saveHintClassName = [
    'absolute -bottom-6 left-0 text-xs',
    isDark ? 'text-zinc-500' : 'text-zinc-400',
  ].join(' ')

  return (
    <div
      ref={blockRef}
      data-block-id={blockId}
      className={editClassName}
    >
      {/* Floating toolbar */}
      {editor && (
        <InlineFloatingToolbar
          editor={editor}
          isDark={isDark}
          onAddTag={handleAddTag}
          onResearch={onResearch}
          showImageGen={imageEnabled && imageSettings.showInToolbar}
          onGenerateImage={handleGenerateImage}
        />
      )}

      {/* Tag popover - opens when tag button clicked in toolbar */}
      {tagPopoverOpen && tagPopoverPosition && strandPath && (
        <QuickTagPopover
          isOpen={tagPopoverOpen}
          onClose={() => setTagPopoverOpen(false)}
          blockId={blockId}
          strandPath={strandPath}
          currentTags={currentTags ?? []}
          availableTags={availableTags ?? []}
          onAddTag={onTagAdd ?? (async () => {})}
          onRemoveTag={onTagRemove ?? (async () => {})}
          anchorPosition={tagPopoverPosition}
          isDark={isDark}
        />
      )}

      {/* Editor */}
      <EditorContent editor={editor} className="[&>.ProseMirror]:outline-none" />

      {/* Save hint */}
      <div className={saveHintClassName}>
        Press <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">Esc</kbd> or click outside to save
        {writingEnabled && (
          <span className="ml-3 text-purple-500 dark:text-purple-400">
            {writingStatus === 'loading' && '✨ AI thinking...'}
            {writingStatus === 'showing' && '✨ Tab to accept suggestion'}
          </span>
        )}
      </div>

      {/* Slash command palette */}
      <BlockCommandPalette
        isOpen={slashMenuOpen}
        position={slashMenuPosition}
        query={slashQuery}
        onSelect={handleSlashSelect}
        onClose={handleSlashClose}
        isDark={isDark}
        mode="slash"
      />

      {/* Image generation modal */}
      <ImageGenerationModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        initialPrompt={imageModalPrompt}
        onInsert={handleInsertImage}
        theme={theme}
      />

      {/* Wikilink [[...]] autocomplete */}
      <LinkAutocomplete
        ref={wikilinkAutocompleteRef}
        isOpen={wikilinkAutocomplete.state.isActive}
        onClose={wikilinkAutocomplete.close}
        onSelect={handleWikilinkSelect}
        searchStrands={searchStrandsForAutocomplete}
        query={wikilinkAutocomplete.state.query}
        position={wikilinkAutocomplete.state.position}
        theme={theme}
        allowCreate={true}
      />
    </div>
  )
}

export default EditableBlock
