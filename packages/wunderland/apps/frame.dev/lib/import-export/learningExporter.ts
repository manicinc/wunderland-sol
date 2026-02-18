/**
 * Learning Data Exporter
 * @module lib/import-export/learningExporter
 * 
 * @description
 * Exports flashcards, quizzes, and glossary terms to portable formats.
 * Supports JSON (full data), CSV (Anki/Quizlet), and Markdown.
 * 
 * Includes strand mappings to enable re-importing to the same or different
 * knowledge bases.
 */

import type { Flashcard } from '@/components/quarry/hooks/useFlashcards'
import type { QuizQuestion } from '@/components/quarry/hooks/useQuizGeneration'

// ============================================================================
// TYPES
// ============================================================================

export type LearningExportFormat = 'json' | 'csv' | 'tsv' | 'markdown' | 'anki'

export interface GlossaryTerm {
  id: string
  term: string
  definition: string
  category?: string
  aliases?: string[]
  strandId?: string
  strandPath?: string
  createdAt?: string
  updatedAt?: string
}

export interface StrandMapping {
  id: string
  path: string
  title: string
  contentHash: string // For detecting content changes
}

export interface LearningExportData {
  version: '1.0'
  exportedAt: string
  exportedFrom: string
  
  // Source strand mappings
  sourceStrands: StrandMapping[]
  
  // Learning items
  flashcards: ExportedFlashcard[]
  quizzes: ExportedQuiz[]
  glossary: ExportedGlossaryTerm[]
  
  // Metadata
  stats: {
    flashcardCount: number
    quizQuestionCount: number
    glossaryTermCount: number
    strandCount: number
  }
}

export interface ExportedFlashcard {
  id: string
  front: string
  back: string
  type: string
  hint?: string
  tags: string[]
  
  // FSRS data
  fsrs?: {
    state: number
    due?: string
    stability?: number
    difficulty?: number
    interval?: number
    reviewCount?: number
  }
  
  // Source mapping
  sourceStrandId?: string
  sourceText?: string
  
  createdAt?: string
  updatedAt?: string
}

export interface ExportedQuiz {
  id: string
  strandId?: string
  strandPath?: string
  strandTitle?: string
  
  questions: ExportedQuizQuestion[]
  
  createdAt?: string
  generationMethod?: string
}

export interface ExportedQuizQuestion {
  id: string
  type: string
  question: string
  answer: string
  options?: string[]
  explanation?: string
  difficulty: string
  sourceText?: string
  confidence?: number
}

export interface ExportedGlossaryTerm {
  id: string
  term: string
  definition: string
  category?: string
  aliases?: string[]
  
  sourceStrandId?: string
  sourceStrandPath?: string
  
  createdAt?: string
  updatedAt?: string
}

export interface ExportOptions {
  format: LearningExportFormat
  includeFlashcards?: boolean
  includeQuizzes?: boolean
  includeGlossary?: boolean
  includeFSRSData?: boolean
  strandIds?: string[] // Filter by strands
}

export interface ExportResult {
  success: boolean
  data?: string | Blob
  filename: string
  mimeType: string
  stats: {
    flashcards: number
    quizzes: number
    glossary: number
    strands: number
  }
  error?: string
}

// ============================================================================
// HASH UTILITIES
// ============================================================================

/**
 * Generate a simple hash for content fingerprinting
 */
function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

// ============================================================================
// DATA COLLECTION
// ============================================================================

/**
 * Collect flashcards from IndexedDB cache
 */
async function collectFlashcards(strandIds?: string[]): Promise<ExportedFlashcard[]> {
  const flashcards: ExportedFlashcard[] = []
  
  try {
    const { getAllCachedFlashcards } = await import('@/lib/generation/flashcardCache')
    const cached = await getAllCachedFlashcards()
    
    for (const cache of cached) {
      // Filter by strand if specified
      if (strandIds && strandIds.length > 0) {
        if (!strandIds.includes(cache.strandSlug || '')) continue
      }
      
      for (const card of cache.cards) {
        // Note: FSRS data is stored separately from cached flashcards
        // Cast through unknown to check for fsrs property that may exist on extended types
        const cardAny = card as unknown as Record<string, unknown>
        const fsrsData = cardAny.fsrs as { state: number; due?: Date; stability?: number; difficulty?: number; interval?: number; reviewCount?: number } | undefined

        flashcards.push({
          id: card.id,
          front: card.front,
          back: card.back,
          type: card.type || 'basic',
          hint: card.hints?.[0],
          tags: card.tags || [],
          fsrs: fsrsData ? {
            state: fsrsData.state,
            due: fsrsData.due instanceof Date ? fsrsData.due.toISOString() : fsrsData.due as string | undefined,
            stability: fsrsData.stability,
            difficulty: fsrsData.difficulty,
            interval: fsrsData.interval,
            reviewCount: fsrsData.reviewCount,
          } : undefined,
          sourceStrandId: cache.strandSlug,
          sourceText: card.sourceText,
          createdAt: cache.createdAt,
        })
      }
    }
  } catch (err) {
    console.warn('[learningExporter] Failed to collect flashcards:', err)
  }
  
  return flashcards
}

