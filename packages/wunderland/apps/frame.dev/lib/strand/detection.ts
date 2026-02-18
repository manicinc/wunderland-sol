/**
 * Strand Detection & Validation
 * @module lib/strand/detection
 * 
 * Detects whether a path is a file-strand, folder-strand, or supernote
 * and validates strand schemas.
 * 
 * @remarks
 * A Strand can be:
 * - File-strand: Single markdown file with YAML frontmatter
 * - Folder-strand: Directory with strand.yml/strand.yaml containing schema
 * - Supernote: Compact notecard variant that REQUIRES at least one supertag
 * 
 * Folder-strand detection rules:
 * 1. Directory must contain strand.yml OR strand.yaml
 * 2. Schema must have required fields: id, slug, title, version, contentType
 * 3. All files in directory belong to that strand
 * 
 * Supernote detection rules:
 * 1. Has isSupernote: true OR strandType: 'supernote' in frontmatter
 * 2. MUST have primarySupertag field (validation enforced)
 * 3. Stored in .supernotes/ directory OR has .supernote.md extension
 */

import type { StrandMetadata, StrandType, StrandIncludes } from '@/components/quarry/types'

// ═══════════════════════════════════════════════════════════════════════════
// SUPERNOTE FILTER TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filter mode for separating supernotes from regular strands
 */
export type SupernoteFilterMode = 
  | 'all'           // Show all strands (regular + supernotes)
  | 'supernotes'    // Show only supernotes
  | 'regular'       // Show only regular strands (exclude supernotes)

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface StrandDetectionResult {
  isStrand: boolean
  strandType: StrandType | null
  schemaPath: string | null
  entryPath: string | null
  errors: string[]
  warnings: string[]
}

export interface FolderStrandFiles {
  entry: string | null
  content: string[]
  images: string[]
  media: string[]
  data: string[]
  notes: string[]
  all: string[]
}

export interface StrandValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  metadata: StrandMetadata | null
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Filenames that indicate a folder-strand */
export const FOLDER_STRAND_SCHEMA_FILES = ['strand.yml', 'strand.yaml']

/** Default entry files for folder-strands (in order of priority) */
export const DEFAULT_ENTRY_FILES = ['index.md', 'README.md', 'main.md', 'content.md']

/** File extensions by type */
export const FILE_TYPE_EXTENSIONS = {
  content: ['.md', '.mdx', '.markdown'],
  images: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'],
  media: ['.mp4', '.webm', '.mp3', '.wav', '.ogg', '.m4a'],
  data: ['.json', '.yaml', '.yml', '.csv', '.tsv', '.xml'],
  notes: ['.txt', '.note', '.notes.md'],
}

/** Default exclude patterns for folder-strands */
export const DEFAULT_EXCLUDES = [
  '*.draft.md',
  '*.wip.*',
  '_*',
  '.*',
  'node_modules/**',
]

/** Required fields for a valid strand schema */
export const REQUIRED_STRAND_FIELDS = ['id', 'slug', 'title', 'version', 'contentType']

// ═══════════════════════════════════════════════════════════════════════════
// DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect if a path represents a strand and what type
 * 
 * @param path - Path to check
 * @param fileExists - Function to check if a file exists
 * @param isDirectory - Function to check if path is a directory
 * @returns Detection result with strand type and schema location
 */
export async function detectStrand(
  path: string,
  fileExists: (path: string) => Promise<boolean>,
  isDirectory: (path: string) => Promise<boolean>
): Promise<StrandDetectionResult> {
  const result: StrandDetectionResult = {
    isStrand: false,
    strandType: null,
    schemaPath: null,
    entryPath: null,
    errors: [],
    warnings: [],
  }
  
  // Check if it's a directory
  if (await isDirectory(path)) {
    // Check for folder-strand schema files
    for (const schemaFile of FOLDER_STRAND_SCHEMA_FILES) {
      const schemaPath = `${path}/${schemaFile}`
      if (await fileExists(schemaPath)) {
        result.isStrand = true
        result.strandType = 'folder'
        result.schemaPath = schemaPath
        
        // Find entry file
        for (const entryFile of DEFAULT_ENTRY_FILES) {
          const entryPath = `${path}/${entryFile}`
          if (await fileExists(entryPath)) {
            result.entryPath = entryPath
            break
          }
        }
        
        if (!result.entryPath) {
          result.warnings.push(`Folder-strand at ${path} has no entry file (index.md, README.md, etc.)`)
        }
        
        return result
      }
    }
    
    // Not a folder-strand (might be a loom)
    return result
  }
  
  // Check if it's a markdown file (potential file-strand)
  const ext = path.split('.').pop()?.toLowerCase()
  if (ext === 'md' || ext === 'mdx' || ext === 'markdown') {
    // File-strands are validated by checking frontmatter
    result.isStrand = true
    result.strandType = 'file'
    result.schemaPath = path
    result.entryPath = path
  }
  
  return result
}

