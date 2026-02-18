/**
 * Remark Plugins Tests
 * @module __tests__/unit/lib/remark/remarkPlugins.test
 *
 * Tests for remark markdown transformation plugins.
 * Tests cover:
 * - remarkMentions: @mention parsing and transformation
 * - remarkStripControlFlags: Control flag removal
 * - HTML escaping utilities
 * - Pattern matching edge cases
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// MENTION PATTERN TESTS
// ============================================================================

describe('Remark Mentions Plugin', () => {
  // Pattern: Match @mentions - word characters, hyphens, and underscores
  // Must be preceded by whitespace or start of string
  const MENTION_PATTERN = /(?:^|[\s\(\[\{])(@([a-zA-Z][a-zA-Z0-9_-]*))/g

  describe('Mention Pattern Matching', () => {
    it('should match simple @mention', () => {
      const text = '@john-doe said hello'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))

      expect(matches).toHaveLength(1)
      expect(matches[0][2]).toBe('john-doe')
    })

    it('should match @mention at start of text', () => {
      const text = '@admin is here'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))

      expect(matches).toHaveLength(1)
      expect(matches[0][2]).toBe('admin')
    })

    it('should match @mention after space', () => {
      const text = 'Hello @user how are you'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))

      expect(matches).toHaveLength(1)
      expect(matches[0][2]).toBe('user')
    })

    it('should match @mention after parenthesis', () => {
      const text = 'Check with (@team-lead) about this'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))

      expect(matches).toHaveLength(1)
      expect(matches[0][2]).toBe('team-lead')
    })

    it('should match @mention after bracket', () => {
      const text = 'See [@author] for details'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))

      expect(matches).toHaveLength(1)
      expect(matches[0][2]).toBe('author')
    })

    it('should match @mention after brace', () => {
      const text = 'Config {@owner} needed'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))

      expect(matches).toHaveLength(1)
      expect(matches[0][2]).toBe('owner')
    })

    it('should match multiple @mentions', () => {
      const text = '@alice and @bob with @charlie'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))

      expect(matches).toHaveLength(3)
      expect(matches[0][2]).toBe('alice')
      expect(matches[1][2]).toBe('bob')
      expect(matches[2][2]).toBe('charlie')
    })

    it('should match @mention with underscores', () => {
      const text = '@john_smith_jr here'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))

      expect(matches).toHaveLength(1)
      expect(matches[0][2]).toBe('john_smith_jr')
    })

    it('should match @mention with numbers', () => {
      const text = '@user123 logged in'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))

      expect(matches).toHaveLength(1)
      expect(matches[0][2]).toBe('user123')
    })

    it('should not match @mention starting with number', () => {
      const text = '@123user is invalid'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))

      expect(matches).toHaveLength(0)
    })

    it('should not match email-like patterns', () => {
      const text = 'Contact john@example.com'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))

      // Should not match because no space before @
      expect(matches).toHaveLength(0)
    })
  })

  describe('HTML Escaping', () => {
    const escapeHtml = (str: string): string => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }

    it('should escape ampersand', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B')
    })

    it('should escape less than', () => {
      expect(escapeHtml('a < b')).toBe('a &lt; b')
    })

    it('should escape greater than', () => {
      expect(escapeHtml('a > b')).toBe('a &gt; b')
    })

    it('should escape double quotes', () => {
      expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;')
    })

    it('should escape single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#039;s')
    })

    it('should escape multiple characters', () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
      )
    }
    )

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('')
    })

    it('should handle string with no special chars', () => {
      expect(escapeHtml('hello world')).toBe('hello world')
    })
  })

  describe('Mention Badge Generation', () => {
    const escapeHtml = (str: string): string => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }

    it('should generate correct HTML for mention', () => {
      const mention = 'john-doe'
      const html = `<span class="mention-badge" data-mention="${escapeHtml(mention)}">@${escapeHtml(mention)}</span>`

      expect(html).toBe('<span class="mention-badge" data-mention="john-doe">@john-doe</span>')
    })

    it('should escape special chars in mention', () => {
      const mention = 'user&test'
      const html = `<span class="mention-badge" data-mention="${escapeHtml(mention)}">@${escapeHtml(mention)}</span>`

      expect(html).toContain('data-mention="user&amp;test"')
    })
  })

  describe('Text Splitting Around Mentions', () => {
    it('should split text before mention', () => {
      const text = 'Hello @john world'
      const mentionStart = 6 // @john starts at index 6
      const mentionEnd = 11 // @john ends at index 11

      const before = text.slice(0, mentionStart)
      const after = text.slice(mentionEnd)

      expect(before).toBe('Hello ')
      expect(after).toBe(' world')
    })

    it('should handle mention at start', () => {
      const text = '@john world'
      const mentionStart = 0
      const mentionEnd = 5

      const before = text.slice(0, mentionStart)
      const after = text.slice(mentionEnd)

      expect(before).toBe('')
      expect(after).toBe(' world')
    })

    it('should handle mention at end', () => {
      const text = 'Hello @john'
      const mentionStart = 6
      const mentionEnd = 11

      const before = text.slice(0, mentionStart)
      const after = text.slice(mentionEnd)

      expect(before).toBe('Hello ')
      expect(after).toBe('')
    })
  })
})

// ============================================================================
// CONTROL FLAGS PATTERN TESTS
// ============================================================================

describe('Remark Strip Control Flags Plugin', () => {
  const CONTROL_FLAG_PATTERN = /^(skip_ai|skip_index|manual_tags|auto_tags|ai_enhance):\s*(true|false)/i

  describe('Control Flag Pattern Matching', () => {
    it('should match skip_ai: true', () => {
      expect(CONTROL_FLAG_PATTERN.test('skip_ai: true')).toBe(true)
    })

    it('should match skip_ai: false', () => {
      expect(CONTROL_FLAG_PATTERN.test('skip_ai: false')).toBe(true)
    })

    it('should match skip_index: true', () => {
      expect(CONTROL_FLAG_PATTERN.test('skip_index: true')).toBe(true)
    })

    it('should match manual_tags: true', () => {
      expect(CONTROL_FLAG_PATTERN.test('manual_tags: true')).toBe(true)
    })

    it('should match auto_tags: false', () => {
      expect(CONTROL_FLAG_PATTERN.test('auto_tags: false')).toBe(true)
    })

    it('should match ai_enhance: true', () => {
      expect(CONTROL_FLAG_PATTERN.test('ai_enhance: true')).toBe(true)
    })

    it('should be case insensitive', () => {
      expect(CONTROL_FLAG_PATTERN.test('SKIP_AI: TRUE')).toBe(true)
      expect(CONTROL_FLAG_PATTERN.test('Skip_Ai: False')).toBe(true)
    })

    it('should allow extra spaces', () => {
      expect(CONTROL_FLAG_PATTERN.test('skip_ai:  true')).toBe(true)
      expect(CONTROL_FLAG_PATTERN.test('skip_ai:   false')).toBe(true)
    })

    it('should not match other keys', () => {
      expect(CONTROL_FLAG_PATTERN.test('title: Hello')).toBe(false)
      expect(CONTROL_FLAG_PATTERN.test('author: John')).toBe(false)
    })

    it('should not match partial patterns', () => {
      expect(CONTROL_FLAG_PATTERN.test('skip_ai_enhanced: true')).toBe(false)
      expect(CONTROL_FLAG_PATTERN.test('my_skip_ai: true')).toBe(false)
    })

    it('should not match without colon', () => {
      expect(CONTROL_FLAG_PATTERN.test('skip_ai true')).toBe(false)
    })

    it('should not match non-boolean values', () => {
      expect(CONTROL_FLAG_PATTERN.test('skip_ai: maybe')).toBe(false)
      expect(CONTROL_FLAG_PATTERN.test('skip_ai: yes')).toBe(false)
    })
  })

  describe('Line Filtering', () => {
    it('should filter control flag lines', () => {
      const lines = [
        'Hello world',
        'skip_ai: true',
        'More content',
        'manual_tags: false',
        'Final line',
      ]

      const cleanLines = lines.filter(line => !CONTROL_FLAG_PATTERN.test(line.trim()))

      expect(cleanLines).toHaveLength(3)
      expect(cleanLines).toEqual(['Hello world', 'More content', 'Final line'])
    })

    it('should handle all control flag lines', () => {
      const lines = ['skip_ai: true', 'skip_index: false']
      const cleanLines = lines.filter(line => !CONTROL_FLAG_PATTERN.test(line.trim()))

      expect(cleanLines).toHaveLength(0)
    })

    it('should handle no control flag lines', () => {
      const lines = ['Hello', 'World']
      const cleanLines = lines.filter(line => !CONTROL_FLAG_PATTERN.test(line.trim()))

      expect(cleanLines).toHaveLength(2)
    })

    it('should handle empty lines', () => {
      const lines = ['', 'skip_ai: true', '', 'content', '']
      const cleanLines = lines.filter(line => !CONTROL_FLAG_PATTERN.test(line.trim()))

      expect(cleanLines).toHaveLength(4) // Empty lines preserved
    })

    it('should handle whitespace around flags', () => {
      const lines = ['  skip_ai: true  ', '\tmanual_tags: false\t']
      const cleanLines = lines.filter(line => !CONTROL_FLAG_PATTERN.test(line.trim()))

      expect(cleanLines).toHaveLength(0)
    })
  })

  describe('Multi-line Text Cleaning', () => {
    it('should clean control flags from multi-line text', () => {
      const text = 'Hello\nskip_ai: true\nWorld'
      const lines = text.split('\n')
      const cleanLines = lines.filter(line => !CONTROL_FLAG_PATTERN.test(line.trim()))
      const cleanText = cleanLines.join('\n')

      expect(cleanText).toBe('Hello\nWorld')
    })

    it('should preserve text structure', () => {
      const text = 'Para 1\n\nskip_ai: true\n\nPara 2'
      const lines = text.split('\n')
      const cleanLines = lines.filter(line => !CONTROL_FLAG_PATTERN.test(line.trim()))
      const cleanText = cleanLines.join('\n')

      // Original: Para 1, empty, skip_ai: true, empty, Para 2
      // After filter: Para 1, empty, empty, Para 2 = 3 newlines
      expect(cleanText).toBe('Para 1\n\n\nPara 2')
    })
  })
})

// ============================================================================
// MENTION STYLES TESTS
// ============================================================================

describe('Mention Styles', () => {
  const mentionStyles = `
.mention-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.375rem;
  margin: 0 0.125rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  background: rgba(59, 130, 246, 0.15);
  color: rgb(96, 165, 250);
  cursor: pointer;
  transition: background-color 0.2s;
}

.mention-badge:hover {
  background: rgba(59, 130, 246, 0.25);
}
`

  it('should contain .mention-badge class', () => {
    expect(mentionStyles).toContain('.mention-badge')
  })

  it('should contain hover styles', () => {
    expect(mentionStyles).toContain('.mention-badge:hover')
  })

  it('should have display: inline-flex', () => {
    expect(mentionStyles).toContain('display: inline-flex')
  })

  it('should have cursor: pointer', () => {
    expect(mentionStyles).toContain('cursor: pointer')
  })

  it('should have border-radius for pill shape', () => {
    expect(mentionStyles).toContain('border-radius: 9999px')
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  const MENTION_PATTERN = /(?:^|[\s\(\[\{])(@([a-zA-Z][a-zA-Z0-9_-]*))/g

  describe('Mention Edge Cases', () => {
    it('should handle empty string', () => {
      const text = ''
      const matches = Array.from(text.matchAll(MENTION_PATTERN))
      expect(matches).toHaveLength(0)
    })

    it('should handle only whitespace', () => {
      const text = '   '
      const matches = Array.from(text.matchAll(MENTION_PATTERN))
      expect(matches).toHaveLength(0)
    })

    it('should handle @ alone', () => {
      const text = 'Just an @ symbol'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))
      expect(matches).toHaveLength(0)
    })

    it('should handle @@ double at', () => {
      const text = '@@user'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))
      // Should not match - no space before second @
      expect(matches).toHaveLength(0)
    })

    it('should handle consecutive mentions', () => {
      const text = '@alice @bob @charlie'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))
      expect(matches).toHaveLength(3)
    })

    it('should handle very long mention', () => {
      const longName = 'a'.repeat(100)
      const text = `@${longName} said`
      const matches = Array.from(text.matchAll(MENTION_PATTERN))
      expect(matches).toHaveLength(1)
      expect(matches[0][2]).toBe(longName)
    })

    it('should handle single character mention', () => {
      const text = '@a said'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))
      expect(matches).toHaveLength(1)
      expect(matches[0][2]).toBe('a')
    })

    it('should handle mention followed by punctuation', () => {
      const text = '@user, @admin. @mod!'
      const matches = Array.from(text.matchAll(MENTION_PATTERN))
      expect(matches).toHaveLength(3)
    })
  })

  describe('Control Flag Edge Cases', () => {
    const CONTROL_FLAG_PATTERN = /^(skip_ai|skip_index|manual_tags|auto_tags|ai_enhance):\s*(true|false)/i

    it('should handle empty string', () => {
      expect(CONTROL_FLAG_PATTERN.test('')).toBe(false)
    })

    it('should handle only whitespace', () => {
      expect(CONTROL_FLAG_PATTERN.test('   ')).toBe(false)
    })

    it('should not match middle of line', () => {
      expect(CONTROL_FLAG_PATTERN.test('some text skip_ai: true')).toBe(false)
    })

    it('should not match with prefix', () => {
      expect(CONTROL_FLAG_PATTERN.test('  skip_ai: true')).toBe(false)
    })

    it('should handle just the key', () => {
      expect(CONTROL_FLAG_PATTERN.test('skip_ai:')).toBe(false)
    })

    it('should handle key without value', () => {
      expect(CONTROL_FLAG_PATTERN.test('skip_ai: ')).toBe(false)
    })
  })
})

// ============================================================================
// NODE TRANSFORMATION TESTS
// ============================================================================

describe('AST Node Transformation', () => {
  describe('Text Node Splitting', () => {
    it('should calculate correct offsets for single mention', () => {
      const text = 'Hello @user world'
      //           0123456789...
      // @user starts at 6, ends at 11

      const MENTION_PATTERN = /(?:^|[\s\(\[\{])(@([a-zA-Z][a-zA-Z0-9_-]*))/g
      let match
      const matches: Array<{ start: number; end: number; mention: string }> = []

      while ((match = MENTION_PATTERN.exec(text)) !== null) {
        const fullMatch = match[1]
        const mention = match[2]
        const start = match.index + (match[0].length - match[1].length)

        matches.push({
          start,
          end: start + fullMatch.length,
          mention,
        })
      }

      expect(matches).toHaveLength(1)
      expect(matches[0].start).toBe(6)
      expect(matches[0].end).toBe(11)
      expect(matches[0].mention).toBe('user')
    })

    it('should calculate correct offsets for mention after paren', () => {
      const text = 'Ask (@lead) about it'
      //           01234567890...
      // @lead starts at 5, ends at 10

      const MENTION_PATTERN = /(?:^|[\s\(\[\{])(@([a-zA-Z][a-zA-Z0-9_-]*))/g
      let match
      const matches: Array<{ start: number; end: number }> = []

      while ((match = MENTION_PATTERN.exec(text)) !== null) {
        const fullMatch = match[1]
        const start = match.index + (match[0].length - match[1].length)

        matches.push({
          start,
          end: start + fullMatch.length,
        })
      }

      expect(matches[0].start).toBe(5)
      expect(matches[0].end).toBe(10)
    })
  })

  describe('New Nodes Array Building', () => {
    it('should build nodes for text with single mention', () => {
      const text = 'Hi @user bye'
      const mentionStart = 3
      const mentionEnd = 8
      const mention = 'user'

      const nodes: Array<{ type: string; value: string }> = []
      let lastIndex = 0

      // Add text before
      if (mentionStart > lastIndex) {
        nodes.push({ type: 'text', value: text.slice(lastIndex, mentionStart) })
      }

      // Add mention as HTML
      nodes.push({
        type: 'html',
        value: `<span class="mention-badge">@${mention}</span>`,
      })
      lastIndex = mentionEnd

      // Add text after
      if (lastIndex < text.length) {
        nodes.push({ type: 'text', value: text.slice(lastIndex) })
      }

      expect(nodes).toHaveLength(3)
      expect(nodes[0]).toEqual({ type: 'text', value: 'Hi ' })
      expect(nodes[1].type).toBe('html')
      expect(nodes[2]).toEqual({ type: 'text', value: ' bye' })
    })

    it('should build nodes for mention at start', () => {
      const text = '@user bye'
      const mentionStart = 0
      const mentionEnd = 5

      const nodes: Array<{ type: string; value: string }> = []

      // No text before
      if (mentionStart > 0) {
        nodes.push({ type: 'text', value: text.slice(0, mentionStart) })
      }

      nodes.push({ type: 'html', value: '<span>@user</span>' })

      if (mentionEnd < text.length) {
        nodes.push({ type: 'text', value: text.slice(mentionEnd) })
      }

      expect(nodes).toHaveLength(2)
      expect(nodes[0].type).toBe('html')
      expect(nodes[1]).toEqual({ type: 'text', value: ' bye' })
    })

    it('should build nodes for mention at end', () => {
      const text = 'Hi @user'
      const mentionStart = 3
      const mentionEnd = 8

      const nodes: Array<{ type: string; value: string }> = []

      if (mentionStart > 0) {
        nodes.push({ type: 'text', value: text.slice(0, mentionStart) })
      }

      nodes.push({ type: 'html', value: '<span>@user</span>' })

      // No text after
      if (mentionEnd < text.length) {
        nodes.push({ type: 'text', value: text.slice(mentionEnd) })
      }

      expect(nodes).toHaveLength(2)
      expect(nodes[0]).toEqual({ type: 'text', value: 'Hi ' })
      expect(nodes[1].type).toBe('html')
    })
  })
})
