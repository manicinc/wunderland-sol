/**
 * Supertag Type Definitions
 * @module lib/supertags/types
 *
 * Tana-inspired supertags system for structured data on blocks.
 *
 * Supertags are tags with schemas - they define fields that blocks
 * with that tag should have. For example:
 * - #person: name, role, company, email
 * - #meeting: date, attendees, agenda, notes
 * - #task: status, priority, due, assignee
 * - #book: author, isbn, rating, notes
 */

// ============================================================================
// FIELD TYPES
// ============================================================================

/**
 * Supertag field types
 */
export type SupertagFieldType =
  | 'text'           // Single line text
  | 'textarea'       // Multi-line text
  | 'number'         // Numeric value
  | 'date'           // Date picker
  | 'datetime'       // Date + time picker
  | 'checkbox'       // Boolean toggle
  | 'select'         // Single select from options
  | 'multiselect'    // Multiple select from options
  | 'url'            // URL with link preview
  | 'email'          // Email address
  | 'phone'          // Phone number
  | 'rating'         // Star rating (1-5)
  | 'progress'       // Progress bar (0-100)
  | 'reference'      // Reference to another block/strand
  | 'tags'           // Tag list
  | 'image'          // Image URL/path
  | 'color'          // Color picker
  | 'formula'        // Computed field (read-only)
  | 'vocabulary_term' // Vocabulary-based classification term

/**
 * Vocabulary category for vocabulary_term fields
 */
export type VocabularyCategory = 'subject' | 'topic' | 'tag' | 'skill' | 'difficulty'

/**
 * Field definition for a supertag schema
 */
export interface SupertagFieldDefinition {
  /** Unique field name (snake_case) */
  name: string
  /** Display label */
  label: string
  /** Field type */
  type: SupertagFieldType
  /** Field description/help text */
  description?: string
  /** Whether field is required */
  required?: boolean
  /** Default value */
  defaultValue?: unknown
  /** Options for select/multiselect fields */
  options?: Array<{
    value: string
    label: string
    color?: string
  }>
  /** Validation rules */
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
  /** For reference fields: allowed supertags */
  allowedSupertags?: string[]
  /** For formula fields: expression */
  formula?: string
  /** For vocabulary_term fields: which vocabulary category to use */
  vocabularyCategory?: VocabularyCategory
  /** For vocabulary_term fields: auto-populate from content classification */
  autoPopulate?: boolean
  /** Field visibility */
  hidden?: boolean
  /** Sort order in form */
  order?: number
}

// ============================================================================
// SCHEMA TYPES
// ============================================================================

/**
 * Supertag schema (stored in database)
 */
export interface SupertagSchema {
  /** Unique schema ID */
  id: string
  /** Tag name (e.g., "person", "meeting") - without # prefix */
  tagName: string
  /** Display name */
  displayName: string
  /** Icon name (from Lucide) */
  icon?: string
  /** Badge color */
  color?: string
  /** Description */
  description?: string
  /** Field definitions */
  fields: SupertagFieldDefinition[]
  /** Parent supertag to extend */
  extends?: string
  /** When created */
  createdAt: string
  /** When last updated */
  updatedAt: string
}

/**
 * Built-in supertag templates
 */
export type BuiltInSupertag =
  | 'person'
  | 'meeting'
  | 'task'
  | 'habit'
  | 'book'
  | 'article'
  | 'project'
  | 'idea'
  | 'question'
  | 'decision'
  | 'event'

// ============================================================================
// FIELD VALUE TYPES
// ============================================================================

/**
 * Field value stored in database
 */
export interface SupertagFieldValue {
  /** Unique value ID */
  id: string
  /** Block ID this value belongs to */
  blockId: string
  /** Supertag schema ID */
  supertagId: string
  /** Field name */
  fieldName: string
  /** Field value (JSON stringified) */
  fieldValue: unknown
  /** When created */
  createdAt: string
  /** When last updated */
  updatedAt: string
}

/**
 * Block with supertag data (combined view)
 */