/**
 * Synchronous version for browser/client use
 */
export function detectStrandSync(
  path: string,
  files: string[] // List of files in the directory or parent
): StrandDetectionResult {
  const result: StrandDetectionResult = {
    isStrand: false,
    strandType: null,
    schemaPath: null,
    entryPath: null,
    errors: [],
    warnings: [],
  }
  
  // Normalize path
  const normalizedPath = path.replace(/\\/g, '/')
  
  // Check if this is a directory with strand.yml
  const hasStrandSchema = files.some(f => {
    const normalized = f.replace(/\\/g, '/')
    return FOLDER_STRAND_SCHEMA_FILES.some(schema => 
      normalized === `${normalizedPath}/${schema}` ||
      normalized.endsWith(`/${schema}`) && normalized.startsWith(normalizedPath)
    )
  })
  
  if (hasStrandSchema) {
    result.isStrand = true
    result.strandType = 'folder'
    result.schemaPath = `${normalizedPath}/strand.yml`
    
    // Find entry file
    for (const entryFile of DEFAULT_ENTRY_FILES) {
      const entryPath = `${normalizedPath}/${entryFile}`
      if (files.some(f => f.replace(/\\/g, '/') === entryPath)) {
        result.entryPath = entryPath
        break
      }
    }
    
    return result
  }
  
  // Check if it's a markdown file
  if (normalizedPath.match(/\.(md|mdx|markdown)$/i)) {
    result.isStrand = true
    result.strandType = 'file'
    result.schemaPath = normalizedPath
    result.entryPath = normalizedPath
  }
  
  return result
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE COLLECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all files belonging to a folder-strand
 * 
 * @param folderPath - Path to the folder-strand
 * @param allFiles - List of all files in the repository
 * @param includes - Optional explicit includes from schema
 * @param excludes - Glob patterns to exclude
 * @returns Categorized files belonging to the strand
 */
export function collectFolderStrandFiles(
  folderPath: string,
  allFiles: string[],
  includes?: StrandIncludes,
  excludes: string[] = DEFAULT_EXCLUDES
): FolderStrandFiles {
  const normalized = folderPath.replace(/\\/g, '/')
  const result: FolderStrandFiles = {
    entry: null,
    content: [],
    images: [],
    media: [],
    data: [],
    notes: [],
    all: [],
  }
  
  // Filter files in this folder
  const folderFiles = allFiles
    .map(f => f.replace(/\\/g, '/'))
    .filter(f => f.startsWith(normalized + '/'))
    .filter(f => !isExcluded(f, excludes))
  
  // If explicit includes provided, use those
  if (includes) {
    if (includes.content) {
      result.content = includes.content.map(f => `${normalized}/${f}`)
    }
    if (includes.images) {
      result.images = includes.images.map(f => `${normalized}/${f}`)
    }
    if (includes.media) {
      result.media = includes.media.map(f => `${normalized}/${f}`)
    }
    if (includes.data) {
      result.data = includes.data.map(f => `${normalized}/${f}`)
    }
    if (includes.notes) {
      result.notes = includes.notes.map(f => `${normalized}/${f}`)
    }
  } else {
    // Auto-categorize by extension
    for (const file of folderFiles) {
      const ext = '.' + (file.split('.').pop()?.toLowerCase() || '')
      
      if (FILE_TYPE_EXTENSIONS.content.includes(ext)) {
        result.content.push(file)
      } else if (FILE_TYPE_EXTENSIONS.images.includes(ext)) {
        result.images.push(file)
      } else if (FILE_TYPE_EXTENSIONS.media.includes(ext)) {
        result.media.push(file)
      } else if (FILE_TYPE_EXTENSIONS.data.includes(ext)) {
        result.data.push(file)
      } else if (FILE_TYPE_EXTENSIONS.notes.includes(ext) || file.includes('.notes.')) {
        result.notes.push(file)
      }
    }
  }
  
  // Find entry file
  for (const entryFile of DEFAULT_ENTRY_FILES) {
    const entryPath = `${normalized}/${entryFile}`
    if (result.content.includes(entryPath)) {
      result.entry = entryPath
      break
    }
  }
  
  // If no standard entry, use first content file
  if (!result.entry && result.content.length > 0) {
    result.entry = result.content[0]
  }
  
  // Collect all files
  result.all = [
    ...result.content,
    ...result.images,
    ...result.media,
    ...result.data,
    ...result.notes,
  ]
  
  return result
}

/**
 * Check if a file matches any exclude pattern
 */
function isExcluded(filePath: string, patterns: string[]): boolean {
  const fileName = filePath.split('/').pop() || ''
  
  for (const pattern of patterns) {
    // Simple glob matching
    if (pattern.startsWith('*')) {
      // *.ext or *.pattern.*
      const suffix = pattern.slice(1)
      if (fileName.endsWith(suffix) || fileName.includes(suffix)) {
        return true
      }
    } else if (pattern.endsWith('*')) {
      // prefix*
      const prefix = pattern.slice(0, -1)
      if (fileName.startsWith(prefix)) {
        return true
      }
    } else if (pattern.includes('**')) {
      // directory/**
      const dir = pattern.replace('/**', '')
      if (filePath.includes(`/${dir}/`)) {
        return true
      }
    } else {
      // Exact match
      if (fileName === pattern) {
        return true
      }
    }
  }
  
  return false
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate a strand schema (from frontmatter or strand.yml)
 */
export function validateStrandSchema(
  schema: Record<string, any>,
  strandType: StrandType
): StrandValidationResult {
  const result: StrandValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    metadata: null,
  }
  
  // Check required fields
  for (const field of REQUIRED_STRAND_FIELDS) {
    if (!schema[field]) {
      result.errors.push(`Missing required field: ${field}`)
      result.valid = false
    }
  }
  
  // Validate id format (should be UUID)
  if (schema.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schema.id)) {
    result.warnings.push(`id should be a valid UUID: ${schema.id}`)
  }
  
  // Validate slug format
  if (schema.slug && !/^[a-z0-9-]+$/.test(schema.slug)) {
    result.errors.push(`slug must be lowercase alphanumeric with hyphens: ${schema.slug}`)
    result.valid = false
  }
  
  // Validate version format
  if (schema.version && !/^\d+\.\d+\.\d+$/.test(schema.version)) {
    result.warnings.push(`version should follow semver format (x.y.z): ${schema.version}`)
  }
  
  // Validate contentType
  const validContentTypes = ['lesson', 'reference', 'exercise', 'assessment', 'project', 'discussion', 'resource', 'collection']
  if (schema.contentType && !validContentTypes.includes(schema.contentType)) {
    result.warnings.push(`Unknown contentType: ${schema.contentType}. Valid types: ${validContentTypes.join(', ')}`)
  }
  
  // Folder-strand specific validations
  if (strandType === 'folder') {
    if (schema.strandType !== 'folder') {
      result.warnings.push(`Folder-strand should have strandType: folder`)
    }
    
    // Recommend 'collection' contentType for folder-strands
    if (schema.contentType && !['collection', 'project'].includes(schema.contentType)) {
      result.warnings.push(`Folder-strands typically use contentType: collection or project`)
    }
  }
  
  // Supernote-specific validations
  if (strandType === 'supernote' || schema.isSupernote === true || schema.strandType === 'supernote') {
    // Supernotes MUST have a primary supertag
    const primarySupertag = schema.primarySupertag as string | undefined
    const supertags = schema.supertags as string[] | undefined
    
    if (!primarySupertag && (!supertags || supertags.length === 0)) {
      result.errors.push('Supernotes must have a primary supertag')
      result.valid = false
    }
    
    // Validate card size if provided
    const validCardSizes = ['3x5', '4x6', '5x7', 'a7', 'square', 'compact', 'custom']
    if (schema.supernoteCardSize && !validCardSizes.includes(schema.supernoteCardSize)) {
      result.warnings.push(`Unknown supernoteCardSize: ${schema.supernoteCardSize}. Valid sizes: ${validCardSizes.join(', ')}`)
    }
    
    // Validate style if provided
    const validStyles = ['paper', 'minimal', 'colored', 'glass', 'terminal']
    if (schema.supernoteStyle && !validStyles.includes(schema.supernoteStyle)) {
      result.warnings.push(`Unknown supernoteStyle: ${schema.supernoteStyle}. Valid styles: ${validStyles.join(', ')}`)
    }
  }
  
  // Maturity validation (Zettelkasten workflow)
  if (schema.maturity) {
    const validMaturityStatuses = ['fleeting', 'literature', 'permanent', 'evergreen']
    const maturity = schema.maturity as { status?: string; futureValue?: string }
    
    if (maturity.status && !validMaturityStatuses.includes(maturity.status)) {
      result.warnings.push(`Unknown maturity status: ${maturity.status}. Valid statuses: ${validMaturityStatuses.join(', ')}`)
    }
    
    const validFutureValues = ['low', 'medium', 'high', 'core']
    if (maturity.futureValue && !validFutureValues.includes(maturity.futureValue)) {
      result.warnings.push(`Unknown maturity futureValue: ${maturity.futureValue}. Valid values: ${validFutureValues.join(', ')}`)
    }
  }
  
  // MOC (Map of Content) validation
  if (strandType === 'moc' || schema.isMOC === true || schema.strandType === 'moc') {
    if (schema.mocConfig) {
      const mocConfig = schema.mocConfig as { topic?: string; scope?: string }
      
      // Topic is required for MOCs
      if (!mocConfig.topic) {
        result.warnings.push('MOC should have a topic defined in mocConfig')
      }
      
      // Validate scope if provided
      const validScopes = ['subject', 'topic', 'project', 'custom']
      if (mocConfig.scope && !validScopes.includes(mocConfig.scope)) {
        result.warnings.push(`Unknown MOC scope: ${mocConfig.scope}. Valid scopes: ${validScopes.join(', ')}`)
      }
    } else {
      result.warnings.push('MOC strands should have mocConfig defined')
    }
  }
  
  // Build metadata if valid
  if (result.valid) {
    result.metadata = {
      id: schema.id,
      slug: schema.slug,
      title: schema.title,
      version: schema.version,
      strandType: strandType,
      contentType: schema.contentType,
      entryFile: schema.entryFile,
      includes: schema.includes,
      excludes: schema.excludes,
      difficulty: schema.difficulty,
      taxonomy: schema.taxonomy,
      tags: schema.tags,
      relationships: schema.relationships,
      publishing: schema.publishing,
      summary: schema.summary || schema.extractiveSummary,
      aiSummary: schema.aiSummary,
      notes: schema.notes,
      // Supernote fields
      isSupernote: schema.isSupernote || strandType === 'supernote',
      primarySupertag: schema.primarySupertag || (schema.supertags as string[])?.[0],
      additionalSupertags: schema.additionalSupertags || 
        ((schema.supertags as string[])?.slice(1)),
      supernoteCardSize: schema.supernoteCardSize || schema.cardSize,
      supernoteStyle: schema.supernoteStyle,
      parentSupernoteId: schema.parentSupernoteId,
      supernoteColorOverride: schema.supernoteColorOverride || schema.colorOverride,
      // Maturity (Zettelkasten workflow)
      maturity: schema.maturity,
      // MOC (Map of Content) fields
      isMOC: schema.isMOC || strandType === 'moc',
      mocConfig: schema.mocConfig,
    }
  }
  
  return result
}

