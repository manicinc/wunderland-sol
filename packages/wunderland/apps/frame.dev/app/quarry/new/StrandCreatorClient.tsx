/**
 * Strand Creator Client - Full-featured strand creation wizard
 * @module codex/new/StrandCreatorClient
 *
 * @description
 * Tabbed interface for creating new strands with:
 * - Direct text input with live preview
 * - File upload (markdown, text)
 * - URL scraping with content extraction
 * - Auto-tagging and categorization from NLP
 * - Split editor/preview mode
 * - Mobile responsive
 */

'use client'

console.log('[StrandCreatorClient] ============================================')
console.log('[StrandCreatorClient] MODULE LOADING START', Date.now())
console.log('[StrandCreatorClient] ============================================')

// Detect static export mode (defined at build time by webpack)
declare const __IS_STATIC_EXPORT__: boolean | undefined
const isStaticExport = typeof __IS_STATIC_EXPORT__ !== 'undefined' && __IS_STATIC_EXPORT__

console.log('[StrandCreatorClient] isStaticExport:', isStaticExport, Date.now())

console.log('[StrandCreatorClient] About to import React...', Date.now())
import React, { useState, useCallback, useMemo, useRef, useEffect, memo, Suspense } from 'react'
console.log('[StrandCreatorClient] React imported', Date.now())
import dynamic from 'next/dynamic'
console.log('[StrandCreatorClient] dynamic imported', Date.now())
import { useRouter, useSearchParams } from 'next/navigation'
console.log('[StrandCreatorClient] next/navigation imported', Date.now())
import { motion, AnimatePresence } from 'framer-motion'
console.log('[StrandCreatorClient] framer-motion imported', Date.now())
import ReactMarkdown from 'react-markdown'
console.log('[StrandCreatorClient] react-markdown imported', Date.now())
import remarkGfm from 'remark-gfm'
console.log('[StrandCreatorClient] remarkGfm imported', Date.now())
import rehypeRaw from 'rehype-raw'
console.log('[StrandCreatorClient] rehypeRaw imported', Date.now())

// Simple code block without syntax highlighting to avoid React hooks issues
// react-syntax-highlighter causes hydration errors, so we use plain pre/code
const CodeBlock = memo(function CodeBlock({ inline, className, children }: any) {
  const match = /language-(\w+)/.exec(className || '')

  if (!inline && match) {
    return (
      <pre
        style={{
          margin: 0,
          padding: '1rem',
          background: '#1e1e1e',
          borderRadius: '0.5rem',
          overflow: 'auto',
        }}
      >
        <code className={className}>
          {String(children).replace(/\n$/, '')}
        </code>
      </pre>
    )
  }

  // Inline code with padding
  return (
    <code className={`${className || ''} px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-sm`}>
      {children}
    </code>
  )
})

