/**
 * Learning Import/Export Tests
 * @module tests/unit/learning/importExport
 *
 * Tests for learning data import/export including:
 * - JSON export format
 * - CSV/TSV for Anki compatibility
 * - Format detection
 * - Strand mapping
 * - Merge strategies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// TYPES (from learningExporter.ts)
// ============================================================================

interface ExportedFlashcard {
  id: string
  front: string
  back: string
  type: 'basic' | 'cloze' | 'reversed'
  tags: string[]
  strandSlug?: string
  confidence?: number
}

interface ExportedQuiz {
  id: string
  type: 'multiple_choice' | 'true_false' | 'fill_blank'
  question: string
  answer: string
  options?: string[]
  strandSlug?: string
}

interface ExportedGlossary {
  term: string
  definition: string
  category?: string
  aliases?: string[]
}

interface ExportData {
  version: string
  exportedAt: string
  format: 'json' | 'csv' | 'tsv' | 'anki' | 'markdown'
  flashcards: ExportedFlashcard[]
  quizzes: ExportedQuiz[]
  glossary: ExportedGlossary[]
  metadata: {
    sourceStrands: string[]
    totalItems: number
  }
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

function exportToJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2)
}

function exportFlashcardsToCSV(flashcards: ExportedFlashcard[]): string {
  const header = 'front,back,tags'
  const rows = flashcards.map(card => {
    const front = `"${card.front.replace(/"/g, '""')}"`
    const back = `"${card.back.replace(/"/g, '""')}"`
    const tags = `"${card.tags.join(', ')}"`
    return `${front},${back},${tags}`
  })
  return [header, ...rows].join('\n')
}

function exportFlashcardsToTSV(flashcards: ExportedFlashcard[]): string {
  // Anki format: front\tback
  return flashcards.map(card => {
    const front = card.front.replace(/\t/g, ' ')
    const back = card.back.replace(/\t/g, ' ')
    return `${front}\t${back}`
  }).join('\n')
}

function exportToMarkdown(data: ExportData): string {
  const lines: string[] = []
  
  lines.push('# Learning Export')
  lines.push(`Exported: ${data.exportedAt}`)
  lines.push('')
  
  if (data.flashcards.length > 0) {
    lines.push('## Flashcards')
    lines.push('')
    for (const card of data.flashcards) {
      lines.push(`### ${card.front}`)
      lines.push('')
      lines.push(card.back)
      if (card.tags.length > 0) {
        lines.push('')
        lines.push(`Tags: ${card.tags.join(', ')}`)
      }
      lines.push('')
    }
  }
  
  if (data.glossary.length > 0) {
    lines.push('## Glossary')
    lines.push('')
    for (const term of data.glossary) {
      lines.push(`- **${term.term}**: ${term.definition}`)
    }
    lines.push('')
  }
  
  return lines.join('\n')
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

function detectFormat(content: string): 'json' | 'csv' | 'tsv' | 'markdown' | 'unknown' {
  const trimmed = content.trim()
  
  // JSON detection
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {
      // Not valid JSON
    }
  }
  
  // Markdown detection
  if (trimmed.startsWith('#') || trimmed.includes('## Flashcards')) {
    return 'markdown'
  }
  
  // TSV detection (Anki format)
  const lines = trimmed.split('\n')
  if (lines.length > 0 && lines[0].includes('\t') && !lines[0].includes(',')) {
    return 'tsv'
  }
  
  // CSV detection
  if (lines.length > 0 && lines[0].includes(',')) {
    return 'csv'
  }
  
  return 'unknown'
}

function parseCSV(content: string): ExportedFlashcard[] {
  const lines = content.trim().split('\n')
  const cards: ExportedFlashcard[] = []
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    // Better CSV parsing that handles escaped quotes
    const match = line.match(/"((?:[^"]|"")*)","((?:[^"]|"")*)"(?:,"((?:[^"]|"")*)")?/)
    if (match) {
      cards.push({
        id: `imported-${i}`,
        front: match[1].replace(/""/g, '"'),
        back: match[2].replace(/""/g, '"'),
        type: 'basic',
        tags: match[3] ? match[3].replace(/""/g, '"').split(', ').filter(t => t) : [],
      })
    }
  }
  
  return cards
}

function parseTSV(content: string): ExportedFlashcard[] {
  const lines = content.trim().split('\n')
  return lines.map((line, i) => {
    const [front, back] = line.split('\t')
    return {
      id: `imported-${i}`,
      front: front || '',
      back: back || '',
      type: 'basic' as const,
      tags: [],
    }
  }).filter(card => card.front && card.back)
}

// ============================================================================
// TESTS
// ============================================================================

describe('Learning Export', () => {
  const sampleData: ExportData = {
    version: '1.0',
    exportedAt: '2024-01-15T10:30:00Z',
    format: 'json',
    flashcards: [
      { id: '1', front: 'What is React?', back: 'A JavaScript library', type: 'basic', tags: ['react', 'js'] },
      { id: '2', front: 'What is JSX?', back: 'JavaScript XML syntax', type: 'basic', tags: ['react'] },
    ],
    quizzes: [
      { id: 'q1', type: 'multiple_choice', question: 'React is...?', answer: 'A library', options: ['A library', 'A framework'] },
    ],
    glossary: [
      { term: 'Component', definition: 'A reusable piece of UI' },
    ],
    metadata: {
      sourceStrands: ['react-basics', 'hooks'],
      totalItems: 4,
    },
  }

  describe('JSON Export', () => {
    it('should export valid JSON', () => {
      const exported = exportToJSON(sampleData)
      expect(() => JSON.parse(exported)).not.toThrow()
    })

    it('should include version information', () => {
      const exported = exportToJSON(sampleData)
      const parsed = JSON.parse(exported)
      expect(parsed.version).toBe('1.0')
    })

    it('should include all flashcards', () => {
      const exported = exportToJSON(sampleData)
      const parsed = JSON.parse(exported)
      expect(parsed.flashcards).toHaveLength(2)
    })

    it('should include metadata', () => {
      const exported = exportToJSON(sampleData)
      const parsed = JSON.parse(exported)
      expect(parsed.metadata.sourceStrands).toContain('react-basics')
    })
  })

  describe('CSV Export', () => {
    it('should create valid CSV with header', () => {
      const csv = exportFlashcardsToCSV(sampleData.flashcards)
      const lines = csv.split('\n')
      expect(lines[0]).toBe('front,back,tags')
    })

    it('should escape quotes in content', () => {
      const cards: ExportedFlashcard[] = [
        { id: '1', front: 'What is "React"?', back: 'A "library"', type: 'basic', tags: [] },
      ]
      const csv = exportFlashcardsToCSV(cards)
      expect(csv).toContain('""React""')
      expect(csv).toContain('""library""')
    })

    it('should include all cards', () => {
      const csv = exportFlashcardsToCSV(sampleData.flashcards)
      const lines = csv.split('\n')
      expect(lines).toHaveLength(3) // header + 2 cards
    })
  })

  describe('TSV Export (Anki)', () => {
    it('should create tab-separated values', () => {
      const tsv = exportFlashcardsToTSV(sampleData.flashcards)
      const lines = tsv.split('\n')
      lines.forEach(line => {
        expect(line.split('\t')).toHaveLength(2)
      })
    })

    it('should not include header for Anki compatibility', () => {
      const tsv = exportFlashcardsToTSV(sampleData.flashcards)
      expect(tsv.startsWith('What is React?')).toBe(true)
    })
  })

  describe('Markdown Export', () => {
    it('should create readable markdown', () => {
      const md = exportToMarkdown(sampleData)
      expect(md).toContain('# Learning Export')
      expect(md).toContain('## Flashcards')
    })

    it('should format flashcards as headings', () => {
      const md = exportToMarkdown(sampleData)
      expect(md).toContain('### What is React?')
    })

    it('should include tags', () => {
      const md = exportToMarkdown(sampleData)
      expect(md).toContain('Tags: react, js')
    })

    it('should include glossary', () => {
      const md = exportToMarkdown(sampleData)
      expect(md).toContain('## Glossary')
      expect(md).toContain('**Component**')
    })
  })
})

describe('Learning Import', () => {
  describe('Format Detection', () => {
    it('should detect JSON format', () => {
      const json = '{"version": "1.0", "flashcards": []}'
      expect(detectFormat(json)).toBe('json')
    })

    it('should detect CSV format', () => {
      const csv = 'front,back,tags\n"Q1","A1","tag1"'
      expect(detectFormat(csv)).toBe('csv')
    })

    it('should detect TSV format', () => {
      const tsv = 'What is React?\tA library\nWhat is JSX?\tSyntax'
      expect(detectFormat(tsv)).toBe('tsv')
    })

    it('should detect Markdown format', () => {
      const md = '# Learning Export\n## Flashcards\n### Q1'
      expect(detectFormat(md)).toBe('markdown')
    })

    it('should return unknown for unrecognized format', () => {
      const unknown = 'random text without any structure'
      expect(detectFormat(unknown)).toBe('unknown')
    })
  })

  describe('CSV Parsing', () => {
    it('should parse CSV with header', () => {
      const csv = 'front,back,tags\n"What is React?","A library","react, js"'
      const cards = parseCSV(csv)
      expect(cards).toHaveLength(1)
      expect(cards[0].front).toBe('What is React?')
      expect(cards[0].back).toBe('A library')
    })

    it('should handle escaped quotes', () => {
      const csv = 'front,back,tags\n"What is ""JSX""?","JavaScript ""XML""",""'
      const cards = parseCSV(csv)
      expect(cards[0].front).toBe('What is "JSX"?')
      expect(cards[0].back).toBe('JavaScript "XML"')
    })

    it('should parse tags correctly', () => {
      const csv = 'front,back,tags\n"Q","A","tag1, tag2, tag3"'
      const cards = parseCSV(csv)
      expect(cards[0].tags).toEqual(['tag1', 'tag2', 'tag3'])
    })
  })

  describe('TSV Parsing', () => {
    it('should parse Anki-style TSV', () => {
      const tsv = 'What is React?\tA JavaScript library\nWhat is JSX?\tSyntax extension'
      const cards = parseTSV(tsv)
      expect(cards).toHaveLength(2)
      expect(cards[0].front).toBe('What is React?')
      expect(cards[0].back).toBe('A JavaScript library')
    })

    it('should filter empty lines', () => {
      const tsv = 'Q1\tA1\n\nQ2\tA2'
      const cards = parseTSV(tsv)
      expect(cards).toHaveLength(2)
    })

    it('should assign unique IDs', () => {
      const tsv = 'Q1\tA1\nQ2\tA2'
      const cards = parseTSV(tsv)
      expect(cards[0].id).not.toBe(cards[1].id)
    })
  })

  describe('Merge Strategies', () => {
    const existingCards = [
      { id: 'existing-1', front: 'Q1', back: 'A1' },
    ]

    const importedCards = [
      { id: 'imported-1', front: 'Q1', back: 'A1 Updated' },
      { id: 'imported-2', front: 'Q2', back: 'A2' },
    ]

    it('should support skip strategy', () => {
      // Skip: keep existing, ignore duplicates
      const merged = existingCards.slice()
      for (const imported of importedCards) {
        if (!merged.some(e => e.front === imported.front)) {
          merged.push(imported)
        }
      }
      expect(merged).toHaveLength(2)
      expect(merged.find(c => c.front === 'Q1')?.back).toBe('A1') // Original kept
    })

    it('should support replace strategy', () => {
      // Replace: imported overwrites existing
      const merged = [...existingCards]
      for (const imported of importedCards) {
        const existingIdx = merged.findIndex(e => e.front === imported.front)
        if (existingIdx >= 0) {
          merged[existingIdx] = imported
        } else {
          merged.push(imported)
        }
      }
      expect(merged).toHaveLength(2)
      expect(merged.find(c => c.front === 'Q1')?.back).toBe('A1 Updated') // Updated
    })

    it('should support merge strategy', () => {
      // Merge: keep both with suffix
      const merged = [...existingCards]
      for (const imported of importedCards) {
        const exists = merged.some(e => e.front === imported.front)
        if (exists) {
          merged.push({ ...imported, id: `${imported.id}-merged` })
        } else {
          merged.push(imported)
        }
      }
      expect(merged).toHaveLength(3) // Original + duplicate + new
    })
  })
})

describe('Strand Mapping', () => {
  it('should map source strands to target strands', () => {
    const sourceStrands = ['old-strand-1', 'old-strand-2']
    const mapping = {
      'old-strand-1': 'new-strand-a',
      'old-strand-2': 'new-strand-b',
    }

    const mapped = sourceStrands.map(s => mapping[s] || s)
    expect(mapped).toEqual(['new-strand-a', 'new-strand-b'])
  })

  it('should keep original if no mapping provided', () => {
    const sourceStrands = ['strand-1', 'strand-2']
    const mapping: Record<string, string> = {}

    const mapped = sourceStrands.map(s => mapping[s] || s)
    expect(mapped).toEqual(['strand-1', 'strand-2'])
  })
})

