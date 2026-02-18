/**
 * useWriterPublish Hook
 * @module components/quarry/ui/writer/hooks/useWriterPublish
 *
 * Provides publishing functionality for the writer widget.
 * Handles converting drafts to published strands with proper metadata.
 */

import { useState, useCallback } from 'react'
import { usePublisher, type UsePublisherReturn } from '@/lib/publish/hooks/usePublisher'
import { saveDraft, type DraftRecord } from '@/lib/codexDatabase'
import { invalidateBlocksCache } from '@/lib/hooks/useBlockTags'

// ============================================================================
// TYPES
// ============================================================================

export interface PublishOptions {
  /** Content to publish */
  content: string
  /** Target path for the strand */
  targetPath: string
  /** Title for the strand (extracted from content if not provided) */
  title?: string
  /** Tags for the strand */
  tags?: string[]
  /** Whether to run NLP analysis */
  runNLP?: boolean
  /** Whether to include frontmatter */
  includeFrontmatter?: boolean
  /** Custom frontmatter to add */
  customFrontmatter?: Record<string, unknown>
}

export interface PublishResult {
  success: boolean
  strandPath?: string
  strandId?: string
  error?: string
}

export interface UseWriterPublishState {
  /** Whether currently publishing */
  isPublishing: boolean
  /** Publish progress (0-100) */
  publishProgress: number
  /** Current publish status message */
  statusMessage: string | null
  /** Last publish result */
  lastPublishResult: PublishResult | null
  /** Whether publish modal should be shown */
  showPublishModal: boolean
  /** Error from publish attempt */
  publishError: string | null
}

export interface UseWriterPublishActions {
  /** Publish content as a new strand */
  publish: (options: PublishOptions) => Promise<PublishResult>
  /** Quick publish with defaults */
  quickPublish: (content: string, targetPath: string) => Promise<PublishResult>
  /** Show/hide publish modal */
  setShowPublishModal: (show: boolean) => void
  /** Reset publish state */
  resetPublishState: () => void
  /** Get underlying publisher */
  getPublisher: () => UsePublisherReturn
}

export interface UseWriterPublishReturn extends UseWriterPublishState, UseWriterPublishActions {}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract title from markdown content
 */
function extractTitle(content: string): string {
  if (!content.trim()) return 'Untitled'

  // Try to find first heading
  const headingMatch = content.match(/^#+ (.+)$/m)
  if (headingMatch) return headingMatch[1].trim()

  // Fall back to first non-empty line
  const firstLine = content.split('\n').find((line) => line.trim())
  if (firstLine) return firstLine.trim().slice(0, 50)

  return 'Untitled'
}

/**
 * Generate slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

/**
 * Generate basic frontmatter
 */
function generateFrontmatter(options: {
  title: string
  tags?: string[]
  custom?: Record<string, unknown>
}): string {
  const { title, tags = [], custom = {} } = options
  
  const lines: string[] = ['---']
  lines.push(`title: "${title}"`)
  lines.push(`createdAt: "${new Date().toISOString()}"`)
  lines.push(`status: published`)
  
  if (tags.length > 0) {
    lines.push('tags:')
    tags.forEach(t => lines.push(`  - ${t}`))
  }
  
  // Add custom frontmatter
  Object.entries(custom).forEach(([key, value]) => {
    if (typeof value === 'string') {
      lines.push(`${key}: "${value}"`)
    } else if (Array.isArray(value)) {
      lines.push(`${key}:`)
      value.forEach(v => lines.push(`  - ${v}`))
    } else if (typeof value === 'object') {
      lines.push(`${key}:`)
      Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
        lines.push(`  ${k}: ${JSON.stringify(v)}`)
      })
    } else {
      lines.push(`${key}: ${value}`)
    }
  })
  
  lines.push('---')
  lines.push('')
  
  return lines.join('\n')
}

/**
 * Generate full strand path
 */
