/**
 * Learning Data Importer
 * @module lib/import-export/learningImporter
 * 
 * @description
 * Imports flashcards, quizzes, and glossary terms from various formats.
 * Supports strand mapping for reconnecting imported data to local content.
 */

import type { LearningExportData, StrandMapping, ExportedFlashcard, ExportedQuiz, ExportedGlossaryTerm } from './learningExporter'

// ============================================================================
// TYPES
// ============================================================================

export type ImportFormat = 'json' | 'csv' | 'tsv' | 'anki'
export type ConflictResolution = 'skip' | 'replace' | 'merge'
export type StrandMappingAction = 'map' | 'create' | 'orphan'

export interface StrandMappingChoice {
  sourceStrand: StrandMapping
  action: StrandMappingAction
  targetStrandId?: string // For 'map' action
  newStrandPath?: string  // For 'create' action
}

export interface ImportOptions {
  /** Conflict resolution strategy */
  conflictResolution: ConflictResolution
  /** Strand mappings (required if source strands don't match local) */
  strandMappings?: StrandMappingChoice[]
  /** Import flashcards */
  importFlashcards?: boolean
  /** Import quizzes */
  importQuizzes?: boolean
  /** Import glossary */
  importGlossary?: boolean
  /** Import FSRS data (spaced repetition state) */
  importFSRSData?: boolean
}

export interface ImportResult {
  success: boolean
  imported: {
    flashcards: number
    quizzes: number
    glossary: number
  }
  skipped: {
    flashcards: number
    quizzes: number
    glossary: number
  }
  errors: string[]
  strandsMissing: StrandMapping[]
}

export interface ParsedImportData {
  format: ImportFormat
  version?: string
  flashcards: ExportedFlashcard[]
  quizzes: ExportedQuiz[]
  glossary: ExportedGlossaryTerm[]
  sourceStrands: StrandMapping[]
  isValid: boolean
  errors: string[]
}

// ============================================================================
// FORMAT DETECTION
// ============================================================================

/**
 * Detect import format from file content
 */
export function detectFormat(content: string, filename?: string): ImportFormat {
  const trimmed = content.trim()
  
  // Check file extension first
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext === 'json') return 'json'
    if (ext === 'csv') return 'csv'
    if (ext === 'tsv') return 'tsv'
    if (ext === 'txt') return 'anki' // Anki exports as .txt
  }
  
  // Try to parse as JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {
      // Not valid JSON
    }
  }
  
  // Check for tab-separated values
  const firstLine = trimmed.split('\n')[0]
  if (firstLine.includes('\t')) {
    return 'tsv'
  }
  
  // Default to CSV
  return 'csv'
}

// ============================================================================
// PARSERS
// ============================================================================

/**
 * Parse JSON export format
 */
function parseJSON(content: string): ParsedImportData {
  const result: ParsedImportData = {
    format: 'json',
    flashcards: [],
    quizzes: [],
    glossary: [],
    sourceStrands: [],
    isValid: true,
    errors: [],
  }
  
  try {
    const data = JSON.parse(content) as LearningExportData
    
    result.version = data.version
    result.flashcards = data.flashcards || []
    result.quizzes = data.quizzes || []
    result.glossary = data.glossary || []
    result.sourceStrands = data.sourceStrands || []
    
  } catch (err) {
    result.isValid = false
    result.errors.push(`Invalid JSON: ${err instanceof Error ? err.message : 'Parse error'}`)
  }
  
  return result
}

/**
 * Parse CSV/TSV flashcard format
 * Expected columns: front, back, tags, hint, type
 */
