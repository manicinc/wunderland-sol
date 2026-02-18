/**
 * useInlineEditor Hook - State management for inline WYSIWYG editing
 * @module codex/hooks/useInlineEditor
 *
 * Manages:
 * - Active editing block
 * - Keyboard shortcuts
 * - Draft auto-saving
 * - Content change tracking
 */

import { useState, useCallback, useEffect, useRef } from 'react'

// Draft storage key prefix
const DRAFT_PREFIX = 'codex-inline-draft:'

export interface InlineEditorState {
  /** ID of the currently editing block (null if none) */
  activeBlockId: string | null
  /** Whether there are unsaved changes */
  hasChanges: boolean
  /** Current markdown content */
  content: string
  /** Last saved time */
  lastSaved: Date | null
}

export interface UseInlineEditorOptions {
  /** File path for draft storage */
  filePath: string
  /** Initial markdown content */
  initialContent: string
  /** Callback when content changes */
  onContentChange?: (content: string) => void
  /** Auto-save debounce delay (ms) */
  autoSaveDelay?: number
}

export interface UseInlineEditorReturn {
  /** Current editor state */
  state: InlineEditorState
  /** Start editing a block */
  startEditing: (blockId: string) => void
  /** Stop editing the current block */
  stopEditing: () => void
  /** Update content for a specific block */
  updateBlockContent: (blockId: string, newContent: string) => void
  /** Update the full content */
  setContent: (content: string) => void
  /** Insert a new block at a specific index */
  insertBlockAt: (index: number, markdown: string) => void
  /** Delete a block by ID */
  deleteBlock: (blockId: string) => void
  /** Move a block from one position to another */
  moveBlock: (fromIndex: number, toIndex: number) => void
  /** Save draft to localStorage */
  saveDraft: () => void
  /** Load draft from localStorage */
  loadDraft: () => string | null
  /** Clear draft from localStorage */
  clearDraft: () => void
  /** Check if a draft exists */
  hasDraft: () => boolean
  /** Reset to initial content */
  resetContent: () => void
  /** Mark content as saved */
  markSaved: () => void
}

/**
 * Hook for managing inline WYSIWYG editor state
 */