function generateStrandPath(basePath: string, slug: string): string {
  // Ensure path ends with /
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
  return `${normalizedBase}${slug}.md`
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useWriterPublish(): UseWriterPublishReturn {
  // Get the main publisher hook
  const publisher = usePublisher()

  // State
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishProgress, setPublishProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [lastPublishResult, setLastPublishResult] = useState<PublishResult | null>(null)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  // ============================================================================
  // PUBLISH FUNCTION
  // ============================================================================

  const publish = useCallback(async (options: PublishOptions): Promise<PublishResult> => {
    const {
      content,
      targetPath,
      title: providedTitle,
      tags = [],
      runNLP = false,
      includeFrontmatter = true,
      customFrontmatter = {},
    } = options

    if (!content.trim()) {
      return { success: false, error: 'Content is empty' }
    }

    setIsPublishing(true)
    setPublishProgress(0)
    setStatusMessage('Preparing content...')
    setPublishError(null)

    try {
      // Extract or use provided title
      const title = providedTitle || extractTitle(content)
      const slug = generateSlug(title)
      const strandPath = generateStrandPath(targetPath, slug)
      const strandId = crypto.randomUUID()

      setPublishProgress(20)
      setStatusMessage('Generating metadata...')

      // Build final content with frontmatter
      let finalContent = content
      if (includeFrontmatter) {
        const frontmatter = generateFrontmatter({
          title,
          tags,
          custom: customFrontmatter,
        })
        
        // Check if content already has frontmatter
        const hasFrontmatter = content.trim().startsWith('---')
        if (!hasFrontmatter) {
          finalContent = frontmatter + content
        }
      }

      setPublishProgress(40)
      setStatusMessage('Saving strand...')

      // Save as a published draft (which will be synced)
      await saveDraft({
        id: strandId,
        type: 'strand',
        path: strandPath,
        title,
        content: finalContent,
        metadata: JSON.stringify({
          publishedAt: new Date().toISOString(),
          tags,
          runNLP,
        }),
        autoSaved: false,
      })

      setPublishProgress(60)

      // Queue for publishing if publisher is configured
      if (publisher.settings.autoPublish) {
        setStatusMessage('Queueing for sync...')
        await publisher.queueItem('strand', strandId)
        setPublishProgress(80)
      }

      setPublishProgress(100)
      setStatusMessage('Published successfully!')

      // Invalidate block tags cache for this strand (async, don't wait)
      invalidateBlocksCache(strandPath).catch(err => {
        console.warn('[useWriterPublish] Failed to invalidate block cache:', err)
      })

      const result: PublishResult = {
        success: true,
        strandPath,
        strandId,
      }

      setLastPublishResult(result)
      
      // Reset status after delay
      setTimeout(() => {
        setStatusMessage(null)
        setPublishProgress(0)
      }, 2000)

      return result
    } catch (err) {
      console.error('[useWriterPublish] Publish failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'Publish failed'
      setPublishError(errorMessage)
      setStatusMessage(null)
      
      const result: PublishResult = {
        success: false,
        error: errorMessage,
      }
      
      setLastPublishResult(result)
      return result
    } finally {
      setIsPublishing(false)
    }
  }, [publisher])

  // ============================================================================
  // QUICK PUBLISH
  // ============================================================================

  const quickPublish = useCallback(async (
    content: string,
    targetPath: string
  ): Promise<PublishResult> => {
    return publish({
      content,
      targetPath,
      includeFrontmatter: true,
    })
  }, [publish])

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const resetPublishState = useCallback(() => {
    setIsPublishing(false)
    setPublishProgress(0)
    setStatusMessage(null)
    setLastPublishResult(null)
    setPublishError(null)
  }, [])

  const getPublisher = useCallback(() => publisher, [publisher])

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    isPublishing,
    publishProgress,
    statusMessage,
    lastPublishResult,
    showPublishModal,
    publishError,

    // Actions
    publish,
    quickPublish,
    setShowPublishModal,
    resetPublishState,
    getPublisher,
  }
}

export default useWriterPublish

