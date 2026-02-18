/**
 * Progressive Markdown Renderer
 *
 * Memory-optimized markdown rendering with:
 * - Block-level virtualization using IntersectionObserver
 * - Block recycling for DOM node reuse
 * - Lazy rendering of off-screen content
 * - Placeholder heights for scroll stability
 * - Mermaid diagram support
 *
 * PERFORMANCE:
 * - Only renders visible blocks + buffer
 * - Disposes DOM nodes >2000px from viewport
 * - Memoizes parsed blocks
 *
 * @module codex/ui/ProgressiveMarkdown
 */

'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback, memo, type ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import dynamic from 'next/dynamic'

// Dynamic import for InlineMermaid to avoid SSR issues
const InlineMermaid = dynamic(
  () => import('../diagrams/MermaidDiagram').then(mod => ({ default: mod.InlineMermaid })),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse my-4">
        <div className="h-4 w-24 bg-zinc-300 dark:bg-zinc-700 rounded mb-2" />
        <div className="h-32 bg-zinc-200 dark:bg-zinc-600 rounded" />
      </div>
    )
  }
)

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface MarkdownBlock {
  id: string
  type: 'heading' | 'paragraph' | 'code' | 'list' | 'blockquote' | 'table' | 'hr' | 'html' | 'other'
  content: string
  level?: number // For headings
  estimatedHeight: number
}

interface BlockState {
  rendered: boolean
  height: number
  visible: boolean
}

interface ProgressiveMarkdownProps {
  content: string
  className?: string
  /** Number of blocks to render above/below viewport */
  bufferSize?: number
  /** Height threshold for recycling (px from viewport) */
  recycleThreshold?: number
  /** Minimum blocks to always render (above the fold) */
  minBlocks?: number
  /** Custom components for ReactMarkdown */
  components?: Record<string, React.ComponentType<any>>
  /** Callback for rendering custom elements */
  onRenderBlock?: (block: MarkdownBlock, index: number) => React.ReactNode | null
}

/* ═══════════════════════════════════════════════════════════════════════════
   BLOCK PARSER
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Parse markdown content into semantic blocks
 * Returns array of blocks with type and estimated height
 */
function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  if (!content) return []
  const blocks: MarkdownBlock[] = []
  const lines = content.split('\n')

  let currentBlock: string[] = []
  let currentType: MarkdownBlock['type'] = 'paragraph'
  let inCodeBlock = false
  let codeLanguage = ''
  let blockIndex = 0

  const pushBlock = (type: MarkdownBlock['type'], content: string, level?: number) => {
    // Guard against undefined/null content
    if (!content || !content.trim()) {
      return
    }
    const estimatedHeight = estimateBlockHeight(type, content)
    blocks.push({
      id: `pmd-block-${blockIndex++}`,
      type,
      content,
      level,
      estimatedHeight,
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block handling
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        currentBlock.push(line)
        pushBlock('code', currentBlock.join('\n'))
        currentBlock = []
        inCodeBlock = false
      } else {
        // Start code block - flush previous block
        if (currentBlock.length > 0) {
          pushBlock(currentType, currentBlock.join('\n'))
          currentBlock = []
        }
        inCodeBlock = true
        codeLanguage = line.slice(3).trim()
        currentBlock.push(line)
      }
      continue
    }

    if (inCodeBlock) {
      currentBlock.push(line)
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      if (currentBlock.length > 0) {
        pushBlock(currentType, currentBlock.join('\n'))
        currentBlock = []
      }
      pushBlock('heading', line, headingMatch[1].length)
      continue
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      if (currentBlock.length > 0) {
        pushBlock(currentType, currentBlock.join('\n'))
        currentBlock = []
      }
      pushBlock('hr', line)
      continue
    }

    // Blockquote
    if (line.startsWith('>')) {
      if (currentType !== 'blockquote' && currentBlock.length > 0) {
        pushBlock(currentType, currentBlock.join('\n'))
        currentBlock = []
      }
      currentType = 'blockquote'
      currentBlock.push(line)
      continue
    }

    // List item (unordered or ordered)
    if (/^[\s]*[-*+]\s/.test(line) || /^[\s]*\d+\.\s/.test(line)) {
      if (currentType !== 'list' && currentBlock.length > 0) {
        pushBlock(currentType, currentBlock.join('\n'))
        currentBlock = []
      }
      currentType = 'list'
      currentBlock.push(line)
      continue
    }

    // Table row
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (currentType !== 'table' && currentBlock.length > 0) {
        pushBlock(currentType, currentBlock.join('\n'))
        currentBlock = []
      }
      currentType = 'table'
      currentBlock.push(line)
      continue
    }

    // HTML block
    if (line.startsWith('<') && !line.startsWith('<!--')) {
      if (currentType !== 'html' && currentBlock.length > 0) {
        pushBlock(currentType, currentBlock.join('\n'))
        currentBlock = []
      }
      currentType = 'html'
      currentBlock.push(line)
      continue
    }

    // Empty line - might end current block
    if (line.trim() === '') {
      if (currentBlock.length > 0 && currentType !== 'list') {
        pushBlock(currentType, currentBlock.join('\n'))
        currentBlock = []
        currentType = 'paragraph'
      } else if (currentType === 'list') {
        // Check if next non-empty line continues the list
        let nextNonEmpty = i + 1
        while (nextNonEmpty < lines.length && lines[nextNonEmpty].trim() === '') {
          nextNonEmpty++
        }
        if (
          nextNonEmpty < lines.length &&
          !(/^[\s]*[-*+]\s/.test(lines[nextNonEmpty]) ||
            /^[\s]*\d+\.\s/.test(lines[nextNonEmpty]))
        ) {
          pushBlock(currentType, currentBlock.join('\n'))
          currentBlock = []
          currentType = 'paragraph'
        } else {
          currentBlock.push(line)
        }
      }
      continue
    }

    // Regular paragraph content
    if (currentType !== 'paragraph' && currentBlock.length > 0) {
      pushBlock(currentType, currentBlock.join('\n'))
      currentBlock = []
    }
    currentType = 'paragraph'
    currentBlock.push(line)
  }

  // Flush remaining content
  if (currentBlock.length > 0) {
    pushBlock(currentType, currentBlock.join('\n'))
  }

  return blocks
}

