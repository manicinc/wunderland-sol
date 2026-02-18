/**
 * Async Markdown Converter
 * @module lib/editor/asyncMarkdownConverter
 *
 * Non-blocking HTML to Markdown conversion using requestIdleCallback
 * to prevent UI freezing during expensive regex operations.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ConversionResult {
  markdown: string
  duration: number
}

type IdleRequestCallback = (deadline: IdleDeadline) => void

interface IdleDeadline {
  didTimeout: boolean
  timeRemaining: () => number
}

// ============================================================================
// POLYFILL for requestIdleCallback
// ============================================================================

const requestIdleCallbackPolyfill = (
  callback: IdleRequestCallback,
  options?: { timeout?: number }
): number => {
  const start = Date.now()
  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    })
  }, options?.timeout || 1) as unknown as number
}

const cancelIdleCallbackPolyfill = (id: number): void => {
  clearTimeout(id)
}

const rIC = typeof window !== 'undefined' && 'requestIdleCallback' in window
  ? window.requestIdleCallback
  : requestIdleCallbackPolyfill

const cIC = typeof window !== 'undefined' && 'cancelIdleCallback' in window
  ? window.cancelIdleCallback
  : cancelIdleCallbackPolyfill

// ============================================================================
// HTML ENTITY DECODER
// ============================================================================

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

// ============================================================================
// CONVERSION STEPS (broken into chunks for idle processing)
// ============================================================================

type ConversionStep = (markdown: string) => string

const conversionSteps: ConversionStep[] = [
  // Step 1: Code blocks (must be first to avoid inner content modification)
  (md) => md.replace(
    /<pre[^>]*><code[^>]*class="language-([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_m, lang, code) => `\n\n\`\`\`${lang}\n${decodeHtmlEntities(code)}\n\`\`\`\n\n`
  ),
  (md) => md.replace(
    /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
    (_m, code) => `\n\n\`\`\`\n${decodeHtmlEntities(code)}\n\`\`\`\n\n`
  ),

  // Step 2: Headings
  (md) => md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n'),
  (md) => md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n'),
  (md) => md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n\n'),
  (md) => md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n\n#### $1\n\n'),
  (md) => md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n\n##### $1\n\n'),
  (md) => md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n\n###### $1\n\n'),

  // Step 3: Horizontal rules
  (md) => md.replace(/<hr[^>]*>/gi, '\n\n---\n\n'),

  // Step 3.5: Tables (GFM format)
  (md) => {
    // Convert HTML tables to GFM markdown tables
    return md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, tableContent) => {
      const rows: string[][] = []
      let hasHeader = false

      // Extract rows
      const rowMatches = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || []

      for (const rowHtml of rowMatches) {
        const cells: string[] = []

        // Check for header cells
        const headerCells = rowHtml.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || []
        if (headerCells.length > 0) {
          hasHeader = true
          for (const cellHtml of headerCells) {
            const cellContent = cellHtml.replace(/<th[^>]*>([\s\S]*?)<\/th>/gi, '$1')
              .replace(/<[^>]+>/g, '') // Strip inner HTML tags
              .replace(/\s+/g, ' ')
              .trim()
            cells.push(cellContent)
          }
        }

        // Check for regular cells
        const dataCells = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []
        for (const cellHtml of dataCells) {
          const cellContent = cellHtml.replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, '$1')
            .replace(/<[^>]+>/g, '') // Strip inner HTML tags
            .replace(/\s+/g, ' ')
            .trim()
          cells.push(cellContent)
        }

        if (cells.length > 0) {
          rows.push(cells)
        }
      }

      if (rows.length === 0) return ''

      // Build markdown table
      const columnCount = Math.max(...rows.map(r => r.length))
      const mdRows: string[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        // Pad row to column count
        while (row.length < columnCount) row.push('')
        mdRows.push('| ' + row.join(' | ') + ' |')

        // Add separator after first row if it's a header
        if (i === 0 && hasHeader) {
          mdRows.push('| ' + Array(columnCount).fill('---').join(' | ') + ' |')
        }
      }

      // If no header was detected, add a separator after first row anyway
      if (!hasHeader && rows.length > 0) {
        mdRows.splice(1, 0, '| ' + Array(columnCount).fill('---').join(' | ') + ' |')
      }

      return '\n\n' + mdRows.join('\n') + '\n\n'
    })
  },

  // Step 4: Task lists
  (md) => md.replace(/<ul[^>]*data-type="taskList"[^>]*>([\s\S]*?)<\/ul>/gi, (_match, content) => {
    const items = content.replace(
      /<li[^>]*>[\s\S]*?<label>[\s\S]*?<input[^>]*type="checkbox"([^>]*)>[\s\S]*?<\/label>[\s\S]*?<div>([\s\S]*?)<\/div>[\s\S]*?<\/li>/gi,
      (_m: string, attrs: string, text: string) => {
        const checked = attrs.includes('checked') ? 'x' : ' '
        return `- [${checked}] ${text.trim()}\n`
      }
    )
    return '\n\n' + items + '\n'
  }),

  // Step 5: Regular lists
  (md) => md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_match, content) => {
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m: string, text: string) => `- ${text.trim()}\n`)
    return '\n\n' + items + '\n'
  }),
  (md) => md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, content) => {
    let index = 1
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m: string, text: string) => `${index++}. ${text.trim()}\n`)
    return '\n\n' + items + '\n'
  }),

  // Step 6: Blockquotes
  (md) => md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, content) => {
    let cleaned = content.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n')
    cleaned = cleaned.trim()
    const lines = cleaned.split('\n').filter((l: string) => l.trim()).map((line: string) => `> ${line.trim()}`)
    return '\n\n' + lines.join('\n') + '\n\n'
  }),

  // Step 7: Paragraphs and breaks
  (md) => md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n'),
  (md) => md.replace(/<br\s*\/?>/gi, '\n'),

  // Step 8: Text formatting (batch these together)
  (md) => md
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>')
    .replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
    .replace(/<strike>(.*?)<\/strike>/gi, '~~$1~~')
    .replace(/<del>(.*?)<\/del>/gi, '~~$1~~')
    .replace(/<code>(.*?)<\/code>/gi, '`$1`')
    .replace(/<mark[^>]*>(.*?)<\/mark>/gi, '==$1==')
    .replace(/<sub>(.*?)<\/sub>/gi, '~$1~')
    .replace(/<sup>(.*?)<\/sup>/gi, '^$1^'),

  // Step 9: Links and images
  (md) => md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)'),
  (md) => md
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)'),

  // Step 10: Final cleanup
  (md) => decodeHtmlEntities(md),
  (md) => md.replace(/\n{3,}/g, '\n\n').trim(),
]

// ============================================================================
// SYNCHRONOUS CONVERSION (for small documents)
// ============================================================================

export function htmlToMarkdownSync(html: string): string {
  let result = html
  for (const step of conversionSteps) {
    result = step(result)
  }
  return result
}

// ============================================================================
// ASYNC CONVERSION (uses idle callback for large documents)
// ============================================================================

const SMALL_DOCUMENT_THRESHOLD = 2000 // characters - reduced for better responsiveness

export function htmlToMarkdownAsync(html: string): Promise<ConversionResult> {
  const startTime = performance.now()

  // For small documents, run synchronously
  if (html.length < SMALL_DOCUMENT_THRESHOLD) {
    const markdown = htmlToMarkdownSync(html)
    return Promise.resolve({
      markdown,
      duration: performance.now() - startTime,
    })
  }

  // For larger documents, use idle callback chunking
  return new Promise((resolve) => {
    let markdown = html
    let stepIndex = 0

    const processNextStep = (deadline: IdleDeadline) => {
      // Process steps while we have time
      while (stepIndex < conversionSteps.length && deadline.timeRemaining() > 0) {
        markdown = conversionSteps[stepIndex](markdown)
        stepIndex++
      }

      if (stepIndex < conversionSteps.length) {
        // More steps to process, schedule next idle callback
        rIC(processNextStep)
      } else {
        // All done
        resolve({
          markdown,
          duration: performance.now() - startTime,
        })
      }
    }

    rIC(processNextStep)
  })
}

// ============================================================================
// DEBOUNCED CONVERTER CLASS
// ============================================================================

export class DebouncedMarkdownConverter {
  private pendingConversion: number | null = null
  private lastHtml: string = ''
  private lastMarkdown: string = ''
  private debounceMs: number

  constructor(debounceMs: number = 300) {
    this.debounceMs = debounceMs
  }

  /**
   * Convert HTML to Markdown with debouncing
   * Returns immediately with cached result if available
   */
  convert(
    html: string,
    onComplete: (result: ConversionResult) => void
  ): string | null {
    // Return cached result if HTML hasn't changed
    if (html === this.lastHtml) {
      return this.lastMarkdown
    }

    // Cancel pending conversion
    if (this.pendingConversion !== null) {
      clearTimeout(this.pendingConversion)
    }

    // Schedule new conversion
    this.pendingConversion = window.setTimeout(async () => {
      this.pendingConversion = null
      const result = await htmlToMarkdownAsync(html)
      this.lastHtml = html
      this.lastMarkdown = result.markdown
      onComplete(result)
    }, this.debounceMs)

    // Return null to indicate conversion is pending
    return null
  }

  /**
   * Force immediate conversion (for save operations)
   */
  async flush(html: string): Promise<ConversionResult> {
    if (this.pendingConversion !== null) {
      clearTimeout(this.pendingConversion)
      this.pendingConversion = null
    }

    const result = await htmlToMarkdownAsync(html)
    this.lastHtml = html
    this.lastMarkdown = result.markdown
    return result
  }

  /**
   * Cancel any pending conversion
   */
  cancel(): void {
    if (this.pendingConversion !== null) {
      clearTimeout(this.pendingConversion)
      this.pendingConversion = null
    }
  }

  /**
   * Get last converted markdown (may be stale)
   */
  getLastMarkdown(): string {
    return this.lastMarkdown
  }
}

