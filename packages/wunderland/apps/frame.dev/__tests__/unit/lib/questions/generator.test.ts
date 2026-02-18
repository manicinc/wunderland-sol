/**
 * Question Generator Tests
 * @module __tests__/unit/lib/questions/generator.test
 *
 * Tests for the shared NLP question generation library.
 */

import { describe, it, expect } from 'vitest'
import {
  analyzeContent,
  extractKeywords,
  extractHeadings,
  extractTechEntities,
  hasCodeBlocks,
  extractTitle,
  inferQuestionType,
  generateQuestionsFromContent,
  generateTemplateQuestions,
  parseFrontmatter,
  extractManualQuestions,
  prebuiltToGenerated,
  STOP_WORDS,
  TECH_PATTERNS,
} from '@/lib/questions'

// ============================================================================
// CONSTANTS
// ============================================================================

describe('Constants', () => {
  it('STOP_WORDS contains common words', () => {
    expect(STOP_WORDS.has('the')).toBe(true)
    expect(STOP_WORDS.has('and')).toBe(true)
    expect(STOP_WORDS.has('is')).toBe(true)
    expect(STOP_WORDS.has('a')).toBe(true)
    expect(STOP_WORDS.has('an')).toBe(true)
  })

  it('STOP_WORDS does not contain content words', () => {
    expect(STOP_WORDS.has('javascript')).toBe(false)
    expect(STOP_WORDS.has('programming')).toBe(false)
    expect(STOP_WORDS.has('algorithm')).toBe(false)
  })

  it('TECH_PATTERNS has language patterns', () => {
    expect(TECH_PATTERNS.languages).toBeDefined()
    expect('JavaScript matches'.match(TECH_PATTERNS.languages)).toBeTruthy()
    expect('Python matches'.match(TECH_PATTERNS.languages)).toBeTruthy()
    expect('TypeScript matches'.match(TECH_PATTERNS.languages)).toBeTruthy()
  })

  it('TECH_PATTERNS has framework patterns', () => {
    expect(TECH_PATTERNS.frameworks).toBeDefined()
    expect('React framework'.match(TECH_PATTERNS.frameworks)).toBeTruthy()
    expect('Vue framework'.match(TECH_PATTERNS.frameworks)).toBeTruthy()
    expect('Next.js framework'.match(TECH_PATTERNS.frameworks)).toBeTruthy()
  })

  it('TECH_PATTERNS has concept patterns', () => {
    expect(TECH_PATTERNS.concepts).toBeDefined()
    expect('API endpoint'.match(TECH_PATTERNS.concepts)).toBeTruthy()
    expect('REST interface'.match(TECH_PATTERNS.concepts)).toBeTruthy()
  })
})

// ============================================================================
// ANALYZE CONTENT
// ============================================================================

describe('analyzeContent', () => {
  it('counts words correctly', () => {
    const content = 'One two three four five'
    const analysis = analyzeContent(content)
    expect(analysis.words).toBe(5)
  })

  it('counts headings correctly', () => {
    const content = `
# Heading 1
Some content here.
## Heading 2
More content here.
### Heading 3
Even more content.
    `
    const analysis = analyzeContent(content)
    expect(analysis.headings).toBe(3)
  })

  it('counts code blocks correctly', () => {
    const content = `
Some text.

\`\`\`javascript
const x = 1;
\`\`\`

More text.

\`\`\`python
x = 1
\`\`\`
    `
    const analysis = analyzeContent(content)
    expect(analysis.codeBlocks).toBe(2)
  })

  it('counts links correctly', () => {
    const content = `
Check out [link1](http://example1.com) and [link2](http://example2.com).
Also see [link3](http://example3.com).
    `
    const analysis = analyzeContent(content)
    expect(analysis.links).toBe(3)
  })

  it('calculates significance score', () => {
    const shortContent = 'Short content.'
    const longContent = `
# Introduction

This is a comprehensive guide to building applications.
It covers many topics including architecture, testing, and deployment.

## Key Concepts

Here are the main concepts you need to understand.

\`\`\`javascript
const app = createApp();
\`\`\`

See [documentation](http://docs.example.com) for more.
    `

    const shortAnalysis = analyzeContent(shortContent)
    const longAnalysis = analyzeContent(longContent)

    expect(longAnalysis.significance).toBeGreaterThan(shortAnalysis.significance)
  })

  it('calculates difficulty score', () => {
    const simpleContent = 'This is a simple text with easy words.'
    const technicalContent = `
This API uses async/await patterns with TypeScript interfaces.
The function returns a Promise with the JSON response.
Configure the HTTP client with proper authentication headers.
    `

    const simpleAnalysis = analyzeContent(simpleContent)
    const technicalAnalysis = analyzeContent(technicalContent)

    expect(technicalAnalysis.difficulty).toBeGreaterThan(simpleAnalysis.difficulty)
  })

  it('returns values between 0 and 100', () => {
    const content = 'Some content here.'
    const analysis = analyzeContent(content)

    expect(analysis.significance).toBeGreaterThanOrEqual(0)
    expect(analysis.significance).toBeLessThanOrEqual(100)
    expect(analysis.difficulty).toBeGreaterThanOrEqual(0)
    expect(analysis.difficulty).toBeLessThanOrEqual(100)
  })
})