/**
 * Collect quizzes from cache
 */
async function collectQuizzes(strandIds?: string[]): Promise<ExportedQuiz[]> {
  const quizzes: ExportedQuiz[] = []
  
  try {
    const { getAllCachedQuizzes } = await import('@/lib/generation/quizCache')
    const cached = await getAllCachedQuizzes()
    
    for (const cache of cached) {
      // Filter by strand if specified (check cache key prefix)
      if (strandIds && strandIds.length > 0) {
        // Cache keys may contain strand info - check if we can filter
        // For now, include all if we can't determine the strand
      }
      
      quizzes.push({
        id: cache.cacheKey,
        questions: cache.questions.map(q => ({
          id: q.id,
          type: q.type,
          question: q.question,
          answer: q.answer,
          options: q.options,
          explanation: q.explanation,
          difficulty: q.difficulty,
          sourceText: q.sourceText,
          confidence: q.confidence,
        })),
        createdAt: cache.createdAt,
        generationMethod: cache.generationMethod,
      })
    }
  } catch (err) {
    console.warn('[learningExporter] Failed to collect quizzes:', err)
  }
  
  return quizzes
}

/**
 * Collect glossary terms
 */
async function collectGlossary(strandIds?: string[]): Promise<ExportedGlossaryTerm[]> {
  const terms: ExportedGlossaryTerm[] = []
  
  try {
    const { getGlobalGlossaryDb } = await import('@/lib/glossary/glossaryCache')
    const glossary = await getGlobalGlossaryDb()
    
    for (const term of glossary) {
      // Filter by strand if specified
      if (strandIds && strandIds.length > 0) {
        if (term.strandId && !strandIds.includes(term.strandId)) continue
      }
      
      terms.push({
        id: term.id,
        term: term.term,
        definition: term.definition,
        category: term.category,
        aliases: term.aliases,
        sourceStrandId: term.strandId,
        sourceStrandPath: term.strandPath,
        createdAt: term.createdAt,
        updatedAt: term.updatedAt,
      })
    }
  } catch (err) {
    console.warn('[learningExporter] Failed to collect glossary:', err)
  }
  
  return terms
}

/**
 * Collect strand mappings from content store
 */
async function collectStrandMappings(strandIds?: string[]): Promise<StrandMapping[]> {
  const mappings: StrandMapping[] = []
  
  try {
    const { getContentStore } = await import('@/lib/content/sqliteStore')
    const store = getContentStore()
    await store.initialize()
    
    const tree = await store.getKnowledgeTree()
    
    function processNode(node: any, path: string = '') {
      if (node.type === 'file' && node.path) {
        // Only include if in strandIds filter, or no filter
        if (!strandIds || strandIds.length === 0 || strandIds.includes(node.slug)) {
          mappings.push({
            id: node.slug || node.path,
            path: node.path,
            title: node.title || node.name,
            contentHash: hashContent(node.path + (node.title || '')),
          })
        }
      }
      
      if (node.children) {
        for (const child of node.children) {
          processNode(child, node.path || path)
        }
      }
    }
    
    if (tree) {
      processNode(tree)
    }
  } catch (err) {
    console.warn('[learningExporter] Failed to collect strand mappings:', err)
  }
  
  return mappings
}

// ============================================================================
// FORMAT CONVERTERS
// ============================================================================

/**
 * Convert to JSON format
 */
function toJSON(data: LearningExportData): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Convert flashcards to CSV (Anki-compatible)
 * Format: front, back, tags, hint
 */
function flashcardsToCSV(flashcards: ExportedFlashcard[], separator: string = ','): string {
  const header = ['front', 'back', 'tags', 'hint', 'type'].join(separator)
  
  const rows = flashcards.map(card => {
    const fields = [
      escapeCSV(card.front),
      escapeCSV(card.back),
      escapeCSV(card.tags.join(';')),
      escapeCSV(card.hint || ''),
      escapeCSV(card.type),
    ]
    return fields.join(separator)
  })
  
  return [header, ...rows].join('\n')
}

