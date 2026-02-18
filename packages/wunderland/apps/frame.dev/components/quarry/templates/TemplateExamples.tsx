/**
 * Template Examples Gallery
 * @module codex/templates/TemplateExamples
 *
 * @remarks
 * Curated showcase of example templates organized by category.
 * Features:
 * - Category filtering
 * - Code view to see JSON structure
 * - Quick "Use this template" action
 * - Difficulty indicators
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Code2, Eye, Copy, Check, ChevronDown,
  FileText, Briefcase, Palette, Code, User,
  GraduationCap, Heart, Search, Sparkles, Rocket
} from 'lucide-react'
import DynamicIcon from '../ui/common/DynamicIcon'
import type { TemplateCategory, TemplateDifficulty } from './types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface ExampleTemplate {
  id: string
  name: string
  category: TemplateCategory
  difficulty: TemplateDifficulty
  description: string
  icon: string
  tags: string[]
  jsonPreview: string
}

interface TemplateExamplesProps {
  /** Callback when user wants to use a template */
  onUseTemplate?: (example: ExampleTemplate) => void
  /** Filter to specific category */
  filterCategory?: TemplateCategory
  /** Compact mode */
  compact?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXAMPLE TEMPLATES DATA
═══════════════════════════════════════════════════════════════════════════ */