// ============================================================================
// MARKDOWN TO HTML CONVERSION STEPS
// ============================================================================

const markdownToHtmlSteps: ConversionStep[] = [
  // Step 1: Escape HTML entities first
  (md) => md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),

  // Step 2: Code blocks (before other processing to protect content)
  (md) => md.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : ''
    return `<pre><code${langClass}>${code.trim()}</code></pre>`
  }),

  // Step 3: Inline code
  (md) => md.replace(/`([^`]+)`/g, '<code>$1</code>'),

  // Step 4: Headings
  (md) => md.replace(/^###### (.+)$/gm, '<h6>$1</h6>'),
  (md) => md.replace(/^##### (.+)$/gm, '<h5>$1</h5>'),
  (md) => md.replace(/^#### (.+)$/gm, '<h4>$1</h4>'),
  (md) => md.replace(/^### (.+)$/gm, '<h3>$1</h3>'),
  (md) => md.replace(/^## (.+)$/gm, '<h2>$1</h2>'),
  (md) => md.replace(/^# (.+)$/gm, '<h1>$1</h1>'),

  // Step 5: Bold and italic
  (md) => md
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>'),

  // Step 6: Strikethrough and highlight
  (md) => md
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/==(.+?)==/g, '<mark>$1</mark>'),

  // Step 7: Links and images
  (md) => md
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>'),

  // Step 7.5: Tables (GFM format to HTML)
  (md) => {
    // Match GFM table pattern
    const tableRegex = /^(\|[^\n]+\|)\n(\|[\s:-]+\|)\n((?:\|[^\n]+\|\n?)+)/gm

    return md.replace(tableRegex, (_match, headerRow, _separator, bodyRows) => {
      // Parse header
      const headerCells = headerRow
        .split('|')
        .slice(1, -1) // Remove empty first and last from split
        .map((cell: string) => `<th>${cell.trim()}</th>`)
        .join('')

      // Parse body rows
      const bodyHtml = bodyRows
        .trim()
        .split('\n')
        .map((row: string) => {
          const cells = row
            .split('|')
            .slice(1, -1)
            .map((cell: string) => `<td>${cell.trim()}</td>`)
            .join('')
          return `<tr>${cells}</tr>`
        })
        .join('\n')

      return `<table>
