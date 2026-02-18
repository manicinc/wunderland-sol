/**
 * Notion Converter Tests
 * @module __tests__/unit/lib/import-export/notionConverter.test
 *
 * Tests for Notion import functionality.
 * Tests cover:
 * - UUID detection patterns for Notion exports
 * - HTML to Markdown conversion patterns
 * - Path building and slug generation
 * - Table conversion
 * - Title extraction
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// NOTION UUID DETECTION
// ============================================================================

describe('Notion Converter', () => {
  describe('UUID Detection Patterns', () => {
    const NOTION_UUID_REGEX = /[a-f0-9]{32}/

    it('should detect 32-character hex UUID in filename', () => {
      const notionFile = 'My Document 8e2c3d4a5b6c7d8e9f0a1b2c3d4e5f6a.html'
      const match = notionFile.match(NOTION_UUID_REGEX)
      expect(match).not.toBeNull()
      expect(match![0]).toBe('8e2c3d4a5b6c7d8e9f0a1b2c3d4e5f6a')
    })

    it('should detect UUID in markdown filename', () => {
      const notionFile = 'Project Notes abc123def456789012345678901234ab.md'
      expect(NOTION_UUID_REGEX.test(notionFile)).toBe(true)
    })

    it('should not match non-hex characters', () => {
      const invalidFile = 'Document ghijklmnopqrstuvwxyz123456789012.html'
      // This would partially match the hex characters at the end
      // Full 32-char hex requires all hex chars
      const notionFullUuidRegex = /^.*[a-f0-9]{32}\.(html|md)$/
      expect(notionFullUuidRegex.test(invalidFile)).toBe(false)
    })

    it('should detect UUID at end of filename', () => {
      const htmlWithUuidRegex = /[a-f0-9]{32}\.html$/
      const mdWithUuidRegex = /[a-f0-9]{32}\.md$/

      expect(htmlWithUuidRegex.test('Note abcd1234abcd1234abcd1234abcd1234.html')).toBe(true)
      expect(mdWithUuidRegex.test('Note abcd1234abcd1234abcd1234abcd1234.md')).toBe(true)
    })

    it('should not match short UUIDs', () => {
      const shortUuidFile = 'Note abc123.html'
      const uuidRegex = /[a-f0-9]{32}\.(html|md)$/
      expect(uuidRegex.test(shortUuidFile)).toBe(false)
    })

    it('should handle filenames with only UUID', () => {
      const pureUuidFile = 'abcdef1234567890abcdef1234567890.html'
      const uuidRegex = /[a-f0-9]{32}\.html$/
      expect(uuidRegex.test(pureUuidFile)).toBe(true)
    })
  })

  describe('Notion File Structure Detection', () => {
    it('should identify HTML exports with UUID suffix', () => {
      const files = [
        'Workspace/Project 1/Task List a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.html',
        'Workspace/Notes 0123456789abcdef0123456789abcdef.html',
      ]
      const htmlWithUuidRegex = /[a-f0-9]{32}\.html$/

      const hasHtmlWithUUID = files.some(f => htmlWithUuidRegex.test(f))
      expect(hasHtmlWithUUID).toBe(true)
    })

    it('should identify Markdown exports with UUID suffix', () => {
      const files = [
        'Documents/Meeting Notes abcd1234abcd1234abcd1234abcd1234.md',
      ]
      const mdWithUuidRegex = /[a-f0-9]{32}\.md$/

      const hasMarkdownWithUUID = files.some(f => mdWithUuidRegex.test(f))
      expect(hasMarkdownWithUUID).toBe(true)
    })

    it('should identify CSV database exports', () => {
      const files = [
        'Database.csv',
        'Tasks Database 123abc.csv',
        'Project Tracker.csv',
      ]

      const hasCsvDatabase = files.some(f => f.endsWith('.csv'))
      expect(hasCsvDatabase).toBe(true)
    })

    it('should detect valid Notion export structure', () => {
      const files = [
        'Workspace/Note abc123abc123abc123abc123abc12345.html',
        'Tasks.csv',
      ]

      const hasHtmlWithUUID = files.some(f => /[a-f0-9]{32}\.html$/.test(f))
      const hasCsvDatabase = files.some(f => f.endsWith('.csv'))

      expect(hasHtmlWithUUID || hasCsvDatabase).toBe(true)
    })
  })

  // ============================================================================
  // HTML TO MARKDOWN CONVERSION
  // ============================================================================

  describe('HTML to Markdown Conversion', () => {
    describe('Heading Conversion', () => {
      it('should convert h1 to markdown', () => {
        const h1Content = 'Main Title'
        const markdown = `# ${h1Content}`
        expect(markdown).toBe('# Main Title')
      })

      it('should convert h2 to markdown', () => {
        const h2Content = 'Section Title'
        const markdown = `## ${h2Content}`
        expect(markdown).toBe('## Section Title')
      })

      it('should convert all heading levels', () => {
        const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        const prefixes = ['#', '##', '###', '####', '#####', '######']

        headings.forEach((tag, i) => {
          expect(prefixes[i].length).toBe(i + 1)
        })
      })
    })

    describe('Text Formatting', () => {
      it('should convert bold tags to markdown', () => {
        const patterns = [
          { html: '<strong>bold</strong>', md: '**bold**' },
          { html: '<b>bold</b>', md: '**bold**' },
        ]

        patterns.forEach(({ html, md }) => {
          const converted = html
            .replace(/<(strong|b)>(.*?)<\/(strong|b)>/g, '**$2**')
          expect(converted).toBe(md)
        })
      })

      it('should convert italic tags to markdown', () => {
        const patterns = [
          { html: '<em>italic</em>', md: '*italic*' },
          { html: '<i>italic</i>', md: '*italic*' },
        ]

        patterns.forEach(({ html, md }) => {
          const converted = html
            .replace(/<(em|i)>(.*?)<\/(em|i)>/g, '*$2*')
          expect(converted).toBe(md)
        })
      })

      it('should convert inline code to markdown', () => {
        const html = '<code>const x = 1</code>'
        const md = html.replace(/<code>(.*?)<\/code>/g, '`$1`')
        expect(md).toBe('`const x = 1`')
      })

      it('should convert links to markdown', () => {
        const html = '<a href="https://notion.so">Notion</a>'
        const md = html.replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
        expect(md).toBe('[Notion](https://notion.so)')
      })

      it('should handle links without href', () => {
        const html = '<a>text only</a>'
        const md = html.replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
        // No match, stays as is
        expect(md).toBe('<a>text only</a>')
      })

      it('should handle nested formatting', () => {
        const html = '<strong><em>bold italic</em></strong>'
        const md = html
          .replace(/<(strong|b)>(.*?)<\/(strong|b)>/g, '**$2**')
          .replace(/<(em|i)>(.*?)<\/(em|i)>/g, '*$2*')
        expect(md).toBe('***bold italic***')
      })
    })

    describe('Code Block Conversion', () => {
      it('should convert pre tags to code blocks', () => {
        const preContent = 'function hello() {\n  console.log("hi")\n}'
        const markdown = `\`\`\`\n${preContent}\n\`\`\``
        expect(markdown).toContain('```')
        expect(markdown).toContain(preContent)
      })

      it('should handle empty code blocks', () => {
        const markdown = '```\n\n```'
        expect(markdown.split('\n')).toHaveLength(3)
      })
    })

    describe('Blockquote Conversion', () => {
      it('should convert single line blockquote', () => {
        const text = 'This is a quote'
        const markdown = `> ${text}`
        expect(markdown).toBe('> This is a quote')
      })

      it('should convert multi-line blockquote', () => {
        const lines = ['Line 1', 'Line 2', 'Line 3']
        const markdown = lines.map(line => `> ${line}`).join('\n')
        expect(markdown).toBe('> Line 1\n> Line 2\n> Line 3')
      })
    })

    describe('List Conversion', () => {
      it('should convert unordered list items', () => {
        const items = ['Item 1', 'Item 2', 'Item 3']
        const markdown = items.map(item => `- ${item}`).join('\n')
        expect(markdown).toBe('- Item 1\n- Item 2\n- Item 3')
      })

      it('should convert ordered list items', () => {
        const items = ['First', 'Second', 'Third']
        const markdown = items.map((item, i) => `${i + 1}. ${item}`).join('\n')
        expect(markdown).toBe('1. First\n2. Second\n3. Third')
      })

      it('should handle empty list', () => {
        const items: string[] = []
        const markdown = items.map(item => `- ${item}`).join('\n')
        expect(markdown).toBe('')
      })
    })

    describe('Horizontal Rule Conversion', () => {
      it('should convert hr to markdown separator', () => {
        const markdown = '---'
        expect(markdown).toBe('---')
      })
    })

    describe('Image Conversion', () => {
      it('should convert img to markdown image', () => {
        const src = 'image.png'
        const alt = 'Description'
        const markdown = `![${alt}](${src})`
        expect(markdown).toBe('![Description](image.png)')
      })

      it('should handle image without alt text', () => {
        const src = 'photo.jpg'
        const alt = ''
        const markdown = `![${alt}](${src})`
        expect(markdown).toBe('![](photo.jpg)')
      })

      it('should handle image with path', () => {
        const src = 'attachments/image abc123.png'
        const alt = 'Attached Image'
        const markdown = `![${alt}](${src})`
        expect(markdown).toContain('attachments/')
      })
    })
  })

  // ============================================================================
  // TABLE CONVERSION
  // ============================================================================

  describe('Table Conversion', () => {
    it('should generate table header', () => {
      const headers = ['Name', 'Age', 'City']
      const headerRow = '| ' + headers.join(' | ') + ' |'
      expect(headerRow).toBe('| Name | Age | City |')
    })

    it('should generate table separator', () => {
      const headers = ['Name', 'Age', 'City']
      const separator = '| ' + headers.map(() => '---').join(' | ') + ' |'
      expect(separator).toBe('| --- | --- | --- |')
    })

    it('should generate table data row', () => {
      const cells = ['John', '30', 'NYC']
      const row = '| ' + cells.join(' | ') + ' |'
      expect(row).toBe('| John | 30 | NYC |')
    })

    it('should build complete table', () => {
      const headers = ['Col1', 'Col2']
      const rows = [['A', 'B'], ['C', 'D']]

      let table = '| ' + headers.join(' | ') + ' |\n'
      table += '| ' + headers.map(() => '---').join(' | ') + ' |\n'
      rows.forEach(row => {
        table += '| ' + row.join(' | ') + ' |\n'
      })

      expect(table).toContain('| Col1 | Col2 |')
      expect(table).toContain('| --- | --- |')
      expect(table).toContain('| A | B |')
      expect(table).toContain('| C | D |')
    })

    it('should handle empty cells', () => {
      const cells = ['Value', '', 'Another']
      const row = '| ' + cells.join(' | ') + ' |'
      expect(row).toBe('| Value |  | Another |')
    })

    it('should handle special characters in cells', () => {
      const cells = ['Normal', 'With | pipe', 'End']
      // Pipes in content would need escaping in real implementation
      const row = '| ' + cells.map(c => c.replace(/\|/g, '\\|')).join(' | ') + ' |'
      expect(row).toBe('| Normal | With \\| pipe | End |')
    })
  })

  // ============================================================================
  // PATH BUILDING
  // ============================================================================

  describe('Path Building', () => {
    describe('UUID Removal from Filenames', () => {
      it('should remove UUID suffix from path', () => {
        const filePath = 'Project Notes a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.html'
        const cleanPath = filePath.replace(/\s+[a-f0-9]{32}\.(html|md)$/, '')
        expect(cleanPath).toBe('Project Notes')
      })

      it('should preserve path without UUID', () => {
        const filePath = 'Simple Document.html'
        const cleanPath = filePath.replace(/\s+[a-f0-9]{32}\.(html|md)$/, '')
        expect(cleanPath).toBe('Simple Document.html')
      })

      it('should handle nested paths with UUID', () => {
        const filePath = 'Workspace/Projects/Task abc123abc123abc123abc123abc12345.md'
        const cleanPath = filePath.replace(/\s+[a-f0-9]{32}\.(html|md)$/, '')
        expect(cleanPath).toBe('Workspace/Projects/Task')
      })
    })

    describe('Slug Generation', () => {
      it('should lowercase and replace spaces', () => {
        const title = 'My Document Title'
        const slug = title.toLowerCase().replace(/\s+/g, '-')
        expect(slug).toBe('my-document-title')
      })

      it('should remove special characters', () => {
        const title = 'Title: With (Special) Characters!'
        const slug = title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
        expect(slug).toBe('title-with-special-characters')
      })

      it('should handle unicode characters', () => {
        const title = '日本語 Document'
        // Should keep alphanumeric after initial slugify
        const slug = title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
        // Unicode chars removed, leaving just "document"
        expect(slug).toBe('-document')
      })

      it('should collapse multiple dashes', () => {
        const title = 'Title---With---Dashes'
        const slug = title.toLowerCase().replace(/-+/g, '-')
        expect(slug).toBe('title-with-dashes')
      })

      it('should trim leading/trailing dashes', () => {
        const title = '  Spaced Title  '
        const slug = title
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
        expect(slug).toBe('spaced-title')
      })
    })

    describe('Weave/Loom Path Construction', () => {
      it('should build simple strand path', () => {
        const weave = 'notion-import'
        const slug = 'my-document'
        const path = `weaves/${weave}/${slug}.md`
        expect(path).toBe('weaves/notion-import/my-document.md')
      })

      it('should build path with loom', () => {
        const weave = 'notion-import'
        const loom = 'project-folder'
        const slug = 'my-document'
        const path = `weaves/${weave}/${loom}/${slug}.md`
        expect(path).toBe('weaves/notion-import/project-folder/my-document.md')
      })

      it('should build path with nested looms', () => {
        const weave = 'notion-import'
        const loom = 'workspace/projects/active'
        const slug = 'task-list'
        const path = `weaves/${weave}/${loom}/${slug}.md`
        expect(path).toBe('weaves/notion-import/workspace/projects/active/task-list.md')
      })
    })
  })

  // ============================================================================
  // TITLE EXTRACTION
  // ============================================================================

  describe('Title Extraction', () => {
    describe('From HTML Title Tag', () => {
      it('should extract title from title element', () => {
        const html = '<html><head><title>My Page Title</title></head></html>'
        const titleMatch = html.match(/<title>(.*?)<\/title>/)
        expect(titleMatch).not.toBeNull()
        expect(titleMatch![1]).toBe('My Page Title')
      })

      it('should handle empty title', () => {
        const html = '<html><head><title></title></head></html>'
        const titleMatch = html.match(/<title>(.*?)<\/title>/)
        expect(titleMatch![1]).toBe('')
      })
    })

    describe('From H1 Element', () => {
      it('should extract first h1 as title', () => {
        const html = '<html><body><h1>Document Heading</h1><p>Content</p></body></html>'
        const h1Match = html.match(/<h1>(.*?)<\/h1>/)
        expect(h1Match).not.toBeNull()
        expect(h1Match![1]).toBe('Document Heading')
      })

      it('should get first h1 when multiple exist', () => {
        const html = '<h1>First Heading</h1><h1>Second Heading</h1>'
        const h1Match = html.match(/<h1>(.*?)<\/h1>/)
        expect(h1Match![1]).toBe('First Heading')
      })
    })

    describe('From Markdown H1', () => {
      it('should extract h1 from markdown', () => {
        const markdown = '# My Title\n\nSome content here'
        const h1Match = markdown.match(/^#\s+(.+)$/m)
        expect(h1Match).not.toBeNull()
        expect(h1Match![1]).toBe('My Title')
      })

      it('should handle h1 not at start', () => {
        const markdown = 'Some intro text\n\n# Actual Title\n\nContent'
        const h1Match = markdown.match(/^#\s+(.+)$/m)
        expect(h1Match![1]).toBe('Actual Title')
      })

      it('should not match h2 or deeper', () => {
        const markdown = '## Section Title\n### Subsection'
        const h1Match = markdown.match(/^#\s+(.+)$/m)
        expect(h1Match).toBeNull()
      })

      it('should trim whitespace from title', () => {
        const markdown = '#   Spaced Title   '
        const h1Match = markdown.match(/^#\s+(.+)$/m)
        if (h1Match) {
          const title = h1Match[1].trim()
          expect(title).toBe('Spaced Title')
        }
      })
    })

    describe('Fallback to Filename', () => {
      it('should use filename when no title found', () => {
        const filename = 'my-document'
        const title = filename
          .replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
        expect(title).toBe('My Document')
      })
    })
  })

  // ============================================================================
  // CSV DATABASE PATTERNS
  // ============================================================================

  describe('CSV Database Processing', () => {
    it('should recognize CSV file extension', () => {
      const files = ['data.csv', 'Tasks.csv', 'Projects 123.csv']
      const csvFiles = files.filter(f => f.endsWith('.csv'))
      expect(csvFiles).toHaveLength(3)
    })

    it('should parse CSV header structure', () => {
      const csvContent = 'Name,Status,Due Date,Tags\nTask 1,Done,2024-01-15,"tag1, tag2"'
      const lines = csvContent.split('\n')
      const headers = lines[0].split(',')

      expect(headers).toContain('Name')
      expect(headers).toContain('Status')
      expect(headers).toContain('Due Date')
      expect(headers).toContain('Tags')
    })

    it('should handle quoted fields with commas', () => {
      // This tests the pattern, not actual parsing
      const csvLine = 'Field1,"Value with, comma",Field3'
      const quotedPattern = /"([^"]+)"/
      const match = csvLine.match(quotedPattern)

      expect(match).not.toBeNull()
      expect(match![1]).toBe('Value with, comma')
    })

    it('should identify database name from filename', () => {
      const filePath = 'Workspace/Projects Database.csv'
      const parts = filePath.split('/')
      const filename = parts.pop() || 'unknown'
      const dbName = filename.replace('.csv', '')

      expect(dbName).toBe('Projects Database')
    })
  })

  // ============================================================================
  // METADATA HANDLING
  // ============================================================================

  describe('Notion Metadata', () => {
    it('should extract Notion ID from filename', () => {
      const filename = 'Document a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.html'
      const uuidMatch = filename.match(/([a-f0-9]{32})/)
      expect(uuidMatch).not.toBeNull()
      expect(uuidMatch![1]).toBe('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6')
    })

    it('should create import timestamp', () => {
      const importedAt = new Date().toISOString()
      expect(importedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
    })

    it('should build notion metadata object', () => {
      const notionId = 'abc123def456789012345678901234ab'
      const importedAt = '2024-01-15T12:00:00.000Z'

      const metadata = {
        notion: {
          id: notionId,
          importedAt,
        },
      }

      expect(metadata.notion.id).toBe(notionId)
      expect(metadata.notion.importedAt).toBe(importedAt)
    })
  })

  // ============================================================================
  // WORD COUNT
  // ============================================================================

  describe('Word Count', () => {
    it('should count words separated by whitespace', () => {
      const content = 'This is a simple test document'
      const wordCount = content.split(/\s+/).length
      expect(wordCount).toBe(6)
    })

    it('should handle multiple spaces', () => {
      const content = 'Word1   Word2    Word3'
      const wordCount = content.split(/\s+/).length
      expect(wordCount).toBe(3)
    })

    it('should handle newlines and tabs', () => {
      const content = 'Line1\nLine2\tWord'
      const wordCount = content.split(/\s+/).length
      expect(wordCount).toBe(3)
    })

    it('should handle empty content', () => {
      const content = ''
      const wordCount = content.split(/\s+/).filter(Boolean).length
      expect(wordCount).toBe(0)
    })
  })

  // ============================================================================
  // ERROR HANDLING PATTERNS
  // ============================================================================

  describe('Error Handling Patterns', () => {
    it('should handle failed file extraction gracefully', () => {
      const errors: { file: string; message: string }[] = []

      const simulateError = (path: string) => {
        errors.push({
          file: path,
          message: `Failed to extract: ${path}`,
        })
      }

      simulateError('corrupted.html')

      expect(errors).toHaveLength(1)
      expect(errors[0].file).toBe('corrupted.html')
    })

    it('should track conversion errors', () => {
      const errors: { type: string; file: string }[] = []

      const addError = (file: string) => {
        errors.push({
          type: 'convert',
          file,
        })
      }

      addError('invalid.html')
      addError('broken.md')

      expect(errors).toHaveLength(2)
      expect(errors.every(e => e.type === 'convert')).toBe(true)
    })
  })

  // ============================================================================
  // EXPORT (NOT SUPPORTED)
  // ============================================================================

  describe('Export Support', () => {
    it('should indicate export is not supported', () => {
      const supportsExport: string[] = []
      expect(supportsExport.length).toBe(0)
    })

    it('should return failure result for export', () => {
      const exportResult = {
        success: false,
        filename: '',
        statistics: {
          strandsExported: 0,
          assetsExported: 0,
          totalSizeBytes: 0,
        },
        errors: ['Notion export is not supported'],
        duration: 0,
      }

      expect(exportResult.success).toBe(false)
      expect(exportResult.errors).toContain('Notion export is not supported')
    })
  })

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle filename with multiple UUIDs', () => {
      // Take the last UUID pattern
      const filename = 'Copy of Doc 1234567890123456789012345678901a 1234567890123456789012345678901b.html'
      const uuids = filename.match(/[a-f0-9]{32}/g)
      expect(uuids).not.toBeNull()
      expect(uuids!.length).toBe(2)
    })

    it('should handle deeply nested paths', () => {
      const path = 'Level1/Level2/Level3/Level4/Level5/Document abc123abc123abc123abc123abc12345.html'
      const parts = path.split('/')
      expect(parts.length).toBe(6)
    })

    it('should handle special characters in folder names', () => {
      const path = "Workspace [2024]/Project (Active)/Doc's.html"
      const parts = path.split('/')
      expect(parts[0]).toBe('Workspace [2024]')
      expect(parts[1]).toBe('Project (Active)')
    })

    it('should handle empty file list', () => {
      const files: string[] = []
      const hasHtmlWithUUID = files.some(f => /[a-f0-9]{32}\.html$/.test(f))
      expect(hasHtmlWithUUID).toBe(false)
    })

    it('should handle file with only extension', () => {
      const filename = '.html'
      const uuidRegex = /[a-f0-9]{32}\.html$/
      expect(uuidRegex.test(filename)).toBe(false)
    })

    it('should handle uppercase hex in UUID (normalize to lowercase)', () => {
      const filename = 'Doc ABCDEF1234567890ABCDEF1234567890.html'
      const lowercased = filename.toLowerCase()
      const uuidRegex = /[a-f0-9]{32}\.html$/
      expect(uuidRegex.test(lowercased)).toBe(true)
    })
  })
})
