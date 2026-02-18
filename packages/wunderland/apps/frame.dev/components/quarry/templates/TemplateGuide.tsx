/**
 * Template Best Practices Guide
 * @module codex/templates/TemplateGuide
 *
 * @remarks
 * Expandable guide for template creators covering:
 * - Naming conventions
 * - Field design best practices
 * - Validation patterns
 * - Template structure
 * - Advanced features
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, ChevronDown, ChevronRight, FileText,
  Type, Layers, Shield, Sparkles, Code2,
  CheckCircle2, AlertCircle, Info, Wrench,
  GitBranch, Copy, Check, Zap, ListChecks
} from 'lucide-react'

interface GuideSection {
  id: string
  title: string
  icon: React.ElementType
  content: React.ReactNode
}

const guideSections: GuideSection[] = [
  {
    id: 'naming',
    title: 'Naming Conventions',
    icon: Type,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Good template names are clear, descriptive, and action-oriented.
        </p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Do: Use descriptive names</p>
              <p className="text-xs text-zinc-500">&quot;Meeting Notes&quot;, &quot;Project Retrospective&quot;, &quot;Bug Report&quot;</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Avoid: Generic names</p>
              <p className="text-xs text-zinc-500">&quot;Template 1&quot;, &quot;Notes&quot;, &quot;New Document&quot;</p>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Template IDs are auto-generated from names. Use lowercase with hyphens for consistency.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'fields',
    title: 'Field Design',
    icon: Layers,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Choose the right field type for each input. Here&apos;s when to use each:
        </p>
        <div className="grid gap-2">
          <FieldTypeRow type="text" use="Short single-line values" example="Title, Name" />
          <FieldTypeRow type="textarea" use="Multi-line content" example="Description, Summary" />
          <FieldTypeRow type="select" use="One choice from fixed options" example="Status, Priority" />
          <FieldTypeRow type="multiselect" use="Multiple choices allowed" example="Categories, Features" />
          <FieldTypeRow type="tags" use="Flexible user-defined labels" example="Keywords, Topics" />
          <FieldTypeRow type="date" use="Calendar date selection" example="Due Date, Start Date" />
          <FieldTypeRow type="number" use="Numeric values with range" example="Rating, Quantity" />
          <FieldTypeRow type="checkbox" use="Yes/No toggle" example="Completed, Featured" />
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Keep forms under 8 fields. Use field groups to organize complex templates.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'validation',
    title: 'Validation Patterns',
    icon: Shield,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Add validation rules to ensure quality data entry.
        </p>
        <div className="space-y-3">
          <ValidationExample
            name="Required fields"
            desc="Mark essential fields with red indicator"
            code='required: true'
          />
          <ValidationExample
            name="Length limits"
            desc="Control text length"
            code='validation: { minLength: 3, maxLength: 100 }'
          />
          <ValidationExample
            name="Number ranges"
            desc="Set min/max values"
            code='validation: { min: 1, max: 10 }'
          />
          <ValidationExample
            name="Pattern matching"
            desc="Regex for custom formats"
            code='validation: { pattern: "^[A-Z]{2}-\\d{4}$" }'
          />
        </div>
      </div>
    ),
  },
  {
    id: 'structure',
    title: 'Template Structure',
    icon: FileText,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Templates use placeholders that get replaced with field values.
        </p>
        <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-mono text-xs">
          <pre className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{`---
title: "{title}"
date: "{date}"
tags: [{tags}]
---

# {title}

{summary}

## Key Points

- Point 1
- Point 2`}</pre>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-zinc-600 dark:text-zinc-400">
            <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">{'{fieldName}'}</code> - Replaced with field value
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">{'{date}'}</code> - Current date (auto-filled)
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">[{'{tags}'}]</code> - Array values joined with commas
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'advanced',
    title: 'Advanced Features',
    icon: Sparkles,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Power features for complex templates.
        </p>
        <div className="space-y-3">
          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">
              Conditional Fields
            </h4>
            <p className="text-xs text-zinc-500 mb-2">
              Show/hide fields based on other field values.
            </p>
            <code className="text-xs text-zinc-600 dark:text-zinc-400 block p-2 bg-zinc-50 dark:bg-zinc-800 rounded">
              showIf: {`{ field: 'type', equals: 'advanced' }`}
            </code>
          </div>
          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">
              Field Groups
            </h4>
            <p className="text-xs text-zinc-500 mb-2">
              Organize related fields into collapsible sections.
            </p>
            <code className="text-xs text-zinc-600 dark:text-zinc-400 block p-2 bg-zinc-50 dark:bg-zinc-800 rounded">
              group: &apos;metadata&apos;
            </code>
          </div>
          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">
              Default Values
            </h4>
            <p className="text-xs text-zinc-500 mb-2">
              Pre-fill fields with sensible defaults.
            </p>
            <code className="text-xs text-zinc-600 dark:text-zinc-400 block p-2 bg-zinc-50 dark:bg-zinc-800 rounded">
              defaultData: {`{ status: 'draft', priority: 'medium' }`}
            </code>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'field-types',
    title: 'Complete Field Types Reference',
    icon: ListChecks,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          All available field types with detailed usage examples.
        </p>
        <div className="grid gap-2">
          <FieldTypeRow type="text" use="Short single-line input" example="Title, Author name" />
          <FieldTypeRow type="textarea" use="Multi-line text content" example="Description, Body" />
          <FieldTypeRow type="select" use="Dropdown single choice" example="Status, Category" />
          <FieldTypeRow type="multiselect" use="Multiple selections" example="Tags, Categories" />
          <FieldTypeRow type="tags" use="Free-form tag input" example="Keywords, Topics" />
          <FieldTypeRow type="date" use="Date picker" example="Due date, Published" />
          <FieldTypeRow type="datetime" use="Date and time" example="Event start, Reminder" />
          <FieldTypeRow type="time" use="Time only picker" example="Duration, Start time" />
          <FieldTypeRow type="number" use="Numeric input" example="Rating, Quantity" />
          <FieldTypeRow type="range" use="Slider with min/max" example="Priority (1-10)" />
          <FieldTypeRow type="checkbox" use="Boolean toggle" example="Is published, Featured" />
          <FieldTypeRow type="url" use="URL with validation" example="Source link, Website" />
          <FieldTypeRow type="email" use="Email with validation" example="Contact, Author email" />
          <FieldTypeRow type="color" use="Color picker" example="Theme color, Highlight" />
          <FieldTypeRow type="file" use="File attachment" example="Cover image, PDF" />
          <FieldTypeRow type="hidden" use="Non-visible field" example="Template ID, Version" />
        </div>
      </div>
    ),
  },
  {
    id: 'conditional',
    title: 'Conditional Logic',
    icon: GitBranch,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Show or hide fields dynamically based on other field values.
        </p>
        <div className="space-y-3">
          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2">
              Show if equals
            </h4>
            <p className="text-xs text-zinc-500 mb-2">
              Show a field only when another field has a specific value.
            </p>
            <CodeBlock code={`{
  name: "advancedOptions",
  label: "Advanced Options",
  showIf: { field: "type", equals: "advanced" }
}`} />
          </div>
          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2">
              Show if not empty
            </h4>
            <p className="text-xs text-zinc-500 mb-2">
              Show a field when another field has any value.
            </p>
            <CodeBlock code={`{
  name: "additionalInfo",
  showIf: { field: "description", notEmpty: true }
}`} />
          </div>
          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2">
              Show if contains
            </h4>
            <p className="text-xs text-zinc-500 mb-2">
              Show when a multiselect contains a specific option.
            </p>
            <CodeBlock code={`{
  name: "technicalDetails",
  showIf: { field: "categories", contains: "technical" }
}`} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    icon: Zap,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Follow these guidelines for great templates.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Do
            </h4>
            <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <li className="flex gap-2">
                <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                Keep forms focused (5-8 fields max)
              </li>
              <li className="flex gap-2">
                <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                Use clear, descriptive labels
              </li>
              <li className="flex gap-2">
                <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                Provide helpful placeholders
              </li>
              <li className="flex gap-2">
                <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                Set sensible defaults
              </li>
              <li className="flex gap-2">
                <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                Use tooltips for complex fields
              </li>
              <li className="flex gap-2">
                <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                Group related fields together
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Avoid
            </h4>
            <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <li className="flex gap-2">
                <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                Too many required fields
              </li>
              <li className="flex gap-2">
                <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                Vague or technical labels
              </li>
              <li className="flex gap-2">
                <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                Overly strict validation
              </li>
              <li className="flex gap-2">
                <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                Deep nested conditionals
              </li>
              <li className="flex gap-2">
                <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                Duplicate placeholder names
              </li>
              <li className="flex gap-2">
                <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                Missing field descriptions
              </li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: Wrench,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Common issues and how to fix them.
        </p>
        <div className="space-y-3">
          <TroubleshootingItem
            problem="Placeholder not being replaced"
            solution="Check that field name matches exactly (case-sensitive). Verify the field exists in your fields array."
          />
          <TroubleshootingItem
            problem="Validation not working"
            solution="Ensure validation object uses correct property names: minLength, maxLength, pattern, min, max."
          />
          <TroubleshootingItem
            problem="Conditional field always hidden"
            solution="Verify the referenced field name exists and the condition value matches exactly."
          />
          <TroubleshootingItem
            problem="Template not saving"
            solution="Check that required fields (name, category, template) are filled. Look for validation errors."
          />
          <TroubleshootingItem
            problem="Import failing"
            solution="Verify JSON is valid and matches the template schema. Use the JSON preview to check format."
          />
        </div>
      </div>
    ),
  },
]

function FieldTypeRow({ type, use, example }: { type: string; use: string; example: string }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
      <code className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs font-medium min-w-[80px]">
        {type}
      </code>
      <div className="flex-1 text-xs">
        <span className="text-zinc-700 dark:text-zinc-300">{use}</span>
        <span className="text-zinc-400 ml-2">({example})</span>
      </div>
    </div>
  )
}

function ValidationExample({ name, desc, code }: { name: string; desc: string; code: string }) {
  return (
    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
      <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{name}</h4>
      <p className="text-xs text-zinc-500 mb-2">{desc}</p>
      <code className="text-xs text-zinc-600 dark:text-zinc-400 block p-2 bg-zinc-50 dark:bg-zinc-800 rounded">
        {code}
      </code>
    </div>
  )
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <pre className="text-xs text-zinc-600 dark:text-zinc-400 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg overflow-x-auto">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-zinc-200 dark:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy code"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-zinc-500" />
        )}
      </button>
    </div>
  )
}

function TroubleshootingItem({ problem, solution }: { problem: string; solution: string }) {
  return (
    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">{problem}</h4>
          <p className="text-xs text-zinc-500">{solution}</p>
        </div>
      </div>
    </div>
  )
}

interface TemplateGuideProps {
  /** Initial expanded section */
  defaultSection?: string
  /** Compact mode (less padding) */
  compact?: boolean
}

export default function TemplateGuide({
  defaultSection,
  compact = false,
}: TemplateGuideProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(defaultSection || null)

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id)
  }

  return (
    <div className={`space-y-2 ${compact ? '' : 'p-4'}`}>
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
          Template Best Practices
        </h3>
      </div>

      {guideSections.map((section) => {
        const Icon = section.icon
        const isExpanded = expandedSection === section.id

        return (
          <div
            key={section.id}
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
          >
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <Icon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              <span className="flex-1 font-medium text-zinc-800 dark:text-zinc-200">
                {section.title}
              </span>
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-zinc-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-zinc-400" />
              )}
            </button>

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
                    {section.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
