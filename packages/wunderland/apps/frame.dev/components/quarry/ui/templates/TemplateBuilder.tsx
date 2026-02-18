/**
 * Template Builder Component
 * @module codex/ui/TemplateBuilder
 *
 * @description
 * Multi-step wizard for creating and editing templates.
 * Steps:
 * 1. Basic Info - name, category, description, icon
 * 2. Fields - define form fields
 * 3. Template - write markdown with placeholders
 * 4. Preview - test with sample data
 * 5. Export/Publish - download or push to GitHub
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  Settings,
  Code,
  Eye,
  Upload,
  Save,
  Download,
  AlertCircle,
  Loader2,
  Info,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TemplateDraft, TemplateValidation } from '@/lib/templates/types'
import type { TemplateCategory, TemplateDifficulty } from '@/components/quarry/templates/types'
import {
  saveDraft,
  getDefaultDraft,
  validateTemplate,
  exportTemplateJSON,
  generateTemplateJSON,
} from '@/lib/templates/templatePublisher'
import TemplateFieldEditor from './TemplateFieldEditor'
import DynamicIcon from '../common/DynamicIcon'
import { useDebouncedValue } from '@/lib/hooks/useDebounce'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface TemplateBuilderProps {
  /** Initial draft to edit */
  initialDraft?: TemplateDraft
  /** Callback when template is saved */
  onSave?: (draft: TemplateDraft) => void
  /** Callback when closed */
  onClose?: () => void
  /** Callback to open publish modal */
  onPublish?: (draft: TemplateDraft) => void
  /** Theme */
  isDark?: boolean
}

type BuilderStep = 'basics' | 'fields' | 'template' | 'preview' | 'export'

interface StepConfig {
  id: BuilderStep
  title: string
  icon: React.ReactNode
  description: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const STEPS: StepConfig[] = [
  { id: 'basics', title: 'Basic Info', icon: <FileText className="w-4 h-4" />, description: 'Name, category, and description' },
  { id: 'fields', title: 'Fields', icon: <Settings className="w-4 h-4" />, description: 'Define form fields' },
  { id: 'template', title: 'Template', icon: <Code className="w-4 h-4" />, description: 'Write markdown template' },
  { id: 'preview', title: 'Preview', icon: <Eye className="w-4 h-4" />, description: 'Test with sample data' },
  { id: 'export', title: 'Export', icon: <Upload className="w-4 h-4" />, description: 'Download or publish' },
]

const CATEGORIES: { id: TemplateCategory; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: 'FileText' },
  { id: 'technical', label: 'Technical', icon: 'Code' },
  { id: 'creative', label: 'Creative', icon: 'Palette' },
  { id: 'personal', label: 'Personal', icon: 'User' },
  { id: 'business', label: 'Business', icon: 'Briefcase' },
  { id: 'learning', label: 'Learning', icon: 'GraduationCap' },
  { id: 'lifestyle', label: 'Lifestyle', icon: 'Heart' },
  { id: 'research', label: 'Research', icon: 'Search' },
]

const DIFFICULTIES: { id: TemplateDifficulty; label: string; color: string }[] = [
  { id: 'beginner', label: 'Beginner', color: 'text-green-500' },
  { id: 'intermediate', label: 'Intermediate', color: 'text-amber-500' },
  { id: 'advanced', label: 'Advanced', color: 'text-red-500' },
]

const POPULAR_ICONS = [
  'FileText', 'Code', 'BookOpen', 'Lightbulb', 'Rocket', 'Star',
  'Heart', 'Zap', 'Target', 'Compass', 'Map', 'Flag',
  'Award', 'Trophy', 'Gift', 'Package', 'Box', 'Layers',
  'Grid', 'Layout', 'Columns', 'List', 'CheckSquare', 'Clipboard',
]

/* ═══════════════════════════════════════════════════════════════════════════
   STEP COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Step 1: Basic Info
 */
