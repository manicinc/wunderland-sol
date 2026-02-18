/**
 * useWriterDraft Hook
 * @module components/quarry/ui/writer/hooks/useWriterDraft
 *
 * Manages draft auto-saving for the writer widget.
 * Provides automatic saving, draft recovery, and persistence to IndexedDB.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { saveDraft, getDraft, getAllDrafts, deleteDraft, type DraftRecord } from '@/lib/codexDatabase'

// ============================================================================
// TYPES
// ============================================================================

export interface WriterDraftState {
  /** Current draft ID */
  draftId: string | null
  /** Draft content */
  content: string
  /** Draft title (extracted from content or custom) */
  title: string
  /** Target path for the draft */
  targetPath: string
  /** Whether draft has unsaved changes */
  isDirty: boolean
  /** Save status */
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  /** Last saved timestamp */
  lastSavedAt: Date | null
  /** Word count */
  wordCount: number
  /** Error message if any */
  error: string | null
}

export interface WriterDraftActions {
  /** Update content and mark as dirty */
  setContent: (content: string) => void
  /** Set target path for saving */
  setTargetPath: (path: string) => void
  /** Manually trigger save */
  save: () => Promise<void>
  /** Create new draft */
  createNew: (initialContent?: string) => void
  /** Load existing draft by ID */
  loadDraft: (draftId: string) => Promise<void>
  /** Clear current draft */
  clear: () => void
  /** Get all saved drafts */
  getAllDrafts: () => Promise<DraftRecord[]>
  /** Delete a draft */
  deleteDraft: (draftId: string) => Promise<void>
}

export interface UseWriterDraftOptions {
  /** Initial content */
  initialContent?: string
  /** Existing draft ID to load */
  existingDraftId?: string
  /** Custom target path */
  customPath?: string
  /** Auto-save interval in ms (default: 30000) */
  autoSaveInterval?: number
  /** Whether auto-save is enabled (default: true) */
  autoSaveEnabled?: boolean
  /** Callback when content changes */
  onChange?: (content: string, draftId: string | null) => void
  /** Callback when draft is saved */
  onSave?: (draftId: string) => void
}

export interface UseWriterDraftReturn extends WriterDraftState, WriterDraftActions {}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_AUTO_SAVE_INTERVAL = 30000 // 30 seconds
const DEFAULT_TARGET_PATH = 'weaves/fabric/'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract title from markdown content
 */