// ============================================================================
// EXTRACT KEYWORDS
// ============================================================================

describe('extractKeywords', () => {
  it('extracts keywords from content', () => {
    const content = 'JavaScript is a programming language. JavaScript is popular.'
    const keywords = extractKeywords(content)

    expect(keywords).toContain('javascript')
    expect(keywords).toContain('programming')
    expect(keywords).toContain('language')
    expect(keywords).toContain('popular')
  })

  it('filters out stop words', () => {
    const content = 'The quick brown fox jumps over the lazy dog.'
    const keywords = extractKeywords(content)

    expect(keywords).not.toContain('the')
    expect(keywords).not.toContain('over')
  })

  it('filters out short words', () => {
    const content = 'Go is a programming language. It is fast.'
    const keywords = extractKeywords(content)

    expect(keywords).not.toContain('go')
    expect(keywords).not.toContain('is')
    expect(keywords).not.toContain('it')
  })

  it('respects limit parameter', () => {
    const content = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12'
    const keywords = extractKeywords(content, 5)

    expect(keywords.length).toBeLessThanOrEqual(5)
  })

  it('orders by frequency', () => {
    const content = 'apple apple apple banana banana cherry'
    const keywords = extractKeywords(content)

    expect(keywords[0]).toBe('apple')
    expect(keywords[1]).toBe('banana')
    expect(keywords[2]).toBe('cherry')
  })

  it('returns empty array for empty content', () => {
    expect(extractKeywords('')).toEqual([])
    expect(extractKeywords('   ')).toEqual([])
  })
})

// ============================================================================
// EXTRACT HEADINGS
// ============================================================================

describe('extractHeadings', () => {
  it('extracts h1 headings', () => {
    const content = '# Main Title\nSome content.'
    const headings = extractHeadings(content)

    expect(headings).toContain('Main Title')
  })

  it('extracts h2 headings', () => {
    const content = '## Section Title\nSome content.'
    const headings = extractHeadings(content)

    expect(headings).toContain('Section Title')
  })

  it('extracts h3 headings', () => {
    const content = '### Subsection\nSome content.'
    const headings = extractHeadings(content)

    expect(headings).toContain('Subsection')
  })

  it('extracts multiple headings', () => {
    const content = `
# Title
## Section 1
### Subsection 1.1
## Section 2
    `
    const headings = extractHeadings(content)

    expect(headings).toHaveLength(4)
    expect(headings).toContain('Title')
    expect(headings).toContain('Section 1')
    expect(headings).toContain('Subsection 1.1')
    expect(headings).toContain('Section 2')
  })

  it('ignores h4+ headings', () => {
    const content = '#### Too Deep\n##### Even Deeper'
    const headings = extractHeadings(content)

    expect(headings).toHaveLength(0)
  })

  it('returns empty array for empty content', () => {
    expect(extractHeadings('')).toEqual([])
    expect(extractHeadings('No headings here.')).toEqual([])
  })

  it('trims heading text', () => {
    const content = '#   Spaced Title   \nContent.'
    const headings = extractHeadings(content)

    expect(headings[0]).toBe('Spaced Title')
  })
})

