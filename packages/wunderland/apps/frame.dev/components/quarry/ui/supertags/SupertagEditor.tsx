/**
 * Supertag Editor Component
 * @module codex/ui/SupertagEditor
 *
 * @description
 * Form editor for supertag field values. Supports all field types
 * with validation and auto-save.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import {
  getSchemaByTagName,
  getFieldValues,
  getResolvedFields,
  setFieldValue,
  applySupertag,
  removeSupertag,
  type SupertagSchema,
  type SupertagFieldDefinition,
} from '@/lib/supertags'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SupertagEditorProps {
  /** Block ID to edit */
  blockId: string
  /** Strand path */
  strandPath: string
  /** Tag name (without # prefix) */
  tagName: string
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Callback when values change */
  onChange?: (values: Record<string, unknown>) => void
  /** Callback when supertag is removed */
  onRemove?: () => void
  /** Auto-save on change */
  autoSave?: boolean
  /** Compact mode (inline fields) */
  compact?: boolean
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   FIELD EDITORS
═══════════════════════════════════════════════════════════════════════════ */

interface FieldEditorProps {
  field: SupertagFieldDefinition
  value: unknown
  onChange: (value: unknown) => void
  theme: 'light' | 'dark'
  compact?: boolean
}

function TextFieldEditor({ field, value, onChange, theme, compact }: FieldEditorProps) {
  const isDark = theme === 'dark'
  const isTextarea = field.type === 'textarea'

  const InputComponent = isTextarea ? 'textarea' : 'input'

  return (
    <InputComponent
      value={(value as string) || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={field.description || field.label}
      required={field.required}
      className={cn(
        'w-full px-3 py-2 rounded-lg border text-sm outline-none',
        'focus:ring-2 focus:ring-blue-500/50',
        isDark
          ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500'
          : 'bg-white border-zinc-200 text-zinc-800 placeholder:text-zinc-400',
        isTextarea && 'min-h-[80px] resize-y',
        compact && 'py-1.5 text-xs'
      )}
    />
  )
}

function NumberFieldEditor({ field, value, onChange, theme, compact }: FieldEditorProps) {
  const isDark = theme === 'dark'

  return (
    <input
      type="number"
      value={(value as number) ?? ''}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      min={field.validation?.min}
      max={field.validation?.max}
      required={field.required}
      className={cn(
        'w-full px-3 py-2 rounded-lg border text-sm outline-none',
        'focus:ring-2 focus:ring-blue-500/50',
        isDark
          ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
          : 'bg-white border-zinc-200 text-zinc-800',
        compact && 'py-1.5 text-xs'
      )}
    />
  )
}

function DateFieldEditor({ field, value, onChange, theme, compact }: FieldEditorProps) {
  const isDark = theme === 'dark'
  const isDatetime = field.type === 'datetime'

  return (
    <input
      type={isDatetime ? 'datetime-local' : 'date'}
      value={(value as string) || ''}
      onChange={e => onChange(e.target.value)}
      required={field.required}
      className={cn(
        'w-full px-3 py-2 rounded-lg border text-sm outline-none',
        'focus:ring-2 focus:ring-blue-500/50',
        isDark
          ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
          : 'bg-white border-zinc-200 text-zinc-800',
        compact && 'py-1.5 text-xs'
      )}
    />
  )
}

function CheckboxFieldEditor({ field, value, onChange, theme }: FieldEditorProps) {
  const isDark = theme === 'dark'
  const checked = Boolean(value)

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
        'transition-colors',
        isDark
          ? 'border-zinc-700 hover:bg-zinc-800'
          : 'border-zinc-200 hover:bg-zinc-50',
        checked && (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')
      )}
    >
      {checked ? (
        <Icons.CheckSquare className="w-4 h-4 text-emerald-500" />
      ) : (
        <Icons.Square className={cn('w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
      )}
      <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
        {checked ? 'Yes' : 'No'}
      </span>
    </button>
  )
}

function SelectFieldEditor({ field, value, onChange, theme, compact }: FieldEditorProps) {
  const isDark = theme === 'dark'
  const options = field.options || []

  return (
    <select
      value={(value as string) || ''}
      onChange={e => onChange(e.target.value)}
      required={field.required}
      className={cn(
        'w-full px-3 py-2 rounded-lg border text-sm outline-none',
        'focus:ring-2 focus:ring-blue-500/50',
        isDark
          ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
          : 'bg-white border-zinc-200 text-zinc-800',
        compact && 'py-1.5 text-xs'
      )}
    >
      <option value="">Select...</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function RatingFieldEditor({ field, value, onChange, theme }: FieldEditorProps) {
  const rating = (value as number) || 0

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === rating ? 0 : star)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          {star <= rating ? (
            <Icons.Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          ) : (
            <Icons.Star className="w-5 h-5 text-zinc-500" />
          )}
        </button>
      ))}
    </div>
  )
}