<thead>
<tr>${headerCells}</tr>
</thead>
<tbody>
${bodyHtml}
</tbody>
</table>`
    })
  },

  // Step 8: Lists
  (md) => {
    // Task lists first
    let result = md
      .replace(/^- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled /> $1</li>')
      .replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled /> $1</li>')
    // Unordered lists
    result = result.replace(/^[-*+] (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive li elements in ul
    result = result.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Ordered lists
    result = result.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    return result
  },

  // Step 9: Blockquotes
  (md) => {
    let result = md.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    // Merge consecutive blockquotes
    result = result.replace(/<\/blockquote>\n<blockquote>/g, '\n')
    return result
  },

  // Step 10: Horizontal rules and line breaks
  (md) => md
    .replace(/^---$/gm, '<hr />')
    .replace(/^\*\*\*$/gm, '<hr />')
    .replace(/  $/gm, '<br />'),

  // Step 11: Paragraphs - wrap remaining text not in block elements
  (md) => {
    const lines = md.split('\n')
    const processedLines = lines.map(line => {
      const trimmed = line.trim()
      if (!trimmed) return ''
      // Skip if already a block element
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<p') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<li') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<div') ||
        trimmed.startsWith('<table') ||
        trimmed.startsWith('<thead') ||
        trimmed.startsWith('<tbody') ||
        trimmed.startsWith('<tr') ||
        trimmed.startsWith('<th') ||
        trimmed.startsWith('<td') ||
        trimmed.startsWith('</t')
      ) {
        return line
      }
      return `<p>${trimmed}</p>`
    })
    return processedLines.filter(Boolean).join('\n')
  },

  // Step 12: Clean up nested paragraphs
  (md) => md.replace(/<p><p>/g, '<p>').replace(/<\/p><\/p>/g, '</p>'),
]

// ============================================================================
// MARKDOWN TO HTML SYNC (for small documents)
// ============================================================================

export function markdownToHtmlSync(markdown: string): string {
  if (!markdown) return ''
  let result = markdown
  for (const step of markdownToHtmlSteps) {
    result = step(result)
  }
  return result
}

// ============================================================================
// MARKDOWN TO HTML ASYNC (uses idle callback for large documents)
// ============================================================================

export function markdownToHtmlAsync(markdown: string): Promise<ConversionResult> {
  const startTime = performance.now()

  if (!markdown) {
    return Promise.resolve({
      markdown: '',
      duration: performance.now() - startTime,
    })
  }

  // For small documents, run synchronously
  if (markdown.length < SMALL_DOCUMENT_THRESHOLD) {
    const html = markdownToHtmlSync(markdown)
    return Promise.resolve({
      markdown: html, // Note: field is called 'markdown' but contains HTML for this function
      duration: performance.now() - startTime,
    })
  }

  // For larger documents, use idle callback chunking
  return new Promise((resolve) => {
    let html = markdown
    let stepIndex = 0

    const processNextStep = (deadline: IdleDeadline) => {
      // Process steps while we have time
      while (stepIndex < markdownToHtmlSteps.length && deadline.timeRemaining() > 0) {
        html = markdownToHtmlSteps[stepIndex](html)
        stepIndex++
      }

      if (stepIndex < markdownToHtmlSteps.length) {
        // More steps to process, schedule next idle callback
        rIC(processNextStep)
      } else {
        // All done
        resolve({
          markdown: html, // Note: field is called 'markdown' but contains HTML for this function
          duration: performance.now() - startTime,
        })
      }
    }

    rIC(processNextStep)
  })
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useRef, useCallback, useEffect } from 'react'

export interface UseDebouncedConverterOptions {
  debounceMs?: number
  onConvert?: (result: ConversionResult) => void
}

export function useDebouncedConverter(options: UseDebouncedConverterOptions = {}) {
  const { debounceMs = 300, onConvert } = options
  const converterRef = useRef<DebouncedMarkdownConverter | null>(null)

  // Initialize converter
  if (!converterRef.current) {
    converterRef.current = new DebouncedMarkdownConverter(debounceMs)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      converterRef.current?.cancel()
    }
  }, [])

  const convert = useCallback((html: string) => {
    return converterRef.current?.convert(html, (result) => {
      onConvert?.(result)
    })
  }, [onConvert])

  const flush = useCallback(async (html: string) => {
    return converterRef.current?.flush(html)
  }, [])

  const cancel = useCallback(() => {
    converterRef.current?.cancel()
  }, [])

  const getLastMarkdown = useCallback(() => {
    return converterRef.current?.getLastMarkdown() || ''
  }, [])

  return {
    convert,
    flush,
    cancel,
    getLastMarkdown,
  }
}