function parseCSV(content: string, separator: string): ParsedImportData {
  const result: ParsedImportData = {
    format: separator === '\t' ? 'tsv' : 'csv',
    flashcards: [],
    quizzes: [],
    glossary: [],
    sourceStrands: [],
    isValid: true,
    errors: [],
  }
  
  const lines = content.trim().split('\n')
  if (lines.length < 2) {
    result.errors.push('CSV must have at least a header and one data row')
    return result
  }
  
  // Parse header
  const header = parseCSVLine(lines[0], separator)
  const frontIdx = header.findIndex(h => h.toLowerCase() === 'front')
  const backIdx = header.findIndex(h => h.toLowerCase() === 'back')
  const tagsIdx = header.findIndex(h => h.toLowerCase() === 'tags')
  const hintIdx = header.findIndex(h => h.toLowerCase() === 'hint')
  const typeIdx = header.findIndex(h => h.toLowerCase() === 'type')
  
  // Check for required columns
  if (frontIdx === -1 || backIdx === -1) {
    // Try to detect if this is a simple 2-column format (front\tback)
    if (header.length >= 2) {
      // Assume first column is front, second is back
      for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i], separator)
        if (fields.length >= 2) {
          result.flashcards.push({
            id: `import-${i}`,
            front: fields[0],
            back: fields[1],
            type: 'basic',
            tags: fields[2]?.split(';').filter(Boolean) || ['imported'],
          })
        }
      }
      return result
    }
    
    result.errors.push('CSV must have "front" and "back" columns')
    result.isValid = false
    return result
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i], separator)
    if (fields.length < 2) continue
    
    const card: ExportedFlashcard = {
      id: `import-${i}`,
      front: fields[frontIdx] || '',
      back: fields[backIdx] || '',
      type: (typeIdx !== -1 ? fields[typeIdx] : 'basic') || 'basic',
      hint: hintIdx !== -1 ? fields[hintIdx] : undefined,
      tags: tagsIdx !== -1 ? (fields[tagsIdx] || '').split(';').filter(Boolean) : ['imported'],
    }
    
    if (card.front && card.back) {
      result.flashcards.push(card)
    }
  }
  
  return result
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string, separator: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === separator && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  fields.push(current.trim())
  return fields
}

/**
 * Parse Anki export format (tab-separated, no header)
 */
function parseAnki(content: string): ParsedImportData {
  const result: ParsedImportData = {
    format: 'anki',
    flashcards: [],
    quizzes: [],
    glossary: [],
    sourceStrands: [],
    isValid: true,
    errors: [],
  }
  
  const lines = content.trim().split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const fields = line.split('\t')
    if (fields.length >= 2) {
      result.flashcards.push({
        id: `anki-${i}`,
        front: fields[0],
        back: fields[1],
        type: 'basic',
        tags: fields[2]?.split(' ').filter(Boolean) || ['imported', 'anki'],
      })
    }
  }
  
  return result
}

// ============================================================================
// MAIN IMPORT FUNCTIONS
// ============================================================================

/**
 * Parse import file and detect format
 */
export function parseImportFile(content: string, filename?: string): ParsedImportData {
  const format = detectFormat(content, filename)
  
  switch (format) {
    case 'json':
      return parseJSON(content)
    case 'tsv':
      return parseCSV(content, '\t')
    case 'csv':
      return parseCSV(content, ',')
    case 'anki':
      return parseAnki(content)
    default:
      return {
        format,
        flashcards: [],
        quizzes: [],
        glossary: [],
        sourceStrands: [],
        isValid: false,
        errors: [`Unsupported format: ${format}`],
      }
  }
}

/**
 * Check which source strands are missing from local content
 */
export async function findMissingStrands(
  sourceStrands: StrandMapping[]
): Promise<StrandMapping[]> {
  const missing: StrandMapping[] = []
  
  try {
    const { getContentStore } = await import('@/lib/content/sqliteStore')
    const store = getContentStore()
    await store.initialize()
    
    for (const strand of sourceStrands) {
      // Try to find by path or id using getStrandsByIds
      const matches = await store.getStrandsByIds([strand.id])
      if (!matches || matches.length === 0) {
        missing.push(strand)
      }
    }
  } catch (err) {
    console.warn('[learningImporter] Failed to check strands:', err)
    // If we can't check, assume all are missing
    return sourceStrands
  }
  
  return missing
}

/**
 * Import learning data with strand mapping
 */