function ProgressFieldEditor({ field, value, onChange, theme }: FieldEditorProps) {
  const isDark = theme === 'dark'
  const progress = (value as number) || 0

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={100}
        value={progress}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1"
      />
      <span className={cn(
        'text-sm w-12 text-right',
        isDark ? 'text-zinc-400' : 'text-zinc-600'
      )}>
        {progress}%
      </span>
    </div>
  )
}

function TagsFieldEditor({ field, value, onChange, theme, compact }: FieldEditorProps) {
  const isDark = theme === 'dark'
  const tags = Array.isArray(value) ? value : []
  const [input, setInput] = useState('')

  const addTag = useCallback(() => {
    if (input.trim() && !tags.includes(input.trim())) {
      onChange([...tags, input.trim()])
      setInput('')
    }
  }, [input, tags, onChange])

  const removeTag = useCallback((tag: string) => {
    onChange(tags.filter(t => t !== tag))
  }, [tags, onChange])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map(tag => (
          <span
            key={tag}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
              isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-700'
            )}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="p-0.5 hover:text-red-400"
            >
              <Icons.X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
          placeholder="Add tag..."
          className={cn(
            'flex-1 px-3 py-1.5 rounded-lg border text-sm outline-none',
            isDark
              ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500'
              : 'bg-white border-zinc-200 text-zinc-800 placeholder:text-zinc-400',
            compact && 'text-xs'
          )}
        />
        <button
          type="button"
          onClick={addTag}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm',
            isDark
              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
              : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
          )}
        >
          <Icons.Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function UrlFieldEditor({ field, value, onChange, theme, compact }: FieldEditorProps) {
  const isDark = theme === 'dark'
  const url = (value as string) || ''

  return (
    <div className="flex gap-2">
      <input
        type="url"
        value={url}
        onChange={e => onChange(e.target.value)}
        placeholder="https://..."
        required={field.required}
        className={cn(
          'flex-1 px-3 py-2 rounded-lg border text-sm outline-none',
          'focus:ring-2 focus:ring-blue-500/50',
          isDark
            ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500'
            : 'bg-white border-zinc-200 text-zinc-800 placeholder:text-zinc-400',
          compact && 'py-1.5 text-xs'
        )}
      />
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'p-2 rounded-lg',
            isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'
          )}
        >
          <Icons.ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  )
}

