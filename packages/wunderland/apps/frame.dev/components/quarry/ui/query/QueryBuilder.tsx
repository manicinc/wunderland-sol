/**
 * Query Builder Component
 * @module codex/ui/QueryBuilder
 *
 * @description
 * Visual query builder for constructing complex search queries.
 * Provides a drag-and-drop interface for building filter conditions.
 *
 * @features
 * - Visual condition builder
 * - Boolean operators (AND/OR/NOT)
 * - Field autocomplete
 * - Tag suggestions
 * - Supertag field queries
 * - Sort and pagination controls
 * - Query preview and validation
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  Search,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Tag,
  Hash,
  Calendar,
  FileText,
  Code,
  ArrowUpDown,
  X,
  Play,
  Save,
  RotateCcw,
  Sparkles,
  Filter,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Layers,
  HelpCircle,
  Info,
} from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  parseQuery,
  serializeQuery,
  validateQuery,
  type RootQueryNode,
  type QueryNode,
  type ComparisonOperator,
  type SortClause,
  type SortDirection,
} from '@/lib/query'
import { quickSearch } from '@/lib/query/queryEngine'
import { getAllSchemas, getSchemaByTagName, type SupertagSchema, type SupertagFieldDefinition } from '@/lib/supertags'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface QueryBuilderProps {
  /** Initial query string or AST */
  initialQuery?: string | RootQueryNode
  /** Callback when query changes */
  onQueryChange?: (query: RootQueryNode, queryString: string) => void
  /** Callback when executing query */
  onExecute?: (query: RootQueryNode) => void
  /** Callback to save query */
  onSave?: (query: RootQueryNode, name: string) => void
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Whether to show the query preview */
  showPreview?: boolean
  /** Whether to show execute button */
  showExecute?: boolean
  /** Compact mode for sidebar use */
  compact?: boolean
  /** Additional class names */
  className?: string
}

