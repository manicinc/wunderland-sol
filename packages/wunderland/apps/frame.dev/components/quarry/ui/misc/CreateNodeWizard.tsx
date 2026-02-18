/**
 * Create Node Wizard
 * @module codex/ui/CreateNodeWizard
 *
 * @remarks
 * Multi-step wizard for creating new Codex nodes (weaves, looms, strands).
 * Uses the modular template system for strand creation.
 * Now includes PDF import with illustration generation.
 *
 * Features:
 * - Node type selection based on parent level
 * - Template browsing with search, categories, favorites
 * - Form generation with validation
 * - Frontmatter preview and copying
 * - Seeded metadata from parent configs
 * - PDF import with smart chunking
 * - AI illustration generation with character consistency
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FolderTree,
  FileText,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  HelpCircle,
  Check,
  AlertCircle,
  Sparkles,
  Tag,
  Copy,
  Zap,
  Eye,
  EyeOff,
  Upload,
  FileUp,
  Image,
  Palette,
  Users,
  Play,
  Pause,
  Square,
  SkipForward,
  Loader2,
  Settings,
  BookOpen,
  DollarSign,
  Link,
  PenTool,
  GitBranch,
  StickyNote,
  Hash,
} from 'lucide-react'
import type { LoomConfig, WeaveConfig } from '../../lib/nodeConfig'
import { 
  TemplateSelector,
  recordTemplateUsage,
  generateFrontmatter as generateTemplateFrontmatter,
  validateFormData,
  type LoadedTemplate,
  type TemplateFormData,
} from '../../templates'
import { hasPAT } from '@/lib/github/patStorage'
import StyleConfigWizard from './StyleConfigWizard'
import WorthinessPreviewModal, { type WorthinessPreviewItem } from './WorthinessPreviewModal'
import ValidatedFormField, { ErrorSummary, type SchemaField } from '../common/ValidatedFormField'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout'
import type { WorkStyleProfile } from '@/lib/images/workStyleProfile'
import dynamic from 'next/dynamic'

// Dynamic import for MobileCreateWizardSheet
const MobileCreateWizardSheet = dynamic(() => import('../mobile/MobileCreateWizardSheet'), {
  ssr: false,
})

// Dynamic import for WhiteboardCanvas to avoid SSR issues with tldraw
const WhiteboardCanvas = dynamic(() => import('../canvas/WhiteboardCanvas'), {
  ssr: false,
  loading: () => <div className="p-6 text-gray-500 animate-pulse">Loading canvas...</div>
})

// Dynamic import for MindMapEditor to avoid SSR issues with React Flow
const MindMapEditor = dynamic(() => import('../diagrams/MindMapEditor'), {
  ssr: false,
  loading: () => <div className="p-6 text-gray-500 animate-pulse">Loading mind map editor...</div>
})

// Dynamic import for TemplateBuilder
const TemplateBuilder = dynamic(() => import('../templates/TemplateBuilder'), {
  ssr: false,
  loading: () => <div className="p-6 text-gray-500 animate-pulse">Loading template builder...</div>
})

// ============================================================================
// Types
// ============================================================================

type NodeType = 'weave' | 'loom' | 'strand' | 'supernote' | 'pdf-import' | 'canvas' | 'mindmap'

// Draft storage key for auto-saving
const DRAFT_STORAGE_KEY = 'codex-create-strand-draft'

interface DraftData {
  step: WizardStep
  selectedType: NodeType | null
  selectedTemplateId: string | null
  formData: TemplateFormData
  timestamp: number
}
type WizardStep =
  | 'select-type'
  | 'select-template'
  | 'form'
  // Canvas flow
  | 'canvas'
  // Mind Map flow
  | 'mindmap'
  // Supernote flow (supertag-first)
  | 'supernote-supertag'
  | 'supernote-form'
  // PDF Import flow
  | 'pdf-upload'
  | 'pdf-configure'
  | 'pdf-characters'
  | 'pdf-generating'

/** PDF conversion modes */
type PDFConversionMode = 'single-file' | 'per-page' | 'smart-chunk'

/** Illustration generation granularity */
type IllustrationGranularity = 'chunk' | 'block'

/** PDF chunk from conversion */
interface PDFChunk {
  id: string
  title: string
  content: string
  wordCount: number
  pageRange: { start: number; end: number }
  illustrationPoints: number[]
}

/** Converted PDF result */
interface ConvertedPDF {
  filename: string
  metadata: {
    title: string
    author?: string
    totalPages: number
    totalWords: number
    tocPages?: number[]
    covers?: { front?: number; back?: number }
    limitApplied?: boolean
    processedPages?: number
  }
  chunks: PDFChunk[]
}

/** Character definition for style memory */
interface CharacterDef {
  name: string
  description: string
  visualTraits: string[]
  referenceImage?: string
}

/** Setting definition for style memory */
interface SettingDef {
  name: string
  description: string
  visualStyle: string[]
}

/** Generation job status */
interface GenerationJob {
  id: string
  status: 'pending' | 'running' | 'paused' | 'batch-complete' | 'completed' | 'cancelled' | 'failed'
  completedItems: number
  totalItems: number
  currentBatch: number
  batchSize: number
  error?: string
}

/** OpenAI quality options */
type OpenAIQuality = 'standard' | 'hd'

/** OpenAI size options */
type OpenAISize = '1024x1024' | '1792x1024' | '1024x1792'

/** Replicate model options */
type ReplicateModel = 'flux-schnell' | 'flux-dev' | 'flux-pro'

/** Replicate aspect ratio options */
type ReplicateAspect = '1:1' | '16:9' | '9:16'

/** Chunk selection state */
interface ChunkSelection {
  id: string
  selected: boolean
}

interface NodeSchema {
  type: NodeType
  name: string
  description: string
  icon: React.ReactNode
  color: string
  fields: SchemaField[]
}

// SchemaField type is imported from ValidatedFormField

interface SeededMetadata {
  tags?: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  subjects?: string[]
  loomName?: string
  weaveName?: string
  loomDescription?: string
  suggestedTopics?: string[]
}

interface CreateNodeWizardProps {
  isOpen: boolean
  onClose: () => void
  parentPath?: string
  parentLevel?: 'root' | 'weave' | 'loom'
  onCreateNode: (type: NodeType, data: Record<string, unknown>, path: string) => Promise<void>
  parentLoomConfig?: LoomConfig | null
  parentWeaveConfig?: WeaveConfig | null
  onCopyFrontmatter?: (content: string) => void
}

// ============================================================================
// Constants
// ============================================================================

const NODE_SCHEMAS: Record<NodeType, NodeSchema> = {
  'pdf-import': {
    type: 'pdf-import',
    name: 'Import from PDF',
    description: 'Convert PDF to illustrated content with AI-generated images',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'purple',
    fields: [], // PDF import uses custom flow, not standard fields
  },
  weave: {
    type: 'weave',
    name: 'Weave',
    description: 'A top-level knowledge domain or subject area',
    icon: <FolderTree className="w-5 h-5" />,
    color: 'emerald',
    fields: [
      {
        name: 'name',
        label: 'Weave Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., machine-learning, philosophy',
        tooltip: 'URL-safe identifier used in paths. Use lowercase letters, numbers, and hyphens only.',
      },
      {
        name: 'title',
        label: 'Display Title',
        type: 'text',
        required: true,
        placeholder: 'e.g., Machine Learning, Philosophy',
        tooltip: 'Human-readable title shown in navigation and headers. Can include spaces and mixed case.',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
        placeholder: 'Brief description of this knowledge domain',
        tooltip: 'A brief summary of what this weave covers. Displayed in previews and search results.',
      },
      {
        name: 'icon',
        label: 'Icon',
        type: 'text',
        required: false,
        placeholder: 'Lucide icon name (e.g., Brain, BookOpen)',
        tooltip: 'Icon name from Lucide icons (lucide.dev). Used in the sidebar and navigation.',
      },
    ],
  },
  loom: {
    type: 'loom',
    name: 'Loom',
    description: 'A topic or module within a weave',
    icon: <Layers className="w-5 h-5" />,
    color: 'cyan',
    fields: [
      {
        name: 'name',
        label: 'Loom Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., neural-networks, ethics',
        tooltip: 'URL-safe identifier used in paths. Use lowercase letters, numbers, and hyphens only.',
      },
      {
        name: 'title',
        label: 'Display Title',
        type: 'text',
        required: true,
        placeholder: 'e.g., Neural Networks, Ethics',
        tooltip: 'Human-readable title shown in navigation. Can include spaces and proper capitalization.',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
        placeholder: 'What does this loom cover?',
        tooltip: 'Describes the topic this loom covers. Helps users understand the scope of content within.',
      },
      {
        name: 'difficulty',
        label: 'Difficulty',
        type: 'select',
        required: false,
        placeholder: 'Select difficulty level',
        options: ['beginner', 'intermediate', 'advanced'],
        defaultValue: 'beginner',
        tooltip: 'Sets the default difficulty for strands in this loom. Individual strands can override this.',
      },
    ],
  },
  strand: {
    type: 'strand',
    name: 'Strand',
    description: 'An individual piece of content (article, note, etc.)',
    icon: <FileText className="w-5 h-5" />,
    color: 'amber',
    fields: [
      {
        name: 'name',
        label: 'File Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., introduction, getting-started',
        tooltip: 'URL-safe filename without the .md extension. Use lowercase and hyphens.',
      },
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        placeholder: 'Article title',
        tooltip: 'The main heading displayed at the top of the content. Be descriptive and engaging.',
      },
      {
        name: 'summary',
        label: 'Summary',
        type: 'textarea',
        required: false,
        placeholder: 'Brief summary of this strand',
        tooltip: 'A 1-2 sentence overview shown in previews and search results. Helps readers decide what to read.',
      },
      {
        name: 'tags',
        label: 'Tags',
        type: 'tags',
        required: false,
        placeholder: 'Add relevant tags',
        tooltip: 'Keywords for categorization and search. Separate multiple tags with commas.',
      },
      {
        name: 'difficulty',
        label: 'Difficulty',
        type: 'select',
        required: false,
        placeholder: 'Select difficulty level',
        options: ['beginner', 'intermediate', 'advanced'],
        defaultValue: 'beginner',
        tooltip: 'Helps readers find content matching their skill level. Inherits from parent loom if not set.',
      },
    ],
  },
  supernote: {
    type: 'supernote',
    name: 'Supernote',
    description: 'Compact notecard requiring a supertag for structured capture',
    icon: <StickyNote className="w-5 h-5" />,
    color: 'orange',
    fields: [
      {
        name: 'primarySupertag',
        label: 'Supertag',
        type: 'text',
        required: true,
        placeholder: 'e.g., task, idea, book, person',
        tooltip: 'The primary supertag that provides structure. Required for all supernotes.',
      },
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        placeholder: 'Supernote title',
        tooltip: 'Brief title for this notecard. Keep it concise.',
      },
      {
        name: 'content',
        label: 'Content',
        type: 'textarea',
        required: false,
        placeholder: 'Quick note content (keep it brief)',
        tooltip: 'Content for the notecard. Supernotes are designed for short, focused notes.',
      },
      {
        name: 'cardSize',
        label: 'Card Size',
        type: 'select',
        required: false,
        placeholder: 'Select card size',
        options: ['3x5', '4x6', '5x7', 'compact', 'square'],
        defaultValue: '3x5',
        tooltip: 'The size preset for this supernote card. 3x5 is the standard index card size.',
      },
      {
        name: 'supernoteStyle',
        label: 'Visual Style',
        type: 'select',
        required: false,
        placeholder: 'Select visual style',
        options: ['paper', 'minimal', 'colored', 'glass', 'terminal'],
        defaultValue: 'paper',
        tooltip: 'The visual appearance of the notecard.',
      },
      {
        name: 'tags',
        label: 'Tags',
        type: 'tags',
        required: false,
        placeholder: 'Add relevant tags',
        tooltip: 'Additional tags beyond the supertag. Separate with commas.',
      },
    ],
  },
  canvas: {
    type: 'canvas',
    name: 'Canvas / Whiteboard',
    description: 'Create visual content with infinite canvas drawing',
    icon: <PenTool className="w-5 h-5" />,
    color: 'rose',
    fields: [
      {
        name: 'name',
        label: 'File Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., diagram, sketch, mindmap',
        tooltip: 'URL-safe filename for the canvas file. Use lowercase and hyphens.',
      },
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        placeholder: 'Drawing title',
        tooltip: 'Descriptive title for this visual content. Shown in navigation and when shared.',
      },
    ],
  },
  mindmap: {
    type: 'mindmap',
    name: 'Mind Map',
    description: 'Create interactive node-based diagrams and mind maps',
    icon: <GitBranch className="w-5 h-5" />,
    color: 'violet',
    fields: [
      {
        name: 'name',
        label: 'File Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., concepts, brainstorm, overview',
        tooltip: 'URL-safe filename for the mind map. Use lowercase and hyphens.',
      },
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        placeholder: 'Mind map title',
        tooltip: 'The main title displayed above the mind map. Describes the central topic or theme.',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        required: false,
        placeholder: 'What is this mind map about?',
        tooltip: 'Optional context about what this mind map explores or organizes.',
      },
    ],
  },
}

