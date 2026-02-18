/**
 * Job Queue Types Tests
 * @module __tests__/unit/lib/jobs/types.test
 *
 * Tests for job queue type helpers and constants.
 */

import { describe, it, expect } from 'vitest'
import {
  generateJobId,
  isJobTerminal,
  isJobCancellable,
  getJobStatusColor,
  getJobStatusBgColor,
  JOB_TYPE_LABELS,
  JOB_TYPE_ICONS,
  type JobType,
  type JobStatus,
} from '@/lib/jobs/types'

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('Job Types Helpers', () => {
  describe('generateJobId', () => {
    it('generates a unique ID', () => {
      const id = generateJobId()
      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
    })

    it('starts with "job-" prefix', () => {
      const id = generateJobId()
      expect(id.startsWith('job-')).toBe(true)
    })

    it('generates unique IDs on successive calls', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(generateJobId())
      }
      expect(ids.size).toBe(100)
    })

    it('has reasonable length', () => {
      const id = generateJobId()
      // Should be "job-" + timestamp + "-" + random
      expect(id.length).toBeGreaterThan(10)
      expect(id.length).toBeLessThan(30)
    })
  })

  describe('isJobTerminal', () => {
    it('returns true for completed status', () => {
      expect(isJobTerminal('completed')).toBe(true)
    })

    it('returns true for failed status', () => {
      expect(isJobTerminal('failed')).toBe(true)
    })

    it('returns true for cancelled status', () => {
      expect(isJobTerminal('cancelled')).toBe(true)
    })

    it('returns false for pending status', () => {
      expect(isJobTerminal('pending')).toBe(false)
    })

    it('returns false for running status', () => {
      expect(isJobTerminal('running')).toBe(false)
    })
  })

  describe('isJobCancellable', () => {
    it('returns true for pending status', () => {
      expect(isJobCancellable('pending')).toBe(true)
    })

    it('returns true for running status', () => {
      expect(isJobCancellable('running')).toBe(true)
    })

    it('returns false for completed status', () => {
      expect(isJobCancellable('completed')).toBe(false)
    })

    it('returns false for failed status', () => {
      expect(isJobCancellable('failed')).toBe(false)
    })

    it('returns false for cancelled status', () => {
      expect(isJobCancellable('cancelled')).toBe(false)
    })
  })

  describe('getJobStatusColor', () => {
    const allStatuses: JobStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled']

    it('returns a string for all statuses', () => {
      allStatuses.forEach(status => {
        const color = getJobStatusColor(status)
        expect(typeof color).toBe('string')
        expect(color.length).toBeGreaterThan(0)
      })
    })

    it('returns text color classes', () => {
      allStatuses.forEach(status => {
        const color = getJobStatusColor(status)
        expect(color.startsWith('text-')).toBe(true)
      })
    })

    it('returns correct color for pending', () => {
      expect(getJobStatusColor('pending')).toBe('text-zinc-400')
    })

    it('returns correct color for running', () => {
      expect(getJobStatusColor('running')).toBe('text-blue-500')
    })

    it('returns correct color for completed', () => {
      expect(getJobStatusColor('completed')).toBe('text-emerald-500')
    })

    it('returns correct color for failed', () => {
      expect(getJobStatusColor('failed')).toBe('text-red-500')
    })

    it('returns correct color for cancelled', () => {
      expect(getJobStatusColor('cancelled')).toBe('text-amber-500')
    })
  })

  describe('getJobStatusBgColor', () => {
    const allStatuses: JobStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled']

    it('returns a string for all statuses', () => {
      allStatuses.forEach(status => {
        const color = getJobStatusBgColor(status)
        expect(typeof color).toBe('string')
        expect(color.length).toBeGreaterThan(0)
      })
    })

    it('returns bg color classes', () => {
      allStatuses.forEach(status => {
        const color = getJobStatusBgColor(status)
        expect(color.startsWith('bg-')).toBe(true)
      })
    })

    it('returns correct color for pending', () => {
      expect(getJobStatusBgColor('pending')).toBe('bg-zinc-500/20')
    })

    it('returns correct color for running', () => {
      expect(getJobStatusBgColor('running')).toBe('bg-blue-500/20')
    })

    it('returns correct color for completed', () => {
      expect(getJobStatusBgColor('completed')).toBe('bg-emerald-500/20')
    })

    it('returns correct color for failed', () => {
      expect(getJobStatusBgColor('failed')).toBe('bg-red-500/20')
    })

    it('returns correct color for cancelled', () => {
      expect(getJobStatusBgColor('cancelled')).toBe('bg-amber-500/20')
    })
  })
})

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Job Type Constants', () => {
  describe('JOB_TYPE_LABELS', () => {
    it('has labels for all job types', () => {
      const jobTypes: JobType[] = [
        'flashcard_generation',
        'glossary_generation',
        'quiz_generation',
        'rating_generation',
        'categorization',
        'reclassify-taxonomy',
        'block-tagging',
        'bulk-block-tagging',
        'reindex-strand',
        'reindex-blocks',
        'refresh-backlinks',
        'publish-strand',
        'publish-project',
        'import-obsidian',
        'import-notion',
        'import-google-docs',
        'import-markdown',
        'import-json',
        'import-github',
        'import-evernote',
        'export-pdf',
        'export-docx',
        'export-markdown',
        'export-json',
      ]

      jobTypes.forEach(type => {
        expect(JOB_TYPE_LABELS[type]).toBeDefined()
        expect(typeof JOB_TYPE_LABELS[type]).toBe('string')
        expect(JOB_TYPE_LABELS[type].length).toBeGreaterThan(0)
      })
    })

    it('has human-readable labels', () => {
      expect(JOB_TYPE_LABELS.flashcard_generation).toBe('Flashcard Generation')
      expect(JOB_TYPE_LABELS.glossary_generation).toBe('Glossary Generation')
      expect(JOB_TYPE_LABELS.categorization).toBe('Categorization')
    })

    it('has labels for import jobs', () => {
      expect(JOB_TYPE_LABELS['import-obsidian']).toBe('Obsidian Import')
      expect(JOB_TYPE_LABELS['import-notion']).toBe('Notion Import')
      expect(JOB_TYPE_LABELS['import-github']).toBe('GitHub Import')
      expect(JOB_TYPE_LABELS['import-evernote']).toBe('Evernote Import')
    })

    it('has labels for export jobs', () => {
      expect(JOB_TYPE_LABELS['export-pdf']).toBe('PDF Export')
      expect(JOB_TYPE_LABELS['export-markdown']).toBe('Markdown Export')
    })
  })

  describe('JOB_TYPE_ICONS', () => {
    it('has icons for all job types', () => {
      const jobTypes: JobType[] = [
        'flashcard_generation',
        'glossary_generation',
        'quiz_generation',
        'rating_generation',
        'categorization',
        'reclassify-taxonomy',
        'block-tagging',
        'bulk-block-tagging',
        'reindex-strand',
        'reindex-blocks',
        'refresh-backlinks',
        'publish-strand',
        'publish-project',
        'import-obsidian',
        'import-notion',
        'import-google-docs',
        'import-markdown',
        'import-json',
        'import-github',
        'import-evernote',
        'export-pdf',
        'export-docx',
        'export-markdown',
        'export-json',
      ]

      jobTypes.forEach(type => {
        expect(JOB_TYPE_ICONS[type]).toBeDefined()
        expect(typeof JOB_TYPE_ICONS[type]).toBe('string')
        expect(JOB_TYPE_ICONS[type].length).toBeGreaterThan(0)
      })
    })

    it('has appropriate icons for different job categories', () => {
      // Generation jobs
      expect(JOB_TYPE_ICONS.flashcard_generation).toBe('Layers')
      expect(JOB_TYPE_ICONS.glossary_generation).toBe('BookOpen')

      // Import jobs use Upload icon
      expect(JOB_TYPE_ICONS['import-obsidian']).toBe('Upload')
      expect(JOB_TYPE_ICONS['import-notion']).toBe('Upload')

      // Export jobs use Download icon
      expect(JOB_TYPE_ICONS['export-pdf']).toBe('Download')
      expect(JOB_TYPE_ICONS['export-markdown']).toBe('Download')

      // GitHub specific icon
      expect(JOB_TYPE_ICONS['import-github']).toBe('Github')
    })
  })
})