export function useInlineEditor(options: UseInlineEditorOptions): UseInlineEditorReturn {
  const {
    filePath,
    initialContent,
    onContentChange,
    autoSaveDelay = 1000,
  } = options

  // State
  const [state, setState] = useState<InlineEditorState>({
    activeBlockId: null,
    hasChanges: false,
    content: initialContent,
    lastSaved: null,
  })

  // Refs for debouncing
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialContentRef = useRef(initialContent)

  // Update initial content ref when it changes
  useEffect(() => {
    initialContentRef.current = initialContent
  }, [initialContent])

  // Draft key for localStorage
  const draftKey = `${DRAFT_PREFIX}${filePath}`

  /**
   * Save draft to localStorage
   */
  const saveDraft = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      const draft = {
        content: state.content,
        savedAt: new Date().toISOString(),
        filePath,
      }
      localStorage.setItem(draftKey, JSON.stringify(draft))
      setState(prev => ({ ...prev, lastSaved: new Date() }))
    } catch (error) {
      console.warn('[useInlineEditor] Failed to save draft:', error)
    }
  }, [state.content, filePath, draftKey])

  /**
   * Load draft from localStorage
   */
  const loadDraft = useCallback((): string | null => {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(draftKey)
      if (!stored) return null

      const draft = JSON.parse(stored)
      return draft.content || null
    } catch {
      return null
    }
  }, [draftKey])

  /**
   * Clear draft from localStorage
   */
  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(draftKey)
    } catch (error) {
      console.warn('[useInlineEditor] Failed to clear draft:', error)
    }
  }, [draftKey])

  /**
   * Check if a draft exists
   */
  const hasDraft = useCallback((): boolean => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(draftKey) !== null
  }, [draftKey])

  /**
   * Start editing a block
   */
  const startEditing = useCallback((blockId: string) => {
    setState(prev => ({
      ...prev,
      activeBlockId: blockId,
    }))
  }, [])

  /**
   * Stop editing the current block
   */
  const stopEditing = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeBlockId: null,
    }))
  }, [])

  /**
   * Update the full content
   */
  const setContent = useCallback((content: string) => {
    setState(prev => ({
      ...prev,
      content,
      hasChanges: content !== initialContentRef.current,
    }))

    // Notify parent
    onContentChange?.(content)

    // Auto-save draft with debounce
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (typeof window !== 'undefined') {
        try {
          const draft = {
            content,
            savedAt: new Date().toISOString(),
            filePath,
          }
          localStorage.setItem(draftKey, JSON.stringify(draft))
        } catch (error) {
          console.warn('[useInlineEditor] Auto-save failed:', error)
        }
      }
    }, autoSaveDelay)
  }, [filePath, draftKey, autoSaveDelay, onContentChange])

  /**
   * Update content for a specific block
   * This reconstructs the full markdown after a block edit
   */
  const updateBlockContent = useCallback((blockId: string, newBlockContent: string) => {
    setState(prev => {
      // Parse markdown into blocks by splitting on double newlines
      const blocks = prev.content.split(/\n\n+/)

      // Find and update the block
      // Block IDs are like "block-0", "block-1", etc.
      const blockIndex = parseInt(blockId.replace('block-', ''), 10)

      if (blockIndex >= 0 && blockIndex < blocks.length) {
        blocks[blockIndex] = newBlockContent
      }

      const newContent = blocks.join('\n\n')

      // Notify parent
      onContentChange?.(newContent)

      return {
        ...prev,
        content: newContent,
        hasChanges: newContent !== initialContentRef.current,
      }
    })
  }, [onContentChange])

  /**
   * Insert a new block at a specific index
   */
  const insertBlockAt = useCallback((index: number, markdown: string) => {
    setState(prev => {
      // Parse markdown into blocks
      const blocks = prev.content.split(/\n\n+/).filter(b => b.trim())

      // Clamp index to valid range
      const safeIndex = Math.max(0, Math.min(index, blocks.length))

      // Insert the new block
      blocks.splice(safeIndex, 0, markdown.trim())

      const newContent = blocks.join('\n\n')

      // Notify parent
      onContentChange?.(newContent)

      return {
        ...prev,
        content: newContent,
        hasChanges: true,
        // Optionally start editing the new block
        activeBlockId: `block-${safeIndex}`,
      }
    })
  }, [onContentChange])

  /**
   * Delete a block by ID
   */
  const deleteBlock = useCallback((blockId: string) => {
    setState(prev => {
      // Parse markdown into blocks
      const blocks = prev.content.split(/\n\n+/).filter(b => b.trim())

      // Block IDs are like "block-0", "block-1", etc.
      const blockIndex = parseInt(blockId.replace('block-', ''), 10)

      if (blockIndex >= 0 && blockIndex < blocks.length) {
        blocks.splice(blockIndex, 1)
      }

      const newContent = blocks.join('\n\n')

      // Notify parent
      onContentChange?.(newContent)

      return {
        ...prev,
        content: newContent,
        hasChanges: newContent !== initialContentRef.current,
        activeBlockId: null,
      }
    })
  }, [onContentChange])

  /**
   * Move a block from one position to another
   */
  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    setState(prev => {
      // Parse markdown into blocks
      const blocks = prev.content.split(/\n\n+/).filter(b => b.trim())

      // Validate indices
      if (fromIndex < 0 || fromIndex >= blocks.length) return prev
      if (toIndex < 0 || toIndex >= blocks.length) return prev

      // Remove block from original position
      const [movedBlock] = blocks.splice(fromIndex, 1)

      // Insert at new position
      blocks.splice(toIndex, 0, movedBlock)

      const newContent = blocks.join('\n\n')

      // Notify parent
      onContentChange?.(newContent)

      return {
        ...prev,
        content: newContent,
        hasChanges: newContent !== initialContentRef.current,
      }
    })
  }, [onContentChange])

  /**
   * Reset to initial content
   */
  const resetContent = useCallback(() => {
    setState(prev => ({
      ...prev,
      content: initialContentRef.current,
      hasChanges: false,
      activeBlockId: null,
    }))
    clearDraft()
  }, [clearDraft])

  /**
   * Mark content as saved (after publishing)
   */
  const markSaved = useCallback(() => {
    initialContentRef.current = state.content
    setState(prev => ({
      ...prev,
      hasChanges: false,
      lastSaved: new Date(),
    }))
    clearDraft()
  }, [state.content, clearDraft])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to exit editing
      if (e.key === 'Escape' && state.activeBlockId) {
        e.preventDefault()
        stopEditing()
        return
      }

      // Cmd/Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        saveDraft()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.activeBlockId, stopEditing, saveDraft])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  return {
    state,
    startEditing,
    stopEditing,
    updateBlockContent,
    setContent,
    insertBlockAt,
    deleteBlock,
    moveBlock,
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    resetContent,
    markSaved,
  }
}

export default useInlineEditor