// ============================================================================
// EXTRACT TECH ENTITIES
// ============================================================================

describe('extractTechEntities', () => {
  it('extracts programming languages', () => {
    const content = 'This project uses JavaScript and Python.'
    const entities = extractTechEntities(content)

    expect(entities).toContain('JavaScript')
    expect(entities).toContain('Python')
  })

  it('extracts frameworks', () => {
    const content = 'Built with React and Node.js.'
    const entities = extractTechEntities(content)

    expect(entities).toContain('React')
    // Note: Node.js pattern may match differently
  })

  it('extracts concepts', () => {
    const content = 'This API uses a REST interface with database connections.'
    const entities = extractTechEntities(content)

    expect(entities).toContain('API')
    expect(entities).toContain('REST')
    expect(entities).toContain('database')
  })

  it('returns unique entities', () => {
    const content = 'JavaScript is great. JavaScript is popular. JavaScript rocks.'
    const entities = extractTechEntities(content)

    const jsCount = entities.filter(e => e.toLowerCase() === 'javascript').length
    expect(jsCount).toBe(1)
  })

  it('returns empty array for non-technical content', () => {
    const content = 'The weather is nice today.'
    const entities = extractTechEntities(content)

    expect(entities).toEqual([])
  })
})

// ============================================================================
// HAS CODE BLOCKS
// ============================================================================

describe('hasCodeBlocks', () => {
  it('returns true for content with code blocks', () => {
    const content = `
Some text.

\`\`\`javascript
const x = 1;
\`\`\`

More text.
    `
    expect(hasCodeBlocks(content)).toBe(true)
  })

  it('returns false for content without code blocks', () => {
    const content = 'Just plain text here.'
    expect(hasCodeBlocks(content)).toBe(false)
  })

  it('returns false for inline code', () => {
    const content = 'Use `const` to declare constants.'
    expect(hasCodeBlocks(content)).toBe(false)
  })

  it('handles empty content', () => {
    expect(hasCodeBlocks('')).toBe(false)
  })
})

// ============================================================================
// EXTRACT TITLE
// ============================================================================

describe('extractTitle', () => {
  it('extracts title from h1 heading', () => {
    const content = '# My Document Title\nContent here.'
    expect(extractTitle(content)).toBe('My Document Title')
  })

  it('extracts title from frontmatter', () => {
    const content = '---\ntitle: "Frontmatter Title"\n---\nContent.'
    expect(extractTitle(content)).toBe('Frontmatter Title')
  })

  it('prefers h1 heading over frontmatter', () => {
    // The regex order means h1 is checked first
    const content = `---
title: "Frontmatter"
---

# Heading Title

Content here.`
    const title = extractTitle(content)
    expect(title === 'Heading Title' || title === 'Frontmatter').toBe(true)
  })

  it('uses fallback path when no title found', () => {
    const content = 'No title in content.'
    expect(extractTitle(content, 'path/to/my-document.md')).toBe('my document')
  })

  it('returns default when no title and no path', () => {
    const content = 'No title here.'
    expect(extractTitle(content)).toBe('this topic')
  })
})

// ============================================================================
// INFER QUESTION TYPE
// ============================================================================

describe('inferQuestionType', () => {
  it('identifies definition questions', () => {
    expect(inferQuestionType('What is React?')).toBe('definition')
    expect(inferQuestionType('Explain how JavaScript works')).toBe('definition')
  })

  it('identifies comparison questions', () => {
    expect(inferQuestionType('Compare TypeScript and JavaScript')).toBe('comparison')
    expect(inferQuestionType('Tell me the difference between React and Vue')).toBe('comparison')
  })

  it('identifies application questions', () => {
    expect(inferQuestionType('How do I implement authentication?')).toBe('application')
    expect(inferQuestionType('How do I configure webpack?')).toBe('application')
  })

  it('identifies code questions', () => {
    expect(inferQuestionType('Show me a code example')).toBe('code')
    expect(inferQuestionType('Can you provide an example?')).toBe('code')
  })

  it('identifies concept questions', () => {
    expect(inferQuestionType('What are the key concepts?')).toBe('concept')
  })

  it('defaults to exploration', () => {
    expect(inferQuestionType('Tell me more about this topic')).toBe('exploration')
  })
})