// ============================================================================
// STATE TRANSITION TESTS
// ============================================================================

describe('Job Status Transitions', () => {
  it('terminal statuses are not cancellable', () => {
    const terminalStatuses: JobStatus[] = ['completed', 'failed', 'cancelled']

    terminalStatuses.forEach(status => {
      expect(isJobTerminal(status)).toBe(true)
      expect(isJobCancellable(status)).toBe(false)
    })
  })

  it('non-terminal statuses are cancellable', () => {
    const nonTerminalStatuses: JobStatus[] = ['pending', 'running']

    nonTerminalStatuses.forEach(status => {
      expect(isJobTerminal(status)).toBe(false)
      expect(isJobCancellable(status)).toBe(true)
    })
  })

  it('all statuses are covered by terminal + non-terminal', () => {
    const allStatuses: JobStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled']

    allStatuses.forEach(status => {
      const isTerminal = isJobTerminal(status)
      const isCancellable = isJobCancellable(status)
      // Every status should be either terminal or cancellable (XOR)
      expect(isTerminal !== isCancellable).toBe(true)
    })
  })
})

// ============================================================================
// GENERATE JOB ID FORMAT TESTS
// ============================================================================

describe('generateJobId format', () => {
  it('has correct format: job-{base36timestamp}-{random7chars}', () => {
    const id = generateJobId()
    // Pattern: job- + base36 timestamp + - + 7 random alphanumeric chars
    const pattern = /^job-[a-z0-9]+-[a-z0-9]{7}$/
    expect(id).toMatch(pattern)
  })

  it('contains timestamp component that parses to reasonable date', () => {
    const id = generateJobId()
    const timestampPart = id.split('-')[1]
    const parsed = parseInt(timestampPart, 36)

    // Should be within reasonable range (year 2020 to 2100 in ms)
    const year2020 = new Date('2020-01-01').getTime()
    const year2100 = new Date('2100-01-01').getTime()

    expect(parsed).toBeGreaterThan(year2020)
    expect(parsed).toBeLessThan(year2100)
  })

  it('timestamp component is monotonically increasing', async () => {
    const id1 = generateJobId()
    await new Promise(resolve => setTimeout(resolve, 5))
    const id2 = generateJobId()

    const ts1 = parseInt(id1.split('-')[1], 36)
    const ts2 = parseInt(id2.split('-')[1], 36)

    expect(ts2).toBeGreaterThanOrEqual(ts1)
  })

  it('random component has exactly 7 characters', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateJobId()
      const parts = id.split('-')
      const randomPart = parts[parts.length - 1]
      expect(randomPart.length).toBe(7)
    }
  })

  it('uses only lowercase letters and numbers (base36)', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateJobId()
      const body = id.slice(4) // Remove 'job-' prefix
      expect(body).toMatch(/^[a-z0-9-]+$/)
    }
  })
})

