/**
 * Supertag Schema Designer
 * @module codex/ui/SupertagSchemaDesigner
 *
 * @description
 * Visual designer for creating and editing supertag schemas.
 * Allows defining field types, validation rules, and appearance.
 *
 * @features
 * - Schema creation/editing
 * - Drag-and-drop field ordering
 * - Field type configuration
 * - Validation rule builder
 * - Schema preview
 * - Built-in template selection
 * - Icon and color picker
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  Eye,
  Palette,
  Settings,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  Type,
  Hash,
  Calendar,
  CheckSquare,
  List,
  Link,
  Mail,
  Phone,
  Star,
  BarChart,
  Image,
  Tag,
  FileText,
  User,
  Book,
  Folder,
  Lightbulb,
  HelpCircle,
  GitBranch,
  CalendarDays,
  Layers,
  Calculator,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type SupertagSchema,
  type SupertagFieldDefinition,
  type SupertagFieldType,
  type BuiltInSupertag,
  BUILT_IN_SCHEMAS,
} from '@/lib/supertags/types'
import { createSchema, updateSchema } from '@/lib/supertags/supertagManager'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SupertagSchemaDesignerProps {
  /** Existing schema to edit (null for new) */
  schema?: SupertagSchema | null
  /** Callback when saving */
  onSave?: (schema: SupertagSchema) => void
  /** Callback when canceling */
  onCancel?: () => void
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const FIELD_TYPE_OPTIONS: Array<{
  value: SupertagFieldType
  label: string
  icon: typeof Type
  description: string
}> = [
  { value: 'text', label: 'Text', icon: Type, description: 'Single line text' },
  { value: 'textarea', label: 'Long Text', icon: FileText, description: 'Multi-line text' },
  { value: 'number', label: 'Number', icon: Hash, description: 'Numeric value' },
  { value: 'date', label: 'Date', icon: Calendar, description: 'Date picker' },
  { value: 'datetime', label: 'Date & Time', icon: CalendarDays, description: 'Date and time' },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'Yes/No toggle' },
  { value: 'select', label: 'Select', icon: List, description: 'Single choice' },
  { value: 'multiselect', label: 'Multi-Select', icon: Layers, description: 'Multiple choices' },
  { value: 'url', label: 'URL', icon: Link, description: 'Web address' },
  { value: 'email', label: 'Email', icon: Mail, description: 'Email address' },
  { value: 'phone', label: 'Phone', icon: Phone, description: 'Phone number' },
  { value: 'rating', label: 'Rating', icon: Star, description: 'Star rating (1-5)' },
  { value: 'progress', label: 'Progress', icon: BarChart, description: 'Progress bar (0-100)' },
  { value: 'reference', label: 'Reference', icon: Link, description: 'Link to block' },
  { value: 'tags', label: 'Tags', icon: Tag, description: 'Tag list' },
  { value: 'image', label: 'Image', icon: Image, description: 'Image URL' },
  { value: 'color', label: 'Color', icon: Palette, description: 'Color picker' },
  { value: 'formula', label: 'Formula', icon: Calculator, description: 'Computed value' },
]

const ICON_OPTIONS = [
  { value: 'User', icon: User },
  { value: 'Calendar', icon: Calendar },
  { value: 'CheckSquare', icon: CheckSquare },
  { value: 'Book', icon: Book },
  { value: 'FileText', icon: FileText },
  { value: 'Folder', icon: Folder },
  { value: 'Lightbulb', icon: Lightbulb },
  { value: 'HelpCircle', icon: HelpCircle },
  { value: 'GitBranch', icon: GitBranch },
  { value: 'CalendarDays', icon: CalendarDays },
  { value: 'Star', icon: Star },
  { value: 'Tag', icon: Tag },
  { value: 'Sparkles', icon: Sparkles },
  { value: 'Layers', icon: Layers },
]

const COLOR_OPTIONS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#fbbf24', // yellow
  '#a855f7', // purple
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#ef4444', // red
  '#22c55e', // green
]

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

interface FieldEditorProps {
  field: SupertagFieldDefinition
  onChange: (field: SupertagFieldDefinition) => void
  onRemove: () => void
  theme: 'light' | 'dark'
  isExpanded: boolean
  onToggleExpand: () => void
}

