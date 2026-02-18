/**
 * EditWeaveModal - Edit Existing Weave Settings
 * @module components/quarry/ui/creation/EditWeaveModal
 *
 * Modal for editing weave metadata, cover, visibility, and style.
 * Wraps CreateWeaveModal with edit-specific data loading and save logic.
 */

'use client'

import React, { useMemo, useCallback, useState, useEffect } from 'react'
import CreateWeaveModal, { type WeaveFormData } from './CreateWeaveModal'
import type { WeaveRecord } from '@/lib/codexDatabase'
import type { CoverSelection } from './CoverPhotoPicker'

// ============================================================================
// TYPES
// ============================================================================

export interface EditWeaveModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** The weave being edited */
  weave: WeaveRecord | null
  /** Save handler - receives partial updates */
  onSave: (weaveId: string, updates: Partial<WeaveRecord>) => Promise<void>
  /** Delete handler (optional) */
  onDelete?: (weaveId: string) => Promise<void>
  /** Whether dark mode is enabled */
  isDark?: boolean
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert WeaveRecord to WeaveFormData for the form
 */
function weaveRecordToFormData(weave: WeaveRecord): Partial<WeaveFormData> {
  const cover: CoverSelection | null = weave.coverImage
    ? {
        type: weave.coverPattern ? 'generated' : 'background',
        url: weave.coverImage,
        pattern: weave.coverPattern as CoverSelection['pattern'],
        primaryColor: weave.coverColor,
      }
    : null

  return {
    name: weave.name,
    slug: weave.slug,
    description: weave.description || '',
    cover,
    emoji: weave.emoji || '📚',
    accentColor: weave.accentColor || '#6366f1',
    visibility: weave.visibility || 'private',
    icon: '',
  }
}

/**
 * Convert WeaveFormData back to WeaveRecord updates
 */
function formDataToWeaveUpdates(formData: WeaveFormData): Partial<WeaveRecord> {
  return {
    name: formData.name,
    slug: formData.slug,
    description: formData.description || undefined,
    coverImage: formData.cover?.url,
    coverPattern: formData.cover?.pattern,
    coverColor: formData.cover?.primaryColor,
    emoji: formData.emoji,
    accentColor: formData.accentColor,
    visibility: formData.visibility,
    updatedAt: new Date().toISOString(),
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EditWeaveModal({
  isOpen,
  onClose,
  weave,
  onSave,
  onDelete,
  isDark = false,
}: EditWeaveModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Convert weave record to form data
  const initialValues = useMemo(() => {
    if (!weave) return undefined
    return weaveRecordToFormData(weave)
  }, [weave])

  // Reset delete state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false)
      setIsDeleting(false)
    }
  }, [isOpen])

  // Handle save
  const handleSubmit = useCallback(async (formData: WeaveFormData) => {
    if (!weave) return
    
    const updates = formDataToWeaveUpdates(formData)
    await onSave(weave.id, updates)
  }, [weave, onSave])

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!weave || !onDelete) return
    
    setIsDeleting(true)
    try {
      await onDelete(weave.id)
      onClose()
    } catch (err) {
      console.error('Failed to delete weave:', err)
      setIsDeleting(false)
    }
  }, [weave, onDelete, onClose])

  if (!weave) return null

  // Render delete confirmation overlay
  const deleteConfirmOverlay = showDeleteConfirm && onDelete ? (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
      <div className={`
        p-6 rounded-xl shadow-xl max-w-sm mx-4
        ${isDark ? 'bg-zinc-800' : 'bg-white'}
      `}>
        <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Delete Weave?
        </h3>
        <p className={`text-sm mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          This will permanently delete <strong>{weave.name}</strong> and all its looms and strands. This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${isDark
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }
            `}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              bg-red-500 text-white hover:bg-red-600
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isDeleting ? 'Deleting...' : 'Delete Weave'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <div className="relative">
      <CreateWeaveModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={handleSubmit}
        isDark={isDark}
        initialValues={initialValues}
        mode="edit"
      />
      {deleteConfirmOverlay}
    </div>
  )
}

// Named export
export { EditWeaveModal }

