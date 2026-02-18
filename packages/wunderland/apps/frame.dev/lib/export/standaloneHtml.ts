/**
 * Standalone HTML Export
 * @module lib/export/standaloneHtml
 *
 * Generates fully self-contained HTML files that can be opened directly
 * in any browser without a server. All styles, scripts, and assets are
 * embedded inline.
 *
 * Features:
 * - Embedded CSS (dark/light theme support)
 * - Syntax highlighting (via Prism.js or inline styles)
 * - Table of contents generation
 * - Responsive design
 * - No external dependencies
 *
 * Use case: Desktop sharing without needing a server
 */

import type { StrandMetadata } from '@/components/quarry/types'
import { stripMarkdown } from './strandExporter'

// ============================================================================
// TYPES
// ============================================================================

export interface StandaloneHtmlOptions {
  /** File path of the strand */
  filePath: string
  /** File name */
  fileName: string
  /** Raw markdown content */
  content: string
  /** Parsed frontmatter metadata */
  metadata: StrandMetadata
  /** Pre-rendered HTML content (if available) */
  renderedHtml?: string
  /** Theme preference */
  theme?: 'light' | 'dark' | 'auto'
  /** Include table of contents */
  includeToc?: boolean
  /** Include print styles */
  includePrintStyles?: boolean
  /** Include copy buttons on code blocks */
  includeCodeCopyButtons?: boolean
}

export interface StandaloneHtmlResult {
  /** The complete HTML string */
  html: string
  /** Word count of the document */
  wordCount: number
  /** Generated table of contents */
  toc: TocEntry[]
}

export interface TocEntry {
  id: string
  level: number
  text: string
}

// ============================================================================
// EMBEDDED STYLES
// ============================================================================

