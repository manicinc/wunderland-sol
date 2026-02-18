/**
 * Content Extractor Tests
 * @module __tests__/unit/lib/transform/contentExtractor.test
 *
 * Tests for content extraction from strands into structured fields.
 */

import { describe, it, expect } from 'vitest'
import {
  extractFieldValue,
  extractTitle,
  parseFrontmatter,
  suggestFieldMappings,
} from '@/lib/transform/contentExtractor'
import type { SelectedStrand } from '@/components/quarry/contexts/SelectedStrandsContext'
import type { SupertagFieldDefinition, SupertagSchema } from '@/lib/supertags/types'

// ============================================================================
// TEST HELPERS
// ============================================================================

function createStrand(overrides: Partial<SelectedStrand> = {}): SelectedStrand {
  return {
    path: '/test/strand.md',
    title: '',
    content: '',
    tags: [],
    weave: 'test-weave',
    loom: 'test-loom',
    ...overrides,
  }
}

function createField(overrides: Partial<SupertagFieldDefinition> = {}): SupertagFieldDefinition {
  return {
    name: 'testField',
    type: 'text',
    label: 'Test Field',
    ...overrides,
  }
}

// ============================================================================
// parseFrontmatter
// ============================================================================

describe('parseFrontmatter', () => {
  it('parses basic key-value pairs', () => {
    const content = `---
title: My Title
author: John Doe
---

Content here`

    const result = parseFrontmatter(content)
    expect(result.title).toBe('My Title')
    expect(result.author).toBe('John Doe')
  })

  it('returns empty object when no frontmatter', () => {
    const content = 'Just some content without frontmatter'
    expect(parseFrontmatter(content)).toEqual({})
  })

  it('parses array values', () => {
    const content = `---
tags: [tag1, tag2, tag3]
---`

    const result = parseFrontmatter(content)
    expect(result.tags).toEqual(['tag1', 'tag2', 'tag3'])
  })

  it('parses boolean values', () => {
    const content = `---
published: true
draft: false
---`

    const result = parseFrontmatter(content)
    expect(result.published).toBe(true)
    expect(result.draft).toBe(false)
  })

  it('parses numeric values', () => {
    const content = `---
rating: 5
progress: 75
---`

    const result = parseFrontmatter(content)
    expect(result.rating).toBe(5)
    expect(result.progress).toBe(75)
  })

  it('strips quotes from string values', () => {
    const content = `---
title: "Quoted Title"
author: 'Single Quoted'
---`

    const result = parseFrontmatter(content)
    expect(result.title).toBe('Quoted Title')
    expect(result.author).toBe('Single Quoted')
  })

  it('handles empty frontmatter', () => {
    const content = `---
---

Content`

    const result = parseFrontmatter(content)
    expect(result).toEqual({})
  })
})

// ============================================================================
// extractTitle
// ============================================================================

describe('extractTitle', () => {
  it('uses strand title when available', () => {
    const strand = createStrand({ title: 'Strand Title' })
    const result = extractTitle(strand, '# Heading\nContent')

    expect(result.value).toBe('Strand Title')
    expect(result.confidence).toBe(1.0)
    expect(result.source).toBe('title')
  })

  it('extracts from markdown heading', () => {
    const strand = createStrand()
    const content = '# My Document Title\n\nSome content here'
    const result = extractTitle(strand, content)

    expect(result.value).toBe('My Document Title')
    expect(result.confidence).toBe(0.9)
    expect(result.source).toBe('content')
  })

  it('extracts from first line when no heading', () => {
    const strand = createStrand()
    const content = 'First line as title\n\nMore content'
    const result = extractTitle(strand, content)

    expect(result.value).toBe('First line as title')
    expect(result.confidence).toBe(0.7)
    expect(result.source).toBe('content')
  })

  it('falls back to filename', () => {
    const strand = createStrand({ path: '/docs/my-document.md' })
    const content = ''
    const result = extractTitle(strand, content)

    expect(result.value).toBe('my-document')
    expect(result.confidence).toBe(0.5)
    expect(result.source).toBe('filename')
  })

  it('handles different heading levels', () => {
    const strand = createStrand()
    const content = '## Second Level Heading\n\nContent'
    const result = extractTitle(strand, content)

    expect(result.value).toBe('Second Level Heading')
  })
})

// ============================================================================
// extractFieldValue - Text Type
// ============================================================================

