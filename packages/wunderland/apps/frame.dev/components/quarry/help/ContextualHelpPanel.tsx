/**
 * ContextualHelpPanel Component
 * @module codex/help/ContextualHelpPanel
 *
 * @description
 * Collapsible right sidebar providing contextual help for the current wizard step.
 * Features:
 * - Section tabs (Overview, Fields, Tips, Troubleshooting, Quick Reference)
 * - Search within help content
 * - Collapse state persisted to localStorage
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Search,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  List,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StepHelp, HelpPanelSection, FieldHelp } from './HelpContent'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface ContextualHelpPanelProps {
  /** Current step help content */
  stepHelp: StepHelp | null
  /** Whether panel is open */
  isOpen: boolean
  /** Toggle panel open/closed */
  onToggle: () => void
  /** Active section */
  activeSection: HelpPanelSection
  /** Set active section */
  onSectionChange: (section: HelpPanelSection) => void
  /** Search query */
  searchQuery: string
  /** Set search query */
  onSearchChange: (query: string) => void
  /** Dark mode */
  isDark?: boolean
  /** Panel width */
  width?: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION TABS
═══════════════════════════════════════════════════════════════════════════ */

const SECTIONS: Array<{ id: HelpPanelSection; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'fields', label: 'Fields', icon: <List className="w-4 h-4" /> },
  { id: 'tips', label: 'Tips', icon: <Lightbulb className="w-4 h-4" /> },
  { id: 'troubleshooting', label: 'Help', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'quickRef', label: 'Reference', icon: <HelpCircle className="w-4 h-4" /> },
]

/* ═══════════════════════════════════════════════════════════════════════════
   FIELD HELP CARD
═══════════════════════════════════════════════════════════════════════════ */