const EXAMPLE_TEMPLATES: ExampleTemplate[] = [
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    category: 'business',
    difficulty: 'beginner',
    description: 'Structured notes for meetings with attendees, agenda, and action items.',
    icon: 'Users',
    tags: ['meeting', 'notes', 'business'],
    jsonPreview: `{
  "name": "Meeting Notes",
  "category": "business",
  "fields": [
    { "name": "title", "type": "text", "label": "Meeting Title", "required": true },
    { "name": "date", "type": "date", "label": "Date", "required": true },
    { "name": "attendees", "type": "tags", "label": "Attendees" },
    { "name": "agenda", "type": "textarea", "label": "Agenda" },
    { "name": "notes", "type": "textarea", "label": "Discussion Notes" },
    { "name": "actionItems", "type": "textarea", "label": "Action Items" }
  ],
  "template": "---\\ntitle: \\"{title}\\"\\ndate: {date}\\nattendees: [{attendees}]\\n---\\n\\n# {title}\\n\\n## Agenda\\n{agenda}\\n\\n## Notes\\n{notes}\\n\\n## Action Items\\n{actionItems}"
}`,
  },
  {
    id: 'project-brief',
    name: 'Project Brief',
    category: 'business',
    difficulty: 'intermediate',
    description: 'Comprehensive project overview with goals, timeline, and stakeholders.',
    icon: 'Briefcase',
    tags: ['project', 'planning', 'management'],
    jsonPreview: `{
  "name": "Project Brief",
  "category": "business",
  "fields": [
    { "name": "projectName", "type": "text", "label": "Project Name", "required": true },
    { "name": "objective", "type": "textarea", "label": "Objective" },
    { "name": "scope", "type": "textarea", "label": "Scope" },
    { "name": "stakeholders", "type": "tags", "label": "Stakeholders" },
    { "name": "startDate", "type": "date", "label": "Start Date" },
    { "name": "endDate", "type": "date", "label": "End Date" },
    { "name": "budget", "type": "number", "label": "Budget" }
  ]
}`,
  },
  {
    id: 'code-review',
    name: 'Code Review',
    category: 'technical',
    difficulty: 'intermediate',
    description: 'Structured code review with issues, suggestions, and approval status.',
    icon: 'GitPullRequest',
    tags: ['code', 'review', 'development'],
    jsonPreview: `{
  "name": "Code Review",
  "category": "technical",
  "fields": [
    { "name": "prTitle", "type": "text", "label": "PR Title", "required": true },
    { "name": "author", "type": "text", "label": "Author" },
    { "name": "summary", "type": "textarea", "label": "Summary of Changes" },
    { "name": "issues", "type": "textarea", "label": "Issues Found" },
    { "name": "suggestions", "type": "textarea", "label": "Suggestions" },
    { "name": "status", "type": "select", "label": "Status", "options": ["Approved", "Changes Requested", "Pending"] }
  ]
}`,
  },
  {
    id: 'bug-report',
    name: 'Bug Report',
    category: 'technical',
    difficulty: 'beginner',
    description: 'Detailed bug report with reproduction steps and expected behavior.',
    icon: 'Bug',
    tags: ['bug', 'issue', 'debugging'],
    jsonPreview: `{
  "name": "Bug Report",
  "category": "technical",
  "fields": [
    { "name": "title", "type": "text", "label": "Bug Title", "required": true },
    { "name": "severity", "type": "select", "label": "Severity", "options": ["Critical", "High", "Medium", "Low"] },
    { "name": "steps", "type": "textarea", "label": "Steps to Reproduce" },
    { "name": "expected", "type": "textarea", "label": "Expected Behavior" },
    { "name": "actual", "type": "textarea", "label": "Actual Behavior" },
    { "name": "environment", "type": "text", "label": "Environment" }
  ]
}`,
  },
  {
    id: 'blog-post',
    name: 'Blog Post',
    category: 'creative',
    difficulty: 'beginner',
    description: 'Blog article with title, summary, and structured content sections.',
    icon: 'Newspaper',
    tags: ['blog', 'writing', 'content'],
    jsonPreview: `{
  "name": "Blog Post",
  "category": "creative",
  "fields": [
    { "name": "title", "type": "text", "label": "Title", "required": true },
    { "name": "summary", "type": "textarea", "label": "Summary" },
    { "name": "tags", "type": "tags", "label": "Tags" },
    { "name": "body", "type": "textarea", "label": "Content" },
    { "name": "featured", "type": "checkbox", "label": "Featured Post" }
  ]
}`,
  },
  {
    id: 'story-outline',
    name: 'Story Outline',
    category: 'creative',
    difficulty: 'intermediate',
    description: 'Creative writing outline with characters, setting, and plot structure.',
    icon: 'BookOpen',
    tags: ['story', 'creative', 'writing'],
    jsonPreview: `{
  "name": "Story Outline",
  "category": "creative",
  "fields": [
    { "name": "title", "type": "text", "label": "Story Title", "required": true },
    { "name": "genre", "type": "select", "label": "Genre", "options": ["Fantasy", "Sci-Fi", "Mystery", "Romance", "Thriller"] },
    { "name": "characters", "type": "textarea", "label": "Main Characters" },
    { "name": "setting", "type": "textarea", "label": "Setting" },
    { "name": "premise", "type": "textarea", "label": "Premise" },
    { "name": "plotPoints", "type": "textarea", "label": "Key Plot Points" }
  ]
}`,
  },
  {
    id: 'learning-notes',
    name: 'Learning Notes',
    category: 'learning',
    difficulty: 'beginner',
    description: 'Structured notes for learning new topics with key concepts and questions.',
    icon: 'GraduationCap',
    tags: ['learning', 'notes', 'study'],
    jsonPreview: `{
  "name": "Learning Notes",
  "category": "learning",
  "fields": [
    { "name": "topic", "type": "text", "label": "Topic", "required": true },
    { "name": "source", "type": "url", "label": "Source URL" },
    { "name": "keyConcepts", "type": "textarea", "label": "Key Concepts" },
    { "name": "notes", "type": "textarea", "label": "Notes" },
    { "name": "questions", "type": "textarea", "label": "Questions to Explore" }
  ]
}`,
  },
  {
    id: 'daily-journal',
    name: 'Daily Journal',
    category: 'personal',
    difficulty: 'beginner',
    description: 'Simple daily reflection with gratitude and goals.',
    icon: 'Calendar',
    tags: ['journal', 'daily', 'reflection'],
    jsonPreview: `{
  "name": "Daily Journal",
  "category": "personal",
  "fields": [
    { "name": "date", "type": "date", "label": "Date", "required": true },
    { "name": "mood", "type": "select", "label": "Mood", "options": ["Great", "Good", "Okay", "Low", "Difficult"] },
    { "name": "gratitude", "type": "textarea", "label": "Gratitude" },
    { "name": "highlights", "type": "textarea", "label": "Highlights" },
    { "name": "tomorrow", "type": "textarea", "label": "Goals for Tomorrow" }
  ]
}`,
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   CATEGORY METADATA
═══════════════════════════════════════════════════════════════════════════ */

const CATEGORY_META: Record<TemplateCategory, { label: string; icon: React.ElementType; color: string }> = {
  general: { label: 'General', icon: FileText, color: '#6B7280' },
  business: { label: 'Business', icon: Briefcase, color: '#3B82F6' },
  technical: { label: 'Technical', icon: Code, color: '#10B981' },
  creative: { label: 'Creative', icon: Palette, color: '#8B5CF6' },
  personal: { label: 'Personal', icon: User, color: '#F59E0B' },
  learning: { label: 'Learning', icon: GraduationCap, color: '#EC4899' },
  lifestyle: { label: 'Lifestyle', icon: Heart, color: '#EF4444' },
  research: { label: 'Research', icon: Search, color: '#14B8A6' },
}

const DIFFICULTY_STYLES: Record<TemplateDifficulty, { label: string; color: string; bg: string }> = {
  beginner: { label: 'Beginner', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  intermediate: { label: 'Intermediate', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  advanced: { label: 'Advanced', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function TemplateExamples({
  onUseTemplate,
  filterCategory,
  compact = false,
}: TemplateExamplesProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>(filterCategory || 'all')
  const [expandedExample, setExpandedExample] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')

  // Filter examples by category
  const filteredExamples = useMemo(() => {
    if (selectedCategory === 'all') return EXAMPLE_TEMPLATES
    return EXAMPLE_TEMPLATES.filter(e => e.category === selectedCategory)
  }, [selectedCategory])

  // Get unique categories from examples
  const availableCategories = useMemo(() => {
    const cats = new Set(EXAMPLE_TEMPLATES.map(e => e.category))
    return Array.from(cats) as TemplateCategory[]
  }, [])

  // Copy JSON to clipboard
  const handleCopy = (example: ExampleTemplate) => {
    navigator.clipboard.writeText(example.jsonPreview)
    setCopiedId(example.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className={`space-y-4 ${compact ? '' : 'p-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-500" />
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
            Template Examples
          </h3>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <button
            onClick={() => setViewMode('preview')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'preview'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5 inline mr-1" />
            Preview
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'code'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 inline mr-1" />
            Code
          </button>
        </div>
      </div>

      {/* Category Filter */}
      {!filterCategory && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-cyan-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            All
          </button>
          {availableCategories.map(cat => {
            const meta = CATEGORY_META[cat]
            const Icon = meta.icon
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                style={selectedCategory === cat ? { backgroundColor: meta.color } : undefined}
              >
                <Icon className="w-3.5 h-3.5" />
                {meta.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Examples Grid */}
      <div className="space-y-3">
        {filteredExamples.map(example => {
          const catMeta = CATEGORY_META[example.category]
          const diffStyle = DIFFICULTY_STYLES[example.difficulty]
          const isExpanded = expandedExample === example.id

          return (
            <div
              key={example.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
            >
              {/* Example Header */}
              <button
                onClick={() => setExpandedExample(isExpanded ? null : example.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${catMeta.color}20`, color: catMeta.color }}
                >
                  <DynamicIcon name={example.icon} className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-zinc-800 dark:text-zinc-200">
                      {example.name}
                    </h4>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${diffStyle.bg} ${diffStyle.color}`}>
                      {diffStyle.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {example.description}
                  </p>
                </div>

                <ChevronDown
                  className={`w-5 h-5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 border-t border-zinc-100 dark:border-zinc-800">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {example.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Code/Preview */}
                      {viewMode === 'code' ? (
                        <div className="relative group">
                          <pre className="p-3 bg-zinc-900 dark:bg-zinc-950 text-zinc-300 text-xs font-mono rounded-lg overflow-x-auto max-h-60">
                            {example.jsonPreview}
                          </pre>
                          <button
                            onClick={() => handleCopy(example)}
                            className="absolute top-2 right-2 p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy JSON"
                          >
                            {copiedId === example.id ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {example.description}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <catMeta.icon className="w-3.5 h-3.5" />
                              {catMeta.label}
                            </span>
                            <span>•</span>
                            <span className={diffStyle.color}>{diffStyle.label}</span>
                          </div>
                        </div>
                      )}

                      {/* Action Button */}
                      {onUseTemplate && (
                        <button
                          onClick={() => onUseTemplate(example)}
                          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Rocket className="w-4 h-4" />
                          Use This Template
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredExamples.length === 0 && (
        <div className="text-center py-8">
          <Sparkles className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500">No examples in this category yet</p>
        </div>
      )}
    </div>
  )
}
