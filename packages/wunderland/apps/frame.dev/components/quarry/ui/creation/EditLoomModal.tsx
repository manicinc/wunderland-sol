/**
 * EditLoomModal - Edit Existing Loom Settings
 * @module components/quarry/ui/creation/EditLoomModal
 *
 * Modal for editing loom metadata, cover, and style.
 * Wraps CreateLoomModal with edit-specific data loading and save logic.
 */

'use client'

import React, { useMemo, useCallback, useState, useEffect } from 'react'
import CreateLoomModal, { type LoomFormData, type ParentOption } from './CreateLoomModal'
import type { LoomRecord } from '@/lib/codexDatabase'
import type { CoverSelection } from './CoverPhotoPicker'

// ============================================================================
// TYPES
// ============================================================================

export interface EditLoomModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** The loom being edited */
  loom: LoomRecord | null
  /** Save handler - receives partial updates */
  onSave: (loomId: string, updates: Partial<LoomRecord>) => Promise<void>
  /** Delete handler (optional) */
  onDelete?: (loomId: string) => Promise<void>
  /** Move handler - for changing parent (optional) */
  onMove?: (loomId: string, newParentPath: string) => Promise<void>
  /** Available parent options for moving */
  parentOptions?: ParentOption[]
  /** Whether dark mode is enabled */
  isDark?: boolean
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert LoomRecord to LoomFormData for the form
 */
function loomRecordToFormData(loom: LoomRecord): Partial<LoomFormData> {
  const cover: CoverSelection | null = loom.coverImage
    ? {
        type: loom.coverPattern ? 'generated' : 'background',
        url: loom.coverImage,
        pattern: loom.coverPattern as CoverSelection['pattern'],
        primaryColor: loom.coverColor,
      }
    : null

  // Extract parent path from loom path
  const pathParts = loom.path.split('/')
  pathParts.pop() // Remove loom slug
  const parentPath = pathParts.join('/') + '/'

  return {
    name: loom.name,
    slug: loom.slug,
    description: loom.description || '',
    parentPath,
    parentName: '', // Will be determined by parent options
    cover,
    emoji: loom.emoji || '📁',
    accentColor: loom.accentColor || '#6366f1',
  }
}

/**
 * Convert LoomFormData back to LoomRecord updates
 */
function formDataToLoomUpdates(formData: LoomFormData): Partial<LoomRecord> {
  return {
    name: formData.name,
    slug: formData.slug,
    description: formData.description || undefined,
    coverImage: formData.cover?.url,
    coverPattern: formData.cover?.pattern,
    coverColor: formData.cover?.primaryColor,
    emoji: formData.emoji,
    accentColor: formData.accentColor,
    updatedAt: new Date().toISOString(),
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EditLoomModal({
  isOpen,
  onClose,
  loom,
  onSave,
  onDelete,
  onMove,
  parentOptions = [],
  isDark = false,
}: EditLoomModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [originalParentPath, setOriginalParentPath] = useState('')

  // Convert loom record to form data
  const initialValues = useMemo(() => {
    if (!loom) return undefined
    const values = loomRecordToFormData(loom)
    
    // Find parent name from options
    if (values.parentPath && parentOptions.length > 0) {
      const parent = parentOptions.find(p => p.path === values.parentPath)
      if (parent) {
        values.parentName = parent.name
      }
    }
    
    return values
  }, [loom, parentOptions])

  // Track original parent for move detection
  useEffect(() => {
    if (loom && isOpen) {
      const pathParts = loom.path.split('/')
      pathParts.pop()
      setOriginalParentPath(pathParts.join('/') + '/')
    }
  }, [loom, isOpen])

  // Reset delete state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false)
      setIsDeleting(false)
    }
  }, [isOpen])

  // Handle save
  const handleSubmit = useCallback(async (formData: LoomFormData) => {
    if (!loom) return
    
    const updates = formDataToLoomUpdates(formData)
    
    // Check if parent changed (move operation)
    if (onMove && formData.parentPath !== originalParentPath) {
      await onMove(loom.id, formData.parentPath)
    }
    
    // Save other updates
    await onSave(loom.id, updates)
  }, [loom, onSave, onMove, originalParentPath])

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!loom || !onDelete) return
    
    setIsDeleting(true)
    try {
      await onDelete(loom.id)
      onClose()
    } catch (err) {
      console.error('Failed to delete loom:', err)
      setIsDeleting(false)
    }
  }, [loom, onDelete, onClose])

  if (!loom) return null

  // Render delete confirmation overlay
  const deleteConfirmOverlay = showDeleteConfirm && onDelete ? (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
      <div className={`
        p-6 rounded-xl shadow-xl max-w-sm mx-4
        ${isDark ? 'bg-zinc-800' : 'bg-white'}
      `}>
        <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Delete Loom?
        </h3>
        <p className={`text-sm mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          This will permanently delete <strong>{loom.name}</strong> and all its strands. This action cannot be undone.
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
            {isDeleting ? 'Deleting...' : 'Delete Loom'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <div className="relative">
      <CreateLoomModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={handleSubmit}
        isDark={isDark}
        initialValues={initialValues}
        initialParentPath={originalParentPath}
        parentOptions={parentOptions}
        mode="edit"
      />
      {deleteConfirmOverlay}
    </div>
  )
}

// Named export
export { EditLoomModal }