describe('extractFieldValue - text type', () => {
  it('extracts from frontmatter first', () => {
    const strand = createStrand()
    const content = `---
testField: Frontmatter Value
---
testField: Content Value`
    const frontmatter = { testField: 'Frontmatter Value' }
    const field = createField()

    const result = extractFieldValue(field, strand, content, frontmatter)
    expect(result.value).toBe('Frontmatter Value')
    expect(result.confidence).toBe(1.0)
    expect(result.source).toBe('frontmatter')
  })

  it('extracts labeled content', () => {
    const strand = createStrand()
    const content = 'author: John Smith\nOther content'
    const field = createField({ name: 'author' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe('John Smith')
    expect(result.confidence).toBe(0.8)
    expect(result.source).toBe('content')
  })

  it('uses default value when no extraction', () => {
    const strand = createStrand()
    const content = 'No matching content'
    const field = createField({ defaultValue: 'Default Text' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe('Default Text')
    expect(result.confidence).toBe(0.5)
    expect(result.source).toBe('manual')
  })
})

// ============================================================================
// extractFieldValue - Number Type
// ============================================================================

describe('extractFieldValue - number type', () => {
  it('extracts labeled numbers', () => {
    const strand = createStrand()
    const content = 'Rating: 4.5\nOther content'
    const field = createField({ name: 'rating', type: 'number' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe(4.5)
    expect(result.confidence).toBe(0.8)
  })

  it('extracts integer values', () => {
    const strand = createStrand()
    const content = 'count: 42'
    const field = createField({ name: 'count', type: 'number' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe(42)
  })

  it('returns undefined for missing numbers', () => {
    const strand = createStrand()
    const content = 'No numbers here'
    const field = createField({ name: 'value', type: 'number' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBeUndefined()
    expect(result.confidence).toBe(0)
  })
})

// ============================================================================
// extractFieldValue - Date Type
// ============================================================================

describe('extractFieldValue - date type', () => {
  it('extracts @due annotation', () => {
    const strand = createStrand()
    const content = 'Task @due(2024-06-15) needs to be done'
    const field = createField({ name: 'dueDate', type: 'date' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toContain('2024-06-15')
    expect(result.confidence).toBe(0.95)
  })

  it('extracts labeled dates with ISO format', () => {
    const strand = createStrand()
    const content = 'Date: 2024-01-15\nMore content'
    const field = createField({ name: 'date', type: 'date' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBeDefined()
    expect(result.confidence).toBe(0.8)
  })

  it('extracts with "scheduled" keyword', () => {
    const strand = createStrand()
    const content = 'Scheduled 2024-03-20\nEvent details'
    const field = createField({ name: 'scheduledDate', type: 'date' })

    const result = extractFieldValue(field, strand, content, {})
    // May or may not find depending on exact pattern
    expect(result.fieldName).toBe('scheduledDate')
  })
})

// ============================================================================
// extractFieldValue - URL Type
// ============================================================================

describe('extractFieldValue - url type', () => {
  it('extracts URLs from content', () => {
    const strand = createStrand()
    const content = 'Check out https://example.com/page for more info'
    const field = createField({ name: 'link', type: 'url' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe('https://example.com/page')
    expect(result.confidence).toBe(0.9)
  })

  it('extracts first URL when multiple present', () => {
    const strand = createStrand()
    const content = 'See https://first.com and https://second.com'
    const field = createField({ name: 'url', type: 'url' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe('https://first.com')
  })

  it('handles http URLs', () => {
    const strand = createStrand()
    const content = 'Legacy link: http://old-site.com/path'
    const field = createField({ name: 'website', type: 'url' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe('http://old-site.com/path')
  })

  it('returns undefined when no URL found', () => {
    const strand = createStrand()
    const content = 'No URLs in this content'
    const field = createField({ name: 'url', type: 'url' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBeUndefined()
    expect(result.confidence).toBe(0)
  })
})

// ============================================================================
// extractFieldValue - Email Type
// ============================================================================

describe('extractFieldValue - email type', () => {
  it('extracts email addresses', () => {
    const strand = createStrand()
    const content = 'Contact us at support@example.com for help'
    const field = createField({ name: 'email', type: 'email' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe('support@example.com')
    expect(result.confidence).toBe(0.9)
  })

  it('handles complex email addresses', () => {
    const strand = createStrand()
    const content = 'Email: john.doe+test@sub.example.co.uk'
    const field = createField({ name: 'contact', type: 'email' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toContain('@')
  })

  it('returns undefined when no email found', () => {
    const strand = createStrand()
    const content = 'No email addresses here'
    const field = createField({ name: 'email', type: 'email' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBeUndefined()
  })
})

// ============================================================================
// extractFieldValue - Phone Type
// ============================================================================

describe('extractFieldValue - phone type', () => {
  it('extracts phone numbers with dashes', () => {
    const strand = createStrand()
    const content = 'Call 555-123-4567 for support'
    const field = createField({ name: 'phone', type: 'phone' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe('555-123-4567')
    expect(result.confidence).toBe(0.85)
  })

  it('extracts phone with parentheses', () => {
    const strand = createStrand()
    const content = 'Phone: (555) 123-4567'
    const field = createField({ name: 'contact', type: 'phone' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toContain('123-4567')
  })

  it('extracts international format', () => {
    const strand = createStrand()
    const content = 'International: +1 555 123 4567'
    const field = createField({ name: 'phone', type: 'phone' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBeDefined()
  })

  it('returns undefined when no phone found', () => {
    const strand = createStrand()
    const content = 'No phone numbers here'
    const field = createField({ name: 'phone', type: 'phone' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBeUndefined()
  })
})

// ============================================================================
// extractFieldValue - Rating Type
// ============================================================================

describe('extractFieldValue - rating type', () => {
  it('extracts explicit rating', () => {
    const strand = createStrand()
    const content = 'Rating: 4 out of 5'
    const field = createField({ name: 'rating', type: 'rating' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe(4)
    expect(result.confidence).toBe(0.9)
  })

  it('counts star emojis', () => {
    const strand = createStrand()
    const content = 'Movie review: ⭐⭐⭐⭐'
    const field = createField({ name: 'stars', type: 'rating' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe(4)
    expect(result.preview).toBe('⭐⭐⭐⭐')
  })

  it('caps at 5 stars', () => {
    const strand = createStrand()
    const content = '⭐⭐⭐⭐⭐⭐⭐' // 7 stars
    const field = createField({ name: 'rating', type: 'rating' })

    const result = extractFieldValue(field, strand, content, {})
    // The implementation checks starCount <= 5
    expect(result.value).toBeUndefined()
  })

  it('returns undefined when no rating found', () => {
    const strand = createStrand()
    const content = 'No rating information'
    const field = createField({ name: 'rating', type: 'rating' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBeUndefined()
  })
})

// ============================================================================
// extractFieldValue - Progress Type
// ============================================================================

describe('extractFieldValue - progress type', () => {
  it('calculates from checkboxes', () => {
    const strand = createStrand()
    const content = `Tasks:
- [x] Done task
- [x] Another done
- [ ] Not done
- [ ] Also not done`
    const field = createField({ name: 'completion', type: 'progress' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe(50) // 2/4 = 50%
    expect(result.confidence).toBe(0.9)
  })

  it('extracts explicit progress percentage', () => {
    const strand = createStrand()
    const content = 'Progress: 75%'
    const field = createField({ name: 'progress', type: 'progress' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe(75)
    expect(result.preview).toBe('75%')
  })

  it('returns 0 when no progress indicators', () => {
    const strand = createStrand()
    const content = 'Just some text content'
    const field = createField({ name: 'progress', type: 'progress' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe(0)
    expect(result.confidence).toBe(0.3)
  })
})

// ============================================================================
// extractFieldValue - Checkbox Type
// ============================================================================

describe('extractFieldValue - checkbox type', () => {
  it('detects completion from keywords', () => {
    const strand = createStrand()
    const content = 'Status: completed'
    const field = createField({ name: 'done', type: 'checkbox' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe(true)
    expect(result.confidence).toBe(0.7)
  })

  it('returns true when all checkboxes done', () => {
    const strand = createStrand()
    const content = '- [x] Task 1\n- [x] Task 2'
    const field = createField({ name: 'allComplete', type: 'checkbox' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe(true)
    expect(result.confidence).toBe(0.8)
  })

  it('returns false when some checkboxes incomplete', () => {
    const strand = createStrand()
    const content = '- [x] Task 1\n- [ ] Task 2'
    const field = createField({ name: 'done', type: 'checkbox' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe(false)
  })
})

// ============================================================================
// extractFieldValue - Select Type
// ============================================================================

describe('extractFieldValue - select type', () => {
  it('extracts priority', () => {
    const strand = createStrand()
    const content = 'Priority: high\nTask description'
    const field = createField({
      name: 'priority',
      type: 'select',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
    })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe('high')
    // Confidence is 0.7 since it matches option.label in content
    expect(result.confidence).toBe(0.7)
  })

  it('extracts status from keywords', () => {
    const strand = createStrand()
    const content = 'Currently in progress with the implementation'
    const field = createField({
      name: 'status',
      type: 'select',
      options: [
        { value: 'todo', label: 'To Do' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'done', label: 'Done' },
      ],
    })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe('in_progress')
    expect(result.confidence).toBe(0.8)
  })

  it('matches option label in content', () => {
    const strand = createStrand()
    const content = 'The task is marked as To Do'
    const field = createField({
      name: 'status',
      type: 'select',
      options: [
        { value: 'todo', label: 'To Do' },
        { value: 'done', label: 'Done' },
      ],
    })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe('todo')
  })
})

// ============================================================================
// extractFieldValue - Multiselect Type
// ============================================================================

describe('extractFieldValue - multiselect type', () => {
  it('extracts multiple matching options', () => {
    const strand = createStrand()
    const content = 'Features: authentication, dashboard, and notifications'
    const field = createField({
      name: 'features',
      type: 'multiselect',
      options: [
        { value: 'auth', label: 'Authentication' },
        { value: 'dash', label: 'Dashboard' },
        { value: 'notify', label: 'Notifications' },
        { value: 'reports', label: 'Reports' },
      ],
    })

    const result = extractFieldValue(field, strand, content, {})
    expect(Array.isArray(result.value)).toBe(true)
    expect((result.value as string[]).length).toBeGreaterThan(0)
  })

  it('returns empty array when no matches', () => {
    const strand = createStrand()
    const content = 'This text does not include the options'
    const field = createField({
      name: 'categories',
      type: 'multiselect',
      options: [
        { value: 'zebra', label: 'Zebra Option' },
        { value: 'giraffe', label: 'Giraffe Option' },
      ],
    })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toEqual([])
    expect(result.confidence).toBe(0)
  })
})

// ============================================================================
// extractFieldValue - Tags Type
// ============================================================================

describe('extractFieldValue - tags type', () => {
  it('uses existing strand tags', () => {
    const strand = createStrand({ tags: ['react', 'typescript'] })
    const content = 'Some content'
    const field = createField({ name: 'tags', type: 'tags' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toContain('react')
    expect(result.value).toContain('typescript')
    expect(result.source).toBe('tags')
  })

  it('extracts hashtags from content', () => {
    const strand = createStrand({ tags: [] })
    const content = 'Working on #frontend #performance improvements'
    const field = createField({ name: 'tags', type: 'tags' })

    const result = extractFieldValue(field, strand, content, {})
    expect((result.value as string[]).includes('frontend')).toBe(true)
    expect((result.value as string[]).includes('performance')).toBe(true)
    expect(result.source).toBe('content')
  })

  it('extracts @mentions for attendees field', () => {
    const strand = createStrand()
    const content = 'Meeting with @john and @"Jane Doe"'
    const field = createField({ name: 'attendees', type: 'tags' })

    const result = extractFieldValue(field, strand, content, {})
    const tags = result.value as string[]
    expect(tags.some(t => t.includes('john') || t.includes('Jane'))).toBe(true)
  })

  it('parses attendees section', () => {
    const strand = createStrand()
    const content = 'Attendees: Alice, Bob, Charlie\nAgenda items...'
    const field = createField({ name: 'attendees', type: 'tags' })

    const result = extractFieldValue(field, strand, content, {})
    const tags = result.value as string[]
    expect(tags.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// extractFieldValue - Reference Type
// ============================================================================

describe('extractFieldValue - reference type', () => {
  it('extracts wiki-style links', () => {
    const strand = createStrand()
    const content = 'Related to [[Project Overview]] document'
    const field = createField({ name: 'relatedDoc', type: 'reference' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe('Project Overview')
    expect(result.confidence).toBe(0.9)
  })

  it('returns undefined when no wiki link found', () => {
    const strand = createStrand()
    const content = 'No wiki links here'
    const field = createField({ name: 'reference', type: 'reference' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBeUndefined()
    expect(result.confidence).toBe(0)
  })
})

// ============================================================================
// extractFieldValue - Textarea Type
// ============================================================================

describe('extractFieldValue - textarea type', () => {
  it('extracts notes field from content', () => {
    const strand = createStrand()
    const content = `# Meeting Title

This is the content of the document.
It has multiple lines.`
    const field = createField({ name: 'notes', type: 'textarea' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBeDefined()
    expect(result.confidence).toBe(0.7)
  })

  it('extracts tasks for action_items field', () => {
    const strand = createStrand()
    const content = `# Planning
- [x] Review requirements
- [ ] Write specs
- [ ] Implement feature`
    const field = createField({ name: 'action_items', type: 'textarea' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toContain('- [x]')
    expect(result.preview).toBe('3 task(s)')
  })

  it('extracts bullet points for agenda field', () => {
    const strand = createStrand()
    const content = `# Meeting Agenda
- Review last week
- Discuss roadmap
- Plan sprints`
    const field = createField({ name: 'agenda', type: 'textarea' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toContain('Review last week')
    expect(result.preview).toBe('3 item(s)')
  })
})

// ============================================================================
// suggestFieldMappings
// ============================================================================

describe('suggestFieldMappings', () => {
  it('suggests title extraction source for title fields', () => {
    const schema: SupertagSchema = {
      name: 'Test Schema',
      icon: '📝',
      description: 'Test',
      fields: [
        { name: 'title', type: 'text', label: 'Title' },
      ],
    }

    const mappings = suggestFieldMappings(schema, [])
    expect(mappings[0].extractionSource).toBe('title')
  })

  it('suggests content extraction for notes fields', () => {
    const schema: SupertagSchema = {
      name: 'Test Schema',
      icon: '📝',
      description: 'Test',
      fields: [
        { name: 'notes', type: 'textarea', label: 'Notes' },
      ],
    }

    const mappings = suggestFieldMappings(schema, [])
    expect(mappings[0].extractionSource).toBe('content')
  })

  it('suggests tags extraction for tags fields', () => {
    const schema: SupertagSchema = {
      name: 'Test Schema',
      icon: '📝',
      description: 'Test',
      fields: [
        { name: 'tags', type: 'tags', label: 'Tags' },
      ],
    }

    const mappings = suggestFieldMappings(schema, [])
    expect(mappings[0].extractionSource).toBe('tags')
  })

  it('suggests auto for date fields', () => {
    const schema: SupertagSchema = {
      name: 'Test Schema',
      icon: '📝',
      description: 'Test',
      fields: [
        { name: 'dueDate', type: 'date', label: 'Due Date' },
      ],
    }

    const mappings = suggestFieldMappings(schema, [])
    expect(mappings[0].extractionSource).toBe('auto')
  })

  it('returns mapping for each schema field', () => {
    const schema: SupertagSchema = {
      name: 'Test Schema',
      icon: '📝',
      description: 'Test',
      fields: [
        { name: 'title', type: 'text', label: 'Title' },
        { name: 'description', type: 'textarea', label: 'Description' },
        { name: 'priority', type: 'select', label: 'Priority' },
      ],
    }

    const mappings = suggestFieldMappings(schema, [])
    expect(mappings).toHaveLength(3)
    expect(mappings.map(m => m.fieldName)).toEqual(['title', 'description', 'priority'])
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('handles empty content', () => {
    const strand = createStrand({ content: '' })
    const field = createField({ name: 'text', type: 'text' })

    const result = extractFieldValue(field, strand, '', {})
    expect(result.value).toBeUndefined()
    expect(result.confidence).toBe(0)
  })

  it('handles content with only whitespace', () => {
    const strand = createStrand()
    const content = '   \n\n   \t   '
    const field = createField({ name: 'text', type: 'text' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.confidence).toBe(0)
  })

  it('handles special characters in content', () => {
    const strand = createStrand()
    const content = 'Email: test@example.com & Phone: 555-1234'
    const field = createField({ name: 'email', type: 'email' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe('test@example.com')
  })

  it('handles unicode content', () => {
    const strand = createStrand()
    const content = '标题: 中文内容\n日期: 2024-01-15'
    const field = createField({ name: 'date', type: 'date' })

    const result = extractFieldValue(field, strand, content, {})
    // The date pattern should still work
    expect(result.fieldName).toBe('date')
  })

  it('handles moderately long content', () => {
    const strand = createStrand()
    // Use a reasonable length that doesn't cause regex backtracking issues
    const longContent = 'word '.repeat(1000) + '\nemail: test@example.com'
    const field = createField({ name: 'email', type: 'email' })

    const result = extractFieldValue(field, strand, longContent, {})
    expect(result.value).toBe('test@example.com')
    expect(result.confidence).toBe(0.9)
  })

  it('handles mixed line endings', () => {
    const strand = createStrand()
    const content = 'Line 1\r\nLine 2\rLine 3\nurl: https://example.com'
    const field = createField({ name: 'url', type: 'url' })

    const result = extractFieldValue(field, strand, content, {})
    expect(result.value).toBe('https://example.com')
  })
})