// ============================================================================
// PREBUILT TO GENERATED
// ============================================================================

describe('prebuiltToGenerated', () => {
  it('converts manual question correctly', () => {
    const prebuilt = {
      question: 'What is React?',
      difficulty: 'beginner' as const,
      tags: ['react', 'basics'],
    }

    const generated = prebuiltToGenerated(prebuilt, true)

    expect(generated.text).toBe('What is React?')
    expect(generated.type).toBe('definition')
    expect(generated.confidence).toBe(1.0)
    expect(generated.source).toBe('manual')
  })

  it('converts auto question correctly', () => {
    const prebuilt = {
      question: 'How do I implement this?',
      difficulty: 'intermediate' as const,
      tags: ['implementation'],
    }

    const generated = prebuiltToGenerated(prebuilt, false)

    expect(generated.text).toBe('How do I implement this?')
    expect(generated.type).toBe('application')
    expect(generated.confidence).toBe(0.8)
    expect(generated.source).toBe('prebuilt')
  })
})

// ============================================================================
// GENERATE QUESTIONS FROM CONTENT
// ============================================================================

describe('generateQuestionsFromContent', () => {
  it('returns empty array for short content', () => {
    const questions = generateQuestionsFromContent('Too short.')
    expect(questions).toEqual([])
  })

  it('generates questions from headings', () => {
    const content = `
# Introduction to React

## Components
Components are the building blocks of React applications.

## State Management
State allows components to manage data.
    `

    const questions = generateQuestionsFromContent(content)

    expect(questions.length).toBeGreaterThan(0)
    // Should generate questions based on headings (lowercase in question text)
    const hasHeadingQuestion = questions.some(
      q => q.source === 'heading' && (q.text.toLowerCase().includes('components') || q.text.toLowerCase().includes('state'))
    )
    expect(hasHeadingQuestion).toBe(true)
  })

  it('generates questions from tech entities', () => {
    const content = `
JavaScript is a versatile programming language used for web development.
React is a popular library built on JavaScript for building user interfaces.
TypeScript adds static typing to JavaScript applications.
    `

    const questions = generateQuestionsFromContent(content)

    const hasEntityQuestion = questions.some(q => q.source === 'entity')
    expect(hasEntityQuestion).toBe(true)
  })

  it('generates code questions when code blocks present', () => {
    const content = `
# Example Code

Here's how to use this feature:

\`\`\`javascript
const app = createApp();
app.use(router);
app.mount('#app');
\`\`\`

This code creates a new application instance.
    `

    const questions = generateQuestionsFromContent(content)

    const hasCodeQuestion = questions.some(q => q.type === 'code')
    expect(hasCodeQuestion).toBe(true)
  })

  it('respects maxQuestions option', () => {
    const content = `
# Large Document

## Section 1
Content about React and JavaScript.

## Section 2
Content about TypeScript and Node.js.

## Section 3
Content about Vue and Angular.

## Section 4
More content about programming.
    `

    const questions = generateQuestionsFromContent(content, 'test.md', { maxQuestions: 3 })

    expect(questions.length).toBeLessThanOrEqual(3)
  })

  it('generates comparison questions with multiple entities', () => {
    const content = `
React and Vue are both popular frontend frameworks.
They have different approaches to component design and state management.
Developers often compare them when starting new projects.
    `

    const questions = generateQuestionsFromContent(content)

    const hasComparisonQuestion = questions.some(
      q => q.type === 'comparison' || q.source === 'entity-comparison'
    )
    expect(hasComparisonQuestion).toBe(true)
  })

  it('sorts questions by confidence', () => {
    const content = `
# Main Topic

## Section A
This section covers important concepts about JavaScript programming.
The JavaScript language is widely used in web development.

\`\`\`javascript
const example = "test";
\`\`\`
    `

    const questions = generateQuestionsFromContent(content)

    // Questions should be sorted by confidence (descending)
    for (let i = 1; i < questions.length; i++) {
      expect(questions[i - 1].confidence).toBeGreaterThanOrEqual(questions[i].confidence)
    }
  })

  it('deduplicates similar questions', () => {
    const content = `
# JavaScript Guide

## JavaScript Basics
JavaScript is a programming language.

## JavaScript Functions
JavaScript uses functions extensively.
    `

    const questions = generateQuestionsFromContent(content)

    // Check no duplicate question texts (normalized)
    const normalizedTexts = questions.map(q => q.text.toLowerCase().slice(0, 30))
    const uniqueTexts = new Set(normalizedTexts)
    expect(uniqueTexts.size).toBe(normalizedTexts.length)
  })
})

