/**
 * StructuredReflectionEditor - Inline sectioned reflection editor
 * @module components/quarry/ui/StructuredReflectionEditor
 *
 * Provides structured sections for daily reflections:
 * - Morning Intentions
 * - Notes/Journal
 * - What Got Done
 * - Evening Reflection
 *
 * Each section is collapsible and has its own inline editor.
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Sunrise,
  FileText,
  CheckSquare,
  Moon,
  Sparkles,
  Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CompactReflectionTimer } from '../reflect/ReflectionTimer'

export interface ReflectionSections {
  morningIntentions?: string
  notes?: string
  whatGotDone?: string
  eveningReflection?: string
}

interface StructuredReflectionEditorProps {
  /** Initial content (can be markdown or structured) */
  content: string
  /** Callback when content changes */
  onChange: (content: string) => void
  /** Theme */
  isDark?: boolean
  /** Date display */
  dateDisplay?: string
  /** Day of week */
  dayOfWeek?: string
  /** Show the reflection timer */
  showTimer?: boolean
}

interface SectionConfig {
  id: keyof ReflectionSections
  title: string
  icon: React.ElementType
  placeholder: string
  prompts: string[]
  color: string
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'morningIntentions',
    title: 'Morning Intentions',
    icon: Sunrise,
    placeholder: 'What do I want to focus on today?',
    prompts: [
      'My top 3 priorities today are...',
      "Today I will focus on...",
      'I want to feel _____ by the end of the day',
      'One thing I want to accomplish is...',
      'I will make time for...',
      'Today matters because...',
      'My energy today will go toward...',
      "I'm excited about...",
    ],
    color: 'amber',
  },
  {
    id: 'notes',
    title: 'Notes & Thoughts',
    icon: FileText,
    placeholder: "What's on your mind? Capture any thoughts, ideas, or observations.",
    prompts: [
      'Something I noticed today...',
      "I'm thinking about...",
      'An idea that came to me...',
      'A conversation I had...',
      'Something that surprised me...',
      'A question on my mind...',
      'What I learned today...',
      'A small moment I want to remember...',
      'Something I want to explore more...',
    ],
    color: 'blue',
  },
  {
    id: 'whatGotDone',
    title: 'What Got Done',
    icon: CheckSquare,
    placeholder: 'What did you accomplish? Celebrate your wins, big and small.',
    prompts: [
      'Today I completed...',
      "I'm proud that I...",
      'Progress I made on...',
    ],
    color: 'green',
  },
  {
    id: 'eveningReflection',
    title: 'Evening Reflection',
    icon: Moon,
    placeholder: 'How was your day? What are you grateful for?',
    prompts: [
      "Today I'm grateful for...",
      'What I learned today...',
      'Tomorrow I want to...',
    ],
    color: 'purple',
  },
]

/**
 * Parse markdown content into structured sections
 */
