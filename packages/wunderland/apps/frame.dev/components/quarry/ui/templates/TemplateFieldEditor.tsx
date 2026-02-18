/**
 * Template Field Editor Component
 * @module codex/ui/TemplateFieldEditor
 *
 * @description
 * UI for defining and configuring template form fields.
 * Features:
 * - Add/edit/delete field definitions
 * - Configure field types and validation
 * - Drag-and-drop reordering
 * - Preview of field rendering
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Settings2,
  AlertCircle,
  Type,
  AlignLeft,
  List,
  ListChecks,
  Tags,
  Hash,
  Calendar,
  Clock,
  Link,
  Mail,
  Palette,
  Sliders,
  CheckSquare,
  Circle,
  FileUp,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TemplateField, TemplateFieldType, FieldValidation } from '@/components/quarry/templates/types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface TemplateFieldEditorProps {
  /** Current fields */
  fields: TemplateField[]
  /** Callback when fields change */
  onChange: (fields: TemplateField[]) => void
  /** Whether dark mode is enabled */
  isDark?: boolean
}

interface FieldTypeOption {
  type: TemplateFieldType
  label: string
  icon: React.ReactNode
  description: string
  hasOptions?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const FIELD_TYPES: FieldTypeOption[] = [
  { type: 'text', label: 'Text', icon: <Type className="w-4 h-4" />, description: 'Single line text input' },
  { type: 'textarea', label: 'Textarea', icon: <AlignLeft className="w-4 h-4" />, description: 'Multi-line text input' },
  { type: 'select', label: 'Select', icon: <List className="w-4 h-4" />, description: 'Dropdown selection', hasOptions: true },
  { type: 'multiselect', label: 'Multi-select', icon: <ListChecks className="w-4 h-4" />, description: 'Multiple selections', hasOptions: true },
  { type: 'tags', label: 'Tags', icon: <Tags className="w-4 h-4" />, description: 'Tag input with suggestions' },
  { type: 'number', label: 'Number', icon: <Hash className="w-4 h-4" />, description: 'Numeric input' },
  { type: 'date', label: 'Date', icon: <Calendar className="w-4 h-4" />, description: 'Date picker' },
  { type: 'datetime', label: 'Date & Time', icon: <Clock className="w-4 h-4" />, description: 'Date and time picker' },
  { type: 'url', label: 'URL', icon: <Link className="w-4 h-4" />, description: 'URL input with validation' },
  { type: 'email', label: 'Email', icon: <Mail className="w-4 h-4" />, description: 'Email input with validation' },
  { type: 'color', label: 'Color', icon: <Palette className="w-4 h-4" />, description: 'Color picker' },
  { type: 'range', label: 'Range', icon: <Sliders className="w-4 h-4" />, description: 'Slider input' },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="w-4 h-4" />, description: 'Boolean checkbox' },
  { type: 'radio', label: 'Radio', icon: <Circle className="w-4 h-4" />, description: 'Radio button group', hasOptions: true },
  { type: 'file', label: 'File', icon: <FileUp className="w-4 h-4" />, description: 'File upload' },
  { type: 'markdown', label: 'Markdown', icon: <FileText className="w-4 h-4" />, description: 'Markdown editor' },
]

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Field type selector dropdown
 */
function FieldTypeSelector({
  value,
  onChange,
  isDark,
}: {
  value: TemplateFieldType
  onChange: (type: TemplateFieldType) => void
  isDark: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = FIELD_TYPES.find((t) => t.type === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full',
          isDark
            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        )}
      >
        {selected?.icon}
        <span className="flex-1 text-left">{selected?.label}</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'absolute z-50 top-full left-0 right-0 mt-1 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto',
              isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
            )}
          >
            {FIELD_TYPES.map((fieldType) => (
              <button
                key={fieldType.type}
                type="button"
                onClick={() => {
                  onChange(fieldType.type)
                  setIsOpen(false)
                }}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2 text-left transition-colors',
                  isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50',
                  value === fieldType.type && (isDark ? 'bg-slate-700' : 'bg-gray-100')
                )}
              >
                <span className={cn(isDark ? 'text-slate-400' : 'text-gray-500')}>
                  {fieldType.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={cn('text-sm font-medium', isDark ? 'text-slate-200' : 'text-gray-900')}>
                    {fieldType.label}
                  </div>
                  <div className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-500')}>
                    {fieldType.description}
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Options editor for select/multiselect/radio fields
 */
function OptionsEditor({
  options,
  onChange,
  isDark,
}: {
  options: string[]
  onChange: (options: string[]) => void
  isDark: boolean
}) {
  const [newOption, setNewOption] = useState('')

  const addOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      onChange([...options, newOption.trim()])
      setNewOption('')
    }
  }

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>
        Options
      </div>
      <div className="space-y-1">
        {options.map((option, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded',
              isDark ? 'bg-slate-700/50' : 'bg-gray-100'
            )}
          >
            <span className={cn('flex-1 text-sm', isDark ? 'text-slate-300' : 'text-gray-700')}>
              {option}
            </span>
            <button
              type="button"
              onClick={() => removeOption(index)}
              className={cn(
                'p-1 rounded hover:bg-red-500/20 text-red-500',
                'transition-colors'
              )}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
          placeholder="Add option..."
          className={cn(
            'flex-1 px-2 py-1 rounded text-sm',
            isDark
              ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500'
              : 'bg-gray-100 text-gray-900 placeholder:text-gray-400'
          )}
        />
        <button
          type="button"
          onClick={addOption}
          className={cn(
            'px-2 py-1 rounded text-sm font-medium',
            isDark
              ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
              : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
          )}
        >
          Add
        </button>
      </div>
    </div>
  )
}