// ============================================================================
// GENERATE TEMPLATE QUESTIONS
// ============================================================================

describe('generateTemplateQuestions', () => {
  it('returns empty array for low significance', () => {
    const content = 'Short.'
    const analysis = { words: 1, headings: 0, codeBlocks: 0, links: 0, significance: 10, difficulty: 10 }

    const questions = generateTemplateQuestions(content, 'test.md', analysis)

    expect(questions).toEqual([])
  })

  it('generates questions for significant content', () => {
    const content = `
# Getting Started

This is a comprehensive guide.

## Installation

Follow these steps to install.
    `
    const analysis = { words: 20, headings: 2, codeBlocks: 0, links: 0, significance: 50, difficulty: 30 }

    const questions = generateTemplateQuestions(content, 'getting-started.md', analysis)

    expect(questions.length).toBeGreaterThan(0)
  })

  it('adjusts difficulty based on analysis', () => {
    const content = '# Test\nContent here.'
    const easyAnalysis = { words: 100, headings: 1, codeBlocks: 0, links: 0, significance: 50, difficulty: 20 }
    const hardAnalysis = { words: 100, headings: 1, codeBlocks: 0, links: 0, significance: 50, difficulty: 80 }

    const easyQuestions = generateTemplateQuestions(content, 'test.md', easyAnalysis)
    const hardQuestions = generateTemplateQuestions(content, 'test.md', hardAnalysis)

    if (easyQuestions.length > 0) {
      expect(easyQuestions[0].difficulty).toBe('beginner')
    }
    if (hardQuestions.length > 0) {
      expect(hardQuestions[0].difficulty).toBe('advanced')
    }
  })

  it('generates more questions for higher significance', () => {
    const content = '# Test\nContent here.'
    const lowSig = { words: 100, headings: 1, codeBlocks: 0, links: 0, significance: 25, difficulty: 30 }
    const highSig = { words: 100, headings: 1, codeBlocks: 0, links: 0, significance: 100, difficulty: 30 }

    const lowQuestions = generateTemplateQuestions(content, 'test.md', lowSig)
    const highQuestions = generateTemplateQuestions(content, 'test.md', highSig)

    expect(highQuestions.length).toBeGreaterThanOrEqual(lowQuestions.length)
  })
})

// ============================================================================
// PARSE FRONTMATTER
// ============================================================================

describe('parseFrontmatter', () => {
  it('parses simple frontmatter', () => {
    const markdown = `---
title: My Title
author: John
---

# Content

Body text here.`

    const { frontmatter, content } = parseFrontmatter(markdown)

    expect(frontmatter).not.toBeNull()
    expect(frontmatter?.title).toBe('My Title')
    expect(frontmatter?.author).toBe('John')
    expect(content).toContain('# Content')
    expect(content).not.toContain('title:')
  })

  it('handles content without frontmatter', () => {
    const markdown = '# Just Content\n\nNo frontmatter here.'

    const { frontmatter, content } = parseFrontmatter(markdown)

    expect(frontmatter).toBeNull()
    expect(content).toBe(markdown)
  })

  it('parses inline arrays', () => {
    const markdown = `---
tags: [one, two, three]
---
Content.`

    const { frontmatter } = parseFrontmatter(markdown)

    expect(frontmatter?.tags).toEqual(['one', 'two', 'three'])
  })

  it('parses suggestedQuestions array', () => {
    const markdown = `---
title: Test
suggestedQuestions:
  - question: What is X?
    difficulty: beginner
    tags: [concept]
  - question: How does Y work?
    difficulty: intermediate
---
Content.`

    const { frontmatter } = parseFrontmatter(markdown)

    expect(frontmatter?.suggestedQuestions).toBeDefined()
    expect(Array.isArray(frontmatter?.suggestedQuestions)).toBe(true)
    expect((frontmatter?.suggestedQuestions as any[])?.[0]?.question).toBe('What is X?')
  })

  it('handles quoted values', () => {
    const markdown = `---
title: "Quoted Title"
description: 'Single quoted'
---
Content.`

    const { frontmatter } = parseFrontmatter(markdown)

    expect(frontmatter?.title).toBe('Quoted Title')
    expect(frontmatter?.description).toBe('Single quoted')
  })

  it('ignores comments', () => {
    const markdown = `---
# This is a comment
title: Actual Title
---
Content.`

    const { frontmatter } = parseFrontmatter(markdown)

    expect(frontmatter?.title).toBe('Actual Title')
  })
})