/**
 * Estimate block height based on content type and length
 */
function estimateBlockHeight(type: MarkdownBlock['type'], content: string): number {
  // Guard against undefined/null content
  if (!content) {
    console.debug('[ProgressiveMarkdown] estimateBlockHeight called with empty content, type:', type)
    return 40 // Default height
  }

  const lineCount = content.split('\n').length
  const charCount = content.length

  switch (type) {
    case 'heading':
      return 60 // Heading + margin
    case 'code':
      return Math.max(100, lineCount * 24 + 48) // Line height + padding
    case 'list':
      return lineCount * 32 + 16 // List items + margin
    case 'table':
      return Math.max(100, lineCount * 40 + 32) // Rows + header
    case 'blockquote':
      return Math.max(60, lineCount * 28 + 24)
    case 'hr':
      return 32
    case 'html':
      return Math.max(40, charCount / 4) // Rough estimate
    case 'paragraph':
    default:
      // Estimate based on character count (roughly 80 chars per line)
      const estimatedLines = Math.ceil(charCount / 80)
      return Math.max(28, estimatedLines * 28 + 16)
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULT CODE COMPONENT WITH MERMAID SUPPORT
═══════════════════════════════════════════════════════════════════════════ */

type CodeProps = ComponentPropsWithoutRef<'code'> & {
  inline?: boolean
  node?: unknown
}

/**
 * Default code block renderer with Mermaid diagram support
 */
const DefaultCodeComponent = memo(function DefaultCodeComponent({
  node: _node,
  inline,
  className,
  children,
  ...props
}: CodeProps) {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  // Guard against undefined/null children
  const codeString = String(children ?? '').replace(/\n$/, '')

  // Render Mermaid diagrams with InlineMermaid component
  if (!inline && language === 'mermaid') {
    return <InlineMermaid code={codeString} />
  }

  // Standard code block
  if (!inline && match) {
    return (
      <pre className="p-4 bg-zinc-900 rounded-lg overflow-auto">
        <code className={className} style={{ color: '#d4d4d4' }}>
          {codeString}
        </code>
      </pre>
    )
  }

  // Inline code
  return (
    <code className={`${className || ''} px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-sm`} {...props}>
      {children}
    </code>
  )
})

/* ═══════════════════════════════════════════════════════════════════════════
   BLOCK RENDERER COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface BlockRendererProps {
  block: MarkdownBlock
  isVisible: boolean
  onHeightChange: (height: number) => void
  components?: Record<string, React.ComponentType<any>>
}

const BlockRenderer = memo(function BlockRenderer({
  block,
  isVisible,
  onHeightChange,
  components,
}: BlockRendererProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Measure actual height after render
  useEffect(() => {
    if (ref.current && isVisible) {
      const height = ref.current.offsetHeight
      if (height > 0) {
        onHeightChange(height)
      }
    }
  }, [isVisible, onHeightChange])

  // If not visible, render placeholder with estimated height
  if (!isVisible) {
    return (
      <div
        data-block-id={block.id}
        data-block-type={block.type}
        style={{ height: block.estimatedHeight }}
        className="bg-transparent"
        aria-hidden="true"
      />
    )
  }

  // Merge default code component with user-provided components
  const mergedComponents = useMemo(() => ({
    code: DefaultCodeComponent,
    ...components,
  }), [components])

  return (
    <div
      ref={ref}
      data-block-id={block.id}
      data-block-type={block.type}
      className="pmd-block"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={mergedComponents}
      >
        {block.content}
      </ReactMarkdown>
    </div>
  )
})

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Progressive Markdown component with block recycling
 */
export default function ProgressiveMarkdown({
  content,
  className = '',
  bufferSize = 3,
  recycleThreshold = 2000,
  minBlocks = 5,
  components,
  onRenderBlock,
}: ProgressiveMarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Parse blocks (memoized) - always returns array, fallback for safety
  const blocks = useMemo(() => parseMarkdownBlocks(content) ?? [], [content])

  // Track block visibility and heights
  const [blockStates, setBlockStates] = useState<Map<string, BlockState>>(() => {
    const states = new Map<string, BlockState>()
    blocks?.forEach((block, index) => {
      states.set(block.id, {
        rendered: index < minBlocks,
        height: block.estimatedHeight,
        visible: index < minBlocks,
      })
    })
    return states
  })

  // Reset states when content changes
  useEffect(() => {
    const states = new Map<string, BlockState>()
    blocks?.forEach((block, index) => {
      states.set(block.id, {
        rendered: index < minBlocks,
        height: block.estimatedHeight,
        visible: index < minBlocks,
      })
    })
    setBlockStates(states)
  }, [blocks, minBlocks])

  // Handle height updates
  const handleHeightChange = useCallback((blockId: string, height: number) => {
    setBlockStates((prev) => {
      const current = prev.get(blockId)
      if (current && current.height !== height) {
        const next = new Map(prev)
        next.set(blockId, { ...current, height })
        return next
      }
      return prev
    })
  }, [])

  // IntersectionObserver for visibility tracking
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        setBlockStates((prev) => {
          let hasChanges = false
          const next = new Map(prev)

          entries.forEach((entry) => {
            const blockId = entry.target.getAttribute('data-block-id')
            if (!blockId) return

            const current = next.get(blockId)
            if (!current) return

            const newVisible = entry.isIntersecting
            if (current.visible !== newVisible || (newVisible && !current.rendered)) {
              hasChanges = true
              next.set(blockId, {
                ...current,
                visible: newVisible,
                rendered: newVisible || current.rendered,
              })
            }
          })

          return hasChanges ? next : prev
        })
      },
      {
        root: null,
        rootMargin: `${recycleThreshold}px 0px ${recycleThreshold}px 0px`,
        threshold: 0,
      }
    )

    // Observe all block elements
    const container = containerRef.current
    const blockElements = container.querySelectorAll('[data-block-id]')
    blockElements.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
    }
  }, [blocks, recycleThreshold])

  // Calculate which blocks to render based on visibility + buffer
  const blocksToRender = useMemo(() => {
    const result: Array<{ block: MarkdownBlock; shouldRender: boolean }> = []

    // Find first and last visible indices
    let firstVisible = -1
    let lastVisible = -1

    blocks?.forEach((block, index) => {
      const state = blockStates.get(block.id)
      if (state?.visible) {
        if (firstVisible === -1) firstVisible = index
        lastVisible = index
      }
    })

    // If nothing visible, show initial blocks
    const blocksLength = blocks?.length ?? 0
    if (firstVisible === -1) {
      firstVisible = 0
      lastVisible = Math.min(minBlocks - 1, blocksLength - 1)
    }

    // Add buffer
    const renderStart = Math.max(0, firstVisible - bufferSize)
    const renderEnd = Math.min(blocksLength - 1, lastVisible + bufferSize)

    blocks?.forEach((block, index) => {
      const shouldRender = index >= renderStart && index <= renderEnd
      result.push({ block, shouldRender })
    })

    return result
  }, [blocks, blockStates, bufferSize, minBlocks])

  return (
    <div
      ref={containerRef}
      className={`progressive-markdown ${className}`}
    >
      {blocksToRender.map(({ block, shouldRender }, index) => {
        // Custom render callback
        if (onRenderBlock) {
          const custom = onRenderBlock(block, index)
          if (custom !== null) return custom
        }

        return (
          <BlockRenderer
            key={block.id}
            block={block}
            isVisible={shouldRender}
            onHeightChange={(height) => handleHeightChange(block.id, height)}
            components={components}
          />
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export { parseMarkdownBlocks, estimateBlockHeight }
// MarkdownBlock is already exported as an interface above (line 29)