/**
 * Validation rules editor
 */
function ValidationEditor({
  validation,
  fieldType,
  onChange,
  isDark,
}: {
  validation?: FieldValidation
  fieldType: TemplateFieldType
  onChange: (validation: FieldValidation) => void
  isDark: boolean
}) {
  const showStringValidation = ['text', 'textarea', 'url', 'email', 'markdown'].includes(fieldType)
  const showNumberValidation = ['number', 'range'].includes(fieldType)

  return (
    <div className="space-y-3">
      <div className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-gray-500')}>
        Validation Rules
      </div>

      {showStringValidation && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>
              Min Length
            </label>
            <input
              type="number"
              min={0}
              value={validation?.minLength || ''}
              onChange={(e) =>
                onChange({ ...validation, minLength: e.target.value ? parseInt(e.target.value) : undefined })
              }
              className={cn(
                'w-full px-2 py-1 rounded text-sm',
                isDark
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-gray-100 text-gray-900'
              )}
            />
          </div>
          <div>
            <label className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>
              Max Length
            </label>
            <input
              type="number"
              min={0}
              value={validation?.maxLength || ''}
              onChange={(e) =>
                onChange({ ...validation, maxLength: e.target.value ? parseInt(e.target.value) : undefined })
              }
              className={cn(
                'w-full px-2 py-1 rounded text-sm',
                isDark
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-gray-100 text-gray-900'
              )}
            />
          </div>
        </div>
      )}

      {showNumberValidation && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>Min</label>
            <input
              type="number"
              value={validation?.min || ''}
              onChange={(e) =>
                onChange({ ...validation, min: e.target.value ? parseFloat(e.target.value) : undefined })
              }
              className={cn(
                'w-full px-2 py-1 rounded text-sm',
                isDark
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-gray-100 text-gray-900'
              )}
            />
          </div>
          <div>
            <label className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>Max</label>
            <input
              type="number"
              value={validation?.max || ''}
              onChange={(e) =>
                onChange({ ...validation, max: e.target.value ? parseFloat(e.target.value) : undefined })
              }
              className={cn(
                'w-full px-2 py-1 rounded text-sm',
                isDark
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-gray-100 text-gray-900'
              )}
            />
          </div>
          <div>
            <label className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>Step</label>
            <input
              type="number"
              min={0}
              value={validation?.step || ''}
              onChange={(e) =>
                onChange({ ...validation, step: e.target.value ? parseFloat(e.target.value) : undefined })
              }
              className={cn(
                'w-full px-2 py-1 rounded text-sm',
                isDark
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-gray-100 text-gray-900'
              )}
            />
          </div>
        </div>
      )}

      <div>
        <label className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>
          Pattern (RegEx)
        </label>
        <input
          type="text"
          value={validation?.pattern || ''}
          onChange={(e) => onChange({ ...validation, pattern: e.target.value || undefined })}
          placeholder="e.g., ^[A-Za-z]+$"
          className={cn(
            'w-full px-2 py-1 rounded text-sm font-mono',
            isDark
              ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500'
              : 'bg-gray-100 text-gray-900 placeholder:text-gray-400'
          )}
        />
      </div>

      <div>
        <label className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>
          Error Message
        </label>
        <input
          type="text"
          value={validation?.message || ''}
          onChange={(e) => onChange({ ...validation, message: e.target.value || undefined })}
          placeholder="Custom validation error message"
          className={cn(
            'w-full px-2 py-1 rounded text-sm',
            isDark
              ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500'
              : 'bg-gray-100 text-gray-900 placeholder:text-gray-400'
          )}
        />
      </div>
    </div>
  )
}

/**
 * Single field editor card
 */
