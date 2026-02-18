/**
 * Embark-Style Mention Types
 * @module lib/mentions/types
 *
 * @description
 * Enhanced mention types inspired by Embark's dynamic documents.
 * Supports places, dates, people, strands, and events as mentionable entities.
 */

// ============================================================================
// MENTIONABLE ENTITY TYPES
// ============================================================================

/**
 * All entity types that can be mentioned with @
 */
export type MentionableEntityType =
  | 'place'       // Geographic location with coordinates
  | 'date'        // Date or date range
  | 'person'      // Person with contact info
  | 'strand'      // Reference to another strand
  | 'event'       // Calendar event
  | 'project'     // Project reference
  | 'team'        // Team/group reference
  | 'tag'         // Inline tag (acts as categorization)
  | 'concept'     // Abstract concept/topic
  | 'unknown'     // Unresolved mention

/**
 * Base interface for all mentionable entities
 */
export interface MentionableEntityBase {
  /** Unique entity identifier */
  id: string
  /** Entity type */
  type: MentionableEntityType
  /** Display label (what shows in autocomplete) */
  label: string
  /** Optional description */
  description?: string
  /** Icon name (lucide-react) */
  icon?: string
  /** Color for display */
  color?: string
  /** Source strand path (if extracted from document) */
  sourceStrandPath?: string
  /** When the entity was created */
  createdAt: string
  /** When the entity was last updated */
  updatedAt?: string
}

/**
 * Place entity with geographic coordinates
 */
export interface PlaceEntity extends MentionableEntityBase {
  type: 'place'
  properties: {
    /** Latitude */
    latitude?: number
    /** Longitude */
    longitude?: number
    /** Full address */
    address?: string
    /** City */
    city?: string
    /** Country */
    country?: string
    /** Place type (restaurant, airport, hotel, etc.) */
    placeType?: string
    /** Rating (e.g., from Google Maps) */
    rating?: number
    /** Opening hours */
    openingHours?: string[]
    /** External place ID (Google Maps, etc.) */
    externalId?: string
    /** External provider (google_maps, openstreetmap) */
    externalProvider?: string
  }
}

/**
 * Date entity representing a date or date range
 */
export interface DateEntity extends MentionableEntityBase {
  type: 'date'
  properties: {
    /** ISO date string */
    date: string
    /** Optional end date for ranges */
    endDate?: string
    /** Whether this is a range */
    isRange: boolean
    /** Natural language description */
    naturalLanguage?: string
    /** Day of week */
    dayOfWeek?: string
    /** Relative description (today, tomorrow, next week) */
    relativeDescription?: string
  }
}

/**
 * Person entity
 */
export interface PersonEntity extends MentionableEntityBase {
  type: 'person'
  properties: {
    /** Full name */
    fullName?: string
    /** Email address */
    email?: string
    /** Phone number */
    phone?: string
    /** Avatar URL */
    avatar?: string
    /** Company/organization */
    company?: string
    /** Role/title */
    role?: string
    /** Social links */
    socialLinks?: Record<string, string>
    /** Linked supertag ID (for #person schema) */
    supertagId?: string
  }
}

/**
 * Strand entity (reference to another document)
 */
export interface StrandEntity extends MentionableEntityBase {
  type: 'strand'
  properties: {
    /** Strand file path */
    path: string
    /** Strand title */
    title: string
    /** Weave the strand belongs to */
    weave?: string
    /** Loom the strand belongs to */
    loom?: string
    /** Strand tags */
    tags?: string[]
    /** Brief excerpt */
    excerpt?: string
  }
}

/**
 * Event entity (calendar event)
 */
export interface EventEntity extends MentionableEntityBase {
  type: 'event'
  properties: {
    /** Event title */
    title: string
    /** Start datetime (ISO) */
    startDateTime: string
    /** End datetime (ISO) */
    endDateTime?: string
    /** Location (can reference a place entity) */
    location?: string
    /** Location entity ID if resolved */
    locationEntityId?: string
    /** Event description */
    description?: string
    /** Attendees */
    attendees?: string[]
    /** Recurrence rule (RRULE) */
    recurrence?: string
    /** Linked calendar ID */
    calendarId?: string
    /** External event ID (Google Calendar, etc.) */
    externalId?: string
  }
}

/**
 * Project entity
 */
export interface ProjectEntity extends MentionableEntityBase {
  type: 'project'
  properties: {
    /** Project name */
    name: string
    /** Project status */
    status?: 'planning' | 'active' | 'paused' | 'completed' | 'archived'
    /** Start date */
    startDate?: string
    /** Due date */
    dueDate?: string
    /** Project lead/owner */
    owner?: string
    /** Team members */
    members?: string[]
    /** Related strands */
    relatedStrands?: string[]
    /** Tags */
    tags?: string[]
  }
}

/**
 * Team entity
 */
export interface TeamEntity extends MentionableEntityBase {
  type: 'team'
  properties: {
    /** Team name */
    name: string
    /** Team description */
    description?: string
    /** Team members */
    members?: string[]
    /** Team lead */
    lead?: string
    /** Slack/Teams channel */
    channel?: string
  }
}