const COLOR_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-500 text-white',
  cyan: 'bg-cyan-500 text-white',
  amber: 'bg-amber-500 text-white',
  purple: 'bg-purple-500 text-white',
  rose: 'bg-rose-500 text-white',
  violet: 'bg-violet-500 text-white',
  orange: 'bg-orange-500 text-white',
}

/** Image provider options */
const IMAGE_PROVIDERS = [
  { id: 'openai', name: 'OpenAI DALL-E 3', cost: '$0.04/image', default: true },
  { id: 'replicate', name: 'Replicate Flux', cost: '$0.003/image', default: false },
] as const

/** Conversion mode options */
const CONVERSION_MODES: { id: PDFConversionMode; name: string; description: string }[] = [
  { id: 'smart-chunk', name: 'Smart Chunking', description: 'Auto-detect chapters & sections (recommended)' },
  { id: 'per-page', name: 'Per Page', description: 'One chunk per PDF page' },
  { id: 'single-file', name: 'Single File', description: 'Entire PDF as one document' },
]

// ============================================================================
// Helper Functions
// ============================================================================

function extractSeededMetadata(
  parentPath: string,
  loomConfig?: LoomConfig | null,
  weaveConfig?: WeaveConfig | null
): SeededMetadata {
  const pathParts = parentPath.split('/')
  const weaveName = pathParts[1]
  const loomName = pathParts.length > 2 ? pathParts[pathParts.length - 1] : undefined
  
  const seeded: SeededMetadata = { weaveName, loomName }
  
  if (loomConfig) {
    if (loomConfig.metadata?.tags) seeded.tags = loomConfig.metadata.tags
    if (loomConfig.metadata?.difficulty) seeded.difficulty = loomConfig.metadata.difficulty
    if (loomConfig.description) seeded.loomDescription = loomConfig.description
    if (loomConfig.name) seeded.loomName = loomConfig.name
  }
  
  if (weaveConfig) {
    if (weaveConfig.metadata?.tags) {
      seeded.tags = [...(seeded.tags || []), ...weaveConfig.metadata.tags]
    }
    if (weaveConfig.name) seeded.weaveName = weaveConfig.name
  }
  
  if (seeded.tags) seeded.tags = [...new Set(seeded.tags)]
  
  seeded.suggestedTopics = pathParts
    .slice(1)
    .filter(p => p && !['looms', 'strands'].includes(p))
    .map(p => p.replace(/-/g, ' '))
  
  return seeded
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Node type selection card */
function NodeTypeCard({
  schema,
  onClick,
  disabled = false,
}: {
  schema: NodeSchema
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full p-4 rounded-xl border-2 text-left transition-all group
        ${disabled 
          ? 'opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800' 
          : 'border-zinc-200 dark:border-zinc-700 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-lg'}
      `}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${COLOR_CLASSES[schema.color]}`}>
          {schema.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
            {schema.name}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {schema.description}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.button>
  )
}

// FormField component removed - now using ValidatedFormField from './ValidatedFormField'

/** Frontmatter preview panel */
function FrontmatterPreview({
  content,
  onCopy,
  copied,
}: {
  content: string
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Frontmatter Preview
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-3 text-xs font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-900 dark:bg-zinc-950 overflow-x-auto max-h-48">
        {content}
      </pre>
    </div>
  )
}

// ============================================================================
// PDF Import Sub-Components
// ============================================================================

/** PDF file upload dropzone */
function PDFUploadStep({
  onFileSelect,
  isUploading,
  error,
}: {
  onFileSelect: (file: File) => void
  isUploading: boolean
  error?: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.type === 'application/pdf' || file.type === 'application/epub+zip' || file.name.toLowerCase().endsWith('.epub'))) {
      onFileSelect(file)
    }
  }, [onFileSelect])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
  }, [onFileSelect])

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Upload a PDF or EPUB to convert it to illustrated markdown content.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all
          ${isDragging
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            : 'border-zinc-300 dark:border-zinc-700 hover:border-purple-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.epub,application/pdf,application/epub+zip"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3 text-center">
          {isUploading ? (
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          ) : (
            <FileUp className="w-10 h-10 text-zinc-400" />
          )}
          <div>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              {isUploading ? 'Converting...' : 'Drop PDF/EPUB here or click to browse'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Supports .pdf and .epub files up to 50MB
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}
    </div>
  )
}