function parseContent(markdown: string): ReflectionSections {
  const sections: ReflectionSections = {}

  // Try to parse structured sections from markdown
  const morningMatch = markdown.match(/## Morning Intentions\n([\s\S]*?)(?=\n## |$)/)
  const notesMatch = markdown.match(/## Notes(?: & Thoughts)?\n([\s\S]*?)(?=\n## |$)/)
  const doneMatch = markdown.match(/## What Got Done\n([\s\S]*?)(?=\n## |$)/)
  const eveningMatch = markdown.match(/## Evening Reflection\n([\s\S]*?)(?=\n## |$)/)

  if (morningMatch) sections.morningIntentions = morningMatch[1].trim()
  if (notesMatch) sections.notes = notesMatch[1].trim()
  if (doneMatch) sections.whatGotDone = doneMatch[1].trim()
  if (eveningMatch) sections.eveningReflection = eveningMatch[1].trim()

  // If no structured content found, put everything in notes
  if (!morningMatch && !notesMatch && !doneMatch && !eveningMatch && markdown.trim()) {
    sections.notes = markdown.trim()
  }

  return sections
}

/**
 * Serialize sections back to markdown
 */
function serializeToMarkdown(sections: ReflectionSections): string {
  const parts: string[] = []

  if (sections.morningIntentions?.trim()) {
    parts.push(`## Morning Intentions\n${sections.morningIntentions.trim()}`)
  }
  if (sections.notes?.trim()) {
    parts.push(`## Notes & Thoughts\n${sections.notes.trim()}`)
  }
  if (sections.whatGotDone?.trim()) {
    parts.push(`## What Got Done\n${sections.whatGotDone.trim()}`)
  }
  if (sections.eveningReflection?.trim()) {
    parts.push(`## Evening Reflection\n${sections.eveningReflection.trim()}`)
  }

  return parts.join('\n\n')
}

/**
 * Individual section component
 */
function ReflectionSection({
  config,
  value,
  onChange,
  isCollapsed,
  onToggleCollapse,
  isDark,
}: {
  config: SectionConfig
  value: string
  onChange: (value: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  isDark: boolean
}) {
  const [showPrompts, setShowPrompts] = useState(false)
  const Icon = config.icon
  const hasContent = value.trim().length > 0

  const colorClasses = {
    amber: {
      icon: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      border: 'border-amber-500/20 dark:border-amber-500/30',
    },
    blue: {
      icon: 'text-blue-500 dark:text-blue-400',
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      border: 'border-blue-500/20 dark:border-blue-500/30',
    },
    green: {
      icon: 'text-green-500 dark:text-green-400',
      bg: 'bg-green-500/10 dark:bg-green-500/20',
      border: 'border-green-500/20 dark:border-green-500/30',
    },
    purple: {
      icon: 'text-purple-500 dark:text-purple-400',
      bg: 'bg-purple-500/10 dark:bg-purple-500/20',
      border: 'border-purple-500/20 dark:border-purple-500/30',
    },
  }

  const colors = colorClasses[config.color as keyof typeof colorClasses]

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200',
        isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white',
        hasContent && colors.border
      )}
    >
      {/* Section Header */}
      <button
        onClick={onToggleCollapse}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 transition-colors',
          'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-t-xl',
          isCollapsed && 'rounded-b-xl'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-1.5 rounded-lg', colors.bg)}>
            <Icon className={cn('w-4 h-4', colors.icon)} />
          </div>
          <span className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
            {config.title}
          </span>
          {hasContent && !isCollapsed && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {value.split(/\s+/).filter(Boolean).length} words
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isCollapsed ? -90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        </motion.div>
      </button>

      {/* Section Content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Textarea */}
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={config.placeholder}
                className={cn(
                  'w-full min-h-[100px] bg-transparent resize-none outline-none text-sm leading-relaxed',
                  isDark
                    ? 'text-zinc-200 placeholder:text-zinc-600'
                    : 'text-zinc-800 placeholder:text-zinc-400'
                )}
              />

              {/* Prompts toggle */}
              {!hasContent && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowPrompts(!showPrompts)
                    }}
                    className={cn(
                      'flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg transition-colors',
                      isDark
                        ? 'text-zinc-400 hover:bg-zinc-800'
                        : 'text-zinc-500 hover:bg-zinc-100'
                    )}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Prompts</span>
                  </button>
                </div>
              )}

              {/* Prompt suggestions */}
              <AnimatePresence>
                {showPrompts && !hasContent && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-1"
                  >
                    {config.prompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation()
                          onChange(prompt)
                          setShowPrompts(false)
                        }}
                        className={cn(
                          'w-full text-left text-xs px-3 py-2 rounded-lg transition-colors',
                          isDark
                            ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
                            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
                        )}
                      >
                        {prompt}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * StructuredReflectionEditor - Main component
 */
export default function StructuredReflectionEditor({
  content,
  onChange,
  isDark = false,
  dateDisplay,
  dayOfWeek,
  showTimer = false, // Timer is in left sidebar, avoid duplication
}: StructuredReflectionEditorProps) {
  const [sections, setSections] = useState<ReflectionSections>(() => parseContent(content))
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [timerExpanded, setTimerExpanded] = useState(false)

  // Parse content when it changes externally
  useEffect(() => {
    setSections(parseContent(content))
  }, [content])

  // Update parent when sections change
  const handleSectionChange = useCallback(
    (sectionId: keyof ReflectionSections, value: string) => {
      const newSections = { ...sections, [sectionId]: value }
      setSections(newSections)
      onChange(serializeToMarkdown(newSections))
    },
    [sections, onChange]
  )

  const toggleCollapse = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  return (
    <div className="space-y-3">
      {/* Date Header */}
      {(dateDisplay || dayOfWeek) && (
        <div className="flex items-center gap-2 mb-4">
          {dayOfWeek && (
            <span className={cn('text-xs font-medium uppercase tracking-wide', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              {dayOfWeek}
            </span>
          )}
          {dateDisplay && (
            <span className={cn('text-sm font-medium', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
              {dateDisplay}
            </span>
          )}
        </div>
      )}

      {/* Timer - Collapsible */}
      {showTimer && (
        <div
          className={cn(
            'rounded-xl border overflow-hidden transition-all',
            isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white'
          )}
        >
          <button
            onClick={() => setTimerExpanded(!timerExpanded)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 transition-colors',
              'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
              timerExpanded ? 'rounded-t-xl' : 'rounded-xl'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn('p-1.5 rounded-lg', 'bg-purple-500/10 dark:bg-purple-500/20')}>
                <Timer className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              </div>
              <span className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                Reflection Timer
              </span>
            </div>
            <motion.div
              animate={{ rotate: timerExpanded ? 0 : -90 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {timerExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-6">
                  <CompactReflectionTimer
                    defaultMinutes={5}
                    maxMinutes={30}
                    isDark={isDark}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Sections */}
      {SECTIONS.map((config) => (
        <ReflectionSection
          key={config.id}
          config={config}
          value={sections[config.id] || ''}
          onChange={(value) => handleSectionChange(config.id, value)}
          isCollapsed={collapsedSections.has(config.id)}
          onToggleCollapse={() => toggleCollapse(config.id)}
          isDark={isDark}
        />
      ))}
    </div>
  )
}