/**
 * Convert quiz questions to CSV
 */
function quizzesToCSV(quizzes: ExportedQuiz[], separator: string = ','): string {
  const header = ['question', 'answer', 'options', 'type', 'difficulty', 'explanation'].join(separator)
  
  const rows: string[] = []
  for (const quiz of quizzes) {
    for (const q of quiz.questions) {
      const fields = [
        escapeCSV(q.question),
        escapeCSV(q.answer),
        escapeCSV(q.options?.join('|') || ''),
        escapeCSV(q.type),
        escapeCSV(q.difficulty),
        escapeCSV(q.explanation || ''),
      ]
      rows.push(fields.join(separator))
    }
  }
  
  return [header, ...rows].join('\n')
}

/**
 * Convert glossary to CSV
 */
function glossaryToCSV(terms: ExportedGlossaryTerm[], separator: string = ','): string {
  const header = ['term', 'definition', 'category', 'aliases'].join(separator)
  
  const rows = terms.map(term => {
    const fields = [
      escapeCSV(term.term),
      escapeCSV(term.definition),
      escapeCSV(term.category || ''),
      escapeCSV(term.aliases?.join(';') || ''),
    ]
    return fields.join(separator)
  })
  
  return [header, ...rows].join('\n')
}

/**
 * Convert to Markdown format
 */
function toMarkdown(data: LearningExportData): string {
  const lines: string[] = []
  
  lines.push('# Learning Export')
  lines.push('')
  lines.push(`Exported: ${new Date(data.exportedAt).toLocaleString()}`)
  lines.push(`From: ${data.exportedFrom}`)
  lines.push('')
  
  // Stats
  lines.push('## Summary')
  lines.push('')
  lines.push(`- **Flashcards**: ${data.stats.flashcardCount}`)
  lines.push(`- **Quiz Questions**: ${data.stats.quizQuestionCount}`)
  lines.push(`- **Glossary Terms**: ${data.stats.glossaryTermCount}`)
  lines.push(`- **Strands**: ${data.stats.strandCount}`)
  lines.push('')
  
  // Flashcards
  if (data.flashcards.length > 0) {
    lines.push('## Flashcards')
    lines.push('')
    for (const card of data.flashcards) {
      lines.push(`### ${card.front.slice(0, 50)}${card.front.length > 50 ? '...' : ''}`)
      lines.push('')
      lines.push('**Q:** ' + card.front)
      lines.push('')
      lines.push('**A:** ' + card.back)
      lines.push('')
      if (card.tags.length > 0) {
        lines.push('*Tags: ' + card.tags.join(', ') + '*')
        lines.push('')
      }
      lines.push('---')
      lines.push('')
    }
  }
  
  // Quizzes
  if (data.quizzes.length > 0) {
    lines.push('## Quiz Questions')
    lines.push('')
    let qNum = 1
    for (const quiz of data.quizzes) {
      for (const q of quiz.questions) {
        lines.push(`### Q${qNum}: ${q.question.slice(0, 50)}${q.question.length > 50 ? '...' : ''}`)
        lines.push('')
        lines.push('**Question:** ' + q.question)
        lines.push('')
        if (q.options && q.options.length > 0) {
          lines.push('**Options:**')
          for (const opt of q.options) {
            const marker = opt === q.answer ? '✓' : '○'
            lines.push(`- ${marker} ${opt}`)
          }
          lines.push('')
        }
        lines.push('**Answer:** ' + q.answer)
        lines.push('')
        if (q.explanation) {
          lines.push('*' + q.explanation + '*')
          lines.push('')
        }
        lines.push('---')
        lines.push('')
        qNum++
      }
    }
  }
  
  // Glossary
  if (data.glossary.length > 0) {
    lines.push('## Glossary')
    lines.push('')
    for (const term of data.glossary) {
      lines.push(`### ${term.term}`)
      lines.push('')
      lines.push(term.definition)
      lines.push('')
      if (term.category) {
        lines.push('*Category: ' + term.category + '*')
      }
      if (term.aliases && term.aliases.length > 0) {
        lines.push('*Also known as: ' + term.aliases.join(', ') + '*')
      }
      lines.push('')
      lines.push('---')
      lines.push('')
    }
  }
  
  return lines.join('\n')
}

/**
 * Escape CSV field
 */