/**
 * Check if a directory should be treated as a strand (vs loom)
 * This is the main determination function
 */
export function isDirectoryAStrand(
  directoryPath: string,
  filesInDirectory: string[]
): boolean {
  return filesInDirectory.some(f => 
    FOLDER_STRAND_SCHEMA_FILES.includes(f.split('/').pop() || '')
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPERNOTE DETECTION & FILTERING
// ═══════════════════════════════════════════════════════════════════════════

/** Directory name for supernotes storage */
export const SUPERNOTES_DIRECTORY = '.supernotes'

/** File extension for supernote markdown files */
export const SUPERNOTE_FILE_EXTENSION = '.supernote.md'

/**
 * Check if a strand is a supernote based on its metadata/frontmatter
 * 
 * Supernote indicators (any of these):
 * 1. isSupernote: true
 * 2. strandType: 'supernote'
 * 3. Has supernote object with isSupernote: true
 */
export function isSupernote(metadata: StrandMetadata | Record<string, unknown>): boolean {
  if (!metadata || typeof metadata !== 'object') return false
  
  // Direct isSupernote flag
  if (metadata.isSupernote === true) return true
  
  // strandType is 'supernote'
  if (metadata.strandType === 'supernote') return true
  
  // Nested supernote object
  if (
    typeof metadata.supernote === 'object' &&
    metadata.supernote !== null &&
    (metadata.supernote as Record<string, unknown>).isSupernote === true
  ) {
    return true
  }
  
  return false
}

/**
 * Check if a file path indicates a supernote by convention
 * 
 * Convention indicators:
 * 1. Stored in .supernotes/ directory
 * 2. Has .supernote.md extension
 */
export function isSupernoteByPath(path: string): boolean {
  if (!path) return false
  
  const normalizedPath = path.replace(/\\/g, '/')
  
  // Stored in .supernotes/ directory
  if (
    normalizedPath.includes(`/${SUPERNOTES_DIRECTORY}/`) ||
    normalizedPath.startsWith(`${SUPERNOTES_DIRECTORY}/`)
  ) {
    return true
  }
  
  // Has .supernote.md extension
  if (normalizedPath.endsWith(SUPERNOTE_FILE_EXTENSION)) {
    return true
  }
  
  return false
}

/**
 * Validate that a supernote has required fields (especially primarySupertag)
 */
export function validateSupernoteRequirements(
  metadata: StrandMetadata | Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!isSupernote(metadata)) {
    return { valid: true, errors: [] } // Not a supernote, no validation needed
  }
  
  // Supernotes MUST have a primary supertag
  const primarySupertag = metadata.primarySupertag as string | undefined
  const supertags = metadata.supertags as string[] | undefined
  
  if (!primarySupertag && (!supertags || supertags.length === 0)) {
    errors.push('Supernotes must have a primary supertag (primarySupertag field or supertags array)')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Filter strands by supernote status
 * 
 * @param strands - Array of strands with metadata
 * @param filterMode - 'all', 'supernotes', or 'regular'
 * @returns Filtered array
 */
export function filterBySupernoteStatus<T extends { metadata?: StrandMetadata; frontmatter?: Record<string, unknown> }>(
  strands: T[],
  filterMode: SupernoteFilterMode
): T[] {
  if (filterMode === 'all') return strands
  
  return strands.filter(strand => {
    const meta = strand.metadata || strand.frontmatter || {}
    const isSN = isSupernote(meta)
    
    return filterMode === 'supernotes' ? isSN : !isSN
  })
}

/**
 * Get supernote display badge info
 * Returns styling info for visually distinguishing supernotes
 */
export function getSupernoteDisplayInfo(
  metadata: StrandMetadata | Record<string, unknown>
): {
  isSupernote: boolean
  badgeLabel: string
  badgeColor: string
  icon: string
  primarySupertag?: string
} | null {
  if (!isSupernote(metadata)) return null
  
  const primarySupertag = (metadata.primarySupertag as string) || 
    ((metadata.supertags as string[] | undefined)?.[0]) ||
    'note'
  
  return {
    isSupernote: true,
    badgeLabel: 'Supernote',
    badgeColor: (metadata.supernoteColorOverride as string) || '#f59e0b', // Amber default
    icon: 'sticky-note', // Lucide icon name
    primarySupertag,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOC (MAP OF CONTENT) DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/** Directory name for MOC storage */
export const MOC_DIRECTORY = '.mocs'

/** File extension for MOC markdown files */
export const MOC_FILE_EXTENSION = '.moc.md'

/**
 * Check if a strand is a Map of Content (structure note) based on metadata
 * 
 * MOC indicators (any of these):
 * 1. isMOC: true
 * 2. strandType: 'moc'
 * 3. Has mocConfig object
 */
export function isMOC(metadata: StrandMetadata | Record<string, unknown>): boolean {
  if (!metadata || typeof metadata !== 'object') return false
  
  // Direct isMOC flag
  if (metadata.isMOC === true) return true
  
  // strandType is 'moc'
  if (metadata.strandType === 'moc') return true
  
  // Has mocConfig object
  if (
    typeof metadata.mocConfig === 'object' &&
    metadata.mocConfig !== null
  ) {
    return true
  }
  
  return false
}

/**
 * Check if a file path indicates a MOC by convention
 * 
 * Convention indicators:
 * 1. Stored in .mocs/ directory
 * 2. Has .moc.md extension
 * 3. Named index.md or _index.md (common MOC naming)
 */
export function isMOCByPath(path: string): boolean {
  if (!path) return false
  
  const normalizedPath = path.replace(/\\/g, '/')
  const fileName = normalizedPath.split('/').pop() || ''
  
  // Stored in .mocs/ directory
  if (
    normalizedPath.includes(`/${MOC_DIRECTORY}/`) ||
    normalizedPath.startsWith(`${MOC_DIRECTORY}/`)
  ) {
    return true
  }
  
  // Has .moc.md extension
  if (normalizedPath.endsWith(MOC_FILE_EXTENSION)) {
    return true
  }
  
  // Named _index.md (common for MOCs)
  if (fileName === '_index.md') {
    return true
  }
  
  return false
}

/**
 * Get MOC display badge info
 * Returns styling info for visually distinguishing MOCs
 */
export function getMOCDisplayInfo(
  metadata: StrandMetadata | Record<string, unknown>
): {
  isMOC: boolean
  badgeLabel: string
  badgeColor: string
  icon: string
  topic?: string
  scope?: string
} | null {
  if (!isMOC(metadata)) return null
  
  const mocConfig = metadata.mocConfig as { topic?: string; scope?: string } | undefined
  
  return {
    isMOC: true,
    badgeLabel: 'Map of Content',
    badgeColor: '#8b5cf6', // Violet default
    icon: 'map', // Lucide icon name
    topic: mocConfig?.topic,
    scope: mocConfig?.scope,
  }
}

/**
 * Detect strand type including supernote and MOC detection from metadata
 * 
 * Enhanced version of detectStrandSync that also checks for supernotes and MOCs
 */
export function detectStrandTypeWithSupernote(
  path: string,
  files: string[],
  frontmatter?: Record<string, unknown>
): StrandDetectionResult {
  // First, get basic detection result
  const result = detectStrandSync(path, files)
  
  if (result.isStrand) {
    // Check for MOC first (higher priority than supernote)
    if (frontmatter && isMOC(frontmatter)) {
      result.strandType = 'moc'
    } else if (isMOCByPath(path)) {
      result.strandType = 'moc'
    }
    // Check if it's a supernote (only if not already MOC)
    else if (frontmatter && isSupernote(frontmatter)) {
      result.strandType = 'supernote'
    } else if (isSupernoteByPath(path)) {
      result.strandType = 'supernote'
    }
  }
  
  return result
}

/**
 * Comprehensive strand type detection with all special types
 * Alias for detectStrandTypeWithSupernote for clarity
 */
export const detectFullStrandType = detectStrandTypeWithSupernote

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const StrandDetection = {
  detect: detectStrand,
  detectSync: detectStrandSync,
  detectWithSupernote: detectStrandTypeWithSupernote,
  detectFullType: detectFullStrandType,
  collectFiles: collectFolderStrandFiles,
  validate: validateStrandSchema,
  isDirectoryStrand: isDirectoryAStrand,
  // Supernote utilities
  isSupernote,
  isSupernoteByPath,
  validateSupernoteRequirements,
  filterBySupernoteStatus,
  getSupernoteDisplayInfo,
  // MOC utilities
  isMOC,
  isMOCByPath,
  getMOCDisplayInfo,
  constants: {
    FOLDER_STRAND_SCHEMA_FILES,
    DEFAULT_ENTRY_FILES,
    FILE_TYPE_EXTENSIONS,
    DEFAULT_EXCLUDES,
    REQUIRED_STRAND_FIELDS,
    SUPERNOTES_DIRECTORY,
    SUPERNOTE_FILE_EXTENSION,
    MOC_DIRECTORY,
    MOC_FILE_EXTENSION,
  },
}

export default StrandDetection









