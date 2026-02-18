/**
 * OpenStrand Content Validator
 *
 * Browser-compatible validator for Codex content:
 * - Weave schema validation
 * - Loom schema validation
 * - Strand schema validation
 * - ECA (Educational Content Atom) fields
 * - Template generation
 *
 * @module lib/validation
 */

import { type StrandLicense, LICENSE_INFO } from '@/lib/strand/licenseTypes'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES - OpenStrand Schema
═══════════════════════════════════════════════════════════════════════════ */

export type ContentType = 'markdown' | 'code' | 'data' | 'media'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type OrderingType = 'sequential' | 'hierarchical' | 'network'
export type BloomsLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
export type PedagogicalApproach =
  | 'direct_instruction'
  | 'discovery_learning'
  | 'problem_based'
  | 'collaborative'
  | 'experiential'
  | 'inquiry_based'
export type InteractiveType =
  | 'quiz'
  | 'poll'
  | 'simulation'
  | 'code_exercise'
  | 'discussion_prompt'
  | 'reflection'
  | 'peer_review'
export type WCAGLevel = 'A' | 'AA' | 'AAA'
export type AccessibilityFeature =
  | 'alt_text'
  | 'captions'
  | 'transcripts'
  | 'audio_description'
  | 'sign_language'
  | 'easy_read'
  | 'high_contrast'
  | 'keyboard_navigation'
export type EvidenceStrength = 'strong' | 'moderate' | 'emerging'
export type UpdateFrequency = 'static' | 'annual' | 'biannual' | 'quarterly' | 'dynamic'
export type PeerReviewStatus = 'pending' | 'reviewed' | 'approved'
export type PublishingStatus = 'draft' | 'review' | 'published' | 'archived'

export interface LearningObjective {
  description: string
  bloomsLevel?: BloomsLevel
}

export interface LearningDesign {
  objectives?: LearningObjective[]
  pedagogicalApproach?: PedagogicalApproach[]
}

export interface TimeEstimates {
  reading?: number
  exercises?: number
  projects?: number
  total?: number
}

export interface VisualModality {
  diagrams?: number
  images?: number
  charts?: number
}

export interface AudioModality {
  narration?: boolean
}

export interface Modalities {
  text?: boolean
  visual?: VisualModality
  audio?: AudioModality
}

export interface InteractiveElement {
  id: string
  type: InteractiveType
  required?: boolean
}

export interface Assessment {
  id: string
  type: string
  weight?: number
  passingScore?: number
}

export interface Assessments {
  formative?: Assessment[]
  summative?: Assessment[]
}

export interface Accessibility {
  wcagLevel?: WCAGLevel
  features?: AccessibilityFeature[]
  readingLevel?: number
}

export interface CulturalAdaptation {
  culture: string
  notes?: string
}

export interface EvidenceBased {
  claim: string
  evidence: string
  citation: string
  strength?: EvidenceStrength
}

export interface PeerReview {
  status?: PeerReviewStatus
  score?: number
  reviewers?: string[]
}

export interface Quality {
  peerReview?: PeerReview
  evidenceBased?: EvidenceBased[]
  updateFrequency?: UpdateFrequency
}

export interface Taxonomy {
  subjects?: string[]
  topics?: string[]
}

export interface Relationships {
  requires?: string[]
  references?: string[]
  seeAlso?: string[]
}

export interface Publishing {
  created?: string
  updated?: string
  status?: PublishingStatus
  authors?: string[]
}

export interface Ordering {
  type: OrderingType
  items?: string[]
}

/** Strand (individual knowledge unit) */
export interface StrandMetadata {
  id: string
  slug: string
  title: string
  summary?: string
  version?: string
  contentType?: ContentType
  difficulty?: Difficulty
  taxonomy?: Taxonomy
  tags?: string[]
  relationships?: Relationships
  publishing?: Publishing
  learningDesign?: LearningDesign
  timeEstimates?: TimeEstimates
  modalities?: Modalities
  interactiveElements?: InteractiveElement[]
  assessments?: Assessments
  accessibility?: Accessibility
  culturalAdaptations?: CulturalAdaptation[]
  quality?: Quality
  /** Content license (default: 'none') */
  license?: StrandLicense
  /** Custom license text (when license is 'custom') */
  licenseText?: string
  /** URL to full license document */
  licenseUrl?: string
}

/** Loom (collection of strands) */
export interface LoomMetadata {
  slug: string
  title: string
  summary: string
  ordering?: Ordering
  tags?: string[]
}

