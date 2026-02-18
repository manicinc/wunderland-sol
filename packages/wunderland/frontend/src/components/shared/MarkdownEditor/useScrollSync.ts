/**
 * @file useScrollSync.ts
 * @description Bidirectional scroll synchronization for markdown editor and preview
 * Uses data-index method for accurate mapping between editor lines and preview elements
 * @version 1.0.0
 * @inspiration VS Code markdown preview scroll sync
 */

import { ref, onBeforeUnmount, type Ref } from 'vue'
import { marked } from 'marked'
import gsap from 'gsap'

export interface LineMapping {
  /** Source line number in markdown (0-indexed) */
  sourceLine: number
  /** Corresponding preview element */
  element: HTMLElement
  /** Offset from top of preview container */
  offsetTop: number
}

export interface UseScrollSyncOptions {
  /** Enable smooth scrolling animation */
  smoothScroll?: boolean
  /** Scroll animation duration in seconds */
  scrollDuration?: number
  /** Debounce delay for scroll events in milliseconds */
  debounceDelay?: number
  /** Enable scroll sync (can be toggled by user) */
  enabled?: boolean
}

export interface UseScrollSyncReturn {
  /** Sync preview scroll based on editor scroll position */
  syncEditorToPreview: (editorScrollTop: number, editorHeight: number) => void
  /** Sync editor scroll based on preview scroll position */
  syncPreviewToEditor: (previewScrollTop: number, previewHeight: number) => void
  /** Update line mappings when content changes */
  updateLineMapping: (markdownContent: string, previewElement: HTMLElement) => void
  /** Enable or disable scroll sync */
  setEnabled: (enabled: boolean) => void
  /** Check if scroll sync is enabled */
  isEnabled: Ref<boolean>
  /** Current line mappings */
  lineMappings: Ref<LineMapping[]>
}

/**
 * Composable for bidirectional scroll synchronization between markdown editor and preview
 * Uses the data-index method for accurate mapping
 */