/**
 * Concept entity (abstract topic)
 */
export interface ConceptEntity extends MentionableEntityBase {
  type: 'concept'
  properties: {
    /** Concept definition */
    definition?: string
    /** Related concepts */
    relatedConcepts?: string[]
    /** Related strands */
    relatedStrands?: string[]
    /** Category */
    category?: string
  }
}

/**
 * Tag entity (inline categorization)
 */
export interface TagEntity extends MentionableEntityBase {
  type: 'tag'
  properties: {
    /** Tag name */
    name: string
    /** Color */
    color?: string
    /** Tag category */
    category?: 'priority' | 'status' | 'topic' | 'custom'
  }
}

/**
 * Unknown/unresolved entity
 */
export interface UnknownEntity extends MentionableEntityBase {
  type: 'unknown'
  properties: Record<string, never>
}

/**
 * Union of all mentionable entity types
 */
export type MentionableEntity =
  | PlaceEntity
  | DateEntity
  | PersonEntity
  | StrandEntity
  | EventEntity
  | ProjectEntity
  | TeamEntity
  | ConceptEntity
  | TagEntity
  | UnknownEntity

// ============================================================================
// MENTION REFERENCE TYPES
// ============================================================================

/**
 * A mention reference in a document
 */
export interface MentionReference {
  /** Unique reference ID */
  id: string
  /** The mention syntax used (e.g., @john-smith) */
  mentionSyntax: string
  /** Resolved entity ID (null if unresolved) */
  entityId: string | null
  /** Entity type */
  entityType: MentionableEntityType
  /** Source strand path */
  sourceStrandPath: string
  /** Source block ID (if within a specific block) */
  sourceBlockId?: string
  /** Character position in source content */
  position: {
    start: number
    end: number
    line: number
    column: number
  }
  /** Context snippet around the mention */
  contextSnippet?: string
  /** Whether this mention was auto-resolved */
  autoResolved: boolean
  /** Confidence score for auto-resolution (0-1) */
  resolutionConfidence?: number
  /** When the reference was created */
  createdAt: string
}

/**
 * Mention syntax patterns
 */
export const MENTION_PATTERNS = {
  /** Standard @mention: @john-smith */
  standard: /(?<=^|[\s\(\[\{])@([a-zA-Z][a-zA-Z0-9_-]*)/g,
  
  /** Extended mention with type hint: @place:coffee-shop */
  typed: /(?<=^|[\s\(\[\{])@(place|date|person|event|project|team|concept):([a-zA-Z][a-zA-Z0-9_-]*)/g,
  
  /** Wiki-style mention: @[[Entity Name]] */
  wikiStyle: /(?<=^|[\s\(\[\{])@\[\[([^\]]+)\]\]/g,
  
  /** Entity ID mention: @{entity-id} */
  entityId: /(?<=^|[\s\(\[\{])@\{([a-zA-Z0-9_-]+)\}/g,
}

// ============================================================================
// AUTOCOMPLETE TYPES
// ============================================================================

/**
 * Autocomplete suggestion for mentions
 */
export interface MentionSuggestion {
  /** Entity to suggest */
  entity: MentionableEntity
  /** Match score (0-1) */
  score: number
  /** Highlighted label (with match emphasis) */
  highlightedLabel: string
  /** How this was matched (exact, prefix, fuzzy, semantic) */
  matchType: 'exact' | 'prefix' | 'fuzzy' | 'semantic'
  /** Source of the suggestion */
  source: 'recent' | 'document' | 'database' | 'external'
}

/**
 * Autocomplete query options
 */
export interface MentionAutocompleteOptions {
  /** Maximum number of suggestions */
  limit?: number
  /** Filter by entity types */
  types?: MentionableEntityType[]
  /** Current strand path (for context) */
  currentStrandPath?: string
  /** Include external sources (Google Maps, etc.) */
  includeExternal?: boolean
  /** Minimum score threshold */
  minScore?: number
}

// ============================================================================
// ENTITY ICON MAPPING
// ============================================================================

/**
 * Default icons for entity types
 */
export const ENTITY_TYPE_ICONS: Record<MentionableEntityType, string> = {
  place: 'MapPin',
  date: 'Calendar',
  person: 'User',
  strand: 'FileText',
  event: 'CalendarDays',
  project: 'Folder',
  team: 'Users',
  concept: 'Lightbulb',
  tag: 'Tag',
  unknown: 'HelpCircle',
}

/**
 * Default colors for entity types
 */
export const ENTITY_TYPE_COLORS: Record<MentionableEntityType, string> = {
  place: '#10B981', // Emerald
  date: '#6366F1', // Indigo
  person: '#3B82F6', // Blue
  strand: '#8B5CF6', // Violet
  event: '#F59E0B', // Amber
  project: '#EC4899', // Pink
  team: '#14B8A6', // Teal
  concept: '#F97316', // Orange
  tag: '#64748B', // Slate
  unknown: '#94A3B8', // Gray
}