/** Weave (top-level organization) */
export interface WeaveMetadata {
  slug: string
  title: string
  description: string
  tags?: string[]
  license?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   VALIDATION RESULT TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type ValidationSeverity = 'error' | 'warning' | 'suggestion'

export interface ValidationIssue {
  severity: ValidationSeverity
  field?: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  suggestions: ValidationIssue[]
  stats: {
    errorCount: number
    warningCount: number
    suggestionCount: number
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   UUID VALIDATION (browser-compatible)
═══════════════════════════════════════════════════════════════════════════ */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str)
}

function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTENT VALIDATOR CLASS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * OpenStrand content validator
 * Validates strands, looms, and weaves against the schema
 */
export class ContentValidator {
  private errors: ValidationIssue[] = []
  private warnings: ValidationIssue[] = []
  private suggestions: ValidationIssue[] = []

  constructor() {
    this.reset()
  }

  /**
   * Reset validation state
   */
  reset(): void {
    this.errors = []
    this.warnings = []
    this.suggestions = []
  }

  private addError(message: string, field?: string): void {
    this.errors.push({ severity: 'error', field, message })
  }

  private addWarning(message: string, field?: string): void {
    this.warnings.push({ severity: 'warning', field, message })
  }

  private addSuggestion(message: string, field?: string): void {
    this.suggestions.push({ severity: 'suggestion', field, message })
  }

  /**
   * Validate a weave schema
   */
  validateWeave(data: Partial<WeaveMetadata>): ValidationResult {
    this.reset()

    // Required fields
    const required: (keyof WeaveMetadata)[] = ['slug', 'title', 'description']
    for (const field of required) {
      if (!data[field]) {
        this.addError(`Missing required field '${field}'`, field)
      }
    }

    // Slug format
    if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
      this.addError('Slug must be lowercase alphanumeric with hyphens', 'slug')
    }

    // Tags format
    if (data.tags && !Array.isArray(data.tags)) {
      this.addError('Tags must be an array', 'tags')
    }

    // License suggestion
    if (!data.license) {
      this.addWarning('No license specified (defaults to MIT)', 'license')
    }

    return this.getResult()
  }

  /**
   * Validate a loom schema
   */
  validateLoom(data: Partial<LoomMetadata>): ValidationResult {
    this.reset()

    // Required fields
    const required: (keyof LoomMetadata)[] = ['slug', 'title', 'summary']
    for (const field of required) {
      if (!data[field]) {
        this.addError(`Missing required field '${field}'`, field)
      }
    }

    // Ordering validation
    if (data.ordering) {
      const validTypes: OrderingType[] = ['sequential', 'hierarchical', 'network']
      if (!validTypes.includes(data.ordering.type)) {
        this.addError('Invalid ordering type', 'ordering.type')
      }
      if (data.ordering.items && !Array.isArray(data.ordering.items)) {
        this.addError('Ordering items must be an array', 'ordering.items')
      }
    }

    return this.getResult()
  }

  /**
   * Validate a strand schema
   */
  validateStrand(data: Partial<StrandMetadata>, content?: string): ValidationResult {
    this.reset()

    // Required fields
    const required: (keyof StrandMetadata)[] = ['id', 'slug', 'title']
    for (const field of required) {
      if (!data[field]) {
        this.addError(`Missing required field '${field}'`, field)
      }
    }

    // UUID validation
    if (data.id && !isValidUUID(data.id)) {
      this.addError('ID must be a valid UUID', 'id')
    }

    // Content type validation
    if (data.contentType) {
      const validTypes: ContentType[] = ['markdown', 'code', 'data', 'media']
      if (!validTypes.includes(data.contentType)) {
        this.addError('Invalid content type', 'contentType')
      }
    }

    // Difficulty validation
    if (data.difficulty) {
      const validLevels: Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert']
      if (!validLevels.includes(data.difficulty)) {
        this.addError('Invalid difficulty level', 'difficulty')
      }
    }

    // Version format
    if (data.version && !/^\d+\.\d+\.\d+$/.test(data.version)) {
      this.addWarning('Version should follow semver format (x.y.z)', 'version')
    }

    // Relationships validation
    if (data.relationships) {
      if (data.relationships.requires && !Array.isArray(data.relationships.requires)) {
        this.addError('relationships.requires must be an array', 'relationships.requires')
      }
      if (data.relationships.references && !Array.isArray(data.relationships.references)) {
        this.addError('relationships.references must be an array', 'relationships.references')
      }
    }

    // License validation
    if (data.license) {
      if (!(data.license in LICENSE_INFO)) {
        this.addError(`Invalid license type: ${data.license}`, 'license')
      }
      // Custom license requires licenseText
      if (data.license === 'custom' && !data.licenseText) {
        this.addWarning('Custom license selected but no licenseText provided', 'licenseText')
      }
    }

    // License URL format
    if (data.licenseUrl) {
      try {
        new URL(data.licenseUrl)
      } catch {
        this.addError('licenseUrl must be a valid URL', 'licenseUrl')
      }
    }

    // Validate ECA fields
    this.validateECAFields(data)

    // Content validation
    if (content) {
      if (content.trim().length < 100) {
        this.addWarning('Content is very short (< 100 characters)')
      }
      if (/TODO:|FIXME:/i.test(content)) {
        this.addWarning('Contains TODO/FIXME comments')
      }
    }

    // Suggestions
    if (!data.summary) {
      this.addSuggestion('Consider adding a summary for better searchability', 'summary')
    }
    if (!data.tags || data.tags.length === 0) {
      this.addSuggestion('Consider adding tags for better categorization', 'tags')
    }
    if (!data.version) {
      this.addSuggestion('Consider adding a version number', 'version')
    }

    return this.getResult()
  }