function escapeCSV(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return '"' + field.replace(/"/g, '""') + '"'
  }
  return field
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Export learning data to specified format
 */
export async function exportLearningData(options: ExportOptions): Promise<ExportResult> {
  const {
    format,
    includeFlashcards = true,
    includeQuizzes = true,
    includeGlossary = true,
    includeFSRSData = true,
    strandIds,
  } = options
  
  try {
    // Collect data
    const flashcards = includeFlashcards 
      ? await collectFlashcards(strandIds)
      : []
    
    const quizzes = includeQuizzes 
      ? await collectQuizzes(strandIds)
      : []
    
    const glossary = includeGlossary 
      ? await collectGlossary(strandIds)
      : []
    
    const strandMappings = await collectStrandMappings(strandIds)
    
    // Calculate quiz question count
    const quizQuestionCount = quizzes.reduce((sum, q) => sum + q.questions.length, 0)
    
    // Remove FSRS data if not included
    if (!includeFSRSData) {
      flashcards.forEach(card => {
        delete card.fsrs
      })
    }
    
    // Build export data
    const exportData: LearningExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedFrom: typeof window !== 'undefined' ? window.location.origin : 'quarry',
      sourceStrands: strandMappings,
      flashcards,
      quizzes,
      glossary,
      stats: {
        flashcardCount: flashcards.length,
        quizQuestionCount,
        glossaryTermCount: glossary.length,
        strandCount: strandMappings.length,
      },
    }
    
    // Convert to requested format
    let data: string
    let filename: string
    let mimeType: string
    
    switch (format) {
      case 'json':
        data = toJSON(exportData)
        filename = `learning-export-${Date.now()}.json`
        mimeType = 'application/json'
        break
        
      case 'csv':
        // Export flashcards as primary CSV
        if (includeFlashcards && flashcards.length > 0) {
          data = flashcardsToCSV(flashcards, ',')
          filename = `flashcards-export-${Date.now()}.csv`
        } else if (includeGlossary && glossary.length > 0) {
          data = glossaryToCSV(glossary, ',')
          filename = `glossary-export-${Date.now()}.csv`
        } else if (includeQuizzes && quizzes.length > 0) {
          data = quizzesToCSV(quizzes, ',')
          filename = `quizzes-export-${Date.now()}.csv`
        } else {
          data = ''
          filename = `learning-export-${Date.now()}.csv`
        }
        mimeType = 'text/csv'
        break
        
      case 'tsv':
        // TSV for easy Excel/Sheets paste
        if (includeFlashcards && flashcards.length > 0) {
          data = flashcardsToCSV(flashcards, '\t')
          filename = `flashcards-export-${Date.now()}.tsv`
        } else if (includeGlossary && glossary.length > 0) {
          data = glossaryToCSV(glossary, '\t')
          filename = `glossary-export-${Date.now()}.tsv`
        } else {
          data = ''
          filename = `learning-export-${Date.now()}.tsv`
        }
        mimeType = 'text/tab-separated-values'
        break
        
      case 'anki':
        // Anki-specific format (TSV with specific columns)
        data = flashcardsToCSV(flashcards, '\t')
        filename = `anki-import-${Date.now()}.txt`
        mimeType = 'text/plain'
        break
        
      case 'markdown':
        data = toMarkdown(exportData)
        filename = `learning-export-${Date.now()}.md`
        mimeType = 'text/markdown'
        break
        
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
    
    return {
      success: true,
      data,
      filename,
      mimeType,
      stats: {
        flashcards: flashcards.length,
        quizzes: quizzes.length,
        glossary: glossary.length,
        strands: strandMappings.length,
      },
    }
    
  } catch (err) {
    console.error('[learningExporter] Export failed:', err)
    return {
      success: false,
      filename: '',
      mimeType: '',
      stats: { flashcards: 0, quizzes: 0, glossary: 0, strands: 0 },
      error: err instanceof Error ? err.message : 'Export failed',
    }
  }
}

/**
 * Download export to file
 */
export function downloadExport(result: ExportResult): void {
  if (!result.success || !result.data) {
    console.error('[learningExporter] Cannot download failed export')
    return
  }
  
  const blob = typeof result.data === 'string'
    ? new Blob([result.data], { type: result.mimeType })
    : result.data
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export and download learning data
 */
export async function exportAndDownload(options: ExportOptions): Promise<ExportResult> {
  const result = await exportLearningData(options)
  if (result.success) {
    downloadExport(result)
  }
  return result
}