const EMBEDDED_CSS = `
/* Reset and base */
*, *::before, *::after {
  box-sizing: border-box;
}

:root {
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  --max-width: 800px;
  
  /* Light theme (default) */
  --bg: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-code: #f4f5f7;
  --text: #1a1a1a;
  --text-secondary: #666666;
  --text-muted: #888888;
  --border: #e0e0e0;
  --accent: #0066cc;
  --accent-hover: #0052a3;
  --link: #0066cc;
  --link-hover: #0052a3;
  --code-keyword: #0550ae;
  --code-string: #0a3069;
  --code-comment: #6e7781;
  --code-function: #8250df;
  --toc-bg: #f8f9fa;
}

@media (prefers-color-scheme: dark) {
  :root.theme-auto {
    --bg: #0d1117;
    --bg-secondary: #161b22;
    --bg-code: #21262d;
    --text: #e6edf3;
    --text-secondary: #8b949e;
    --text-muted: #6e7681;
    --border: #30363d;
    --accent: #58a6ff;
    --accent-hover: #79b8ff;
    --link: #58a6ff;
    --link-hover: #79b8ff;
    --code-keyword: #ff7b72;
    --code-string: #a5d6ff;
    --code-comment: #8b949e;
    --code-function: #d2a8ff;
    --toc-bg: #161b22;
  }
}

:root.theme-dark {
  --bg: #0d1117;
  --bg-secondary: #161b22;
  --bg-code: #21262d;
  --text: #e6edf3;
  --text-secondary: #8b949e;
  --text-muted: #6e7681;
  --border: #30363d;
  --accent: #58a6ff;
  --accent-hover: #79b8ff;
  --link: #58a6ff;
  --link-hover: #79b8ff;
  --code-keyword: #ff7b72;
  --code-string: #a5d6ff;
  --code-comment: #8b949e;
  --code-function: #d2a8ff;
  --toc-bg: #161b22;
}

/* Layout */
html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text);
  background: var(--bg);
  margin: 0;
  padding: 0;
}

.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

/* Header / Metadata */
.document-header {
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.document-title {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 0 0 0.75rem 0;
  color: var(--text);
}

.document-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.document-meta-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.document-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.tag {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--accent);
  background: var(--bg-code);
  border-radius: 9999px;
  text-decoration: none;
}

/* Table of Contents */
.toc {
  background: var(--toc-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 2rem;
}

.toc-title {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin: 0 0 0.75rem 0;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  margin: 0.375rem 0;
}

.toc-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9375rem;
  transition: color 0.15s ease;
}

.toc-link:hover {
  color: var(--link-hover);
}

.toc-level-2 { padding-left: 1rem; }
.toc-level-3 { padding-left: 2rem; }
.toc-level-4 { padding-left: 3rem; }

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  line-height: 1.25;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: var(--text);
}

h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.375rem; }
h3 { font-size: 1.25rem; }
h4 { font-size: 1.125rem; }
h5 { font-size: 1rem; }
h6 { font-size: 0.875rem; color: var(--text-secondary); }

p {
  margin: 0 0 1rem 0;
}

a {
  color: var(--link);
  text-decoration: none;
}

a:hover {
  color: var(--link-hover);
  text-decoration: underline;
}

/* Lists */
ul, ol {
  margin: 0 0 1rem 0;
  padding-left: 1.75rem;
}

li {
  margin: 0.375rem 0;
}

li > ul, li > ol {
  margin-top: 0.375rem;
  margin-bottom: 0;
}

/* Blockquotes */
blockquote {
  border-left: 4px solid var(--accent);
  margin: 1rem 0;
  padding: 0.5rem 0 0.5rem 1.25rem;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-radius: 0 4px 4px 0;
}

blockquote p:last-child {
  margin-bottom: 0;
}

/* Code */
code {
  font-family: var(--font-mono);
  font-size: 0.875em;
  padding: 0.2em 0.4em;
  background: var(--bg-code);
  border-radius: 4px;
}

pre {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 1rem 0;
  padding: 1rem;
  background: var(--bg-code);
  border-radius: 8px;
  overflow-x: auto;
  position: relative;
}

pre code {
  padding: 0;
  background: none;
  font-size: inherit;
}

/* Syntax highlighting (basic) */
.keyword { color: var(--code-keyword); }
.string { color: var(--code-string); }
.comment { color: var(--code-comment); }
.function { color: var(--code-function); }

/* Copy button */
.code-copy-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-family: var(--font-sans);
  color: var(--text-muted);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
}

pre:hover .code-copy-btn {
  opacity: 1;
}

.code-copy-btn:hover {
  color: var(--text);
  background: var(--bg);
}

.code-copy-btn.copied {
  color: #22c55e;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.9375rem;
}

th, td {
  padding: 0.75rem 1rem;
  text-align: left;
  border: 1px solid var(--border);
}

th {
  font-weight: 600;
  background: var(--bg-secondary);
}

tr:nth-child(even) {
  background: var(--bg-secondary);
}

/* Horizontal rule */
hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2rem 0;
}

/* Images */
img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

/* Task lists */
.task-list-item {
  list-style: none;
  margin-left: -1.75rem;
}

.task-list-item input[type="checkbox"] {
  margin-right: 0.5rem;
}

/* Footer */
.document-footer {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  font-size: 0.8125rem;
  color: var(--text-muted);
  text-align: center;
}

.quarry-credit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Theme toggle */
.theme-toggle {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  z-index: 100;
}

.theme-toggle:hover {
  background: var(--bg-code);
}

/* Print styles */
@media print {
  :root {
    --bg: #ffffff;
    --text: #000000;
  }
  
  body {
    font-size: 11pt;
    line-height: 1.5;
  }
  
  .container {
    max-width: 100%;
    padding: 0;
  }
  
  .theme-toggle,
  .code-copy-btn {
    display: none !important;
  }
  
  .toc {
    page-break-after: always;
  }
  
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
  }
  
  pre, blockquote, table {
    page-break-inside: avoid;
  }
  
  a {
    color: #000;
    text-decoration: underline;
  }
  
  a[href^="http"]::after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
    color: #666;
  }
}

/* Responsive */
@media (max-width: 640px) {
  .container {
    padding: 1rem;
  }
  
  .document-title {
    font-size: 1.75rem;
  }
  
  .document-meta {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  pre {
    font-size: 0.8125rem;
  }
  
  table {
    display: block;
    overflow-x: auto;
  }
}
`

