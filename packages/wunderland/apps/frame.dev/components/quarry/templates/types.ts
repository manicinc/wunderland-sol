/**
 * Template System Type Definitions
 * @module codex/templates/types
 * 
 * @remarks
 * Comprehensive type system for strand templates supporting:
 * - Multiple categories and rich metadata
 * - Validation rules and field definitions
 * - Frontmatter generation and preview
 * - Search, favorites, and recent templates
 */

/** Template category identifiers */
export type TemplateCategory = 
  | 'general'
  | 'technical'
  | 'creative'
  | 'personal'
  | 'business'
  | 'learning'
  | 'lifestyle'
  | 'research'

/** Template difficulty levels */
export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced'

/** Template status for lifecycle management */
export type TemplateStatus = 'stable' | 'beta' | 'deprecated' | 'experimental'

/** Field types for template form generation */
export type TemplateFieldType = 
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'tags'
  | 'number'
  | 'date'
  | 'datetime'
  | 'url'
  | 'email'
  | 'color'
  | 'range'
  | 'checkbox'
  | 'radio'
  | 'file'
  | 'markdown'

/** Validation rules for template fields */
export interface FieldValidation {
  /** Minimum length for strings */
  minLength?: number
  /** Maximum length for strings */
  maxLength?: number
  /** Minimum value for numbers */
  min?: number
  /** Maximum value for numbers */
  max?: number
  /** Step for number inputs */
  step?: number
  /** Regex pattern for validation */
  pattern?: string
  /** Pattern description for error messages */
  patternDescription?: string
  /** Custom validation message */
  message?: string
}

/** Template field definition */
export interface TemplateField {
  /** Field identifier (used in frontmatter) */
  name: string
  /** Display label */
  label: string
  /** Field type */
  type: TemplateFieldType
  /** Whether field is required */
  required: boolean
  /** Placeholder text */
  placeholder?: string
  /** Help text / tooltip */
  tooltip?: string
  /** Field description (for display) */
  description?: string
  /** Options for select/multiselect/radio */
  options?: string[]
  /** Default value */
  defaultValue?: string | number | boolean | string[]
  /** Validation rules */
  validation?: FieldValidation
  /** Conditional display */
  showIf?: {
    field: string
    value: string | boolean | number
  }
  /** Group fields visually */
  group?: string
  /** Field order within group */
  order?: number
}

/** Frontmatter configuration */
export interface FrontmatterConfig {
  /** Required frontmatter fields */
  required: string[]
  /** Optional frontmatter fields */
  optional: string[]
  /** Custom frontmatter fields (not from form) */
  custom?: Record<string, unknown>
}

/** Template category metadata */
export interface TemplateCategoryMeta {
  /** Category identifier */
  id: TemplateCategory
  /** Display name */
  name: string
  /** Category description */
  description: string
  /** Lucide icon name */
  icon: string
  /** Theme color (hex) */
  color: string
  /** Sort order */
  order?: number
}

/** Complete template definition */
export interface StrandTemplate {
  /** Unique template identifier */
  id: string
  /** Display name */
  name: string
  /** Template category */
  category: TemplateCategory
  /** Lucide icon name */
  icon: string
  /** Full description */
  description: string
  /** Short description for compact display */
  shortDescription: string
  /** Difficulty level */
  difficulty: TemplateDifficulty
  /** Estimated time to complete */
  estimatedTime: string
  /** Related tags */
  tags: string[]
  /** Template version */
  version: string
  /** Template author */
  author: string
  /** Whether featured in UI */
  featured: boolean
  /** Popularity score (0-100) */
  popularity: number
  /** Default form data */
  defaultData: Record<string, unknown>
  /** Form field definitions */
  fields?: TemplateField[]
  /** Frontmatter configuration */
  frontmatter?: FrontmatterConfig
  /** Markdown template with placeholders */
  template: string
  /** Template status */
  status?: TemplateStatus
  /** Minimum supported version */
  minVersion?: string
  /** Related template IDs */
  relatedTemplates?: string[]
  /** Example output preview */
  examplePreview?: string
  /** Last updated timestamp */
  updatedAt?: string
}

/** Template index structure */
export interface TemplateIndex {
  /** Index version */
  version: string
  /** Last update date */
  lastUpdated: string
  /** Category definitions */
  categories: TemplateCategoryMeta[]
  /** Template file paths */
  templates: string[]
}

/** Loaded template with resolved references */
export interface LoadedTemplate extends StrandTemplate {
  /** Full file path */
  path: string
  /** Category metadata */
  categoryMeta: TemplateCategoryMeta
  /** Whether template is favorited by user */
  isFavorite?: boolean
  /** Last used timestamp */
  lastUsed?: number
  /** Usage count */
  useCount?: number
}

/** Template search/filter options */
export interface TemplateFilterOptions {
  /** Search query */
  query?: string
  /** Filter by category */
  category?: TemplateCategory | 'all'
  /** Filter by difficulty */
  difficulty?: TemplateDifficulty | 'all'
  /** Filter by tags */
  tags?: string[]
  /** Show only featured */
  featuredOnly?: boolean
  /** Show only favorites */
  favoritesOnly?: boolean
  /** Sort field */
  sortBy?: 'popularity' | 'name' | 'recent' | 'difficulty'
  /** Sort direction */
  sortOrder?: 'asc' | 'desc'
}

/** Template usage statistics */
export interface TemplateStats {
  /** Template ID */
  templateId: string
  /** Number of times used */
  useCount: number
  /** Last used timestamp */
  lastUsed: number
  /** Is favorited */
  isFavorite: boolean
}

/** User's template preferences */
export interface TemplatePreferences {
  /** Favorite template IDs */
  favorites: string[]
  /** Recent template IDs (ordered) */
  recent: string[]
  /** Default category */
  defaultCategory?: TemplateCategory
  /** Usage statistics by template ID */
  stats: Record<string, TemplateStats>
}

/** Form data for template generation */
export interface TemplateFormData {
  /** Form field values */
  [key: string]: string | number | boolean | string[] | undefined
}

/** Generated frontmatter result */
export interface GeneratedFrontmatter {
  /** Raw YAML string */
  yaml: string
  /** Parsed frontmatter object */
  data: Record<string, unknown>
  /** Full markdown content */
  content: string
}

/** Template validation result */
export interface TemplateValidationResult {
  /** Whether template is valid */
  valid: boolean
  /** Validation errors */
  errors: Array<{
    field: string
    message: string
    type: 'required' | 'format' | 'length' | 'pattern' | 'custom'
  }>
  /** Validation warnings */
  warnings: Array<{
    field: string
    message: string
  }>
}

/** Icon name type (matches Lucide icon names) */
export type IconName = string





