  /**
   * Validate ECA (Educational Content Atom) fields
   */
  private validateECAFields(data: Partial<StrandMetadata>): void {
    // Learning Design
    if (data.learningDesign) {
      if (data.learningDesign.objectives) {
        if (!Array.isArray(data.learningDesign.objectives)) {
          this.addError('learningDesign.objectives must be an array', 'learningDesign.objectives')
        } else {
          data.learningDesign.objectives.forEach((obj, idx) => {
            if (!obj.description) {
              this.addError(`learningDesign.objectives[${idx}] missing description`)
            }
            if (obj.bloomsLevel) {
              const validLevels: BloomsLevel[] = [
                'remember',
                'understand',
                'apply',
                'analyze',
                'evaluate',
                'create',
              ]
              if (!validLevels.includes(obj.bloomsLevel)) {
                this.addError(`learningDesign.objectives[${idx}] invalid bloomsLevel`)
              }
            }
          })
        }
      }

      if (data.learningDesign.pedagogicalApproach) {
        const validApproaches: PedagogicalApproach[] = [
          'direct_instruction',
          'discovery_learning',
          'problem_based',
          'collaborative',
          'experiential',
          'inquiry_based',
        ]
        if (!Array.isArray(data.learningDesign.pedagogicalApproach)) {
          this.addError('learningDesign.pedagogicalApproach must be an array')
        } else {
          data.learningDesign.pedagogicalApproach.forEach((approach) => {
            if (!validApproaches.includes(approach)) {
              this.addError(`Invalid pedagogicalApproach: ${approach}`)
            }
          })
        }
      }
    }

    // Time Estimates
    if (data.timeEstimates) {
      const timeFields: (keyof TimeEstimates)[] = ['reading', 'exercises', 'projects', 'total']
      for (const field of timeFields) {
        if (data.timeEstimates[field] !== undefined && typeof data.timeEstimates[field] !== 'number') {
          this.addError(`timeEstimates.${field} must be a number`)
        }
      }

      if (data.timeEstimates.total && data.timeEstimates.reading && data.timeEstimates.exercises) {
        const sum =
          (data.timeEstimates.reading || 0) +
          (data.timeEstimates.exercises || 0) +
          (data.timeEstimates.projects || 0)
        if (Math.abs(sum - data.timeEstimates.total) > 1) {
          this.addWarning(
            `timeEstimates.total (${data.timeEstimates.total}) doesn't match sum of components (${sum})`
          )
        }
      }
    }

    // Modalities
    if (data.modalities) {
      if (data.modalities.text !== undefined && typeof data.modalities.text !== 'boolean') {
        this.addError('modalities.text must be boolean')
      }

      if (data.modalities.visual) {
        const visualFields: (keyof VisualModality)[] = ['diagrams', 'images', 'charts']
        for (const field of visualFields) {
          if (
            data.modalities.visual[field] !== undefined &&
            typeof data.modalities.visual[field] !== 'number'
          ) {
            this.addError(`modalities.visual.${field} must be a number`)
          }
        }
      }

      if (data.modalities.audio?.narration !== undefined) {
        if (typeof data.modalities.audio.narration !== 'boolean') {
          this.addError('modalities.audio.narration must be boolean')
        }
      }
    }

    // Interactive Elements
    if (data.interactiveElements) {
      if (!Array.isArray(data.interactiveElements)) {
        this.addError('interactiveElements must be an array')
      } else {
        const validTypes: InteractiveType[] = [
          'quiz',
          'poll',
          'simulation',
          'code_exercise',
          'discussion_prompt',
          'reflection',
          'peer_review',
        ]
        data.interactiveElements.forEach((elem, idx) => {
          if (!elem.id) {
            this.addError(`interactiveElements[${idx}] missing id`)
          }
          if (!elem.type || !validTypes.includes(elem.type)) {
            this.addError(`interactiveElements[${idx}] invalid or missing type`)
          }
          if (elem.required !== undefined && typeof elem.required !== 'boolean') {
            this.addError(`interactiveElements[${idx}].required must be boolean`)
          }
        })
      }
    }

    // Assessments
    if (data.assessments) {
      const assessmentTypes: (keyof Assessments)[] = ['formative', 'summative']
      for (const type of assessmentTypes) {
        const assessments = data.assessments[type]
        if (assessments) {
          if (!Array.isArray(assessments)) {
            this.addError(`assessments.${type} must be an array`)
          } else {
            assessments.forEach((assessment, idx) => {
              if (!assessment.id) {
                this.addError(`assessments.${type}[${idx}] missing id`)
              }
              if (!assessment.type) {
                this.addError(`assessments.${type}[${idx}] missing type`)
              }
              if (assessment.weight !== undefined) {
                if (typeof assessment.weight !== 'number' || assessment.weight < 0 || assessment.weight > 1) {
                  this.addError(`assessments.${type}[${idx}].weight must be between 0 and 1`)
                }
              }
              if (type === 'summative' && assessment.passingScore !== undefined) {
                if (
                  typeof assessment.passingScore !== 'number' ||
                  assessment.passingScore < 0 ||
                  assessment.passingScore > 100
                ) {
                  this.addError(`assessments.summative[${idx}].passingScore must be between 0 and 100`)
                }
              }
            })
          }
        }
      }
    }

    // Accessibility
    if (data.accessibility) {
      if (data.accessibility.wcagLevel) {
        const validLevels: WCAGLevel[] = ['A', 'AA', 'AAA']
        if (!validLevels.includes(data.accessibility.wcagLevel)) {
          this.addError('accessibility.wcagLevel must be A, AA, or AAA')
        }
      }

      if (data.accessibility.features) {
        const validFeatures: AccessibilityFeature[] = [
          'alt_text',
          'captions',
          'transcripts',
          'audio_description',
          'sign_language',
          'easy_read',
          'high_contrast',
          'keyboard_navigation',
        ]
        if (!Array.isArray(data.accessibility.features)) {
          this.addError('accessibility.features must be an array')
        } else {
          data.accessibility.features.forEach((feature) => {
            if (!validFeatures.includes(feature)) {
              this.addWarning(`Unknown accessibility feature: ${feature}`)
            }
          })
        }
      }

      if (data.accessibility.readingLevel !== undefined) {
        if (
          typeof data.accessibility.readingLevel !== 'number' ||
          data.accessibility.readingLevel < 1 ||
          data.accessibility.readingLevel > 20
        ) {
          this.addError('accessibility.readingLevel must be between 1 and 20')
        }
      }
    }

    // Cultural Adaptations
    if (data.culturalAdaptations) {
      if (!Array.isArray(data.culturalAdaptations)) {
        this.addError('culturalAdaptations must be an array')
      } else {
        data.culturalAdaptations.forEach((adaptation, idx) => {
          if (!adaptation.culture) {
            this.addError(`culturalAdaptations[${idx}] missing culture code`)
          }
          if (adaptation.culture && !/^[A-Z]{2}$/.test(adaptation.culture)) {
            this.addWarning(
              `culturalAdaptations[${idx}].culture should be ISO 3166-1 alpha-2 (e.g., US, GB)`
            )
          }
        })
      }
    }

    // Quality
    if (data.quality) {
      if (data.quality.peerReview) {
        if (data.quality.peerReview.status) {
          const validStatuses: PeerReviewStatus[] = ['pending', 'reviewed', 'approved']
          if (!validStatuses.includes(data.quality.peerReview.status)) {
            this.addError('quality.peerReview.status must be pending, reviewed, or approved')
          }
        }
        if (data.quality.peerReview.score !== undefined) {
          if (
            typeof data.quality.peerReview.score !== 'number' ||
            data.quality.peerReview.score < 0 ||
            data.quality.peerReview.score > 5
          ) {
            this.addError('quality.peerReview.score must be between 0 and 5')
          }
        }
      }

      if (data.quality.evidenceBased) {
        if (!Array.isArray(data.quality.evidenceBased)) {
          this.addError('quality.evidenceBased must be an array')
        } else {
          data.quality.evidenceBased.forEach((evidence, idx) => {
            if (!evidence.claim || !evidence.evidence || !evidence.citation) {
              this.addError(
                `quality.evidenceBased[${idx}] missing required fields (claim, evidence, citation)`
              )
            }
            if (evidence.strength) {
              const validStrengths: EvidenceStrength[] = ['strong', 'moderate', 'emerging']
              if (!validStrengths.includes(evidence.strength)) {
                this.addError(`quality.evidenceBased[${idx}].strength must be strong, moderate, or emerging`)
              }
            }
          })
        }
      }

      if (data.quality.updateFrequency) {
        const validFrequencies: UpdateFrequency[] = ['static', 'annual', 'biannual', 'quarterly', 'dynamic']
        if (!validFrequencies.includes(data.quality.updateFrequency)) {
          this.addError('quality.updateFrequency must be static, annual, biannual, quarterly, or dynamic')
        }
      }
    }

    // ECA enhancement suggestion
    if (!data.learningDesign && !data.timeEstimates && !data.modalities) {
      this.addSuggestion(
        'Consider adding ECA fields (learningDesign, timeEstimates, modalities) for enhanced learning analytics'
      )
    }
  }