// Field editor dispatcher
function FieldEditor(props: FieldEditorProps) {
  switch (props.field.type) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
      return <TextFieldEditor {...props} />
    case 'number':
      return <NumberFieldEditor {...props} />
    case 'date':
    case 'datetime':
      return <DateFieldEditor {...props} />
    case 'checkbox':
      return <CheckboxFieldEditor {...props} />
    case 'select':
    case 'multiselect':
      return <SelectFieldEditor {...props} />
    case 'rating':
      return <RatingFieldEditor {...props} />
    case 'progress':
      return <ProgressFieldEditor {...props} />
    case 'tags':
      return <TagsFieldEditor {...props} />
    case 'url':
      return <UrlFieldEditor {...props} />
    default:
      return <TextFieldEditor {...props} />
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function SupertagEditor({
  blockId,
  strandPath,
  tagName,
  theme = 'dark',
  onChange,
  onRemove,
  autoSave = true,
  compact = false,
  className,
}: SupertagEditorProps) {
  const [schema, setSchema] = useState<SupertagSchema | null>(null)
  const [fields, setFields] = useState<SupertagFieldDefinition[]>([])
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showValidation, setShowValidation] = useState(false)

  const isDark = theme === 'dark'

  // Validate all required fields
  const validateFields = useCallback((currentValues: Record<string, unknown>, currentFields: SupertagFieldDefinition[]) => {
    const errors: Record<string, string> = {}
    currentFields.forEach(field => {
      if (field.required && !field.hidden) {
        const value = currentValues[field.name]
        const isEmpty = value === undefined || value === null || value === '' ||
          (Array.isArray(value) && value.length === 0)
        if (isEmpty) {
          errors[field.name] = `${field.label} is required`
        }
      }
    })
    return errors
  }, [])

  // Check if form is valid (no required fields empty)
  const isFormValid = useCallback((currentValues: Record<string, unknown>, currentFields: SupertagFieldDefinition[]) => {
    const errors = validateFields(currentValues, currentFields)
    return Object.keys(errors).length === 0
  }, [validateFields])

  // Load schema and values
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const schemaData = await getSchemaByTagName(tagName)
        if (cancelled || !schemaData) return

        setSchema(schemaData)

        const resolvedFields = await getResolvedFields(schemaData.id)
        setFields(resolvedFields)

        const existingValues = await getFieldValues(blockId, schemaData.id)
        setValues(existingValues)

        // Check if there are required fields with no values - show validation immediately
        const hasRequiredFields = resolvedFields.some(f => f.required && !f.hidden)
        if (hasRequiredFields) {
          const errors = validateFields(existingValues, resolvedFields)
          if (Object.keys(errors).length > 0) {
            setValidationErrors(errors)
            setShowValidation(true)
          }
        }
      } catch (error) {
        console.error('Failed to load supertag editor:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => { cancelled = true }
  }, [tagName, blockId, validateFields])

  // Handle field change
  const handleFieldChange = useCallback(async (fieldName: string, value: unknown) => {
    const newValues = { ...values, [fieldName]: value }
    setValues(newValues)
    setDirty(true)
    onChange?.(newValues)

    // Update validation errors when user types
    if (showValidation) {
      const errors = validateFields(newValues, fields)
      setValidationErrors(errors)
    }

    // Only auto-save if we have required field validation passing OR this specific field is not empty
    // We still save individual field values, but block save attempts if required fields are empty
    if (autoSave && schema) {
      // Check if this specific field is a required field that is now empty
      const field = fields.find(f => f.name === fieldName)
      const isEmpty = value === undefined || value === null || value === '' ||
        (Array.isArray(value) && value.length === 0)

      if (field?.required && isEmpty) {
        // Don't save empty required fields - show validation
        setShowValidation(true)
        setValidationErrors(prev => ({
          ...prev,
          [fieldName]: `${field.label} is required`
        }))
        return
      }

      setSaving(true)
      try {
        await setFieldValue(blockId, schema.id, fieldName, value)
        // Clear error for this field on successful save
        setValidationErrors(prev => {
          const next = { ...prev }
          delete next[fieldName]
          return next
        })
      } finally {
        setSaving(false)
      }
    }
  }, [values, onChange, autoSave, schema, blockId, showValidation, validateFields, fields])

  // Handle remove
  const handleRemove = useCallback(async () => {
    if (confirm(`Remove #${tagName} from this block?`)) {
      await removeSupertag(blockId, tagName)
      onRemove?.()
    }
  }, [blockId, tagName, onRemove])

  // Get icon component
  const IconsRecord = Icons as unknown as Record<string, React.ElementType>
  const Icon = schema?.icon
    ? IconsRecord[schema.icon] || Icons.Tag
    : Icons.Tag

  if (loading) {
    return (
      <div className={cn(
        'animate-pulse rounded-lg p-4',
        isDark ? 'bg-zinc-800' : 'bg-zinc-100',
        className
      )}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-zinc-500" />
          <div className="w-24 h-5 rounded bg-zinc-500" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="w-16 h-4 rounded bg-zinc-500 mb-2" />
              <div className="w-full h-9 rounded bg-zinc-500" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!schema) {
    return (
      <div className={cn(
        'rounded-lg p-4 text-center',
        isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500',
        className
      )}>
        Supertag #{tagName} not found
      </div>
    )
  }

  return (
    <motion.div
      className={cn(
        'rounded-lg border overflow-hidden',
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200',
        className
      )}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{
          backgroundColor: schema.color ? schema.color + '15' : undefined,
          borderColor: isDark ? 'rgb(39 39 42)' : 'rgb(228 228 231)',
        }}
      >
        <div
          className="flex items-center gap-2"
          title="Supertag: Structured data with custom fields. Fill in the fields below to add rich metadata to this block."
        >
          <Icon className="w-5 h-5" style={{ color: schema.color }} />
          <span className="font-medium" style={{ color: schema.color }}>
            #{schema.displayName}
          </span>
        </div>

        {saving && (
          <Icons.Loader2 className="w-4 h-4 animate-spin text-zinc-500 ml-auto" />
        )}

        <button
          onClick={handleRemove}
          className={cn(
            'p-1.5 rounded-lg ml-auto',
            isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'
          )}
          title="Remove supertag"
        >
          <Icons.Trash2 className="w-4 h-4 text-zinc-500 hover:text-red-400" />
        </button>
      </div>

      {/* Validation Summary */}
      {showValidation && Object.keys(validationErrors).length > 0 && (
        <div className={cn(
          'px-4 py-2 border-b flex items-center gap-2',
          isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
        )}>
          <Icons.AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-400">
            {Object.keys(validationErrors).length === 1
              ? 'Fill in the required field below to save'
              : `Fill in ${Object.keys(validationErrors).length} required fields below to save`
            }
          </span>
        </div>
      )}

      {/* Fields */}
      <div className={cn('p-4 space-y-4', compact && 'p-3 space-y-3')}>
        {fields.filter(f => !f.hidden).map(field => {
          const hasError = showValidation && validationErrors[field.name]
          return (
            <div key={field.name}>
              <label className={cn(
                'block text-sm font-medium mb-1.5',
                isDark ? 'text-zinc-400' : 'text-zinc-600',
                compact && 'text-xs mb-1'
              )}>
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <div className={cn(
                hasError && 'ring-2 ring-red-400/50 rounded-lg'
              )}>
                <FieldEditor
                  field={field}
                  value={values[field.name]}
                  onChange={value => handleFieldChange(field.name, value)}
                  theme={theme}
                  compact={compact}
                />
              </div>
              {hasError && (
                <p className="text-xs mt-1 text-red-400 flex items-center gap-1">
                  <Icons.AlertCircle className="w-3 h-3" />
                  {validationErrors[field.name]}
                </p>
              )}
              {!hasError && field.description && (
                <p className={cn(
                  'text-xs mt-1',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  {field.description}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

export default SupertagEditor