function FieldEditor({
  field,
  onChange,
  onRemove,
  theme,
  isExpanded,
  onToggleExpand,
}: FieldEditorProps) {
  const isDark = theme === 'dark'
  const fieldTypeConfig = FIELD_TYPE_OPTIONS.find(t => t.value === field.type)
  const Icon = fieldTypeConfig?.icon || Type

  const handleAddOption = () => {
    const options = field.options || []
    onChange({
      ...field,
      options: [...options, { value: `option_${options.length + 1}`, label: `Option ${options.length + 1}` }],
    })
  }

  const handleRemoveOption = (index: number) => {
    const options = [...(field.options || [])]
    options.splice(index, 1)
    onChange({ ...field, options })
  }

  const handleUpdateOption = (index: number, updates: Partial<{ value: string; label: string; color: string }>) => {
    const options = [...(field.options || [])]
    options[index] = { ...options[index], ...updates }
    onChange({ ...field, options })
  }

  return (
    <Reorder.Item
      value={field}
      id={field.name}
      className={cn(
        'rounded-lg overflow-hidden',
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-100/50'
      )}
    >
      {/* Field header */}
      <div className="flex items-center gap-2 p-3">
        <div className="cursor-grab">
          <GripVertical className="w-4 h-4 text-zinc-500" />
        </div>
        <div className={cn(
          'p-1.5 rounded',
          isDark ? 'bg-zinc-700' : 'bg-zinc-200'
        )}>
          <Icon className="w-4 h-4 text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={field.label}
            onChange={e => onChange({ ...field, label: e.target.value })}
            className={cn(
              'w-full bg-transparent text-sm font-medium outline-none',
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            )}
            placeholder="Field label"
          />
          <div className="text-xs text-zinc-500">
            {fieldTypeConfig?.description} • {field.name}
          </div>
        </div>
        <button
          onClick={onToggleExpand}
          className={cn(
            'p-1 rounded',
            isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={onRemove}
          className={cn(
            'p-1 rounded hover:bg-red-500/20',
            isDark ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'
          )}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded settings */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={cn(
              'p-3 pt-0 space-y-3 border-t',
              isDark ? 'border-zinc-700/50' : 'border-zinc-200'
            )}>
              {/* Field name */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Field Name (ID)</label>
                <input
                  type="text"
                  value={field.name}
                  onChange={e => onChange({ ...field, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className={cn(
                    'w-full px-2 py-1.5 rounded text-sm outline-none font-mono',
                    isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
                  )}
                />
              </div>

              {/* Field type */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Field Type</label>
                <select
                  value={field.type}
                  onChange={e => onChange({ ...field, type: e.target.value as SupertagFieldType })}
                  className={cn(
                    'w-full px-2 py-1.5 rounded text-sm outline-none',
                    isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
                  )}
                >
                  {FIELD_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Description (optional)</label>
                <input
                  type="text"
                  value={field.description || ''}
                  onChange={e => onChange({ ...field, description: e.target.value })}
                  placeholder="Help text for this field"
                  className={cn(
                    'w-full px-2 py-1.5 rounded text-sm outline-none',
                    isDark
                      ? 'bg-zinc-700 text-zinc-200 placeholder:text-zinc-500'
                      : 'bg-white text-zinc-800 placeholder:text-zinc-400'
                  )}
                />
              </div>

              {/* Required checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.required || false}
                  onChange={e => onChange({ ...field, required: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-zinc-500">Required field</span>
              </label>

              {/* Options for select/multiselect */}
              {(field.type === 'select' || field.type === 'multiselect') && (
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Options</label>
                  <div className="space-y-1">
                    {(field.options || []).map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={option.color || '#71717a'}
                          onChange={e => handleUpdateOption(idx, { color: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={option.label}
                          onChange={e => handleUpdateOption(idx, { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                          placeholder="Option label"
                          className={cn(
                            'flex-1 px-2 py-1 rounded text-sm outline-none',
                            isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
                          )}
                        />
                        <button
                          onClick={() => handleRemoveOption(idx)}
                          className="p-1 rounded hover:bg-red-500/20 text-zinc-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddOption}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded text-xs',
                        isDark ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-500 hover:bg-zinc-200'
                      )}
                    >
                      <Plus className="w-3 h-3" />
                      Add option
                    </button>
                  </div>
                </div>
              )}

              {/* Formula expression for formula fields */}
              {field.type === 'formula' && (
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Formula Expression</label>
                  <textarea
                    value={field.formula || ''}
                    onChange={e => onChange({ ...field, formula: e.target.value })}
                    placeholder="e.g., ADD(GET_FIELD(&quot;price&quot;), GET_FIELD(&quot;tax&quot;))"
                    rows={3}
                    className={cn(
                      'w-full px-2 py-1.5 rounded text-sm outline-none font-mono resize-none',
                      isDark
                        ? 'bg-zinc-700 text-zinc-200 placeholder:text-zinc-500'
                        : 'bg-white text-zinc-800 placeholder:text-zinc-400'
                    )}
                  />
                  <div className={cn(
                    'mt-2 p-2 rounded text-xs',
                    isDark ? 'bg-zinc-900/50 text-zinc-400' : 'bg-zinc-50 text-zinc-600'
                  )}>
                    <p className="font-medium mb-1">Available Functions:</p>
                    <div className="flex flex-wrap gap-1">
                      {['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'CONCAT', 'TODAY', 'NOW', 'GET_FIELD', 'RESOLVE_MENTION', 'ROUTE', 'WEATHER'].map(fn => (
                        <span
                          key={fn}
                          className={cn(
                            'px-1.5 py-0.5 rounded font-mono cursor-pointer',
                            isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-white hover:bg-zinc-100'
                          )}
                          onClick={() => onChange({ ...field, formula: (field.formula || '') + fn + '()' })}
                        >
                          {fn}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] opacity-70">
                      Click a function to insert. Formulas are computed at render time.
                    </p>
                  </div>
                </div>
              )}

              {/* Default value */}
              {field.type !== 'select' && field.type !== 'multiselect' && (
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Default Value (optional)</label>
                  {field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!field.defaultValue}
                        onChange={e => onChange({ ...field, defaultValue: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-zinc-500">Checked by default</span>
                    </label>
                  ) : field.type === 'number' || field.type === 'rating' || field.type === 'progress' ? (
                    <input
                      type="number"
                      value={field.defaultValue as number || ''}
                      onChange={e => onChange({ ...field, defaultValue: parseFloat(e.target.value) || 0 })}
                      className={cn(
                        'w-full px-2 py-1.5 rounded text-sm outline-none',
                        isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
                      )}
                    />
                  ) : (
                    <input
                      type="text"
                      value={field.defaultValue as string || ''}
                      onChange={e => onChange({ ...field, defaultValue: e.target.value })}
                      className={cn(
                        'w-full px-2 py-1.5 rounded text-sm outline-none',
                        isDark
                          ? 'bg-zinc-700 text-zinc-200 placeholder:text-zinc-500'
                          : 'bg-white text-zinc-800 placeholder:text-zinc-400'
                      )}
                    />
                  )}
                </div>
              )}

              {/* Validation rules */}
              {(field.type === 'text' || field.type === 'number') && (
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Validation</label>
                  <div className="flex items-center gap-2">
                    {field.type === 'number' && (
                      <>
                        <input
                          type="number"
                          value={field.validation?.min ?? ''}
                          onChange={e => onChange({
                            ...field,
                            validation: { ...field.validation, min: parseFloat(e.target.value) || undefined },
                          })}
                          placeholder="Min"
                          className={cn(
                            'w-20 px-2 py-1 rounded text-sm outline-none',
                            isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
                          )}
                        />
                        <span className="text-zinc-500">-</span>
                        <input
                          type="number"
                          value={field.validation?.max ?? ''}
                          onChange={e => onChange({
                            ...field,
                            validation: { ...field.validation, max: parseFloat(e.target.value) || undefined },
                          })}
                          placeholder="Max"
                          className={cn(
                            'w-20 px-2 py-1 rounded text-sm outline-none',
                            isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
                          )}
                        />
                      </>
                    )}
                    {field.type === 'text' && (
                      <input
                        type="text"
                        value={field.validation?.pattern || ''}
                        onChange={e => onChange({
                          ...field,
                          validation: { ...field.validation, pattern: e.target.value || undefined },
                        })}
                        placeholder="Regex pattern (optional)"
                        className={cn(
                          'flex-1 px-2 py-1 rounded text-sm outline-none font-mono',
                          isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
                        )}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE SELECTOR
═══════════════════════════════════════════════════════════════════════════ */

interface TemplateSelectorProps {
  onSelect: (template: BuiltInSupertag) => void
  theme: 'light' | 'dark'
}

function TemplateSelector({ onSelect, theme }: TemplateSelectorProps) {
  const isDark = theme === 'dark'

  const templates = Object.entries(BUILT_IN_SCHEMAS).map(([key, schema]) => ({
    key: key as BuiltInSupertag,
    ...schema,
  }))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {templates.map(template => (
        <button
          key={template.key}
          onClick={() => onSelect(template.key)}
          className={cn(
            'flex items-center gap-3 p-3 sm:p-3.5 rounded-xl text-left transition-all group',
            isDark
              ? 'hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700'
              : 'hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300',
            'hover:shadow-sm active:scale-[0.98]'
          )}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
            style={{ backgroundColor: `${template.color}15`, boxShadow: `0 0 0 1px ${template.color}25` }}
          >
            <Sparkles className="w-5 h-5" style={{ color: template.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn(
              'text-sm font-medium',
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            )}>
              {template.displayName}
            </div>
            <div className="text-xs text-zinc-500 truncate">
              {template.fields.length} fields • {template.description?.slice(0, 30) || 'Custom schema'}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </button>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function SupertagSchemaDesigner({
  schema,
  onSave,
  onCancel,
  theme = 'dark',
  className,
}: SupertagSchemaDesignerProps) {
  const isDark = theme === 'dark'
  const isEditing = !!schema

  // Form state
  const [tagName, setTagName] = useState(schema?.tagName || '')
  const [displayName, setDisplayName] = useState(schema?.displayName || '')
  const [description, setDescription] = useState(schema?.description || '')
  const [icon, setIcon] = useState(schema?.icon || 'Sparkles')
  const [color, setColor] = useState(schema?.color || '#3b82f6')
  const [fields, setFields] = useState<SupertagFieldDefinition[]>(schema?.fields || [])
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())
  const [showTemplates, setShowTemplates] = useState(!isEditing && fields.length === 0)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-generate tag name from display name
  useEffect(() => {
    if (!isEditing && displayName && !tagName) {
      setTagName(displayName.toLowerCase().replace(/\s+/g, '_'))
    }
  }, [displayName, tagName, isEditing])

  // Load template
  const handleSelectTemplate = useCallback((templateKey: BuiltInSupertag) => {
    const template = BUILT_IN_SCHEMAS[templateKey]
    setTagName(template.tagName)
    setDisplayName(template.displayName)
    setDescription(template.description || '')
    setIcon(template.icon || 'Sparkles')
    setColor(template.color || '#3b82f6')
    setFields(template.fields.map(f => ({ ...f })))
    setShowTemplates(false)
  }, [])

  // Add field
  const addField = useCallback(() => {
    const newField: SupertagFieldDefinition = {
      name: `field_${fields.length + 1}`,
      label: `Field ${fields.length + 1}`,
      type: 'text',
      order: fields.length,
    }
    setFields(prev => [...prev, newField])
    setExpandedFields(prev => new Set(prev).add(newField.name))
  }, [fields.length])

  // Update field
  const updateField = useCallback((index: number, updates: SupertagFieldDefinition) => {
    setFields(prev => {
      const newFields = [...prev]
      // Update expanded fields set if name changed
      if (prev[index].name !== updates.name) {
        setExpandedFields(exp => {
          const newExp = new Set(exp)
          newExp.delete(prev[index].name)
          if (exp.has(prev[index].name)) {
            newExp.add(updates.name)
          }
          return newExp
        })
      }
      newFields[index] = updates
      return newFields
    })
  }, [])

  // Remove field
  const removeField = useCallback((index: number) => {
    setFields(prev => {
      const newFields = [...prev]
      const removed = newFields.splice(index, 1)[0]
      setExpandedFields(exp => {
        const newExp = new Set(exp)
        newExp.delete(removed.name)
        return newExp
      })
      return newFields
    })
  }, [])

  // Reorder fields
  const handleReorder = useCallback((reorderedFields: SupertagFieldDefinition[]) => {
    setFields(reorderedFields.map((f, idx) => ({ ...f, order: idx })))
  }, [])

  // Toggle field expansion
  const toggleFieldExpand = useCallback((fieldName: string) => {
    setExpandedFields(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fieldName)) {
        newSet.delete(fieldName)
      } else {
        newSet.add(fieldName)
      }
      return newSet
    })
  }, [])

  // Save schema
  const handleSave = async () => {
    // Validate
    if (!tagName.trim()) {
      setError('Tag name is required')
      return
    }
    if (!displayName.trim()) {
      setError('Display name is required')
      return
    }
    if (fields.length === 0) {
      setError('At least one field is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      let savedSchema: SupertagSchema

      if (isEditing && schema) {
        // Update existing
        const success = await updateSchema(schema.id, {
          tagName: tagName.trim(),
          displayName: displayName.trim(),
          description: description.trim() || undefined,
          icon,
          color,
          fields,
        })
        if (!success) {
          throw new Error('Failed to update schema')
        }
        // Construct the updated schema
        savedSchema = {
          ...schema,
          tagName: tagName.trim(),
          displayName: displayName.trim(),
          description: description.trim() || undefined,
          icon,
          color,
          fields,
          updatedAt: new Date().toISOString(),
        }
      } else {
        // Create new
        const newSchema = await createSchema({
          tagName: tagName.trim(),
          displayName: displayName.trim(),
          description: description.trim() || undefined,
          icon,
          color,
          fields,
        })
        if (!newSchema) {
          throw new Error('Failed to create schema')
        }
        savedSchema = newSchema
      }

      onSave?.(savedSchema)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schema')
    } finally {
      setSaving(false)
    }
  }

  // Get icon component
  const getIconComponent = (iconName: string) => {
    const iconConfig = ICON_OPTIONS.find(i => i.value === iconName)
    return iconConfig?.icon || Sparkles
  }

  const IconComponent = getIconComponent(icon)

  return (
    <div className={cn(
      'flex flex-col h-full',
      isDark ? 'bg-zinc-900' : 'bg-white',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4 border-b shrink-0',
        isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-white/80',
        'backdrop-blur-sm'
      )}>
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center cursor-pointer relative shrink-0 transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: `${color}20`, boxShadow: `0 0 0 1px ${color}30` }}
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Click to change color"
        >
          <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" style={{ color }} />

          {/* Color picker dropdown */}
          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                className={cn(
                  'absolute top-full left-0 mt-2 p-3 rounded-xl shadow-xl',
                  isDark ? 'bg-zinc-800 border border-zinc-600' : 'bg-white border border-zinc-200'
                )}
                style={{ zIndex: 1200 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">Color</div>
                <div className="grid grid-cols-6 gap-1.5">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        setColor(c)
                        setShowColorPicker(false)
                      }}
                      className={cn(
                        'w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all hover:scale-110 active:scale-95',
                        color === c && 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Supertag Name"
            className={cn(
              'w-full bg-transparent text-base sm:text-lg font-semibold outline-none',
              isDark
                ? 'text-zinc-100 placeholder:text-zinc-600'
                : 'text-zinc-800 placeholder:text-zinc-400'
            )}
          />
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-zinc-500 text-sm">#</span>
            <input
              type="text"
              value={tagName}
              onChange={e => setTagName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="tag_name"
              className={cn(
                'flex-1 bg-transparent text-xs sm:text-sm font-mono outline-none',
                isDark
                  ? 'text-zinc-400 placeholder:text-zinc-600'
                  : 'text-zinc-600 placeholder:text-zinc-400'
              )}
            />
          </div>
        </div>

        {/* Icon picker */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowIconPicker(!showIconPicker)}
            className={cn(
              'p-2.5 sm:p-2 rounded-xl transition-colors',
              showIconPicker
                ? (isDark ? 'bg-zinc-700' : 'bg-zinc-200')
                : (isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100')
            )}
            title="Change icon"
          >
            <Palette className="w-5 h-5 text-zinc-400" />
          </button>

          <AnimatePresence>
            {showIconPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                className={cn(
                  'absolute top-full right-0 mt-2 p-3 rounded-xl shadow-xl',
                  isDark ? 'bg-zinc-800 border border-zinc-600' : 'bg-white border border-zinc-200'
                )}
                style={{ zIndex: 1200 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-medium">Icon</div>
                <div className="grid grid-cols-4 gap-1">
                  {ICON_OPTIONS.map(opt => {
                    const OptIcon = opt.icon
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setIcon(opt.value)
                          setShowIconPicker(false)
                        }}
                        className={cn(
                          'p-2.5 rounded-lg transition-all',
                          icon === opt.value
                            ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                            : (isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500')
                        )}
                      >
                        <OptIcon className="w-5 h-5" />
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className={cn(
              'p-2.5 sm:p-2 rounded-xl shrink-0 transition-colors',
              isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
            )}
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Description */}
      <div className={cn(
        'px-3 sm:px-4 py-2.5 sm:py-3 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Add a description to help others understand this supertag..."
          className={cn(
            'w-full bg-transparent text-sm outline-none',
            isDark
              ? 'text-zinc-300 placeholder:text-zinc-600'
              : 'text-zinc-600 placeholder:text-zinc-400'
          )}
        />
      </div>

      {/* Template selection or Fields */}
      <div className="flex-1 overflow-y-auto">
        {showTemplates ? (
          <div className="p-3 sm:p-4">
            {/* Info box about supertags */}
            <div className={cn(
              'mb-4 p-3 sm:p-4 rounded-xl border',
              isDark
                ? 'bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20'
                : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'
            )}>
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2 rounded-lg shrink-0',
                  isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                )}>
                  <HelpCircle className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h4 className={cn(
                    'text-xs font-semibold mb-1',
                    isDark ? 'text-zinc-200' : 'text-zinc-800'
                  )}>
                    What are Supertags?
                  </h4>
                  <p className={cn(
                    'text-[11px] leading-relaxed',
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  )}>
                    <strong>Regular tags</strong> are simple labels like #project or #idea.
                    <strong> Supertags</strong> add structure with custom fields—turn #book into a rich record with author, rating, and reading progress.
                    Great for building databases within your notes.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h3 className={cn(
                'text-sm font-semibold',
                isDark ? 'text-zinc-200' : 'text-zinc-800'
              )}>
                Start from a template
              </h3>
              <button
                onClick={() => setShowTemplates(false)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                  isDark ? 'text-zinc-300 hover:bg-zinc-800 bg-zinc-800/50' : 'text-zinc-600 hover:bg-zinc-100 bg-zinc-50'
                )}
              >
                Start from scratch
              </button>
            </div>
            <TemplateSelector onSelect={handleSelectTemplate} theme={theme} />
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-3">
            {/* Fields header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className={cn(
                'text-sm font-semibold',
                isDark ? 'text-zinc-200' : 'text-zinc-800'
              )}>
                Fields <span className="text-zinc-500 font-normal">({fields.length})</span>
              </h3>
              <button
                onClick={() => setShowTemplates(true)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                  isDark ? 'text-zinc-300 hover:bg-zinc-800 bg-zinc-800/50' : 'text-zinc-600 hover:bg-zinc-100 bg-zinc-50'
                )}
              >
                Load template
              </button>
            </div>

            {/* Fields list */}
            <Reorder.Group
              axis="y"
              values={fields}
              onReorder={handleReorder}
              className="space-y-2"
            >
              {fields.map((field, idx) => (
                <FieldEditor
                  key={field.name}
                  field={field}
                  onChange={updates => updateField(idx, updates)}
                  onRemove={() => removeField(idx)}
                  theme={theme}
                  isExpanded={expandedFields.has(field.name)}
                  onToggleExpand={() => toggleFieldExpand(field.name)}
                />
              ))}
            </Reorder.Group>

            {fields.length === 0 && (
              <div className={cn(
                'text-center py-10 sm:py-12 rounded-xl border-2 border-dashed',
                isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'
              )}>
                <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className={cn('text-sm font-medium', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                  No fields yet
                </p>
                <p className="text-xs mt-1 opacity-70">
                  Add fields to define your supertag schema
                </p>
              </div>
            )}

            {/* Add field button */}
            <button
              onClick={addField}
              className={cn(
                'w-full flex items-center justify-center gap-2 p-3 sm:p-4 rounded-xl border-2 border-dashed transition-all',
                isDark
                  ? 'border-zinc-800 hover:border-zinc-600 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                  : 'border-zinc-200 hover:border-zinc-400 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50',
                'active:scale-[0.99]'
              )}
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">Add Field</span>
            </button>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className={cn(
          'flex items-center gap-2 px-3 sm:px-4 py-2.5 mx-3 sm:mx-4 mb-2 rounded-xl',
          'bg-red-500/10 text-red-400 border border-red-500/20'
        )}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-xs sm:text-sm">{error}</span>
        </div>
      )}

      {/* Footer */}
      <div className={cn(
        'flex items-center justify-end gap-2 px-3 sm:px-4 py-3 sm:py-4 border-t shrink-0',
        isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-white/80',
        'backdrop-blur-sm'
      )}>
        {onCancel && (
          <button
            onClick={onCancel}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isDark ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'
            )}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !tagName || !displayName}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
            saving || !tagName || !displayName
              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98]'
          )}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isEditing ? 'Update Schema' : 'Create Schema'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default SupertagSchemaDesigner