function FieldCard({
  field,
  index,
  onChange,
  onDelete,
  isDark,
}: {
  field: TemplateField
  index: number
  onChange: (field: TemplateField) => void
  onDelete: () => void
  isDark: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const fieldTypeInfo = FIELD_TYPES.find((t) => t.type === field.type)

  return (
    <Reorder.Item
      value={field}
      id={field.name || `field-${index}`}
      className={cn(
        'rounded-lg overflow-hidden',
        isDark ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2 p-3 cursor-pointer',
          isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <GripVertical
          className={cn('w-4 h-4 cursor-grab', isDark ? 'text-slate-500' : 'text-gray-400')}
        />
        <span className={cn(isDark ? 'text-slate-400' : 'text-gray-500')}>{fieldTypeInfo?.icon}</span>
        <div className="flex-1 min-w-0">
          <div className={cn('font-medium text-sm', isDark ? 'text-slate-200' : 'text-gray-900')}>
            {field.label || 'Untitled Field'}
          </div>
          <div className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-500')}>
            {field.name || 'no-name'} • {fieldTypeInfo?.label}
            {field.required && ' • Required'}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className={cn(
            'p-1.5 rounded hover:bg-red-500/20 text-red-500 transition-colors'
          )}
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <ChevronRight
          className={cn(
            'w-4 h-4 transition-transform',
            isDark ? 'text-slate-400' : 'text-gray-400',
            isExpanded && 'rotate-90'
          )}
        />
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={cn('p-4 pt-0 space-y-4', isDark ? 'border-t border-slate-700' : 'border-t border-gray-100')}>
              {/* Basic Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn('text-xs font-medium mb-1 block', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    Field Name (ID)
                  </label>
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => onChange({ ...field, name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                    placeholder="fieldName"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-sm font-mono',
                      isDark
                        ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500'
                        : 'bg-gray-100 text-gray-900 placeholder:text-gray-400'
                    )}
                  />
                </div>
                <div>
                  <label className={cn('text-xs font-medium mb-1 block', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    Display Label
                  </label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => onChange({ ...field, label: e.target.value })}
                    placeholder="Field Label"
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-sm',
                      isDark
                        ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500'
                        : 'bg-gray-100 text-gray-900 placeholder:text-gray-400'
                    )}
                  />
                </div>
              </div>

              {/* Field Type */}
              <div>
                <label className={cn('text-xs font-medium mb-1 block', isDark ? 'text-slate-400' : 'text-gray-500')}>
                  Field Type
                </label>
                <FieldTypeSelector value={field.type} onChange={(type) => onChange({ ...field, type })} isDark={isDark} />
              </div>

              {/* Required Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => onChange({ ...field, required: e.target.checked })}
                  className="rounded"
                />
                <span className={cn('text-sm', isDark ? 'text-slate-300' : 'text-gray-700')}>
                  Required field
                </span>
              </label>

              {/* Placeholder */}
              <div>
                <label className={cn('text-xs font-medium mb-1 block', isDark ? 'text-slate-400' : 'text-gray-500')}>
                  Placeholder Text
                </label>
                <input
                  type="text"
                  value={field.placeholder || ''}
                  onChange={(e) => onChange({ ...field, placeholder: e.target.value || undefined })}
                  placeholder="Enter placeholder text..."
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-sm',
                    isDark
                      ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500'
                      : 'bg-gray-100 text-gray-900 placeholder:text-gray-400'
                  )}
                />
              </div>

              {/* Options for select types */}
              {fieldTypeInfo?.hasOptions && (
                <OptionsEditor
                  options={field.options || []}
                  onChange={(options) => onChange({ ...field, options })}
                  isDark={isDark}
                />
              )}

              {/* Advanced Settings Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={cn(
                  'flex items-center gap-2 text-sm font-medium',
                  isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Settings2 className="w-4 h-4" />
                Advanced Settings
                <ChevronDown className={cn('w-4 h-4 transition-transform', showAdvanced && 'rotate-180')} />
              </button>

              {/* Advanced Settings */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Default Value */}
                    <div>
                      <label className={cn('text-xs font-medium mb-1 block', isDark ? 'text-slate-400' : 'text-gray-500')}>
                        Default Value
                      </label>
                      <input
                        type="text"
                        value={String(field.defaultValue || '')}
                        onChange={(e) => onChange({ ...field, defaultValue: e.target.value || undefined })}
                        placeholder="Default value..."
                        className={cn(
                          'w-full px-3 py-2 rounded-lg text-sm',
                          isDark
                            ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500'
                            : 'bg-gray-100 text-gray-900 placeholder:text-gray-400'
                        )}
                      />
                    </div>

                    {/* Tooltip */}
                    <div>
                      <label className={cn('text-xs font-medium mb-1 block', isDark ? 'text-slate-400' : 'text-gray-500')}>
                        Help Text / Tooltip
                      </label>
                      <input
                        type="text"
                        value={field.tooltip || ''}
                        onChange={(e) => onChange({ ...field, tooltip: e.target.value || undefined })}
                        placeholder="Help text shown on hover..."
                        className={cn(
                          'w-full px-3 py-2 rounded-lg text-sm',
                          isDark
                            ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500'
                            : 'bg-gray-100 text-gray-900 placeholder:text-gray-400'
                        )}
                      />
                    </div>

                    {/* Group */}
                    <div>
                      <label className={cn('text-xs font-medium mb-1 block', isDark ? 'text-slate-400' : 'text-gray-500')}>
                        Field Group
                      </label>
                      <input
                        type="text"
                        value={field.group || ''}
                        onChange={(e) => onChange({ ...field, group: e.target.value || undefined })}
                        placeholder="Group name for visual grouping..."
                        className={cn(
                          'w-full px-3 py-2 rounded-lg text-sm',
                          isDark
                            ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500'
                            : 'bg-gray-100 text-gray-900 placeholder:text-gray-400'
                        )}
                      />
                    </div>

                    {/* Validation */}
                    <ValidationEditor
                      validation={field.validation}
                      fieldType={field.type}
                      onChange={(validation) => onChange({ ...field, validation })}
                      isDark={isDark}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function TemplateFieldEditor({
  fields,
  onChange,
  isDark = true,
}: TemplateFieldEditorProps) {
  const handleReorder = useCallback(
    (newOrder: TemplateField[]) => {
      onChange(newOrder)
    },
    [onChange]
  )

  const handleAddField = useCallback(() => {
    const newField: TemplateField = {
      name: `field${fields.length + 1}`,
      label: `Field ${fields.length + 1}`,
      type: 'text',
      required: false,
    }
    onChange([...fields, newField])
  }, [fields, onChange])

  const handleUpdateField = useCallback(
    (index: number, updatedField: TemplateField) => {
      const newFields = [...fields]
      newFields[index] = updatedField
      onChange(newFields)
    },
    [fields, onChange]
  )

  const handleDeleteField = useCallback(
    (index: number) => {
      onChange(fields.filter((_, i) => i !== index))
    },
    [fields, onChange]
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={cn('font-semibold', isDark ? 'text-slate-200' : 'text-gray-900')}>
            Form Fields
          </h3>
          <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>
            Define the fields users will fill out when using this template
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddField}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isDark
              ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
              : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
          )}
        >
          <Plus className="w-4 h-4" />
          Add Field
        </button>
      </div>

      {/* Empty State */}
      {fields.length === 0 && (
        <div
          className={cn(
            'p-8 rounded-lg border-2 border-dashed text-center',
            isDark ? 'border-slate-700 bg-slate-800/30' : 'border-gray-200 bg-gray-50'
          )}
        >
          <AlertCircle className={cn('w-8 h-8 mx-auto mb-3', isDark ? 'text-slate-500' : 'text-gray-400')} />
          <p className={cn('font-medium', isDark ? 'text-slate-300' : 'text-gray-700')}>
            No fields defined
          </p>
          <p className={cn('text-sm mt-1', isDark ? 'text-slate-500' : 'text-gray-500')}>
            Add fields to create a form for your template
          </p>
          <button
            type="button"
            onClick={handleAddField}
            className={cn(
              'mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              isDark
                ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
            )}
          >
            <Plus className="w-4 h-4" />
            Add First Field
          </button>
        </div>
      )}

      {/* Field List */}
      {fields.length > 0 && (
        <Reorder.Group
          axis="y"
          values={fields}
          onReorder={handleReorder}
          className="space-y-3"
        >
          {fields.map((field, index) => (
            <FieldCard
              key={field.name || `field-${index}`}
              field={field}
              index={index}
              onChange={(updated) => handleUpdateField(index, updated)}
              onDelete={() => handleDeleteField(index)}
              isDark={isDark}
            />
          ))}
        </Reorder.Group>
      )}

      {/* Placeholder Hint */}
      {fields.length > 0 && (
        <div
          className={cn(
            'p-3 rounded-lg text-sm',
            isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-gray-100 text-gray-600'
          )}
        >
          <strong>Tip:</strong> Use <code className="px-1 py-0.5 rounded bg-slate-700 text-cyan-400">{'{fieldName}'}</code> in
          your template to insert field values. For example,{' '}
          <code className="px-1 py-0.5 rounded bg-slate-700 text-cyan-400">{'{title}'}</code> will be replaced with the
          user&apos;s input.
        </div>
      )}
    </div>
  )
}
