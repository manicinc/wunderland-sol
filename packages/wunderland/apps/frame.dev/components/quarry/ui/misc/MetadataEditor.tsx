/**
 * Metadata Editor - Edit strand YAML frontmatter only
 * @module codex/ui/MetadataEditor
 *
 * @remarks
 * This editor is specifically for editing metadata/schema/tags/properties
 * in the YAML frontmatter of strands. It does NOT edit content.
 * For content editing, use StrandEditor or InlineEditor.
 *
 * Flow: Edit → Live Preview → Publish (no auto-save drafts)
 *
 * @see docs/TAXONOMY_GUIDE.md for taxonomy hierarchy documentation
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Save, X, Plus, Trash2, Check, AlertCircle,
  Tags, BookOpen, Eye, EyeOff, Globe, Lock,
  Sparkles, ChevronDown, ChevronRight, FileText,
  Link2, RotateCcw, Upload, Code, Diff, HelpCircle,
  ExternalLink, Users, Layers, AlertTriangle,
  Hash, Zap, FileCheck, MessageSquare, Image, Settings
} from 'lucide-react'
import {
  findSimilarTermsDetailed,
  type TaxonomyLevel,
  DEFAULT_TAXONOMY_CONFIG,
} from '@/lib/taxonomy'
import type { StrandMetadata } from '../../types'
import type { SaveResult } from '@/lib/content/saveStrandMetadata'
import { normalizeTags as normalizeTagsUtil, MIN_TAG_LENGTH } from '@/lib/utils'
import PublishGuideModal from '../publishing/PublishGuideModal'
import {
  type WeaverStatus,
  type PublishCapability,
  checkWeaverStatus,
  getPublishCapability,
  buildGitHubEditUrl,
  getWeaversListUrl
} from '@/lib/weaver'
import { getSchemaByTagName, type SupertagSchema } from '@/lib/supertags'

type EditorMode = 'edit' | 'preview'

/**
 * Taxonomy level help text for tooltips
 */
const TAXONOMY_HELP = {
  subjects: 'BROAD categories that organize your entire codex (e.g., "programming", "design", "business"). Use only 2-3 per document. Subjects should never overlap with topics or tags.',
  topics: 'MID-LEVEL categories within subjects (e.g., "react", "machine-learning", "typography"). More specific than subjects but broader than tags. Use 5-7 per document.',
  tags: 'SPECIFIC terms for granular concepts (e.g., "hooks", "gradient-descent", "serif-fonts"). Most varied level - use 10-15 per document.',
} as const

/**
 * Validation warning for taxonomy terms
 */
interface TaxonomyWarning {
  term: string
  level: TaxonomyLevel
  matchedTerm: string
  matchedLevel: TaxonomyLevel
  score: number
  method: string
}

/**
 * Tooltip component for help text
 */
