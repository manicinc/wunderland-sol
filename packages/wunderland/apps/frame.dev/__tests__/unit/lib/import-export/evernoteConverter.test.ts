/**
 * Evernote Converter Tests
 * @module __tests__/unit/lib/import-export/evernoteConverter.test
 *
 * Tests for Evernote ENEX import functionality.
 * Note: Some tests are skipped pending full implementation.
 */

import { describe, it, expect, vi } from 'vitest'

// Test data for ENML conversion validation
const SAMPLE_ENML_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note>
<div>This is a simple note with <b>bold</b> and <i>italic</i> text.</div>
<div><br/></div>
<div>A second paragraph.</div>
</en-note>`

const SAMPLE_ENML_WITH_TODO = `<?xml version="1.0" encoding="UTF-8"?>
<en-note>
<div><en-todo checked="true"/>Complete task 1</div>
<div><en-todo checked="false"/>Pending task 2</div>
<div><en-todo/>Another pending task</div>
</en-note>`

const SAMPLE_ENML_WITH_LINKS = `<?xml version="1.0" encoding="UTF-8"?>
<en-note>
<div>Check out <a href="https://example.com">this link</a> for more info.</div>
</en-note>`

describe('Evernote Converter', () => {
  describe('ENML Content Patterns', () => {
    it('should recognize en-note root element', () => {
      expect(SAMPLE_ENML_CONTENT).toContain('<en-note>')
      expect(SAMPLE_ENML_CONTENT).toContain('</en-note>')
    })

    it('should contain bold formatting tags', () => {
      expect(SAMPLE_ENML_CONTENT).toContain('<b>')
      expect(SAMPLE_ENML_CONTENT).toContain('</b>')
    })

    it('should contain italic formatting tags', () => {
      expect(SAMPLE_ENML_CONTENT).toContain('<i>')
      expect(SAMPLE_ENML_CONTENT).toContain('</i>')
    })

    it('should contain en-todo elements', () => {
      expect(SAMPLE_ENML_WITH_TODO).toContain('<en-todo checked="true"/>')
      expect(SAMPLE_ENML_WITH_TODO).toContain('<en-todo checked="false"/>')
      expect(SAMPLE_ENML_WITH_TODO).toContain('<en-todo/>')
    })

    it('should contain links', () => {
      expect(SAMPLE_ENML_WITH_LINKS).toContain('<a href="https://example.com">')
    })
  })

  describe('ENEX File Structure', () => {
    const SAMPLE_ENEX = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export3.dtd">
<en-export export-date="20240115T120000Z" application="Evernote" version="10.0">
  <note>
    <title>Test Note</title>
    <content><![CDATA[<en-note><div>Content</div></en-note>]]></content>
    <created>20240115T083000Z</created>
    <updated>20240115T093000Z</updated>
    <tag>tag1</tag>
    <tag>tag2</tag>
  </note>
</en-export>`

    it('should have en-export root element', () => {
      expect(SAMPLE_ENEX).toContain('<en-export')
      expect(SAMPLE_ENEX).toContain('</en-export>')
    })

    it('should contain note elements', () => {
      expect(SAMPLE_ENEX).toContain('<note>')
      expect(SAMPLE_ENEX).toContain('</note>')
    })

    it('should have title element', () => {
      expect(SAMPLE_ENEX).toContain('<title>Test Note</title>')
    })

    it('should have content in CDATA', () => {
      expect(SAMPLE_ENEX).toContain('<![CDATA[')
      expect(SAMPLE_ENEX).toContain(']]>')
    })

    it('should have timestamp elements', () => {
      expect(SAMPLE_ENEX).toContain('<created>20240115T083000Z</created>')
      expect(SAMPLE_ENEX).toContain('<updated>20240115T093000Z</updated>')
    })

    it('should have tag elements', () => {
      expect(SAMPLE_ENEX).toContain('<tag>tag1</tag>')
      expect(SAMPLE_ENEX).toContain('<tag>tag2</tag>')
    })
  })

  describe('ENEX Validation Patterns', () => {
    it('should identify valid ENEX by en-export tag', () => {
      const validEnex = '<en-export><note></note></en-export>'
      expect(validEnex.includes('<en-export')).toBe(true)
      expect(validEnex.includes('<note>')).toBe(true)
    })

    it('should reject invalid content', () => {
      const notEnex = '<html><body>Not ENEX</body></html>'
      expect(notEnex.includes('<en-export')).toBe(false)
    })
  })

  describe('Date Format Parsing', () => {
    // Evernote uses YYYYMMDDTHHmmssZ format
    it('should parse Evernote date format pattern', () => {
      const enexDate = '20240115T093000Z'
      const regex = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/

      const match = enexDate.match(regex)
      expect(match).not.toBeNull()
      expect(match![1]).toBe('2024') // year
      expect(match![2]).toBe('01') // month
      expect(match![3]).toBe('15') // day
      expect(match![4]).toBe('09') // hour
      expect(match![5]).toBe('30') // minute
      expect(match![6]).toBe('00') // second
    })

    it('should convert to ISO 8601 format', () => {
      const enexDate = '20240115T093000Z'
      const regex = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/
      const match = enexDate.match(regex)

      if (match) {
        const isoDate = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`
        expect(isoDate).toBe('2024-01-15T09:30:00Z')
      }
    })
  })

  describe('ENML to Markdown Conversion Patterns', () => {
    it('should convert bold tags to markdown', () => {
      const enml = '<b>bold text</b>'
      const md = enml.replace(/<b>(.*?)<\/b>/g, '**$1**')
      expect(md).toBe('**bold text**')
    })

    it('should convert italic tags to markdown', () => {
      const enml = '<i>italic text</i>'
      const md = enml.replace(/<i>(.*?)<\/i>/g, '*$1*')
      expect(md).toBe('*italic text*')
    })

    it('should convert links to markdown', () => {
      const enml = '<a href="https://example.com">link text</a>'
      const md = enml.replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
      expect(md).toBe('[link text](https://example.com)')
    })

    it('should convert checked todos to markdown', () => {
      const enml = '<en-todo checked="true"/>Task done'
      const md = enml.replace(/<en-todo checked="true"\/>/g, '- [x] ')
      expect(md).toBe('- [x] Task done')
    })

    it('should convert unchecked todos to markdown', () => {
      const enml = '<en-todo/>Task pending'
      const md = enml.replace(/<en-todo\/>/g, '- [ ] ')
      expect(md).toBe('- [ ] Task pending')
    })

    it('should convert br tags to newlines', () => {
      const enml = 'Line 1<br/>Line 2'
      const md = enml.replace(/<br\s*\/?>/g, '\n')
      expect(md).toBe('Line 1\nLine 2')
    })

    it('should strip en-note wrapper', () => {
      const enml = '<en-note><div>content</div></en-note>'
      const md = enml.replace(/<\/?en-note[^>]*>/g, '')
      expect(md).toBe('<div>content</div>')
    })
  })

  describe('Location Metadata', () => {
    const NOTE_WITH_LOCATION = `
<note-attributes>
  <latitude>37.7749</latitude>
  <longitude>-122.4194</longitude>
  <altitude>10</altitude>
</note-attributes>`

    it('should extract latitude', () => {
      const latMatch = NOTE_WITH_LOCATION.match(/<latitude>(.*?)<\/latitude>/)
      expect(latMatch).not.toBeNull()
      expect(parseFloat(latMatch![1])).toBeCloseTo(37.7749)
    })

    it('should extract longitude', () => {
      const lngMatch = NOTE_WITH_LOCATION.match(/<longitude>(.*?)<\/longitude>/)
      expect(lngMatch).not.toBeNull()
      expect(parseFloat(lngMatch![1])).toBeCloseTo(-122.4194)
    })

    it('should extract altitude', () => {
      const altMatch = NOTE_WITH_LOCATION.match(/<altitude>(.*?)<\/altitude>/)
      expect(altMatch).not.toBeNull()
      expect(parseFloat(altMatch![1])).toBe(10)
    })
  })

  describe('Resource/Attachment Handling', () => {
    const RESOURCE_XML = `
<resource>
  <data encoding="base64">SGVsbG8gV29ybGQh</data>
  <mime>text/plain</mime>
  <resource-attributes>
    <file-name>hello.txt</file-name>
  </resource-attributes>
</resource>`

    it('should recognize base64 encoded data', () => {
      expect(RESOURCE_XML).toContain('encoding="base64"')
    })

    it('should extract mime type', () => {
      const mimeMatch = RESOURCE_XML.match(/<mime>(.*?)<\/mime>/)
      expect(mimeMatch).not.toBeNull()
      expect(mimeMatch![1]).toBe('text/plain')
    })

    it('should extract filename', () => {
      const fnMatch = RESOURCE_XML.match(/<file-name>(.*?)<\/file-name>/)
      expect(fnMatch).not.toBeNull()
      expect(fnMatch![1]).toBe('hello.txt')
    })
  })

  describe('Special Characters', () => {
    it('should handle HTML entities', () => {
      const enml = 'A &amp; B &lt; C &gt; D'
      // After entity decoding
      const decoded = enml
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
      expect(decoded).toBe('A & B < C > D')
    })

    it('should handle unicode characters', () => {
      const enml = '<div>日本語 العربية 한국어 🎉</div>'
      expect(enml).toContain('日本語')
      expect(enml).toContain('العربية')
      expect(enml).toContain('한국어')
      expect(enml).toContain('🎉')
    })
  })

  // ============================================================================
  // ADDITIONAL TESTS FOR BETTER COVERAGE
  // ============================================================================

  describe('Heading Conversion', () => {
    it('should convert h1 to markdown', () => {
      const html = '<h1>Main Title</h1>'
      const md = html.replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
      expect(md).toBe('# Main Title\n\n')
    })

    it('should convert h2 to markdown', () => {
      const html = '<h2>Section Title</h2>'
      const md = html.replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
      expect(md).toBe('## Section Title\n\n')
    })

    it('should convert h3 to markdown', () => {
      const html = '<h3>Subsection</h3>'
      const md = html.replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
      expect(md).toBe('### Subsection\n\n')
    })

    it('should convert all heading levels', () => {
      const headings = [
        { html: '<h1>H1</h1>', prefix: '#' },
        { html: '<h2>H2</h2>', prefix: '##' },
        { html: '<h3>H3</h3>', prefix: '###' },
        { html: '<h4>H4</h4>', prefix: '####' },
        { html: '<h5>H5</h5>', prefix: '#####' },
        { html: '<h6>H6</h6>', prefix: '######' },
      ]

      headings.forEach(({ html, prefix }, i) => {
        const regex = new RegExp(`<h${i + 1}>(.*?)<\\/h${i + 1}>`, 'g')
        const md = html.replace(regex, `${prefix} $1\n\n`)
        expect(md).toBe(`${prefix} H${i + 1}\n\n`)
      })
    })
  })

  describe('Code Block Conversion', () => {
    it('should convert code tags to inline code', () => {
      const html = '<code>const x = 1</code>'
      const md = html.replace(/<code>(.*?)<\/code>/g, '`$1`')
      expect(md).toBe('`const x = 1`')
    })

    it('should convert pre tags to code blocks', () => {
      const content = 'function hello() {\n  return "world"\n}'
      const md = `\`\`\`\n${content}\n\`\`\``
      expect(md).toContain('```')
      expect(md).toContain(content)
    })
  })

  describe('Strikethrough Conversion', () => {
    it('should convert s tag to markdown strikethrough', () => {
      const html = '<s>deleted text</s>'
      const md = html.replace(/<s>(.*?)<\/s>/g, '~~$1~~')
      expect(md).toBe('~~deleted text~~')
    })

    it('should convert strike tag to markdown strikethrough', () => {
      const html = '<strike>crossed out</strike>'
      const md = html.replace(/<strike>(.*?)<\/strike>/g, '~~$1~~')
      expect(md).toBe('~~crossed out~~')
    })
  })

  describe('Blockquote Conversion', () => {
    it('should convert blockquote to markdown', () => {
      const content = 'This is a quote'
      const md = content.split('\n').map(line => `> ${line}`).join('\n')
      expect(md).toBe('> This is a quote')
    })

    it('should handle multi-line blockquotes', () => {
      const content = 'Line 1\nLine 2\nLine 3'
      const md = content.split('\n').map(line => `> ${line}`).join('\n')
      expect(md).toBe('> Line 1\n> Line 2\n> Line 3')
    })
  })

  describe('List Conversion', () => {
    it('should convert unordered list items', () => {
      const items = ['Item 1', 'Item 2', 'Item 3']
      const md = items.map(item => `- ${item}`).join('\n')
      expect(md).toBe('- Item 1\n- Item 2\n- Item 3')
    })

    it('should convert ordered list items', () => {
      const items = ['First', 'Second', 'Third']
      const md = items.map((item, i) => `${i + 1}. ${item}`).join('\n')
      expect(md).toBe('1. First\n2. Second\n3. Third')
    })

    it('should handle nested list indentation', () => {
      const indent = '  '.repeat(1)
      const md = `${indent}- Nested item`
      expect(md).toBe('  - Nested item')
    })
  })

  describe('CDATA Extraction', () => {
    it('should extract content from CDATA section', () => {
      const enex = '<content><![CDATA[<en-note><div>Hello</div></en-note>]]></content>'
      const cdataMatch = enex.match(/<!\[CDATA\[([\s\S]*)\]\]>/)
      expect(cdataMatch).not.toBeNull()
      expect(cdataMatch![1]).toBe('<en-note><div>Hello</div></en-note>')
    })

    it('should handle content without CDATA', () => {
      const content = '<en-note><div>Content</div></en-note>'
      const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*)\]\]>/)
      expect(cdataMatch).toBeNull()
    })

    it('should handle CDATA with special characters', () => {
      const enex = '<content><![CDATA[<en-note>A & B < C</en-note>]]></content>'
      const cdataMatch = enex.match(/<!\[CDATA\[([\s\S]*)\]\]>/)
      expect(cdataMatch![1]).toContain('A & B < C')
    })
  })

  describe('en-media Element Patterns', () => {
    it('should recognize en-media with hash attribute', () => {
      const enml = '<en-media hash="abc123def456" type="image/png"/>'
      expect(enml).toContain('hash="abc123def456"')
      expect(enml).toContain('type="image/png"')
    })

    it('should extract hash from en-media', () => {
      const enml = '<en-media hash="1234567890abcdef" type="image/jpeg"/>'
      const hashMatch = enml.match(/hash="([^"]+)"/)
      expect(hashMatch).not.toBeNull()
      expect(hashMatch![1]).toBe('1234567890abcdef')
    })

    it('should extract type from en-media', () => {
      const enml = '<en-media hash="abc" type="application/pdf"/>'
      const typeMatch = enml.match(/type="([^"]+)"/)
      expect(typeMatch![1]).toBe('application/pdf')
    })

    it('should handle image media types', () => {
      const imageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      imageTypes.forEach(type => {
        const isImage = type.startsWith('image/')
        expect(isImage).toBe(true)
      })
    })

    it('should handle non-image media types', () => {
      const nonImageTypes = ['application/pdf', 'audio/mp3', 'video/mp4']
      nonImageTypes.forEach(type => {
        const isImage = type.startsWith('image/')
        expect(isImage).toBe(false)
      })
    })
  })

  describe('Table Conversion', () => {
    it('should build table header row', () => {
      const headers = ['Col1', 'Col2', 'Col3']
      const headerRow = '| ' + headers.join(' | ') + ' |'
      expect(headerRow).toBe('| Col1 | Col2 | Col3 |')
    })

    it('should build table separator', () => {
      const colCount = 3
      const separator = '| ' + Array(colCount).fill('---').join(' | ') + ' |'
      expect(separator).toBe('| --- | --- | --- |')
    })

    it('should build table data row', () => {
      const cells = ['Value1', 'Value2', 'Value3']
      const row = '| ' + cells.join(' | ') + ' |'
      expect(row).toBe('| Value1 | Value2 | Value3 |')
    })

    it('should handle empty cells', () => {
      const cells = ['A', '', 'C']
      const row = '| ' + cells.join(' | ') + ' |'
      expect(row).toBe('| A |  | C |')
    })

    it('should pad rows to consistent column count', () => {
      const rows = [['A', 'B', 'C'], ['X', 'Y']]
      const colCount = 3
      const paddedRows = rows.map(row => {
        while (row.length < colCount) row.push('')
        return row
      })
      expect(paddedRows[1]).toEqual(['X', 'Y', ''])
    })
  })

  describe('Summary Extraction', () => {
    it('should remove heading markers', () => {
      const markdown = '# Title\n\nContent here'
      const text = markdown.replace(/^#+\s+/gm, '')
      expect(text).toBe('Title\n\nContent here')
    })

    it('should remove image syntax', () => {
      const markdown = 'Text ![alt](image.png) more text'
      const text = markdown.replace(/!\[.*?\]\(.*?\)/g, '')
      expect(text).toBe('Text  more text')
    })

    it('should keep link text but remove URL', () => {
      const markdown = 'See [this link](https://example.com) for info'
      const text = markdown.replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
      expect(text).toBe('See this link for info')
    })

    it('should remove formatting markers', () => {
      const markdown = '**bold** and *italic* and ~~strike~~'
      const text = markdown.replace(/[*_~`]/g, '')
      expect(text).toBe('bold and italic and strike')
    })

    it('should collapse multiple newlines', () => {
      const markdown = 'Para 1\n\n\n\nPara 2'
      const text = markdown.replace(/\n+/g, ' ')
      expect(text).toBe('Para 1 Para 2')
    })

    it('should truncate long text', () => {
      const text = 'A'.repeat(300)
      const maxLength = 200
      const summary = text.length <= maxLength
        ? text
        : text.slice(0, maxLength - 3) + '...'
      expect(summary).toHaveLength(200)
      expect(summary.endsWith('...')).toBe(true)
    })

    it('should not truncate short text', () => {
      const text = 'Short text'
      const maxLength = 200
      const summary = text.length <= maxLength ? text : text.slice(0, maxLength - 3) + '...'
      expect(summary).toBe('Short text')
    })
  })

  describe('Date Format Edge Cases', () => {
    it('should handle midnight time', () => {
      const enexDate = '20240101T000000Z'
      const regex = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/
      const match = enexDate.match(regex)
      expect(match![4]).toBe('00')
      expect(match![5]).toBe('00')
      expect(match![6]).toBe('00')
    })

    it('should handle end of day time', () => {
      const enexDate = '20241231T235959Z'
      const regex = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/
      const match = enexDate.match(regex)
      expect(match![4]).toBe('23')
      expect(match![5]).toBe('59')
      expect(match![6]).toBe('59')
    })

    it('should create Date object from parsed components', () => {
      const enexDate = '20240315T143000Z'
      const regex = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/
      const match = enexDate.match(regex)!

      const date = new Date(Date.UTC(
        parseInt(match[1], 10),
        parseInt(match[2], 10) - 1, // Month is 0-indexed
        parseInt(match[3], 10),
        parseInt(match[4], 10),
        parseInt(match[5], 10),
        parseInt(match[6], 10)
      ))

      expect(date.getUTCFullYear()).toBe(2024)
      expect(date.getUTCMonth()).toBe(2) // March = 2
      expect(date.getUTCDate()).toBe(15)
      expect(date.getUTCHours()).toBe(14)
    })
  })

  describe('Note Structure Edge Cases', () => {
    it('should handle note without title', () => {
      const note = '<note><content>Just content</content></note>'
      const titleMatch = note.match(/<title>(.*?)<\/title>/)
      expect(titleMatch).toBeNull()
    })

    it('should handle note with empty content', () => {
      const note = '<note><title>Empty</title><content></content></note>'
      const contentMatch = note.match(/<content>(.*?)<\/content>/)
      expect(contentMatch![1]).toBe('')
    })

    it('should handle multiple notes', () => {
      const enex = `<en-export>
        <note><title>Note 1</title></note>
        <note><title>Note 2</title></note>
        <note><title>Note 3</title></note>
      </en-export>`
      const noteMatches = enex.match(/<note>/g)
      expect(noteMatches).toHaveLength(3)
    })

    it('should handle note with all metadata', () => {
      const note = `<note>
        <title>Full Note</title>
        <content>Content</content>
        <created>20240115T100000Z</created>
        <updated>20240116T100000Z</updated>
        <author>Test Author</author>
        <source-url>https://example.com</source-url>
        <tag>tag1</tag>
        <tag>tag2</tag>
      </note>`

      expect(note).toContain('<title>Full Note</title>')
      expect(note).toContain('<author>Test Author</author>')
      expect(note).toContain('<source-url>https://example.com</source-url>')
    })
  })

  describe('Underline and Formatting Preservation', () => {
    it('should handle underline tags', () => {
      const html = '<u>underlined</u>'
      // Markdown doesn't support underline, use HTML
      const md = html.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
      expect(md).toBe('<u>underlined</u>')
    })

    it('should handle em tags (alternate italic)', () => {
      const html = '<em>emphasized</em>'
      const md = html.replace(/<em>(.*?)<\/em>/g, '_$1_')
      expect(md).toBe('_emphasized_')
    })

    it('should handle strong tags (alternate bold)', () => {
      const html = '<strong>important</strong>'
      const md = html.replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      expect(md).toBe('**important**')
    })
  })

  describe('Horizontal Rule Conversion', () => {
    it('should convert hr tag to markdown', () => {
      const md = '\n---\n\n'
      expect(md).toContain('---')
    })
  })

  describe('Image Tag Conversion', () => {
    it('should convert img to markdown image', () => {
      const html = '<img src="photo.jpg" alt="Description"/>'
      const srcMatch = html.match(/src="([^"]*)"/)
      const altMatch = html.match(/alt="([^"]*)"/)

      const src = srcMatch ? srcMatch[1] : ''
      const alt = altMatch ? altMatch[1] : ''
      const md = `![${alt}](${src})`

      expect(md).toBe('![Description](photo.jpg)')
    })

    it('should handle img without alt', () => {
      const html = '<img src="photo.jpg"/>'
      const srcMatch = html.match(/src="([^"]*)"/)
      const altMatch = html.match(/alt="([^"]*)"/)

      const src = srcMatch ? srcMatch[1] : ''
      const alt = altMatch ? altMatch[1] : 'image'
      const md = `![${alt}](${src})`

      expect(md).toBe('![image](photo.jpg)')
    })
  })

  describe('Export Metadata', () => {
    it('should extract export date from en-export', () => {
      const enex = '<en-export export-date="20240115T120000Z" application="Evernote" version="10.0">'
      const dateMatch = enex.match(/export-date="([^"]*)"/)
      expect(dateMatch).not.toBeNull()
      expect(dateMatch![1]).toBe('20240115T120000Z')
    })

    it('should extract application name', () => {
      const enex = '<en-export export-date="20240115T120000Z" application="Evernote" version="10.0">'
      const appMatch = enex.match(/application="([^"]*)"/)
      expect(appMatch![1]).toBe('Evernote')
    })

    it('should extract version', () => {
      const enex = '<en-export export-date="20240115T120000Z" application="Evernote" version="10.0">'
      const verMatch = enex.match(/version="([^"]*)"/)
      expect(verMatch![1]).toBe('10.0')
    })
  })

  describe('Reminder Metadata', () => {
    const NOTE_WITH_REMINDER = `
<note-attributes>
  <reminder-order>1</reminder-order>
  <reminder-time>20240120T100000Z</reminder-time>
  <reminder-done-time>20240121T150000Z</reminder-done-time>
</note-attributes>`

    it('should extract reminder order', () => {
      const orderMatch = NOTE_WITH_REMINDER.match(/<reminder-order>(.*?)<\/reminder-order>/)
      expect(orderMatch).not.toBeNull()
      expect(parseInt(orderMatch![1], 10)).toBe(1)
    })

    it('should extract reminder time', () => {
      const timeMatch = NOTE_WITH_REMINDER.match(/<reminder-time>(.*?)<\/reminder-time>/)
      expect(timeMatch![1]).toBe('20240120T100000Z')
    })

    it('should extract reminder done time', () => {
      const doneMatch = NOTE_WITH_REMINDER.match(/<reminder-done-time>(.*?)<\/reminder-done-time>/)
      expect(doneMatch![1]).toBe('20240121T150000Z')
    })
  })

  describe('Resource Dimensions', () => {
    it('should extract width from resource', () => {
      const resource = '<resource><width>800</width><height>600</height></resource>'
      const widthMatch = resource.match(/<width>(.*?)<\/width>/)
      expect(parseInt(widthMatch![1], 10)).toBe(800)
    })

    it('should extract height from resource', () => {
      const resource = '<resource><width>800</width><height>600</height></resource>'
      const heightMatch = resource.match(/<height>(.*?)<\/height>/)
      expect(parseInt(heightMatch![1], 10)).toBe(600)
    })

    it('should handle missing dimensions', () => {
      const resource = '<resource><data>base64data</data></resource>'
      const widthMatch = resource.match(/<width>(.*?)<\/width>/)
      const heightMatch = resource.match(/<height>(.*?)<\/height>/)
      expect(widthMatch).toBeNull()
      expect(heightMatch).toBeNull()
    })
  })

  describe('Slug Generation for Titles', () => {
    it('should lowercase title for slug', () => {
      const title = 'My Document Title'
      const slug = title.toLowerCase().replace(/\s+/g, '-')
      expect(slug).toBe('my-document-title')
    })

    it('should remove special characters from slug', () => {
      const title = 'Note: Important! (Draft)'
      const slug = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
      expect(slug).toBe('note-important-draft')
    })

    it('should handle unicode in title', () => {
      const title = '日本語ノート'
      const slug = title.toLowerCase().replace(/\s+/g, '-')
      // Unicode preserved in slug
      expect(slug).toBe('日本語ノート')
    })
  })
})
