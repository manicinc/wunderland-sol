/**
 * Quiz Presets Hook
 * Manages saved quiz configurations for quick access
 *
 * Features:
 * - Save quiz configurations (strands, settings)
 * - Load and apply presets
 * - Track usage and favorites
 * - Persistent storage via SQL
 *
 * @module codex/hooks/useQuizPresets
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { getDatabase } from '@/lib/codexDatabase'

// ============================================================================
// TYPES
// ============================================================================

export interface QuizPresetSettings {
  maxQuestions: number
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  questionTypes: ('multiple_choice' | 'true_false' | 'fill_blank')[]
}

export interface QuizPreset {
  id: string
  name: string
  description?: string
  strandIds: string[]
  strandPaths: string[]
  settings: QuizPresetSettings
  isFavorite: boolean
  useCount: number
  lastUsedAt?: string
  createdAt: string
  updatedAt: string
}

export interface UseQuizPresetsReturn {
  /** List of all presets */
  presets: QuizPreset[]
  /** Whether presets are loading */
  loading: boolean
  /** Error message if any */
  error: string | null
  /** Create a new preset */
  createPreset: (preset: Omit<QuizPreset, 'id' | 'useCount' | 'createdAt' | 'updatedAt'>) => Promise<QuizPreset>
  /** Update an existing preset */
  updatePreset: (id: string, updates: Partial<QuizPreset>) => Promise<void>
  /** Delete a preset */
  deletePreset: (id: string) => Promise<void>
  /** Use a preset (increments usage count) */
  usePreset: (id: string) => Promise<QuizPreset | null>
  /** Toggle favorite status */
  toggleFavorite: (id: string) => Promise<void>
  /** Reload presets from database */
  reload: () => Promise<void>
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateId(): string {
  return `qp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function ensureTable(): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  await db.run(`
    CREATE TABLE IF NOT EXISTS codex_quiz_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      strand_ids TEXT NOT NULL,
      strand_paths TEXT NOT NULL,
      settings TEXT NOT NULL,
      is_favorite INTEGER DEFAULT 0,
      use_count INTEGER DEFAULT 0,
      last_used_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
}

async function loadPresets(): Promise<QuizPreset[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    await ensureTable()

    const rows = await db.all(
      'SELECT * FROM codex_quiz_presets ORDER BY is_favorite DESC, use_count DESC, updated_at DESC'
    )

    return (rows as any[]).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      strandIds: JSON.parse(row.strand_ids),
      strandPaths: JSON.parse(row.strand_paths),
      settings: JSON.parse(row.settings),
      isFavorite: row.is_favorite === 1,
      useCount: row.use_count,
      lastUsedAt: row.last_used_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (err) {
    console.error('[useQuizPresets] Failed to load presets:', err)
    return []
  }
}

async function savePreset(preset: QuizPreset): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  await ensureTable()

  await db.run(
    `INSERT OR REPLACE INTO codex_quiz_presets
     (id, name, description, strand_ids, strand_paths, settings, is_favorite, use_count, last_used_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      preset.id,
      preset.name,
      preset.description || null,
      JSON.stringify(preset.strandIds),
      JSON.stringify(preset.strandPaths),
      JSON.stringify(preset.settings),
      preset.isFavorite ? 1 : 0,
      preset.useCount,
      preset.lastUsedAt || null,
      preset.createdAt,
      preset.updatedAt,
    ]
  )
}

async function removePreset(id: string): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  await db.run('DELETE FROM codex_quiz_presets WHERE id = ?', [id])
}

// ============================================================================
// HOOK
// ============================================================================

export function useQuizPresets(): UseQuizPresetsReturn {
  const [presets, setPresets] = useState<QuizPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load presets on mount
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await loadPresets()
      setPresets(loaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load presets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Create a new preset
  const createPreset = useCallback(async (
    preset: Omit<QuizPreset, 'id' | 'useCount' | 'createdAt' | 'updatedAt'>
  ): Promise<QuizPreset> => {
    const now = new Date().toISOString()
    const newPreset: QuizPreset = {
      ...preset,
      id: generateId(),
      useCount: 0,
      createdAt: now,
      updatedAt: now,
    }

    await savePreset(newPreset)
    setPresets(prev => [newPreset, ...prev])
    return newPreset
  }, [])

  // Update an existing preset
  const updatePreset = useCallback(async (id: string, updates: Partial<QuizPreset>) => {
    const existing = presets.find(p => p.id === id)
    if (!existing) return

    const now = new Date().toISOString()
    const updated: QuizPreset = {
      ...existing,
      ...updates,
      id, // Ensure ID can't be changed
      updatedAt: now,
    }

    await savePreset(updated)
    setPresets(prev => prev.map(p => p.id === id ? updated : p))
  }, [presets])

  // Delete a preset
  const deletePreset = useCallback(async (id: string) => {
    await removePreset(id)
    setPresets(prev => prev.filter(p => p.id !== id))
  }, [])

  // Use a preset (increments usage count)
  const usePreset = useCallback(async (id: string): Promise<QuizPreset | null> => {
    const preset = presets.find(p => p.id === id)
    if (!preset) return null

    const now = new Date().toISOString()
    const updated: QuizPreset = {
      ...preset,
      useCount: preset.useCount + 1,
      lastUsedAt: now,
      updatedAt: now,
    }

    await savePreset(updated)
    setPresets(prev => prev.map(p => p.id === id ? updated : p))
    return updated
  }, [presets])

  // Toggle favorite status
  const toggleFavorite = useCallback(async (id: string) => {
    const preset = presets.find(p => p.id === id)
    if (!preset) return

    await updatePreset(id, { isFavorite: !preset.isFavorite })
  }, [presets, updatePreset])

  return {
    presets,
    loading,
    error,
    createPreset,
    updatePreset,
    deletePreset,
    usePreset,
    toggleFavorite,
    reload: load,
  }
}

export default useQuizPresets