// ============================================================================
// COLOR CONSISTENCY TESTS
// ============================================================================

describe('Color consistency between text and background', () => {
  const allStatuses: JobStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled']

  it.each(allStatuses)('status "%s" uses matching color family for text and background', (status) => {
    const textColor = getJobStatusColor(status)
    const bgColor = getJobStatusBgColor(status)

    // Extract color name (e.g., 'zinc' from 'text-zinc-400')
    const textColorMatch = textColor.match(/^text-([a-z]+)-/)
    const bgColorMatch = bgColor.match(/^bg-([a-z]+)-/)

    expect(textColorMatch).not.toBeNull()
    expect(bgColorMatch).not.toBeNull()

    const textColorName = textColorMatch![1]
    const bgColorName = bgColorMatch![1]

    expect(textColorName).toBe(bgColorName)
  })

  it('all background colors have opacity modifier /20', () => {
    allStatuses.forEach(status => {
      const bgColor = getJobStatusBgColor(status)
      expect(bgColor).toContain('/20')
    })
  })

  it('text colors use 400 or 500 shade', () => {
    allStatuses.forEach(status => {
      const textColor = getJobStatusColor(status)
      expect(textColor).toMatch(/-[45]00$/)
    })
  })

  it('background colors use 500 shade with opacity', () => {
    allStatuses.forEach(status => {
      const bgColor = getJobStatusBgColor(status)
      expect(bgColor).toMatch(/-500\/20$/)
    })
  })
})

// ============================================================================
// SEMANTIC COLOR MEANING TESTS
// ============================================================================

describe('Semantic color meanings', () => {
  it('success state (completed) uses green family', () => {
    const color = getJobStatusColor('completed')
    expect(color).toMatch(/emerald|green|teal/)
  })

  it('error state (failed) uses red family', () => {
    const color = getJobStatusColor('failed')
    expect(color).toMatch(/red|rose/)
  })

  it('warning/cancelled state uses yellow/amber family', () => {
    const color = getJobStatusColor('cancelled')
    expect(color).toMatch(/amber|yellow|orange/)
  })

  it('active state (running) uses blue family', () => {
    const color = getJobStatusColor('running')
    expect(color).toMatch(/blue|indigo|sky/)
  })

  it('inactive state (pending) uses gray family', () => {
    const color = getJobStatusColor('pending')
    expect(color).toMatch(/zinc|gray|slate|neutral/)
  })
})

// ============================================================================
// JOB TYPE COMPLETENESS TESTS
// ============================================================================

describe('JOB_TYPE_LABELS and JOB_TYPE_ICONS parity', () => {
  it('have identical keys', () => {
    const labelKeys = Object.keys(JOB_TYPE_LABELS).sort()
    const iconKeys = Object.keys(JOB_TYPE_ICONS).sort()
    expect(labelKeys).toEqual(iconKeys)
  })

  it('have same number of entries', () => {
    expect(Object.keys(JOB_TYPE_LABELS).length).toBe(Object.keys(JOB_TYPE_ICONS).length)
  })

  it('icons use PascalCase naming (lucide-react convention)', () => {
    Object.values(JOB_TYPE_ICONS).forEach(icon => {
      // PascalCase: starts with capital, only letters
      expect(icon).toMatch(/^[A-Z][a-zA-Z]*$/)
    })
  })
})