// ============================================================================
// EMBEDDED SCRIPTS
// ============================================================================

const EMBEDDED_JS = `
// Theme toggle
function initThemeToggle() {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;
  
  const root = document.documentElement;
  const stored = localStorage.getItem('quarry-html-theme');
  
  if (stored === 'dark') {
    root.className = 'theme-dark';
  } else if (stored === 'light') {
    root.className = 'theme-light';
  } else {
    root.className = 'theme-auto';
  }
  
  toggle.addEventListener('click', () => {
    const current = root.className;
    let next;
    if (current === 'theme-light') {
      next = 'theme-dark';
    } else if (current === 'theme-dark') {
      next = 'theme-auto';
    } else {
      next = 'theme-light';
    }
    root.className = next;
    localStorage.setItem('quarry-html-theme', next.replace('theme-', ''));
    updateToggleIcon();
  });
  
  updateToggleIcon();
}

function updateToggleIcon() {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;
  
  const theme = document.documentElement.className;
  if (theme === 'theme-light') {
    toggle.textContent = '☀️';
    toggle.title = 'Light theme (click for dark)';
  } else if (theme === 'theme-dark') {
    toggle.textContent = '🌙';
    toggle.title = 'Dark theme (click for auto)';
  } else {
    toggle.textContent = '🌓';
    toggle.title = 'Auto theme (click for light)';
  }
}

// Code copy buttons
function initCodeCopyButtons() {
  document.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.code-copy-btn')) return;
    
    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.textContent || pre.textContent;
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        btn.textContent = 'Failed';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      }
    });
    pre.appendChild(btn);
  });
}

// Smooth scroll for TOC links
function initTocLinks() {
  document.querySelectorAll('.toc-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href?.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.pushState(null, '', href);
        }
      }
    });
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initCodeCopyButtons();
  initTocLinks();
});
`

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract headings from markdown for TOC generation
 */
function extractHeadings(markdown: string): TocEntry[] {
  const headings: TocEntry[] = []
  const lines = markdown.split('\n')
  
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].replace(/[*_`\[\]]/g, '').trim()
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      
      headings.push({ id, level, text })
    }
  }
  
  return headings
}

/**
 * Generate table of contents HTML
 */
function generateTocHtml(entries: TocEntry[]): string {
  if (entries.length === 0) return ''
  
  const items = entries
    .filter(entry => entry.level <= 3) // Only h1-h3
    .map(entry => {
      const levelClass = `toc-level-${entry.level}`
      return `<li class="toc-item ${levelClass}"><a class="toc-link" href="#${entry.id}">${escapeHtml(entry.text)}</a></li>`
    })
    .join('\n')
  
  return `
    <nav class="toc" aria-label="Table of Contents">
      <h2 class="toc-title">Table of Contents</h2>
      <ul class="toc-list">
        ${items}
      </ul>
    </nav>
  `
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Simple markdown to HTML converter (for cases where we don't have pre-rendered HTML)
 */
function simpleMarkdownToHtml(markdown: string): string {
  let html = markdown
  
  // Remove frontmatter
  html = html.replace(/^---[\s\S]*?---\n*/m, '')
  
  // Code blocks with syntax highlighting placeholder
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escapedCode = escapeHtml(code.trim())
    return `<pre><code class="language-${lang || 'text'}">${escapedCode}</code></pre>`
  })
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  
  // Headings with IDs
  html = html.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, text) => {
    const level = hashes.length
    const cleanText = text.replace(/[*_`\[\]]/g, '').trim()
    const id = cleanText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    return `<h${level} id="${id}">${escapeHtml(cleanText)}</h${level}>`
  })
  
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  
  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>')
  
  // Strikethrough
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
  
  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
  
  // Horizontal rules
  html = html.replace(/^[-*_]{3,}$/gm, '<hr>')
  
  // Unordered lists (simplified)
  html = html.replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
  
  // Ordered lists (simplified)
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
  
  // Paragraphs - wrap standalone lines
  const lines = html.split('\n')
  const processedLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines or already-wrapped content
    if (!line || 
        line.startsWith('<') ||
        line.startsWith('#')) {
      processedLines.push(lines[i])
      continue
    }
    
    // Wrap in paragraph
    processedLines.push(`<p>${line}</p>`)
  }
  
  html = processedLines.join('\n')
  
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '')
  
  return html
}

