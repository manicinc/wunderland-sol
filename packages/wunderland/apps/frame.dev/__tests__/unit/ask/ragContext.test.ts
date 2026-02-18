/**
 * Tests for RAG Context Building
 * @module __tests__/unit/ask/ragContext.test
 *
 * Tests for the RAG (Retrieval Augmented Generation) context building:
 * - Context string generation from strands
 * - Content truncation and formatting
 * - File attachment handling
 * - Empty state handling
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest'

// Types for testing
interface ContextStrand {
  id: string
  title: string
  path: string
  wordCount?: number
}

interface SharedStrand {
  id: string
  title: string
  path: string
  content?: string
  wordCount?: number
}

interface UploadedFile {
  id: string
  name: string
  type: 'image' | 'pdf' | 'text' | 'other'
  size: number
  content?: string
}

/**
 * Build RAG context string from selected strands and files
 * This mirrors the logic in UnifiedAskInterface
 */
function buildRagContext(
  selectedStrands: ContextStrand[],
  uploadedFiles: UploadedFile[],
  sharedStrands: SharedStrand[] = []
): string | null {
  if (selectedStrands.length === 0 && uploadedFiles.length === 0) {
    return null
  }

  const contextParts: string[] = []

  // Add strand content/titles
  if (selectedStrands.length > 0) {
    const strandInfo = selectedStrands.map(s => {
      const sharedStrand = sharedStrands.find(ss => ss.id === s.id)
      if (sharedStrand?.content) {
        const truncated = sharedStrand.content.slice(0, 2000)
        const ellipsis = sharedStrand.content.length > 2000 ? '...' : ''
        return `## ${s.title}\n${truncated}${ellipsis}`
      }
      return `- ${s.title} (${s.path})`
    })
    contextParts.push(`**Selected Knowledge Sources (${selectedStrands.length}):**\n${strandInfo.join('\n')}`)
  }

  // Add uploaded file content
  if (uploadedFiles.length > 0) {
    const fileInfo = uploadedFiles.map(f => {
      if (f.content) {
        const truncated = f.content.slice(0, 1500)
        const ellipsis = f.content.length > 1500 ? '...' : ''
        return `## ${f.name}\n${truncated}${ellipsis}`
      }
      return `- ${f.name} (${f.type}, ${Math.round(f.size / 1024)}KB)`
    })
    contextParts.push(`**Attached Files (${uploadedFiles.length}):**\n${fileInfo.join('\n')}`)
  }

  return contextParts.join('\n\n')
}

/**
 * Build enhanced query with RAG context
 */
function buildEnhancedQuery(query: string, ragContext: string | null): string {
  if (!ragContext) return query
  return `I have the following context from my knowledge base:\n\n${ragContext}\n\n---\n\nBased on this context, please answer: ${query}`
}

describe('buildRagContext', () => {
  describe('empty state', () => {
    it('should return null when no strands or files', () => {
      const result = buildRagContext([], [])
      expect(result).toBeNull()
    })

    it('should return null with empty arrays', () => {
      const result = buildRagContext([], [], [])
      expect(result).toBeNull()
    })
  })

  describe('strand context', () => {
    it('should include strand titles without content', () => {
      const strands: ContextStrand[] = [
        { id: 's1', title: 'Introduction', path: '/docs/intro.md' },
        { id: 's2', title: 'Getting Started', path: '/docs/start.md' },
      ]

      const result = buildRagContext(strands, [])

      expect(result).toContain('**Selected Knowledge Sources (2):**')
      expect(result).toContain('- Introduction (/docs/intro.md)')
      expect(result).toContain('- Getting Started (/docs/start.md)')
    })

    it('should include full content when available from shared context', () => {
      const strands: ContextStrand[] = [
        { id: 's1', title: 'Guide', path: '/guide.md' },
      ]
      const sharedStrands: SharedStrand[] = [
        { id: 's1', title: 'Guide', path: '/guide.md', content: 'Full guide content here.' },
      ]

      const result = buildRagContext(strands, [], sharedStrands)

      expect(result).toContain('## Guide')
      expect(result).toContain('Full guide content here.')
    })

    it('should truncate content at 2000 characters', () => {
      const longContent = 'A'.repeat(2500)
      const strands: ContextStrand[] = [
        { id: 's1', title: 'Long Doc', path: '/long.md' },
      ]
      const sharedStrands: SharedStrand[] = [
        { id: 's1', title: 'Long Doc', path: '/long.md', content: longContent },
      ]

      const result = buildRagContext(strands, [], sharedStrands)

      expect(result).toContain('A'.repeat(2000))
      expect(result).toContain('...')
      expect(result).not.toContain('A'.repeat(2001))
    })

    it('should not add ellipsis for content under 2000 chars', () => {
      const shortContent = 'Short content'
      const strands: ContextStrand[] = [
        { id: 's1', title: 'Short', path: '/short.md' },
      ]
      const sharedStrands: SharedStrand[] = [
        { id: 's1', title: 'Short', path: '/short.md', content: shortContent },
      ]

      const result = buildRagContext(strands, [], sharedStrands)

      expect(result).toContain('Short content')
      expect(result).not.toContain('...')
    })
  })

  describe('file context', () => {
    it('should include file info without content', () => {
      const files: UploadedFile[] = [
        { id: 'f1', name: 'report.pdf', type: 'pdf', size: 51200 },
        { id: 'f2', name: 'data.txt', type: 'text', size: 1024 },
      ]

      const result = buildRagContext([], files)

      expect(result).toContain('**Attached Files (2):**')
      expect(result).toContain('- report.pdf (pdf, 50KB)')
      expect(result).toContain('- data.txt (text, 1KB)')
    })

    it('should include file content when available', () => {
      const files: UploadedFile[] = [
        { id: 'f1', name: 'notes.txt', type: 'text', size: 100, content: 'My notes content' },
      ]

      const result = buildRagContext([], files)

      expect(result).toContain('## notes.txt')
      expect(result).toContain('My notes content')
    })

    it('should truncate file content at 1500 characters', () => {
      const longContent = 'B'.repeat(2000)
      const files: UploadedFile[] = [
        { id: 'f1', name: 'long.txt', type: 'text', size: 2000, content: longContent },
      ]

      const result = buildRagContext([], files)

      expect(result).toContain('B'.repeat(1500))
      expect(result).toContain('...')
    })

    it('should round file size to nearest KB', () => {
      const files: UploadedFile[] = [
        { id: 'f1', name: 'file.pdf', type: 'pdf', size: 1536 }, // 1.5 KB
      ]

      const result = buildRagContext([], files)

      expect(result).toContain('2KB') // Rounded
    })
  })

  describe('combined context', () => {
    it('should include both strands and files', () => {
      const strands: ContextStrand[] = [
        { id: 's1', title: 'Doc', path: '/doc.md' },
      ]
      const files: UploadedFile[] = [
        { id: 'f1', name: 'attachment.txt', type: 'text', size: 512 },
      ]

      const result = buildRagContext(strands, files)

      expect(result).toContain('**Selected Knowledge Sources (1):**')
      expect(result).toContain('**Attached Files (1):**')
      expect(result).toContain('- Doc (/doc.md)')
      expect(result).toContain('- attachment.txt (text, 1KB)')
    })

    it('should separate sections with double newlines', () => {
      const strands: ContextStrand[] = [{ id: 's1', title: 'Doc', path: '/doc.md' }]
      const files: UploadedFile[] = [{ id: 'f1', name: 'file.txt', type: 'text', size: 100 }]

      const result = buildRagContext(strands, files)

      expect(result).toContain('\n\n')
    })
  })
})