function extractTitle(content: string): string {
  if (!content.trim()) return 'Untitled'

  // Try to find first heading
  const headingMatch = content.match(/^#+ (.+)$/m)
  if (headingMatch) return headingMatch[1].trim()

  // Fall back to first non-empty line
  const firstLine = content.split('\n').find((line) => line.trim())
  if (firstLine) return firstLine.trim().slice(0, 50)

  return 'Untitled'
}

/**
 * Calculate word count
 */
function countWords(content: string): number {
  const trimmed = content.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

/**
 * Generate draft path
 */
function generateDraftPath(basePath: string): string {
  const date = new Date()
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
  const timestamp = Date.now()
  return `${basePath}untitled-${dateStr}-${timestamp}.md`
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useWriterDraft(options: UseWriterDraftOptions = {}): UseWriterDraftReturn {
  const {
    initialContent = '',
    existingDraftId,
    customPath,
    autoSaveInterval = DEFAULT_AUTO_SAVE_INTERVAL,
    autoSaveEnabled = true,
    onChange,
    onSave,
  } = options

  // State
  const [draftId, setDraftId] = useState<string | null>(existingDraftId || null)
  const [content, setContentState] = useState(initialContent)
  const [targetPath, setTargetPath] = useState(customPath || DEFAULT_TARGET_PATH)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Refs for callbacks and interval
  const contentRef = useRef(content)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const autoSaveIntervalRef = useRef<NodeJS.Timeout>()

  // Keep content ref updated
  useEffect(() => {
    contentRef.current = content
  }, [content])

  // Derived state
  const title = extractTitle(content)
  const wordCount = countWords(content)

  // ============================================================================
  // SAVE FUNCTION
  // ============================================================================

  const save = useCallback(async () => {
    const currentContent = contentRef.current
    
    // Don't save empty content
    if (!currentContent.trim()) return

    setSaveStatus('saving')
    setError(null)

    try {
      // Generate ID if new draft
      const id = draftId || crypto.randomUUID()
      const path = customPath || generateDraftPath(targetPath)
      const currentTitle = extractTitle(currentContent)

      const metadata = JSON.stringify({
        createdAt: new Date().toISOString(),
        wordCount: countWords(currentContent),
        lastSaved: new Date().toISOString(),
      })

      await saveDraft({
        id,
        type: 'strand',
        path,
        title: currentTitle,
        content: currentContent,
        metadata,
        autoSaved: true,
      })

      // Update state
      if (!draftId) setDraftId(id)
      setIsDirty(false)
      setSaveStatus('saved')
      setLastSavedAt(new Date())
      onSave?.(id)

      // Reset to idle after a moment
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('[useWriterDraft] Save failed:', err)
      setSaveStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to save draft')
    }
  }, [draftId, targetPath, customPath, onSave])

  // ============================================================================
  // CONTENT UPDATE
  // ============================================================================

  const setContent = useCallback((newContent: string) => {
    setContentState(newContent)
    setIsDirty(true)
    onChange?.(newContent, draftId)
  }, [draftId, onChange])

  // ============================================================================
  // AUTO-SAVE
  // ============================================================================

  useEffect(() => {
    if (!autoSaveEnabled) return

    autoSaveIntervalRef.current = setInterval(() => {
      if (isDirty && contentRef.current.trim()) {
        save()
      }
    }, autoSaveInterval)

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current)
      }
    }
  }, [autoSaveEnabled, autoSaveInterval, isDirty, save])

  // ============================================================================
  // DRAFT OPERATIONS
  // ============================================================================

  const createNew = useCallback((initialContent: string = '') => {
    setDraftId(null)
    setContentState(initialContent)
    setIsDirty(false)
    setSaveStatus('idle')
    setLastSavedAt(null)
    setError(null)
  }, [])

  const loadDraft = useCallback(async (id: string) => {
    try {
      const draft = await getDraft(id)
      if (draft) {
        setDraftId(draft.id)
        setContentState(draft.content)
        setIsDirty(false)
        setSaveStatus('idle')
        setLastSavedAt(new Date(draft.updatedAt))
        setError(null)
      } else {
        setError('Draft not found')
      }
    } catch (err) {
      console.error('[useWriterDraft] Failed to load draft:', err)
      setError(err instanceof Error ? err.message : 'Failed to load draft')
    }
  }, [])

  const clear = useCallback(() => {
    setDraftId(null)
    setContentState('')
    setIsDirty(false)
    setSaveStatus('idle')
    setLastSavedAt(null)
    setError(null)
  }, [])

  const getAllDraftsAction = useCallback(async (): Promise<DraftRecord[]> => {
    try {
      return await getAllDrafts()
    } catch (err) {
      console.error('[useWriterDraft] Failed to get drafts:', err)
      return []
    }
  }, [])

  const deleteDraftAction = useCallback(async (id: string) => {
    try {
      await deleteDraft(id)
      if (draftId === id) {
        clear()
      }
    } catch (err) {
      console.error('[useWriterDraft] Failed to delete draft:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete draft')
    }
  }, [draftId, clear])

  // ============================================================================
  // LOAD EXISTING DRAFT ON MOUNT
  // ============================================================================

  useEffect(() => {
    if (existingDraftId) {
      loadDraft(existingDraftId)
    }
  }, [existingDraftId, loadDraft])

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current)
    }
  }, [])

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    draftId,
    content,
    title,
    targetPath,
    isDirty,
    saveStatus,
    lastSavedAt,
    wordCount,
    error,

    // Actions
    setContent,
    setTargetPath,
    save,
    createNew,
    loadDraft,
    clear,
    getAllDrafts: getAllDraftsAction,
    deleteDraft: deleteDraftAction,
  }
}

export default useWriterDraft