export async function importLearningData(
  data: ParsedImportData,
  options: ImportOptions
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: { flashcards: 0, quizzes: 0, glossary: 0 },
    skipped: { flashcards: 0, quizzes: 0, glossary: 0 },
    errors: [],
    strandsMissing: [],
  }
  
  const {
    conflictResolution = 'skip',
    strandMappings = [],
    importFlashcards = true,
    importQuizzes = true,
    importGlossary = true,
    importFSRSData = true,
  } = options
  
  // Build strand mapping lookup
  const strandMap = new Map<string, StrandMappingChoice>()
  for (const mapping of strandMappings) {
    strandMap.set(mapping.sourceStrand.id, mapping)
  }
  
  try {
    // Import flashcards
    if (importFlashcards && data.flashcards.length > 0) {
      const { saveToCache } = await import('@/lib/generation/flashcardCache')
      
      // Group flashcards by source strand
      const byStrand = new Map<string, ExportedFlashcard[]>()
      for (const card of data.flashcards) {
        const strandId = card.sourceStrandId || 'orphan'
        if (!byStrand.has(strandId)) {
          byStrand.set(strandId, [])
        }
        byStrand.get(strandId)!.push(card)
      }
      
      // Import each strand's cards
      for (const [strandId, cards] of byStrand) {
        const mapping = strandMap.get(strandId)
        const targetStrand = mapping?.action === 'map' 
          ? mapping.targetStrandId 
          : strandId
        
        if (mapping?.action === 'orphan' || !mapping) {
          // Import as orphaned
          await saveToCache(
            `import-${Date.now()}`,
            'imported',
            {
              cards: cards.map(c => ({
                id: c.id,
                type: c.type as any,
                front: c.front,
                back: c.back,
                hints: c.hint ? [c.hint] : [],
                tags: c.tags,
                source: 'manual' as const,
                confidence: 1,
                sourceText: c.sourceText,
              })),
              generationMethod: 'static',
              strandSlug: 'imported',
              createdAt: new Date().toISOString(),
              version: 1,
            }
          )
          result.imported.flashcards += cards.length
        } else if (targetStrand) {
          await saveToCache(
            `import-${targetStrand}-${Date.now()}`,
            targetStrand,
            {
              cards: cards.map(c => ({
                id: c.id,
                type: c.type as any,
                front: c.front,
                back: c.back,
                hints: c.hint ? [c.hint] : [],
                tags: c.tags,
                source: 'manual' as const,
                confidence: 1,
                sourceText: c.sourceText,
              })),
              generationMethod: 'static',
              strandSlug: targetStrand,
              createdAt: new Date().toISOString(),
              version: 1,
            }
          )
          result.imported.flashcards += cards.length
        }
      }
    }
    
    // Import quizzes
    if (importQuizzes && data.quizzes.length > 0) {
      const { saveToCache } = await import('@/lib/generation/quizCache')
      
      for (const quiz of data.quizzes) {
        const cacheKey = `import-quiz-${Date.now()}-${Math.random().toString(36).slice(2)}`
        
        await saveToCache(
          cacheKey,
          {
            questions: quiz.questions.map(q => ({
              id: q.id,
              type: q.type as any,
              question: q.question,
              options: q.options,
              answer: q.answer,
              explanation: q.explanation,
              difficulty: q.difficulty as any,
              sourceText: q.sourceText,
              confidence: q.confidence,
            })),
            generationMethod: (quiz.generationMethod || 'static') as 'static' | 'llm' | 'hybrid',
            createdAt: new Date().toISOString(),
            version: 1,
          }
        )
        result.imported.quizzes++
      }
    }
    
    // Import glossary
    if (importGlossary && data.glossary.length > 0) {
      const { saveToCache } = await import('@/lib/glossary/glossaryCache')
      
      const cacheKey = `import-glossary-${Date.now()}`
      
      await saveToCache(
        cacheKey,
        {
          terms: data.glossary.map(t => ({
            term: t.term,
            definition: t.definition,
            type: 'definition' as const,
            confidence: 1,
            source: 'nlp' as const,
          })),
          generationMethod: 'nlp',
          createdAt: new Date().toISOString(),
          version: 1,
        }
      )
      result.imported.glossary = data.glossary.length
    }
    
  } catch (err) {
    result.success = false
    result.errors.push(err instanceof Error ? err.message : 'Import failed')
  }
  
  return result
}

/**
 * Read file and import learning data
 */
export async function importFromFile(
  file: File,
  options: ImportOptions
): Promise<ImportResult> {
  const content = await file.text()
  const parsed = parseImportFile(content, file.name)
  
  if (!parsed.isValid) {
    return {
      success: false,
      imported: { flashcards: 0, quizzes: 0, glossary: 0 },
      skipped: { flashcards: 0, quizzes: 0, glossary: 0 },
      errors: parsed.errors,
      strandsMissing: [],
    }
  }
  
  // Check for missing strands
  const missing = await findMissingStrands(parsed.sourceStrands)
  if (missing.length > 0 && !options.strandMappings) {
    return {
      success: false,
      imported: { flashcards: 0, quizzes: 0, glossary: 0 },
      skipped: { flashcards: 0, quizzes: 0, glossary: 0 },
      errors: ['Source strands not found - mapping required'],
      strandsMissing: missing,
    }
  }
  
  return importLearningData(parsed, options)
}

