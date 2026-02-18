/**
 * Glossary Edits Hook
 * Manages user modifications to auto-generated glossary terms
 *
 * Features:
 * - CRUD operations for term edits
 * - Merging with generated terms
 * - Undo/redo integration
 * - Persistent storage via SQL
 *
 * @module codex/hooks/useGlossaryEdits
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getDatabase } from '@/lib/codexDatabase'
import { useUndoRedo } from './useUndoRedo'
import type { GlossaryTerm } from './useGlossary'

// ============================================================================
// TYPES
// ============================================================================

export interface GlossaryEdit {
  id: string
  contentHash: string
  strandSlug?: string
  originalTerm: string
  editedTerm?: string
  editedDefinition?: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface GlossaryEditInput {
  contentHash: string
  strandSlug?: string
  originalTerm: string
  editedTerm?: string
  editedDefinition?: string
}

export interface UseGlossaryEditsOptions {
  strandSlug?: string
  autoLoad?: boolean
}

export interface UseGlossaryEditsReturn {
  /** Map of edits keyed by content hash */
  edits: Map<string, GlossaryEdit>
  /** Whether edits are loading */
  loading: boolean
  /** Error message if any */
  error: string | null
  /** Update a term */
  updateTerm: (contentHash: string, updates: Partial<GlossaryEditInput>) => Promise<void>
  /** Delete a term (soft delete) - requires existing edit record */
  deleteTerm: (contentHash: string) => Promise<void>
  /** Delete a term with auto-create - use when edit record may not exist */
  deleteTermWithCreate: (contentHash: string, originalTerm: string, strandSlug?: string) => Promise<void>
  /** Restore a deleted term */
  restoreTerm: (contentHash: string) => Promise<void>
  /** Merge edits with generated terms */
  mergeWithGenerated: (generatedTerms: GlossaryTerm[]) => GlossaryTerm[]
  /** Check if a term has been edited */
  hasEdit: (contentHash: string) => boolean
  /** Check if a term has been deleted */
  isDeleted: (contentHash: string) => boolean
  /** Reload edits from database */
  reload: () => Promise<void>
  /** Clear all edits for current strand */
  clearAll: () => Promise<void>
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateId(): string {
  return `ge_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function hashTerm(term: string): string {
  // Simple hash for matching terms
  let hash = 0
  for (let i = 0; i < term.length; i++) {
    const char = term.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `term_${Math.abs(hash).toString(36)}`
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function loadEdits(strandSlug?: string): Promise<GlossaryEdit[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const query = strandSlug
      ? `SELECT * FROM codex_glossary_edits WHERE strand_slug = ? ORDER BY updated_at DESC`
      : `SELECT * FROM codex_glossary_edits ORDER BY updated_at DESC`

    const rows = strandSlug
      ? await db.all(query, [strandSlug])
      : await db.all(query)

    return (rows as any[]).map(row => ({
      id: row.id,
      contentHash: row.content_hash,
      strandSlug: row.strand_slug || undefined,
      originalTerm: row.original_term,
      editedTerm: row.edited_term || undefined,
      editedDefinition: row.edited_definition || undefined,
      isDeleted: row.is_deleted === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (err) {
    console.error('[GlossaryEdits] Failed to load edits:', err)
    return []
  }
}

async function saveEdit(edit: GlossaryEdit): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    await db.run(
      `INSERT INTO codex_glossary_edits
       (id, content_hash, strand_slug, original_term, edited_term, edited_definition, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(content_hash, strand_slug) DO UPDATE SET
         edited_term = excluded.edited_term,
         edited_definition = excluded.edited_definition,
         is_deleted = excluded.is_deleted,
         updated_at = excluded.updated_at`,
      [
        edit.id,
        edit.contentHash,
        edit.strandSlug || null,
        edit.originalTerm,
        edit.editedTerm || null,
        edit.editedDefinition || null,
        edit.isDeleted ? 1 : 0,
        edit.createdAt,
        edit.updatedAt,
      ]
    )
    return true
  } catch (err) {
    console.error('[GlossaryEdits] Failed to save edit:', err)
    return false
  }
}

async function deleteEdit(contentHash: string, strandSlug?: string): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    const query = strandSlug
      ? `DELETE FROM codex_glossary_edits WHERE content_hash = ? AND strand_slug = ?`
      : `DELETE FROM codex_glossary_edits WHERE content_hash = ? AND strand_slug IS NULL`

    strandSlug
      ? await db.run(query, [contentHash, strandSlug])
      : await db.run(query, [contentHash])

    return true
  } catch (err) {
    console.error('[GlossaryEdits] Failed to delete edit:', err)
    return false
  }
}

async function clearAllEdits(strandSlug?: string): Promise<number> {
  const db = await getDatabase()
  if (!db) return 0

  try {
    const query = strandSlug
      ? `DELETE FROM codex_glossary_edits WHERE strand_slug = ?`
      : `DELETE FROM codex_glossary_edits`

    const result = strandSlug
      ? await db.run(query, [strandSlug])
      : await db.run(query)

    return (result as any).changes || 0
  } catch (err) {
    console.error('[GlossaryEdits] Failed to clear edits:', err)
    return 0
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useGlossaryEdits(options: UseGlossaryEditsOptions = {}): UseGlossaryEditsReturn {
  const { strandSlug, autoLoad = true } = options

  const [edits, setEdits] = useState<Map<string, GlossaryEdit>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Undo/redo integration
  const { pushUndoableAction, isReady: undoReady } = useUndoRedo({
    onApplyState: async (targetType, targetId, state, isUndo) => {
      if (targetType === 'glossary_term') {
        const editState = state as Partial<GlossaryEdit>

        if (editState.isDeleted !== undefined) {
          // Handle delete/restore
          const existingEdit = edits.get(targetId)
          if (existingEdit) {
            const updated: GlossaryEdit = {
              ...existingEdit,
              isDeleted: editState.isDeleted,
              updatedAt: new Date().toISOString(),
            }
            await saveEdit(updated)
            setEdits(prev => new Map(prev).set(targetId, updated))
          }
        } else if (editState.editedTerm !== undefined || editState.editedDefinition !== undefined) {
          // Handle edit update
          const existingEdit = edits.get(targetId)
          if (existingEdit) {
            const updated: GlossaryEdit = {
              ...existingEdit,
              editedTerm: editState.editedTerm ?? existingEdit.editedTerm,
              editedDefinition: editState.editedDefinition ?? existingEdit.editedDefinition,
              updatedAt: new Date().toISOString(),
            }
            await saveEdit(updated)
            setEdits(prev => new Map(prev).set(targetId, updated))
          }
        }

        return true
      }
      return false
    }
  })

  // Load edits on mount or when strand changes
  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const loaded = await loadEdits(strandSlug)
      const map = new Map<string, GlossaryEdit>()
      for (const edit of loaded) {
        map.set(edit.contentHash, edit)
      }
      setEdits(map)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load edits')
    } finally {
      setLoading(false)
    }
  }, [strandSlug])

  useEffect(() => {
    if (autoLoad) {
      reload()
    }
  }, [autoLoad, reload])

  // Update a term
  const updateTerm = useCallback(async (
    contentHash: string,
    updates: Partial<GlossaryEditInput>
  ): Promise<void> => {
    const existing = edits.get(contentHash)
    const now = new Date().toISOString()

    const beforeState = existing
      ? { editedTerm: existing.editedTerm, editedDefinition: existing.editedDefinition }
      : { editedTerm: undefined, editedDefinition: undefined }

    const edit: GlossaryEdit = existing
      ? {
          ...existing,
          editedTerm: updates.editedTerm ?? existing.editedTerm,
          editedDefinition: updates.editedDefinition ?? existing.editedDefinition,
          updatedAt: now,
        }
      : {
          id: generateId(),
          contentHash,
          strandSlug: updates.strandSlug || strandSlug,
          originalTerm: updates.originalTerm || '',
          editedTerm: updates.editedTerm,
          editedDefinition: updates.editedDefinition,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        }

    const afterState = { editedTerm: edit.editedTerm, editedDefinition: edit.editedDefinition }

    // Save to database
    const saved = await saveEdit(edit)
    if (!saved) {
      throw new Error('Failed to save edit')
    }

    // Update local state
    setEdits(prev => new Map(prev).set(contentHash, edit))

    // Push to undo stack
    if (undoReady) {
      await pushUndoableAction({
        actionType: 'learning',
        actionName: 'update',
        targetType: 'glossary_term',
        targetId: contentHash,
        beforeState,
        afterState,
      })
    }
  }, [edits, strandSlug, undoReady, pushUndoableAction])

  // Delete a term (soft delete) - requires existing edit record
  const deleteTerm = useCallback(async (contentHash: string): Promise<void> => {
    const existing = edits.get(contentHash)
    if (!existing) return

    const beforeState = { isDeleted: false }
    const afterState = { isDeleted: true }

    const updated: GlossaryEdit = {
      ...existing,
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    }

    await saveEdit(updated)
    setEdits(prev => new Map(prev).set(contentHash, updated))

    // Push to undo stack
    if (undoReady) {
      await pushUndoableAction({
        actionType: 'learning',
        actionName: 'delete',
        targetType: 'glossary_term',
        targetId: contentHash,
        beforeState,
        afterState,
      })
    }
  }, [edits, undoReady, pushUndoableAction])

  // Delete a term with auto-create - avoids stale closure issues
  // Use this when deleting a term that may not have an existing edit record
  const deleteTermWithCreate = useCallback(async (
    contentHash: string,
    originalTerm: string,
    termStrandSlug?: string
  ): Promise<void> => {
    const now = new Date().toISOString()
    const existing = edits.get(contentHash)

    const beforeState = existing ? { isDeleted: false } : null
    const afterState = { isDeleted: true }

    // Create or update the edit record with isDeleted: true
    const edit: GlossaryEdit = existing
      ? {
          ...existing,
          isDeleted: true,
          updatedAt: now,
        }
      : {
          id: generateId(),
          contentHash,
          strandSlug: termStrandSlug || strandSlug,
          originalTerm,
          isDeleted: true,
          createdAt: now,
          updatedAt: now,
        }

    await saveEdit(edit)
    setEdits(prev => new Map(prev).set(contentHash, edit))

    // Push to undo stack
    if (undoReady) {
      await pushUndoableAction({
        actionType: 'learning',
        actionName: 'delete',
        targetType: 'glossary_term',
        targetId: contentHash,
        beforeState: beforeState || { isDeleted: false },
        afterState,
      })
    }
  }, [edits, strandSlug, undoReady, pushUndoableAction])

  // Restore a deleted term
  const restoreTerm = useCallback(async (contentHash: string): Promise<void> => {
    const existing = edits.get(contentHash)
    if (!existing) return

    const beforeState = { isDeleted: true }
    const afterState = { isDeleted: false }

    const updated: GlossaryEdit = {
      ...existing,
      isDeleted: false,
      updatedAt: new Date().toISOString(),
    }

    await saveEdit(updated)
    setEdits(prev => new Map(prev).set(contentHash, updated))

    if (undoReady) {
      await pushUndoableAction({
        actionType: 'learning',
        actionName: 'update',
        targetType: 'glossary_term',
        targetId: contentHash,
        beforeState,
        afterState,
      })
    }
  }, [edits, undoReady, pushUndoableAction])

  // Merge edits with generated terms
  const mergeWithGenerated = useCallback((generatedTerms: GlossaryTerm[]): GlossaryTerm[] => {
    return generatedTerms
      .map(term => {
        const contentHash = hashTerm(term.term)
        const edit = edits.get(contentHash)

        if (!edit) return term

        // Skip deleted terms
        if (edit.isDeleted) return null

        // Apply edits
        return {
          ...term,
          term: edit.editedTerm || term.term,
          definition: edit.editedDefinition || term.definition,
          // Mark as edited for UI indication
          _edited: true,
        } as GlossaryTerm & { _edited?: boolean }
      })
      .filter((term): term is GlossaryTerm => term !== null)
  }, [edits])

  // Check helpers
  const hasEdit = useCallback((contentHash: string): boolean => {
    return edits.has(contentHash)
  }, [edits])

  const isDeleted = useCallback((contentHash: string): boolean => {
    const edit = edits.get(contentHash)
    return edit?.isDeleted ?? false
  }, [edits])

  // Clear all edits
  const clearAll = useCallback(async (): Promise<void> => {
    await clearAllEdits(strandSlug)
    setEdits(new Map())
  }, [strandSlug])

  return {
    edits,
    loading,
    error,
    updateTerm,
    deleteTerm,
    deleteTermWithCreate,
    restoreTerm,
    mergeWithGenerated,
    hasEdit,
    isDeleted,
    reload,
    clearAll,
  }
}

// Export utility for generating content hash
export { hashTerm as generateTermHash }

export default useGlossaryEdits
