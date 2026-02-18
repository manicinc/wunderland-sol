/**
 * Markdown Conversion Utilities
 * @module codex/utils/markdownConversion
 *
 * Converts between Markdown and HTML for the inline WYSIWYG editor.
 */

/**
 * Convert Markdown to HTML
 * Simplified conversion for inline editing context
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return ''

  let html = markdown

  // Escape HTML entities first
  html = html.replace(/&/g, '&amp;')
  html = html.replace(/</g, '&lt;')
  html = html.replace(/>/g, '&gt;')

  // Headings
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Code blocks (before other processing)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : ''
    return `<pre><code${langClass}>${code.trim()}</code></pre>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Bold and italic (must be before single * and _)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')

  // Highlight (==text==)
  html = html.replace(/==(.+?)==/g, '<mark>$1</mark>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')

  // Unordered lists
  html = html.replace(/^[-*+] (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

  // Task lists
  html = html.replace(/^- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled /> $1</li>')
  html = html.replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled /> $1</li>')

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n')

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />')
  html = html.replace(/^\*\*\*$/gm, '<hr />')

  // Line breaks
  html = html.replace(/  $/gm, '<br />')

  // Paragraphs - wrap remaining text not in block elements
  const lines = html.split('\n')
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
      trimmed.startsWith('<div')
    ) {
      return line
    }
    return `<p>${trimmed}</p>`
  })

  html = processedLines.filter(Boolean).join('\n')

  // Clean up nested paragraphs
  html = html.replace(/<p><p>/g, '<p>')
  html = html.replace(/<\/p><\/p>/g, '</p>')

  return html
}

/**
 * Convert HTML to Markdown
 * Comprehensive conversion for saving editor content
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return ''

  let markdown = html

  // Remove wrapper tags
  markdown = markdown.replace(/<\/?p>/g, '\n')
  markdown = markdown.replace(/<br\s*\/?>/g, '\n')

  // Headings
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n')
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n')

  // Text formatting
  markdown = markdown.replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
  markdown = markdown.replace(/<b>(.*?)<\/b>/gi, '**$1**')
  markdown = markdown.replace(/<em>(.*?)<\/em>/gi, '*$1*')
  markdown = markdown.replace(/<i>(.*?)<\/i>/gi, '*$1*')
  markdown = markdown.replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>')
  markdown = markdown.replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
  markdown = markdown.replace(/<strike>(.*?)<\/strike>/gi, '~~$1~~')
  markdown = markdown.replace(/<del>(.*?)<\/del>/gi, '~~$1~~')
  markdown = markdown.replace(/<code>(.*?)<\/code>/gi, '`$1`')
  markdown = markdown.replace(/<mark>(.*?)<\/mark>/gi, '==$1==')
  markdown = markdown.replace(/<sub>(.*?)<\/sub>/gi, '~$1~')
  markdown = markdown.replace(/<sup>(.*?)<\/sup>/gi, '^$1^')

  // Links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')

  // Images
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')

  // Lists
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_match: string, content: string) => {
    return content.replace(/<li[^>]*>(.*?)<\/li>/gis, '- $1\n')
  })
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_match: string, content: string) => {
    let index = 1
    return content.replace(/<li[^>]*>(.*?)<\/li>/gis, () => `${index++}. $1\n`)
  })

  // Task lists
  markdown = markdown.replace(
    /<ul[^>]*data-type="taskList"[^>]*>(.*?)<\/ul>/gis,
    (_match: string, content: string) => {
      return content.replace(
        /<li[^>]*><label><input[^>]*type="checkbox"([^>]*)><\/label><div>(.*?)<\/div><\/li>/gis,
        (_m: string, attrs: string, text: string) => {
          const checked = attrs.includes('checked') ? 'x' : ' '
          return `- [${checked}] ${text}\n`
        }
      )
    }
  )

  // Blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_match: string, content: string) => {
    return content.split('\n').map((line: string) => `> ${line.trim()}`).join('\n') + '\n'
  })

  // Code blocks
  markdown = markdown.replace(
    /<pre[^>]*><code[^>]*class="language-([^"]*)"[^>]*>(.*?)<\/code><\/pre>/gis,
    '```$1\n$2\n```'
  )
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```')

  // Horizontal rules
  markdown = markdown.replace(/<hr[^>]*>/gi, '\n---\n')

  // Clean up
  markdown = markdown.replace(/&nbsp;/g, ' ')
  markdown = markdown.replace(/&lt;/g, '<')
  markdown = markdown.replace(/&gt;/g, '>')
  markdown = markdown.replace(/&amp;/g, '&')
  markdown = markdown.replace(/&quot;/g, '"')
  markdown = markdown.replace(/\n{3,}/g, '\n\n')
  markdown = markdown.trim()

  return markdown
}

/**
 * Parse markdown into blocks
 * Splits content by double newlines while preserving code blocks
 */
export function parseMarkdownBlocks(markdown: string): { id: string; content: string; type: string }[] {
  if (!markdown) return []

  const blocks: { id: string; content: string; type: string }[] = []

  // First, protect code blocks from splitting
  const codeBlockPlaceholders: string[] = []
  let protectedMarkdown = markdown.replace(/```[\s\S]*?```/g, (match) => {
    codeBlockPlaceholders.push(match)
    return `__CODE_BLOCK_${codeBlockPlaceholders.length - 1}__`
  })

  // Split by double newlines
  const rawBlocks = protectedMarkdown.split(/\n\n+/)

  rawBlocks.forEach((block, index) => {
    let content = block.trim()
    if (!content) return

    // Restore code blocks
    content = content.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => {
      return codeBlockPlaceholders[parseInt(idx, 10)]
    })

    // Determine block type
    let type = 'paragraph'
    if (content.startsWith('#')) type = 'heading'
    else if (content.startsWith('```')) type = 'code'
    else if (content.startsWith('>')) type = 'blockquote'
    else if (content.startsWith('-') || content.startsWith('*') || content.startsWith('+')) type = 'list'
    else if (/^\d+\./.test(content)) type = 'list'
    else if (content === '---' || content === '***') type = 'hr'

    blocks.push({
      id: `block-${index}`,
      content,
      type,
    })
  })

  return blocks
}

/**
 * Reconstruct markdown from blocks
 */
export function blocksToMarkdown(blocks: { content: string }[]): string {
  return blocks.map(b => b.content).join('\n\n')
}
