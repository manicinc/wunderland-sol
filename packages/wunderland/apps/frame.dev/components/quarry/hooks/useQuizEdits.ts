/**
 * Quiz Edits Hook
 * Manages user modifications to auto-generated quiz questions
 *
 * Features:
 * - CRUD operations for quiz question edits
 * - Merging with generated questions
 * - Undo/redo integration
 * - Persistent storage via SQL
 *
 * @module codex/hooks/useQuizEdits
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { getDatabase } from '@/lib/codexDatabase'
import { useUndoRedo } from './useUndoRedo'
import type { QuizQuestion } from './useQuizGeneration'

// ============================================================================
// TYPES
// ============================================================================

export interface QuizEdit {
  id: string
  originalQuestionId: string
  cacheKey?: string
  editedQuestion?: string
  editedAnswer?: string
  editedOptions?: string[]
  editedExplanation?: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface QuizEditInput {
  originalQuestionId: string
  cacheKey?: string
  editedQuestion?: string
  editedAnswer?: string
  editedOptions?: string[]
  editedExplanation?: string
}

export interface UseQuizEditsOptions {
  cacheKey?: string
  autoLoad?: boolean
}

export interface UseQuizEditsReturn {
  /** Map of edits keyed by original question ID */
  edits: Map<string, QuizEdit>
  /** Whether edits are loading */
  loading: boolean
  /** Error message if any */
  error: string | null
  /** Update a question */
  updateQuestion: (questionId: string, updates: Partial<QuizEditInput>) => Promise<void>
  /** Delete a question (soft delete) */
  deleteQuestion: (questionId: string) => Promise<void>
  /** Restore a deleted question */
  restoreQuestion: (questionId: string) => Promise<void>
  /** Merge edits with generated questions */
  mergeWithGenerated: (generatedQuestions: QuizQuestion[]) => QuizQuestion[]
  /** Check if a question has been edited */
  hasEdit: (questionId: string) => boolean
  /** Check if a question has been deleted */
  isDeleted: (questionId: string) => boolean
  /** Reload edits from database */
  reload: () => Promise<void>
  /** Clear all edits for current cache */
  clearAll: () => Promise<void>
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateId(): string {
  return `qe_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function loadEdits(cacheKey?: string): Promise<QuizEdit[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const query = cacheKey
      ? `SELECT * FROM codex_quiz_edits WHERE cache_key = ? ORDER BY updated_at DESC`
      : `SELECT * FROM codex_quiz_edits ORDER BY updated_at DESC`

    const rows = cacheKey
      ? await db.all(query, [cacheKey])
      : await db.all(query)

    return (rows as any[]).map(row => ({
      id: row.id,
      originalQuestionId: row.original_question_id,
      cacheKey: row.cache_key || undefined,
      editedQuestion: row.edited_question || undefined,
      editedAnswer: row.edited_answer || undefined,
      editedOptions: row.edited_options ? JSON.parse(row.edited_options) : undefined,
      editedExplanation: row.edited_explanation || undefined,
      isDeleted: row.is_deleted === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (err) {
    console.error('[QuizEdits] Failed to load edits:', err)
    return []
  }
}

async function saveEdit(edit: QuizEdit): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    await db.run(
      `INSERT INTO codex_quiz_edits
       (id, original_question_id, cache_key, edited_question, edited_answer, edited_options, edited_explanation, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(original_question_id) DO UPDATE SET
         edited_question = excluded.edited_question,
         edited_answer = excluded.edited_answer,
         edited_options = excluded.edited_options,
         edited_explanation = excluded.edited_explanation,
         is_deleted = excluded.is_deleted,
         updated_at = excluded.updated_at`,
      [
        edit.id,
        edit.originalQuestionId,
        edit.cacheKey || null,
        edit.editedQuestion || null,
        edit.editedAnswer || null,
        edit.editedOptions ? JSON.stringify(edit.editedOptions) : null,
        edit.editedExplanation || null,
        edit.isDeleted ? 1 : 0,
        edit.createdAt,
        edit.updatedAt,
      ]
    )
    return true
  } catch (err) {
    console.error('[QuizEdits] Failed to save edit:', err)
    return false
  }
}

async function clearAllEdits(cacheKey?: string): Promise<number> {
  const db = await getDatabase()
  if (!db) return 0

  try {
    const query = cacheKey
      ? `DELETE FROM codex_quiz_edits WHERE cache_key = ?`
      : `DELETE FROM codex_quiz_edits`

    const result = cacheKey
      ? await db.run(query, [cacheKey])
      : await db.run(query)

    return (result as any).changes || 0
  } catch (err) {
    console.error('[QuizEdits] Failed to clear edits:', err)
    return 0
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useQuizEdits(options: UseQuizEditsOptions = {}): UseQuizEditsReturn {
  const { cacheKey, autoLoad = true } = options

  const [edits, setEdits] = useState<Map<string, QuizEdit>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Undo/redo integration
  const { pushUndoableAction, isReady: undoReady } = useUndoRedo({
    onApplyState: async (targetType, targetId, state, isUndo) => {
      if (targetType === 'quiz_question') {
        const editState = state as Partial<QuizEdit>
        const existingEdit = edits.get(targetId)

        if (existingEdit) {
          const updated: QuizEdit = {
            ...existingEdit,
            ...editState,
            updatedAt: new Date().toISOString(),
          }
          await saveEdit(updated)
          setEdits(prev => new Map(prev).set(targetId, updated))
        }

        return true
      }
      return false
    }
  })

  // Load edits on mount or when cache key changes
  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const loaded = await loadEdits(cacheKey)
      const map = new Map<string, QuizEdit>()
      for (const edit of loaded) {
        map.set(edit.originalQuestionId, edit)
      }
      setEdits(map)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load edits')
    } finally {
      setLoading(false)
    }
  }, [cacheKey])

  useEffect(() => {
    if (autoLoad) {
      reload()
    }
  }, [autoLoad, reload])

  // Update a question
  const updateQuestion = useCallback(async (
    questionId: string,
    updates: Partial<QuizEditInput>
  ): Promise<void> => {
    const existing = edits.get(questionId)
    const now = new Date().toISOString()

    const beforeState = existing
      ? {
          editedQuestion: existing.editedQuestion,
          editedAnswer: existing.editedAnswer,
          editedOptions: existing.editedOptions,
          editedExplanation: existing.editedExplanation,
        }
      : {
          editedQuestion: undefined,
          editedAnswer: undefined,
          editedOptions: undefined,
          editedExplanation: undefined,
        }

    const edit: QuizEdit = existing
      ? {
          ...existing,
          editedQuestion: updates.editedQuestion ?? existing.editedQuestion,
          editedAnswer: updates.editedAnswer ?? existing.editedAnswer,
          editedOptions: updates.editedOptions ?? existing.editedOptions,
          editedExplanation: updates.editedExplanation ?? existing.editedExplanation,
          updatedAt: now,
        }
      : {
          id: generateId(),
          originalQuestionId: questionId,
          cacheKey: updates.cacheKey || cacheKey,
          editedQuestion: updates.editedQuestion,
          editedAnswer: updates.editedAnswer,
          editedOptions: updates.editedOptions,
          editedExplanation: updates.editedExplanation,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        }

    const afterState = {
      editedQuestion: edit.editedQuestion,
      editedAnswer: edit.editedAnswer,
      editedOptions: edit.editedOptions,
      editedExplanation: edit.editedExplanation,
    }

    // Save to database
    const saved = await saveEdit(edit)
    if (!saved) {
      throw new Error('Failed to save edit')
    }

    // Update local state
    setEdits(prev => new Map(prev).set(questionId, edit))

    // Push to undo stack
    if (undoReady) {
      await pushUndoableAction({
        actionType: 'learning',
        actionName: 'update',
        targetType: 'quiz_question',
        targetId: questionId,
        beforeState,
        afterState,
      })
    }
  }, [edits, cacheKey, undoReady, pushUndoableAction])

  // Delete a question (soft delete)
  const deleteQuestion = useCallback(async (questionId: string): Promise<void> => {
    const existing = edits.get(questionId)

    const now = new Date().toISOString()
    const edit: QuizEdit = existing
      ? { ...existing, isDeleted: true, updatedAt: now }
      : {
          id: generateId(),
          originalQuestionId: questionId,
          cacheKey,
          isDeleted: true,
          createdAt: now,
          updatedAt: now,
        }

    await saveEdit(edit)
    setEdits(prev => new Map(prev).set(questionId, edit))

    if (undoReady) {
      await pushUndoableAction({
        actionType: 'learning',
        actionName: 'delete',
        targetType: 'quiz_question',
        targetId: questionId,
        beforeState: { isDeleted: false },
        afterState: { isDeleted: true },
      })
    }
  }, [edits, cacheKey, undoReady, pushUndoableAction])

  // Restore a deleted question
  const restoreQuestion = useCallback(async (questionId: string): Promise<void> => {
    const existing = edits.get(questionId)
    if (!existing) return

    const updated: QuizEdit = {
      ...existing,
      isDeleted: false,
      updatedAt: new Date().toISOString(),
    }

    await saveEdit(updated)
    setEdits(prev => new Map(prev).set(questionId, updated))

    if (undoReady) {
      await pushUndoableAction({
        actionType: 'learning',
        actionName: 'update',
        targetType: 'quiz_question',
        targetId: questionId,
        beforeState: { isDeleted: true },
        afterState: { isDeleted: false },
      })
    }
  }, [edits, undoReady, pushUndoableAction])

  // Merge edits with generated questions
  const mergeWithGenerated = useCallback((generatedQuestions: QuizQuestion[]): QuizQuestion[] => {
    return generatedQuestions
      .map(question => {
        const edit = edits.get(question.id)

        if (!edit) return question

        // Skip deleted questions
        if (edit.isDeleted) return null

        // Apply edits
        return {
          ...question,
          question: edit.editedQuestion || question.question,
          answer: edit.editedAnswer || question.answer,
          options: edit.editedOptions || question.options,
          explanation: edit.editedExplanation || question.explanation,
          // Mark as edited for UI indication
          _edited: true,
        } as QuizQuestion & { _edited?: boolean }
      })
      .filter((question): question is QuizQuestion => question !== null)
  }, [edits])

  // Check helpers
  const hasEdit = useCallback((questionId: string): boolean => {
    return edits.has(questionId)
  }, [edits])

  const isDeleted = useCallback((questionId: string): boolean => {
    const edit = edits.get(questionId)
    return edit?.isDeleted ?? false
  }, [edits])

  // Clear all edits
  const clearAll = useCallback(async (): Promise<void> => {
    await clearAllEdits(cacheKey)
    setEdits(new Map())
  }, [cacheKey])

  return {
    edits,
    loading,
    error,
    updateQuestion,
    deleteQuestion,
    restoreQuestion,
    mergeWithGenerated,
    hasEdit,
    isDeleted,
    reload,
    clearAll,
  }
}

export default useQuizEdits