function BasicInfoStep({
  draft,
  onChange,
  isDark,
}: {
  draft: TemplateDraft
  onChange: (draft: TemplateDraft) => void
  isDark: boolean
}) {
  const [tagInput, setTagInput] = useState('')

  const addTag = () => {
    if (tagInput.trim() && !draft.tags.includes(tagInput.trim())) {
      onChange({ ...draft, tags: [...draft.tags, tagInput.trim()] })
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    onChange({ ...draft, tags: draft.tags.filter((t) => t !== tag) })
  }

  return (
    <div className="space-y-6">
      {/* Name */}
      <div>
        <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
          Template Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="My Awesome Template"
          className={cn(
            'w-full px-4 py-3 rounded-lg text-base',
            isDark
              ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500 border border-slate-600 focus:border-cyan-500'
              : 'bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 focus:border-cyan-500',
            'focus:outline-none focus:ring-2 focus:ring-cyan-500/20'
          )}
        />
      </div>

      {/* Category */}
      <div>
        <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
          Category <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange({ ...draft, category: cat.id })}
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg transition-colors text-sm',
                draft.category === cat.id
                  ? isDark
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 border'
                    : 'bg-cyan-50 border-cyan-500 text-cyan-600 border'
                  : isDark
                  ? 'bg-slate-700 border-slate-600 text-slate-300 border hover:bg-slate-600'
                  : 'bg-gray-100 border-gray-200 text-gray-700 border hover:bg-gray-200'
              )}
            >
              <DynamicIcon name={cat.icon} className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Icon */}
      <div>
        <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
          Icon
        </label>
        <div className="flex flex-wrap gap-2">
          {POPULAR_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => onChange({ ...draft, icon })}
              className={cn(
                'p-2 rounded-lg transition-colors',
                draft.icon === icon
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-cyan-50 text-cyan-600'
                  : isDark
                  ? 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              <DynamicIcon name={icon} className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>

      {/* Short Description */}
      <div>
        <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
          Short Description <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={draft.shortDescription}
          onChange={(e) => onChange({ ...draft, shortDescription: e.target.value })}
          placeholder="A brief description (shown in template list)"
          maxLength={200}
          className={cn(
            'w-full px-4 py-2 rounded-lg text-sm',
            isDark
              ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500 border border-slate-600'
              : 'bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500'
          )}
        />
        <div className={cn('text-xs mt-1', isDark ? 'text-slate-500' : 'text-gray-400')}>
          {draft.shortDescription.length}/200 characters
        </div>
      </div>

      {/* Full Description */}
      <div>
        <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
          Full Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          placeholder="Detailed description of what this template is for..."
          rows={4}
          className={cn(
            'w-full px-4 py-3 rounded-lg text-sm resize-none',
            isDark
              ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500 border border-slate-600'
              : 'bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500'
          )}
        />
      </div>

      {/* Difficulty & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
            Difficulty
          </label>
          <div className="flex gap-2">
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff.id}
                type="button"
                onClick={() => onChange({ ...draft, difficulty: diff.id })}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                  draft.difficulty === diff.id
                    ? isDark
                      ? 'bg-slate-700 border-2 border-current ' + diff.color
                      : 'bg-gray-100 border-2 border-current ' + diff.color
                    : isDark
                    ? 'bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700'
                    : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                )}
              >
                {diff.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
            Estimated Time
          </label>
          <input
            type="text"
            value={draft.estimatedTime}
            onChange={(e) => onChange({ ...draft, estimatedTime: e.target.value })}
            placeholder="e.g., 5 min, 1 hour"
            className={cn(
              'w-full px-4 py-2 rounded-lg text-sm',
              isDark
                ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500 border border-slate-600'
                : 'bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500'
            )}
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {draft.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded text-sm',
                isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-700'
              )}
            >
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add a tag..."
            className={cn(
              'flex-1 px-3 py-2 rounded-lg text-sm',
              isDark
                ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500'
                : 'bg-gray-100 text-gray-900 placeholder:text-gray-400'
            )}
          />
          <button
            type="button"
            onClick={addTag}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium',
              isDark
                ? 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            )}
          >
            Add
          </button>
        </div>
      </div>

      {/* Author & Featured */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
            Author
          </label>
          <input
            type="text"
            value={draft.author}
            onChange={(e) => onChange({ ...draft, author: e.target.value })}
            placeholder="Your name"
            className={cn(
              'w-full px-4 py-2 rounded-lg text-sm',
              isDark
                ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500 border border-slate-600'
                : 'bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500'
            )}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(e) => onChange({ ...draft, featured: e.target.checked })}
              className="rounded"
            />
            <span className={cn('text-sm', isDark ? 'text-slate-300' : 'text-gray-700')}>
              Featured template
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}

/**
 * Step 3: Template Editor with Live Preview
 */
function TemplateStep({
  draft,
  onChange,
  isDark,
}: {
  draft: TemplateDraft
  onChange: (draft: TemplateDraft) => void
  isDark: boolean
}) {
  const [showPreview, setShowPreview] = useState(true)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteFilter, setAutocompleteFilter] = useState('')
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const autocompleteRef = React.useRef<HTMLDivElement>(null)

  const placeholders = useMemo(() => {
    return draft.fields.map((f) => ({ name: f.name, label: f.label }))
  }, [draft.fields])

  // Get all valid placeholder names including built-in ones
  const validPlaceholderNames = useMemo(() => {
    return new Set([...draft.fields.map((f) => f.name), 'date', 'title', 'summary'])
  }, [draft.fields])

  // Find undefined placeholders in template
  const undefinedPlaceholders = useMemo(() => {
    const matches = draft.template.match(/\{([^}]+)\}/g) || []
    return matches
      .map((m) => m.slice(1, -1))
      .filter((name) => !validPlaceholderNames.has(name))
      .filter((v, i, a) => a.indexOf(v) === i) // unique
  }, [draft.template, validPlaceholderNames])

  // Autocomplete suggestions filtered by current input
  const autocompleteSuggestions = useMemo(() => {
    const builtIns = [
      { name: 'date', label: 'Current Date', builtin: true },
      { name: 'title', label: 'Document Title', builtin: true },
      { name: 'summary', label: 'Summary', builtin: true },
    ]
    const all = [...placeholders.map((p) => ({ ...p, builtin: false })), ...builtIns]
    if (!autocompleteFilter) return all
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(autocompleteFilter.toLowerCase()) ||
        p.label.toLowerCase().includes(autocompleteFilter.toLowerCase())
    )
  }, [placeholders, autocompleteFilter])

  // Handle textarea input for autocomplete trigger
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      const cursorPos = e.target.selectionStart || 0

      // Check if we're inside an unclosed brace
      const textBeforeCursor = value.slice(0, cursorPos)
      const lastOpenBrace = textBeforeCursor.lastIndexOf('{')
      const lastCloseBrace = textBeforeCursor.lastIndexOf('}')

      if (lastOpenBrace > lastCloseBrace && lastOpenBrace !== -1) {
        // We're inside an unclosed brace - show autocomplete
        const filterText = textBeforeCursor.slice(lastOpenBrace + 1)
        setAutocompleteFilter(filterText)
        setShowAutocomplete(true)
        setSelectedSuggestion(0)
      } else {
        setShowAutocomplete(false)
        setAutocompleteFilter('')
      }

      onChange({ ...draft, template: value })
    },
    [draft, onChange]
  )

  // Insert placeholder from autocomplete
  const insertFromAutocomplete = useCallback(
    (name: string) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const cursorPos = textarea.selectionStart || 0
      const textBeforeCursor = draft.template.slice(0, cursorPos)
      const lastOpenBrace = textBeforeCursor.lastIndexOf('{')

      if (lastOpenBrace !== -1) {
        const before = draft.template.slice(0, lastOpenBrace)
        const after = draft.template.slice(cursorPos)
        const newText = `${before}{${name}}${after}`

        onChange({ ...draft, template: newText })

        // Restore cursor position after the inserted placeholder
        const newCursorPos = lastOpenBrace + name.length + 2
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(newCursorPos, newCursorPos)
        }, 0)
      }

      setShowAutocomplete(false)
      setAutocompleteFilter('')
    },
    [draft, onChange]
  )

  // Handle keyboard navigation in autocomplete
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showAutocomplete || autocompleteSuggestions.length === 0) return

      if (e.key === 'Escape') {
        setShowAutocomplete(false)
        setAutocompleteFilter('')
        e.preventDefault()
      } else if (e.key === 'ArrowDown') {
        setSelectedSuggestion((prev) => Math.min(prev + 1, autocompleteSuggestions.length - 1))
        e.preventDefault()
      } else if (e.key === 'ArrowUp') {
        setSelectedSuggestion((prev) => Math.max(prev - 1, 0))
        e.preventDefault()
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        insertFromAutocomplete(autocompleteSuggestions[selectedSuggestion].name)
        e.preventDefault()
      }
    },
    [showAutocomplete, autocompleteSuggestions, selectedSuggestion, insertFromAutocomplete]
  )

  // Generate sample data for preview
  const sampleData = useMemo(() => {
    const data: Record<string, string> = {
      date: new Date().toISOString().split('T')[0],
    }
    for (const field of draft.fields) {
      data[field.name] = field.placeholder || `Sample ${field.label}`
    }
    return data
  }, [draft.fields])

  // Debounce template for preview
  const debouncedTemplate = useDebouncedValue(draft.template, 300)

  // Interpolate placeholders for preview
  const previewContent = useMemo(() => {
    let result = debouncedTemplate
    for (const [key, value] of Object.entries(sampleData)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }
    return result
  }, [debouncedTemplate, sampleData])

  // Insert placeholder at cursor position
  const insertPlaceholder = useCallback((name: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      onChange({ ...draft, template: draft.template + `{${name}}` })
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = draft.template
    const placeholder = `{${name}}`
    const newText = text.substring(0, start) + placeholder + text.substring(end)

    onChange({ ...draft, template: newText })

    // Restore cursor position after the inserted placeholder
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length)
    }, 0)
  }, [draft, onChange])

  return (
    <div className="space-y-4">
      {/* Placeholder Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <div className={cn('text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
            Insert Placeholder
          </div>
          <div className="flex flex-wrap gap-2">
            {placeholders.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => insertPlaceholder(p.name)}
                className={cn(
                  'px-2 py-1 rounded text-xs font-mono transition-colors',
                  isDark
                    ? 'bg-slate-700 text-cyan-400 hover:bg-slate-600'
                    : 'bg-gray-100 text-cyan-600 hover:bg-gray-200'
                )}
              >
                {'{' + p.name + '}'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => insertPlaceholder('date')}
              className={cn(
                'px-2 py-1 rounded text-xs font-mono transition-colors',
                isDark
                  ? 'bg-slate-700 text-amber-400 hover:bg-slate-600'
                  : 'bg-gray-100 text-amber-600 hover:bg-gray-200'
              )}
            >
              {'{date}'}
            </button>
          </div>
        </div>

        {/* Preview Toggle */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            showPreview
              ? isDark
                ? 'bg-cyan-900/30 text-cyan-400'
                : 'bg-cyan-50 text-cyan-600'
              : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          )}
        >
          <Eye className="w-4 h-4" />
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>

      {/* Split View: Editor + Preview */}
      <div className={cn(
        'flex gap-4',
        showPreview ? 'flex-row' : 'flex-col'
      )}>
        {/* Template Editor */}
        <div className={showPreview ? 'flex-1' : 'w-full'}>
          <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
            Template Content <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={draft.template}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={`---
title: "{title}"
created: "{date}"
---

# {title}

Start writing here...`}
              rows={20}
              className={cn(
                'w-full px-4 py-3 rounded-lg text-sm font-mono resize-none',
                isDark
                  ? 'bg-slate-800 text-slate-200 placeholder:text-slate-600 border border-slate-700'
                  : 'bg-gray-50 text-gray-900 placeholder:text-gray-400 border border-gray-200',
                'focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500'
              )}
            />

            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {showAutocomplete && autocompleteSuggestions.length > 0 && (
                <motion.div
                  ref={autocompleteRef}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={cn(
                    'absolute z-50 left-4 mt-1 w-64 rounded-lg shadow-xl overflow-hidden',
                    isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
                  )}
                  style={{ top: '50%' }}
                >
                  <div className={cn('px-3 py-2 text-xs font-medium border-b', isDark ? 'border-slate-700 text-slate-400' : 'border-gray-200 text-gray-500')}>
                    Insert Placeholder
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {autocompleteSuggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.name}
                        type="button"
                        onClick={() => insertFromAutocomplete(suggestion.name)}
                        className={cn(
                          'w-full px-3 py-2 text-left flex items-center gap-2 transition-colors',
                          index === selectedSuggestion
                            ? isDark
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-cyan-50 text-cyan-600'
                            : isDark
                            ? 'hover:bg-slate-700 text-slate-300'
                            : 'hover:bg-gray-50 text-gray-700'
                        )}
                      >
                        <code className={cn('text-xs font-mono px-1 py-0.5 rounded', isDark ? 'bg-slate-700' : 'bg-gray-100')}>
                          {'{' + suggestion.name + '}'}
                        </code>
                        <span className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-500')}>
                          {suggestion.label}
                          {(suggestion as any).builtin && <span className="ml-1 text-amber-500">(built-in)</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className={cn('px-3 py-1.5 text-xs border-t', isDark ? 'border-slate-700 text-slate-500' : 'border-gray-200 text-gray-400')}>
                    Tab or Enter to insert • Esc to close
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Undefined Placeholders Warning */}
          {undefinedPlaceholders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={cn(
                'mt-2 p-3 rounded-lg flex items-start gap-2 text-sm',
                isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'
              )}
            >
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className={cn('font-medium', isDark ? 'text-amber-400' : 'text-amber-700')}>
                  Undefined placeholders:
                </span>
                <span className={cn('ml-1', isDark ? 'text-amber-300' : 'text-amber-600')}>
                  {undefinedPlaceholders.map((p) => `{${p}}`).join(', ')}
                </span>
                <p className={cn('mt-1 text-xs', isDark ? 'text-amber-400/70' : 'text-amber-600/70')}>
                  These placeholders don&apos;t match any defined fields and won&apos;t be replaced.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Live Preview */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <div className={cn('text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
                Live Preview (with sample data)
              </div>
              <div
                className={cn(
                  'h-[480px] overflow-auto rounded-lg border p-4 font-mono text-sm whitespace-pre-wrap',
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-300'
                    : 'bg-white border-gray-200 text-gray-800'
                )}
              >
                {previewContent || (
                  <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>
                    Preview will appear here...
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hints */}
      <div className={cn('flex items-start gap-2 p-3 rounded-lg text-sm', isDark ? 'bg-slate-800/50' : 'bg-gray-50')}>
        <Info className={cn('w-4 h-4 mt-0.5', isDark ? 'text-slate-400' : 'text-gray-500')} />
        <div className={cn(isDark ? 'text-slate-400' : 'text-gray-600')}>
          <p>Use <code className="px-1 py-0.5 rounded bg-slate-700 text-cyan-400">{'{fieldName}'}</code> to insert field values.</p>
          <p className="mt-1">The frontmatter section (between <code>---</code>) will be parsed as YAML metadata.</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Step 4: Preview with Real-time Validation
 */
function PreviewStep({
  draft,
  isDark,
}: {
  draft: TemplateDraft
  isDark: boolean
}) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Map<string, string>>(new Map())
  const [shakeFields, setShakeFields] = useState<Set<string>>(new Set())

  // Initialize form data with defaults
  useEffect(() => {
    const defaults: Record<string, string> = {}
    for (const field of draft.fields) {
      defaults[field.name] = String(field.defaultValue || '')
    }
    defaults.date = new Date().toISOString().split('T')[0]
    setFormData(defaults)
  }, [draft.fields])

  // Validate a single field
  const validateField = useCallback((fieldName: string, value: string) => {
    const field = draft.fields.find(f => f.name === fieldName)
    if (!field) return

    const newErrors = new Map(errors)

    // Check required
    if (field.required && !value.trim()) {
      newErrors.set(fieldName, `${field.label} is required`)
    }
    // Check validation rules
    else if (field.validation) {
      const v = field.validation
      if (v.minLength && value.length < v.minLength) {
        newErrors.set(fieldName, v.message || `Must be at least ${v.minLength} characters`)
      } else if (v.maxLength && value.length > v.maxLength) {
        newErrors.set(fieldName, v.message || `Must be at most ${v.maxLength} characters`)
      } else if (v.pattern) {
        try {
          const regex = new RegExp(v.pattern)
          if (!regex.test(value)) {
            newErrors.set(fieldName, v.patternDescription || v.message || 'Invalid format')
          } else {
            newErrors.delete(fieldName)
          }
        } catch {
          newErrors.delete(fieldName)
        }
      } else {
        newErrors.delete(fieldName)
      }
    } else {
      newErrors.delete(fieldName)
    }

    setErrors(newErrors)
  }, [draft.fields, errors])

  // Handle field change
  const handleFieldChange = useCallback((fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
    // Validate if field has been touched
    if (touched.has(fieldName)) {
      validateField(fieldName, value)
    }
  }, [touched, validateField])

  // Handle field blur (mark as touched and validate)
  const handleFieldBlur = useCallback((fieldName: string) => {
    setTouched(prev => {
      const next = new Set(prev)
      next.add(fieldName)
      return next
    })
    validateField(fieldName, formData[fieldName] || '')
  }, [formData, validateField])

  // Trigger shake animation on error
  const triggerShake = useCallback((fieldName: string) => {
    setShakeFields(prev => {
      const next = new Set(prev)
      next.add(fieldName)
      return next
    })
    setTimeout(() => {
      setShakeFields(prev => {
        const next = new Set(prev)
        next.delete(fieldName)
        return next
      })
    }, 500)
  }, [])

  // Check if field is valid (touched and no errors)
  const isFieldValid = useCallback((fieldName: string) => {
    return touched.has(fieldName) && !errors.has(fieldName) && !!formData[fieldName]?.trim()
  }, [touched, errors, formData])

  // Generate preview
  const preview = useMemo(() => {
    let result = draft.template
    for (const [key, value] of Object.entries(formData)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `{${key}}`)
    }
    return result
  }, [draft.template, formData])

  // Field wrapper classes with shake animation
  const getFieldWrapperClasses = (fieldName: string) => cn(
    'transition-all duration-200',
    shakeFields.has(fieldName) && 'animate-shake'
  )

  // Input classes based on validation state
  const getInputClasses = (fieldName: string) => {
    const hasError = touched.has(fieldName) && errors.has(fieldName)
    const isValid = isFieldValid(fieldName)

    return cn(
      'w-full px-3 py-2 rounded-lg text-sm transition-colors',
      isDark
        ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500'
        : 'bg-gray-100 text-gray-900 placeholder:text-gray-400',
      hasError && (isDark
        ? 'ring-2 ring-red-500/50 border-red-500'
        : 'ring-2 ring-red-500/50 border-red-500'),
      isValid && (isDark
        ? 'ring-2 ring-green-500/30 border-green-500'
        : 'ring-2 ring-green-500/30 border-green-500')
    )
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-4">
        <h4 className={cn('font-medium', isDark ? 'text-slate-200' : 'text-gray-900')}>
          Test Form
        </h4>
        {draft.fields.map((field) => (
          <div key={field.name} className={getFieldWrapperClasses(field.name)}>
            <label className={cn('flex items-center gap-2 text-sm font-medium mb-1', isDark ? 'text-slate-400' : 'text-gray-600')}>
              <span>
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </span>
              {/* Valid checkmark */}
              {isFieldValid(field.name) && (
                <Check className="w-3.5 h-3.5 text-green-500" />
              )}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={formData[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                onBlur={() => handleFieldBlur(field.name)}
                placeholder={field.placeholder}
                rows={3}
                className={cn(getInputClasses(field.name), 'resize-none')}
              />
            ) : field.type === 'select' ? (
              <select
                value={formData[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                onBlur={() => handleFieldBlur(field.name)}
                className={getInputClasses(field.name)}
              >
                <option value="">Select...</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={formData[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                onBlur={() => handleFieldBlur(field.name)}
                placeholder={field.placeholder}
                className={getInputClasses(field.name)}
              />
            )}
            {/* Error message */}
            <AnimatePresence>
              {touched.has(field.name) && errors.has(field.name) && (
                <motion.p
                  initial={{ opacity: 0, y: -5, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -5, height: 0 }}
                  className="flex items-center gap-1 mt-1 text-xs text-red-500"
                >
                  <AlertCircle className="w-3 h-3" />
                  {errors.get(field.name)}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        ))}

        {/* Validation summary */}
        {errors.size > 0 && touched.size > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              'p-3 rounded-lg text-sm',
              isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'
            )}
          >
            <p className="text-red-500 font-medium">Please fix {errors.size} error{errors.size !== 1 ? 's' : ''} above</p>
          </motion.div>
        )}
      </div>

      {/* Preview */}
      <div className="space-y-4">
        <h4 className={cn('font-medium', isDark ? 'text-slate-200' : 'text-gray-900')}>
          Generated Output
        </h4>
        <pre
          className={cn(
            'p-4 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-auto max-h-[500px]',
            isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-50 text-gray-700'
          )}
        >
          {preview}
        </pre>
      </div>
    </div>
  )
}

/**
 * Step 5: Export
 */
function ExportStep({
  draft,
  validation,
  onExport,
  onPublish,
  isDark,
}: {
  draft: TemplateDraft
  validation: TemplateValidation
  onExport: () => void
  onPublish?: () => void
  isDark: boolean
}) {
  const jsonPreview = useMemo(() => {
    try {
      return generateTemplateJSON(draft)
    } catch {
      return 'Error generating JSON'
    }
  }, [draft])

  return (
    <div className="space-y-6">
      {/* Validation Status */}
      <div
        className={cn(
          'p-4 rounded-lg',
          validation.valid
            ? isDark
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-green-50 border border-green-200'
            : isDark
            ? 'bg-red-500/10 border border-red-500/30'
            : 'bg-red-50 border border-red-200'
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          {validation.valid ? (
            <Check className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <span
            className={cn(
              'font-medium',
              validation.valid ? 'text-green-500' : 'text-red-500'
            )}
          >
            {validation.valid ? 'Template is valid' : 'Template has errors'}
          </span>
        </div>
        {!validation.valid && (
          <ul className="text-sm text-red-500 space-y-1 ml-7">
            {validation.errors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        )}
        {validation.warnings.length > 0 && (
          <ul className={cn('text-sm space-y-1 ml-7 mt-2', isDark ? 'text-amber-400' : 'text-amber-600')}>
            {validation.warnings.map((warn, i) => (
              <li key={i}>⚠ {warn.message}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onExport}
          disabled={!validation.valid}
          className={cn(
            'flex items-center justify-center gap-2 p-4 rounded-lg font-medium transition-colors',
            validation.valid
              ? isDark
                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500'
          )}
        >
          <Download className="w-5 h-5" />
          Download JSON
        </button>

        {onPublish && (
          <button
            type="button"
            onClick={onPublish}
            disabled={!validation.valid}
            className={cn(
              'flex items-center justify-center gap-2 p-4 rounded-lg font-medium transition-colors',
              validation.valid
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                  : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
                : 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500'
            )}
          >
            <Upload className="w-5 h-5" />
            Publish to GitHub
          </button>
        )}
      </div>

      {/* JSON Preview */}
      <div>
        <h4 className={cn('font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
          Template JSON
        </h4>
        <pre
          className={cn(
            'p-4 rounded-lg text-xs font-mono overflow-auto max-h-[300px]',
            isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-600'
          )}
        >
          {jsonPreview}
        </pre>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function TemplateBuilder({
  initialDraft,
  onSave,
  onClose,
  onPublish,
  isDark = true,
}: TemplateBuilderProps) {
  const [step, setStep] = useState<BuilderStep>('basics')
  const [draft, setDraft] = useState<TemplateDraft>(initialDraft || getDefaultDraft())
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Get current step index
  const currentStepIndex = STEPS.findIndex((s) => s.id === step)

  // Validate template
  const validation = useMemo(() => validateTemplate(draft), [draft])

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (draft.name) {
        const saved = saveDraft(draft)
        setDraft(saved)
        setLastSaved(new Date())
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [draft])

  // Navigate to next/previous step
  const goToStep = useCallback((direction: 'next' | 'prev') => {
    const newIndex = direction === 'next' ? currentStepIndex + 1 : currentStepIndex - 1
    if (newIndex >= 0 && newIndex < STEPS.length) {
      setStep(STEPS[newIndex].id)
    }
  }, [currentStepIndex])

  // Save draft
  const handleSave = useCallback(() => {
    setIsSaving(true)
    const saved = saveDraft(draft)
    setDraft(saved)
    setLastSaved(new Date())
    onSave?.(saved)
    setIsSaving(false)
  }, [draft, onSave])

  // Export JSON
  const handleExport = useCallback(() => {
    exportTemplateJSON(draft)
  }, [draft])

  // Publish
  const handlePublish = useCallback(() => {
    onPublish?.(draft)
  }, [draft, onPublish])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          'relative w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col',
          isDark ? 'bg-slate-900' : 'bg-white'
        )}
      >
        {/* Header */}
        <div className={cn('flex items-center justify-between p-4 border-b', isDark ? 'border-slate-700' : 'border-gray-200')}>
          <div className="flex items-center gap-3">
            <Sparkles className={cn('w-5 h-5', isDark ? 'text-cyan-400' : 'text-cyan-500')} />
            <h2 className={cn('font-semibold text-lg', isDark ? 'text-slate-200' : 'text-gray-900')}>
              {initialDraft ? 'Edit Template' : 'Create Template'}
            </h2>
            {lastSaved && (
              <span className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isDark
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </button>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className={cn('flex items-center p-4 border-b', isDark ? 'border-slate-700/50' : 'border-gray-100')}>
          {STEPS.map((s, index) => (
            <React.Fragment key={s.id}>
              <button
                type="button"
                onClick={() => setStep(s.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  step === s.id
                    ? isDark
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-cyan-50 text-cyan-600'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-300'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <span
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                    step === s.id
                      ? 'bg-cyan-500 text-white'
                      : index < currentStepIndex
                      ? isDark
                        ? 'bg-slate-600 text-slate-300'
                        : 'bg-gray-300 text-gray-600'
                      : isDark
                      ? 'bg-slate-700 text-slate-500'
                      : 'bg-gray-200 text-gray-400'
                  )}
                >
                  {index < currentStepIndex ? <Check className="w-3 h-3" /> : index + 1}
                </span>
                <span className="hidden sm:inline">{s.title}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-px mx-2',
                    index < currentStepIndex
                      ? 'bg-cyan-500'
                      : isDark
                      ? 'bg-slate-700'
                      : 'bg-gray-200'
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 'basics' && <BasicInfoStep draft={draft} onChange={setDraft} isDark={isDark} />}
              {step === 'fields' && <TemplateFieldEditor fields={draft.fields} onChange={(fields) => setDraft({ ...draft, fields })} isDark={isDark} />}
              {step === 'template' && <TemplateStep draft={draft} onChange={setDraft} isDark={isDark} />}
              {step === 'preview' && <PreviewStep draft={draft} isDark={isDark} />}
              {step === 'export' && <ExportStep draft={draft} validation={validation} onExport={handleExport} onPublish={onPublish ? handlePublish : undefined} isDark={isDark} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={cn('flex items-center justify-between p-4 border-t', isDark ? 'border-slate-700' : 'border-gray-200')}>
          <button
            type="button"
            onClick={() => goToStep('prev')}
            disabled={currentStepIndex === 0}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              currentStepIndex === 0
                ? 'opacity-50 cursor-not-allowed'
                : isDark
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className={cn('text-sm', isDark ? 'text-slate-500' : 'text-gray-400')}>
            Step {currentStepIndex + 1} of {STEPS.length}
          </div>

          <button
            type="button"
            onClick={() => goToStep('next')}
            disabled={currentStepIndex === STEPS.length - 1}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              currentStepIndex === STEPS.length - 1
                ? 'opacity-50 cursor-not-allowed'
                : isDark
                ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
            )}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
