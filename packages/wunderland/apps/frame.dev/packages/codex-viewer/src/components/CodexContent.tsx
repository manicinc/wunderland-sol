/**
 * Content display area for Quarry Codex viewer
 * Renders markdown files with syntax highlighting and wiki features
 * @module codex/QuarryContent
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Loader2, Link2, ExternalLink, Book, FileText, Code, Edit3 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { GitHubFile, StrandMetadata } from '../lib/types'
import { isMarkdownFile, rewriteImageUrl, stripFrontmatter, parseFrontmatter } from '../lib/utils'
import { REPO_CONFIG } from '../lib/constants'
import CodexEditMode from './CodexEditMode'
import FrontmatterDisplay from './FrontmatterDisplay'
import { ViewModeToggle, useViewMode, type ViewMode } from '@/components/quarry/ui/browse/ViewModeToggle'
import { calculatePageBreaks, applyPageBreaks, removePagination, PAGE_CONFIGS } from '@/lib/viewer/pagination'
import '@/styles/pagination.css'

interface QuarryContentProps {
  /** Currently selected file */
  file: GitHubFile | null
  /** File content */
  content: string
  /** Parsed metadata */
  metadata: StrandMetadata
  /** Loading state */
  loading: boolean
  /** Current directory path */
  currentPath: string
  /** Navigate to path */
  onNavigate: (path: string) => void
  /** Fetch file content */
  onFetchFile: (file: GitHubFile) => void
  /** Current pathname (for URL building) */
  pathname: string
  /** Whether editing is enabled (optional) */
  editable?: boolean
  /** Callback when file is saved (optional) */
  onSave?: (content: string) => Promise<void>
}

/**
 * Main content display area with markdown rendering
 * 
 * @remarks
 * - Renders markdown with syntax highlighting
 * - Handles internal wiki links (relative paths)
 * - Rewrites image URLs to raw GitHub
 * - Shows empty state with quick guide
 * - Analog styling: Paper texture, inner shadow
 * - Mobile responsive typography
 * 
 * @example
 * ```tsx
 * <QuarryContent
 *   file={selectedFile}
 *   content={fileContent}
 *   metadata={fileMetadata}
 *   loading={loading}
 *   currentPath={currentPath}
 *   onNavigate={navigate}
 *   onFetchFile={fetchFile}
 *   pathname={pathname}
 * />
 * ```
 */