interface ConditionItem {
  id: string
  type: 'text' | 'tag' | 'field' | 'type' | 'date' | 'supertag' | 'group'
  // For text
  textValue?: string
  exact?: boolean
  // For tag
  tagName?: string
  exclude?: boolean
  // For field
  field?: string
  operator?: ComparisonOperator
  value?: string | number | boolean
  // For type
  targetType?: string
  // For date
  dateField?: 'created' | 'updated'
  dateValue?: string
  // For supertag
  supertagName?: string
  supertagFields?: Array<{ name: string; operator: ComparisonOperator; value: string }>
  // For group
  children?: ConditionItem[]
  booleanOp?: 'and' | 'or'
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const FIELD_OPTIONS = [
  { value: 'title', label: 'Title', icon: FileText },
  { value: 'content', label: 'Content', icon: FileText },
  { value: 'summary', label: 'Summary', icon: FileText },
  { value: 'weave', label: 'Weave', icon: Layers },
  { value: 'loom', label: 'Loom', icon: Layers },
  { value: 'path', label: 'Path', icon: FileText },
  { value: 'difficulty', label: 'Difficulty', icon: Sparkles },
  { value: 'word_count', label: 'Word Count', icon: Hash },
  { value: 'worthiness', label: 'Worthiness', icon: Sparkles },
  { value: 'heading_level', label: 'Heading Level', icon: Hash },
]

const OPERATOR_OPTIONS: Array<{ value: ComparisonOperator; label: string }> = [
  { value: '=', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: '>', label: 'greater than' },
  { value: '<', label: 'less than' },
  { value: '>=', label: 'at least' },
  { value: '<=', label: 'at most' },
  { value: '~', label: 'contains' },
  { value: '!~', label: 'not contains' },
  { value: '^', label: 'starts with' },
  { value: '$', label: 'ends with' },
]

const TYPE_OPTIONS = [
  { value: 'strand', label: 'Strand' },
  { value: 'block', label: 'Block' },
  { value: 'heading', label: 'Heading' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'code', label: 'Code' },
  { value: 'list', label: 'List' },
  { value: 'blockquote', label: 'Blockquote' },
  { value: 'table', label: 'Table' },
]

const SORT_FIELDS = [
  { value: 'updated', label: 'Last Updated' },
  { value: 'created', label: 'Created' },
  { value: 'title', label: 'Title' },
  { value: 'worthiness', label: 'Worthiness' },
  { value: 'word_count', label: 'Word Count' },
]

/* ═══════════════════════════════════════════════════════════════════════════
   TOOLTIP COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 px-3 py-2 text-xs rounded-lg shadow-xl max-w-xs whitespace-normal',
              positionClasses[placement],
              'bg-zinc-800 text-zinc-200 border border-zinc-700'
            )}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELP CONTENT
═══════════════════════════════════════════════════════════════════════════ */

const QUERY_BUILDER_HELP = {
  overview: (
    <div className="space-y-2">
      <p className="font-medium">Query Builder Help</p>
      <p>Build complex search queries by combining conditions:</p>
      <ul className="list-disc pl-4 space-y-1">
        <li><strong>Text Search</strong> - Find content containing specific text</li>
        <li><strong>Tag Filter</strong> - Filter by tags (use # prefix)</li>
        <li><strong>Field Query</strong> - Compare specific fields like title, difficulty</li>
        <li><strong>Content Type</strong> - Filter by strand, block, heading, etc.</li>
        <li><strong>Date Range</strong> - Filter by created/updated dates</li>
        <li><strong>Supertag Query</strong> - Query structured tag fields</li>
      </ul>
      <p className="text-zinc-500 mt-2">Use AND/OR to combine multiple conditions.</p>
    </div>
  ),
  textSearch: 'Search for text in title, content, and summary. Enable "Exact" for exact phrase matching.',
  tagFilter: 'Filter by tags. Enable "Exclude" to find items without this tag.',
  fieldQuery: 'Query specific fields with comparison operators like equals, contains, greater than.',
  contentType: 'Filter by content type: strand (full document), block, heading, paragraph, code, etc.',
  dateRange: 'Filter by creation or last update date.',
  supertagQuery: 'Query items tagged with a supertag and optionally filter by their field values.',
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

interface ConditionEditorProps {
  condition: ConditionItem
  onChange: (condition: ConditionItem) => void
  onRemove: () => void
  theme: 'light' | 'dark'
  compact: boolean
}

function ConditionEditor({
  condition,
  onChange,
  onRemove,
  theme,
  compact,
}: ConditionEditorProps) {
  const isDark = theme === 'dark'
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [availableSupertags, setAvailableSupertags] = useState<SupertagSchema[]>([])
  const [selectedSupertagSchema, setSelectedSupertagSchema] = useState<SupertagSchema | null>(null)

  // Load supertag schemas
  useEffect(() => {
    getAllSchemas().then(setAvailableSupertags).catch(console.error)
  }, [])

  // Update selected schema when supertag name changes
  useEffect(() => {
    if (condition.type === 'supertag' && condition.supertagName) {
      const schema = availableSupertags.find(s => s.tagName === condition.supertagName)
      setSelectedSupertagSchema(schema || null)
    } else {
      setSelectedSupertagSchema(null)
    }
  }, [condition.type, condition.supertagName, availableSupertags])

  // Fetch tag suggestions
  const handleTagInput = useCallback(async (value: string) => {
    onChange({ ...condition, tagName: value })
    if (value.length >= 2) {
      const results = await quickSearch(value, { types: ['tag'], limit: 5 })
      setTagSuggestions(results.tags)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }, [condition, onChange])

  const selectSuggestion = useCallback((tag: string) => {
    onChange({ ...condition, tagName: tag })
    setShowSuggestions(false)
  }, [condition, onChange])

  const getConditionIcon = () => {
    switch (condition.type) {
      case 'text': return Search
      case 'tag': return Tag
      case 'field': return Hash
      case 'type': return FileText
      case 'date': return Calendar
      case 'supertag': return Sparkles
      case 'group': return Filter
      default: return Search
    }
  }

  const Icon = getConditionIcon()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg',
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-100/50',
        compact && 'p-1.5'
      )}
    >
      {/* Drag handle */}
      <div className="cursor-grab mt-1.5">
        <GripVertical className="w-4 h-4 text-zinc-500" />
      </div>

      {/* Condition type icon */}
      <div className={cn(
        'p-1.5 rounded',
        isDark ? 'bg-zinc-700' : 'bg-zinc-200'
      )}>
        <Icon className="w-4 h-4 text-zinc-500" />
      </div>

      {/* Condition editor based on type */}
      <div className="flex-1 space-y-2">
        {condition.type === 'text' && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={condition.textValue || ''}
              onChange={e => onChange({ ...condition, textValue: e.target.value })}
              placeholder="Search text..."
              className={cn(
                'flex-1 px-2 py-1 rounded text-sm outline-none',
                isDark
                  ? 'bg-zinc-700 text-zinc-200 placeholder:text-zinc-500'
                  : 'bg-white text-zinc-800 placeholder:text-zinc-400'
              )}
            />
            <label className="flex items-center gap-1 text-xs text-zinc-500 cursor-pointer">
              <input
                type="checkbox"
                checked={condition.exact || false}
                onChange={e => onChange({ ...condition, exact: e.target.checked })}
                className="rounded"
              />
              Exact
            </label>
          </div>
        )}

        {condition.type === 'tag' && (
          <div className="relative">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-zinc-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={condition.exclude || false}
                  onChange={e => onChange({ ...condition, exclude: e.target.checked })}
                  className="rounded"
                />
                Exclude
              </label>
              <span className="text-zinc-500">#</span>
              <input
                type="text"
                value={condition.tagName || ''}
                onChange={e => handleTagInput(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="tag-name"
                className={cn(
                  'flex-1 px-2 py-1 rounded text-sm outline-none',
                  isDark
                    ? 'bg-zinc-700 text-zinc-200 placeholder:text-zinc-500'
                    : 'bg-white text-zinc-800 placeholder:text-zinc-400'
                )}
              />
            </div>
            {showSuggestions && tagSuggestions.length > 0 && (
              <div className={cn(
                'absolute z-10 left-0 right-0 mt-1 rounded-lg shadow-lg overflow-hidden',
                isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
              )}>
                {tagSuggestions.map(tag => (
                  <button
                    key={tag}
                    onClick={() => selectSuggestion(tag)}
                    className={cn(
                      'w-full px-3 py-1.5 text-left text-sm',
                      isDark ? 'hover:bg-zinc-700 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                    )}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {condition.type === 'field' && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={condition.field || ''}
              onChange={e => onChange({ ...condition, field: e.target.value })}
              className={cn(
                'px-2 py-1 rounded text-sm outline-none',
                isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
              )}
            >
              <option value="">Select field...</option>
              {FIELD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={condition.operator || '='}
              onChange={e => onChange({ ...condition, operator: e.target.value as ComparisonOperator })}
              className={cn(
                'px-2 py-1 rounded text-sm outline-none',
                isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
              )}
            >
              {OPERATOR_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={String(condition.value || '')}
              onChange={e => onChange({ ...condition, value: e.target.value })}
              placeholder="Value..."
              className={cn(
                'flex-1 min-w-[100px] px-2 py-1 rounded text-sm outline-none',
                isDark
                  ? 'bg-zinc-700 text-zinc-200 placeholder:text-zinc-500'
                  : 'bg-white text-zinc-800 placeholder:text-zinc-400'
              )}
            />
          </div>
        )}

        {condition.type === 'type' && (
          <select
            value={condition.targetType || ''}
            onChange={e => onChange({ ...condition, targetType: e.target.value })}
            className={cn(
              'w-full px-2 py-1 rounded text-sm outline-none',
              isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
            )}
          >
            <option value="">Select type...</option>
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {condition.type === 'date' && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={condition.dateField || 'created'}
              onChange={e => onChange({ ...condition, dateField: e.target.value as 'created' | 'updated' })}
              className={cn(
                'px-2 py-1 rounded text-sm outline-none',
                isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
              )}
            >
              <option value="created">Created</option>
              <option value="updated">Updated</option>
            </select>
            <select
              value={condition.operator || '>='}
              onChange={e => onChange({ ...condition, operator: e.target.value as ComparisonOperator })}
              className={cn(
                'px-2 py-1 rounded text-sm outline-none',
                isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
              )}
            >
              <option value=">=">after</option>
              <option value="<=">before</option>
              <option value="=">on</option>
            </select>
            <input
              type="date"
              value={condition.dateValue || ''}
              onChange={e => onChange({ ...condition, dateValue: e.target.value })}
              className={cn(
                'flex-1 px-2 py-1 rounded text-sm outline-none',
                isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-white text-zinc-800'
              )}
            />
          </div>
        )}

        {condition.type === 'supertag' && (
          <div className="space-y-2">
            {/* Supertag selector */}
            <div className="flex items-center gap-2">
              <span className="text-amber-500">#</span>
              <select
                value={condition.supertagName || ''}
                onChange={e => {
                  const schema = availableSupertags.find(s => s.tagName === e.target.value)
                  onChange({
                    ...condition,
                    supertagName: e.target.value,
                    // Reset fields when supertag changes
                    supertagFields: []
                  })
                }}
                className={cn(
                  'flex-1 px-2 py-1 rounded text-sm outline-none',
                  isDark
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'bg-white text-zinc-800'
                )}
              >
                <option value="">Select supertag...</option>
                {availableSupertags.map(st => (
                  <option key={st.id} value={st.tagName}>
                    {st.displayName || st.tagName}
                  </option>
                ))}
              </select>
            </div>

            {/* Schema fields - show when supertag selected */}
            {selectedSupertagSchema && selectedSupertagSchema.fields.length > 0 && (
              <div className="pl-4 space-y-1.5">
                <div className={cn(
                  'text-[10px] uppercase tracking-wider',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  Filter by fields
                </div>
                {selectedSupertagSchema.fields.map((schemaField) => {
                  const fieldCondition = (condition.supertagFields || []).find(f => f.name === schemaField.name)
                  const hasValue = fieldCondition && fieldCondition.value !== ''

                  return (
                    <div key={schemaField.name} className="flex items-center gap-1.5">
                      <span className={cn(
                        'text-[10px] w-20 truncate',
                        hasValue
                          ? (isDark ? 'text-amber-400' : 'text-amber-600')
                          : (isDark ? 'text-zinc-500' : 'text-zinc-400')
                      )}>
                        {schemaField.label}
                      </span>

                      {/* Operator - only for non-boolean fields */}
                      {schemaField.type !== 'checkbox' && (
                        <select
                          value={fieldCondition?.operator || '='}
                          onChange={e => {
                            const fields = [...(condition.supertagFields || [])]
                            const idx = fields.findIndex(f => f.name === schemaField.name)
                            if (idx >= 0) {
                              fields[idx] = { ...fields[idx], operator: e.target.value as ComparisonOperator }
                            } else {
                              fields.push({ name: schemaField.name, operator: e.target.value as ComparisonOperator, value: '' })
                            }
                            onChange({ ...condition, supertagFields: fields })
                          }}
                          className={cn(
                            'px-1 py-0.5 rounded text-[10px] outline-none w-14',
                            isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                          )}
                        >
                          {(schemaField.type === 'number' || schemaField.type === 'rating' || schemaField.type === 'progress'
                            ? OPERATOR_OPTIONS.slice(0, 6)
                            : OPERATOR_OPTIONS.slice(0, 2).concat(OPERATOR_OPTIONS.slice(6, 8))
                          ).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}

                      {/* Value input - type-specific */}
                      {schemaField.type === 'checkbox' ? (
                        <select
                          value={fieldCondition?.value || ''}
                          onChange={e => {
                            const fields = [...(condition.supertagFields || [])]
                            const idx = fields.findIndex(f => f.name === schemaField.name)
                            if (idx >= 0) {
                              if (e.target.value === '') {
                                fields.splice(idx, 1)
                              } else {
                                fields[idx] = { ...fields[idx], value: e.target.value }
                              }
                            } else if (e.target.value !== '') {
                              fields.push({ name: schemaField.name, operator: '=', value: e.target.value })
                            }
                            onChange({ ...condition, supertagFields: fields })
                          }}
                          className={cn(
                            'flex-1 px-1.5 py-0.5 rounded text-[10px] outline-none',
                            isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                          )}
                        >
                          <option value="">Any</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : schemaField.type === 'select' && schemaField.options ? (
                        <select
                          value={fieldCondition?.value || ''}
                          onChange={e => {
                            const fields = [...(condition.supertagFields || [])]
                            const idx = fields.findIndex(f => f.name === schemaField.name)
                            if (idx >= 0) {
                              if (e.target.value === '') {
                                fields.splice(idx, 1)
                              } else {
                                fields[idx] = { ...fields[idx], value: e.target.value }
                              }
                            } else if (e.target.value !== '') {
                              fields.push({ name: schemaField.name, operator: '=', value: e.target.value })
                            }
                            onChange({ ...condition, supertagFields: fields })
                          }}
                          className={cn(
                            'flex-1 px-1.5 py-0.5 rounded text-[10px] outline-none',
                            isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                          )}
                        >
                          <option value="">Any</option>
                          {schemaField.options.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : schemaField.type === 'rating' ? (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              onClick={() => {
                                const fields = [...(condition.supertagFields || [])]
                                const idx = fields.findIndex(f => f.name === schemaField.name)
                                const newValue = fieldCondition?.value === String(n) ? '' : String(n)
                                if (idx >= 0) {
                                  if (newValue === '') {
                                    fields.splice(idx, 1)
                                  } else {
                                    fields[idx] = { ...fields[idx], value: newValue }
                                  }
                                } else if (newValue !== '') {
                                  fields.push({ name: schemaField.name, operator: fieldCondition?.operator || '>=', value: newValue })
                                }
                                onChange({ ...condition, supertagFields: fields })
                              }}
                              className={cn(
                                'w-4 h-4 rounded text-[9px] font-medium transition-colors',
                                fieldCondition?.value === String(n)
                                  ? 'bg-amber-500 text-white'
                                  : (isDark ? 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600' : 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300')
                              )}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      ) : schemaField.type === 'date' || schemaField.type === 'datetime' ? (
                        <input
                          type="date"
                          value={fieldCondition?.value || ''}
                          onChange={e => {
                            const fields = [...(condition.supertagFields || [])]
                            const idx = fields.findIndex(f => f.name === schemaField.name)
                            if (idx >= 0) {
                              if (e.target.value === '') {
                                fields.splice(idx, 1)
                              } else {
                                fields[idx] = { ...fields[idx], value: e.target.value }
                              }
                            } else if (e.target.value !== '') {
                              fields.push({ name: schemaField.name, operator: fieldCondition?.operator || '=', value: e.target.value })
                            }
                            onChange({ ...condition, supertagFields: fields })
                          }}
                          className={cn(
                            'flex-1 px-1.5 py-0.5 rounded text-[10px] outline-none',
                            isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                          )}
                        />
                      ) : schemaField.type === 'number' || schemaField.type === 'progress' ? (
                        <input
                          type="number"
                          value={fieldCondition?.value || ''}
                          onChange={e => {
                            const fields = [...(condition.supertagFields || [])]
                            const idx = fields.findIndex(f => f.name === schemaField.name)
                            if (idx >= 0) {
                              if (e.target.value === '') {
                                fields.splice(idx, 1)
                              } else {
                                fields[idx] = { ...fields[idx], value: e.target.value }
                              }
                            } else if (e.target.value !== '') {
                              fields.push({ name: schemaField.name, operator: fieldCondition?.operator || '=', value: e.target.value })
                            }
                            onChange({ ...condition, supertagFields: fields })
                          }}
                          placeholder={schemaField.type === 'progress' ? '0-100' : ''}
                          min={schemaField.type === 'progress' ? 0 : undefined}
                          max={schemaField.type === 'progress' ? 100 : undefined}
                          className={cn(
                            'flex-1 px-1.5 py-0.5 rounded text-[10px] outline-none w-16',
                            isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                          )}
                        />
                      ) : (
                        <input
                          type="text"
                          value={fieldCondition?.value || ''}
                          onChange={e => {
                            const fields = [...(condition.supertagFields || [])]
                            const idx = fields.findIndex(f => f.name === schemaField.name)
                            if (idx >= 0) {
                              if (e.target.value === '') {
                                fields.splice(idx, 1)
                              } else {
                                fields[idx] = { ...fields[idx], value: e.target.value }
                              }
                            } else if (e.target.value !== '') {
                              fields.push({ name: schemaField.name, operator: fieldCondition?.operator || '~', value: e.target.value })
                            }
                            onChange({ ...condition, supertagFields: fields })
                          }}
                          placeholder={schemaField.label}
                          className={cn(
                            'flex-1 px-1.5 py-0.5 rounded text-[10px] outline-none',
                            isDark ? 'bg-zinc-700 text-zinc-300 placeholder:text-zinc-600' : 'bg-zinc-100 text-zinc-700 placeholder:text-zinc-400'
                          )}
                        />
                      )}

                      {/* Clear button */}
                      {hasValue && (
                        <button
                          onClick={() => {
                            const fields = (condition.supertagFields || []).filter(f => f.name !== schemaField.name)
                            onChange({ ...condition, supertagFields: fields })
                          }}
                          className="p-0.5 rounded hover:bg-red-500/20"
                        >
                          <X className="w-2.5 h-2.5 text-zinc-500" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* No schema selected hint */}
            {!selectedSupertagSchema && condition.supertagName && (
              <div className={cn(
                'pl-4 text-[10px] italic',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}>
                No schema found for #{condition.supertagName}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className={cn(
          'p-1 rounded hover:bg-red-500/20',
          isDark ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'
        )}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADD CONDITION MENU
═══════════════════════════════════════════════════════════════════════════ */

interface AddConditionMenuProps {
  onAdd: (type: ConditionItem['type']) => void
  theme: 'light' | 'dark'
}

function AddConditionMenu({ onAdd, theme }: AddConditionMenuProps) {
  const [open, setOpen] = useState(false)
  const isDark = theme === 'dark'

  const options = [
    { type: 'text' as const, label: 'Text Search', icon: Search, color: 'blue', desc: 'Search in content' },
    { type: 'tag' as const, label: 'Tag Filter', icon: Tag, color: 'emerald', desc: 'Filter by #tags' },
    { type: 'field' as const, label: 'Field Query', icon: Hash, color: 'purple', desc: 'Compare field values' },
    { type: 'type' as const, label: 'Content Type', icon: FileText, color: 'amber', desc: 'Strand, block, etc.' },
    { type: 'date' as const, label: 'Date Range', icon: Calendar, color: 'rose', desc: 'Created/updated dates' },
    { type: 'supertag' as const, label: 'Supertag Query', icon: Sparkles, color: 'orange', desc: 'Query supertag fields' },
  ]

  const colorClasses: Record<string, { bg: string; text: string; hover: string }> = {
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-500', hover: 'hover:bg-blue-500/30' },
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-500', hover: 'hover:bg-emerald-500/30' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-500', hover: 'hover:bg-purple-500/30' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-500', hover: 'hover:bg-amber-500/30' },
    rose: { bg: 'bg-rose-500/20', text: 'text-rose-500', hover: 'hover:bg-rose-500/30' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-500', hover: 'hover:bg-orange-500/30' },
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors',
          isDark
            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
        )}
      >
        <Plus className="w-3 h-3" />
        Add
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className={cn(
              'absolute z-20 left-0 mt-1 w-52 rounded-lg shadow-xl overflow-hidden',
              isDark
                ? 'bg-zinc-800 border border-zinc-700'
                : 'bg-white border border-zinc-200'
            )}
          >
            {options.map(opt => {
              const colors = colorClasses[opt.color]
              return (
                <button
                  key={opt.type}
                  onClick={() => {
                    onAdd(opt.type)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors',
                    isDark ? 'hover:bg-zinc-700/50 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'
                  )}
                >
                  <opt.icon className={cn('w-3.5 h-3.5', colors.text)} />
                  <span className="text-[11px]">{opt.label}</span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function QueryBuilder({
  initialQuery,
  onQueryChange,
  onExecute,
  onSave,
  theme = 'dark',
  showPreview = true,
  showExecute = true,
  compact = false,
  className,
}: QueryBuilderProps) {
  const isDark = theme === 'dark'

  // State
  const [conditions, setConditions] = useState<ConditionItem[]>([])
  const [booleanOp, setBooleanOp] = useState<'and' | 'or'>('and')
  const [sort, setSort] = useState<SortClause | undefined>()
  const [limit, setLimit] = useState<number>(20)
  const [previewExpanded, setPreviewExpanded] = useState(true)
  const [saveName, setSaveName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  // Parse initial query
  useEffect(() => {
    if (initialQuery) {
      const ast = typeof initialQuery === 'string' ? parseQuery(initialQuery) : initialQuery
      // Convert AST to conditions (simplified - would need full implementation)
      setSort(ast.sort)
      setLimit(ast.limit || 20)
    }
  }, [initialQuery])

  // Build query from conditions
  const buildQuery = useCallback((): RootQueryNode => {
    const children: QueryNode[] = []

    for (const cond of conditions) {
      let node: QueryNode | null = null

      switch (cond.type) {
        case 'text':
          if (cond.textValue) {
            node = { type: 'text', value: cond.textValue, exact: cond.exact }
          }
          break
        case 'tag':
          if (cond.tagName) {
            node = { type: 'tag', tagName: cond.tagName, exclude: cond.exclude }
          }
          break
        case 'field':
          if (cond.field && cond.value !== undefined) {
            node = {
              type: 'field',
              field: cond.field,
              operator: cond.operator || '=',
              value: cond.value,
            }
          }
          break
        case 'type':
          if (cond.targetType) {
            node = { type: 'type', targetType: cond.targetType as any }
          }
          break
        case 'date':
          if (cond.dateValue) {
            node = {
              type: 'date',
              field: cond.dateField || 'created',
              operator: cond.operator || '>=',
              value: cond.dateValue,
            }
          }
          break
        case 'supertag':
          if (cond.supertagName) {
            node = {
              type: 'supertag',
              tagName: cond.supertagName,
              fields: cond.supertagFields?.filter(f => f.name && f.value),
            }
          }
          break
      }

      if (node) {
        children.push(node)
      }
    }

    // Combine with boolean operator
    let combined: QueryNode | null = null
    if (children.length === 1) {
      combined = children[0]
    } else if (children.length > 1) {
      combined = children.reduce((acc, node) => {
        if (!acc) return node
        return booleanOp === 'and'
          ? { type: 'and', left: acc, right: node }
          : { type: 'or', left: acc, right: node }
      }, null as QueryNode | null)
    }

    return {
      type: 'root',
      children: combined ? [combined] : [],
      sort,
      limit,
    }
  }, [conditions, booleanOp, sort, limit])

  // Get query string
  const queryString = useMemo(() => {
    const query = buildQuery()
    return serializeQuery(query)
  }, [buildQuery])

  // Validate query
  const validation = useMemo(() => {
    return validateQuery(queryString)
  }, [queryString])

  // Notify on change
  useEffect(() => {
    onQueryChange?.(buildQuery(), queryString)
  }, [buildQuery, queryString, onQueryChange])

  // Add condition
  const addCondition = useCallback((type: ConditionItem['type']) => {
    const newCondition: ConditionItem = {
      id: crypto.randomUUID(),
      type,
    }
    setConditions(prev => [...prev, newCondition])
  }, [])

  // Update condition
  const updateCondition = useCallback((id: string, updates: ConditionItem) => {
    setConditions(prev => prev.map(c => c.id === id ? updates : c))
  }, [])

  // Remove condition
  const removeCondition = useCallback((id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id))
  }, [])

  // Reset all
  const reset = useCallback(() => {
    setConditions([])
    setSort(undefined)
    setLimit(20)
    setBooleanOp('and')
  }, [])

  // Execute query with loading state
  const handleExecute = useCallback(async () => {
    setIsExecuting(true)
    try {
      await onExecute?.(buildQuery())
    } finally {
      // Brief delay so user sees the loading state
      setTimeout(() => setIsExecuting(false), 300)
    }
  }, [buildQuery, onExecute])

  // Save query
  const handleSave = useCallback(() => {
    if (saveName.trim()) {
      onSave?.(buildQuery(), saveName.trim())
      setSaveName('')
      setShowSaveDialog(false)
    }
  }, [buildQuery, saveName, onSave])

  return (
    <div className={cn(
      'flex flex-col h-full min-h-0',
      isDark ? 'bg-zinc-900' : 'bg-white',
      className
    )}>
      {/* Header - Compact */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 border-b shrink-0',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <Search className="w-3.5 h-3.5 text-zinc-500" />
        <h2 className={cn(
          'text-xs font-semibold flex-1 uppercase tracking-wider',
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        )}>
          Query Builder
        </h2>
        <div className="flex items-center gap-0.5">
          <Tooltip content={QUERY_BUILDER_HELP.overview} placement="bottom">
            <button
              className={cn(
                'p-1 rounded transition-colors',
                isDark
                  ? 'text-zinc-600 hover:text-zinc-400'
                  : 'text-zinc-400 hover:text-zinc-600'
              )}
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <button
            onClick={reset}
            className={cn(
              'p-1 rounded transition-colors',
              isDark
                ? 'text-zinc-600 hover:text-zinc-400'
                : 'text-zinc-400 hover:text-zinc-600'
            )}
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {validation.valid ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 ml-1" />
          ) : (
            <Tooltip content={validation.error || 'Query has errors'} placement="bottom">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 ml-1" />
            </Tooltip>
          )}
        </div>
      </div>

      {/* Boolean operator toggle - inline with conditions */}
      {conditions.length > 1 && (
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1 border-b',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          <span className="text-[10px] text-zinc-500">Combine:</span>
          <div className={cn(
            'flex rounded overflow-hidden text-[10px]',
            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
          )}>
            <button
              onClick={() => setBooleanOp('and')}
              className={cn(
                'px-2 py-0.5 font-medium transition-colors',
                booleanOp === 'and'
                  ? 'bg-blue-500 text-white'
                  : (isDark ? 'text-zinc-500' : 'text-zinc-400')
              )}
            >
              AND
            </button>
            <button
              onClick={() => setBooleanOp('or')}
              className={cn(
                'px-2 py-0.5 font-medium transition-colors',
                booleanOp === 'or'
                  ? 'bg-blue-500 text-white'
                  : (isDark ? 'text-zinc-500' : 'text-zinc-400')
              )}
            >
              OR
            </button>
          </div>
        </div>
      )}

      {/* Conditions */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
        <AnimatePresence mode="popLayout">
          {conditions.map(cond => (
            <ConditionEditor
              key={cond.id}
              condition={cond}
              onChange={updates => updateCondition(cond.id, updates)}
              onRemove={() => removeCondition(cond.id)}
              theme={theme}
              compact={compact}
            />
          ))}
        </AnimatePresence>

        {conditions.length === 0 && (
          <div className={cn(
            'text-center py-4',
            isDark ? 'text-zinc-600' : 'text-zinc-400'
          )}>
            <p className="text-[10px]">Add conditions below</p>
          </div>
        )}

        <AddConditionMenu onAdd={addCondition} theme={theme} />
      </div>

      {/* Sort & Limit - Compact inline */}
      <div className={cn(
        'flex items-center gap-2 px-2 py-1.5 border-t',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <ArrowUpDown className="w-3 h-3 text-zinc-500" />
        <select
          value={sort?.field || ''}
          onChange={e => setSort(e.target.value ? { field: e.target.value, direction: sort?.direction || 'desc' } : undefined)}
          className={cn(
            'flex-1 px-1.5 py-0.5 rounded text-[10px] outline-none',
            isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
          )}
        >
          <option value="">Sort: default</option>
          {SORT_FIELDS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {sort && (
          <select
            value={sort.direction}
            onChange={e => setSort({ ...sort, direction: e.target.value as SortDirection })}
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] outline-none',
              isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
            )}
          >
            <option value="desc">↓</option>
            <option value="asc">↑</option>
          </select>
        )}
        <span className="text-[10px] text-zinc-500">Limit:</span>
        <input
          type="number"
          value={limit}
          onChange={e => setLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))}
          className={cn(
            'w-10 px-1 py-0.5 rounded text-[10px] outline-none text-center',
            isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
          )}
        />
      </div>

      {/* Query Preview - Minimal collapsible */}
      {showPreview && queryString && (
        <div className={cn(
          'border-t',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          <button
            onClick={() => setPreviewExpanded(!previewExpanded)}
            className={cn(
              'w-full flex items-center gap-1.5 px-2 py-1 text-left',
              isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
            )}
          >
            {previewExpanded ? (
              <ChevronDown className="w-3 h-3 text-zinc-600" />
            ) : (
              <ChevronRight className="w-3 h-3 text-zinc-600" />
            )}
            <Code className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] text-zinc-500">Preview</span>
          </button>

          <AnimatePresence>
            {previewExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-2 pb-2">
                  <div className={cn(
                    'flex items-start gap-1 p-1.5 rounded font-mono text-[9px] break-all',
                    isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-zinc-50 text-zinc-500'
                  )}>
                    <span className="flex-1">{queryString}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(queryString)}
                      className={cn(
                        'p-0.5 rounded shrink-0',
                        isDark ? 'hover:bg-zinc-700 text-zinc-500' : 'hover:bg-zinc-200 text-zinc-400'
                      )}
                      title="Copy"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions - Compact */}
      <div className={cn(
        'flex items-center gap-1.5 px-2 py-1.5 border-t',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        {showExecute && (
          <button
            onClick={handleExecute}
            disabled={!validation.valid || conditions.length === 0 || isExecuting}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
              validation.valid && conditions.length > 0 && !isExecuting
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : isDark
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
            )}
          >
            {isExecuting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {isExecuting ? 'Running...' : 'Run'}
          </button>
        )}

        {onSave && (
          <>
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={conditions.length === 0}
              className={cn(
                'p-2 rounded-lg transition-colors',
                conditions.length > 0
                  ? (isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500')
                  : 'text-zinc-600 cursor-not-allowed'
              )}
              title="Save Query"
            >
              <Save className="w-4 h-4" />
            </button>

            {/* Save Dialog */}
            <AnimatePresence>
              {showSaveDialog && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                  onClick={() => setShowSaveDialog(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.95 }}
                    onClick={e => e.stopPropagation()}
                    className={cn(
                      'w-80 rounded-lg p-4 shadow-xl',
                      isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'
                    )}
                  >
                    <h3 className={cn(
                      'text-sm font-semibold mb-3',
                      isDark ? 'text-zinc-200' : 'text-zinc-800'
                    )}>
                      Save Query
                    </h3>
                    <input
                      type="text"
                      value={saveName}
                      onChange={e => setSaveName(e.target.value)}
                      placeholder="Query name..."
                      autoFocus
                      className={cn(
                        'w-full px-3 py-2 rounded-lg text-sm outline-none',
                        isDark
                          ? 'bg-zinc-800 text-zinc-200 placeholder:text-zinc-500'
                          : 'bg-zinc-100 text-zinc-800 placeholder:text-zinc-400'
                      )}
                    />
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => setShowSaveDialog(false)}
                        className={cn(
                          'px-3 py-1.5 rounded text-sm',
                          isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'
                        )}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={!saveName.trim()}
                        className={cn(
                          'px-3 py-1.5 rounded text-sm font-medium',
                          saveName.trim()
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        )}
                      >
                        Save
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}

export default QueryBuilder