export interface SupertaggedBlock {
  /** Block ID */
  blockId: string
  /** Strand path */
  strandPath: string
  /** Applied supertag */
  supertag: SupertagSchema
  /** Field values */
  values: Record<string, unknown>
  /** Computed values (from formulas) */
  computedValues?: Record<string, unknown>
}

// ============================================================================
// UI TYPES
// ============================================================================

/**
 * Supertag badge display mode
 */
export type SupertagBadgeMode = 'full' | 'compact' | 'icon'

/**
 * Field editor state
 */
export interface FieldEditorState {
  fieldName: string
  value: unknown
  isDirty: boolean
  isValid: boolean
  error?: string
}

/**
 * Supertag form state
 */
export interface SupertagFormState {
  supertagId: string
  fields: Record<string, FieldEditorState>
  isValid: boolean
  isDirty: boolean
}

// ============================================================================
// BUILT-IN SCHEMAS
// ============================================================================

/**
 * Built-in supertag schema definitions
 */
export const BUILT_IN_SCHEMAS: Record<BuiltInSupertag, Omit<SupertagSchema, 'id' | 'createdAt' | 'updatedAt'>> = {
  person: {
    tagName: 'person',
    displayName: 'Person',
    icon: 'User',
    color: '#3b82f6', // blue
    description: 'A person or contact',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, order: 0 },
      { name: 'role', label: 'Role', type: 'text', order: 1 },
      { name: 'company', label: 'Company', type: 'text', order: 2 },
      { name: 'email', label: 'Email', type: 'email', order: 3 },
      { name: 'phone', label: 'Phone', type: 'phone', order: 4 },
      { name: 'linkedin', label: 'LinkedIn', type: 'url', order: 5 },
      { name: 'notes', label: 'Notes', type: 'textarea', order: 6 },
    ],
  },
  meeting: {
    tagName: 'meeting',
    displayName: 'Meeting',
    icon: 'Calendar',
    color: '#8b5cf6', // violet
    description: 'A meeting or event',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, order: 0 },
      { name: 'date', label: 'Date', type: 'datetime', required: true, order: 1 },
      { name: 'attendees', label: 'Attendees', type: 'tags', order: 2 },
      { name: 'agenda', label: 'Agenda', type: 'textarea', order: 3 },
      { name: 'notes', label: 'Notes', type: 'textarea', order: 4 },
      { name: 'action_items', label: 'Action Items', type: 'textarea', order: 5 },
    ],
  },
  task: {
    tagName: 'task',
    displayName: 'Task',
    icon: 'CheckSquare',
    color: '#10b981', // emerald
    description: 'A task or to-do item',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, order: 0 },
      {
        name: 'status', label: 'Status', type: 'select', order: 1,
        defaultValue: 'todo',
        options: [
          { value: 'todo', label: 'To Do', color: '#71717a' },
          { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
          { value: 'blocked', label: 'Blocked', color: '#ef4444' },
          { value: 'done', label: 'Done', color: '#10b981' },
        ]
      },
      {
        name: 'priority', label: 'Priority', type: 'select', order: 2,
        defaultValue: 'medium',
        options: [
          { value: 'low', label: 'Low', color: '#71717a' },
          { value: 'medium', label: 'Medium', color: '#f59e0b' },
          { value: 'high', label: 'High', color: '#ef4444' },
        ]
      },
      { name: 'due_date', label: 'Due Date', type: 'date', order: 3 },
      { name: 'assignee', label: 'Assignee', type: 'text', order: 4 },
      { name: 'progress', label: 'Progress', type: 'progress', order: 5, defaultValue: 0 },
      { name: 'notes', label: 'Notes', type: 'textarea', order: 6 },
    ],
  },
  habit: {
    tagName: 'habit',
    displayName: 'Habit',
    icon: 'Flame',
    color: '#f97316', // orange - represents fire/streaks
    description: 'A recurring habit to build consistency',
    fields: [
      { name: 'title', label: 'Habit Name', type: 'text', required: true, order: 0 },
      {
        name: 'frequency', label: 'Frequency', type: 'select', order: 1,
        defaultValue: 'daily',
        options: [
          { value: 'daily', label: 'Daily', color: '#10b981' },
          { value: 'weekdays', label: 'Weekdays', color: '#3b82f6' },
          { value: 'weekly', label: 'Weekly', color: '#8b5cf6' },
          { value: 'custom', label: 'Custom', color: '#71717a' },
        ]
      },
      {
        name: 'category', label: 'Category', type: 'select', order: 2,
        options: [
          { value: 'health', label: '🏃 Health', color: '#10b981' },
          { value: 'learning', label: '📚 Learning', color: '#3b82f6' },
          { value: 'productivity', label: '⚡ Productivity', color: '#f59e0b' },
          { value: 'mindfulness', label: '🧘 Mindfulness', color: '#8b5cf6' },
          { value: 'social', label: '👥 Social', color: '#ec4899' },
          { value: 'creative', label: '🎨 Creative', color: '#06b6d4' },
          { value: 'finance', label: '💰 Finance', color: '#84cc16' },
          { value: 'other', label: '📌 Other', color: '#71717a' },
        ]
      },
      { name: 'preferred_time', label: 'Preferred Time', type: 'text', order: 3,
        description: 'e.g., "Morning", "9:00 AM", "After lunch"' },
      { name: 'target_count', label: 'Daily Target', type: 'number', order: 4,
        defaultValue: 1, validation: { min: 1, max: 100 } },
      { name: 'reminder', label: 'Reminder Time', type: 'text', order: 5 },
      { name: 'motivation', label: 'Why This Habit?', type: 'textarea', order: 6,
        description: 'Your motivation helps maintain consistency' },
      { name: 'current_streak', label: 'Current Streak', type: 'number', order: 7,
        defaultValue: 0, hidden: true },
      { name: 'longest_streak', label: 'Longest Streak', type: 'number', order: 8,
        defaultValue: 0, hidden: true },
    ],
  },
  book: {
    tagName: 'book',
    displayName: 'Book',
    icon: 'Book',
    color: '#f59e0b', // amber
    description: 'A book reference',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, order: 0 },
      { name: 'author', label: 'Author', type: 'text', order: 1 },
      { name: 'isbn', label: 'ISBN', type: 'text', order: 2 },
      { name: 'year', label: 'Year', type: 'number', order: 3 },
      { name: 'rating', label: 'Rating', type: 'rating', order: 4 },
      { name: 'status', label: 'Status', type: 'select', order: 5,
        options: [
          { value: 'to_read', label: 'To Read' },
          { value: 'reading', label: 'Reading' },
          { value: 'finished', label: 'Finished' },
          { value: 'abandoned', label: 'Abandoned' },
        ]
      },
      { name: 'notes', label: 'Notes', type: 'textarea', order: 6 },
    ],
  },
  article: {
    tagName: 'article',
    displayName: 'Article',
    icon: 'FileText',
    color: '#06b6d4', // cyan
    description: 'An article or blog post reference',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, order: 0 },
      { name: 'url', label: 'URL', type: 'url', order: 1 },
      { name: 'author', label: 'Author', type: 'text', order: 2 },
      { name: 'published', label: 'Published', type: 'date', order: 3 },
      { name: 'summary', label: 'Summary', type: 'textarea', order: 4 },
      { name: 'key_takeaways', label: 'Key Takeaways', type: 'textarea', order: 5 },
    ],
  },
  project: {
    tagName: 'project',
    displayName: 'Project',
    icon: 'Folder',
    color: '#ec4899', // pink
    description: 'A project or initiative',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, order: 0 },
      { name: 'description', label: 'Description', type: 'textarea', order: 1 },
      {
        name: 'status', label: 'Status', type: 'select', order: 2,
        options: [
          { value: 'planning', label: 'Planning', color: '#71717a' },
          { value: 'active', label: 'Active', color: '#3b82f6' },
          { value: 'on_hold', label: 'On Hold', color: '#f59e0b' },
          { value: 'completed', label: 'Completed', color: '#10b981' },
          { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
        ]
      },
      { name: 'start_date', label: 'Start Date', type: 'date', order: 3 },
      { name: 'end_date', label: 'End Date', type: 'date', order: 4 },
      { name: 'progress', label: 'Progress', type: 'progress', order: 5, defaultValue: 0 },
      { name: 'owner', label: 'Owner', type: 'text', order: 6 },
    ],
  },
  idea: {
    tagName: 'idea',
    displayName: 'Idea',
    icon: 'Lightbulb',
    color: '#fbbf24', // yellow
    description: 'An idea or insight',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, order: 0 },
      { name: 'description', label: 'Description', type: 'textarea', order: 1 },
      {
        name: 'status', label: 'Status', type: 'select', order: 2,
        options: [
          { value: 'raw', label: 'Raw', color: '#71717a' },
          { value: 'exploring', label: 'Exploring', color: '#3b82f6' },
          { value: 'validated', label: 'Validated', color: '#10b981' },
          { value: 'rejected', label: 'Rejected', color: '#ef4444' },
        ]
      },
      { name: 'potential', label: 'Potential', type: 'rating', order: 3 },
      { name: 'related', label: 'Related Ideas', type: 'tags', order: 4 },
    ],
  },
  question: {
    tagName: 'question',
    displayName: 'Question',
    icon: 'HelpCircle',
    color: '#a855f7', // purple
    description: 'A question to explore or answer',
    fields: [
      { name: 'question', label: 'Question', type: 'text', required: true, order: 0 },
      { name: 'context', label: 'Context', type: 'textarea', order: 1 },
      { name: 'answer', label: 'Answer', type: 'textarea', order: 2 },
      { name: 'answered', label: 'Answered', type: 'checkbox', order: 3, defaultValue: false },
      { name: 'sources', label: 'Sources', type: 'tags', order: 4 },
    ],
  },
  decision: {
    tagName: 'decision',
    displayName: 'Decision',
    icon: 'GitBranch',
    color: '#14b8a6', // teal
    description: 'A decision or choice made',
    fields: [
      { name: 'decision', label: 'Decision', type: 'text', required: true, order: 0 },
      { name: 'context', label: 'Context', type: 'textarea', order: 1 },
      { name: 'alternatives', label: 'Alternatives Considered', type: 'textarea', order: 2 },
      { name: 'rationale', label: 'Rationale', type: 'textarea', order: 3 },
      { name: 'date', label: 'Date', type: 'date', order: 4 },
      { name: 'stakeholders', label: 'Stakeholders', type: 'tags', order: 5 },
      {
        name: 'status', label: 'Status', type: 'select', order: 6,
        options: [
          { value: 'proposed', label: 'Proposed', color: '#71717a' },
          { value: 'approved', label: 'Approved', color: '#10b981' },
          { value: 'implemented', label: 'Implemented', color: '#3b82f6' },
          { value: 'deprecated', label: 'Deprecated', color: '#f59e0b' },
        ]
      },
    ],
  },
  event: {
    tagName: 'event',
    displayName: 'Event',
    icon: 'CalendarDays',
    color: '#f43f5e', // rose
    description: 'An event or occurrence',
    fields: [
      { name: 'name', label: 'Event Name', type: 'text', required: true, order: 0 },
      { name: 'date', label: 'Date', type: 'datetime', required: true, order: 1 },
      { name: 'location', label: 'Location', type: 'text', order: 2 },
      { name: 'description', label: 'Description', type: 'textarea', order: 3 },
      { name: 'attendees', label: 'Attendees', type: 'tags', order: 4 },
      { name: 'url', label: 'Event URL', type: 'url', order: 5 },
    ],
  },
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Supertag system configuration
 */
export interface SupertagConfig {
  /** Enable supertags feature */
  enabled: boolean
  /** Show supertag fields inline */
  showInlineFields: boolean
  /** Auto-suggest supertags based on content */
  autoSuggest: boolean
  /** Allow creating custom supertags */
  allowCustomSchemas: boolean
  /** Default badge display mode */
  defaultBadgeMode: SupertagBadgeMode
}

/**
 * Default configuration
 */
export const DEFAULT_SUPERTAG_CONFIG: SupertagConfig = {
  enabled: true,
  showInlineFields: true,
  autoSuggest: true,
  allowCustomSchemas: true,
  defaultBadgeMode: 'compact',
}