// Memoized ReactMarkdown preview to prevent unnecessary re-renders
const MemoizedMarkdownPreview = memo(function MemoizedMarkdownPreview({ 
  content, 
  isDark 
}: { 
  content: string
  isDark: boolean 
}) {
  if (!content) {
    return (
      <div className={`text-center py-12 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Start writing to see preview</p>
      </div>
    )
  }
  
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        code: CodeBlock as any,
      }}
    >
      {content}
    </ReactMarkdown>
  )
})

console.log('[StrandCreatorClient] CodeBlock and MemoizedMarkdownPreview defined', Date.now())

import {
  ArrowLeft,
  FileText,
  Upload,
  Link2,
  Sparkles,
  Eye,
  Edit3,
  SplitSquareVertical,
  Tag,
  Folder,
  GitBranch,
  Check,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
  Download,
  Copy,
  Globe,
  BookOpen,
  Layers,
  ChevronDown,
  ChevronRight,
  Wand2,
  Brain,
  Hash,
  HelpCircle,
  Inbox,
  GitMerge,
  FolderInput,
  FileText as FileTextIcon,
  BarChart3,
  Clock,
  Code,
  FileSignature,
  Tags as TagsIcon,
  ListTree,
  Settings,
  ExternalLink,
  Lightbulb,
  Shuffle,
  Plus,
  Save,
  PenTool,
  Copyright,
  StickyNote,
} from 'lucide-react'
console.log('[StrandCreatorClient] lucide-react icons imported', Date.now())
import Link from 'next/link'
console.log('[StrandCreatorClient] next/link imported', Date.now())
import { useTheme } from 'next-themes'
console.log('[StrandCreatorClient] next-themes imported', Date.now())
import { StrandTemplate, CATEGORY_CONFIG } from './StrandTemplateLibrary'
console.log('[StrandCreatorClient] StrandTemplateLibrary imported', Date.now())
import { getTemplateById } from '@/components/quarry/templates/templateService'
console.log('[StrandCreatorClient] templateService imported', Date.now())

// Dynamic import TiptapEditor to prevent main thread blocking on page load
// TipTap extensions + lowlight syntax highlighting are heavy (~500KB+ JS)
console.log('[StrandCreatorClient] Setting up TiptapEditor dynamic import...', Date.now())
const TiptapEditor = dynamic(() => import('@/components/quarry/ui/tiptap/TiptapEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center p-8 min-h-[400px]">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-zinc-500">Loading editor...</p>
      </div>
    </div>
  ),
})
console.log('[StrandCreatorClient] TiptapEditor dynamic import registered', Date.now())

import { type SourceMetadata, createDefaultSourceMetadata } from '@/types/sourceMetadata'
console.log('[StrandCreatorClient] sourceMetadata imported', Date.now())
import { type StrandLicense, DEFAULT_LICENSE, formatLicenseForFrontmatter } from '@/lib/strand/licenseTypes'
console.log('[StrandCreatorClient] licenseTypes imported', Date.now())
import { detectLicense, type LicenseDetectionResult } from '@/lib/strand/licenseDetector'
console.log('[StrandCreatorClient] licenseDetector imported', Date.now())
import { LicensePicker, LicenseBadge } from '@/components/quarry/ui/settings/LicensePicker'
console.log('[StrandCreatorClient] LicensePicker imported', Date.now())
import { getPreferences } from '@/lib/localStorage'
console.log('[StrandCreatorClient] localStorage imported', Date.now())
import { getUserSession, getGitIdentity, updateCreatorInfo } from '@/lib/userSession'
console.log('[StrandCreatorClient] userSession imported', Date.now())
import { saveDraft } from '@/lib/codexDatabase'
console.log('[StrandCreatorClient] codexDatabase imported', Date.now())
import { saveDraft as saveLocalDraft } from '@/lib/localStorage'
console.log('[StrandCreatorClient] localStorage saveLocalDraft imported', Date.now())
import PromptPicker from '@/components/quarry/ui/prompts/PromptPicker'
console.log('[StrandCreatorClient] PromptPicker imported', Date.now())
import { WRITING_PROMPTS, type WritingPrompt } from '@/lib/codex/prompts'
console.log('[StrandCreatorClient] prompts imported', Date.now())
import { getPromptManager } from '@/lib/prompts'
console.log('[StrandCreatorClient] getPromptManager imported', Date.now())

console.log('[StrandCreatorClient] All static imports done, setting up dynamic imports...', Date.now())

// Dynamic import heavy components with ssr: false for consistent behavior in static export
const LocationPickerSidebar = dynamic(() => import('@/components/quarry/ui/misc/LocationPickerSidebar'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
})
console.log('[StrandCreatorClient] LocationPickerSidebar dynamic registered', Date.now())

// Lazy-load scraping to avoid bundling heavy DOM parsing
let scrapeModule: typeof import('@/lib/scrape') | null = null
async function loadScrape() {
  if (!scrapeModule) {
    scrapeModule = await import('@/lib/scrape')
  }
  return scrapeModule
}
console.log('[StrandCreatorClient] loadScrape function defined', Date.now())

// Dynamic imports for heavy components not needed on initial render
const InlineCanvas = dynamic(() => import('@/components/quarry/ui/inline-editor/InlineCanvas'), { ssr: false })
const StrandTemplateLibrary = dynamic(() => import('./StrandTemplateLibrary').then(m => m.default), { ssr: false })
const TemplatePickerModal = dynamic(() => import('@/components/quarry/templates/TemplatePickerModal'), { ssr: false })
console.log('[StrandCreatorClient] InlineCanvas/StrandTemplateLibrary/TemplatePickerModal dynamic registered', Date.now())

// Lazy-load NLP functions to avoid blocking initial render
let nlpModule: typeof import('@/lib/nlp') | null = null
async function loadNLP() {
  if (!nlpModule) {
    nlpModule = await import('@/lib/nlp')
  }
  return nlpModule
}
console.log('[StrandCreatorClient] loadNLP function defined', Date.now())

console.log('[StrandCreatorClient] Module-level code executing...', Date.now())

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

type ViewMode = 'edit' | 'preview' | 'split'
type InputMode = 'template' | 'write' | 'upload' | 'url' | 'prompt' | 'canvas' | 'supernote'

interface ExtractedMetadata {
  title?: string
  summary?: string
  tags: string[]
  topics: string[]
  subjects: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  entities: {
    technologies: string[]
    concepts: string[]
    people: string[]
    organizations: string[]
    locations: string[]
    [key: string]: string[]
  }
  keywords: string[]
  wordCount: number
  readingTime: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

interface FrontmatterOptions {
  meta: ExtractedMetadata
  source?: SourceMetadata
  license?: StrandLicense
  licenseText?: string
  licenseUrl?: string
  licenseDetectedFrom?: 'manual' | 'file' | 'scrape' | 'research' | 'inferred'
}

function generateFrontmatter(options: FrontmatterOptions): string
function generateFrontmatter(meta: ExtractedMetadata, source?: SourceMetadata): string
function generateFrontmatter(
  metaOrOptions: ExtractedMetadata | FrontmatterOptions,
  source?: SourceMetadata
): string {
  // Handle both old and new function signatures
  const options: FrontmatterOptions = 'meta' in metaOrOptions
    ? metaOrOptions
    : { meta: metaOrOptions, source }

  const { meta, license, licenseText, licenseUrl, licenseDetectedFrom } = options
  const sourceData = options.source

  const lines: string[] = ['---']

  if (meta.title) lines.push(`title: "${meta.title}"`)
  if (meta.summary) lines.push(`summary: "${meta.summary}"`)
  if (meta.difficulty) lines.push(`difficulty: ${meta.difficulty}`)

  if (meta.tags.length > 0) {
    lines.push('tags:')
    meta.tags.forEach(t => lines.push(`  - ${t}`))
  }

  lines.push('taxonomy:')
  if (meta.topics.length > 0) {
    lines.push('  topics:')
    meta.topics.forEach(t => lines.push(`    - ${t}`))
  }
  if (meta.subjects.length > 0) {
    lines.push('  subjects:')
    meta.subjects.forEach(s => lines.push(`    - ${s}`))
  }

  // Add license
  if (license && license !== 'none') {
    lines.push(`license: ${formatLicenseForFrontmatter(license)}`)
    if (license === 'custom' && licenseText) {
      lines.push(`licenseText: |`)
      licenseText.split('\n').forEach(line => lines.push(`  ${line}`))
    }
    if (licenseUrl) {
      lines.push(`licenseUrl: "${licenseUrl}"`)
    }
    if (licenseDetectedFrom) {
      lines.push(`licenseDetectedFrom: ${licenseDetectedFrom}`)
    }
  }

  // Add source metadata
  if (sourceData) {
    lines.push('source:')
    lines.push(`  type: ${sourceData.sourceType}`)
    lines.push(`  creator: "${sourceData.creator}"`)
    lines.push(`  creatorType: ${sourceData.creatorType}`)
    if (sourceData.sourceUrl) lines.push(`  url: "${sourceData.sourceUrl}"`)
    if (sourceData.sourceFilename) lines.push(`  filename: "${sourceData.sourceFilename}"`)
    if (sourceData.sourceTemplateId) lines.push(`  templateId: "${sourceData.sourceTemplateId}"`)
    lines.push(`  createdAt: "${sourceData.createdAt}"`)
    if (sourceData.uploadedAt) lines.push(`  uploadedAt: "${sourceData.uploadedAt}"`)
    if (sourceData.uploader) lines.push(`  uploader: "${sourceData.uploader}"`)
    if (sourceData.sessionId) lines.push(`  sessionId: "${sourceData.sessionId}"`)
  }

  lines.push('---')
  lines.push('')

  return lines.join('\n')
}

function inferDifficulty(content: string): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  const lower = content.toLowerCase()
  const expertTerms = ['optimization', 'algorithm', 'architecture', 'internal', 'advanced', 'expert']
  const advancedTerms = ['complex', 'pattern', 'best practice', 'performance', 'scale']
  const beginnerTerms = ['introduction', 'getting started', 'basic', 'simple', 'tutorial', 'beginner']
  
  let score = 0
  expertTerms.forEach(t => { if (lower.includes(t)) score += 2 })
  advancedTerms.forEach(t => { if (lower.includes(t)) score += 1 })
  beginnerTerms.forEach(t => { if (lower.includes(t)) score -= 1 })
  
  if (score >= 4) return 'expert'
  if (score >= 2) return 'advanced'
  if (score <= -1) return 'beginner'
  return 'intermediate'
}

console.log('[StrandCreatorClient] Helper functions defined', Date.now())

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING FALLBACK
═══════════════════════════════════════════════════════════════════════════ */

function StrandCreatorLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-600 dark:text-zinc-400">Loading creator...</p>
      </div>
    </div>
  )
}

console.log('[StrandCreatorClient] StrandCreatorLoading defined', Date.now())

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

console.log('[StrandCreatorClient] About to define StrandCreatorContent...', Date.now())

function StrandCreatorContent() {
  console.log('[StrandCreatorContent] RENDER START', Date.now())
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme } = useTheme()
  const isDark = theme?.includes('dark')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Core state
  const [inputMode, setInputMode] = useState<InputMode>('write')
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [content, setContent] = useState('')
  const [fileName, setFileName] = useState('new-strand.md')
  const [targetPath, setTargetPath] = useState('weaves/inbox/')
  const [selectedTemplate, setSelectedTemplate] = useState<StrandTemplate | null>(null)
  
  // Prompt state
  const [selectedPrompt, setSelectedPrompt] = useState<WritingPrompt | null>(null)
  const [showPromptPicker, setShowPromptPicker] = useState(false)

  // Location picker modal
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  // Template picker modal (for browsing all templates including remote)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  
  // URL scraping
  const [urlInput, setUrlInput] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [scrapeMethod, setScrapeMethod] = useState<'server' | 'client-pdf' | 'client-html' | 'fallback' | null>(null)
  const [showCapabilities, setShowCapabilities] = useState(false)
  
  // Metadata extraction
  const [extractedMeta, setExtractedMeta] = useState<ExtractedMetadata | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [customTags, setCustomTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>(['note'])
  const [newTag, setNewTag] = useState('')
  
  // Auto-tagging configuration
  const [autoTagConfig, setAutoTagConfig] = useState({
    documentAutoTag: true,
    blockAutoTag: true,
    useLLM: false,
    preferExistingTags: true,
    maxNewTagsPerBlock: 3,
    maxNewTagsPerDocument: 10,
  })
  
  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showAutoTagSettings, setShowAutoTagSettings] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editorMode, setEditorMode] = useState<'wysiwyg' | 'markdown'>('wysiwyg')
  const [saving, setSaving] = useState(false)
  const [localStrandId, setLocalStrandId] = useState<string | null>(null)

  // Canvas state
  const [canvasSvg, setCanvasSvg] = useState<string | null>(null)

  // Metadata section expansion state
  const [expandedMetaSections, setExpandedMetaSections] = useState({
    docInfo: false,
    classification: true,
    analysis: false,
    publishing: true,
  })
  
  // Visualization generation settings (defaulted to off)
  const [vizConfig, setVizConfig] = useState({
    enabled: false,
    preset: 'none' as 'none' | 'mindmap' | 'flowchart' | 'timeline' | 'hierarchy' | 'network',
  })
  const [showVizInfo, setShowVizInfo] = useState(false)

  // Source metadata tracking
  const [sourceMetadata, setSourceMetadata] = useState<SourceMetadata>({
    sourceType: 'manual',
    createdAt: new Date().toISOString(),
    creator: 'Unknown',
    creatorType: 'session',
  })
  const [showSourceEdit, setShowSourceEdit] = useState(false)

  // License tracking - use preferences for defaults
  const licensePrefs = typeof window !== 'undefined' ? getPreferences() : null
  const [selectedLicense, setSelectedLicense] = useState<StrandLicense>(
    () => licensePrefs?.defaultLicense ?? DEFAULT_LICENSE
  )
  const [detectedLicense, setDetectedLicense] = useState<LicenseDetectionResult | null>(null)
  const [customLicenseText, setCustomLicenseText] = useState<string>('')
  const [showLicenseEdit, setShowLicenseEdit] = useState(false)
  const autoDetectLicenseEnabled = licensePrefs?.autoDetectLicense ?? true
  const showLicenseOnCreate = licensePrefs?.showLicenseOnCreate ?? true

  // Initialize user session and fetch Git identity
  useEffect(() => {
    const session = getUserSession()
    setSourceMetadata(prev => ({
      ...prev,
      creator: session.creatorName,
      creatorType: 'session',
      sessionId: session.sessionId,
    }))

    // Try to fetch Git identity
    getGitIdentity().then(git => {
      if (git?.name) {
        const gitName = git.name // Capture for type safety
        setSourceMetadata(prev => ({
          ...prev,
          creator: gitName,
          creatorType: 'git',
        }))
      }
    })
  }, [])

  // Auto-configure for supernote mode
  useEffect(() => {
    if (inputMode === 'supernote') {
      // Auto-set target path to notes weave
      setTargetPath('weaves/notes/')
      // Set default supertag if none selected
      if (selectedTags.length === 0 || !['note', 'idea', 'todo', 'question', 'reminder', 'insight', 'draft'].includes(selectedTags[0])) {
        setSelectedTags(['note'])
      }
      // Set source metadata for supernote
      setSourceMetadata(prev => ({
        ...prev,
        sourceType: 'manual',
        contentType: 'supernote',
      }))
    }
  }, [inputMode])

  // Handle prompt from URL params
  useEffect(() => {
    // Guard against null searchParams during SSR/hydration
    if (!searchParams) return

    const loadPrompt = async () => {
      // Check for gallery prompt ID first (from PromptGallery)
      const galleryPromptId = searchParams.get('promptId')

      if (galleryPromptId) {
        try {
          const manager = await getPromptManager()
          const galleryPrompt = await manager.getPrompt(galleryPromptId)
          if (galleryPrompt) {
            setInputMode('write')
            setContent(`<!-- Writing Prompt: ${galleryPrompt.text} -->\n\n# ${galleryPrompt.text}\n\n`)
            setFileName(`${galleryPrompt.category || 'creative'}-strand.md`)
            await manager.usePrompt(galleryPromptId) // Track usage
            return
          }
        } catch (error) {
          console.error('[StrandCreator] Failed to load gallery prompt:', error)
        }
      }

      // Check for template ID (from Templates page "Use this template")
      const templateId = searchParams.get('template')
      if (templateId) {
        try {
          const template = await getTemplateById(templateId)
          if (template) {
            setInputMode('write')

            // Generate content from template (similar to TemplatePickerModal)
            const date = new Date().toISOString().split('T')[0]
            let generatedContent = template.template
              .replace(/\{date\}/g, date)
              .replace(/\{title\}/g, template.name)
              .replace(/\{summary\}/g, template.shortDescription)

            // Generate frontmatter
            const frontmatter: Record<string, unknown> = {
              title: template.name,
              created: date,
              template: template.id,
              category: template.category,
              tags: template.tags,
            }

            // Add frontmatter to content if not already present
            if (!generatedContent.startsWith('---')) {
              const frontmatterYaml = Object.entries(frontmatter)
                .map(([key, value]) => {
                  if (Array.isArray(value)) {
                    return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`
                  }
                  return `${key}: ${JSON.stringify(value)}`
                })
                .join('\n')
              generatedContent = `---\n${frontmatterYaml}\n---\n\n${generatedContent}`
            }

            setContent(generatedContent)
            setFileName(`${template.id}.md`)
            setSourceMetadata(createDefaultSourceMetadata({
              sourceType: 'template',
              sourceTemplateId: template.id,
            }))
            return
          }
        } catch (error) {
          console.error('[StrandCreator] Failed to load template:', error)
        }
      }

      // Fall back to legacy prompt system or gallery prompt
      const legacyPromptId = searchParams.get('prompt')
      if (legacyPromptId) {
        // First check legacy WRITING_PROMPTS
        const prompt = WRITING_PROMPTS.find(p => p.id === legacyPromptId)
        if (prompt) {
          setSelectedPrompt(prompt)
          setInputMode('write')
          // Pre-populate content with prompt as inspiration
          setContent(`<!-- Writing Prompt: ${prompt.text} -->\n\n# \n\n`)
          setFileName(`${prompt.category}-strand.md`)
        } else {
          // Fall back to gallery prompts
          try {
            const manager = await getPromptManager()
            const galleryPrompt = await manager.getPrompt(legacyPromptId)
            if (galleryPrompt) {
              setInputMode('write')
              setContent(`<!-- Writing Prompt: ${galleryPrompt.text} -->\n\n# ${galleryPrompt.text}\n\n`)
              setFileName(`${galleryPrompt.category || 'creative'}-strand.md`)
              await manager.usePrompt(legacyPromptId) // Track usage
            }
          } catch (error) {
            console.error('[StrandCreator] Failed to load gallery prompt:', error)
          }
        }
      }
    }

    loadPrompt()
  }, [searchParams])

  // Auto-analyze disabled to prevent UI freeze
  // NLP functions block the main thread - use manual analyze button instead
  // TODO: Move NLP to web worker for background processing

  // Manual analyze trigger (called from UI button)
  const triggerAnalysis = useCallback(() => {
    if (!content || content.length < 50) {
      setExtractedMeta(null)
      return
    }
    analyzeContent(content)
  }, [content])
  
  /**
   * Analyze content and extract metadata using NLP
   */
  const analyzeContent = useCallback(async (text: string) => {
    setAnalyzing(true)

    try {
      // Extract title from first heading or first line
      const titleMatch = text.match(/^#\s+(.+)$/m) || text.match(/^(.{1,60})/m)
      const title = titleMatch ? titleMatch[1].trim() : undefined

      // Lazy-load NLP functions to avoid blocking
      const nlp = await loadNLP()
      const entities = nlp.extractEntities(text)
      const keywordResults = nlp.extractKeywords(text)
      const summary = nlp.generateSummary(text)
      const suggestedTags = nlp.suggestTags(text)
      const difficulty = inferDifficulty(text)
      
      // Word count and reading time
      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length
      const readingTime = Math.ceil(wordCount / 200)
      
      // Infer topics from content structure
      const topics: string[] = []
      if (text.toLowerCase().includes('tutorial') || text.toLowerCase().includes('guide')) {
        topics.push('tutorial')
      }
      if (text.toLowerCase().includes('api') || text.toLowerCase().includes('endpoint')) {
        topics.push('api-reference')
      }
      if (text.toLowerCase().includes('architecture') || text.toLowerCase().includes('design')) {
        topics.push('architecture')
      }
      if (text.toLowerCase().includes('best practice') || text.toLowerCase().includes('recommendation')) {
        topics.push('best-practices')
      }
      
      // Infer subjects from entities
      const subjects: string[] = []
      if (entities.technologies.length > 0) subjects.push('technology')
      if (text.toLowerCase().includes('ai') || text.toLowerCase().includes('machine learning')) {
        subjects.push('artificial-intelligence')
      }
      
      // Convert keyword results to string array
      const keywordStrings = keywordResults.map(k => k.word)
      
      setExtractedMeta({
        title,
        summary,
        tags: [...new Set([...suggestedTags.slice(0, 5), ...keywordStrings.slice(0, 3), ...customTags])],
        topics,
        subjects,
        difficulty,
        entities,
        keywords: keywordStrings,
        wordCount,
        readingTime,
      })
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setAnalyzing(false)
    }
  }, [customTags])
  
  /**
   * Handle file upload
   */
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setContent(text)
      setFileName(file.name)

      // Update source metadata
      setSourceMetadata(prev => ({
        ...prev,
        sourceType: 'upload',
        sourceFilename: file.name,
        uploadedAt: new Date().toISOString(),
      }))
    }
    reader.readAsText(file)
  }, [])
  
  /**
   * Handle URL scraping
   * Uses client-side scraping in static mode, server API otherwise
   */
  const handleScrapeUrl = useCallback(async () => {
    if (!urlInput.trim()) return

    setScraping(true)
    setScrapeError(null)
    setScrapeMethod(null)

    // In static export mode, use client-side scraping
    if (isStaticExport) {
      try {
        const { clientScrape } = await loadScrape()
        const result = await clientScrape(urlInput)
        
        // Track which method was used
        if (result.method === 'pdf') {
          setScrapeMethod('client-pdf')
        } else if (result.method === 'html') {
          setScrapeMethod('client-html')
        } else if (result.method === 'fallback') {
          setScrapeMethod('fallback')
        }
        
        if (result.success && result.content) {
          setContent(result.content)
          setFileName(result.title ? `${result.title.toLowerCase().replace(/\s+/g, '-')}.md` : 'scraped-content.md')
          
          // Show info message if using fallback method
          if (result.method === 'fallback') {
            setScrapeError('Could not fully scrape the content. Please paste the content manually into the editor below.')
          }
        } else {
          setScrapeError(result.error || 'Failed to scrape URL. Please paste the content manually.')
          setScrapeMethod('fallback')
          // Create a placeholder with the URL
          setContent(`# Content from ${urlInput}\n\n> Source: [${urlInput}](${urlInput})\n\n<!-- Paste content here -->\n\n`)
        }

        setSourceMetadata(prev => ({
          ...prev,
          sourceType: 'scrape',
          sourceUrl: urlInput,
          uploadedAt: new Date().toISOString(),
        }))
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setScrapeError(`Scraping failed: ${errorMessage}. Please paste the content manually.`)
        setScrapeMethod('fallback')
        setContent(`# Content from ${urlInput}\n\n> Source: [${urlInput}](${urlInput})\n\n<!-- Paste content here -->\n\n`)
        
        setSourceMetadata(prev => ({
          ...prev,
          sourceType: 'scrape',
          sourceUrl: urlInput,
          uploadedAt: new Date().toISOString(),
        }))
      } finally {
        setScraping(false)
      }
      return
    }

    // Server mode: use the API route (best parsing with pdf-parse, cheerio, etc.)
    try {
      const response = await fetch(`/api/scrape?url=${encodeURIComponent(urlInput)}`)

      if (!response.ok) {
        throw new Error('Failed to fetch URL content')
      }

      const data = await response.json()
      setContent(data.content || '')
      setFileName(data.title ? `${data.title.toLowerCase().replace(/\s+/g, '-')}.md` : 'scraped-content.md')
      setScrapeMethod('server')

      // Update source metadata
      setSourceMetadata(prev => ({
        ...prev,
        sourceType: 'scrape',
        sourceUrl: urlInput,
        uploadedAt: new Date().toISOString(),
      }))
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scrape URL'
      setScrapeError(`${errorMessage}. Try copying content manually.`)
      setScrapeMethod('fallback')

      // Fallback: create a placeholder with the URL
      setContent(`# Content from ${urlInput}\n\n> Source: [${urlInput}](${urlInput})\n\n<!-- Paste content here -->`)

      // Update source metadata even on failure
      setSourceMetadata(prev => ({
        ...prev,
        sourceType: 'scrape',
        sourceUrl: urlInput,
        uploadedAt: new Date().toISOString(),
      }))
    } finally {
      setScraping(false)
    }
  }, [urlInput])
  
  /**
   * Add custom tag
   */
  const handleAddTag = useCallback(() => {
    if (!newTag.trim()) return
    const tag = newTag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!customTags.includes(tag)) {
      setCustomTags([...customTags, tag])
    }
    setNewTag('')
  }, [newTag, customTags])
  
  /**
   * Copy generated markdown to clipboard
   */
  const handleCopy = useCallback(() => {
    const fullContent = extractedMeta
      ? generateFrontmatter({
          meta: extractedMeta,
          source: sourceMetadata,
          license: selectedLicense,
          licenseText: customLicenseText,
          licenseDetectedFrom: detectedLicense ? detectedLicense.source as any : 'manual',
        }) + content
      : content
    navigator.clipboard.writeText(fullContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content, extractedMeta, sourceMetadata, selectedLicense, customLicenseText, detectedLicense])
  
  /**
   * Download as markdown file
   */
  const handleDownload = useCallback(() => {
    const fullContent = extractedMeta
      ? generateFrontmatter({
          meta: extractedMeta,
          source: sourceMetadata,
          license: selectedLicense,
          licenseText: customLicenseText,
          licenseDetectedFrom: detectedLicense ? detectedLicense.source as any : 'manual',
        }) + content
      : content
    const blob = new Blob([fullContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }, [content, extractedMeta, sourceMetadata, selectedLicense, customLicenseText, detectedLicense, fileName])

  /**
   * Create new strand - save locally first
   */
  const handleCreateNew = useCallback(async () => {
    if (!content.trim()) {
      alert('Please add some content before creating a strand.')
      return
    }

    setSaving(true)
    try {
      // Generate a unique ID for the strand
      const strandId = crypto.randomUUID()
      const slug = fileName.replace(/\.md$/, '').toLowerCase().replace(/\s+/g, '-')
      const fullPath = `${targetPath}${fileName}`

      // Prepare the full content with frontmatter
      let fullContent: string

      // Special handling for supernote mode
      if (inputMode === 'supernote') {
        const now = new Date().toISOString()
        const title = fileName.replace(/\.md$/, '').replace(/^supernote-\d+-/, '').replace(/-/g, ' ')
        const primarySupertag = selectedTags[0] || 'note'

        const supernoteFrontmatter = `---
title: "${title}"
strandType: supernote
isSupernote: true
primarySupertag: ${primarySupertag}
cardSize: "3x5"
supernoteStyle: paper
tags: [${selectedTags.map(t => `"${t}"`).join(', ')}]
createdAt: "${now}"
updatedAt: "${now}"
---

`
        fullContent = supernoteFrontmatter + content
      } else if (extractedMeta) {
        fullContent = generateFrontmatter({
            meta: extractedMeta,
            source: sourceMetadata,
            license: selectedLicense,
            licenseText: customLicenseText,
            licenseDetectedFrom: detectedLicense ? detectedLicense.source as any : 'manual',
          }) + content
      } else {
        fullContent = content
      }

      // Prepare metadata for storage
      const metadata = JSON.stringify({
        title: extractedMeta?.title || fileName.replace(/\.md$/, ''),
        summary: extractedMeta?.summary,
        tags: [...(extractedMeta?.tags || []), ...customTags],
        difficulty: extractedMeta?.difficulty,
        license: selectedLicense,
        creator: sourceMetadata.creator,
        createdAt: new Date().toISOString(),
      })

      // Save to local database (IndexedDB)
      const success = await saveDraft({
        id: strandId,
        type: 'strand',
        path: fullPath,
        title: extractedMeta?.title || fileName.replace(/\.md$/, ''),
        content: fullContent,
        metadata,
        autoSaved: false,
      })

      // Also save to localStorage for QuarryContent compatibility
      // This bridges the two draft systems
      saveLocalDraft(fullPath, fullContent, '')

      if (success) {
        setLocalStrandId(strandId)
        // Redirect to view the created strand in Codex
        // Convert path like "weaves/inbox/my-strand.md" to "/quarry/weaves/inbox/my-strand"
        const viewPath = fullPath.replace(/\.md$/, '')
        router.push(`/quarry/${viewPath}?draft=${strandId}`)
      } else {
        throw new Error('Failed to save draft')
      }
    } catch (error) {
      console.error('Failed to create strand:', error)
      alert('Failed to create strand. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [content, extractedMeta, sourceMetadata, customTags, selectedTags, fileName, targetPath, router, selectedLicense, customLicenseText, detectedLicense, inputMode])

  /**
   * Handle prompt selection from picker
   */
  const handleSelectPrompt = useCallback((prompt: WritingPrompt) => {
    setSelectedPrompt(prompt)
    setInputMode('write')
    // If content is empty or just the default, add prompt as inspiration
    if (!content || content.length < 20) {
      setContent(`<!-- Writing Prompt: ${prompt.text} -->\n\n# \n\n`)
    }
    setFileName(`${prompt.category}-strand.md`)
    setShowPromptPicker(false)
  }, [content])
  
  /**
   * Clear selected prompt
   */
  const handleClearPrompt = useCallback(() => {
    setSelectedPrompt(null)
  }, [])
  
  // Memoized preview content (show content only, not frontmatter - frontmatter is ugly in preview)
  // Frontmatter is still included in copy/download/save operations
  const previewContent = useMemo(() => {
    return content
  }, [content])
  
  // Quick save location presets
  const SAVE_LOCATIONS = [
    { path: 'weaves/inbox/', label: 'Inbox', icon: Inbox },
    { path: 'weaves/wiki/tutorials/', label: 'Tutorials', icon: BookOpen },
    { path: 'weaves/wiki/reference/', label: 'Reference', icon: FileText },
    { path: 'weaves/wiki/concepts/', label: 'Concepts', icon: Lightbulb },
    { path: 'weaves/notes/', label: 'Notes', icon: FileText },
  ]

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
      {/* Header Section */}
      <div className={`px-6 py-6 border-b ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
        <div className="max-w-6xl mx-auto">
          <h1 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Create New Strand
          </h1>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Write, upload, or import content with automatic tagging
          </p>
        </div>
      </div>

      {/* Toolbar - Sticky */}
      <div className={`
        sticky top-0 z-30 px-6 py-3 border-b backdrop-blur-xl
        ${isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-zinc-200'}
      `}>
        <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Back button (when editing from template) */}
          {selectedTemplate && inputMode === 'write' && (
            <button
              onClick={() => {
                setSelectedTemplate(null)
                setInputMode('template')
                setContent('')
                setFileName('new-strand.md')
              }}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                transition-all mr-2
                ${isDark 
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' 
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }
              `}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </button>
          )}
          
          {/* View mode toggle */}
          <div className={`flex items-center gap-1 p-1 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'edit' 
                  ? isDark ? 'bg-zinc-700 text-white' : 'bg-white text-zinc-900 shadow-sm'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'split' 
                  ? isDark ? 'bg-zinc-700 text-white' : 'bg-white text-zinc-900 shadow-sm'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <SplitSquareVertical className="w-4 h-4" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'preview'
                  ? isDark ? 'bg-zinc-700 text-white' : 'bg-white text-zinc-900 shadow-sm'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>

          {/* Editor mode toggle (WYSIWYG / Markdown) */}
          <div className={`flex items-center gap-1 p-1 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            <button
              onClick={() => setEditorMode('wysiwyg')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                editorMode === 'wysiwyg'
                  ? isDark ? 'bg-zinc-700 text-white' : 'bg-white text-zinc-900 shadow-sm'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Rich text editor"
            >
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">WYSIWYG</span>
            </button>
            <button
              onClick={() => setEditorMode('markdown')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                editorMode === 'markdown'
                  ? isDark ? 'bg-zinc-700 text-white' : 'bg-white text-zinc-900 shadow-sm'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Raw markdown editor"
            >
              <Code className="w-4 h-4" />
              <span className="hidden sm:inline">Markdown</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
            </button>
            <button
              onClick={handleDownload}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                isDark
                  ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                  : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
              }`}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            {/* Create New button - saves locally first */}
            <button
              onClick={handleCreateNew}
              disabled={saving || !content.trim()}
              title={!content.trim() ? 'Write some content first' : 'Create and save this strand'}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2
                ${saving || !content.trim()
                  ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 shadow-md shadow-emerald-500/20'
                }
              `}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Create</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Input mode tabs - Clean and compact */}
      <div className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Creation Mode Tabs */}
            <div className={`flex items-center gap-0.5 p-1 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <button
                onClick={() => setInputMode('write')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  inputMode === 'write'
                    ? isDark ? 'bg-cyan-600 text-white' : 'bg-cyan-500 text-white shadow-sm'
                    : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                Write
              </button>
              <button
                onClick={() => setInputMode('canvas')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  inputMode === 'canvas'
                    ? isDark ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white shadow-sm'
                    : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <PenTool className="w-4 h-4" />
                Canvas
              </button>
              <button
                onClick={() => setInputMode('template')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  inputMode === 'template'
                    ? isDark ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white shadow-sm'
                    : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Templates
              </button>
              <button
                onClick={() => setInputMode('upload')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  inputMode === 'upload'
                    ? isDark ? 'bg-zinc-600 text-white' : 'bg-zinc-700 text-white shadow-sm'
                    : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
              <button
                onClick={() => setInputMode('url')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  inputMode === 'url'
                    ? isDark ? 'bg-amber-600 text-white' : 'bg-amber-500 text-white shadow-sm'
                    : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Globe className="w-4 h-4" />
                URL
              </button>
              <button
                onClick={() => setInputMode('supernote')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                  inputMode === 'supernote'
                    ? isDark ? 'bg-yellow-600 text-white' : 'bg-yellow-500 text-white shadow-sm'
                    : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <StickyNote className="w-4 h-4" />
                Supernote
              </button>
            </div>

            {/* Save Location Dropdown */}
            <div className="flex items-center gap-2 ml-auto">
              <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>Save to:</span>
              <select
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm border cursor-pointer
                  ${isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                    : 'bg-white border-zinc-300 text-zinc-800'
                  }
                `}
              >
                {SAVE_LOCATIONS.map(loc => (
                  <option key={loc.path} value={loc.path}>{loc.label}</option>
                ))}
              </select>

              {/* Browse locations button */}
              <button
                onClick={() => setShowLocationPicker(true)}
                className={`
                  p-2 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'}
                `}
                title="Browse all locations, create new looms/weaves"
              >
                <FolderInput className="w-4 h-4" />
              </button>

              {/* Prompt Picker Button */}
              <button
                onClick={() => setShowPromptPicker(true)}
                className={`
                  p-2 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-zinc-800 text-cyan-400' : 'hover:bg-zinc-100 text-cyan-600'}
                `}
                title="Get a writing prompt"
              >
                <Lightbulb className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="px-6 py-6 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="max-w-6xl mx-auto flex-1 flex flex-col min-h-0 w-full">
        <div className={`flex flex-col lg:flex-row gap-4 flex-1 min-h-0 ${viewMode === 'split' ? '' : ''}`}>
          
          {/* Template Library - Full width when in template mode */}
          {inputMode === 'template' && (
            <div className="w-full">
              {/* Browse All Templates Button */}
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => setShowTemplatePicker(true)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-colors
                    ${isDark
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500'
                      : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600'
                    }
                  `}
                >
                  <Globe className="w-4 h-4" />
                  Browse All Templates
                </button>
              </div>
              <motion.div
                key="template"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}`}
              >
                <div className="min-h-[500px]">
                  <StrandTemplateLibrary
                    onSelectTemplate={(template: StrandTemplate) => {
                      // Apply template content and switch to write mode
                      const frontmatterYaml = Object.entries(template.frontmatter)
                        .map(([key, value]) => {
                          if (typeof value === 'object' && value !== null) {
                            const nested = Object.entries(value as Record<string, unknown>)
                              .filter(([, v]) => Array.isArray(v) ? (v as unknown[]).length > 0 : v !== undefined)
                              .map(([k, v]) => {
                                if (Array.isArray(v)) {
                                  return `  ${k}:\n${(v as string[]).map(item => `    - ${item}`).join('\n')}`
                                }
                                return `  ${k}: ${v}`
                              })
                              .join('\n')
                            return nested ? `${key}:\n${nested}` : null
                          }
                          return `${key}: ${value}`
                        })
                        .filter(Boolean)
                        .join('\n')
                      
                      const fullContent = frontmatterYaml 
                        ? `---\n${frontmatterYaml}\n---\n\n${template.content}`
                        : template.content
                      
                      setContent(fullContent)
                      setFileName(`${template.id}.md`)
                      setSelectedTemplate(template) // Store selected template for back button
                      if (template.suggestedPath) {
                        setTargetPath(template.suggestedPath)
                      }
                      setInputMode('write')
                    }}
                  />
                </div>
              </motion.div>
            </div>
          )}
          
          {/* Editor panel */}
          {inputMode !== 'template' && (viewMode === 'edit' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'lg:w-1/2' : 'w-full'} flex flex-col min-h-0 flex-1`}>
              {/* Input mode content */}
              <AnimatePresence mode="wait">
                {inputMode === 'write' && (
                  <motion.div
                    key="write"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <div className={`
                      rounded-xl border overflow-hidden flex-1 flex flex-col min-h-0
                      ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}
                    `}>
                      <div className={`px-3 py-2 border-b flex-shrink-0 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                        <input
                          type="text"
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          className={`text-sm font-mono bg-transparent outline-none ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}
                        />
                      </div>
                      
                      {/* Selected Prompt Banner */}
                      {selectedPrompt && (
                        <div className={`
                          px-4 py-3 border-b flex items-start gap-3
                          ${isDark 
                            ? 'bg-gradient-to-r from-cyan-950/50 to-purple-950/50 border-cyan-800/50' 
                            : 'bg-gradient-to-r from-cyan-50 to-purple-50 border-cyan-200'
                          }
                        `}>
                          <Lightbulb className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                                Writing Prompt
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                                {selectedPrompt.category}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>
                                {selectedPrompt.difficulty}
                              </span>
                            </div>
                            <p className={`mt-1 text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                              "{selectedPrompt.text}"
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => setShowPromptPicker(true)}
                              className={`
                                p-1.5 rounded-lg text-xs transition-colors
                                ${isDark ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'}
                              `}
                              title="Change prompt"
                            >
                              <Shuffle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleClearPrompt}
                              className={`
                                p-1.5 rounded-lg text-xs transition-colors
                                ${isDark ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'}
                              `}
                              title="Clear prompt"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Editor - WYSIWYG or Markdown mode */}
                      {editorMode === 'wysiwyg' ? (
                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                          <TiptapEditor
                            content={content}
                            onChange={setContent}
                            theme={theme as any}
                          />
                        </div>
                      ) : (
                        <textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="# Your Strand Title

Start writing your markdown content here...

## Section

Content goes here."
                          className={`
                            w-full flex-1 min-h-0 p-4 font-mono text-sm resize-none outline-none overflow-y-auto
                            ${isDark ? 'bg-zinc-900 text-zinc-100 placeholder:text-zinc-600' : 'bg-white text-zinc-900 placeholder:text-zinc-400'}
                          `}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
                
                {inputMode === 'upload' && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all
                        ${isDark 
                          ? 'border-zinc-700 hover:border-purple-500 hover:bg-purple-900/10' 
                          : 'border-zinc-300 hover:border-purple-500 hover:bg-purple-50'
                        }
                      `}
                    >
                      <Upload className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                      <p className={`text-lg font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        Drop a file or click to upload
                      </p>
                      <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                        Supports .md, .txt, .markdown files
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".md,.txt,.markdown"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                    
                    {content && (
                      <div className={`mt-4 p-4 rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-emerald-500" />
                          <span className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{fileName}</span>
                          <Check className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                          {content.length} characters loaded
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
                
                {inputMode === 'url' && (
                  <motion.div
                    key="url"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className={`
                      rounded-xl border p-6
                      ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}
                    `}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Globe className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                          <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                            Import from URL
                          </span>
                        </div>
                        {/* Capability indicator badge */}
                        <button
                          onClick={() => setShowCapabilities(!showCapabilities)}
                          className={`
                            flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors
                            ${isStaticExport 
                              ? isDark ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : isDark ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }
                          `}
                          title={isStaticExport ? 'Static mode - limited capabilities' : 'Server mode - full capabilities'}
                        >
                          {isStaticExport ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              Client Mode
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3" />
                              Full Mode
                            </>
                          )}
                          <ChevronDown className={`w-3 h-3 transition-transform ${showCapabilities ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      
                      {/* Expandable capabilities info */}
                      <AnimatePresence>
                        {showCapabilities && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className={`mb-4 p-3 rounded-lg text-sm ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                              <div className="flex items-center gap-2 mb-3">
                                <Layers className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
                                <span className={`font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                  Scraping Capabilities
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  isStaticExport 
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                }`}>
                                  {isStaticExport ? 'Static/GitHub Pages' : 'Server Mode'}
                                </span>
                              </div>
                              <div className="space-y-2 ml-6">
                                {/* PDF Support */}
                                <div className="group relative flex items-start gap-2">
                                  <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${isStaticExport ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>PDF Files</span>
                                      <span 
                                        title={isStaticExport 
                                          ? 'Uses PDF.js to parse PDFs in your browser. Works well for text-based PDFs but may struggle with scanned documents or complex layouts.'
                                          : 'Uses pdf-parse on the server for high-quality text extraction from any PDF, including scanned documents with OCR support.'
                                        }
                                      >
                                        <HelpCircle 
                                          className={`w-3 h-3 cursor-help ${isDark ? 'text-zinc-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-500'}`}
                                        />
                                      </span>
                                    </div>
                                    <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                                      {isStaticExport ? 'PDF.js (browser-based)' : 'pdf-parse (server, best quality)'}
                                    </p>
                                  </div>
                                </div>
                                {/* Web Pages */}
                                <div className="group relative flex items-start gap-2">
                                  <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${isStaticExport ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>Web Pages</span>
                                      <span 
                                        title={isStaticExport 
                                          ? 'Uses public CORS proxies to fetch pages. Some sites block these proxies. If blocked, paste content manually.'
                                          : 'Server fetches pages directly without CORS restrictions. Works reliably with most websites.'
                                        }
                                      >
                                        <HelpCircle 
                                          className={`w-3 h-3 cursor-help ${isDark ? 'text-zinc-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-500'}`}
                                        />
                                      </span>
                                    </div>
                                    <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                                      {isStaticExport ? 'CORS proxy (some sites may block)' : 'Server proxy (reliable)'}
                                    </p>
                                  </div>
                                </div>
                                {/* Social Media */}
                                <div className="group relative flex items-start gap-2">
                                  <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${isStaticExport ? 'bg-zinc-500' : 'bg-emerald-500'}`} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>Social Media</span>
                                      <span title={isStaticExport
                                          ? 'Basic content extraction only. Platform detection and hashtag/mention extraction available, but engagement metrics may be limited.'
                                          : 'Full metadata extraction including author, engagement metrics, hashtags, mentions, and platform-specific data for Reddit, Twitter, YouTube, etc.'
                                        }>
                                        <HelpCircle
                                          className={`w-3 h-3 cursor-help ${isDark ? 'text-zinc-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-500'}`}
                                        />
                                      </span>
                                    </div>
                                    <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                                      {isStaticExport ? 'Basic content only' : 'Full metadata (author, engagement, hashtags)'}
                                    </p>
                                  </div>
                                </div>
                                {/* License Detection */}
                                <div className="group relative flex items-start gap-2">
                                  <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${isStaticExport ? 'bg-zinc-500' : 'bg-emerald-500'}`} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>License Detection</span>
                                      <span title={isStaticExport 
                                          ? 'Not available in static mode. You can manually set the license in the Source Information section below.'
                                          : 'Automatically detects Creative Commons, MIT, GPL, and other licenses from HTML meta tags and page content.'
                                        }>
                                        <HelpCircle 
                                          className={`w-3 h-3 cursor-help ${isDark ? 'text-zinc-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-500'}`}
                                        />
                                      </span>
                                    </div>
                                    <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                                      {isStaticExport ? 'Manual only' : 'Auto-detect CC, MIT, GPL, etc.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {isStaticExport && (
                                <div className={`mt-4 pt-3 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                    💡 <strong>Want full capabilities?</strong>
                                  </p>
                                  <ul className={`mt-1 text-xs space-y-1 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                                    <li>• Use the <strong>desktop app</strong> for offline + server features</li>
                                    <li>• <strong>Self-host</strong> on Vercel/Netlify for server-side parsing</li>
                                    <li>• <strong>Paste content directly</strong> for guaranteed results</li>
                                  </ul>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="url"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://example.com/article or .pdf"
                          className={`
                            flex-1 px-4 py-2 rounded-lg border text-sm
                            ${isDark 
                              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500' 
                              : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
                            }
                          `}
                        />
                        <button
                          onClick={handleScrapeUrl}
                          disabled={scraping || !urlInput.trim()}
                          className={`
                            w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2
                            ${scraping || !urlInput.trim()
                              ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
                              : isDark
                                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                : 'bg-amber-500 hover:bg-amber-600 text-white'
                            }
                          `}
                        >
                          {scraping ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          Fetch
                        </button>
                      </div>
                      
                      {/* Success indicator with method info */}
                      {scrapeMethod && !scrapeError && content && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`mt-4 p-3 rounded-lg ${
                            scrapeMethod === 'server' 
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                              : scrapeMethod === 'fallback'
                                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                                : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Check className={`w-4 h-4 ${
                              scrapeMethod === 'server' ? 'text-emerald-500' :
                              scrapeMethod === 'fallback' ? 'text-amber-500' : 'text-blue-500'
                            }`} />
                            <span className={`text-sm font-medium ${
                              scrapeMethod === 'server' ? 'text-emerald-700 dark:text-emerald-300' :
                              scrapeMethod === 'fallback' ? 'text-amber-700 dark:text-amber-300' : 
                              'text-blue-700 dark:text-blue-300'
                            }`}>
                              {scrapeMethod === 'server' && 'Content fetched via server (best quality)'}
                              {scrapeMethod === 'client-pdf' && 'PDF parsed in browser with PDF.js'}
                              {scrapeMethod === 'client-html' && 'Web page fetched via CORS proxy'}
                              {scrapeMethod === 'fallback' && 'Placeholder created - paste content manually'}
                            </span>
                          </div>
                          <p className={`text-xs mt-1 ml-6 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                            {scrapeMethod === 'server' && 'Full parsing with pdf-parse and metadata extraction'}
                            {scrapeMethod === 'client-pdf' && 'Text extraction may vary for complex layouts'}
                            {scrapeMethod === 'client-html' && 'Some formatting may be lost in conversion'}
                            {scrapeMethod === 'fallback' && 'Source URL preserved for reference'}
                          </p>
                        </motion.div>
                      )}
                      
                      {/* Error state */}
                      {scrapeError && (
                        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-red-700 dark:text-red-300">{scrapeError}</p>
                              {isStaticExport && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  This may be due to CORS restrictions. The site owner can enable CORS or you can paste the content directly.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Footer tip */}
                      <p className={`mt-4 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                        {isStaticExport 
                          ? '💡 Supports PDF files and web pages. For best results with complex sites, paste content directly.'
                          : '✨ Server-side parsing provides best quality for PDFs and web pages with full metadata extraction.'
                        }
                      </p>
                    </div>
                  </motion.div>
                )}

                {inputMode === 'canvas' && (
                  <motion.div
                    key="canvas"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full"
                  >
                    <div className={`
                      rounded-xl border overflow-hidden
                      ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}
                    `}>
                      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                        <div className="flex items-center gap-2">
                          <PenTool className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                          <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                            Infinite Canvas
                          </span>
                        </div>
                        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                          Draw, sketch, and create visual notes • Auto-saves to preview
                        </p>
                      </div>

                      {/* Inline Canvas - embedded directly, not a modal */}
                      <div className="p-2">
                        <InlineCanvas
                          initialSvg={canvasSvg || undefined}
                          isDark={isDark}
                          height={400}
                          placeholder="Start drawing..."
                          onChange={(svgString, dataUri) => {
                            setCanvasSvg(svgString)
                            if (svgString) {
                              // Update markdown content with embedded SVG
                              const markdownContent = `# Canvas Drawing\n\n![Canvas Drawing](${dataUri})\n`
                              setContent(markdownContent)
                              setFileName('canvas-drawing.md')
                              // Update source metadata
                              setSourceMetadata(prev => ({
                                ...prev,
                                sourceType: 'canvas',
                                contentType: 'whiteboard',
                              }))
                            } else {
                              setContent('')
                            }
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {inputMode === 'supernote' && (
                  <motion.div
                    key="supernote"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full"
                  >
                    <div className={`
                      rounded-xl border overflow-hidden
                      ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}
                    `}>
                      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                        <div className="flex items-center gap-2">
                          <StickyNote className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                          <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                            Quick Supernote
                          </span>
                        </div>
                        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                          Create a structured note with supertag
                        </p>
                      </div>

                      <div className="p-6 space-y-4">
                        {/* Supertag Selector */}
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            Supertag
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {['note', 'idea', 'todo', 'question', 'reminder', 'insight', 'draft'].map((tag) => (
                              <button
                                key={tag}
                                onClick={() => {
                                  setSelectedTags(prev => {
                                    const filtered = prev.filter(t => !['note', 'idea', 'todo', 'question', 'reminder', 'insight', 'draft'].includes(t))
                                    return [tag, ...filtered]
                                  })
                                }}
                                className={`
                                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                  ${selectedTags[0] === tag
                                    ? isDark ? 'bg-yellow-600 text-white' : 'bg-yellow-500 text-white'
                                    : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                  }
                                `}
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Title Input */}
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            Title
                          </label>
                          <input
                            type="text"
                            value={fileName.replace(/\.md$/, '').replace(/^supernote-\d+-/, '')}
                            onChange={(e) => {
                              const title = e.target.value
                              setFileName(title ? `supernote-${Date.now()}-${title.toLowerCase().replace(/\s+/g, '-')}.md` : '')
                            }}
                            placeholder="What's this note about?"
                            className={`
                              w-full px-4 py-2 rounded-lg border text-sm
                              ${isDark
                                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                                : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
                              }
                            `}
                          />
                        </div>

                        {/* Content Textarea */}
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            Content
                          </label>
                          <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write your note here..."
                            rows={6}
                            className={`
                              w-full px-4 py-3 rounded-lg border text-sm resize-none
                              ${isDark
                                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                                : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
                              }
                            `}
                          />
                        </div>

                        {/* Preview Card */}
                        {content && (
                          <div className={`
                            p-4 rounded-xl border-2 border-dashed
                            ${isDark ? 'border-yellow-600/30 bg-yellow-950/20' : 'border-yellow-400/50 bg-yellow-50'}
                          `}>
                            <div className="flex items-start gap-3">
                              <div className={`
                                px-2 py-1 rounded-md text-xs font-medium
                                ${isDark ? 'bg-yellow-600/30 text-yellow-400' : 'bg-yellow-200 text-yellow-700'}
                              `}>
                                #{selectedTags[0] || 'note'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm line-clamp-3 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                  {content}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Auto-set target path to notes weave */}
                        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                          💡 Supernotes are saved to the <strong>notes</strong> weave automatically
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Metadata Panels - Semantic Groups
                  Four collapsible sections for better UX:
                  1. Document Info - Title, Summary, Difficulty
                  2. Classification - Tags, Topics, Subjects
                  3. Content Analysis - Stats, Technologies, Keywords
                  4. Publishing - Target path, Auto-categorization workflow
              */}

              {/* Analyze Button - Show when content exists but not yet analyzed */}
              {!extractedMeta && content.length >= 50 && (
                <button
                  onClick={triggerAnalysis}
                  disabled={analyzing}
                  className={`
                    mt-4 w-full px-4 py-3 rounded-xl flex items-center justify-center gap-2
                    transition-all duration-200
                    ${isDark
                      ? 'bg-purple-600 hover:bg-purple-500 text-white disabled:bg-zinc-700'
                      : 'bg-purple-600 hover:bg-purple-500 text-white disabled:bg-zinc-300'}
                    ${analyzing ? 'opacity-75 cursor-wait' : ''}
                  `}
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing content...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      Analyze Content
                    </>
                  )}
                </button>
              )}

              {extractedMeta && (
                <div className="mt-4 space-y-3">
                  {/* Section 1: Document Info */}
                  <div className={`
                    rounded-xl border overflow-hidden
                    ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}
                  `}>
                    <button
                      onClick={() => setExpandedMetaSections(prev => ({ ...prev, docInfo: !prev.docInfo }))}
                      className={`
                        w-full px-4 py-3 flex items-center justify-between
                        ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <FileTextIcon className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          Document Info
                        </span>
                        <span className={`
                          px-2 py-0.5 rounded-full text-xs font-medium capitalize
                          ${extractedMeta.difficulty === 'beginner' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' :
                            extractedMeta.difficulty === 'intermediate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                            extractedMeta.difficulty === 'advanced' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' :
                            'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                          }
                        `}>
                          {extractedMeta.difficulty}
                        </span>
                      </div>
                      {expandedMetaSections.docInfo ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <AnimatePresence>
                      {expandedMetaSections.docInfo && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className={`px-4 pb-4 space-y-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'} pt-4`}>
                            {/* Title */}
                            <div>
                              <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                Title
                              </label>
                              <p className={`text-sm ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                {extractedMeta.title || 'No title detected'}
                              </p>
                            </div>

                            {/* Summary */}
                            <div>
                              <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                Summary
                              </label>
                              <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                {extractedMeta.summary || 'No summary generated'}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Section 2: Classification */}
                  <div className={`
                    rounded-xl border overflow-hidden
                    ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}
                  `}>
                    <button
                      onClick={() => setExpandedMetaSections(prev => ({ ...prev, classification: !prev.classification }))}
                      className={`
                        w-full px-4 py-3 flex items-center justify-between
                        ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <Tag className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                        <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          Classification
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>
                          {extractedMeta.tags.length} tags
                        </span>
                      </div>
                      {expandedMetaSections.classification ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <AnimatePresence>
                      {expandedMetaSections.classification && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className={`px-4 pb-4 space-y-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'} pt-4`}>
                            {/* Tags */}
                            <div>
                              <label className={`text-xs font-medium mb-2 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                Tags
                              </label>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {extractedMeta.tags.map((tag, i) => (
                                  <span
                                    key={i}
                                    className={`
                                      px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1
                                      ${isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}
                                    `}
                                  >
                                    <Hash className="w-3 h-3" />
                                    {tag}
                                    <button
                                      onClick={() => {
                                        const newTags = extractedMeta.tags.filter((_, j) => j !== i)
                                        setExtractedMeta({ ...extractedMeta, tags: newTags })
                                      }}
                                      className="ml-1 hover:text-red-500"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newTag}
                                  onChange={(e) => setNewTag(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                  placeholder="Add tag..."
                                  className={`
                                    flex-1 px-3 py-1.5 rounded-lg border text-sm
                                    ${isDark
                                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                                      : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                                    }
                                  `}
                                />
                                <button
                                  onClick={handleAddTag}
                                  className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'}`}
                                >
                                  Add
                                </button>
                              </div>
                            </div>

                            {/* Topics & Subjects */}
                            {(extractedMeta.topics.length > 0 || extractedMeta.subjects.length > 0) && (
                              <div className="flex flex-wrap gap-4">
                                {extractedMeta.topics.length > 0 && (
                                  <div>
                                    <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                      Topics
                                    </label>
                                    <div className="flex flex-wrap gap-1">
                                      {extractedMeta.topics.map((topic, i) => (
                                        <span
                                          key={i}
                                          className={`px-2 py-0.5 rounded text-xs ${isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}
                                        >
                                          {topic}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {extractedMeta.subjects.length > 0 && (
                                  <div>
                                    <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                      Subjects
                                    </label>
                                    <div className="flex flex-wrap gap-1">
                                      {extractedMeta.subjects.map((subject, i) => (
                                        <span
                                          key={i}
                                          className={`px-2 py-0.5 rounded text-xs ${isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'}`}
                                        >
                                          {subject}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Section 3: Content Analysis */}
                  <div className={`
                    rounded-xl border overflow-hidden
                    ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}
                  `}>
                    <button
                      onClick={() => setExpandedMetaSections(prev => ({ ...prev, analysis: !prev.analysis }))}
                      className={`
                        w-full px-4 py-3 flex items-center justify-between
                        ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <BarChart3 className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                        <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          Content Analysis
                        </span>
                        <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                          {extractedMeta.wordCount} words • ~{extractedMeta.readingTime} min
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            triggerAnalysis()
                          }}
                          disabled={analyzing}
                          className={`
                            p-1 rounded transition-colors
                            ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}
                            ${analyzing ? 'opacity-50' : ''}
                          `}
                          title="Re-analyze content"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                        </button>
                        {expandedMetaSections.analysis ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedMetaSections.analysis && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className={`px-4 pb-4 space-y-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'} pt-4`}>
                            {/* Stats */}
                            <div className="flex gap-6">
                              <div className="flex items-center gap-2">
                                <FileTextIcon className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                                <div>
                                  <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>Words</span>
                                  <p className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                    {extractedMeta.wordCount.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                                <div>
                                  <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>Reading time</span>
                                  <p className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                    ~{extractedMeta.readingTime} min
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Technologies */}
                            {extractedMeta.entities.technologies.length > 0 && (
                              <div>
                                <label className={`text-xs font-medium mb-2 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                  <Code className="w-3 h-3 inline mr-1" />
                                  Technologies Detected
                                </label>
                                <div className="flex flex-wrap gap-1">
                                  {extractedMeta.entities.technologies.map((tech, i) => (
                                    <span
                                      key={i}
                                      className={`px-2 py-0.5 rounded text-xs ${isDark ? 'bg-violet-900/50 text-violet-300' : 'bg-violet-100 text-violet-700'}`}
                                    >
                                      {tech}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Keywords */}
                            {extractedMeta.keywords.length > 0 && (
                              <div>
                                <label className={`text-xs font-medium mb-2 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                  Keywords
                                </label>
                                <div className="flex flex-wrap gap-1">
                                  {extractedMeta.keywords.slice(0, 10).map((kw, i) => (
                                    <span
                                      key={i}
                                      className={`px-2 py-0.5 rounded text-xs ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}
                                    >
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Analyzing indicator when no metadata yet */}
              {analyzing && !extractedMeta && (
                <div className={`
                  mt-4 rounded-xl border p-4 flex items-center gap-3
                  ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}
                `}>
                  <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                  <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Analyzing content...
                  </span>
                </div>
              )}

              {/* Source Metadata Panel */}
              <div className={`mt-4 rounded-xl border p-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    <FileSignature className="w-4 h-4" />
                    Source Information
                  </h3>
                  <button
                    onClick={() => setShowSourceEdit(!showSourceEdit)}
                    className="text-xs text-cyan-500 hover:text-cyan-600 transition-colors"
                  >
                    {showSourceEdit ? 'Hide' : 'Edit'}
                  </button>
                </div>

                {/* Source Type Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Type:</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    sourceMetadata.sourceType === 'upload' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    sourceMetadata.sourceType === 'scrape' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                    sourceMetadata.sourceType === 'template' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {sourceMetadata.sourceType}
                  </span>
                </div>

                {/* Source URL */}
                {sourceMetadata.sourceUrl && (
                  <div className={`text-xs mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    <span className={isDark ? 'text-zinc-500' : 'text-zinc-600'}>Source URL:</span>
                    <a
                      href={sourceMetadata.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-cyan-500 hover:underline inline-flex items-center gap-1"
                    >
                      {sourceMetadata.sourceUrl.length > 50
                        ? sourceMetadata.sourceUrl.slice(0, 50) + '...'
                        : sourceMetadata.sourceUrl}
                      <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </div>
                )}

                {/* Source Filename */}
                {sourceMetadata.sourceFilename && (
                  <div className={`text-xs mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    <span className={isDark ? 'text-zinc-500' : 'text-zinc-600'}>Filename:</span>
                    <span className={`ml-1 font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      {sourceMetadata.sourceFilename}
                    </span>
                  </div>
                )}

                {/* Editable Creator Info */}
                {showSourceEdit && (
                  <div className={`mt-3 space-y-2 pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                    <div>
                      <label className={`text-xs mb-1 block ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                        Creator Name
                      </label>
                      <input
                        type="text"
                        value={sourceMetadata.creator}
                        onChange={(e) => {
                          const newName = e.target.value
                          setSourceMetadata(prev => ({
                            ...prev,
                            creator: newName,
                            creatorType: 'manual',
                          }))
                          updateCreatorInfo(newName)
                        }}
                        className={`w-full px-2 py-1 text-sm rounded border ${
                          isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                            : 'bg-white border-zinc-300 text-zinc-800'
                        }`}
                        placeholder="Enter creator name"
                      />
                    </div>
                  </div>
                )}

                {/* Creator/Uploader Display (when not editing) */}
                {!showSourceEdit && (
                  <div className="space-y-2">
                    {/* Created By - Original Author */}
                    <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      <div className="flex items-center gap-2">
                        <span className={isDark ? 'text-zinc-500' : 'text-zinc-600'}>Created by:</span>
                        <span className={`${isDark ? 'text-zinc-300' : 'text-zinc-700'} ${
                          sourceMetadata.creator === 'Unknown' ? 'italic opacity-70' : ''
                        }`}>
                          {sourceMetadata.creator}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                          sourceMetadata.creatorType === 'git'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : sourceMetadata.creatorType === 'scraped'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            : sourceMetadata.creatorType === 'unknown'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500'
                        }`}>
                          {sourceMetadata.creatorType === 'unknown' ? 'unverified' : sourceMetadata.creatorType}
                        </span>
                        {sourceMetadata.creatorVerified && (
                          <span className="text-emerald-500" title="Verified from source metadata">✓</span>
                        )}
                      </div>

                      {/* "I am the creator" toggle for uploads/scrapes */}
                      {(sourceMetadata.sourceType === 'upload' || sourceMetadata.sourceType === 'scrape') && (
                        <label className={`flex items-center gap-2 mt-2 cursor-pointer ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                          <input
                            type="checkbox"
                            checked={sourceMetadata.uploaderIsCreator || false}
                            onChange={(e) => {
                              const isCreator = e.target.checked
                              setSourceMetadata(prev => ({
                                ...prev,
                                uploaderIsCreator: isCreator,
                                creator: isCreator ? (prev.uploader || prev.creator) : (prev.scrapedAuthor || 'Unknown'),
                                creatorType: isCreator ? prev.uploaderType || 'session' : (prev.scrapedAuthor ? 'scraped' : 'unknown'),
                              }))
                            }}
                            className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-600 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="text-xs">I created this content</span>
                        </label>
                      )}
                    </div>

                    {/* Uploaded By - Who added to system */}
                    {sourceMetadata.uploader && sourceMetadata.uploader !== sourceMetadata.creator && (
                      <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        <span className={isDark ? 'text-zinc-500' : 'text-zinc-600'}>Uploaded by:</span>
                        <span className={`ml-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          {sourceMetadata.uploader}
                        </span>
                        {sourceMetadata.uploaderType === 'git' && (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            GitHub
                          </span>
                        )}
                      </div>
                    )}

                    {/* Connect GitHub CTA */}
                    {(!sourceMetadata.uploaderType || sourceMetadata.uploaderType !== 'git') && (
                      <button
                        onClick={() => {
                          // Open GitHub PAT settings or trigger connection
                          window.open('https://github.com/settings/tokens/new?description=Fabric%20Codex&scopes=public_repo', '_blank')
                        }}
                        className={`
                          flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg mt-1
                          ${isDark
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-800'
                          }
                        `}
                        title="Connect your GitHub account to automatically sync your identity as the uploader"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.113.793-.26.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.796 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        Connect GitHub
                      </button>
                    )}
                  </div>
                )}

                {/* Timestamps */}
                <div className={`text-xs mt-3 space-y-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                  <div>Created: {new Date(sourceMetadata.createdAt).toLocaleString()}</div>
                  {sourceMetadata.uploadedAt && (
                    <div>Uploaded: {new Date(sourceMetadata.uploadedAt).toLocaleString()}</div>
                  )}
                </div>
              </div>

              {/* License Panel - shown based on preferences */}
              {showLicenseOnCreate && (
                <div className={`mt-4 rounded-xl border p-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      <Copyright className="w-4 h-4" />
                      Content License
                    </h3>
                    <button
                      onClick={() => setShowLicenseEdit(!showLicenseEdit)}
                      className="text-xs text-cyan-500 hover:text-cyan-600 transition-colors"
                    >
                      {showLicenseEdit ? 'Hide' : 'Edit'}
                    </button>
                  </div>

                  {/* License Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>License:</span>
                    <LicenseBadge license={selectedLicense} size="sm" />
                    {detectedLicense && detectedLicense.license === selectedLicense && autoDetectLicenseEnabled && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        <Sparkles className="w-2.5 h-2.5" />
                        Auto-detected
                      </span>
                    )}
                  </div>

                  {/* License Picker (when editing) */}
                  {showLicenseEdit && (
                    <div className={`mt-3 pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                      <LicensePicker
                        value={selectedLicense}
                        onChange={setSelectedLicense}
                        detectedLicense={autoDetectLicenseEnabled ? detectedLicense : null}
                        showDetectedBadge={autoDetectLicenseEnabled}
                        customText={customLicenseText}
                        onCustomTextChange={setCustomLicenseText}
                        compact={false}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Auto-Tag Configuration Panel */}
              <div className={`
                mt-4 rounded-xl border overflow-hidden
                ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}
              `}>
                <button
                  onClick={() => setShowAutoTagSettings(!showAutoTagSettings)}
                  className={`
                    w-full px-4 py-3 flex items-center justify-between
                    ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <Brain className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      Auto-Tagging Settings
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      autoTagConfig.documentAutoTag 
                        ? isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                        : isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {autoTagConfig.documentAutoTag ? 'On' : 'Off'}
                    </span>
                  </div>
                  {showAutoTagSettings ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                <AnimatePresence>
                  {showAutoTagSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`px-4 pb-4 space-y-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'} pt-4`}>
                        {/* Document Auto-Tag Toggle */}
                        <div className="flex items-center justify-between">
                          <div>
                            <label className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                              Document Auto-Tag
                            </label>
                            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                              Automatically suggest tags for the entire document
                            </p>
                          </div>
                          <button
                            onClick={() => setAutoTagConfig({
                              ...autoTagConfig,
                              documentAutoTag: !autoTagConfig.documentAutoTag,
                              // If turning off doc tags, also turn off block tags
                              blockAutoTag: !autoTagConfig.documentAutoTag ? false : autoTagConfig.blockAutoTag,
                            })}
                            className={`
                              w-11 h-6 rounded-full relative transition-colors
                              ${autoTagConfig.documentAutoTag 
                                ? 'bg-emerald-500' 
                                : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
                              }
                            `}
                          >
                            <span className={`
                              absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform
                              ${autoTagConfig.documentAutoTag ? 'left-5' : 'left-0.5'}
                            `} />
                          </button>
                        </div>

                        {/* Block Auto-Tag Toggle (disabled if doc auto-tag is off) */}
                        <div className={`flex items-center justify-between ${!autoTagConfig.documentAutoTag ? 'opacity-50' : ''}`}>
                          <div>
                            <label className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                              Block-Level Auto-Tag
                            </label>
                            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                              Suggest additional tags for individual sections
                            </p>
                          </div>
                          <button
                            disabled={!autoTagConfig.documentAutoTag}
                            onClick={() => setAutoTagConfig({
                              ...autoTagConfig,
                              blockAutoTag: !autoTagConfig.blockAutoTag,
                            })}
                            className={`
                              w-11 h-6 rounded-full relative transition-colors
                              ${autoTagConfig.blockAutoTag && autoTagConfig.documentAutoTag
                                ? 'bg-emerald-500' 
                                : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
                              }
                            `}
                          >
                            <span className={`
                              absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform
                              ${autoTagConfig.blockAutoTag && autoTagConfig.documentAutoTag ? 'left-5' : 'left-0.5'}
                            `} />
                          </button>
                        </div>

                        {/* Prefer Existing Tags */}
                        <div className="flex items-center justify-between">
                          <div>
                            <label className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                              Prefer Existing Tags
                            </label>
                            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                              Prioritize tags already in the codex over new ones
                            </p>
                          </div>
                          <button
                            onClick={() => setAutoTagConfig({
                              ...autoTagConfig,
                              preferExistingTags: !autoTagConfig.preferExistingTags,
                            })}
                            className={`
                              w-11 h-6 rounded-full relative transition-colors
                              ${autoTagConfig.preferExistingTags 
                                ? 'bg-emerald-500' 
                                : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
                              }
                            `}
                          >
                            <span className={`
                              absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform
                              ${autoTagConfig.preferExistingTags ? 'left-5' : 'left-0.5'}
                            `} />
                          </button>
                        </div>

                        {/* Max Tags Settings */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                              Max Doc Tags
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={autoTagConfig.maxNewTagsPerDocument}
                              onChange={(e) => setAutoTagConfig({
                                ...autoTagConfig,
                                maxNewTagsPerDocument: parseInt(e.target.value) || 10,
                              })}
                              className={`
                                w-full px-3 py-1.5 rounded-lg border text-sm
                                ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-zinc-50 border-zinc-300 text-zinc-900'}
                              `}
                            />
                          </div>
                          <div>
                            <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                              Max Block Tags
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={autoTagConfig.maxNewTagsPerBlock}
                              onChange={(e) => setAutoTagConfig({
                                ...autoTagConfig,
                                maxNewTagsPerBlock: parseInt(e.target.value) || 3,
                              })}
                              className={`
                                w-full px-3 py-1.5 rounded-lg border text-sm
                                ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-zinc-50 border-zinc-300 text-zinc-900'}
                              `}
                            />
                          </div>
                        </div>

                        {/* Info text */}
                        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'} leading-relaxed`}>
                          Auto-tagging uses NLP to suggest relevant tags. When &quot;Prefer Existing Tags&quot; is on, 
                          the system will reuse tags from your codex instead of creating new ones.
                          Block-level tags are only enabled when document auto-tagging is on.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Visualization Generation Settings - Compact */}
              <div className={`
                mt-3 rounded-lg border overflow-hidden
                ${isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-white'}
              `}>
                <div className={`
                  px-3 py-2 flex items-center justify-between gap-2
                  ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'}
                `}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Layers className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          Generate Visualization
                        </span>
                        <button
                          onClick={() => setShowVizInfo(!showVizInfo)}
                          className={`p-0.5 rounded-full transition-colors ${
                            isDark ? 'hover:bg-zinc-700 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'
                          }`}
                          title="Learn about visualization generation"
                        >
                          <HelpCircle className="w-3 h-3" />
                        </button>
                      </div>
                      <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-500'} truncate`}>
                        Auto-generate visual representations
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch - Smaller */}
                  <button
                    onClick={() => setVizConfig({ ...vizConfig, enabled: !vizConfig.enabled })}
                    className={`
                      w-9 h-5 rounded-full relative transition-colors shrink-0
                      ${vizConfig.enabled
                        ? 'bg-purple-500'
                        : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
                      }
                    `}
                    title={vizConfig.enabled ? 'Disable visualization generation' : 'Enable visualization generation'}
                  >
                    <span className={`
                      absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform
                      ${vizConfig.enabled ? 'left-4' : 'left-0.5'}
                    `} />
                  </button>
                </div>

                {/* Info Popover - Compact */}
                <AnimatePresence>
                  {showVizInfo && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`px-3 py-2 border-t ${isDark ? 'border-zinc-800 bg-zinc-800/50' : 'border-zinc-100 bg-zinc-50'}`}>
                        <div className="flex items-start gap-2">
                          <Sparkles className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
                          <div className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-600'} space-y-1.5`}>
                            <p className="font-medium text-[11px]">How Visualization Works</p>
                            <p>
                              Frame&apos;s API analyzes content and generates visual representations
                              stored alongside your strand.
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {['Mind Map', 'Flowchart', 'Timeline', 'Hierarchy', 'Network'].map(type => (
                                <span key={type} className={`px-1.5 py-0.5 rounded text-[9px] ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`}>
                                  {type}
                                </span>
                              ))}
                            </div>
                            <p className={`${isDark ? 'text-zinc-500' : 'text-zinc-500'} italic`}>
                              Uses LLM credits depending on plan.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Preset Selection - Compact grid */}
                <AnimatePresence>
                  {vizConfig.enabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`px-3 py-2 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
                        <label className={`text-[10px] font-medium mb-1.5 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                          Preset
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { value: 'mindmap', label: 'Mind Map', icon: '🧠' },
                            { value: 'flowchart', label: 'Flow', icon: '📊' },
                            { value: 'timeline', label: 'Time', icon: '📅' },
                            { value: 'hierarchy', label: 'Hier.', icon: '🏛️' },
                            { value: 'network', label: 'Net', icon: '🕸️' },
                            { value: 'auto', label: 'Auto', icon: '✨' },
                          ].map(preset => (
                            <button
                              key={preset.value}
                              onClick={() => setVizConfig({
                                ...vizConfig,
                                preset: preset.value as typeof vizConfig.preset
                              })}
                              className={`
                                px-1.5 py-1 rounded border text-[10px] font-medium
                                flex items-center justify-center gap-1 transition-all
                                ${vizConfig.preset === preset.value
                                  ? isDark
                                    ? 'bg-purple-900/40 border-purple-600 text-purple-300'
                                    : 'bg-purple-100 border-purple-400 text-purple-700'
                                  : isDark
                                    ? 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800'
                                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                                }
                              `}
                            >
                              <span className="text-[11px]">{preset.icon}</span>
                              <span>{preset.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Section 4: Publishing & Auto-Categorization */}
              <div className={`
                mt-4 rounded-xl border overflow-hidden
                ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}
              `}>
                <button
                  onClick={() => setExpandedMetaSections(prev => ({ ...prev, publishing: !prev.publishing }))}
                  className={`
                    w-full px-4 py-3 flex items-center justify-between
                    ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <Inbox className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      Publishing &amp; Auto-Categorization
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>
                      {targetPath}
                    </span>
                  </div>
                  {expandedMetaSections.publishing ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                <AnimatePresence>
                  {expandedMetaSections.publishing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`px-4 pb-4 space-y-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'} pt-4`}>
                        {/* Current Target Path */}
                        <div>
                          <label className={`text-xs font-medium mb-2 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            Target Path
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={targetPath}
                              onChange={(e) => setTargetPath(e.target.value)}
                              className={`
                                flex-1 px-3 py-1.5 rounded-lg border text-sm font-mono
                                ${isDark
                                  ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                                  : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                                }
                              `}
                            />
                            <button
                              onClick={() => setTargetPath('weaves/inbox/')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                                targetPath === 'weaves/inbox/'
                                  ? isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
                                  : isDark ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                              }`}
                              title="Reset to inbox"
                            >
                              <Inbox className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* How It Works */}
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                          <p className={`text-xs font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            How Auto-Categorization Works
                          </p>
                          <div className={`text-xs space-y-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            <div className="flex items-start gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-cyan-900/50 text-cyan-400' : 'bg-cyan-100 text-cyan-600'}`}>1</div>
                              <p><strong>Publish to Inbox</strong> — New strands land in <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">weaves/inbox/</code> by default</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>2</div>
                              <p><strong>NLP Analysis</strong> — GitHub Actions analyzes content, tags, and topics to suggest a category</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>3</div>
                              <p><strong>Auto-Move</strong> — If confidence &ge;80%, a PR is created and auto-merged to move the strand</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>4</div>
                              <p><strong>Manual Review</strong> — Low confidence strands get a &quot;needs-triage&quot; label for human review</p>
                            </div>
                          </div>
                        </div>

                        {/* Known Categories */}
                        <div>
                          <label className={`text-xs font-medium mb-2 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            Known Categories
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {[
                              { path: 'weaves/wiki/tutorials/', label: 'Tutorials' },
                              { path: 'weaves/wiki/reference/', label: 'Reference' },
                              { path: 'weaves/wiki/concepts/', label: 'Concepts' },
                              { path: 'weaves/wiki/best-practices/', label: 'Best Practices' },
                              { path: 'weaves/notes/', label: 'Notes' },
                              { path: 'weaves/projects/', label: 'Projects' },
                              { path: 'weaves/research/', label: 'Research' },
                            ].map(cat => (
                              <button
                                key={cat.path}
                                onClick={() => setTargetPath(cat.path)}
                                className={`
                                  px-2 py-1 rounded text-xs font-medium transition-colors
                                  ${targetPath === cat.path
                                    ? isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
                                    : isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                  }
                                `}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tip */}
                        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'} leading-relaxed`}>
                          <strong>Tip:</strong> Use the inbox for uncertain categorization. The system will analyze
                          your content and suggest the best location. You can also select a category directly above
                          if you know where it belongs.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
          
          {/* Preview panel */}
          {inputMode !== 'template' && (viewMode === 'preview' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'lg:w-1/2' : 'w-full'} flex flex-col min-h-0 flex-1`}>
              <div className={`
                rounded-xl border overflow-hidden flex-1 flex flex-col min-h-0
                ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}
              `}>
                <div className={`px-4 py-2 border-b flex items-center justify-between flex-shrink-0 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                  <div className="flex items-center gap-2">
                    <Eye className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                    <span className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Preview</span>
                  </div>
                  {extractedMeta && (
                    <span className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      + frontmatter
                    </span>
                  )}
                </div>

                <div className={`
                  p-6 flex-1 min-h-0 overflow-y-auto
                  prose prose-sm max-w-none
                  ${isDark ? 'prose-invert' : ''}
                `}>
                  <MemoizedMarkdownPreview content={previewContent} isDark={isDark ?? false} />
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
      
      {/* Prompt Picker Modal - PromptPicker has its own AnimatePresence and modal styling */}
      <PromptPicker
        isOpen={showPromptPicker}
        onSelectPrompt={handleSelectPrompt}
        onClose={() => setShowPromptPicker(false)}
        theme={isDark ? 'dark' : 'light'}
      />

      {/* Location Picker Modal */}
      <AnimatePresence>
        {showLocationPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowLocationPicker(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`
                relative z-10 rounded-2xl shadow-2xl overflow-hidden
                w-full max-w-sm h-[70dvh] max-h-[600px]
                ${isDark ? 'bg-zinc-900' : 'bg-white'}
              `}
            >
              {/* Close button */}
              <button
                onClick={() => setShowLocationPicker(false)}
                className={`
                  absolute top-3 right-3 z-10 p-2 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
                `}
              >
                <X className="w-5 h-5" />
              </button>

              <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                }>
                  <LocationPickerSidebar
                    targetPath={targetPath}
                    onSelectPath={(path) => {
                      setTargetPath(path)
                      setShowLocationPicker(false)
                    }}
                    isDark={isDark}
                    onCreateLoom={(parentPath, loomName) => {
                      // Create a new loom path
                      const newPath = `${parentPath}${loomName}/`
                      setTargetPath(newPath)
                    }}
                    onCreateWeave={(weaveName) => {
                      // Create a new weave path
                      const slug = weaveName.toLowerCase().replace(/\s+/g, '-')
                      const newPath = `weaves/${slug}/`
                      setTargetPath(newPath)
                    }}
                    showAutoCategorize={true}
                    autoCategorize={targetPath === 'weaves/inbox/'}
                    onToggleAutoCategorize={(enabled) => {
                      if (enabled) {
                        setTargetPath('weaves/inbox/')
                  }
                }}
                suggestionReason={targetPath === 'weaves/inbox/' ? 'Content will be analyzed and categorized automatically after creation' : undefined}
                  />
                </Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Picker Modal - For browsing all templates including remote */}
      {showTemplatePicker && (
        <TemplatePickerModal
          onClose={() => setShowTemplatePicker(false)}
          onSelectTemplate={(content, fileName, metadata) => {
            // Apply the selected template content
            setContent(content)
            setFileName(fileName)
            setShowTemplatePicker(false)
            setInputMode('write')
          }}
          isDark={isDark}
        />
      )}

    </div>
  )
}

console.log('[StrandCreatorClient] StrandCreatorContent function defined', Date.now())

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTED WRAPPER WITH SUSPENSE
   Wraps StrandCreatorContent in Suspense for proper static export handling
═══════════════════════════════════════════════════════════════════════════ */

console.log('[StrandCreatorClient] About to define export default...', Date.now())

export default function StrandCreatorClient() {
  console.log('[StrandCreatorClient] export default RENDER', Date.now())
  return (
    <Suspense fallback={<StrandCreatorLoading />}>
      <StrandCreatorContent />
    </Suspense>
  )
}

console.log('[StrandCreatorClient] ============================================')
console.log('[StrandCreatorClient] MODULE LOADING COMPLETE', Date.now())
console.log('[StrandCreatorClient] ============================================')