function MetadataTooltip({ content, wide = false, children }: {
  content: string
  wide?: boolean
  children: React.ReactNode
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className={`absolute z-50 bottom-full left-0 mb-2 px-3 py-2 rounded-lg text-xs
              bg-zinc-900 text-white shadow-lg whitespace-normal
              ${wide ? 'w-72' : 'w-56'}`}
          >
            {content}
            <div className="absolute top-full left-4 border-4 border-transparent border-t-zinc-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface MetadataEditorProps {
  /** Current metadata */
  metadata: StrandMetadata
  /** Publish callback - receives updated metadata, commits to repo */
  onSave: (metadata: StrandMetadata) => Promise<void>
  /** Close callback */
  onClose?: () => void
  /** Whether editor is in compact mode */
  compact?: boolean
  /** Current theme */
  theme?: string
  /** File path for context */
  filePath?: string
  /** Result of the last save operation (for showing PR links, etc.) */
  saveResult?: SaveResult | null
  /** Whether a save is currently in progress */
  isSaving?: boolean
}

/**
 * Generate YAML frontmatter string from metadata object
 */
function metadataToYaml(meta: StrandMetadata): string {
  const lines: string[] = ['---']

  if (meta.title) lines.push(`title: "${meta.title}"`)
  if (meta.summary) lines.push(`summary: "${meta.summary}"`)
  if (meta.tags && meta.tags.length > 0) {
    lines.push('tags:')
    const tagsArr = Array.isArray(meta.tags) ? meta.tags : [meta.tags]
    tagsArr.forEach(tag => lines.push(`  - ${tag}`))
  }
  if (meta.prerequisites && meta.prerequisites.length > 0) {
    lines.push('prerequisites:')
    meta.prerequisites.forEach((p: string) => lines.push(`  - ${p}`))
  }
  if (meta.references && meta.references.length > 0) {
    lines.push('references:')
    meta.references.forEach((r: string) => lines.push(`  - ${r}`))
  }
  if (meta.seo) {
    lines.push('seo:')
    if (meta.seo.index !== undefined) lines.push(`  index: ${meta.seo.index}`)
    if (meta.seo.follow !== undefined) lines.push(`  follow: ${meta.seo.follow}`)
    if (meta.seo.metaDescription) lines.push(`  metaDescription: "${meta.seo.metaDescription}"`)
    if (meta.seo.canonicalUrl) lines.push(`  canonicalUrl: "${meta.seo.canonicalUrl}"`)
  }

  lines.push('---')
  return lines.join('\n')
}

/**
 * Compact metadata editor for the right sidebar
 * Edits ONLY frontmatter - title, summary, tags, SEO, relations
 * 
 * NO auto-save drafts - uses Edit → Preview → Publish flow
 */
export default function MetadataEditor({
  metadata,
  onSave,
  onClose,
  compact = true,
  theme = 'light',
  filePath,
  saveResult,
  isSaving = false,
}: MetadataEditorProps) {
  const isDark = theme.includes('dark')

  // Editor mode: edit or preview
  const [mode, setMode] = useState<EditorMode>('edit')

  // Normalize tags to array with min length validation
  const normalizeTags = (t: string | string[] | undefined): string[] => {
    return normalizeTagsUtil(t, { lowercase: false })
  }

  // Editable fields state
  const [title, setTitle] = useState(metadata.title || '')
  const [summary, setSummary] = useState(metadata.summary || '')
  const [tags, setTags] = useState<string[]>(normalizeTags(metadata.tags))
  const [newTag, setNewTag] = useState('')
  const [prerequisites, setPrerequisites] = useState<string[]>(metadata.prerequisites || metadata.relationships?.prerequisites || [])
  const [newPrereq, setNewPrereq] = useState('')
  const [references, setReferences] = useState<string[]>(metadata.references || metadata.relationships?.references || [])
  const [newRef, setNewRef] = useState('')

  // Taxonomy fields (prepopulated from existing metadata)
  const [subjects, setSubjects] = useState<string[]>(metadata.taxonomy?.subjects || [])
  const [newSubject, setNewSubject] = useState('')
  const [topics, setTopics] = useState<string[]>(metadata.taxonomy?.topics || [])
  const [newTopic, setNewTopic] = useState('')

  // Additional metadata fields
  const [difficulty, setDifficulty] = useState<string>(
    typeof metadata.difficulty === 'string'
      ? metadata.difficulty
      : (metadata.difficulty as any)?.overall || ''
  )
  const [contentType, setContentType] = useState(metadata.contentType || '')
  const [version, setVersion] = useState(metadata.version || '')

  // SEO fields
  const [seoIndex, setSeoIndex] = useState(metadata.seo?.index !== false)
  const [seoFollow, setSeoFollow] = useState(metadata.seo?.follow !== false)
  const [seoDescription, setSeoDescription] = useState(metadata.seo?.metaDescription || '')
  const [seoCanonical, setSeoCanonical] = useState(metadata.seo?.canonicalUrl || '')

  // Identity fields (slug is editable, id is read-only display)
  const [slug, setSlug] = useState(metadata.slug || '')

  // Skills - learning prerequisites separate from tags
  const [skills, setSkills] = useState<string[]>(metadata.skills || [])
  const [newSkill, setNewSkill] = useState('')

  // Publishing status
  const [publishingStatus, setPublishingStatus] = useState<'draft' | 'published' | 'archived'>(
    metadata.publishing?.status || 'published'
  )

  // See Also relationships
  const [seeAlso, setSeeAlso] = useState<string[]>(metadata.relationships?.seeAlso || [])
  const [newSeeAlso, setNewSeeAlso] = useState('')

  // Notes - curator notes field
  const [notes, setNotes] = useState<string>(
    Array.isArray(metadata.notes) ? metadata.notes.join('\n') : (metadata.notes || '')
  )

  // Reader settings
  const [illustrationMode, setIllustrationMode] = useState<'per-block' | 'persistent' | 'none'>(
    metadata.readerSettings?.illustrationMode || 'per-block'
  )

  // UI state
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'tags', 'taxonomy']))

  // Supertag notification state
  const [supertagNotification, setSupertagNotification] = useState<{
    tagName: string
    schema: SupertagSchema
  } | null>(null)

  // Publishing guide state
  const [showPublishGuide, setShowPublishGuide] = useState(false)
  const [weaverStatus, setWeaverStatus] = useState<WeaverStatus | null>(null)
  const [publishCapability, setPublishCapability] = useState<PublishCapability | null>(null)

  // Taxonomy validation state
  const [taxonomyWarnings, setTaxonomyWarnings] = useState<TaxonomyWarning[]>([])
  const [pendingValidation, setPendingValidation] = useState<{
    term: string
    level: TaxonomyLevel
  } | null>(null)
  const [skipPublishGuide, setSkipPublishGuide] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('quarry-codex-skip-publish-guide') === 'true'
  })

  // Get PAT from preferences
  const [pat, setPat] = useState<string>('')
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const prefs = localStorage.getItem('quarry-codex-preferences')
      if (prefs) {
        const parsed = JSON.parse(prefs)
        setPat(parsed.githubPAT || '')
      }
    } catch (e) {
      console.warn('[MetadataEditor] Failed to read preferences:', e)
    }
  }, [])

  // Check weaver status when PAT changes
  useEffect(() => {
    if (pat) {
      checkWeaverStatus(pat).then(status => {
        setWeaverStatus(status)
        setPublishCapability(getPublishCapability(true, status))
      })
    } else {
      setPublishCapability(getPublishCapability(false, null))
    }
  }, [pat])

  // Track changes
  const hasChanges = useMemo(() => {
    const origDifficulty = typeof metadata.difficulty === 'string'
      ? metadata.difficulty
      : (metadata.difficulty as any)?.overall || ''
    const origNotes = Array.isArray(metadata.notes) ? metadata.notes.join('\n') : (metadata.notes || '')

    return (
      title !== (metadata.title || '') ||
      summary !== (metadata.summary || '') ||
      JSON.stringify(tags) !== JSON.stringify(normalizeTags(metadata.tags)) ||
      JSON.stringify(prerequisites) !== JSON.stringify(metadata.prerequisites || metadata.relationships?.prerequisites || []) ||
      JSON.stringify(references) !== JSON.stringify(metadata.references || metadata.relationships?.references || []) ||
      JSON.stringify(subjects) !== JSON.stringify(metadata.taxonomy?.subjects || []) ||
      JSON.stringify(topics) !== JSON.stringify(metadata.taxonomy?.topics || []) ||
      difficulty !== origDifficulty ||
      contentType !== (metadata.contentType || '') ||
      version !== (metadata.version || '') ||
      seoIndex !== (metadata.seo?.index !== false) ||
      seoFollow !== (metadata.seo?.follow !== false) ||
      seoDescription !== (metadata.seo?.metaDescription || '') ||
      seoCanonical !== (metadata.seo?.canonicalUrl || '') ||
      // New fields
      slug !== (metadata.slug || '') ||
      JSON.stringify(skills) !== JSON.stringify(metadata.skills || []) ||
      publishingStatus !== (metadata.publishing?.status || 'published') ||
      JSON.stringify(seeAlso) !== JSON.stringify(metadata.relationships?.seeAlso || []) ||
      notes !== origNotes ||
      illustrationMode !== (metadata.readerSettings?.illustrationMode || 'per-block')
    )
  }, [title, summary, tags, prerequisites, references, subjects, topics, difficulty, contentType, version, seoIndex, seoFollow, seoDescription, seoCanonical, slug, skills, publishingStatus, seeAlso, notes, illustrationMode, metadata])

  // Build updated metadata object
  const buildUpdatedMetadata = useCallback((): StrandMetadata => {
    // Parse difficulty - could be a DifficultyScale string or DifficultyBreakdown object
    const parsedDifficulty = (() => {
      if (!difficulty) return undefined
      const validScales = ['beginner', 'intermediate', 'advanced'] as const
      if (validScales.includes(difficulty as typeof validScales[number])) {
        return difficulty as 'beginner' | 'intermediate' | 'advanced'
      }
      // If it's not a valid scale, treat it as an overall value in a breakdown
      return { overall: difficulty }
    })()

    const updated: StrandMetadata = {
      ...metadata,
      title: title || undefined,
      summary: summary || undefined,
      tags: tags.length > 0 ? tags : undefined,
      prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
      references: references.length > 0 ? references : undefined,
      version: version || undefined,
      contentType: contentType || undefined,
      difficulty: parsedDifficulty,
      // New fields
      slug: slug || undefined,
      skills: skills.length > 0 ? skills : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
    }

    // Include taxonomy if subjects or topics exist
    if (subjects.length > 0 || topics.length > 0) {
      updated.taxonomy = {
        subjects: subjects.length > 0 ? subjects : undefined,
        topics: topics.length > 0 ? topics : undefined,
      }
    } else if (updated.taxonomy) {
      delete updated.taxonomy
    }

    // Include relationships if prerequisites, references, or seeAlso exist
    if (prerequisites.length > 0 || references.length > 0 || seeAlso.length > 0) {
      updated.relationships = {
        ...metadata.relationships,
        prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
        references: references.length > 0 ? references : undefined,
        seeAlso: seeAlso.length > 0 ? seeAlso : undefined,
      }
    }

    // Include publishing status
    updated.publishing = {
      ...metadata.publishing,
      status: publishingStatus,
      lastUpdated: new Date().toISOString(),
    }

    // Include reader settings if not default
    if (illustrationMode !== 'per-block') {
      updated.readerSettings = {
        ...metadata.readerSettings,
        illustrationMode,
      }
    } else if (updated.readerSettings?.illustrationMode) {
      delete updated.readerSettings.illustrationMode
    }

    // Only include SEO if changed from defaults
    if (!seoIndex || !seoFollow || seoDescription || seoCanonical) {
      updated.seo = {
        ...metadata.seo,
        index: seoIndex,
        follow: seoFollow,
        metaDescription: seoDescription || undefined,
        canonicalUrl: seoCanonical || undefined,
      }
    } else {
      // Remove seo if all defaults
      delete updated.seo
    }

    return updated
  }, [metadata, title, summary, tags, prerequisites, references, subjects, topics, difficulty, contentType, version, seoIndex, seoFollow, seoDescription, seoCanonical, slug, skills, publishingStatus, seeAlso, notes, illustrationMode])

  // Live preview YAML
  const previewYaml = useMemo(() => {
    return metadataToYaml(buildUpdatedMetadata())
  }, [buildUpdatedMetadata])

  // Original YAML for comparison
  const originalYaml = useMemo(() => {
    return metadataToYaml(metadata)
  }, [metadata])

  // Reset to original values
  const handleReset = useCallback(() => {
    setTitle(metadata.title || '')
    setSummary(metadata.summary || '')
    setTags(normalizeTags(metadata.tags))
    setPrerequisites(metadata.prerequisites || metadata.relationships?.prerequisites || [])
    setReferences(metadata.references || metadata.relationships?.references || [])
    setSubjects(metadata.taxonomy?.subjects || [])
    setTopics(metadata.taxonomy?.topics || [])
    setDifficulty(typeof metadata.difficulty === 'string' ? metadata.difficulty : (metadata.difficulty as any)?.overall || '')
    setContentType(metadata.contentType || '')
    setVersion(metadata.version || '')
    setSeoIndex(metadata.seo?.index !== false)
    setSeoFollow(metadata.seo?.follow !== false)
    setSeoDescription(metadata.seo?.metaDescription || '')
    setSeoCanonical(metadata.seo?.canonicalUrl || '')
    // Reset new fields
    setSlug(metadata.slug || '')
    setSkills(metadata.skills || [])
    setPublishingStatus(metadata.publishing?.status || 'published')
    setSeeAlso(metadata.relationships?.seeAlso || [])
    setNotes(Array.isArray(metadata.notes) ? metadata.notes.join('\n') : (metadata.notes || ''))
    setIllustrationMode(metadata.readerSettings?.illustrationMode || 'per-block')
    setError(null)
  }, [metadata])

  /**
   * Validate a term against current taxonomy to check for duplicates
   * Uses the enhanced NLP similarity detection from lib/taxonomy
   */
  const validateTaxonomyTerm = useCallback((term: string, intendedLevel: TaxonomyLevel): TaxonomyWarning | null => {
    if (!term.trim()) return null

    const normalizedTerm = term.trim().toLowerCase()

    // Check against existing terms at all levels
    const allSubjects = subjects
    const allTopics = topics
    const allTags = tags

    // Use the enhanced similarity detection
    try {
      // Check each taxonomy level separately
      const subjectMatches = findSimilarTermsDetailed(
        normalizedTerm,
        allSubjects,
        DEFAULT_TAXONOMY_CONFIG
      ).map(m => ({ ...m, level: 'subject' as TaxonomyLevel }))

      const topicMatches = findSimilarTermsDetailed(
        normalizedTerm,
        allTopics,
        DEFAULT_TAXONOMY_CONFIG
      ).map(m => ({ ...m, level: 'topic' as TaxonomyLevel }))

      const tagMatches = findSimilarTermsDetailed(
        normalizedTerm,
        allTags,
        DEFAULT_TAXONOMY_CONFIG
      ).map(m => ({ ...m, level: 'tag' as TaxonomyLevel }))

      // Combine and sort by score
      const allMatches = [...subjectMatches, ...topicMatches, ...tagMatches]
        .sort((a, b) => b.score - a.score)

      // Return the most similar match if any
      if (allMatches.length > 0) {
        const best = allMatches[0]
        return {
          term: normalizedTerm,
          level: intendedLevel,
          matchedTerm: best.term,
          matchedLevel: best.level,
          score: best.score,
          method: best.method,
        }
      }
    } catch {
      // If taxonomy module not available, fall back to simple exact match
      const checkExact = (arr: string[], level: TaxonomyLevel) => {
        const found = arr.find(t => t.toLowerCase() === normalizedTerm)
        if (found) {
          return { term: normalizedTerm, level: intendedLevel, matchedTerm: found, matchedLevel: level, score: 1.0, method: 'exact' }
        }
        return null
      }

      const subjectMatch = checkExact(allSubjects, 'subject')
      if (subjectMatch) return subjectMatch

      const topicMatch = checkExact(allTopics, 'topic')
      if (topicMatch) return topicMatch

      const tagMatch = checkExact(allTags, 'tag')
      if (tagMatch) return tagMatch
    }

    return null
  }, [subjects, topics, tags])

  /**
   * Check validation when input changes and show warning
   */
  const checkAndShowWarning = useCallback((term: string, level: TaxonomyLevel) => {
    if (!term.trim()) {
      setTaxonomyWarnings(prev => prev.filter(w => w.level !== level || w.term !== term))
      return
    }

    const warning = validateTaxonomyTerm(term, level)
    if (warning && warning.score >= 0.7) {
      setTaxonomyWarnings(prev => {
        const existing = prev.findIndex(w => w.level === level)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = warning
          return updated
        }
        return [...prev, warning]
      })
    } else {
      setTaxonomyWarnings(prev => prev.filter(w => w.level !== level))
    }
  }, [validateTaxonomyTerm])

  // Handle publish button click - show guide or skip to confirm
  const handlePublishClick = useCallback(() => {
    if (!hasChanges) return

    if (skipPublishGuide) {
      // Skip guide, go straight to confirm
      setShowConfirm(true)
    } else {
      // Show the publish guide
      setShowPublishGuide(true)
    }
  }, [hasChanges, skipPublishGuide])

  // Handle guide completion
  const handlePublishProceed = useCallback(async (method: PublishCapability['method']) => {
    if (method === 'github-redirect' && filePath) {
      // Redirect to GitHub for manual PR
      window.open(buildGitHubEditUrl(filePath), '_blank')
      return
    }

    // Show confirm dialog for auto-merge or PR methods
    setShowConfirm(true)
  }, [filePath])

  // Save "don't show again" preference
  const handleDontShowAgain = useCallback(() => {
    setSkipPublishGuide(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('quarry-codex-skip-publish-guide', 'true')
    }
  }, [])

  // Publish handler - commits to repository
  const handlePublish = useCallback(async () => {
    if (!hasChanges) return

    setPublishing(true)
    setError(null)
    setShowConfirm(false)

    try {
      const updated = buildUpdatedMetadata()
      await onSave(updated)
      setPublished(true)
      setTimeout(() => setPublished(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }, [hasChanges, buildUpdatedMetadata, onSave])

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Tag management
  const addTag = useCallback(async () => {
    const trimmed = newTag.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed])
      setNewTag('')

      // Check if this is a supertag with fields
      try {
        const schema = await getSchemaByTagName(trimmed)
        if (schema && schema.fields.length > 0) {
          // Show notification about supertag fields
          setSupertagNotification({ tagName: trimmed, schema })
          // Auto-dismiss after 8 seconds
          setTimeout(() => setSupertagNotification(null), 8000)
        }
      } catch {
        // Ignore errors - just proceed without notification
      }
    }
  }, [newTag, tags])

  const removeTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
  }, [])

  // Subject management (taxonomy)
  const addSubject = useCallback(() => {
    const trimmed = newSubject.trim()
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects(prev => [...prev, trimmed])
      setNewSubject('')
    }
  }, [newSubject, subjects])

  const removeSubject = useCallback((subject: string) => {
    setSubjects(prev => prev.filter(s => s !== subject))
  }, [])

  // Topic management (taxonomy)
  const addTopic = useCallback(() => {
    const trimmed = newTopic.trim()
    if (trimmed && !topics.includes(trimmed)) {
      setTopics(prev => [...prev, trimmed])
      setNewTopic('')
    }
  }, [newTopic, topics])

  const removeTopic = useCallback((topic: string) => {
    setTopics(prev => prev.filter(t => t !== topic))
  }, [])

  // Prerequisite management
  const addPrereq = useCallback(() => {
    const trimmed = newPrereq.trim()
    if (trimmed && !prerequisites.includes(trimmed)) {
      setPrerequisites(prev => [...prev, trimmed])
      setNewPrereq('')
    }
  }, [newPrereq, prerequisites])

  const removePrereq = useCallback((prereq: string) => {
    setPrerequisites(prev => prev.filter(p => p !== prereq))
  }, [])

  // Reference management
  const addRef = useCallback(() => {
    const trimmed = newRef.trim()
    if (trimmed && !references.includes(trimmed)) {
      setReferences(prev => [...prev, trimmed])
      setNewRef('')
    }
  }, [newRef, references])

  const removeRef = useCallback((ref: string) => {
    setReferences(prev => prev.filter(r => r !== ref))
  }, [])

  // Skill management (learning prerequisites)
  const addSkill = useCallback(() => {
    const trimmed = newSkill.trim().toLowerCase()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills(prev => [...prev, trimmed])
      setNewSkill('')
    }
  }, [newSkill, skills])

  const removeSkill = useCallback((skill: string) => {
    setSkills(prev => prev.filter(s => s !== skill))
  }, [])

  // See Also management
  const addSeeAlsoItem = useCallback(() => {
    const trimmed = newSeeAlso.trim()
    if (trimmed && !seeAlso.includes(trimmed)) {
      setSeeAlso(prev => [...prev, trimmed])
      setNewSeeAlso('')
    }
  }, [newSeeAlso, seeAlso])

  const removeSeeAlsoItem = useCallback((item: string) => {
    setSeeAlso(prev => prev.filter(s => s !== item))
  }, [])

  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm transition-colors
    ${isDark
      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-cyan-500'
      : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-cyan-500'}
    focus:outline-none focus:ring-2 focus:ring-cyan-500/20`

  const labelClass = `text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`

  const sectionHeaderClass = `flex items-center gap-2 py-2.5 px-3 rounded-lg cursor-pointer transition-colors
    ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'}`

  return (
    <div className={`h-full flex flex-col ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      {/* Header with mode toggle */}
      <div className={`flex items-center justify-between px-4 py-3 border-b
        ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50/50'}`}>
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isDark ? 'bg-cyan-900/30' : 'bg-cyan-100'}`}>
            <FileText className="w-4 h-4 text-cyan-500" />
          </div>
          <div>
            <span className="font-semibold text-sm">Edit Schema</span>
            <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>YAML frontmatter</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className={`flex items-center gap-0.5 p-0.5 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <button
            onClick={() => setMode('edit')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all
              ${mode === 'edit'
                ? isDark ? 'bg-cyan-600 text-white shadow-sm' : 'bg-cyan-500 text-white shadow-sm'
                : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            <FileText className="w-3 h-3" />
            Edit
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all
              ${mode === 'preview'
                ? isDark ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-500 text-white shadow-sm'
                : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            <Code className="w-3 h-3" />
            YAML
          </button>
        </div>
      </div>

      {/* Action bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b
        ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50/50'}`}>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1
              ${isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
              <Diff className="w-3 h-3" />
              Unpublished
            </span>
          )}
          {published && (
            <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1
              ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
              <Check className="w-3 h-3" />
              Published
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Reset button */}
          {hasChanges && (
            <button
              onClick={handleReset}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors
                ${isDark
                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'}`}
              title="Reset to original"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}

          {/* Weaver status indicator */}
          {publishCapability && (
            <div className="flex items-center gap-1">
              {publishCapability.method === 'auto-merge' ? (
                <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1
                  ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}
                  title={publishCapability.helpText}
                >
                  <Users className="w-3 h-3" />
                  Weaver
                </span>
              ) : publishCapability.method === 'github-redirect' && (
                <a
                  href={getWeaversListUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 hover:opacity-80
                    ${isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'}`}
                  title="Click to learn about becoming a Weaver"
                >
                  <HelpCircle className="w-3 h-3" />
                  No PAT
                </a>
              )}
            </div>
          )}

          {/* Save Info Tooltip */}
          <MetadataTooltip
            content={`Saves to: Local Database${pat ? ' + GitHub PR' : ''}. ${pat ? 'A Pull Request will be created with your changes.' : 'Add a GitHub PAT in settings to create PRs.'}`}
            wide
          >
            <button
              type="button"
              className={`p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
              aria-label="Save information"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </MetadataTooltip>

          {/* Publish button - with detailed tooltip */}
          <button
            onClick={handlePublishClick}
            disabled={!hasChanges || publishing || isSaving}
            title={
              !hasChanges
                ? 'No changes to publish. Make edits to enable publishing.'
                : publishing || isSaving
                  ? 'Publishing your changes...'
                  : publishCapability?.method === 'github-redirect'
                    ? 'Open GitHub to create a Pull Request with your changes. This will sync your local changes to the remote repository.'
                    : 'Save changes to local database and create a GitHub Pull Request. Changes will be indexed for search after publishing.'
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${hasChanges && !publishing && !isSaving
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:from-cyan-600 hover:to-emerald-600 shadow-sm'
                : isDark
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`}
          >
            {publishing || isSaving ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : publishCapability?.method === 'github-redirect' ? (
              <ExternalLink className="w-3 h-3" />
            ) : (
              <Upload className="w-3 h-3" />
            )}
            <span>
              {publishing || isSaving
                ? 'Saving...'
                : publishCapability?.method === 'github-redirect'
                  ? 'Open GitHub'
                  : 'Save'}
            </span>
          </button>
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`px-4 py-2 flex items-center gap-2 text-sm ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}
          >
            <AlertCircle className="w-4 h-4" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PR Link Display - Shows when a PR was created */}
      <AnimatePresence>
        {saveResult?.prUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`px-4 py-2 flex items-center gap-2 text-sm ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}
          >
            <Check className="w-4 h-4" />
            <span>Pull Request created!</span>
            <a
              href={saveResult.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors
                ${isDark
                  ? 'bg-emerald-800/50 hover:bg-emerald-700/50'
                  : 'bg-emerald-200 hover:bg-emerald-300'
                }`}
            >
              <ExternalLink className="w-3 h-3" />
              View PR
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Targets Info - Shows where saves go */}
      {saveResult && saveResult.savedTo.length > 0 && !saveResult.prUrl && (
        <div className={`px-4 py-2 flex items-center gap-2 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          <Check className="w-3 h-3 text-emerald-500" />
          <span>Saved to: {saveResult.savedTo.join(', ')}</span>
        </div>
      )}

      {/* Publish confirmation modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`mx-4 p-4 rounded-xl shadow-xl max-w-sm w-full
                ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-full ${isDark ? 'bg-cyan-900/30' : 'bg-cyan-100'}`}>
                  <Upload className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Publish Changes?</h3>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    This will commit metadata changes to the repository
                  </p>
                </div>
              </div>

              {/* Changes summary */}
              <div className={`p-3 rounded-lg mb-4 text-xs font-mono overflow-auto max-h-40
                ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-50 text-zinc-700'}`}>
                <pre className="whitespace-pre-wrap">{previewYaml}</pre>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isDark
                      ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublish}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:from-cyan-600 hover:to-emerald-600 transition-all shadow-sm"
                >
                  Publish
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* ═══════════════════════════════════════════════════════════════
            PREVIEW MODE - Show YAML frontmatter
        ═══════════════════════════════════════════════════════════════ */}
        {mode === 'preview' && (
          <div className="p-4 space-y-4">
            {/* Current changes preview */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-4 h-4 text-cyan-500" />
                <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  YAML Frontmatter Preview
                </span>
                {hasChanges && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                    Modified
                  </span>
                )}
              </div>
              <div className={`p-3 rounded-lg font-mono text-xs overflow-auto
                ${isDark ? 'bg-zinc-800 text-emerald-400' : 'bg-zinc-900 text-emerald-400'}`}>
                <pre className="whitespace-pre-wrap">{previewYaml}</pre>
              </div>
            </div>

            {/* Original for comparison if changed */}
            {hasChanges && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Diff className="w-4 h-4 text-zinc-500" />
                  <span className={`text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    Original (Current)
                  </span>
                </div>
                <div className={`p-3 rounded-lg font-mono text-xs overflow-auto opacity-60
                  ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>
                  <pre className="whitespace-pre-wrap">{originalYaml}</pre>
                </div>
              </div>
            )}

            {/* Info about publishing */}
            <div className={`text-xs p-3 rounded-lg ${isDark ? 'bg-zinc-800/50 text-zinc-500' : 'bg-zinc-50 text-zinc-500'}`}>
              <p className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Click <strong>Publish</strong> to commit changes to the repository.
              </p>
              <p className="mt-1">
                Changes are <strong>not</strong> auto-saved. Review the preview before publishing.
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            EDIT MODE - Form fields
        ═══════════════════════════════════════════════════════════════ */}
        {mode === 'edit' && (
          <div className="p-4 space-y-4">

            {/* Basic Info Section */}
            <div className={`rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white'}`}>
              <button
                onClick={() => toggleSection('basic')}
                className={sectionHeaderClass}
              >
                {expandedSections.has('basic') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <BookOpen className="w-4 h-4 text-cyan-500" />
                <span className="text-sm font-semibold">Basic Info</span>
                <span
                  className={`ml-auto text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
                  title="Title and summary for this strand"
                >
                  <HelpCircle className="w-3 h-3" />
                </span>
              </button>

              <AnimatePresence>
                {expandedSections.has('basic') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3">
                      <div>
                        <label className={labelClass}>Title</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Strand title..."
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Summary</label>
                        <textarea
                          value={summary}
                          onChange={(e) => setSummary(e.target.value)}
                          placeholder="Brief description..."
                          rows={3}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tags Section */}
            <div className={`rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white'}`}>
              <button
                onClick={() => toggleSection('tags')}
                className={sectionHeaderClass}
              >
                {expandedSections.has('tags') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Tags className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold">Tags</span>
                <MetadataTooltip content={TAXONOMY_HELP.tags} wide>
                  <HelpCircle className={`w-3 h-3 ml-1 ${isDark ? 'text-zinc-500 hover:text-emerald-400' : 'text-zinc-400 hover:text-emerald-600'}`} />
                </MetadataTooltip>
                {tags.length > 0 && (
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                    {tags.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {expandedSections.has('tags') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3">
                      {/* Existing tags */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map(tag => (
                            <span
                              key={tag}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                ${isDark ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}
                            >
                              #{tag}
                              <button
                                onClick={() => removeTag(tag)}
                                className="p-0.5 hover:opacity-70 transition-opacity"
                                title="Remove tag"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {tags.length === 0 && (
                        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          No tags yet. Add tags to help categorize this strand.
                        </p>
                      )}
                      {/* Add new tag */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => {
                            setNewTag(e.target.value)
                            checkAndShowWarning(e.target.value, 'tag')
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && addTag()}
                          placeholder="Add tag..."
                          className={`${inputClass} flex-1`}
                        />
                        <button
                          onClick={addTag}
                          disabled={!newTag.trim()}
                          title="Add tag"
                          className={`p-2 rounded-lg transition-all
                            ${newTag.trim()
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                              : isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-100 text-zinc-400'}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Validation warning for tags */}
                      {taxonomyWarnings.find(w => w.level === 'tag') && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className={`p-2 rounded-lg text-xs flex items-start gap-2
                            ${isDark ? 'bg-emerald-900/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <div>
                            <strong>Similar term found:</strong>{' '}
                            "{taxonomyWarnings.find(w => w.level === 'tag')?.matchedTerm}" exists as a {taxonomyWarnings.find(w => w.level === 'tag')?.matchedLevel}
                            <span className="opacity-60 ml-1">
                              ({Math.round((taxonomyWarnings.find(w => w.level === 'tag')?.score ?? 0) * 100)}% match via {taxonomyWarnings.find(w => w.level === 'tag')?.method})
                            </span>
                          </div>
                        </motion.div>
                      )}
                      {/* Supertag notification */}
                      <AnimatePresence>
                        {supertagNotification && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`p-3 rounded-lg text-xs flex items-start gap-2.5 border
                              ${isDark
                                ? 'bg-purple-900/20 text-purple-300 border-purple-800/50'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                              }`}
                          >
                            <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-purple-500" />
                            <div className="flex-1">
                              <p className="font-medium mb-1">
                                #{supertagNotification.tagName} is a Supertag
                              </p>
                              <p className="opacity-80 mb-2">
                                This tag has {supertagNotification.schema.fields.length} additional field{supertagNotification.schema.fields.length !== 1 ? 's' : ''} you can fill in.
                                Open the Supertags panel in the sidebar to add structured metadata.
                              </p>
                              <div className="flex flex-wrap gap-1 text-[10px]">
                                {supertagNotification.schema.fields.slice(0, 4).map(field => (
                                  <span
                                    key={field.name}
                                    className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-purple-800/50' : 'bg-purple-100'}`}
                                  >
                                    {field.label}
                                    {field.required && <span className="text-red-400 ml-0.5">*</span>}
                                  </span>
                                ))}
                                {supertagNotification.schema.fields.length > 4 && (
                                  <span className="opacity-60">
                                    +{supertagNotification.schema.fields.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => setSupertagNotification(null)}
                              className="p-1 hover:opacity-70 transition-opacity shrink-0"
                              title="Dismiss"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Taxonomy Section (Subjects & Topics) */}
            <div className={`rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white'}`}>
              <button
                onClick={() => toggleSection('taxonomy')}
                className={sectionHeaderClass}
              >
                {expandedSections.has('taxonomy') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Layers className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold">Taxonomy</span>
                {(subjects.length + topics.length) > 0 && (
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                    {subjects.length + topics.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {expandedSections.has('taxonomy') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-4">
                      {/* Subjects - high-level classification */}
                      <div>
                        <label className={labelClass}>
                          Subjects
                          <MetadataTooltip content={TAXONOMY_HELP.subjects} wide>
                            <HelpCircle className={`w-3 h-3 ml-1 ${isDark ? 'text-zinc-500 hover:text-amber-400' : 'text-zinc-400 hover:text-amber-600'}`} />
                          </MetadataTooltip>
                          {subjects.length >= 2 && (
                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                              {subjects.length}/2 recommended
                            </span>
                          )}
                        </label>
                        {subjects.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {subjects.map(subject => (
                              <span
                                key={subject}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                  ${isDark ? 'bg-amber-900/30 text-amber-400 border border-amber-800' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}
                              >
                                {subject}
                                <button
                                  onClick={() => removeSubject(subject)}
                                  className="p-0.5 hover:opacity-70 transition-opacity"
                                  title="Remove subject"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {subjects.length === 0 && (
                          <p className={`text-xs mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            No subjects. Add broad subject areas for this strand.
                          </p>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSubject}
                            onChange={(e) => {
                              setNewSubject(e.target.value)
                              checkAndShowWarning(e.target.value, 'subject')
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && addSubject()}
                            placeholder="e.g., Computer Science"
                            className={`${inputClass} flex-1`}
                          />
                          <button
                            onClick={addSubject}
                            disabled={!newSubject.trim()}
                            title="Add subject"
                            className={`p-2 rounded-lg transition-all
                              ${newSubject.trim()
                                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                                : isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-100 text-zinc-400'}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Validation warning for subjects */}
                        {taxonomyWarnings.find(w => w.level === 'subject') && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-2
                              ${isDark ? 'bg-amber-900/20 text-amber-300' : 'bg-amber-50 text-amber-700'}`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <div>
                              <strong>Similar term found:</strong>{' '}
                              "{taxonomyWarnings.find(w => w.level === 'subject')?.matchedTerm}" exists as a {taxonomyWarnings.find(w => w.level === 'subject')?.matchedLevel}
                              <span className="opacity-60 ml-1">
                                ({Math.round((taxonomyWarnings.find(w => w.level === 'subject')?.score ?? 0) * 100)}% match via {taxonomyWarnings.find(w => w.level === 'subject')?.method})
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Topics - more specific classification */}
                      <div>
                        <label className={labelClass}>
                          Topics
                          <MetadataTooltip content={TAXONOMY_HELP.topics} wide>
                            <HelpCircle className={`w-3 h-3 ml-1 ${isDark ? 'text-zinc-500 hover:text-sky-400' : 'text-zinc-400 hover:text-sky-600'}`} />
                          </MetadataTooltip>
                          {topics.length >= 5 && (
                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-sky-900/30 text-sky-400' : 'bg-sky-100 text-sky-700'}`}>
                              {topics.length}/5 recommended
                            </span>
                          )}
                        </label>
                        {topics.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {topics.map(topic => (
                              <span
                                key={topic}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                  ${isDark ? 'bg-sky-900/30 text-sky-400 border border-sky-800' : 'bg-sky-100 text-sky-700 border border-sky-200'}`}
                              >
                                {topic}
                                <button
                                  onClick={() => removeTopic(topic)}
                                  className="p-0.5 hover:opacity-70 transition-opacity"
                                  title="Remove topic"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {topics.length === 0 && (
                          <p className={`text-xs mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            No topics. Add specific topics within the subject area.
                          </p>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTopic}
                            onChange={(e) => {
                              setNewTopic(e.target.value)
                              checkAndShowWarning(e.target.value, 'topic')
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                            placeholder="e.g., Natural Language Processing"
                            className={`${inputClass} flex-1`}
                          />
                          <button
                            onClick={addTopic}
                            disabled={!newTopic.trim()}
                            title="Add topic"
                            className={`p-2 rounded-lg transition-all
                              ${newTopic.trim()
                                ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-sm'
                                : isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-100 text-zinc-400'}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Validation warning for topics */}
                        {taxonomyWarnings.find(w => w.level === 'topic') && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-2
                              ${isDark ? 'bg-sky-900/20 text-sky-300' : 'bg-sky-50 text-sky-700'}`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <div>
                              <strong>Similar term found:</strong>{' '}
                              "{taxonomyWarnings.find(w => w.level === 'topic')?.matchedTerm}" exists as a {taxonomyWarnings.find(w => w.level === 'topic')?.matchedLevel}
                              <span className="opacity-60 ml-1">
                                ({Math.round((taxonomyWarnings.find(w => w.level === 'topic')?.score ?? 0) * 100)}% match via {taxonomyWarnings.find(w => w.level === 'topic')?.method})
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Relations Section */}
            <div className={`rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white'}`}>
              <button
                onClick={() => toggleSection('relations')}
                className={sectionHeaderClass}
              >
                {expandedSections.has('relations') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Link2 className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold">Relations</span>
                {(prerequisites.length + references.length) > 0 && (
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                    {prerequisites.length + references.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {expandedSections.has('relations') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-4">
                      {/* Prerequisites */}
                      <div>
                        <label className={labelClass}>
                          Prerequisites
                          <span
                            className={`ml-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
                            title="Strands that should be read before this one"
                          >
                            <HelpCircle className="w-3 h-3" />
                          </span>
                        </label>
                        {prerequisites.length > 0 && (
                          <div className="space-y-1.5 mb-2">
                            {prerequisites.map(prereq => (
                              <div
                                key={prereq}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border
                                  ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                              >
                                <span className="truncate font-mono text-xs">{prereq}</span>
                                <button
                                  onClick={() => removePrereq(prereq)}
                                  className="p-1 hover:opacity-70 text-red-500"
                                  title="Remove prerequisite"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {prerequisites.length === 0 && (
                          <p className={`text-xs mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            No prerequisites. Add paths to strands that should be read first.
                          </p>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newPrereq}
                            onChange={(e) => setNewPrereq(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addPrereq()}
                            placeholder="weaves/topic/strand.md"
                            className={`${inputClass} flex-1 font-mono text-xs`}
                          />
                          <button
                            onClick={addPrereq}
                            disabled={!newPrereq.trim()}
                            title="Add prerequisite"
                            className={`p-2 rounded-lg transition-all
                              ${newPrereq.trim()
                                ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                                : isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-100 text-zinc-400'}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* References */}
                      <div>
                        <label className={labelClass}>
                          References
                          <span
                            className={`ml-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
                            title="Related strands or external URLs for further reading"
                          >
                            <HelpCircle className="w-3 h-3" />
                          </span>
                        </label>
                        {references.length > 0 && (
                          <div className="space-y-1.5 mb-2">
                            {references.map(ref => (
                              <div
                                key={ref}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border
                                  ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                              >
                                <span className="truncate font-mono text-xs">{ref}</span>
                                <button
                                  onClick={() => removeRef(ref)}
                                  className="p-1 hover:opacity-70 text-red-500"
                                  title="Remove reference"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {references.length === 0 && (
                          <p className={`text-xs mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            No references. Add related strands or external URLs.
                          </p>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newRef}
                            onChange={(e) => setNewRef(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addRef()}
                            placeholder="weaves/topic/strand.md or https://..."
                            className={`${inputClass} flex-1 font-mono text-xs`}
                          />
                          <button
                            onClick={addRef}
                            disabled={!newRef.trim()}
                            title="Add reference"
                            className={`p-2 rounded-lg transition-all
                              ${newRef.trim()
                                ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                                : isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-100 text-zinc-400'}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* See Also */}
                      <div>
                        <label className={labelClass}>
                          See Also
                          <span
                            className={`ml-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
                            title="Related strands for further exploration (non-prerequisite)"
                          >
                            <HelpCircle className="w-3 h-3" />
                          </span>
                        </label>
                        {seeAlso.length > 0 && (
                          <div className="space-y-1.5 mb-2">
                            {seeAlso.map(item => (
                              <div
                                key={item}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border
                                  ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                              >
                                <span className="truncate font-mono text-xs">{item}</span>
                                <button
                                  onClick={() => removeSeeAlsoItem(item)}
                                  className="p-1 hover:opacity-70 text-red-500"
                                  title="Remove see also"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {seeAlso.length === 0 && (
                          <p className={`text-xs mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            No related strands. Add paths to related content.
                          </p>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSeeAlso}
                            onChange={(e) => setNewSeeAlso(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addSeeAlsoItem()}
                            placeholder="weaves/topic/related-strand.md"
                            className={`${inputClass} flex-1 font-mono text-xs`}
                          />
                          <button
                            onClick={addSeeAlsoItem}
                            disabled={!newSeeAlso.trim()}
                            title="Add see also"
                            className={`p-2 rounded-lg transition-all
                              ${newSeeAlso.trim()
                                ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                                : isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-100 text-zinc-400'}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SEO Section */}
            <div className={`rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white'}`}>
              <button
                onClick={() => toggleSection('seo')}
                className={sectionHeaderClass}
              >
                {expandedSections.has('seo') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Globe className="w-4 h-4 text-sky-500" />
                <span className="text-sm font-semibold">SEO & Indexing</span>
                <MetadataTooltip content="Control how this strand appears in search engines like Google and AI systems like ChatGPT. These settings affect discoverability." wide>
                  <HelpCircle className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                </MetadataTooltip>
                {!seoIndex && (
                  <span title="Private - Not indexed"><Lock className="w-3 h-3 ml-auto text-amber-500" /></span>
                )}
              </button>

              <AnimatePresence>
                {expandedSections.has('seo') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3">
                      {/* Index toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {seoIndex ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-amber-500" />}
                          <span className="text-sm">Allow search engines to index</span>
                          <MetadataTooltip content="When OFF, adds 'noindex' meta tag. This strand won't appear in Google, Bing, or AI search results. Use for private/draft content." wide>
                            <HelpCircle className={`w-3 h-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                          </MetadataTooltip>
                        </div>
                        <button
                          onClick={() => setSeoIndex(!seoIndex)}
                          className={`relative w-10 h-5 rounded-full transition-colors
                            ${seoIndex
                              ? 'bg-green-500'
                              : isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
                            ${seoIndex ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>

                      {/* Follow toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Link2 className={`w-4 h-4 ${seoFollow ? 'text-green-500' : 'text-amber-500'}`} />
                          <span className="text-sm">Allow crawlers to follow links</span>
                          <MetadataTooltip content="When OFF, adds 'nofollow' meta tag. Search engines won't crawl links in this strand. Keep ON unless linking to untrusted content." wide>
                            <HelpCircle className={`w-3 h-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                          </MetadataTooltip>
                        </div>
                        <button
                          onClick={() => setSeoFollow(!seoFollow)}
                          className={`relative w-10 h-5 rounded-full transition-colors
                            ${seoFollow
                              ? 'bg-green-500'
                              : isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
                            ${seoFollow ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>

                      {/* Meta description */}
                      <div>
                        <label className={labelClass}>
                          Meta Description
                          <MetadataTooltip content="Custom description shown in search results. Keep under 160 characters. If empty, the strand summary is used instead." wide>
                            <HelpCircle className={`w-3 h-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                          </MetadataTooltip>
                        </label>
                        <textarea
                          value={seoDescription}
                          onChange={(e) => setSeoDescription(e.target.value)}
                          placeholder="Custom SEO description (leave empty to use summary)"
                          rows={2}
                          className={inputClass}
                        />
                        <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          {seoDescription.length}/160 characters
                        </p>
                      </div>

                      {/* Canonical URL */}
                      <div>
                        <label className={labelClass}>
                          Canonical URL
                          <MetadataTooltip content="Use when this content exists at multiple URLs. Points search engines to the 'main' version to avoid duplicate content penalties." wide>
                            <HelpCircle className={`w-3 h-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                          </MetadataTooltip>
                        </label>
                        <input
                          type="url"
                          value={seoCanonical}
                          onChange={(e) => setSeoCanonical(e.target.value)}
                          placeholder="https://frame.dev/quarry/..."
                          className={inputClass}
                        />
                        <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          Leave empty to use the default URL
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Identity Section (slug) */}
            <div className={`rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white'}`}>
              <button
                onClick={() => toggleSection('identity')}
                className={sectionHeaderClass}
              >
                {expandedSections.has('identity') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Hash className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-semibold">Identity</span>
              </button>

              <AnimatePresence>
                {expandedSections.has('identity') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3">
                      {/* ID - read only */}
                      {metadata.id && (
                        <div>
                          <label className={labelClass}>ID (auto-generated)</label>
                          <div className={`px-3 py-2 rounded-lg text-xs font-mono truncate
                            ${isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                            {metadata.id}
                          </div>
                        </div>
                      )}
                      {/* Slug */}
                      <div>
                        <label className={labelClass}>
                          Slug
                          <span className={`ml-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} title="URL-friendly identifier">
                            <HelpCircle className="w-3 h-3" />
                          </span>
                        </label>
                        <input
                          type="text"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                          placeholder={title ? title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'url-friendly-slug'}
                          className={inputClass}
                        />
                        <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          Used in URLs. Auto-suggests from title.
                        </p>
                      </div>
                      {/* Version */}
                      <div>
                        <label className={labelClass}>Version</label>
                        <input
                          type="text"
                          value={version}
                          onChange={(e) => setVersion(e.target.value)}
                          placeholder="1.0.0"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Skills Section - Learning Prerequisites */}
            <div className={`rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white'}`}>
              <button
                onClick={() => toggleSection('skills')}
                className={sectionHeaderClass}
              >
                {expandedSections.has('skills') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Zap className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold">Skills</span>
                <span className={`ml-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} title="Learning prerequisites - what readers need to know">
                  <HelpCircle className="w-3 h-3" />
                </span>
                {skills.length > 0 && (
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                    {skills.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {expandedSections.has('skills') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3">
                      <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Skills readers should have before reading this strand. Used for spiral learning paths.
                      </p>
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {skills.map(skill => (
                            <span
                              key={skill}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                                ${isDark ? 'bg-purple-900/30 text-purple-400 border border-purple-800' : 'bg-purple-100 text-purple-700 border border-purple-200'}`}
                            >
                              {skill}
                              <button
                                onClick={() => removeSkill(skill)}
                                className="p-0.5 hover:opacity-70 transition-opacity"
                                title="Remove skill"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                          placeholder="e.g., typescript, react-hooks"
                          className={`${inputClass} flex-1`}
                        />
                        <button
                          onClick={addSkill}
                          disabled={!newSkill.trim()}
                          title="Add skill"
                          className={`p-2 rounded-lg transition-all
                            ${newSkill.trim()
                              ? 'bg-purple-500 text-white hover:bg-purple-600 shadow-sm'
                              : isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-100 text-zinc-400'}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Publishing Status Section */}
            <div className={`rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white'}`}>
              <button
                onClick={() => toggleSection('publishing')}
                className={sectionHeaderClass}
              >
                {expandedSections.has('publishing') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <FileCheck className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold">Publishing</span>
                <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-medium
                  ${publishingStatus === 'published'
                    ? isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                    : publishingStatus === 'draft'
                      ? isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
                      : isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-600'}`}>
                  {publishingStatus}
                </span>
              </button>

              <AnimatePresence>
                {expandedSections.has('publishing') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3">
                      <div>
                        <label className={labelClass}>Status</label>
                        <select
                          value={publishingStatus}
                          onChange={(e) => setPublishingStatus(e.target.value as 'draft' | 'published' | 'archived')}
                          className={inputClass}
                        >
                          <option value="draft">Draft - Not visible publicly</option>
                          <option value="published">Published - Visible to all</option>
                          <option value="archived">Archived - Hidden but preserved</option>
                        </select>
                      </div>
                      {metadata.publishing?.lastUpdated && (
                        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          Last updated: {new Date(metadata.publishing.lastUpdated).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notes Section */}
            <div className={`rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white'}`}>
              <button
                onClick={() => toggleSection('notes')}
                className={sectionHeaderClass}
              >
                {expandedSections.has('notes') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <MessageSquare className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold">Notes</span>
                {notes.trim() && (
                  <span className={`ml-auto text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {notes.split('\n').length} lines
                  </span>
                )}
              </button>

              <AnimatePresence>
                {expandedSections.has('notes') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3">
                      <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Curator notes - internal documentation about this strand
                      </p>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this strand (not shown to readers)..."
                        rows={4}
                        className={inputClass}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Reader Settings Section (Advanced) */}
            <div className={`rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white'}`}>
              <button
                onClick={() => toggleSection('readerSettings')}
                className={sectionHeaderClass}
              >
                {expandedSections.has('readerSettings') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Settings className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-semibold">Reader Settings</span>
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}`}>
                  Advanced
                </span>
              </button>

              <AnimatePresence>
                {expandedSections.has('readerSettings') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3">
                      <div>
                        <label className={labelClass}>
                          <Image className="w-3 h-3" />
                          Illustration Mode
                        </label>
                        <select
                          value={illustrationMode}
                          onChange={(e) => setIllustrationMode(e.target.value as 'per-block' | 'persistent' | 'none')}
                          className={inputClass}
                        >
                          <option value="per-block">Per Block - Show illustration for each section</option>
                          <option value="persistent">Persistent - Keep one illustration visible</option>
                          <option value="none">None - Hide all illustrations</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Help text */}
            <div className={`text-xs p-3 rounded-lg ${isDark ? 'bg-zinc-800/50 text-zinc-500' : 'bg-zinc-50 text-zinc-500'}`}>
              <p className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Switch to <strong>Preview</strong> to see YAML output
              </p>
              <p className="mt-1">
                Changes require explicit <strong>Publish</strong> to save. No auto-save.
              </p>
              {publishCapability && (
                <p className="mt-1 flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  {publishCapability.method === 'auto-merge'
                    ? 'You are an approved Weaver - changes auto-merge'
                    : publishCapability.method === 'pr'
                      ? 'Your changes will create a Pull Request'
                      : 'No GitHub token - will redirect to GitHub'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Publish Guide Modal */}
      <PublishGuideModal
        isOpen={showPublishGuide}
        onClose={() => setShowPublishGuide(false)}
        onProceed={handlePublishProceed}
        filePath={filePath}
        hasPAT={!!pat}
        pat={pat}
        theme={theme}
        onDontShowAgain={handleDontShowAgain}
        dontShowAgain={skipPublishGuide}
      />
    </div>
  )
}