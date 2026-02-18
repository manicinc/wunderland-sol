/**
 * Inline code preview for JSON / YAML / text files.
 * Provides download controls, and syntax highlighting via CodeBlock.
 * @module codex/ui/CodePreview
 */

'use client'

import React, { useMemo } from 'react'
import { Download, FileCode } from 'lucide-react'
import type { GitHubFile } from '../../types'
import CodeBlock from './CodeBlock'

// Map file extensions to language identifiers
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.fish': 'bash',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'scss',
  '.less': 'less',
  '.sql': 'sql',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.dockerfile': 'dockerfile',
  '.makefile': 'makefile',
  '.toml': 'ini',
  '.ini': 'ini',
  '.diff': 'diff',
  '.patch': 'diff',
}

interface CodePreviewProps {
  /** File metadata from GitHub */
  file: GitHubFile
  /** Raw file content */
  content: string
}

/**
 * Code previewer with syntax highlighting via CodeBlock component.
 */
export default function CodePreview({ file, content }: CodePreviewProps) {
  const { formattedContent, language } = useMemo(() => {
    const lower = file.name.toLowerCase()

    // Detect language from extension
    const ext = '.' + lower.split('.').pop()
    const detectedLanguage = EXTENSION_TO_LANGUAGE[ext] || ''

    // Format JSON nicely
    if (lower.endsWith('.json')) {
      try {
        return {
          formattedContent: JSON.stringify(JSON.parse(content), null, 2),
          language: 'json'
        }
      } catch {
        return { formattedContent: content, language: 'json' }
      }
    }

    return { formattedContent: content, language: detectedLanguage }
  }, [content, file.name])

  return (
    <div className="space-y-4">
      {/* File header with download button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300">
            <FileCode className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{file.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{file.path}</p>
          </div>
        </div>

        <a
          href={file.download_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
      </div>

      {/* Syntax-highlighted code block with copy button and language selector */}
      <CodeBlock
        code={formattedContent || '// File is empty'}
        language={language}
      />
    </div>
  )
}
