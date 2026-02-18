/**
 * ValidatedFormField Component
 * @module codex/ui/ValidatedFormField
 *
 * @description
 * Form field component with inline validation feedback.
 * Shows error messages beneath fields with animated appearance.
 * Supports all common field types (text, textarea, select, tags, etc.)
 */

'use client'

import React, { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SchemaField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'tags' | 'number' | 'date' | 'url' | 'email'
  required: boolean
  placeholder?: string
  tooltip?: string
  options?: string[]
  defaultValue?: string | number
}

export interface SeededMetadata {
  tags?: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  subjects?: string[]
  loomName?: string
  weaveName?: string
  loomDescription?: string
  suggestedTopics?: string[]
}

export interface ValidatedFormFieldProps {
  /** Field configuration */
  field: SchemaField
  /** Current field value */
  value: string
  /** Change handler */
  onChange: (value: string) => void
  /** Blur handler (for touch tracking) */
  onBlur?: () => void
  /** Error message to display */
  error?: string
  /** Whether field has been touched */
  touched?: boolean
  /** Seeded metadata for suggestions */
  seededMetadata?: SeededMetadata
  /** Whether to show error (touched + has error) */
  showError?: boolean
  /** Dark mode */
  isDark?: boolean
  /** Additional class name */
  className?: string
  /** Disable the field */
  disabled?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function ValidatedFormField({
  field,
  value,
  onChange,
  onBlur,
  error,
  touched = false,
  seededMetadata,
  showError,
  isDark = false,
  className,
  disabled = false,
}: ValidatedFormFieldProps) {
  const id = `field-${field.name}`
  const hasError = showError ?? (touched && !!error)

  // Compute seeded value hint
  const seededValue = React.useMemo(() => {
    if (field.name === 'tags' && seededMetadata?.tags?.length) {
      return seededMetadata.tags.join(', ')
    }
    if (field.name === 'difficulty' && seededMetadata?.difficulty) {
      return seededMetadata.difficulty
    }
    return null
  }, [field.name, seededMetadata])

  // Handle blur with touch tracking
  const handleBlur = useCallback(() => {
    onBlur?.()
  }, [onBlur])

  // Input styles
  const inputBaseClass = cn(
    'w-full px-3 py-2.5 text-sm rounded-lg border transition-colors',
    'focus:outline-none focus:ring-2',
    disabled && 'opacity-50 cursor-not-allowed',
    hasError
      ? 'border-red-400 dark:border-red-500 focus:ring-red-500/50 bg-red-50/50 dark:bg-red-900/10'
      : 'border-zinc-200 dark:border-zinc-700 focus:ring-cyan-500/50 bg-white dark:bg-zinc-800'
  )

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Label */}
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
        {field.tooltip && (
          <span
            title={field.tooltip}
            className="cursor-help"
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors" />
          </span>
        )}
      </label>

      {/* Field Input */}
      {field.type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={3}
          className={cn(inputBaseClass, 'resize-none')}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
      ) : field.type === 'select' ? (
        <select
          id={id}
          value={value || field.defaultValue || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          disabled={disabled}
          className={inputBaseClass}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        >
          <option value="">{field.placeholder || 'Select...'}</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === 'number' ? (
        <input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={field.placeholder}
          disabled={disabled}
          className={inputBaseClass}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
      ) : field.type === 'date' ? (
        <input
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          disabled={disabled}
          className={inputBaseClass}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
      ) : field.type === 'email' ? (
        <input
          id={id}
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={field.placeholder}
          disabled={disabled}
          className={inputBaseClass}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
      ) : field.type === 'url' ? (
        <input
          id={id}
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={field.placeholder}
          disabled={disabled}
          className={inputBaseClass}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={field.placeholder}
          disabled={disabled}
          className={inputBaseClass}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
        />
      )}

      {/* Error Message */}
      <AnimatePresence mode="wait">
        {hasError && error && (
          <motion.div
            id={`${id}-error`}
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400"
            role="alert"
          >
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seeded Value Hint */}
      <AnimatePresence>
        {seededValue && !value && !hasError && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onChange(seededValue)}
            className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            <Sparkles className="w-3 h-3" />
            Use inherited: {seededValue}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR SUMMARY COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export interface ErrorSummaryProps {
  errors: Array<{ field: string; message: string }>
  isDark?: boolean
  className?: string
}

/**
 * Displays all validation errors in a summary box
 */
export function ErrorSummary({ errors, isDark = false, className }: ErrorSummaryProps) {
  if (errors.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-3 rounded-lg border space-y-1',
        isDark
          ? 'bg-red-900/20 border-red-800'
          : 'bg-red-50 border-red-200',
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
        <AlertCircle className="w-4 h-4" />
        Please fix the following errors:
      </div>
      <ul className="ml-6 text-xs text-red-600 dark:text-red-400 list-disc space-y-0.5">
        {errors.map(({ field, message }) => (
          <li key={field}>
            <span className="font-medium">{field}:</span> {message}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}