/**
 * Format date for display
 */
function formatDate(date: string | undefined): string {
  if (!date) return ''
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return date
  }
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Generate a standalone HTML file
 */
export function generateStandaloneHtml(options: StandaloneHtmlOptions): StandaloneHtmlResult {
  const {
    filePath,
    fileName,
    content,
    metadata,
    renderedHtml,
    theme = 'auto',
    includeToc = true,
    includePrintStyles = true,
    includeCodeCopyButtons = true,
  } = options
  
  // Extract TOC from markdown
  const toc = extractHeadings(content)
  
  // Generate TOC HTML
  const tocHtml = includeToc && toc.length > 2 ? generateTocHtml(toc) : ''
  
  // Get content HTML
  const contentHtml = renderedHtml || simpleMarkdownToHtml(content)
  
  // Calculate word count
  const plainText = stripMarkdown(content)
  const wordCount = plainText.split(/\s+/).filter(Boolean).length
  
  // Build metadata section
  const title = metadata.title || fileName.replace('.md', '')
  const author = metadata.author || ''
  const date = formatDate(metadata.date)
  const tags = Array.isArray(metadata.tags) ? metadata.tags : []
  
  // Build the complete HTML document
  const html = `<!DOCTYPE html>
<html lang="en" class="theme-${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Quarry Codex">
  <meta name="author" content="${escapeHtml(author)}">
  <meta name="description" content="${escapeHtml(metadata.description || `${title} - Exported from Quarry Codex`)}">
  <title>${escapeHtml(title)}</title>
  <style>${EMBEDDED_CSS}</style>
</head>
<body>
  <button class="theme-toggle" aria-label="Toggle theme">🌓</button>
  
  <main class="container">
    <header class="document-header">
      <h1 class="document-title">${escapeHtml(title)}</h1>
      <div class="document-meta">
        ${author ? `<span class="document-meta-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escapeHtml(author)}</span>` : ''}
        ${date ? `<span class="document-meta-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${date}</span>` : ''}
        <span class="document-meta-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>${wordCount.toLocaleString()} words</span>
      </div>
      ${tags.length > 0 ? `
        <div class="document-tags">
          ${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
    </header>
    
    ${tocHtml}
    
    <article class="document-content">
      ${contentHtml}
    </article>
    
    <footer class="document-footer">
      <div class="quarry-credit">
        <span>Exported from</span>
        <strong>Quarry Codex</strong>
        <span>•</span>
        <span>${new Date().toLocaleDateString()}</span>
      </div>
      <div style="margin-top: 0.5rem; font-size: 0.75rem;">
        Source: ${escapeHtml(filePath)}
      </div>
    </footer>
  </main>
  
  ${includeCodeCopyButtons ? `<script>${EMBEDDED_JS}</script>` : '<script>document.addEventListener("DOMContentLoaded", () => { initThemeToggle?.(); initTocLinks?.(); });</script>'}
</body>
</html>`
  
  return {
    html,
    wordCount,
    toc,
  }
}

/**
 * Export strand as standalone HTML and trigger download
 */
export function downloadAsStandaloneHtml(options: StandaloneHtmlOptions): void {
  const { html } = generateStandaloneHtml(options)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const filename = options.fileName.replace('.md', '.html')
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Preview standalone HTML in a new window
 */
export function previewStandaloneHtml(options: StandaloneHtmlOptions): Window | null {
  const { html } = generateStandaloneHtml(options)
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
  return win
}




