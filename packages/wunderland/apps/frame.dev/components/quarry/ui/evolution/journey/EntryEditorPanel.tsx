/**
 * EntryEditorPanel
 * 
 * Right panel of the journey view for viewing and editing entries.
 * Shows breadcrumb navigation, date picker, title, and content editor.
 * 
 * @module components/quarry/ui/evolution/journey/EntryEditorPanel
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Trash2, Save, ChevronRight, FileText, Link2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { JourneyEntryWithMeta, JourneyEntryFormData, BranchColorKey } from '@/lib/analytics/journeyTypes'
import { BRANCH_COLORS } from '@/lib/analytics/journeyTypes'
import { format, parseISO } from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

export interface EntryEditorPanelProps {
  entry: JourneyEntryWithMeta | null
  isNew?: boolean
  defaultBranchId?: string
  defaultSectionId?: string | null
  defaultDate?: string
  onSave: (data: JourneyEntryFormData) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
  isDark: boolean
  className?: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EntryEditorPanel({
  entry,
  isNew = false,
  defaultBranchId,
  defaultSectionId,
  defaultDate,
  onSave,
  onDelete,
  onClose,
  isDark,
  className,
}: EntryEditorPanelProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [branchId, setBranchId] = useState('')
  const [sectionId, setSectionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form from entry or defaults
  useEffect(() => {
    if (entry) {
      setTitle(entry.title)
      setContent(entry.content)
      setDate(entry.date)
      setBranchId(entry.branchId)
      setSectionId(entry.sectionId)
      setHasChanges(false)
    } else if (isNew) {
      setTitle('')
      setContent('')
      setDate(defaultDate || format(new Date(), 'yyyy-MM-dd'))
      setBranchId(defaultBranchId || '')
      setSectionId(defaultSectionId ?? null)
      setHasChanges(false)
    }
  }, [entry, isNew, defaultBranchId, defaultSectionId, defaultDate])

  // Track changes
  useEffect(() => {
    if (entry) {
      const changed = 
        title !== entry.title ||
        content !== entry.content ||
        date !== entry.date
      setHasChanges(changed)
    } else if (isNew) {
      setHasChanges(title.length > 0 || content.length > 0)
    }
  }, [entry, isNew, title, content, date])

  const handleSave = useCallback(async () => {
    if (!branchId || !title.trim()) return
    
    setSaving(true)
    try {
      await onSave({
        branchId,
        sectionId,
        title: title.trim(),
        content,
        date,
      })
      setHasChanges(false)
    } catch (err) {
      console.error('Failed to save entry:', err)
    } finally {
      setSaving(false)
    }
  }, [branchId, sectionId, title, content, date, onSave])

  const handleDelete = useCallback(async () => {
    if (!entry) return
    
    const confirmed = window.confirm('Are you sure you want to delete this entry?')
    if (!confirmed) return
    
    setDeleting(true)
    try {
      await onDelete(entry.id)
    } catch (err) {
      console.error('Failed to delete entry:', err)
    } finally {
      setDeleting(false)
    }
  }, [entry, onDelete])

  const handleClose = useCallback(() => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Discard them?')
      if (!confirmed) return
    }
    onClose()
  }, [hasChanges, onClose])

  // Empty state
  if (!entry && !isNew) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center h-full',
        isDark ? 'bg-zinc-900/50 text-zinc-500' : 'bg-zinc-50 text-zinc-400',
        className
      )}>
        <FileText className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-sm">Select an entry to view details</p>
      </div>
    )
  }

  const branchColor = entry?.branchColor ? BRANCH_COLORS[entry.branchColor] : null

  return (
    <div className={cn(
      'flex flex-col h-full',
      isDark ? 'bg-zinc-900/50' : 'bg-white',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between p-4 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm">
          {entry?.branchName && (
            <>
              <span
                className="font-medium"
                style={{ color: branchColor?.hex }}
              >
                Branch: {entry.branchName}
              </span>
              {entry.sectionName && (
                <>
                  <ChevronRight className={cn(
                    'w-4 h-4',
                    isDark ? 'text-zinc-600' : 'text-zinc-400'
                  )} />
                  <span className={cn(isDark ? 'text-zinc-300' : 'text-zinc-600')}>
                    {entry.sectionName}
                  </span>
                </>
              )}
            </>
          )}
          {isNew && !entry && (
            <span className={cn(isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              New Entry
            </span>
          )}
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-2">
          <Calendar className={cn('w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cn(
              'text-sm bg-transparent outline-none',
              isDark ? 'text-zinc-300' : 'text-zinc-600'
            )}
          />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            isDark
              ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
          )}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry title..."
          className={cn(
            'w-full text-2xl font-bold bg-transparent outline-none mb-4',
            isDark
              ? 'text-zinc-100 placeholder:text-zinc-600'
              : 'text-zinc-900 placeholder:text-zinc-400'
          )}
        />

        {/* Content */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your thoughts..."
          className={cn(
            'w-full min-h-[300px] text-base bg-transparent outline-none resize-none leading-relaxed',
            isDark
              ? 'text-zinc-300 placeholder:text-zinc-600'
              : 'text-zinc-700 placeholder:text-zinc-400'
          )}
        />

        {/* Source info */}
        {entry && entry.sourceType !== 'custom' && (
          <div className={cn(
            'mt-6 p-4 rounded-lg border',
            isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Link2 className={cn('w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
              <span className={cn(
                'text-sm font-medium',
                isDark ? 'text-zinc-300' : 'text-zinc-600'
              )}>
                Linked from {entry.sourceType}
              </span>
            </div>
            {entry.sourcePath && (
              <p className={cn(
                'text-xs font-mono',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}>
                {entry.sourcePath}
              </p>
            )}
          </div>
        )}

        {/* Metadata */}
        {entry && (
          <div className={cn(
            'mt-6 flex items-center gap-4 text-xs',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Created: {format(parseISO(entry.createdAt), 'MMM d, yyyy h:mm a')}</span>
            </div>
            {entry.updatedAt !== entry.createdAt && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Updated: {format(parseISO(entry.updatedAt), 'MMM d, yyyy h:mm a')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className={cn(
        'flex items-center justify-between p-4 border-t',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <button
          onClick={handleClose}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            isDark
              ? 'text-zinc-400 hover:text-zinc-200'
              : 'text-zinc-500 hover:text-zinc-700'
          )}
        >
          Cancel
        </button>

        <div className="flex items-center gap-2">
          {/* Delete button */}
          {entry && !isNew && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                deleting
                  ? 'opacity-50 cursor-not-allowed'
                  : 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
              )}
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !branchId}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              saving || !title.trim() || !branchId
                ? 'opacity-50 cursor-not-allowed bg-blue-400 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            )}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EntryEditorPanel