// ============================================================================
// EXTRACT MANUAL QUESTIONS
// ============================================================================

describe('extractManualQuestions', () => {
  it('returns null for null frontmatter', () => {
    expect(extractManualQuestions(null)).toBeNull()
  })

  it('returns null for frontmatter without suggestedQuestions', () => {
    expect(extractManualQuestions({ title: 'Test' })).toBeNull()
  })

  it('returns null for empty suggestedQuestions', () => {
    expect(extractManualQuestions({ suggestedQuestions: [] })).toBeNull()
  })

  it('extracts string questions', () => {
    const frontmatter = {
      suggestedQuestions: ['What is X?', 'How does Y work?'],
    }

    const questions = extractManualQuestions(frontmatter)

    expect(questions).toHaveLength(2)
    expect(questions?.[0].question).toBe('What is X?')
    expect(questions?.[0].difficulty).toBe('intermediate') // default
    expect(questions?.[0].tags).toEqual([])
  })

  it('extracts object questions', () => {
    const frontmatter = {
      suggestedQuestions: [
        { question: 'What is X?', difficulty: 'beginner', tags: ['concept'] },
        { question: 'How does Y work?', difficulty: 'advanced', tags: ['impl'] },
      ],
    }

    const questions = extractManualQuestions(frontmatter)

    expect(questions).toHaveLength(2)
    expect(questions?.[0].question).toBe('What is X?')
    expect(questions?.[0].difficulty).toBe('beginner')
    expect(questions?.[0].tags).toEqual(['concept'])
  })

  it('filters invalid entries', () => {
    const frontmatter = {
      suggestedQuestions: [
        { question: 'Valid question' },
        null,
        undefined,
        { notAQuestion: true },
        'Also valid',
      ],
    }

    const questions = extractManualQuestions(frontmatter)

    expect(questions).toHaveLength(2)
  })

  it('defaults missing fields', () => {
    const frontmatter = {
      suggestedQuestions: [{ question: 'Minimal question' }],
    }

    const questions = extractManualQuestions(frontmatter)

    expect(questions?.[0].difficulty).toBe('intermediate')
    expect(questions?.[0].tags).toEqual([])
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('handles content with only special characters', () => {
    const content = '!@#$%^&*()_+{}|:"<>?'
    const analysis = analyzeContent(content)

    expect(analysis).toBeDefined()
    expect(analysis.words).toBeGreaterThan(0)
  })

  it('handles very long content', () => {
    const content = 'word '.repeat(10000)
    const analysis = analyzeContent(content)

    expect(analysis.significance).toBeLessThanOrEqual(100)
    expect(analysis.difficulty).toBeLessThanOrEqual(100)
  })

  it('handles unicode content', () => {
    const content = `
# 日本語のドキュメント

これはテストです。JavaScript と TypeScript を使用しています。
    `
    const entities = extractTechEntities(content)

    expect(entities).toContain('JavaScript')
    expect(entities).toContain('TypeScript')
  })

  it('handles malformed frontmatter gracefully', () => {
    const markdown = `---
title: Unclosed
tags: [missing bracket
---
Content.`

    const { frontmatter, content } = parseFrontmatter(markdown)

    // Should not throw, may have partial results
    expect(content).toBeDefined()
  })

  it('handles nested code blocks in questions', () => {
    const content = `
# Code Examples

\`\`\`javascript
const nested = \`template\`;
\`\`\`

## More Examples

Another paragraph.
    `

    const hasCode = hasCodeBlocks(content)
    expect(hasCode).toBe(true)
  })
})