  /**
   * Get validation result
   */
  private getResult(): ValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
      suggestions: [...this.suggestions],
      stats: {
        errorCount: this.errors.length,
        warningCount: this.warnings.length,
        suggestionCount: this.suggestions.length,
      },
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE GENERATION
═══════════════════════════════════════════════════════════════════════════ */

export interface StrandTemplateOptions {
  summary?: string
  contentType?: ContentType
  difficulty?: Difficulty
  subjects?: string[]
  topics?: string[]
  tags?: string[]
}

/**
 * Generate a new strand template with valid defaults
 */
export function generateStrandTemplate(title: string, options: StrandTemplateOptions = {}): StrandMetadata {
  const now = new Date().toISOString()

  return {
    id: generateUUID(),
    slug: title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    title,
    summary: options.summary || '',
    version: '1.0.0',
    contentType: options.contentType || 'markdown',
    difficulty: options.difficulty || 'intermediate',
    taxonomy: {
      subjects: options.subjects || [],
      topics: options.topics || [],
    },
    tags: options.tags || [],
    relationships: {
      requires: [],
      references: [],
      seeAlso: [],
    },
    publishing: {
      created: now,
      updated: now,
      status: 'draft',
    },
  }
}

/**
 * Generate a new loom template
 */
export function generateLoomTemplate(title: string, summary: string): LoomMetadata {
  return {
    slug: title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    title,
    summary,
    ordering: {
      type: 'sequential',
      items: [],
    },
    tags: [],
  }
}

/**
 * Generate a new weave template
 */
export function generateWeaveTemplate(title: string, description: string): WeaveMetadata {
  return {
    slug: title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    title,
    description,
    tags: [],
    license: 'MIT',
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONVENIENCE FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

// Singleton validator instance
let validatorInstance: ContentValidator | null = null

/**
 * Get shared validator instance
 */
export function getValidator(): ContentValidator {
  if (!validatorInstance) {
    validatorInstance = new ContentValidator()
  }
  return validatorInstance
}

/**
 * Quick validate strand metadata
 */
export function validateStrand(data: Partial<StrandMetadata>, content?: string): ValidationResult {
  return getValidator().validateStrand(data, content)
}

/**
 * Quick validate loom metadata
 */
export function validateLoom(data: Partial<LoomMetadata>): ValidationResult {
  return getValidator().validateLoom(data)
}

/**
 * Quick validate weave metadata
 */
export function validateWeave(data: Partial<WeaveMetadata>): ValidationResult {
  return getValidator().validateWeave(data)
}

/**
 * Check if content is valid (no errors)
 */
export function isValidStrand(data: Partial<StrandMetadata>): boolean {
  return validateStrand(data).valid
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export default {
  ContentValidator,
  getValidator,
  validateStrand,
  validateLoom,
  validateWeave,
  isValidStrand,
  generateStrandTemplate,
  generateLoomTemplate,
  generateWeaveTemplate,
}