describe('buildEnhancedQuery', () => {
  it('should return original query when no context', () => {
    const result = buildEnhancedQuery('What is X?', null)
    expect(result).toBe('What is X?')
  })

  it('should wrap query with context preamble', () => {
    const context = '**Sources:** Document A'
    const query = 'What is X?'

    const result = buildEnhancedQuery(query, context)

    expect(result).toContain('I have the following context from my knowledge base:')
    expect(result).toContain(context)
    expect(result).toContain('---')
    expect(result).toContain('Based on this context, please answer: What is X?')
  })

  it('should preserve query at the end', () => {
    const result = buildEnhancedQuery('Complex question here?', 'Some context')

    expect(result.endsWith('Complex question here?')).toBe(true)
  })
})

describe('RAG context edge cases', () => {
  it('should handle strands with missing optional fields', () => {
    const strands: ContextStrand[] = [
      { id: 's1', title: 'Minimal', path: '/min.md' },
    ]

    const result = buildRagContext(strands, [])

    expect(result).not.toBeNull()
    expect(result).toContain('Minimal')
  })

  it('should handle files with zero size', () => {
    const files: UploadedFile[] = [
      { id: 'f1', name: 'empty.txt', type: 'text', size: 0 },
    ]

    const result = buildRagContext([], files)

    expect(result).toContain('0KB')
  })

  it('should handle special characters in content', () => {
    const strands: ContextStrand[] = [{ id: 's1', title: 'Special', path: '/spec.md' }]
    const sharedStrands: SharedStrand[] = [
      { id: 's1', title: 'Special', path: '/spec.md', content: 'Code: `const x = 1;` and **bold**' },
    ]

    const result = buildRagContext(strands, [], sharedStrands)

    expect(result).toContain('`const x = 1;`')
    expect(result).toContain('**bold**')
  })

  it('should handle unicode content', () => {
    const strands: ContextStrand[] = [{ id: 's1', title: 'Unicode', path: '/uni.md' }]
    const sharedStrands: SharedStrand[] = [
      { id: 's1', title: 'Unicode', path: '/uni.md', content: 'Hello! Emoji: Kanji: ' },
    ]

    const result = buildRagContext(strands, [], sharedStrands)

    expect(result).toContain('')
    expect(result).toContain('')
  })

  it('should handle mixed content and no-content strands', () => {
    const strands: ContextStrand[] = [
      { id: 's1', title: 'With Content', path: '/with.md' },
      { id: 's2', title: 'Without Content', path: '/without.md' },
    ]
    const sharedStrands: SharedStrand[] = [
      { id: 's1', title: 'With Content', path: '/with.md', content: 'Has content' },
    ]

    const result = buildRagContext(strands, [], sharedStrands)

    expect(result).toContain('## With Content')
    expect(result).toContain('Has content')
    expect(result).toContain('- Without Content (/without.md)')
  })
})