function FieldHelpCard({ field, isDark }: { field: FieldHelp; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className={cn('font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
          {field.label}
        </span>
        <ChevronRight
          className={cn(
            'w-4 h-4 transition-transform',
            expanded ? 'rotate-90' : '',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
              <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                {field.description}
              </p>

              {field.examples && field.examples.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400 mb-1">
                    Examples:
                  </div>
                  <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-0.5">
                    {field.examples.map((ex, i) => (
                      <li key={i}>• {ex}</li>
                    ))}
                  </ul>
                </div>
              )}

              {field.cautions && field.cautions.length > 0 && (
                <div className={cn('p-2 rounded text-xs', isDark ? 'bg-amber-900/30' : 'bg-amber-50')}>
                  <div className="font-medium text-amber-600 dark:text-amber-400 mb-1">
                    Watch out:
                  </div>
                  <ul className="text-amber-700 dark:text-amber-300 space-y-0.5">
                    {field.cautions.map((c, i) => (
                      <li key={i}>• {c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {field.suggestion && (
                <p className="text-xs text-cyan-600 dark:text-cyan-400">
                  💡 {field.suggestion}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function ContextualHelpPanel({
  stepHelp,
  isOpen,
  onToggle,
  activeSection,
  onSectionChange,
  searchQuery,
  onSearchChange,
  isDark = false,
  width = 300,
}: ContextualHelpPanelProps) {
  // Filter content based on search
  const filteredFields = useMemo(() => {
    if (!stepHelp?.fields || !searchQuery) return stepHelp?.fields || []
    const q = searchQuery.toLowerCase()
    return stepHelp.fields.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q)
    )
  }, [stepHelp?.fields, searchQuery])

  // Collapsed toggle button
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'fixed right-0 top-1/2 -translate-y-1/2 z-40 p-2 rounded-l-lg shadow-lg transition-colors',
          isDark
            ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-l border-y border-zinc-700'
            : 'bg-white text-zinc-500 hover:text-zinc-700 border-l border-y border-zinc-200'
        )}
        title="Show help panel"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
    )
  }

  return (
    <motion.div
      initial={{ x: width }}
      animate={{ x: 0 }}
      exit={{ x: width }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      style={{ width }}
      className={cn(
        'fixed right-0 top-16 bottom-0 z-40 flex flex-col shadow-xl border-l',
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}
      >
        <div className="flex items-center gap-2">
          <HelpCircle className={cn('w-5 h-5', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
          <span className={cn('font-semibold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
            Help
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            isDark
              ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search
            className={cn(
              'absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search help..."
            className={cn(
              'w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border',
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500'
                : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500/30'
            )}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className={cn(
                'absolute right-2.5 top-1/2 -translate-y-1/2',
                isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
              )}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <div className={cn('flex border-b overflow-x-auto', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onSectionChange(section.id)}
            className={cn(
              'flex-1 min-w-0 px-2 py-2 text-xs font-medium transition-colors',
              activeSection === section.id
                ? isDark
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-cyan-600 border-b-2 border-cyan-600'
                : isDark
                  ? 'text-zinc-500 hover:text-zinc-300'
                  : 'text-zinc-500 hover:text-zinc-700'
            )}
            title={section.label}
          >
            <span className="flex items-center justify-center">{section.icon}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {!stepHelp ? (
          <div className={cn('text-sm text-center py-8', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            Select a step to see help content
          </div>
        ) : (
          <>
            {/* Overview */}
            {activeSection === 'overview' && (
              <div className="space-y-4">
                <h3 className={cn('font-semibold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
                  {stepHelp.title}
                </h3>
                <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                  {stepHelp.overview}
                </p>
                {stepHelp.instructions && (
                  <div>
                    <h4 className={cn('text-xs font-medium mb-2', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
                      Steps:
                    </h4>
                    <ol className={cn('text-sm space-y-1.5 list-decimal list-inside', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                      {stepHelp.instructions.map((inst, i) => (
                        <li key={i}>{inst}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* Fields */}
            {activeSection === 'fields' && (
              <div className="space-y-3">
                {filteredFields.length === 0 ? (
                  <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                    No fields found
                  </p>
                ) : (
                  filteredFields.map((field) => (
                    <FieldHelpCard key={field.name} field={field} isDark={isDark} />
                  ))
                )}
              </div>
            )}

            {/* Tips */}
            {activeSection === 'tips' && (
              <div className="space-y-2">
                {stepHelp.tips && stepHelp.tips.length > 0 ? (
                  stepHelp.tips.map((tip, i) => (
                    <div
                      key={i}
                      className={cn(
                        'p-3 rounded-lg text-sm',
                        isDark ? 'bg-cyan-900/20 text-cyan-300' : 'bg-cyan-50 text-cyan-700'
                      )}
                    >
                      💡 {tip}
                    </div>
                  ))
                ) : (
                  <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                    No tips available for this step
                  </p>
                )}
              </div>
            )}

            {/* Troubleshooting */}
            {activeSection === 'troubleshooting' && (
              <div className="space-y-3">
                {stepHelp.troubleshooting && stepHelp.troubleshooting.length > 0 ? (
                  stepHelp.troubleshooting.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        'p-3 rounded-lg border',
                        isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'
                      )}
                    >
                      <div className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                        ❓ {item.problem}
                      </div>
                      <div className={cn('mt-1.5 text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                        ✅ {item.solution}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                    No troubleshooting items for this step
                  </p>
                )}
              </div>
            )}

            {/* Quick Reference */}
            {activeSection === 'quickRef' && (
              <div className="space-y-2">
                {stepHelp.quickRef && stepHelp.quickRef.length > 0 ? (
                  stepHelp.quickRef.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        'p-2 rounded-lg',
                        isDark ? 'bg-zinc-800' : 'bg-zinc-50'
                      )}
                    >
                      <span className={cn('font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                        {item.term}:
                      </span>{' '}
                      <span className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                        {item.definition}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                    No quick reference available
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

export { ContextualHelpPanel }
