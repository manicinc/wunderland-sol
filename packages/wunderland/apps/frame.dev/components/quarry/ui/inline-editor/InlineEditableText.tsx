/**
 * Inline Editable Text Component
 * Click-to-edit text field with auto-save and debouncing
 *
 * @module codex/ui/InlineEditableText
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Loader2, Pencil } from 'lucide-react'

export interface InlineEditableTextProps {
  /** Current value */
  value: string
  /** Callback when value should be saved */
  onSave: (newValue: string) => Promise<void>
  /** Placeholder when empty */
  placeholder?: string
  /** Allow multiline editing (textarea vs input) */
  multiline?: boolean
  /** Debounce delay in ms before auto-save (default: 1000) */
  autoSaveDelay?: number
  /** Dark theme */
  isDark?: boolean
  /** Disable editing */
  disabled?: boolean
  /** Max character length */
  maxLength?: number
  /** Show edit icon hint when not editing */
  showEditHint?: boolean
  /** Custom class for the display text */
  displayClassName?: string
  /** Custom class for the input */
  inputClassName?: string
  /** Callback when edit mode starts */
  onEditStart?: () => void
  /** Callback when edit mode ends */
  onEditEnd?: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function InlineEditableText({
  value,
  onSave,
  placeholder = 'Click to edit...',
  multiline = false,
  autoSaveDelay = 1000,
  isDark = false,
  disabled = false,
  maxLength,
  showEditHint = true,
  displayClassName = '',
  inputClassName = '',
  onEditStart,
  onEditEnd,
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedValue, setEditedValue] = useState(value)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync with external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditedValue(value)
    }
  }, [value, isEditing])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      // Select all text
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      } else {
        inputRef.current.setSelectionRange(0, inputRef.current.value.length)
      }
    }
  }, [isEditing])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    }
  }, [])

  // Debounced save
  const debouncedSave = useCallback(async (newValue: string) => {
    if (newValue === value) {
      setSaveStatus('idle')
      return
    }

    setSaveStatus('saving')
    setError(null)

    try {
      await onSave(newValue)
      setSaveStatus('saved')

      // Reset to idle after showing saved status
      statusTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle')
      }, 2000)
    } catch (err) {
      setSaveStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }, [value, onSave])

  // Handle value change with debounce
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setEditedValue(newValue)

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new debounced save
    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave(newValue)
    }, autoSaveDelay)
  }, [autoSaveDelay, debouncedSave])

  // Start editing
  const handleStartEdit = useCallback(() => {
    if (disabled) return
    setIsEditing(true)
    setEditedValue(value)
    onEditStart?.()
  }, [disabled, value, onEditStart])

  // Cancel editing (Escape)
  const handleCancel = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    setEditedValue(value)
    setIsEditing(false)
    setSaveStatus('idle')
    setError(null)
    onEditEnd?.()
  }, [value, onEditEnd])

  // Save and exit (Enter or blur)
  const handleSaveAndExit = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    if (editedValue !== value) {
      await debouncedSave(editedValue)
    }

    setIsEditing(false)
    onEditEnd?.()
  }, [editedValue, value, debouncedSave, onEditEnd])

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      handleSaveAndExit()
    } else if (e.key === 'Enter' && e.metaKey && multiline) {
      e.preventDefault()
      handleSaveAndExit()
    }
  }, [handleCancel, handleSaveAndExit, multiline])

  // Status indicator
  const StatusIndicator = () => {
    if (saveStatus === 'saving') {
      return (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex items-center gap-1 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Saving...</span>
        </motion.span>
      )
    }

    if (saveStatus === 'saved') {
      return (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1 text-xs text-emerald-500"
        >
          <Check className="w-3 h-3" />
          <span>Saved</span>
        </motion.span>
      )
    }

    if (saveStatus === 'error') {
      return (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1 text-xs text-red-500"
        >
          <X className="w-3 h-3" />
          <span>{error || 'Error'}</span>
        </motion.span>
      )
    }

    return null
  }

  // Editing mode
  if (isEditing) {
    const inputClasses = `
      w-full rounded-lg border transition-colors
      ${isDark
        ? 'bg-zinc-800 border-zinc-600 text-zinc-100 focus:border-cyan-500 placeholder-zinc-500'
        : 'bg-white border-zinc-300 text-zinc-900 focus:border-cyan-500 placeholder-zinc-400'
      }
      focus:outline-none focus:ring-2 focus:ring-cyan-500/20
      ${inputClassName}
    `

    const commonProps = {
      ref: inputRef as any,
      value: editedValue,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onBlur: handleSaveAndExit,
      placeholder,
      maxLength,
      disabled: saveStatus === 'saving',
      className: multiline
        ? `${inputClasses} px-3 py-2 min-h-[80px] resize-y`
        : `${inputClasses} px-3 py-1.5`,
    }

    return (
      <div className="relative">
        {multiline ? (
          <textarea {...commonProps} />
        ) : (
          <input type="text" {...commonProps} />
        )}

        {/* Status indicator */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <AnimatePresence mode="wait">
            <StatusIndicator />
          </AnimatePresence>
        </div>

        {/* Character count */}
        {maxLength && (
          <div className={`absolute right-2 bottom-1 text-[10px] ${
            editedValue.length > maxLength * 0.9
              ? 'text-amber-500'
              : isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            {editedValue.length}/{maxLength}
          </div>
        )}
      </div>
    )
  }

  // Display mode
  return (
    <div
      onClick={handleStartEdit}
      className={`
        group relative cursor-pointer rounded-lg transition-colors
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100/50'}
        ${displayClassName}
      `}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleStartEdit()
        }
      }}
    >
      {value || (
        <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
          {placeholder}
        </span>
      )}

      {/* Edit hint */}
      {showEditHint && !disabled && (
        <span className={`
          ml-2 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center
          ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
        `}>
          <Pencil className="w-3 h-3" />
        </span>
      )}

      {/* Status after save */}
      <AnimatePresence>
        {saveStatus !== 'idle' && !isEditing && (
          <span className="ml-2">
            <StatusIndicator />
          </span>
        )}
      </AnimatePresence>
    </div>
  )
}

export default InlineEditableText