export default function QuarryContent({
  file,
  content,
  metadata,
  loading,
  currentPath,
  onNavigate,
  onFetchFile,
  pathname,
  editable = false,
  onSave,
}: QuarryContentProps) {
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // View mode state
  const [viewMode, setViewMode] = useViewMode('scroll')
  const contentRef = useRef<HTMLDivElement>(null)

  // Parse frontmatter from content
  const { metadata: frontmatterData, content: contentWithoutFrontmatter, hasFrontmatter } =
    parseFrontmatter(content)

  /**
   * Apply pagination when view mode changes
   */
  useEffect(() => {
    if (!contentRef.current || !file || !isMarkdownFile(file.name)) {
      return
    }

    // Small delay to allow content to render
    const timer = setTimeout(() => {
      if (!contentRef.current) return

      if (viewMode === 'paginated') {
        const result = calculatePageBreaks(contentRef.current, PAGE_CONFIGS.letter)
        applyPageBreaks(contentRef.current, result, PAGE_CONFIGS.letter)
      } else {
        removePagination(contentRef.current)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [viewMode, content, file])

  /**
   * Handle save operation
   */
  const handleSave = async (newContent: string) => {
    if (!onSave) return

    setIsSaving(true)
    setSaveError(null)

    try {
      await onSave(newContent)
      setIsEditing(false)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save file')
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Handle cancel operation
   */
  const handleCancel = () => {
    setIsEditing(false)
    setSaveError(null)
  }

  // If in edit mode, render CodexEditMode
  if (isEditing && file && editable && onSave) {
    return (
      <CodexEditMode
        file={file}
        initialContent={content}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
        error={saveError}
      />
    )
  }

  return (
    <div className="codex-content flex-1 bg-white dark:bg-gray-950 overflow-hidden flex flex-col relative pb-0 md:pb-0">
      {/* Analog Paper Texture Overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.01] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px',
        }}
      />

      {/* Inner Shadow for Depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06), inset 0 -2px 8px rgba(0,0,0,0.03)',
        }}
      />

      {file ? (
        <>
          {/* File Header */}
          <div className="relative p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className="w-6 h-6 text-gray-700 dark:text-gray-300 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex flex-wrap items-center gap-2 text-lg sm:text-xl">
                    <span className="truncate">{metadata.title || file.name}</span>
                    {metadata.id && (
                      <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded font-mono">
                        ID: {metadata.id.substring(0, 8)}...
                      </span>
                    )}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-2 truncate mt-1">
                    <Link2 className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{file.path}</span>
                    {metadata.version && (
                      <span className="text-xs whitespace-nowrap">• v{metadata.version}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle (for markdown files) */}
                {isMarkdownFile(file.name) && (
                  <ViewModeToggle
                    mode={viewMode}
                    onChange={setViewMode}
                    size="sm"
                    showLabels={false}
                  />
                )}
                {/* Edit Button (if editable) */}
                {editable && isMarkdownFile(file.name) && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 rounded-lg transition-colors text-cyan-600 dark:text-cyan-400"
                    title="Edit file"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}
                {/* Copy Link */}
                <button
                  onClick={() => {
                    const url = `${window.location.origin}${pathname}?path=${currentPath}&file=${file.path}`
                    navigator.clipboard.writeText(url)
                  }}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Copy direct link"
                >
                  <Link2 className="w-5 h-5" />
                </button>
                {/* View on GitHub */}
                <a
                  href={file.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="View on GitHub"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* File Content */}
          <div
            className={`flex-1 overflow-y-auto overscroll-contain relative ${
              viewMode === 'paginated' ? 'paginated-view' : ''
            }`}
          >
            <div className={viewMode === 'paginated' ? '' : 'max-w-4xl mx-auto p-4 sm:p-6 lg:p-8'}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-600 dark:text-gray-400" />
                </div>
              ) : isMarkdownFile(file.name) ? (
                <article
                  ref={contentRef}
                  className={`prose prose-sm sm:prose-base lg:prose-lg prose-gray dark:prose-invert ${
                    viewMode === 'paginated' ? '' : 'max-w-none'
                  }`}
                >
                  {/* Frontmatter Display */}
                  <FrontmatterDisplay
                    metadata={frontmatterData}
                    hasFrontmatter={hasFrontmatter}
                  />

                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      // Allow raw HTML (for divs, images, etc.)
                      div: ({ children, ...props }) => <div {...props}>{children}</div>,
                      img: ({ src = '', alt = '', ...imgProps }) => {
                        const fixedSrc = rewriteImageUrl(src, REPO_CONFIG.OWNER, REPO_CONFIG.NAME, REPO_CONFIG.BRANCH)
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={fixedSrc} alt={alt} {...imgProps} />
                        )
                      },
                      // Code blocks with syntax highlighting
                      code(codeProps) {
                        const { inline, className, children, ...props } = codeProps as {
                          inline?: boolean
                          className?: string
                          children?: React.ReactNode
                        } & React.HTMLAttributes<HTMLElement>

                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus as any}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              borderRadius: '1rem',
                              padding: '1.5rem',
                              fontSize: '0.875rem',
                            }}
                            {...props}
                          >
                            {String(children ?? '').replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code
                            className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded text-sm font-mono"
                            {...props}
                          >
                            {children}
                          </code>
                        )
                      },
                      // Styled headings with anchor IDs
                      h1: ({ children, ...props }) => (
                        <h1
                          id={String(children).toLowerCase().replace(/\s+/g, '-')}
                          className="text-4xl font-black bg-gradient-to-r from-gray-900 via-cyan-700 to-gray-900 dark:from-gray-100 dark:via-cyan-400 dark:to-gray-100 bg-clip-text text-transparent"
                          {...props}
                        >
                          {children}
                        </h1>
                      ),
                      h2: ({ children, ...props }) => (
                        <h2
                          id={String(children).toLowerCase().replace(/\s+/g, '-')}
                          className="text-3xl font-bold text-gray-900 dark:text-white"
                          {...props}
                        >
                          {children}
                        </h2>
                      ),
                      // Styled blockquotes
                      blockquote: ({ children, ...props }) => (
                        <blockquote
                          className="border-l-4 border-cyan-500 pl-4 py-2 bg-cyan-50/30 dark:bg-cyan-900/10 rounded-r-lg my-4"
                          {...props}
                        >
                          {children}
                        </blockquote>
                      ),
                      // Handle internal wiki links
                      a: ({ href, children, ...props }) => {
                        if (href?.startsWith('./') || href?.startsWith('../')) {
                          const linkedPath = currentPath + '/' + href
                          return (
                            <button
                              onClick={() => {
                                const normalizedPath = linkedPath
                                  .replace(/\/\.\//g, '/')
                                  .replace(/\/[^/]+\/\.\.\//g, '/')
                                if (normalizedPath.endsWith('.md')) {
                                  onFetchFile({
                                    path: normalizedPath,
                                    name: normalizedPath.split('/').pop() || '',
                                    type: 'file',
                                    download_url: `https://raw.githubusercontent.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/${REPO_CONFIG.BRANCH}/${normalizedPath}`,
                                    html_url: `https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}/blob/${REPO_CONFIG.BRANCH}/${normalizedPath}`,
                                    sha: '',
                                    url: '',
                                  })
                                } else {
                                  onNavigate(normalizedPath)
                                }
                              }}
                              className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 underline"
                            >
                              {children}
                            </button>
                          )
                        }
                        return (
                          <a href={href} className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 underline" {...props}>
                            {children}
                          </a>
                        )
                      },
                     }}
                   >
                     {contentWithoutFrontmatter}
                   </ReactMarkdown>
                 </article>
              ) : (
                // Non-markdown files: syntax highlighting
                <SyntaxHighlighter
                  style={vscDarkPlus as any}
                  language={file.name.split('.').pop() || 'text'}
                  showLineNumbers
                  wrapLongLines
                  customStyle={{
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  {content}
                </SyntaxHighlighter>
              )}
            </div>
          </div>
        </>
      ) : (
        // Empty State
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 p-4">
          <div className="text-center max-w-2xl">
            {/* Frame Logo */}
            <Link
              href="https://frame.dev"
              className="inline-block mb-6 group"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-3xl"></div>
                <Image
                  src="/frame-logo-no-subtitle.svg"
                  alt="Frame.dev"
                  width={120}
                  height={120}
                  className="relative dark:invert transition-transform group-hover:scale-110"
                />
              </div>
            </Link>
            <h2 className="text-4xl font-black mb-4 tracking-wide text-red-600 dark:text-red-500 uppercase">
              Don&apos;t Panic
            </h2>
            <p className="text-xl mb-2 font-semibold">Welcome to the Quarry Codex</p>
            <p className="text-base mb-6 text-gray-600 dark:text-gray-300">
              A structured, version-controlled knowledge repository designed as the canonical source for AI systems
            </p>

            {/* Technical Overview */}
            <div className="text-left max-w-xl mx-auto mb-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">How It Works</h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                  <span>
                    <strong>Organic hierarchy:</strong> Every weave lives at <code>weaves/&lt;slug&gt;</code>, every folder
                    inside a weave is a loom, and every file (any depth) is a strand—no more <code>/looms</code> or
                    <code>/strands</code> scaffolding.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">•</span>
                  <span>
                    <strong>SQL-cached indexing:</strong> 85-95% faster incremental updates (30s → 2-5s)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">•</span>
                  <span>
                    <strong>Static NLP pipeline:</strong> TF-IDF, n-grams, auto-categorization ($0 cost)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 dark:text-violet-400 font-bold">•</span>
                  <span>
                    <strong>GitHub Actions automation:</strong> Validation, indexing, optional AI enhancement
                  </span>
                </li>
              </ul>
              <pre className="mt-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-xs font-mono text-gray-700 dark:text-gray-300">
{`weaves/
  frame/
    weave.yaml
    overview.md
    research/
      roadmap.md
      glossary/
        terms.md
  wiki/
    weave.yaml
    architecture/
      systems.md`}
              </pre>
              <Link
                href="/quarry/architecture"
                className="inline-flex items-center gap-1 mt-3 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-semibold"
              >
                Read full architecture →
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 rounded-lg p-4 border-2 border-amber-500/20 dark:border-amber-400/20">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">42</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Weaves</div>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10 rounded-lg p-4 border-2 border-cyan-500/20 dark:border-cyan-400/20">
                <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">∞</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Connections</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-lg p-4 border-2 border-green-500/20 dark:border-green-400/20">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">∀</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Knowledge</div>
              </div>
            </div>

            {/* Quick Guide */}
            <div className="text-left space-y-2 text-sm">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Knowledge Hierarchy:</h3>
              <p className="flex items-start gap-2">
                <Book className="w-4 h-4 text-gray-900 dark:text-gray-100 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600 dark:text-gray-400">
                  <strong>Fabric</strong> - Collection of weaves (Quarry Codex itself is a fabric)
                </span>
              </p>
              <p className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-gray-600 dark:text-gray-400">
                  <strong>Weaves</strong> - Complete knowledge universes (self-contained, no cross-dependencies)
                </span>
              </p>
              <p className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600 dark:text-gray-400">
                  <strong>Looms</strong> - Any folder inside a weave (nested folders allowed, auto-detected)
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Code className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600 dark:text-gray-400">
                  <strong>Strands</strong> - Individual markdown files at any depth (atomic knowledge units)
                </span>
              </p>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
              <Link href="/api" className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium">
                Access via Frame API →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