/** PDF configuration step */
function PDFConfigureStep({
  convertedPDF,
  conversionMode,
  setConversionMode,
  illustrationGranularity,
  setIllustrationGranularity,
  smartIllustrationSkip,
  setSmartIllustrationSkip,
  provider,
  setProvider,
  batchSize,
  setBatchSize,
  // Advanced provider options
  openaiQuality,
  setOpenaiQuality,
  openaiSize,
  setOpenaiSize,
  replicateModel,
  setReplicateModel,
  replicateAspect,
  setReplicateAspect,
  // Chunk selection
  chunkSelections,
  setChunkSelections,
  showChunkSelection,
  setShowChunkSelection,
  pageLimit,
  setPageLimit,
  imagePageLimit,
  setImagePageLimit,
  capApplied,
  setCapApplied,
  patAvailable,
  appliedPageLimit,
  // Cost limit
  costLimit,
  setCostLimit,
  // Advanced options
  webhookUrl,
  setWebhookUrl,
  webhookSecret,
  setWebhookSecret,
  showAdvanced,
  setShowAdvanced,
  // Worthiness analysis
  onAutoSelect,
  useLLMForWorthiness,
  setUseLLMForWorthiness,
  llmProvider,
  setLlmProvider,
  autoSelectThreshold,
  setAutoSelectThreshold,
  onReprocess,
}: {
  convertedPDF: ConvertedPDF
  conversionMode: PDFConversionMode
  setConversionMode: (mode: PDFConversionMode) => void
  illustrationGranularity: IllustrationGranularity
  setIllustrationGranularity: (mode: IllustrationGranularity) => void
  smartIllustrationSkip: boolean
  setSmartIllustrationSkip: (enabled: boolean) => void
  provider: 'openai' | 'replicate'
  setProvider: (p: 'openai' | 'replicate') => void
  batchSize: number
  setBatchSize: (n: number) => void
  // Advanced provider options
  openaiQuality: OpenAIQuality
  setOpenaiQuality: (q: OpenAIQuality) => void
  openaiSize: OpenAISize
  setOpenaiSize: (s: OpenAISize) => void
  replicateModel: ReplicateModel
  setReplicateModel: (m: ReplicateModel) => void
  replicateAspect: ReplicateAspect
  setReplicateAspect: (a: ReplicateAspect) => void
  // Chunk selection
  chunkSelections: ChunkSelection[]
  setChunkSelections: React.Dispatch<React.SetStateAction<ChunkSelection[]>>
  showChunkSelection: boolean
  setShowChunkSelection: (show: boolean) => void
  pageLimit: number
  setPageLimit: (limit: number) => void
  imagePageLimit: number
  setImagePageLimit: (limit: number) => void
  capApplied: boolean
  setCapApplied: (applied: boolean) => void
  patAvailable: boolean
  appliedPageLimit?: number
  // Cost limit
  costLimit: number | null
  setCostLimit: (limit: number | null) => void
  // Advanced options
  webhookUrl: string
  setWebhookUrl: (url: string) => void
  webhookSecret: string
  setWebhookSecret: (secret: string) => void
  showAdvanced: boolean
  setShowAdvanced: (show: boolean) => void
  // Worthiness analysis
  onAutoSelect: () => void
  useLLMForWorthiness: boolean
  setUseLLMForWorthiness: (enabled: boolean) => void
  llmProvider: 'auto' | 'claude' | 'openai' | 'nlp'
  setLlmProvider: (provider: 'auto' | 'claude' | 'openai' | 'nlp') => void
  autoSelectThreshold: number
  setAutoSelectThreshold: (threshold: number) => void
  onReprocess: () => void
}) {
  // Calculate selected chunk count
  const selectedChunkCount = useMemo(() => {
    if (chunkSelections.length === 0) return convertedPDF.chunks.length
    return chunkSelections.filter(c => c.selected).length
  }, [chunkSelections, convertedPDF.chunks.length])

  const availableIllustrationTargets = useMemo(() => {
    const selectedIds = chunkSelections.length > 0
      ? new Set(chunkSelections.filter(s => s.selected).map(s => s.id))
      : null

    const selectedChunks = selectedIds
      ? convertedPDF.chunks.filter(c => selectedIds.has(c.id))
      : convertedPDF.chunks

    if (illustrationGranularity === 'chunk') {
      return selectedChunks.length
    }

    const byPoints = selectedChunks.reduce((sum, chunk) => sum + (chunk.illustrationPoints?.length || 0), 0)
    return byPoints > 0 ? byPoints : selectedChunks.length
  }, [chunkSelections, convertedPDF.chunks, illustrationGranularity])

  const plannedIllustrations = useMemo(() => {
    return Math.min(Math.max(1, imagePageLimit), Math.max(1, availableIllustrationTargets))
  }, [availableIllustrationTargets, imagePageLimit])

  // Dynamic cost calculation
  const estimatedCost = useMemo(() => {
    let costPerImage: number
    if (provider === 'openai') {
      const baseCost = openaiQuality === 'hd' ? 0.08 : 0.04
      const sizeMultiplier = openaiSize === '1024x1024' ? 1 : 2
      costPerImage = baseCost * sizeMultiplier
    } else {
      const modelPricing: Record<ReplicateModel, number> = {
        'flux-schnell': 0.003,
        'flux-dev': 0.025,
        'flux-pro': 0.055,
      }
      costPerImage = modelPricing[replicateModel]
    }
    return (plannedIllustrations * costPerImage).toFixed(2)
  }, [plannedIllustrations, provider, openaiQuality, openaiSize, replicateModel])

  // Initialize chunk selections when PDF loads
  useEffect(() => {
    if (convertedPDF.chunks.length > 0 && chunkSelections.length === 0) {
      const limit = appliedPageLimit && appliedPageLimit > 0 ? appliedPageLimit : convertedPDF.chunks.length
      setChunkSelections(convertedPDF.chunks.map((c, idx) => ({ id: c.id, selected: idx < limit })))
    }
  }, [appliedPageLimit, convertedPDF.chunks, chunkSelections.length, setChunkSelections])

  useEffect(() => {
    if (!capApplied || chunkSelections.length === 0) return
    setChunkSelections(prev => prev.map((c, idx) => ({ ...c, selected: idx < pageLimit })))
  }, [capApplied, pageLimit, setChunkSelections, chunkSelections.length])

  const selectAllChunks = () => {
    setChunkSelections(convertedPDF.chunks.map(c => ({ id: c.id, selected: true })))
  }

  const deselectAllChunks = () => {
    setChunkSelections(convertedPDF.chunks.map(c => ({ id: c.id, selected: false })))
  }

  const toggleChunk = (index: number, selected: boolean) => {
    setChunkSelections(prev => {
      const updated = [...prev]
      if (updated[index]) {
        updated[index] = { ...updated[index], selected }
      }
      return updated
    })
  }

  const isValidUrl = (url: string) => {
    if (!url) return true
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const exportJobConfig = () => {
    const config = {
      projectTitle: convertedPDF.metadata.title,
      illustrationGranularity,
      smartIllustrationSkip,
      maxIllustrations: plannedIllustrations,
      provider,
      batchSize,
      quality: provider === 'openai' ? openaiQuality : (replicateModel === 'flux-schnell' ? 'standard' : 'hd'),
      size: provider === 'openai' ? openaiSize : undefined,
      model: provider === 'replicate' ? replicateModel : undefined,
      aspectRatio: provider === 'replicate' ? replicateAspect : undefined,
      selectedChunks: selectedChunkCount,
      totalChunks: convertedPDF.chunks.length,
      costLimit: costLimit || undefined,
      webhookUrl: webhookUrl || undefined,
    }
    navigator.clipboard.writeText(JSON.stringify(config, null, 2))
  }

  return (
    <div className="space-y-6">
      {/* PDF Summary */}
      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-purple-800 dark:text-purple-200">
              {convertedPDF.metadata.title}
            </h3>
            {convertedPDF.metadata.author && (
              <p className="text-sm text-purple-600 dark:text-purple-400">
                by {convertedPDF.metadata.author}
              </p>
            )}
            <div className="flex gap-4 mt-2 text-xs text-purple-600 dark:text-purple-400">
              <span>{convertedPDF.metadata.totalPages} pages</span>
              <span>{convertedPDF.metadata.totalWords.toLocaleString()} words</span>
              <span>{convertedPDF.chunks.length} chunks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demo cap and PAT unlock */}
      <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Preview mode: showing first {appliedPageLimit || pageLimit} page(s)
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Hard-capped to 3 pages without a GitHub PAT. Unlock to process more and regenerate illustrations.
            </p>
          </div>
          {(!patAvailable || capApplied) && (
            <button
              onClick={() => {
                if (patAvailable) {
                  setCapApplied(false)
                  setPageLimit(convertedPDF.metadata.totalPages)
                  setImagePageLimit(Math.min(convertedPDF.metadata.totalPages, imagePageLimit))
                } else {
                  alert('Add a GitHub PAT in Settings to unlock full runs.')
                }
              }}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-500 transition-colors"
            >
              {patAvailable ? 'Unlock full import' : 'Add PAT to unlock'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
              Pages to process
            </label>
            <input
              type="number"
              min={1}
              max={patAvailable && !capApplied ? convertedPDF.metadata.totalPages : Math.min(3, convertedPDF.metadata.totalPages)}
              value={Math.min(pageLimit, patAvailable && !capApplied ? convertedPDF.metadata.totalPages : Math.min(3, convertedPDF.metadata.totalPages))}
              onChange={e => {
                const maxPages = patAvailable && !capApplied ? convertedPDF.metadata.totalPages : Math.min(3, convertedPDF.metadata.totalPages)
                setPageLimit(Math.min(Math.max(1, Number(e.target.value)), maxPages))
              }}
              className="w-full rounded-md border border-amber-200 dark:border-amber-700 bg-white dark:bg-amber-950 px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
              Preview capped at 3 until unlocked.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
              {illustrationGranularity === 'block' ? 'Illustrations to generate' : 'Pages/chunks to generate images for'}
            </label>
            <input
              type="number"
              min={1}
              max={Math.max(1, availableIllustrationTargets)}
              value={plannedIllustrations}
              onChange={e => {
                const maxItems = Math.max(1, availableIllustrationTargets)
                setImagePageLimit(Math.min(maxItems, Math.max(1, Number(e.target.value))))
              }}
              className="w-full rounded-md border border-amber-200 dark:border-amber-700 bg-white dark:bg-amber-950 px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
              {illustrationGranularity === 'block'
                ? `Image generation runs on up to ${plannedIllustrations} detected illustration block(s).`
                : `Image generation runs on the first ${plannedIllustrations} selected chunk(s).`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            After changing limits or chunking mode, re-run conversion to apply.
          </p>
          <button
            onClick={onReprocess}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-amber-700 text-white hover:bg-amber-600 transition-colors"
          >
            Re-run conversion
          </button>
        </div>
      </div>

      {/* Illustration mode */}
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
        <div className="flex items-start gap-3">
          <Image className="w-5 h-5 text-cyan-600 dark:text-cyan-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Illustration generation
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Page-by-page is achieved via <span className="font-mono">Per-page</span> chunking. Block-by-block generates only at detected illustration points.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => setIllustrationGranularity('chunk')}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              illustrationGranularity === 'chunk'
                ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-200'
                : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            1 per page/chunk
          </button>
          <button
            onClick={() => setIllustrationGranularity('block')}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              illustrationGranularity === 'block'
                ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-200'
                : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Block-by-block
          </button>
        </div>

        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            Smart skip (only when warranted)
          </span>
          <button
            onClick={() => setSmartIllustrationSkip(!smartIllustrationSkip)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              smartIllustrationSkip ? 'bg-cyan-500' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
            aria-label="Toggle smart illustration skip"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                smartIllustrationSkip ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </label>

        {/* Auto-Select Worthy Content */}
        {smartIllustrationSkip && (
          <div className="mt-4 p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-1">
                  AI Auto-Selection
                </h4>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  Let AI analyze and select which chunks warrant illustration (saves 30-50% cost)
                </p>
              </div>
              <button
                onClick={onAutoSelect}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors text-sm font-semibold flex items-center gap-2 whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" />
                Auto-Select
              </button>
            </div>

            {/* LLM Settings */}
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 flex items-center gap-2">
                <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                Analysis Settings
              </summary>
              <div className="mt-3 space-y-3 pl-5">
                {/* Confidence Threshold */}
                <div>
                  <label className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 mb-1">
                    <span>Confidence Threshold: {(autoSelectThreshold * 100).toFixed(0)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0.3}
                    max={0.9}
                    step={0.05}
                    value={autoSelectThreshold}
                    onChange={(e) => setAutoSelectThreshold(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* LLM Provider */}
                <div>
                  <label className="block text-xs text-purple-700 dark:text-purple-300 mb-1">
                    Analysis Method
                  </label>
                  <select
                    value={llmProvider}
                    onChange={(e) => setLlmProvider(e.target.value as any)}
                    className="w-full px-2 py-1 text-xs border border-purple-300 dark:border-purple-700 rounded bg-white dark:bg-purple-950"
                  >
                    <option value="auto">Auto (Claude → OpenAI → NLP)</option>
                    <option value="claude">Claude Only</option>
                    <option value="openai">OpenAI Only</option>
                    <option value="nlp">NLP Heuristics Only</option>
                  </select>
                </div>

                {/* Use LLM Toggle */}
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={useLLMForWorthiness}
                    onChange={(e) => setUseLLMForWorthiness(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-purple-700 dark:text-purple-300">
                    Use LLM for analysis (disable for faster NLP-only)
                  </span>
                </label>
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Conversion Mode */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Chunking Mode
        </label>
        <div className="space-y-2">
          {CONVERSION_MODES.map((mode) => (
            <label
              key={mode.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                conversionMode === mode.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <input
                type="radio"
                name="conversionMode"
                value={mode.id}
                checked={conversionMode === mode.id}
                onChange={() => setConversionMode(mode.id)}
                className="text-purple-500"
              />
              <div>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{mode.name}</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{mode.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Image Provider - Expandable Cards */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Image Generation Provider
        </label>
        <div className="space-y-3">
          {/* OpenAI Card */}
          <div className={`rounded-lg border transition-colors overflow-hidden ${
            provider === 'openai'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-zinc-200 dark:border-zinc-700'
          }`}>
            <button
              onClick={() => setProvider('openai')}
              className="w-full p-3 text-left flex justify-between items-center"
            >
              <div>
                <span className="font-medium text-sm text-zinc-800 dark:text-zinc-200">OpenAI DALL-E 3</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">High quality, detailed images</p>
              </div>
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                ${openaiQuality === 'hd' ? (openaiSize === '1024x1024' ? '0.08' : '0.16') : (openaiSize === '1024x1024' ? '0.04' : '0.08')}/image
              </span>
            </button>

            {provider === 'openai' && (
              <div className="px-3 pb-3 space-y-3 border-t border-purple-200 dark:border-purple-700 pt-3">
                {/* Quality Toggle */}
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Quality</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOpenaiQuality('standard')}
                      className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                        openaiQuality === 'standard'
                          ? 'bg-purple-500 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      onClick={() => setOpenaiQuality('hd')}
                      className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                        openaiQuality === 'hd'
                          ? 'bg-purple-500 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                      }`}
                    >
                      HD (2x cost)
                    </button>
                  </div>
                  {openaiQuality === 'hd' && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      HD quality doubles the cost per image
                    </p>
                  )}
                </div>

                {/* Size Selection */}
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Size</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: '1024x1024' as const, label: 'Square (1:1)' },
                      { value: '1792x1024' as const, label: 'Landscape (16:9)' },
                      { value: '1024x1792' as const, label: 'Portrait (9:16)' },
                    ].map(size => (
                      <button
                        key={size.value}
                        onClick={() => setOpenaiSize(size.value)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          openaiSize === size.value
                            ? 'bg-purple-500 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                  {openaiSize !== '1024x1024' && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Non-square sizes cost 2x
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Replicate Card */}
          <div className={`rounded-lg border transition-colors overflow-hidden ${
            provider === 'replicate'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-zinc-200 dark:border-zinc-700'
          }`}>
            <button
              onClick={() => setProvider('replicate')}
              className="w-full p-3 text-left flex justify-between items-center"
            >
              <div>
                <span className="font-medium text-sm text-zinc-800 dark:text-zinc-200">Replicate Flux</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Fast generation, lower cost</p>
              </div>
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                ${({ 'flux-schnell': '0.003', 'flux-dev': '0.025', 'flux-pro': '0.055' })[replicateModel]}/image
              </span>
            </button>

            {provider === 'replicate' && (
              <div className="px-3 pb-3 space-y-3 border-t border-purple-200 dark:border-purple-700 pt-3">
                {/* Model Selection */}
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Model</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: 'flux-schnell' as const, label: 'Schnell', desc: 'Fast ($0.003)' },
                      { value: 'flux-dev' as const, label: 'Dev', desc: 'Balanced ($0.025)' },
                      { value: 'flux-pro' as const, label: 'Pro', desc: 'Best quality ($0.055)' },
                    ].map(model => (
                      <button
                        key={model.value}
                        onClick={() => setReplicateModel(model.value)}
                        className={`px-3 py-1.5 text-xs rounded transition-colors ${
                          replicateModel === model.value
                            ? 'bg-purple-500 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                        }`}
                        title={model.desc}
                      >
                        {model.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Aspect Ratio</label>
                  <div className="flex gap-2">
                    {[
                      { value: '1:1' as const, label: 'Square' },
                      { value: '16:9' as const, label: 'Landscape' },
                      { value: '9:16' as const, label: 'Portrait' },
                    ].map(aspect => (
                      <button
                        key={aspect.value}
                        onClick={() => setReplicateAspect(aspect.value)}
                        className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                          replicateAspect === aspect.value
                            ? 'bg-purple-500 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                        }`}
                      >
                        {aspect.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch Size */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Images per batch: {batchSize}
        </label>
        <input
          type="range"
          min="3"
          max="25"
          value={batchSize}
          onChange={(e) => setBatchSize(parseInt(e.target.value))}
          className="w-full accent-purple-500"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Generate in batches of {batchSize}, then review before continuing
        </p>
      </div>

      {/* Chunk Selection - Collapsible */}
      <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowChunkSelection(!showChunkSelection)}
          className="w-full p-3 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
        >
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Select Chapters ({selectedChunkCount}/{convertedPDF.chunks.length})
          </span>
          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showChunkSelection ? 'rotate-180' : ''}`} />
        </button>

        {showChunkSelection && (
          <div className="p-3 space-y-2 max-h-64 overflow-y-auto border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex gap-3 mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-700">
              <button
                onClick={selectAllChunks}
                className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
              >
                Select All
              </button>
              <button
                onClick={deselectAllChunks}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                Deselect All
              </button>
            </div>

            {convertedPDF.chunks.map((chunk, i) => (
              <label
                key={chunk.id}
                className="flex items-start gap-2 p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={chunkSelections[i]?.selected ?? true}
                  onChange={(e) => toggleChunk(i, e.target.checked)}
                  className="mt-0.5 accent-purple-500"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate block">
                    {chunk.title}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {chunk.wordCount.toLocaleString()} words • Pages {chunk.pageRange.start}-{chunk.pageRange.end}
                    {chunk.illustrationPoints.length > 0 && (
                      <span className="ml-1 text-purple-600 dark:text-purple-400">
                        • {chunk.illustrationPoints.length} illustration points
                      </span>
                    )}
                  </span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Cost Estimate with Limit */}
      <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Estimated cost:</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">${estimatedCost}</span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {selectedChunkCount} illustrations × ${
            provider === 'openai'
              ? (openaiQuality === 'hd' ? (openaiSize === '1024x1024' ? '0.08' : '0.16') : (openaiSize === '1024x1024' ? '0.04' : '0.08'))
              : ({ 'flux-schnell': '0.003', 'flux-dev': '0.025', 'flux-pro': '0.055' })[replicateModel]
          }/image
        </p>

        {/* Cost Limit */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <label className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            Budget limit:
          </label>
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
            <input
              type="number"
              min="0"
              step="0.50"
              value={costLimit ?? ''}
              onChange={(e) => setCostLimit(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="No limit"
              className="w-full pl-5 pr-2 py-1 text-xs border border-zinc-200 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
            />
          </div>
          <span className="text-xs text-zinc-400" title="Job will pause when estimated cost reaches this limit">
            <HelpCircle className="w-3.5 h-3.5" />
          </span>
        </div>
        {costLimit && parseFloat(estimatedCost) > costLimit && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Estimated cost exceeds budget limit
          </p>
        )}
      </div>

      {/* Advanced Settings - Collapsible */}
      <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Advanced Settings
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            {/* Webhook URL */}
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                <Link className="w-3 h-3" />
                Webhook Callback URL
                <span className="text-zinc-400 ml-1" title="Receive notifications when generation completes. Leave empty to disable.">
                  <HelpCircle className="w-3 h-3" />
                </span>
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
              />
              {webhookUrl && !isValidUrl(webhookUrl) && (
                <p className="text-xs text-red-500 mt-1">Please enter a valid URL</p>
              )}
            </div>

            {/* Webhook Secret - only show if URL is set */}
            {webhookUrl && isValidUrl(webhookUrl) && (
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Webhook Secret
                  <span className="text-zinc-400 ml-1" title="Optional secret for webhook authentication">
                    <HelpCircle className="w-3 h-3" />
                  </span>
                </label>
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Optional authentication secret"
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                />
              </div>
            )}

            {/* Export Config Button */}
            <button
              onClick={exportJobConfig}
              className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Export job config as JSON
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Character/Style setup step */
function PDFCharactersStep({
  characters,
  setCharacters,
  settings,
  setSettings,
  stylePreset,
  setStylePreset,
  negativePrompt,
  setNegativePrompt,
}: {
  characters: CharacterDef[]
  setCharacters: React.Dispatch<React.SetStateAction<CharacterDef[]>>
  settings: SettingDef[]
  setSettings: React.Dispatch<React.SetStateAction<SettingDef[]>>
  stylePreset: string
  setStylePreset: (s: string) => void
  negativePrompt: string
  setNegativePrompt: (prompt: string) => void
}) {
  const [newCharName, setNewCharName] = useState('')
  const [newSettingName, setNewSettingName] = useState('')

  const addCharacter = () => {
    if (newCharName.trim()) {
      setCharacters(prev => [...prev, { name: newCharName.trim(), description: '', visualTraits: [] }])
      setNewCharName('')
    }
  }

  const addSetting = () => {
    if (newSettingName.trim()) {
      setSettings(prev => [...prev, { name: newSettingName.trim(), description: '', visualStyle: [] }])
      setNewSettingName('')
    }
  }

  const updateCharacterTraits = (index: number, traitsStr: string) => {
    setCharacters(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        visualTraits: traitsStr.split(',').map(t => t.trim()).filter(Boolean),
      }
      return updated
    })
  }

  const handleCharacterImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Convert to base64 data URL for preview
    const reader = new FileReader()
    reader.onload = () => {
      setCharacters(prev => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          referenceImage: reader.result as string,
        }
        return updated
      })
    }
    reader.readAsDataURL(file)
  }

  const removeCharacterImage = (index: number) => {
    setCharacters(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        referenceImage: undefined,
      }
      return updated
    })
  }

  const negativePromptPresets = [
    'blurry, low quality',
    'text, watermarks',
    'modern technology',
    'deformed, distorted',
  ]

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Define characters and settings for visual consistency across illustrations.
        <br />
        <span className="text-purple-600 dark:text-purple-400">This is optional</span> - you can skip to generation.
      </p>

      {/* Style Preset */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Visual Style Preset
        </label>
        <select
          value={stylePreset}
          onChange={(e) => setStylePreset(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
        >
          <option value="">Default (auto-detect)</option>
          <option value="art-watercolor">Artistic Watercolor</option>
          <option value="art-isometric">Isometric 3D</option>
          <option value="edu-friendly">Educational Friendly</option>
          <option value="edu-academic">Academic Scholarly</option>
          <option value="tech-minimal">Technical Minimalist</option>
          <option value="tech-blueprint">Blueprint Technical</option>
          <option value="playful-cartoon">Playful Cartoon</option>
        </select>
      </div>

      {/* Negative Prompt */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Things to Avoid
          <span className="text-zinc-400 ml-1 font-normal" title="Elements the AI should NOT include in images">
            <HelpCircle className="w-3 h-3 inline" />
          </span>
        </label>
        <textarea
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="e.g., blurry, low quality, text, watermarks, modern technology..."
          className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 h-20 resize-none"
        />
        <div className="flex flex-wrap gap-1 mt-1">
          {negativePromptPresets.map(preset => (
            <button
              key={preset}
              onClick={() => setNegativePrompt(negativePrompt ? `${negativePrompt}, ${preset}` : preset)}
              className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
            >
              + {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Characters */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          <Users className="w-4 h-4 inline mr-1" />
          Characters ({characters.length})
        </label>
        <div className="space-y-3">
          {characters.map((char, i) => (
            <div key={i} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex-1 font-medium text-sm text-zinc-800 dark:text-zinc-200">{char.name}</span>
                <button
                  onClick={() => setCharacters(prev => prev.filter((_, idx) => idx !== i))}
                  className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Visual Traits Input */}
              <input
                type="text"
                value={char.visualTraits.join(', ')}
                onChange={(e) => updateCharacterTraits(i, e.target.value)}
                placeholder="Visual traits: tall, dark hair, blue eyes..."
                className="w-full px-2 py-1.5 text-xs border border-zinc-200 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
              />

              {/* Reference Image Upload */}
              <div className="flex items-center gap-2">
                {char.referenceImage ? (
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <img
                      src={char.referenceImage}
                      alt={`${char.name} reference`}
                      className="w-full h-full object-cover rounded border border-zinc-200 dark:border-zinc-600"
                    />
                    <button
                      onClick={() => removeCharacterImage(i)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 cursor-pointer hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                    <Upload className="w-3 h-3" />
                    Add reference image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleCharacterImageUpload(i, e)}
                    />
                  </label>
                )}
                <span className="text-zinc-400" title="Upload a character reference image for visual consistency">
                  <HelpCircle className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCharacter()}
              placeholder="Add character name..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
            />
            <button
              onClick={addCharacter}
              disabled={!newCharName.trim()}
              className="px-3 py-2 text-sm bg-purple-500 text-white rounded-lg disabled:opacity-50 hover:bg-purple-600 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          <Palette className="w-4 h-4 inline mr-1" />
          Settings/Locations ({settings.length})
        </label>
        <div className="space-y-2">
          {settings.map((setting, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{setting.name}</span>
              <button
                onClick={() => setSettings(prev => prev.filter((_, idx) => idx !== i))}
                className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSettingName}
              onChange={(e) => setNewSettingName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSetting()}
              placeholder="Add setting/location..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
            />
            <button
              onClick={addSetting}
              disabled={!newSettingName.trim()}
              className="px-3 py-2 text-sm bg-purple-500 text-white rounded-lg disabled:opacity-50 hover:bg-purple-600 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** GitHub save status */
interface GitHubSaveStatus {
  saving: boolean
  saved: boolean
  error?: string
  commitUrl?: string
}

/** Generation progress step */
function PDFGeneratingStep({
  job,
  onPause,
  onResume,
  onCancel,
  onContinue,
  onSaveToGitHub,
  generatedImages,
  githubStatus,
}: {
  job: GenerationJob | null
  onPause: () => void
  onResume: () => void
  onCancel: () => void
  onContinue: () => void
  onSaveToGitHub: () => void
  generatedImages: Array<{ id: string; url: string; pageIndex: number }>
  githubStatus: GitHubSaveStatus
}) {
  if (!job) return null

  const progress = Math.round((job.completedItems / job.totalItems) * 100)
  const isPaused = job.status === 'paused'
  const isBatchComplete = job.status === 'batch-complete'
  const isComplete = job.status === 'completed'
  const isRunning = job.status === 'running'

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {isComplete ? 'Complete!' : `Generating illustrations...`}
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {job.completedItems} / {job.totalItems}
          </span>
        </div>
        <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${isComplete ? 'bg-green-500' : 'bg-purple-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Batch {job.currentBatch} • {job.batchSize} images per batch
        </p>
      </div>

      {/* Status Message */}
      {isBatchComplete && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-amber-800 dark:text-amber-200">
              Batch {job.currentBatch} complete!
            </span>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Review the images below, then continue or cancel.
          </p>
        </div>
      )}

      {isComplete && !githubStatus.saved && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-800 dark:text-green-200">
              All illustrations generated!
            </span>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            Save to GitHub to persist your illustrations.
          </p>
        </div>
      )}

      {githubStatus.saved && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-800 dark:text-blue-200">
              Saved to GitHub!
            </span>
          </div>
          {githubStatus.commitUrl && (
            <a
              href={githubStatus.commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 block"
            >
              View commit →
            </a>
          )}
        </div>
      )}

      {githubStatus.error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="font-medium text-red-800 dark:text-red-200">GitHub Error</span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{githubStatus.error}</p>
        </div>
      )}

      {job.error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="font-medium text-red-800 dark:text-red-200">Error</span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{job.error}</p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-2">
        {isRunning && (
          <button
            onClick={onPause}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
        )}
        {isPaused && (
          <button
            onClick={onResume}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            <Play className="w-4 h-4" />
            Resume
          </button>
        )}
        {isBatchComplete && (
          <button
            onClick={onContinue}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            <SkipForward className="w-4 h-4" />
            Continue to next batch
          </button>
        )}
        {isComplete && !githubStatus.saved && (
          <button
            onClick={onSaveToGitHub}
            disabled={githubStatus.saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {githubStatus.saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Save to GitHub
              </>
            )}
          </button>
        )}
        {!isComplete && (
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
          >
            <Square className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>

      {/* Generated Images Preview */}
      {generatedImages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Generated Images ({generatedImages.length})
          </h4>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {generatedImages.map((img) => (
              <div
                key={img.id}
                className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden"
              >
                <img
                  src={img.url}
                  alt={`Page ${img.pageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function CreateNodeWizard({
  isOpen,
  onClose,
  parentPath = '',
  parentLevel = 'root',
  onCreateNode,
  parentLoomConfig,
  parentWeaveConfig,
  onCopyFrontmatter,
}: CreateNodeWizardProps) {
  // State
  const [step, setStep] = useState<WizardStep>('select-type')
  const [selectedType, setSelectedType] = useState<NodeType | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<LoadedTemplate | null>(null)
  const [formData, setFormData] = useState<TemplateFormData>({})
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Array<{ field: string; message: string }>>([])
  const [showPreview, setShowPreview] = useState(false)
  const [copied, setCopied] = useState(false)

  // PDF Import State
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [isUploadingPDF, setIsUploadingPDF] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [convertedPDF, setConvertedPDF] = useState<ConvertedPDF | null>(null)
  const [conversionMode, setConversionMode] = useState<PDFConversionMode>('smart-chunk')
  const [illustrationGranularity, setIllustrationGranularity] = useState<IllustrationGranularity>('chunk')
  const [smartIllustrationSkip, setSmartIllustrationSkip] = useState(true)
  const [imageProvider, setImageProvider] = useState<'openai' | 'replicate'>('openai')
  const [batchSize, setBatchSize] = useState(3)
  const [characters, setCharacters] = useState<CharacterDef[]>([])
  const [settings, setSettings] = useState<SettingDef[]>([])
  const [stylePreset, setStylePreset] = useState('')
  const [generationJob, setGenerationJob] = useState<GenerationJob | null>(null)
  const [generatedImages, setGeneratedImages] = useState<Array<{ id: string; url: string; pageIndex: number; chunkId?: string; prompt?: string; cost?: number }>>([])
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [githubSaveStatus, setGithubSaveStatus] = useState<GitHubSaveStatus>({ saving: false, saved: false })

  // Advanced provider options
  const [openaiQuality, setOpenaiQuality] = useState<OpenAIQuality>('standard')
  const [openaiSize, setOpenaiSize] = useState<OpenAISize>('1024x1024')
  const [replicateModel, setReplicateModel] = useState<ReplicateModel>('flux-schnell')
  const [replicateAspect, setReplicateAspect] = useState<ReplicateAspect>('1:1')

  // Chunk selection
  const [chunkSelections, setChunkSelections] = useState<ChunkSelection[]>([])
  const [showChunkSelection, setShowChunkSelection] = useState(false)

  // Template Builder state
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false)
  const [pageLimit, setPageLimit] = useState(3)
  const [imagePageLimit, setImagePageLimit] = useState(3)
  const [capApplied, setCapApplied] = useState(true)
  const [patAvailable, setPatAvailable] = useState(false)

  // Advanced options
  const [negativePrompt, setNegativePrompt] = useState('')
  const [costLimit, setCostLimit] = useState<number | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Canvas state
  const [showCanvas, setShowCanvas] = useState(false)
  const [canvasData, setCanvasData] = useState<string | null>(null)

  // Mind Map state
  const [showMindmap, setShowMindmap] = useState(false)
  const [mindmapData, setMindmapData] = useState<{ nodes: unknown[]; edges: unknown[] } | null>(null)

  // Work style profile and worthiness analysis
  const [workStyleProfile, setWorkStyleProfile] = useState<any>(null) // TODO: import WorkStyleProfile type
  const [showStyleWizard, setShowStyleWizard] = useState(false)
  const [worthinessResults, setWorthinessResults] = useState<Map<string, any>>(new Map())
  const [showWorthinessPreview, setShowWorthinessPreview] = useState(false)
  const [useLLMForWorthiness, setUseLLMForWorthiness] = useState(true)
  const [llmProvider, setLlmProvider] = useState<'auto' | 'claude' | 'openai' | 'nlp'>('auto')
  const [autoSelectThreshold, setAutoSelectThreshold] = useState(0.6)
  const [worthinessOverrides, setWorthinessOverrides] = useState<Map<string, boolean>>(new Map())

  // Draft auto-save state
  const [hasSavedDraft, setHasSavedDraft] = useState(false)
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null)
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Form validation
  const currentSchema = selectedType ? NODE_SCHEMAS[selectedType] : null
  const {
    errors: fieldErrors,
    touched: touchedFields,
    touchField,
    hasVisibleError,
    getFieldError,
  } = useFormValidation({
    fields: currentSchema?.fields || [],
    formData: formData as Record<string, unknown>,
    debounceMs: 300,
  })

  // Responsive layout - detect mobile
  const { isMobile } = useResponsiveLayout()

  // Load draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (savedDraft) {
        const draft: DraftData = JSON.parse(savedDraft)
        // Draft is valid if less than 7 days old
        const isRecent = Date.now() - draft.timestamp < 7 * 24 * 60 * 60 * 1000
        if (isRecent && draft.formData && Object.keys(draft.formData).length > 0) {
          setHasSavedDraft(true)
          setDraftTimestamp(draft.timestamp)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Auto-save draft when form data changes (debounced)
  useEffect(() => {
    // Only save if we have meaningful data
    if (step === 'form' && formData && Object.keys(formData).length > 0) {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current)
      }
      draftTimeoutRef.current = setTimeout(() => {
        try {
          const draft: DraftData = {
            step,
            selectedType,
            selectedTemplateId: selectedTemplate?.id || null,
            formData,
            timestamp: Date.now(),
          }
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
          setHasSavedDraft(true)
          setDraftTimestamp(draft.timestamp)
        } catch {
          // Ignore storage errors
        }
      }, 1000) // Debounce 1 second
    }
    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current)
      }
    }
  }, [formData, step, selectedType, selectedTemplate?.id])

  // Restore draft
  const handleRestoreDraft = useCallback(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (savedDraft) {
        const draft: DraftData = JSON.parse(savedDraft)
        setSelectedType(draft.selectedType)
        setFormData(draft.formData || {})
        // Skip to form step if we have form data
        if (draft.formData && Object.keys(draft.formData).length > 0) {
          setStep('form')
        } else if (draft.selectedType) {
          setStep(draft.selectedType === 'strand' ? 'select-template' : 'form')
        }
        setHasSavedDraft(false) // Hide the restore banner after restoring
      }
    } catch {
      setError('Failed to restore draft')
    }
  }, [])

  // Delete draft
  const handleDeleteDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      setHasSavedDraft(false)
      setDraftTimestamp(null)
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Clear draft on successful creation
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      setHasSavedDraft(false)
      setDraftTimestamp(null)
    } catch {
      // Ignore
    }
  }, [])

  // Extract seeded metadata
  const seededMetadata = useMemo(() =>
    extractSeededMetadata(parentPath, parentLoomConfig, parentWeaveConfig),
    [parentPath, parentLoomConfig, parentWeaveConfig]
  )

  // Available node types based on parent level
  const availableTypes = useMemo(() => {
    switch (parentLevel) {
      case 'root': return ['pdf-import', 'weave'] as NodeType[]
      case 'weave': return ['pdf-import', 'loom'] as NodeType[]
      case 'loom': return ['pdf-import', 'strand', 'canvas', 'mindmap'] as NodeType[]
      default: return ['pdf-import'] as NodeType[]
    }
  }, [parentLevel])

  // Pre-seed form data when template is selected
  useEffect(() => {
    if (selectedType === 'strand' && selectedTemplate) {
      const seeded: TemplateFormData = { ...(selectedTemplate.defaultData as TemplateFormData) }
      
      if (seededMetadata.tags?.length) {
        seeded.tags = seededMetadata.tags.join(', ')
      }
      if (seededMetadata.difficulty) {
        seeded.difficulty = seededMetadata.difficulty
      }
      
      setFormData(prev => ({ ...seeded, ...prev }))
    }
  }, [selectedType, selectedTemplate, seededMetadata])

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setStep('select-type')
      setSelectedType(null)
      setSelectedTemplate(null)
      setFormData({})
      setError(null)
      setShowPreview(false)
      // Reset PDF state
      setPdfFile(null)
      setIsUploadingPDF(false)
      setPdfError(null)
      setConvertedPDF(null)
      setConversionMode('smart-chunk')
      setImageProvider('openai')
      setBatchSize(3)
      setCharacters([])
      setSettings([])
      setStylePreset('')
      setGenerationJob(null)
      setGeneratedImages([])
      setGithubSaveStatus({ saving: false, saved: false })
      // Reset advanced options
      setOpenaiQuality('standard')
      setOpenaiSize('1024x1024')
      setReplicateModel('flux-schnell')
      setReplicateAspect('1:1')
      setChunkSelections([])
      setShowChunkSelection(false)
      setPageLimit(3)
      setImagePageLimit(3)
      setCapApplied(true)
      setPatAvailable(false)
      setNegativePrompt('')
      setCostLimit(null)
      setWebhookUrl('')
      setWebhookSecret('')
      setShowAdvanced(false)
      // Reset work style profile and worthiness
      setWorkStyleProfile(null)
      setShowStyleWizard(false)
      setWorthinessResults(new Map())
      setShowWorthinessPreview(false)
      setWorthinessOverrides(new Map())
      // Clear polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isOpen])

  // Detect PAT availability (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPatAvailable(hasPAT())
    }
  }, [isOpen])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  // Handlers
  const handleSelectType = useCallback((type: NodeType) => {
    setSelectedType(type)
    setFormData({})
    setError(null)

    if (type === 'pdf-import') {
      setStep('pdf-upload')
    } else if (type === 'strand') {
      setStep('select-template')
    } else if (type === 'canvas') {
      // Go to form first to get title/name, then open canvas
      setStep('form')
    } else {
      setStep('form')
    }
  }, [])

  // PDF Upload Handler
  const handlePDFUpload = useCallback(async (file: File) => {
    setPdfFile(file)
    setIsUploadingPDF(true)
    setPdfError(null)

    const effectiveLimit = patAvailable ? pageLimit : Math.min(pageLimit, 3)
    const bypassCap = patAvailable && !capApplied

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('options', JSON.stringify({
        mode: conversionMode,
        includePlaceholders: true,
        pageLimit: effectiveLimit,
        bypassCap,
        analyzeContent: true, // Request style analysis
        useLLM: useLLMForWorthiness,
        includeCharacters: true,
        includeSettings: true,
      }))

      const response = await fetch('/api/book/convert', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Book conversion failed')
      }

      const result = await response.json()

      const fullContent: Array<any> = Array.isArray(result.result.fullContent) ? result.result.fullContent : []
      const fullContentById = new Map(fullContent.map(md => [md.id, md]))

      const chunks: PDFChunk[] = (Array.isArray(result.result.chunks) ? result.result.chunks : []).map((chunk: any) => {
        const md = fullContentById.get(chunk.id)
        return {
          id: chunk.id,
          title: chunk.title,
          content: md?.content || '',
          wordCount: chunk.wordCount ?? md?.wordCount ?? 0,
          pageRange: chunk.pageRange,
          illustrationPoints: Array.isArray(md?.illustrationPoints) ? md.illustrationPoints : [],
        }
      })

      setConvertedPDF({
        filename: result.filename,
        metadata: result.result.metadata,
        chunks,
      })
      setChunkSelections(chunks.map(c => ({ id: c.id, selected: true })))
      setImagePageLimit(Math.min(3, chunks.length))

      // Handle analysis result if available
      if (result.analysis && result.analysis.profile) {
        setWorkStyleProfile(result.analysis.profile)
        setShowStyleWizard(true) // Show style config wizard
      } else {
        setStep('pdf-configure')
      }
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Failed to convert file')
    } finally {
      setIsUploadingPDF(false)
    }
  }, [capApplied, conversionMode, pageLimit, patAvailable, useLLMForWorthiness])

  // Handle style wizard confirmation
  const handleStyleWizardConfirm = useCallback((updatedProfile: WorkStyleProfile) => {
    setWorkStyleProfile(updatedProfile)
    setShowStyleWizard(false)
    setStep('pdf-configure')
  }, [])

  // Handle auto-select worthiness
  const handleAutoSelectWorthy = useCallback(async () => {
    if (!convertedPDF) return

    try {
      // Import worthiness analysis
      const { analyzeMultipleChunks } = await import('@/lib/nlp/autoTagging')

      // Analyze all chunks
      const selectedChunks = chunkSelections.length > 0
        ? convertedPDF.chunks.filter((_, i) => chunkSelections[i]?.selected !== false)
        : convertedPDF.chunks

      const chunksToAnalyze = selectedChunks.map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        illustrationPoints: chunk.illustrationPoints,
      }))

      const results = await analyzeMultipleChunks(chunksToAnalyze, {
        granularity: illustrationGranularity,
        confidenceThreshold: autoSelectThreshold,
        useLLM: useLLMForWorthiness,
        llmProvider,
      })

      setWorthinessResults(results)
      setShowWorthinessPreview(true)
    } catch (error) {
      console.error('Failed to analyze worthiness:', error)
      alert('Failed to analyze content worthiness. Please try again.')
    }
  }, [convertedPDF, chunkSelections, illustrationGranularity, autoSelectThreshold, useLLMForWorthiness, llmProvider])

  // Handle worthiness preview confirmation
  const handleWorthinessConfirm = useCallback(() => {
    // Apply worthiness results to chunk selections
    const newSelections = convertedPDF?.chunks.map(chunk => {
      const result = worthinessResults.get(chunk.id)
      const override = worthinessOverrides.get(chunk.id)

      // If overridden, use override value
      if (override !== undefined) {
        return { id: chunk.id, selected: override }
      }

      // Otherwise use worthiness result
      if (result) {
        return { id: chunk.id, selected: result.warrants && result.confidence >= autoSelectThreshold }
      }

      // Default: keep selected
      const existing = chunkSelections.find(s => s.id === chunk.id)
      return { id: chunk.id, selected: existing?.selected !== false }
    }) || []

    setChunkSelections(newSelections)
    setShowWorthinessPreview(false)
  }, [convertedPDF, worthinessResults, worthinessOverrides, autoSelectThreshold, chunkSelections])

  // Handle worthiness override toggle
  const handleWorthinessOverride = useCallback((chunkId: string, selected: boolean) => {
    setWorthinessOverrides(prev => {
      const next = new Map(prev)
      next.set(chunkId, selected)
      return next
    })
  }, [])

  // Start generation job
  const handleStartGeneration = useCallback(async () => {
    if (!convertedPDF) return

    setStep('pdf-generating')

    try {
      // Filter chunks based on selection
      const selectedChunks = chunkSelections.length > 0
        ? convertedPDF.chunks.filter((_, i) => chunkSelections[i]?.selected !== false)
        : convertedPDF.chunks
      const cappedChunks = selectedChunks.slice(0, imagePageLimit || selectedChunks.length)
      const promptChunks = cappedChunks.map(chunk => {
        const withoutFrontmatter = chunk.content.replace(/^---\n[\s\S]*?\n---\n?/, '').trim()
        const cleaned = withoutFrontmatter.replace(/<!--[\s\S]*?-->/g, '').trim()
        return { ...chunk, content: cleaned }
      })

      // Build style memory JSON with enhanced options
      const styleMemoryData = {
        projectId: `pdf-${Date.now()}`,
        projectTitle: convertedPDF.metadata.title,
        characters: characters.map(c => ({
          name: c.name,
          description: c.description,
          visualTraits: c.visualTraits,
          referenceImage: c.referenceImage,
        })),
        settings: settings.map(s => ({
          name: s.name,
          description: s.description,
          visualStyle: s.visualStyle,
        })),
        globalStyle: {
          consistencyStrategy: 'seed' as const,
          presetId: stylePreset || undefined,
          negativePrompt: negativePrompt || undefined,
        },
      }

      // Build request body with all options
      const requestBody: Record<string, unknown> = {
        projectTitle: convertedPDF.metadata.title,
        chunks: promptChunks,
        provider: imageProvider,
        batchSize,
        styleMemory: JSON.stringify(styleMemoryData),
        // Provider-specific options
        quality: imageProvider === 'openai' ? openaiQuality : (replicateModel === 'flux-schnell' ? 'standard' : 'hd'),
      }

      // Add OpenAI-specific options
      if (imageProvider === 'openai') {
        requestBody.size = openaiSize
      }

      // Add Replicate-specific options
      if (imageProvider === 'replicate') {
        requestBody.model = replicateModel
        requestBody.aspectRatio = replicateAspect
      }

      // Add optional fields if set
      if (costLimit) {
        requestBody.costLimit = costLimit
      }
      if (webhookUrl) {
        requestBody.webhookUrl = webhookUrl
        if (webhookSecret) {
          requestBody.webhookSecret = webhookSecret
        }
      }

      // Add smart skip options
      if (smartIllustrationSkip) {
        requestBody.smartSkip = true
        requestBody.skipThreshold = autoSelectThreshold
        requestBody.useLLMForSkip = useLLMForWorthiness
      }

      // Add work style profile if available
      if (workStyleProfile) {
        requestBody.workStyleProfile = workStyleProfile
      }

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start job')
      }

      const result = await response.json()
      setGenerationJob({
        id: result.job.id,
        status: result.job.status,
        completedItems: 0,
        totalItems: result.job.totalItems,
        currentBatch: 1,
        batchSize: result.job.batchSize,
      })

      // Start polling for status updates
      startJobPolling(result.job.id)
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Failed to start generation')
    }
  }, [convertedPDF, characters, settings, stylePreset, imageProvider, batchSize, chunkSelections, openaiQuality, openaiSize, replicateModel, replicateAspect, costLimit, webhookUrl, webhookSecret, negativePrompt, imagePageLimit, smartIllustrationSkip, autoSelectThreshold, useLLMForWorthiness, workStyleProfile])

  // Poll job status
  const startJobPolling = useCallback((jobId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`)
        if (!response.ok) return

        const data = await response.json()
        const job = data.job

        setGenerationJob({
          id: job.id,
          status: job.status,
          completedItems: job.progress.completed,
          totalItems: job.progress.total,
          currentBatch: job.batch.current,
          batchSize: job.batch.size,
          error: job.error,
        })

        setGeneratedImages(data.images.map((img: { id: string; url: string; pageIndex: number; chunkId?: string; prompt?: string; cost?: number }) => ({
          id: img.id,
          url: img.url,
          pageIndex: img.pageIndex,
          chunkId: img.chunkId,
          prompt: img.prompt,
          cost: img.cost,
        })))

        // Stop polling if job is done
        if (['completed', 'cancelled', 'failed'].includes(job.status)) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    // Poll immediately, then every 2 seconds
    poll()
    pollingIntervalRef.current = setInterval(poll, 2000)
  }, [])

  // Job control handlers
  const handlePauseJob = useCallback(async () => {
    if (!generationJob) return
    try {
      await fetch(`/api/jobs/${generationJob.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      })
    } catch (err) {
      console.error('Pause error:', err)
    }
  }, [generationJob])

  const handleResumeJob = useCallback(async () => {
    if (!generationJob) return
    try {
      await fetch(`/api/jobs/${generationJob.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      })
      startJobPolling(generationJob.id)
    } catch (err) {
      console.error('Resume error:', err)
    }
  }, [generationJob, startJobPolling])

  const handleCancelJob = useCallback(async () => {
    if (!generationJob) return
    try {
      await fetch(`/api/jobs/${generationJob.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    } catch (err) {
      console.error('Cancel error:', err)
    }
  }, [generationJob])

  const handleContinueJob = useCallback(async () => {
    if (!generationJob) return
    try {
      await fetch(`/api/jobs/${generationJob.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'continue' }),
      })
      startJobPolling(generationJob.id)
    } catch (err) {
      console.error('Continue error:', err)
    }
  }, [generationJob, startJobPolling])

  // Save to GitHub handler
  const handleSaveToGitHub = useCallback(async () => {
    if (!convertedPDF || generatedImages.length === 0) return

    setGithubSaveStatus({ saving: true, saved: false })

    try {
      // Get PAT from local storage
      const { getDecryptedPAT } = await import('@/lib/github/patStorage')
      const pat = await getDecryptedPAT()

      if (!pat) {
        setGithubSaveStatus({
          saving: false,
          saved: false,
          error: 'No GitHub PAT configured. Please set one in Settings.',
        })
        return
      }

      // Build style memory for storage
      const styleMemoryData = {
        projectId: `pdf-${Date.now()}`,
        projectTitle: convertedPDF.metadata.title,
        characters: characters.map(c => ({
          name: c.name,
          description: c.description,
          visualTraits: c.visualTraits,
        })),
        settings: settings.map(s => ({
          name: s.name,
          description: s.description,
          visualStyle: s.visualStyle,
        })),
        globalStyle: {
          consistencyStrategy: 'seed' as const,
          presetId: stylePreset || undefined,
          negativePrompt: negativePrompt || undefined,
        },
      }

      // Convert images to base64 (we need to fetch them since we only have URLs)
      const imagesWithBase64 = await Promise.all(
        generatedImages.map(async (img) => {
          try {
            const response = await fetch(img.url)
            const blob = await response.blob()
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => {
                const result = reader.result as string
                resolve(result.split(',')[1]) // Remove data URL prefix
              }
              reader.readAsDataURL(blob)
            })
            return {
              id: img.id,
              base64,
              pageIndex: img.pageIndex,
              chunkId: img.chunkId || `chunk-${img.pageIndex}`,
              prompt: img.prompt || '',
              provider: imageProvider,
              cost: img.cost || (imageProvider === 'openai' ? 0.04 : 0.003),
            }
          } catch {
            console.error(`Failed to fetch image ${img.id}`)
            return null
          }
        })
      )

      const validImages = imagesWithBase64.filter((img): img is NonNullable<typeof img> => img !== null)

      if (validImages.length === 0) {
        setGithubSaveStatus({
          saving: false,
          saved: false,
          error: 'Failed to prepare images for upload',
        })
        return
      }

      // Commit to GitHub
      const response = await fetch('/api/github/commit-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: convertedPDF.metadata.title,
          pat,
          images: validImages,
          styleMemory: JSON.stringify(styleMemoryData),
          conversionManifest: {
            source: {
              filename: convertedPDF.filename,
              totalPages: convertedPDF.metadata.totalPages,
              tocPages: convertedPDF.metadata.tocPages,
              covers: convertedPDF.metadata.covers,
            },
            limits: {
              pageLimit,
              imagePageLimit,
              limitApplied: convertedPDF.metadata.limitApplied,
              processedPages: convertedPDF.metadata.processedPages,
              demoCapEnabled: !patAvailable,
            },
            conversionMode,
            chunks: convertedPDF.chunks.map(c => ({
              id: c.id,
              title: c.title,
              pageRange: c.pageRange,
              wordCount: c.wordCount,
            })),
          },
          markdownContent: convertedPDF.chunks.map(chunk => ({
            chunkId: chunk.id,
            content: chunk.content,
          })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to commit images')
      }

      const result = await response.json()

      setGithubSaveStatus({
        saving: false,
        saved: true,
        commitUrl: result.commitUrl,
      })
    } catch (err) {
      console.error('GitHub save error:', err)
      setGithubSaveStatus({
        saving: false,
        saved: false,
        error: err instanceof Error ? err.message : 'Failed to save to GitHub',
      })
    }
  }, [convertedPDF, generatedImages, characters, settings, stylePreset, imageProvider, negativePrompt, pageLimit, imagePageLimit, patAvailable, conversionMode])

  const handleSelectTemplate = useCallback((template: LoadedTemplate) => {
    setSelectedTemplate(template)
    recordTemplateUsage(template.id)
    setStep('form')
  }, [])

  const handleBack = useCallback(() => {
    // PDF import flow navigation
    if (step === 'pdf-configure') {
      setStep('pdf-upload')
      setConvertedPDF(null)
    } else if (step === 'pdf-characters') {
      setStep('pdf-configure')
    } else if (step === 'pdf-generating') {
      // Can't go back during generation
      return
    } else if (step === 'pdf-upload') {
      setStep('select-type')
      setSelectedType(null)
      setPdfFile(null)
      setPdfError(null)
    } else if (step === 'form' && selectedType === 'strand') {
      setStep('select-template')
      setSelectedTemplate(null)
    } else {
      setStep('select-type')
      setSelectedType(null)
      setSelectedTemplate(null)
    }
    setFormData({})
    setError(null)
    setValidationErrors([])
    setShowPreview(false)
  }, [step, selectedType])

  const handleFieldChange = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear validation errors when user starts typing
    setValidationErrors(prev => prev.filter(e => e.field !== name && !e.field.toLowerCase().includes(name.toLowerCase())))
  }, [])

  const generatePreview = useCallback(() => {
    if (!selectedTemplate) return ''
    const result = generateTemplateFrontmatter(selectedTemplate, formData)
    return result.content
  }, [selectedTemplate, formData])

  const handleCopyFrontmatter = useCallback(() => {
    const content = generatePreview()
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopyFrontmatter?.(content)
  }, [generatePreview, onCopyFrontmatter])

  // Handle canvas save - receives SVG content from WhiteboardCanvas
  const handleCanvasSave = useCallback((svgContent: string, _pngBlob?: Blob) => {
    setCanvasData(svgContent)
    setShowCanvas(false)
    // The canvas is now saved, user can proceed with create
  }, [])

  // Handle mind map save - receives nodes and edges from MindMapEditor
  const handleMindmapSave = useCallback((data: { nodes: unknown[]; edges: unknown[] }) => {
    setMindmapData(data)
    setShowMindmap(false)
    // The mind map is now saved, user can proceed with create
  }, [])

  const handleCreate = useCallback(async () => {
    if (!selectedType) return

    const schema = NODE_SCHEMAS[selectedType]
    const errors: Array<{ field: string; message: string }> = []

    // Validate required fields - collect all errors
    for (const field of schema.fields) {
      if (field.required && !formData[field.name]?.toString().trim()) {
        errors.push({ field: field.label, message: `${field.label} is required` })
      }
    }

    // Canvas type: require canvas data
    if (selectedType === 'canvas' && !canvasData) {
      errors.push({ field: 'Canvas', message: 'Please open the canvas and draw something before creating' })
    }

    // Mind map type: require mind map data
    if (selectedType === 'mindmap' && !mindmapData) {
      errors.push({ field: 'Mind Map', message: 'Please open the mind map editor and create some nodes before saving' })
    }

    // Validate template fields if strand
    if (selectedType === 'strand' && selectedTemplate) {
      const validation = validateFormData(selectedTemplate, formData)
      if (!validation.valid) {
        validation.errors.forEach(err => {
          errors.push({ field: err.field || 'Field', message: err.message })
        })
      }
    }

    // If there are any validation errors, show them all and stop
    if (errors.length > 0) {
      setValidationErrors(errors)
      setError(null) // Clear single error
      return
    }

    setIsCreating(true)
    setError(null)
    setValidationErrors([])

    try {
      // Auto-generate name for supernotes from title
      const nodeName = selectedType === 'supernote' && !formData.name
        ? formData.title?.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50) || 'supernote'
        : formData.name

      const nodePath = parentPath
        ? `${parentPath}/${nodeName}`
        : `weaves/${nodeName}`

      // For canvas/mindmap/supernote type, include the data in the form data
      let finalData: Record<string, unknown> = formData
      if (selectedType === 'canvas') {
        finalData = { ...formData, canvasData, type: 'canvas' }
      } else if (selectedType === 'mindmap') {
        finalData = { ...formData, mindmapData, type: 'mindmap' }
      } else if (selectedType === 'supernote') {
        // Supernote is a strand with strandType: 'supernote' and supernote-specific metadata
        finalData = {
          ...formData,
          strandType: 'supernote',
          supernote: {
            primarySupertag: formData.primarySupertag,
            cardSize: formData.cardSize || '3x5',
            style: formData.supernoteStyle || 'paper',
          },
        }
      }

      // Canvas, mindmap, and supernote are treated as strands with special data
      const nodeType = (selectedType === 'canvas' || selectedType === 'mindmap' || selectedType === 'supernote') ? 'strand' : selectedType
      await onCreateNode(nodeType, finalData, nodePath)
      clearDraft() // Clear saved draft on successful creation
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node')
    } finally {
      setIsCreating(false)
    }
  }, [selectedType, selectedTemplate, formData, parentPath, onCreateNode, onClose, canvasData, mindmapData, clearDraft])

  if (!isOpen) return null

  const schema = selectedType ? NODE_SCHEMAS[selectedType] : null

  // Render mobile bottom sheet on mobile devices
  if (isMobile) {
    return (
      <MobileCreateWizardSheet
        isOpen={isOpen}
        onClose={onClose}
        parentPath={parentPath}
        parentLevel={parentLevel}
        onCreateNode={onCreateNode}
        parentLoomConfig={parentLoomConfig}
        parentWeaveConfig={parentWeaveConfig}
      />
    )
  }

  // Desktop modal
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              {step !== 'select-type' && (
                <button
                  onClick={handleBack}
                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {step === 'select-type' && 'Create New Node'}
                  {step === 'select-template' && 'Choose Template'}
                  {step === 'form' && `Create ${schema?.name}`}
                  {step === 'pdf-upload' && 'Import from PDF'}
                  {step === 'pdf-configure' && 'Configure Import'}
                  {step === 'pdf-characters' && 'Character Setup'}
                  {step === 'pdf-generating' && 'Generating Illustrations'}
                </h2>
                {parentPath && step !== 'pdf-generating' && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[300px]">
                    in {parentPath}
                  </p>
                )}
                {step === 'pdf-generating' && convertedPDF && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[300px]">
                    {convertedPDF.metadata.title}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Draft Restore Banner */}
          {hasSavedDraft && step === 'select-type' && (
            <div className="mx-6 mt-4 flex items-center justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Unsaved draft found
                  </p>
                  {draftTimestamp && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
                      Saved {new Date(draftTimestamp).toLocaleDateString()} at {new Date(draftTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleDeleteDraft}
                  className="px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/50 rounded-lg transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={handleRestoreDraft}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  Restore
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 1: Type Selection */}
            {step === 'select-type' && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  Select the type of node to create
                </p>
                {/* PDF Import - always available */}
                <NodeTypeCard
                  key="pdf-import"
                  schema={NODE_SCHEMAS['pdf-import']}
                  onClick={() => handleSelectType('pdf-import')}
                  disabled={false}
                />
                {/* Divider */}
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">or create manually</span>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                </div>
                {/* Regular node types */}
                {(['weave', 'loom', 'strand'] as NodeType[]).map(type => (
                  <NodeTypeCard
                    key={type}
                    schema={NODE_SCHEMAS[type]}
                    onClick={() => handleSelectType(type)}
                    disabled={!availableTypes.includes(type)}
                  />
                ))}
                {/* Supernote - compact structured notecard */}
                <NodeTypeCard
                  key="supernote"
                  schema={NODE_SCHEMAS['supernote']}
                  onClick={() => handleSelectType('supernote')}
                  disabled={!availableTypes.includes('strand')}
                />
                {/* Divider for visual content */}
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">or draw</span>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                </div>
                {/* Canvas option */}
                <NodeTypeCard
                  key="canvas"
                  schema={NODE_SCHEMAS['canvas']}
                  onClick={() => handleSelectType('canvas')}
                  disabled={!availableTypes.includes('strand')}
                />
              </div>
            )}

            {/* Step 2: Template Selection (strands only) */}
            {step === 'select-template' && (
              <TemplateSelector
                onSelectTemplate={handleSelectTemplate}
                selectedTemplateId={selectedTemplate?.id}
                showPreview={true}
                compact={false}
                onCreateTemplate={() => setShowTemplateBuilder(true)}
              />
            )}

            {/* Step 3: Form */}
            {step === 'form' && schema && (
              <div className="space-y-4">
                {/* Template indicator for strands */}
                {selectedType === 'strand' && selectedTemplate && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      Using template: {selectedTemplate.name}
                    </span>
                  </div>
                )}

                {/* Seeded metadata hint */}
                {seededMetadata.tags && seededMetadata.tags.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                    <Tag className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-xs text-cyan-700 dark:text-cyan-300">
                      Inherited tags available: {seededMetadata.tags.slice(0, 3).join(', ')}
                      {seededMetadata.tags.length > 3 && ` +${seededMetadata.tags.length - 3} more`}
                    </span>
                  </div>
                )}

                {/* Form fields */}
                <div className="space-y-4">
                  {schema.fields.map(field => (
                    <ValidatedFormField
                      key={field.name}
                      field={field}
                      value={formData[field.name]?.toString() || ''}
                      onChange={(value) => handleFieldChange(field.name, value)}
                      onBlur={() => touchField(field.name)}
                      error={getFieldError(field.name)}
                      touched={touchedFields.has(field.name)}
                      seededMetadata={seededMetadata}
                    />
                  ))}
                </div>

                {/* Canvas button for canvas type */}
                {selectedType === 'canvas' && (
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <button
                      type="button"
                      onClick={() => setShowCanvas(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg transition-colors"
                    >
                      <PenTool className="w-5 h-5" />
                      {canvasData ? 'Edit Canvas' : 'Open Canvas'}
                    </button>
                    {canvasData && (
                      <p className="mt-2 text-xs text-center text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1">
                        <Check className="w-3 h-3" />
                        Canvas content saved
                      </p>
                    )}
                  </div>
                )}

                {/* Mind Map button for mindmap type */}
                {selectedType === 'mindmap' && (
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <button
                      type="button"
                      onClick={() => setShowMindmap(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-lg transition-colors"
                    >
                      <GitBranch className="w-5 h-5" />
                      {mindmapData ? 'Edit Mind Map' : 'Open Mind Map Editor'}
                    </button>
                    {mindmapData && (
                      <p className="mt-2 text-xs text-center text-violet-600 dark:text-violet-400 flex items-center justify-center gap-1">
                        <Check className="w-3 h-3" />
                        Mind map saved ({mindmapData.nodes.length} nodes, {mindmapData.edges.length} connections)
                      </p>
                    )}
                  </div>
                )}

                {/* Frontmatter preview toggle */}
                {selectedType === 'strand' && selectedTemplate && (
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                    >
                      {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showPreview ? 'Hide' : 'Show'} Frontmatter Preview
                    </button>

                    {showPreview && (
                      <FrontmatterPreview
                        content={generatePreview()}
                        onCopy={handleCopyFrontmatter}
                        copied={copied}
                      />
                    )}
                  </div>
                )}

                {/* Validation Errors (multiple) */}
                <ErrorSummary errors={validationErrors} />

                {/* Single Error (API errors, etc.) */}
                {error && validationErrors.length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                  </div>
                )}
              </div>
            )}

            {/* PDF Import Steps */}
            {step === 'pdf-upload' && (
              <PDFUploadStep
                onFileSelect={handlePDFUpload}
                isUploading={isUploadingPDF}
                error={pdfError || undefined}
              />
            )}

            {step === 'pdf-configure' && convertedPDF && (
              <PDFConfigureStep
                convertedPDF={convertedPDF}
                conversionMode={conversionMode}
                setConversionMode={setConversionMode}
                provider={imageProvider}
                setProvider={setImageProvider}
                batchSize={batchSize}
                setBatchSize={setBatchSize}
                // Advanced provider options
                openaiQuality={openaiQuality}
                setOpenaiQuality={setOpenaiQuality}
                openaiSize={openaiSize}
                setOpenaiSize={setOpenaiSize}
                replicateModel={replicateModel}
                setReplicateModel={setReplicateModel}
                replicateAspect={replicateAspect}
                setReplicateAspect={setReplicateAspect}
                // Chunk selection
                chunkSelections={chunkSelections}
                setChunkSelections={setChunkSelections}
                showChunkSelection={showChunkSelection}
                setShowChunkSelection={setShowChunkSelection}
                pageLimit={pageLimit}
                setPageLimit={setPageLimit}
                imagePageLimit={imagePageLimit}
                setImagePageLimit={setImagePageLimit}
                capApplied={capApplied}
                setCapApplied={setCapApplied}
                patAvailable={patAvailable}
                appliedPageLimit={convertedPDF.metadata.processedPages || (convertedPDF.metadata.limitApplied ? pageLimit : undefined)}
                // Cost limit
                costLimit={costLimit}
                setCostLimit={setCostLimit}
                // Advanced options
                webhookUrl={webhookUrl}
                setWebhookUrl={setWebhookUrl}
                webhookSecret={webhookSecret}
                setWebhookSecret={setWebhookSecret}
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
                // Illustration granularity and smart skip
                illustrationGranularity={illustrationGranularity}
                setIllustrationGranularity={setIllustrationGranularity}
                smartIllustrationSkip={smartIllustrationSkip}
                setSmartIllustrationSkip={setSmartIllustrationSkip}
                // Worthiness analysis
                onAutoSelect={handleAutoSelectWorthy}
                useLLMForWorthiness={useLLMForWorthiness}
                setUseLLMForWorthiness={setUseLLMForWorthiness}
                llmProvider={llmProvider}
                setLlmProvider={setLlmProvider}
                autoSelectThreshold={autoSelectThreshold}
                setAutoSelectThreshold={setAutoSelectThreshold}
                onReprocess={() => {
                  if (pdfFile) {
                    handlePDFUpload(pdfFile)
                  }
                }}
              />
            )}

            {step === 'pdf-characters' && (
              <PDFCharactersStep
                characters={characters}
                setCharacters={setCharacters}
                settings={settings}
                setSettings={setSettings}
                stylePreset={stylePreset}
                setStylePreset={setStylePreset}
                negativePrompt={negativePrompt}
                setNegativePrompt={setNegativePrompt}
              />
            )}

            {step === 'pdf-generating' && (
              <PDFGeneratingStep
                job={generationJob}
                onPause={handlePauseJob}
                onResume={handleResumeJob}
                onCancel={handleCancelJob}
                onContinue={handleContinueJob}
                onSaveToGitHub={handleSaveToGitHub}
                generatedImages={generatedImages}
                githubStatus={githubSaveStatus}
              />
            )}
          </div>

          {/* Footer */}
          {step === 'form' && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="px-6 py-2 text-sm font-semibold text-white bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-300 rounded-lg transition-colors flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Zap className="w-4 h-4" />
                    </motion.div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create {schema?.name}
                  </>
                )}
              </button>
            </div>
          )}

          {/* PDF Configure Footer */}
          {step === 'pdf-configure' && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Back
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleStartGeneration}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Skip to Generation
                </button>
                <button
                  onClick={() => setStep('pdf-characters')}
                  className="px-6 py-2 text-sm font-semibold text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Character Setup
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PDF Characters Footer */}
          {step === 'pdf-characters' && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleStartGeneration}
                className="px-6 py-2 text-sm font-semibold text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <Image className="w-4 h-4" />
                Start Generation
              </button>
            </div>
          )}

          {/* PDF Generating Footer - Close when done */}
          {step === 'pdf-generating' && generationJob?.status === 'completed' && (
            <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Done
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Style Config Wizard Modal */}
      {showStyleWizard && workStyleProfile && (
        <StyleConfigWizard
          isOpen={showStyleWizard}
          onClose={() => {
            setShowStyleWizard(false)
            setStep('pdf-configure')
          }}
          profile={workStyleProfile}
          suggestions={undefined} // TODO: extract suggestions from analysis result
          onConfirm={handleStyleWizardConfirm}
        />
      )}

      {/* Worthiness Preview Modal */}
      {showWorthinessPreview && (
        <WorthinessPreviewModal
          isOpen={showWorthinessPreview}
          onClose={() => setShowWorthinessPreview(false)}
          items={Array.from(worthinessResults.entries()).map(([chunkId, result]) => {
            const chunk = convertedPDF?.chunks.find(c => c.id === chunkId)
            return {
              chunkId,
              title: chunk?.title || chunkId,
              result,
              overridden: worthinessOverrides.get(chunkId),
            }
          })}
          threshold={autoSelectThreshold}
          setThreshold={setAutoSelectThreshold}
          onToggleOverride={handleWorthinessOverride}
          onConfirm={handleWorthinessConfirm}
          estimatedCostPerImage={imageProvider === 'openai'
            ? (openaiQuality === 'hd' ? 0.08 : 0.04) * (openaiSize === '1024x1024' ? 1 : 2)
            : replicateModel === 'flux-schnell' ? 0.003 : replicateModel === 'flux-dev' ? 0.025 : 0.055
          }
        />
      )}

      {/* Canvas/Whiteboard Modal */}
      {showCanvas && (
        <WhiteboardCanvas
          isOpen={showCanvas}
          onClose={() => setShowCanvas(false)}
          onSave={handleCanvasSave}
          theme="dark"
        />
      )}

      {/* Mind Map Editor Modal */}
      {showMindmap && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowMindmap(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-6xl h-[80vh] bg-zinc-900 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-violet-400" />
                Mind Map Editor
              </h3>
              <button
                onClick={() => setShowMindmap(false)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-[calc(100%-80px)]">
              <MindMapEditor
                theme="oceanic-dark"
                height="100%"
                initialNodes={mindmapData?.nodes as any || undefined}
                initialEdges={mindmapData?.edges as any || undefined}
                onSave={(data) => handleMindmapSave({ nodes: data.nodes, edges: data.edges })}
              />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Template Builder Modal */}
      {showTemplateBuilder && (
        <TemplateBuilder
          onSave={() => {
            // Template saved - could refresh template list here
          }}
          onClose={() => setShowTemplateBuilder(false)}
          isDark={true}
        />
      )}
    </AnimatePresence>
  )
}