export function useScrollSync(options: UseScrollSyncOptions = {}): UseScrollSyncReturn {
  const {
    smoothScroll = true,
    scrollDuration = 0.3,
    debounceDelay = 100,
    enabled: initialEnabled = true,
  } = options

  const lineMappings = ref<LineMapping[]>([])
  const isEnabled = ref(initialEnabled)
  const isSyncing = ref(false)
  let debounceTimer: number | undefined

  /**
   * Parse markdown and create line mappings with data-line attributes
   * This is the core of the data-index scroll sync method
   */
  function updateLineMapping(markdownContent: string, previewElement: HTMLElement) {
    if (!previewElement) return

    const lines = markdownContent.split('\n')
    const mappings: LineMapping[] = []

    // Parse the markdown using marked and track line numbers
    // We'll add data-line attributes to elements during rendering
    const tokens = marked.lexer(markdownContent)

    // Find all elements with data-line attributes in the preview
    const elementsWithLineData = previewElement.querySelectorAll('[data-source-line]')

    elementsWithLineData.forEach((element) => {
      const sourceLine = parseInt(element.getAttribute('data-source-line') || '0', 10)
      const htmlElement = element as HTMLElement

      mappings.push({
        sourceLine,
        element: htmlElement,
        offsetTop: htmlElement.offsetTop,
      })
    })

    // Sort mappings by source line
    mappings.sort((a, b) => a.sourceLine - b.sourceLine)
    lineMappings.value = mappings

    console.log('Updated line mappings:', mappings.length, 'mappings')
  }

  /**
   * Find the corresponding preview element for a given editor line
   */
  function findPreviewElementForLine(line: number): LineMapping | null {
    if (lineMappings.value.length === 0) return null

    // Binary search for the closest line mapping
    let left = 0
    let right = lineMappings.value.length - 1
    let closest = lineMappings.value[0]

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const mapping = lineMappings.value[mid]

      if (mapping.sourceLine === line) {
        return mapping
      } else if (mapping.sourceLine < line) {
        closest = mapping
        left = mid + 1
      } else {
        right = mid - 1
      }
    }

    return closest
  }

  /**
   * Find the corresponding editor line for a given preview scroll position
   */
  function findEditorLineForScrollTop(scrollTop: number): number {
    if (lineMappings.value.length === 0) return 0

    // Find the mapping whose element is closest to the scroll position
    let closest = lineMappings.value[0]
    let minDiff = Math.abs(closest.offsetTop - scrollTop)

    for (const mapping of lineMappings.value) {
      const diff = Math.abs(mapping.offsetTop - scrollTop)
      if (diff < minDiff) {
        minDiff = diff
        closest = mapping
      }
    }

    return closest.sourceLine
  }

  /**
   * Sync preview scroll based on editor scroll position
   */
  function syncEditorToPreview(editorScrollTop: number, editorHeight: number) {
    if (!isEnabled.value || isSyncing.value) return

    // Debounce scroll events
    clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => {
      performEditorToPreviewSync(editorScrollTop, editorHeight)
    }, debounceDelay)
  }

  /**
   * Perform the actual editor to preview synchronization
   */
  function performEditorToPreviewSync(editorScrollTop: number, editorHeight: number) {
    if (lineMappings.value.length === 0) return

    // Calculate the approximate line number at the top of the editor viewport
    // Assuming average line height of 24px (1.6 line-height * 14px font)
    const averageLineHeight = 24
    const topLine = Math.floor(editorScrollTop / averageLineHeight)

    // Find the corresponding preview element
    const mapping = findPreviewElementForLine(topLine)
    if (!mapping) return

    // Calculate the target scroll position in the preview
    const targetScrollTop = mapping.offsetTop

    // Apply smooth scroll
    if (smoothScroll && mapping.element.parentElement) {
      isSyncing.value = true
      gsap.to(mapping.element.parentElement, {
        scrollTop: targetScrollTop,
        duration: scrollDuration,
        ease: 'power2.out',
        onComplete: () => {
          isSyncing.value = false
        },
      })
    } else if (mapping.element.parentElement) {
      mapping.element.parentElement.scrollTop = targetScrollTop
    }
  }

  /**
   * Sync editor scroll based on preview scroll position
   */
  function syncPreviewToEditor(previewScrollTop: number, previewHeight: number) {
    if (!isEnabled.value || isSyncing.value) return

    // Debounce scroll events
    clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => {
      performPreviewToEditorSync(previewScrollTop, previewHeight)
    }, debounceDelay)
  }

  /**
   * Perform the actual preview to editor synchronization
   */
  function performPreviewToEditorSync(previewScrollTop: number, previewHeight: number) {
    if (lineMappings.value.length === 0) return

    // Find the corresponding editor line
    const targetLine = findEditorLineForScrollTop(previewScrollTop)

    // Calculate the target scroll position in the editor
    const averageLineHeight = 24
    const targetScrollTop = targetLine * averageLineHeight

    // We don't have a direct reference to the editor scroll container here
    // This will be handled by the MarkdownEditor component
    // For now, we'll emit an event or return the target position
    console.log('Sync preview to editor:', { previewScrollTop, targetLine, targetScrollTop })
  }

  /**
   * Set whether scroll sync is enabled
   */
  function setEnabled(enabled: boolean) {
    isEnabled.value = enabled
  }

  /**
   * Cleanup timers on unmount
   */
  onBeforeUnmount(() => {
    clearTimeout(debounceTimer)
  })

  return {
    syncEditorToPreview,
    syncPreviewToEditor,
    updateLineMapping,
    setEnabled,
    isEnabled,
    lineMappings,
  }
}

/**
 * Helper function to add data-line attributes to rendered HTML
 * This should be used by the preview renderer (CompactMessageRenderer)
 */
export function addSourceLineAttributes(html: string, sourceLineStart: number = 0): string {
  // Parse the HTML and add data-source-line attributes
  // This is a simple implementation - in production, you'd use a proper HTML parser

  const lines = html.split('\n')
  let currentLine = sourceLineStart

  return lines.map((line) => {
    if (line.trim().match(/^<(h[1-6]|p|blockquote|pre|ul|ol|li)/i)) {
      const tagMatch = line.match(/^<(\w+)/)
      if (tagMatch) {
        const tag = tagMatch[1]
        const attributeInsertPoint = line.indexOf('>')
        if (attributeInsertPoint > 0) {
          const before = line.substring(0, attributeInsertPoint)
          const after = line.substring(attributeInsertPoint)
          currentLine++
          return `${before} data-source-line="${currentLine}"${after}`
        }
      }
    }
    return line
  }).join('\n')
}
